const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_GOALS,
  addDays,
  defaultGoalCalendarState,
  monthGrid,
  normalizeGoalCalendar,
  parseDateKey,
  validateGoalCalendar,
} = require('./goal-calendar-logic');

function goal(overrides = {}) {
  return {
    id: 'goal-1',
    date: '2026-10-11',
    title: 'Revise C++ graphs',
    completed: false,
    createdAt: 1_760_182_200_000,
    completedAt: null,
    ...overrides,
  };
}

function calendar(overrides = {}) {
  return {
    revision: 0,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    goals: [goal()],
    ...overrides,
  };
}

test('creates a timezone-aware 30-day default range', () => {
  assert.deepEqual(
    defaultGoalCalendarState(new Date('2026-10-10T20:00:00.000Z'), 'Asia/Kolkata'),
    { revision: 0, startDate: '2026-10-11', endDate: '2026-11-09', goals: [] }
  );
  assert.deepEqual(
    normalizeGoalCalendar(null, new Date('2026-10-10T20:00:00.000Z'), 'Asia/Kolkata'),
    { revision: 0, startDate: '2026-10-11', endDate: '2026-11-09', goals: [] }
  );
});

test('requires a nonnegative safe-integer revision', () => {
  assert.equal(validateGoalCalendar(calendar({ revision: Number.MAX_SAFE_INTEGER - 1 })).ok, true);
  for (const revision of [-1, 1.5, '1', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
    assert.equal(validateGoalCalendar(calendar({ revision })).ok, false, String(revision));
  }
});

test('validates and normalizes a complete goal calendar', () => {
  const input = calendar({
    goals: [goal({ id: '  goal-1  ', title: '  Revise C++ graphs  ' })],
  });
  assert.deepEqual(validateGoalCalendar(input), {
    ok: true,
    value: calendar(),
  });
});

test('accepts exactly 366 inclusive days including leap day', () => {
  assert.equal(validateGoalCalendar(calendar({
    startDate: '2028-01-01',
    endDate: '2028-12-31',
    goals: [],
  })).ok, true);
  assert.equal(validateGoalCalendar(calendar({
    startDate: '2027-01-01',
    endDate: '2028-01-02',
    goals: [],
  })).ok, false);
});

test('rejects malformed, impossible, reversed, and oversized ranges', () => {
  for (const candidate of [
    null,
    [],
    calendar({ startDate: '2026-02-30' }),
    calendar({ endDate: '31-10-2026' }),
    calendar({ startDate: '2026-11-01' }),
    calendar({ startDate: '2026-01-01', endDate: '2027-01-02', goals: [] }),
    { ...calendar(), surprise: true },
  ]) {
    assert.equal(validateGoalCalendar(candidate).ok, false);
  }
});

test('requires every goal to be inside the selected range with a unique bounded id', () => {
  assert.equal(validateGoalCalendar(calendar({ goals: [goal({ date: '2026-11-01' })] })).ok, false);
  assert.equal(validateGoalCalendar(calendar({ goals: [goal(), goal()] })).ok, false);
  assert.equal(validateGoalCalendar(calendar({ goals: [goal({ id: 'x'.repeat(101) })] })).ok, false);
  assert.equal(validateGoalCalendar(calendar({ goals: [goal({ id: 'bad\nid' })] })).ok, false);
});

test('trims titles and rejects empty, oversized, control-character, and unknown goal fields', () => {
  assert.equal(validateGoalCalendar(calendar({ goals: [goal({ title: '  DSA  ' })] })).value.goals[0].title, 'DSA');
  for (const candidate of [
    goal({ title: '   ' }),
    goal({ title: 'x'.repeat(161) }),
    goal({ title: 'bad\ntitle' }),
    goal({ color: 'pink' }),
  ]) {
    assert.equal(validateGoalCalendar(calendar({ goals: [candidate] })).ok, false);
  }
});

test('enforces completion timestamps and safe creation timestamps', () => {
  assert.equal(validateGoalCalendar(calendar({ goals: [goal({ completed: true, completedAt: 1_760_182_260_000 })] })).ok, true);
  for (const candidate of [
    goal({ completed: 'yes' }),
    goal({ createdAt: 1.5 }),
    goal({ createdAt: Number.MAX_SAFE_INTEGER }),
    goal({ completed: true, completedAt: null }),
    goal({ completed: true, completedAt: 1_760_182_100_000 }),
    goal({ completedAt: 1_760_182_260_000 }),
  ]) {
    assert.equal(validateGoalCalendar(calendar({ goals: [candidate] })).ok, false);
  }
});

test('caps the goal collection at 1000 entries', () => {
  const goals = Array.from({ length: MAX_GOALS }, (_, index) => goal({
    id: `goal-${index}`,
    createdAt: 1_760_182_200_000 + index,
  }));
  assert.equal(validateGoalCalendar(calendar({ goals })).ok, true);
  goals.push(goal({ id: 'one-too-many' }));
  assert.equal(validateGoalCalendar(calendar({ goals })).ok, false);
});

test('date helpers use UTC calendar math across month and leap-day boundaries', () => {
  assert.equal(parseDateKey('2028-02-29')?.toISOString(), '2028-02-29T00:00:00.000Z');
  assert.equal(parseDateKey('2027-02-29'), null);
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('not-a-date', 1), null);
});

test('monthGrid returns six complete Sunday- or Monday-first weeks', () => {
  const sundayFirst = monthGrid('2026-10-11');
  assert.equal(sundayFirst.length, 42);
  assert.deepEqual(sundayFirst[0], { date: '2026-09-27', day: 27, inMonth: false });
  assert.deepEqual(sundayFirst[4], { date: '2026-10-01', day: 1, inMonth: true });

  const mondayFirst = monthGrid('2026-10-11', 1);
  assert.equal(mondayFirst[0].date, '2026-09-28');
  assert.equal(mondayFirst[3].date, '2026-10-01');
  assert.throws(() => monthGrid('2026-10-11', 7), /weekStartsOn/);
});
