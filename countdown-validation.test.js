const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_COUNTDOWNS, validateCountdowns } = require('./countdown-validation');

function validCountdown(overrides = {}) {
  return {
    id: 'countdown-1',
    title: 'Dream trip',
    note: 'Pack the pink notebook',
    emoji: '✈️',
    color: '#EC4899',
    style: 'ball-ring',
    startAt: 1_700_000_000_000,
    targetAt: 1_800_000_000_000,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

test('accepts and normalizes a valid countdown array', () => {
  const result = validateCountdowns([validCountdown({
    title: '  Dream trip  ',
    note: 'Pack the pink notebook\nBook the sunrise train',
  })]);

  assert.equal(result.ok, true);
  assert.equal(result.value[0].title, 'Dream trip');
  assert.match(result.value[0].note, /sunrise train/);
  assert.equal(result.value[0].color, '#ec4899');
});

test('rejects non-array payloads and oversized arrays', () => {
  assert.equal(validateCountdowns({}).ok, false);
  assert.equal(
    validateCountdowns(Array.from({ length: MAX_COUNTDOWNS + 1 }, (_, index) => (
      validCountdown({ id: `countdown-${index}` })
    ))).ok,
    false
  );
});

test('rejects duplicate countdown ids', () => {
  const result = validateCountdowns([
    validCountdown(),
    validCountdown({ title: 'Another trip' }),
  ]);

  assert.equal(result.ok, false);
  assert.match(result.error, /unique/);
});

test('rejects unsafe colors and unsupported display styles', () => {
  assert.equal(validateCountdowns([validCountdown({ color: 'url(evil)' })]).ok, false);
  assert.equal(validateCountdowns([validCountdown({ style: 'giant-fireworks' })]).ok, false);
});

test('requires epoch-millisecond timestamps in chronological order', () => {
  assert.equal(validateCountdowns([validCountdown({ targetAt: '1800000000000' })]).ok, false);
  assert.equal(validateCountdowns([validCountdown({ targetAt: 1_600_000_000_000 })]).ok, false);
});

test('drops unknown fields before persistence', () => {
  const result = validateCountdowns([validCountdown({ injected: '<script>' })]);

  assert.equal(result.ok, true);
  assert.equal(Object.hasOwn(result.value[0], 'injected'), false);
});
