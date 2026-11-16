const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./db');

function settings(revision, bodyLocked = true, careerLocked = true) {
  return { revision, bodyLocked, careerLocked };
}

function stubClient(t, current, failUpdate = false) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/SELECT value FROM app_state/.test(sql)) return { rows: [{ value: current }] };
      if (failUpdate && /UPDATE app_state SET value/.test(sql)) throw new Error('write failed');
      if (/SELECT 1 FROM schema_migrations/.test(sql)) return { rowCount: 1, rows: [] };
      return { rows: [], rowCount: 1 };
    },
    release() { released = true; },
  };
  t.mock.method(db.pool, 'connect', async () => client);
  return { calls, released: () => released };
}

test('init seeds locked slot settings without overwriting existing preferences', async t => {
  const { calls, released } = stubClient(t, null);
  await db.init();
  const seed = calls.find(({ sql, values }) => /INSERT INTO app_state/.test(sql) && values[0] === 'slotSettings');
  assert.ok(seed);
  assert.match(seed.sql, /ON CONFLICT \(key\) DO NOTHING/);
  assert.deepEqual(JSON.parse(seed.values[1]), settings(0));
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.equal(released(), true);
});

test('slot settings save locks the settings row and advances the revision only', async t => {
  const { calls, released } = stubClient(t, settings(3));
  const result = await db.compareAndSetSlotSettings(3, settings(3, false));
  assert.deepEqual(result, { ok: true, value: settings(4, false) });
  const lock = calls.find(call => /SELECT value FROM app_state/.test(call.sql));
  assert.match(lock.sql, /FOR UPDATE/);
  assert.deepEqual(lock.values, ['slotSettings']);
  const update = calls.find(call => /UPDATE app_state SET value/.test(call.sql));
  assert.deepEqual(update.values, [JSON.stringify(settings(4, false)), 'slotSettings']);
  assert.equal(calls.filter(call => /^\s*UPDATE\b/.test(call.sql)).length, 1, 'never rewrites active tasks or history');
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.equal(released(), true);
});

test('slot settings initialize a missing state row with revision zero', async t => {
  stubClient(t, null);
  assert.deepEqual(await db.compareAndSetSlotSettings(0, settings(0, false, false)), {
    ok: true, value: settings(1, false, false),
  });
});

test('slot settings reject stale revisions without writing', async t => {
  const current = settings(5, false, true);
  const { calls } = stubClient(t, current);
  assert.deepEqual(await db.compareAndSetSlotSettings(4, settings(4, true, false)), { ok: false, current });
  assert.equal(calls.some(call => /UPDATE app_state/.test(call.sql)), false);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('slot settings roll back and release the client if persistence fails', async t => {
  const { calls, released } = stubClient(t, settings(0), true);
  await assert.rejects(() => db.compareAndSetSlotSettings(0, settings(0, false)), /write failed/);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.equal(released(), true);
});
