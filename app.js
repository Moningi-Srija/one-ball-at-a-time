// ---------- Data ----------

const CATEGORIES = [
  { id: 'clean_slate',    label: 'Clean Slate',            icon: '🧹', desc: 'Cleaning, bathing — least points, but still counted because they\'re necessary.',          points: 2,  color: '#b5a89f' },
  { id: 'glow_up',        label: 'Glow Up',                icon: '💪', desc: 'Eating well, good food, exercise/gym/walking — body maintenance as self-improvement.',      points: 4,  color: '#6bbf6b' },
  { id: 'creator_mode',   label: 'Creator Mode',           icon: '🎨', desc: 'Content creation, art, writing — a step up from chores, but not the top priority.',       points: 5,  color: '#c9a7eb' },
  { id: 'money_moves',    label: 'Money Moves',            icon: '📈', desc: 'Trading and investing practice.',                                                        points: 8,  color: '#d4af37' },
  { id: 'level_up',       label: 'Level Up',               icon: '🔓', desc: 'Passport, driving license, swimming/sports classes — unlocking real capability.',         points: 8,  color: '#e3b23c' },
  { id: 'office_grind',   label: 'Office Grind',           icon: '📎', desc: 'Everyday busywork at the job — low points, still builds a track record.',                 points: 4,  color: '#a7aec2' },
  { id: 'boardroom_brain',label: 'Boardroom Brain',        icon: '🧠', desc: 'Studying office things, design discussions, genuinely understanding & participating — this is where credibility compounds.', points: 10, color: '#5b6ee1' },
  { id: 'empire_building',label: 'Empire Building',        icon: '👑', desc: 'CP practice, resume, skills, projects, hackathons, contests, job applications — pick the points per task, this one has range.', points: 9,  color: '#8c52d9' },
  { id: 'ride_or_die',    label: 'Ride or Die',            icon: '💕', desc: 'Love, loyalty, good deeds — how loving and friendly you are, not the top category but good points.', points: 6,  color: '#ff6f9c' },
  { id: 'main_character', label: 'Main Character Energy',  icon: '🌟', desc: 'Socializing, style, going out, plans, presenting yourself well, Instagram stories.',      points: 4,  color: '#4fb3c9' },
  { id: 'passport_stamps',label: 'Passport Stamps',        icon: '✈️', desc: 'Trips and travel.',                                                                       points: 6,  color: '#e6547a' },
  { id: 'other',          label: 'Other',                  icon: '✨', desc: 'Anything that doesn\'t fit elsewhere.',                                                   points: 3,  color: '#9a8f99' },
];

const catById = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

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

// ---------- Storage (API-backed) ----------

let active = [];   // up to 5 tasks on the board
let log = [];      // finished tasks
let targets = DEFAULT_TARGETS;
let frog = null;   // today's deliberately chosen hardest/most important task

async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) { const err = new Error('request failed'); err.status = res.status; throw err; }
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const err = new Error('request failed'); err.status = res.status; throw err; }
  return res.json();
}

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

function saveActive() { apiPut('/api/active', active).catch(handleSaveError); }
function saveLog() { apiPut('/api/log', log).catch(handleSaveError); }
function saveTargets() { apiPut('/api/targets', targets).catch(handleSaveError); }
function saveFrog() { apiPut('/api/frog', frog).catch(handleSaveError); }

async function loadState() {
  const state = await apiGet('/api/state');
  active = state.active || [];
  log = state.log || [];
  targets = state.targets || DEFAULT_TARGETS;
  frog = state.frog || null;
}

