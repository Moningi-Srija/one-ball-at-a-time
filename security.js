const crypto = require('crypto');

function timingSafeStringEqual(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  const candidateHash = crypto.createHash('sha256').update(candidate, 'utf8').digest();
  const expectedHash = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(candidateHash, expectedHash);
}

function createFixedWindowLimiter({ maxAttempts = 5, windowMs = 15 * 60 * 1000, maxEntries = 10000 } = {}) {
  const attempts = new Map();

  function prune(now = Date.now()) {
    for (const [key, entry] of attempts) {
      if (entry.expiresAt <= now) attempts.delete(key);
    }
  }

  function ensureCapacity(now) {
    if (attempts.size < maxEntries) return;
    prune(now);
    if (attempts.size < maxEntries) return;
    const oldestKey = attempts.keys().next().value;
    if (oldestKey !== undefined) attempts.delete(oldestKey);
  }

  function retryAfter(key, now = Date.now()) {
    const entry = attempts.get(key);
    if (!entry) return 0;
    if (entry.expiresAt <= now) {
      attempts.delete(key);
      return 0;
    }
    if (entry.count < maxAttempts) return 0;
    return Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
  }

  function recordFailure(key, now = Date.now()) {
    let entry = attempts.get(key);
    if (!entry || entry.expiresAt <= now) {
      ensureCapacity(now);
      entry = { count: 0, expiresAt: now + windowMs };
    }
    entry.count += 1;
    attempts.set(key, entry);
    return retryAfter(key, now);
  }

  function reset(key) {
    attempts.delete(key);
  }

  const pruneTimer = setInterval(prune, Math.min(windowMs, 60 * 1000));
  pruneTimer.unref();

  return { prune, recordFailure, reset, retryAfter };
}

module.exports = { createFixedWindowLimiter, timingSafeStringEqual };
