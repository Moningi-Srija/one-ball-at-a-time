(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoardSlots = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SLOT_CATEGORIES = { body: 'glow_up', career: 'empire_building' };

  function defaultSettings() {
    return { revision: 0, bodyLocked: true, careerLocked: true };
  }

  function validateSettings(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, field: 'settings', error: 'Slot settings must be an object.' };
    }
    if (Object.keys(input).some(key => !['revision', 'bodyLocked', 'careerLocked'].includes(key))) {
      return { ok: false, field: 'settings', error: 'Unknown slot setting.' };
    }
    if (!Number.isSafeInteger(input.revision) || input.revision < 0 || input.revision >= Number.MAX_SAFE_INTEGER) {
      return { ok: false, field: 'revision', error: 'Invalid slot settings revision.' };
    }
    for (const key of ['bodyLocked', 'careerLocked']) {
      if (typeof input[key] !== 'boolean') return { ok: false, field: key, error: 'Choose locked or unlocked.' };
    }
    return { ok: true, value: { revision: input.revision, bodyLocked: input.bodyLocked, careerLocked: input.careerLocked } };
  }

  function normalizeSettings(input) {
    const result = validateSettings(input);
    return result.ok ? result.value : defaultSettings();
  }

  // Slot flags are preferences, not permission to lock the wrong category.
  // No task is changed or dropped, including legacy boards with extra tasks.
  function layout(tasks, settings) {
    const locks = normalizeSettings(settings);
    const selected = new Set();
    const result = { body: null, career: null, flexible: [], capacity: 5 };
    for (const slot of ['body', 'career']) {
      if (!locks[`${slot}Locked`]) continue;
      result.capacity--;
      const eligible = tasks.filter(task => !selected.has(task) && task.category === SLOT_CATEGORIES[slot]);
      const task = eligible.find(item => item[`${slot}Slot`]) || eligible[0] || null;
      result[slot] = task;
      if (task) selected.add(task);
    }
    result.flexible = tasks.filter(task => !selected.has(task));
    return result;
  }

  function canAdd(tasks, settings, slot = 'flexible') {
    if (tasks.length >= 5) return false;
    const board = layout(tasks, settings);
    if (slot === 'flexible') return board.flexible.length < board.capacity;
    return Object.hasOwn(SLOT_CATEGORIES, slot)
      && normalizeSettings(settings)[`${slot}Locked`] && !board[slot];
  }

  function protectedSlot(task, tasks, settings) {
    const board = layout(tasks, settings);
    return ['body', 'career'].find(slot => board[slot] === task) || null;
  }

  function canChange(tasks, settings, slot, locked) {
    if (!Object.hasOwn(SLOT_CATEGORIES, slot) || typeof locked !== 'boolean') return false;
    if (!locked) return true;
    const board = layout(tasks, { ...normalizeSettings(settings), [`${slot}Locked`]: true });
    return tasks.length <= 5 && board.flexible.length <= board.capacity;
  }

  return { SLOT_CATEGORIES, defaultSettings, validateSettings, normalizeSettings, layout, canAdd, protectedSlot, canChange };
}));
