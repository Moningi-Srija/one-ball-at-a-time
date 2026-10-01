const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./db');

test('init seeds validated Winter Arc settings without overwriting an existing record', async t => {
  const originalConnect = db.pool.connect;
  const queries = [];
  let released = false;
  const client = {
    async query(sql, values = []) {
      queries.push({ sql, values });
      if (/SELECT 1 FROM schema_migrations/.test(sql)) return { rowCount: 1, rows: [] };
      return { rowCount: 1, rows: [] };
    },
    release() { released = true; },
  };
  db.pool.connect = async () => client;
  t.after(() => { db.pool.connect = originalConnect; });

  await db.init();

  const seed = queries.find(({ sql, values }) => (
    /INSERT INTO app_state/.test(sql)
    && values[0] === 'winterArc'
  ));
  assert.ok(seed, 'expected the Winter Arc app-state default to be seeded');
  assert.match(seed.sql, /ON CONFLICT \(key\) DO NOTHING/);
  const value = JSON.parse(seed.values[1]);
  assert.equal(value.enabled, true);
  assert.match(value.startDate, /^\d{4}-10-01$/);
  assert.match(value.endDate, /^\d{4}-12-31$/);
  assert.equal(queries.at(-1).sql, 'COMMIT');
  assert.equal(released, true);
});
