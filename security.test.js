const test = require('node:test');
const assert = require('node:assert/strict');
const { createFixedWindowLimiter, timingSafeStringEqual } = require('./security');

test('timingSafeStringEqual accepts only an exact string match', () => {
  assert.equal(timingSafeStringEqual('correct horse', 'correct horse'), true);
  assert.equal(timingSafeStringEqual('correct Horse', 'correct horse'), false);
  assert.equal(timingSafeStringEqual(null, 'correct horse'), false);
});

test('fixed-window limiter blocks after the configured number of failures', () => {
  const limiter = createFixedWindowLimiter({ maxAttempts: 3, windowMs: 60000 });
  assert.equal(limiter.recordFailure('ip', 1000), 0);
  assert.equal(limiter.recordFailure('ip', 2000), 0);
  assert.equal(limiter.recordFailure('ip', 3000), 58);
  assert.equal(limiter.retryAfter('ip', 3000), 58);
});

test('fixed-window limiter resets after success or expiry', () => {
  const limiter = createFixedWindowLimiter({ maxAttempts: 2, windowMs: 1000 });
  limiter.recordFailure('ip', 1000);
  assert.equal(limiter.recordFailure('ip', 1100), 1);
  limiter.reset('ip');
  assert.equal(limiter.retryAfter('ip', 1100), 0);
  limiter.recordFailure('ip', 2000);
  limiter.recordFailure('ip', 2100);
  assert.equal(limiter.retryAfter('ip', 3001), 0);
});
