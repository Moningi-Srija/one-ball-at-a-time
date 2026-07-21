const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);
  const defaults = {
    active: [],
    log: [],
    targets: { day: 25, week: 150, weekend: 50, month: 600 },
    frog: null,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await pool.query(
      `INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(value)]
    );
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

module.exports = { pool, init, getState, setState };
