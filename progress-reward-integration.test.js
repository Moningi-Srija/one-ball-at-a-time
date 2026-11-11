const test = require('node:test');
const assert = require('node:assert/strict');
const { mount } = require('./progress');
const Rewards = require('./progress-rewards');

// A small DOM fixture exercises the real save/render boundary without a browser.
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentElement = null;
    this.className = '';
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = { setProperty() {} };
    this.disabled = false;
    this._text = '';
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, force) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        const add = force ?? !classes.has(name);
        if (add) classes.add(name); else classes.delete(name);
        this.className = [...classes].join(' ');
      },
    };
  }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  append(...children) {
    for (const child of children) { child.parentElement = this; this.children.push(child); }
  }
  replaceChildren(...children) {
    this.children.forEach(child => { child.parentElement = null; });
    this.children = []; this._text = ''; this.append(...children);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node;
    return null;
  }
  matches(selector) {
    return selector.startsWith('.') ? this.classList.contains(selector.slice(1)) : this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) {
    const parts = selector.split(' ');
    if (parts.length > 1) return this.querySelectorAll(parts[0]).flatMap(node => node.querySelectorAll(parts.slice(1).join(' ')));
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  fire(type) { return this.listeners.get(type)?.({ target: this }); }
  focus() { this.ownerDocument.activeElement = this; }
}

async function setup({ classify = Rewards.rewardForChange, animate, save } = {}) {
  let sequence = 0;
  let stored = { id: '00000000-0000-4000-8000-000000000001', title: 'Read a little', unit: 'chapters',
    current: 24, target: 100, step: 1, style: 'bar', color: 'mint', note: '', revision: 0 };
  const requests = [], toasts = [], classifications = [], animations = [];
  const doc = { activeElement: null, createElement: tag => new Element(tag, doc) };
  const panel = doc.createElement('section'); panel.className = 'tab-panel active';
  doc.getElementById = id => id === 'tab-progress' ? panel : null;
  doc.defaultView = {
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++sequence + 1).padStart(12, '0')}` },
    addEventListener() {}, matchMedia: () => ({ matches: false }),
    ProgressFloating: { create: () => ({ update() {}, close() {} }) },
    ProgressRewards: {
      ...Rewards,
      rewardForChange(...args) { classifications.push(args); return classify(...args); },
      animate(...args) { animations.push(args); return animate ? animate(...args) : () => {}; },
    },
  };
  const api = mount({
    document: doc, demo: false, toast: message => toasts.push(message),
    onUnauthorized() { assert.fail('Unexpected authentication failure'); },
    async request(url, options = {}) {
      requests.push({ url, options });
      if (!options.method) return { trackers: [{ ...stored }] };
      const before = { ...stored };
      const body = options.body;
      const after = { ...stored, current: stored.current + body.value, revision: stored.revision + 1 };
      const result = { tracker: after, event: { id: body.mutationId, trackerId: stored.id,
        kind: body.kind, delta: body.value, value: after.current } };
      const response = save ? await save(result, before, requests) : result;
      stored = { ...response.tracker };
      return response;
    },
  });
  await api.open();
  const button = label => panel.querySelectorAll('button').find(node => node.getAttribute('aria-label') === label || node.textContent === label);
  return { api, panel, requests, toasts, classifications, animations, button,
    increment: () => button('Add 1 to Read a little').fire('click'),
    count: () => panel.querySelector('.progress-count strong').textContent };
}

function assertSaved(ui, count) {
  assert.equal(ui.count(), String(count));
  assert.equal(ui.button('Retry save'), undefined);
  assert.equal(ui.button('Add 1 to Read a little').disabled, false);
  assert.equal(ui.panel.querySelector('.progress-notice'), null);
}

test('a throwing reward classifier cannot turn a confirmed save into a failed save', async () => {
  const ui = await setup({ classify() { throw new Error('Optional presentation failed'); } });
  assert.equal(await ui.increment(), true);
  assertSaved(ui, 25);
  assert.equal(ui.animations.length, 0);
  assert.match(ui.toasts.at(-1), /Progress saved/);
  assert.equal(await ui.increment(), true);
  assertSaved(ui, 26);
  assert.equal(ui.requests.at(-1).options.body.revision, 1);
});

test('a throwing animation cannot reject a confirmed save or leave retry state', async () => {
  const ui = await setup({ animate() { throw new Error('Animation unavailable'); } });
  assert.equal(await ui.increment(), true);
  assertSaved(ui, 25);
  assert.equal(ui.animations.length, 1);
  assert.match(ui.toasts.at(-1), /quarter of the way/);
});

test('failed saves never reward; retry reuses the change ID and rewards only after confirmation', async () => {
  let attempts = 0;
  const ui = await setup({ save(result) {
    if (++attempts === 1) throw new Error('Network unavailable');
    return result;
  } });
  assert.equal(ui.animations.length, 0);
  assert.equal(await ui.increment(), false);
  assert.equal(ui.count(), '24');
  assert.equal(ui.classifications.length, 0);
  assert.equal(ui.animations.length, 0);
  assert.equal(ui.button('Add 1 to Read a little').disabled, true);
  assert.equal(await ui.button('Retry save').fire('click'), true);
  assertSaved(ui, 25);
  assert.equal(ui.requests[1].options.body.mutationId, ui.requests[2].options.body.mutationId);
  assert.equal(ui.animations.length, 1);
  await ui.api.open();
  assertSaved(ui, 25);
  assert.equal(ui.animations.length, 1, 'Refreshing an existing snapshot does not replay the reward');
});

test('a successful response without an event updates the count without rewarding', async () => {
  const ui = await setup({ save: result => ({ tracker: result.tracker }) });
  assert.equal(await ui.increment(), true);
  assertSaved(ui, 25);
  assert.equal(ui.classifications.length, 0);
  assert.equal(ui.animations.length, 0);
});

test('a confirmed decrement updates the count without a celebration', async () => {
  const ui = await setup();
  assert.equal(await ui.button('Subtract 1 from Read a little').fire('click'), true);
  assertSaved(ui, 23);
  assert.equal(ui.classifications.length, 1);
  assert.equal(ui.animations.length, 0);
});

test('a duplicate acknowledged event cannot replay its celebration', async () => {
  let first;
  const ui = await setup({ save: result => (first ||= result) });
  assert.equal(await ui.increment(), true);
  assert.equal(await ui.increment(), true);
  assertSaved(ui, 25);
  assert.equal(ui.classifications.length, 1);
  assert.equal(ui.animations.length, 1);
});
