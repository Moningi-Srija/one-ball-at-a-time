const FOCUS_STATUSES = Object.freeze(['running', 'paused', 'finished', 'cancelled']);
const FOCUS_LEVELS = Object.freeze(['distracted', 'steady', 'deep']);
const FOCUS_STATUS_SET = new Set(FOCUS_STATUSES);
const FOCUS_LEVEL_SET = new Set(FOCUS_LEVELS);
const MAX_LABEL_LENGTH = 120;
const MAX_CATEGORY_LENGTH = 60;
const MAX_NOTE_LENGTH = 1000;
const MAX_TIME_ZONE_LENGTH = 100;
const FOCUS_MODES = Object.freeze(['stopwatch', 'countdown']);
const FOCUS_MODE_SET = new Set(FOCUS_MODES);
const MIN_PLANNED_SECONDS = 60;
const MAX_PLANNED_SECONDS = 43_200;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ID_PATTERN = /^[1-9]\d{0,18}$/;

function invalid(field, message) {
  return { ok: false, field, error: message };
}

function normalizeDate(value, field = 'date') {
  if (typeof value !== 'string') {
    return invalid(field, 'Date must use YYYY-MM-DD.');
  }

  const match = DATE_PATTERN.exec(value);
  if (!match) return invalid(field, 'Date must use YYYY-MM-DD.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return invalid(field, 'Date must be a real calendar date.');
  }

  return { ok: true, value };
}

function normalizeTimeZone(value) {
  if (typeof value !== 'string') {
    return invalid('timeZone', 'Time zone must be a valid IANA time zone.');
  }

  const timeZone = value.trim();
  if (!timeZone || timeZone.length > MAX_TIME_ZONE_LENGTH || timeZone.includes('\u0000')) {
    return invalid('timeZone', 'Time zone must be a valid IANA time zone.');
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
  } catch {
    return invalid('timeZone', 'Time zone must be a valid IANA time zone.');
  }
  return { ok: true, value: timeZone };
}

function normalizeOptionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }
  if (typeof value !== 'string') return invalid(field, `${field} must be text.`);

  const normalized = value.trim();
  if (!normalized) return { ok: true, value: null };
  if (normalized.length > maxLength) {
    return invalid(field, `${field} must be ${maxLength} characters or fewer.`);
  }
  if (normalized.includes('\u0000')) {
    return invalid(field, `${field} contains an unsupported character.`);
  }
  return { ok: true, value: normalized };
}

function normalizeFocusLevel(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }
  if (typeof value !== 'string' || !FOCUS_LEVEL_SET.has(value)) {
    return invalid('focusLevel', `focusLevel must be one of: ${FOCUS_LEVELS.join(', ')}.`);
  }
  return { ok: true, value };
}

function validateObject(payload, allowedFields, name) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return invalid(name, `${name} must be an object.`);
  }
  const unknownField = Object.keys(payload).find(key => !allowedFields.has(key));
  if (unknownField) return invalid(unknownField, `Unknown ${name} field: ${unknownField}.`);
  return { ok: true };
}

function validateFocusStart(payload) {
  const object = validateObject(
    payload,
    new Set(['date', 'timeZone', 'label', 'category', 'note', 'mode', 'plannedSeconds']),
    'focus session'
  );
  if (!object.ok) return object;

  const date = normalizeDate(payload.date);
  if (!date.ok) return date;
  const timeZone = normalizeTimeZone(payload.timeZone);
  if (!timeZone.ok) return timeZone;
  const label = normalizeOptionalText(payload.label, 'label', MAX_LABEL_LENGTH);
  if (!label.ok) return label;
  const category = normalizeOptionalText(payload.category, 'category', MAX_CATEGORY_LENGTH);
  if (!category.ok) return category;
  const note = normalizeOptionalText(payload.note, 'note', MAX_NOTE_LENGTH);
  if (!note.ok) return note;

  const mode = payload.mode === undefined ? 'stopwatch' : payload.mode;
  if (typeof mode !== 'string' || !FOCUS_MODE_SET.has(mode)) {
    return invalid('mode', `Mode must be one of: ${FOCUS_MODES.join(', ')}.`);
  }
  let plannedSeconds = null;
  if (mode === 'countdown') {
    if (
      !Number.isInteger(payload.plannedSeconds)
      || payload.plannedSeconds < MIN_PLANNED_SECONDS
      || payload.plannedSeconds > MAX_PLANNED_SECONDS
    ) {
      return invalid(
        'plannedSeconds',
        `Countdown duration must be a whole number from ${MIN_PLANNED_SECONDS} to ${MAX_PLANNED_SECONDS} seconds.`
      );
    }
    plannedSeconds = payload.plannedSeconds;
  } else if (payload.plannedSeconds !== undefined && payload.plannedSeconds !== null) {
    return invalid('plannedSeconds', 'Stopwatch sessions cannot have a countdown duration.');
  }

  return {
    ok: true,
    value: {
      date: date.value,
      timeZone: timeZone.value,
      label: label.value,
      category: category.value,
      note: note.value,
      mode,
      plannedSeconds,
    },
  };
}

