const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function init() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Prevent two app instances from racing through startup migrations.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('one-ball-at-a-time-schema'))`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const defaults = {
      active: [],
      log: [],
      countdowns: [],
      targets: { day: 25, week: 150, weekend: 50, month: 600 },
      frog: null,
    };
    for (const [key, value] of Object.entries(defaults)) {
      await client.query(
        `INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(value)]
      );
    }

    const expenseMigration = await client.query(
      `SELECT 1 FROM schema_migrations WHERE name = $1`,
      ['001_create_expenses']
    );
    if (expenseMigration.rowCount === 0) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          amount_paise BIGINT NOT NULL CHECK (amount_paise > 0 AND amount_paise <= 999999999999),
          spent_on DATE NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('food', 'clothes', 'transport', 'trips')),
          note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS expenses_spent_on_idx
          ON expenses (spent_on DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS expenses_category_spent_on_idx
          ON expenses (category, spent_on DESC);
      `);
      await client.query(
        `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        ['001_create_expenses']
      );
    }

    const focusMigration = await client.query(
      `SELECT 1 FROM schema_migrations WHERE name = $1`,
      ['002_create_focus_sessions']
    );
    if (focusMigration.rowCount === 0) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS focus_sessions (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'running'
            CHECK (status IN ('running', 'paused', 'finished', 'cancelled')),
          label TEXT CHECK (label IS NULL OR char_length(label) <= 120),
          category TEXT CHECK (category IS NULL OR char_length(category) <= 60),
          note TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
          focus_level TEXT
            CHECK (focus_level IS NULL OR focus_level IN ('distracted', 'steady', 'deep')),
          mode TEXT NOT NULL DEFAULT 'stopwatch'
            CHECK (mode IN ('stopwatch', 'countdown')),
          planned_seconds INTEGER,
          session_date DATE NOT NULL,
          time_zone TEXT NOT NULL CHECK (char_length(time_zone) BETWEEN 1 AND 100),
          elapsed_seconds BIGINT NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0),
          started_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('second', clock_timestamp()),
          running_since TIMESTAMPTZ DEFAULT date_trunc('second', clock_timestamp()),
          ended_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CHECK (
            (status = 'running' AND running_since IS NOT NULL AND ended_at IS NULL)
            OR (status = 'paused' AND running_since IS NULL AND ended_at IS NULL)
            OR (status IN ('finished', 'cancelled') AND running_since IS NULL AND ended_at IS NOT NULL)
          ),
          CHECK (
            (mode = 'stopwatch' AND planned_seconds IS NULL)
            OR (mode = 'countdown' AND planned_seconds BETWEEN 60 AND 43200)
          ),
          CHECK (focus_level IS NULL OR status = 'finished'),
          CHECK (ended_at IS NULL OR ended_at >= started_at)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS focus_sessions_one_active_idx
          ON focus_sessions ((1))
          WHERE status IN ('running', 'paused');
        CREATE INDEX IF NOT EXISTS focus_sessions_date_idx
          ON focus_sessions (session_date DESC, started_at DESC);
        CREATE INDEX IF NOT EXISTS focus_sessions_status_date_idx
          ON focus_sessions (status, session_date DESC);
        CREATE INDEX IF NOT EXISTS focus_sessions_category_date_idx
          ON focus_sessions (category, session_date DESC)
          WHERE category IS NOT NULL;
      `);
      await client.query(
        `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        ['002_create_focus_sessions']
      );
    }

    const expandedExpenseCategoriesMigration = await client.query(
      `SELECT 1 FROM schema_migrations WHERE name = $1`,
      ['003_expand_expense_categories']
    );
    if (expandedExpenseCategoriesMigration.rowCount === 0) {
      await client.query(`
        ALTER TABLE expenses
          DROP CONSTRAINT IF EXISTS expenses_category_check;
        ALTER TABLE expenses
          ADD CONSTRAINT expenses_category_check
          CHECK (category IN (
            'food',
            'clothes',
            'transport',
            'trips',
            'home_rent',
            'family_support',
            'miscellaneous'
          ));
      `);
      await client.query(
        `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        ['003_expand_expense_categories']
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Preserve the migration error; a broken connection can also make rollback fail.
      console.error('Failed to roll back schema migration transaction:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function getState() {
  const { rows } = await pool.query(`SELECT key, value FROM app_state`);
  const state = {};
  rows.forEach(r => { state[r.key] = r.value; });
  return state;
}

async function setState(key, value) {
  await pool.query(
    `INSERT INTO app_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, JSON.stringify(value)]
  );
}

