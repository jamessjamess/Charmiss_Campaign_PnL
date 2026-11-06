/* screen-tracking.js — WORK › Campaign Tracking (CR-07 §5 · CR-09 §4 · CR-11 — was Campaign Monitor, screen-monitor.js): one approved Campaign, to dig in and follow.
   #tracking/<id>[/summary|pnl|sales|expenses|history] → CP.screens.tracking · #monitor/… and the tab budget go here · from the Dashboard (every row · Watch lists) ·
   Campaign Planning (an approved plan) · Ctrl+K.
   Toolbar (CR-11 §3): Year · Campaign (≥ 360 px · the list 520 px: name · dates · status + issue) · ‹ › (urgent → watch → the rest) …… Request budget · View plan · Export —
   no head card (D101): its words are the Campaign period of Summary · no Owner.
   Summary: Campaign period (Start → End marketing → End · Today · `91% of time gone · 24 days left`) · KPI Net revenue · Budget used · Campaign profit · Forecast end ·
   Burn-up (the Marketing period shaded · Time gone / Forecast in the legend) | What to do.
   P&L (D104): KPI Net revenue · Gross profit · Total expenses · Campaign profit · waterfall | statement · Where each ฿100 of sales goes · Cumulative profit by month
   (Break-even) · Sales vs Marketing by month.
   Sales (D80 · D82 · D83 · D102 · D103): Channel · ฿ | Qty · Target vs Actual by month (Total | By channel) · Sales mix by channel | Channel attainment ·
   SKU × Channel (Share % + Rank) · Sub-channel share (a 100% bar a channel) | SKU trend (Ach % a SKU a month).
   Expenses: the bar · Budget vs Actual by month | Spend by group · Budget by line (Marketing ▸ Sales ▸ Other) · the requests. History: the log (Compare v1 ↔ v2). */
