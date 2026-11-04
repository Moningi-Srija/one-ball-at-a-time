const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const now = new Date(2026, 10, 4, 12).getTime();

// Exercise the browser's own functions without running unrelated app startup.
function functionSource(name) {
  const match = app.match(new RegExp(`^function ${name}\\([^\\n]*`, 'm'));
  assert.ok(match, `Missing browser function: ${name}`);
  if (match[0].endsWith('}')) return match[0];
  const end = app.indexOf('\n}', match.index);
  assert.ok(end > match.index, `Missing function end: ${name}`);
  return app.slice(match.index, end + 2);
}

function element() {
  return {
    children: [],
    style: {},
    dataset: {},
    classList: { toggle() {} },
    value: '',
    textContent: '',
    get options() { return this.children; },
    get innerHTML() { return this.markup || ''; },
    set innerHTML(value) { this.markup = value; this.children = []; },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute() {},
    addEventListener(type, handler) { this[type] = handler; },
  };
}

function setup(sessions = [], view = {}) {
  const nodes = new Map();
  const charts = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, Object.assign(element(), { id }));
      return nodes.get(id);
    },
    querySelectorAll() { return []; },
    createElement: element,
  };
  const context = vm.createContext({
    document,
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    },
    focusSessions: sessions,
    focusView: { period: 'week', offset: 0, category: 'all', ...view },
    focusTrendChart: null,
    focusCategoryChart: null,
    CATEGORIES: [
      { id: 'empire_building', label: 'Future Builder', icon: '👑', color: '#8c52d9' },
      { id: 'glow_up', label: 'Glow Up', icon: '💪', color: '#6bbf6b' },
    ],
    FOCUS_LEVELS: {},
    CHART_COLORS: {},
    UNIT_LABEL: { day: 'day', week: 'week', month: 'month' },
    baseChartOptions: options => options,
    Chart: class {
      constructor(canvas, config) { charts.set(canvas.id, config); }
      destroy() {}
    },
  });
  const names = [
    'startOfDay', 'addDays', 'localDateKey', 'mondayOf', 'getRange',
    'rangeLabel', 'rangeSubLabel', 'dateKeyToLocalDate', 'focusSessionDateKey',
    'focusPeriodRange', 'finishedFocusSessions', 'focusSessionsInPeriod',
    'focusPeriodCopy', 'focusDailySeries', 'focusSecondsForSaving',
    'formatFocusHuman', 'focusCategoryMeta', 'populateFocusCategorySelect',
    'focusClockTime', 'renderFocusSummary', 'renderFocusCharts',
    'renderFocusLog', 'renderFocusHistory',
  ];
  vm.runInContext(names.map(functionSource).join('\n'), context);
  return { context, nodes, charts };
}

function session(id, date = '2026-11-04', overrides = {}) {
  return {
    id,
    date,
    label: id,
    status: 'finished',
    category: 'empire_building',
    mode: 'stopwatch',
    elapsedSeconds: 600,
    startedAt: `${date}T10:00:00.000Z`,
    endedAt: `${date}T10:10:00.000Z`,
    ...overrides,
  };
}

function ids(entries) {
  return Array.from(entries, entry => entry.id);
}

function textTree(node) {
  return [node.textContent, ...node.children.map(textTree)].join(' ');
}

test('all, named and no-tag filters select only finished focus sessions', () => {
  const sessions = [
    session('study'),
    session('exercise', undefined, { category: 'glow_up' }),
    session('null-tag', undefined, { category: null }),
    session('empty-tag', undefined, { category: '' }),
    session('running', undefined, { status: 'running' }),
    session('paused', undefined, { status: 'paused' }),
    session('discarded', undefined, { status: 'discarded' }),
  ];
  const { context } = setup(sessions);
  assert.deepEqual(ids(context.focusSessionsInPeriod()), ['study', 'exercise', 'null-tag', 'empty-tag']);
  context.focusView.category = 'empire_building';
  assert.deepEqual(ids(context.focusSessionsInPeriod()), ['study']);
  // A stale caller cannot opt analytics out of the shared tag selection.
  assert.deepEqual(ids(context.focusSessionsInPeriod({ includeCategoryFilter: false })), ['study']);
  context.focusView.category = 'none';
  assert.deepEqual(ids(context.focusSessionsInPeriod()), ['null-tag', 'empty-tag']);
  context.focusView.category = 'missing-tag';
  assert.deepEqual(ids(context.focusSessionsInPeriod()), []);
  assert.deepEqual(sessions.map(item => item.id), [
    'study', 'exercise', 'null-tag', 'empty-tag', 'running', 'paused', 'discarded',
  ]);
});

