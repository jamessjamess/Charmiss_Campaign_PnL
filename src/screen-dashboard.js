/* screen-dashboard.js — Dashboard: the banner, the four tabs (CR-10 §2 · D90 — Overview · P&L · Sales · Expenses · the tab bar sticks under the top bar, D98) and the toolbar they share.
   → CP.screens.dashboard · CP.dash · #dashboard/overview (screen-overview.js) · #dashboard/sales (screen-sales.js) · #dashboard/expenses (screen-expenses-tab.js — was budget) ·
   #dashboard/pnl (screen-pnl.js) · the old routes go to their new place: salesbudget → sales · spend / waterfall → pnl · operations / all → overview ·
   campaign/<id> → Campaign Monitor (#monitor/<id>) · the last tab remembered (a remembered "salesbudget" opens Sales).
   CR-08 §2 — no question line under the tabs · the toolbar in one line: Year · Status …… As of dd/mm/yyyy ⓘ · Export (D72 — the year bar is gone) ·
   the KPI cards of every tab share one anatomy (§2.3): value + suffix · a bar (+ the Time gone tick) · a caption of one line "% · what is left · the time". */
CP.screens = CP.screens || {};
CP.tabs = CP.tabs || {};

/* ===================== the shared toolbar + the shared KPI cards of Overview · Sales · Budget · P&L ===================== */
CP.dash = (function () {
  'use strict';
  const U = CP.ui, { C, R, esc, pref, ICON, labelInfo } = U, D = C.dash;
  const saved = pref.json('period', null) || {};
  const okSts = Array.isArray(saved.statuses) ? saved.statuses.filter(x => R.STATUSES.includes(x)) : null;
  const thisYear = () => +U.today().slice(0, 4);
  const st = { year: +saved.year || null, statuses: okSts && (okSts.length || saved.includeCancelled === true) ? okSts : R.STATUSES.slice(), includeCancelled: saved.includeCancelled === true };
  const save = () => pref.setJson('period', st);
  /* the years of the approved Campaigns (+ this year) · a remembered year no longer there → this year */
  const years = () => { const ys = new Set([thisYear()]); (U.seed().campaigns || []).forEach(c => { for (let y = +c.start.slice(0, 4); y <= +c.end.slice(0, 4); y++) ys.add(y); }); return [...ys].sort(); };
  const year = () => (st.year && years().includes(st.year) ? st.year : thisYear());
  const range = () => [`${year()}-01-01`, `${year()}-12-31`];
  const rng = () => { const [from, to] = range(); return { from, to, statuses: st.statuses.slice(), includeCancelled: st.includeCancelled, today: U.today(), year: year() }; };
  const STATUS_DOT = { ongoing: 'var(--g-prog)', not_started: 'var(--st-ns)', complete: 'var(--ok)', cancelled: 'var(--series-grey)' };
  const ALL4 = R.STATUSES.concat([R.CANCELLED]);
  /* D37 — the Status menu holds Cancelled (a line above it) · its words: All except cancelled · All · the names */
  const statusValue = () => st.statuses.concat(st.includeCancelled ? [R.CANCELLED] : []);
  function statusText(v) {
    const val = v || statusValue();
    if (val.length === ALL4.length) return D.statusAll;
    if (val.length === R.STATUSES.length && !val.includes(R.CANCELLED)) return D.statusExcept;
    return ALL4.filter(k => val.includes(k)).map(k => C.status[k]).join(', ');
  }
  /* Year · Status — p = the id prefix of the tab · after = draw the tab again (a change of the Year comes through the change listener below) */
  const after = {};
  function periodHTML(p, onStatus) {
    after[p] = onStatus;
    const [from, to] = range(), n = R.statusCounts(U.seed(), from, to, U.today());
    const opts = ALL4.map(k => ({ value: k, label: C.status[k], sub: String(n[k] || 0), dot: STATUS_DOT[k], sep: k === R.CANCELLED }));
    return `<label class="ms"><select class="ms-trigger sel yr" data-dyear="${p}" aria-label="${esc(D.yearL)}">${years().map(y => `<option value="${y}"${y === year() ? ' selected' : ''}>${y}</option>`).join('')}</select></label>` +
      U.multiSelect({ id: p + '_status', options: opts, value: statusValue(), label: D.statusBtn(statusText()), aria: D.statusL, searchable: false, defaultValue: R.STATUSES.slice(), min: 1, minTip: D.statusMin, fit: true,
        onChange: v => { st.statuses = R.STATUSES.filter(k => v.includes(k)); st.includeCancelled = v.includes(R.CANCELLED); save(); onStatus(); } });
  }
  document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('[data-dyear]'); if (!s) return; st.year = +s.value; save(); if (after[s.dataset.dyear]) after[s.dataset.dyear](); });
  /* kept for the screens that still ask (no presets any more) */
  const onPreset = () => false, onRange = () => false, onYear = () => false;
  const scopeText = () => String(year());
  const periodWords = () => D.yearWords(year());
  const statusWords = () => statusText();
  /* the year: its share gone · the days left (0 once it has ended · the whole year before it starts) */
  const yearGone = () => R.yearGone(year(), U.today());
  const yearDaysLeft = () => { const td = U.today(), [a, b] = range(); return td > b ? 0 : R.dayDiff(b, td < a ? R.addDays(a, -1) : td); };
  const sourceParts = () => [D.source.asOf(R.dmy(U.today())), D.source.gone(year(), R.pct(yearGone()))];
  const sourceHTML = () => `<span>${esc(sourceParts().join(' · '))}</span>`;
  /* CR-08 §2.2 — the toolbar in one line: Year · Status …… As of dd/mm/yyyy ⓘ · Export */
  function toolsHTML(p, onStatus) {
    const d = R.dmy(U.today());
    return periodHTML(p, onStatus) + `<span class="asof" data-asof>${esc(D.source.asOf(d))}${U.info(D.source.info(d, year(), R.pct(yearGone()), yearDaysLeft()))}</span>` +
      `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button>`;
  }

  /* ---------- CR-08 §2.3 — the KPI cards shared by the tabs (one anatomy: label ⓘ · value + suffix · bar + Time gone · caption of one line) ---------- */
  const K = () => C.yr.k;
  const daysWords = () => { const yg = yearGone(), n = yearDaysLeft(); return yg >= 1 ? K().yearOver : K().daysLeft(n); };
  /* Net revenue (Overview · Sales · P&L): Actual YTD of the full-year target · the bar = Ach % in the colour of the year's pace · the Time gone tick ·
     83% · ฿43.5M to go · 55 days left */
  function revenueKpi(k) {
    const A = k.pnl.actual, Pl = k.pnl.plan, yg = yearGone(), ach = R.ratio(A.rev, Pl.rev), s = R.salesStatus(R.paceOf(ach, yg), yg);
    const stc = s === 'behind' ? 'behind' : s === 'at_risk' ? 'at_risk' : 'on_target', left = (Pl.rev || 0) - (A.rev || 0);
    const cap = A.rev == null ? esc(D.k.noSales) : `<b class="attx ${stc}">${esc(R.pct(ach))}</b> · ${esc(left >= -0.5 ? K().toGo(R.shortBaht(left)) : K().above(R.shortBaht(-left)))} · ${esc(daysWords())}`;
    return U.kpiCard({ key: 'revenue', label: labelInfo(K().revenue, K().revenueTip), value: A.rev == null ? C.common.none : R.baht(A.rev), none: A.rev == null, suffix: K().ofTarget(R.shortBaht(Pl.rev)),
      bar: U.barSeg(Math.min(1, ach || 0) * 100, stc), tg: yg, barTip: K().achTip(R.pct(ach), R.pct(yg)), cap });
  }
  /* Budget used (Overview · Budget): Spent YTD of the full-year budget · the Time gone tick · 83% used · ฿8.4M left */
  function budgetKpi(k) {
    const A = k.pnl.actual, Pl = k.pnl.plan, yg = yearGone(), used = R.ratio(A.spend, Pl.spend), left = (Pl.spend || 0) - (A.spend || 0), bad = used > yg + 0.2 || used > 1;
    const cap = A.spend == null ? esc(D.k.noSpend) : `<b class="${bad ? 'bad' : ''}">${esc(K().used(R.pct(used)))}</b> · ${left < -0.5 ? `<b class="bad">${esc(K().over(R.shortBaht(-left)))}</b>` : esc(K().left(R.shortBaht(left)))}`;
    return U.kpiCard({ key: 'budget', label: labelInfo(K().budget, K().budgetTip), value: A.spend == null ? C.common.none : R.baht(A.spend), none: A.spend == null, suffix: K().ofBudget(R.shortBaht(Pl.spend)),
      bar: U.barSeg(Math.min(1, used || 0) * 100, used > 1 ? 'over' : 'ok'), tg: yg, barTip: K().usedTip(R.pct(used), R.pct(yg)), cap });
  }
  /* Campaign profit (Overview · P&L): Actual YTD of the full-year plan · the bar = % of the plan · Margin 49% · ROI 2.7× */
  function profitKpi(k) {
    const A = k.pnl.actual, Pl = k.pnl.plan, of = R.ratio(A.profit, Pl.profit);
    return U.kpiCard({ key: 'profit', label: labelInfo(K().profit, C.money.profit), value: A.profit == null ? C.common.none : R.baht(A.profit), none: A.profit == null, neg: A.profit < 0, suffix: K().planFull(R.shortBaht(Pl.profit)),
      bar: U.barSeg(Math.min(1, Math.abs(of || 0)) * 100, A.profit < 0 ? 'neg' : 'ok'), barTip: K().profitTip(R.pct(of)), cap: esc(K().profitCap(R.pct(A.margin), R.times(A.roi))) });
  }

  /* the first rows of every exported file */
  function metaRows(extra) {
    const now = new Date();
    return (extra || []).concat([[D.meta.source, sourceParts().join(' · ')], [D.meta.at, `${R.dmy(U.today())} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`]]);
  }
  /* §7.3 — "Show target" of a tab (this visit only: a new visit sees the folded cards) */
  const showTarget = new Set();
  /* the one band on top of a tab with no Sales actual (none when it has some) · its Show target / Hide target */
  const noSalesHTML = (tab, none, words) => (none ? U.noSalesBand(showTarget.has(tab), words) : '');
  function onShowTarget(e, tab, after) { const b = e.target.closest('[data-showtarget]'); if (!b) return false; if (b.dataset.showtarget === '1') showTarget.add(tab); else showTarget.delete(tab); after(); return true; }
  return { st, save, range, rng, year, years, yearGone, yearDaysLeft, periodHTML, toolsHTML, onPreset, onRange, onYear, scopeText, periodWords, statusWords, statusText, sourceHTML, sourceParts, metaRows,
    showTarget, noSalesHTML, onShowTarget, revenueKpi, budgetKpi, profitKpi };
})();

