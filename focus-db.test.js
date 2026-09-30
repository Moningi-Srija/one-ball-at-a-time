const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./db');

function focusRow(overrides = {}) {
  return {
    id: '9007199254740993',
    status: 'running',
    label: 'DSA practice',
    category: 'Quant Dev',
    note: null,
    focusLevel: null,
    mode: 'countdown',
    plannedSeconds: 1500,
    date: '2026-09-30',
    timeZone: 'Asia/Kolkata',
    elapsedSeconds: '125',
    startedAt: new Date('2026-09-30T10:00:00.000Z'),
    runningSince: new Date('2026-09-30T10:02:00.000Z'),
    endedAt: null,
    createdAt: new Date('2026-09-30T10:00:00.000Z'),
    updatedAt: new Date('2026-09-30T10:02:00.000Z'),
    ...overrides,
  };
}

function stubPoolQuery(t, implementation) {
  const original = db.pool.query;
  db.pool.query = implementation;
  t.after(() => { db.pool.query = original; });
}

function stubClient(t, implementation) {
  const original = db.pool.connect;
  const calls = [];
  const client = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return implementation(sql, values, calls);
    },
    release() {},
  };
  db.pool.connect = async () => client;
  t.after(() => { db.pool.connect = original; });
  return calls;
}

test('listFocusSessions applies parameterized filters and maps exact elapsed seconds', async t => {
  stubPoolQuery(t, async (sql, values) => {
    assert.match(sql, /session_date >= \$1::date/);
    assert.match(sql, /session_date <= \$2::date/);
    assert.match(sql, /status = \$3/);
    assert.match(sql, /category = \$4/);
    assert.match(sql, /elapsed_seconds/);
    assert.deepEqual(values, ['2026-09-01', '2026-09-30', 'finished', 'Quant Dev']);
    return { rows: [focusRow({ status: 'finished', runningSince: null })] };
  });

  const sessions = await db.listFocusSessions({
    from: '2026-09-01',
    to: '2026-09-30',
    status: 'finished',
    category: 'Quant Dev',
  });
  assert.equal(sessions[0].id, '9007199254740993');
  assert.equal(sessions[0].elapsedSeconds, 125);
  assert.equal(sessions[0].mode, 'countdown');
  assert.equal(sessions[0].plannedSeconds, 1500);
});

test('createFocusSession stores server-timed state and maps active-session conflicts', async t => {
  let attempt = 0;
  stubPoolQuery(t, async (sql, values) => {
    assert.match(sql, /INSERT INTO focus_sessions/);
    attempt += 1;
    if (attempt === 2) {
      const error = new Error('duplicate');
      error.code = '23505';
      error.constraint = 'focus_sessions_one_active_idx';
      throw error;
    }
    assert.deepEqual(values, [
      '2026-09-30',
      'Asia/Kolkata',
      'DSA practice',
      'Quant Dev',
      null,
      'countdown',
      1500,
    ]);
    return { rows: [focusRow()] };
  });

  const session = await db.createFocusSession({
    date: '2026-09-30',
    timeZone: 'Asia/Kolkata',
    label: 'DSA practice',
    category: 'Quant Dev',
    note: null,
    mode: 'countdown',
    plannedSeconds: 1500,
  });
  assert.equal(session.status, 'running');

  await assert.rejects(
    db.createFocusSession({
      date: '2026-09-30',
      timeZone: 'Asia/Kolkata',
      label: 'Second timer',
      category: null,
      note: null,
      mode: 'stopwatch',
      plannedSeconds: null,
    }),
    error => error instanceof db.FocusSessionError && error.code === 'active_session_exists'
  );
});