test('tag filtering preserves inclusive start and exclusive end for each date period', () => {
  for (const [period, offset, before, first, last, after] of [
    ['day', 0, '2026-11-03', '2026-11-04', '2026-11-04', '2026-11-05'],
    ['week', 0, '2026-11-01', '2026-11-02', '2026-11-08', '2026-11-09'],
    ['month', 0, '2026-10-31', '2026-11-01', '2026-11-30', '2026-12-01'],
    ['week', -1, '2026-10-25', '2026-10-26', '2026-11-01', '2026-11-02'],
  ]) {
    const { context } = setup([
      session('before', before),
      session('first', first),
      session('last', last),
      session('after', after),
      session('other-tag', first, { category: 'glow_up' }),
      session('invalid-date', '2026-02-30'),
      session('unfinished', first, { status: 'running' }),
    ], { period, offset, category: 'empire_building' });
    assert.deepEqual(ids(context.focusSessionsInPeriod()), ['first', 'last'], `${period}, offset ${offset}`);
  }
});

test('all-time daily series retains the earliest finished date across tag selections', () => {
  const { context } = setup([
    session('unfinished-older', '2026-10-01', { status: 'running' }),
    session('other-older', '2026-10-31', { category: 'glow_up' }),
    session('study', '2026-11-02', { mode: 'countdown', plannedSeconds: 300, elapsedSeconds: 900 }),
    session('study-again', '2026-11-02', { elapsedSeconds: 120 }),
    session('untagged', '2026-11-04', { category: null, elapsedSeconds: 60 }),
  ], { period: 'all', category: 'empire_building' });
  const expectedDates = ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'];
  const study = context.focusDailySeries(context.focusSessionsInPeriod());
  assert.deepEqual(Array.from(study.dates, context.localDateKey), expectedDates);
  assert.deepEqual(Array.from(study.seconds), [0, 0, 420, 0, 0]);
  context.focusView.category = 'none';
  const untagged = context.focusDailySeries(context.focusSessionsInPeriod());
  assert.deepEqual(Array.from(untagged.dates, context.localDateKey), expectedDates);
  assert.deepEqual(Array.from(untagged.seconds), [0, 0, 0, 0, 60]);
  context.focusView.category = 'missing-tag';
  const empty = context.focusDailySeries(context.focusSessionsInPeriod());
  assert.deepEqual(Array.from(empty.dates, context.localDateKey), expectedDates);
  assert.deepEqual(Array.from(empty.seconds), [0, 0, 0, 0, 0]);
});

test('an empty all-time history shows today with zero focus time', () => {
  const { context } = setup([], { period: 'all', category: 'none' });
  const series = context.focusDailySeries(context.focusSessionsInPeriod());
  assert.deepEqual(Array.from(series.dates, context.localDateKey), ['2026-11-04']);
  assert.deepEqual(Array.from(series.seconds), [0]);
});

