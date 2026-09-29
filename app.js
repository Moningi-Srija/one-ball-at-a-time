const DEMO_MODE = window.location.pathname.replace(/\/+$/, '') === '/demo';
const DEMO_STORAGE_KEY = 'one-ball-at-a-time-demo-v1';

// ---------- Data ----------

const CATEGORIES = [
  { id: 'clean_slate',    label: 'Reset Ritual',           icon: '🧹', desc: 'Cleaning, bathing — least points, but still counted because they\'re necessary.',          points: 2,  color: '#b5a89f' },
  { id: 'glow_up',        label: 'Glow Up',                icon: '💪', desc: 'Eating well, good food, exercise/gym/walking — body maintenance as self-improvement.',      points: 4,  color: '#6bbf6b' },
  { id: 'creator_mode',   label: 'Studio Mode',            icon: '🎨', desc: 'Content creation, art, writing — a step up from chores, but not the top priority.',       points: 5,  color: '#c9a7eb' },
  { id: 'money_moves',    label: 'Money Moves',            icon: '📈', desc: 'Trading and investing practice.',                                                        points: 8,  color: '#d4af37' },
  { id: 'level_up',       label: 'Freedom Blueprint',      icon: '🔓', desc: 'Passport, driving license, swimming/sports classes — unlocking real capability.',         points: 8,  color: '#e3b23c' },
  { id: 'office_grind',   label: 'Show Up & Thrive',       icon: '📎', desc: 'Everyday busywork at the job — low points, still builds a track record.',                 points: 4,  color: '#a7aec2' },
  { id: 'boardroom_brain',label: 'Blair Waldorf Strategy', icon: '🧠', desc: 'Studying office things, design discussions, genuinely understanding & participating — this is where credibility compounds.', points: 10, color: '#5b6ee1' },
  { id: 'empire_building',label: 'Jenny Humphrey Hustle',  icon: '👑', desc: 'CP practice, resume, skills, projects, hackathons, contests, job applications — pick the points per task, this one has range.', points: 9,  color: '#8c52d9' },
  { id: 'ride_or_die',    label: 'Ride or Die',            icon: '💕', desc: 'Love, loyalty, good deeds — how loving and friendly you are, not the top category but good points.', points: 6,  color: '#ff6f9c' },
  { id: 'main_character', label: 'It Girl Energy',         icon: '🌟', desc: 'Socializing, style, going out, plans, presenting yourself well, Instagram stories.',      points: 4,  color: '#4fb3c9' },
  { id: 'passport_stamps',label: 'Passport Stamps',        icon: '✈️', desc: 'Trips and travel.',                                                                       points: 6,  color: '#e6547a' },
  { id: 'other',          label: 'Plot Twist',             icon: '✨', desc: 'Anything that doesn\'t fit elsewhere.',                                                   points: 3,  color: '#9a8f99' },
];

if (DEMO_MODE) {
  const demoCategoryCopy = {
    boardroom_brain: {
      label: 'Strategy Mode',
      desc: 'Deep work, deliberate learning, decisions and preparation that build real capability.'
    },
    empire_building: {
      label: 'Future Builder',
      desc: 'Skills, portfolio work, applications and projects that move your biggest goal forward.'
    }
  };
  CATEGORIES.forEach(category => Object.assign(category, demoCategoryCopy[category.id] || {}));
}

const catById = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const BODY_SLOT_MESSAGES = [
  'This space is for your body — move it because you want to love and care for it.',
  'Remember pretty privilege? Go earn the glow with 30 minutes of movement.',
  'Move your body. Enjoy your freedom. Have some fun outside.',
  'Fresh air is part of freedom too. Take your body somewhere beyond this room.',
  'No perfect workout needed — just give your body 30 honest minutes.',
  'Your body carries every ambition you have. Take care of her today.',
  'Walk, stretch, dance, lift — choose something that makes you feel alive.'
];

const DEMO_BODY_SLOT_MESSAGES = [
  'Protect your energy with one honest block of movement today.',
  'Walk, stretch, dance or lift — choose something that makes you feel alive.',
  'Fresh air and movement count. Your body is one of your protected promises.',
  'No perfect workout needed. Give yourself 30 useful minutes.'
];

const CAREER_SLOT_MESSAGES = [
  'Your quant-dev life will be built in sessions like this one. Put in the work.',
  'Dream job, dream lifestyle, respect and self-satisfaction — earn one piece today.',
  'CP, C++, OS, Architecture, Networks or applications — one serious move brings the switch closer.',
  'You said ASAP. Protect the preparation that makes ASAP possible.',
  'Jenny Humphrey did not wait for permission. Build the skill and make your move.',
  'Your current role pays today. This slot builds the career you actually want.',
  'No zero days on the quant-dev escape plan. Choose the next concrete step.'
];

const DEMO_CAREER_SLOT_MESSAGES = [
  'Skills, portfolio, applications or interview prep — make one concrete move.',
  'Your future changes through focused sessions like this one.',
  'Protect time for the goal that can change what comes next.',
  'One serious move today is more useful than a perfect plan for someday.'
];

const CAREER_SLOT_COPY = DEMO_MODE ? {
  label: '🔒 Your Future-Building Slot',
  emptyTitle: 'Choose your next future-building move',
  cta: '+ Add a task for your biggest goal',
  modalTitle: 'Add Your Future-Building Task',
  saveLabel: 'Protect This Goal',
  placeholder: 'e.g. Prepare for an interview',
  fresh: 'Fresh promise · added just now',
  underDay: hours => `Your future-building task is waiting · added ${hours}h ago`,
  oneDay: hours => `Your big goal has waited since yesterday · ${hours}h more`,
  severalDays: (days, hours) => `Your protected goal is waiting · added ${days}d ${hours}h ago`,
  longWait: (days, hours) => `Make one concrete move · waiting ${days}d ${hours}h`
} : {
  label: '🔒 Your Quant Dev Slot',
  emptyTitle: 'Choose your next quant-dev move',
  cta: '+ Add job-switch preparation',
  modalTitle: 'Add Your Quant Dev Task',
  saveLabel: 'Build My Escape Plan',
  placeholder: 'e.g. Solve 3 Codeforces problems',
  fresh: 'Fresh career move · added just now',
  underDay: hours => `Quant goal waiting · added ${hours}h ago`,
  oneDay: hours => `Your dream role has waited since yesterday · ${hours}h more`,
  severalDays: (days, hours) => `Job-switch prep waiting · added ${days}d ${hours}h ago`,
  longWait: (days, hours) => `ASAP needs action · waiting ${days}d ${hours}h`
};

const EISENHOWER_QUADRANTS = [
  { id: 'do', label: 'Do now', sublabel: 'Urgent + important', hint: 'Your frog belongs here.', color: '#ff6f9c' },
  { id: 'schedule', label: 'Schedule', sublabel: 'Important, not urgent', hint: 'Protect time for it before it becomes urgent.', color: '#e3b23c' },
  { id: 'delegate', label: 'Delegate / simplify', sublabel: 'Urgent, not important', hint: 'Reduce, automate, or get it out quickly.', color: '#4fb3c9' },
  { id: 'eliminate', label: 'Eliminate', sublabel: 'Neither urgent nor important', hint: 'Be intentional about what does not deserve your time.', color: '#a7aec2' },
];

const CATEGORY_MIGRATION = {
  necessities: 'clean_slate',
  food: 'glow_up',
  exercise: 'glow_up',
  creator: 'creator_mode',
  lifestyle: 'level_up',
  office_routine: 'office_grind',
  office_deep: 'boardroom_brain',
  cp: 'empire_building',
  skills: 'empire_building',
  resume: 'empire_building',
  jobs: 'empire_building',
  love: 'ride_or_die',
  social: 'main_character',
};

function migrateCategoryIds(list) {
  let changed = false;
  list.forEach(t => {
    if (CATEGORY_MIGRATION[t.category]) {
      t.category = CATEGORY_MIGRATION[t.category];
      changed = true;
    }
  });
  return changed;
}

const DEFAULT_TARGETS = { day: 25, week: 150, weekend: 50, month: 600 };

const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍜', color: '#e66c9a' },
  { id: 'clothes', label: 'Clothes', icon: '👗', color: '#99507f' },
  { id: 'transport', label: 'Transport', icon: '🚕', color: '#4f9fbd' },
  { id: 'trips', label: 'Trips', icon: '✈️', color: '#a66b2b' },
];
const expenseCategoryById = id => EXPENSE_CATEGORIES.find(category => category.id === id) || EXPENSE_CATEGORIES[0];

const FOCUS_LEVELS = {
  distracted: { label: 'Distracted, but showed up', icon: '🌱' },
  steady: { label: 'Steady', icon: '🌤' },
  deep: { label: 'Deep focus', icon: '✨' },
};

// ---------- Storage (API-backed) ----------

let active = [];   // up to 5 tasks on the board
let log = [];      // finished tasks
let countdowns = []; // moments and milestones worth making visible
let targets = DEFAULT_TARGETS;
let frog = null;   // today's deliberately chosen hardest/most important task
let expenses = []; // normalized expense records; PostgreSQL-backed outside the public demo
let expenseLoadError = '';
let focusSessions = []; // finished/cancelled focus records; PostgreSQL-backed outside the public demo
let activeFocusSession = null;
let focusLoadError = '';
let logCategoryFilter = 'all';
let logDateFilter = '';

async function apiRequest(path, { method = 'GET', body } = {}) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload.message || payload.error || 'request failed');
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

const apiGet = path => apiRequest(path);
const apiPut = (path, body) => apiRequest(path, { method: 'PUT', body });
const apiPost = (path, body) => apiRequest(path, { method: 'POST', body });
const apiDelete = path => apiRequest(path, { method: 'DELETE' });

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4500);
}

function handleSaveError(err) {
  if (err && err.status === 401) {
    showLogin("You got logged out (session expired). Log back in — if you made a change right before this, please redo it just in case.");
  } else {
    showToast("Couldn't save that — check your connection and try again.");
  }
}

function demoTimestamp(daysAgo, hour, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(hour, minute, 0, 0);
  return value.getTime();
}

function demoRecentTimestamp(minutesAgo) {
  const now = Date.now();
  const start = new Date();
  start.setHours(0, 1, 0, 0);
  return Math.min(now, Math.max(start.getTime(), now - minutesAgo * 60000));
}

function createDemoExpenses() {
  const samples = [
    ['demo-expense-1', 240, 0, 'food', 'Lunch and coffee'],
    ['demo-expense-2', 85, 0, 'transport', 'Metro and auto'],
    ['demo-expense-3', 699, 1, 'clothes', 'A top I had saved'],
    ['demo-expense-4', 320, 2, 'food', 'Dinner with friends'],
    ['demo-expense-5', 180, 3, 'transport', 'Cab home'],
    ['demo-expense-6', 1250, 5, 'trips', 'Weekend stay deposit'],
    ['demo-expense-7', 145, 7, 'food', 'Office lunch'],
    ['demo-expense-8', 899, 12, 'clothes', 'Walking shoes'],
    ['demo-expense-9', 560, 20, 'trips', 'Train tickets'],
    ['demo-expense-10', 110, 34, 'transport', 'Airport bus'],
  ];
  return samples.map(([id, amount, daysAgo, category, note], index) => {
    const createdAt = new Date(Date.now() - (daysAgo * 86400000) - index * 60000).toISOString();
    return {
      id,
      amount,
      date: localDateKey(addDays(new Date(), -daysAgo)),
      category,
      note,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function createDemoFocusSessions() {
  const samples = [
    ['demo-focus-1', 0, 52, 'empire_building', 'Practised one difficult interview problem', 'deep'],
    ['demo-focus-2', 0, 24, 'boardroom_brain', 'Read the ticket and wrote down the flow', 'steady'],
    ['demo-focus-3', 1, 45, 'empire_building', 'C++ revision without changing the plan', 'steady'],
    ['demo-focus-4', 2, 18, 'office_grind', 'Cleared the smallest important work block', 'distracted'],
    ['demo-focus-5', 4, 61, 'creator_mode', 'Worked on a personal project', 'deep'],
    ['demo-focus-6', 6, 31, 'empire_building', 'Systems notes and one concrete question', null],
    ['demo-focus-7', 9, 42, 'boardroom_brain', 'Prepared before the discussion', 'steady'],
    ['demo-focus-8', 13, 27, '', '', null],
  ];
  return samples.map(([id, daysAgo, minutes, category, label, focusLevel], index) => {
    const start = new Date();
    start.setDate(start.getDate() - daysAgo);
    start.setHours(9 + (index % 5) * 2, 10 + index, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    return {
      id,
      status: 'finished',
      label,
      category,
      note: '',
      focusLevel,
      mode: index % 3 === 0 ? 'stopwatch' : 'countdown',
      plannedSeconds: index % 3 === 0 ? null : (minutes >= 45 ? 50 : 25) * 60,
      date: localDateKey(start),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      elapsedSeconds: minutes * 60,
      startedAt: start.toISOString(),
      runningSince: null,
      endedAt: end.toISOString(),
      createdAt: start.toISOString(),
      updatedAt: end.toISOString(),
    };
  });
}

function createDemoState() {
  const frogTask = {
    id: 'demo-frog',
    title: 'Send the proposal you have been avoiding',
    note: 'Draft the opening, then finish it in one focused pass.',
    category: 'boardroom_brain',
    quadrant: 'do',
    points: 8,
    bodySlot: false,
    careerSlot: false,
    createdAt: Date.now() - 90 * 60000,
    startedAt: null
  };
  const completed = [
    ['demo-log-1', 'Took a 30-minute walk', 'glow_up', 4, demoRecentTimestamp(75), 30],
    ['demo-log-2', 'Finished the awkward email', 'boardroom_brain', 6, demoRecentTimestamp(150), 24],
    ['demo-log-3', 'Updated the portfolio homepage', 'empire_building', 8, demoTimestamp(1, 18, 20), 55],
    ['demo-log-4', 'Planned a weekend adventure', 'main_character', 4, demoTimestamp(2, 20, 10), 18],
    ['demo-log-5', 'Reviewed the monthly budget', 'money_moves', 8, demoTimestamp(4, 19, 5), 35],
    ['demo-log-6', 'Reset the desk and room', 'clean_slate', 2, demoTimestamp(6, 10, 30), 28],
    ['demo-log-7', 'Wrote one page of a personal project', 'creator_mode', 5, demoTimestamp(8, 21, 15), 42],
    ['demo-log-8', 'Practised a difficult skill', 'empire_building', 7, demoTimestamp(11, 17, 40), 50]
  ].map(([id, title, category, points, completedAt, minutes]) => ({
    id,
    title,
    note: '',
    category,
    points,
    startedAt: completedAt - minutes * 60000,
    completedAt,
    duration: minutes * 60000
  }));

  return {
    active: [
      frogTask,
      {
        id: 'demo-plan',
        title: 'Plan one thing that makes this week exciting',
        note: 'Choose a real plan, not another item to research forever.',
        category: 'main_character',
        quadrant: 'schedule',
        points: 4,
        bodySlot: false,
        careerSlot: false,
        createdAt: Date.now() - 45 * 60000,
        startedAt: null
      },
      {
        id: 'demo-body',
        title: 'Move outside for 30 minutes',
        note: 'Walk, stretch or run — fresh air counts.',
        category: 'glow_up',
        quadrant: 'schedule',
        points: 4,
        bodySlot: true,
        careerSlot: false,
        createdAt: Date.now() - 3 * 3600000,
        startedAt: null
      },
      {
        id: 'demo-future',
        title: 'Spend 45 minutes on your biggest goal',
        note: 'Pick the smallest concrete deliverable and finish it.',
        category: 'empire_building',
        quadrant: 'schedule',
        points: 9,
        bodySlot: false,
        careerSlot: true,
        createdAt: Date.now() - 5 * 3600000,
        startedAt: null
      }
    ],
    log: completed,
    countdowns: [
      {
        id: 'demo-countdown-trip',
        title: 'The trip you cannot stop thinking about',
        note: 'Pack the version of you who actually lived the weeks before it.',
        emoji: '🌴',
        color: '#c0376a',
        style: 'ball-ring',
        startAt: Date.now() - 2 * 86400000,
        targetAt: Date.now() + 28 * 86400000,
        createdAt: Date.now()
      },
      {
        id: 'demo-countdown-launch',
        title: 'Portfolio launch',
        note: 'A visible date turns someday into a plan.',
        emoji: '🚀',
        color: '#7540aa',
        style: 'court-grid',
        startAt: Date.now() - 4 * 86400000,
        targetAt: Date.now() + 10 * 86400000,
        createdAt: Date.now()
      },
      {
        id: 'demo-countdown-weekend',
        title: 'A proper weekend outside',
        note: 'Freedom should feel like going somewhere.',
        emoji: '☀️',
        color: '#367d5b',
        style: 'clean-bar',
        startAt: Date.now() - 86400000,
        targetAt: Date.now() + 2 * 86400000,
        createdAt: Date.now()
      }
    ],
    targets: { ...DEFAULT_TARGETS },
    expenses: createDemoExpenses(),
    focusSessions: createDemoFocusSessions(),
    activeFocusSession: null,
    frog: {
      date: localDateKey(),
      taskId: frogTask.id,
      completed: false,
      task: {
        title: frogTask.title,
        note: frogTask.note,
        category: frogTask.category,
        points: frogTask.points
      }
    }
  };
}

function persistDemoState() {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 4, active, log, countdowns, targets, frog, expenses, focusSessions, activeFocusSession }));
  } catch (err) {
    console.error(err);
    showToast("Demo changes couldn't be saved in this browser.");
  }
}

function saveActive() {
  if (DEMO_MODE) return persistDemoState();
  apiPut('/api/active', active).catch(handleSaveError);
}
function saveLog() {
  publishAndroidWidgetSnapshot();
  if (DEMO_MODE) return persistDemoState();
  apiPut('/api/log', log).catch(handleSaveError);
}
let countdownSaveQueue = Promise.resolve();
function saveCountdowns() {
  publishAndroidWidgetSnapshot();
  if (DEMO_MODE) return persistDemoState();
  const snapshot = countdowns.map(countdown => ({ ...countdown }));
  countdownSaveQueue = countdownSaveQueue
    .then(() => apiPut('/api/countdowns', snapshot))
    .catch(handleSaveError);
  return countdownSaveQueue;
}
function saveTargets() {
  publishAndroidWidgetSnapshot();
  if (DEMO_MODE) return persistDemoState();
  apiPut('/api/targets', targets).catch(handleSaveError);
}
function saveFrog() {
  if (DEMO_MODE) return persistDemoState();
  apiPut('/api/frog', frog).catch(handleSaveError);
}

async function loadState() {
  let state;
  let expensePayload;
  let focusPayload;
  if (DEMO_MODE) {
    try {
      state = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null');
    } catch (err) {
      console.warn('Ignoring invalid demo data.', err);
    }
    if (!state || !Array.isArray(state.active) || !Array.isArray(state.log)) {
      state = createDemoState();
      active = state.active;
      log = state.log;
      countdowns = state.countdowns;
      targets = state.targets;
      frog = state.frog;
      expenses = state.expenses;
      focusSessions = state.focusSessions;
      activeFocusSession = state.activeFocusSession;
      persistDemoState();
      return;
    }
  } else {
    state = await apiGet('/api/state');
    try {
      expensePayload = await apiGet('/api/expenses');
      expenseLoadError = '';
    } catch (error) {
      if (error.status === 401) throw error;
      console.error('Could not load expenses.', error);
      expenseLoadError = 'Your tasks are safe, but expenses could not be loaded. Retry before logging a new one.';
      expensePayload = { expenses: [] };
    }
    try {
      focusPayload = await apiGet('/api/focus-sessions');
      focusLoadError = '';
    } catch (error) {
      if (error.status === 401) throw error;
      console.error('Could not load focus sessions.', error);
      focusLoadError = 'Your tasks are safe, but focus sessions could not be loaded. Check the connection and retry.';
      focusPayload = { sessions: [] };
    }
  }
  active = Array.isArray(state.active) ? state.active : [];
  log = Array.isArray(state.log) ? state.log : [];
  countdowns = Array.isArray(state.countdowns) ? state.countdowns : [];
  targets = { ...DEFAULT_TARGETS, ...(state.targets || {}) };
  frog = state.frog || null;
  if (DEMO_MODE) {
    const hadExpenses = Array.isArray(state.expenses);
    expenses = hadExpenses ? state.expenses : createDemoExpenses();
    const hadFocusSessions = Array.isArray(state.focusSessions);
    focusSessions = hadFocusSessions ? state.focusSessions : createDemoFocusSessions();
    activeFocusSession = state.activeFocusSession || null;
    if (activeFocusSession?.status === 'running') {
      const lastRunningAt = Date.parse(activeFocusSession.runningSince || activeFocusSession.startedAt);
      if (Number.isFinite(lastRunningAt)) {
        activeFocusSession.elapsedSeconds = Math.max(0, Number(activeFocusSession.elapsedSeconds) || 0)
          + Math.max(0, Math.floor((Date.now() - lastRunningAt) / 1000));
        activeFocusSession.runningSince = new Date().toISOString();
      }
    }
    activeFocusSession = activeFocusSession ? syncFocusSession(activeFocusSession) : null;
    if (!hadExpenses || !hadFocusSessions) persistDemoState();
  } else {
    expenses = Array.isArray(expensePayload?.expenses) ? expensePayload.expenses : [];
    const loadedFocusSessions = Array.isArray(focusPayload?.sessions) ? focusPayload.sessions : [];
    activeFocusSession = loadedFocusSessions.find(session => session.status === 'running' || session.status === 'paused') || null;
    focusSessions = loadedFocusSessions.filter(session => session.status !== 'running' && session.status !== 'paused');
    activeFocusSession = activeFocusSession ? syncFocusSession(activeFocusSession) : null;
    focusSessions = focusSessions.map(syncFocusSession);
  }
}

// ---------- Helpers ----------

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

const MAX_TASK_POINTS = 100;

function pointsInQuarterSteps(value, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed * 4) / 4;
  return Math.min(MAX_TASK_POINTS, Math.max(0.25, rounded));
}

const CONFETTI_COLORS = ['#ff5da8', '#e3b23c', '#c9a0e8', '#46d9a6', '#ffffff'];

