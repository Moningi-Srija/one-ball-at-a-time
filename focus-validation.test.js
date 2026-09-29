const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CATEGORY_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PLANNED_SECONDS,
  MIN_PLANNED_SECONDS,
  validateEmptyAction,
  validateFocusFilters,
  validateFocusFinish,
  validateFocusId,
  validateFocusStart,
  validateFocusUpdate,
} = require('./focus-validation');

function validStart(overrides = {}) {
  return {
    date: '2026-09-30',
    timeZone: 'Asia/Kolkata',
    label: 'DSA practice',
    category: 'Quant Dev',
    note: 'Start before I feel ready',
    ...overrides,
  };
}

test('validates and normalizes a stopwatch focus session', () => {
  const result = validateFocusStart(validStart({ label: '  DSA practice  ', note: '' }));
  assert.deepEqual(result, {
    ok: true,
    value: {
      date: '2026-09-30',
      timeZone: 'Asia/Kolkata',
      label: 'DSA practice',
      category: 'Quant Dev',
      note: null,
      mode: 'stopwatch',
      plannedSeconds: null,
    },
  });
});

test('validates countdown bounds in whole seconds', () => {
  for (const plannedSeconds of [MIN_PLANNED_SECONDS, 1500, MAX_PLANNED_SECONDS]) {
    const result = validateFocusStart(validStart({ mode: 'countdown', plannedSeconds }));
    assert.equal(result.ok, true, String(plannedSeconds));
    assert.equal(result.value.plannedSeconds, plannedSeconds);
  }
  for (const plannedSeconds of [59, 60.5, 43_201, '1500', null]) {
    assert.equal(
      validateFocusStart(validStart({ mode: 'countdown', plannedSeconds })).ok,
      false,
      String(plannedSeconds)
    );
  }
  assert.equal(validateFocusStart(validStart({ plannedSeconds: 120 })).ok, false);
});

test('requires a real date and valid IANA time zone', () => {
  assert.equal(validateFocusStart(validStart({ date: '2026-02-28' })).ok, true);
  for (const date of ['2026-02-30', '30-09-2026', '', null]) {
    assert.equal(validateFocusStart(validStart({ date })).ok, false, String(date));
  }
  assert.equal(validateFocusStart(validStart({ timeZone: 'America/New_York' })).ok, true);
  for (const timeZone of ['Mars/Olympus', '', null, ['Asia/Kolkata']]) {
    assert.equal(validateFocusStart(validStart({ timeZone })).ok, false, String(timeZone));
  }
});

test('allows optional metadata while enforcing text and payload limits', () => {
  assert.equal(validateFocusStart(validStart({ label: null, category: '', note: undefined })).ok, true);
  assert.equal(validateFocusStart(validStart({ label: 'x'.repeat(MAX_LABEL_LENGTH) })).ok, true);
  assert.equal(validateFocusStart(validStart({ label: 'x'.repeat(MAX_LABEL_LENGTH + 1) })).ok, false);
  assert.equal(validateFocusStart(validStart({ category: 'x'.repeat(MAX_CATEGORY_LENGTH + 1) })).ok, false);
  assert.equal(validateFocusStart(validStart({ note: 'x'.repeat(MAX_NOTE_LENGTH + 1) })).ok, false);
  assert.equal(validateFocusStart(validStart({ note: 'bad\u0000note' })).ok, false);
  assert.equal(validateFocusStart(validStart({ elapsedSeconds: 100 })).ok, false);
  assert.equal(validateFocusStart([]).ok, false);
});

test('validates partial metadata updates and optional finished focus level', () => {
  assert.deepEqual(validateFocusUpdate({ focusLevel: 'deep', note: '  Solid work  ' }), {
    ok: true,
    value: { note: 'Solid work', focusLevel: 'deep' },
  });
  assert.equal(validateFocusUpdate({ focusLevel: null }).ok, true);
  assert.equal(validateFocusUpdate({ focusLevel: 'perfect' }).ok, false);
  assert.equal(validateFocusUpdate({}).ok, false);
  assert.equal(validateFocusUpdate({ status: 'finished' }).ok, false);

  assert.deepEqual(validateFocusFinish(undefined), {
    ok: true,
    value: { focusLevel: null, note: undefined },
  });
  assert.deepEqual(validateFocusFinish({ focusLevel: 'steady', note: '  Finished the hard part  ' }), {
    ok: true,
    value: { focusLevel: 'steady', note: 'Finished the hard part' },
  });
  assert.equal(validateFocusFinish({ note: 'x'.repeat(MAX_NOTE_LENGTH + 1) }).ok, false);
  assert.equal(validateFocusFinish({ label: 'not accepted here' }).ok, false);
});

test('accepts only empty pause, resume, and cancel payloads', () => {
  assert.equal(validateEmptyAction(undefined, 'pause').ok, true);
  assert.equal(validateEmptyAction({}, 'resume').ok, true);
  assert.equal(validateEmptyAction({ force: true }, 'cancel').ok, false);
});

test('validates bigint ids without precision loss', () => {
  assert.deepEqual(validateFocusId('9223372036854775807'), {
    ok: true,
    value: '9223372036854775807',
  });
  for (const id of ['0', '-1', '1.5', 'abc', '9223372036854775808']) {
    assert.equal(validateFocusId(id).ok, false, id);
  }
});

test('validates focus session list filters strictly', () => {
  assert.deepEqual(validateFocusFilters({
    from: '2026-09-01',
    to: '2026-09-30',
    status: 'finished',
    category: 'Quant Dev',
  }), {
    ok: true,
    value: {
      from: '2026-09-01',
      to: '2026-09-30',
      status: 'finished',
      category: 'Quant Dev',
    },
  });
  assert.equal(validateFocusFilters({ from: '2026-10-01', to: '2026-09-30' }).ok, false);
  assert.equal(validateFocusFilters({ status: 'complete' }).ok, false);
  assert.equal(validateFocusFilters({ status: ['finished', 'cancelled'] }).ok, false);
  assert.equal(validateFocusFilters({ limit: '10' }).ok, false);
});
