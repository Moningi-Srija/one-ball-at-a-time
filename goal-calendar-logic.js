(function attachGoalCalendarLogic(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GoalCalendarLogic = api;
})(typeof window !== 'undefined' ? window : null, function createGoalCalendarLogic() {
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
  const DAY_MS = 86_400_000;
  const MAX_RANGE_DAYS = 366;
  const MAX_GOALS = 1000;
  const MAX_ID_LENGTH = 100;
  const MAX_TITLE_LENGTH = 160;
  const MAX_EPOCH_MS = 8_640_000_000_000_000;
  const STATE_KEYS = new Set(['revision', 'startDate', 'endDate', 'goals']);
  const GOAL_KEYS = new Set(['id', 'date', 'title', 'completed', 'createdAt', 'completedAt']);

  function parseDateKey(value) {
    if (typeof value !== 'string') return null;
    const match = DATE_PATTERN.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year
      || parsed.getUTCMonth() !== month - 1
      || parsed.getUTCDate() !== day
    ) return null;
    return parsed;
  }

  function formatDateKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDays(dateKey, amount) {
    const parsed = parseDateKey(dateKey);
    if (!parsed || !Number.isInteger(amount)) return null;
    const result = new Date(parsed.getTime() + amount * DAY_MS);
    if (!Number.isFinite(result.getTime())) return null;
    return formatDateKey(result);
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

  function defaultGoalCalendarState(now = new Date(), timeZone = 'UTC') {
    const startDate = dateKeyInTimeZone(now, timeZone);
    return {
      revision: 0,
      startDate,
      endDate: addDays(startDate, 29),
      goals: [],
    };
  }

  function monthGrid(anchorDate, weekStartsOn = 0) {
    const anchor = parseDateKey(anchorDate);
    if (!anchor) throw new TypeError('anchorDate must be a real date in YYYY-MM-DD format.');
    if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
      throw new TypeError('weekStartsOn must be a whole number from 0 through 6.');
    }

    const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const leadingDays = (monthStart.getUTCDay() - weekStartsOn + 7) % 7;
    const gridStart = new Date(monthStart.getTime() - leadingDays * DAY_MS);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getTime() + index * DAY_MS);
      return {
        date: formatDateKey(date),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === anchor.getUTCMonth()
          && date.getUTCFullYear() === anchor.getUTCFullYear(),
      };
    });
  }

  function invalid(field, error) {
    return { ok: false, field, error };
  }

  function validateDate(value, field) {
    const parsed = parseDateKey(value);
    if (!parsed) return invalid(field, `${field} must be a real date in YYYY-MM-DD format.`);
    return { ok: true, value, date: parsed };
  }

  function validateEpoch(value, field) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_EPOCH_MS) {
      return invalid(field, `${field} must be a valid epoch-millisecond timestamp.`);
    }
    return { ok: true, value };
  }

  function validateGoalCalendar(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return invalid('goalCalendar', 'Goal calendar must be an object.');
    }
    const unknownStateField = Object.keys(payload).find(key => !STATE_KEYS.has(key));
    if (unknownStateField) {
      return invalid(unknownStateField, `Unknown goal calendar field: ${unknownStateField}.`);
    }

    if (!Number.isSafeInteger(payload.revision) || payload.revision < 0 || payload.revision === Number.MAX_SAFE_INTEGER) {
      return invalid('revision', 'Goal calendar revision must be a nonnegative safe integer that can be advanced.');
    }

    const start = validateDate(payload.startDate, 'startDate');
    if (!start.ok) return start;
    const end = validateDate(payload.endDate, 'endDate');
    if (!end.ok) return end;
    const totalDays = Math.round((end.date.getTime() - start.date.getTime()) / DAY_MS) + 1;
    if (totalDays < 1) {
      return invalid('dateRange', 'Goal calendar end date cannot be before its start date.');
    }
    if (totalDays > MAX_RANGE_DAYS) {
      return invalid('dateRange', `Goal calendar can cover at most ${MAX_RANGE_DAYS} days.`);
    }

    if (!Array.isArray(payload.goals)) {
      return invalid('goals', 'Goal calendar goals must be an array.');
    }
    if (payload.goals.length > MAX_GOALS) {
      return invalid('goals', `Goal calendar cannot contain more than ${MAX_GOALS} goals.`);
    }

    const ids = new Set();
    const goals = [];
    for (let index = 0; index < payload.goals.length; index += 1) {
      const goal = payload.goals[index];
      const prefix = `goals[${index}]`;
      if (!goal || typeof goal !== 'object' || Array.isArray(goal)) {
        return invalid(prefix, `${prefix} must be an object.`);
      }
      const unknownGoalField = Object.keys(goal).find(key => !GOAL_KEYS.has(key));
      if (unknownGoalField) {
        return invalid(`${prefix}.${unknownGoalField}`, `Unknown goal field: ${unknownGoalField}.`);
      }

      if (typeof goal.id !== 'string') {
        return invalid(`${prefix}.id`, 'Goal id must be text.');
      }
      const id = goal.id.trim();
      if (!id || id.length > MAX_ID_LENGTH || CONTROL_CHARACTERS.test(id)) {
        return invalid(`${prefix}.id`, `Goal id must be 1 to ${MAX_ID_LENGTH} characters without control characters.`);
      }
      if (ids.has(id)) return invalid(`${prefix}.id`, 'Goal ids must be unique.');
      ids.add(id);

      const goalDate = validateDate(goal.date, `${prefix}.date`);
      if (!goalDate.ok) return goalDate;
      if (goal.date < payload.startDate || goal.date > payload.endDate) {
        return invalid(`${prefix}.date`, 'Goal date must be inside the goal calendar range.');
      }

      if (typeof goal.title !== 'string') {
        return invalid(`${prefix}.title`, 'Goal title must be text.');
      }
      const title = goal.title.trim();
      if (!title) return invalid(`${prefix}.title`, 'Goal title is required.');
      if (title.length > MAX_TITLE_LENGTH) {
        return invalid(`${prefix}.title`, `Goal title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
      }
      if (CONTROL_CHARACTERS.test(title)) {
        return invalid(`${prefix}.title`, 'Goal title contains an unsupported character.');
      }

      if (typeof goal.completed !== 'boolean') {
        return invalid(`${prefix}.completed`, 'Goal completed must be true or false.');
      }
      const createdAt = validateEpoch(goal.createdAt, `${prefix}.createdAt`);
      if (!createdAt.ok) return createdAt;

      let completedAt = null;
      if (goal.completed) {
        const completion = validateEpoch(goal.completedAt, `${prefix}.completedAt`);
        if (!completion.ok) return completion;
        if (completion.value < createdAt.value) {
          return invalid(`${prefix}.completedAt`, 'Goal completion time cannot be before its creation time.');
        }
        completedAt = completion.value;
      } else if (goal.completedAt !== null) {
        return invalid(`${prefix}.completedAt`, 'An incomplete goal must have a null completedAt value.');
      }

      goals.push({
        id,
        date: goalDate.value,
        title,
        completed: goal.completed,
        createdAt: createdAt.value,
        completedAt,
      });
    }

    return {
      ok: true,
      value: {
        revision: payload.revision,
        startDate: start.value,
        endDate: end.value,
        goals,
      },
    };
  }

  function normalizeGoalCalendar(payload, now = new Date(), timeZone = 'UTC') {
    const result = validateGoalCalendar(payload);
    return result.ok ? result.value : defaultGoalCalendarState(now, timeZone);
  }

  return {
    MAX_GOALS,
    MAX_RANGE_DAYS,
    MAX_TITLE_LENGTH,
    addDays,
    dateKeyInTimeZone,
    defaultGoalCalendarState,
    monthGrid,
    normalizeGoalCalendar,
    parseDateKey,
    validateGoalCalendar,
  };
});
