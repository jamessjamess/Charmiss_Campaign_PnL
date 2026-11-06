/* screen-overview.js — Dashboard › Overview (CR-08 §3 · CR-10 §3: All campaigns under the monthly chart · Expenses to watch · Where each ฿100 goes): how the year is going.
   → CP.tabs.overview · #dashboard/overview · the shared toolbar (Year · Status …… As of ⓘ · Export) ·
   Row 1 KPI: Net revenue · Budget used · Campaign profit · Campaigns (one anatomy, a caption of one line — §2.3) ·
   Row 2 Revenue vs target by month (Revenue · Spend · Profit · Monthly / Cumulative · Table) ·
   Row 3 Sales to watch | Budget to watch (R.issues — one row a Campaign, the two cards the same height) ·
   Row 4 Campaign timeline — one row = one bar (§7 · D78). Sales vs Time gone moved to the Sales tab (D74). A Campaign opens Campaign Monitor. */
CP.tabs.overview = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, segHTML } = U;
  const D = C.dash, MN = C.money, TAB = 'overview';
  const td = () => R.todayISO();
  const saved = pref.json('dash', {}) || {};
  const st = { m: Object.assign({ measure: 'revenue', mode: 'monthly', view: 'chart' }, saved.m || {}), tl: Object.assign({ view: 'chart', all: false, fold: [] }, saved.tl || {}) };
  if (!Array.isArray(st.tl.fold)) st.tl.fold = [];
  if (!['revenue', 'spend', 'profit'].includes(st.m.measure)) st.m.measure = 'revenue';
  const save = () => pref.setJson('dash', Object.assign(pref.json('dash', {}) || {}, { m: st.m, tl: { view: st.tl.view, all: st.tl.all, fold: st.tl.fold }, v2: 1 }));
  const rng = () => P.rng();
  /* the context every rule and export reads — the same as the screen */
  const ctx = () => Object.assign(rng(), { seed: U.seed(), m: st.m, tl: st.tl, sort: 'attention' });
  const noSales = () => !R.kpis(U.seed(), rng()).anySales;
  const showT = () => P.showTarget.has(TAB);

  let el = null;
  function render(root) { el = root; if (!el.dataset.built) build(); renderAll(); return TAB; }
  function build() {
    el.innerHTML = `<div class="toolbar" id="o_tools"></div><div class="kpis" id="o_kpis"></div><div class="card" id="o_pnl"></div>
      <div class="card" id="o_tl"></div><div class="r2 owatch" id="o_watch"><div class="card" id="o_ws"></div><div class="card" id="o_wb"></div></div><div class="card p100c" id="o_p100"></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr[data-mon]'); if (tr && e.target === tr) { e.preventDefault(); tr.click(); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (!el.offsetParent) return; renderPnl(); }, 120); };
    window.addEventListener('resize', redraw);
    document.addEventListener('cp:contentresize', redraw);
    el.dataset.built = '1';
  }
  function renderAll() {
    $('o_tools').innerHTML = P.toolsHTML('o', renderAll);
    const iss = R.issues(U.seed(), rng());
    renderKpis(iss); renderPnl(); renderTl(); renderWatch(iss); renderP100();
  }

  /* ---------- Row 1 — KPI: Net revenue · Budget used · Campaign profit (CP.dash — the same cards on Sales · Budget · P&L) · Campaigns ---------- */
  function renderKpis(iss) {
    const k = R.kpis(U.seed(), rng()), c = k.campaigns, K = C.yr.k, bs = U.barSeg;
    const sts = R.STATUSES.concat([R.CANCELLED]).filter(x => c.by[x]), n = iss.rows.length;
    const camps = U.kpiCard({ key: 'campaigns', label: labelInfo(K.campaigns, K.campaignsTip), value: String(c.n), suffix: K.inYear(P.year()), bar: sts.map(x => bs(c.by[x] / Math.max(1, c.n) * 100, x)).join(''),
      barTip: sts.map(x => `${c.by[x]} ${C.status[x]}`).join(' · '),
      cap: (sts.length ? esc(sts.map(x => K.by[x](c.by[x])).join(' · ')) + ' · ' : c.n ? '' : esc(D.noCampaign) + ' · ') +
        (n ? `<a class="link" href="#dashboard/overview" data-gowatch>${esc(K.toWatch(n))}</a>` : esc(K.noneWatch)) });
    $('o_kpis').innerHTML = P.revenueKpi(k) + P.budgetKpi(k) + P.profitKpi(k) + camps;
  }

  /* ---------- Row 2 — Revenue vs target by month (the one monthly chart · ~280 px so Row 3 shows on the first screen, §2.5) ---------- */
  const MEAS = ['revenue', 'spend', 'profit'], CH = 270;
  const chartOpts = ms => { const L = D.m.legend, T = D.m.tip;
    return ms === 'spend'
      ? { stack: [{ k: 'mkt', color: '--mkt', label: L.mkt }, { k: 'sls', color: '--sls', label: L.sls }, { k: 'oth', color: '--oth', label: L.oth }], good: 'down', planWord: L.budget, lflWord: T.budgetLfl, h: CH }
      : { color: '--rev', good: 'up', planWord: ms === 'profit' ? L.plan : L.target, lflWord: ms === 'profit' ? T.planLfl : T.targetLfl, h: CH,
        noPlanWhy: ms === 'profit' ? D.m.profitNull : '', estWhy: ms === 'profit' ? amt => C.cogsEst.note(R.baht(amt)) : null }; };
  function renderPnl() {
    const box = $('o_pnl'); if (!box) return;
    const M = D.m, s = st.m, table = s.view === 'table', md = R.byMonth(U.seed(), rng(), s.measure), o = Object.assign({ mode: s.mode }, chartOpts(s.measure));
    /* §7.3 — Revenue / Profit with no Sales actual: the card folds to one line */
    const fold = s.measure !== 'spend' && !md.toDate && noSales() && !showT() && !table;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(M.titles[s.measure], M.tip)}</h3><div class="ctl">${table || fold ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      segHTML('data-mmeasure', MEAS.map(v => ({ v, label: M.measures[v] })), s.measure, { label: M.measureL }) +
      segHTML('data-mmode', [{ v: 'monthly', label: M.monthly }, { v: 'cumulative', label: M.cumulative }], s.mode, { label: M.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="m" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      (fold ? U.foldedLine(M.noActual[s.measure]) : `<div class="sumline" id="m_sum">${sumHTML(md)}</div>` +
        (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('pnlmonth', ctx()), 'pnlmonth')}</div>` : `<div class="chartbox" id="m_box"><svg id="m_svg" role="img" aria-label="${esc(M.titles[s.measure])}"></svg><div class="tip" id="m_tip"></div></div>`));
    if (!table && !fold) U.monthChart($('m_svg'), $('m_box'), $('m_tip'), md, o);
  }
  /* To date ฿x of ฿y (z%) · Behind / Ahead (revenue, profit) · Over / Under (spend) — in the colour of what it means */
  function sumHTML(md) {
    const M = D.m, t = md.toDate, ms = md.measure, goal = ms === 'spend' ? M.legend.budget : ms === 'profit' ? M.legend.planProfit : M.legend.target;
    if (!t) return `<span class="noa">${esc(M.noActual[ms])}</span>` + (md.planTotal != null ? `<span class="noa">· ${esc(M.planOnly(goal, R.shortBaht(md.planTotal)))}</span>` : '');
    const gap = t.gap, tone = R.tone(gap, ms === 'spend' ? 'down' : 'up');
    const words = gap == null ? '' : Math.abs(gap) < 0.5 ? (ms === 'spend' ? M.onBudget : M.onTarget) : ms === 'spend' ? (gap > 0 ? M.over : M.under)(R.shortBaht(Math.abs(gap))) : (gap < 0 ? M.behind : M.ahead)(R.shortBaht(Math.abs(gap)));
    const full = `${MN.toDate}\n${M.toDate(R.baht(t.actual), R.baht(t.plan), R.pct(t.pct))}${gap == null ? '' : ` · ${words.split(' ')[0]} ${R.baht(Math.abs(gap))}`}\n${M.whole(goal, R.baht(md.planTotal))}`;
    return `<span class="tdl" tabindex="0" title="${esc(full)}">${esc(M.toDateL)}</span><span>${esc(M.toDate(R.shortBaht(t.actual), R.shortBaht(t.plan), R.pctA(t.pct, ms === 'spend')))}</span>` + (words ? `<span>·</span><b class="${tone}">${esc(words)}</b>` : '');
  }

  /* ---------- Row 3 — Sales to watch (left) | Budget to watch (right) · one row a Campaign · R.issues (CR-08 §3 — Sales first) ---------- */
  const SALES_KEYS = ['behind', 'at_risk'];
  /* the Used % · Remaining of a Budget row = the year of the Dashboard (R.budgetTrack of the scope — the same numbers as Budget › Budget by campaign · CR-08 TC09);
     the chips stay the rule of R.issues (the whole Campaign, as Campaign Monitor) */
  const yearBudget = () => new Map(R.budgetTrack(U.seed(), rng()).rows.map(t => [t.id, t]));
  function renderWatch(iss) {
    const W = C.yr.watch, chip = c => U.issueChip(c.key), yb = yearBudget();
    const sRows = iss.rows.filter(x => x.chips.some(c => SALES_KEYS.includes(c.key))), bRows = iss.rows.filter(x => x.chips.some(c => !SALES_KEYS.includes(c.key)));
    const row = (x, kind) => { const t = yb.get(x.id), b = t && t.current > 0 ? { used: t.used, remaining: t.remaining } : x.budget, s = x.sales, cs = x.chips.filter(c => (kind === 'sales') === SALES_KEYS.includes(c.key)), over = kind === 'budget' && b && b.remaining < -0.5;
      const detail = kind === 'budget' ? (over ? W.bOver(R.pct(b.used), R.signedShort(b.remaining)) : W.bLeft(R.pct(b && b.used), R.shortBaht(b ? b.remaining : null))) : W.sDetail(R.pct(s && s.ach), R.pct(s && s.timeGone));
      return `<button type="button" class="nar ${cs.some(c => c.sev === 'urgent') ? 'err' : 'warn'}" data-mon="${esc(x.id)}|${kind}" title="${esc(W.open(x.c.name))}"><span class="dot" aria-hidden="true"></span>` +
        `<span class="nab"><b>${esc(x.c.name)}</b><span class="chips">${cs.map(chip).join('')}</span></span><span class="nav${over ? ' bad' : ''}">${esc(detail)}</span><span class="nchev" aria-hidden="true">${ICON.chevron}</span></button>`; };
    const card = (k, list) => `<div class="card-head"><h3>${labelInfo(W[k].title, W[k].tip)} <span class="hnote">${list.length}</span></h3></div>` +
      (list.length ? `<div class="nalist">${list.map(x => row(x, k)).join('')}</div>` : `<div class="na-none small"><span class="okm" aria-hidden="true">✓</span> ${esc(W[k].none)}</div>`);
    $('o_ws').innerHTML = card('sales', sRows); $('o_wb').innerHTML = card('budget', bRows);
  }

  /* ---------- Row 4 — Campaign timeline (CR-08 §7 · D78): one row = one bar Start → End campaign · solid to today, faded after · colour = the sales status ---------- */
  function tlRows() {
    const seed = U.seed(), S = R.scope(seed, rng()), M = S.M, t = td(), L = D.tl;
    return S.ids.map(id => M.byId.get(id)).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.name.localeCompare(b.name, 'en'))).map(c => {
      const s = R.statusOf(c, t), x = R.campaignPace(seed, c.id, t), dl = R.daysLeft(c, t);
      let cls, sum, sumCls = 'none';
      if (s === R.CANCELLED) { cls = 'cancelled'; sum = L.cancelled; }
      else if (s === 'not_started') { cls = 'not_started'; sum = L.starts(dl.n); }
      /* ended: the bar dark grey (§7) · its summary keeps the colour of an At risk / Behind status (it is still in Sales to watch) */
      else if (s === 'complete') { cls = 'ended'; sum = x && x.ach != null ? L.ended(R.pct(x.ach)) : L.endedNo; if (x && (x.status === 'at_risk' || x.status === 'behind')) sumCls = x.status; }
      else { cls = x && x.status ? x.status : 'early'; sum = L.run(R.pct(x && x.ach), Math.max(0, dl.n || 0)); sumCls = cls; }
      const word = L.legend[cls] || C.status[s];
      const tip = [c.name, `${L.tip2.period} ${R.dmy(c.start)} – ${R.dmy(c.end)}`, c.end_marketing ? `${L.tip2.endMkt} ${R.dmy(c.end_marketing)}` : L.tip2.noEndMkt,
        `${L.tip2.status} ${word}${x && x.pace != null && x.status ? ' · ' + L.tip2.pace(R.paceText(x.pace)) : ''}`, x && x.timeGone != null ? `${L.tip2.gone(R.pct(x.timeGone))}${x.ach != null ? ' · Ach ' + R.pct(x.ach) : ''}` : ''].filter(Boolean).join('\n');
      return { id: c.id, name: c.name, start: c.start, end: c.end, endMkt: c.end_marketing || null, cls, cancelled: s === R.CANCELLED, sum, sumCls, tip, title: C.yr.watch.open(c.name),
        mktTip: `${L.tip2.endMkt} ${R.dmy(c.end_marketing)}`, aria: `${c.name} · ${word} · ${sum}`, pace: x };
    });
  }
  /* ---------- Row 3 — All campaigns (CR-10 §3.1 · D94): the timeline + Sales · Ach % · Expenses · Used % · Status, by state (On going · Not started · Ended) ----------
     Sales · Expenses · Used % = the year of the Dashboard (the same numbers as P&L by campaign and Budget by campaign — the total = the KPI) · Ach % = of the
     campaign's full target with the Time gone tick (Sales vs Time gone · the colour of the bar) · the chips = R.issues */
  const GROUPS = ['ongoing', 'not_started', 'complete', 'cancelled'];
  function allData() {
    const seed = U.seed(), o = rng(), t = td(), f = new Map(R.pnlForecast(seed, o).rows.map(r => [r.id, r])), bt = new Map(R.budgetTrack(seed, o).rows.map(x => [x.id, x])), iss = R.issues(seed, o).byId;
    const rows = tlRows().map(r => { const c = R.scope(seed, o).M.byId.get(r.id), p = f.get(r.id), b = bt.get(r.id), g = R.statusOf(c, t);
      return Object.assign(r, { grp: g, sales: p ? p.actual.rev : null, exp: p ? p.actual.spend : null, used: b && b.current > 0 ? b.used : null, budget: b ? b.current : null, chips: (iss.get(r.id) || { chips: [] }).chips }); });
    return { rows, k: R.kpis(seed, o).pnl };
  }
  function renderTl() {
    const box = $('o_tl'); if (!box) return;
    const L = D.tl, A = D.ac, s = st.tl, table = s.view === 'table', { rows, k } = allData(), [from, to] = P.range(), here = new Set(rows.map(r => r.cls)), fold = new Set(s.fold);
    const sw = (cls, t) => `<span><i class="tlb ${cls}"></i>${esc(t)}</span>`;
    const legend = ['on_track', 'at_risk', 'behind'].map(k2 => sw(k2 + ' past', L.legend[k2])).join('') + (here.has('early') ? sw('early past', L.legend.early) : '') +
      sw('ended', L.legend.ended) + sw('not_started', L.legend.not_started) + (here.has('cancelled') ? sw('cancelled', L.legend.cancelled) : '') + `<span><i class="tlm lg"></i>${esc(L.legend.endMkt)}</span>`;
    const sh = v => (v == null ? C.common.none : R.shortBaht(v));
    const cells = r => { const x = r.pace || {}, cl = r.cls === 'ended' ? (x.status === 'at_risk' || x.status === 'behind' ? x.status : 'ok') : r.cls;
      const acc = cl === 'behind' ? 'behind' : cl === 'at_risk' ? 'at_risk' : cl === 'on_track' ? 'on_target' : 'ok';
      return [{ html: esc(sh(r.sales)), cls: 'num', title: r.sales == null ? '' : R.baht(r.sales) },
        { html: x.ach == null ? U.none() : U.paceBar(x.ach, r.grp === 'ongoing' ? x.timeGone : null, acc, 44), title: x.ach == null ? '' : A.achTip(R.pct(x.ach), R.pct(x.timeGone)) },
        { html: esc(sh(r.exp)), cls: 'num', title: r.exp == null ? '' : R.baht(r.exp) },
        { html: r.used == null ? U.none() : U.pctBar(r.used, '', r.used > 1 ? 'over' : 'ok', 40), title: r.used == null ? '' : A.usedTip(R.pct(r.used), R.baht(r.exp), R.baht(r.budget)) },
        { html: r.chips.map(c => U.issueChip(c.key)).join(''), cls: 'chips' }]; };
    const sum = (list, key) => list.reduce((t, r) => (r[key] == null ? t : (t || 0) + r[key]), null);
    const out = [];
    GROUPS.forEach(g => { const list = rows.filter(r => r.grp === g); if (!list.length) return; const isF = fold.has(g);
      out.push({ head: A.groups[g], grp: g, n: list.length, folded: isF, foldAria: A.fold(A.groups[g]), cells: [{ html: `<b>${esc(sh(sum(list, 'sales')))}</b>`, cls: 'num' }, { html: '' }, { html: `<b>${esc(sh(sum(list, 'exp')))}</b>`, cls: 'num' }, { html: '' }, { html: '' }] });
      if (!isF) list.forEach(r => out.push(Object.assign({}, r, { cells: cells(r), tip: A.barTip(r.name, R.dmy(r.start), R.dmy(r.end), r.sum, r.endMkt ? R.dmy(r.endMkt) : '') }))); });
    const ach = R.ratio(k.actual.rev, k.plan.rev), used = R.ratio(k.actual.spend, k.plan.spend);
    out.push({ total: A.total, cells: [{ html: `<b>${esc(sh(k.actual.rev))}</b>`, cls: 'num', title: R.baht(k.actual.rev) }, { html: `<b>${esc(R.pct(ach))}</b>`, cls: 'num' }, { html: `<b>${esc(sh(k.actual.spend))}</b>`, cls: 'num', title: R.baht(k.actual.spend) },
      { html: `<b>${esc(R.pct(used))}</b>`, cls: 'num' }, { html: '' }] });
    const C2 = A.cols;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(A.title, A.tip)} <span class="hnote">${rows.length}</span></h3><div class="ctl"><div class="legend tl-leg">${legend}</div>` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="tl" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('o_all', ctx()), 'o_all')}</div>`
        : rows.length ? `<div class="tl-box" id="tl_box">${U.timelineLite(out, { from, to, months: R.monthsIn(from, to), today: td(), all: true, todayWord: D.m.today,
          cols: { campaign: C2.campaign, extra: [{ label: C2.sales, num: true }, { label: C2.ach }, { label: C2.exp, num: true }, { label: C2.used }, { label: C2.status }] } })}</div>`
          : `<div class="c3-empty">${esc(D.noCampaign)}</div>`);
  }
  /* ---------- Row 5 — Where each ฿100 of sales goes (CR-10 §3.2 · D95): the statement as ฿ of each ฿100 — Actual YTD · Plan (full) ---------- */
  const P100 = [['cogs', '--series-grey'], ['mkt', '--mkt'], ['sls', '--sls'], ['oth', '--oth'], ['profit', '--ok']];
  const p100Of = () => R.per100(R.statement(U.seed(), rng(), null, 'full'));
  function renderP100() {
    const box = $('o_p100'); if (!box) return;
    const T = D.p100, p = p100Of(), row = (side, label, faded) => ({ label, faded, parts: P100.map(([key, color]) => ({ key, label: T.parts[key], v: side[key], color, money: R.baht(side.money[key]) })) });
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3>${p.actual ? `<div class="ctl"><span class="p1right">${esc(T.right(Math.round(p.actual.profit), p.plan ? Math.round(p.plan.profit) : '—'))}</span></div>` : ''}</div>` +
      (p.actual ? U.spendPer100([row(p.actual, T.actual), p.plan ? row(p.plan, T.plan, true) : null].filter(Boolean)) : `<div class="foldl">${esc(T.none)}</div>`);
  }

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.overview}`], [D.meta.scope, P.periodWords()], [D.meta.status, P.statusWords()]]);
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-gowatch]')) { e.preventDefault(); $('o_watch').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const mo = t.closest('[data-mon]'); if (mo) { const [id, tab] = mo.dataset.mon.split('|'); CP.screens.dashboard.openCampaign(id, tab); return; }
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.overview, P.scopeText(), X.tabTables('overview', ctx()), meta()); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl] || D.tl.title, P.scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    const vw = t.closest('[data-view]');
    if (vw) { const o = st[vw.dataset.view]; o.view = o.view === 'table' ? 'chart' : 'table'; save(); (vw.dataset.view === 'm' ? renderPnl : renderTl)(); return; }
    const af = t.closest('[data-agfold]'); if (af) { const s = new Set(st.tl.fold), g = af.dataset.agfold; if (s.has(g)) s.delete(g); else s.add(g); st.tl.fold = [...s]; save(); renderTl(); const b = el.querySelector(`[data-agfold="${g}"]`); if (b) b.focus(); return; }
    const segB = t.closest('.seg[data-mmeasure] button, .seg[data-mmode] button');
    if (segB) {
      const sg = segB.closest('.seg'), v = segB.dataset.v;
      if (sg.hasAttribute('data-mmeasure')) st.m.measure = v; else st.m.mode = v;
      renderPnl(); save(); return;
    }
  }
  /* ---------- Export: KPI · by month · Watchlist · Campaign timeline ---------- */
  X.register('o_watch', x => { const iss = R.issues(x.seed, x), yb = new Map(R.budgetTrack(x.seed, x).rows.map(t => [t.id, t])), used = r => { const t = yb.get(r.id); return t && t.current > 0 ? t.used : r.budget ? r.budget.used : null; };
    return { key: 'o_watch', title: C.yr.file.watch, header: [C.yr.pace.cols.campaign, 'Severity', 'Problems', 'Used %', 'Ach %', C.yr.timeGone], cols: ['text', 'text', 'text', 'pct', 'pct', 'pct'],
      rows: iss.rows.map(r => [{ v: r.c.name, bold: true }, C.yr.sev[r.severity], r.chips.map(c => C.yr.st[c.key]).join(' · '), used(r), r.sales ? r.sales.ach : null, r.sales ? r.sales.timeGone : null]),
      notes: iss.rows.length ? [] : [C.yr.watch.budget.none] }; });
  /* CR-10 — All campaigns (full baht) · Where each ฿100 goes */
  X.register('o_all', () => { const A = D.ac, K = A.tcols, { rows, k } = allData();
    return { key: 'o_all', title: A.title, header: [K.campaign, K.group, K.start, K.end, K.sales, K.target, K.ach, K.time, K.exp, K.budget, K.used, K.status], cols: ['text', 'text', 'text', 'text', 'money', 'money', 'pct', 'pct', 'money', 'money', 'pct', 'text'],
      rows: GROUPS.flatMap(g => rows.filter(r => r.grp === g).map(r => { const x = r.pace || {}; return [{ v: r.name, bold: true }, A.groups[g], R.dmy(r.start), R.dmy(r.end), r.sales, x.target, x.ach, x.timeGone, r.exp, r.budget, r.used, r.chips.map(c => C.yr.st[c.key]).join(' · ')]; })),
      total: [A.total, '', '', '', k.actual.rev, k.plan.rev, R.ratio(k.actual.rev, k.plan.rev), null, k.actual.spend, k.plan.spend, R.ratio(k.actual.spend, k.plan.spend), ''] }; });
  X.register('o_p100', () => { const T = D.p100, p = p100Of(), keys = P100.map(x => x[0]);
    return { key: 'o_p100', title: T.title, header: ['', ...keys.map(k2 => T.parts[k2])], cols: ['text', 'num', 'num', 'num', 'num', 'num'],
      rows: [p.actual, p.plan].map((s, i) => [i ? T.plan : T.actual, ...keys.map(k2 => (s ? Math.round(s[k2] * 10) / 10 : null))]) }; });
  X.register('o_tl', () => { const L = D.tl, K = L.tcols;
    return { key: 'o_tl', title: L.title, header: [K.campaign, K.status, K.start, K.endMkt, K.end, K.target, K.actual, K.ach, K.time, K.summary], cols: ['text', 'text', 'text', 'text', 'text', 'money', 'money', 'pct', 'pct', 'text'],
      rows: tlRows().map(r => { const x = r.pace || {}; return [{ v: r.name, bold: true }, L.legend[r.cls] || '', R.dmy(r.start), r.endMkt ? R.dmy(r.endMkt) : '', R.dmy(r.end), x.target, x.actual, x.ach, x.timeGone, r.sum]; }) }; });
  return { render, tlRows };
})();
