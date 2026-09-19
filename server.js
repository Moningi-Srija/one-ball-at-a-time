const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const db = require('./db');
const { createFixedWindowLimiter, timingSafeStringEqual } = require('./security');
const { validateCountdowns } = require('./countdown-validation');

const app = express();
const PORT = process.env.PORT || 8791;
const ACCESS_PIN = process.env.ACCESS_PIN || '';
const isProduction = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || (isProduction
  ? crypto.randomBytes(32).toString('hex')
  : 'one-ball-at-a-time-dev-secret');
const trustProxy = process.env.TRUST_PROXY === '1' || (isProduction && process.env.RENDER === 'true') ? 1 : false;
const loginLimiter = createFixedWindowLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 });

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not configured. Sessions will be signed with a temporary secret and reset on restart.');
}
if (isProduction && !ACCESS_PIN) {
  console.warn('WARNING: ACCESS_PIN is not configured. Private login will remain unavailable.');
}

app.disable('x-powered-by');
app.enable('strict routing');
app.use(express.json({ limit: '100kb' }));
app.set('trust proxy', trustProxy);
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'"
    ].join('; ')
  });
  next();
});
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(session({
  store: new pgSession({ pool: db.pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  res.status(401).json({ error: 'unauthorized' });
}

app.post('/api/login', (req, res) => {
  const { pin } = req.body || {};
  const loginKey = req.ip || req.socket.remoteAddress || 'unknown';
  const blockedFor = loginLimiter.retryAfter(loginKey);
  if (blockedFor) {
    res.set('Retry-After', String(blockedFor));
    return res.status(429).json({ error: 'too_many_attempts', retryAfter: blockedFor });
  }
  if (!ACCESS_PIN) {
    return res.status(500).json({ error: 'server has no ACCESS_PIN configured' });
  }
  if (typeof pin !== 'string' || pin.length > 40 || !timingSafeStringEqual(pin, ACCESS_PIN)) {
    const retryAfter = loginLimiter.recordFailure(loginKey);
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'too_many_attempts', retryAfter });
    }
    return res.status(401).json({ error: 'wrong pin' });
  }
  loginLimiter.reset(loginKey);
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'failed to create session' });
    req.session.authed = true;
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ error: 'failed to save session' });
      res.json({ ok: true });
    });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ authed: !!(req.session && req.session.authed) });
});

app.get('/api/state', requireAuth, async (req, res) => {
  try {
    const state = await db.getState();
    res.json(state);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to load state' });
  }
});

app.put('/api/active', requireAuth, async (req, res) => {
  try {
    await db.setState('active', req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to save active' });
  }
});

app.put('/api/log', requireAuth, async (req, res) => {
  try {
    await db.setState('log', req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to save log' });
  }
});

app.put('/api/targets', requireAuth, async (req, res) => {
  try {
    await db.setState('targets', req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to save targets' });
  }
});

app.put('/api/frog', requireAuth, async (req, res) => {
  try {
    await db.setState('frog', req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to save frog' });
  }
});

app.put('/api/countdowns', requireAuth, async (req, res) => {
  const result = validateCountdowns(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: 'invalid_countdowns', message: result.error });
  }

  try {
    await db.setState('countdowns', result.value);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to save countdowns' });
  }
});

const sendIndex = (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'index.html'));
};

app.get(['/', '/index.html', '/demo'], sendIndex);
app.get('/demo/', (req, res) => res.redirect(308, '/demo'));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));
app.get('/manifest.webmanifest', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'manifest.webmanifest'));
});
app.get('/demo-manifest.webmanifest', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'demo-manifest.webmanifest'));
});
app.get('/offline.html', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'offline.html'));
});
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'sw.js'));
});
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'deny', index: false }));

db.init()
  .then(() => {
    app.listen(PORT, () => console.log(`One Ball at a Time listening on ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
