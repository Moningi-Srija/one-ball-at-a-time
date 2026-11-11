const test = require('node:test');
const assert = require('node:assert/strict');
const { describe, rewardForChange, animate } = require('./progress-rewards');

const tracker = (current, overrides = {}) => ({ id: 'reading', current, target: 100, unit: 'chapters', ...overrides });
const saved = (before, after, overrides = {}) => ({
  id: 'saved-event', trackerId: after.id, kind: 'add',
  delta: Math.round((after.current - before.current) * 100) / 100,
  value: after.current, ...overrides,
});
const reward = (before, after, overrides) => rewardForChange(before, after, saved(before, after, overrides));
const format = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

test('stage copy changes only at gentle, stable percentage thresholds', () => {
  const thresholds = [0, 25, 50, 75, 90, 100];
  const labels = ['A place to begin', 'A quarter of the way', 'Halfway there', 'Three quarters there', 'The home stretch', 'Target reached ✓'];
  thresholds.forEach((value, index) => {
    const result = describe(tracker(value));
    assert.equal(result.label, labels[index]);
    assert.ok(result.message.length > 10);
    assert.equal(result.nextMilestone, thresholds[index + 1] ?? null);
    if (index < thresholds.length - 1) assert.deepEqual(describe(tracker(thresholds[index + 1] - 0.01)), result);
  });
  assert.deepEqual(describe(tracker(150)), describe(tracker(100)));
  assert.deepEqual(describe(tracker(55.5, { target: 111 })), describe(tracker(50)));
  assert.equal(describe(null).nextMilestone, 25);
  assert.equal(describe(tracker(Infinity)).nextMilestone, 25);
  assert.equal(describe(tracker(0.09, { target: 0.1 })).label, 'The home stretch');
});

test('a confirmed positive increment gives a reward without mutating saved data', () => {
  const before = Object.freeze(tracker(10.1));
  const after = Object.freeze(tracker(10.3));
  const event = Object.freeze(saved(before, after));
  const result = rewardForChange(before, after, event);
  assert.deepEqual({ ...result, title: undefined, message: undefined }, {
    delta: 0.2, milestone: null, complete: false, title: undefined, message: undefined, from: 10.1, to: 10.3,
  });
  assert.match(result.title, /saved/);
});

test('each threshold rewards once per crossing and large jumps choose the highest milestone', () => {
  for (const value of [25, 50, 75, 90, 100]) {
    const result = reward(tracker(value - 0.01), tracker(value));
    assert.equal(result.milestone, value);
    assert.equal(result.complete, value === 100);
    assert.equal(reward(tracker(value), tracker(value + 1)).milestone, null);
  }
  assert.equal(reward(tracker(1), tracker(95)).milestone, 90);
  assert.equal(reward(tracker(1), tracker(120)).milestone, 100);
  assert.equal(reward(tracker(55.49, { target: 111 }), tracker(55.5, { target: 111 })).milestone, 50);
  assert.equal(reward(tracker(0.08, { target: 0.1 }), tracker(0.09, { target: 0.1 })).milestone, 90);
  assert.equal(reward(tracker(899999999.99, { target: 1000000000 }), tracker(900000000, { target: 1000000000 })).milestone, 90);
});

test('increments beyond the target never replay completion', () => {
  const result = reward(tracker(100), tracker(101));
  assert.equal(result.milestone, null);
  assert.equal(result.complete, false);
  assert.match(result.title, /extra/);
  assert.equal(describe(tracker(101)).nextMilestone, null);
});

test('loads, corrections, decrements, metadata edits and unmatched confirmations do not reward', () => {
  const before = tracker(24);
  const after = tracker(25);
  const cases = [
    [null, after, saved(before, after)],
    [before, after, null],
    [before, after, saved(before, after, { kind: 'initial' })],
    [before, after, saved(before, after, { kind: 'set' })],
    [before, tracker(23), saved(before, tracker(23))],
    [before, before, saved(before, before)],
    [before, tracker(25, { target: 50 }), saved(before, after)],
    [before, tracker(25, { id: 'other' }), saved(before, after)],
    [before, after, saved(before, after, { trackerId: 'other' })],
    [before, after, saved(before, after, { delta: 0 })],
    [before, after, saved(before, after, { delta: 2 })],
    [before, after, saved(before, after, { delta: NaN })],
    [before, after, saved(before, after, { value: 26 })],
    [tracker(24, { target: 0 }), tracker(25, { target: 0 }), saved(before, after)],
    [tracker(24, { id: '' }), tracker(25, { id: '' }), saved(before, after, { trackerId: '' })],
    [tracker(-1), after, saved(tracker(-1), after)],
    [before, tracker(Infinity), saved(before, tracker(Infinity))],
  ];
  cases.forEach(args => assert.equal(rewardForChange(...args), null));
});

