const { randomUUID } = require('node:crypto');
const Logic = require('./progress-logic');

const TRACKER_FIELDS = `id, title, unit, target, current, step, style, color, note,
  revision, created_at AS "createdAt", updated_at AS "updatedAt"`;
const EVENT_FIELDS = `id, tracker_id AS "trackerId", kind, delta, value, note,
  created_at AS "createdAt"`;
const HISTORY_LIMIT = 1000;

class ProgressError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'ProgressError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Called by db.init inside its existing schema transaction and advisory lock.
async function initProgressSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS progress_trackers (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
      unit TEXT NOT NULL DEFAULT '' CHECK (char_length(unit) <= 40),
      target NUMERIC(12, 2) NOT NULL CHECK (target > 0 AND target <= 1000000000),
      current NUMERIC(12, 2) NOT NULL CHECK (current >= 0 AND current <= 1000000000),
      step NUMERIC(12, 2) NOT NULL CHECK (step > 0 AND step <= 1000000000),
      style TEXT NOT NULL CHECK (style IN ('bar', 'ring', 'dots')),
      color TEXT NOT NULL CHECK (color IN ('pink', 'lilac', 'mint', 'blue', 'butter')),
      note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
      revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0 AND revision <= 9007199254740991),
      creation_payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
    CREATE TABLE IF NOT EXISTS progress_events (
      id UUID PRIMARY KEY,
      sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
      tracker_id UUID NOT NULL REFERENCES progress_trackers(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('initial', 'add', 'set')),
      requested_value NUMERIC(12, 2) NOT NULL CHECK (requested_value BETWEEN -1000000000 AND 1000000000),
      delta NUMERIC(12, 2) NOT NULL CHECK (delta BETWEEN -1000000000 AND 1000000000),
      value NUMERIC(12, 2) NOT NULL CHECK (value >= 0 AND value <= 1000000000),
      note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
    CREATE INDEX IF NOT EXISTS progress_events_tracker_sequence_idx
      ON progress_events (tracker_id, sequence DESC);
    CREATE INDEX IF NOT EXISTS progress_events_tracker_created_idx
      ON progress_events (tracker_id, created_at);
  `);
}

function checked(result) {
  if (!result.ok) throw new ProgressError(400, 'invalid_progress', result.error, { field: result.field });
  return result.value;
}

function mapTracker(row) {
  const { creationPayload, ...tracker } = row;
  return { ...tracker, target: Number(row.target), current: Number(row.current), step: Number(row.step), revision: Number(row.revision) };
}

function mapEvent(row) {
  return {
    id: row.id, trackerId: row.trackerId, kind: row.kind, delta: Number(row.delta),
    value: Number(row.value), note: row.note, createdAt: row.createdAt,
  };
}

function conflict(tracker, code = 'progress_conflict', message = 'This tracker changed elsewhere. Reload it and try again.') {
  return new ProgressError(409, code, message, { tracker });
}

function createProgressStore(pool) {
  async function transaction(action) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* Preserve the original failure. */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async function lockTracker(client, id) {
    const result = await client.query(`SELECT ${TRACKER_FIELDS} FROM progress_trackers WHERE id = $1 FOR UPDATE`, [id]);
    if (!result.rows.length) throw new ProgressError(404, 'progress_not_found', 'Tracker not found.');
    return mapTracker(result.rows[0]);
  }

  function checkRevision(tracker, revision) {
    if (tracker.revision !== revision) throw conflict(tracker);
  }

  async function listTrackers() {
    const result = await pool.query(`SELECT ${TRACKER_FIELDS} FROM progress_trackers ORDER BY created_at, id`);
    return result.rows.map(mapTracker);
  }

  async function createTracker(payload) {
    const input = checked(Logic.validateTrackerCreate(payload));
    return transaction(async client => {
      // Serialize creates so concurrent requests cannot exceed the tracker cap.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext('progress-tracker-create'))`);
      const existing = await client.query(`SELECT ${TRACKER_FIELDS}, creation_payload AS "creationPayload"
        FROM progress_trackers WHERE id = $1`, [input.id]);
      if (existing.rows.length) {
        const row = existing.rows[0];
        const original = row.creationPayload;
        const matches = original && Object.keys(input).every(key => input[key] === original[key]);
        if (!matches) throw conflict(mapTracker(row), 'progress_id_reused', 'This tracker id was already used for different details.');
        return mapTracker(row);
      }
      const count = await client.query('SELECT COUNT(*) AS count FROM progress_trackers');
      if (Number(count.rows[0].count) >= Logic.MAX_TRACKERS) {
        throw new ProgressError(409, 'progress_limit', `Keep up to ${Logic.MAX_TRACKERS} trackers.`);
      }
      const created = await client.query(`INSERT INTO progress_trackers
        (id, title, unit, target, current, step, style, color, note, creation_payload)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb) RETURNING ${TRACKER_FIELDS}`,
      [input.id, input.title, input.unit, input.target, input.current, input.step,
        input.style, input.color, input.note, JSON.stringify(input)]);
      await client.query(`INSERT INTO progress_events (id, tracker_id, kind, requested_value, delta, value, note)
        VALUES ($1, $2, 'initial', $3, $3, $3, '')`, [randomUUID(), input.id, input.current]);
      return mapTracker(created.rows[0]);
    });
  }

  async function updateTracker(trackerId, payload) {
    const id = checked(Logic.validateTrackerId(trackerId));
    const input = checked(Logic.validateTrackerUpdate(payload));
    return transaction(async client => {
      const tracker = await lockTracker(client, id);
      checkRevision(tracker, input.revision);
      const updated = { ...tracker, ...input };
      const result = await client.query(`UPDATE progress_trackers
        SET title = $2, unit = $3, target = $4, step = $5, style = $6, color = $7, note = $8,
          revision = revision + 1, updated_at = clock_timestamp()
        WHERE id = $1 RETURNING ${TRACKER_FIELDS}`,
      [id, updated.title, updated.unit, updated.target, updated.step, updated.style, updated.color, updated.note]);
      return mapTracker(result.rows[0]);
    });
  }

  async function changeTracker(trackerId, payload) {
    const id = checked(Logic.validateTrackerId(trackerId));
    const input = checked(Logic.validateTrackerChange(payload));
    return transaction(async client => {
      // The mutation lock also handles the same UUID accidentally used across trackers.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext('progress-mutation:' || $1))`, [input.mutationId]);
      const tracker = await lockTracker(client, id);
      const duplicate = await client.query(`SELECT ${EVENT_FIELDS}, requested_value AS "requestedValue"
        FROM progress_events WHERE id = $1`, [input.mutationId]);
      if (duplicate.rows.length) {
        const row = duplicate.rows[0];
        if (row.trackerId !== id || row.kind !== input.kind || Number(row.requestedValue) !== input.value || row.note !== input.note) {
          throw conflict(tracker, 'progress_mutation_reused', 'This change id was already used for a different change.');
        }
        // Retries remain safe even after a later update has advanced the revision.
        return { tracker, event: mapEvent(row) };
      }
      checkRevision(tracker, input.revision);
      const currentCents = Math.round(tracker.current * 100);
      const inputCents = Math.round(input.value * 100);
      const nextCents = input.kind === 'add' ? currentCents + inputCents : inputCents;
      const value = checked(Logic.validateQuantity(nextCents / 100, 'current'));
      const delta = (nextCents - currentCents) / 100;
      const result = await client.query(`UPDATE progress_trackers
        SET current = $2, revision = revision + 1, updated_at = clock_timestamp()
        WHERE id = $1 RETURNING ${TRACKER_FIELDS}`, [id, value]);
      const event = await client.query(`INSERT INTO progress_events
        (id, tracker_id, kind, requested_value, delta, value, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${EVENT_FIELDS}`,
      [input.mutationId, id, input.kind, input.value, delta, value, input.note]);
      return { tracker: mapTracker(result.rows[0]), event: mapEvent(event.rows[0]) };
    });
  }

  async function deleteTracker(trackerId, payload) {
    const id = checked(Logic.validateTrackerId(trackerId));
    const input = checked(Logic.validateTrackerDelete(payload));
    return transaction(async client => {
      const tracker = await lockTracker(client, id);
      checkRevision(tracker, input.revision);
      await client.query('DELETE FROM progress_trackers WHERE id = $1', [id]);
      return { ok: true };
    });
  }

  async function listHistory(trackerId, filters = {}) {
    const id = checked(Logic.validateTrackerId(trackerId));
    const input = checked(Logic.validateHistoryFilters(filters));
    const exists = await pool.query('SELECT id FROM progress_trackers WHERE id = $1', [id]);
    if (!exists.rows.length) throw new ProgressError(404, 'progress_not_found', 'Tracker not found.');
    const result = await pool.query(`SELECT * FROM (
      SELECT ${EVENT_FIELDS}, sequence, COUNT(*) OVER () AS "totalCount"
      FROM progress_events WHERE tracker_id = $1
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
      ORDER BY sequence DESC LIMIT $4
    ) recent ORDER BY sequence ASC`, [id, input.from || null, input.to || null, HISTORY_LIMIT]);
    const total = result.rows.length ? Number(result.rows[0].totalCount) : 0;
    return { events: result.rows.map(mapEvent), total, truncated: total > HISTORY_LIMIT };
  }

  return { listTrackers, createTracker, updateTracker, changeTracker, deleteTracker, listHistory };
}

module.exports = { ProgressError, HISTORY_LIMIT, initProgressSchema, createProgressStore };
