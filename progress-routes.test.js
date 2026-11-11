const test = require('node:test');
const assert = require('node:assert/strict');
const { registerProgressRoutes } = require('./progress-routes');
const { ProgressError } = require('./progress-store');

function routes(store) {
  const registered = [];
  const app = {};
  for (const method of ['get', 'post', 'patch', 'delete']) {
    app[method] = (path, ...handlers) => registered.push({ method, path, handlers });
  }
  const requireAuth = (_req, _res, next) => next();
  registerProgressRoutes(app, requireAuth, store);
  return { registered, requireAuth };
}
function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('every progress endpoint installs authentication before its handler', () => {
  const { registered, requireAuth } = routes({});
  assert.equal(registered.length, 6);
  for (const route of registered) {
    assert.equal(route.handlers.length, 2);
    assert.equal(route.handlers[0], requireAuth, `${route.method} ${route.path}`);
  }
});

test('routes preserve request bodies and wrap only the expected responses', async () => {
  const calls = [];
  const tracker = { id: 'test' };
  const event = { id: 'event' };
  const store = {
    listTrackers: async () => [tracker],
    createTracker: async body => { calls.push(['create', body]); return tracker; },
    updateTracker: async (id, body) => { calls.push(['update', id, body]); return tracker; },
    changeTracker: async (id, body) => { calls.push(['change', id, body]); return { tracker, event }; },
    deleteTracker: async (id, body) => { calls.push(['delete', id, body]); return { ok: true }; },
    listHistory: async (id, query) => { calls.push(['history', id, query]); return { events: [event], total: 1, truncated: false }; },
  };
  const { registered } = routes(store);
  const expected = [{ trackers: [tracker] }, { tracker }, { tracker }, { tracker, event }, { ok: true }, { events: [event], total: 1, truncated: false }];
  for (let index = 0; index < registered.length; index += 1) {
    const res = response();
    await registered[index].handlers[1]({ params: { id: 'test' }, body: { revision: 0 }, query: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, expected[index]);
  }
  assert.deepEqual(calls[0], ['create', { revision: 0 }]);
  assert.deepEqual(calls[3], ['delete', 'test', { revision: 0 }]);
  assert.deepEqual(calls[4], ['history', 'test', {}]);
});

test('expected validation, missing, and conflict errors use distinct HTTP statuses', async () => {
  for (const status of [400, 404, 409]) {
    const tracker = { id: 'test', revision: 2 };
    const { registered } = routes({ listTrackers: async () => { throw new ProgressError(status, 'example', 'Useful message', { tracker }); } });
    const res = response();
    await registered[0].handlers[1]({}, res);
    assert.equal(res.statusCode, status);
    assert.deepEqual(res.body, { error: 'example', message: 'Useful message', tracker });
  }
});

test('unexpected failures return 500 without leaking database details', async t => {
  t.mock.method(console, 'error', () => {});
  const { registered } = routes({ listTrackers: async () => { throw new Error('private database connection details'); } });
  const res = response();
  await registered[0].handlers[1]({}, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'progress_request_failed');
  assert.doesNotMatch(JSON.stringify(res.body), /private database/);
});
