const EXPENSE_CATEGORIES = Object.freeze([
  'food',
  'clothes',
  'transport',
  'trips',
  'home_rent',
  'family_support',
  'miscellaneous',
]);
const EXPENSE_CATEGORY_SET = new Set(EXPENSE_CATEGORIES);
const MAX_NOTE_LENGTH = 500;
const MAX_AMOUNT = 9_999_999_999.99;
const MAX_AMOUNT_PAISE = 999_999_999_999;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/;
const ID_PATTERN = /^[1-9]\d{0,18}$/;

function invalid(field, message) {
  return { ok: false, field, error: message };
}

function normalizeAmount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return invalid('amount', 'Amount must be a number.');
  }

  const input = typeof value === 'number' ? String(value) : value.trim();
  if (!DECIMAL_PATTERN.test(input)) {
    return invalid('amount', 'Amount must be positive and have at most two decimal places.');
  }

  const [whole, fraction = ''] = input.split('.');
  const amountPaise = (Number(whole) * 100) + Number(fraction.padEnd(2, '0') || 0);
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0 || amountPaise > MAX_AMOUNT_PAISE) {
    return invalid('amount', `Amount must be greater than 0 and no more than ${MAX_AMOUNT}.`);
  }

  return { ok: true, value: amountPaise };
}

function normalizeDate(value, field = 'date') {
  if (typeof value !== 'string') {
    return invalid(field, `${field === 'date' ? 'Date' : field} must use YYYY-MM-DD.`);
  }

  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return invalid(field, `${field === 'date' ? 'Date' : field} must use YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return invalid(field, `${field === 'date' ? 'Date' : field} must be a real calendar date.`);
  }

  return { ok: true, value };
}

function normalizeCategory(value, optional = false) {
  if (optional && (value === undefined || value === '')) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== 'string' || !EXPENSE_CATEGORY_SET.has(value)) {
    return invalid('category', `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}.`);
  }
  return { ok: true, value };
}

function normalizeNote(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }
  if (typeof value !== 'string') {
    return invalid('note', 'Note must be text.');
  }

  const note = value.trim();
  if (!note) return { ok: true, value: null };
  if (note.length > MAX_NOTE_LENGTH) {
    return invalid('note', `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`);
  }
  if (note.includes('\u0000')) {
    return invalid('note', 'Note contains an unsupported character.');
  }
  return { ok: true, value: note };
}

function validateExpense(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return invalid('expense', 'Expense must be an object.');
  }

  const allowedFields = new Set(['amount', 'date', 'category', 'note']);
  const unknownField = Object.keys(payload).find(key => !allowedFields.has(key));
  if (unknownField) return invalid(unknownField, `Unknown expense field: ${unknownField}.`);

  const amount = normalizeAmount(payload.amount);
  if (!amount.ok) return amount;
  const date = normalizeDate(payload.date);
  if (!date.ok) return date;
  const category = normalizeCategory(payload.category);
  if (!category.ok) return category;
  const note = normalizeNote(payload.note);
  if (!note.ok) return note;

  return {
    ok: true,
    value: {
      amountPaise: amount.value,
      date: date.value,
      category: category.value,
      note: note.value,
    },
  };
}

function validateExpenseId(value) {
  const id = String(value || '');
  if (!ID_PATTERN.test(id)) return invalid('id', 'Expense ID is invalid.');

  try {
    if (BigInt(id) > 9_223_372_036_854_775_807n) {
      return invalid('id', 'Expense ID is invalid.');
    }
  } catch {
    return invalid('id', 'Expense ID is invalid.');
  }

  return { ok: true, value: id };
}

function validateExpenseFilters(query) {
  const allowedFields = new Set(['from', 'to', 'category']);
  const unknownField = Object.keys(query || {}).find(key => !allowedFields.has(key));
  if (unknownField) return invalid(unknownField, `Unknown expense filter: ${unknownField}.`);

  const category = normalizeCategory(query?.category, true);
  if (!category.ok) return category;

  let from;
  if (query?.from !== undefined && query.from !== '') {
    const result = normalizeDate(query.from, 'from');
    if (!result.ok) return result;
    from = result.value;
  }

  let to;
  if (query?.to !== undefined && query.to !== '') {
    const result = normalizeDate(query.to, 'to');
    if (!result.ok) return result;
    to = result.value;
  }

  if (from && to && from > to) {
    return invalid('dateRange', 'The from date cannot be after the to date.');
  }

  return { ok: true, value: { from, to, category: category.value } };
}

module.exports = {
  EXPENSE_CATEGORIES,
  MAX_AMOUNT,
  MAX_NOTE_LENGTH,
  validateExpense,
  validateExpenseFilters,
  validateExpenseId,
};
