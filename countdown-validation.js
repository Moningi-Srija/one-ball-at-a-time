const MAX_COUNTDOWNS = 100;
const MAX_EPOCH_MS = 8_640_000_000_000_000;
const COUNTDOWN_STYLES = new Set(['ball-ring', 'court-grid', 'clean-bar']);
const SAFE_COLOR = /^#[0-9a-fA-F]{6}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MULTILINE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function fail(error) {
  return { ok: false, error };
}

function readString(value, field, { required = true, maxLength, multiline = false }) {
  if (typeof value !== 'string') {
    return fail(`${field} must be a string`);
  }

  const normalized = value.trim();
  if (required && normalized.length === 0) {
    return fail(`${field} is required`);
  }
  if (normalized.length > maxLength) {
    return fail(`${field} is too long`);
  }
  const invalidCharacters = multiline ? MULTILINE_CONTROL_CHARACTERS : CONTROL_CHARACTERS;
  if (invalidCharacters.test(normalized)) {
    return fail(`${field} contains invalid characters`);
  }

  return { ok: true, value: normalized };
}

function readEpoch(value, field) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_EPOCH_MS) {
    return fail(`${field} must be a valid epoch-millisecond timestamp`);
  }
  return { ok: true, value };
}

function validateCountdowns(payload) {
  if (!Array.isArray(payload)) {
    return fail('countdowns must be an array');
  }
  if (payload.length > MAX_COUNTDOWNS) {
    return fail(`countdowns cannot contain more than ${MAX_COUNTDOWNS} items`);
  }

  const ids = new Set();
  const countdowns = [];

  for (let index = 0; index < payload.length; index += 1) {
    const input = payload[index];
    const prefix = `countdowns[${index}]`;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return fail(`${prefix} must be an object`);
    }

    const id = readString(input.id, `${prefix}.id`, { maxLength: 100 });
    if (!id.ok) return id;
    if (ids.has(id.value)) return fail(`${prefix}.id must be unique`);
    ids.add(id.value);

    const title = readString(input.title, `${prefix}.title`, { maxLength: 120 });
    if (!title.ok) return title;

    const note = readString(input.note ?? '', `${prefix}.note`, {
      required: false,
      maxLength: 500,
      multiline: true,
    });
    if (!note.ok) return note;

    const emoji = readString(input.emoji ?? '', `${prefix}.emoji`, {
      required: false,
      maxLength: 24,
    });
    if (!emoji.ok) return emoji;

    if (typeof input.color !== 'string' || !SAFE_COLOR.test(input.color)) {
      return fail(`${prefix}.color must be a six-digit hex color`);
    }
    const color = input.color.toLowerCase();

    if (typeof input.style !== 'string' || !COUNTDOWN_STYLES.has(input.style)) {
      return fail(`${prefix}.style is invalid`);
    }

    const startAt = readEpoch(input.startAt, `${prefix}.startAt`);
    if (!startAt.ok) return startAt;
    const targetAt = readEpoch(input.targetAt, `${prefix}.targetAt`);
    if (!targetAt.ok) return targetAt;
    const createdAt = readEpoch(input.createdAt, `${prefix}.createdAt`);
    if (!createdAt.ok) return createdAt;
    if (targetAt.value <= startAt.value) {
      return fail(`${prefix}.targetAt must be after startAt`);
    }

    countdowns.push({
      id: id.value,
      title: title.value,
      note: note.value,
      emoji: emoji.value,
      color,
      style: input.style,
      startAt: startAt.value,
      targetAt: targetAt.value,
      createdAt: createdAt.value,
    });
  }

  return { ok: true, value: countdowns };
}

module.exports = {
  COUNTDOWN_STYLES,
  MAX_COUNTDOWNS,
  validateCountdowns,
};
