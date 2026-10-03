const test = require('node:test');
const assert = require('node:assert/strict');
const {
  dateKeyInTimeZone,
  defaultWinterArcSettings,
  getWinterArcPosition,
  getWinterArcTodayStatus,
  normalizeWinterArcSettings,
  summarizeWinterArc,
  validateWinterArcSettings,
} = require('./winter-arc-logic');

const KOLKATA = 'Asia/Kolkata';
const settings = {
  enabled: true,
  startDate: '2026-10-01',
  endDate: '2026-12-31',
};

function completed(date, overrides = {}) {
  const [year, month, day] = date.split('-').map(Number);
  return {
    completedAt: new Date(Date.UTC(year, month - 1, day, 7)).getTime(),
    category: 'other',
    points: 1,
    bodySlot: false,
    careerSlot: false,
    ...overrides,
  };
}

test('creates an enabled October through December default for the current year', () => {
  assert.deepEqual(defaultWinterArcSettings(new Date('2026-03-04T12:00:00Z'), 'UTC'), settings);
  assert.deepEqual(normalizeWinterArcSettings(null, new Date('2026-03-04T12:00:00Z'), 'UTC'), settings);
});

test('validates exact settings and rejects malformed or reversed ranges', () => {
  assert.deepEqual(validateWinterArcSettings(settings), { ok: true, value: settings });
  for (const candidate of [
    null,
    [],
    { ...settings, enabled: 'yes' },
    { ...settings, startDate: '2026-02-30' },
    { ...settings, endDate: '31-12-2026' },
    { ...settings, startDate: '2027-01-01' },
    { ...settings, extra: true },
  ]) {
    assert.equal(validateWinterArcSettings(candidate).ok, false);
  }
});

test('uses inclusive calendar math for upcoming, active, and finished phases', () => {
  assert.deepEqual(getWinterArcPosition({ ...settings, todayDate: '2026-09-30' }), {
    phase: 'upcoming',
    dayNumber: 0,
    totalDays: 92,
    daysUntilStart: 1,
    daysRemaining: 92,
  });
  assert.deepEqual(getWinterArcPosition({ ...settings, todayDate: '2026-10-01' }), {
    phase: 'active',
    dayNumber: 1,
    totalDays: 92,
    daysUntilStart: 0,
    daysRemaining: 92,
  });
  assert.equal(getWinterArcPosition({ ...settings, todayDate: '2026-11-15' }).dayNumber, 46);
  assert.deepEqual(getWinterArcPosition({ ...settings, todayDate: '2026-12-31' }), {
    phase: 'active',
    dayNumber: 92,
    totalDays: 92,
    daysUntilStart: 0,
    daysRemaining: 1,
  });
  assert.equal(getWinterArcPosition({ ...settings, todayDate: '2027-01-01' }).phase, 'finished');
});

test('supports one-day and leap-day arcs without daylight-saving arithmetic', () => {
  assert.equal(getWinterArcPosition({
    startDate: '2028-02-29',
    endDate: '2028-02-29',
    todayDate: '2028-02-29',
  }).totalDays, 1);
  assert.equal(getWinterArcPosition({
    startDate: '2026-10-31',
    endDate: '2026-11-02',
    todayDate: '2026-11-01',
  }).dayNumber, 2);
});

test('maps instants to the correct local date in different time zones', () => {
  assert.equal(dateKeyInTimeZone('2026-09-30T18:29:59Z', KOLKATA), '2026-09-30');
  assert.equal(dateKeyInTimeZone('2026-09-30T18:30:00Z', KOLKATA), '2026-10-01');
  assert.equal(dateKeyInTimeZone('2026-10-01T02:00:00Z', KOLKATA), '2026-10-01');
  assert.equal(dateKeyInTimeZone('2026-10-01T02:00:00Z', 'America/Los_Angeles'), '2026-09-30');
});