function burstConfetti(x, y) {
  for (let i = 0; i < 22; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 100;
    piece.style.left = x + 'px';
    piece.style.top = y + 'px';
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
    piece.style.setProperty('--dy', (Math.sin(angle) * dist - 40) + 'px');
    piece.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    piece.style.animationDelay = (Math.random() * 0.12) + 's';
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

function spawnSparkles() {
  const field = document.getElementById('sparkleField');
  const chars = ['✦', '✧', '•'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = chars[Math.floor(Math.random() * chars.length)];
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.fontSize = (8 + Math.random() * 10) + 'px';
    s.style.color = Math.random() > 0.5 ? 'var(--accent-2)' : 'var(--accent)';
    s.style.animationDuration = (7 + Math.random() * 9) + 's';
    s.style.animationDelay = (Math.random() * 9) + 's';
    field.appendChild(s);
  }
}

function fmtDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtClock(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = n => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function fmtDateTime(ms) {
  return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderDayClock() {
  const clock = document.getElementById('dayClock');
  const timeLeft = timeLeftToday().replace(' left today', '');
  clock.textContent = timeLeft;
  clock.parentElement.setAttribute('aria-label', `${timeLeft} left today`);
}

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function localDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeLeftToday() {
  const now = new Date();
  const end = addDays(startOfDay(now), 1);
  const minutes = Math.max(0, Math.ceil((end - now) / 60000));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m left today` : `${mins}m left today`;
}

// The Android wrapper exposes this single, origin-scoped message endpoint. Keep
// its payload deliberately small: widgets need the score and countdown display
// fields, never task titles, notes, authentication data, or the finished log.
function buildAndroidWidgetSnapshot(now = new Date()) {
  const start = startOfDay(now).getTime();
  const dayEndsAt = addDays(startOfDay(now), 1).getTime();
  const todayTasks = log.filter(task => {
    const completedAt = Number(task?.completedAt);
    return Number.isFinite(completedAt) && completedAt >= start && completedAt < dayEndsAt;
  });
  const points = todayTasks.reduce((total, task) => {
    const value = Number(task?.points);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
  const configuredTarget = Number(targets?.day);
  let timeZone = 'UTC';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone;
  } catch (error) {
    console.warn('Could not resolve the device time zone for the Android widget.', error);
  }

  const allowedStyles = new Set(['ball-ring', 'court-grid', 'clean-bar']);
  const safeCountdowns = countdowns.slice(0, MAX_COUNTDOWNS).flatMap(countdown => {
    const id = typeof countdown?.id === 'string' ? countdown.id.trim().slice(0, 160) : '';
    const title = typeof countdown?.title === 'string' ? countdown.title.trim().slice(0, 120) : '';
    const startAt = Number(countdown?.startAt);
    const targetAt = Number(countdown?.targetAt);
    if (!id || !title || !Number.isFinite(startAt) || !Number.isFinite(targetAt) || targetAt <= startAt) return [];
    const emoji = typeof countdown.emoji === 'string' ? countdown.emoji.trim().slice(0, 24) : '';
    const color = typeof countdown.color === 'string' && /^#[0-9a-f]{6}$/i.test(countdown.color)
      ? countdown.color
      : '#c0376a';
    return [{
      id,
      title,
      emoji: emoji || '♡',
      color,
      style: allowedStyles.has(countdown.style) ? countdown.style : 'ball-ring',
      startAt: Math.round(startAt),
      targetAt: Math.round(targetAt)
    }];
  });

  return {
    generatedAt: Date.now(),
    timeZone,
    today: {
      dateKey: localDateKey(now),
      points: Math.round(points * 100) / 100,
      target: Number.isFinite(configuredTarget) ? Math.max(0, configuredTarget) : DEFAULT_TARGETS.day,
      completedCount: todayTasks.length,
      dayEndsAt
    },
    countdowns: safeCountdowns
  };
}

function publishAndroidWidgetSnapshot() {
  const bridge = window.oneBallWidget;
  if (!bridge || typeof bridge.postMessage !== 'function') return;
  try {
    bridge.postMessage(JSON.stringify(buildAndroidWidgetSnapshot()));
  } catch (error) {
    // A bridge failure must never interrupt the website's normal save flow.
    console.warn('Could not refresh the Android Home Screen widget.', error);
  }
}

// Monday-start week. offset is in units of the given period, relative to now
// (0 = current day/week/weekend/month, -1 = previous, +1 = next, etc.)
function mondayOf(d) {
  const d0 = startOfDay(d);
  const dow = d0.getDay(); // 0 Sun .. 6 Sat
  return addDays(d0, dow === 0 ? -6 : 1 - dow);
}

function getRange(period, offset = 0) {
  const now = new Date();
  if (period === 'day') {
    const ref = addDays(startOfDay(now), offset);
    return [ref.getTime(), addDays(ref, 1).getTime()];
  }
  if (period === 'week' || period === 'weekend') {
    const monday = addDays(mondayOf(now), offset * 7);
    if (period === 'week') return [monday.getTime(), addDays(monday, 7).getTime()];
    const saturday = addDays(monday, 5);
    return [saturday.getTime(), addDays(saturday, 2).getTime()];
  }
  if (period === 'month') {
    const y = now.getFullYear();
    const m = now.getMonth() + offset;
    return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
  }
}

// Converts an arbitrary picked date into the offset (for the given period)
// whose range contains that date.
function offsetFromDate(period, pickedDate) {
  const now = new Date();
  if (period === 'day') {
    return Math.round((startOfDay(pickedDate) - startOfDay(now)) / 86400000);
  }
  if (period === 'week' || period === 'weekend') {
    return Math.round((mondayOf(pickedDate) - mondayOf(now)) / (7 * 86400000));
  }
  if (period === 'month') {
    return (pickedDate.getFullYear() - now.getFullYear()) * 12 + (pickedDate.getMonth() - now.getMonth());
  }
}

function pointsInRange(period, offset = 0) {
  const [start, end] = getRange(period, offset);
  return log.filter(t => t.completedAt >= start && t.completedAt < end)
            .reduce((sum, t) => sum + t.points, 0);
}

function categoryPointsInRange(period, offset = 0) {
  const [start, end] = getRange(period, offset);
  const map = {};
  CATEGORIES.forEach(c => map[c.id] = 0);
  log.forEach(t => {
    if (t.completedAt >= start && t.completedAt < end) {
      map[t.category] = (map[t.category] || 0) + t.points;
    }
  });
  return map;
}

const UNIT_LABEL = { day: 'day', week: 'week', weekend: 'weekend', month: 'month' };

function rangeLabel(period, offset) {
  const [start, end] = getRange(period, offset);
  const startD = new Date(start);
  const endD = new Date(end - 1);
  if (period === 'day') {
    return startD.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (period === 'month') {
    return startD.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const s = startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const e = endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

function rangeSubLabel(period, offset) {
  if (offset === 0) return `current ${UNIT_LABEL[period]}`;
  const n = Math.abs(offset);
  const unit = UNIT_LABEL[period] + (n === 1 ? '' : 's');
  return offset < 0 ? `${n} ${unit} ago` : `${n} ${unit} from now`;
}

// ---------- Tabs ----------

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'board') renderBoard();
    if (btn.dataset.tab === 'countdowns') renderCountdowns();
    if (btn.dataset.tab === 'matrix') renderMatrix();
    if (btn.dataset.tab === 'dashboard') renderDashboard();
    if (btn.dataset.tab === 'focus') renderFocus();
    if (btn.dataset.tab === 'analytics') renderAnalytics();
    if (btn.dataset.tab === 'expenses') renderExpenses();
    if (btn.dataset.tab === 'log') renderLog();
    if (btn.dataset.tab === 'guide') renderGuide();
    if (btn.dataset.tab === 'targets') renderTargets();
    updateFocusMiniTimer();
  });
});

function applyDeepLinkFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get('tab');
  if (!['board', 'countdowns', 'focus', 'analytics', 'expenses'].includes(requestedTab)) return;
  const tabButton = document.querySelector(`.tab-btn[data-tab="${requestedTab}"]`);
  if (!tabButton) return;
  tabButton.click();

  if (requestedTab !== 'countdowns') return;
  const requestedCountdownId = (params.get('countdown') || '').slice(0, 160);
  if (!requestedCountdownId) return;
  requestAnimationFrame(() => {
    const card = [...document.querySelectorAll('.countdown-card')]
      .find(item => item.dataset.countdownId === requestedCountdownId);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// ---------- Countdowns ----------

const COUNTDOWN_STYLE_CLASS = {
  'ball-ring': 'style-ring',
  'court-grid': 'style-grid',
  'clean-bar': 'style-bar'
};

const COUNTDOWN_STYLE_LABEL = {
  'ball-ring': 'Ball Ring',
  'court-grid': 'Court Grid',
  'clean-bar': 'Clean Bar'
};
const MAX_COUNTDOWNS = 100;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function countdownMetrics(countdown, now = Date.now()) {
  const duration = Math.max(1, countdown.targetAt - countdown.startAt);
  const progress = clamp((now - countdown.startAt) / duration);
  const remaining = countdown.targetAt - now;
  return {
    progress,
    remaining,
    expired: remaining <= 0,
    notStarted: now < countdown.startAt
  };
}

function formatCountdownDistance(milliseconds, expired = false) {
  const absolute = Math.max(0, Math.abs(milliseconds));
  const minutes = Math.floor(absolute / 60000);
  const hours = Math.floor(absolute / 3600000);
  const days = Math.ceil(absolute / 86400000);
  let amount;
  if (absolute < 60000) amount = 'less than a minute';
  else if (absolute < 3600000) amount = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  else if (absolute < 86400000) {
    const leftoverMinutes = Math.floor((absolute % 3600000) / 60000);
    amount = `${hours}h${leftoverMinutes ? ` ${leftoverMinutes}m` : ''}`;
  } else {
    amount = `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return expired ? `${amount} ago` : `${amount} left`;
}

function countdownTargetLabel(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function renderTodayCountdown() {
  const container = document.getElementById('countdownToday');
  if (!container) return;
  const now = new Date();
  const start = startOfDay(now).getTime();
  const end = addDays(startOfDay(now), 1).getTime();
  const elapsed = clamp((now.getTime() - start) / (end - start));
  const todayTasks = todayCompletedTasks();
  const todayPoints = todayTasks.reduce((sum, task) => sum + Number(task.points || 0), 0);
  const dailyTarget = Math.max(1, Number(targets.day) || DEFAULT_TARGETS.day);
  const pointProgress = clamp(todayPoints / dailyTarget);
  const remainingMinutes = Math.max(0, Math.ceil((end - now.getTime()) / 60000));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const minutePart = remainingMinutes % 60;
  const timeCopy = remainingHours > 0 ? `${remainingHours}h ${minutePart}m` : `${minutePart}m`;

  container.innerHTML = '';
  const card = document.createElement('article');
  card.className = 'countdown-today-card';
  card.setAttribute('aria-label', `${timeCopy} left today, ${todayPoints} of ${dailyTarget} points complete`);
  card.innerHTML = `
    <div class="countdown-today-main">
      <div class="countdown-today-copy">
        <p class="countdown-today-eyebrow">Still yours</p>
        <strong class="countdown-today-value"></strong>
        <p class="countdown-today-sub"></p>
      </div>
      <div class="countdown-today-stats"></div>
    </div>
    <div class="countdown-today-progress" aria-hidden="true"><span class="countdown-today-progress-fill"></span></div>
  `;
  card.querySelector('.countdown-today-value').textContent = `${timeCopy} left today`;
  card.querySelector('.countdown-today-sub').textContent = todayPoints >= dailyTarget
    ? 'Goal reached. The remaining hours are yours to enjoy or use beautifully.'
    : `${Math.max(0, dailyTarget - todayPoints)} points between now and the day you said you wanted.`;
  const stats = card.querySelector('.countdown-today-stats');
  [
    [`${todayPoints} / ${dailyTarget}`, 'points'],
    [String(todayTasks.length), todayTasks.length === 1 ? 'task lived' : 'tasks lived'],
    [`${Math.round(elapsed * 100)}%`, 'day elapsed']
  ].forEach(([value, label]) => {
    const stat = document.createElement('div');
    stat.className = 'countdown-today-stat';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    stat.append(strong, span);
    stats.appendChild(stat);
  });
  const fill = card.querySelector('.countdown-today-progress-fill');
  fill.style.width = `${Math.round(pointProgress * 100)}%`;
  container.appendChild(card);
}

function createCountdownVisual(countdown, metrics) {
  const progress = metrics.progress;
  if (countdown.style === 'court-grid') {
    const wrapper = document.createElement('div');
    wrapper.className = 'countdown-court-visual';
    const grid = document.createElement('div');
    grid.className = 'countdown-dot-grid';
    const daysLeft = Math.max(1, Math.ceil(Math.max(0, metrics.remaining) / 86400000));
    const visibleDays = Math.min(daysLeft, 400);
    const columns = Math.min(14, Math.max(5, Math.ceil(Math.sqrt(visibleDays))));
    grid.style.setProperty('--countdown-dot-columns', String(columns));
    wrapper.setAttribute('aria-label', `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`);
    grid.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < visibleDays; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'countdown-dot';
      dot.setAttribute('aria-hidden', 'true');
      grid.appendChild(dot);
    }
    wrapper.appendChild(grid);
    if (visibleDays < daysLeft) {
      grid.classList.add('is-capped');
      const note = document.createElement('span');
      note.className = 'countdown-dot-overflow';
      note.textContent = `${visibleDays} dots shown · ${daysLeft.toLocaleString()} days left`;
      wrapper.appendChild(note);
    }
    return wrapper;
  }

  if (countdown.style === 'clean-bar') {
    const wrapper = document.createElement('div');
    wrapper.className = 'countdown-bar-visual';
    const percent = document.createElement('strong');
    percent.textContent = `${Math.round(progress * 100)}% travelled`;
    const track = document.createElement('div');
    track.className = 'countdown-bar-track';
    const fill = document.createElement('span');
    fill.className = 'countdown-bar-fill';
    fill.style.width = `${Math.round(progress * 100)}%`;
    track.appendChild(fill);
    wrapper.append(percent, track);
    return wrapper;
  }

  const ring = document.createElement('div');
  ring.className = 'countdown-ring';
  ring.style.setProperty('--countdown-progress', `${Math.round(progress * 360)}deg`);
  const inside = document.createElement('div');
  inside.className = 'countdown-ring-inner';
  const value = document.createElement('strong');
  value.textContent = `${Math.round(progress * 100)}%`;
  const label = document.createElement('span');
  label.textContent = 'lived';
  inside.append(value, label);
  ring.appendChild(inside);
  return ring;
}

function renderCountdownCard(countdown, now) {
  const metrics = countdownMetrics(countdown, now);
  const card = document.createElement('article');
  card.dataset.countdownId = countdown.id;
  const styleClass = COUNTDOWN_STYLE_CLASS[countdown.style] || COUNTDOWN_STYLE_CLASS['ball-ring'];
  card.className = `countdown-card ${styleClass}${metrics.expired ? ' is-expired' : ''}`;
  card.style.setProperty('--countdown-color', countdown.color || '#c0376a');
  card.style.setProperty('--countdown-progress', `${Math.round(metrics.progress * 360)}deg`);

  const header = document.createElement('div');
  header.className = 'countdown-card-head';
  const icon = document.createElement('span');
  icon.className = 'countdown-card-icon';
  icon.textContent = countdown.emoji || '♡';
  const heading = document.createElement('div');
  heading.className = 'countdown-card-heading';
  const title = document.createElement('h4');
  title.className = 'countdown-card-title';
  title.textContent = countdown.title;
  const styleLabel = document.createElement('span');
  styleLabel.className = 'countdown-style-label';
  styleLabel.textContent = COUNTDOWN_STYLE_LABEL[countdown.style] || 'Ball Ring';
  heading.append(title, styleLabel);
  header.append(icon, heading);
  card.appendChild(header);

  if (countdown.note) {
    const note = document.createElement('p');
    note.className = 'countdown-card-note';
    note.textContent = countdown.note;
    card.appendChild(note);
  }

  card.appendChild(createCountdownVisual(countdown, metrics));

  const time = document.createElement('strong');
  time.className = 'countdown-time';
  if (metrics.expired) time.textContent = `It happened · ${formatCountdownDistance(metrics.remaining, true)}`;
  else if (metrics.notStarted) {
    const untilStart = formatCountdownDistance(countdown.startAt - now).replace(/ left$/, '');
    time.textContent = `Starts in ${untilStart}`;
  }
  else time.textContent = formatCountdownDistance(metrics.remaining);
  const target = document.createElement('p');
  target.className = 'countdown-target';
  target.textContent = `Target · ${countdownTargetLabel(countdown.targetAt)}`;
  card.append(time, target);

  const actions = document.createElement('div');
  actions.className = 'countdown-card-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'btn ghost small';
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => openCountdownModal(countdown.id));
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn ghost small countdown-delete';
  remove.textContent = 'Delete';
  remove.addEventListener('click', () => deleteCountdown(countdown.id));
  actions.append(edit, remove);
  card.appendChild(actions);
  return card;
}

function renderCountdowns() {
  renderTodayCountdown();
  const grid = document.getElementById('countdownGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!countdowns.length) {
    const empty = document.createElement('div');
    empty.className = 'countdown-empty';
    empty.innerHTML = '<span class="countdown-empty-icon" aria-hidden="true">♡</span><strong>Your next chapter needs a date.</strong><p>Add a trip, deadline, exam, launch, birthday, or any moment you want to see getting closer.</p>';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn primary small';
    add.textContent = 'Add the first one';
    add.addEventListener('click', () => openCountdownModal());
    empty.appendChild(add);
    grid.appendChild(empty);
    return;
  }

  const now = Date.now();
  [...countdowns]
    .sort((a, b) => {
      const aExpired = a.targetAt <= now;
      const bExpired = b.targetAt <= now;
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return aExpired ? b.targetAt - a.targetAt : a.targetAt - b.targetAt;
    })
    .forEach(countdown => grid.appendChild(renderCountdownCard(countdown, now)));
}

function toLocalDateTimeInput(timestamp) {
  const date = new Date(timestamp);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

let editingCountdownId = null;

function openCountdownModal(id = null) {
  const backdrop = document.getElementById('countdownModalBackdrop');
  const existing = id ? countdowns.find(item => item.id === id) : null;
  const now = Date.now();
  editingCountdownId = existing ? existing.id : null;
  document.getElementById('countdownModalTitle').textContent = existing ? 'Edit Countdown' : 'Add a Countdown';
  document.getElementById('saveCountdown').textContent = existing ? 'Save changes' : 'Save countdown';
  document.getElementById('countdownTitle').value = existing?.title || '';
  document.getElementById('countdownNote').value = existing?.note || '';
  document.getElementById('countdownEmoji').value = existing?.emoji || '✨';
  document.getElementById('countdownColor').value = existing?.color || '#c0376a';
  document.getElementById('countdownStyle').value = existing?.style || 'ball-ring';
  document.getElementById('countdownStartAt').value = toLocalDateTimeInput(existing?.startAt || now);
  document.getElementById('countdownTargetAt').value = toLocalDateTimeInput(existing?.targetAt || (now + 7 * 86400000));
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('countdownTitle').focus(), 50);
}

function closeCountdownModal() {
  const backdrop = document.getElementById('countdownModalBackdrop');
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  editingCountdownId = null;
}

function saveCountdownFromModal() {
  const titleInput = document.getElementById('countdownTitle');
  const title = titleInput.value.trim().slice(0, 120);
  const startAt = new Date(document.getElementById('countdownStartAt').value).getTime();
  const targetAt = new Date(document.getElementById('countdownTargetAt').value).getTime();
  if (!title) {
    showToast('Give this countdown a name first.');
    titleInput.focus();
    return;
  }
  if (!Number.isFinite(startAt) || !Number.isFinite(targetAt)) {
    showToast('Choose both a start and target date.');
    return;
  }
  if (targetAt <= startAt) {
    showToast('The target moment must be after the start.');
    document.getElementById('countdownTargetAt').focus();
    return;
  }
  const style = document.getElementById('countdownStyle').value;
  const existing = editingCountdownId ? countdowns.find(item => item.id === editingCountdownId) : null;
  if (!existing && countdowns.length >= MAX_COUNTDOWNS) {
    showToast(`You can keep up to ${MAX_COUNTDOWNS} countdowns. Delete an old one before adding another.`);
    return;
  }
  const record = {
    id: existing?.id || uid(),
    title,
    note: document.getElementById('countdownNote').value.trim().slice(0, 500),
    emoji: document.getElementById('countdownEmoji').value.trim().slice(0, 24) || '♡',
    color: document.getElementById('countdownColor').value,
    style: COUNTDOWN_STYLE_CLASS[style] ? style : 'ball-ring',
    startAt,
    targetAt,
    createdAt: existing?.createdAt || Date.now()
  };
  if (existing) Object.assign(existing, record);
  else countdowns.push(record);
  saveCountdowns();
  closeCountdownModal();
  renderCountdowns();
  showToast(existing ? 'Countdown updated.' : 'Countdown added — now it is real.');
}

function deleteCountdown(id) {
  const countdown = countdowns.find(item => item.id === id);
  if (!countdown || !window.confirm(`Delete the countdown for “${countdown.title}”?`)) return;
  countdowns = countdowns.filter(item => item.id !== id);
  saveCountdowns();
  renderCountdowns();
}

document.getElementById('addCountdown').addEventListener('click', () => openCountdownModal());
document.getElementById('cancelCountdown').addEventListener('click', closeCountdownModal);
document.getElementById('saveCountdown').addEventListener('click', saveCountdownFromModal);
document.getElementById('countdownModalBackdrop').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeCountdownModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.getElementById('countdownModalBackdrop').classList.contains('open')) {
    closeCountdownModal();
  }
});

setInterval(() => {
  const tab = document.getElementById('tab-countdowns');
  const grid = document.getElementById('countdownGrid');
  const modalOpen = document.getElementById('countdownModalBackdrop').classList.contains('open');
  const keyboardFocusIsInsideGrid = grid.contains(document.activeElement);
  if (tab.classList.contains('active') && !modalOpen && !keyboardFocusIsInsideGrid) renderCountdowns();
}, 60 * 1000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && document.getElementById('tab-countdowns').classList.contains('active')) renderCountdowns();
});

let deferredInstallPrompt = null;

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function installFallbackMessage() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return isIOS
    ? 'On iPhone: tap Share, then “Add to Home Screen”.'
    : 'Open your browser menu and choose “Install app” or “Add to Home screen”.';
}

function updateInstallExperience() {
  const button = document.getElementById('installApp');
  const help = document.getElementById('installHelp');
  if (!button || !help) return;
  if (isStandaloneApp()) {
    button.textContent = 'Installed ✓';
    button.disabled = true;
    help.textContent = 'You are already using the app version.';
  } else if (deferredInstallPrompt) {
    button.textContent = 'Install app';
    button.disabled = false;
    help.textContent = 'One tap, then it lives beside your other apps.';
  } else {
    button.textContent = 'How to install';
    button.disabled = false;
    help.textContent = installFallbackMessage();
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallExperience();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  updateInstallExperience();
  showToast('One Ball is on your Home Screen 🎀');
});

document.getElementById('installApp').addEventListener('click', async () => {
  if (!deferredInstallPrompt) {
    document.getElementById('installHelp').textContent = installFallbackMessage();
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallExperience();
});

function configurePwa() {
  const manifest = document.getElementById('appManifest');
  if (manifest && DEMO_MODE) manifest.href = '/demo-manifest.webmanifest';
  updateInstallExperience();
  if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/sw.js').catch(error => console.warn('App installation is unavailable.', error));
  }
}

// ---------- Board ----------

const URGENCY_POOL = {
  dayZero: [
    "Nothing logged, nothing on the board. That's not a blank slate — that's a countdown that already started without you. Add one task right now and start it. Not later. The version of you who does it \"later\" doesn't exist yet, and might never show up.",
    "Life is too short to spend it flat on a bed scrolling Instagram. You get exactly one of these — this specific day — and telling yourself it doesn't matter because it's \"just one day\" is precisely how all of them go.",
    "You're not resting. You're horizontal and scrolling while your one life quietly ticks down in the background. Put the phone down and add a task before you talk yourself into believing lying there counts as anything."
  ],
  eveningZero: [
    "It's evening and you've earned exactly zero points today. Not a slow day — a wasted one. There are a couple of hours left before this day is gone for good, and it never comes back for a rewrite. Get up and start one task right now.",
    "Another night about to close and all you've got to show for it is a sore thumb from scrolling. Instagram will still be there in an hour. This exact version of today will not."
  ],
  afternoonZero: [
    "It's already afternoon and the board says zero. Every hour you spend waiting for \"the right moment\" is an hour you chose to lose — there is no right moment, there's just now, and now is running out.",
    "Half the daylight is gone and you've spent it in bed or on your phone. That's not a rest day, that's a life you're not fully using while you still have it."
  ],
  streakBroken: [
    "You had momentum going and let it die. That streak took real days to build and one day of nothing to erase. Stop mourning it and start a new one today — not tomorrow, today."
  ],
  behindPace: [
    "You're at {todayPts}/{todayTarget} points with the day almost gone. This is exactly the moment most people quietly give up and call it a wash. Don't be most people — finish one more thing before you let yourself rest."
  ],
  targetHit: [
    "Target hit. That buys you exactly nothing tomorrow — it resets to zero and doesn't care what you did today. Enjoy this for a minute, then start thinking about the next one."
  ],
  weekDead: [
    "It's the middle of the week and the tally is zero. However this week ends, you don't get it back to try again — this exact week only happens once."
  ],
  default: [
    "Time is not renewable. Every day you choose comfort over effort is a day you don't get back — no refund, no replay. Scrolling, sleeping in, \"I'll start Monday\" — that isn't rest, that's your life quietly draining while you tell yourself you'll get to it. Nobody is coming to hand you the outcome you want. Get up. Pick one thing. Finish it. Do it today — \"eventually\" is how a decade disappears.",
    "Life is short enough without spending it in bed or scrolling Instagram. Use today like it's the only one you get — because eventually, one of them actually will be.",
    "Nobody on their deathbed brags about the hours they got in on their phone. Use this one to the fullest instead of numbing through it."
  ],
};

function pickUrgency(key) {
  const pool = URGENCY_POOL[key];
  // Deterministic per hour+tier so repeated re-renders (e.g. the live timer
  // tick) don't flicker between variants — it only changes once the hour
  // or the tier itself changes.
  const hourSlot = Math.floor(Date.now() / (60 * 60 * 1000));
  let seed = hourSlot;
  for (let i = 0; i < key.length; i++) seed += key.charCodeAt(i);
  return pool[seed % pool.length];
}

function computeUrgencyMessage() {
  const now = new Date();
  const hour = now.getHours();
  const todayPts = pointsInRange('day', 0);
  const todayTarget = targets.day || 1;
  const weekPts = pointsInRange('week', 0);
  const streaks = computeStreaks();

  if (log.length === 0 && active.length === 0) {
    return { title: 'Day Zero', text: pickUrgency('dayZero') };
  }

  if (todayPts === 0 && hour >= 19) {
    return { title: 'The Day Is Almost Over', text: pickUrgency('eveningZero') };
  }

  if (todayPts === 0 && hour >= 14) {
    return { title: 'Half The Day, Nothing Done', text: pickUrgency('afternoonZero') };
  }

  if (streaks.current === 0 && log.length > 0) {
    return { title: 'Streak: Broken', text: pickUrgency('streakBroken') };
  }

  if ((todayPts / todayTarget) < 0.5 && hour >= 16) {
    return { title: 'Behind, Not Beaten', text: pickUrgency('behindPace').replace('{todayPts}', todayPts).replace('{todayTarget}', todayTarget) };
  }

  if (todayPts >= todayTarget) {
    return { title: "Good — Now Don't Stop", text: pickUrgency('targetHit') };
  }

  if (weekPts === 0 && now.getDay() >= 3) {
    return { title: 'Half The Week Is Already Gone', text: pickUrgency('weekDead') };
  }

  return { title: 'Carpe Diem', text: pickUrgency('default') };
}

