'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  buildPublicNotebook, importNotebook, publicDetails, safeSourceUrl, sameContent, cliArguments,
} = require('./scripts/import-cp-notes');
const schema = require('./schemas/cp-notes.schema.json');

const fixture = (changes = {}) => ({
  id: 'binary-search-boundary',
  title: 'Check the boundary',
  original: 'An unedited private study draft.',
  takeaway: 'Test the boundary before moving it.',
  details: 'Keep the invariant explicit.\n\nOriginal wording provenance: internal example.\n\nSaved-note sources:\n- https://example.notion.site/private',
  tags: ['binary-search', 'testing'],
  code: 'if (left < right) {\n\tadvance();\n}\n',
  language: 'cpp',
  sourceUrl: 'https://leetcode.com/problems/example/description/?tracking=discard#saved',
  archived: false,
  ...changes,
});
const master = notes => ({ schemaVersion: 1, notes });
const project = notes => buildPublicNotebook(master(notes), schema, '2026-11-02T00:00:00.000Z');

test('CP import keeps stable IDs, strips provenance, and preserves text/code literally', () => {
  const input = fixture({ title: '<script>not executed</script>', takeaway: '<img src=x onerror=alert(1)>' });
  const before = JSON.stringify(input);
  const result = project([input]);
  assert.equal(JSON.stringify(input), before, 'the master object must not be modified');
  const note = result.data.notes[0];
  assert.deepEqual(Object.keys(note), ['id', 'title', 'takeaway', 'details', 'tags', 'code', 'language', 'sourceUrl']);
  assert.equal(note.id, input.id);
  assert.equal(note.title, input.title);
  assert.equal(note.takeaway, input.takeaway);
  assert.equal(note.code, input.code);
  assert.equal(note.details, 'Keep the invariant explicit.');
  assert.equal(note.sourceUrl, 'https://leetcode.com/problems/example/description/');
  assert.equal('original' in note, false);
  assert.doesNotMatch(JSON.stringify(result.data), /notion|provenance|private study/i);
  assert.equal(project([fixture({ title: 'Improved wording' })]).data.notes[0].id, note.id);
});

test('CP import includes review-flagged notes with their caveats and excludes all archived notes', () => {
  const uncertain = fixture({
    id: 'uncertain',
    tags: ['binary-search', 'needs-review'],
    details: 'Keep the invariant explicit.\n\nREVIEW NEEDED: Check whether equality belongs to the boundary.\n\nOriginal wording provenance: private draft.\n\nSaved-note sources: https://app.notion.com/p/private',
  });
  const before = JSON.stringify(uncertain);
  const { data, counts } = project([
    fixture(), fixture({ id: 'retired', archived: true }),
    uncertain,
    fixture({ id: 'retired-uncertain', archived: true, tags: ['needs-review'] }),
  ]);
  assert.deepEqual(data.notes.map(note => note.id), ['binary-search-boundary', 'uncertain']);
  assert.deepEqual(counts, { total: 4, archived: 2, needsReview: 1, omittedSourceLinks: 0, included: 2 });
  assert.deepEqual(data.notes[1].tags, uncertain.tags);
  assert.equal(data.notes[1].details, 'Keep the invariant explicit.\n\nREVIEW NEEDED: Check whether equality belongs to the boundary.');
  assert.equal(data.notes[1].code, uncertain.code);
  assert.equal(data.notes[1].language, uncertain.language);
  assert.equal('original' in data.notes[1], false);
  assert.doesNotMatch(JSON.stringify(data), /notion|provenance|private draft/i);
  assert.equal(JSON.stringify(uncertain), before, 'including a flagged note must not change its master');
});

test('CP import rejects invalid schema contracts, duplicate IDs and malformed entries', () => {
  for (const changes of [
    { id: '' }, { tags: ['unknown-tag'] }, { tags: ['trees', 'trees'] },
    { code: null, language: 'cpp' }, { code: 'x', language: null },
    { archived: 'false' }, { internalMetadata: 'not allowed' },
    { sourceUrl: 'javascript:alert(1)' },
  ]) assert.throws(() => project([fixture(changes)]), /validation failed/);
  assert.throws(() => project([fixture(), fixture()]), /Duplicate stable ID/);
  assert.throws(() => buildPublicNotebook(master([fixture()]), { type: 'made-up' }), /schema is invalid/);
  assert.throws(() => buildPublicNotebook(master([fixture({ extra: 'ignored?' })]), {}), /supported notebook contract/);
});