test('checks body, Quant Dev, and the exact daily point threshold independently', () => {
  const log = [
    completed('2026-10-01', { bodySlot: false, category: 'glow_up', points: 4 }),
    completed('2026-10-01', { careerSlot: false, category: 'empire_building', points: 20.75 }),
  ];
  const status = getWinterArcTodayStatus({ log, dateKey: '2026-10-01', dailyTarget: 25, timeZone: 'UTC' });
  assert.equal(status.bodyDone, true);
  assert.equal(status.careerDone, true);
  assert.equal(status.points, 24.75);
  assert.equal(status.pointsDone, false);
  assert.equal(status.secured, false);

  log.push(completed('2026-10-01', { points: 0.25 }));
  assert.equal(getWinterArcTodayStatus({ log, dateKey: '2026-10-01', dailyTarget: 25, timeZone: 'UTC' }).secured, true);
});

test('category completions count regardless of protected-slot flags', () => {
  const categorized = [
    completed('2026-10-01', { category: 'glow_up', points: 4, bodySlot: false }),
    completed('2026-10-01', { category: 'empire_building', points: 21, careerSlot: false }),
  ];
  const categorizedStatus = getWinterArcTodayStatus({ log: categorized, dateKey: '2026-10-01', dailyTarget: 25, timeZone: 'UTC' });
  assert.equal(categorizedStatus.bodyDone, true);
  assert.equal(categorizedStatus.careerDone, true);
  assert.equal(categorizedStatus.secured, true);

  const unrelated = categorized.map(task => ({ ...task, category: 'other' }));
  const unrelatedStatus = getWinterArcTodayStatus({ log: unrelated, dateKey: '2026-10-01', dailyTarget: 25, timeZone: 'UTC' });
  assert.equal(unrelatedStatus.bodyDone, false);
  assert.equal(unrelatedStatus.careerDone, false);
  assert.equal(unrelatedStatus.secured, false);
});

test('each matching category completes only its own Winter Arc promise', () => {
  const bodyStatus = getWinterArcTodayStatus({
    log: [completed('2026-10-01', { category: 'glow_up', points: 0, bodySlot: false, careerSlot: false })],
    dateKey: '2026-10-01',
    dailyTarget: 25,
    timeZone: 'UTC',
  });
  assert.equal(bodyStatus.bodyDone, true);
  assert.equal(bodyStatus.careerDone, false);

  const careerStatus = getWinterArcTodayStatus({
    log: [completed('2026-10-01', { category: 'empire_building', points: 0, bodySlot: false, careerSlot: false })],
    dateKey: '2026-10-01',
    dailyTarget: 25,
    timeZone: 'UTC',
  });
  assert.equal(careerStatus.bodyDone, false);
  assert.equal(careerStatus.careerDone, true);
});

test('ignores invalid points and never treats a missing target as complete', () => {
  const log = [
    completed('2026-10-01', { points: -4, bodySlot: true }),
    completed('2026-10-01', { points: 'nope', careerSlot: true }),
  ];
  const status = getWinterArcTodayStatus({ log, dateKey: '2026-10-01', dailyTarget: 0, timeZone: 'UTC' });
  assert.equal(status.bodyDone, true);
  assert.equal(status.careerDone, true);
  assert.equal(status.points, 0);
  assert.equal(status.needsTarget, true);
  assert.equal(status.pointsDone, false);
  assert.equal(status.secured, false);
});

test('counts compassionate show-up days and fully secured days without a reset', () => {
  const log = [
    completed('2026-09-30', { points: 99 }),
    completed('2026-10-01', { points: 1 }),
    completed('2026-10-01', { points: 2 }),
    completed('2026-10-03', { category: 'glow_up', bodySlot: false, points: 4 }),
    completed('2026-10-03', { category: 'empire_building', careerSlot: false, points: 21 }),
    completed('2026-12-31', { points: 10 }),
    completed('2027-01-01', { points: 99 }),
  ];
  const summary = summarizeWinterArc({
    settings,
    log,
    dailyTarget: 25,
    now: new Date('2026-10-04T07:00:00Z'),
    timeZone: 'UTC',
  });
  assert.equal(summary.phase, 'active');
  assert.equal(summary.dayNumber, 4);
  assert.equal(summary.showedUpDays, 2);
  assert.equal(summary.securedDays, 1);
});
