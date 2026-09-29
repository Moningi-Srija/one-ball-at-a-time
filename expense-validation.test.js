const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXPENSE_CATEGORIES,
  MAX_AMOUNT,
  MAX_NOTE_LENGTH,
  validateExpense,
  validateExpenseFilters,
  validateExpenseId,
} = require('./expense-validation');

function validExpense(overrides = {}) {
  return {
    amount: 425.75,
    date: '2026-09-29',
    category: 'food',
    note: 'Dinner with friends',
    ...overrides,
  };
}

test('accepts an expense and converts rupees to exact integer paise', () => {
  const result = validateExpense(validExpense({ amount: '425.70', note: '  Dinner  ' }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    amountPaise: 42570,
    date: '2026-09-29',
    category: 'food',
    note: 'Dinner',
  });
});

test('accepts every supported category', () => {
  for (const category of EXPENSE_CATEGORIES) {
    assert.equal(validateExpense(validExpense({ category })).ok, true);
  }
});

test('requires a positive amount with no more than two decimal places', () => {
  for (const amount of [0, -1, '1.001', '1e3', '', null, Number.NaN]) {
    assert.equal(validateExpense(validExpense({ amount })).ok, false, String(amount));
  }
  assert.equal(validateExpense(validExpense({ amount: 0.01 })).value.amountPaise, 1);
  assert.equal(validateExpense(validExpense({ amount: MAX_AMOUNT })).value.amountPaise, 999999999999);
  assert.equal(validateExpense(validExpense({ amount: '10000000000.00' })).ok, false);
});

test('requires a real calendar date in YYYY-MM-DD format', () => {
  assert.equal(validateExpense(validExpense({ date: '2026-02-28' })).ok, true);
  for (const date of ['29-09-2026', '2026-2-03', '2026-02-30', '', null]) {
    assert.equal(validateExpense(validExpense({ date })).ok, false, String(date));
  }
});

test('rejects unsupported categories instead of silently changing them', () => {
  assert.equal(validateExpense(validExpense({ category: 'Food' })).ok, false);
  assert.equal(validateExpense(validExpense({ category: 'shopping' })).ok, false);
});

test('normalizes an empty note and enforces the note limit', () => {
  assert.equal(validateExpense(validExpense({ note: '   ' })).value.note, null);
  assert.equal(validateExpense(validExpense({ note: 'a'.repeat(MAX_NOTE_LENGTH) })).ok, true);
  assert.equal(validateExpense(validExpense({ note: 'a'.repeat(MAX_NOTE_LENGTH + 1) })).ok, false);
  assert.equal(validateExpense(validExpense({ note: 'bad\u0000note' })).ok, false);
});

test('rejects arrays and unknown payload fields', () => {
  assert.equal(validateExpense([]).ok, false);
  assert.equal(validateExpense(null).ok, false);
  const result = validateExpense(validExpense({ owner: 'someone-else' }));
  assert.equal(result.ok, false);
  assert.equal(result.field, 'owner');
});

test('validates expense ids without losing bigint precision', () => {
  assert.deepEqual(validateExpenseId('9223372036854775807'), {
    ok: true,
    value: '9223372036854775807',
  });
  for (const id of ['0', '-1', '1.5', 'abc', '9223372036854775808']) {
    assert.equal(validateExpenseId(id).ok, false, id);
  }
});

test('accepts valid optional list filters', () => {
  assert.deepEqual(validateExpenseFilters({
    from: '2026-09-01',
    to: '2026-09-30',
    category: 'transport',
  }), {
    ok: true,
    value: {
      from: '2026-09-01',
      to: '2026-09-30',
      category: 'transport',
    },
  });
  assert.equal(validateExpenseFilters({}).ok, true);
});

test('rejects reversed, malformed, duplicate, and unknown list filters', () => {
  assert.equal(validateExpenseFilters({ from: '2026-10-01', to: '2026-09-01' }).ok, false);
  assert.equal(validateExpenseFilters({ from: 'yesterday' }).ok, false);
  assert.equal(validateExpenseFilters({ category: ['food', 'trips'] }).ok, false);
  assert.equal(validateExpenseFilters({ limit: '10' }).ok, false);
});
