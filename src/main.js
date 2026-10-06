import { importStatement } from './lib/importer.js';
import { enrich } from './lib/pipeline.js';
import { listMonths, summarize, trend, recurringCommitments, previousMonth, inMonth, daysInMonth } from './lib/analysis.js';
import { generateInsights, potential } from './lib/insights.js';
import { CATEGORIES, category } from './lib/categories.js';
import { load, save, addStatement, removeAccount, emptyState } from './lib/store.js';
import { czk, pct, monthLabel, monthShort, dateLabel } from './lib/format.js';
import { h, hideTooltip } from './ui/dom.js';
import { columnChart, lineChart } from './ui/charts.js';
import { img, hydrateImages } from './images.js';

const app = document.getElementById('app');
let state = load();
let txs = [];
let charts = [];
const view = { month: null, q: '', cat: '', type: '', account: '', showAll: false };

// ---------- data ----------
function recompute() {
  txs = enrich(state);
  const months = listMonths(txs);
  if (!months.includes(view.month)) view.month = months[0] || null;
}

function persist() {
  if (!save(state)) toast('Nepodařilo se uložit data do prohlížeče (plné úložiště?).');
}

async function importFiles(files) {
  const results = [];
  let newest = null;
  for (const file of files) {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const parsed = importStatement(buf, file.name);
      const added = addStatement(state, parsed);
      results.push(`${state.accounts[parsed.account.id].name}: +${added}`);
      for (const t of parsed.transactions) if (!newest || t.date > newest) newest = t.date;
    } catch (err) {
      results.push(`${file.name}: ${err.message}`);
    }
  }
  persist();
  recompute();
  if (newest) view.month = newest.slice(0, 7);
  render();
  toast(`Načteno – ${results.join(' · ')}`);
}

async function loadSamples() {
  const base = import.meta.env.BASE_URL;
  const names = ['bezny-ucet.csv', 'air-bank.csv', 'revolut.csv'];
  const files = await Promise.all(
    names.map(async (n) => new File([await (await fetch(`${base}samples/${n}`)).arrayBuffer()], n)),
  );
  await importFiles(files);
}

// ---------- utils ----------
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4500);
}

const accountName = (id) => state.accounts[id]?.name || 'Účet';
const picture = (name, cls = '', alt = '') => h('img', { src: img(name), class: cls, alt, loading: 'lazy' });

function delta(cur, prev, goodWhenUp) {
  if (prev === undefined || prev === null || !Number.isFinite(prev) || prev === 0) return h('div', { class: 'delta' }, ' ');
  const d = cur - prev;
  if (Math.abs(d) < 1) return h('div', { class: 'delta' }, 'stejně jako minulý měsíc');
  const up = d >= 0;
  const cls = up ? (goodWhenUp ? 'up-good' : 'up-bad') : goodWhenUp ? 'down-bad' : 'down-good';
  return h('div', { class: `delta ${cls}` }, `${up ? '▲' : '▼'} ${czk(Math.abs(d))} proti minulému měsíci`);
}

function categorySelect(value, onChange, { includeAll = false } = {}) {
  const sel = h('select', { onChange: (e) => onChange(e.target.value), 'aria-label': 'Kategorie' });
  if (includeAll) sel.append(h('option', { value: '' }, 'Všechny kategorie'));
  const groups = [
    ['Příjmy', 'income'],
    ['Výdaje', 'expense'],
    ['Ostatní', 'saving'],
    ['Ostatní', 'transfer'],
  ];
  const made = {};
  for (const [label, kind] of groups) {
    const og = made[label] || (made[label] = h('optgroup', { label }));
    for (const c of CATEGORIES.filter((x) => x.kind === kind)) og.append(h('option', { value: c.id }, `${c.emoji} ${c.label}`));
    sel.append(og);
  }
  sel.value = value;
  return sel;
}

// ---------- render ----------
function render() {
  hideTooltip();
  charts = [];
  if (!txs.length) renderWelcome();
  else renderDashboard();
  hydrateImages();
}

