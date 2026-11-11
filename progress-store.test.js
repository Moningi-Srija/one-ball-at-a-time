const test = require('node:test');
const assert = require('node:assert/strict');
const { createProgressStore, initProgressSchema, ProgressError, HISTORY_LIMIT } = require('./progress-store');
const { validateTrackerCreate } = require('./progress-logic');

const ID = '349a5215-6a82-4658-a5f1-37bb3f973da1';
const MUTATION_ID = '05c6985a-e379-4f3c-8e54-d103d8343e41';
const CREATED_AT = new Date('2026-11-11T10:00:00.000Z');
function tracker(overrides = {}) {
  return { id: ID, title: 'DSA questions', unit: 'questions', target: '111.00', current: '58.00', step: '1.00',
    style: 'bar', color: 'pink', note: '', revision: '0', createdAt: CREATED_AT, updatedAt: CREATED_AT, ...overrides };
}
function event(overrides = {}) {
  return { id: MUTATION_ID, trackerId: ID, kind: 'add', requestedValue: '1.00', delta: '1.00', value: '59.00', note: '', createdAt: CREATED_AT, ...overrides };
}
function change(overrides = {}) { return { mutationId: MUTATION_ID, revision: 0, kind: 'add', value: 1, ...overrides }; }
function mockStore(implementation) {
  const calls = [];
  let releases = 0;
  const query = async (sql, values) => {
    calls.push({ sql, values });
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql) || /pg_advisory_xact_lock/.test(sql)) return { rows: [] };
    return implementation(sql, values);
  };
  const pool = { query, connect: async () => ({ query, release: () => { releases += 1; } }) };
  return { store: createProgressStore(pool), calls, releases: () => releases };
}
function hasStatus(status, code) { return error => error instanceof ProgressError && error.status === status && (!code || error.code === code); }

test('schema setup is non-destructive and belongs to the caller transaction', async () => {
  const statements = [];
  await initProgressSchema({ query: async sql => { statements.push(sql); } });
  const sql = statements.join('\n');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS progress_trackers/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS progress_events/);
  assert.match(sql, /REFERENCES progress_trackers\(id\) ON DELETE CASCADE/);
  assert.match(sql, /current >= 0 AND current <= 1000000000/);
  assert.match(sql, /revision BIGINT/);
  assert.match(sql, /sequence BIGINT GENERATED ALWAYS AS IDENTITY/);
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|DELETE|UPDATE|BEGIN|COMMIT)\b(?! CASCADE)/);
});

test('listing maps database numeric values without leaking internal creation data', async () => {
  const { store } = mockStore(async sql => {
    assert.match(sql, /ORDER BY created_at, id/);
    return { rows: [tracker({ creationPayload: {} })] };
  });
  const rows = await store.listTrackers();
  assert.equal(rows[0].current, 58);
  assert.equal(rows[0].target, 111);
  assert.equal(rows[0].revision, 0);
  assert.equal(rows[0].creationPayload, undefined);
});

test('creation records a zero baseline event and serializes the tracker cap', async () => {
  const input = { id: ID, title: 'DSA questions', target: 111, current: 0 };
  const { store, calls, releases } = mockStore(async (sql, values) => {
    if (/creation_payload AS/.test(sql)) return { rows: [] };
    if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '99' }] };
    if (/INSERT INTO progress_trackers/.test(sql)) {
      assert.equal(values[4], 0);
      assert.deepEqual(JSON.parse(values[9]), validateTrackerCreate(input).value);
      return { rows: [tracker({ current: '0.00' })] };
    }
    assert.match(sql, /INSERT INTO progress_events/);
    assert.match(sql, /'initial'/);
    assert.equal(values[1], ID);
    assert.equal(values[2], 0);
    return { rows: [] };
  });
  assert.equal((await store.createTracker(input)).current, 0);
  assert.match(calls[1].sql, /pg_advisory_xact_lock/);
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.equal(releases(), 1);
});

