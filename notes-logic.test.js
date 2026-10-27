const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_NOTES, MAX_TEXT_LENGTH, defaultReminders, validateReminders, featuredNote, randomNote } = require('./notes-logic');

const createdAt = Date.UTC(2026, 9, 26, 12);

function note(overrides = {}) {
  return { id: 'note-1', text: 'Start small.', color: 'pink', pinned: false, createdAt, ...overrides };
}

function state(overrides = {}) {
  return { revision: 0, notes: [note()], ...overrides };
}

test('default reminders contain four valid unpinned starter lines', () => {
  const defaults = defaultReminders(createdAt);
  assert.equal(defaults.notes.length, 4);
  assert.equal(defaults.notes.every(item => item.pinned === false), true);
  assert.equal(new Set(defaults.notes.map(item => item.id)).size, 4);
  assert.deepEqual(validateReminders(defaults), { ok: true, value: defaults });
});

test('normalizes whitespace and preserves an intentionally empty notes list', () => {
  const result = validateReminders(state({ notes: [note({ id: ' note-1 ', text: ' Start small. ' })] }));
  assert.deepEqual(result, { ok: true, value: state() });
  const empty = state({ revision: 4, notes: [] });
  assert.deepEqual(validateReminders(empty), { ok: true, value: empty });
});

test('preserves line breaks in note text while rejecting unsafe control characters', () => {
  const multiline = state({ notes: [note({ text: 'One step.\nThen another.' })] });
  assert.deepEqual(validateReminders(multiline), { ok: true, value: multiline });
  assert.equal(validateReminders(state({ notes: [note({ text: 'One\u0000step.' })] })).ok, false);
});

test('accepts longer multiline reminders without shortening them', () => {
  const text = Array.from({ length: 6 }, (_, i) => `Line ${i + 1}: A reminder can include the full thought, in my own words.`).join('\n');
  assert.ok(text.length > 200);
  const original = state({ notes: [note({ text })] });
  assert.deepEqual(validateReminders(original), { ok: true, value: original });
});

test('supports 1000 characters and keeps the editor limit in sync', () => {
  assert.equal(MAX_TEXT_LENGTH, 1000);
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');
  const limit = html.match(/<textarea id="reminderText"[^>]*maxlength="(\d+)"/);
  assert.equal(Number(limit?.[1]), MAX_TEXT_LENGTH);
  assert.equal(validateReminders(state({ notes: [note({ text: 'x'.repeat(1000) })] })).ok, true);
  assert.equal(validateReminders(state({ notes: [note({ text: 'x'.repeat(1001) })] })).ok, false);
});

test('rejects invalid state revisions, collections, and unknown fields', () => {
  for (const candidate of [
    null, [], {}, state({ revision: -1 }), state({ revision: '0' }),
    state({ revision: Number.MAX_SAFE_INTEGER }), state({ notes: null }),
    state({ extra: true }),
    state({ notes: Array.from({ length: MAX_NOTES + 1 }, (_, index) => note({ id: `note-${index}` })) }),
  ]) assert.equal(validateReminders(candidate).ok, false);
});

test('rejects unsafe or duplicate ids and invalid note contents', () => {
  for (const invalidNote of [
    null, [], note({ id: '' }), note({ id: 'x'.repeat(101) }), note({ id: 'bad\nid' }),
    note({ text: '' }), note({ text: 'x'.repeat(MAX_TEXT_LENGTH + 1) }),
    note({ text: 'one\u0000two' }), note({ text: 20 }),
    note({ color: 'red' }), note({ pinned: 'true' }), note({ extra: true }),
    note({ createdAt: -1 }), note({ createdAt: 1.5 }), note({ createdAt: Number.MAX_SAFE_INTEGER }),
  ]) assert.equal(validateReminders(state({ notes: [invalidNote] })).ok, false);
  assert.equal(validateReminders(state({ notes: [note(), note({ id: ' note-1 ' })] })).ok, false);
});

test('accepts every paper color and boundary-sized notes', () => {
  const notes = Array.from({ length: MAX_NOTES }, (_, index) => note({
    id: `note-${index}`,
    text: 'x'.repeat(MAX_TEXT_LENGTH),
    color: ['pink', 'butter', 'lilac'][index % 3],
  }));
  assert.equal(validateReminders(state({ notes })).ok, true);
});

test('features the same note for a date and rotates through every note across days', () => {
  const notes = defaultReminders(createdAt).notes;
  const selections = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']
    .map(date => featuredNote(notes, date).id);
  assert.equal(new Set(selections).size, notes.length);
  assert.equal(featuredNote(notes, '2026-10-26').id, selections[0]);
  assert.equal(featuredNote([], '2026-10-26'), null);
});

test('daily rotation favors pinned notes and handles dates before the epoch', () => {
  const notes = [note(), note({ id: 'pinned-1', pinned: true }), note({ id: 'pinned-2', pinned: true })];
  const first = featuredNote(notes, '1969-12-31');
  const next = featuredNote(notes, '1970-01-01');
  assert.equal(first.pinned, true);
  assert.equal(next.pinned, true);
  assert.notEqual(first.id, next.id);
  for (const date of ['2026-02-30', '26-10-2026', null]) {
    assert.throws(() => featuredNote(notes, date), TypeError);
  }
});

test('random Board notes handle empty and single-note walls', () => {
  assert.equal(randomNote([]), null);
  const only = note();
  assert.equal(randomNote([only], only.id), only);
});

test('random Board notes include unpinned notes and avoid the previous note', t => {
  const notes = [note(), note({ id: 'pinned', pinned: true }), note({ id: 'other' })];
  t.mock.method(Math, 'random', () => 0);
  assert.equal(randomNote(notes), notes[0]);
  assert.equal(randomNote(notes, notes[0].id), notes[1]);
  Math.random.mock.mockImplementation(() => 0.999);
  assert.equal(randomNote(notes), notes[2]);
  assert.equal(randomNote(notes, notes[2].id), notes[1]);
  assert.equal(randomNote(notes, 'deleted-note'), notes[2]);
});
