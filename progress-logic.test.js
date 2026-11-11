const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Logic = require('./progress-logic');

const ID = '349a5215-6a82-4658-a5f1-37bb3f973da1';
const MUTATION_ID = '05c6985a-e379-4f3c-8e54-d103d8343e41';
function create(overrides = {}) { return { id: ID, title: 'DSA questions', target: 111, ...overrides }; }
function change(overrides = {}) { return { mutationId: MUTATION_ID, revision: 0, kind: 'add', value: 1, ...overrides }; }

test('progress logic is available in both Node and browser contexts', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('./progress-logic'), 'utf8'), context);
  assert.equal(context.window.ProgressLogic.percentage(58, 111), Logic.percentage(58, 111));
});

test('tracker creation normalizes text, UUID case, and optional defaults', () => {
  assert.deepEqual(Logic.validateTrackerCreate(create({ id: ID.toUpperCase(), title: '  DSA questions  ' })), {
    ok: true,
    value: { id: ID, title: 'DSA questions', unit: '', target: 111, step: 1, style: 'bar', color: 'pink', note: '', current: 0 },
  });
  assert.equal(Logic.validateTrackerCreate(create({ current: 112 })).ok, true, 'over-target progress is allowed');
  assert.equal(Logic.validateTrackerCreate(create({ current: 0, target: 0.01, step: 0.01 })).ok, true);
});

test('tracker numbers reject coercion, nonfinite, precision and range errors', () => {
  for (const bad of ['58', null, NaN, Infinity, -1, 1e9 + 0.01, 0.001, 0.1 + 0.2]) {
    assert.equal(Logic.validateTrackerCreate(create({ current: bad })).ok, false, String(bad));
  }
  for (const field of ['target', 'step']) {
    for (const bad of [0, -1, '1', 0.001, 1e9 + 1]) {
      assert.equal(Logic.validateTrackerCreate(create({ [field]: bad })).ok, false, `${field}: ${bad}`);
    }
  }
  assert.equal(Logic.validateTrackerCreate(create({ current: 1e9, target: 1e9, step: 1e9 })).ok, true);
});

test('tracker validation rejects unknown fields, invalid shape, unsafe text, and oversized metadata', () => {
  for (const payload of [null, [], 'tracker', create({ revision: 0 }), create({ createdAt: 1 }), create({ id: '123' })]) {
    assert.equal(Logic.validateTrackerCreate(payload).ok, false);
  }
  for (const overrides of [
    { title: '' }, { title: '  ' }, { title: 'x'.repeat(121) }, { unit: 'x'.repeat(41) },
    { note: 'x'.repeat(1001) }, { note: 'bad\u0000note' }, { title: 'line\nbreak' },
    { color: 'red' }, { style: 'pie' }, { title: null }, { note: null },
  ]) assert.equal(Logic.validateTrackerCreate(create(overrides)).ok, false, JSON.stringify(overrides));
  assert.equal(Logic.validateTrackerCreate(create({ note: 'Line one\nLine two', title: 'x'.repeat(120) })).ok, true);
});

test('metadata updates are partial, revisioned, and cannot alter current or identity', () => {
  assert.deepEqual(Logic.validateTrackerUpdate({ revision: 8, title: ' New title ', target: 50 }), {
    ok: true, value: { revision: 8, title: 'New title', target: 50 },
  });
  for (const payload of [
    {}, { revision: 0 }, { title: 'Missing revision' }, { revision: '0', title: 'bad' },
    { revision: -1, title: 'bad' }, { revision: Number.MAX_SAFE_INTEGER, title: 'bad' },
    { revision: 0, current: 1 }, { revision: 0, id: ID },
  ]) assert.equal(Logic.validateTrackerUpdate(payload).ok, false);
});

test('changes require mutation UUID and revision; signed corrections are only allowed for add', () => {
  assert.deepEqual(Logic.validateTrackerChange(change({ value: -0.25, note: ' correction ' })), {
    ok: true, value: { mutationId: MUTATION_ID, revision: 0, kind: 'add', value: -0.25, note: 'correction' },
  });
  assert.equal(Logic.validateTrackerChange(change({ kind: 'set', value: 0 })).ok, true);
  for (const overrides of [
    { kind: 'set', value: -1 }, { kind: 'delete' }, { value: '1' }, { value: 0.001 },
    { mutationId: 'not-uuid' }, { mutationId: undefined }, { revision: undefined }, { current: 3 },
  ]) assert.equal(Logic.validateTrackerChange(change(overrides)).ok, false);
});

test('delete payload and history filters are strict', () => {
  assert.deepEqual(Logic.validateTrackerDelete({ revision: 0 }), { ok: true, value: { revision: 0 } });
  assert.equal(Logic.validateTrackerDelete({ revision: 0, force: true }).ok, false);
  assert.equal(Logic.validateTrackerDelete({}).ok, false);
  assert.deepEqual(Logic.validateHistoryFilters({ from: '2026-11-01T00:00:00Z', to: '2026-11-30T23:59:59.9Z' }), {
    ok: true, value: { from: '2026-11-01T00:00:00.000Z', to: '2026-11-30T23:59:59.900Z' },
  });
  for (const filters of [
    { from: '2026-02-30T00:00:00Z' }, { to: '2026-11-01' }, { from: ['2026-11-01T00:00:00Z'] },
    { from: '2026-11-03T00:00:00Z', to: '2026-11-01T00:00:00Z' }, { limit: '100000' },
  ]) assert.equal(Logic.validateHistoryFilters(filters).ok, false);
});

test('progress math keeps visible overflow while clamping visual fills', () => {
  assert.equal(Logic.roundQuantity(0.1 + 0.2), 0.3);
  assert.equal(Logic.percentage(150, 100), 150);
  assert.equal(Logic.clampedPercentage(150, 100), 100);
  assert.equal(Logic.percentage(0, 100), 0);
  assert.equal(Logic.percentage(2, 0), 0);
  assert.equal(Logic.percentage(NaN, 10), 0);
  assert.equal(Logic.clampedPercentage(-3, 10), 0);
});