function renderWelcome() {
  const drop = h(
    'label',
    { class: 'dropzone' },
    h('input', { type: 'file', accept: '.csv,.txt,text/csv', multiple: true, hidden: true, onChange: (e) => importFiles([...e.target.files]) }),
    picture('empty'),
    h('div', {}, h('strong', {}, 'Přetáhni sem výpisy ze všech účtů'), h('span', { class: 'muted' }, 'CSV export z internetového bankovnictví. Klidně víc souborů najednou.')),
  );
  const feature = (icon, title, text) => h('div', { class: 'feature' }, picture(icon), h('h3', {}, title), h('p', {}, text));
  app.replaceChildren(
    h(
      'section',
      { class: 'welcome' },
      h(
        'div',
        {},
        h('h1', {}, 'Tvoje peníze, ', h('em', {}, 'konečně v klidu.')),
        h('p', { class: 'lead' }, 'Jednou měsíčně nahraj výpisy ze všech účtů. Kasička je sama rozřadí do kategorií, oddělí pravidelné platby od nepravidelných, shrne příjmy a výdaje a najde, kde ušetřit a jak víc vydělat.'),
        drop,
        h('div', { class: 'welcome-actions' }, h('button', { class: 'btn', onClick: loadSamples }, '✨ Vyzkoušet na ukázkových datech')),
        h('p', { class: 'banks' }, 'Funguje s CSV z České spořitelny, ČSOB, KB, Air Bank, Fio, Raiffeisenbank, mBank, Moneta, Revolut, Wise a dalších. Data zůstávají jen ve tvém prohlížeči.'),
      ),
      picture('hero', 'hero-img', 'Kasička s mincemi a rostoucí graf'),
    ),
    h(
      'section',
      { class: 'features' },
      feature('bills', 'Automatické kategorie', '30 kategorií a pravidla pro stovky českých obchodníků. Co opravíš, to si zapamatuje.'),
      feature('subscriptions', 'Pravidelné vs. nepravidelné', 'Pozná nájem, energie, předplatné i trvalé příkazy a ukáže, co tě stojí fixně.'),
      feature('coins', 'Kde ušetřit', 'Předplatné, rozvoz jídla, poplatky, drobné nákupy – s odhadem úspory za rok.'),
      feature('growth', 'Jak víc vydělat', 'Peníze ležící ladem, chybějící úroky, investování a další zdroje příjmů.'),
    ),
  );
}

function renderDashboard() {
  const month = view.month;
  const months = listMonths(txs);
  const s = summarize(txs, month);
  const prevM = previousMonth(month);
  const hasPrev = months.includes(prevM);
  const p = hasPrev ? summarize(txs, prevM) : null;
  const accountsInMonth = new Set(inMonth(txs, month).map((t) => t.accountId)).size;

  // toolbar
  const toolbar = h(
    'div',
    { class: 'toolbar' },
    h('h1', {}, monthLabel(month)),
    h(
      'div',
      { class: 'chips', role: 'group', 'aria-label': 'Měsíc' },
      months.map((m) => h('button', { class: 'chip', 'aria-pressed': String(m === month), onClick: () => selectMonth(m) }, monthShort(m))),
    ),
  );

  // summary
  const kpi = (label, color, value, d, extra) => h('div', { class: 'kpi', style: color ? { borderLeftColor: `var(${color})` } : {} }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), d, extra);
  const summaryCard = h(
    'section',
    { class: 'card summary' },
    picture('hero', 'summary-art'),
    h(
      'div',
      {},
      h('div', { class: 'kpis' },
        kpi('Příjmy', '--income', czk(s.income), delta(s.income, p?.income, true)),
        kpi('Výdaje', '--expense', czk(s.expenses), delta(s.expenses, p?.expenses, false)),
        kpi(s.net >= 0 ? 'Ušetřeno' : 'Schodek', null, czk(s.net), delta(s.net, p?.net, true)),
        kpi('Míra úspor', null, s.savingsRate === null ? '–' : pct(s.savingsRate), h('div', { class: 'delta' }, s.saved > 0 ? `z toho ${czk(s.saved)} do spoření a investic` : 'doporučeno 10–20 %')),
      ),
      h('p', { class: 'muted', style: { margin: '14px 0 0 4px', fontSize: '13px' } }, `${s.count} transakcí z ${accountsInMonth} ${accountsInMonth === 1 ? 'účtu' : 'účtů'} · převody mezi vlastními účty se nepočítají`),
    ),
  );

  app.replaceChildren(
    toolbar,
    summaryCard,
    h('div', { class: 'grid grid-3-2' }, categoriesCard(s), recurringCard(s, month)),
    insightsSection(month),
    h('div', { class: 'grid grid-2' }, trendCard(month), paceCard(month, s, hasPrev ? p : null)),
    ruleCard(s),
    transactionsCard(),
    accountsCard(),
  );
}

