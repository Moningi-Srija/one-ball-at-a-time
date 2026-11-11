const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { formatProgress, create } = require('./progress-floating');

const source = fs.readFileSync(path.join(__dirname, 'progress-floating.js'), 'utf8');
const tracker = { id: 'courses', title: 'Course lessons', unit: 'lessons', current: 58, target: 111, step: 1, style: 'bar', color: 'pink' };

function events(target = {}) {
  const listeners = new Map();
  return Object.assign(target, {
    listeners,
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    async emit(type) { await Promise.all([...(listeners.get(type) || [])].map(callback => callback())); },
    listenerCount() { return [...listeners.values()].reduce((sum, list) => sum + list.size, 0); },
  });
}

function element(tagName = '') {
  const node = events({
    tagName, children: [], attributes: {}, textContent: '', disabled: false, animations: [],
    style: { setProperty(name, value) { this[name] = value; } },
    appendChild(child) { child.parent = this; this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { this.attributes[name] = value; },
    animate(keyframes, options) {
      const animation = { keyframes, options, canceled: false, cancel() { this.canceled = true; } };
      this.animations.push(animation);
      return animation;
    },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
  });
  Object.defineProperty(node, 'innerHTML', { set() { throw new Error('Unsafe HTML assignment'); } });
  return node;
}

function childWindow() {
  return events({
    closed: false,
    document: { documentElement: {}, head: element('head'), body: element('body'), createElement: element },
    focus() { this.focused = true; },
    close() { this.closed = true; },
  });
}

function setup(mode = 'document', callbacks = {}) {
  const child = childWindow();
  const errors = [];
  const host = events({
    isSecureContext: true,
    navigator: { userActivation: { isActive: true } },
    document: childWindow().document,
    open() { return child; },
    focus() { this.focused = true; },
    setTimeout, clearTimeout,
  });
  if (mode === 'document') host.documentPictureInPicture = { requestWindow: () => Promise.resolve(child) };
  if (mode === 'video') {
    host.HTMLVideoElement = { prototype: { requestPictureInPicture() {} } };
    host.HTMLCanvasElement = { prototype: { captureStream() {} } };
    host.document.pictureInPictureEnabled = true;
    host.track = { stopped: false, stop() { this.stopped = true; }, requestFrame() {} };
    host.stream = { getTracks: () => [host.track], getVideoTracks: () => [host.track] };
    host.document.exitPictureInPicture = async () => { host.document.pictureInPictureElement = null; };
    host.document.createElement = tag => {
      const node = element(tag);
      if (tag === 'canvas') {
        node.getContext = () => ({ fillRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, measureText: text => ({ width: text.length * 10 }) });
        node.captureStream = () => host.stream;
      }
      if (tag === 'video') {
        host.video = node;
        node.readyState = 1;
        node.play = async () => { node.played = true; };
        node.pause = () => { node.paused = true; };
        node.requestPictureInPicture = async () => { host.document.pictureInPictureElement = node; };
      }
      return node;
    };
  }
  const context = vm.createContext({ window: host, Intl });
  vm.runInContext(source, context);
  const floating = host.ProgressFloating.create({ onError: message => errors.push(message), ...callbacks });
  return { host, child, floating, errors };
}

function find(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children || []) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

const byClass = (child, className) => find(child.document.body, node => node.className === className);

function rewardClock(host) {
  let sequence = 0;
  const timers = new Map();
  host.setTimeout = (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; };
  host.clearTimeout = id => timers.delete(id);
  return { timers, flush() { [...timers.values()].forEach(timer => timer.callback()); } };
}

test('formats counts, completion and bounded progress independently from saved state', () => {
  const snapshot = { ...tracker };
  const result = formatProgress(snapshot);
  assert.equal(result.counter, '58 / 111');
  assert.equal(result.percent, '52%');
  assert.equal(result.remaining, '53 to go');
  assert.equal(result.increment, '+1');
  assert.deepEqual(snapshot, tracker);
  assert.equal(formatProgress({ ...tracker, current: 120 }).ratio, 1);
  assert.equal(formatProgress({ ...tracker, current: 120 }).remaining, 'Target reached');
  assert.equal(formatProgress({ ...tracker, target: 0 }), null);
  assert.equal(formatProgress({ ...tracker, current: Infinity }), null);
  assert.equal(formatProgress({ ...tracker, current: 0 }).ratio, 0);
  assert.equal(formatProgress({ ...tracker, current: 1.5, step: 0.5 }).increment, '+0.5');
  assert.equal(formatProgress({ ...tracker, color: 'url(evil)', style: 'evil' }).style, 'bar');
});

test('is safe to require without a browser', async () => {
  const floating = create();
  assert.equal(floating.supported(), false);
  assert.equal(floating.isOpen(), false);
  assert.equal(await floating.open(tracker), false);
});

test('document PiP renders user text safely and exposes accessible progress', async () => {
  const { floating, child } = setup('document', { onIncrement() {} });
  assert.equal(await floating.open({ ...tracker, title: '<img src=x onerror=alert(1)>' }), true);
  assert.equal(floating.isOpen(), true);
  assert.equal(floating.modeLabel(), 'Always-on-top window');
  assert.equal(find(child.document.body, node => node.tagName === 'h1').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(byClass(child, 'counter').textContent, '58 / 111');
  assert.equal(byClass(child, 'graphic').attributes['aria-valuenow'], '58');
  assert.equal(byClass(child, 'graphic').attributes['aria-valuemax'], '111');
  floating.update({ ...tracker, current: 59, style: 'ring' });
  assert.equal(byClass(child, 'counter').textContent, '59 / 111');
  assert.ok(byClass(child, 'ring'));
  floating.update({ ...tracker, target: 100000, style: 'dots' });
  assert.equal(byClass(child, 'dots').children.length, 40);
  floating.close();
});

test('increments only through parent callback and disables during save', async () => {
  let finish;
  const calls = [];
  const { floating, child } = setup('document', {
    onIncrement(id) { calls.push(id); return new Promise(resolve => { finish = resolve; }); },
  });
  await floating.open(tracker);
  const button = byClass(child, 'primary');
  const click = button.emit('click');
  assert.equal(button.disabled, true);
  await button.emit('click');
  assert.deepEqual(calls, ['courses']);
  assert.equal(byClass(child, 'counter').textContent, '58 / 111');
  floating.update({ ...tracker, current: 59 }, { busy: true });
  finish();
  await click;
  assert.equal(button.disabled, true);
  floating.update({ ...tracker, current: 59 }, { busy: false });
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '+1');
  floating.close();
});

test('save failures remain visible without changing the count', async () => {
  const { floating, child, errors } = setup('document', { onIncrement() { throw new Error('Network'); } });
  await floating.open(tracker);
  await byClass(child, 'primary').emit('click');
  assert.match(errors[0], /Could not save/);
  assert.equal(byClass(child, 'counter').textContent, '58 / 111');
  assert.equal(byClass(child, 'primary').disabled, false);
  floating.close();
});

test('an unconfirmed save directs the user to the main tab until a successful retry arrives', async () => {
  let rejectSave;
  const initial = { ...tracker, revision: 0 };
  const { floating, child } = setup('document', {
    onIncrement() { return new Promise((resolve, reject) => { rejectSave = reject; }); },
  });
  await floating.open(initial);
  const button = byClass(child, 'primary');
  const click = button.emit('click');
  floating.update(initial, { busy: true });
  rejectSave(new Error('Save not confirmed'));
  await click;
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, 'Check main tab');
  assert.match(button.attributes['aria-label'], /main tab to retry/);
  assert.match(byClass(child, 'error').textContent, /Could not save/);
  assert.equal(find(child.document.body, node => node.textContent === 'Open main tab').disabled, false);
  floating.update({ ...initial }, { busy: true });
  assert.equal(button.textContent, 'Check main tab');
  assert.match(byClass(child, 'error').textContent, /Could not save/);
  floating.update({ ...initial, current: 59, revision: 1 }, { busy: true });
  assert.equal(byClass(child, 'error').textContent, '');
  floating.update({ ...initial, current: 59, revision: 1 }, { busy: false });
  assert.equal(button.textContent, '+1');
  assert.equal(button.disabled, false);
  assert.equal(byClass(child, 'counter').textContent, '59 / 111');
  floating.close();
});

