(function attachNotesLogic(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NotesToSelf = api;
})(typeof window !== 'undefined' ? window : null, function createNotesLogic() {
  const MAX_NOTES = 30;
  const MAX_TEXT_LENGTH = 200;
  const MAX_ID_LENGTH = 100;
  const MAX_EPOCH_MS = 8_640_000_000_000_000;
  const COLORS = ['pink', 'butter', 'lilac'];
  const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
  const UNSAFE_TEXT_CHARACTERS = /[\u0000-\u0009\u000b-\u001f\u007f]/;
  const STATE_KEYS = new Set(['revision', 'notes']);
  const NOTE_KEYS = new Set(['id', 'text', 'color', 'pinned', 'createdAt']);

  function defaultReminders(now = Date.now()) {
    const createdAt = now instanceof Date ? now.getTime() : Number(now);
    if (!Number.isSafeInteger(createdAt) || createdAt < 0 || createdAt > MAX_EPOCH_MS) {
      throw new TypeError('now must be a valid epoch-millisecond timestamp.');
    }
    return {
      revision: 0,
      notes: [
        'Something is better than nothing.',
        'Start before you feel ready. Five minutes counts.',
        'A little movement, a little fresh air, a little life.',
        'One real step toward the job you want.',
      ].map((text, index) => ({
        id: `starter-note-${index + 1}`,
        text,
        color: COLORS[index % COLORS.length],
        pinned: false,
        createdAt,
      })),
    };
  }

  function invalid(field, error) {
    return { ok: false, field, error };
  }

  function validateReminders(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return invalid('reminders', 'Notes to self must be an object.');
    }
    const unknownStateField = Object.keys(payload).find(key => !STATE_KEYS.has(key));
    if (unknownStateField) return invalid(unknownStateField, `Unknown notes field: ${unknownStateField}.`);
    if (!Number.isSafeInteger(payload.revision) || payload.revision < 0 || payload.revision === Number.MAX_SAFE_INTEGER) {
      return invalid('revision', 'Notes revision must be a nonnegative safe integer that can be advanced.');
    }
    if (!Array.isArray(payload.notes) || payload.notes.length > MAX_NOTES) {
      return invalid('notes', `Keep up to ${MAX_NOTES} notes to self.`);
    }

    const ids = new Set();
    const notes = [];
    for (let index = 0; index < payload.notes.length; index += 1) {
      const note = payload.notes[index];
      const prefix = `notes[${index}]`;
      if (!note || typeof note !== 'object' || Array.isArray(note)) {
        return invalid(prefix, 'Each note must be an object.');
      }
      const unknownNoteField = Object.keys(note).find(key => !NOTE_KEYS.has(key));
      if (unknownNoteField) return invalid(`${prefix}.${unknownNoteField}`, `Unknown note field: ${unknownNoteField}.`);
      if (typeof note.id !== 'string') return invalid(`${prefix}.id`, 'Note id must be text.');
      const id = note.id.trim();
      if (!id || id.length > MAX_ID_LENGTH || CONTROL_CHARACTERS.test(id)) {
        return invalid(`${prefix}.id`, `Note id must be 1 to ${MAX_ID_LENGTH} characters without control characters.`);
      }
      if (ids.has(id)) return invalid(`${prefix}.id`, 'Note ids must be unique.');
      ids.add(id);
      if (typeof note.text !== 'string') return invalid(`${prefix}.text`, 'Write a short reminder.');
      const text = note.text.trim();
      if (!text || text.length > MAX_TEXT_LENGTH || UNSAFE_TEXT_CHARACTERS.test(text)) {
        return invalid(`${prefix}.text`, `Use 1 to ${MAX_TEXT_LENGTH} characters.`);
      }
      if (!COLORS.includes(note.color)) return invalid(`${prefix}.color`, 'Choose pink, butter, or lilac paper.');
      if (typeof note.pinned !== 'boolean') return invalid(`${prefix}.pinned`, 'Pinned must be true or false.');
      if (!Number.isSafeInteger(note.createdAt) || note.createdAt < 0 || note.createdAt > MAX_EPOCH_MS) {
        return invalid(`${prefix}.createdAt`, 'Note creation time must be a valid epoch-millisecond timestamp.');
      }
      notes.push({ id, text, color: note.color, pinned: note.pinned, createdAt: note.createdAt });
    }
    return { ok: true, value: { revision: payload.revision, notes } };
  }

  function featuredNote(notes, dateKey) {
    if (!Array.isArray(notes) || notes.length === 0) return null;
    const match = typeof dateKey === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!match) throw new TypeError('dateKey must be a real date in YYYY-MM-DD format.');
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
      throw new TypeError('dateKey must be a real date in YYYY-MM-DD format.');
    }
    const pinned = notes.filter(note => note.pinned);
    const pool = pinned.length ? pinned : notes;
    const ordinal = Math.floor(date.getTime() / 86_400_000);
    return pool[((ordinal % pool.length) + pool.length) % pool.length];
  }

  return { MAX_NOTES, MAX_TEXT_LENGTH, COLORS, defaultReminders, validateReminders, featuredNote };
});
