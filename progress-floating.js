(function attachProgressFloating(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ProgressFloating = api;
})(typeof window !== 'undefined' ? window : null, function createProgressFloating(root) {
  const COLORS = { pink: '#c0376a', lilac: '#8061a7', mint: '#3b7c64', blue: '#497ca1', butter: '#967424' };
  const LABELS = {
    document: 'Always-on-top window',
    video: 'Always-on-top view · controls in main tab',
    popup: 'Standard window · not always on top',
  };
  const number = value => new Intl.NumberFormat('en', { maximumFractionDigits: 6 }).format(value);

  // Presentation only: the parent owns every saved value and all mutations.
  function formatProgress(tracker) {
    const current = Math.max(0, Number(tracker?.current) || 0);
    const target = Number(tracker?.target);
    if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return null;
    const step = Number(tracker.step) > 0 && Number.isFinite(Number(tracker.step)) ? Number(tracker.step) : 1;
    const ratio = Math.min(current / target, 1);
    return {
      current, target, step, ratio,
      counter: `${number(current)} / ${number(target)}`,
      percent: `${Math.floor(ratio * 100)}%`,
      remaining: current >= target ? 'Target reached' : `${number(target - current)} to go`,
      increment: `+${number(step)}`,
      color: COLORS[tracker.color] || COLORS.pink,
      style: ['bar', 'ring', 'dots'].includes(tracker.style) ? tracker.style : 'bar',
    };
  }

  const CSS = `
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #fffafb; color: #432b35; font-family: system-ui, sans-serif; }
    body { padding: 16px; }
    main { --accent: #c0376a; display: grid; gap: 12px; }
    .eyebrow, .notice { margin: 0; font-size: 11px; line-height: 1.5; color: #76515f; }
    .eyebrow { font-weight: 750; text-transform: uppercase; letter-spacing: .1em; }
    h1 { margin: 0; font: 700 22px/1.2 Georgia, serif; overflow-wrap: anywhere; }
    .counter { font: 700 clamp(30px, 10vw, 46px)/1.15 Georgia, serif; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .unit { margin: -7px 0 0; color: #76515f; font-size: 12px; overflow-wrap: anywhere; }
    .graphic { width: 100%; }
    .bar { height: 10px; border-radius: 20px; overflow: hidden; background: #eddee4; }
    .fill { height: 100%; background: var(--accent); }
    .ring { width: 90px; height: 90px; border-radius: 50%; display: grid; place-items: center; margin: auto; }
    .ring span { display: grid; place-items: center; background: #fffafb; width: 70px; height: 70px; border-radius: 50%; font-weight: 700; }
    .dots { display: flex; flex-wrap: wrap; gap: 5px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: #eddee4; }
    .dot.filled { background: var(--accent); }
    .controls { display: flex; gap: 8px; }
    button { min-height: 40px; padding: 8px 15px; border: 1px solid #d7b8c4; border-radius: 999px; background: white; color: #432b35; font: 700 12px system-ui, sans-serif; cursor: pointer; }
    button.primary { margin-left: auto; background: var(--accent); border-color: var(--accent); color: white; }
    button:focus-visible { outline: 3px solid #432b35; outline-offset: 3px; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .error { margin: 0; font-size: 12px; color: #9d2d45; }
    .error:empty { display: none; }
    .reward { margin: 0; color: var(--accent); font-size: 12px; line-height: 1.4; font-weight: 650; }
    .reward:empty { display: none; }
  `;

  function create({ onIncrement, onOpen, onError } = {}) {
    const document = root?.document;
    let active = null;
    let tracker = null;
    let busy = false;
    let generation = 0;
    let pending = null;
    const failedModes = new Set();

    function report(message) {
      clearReward(active);
      if (active?.nodes) active.nodes.error.textContent = message;
      if (typeof onError === 'function') onError(message);
    }

    function clearReward(session) {
      if (!session) return;
      if (session.rewardTimer) root.clearTimeout(session.rewardTimer);
      session.rewardTimer = null;
      session.rewardAnimation?.cancel();
      session.rewardAnimation = null;
      if (session.nodes) session.nodes.reward.textContent = '';
    }

    function showReward(session, reward) {
      if (!session?.nodes || session.disposed || session.nodes.error.textContent
          || !reward || !Number.isFinite(reward.delta) || reward.delta <= 0) return;
      clearReward(session);
      const title = typeof reward.title === 'string' ? reward.title.trim() : '';
      const message = typeof reward.message === 'string' ? reward.message.trim() : '';
      session.nodes.reward.textContent = [title, message].filter(Boolean).join(' · ') || 'One more little step. Saved.';
      const view = typeof session.window?.matchMedia === 'function' ? session.window : root;
      const reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion && typeof session.nodes.counter.animate === 'function') {
        try {
          session.rewardAnimation = session.nodes.counter.animate([
            { transform: 'scale(1)', transformOrigin: 'left center' },
            { transform: `scale(${reward.milestone ? 1.04 : 1.025})`, transformOrigin: 'left center', offset: 0.35 },
            { transform: 'scale(1)', transformOrigin: 'left center' },
          ], { duration: reward.milestone ? 900 : 600, easing: 'ease-out', iterations: 1 });
        } catch (_) { /* Decorative animation must never interrupt a confirmed save. */ }
      }
      session.rewardTimer = root.setTimeout(() => clearReward(session), 1200);
    }

    function nextMode() {
      if (!root || !document) return null;
      if (!failedModes.has('document') && root.isSecureContext
          && typeof root.documentPictureInPicture?.requestWindow === 'function') return 'document';
      if (!failedModes.has('video') && document.pictureInPictureEnabled
          && typeof root.HTMLVideoElement?.prototype.requestPictureInPicture === 'function'
          && typeof root.HTMLCanvasElement?.prototype.captureStream === 'function') return 'video';
      return typeof root.open === 'function' ? 'popup' : null;
    }

    function listen(session, target, event, callback, options) {
      target.addEventListener(event, callback, options);
      session.cleanup.push(() => target.removeEventListener(event, callback, options));
    }

    function dispose(session) {
      if (!session || session.disposed) return;
      session.disposed = true;
      clearReward(session);
      session.cleanup.splice(0).forEach(cleanup => cleanup());
      if (session.window && !session.window.closed) session.window.close();
      if (session.video) {
        if (document.pictureInPictureElement === session.video) {
          try { Promise.resolve(document.exitPictureInPicture()).catch(() => {}); } catch (_) { /* Already closed. */ }
        }
        session.video.pause();
        session.video.srcObject = null;
        session.video.remove();
      }
      session.stream?.getTracks().forEach(track => track.stop());
      if (active === session) active = null;
    }

    function close() {
      generation += 1;
      pending = null;
      tracker = null;
      busy = false;
      dispose(active);
    }

    function append(doc, parent, tag, className, text) {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      parent.appendChild(node);
      return node;
    }

    function makeWindow(session, child) {
      session.window = child;
      const doc = child.document;
      doc.documentElement.lang = 'en';
      doc.title = 'Progress — One Ball at a Time';
      append(doc, doc.head, 'style', '', CSS);
      const main = append(doc, doc.body, 'main');
      append(doc, main, 'p', 'eyebrow', 'A little further');
      const title = append(doc, main, 'h1');
      const counter = append(doc, main, 'div', 'counter');
      counter.setAttribute('aria-live', 'polite');
      counter.setAttribute('aria-atomic', 'true');
      const unit = append(doc, main, 'p', 'unit');
      const graphic = append(doc, main, 'div', 'graphic');
      graphic.setAttribute('role', 'progressbar');
      graphic.setAttribute('aria-valuemin', '0');
      const caption = append(doc, main, 'p', 'notice');
      const reward = append(doc, main, 'p', 'reward');
      reward.setAttribute('role', 'status');
      reward.setAttribute('aria-live', 'polite');
      reward.setAttribute('aria-atomic', 'true');
      const controls = append(doc, main, 'div', 'controls');
      const back = append(doc, controls, 'button', '', 'Open main tab');
      const increment = append(doc, controls, 'button', 'primary');
      back.type = increment.type = 'button';
      const notice = append(doc, main, 'p', 'notice', LABELS[session.mode]);
      const error = append(doc, main, 'p', 'error');
      error.setAttribute('role', 'alert');
      session.nodes = { main, title, counter, unit, graphic, caption, reward, back, increment, notice, error };
      listen(session, back, 'click', () => {
        if (!tracker || root.closed) return;
        root.focus();
        if (typeof onOpen === 'function') onOpen(tracker.id);
      });
      listen(session, increment, 'click', async () => {
        if (!tracker || busy || session.saving || root.closed || typeof onIncrement !== 'function') return;
        session.saving = true;
        error.textContent = '';
        render();
        try { await onIncrement(tracker.id); }
        catch (_) { if (!session.disposed) report('Could not save progress. Please try again in the main tab.'); }
        finally { session.saving = false; if (!session.disposed) render(); }
      });
      listen(session, child, 'pagehide', () => {
        session.window = null;
        if (active === session) close();
      }, { once: true });
      render();
    }

    function renderWindow(session, display) {
      const { main, title, counter, unit, graphic, caption, increment, back, error } = session.nodes;
      main.style.setProperty('--accent', display.color);
      title.textContent = String(tracker.title || 'My progress');
      counter.textContent = display.counter;
      unit.textContent = String(tracker.unit || '');
      caption.textContent = `${display.percent} · ${display.remaining}`;
      const needsAttention = (busy || session.saving) && Boolean(error.textContent);
      increment.textContent = needsAttention ? 'Check main tab' : busy || session.saving ? 'Saving…' : display.increment;
      increment.setAttribute('aria-label', needsAttention
        ? 'Save not confirmed. Open the main tab to retry.'
        : `Add ${number(display.step)} ${tracker.unit || 'to progress'}`);
      increment.disabled = busy || session.saving || root.closed || typeof onIncrement !== 'function';
      back.disabled = Boolean(root.closed);
      graphic.setAttribute('aria-label', String(tracker.title || 'Progress'));
      graphic.setAttribute('aria-valuemax', String(display.target));
      graphic.setAttribute('aria-valuenow', String(Math.min(display.current, display.target)));
      graphic.setAttribute('aria-valuetext', `${display.counter} ${tracker.unit || ''}`.trim());
      graphic.replaceChildren();
      const doc = session.window.document;
      if (display.style === 'ring') {
        const ring = append(doc, graphic, 'div', 'ring');
        ring.style.background = `conic-gradient(${display.color} ${display.ratio * 360}deg, #eddee4 0deg)`;
        append(doc, ring, 'span', '', display.percent);
      } else if (display.style === 'dots') {
        const dots = append(doc, graphic, 'div', 'dots');
        const count = Math.min(40, Math.ceil(display.target));
        for (let i = 0; i < count; i += 1) append(doc, dots, 'span', `dot${i < Math.floor(display.ratio * count) ? ' filled' : ''}`);
        dots.setAttribute('aria-hidden', 'true');
      } else {
        const bar = append(doc, graphic, 'div', 'bar');
        append(doc, bar, 'div', 'fill').style.width = `${display.ratio * 100}%`;
      }
    }

    function drawVideo(session, display) {
      const context = session.canvas.getContext('2d');
      const truncate = (text, width) => {
        let value = String(text || '');
        if (context.measureText(value).width <= width) return value;
        while (value.length && context.measureText(`${value}…`).width > width) value = value.slice(0, -1);
        return `${value}…`;
      };
      context.fillStyle = '#fffafb';
      context.fillRect(0, 0, 720, 405);
      context.fillStyle = display.color;
      context.fillRect(0, 0, 10, 405);
      context.font = '700 20px system-ui, sans-serif';
      context.fillText('A LITTLE FURTHER', 36, 44);
      context.fillStyle = '#432b35';
      context.font = '700 32px Georgia, serif';
      context.fillText(truncate(tracker.title || 'My progress', 644), 36, 100);
      context.font = '700 68px Georgia, serif';
      context.fillText(truncate(display.counter, 644), 36, 184);
      context.font = '500 22px system-ui, sans-serif';
      context.fillStyle = '#76515f';
      context.fillText(truncate(tracker.unit, 644), 36, 220);
      if (display.style === 'ring') {
        context.lineWidth = 8;
        context.strokeStyle = '#eddee4';
        context.beginPath();
        context.arc(64, 264, 24, 0, Math.PI * 2);
        context.stroke();
        if (display.ratio > 0) {
          context.strokeStyle = display.color;
          context.beginPath();
          context.arc(64, 264, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * display.ratio);
          context.stroke();
        }
      } else if (display.style === 'dots') {
        const count = Math.min(40, Math.ceil(display.target));
        for (let i = 0; i < count; i += 1) {
          context.fillStyle = i < Math.floor(display.ratio * count) ? display.color : '#eddee4';
          context.beginPath();
          context.arc(43 + (i % 36) * 18, 255 + Math.floor(i / 36) * 18, 6, 0, Math.PI * 2);
          context.fill();
        }
      } else {
        context.fillStyle = '#eddee4';
        context.fillRect(36, 252, 648, 12);
        context.fillStyle = display.color;
        context.fillRect(36, 252, 648 * display.ratio, 12);
      }
      context.font = '600 22px system-ui, sans-serif';
      context.fillStyle = display.color;
      context.fillText(`${display.percent} · ${display.remaining}`, display.style === 'ring' ? 104 : 36, display.style === 'ring' ? 272 : 305);
      context.fillStyle = '#76515f';
      context.font = '500 18px system-ui, sans-serif';
      context.fillText('Read-only floating view. Use the main tab to update progress.', 36, 367);
      session.stream?.getVideoTracks()[0]?.requestFrame?.();
    }

    function render() {
      if (!active || active.disposed || !tracker) return;
      const display = formatProgress(tracker);
      if (!display) { close(); return; }
      if (active.nodes) renderWindow(active, display);
      if (active.canvas) drawVideo(active, display);
    }

    function videoReady(session) {
      const video = session.video;
      if (video.readyState >= 1) return Promise.resolve();
      return new Promise((resolve, reject) => {
        let finished = false;
        const finish = error => {
          if (finished) return;
          finished = true;
          root.clearTimeout(timer);
          video.removeEventListener('loadedmetadata', ready);
          video.removeEventListener('error', failed);
          error ? reject(error) : resolve();
        };
        const ready = () => finish();
        const failed = () => finish(new Error('Video stream unavailable.'));
        const timer = root.setTimeout(failed, 2000);
        video.addEventListener('loadedmetadata', ready);
        video.addEventListener('error', failed);
        session.cleanup.push(() => finish(new Error('Floating view closed.')));
      });
    }

    async function openVideo(session) {
      session.canvas = document.createElement('canvas');
      session.canvas.width = 720;
      session.canvas.height = 405;
      if (!session.canvas.getContext('2d')) throw new Error('Canvas unavailable.');
      session.video = document.createElement('video');
      const video = session.video;
      video.muted = true;
      video.playsInline = true;
      video.tabIndex = -1;
      video.setAttribute('aria-hidden', 'true');
      video.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;pointer-events:none;';
      document.body.appendChild(video);
      session.stream = session.canvas.captureStream(1);
      if (!session.stream.getVideoTracks().length) throw new Error('Canvas stream unavailable.');
      video.srcObject = session.stream;
      render();
      // This stream is created on the user's click and never contains audio.
      const ready = videoReady(session);
      Promise.resolve(video.play()).catch(() => {});
      await ready;
      if (session.disposed) return;
      await video.requestPictureInPicture();
      if (session.disposed) {
        if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
        return;
      }
      listen(session, video, 'leavepictureinpicture', () => { if (active === session) close(); });
    }

    function isOpen() {
      if (!active || active.disposed) return false;
      return active.mode === 'video'
        ? document.pictureInPictureElement === active.video
        : Boolean(active.window && !active.window.closed);
    }

    function open(value) {
      if (!value?.id || !formatProgress(value)) {
        report('This tracker is no longer available.');
        return Promise.resolve(false);
      }
      if (isOpen()) {
        clearReward(active);
        tracker = value;
        render();
        active.window?.focus();
        return Promise.resolve(true);
      }
      if (pending) { tracker = value; return pending; }
      if (root?.navigator?.userActivation && !root.navigator.userActivation.isActive) {
        report('Click Float to open the progress window.');
        return Promise.resolve(false);
      }
      const mode = nextMode();
      if (!mode) { report('Floating windows are unavailable in this browser.'); return Promise.resolve(false); }
      dispose(active);
      tracker = value;
      const requestGeneration = ++generation;
      const session = { mode, cleanup: [], saving: false, disposed: false };
      active = session;
      listen(session, root, 'pagehide', () => {
        if (session.nodes) {
          session.nodes.increment.disabled = true;
          session.nodes.back.disabled = true;
          session.nodes.notice.textContent = 'Main tab closed. Updates are unavailable.';
        }
        close();
      }, { once: true });
      // Start the native request synchronously, while the click still owns activation.
      let request;
      try {
        if (mode === 'document') request = root.documentPictureInPicture.requestWindow({ width: 360, height: 330 });
        else if (mode === 'video') request = openVideo(session);
        else {
          const child = root.open('', '_blank', 'popup,width=360,height=380');
          if (!child) throw new Error('Popup blocked.');
          request = child;
        }
      } catch (error) { request = Promise.reject(error); }
      const opening = Promise.resolve(request).then(child => {
        if (requestGeneration !== generation || session.disposed) {
          if (child && !child.closed) child.close();
          return false;
        }
        if (mode !== 'video') makeWindow(session, child);
        return true;
      }).catch(() => {
        if (requestGeneration !== generation) return false;
        dispose(session);
        if (mode === 'popup') report('The popup was blocked. Allow popups for this site and click Float again.');
        else {
          failedModes.add(mode);
          report(`The floating view could not open. Click Float again to try ${nextMode() === 'video' ? 'the read-only floating view' : 'a standard window (not always on top)'}.`);
        }
        return false;
      }).finally(() => { if (pending === opening) pending = null; });
      pending = opening;
      return opening;
    }

    function update(value, options = {}) {
      if (!value) { close(); return; }
      if (tracker && value.id !== tracker.id) return;
      const changed = tracker && (value.current !== tracker.current || value.revision > tracker.revision);
      if (changed) clearReward(active);
      if (active?.nodes && changed) {
        active.nodes.error.textContent = '';
      }
      tracker = value;
      busy = Boolean(options.busy);
      render();
      if (options.reward) showReward(active, options.reward);
    }

    return { open, update, close, isOpen, modeLabel: () => LABELS[active?.mode || nextMode()] || 'Unavailable', supported: () => Boolean(nextMode()) };
  }

  return { create, formatProgress };
});
