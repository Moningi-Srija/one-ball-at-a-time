const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./db');

function calendar(revision, title = 'Study graphs') {
  return {
    revision,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    goals: [{
      id: 'goal-1',
      date: '2026-10-12',
      title,
      completed: false,
      createdAt: 1_760_259_600_000,
      completedAt: null,
    }],
  };
}

function stubClient(t, current) {
  const originalConnect = db.pool.connect;
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/SELECT value FROM app_state/.test(sql)) return { rows: [{ value: current }] };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  db.pool.connect = async () => client;
  t.after(() => { db.pool.connect = originalConnect; });
  return calls;
}

test('compareAndSetGoalCalendar atomically advances a matching revision', async t => {
  const calls = stubClient(t, calendar(4, 'Existing goal'));
  const result = await db.compareAndSetGoalCalendar(4, calendar(4, 'Updated goal'));

  assert.deepEqual(result, { ok: true, value: calendar(5, 'Updated goal') });
  const update = calls.find(call => /UPDATE app_state SET value/.test(call.sql));
  assert.ok(update);
  assert.deepEqual(JSON.parse(update.values[0]), calendar(5, 'Updated goal'));
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('compareAndSetGoalCalendar treats missing legacy revision as zero', async t => {
  const legacy = { startDate: '2026-10-01', endDate: '2026-10-31', goals: [] };
  const calls = stubClient(t, legacy);
  const result = await db.compareAndSetGoalCalendar(0, calendar(0));

  assert.equal(result.ok, true);
  assert.equal(result.value.revision, 1);
  assert.equal(calls.some(call => /UPDATE app_state SET value/.test(call.sql)), true);
});

test('compareAndSetGoalCalendar treats a null initial value as revision zero', async t => {
  const calls = stubClient(t, null);
  const result = await db.compareAndSetGoalCalendar(0, calendar(0));

  assert.equal(result.ok, true);
  assert.equal(result.value.revision, 1);
  assert.equal(calls.some(call => /UPDATE app_state SET value/.test(call.sql)), true);
});

test('compareAndSetGoalCalendar returns current state without writing on conflict', async t => {
  const current = calendar(3, 'Newer goal');
  const calls = stubClient(t, current);
  const result = await db.compareAndSetGoalCalendar(2, calendar(2, 'Stale goal'));

  assert.deepEqual(result, { ok: false, current });
  assert.equal(calls.some(call => /UPDATE app_state SET value/.test(call.sql)), false);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});
