(function attachCPNotebook(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CPNotebook = api.mount(root.document, root.fetch.bind(root));
})(typeof window !== 'undefined' ? window : null, function createCPNotebook() {
  const PAGE_SIZE = 18;
  const LABELS = { 'dynamic-programming': 'Dynamic programming', cpp: 'C++', 'binary-search-trees': 'Binary search trees', 'disjoint-set-union': 'Disjoint set union' };
  const NOTE_FIELDS = ['id', 'title', 'takeaway', 'details', 'tags', 'code', 'language', 'sourceUrl'];
  const SOURCE_HOSTS = new Set(['leetcode.com', 'www.leetcode.com', 'codeforces.com', 'www.codeforces.com', 'atcoder.jp', 'www.atcoder.jp', 'takeuforward.org', 'www.takeuforward.org', 'youtube.com', 'www.youtube.com', 'youtu.be', 'algo.monster']);

  function topicLabel(tag) {
    return LABELS[tag] || tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ');
  }

  function safeSource(value) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || !SOURCE_HOSTS.has(url.hostname) || url.username || url.password || url.port) return null;
      return url.href;
    } catch { return null; }
  }

  function validatePayload(payload) {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.notes) || payload.notes.length > 10000
        || Object.keys(payload).some(key => !['schemaVersion', 'generatedAt', 'notes'].includes(key))
        || typeof payload.generatedAt !== 'string' || !Number.isFinite(Date.parse(payload.generatedAt))) {
      throw new Error('Invalid notebook export.');
    }
    const ids = new Set();
    for (const note of payload.notes) {
      if (!note || Object.keys(note).length !== NOTE_FIELDS.length || Object.keys(note).some(key => !NOTE_FIELDS.includes(key))
          || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(note.id) || ids.has(note.id)
          || !['id', 'title', 'takeaway', 'details'].every(key => typeof note[key] === 'string')
          || !note.title.trim() || !note.takeaway.trim()
          || !Array.isArray(note.tags) || note.tags.some(tag => typeof tag !== 'string' || !/^[a-z][a-z-]*$/.test(tag) || tag === 'needs-review')
          || new Set(note.tags).size !== note.tags.length
          || !(note.code === null ? note.language === null : typeof note.code === 'string' && typeof note.language === 'string' && note.language.trim())
          || !(note.sourceUrl === null || safeSource(note.sourceUrl))) {
        throw new Error('Invalid notebook entry.');
      }
      ids.add(note.id);
    }
    return payload;
  }

  function filterNotes(notes, query = '', topic = 'all') {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return notes.filter(note => {
      if (topic !== 'all' && !note.tags.includes(topic)) return false;
      const haystack = [note.id, note.title, note.takeaway, note.details, note.code || '', ...note.tags.map(topicLabel), ...note.tags].join(' ').toLocaleLowerCase();
      return words.every(word => haystack.includes(word));
    });
  }

  function chooseNext(notes, previousId, random = Math.random) {
    if (!notes.length) return null;
    const alternatives = notes.filter(note => note.id !== previousId);
    const pool = alternatives.length ? alternatives : notes;
    return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
  }

  function mount(doc, fetchData) {
    const byId = id => doc.getElementById(id);
    if (!byId('tab-cp-notebook')) return { open() {} };
    const search = byId('cpSearch');
    const topic = byId('cpTopic');
    const grid = byId('cpGrid');
    let notes = [];
    let visible = PAGE_SIZE;
    let loaded = false;
    let loading = false;
    let featuredId = null;

    function element(tag, className, text) {
      const el = doc.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    }

    function matching() { return filterNotes(notes, search.value, topic.value); }

    function showFeatured(rotate = false) {
      const pool = matching();
      const previous = pool.find(note => note.id === featuredId);
      const note = !rotate && previous ? previous : chooseNext(pool, featuredId);
      byId('cpFeatured').hidden = !note;
      if (!note) { featuredId = null; return; }
      featuredId = note.id;
      byId('cpFeatured').dataset.noteId = note.id;
      byId('cpFeaturedTitle').textContent = note.title;
      byId('cpFeaturedText').textContent = note.takeaway;
      byId('cpFeaturedMeta').textContent = `${note.id} · ${note.tags.map(topicLabel).join(' / ') || 'Notebook idea'}`;
      byId('cpTurnPage').disabled = pool.length < 2;
    }

    function card(note) {
      const el = element('article', 'cp-card');
      el.id = `cp-idea-${note.id}`;
      el.dataset.noteId = note.id;
      // A stable paper colour, unaffected by filtering, import order or wording edits.
      const color = [...note.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
      el.dataset.paper = ['pink', 'butter', 'lilac'][color];
      el.append(element('p', 'cp-card-number', `Idea ${note.id}`));
      const title = element('h4', 'cp-card-title', note.title);
      title.id = `cp-title-${note.id}`;
      title.tabIndex = -1;
      el.setAttribute('aria-labelledby', title.id);
      el.append(title, element('p', 'cp-card-takeaway', note.takeaway));
      const tags = element('div', 'cp-tags');
      for (const tag of note.tags) tags.append(element('span', 'cp-tag', topicLabel(tag)));
      el.append(tags);
      const source = safeSource(note.sourceUrl);
      if (note.details || note.code || source) {
        const disclosure = element('details', 'cp-card-details');
        const summary = element('summary', '', note.code ? 'Read idea + example' : 'Read the idea');
        summary.setAttribute('aria-label', `Read ${note.title}`);
        disclosure.append(summary);
        if (note.details) disclosure.append(element('p', 'cp-detail-text', note.details));
        if (note.code) {
          disclosure.append(element('p', 'cp-code-label', note.language === 'text' ? 'Worked example' : `${note.language} example`));
          const pre = element('pre', 'cp-code');
          pre.tabIndex = 0;
          pre.setAttribute('aria-label', `Code example for ${note.title}`);
          pre.append(element('code', '', note.code));
          disclosure.append(pre);
        }
        if (source) {
          const link = element('a', 'cp-source', 'Open learning source ↗');
          link.href = source;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.referrerPolicy = 'no-referrer';
          disclosure.append(link);
        }
        el.append(disclosure);
      }
      return el;
    }

    function render() {
      const filtered = matching();
      const expanded = new Set([...grid.querySelectorAll('details[open]')].map(el => el.parentElement.dataset.noteId));
      const fragment = doc.createDocumentFragment();
      for (const note of filtered.slice(0, visible)) {
        const el = card(note);
        if (expanded.has(note.id) && el.querySelector('details')) el.querySelector('details').open = true;
        fragment.append(el);
      }
      grid.replaceChildren(fragment);
      byId('cpTotal').textContent = String(notes.length);
      byId('cpResults').textContent = `${filtered.length} ${filtered.length === 1 ? 'idea' : 'ideas'}${topic.value !== 'all' ? ` in ${topicLabel(topic.value)}` : ''} · showing ${Math.min(visible, filtered.length)} of ${notes.length}`;
      byId('cpEmpty').hidden = filtered.length > 0 || !loaded;
      byId('cpEmptyText').textContent = notes.length
        ? 'Try a different phrase or clear your filters to turn a new page.'
        : 'Your collection is empty. Import ideas from the master notebook, then refresh here.';
      byId('cpLoadMore').hidden = filtered.length <= visible;
      byId('cpLoadMore').textContent = `More ideas (${Math.min(PAGE_SIZE, Math.max(0, filtered.length - visible))}) ↓`;
      byId('cpClear').disabled = !search.value && topic.value === 'all';
      showFeatured();
    }

    function updateTopics() {
      const selected = topic.value;
      const counts = new Map();
      for (const note of notes) for (const tag of note.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
      const options = [element('option', '', `All topics (${counts.size})`)];
      options[0].value = 'all';
      for (const [tag, count] of [...counts].sort(([a], [b]) => topicLabel(a).localeCompare(topicLabel(b)))) {
        const option = element('option', '', `${topicLabel(tag)} (${count})`);
        option.value = tag;
        options.push(option);
      }
      topic.replaceChildren(...options);
      topic.value = counts.has(selected) ? selected : 'all';
    }

    async function load() {
      if (loading) return;
      loading = true;
      byId('cpRefresh').disabled = true;
      byId('cpRefresh').textContent = 'Checking collection…';
      grid.setAttribute('aria-busy', 'true');
      byId('cpError').hidden = true;
      if (!loaded) byId('cpResults').textContent = 'Opening your notebook…';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetchData('/cp-notes.json', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Notebook unavailable.');
        const payload = validatePayload(await response.json());
        notes = payload.notes;
        loaded = true;
        updateTopics();
        byId('cpImportStatus').textContent = `Imported ${new Date(payload.generatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · Read-only collection`;
        render();
      } catch {
        byId('cpError').textContent = loaded
          ? 'Could not refresh. You’re still seeing the last collection loaded in this tab. Try again when you’re connected.'
          : 'Could not load the notebook. Check your connection, or import the collection if this is a new setup, then try Refresh collection.';
        byId('cpError').hidden = false;
        if (!loaded) byId('cpResults').textContent = 'Notebook unavailable';
      } finally {
        clearTimeout(timeout);
        loading = false;
        byId('cpRefresh').disabled = false;
        byId('cpRefresh').textContent = 'Refresh collection ↻';
        grid.setAttribute('aria-busy', 'false');
      }
    }

    function filtersChanged() { visible = PAGE_SIZE; render(); }
    search.addEventListener('input', filtersChanged);
    topic.addEventListener('change', filtersChanged);
    byId('cpClear').addEventListener('click', () => {
      search.value = '';
      topic.value = 'all';
      filtersChanged();
      search.focus();
    });
    byId('cpLoadMore').addEventListener('click', () => {
      const nextId = matching()[visible]?.id;
      visible += PAGE_SIZE;
      render();
      if (nextId) byId(`cp-title-${nextId}`)?.focus();
    });
    byId('cpTurnPage').addEventListener('click', () => showFeatured(true));
    byId('cpReadFeatured').addEventListener('click', () => {
      const position = matching().findIndex(note => note.id === featuredId);
      if (position < 0) return;
      visible = Math.max(visible, position + 1);
      render();
      const el = byId(`cp-idea-${featuredId}`);
      if (el.querySelector('details')) el.querySelector('details').open = true;
      byId(`cp-title-${featuredId}`).focus();
      el.scrollIntoView({ block: 'start' });
    });
    byId('cpRefresh').addEventListener('click', load);
    return { open: load };
  }

  return { topicLabel, filterNotes, chooseNext, safeSource, validatePayload, mount };
});
