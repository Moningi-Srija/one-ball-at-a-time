const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function init() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Prevent two app instances from racing through startup migrations.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('one-ball-at-a-time-schema'))`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const defaults = {
      active: [],
      log: [],
      countdowns: [],
      targets: { day: 25, week: 150, weekend: 50, month: 600 },
      frog: null,
    };
    for (const [key, value] of Object.entries(defaults)) {
      await client.query(
        `INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(value)]
      );
    }

    const expenseMigration = await client.query(
      `SELECT 1 FROM schema_migrations WHERE name = $1`,
      ['001_create_expenses']
    );
    if (expenseMigration.rowCount === 0) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          amount_paise BIGINT NOT NULL CHECK (amount_paise > 0 AND amount_paise <= 999999999999),
          spent_on DATE NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('food', 'clothes', 'transport', 'trips')),
          note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS expenses_spent_on_idx
          ON expenses (spent_on DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS expenses_category_spent_on_idx
          ON expenses (category, spent_on DESC);
      `);
      await client.query(
        `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        ['001_create_expenses']
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getState() {
  const { rows } = await pool.query(`SELECT key, value FROM app_state`);
  const state = {};
  rows.forEach(r => { state[r.key] = r.value; });
  return state;
}

async function setState(key, value) {
  await pool.query(
    `INSERT INTO app_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, JSON.stringify(value)]
  );
}

const EXPENSE_COLUMNS = `
  id::text AS id,
  amount_paise::text AS "amountPaise",
  spent_on::text AS date,
  category,
  note,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function mapExpense(row) {
  return {
    id: row.id,
    amount: Number(row.amountPaise) / 100,
    date: row.date,
    category: row.category,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listExpenses({ from, to, category } = {}) {
  const conditions = [];
  const values = [];
  if (from) {
    values.push(from);
    conditions.push(`spent_on >= $${values.length}::date`);
  }
  if (to) {
    values.push(to);
    conditions.push(`spent_on <= $${values.length}::date`);
  }
  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${EXPENSE_COLUMNS}
     FROM expenses
     ${where}
     ORDER BY spent_on DESC, created_at DESC, id DESC`,
    values
  );
  return rows.map(mapExpense);
}

async function createExpense({ amountPaise, date, category, note }) {
  const { rows } = await pool.query(
    `INSERT INTO expenses (amount_paise, spent_on, category, note)
     VALUES ($1::bigint, $2::date, $3, $4)
     RETURNING ${EXPENSE_COLUMNS}`,
    [amountPaise, date, category, note]
  );
  return mapExpense(rows[0]);
}

async function updateExpense(id, { amountPaise, date, category, note }) {
  const { rows } = await pool.query(
    `UPDATE expenses
     SET amount_paise = $2::bigint,
         spent_on = $3::date,
         category = $4,
         note = $5,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING ${EXPENSE_COLUMNS}`,
    [id, amountPaise, date, category, note]
  );
  return rows[0] ? mapExpense(rows[0]) : null;
}

async function deleteExpense(id) {
  const result = await pool.query(`DELETE FROM expenses WHERE id = $1::bigint`, [id]);
  return result.rowCount > 0;
}

module.exports = {
  pool,
  init,
  getState,
  setState,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