test('unsupported native PiP falls back to clearly labeled ordinary popup', async () => {
  const opened = [];
  const { floating, child, host } = setup('popup', { onOpen: id => opened.push(id) });
  assert.equal(await floating.open(tracker), true);
  assert.match(floating.modeLabel(), /not always on top/);
  assert.ok(find(child.document.body, node => /Standard window · not always on top/.test(node.textContent)));
  await find(child.document.body, node => node.textContent === 'Open main tab').emit('click');
  assert.deepEqual(opened, ['courses']);
  assert.equal(host.focused, true);
  floating.close();
});

test('blocked popup and missing user gesture report actionable failures', async () => {
  const { floating, host, errors } = setup('popup');
  host.navigator.userActivation.isActive = false;
  assert.equal(await floating.open(tracker), false);
  assert.match(errors.pop(), /Click Float/);
  host.navigator.userActivation.isActive = true;
  host.open = () => null;
  assert.equal(await floating.open(tracker), false);
  assert.match(errors.pop(), /Allow popups/);
  assert.equal(floating.isOpen(), false);
  assert.equal(host.listenerCount(), 0);
});

test('native failure switches to fallback on next user click', async () => {
  const { floating, host, errors } = setup();
  host.documentPictureInPicture.requestWindow = () => Promise.reject(new Error('Denied'));
  assert.equal(await floating.open(tracker), false);
  assert.match(errors[0], /standard window \(not always on top\)/);
  assert.equal(await floating.open(tracker), true);
  assert.match(floating.modeLabel(), /Standard window/);
  floating.close();
});