const EXPENSE_COLUMNS = `
  id::text AS id,
  amount_paise::text AS "amountPaise",
  spent_on::text AS date,
  category,
  note,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function mapExpense(row) {
  return {
    id: row.id,
    amount: Number(row.amountPaise) / 100,
    date: row.date,
    category: row.category,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listExpenses({ from, to, category } = {}) {
  const conditions = [];
  const values = [];
  if (from) {
    values.push(from);
    conditions.push(`spent_on >= $${values.length}::date`);
  }
  if (to) {
    values.push(to);
    conditions.push(`spent_on <= $${values.length}::date`);
  }
  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${EXPENSE_COLUMNS}
     FROM expenses
     ${where}
     ORDER BY spent_on DESC, created_at DESC, id DESC`,
    values
  );
  return rows.map(mapExpense);
}

async function createExpense({ amountPaise, date, category, note }) {
  const { rows } = await pool.query(
    `INSERT INTO expenses (amount_paise, spent_on, category, note)
     VALUES ($1::bigint, $2::date, $3, $4)
     RETURNING ${EXPENSE_COLUMNS}`,
    [amountPaise, date, category, note]
  );
  return mapExpense(rows[0]);
}

async function updateExpense(id, { amountPaise, date, category, note }) {
  const { rows } = await pool.query(
    `UPDATE expenses
     SET amount_paise = $2::bigint,
         spent_on = $3::date,
         category = $4,
         note = $5,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING ${EXPENSE_COLUMNS}`,
    [id, amountPaise, date, category, note]
  );
  return rows[0] ? mapExpense(rows[0]) : null;
}

async function deleteExpense(id) {
  const result = await pool.query(`DELETE FROM expenses WHERE id = $1::bigint`, [id]);
  return result.rowCount > 0;
}

const FOCUS_SESSION_COLUMNS = `
  id::text AS id,
  status,
  label,
  category,
  note,
  focus_level AS "focusLevel",
  mode,
  planned_seconds AS "plannedSeconds",
  session_date::text AS date,
  time_zone AS "timeZone",
  (
    elapsed_seconds
    + CASE
        WHEN status = 'running' AND running_since IS NOT NULL
          THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (date_trunc('second', clock_timestamp()) - running_since))))::bigint
        ELSE 0
      END
  )::text AS "elapsedSeconds",
  started_at AS "startedAt",
  running_since AS "runningSince",
  ended_at AS "endedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

class FocusSessionError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'FocusSessionError';
    this.code = code;
  }
}

function mapFocusSession(row) {
  return {
    id: row.id,
    status: row.status,
    label: row.label,
    category: row.category,
    note: row.note,
    focusLevel: row.focusLevel,
    mode: row.mode,
    plannedSeconds: row.plannedSeconds,
    date: row.date,
    timeZone: row.timeZone,
    elapsedSeconds: Number(row.elapsedSeconds),
    startedAt: row.startedAt,
    runningSince: row.runningSince,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listFocusSessions({ from, to, status, category } = {}) {
  const conditions = [];
  const values = [];
  if (from) {
    values.push(from);
    conditions.push(`session_date >= $${values.length}::date`);
  }
  if (to) {
    values.push(to);
    conditions.push(`session_date <= $${values.length}::date`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${FOCUS_SESSION_COLUMNS}
     FROM focus_sessions
     ${where}
     ORDER BY session_date DESC, started_at DESC, id DESC`,
    values
  );
  return rows.map(mapFocusSession);
}

async function getActiveFocusSession() {
  const { rows } = await pool.query(
    `SELECT ${FOCUS_SESSION_COLUMNS}
     FROM focus_sessions
     WHERE status IN ('running', 'paused')
     ORDER BY started_at DESC
     LIMIT 1`
  );
  return rows[0] ? mapFocusSession(rows[0]) : null;
}