function renderUrgencyBanner() {
  const { title, text } = computeUrgencyMessage();
  document.getElementById('cdTitle').textContent = title;
  document.getElementById('cdText').textContent = text;
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  const now = Date.now();
  const bodyTask = active.find(task => task.bodySlot);
  const careerTask = active.find(task => task.careerSlot);
  const flexibleTasks = active.filter(task => !task.bodySlot && !task.careerSlot);

  for (let i = 0; i < Math.max(3, flexibleTasks.length); i++) {
    const task = flexibleTasks[i];
    if (!task) {
      const slot = document.createElement('div');
      slot.className = 'slot-empty';
      slot.textContent = '+ Add Task';
      slot.addEventListener('click', () => openAddModal('flexible'));
      board.appendChild(slot);
      continue;
    }
    board.appendChild(renderTaskCard(task, now));
  }

  board.appendChild(renderBodySlot(bodyTask, now));
  board.appendChild(renderCareerSlot(careerTask, now));

  renderTodayProgress();
  renderFrog();
}

function renderTaskCard(task, now, protectedSlot = null) {
    const isBodySlot = protectedSlot === 'body';
    const isCareerSlot = protectedSlot === 'career';
    const cat = catById(task.category);
    const card = document.createElement('div');
    card.className = `task-card${isBodySlot ? ' body-task-card' : ''}${isCareerSlot ? ' career-task-card' : ''}`;

    if (isBodySlot) {
      const slotLabel = document.createElement('div');
      slotLabel.className = 'body-slot-label';
      slotLabel.textContent = '🔒 Your Body Slot';
      card.appendChild(slotLabel);
    } else if (isCareerSlot) {
      const slotLabel = document.createElement('div');
      slotLabel.className = 'career-slot-label';
      slotLabel.textContent = CAREER_SLOT_COPY.label;
      card.appendChild(slotLabel);
    }

    const badge = document.createElement('span');
    badge.className = 'cat-badge';
    badge.style.background = cat.color;
    badge.textContent = `${cat.icon} ${cat.label}`;

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    card.appendChild(badge);
    card.appendChild(title);

    if (typeof task.note === 'string' && task.note.trim()) {
      const notePreview = document.createElement('div');
      notePreview.className = 'task-note-preview';
      notePreview.textContent = `📝 ${task.note.trim()}`;
      card.appendChild(notePreview);
    }

    if (isBodySlot) {
      const motivation = document.createElement('div');
      motivation.className = 'body-slot-message';
      motivation.textContent = bodyMessageForToday();
      card.appendChild(motivation);
      const waiting = document.createElement('div');
      waiting.className = 'body-waiting';
      waiting.textContent = bodyWaitingCopy(task.createdAt);
      card.appendChild(waiting);
    } else if (isCareerSlot) {
      const motivation = document.createElement('div');
      motivation.className = 'career-slot-message';
      motivation.textContent = careerMessageForToday();
      card.appendChild(motivation);
      const waiting = document.createElement('div');
      waiting.className = 'career-waiting';
      waiting.textContent = careerWaitingCopy(task.createdAt);
      card.appendChild(waiting);
    }

    if (task.startedAt) {
      card.classList.add('is-running');
      const timer = document.createElement('div');
      timer.className = 'timer';
      timer.textContent = fmtClock(now - task.startedAt);
      card.appendChild(timer);

      const meta = document.createElement('div');
      meta.className = 'task-meta';
      meta.textContent = `${task.points} pts · started ${fmtDateTime(task.startedAt)}`;
      card.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const finishBtn = document.createElement('button');
      finishBtn.className = 'btn finish small';
      finishBtn.textContent = 'Finish';
      finishBtn.addEventListener('click', e => {
        const r = e.currentTarget.getBoundingClientRect();
        burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
        finishTask(task.id);
      });
      const editBtn = document.createElement('button');
      editBtn.className = 'btn ghost small';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditModal(task.id));
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn danger-ghost small';
      removeBtn.textContent = 'Remove';
      removeBtn.title = 'Remove this task without marking it finished';
      removeBtn.addEventListener('click', () => removeTask(task.id, true));
      actions.appendChild(finishBtn);
      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);
      card.appendChild(actions);
    } else {
      const meta = document.createElement('div');
      meta.className = 'task-meta';
      meta.textContent = `${task.points} pts · not started`;
      card.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const startBtn = document.createElement('button');
      startBtn.className = 'btn primary small';
      startBtn.textContent = 'Start';
      startBtn.addEventListener('click', () => startTask(task.id));
      const editBtn = document.createElement('button');
      editBtn.className = 'btn ghost small';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditModal(task.id));
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn danger-ghost small';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeTask(task.id));
      actions.appendChild(startBtn);
      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);
      card.appendChild(actions);
    }

    return card;
}

function renderBodySlot(task, now) {
  if (task) return renderTaskCard(task, now, 'body');

  const slot = document.createElement('button');
  slot.type = 'button';
  slot.className = 'body-slot-empty';
  slot.innerHTML = `
    <span class="body-slot-label">🔒 Your Body Slot</span>
    <strong>Choose today’s movement</strong>
    <span class="body-slot-message">${bodyMessageForToday()}</span>
    <span class="body-slot-cta">+ Add a 30-minute body task</span>
  `;
  slot.addEventListener('click', () => openAddModal('body'));
  return slot;
}

function renderCareerSlot(task, now) {
  if (task) return renderTaskCard(task, now, 'career');

  const slot = document.createElement('button');
  slot.type = 'button';
  slot.className = 'career-slot-empty';
  slot.innerHTML = `
    <span class="career-slot-label">${CAREER_SLOT_COPY.label}</span>
    <strong>${CAREER_SLOT_COPY.emptyTitle}</strong>
    <span class="career-slot-message">${careerMessageForToday()}</span>
    <span class="career-slot-cta">${CAREER_SLOT_COPY.cta}</span>
  `;
  slot.addEventListener('click', () => openAddModal('career'));
  return slot;
}

function bodyMessageForToday() {
  const pool = DEMO_MODE ? DEMO_BODY_SLOT_MESSAGES : BODY_SLOT_MESSAGES;
  const messageIndex = Math.abs(localDateKey().split('').reduce((total, char) => total + char.charCodeAt(0), 0)) % pool.length;
  return pool[messageIndex];
}

function careerMessageForToday() {
  const pool = DEMO_MODE ? DEMO_CAREER_SLOT_MESSAGES : CAREER_SLOT_MESSAGES;
  const messageIndex = Math.abs(localDateKey().split('').reduce((total, char) => total + char.charCodeAt(0), 0) + 3) % pool.length;
  return pool[messageIndex];
}

function bodyWaitingCopy(createdAt) {
  if (!createdAt) return 'Waiting for you — 30 minutes is enough.';
  const elapsed = Math.max(0, Date.now() - createdAt);
  const hours = Math.floor(elapsed / 3600000);
  if (hours < 1) return 'Fresh promise · added just now';
  if (hours < 24) return `Waiting for you · added ${hours}h ago`;
  const days = Math.floor(hours / 24);
  const leftoverHours = hours % 24;
  if (days === 1) return `Waiting since yesterday · ${leftoverHours}h beyond the first day`;
  if (days < 4) return `Your body is still waiting · added ${days}d ${leftoverHours}h ago`;
  return `No perfect workout needed · waiting ${days}d ${leftoverHours}h`;
}

function careerWaitingCopy(createdAt) {
  if (!createdAt) return DEMO_MODE ? 'Your future starts with one focused session.' : 'Your switch starts with one focused session.';
  const elapsed = Math.max(0, Date.now() - createdAt);
  const hours = Math.floor(elapsed / 3600000);
  if (hours < 1) return CAREER_SLOT_COPY.fresh;
  if (hours < 24) return CAREER_SLOT_COPY.underDay(hours);
  const days = Math.floor(hours / 24);
  const leftoverHours = hours % 24;
  if (days === 1) return CAREER_SLOT_COPY.oneDay(leftoverHours);
  if (days < 4) return CAREER_SLOT_COPY.severalDays(days, leftoverHours);
  return CAREER_SLOT_COPY.longWait(days, leftoverHours);
}

function startTask(id) {
  const task = active.find(t => t.id === id);
  if (!task) return;
  task.startedAt = Date.now();
  saveActive();
  renderBoard();
}

function removeTask(id, isStarted = false) {
  if (isStarted && !window.confirm('Remove this running task? Its timer progress will be lost and it will not be counted as finished.')) return;
  active = active.filter(t => t.id !== id);
  if (frog && frog.date === localDateKey() && frog.taskId === id) {
    frog = null;
    saveFrog();
  }
  saveActive();
  renderBoard();
}

function finishTask(id) {
  const idx = active.findIndex(t => t.id === id);
  if (idx === -1) return;
  const task = active[idx];
  const completedAt = Date.now();
  log.push({
    id: task.id,
    title: task.title,
    note: task.note || '',
    category: task.category,
    points: task.points,
    startedAt: task.startedAt,
    completedAt,
    duration: completedAt - task.startedAt
  });
  if (frog && frog.date === localDateKey() && frog.taskId === task.id) {
    frog = {
      ...frog,
      completed: true,
      task: { title: task.title, note: task.note || '', category: task.category, points: task.points, completedAt }
    };
    saveFrog();
  }
  active.splice(idx, 1);
  saveActive();
  saveLog();
  renderBoard();
}

function frogForToday() {
  return frog && frog.date === localDateKey() ? frog : null;
}

function setFrog(task) {
  frog = {
    date: localDateKey(),
    taskId: task.id,
    completed: false,
    task: { title: task.title, note: task.note || '', category: task.category, points: task.points }
  };
  saveFrog();
  renderFrog();
}

function renderFrog() {
  const container = document.getElementById('frogContent');
  const todayFrog = frogForToday();
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = `frog-card${todayFrog?.completed ? ' is-eaten' : ''}`;
  const copy = document.createElement('div');
  copy.className = 'frog-copy';
  const title = document.createElement('div');
  title.className = 'frog-task-title';
  const detail = document.createElement('div');
  detail.className = 'frog-task-detail';

  if (todayFrog) {
    const cat = catById(todayFrog.task.category);
    title.textContent = todayFrog.completed ? 'Frog eaten. That was the hard thing.' : todayFrog.task.title;
    detail.textContent = todayFrog.completed
      ? `${cat.icon} ${todayFrog.task.title} · ${todayFrog.task.points} pts completed`
      : `${cat.icon} ${cat.label} · ${todayFrog.task.points} pts · do this first`;
  } else {
    title.textContent = 'What is the one task you do not want to do today?';
    detail.textContent = 'Choose it here, then get it done before the smaller tasks take over.';
  }
  copy.append(title, detail);
  if (typeof todayFrog?.task?.note === 'string' && todayFrog.task.note.trim()) {
    const taskNote = document.createElement('div');
    taskNote.className = 'frog-task-note';
    taskNote.textContent = `📝 ${todayFrog.task.note.trim()}`;
    copy.appendChild(taskNote);
  }
  card.appendChild(copy);

  if (todayFrog?.completed) {
    const clear = document.createElement('button');
    clear.className = 'btn ghost small';
    clear.textContent = 'Clear';
    clear.addEventListener('click', () => { frog = null; saveFrog(); renderFrog(); });
    card.appendChild(clear);
  } else if (active.length) {
    const controls = document.createElement('div');
    controls.className = 'frog-controls';
    const picker = document.createElement('select');
    picker.className = 'frog-picker';
    const prompt = document.createElement('option');
    prompt.value = '';
    prompt.textContent = todayFrog ? 'Change today’s frog…' : 'Choose today’s frog…';
    picker.appendChild(prompt);
    active.forEach(task => {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = task.title;
      picker.appendChild(option);
    });
    picker.value = todayFrog?.taskId || '';
    const setButton = document.createElement('button');
    setButton.className = 'btn primary small';
    setButton.textContent = todayFrog ? 'Update Frog' : 'Set Frog';
    setButton.disabled = !picker.value;
    picker.addEventListener('change', () => {
      setButton.disabled = !picker.value;
    });
    setButton.addEventListener('click', () => {
      const task = active.find(item => item.id === picker.value);
      if (task) setFrog(task);
    });
    controls.append(picker, setButton);
    card.appendChild(controls);
  } else {
    const note = document.createElement('span');
    note.className = 'frog-empty-note';
    note.textContent = 'Add a Top 5 task first.';
    card.appendChild(note);
  }
  container.appendChild(card);
}

function todayCompletedTasks() {
  const [start, end] = getRange('day', 0);
  return log
    .filter(t => t.completedAt >= start && t.completedAt < end)
    .sort((a, b) => b.completedAt - a.completedAt);
}

function renderTodayProgress() {
  const container = document.getElementById('todayProgress');
  const summary = document.getElementById('todayProgressSummary');
  const tasks = todayCompletedTasks();
  const points = tasks.reduce((sum, task) => sum + task.points, 0);
  const dailyTarget = Math.max(1, Number(targets.day) || DEFAULT_TARGETS.day);

  if (!tasks.length) {
    summary.textContent = timeLeftToday();
    container.innerHTML = '<div class="today-empty">Nothing finished yet. Start with one task — future you deserves something satisfying to look back on.</div>';
    return;
  }

  summary.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} finished · ${timeLeftToday()}`;
  container.innerHTML = '';

  const byCategory = new Map();
  tasks.forEach(task => {
    const entry = byCategory.get(task.category) || { points: 0, count: 0 };
    entry.points += task.points;
    entry.count += 1;
    byCategory.set(task.category, entry);
  });
  const categories = [...byCategory.entries()]
    .map(([id, value]) => ({ cat: catById(id), ...value }))
    .sort((a, b) => b.points - a.points);
  const layout = document.createElement('div');
  layout.className = 'today-progress-layout';
  const areas = document.createElement('div');
  areas.className = 'today-areas';
  const list = document.createElement('div');
  list.className = 'today-task-list';

  const total = document.createElement('div');
  total.className = 'today-total';
  const totalHeader = document.createElement('div');
  totalHeader.className = 'today-total-header';
  const totalLabel = document.createElement('span');
  totalLabel.textContent = 'Today’s points';
  const totalValue = document.createElement('strong');
  totalValue.textContent = `${points} / ${dailyTarget} pts`;
  totalHeader.append(totalLabel, totalValue);
  const totalTrack = document.createElement('div');
  totalTrack.className = 'today-total-track';
  const totalFill = document.createElement('div');
  totalFill.className = 'today-total-fill';
  totalFill.style.width = `${Math.min(100, (points / dailyTarget) * 100)}%`;
  totalTrack.appendChild(totalFill);
  const totalMessage = document.createElement('div');
  totalMessage.className = 'today-total-message';
  totalMessage.textContent = points >= dailyTarget
    ? `Daily goal hit — look at you go. ${timeLeftToday()}.`
    : `${dailyTarget - points} pts left to hit today’s goal · ${timeLeftToday()}.`;
  total.append(totalHeader, totalTrack, totalMessage);
  areas.appendChild(total);

  categories.forEach(({ cat, points: categoryPoints, count }) => {
    const row = document.createElement('div');
    row.className = 'today-area-row';
    const label = document.createElement('div');
    label.className = 'today-area-label';
    label.textContent = `${cat.icon} ${cat.label}`;
    const track = document.createElement('div');
    track.className = 'today-area-track';
    const value = document.createElement('div');
    value.className = 'today-area-value';
    value.textContent = `${categoryPoints} pts · ${count} ${count === 1 ? 'win' : 'wins'}`;
    row.append(label, track, value);
    track.style.background = cat.color;
    areas.appendChild(row);
  });

  tasks.forEach(task => {
    const cat = catById(task.category);
    const item = document.createElement('div');
    item.className = 'today-task-item';
    const dot = document.createElement('span');
    dot.className = 'today-task-dot';
    dot.style.background = cat.color;
    const details = document.createElement('div');
    details.className = 'today-task-details';
    const title = document.createElement('div');
    title.className = 'today-task-title';
    title.textContent = task.title;
    const meta = document.createElement('div');
    meta.className = 'today-task-meta';
    meta.textContent = `${cat.icon} ${cat.label} · ${task.points} pts · finished ${fmtDateTime(task.completedAt)}`;
    details.appendChild(title);
    if (typeof task.note === 'string' && task.note.trim()) {
      const note = document.createElement('div');
      note.className = 'today-task-note';
      note.textContent = `📝 ${task.note.trim()}`;
      details.appendChild(note);
    }
    details.appendChild(meta);
    item.append(dot, details);
    list.appendChild(item);
  });

  layout.append(areas, list);
  container.appendChild(layout);
}

// live timer tick
setInterval(() => {
  if (active.some(t => t.startedAt) && document.getElementById('tab-board').classList.contains('active')) {
    renderBoard();
  }
}, 1000);

setInterval(() => {
  if (document.getElementById('tab-board').classList.contains('active')) renderTodayProgress();
}, 60 * 1000);

// ---------- Add Task Modal ----------

const modalBackdrop = document.getElementById('modalBackdrop');
const taskTitleInput = document.getElementById('taskTitle');
const taskNoteInput = document.getElementById('taskNote');
const taskCategorySelect = document.getElementById('taskCategory');
const taskQuadrantSelect = document.getElementById('taskQuadrant');
const taskPointsInput = document.getElementById('taskPoints');

CATEGORIES.forEach(c => {
  const opt = document.createElement('option');
  opt.value = c.id;
  opt.textContent = `${c.icon} ${c.label} (${c.points} pts)`;
  taskCategorySelect.appendChild(opt);
});
EISENHOWER_QUADRANTS.forEach(q => {
  const opt = document.createElement('option');
  opt.value = q.id;
  opt.textContent = `${q.label} — ${q.sublabel}`;
  taskQuadrantSelect.appendChild(opt);
});

taskCategorySelect.addEventListener('change', () => {
  if (!editingTaskId) taskPointsInput.value = catById(taskCategorySelect.value).points;
});

let editingTaskId = null;
let editingTaskCompletedAt = null;
let editingTaskSource = 'active';
let addingToProtectedSlot = null;
const modalTitle = document.getElementById('modalTitle');
const saveTaskBtn = document.getElementById('saveTask');
const taskQuadrantLabel = taskQuadrantSelect.parentElement;

function openAddModal(slotType = 'flexible') {
  const forBodySlot = slotType === 'body';
  const forCareerSlot = slotType === 'career';
  const flexibleTaskCount = active.filter(task => !task.bodySlot && !task.careerSlot).length;
  if ((forBodySlot && active.some(task => task.bodySlot))
    || (forCareerSlot && active.some(task => task.careerSlot))
    || (slotType === 'flexible' && flexibleTaskCount >= 3)) return;
  editingTaskId = null;
  editingTaskCompletedAt = null;
  editingTaskSource = 'active';
  addingToProtectedSlot = forBodySlot ? 'body' : (forCareerSlot ? 'career' : null);
  taskQuadrantLabel.style.display = '';
  modalTitle.textContent = forBodySlot ? 'Add Your Body Task' : (forCareerSlot ? CAREER_SLOT_COPY.modalTitle : 'Add a Task');
  saveTaskBtn.textContent = forBodySlot ? 'Protect This Promise' : (forCareerSlot ? CAREER_SLOT_COPY.saveLabel : 'Add to Board');
  taskTitleInput.value = '';
  taskNoteInput.value = '';
  taskTitleInput.placeholder = forBodySlot
    ? 'e.g. Walk outside for 30 minutes'
    : (forCareerSlot ? CAREER_SLOT_COPY.placeholder : (DEMO_MODE ? 'e.g. Finish the first draft' : 'e.g. LeetCode contest practice'));
  taskCategorySelect.value = forBodySlot ? 'glow_up' : (forCareerSlot ? 'empire_building' : CATEGORIES[0].id);
  taskCategorySelect.disabled = forBodySlot || forCareerSlot;
  taskQuadrantSelect.value = 'schedule';
  taskPointsInput.value = catById(taskCategorySelect.value).points;
  modalBackdrop.classList.add('open');
  setTimeout(() => taskTitleInput.focus(), 50);
}

function openEditModal(id, source = 'active', completedAt = null) {
  const tasks = source === 'log' ? log : active;
  const task = tasks.find(t => t.id === id && (source !== 'log' || completedAt === null || t.completedAt === completedAt));
  if (!task) return;
  editingTaskId = id;
  editingTaskCompletedAt = source === 'log' ? task.completedAt : null;
  editingTaskSource = source;
  addingToProtectedSlot = null;
  modalTitle.textContent = source === 'log' ? 'Edit Finished Task' : 'Edit Task';
  saveTaskBtn.textContent = 'Save Changes';
  taskTitleInput.value = task.title;
  taskNoteInput.value = typeof task.note === 'string' ? task.note : '';
  taskCategorySelect.value = task.category;
  taskCategorySelect.disabled = source === 'active' && Boolean(task.bodySlot || task.careerSlot);
  taskQuadrantSelect.value = task.quadrant || 'schedule';
  taskQuadrantLabel.style.display = source === 'log' ? 'none' : '';
  taskPointsInput.value = task.points;
  modalBackdrop.classList.add('open');
  setTimeout(() => taskTitleInput.focus(), 50);
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  editingTaskId = null;
  editingTaskCompletedAt = null;
  editingTaskSource = 'active';
  addingToProtectedSlot = null;
  taskCategorySelect.disabled = false;
  taskTitleInput.placeholder = 'e.g. LeetCode contest practice';
  taskNoteInput.value = '';
  taskQuadrantLabel.style.display = '';
}

document.getElementById('cancelTask').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

document.getElementById('saveTask').addEventListener('click', () => {
  const title = taskTitleInput.value.trim();
  if (!title) { taskTitleInput.focus(); return; }
  const note = taskNoteInput.value.trim().slice(0, 500);
  const points = pointsInQuarterSteps(taskPointsInput.value, catById(taskCategorySelect.value).points);

  if (editingTaskId) {
    const source = editingTaskSource;
    const tasks = source === 'log' ? log : active;
    const task = tasks.find(t => t.id === editingTaskId
      && (source !== 'log' || editingTaskCompletedAt === null || t.completedAt === editingTaskCompletedAt));
    if (task) {
      task.title = title;
      task.note = note;
      task.category = taskCategorySelect.value;
      if (source === 'active') task.quadrant = taskQuadrantSelect.value;
      task.points = points;
      if (frog && frog.date === localDateKey() && frog.taskId === task.id) {
        const matchesFrogSnapshot = source === 'active' || frog.task?.completedAt === task.completedAt;
        if (matchesFrogSnapshot) {
          frog.task = { ...frog.task, title: task.title, note: task.note || '', category: task.category, points: task.points };
          saveFrog();
        }
      }
    }
    if (source === 'log') saveLog(); else saveActive();
    closeModal();
    if (source === 'log') {
      renderLog();
    } else {
      renderBoard();
      renderMatrix();
    }
    return;
  }

  const flexibleTaskCount = active.filter(task => !task.bodySlot && !task.careerSlot).length;
  if ((addingToProtectedSlot === 'body' && active.some(task => task.bodySlot))
    || (addingToProtectedSlot === 'career' && active.some(task => task.careerSlot))
    || (!addingToProtectedSlot && flexibleTaskCount >= 3)) { closeModal(); return; }
  active.push({
    id: uid(),
    title,
    note,
    category: taskCategorySelect.value,
    quadrant: taskQuadrantSelect.value,
    points,
    bodySlot: addingToProtectedSlot === 'body',
    careerSlot: addingToProtectedSlot === 'career',
    createdAt: Date.now(),
    startedAt: null
  });
  saveActive();
  closeModal();
  renderBoard();
});

// ---------- Eisenhower Matrix ----------

function renderMatrix() {
  const grid = document.getElementById('matrixGrid');
  grid.innerHTML = '';
  EISENHOWER_QUADRANTS.forEach(quadrant => {
    const cell = document.createElement('section');
    cell.className = 'matrix-cell';
    cell.style.setProperty('--matrix-color', quadrant.color);
    const head = document.createElement('div');
    head.className = 'matrix-head';
    const label = document.createElement('h3');
    label.textContent = quadrant.label;
    const sublabel = document.createElement('div');
    sublabel.className = 'matrix-sublabel';
    sublabel.textContent = quadrant.sublabel;
    head.append(label, sublabel);
    const hint = document.createElement('p');
    hint.className = 'matrix-hint';
    hint.textContent = quadrant.hint;
    cell.append(head, hint);
    const tasks = active.filter(task => (task.quadrant || 'schedule') === quadrant.id);
    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'matrix-empty';
      empty.textContent = 'No active tasks here.';
      cell.appendChild(empty);
    } else {
      tasks.forEach(task => {
        const item = document.createElement('button');
        item.className = 'matrix-task';
        item.type = 'button';
        const itemTitle = document.createElement('span');
        itemTitle.className = 'matrix-task-title';
        itemTitle.textContent = task.title;
        item.appendChild(itemTitle);
        if (typeof task.note === 'string' && task.note.trim()) {
          const itemNote = document.createElement('span');
          itemNote.className = 'matrix-task-note';
          itemNote.textContent = `📝 ${task.note.trim()}`;
          item.appendChild(itemNote);
        }
        item.title = 'Edit this task’s priority';
        item.addEventListener('click', () => openEditModal(task.id));
        cell.appendChild(item);
      });
    }
    grid.appendChild(cell);
  });
}

// ---------- Dashboard ----------

const PERIOD_LABELS = { day: 'Day', week: 'Week', weekend: 'Weekend', month: 'Month' };

const dash = { period: 'day', offset: 0 };

function renderDashboard() {
  // granularity buttons
  document.querySelectorAll('#granSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.period === dash.period));

  // date nav label
  document.getElementById('dateRangeLabel').textContent = rangeLabel(dash.period, dash.offset);
  document.getElementById('dateRangeSub').textContent = rangeSubLabel(dash.period, dash.offset);
  document.getElementById('jumpToday').disabled = dash.offset === 0;

  // keep the date picker roughly in sync with the viewed range
  const [rangeStart] = getRange(dash.period, dash.offset);
  document.getElementById('jumpDate').value = new Date(rangeStart).toISOString().slice(0, 10);

  // score card
  const score = pointsInRange(dash.period, dash.offset);
  const target = targets[dash.period] || 0;
  const pct = target > 0 ? Math.min(100, Math.round((score / target) * 100)) : 0;
  document.getElementById('scoreCard').innerHTML = `
    <div class="s-score">${score} <span>/ ${target} pts</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div class="s-target-line"><span><b>${pct}%</b> of target</span><span>${Math.max(0, target - score)} pts to go</span></div>
  `;

  renderCategoryBreakdown();
}

document.getElementById('granSeg').addEventListener('click', e => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  dash.period = btn.dataset.period;
  dash.offset = 0;
  renderDashboard();
});

document.getElementById('navPrev').addEventListener('click', () => { dash.offset -= 1; renderDashboard(); });
document.getElementById('navNext').addEventListener('click', () => { dash.offset += 1; renderDashboard(); });
document.getElementById('jumpToday').addEventListener('click', () => { dash.offset = 0; renderDashboard(); });

document.getElementById('jumpDate').addEventListener('change', e => {
  if (!e.target.value) return;
  const [y, m, d] = e.target.value.split('-').map(Number);
  dash.offset = offsetFromDate(dash.period, new Date(y, m - 1, d));
  renderDashboard();
});

function renderCategoryBreakdown() {
  const el = document.getElementById('categoryBreakdown');
  el.innerHTML = '';
  const map = categoryPointsInRange(dash.period, dash.offset);
  const maxVal = Math.max(1, ...Object.values(map));

  CATEGORIES.forEach(c => {
    const val = map[c.id] || 0;
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <div class="cat-name"><span class="cat-dot" style="background:${c.color}; color:${c.color}"></span>${c.icon} ${c.label}</div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(val / maxVal) * 100}%; background:${c.color}"></div></div>
      <div class="cat-pts">${val}</div>
    `;
    el.appendChild(row);
  });
}

