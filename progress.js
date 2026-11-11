(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./progress-logic') : root.ProgressLogic);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ProgressUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Logic) {
  'use strict';

  const DEMO_KEY = 'one-ball-progress-demo-v1';
  const PALETTE = { pink: '#bd386c', lilac: '#8052bc', mint: '#347e65', blue: '#367caa', butter: '#996b20' };
  const number = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function failure(status, message, tracker) {
    return Object.assign(new Error(message), { status, payload: { tracker } });
  }
  function checked(result) {
    if (!result.ok) throw failure(400, result.error);
    return result.value;
  }

  // The public demo is deliberately separate from the authenticated PostgreSQL store.
  function createDemoStore(storage, uuid, now = () => new Date().toISOString()) {
    function read() {
      const raw = storage.getItem(DEMO_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        if (!Array.isArray(state.trackers) || !Array.isArray(state.events)) throw new Error('Demo storage is unreadable. Reset the demo to start again.');
        return state;
      }
      const createdAt = now();
      const trackers = [
        { id: uuid(), title: '111 questions, one at a time', unit: 'questions', current: 58, target: 111, step: 1, style: 'ring', color: 'lilac', note: 'One more question. One more bit of confidence.' },
        { id: uuid(), title: 'Little walks, more fresh air', unit: 'walks', current: 4, target: 12, step: 1, style: 'bar', color: 'mint', note: 'A little movement is still movement.' },
      ].map(item => ({ ...item, revision: 0, createdAt, updatedAt: createdAt }));
      const state = { trackers, events: trackers.map(item => ({ id: uuid(), trackerId: item.id, kind: 'initial', delta: item.current, value: item.current, note: 'Starting count', createdAt })) };
      storage.setItem(DEMO_KEY, JSON.stringify(state));
      return state;
    }
    return {
      async request(url, { method = 'GET', body } = {}) {
        const state = read();
        const match = /^\/api\/progress(?:\/([^/]+)(?:\/(history|changes))?)?$/.exec(url);
        if (!match) throw failure(404, 'Unknown progress request.');
        const id = match[1];
        const action = match[2];
        let tracker = state.trackers.find(item => item.id === id);
        let response;
        if (!id && method === 'GET') return { trackers: state.trackers };
        if (!id && method === 'POST') {
          const value = checked(Logic.validateTrackerCreate(body));
          const existing = state.trackers.find(item => item.id === value.id);
          if (existing) {
            if (JSON.stringify(existing.creationPayload) !== JSON.stringify(value)) throw failure(409, 'This goal ID already belongs to a different creation request.', existing);
            return { tracker: existing };
          }
          if (state.trackers.length >= Logic.MAX_TRACKERS) throw failure(409, 'You have reached the tracker limit.');
          tracker = { ...value, creationPayload: value, revision: 0, createdAt: now(), updatedAt: now() };
          state.trackers.unshift(tracker);
          state.events.push({ id: uuid(), trackerId: tracker.id, kind: 'initial', delta: tracker.current, value: tracker.current, note: 'Starting count', createdAt: tracker.createdAt });
          response = { tracker };
        } else {
          if (!tracker) throw failure(404, 'This tracker was removed.');
          if (method === 'GET' && action === 'history') {
            const events = state.events.filter(item => item.trackerId === id);
            return { events: events.slice(-1000), total: events.length, truncated: events.length > 1000 };
          }
          if (method === 'POST' && action === 'changes') {
            const value = checked(Logic.validateTrackerChange(body));
            const prior = state.events.find(item => item.id === value.mutationId);
            if (prior) {
              if (prior.trackerId !== id || prior.kind !== value.kind || prior.requestedValue !== value.value || prior.note !== value.note) throw failure(409, 'This change ID already belongs to a different update.', tracker);
              return { tracker, event: prior };
            }
            if (tracker.revision !== value.revision) throw failure(409, 'This counter changed in another window. Review the refreshed count and try again.', tracker);
            const next = Logic.roundQuantity(value.kind === 'set' ? value.value : tracker.current + value.value);
            if (next < 0 || next > Logic.MAX_QUANTITY) throw failure(400, 'The count must be between 0 and 1,000,000,000.');
            const event = { id: value.mutationId, trackerId: id, kind: value.kind, requestedValue: value.value, delta: Logic.roundQuantity(next - tracker.current), value: next, note: value.note, createdAt: now() };
            tracker.current = next;
            tracker.revision += 1;
            tracker.updatedAt = event.createdAt;
            state.events.push(event);
            response = { tracker, event };
          } else if (method === 'PATCH' && !action) {
            const value = checked(Logic.validateTrackerUpdate(body));
            if (tracker.revision !== value.revision) throw failure(409, 'This tracker changed elsewhere. Please reopen the editor.', tracker);
            Object.assign(tracker, value, { revision: tracker.revision + 1, updatedAt: now() });
            response = { tracker };
          } else if (method === 'DELETE' && !action) {
            checked(Logic.validateTrackerDelete(body));
            if (tracker.revision !== body.revision) throw failure(409, 'This tracker changed elsewhere. Review it before deleting.', tracker);
            state.trackers = state.trackers.filter(item => item.id !== id);
            state.events = state.events.filter(item => item.trackerId !== id);
            response = { ok: true };
          } else throw failure(400, 'Unknown progress action.');
        }
        // Persist before reporting success; quota/storage errors must never look saved.
        storage.setItem(DEMO_KEY, JSON.stringify(state));
        return response;
      },
      reset() { storage.removeItem(DEMO_KEY); },
    };
  }

  function dailyChanges(events, period = '30', today = new Date()) {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const valid = events.filter(event => Number.isFinite(new Date(event.createdAt).getTime()));
    const start = new Date(end);
    if (period === 'all' && valid.length) {
      const first = new Date(Math.min(...valid.map(event => new Date(event.createdAt).getTime())));
      start.setFullYear(first.getFullYear(), first.getMonth(), first.getDate());
    } else start.setDate(start.getDate() - (period === '7' ? 6 : 29));
    const floor = new Date(end); floor.setDate(floor.getDate() - 3659);
    const capped = start < floor;
    if (capped) start.setTime(floor.getTime());
    const totals = new Map();
    valid.forEach(event => {
      if (event.kind === 'initial') return; // A starting balance is not work completed today.
      const key = dayKey(new Date(event.createdAt));
      totals.set(key, Logic.roundQuantity((totals.get(key) || 0) + event.delta));
    });
    const days = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = dayKey(cursor);
      days.push({ date: key, label: cursor.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: period === 'all' ? 'numeric' : undefined }), delta: totals.get(key) || 0 });
    }
    return { days, capped };
  }

  function mount({ document: doc, demo, request, toast, onUnauthorized }) {
    const win = doc.defaultView;
    const panel = doc.getElementById('tab-progress');
    const uuid = () => win.crypto.randomUUID();
    const demoStore = demo ? createDemoStore({
      getItem: key => win.localStorage.getItem(key),
      setItem: (key, value) => win.localStorage.setItem(key, value),
      removeItem: key => win.localStorage.removeItem(key),
    }, uuid) : null;
    const send = demoStore ? demoStore.request : request;
    let trackers = [], loading = false, loaded = false, busy = false, pending = null;
    let error = '', floatingId = null, chart = null, historyId = null, historyEvents = [], historyTruncated = false, historyTotal = 0;
    let dialog = null, dialogReturnFocus = null;
    let stopReward = null;
    const seenRewards = new Set();
    const Rewards = win.ProgressRewards;
    const floating = win.ProgressFloating.create({
      onIncrement: async id => {
        const saved = await change(id, 'add', trackers.find(item => item.id === id)?.step || 1);
        if (!saved) throw new Error('Progress was not saved. Check the main tab.');
      },
      onOpen: () => { doc.querySelector('[data-tab="progress"]').click(); win.focus(); },
      onError: message => toast(message),
    });
    const el = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    function button(text, action, className = 'btn ghost small') {
      const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
    }
    function syncFloating(reward) {
      if (floatingId) floating.update(trackers.find(item => item.id === floatingId) || null, {
        busy: busy || !!pending || loading,
        reward: reward?.after.id === floatingId ? reward.detail : undefined,
      });
    }
    function updateTracker(tracker) {
      const index = trackers.findIndex(item => item.id === tracker.id);
      if (index < 0) trackers.unshift(tracker); else trackers[index] = tracker;
    }
    function focusKey(node) {
      if (!node || !panel.contains(node)) return null;
      return { id: node.closest('.progress-card')?.dataset.trackerId, label: node.getAttribute('aria-label') || node.textContent };
    }
    function restoreFocus(key) {
      if (!key) return;
      const scope = key.id ? [...panel.querySelectorAll('.progress-card')].find(card => card.dataset.trackerId === key.id) : panel.querySelector('.progress-heading');
      const target = [...(scope?.querySelectorAll('button') || [])].find(node => (node.getAttribute('aria-label') || node.textContent) === key.label);
      if (target && !target.disabled) target.focus({ preventScroll: true });
    }
    async function open() {
      if (loading || busy || pending) { render(); return; }
      loading = true; error = ''; render(); syncFloating();
      try { trackers = (await send('/api/progress')).trackers; loaded = true; }
      catch (err) { error = 'Could not load your progress. Check your connection and refresh.'; if (err.status === 401) onUnauthorized(); }
      finally { loading = false; render(); syncFloating(); }
    }
    async function perform(operation) {
      if (busy) return false;
      const returnKey = focusKey(doc.activeElement) || (operation.close ? focusKey(dialogReturnFocus) : null);
      const before = trackers.find(item => item.id === operation.id);
      let savedReward = null;
      busy = true; pending = operation; error = ''; render(); syncFloating();
      try {
        const result = await send(operation.url, operation.options);
        if (result.event && !seenRewards.has(result.event.id)) {
          let detail = null;
          try { detail = Rewards.rewardForChange(before, result.tracker, result.event); }
          catch (_) { /* The save has succeeded even if optional reward presentation fails. */ }
          if (detail) {
            savedReward = { before, after: result.tracker, detail };
            seenRewards.add(result.event.id);
            if (seenRewards.size > 200) seenRewards.delete(seenRewards.values().next().value);
          }
        }
        if (result.tracker) updateTracker(result.tracker);
        if (operation.remove) {
          trackers = trackers.filter(item => item.id !== operation.remove);
          if (historyId === operation.remove) closeDialog();
        }
        pending = null;
        if (operation.close) closeDialog();
        toast(savedReward ? `${savedReward.detail.title} ${savedReward.detail.message}` : operation.message);
        return true;
      } catch (err) {
        if (err.payload?.tracker) updateTracker(err.payload.tracker);
        if (err.status && err.status < 500) {
          pending = null;
          error = err.status === 409 ? 'This goal changed in another window. The latest count is shown; reopen the editor or try your change again.' : err.message;
          if (err.status === 404) trackers = trackers.filter(item => item.id !== operation.id);
          if (err.status === 401) { floating.close(); onUnauthorized(); }
        } else error = 'Could not confirm the save. Use “Retry save” to safely retry the same change without double-counting.';
        const message = dialog?.querySelector('.progress-form-error');
        if (message) message.textContent = error;
        toast(error);
        return false;
      } finally {
        busy = false; render(); syncFloating(savedReward); restoreFocus(returnKey);
        if (savedReward && panel.classList.contains('active')) {
          const card = [...panel.querySelectorAll('.progress-card')].find(item => item.dataset.trackerId === savedReward.after.id);
          if (card) {
            try {
              stopReward = Rewards.animate(card, savedReward.before, savedReward.after, savedReward.detail, {
                reducedMotion: Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches), window: win,
              });
            } catch (_) { /* A presentation failure must never turn a saved count into a failed save. */ }
          }
        }
      }
    }
    async function change(id, kind, value, note = '', close = false, expectedRevision) {
      if (busy || pending) return false;
      const tracker = trackers.find(item => item.id === id);
      if (!tracker) return false;
      const body = { mutationId: uuid(), revision: expectedRevision ?? tracker.revision, kind, value, note };
      const validation = Logic.validateTrackerChange(body);
      if (!validation.ok) { toast(validation.error); return false; }
      return perform({ id, url: `/api/progress/${id}/changes`, options: { method: 'POST', body }, close, message: 'Progress saved. One step counts.' });
    }
    function visual(tracker) {
      const ratio = Math.min(100, Math.max(0, tracker.current / tracker.target * 100));
      const wrapper = el('div', `progress-visual progress-${tracker.style}`);
      wrapper.setAttribute('role', 'progressbar');
      wrapper.setAttribute('aria-label', tracker.title);
      wrapper.setAttribute('aria-valuemin', '0');
      wrapper.setAttribute('aria-valuemax', String(tracker.target));
      wrapper.setAttribute('aria-valuenow', String(Math.min(tracker.current, tracker.target)));
      wrapper.setAttribute('aria-valuetext', `${number(tracker.current)} of ${number(tracker.target)} ${tracker.unit}`);
      wrapper.style.setProperty('--progress-percent', `${ratio}%`);
      if (tracker.style === 'bar') wrapper.append(el('span', 'progress-bar-fill'));
      else if (tracker.style === 'ring') wrapper.append(el('span', 'progress-ring-label', `${number(Math.round(ratio * 10) / 10)}%`));
      else {
        const exact = Number.isInteger(tracker.target) && tracker.target <= 200;
        const count = exact ? tracker.target : 100;
        for (let index = 0; index < count; index++) {
          const dot = el('i', 'progress-dot');
          const fill = Math.max(0, Math.min(1, tracker.current / tracker.target * count - index));
          dot.style.setProperty('--dot-fill', `${fill * 100}%`);
          wrapper.append(dot);
        }
        wrapper.dataset.scale = exact ? `${number(count)} dots · one per unit` : '100 dots = 100% of your goal';
      }
      return wrapper;
    }
    function render() {
      stopReward?.(); stopReward = null;
      panel.replaceChildren();
      const head = el('div', 'section-head progress-heading');
      const copy = el('div');
      copy.append(el('p', 'progress-kicker', 'Little steps. Visible proof.'), el('h2', '', 'Make progress feel real'), el('p', 'progress-intro', 'A question, a chapter, a walk. Set your target and watch every little bit add up.'));
      const controls = el('div', 'progress-actions');
      const refresh = button(loading ? 'Loading…' : 'Refresh', open); refresh.disabled = loading || busy || !!pending;
      const create = button('+ New goal', () => editGoal(), 'btn primary'); create.disabled = !loaded || loading || busy || !!pending;
      controls.append(refresh, create); head.append(copy, controls); panel.append(head);
      if (demo) panel.append(el('p', 'progress-demo-label', 'Sample goals · edits stay in this browser demo, not your private account.'));
      if (error) {
        const notice = el('div', 'progress-notice'); notice.setAttribute('role', 'alert'); notice.append(el('span', '', error));
        if (pending) { const retry = button('Retry save', () => perform(pending)); retry.disabled = busy; notice.append(retry); }
        panel.append(notice);
      }
      if (!trackers.length) panel.append(el('div', 'progress-empty', loading ? 'Getting your goals…' : loaded ? 'What would you love to see move forward? Add your first goal — you can start from the progress you already made.' : 'Your goals will appear here once loaded.'));
      const grid = el('div', 'progress-grid');
      trackers.forEach(tracker => {
        const card = el('article', 'progress-card'); card.dataset.color = tracker.color; card.dataset.trackerId = tracker.id;
        const journey = Rewards.describe(tracker);
        card.classList.toggle('progress-complete', tracker.current >= tracker.target);
        card.style.setProperty('--progress-color', PALETTE[tracker.color] || PALETTE.pink);
        const top = el('div', 'progress-card-top');
        top.append(el('span', 'progress-kicker', journey.label), button('Edit', () => editGoal(tracker)));
        card.append(top, el('h3', '', tracker.title));
        if (tracker.note) card.append(el('p', 'progress-note', tracker.note));
        const count = el('p', 'progress-count'); count.append(el('strong', '', number(tracker.current)), el('span', '', ` / ${number(tracker.target)}`));
        card.append(count, el('p', 'progress-unit', tracker.unit), visual(tracker));
        if (tracker.style === 'dots') card.append(el('p', 'progress-scale', card.querySelector('.progress-dots').dataset.scale));
        card.append(el('p', 'progress-remaining', tracker.current >= tracker.target ? 'You made it. Every extra step still counts.' : `${number(Logic.roundQuantity(tracker.target - tracker.current))} ${tracker.unit} to go · ${number(Math.round(tracker.current / tracker.target * 1000) / 10)}% there`));
        const checkpoints = el('ol', 'progress-checkpoints');
        checkpoints.setAttribute('aria-label', 'Your milestones');
        [25, 50, 75, 90, 100].forEach(percent => {
          const reached = Math.round(tracker.current * 100) * 100 >= Math.round(tracker.target * 100) * percent;
          const point = el('li', reached ? 'is-reached' : journey.nextMilestone === percent ? 'is-next' : '', `${reached ? '✓ ' : ''}${percent}%`);
          point.setAttribute('aria-label', `${percent}% milestone${reached ? ' reached' : journey.nextMilestone === percent ? ', up next' : ''}`);
          checkpoints.append(point);
        });
        card.append(checkpoints, el('p', 'progress-pep-talk', journey.message));
        const stepper = el('div', 'progress-stepper');
        const minus = button(`−${number(tracker.step)}`, () => change(tracker.id, 'add', -tracker.step), 'btn ghost');
        minus.setAttribute('aria-label', `Subtract ${number(tracker.step)} from ${tracker.title}`);
        minus.disabled = tracker.current < tracker.step;
        const plus = button(`+${number(tracker.step)}`, () => change(tracker.id, 'add', tracker.step), 'btn primary progress-plus');
        plus.setAttribute('aria-label', `Add ${number(tracker.step)} to ${tracker.title}`);
        plus.disabled = tracker.current + tracker.step > Logic.MAX_QUANTITY;
        stepper.append(minus, plus, button('Set count', () => editCount(tracker)));
        const actions = el('div', 'progress-card-actions');
        actions.append(button('History & chart', () => showHistory(tracker.id)), button('↗ Float', () => {
          floatingId = tracker.id;
          floating.open(tracker).then(() => syncFloating());
        }), button('Delete', () => {
          if (!win.confirm(`Delete “${tracker.title}” and its entire progress history? This cannot be undone.`)) return;
          perform({ id: tracker.id, remove: tracker.id, url: `/api/progress/${tracker.id}`, options: { method: 'DELETE', body: { revision: tracker.revision } }, message: 'Goal and its history deleted.' });
        }));
        card.append(stepper, actions);
        if (busy || pending || loading) card.querySelectorAll('button').forEach(node => { node.disabled = true; });
        grid.append(card);
      });
      panel.append(grid, el('p', 'progress-footnote', 'These counters are yours to update — they do not change task points or focus time. Float uses picture-in-picture when supported; some browsers open a regular window instead.'));
      if (dialog) {
        dialog.querySelectorAll('button[type="submit"]').forEach(node => { node.disabled = busy || !!pending; });
        const retry = dialog.querySelector('[data-retry]');
        if (retry) { retry.hidden = !pending; retry.disabled = busy; }
      }
    }
    function closeDialog() {
      if (!dialog) return;
      dialog.close(); dialog.remove(); dialog = null; historyId = null;
      if (chart) { chart.destroy(); chart = null; }
      if (dialogReturnFocus?.isConnected) dialogReturnFocus.focus();
      else panel.querySelector('.progress-heading button')?.focus();
    }
    function makeDialog(title, wide = false) {
      closeDialog();
      dialogReturnFocus = doc.activeElement;
      dialog = el('dialog', `progress-dialog${wide ? ' progress-dialog-wide' : ''}`);
      const head = el('div', 'progress-dialog-head');
      const heading = el('h2', '', title); heading.id = 'progressDialogTitle';
      dialog.setAttribute('aria-labelledby', heading.id);
      head.append(heading, button('Close', closeDialog)); dialog.append(head);
      dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
      doc.body.append(dialog); dialog.showModal(); return dialog;
    }
    function field(parent, labelText, type, value, options = {}) {
      const label = el('label', '', labelText);
      let input;
      if (type === 'select') {
        input = el('select');
        Object.entries(options.choices).forEach(([key, text]) => { const option = el('option', '', text); option.value = key; input.append(option); });
      } else input = el(type === 'textarea' ? 'textarea' : 'input');
      if (type !== 'select' && type !== 'textarea') input.type = type;
      input.value = value ?? '';
      input.setAttribute('aria-label', labelText);
      if (type === 'number') { input.min = options.min ?? '0'; input.max = '1000000000'; input.step = '0.01'; }
      if (options.maxLength) input.maxLength = options.maxLength;
      if (options.required) input.required = true;
      label.append(input); parent.append(label); return input;
    }
    function formFooter(form, action) {
      const message = el('p', 'progress-form-error'); message.setAttribute('role', 'alert');
      const actions = el('div', 'progress-actions');
      const save = el('button', 'btn primary', action); save.type = 'submit';
      const retry = button('Retry save', () => perform(pending)); retry.dataset.retry = ''; retry.hidden = true;
      actions.append(button('Cancel', closeDialog), retry, save); form.append(message, actions); return message;
    }
    function editGoal(tracker) {
      const popup = makeDialog(tracker ? 'Edit your goal' : 'A little progress, every day');
      const form = el('form', 'progress-form');
      const title = field(form, 'What are you working towards?', 'text', tracker?.title, { required: true, maxLength: 120 });
      title.placeholder = 'e.g. Finish 111 questions';
      const row = el('div', 'progress-form-row'); form.append(row);
      const target = field(row, 'Target', 'number', tracker?.target ?? 111, { min: '0.01', required: true });
      const unit = field(row, 'Unit', 'text', tracker?.unit ?? 'questions', { required: true, maxLength: 32 });
      const counts = el('div', 'progress-form-row'); form.append(counts);
      const current = tracker ? null : field(counts, 'Already completed', 'number', 0, { required: true });
      const step = field(counts, 'Quick-add amount', 'number', tracker?.step ?? 1, { min: '0.01', required: true });
      const design = el('div', 'progress-form-row'); form.append(design);
      const style = field(design, 'Look', 'select', tracker?.style ?? 'ring', { choices: { bar: 'Progress bar', ring: 'Progress ring', dots: 'Dot grid' } });
      const color = field(design, 'Colour', 'select', tracker?.color ?? 'pink', { choices: { pink: 'Rose pink', lilac: 'Lilac', mint: 'Fresh mint', blue: 'Sky blue', butter: 'Honey' } });
      const note = field(form, 'A little reminder (optional)', 'textarea', tracker?.note, { maxLength: 500 });
      if (tracker) form.append(el('p', 'progress-footnote', 'Use “Set count” on the card to correct your progress — that keeps a dated record.'));
      const message = formFooter(form, tracker ? 'Save changes' : 'Create goal');
      const createId = tracker?.id || uuid();
      form.addEventListener('submit', event => {
        event.preventDefault(); if (busy || pending) return;
        const body = { title: title.value, unit: unit.value, target: Number(target.value), step: Number(step.value), style: style.value, color: color.value, note: note.value };
        if (tracker) body.revision = tracker.revision;
        else { body.id = createId; body.current = Number(current.value); }
        const result = tracker ? Logic.validateTrackerUpdate(body) : Logic.validateTrackerCreate(body);
        if (!result.ok) { message.textContent = result.error; return; }
        perform({ id: createId, url: tracker ? `/api/progress/${tracker.id}` : '/api/progress', options: { method: tracker ? 'PATCH' : 'POST', body }, close: true, message: tracker ? 'Goal updated.' : 'Your new goal is ready.' });
      });
      popup.append(form); title.focus();
    }
    function editCount(tracker) {
      const popup = makeDialog('Update your count');
      const form = el('form', 'progress-form');
      form.append(el('p', 'progress-intro', `${tracker.title} · currently ${number(tracker.current)} ${tracker.unit}`));
      const value = field(form, 'New total completed', 'number', tracker.current, { required: true });
      const note = field(form, 'Note (optional)', 'textarea', '', { maxLength: 500 });
      formFooter(form, 'Save count');
      form.addEventListener('submit', event => { event.preventDefault(); change(tracker.id, 'set', Number(value.value), note.value, true, tracker.revision); });
      popup.append(form); value.focus();
    }
    async function showHistory(id) {
      const tracker = trackers.find(item => item.id === id);
      const popup = makeDialog(`${tracker.title} · History`, true); historyId = id;
      const body = el('div', 'progress-history', 'Loading your progress…'); popup.append(body);
      try {
        const result = await send(`/api/progress/${id}/history`);
        if (historyId !== id || dialog !== popup) return;
        historyEvents = result.events; historyTruncated = result.truncated; historyTotal = result.total;
        body.replaceChildren();
        const controls = el('div', 'progress-history-controls');
        const period = field(controls, 'Chart range', 'select', '30', { choices: { '7': 'Last 7 days', '30': 'Last 30 days', all: 'All recorded days' } });
        body.append(controls, el('p', 'progress-footnote', 'Daily net change · starting counts are excluded. Corrections can make a day negative.'));
        if (historyTruncated) body.append(el('p', 'progress-notice', `Showing the latest ${historyEvents.length} of ${historyTotal} entries. The chart only includes those entries.`));
        const chartBox = el('div', 'progress-history-chart');
        const canvas = el('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `Daily progress for ${tracker.title}`); chartBox.append(canvas); body.append(chartBox);
        const chartNote = el('p', 'progress-footnote'); body.append(chartNote);
        const chartData = el('details', 'progress-data-table'); chartData.append(el('summary', '', 'View daily numbers')); body.append(chartData);
        const updateChart = () => {
          if (chart) { chart.destroy(); chart = null; }
          const result = dailyChanges(historyEvents, period.value);
          chartNote.textContent = result.capped ? 'Chart limited to the most recent 10 years.' : '';
          chartData.querySelector('table')?.remove();
          const table = el('table'); const head = el('tr'); head.append(el('th', '', 'Day'), el('th', '', 'Net change')); table.append(head);
          result.days.forEach(day => { const row = el('tr'); row.append(el('td', '', day.label), el('td', '', number(day.delta))); table.append(row); }); chartData.append(table);
          if (!win.Chart) { chartBox.hidden = true; chartData.open = true; return; }
          chart = new win.Chart(canvas, { type: 'bar', data: { labels: result.days.map(day => day.label), datasets: [{ label: tracker.unit, data: result.days.map(day => day.delta), backgroundColor: PALETTE[tracker.color], borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { ticks: { maxTicksLimit: 12, maxRotation: 45 } } } } });
        };
        period.addEventListener('change', updateChart); updateChart();
        body.append(el('h3', '', 'Your steps, saved'));
        const list = el('ol', 'progress-event-list');
        [...historyEvents].reverse().forEach(event => {
          const row = el('li');
          const copy = el('div');
          copy.append(el('strong', '', event.kind === 'initial' ? `Starting count: ${number(event.value)}` : `${event.delta > 0 ? '+' : ''}${number(event.delta)} ${tracker.unit} → ${number(event.value)} total`), el('time', '', new Date(event.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })));
          if (event.note) copy.append(el('p', '', event.note)); row.append(copy); list.append(row);
        });
        body.append(list);
      } catch (err) { if (dialog === popup) body.textContent = 'Could not load history. Close this window and try again.'; if (err.status === 401) onUnauthorized(); }
    }
    win.addEventListener('pagehide', () => { stopReward?.(); floating.close(); });
    win.addEventListener('focus', () => { if (loaded && panel.classList.contains('active') && !dialog) open(); });
    return { open, resetDemo: () => demoStore?.reset(), close: () => { stopReward?.(); floating.close(); closeDialog(); } };
  }
  return { mount, createDemoStore, dailyChanges, DEMO_KEY };
});