CP.screens = CP.screens || {};
CP.screens.tracking = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, none, statusChip, segHTML } = U;
  const K = C.camp, D = C.dash, M0 = C.mon, TABS = ['summary', 'pnl', 'sales', 'expenses', 'history'], TAB = 'tracking';
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);
  const CHS = ['all'].concat(R.CHANNELS), CH_TOKEN = { MT: '--ch-mt', TT: '--ch-tt', ECOM: '--ch-ecom' };
  const saved = pref.json('mon', {}) || {};
  const st = Object.assign({ cid: '', tab: 'summary', year: null, channel: 'all', unit: 'amount', mode: 'monthly', mView: 'chart', mBy: 'total', chFolded: R.CHANNELS.slice(), chView: 'list',
    mxSeg: 'actual', mxSort: 'actual', mxTab: 'all', mxView: 'list', mxSku: '', bgOpen: [], stOpen: [], sl: { type: 'marketing', view: 'chart' }, side: 'actual', bva: 'monthly', cumView: 'chart' }, saved);
  /* CR-11 §2 — a remembered "budget" tab is Expenses */
  if (st.tab === 'budget') st.tab = 'expenses';
  st.mxTab = oneOf(st.mxTab === 'on_target' ? 'on_track' : st.mxTab, ['all', 'behind', 'at_risk', 'on_track'], 'all');
  st.mxSort = oneOf(st.mxSort, ['actual', 'gap', 'ach', 'name'], 'actual'); st.mxSeg = oneOf(st.mxSeg, ['actual', 'ach', 'share'], 'actual'); st.mBy = oneOf(st.mBy, ['total', 'channel'], 'total');
  const save = () => pref.setJson('mon', st);
  const td = () => U.today();
  const camps = () => U.seed().campaigns || [];
  const byId = id => camps().find(c => c.id === id);
  const yearOf = c => c.year || +c.start.slice(0, 4);
  const plans = () => (U.seed().plans || {});
  const ch = () => (st.channel === 'all' ? null : st.channel);
  /* the Campaign's own months: Start … End and every month it has a number in (the month before Start too) */
  function spanOf(c) { const ms = [...(R.model(U.seed()).cells.get(c.id) || new Map()).keys()].concat([R.ym(c.start), R.ym(c.end)]).sort(); return [R.monthFirst(ms[0]), R.monthLast(ms[ms.length - 1])]; }
  const pnlCtx = c => { const [from, to] = spanOf(c); return { seed: U.seed(), from, to, statuses: R.STATUSES.slice(), includeCancelled: true, today: td(), ids: c.id, only: [c.id], stOpen: st.stOpen, sl: st.sl, side: st.side, scopeText: c.name, cols: M0.stCols }; };
  const ctx = () => { const c = byId(st.cid); return Object.assign(c ? pnlCtx(c) : { seed: U.seed() }, { today: td(), cid: st.cid, channel: ch(), unit: st.unit, mode: st.mode, skuSort: 'gap', skuTab: 'all', m: { measure: 'spend', mode: st.bva } }); };
  const isQty = () => st.unit === 'qty';
  const val = v => (v == null ? C.common.none : isQty() ? `${R.fmtNum(Math.round(v))}` : R.baht(v));
  const short = v => (v == null ? C.common.none : isQty() ? U.shortNum(v) : R.shortBaht(v));
  const noSales = c => !R.salesMonths(R.model(U.seed()), c.id).length;
  const notStarted = c => R.statusOf(c, td()) === 'not_started';
  const fold = c => noSales(c) && !notStarted(c) && !P.showTarget.has(TAB);
  /* every Campaign, every year — the issues of the one rule (R.issues) */
  const allScope = () => ({ from: '2000-01-01', to: '2099-12-31', statuses: R.STATUSES.slice(), includeCancelled: true, today: td() });
  const issuesAll = () => R.issues(U.seed(), allScope());
  /* ‹ › — urgent → watch → the rest (by Start) */
  function order() { const iss = issuesAll(), first = iss.rows.map(r => r.id); return first.concat(camps().filter(c => !first.includes(c.id) && R.statusOf(c, td()) !== R.CANCELLED).sort((a, b) => a.start.localeCompare(b.start)).map(c => c.id)); }
  function firstId() { const o = order(); return o[0] || (camps()[0] || {}).id || ''; }
  const stCls = s => (s === 'behind' ? 'behind' : s === 'at_risk' ? 'at_risk' : s === 'on_track' ? 'on_target' : '');
  const paceWord = s => (s ? C.yr.st[s] : C.yr.pace.early);

  let el = null, stick = { toTop() {} };
  function render(sub) {
    el = $('tab-tracking');
    if (!el.dataset.built) build();
    const [id, tab] = String(sub || '').split('/'), c = (id && byId(decodeURIComponent(id))) || byId(st.cid) || byId(firstId()) || null;
    const tab11 = tab === 'budget' ? 'expenses' : tab;   /* CR-11 §2 — the old tab budget is Expenses */
    st.cid = c ? c.id : ''; st.year = c ? yearOf(c) : st.year || +td().slice(0, 4); st.tab = TABS.includes(tab11) ? tab11 : TABS.includes(st.tab) && !id ? st.tab : 'summary'; save();
    const want = st.cid ? `#tracking/${st.cid}/${st.tab}` : '#tracking';
    if (location.hash !== want) history.replaceState(null, '', want);
    renderAll();
  }
  function build() {
    el.innerHTML = `<div class="pbanner"><h1>${esc(M0.title)}</h1></div><div class="toolbar sticktools" id="m_tools"></div>
      <div class="ptabs" role="tablist" id="m_tabs"></div><div id="m_body"></div>`;
    /* CR-10 D98 · CR-11 §2 — the tabs (+ Year · Campaign · ‹ › · the buttons from 1280 px) stay under the top bar */
    stick = U.stickyTabs(el, $('m_tabs'));
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-mtab], [data-trow]')) { e.preventDefault(); e.target.click(); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (!el.offsetParent) return; const c = byId(st.cid);
      if (st.tab === 'summary') { if (c) renderPeriod(c); drawBurn(); } if (st.tab === 'sales') { renderMonth(); renderMix(); renderSubs(); } if (st.tab === 'pnl') { renderWf(); drawCum(); renderSvm(); } if (st.tab === 'expenses') { renderBva(); renderGrp(); } }, 120); };
    window.addEventListener('resize', redraw); document.addEventListener('cp:contentresize', redraw);
    document.addEventListener('keydown', e => { if (!el.offsetParent || document.activeElement !== document.body || document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); } });
    el.dataset.built = '1';
  }
  function renderAll() {
    renderTools();
    $('m_tabs').innerHTML = TABS.map(t => `<a role="tab" href="#tracking/${esc(st.cid)}/${t}" data-mtab="${t}" class="${t === st.tab ? 'on' : ''}" aria-selected="${t === st.tab}">${esc(M0.tabs[t])}</a>`).join('');
    const c = byId(st.cid), body = $('m_body');
    if (!c) { body.innerHTML = `<div class="card"><div class="c3-empty">${esc(M0.none)}</div></div>`; return; }
    ({ summary: renderSummary, pnl: renderPnl, sales: renderSales, expenses: renderBudget, history: renderHistory })[st.tab](c);
    document.title = `${c.name} · ${M0.title} · ${C.app.title}`;
  }
  function go(id, tab) { location.hash = `#tracking/${id}/${tab || st.tab}`; }
  function step(n) { const ids = order(), i = ids.indexOf(st.cid); if (!ids.length) return; go(ids[(i + n + ids.length) % ids.length]); }

  /* ---------- toolbar (CR-09 §4.1 · CR-11 §3 — no head card: the Campaign field ≥ 360 px, its list 520 px · Request budget · View plan · Export on the right) ---------- */
  function renderTools() {
    const years = [...new Set(camps().map(yearOf))].sort(), list = camps().filter(c => yearOf(c) === st.year), c = byId(st.cid), iss = issuesAll().byId;
    const rank = x => { const r = iss.get(x.id); return r && r.severity === 'urgent' ? 0 : r && r.severity === 'watch' ? 1 : 2; };
    const sorted = list.slice().sort((a, b) => rank(a) - rank(b) || a.start.localeCompare(b.start)), GL = M0.groups;
    const opts = sorted.map((x, i) => { const g = GL[rank(x)], r = iss.get(x.id); return { value: x.id, label: x.name, sub: `${R.dm(x.start)} – ${R.dm(x.end)}`, chip: `<span class="ms-chips">${statusChip(R.statusOf(x, td()))}${r && r.severity ? U.issueChip(r.chips[0].key) : ''}</span>`,
      inGroup: g, group: i === 0 || rank(sorted[i - 1]) !== rank(x) ? g : '' }; });
    $('m_tools').innerHTML = `<label class="ms"><select class="ms-trigger sel yr" data-myear aria-label="${esc(K.year)}">${years.map(y => `<option value="${y}"${y === st.year ? ' selected' : ''}>${y}</option>`).join('')}</select></label>` +
      (list.length ? U.singleSelect({ id: 'm_camp', cls: 'mcamp', options: opts, value: st.cid, label: c ? c.name : K.campaign, labelHTML: c ? `<span class="cs-l">${esc(c.name)}</span>${statusChip(R.statusOf(c, td()))}` : esc(K.campaign), aria: K.campaign, placeholder: K.campaignPh,
        onChange: v => go(v) }) : `<span class="muted">${esc(K.none)}</span>`) +
      `<span class="navbtns"><button type="button" class="icon-btn" data-step="-1" title="${esc(K.prev)} (←)" aria-label="${esc(K.prev)}">${ICON.prev}</button><button type="button" class="icon-btn" data-step="1" title="${esc(K.next)} (→)" aria-label="${esc(K.next)}">${ICON.next}</button></span>` +
      /* CR-11 §3 (D101) — the buttons of the head card, on every tab · stuck (≥ 1280 px) they show their icon only */
      `<span class="mright">${c && canRequest(c) ? `<button type="button" class="btn" data-mreq title="${esc(C.plan.btn.request)}">${ICON.plus}<span>${esc(C.plan.btn.request)}</span></button>` : ''}` +
      (c ? `<a class="btn ghost" data-mplan href="#planning/${esc(c.id)}/overview" title="${esc(M0.viewPlan)}">${ICON.plan}<span>${esc(M0.viewPlan)}</span></a>` : '') +
      `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button></span>`;
  }
  const canRequest = c => { const plan = plans()[c.id]; return !!plan && R.canDo('request', CP.actor.get(), plan, { live: R.statusOf(c, td()) === 'ongoing' || R.statusOf(c, td()) === 'not_started' }).ok; };

  /* ---------- Summary (CR-09 §4.2 · CR-11 §4): Campaign period · KPI · Burn-up | What to do ---------- */
  function renderSummary(c) {
    $('m_body').innerHTML = `<div class="card cperiod" id="m_period"></div><div class="kpis" id="m_kpis"></div><div class="r21"><div class="card" id="m_burn"></div><div class="card" id="m_todo"></div></div>`;
    renderPeriod(c); renderSumKpis(c); drawBurn(); renderTodo(c);
  }
  /* CR-11 §4.1 (D101) — Campaign period: the head card as one bar Start → End · Marketing (Start → End marketing, dark) · Sell-through (→ End, light) · solid up to
     today, faded after · the Today line (red) · the full dates at the two ends and under the joint · the status + issue chips (left) · one sentence (right):
     91% of time gone · 24 days left | Ended 30/09/2026 | Starts in 56 days. The places are the ones of the Burn-up (a day = its end) */
  const posOf = (c, iso) => { const span = R.dayDiff(R.addDays(c.end, 1), c.start); return Math.max(0, Math.min(1, (R.dayDiff(iso, c.start) + 1) / span)); };
  function periodOf(c) {
    const t = td(), tp = R.timeProgress(c, t), dl = R.daysLeft(c, t), em = c.end_marketing && c.end_marketing >= c.start && c.end_marketing <= c.end ? c.end_marketing : null;
    const now = t < c.start ? 0 : t > c.end ? 1 : posOf(c, t), emp = em ? posOf(c, em) : null;
    return { t, tp, dl, em, now, emp, ended: t > c.end, started: t >= c.start };
  }
  function renderPeriod(c) {
    const box = $('m_period'); if (!box) return;
    /* CR-13 §3 · §5.3 — Ended · to close / Closed 30/09/2026 · Ann · Period change pending · Close requested (the chips of the Campaign page) */
    const r = issuesAll().byId.get(c.id), plan = plans()[c.id], cs = R.campState(c, plan, td()), pend = [...new Set(((plan && plan.requests) || []).filter(q => q.status === 'pending' && (q.type === 'period' || q.type === 'close')).map(q => q.type))];
    const chips = (cs.key === 'closed' || cs.key === 'toclose' ? CP.cpage.stateChip(c, plan, { by: true }) : statusChip(R.statusOf(c, td()))) + (r ? r.chips.map(x => U.issueChip(x.key)).join('') : '') +
      pend.map(k => `<a class="chip warn" href="#planning/${esc(c.id)}/requests">${esc(C.cpg.pending[k])}</a>`).join('');
    box.innerHTML = U.periodHTML(c, { today: td(), chips }); U.periodFit(box);
  }

  /* the numbers of a Campaign (its own months): actual · plan (full) · forecast end · the Pace · the budget of the whole Campaign (R.issues) */
  function nums(c) {
    const seed = U.seed(), f = R.pnlForecast(seed, pnlCtx(c), c.id), row = f.rows[0] || { actual: {}, plan: {}, forecast: {} }, sp = R.campaignPace(seed, c.id, td()), r = issuesAll().byId.get(c.id);
    return { A: row.actual, Pl: row.plan, F: row.forecast, sp, b: r && r.budget ? r.budget : null, tg: sp ? sp.timeGone : null };
  }
  function renderSumKpis(c) { const k = kpiCards(c); $('m_kpis').innerHTML = k.rev + k.bud + k.pro + k.fc; }
  /* the KPI cards of a Campaign (the anatomy of CR-08 §2.3): Summary = Net revenue · Budget used · Campaign profit · Forecast end ·
     CR-11 §5.2 (D104) P&L = Net revenue · Gross profit · Total expenses · Campaign profit (the Dashboard's P&L cards, of this Campaign — the statement's Actual) */
  function kpiCards(c) {
    const { A, Pl, F, sp, b, tg } = nums(c), Kk = M0.k9, kc = U.kpiCard, bs = U.barSeg, ended = td() > c.end, PK = C.pl.k;
    const ach = R.ratio(A.rev, Pl.rev), cls = stCls(sp && sp.status) || 'on_target', left = (Pl.rev || 0) - (A.rev || 0);
    const rev = kc({ key: 'revenue', label: labelInfo(Kk.revenue, Kk.revTip), value: A.rev == null ? C.common.none : R.baht(A.rev), none: A.rev == null, suffix: Kk.ofTarget(R.shortBaht(Pl.rev)),
      bar: bs(Math.min(1, ach || 0) * 100, cls), tg, barTip: C.sb.pace.barTip(R.pct(ach), R.pct(tg), sp && sp.pace != null && sp.status ? R.paceText(sp.pace) : ''),
      cap: A.rev == null ? esc(D.k.noSales) : `<b class="attx ${cls}">${esc(R.pct(ach))}</b> · ${esc(left < -0.5 ? Kk.above(R.shortBaht(-left)) : (ended ? Kk.short : Kk.toGo)(R.shortBaht(left)))} · <b class="attx ${cls}">${esc(paceWord(sp && sp.status))}</b>` });
    const used = b ? b.used : null, over = b && b.remaining < -0.5;
    const bud = kc({ key: 'budget', label: labelInfo(Kk.budget, Kk.budgetTip), value: b ? R.baht(b.spent) : C.common.none, none: !b, suffix: b ? Kk.ofBudget(R.shortBaht(b.current)) : '',
      bar: b ? bs(Math.min(1, used || 0) * 100, used > 1 ? 'over' : 'ok') : '', tg, barTip: b ? Kk.usedTip(R.pct(used), R.pct(tg)) : '',
      cap: b ? `<b class="${over ? 'bad' : ''}">${esc(Kk.used(R.pct(used)))}</b> · ${over ? `<b class="bad">${esc(Kk.over(R.shortBaht(-b.remaining)))}</b>` : esc(Kk.left(R.shortBaht(b.remaining)))}` : esc(C.track.noBudget('')) });
    const of = R.ratio(A.profit, Pl.profit);
    const pro = kc({ key: 'profit', label: labelInfo(Kk.profit, C.money.profit), value: A.profit == null ? C.common.none : R.baht(A.profit), none: A.profit == null, neg: A.profit < 0, suffix: Kk.ofPlan(R.shortBaht(Pl.profit)),
      bar: bs(Math.min(1, Math.abs(of || 0)) * 100, A.profit < 0 ? 'neg' : 'ok'), barTip: Kk.profitTip(R.pct(of)), cap: esc(Kk.profitCap(R.pct(A.margin), R.times(A.roi))) });
    const fr = R.ratio(F.rev, Pl.rev), fst = R.attStatus(fr) || 'on_target';
    const fc = kc({ key: 'forecast', label: labelInfo(Kk.fc, Kk.fcTip), value: F.rev == null ? C.common.none : R.baht(F.rev), none: F.rev == null, suffix: Kk.ofTarget(R.shortBaht(Pl.rev)),
      bar: bs(Math.min(1, fr || 0) * 100, fst), barTip: R.pct(fr, 1), capTip: Kk.fcCapTip(R.baht(F.profit), R.baht(Pl.profit)), cap: F.rev == null ? esc(C.empty.card) : `<b class="attx ${fst}">${esc(R.pct(fr))}</b> · ${esc(Kk.fcCap(R.shortBaht(F.profit), R.shortBaht(Pl.profit)))}` });
    /* Gross profit (GP 67% · plan 67%) · Total expenses (A&P 24% · plan 18% — the groups in the bar's colours) · of the full plan · the Time gone tick */
    const gr = R.ratio(A.gp, Pl.gp), ur = R.ratio(A.spend, Pl.spend), MN = C.money;
    const gp = kc({ key: 'gp', label: labelInfo(PK.gp, MN.gp), value: A.gp == null ? C.common.none : R.baht(A.gp), none: A.gp == null, suffix: PK.ofPlan(R.shortBaht(Pl.gp)), bar: bs(Math.min(1, Math.max(0, gr || 0)) * 100, 'ok'), tg,
      barTip: M0.pk.gpTip(R.pct(gr)), cap: esc(PK.gpCap(R.pct(A.gpPct), R.pct(Pl.gpPct))) });
    const exp = kc({ key: 'exp', label: labelInfo(PK.exp, MN.spend), value: A.spend == null ? C.common.none : R.baht(A.spend), none: A.spend == null, suffix: PK.ofPlan(R.shortBaht(Pl.spend)),
      bar: Pl.spend ? ['mkt', 'sls', 'oth'].map(g => bs(Math.min(1, (A[g] || 0) / Pl.spend) * 100, g)).join('') : '', tg, barTip: M0.pk.expTip(R.shortBaht(A.mkt), R.shortBaht(A.sls), R.shortBaht(A.oth), R.pct(ur)),
      cap: esc(PK.expCap(R.pct(A.ap), R.pct(R.ratio(Pl.spend, Pl.rev)))) });
    return { rev, bud, pro, fc, gp, exp };
  }
  /* the Burn-up: Ach % (actual ÷ Full target, running) · Used % (spent ÷ current budget, running) · Time gone (the diagonal) — over Start … End ·
     CR-09 M10: the month + the year under the first month · the End marketing line · the forecast ends (Ach → Forecast end % · Used → the spend pace) */
  function burnData(c) {
    const M = R.model(U.seed()), cm = M.cells.get(c.id) || new Map(), sp = R.campaignPace(U.seed(), c.id, td()), r = issuesAll().byId.get(c.id), cur = r && r.budget ? r.budget.current : null;
    const months = R.monthsIn(c.start, c.end), stop = td() < c.end ? td() : c.end, pts = { ach: [], used: [] };
    let a = 0, s = 0;
    const spentOf = m => { const x = cm.get(m); return x ? (x.mkt[1] || 0) + (x.sls[1] || 0) + (x.oth[1] || 0) : 0; };
    /* the spend of the month before Start counts at Start */
    const before = R.addMonths(R.ym(c.start), -1); s += spentOf(before);
    months.forEach(m => { if (R.monthFirst(m) > stop) return; const x = cm.get(m); a += x && x.rev[1] != null ? x.rev[1] : 0; s += spentOf(m);
      const d = R.monthLast(m) < stop ? R.monthLast(m) : stop; pts.ach.push({ d, v: sp.target ? a / sp.target : null }); pts.used.push({ d, v: cur ? s / cur : null }); });
    const { F, Pl } = nums(c), spp = R.spendPace(U.seed(), c.id, td());
    const fc = td() < c.end ? { ach: R.ratio(F.rev, Pl.rev), used: cur ? spp.end / cur : null } : null;
    return { c, pts, sp, cur, stop, fc };
  }
  function drawBurn() {
    const box = $('m_burn'), c = byId(st.cid); if (!box || !c) return;
    const B = M0.burn, B2 = M0.burn2, d = burnData(c), css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    /* CR-11 §4.2 — the legend: Time gone = a dashed grey diagonal · Forecast (Est.) = dashed in the colours of its two lines · End marketing only on the chart */
    const lgTime = `<svg class="lgs" width="18" height="12" aria-hidden="true"><path d="M1.5 10.5 16.5 1.5" style="stroke:var(--text-2)" stroke-width="1.6" stroke-dasharray="3 2.4" fill="none"/></svg>`;
    const lgFc = `<svg class="lgs" width="22" height="12" aria-hidden="true"><path d="M1 3.5H21" style="stroke:var(--rev)" stroke-width="2" stroke-dasharray="4 3"/><path d="M1 9H21" style="stroke:var(--mkt)" stroke-width="2" stroke-dasharray="4 3"/></svg>`;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(B.title, B2.tip)}</h3><div class="ctl"><div class="legend" data-burnleg><span><i class="ln" style="--sw:var(--rev)"></i>${esc(B.ach)}</span><span><i class="ln" style="--sw:var(--mkt)"></i>${esc(B.used)}</span><span data-lg="time">${lgTime}${esc(C.yr.timeGone)}</span>` +
      (d.fc ? `<span data-lg="fc">${lgFc}${esc(B2.fc)}</span>` : '') + `</div></div></div>` +
      `<div class="chartbox burn" id="m_bbox"><svg id="m_bsvg" role="img" aria-label="${esc(B.title)}"></svg></div>`;
    const svg = $('m_bsvg'), W = Math.max(300, Math.round($('m_bbox').clientWidth || 800)), H = 268;
    const ends = [d.pts.ach, d.pts.used].map(p => (p.length ? p[p.length - 1].v : null)).concat(d.fc ? [d.fc.ach, d.fc.used] : []).filter(R.isNum);
    const yMax = Math.max(1, Math.ceil(Math.max(1, ...d.pts.ach.concat(d.pts.used).map(p => p.v).filter(R.isNum), ...ends) * 4 - 1e-9) / 4);
    const ylab = []; for (let v = 0; v <= yMax + 1e-9; v += 0.25) ylab.push(`${Math.round(v * 100)}%`);
    const m = { l: U.axisLeft(svg, ylab), r: Math.ceil(12 + U.textW(svg, ['000%', C.yr.timeGone + ' 100%'], 'blab')) , t: 22, b: 40 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const span = R.dayDiff(R.addDays(c.end, 1), c.start), x = iso => m.l + Math.max(0, Math.min(1, (R.dayDiff(iso, c.start) + 1) / span)) * iw, y = v => m.t + (1 - v / yMax) * ih;
    let g = '';
    for (let v = 0; v <= yMax + 1e-9; v += 0.25) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${css('--grid')}"/><text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end" class="axis">${Math.round(v * 100)}%</text>`;
    /* a month name every n months when they are close (a narrow card) — as the month charts */
    const bms = R.monthsIn(c.start, c.end), every = Math.max(1, Math.ceil(34 / (iw / Math.max(1, bms.length))));
    bms.forEach((mm, i) => { const xx = x(R.monthFirst(mm) < c.start ? c.start : R.monthFirst(mm)); if (i % every) return;
      g += `<text x="${xx}" y="${m.t + ih + 18}" class="axis mon">${esc(R.monthShort(mm))}</text>` + (i === 0 || mm.slice(5) === '01' ? `<text x="${xx}" y="${m.t + ih + 33}" class="axis yr">${mm.slice(0, 4)}</text>` : ''); });
    const lab = (xx, yy, t, color) => { const w = U.textW(svg, [t], 'blab'), lx = Math.min(xx + 7, W - 2 - w); return `<text x="${lx.toFixed(1)}" y="${(yy + 4).toFixed(1)}" class="blab" fill="${color}">${esc(t)}</text>`; };
    const line = (pts, color, fcv) => { const p = pts.filter(q => q.v != null); if (!p.length) return ''; const dd = [`M${x(c.start)},${y(0)}`].concat(p.map(q => `L${x(q.d).toFixed(1)},${y(q.v).toFixed(1)}`)).join(' ');
      const e = p[p.length - 1], f = d.fc && R.isNum(fcv) ? `<path d="M${x(e.d).toFixed(1)},${y(e.v).toFixed(1)} L${x(c.end).toFixed(1)},${y(fcv).toFixed(1)}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5 4" opacity=".75" data-fc="${fcv}"/>` +
        `<circle cx="${x(c.end)}" cy="${y(fcv)}" r="3.5" fill="none" stroke="${color}" stroke-width="2"/>` + lab(x(c.end), y(fcv), `${Math.round(fcv * 100)}%`, color) : '';
      return `<path d="${dd}" fill="none" stroke="${color}" stroke-width="2.5"/><circle cx="${x(e.d)}" cy="${y(e.v)}" r="4" fill="${color}"/>${f}` + (f && Math.abs(x(c.end) - x(e.d)) < 40 ? '' : lab(x(e.d), y(e.v), `${Math.round(e.v * 100)}%`, color)); };
    const tg = d.sp.timeGone || 0, tline = `<path d="M${x(c.start)},${y(0)} L${x(d.stop)},${y(tg)}" stroke="${css('--text-2')}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/><path d="M${x(d.stop)},${y(tg)} L${x(c.end)},${y(1)}" stroke="${css('--grid')}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`;
    const today = td() >= c.start && td() <= c.end ? `<line x1="${x(td())}" x2="${x(td())}" y1="${m.t}" y2="${m.t + ih}" stroke="${css('--today')}" stroke-dasharray="5 4"/>` : '';
    const em = c.end_marketing && c.end_marketing >= c.start && c.end_marketing <= c.end ? (() => { const ex = x(c.end_marketing), right = ex > W - m.r - 100;
      return `<line x1="${ex.toFixed(1)}" x2="${ex.toFixed(1)}" y1="${m.t - 8}" y2="${m.t + ih}" stroke="${css('--text')}" stroke-width="1.3" stroke-dasharray="2 3" data-endmkt="${c.end_marketing}"/><text x="${(ex + (right ? -5 : 5)).toFixed(1)}" y="${m.t - 10}" class="blab"${right ? ' text-anchor="end"' : ''}>${esc(B2.endMkt)}</text>`; })() : '';
    /* CR-11 §4.2 — the Marketing period (Start → End marketing) shaded, as the dark part of Campaign period */
    const shade = c.end_marketing && c.end_marketing >= c.start && c.end_marketing <= c.end ? `<rect class="mshade" x="${m.l}" y="${m.t}" width="${(x(c.end_marketing) - m.l).toFixed(1)}" height="${ih}" data-share="${posOf(c, c.end_marketing)}"/>` : '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = shade + g + today + em + tline + line(d.pts.used, css('--mkt'), d.fc && d.fc.used) + line(d.pts.ach, css('--rev'), d.fc && d.fc.ach);
    svg.dataset.plotL = m.l; svg.dataset.plotW = iw;
    svg.dataset.ach = d.pts.ach.length ? d.pts.ach[d.pts.ach.length - 1].v : ''; svg.dataset.used = d.pts.used.length ? d.pts.used[d.pts.used.length - 1].v : ''; svg.dataset.time = tg;
    svg.dataset.fcAch = d.fc && R.isNum(d.fc.ach) ? d.fc.ach : ''; svg.dataset.fcUsed = d.fc && R.isNum(d.fc.used) ? d.fc.used : '';
  }
  /* What to do (CR-09 §4.2): one row a thing — the chip · a short sentence · a button · Near budget / Spending ahead / nothing = ✓ */
  function renderTodo(c) {
    const T = M0.todo, T2 = M0.todo2, r = issuesAll().byId.get(c.id), rr = R.runRate(U.seed(), c.id, { today: td() }), dl = R.daysLeft(c, td()), b = (r && r.budget) || {};
    const items = ((r && r.chips) || []).filter(x => ['behind', 'at_risk', 'over', 'ended_over'].includes(x.key));
    const row = x => {
      if (x.key === 'behind' || x.key === 'at_risk') {
        const live = rr.required != null && rr.monthsLeft > 1e-9 && td() <= c.end, when = rr.monthsLeft < 1 ? T2.forDays(Math.max(0, dl.n || 0)) : T2.forMonths(Math.round(rr.monthsLeft * 10) / 10);
        const words = !live ? T.salesEnd : rr.need != null ? T2.sell(R.shortBaht(rr.required), when, R.times(rr.need)) : T2.sellNoPace(R.shortBaht(rr.required), when);
        return `<li class="${x.sev}">${U.issueChip(x.key)}<span>${esc(words)}</span>${live ? `<button type="button" class="btn small" data-gosku>${esc(T2.seeSku)}</button>` : ''}</li>`; }
      if (x.key === 'over') return `<li class="${x.sev}">${U.issueChip(x.key)}<span>${esc(T2.over(R.shortBaht(-b.remaining)))}</span>${canRequest(c) ? `<button type="button" class="btn small" data-mreq>${esc(T2.request)}</button>` : ''}</li>`;
      return `<li class="${x.sev}">${U.issueChip(x.key)}<span>${esc(T.endedOver(R.shortBaht(-b.remaining)))}</span></li>`;
    };
    $('m_todo').innerHTML = `<div class="card-head"><h3>${esc(T.title)}</h3></div>` + (items.length ? `<ul class="todo t9">${items.map(row).join('')}</ul>`
      : `<div class="na-none small" data-todook><span class="okm" aria-hidden="true">✓</span> ${esc(T2.none)}</div>`);
  }

  /* ---------- Sales (CR-09 §4.3): the Channel and the unit of the tab · by month (Total | By channel) · mix | channels · SKU × Channel · sub-channels | Pareto ---------- */
  function renderSales(c) {
    const S9 = M0.s9;
    $('m_body').innerHTML = `<div class="mtabbar">${segHTML('data-chf', CHS.map(v => ({ v, label: v === 'all' ? S9.all : C.channel[v] })), st.channel, { label: S9.channelL })}` +
      segHTML('data-unit', [{ v: 'amount', label: K.m.baht }, { v: 'qty', label: K.m.qty }], st.unit, { label: S9.unitL }) + `</div>` +
      `<div class="card" id="m_month"></div><div class="r13"><div class="card" id="m_mix"></div><div class="card" id="m_ch"></div></div><div class="card" id="m_mx"></div>` +
      /* CR-11 §5.3 — Sub-channel share (its own height) | SKU trend (D102 · D103 — SKU contribution removed: the Share is in the matrix) */
      `<div class="r2 r2top"><div class="card" id="m_subs"></div><div class="card" id="m_trend"></div></div>`;
    renderMonth(); renderMix(); renderCh(); renderMatrix(); renderSubs(); renderTrend();
    void c;
  }
  function renderMonth() {
    const box = $('m_month'); if (!box) return;
    const c = byId(st.cid), M = K.m, S9 = M0.s9, table = st.mView === 'table', byCh = st.mBy === 'channel' && !ch();
    if (!c) { box.innerHTML = ''; return; }
    const md = R.targetByMonth(U.seed(), c.id, { channel: ch(), unit: st.unit, today: td() });
    const o = { mode: st.mode, color: '--rev', good: 'up', planWord: M.target, lflWord: M.targetLfl, fmt: isQty() ? U.shortNum : R.compact, full: isQty() ? v => `${R.fmtNum(Math.round(v))} pcs` : R.baht };
    /* By channel: the actual of each channel stacked (its colour) · the tick = the whole target */
    if (byCh) { const chs = R.CHANNELS.filter(k => (R.model(U.seed()).salesRows.get(c.id) || []).some(r => r.channel === k)), per = Object.fromEntries(chs.map(k => [k, R.targetByMonth(U.seed(), c.id, { channel: k, unit: st.unit, today: td() }).rows]));
      md.rows.forEach((r, i) => chs.forEach(k => { r[k] = per[k][i] ? per[k][i].actual : null; }));
      o.stack = chs.map(k => ({ k, color: CH_TOKEN[k], label: C.channel[k] })); }
    const folded = fold(c) && !table;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(M.title, M.tip)}</h3><div class="ctl">${table || folded ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      (ch() ? '' : segHTML('data-mby', [{ v: 'total', label: S9.total }, { v: 'channel', label: S9.byCh }], st.mBy, { label: S9.viewL })) +
      segHTML('data-bmode', [{ v: 'monthly', label: D.m.monthly }, { v: 'cumulative', label: D.m.cumulative }], st.mode, { label: D.m.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="mView" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      (folded ? U.foldedLine() : `<div class="sumline">${sumHTML(md, c)}</div>` +
        (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('c_month', ctx()), 'c_month')}</div>` : `<div class="chartbox" id="mm_box"><svg id="mm_svg" role="img" aria-label="${esc(M.title)}"></svg><div class="tip" id="mm_tip"></div></div>`));
    /* its own ids — the Dashboard's Overview has m_svg (a hidden tab keeps its DOM) */
    if (!table && !folded) U.monthChart($('mm_svg'), $('mm_box'), $('mm_tip'), md, Object.assign(o, { h: 300 }));
  }
  function sumHTML(md, c) {
    const t = md.toDate, tp = R.timeProgress(c, td()), dl = R.daysLeft(c, td()), left = esc(!tp.started ? K.k.startsIn(dl.n) : K.m.left(tp.daysLeft));
    if (!t) return `<span class="noa">${esc(C.empty.card)}</span><span class="noa">· ${esc(D.m.planOnly(K.m.target, short(md.planTotal)))}</span><span class="noa">· ${left}</span>`;
    const tone = R.tone(t.gap, 'up'), words = t.gap == null ? '' : Math.abs(t.gap) < 0.5 ? D.m.onTarget : (t.gap < 0 ? D.m.behind : D.m.ahead)(short(Math.abs(t.gap)));
    return `<span class="tdl" tabindex="0" title="${esc(C.money.toDate)}">${esc(D.m.toDateL)}</span><span>${esc(K.m.sum(short(t.actual), short(t.plan), R.pct(t.pct)))}</span>` +
      (words ? `<span>·</span><b class="${tone}">${esc(words)}</b>` : '') + `<span>·</span><span>${left}</span>`;
  }
  /* Sales mix by channel (1/3): the donut of the actual · Target mix / Actual mix (D83) */
  function renderMix() {
    const box = $('m_mix'), c = byId(st.cid); if (!box || !c) return;
    const X9 = M0.mix, m = R.salesMix(U.seed(), c.id, { unit: st.unit, today: td() }), head = `<div class="card-head"><h3>${labelInfo(X9.title, X9.tip)}</h3></div>`;
    if (fold(c) || !m.actual) { box.innerHTML = head + U.foldedLine(); return; }
    const sl = m.channels.filter(x => x.actual > 0).sort((a, b) => b.actual - a.actual).map(x => ({ key: x.channel, label: `${C.channel[x.channel]} · ${C.channelLong[x.channel]}`, value: x.actual, color: CH_TOKEN[x.channel],
      tip: C.sb.chmix.slice(C.channelLong[x.channel], val(x.actual), R.pct(x.aShare, 1)) }));
    const parts = k => m.channels.map(x => ({ key: x.channel, label: C.channel[x.channel], value: k === 'target' ? x.target || 0 : x.actual || 0, color: CH_TOKEN[x.channel], money: val(k === 'target' ? x.target : x.actual) }));
    box.innerHTML = head + `<div class="c3-body dbody">${U.donutHTML({ id: 'm_dn', label: X9.title, slices: sl, total: m.actual, cols: X9.cols, fmt: val })}` +
      U.mixBars([{ label: X9.target, parts: parts('target') }, { label: X9.actual, parts: parts('actual') }]) + `</div>`;
    U.drawDonut({ id: 'm_dn', slices: sl, total: m.actual, center: short(m.actual), size: 150 });
  }
  /* Channel attainment (2/3): Channel · Actual · Share % · Full target · Ach % (the Time gone tick) · Gap to pace · Remaining · Status (the Pace — D80) */
  function renderCh() {
    const box = $('m_ch'), c = byId(st.cid); if (!box || !c) return;
    const a = R.attainment(U.seed(), c.id, { channel: ch(), unit: st.unit, today: td() }), T = M0.chT, Kc = T.cols, folded = new Set(st.chFolded), tg = R.timeGone(c, td()), table = st.chView === 'table';
    const tot = a.total.actTD;
    const head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><button type="button" class="btn small${table ? ' on' : ''}" data-view="chView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (fold(c) && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('c_channel', ctx()), 'c_channel')}</div>`; return; }
    const th = (l, tip, num) => `<th class="${num ? 'num' : ''}">${tip ? labelInfo(l, tip, l) : esc(l)}</th>`;
    const cells = (n, name) => { const p = R.paceNode(n, tg), cl = stCls(p.status) || 'ok';
      return `<td class="num" title="${esc(val(n.actTD))}" data-act="${n.actTD == null ? '' : n.actTD}">${n.actTD == null ? none(C.att.none) : esc(short(n.actTD))}</td><td class="num">${esc(R.pct(tot ? (n.actTD || 0) / tot : null, 1))}</td><td class="num" title="${esc(val(n.target))}">${n.target == null ? none() : esc(short(n.target))}</td>` +
        `<td title="${esc(T.rowTip(name, val(n.actTD), val(n.target), val(n.tgtTD), p.pace != null && p.status ? R.paceText(p.pace) : ''))}">${p.achF == null ? none() : U.paceBar(p.achF, tg, cl, 46)}</td>` +
        `<td class="num">${p.gapPace == null ? none() : `<span class="${R.tone(p.gapPace, 'up')}">${esc((p.gapPace > 0.5 ? '+' : '') + short(p.gapPace))}</span>`}</td>` +
        `<td class="num" title="${esc(val(n.remaining))}">${n.remaining == null ? none() : esc(short(n.remaining))}</td><td>${U.paceChip(p.status)}</td>`; };
    const rows = a.channels.map(x => {
      const subs = x.subs.filter(s => s.sub && s.node && s.node.actTD != null).sort((p, q) => q.node.actTD - p.node.actTD), open = subs.length && !folded.has(x.channel);
      return `<tr class="grp" data-chrow="${esc(x.channel)}"><td class="nm"><div class="nmw"><button type="button" class="chev" data-chfold="${esc(x.channel)}" aria-expanded="${!!open}" aria-label="${esc((open ? D.p.collapse : D.p.expand)(C.channel[x.channel]))}"${subs.length ? '' : ' disabled'}>${ICON.chevronDown}</button>` +
        `<div class="nmt" title="${esc(C.channelLong[x.channel])}"><b>${esc(C.channel[x.channel])}</b></div></div></td>${cells(x.node, C.channel[x.channel])}</tr>` +
        (open ? subs.map((s, i) => `<tr class="child${i === subs.length - 1 ? ' last' : ''}"><td class="nm"><span class="chname">${esc(s.sub)}</span></td><td class="num" title="${esc(val(s.node.actTD))}">${esc(short(s.node.actTD))}</td><td class="num muted small">${esc(T.subShare(R.pct(R.ratio(s.node.actTD, x.node.actTD)), C.channel[x.channel]))}</td><td colspan="5"></td></tr>`).join('') : '');
    }).join('');
    box.innerHTML = head + `<div class="tablewrap" style="margin-top:10px"><table class="tbl port atttbl chtbl"><thead><tr>${th(Kc.channel)}${th(Kc.actual, null, true)}${th(Kc.share, null, true)}${th(Kc.full, null, true)}${th(Kc.ach, T.achTip)}${th(Kc.gap, T.gapTip, true)}${th(Kc.remaining, K.tip.remaining, true)}${th(Kc.status)}</tr></thead>` +
      `<tbody>${rows}<tr class="total"><td>${esc(K.total)}</td>${cells(a.total, K.total)}</tr></tbody></table></div>`;
  }
  /* SKU × Channel (D82): the actual of every SKU in every channel · Ach % under it · the tint = the Pace status · Share % = of the campaign · the total row = Net revenue */
  const MX_RANK = { behind: 0, at_risk: 1, on_track: 2 };
  /* CR-11 §5.3 (D103) — the rank of every SKU by its actual (1 = the largest · a tie by name) + the running share up to it (Top 2 SKUs = 61%) · whatever the sort or filter ·
     o.all: every row of the tab (the SKU trend) — else the one SKU picked in the SKU trend only */
  function mxRows(c, o = {}) {
    const m = R.skuMatrix(U.seed(), c.id, { unit: st.unit, channel: ch(), today: td() }), nm = s => s.product.nickname || s.product.name || s.key;
    const rk = m.rows.slice().sort((a, b) => ((b.total && b.total.actual) || 0) - ((a.total && a.total.actual) || 0) || nm(a).localeCompare(nm(b), 'en')); let run = 0;
    rk.forEach((s, i) => { run += (s.total && s.total.share) || 0; s.rank = i + 1; s.cum = run; });
    const one = !o.all && st.mxSku && m.rows.some(s => s.key === st.mxSku) ? st.mxSku : '';
    const rows = m.rows.filter(s => (one ? s.key === one : st.mxTab === 'all' || (s.total && s.total.status) === st.mxTab)).sort((a, b) => {
      if (st.mxSort === 'name') return nm(a).localeCompare(nm(b), 'en');
      if (st.mxSort === 'ach') return (a.total.achF ?? 9) - (b.total.achF ?? 9) || nm(a).localeCompare(nm(b), 'en');
      if (st.mxSort === 'gap') return (a.total.gapPace ?? 1e18) - (b.total.gapPace ?? 1e18) || nm(a).localeCompare(nm(b), 'en');
      return (b.total.actual || 0) - (a.total.actual || 0) || nm(a).localeCompare(nm(b), 'en'); });
    return { m, rows, nm };
  }
  function renderMatrix() {
    const box = $('m_mx'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.mx, table = st.mxView === 'table', { m, rows, nm } = mxRows(c), count = k => m.rows.filter(s => s.total && s.total.status === k).length;
    const tabs = `<div class="sttabs" role="tablist">${[['all', T.tabs.all, m.rows.length], ['behind', T.tabs.behind, count('behind')], ['at_risk', T.tabs.at_risk, count('at_risk')], ['on_track', T.tabs.on_track, count('on_track')]]
      .map(([k, l, n]) => `<button type="button" role="tab" data-mxtab="${k}" class="${st.mxTab === k ? 'on' : ''}${k !== 'all' ? ' ' + stCls(k) : ''}" aria-selected="${st.mxTab === k}">${esc(l)} <span class="n">${n}</span></button>`).join('')}</div>` +
      /* CR-11 §5.3 — a row of SKU trend picked: this SKU only (Show all) */
      (rows.length === 1 && st.mxSku === rows[0].key ? `<div class="mxone" data-mxone="${esc(rows[0].key)}"><span>${esc(T.onlySku(nm(rows[0])))}</span><button type="button" class="link" data-mxsku="">${esc(T.showAll)}</button></div>` : '');
    const head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl">${segHTML('data-mxseg', ['actual', 'ach', 'share'].map(v => ({ v, label: v === 'actual' && isQty() ? K.m.qty : T.seg[v] })), st.mxSeg, { label: T.segL })}` +
      `<label class="ms"><select class="ms-trigger sel" data-mxsort aria-label="${esc(D.p.sortL)}">${['actual', 'gap', 'ach', 'name'].map(k => `<option value="${k}"${st.mxSort === k ? ' selected' : ''}>${esc(D.p.sortBtn(T.sorts[k]))}</option>`).join('')}</select></label>` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="mxView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (fold(c) && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + tabs + `<div class="ctable">${U.tableHTML(X.rowsFor('c_matrix', ctx()), 'c_matrix', { maxH: 560 })}</div>`; return; }
    /* CR-10 §5.3 — the matrix is one helper (U.channelMatrix): rows = SKUs here, Campaigns on Dashboard › Sales */
    const html = U.channelMatrix({ channels: m.channels, seg: st.mxSeg, fmt: short, tg: m.tg, stCls, rank: true,
      cols: { name: T.cols.sku, total: T.cols.total, share: T.cols.share, rank: T.cols.rank, ach: T.cols.ach, status: T.cols.status, totalRow: T.total },
      rows: rows.map(s => ({ name: nm(s), sub: s.product.code || '', byCh: s.byCh, total: s.total, tg: m.tg, rank: s.rank, cum: s.cum, attrs: ` data-mxrow="${esc(s.key)}"` })), totals: st.mxTab === 'all' && !st.mxSku ? Object.assign({ all: m.total }, m.byCh) : null,
      shareTip: r => T.shareTip(r.rank, R.pct(r.cum, 1)),
      cellTip: (r, k, x) => T.cellTip(r.name, C.channel[k], val(x.actual), val(x.target), R.pct(x.achF), x.status ? C.yr.st[x.status] : '') });
    box.innerHTML = head + tabs + (rows.length ? html : `<div class="c3-empty">${esc(T.none)}</div>`);
  }
  /* CR-11 §5.3 (D102) — Sub-channel share: one 100% bar a channel (MT · TT · ECOM) · its sub-channels as parts, the largest at the left, in shades of the channel's
     colour · under 5% together as Other n (2 or more) · "Watsons 29%" in the part when it has room, else under the bar · the channel's actual at the end (= Channel
     attainment) · the card as tall as its rows (no stretch) */
  const SUB_MIN = 0.05;
  function subsParts(x) {
    const small = x.subs.filter(s => (s.share || 0) < SUB_MIN), big = small.length >= 2 ? x.subs.filter(s => (s.share || 0) >= SUB_MIN) : x.subs;
    const parts = big.map((s, i) => ({ name: s.sub, actual: s.actual, share: s.share || 0, mix: Math.max(30, 100 - i * 16) }));
    if (small.length >= 2) parts.push({ name: M0.subs.otherN(small.length), actual: small.reduce((t, s) => t + s.actual, 0), share: small.reduce((t, s) => t + (s.share || 0), 0), other: true, list: small.map(s => s.sub) });
    return parts;
  }
  function renderSubs() {
    const box = $('m_subs'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.subs, m = R.salesMix(U.seed(), c.id, { unit: st.unit, today: td() }), head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3></div>`;
    const chs = m.channels.filter(x => !ch() || x.channel === ch()).filter(x => x.subs.length && x.actual > 0);
    if (fold(c) || !chs.length) { box.innerHTML = head + U.foldedLine(); return; }
    const row = x => { const tok = CH_TOKEN[x.channel], parts = subsParts(x);
      const seg = p => { const bg = p.other ? 'var(--series-grey)' : p.mix >= 100 ? `var(${tok})` : `color-mix(in srgb, var(${tok}) ${p.mix}%, var(--surface))`, lbl = `${p.name} ${R.pct(p.share)}`;
        return `<i class="scs-p${p.other || p.mix < 70 ? ' lt' : ''}" style="width:${(p.share * 100).toFixed(3)}%;background:${bg}" data-share="${p.share}" data-sub="${esc(p.name)}" title="${esc(`${p.name}${p.list ? ` (${p.list.join(', ')})` : ''}\n${val(p.actual)} · ${T.of(R.pct(p.share, 1), C.channel[x.channel])}`)}"><b>${esc(lbl)}</b></i>`; };
      return `<div class="scs-r" data-scsch="${esc(x.channel)}"><span class="scs-l" title="${esc(C.channelLong[x.channel])}">${esc(C.channel[x.channel])}</span><span class="scs-t" role="img" aria-label="${esc(`${C.channel[x.channel]}: ${parts.map(p => `${p.name} ${R.pct(p.share)}`).join(' · ')}`)}">${parts.map(seg).join('')}</span>` +
        `<span class="scs-v" title="${esc(val(x.actual))}" data-scsv="${x.actual}">${esc(short(x.actual))}</span><span class="scs-u"></span></div>`; };
    box.innerHTML = head + `<div class="scs">${chs.map(row).join('')}</div>`;
    /* a name that does not fit its part goes under the bar (a swatch + the words) */
    box.querySelectorAll('.scs-r').forEach(r => { const under = r.querySelector('.scs-u');
      r.querySelectorAll('.scs-p').forEach(p => { const b = p.querySelector('b'); if (b && b.offsetWidth + 10 > p.clientWidth) { b.remove(); under.insertAdjacentHTML('beforeend', `<span><i style="background:${p.style.background}"></i>${esc(`${p.dataset.sub} ${R.pct(+p.dataset.share)}`)}</span>`); } });
      if (!under.children.length) under.remove(); });
  }
  /* CR-11 §5.3 (D103) — SKU trend: Ach % of each SKU each month (actual ÷ the target of that month) · rows = the SKUs of the matrix in its order · columns = Start …
     this month (in progress: hatched) · ≥ 100% ok · 90 – 99% warn · < 90% err · no target = empty · the End marketing line · a row → the matrix of that SKU only */
  function renderTrend() {
    const box = $('m_trend'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.trend, sw = cls => `<i class="trsw ${cls}"></i>`;
    const head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><div class="legend"><span>${sw('ok')}${esc(T.lg.ok)}</span><span>${sw('warn')}${esc(T.lg.warn)}</span><span>${sw('err')}${esc(T.lg.err)}</span><span>${sw('mtd')}${esc(D.m.legend.mtd)}</span></div>` +
      `<button type="button" class="btn small" data-dl="c_trend">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>`;
    const tr = R.skuTrend(U.seed(), c.id, { unit: st.unit, channel: ch(), today: td() }), { rows, nm } = mxRows(c, { all: true });
    if (fold(c) || !tr.months.length || !rows.length) { box.innerHTML = head + U.foldedLine(); return; }
    const cur = R.ym(td()), em = c.end_marketing ? R.ym(c.end_marketing) : null, cls = a => (a == null ? '' : a >= 1 - 1e-9 ? 'ok' : a >= 0.9 - 1e-9 ? 'warn' : 'err');
    const th = tr.months.map((mm, i) => `<th class="num trm${mm === em ? ' em' : ''}${mm === cur ? ' cur' : ''}" title="${esc(R.monthName(mm) + (mm === em ? ` · ${M0.burn2.endMkt} ${R.dmy(c.end_marketing)}` : ''))}">${esc(R.monthShort(mm))}${i === 0 || mm.slice(5) === '01' ? `<small>${mm.slice(0, 4)}</small>` : ''}</th>`).join('');
    const body = rows.map(s => { const t = tr.byKey.get(s.key) || {}, on = st.mxSku === s.key;
      return `<tr class="click${on ? ' on' : ''}" tabindex="0" data-trow="${esc(s.key)}" title="${esc(T.rowTip(nm(s)))}"><td class="nm"><b>${esc(nm(s))}</b></td>` + tr.months.map(mm => { const x = t[mm];
        const a = x && x.ach, tip = x ? T.cellTip(nm(s), R.monthName(mm), val(x.actual), val(x.target), a == null ? C.common.none : R.pct(a), mm === cur) : '';
        return `<td class="trc ${cls(a)}${mm === cur ? ' mtd' : ''}${mm === em ? ' em' : ''}" data-m="${mm}"${a == null ? '' : ` data-ach="${a}"`} title="${esc(tip)}">${a == null ? '' : esc(R.pct(a))}</td>`; }).join('') + `</tr>`; }).join('');
    box.innerHTML = head + `<div class="tablewrap trwrap"><table class="tbl trtbl"><thead><tr><th>${esc(T.sku)}</th>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* ---------- Expenses (CR-09 §4.4 · CR-11 §5.4): the bar · Budget vs Actual by month | Spend by group · Budget by line (Marketing ▸ Sales ▸ Other, folded) · the requests ---------- */
  const GROUPS = ['marketing', 'sales', 'other'];
  /* the status of a line or a group: Over (> 100%) · Near budget (90 – 100% while the campaign runs) · OK — R.budgetStatus without "Spending ahead" */
  const lineSt = (used, ended) => { const s = R.budgetStatus(used, null, ended); return s === 'over' || s === 'ended_over' ? 'over' : s === 'near' ? 'near' : used == null ? null : 'ok'; };
  function trackOf(c) { return R.budgetTrack(U.seed(), Object.assign(pnlCtx(c), {})).rows[0] || null; }
  function renderBudget(c) {
    const t = trackOf(c), plan = plans()[c.id], reqs = ((plan && plan.requests) || []).slice().reverse(), Q = C.req, B = M0.bud;
    $('m_body').innerHTML = (t ? `<div class="card" id="m_bbar"><div class="card-head"><h3>${labelInfo(C.track.block.title, C.track.block.tip)}</h3></div><div class="bblk"><div class="bbv"><b>${esc(R.baht(t.committed))}</b> <span class="muted">${esc(C.track.of(R.baht(t.current)))}</span></div>${U.budgetBar(t)}<div class="muted small">${esc(U.budgetCap(t))}</div>` +
      `<div class="legend bbleg"><span><i class="sw com"></i>${esc(C.track.legend.com)}</span><span><i class="sw rem"></i>${esc(C.track.legend.rem)}</span><span><i class="sw pend"></i>${esc(C.track.legend.pend)}</span><span><i class="sw tick"></i>${esc(C.track.legend.tick)}</span></div></div></div>` +
      `` : `<div class="card"><div class="c3-empty">${esc(C.track.noBudget(''))}</div></div>`) +
      /* CR-11 §5.4 — Budget · by month | Spend by group · Budget by line · the requests */
      `<div class="r31"><div class="card" id="m_bva"></div><div class="card" id="m_grp"></div></div>` + (t ? `<div class="card" id="m_lines"></div>` : '') +
      `<div class="card"><div class="card-head"><h3>${esc(B.requests)} <span class="hnote">${reqs.length}</span></h3><div class="ctl"><a class="link" href="#planning/approvals">${esc(B.toApprovals)}</a></div></div>` +
      (reqs.length ? `<div class="tablewrap"><table class="tbl simple reqtbl"><thead><tr><th>${esc(Q.cols.no)}</th><th>${esc(Q.cols.type)}</th><th>${esc(Q.cols.reason)}</th><th class="num">${esc(Q.cols.amount)}</th><th>${esc(Q.cols.by)}</th><th>${esc(Q.cols.status)}</th></tr></thead><tbody>` +
        reqs.map(q => `<tr><td>#${q.no}</td><td>${esc(Q.type[q.type] || q.type)}</td><td class="wrap">${esc(q.reason)}</td><td class="num"><b class="${R.sumLines(q.lines) < 0 ? 'neg' : ''}">${esc(R.signedShort(R.sumLines(q.lines)))}</b></td><td>${esc(q.by)}</td><td>${U.apChip(q.status)}</td></tr>`).join('') + '</tbody></table></div>'
        : `<div class="c3-empty">${esc(Q.none)}</div>`) + '</div>';
    if (t) renderLines(c, t); renderBva(); renderGrp();
  }
  function renderLines(c, t) {
    const box = $('m_lines'); if (!box) return;
    const L = M0.lines, Kc = L.cols, tg = R.timeGone(c, td()), ended = td() > c.end, open = new Set(st.bgOpen);
    const chip = s => (s ? `<span class="lst ${esc(s)}">${esc(L.st[s])}</span>` : '');
    const cells = x => `<td class="num">${esc(R.baht(x.current))}</td><td class="num">${esc(R.baht(x.committed))}</td><td>${x.current > 0 ? U.paceBar(x.used, tg, x.used > 1 ? 'over' : 'ok', 70) : none()}</td>` +
      `<td class="num${x.remaining < -0.5 ? ' neg' : ''}">${esc(R.baht(x.remaining))}</td><td>${chip(lineSt(x.used, ended))}</td>`;
    const groups = GROUPS.map(g => { const ls = t.lines.filter(l => l.type === g); if (!ls.length) return '';
      const sum = k => ls.reduce((s, l) => s + (l[k] || 0), 0), G = { current: sum('current'), committed: sum('committed') }; G.remaining = G.current - G.committed; G.used = R.ratio(G.committed, G.current);
      const isO = open.has(g), name = C.plan.grid.groups[g];
      return `<tr class="grp" data-bgrow="${g}"><td class="nm"><span class="bnm"><button type="button" class="chev" data-bgopen="${g}" aria-expanded="${isO}" aria-label="${esc((isO ? L.collapse : L.expand)(name))}">${ICON.chevronDown}</button><b>${esc(name)}</b> <span class="muted small">${ls.length}</span></span></td>${cells(G)}</tr>` +
        (isO ? ls.slice().sort((a, b) => (b.used ?? -1) - (a.used ?? -1) || b.current - a.current).map(l => `<tr class="sub" data-bline="${esc(g)}"><td class="lbl">${esc(l.line)}</td>${cells(l)}</tr>`).join('') : ''); }).join('');
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(L.title, L.tip)}</h3><div class="ctl"><div class="legend"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(Kc.used)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(L.st.over)}</span><span><i class="tick"></i>${esc(C.yr.timeGone)}</span></div>` +
      `<button type="button" class="btn small" data-dl="c_lines">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      `<div class="tablewrap" style="margin-top:8px"><table class="tbl port wtbl btbl mlines"><thead><tr><th>${esc(Kc.line)}</th><th class="num">${esc(Kc.current)}</th><th class="num">${esc(Kc.spent)}</th><th>${esc(Kc.used)}</th><th class="num">${esc(Kc.remaining)}</th><th>${esc(Kc.status)}</th></tr></thead>` +
      `<tbody>${groups}<tr class="total"><td>${esc(C.common.total)}</td>${cells(t)}</tr></tbody></table></div>`;
  }
  function renderBva() {
    const box = $('m_bva'), c = byId(st.cid); if (!box || !c) return;
    const M = D.m, md = R.byMonth(U.seed(), pnlCtx(c), 'spend'), o = { mode: st.bva, stack: [{ k: 'mkt', color: '--mkt', label: M.legend.mkt }, { k: 'sls', color: '--sls', label: M.legend.sls }, { k: 'oth', color: '--oth', label: M.legend.oth }], good: 'down', planWord: M.legend.budget, lflWord: M.tip.budgetLfl, h: 300 };
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(C.wf.bva.title, C.wf.bva.tip)}</h3><div class="ctl"><div class="legend">${U.monthLegend(o)}</div>${segHTML('data-mbva', [{ v: 'monthly', label: M.monthly }, { v: 'cumulative', label: M.cumulative }], st.bva)}</div></div>` +
      `<div class="chartbox" id="mb_box"><svg id="mb_svg" role="img" aria-label="${esc(C.wf.bva.title)}"></svg><div class="tip" id="mb_tip"></div></div>`;
    U.monthChart($('mb_svg'), $('mb_box'), $('mb_tip'), md, o);
  }
  /* Spend by group (1/3): the donut of CR-08 §6.5 — Marketing · Sales · Other */
  const grpOf = c => { const t = trackOf(c), G = C.plan.grid.groups, tok = { marketing: '--mkt', sales: '--sls', other: '--oth' }; if (!t) return { tot: 0, slices: [] };
    const sl = GROUPS.map(g => ({ key: g, label: G[g], value: t.lines.filter(l => l.type === g).reduce((s, l) => s + (l.committed || 0), 0), color: tok[g] })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
    const tot = sl.reduce((s, x) => s + x.value, 0); sl.forEach(x => { x.tip = C.sb.chmix.slice(x.label, R.baht(x.value), R.pct(tot ? x.value / tot : null, 1)); }); return { tot, slices: sl }; };
  function renderGrp() {
    const box = $('m_grp'), c = byId(st.cid); if (!box || !c) return;
    const K9 = C.sb.grp, g = grpOf(c), head = `<div class="card-head"><h3>${labelInfo(K9.title, K9.tip)}</h3></div>`;
    if (!g.slices.length) { box.innerHTML = head + `<div class="c3-empty">${esc(D.k.noSpend)}</div>`; return; }
    box.innerHTML = head + `<div class="c3-body dbody">${U.donutHTML({ id: 'mg_dn', label: K9.title, slices: g.slices, total: g.tot, cols: [K9.cols.group, K9.cols.spent, K9.cols.share] })}</div>`;
    U.drawDonut({ id: 'mg_dn', slices: g.slices, total: g.tot, center: R.shortBaht(g.tot), size: 150 });
  }

  /* ---------- P&L (CR-09 §4.5 · CR-11 §5.2 — D104): KPI · the waterfall LEFT | the statement RIGHT (as the Dashboard) · Where each ฿100 of sales goes ·
     Cumulative profit by month (Break-even) · Sales vs Marketing by month ---------- */
  function renderPnl(c) {
    $('m_body').innerHTML = `<div class="kpis" id="m_pkpis"></div><div class="r2 pl2"><div class="card" id="m_wf"></div><div class="card" id="m_st"></div></div>` +
      `<div class="card" id="m_p100"></div><div class="card" id="m_cum"></div><div class="card" id="m_svm"></div>`;
    const k = kpiCards(c); $('m_pkpis').innerHTML = k.rev + k.gp + k.exp + k.pro;
    renderWf(); $('m_st').innerHTML = CP.pnl.statementHTML(pnlCtx(c)); $('m_p100').innerHTML = U.p100Card(p100Of(c)); renderCum(c); renderSvm();
  }
  function renderWf() { const c = byId(st.cid), box = $('m_wf'); if (c && box) CP.pnl.waterfallCard(box, pnlCtx(c), st.side); }
  /* Where each ฿100 of sales goes (CR-10 §3.2 — the card of Overview): the statement of this Campaign (Actual to date · Plan full) */
  const p100Of = c => R.per100(R.statement(U.seed(), pnlCtx(c), c.id, 'full'));
  /* Cumulative profit by month: the bars = the Campaign profit of each month (a loss red · the month in progress hatched) · the line = the running Actual · the dashed line
     = the running Plan · Break-even = the first month the running Actual is ≥ 0 (a ring + its label) · not yet = ฿x to break even · the running Actual of the last month =
     the Campaign profit of the KPI (R.profitByMonth) */
  function cumData(c) { const [from, to] = spanOf(c); return R.profitByMonth(U.seed(), c.id, { months: R.monthsIn(from, to), today: td() }); }
  function cumWords(d) {
    const T = M0.cum, plan = d.beP ? `<span>·</span><span class="muted">${esc(T.planBe(R.monthName(d.beP)))}</span>` : '';
    if (d.lastA < 0) return `<span class="noa">${esc(C.empty.card)}</span>${plan}`;
    return (d.be ? `<b class="good" data-be="${d.be}">${esc(T.be(R.monthName(d.be)))}</b>` : `<b class="bad" data-be="">${esc(T.notYet(R.shortBaht(-d.total)))}</b>`) + plan;
  }
  function renderCum(c) {
    const box = $('m_cum'); if (!box || !c) return;
    const T = M0.cum, d = cumData(c), table = st.cumView === 'table', sw = (cls, color, t) => `<span><i class="${cls}" style="--sw:${color}"></i>${esc(t)}</span>`;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl">${table ? '' : `<div class="legend">${sw('bar', 'var(--ok)', T.profit)}${sw('bar', 'var(--err)', T.loss)}${sw('hatch', 'var(--ok)', D.m.legend.mtd)}` +
      `${sw('ln', 'var(--text)', T.runA)}<span><i class="ln dash" style="--sw:var(--text-2)"></i>${esc(T.runP)}</span><span><i class="ring"></i>${esc(T.beL)}</span></div>`}` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="cumView" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      `<div class="sumline" data-cumsum>${cumWords(d)}</div>` +
      (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('c_cum', ctx()), 'c_cum')}</div>` : `<div class="chartbox" id="mc_box"><svg id="mc_svg" role="img" aria-label="${esc(T.title)}"></svg><div class="tip" id="mc_tip"></div></div>`);
    if (!table) drawCum();
  }
  function drawCum() {
    const c = byId(st.cid), box = $('mc_box'), svg = $('mc_svg'), tip = $('mc_tip'); if (!c || !box || !svg) return;
    const T = M0.cum, d = cumData(c), rows = d.rows, n = rows.length, cur = R.ym(td()), css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    tip.classList.remove('show');
    const W = Math.max(300, Math.round(box.clientWidth || 800)), H = 300, m = { l: 72, r: 12, t: 34, b: 52 }, ih = H - m.t - m.b;
    const vals = rows.flatMap(r => [r.actual, r.cumActual, r.cumPlan]).filter(R.isNum).concat([0]);
    const hi = Math.max(...vals), lo = Math.min(...vals), stp = R.niceStep((hi - lo) / 4 || 1), yMax = hi > 0 ? stp * Math.ceil(hi * 1.06 / stp) : 0, yMin = lo < 0 ? -stp * Math.ceil(-lo * 1.06 / stp) : 0;
    const yt = []; for (let v = yMin; v <= yMax + 1e-6; v += stp) yt.push(v);
    const axf = v => U.trimMoney(R.compact(Math.abs(v) < 1e-6 ? 0 : v)); m.l = U.axisLeft(svg, yt.map(axf));
    const iw = W - m.l - m.r, band = iw / Math.max(1, n), bw = Math.max(5, Math.min(40, band * 0.46)), cx = i => m.l + band * i + band / 2, y = v => m.t + (yMax - v) / (yMax - yMin || 1) * ih;
    const cOk = css('--ok'), cErr = css('--err'), cInk = css('--text'), cPl = css('--text-2'), cGrid = css('--grid'), cAxis = css('--border-strong'), cSurf = css('--surface');
    const pat = (id, col) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${cSurf}"/><rect width="2.2" height="7" fill="${col}"/></pattern>`;
    let g = `<defs>${pat('mc_hok', cOk)}${pat('mc_herr', cErr)}</defs>`;
    yt.forEach(v => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${cGrid}"/><text x="${m.l - 10}" y="${y(v) + 4.5}" text-anchor="end" class="axis">${esc(axf(v))}</text>`; });
    let bars = '', labels = '';
    rows.forEach((r, i) => { if (R.isNum(r.actual)) { const neg = r.actual < 0, mtd = r.m === cur, t = Math.min(y(0), y(r.actual)), h = Math.max(1, Math.abs(y(r.actual) - y(0)));
        bars += `<rect x="${(cx(i) - bw / 2).toFixed(1)}" y="${t.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${mtd ? `url(#mc_h${neg ? 'err' : 'ok'})` : neg ? cErr : cOk}"${mtd ? ` stroke="${neg ? cErr : cOk}"` : ''} data-mprofit="${r.actual}"/>`; }
      const every = Math.max(1, Math.ceil(34 / band));
      if (!(i % every)) labels += `<text x="${cx(i)}" y="${m.t + ih + 20}" text-anchor="middle" class="mon${r.m === cur ? ' cur' : ''}">${esc(R.monthShort(r.m))}</text>`;
      if (i === 0 || r.m.slice(0, 4) !== rows[i - 1].m.slice(0, 4)) labels += `<text x="${cx(i)}" y="${m.t + ih + 36}" text-anchor="middle" class="yr">${r.m.slice(0, 4)}</text>`; });
    const path = (key, upto) => rows.map((r, i) => (i <= upto && R.isNum(r[key]) ? [cx(i), y(r[key])] : null)).filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const pp = path('cumPlan', n - 1), pa = path('cumActual', d.lastA);
    let lines = (pp ? `<path d="${pp}" fill="none" stroke="${cPl}" stroke-width="2" stroke-dasharray="6 4" data-cumplan="${R.isNum(d.planTotal) ? d.planTotal : ''}"/>` : '') +
      (pa ? `<path d="${pa}" fill="none" stroke="${cInk}" stroke-width="2.5" data-cumact="${R.isNum(d.total) ? d.total : ''}"/>` + rows.map((r, i) => (i <= d.lastA && R.isNum(r.cumActual) ? `<circle cx="${cx(i).toFixed(1)}" cy="${y(r.cumActual).toFixed(1)}" r="3" fill="${cInk}"/>` : '')).join('') : '');
    /* Break-even: a ring on the running Actual + its label (it stays inside the plot) */
    const bi = d.be ? rows.findIndex(r => r.m === d.be) : -1;
    if (bi >= 0) { const bx = cx(bi), by = y(rows[bi].cumActual), t = T.be(R.monthName(d.be)), w = U.textW(svg, [t], 'blab'), lx = Math.max(m.l + 2, Math.min(bx - w / 2, W - m.r - w - 2)), ly = by - 14 < m.t + 4 ? by + 22 : by - 14;
      lines += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="7" fill="none" stroke="${cOk}" stroke-width="2.5" data-bering="${d.be}"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="blab" fill="${cOk}">${esc(t)}</text>`; }
    const ci = rows.findIndex(r => r.m === cur);
    const now = ci >= 0 ? (() => { const dd = +td().slice(8, 10), nd = +R.monthLast(cur).slice(8, 10), tx = m.l + band * ci + band * ((dd - 0.5) / nd);
      return `<line x1="${tx.toFixed(1)}" x2="${tx.toFixed(1)}" y1="${m.t - 10}" y2="${m.t + ih}" stroke="${css('--today')}" stroke-width="1.6" stroke-dasharray="5 4"/><text x="${(tx + 5).toFixed(1)}" y="${m.t - 2}" class="today-l">${esc(D.m.today)}</text>`; })() : '';
    const hits = rows.map((r, i) => `<rect class="hit" data-i="${i}" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}" tabindex="0" aria-label="${esc(R.monthName(r.m))}"/>`).join('');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = g + `<g>${hits}</g><g style="pointer-events:none">${bars}<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${cAxis}"/>${lines}</g>` + labels + now;
    const show = i => { const r = rows[i]; tip.textContent = '';
      const add = (cls, text) => { const e = document.createElement('div'); e.className = cls; e.textContent = text; tip.appendChild(e); return e; };
      const row = (l, v, cls) => { const e = add('r', ''); const a = document.createElement('span'); a.textContent = l; const b = document.createElement('b'); b.textContent = v; if (cls) b.className = cls; e.appendChild(a); e.appendChild(b); };
      add('h', R.monthName(r.m) + (r.m === cur ? ` · ${D.m.tip.mtd}` : ''));
      row(T.month, R.isNum(r.actual) ? R.baht(r.actual) : C.common.none, R.isNum(r.actual) && r.actual < 0 ? 'bad' : '');
      row(T.runA, i <= d.lastA && R.isNum(r.cumActual) ? R.baht(r.cumActual) : C.common.none, i <= d.lastA && r.cumActual < 0 ? 'bad' : '');
      row(T.planM, R.isNum(r.plan) ? R.baht(r.plan) : C.common.none); row(T.runP, R.isNum(r.cumPlan) ? R.baht(r.cumPlan) : C.common.none);
      if (r.m === d.be) add('d', T.be(R.monthName(d.be)));
      const bxr = box.getBoundingClientRect(), sc = bxr.width / W; let left = cx(i) * sc + 14; if (left + 240 > bxr.width) left = cx(i) * sc - 254;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = (m.t + 4) + 'px'; tip.classList.add('show'); };
    svg.querySelectorAll('.hit').forEach(h => { const i = +h.dataset.i; h.addEventListener('pointerenter', () => show(i)); h.addEventListener('focus', () => show(i));
      h.addEventListener('pointerleave', () => tip.classList.remove('show')); h.addEventListener('blur', () => tip.classList.remove('show')); });
  }
  /* the months: the bar = Marketing spent (the Budget tab's Marketing) · the line = Net revenue (the Sales tab's actual) */
  function svmData(c) {
    const sp = R.byMonth(U.seed(), pnlCtx(c), 'spend'), rv = R.targetByMonth(U.seed(), c.id, { unit: 'amount', today: td() }), rev = new Map(rv.rows.map(r => [r.m, r.actual]));
    const rows = sp.rows.map(r => ({ m: r.m, plan: null, actual: r.mkt == null ? (r.actual == null ? null : 0) : r.mkt, lfl: null, variance: null, rev: rev.has(r.m) ? rev.get(r.m) : null }));
    return { rows, cum: rows, measure: 'spend', toDate: null };
  }
  function renderSvm() {
    const box = $('m_svm'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.svm, e = R.mktEfficiency(U.seed(), Object.assign(pnlCtx(c), { statuses: R.STATUSES.slice(), includeCancelled: true })).byId.get(c.id) || {}, dr = R.afterMarketingDrop(U.seed(), c.id, td());
    const o = { mode: 'monthly', color: '--mkt', good: 'down', noPlan: true, actualWord: T.bars, planWord: '', h: 300, line: { key: 'rev', color: '--rev', label: T.line, full: R.baht },
      vlines: c.end_marketing ? [{ date: c.end_marketing, label: M0.burn2.endMkt }] : [] };
    const sum = `<span>${esc(T.eff(R.times(e.actual), R.times(e.plan)))}</span><span>·</span>` + (dr.drop == null ? `<span class="noa">${esc(T.noDrop)}</span>` : `<b class="${dr.drop < 0 ? 'bad' : 'good'}">${esc(T.drop((dr.drop > 0 ? '+' : '') + R.pct(dr.drop)))}</b>`);
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><div class="legend">${U.monthLegend(o)}</div><button type="button" class="btn small" data-dl="c_svm">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      `<div class="sumline" data-svmsum>${sum}</div><div class="chartbox" id="ms_box"><svg id="ms_svg" role="img" aria-label="${esc(T.title)}"></svg><div class="tip" id="ms_tip"></div></div>`;
    U.comboChart($('ms_svg'), $('ms_box'), $('ms_tip'), svmData(c), o);
  }
  /* ---------- History: the log of the plan (an icon a kind) · Compare v1 ↔ v2 when there are versions ---------- */
  /* CR-13 §6 — the history helper of the Campaign page (U.historyHTML): filters All · Approvals · Changes · Budget · Steps · Compare · Open request */
  let hf = 'all';
  function renderHistory(c) {
    const plan = plans()[c.id], vs = ((plan && plan.versions) || []).filter(v => v.status !== 'draft'), H = M0.hist2;
    const cmp = vs.slice(1).map((v, i) => `<button type="button" class="link" data-cmp="${vs[i].v}|${v.v}">${esc(H.compare(vs[i].v, v.v))}</button>`).join(' · ');
    $('m_body').innerHTML = `<div class="card"><div class="card-head"><h3>${esc(M0.tabs.history)}</h3><div class="ctl">${cmp}<a class="link" href="#planning/${esc(c.id)}/history">${esc(M0.viewPlan)}</a></div></div><div id="m_hist">${U.historyHTML(plan, { filter: hf })}</div></div>`;
  }
  function openCompare(a, b) {
    const c = byId(st.cid), plan = plans()[st.cid], va = plan && plan.versions.find(v => v.v === a), vb = plan && plan.versions.find(v => v.v === b); if (!va || !vb) return;
    U.openDialog(`<div class="dlg-h">${esc(M0.hist2.compareTitle(c.name, a, b))}</div><div class="dlg-b">${CP.cpage.diffHTML(R.planDiff(va, vb), a, b)}</div><div class="dlg-f"><button type="button" class="btn" data-dlgclose>${esc(M0.hist2.close)}</button></div>`, true);
    const d = $('dlg'), cl = d.querySelector('[data-dlgclose]'); if (cl) cl.addEventListener('click', () => U.closeDialog());
  }

  /* ---------- Export: the tabs of Campaign Tracking (registered here: c_kpi · c_mix · c_channel · c_matrix · c_lines · c_svm · CR-11: c_pkpi · c_p100 · c_cum · c_subs · c_trend) ---------- */
  X.register('c_kpi', x => { const c = byId(x.cid); if (!c) return { key: 'c_kpi', title: D.file.c_kpi, header: ['Metric', 'Value', 'Of', '%'], cols: ['text', 'money', 'money', 'pct'], rows: [] };
    const { A, Pl, F, sp, b } = nums(c), Kk = M0.k9;
    return { key: 'c_kpi', title: D.file.c_kpi, header: [C.xl.metric, C.xl.value, C.xl.of, '%', C.xl.note], cols: ['text', 'money', 'money', 'pct', 'text'],
      rows: [[Kk.revenue, A.rev, Pl.rev, R.ratio(A.rev, Pl.rev), `${C.yr.timeGone} ${R.pct(sp && sp.timeGone)} · ${paceWord(sp && sp.status)}${sp && sp.pace != null ? ` · Pace ${R.paceText(sp.pace)}` : ''}`],
        [Kk.budget, b ? b.spent : null, b ? b.current : null, b ? b.used : null, b && b.status ? C.yr.st[b.status] : ''], [Kk.profit, A.profit, Pl.profit, R.ratio(A.profit, Pl.profit), Kk.profitCap(R.pct(A.margin), R.times(A.roi))],
        [Kk.fc, F.rev, Pl.rev, R.ratio(F.rev, Pl.rev), C.xl.profitOf(R.baht(F.profit))]] }; });
  X.register('c_mix', x => { const c = byId(x.cid), X9 = M0.mix, m = c ? R.salesMix(x.seed, c.id, { unit: x.unit, today: x.today }) : { channels: [] };
    return { key: 'c_mix', title: X9.title, header: [M0.chT.cols.channel, C.camp.m.target, X9.target, U.actualWord(), X9.actual], cols: ['text', 'money', 'pct', 'money', 'pct'],
      rows: m.channels.map(r => [C.channel[r.channel], r.target, r.tShare, r.actual, r.aShare]).concat(m.channels.flatMap(r => r.subs.map(s => [`    ${C.channel[r.channel]} · ${s.sub}`, null, null, s.actual, s.share]))) }; });
  X.register('c_channel', x => { const c = byId(x.cid), T = M0.chT, Kc = T.cols; if (!c) return { key: 'c_channel', title: T.title, header: [Kc.channel], rows: [] };
    const a = R.attainment(x.seed, c.id, { channel: x.channel, unit: x.unit, today: x.today }), tg = R.timeGone(c, x.today), tot = a.total.actTD;
    const line = (name, n) => { const p = R.paceNode(n, tg); return [name, n.actTD, tot ? (n.actTD || 0) / tot : null, n.target, p.achF, p.gapPace, n.remaining, p.status ? C.yr.st[p.status] : '', n.tgtTD]; };
    return { key: 'c_channel', title: T.title, header: [Kc.channel, Kc.actual, Kc.share, Kc.full, Kc.ach, Kc.gap, Kc.remaining, Kc.status, C.money.tgtTD.h], cols: ['text', 'money', 'pct', 'money', 'pct', 'money', 'money', 'text', 'money'],
      rows: a.channels.map(r => line(C.channel[r.channel], r.node)), total: line(K.total, a.total) }; });
  X.register('c_matrix', x => { const c = byId(x.cid), T = M0.mx; if (!c) return { key: 'c_matrix', title: T.title, header: [T.cols.sku], rows: [] };
    const { m, rows, nm } = mxRows(c);
    return { key: 'c_matrix', title: T.title, header: [T.cols.sku, C.xl.code].concat(m.channels.map(k => C.xl.chActual(C.channel[k])), m.channels.map(k => `${C.channel[k]} Ach %`), [T.cols.total, T.cols.share, T.cols.rank, T.cols.ach, T.cols.status]),
      cols: ['text', 'text'].concat(m.channels.map(() => 'money'), m.channels.map(() => 'pct'), ['money', 'pct', 'num', 'pct', 'text']),
      rows: rows.map(s => [{ v: nm(s), bold: true }, s.product.code || ''].concat(m.channels.map(k => (s.byCh[k] ? s.byCh[k].actual : null)), m.channels.map(k => (s.byCh[k] ? s.byCh[k].achF : null)), [s.total.actual, s.total.share, s.rank, s.total.achF, s.total.status ? C.yr.st[s.total.status] : ''])),
      total: [T.total, ''].concat(m.channels.map(k => (m.byCh[k] ? m.byCh[k].actual : null)), m.channels.map(k => (m.byCh[k] ? m.byCh[k].achF : null)), [m.total.actual, m.total.actual ? 1 : null, null, m.total.achF, m.total.status ? C.yr.st[m.total.status] : '']) }; });
  X.register('c_lines', x => { const c = byId(x.cid), L = M0.lines, Kc = L.cols, t = c ? trackOf(c) : null; if (!t) return { key: 'c_lines', title: L.title, header: [Kc.line], rows: [] };
    const ended = x.today > c.end, line = (n, z, b) => [{ v: n, bold: b }, z.current, z.committed, z.used, z.remaining, (L.st[lineSt(z.used, ended)] || '')];
    return { key: 'c_lines', title: L.title, header: [Kc.line, Kc.current, Kc.spent, Kc.used, Kc.remaining, Kc.status], cols: ['text', 'money', 'money', 'pct', 'money', 'text'],
      rows: GROUPS.flatMap(g => { const ls = t.lines.filter(l => l.type === g); if (!ls.length) return []; const s = k => ls.reduce((a, l) => a + (l[k] || 0), 0), G = { current: s('current'), committed: s('committed') }; G.remaining = G.current - G.committed; G.used = R.ratio(G.committed, G.current);
        return [line(C.plan.grid.groups[g], G, true)].concat(ls.slice().sort((a, b) => (b.used ?? -1) - (a.used ?? -1)).map(l => line(`    ${l.line}`, l, false))); }), total: line(C.common.total, t, true) }; });
  X.register('c_svm', x => { const c = byId(x.cid), T = M0.svm; if (!c) return { key: 'c_svm', title: T.title, header: [C.xl.month], rows: [] };
    const d = svmData(c), e = R.mktEfficiency(x.seed, Object.assign(pnlCtx(c), { statuses: R.STATUSES.slice(), includeCancelled: true })).byId.get(c.id) || {}, dr = R.afterMarketingDrop(x.seed, c.id, x.today);
    return { key: 'c_svm', title: T.title, header: [D.m.cols.month, T.bars, T.line], cols: ['text', 'money', 'money'], rows: d.rows.map(r => [R.monthName(r.m), r.actual, r.rev]),
      notes: [T.eff(R.times(e.actual), R.times(e.plan)), dr.drop == null ? T.noDrop : T.drop((dr.drop > 0 ? '+' : '') + R.pct(dr.drop))] }; });
  /* CR-11 — P&L KPI · ฿100 · Cumulative profit by month · Sub-channel share · SKU trend */
  X.register('c_pkpi', x => { const c = byId(x.cid), PK = C.pl.k; if (!c) return { key: 'c_pkpi', title: D.file.c_pkpi, header: [C.xl.metric], rows: [] };
    const { A, Pl } = nums(c);
    return { key: 'c_pkpi', title: D.file.c_pkpi, header: [C.xl.metric, C.xl.actualTD, C.xl.planFull, C.xl.pctOfPlan, C.xl.note], cols: ['text', 'money', 'money', 'pct', 'text'],
      rows: [[PK.revenue, A.rev, Pl.rev, R.ratio(A.rev, Pl.rev), ''], [PK.gp, A.gp, Pl.gp, R.ratio(A.gp, Pl.gp), PK.gpCap(R.pct(A.gpPct), R.pct(Pl.gpPct))],
        [PK.exp, A.spend, Pl.spend, R.ratio(A.spend, Pl.spend), PK.expCap(R.pct(A.ap), R.pct(R.ratio(Pl.spend, Pl.rev)))], [PK.profit, A.profit, Pl.profit, R.ratio(A.profit, Pl.profit), PK.profitCap(R.pct(A.margin), R.times(A.roi))]] }; });
  X.register('c_p100', x => { const c = byId(x.cid), T = D.p100; if (!c) return { key: 'c_p100', title: T.title, header: [C.xl.part], rows: [] };
    /* the rows of Overview's sheet (o_p100): ฿ of each ฿100, 1 decimal */
    const p = p100Of(c), keys = ['cogs', 'mkt', 'sls', 'oth', 'profit'];
    return { key: 'c_p100', title: T.title, header: ['', ...keys.map(k => T.parts[k])], cols: ['text', 'num', 'num', 'num', 'num', 'num'],
      rows: [p.actual, p.plan].map((s, i) => [i ? T.plan : T.actual, ...keys.map(k => (s ? Math.round(s[k] * 10) / 10 : null))]) }; });
  X.register('c_cum', x => { const c = byId(x.cid), T = M0.cum; if (!c) return { key: 'c_cum', title: T.title, header: [C.xl.month], rows: [] };
    const d = cumData(c);
    return { key: 'c_cum', title: T.title, header: [D.m.cols.month, T.month, T.runA, T.planM, T.runP], cols: ['text', 'money', 'money', 'money', 'money'],
      rows: d.rows.map((r, i) => [R.monthName(r.m) + (r.m === d.be ? ` · ${T.beL}` : ''), r.actual, i <= d.lastA ? r.cumActual : null, r.plan, r.cumPlan]),
      notes: [d.lastA < 0 ? C.empty.card : d.be ? T.be(R.monthName(d.be)) : T.notYet(R.shortBaht(-d.total))].concat(d.beP ? [T.planBe(R.monthName(d.beP))] : []) }; });
  X.register('c_subs', x => { const c = byId(x.cid), T = M0.subs; if (!c) return { key: 'c_subs', title: T.title, header: [C.xl.channel], rows: [] };
    const m = R.salesMix(x.seed, c.id, { unit: x.unit, today: x.today });
    return { key: 'c_subs', title: T.title, header: [M0.chT.cols.channel, T.sub, U.actualWord(), T.shareH], cols: ['text', 'text', 'money', 'pct'],
      rows: m.channels.filter(r => r.subs.length && r.actual > 0).flatMap(r => [[{ v: C.channel[r.channel], bold: true }, '', r.actual, 1]].concat(subsParts(r).map(p => ['', p.list ? `${p.name} (${p.list.join(', ')})` : p.name, p.actual, p.share]))) }; });
  X.register('c_trend', x => { const c = byId(x.cid), T = M0.trend; if (!c) return { key: 'c_trend', title: T.title, header: [T.sku], rows: [] };
    const tr = R.skuTrend(x.seed, c.id, { unit: x.unit, channel: x.channel, today: x.today }), { rows, nm } = mxRows(c, { all: true });
    return { key: 'c_trend', title: T.title, header: [T.sku, C.xl.code].concat(tr.months.map(R.monthName)), cols: ['text', 'text'].concat(tr.months.map(() => 'pct')),
      rows: rows.map(s => { const t = tr.byKey.get(s.key) || {}; return [{ v: nm(s), bold: true }, s.product.code || ''].concat(tr.months.map(mm => (t[mm] ? t[mm].ach : null))); }),
      notes: [T.note] }; });

  /* ---------- events ---------- */
  const scopeText = () => { const c = byId(st.cid); return `${c ? c.name : ''}${ch() && st.tab === 'sales' ? ' ' + ch() : ''}`; };
  const meta = () => { const c = byId(st.cid); return P.metaRows([[D.meta.tab, `${M0.title} › ${M0.tabs[st.tab]}`], [D.meta.campaign, c ? `${c.name} · ${R.dmy(c.start)} – ${R.dmy(c.end)}` : ''], [D.meta.channel, ch() ? C.channel[ch()] : K.all]]); };
  function onClick(e) {
    const t = e.target;
    if (P.onShowTarget(e, TAB, renderAll)) return;
    const mt = t.closest('[data-mtab]'); if (mt) { e.preventDefault(); stick.toTop(); go(st.cid, mt.dataset.mtab); return; }
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.campaign, scopeText(), X.tabTables('tracking', ctx()), meta()); return; }
    /* CR-11 §5.3 — a row of SKU trend: the matrix of that SKU only (again = all) · Show all */
    const trw = t.closest('[data-trow]'); if (trw) { st.mxSku = st.mxSku === trw.dataset.trow ? '' : trw.dataset.trow; save(); renderMatrix(); renderTrend();
      const again = el.querySelector(`[data-trow="${CSS.escape(trw.dataset.trow)}"]`); if (again) again.focus({ preventScroll: true }); if (st.mxSku) { const b = $('m_mx'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    const ms1 = t.closest('[data-mxsku]'); if (ms1) { st.mxSku = ''; save(); renderMatrix(); renderTrend(); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl] || dl.dataset.dl, scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    if (t.closest('[data-mreq]')) { CP.reqdraw.open(st.cid); return; }
    if (t.closest('[data-gosku]')) { st.mxTab = 'behind'; st.channel = 'all'; st.mxSku = ''; save(); go(st.cid, 'sales'); setTimeout(() => { const b = $('m_mx'); if (b) b.scrollIntoView({ block: 'start' }); }, 80); return; }
    const hfb = t.closest('[data-hfilter]'); if (hfb) { hf = hfb.dataset.hfilter; const b2 = $('m_hist'); if (b2) b2.innerHTML = U.historyHTML(plans()[st.cid], { filter: hf }); return; }
    const orq = t.closest('[data-openreq]'); if (orq) { CP.review.open({ kind: 'request', id: st.cid, no: +orq.dataset.openreq }); return; }
    const cp = t.closest('[data-cmp]'); if (cp) { const [a, b] = cp.dataset.cmp.split('|').map(Number); openCompare(a, b); return; }
    const sb = t.closest('[data-step]'); if (sb) { step(+sb.dataset.step); return; }
    const pn = CP.pnl.onClick(e, st); if (pn) { save(); const c = byId(st.cid); if (pn === 'st') $('m_st').innerHTML = CP.pnl.statementHTML(pnlCtx(c)); return; }
    const ws = t.closest('.seg[data-wside] button'); if (ws) { st.side = ws.dataset.v; save(); renderWf(); return; }
    const bm = t.closest('.seg[data-mbva] button'); if (bm) { st.bva = bm.dataset.v === 'cumulative' ? 'cumulative' : 'monthly'; save(); renderBva(); return; }
    const bg = t.closest('[data-bgopen]'); if (bg) { const s = new Set(st.bgOpen), k = bg.dataset.bgopen; if (s.has(k)) s.delete(k); else s.add(k); st.bgOpen = [...s]; save(); const c = byId(st.cid); renderLines(c, trackOf(c)); const again = el.querySelector(`[data-bgopen="${k}"]`); if (again) again.focus(); return; }
    const vw = t.closest('[data-view]'); if (vw) { const k = vw.dataset.view; st[k] = st[k] === 'table' ? (k === 'mView' ? 'chart' : 'list') : 'table'; save(); ({ mView: renderMonth, chView: renderCh, mxView: renderMatrix, cumView: () => renderCum(byId(st.cid)) })[k](); return; }
    const sg = t.closest('.seg[data-chf] button, .seg[data-unit] button, .seg[data-bmode] button, .seg[data-mby] button, .seg[data-mxseg] button');
    if (sg) { const g = sg.closest('.seg'), v = sg.dataset.v;
      if (g.hasAttribute('data-chf')) { st.channel = oneOf(v, CHS, 'all'); save(); renderSales(byId(st.cid)); return; }
      if (g.hasAttribute('data-unit')) { st.unit = v === 'qty' ? 'qty' : 'amount'; save(); renderSales(byId(st.cid)); return; }
      if (g.hasAttribute('data-mby')) { st.mBy = v === 'channel' ? 'channel' : 'total'; save(); renderMonth(); return; }
      if (g.hasAttribute('data-mxseg')) { st.mxSeg = oneOf(v, ['actual', 'ach', 'share'], 'actual'); save(); renderMatrix(); return; }
      st.mode = v === 'cumulative' ? 'cumulative' : 'monthly'; save(); renderMonth(); return; }
    const tb = t.closest('[data-mxtab]'); if (tb) { st.mxTab = tb.dataset.mxtab; st.mxSku = ''; save(); renderMatrix(); renderTrend(); return; }
    const fd = t.closest('[data-chfold]'); if (fd) { const s = new Set(st.chFolded), k = fd.dataset.chfold; if (s.has(k)) s.delete(k); else s.add(k); st.chFolded = [...s]; save(); renderCh(); }
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-myear]')) { st.year = +t.value; const list = camps().filter(c => yearOf(c) === st.year), o = order().find(id => list.some(c => c.id === id)) || (list[0] || {}).id; if (o) go(o); return; }
    if (t.matches('[data-mxsort]')) { st.mxSort = oneOf(t.value, ['actual', 'gap', 'ach', 'name'], 'actual'); save(); renderMatrix(); renderTrend(); }
  }
  return { render, current: () => st.cid, order, nums, mxRows, svmData, kpiCards, periodOf, cumData, p100Of, subsParts };
})();