test('a retry response containing a later tracker snapshot is not a new reward', () => {
  const before = tracker(24);
  const first = tracker(25);
  const later = tracker(26);
  assert.equal(rewardForChange(before, later, saved(before, first)), null);
  assert.equal(rewardForChange(first, first, saved(before, first)), null);
});

function node(tag = 'span') {
  const classes = new Set();
  const element = {
    tag, children: [], textContent: '', attributes: {},
    style: { setProperty(name, value) { this[name] = value; } },
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      contains(name) { return classes.has(name); },
    },
    append(child) { this.children.push(child); child.parent = this; },
    setAttribute(name, value) { this.attributes[name] = value; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
  };
  Object.defineProperty(element, 'innerHTML', { set() { throw new Error('HTML writes are forbidden'); } });
  return element;
}

function setup(dotCount = 0) {
  let sequence = 0, time = 0;
  const frames = new Map(), timers = new Map(), observers = [];
  const win = {
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, due: time + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.connected = false; observers.push(this); }
      observe() { this.connected = true; }
      disconnect() { this.connected = false; }
    },
  };
  const card = node('article'), counter = node('strong'), visual = node('div'), ring = node('span');
  const dots = Array.from({ length: dotCount }, () => node('i'));
  card.isConnected = true;
  card.ownerDocument = { defaultView: win, documentElement: node('html'), createElement: node };
  card.querySelector = selector => ({ '.progress-count strong': counter, '.progress-visual': visual, '.progress-ring-label': ring })[selector] || null;
  card.querySelectorAll = selector => selector === '.progress-dot' ? dots : [];
  function tick(timestamp, runFrames = true) {
    time = timestamp;
    if (runFrames) {
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(callback => callback(timestamp));
    }
    for (const [id, timer] of [...timers]) {
      if (timer.due <= timestamp) { timers.delete(id); timer.callback(); }
    }
  }
  function detach() {
    card.isConnected = false;
    observers.filter(observer => observer.connected).forEach(observer => observer.callback());
  }
  return { card, counter, visual, ring, dots, win, frames, timers, observers, tick, detach };
}

test('count, ring, bar and dot fills animate smoothly and finish at exact saved decimals', () => {
  const ui = setup(4);
  const before = tracker(1.1, { target: 4 }), after = tracker(3.25, { target: 4 });
  animate(ui.card, before, after, reward(before, after));
  assert.equal(ui.counter.textContent, format(1.1));
  assert.ok(Math.abs(parseFloat(ui.visual.style['--progress-percent']) - 27.5) < 1e-10);
  ui.tick(0);
  ui.tick(325);
  const intermediate = Number(ui.counter.textContent);
  assert.ok(intermediate > 1.1 && intermediate < 3.25);
  assert.equal(ui.frames.size, 1);
  ui.tick(650);
  assert.equal(ui.counter.textContent, format(3.25));
  assert.equal(ui.visual.style['--progress-percent'], '81.25%');
  assert.equal(ui.ring.textContent, `${format(81.3)}%`);
  assert.deepEqual(ui.dots.map(dot => dot.style['--dot-fill']), ['100%', '100%', '100%', '25%']);
  assert.equal(ui.frames.size, 0);
  ui.tick(1200);
  assert.equal(ui.card.children.length, 0);
  assert.equal(ui.card.classList.contains('progress-rewarding'), false);
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.observers[0].connected, false);
});

test('decorations are safe, bounded and hidden from assistive technology', () => {
  const ui = setup();
  const before = tracker(24, { unit: '<script>bad()</script>' }), after = tracker(25);
  const cleanup = animate(ui.card, before, after, reward(before, after));
  const [pop, confetti] = ui.card.children;
  assert.equal(pop.className, 'progress-reward-pop');
  assert.equal(pop.textContent, '+1');
  assert.equal(pop.attributes['aria-hidden'], 'true');
  assert.equal(confetti.className, 'progress-confetti');
  assert.equal(confetti.attributes['aria-hidden'], 'true');
  assert.equal(confetti.children.length, 8);
  assert.ok(confetti.children.every(piece => Math.abs(parseFloat(piece.style['--piece-x'])) <= 70));
  assert.equal(ui.card.classList.contains('progress-milestone-reward'), true);
  cleanup(); cleanup();
  assert.equal(ui.card.children.length, 0);
  assert.equal(ui.frames.size + ui.timers.size, 0);
  assert.equal(ui.counter.textContent, '25');
});

test('whole-item counters stay whole while fill animation remains continuous', () => {
  const ui = setup();
  const before = tracker(1), after = tracker(2);
  animate(ui.card, before, after, reward(before, after));
  ui.tick(0);
  ui.tick(325);
  assert.equal(ui.counter.textContent, '1');
  assert.equal(ui.visual.style['--progress-percent'], '1.875%');
  ui.tick(650);
  assert.equal(ui.counter.textContent, '2');
  ui.tick(1200);
});

