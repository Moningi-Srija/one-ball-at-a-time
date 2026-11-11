const test = require('node:test');
const assert = require('node:assert/strict');
const { createDemoStore, dailyChanges, DEMO_KEY } = require('./progress');

function setup() {
  let sequence = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const now = () => new Date(2026, 10, 11, 12).toISOString();
  const store = createDemoStore(storage, uuid, now);
  const list = async () => (await store.request('/api/progress')).trackers;
  const history = async id => (await store.request(`/api/progress/${id}/history`)).events;
  const change = (tracker, value = 1, options = {}) => {
    const body = { mutationId: uuid(), revision: tracker.revision, kind: 'add', value, ...options };
    return store.request(`/api/progress/${tracker.id}/changes`, { method: 'POST', body });
  };
  return { store, storage, uuid, list, history, change };
}

function newGoal(uuid, options = {}) {
  return { id: uuid(), title: 'Read a little', unit: 'chapters', current: 2, target: 12, step: 1, style: 'bar', color: 'mint', note: '', ...options };
}

const at = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour).toISOString();
const today = new Date(2026, 10, 11, 12);
const event = (createdAt, delta, kind = 'add') => ({ createdAt, delta, kind });

test('demo seeds sample goals and +1 persists a dated event without touching the baseline', async () => {
  const { list, change, history, storage, uuid } = setup();
  const trackers = await list();
  assert.equal(trackers.length, 2);
  const original = trackers[0];
  assert.equal(original.current, 58);
  assert.equal(original.target, 111);
  const result = await change(original);
  assert.equal(result.tracker.current, 59);
  assert.equal(result.tracker.revision, 1);
  assert.equal(result.event.delta, 1);
  assert.equal(result.event.value, 59);
  assert.equal(result.event.trackerId, original.id);
  assert.equal(result.event.kind, 'add');
  const events = await history(original.id);
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, 'initial');
  assert.equal(events[0].value, 58);
  assert.equal(events[0].delta, 58);
  const reloaded = createDemoStore(storage, uuid);
  assert.equal((await reloaded.request('/api/progress')).trackers[0].current, 59);
  assert.equal(dailyChanges(events, '7', today).days.at(-1).delta, 1);
});

test('decimal adds and absolute corrections preserve two decimal places and signed deltas', async () => {
  const { list, change, history } = setup();
  let tracker = (await list())[0];
  tracker = (await change(tracker, 0.1)).tracker;
  tracker = (await change(tracker, 0.2)).tracker;
  assert.equal(tracker.current, 58.3);
  const corrected = await change(tracker, 55.25, { kind: 'set', note: 'Corrected an earlier entry' });
  assert.equal(corrected.tracker.current, 55.25);
  assert.equal(corrected.event.delta, -3.05);
  assert.equal(corrected.event.note, 'Corrected an earlier entry');
  const events = await history(tracker.id);
  assert.equal(dailyChanges(events, '7', today).days.at(-1).delta, -2.75);
  await assert.rejects(change(corrected.tracker, -100), error => error.status === 400);
  assert.equal((await list())[0].current, 55.25);
});

test('stale revisions reject changes, metadata edits and deletion with latest tracker', async () => {
  const { list, change, store, uuid } = setup();
  const original = (await list())[0];
  await change(original);
  const requests = [
    [`/api/progress/${original.id}/changes`, { method: 'POST', body: { mutationId: uuid(), revision: 0, kind: 'add', value: 1 } }],
    [`/api/progress/${original.id}`, { method: 'PATCH', body: { revision: 0, title: 'A new title' } }],
    [`/api/progress/${original.id}`, { method: 'DELETE', body: { revision: 0 } }],
  ];
  for (const [url, options] of requests) {
    await assert.rejects(store.request(url, options), error => error.status === 409 && error.payload.tracker.current === 59 && error.payload.tracker.revision === 1);
  }
  assert.equal((await list())[0].current, 59);
});

test('same mutation retry is idempotent even after a subsequent change', async () => {
  const { list, change, history, uuid } = setup();
  const original = (await list())[0];
  const mutationId = uuid();
  const first = await change(original, 1, { mutationId, note: 'One question' });
  const later = await change(first.tracker, 1);
  const retry = await change(original, 1, { mutationId, note: 'One question' });
  assert.equal(retry.tracker.current, later.tracker.current);
  assert.equal(retry.tracker.revision, 2);
  assert.equal(retry.event.id, first.event.id);
  assert.equal(retry.event.value, 59);
  assert.equal((await history(original.id)).length, 3);
});

