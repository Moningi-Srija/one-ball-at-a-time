const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8791;
const ACCESS_PIN = process.env.ACCESS_PIN || '';

app.use(express.json());
app.set('trust proxy', 1);
app.use(session({
  store: new pgSession({ pool: db.pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'one-ball-at-a-time-dev-secret',
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
  res.set('Cache-Control', 'no-store');
  if (req.session && req.session.authed) return next();
  res.status(401).json({ error: 'unauthorized' });
}

app.post('/api/login', (req, res) => {
  const { pin } = req.body || {};
  if (!ACCESS_PIN) {
    return res.status(500).json({ error: 'server has no ACCESS_PIN configured' });
  }
  if (pin === ACCESS_PIN) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'wrong pin' });
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

app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

db.init()
  .then(() => {
    app.listen(PORT, () => console.log(`One Ball at a Time listening on ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
