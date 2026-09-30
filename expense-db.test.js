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

test('init expands the production expense category constraint without rewriting rows', async t => {
  const originalConnect = db.pool.connect;
  const queries = [];
  const client = {
    async query(sql, values = []) {
      queries.push({ sql, values });
      if (/SELECT 1 FROM schema_migrations/.test(sql)) {
        return { rowCount: values[0] === '003_expand_expense_categories' ? 0 : 1, rows: [] };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  db.pool.connect = async () => client;
  t.after(() => { db.pool.connect = originalConnect; });

  await db.init();

  const constraintQuery = queries.find(({ sql }) => /ADD CONSTRAINT expenses_category_check/.test(sql));
  assert.ok(constraintQuery, 'expected the category constraint migration to run');
  for (const category of ['home_rent', 'family_support', 'miscellaneous']) {
    assert.match(constraintQuery.sql, new RegExp(`'${category}'`));
  }
  assert.ok(queries.some(({ sql, values }) => (
    /INSERT INTO schema_migrations/.test(sql)
    && values[0] === '003_expand_expense_categories'
  )));
  assert.equal(queries.filter(({ sql }) => sql === 'COMMIT').length, 1);
});

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
    assert.deepEqual(values, [12345, '2026-09-29', 'home_rent', 'September rent']);
    return { rows: [expenseRow({ category: 'home_rent', note: 'September rent' })] };
  });

  const expense = await db.createExpense({
    amountPaise: 12345,
    date: '2026-09-29',
    category: 'home_rent',
    note: 'September rent',
  });
  assert.equal(expense.amount, 123.45);
  assert.equal(expense.category, 'home_rent');
});

test('updateExpense returns null when the id does not exist', async t => {
  stubQuery(t, async (sql, values) => {
    assert.match(sql, /WHERE id = \$1::bigint/);
    assert.deepEqual(values, ['42', 999, '2026-09-30', 'miscellaneous', null]);
    return { rows: [] };
  });

  const expense = await db.updateExpense('42', {
    amountPaise: 999,
    date: '2026-09-30',
    category: 'miscellaneous',
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