// ---------- Focus Sessions ----------

const focusView = { period: 'week', offset: 0, category: 'all' };
const focusDraft = { mode: 'countdown', plannedMinutes: 25, label: '', category: '', note: '' };
const FOCUS_FLOAT_PREF_KEY = 'one-ball-focus-auto-float-v1';
let focusTrendChart = null;
let focusCategoryChart = null;
let focusSneakChart = null;
let editingFocusId = null;
let focusActionPending = false;
let focusReturnElement = null;
let focusAutoFloat = (() => {
  try {
    const saved = localStorage.getItem(FOCUS_FLOAT_PREF_KEY);
    return saved === null ? true : saved === 'true';
  } catch (_) {
    return true;
  }
})();
let focusPipWindow = null;
let focusPipMode = null;
let focusPipOpenPromise = null;
let focusPipRequestGeneration = 0;
let focusPipInterval = null;
let focusPipPreviewSession = null;
let focusPipClosing = false;
let focusPipCanvas = null;
let focusPipContext = null;
let focusPipStream = null;
let focusPipVideoPrepared = false;
let focusPipVideoReady = false;
let suppressNextVideoPipCloseNotice = false;
const intentionallyClosedFocusPipWindows = new WeakSet();
const deletingFocusSessionIds = new Set();
const deletingExpenseIds = new Set();

function syncFocusSession(session) {
  return session ? { ...session, _syncedAt: Date.now() } : null;
}

function focusElapsedSeconds(session, now = Date.now()) {
  if (!session) return 0;
  const saved = Math.max(0, Number(session.elapsedSeconds) || 0);
  if (session.status !== 'running') return Math.floor(saved);
  const syncedAt = Number(session._syncedAt) || now;
  return Math.floor(saved + Math.max(0, now - syncedAt) / 1000);
}