/* ===================== the host: banner · tabs ===================== */
CP.screens.dashboard = (function () {
  'use strict';
  const U = CP.ui, { C, $, esc, pref } = U, D = C.dash;
  /* CR-10 §2.1 (D90 · D91) — Overview · P&L · Sales · Expenses · the old tabs go to their new place (budget → expenses · salesbudget → sales) */
  const TABS = ['overview', 'pnl', 'sales', 'expenses'], ALIAS = { all: 'overview', operations: 'overview', ops: 'overview', waterfall: 'pnl', spend: 'pnl', salesbudget: 'sales', budget: 'expenses' };
  let sec = null, cur = null, stick = { toTop() {} };
  function build() {
    sec.innerHTML = `<div class="pbanner"><h1>${esc(D.title)}</h1></div>
      <div class="ptabs stickytabs" role="tablist" id="d_tabs">${TABS.map(t => `<a role="tab" href="#dashboard/${t}" data-tab="${t}" id="dtab_${t}" aria-controls="dt_${t}">${esc(D.tabs[t])}</a>`).join('')}</div>
      ${TABS.map(t => `<div class="dtab hidden" id="dt_${t}" role="tabpanel" aria-labelledby="dtab_${t}"></div>`).join('')}`;
    $('d_tabs').addEventListener('click', e => { const a = e.target.closest('[data-tab]'); if (!a) return; e.preventDefault(); stick.toTop(); go(a.dataset.tab); });
    /* CR-10 §2.2 (D98) — the tab bar (+ the toolbar from 1280 px) stays under the top bar · one row once stuck */
    stick = U.stickyTabs(sec, $('d_tabs'));
    sec.dataset.built = '1';
  }
  const prefTab = () => { const v = pref.get('dashtab', 'overview'), t = ALIAS[v] || v; return TABS.includes(t) ? t : 'overview'; };
  /* sub = 'overview' | 'sales' | 'budget' | 'pnl' | an old tab | 'campaign/<id>' | null (the last tab) */
  function render(sub) {
    sec = $('tab-dashboard'); if (!sec.dataset.built) build();
    const [t0, ...rest] = String(sub || '').split('/');
    /* By campaign moved to Campaign Monitor (D61) */
    if (t0 === 'campaign') { location.replace('#monitor' + (rest.length && rest[0] ? '/' + rest.join('/') : '')); return; }
    const t = ALIAS[t0] || t0, tab = TABS.includes(t) ? t : prefTab();
    cur = tab; pref.set('dashtab', tab);
    sec.querySelectorAll('#d_tabs [data-tab]').forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1; if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    TABS.forEach(x => $('dt_' + x).classList.toggle('hidden', x !== tab));
    const arg = rest.join('/') || null;
    const route = CP.tabs[tab].render($('dt_' + tab), arg) || tab;
    if (location.hash !== '#dashboard/' + route) history.replaceState(null, '', '#dashboard/' + route);
    document.title = `${D.tabs[tab]} · ${D.title} · ${C.app.title}`;
  }
  /* the tabs as a tablist: ← → move between them (KOL) */
  document.addEventListener('keydown', e => {
    const a = e.target.closest && e.target.closest('#d_tabs [data-tab]'); if (!a || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault(); const i = TABS.indexOf(a.dataset.tab), t = TABS[(i + (e.key === 'ArrowLeft' ? -1 : 1) + TABS.length) % TABS.length];
    go(t); setTimeout(() => { const n = $('dtab_' + t); if (n) n.focus(); }, 0);
  });
  /* a tab (By campaign: the Campaign last seen) */
  function go(tab, id) { if (tab === 'campaign') { location.hash = '#monitor' + (id ? '/' + id : ''); return; } location.hash = '#dashboard/' + (ALIAS[tab] || tab); }
  /* a Campaign of the Dashboard → Campaign Monitor (tab: summary · sales · budget · pnl · history) */
  const openCampaign = (id, tab) => { location.hash = `#monitor/${id}${tab ? '/' + tab : ''}`; };
  return { render, go, openCampaign, current: () => cur, TABS };
})();