test('pause transition locks the row and atomically accumulates running time', async t => {
  const calls = stubClient(t, async sql => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) return { rows: [focusRow()] };
    assert.match(sql, /SET status = 'paused'/);
    assert.match(sql, /elapsed_seconds = elapsed_seconds/);
    assert.match(sql, /running_since = NULL/);
    return { rows: [focusRow({ status: 'paused', runningSince: null, elapsedSeconds: '130' })] };
  });

  const session = await db.transitionFocusSession('9007199254740993', 'pause');
  assert.equal(session.status, 'paused');
  assert.equal(session.elapsedSeconds, 130);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('finishing an early countdown preserves actual elapsed time and final metadata', async t => {
  stubClient(t, async (sql, values) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) return { rows: [focusRow()] };
    assert.match(sql, /SET status = 'finished'/);
    assert.match(sql, /WHEN mode = 'countdown' AND planned_seconds IS NOT NULL/);
    assert.match(sql, /LEAST\(planned_seconds::bigint,/);
    assert.match(sql, /note = CASE WHEN \$4::boolean THEN \$3 ELSE note END/);
    assert.deepEqual(values, ['9007199254740993', 'deep', 'Final note', true]);
    return {
      rows: [focusRow({
        status: 'finished',
        note: 'Final note',
        focusLevel: 'deep',
        runningSince: null,
        endedAt: new Date('2026-09-30T10:15:00.000Z'),
        elapsedSeconds: '900',
      })],
    };
  });

  const session = await db.transitionFocusSession('9007199254740993', 'finish', {
    focusLevel: 'deep',
    note: 'Final note',
  });
  assert.equal(session.status, 'finished');
  assert.equal(session.note, 'Final note');
  assert.equal(session.focusLevel, 'deep');
  assert.equal(session.elapsedSeconds, 900);
});

test('finishing an overtime countdown caps saved elapsed time at the planned duration', async t => {
  stubClient(t, async (sql, values) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) {
      return {
        rows: [focusRow({
          plannedSeconds: 1200,
          elapsedSeconds: '1200',
          runningSince: new Date('2026-09-30T10:20:00.000Z'),
        })],
      };
    }
    assert.match(sql, /SET status = 'finished'/);
    assert.match(sql, /WHEN mode = 'countdown' AND planned_seconds IS NOT NULL/);
    assert.match(sql, /LEAST\(planned_seconds::bigint,/);
    assert.deepEqual(values, ['9007199254740993', null, null, false]);
    return {
      rows: [focusRow({
        status: 'finished',
        plannedSeconds: 1200,
        runningSince: null,
        endedAt: new Date('2026-09-30T10:32:00.000Z'),
        elapsedSeconds: '1200',
      })],
    };
  });

  const session = await db.transitionFocusSession('9007199254740993', 'finish');
  assert.equal(session.mode, 'countdown');
  assert.equal(session.plannedSeconds, 1200);
  assert.equal(session.elapsedSeconds, 1200);
});

test('finishing a stopwatch preserves actual elapsed time without a countdown cap', async t => {
  stubClient(t, async (sql, values) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) {
      return {
        rows: [focusRow({
          mode: 'stopwatch',
          plannedSeconds: null,
          elapsedSeconds: '1800',
        })],
      };
    }
    assert.match(sql, /SET status = 'finished'/);
    assert.match(sql, /WHEN mode = 'countdown' AND planned_seconds IS NOT NULL/);
    assert.match(sql, /ELSE elapsed_seconds\s+\+ CASE/);
    assert.deepEqual(values, ['9007199254740993', null, null, false]);
    return {
      rows: [focusRow({
        status: 'finished',
        mode: 'stopwatch',
        plannedSeconds: null,
        runningSince: null,
        endedAt: new Date('2026-09-30T10:32:00.000Z'),
        elapsedSeconds: '1920',
      })],
    };
  });

  const session = await db.transitionFocusSession('9007199254740993', 'finish');
  assert.equal(session.mode, 'stopwatch');
  assert.equal(session.plannedSeconds, null);
  assert.equal(session.elapsedSeconds, 1920);
});