test('hundredth-unit increments still get a smooth fill rather than a single jump', () => {
  const ui = setup();
  const before = tracker(0, { target: 1 }), after = tracker(0.01, { target: 1 });
  animate(ui.card, before, after, reward(before, after));
  ui.tick(0);
  ui.tick(325);
  assert.ok(parseFloat(ui.visual.style['--progress-percent']) > 0);
  assert.ok(parseFloat(ui.visual.style['--progress-percent']) < 1);
  ui.tick(650);
  assert.equal(ui.counter.textContent, format(0.01));
  assert.equal(ui.visual.style['--progress-percent'], '1%');
  ui.tick(1200);
});

test('completion has at most twelve paper pieces and ordinary increments have only the delta', () => {
  const ui = setup();
  let before = tracker(99), after = tracker(100);
  const cleanup = animate(ui.card, before, after, reward(before, after));
  assert.equal(ui.card.children[1].children.length, 12);
  cleanup();
  before = after; after = tracker(101);
  animate(ui.card, before, after, reward(before, after));
  assert.equal(ui.card.children.length, 1);
  assert.equal(ui.card.classList.contains('progress-milestone-reward'), false);
  ui.tick(1200);
});

test('reduced motion and missing animation APIs paint the final state without effects or scheduled work', () => {
  for (const options of [{ reducedMotion: true }, { window: {} }]) {
    const ui = setup(4);
    const before = tracker(1, { target: 4 }), after = tracker(2.5, { target: 4 });
    const cleanup = animate(ui.card, before, after, reward(before, after), options);
    assert.equal(ui.counter.textContent, format(2.5));
    assert.equal(ui.visual.style['--progress-percent'], '62.5%');
    assert.deepEqual(ui.dots.map(dot => dot.style['--dot-fill']), ['100%', '100%', '50%', '0%']);
    assert.equal(ui.card.children.length, 0);
    assert.equal(ui.card.classList.contains('progress-rewarding'), false);
    assert.equal(ui.frames.size + ui.timers.size + ui.observers.length, 0);
    cleanup();
  }
});

test('card removal cancels frames, timers, observers and decorations without repainting detached content', () => {
  const ui = setup();
  const before = tracker(24), after = tracker(25);
  const cleanup = animate(ui.card, before, after, reward(before, after));
  ui.tick(0);
  ui.tick(100);
  const detachedText = ui.counter.textContent;
  ui.detach();
  assert.equal(ui.frames.size + ui.timers.size, 0);
  assert.equal(ui.observers[0].connected, false);
  assert.equal(ui.card.children.length, 0);
  ui.tick(2000);
  cleanup();
  assert.equal(ui.counter.textContent, detachedText);
});

test('without MutationObserver, the next frame still detects removal and safely stops', () => {
  const ui = setup();
  delete ui.win.MutationObserver;
  const before = tracker(1), after = tracker(2);
  animate(ui.card, before, after, reward(before, after));
  ui.card.isConnected = false;
  ui.tick(0);
  assert.equal(ui.frames.size + ui.timers.size, 0);
  assert.equal(ui.card.children.length, 0);
});

test('a new animation on the same card cleans up the old one and stale cleanup cannot overwrite it', () => {
  const ui = setup();
  const first = tracker(24), second = tracker(25), third = tracker(26);
  const oldCleanup = animate(ui.card, first, second, reward(first, second));
  ui.tick(0);
  animate(ui.card, second, third, reward(second, third));
  oldCleanup();
  assert.equal(ui.card.children.length, 1);
  assert.equal(ui.frames.size, 1);
  assert.equal(ui.timers.size, 1);
  assert.equal(ui.observers.filter(observer => observer.connected).length, 1);
  ui.tick(0);
  ui.tick(650);
  assert.equal(ui.counter.textContent, '26');
  ui.tick(1200);
  assert.equal(ui.frames.size + ui.timers.size, 0);
});

test('a throttled background frame cannot leave an old count or a permanent effect', () => {
  const ui = setup();
  const before = tracker(9.99), after = tracker(10.01);
  animate(ui.card, before, after, reward(before, after));
  ui.tick(1200, false);
  assert.equal(ui.counter.textContent, format(10.01));
  assert.equal(ui.card.children.length, 0);
  assert.equal(ui.frames.size + ui.timers.size, 0);
});

test('null rewards, disconnected cards and invalid animation inputs schedule nothing', () => {
  const ui = setup();
  const before = tracker(1), after = tracker(2);
  animate(null, before, after, reward(before, after))();
  animate(ui.card, before, after, null)();
  animate(ui.card, before, tracker(3), reward(before, after))();
  ui.card.isConnected = false;
  animate(ui.card, before, after, reward(before, after))();
  assert.equal(ui.frames.size + ui.timers.size, 0);
  assert.equal(ui.card.children.length, 0);
});