test('history renders matching summary, daily chart, category breakdown, and log', () => {
  const { context, nodes, charts } = setup([
    session('study-first', '2026-11-02', { elapsedSeconds: 600 }),
    session('study-second', '2026-11-04', { mode: 'countdown', plannedSeconds: 1200, elapsedSeconds: 1800 }),
    session('exercise-excluded', '2026-11-04', { category: 'glow_up', elapsedSeconds: 3600 }),
    session('untagged-excluded', '2026-11-04', { category: null, elapsedSeconds: 300 }),
    session('previous-week-excluded', '2026-11-01'),
  ], { category: 'empire_building' });
  const renderedEntries = [];
  for (const name of ['renderFocusSummary', 'renderFocusCharts', 'renderFocusLog']) {
    const render = context[name];
    context[name] = entries => { renderedEntries.push(entries); return render(entries); };
  }
  context.renderFocusHistory();
  assert.equal(renderedEntries[0], renderedEntries[1]);
  assert.equal(renderedEntries[0], renderedEntries[2]);
  const summaryValues = [...nodes.get('focusSummary').innerHTML.matchAll(/class="focus-summary-value">([^<]+)</g)]
    .map(match => match[1]);
  assert.deepEqual(summaryValues, ['30m', '2', '15m', '20m']);
  assert.match(nodes.get('focusSummary').innerHTML, /2 active days/);
  assert.deepEqual(Array.from(charts.get('focusTrendChart').data.datasets[0].data), [10, 0, 20, 0, 0, 0, 0]);
  assert.deepEqual(Array.from(charts.get('focusCategoryChart').data.labels), ['👑 Future Builder']);
  assert.deepEqual(Array.from(charts.get('focusCategoryChart').data.datasets[0].data), [30]);
  assert.equal(nodes.get('focusCategoryBreakdown').children.length, 1);
  assert.match(textTree(nodes.get('focusCategoryBreakdown')), /Future Builder.*30m/);
  assert.equal(nodes.get('focusLogCount').textContent, '2 saved sessions');
  assert.match(textTree(nodes.get('focusLog')), /study-second.*study-first/);
  assert.doesNotMatch(textTree(nodes.get('focusLog')), /excluded/);
  assert.equal(nodes.get('focusCategoryFilter').value, 'empire_building');

  context.focusView.category = 'missing-tag';
  context.renderFocusHistory();
  assert.deepEqual(Array.from(charts.get('focusTrendChart').data.datasets[0].data), [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(nodes.get('focusLogCount').textContent, '0 saved sessions');
  assert.match(textTree(nodes.get('focusLog')), /No sessions match this tag/);

  context.focusView.category = 'none';
  context.renderFocusHistory();
  assert.deepEqual(Array.from(charts.get('focusCategoryChart').data.labels), ['○ No tag']);
  assert.deepEqual(Array.from(charts.get('focusCategoryChart').data.datasets[0].data), [5]);
  assert.equal(nodes.get('focusLogCount').textContent, '1 saved session');
  assert.match(textTree(nodes.get('focusLog')), /untagged-excluded/);

  context.focusView.category = 'all';
  context.renderFocusHistory();
  assert.equal(nodes.get('focusLogCount').textContent, '4 saved sessions');
  assert.deepEqual(Array.from(charts.get('focusTrendChart').data.datasets[0].data), [10, 0, 85, 0, 0, 0, 0]);
});

test('changing the tag rerenders all focus history and keeps the chosen period', () => {
  const handlerSource = app.match(/document\.getElementById\('focusCategoryFilter'\)\.addEventListener\('change', event => \{[\s\S]*?\n\}\);/);
  assert.ok(handlerSource, 'Missing focus tag change listener');
  const { context, nodes } = setup([], { period: 'month', offset: -1 });
  const selections = [];
  context.renderFocusHistory = () => selections.push(context.focusView.category);
  context.renderFocusLog = () => assert.fail('Tag changes must refresh more than the log');
  vm.runInContext(handlerSource[0], context);
  for (const category of ['empire_building', 'none', 'all']) {
    nodes.get('focusCategoryFilter').change({ target: { value: category } });
  }
  assert.deepEqual(selections, ['empire_building', 'none', 'all']);
  assert.equal(context.focusView.period, 'month');
  assert.equal(context.focusView.offset, -1);
});

test('one shared tag selector precedes the focus summary, charts, and log', () => {
  const selector = html.indexOf('id="focusCategoryFilter"');
  assert.equal((html.match(/id="focusCategoryFilter"/g) || []).length, 1);
  assert.ok(selector > html.indexOf('id="focusHistoryTitle"'));
  for (const id of ['focusSummary', 'focusTrendChart', 'focusCategoryBreakdown', 'focusLogTitle']) {
    assert.ok(selector < html.indexOf(`id="${id}"`), `Tag selector should precede ${id}`);
  }
});