test('create retry returns latest tracker without duplicating its history', async () => {
  const input = { id: ID, title: 'DSA questions', target: 111, current: 58 };
  const { store, calls } = mockStore(async sql => {
    assert.match(sql, /creation_payload AS/);
    return { rows: [tracker({ current: '60.00', revision: '2', creationPayload: validateTrackerCreate(input).value })] };
  });
  const saved = await store.createTracker(input);
  assert.equal(saved.current, 60);
  assert.equal(saved.revision, 2);
  assert.equal(calls.some(call => /INSERT/.test(call.sql)), false);
});

test('create rejects reused id with different payload and enforces 100-tracker limit', async () => {
  const input = { id: ID, title: 'DSA questions', target: 111 };
  const duplicate = mockStore(async () => ({ rows: [tracker({ creationPayload: { ...validateTrackerCreate(input).value, target: 200 } })] }));
  await assert.rejects(duplicate.store.createTracker(input), error => hasStatus(409, 'progress_id_reused')(error) && error.details.tracker.current === 58);
  const capped = mockStore(async sql => ({ rows: /COUNT/.test(sql) ? [{ count: '100' }] : [] }));
  await assert.rejects(capped.store.createTracker(input), hasStatus(409, 'progress_limit'));
  assert.equal(capped.calls.at(-1).sql, 'ROLLBACK');
});

