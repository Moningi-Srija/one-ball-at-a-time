(function attachProgressLogic(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ProgressLogic = api;
})(typeof window !== 'undefined' ? window : null, function createProgressLogic() {
  const MAX_QUANTITY = 1_000_000_000;
  const MAX_TRACKERS = 100;
  const MAX_TITLE_LENGTH = 120;
  const MAX_UNIT_LENGTH = 40;
  const MAX_NOTE_LENGTH = 1000;
  const STYLES = ['bar', 'ring', 'dots'];
  const COLORS = ['pink', 'lilac', 'mint', 'blue', 'butter'];
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const META_KEYS = ['title', 'unit', 'target', 'step', 'style', 'color', 'note'];
  const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
  const UNSAFE_NOTE_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

  function invalid(field, error) { return { ok: false, field, error }; }
  function roundQuantity(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
  function percentage(current, target) {
    return Number.isFinite(current) && Number.isFinite(target) && target > 0
      ? Math.max(0, current / target * 100) : 0;
  }
  function clampedPercentage(current, target) { return Math.min(100, percentage(current, target)); }

  function validateObject(payload, keys) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return invalid('payload', 'Progress data must be an object.');
    }
    const unknown = Object.keys(payload).find(key => !keys.includes(key));
    return unknown ? invalid(unknown, `Unknown progress field: ${unknown}.`) : null;
  }

  function validateTrackerId(id) {
    return typeof id === 'string' && UUID_PATTERN.test(id)
      ? { ok: true, value: id.toLowerCase() }
      : invalid('id', 'Use a valid UUID for the tracker id.');
  }

  function validateQuantity(value, field, { positive = false, signed = false } = {}) {
    if (typeof value !== 'number' || !Number.isFinite(value)
      || value > MAX_QUANTITY || value < (signed ? -MAX_QUANTITY : 0)
      || (positive && value <= 0) || Number(value.toFixed(2)) !== value) {
      return invalid(field, `${field} must be ${positive ? 'positive' : signed ? 'a number' : 'nonnegative'}, at most ${MAX_QUANTITY}, with at most two decimal places.`);
    }
    return { ok: true, value: Object.is(value, -0) ? 0 : value };
  }

  function validateRevision(revision) {
    return Number.isSafeInteger(revision) && revision >= 0 && revision < Number.MAX_SAFE_INTEGER
      ? { ok: true, value: revision }
      : invalid('revision', 'Use a nonnegative safe revision number that can be advanced.');
  }

  function validateText(value, field, maxLength, required = false) {
    if (typeof value !== 'string') return invalid(field, `${field} must be text.`);
    const text = value.trim();
    const unsafe = field === 'note' ? UNSAFE_NOTE_CHARACTERS : CONTROL_CHARACTERS;
    if ((required && !text) || text.length > maxLength || unsafe.test(text)) {
      return invalid(field, `${field} must contain ${required ? '1' : '0'} to ${maxLength} characters without unsafe control characters.`);
    }
    return { ok: true, value: text };
  }

  function validateMetadata(payload, partial) {
    const value = {};
    for (const field of META_KEYS) {
      if (partial && !Object.hasOwn(payload, field)) continue;
      let result;
      const input = payload[field];
      if (field === 'title') result = validateText(input, field, MAX_TITLE_LENGTH, true);
      if (field === 'unit') result = validateText(input === undefined ? '' : input, field, MAX_UNIT_LENGTH);
      if (field === 'note') result = validateText(input === undefined ? '' : input, field, MAX_NOTE_LENGTH);
      if (field === 'target' || field === 'step') {
        result = validateQuantity(field === 'step' && input === undefined ? 1 : input, field, { positive: true });
      }
      if (field === 'style' || field === 'color') {
        const choices = field === 'style' ? STYLES : COLORS;
        const selected = input === undefined ? choices[0] : input;
        result = choices.includes(selected) ? { ok: true, value: selected }
          : invalid(field, `Choose one of: ${choices.join(', ')}.`);
      }
      if (!result.ok) return result;
      value[field] = result.value;
    }
    return { ok: true, value };
  }

  function validateTrackerCreate(payload) {
    const shape = validateObject(payload, ['id', 'current', ...META_KEYS]);
    if (shape) return shape;
    const id = validateTrackerId(payload.id);
    if (!id.ok) return id;
    const metadata = validateMetadata(payload, false);
    if (!metadata.ok) return metadata;
    const current = validateQuantity(payload.current === undefined ? 0 : payload.current, 'current');
    if (!current.ok) return current;
    return { ok: true, value: { id: id.value, ...metadata.value, current: current.value } };
  }

  function validateTrackerUpdate(payload) {
    const shape = validateObject(payload, ['revision', ...META_KEYS]);
    if (shape) return shape;
    const revision = validateRevision(payload.revision);
    if (!revision.ok) return revision;
    if (!META_KEYS.some(key => Object.hasOwn(payload, key))) return invalid('payload', 'Choose at least one detail to update.');
    const metadata = validateMetadata(payload, true);
    return metadata.ok ? { ok: true, value: { revision: revision.value, ...metadata.value } } : metadata;
  }

  function validateTrackerChange(payload) {
    const shape = validateObject(payload, ['mutationId', 'revision', 'kind', 'value', 'note']);
    if (shape) return shape;
    const mutationId = validateTrackerId(payload.mutationId);
    if (!mutationId.ok) return invalid('mutationId', 'Use a valid UUID for the change id.');
    const revision = validateRevision(payload.revision);
    if (!revision.ok) return revision;
    if (!['add', 'set'].includes(payload.kind)) return invalid('kind', 'Choose add or set.');
    const quantity = validateQuantity(payload.value, 'value', { signed: payload.kind === 'add' });
    if (!quantity.ok) return quantity;
    const note = validateText(payload.note === undefined ? '' : payload.note, 'note', MAX_NOTE_LENGTH);
    if (!note.ok) return note;
    return { ok: true, value: {
      mutationId: mutationId.value, revision: revision.value, kind: payload.kind,
      value: quantity.value, note: note.value,
    } };
  }

  function validateTrackerDelete(payload) {
    const shape = validateObject(payload, ['revision']);
    if (shape) return shape;
    const revision = validateRevision(payload.revision);
    return revision.ok ? { ok: true, value: { revision: revision.value } } : revision;
  }

  function validateHistoryFilters(payload = {}) {
    const shape = validateObject(payload, ['from', 'to']);
    if (shape) return shape;
    const value = {};
    for (const field of ['from', 'to']) {
      if (!Object.hasOwn(payload, field)) continue;
      const input = payload[field];
      if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input)) {
        return invalid(field, 'History boundaries must be UTC ISO timestamps.');
      }
      const date = new Date(input);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== input.slice(0, 19)) {
        return invalid(field, 'History boundaries must be valid timestamps.');
      }
      value[field] = date.toISOString();
    }
    if (value.from && value.to && value.from > value.to) return invalid('to', 'History end cannot be before its start.');
    return { ok: true, value };
  }

  return {
    MAX_QUANTITY, MAX_TRACKERS, MAX_TITLE_LENGTH, MAX_UNIT_LENGTH, MAX_NOTE_LENGTH,
    STYLES, COLORS, roundQuantity, percentage, clampedPercentage,
    validateQuantity, validateTrackerId, validateTrackerCreate, validateTrackerUpdate,
    validateTrackerChange, validateTrackerDelete, validateHistoryFilters,
  };
});