function formatFocusClock(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  const pad = number => String(number).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

function formatFocusHuman(seconds, { precise = false } = {}) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  if (value < 60) return precise && value > 0 ? `${value}s` : (value > 0 ? '<1m' : '0m');
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function supportsDocumentFocusPip() {
  return Boolean(
    window.isSecureContext
    && 'documentPictureInPicture' in window
    && typeof window.documentPictureInPicture?.requestWindow === 'function'
  );
}

function supportsVideoFocusPip() {
  const video = document.getElementById('focusPipVideo');
  return Boolean(
    document.pictureInPictureEnabled
    && video
    && typeof video.requestPictureInPicture === 'function'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function'
  );
}

function supportsFocusPip() {
  return supportsDocumentFocusPip() || supportsVideoFocusPip();
}

function focusPipIsOpen() {
  if (focusPipMode === 'document') return Boolean(focusPipWindow && !focusPipWindow.closed);
  if (focusPipMode === 'video') return document.pictureInPictureElement === document.getElementById('focusPipVideo');
  return false;
}

function saveFocusFloatPreference(value) {
  focusAutoFloat = Boolean(value);
  try { localStorage.setItem(FOCUS_FLOAT_PREF_KEY, String(focusAutoFloat)); }
  catch (_) { /* Storage can be unavailable in strict privacy modes. */ }
}

function focusSessionForFloatingTimer() {
  return activeFocusSession || focusPipPreviewSession;
}

function focusDocumentTitle() {
  return DEMO_MODE ? 'One Ball at a Time — Public Demo' : 'One Ball at a Time';
}

function updateFocusDocumentTitle() {
  const session = focusSessionForFloatingTimer();
  document.title = session
    ? `${activeFocusDisplay(session).value} · Focus — One Ball at a Time`
    : focusDocumentTitle();
}

function focusPipStatusText(session, display) {
  if (!activeFocusSession && focusPipPreviewSession) return 'Starting session…';
  if (session?.status === 'paused') return 'Paused';
  if (display.reached) return 'Goal reached';
  return 'In the room';
}

function truncateCanvasText(context, value, maxWidth) {
  const textValue = String(value || '');
  if (context.measureText(textValue).width <= maxWidth) return textValue;
  let shortened = textValue;
  while (shortened && context.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened}…`;
}

function drawFocusPipVideoFrame() {
  const session = focusSessionForFloatingTimer();
  if (!session || !focusPipCanvas || !focusPipContext) return;
  const context = focusPipContext;
  const { width, height } = focusPipCanvas;
  const display = activeFocusDisplay(session);
  const category = focusCategoryMeta(session.category);

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fffafb';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(192,55,106,.11)';
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 36) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 36) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.fillStyle = '#c0376a';
  context.fillRect(0, 0, 11, height);
  context.font = '700 22px system-ui, sans-serif';
  context.fillStyle = '#a2295c';
  context.fillText(focusPipStatusText(session, display).toUpperCase(), 48, 55);
  context.font = '600 22px system-ui, sans-serif';
  context.fillStyle = '#76515f';
  context.textAlign = 'right';
  context.fillText(`${category.icon} ${category.label}`, width - 42, 55);
  context.textAlign = 'left';

  context.font = '700 34px Georgia, serif';
  context.fillStyle = '#432b35';
  context.fillText(truncateCanvasText(context, session.label?.trim() || 'An honest focus session', width - 90), 48, 115);
  context.font = '800 104px Georgia, serif';
  context.fillStyle = '#432b35';
  context.fillText(display.value, 48, 235);

  const trackX = 48;
  const trackY = 274;
  const trackWidth = width - 96;
  context.fillStyle = '#f0dce4';
  context.fillRect(trackX, trackY, trackWidth, 13);
  context.fillStyle = display.reached ? '#4d8b70' : '#d34778';
  context.fillRect(trackX, trackY, Math.max(display.progress ? 8 : 0, trackWidth * display.progress), 13);

  context.font = '500 20px system-ui, sans-serif';
  context.fillStyle = '#76515f';
  context.fillText(truncateCanvasText(context, display.caption, width - 96), 48, 330);
  context.font = '600 18px system-ui, sans-serif';
  context.fillStyle = '#a2295c';
  context.fillText('Your session keeps running. Return to One Ball at a Time for controls.', 48, 372);
}

function initializeFocusPipVideo() {
  if (focusPipVideoPrepared) {
    const preparedVideo = document.getElementById('focusPipVideo');
    focusPipVideoReady = focusPipVideoReady
      || (preparedVideo.readyState >= 1 && Boolean(preparedVideo.srcObject?.getVideoTracks?.().length));
    return focusPipVideoReady;
  }
  if (!supportsVideoFocusPip()) return false;
  const video = document.getElementById('focusPipVideo');
  try {
    focusPipCanvas = document.createElement('canvas');
    focusPipCanvas.width = 720;
    focusPipCanvas.height = 405;
    focusPipContext = focusPipCanvas.getContext('2d');
    if (!focusPipContext) throw new Error('Canvas drawing is unavailable.');
    focusPipStream = focusPipCanvas.captureStream(1);
    if (!focusPipStream?.getVideoTracks?.().length) throw new Error('Canvas video stream is unavailable.');
    video.srcObject = focusPipStream;
    video.muted = true;
    video.playsInline = true;
    focusPipVideoPrepared = true;
    const markVideoReady = () => {
      focusPipVideoReady = video.readyState >= 1 && Boolean(video.srcObject?.getVideoTracks?.().length);
    };
    video.addEventListener('loadedmetadata', markVideoReady);
    video.addEventListener('canplay', markVideoReady);
    video.addEventListener('pause', () => {
      if (document.pictureInPictureElement !== video || !focusSessionForFloatingTimer()) return;
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(error => console.warn('Could not keep the fallback timer visible.', error));
      }
    });
    video.addEventListener('leavepictureinpicture', () => {
      if (focusPipMode !== 'video') return;
      const shouldNotify = Boolean(activeFocusSession)
        && !focusPipClosing
        && !suppressNextVideoPipCloseNotice;
      focusPipMode = null;
      focusPipOpenPromise = null;
      focusPipClosing = false;
      suppressNextVideoPipCloseNotice = false;
      updateFocusFloatingControls();
      if (shouldNotify) showToast('Floating timer closed — your focus session is still running.');
    });
    drawFocusPipVideoFrame();
    const playback = video.play();
    if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    markVideoReady();
    return focusPipVideoReady;
  } catch (error) {
    console.warn('Could not prepare video Picture-in-Picture.', error);
    focusPipCanvas = null;
    focusPipContext = null;
    focusPipStream = null;
    focusPipVideoPrepared = false;
    focusPipVideoReady = false;
    return false;
  }
}

function setupDocumentFocusPip(pipWindow) {
  focusPipWindow = pipWindow;
  focusPipMode = 'document';
  focusPipOpenPromise = null;
  const pipDocument = pipWindow.document;
  pipDocument.documentElement.lang = document.documentElement.lang || 'en';
  pipDocument.title = 'Focus timer — One Ball at a Time';

  const style = pipDocument.createElement('style');
  style.textContent = `
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { min-width: 280px; min-height: 190px; margin: 0; color: #432b35; background-color: #fffafb; background-image: linear-gradient(rgba(192,55,106,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(192,55,106,.08) 1px, transparent 1px); background-size: 24px 24px; }
    button { font: inherit; }
    .card { min-height: 100vh; display: grid; grid-template-rows: auto auto 1fr auto; gap: 8px; padding: 14px 15px 13px; border-left: 6px solid #c0376a; background: rgba(255,250,251,.9); }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .status { color: #a2295c; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .tag { max-width: 52%; overflow: hidden; color: #76515f; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
    h1 { margin: 0; overflow: hidden; font: 800 18px/1.15 Georgia, serif; text-overflow: ellipsis; white-space: nowrap; }
    .clock-row { align-self: center; }
    time { display: block; font: 800 clamp(42px, 18vw, 66px)/.95 Georgia, serif; font-variant-numeric: tabular-nums; }
    .caption { min-height: 14px; margin: 7px 0 0; overflow: hidden; color: #76515f; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
    .track { height: 7px; margin-top: 9px; overflow: hidden; border-radius: 99px; background: #f0dce4; }
    .fill { height: 100%; width: 0; border-radius: inherit; background: #d34778; transition: width .25s ease; }
    .reached .fill { background: #4d8b70; }
    .controls { display: flex; align-items: center; gap: 7px; }
    .btn { min-height: 34px; padding: 7px 11px; border: 1px solid #d787a5; border-radius: 999px; background: #fff; color: #8f2750; font-size: 10px; font-weight: 800; cursor: pointer; }
    .btn:hover { background: #ffe7f0; }
    .btn.primary { margin-left: auto; border-color: #c0376a; background: #c0376a; color: #fff; }
    .btn:disabled { cursor: wait; opacity: .58; }
    .error { margin: 0; color: #9d2d45; font-size: 9px; }
    .error:empty { display: none; }
    @media (prefers-reduced-motion: reduce) { .fill { transition: none; } }
  `;
  pipDocument.head.appendChild(style);
  pipDocument.body.innerHTML = `
    <main class="card" id="pipCard">
      <div class="top"><span class="status" id="pipStatus" role="status"></span><span class="tag" id="pipTag"></span></div>
      <h1 id="pipLabel"></h1>
      <div class="clock-row">
        <time id="pipTime" role="timer" aria-live="off"></time>
        <div class="track" id="pipProgress" role="progressbar" aria-label="Focus countdown progress"><div class="fill" id="pipProgressFill"></div></div>
        <p class="caption" id="pipCaption"></p>
        <p class="error" id="pipError" role="status"></p>
      </div>
      <div class="controls">
        <button class="btn" id="pipReturn" type="button">Return</button>
        <button class="btn" id="pipToggle" type="button">Pause</button>
        <button class="btn primary" id="pipFinish" type="button">Finish & save</button>
      </div>
    </main>
  `;

  pipDocument.getElementById('pipReturn').addEventListener('click', () => {
    window.focus();
    document.querySelector('[data-tab="focus"]')?.click();
  });
  pipDocument.getElementById('pipToggle').addEventListener('click', async () => {
    if (!activeFocusSession || focusActionPending) return;
    await runFocusAction(activeFocusSession.status === 'paused' ? 'resume' : 'pause');
    updateFocusPictureInPicture();
  });
  pipDocument.getElementById('pipFinish').addEventListener('click', finishFocusFromPictureInPicture);
  const pipInterval = pipWindow.setInterval(updateFocusPictureInPicture, 1000);
  focusPipInterval = pipInterval;
  pipWindow.addEventListener('pagehide', () => {
    pipWindow.clearInterval(pipInterval);
    if (focusPipWindow !== pipWindow) return;
    const shouldNotify = Boolean(activeFocusSession)
      && !focusPipClosing
      && !intentionallyClosedFocusPipWindows.has(pipWindow);
    focusPipInterval = null;
    focusPipWindow = null;
    if (focusPipMode === 'document') focusPipMode = null;
    focusPipOpenPromise = null;
    focusPipClosing = false;
    updateFocusFloatingControls();
    if (shouldNotify) showToast('Floating timer closed — your focus session is still running.');
  }, { once: true });
  updateFocusPictureInPicture();
  updateFocusFloatingControls();
}

function openDocumentFocusPip(session, { silent = false, requestGeneration } = {}) {
  focusPipPreviewSession = session || focusPipPreviewSession;
  let request;
  try {
    request = window.documentPictureInPicture.requestWindow({ width: 360, height: 250 });
  } catch (error) {
    console.warn('Document Picture-in-Picture could not open.', error);
    return openVideoFocusPip(session, { silent, requestGeneration });
  }
  const openPromise = Promise.resolve(request)
    .then(pipWindow => {
      if (requestGeneration !== focusPipRequestGeneration || !focusSessionForFloatingTimer()) {
        pipWindow.close();
        if (focusPipOpenPromise === openPromise) focusPipOpenPromise = null;
        updateFocusFloatingControls();
        return false;
      }
      setupDocumentFocusPip(pipWindow);
      return true;
    })
    .catch(error => {
      if (focusPipOpenPromise === openPromise) focusPipOpenPromise = null;
      if (requestGeneration !== focusPipRequestGeneration) {
        updateFocusFloatingControls();
        return false;
      }
      console.warn('Document Picture-in-Picture was blocked.', error);
      if (!silent) showToast('The floating timer was blocked. Click “Float timer” to try again.');
      updateFocusFloatingControls();
      return false;
    });
  focusPipOpenPromise = openPromise;
  updateFocusFloatingControls();
  return openPromise;
}

function openVideoFocusPip(session, { silent = false, requestGeneration } = {}) {
  focusPipPreviewSession = session || focusPipPreviewSession;
  if (!initializeFocusPipVideo()) {
    if (!silent) showToast('This browser cannot float the timer. The tab title and mini timer will keep counting.');
    return Promise.resolve(false);
  }
  const video = document.getElementById('focusPipVideo');
  drawFocusPipVideoFrame();
  let request;
  try {
    const playback = video.play();
    if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    request = video.requestPictureInPicture();
  } catch (error) {
    console.warn('Video Picture-in-Picture could not open.', error);
    if (!silent) showToast('The floating timer was blocked. Click “Float timer” to try again.');
    return Promise.resolve(false);
  }
  const openPromise = Promise.resolve(request)
    .then(() => {
      if (requestGeneration !== focusPipRequestGeneration || !focusSessionForFloatingTimer()) {
        if (focusPipOpenPromise === openPromise) focusPipOpenPromise = null;
        if (document.pictureInPictureElement === video && focusPipMode !== 'video') {
          const exit = document.exitPictureInPicture();
          if (exit && typeof exit.catch === 'function') exit.catch(() => {});
        }
        updateFocusFloatingControls();
        return false;
      }
      focusPipMode = 'video';
      if (focusPipOpenPromise === openPromise) focusPipOpenPromise = null;
      updateFocusFloatingControls();
      return true;
    })
    .catch(error => {
      if (focusPipOpenPromise === openPromise) focusPipOpenPromise = null;
      if (requestGeneration !== focusPipRequestGeneration) {
        updateFocusFloatingControls();
        return false;
      }
      console.warn('Video Picture-in-Picture was blocked.', error);
      if (!silent) showToast('The floating timer was blocked. Click “Float timer” to try again.');
      updateFocusFloatingControls();
      return false;
    });
  focusPipOpenPromise = openPromise;
  updateFocusFloatingControls();
  return openPromise;
}

function openFocusPictureInPicture({ session = activeFocusSession, silent = false } = {}) {
  if (focusPipIsOpen()) {
    if (focusPipMode === 'document') focusPipWindow?.focus();
    return Promise.resolve(true);
  }
  if (focusPipOpenPromise) return focusPipOpenPromise;
  if (!session) return Promise.resolve(false);
  const requestGeneration = ++focusPipRequestGeneration;
  if (supportsDocumentFocusPip()) return openDocumentFocusPip(session, { silent, requestGeneration });
  if (supportsVideoFocusPip()) return openVideoFocusPip(session, { silent, requestGeneration });
  if (!silent) showToast('This browser cannot float the timer. The tab title and mini timer will keep counting.');
  return Promise.resolve(false);
}

async function closeFocusPictureInPicture({ silent = true } = {}) {
  focusPipClosing = true;
  focusPipRequestGeneration += 1;
  const pendingOpenPromise = focusPipOpenPromise;
  const pipWindow = focusPipWindow;
  if (focusPipInterval && pipWindow && !pipWindow.closed) pipWindow.clearInterval(focusPipInterval);
  focusPipInterval = null;
  try {
    if (focusPipMode === 'document' && pipWindow && !pipWindow.closed) {
      intentionallyClosedFocusPipWindows.add(pipWindow);
      pipWindow.close();
    }
    if (focusPipMode === 'video' && document.pictureInPictureElement === document.getElementById('focusPipVideo')) {
      suppressNextVideoPipCloseNotice = true;
      await document.exitPictureInPicture();
    }
  } catch (error) {
    suppressNextVideoPipCloseNotice = false;
    console.warn('Could not close the floating timer cleanly.', error);
  } finally {
    if (focusPipMode === 'document') {
      focusPipWindow = null;
      focusPipMode = null;
    }
    if (!pendingOpenPromise) focusPipOpenPromise = null;
    focusPipPreviewSession = null;
    window.setTimeout(() => { focusPipClosing = false; }, 0);
    updateFocusFloatingControls();
    if (!silent) showToast('Floating timer closed. Your focus session is still running.');
  }
}

function toggleFocusPictureInPicture() {
  if (focusPipIsOpen()) {
    closeFocusPictureInPicture({ silent: false });
    return;
  }
  openFocusPictureInPicture({ silent: false });
}

function updateFocusFloatingControls() {
  const isOpen = focusPipIsOpen();
  const isOpening = Boolean(focusPipOpenPromise) && !isOpen;
  const available = supportsFocusPip();
  [document.getElementById('floatFocusSession'), document.getElementById('focusMiniFloat')]
    .filter(Boolean)
    .forEach(button => {
      const compact = button.id === 'focusMiniFloat';
      button.disabled = focusActionPending || isOpening || !available || !activeFocusSession;
      button.classList.toggle('is-active', isOpen);
      button.setAttribute('aria-pressed', String(isOpen));
      button.textContent = isOpening
        ? 'Opening…'
        : (isOpen ? (compact ? 'Close' : 'Close floating timer') : (compact ? 'Float ↗' : 'Float timer ↗'));
      button.title = available
        ? 'Keep this timer above your other windows'
        : 'Floating timers are not supported by this browser';
    });
}

function updateFocusPictureInPicture() {
  const session = focusSessionForFloatingTimer();
  if (!session) return;
  const display = activeFocusDisplay(session);
  if (focusPipMode === 'video') {
    drawFocusPipVideoFrame();
    return;
  }
  if (focusPipMode !== 'document' || !focusPipWindow || focusPipWindow.closed) return;
  const pipDocument = focusPipWindow.document;
  const category = focusCategoryMeta(session.category);
  const card = pipDocument.getElementById('pipCard');
  const status = pipDocument.getElementById('pipStatus');
  const label = pipDocument.getElementById('pipLabel');
  const tag = pipDocument.getElementById('pipTag');
  const time = pipDocument.getElementById('pipTime');
  const caption = pipDocument.getElementById('pipCaption');
  const progress = pipDocument.getElementById('pipProgress');
  const fill = pipDocument.getElementById('pipProgressFill');
  const toggle = pipDocument.getElementById('pipToggle');
  const finish = pipDocument.getElementById('pipFinish');
  if (card) card.classList.toggle('reached', display.reached);
  if (status) status.textContent = focusPipStatusText(session, display);
  if (label) label.textContent = session.label?.trim() || 'An honest focus session';
  if (tag) tag.textContent = `${category.icon} ${category.label}`;
  if (time) time.textContent = display.value;
  if (caption) caption.textContent = display.caption;
  if (progress) {
    const planned = Math.max(0, Number(session.plannedSeconds) || 0);
    progress.hidden = !planned;
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', String(planned || 1));
    progress.setAttribute('aria-valuenow', String(Math.min(display.elapsed, planned || 1)));
  }
  if (fill) fill.style.width = `${display.progress * 100}%`;
  if (toggle) {
    toggle.textContent = session.status === 'paused' ? 'Resume' : 'Pause';
    toggle.disabled = focusActionPending || !activeFocusSession;
  }
  if (finish) finish.disabled = focusActionPending || !activeFocusSession;
}

async function finishFocusFromPictureInPicture() {
  if (!activeFocusSession || focusActionPending) return;
  const pipDocument = focusPipWindow?.document;
  const error = pipDocument?.getElementById('pipError');
  if (error) error.textContent = '';
  updateFocusPictureInPicture();
  const saved = await runFocusAction('finish', {
    focusLevel: activeFocusSession?.focusLevel || null,
    note: activeFocusSession?.note || '',
  });
  if (!saved) {
    if (error) error.textContent = 'Could not save. Your session is still active—please try again.';
    return;
  }
  renderFocusSneak();
  showToast(`${formatFocusHuman(saved.elapsedSeconds, { precise: true })} of focus saved.`);
}

function focusCategoryMeta(categoryId) {
  if (!categoryId) return { id: '', label: 'No tag', icon: '○', color: '#b98a9d' };
  const known = CATEGORIES.find(category => category.id === categoryId);
  return known || { id: categoryId, label: categoryId, icon: '•', color: '#99507f' };
}

function populateFocusCategorySelect(select, { includeAll = false, includeNone = true } = {}) {
  const selected = select.value;
  select.innerHTML = '';
  if (includeAll) {
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All tags';
    select.appendChild(allOption);
  }
  if (includeNone) {
    const noneOption = document.createElement('option');
    noneOption.value = includeAll ? 'none' : '';
    noneOption.textContent = '○ No tag — just start';
    select.appendChild(noneOption);
  }
  CATEGORIES.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = `${category.icon} ${category.label}`;
    select.appendChild(option);
  });
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
}

function activeFocusDisplay(session, now = Date.now()) {
  const elapsed = focusElapsedSeconds(session, now);
  const planned = Number(session?.plannedSeconds) || 0;
  if (session?.mode === 'countdown' && planned > 0) {
    const remaining = planned - elapsed;
    return {
      elapsed,
      value: formatFocusClock(Math.max(0, remaining)),
      label: remaining > 0 ? (session.status === 'paused' ? 'Countdown paused' : 'Time remaining') : 'Goal reached',
      caption: remaining > 0
        ? `${formatFocusHuman(elapsed, { precise: true })} focused · ${formatFocusHuman(planned)} intention`
        : `${formatFocusHuman(elapsed, { precise: true })} focused · finish when you leave the room`,
      progress: Math.min(1, elapsed / planned),
      reached: remaining <= 0,
    };
  }
  return {
    elapsed,
    value: formatFocusClock(elapsed),
    label: session?.status === 'paused' ? 'Stopwatch paused' : 'Time protected',
    caption: 'No target to perform for. Stay for the next honest minute.',
    progress: 0,
    reached: false,
  };
}

function renderFocusRoom() {
  const room = document.getElementById('focusRoom');
  room.innerHTML = '';

  if (!activeFocusSession) {
    const wrapper = document.createElement('div');
    wrapper.className = 'focus-room-inner';
    wrapper.innerHTML = `
      <div class="focus-timer-column">
        <div class="focus-timer-ring" id="focusIdleRing">
          <div class="focus-timer-face">
            <span class="focus-timer-state" id="focusIdleState">COUNTDOWN</span>
            <time class="focus-timer-value" id="focusIdleTime" aria-live="off">25:00</time>
            <span class="focus-timer-caption" id="focusIdleCaption">an intention, not a test</span>
          </div>
        </div>
        <p>Enter the room first. You can discover the perfect next step after you begin.</p>
      </div>
      <form class="focus-setup" id="focusStartForm">
        <div>
          <h3>What can you begin imperfectly?</h3>
          <p>The title and tag are optional. Starting is the only required field.</p>
        </div>
        <div class="focus-mode-row" aria-label="Timer mode">
          <button class="focus-mode-btn" data-focus-mode="stopwatch" type="button">Stopwatch</button>
          <button class="focus-mode-btn" data-focus-mode="countdown" type="button">Countdown</button>
        </div>
        <div class="focus-preset-row" id="focusPresetRow" aria-label="Countdown length">
          <button class="focus-preset-btn" data-focus-minutes="10" type="button">10m</button>
          <button class="focus-preset-btn" data-focus-minutes="25" type="button">25m</button>
          <button class="focus-preset-btn" data-focus-minutes="50" type="button">50m</button>
          <button class="focus-preset-btn" data-focus-minutes="90" type="button">90m</button>
        </div>
        <div class="focus-fields">
          <label>What are you working on? <span class="hint">(optional)</span>
            <input id="focusStartLabel" type="text" maxlength="120" list="focusTaskSuggestions" placeholder="e.g. Read the ticket and make one note">
            <datalist id="focusTaskSuggestions"></datalist>
          </label>
          <label>Tag <span class="hint">(optional)</span>
            <select id="focusStartCategory"></select>
          </label>
        </div>
        <label>One-line intention <span class="hint">(optional)</span>
          <textarea id="focusStartNote" rows="2" maxlength="1000" placeholder="What would make this session enough?"></textarea>
        </label>
        <label class="focus-float-choice${supportsFocusPip() ? '' : ' is-unavailable'}" id="focusAutoFloatChoice">
          <input id="focusAutoFloat" type="checkbox"${focusAutoFloat ? ' checked' : ''}${supportsFocusPip() ? '' : ' disabled'}>
          <strong>${supportsFocusPip() ? 'Keep the timer above my other windows' : 'Floating timer is unavailable in this browser'}</strong>
          <small>${supportsFocusPip()
            ? 'A small timer opens when you start, so changing tabs cannot make you forget it.'
            : 'The tab title and the in-page mini timer will still keep counting.'}</small>
        </label>
        <button class="btn primary focus-start-button" id="startFocusSession" type="submit">Start focus session</button>
        <span class="focus-start-hint">Even ten honest minutes become part of your history.</span>
      </form>
    `;
    room.appendChild(wrapper);

    const labelInput = document.getElementById('focusStartLabel');
    const categoryInput = document.getElementById('focusStartCategory');
    const noteInput = document.getElementById('focusStartNote');
    labelInput.value = focusDraft.label;
    noteInput.value = focusDraft.note;
    populateFocusCategorySelect(categoryInput);
    categoryInput.value = focusDraft.category;
    active.forEach(task => {
      const option = document.createElement('option');
      option.value = task.title;
      document.getElementById('focusTaskSuggestions').appendChild(option);
    });
    labelInput.addEventListener('input', () => { focusDraft.label = labelInput.value; });
    categoryInput.addEventListener('change', () => { focusDraft.category = categoryInput.value; });
    noteInput.addEventListener('input', () => { focusDraft.note = noteInput.value; });
    document.getElementById('focusAutoFloat').addEventListener('change', event => {
      saveFocusFloatPreference(event.target.checked);
    });

    const refreshDraftControls = () => {
      document.querySelectorAll('[data-focus-mode]').forEach(button => {
        const activeMode = button.dataset.focusMode === focusDraft.mode;
        button.classList.toggle('active', activeMode);
        button.setAttribute('aria-pressed', String(activeMode));
      });
      document.querySelectorAll('[data-focus-minutes]').forEach(button => {
        const activePreset = Number(button.dataset.focusMinutes) === focusDraft.plannedMinutes && focusDraft.mode === 'countdown';
        button.classList.toggle('active', activePreset);
        button.setAttribute('aria-pressed', String(activePreset));
      });
      document.getElementById('focusPresetRow').hidden = focusDraft.mode !== 'countdown';
      document.getElementById('focusIdleState').textContent = focusDraft.mode === 'countdown' ? 'COUNTDOWN' : 'STOPWATCH';
      document.getElementById('focusIdleTime').textContent = focusDraft.mode === 'countdown' ? `${String(focusDraft.plannedMinutes).padStart(2, '0')}:00` : '00:00';
      document.getElementById('focusIdleCaption').textContent = focusDraft.mode === 'countdown' ? 'an intention, not a test' : 'stay as long as the work needs';
    };
    document.querySelectorAll('[data-focus-mode]').forEach(button => button.addEventListener('click', () => {
      focusDraft.mode = button.dataset.focusMode;
      refreshDraftControls();
    }));
    document.querySelectorAll('[data-focus-minutes]').forEach(button => button.addEventListener('click', () => {
      focusDraft.mode = 'countdown';
      focusDraft.plannedMinutes = Number(button.dataset.focusMinutes);
      refreshDraftControls();
    }));
    refreshDraftControls();
    document.getElementById('startFocusSession').disabled = Boolean(focusLoadError);
    document.getElementById('focusStartForm').addEventListener('submit', startFocusSession);
    return;
  }

  const category = focusCategoryMeta(activeFocusSession.category);
  const display = activeFocusDisplay(activeFocusSession);
  const wrapper = document.createElement('div');
  wrapper.className = 'focus-room-inner';
  wrapper.innerHTML = `
    <div class="focus-timer-column">
      <div class="focus-timer-ring" id="activeFocusRing" style="--focus-progress:${display.progress * 360}deg">
        <div class="focus-timer-face">
          <span class="focus-timer-state" id="activeFocusTimerState"></span>
          <time class="focus-timer-value" id="activeFocusTime" role="timer" aria-live="off"></time>
          <span class="focus-timer-caption" id="activeFocusCaption"></span>
        </div>
      </div>
      <p id="activeFocusGentleLine">The session can be imperfect. Staying with it is already the work.</p>
    </div>
    <div class="focus-active-copy">
      <div class="focus-active-meta">
        <span class="focus-status-pill ${activeFocusSession.status === 'paused' ? 'is-paused' : 'is-running'}" id="activeFocusStatus"></span>
        <span class="focus-active-tag"></span>
      </div>
      <h3 id="activeFocusLabel"></h3>
      <p id="activeFocusStarted"></p>
      <div class="focus-active-note" id="activeFocusNote" hidden></div>
      <div class="focus-goal-message" id="activeFocusGoal"></div>
      <div class="focus-controls">
        <button class="btn ghost" id="toggleFocusSession" type="button"></button>
        <button class="btn ghost focus-float-button" id="floatFocusSession" type="button">Float timer ↗</button>
        <button class="btn primary" id="finishFocusSession" type="button">Finish & save</button>
        <button class="btn danger-ghost" id="cancelFocusSession" type="button">Discard</button>
      </div>
    </div>
  `;
  room.appendChild(wrapper);
  wrapper.querySelector('.focus-active-tag').textContent = `${category.icon} ${category.label}`;
  document.getElementById('activeFocusLabel').textContent = activeFocusSession.label?.trim() || 'An honest focus session';
  document.getElementById('activeFocusStarted').textContent = `Started ${new Date(activeFocusSession.startedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  const note = activeFocusSession.note?.trim();
  if (note) {
    const noteElement = document.getElementById('activeFocusNote');
    noteElement.hidden = false;
    noteElement.textContent = note;
  }
  document.getElementById('toggleFocusSession').addEventListener('click', () => runFocusAction(activeFocusSession.status === 'paused' ? 'resume' : 'pause'));
  document.getElementById('floatFocusSession').addEventListener('click', toggleFocusPictureInPicture);
  document.getElementById('finishFocusSession').addEventListener('click', openFocusFinishModal);
  document.getElementById('cancelFocusSession').addEventListener('click', cancelActiveFocusSession);
  updateActiveFocusDisplay();
}

function updateActiveFocusDisplay() {
  if (!activeFocusSession) {
    updateFocusMiniTimer();
    updateFocusPictureInPicture();
    updateFocusFloatingControls();
    updateFocusDocumentTitle();
    return;
  }
  const display = activeFocusDisplay(activeFocusSession);
  const state = document.getElementById('activeFocusTimerState');
  const value = document.getElementById('activeFocusTime');
  const caption = document.getElementById('activeFocusCaption');
  const ring = document.getElementById('activeFocusRing');
  const status = document.getElementById('activeFocusStatus');
  const toggle = document.getElementById('toggleFocusSession');
  const goal = document.getElementById('activeFocusGoal');
  if (state) state.textContent = display.label;
  if (value) value.textContent = display.value;
  if (caption) caption.textContent = display.caption;
  if (ring) {
    ring.style.setProperty('--focus-progress', `${display.progress * 360}deg`);
    if (activeFocusSession.mode === 'countdown' && Number(activeFocusSession.plannedSeconds) > 0) {
      ring.setAttribute('role', 'progressbar');
      ring.setAttribute('aria-label', 'Focus countdown progress');
      ring.setAttribute('aria-valuemin', '0');
      ring.setAttribute('aria-valuemax', String(activeFocusSession.plannedSeconds));
      ring.setAttribute('aria-valuenow', String(Math.min(display.elapsed, Number(activeFocusSession.plannedSeconds))));
    } else {
      ring.removeAttribute('role');
      ring.removeAttribute('aria-label');
      ring.removeAttribute('aria-valuemin');
      ring.removeAttribute('aria-valuemax');
      ring.removeAttribute('aria-valuenow');
    }
  }
  if (status) status.textContent = activeFocusSession.status === 'paused' ? 'Ⅱ Paused' : '● In the room';
  if (toggle) toggle.textContent = activeFocusSession.status === 'paused' ? 'Resume' : 'Pause';
  if (goal) goal.textContent = display.reached ? 'You reached the intention. Finish now or keep going—the extra time will still be recorded.' : '';
  updateFocusMiniTimer();
  updateFocusPictureInPicture();
  updateFocusFloatingControls();
  updateFocusDocumentTitle();
}

function updateFocusMiniTimer() {
  const mini = document.getElementById('focusMiniTimer');
  if (!mini) return;
  const focusTabOpen = document.getElementById('tab-focus')?.classList.contains('active');
  const visible = Boolean(activeFocusSession) && !focusTabOpen;
  mini.hidden = !visible;
  mini.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (!visible) return;
  const display = activeFocusDisplay(activeFocusSession);
  document.getElementById('focusMiniTime').textContent = display.value;
  const toggle = document.getElementById('focusMiniToggle');
  toggle.textContent = activeFocusSession.status === 'paused' ? 'Resume' : 'Pause';
  toggle.disabled = focusActionPending;
  updateFocusFloatingControls();
}

async function startFocusSession(event) {
  event.preventDefault();
  if (focusActionPending || focusLoadError) return;
  focusDraft.label = document.getElementById('focusStartLabel').value.trim().slice(0, 120);
  focusDraft.category = document.getElementById('focusStartCategory').value;
  focusDraft.note = document.getElementById('focusStartNote').value.trim().slice(0, 1000);
  const timeZone = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch (_) { return 'UTC'; }
  })();
  const draft = {
    date: localDateKey(),
    timeZone,
    label: focusDraft.label,
    category: focusDraft.category,
    note: focusDraft.note,
    mode: focusDraft.mode,
    plannedSeconds: focusDraft.mode === 'countdown' ? focusDraft.plannedMinutes * 60 : null,
  };
  const now = new Date().toISOString();
  const previewSession = syncFocusSession({
    id: 'starting-focus-session',
    status: 'running',
    ...draft,
    focusLevel: null,
    elapsedSeconds: 0,
    startedAt: now,
    runningSince: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const shouldAutoFloat = focusAutoFloat && supportsFocusPip();
  const pipAttempt = shouldAutoFloat
    ? openFocusPictureInPicture({ session: previewSession, silent: true })
    : null;
  const button = document.getElementById('startFocusSession');
  focusActionPending = true;
  button.disabled = true;
  button.textContent = 'Entering the room…';
  try {
    let session;
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      session = {
        id: uid(),
        status: 'running',
        ...draft,
        focusLevel: null,
        elapsedSeconds: 0,
        startedAt: now,
        runningSince: now,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      const response = await apiPost('/api/focus-sessions/start', draft);
      session = response.session;
    }
    activeFocusSession = syncFocusSession(session);
    focusPipPreviewSession = null;
    focusDraft.label = '';
    focusDraft.note = '';
    if (DEMO_MODE) persistDemoState();
    renderFocusRoom();
    showToast('Focus session started. You are in the room.');
    if (pipAttempt) {
      pipAttempt.then(opened => {
        if (!opened && activeFocusSession) showToast('Session started. Click “Float timer” if the browser blocked the floating window.');
      });
    }
  } catch (error) {
    if (error.status === 409) {
      let recovered = null;
      let recoveryError = null;
      try {
        recovered = await refreshActiveFocusSession({ throwOnError: true });
      } catch (refreshError) {
        recoveryError = refreshError;
      }
      focusPipPreviewSession = null;
      if (recovered) {
        showToast('A focus session was already active. I brought it back.');
      } else {
        closeFocusPictureInPicture({ silent: true });
        button.disabled = false;
        button.textContent = 'Start focus session';
        if (recoveryError?.status !== 401) {
          showToast(recoveryError
            ? 'Another session exists, but I could not reconnect to it. Check the connection and retry.'
            : 'That other session has ended. Press Start again when you are ready.');
        }
      }
    } else if (error.status === 401) {
      focusPipPreviewSession = null;
      closeFocusPictureInPicture({ silent: true });
      showLogin('Your session expired. Log back in, then start the focus session again.');
    } else {
      focusPipPreviewSession = null;
      closeFocusPictureInPicture({ silent: true });
      button.disabled = false;
      button.textContent = 'Start focus session';
      showToast(error.message || 'Could not start the session. Check the connection and try again.');
    }
  } finally {
    focusActionPending = false;
    updateActiveFocusDisplay();
  }
}

async function runFocusAction(action, body) {
  if (!activeFocusSession || focusActionPending) return null;
  const sessionId = activeFocusSession.id;
  focusActionPending = true;
  document.querySelectorAll('#focusRoom button, #focusMiniTimer button').forEach(button => { button.disabled = true; });
  try {
    let session;
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      const elapsed = focusElapsedSeconds(activeFocusSession);
      session = { ...activeFocusSession, elapsedSeconds: elapsed, updatedAt: now };
      if (action === 'pause') {
        session.status = 'paused';
        session.runningSince = null;
      } else if (action === 'resume') {
        session.status = 'running';
        session.runningSince = now;
      } else if (action === 'finish') {
        session.status = 'finished';
        session.runningSince = null;
        session.endedAt = now;
        session.note = typeof body?.note === 'string' ? body.note : session.note;
        session.focusLevel = body?.focusLevel || null;
      } else if (action === 'cancel') {
        session.status = 'cancelled';
        session.runningSince = null;
        session.endedAt = now;
      }
    } else {
      const response = await apiPost(`/api/focus-sessions/${encodeURIComponent(sessionId)}/${action}`, body);
      session = response.session;
    }

    if (action === 'finish' || action === 'cancel') {
      focusSessions = [syncFocusSession(session), ...focusSessions.filter(item => String(item.id) !== String(session.id))];
      activeFocusSession = null;
      focusPipPreviewSession = null;
      closeFocusPictureInPicture({ silent: true });
    } else {
      activeFocusSession = syncFocusSession(session);
    }
    if (DEMO_MODE) persistDemoState();
    renderFocusRoom();
    renderFocusHistory();
    return session;
  } catch (error) {
    if (error.status === 401) showLogin('Your session expired. Log back in to continue this focus session.');
    else showToast(error.message || 'That focus update did not save. Check the connection and retry.');
    return null;
  } finally {
    focusActionPending = false;
    document.querySelectorAll('#focusRoom button, #focusMiniTimer button').forEach(button => { button.disabled = false; });
    updateActiveFocusDisplay();
  }
}

async function cancelActiveFocusSession() {
  if (!activeFocusSession) return;
  if (!window.confirm('Discard this active focus session? Its minutes will not be included in your focus analytics.')) return;
  const cancelled = await runFocusAction('cancel');
  if (cancelled) showToast('Session discarded. You can begin again without guilt.');
}

function openFocusFinishModal() {
  if (!activeFocusSession || focusActionPending) return;
  focusReturnElement = document.activeElement;
  document.getElementById('focusFinishLevel').value = activeFocusSession.focusLevel || '';
  document.getElementById('focusFinishNote').value = activeFocusSession.note || '';
  document.getElementById('focusFinishError').textContent = '';
  document.getElementById('confirmFocusFinish').disabled = false;
  const backdrop = document.getElementById('focusFinishBackdrop');
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('focusFinishLevel').focus(), 40);
}

function closeFocusFinishModal({ restoreFocus = true } = {}) {
  if (focusActionPending) return;
  const backdrop = document.getElementById('focusFinishBackdrop');
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.getElementById('focusFinishError').textContent = '';
  if (restoreFocus && focusReturnElement instanceof HTMLElement) focusReturnElement.focus();
  focusReturnElement = null;
}

async function finishFocusSession(event) {
  event.preventDefault();
  if (!activeFocusSession || focusActionPending) return;
  const button = document.getElementById('confirmFocusFinish');
  button.disabled = true;
  button.textContent = 'Saving…';
  const level = document.getElementById('focusFinishLevel').value;
  const body = {
    focusLevel: level || null,
    note: document.getElementById('focusFinishNote').value.trim().slice(0, 1000),
  };
  const saved = await runFocusAction('finish', body);
  button.disabled = false;
  button.textContent = 'Save session';
  if (!saved) {
    document.getElementById('focusFinishError').textContent = 'The session is still safe and active. Check the connection, then try Save again.';
    return;
  }
  closeFocusFinishModal({ restoreFocus: false });
  renderFocusSneak();
  showToast(`${formatFocusHuman(saved.elapsedSeconds, { precise: true })} of focus saved. Imperfect action still counts.`);
}

async function refreshActiveFocusSession({ throwOnError = false } = {}) {
  if (DEMO_MODE || focusLoadError) return activeFocusSession;
  try {
    const response = await apiGet('/api/focus-sessions/active');
    const session = response.session || null;
    if (session) {
      activeFocusSession = syncFocusSession(session);
    } else if (activeFocusSession) {
      const all = await apiGet('/api/focus-sessions');
      const rows = Array.isArray(all.sessions) ? all.sessions.map(syncFocusSession) : [];
      focusSessions = rows.filter(item => item.status !== 'running' && item.status !== 'paused');
      activeFocusSession = rows.find(item => item.status === 'running' || item.status === 'paused') || null;
    }
    if (!activeFocusSession) closeFocusPictureInPicture({ silent: true });
    renderFocusRoom();
    if (document.getElementById('tab-focus').classList.contains('active')) renderFocusHistory();
    return activeFocusSession;
  } catch (error) {
    if (error.status === 401) showLogin('Your session expired. Log back in to reconnect the focus timer.');
    if (throwOnError) throw error;
    return null;
  }
}

function focusSessionDateKey(session) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(session?.date || '')) return session.date;
  const instant = Date.parse(session?.endedAt || session?.startedAt);
  return Number.isFinite(instant) ? localDateKey(new Date(instant)) : localDateKey();
}

function focusPeriodRange() {
  if (focusView.period === 'all') return [-Infinity, Infinity];
  return getRange(focusView.period, focusView.offset);
}

function finishedFocusSessions() {
  return focusSessions.filter(session => session.status === 'finished');
}

function focusSessionsInPeriod({ includeCategoryFilter = false } = {}) {
  const [start, end] = focusPeriodRange();
  return finishedFocusSessions().filter(session => {
    const date = dateKeyToLocalDate(focusSessionDateKey(session));
    const timestamp = date?.getTime();
    if (!Number.isFinite(timestamp) || timestamp < start || timestamp >= end) return false;
    if (!includeCategoryFilter || focusView.category === 'all') return true;
    if (focusView.category === 'none') return !session.category;
    return session.category === focusView.category;
  });
}

function focusPeriodCopy() {
  if (focusView.period === 'all') {
    const finished = finishedFocusSessions();
    const earliest = finished.length
      ? finished.reduce((min, session) => focusSessionDateKey(session) < min ? focusSessionDateKey(session) : min, focusSessionDateKey(finished[0]))
      : localDateKey();
    const earliestDate = dateKeyToLocalDate(earliest);
    return {
      label: 'All recorded focus',
      sublabel: finished.length
        ? `since ${earliestDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : 'ready for your first honest session',
    };
  }
  return {
    label: rangeLabel(focusView.period, focusView.offset),
    sublabel: rangeSubLabel(focusView.period, focusView.offset),
  };
}

function focusDailySeries(entries) {
  let start;
  let end;
  if (focusView.period === 'all') {
    const finished = finishedFocusSessions();
    start = finished.length
      ? dateKeyToLocalDate(finished.reduce((min, session) => focusSessionDateKey(session) < min ? focusSessionDateKey(session) : min, focusSessionDateKey(finished[0])))
      : startOfDay(new Date());
    end = addDays(startOfDay(new Date()), 1);
  } else {
    const range = focusPeriodRange();
    start = new Date(range[0]);
    end = new Date(range[1]);
  }
  const secondsByDate = new Map();
  entries.forEach(session => {
    const key = focusSessionDateKey(session);
    secondsByDate.set(key, (secondsByDate.get(key) || 0) + Math.max(0, Number(session.elapsedSeconds) || 0));
  });
  const labels = [];
  const seconds = [];
  const dates = [];
  for (let day = new Date(start); day < end; day = addDays(day, 1)) {
    dates.push(new Date(day));
    labels.push(day.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(focusView.period === 'all' && day.getFullYear() !== new Date().getFullYear() ? { year: '2-digit' } : {}),
    }));
    seconds.push(secondsByDate.get(localDateKey(day)) || 0);
  }
  return { labels, seconds, dates };
}

function renderFocusSummary(entries) {
  const total = entries.reduce((sum, session) => sum + Math.max(0, Number(session.elapsedSeconds) || 0), 0);
  const average = entries.length ? Math.round(total / entries.length) : 0;
  const longest = entries.reduce((max, session) => Math.max(max, Number(session.elapsedSeconds) || 0), 0);
  const activeDays = new Set(entries.map(focusSessionDateKey)).size;
  const cards = [
    { label: 'Focus time', value: formatFocusHuman(total), note: 'actual time you protected' },
    { label: 'Sessions', value: String(entries.length), note: entries.length === 1 ? 'one honest start' : 'honest starts recorded' },
    { label: 'Average session', value: formatFocusHuman(average), note: 'no minimum required' },
    { label: 'Longest session', value: formatFocusHuman(longest), note: `${activeDays} active day${activeDays === 1 ? '' : 's'}` },
  ];
  document.getElementById('focusSummary').innerHTML = cards.map(card => `
    <article class="focus-summary-card">
      <div class="focus-summary-label">${card.label}</div>
      <div class="focus-summary-value">${card.value}</div>
      <div class="focus-summary-note">${card.note}</div>
    </article>
  `).join('');
}

function renderFocusCharts(entries) {
  focusTrendChart?.destroy();
  focusCategoryChart?.destroy();
  focusTrendChart = null;
  focusCategoryChart = null;
  const trendCanvas = document.getElementById('focusTrendChart');
  const categoryCanvas = document.getElementById('focusCategoryChart');
  trendCanvas.hidden = false;
  categoryCanvas.hidden = false;
  document.querySelectorAll('.focus-empty-chart').forEach(element => element.remove());
  const { labels, seconds } = focusDailySeries(entries);
  const minutes = seconds.map(value => Math.round(value / 6) / 10);
  document.getElementById('focusChartStage').style.width = `${Math.max(620, labels.length * 42)}px`;
  document.getElementById('focusTrendHint').textContent = `${labels.length} day${labels.length === 1 ? '' : 's'} · zeroes stay visible`;

  const categoryTotals = new Map();
  entries.forEach(session => {
    const key = session.category || '';
    categoryTotals.set(key, (categoryTotals.get(key) || 0) + Math.max(0, Number(session.elapsedSeconds) || 0));
  });
  const categoryEntries = [...categoryTotals.entries()]
    .map(([id, secondsValue]) => ({ meta: focusCategoryMeta(id), seconds: secondsValue }))
    .sort((a, b) => b.seconds - a.seconds);
  const maxCategory = Math.max(1, ...categoryEntries.map(entry => entry.seconds));
  const breakdown = document.getElementById('focusCategoryBreakdown');
  breakdown.innerHTML = '';
  if (!categoryEntries.length) {
    const empty = document.createElement('div');
    empty.className = 'category-insight-empty';
    empty.textContent = 'Your first session will start this picture.';
    breakdown.appendChild(empty);
  } else {
    categoryEntries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'focus-category-row';
      const name = document.createElement('span');
      name.className = 'focus-category-name';
      name.textContent = `${entry.meta.icon} ${entry.meta.label}`;
      const track = document.createElement('span');
      track.className = 'focus-category-track';
      const fill = document.createElement('span');
      fill.className = 'focus-category-fill';
      fill.style.width = `${(entry.seconds / maxCategory) * 100}%`;
      fill.style.background = entry.meta.color;
      track.appendChild(fill);
      const value = document.createElement('span');
      value.className = 'focus-category-value';
      value.textContent = formatFocusHuman(entry.seconds);
      row.append(name, track, value);
      breakdown.appendChild(row);
    });
  }

  if (typeof Chart === 'undefined') {
    trendCanvas.hidden = true;
    categoryCanvas.hidden = true;
    const trendEmpty = document.createElement('div');
    trendEmpty.className = 'focus-empty-chart';
    trendEmpty.textContent = `${formatFocusHuman(seconds.reduce((sum, value) => sum + value, 0))} recorded in this period.`;
    trendCanvas.parentElement.appendChild(trendEmpty);
    return;
  }

  focusTrendChart = new Chart(trendCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Focus minutes',
        data: minutes,
        backgroundColor: minutes.map(value => value > 0 ? '#c0376a' : '#f1d7e0'),
        borderColor: '#b84d76',
        borderWidth: 1,
        borderRadius: 7,
        maxBarThickness: 34,
      }],
    },
    options: baseChartOptions({
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: item => `${item.raw} focused minute${item.raw === 1 ? '' : 's'}` } },
      },
      scales: {
        x: { ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 }, maxRotation: 45, minRotation: labels.length > 12 ? 35 : 0 }, grid: { color: CHART_COLORS.grid } },
        y: { ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 }, callback: value => `${value}m` }, grid: { color: CHART_COLORS.grid }, beginAtZero: true },
      },
    }),
  });

  focusCategoryChart = new Chart(categoryCanvas, {
    type: 'doughnut',
    data: {
      labels: categoryEntries.length ? categoryEntries.map(entry => `${entry.meta.icon} ${entry.meta.label}`) : ['No sessions yet'],
      datasets: [{
        data: categoryEntries.length ? categoryEntries.map(entry => Math.round(entry.seconds / 6) / 10) : [1],
        backgroundColor: categoryEntries.length ? categoryEntries.map(entry => entry.meta.color) : ['#f1d7e0'],
        borderColor: '#fffdfd',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => `${item.label}: ${item.raw}m` } } },
    },
  });
}

function focusClockTime(iso) {
  const timestamp = Date.parse(iso);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '—';
}

function renderFocusLog() {
  const filter = document.getElementById('focusCategoryFilter');
  if (filter.options.length <= 2) populateFocusCategorySelect(filter, { includeAll: true });
  filter.value = focusView.category;
  const entries = [...focusSessionsInPeriod({ includeCategoryFilter: true })]
    .sort((a, b) => Date.parse(b.endedAt || b.startedAt) - Date.parse(a.endedAt || a.startedAt));
  document.getElementById('focusLogCount').textContent = `${entries.length} saved session${entries.length === 1 ? '' : 's'}`;
  const logElement = document.getElementById('focusLog');
  logElement.innerHTML = '';
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'focus-log-empty';
    empty.textContent = focusView.category === 'all'
      ? 'No proof yet in this period. Start with ten honest minutes.'
      : 'No sessions match this tag in the selected period.';
    logElement.appendChild(empty);
    return;
  }
  const groups = new Map();
  entries.forEach(session => {
    const key = focusSessionDateKey(session);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(session);
  });
  groups.forEach((sessions, key) => {
    const day = document.createElement('section');
    day.className = 'focus-day-group';
    const head = document.createElement('div');
    head.className = 'focus-day-head';
    const date = dateKeyToLocalDate(key);
    const dateLabel = document.createElement('strong');
    dateLabel.textContent = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const total = document.createElement('span');
    total.className = 'focus-day-total';
    const daySeconds = sessions.reduce((sum, session) => sum + (Number(session.elapsedSeconds) || 0), 0);
    total.textContent = `${formatFocusHuman(daySeconds)} · ${sessions.length} session${sessions.length === 1 ? '' : 's'}`;
    head.append(dateLabel, total);
    day.appendChild(head);
    sessions.forEach(session => {
      const category = focusCategoryMeta(session.category);
      const row = document.createElement('article');
      row.className = 'focus-entry';
      const main = document.createElement('div');
      main.className = 'focus-entry-main';
      const title = document.createElement('div');
      title.className = 'focus-entry-title';
      title.textContent = session.label?.trim() || 'Untitled focus session';
      const details = document.createElement('div');
      details.className = 'focus-entry-detail';
      const level = session.focusLevel && FOCUS_LEVELS[session.focusLevel];
      const planned = Number(session.plannedSeconds) || 0;
      [
        `${category.icon} ${category.label}`,
        `${focusClockTime(session.startedAt)}–${focusClockTime(session.endedAt)}`,
        planned ? `${formatFocusHuman(planned)} intention` : 'stopwatch',
        level ? `${level.icon} ${level.label}` : '',
      ].filter(Boolean).forEach(textValue => {
        const span = document.createElement('span');
        span.textContent = textValue;
        details.appendChild(span);
      });
      if (session.note?.trim()) {
        const note = document.createElement('div');
        note.className = 'focus-entry-detail';
        note.textContent = `📝 ${session.note.trim()}`;
        main.append(title, details, note);
      } else {
        main.append(title, details);
      }
      const duration = document.createElement('div');
      duration.className = 'focus-entry-duration';
      duration.textContent = formatFocusHuman(session.elapsedSeconds, { precise: true });
      const actions = document.createElement('div');
      actions.className = 'focus-entry-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn ghost small';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${title.textContent} from ${dateLabel.textContent}`);
      edit.addEventListener('click', () => openFocusEditModal(session.id));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn danger-ghost small log-delete-action';
      remove.textContent = '🗑 Delete';
      remove.dataset.deleteFocusId = String(session.id);
      remove.setAttribute('aria-label', `Delete ${title.textContent}, ${duration.textContent}, from ${dateLabel.textContent}`);
      remove.addEventListener('click', () => deleteFocusSession(session.id, remove));
      actions.append(edit, remove);
      row.append(main, duration, actions);
      day.appendChild(row);
    });
    logElement.appendChild(day);
  });
}

function renderFocusHistory() {
  const allTime = focusView.period === 'all';
  document.querySelectorAll('#focusPeriod .seg-btn').forEach(button => {
    const selected = button.dataset.focusPeriod === focusView.period;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const nav = document.getElementById('focusDateNav');
  const actions = document.getElementById('focusDateActions');
  nav.classList.toggle('is-all-time', allTime);
  actions.classList.toggle('is-all-time', allTime);
  const copy = focusPeriodCopy();
  document.getElementById('focusRangeLabel').textContent = copy.label;
  document.getElementById('focusRangeSub').textContent = copy.sublabel;
  document.getElementById('focusNext').disabled = allTime || focusView.offset >= 0;
  document.getElementById('focusJumpToday').disabled = focusView.offset === 0;
  const [start] = focusPeriodRange();
  document.getElementById('focusJumpDate').value = allTime || !Number.isFinite(start) ? '' : localDateKey(new Date(start));
  const entries = focusSessionsInPeriod();
  renderFocusSummary(entries);
  renderFocusCharts(entries);
  renderFocusLog();
}

function renderFocus() {
  const status = document.getElementById('focusLoadStatus');
  status.hidden = !focusLoadError;
  document.getElementById('focusLoadMessage').textContent = focusLoadError;
  renderFocusRoom();
  renderFocusHistory();
}

function openFocusEditModal(id) {
  const session = focusSessions.find(item => String(item.id) === String(id) && item.status === 'finished');
  if (!session) return;
  editingFocusId = session.id;
  focusReturnElement = document.activeElement;
  document.getElementById('focusEditLabel').value = session.label || '';
  const category = document.getElementById('focusEditCategory');
  populateFocusCategorySelect(category);
  category.value = session.category || '';
  document.getElementById('focusEditLevel').value = session.focusLevel || '';
  document.getElementById('focusEditNote').value = session.note || '';
  document.getElementById('focusEditError').textContent = '';
  document.getElementById('saveFocusEdit').disabled = false;
  const backdrop = document.getElementById('focusEditBackdrop');
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('focusEditLabel').focus(), 40);
}

function closeFocusEditModal({ restoreFocus = true } = {}) {
  if (focusActionPending) return;
  document.getElementById('focusEditBackdrop').classList.remove('open');
  document.getElementById('focusEditBackdrop').setAttribute('aria-hidden', 'true');
  document.getElementById('focusEditError').textContent = '';
  editingFocusId = null;
  if (restoreFocus && focusReturnElement instanceof HTMLElement) focusReturnElement.focus();
  focusReturnElement = null;
}

async function saveFocusEdit(event) {
  event.preventDefault();
  const session = focusSessions.find(item => String(item.id) === String(editingFocusId));
  if (!session || focusActionPending) return;
  const draft = {
    label: document.getElementById('focusEditLabel').value.trim().slice(0, 120),
    category: document.getElementById('focusEditCategory').value,
    note: document.getElementById('focusEditNote').value.trim().slice(0, 1000),
    date: focusSessionDateKey(session),
    timeZone: session.timeZone || (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
      catch (_) { return 'UTC'; }
    })(),
    focusLevel: document.getElementById('focusEditLevel').value || null,
  };
  const button = document.getElementById('saveFocusEdit');
  focusActionPending = true;
  button.disabled = true;
  button.textContent = 'Saving…';
  try {
    let saved;
    if (DEMO_MODE) {
      saved = syncFocusSession({ ...session, ...draft, updatedAt: new Date().toISOString() });
    } else {
      const response = await apiPut(`/api/focus-sessions/${encodeURIComponent(session.id)}`, draft);
      saved = syncFocusSession(response.session);
    }
    focusSessions = focusSessions.map(item => String(item.id) === String(session.id) ? saved : item);
    if (DEMO_MODE) persistDemoState();
    focusActionPending = false;
    closeFocusEditModal({ restoreFocus: false });
    renderFocusHistory();
    renderFocusSneak();
    showToast('Focus session updated.');
  } catch (error) {
    document.getElementById('focusEditError').textContent = error.status === 401
      ? 'Your session expired. Log back in, then save this edit again.'
      : (error.message || 'Could not update this session. Try again.');
    if (error.status === 401) showLogin('Your session expired. Log back in to edit this focus session.');
  } finally {
    focusActionPending = false;
    button.disabled = false;
    button.textContent = 'Save changes';
  }
}

async function deleteFocusSession(id, button = null) {
  const session = focusSessions.find(item => String(item.id) === String(id));
  if (!session) return;
  const key = String(session.id);
  if (deletingFocusSessionIds.has(key)) return;
  const label = session.label?.trim() || 'this focus session';
  if (!window.confirm(`Delete “${label}” and its ${formatFocusHuman(session.elapsedSeconds, { precise: true })} from your focus history?`)) return;
  deletingFocusSessionIds.add(key);
  if (button) {
    button.disabled = true;
    button.textContent = 'Deleting…';
  }
  try {
    if (!DEMO_MODE) {
      try {
        await apiDelete(`/api/focus-sessions/${encodeURIComponent(session.id)}`);
      } catch (error) {
        if (error.status !== 404) throw error;
      }
    }
    focusSessions = focusSessions.filter(item => String(item.id) !== String(session.id));
    if (DEMO_MODE) persistDemoState();
    renderFocusHistory();
    renderFocusSneak();
    const heading = document.getElementById('focusLogTitle');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    showToast('Focus session deleted. Your totals and charts are updated.');
  } catch (error) {
    if (error.status === 401) {
      showLogin('Your session expired. Log back in, then delete this focus session again.');
    } else {
      showToast('Couldn’t delete that focus session. It is still safely in your log.');
    }
  } finally {
    deletingFocusSessionIds.delete(key);
    if (button?.isConnected) {
      button.disabled = false;
      button.textContent = '🗑 Delete';
    }
  }
}

function focusSecondsForRange(start, end) {
  return finishedFocusSessions()
    .filter(session => {
      const date = dateKeyToLocalDate(focusSessionDateKey(session));
      const timestamp = date?.getTime();
      return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
    })
    .reduce((sum, session) => sum + Math.max(0, Number(session.elapsedSeconds) || 0), 0);
}

function renderFocusSneak() {
  const stats = document.getElementById('focusSneakStats');
  if (!stats) return;
  focusSneakChart?.destroy();
  focusSneakChart = null;
  const chartCanvas = document.getElementById('focusSneakChart');
  if (focusLoadError) {
    stats.innerHTML = '<span class="hint">Focus data is temporarily unavailable. Your task analytics are unaffected.</span>';
    chartCanvas.hidden = true;
    return;
  }
  chartCanvas.hidden = false;
  const [todayStart, todayEnd] = getRange('day', 0);
  const [weekStart, weekEnd] = getRange('week', 0);
  const todayEntries = finishedFocusSessions().filter(session => focusSessionDateKey(session) === localDateKey());
  const todaySeconds = focusSecondsForRange(todayStart, todayEnd);
  const weekSeconds = focusSecondsForRange(weekStart, weekEnd);
  stats.innerHTML = `
    <div class="focus-sneak-stat"><strong>${formatFocusHuman(todaySeconds)}</strong><span>today</span></div>
    <div class="focus-sneak-stat"><strong>${todayEntries.length}</strong><span>session${todayEntries.length === 1 ? '' : 's'} today</span></div>
    <div class="focus-sneak-stat"><strong>${formatFocusHuman(weekSeconds)}</strong><span>this week</span></div>
  `;
  const labels = [];
  const data = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = addDays(startOfDay(new Date()), -offset);
    const end = addDays(day, 1);
    labels.push(day.toLocaleDateString(undefined, { weekday: 'short' }));
    data.push(Math.round(focusSecondsForRange(day.getTime(), end.getTime()) / 6) / 10);
  }
  if (typeof Chart === 'undefined') return;
  focusSneakChart = new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: data.map(value => value > 0 ? '#c0376a' : '#f1d7e0'), borderRadius: 6, maxBarThickness: 28 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => `${item.raw} focused minute${item.raw === 1 ? '' : 's'}` } } },
      scales: {
        x: { ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 9 } }, grid: { display: false } },
        y: { display: false, beginAtZero: true },
      },
    },
  });
}