test('metadata update locks and checks revision while retaining current and untouched metadata', async () => {
  const { store, calls } = mockStore(async (sql, values) => {
    if (/FOR UPDATE/.test(sql)) return { rows: [tracker()] };
    assert.match(sql, /UPDATE progress_trackers/);
    assert.doesNotMatch(sql, /SET current|current = \$/);
    assert.deepEqual(values, [ID, 'New title', 'questions', 111, 1, 'bar', 'pink', '']);
    return { rows: [tracker({ title: 'New title', revision: '1' })] };
  });
  const result = await store.updateTracker(ID, { revision: 0, title: 'New title' });
  assert.equal(result.current, 58);
  assert.equal(result.revision, 1);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('stale metadata update returns authoritative tracker and writes nothing', async () => {
  const { store, calls, releases } = mockStore(async sql => {
    assert.match(sql, /FOR UPDATE/);
    return { rows: [tracker({ revision: '2' })] };
  });
  await assert.rejects(store.updateTracker(ID, { revision: 0, title: 'Stale' }), error => hasStatus(409)(error) && error.details.tracker.revision === 2);
  assert.equal(calls.some(call => /^UPDATE/.test(call.sql)), false);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.equal(releases(), 1);
});

test('increment locks the tracker and commits count plus history atomically', async () => {
  const { store, calls } = mockStore(async (sql, values) => {
    if (/FOR UPDATE/.test(sql)) return { rows: [tracker()] };
    if (/FROM progress_events/.test(sql)) return { rows: [] };
    if (/UPDATE progress_trackers/.test(sql)) {
      assert.deepEqual(values, [ID, 59]);
      assert.match(sql, /revision = revision \+ 1/);
      return { rows: [tracker({ current: '59.00', revision: '1' })] };
    }
    assert.match(sql, /INSERT INTO progress_events/);
    assert.deepEqual(values, [MUTATION_ID, ID, 'add', 1, 1, 59, '']);
    return { rows: [event()] };
  });
  const result = await store.changeTracker(ID, change());
  assert.equal(result.tracker.current, 59);
  assert.equal(result.event.delta, 1);
  assert.equal(result.event.requestedValue, undefined);
  assert.match(calls[1].sql, /pg_advisory_xact_lock/);
  assert.match(calls[2].sql, /FOR UPDATE/);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('change retry deduplicates before revision check even after later changes', async () => {
  const { store, calls } = mockStore(async sql => {
    if (/FOR UPDATE/.test(sql)) return { rows: [tracker({ current: '61.00', revision: '3' })] };
    assert.match(sql, /FROM progress_events/);
    return { rows: [event()] };
  });
  const result = await store.changeTracker(ID, change());
  assert.equal(result.tracker.current, 61);
  assert.equal(result.event.value, 59);
  assert.equal(calls.some(call => /^(UPDATE|INSERT)/.test(call.sql)), false);
});

test('mutation reuse cannot silently accept a different action, note, or tracker', async () => {
  for (const existing of [event({ requestedValue: '2.00' }), event({ note: 'Different' }), event({ kind: 'set' }), event({ trackerId: MUTATION_ID })]) {
    const { store } = mockStore(async sql => ({ rows: [/FOR UPDATE/.test(sql) ? tracker() : existing] }));
    await assert.rejects(store.changeTracker(ID, change()), hasStatus(409, 'progress_mutation_reused'));
  }
});

test('stale changes cannot overwrite another tab and return the new revision', async () => {
  const { store, calls } = mockStore(async sql => ({ rows: /FOR UPDATE/.test(sql) ? [tracker({ revision: '1', current: '59.00' })] : [] }));
  await assert.rejects(store.changeTracker(ID, change()), error => hasStatus(409)(error) && error.details.tracker.current === 59);
  assert.equal(calls.some(call => /^(UPDATE|INSERT)/.test(call.sql)), false);
});

test('concurrent changes with the same revision serialize and only one count is accepted', async () => {
  let saved = tracker();
  let lockTail = Promise.resolve();
  const events = new Map();
  let releasedClients = 0;
  const pool = {
    async connect() {
      let unlock;
      return {
        async query(sql, values) {
          if (sql === 'BEGIN' || /pg_advisory_xact_lock/.test(sql)) return { rows: [] };
          if (sql === 'COMMIT' || sql === 'ROLLBACK') {
            if (unlock) unlock();
            unlock = null;
            return { rows: [] };
          }
          if (/FOR UPDATE/.test(sql)) {
            // Model PostgreSQL's row-lock queue: the second transaction reads
            // the committed row only after the first transaction releases it.
            const previous = lockTail;
            lockTail = new Promise(resolve => { unlock = resolve; });
            await previous;
            return { rows: [{ ...saved }] };
          }
          if (/FROM progress_events/.test(sql)) return { rows: events.has(values[0]) ? [events.get(values[0])] : [] };
          if (/UPDATE progress_trackers/.test(sql)) {
            saved = { ...saved, current: String(values[1]), revision: String(Number(saved.revision) + 1) };
            return { rows: [{ ...saved }] };
          }
          assert.match(sql, /INSERT INTO progress_events/);
          const entry = event({ id: values[0], kind: values[2], requestedValue: String(values[3]), delta: String(values[4]), value: String(values[5]), note: values[6] });
          events.set(entry.id, entry);
          return { rows: [entry] };
        },
        release() { releasedClients += 1; },
      };
    },
  };
  const store = createProgressStore(pool);
  const outcomes = await Promise.allSettled([
    store.changeTracker(ID, change()),
    store.changeTracker(ID, change({ mutationId: '65bab3d8-b1c9-4418-85c4-324ce7149cab' })),
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  const rejection = outcomes.find(result => result.status === 'rejected').reason;
  assert.equal(rejection.status, 409);
  assert.equal(rejection.details.tracker.current, 59);
  assert.equal(rejection.details.tracker.revision, 1);
  assert.equal(saved.current, '59');
  assert.equal(events.size, 1);
  assert.equal(releasedClients, 2);
});

test('signed corrections and set changes record exact decimal deltas', async () => {
  for (const [current, input, expected, delta] of [
    ['0.10', change({ value: 0.2 }), 0.3, 0.2],
    ['58.25', change({ value: -0.25 }), 58, -0.25],
    ['58.25', change({ kind: 'set', value: 0 }), 0, -58.25],
    ['110.00', change({ value: 3 }), 113, 3],
  ]) {
    const { store } = mockStore(async (sql, values) => {
      if (/FOR UPDATE/.test(sql)) return { rows: [tracker({ current })] };
      if (/FROM progress_events/.test(sql)) return { rows: [] };
      if (/UPDATE progress_trackers/.test(sql)) {
        assert.equal(values[1], expected);
        return { rows: [tracker({ current: String(expected), revision: '1' })] };
      }
      assert.equal(values[4], delta);
      assert.equal(values[5], expected);
      return { rows: [event({ delta: String(delta), value: String(expected) })] };
    });
    assert.equal((await store.changeTracker(ID, input)).tracker.current, expected);
  }
});

test('changes that cross zero or numeric maximum fail before writes', async () => {
  for (const [current, value] of [['0.00', -0.01], ['1000000000.00', 0.01]]) {
    const { store, calls } = mockStore(async sql => ({ rows: /FOR UPDATE/.test(sql) ? [tracker({ current })] : [] }));
    await assert.rejects(store.changeTracker(ID, change({ value })), hasStatus(400));
    assert.equal(calls.some(call => /^(UPDATE|INSERT)/.test(call.sql)), false);
  }
});

test('a history write failure rolls back the count update and releases the client', async () => {
  const { store, calls, releases } = mockStore(async sql => {
    if (/FOR UPDATE/.test(sql)) return { rows: [tracker()] };
    if (/FROM progress_events/.test(sql)) return { rows: [] };
    if (/UPDATE progress_trackers/.test(sql)) return { rows: [tracker({ current: '59.00', revision: '1' })] };
    throw new Error('simulated event insert failure');
  });
  await assert.rejects(store.changeTracker(ID, change()), /simulated event insert failure/);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.equal(calls.some(call => call.sql === 'COMMIT'), false);
  assert.equal(releases(), 1);
});

test('delete requires current revision and deletes only the selected tracker', async () => {
  const { store, calls } = mockStore(async (sql, values) => {
    if (/FOR UPDATE/.test(sql)) return { rows: [tracker()] };
    assert.equal(sql, 'DELETE FROM progress_trackers WHERE id = $1');
    assert.deepEqual(values, [ID]);
    return { rows: [] };
  });
  assert.deepEqual(await store.deleteTracker(ID, { revision: 0 }), { ok: true });
  assert.equal(calls.at(-1).sql, 'COMMIT');
  const stale = mockStore(async () => ({ rows: [tracker({ revision: '1' })] }));
  await assert.rejects(stale.store.deleteTracker(ID, { revision: 0 }), hasStatus(409));
});

test('missing tracker is a 404 for updates, changes, delete, and history', async () => {
  const { store } = mockStore(async () => ({ rows: [] }));
  await assert.rejects(store.updateTracker(ID, { revision: 0, title: 'Gone' }), hasStatus(404));
  await assert.rejects(store.changeTracker(ID, change()), hasStatus(404));
  await assert.rejects(store.deleteTracker(ID, { revision: 0 }), hasStatus(404));
  await assert.rejects(store.listHistory(ID), hasStatus(404));
});

test('history selects latest 1000 in stable chronological order with truncation metadata', async () => {
  const { store } = mockStore(async (sql, values) => {
    if (/SELECT id FROM progress_trackers/.test(sql)) return { rows: [{ id: ID }] };
    assert.match(sql, /COUNT\(\*\) OVER \(\)/);
    assert.match(sql, /ORDER BY sequence DESC LIMIT \$4/);
    assert.match(sql, /recent ORDER BY sequence ASC/);
    assert.deepEqual(values, [ID, '2026-11-01T00:00:00.000Z', null, HISTORY_LIMIT]);
    return { rows: [event({ totalCount: '1001', sequence: '2' })] };
  });
  const history = await store.listHistory(ID, { from: '2026-11-01T00:00:00Z' });
  assert.equal(history.total, 1001);
  assert.equal(history.truncated, true);
  assert.equal(history.events[0].totalCount, undefined);
  assert.equal(history.events[0].sequence, undefined);
});

test('empty history is not reported as truncated', async () => {
  const { store } = mockStore(async sql => ({ rows: /SELECT id FROM/.test(sql) ? [{ id: ID }] : [] }));
  assert.deepEqual(await store.listHistory(ID), { events: [], total: 0, truncated: false });
});

test('invalid payloads fail before acquiring a connection or issuing SQL', async () => {
  const { store, calls } = mockStore(async () => { throw new Error('must not query'); });
  await assert.rejects(store.createTracker({}), hasStatus(400));
  await assert.rejects(store.updateTracker(ID, { revision: 0, current: 8 }), hasStatus(400));
  await assert.rejects(store.changeTracker('bad', change()), hasStatus(400));
  await assert.rejects(store.deleteTracker(ID, {}), hasStatus(400));
  await assert.rejects(store.listHistory(ID, { arbitrary: 'field' }), hasStatus(400));
  assert.equal(calls.length, 0);
});