test('init repairs existing overtime countdowns and installs the finished-session invariant', async t => {
  const migrationName = '004_cap_finished_countdown_elapsed';
  const calls = stubClient(t, async (sql, values) => {
    if (/SELECT 1 FROM schema_migrations/.test(sql)) {
      return { rows: [], rowCount: values?.[0] === migrationName ? 0 : 1 };
    }
    return { rows: [], rowCount: 1 };
  });

  await db.init();

  const repair = calls.find(call => /UPDATE focus_sessions/.test(call.sql));
  assert.ok(repair, 'expected a repair query for existing focus sessions');
  assert.match(repair.sql, /SET elapsed_seconds = LEAST\(elapsed_seconds, planned_seconds::bigint\)/);
  assert.match(repair.sql, /WHERE status = 'finished'/);
  assert.match(repair.sql, /AND mode = 'countdown'/);
  assert.match(repair.sql, /AND planned_seconds IS NOT NULL/);
  assert.match(repair.sql, /AND elapsed_seconds > planned_seconds/);
  assert.match(repair.sql, /ADD CONSTRAINT focus_sessions_finished_countdown_elapsed_check/);
  assert.match(repair.sql, /OR elapsed_seconds <= planned_seconds/);

  const marker = calls.find(call => (
    /INSERT INTO schema_migrations/.test(call.sql)
    && call.values?.[0] === migrationName
  ));
  assert.ok(marker, 'expected the repair migration to be recorded');
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('resume and cancel preserve server-authoritative lifecycle state', async t => {
  let current = focusRow({ status: 'paused', runningSince: null, elapsedSeconds: '60' });
  stubClient(t, async (sql, values) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) return { rows: [current] };
    if (/SET status = 'running'/.test(sql)) {
      assert.deepEqual(values, ['9007199254740993']);
      current = focusRow({ status: 'running', elapsedSeconds: '60' });
      return { rows: [current] };
    }
    assert.match(sql, /SET status = 'cancelled'/);
    assert.deepEqual(values, ['9007199254740993', null, null, false]);
    current = focusRow({
      status: 'cancelled',
      runningSince: null,
      endedAt: new Date('2026-09-30T10:05:00.000Z'),
      elapsedSeconds: '65',
    });
    return { rows: [current] };
  });

  const resumed = await db.transitionFocusSession('9007199254740993', 'resume');
  assert.equal(resumed.status, 'running');
  const cancelled = await db.transitionFocusSession('9007199254740993', 'cancel');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.elapsedSeconds, 65);
});

test('same-state transition retries are idempotent and do not update elapsed time twice', async t => {
  const calls = stubClient(t, async sql => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) {
      return {
        rows: [focusRow({
          status: 'finished',
          runningSince: null,
          endedAt: new Date('2026-09-30T10:15:00.000Z'),
          elapsedSeconds: '900',
          focusLevel: 'steady',
        })],
      };
    }
    throw new Error('idempotent finish must not run UPDATE');
  });

  const session = await db.transitionFocusSession(
    '9007199254740993',
    'finish',
    { focusLevel: 'steady' }
  );
  assert.equal(session.status, 'finished');
  assert.equal(session.elapsedSeconds, 900);
  assert.equal(calls.filter(call => /UPDATE focus_sessions/.test(call.sql)).length, 0);
});

test('contradictory transitions roll back with a conflict error', async t => {
  const calls = stubClient(t, async sql => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) {
      return {
        rows: [focusRow({
          status: 'finished',
          runningSince: null,
          endedAt: new Date('2026-09-30T10:15:00.000Z'),
        })],
      };
    }
    throw new Error('unexpected query');
  });

  await assert.rejects(
    db.transitionFocusSession('9007199254740993', 'pause'),
    error => error instanceof db.FocusSessionError && error.code === 'invalid_session_state'
  );
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
});

test('focusLevel cannot be attached to an unfinished session', async t => {
  const calls = stubClient(t, async sql => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) return { rows: [focusRow()] };
    throw new Error('unexpected update');
  });

  await assert.rejects(
    db.updateFocusSession('9007199254740993', { focusLevel: 'deep' }),
    error => error instanceof db.FocusSessionError
      && error.code === 'focus_level_requires_finished_session'
  );
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
});

test('only finished or cancelled focus sessions may be deleted', async t => {
  let status = 'running';
  const calls = stubClient(t, async sql => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/FOR UPDATE/.test(sql)) {
      return { rows: [focusRow({ status, runningSince: status === 'running' ? new Date() : null })] };
    }
    if (/DELETE FROM focus_sessions/.test(sql)) return { rowCount: 1, rows: [] };
    throw new Error('unexpected query');
  });

  await assert.rejects(
    db.deleteFocusSession('9007199254740993'),
    error => error instanceof db.FocusSessionError && error.code === 'active_session_cannot_be_deleted'
  );
  assert.equal(calls.at(-1).sql, 'ROLLBACK');

  status = 'finished';
  assert.equal(await db.deleteFocusSession('9007199254740993'), true);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});