function validateFocusUpdate(payload) {
  const allowedFields = new Set(['date', 'timeZone', 'label', 'category', 'note', 'focusLevel']);
  const object = validateObject(payload, allowedFields, 'focus session update');
  if (!object.ok) return object;
  if (Object.keys(payload).length === 0) {
    return invalid('focus session update', 'At least one field is required.');
  }

  const value = {};
  if (Object.hasOwn(payload, 'date')) {
    const date = normalizeDate(payload.date);
    if (!date.ok) return date;
    value.date = date.value;
  }
  if (Object.hasOwn(payload, 'timeZone')) {
    const timeZone = normalizeTimeZone(payload.timeZone);
    if (!timeZone.ok) return timeZone;
    value.timeZone = timeZone.value;
  }
  for (const [field, maxLength] of [
    ['label', MAX_LABEL_LENGTH],
    ['category', MAX_CATEGORY_LENGTH],
    ['note', MAX_NOTE_LENGTH],
  ]) {
    if (!Object.hasOwn(payload, field)) continue;
    const result = normalizeOptionalText(payload[field], field, maxLength);
    if (!result.ok) return result;
    value[field] = result.value;
  }
  if (Object.hasOwn(payload, 'focusLevel')) {
    const focusLevel = normalizeFocusLevel(payload.focusLevel);
    if (!focusLevel.ok) return focusLevel;
    value.focusLevel = focusLevel.value;
  }
  return { ok: true, value };
}

function validateFocusFinish(payload) {
  const input = payload === undefined ? {} : payload;
  const object = validateObject(input, new Set(['focusLevel', 'note']), 'focus session finish');
  if (!object.ok) return object;
  const focusLevel = normalizeFocusLevel(input.focusLevel);
  if (!focusLevel.ok) return focusLevel;
  let note;
  if (Object.hasOwn(input, 'note')) {
    const result = normalizeOptionalText(input.note, 'note', MAX_NOTE_LENGTH);
    if (!result.ok) return result;
    note = result.value;
  }
  return { ok: true, value: { focusLevel: focusLevel.value, note } };
}

function validateEmptyAction(payload, action) {
  const input = payload === undefined ? {} : payload;
  const object = validateObject(input, new Set(), `focus session ${action}`);
  if (!object.ok) return object;
  return { ok: true, value: {} };
}

function validateFocusId(value) {
  const id = String(value || '');
  if (!ID_PATTERN.test(id)) return invalid('id', 'Focus session ID is invalid.');
  try {
    if (BigInt(id) > 9_223_372_036_854_775_807n) {
      return invalid('id', 'Focus session ID is invalid.');
    }
  } catch {
    return invalid('id', 'Focus session ID is invalid.');
  }
  return { ok: true, value: id };
}

function validateFocusFilters(query) {
  const input = query || {};
  const allowedFields = new Set(['from', 'to', 'status', 'category']);
  const unknownField = Object.keys(input).find(key => !allowedFields.has(key));
  if (unknownField) return invalid(unknownField, `Unknown focus session filter: ${unknownField}.`);

  let from;
  if (input.from !== undefined && input.from !== '') {
    const result = normalizeDate(input.from, 'from');
    if (!result.ok) return result;
    from = result.value;
  }
  let to;
  if (input.to !== undefined && input.to !== '') {
    const result = normalizeDate(input.to, 'to');
    if (!result.ok) return result;
    to = result.value;
  }
  if (from && to && from > to) {
    return invalid('dateRange', 'The from date cannot be after the to date.');
  }

  let status;
  if (input.status !== undefined && input.status !== '') {
    if (typeof input.status !== 'string' || !FOCUS_STATUS_SET.has(input.status)) {
      return invalid('status', `Status must be one of: ${FOCUS_STATUSES.join(', ')}.`);
    }
    status = input.status;
  }

  let category;
  if (input.category !== undefined && input.category !== '') {
    const result = normalizeOptionalText(input.category, 'category', MAX_CATEGORY_LENGTH);
    if (!result.ok) return result;
    category = result.value;
  }

  return { ok: true, value: { from, to, status, category } };
}

module.exports = {
  FOCUS_MODES,
  FOCUS_LEVELS,
  FOCUS_STATUSES,
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
};
