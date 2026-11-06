/* screen-expenses-tab.js — Dashboard › Expenses (CR-10 D91 — was Budget, screen-budget.js · CR-08 §5 · D73): is the money in line with the time?
   → CP.tabs.expenses · #dashboard/expenses (the old #dashboard/budget opens here) · the shared toolbar (Year · Status …… As of ⓘ · Export) ·
   Row 1 KPI: Budget used (as Overview) · Remaining · To watch · Pending requests · Row 2 Budget vs Actual by month (Marketing · Sales · Other · the black tick = budget) ·
   Row 3 Budget by campaign (Current budget · Spent · Used % + Time gone · Remaining · Pending · Status — the worst first · a row opens Campaign Monitor › Budget) ·
   Row 4 Spend by group (donut Marketing · Sales · Other, 1/3) | Spend by line (2/3). */
CP.tabs.expenses = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, segHTML } = U;
  const D = C.dash, SB = C.sb, MN = C.money, TAB = 'expenses';
  const td = () => R.todayISO();
  const saved = pref.json('sb', {}) || {};
  const st = { bva: Object.assign({ mode: 'monthly', view: 'chart' }, saved.bva || {}), sl: Object.assign({ type: 'marketing', view: 'chart' }, saved.sl || {}), bOpen: Array.isArray(saved.bOpen) ? saved.bOpen : [], grpView: saved.grpView || 'chart' };
  const save = () => pref.setJson('sb', Object.assign(pref.json('sb', {}) || {}, st));
  const rng = () => P.rng();
  const ctx = () => Object.assign(rng(), { seed: U.seed(), sl: st.sl, bOpen: st.bOpen, ids: null, compact: true, m: { measure: 'spend', mode: st.bva.mode } });

  let el = null;
  function render(root) { el = root; if (!el.dataset.built) build(); renderAll(); return TAB; }
  function build() {
    el.innerHTML = `<div class="toolbar" id="b_tools"></div><div class="kpis" id="b_kpis"></div><div class="card" id="b_bva"></div><div class="card" id="b_bud"></div>
      <div class="r13"><div class="card" id="b_grp"></div><div class="card" id="b_sl"></div></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr[data-mon]'); if (tr && e.target === tr) { e.preventDefault(); tr.click(); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (el.offsetParent) renderBva(); }, 120); };
    window.addEventListener('resize', redraw);
    document.addEventListener('cp:contentresize', redraw);
    el.dataset.built = '1';
  }
  function renderAll() {
    $('b_tools').innerHTML = P.toolsHTML('b', renderAll);
    renderKpis(); renderBva(); renderBud(); renderGrp(); renderSl();
  }

  /* the requests waiting for a decision in scope: Σ amount (the months of the period) · how many · the oldest (days) */
  function pending() {
    const seed = U.seed(), Sc = R.scope(seed, rng()), ids = new Set(Sc.ids), inP = new Set(Sc.months), keys = new Set(); let amount = 0;
    (seed.pending || []).forEach(q => { if (!ids.has(q.campaign_id) || !inP.has(q.month)) return; amount += q.amount; keys.add(`${q.campaign_id}|${q.no}`); });
    let oldest = null;
    keys.forEach(k => { const [cid, no] = k.split('|'), p = (seed.plans || {})[cid], q = p && (p.requests || []).find(r => String(r.no) === no);
      if (q && q.at) { const age = Math.max(0, R.dayDiff(td(), q.at.slice(0, 10))); oldest = oldest == null ? age : Math.max(oldest, age); } });
    return { amount: keys.size ? amount : null, n: keys.size, oldest };
  }
  /* the budget problems of R.issues (the Budget to watch of Overview) */
  const BKEYS = ['over', 'near', 'ahead', 'ended_over'];
  function watchRows(iss) { return iss.rows.filter(x => x.chips.some(c => BKEYS.includes(c.key))); }

  /* ---------- Row 1 — KPI: Budget used · Remaining · To watch · Pending requests (§2.3) ---------- */
  function renderKpis() {
    const seed = U.seed(), k = R.kpis(seed, rng()), A = k.pnl.actual, Pl = k.pnl.plan, K = SB.bk, kc = U.kpiCard, bs = U.barSeg, iss = R.issues(seed, rng());
    /* Remaining — the full-year budget less the spent · its share left · the days left of the year */
    const left = Pl.spend == null ? null : Pl.spend - (A.spend || 0), lr = R.ratio(left, Pl.spend), days = P.yearGone() >= 1 ? C.yr.k.yearOver : C.yr.k.daysLeft(P.yearDaysLeft());
    const rem = kc({ key: 'remaining', label: labelInfo(K.remaining, K.remTip), value: left == null ? C.common.none : R.shortBaht(left), none: left == null, neg: left < -0.5, valueTip: left == null ? '' : R.baht(left), suffix: K.remOf(R.shortBaht(Pl.spend)),
      bar: bs(Math.max(0, Math.min(1, lr || 0)) * 100, left < -0.5 ? 'over' : 'ok'), barTip: `${R.baht(left)} · ${R.pct(lr, 1)}`,
      cap: left == null ? esc(D.k.noSpend) : left < -0.5 ? `<b class="bad">${esc(K.overCap(R.shortBaht(-left), days))}</b>` : `<b>${esc(K.remLeft(R.pct(lr)))}</b> · ${esc(days)}` });
    /* To watch — the campaigns with a budget problem: over · near · spending ahead · ended over */
    /* Ended over budget counts with Over (the money is over either way — §5: 2 over · 1 near · 1 spending ahead) */
    const wr = watchRows(iss), by = {}; wr.forEach(x => x.chips.filter(c => BKEYS.includes(c.key)).forEach(c => { const g = c.key === 'ended_over' ? 'over' : c.key; by[g] = (by[g] || 0) + 1; }));
    const Sc = R.scope(seed, rng()), live = Sc.ids.filter(id => R.statusOf(Sc.M.byId.get(id), td()) !== R.CANCELLED).length;
    const watch = kc({ key: 'towatch', label: labelInfo(K.watch, K.watchTip), value: String(wr.length), suffix: K.watchOf,
      bar: bs((by.over || 0) / Math.max(1, live) * 100, 'over') + bs(((by.near || 0) + (by.ahead || 0)) / Math.max(1, live) * 100, 'warnb'), barTip: `${wr.length} / ${live}`,
      cap: wr.length ? esc(['over', 'near', 'ahead'].filter(x => by[x]).map(x => K.by[x](by[x])).join(' · ')) : esc(K.watchNone) });
    /* Pending requests — what waits for a decision (not counted in the budget yet) */
    const pd = pending();
    const pend = kc({ key: 'pending', label: labelInfo(K.pend, K.pendTip), value: pd.amount == null ? C.common.none : R.signedShort(pd.amount), none: pd.amount == null, valueTip: pd.amount == null ? '' : R.baht(pd.amount),
      bar: pd.amount && left > 0 ? bs(Math.min(1, pd.amount / left) * 100, 'warnb') : '', barTip: pd.amount && left > 0 ? K.pendBar(R.pct(pd.amount / left), R.shortBaht(left)) : '',
      cap: pd.n ? `<a class="link" href="#planning/approvals" title="${esc(C.track.toApprovals)}">${esc(K.pendCap(pd.n, pd.oldest || 0))}</a>` : esc(K.pendNone) });
    $('b_kpis').innerHTML = P.budgetKpi(k) + rem + watch + pend;
  }

  /* ---------- Row 2 — Budget vs Actual by month (Marketing · Sales · Other · the black tick = budget) ---------- */
  function renderBva() {
    const box = $('b_bva'); if (!box) return;
    const B = C.wf.bva, M = D.m, s = st.bva, table = s.view === 'table', md = R.byMonth(U.seed(), rng(), 'spend');
    const o = { mode: s.mode, stack: [{ k: 'mkt', color: '--mkt', label: M.legend.mkt }, { k: 'sls', color: '--sls', label: M.legend.sls }, { k: 'oth', color: '--oth', label: M.legend.oth }], good: 'down', planWord: M.legend.budget, lflWord: M.tip.budgetLfl, h: 300 };
    const t = md.toDate, gap = t ? t.gap : null, words = gap == null ? '' : Math.abs(gap) < 0.5 ? M.onBudget : (gap > 0 ? M.over : M.under)(R.shortBaht(Math.abs(gap)));
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(B.title, B.tip)}</h3><div class="ctl">${table ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      segHTML('data-bvamode', [{ v: 'monthly', label: M.monthly }, { v: 'cumulative', label: M.cumulative }], s.mode, { label: M.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="bva" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      `<div class="sumline">${t ? `<span class="tdl" tabindex="0" title="${esc(MN.budgetTD.d)}">${esc(M.toDateL)}</span><span>${esc(M.toDate(R.shortBaht(t.actual), R.shortBaht(t.plan), R.pctA(t.pct, true)))}</span>${words ? `<span>·</span><b class="${R.tone(gap, 'down')}">${esc(words)}</b>` : ''}`
        : `<span class="noa">${esc(D.k.noSpend)}</span>`}</div>` +
      (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('w_month', ctx()), 'w_month')}</div>` : `<div class="chartbox" id="bva_box"><svg id="bva_svg" role="img" aria-label="${esc(B.title)}"></svg><div class="tip" id="bva_tip"></div></div>`);
    if (!table) U.monthChart($('bva_svg'), $('bva_box'), $('bva_tip'), md, o);
  }
  /* ---------- Row 3 — Budget by campaign (KOL · R.budgetTrack · the Status of R.issues · the worst first) ---------- */
  function renderBud() {
    const T = C.sb.bud;
    $('b_bud').innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><button type="button" class="btn small" data-dl="w_budget">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` + CP.pnl.budgetTableHTML(ctx());
  }
  /* ---------- Row 4 — Spend by group (donut Marketing · Sales · Other, 1/3 · §6.5) | Spend by line (2/3) ---------- */
  const grpSlices = () => { const A = R.kpis(U.seed(), rng()).pnl.actual, G = C.plan.grid.groups, tot = (A.mkt || 0) + (A.sls || 0) + (A.oth || 0);
    return { tot, slices: [['mkt', G.marketing, '--mkt'], ['sls', G.sales, '--sls'], ['oth', G.other, '--oth']].map(([k, l, c]) => ({ key: k, label: l, value: A[k] || 0, color: c,
      tip: C.sb.chmix.slice(l, R.baht(A[k] || 0), R.pct(tot ? (A[k] || 0) / tot : null, 1)) })).filter(x => x.value > 0).sort((a, b) => b.value - a.value) }; };
  function renderGrp() {
    const box = $('b_grp'), K = SB.grp, table = st.grpView === 'table', m = grpSlices();
    const head = `<div class="card-head"><h3>${labelInfo(K.title, K.tip)}</h3><div class="ctl"><button type="button" class="btn small${table ? ' on' : ''}" data-view="grpView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('b_group', ctx()), 'b_group')}</div>`; return; }
    if (!m.slices.length) { box.innerHTML = head + `<div class="c3-empty">${esc(D.k.noSpend)}</div>`; return; }
    box.innerHTML = head + `<div class="c3-body dbody">${U.donutHTML({ id: 'b_dn', label: K.title, slices: m.slices, total: m.tot, cols: [K.cols.group, K.cols.spent, K.cols.share] })}</div>`;
    U.drawDonut({ id: 'b_dn', slices: m.slices, total: m.tot, center: R.shortBaht(m.tot), size: 164 });
  }
  function renderSl() { $('b_sl').innerHTML = CP.pnl.spendLineHTML(ctx()); }

  /* ---------- Export: KPI · by month · Budget by campaign · Spend by group · Spend by line ---------- */
  X.register('b_kpi', x => { const k = R.kpis(x.seed, x), A = k.pnl.actual, Pl = k.pnl.plan, K = SB.bk, iss = R.issues(x.seed, x), wr = watchRows(iss), pd = pending(), left = Pl.spend == null ? null : Pl.spend - (A.spend || 0);
    return { key: 'b_kpi', title: D.file.b_kpi, header: ['Metric', 'Value', 'Of', '%', 'Note'], cols: ['text', 'money', 'money', 'pct', 'text'],
      rows: [[C.yr.k.budget, A.spend, Pl.spend, R.ratio(A.spend, Pl.spend), `${C.yr.timeGone} ${R.pct(R.yearGone(x.year, x.today))}`], [K.remaining, left, Pl.spend, R.ratio(left, Pl.spend), K.remTip.f],
        [`${K.watch} (${K.watchOf})`, { v: wr.length, fmt: 'num' }, null, null, wr.map(r => `${r.c.name}: ${r.chips.filter(c => BKEYS.includes(c.key)).map(c => C.yr.st[c.key]).join(' · ')}`).join(' | ')],
        [K.pend, pd.amount, null, null, pd.n ? K.pendCap(pd.n, pd.oldest || 0) : K.pendNone]] }; });
  X.register('b_group', () => { const K = SB.grp, m = grpSlices();
    return { key: 'b_group', title: K.title, header: [K.cols.group, K.cols.spent, K.cols.share], cols: ['text', 'money', 'pct'], rows: m.slices.map(s => [s.label, s.value, m.tot ? s.value / m.tot : null]), total: [C.common.total, m.tot || null, m.tot ? 1 : null] }; });

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.expenses}`], [D.meta.scope, P.periodWords()], [D.meta.status, P.statusWords()]]);
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.expenses, P.scopeText(), X.tabTables('expenses', ctx()), meta()); return; }
    const pn = CP.pnl.onClick(e, st); if (pn) { save(); if (pn === 'sl') renderSl(); else if (pn === 'b') renderBud(); return; }
    const bm = t.closest('.seg[data-bvamode] button'); if (bm) { st.bva.mode = bm.dataset.v === 'cumulative' ? 'cumulative' : 'monthly'; save(); renderBva(); return; }
    const mo = t.closest('tr[data-mon]'); if (mo && !t.closest('button, a')) { const [id, tab] = mo.dataset.mon.split('|'); CP.screens.dashboard.openCampaign(id, tab); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl] || dl.dataset.dl, P.scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    const vw = t.closest('[data-view]');
    if (vw) { const k = vw.dataset.view;
      if (k === 'bva') { st.bva.view = st.bva.view === 'table' ? 'chart' : 'table'; save(); renderBva(); return; }
      if (k === 'grpView') { st.grpView = st.grpView === 'table' ? 'chart' : 'table'; save(); renderGrp(); } }
  }
  return { render, pending, grpSlices };
})();
