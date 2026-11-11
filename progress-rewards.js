(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ProgressRewards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MILESTONES = [25, 50, 75, 90, 100];
  const STAGES = [
    { at: 0, label: 'A place to begin', message: 'Small steps count. Take this at your own pace.' },
    { at: 25, label: 'A quarter of the way', message: 'Look at what your little steps have added up to.' },
    { at: 50, label: 'Halfway there', message: 'Half of this goal is already behind you. One step at a time.' },
    { at: 75, label: 'Three quarters there', message: 'You have come a long way. Keep your own rhythm.' },
    { at: 90, label: 'The home stretch', message: 'Your target is getting close. There is no need to rush.' },
    { at: 100, label: 'Target reached ✓', message: 'You made it. All those small steps mattered.' },
  ];
  const activeAnimations = new WeakMap();
  const format = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const valid = tracker => tracker && Number.isFinite(tracker.current) && tracker.current >= 0
    && Number.isFinite(tracker.target) && tracker.target > 0
    && round(tracker.current) === tracker.current && round(tracker.target) === tracker.target;
  // Stored quantities have two decimal places. Comparing integer hundredths
  // avoids missing exact boundaries such as 0.09 / 0.10 through float division.
  const reached = (tracker, milestone) => valid(tracker)
    && Math.round(tracker.current * 100) * 100 >= Math.round(tracker.target * 100) * milestone;

  function describe(tracker) {
    const stage = STAGES.filter(item => reached(tracker, item.at)).at(-1) || STAGES[0];
    return {
      label: stage.label,
      message: stage.message,
      nextMilestone: MILESTONES.find(milestone => !reached(tracker, milestone)) ?? null,
    };
  }

  // Call only with the event returned by a successful save. A snapshot alone is
  // not proof of a new increment (it might be initial load, an edit, or a retry).
  function rewardForChange(before, after, event) {
    if (!valid(before) || !valid(after) || !event || event.kind !== 'add'
      || typeof before.id !== 'string' || !before.id || before.id !== after.id
      || event.trackerId !== after.id || before.target !== after.target
      || !Number.isFinite(event.delta) || event.delta <= 0
      || event.value !== after.current || after.current <= before.current
      || round(after.current - before.current) !== event.delta) return null;

    const milestone = MILESTONES.filter(value => !reached(before, value) && reached(after, value)).at(-1) ?? null;
    const stage = STAGES.find(item => item.at === milestone);
    const alreadyComplete = before.current >= before.target;
    return {
      delta: event.delta,
      milestone,
      complete: milestone === 100,
      title: stage ? stage.label : alreadyComplete ? 'A little extra, saved.' : 'One more step, saved.',
      message: stage ? stage.message : alreadyComplete
        ? 'Your target is already reached. This extra step counts too.'
        : 'A little more progress to be proud of. Keep your own pace.',
      from: before.current,
      to: after.current,
    };
  }

  function animate(card, before, after, reward, {
    reducedMotion = false,
    window: win = card?.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null),
  } = {}) {
    const noop = () => {};
    if (!card) return noop;
    activeAnimations.get(card)?.();
    if (!reward || !valid(before) || !valid(after) || before.id !== after.id
      || before.target !== after.target || reward.from !== before.current || reward.to !== after.current
      || reward.delta <= 0 || reward.delta !== round(after.current - before.current)) return noop;

    const counter = card.querySelector('.progress-count strong');
    const visual = card.querySelector('.progress-visual');
    const ringLabel = card.querySelector('.progress-ring-label');
    const dots = [...card.querySelectorAll('.progress-dot')];
    const wholeCount = Number.isInteger(before.current) && Number.isInteger(after.current);
    const paint = value => {
      const percent = Math.max(0, Math.min(100, value / after.target * 100));
      if (counter) counter.textContent = format(wholeCount ? Math.floor(value) : value);
      if (visual) visual.style.setProperty('--progress-percent', `${percent}%`);
      if (ringLabel) ringLabel.textContent = `${format(Math.round(percent * 10) / 10)}%`;
      dots.forEach((dot, index) => {
        const fill = Math.max(0, Math.min(1, percent / 100 * dots.length - index));
        dot.style.setProperty('--dot-fill', `${fill * 100}%`);
      });
    };

    if (card.isConnected === false) return noop;
    if (reducedMotion || !win || typeof win.requestAnimationFrame !== 'function'
      || typeof win.cancelAnimationFrame !== 'function' || typeof win.setTimeout !== 'function'
      || typeof win.clearTimeout !== 'function') {
      paint(after.current);
      return noop;
    }

    let frameId = null, timerId = null, observer = null, startedAt = null, stopped = false;
    const decorations = [];
    function cleanup() {
      if (stopped) return;
      stopped = true;
      if (frameId !== null) win.cancelAnimationFrame(frameId);
      if (timerId !== null) win.clearTimeout(timerId);
      observer?.disconnect();
      decorations.forEach(node => node.remove());
      card.classList.remove('progress-rewarding', 'progress-milestone-reward');
      if (card.isConnected !== false) paint(after.current);
      if (activeAnimations.get(card) === cleanup) activeAnimations.delete(card);
    }
    activeAnimations.set(card, cleanup);

    const doc = card.ownerDocument;
    function decoration(tag, className, parent = card) {
      const node = doc.createElement(tag);
      node.className = className;
      node.setAttribute('aria-hidden', 'true');
      parent.append(node);
      return node;
    }
    card.classList.add('progress-rewarding');
    const pop = decoration('span', 'progress-reward-pop');
    pop.textContent = `+${format(reward.delta)}`;
    decorations.push(pop);
    if (reward.milestone) {
      card.classList.add('progress-milestone-reward');
      const confetti = decoration('span', 'progress-confetti');
      decorations.push(confetti);
      const count = reward.complete ? 12 : 8;
      for (let index = 0; index < count; index++) {
        const piece = decoration('i', 'progress-confetti-piece', confetti);
        piece.style.setProperty('--piece-x', `${Math.round((index / (count - 1) - 0.5) * 140)}px`);
        piece.style.setProperty('--piece-y', `${-34 - (index % 4) * 13}px`);
        piece.style.setProperty('--piece-rotate', `${(index % 2 ? 1 : -1) * (45 + index * 17)}deg`);
        piece.style.setProperty('--piece-delay', `${(index % 3) * 35}ms`);
      }
    }

    function frame(timestamp) {
      frameId = null;
      if (stopped) return;
      if (card.isConnected === false) { cleanup(); return; }
      if (startedAt === null) startedAt = timestamp;
      const elapsed = Math.max(0, Math.min(1, (timestamp - startedAt) / 650));
      const eased = 1 - Math.pow(1 - elapsed, 3);
      // Keep fills smooth, whole-item counts whole, and the final value exact.
      paint(elapsed === 1 ? after.current : before.current + (after.current - before.current) * eased);
      if (elapsed < 1) frameId = win.requestAnimationFrame(frame);
    }
    // The timer also bounds work if a background tab pauses animation frames.
    timerId = win.setTimeout(cleanup, 1200);
    if (typeof win.MutationObserver === 'function' && doc.documentElement) {
      observer = new win.MutationObserver(() => { if (card.isConnected === false) cleanup(); });
      observer.observe(doc.documentElement, { childList: true, subtree: true });
    }
    paint(before.current);
    frameId = win.requestAnimationFrame(frame);
    return cleanup;
  }

  return { describe, rewardForChange, animate };
});