function selectMonth(m) {
  view.month = m;
  view.showAll = false;
  render();
}

function categoriesCard(s) {
  const max = s.byCategory[0]?.total || 1;
  const rows = s.byCategory.map((c) => {
    const cat = category(c.id);
    return h(
      'button',
      {
        class: 'hbar',
        title: `Zobrazit transakce: ${cat.label}`,
        onClick: () => {
          view.cat = c.id;
          view.type = '';
          refreshTransactions(true);
        },
      },
      h('span', { class: 'name' }, h('span', { 'aria-hidden': 'true' }, cat.emoji), cat.label),
      h('span', { class: 'track' }, h('span', { class: 'fill', style: { width: `${(c.total / max) * 100}%` } })),
      h('span', { class: 'val' }, czk(c.total), h('small', {}, `${pct(c.total / s.expenses)} · ${c.count}×`)),
    );
  });
  return h(
    'section',
    { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Kam jdou peníze'), h('p', {}, 'Výdaje podle kategorií. Klikni pro detail.'))),
    rows.length ? h('div', { class: 'hbars' }, rows) : h('p', { class: 'muted' }, 'Tento měsíc žádné výdaje.'),
  );
}

function recurringCard(s, month) {
  const commitments = recurringCommitments(txs, month);
  const total = s.expenses || 1;
  const irregularTop = inMonth(txs, month)
    .filter((t) => t.kind === 'expense' && !t.recurring)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);
  return h(
    'section',
    { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Pravidelné vs. nepravidelné'), h('p', {}, 'Fixní platby, se kterými počítáš každý měsíc, a zbytek.'))),
    h(
      'div',
      { class: 'split', role: 'img', 'aria-label': `Pravidelné ${czk(s.recurring)}, nepravidelné ${czk(s.irregular)}` },
      h('div', { style: { width: `${(s.recurring / total) * 100}%`, background: 'var(--recurring)' } }),
      h('div', { style: { width: `${(s.irregular / total) * 100}%`, background: 'var(--irregular)' } }),
    ),
    h(
      'div',
      { class: 'legend' },
      h('span', {}, h('i', { class: 'swatch', style: { background: 'var(--recurring)' } }), 'Pravidelné ', h('b', {}, czk(s.recurring)), ` (${pct(s.recurring / total)})`),
      h('span', {}, h('i', { class: 'swatch', style: { background: 'var(--irregular)' } }), 'Nepravidelné ', h('b', {}, czk(s.irregular)), ` (${pct(s.irregular / total)})`),
    ),
    h('h3', { style: { fontSize: '14px', marginTop: '18px' } }, `Pravidelné platby (${commitments.length})`),
    h(
      'ul',
      { class: 'list scroll-list' },
      commitments.map((c) =>
        h(
          'li',
          {},
          h('span', {}, `${category(c.category).emoji} ${c.label}`, h('div', { class: 'meta' }, c.inThisMonth ? `naposledy ${dateLabel(c.lastDate)}` : 'tento měsíc zatím nezaplaceno')),
          h('span', { class: 'num' }, czk(c.monthly), h('div', { class: 'meta' }, 'měsíčně')),
        ),
      ),
    ),
    irregularTop.length
      ? [
          h('h3', { style: { fontSize: '14px', marginTop: '18px' } }, 'Největší nepravidelné výdaje'),
          h('ul', { class: 'list' }, irregularTop.map((t) => h('li', {}, h('span', {}, `${category(t.category).emoji} ${t.counterparty || t.message}`, h('div', { class: 'meta' }, dateLabel(t.date))), h('span', { class: 'num' }, czk(-t.amount))))),
        ]
      : null,
  );
}

function insightsSection(month) {
  const list = generateInsights(txs, month, state.settings);
  const pot = potential(list);
  const TAG = { save: 'Ušetři', earn: 'Vydělej víc', warn: 'Pozor', good: 'Dobrá zpráva' };
  return h(
    'section',
    { style: { marginBottom: '16px' } },
    h(
      'div',
      { class: 'card potential' },
      picture('idea'),
      h('div', {}, h('div', { class: 'muted' }, 'Odhadem můžeš ročně ušetřit'), h('div', { class: 'big' }, czk(pot.save))),
      h('div', {}, h('div', { class: 'muted' }, 'a navíc vydělat'), h('div', { class: 'big' }, czk(pot.earn))),
    ),
    h(
      'div',
      { class: 'insights' },
      list.map((i) =>
        h(
          'article',
          { class: `insight ${i.type}` },
          picture(i.icon),
          h(
            'div',
            {},
            h('span', { class: 'tag' }, TAG[i.type]),
            h('h3', {}, i.title),
            h('p', {}, i.text),
            i.items ? h('ul', {}, i.items.map((x) => h('li', {}, x))) : null,
            i.impact ? h('div', { class: 'impact' }, `${i.type === 'earn' ? '+' : '≈'} ${czk(i.impact)} ročně`) : null,
          ),
        ),
      ),
    ),
  );
}

function trendCard(month) {
  const data = trend(txs, month, 12);
  const chart = columnChart(
    data.map((d) => ({ key: d.month, label: monthShort(d.month), title: monthLabel(d.month), values: [d.income, d.expenses] })),
    [
      { name: 'Příjmy', color: '--income' },
      { name: 'Výdaje', color: '--expense' },
    ],
    { onSelect: selectMonth, selected: month },
  );
  charts.push(chart);
  const avgNet = data.reduce((a, d) => a + d.net, 0) / data.length;
  return h(
    'section',
    { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Vývoj po měsících'), h('p', {}, `Průměrně ušetříš ${czk(avgNet)} měsíčně (${data.length} ${data.length === 1 ? 'měsíc' : data.length < 5 ? 'měsíce' : 'měsíců'}).`))),
    chart,
  );
}

function paceCard(month, s, p) {
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = today.startsWith(month) ? Number(today.slice(8, 10)) : daysInMonth(month);
  const cur = s.cumulative.map((v, i) => (i < lastDay ? v : null));
  const series = [{ name: monthLabel(month), color: '--expense', values: cur }];
  if (p) {
    const prev = new Array(Math.max(cur.length, p.cumulative.length)).fill(null).map((_, i) => p.cumulative[Math.min(i, p.cumulative.length - 1)]);
    series.push({ name: monthLabel(p.month), color: '--recurring', values: prev });
  }
  const chart = lineChart(series);
  charts.push(chart);
  return h(
    'section',
    { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Průběh měsíce'), h('p', {}, 'Kumulované výdaje den po dni' + (p ? ' proti minulému měsíci.' : '.')))),
    chart,
  );
}

function ruleCard(s) {
  if (s.income <= 0) return null;
  const rows = [
    ['Nutné výdaje', 'bydlení, jídlo, doprava…', s.groups.needs, 0.5, 'max'],
    ['Radosti', 'restaurace, nákupy, zábava…', s.groups.wants, 0.3, 'max'],
    ['Úspory', 'co zbylo + investice', s.groups.savings, 0.2, 'min'],
  ];
  return h(
    'section',
    { class: 'card', style: { marginBottom: '16px' } },
    h('div', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Pravidlo 50 / 30 / 20'), h('p', {}, 'Jak se tvůj příjem dělí mezi nutné výdaje, radosti a úspory. Svislá čárka = doporučení.'))),
    h(
      'div',
      { class: 'rule-rows' },
      rows.map(([label, hint, value, target, mode]) => {
        const share = value / s.income;
        const ok = mode === 'max' ? share <= target : share >= target;
        return h(
          'div',
          { class: 'rule-row' },
          h('div', {}, h('b', {}, label), h('div', { class: 'muted', style: { fontSize: '12px' } }, hint)),
          h('div', { class: 'rule-track' }, h('div', { class: 'rule-fill', style: { width: `${Math.min(100, share * 100)}%` } }), h('div', { class: 'rule-target', style: { left: `${target * 100}%` }, title: `Doporučeno ${mode === 'max' ? 'nejvýš' : 'aspoň'} ${pct(target)}` })),
          h('div', { class: 'verdict' }, h('b', { class: 'num' }, pct(share)), ' ', h('span', { style: { color: ok ? 'var(--good)' : 'var(--warn)' } }, ok ? '✓ v pořádku' : `cíl ${mode === 'max' ? '≤' : '≥'} ${pct(target)}`)),
        );
      }),
    ),
  );
}

// ---------- transakce ----------
let txContainer;
function transactionsCard() {
  txContainer = h('div');
  const search = h('input', { type: 'search', placeholder: 'Hledat obchodníka, zprávu, částku…', value: view.q, 'aria-label': 'Hledat',
    onInput: (e) => { view.q = e.target.value; refreshTransactions(); } });
  const catSel = categorySelect(view.cat, (v) => { view.cat = v; refreshTransactions(); }, { includeAll: true });
  const typeSel = h('select', { 'aria-label': 'Typ', onChange: (e) => { view.type = e.target.value; refreshTransactions(); } },
    [['', 'Vše'], ['expense', 'Výdaje'], ['income', 'Příjmy'], ['recurring', 'Pravidelné výdaje'], ['irregular', 'Nepravidelné výdaje'], ['transfer', 'Převody mezi účty']].map(([v, l]) => h('option', { value: v }, l)));
  typeSel.value = view.type;
  const accSel = h('select', { 'aria-label': 'Účet', onChange: (e) => { view.account = e.target.value; refreshTransactions(); } },
    h('option', { value: '' }, 'Všechny účty'), Object.values(state.accounts).map((a) => h('option', { value: a.id }, a.name)));
  accSel.value = view.account;
  const card = h(
    'section',
    { class: 'card', id: 'transactions', style: { marginBottom: '16px' } },
    h('div', { class: 'card-head' },
      h('div', {}, h('h2', {}, 'Transakce'), h('p', {}, 'Změň kategorii nebo pravidelnost – Kasička si to zapamatuje pro všechny platby od stejného obchodníka.')),
      h('button', { class: 'btn btn-sm', onClick: exportCsv }, '⬇ Export CSV')),
    h('div', { class: 'filters' }, search, catSel, typeSel, accSel),
    txContainer,
  );
  card._catSel = catSel;
  card._typeSel = typeSel;
  refreshTransactions();
  return card;
}

function filteredTransactions() {
  const q = view.q.trim().toLowerCase();
  return inMonth(txs, view.month).filter((t) => {
    if (view.cat && t.category !== view.cat) return false;
    if (view.account && t.accountId !== view.account) return false;
    if (view.type === 'expense' && !(t.kind === 'expense' || t.kind === 'saving')) return false;
    if (view.type === 'income' && t.kind !== 'income') return false;
    if (view.type === 'recurring' && !(t.recurring && t.amount < 0)) return false;
    if (view.type === 'irregular' && !(t.kind === 'expense' && !t.recurring)) return false;
    if (view.type === 'transfer' && t.kind !== 'transfer') return false;
    if (q && !`${t.counterparty} ${t.message} ${t.amount} ${category(t.category).label}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function refreshTransactions(scroll = false) {
  if (!txContainer) return;
  const card = txContainer.parentElement;
  if (card?._catSel) card._catSel.value = view.cat;
  if (card?._typeSel) card._typeSel.value = view.type;
  const list = filteredTransactions();
  const shown = view.showAll ? list : list.slice(0, 60);
  const total = list.reduce((a, t) => a + t.amount, 0);
  const rows = shown.map((t) =>
    h(
      'tr',
      {},
      h('td', { class: 'num', style: { whiteSpace: 'nowrap' } }, dateLabel(t.date)),
      h('td', {}, h('div', { class: 'who' }, t.counterparty || t.message || '—'), t.counterparty && t.message ? h('div', { class: 'msg', title: t.message }, t.message) : null),
      h('td', { class: 'muted', style: { whiteSpace: 'nowrap' } }, accountName(t.accountId)),
      h('td', {}, categorySelect(t.category, (v) => setCategory(t, v))),
      h('td', {}, t.amount < 0 && t.kind !== 'transfer'
        ? h('button', { class: `pill ${t.recurring ? 'on' : ''}`, title: 'Přepnout pravidelnost', onClick: () => toggleRecurring(t) }, t.recurring ? '🔁 Pravidelná' : 'Jednorázová')
        : t.kind === 'transfer' ? h('span', { class: 'pill transfer' }, 'převod') : null),
      h('td', { class: `amount ${t.amount > 0 ? 'pos' : ''}` }, `${t.amount > 0 ? '+' : ''}${czk(t.amount)}`),
    ),
  );
  txContainer.replaceChildren(
    h('div', { class: 'table-wrap' },
      h('table', { class: 'tx' },
        h('thead', {}, h('tr', {}, ['Datum', 'Protistrana', 'Účet', 'Kategorie', 'Typ', 'Částka'].map((x, i) => h('th', { style: i === 5 ? { textAlign: 'right' } : {} }, x)))),
        h('tbody', {}, rows))),
    h('p', { class: 'muted', style: { fontSize: '13px' } }, `${list.length} transakcí · součet ${czk(total)}`,
      view.cat || view.type || view.q || view.account ? [' · ', h('button', { class: 'btn btn-sm btn-ghost', onClick: () => { Object.assign(view, { cat: '', type: '', q: '', account: '' }); render(); } }, 'Zrušit filtry')] : null),
    list.length > shown.length ? h('div', { class: 'more' }, h('button', { class: 'btn', onClick: () => { view.showAll = true; refreshTransactions(); } }, `Zobrazit všech ${list.length}`)) : null,
  );
  if (scroll) document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setCategory(t, cat) {
  if (t.ruleKey) {
    state.userRules[t.ruleKey] = cat;
    for (const x of txs) if (x.ruleKey === t.ruleKey) delete state.overrides[x.id];
    const n = txs.filter((x) => x.ruleKey === t.ruleKey).length;
    toast(`${category(cat).emoji} ${category(cat).label} – nastaveno pro ${n} ${n === 1 ? 'platbu' : n < 5 ? 'platby' : 'plateb'} „${t.counterparty || t.message}“`);
  } else {
    state.overrides[t.id] = cat;
  }
  persist();
  recompute();
  render();
}

function toggleRecurring(t) {
  state.recurringRules[t.ruleKey] = !t.recurring;
  persist();
  recompute();
  render();
  toast(t.recurring ? 'Označeno jako jednorázové' : 'Označeno jako pravidelná platba');
}

function exportCsv() {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['Datum', 'Účet', 'Protistrana', 'Zpráva', 'Částka', 'Měna', 'Kategorie', 'Pravidelná'].join(';')];
  for (const t of [...txs].reverse()) {
    lines.push([t.date, accountName(t.accountId), t.counterparty, t.message, String(t.amount).replace('.', ','), t.currency, category(t.category).label, t.recurring ? 'ano' : 'ne'].map(esc).join(';'));
  }
  const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  h('a', { href: url, download: 'kasicka-transakce.csv' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- účty a nastavení ----------
function accountsCard() {
  const counts = {};
  for (const t of txs) counts[t.accountId] = (counts[t.accountId] || 0) + 1;
  const num = (key, label, step) =>
    h('label', {}, label, h('input', { type: 'number', step, min: 0, max: 30, value: state.settings[key],
      onChange: (e) => { state.settings[key] = Math.max(0, Number(e.target.value) || 0); persist(); render(); } }));
  return h(
    'section',
    { class: 'card', style: { marginBottom: '16px' } },
    h('div', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Účty a nastavení'), h('p', {}, 'Každý nahraný soubor = jeden účet. Opakované nahrání stejného výpisu nevytvoří duplicity.'))),
    h(
      'div',
      { class: 'accounts' },
      Object.values(state.accounts).map((a) =>
        h(
          'div',
          { class: 'account' },
          h('input', { value: a.name, 'aria-label': 'Název účtu', onChange: (e) => { state.accounts[a.id].name = e.target.value.trim() || a.name; persist(); render(); } }),
          h('span', { class: 'muted', style: { fontSize: '13px' } }, `${a.number || 'číslo účtu neuvedeno'} · ${counts[a.id] || 0} transakcí`),
          h('div', {}, h('button', { class: 'btn btn-sm btn-ghost', onClick: () => { if (confirm(`Smazat účet „${a.name}“ i s jeho transakcemi?`)) { removeAccount(state, a.id); persist(); recompute(); render(); } } }, '🗑 Odebrat')),
        ),
      ),
    ),
    h(
      'div',
      { class: 'settings', style: { marginTop: '18px' } },
      num('savingsRate', 'Úrok spořicího účtu (% p.a.)', 0.1),
      num('investReturn', 'Ilustrativní výnos investic (% p.a.)', 0.5),
      h('button', { class: 'btn btn-sm', onClick: () => { if (confirm('Opravdu smazat všechna data z prohlížeče?')) { state = emptyState(); persist(); recompute(); render(); } } }, 'Smazat všechna data'),
    ),
  );
}

// ---------- globální události ----------
document.getElementById('file-input').addEventListener('change', (e) => {
  importFiles([...e.target.files]);
  e.target.value = '';
});

const overlay = document.getElementById('drop-overlay');
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
  dragDepth++;
  overlay.hidden = false;
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) overlay.hidden = true;
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  overlay.hidden = true;
  const files = [...(e.dataTransfer?.files || [])];
  if (files.length) importFiles(files);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => charts.forEach((c) => c._redraw?.()), 120);
});

hydrateImages();
recompute();
render();
