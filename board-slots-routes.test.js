const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { validateSettings } = require('./board-slots');

// Execute the actual route and auth middleware without booting Express, reading
// .env, opening a listener, or connecting to a real database.
const source = fs.readFileSync(require.resolve('./server'), 'utf8');
const auth = source.slice(source.indexOf('function requireAuth('), source.indexOf("app.post('/api/login'"));
const route = source.slice(source.indexOf("app.put('/api/slot-settings'"), source.indexOf("app.put('/api/reminders'"));

function handlers(save) {
  let registered;
  const context = {
    app: { put(path, ...callbacks) { registered = { path, callbacks }; } },
    validateSlotSettings: validateSettings,
    db: { compareAndSetSlotSettings: save },
    console: { error() {} },
  };
  vm.runInNewContext(auth + route, context);
  assert.equal(registered?.path, '/api/slot-settings');
  assert.equal(registered.callbacks.length, 2);
  return registered.callbacks;
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  };
}

test('slot settings require authentication before validation or save', () => {
  let continued = false;
  const [authorize] = handlers(() => { throw new Error('must not save'); });
  const res = response();
  authorize({ session: {} }, res, () => { continued = true; });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'unauthorized' });
  assert.equal(continued, false);
  authorize({ session: { authed: true } }, response(), () => { continued = true; });
  assert.equal(continued, true);
});

test('slot settings validate before saving and return the incremented settings', async () => {
  const value = { revision: 2, bodyLocked: false, careerLocked: true };
  const [, save] = handlers(async (revision, settings) => {
    assert.equal(revision, 2);
    assert.deepEqual(settings, value);
    return { ok: true, value: { ...value, revision: 3 } };
  });
  const res = response();
  await save({ body: value }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { slotSettings: { ...value, revision: 3 } });
});

test('invalid slot settings return 400 without any database call', async () => {
  let calls = 0;
  const [, save] = handlers(async () => { calls += 1; });
  for (const body of [null, {}, { revision: 0, bodyLocked: 'no', careerLocked: true }]) {
    const res = response();
    await save({ body }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'invalid_slot_settings');
  }
  assert.equal(calls, 0);
});

test('conflicting slot settings return the current version for safe retry', async () => {
  const current = { revision: 7, bodyLocked: false, careerLocked: false };
  const [, save] = handlers(async () => ({ ok: false, current }));
  const res = response();
  await save({ body: { revision: 2, bodyLocked: true, careerLocked: true } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'slot_settings_conflict');
  assert.deepEqual(res.body.slotSettings, current);
});

test('slot settings database errors do not expose internal details', async () => {
  const [, save] = handlers(async () => { throw new Error('private database credentials'); });
  const res = response();
  await save({ body: { revision: 0, bodyLocked: true, careerLocked: false } }, res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'failed_to_save_slot_settings' });
});

test('the browser helper has an explicit static route', () => {
  assert.match(source, /app\.get\('\/board-slots\.js', \(req, res\) => res\.sendFile\(path\.join\(__dirname, 'board-slots\.js'\)\)\)/);
});