async function createFocusSession({ date, timeZone, label, category, note, mode, plannedSeconds }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO focus_sessions
         (session_date, time_zone, label, category, note, mode, planned_seconds)
       VALUES ($1::date, $2, $3, $4, $5, $6, $7)
       RETURNING ${FOCUS_SESSION_COLUMNS}`,
      [date, timeZone, label, category, note, mode, plannedSeconds]
    );
    return mapFocusSession(rows[0]);
  } catch (error) {
    // This insert uses a generated identity, so the only reachable unique violation
    // is the partial index that allows one running/paused session at a time.
    if (error && error.code === '23505') {
      throw new FocusSessionError('active_session_exists');
    }
    throw error;
  }
}

async function withFocusSessionLock(id, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT ${FOCUS_SESSION_COLUMNS}
       FROM focus_sessions
       WHERE id = $1::bigint
       FOR UPDATE`,
      [id]
    );
    if (!locked.rows[0]) throw new FocusSessionError('session_not_found');
    const result = await operation(client, locked.rows[0]);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Preserve the transition error; a broken connection can also make rollback fail.
      console.error('Failed to roll back focus session transaction:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function transitionFocusSession(id, action, { focusLevel = null, note } = {}) {
  const allowedFrom = {
    pause: 'running',
    resume: 'paused',
    finish: ['running', 'paused'],
    cancel: ['running', 'paused'],
  };
  if (!Object.hasOwn(allowedFrom, action)) throw new Error(`Unsupported focus action: ${action}`);

  return withFocusSessionLock(id, async (client, current) => {
    const idempotentStatus = {
      pause: 'paused',
      resume: 'running',
      finish: 'finished',
      cancel: 'cancelled',
    }[action];
    if (current.status === idempotentStatus) return mapFocusSession(current);

    const allowed = Array.isArray(allowedFrom[action]) ? allowedFrom[action] : [allowedFrom[action]];
    if (!allowed.includes(current.status)) {
      throw new FocusSessionError('invalid_session_state', `Cannot ${action} a ${current.status} session.`);
    }

    let sql;
    let values = [id];
    if (action === 'pause') {
      sql = `UPDATE focus_sessions
             SET status = 'paused',
                 elapsed_seconds = elapsed_seconds
                   + GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (date_trunc('second', clock_timestamp()) - running_since))))::bigint,
                 running_since = NULL,
                 updated_at = clock_timestamp()
             WHERE id = $1::bigint
             RETURNING ${FOCUS_SESSION_COLUMNS}`;
    } else if (action === 'resume') {
      sql = `UPDATE focus_sessions
             SET status = 'running',
                 running_since = date_trunc('second', clock_timestamp()),
                 updated_at = clock_timestamp()
             WHERE id = $1::bigint
             RETURNING ${FOCUS_SESSION_COLUMNS}`;
    } else {
      const targetStatus = action === 'finish' ? 'finished' : 'cancelled';
      values = [
        id,
        action === 'finish' ? focusLevel : null,
        action === 'finish' && note !== undefined ? note : null,
        action === 'finish' && note !== undefined,
      ];
      sql = `UPDATE focus_sessions
             SET status = '${targetStatus}',
                 elapsed_seconds = elapsed_seconds
                   + CASE
                       WHEN status = 'running'
                         THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (date_trunc('second', clock_timestamp()) - running_since))))::bigint
                       ELSE 0
                     END,
                 running_since = NULL,
                 ended_at = date_trunc('second', clock_timestamp()),
                 focus_level = $2,
                 note = CASE WHEN $4::boolean THEN $3 ELSE note END,
                 updated_at = clock_timestamp()
             WHERE id = $1::bigint
             RETURNING ${FOCUS_SESSION_COLUMNS}`;
    }
    const { rows } = await client.query(sql, values);
    return mapFocusSession(rows[0]);
  });
}

async function updateFocusSession(id, fields) {
  return withFocusSessionLock(id, async (client, current) => {
    if (Object.hasOwn(fields, 'focusLevel') && fields.focusLevel !== null && current.status !== 'finished') {
      throw new FocusSessionError('focus_level_requires_finished_session');
    }

    const columnByField = {
      date: 'session_date',
      timeZone: 'time_zone',
      label: 'label',
      category: 'category',
      note: 'note',
      focusLevel: 'focus_level',
    };
    const entries = Object.entries(fields);
    const values = [id];
    const assignments = entries.map(([field, value]) => {
      values.push(value);
      const cast = field === 'date' ? '::date' : '';
      return `${columnByField[field]} = $${values.length}${cast}`;
    });
    const { rows } = await client.query(
      `UPDATE focus_sessions
       SET ${assignments.join(', ')}, updated_at = clock_timestamp()
       WHERE id = $1::bigint
       RETURNING ${FOCUS_SESSION_COLUMNS}`,
      values
    );
    return mapFocusSession(rows[0]);
  });
}

async function deleteFocusSession(id) {
  return withFocusSessionLock(id, async (client, current) => {
    if (!['finished', 'cancelled'].includes(current.status)) {
      throw new FocusSessionError('active_session_cannot_be_deleted');
    }
    await client.query(`DELETE FROM focus_sessions WHERE id = $1::bigint`, [id]);
    return true;
  });
}

module.exports = {
  pool,
  init,
  getState,
  setState,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  FocusSessionError,
  listFocusSessions,
  getActiveFocusSession,
  createFocusSession,
  transitionFocusSession,
  updateFocusSession,
  deleteFocusSession,
};
