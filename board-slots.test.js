const test = require('node:test');
const assert = require('node:assert/strict');
const slots = require('./board-slots');

const defaults = slots.defaultSettings();
const task = (id, category = 'other', extra = {}) => ({ id, category, title: id, note: 'Keep this note', points: 2.5, createdAt: 100, startedAt: 150, ...extra });
const body = task('walk', 'glow_up', { bodySlot: true });
const career = task('study', 'empire_building', { careerSlot: true });

test('existing boards default to two locked slots; validates strict persisted settings', () => {
  assert.deepEqual(slots.normalizeSettings(undefined), defaults);
  assert.deepEqual(slots.normalizeSettings({}), defaults);
  assert.deepEqual(slots.validateSettings(defaults), { ok: true, value: defaults });
  for (const input of [null, [], {}, { ...defaults, bodyLocked: 'false' }, { ...defaults, careerLocked: 0 }, { ...defaults, revision: -1 }, { ...defaults, revision: Number.MAX_SAFE_INTEGER }, { ...defaults, extra: true }]) {
    assert.equal(slots.validateSettings(input).ok, false);
  }
});

test('independent unlocks produce three, four, or five regular slots without modifying tasks', () => {
  const tasks = [task('a'), task('b'), task('c'), body, career];
  const before = JSON.stringify(tasks);
  for (const [bodyLocked, careerLocked, capacity] of [[true,true,3], [false,true,4], [true,false,4], [false,false,5]]) {
    const settings = { ...defaults, bodyLocked, careerLocked };
    const board = slots.layout(tasks, settings);
    assert.equal(board.capacity, capacity);
    assert.equal(board.flexible.length, capacity);
    assert.equal(Boolean(board.body), bodyLocked);
    assert.equal(Boolean(board.career), careerLocked);
    assert.equal(slots.canAdd(tasks, settings), false);
    assert.equal(slots.protectedSlot(body, tasks, settings), bodyLocked ? 'body' : null);
    assert.equal(slots.protectedSlot(career, tasks, settings), careerLocked ? 'career' : null);
  }
  assert.equal(JSON.stringify(tasks), before);
});

test('new regular tasks can fill unlocked slots, but never create a sixth task', () => {
  const tasks = [task('a'), task('b'), task('c'), career];
  assert.equal(slots.canAdd(tasks, defaults), false);
  assert.equal(slots.canAdd(tasks, defaults, 'body'), true);
  const unlocked = { ...defaults, bodyLocked: false };
  assert.equal(slots.canAdd(tasks, unlocked), true);
  assert.equal(slots.canAdd(tasks, unlocked, 'body'), false);
  assert.equal(slots.canAdd([...tasks, task('d')], unlocked), false);
  assert.equal(slots.canAdd(tasks, unlocked, 'nonsense'), false);
});

test('relocking reuses an eligible task or empty slot, never the wrong category', () => {
  const unlocked = { ...defaults, bodyLocked: false, careerLocked: false };
  const fiveOtherTasks = Array.from({ length: 5 }, (_, i) => task(String(i)));
  assert.equal(slots.canChange(fiveOtherTasks, unlocked, 'body', true), false);
  assert.equal(slots.canChange(fiveOtherTasks.slice(1), unlocked, 'body', true), true);
  const retagged = { ...body, category: 'creator_mode' };
  assert.equal(slots.canChange([...fiveOtherTasks.slice(1), retagged], unlocked, 'body', true), false);
  const tasks = [...fiveOtherTasks.slice(1), task('new-walk', 'glow_up')];
  assert.equal(slots.canChange(tasks, unlocked, 'body', true), true);
  assert.equal(slots.layout(tasks, { ...unlocked, bodyLocked: true }).body.id, 'new-walk');
});

test('legacy flags, duplicate flags and overflow never hide or duplicate tasks', () => {
  const tasks = [body, career, task('walk2','glow_up',{ bodySlot: true }), task('wrong','other',{ careerSlot: true, bodySlot: true }), task('a'), task('b')];
  const board = slots.layout(tasks, defaults);
  const displayed = [...board.flexible, board.body, board.career].filter(Boolean);
  assert.equal(new Set(displayed).size, tasks.length);
  assert.equal(displayed.length, tasks.length);
  assert.equal(slots.canAdd(tasks, defaults), false);
  assert.equal(slots.canChange(tasks, defaults, 'body', false), true);
});

test('matching flagged task has priority; unlocked flags never force category locking', () => {
  const tasks = [task('walk2', 'glow_up'), body, career];
  assert.equal(slots.layout(tasks, defaults).body, body);
  const unlocked = { ...defaults, careerLocked: false };
  assert.equal(slots.layout(tasks, unlocked).career, null);
  assert.ok(slots.layout(tasks, unlocked).flexible.includes(career));
});