test('CP import fails closed on private identifiers or unsupported links in any rendered field', () => {
  for (const [field, value] of [
    ['title', 'See https://app.notion.com/p/private'],
    ['takeaway', 'source UUID: 11111111-2222-3333-4444-555555555555'],
    ['details', 'Reference 11111111222233334444555555555555'],
    ['code', '// https://example.notion.site/private'],
    ['language', 'provenance: secret'],
    ['details', 'See https://internal.example.test/proprietary'],
    ['takeaway', 'See https://leetcode.com/problems/test/?token=private'],
    ['takeaway', '/Users/example/private-notes.txt'],
  ]) {
    for (const tags of [['binary-search'], ['binary-search', 'needs-review']]) {
      assert.throws(() => project([fixture({ [field]: value, tags })]), error => {
        assert.match(error.message, /Private reference remains/);
        assert.equal(error.message.includes(value), false);
        return true;
      });
    }
  }
});

test('CP review caveats do not bypass private-reference checks or source URL filtering', () => {
  assert.throws(() => project([fixture({
    tags: ['needs-review'],
    details: 'This claim still needs a specific explanation of its uncertainty.',
  })]), /display contract/);
  assert.throws(() => project([fixture({
    tags: ['needs-review'],
    details: 'REVIEW NEEDED: Check the proof at https://app.notion.com/p/private',
  })]), /Private reference remains/);
  const { data, counts } = project([fixture({
    tags: ['needs-review'],
    details: 'REVIEW NEEDED: Check the proof before relying on this claim.',
    sourceUrl: 'https://app.notion.com/p/private',
  })]);
  assert.equal(data.notes[0].sourceUrl, null);
  assert.equal(counts.omittedSourceLinks, 1);
  assert.match(data.notes[0].details, /^REVIEW NEEDED:/);
});

