(function attachWinterArcLogic(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.WinterArcLogic = api;
})(typeof window !== 'undefined' ? window : null, function createWinterArcLogic() {
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DAY_MS = 86_400_000;
  const SETTING_KEYS = new Set(['enabled', 'startDate', 'endDate']);

  function parseDateKey(value) {
    if (typeof value !== 'string') return null;
    const match = DATE_PATTERN.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const timestamp = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp);
    if (
      parsed.getUTCFullYear() !== year
      || parsed.getUTCMonth() !== month - 1
      || parsed.getUTCDate() !== day
    ) return null;
    return { year, month, day, ordinal: Math.floor(timestamp / DAY_MS) };
  }

  function dateKeyInTimeZone(value, timeZone = 'UTC') {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new TypeError('now must be a valid date');
    let parts;
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
    } catch {
      throw new TypeError('timeZone must be a valid IANA time zone');
    }
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function defaultWinterArcSettings(now = new Date(), timeZone = 'UTC') {
    const year = dateKeyInTimeZone(now, timeZone).slice(0, 4);
    return {
      enabled: true,
      startDate: `${year}-10-01`,
      endDate: `${year}-12-31`,
    };
  }

  function invalid(field, error) {
    return { ok: false, field, error };
  }

  function validateWinterArcSettings(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return invalid('winterArc', 'Winter Arc settings must be an object.');
    }
    const unknownField = Object.keys(payload).find(key => !SETTING_KEYS.has(key));
    if (unknownField) return invalid(unknownField, `Unknown Winter Arc setting: ${unknownField}.`);
    if (typeof payload.enabled !== 'boolean') {
      return invalid('enabled', 'Winter Arc enabled must be true or false.');
    }
    const start = parseDateKey(payload.startDate);
    if (!start) return invalid('startDate', 'Winter Arc start date must be a real date in YYYY-MM-DD format.');
    const end = parseDateKey(payload.endDate);
    if (!end) return invalid('endDate', 'Winter Arc end date must be a real date in YYYY-MM-DD format.');
    if (end.ordinal < start.ordinal) {
      return invalid('dateRange', 'Winter Arc end date cannot be before its start date.');
    }
    return {
      ok: true,
      value: {
        enabled: payload.enabled,
        startDate: payload.startDate,
        endDate: payload.endDate,
      },
    };
  }

  function normalizeWinterArcSettings(payload, now = new Date(), timeZone = 'UTC') {
    const result = validateWinterArcSettings(payload);
    return result.ok ? result.value : defaultWinterArcSettings(now, timeZone);
  }

  function getWinterArcPosition({ startDate, endDate, todayDate }) {
    const start = parseDateKey(startDate);
    const end = parseDateKey(endDate);
    const today = parseDateKey(todayDate);
    if (!start || !end || !today || end.ordinal < start.ordinal) {
      throw new TypeError('Winter Arc position requires a valid inclusive date range and today date.');
    }
    const totalDays = end.ordinal - start.ordinal + 1;
    if (today.ordinal < start.ordinal) {
      return {
        phase: 'upcoming',
        dayNumber: 0,
        totalDays,
        daysUntilStart: start.ordinal - today.ordinal,
        daysRemaining: totalDays,
      };
    }
    if (today.ordinal > end.ordinal) {
      return {
        phase: 'finished',
        dayNumber: totalDays,
        totalDays,
        daysUntilStart: 0,
        daysRemaining: 0,
      };
    }
    const dayNumber = today.ordinal - start.ordinal + 1;
    return {
      phase: 'active',
      dayNumber,
      totalDays,
      daysUntilStart: 0,
      daysRemaining: end.ordinal - today.ordinal + 1,
    };
  }

  function hasBodyPromise(task) {
    return task?.bodySlot === true || task?.category === 'glow_up';
  }

  function hasCareerPromise(task) {
    return task?.careerSlot === true || task?.category === 'empire_building';
  }

  function statusFromTasks(tasks, dailyTarget) {
    let points = 0;
    let bodyDone = false;
    let careerDone = false;
    (Array.isArray(tasks) ? tasks : []).forEach(task => {
      const value = Number(task?.points);
      if (Number.isFinite(value) && value > 0) points += value;
      bodyDone = bodyDone || hasBodyPromise(task);
      careerDone = careerDone || hasCareerPromise(task);
    });
    points = Math.round(points * 100) / 100;
    const parsedTarget = Number(dailyTarget);
    const target = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : null;
    const pointsDone = target !== null && points >= target;
    return {
      bodyDone,
      careerDone,
      points,
      dailyTarget: target,
      pointsDone,
      needsTarget: target === null,
      showedUp: bodyDone || careerDone || points > 0,
      secured: bodyDone && careerDone && pointsDone,
    };
  }

  function completedTaskDate(task, timeZone) {
    const completedAt = Number(task?.completedAt);
    if (!Number.isFinite(completedAt) || completedAt < 0) return null;
    try {
      return dateKeyInTimeZone(completedAt, timeZone);
    } catch {
      return null;
    }
  }

  function getWinterArcTodayStatus({ log, dateKey, dailyTarget, timeZone = 'UTC' }) {
    if (!parseDateKey(dateKey)) throw new TypeError('dateKey must be a real date in YYYY-MM-DD format');
    const tasks = (Array.isArray(log) ? log : []).filter(task => completedTaskDate(task, timeZone) === dateKey);
    return statusFromTasks(tasks, dailyTarget);
  }

  function summarizeWinterArc({ settings, log, dailyTarget, now = new Date(), timeZone = 'UTC' }) {
    const validation = validateWinterArcSettings(settings);
    if (!validation.ok) throw new TypeError(validation.error);
    const normalized = validation.value;
    const todayDate = dateKeyInTimeZone(now, timeZone);
    const position = getWinterArcPosition({
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      todayDate,
    });
    const start = parseDateKey(normalized.startDate);
    const end = parseDateKey(normalized.endDate);
    const today = parseDateKey(todayDate);
    const grouped = new Map();

    (Array.isArray(log) ? log : []).forEach(task => {
      const key = completedTaskDate(task, timeZone);
      const parsed = parseDateKey(key);
      if (!parsed || parsed.ordinal < start.ordinal || parsed.ordinal > end.ordinal || parsed.ordinal > today.ordinal) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(task);
    });

    let showedUpDays = 0;
    let securedDays = 0;
    grouped.forEach(tasks => {
      const status = statusFromTasks(tasks, dailyTarget);
      if (status.showedUp) showedUpDays += 1;
      if (status.secured) securedDays += 1;
    });

    return {
      ...position,
      enabled: normalized.enabled,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      todayDate,
      showedUpDays,
      securedDays,
      today: getWinterArcTodayStatus({ log, dateKey: todayDate, dailyTarget, timeZone }),
    };
  }

  return {
    dateKeyInTimeZone,
    defaultWinterArcSettings,
    getWinterArcPosition,
    getWinterArcTodayStatus,
    normalizeWinterArcSettings,
    summarizeWinterArc,
    validateWinterArcSettings,
  };
});