test('deletion closes a pending window and clears listeners', async () => {
  const { floating, host, child } = setup();
  let resolve;
  host.documentPictureInPicture.requestWindow = () => new Promise(done => { resolve = done; });
  const opening = floating.open(tracker);
  floating.update(null);
  resolve(child);
  assert.equal(await opening, false);
  assert.equal(child.closed, true);
  assert.equal(floating.isOpen(), false);
  assert.equal(host.listenerCount(), 0);
});

test('parent pagehide disables and closes popout without changing saved data', async () => {
  const { floating, host, child } = setup('popup', { onIncrement() {} });
  await floating.open(tracker);
  const increment = byClass(child, 'primary');
  await host.emit('pagehide');
  assert.equal(increment.disabled, true);
  assert.equal(child.closed, true);
  assert.equal(floating.isOpen(), false);
  assert.equal(host.listenerCount(), 0);
  assert.equal(child.listenerCount(), 0);
  assert.equal(increment.listenerCount(), 0);
  assert.equal(tracker.current, 58);
});

test('video PiP is muted, read-only and cleans streams and listeners on close', async () => {
  const { floating, host } = setup('video');
  assert.equal(await floating.open(tracker), true);
  assert.equal(host.video.muted, true);
  assert.equal(host.video.played, true);
  assert.match(floating.modeLabel(), /controls in main tab/);
  assert.equal(floating.isOpen(), true);
  floating.update({ ...tracker, current: 59 });
  floating.close();
  assert.equal(host.video.paused, true);
  assert.equal(host.video.srcObject, null);
  assert.equal(host.track.stopped, true);
  assert.equal(host.document.body.children.length, 0);
  assert.equal(host.video.listenerCount(), 0);
  assert.equal(host.listenerCount(), 0);
  assert.equal(floating.isOpen(), false);
});

test('closing video PiP through browser controls releases the stream', async () => {
  const { floating, host } = setup('video');
  await floating.open(tracker);
  host.document.pictureInPictureElement = null;
  await host.video.emit('leavepictureinpicture');
  assert.equal(host.track.stopped, true);
  assert.equal(floating.isOpen(), false);
});

test('explicit saved rewards pulse once and keep the progress summary visible', async () => {
  const { floating, host, child } = setup();
  const clock = rewardClock(host);
  const initial = { ...tracker, current: 89, target: 100, revision: 0 };
  const saved = { ...initial, current: 90, revision: 1 };
  const reward = { delta: 1, milestone: 90, complete: false, title: 'So close now', message: 'The finish line is getting closer.', from: 89, to: 90 };
  await floating.open(initial);
  const counter = byClass(child, 'counter');
  assert.equal(counter.animations.length, 0);
  floating.update(saved, { reward, busy: true });
  assert.equal(counter.animations.length, 1);
  assert.equal(counter.animations[0].options.iterations, 1);
  assert.ok(counter.animations[0].options.duration <= 1200);
  assert.equal(byClass(child, 'reward').textContent, 'So close now · The finish line is getting closer.');
  assert.equal(byClass(child, 'reward').attributes['aria-live'], 'polite');
  assert.ok(find(child.document.body, node => node.textContent === '90% · 10 to go'));
  floating.update({ ...saved }, { busy: false });
  floating.update({ ...saved });
  assert.equal(counter.animations.length, 1);
  assert.equal(counter.animations[0].canceled, false);
  assert.equal(clock.timers.size, 1);
  assert.ok([...clock.timers.values()].every(timer => timer.delay <= 1200));
  clock.flush();
  assert.equal(byClass(child, 'reward').textContent, '');
  assert.equal(counter.animations[0].canceled, true);
  assert.equal(clock.timers.size, 0);
  floating.close();
});