// ---------- Helpers ----------

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

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

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function localDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    if (btn.dataset.tab === 'matrix') renderMatrix();
    if (btn.dataset.tab === 'dashboard') renderDashboard();
    if (btn.dataset.tab === 'analytics') renderAnalytics();
    if (btn.dataset.tab === 'log') renderLog();
    if (btn.dataset.tab === 'guide') renderGuide();
    if (btn.dataset.tab === 'targets') renderTargets();
  });
});

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

  for (let i = 0; i < 5; i++) {
    const task = active[i];
    if (!task) {
      const slot = document.createElement('div');
      slot.className = 'slot-empty';
      slot.textContent = '+ Add Task';
      slot.addEventListener('click', openAddModal);
      board.appendChild(slot);
      continue;
    }
    const cat = catById(task.category);
    const card = document.createElement('div');
    card.className = 'task-card';

    const badge = document.createElement('span');
    badge.className = 'cat-badge';
    badge.style.background = cat.color;
    badge.textContent = `${cat.icon} ${cat.label}`;

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    card.appendChild(badge);
    card.appendChild(title);

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

    board.appendChild(card);
  }

  renderTodayProgress();
  renderFrog();
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
      task: { title: task.title, category: task.category, points: task.points, completedAt }
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
    task: { title: task.title, category: task.category, points: task.points }
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
    summary.textContent = 'Your wins will show up here as you finish them.';
    container.innerHTML = '<div class="today-empty">Nothing finished yet. Start with one task — future you deserves something satisfying to look back on.</div>';
    return;
  }

  summary.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} finished`;
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
    ? 'Daily goal hit — look at you go.'
    : `${dailyTarget - points} pts left to hit today’s goal.`;
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
    details.append(title, meta);
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

// ---------- Add Task Modal ----------

const modalBackdrop = document.getElementById('modalBackdrop');
const taskTitleInput = document.getElementById('taskTitle');
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
  taskPointsInput.value = catById(taskCategorySelect.value).points;
});

let editingTaskId = null;
const modalTitle = document.getElementById('modalTitle');
const saveTaskBtn = document.getElementById('saveTask');

function openAddModal() {
  if (active.length >= 5) return;
  editingTaskId = null;
  modalTitle.textContent = 'Add a Task';
  saveTaskBtn.textContent = 'Add to Board';
  taskTitleInput.value = '';
  taskCategorySelect.value = CATEGORIES[0].id;
  taskQuadrantSelect.value = 'schedule';
  taskPointsInput.value = CATEGORIES[0].points;
  modalBackdrop.classList.add('open');
  setTimeout(() => taskTitleInput.focus(), 50);
}

function openEditModal(id) {
  const task = active.find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  modalTitle.textContent = 'Edit Task';
  saveTaskBtn.textContent = 'Save Changes';
  taskTitleInput.value = task.title;
  taskCategorySelect.value = task.category;
  taskQuadrantSelect.value = task.quadrant || 'schedule';
  taskPointsInput.value = task.points;
  modalBackdrop.classList.add('open');
  setTimeout(() => taskTitleInput.focus(), 50);
}

function closeModal() { modalBackdrop.classList.remove('open'); editingTaskId = null; }

document.getElementById('cancelTask').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

document.getElementById('saveTask').addEventListener('click', () => {
  const title = taskTitleInput.value.trim();
  if (!title) { taskTitleInput.focus(); return; }
  const points = Math.max(1, parseInt(taskPointsInput.value, 10) || catById(taskCategorySelect.value).points);

  if (editingTaskId) {
    const task = active.find(t => t.id === editingTaskId);
    if (task) {
      task.title = title;
      task.category = taskCategorySelect.value;
      task.quadrant = taskQuadrantSelect.value;
      task.points = points;
      if (frog && frog.date === localDateKey() && frog.taskId === task.id) {
        frog.task = { title: task.title, category: task.category, points: task.points };
        saveFrog();
      }
    }
    saveActive();
    closeModal();
    renderBoard();
    return;
  }

  if (active.length >= 5) { closeModal(); return; }
  active.push({
    id: uid(),
    title,
    category: taskCategorySelect.value,
    quadrant: taskQuadrantSelect.value,
    points,
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
        item.textContent = task.title;
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

// ---------- Analytics ----------

const CHART_COLORS = { text: '#b98ba0', grid: 'rgba(185, 139, 160, 0.12)', accent: '#ff5da8', accent2: '#e3b23c', accent3: '#c9a0e8' };
let charts = {};

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

  const { labels, data } = trendSeries(30);
  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: CHART_COLORS.accent,
        backgroundColor: 'rgba(255, 93, 168, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointBackgroundColor: CHART_COLORS.accent2,
      }]
    },
    options: baseChartOptions({ plugins: { legend: { display: false } } })
  });

  const catMap = categoryPointsAllTime();
  const catEntries = CATEGORIES.map(c => ({ c, val: catMap[c.id] || 0 })).filter(e => e.val > 0);
  charts.doughnut = new Chart(document.getElementById('categoryDoughnut'), {
    type: 'doughnut',
    data: {
      labels: catEntries.length ? catEntries.map(e => `${e.c.icon} ${e.c.label}`) : ['No data yet'],
      datasets: [{
        data: catEntries.length ? catEntries.map(e => e.val) : [1],
        backgroundColor: catEntries.length ? catEntries.map(e => e.c.color) : ['#4d2536'],
        borderColor: '#170d13',
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
  generateRecap();
  renderCharts();
  renderHeatmap();
}

// ---------- Log ----------

function renderLog() {
  const body = document.getElementById('logBody');
  body.innerHTML = '';
  document.getElementById('logCount').textContent = `${log.length} completed task${log.length === 1 ? '' : 's'}`;

  if (log.length === 0) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6">No finished tasks yet — complete one from the Board.</td></tr>`;
    return;
  }

  [...log].sort((a, b) => b.completedAt - a.completedAt).forEach(t => {
    const cat = catById(t.category);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.title}</td>
      <td><span class="cat-badge" style="background:${cat.color}; padding:4px 11px; border-radius:999px; font-size:11px; font-weight:700;">${cat.icon} ${cat.label}</span></td>
      <td>${t.points}</td>
      <td>${fmtDateTime(t.startedAt)}</td>
      <td>${fmtDateTime(t.completedAt)}</td>
      <td>${fmtDuration(t.duration)}</td>
    `;
    body.appendChild(row);
  });
}

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

// ---------- Daily Muse ----------

const MUSES = [
  { name: 'Blair Waldorf', img: 'assets/muses/blair_power.jpg', line: "Confidence is an outfit you put on before you leave the house. Wear it like you mean it — one thing, fully.", mood: 'high' },
  { name: 'Elle Woods', img: 'assets/muses/elle_power.jpg', line: "What, like it's hard? Underestimated is just an opening move — focus on the one case in front of you.", mood: 'high' },
  { name: 'Elle Woods', img: 'assets/muses/elle_campaign_1.png', line: "You don't need permission to walk up to the microphone. Just walk up and speak.", mood: 'high' },
  { name: 'Elle Woods', img: 'assets/muses/elle_campaign_2.png', line: "Every campaign starts with someone underestimated deciding to run anyway.", mood: 'high' },
  { name: 'Elle Woods', img: 'assets/muses/elle_campaign_3.png', line: "She didn't wait to be taken seriously. She kept talking until they had no choice.", mood: 'high' },
  { name: 'Blair Waldorf', img: 'assets/muses/blair_pink_dress.jpg', line: "Bold color is a decision, not an accident. Make yours today.", mood: 'high' },
  { name: 'Blair Waldorf', img: 'assets/muses/blair_sailor.jpg', line: "Dressed like this, you don't walk into a room — you arrive.", mood: 'high' },
  { name: 'Blair Waldorf', img: 'assets/muses/blair_soft.jpg', line: "Even an off day looks put-together if you decide it does. Pick the one thing and finish it.", mood: 'mid' },
  { name: 'Blair Waldorf', img: 'assets/muses/blair_pearls.webp', line: "Some days call for pearls and a genuine smile — that's enough polish for anyone.", mood: 'mid' },
  { name: 'Blair Waldorf', img: 'assets/muses/blair_museum.jpg', line: "Even a museum can't out-dazzle someone who knows exactly who she is.", mood: 'mid' },
  { name: 'Blair Waldorf', img: 'assets/muses/blair_floral_street.jpg', line: "Ordinary errands, extraordinary outfit. Same principle applies to ordinary tasks.", mood: 'mid' },
  { name: 'Serena van der Woodsen', img: 'assets/muses/serena.jpg', line: "Effortless isn't lazy. It's the confidence of someone who already decided what mattered today.", mood: 'mid' },
  { name: 'Serena van der Woodsen', img: 'assets/muses/serena_shopping.jpg', line: "A good day looks like this — easy smile, errands done, nothing forced.", mood: 'mid' },
  { name: 'Elle Woods', img: 'assets/muses/elle_soft.jpg', line: "Still showing up, still taking notes. That's half the case won already.", mood: 'low' },
  { name: 'Blair Waldorf', img: 'assets/muses/blair_tweed_smile.jpg', line: "A real smile still counts on the days you don't feel like giving one.", mood: 'low' },
  { name: 'Krishna', img: 'assets/muses/krishna.png', line: "Perform your one duty fully, without grasping at the rest. That is the whole teaching of the Gita.", mood: 'low' },
];

function computeMoodTier() {
  if (log.length === 0) return 'low';
  const weekPts = pointsInRange('week', 0);
  const weekTarget = targets.week || 1;
  const ratio = weekPts / weekTarget;
  const streaks = computeStreaks();
  if (ratio >= 0.75 || streaks.current >= 3) return 'high';
  if (ratio >= 0.35) return 'mid';
  return 'low';
}

function renderMuse() {
  const tier = computeMoodTier();
  const pool = MUSES.filter(m => m.mood === tier);
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((startOfDay(new Date()) - start) / 86400000);
  const muse = pool[dayOfYear % pool.length];
  document.getElementById('museImg').src = muse.img;
  document.getElementById('museImg').alt = muse.name;
  document.getElementById('museName').textContent = muse.name;
  document.getElementById('museLine').textContent = muse.line;
}

// ---------- Auth + Init ----------

const loginScreen = document.getElementById('loginScreen');
const appRoot = document.querySelector('.app');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');
const pinForm = document.getElementById('pinForm');
const sessionNotice = document.getElementById('sessionNotice');

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
  if (activeChanged) saveActive();
  if (logChanged) saveLog();

  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  hideLogin();
  renderBoard();
}

async function boot() {
  spawnSparkles();
  try {
    const { authed } = await fetch('/api/session').then(r => r.json());
    if (!authed) { showLogin(); return; }
    await startApp();
  } catch (err) {
    showLogin();
  }
}

boot();
