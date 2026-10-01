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
    completed('2026-10-01', { bodySlot: true, category: 'glow_up', points: 4 }),
    completed('2026-10-01', { careerSlot: true, category: 'empire_building', points: 20.75 }),
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

test('legacy categories count only when protected-slot flags are absent', () => {
  const legacy = [
    completed('2026-10-01', { category: 'glow_up', points: 4, bodySlot: undefined }),
    completed('2026-10-01', { category: 'empire_building', points: 21, careerSlot: undefined }),
  ];
  const legacyStatus = getWinterArcTodayStatus({ log: legacy, dateKey: '2026-10-01', dailyTarget: 25, timeZone: 'UTC' });
  assert.equal(legacyStatus.secured, true);

  const explicitFlexible = legacy.map(task => ({ ...task, bodySlot: false, careerSlot: false }));
  const explicitStatus = getWinterArcTodayStatus({ log: explicitFlexible, dateKey: '2026-10-01', dailyTarget: 25, timeZone: 'UTC' });
  assert.equal(explicitStatus.bodyDone, false);
  assert.equal(explicitStatus.careerDone, false);
  assert.equal(explicitStatus.secured, false);
});

test('ignores invalid points and never treats a missing target as complete', () => {
  const log = [
    completed('2026-10-01', { points: -4, bodySlot: true }),
    completed('2026-10-01', { points: 'nope', careerSlot: true }),
  ];
  const status = getWinterArcTodayStatus({ log, dateKey: '2026-10-01', dailyTarget: 0, timeZone: 'UTC' });
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
    completed('2026-10-03', { bodySlot: true, points: 4 }),
    completed('2026-10-03', { careerSlot: true, points: 21 }),
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