test('reduced motion receives safe encouragement text without animation', async () => {
  const { floating, host, child } = setup('popup');
  const clock = rewardClock(host);
  child.matchMedia = query => ({ matches: query === '(prefers-reduced-motion: reduce)' });
  await floating.open(tracker);
  floating.update({ ...tracker, current: 111 }, {
    reward: { delta: 53, milestone: 100, complete: true, title: '<img src=x onerror=alert(1)>', message: 'You reached your goal.' },
  });
  assert.equal(byClass(child, 'counter').animations.length, 0);
  assert.equal(byClass(child, 'reward').textContent, '<img src=x onerror=alert(1)> · You reached your goal.');
  assert.ok(find(child.document.body, node => node.textContent === '100% · Target reached'));
  floating.close();
  assert.equal(clock.timers.size, 0);
});

test('refreshes and corrections do not generate rewards and cancel any prior pulse', async () => {
  const { floating, host, child } = setup();
  const clock = rewardClock(host);
  await floating.open(tracker);
  const counter = byClass(child, 'counter');
  floating.update({ ...tracker, current: 59 });
  assert.equal(counter.animations.length, 0);
  assert.equal(byClass(child, 'reward').textContent, '');
  floating.update({ ...tracker, current: 60 }, { reward: { delta: 1, title: 'One step saved' } });
  assert.equal(counter.animations.length, 1);
  floating.update({ ...tracker, current: 40 });
  assert.equal(counter.animations.length, 1);
  assert.equal(counter.animations[0].canceled, true);
  assert.equal(byClass(child, 'reward').textContent, '');
  assert.equal(clock.timers.size, 0);
  floating.update({ ...tracker, current: 39 }, { reward: { delta: -1, title: 'Should not display' } });
  assert.equal(counter.animations.length, 1);
  assert.equal(byClass(child, 'reward').textContent, '');
  floating.close();
});

test('new rewards and closing the window clean up prior animation and timers', async () => {
  const { floating, host, child } = setup();
  const clock = rewardClock(host);
  await floating.open(tracker);
  const counter = byClass(child, 'counter');
  floating.update({ ...tracker, current: 59 }, { reward: { delta: 1, title: 'First step' } });
  floating.update({ ...tracker, current: 60 }, { reward: { delta: 1, title: 'Another step' } });
  assert.equal(counter.animations.length, 2);
  assert.equal(counter.animations[0].canceled, true);
  assert.equal(counter.animations[1].canceled, false);
  assert.equal(clock.timers.size, 1);
  assert.equal(byClass(child, 'reward').textContent, 'Another step');
  floating.close();
  assert.equal(counter.animations[1].canceled, true);
  assert.equal(byClass(child, 'reward').textContent, '');
  assert.equal(clock.timers.size, 0);
});

test('a save error clears encouragement and cannot be hidden by a reward', async () => {
  const { floating, host, child } = setup('document', { onIncrement() { throw new Error('Failed'); } });
  rewardClock(host);
  await floating.open(tracker);
  const saved = { ...tracker, current: 59 };
  floating.update(saved, { reward: { delta: 1, title: 'Saved earlier' } });
  await byClass(child, 'primary').emit('click');
  assert.equal(byClass(child, 'counter').animations[0].canceled, true);
  assert.equal(byClass(child, 'reward').textContent, '');
  assert.match(byClass(child, 'error').textContent, /Could not save/);
  floating.update(saved, { busy: true, reward: { delta: 1, title: 'Must not hide error' } });
  assert.equal(byClass(child, 'counter').animations.length, 1);
  assert.equal(byClass(child, 'reward').textContent, '');
  assert.match(byClass(child, 'error').textContent, /Could not save/);
  floating.close();
});

test('animation API failure does not interrupt displaying a confirmed save', async () => {
  const { floating, host, child } = setup();
  rewardClock(host);
  await floating.open(tracker);
  byClass(child, 'counter').animate = () => { throw new Error('Animation unavailable'); };
  assert.doesNotThrow(() => floating.update({ ...tracker, current: 59 }, { reward: { delta: 1, title: 'Saved' } }));
  assert.equal(byClass(child, 'counter').textContent, '59 / 111');
  assert.equal(byClass(child, 'reward').textContent, 'Saved');
  floating.close();
});
