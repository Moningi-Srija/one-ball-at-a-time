const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mount } = require('./cp-notebook');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const notebookMarkup = html.slice(html.indexOf('<section id="tab-cp-notebook"'), html.indexOf('<!-- GOAL CALENDAR -->'));
const note = (id = 'idea-1', changes = {}) => ({
  id, title: `Pattern ${id}`, takeaway: 'Check what the state means.',
  details: `The complete explanation for ${id}.`, tags: ['dynamic-programming', 'cpp'],
  code: null, language: null, sourceUrl: null, ...changes,
});
const payload = notes => ({ schemaVersion: 1, generatedAt: '2026-11-02T12:00:00.000Z', notes });

// Only the DOM operations used by mount are modeled; no browser dependency is needed.
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.id = '';
    this.className = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.open = false;
    this._text = '';
  }

  get childElementCount() { return this.children.length; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) {
    this.replaceChildren();
    this._text = String(value);
  }

  append(...children) {
    for (const child of children) {
      if (child.tagName === '#FRAGMENT') {
        this.append(...[...child.children]);
        continue;
      }
      if (child.parentElement) {
        child.parentElement.children = child.parentElement.children.filter(item => item !== child);
      }
      child.parentElement = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    this._text = '';
    this.append(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'hidden') this.hidden = true;
    if (name === 'open') this.open = true;
  }

  getAttribute(name) { return this.attributes.get(name) ?? null; }

  querySelectorAll(selector) {
    const matches = el => {
      if (selector === '*') return true;
      if (selector.startsWith('.')) return el.className.split(/\s+/).includes(selector.slice(1));
      if (selector.startsWith('#')) return el.id === selector.slice(1);
      if (selector === 'details[open]') return el.tagName === 'DETAILS' && el.open;
      return el.tagName === selector.toUpperCase();
    };
    return this.children.flatMap(child => [
      ...(matches(child) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }
  async fire(type) {
    for (const handler of this.listeners.get(type) || []) await handler({ target: this });
  }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView() { this.ownerDocument.scrolls.push(this.id); }
}

function documentFixture() {
  const doc = {
    activeElement: null,
    scrolls: [],
    createElement(tag) { return new Element(tag, doc); },
    createDocumentFragment() { return new Element('#fragment', doc); },
    getElementById(id) { return doc.root.querySelector(`#${id}`); },
  };
  doc.root = doc.createElement('main');
  // Obtain the real IDs and initial accessibility/visibility attributes from the page.
  for (const [, tag, attributes] of notebookMarkup.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="[^"]+"[^>]*)>/g)) {
    const el = doc.createElement(tag);
    for (const [, key, value] of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) el.setAttribute(key, value);
    if (/\bhidden(?:\s|$)/.test(attributes)) el.hidden = true;
    doc.root.append(el);
  }
  const featured = doc.getElementById('cpFeatured');
  for (const id of ['cpFeaturedTitle', 'cpFeaturedText', 'cpFeaturedMeta', 'cpFeaturedReview', 'cpFeaturedBody', 'cpReadFeatured', 'cpTurnPage']) {
    const el = doc.getElementById(id);
    if (el) featured.append(el);
  }
  doc.getElementById('cpTopic').value = 'all';
  return doc;
}

async function setup(notes) {
  const doc = documentFixture();
  let nextPayload = payload(notes);
  let nextError = null;
  const requests = [];
  const api = mount(doc, async (url, options) => {
    requests.push({ url, options });
    if (nextError) throw nextError;
    return { ok: true, json: async () => nextPayload };
  });
  await api.open();
  return {
    doc, requests, get: id => doc.getElementById(id),
    updateNotes(updated) { nextPayload = payload(updated); },
    failRefresh() { nextError = new Error('Offline'); },
  };
}

test('featured disclosure has a stable inline body and accessible button relationship', () => {
  const button = notebookMarkup.match(/<button\b[^>]*id="cpReadFeatured"[^>]*>/)?.[0];
  assert.ok(button);
  assert.match(button, /aria-controls="cpFeaturedBody"/);
  assert.match(button, /aria-expanded="false"/);
  const featuredMarkup = notebookMarkup.slice(notebookMarkup.indexOf('id="cpFeatured"'), notebookMarkup.indexOf('</section>', notebookMarkup.indexOf('id="cpFeatured"')));
  assert.match(featuredMarkup, /id="cpFeaturedBody"[^>]*\bhidden/);
});

test('Read this idea expands and collapses inside the featured card without opening or jumping to the library', async () => {
  const { doc, get } = await setup([note()]);
  const body = get('cpFeaturedBody');
  const read = get('cpReadFeatured');
  const libraryCard = get('cp-idea-idea-1');
  const libraryDetails = libraryCard.querySelector('details');
  assert.equal(body.hidden, true);
  assert.equal(read.hidden, false);
  assert.equal(read.getAttribute('aria-expanded'), 'false');
  assert.equal(read.textContent, 'Read this idea ↓');
  read.focus();

  await read.fire('click');
  assert.equal(body.hidden, false);
  assert.equal(read.getAttribute('aria-expanded'), 'true');
  assert.equal(read.textContent, 'Close explanation ↑');
  assert.ok(get('cpFeatured').querySelector('#cpFeaturedBody'));
  assert.ok(body.textContent.includes(note().details));
  assert.equal(get('cp-idea-idea-1'), libraryCard, 'Opening the featured idea must not rebuild the library');
  assert.equal(libraryDetails.open, false);
  assert.equal(doc.activeElement, read);
  assert.deepEqual(doc.scrolls, []);

  await read.fire('click');
  assert.equal(body.hidden, true);
  assert.equal(read.getAttribute('aria-expanded'), 'false');
  assert.equal(read.textContent, 'Read this idea ↓');
  assert.equal(doc.activeElement, read);
});

test('turning the featured page keeps an open explanation open and replaces its complete content', async () => {
  const notes = [
    note('alpha', { details: 'Alpha explanation', code: 'return alpha;', language: 'cpp' }),
    note('beta', { details: 'Beta explanation', code: 'return beta;', language: 'cpp' }),
  ];
  const { get } = await setup(notes);
  const previousId = get('cpFeatured').dataset.noteId;
  const previous = notes.find(item => item.id === previousId);
  const next = notes.find(item => item.id !== previousId);
  await get('cpReadFeatured').fire('click');
  await get('cpTurnPage').fire('click');

  assert.equal(get('cpFeatured').dataset.noteId, next.id);
  assert.equal(get('cpFeaturedTitle').textContent, next.title);
  assert.equal(get('cpFeaturedBody').hidden, false);
  assert.equal(get('cpReadFeatured').getAttribute('aria-expanded'), 'true');
  assert.ok(get('cpFeaturedBody').textContent.includes(next.details));
  assert.ok(!get('cpFeaturedBody').textContent.includes(previous.details));
  assert.equal(get('cpFeaturedBody').querySelector('code').textContent, next.code);
});

test('search, topic changes, and refresh preserve a matching featured idea and its open disclosure', async () => {
  const notes = [note('alpha'), note('beta')];
  const { get, updateNotes, requests } = await setup(notes);
  const id = get('cpFeatured').dataset.noteId;
  await get('cpReadFeatured').fire('click');
  get('cpSearch').value = id;
  await get('cpSearch').fire('input');
  get('cpTopic').value = 'cpp';
  await get('cpTopic').fire('change');
  assert.equal(get('cpFeatured').dataset.noteId, id);
  assert.equal(get('cpFeaturedBody').hidden, false);
  assert.equal(get('cpReadFeatured').getAttribute('aria-expanded'), 'true');

  const details = get(`cp-idea-${id}`).querySelector('details');
  details.open = true;
  updateNotes(notes.map(item => item.id === id ? { ...item, details: 'Updated explanation from a refreshed collection.' } : item));
  await get('cpRefresh').fire('click');
  assert.equal(get('cpFeatured').dataset.noteId, id);
  assert.equal(get('cpFeaturedBody').hidden, false);
  assert.equal(get('cpReadFeatured').getAttribute('aria-expanded'), 'true');
  assert.ok(get('cpFeaturedBody').textContent.includes('Updated explanation from a refreshed collection.'));
  assert.equal(get(`cp-idea-${id}`).querySelector('details').open, true);
  assert.equal(get('cpTopic').value, 'cpp');
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.url === '/cp-notes.json' && request.options.cache === 'no-store'));
});