document.getElementById('focusMiniReturn').addEventListener('click', () => document.querySelector('[data-tab="focus"]')?.click());
document.getElementById('focusMiniFloat').addEventListener('click', toggleFocusPictureInPicture);
document.getElementById('focusMiniToggle').addEventListener('click', () => runFocusAction(activeFocusSession?.status === 'paused' ? 'resume' : 'pause'));
document.getElementById('focusFinishForm').addEventListener('submit', finishFocusSession);
document.getElementById('cancelFocusFinish').addEventListener('click', () => closeFocusFinishModal());
document.getElementById('focusFinishBackdrop').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeFocusFinishModal();
});
document.getElementById('focusEditForm').addEventListener('submit', saveFocusEdit);
document.getElementById('cancelFocusEdit').addEventListener('click', () => closeFocusEditModal());
document.getElementById('focusEditBackdrop').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeFocusEditModal();
});
document.getElementById('retryFocus').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Retrying…';
  try {
    const response = await apiGet('/api/focus-sessions');
    const rows = Array.isArray(response.sessions) ? response.sessions.map(syncFocusSession) : [];
    activeFocusSession = rows.find(session => session.status === 'running' || session.status === 'paused') || null;
    focusSessions = rows.filter(session => session.status !== 'running' && session.status !== 'paused');
    focusLoadError = '';
    renderFocus();
    showToast('Focus sessions loaded.');
  } catch (error) {
    if (error.status === 401) showLogin('Your session expired. Log back in to load focus sessions.');
    else {
      focusLoadError = 'Focus sessions still could not be loaded. Check the connection and retry.';
      renderFocus();
    }
  } finally {
    button.disabled = false;
    button.textContent = 'Retry';
  }
});
document.querySelectorAll('#focusPeriod .seg-btn').forEach(button => button.addEventListener('click', () => {
  focusView.period = button.dataset.focusPeriod;
  focusView.offset = 0;
  renderFocusHistory();
}));
document.getElementById('focusPrev').addEventListener('click', () => {
  if (focusView.period === 'all') return;
  focusView.offset -= 1;
  renderFocusHistory();
});
document.getElementById('focusNext').addEventListener('click', () => {
  if (focusView.period === 'all' || focusView.offset >= 0) return;
  focusView.offset += 1;
  renderFocusHistory();
});
document.getElementById('focusJumpToday').addEventListener('click', () => {
  focusView.offset = 0;
  renderFocusHistory();
});
document.getElementById('focusJumpDate').addEventListener('change', event => {
  const picked = dateKeyToLocalDate(event.target.value);
  if (!picked || focusView.period === 'all') return;
  focusView.offset = offsetFromDate(focusView.period, picked);
  renderFocusHistory();
});
document.getElementById('focusCategoryFilter').addEventListener('change', event => {
  focusView.category = event.target.value;
  renderFocusLog();
});
document.getElementById('openFocusFromAnalytics').addEventListener('click', () => document.querySelector('[data-tab="focus"]')?.click());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && activeFocusSession) refreshActiveFocusSession();
});
document.addEventListener('keydown', event => {
  const openBackdrop = [document.getElementById('focusFinishBackdrop'), document.getElementById('focusEditBackdrop')]
    .find(backdrop => backdrop.classList.contains('open'));
  if (!openBackdrop) return;
  if (event.key === 'Escape') {
    if (openBackdrop.id === 'focusFinishBackdrop') closeFocusFinishModal();
    else closeFocusEditModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...openBackdrop.querySelectorAll('input, select, textarea, button:not([disabled])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// ---------- Analytics ----------

const CHART_COLORS = { text: '#7b5665', grid: 'rgba(207, 113, 147, 0.2)', accent: '#c0376a', accent2: '#98621f', accent3: '#99507f' };
let charts = {};
const analytics = { period: 'week' };
let analyticsCategoryId = 'glow_up';

function analyticsLogEntries() {
  if (analytics.period === 'all') return log;
  const [start, end] = getRange(analytics.period, 0);
  return log.filter(task => task.completedAt >= start && task.completedAt < end);
}

function categoryAnalyticsData() {
  const entries = analyticsLogEntries();
  const map = {};
  const taskCounts = {};
  CATEGORIES.forEach(category => { map[category.id] = 0; taskCounts[category.id] = 0; });
  entries.forEach(task => {
    map[task.category] = (map[task.category] || 0) + task.points;
    taskCounts[task.category] = (taskCounts[task.category] || 0) + 1;
  });
  return { entries, map, taskCounts };
}

function categoryPointsAllTime() {
  const map = {};
  CATEGORIES.forEach(c => map[c.id] = 0);
  log.forEach(t => { map[t.category] = (map[t.category] || 0) + t.points; });
  return map;
}

function pointsByDOW() {
  const totals = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
  log.forEach(t => { totals[new Date(t.completedAt).getDay()] += t.points; });
  return [1, 2, 3, 4, 5, 6, 0].map(i => totals[i]); // reorder Mon..Sun
}

function trendSeries(days) {
  const labels = [];
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(startOfDay(new Date()), -i);
    const dEnd = addDays(d, 1);
    const pts = log.filter(t => t.completedAt >= d.getTime() && t.completedAt < dEnd.getTime())
                   .reduce((s, t) => s + t.points, 0);
    labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    data.push(pts);
  }
  return { labels, data };
}

function analyticsDailyTrendSeries() {
  const today = startOfDay(new Date());
  let start;
  let periodLabel;

  if (analytics.period === 'all') {
    start = log.length
      ? startOfDay(new Date(Math.min(...log.map(task => task.completedAt))))
      : today;
    periodLabel = 'All time';
  } else {
    const [rangeStart] = getRange(analytics.period, 0);
    start = startOfDay(new Date(rangeStart));
    periodLabel = analytics.period === 'week' ? 'This week' : 'This month';
  }

  const pointsByDay = new Map();
  log.forEach(task => {
    const taskDay = localDateKey(new Date(task.completedAt));
    pointsByDay.set(taskDay, (pointsByDay.get(taskDay) || 0) + task.points);
  });

  const labels = [];
  const data = [];
  const dates = [];
  for (let day = new Date(start); day <= today; day = addDays(day, 1)) {
    dates.push(new Date(day));
    labels.push(day.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(analytics.period === 'all' && day.getFullYear() !== today.getFullYear() ? { year: '2-digit' } : {})
    }));
    data.push(pointsByDay.get(localDateKey(day)) || 0);
  }

  return { labels, data, dates, periodLabel };
}

function allTimeCategoryDailySeries(categoryId) {
  const today = startOfDay(new Date());
  const start = log.length
    ? startOfDay(new Date(Math.min(...log.map(task => task.completedAt))))
    : today;
  const pointsByDay = new Map();

  log.filter(task => task.category === categoryId).forEach(task => {
    const key = localDateKey(new Date(task.completedAt));
    pointsByDay.set(key, (pointsByDay.get(key) || 0) + task.points);
  });

  const labels = [];
  const data = [];
  const dates = [];
  for (let day = new Date(start); day <= today; day = addDays(day, 1)) {
    dates.push(new Date(day));
    labels.push(day.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(day.getFullYear() !== today.getFullYear() ? { year: '2-digit' } : {})
    }));
    data.push(pointsByDay.get(localDateKey(day)) || 0);
  }

  return { labels, data, dates };
}

function openLogForDate(date, categoryId = 'all') {
  logDateFilter = localDateKey(date);
  logCategoryFilter = categoryId;
  document.querySelector('[data-tab="log"]')?.click();
}

function dailyPointInteraction(dates, categoryId = 'all') {
  return {
    onClick: (event, _elements, chart) => {
      const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
      const dailyPoint = points.find(point => point.datasetIndex === 0);
      if (dailyPoint) openLogForDate(dates[dailyPoint.index], categoryId);
    },
    onHover: (event, _elements, chart) => {
      const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
      const target = event.native?.target;
      if (target) target.style.cursor = points.some(point => point.datasetIndex === 0) ? 'pointer' : 'default';
    }
  };
}

function computeStreaks() {
  const daySet = new Set(log.map(t => new Date(t.completedAt).toDateString()));
  let current = 0;
  let cursor = new Date();
  if (!daySet.has(cursor.toDateString())) cursor = addDays(cursor, -1);
  while (daySet.has(cursor.toDateString())) { current++; cursor = addDays(cursor, -1); }

  let best = 0, run = 0;
  if (log.length) {
    const minDate = startOfDay(new Date(Math.min(...log.map(t => t.completedAt))));
    let d = new Date(minDate);
    const today = startOfDay(new Date());
    while (d <= today) {
      if (daySet.has(d.toDateString())) { run++; best = Math.max(best, run); } else { run = 0; }
      d = addDays(d, 1);
    }
  }
  return { current, best: Math.max(best, current) };
}

function renderStatChips() {
  const totalPts = log.reduce((s, t) => s + t.points, 0);
  const streaks = computeStreaks();
  const { data: last30 } = trendSeries(30);
  const avg30 = last30.length ? Math.round((last30.reduce((a, b) => a + b, 0) / 30) * 10) / 10 : 0;

  const chips = [
    { value: streaks.current, label: 'Day Streak' },
    { value: streaks.best, label: 'Best Streak' },
    { value: log.length, label: 'Tasks Done' },
    { value: totalPts, label: 'All-Time Points' },
    { value: avg30, label: 'Avg / Day (30d)' },
  ];

  document.getElementById('statChipRow').innerHTML = chips.map(c => `
    <div class="stat-chip"><div class="chip-value">${c.value}</div><div class="chip-label">${c.label}</div></div>
  `).join('');
}

function baseChartOptions(extra) {
  return Object.assign({
    responsive: true,
    plugins: {
      legend: { labels: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 11 } } }
    },
    scales: {
      x: { ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 } }, grid: { color: CHART_COLORS.grid } },
      y: { ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 } }, grid: { color: CHART_COLORS.grid }, beginAtZero: true }
    }
  }, extra);
}

function renderCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  const { labels, data, dates, periodLabel } = analyticsDailyTrendSeries();
  const trendStage = document.getElementById('trendChartStage');
  trendStage.style.width = `${Math.max(680, labels.length * 38)}px`;
  document.getElementById('trendChartHint').textContent = `· ${periodLabel} · ${labels.length} day${labels.length === 1 ? '' : 's'} · target ${targets.day}${analytics.period === 'all' ? ' · click a dot for its log' : ''}`;
  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily points',
        data,
        borderColor: CHART_COLORS.accent,
        backgroundColor: 'rgba(255, 93, 168, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHitRadius: 10,
        pointHoverRadius: 6,
        pointBackgroundColor: CHART_COLORS.accent2,
      }, {
        label: `${targets.day}-point target`,
        data: labels.map(() => targets.day),
        borderColor: CHART_COLORS.accent2,
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0,
      }]
    },
    options: baseChartOptions({
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      ...(analytics.period === 'all' ? dailyPointInteraction(dates) : {}),
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => items[0]?.label || '',
            label: item => `${item.dataset.label}: ${item.raw} point${item.raw === 1 ? '' : 's'}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 }, maxRotation: 50, minRotation: 40 },
          grid: { color: CHART_COLORS.grid }
        },
        y: {
          ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 }, precision: 0 },
          grid: { color: CHART_COLORS.grid },
          beginAtZero: true
        }
      }
    })
  });

  const { map: catMap } = categoryAnalyticsData();
  const catEntries = CATEGORIES.map(c => ({ c, val: catMap[c.id] || 0 })).filter(e => e.val > 0);
  charts.doughnut = new Chart(document.getElementById('categoryDoughnut'), {
    type: 'doughnut',
    data: {
      labels: catEntries.length ? catEntries.map(e => `${e.c.icon} ${e.c.label}`) : ['No data yet'],
      datasets: [{
        data: catEntries.length ? catEntries.map(e => e.val) : [1],
        backgroundColor: catEntries.length ? catEntries.map(e => e.c.color) : ['#cf7193'],
        borderColor: '#fffdfd',
        borderWidth: 2,
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: CHART_COLORS.text, boxWidth: 12, font: { family: 'Poppins', size: 11 } } } } }
  });

  charts.dow = new Chart(document.getElementById('dowChart'), {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: pointsByDOW(),
        backgroundColor: ['#5b6ee1', '#e6547a', '#3fae8a', '#8c52d9', '#e3b23c', '#d63864', '#c9a0e8'],
        borderRadius: 6,
      }]
    },
    options: baseChartOptions({ plugins: { legend: { display: false } } })
  });

  renderCategoryHistoryChart();
}

function renderCategoryHistoryChart() {
  const picker = document.getElementById('categoryHistorySelect');
  if (!picker.options.length) {
    CATEGORIES.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.icon} ${category.label}`;
      picker.appendChild(option);
    });
  }
  if (!CATEGORIES.some(category => category.id === analyticsCategoryId)) analyticsCategoryId = CATEGORIES[0].id;
  picker.value = analyticsCategoryId;

  const category = catById(analyticsCategoryId);
  const { labels, data, dates } = allTimeCategoryDailySeries(analyticsCategoryId);
  const categoryTasks = log.filter(task => task.category === analyticsCategoryId);
  const activeDays = data.filter(points => points > 0).length;
  const zeroDays = data.length - activeDays;
  const totalPoints = data.reduce((sum, points) => sum + points, 0);
  const lastTask = categoryTasks.reduce((latest, task) => !latest || task.completedAt > latest.completedAt ? task : latest, null);
  const lastDone = lastTask
    ? new Date(lastTask.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  document.getElementById('categoryHistorySummary').innerHTML = `
    <div><strong>${totalPoints}</strong><span>all-time points</span></div>
    <div><strong>${activeDays}</strong><span>active days</span></div>
    <div><strong>${zeroDays}</strong><span>zero-point days</span></div>
    <div><strong>${lastDone}</strong><span>last activity</span></div>
  `;
  document.getElementById('categoryHistoryStage').style.width = `${Math.max(680, labels.length * 38)}px`;

  charts.categoryHistory?.destroy();
  charts.categoryHistory = new Chart(document.getElementById('categoryHistoryChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${category.icon} ${category.label}`,
        data,
        borderColor: category.color,
        backgroundColor: `${category.color}24`,
        fill: true,
        tension: 0.28,
        pointRadius: 3,
        pointHitRadius: 10,
        pointHoverRadius: 6,
        pointBackgroundColor: category.color,
      }]
    },
    options: baseChartOptions({
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      ...dailyPointInteraction(dates, analyticsCategoryId),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: item => `${item.raw} point${item.raw === 1 ? '' : 's'}` } }
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 }, maxRotation: 50, minRotation: 40 },
          grid: { color: CHART_COLORS.grid }
        },
        y: {
          ticks: { color: CHART_COLORS.text, font: { family: 'Poppins', size: 10 }, precision: 0 },
          grid: { color: CHART_COLORS.grid },
          beginAtZero: true
        }
      }
    })
  });
}

document.getElementById('categoryHistorySelect').addEventListener('change', event => {
  analyticsCategoryId = event.target.value;
  renderCategoryHistoryChart();
});

function renderCategoryInsights() {
  document.querySelectorAll('#analyticsPeriod .seg-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.analyticsPeriod === analytics.period);
  });
  const { entries, map, taskCounts } = categoryAnalyticsData();
  const total = entries.reduce((sum, task) => sum + task.points, 0);
  const ranked = CATEGORIES
    .map(category => ({ category, points: map[category.id] || 0, tasks: taskCounts[category.id] || 0 }))
    .filter(entry => entry.points > 0)
    .sort((a, b) => b.points - a.points);
  const list = document.getElementById('categoryRankings');
  const hint = document.getElementById('leaderboardHint');
  list.innerHTML = '';
  hint.textContent = total ? `${total} pts across ${entries.length} ${entries.length === 1 ? 'task' : 'tasks'}` : 'No points yet';

  if (!ranked.length) {
    list.innerHTML = '<div class="category-insight-empty">Finish a task to see where your energy is going.</div>';
  } else {
    const maxPoints = ranked[0].points;
    ranked.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'ranking-row';
      const rank = document.createElement('span');
      rank.className = 'ranking-number';
      rank.textContent = `#${index + 1}`;
      const name = document.createElement('div');
      name.className = 'ranking-name';
      name.textContent = `${entry.category.icon} ${entry.category.label}`;
      const bar = document.createElement('div');
      bar.className = 'ranking-track';
      const fill = document.createElement('div');
      fill.className = 'ranking-fill';
      fill.style.width = `${(entry.points / maxPoints) * 100}%`;
      fill.style.background = entry.category.color;
      bar.appendChild(fill);
      const value = document.createElement('div');
      value.className = 'ranking-value';
      const share = total ? Math.round((entry.points / total) * 100) : 0;
      value.textContent = `${entry.points} pts · ${share}% · ${entry.tasks} ${entry.tasks === 1 ? 'task' : 'tasks'}`;
      row.append(rank, name, bar, value);
      list.appendChild(row);
    });
  }

  const attention = document.getElementById('categoryAttention');
  attention.innerHTML = '';
  const lowest = CATEGORIES
    .map(category => ({ category, points: map[category.id] || 0 }))
    .sort((a, b) => a.points - b.points || a.category.label.localeCompare(b.category.label))
    .slice(0, 3);
  lowest.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'attention-item';
    const label = document.createElement('div');
    label.textContent = `${entry.category.icon} ${entry.category.label}`;
    const value = document.createElement('span');
    value.textContent = `${entry.points} pts`;
    item.append(label, value);
    attention.appendChild(item);
  });
}

document.getElementById('analyticsPeriod').addEventListener('click', event => {
  const button = event.target.closest('[data-analytics-period]');
  if (!button) return;
  analytics.period = button.dataset.analyticsPeriod;
  renderCategoryInsights();
  renderCharts();
});

function setTrendChartExpanded(expanded) {
  const card = document.getElementById('trendChartCard');
  const button = document.getElementById('toggleTrendChart');
  card.classList.toggle('is-expanded', expanded);
  document.body.classList.toggle('chart-expanded-open', expanded);
  button.textContent = expanded ? 'Close' : 'Maximize';
  button.setAttribute('aria-expanded', String(expanded));
  requestAnimationFrame(() => charts.trend?.resize());
}

document.getElementById('toggleTrendChart').addEventListener('click', () => {
  setTrendChartExpanded(!document.getElementById('trendChartCard').classList.contains('is-expanded'));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.getElementById('trendChartCard').classList.contains('is-expanded')) {
    setTrendChartExpanded(false);
  }
});

function dailyAccountabilityData() {
  const today = startOfDay(new Date());
  const firstCompletedAt = log.length ? Math.min(...log.map(task => task.completedAt)) : Date.now();
  const firstDay = startOfDay(new Date(firstCompletedAt));
  const target = targets.day;
  const pointsByDay = new Map();
  const tasksByDay = new Map();

  log.forEach(task => {
    const key = localDateKey(new Date(task.completedAt));
    pointsByDay.set(key, (pointsByDay.get(key) || 0) + task.points);
    tasksByDay.set(key, (tasksByDay.get(key) || 0) + 1);
  });

  const days = [];
  for (let day = new Date(firstDay); day <= today; day = addDays(day, 1)) {
    const key = localDateKey(day);
    const points = pointsByDay.get(key) || 0;
    const taskCount = tasksByDay.get(key) || 0;
    const isToday = key === localDateKey(today);
    days.push({ date: new Date(day), points, taskCount, gap: Math.max(0, target - points), isToday });
  }

  const completedDays = days.filter(day => !day.isToday);
  const targetDays = days.filter(day => day.points >= target).length;
  const belowTargetDays = completedDays.filter(day => day.points < target).length;
  const zeroDays = completedDays.filter(day => day.points === 0).length;
  const historicalGap = completedDays.reduce((sum, day) => sum + day.gap, 0);
  const hitRate = completedDays.length
    ? Math.round((completedDays.filter(day => day.points >= target).length / completedDays.length) * 100)
    : 0;
  const elapsedHours = Math.max(0, Math.floor((Date.now() - firstCompletedAt) / 3600000));

  return { days, target, targetDays, belowTargetDays, zeroDays, historicalGap, hitRate, elapsedHours, firstCompletedAt };
}

function renderDailyAccountability() {
  const data = dailyAccountabilityData();
  const summary = document.getElementById('accountabilitySummary');
  const body = document.getElementById('accountabilityBody');
  const todayRecord = data.days[data.days.length - 1];
  const firstDate = new Date(data.firstCompletedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  document.getElementById('accountabilityHint').textContent = `Since your first logged task on ${firstDate}`;
  summary.innerHTML = [
    { value: data.days.length, label: 'Calendar Days' },
    { value: `${data.elapsedHours}h`, label: 'Time Elapsed' },
    { value: data.targetDays, label: `${data.target}-Point Days` },
    { value: data.belowTargetDays, label: 'Past Days Below Target' },
    { value: data.zeroDays, label: 'Zero-Point Days' },
    { value: `${data.hitRate}%`, label: 'Historical Hit Rate' },
    { value: data.historicalGap, label: 'Past Points Left' },
    { value: todayRecord?.gap || 0, label: 'Points Needed Today' }
  ].map(item => `
    <div class="accountability-stat">
      <strong>${item.value}</strong>
      <span>${item.label}</span>
    </div>
  `).join('');

  body.innerHTML = '';
  [...data.days].reverse().forEach(day => {
    let status = 'Target hit';
    let statusClass = 'is-hit';
    if (day.points < data.target && day.isToday) {
      status = `${day.gap} pts to go`;
      statusClass = 'is-progress';
    } else if (day.points === 0) {
      status = 'Zero-point day';
      statusClass = 'is-zero';
    } else if (day.points < data.target) {
      status = `${day.gap} pts short`;
      statusClass = 'is-short';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}${day.isToday ? ' · Today' : ''}</td>
      <td><strong>${day.points}</strong> / ${data.target}</td>
      <td>${day.taskCount}</td>
      <td>${day.gap}</td>
      <td><span class="accountability-status ${statusClass}">${status}</span></td>
    `;
    body.appendChild(row);
  });
}

function renderHeatmap() {
  const weeks = 17;
  const days = weeks * 7;
  const grid = document.getElementById('heatmapGrid');
  grid.innerHTML = '';
  const maxPts = Math.max(1, ...log.map(t => t.points));

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(startOfDay(new Date()), -i);
    const dEnd = addDays(d, 1);
    const pts = log.filter(t => t.completedAt >= d.getTime() && t.completedAt < dEnd.getTime())
                   .reduce((s, t) => s + t.points, 0);
    let level = 0;
    if (pts > 0) level = 1;
    if (pts >= 10) level = 2;
    if (pts >= 20) level = 3;
    if (pts >= 30) level = 4;

    const cell = document.createElement('div');
    cell.className = `hm-cell hm-${level}`;
    cell.title = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${pts} pts`;
    grid.appendChild(cell);
  }
  document.getElementById('heatmapHint').textContent = `Last ${weeks} weeks`;
}

const MOVIE_QUOTES = [
  { text: "Do. Or do not. There is no try.", source: "Yoda, Star Wars", tags: ['work', 'perseverance'] },
  { text: "Life moves pretty fast. If you don't stop and look around once in a while, you could miss it.", source: "Ferris Bueller's Day Off", tags: ['fun', 'life'] },
  { text: "You can't sit with us!", source: "Mean Girls", tags: ['fun', 'confidence'] },
  { text: "On Wednesdays, we wear pink.", source: "Mean Girls", tags: ['fun', 'confidence'] },
  { text: "I'm not a smart man, but I know what love is.", source: "Forrest Gump", tags: ['love'] },
  { text: "Life is like a box of chocolates. You never know what you're gonna get.", source: "Forrest Gump", tags: ['life'] },
  { text: "Just keep swimming.", source: "Finding Nemo", tags: ['perseverance'] },
  { text: "With great power comes great responsibility.", source: "Spider-Man", tags: ['work', 'perseverance'] },
  { text: "I feel the need — the need for speed.", source: "Top Gun", tags: ['confidence'] },
  { text: "Why so serious?", source: "The Dark Knight", tags: ['fun'] },
  { text: "To infinity and beyond!", source: "Toy Story", tags: ['confidence', 'fun'] },
  { text: "The greatest thing you'll ever learn is just to love and be loved in return.", source: "Moulin Rouge!", tags: ['love'] },
  { text: "Carpe diem. Seize the day. Make your lives extraordinary.", source: "Dead Poets Society", tags: ['perseverance', 'work'] },
  { text: "It's not who I am underneath, but what I do that defines me.", source: "Batman Begins", tags: ['work', 'perseverance'] },
  { text: "After all, tomorrow is another day.", source: "Gone with the Wind", tags: ['life'] },
  { text: "You've got a friend in me.", source: "Toy Story", tags: ['love', 'fun'] },
  { text: "Wax on, wax off.", source: "The Karate Kid", tags: ['perseverance', 'work'] },
  { text: "Every man dies, not every man really lives.", source: "Braveheart", tags: ['perseverance'] },
  { text: "There's no place like home.", source: "The Wizard of Oz", tags: ['life', 'love'] },
  { text: "May the odds be ever in your favor.", source: "The Hunger Games", tags: ['confidence'] },
  { text: "Everybody wants to be us.", source: "The Devil Wears Prada", tags: ['confidence', 'fun'] },
  { text: "I'm kind of a big deal.", source: "Anchorman", tags: ['confidence', 'fun'] },
  { text: "Not all those who wander are lost.", source: "The Fellowship of the Ring", tags: ['life'] },
];

const CATEGORY_QUOTE_TAG = {
  clean_slate: 'life', glow_up: 'perseverance', creator_mode: 'fun', money_moves: 'confidence',
  level_up: 'life', office_grind: 'work', boardroom_brain: 'work', empire_building: 'perseverance',
  ride_or_die: 'love', main_character: 'fun', passport_stamps: 'life', other: 'life'
};

function pickQuote(tag) {
  const pool = MOVIE_QUOTES.filter(q => q.tags.includes(tag));
  const from = pool.length ? pool : MOVIE_QUOTES;
  return from[Math.floor(Math.random() * from.length)];
}

const RECAP_OPENERS = [
  "Another entry for the diary:",
  "Word on the street is,",
  "Here's the headline:",
  "Reading between the lines of your day:",
  "The society page reports:",
];

function generateRecap() {
  if (log.length === 0) {
    document.getElementById('recapText').textContent =
      "Not a single entry in the log yet. Every legend has a first chapter — go finish something on the Board and come back for your recap.";
    const q = pickQuote('life');
    document.getElementById('recapQuote').textContent = `"${q.text}" — ${q.source}`;
    return;
  }

  const todayPts = pointsInRange('day', 0);
  const todayTarget = targets.day || 1;
  const weekPts = pointsInRange('week', 0);
  const weekTarget = targets.week || 1;
  const lastWeekPts = pointsInRange('week', -1);
  const streaks = computeStreaks();
  const totalAllTime = log.reduce((s, t) => s + t.points, 0);

  const catMap = categoryPointsInRange('week', 0);
  let topCatId = 'other', topVal = -1;
  Object.entries(catMap).forEach(([id, val]) => { if (val > topVal) { topVal = val; topCatId = id; } });
  const topCat = catById(topCatId);

  let trendLine;
  if (lastWeekPts === 0 && weekPts === 0) {
    trendLine = "A quiet stretch — the next chapter is wide open.";
  } else if (weekPts > lastWeekPts) {
    trendLine = `That's ${weekPts - lastWeekPts} points ahead of this time last week.`;
  } else if (weekPts < lastWeekPts) {
    trendLine = `A little quieter than last week's ${lastWeekPts}, but every point still counts.`;
  } else {
    trendLine = "Exactly on pace with last week — steady hand.";
  }

  const pctToday = Math.min(100, Math.round((todayPts / todayTarget) * 100));
  const opener = RECAP_OPENERS[Math.floor(Math.random() * RECAP_OPENERS.length)];

  const text = `${opener} ${todayPts} points banked today toward a ${targets.day}-point goal — ${pctToday}% of the way there. `
    + `This week, ${topCat.icon} ${topCat.label} has been running the show with ${topVal} points, and you're on a ${streaks.current}-day streak `
    + `(personal best: ${streaks.best}). ${trendLine} All-time, that's ${totalAllTime} points and counting.`;

  document.getElementById('recapText').textContent = text;

  const quoteTag = CATEGORY_QUOTE_TAG[topCatId] || 'life';
  const q = pickQuote(quoteTag);
  document.getElementById('recapQuote').textContent = `"${q.text}" — ${q.source}`;
}

document.getElementById('regenRecap').addEventListener('click', generateRecap);

function renderAnalytics() {
  renderStatChips();
  renderFocusSneak();
  generateRecap();
  renderCategoryInsights();
  renderCharts();
  renderDailyAccountability();
  renderHeatmap();
}

// ---------- Expenses ----------

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const expenseView = { period: 'day', offset: 0, category: 'all' };
let expenseTrendChart = null;
let expenseCategoryChart = null;
let editingExpenseId = null;
let expenseReturnFocus = null;

function dateKeyToLocalDate(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (date.getFullYear() !== Number(match[1])
    || date.getMonth() !== Number(match[2]) - 1
    || date.getDate() !== Number(match[3])) return null;
  return date;
}

function expensePaise(expense) {
  const amount = Number(expense?.amount);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function formatExpenseMoney(paise) {
  return INR_FORMATTER.format(Math.max(0, Number(paise) || 0) / 100);
}

function expenseDateRange() {
  if (expenseView.period === 'all') {
    const validDates = expenses.map(expense => expense.date).filter(dateKeyToLocalDate).sort();
    const first = dateKeyToLocalDate(validDates[0]) || startOfDay(new Date());
    const lastRecorded = dateKeyToLocalDate(validDates[validDates.length - 1]) || first;
    const last = lastRecorded > startOfDay(new Date()) ? lastRecorded : startOfDay(new Date());
    return [startOfDay(first), addDays(startOfDay(last), 1)];
  }
  const [start, end] = getRange(expenseView.period, expenseView.offset);
  return [new Date(start), new Date(end)];
}

function expenseEntriesInPeriod() {
  const [start, end] = expenseDateRange();
  const startKey = localDateKey(start);
  const endKey = localDateKey(end);
  return expenses.filter(expense => expense.date >= startKey && expense.date < endKey);
}

function eachDateInRange(start, end) {
  const dates = [];
  for (let day = startOfDay(start); day < end; day = addDays(day, 1)) {
    dates.push(new Date(day));
  }
  return dates;
}

function calendarDayCount(start, end) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((endUtc - startUtc) / 86400000));
}

function expensePeriodCopy() {
  if (expenseView.period === 'all') {
    const [start] = expenseDateRange();
    const hasExpenses = expenses.length > 0;
    return {
      label: hasExpenses
        ? `All spending since ${start.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
        : 'All recorded time',
      sublabel: hasExpenses ? 'your complete expense history' : 'ready for your first expense',
    };
  }
  return {
    label: rangeLabel(expenseView.period, expenseView.offset),
    sublabel: rangeSubLabel(expenseView.period, expenseView.offset),
  };
}

function expenseMeasuredDayCount() {
  const [start, rangeEnd] = expenseDateRange();
  let end = rangeEnd;
  if (expenseView.period !== 'all' && expenseView.offset === 0) {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    if (tomorrow < end) end = tomorrow;
  }
  return Math.max(1, calendarDayCount(start, end));
}

function formatExpenseDay(key) {
  const date = dateKeyToLocalDate(key);
  if (!date) return key;
  const todayKey = localDateKey();
  const yesterdayKey = localDateKey(addDays(new Date(), -1));
  const prefix = key === todayKey ? 'Today · ' : (key === yesterdayKey ? 'Yesterday · ' : '');
  return prefix + date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function expenseCategoryTotals(entries) {
  const totals = Object.fromEntries(EXPENSE_CATEGORIES.map(category => [category.id, 0]));
  entries.forEach(expense => {
    if (Object.hasOwn(totals, expense.category)) totals[expense.category] += expensePaise(expense);
  });
  return totals;
}

function renderExpenseSummary(entries) {
  const container = document.getElementById('expenseSummary');
  container.innerHTML = '';
  const total = entries.reduce((sum, expense) => sum + expensePaise(expense), 0);
  const dayCount = expenseMeasuredDayCount();
  const categoryTotals = expenseCategoryTotals(entries);
  const topCategory = [...EXPENSE_CATEGORIES]
    .sort((a, b) => categoryTotals[b.id] - categoryTotals[a.id])[0];
  const topTotal = topCategory ? categoryTotals[topCategory.id] : 0;
  const cards = [
    { label: 'Spent in this view', value: formatExpenseMoney(total), note: expensePeriodCopy().sublabel, stamp: '₹' },
    { label: 'Average per day', value: formatExpenseMoney(Math.round(total / dayCount)), note: `across ${dayCount} ${dayCount === 1 ? 'day' : 'days'}`, stamp: '÷' },
    { label: 'Expenses logged', value: String(entries.length), note: entries.length === 1 ? 'one money decision recorded' : 'money decisions recorded', stamp: '#' },
    {
      label: 'Biggest category',
      value: topTotal ? `${topCategory.icon} ${topCategory.label}` : '—',
      note: topTotal ? formatExpenseMoney(topTotal) : 'nothing spent in this view',
      stamp: topTotal ? topCategory.icon : '♡',
    },
  ];
  cards.forEach(data => {
    const card = document.createElement('article');
    card.className = 'expense-summary-card';
    card.dataset.stamp = data.stamp;
    const label = document.createElement('div');
    label.className = 'expense-summary-label';
    label.textContent = data.label;
    const value = document.createElement('div');
    value.className = 'expense-summary-value';
    value.textContent = data.value;
    const note = document.createElement('div');
    note.className = 'expense-summary-note';
    note.textContent = data.note;
    card.append(label, value, note);
    container.appendChild(card);
  });
}

function destroyExpenseCharts() {
  if (expenseTrendChart) expenseTrendChart.destroy();
  if (expenseCategoryChart) expenseCategoryChart.destroy();
  expenseTrendChart = null;
  expenseCategoryChart = null;
}

function renderExpenseCharts(entries) {
  destroyExpenseCharts();
  const [start, end] = expenseDateRange();
  const spanDays = calendarDayCount(start, end);
  const useMonthlySeries = expenseView.period === 'all' && spanDays > 370;
  let seriesDates;
  let seriesKeys;
  let seriesPaise;

  if (useMonthlySeries) {
    seriesDates = [];
    for (let month = new Date(start.getFullYear(), start.getMonth(), 1); month < end; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
      seriesDates.push(new Date(month));
    }
    const totalsByMonth = new Map();
    entries.forEach(expense => {
      const key = String(expense.date).slice(0, 7);
      totalsByMonth.set(key, (totalsByMonth.get(key) || 0) + expensePaise(expense));
    });
    seriesKeys = seriesDates.map(date => localDateKey(date).slice(0, 7));
    seriesPaise = seriesKeys.map(key => totalsByMonth.get(key) || 0);
  } else {
    seriesDates = eachDateInRange(start, end);
    const totalsByDay = new Map();
    entries.forEach(expense => totalsByDay.set(
      expense.date,
      (totalsByDay.get(expense.date) || 0) + expensePaise(expense)
    ));
    seriesKeys = seriesDates.map(localDateKey);
    seriesPaise = seriesKeys.map(key => totalsByDay.get(key) || 0);
  }

  const chartStage = document.getElementById('expenseChartStage');
  chartStage.style.width = `${Math.max(520, Math.min(16000, seriesDates.length * (useMonthlySeries ? 58 : 31)))}px`;
  document.getElementById('expenseTrendTitle').textContent = useMonthlySeries ? 'Spending by month' : 'Spending by day';
  document.getElementById('expenseTrendHint').textContent = `${seriesDates.length} ${useMonthlySeries ? (seriesDates.length === 1 ? 'month' : 'months') : (seriesDates.length === 1 ? 'day' : 'days')} · click a bar to inspect the ${useMonthlySeries ? 'month' : 'day'}`;

  if (typeof Chart !== 'undefined') {
    const trendContext = document.getElementById('expenseTrendChart').getContext('2d');
    expenseTrendChart = new Chart(trendContext, {
      type: 'bar',
      data: {
        labels: seriesDates.map(date => date.toLocaleDateString(undefined, useMonthlySeries
          ? { month: 'short', year: '2-digit' }
          : (seriesDates.length > 35
            ? { month: 'short', day: 'numeric' }
            : { weekday: seriesDates.length <= 7 ? 'short' : undefined, month: 'short', day: 'numeric' }))),
        datasets: [{
          label: 'Spent',
          data: seriesPaise.map(value => value / 100),
          backgroundColor: '#e66c9a',
          hoverBackgroundColor: '#c0376a',
          borderColor: '#b84d76',
          borderWidth: 1,
          borderRadius: 5,
          minBarLength: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_event, elements) => {
          const point = elements[0];
          if (!point) return;
          const key = seriesKeys[point.index];
          const picked = dateKeyToLocalDate(useMonthlySeries ? `${key}-01` : key);
          if (!picked) return;
          expenseView.period = useMonthlySeries ? 'month' : 'day';
          expenseView.offset = offsetFromDate(expenseView.period, picked);
          renderExpenses();
          document.getElementById('expenseLedgerTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: context => formatExpenseMoney(Math.round(Number(context.raw || 0) * 100)) },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7b5665', maxRotation: 55, minRotation: seriesDates.length > 14 ? 45 : 0 } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(184, 77, 118, .12)' },
            ticks: { color: '#7b5665', callback: value => `₹${Number(value).toLocaleString('en-IN')}` },
          },
        },
      },
    });

    const categoryTotals = expenseCategoryTotals(entries);
    const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
    const categoryContext = document.getElementById('expenseCategoryChart').getContext('2d');
    expenseCategoryChart = new Chart(categoryContext, {
      type: 'doughnut',
      data: total ? {
        labels: EXPENSE_CATEGORIES.map(category => category.label),
        datasets: [{
          data: EXPENSE_CATEGORIES.map(category => categoryTotals[category.id] / 100),
          backgroundColor: EXPENSE_CATEGORIES.map(category => category.color),
          borderColor: '#fffdfd',
          borderWidth: 3,
        }],
      } : {
        labels: ['No spending'],
        datasets: [{ data: [1], backgroundColor: ['#f2dbe4'], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: total ? {
            callbacks: { label: context => `${context.label}: ${formatExpenseMoney(Math.round(Number(context.raw || 0) * 100))}` },
          } : { enabled: false },
        },
      },
    });
  }

  renderExpenseCategoryBreakdown(entries);
}

function renderExpenseCategoryBreakdown(entries) {
  const container = document.getElementById('expenseCategoryBreakdown');
  container.innerHTML = '';
  const totals = expenseCategoryTotals(entries);
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const max = Math.max(1, ...Object.values(totals));
  [...EXPENSE_CATEGORIES]
    .sort((a, b) => totals[b.id] - totals[a.id])
    .forEach(category => {
      const row = document.createElement('div');
      row.className = 'expense-category-row';
      const name = document.createElement('div');
      name.className = 'expense-category-name';
      name.textContent = `${category.icon} ${category.label}`;
      const track = document.createElement('div');
      track.className = 'expense-category-track';
      const fill = document.createElement('div');
      fill.className = 'expense-category-fill';
      fill.style.width = `${(totals[category.id] / max) * 100}%`;
      fill.style.background = category.color;
      track.appendChild(fill);
      const value = document.createElement('div');
      value.className = 'expense-category-value';
      const share = grandTotal ? Math.round((totals[category.id] / grandTotal) * 100) : 0;
      value.textContent = `${formatExpenseMoney(totals[category.id])} · ${share}%`;
      row.append(name, track, value);
      container.appendChild(row);
    });
}

function renderExpenseLedger(entries) {
  const ledger = document.getElementById('expenseLedger');
  const categoryFilter = document.getElementById('expenseCategoryFilter');
  categoryFilter.value = expenseView.category;
  const visible = entries
    .filter(expense => expenseView.category === 'all' || expense.category === expenseView.category)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const visibleTotal = visible.reduce((sum, expense) => sum + expensePaise(expense), 0);
  document.getElementById('expenseLedgerCount').textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'} · ${formatExpenseMoney(visibleTotal)} visible`;
  ledger.innerHTML = '';
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'expense-ledger-empty';
    empty.textContent = expenses.length
      ? 'Nothing matches this view yet.'
      : 'Nothing logged yet. Add your first expense to make your money visible.';
    ledger.appendChild(empty);
    return;
  }

  const grouped = new Map();
  visible.forEach(expense => {
    if (!grouped.has(expense.date)) grouped.set(expense.date, []);
    grouped.get(expense.date).push(expense);
  });
  grouped.forEach((dayEntries, date) => {
    const group = document.createElement('section');
    group.className = 'expense-day-group';
    const head = document.createElement('div');
    head.className = 'expense-day-head';
    const dayLabel = document.createElement('strong');
    dayLabel.textContent = formatExpenseDay(date);
    const dayTotal = document.createElement('span');
    dayTotal.className = 'expense-day-total';
    dayTotal.textContent = formatExpenseMoney(dayEntries.reduce((sum, expense) => sum + expensePaise(expense), 0));
    head.append(dayLabel, dayTotal);
    group.appendChild(head);

    dayEntries.forEach(expense => {
      const category = expenseCategoryById(expense.category);
      const row = document.createElement('article');
      row.className = 'expense-entry';
      const main = document.createElement('div');
      main.className = 'expense-entry-main';
      const categoryLine = document.createElement('div');
      categoryLine.className = 'expense-entry-category';
      const dot = document.createElement('span');
      dot.className = 'expense-entry-dot';
      dot.style.background = category.color;
      const categoryName = document.createElement('span');
      categoryName.textContent = `${category.icon} ${category.label}`;
      categoryLine.append(dot, categoryName);
      const note = document.createElement('div');
      note.className = 'expense-entry-note';
      note.textContent = expense.note || 'No note added';
      main.append(categoryLine, note);
      const amount = document.createElement('div');
      amount.className = 'expense-entry-amount';
      amount.textContent = formatExpenseMoney(expensePaise(expense));
      const actions = document.createElement('div');
      actions.className = 'expense-entry-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn ghost small';
      edit.textContent = 'Edit';
      edit.dataset.editExpenseId = String(expense.id);
      edit.setAttribute('aria-label', `Edit ${category.label} expense of ${amount.textContent} on ${date}`);
      edit.addEventListener('click', () => openExpenseModal(expense.id));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn danger-ghost small log-delete-action';
      remove.textContent = '🗑 Delete';
      remove.dataset.deleteExpenseId = String(expense.id);
      remove.setAttribute('aria-label', `Delete ${category.label} expense of ${amount.textContent} on ${date}`);
      remove.addEventListener('click', () => deleteExpense(expense.id, remove));
      actions.append(edit, remove);
      row.append(main, amount, actions);
      group.appendChild(row);
    });
    ledger.appendChild(group);
  });
}

function renderExpenses() {
  const loadStatus = document.getElementById('expenseLoadStatus');
  loadStatus.hidden = !expenseLoadError;
  document.getElementById('expenseLoadMessage').textContent = expenseLoadError;
  document.getElementById('addExpense').disabled = Boolean(expenseLoadError);
  document.querySelectorAll('#expensePeriod .seg-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.expensePeriod === expenseView.period);
  });
  const allTime = expenseView.period === 'all';
  const nav = document.getElementById('expenseDateNav');
  const actions = document.getElementById('expenseDateActions');
  nav.classList.toggle('is-all-time', allTime);
  actions.classList.toggle('is-all-time', allTime);
  const copy = expensePeriodCopy();
  document.getElementById('expenseRangeLabel').textContent = copy.label;
  document.getElementById('expenseRangeSub').textContent = copy.sublabel;
  document.getElementById('expenseNext').disabled = allTime || expenseView.offset >= 0;
  document.getElementById('expenseJumpToday').disabled = expenseView.offset === 0;
  const [start] = expenseDateRange();
  document.getElementById('expenseJumpDate').value = allTime ? '' : localDateKey(start);
  const entries = expenseEntriesInPeriod();
  renderExpenseSummary(entries);
  renderExpenseCharts(entries);
  renderExpenseLedger(entries);
}

const expenseModalBackdrop = document.getElementById('expenseModalBackdrop');
const expenseForm = document.getElementById('expenseForm');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseDateInput = document.getElementById('expenseDate');
const expenseCategoryInput = document.getElementById('expenseCategory');
const expenseNoteInput = document.getElementById('expenseNote');
const expenseFormError = document.getElementById('expenseFormError');
const saveExpenseButton = document.getElementById('saveExpense');

function openExpenseModal(id = null) {
  const expense = id ? expenses.find(item => item.id === id) : null;
  editingExpenseId = expense?.id || null;
  expenseReturnFocus = document.activeElement;
  document.getElementById('expenseModalTitle').textContent = expense ? 'Edit Expense' : 'Add an Expense';
  saveExpenseButton.textContent = expense ? 'Save changes' : 'Save expense';
  saveExpenseButton.disabled = false;
  expenseFormError.textContent = '';
  expenseAmountInput.value = expense ? (expensePaise(expense) / 100).toFixed(2).replace(/\.00$/, '') : '';
  const selectedDay = expenseView.period === 'day' ? localDateKey(expenseDateRange()[0]) : localDateKey();
  expenseDateInput.value = expense?.date || selectedDay;
  expenseDateInput.max = localDateKey();
  expenseCategoryInput.value = expense?.category || 'food';
  expenseNoteInput.value = expense?.note || '';
  expenseModalBackdrop.classList.add('open');
  expenseModalBackdrop.setAttribute('aria-hidden', 'false');
  setTimeout(() => expenseAmountInput.focus(), 50);
}

function closeExpenseModal({ restoreFocus = true } = {}) {
  if (saveExpenseButton.disabled) return;
  expenseModalBackdrop.classList.remove('open');
  expenseModalBackdrop.setAttribute('aria-hidden', 'true');
  editingExpenseId = null;
  expenseFormError.textContent = '';
  if (restoreFocus && expenseReturnFocus instanceof HTMLElement) expenseReturnFocus.focus();
  expenseReturnFocus = null;
}

function validateExpenseDraft() {
  const rawAmount = expenseAmountInput.value.trim();
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(rawAmount)) {
    return { error: 'Enter a valid amount with no more than two decimal places.' };
  }
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 9999999999.99) {
    return { error: 'Amount must be between ₹0.01 and ₹9,99,99,99,999.99.' };
  }
  if (!dateKeyToLocalDate(expenseDateInput.value)) return { error: 'Choose a valid spending date.' };
  if (!EXPENSE_CATEGORIES.some(category => category.id === expenseCategoryInput.value)) return { error: 'Choose a valid category.' };
  return {
    value: {
      amount,
      date: expenseDateInput.value,
      category: expenseCategoryInput.value,
      note: expenseNoteInput.value.trim().slice(0, 500),
    },
  };
}

