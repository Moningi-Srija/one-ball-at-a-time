const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { topicLabel, filterNotes, chooseNext, safeSource, validatePayload } = require('./cp-notebook');

const note = (id = 'idea-1', changes = {}) => ({ id, title: 'A pattern worth keeping', takeaway: 'Check what the state means.', details: 'Define the boundary first.', tags: ['dynamic-programming', 'cpp'], code: null, language: null, sourceUrl: null, ...changes });
const payload = notes => ({ schemaVersion: 1, generatedAt: '2026-11-02T12:00:00.000Z', notes });

test('CP search combines topic and case-insensitive words across visible content', () => {
  const notes = [note(), note('graph', { title: 'Graph invariant', tags: ['graphs'], code: 'while (queue.size()) {}', language: 'cpp' })];
  assert.equal(topicLabel('cpp'), 'C++');
  assert.deepEqual(filterNotes(notes, 'STATE c++', 'dynamic-programming').map(n => n.id), ['idea-1']);
  assert.deepEqual(filterNotes(notes, 'queue', 'graphs').map(n => n.id), ['graph']);
  assert.deepEqual(filterNotes(notes, 'queue', 'trees'), []);
  assert.equal(filterNotes(notes, '   ').length, 2);
  assert.equal(filterNotes(notes, 'idea-1').length, 1);
});

test('featured rotation handles empty/single lists and avoids immediately repeating an ID', () => {
  assert.equal(chooseNext([], null), null);
  assert.equal(chooseNext([note()], 'idea-1').id, 'idea-1');
  assert.equal(chooseNext([note(), note('two')], 'idea-1', () => 0).id, 'two');
  const updated = note('idea-1', { takeaway: 'Changed wording' });
  assert.equal(chooseNext([updated, note('two')], 'idea-1', () => 0).id, 'two');
});

test('browser accepts only the derived public schema, with stable unique IDs', () => {
  assert.equal(validatePayload(payload([note()])).notes[0].id, 'idea-1');
  for (const invalid of [
    payload([note(), note()]), payload([note('bad id')]),
    payload([note('one', { original: 'Private original' })]),
    payload([note('one', { tags: ['needs-review'] })]),
    payload([note('one', { archived: true })]),
    payload([note('one', { code: 'x', language: null })]),
    payload([note('one', { sourceUrl: 'javascript:alert(1)' })]),
    { ...payload([]), generatedAt: 'bad date' },
    { ...payload([]), provenance: 'internal' },
  ]) assert.throws(() => validatePayload(invalid));
});

test('source links reject private hosts, URL credentials, non-HTTPS and lookalike domains', () => {
  for (const url of ['https://app.notion.com/p/private', 'https://leetcode.com.evil.test/', 'https://user:pass@leetcode.com/problems/test/', 'http://leetcode.com/', 'javascript:alert(1)', '//leetcode.com', 'https://localhost/', 'https://leetcode.com:8443/']) assert.equal(safeSource(url), null);
  assert.equal(safeSource('https://leetcode.com/problems/test/'), 'https://leetcode.com/problems/test/');
});

test('rendering uses text nodes, not executable HTML or markdown', () => {
  const source = fs.readFileSync(path.join(__dirname, 'cp-notebook.js'), 'utf8');
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/);
  assert.match(source, /el\.textContent = text/);
  assert.match(source, /element\('code', '', note\.code\)/);
  const code = '<script>alert(1)</script>\n\tif (a < b) {\n  return 1;\n}\n';
  assert.equal(validatePayload(payload([note('code', { code, language: 'cpp' })])).notes[0].code, code);
});

test('CP tab is separate and deep-linkable, and its feed bypasses service-worker caching', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  assert.match(html, /data-tab="cp-notebook"/);
  assert.match(html, /id="tab-cp-notebook"/);
  assert.match(app, /btn\.dataset\.tab === 'cp-notebook'/);
  assert.match(sw, /url\.pathname === '\/cp-notes\.json'/);
  const board = html.split('id="tab-board"')[1].split('<!-- NOTES TO SELF -->')[0];
  assert.doesNotMatch(board, /cpFeatured|CP Notebook/);
});