test('no search results clear the featured explanation, and clearing filters restores a collapsed idea', async () => {
  const { get } = await setup([note()]);
  await get('cpReadFeatured').fire('click');
  get('cpSearch').value = 'a phrase with no notebook match';
  await get('cpSearch').fire('input');
  assert.equal(get('cpEmpty').hidden, false);
  assert.equal(get('cpFeatured').hidden, true);
  assert.equal(get('cpFeaturedBody').hidden, true);
  assert.equal(get('cpFeaturedBody').textContent, '');
  assert.equal(get('cpReadFeatured').getAttribute('aria-expanded'), 'false');

  await get('cpClear').fire('click');
  assert.equal(get('cpEmpty').hidden, true);
  assert.equal(get('cpFeatured').hidden, false);
  assert.equal(get('cpFeatured').dataset.noteId, 'idea-1');
  assert.equal(get('cpFeaturedBody').hidden, true);
  assert.equal(get('cpReadFeatured').getAttribute('aria-expanded'), 'false');
});

test('summary-only ideas expose no empty disclosure and reset a previously open explanation on refresh', async () => {
  const { get, updateNotes } = await setup([note()]);
  await get('cpReadFeatured').fire('click');
  updateNotes([note('idea-1', { details: '' })]);
  await get('cpRefresh').fire('click');
  assert.equal(get('cpFeatured').hidden, false);
  assert.equal(get('cpReadFeatured').hidden, true);
  assert.equal(get('cpReadFeatured').getAttribute('aria-expanded'), 'false');
  assert.equal(get('cpFeaturedBody').hidden, true);
  assert.equal(get('cpFeaturedBody').textContent, '');
  assert.equal(get('cp-idea-idea-1').querySelector('details'), null);
});