async function saveExpenseDraft(event) {
  event.preventDefault();
  const result = validateExpenseDraft();
  if (result.error) {
    expenseFormError.textContent = result.error;
    return;
  }
  const wasEditing = Boolean(editingExpenseId);
  const id = editingExpenseId;
  saveExpenseButton.disabled = true;
  saveExpenseButton.textContent = 'Saving…';
  expenseFormError.textContent = '';
  try {
    let saved;
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      const existing = id ? expenses.find(item => item.id === id) : null;
      saved = {
        id: existing?.id || uid(),
        ...result.value,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      if (existing) expenses = expenses.map(item => item.id === id ? saved : item);
      else expenses.push(saved);
      persistDemoState();
    } else {
      const response = wasEditing
        ? await apiPut(`/api/expenses/${encodeURIComponent(id)}`, result.value)
        : await apiPost('/api/expenses', result.value);
      saved = response.expense;
      if (wasEditing) expenses = expenses.map(item => item.id === id ? saved : item);
      else expenses.push(saved);
    }
    saveExpenseButton.disabled = false;
    closeExpenseModal({ restoreFocus: false });
    renderExpenses();
    const focusTarget = wasEditing
      ? [...document.querySelectorAll('[data-edit-expense-id]')].find(button => button.dataset.editExpenseId === String(id))
      : document.getElementById('addExpense');
    focusTarget?.focus({ preventScroll: true });
    showToast(wasEditing ? 'Expense updated.' : 'Expense logged.');
  } catch (error) {
    saveExpenseButton.disabled = false;
    saveExpenseButton.textContent = wasEditing ? 'Save changes' : 'Save expense';
    expenseFormError.textContent = error.status === 401
      ? 'Your session expired. Log in again, then press Save once more.'
      : (error.message || 'Could not save this expense. Try again.');
    if (error.status === 401) showLogin('Your session expired. Log back in to save this expense.');
  }
}

async function deleteExpense(id, button = null) {
  const expense = expenses.find(item => String(item.id) === String(id));
  if (!expense) return;
  const key = String(expense.id);
  if (deletingExpenseIds.has(key)) return;
  const category = expenseCategoryById(expense.category);
  if (!window.confirm(`Delete ${formatExpenseMoney(expensePaise(expense))} for ${category.label} on ${expense.date}?`)) return;
  deletingExpenseIds.add(key);
  if (button) {
    button.disabled = true;
    button.textContent = 'Deleting…';
  }
  try {
    if (!DEMO_MODE) {
      try {
        await apiDelete(`/api/expenses/${encodeURIComponent(expense.id)}`);
      } catch (error) {
        if (error.status !== 404) throw error;
      }
    }
    expenses = expenses.filter(item => String(item.id) !== String(expense.id));
    if (DEMO_MODE) persistDemoState();
    renderExpenses();
    const heading = document.getElementById('expenseLedgerTitle');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    showToast('Expense deleted. Your totals and charts are updated.');
  } catch (error) {
    if (error.status === 401) {
      showLogin('Your session expired. Log back in, then delete this expense again.');
    } else {
      showToast('Couldn’t delete that expense. It is still safely in your log.');
    }
  } finally {
    deletingExpenseIds.delete(key);
    if (button?.isConnected) {
      button.disabled = false;
      button.textContent = '🗑 Delete';
    }
  }
}

document.getElementById('addExpense').addEventListener('click', () => openExpenseModal());
document.getElementById('retryExpenses').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Retrying…';
  try {
    const payload = await apiGet('/api/expenses');
    expenses = Array.isArray(payload.expenses) ? payload.expenses : [];
    expenseLoadError = '';
    renderExpenses();
    showToast('Expenses loaded.');
  } catch (error) {
    if (error.status === 401) {
      showLogin('Your session expired. Log back in to load expenses.');
    } else {
      expenseLoadError = 'Expenses still could not be loaded. Your tasks remain available; check the connection and retry.';
      renderExpenses();
    }
  } finally {
    button.disabled = false;
    button.textContent = 'Retry';
  }
});
document.getElementById('cancelExpense').addEventListener('click', () => closeExpenseModal());
expenseModalBackdrop.addEventListener('click', event => {
  if (event.target === expenseModalBackdrop) closeExpenseModal();
});
expenseForm.addEventListener('submit', saveExpenseDraft);
document.addEventListener('keydown', event => {
  if (!expenseModalBackdrop.classList.contains('open')) return;
  if (event.key === 'Escape' && !saveExpenseButton.disabled) {
    closeExpenseModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...expenseForm.querySelectorAll('input, select, textarea, button:not([disabled])')]
    .filter(element => !element.hidden);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.querySelectorAll('#expensePeriod .seg-btn').forEach(button => {
  button.addEventListener('click', () => {
    expenseView.period = button.dataset.expensePeriod;
    expenseView.offset = 0;
    renderExpenses();
  });
});
document.getElementById('expensePrev').addEventListener('click', () => {
  if (expenseView.period === 'all') return;
  expenseView.offset -= 1;
  renderExpenses();
});
document.getElementById('expenseNext').addEventListener('click', () => {
  if (expenseView.period === 'all' || expenseView.offset >= 0) return;
  expenseView.offset += 1;
  renderExpenses();
});
document.getElementById('expenseJumpToday').addEventListener('click', () => {
  expenseView.offset = 0;
  renderExpenses();
});
document.getElementById('expenseJumpDate').addEventListener('change', event => {
  const picked = dateKeyToLocalDate(event.target.value);
  if (!picked || expenseView.period === 'all') return;
  expenseView.offset = offsetFromDate(expenseView.period, picked);
  renderExpenses();
});
document.getElementById('expenseCategoryFilter').addEventListener('change', event => {
  expenseView.category = event.target.value;
  renderExpenseLedger(expenseEntriesInPeriod());
});

// ---------- Log ----------

function renderLog() {
  const body = document.getElementById('logBody');
  const categoryFilter = document.getElementById('logCategoryFilter');
  const dateFilter = document.getElementById('logDateFilter');

  if (categoryFilter.options.length === 1) {
    CATEGORIES.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.icon} ${category.label}`;
      categoryFilter.appendChild(option);
    });
  }

  categoryFilter.value = logCategoryFilter;
  dateFilter.value = logDateFilter;
  const visibleTasks = log.filter(task =>
    (logCategoryFilter === 'all' || task.category === logCategoryFilter) &&
    (!logDateFilter || localDateKey(new Date(task.completedAt)) === logDateFilter)
  );

  body.innerHTML = '';
  const countText = `${visibleTasks.length} completed task${visibleTasks.length === 1 ? '' : 's'}`;
  const filterDescription = [];
  if (logCategoryFilter !== 'all') filterDescription.push(catById(logCategoryFilter).label);
  if (logDateFilter) {
    const [year, month, day] = logDateFilter.split('-').map(Number);
    filterDescription.push(new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
  }
  document.getElementById('logCount').textContent = filterDescription.length
    ? `${countText} · ${filterDescription.join(' · ')}`
    : countText;

  if (visibleTasks.length === 0) {
    const emptyMessage = filterDescription.length
      ? 'No finished tasks match these filters.'
      : 'No finished tasks yet — complete one from the Board.';
    body.innerHTML = `<tr class="empty-row"><td colspan="7">${emptyMessage}</td></tr>`;
    return;
  }

  [...visibleTasks].sort((a, b) => b.completedAt - a.completedAt).forEach(t => {
    const cat = catById(t.category);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td></td>
      <td><span class="cat-badge" style="background:${cat.color}; padding:4px 11px; border-radius:999px; font-size:11px; font-weight:700;">${cat.icon} ${cat.label}</span></td>
      <td>${t.points}</td>
      <td>${fmtDateTime(t.startedAt)}</td>
      <td>${fmtDateTime(t.completedAt)}</td>
      <td>${fmtDuration(t.duration)}</td>
      <td></td>
    `;
    const taskCell = row.firstElementChild;
    const taskTitle = document.createElement('div');
    taskTitle.className = 'log-task-title';
    taskTitle.textContent = t.title;
    taskCell.appendChild(taskTitle);
    if (typeof t.note === 'string' && t.note.trim()) {
      const taskNote = document.createElement('div');
      taskNote.className = 'log-task-note';
      taskNote.textContent = `📝 ${t.note.trim()}`;
      taskCell.appendChild(taskNote);
    }
    const editCell = row.lastElementChild;
    editCell.className = 'log-actions';
    const editButton = document.createElement('button');
    editButton.className = 'btn ghost small';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => openEditModal(t.id, 'log', t.completedAt));
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn danger-ghost small';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteFinishedTask(t.id, t.completedAt));
    editCell.append(editButton, deleteButton);
    body.appendChild(row);
  });
}

function deleteFinishedTask(id, completedAt) {
  const taskIndex = log.findIndex(task => task.id === id && task.completedAt === completedAt);
  if (taskIndex < 0) return;
  const task = log[taskIndex];
  if (!window.confirm(`Delete “${task.title}” from your finished log? This cannot be undone.`)) return;
  log.splice(taskIndex, 1);
  saveLog();
  renderLog();
  showToast('Finished task deleted.');
}

document.getElementById('logCategoryFilter').addEventListener('change', event => {
  logCategoryFilter = event.target.value;
  renderLog();
});

document.getElementById('logDateFilter').addEventListener('change', event => {
  logDateFilter = event.target.value;
  renderLog();
});

document.getElementById('clearLogFilters').addEventListener('click', () => {
  logCategoryFilter = 'all';
  logDateFilter = '';
  renderLog();
});

// ---------- Guide ----------

function renderGuide() {
  const list = document.getElementById('guideList');
  list.innerHTML = '';
  [...CATEGORIES].sort((a, b) => b.points - a.points).forEach(c => {
    const item = document.createElement('div');
    item.className = 'guide-item';
    item.innerHTML = `
      <div class="g-left">
        <span class="cat-dot" style="background:${c.color}; color:${c.color}"></span>
        <div>
          <div class="g-label">${c.icon} ${c.label}</div>
          <div class="g-desc">${c.desc}</div>
        </div>
      </div>
      <div class="g-pts">${c.points}</div>
    `;
    list.appendChild(item);
  });
}

// ---------- Targets ----------

function renderTargets() {
  const form = document.getElementById('targetsForm');
  form.innerHTML = '';
  ['day', 'week', 'weekend', 'month'].forEach(period => {
    const wrapper = document.createElement('label');
    wrapper.textContent = PERIOD_LABELS[period] + ' target (points)';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = targets[period];
    input.addEventListener('change', () => {
      targets[period] = Math.max(0, parseInt(input.value, 10) || 0);
      saveTargets();
      if (period === 'day') renderTodayProgress();
    });
    wrapper.appendChild(input);
    form.appendChild(wrapper);
  });
}

// ---------- Auth + Init ----------

const loginScreen = document.getElementById('loginScreen');
const appRoot = document.querySelector('.app');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');
const pinForm = document.getElementById('pinForm');
const sessionNotice = document.getElementById('sessionNotice');
const demoBanner = document.getElementById('demoBanner');
const resetDemoButton = document.getElementById('resetDemo');
const activeBoardHint = document.getElementById('activeBoardHint');

function configureDemoUi() {
  if (!DEMO_MODE) return;
  document.body.classList.add('demo-mode');
  document.title = 'One Ball at a Time — Public Demo';
  demoBanner.hidden = false;
  activeBoardHint.textContent = 'Three priorities + two protected promises: your body and your future.';
}

resetDemoButton.addEventListener('click', () => {
  if (!DEMO_MODE) return;
  if (!window.confirm('Reset this browser demo to its original sample tasks?')) return;
  localStorage.removeItem(DEMO_STORAGE_KEY);
  window.location.reload();
});

function showLogin(message) {
  if (message) {
    sessionNotice.textContent = message;
    sessionNotice.classList.add('show');
  } else {
    sessionNotice.classList.remove('show');
  }
  loginScreen.classList.add('open');
  appRoot.style.display = 'none';
  setTimeout(() => pinInput.focus(), 50);
}

function hideLogin() {
  loginScreen.classList.remove('open');
  appRoot.style.display = '';
}

pinForm.addEventListener('submit', async e => {
  e.preventDefault();
  pinError.textContent = '';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput.value }),
    });
    if (res.status === 429) {
      const payload = await res.json().catch(() => ({}));
      const minutes = Math.max(1, Math.ceil((payload.retryAfter || 60) / 60));
      pinError.textContent = `Too many tries. Wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and try again.`;
      pinInput.value = '';
      return;
    }
    if (!res.ok) {
      pinError.textContent = 'Wrong PIN — try again.';
      pinInput.value = '';
      pinInput.focus();
      return;
    }
    pinInput.value = '';
    await startApp();
  } catch (err) {
    pinError.textContent = 'Could not reach the server. Try again.';
  }
});

async function startApp() {
  try {
    await loadState();
  } catch (err) {
    if (err.status === 401) {
      showLogin("You've been logged out (session expired). Log back in to pick up right where you left off.");
      return;
    }
    console.error(err);
    showToast("Couldn't reach the server — check your connection and refresh.");
    return;
  }

  const activeChanged = migrateCategoryIds(active);
  const logChanged = migrateCategoryIds(log);
  let protectedSlotChanged = false;
  if (!DEMO_MODE && !active.some(task => task.careerSlot)) {
    const existingQuantTask = active.find(task => !task.bodySlot && task.category === 'empire_building');
    if (existingQuantTask) {
      existingQuantTask.careerSlot = true;
      protectedSlotChanged = true;
    }
  }
  if (activeChanged || protectedSlotChanged) saveActive();
  if (logChanged) saveLog();

  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  renderDayClock();

  hideLogin();
  initializeFocusPipVideo();
  renderBoard();
  applyDeepLinkFromQuery();
  updateFocusMiniTimer();
  updateFocusDocumentTitle();
  publishAndroidWidgetSnapshot();
}

async function boot() {
  if (DEMO_MODE) {
    configureDemoUi();
    await startApp();
    return;
  }
  try {
    const { authed } = await fetch('/api/session').then(r => r.json());
    if (!authed) { showLogin(); return; }
    await startApp();
  } catch (err) {
    showLogin();
  }
}

configurePwa();
boot();
setInterval(renderDayClock, 1000);
setInterval(updateActiveFocusDisplay, 1000);
