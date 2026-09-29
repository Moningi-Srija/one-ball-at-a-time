const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./db');

function stubQuery(t, implementation) {
  const original = db.pool.query;
  db.pool.query = implementation;
  t.after(() => { db.pool.query = original; });
}

function expenseRow(overrides = {}) {
  return {
    id: '9007199254740993',
    amountPaise: '12345',
    date: '2026-09-29',
    category: 'food',
    note: 'Dinner',
    createdAt: new Date('2026-09-29T12:00:00.000Z'),
    updatedAt: new Date('2026-09-29T12:00:00.000Z'),
    ...overrides,
  };
}

test('listExpenses uses parameterized filters and preserves bigint ids', async t => {
  stubQuery(t, async (sql, values) => {
    assert.match(sql, /spent_on >= \$1::date/);
    assert.match(sql, /spent_on <= \$2::date/);
    assert.match(sql, /category = \$3/);
    assert.match(sql, /ORDER BY spent_on DESC/);
    assert.deepEqual(values, ['2026-09-01', '2026-09-30', 'food']);
    return { rows: [expenseRow()] };
  });

  const result = await db.listExpenses({
    from: '2026-09-01',
    to: '2026-09-30',
    category: 'food',
  });

  assert.equal(result[0].id, '9007199254740993');
  assert.equal(result[0].amount, 123.45);
  assert.equal(result[0].date, '2026-09-29');
});

test('createExpense sends integer paise and returns a JSON-number rupee amount', async t => {
  stubQuery(t, async (sql, values) => {
    assert.match(sql, /INSERT INTO expenses \(amount_paise/);
    assert.deepEqual(values, [12345, '2026-09-29', 'food', 'Dinner']);
    return { rows: [expenseRow()] };
  });

  const expense = await db.createExpense({
    amountPaise: 12345,
    date: '2026-09-29',
    category: 'food',
    note: 'Dinner',
  });
  assert.equal(expense.amount, 123.45);
});

test('updateExpense returns null when the id does not exist', async t => {
  stubQuery(t, async (sql, values) => {
    assert.match(sql, /WHERE id = \$1::bigint/);
    assert.deepEqual(values, ['42', 999, '2026-09-30', 'transport', null]);
    return { rows: [] };
  });

  const expense = await db.updateExpense('42', {
    amountPaise: 999,
    date: '2026-09-30',
    category: 'transport',
    note: null,
  });
  assert.equal(expense, null);
});

test('deleteExpense reports whether a record was deleted', async t => {
  stubQuery(t, async (sql, values) => {
    assert.match(sql, /DELETE FROM expenses/);
    assert.deepEqual(values, ['42']);
    return { rowCount: 1 };
  });

  assert.equal(await db.deleteExpense('42'), true);
});