test('featured and library render full details, literal code whitespace, and safe external source attributes', async () => {
  const code = '<script>alert("not HTML")</script>\n\tif (a < b && c > d) {\n  return 1;\n}\n';
  const details = 'A complete explanation.\n\nKeep <b>this</b> literal, including the second paragraph.';
  const sourceUrl = 'https://leetcode.com/problems/two-sum/';
  const { get } = await setup([note('literal', { code, details, language: 'cpp', sourceUrl })]);
  await get('cpReadFeatured').fire('click');

  for (const container of [get('cpFeaturedBody'), get('cp-idea-literal').querySelector('details')]) {
    assert.equal(container.querySelector('.cp-detail-text').textContent, details);
    assert.equal(container.querySelector('code').textContent, code);
    assert.equal(container.querySelector('code').children.length, 0);
    assert.equal(container.querySelector('script'), null);
    assert.equal(container.querySelector('b'), null);
    assert.equal(container.querySelector('pre').tabIndex, 0);
    assert.equal(container.querySelector('pre').getAttribute('aria-label'), 'Code example for Pattern literal');
    const source = container.querySelector('a');
    assert.equal(source.href, sourceUrl);
    assert.equal(source.target, '_blank');
    assert.equal(source.rel, 'noopener noreferrer');
    assert.equal(source.referrerPolicy, 'no-referrer');
  }
});

test('library IDs, title relationships, and open details survive pagination and filter rerenders', async () => {
  const notes = Array.from({ length: 20 }, (_, index) => note(`idea-${index + 1}`));
  const { get, doc } = await setup(notes);
  assert.equal(get('cpGrid').children.length, 18);
  const original = get('cp-idea-idea-1');
  const paper = original.dataset.paper;
  original.querySelector('details').open = true;
  await get('cpLoadMore').fire('click');
  assert.equal(get('cpGrid').children.length, 20);
  assert.equal(get('cp-idea-idea-1').querySelector('details').open, true);
  assert.equal(doc.activeElement.id, 'cp-title-idea-19');

  get('cpSearch').value = 'Pattern';
  await get('cpSearch').fire('input');
  const updated = get('cp-idea-idea-1');
  assert.notEqual(updated, original);
  assert.equal(updated.id, original.id);
  assert.equal(updated.dataset.paper, paper);
  assert.equal(updated.querySelector('details').open, true);
  assert.equal(updated.getAttribute('aria-labelledby'), 'cp-title-idea-1');
  assert.equal(updated.querySelector('h4').id, 'cp-title-idea-1');
  const ids = doc.root.querySelectorAll('*').map(el => el.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
});

test('a failed refresh retains the currently open featured explanation', async () => {
  const { get, failRefresh } = await setup([note()]);
  await get('cpReadFeatured').fire('click');
  const before = get('cpFeaturedBody').textContent;
  failRefresh();
  await get('cpRefresh').fire('click');
  assert.equal(get('cpError').hidden, false);
  assert.equal(get('cpFeaturedBody').hidden, false);
  assert.equal(get('cpFeaturedBody').textContent, before);
  assert.equal(get('cpReadFeatured').getAttribute('aria-expanded'), 'true');
});