test('reusing a mutation id for a different payload or tracker is a conflict', async () => {
  const { list, change, history, uuid } = setup();
  const [first, second] = await list();
  const mutationId = uuid();
  const saved = await change(first, 1, { mutationId, note: 'Original' });
  for (const options of [
    { kind: 'add', value: 2, note: 'Original' },
    { kind: 'set', value: 1, note: 'Original' },
    { kind: 'add', value: 1, note: 'Different note' },
  ]) {
    await assert.rejects(change(saved.tracker, options.value, { ...options, mutationId }), error => error.status === 409);
  }
  await assert.rejects(change(second, 1, { mutationId, note: 'Original' }), error => error.status === 409);
  assert.equal((await history(first.id)).length, 2);
  assert.equal((await history(second.id)).length, 1);
});

test('create retries keep one tracker and baseline, including after later progress changes', async () => {
  const { list, store, uuid, change, history } = setup();
  const initialCount = (await list()).length;
  const body = newGoal(uuid);
  const create = () => store.request('/api/progress', { method: 'POST', body });
  const first = await create();
  const retry = await create();
  assert.equal(retry.tracker.id, first.tracker.id);
  const updated = await change(first.tracker);
  assert.equal((await create()).tracker.current, updated.tracker.current);
  assert.equal((await list()).length, initialCount + 1);
  assert.equal((await history(body.id)).filter(item => item.kind === 'initial').length, 1);
});

test('create rejects a reused id with different original details', async () => {
  const { store, uuid, list } = setup();
  const body = newGoal(uuid);
  await store.request('/api/progress', { method: 'POST', body });
  await assert.rejects(store.request('/api/progress', { method: 'POST', body: { ...body, title: 'Different goal' } }), error => error.status === 409);
  assert.equal((await list()).find(item => item.id === body.id).title, 'Read a little');
});

test('metadata edits preserve count and history while advancing revision', async () => {
  const { list, store, history } = setup();
  const original = (await list())[0];
  const result = await store.request(`/api/progress/${original.id}`, { method: 'PATCH', body: { revision: original.revision, title: 'Small steps', style: 'dots', target: 120, step: 0.5 } });
  assert.equal(result.tracker.current, 58);
  assert.equal(result.tracker.revision, 1);
  assert.equal(result.tracker.target, 120);
  assert.equal(result.tracker.step, 0.5);
  assert.equal(result.tracker.style, 'dots');
  assert.equal((await history(original.id)).length, 1);
});

test('deletion removes only the chosen tracker and all of its events', async () => {
  const { list, store, change, storage } = setup();
  const [first, second] = await list();
  const saved = await change(first);
  const result = await store.request(`/api/progress/${first.id}`, { method: 'DELETE', body: { revision: saved.tracker.revision } });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual((await list()).map(item => item.id), [second.id]);
  const state = JSON.parse(storage.getItem(DEMO_KEY));
  assert.equal(state.events.some(item => item.trackerId === first.id), false);
  assert.equal(state.events.some(item => item.trackerId === second.id), true);
  await assert.rejects(store.request(`/api/progress/${first.id}/history`), error => error.status === 404);
});

test('storage failure never reports a change saved and retry applies it exactly once', async () => {
  const { list, storage, change, uuid, history } = setup();
  const original = (await list())[0];
  const before = storage.getItem(DEMO_KEY);
  const write = storage.setItem;
  storage.setItem = () => { throw new Error('Storage quota exceeded'); };
  const mutationId = uuid();
  await assert.rejects(change(original, 1, { mutationId }), /Storage quota exceeded/);
  assert.equal(storage.getItem(DEMO_KEY), before);
  assert.equal((await list())[0].current, 58);
  storage.setItem = write;
  await change(original, 1, { mutationId });
  await change(original, 1, { mutationId });
  assert.equal((await list())[0].current, 59);
  assert.equal((await history(original.id)).length, 2);
});

