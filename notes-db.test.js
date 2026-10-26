const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./db');
const { defaultReminders } = require('./notes-logic');

function reminders(revision) {
  return { ...defaultReminders(Date.UTC(2026, 9, 26)), revision };
}

function stubClient(t, current, failUpdate = false) {
  const originalConnect = db.pool.connect;
  const calls = [];
  let released = false;
  db.pool.connect = async () => ({
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/SELECT value FROM app_state/.test(sql)) return { rows: [{ value: current }] };
      if (failUpdate && /UPDATE app_state SET value/.test(sql)) throw new Error('database unavailable');
      return { rows: [], rowCount: 1 };
    },
    release() { released = true; },
  });
  t.after(() => { db.pool.connect = originalConnect; });
  return { calls, released: () => released };
}

test('reminder save locks only reminders and atomically advances its revision', async t => {
  const { calls, released } = stubClient(t, reminders(3));
  const result = await db.compareAndSetReminders(3, reminders(3));
  assert.deepEqual(result, { ok: true, value: reminders(4) });
  const lock = calls.find(call => /SELECT value FROM app_state/.test(call.sql));
  assert.match(lock.sql, /FOR UPDATE/);
  assert.deepEqual(lock.values, ['reminders']);
  const update = calls.find(call => /UPDATE app_state/.test(call.sql));
  assert.deepEqual(update.values, [JSON.stringify(reminders(4)), 'reminders']);
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.equal(released(), true);
});

test('first reminder save starts from the null record without replacing other state', async t => {
  const { calls } = stubClient(t, null);
  const result = await db.compareAndSetReminders(0, reminders(0));
  assert.deepEqual(result, { ok: true, value: reminders(1) });
  const insert = calls.find(call => /INSERT INTO app_state/.test(call.sql));
  assert.deepEqual(insert.values, ['reminders']);
  assert.match(insert.sql, /ON CONFLICT \(key\) DO NOTHING/);
});

test('stale reminder saves return authoritative notes and do not overwrite them', async t => {
  const current = { revision: 9, notes: [] };
  const { calls, released } = stubClient(t, current);
  const result = await db.compareAndSetReminders(2, reminders(2));
  assert.deepEqual(result, { ok: false, current });
  assert.equal(calls.some(call => /UPDATE app_state/.test(call.sql)), false);
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.equal(released(), true);
});

test('failed reminder saves roll back and release their database connection', async t => {
  const { calls, released } = stubClient(t, reminders(1), true);
  await assert.rejects(db.compareAndSetReminders(1, reminders(1)), /database unavailable/);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.equal(released(), true);
});