test('CP public source allowlist retains learning links but drops private routes and tracking', () => {
  assert.equal(safeSourceUrl('https://app.notion.com/p/private'), null);
  assert.equal(safeSourceUrl('https://leetcode.com.evil.test/problems/test/'), null);
  assert.equal(safeSourceUrl('https://user:password@leetcode.com/problems/test/'), null);
  assert.equal(safeSourceUrl('https://leetcode.com:444/problems/test/'), null);
  assert.equal(safeSourceUrl('https://leetcode.com/login?redirect=test'), null);
  assert.equal(safeSourceUrl('https://leetcode.com/problems/test/submissions/'), null);
  assert.equal(safeSourceUrl('https://codeforces.com/blog/entry/123?token=secret#x'), 'https://codeforces.com/blog/entry/123');
  assert.equal(safeSourceUrl('http://atcoder.jp/contests/abc123/tasks/abc123_a'), 'https://atcoder.jp/contests/abc123/tasks/abc123_a');
  assert.equal(safeSourceUrl('https://takeuforward.org/practice/dsa/example?token=discard'), 'https://takeuforward.org/practice/dsa/example');
  assert.equal(safeSourceUrl('https://algo.monster/liteproblems/123'), 'https://algo.monster/liteproblems/123');
  assert.equal(safeSourceUrl('https://www.youtube.com/watch?v=abcdefghijk&list=private#x'), 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(safeSourceUrl('https://youtube.com/watch?v=bad'), null);
  assert.equal(safeSourceUrl('https://youtu.be/abcdefghijk?si=discard'), 'https://youtu.be/abcdefghijk');
  assert.equal(project([fixture({ sourceUrl: 'https://app.notion.com/p/private' })]).data.notes[0].sourceUrl, null);
});

test('CP provenance stripping preserves explanatory paragraphs and handles standalone sources', () => {
  assert.equal(publicDetails('First paragraph.\n\nSecond paragraph.\n\nSaved-note sources: private'), 'First paragraph.\n\nSecond paragraph.');
  assert.equal(publicDetails('Original wording provenance: private'), '');
  assert.equal(publicDetails('No trailing metadata.'), 'No trailing metadata.');
});

function temporaryFiles(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-import-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const sourcePath = path.join(directory, 'master.json');
  const outputPath = path.join(directory, 'public.json');
  fs.writeFileSync(sourcePath, JSON.stringify(master([fixture()])));
  return { sourcePath, outputPath };
}

test('CP importer is repeatable, check-only is read-only, and a failed import preserves the last snapshot', t => {
  const files = temporaryFiles(t);
  const sourceBefore = fs.readFileSync(files.sourcePath, 'utf8');
  const options = { ...files, now: '2026-11-02T00:00:00.000Z' };
  assert.equal(importNotebook({ ...options, check: true }).changed, true);
  assert.equal(fs.existsSync(files.outputPath), false);
  assert.equal(importNotebook(options).changed, true);
  const firstOutput = fs.readFileSync(files.outputPath, 'utf8');
  assert.equal(importNotebook({ ...options, now: '2026-11-03T00:00:00.000Z' }).changed, false);
  assert.equal(fs.readFileSync(files.outputPath, 'utf8'), firstOutput);
  assert.equal(importNotebook({ ...options, check: true }).changed, false);
  assert.equal(fs.readFileSync(files.sourcePath, 'utf8'), sourceBefore);
  fs.writeFileSync(files.sourcePath, JSON.stringify(master([fixture({ title: 'New wording' })])));
  assert.equal(importNotebook({ ...options, check: true }).changed, true);
  assert.equal(fs.readFileSync(files.outputPath, 'utf8'), firstOutput);
  importNotebook(options);
  assert.equal(JSON.parse(fs.readFileSync(files.outputPath, 'utf8')).notes[0].title, 'New wording');
  const lastValid = fs.readFileSync(files.outputPath, 'utf8');
  fs.writeFileSync(files.sourcePath, '{broken JSON');
  assert.throws(() => importNotebook(options), /valid JSON/);
  assert.equal(fs.readFileSync(files.outputPath, 'utf8'), lastValid);
  fs.writeFileSync(files.sourcePath, JSON.stringify(master([fixture({ title: 'https://app.notion.com/p/private' })])));
  assert.throws(() => importNotebook(options), /Private reference/);
  assert.equal(fs.readFileSync(files.outputPath, 'utf8'), lastValid);
});

test('CP importer does not overwrite its master through direct paths or symlinks', t => {
  const files = temporaryFiles(t);
  assert.throws(() => importNotebook({ ...files, outputPath: files.sourcePath }), /must not overwrite/);
  fs.symlinkSync(files.sourcePath, files.outputPath);
  assert.throws(() => importNotebook(files), /must not overwrite/);
});

test('CP import rejects browser-invalid content before replacing the last good snapshot', t => {
  const files = temporaryFiles(t);
  importNotebook(files);
  const original = fs.readFileSync(files.outputPath, 'utf8');
  for (const changes of [{ title: '  ' }, { takeaway: '\n\t' }, { language: '  ' }]) {
    fs.writeFileSync(files.sourcePath, JSON.stringify(master([fixture(changes)])));
    assert.throws(() => importNotebook(files), /display contract/);
    assert.equal(fs.readFileSync(files.outputPath, 'utf8'), original);
  }
  assert.throws(() => project(Array.from({ length: 10001 }, (_, i) => fixture({ id: `idea-${i}` }))), /10,000/);
});

test('CP archived entries disappear on re-import and removed ideas are not retained', t => {
  const files = temporaryFiles(t);
  importNotebook(files);
  fs.writeFileSync(files.sourcePath, JSON.stringify(master([fixture({ archived: true })])));
  importNotebook(files);
  assert.deepEqual(JSON.parse(fs.readFileSync(files.outputPath, 'utf8')).notes, []);
});

test('CP import argument and content comparison helpers reject ambiguous input', () => {
  assert.deepEqual(cliArguments(['--source', 'draft.json', '--check']), { sourcePath: 'draft.json', check: true });
  assert.throws(() => cliArguments(['--source']), /Use --source/);
  assert.throws(() => cliArguments(['--source', 'a', '--source', 'b']), /once/);
  assert.throws(() => cliArguments(['--unknown']), /Use --source/);
  const { data } = project([fixture()]);
  assert.equal(sameContent(data, data), true);
  assert.equal(sameContent({ ...data, extra: 'metadata' }, data), false);
});