test('storage failures also reject creation and deletion without partial persistence', async () => {
  const { list, store, storage, uuid } = setup();
  const first = (await list())[0];
  const before = storage.getItem(DEMO_KEY);
  const write = storage.setItem;
  storage.setItem = () => { throw new Error('Write denied'); };
  const body = newGoal(uuid);
  await assert.rejects(store.request('/api/progress', { method: 'POST', body }), /Write denied/);
  await assert.rejects(store.request(`/api/progress/${first.id}`, { method: 'DELETE', body: { revision: first.revision } }), /Write denied/);
  assert.equal(storage.getItem(DEMO_KEY), before);
  storage.setItem = write;
  await store.request('/api/progress', { method: 'POST', body });
  assert.equal((await list()).filter(item => item.id === body.id).length, 1);
});

test('unavailable or corrupt local storage fails visibly; reset is scoped to progress', async () => {
  const { store, storage } = setup();
  storage.setItem('unrelated', 'keep me');
  storage.setItem(DEMO_KEY, '{broken');
  await assert.rejects(store.request('/api/progress'));
  store.reset();
  assert.equal(storage.getItem(DEMO_KEY), null);
  assert.equal(storage.getItem('unrelated'), 'keep me');
  storage.getItem = () => { throw new Error('Read denied'); };
  await assert.rejects(store.request('/api/progress'), /Read denied/);
});

test('history returns latest 1000 events with an accurate truncation notice', async () => {
  const { list, storage, store, uuid } = setup();
  const first = (await list())[0];
  const state = JSON.parse(storage.getItem(DEMO_KEY));
  for (let i = 0; i < 1001; i++) state.events.push({ id: uuid(), trackerId: first.id, kind: 'add', delta: 1, value: 59 + i, note: '', createdAt: at(2026, 11, 11) });
  storage.setItem(DEMO_KEY, JSON.stringify(state));
  const history = await store.request(`/api/progress/${first.id}/history`);
  assert.equal(history.total, 1002);
  assert.equal(history.events.length, 1000);
  assert.equal(history.truncated, true);
  assert.equal(history.events[0].value, 60);
  assert.equal(history.events.at(-1).value, 1059);
});

test('daily chart excludes baseline, includes signed corrections and zero-fills dates', () => {
  const data = dailyChanges([
    event(at(2026, 11, 5), 58, 'initial'),
    event(at(2026, 11, 5), 1),
    event(at(2026, 11, 6), 0.1),
    event(at(2026, 11, 6), 0.2),
    event(at(2026, 11, 11), -3.05, 'set'),
  ], '7', today);
  assert.equal(data.days.length, 7);
  assert.equal(data.days[0].date, '2026-11-05');
  assert.equal(data.days.at(-1).date, '2026-11-11');
  assert.deepEqual(data.days.map(item => item.delta), [1, 0.3, 0, 0, 0, 0, -3.05]);
  assert.equal(data.capped, false);
});

test('daily date ranges use local calendar days, ignoring outside dates and invalid timestamps', () => {
  const events = [
    event(at(2026, 11, 4, 23), 50),
    event(at(2026, 11, 5, 0), 2),
    event(at(2026, 11, 11, 23), 3),
    event(at(2026, 11, 12, 0), 100),
    event('not-a-date', 900),
  ];
  const week = dailyChanges(events, '7', today);
  assert.equal(week.days.reduce((sum, day) => sum + day.delta, 0), 5);
  assert.equal(week.days[0].delta, 2);
  assert.equal(week.days.at(-1).delta, 3);
  const month = dailyChanges(events, '30', today);
  assert.equal(month.days.length, 30);
  assert.equal(month.days[0].date, '2026-10-13');
  assert.equal(month.days.reduce((sum, day) => sum + day.delta, 0), 55);
});

test('all-time range starts on the earliest recorded local day and is capped at 3660 days', () => {
  const all = dailyChanges([event(at(2026, 11, 8), 58, 'initial'), event(at(2026, 11, 11), 1)], 'all', today);
  assert.equal(all.days.length, 4);
  assert.equal(all.days[0].date, '2026-11-08');
  assert.deepEqual(all.days.map(day => day.delta), [0, 0, 0, 1]);
  const capped = dailyChanges([event(at(2000, 1, 1), 20, 'initial'), event(at(2026, 11, 11), 1)], 'all', today);
  assert.equal(capped.capped, true);
  assert.equal(capped.days.length, 3660);
  assert.equal(capped.days.at(-1).delta, 1);
  const empty = dailyChanges([], 'all', today);
  assert.equal(empty.days.length, 30);
  assert.ok(empty.days.every(day => day.delta === 0));
});
