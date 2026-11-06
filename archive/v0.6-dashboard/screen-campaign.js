/* screen-campaign.js — Dashboard › By campaign (CR-02 §7 → CR-04 §11): everything about one Campaign. → CP.tabs.campaign
   #dashboard/campaign/<id> · toolbar Year · Campaign (one, with a search) · ‹ › (the order of Sales › Campaign attainment) · Channel All | MT | TT | ECOM ·
   Export · no period preset (D19: the Campaign's own months) · default (P9): the one seen last · the first of Needs attention · the first by Attention.
   Row 1 KPI (Time left · Net revenue · Required run-rate · Campaign profit) · Row 2 Target vs Actual by month (U.monthChart) · Row 3 Channel attainment ·
   Row 4 SKU attainment · Row 5 P&L statement | Spend by line (CP.pnl — Spend & Profit with Scope = this Campaign, over its own months).
   A Campaign with no Sales actual: one band on top, the sales cards fold to a line (Show target opens them) · Not started: target mode at once. */
CP.tabs.campaign = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, none, statusChip, segHTML } = U;
  const K = C.camp, D = C.dash, TAB = 'campaign';
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);
  const CHS = ['all'].concat(R.CHANNELS);

  const saved = pref.json('camp', {}) || {};
  const st = Object.assign({ cid: '', year: null, channel: 'all', unit: 'amount', mode: 'monthly', mView: 'chart', chSort: 'gap', skuSort: 'gap', skuTab: 'all', chFolded: [], chView: 'list', skuView: 'list',
    basis: 'same', stOpen: [], sl: { type: 'marketing', view: 'chart' } }, saved);
  st.sl = Object.assign({ type: 'marketing', view: 'chart' }, st.sl || {});
  const save = () => pref.setJson('camp', st);
  const camps = () => U.seed().campaigns || [];
  const byId = id => camps().find(c => c.id === id);
  const yearOf = c => c.year || +c.start.slice(0, 4);
  /* P9 — no Campaign seen yet (or not in this data): the first of Needs attention · else the first of Sales › Campaign attainment (Attention) */
  function firstId() {
    const seed = U.seed(), o = P.rng(), att = R.attention(seed, o);
    if (att.length) return att[0].id;
    const t = R.salesTable(seed, o, 'attention'); return t.rows.length ? t.rows[0].c.id : (camps()[0] || {}).id || '';
  }
  /* a Year picked: its On going Campaign with the latest Start (§7) */
  function yearId(year) {
    const td = U.today(), list = camps().filter(c => yearOf(c) === year);
    const on = list.filter(c => R.statusOf(c, td) === 'ongoing').sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0));
    return (on[0] || list[0] || camps()[0] || {}).id || '';
  }
  const ch = () => (st.channel === 'all' ? null : st.channel);
  /* the Campaign's own months (D19): Start … End and every month it has a number in (Production the month before Start) */
  function spanOf(c) {
    const ms = [...(R.model(U.seed()).cells.get(c.id) || new Map()).keys()].concat([R.ym(c.start), R.ym(c.end)]).sort();
    return [R.monthFirst(ms[0]), R.monthLast(ms[ms.length - 1])];
  }
  /* Row 5 = Spend & Profit with Scope = this Campaign (CP.pnl) */
  const pnlCtx = c => { const [from, to] = spanOf(c); return { seed: U.seed(), from, to, statuses: R.STATUSES.slice(), includeCancelled: true, today: U.today(), ids: c.id, basis: st.basis, stOpen: st.stOpen, sl: st.sl, scopeText: c.name }; };
  const ctx = () => { const c = byId(st.cid); return Object.assign(c ? pnlCtx(c) : { seed: U.seed() }, { today: U.today(), cid: st.cid, channel: ch(), unit: st.unit, mode: st.mode, chSort: st.chSort, skuSort: st.skuSort, skuTab: st.skuTab }); };
  const isQty = () => st.unit === 'qty';
  const val = v => (v == null ? C.common.none : isQty() ? `${R.fmtNum(Math.round(v))}` : R.baht(v));
  const short = v => (v == null ? C.common.none : isQty() ? U.shortNum(v) : R.compact(v));
  /* no Sales actual for this Campaign · Not started (target mode at once, no band) · the cards fold unless Show target */
  const noSales = c => !R.salesMonths(R.model(U.seed()), c.id).length;
  const notStarted = c => R.statusOf(c, U.today()) === 'not_started';
  const fold = c => noSales(c) && !notStarted(c) && !P.showTarget.has(TAB);

  let el = null;
  function render(root, arg) {
    el = root;
    if (!el.dataset.built) build();
    const c = (arg && byId(arg)) || byId(st.cid) || byId(firstId()) || null;
    st.year = c ? yearOf(c) : st.year || +U.today().slice(0, 4); st.cid = c ? c.id : ''; save();
    renderAll();
    return 'campaign' + (st.cid ? '/' + st.cid : '');
  }
  function build() {
    el.innerHTML = `<div class="toolbar" id="b_tools"></div><div class="srcline subline" id="b_sub"></div><div id="b_ns"></div><div class="kpis" id="b_kpis"></div>
      <div class="card" id="b_month"></div><div class="card" id="b_ch"></div><div class="card" id="b_sku"></div>
      <div class="card" id="b_bud"></div><div class="r2 st2"><div class="card" id="b_st"></div><div class="card" id="b_sl"></div></div><div class="b-open" id="b_open"></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (el.offsetParent) renderMonth(); }, 120); });
    document.addEventListener('cp:contentresize', () => { if (el.offsetParent) renderMonth(); });
    /* ← → (nothing focused) = the previous / next Campaign */
    document.addEventListener('keydown', e => { if (!el.offsetParent || document.activeElement !== document.body || document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); } });
    el.dataset.built = '1';
  }
  function renderAll() {
    const c = byId(st.cid);
    renderTools(); renderSub(); $('b_ns').innerHTML = c && !notStarted(c) ? P.noSalesHTML(TAB, noSales(c), C.empty.bandCampaign) : '';
    renderKpis(); renderMonth(); renderCh(); renderSku(); renderBud(); renderRow5();
  }
  /* CR-05 §9.4 — the Budget of the Campaign (its whole time): the Budget bar + its lines (Current · Committed · Remaining · Pending) · the Campaign page */
  function renderBud() {
    const c = byId(st.cid), box = $('b_bud'); if (!c) { box.innerHTML = ''; return; }
    const html = CP.cpage.budgetTrackHTML(c);
    box.outerHTML = html ? html.replace('<div class="card">', '<div class="card" id="b_bud">').replace(`<a class="link" href="#dashboard/campaign/${esc(c.id)}">`, '<a') : '<div class="card hidden" id="b_bud"></div>';
    const b = $('b_bud'); if (b && html) { const h = b.querySelector('.card-head .ctl'); if (h) h.insertAdjacentHTML('beforeend', `<a class="link" href="#campaigns/${esc(c.id)}/budget">${esc(C.track.block.open)}</a>`); }
  }

  /* ---------- toolbar ---------- */
  const order = () => { const td = U.today(), inc = CP.dash.st.includeCancelled, o = CP.tabs.sales.order().filter(id => byId(id));
    const rest = camps().filter(c => !o.includes(c.id) && (inc || R.statusOf(c, td) !== R.CANCELLED)).map(c => c.id);
    return o.concat(rest); };
  function step(n) { const ids = order(), i = ids.indexOf(st.cid); if (!ids.length) return; CP.screens.dashboard.openCampaign(ids[(i + n + ids.length) % ids.length]); }
  function renderTools() {
    const td = U.today(), years = [...new Set(camps().map(yearOf))].sort(), list = camps().filter(c => yearOf(c) === st.year), c = byId(st.cid);
    const live = list.filter(x => R.statusOf(x, td) !== R.CANCELLED), gone = list.filter(x => R.statusOf(x, td) === R.CANCELLED);
    const opts = live.concat(gone).map((x, i) => ({ value: x.id, label: x.name, sub: `${R.dm(x.start)} – ${R.dm(x.end)}`, chip: statusChip(R.statusOf(x, td)),
      inGroup: i >= live.length ? C.status.cancelled : '', group: i === live.length ? C.status.cancelled : '' }));
    $('b_tools').innerHTML = `<label class="ms"><select class="ms-trigger sel yr" data-year aria-label="${esc(K.year)}">${years.map(y => `<option value="${y}"${y === st.year ? ' selected' : ''}>${y}</option>`).join('')}</select></label>` +
      (list.length ? U.singleSelect({ id: 'b_camp', options: opts, value: st.cid, label: c ? c.name : K.campaign, labelHTML: c ? `<span class="cs-l">${esc(c.name)}</span>${statusChip(R.statusOf(c, td))}` : esc(K.campaign), aria: K.campaign, placeholder: K.campaignPh,
        onChange: v => CP.screens.dashboard.openCampaign(v) }) : `<span class="muted">${esc(K.none)}</span>`) +
      `<span class="navbtns"><button type="button" class="icon-btn" data-step="-1" title="${esc(K.prev)} (←)" aria-label="${esc(K.prev)}">${ICON.prev}</button><button type="button" class="icon-btn" data-step="1" title="${esc(K.next)} (→)" aria-label="${esc(K.next)}">${ICON.next}</button></span>` +
      segHTML('data-chf', CHS.map(v => ({ v, label: v === 'all' ? K.all : C.channel[v] })), st.channel, { label: K.channelL }) +
      `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button>`;
  }
  /* status · dates · End marketing · Actual to … */
  function renderSub() {
    const c = byId(st.cid); if (!c) { $('b_sub').innerHTML = ''; return; }
    const A = R.salesMonths(R.model(U.seed()), c.id);
    const stc = R.statusOf(c, U.today()), chipSt = stc === R.CANCELLED && c.note ? statusChip(stc).replace('<span ', `<span title="${esc(c.note)}" `) : statusChip(stc);
    $('b_sub').innerHTML = [chipSt, esc(`${R.dmy(c.start)} – ${R.dmy(c.end)}`), c.end_marketing ? esc(K.endMkt(R.dmy(c.end_marketing))) : '',
      esc(A.length ? K.actualTo(R.monthName(A[A.length - 1])) : K.noActual)].filter(Boolean).join('<span class="sep">·</span>');
  }

  /* ---------- Row 1 — KPI (§11 · D40): Time left · Net revenue · Required run-rate · Campaign profit ---------- */
  function renderKpis() {
    const c = byId(st.cid); if (!c) { $('b_kpis').innerHTML = ''; return; }
    const seed = U.seed(), td = U.today(), tp = R.timeProgress(c, td), dl = R.daysLeft(c, td), rr = R.runRate(seed, c.id, { channel: ch(), unit: 'amount', today: td }), T = rr.att.total, kk = K.k, kc = U.kpiCard, bs = U.barSeg;
    const time = !tp.started
      ? kc({ label: labelInfo(kk.time, kk.timeTip), value: dl.n === 0 ? D.p.startsToday : kk.startsIn(dl.n), cap: esc(kk.startsCap(R.dmy(c.start), tp.total)) })
      : kc({ label: labelInfo(kk.time, kk.timeTip), value: kk.timeV(tp.daysLeft), suffix: kk.timeOf(tp.total), bar: bs((tp.pct || 0) * 100, 'time'),
        barTip: `${R.pct(tp.pct)} · ${tp.elapsed} of ${tp.total} days`, cap: esc(tp.ended ? kk.ended(R.dmy(c.end)) : kk.timeCap(R.pct(tp.pct), R.dmy(c.end))) });
    const revLabel = labelInfo(kk.revenue, K.tip.revenue);
    const revenue = T.actTD == null
      ? kc({ label: revLabel, value: T.target == null ? C.common.none : R.shortBaht(T.target), none: T.target == null, goal: T.target == null ? '' : D.k.badge.target, valueTip: T.target == null ? '' : `${K.ch.cols.full} ${R.baht(T.target)}`, cap: esc(C.empty.card) })
      : kc({ label: revLabel, value: R.baht(T.actTD), suffix: kk.of(R.baht(T.tgtTD)), bar: bs(Math.min(1, T.ach || 0) * 100, T.status || ''), barTip: `${R.pct(T.ach)} · ${C.att[T.status] || ''}`,
        cap: `<b class="attx ${esc(T.status || '')}">${esc(R.pctA(T.ach))}</b> · ${esc((T.gap < 0 ? kk.behind : kk.ahead)(R.shortBaht(Math.abs(T.gap || 0))))} · ${esc(kk.ofFull(R.shortBaht(T.actTD), R.shortBaht(T.target)))} (${esc(R.pct(R.ratio(T.actTD, T.target)))})` });
    /* Required run-rate · no actual: the full target ÷ the months left in grey (Target) */
    const rateLabel = labelInfo(kk.rate, K.tip.rate);
    let rate;
    if (rr.monthsLeft == null) {
      const n = R.monthsIn(R.monthFirst(R.ym(c.start) > R.ym(td) ? R.ym(c.start) : R.ym(td)), R.monthLast(R.ym(c.end))).length;
      rate = T.target == null || !n ? kc({ label: rateLabel, value: C.common.none, none: true, cap: esc(C.empty.card) })
        : kc({ label: rateLabel, value: kk.rateV(R.shortBaht(T.target / n)), goal: D.k.badge.target, suffix: kk.rateFor(n), valueTip: `${R.baht(T.target)} ÷ ${n}`, cap: esc(notStarted(c) ? kk.startsCap(R.dmy(c.start), tp.total) : C.empty.card) });
    } else if (!(rr.monthsLeft > 1e-9)) rate = kc({ label: rateLabel, value: C.common.none, none: true, valueTip: kk.rateNoMonths, cap: esc(kk.rateNoMonths) });
    else rate = kc({ label: rateLabel, value: rr.required === 0 ? kk.rateDone : kk.rateV(R.compact(rr.required)), suffix: rr.required === 0 ? '' : kk.rateFor(Math.round(rr.monthsLeft * 10) / 10),
      bar: rr.paceRatio == null ? '' : bs(Math.min(1, rr.paceRatio) * 100, rr.paceRatio >= 1 ? 'ok' : R.attStatus(rr.paceRatio)), barTip: rr.paceRatio == null ? kk.noPace : `Current pace ÷ required = ${R.pct(rr.paceRatio)}`,
      cap: rr.pace == null ? esc(kk.noPace) : `${esc(kk.rateCap(R.compact(rr.pace), rr.need == null ? C.common.none : R.times(rr.need), R.compact(rr.forecast)))} ${U.estBadge()}` });
    /* Campaign profit over the Campaign's own months (the same statement as Row 5) */
    const x = pnlCtx(c), s = R.statement(seed, x, c.id, 'same'), sf = R.statement(seed, x, c.id, 'full'), A = s.pnl.actual, plan = s.rows.find(r => r.key === 'profit').plan, fplan = sf.rows.find(r => r.key === 'profit').plan;
    const pLabel = labelInfo(kk.profit, C.money.profit);
    const profit = A.profit == null
      ? kc({ label: pLabel, value: fplan == null ? C.common.none : R.shortBaht(fplan), none: fplan == null, neg: fplan < 0, goal: fplan == null ? '' : D.k.badge.plan, valueTip: fplan == null ? D.k.noPlanProfit : D.k.planTip(R.baht(fplan)),
        cap: esc(A.rev == null ? C.empty.card : D.p.why.noCogs) })
      : kc({ label: pLabel, value: R.baht(A.profit), neg: A.profit < 0, suffix: kk.profitPlan(R.baht(plan)), suffixTip: C.wf.st.same,
        bar: bs(Math.abs(A.margin || 0) * 100, A.profit < 0 ? 'neg' : 'ok'), barTip: D.k.marginTip(R.pct(A.margin), R.baht(A.profit), R.baht(plan)), cap: esc(kk.profitCap(R.pct(A.margin), R.times(A.roi))), capTip: `GP ${R.pct(A.gpPct)} · ROAS ${R.times(A.roas)}` });
    $('b_kpis').innerHTML = time + revenue + rate + profit;
  }

  /* ---------- Row 2 — Target vs Actual by month ---------- */
  function renderMonth() {
    const box = $('b_month'); if (!box) return;
    const c = byId(st.cid), M = K.m, table = st.mView === 'table';
    if (!c) { box.innerHTML = ''; return; }
    const md = R.targetByMonth(U.seed(), c.id, { channel: ch(), unit: st.unit, today: U.today() });
    const o = { mode: st.mode, color: '--rev', good: 'up', planWord: M.target, lflWord: M.targetLfl, fmt: isQty() ? U.shortNum : R.compact, full: isQty() ? v => `${R.fmtNum(Math.round(v))} pcs` : R.baht };
    const folded = fold(c) && !table;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(M.title, M.tip)}</h3><div class="ctl">${table || folded ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      segHTML('data-unit', [{ v: 'amount', label: M.baht }, { v: 'qty', label: M.qty }], st.unit, { label: M.unitL }) +
      segHTML('data-bmode', [{ v: 'monthly', label: D.m.monthly }, { v: 'cumulative', label: D.m.cumulative }], st.mode, { label: D.m.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="mView" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      (folded ? U.foldedLine() : `<div class="sumline">${sumHTML(md, c)}</div>` +
        (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('c_month', ctx()), 'c_month')}</div>` : `<div class="chartbox" id="b_box"><svg id="b_svg" role="img" aria-label="${esc(M.title)}"></svg><div class="tip" id="b_tip"></div></div>`));
    if (!table && !folded) U.monthChart($('b_svg'), $('b_box'), $('b_tip'), md, o);
  }
  function sumHTML(md, c) {
    const t = md.toDate, tp = R.timeProgress(c, U.today()), dl = R.daysLeft(c, U.today()), left = esc(!tp.started ? K.k.startsIn(dl.n) : K.m.left(tp.daysLeft));
    if (!t) return `<span class="noa">${esc(C.empty.card)}</span><span class="noa">· ${esc(D.m.planOnly(K.m.target, short(md.planTotal)))}</span><span class="noa">· ${left}</span>`;
    const tone = R.tone(t.gap, 'up'), words = t.gap == null ? '' : Math.abs(t.gap) < 0.5 ? D.m.onTarget : (t.gap < 0 ? D.m.behind : D.m.ahead)(short(Math.abs(t.gap)));
    return `<span class="tdl" tabindex="0" title="${esc(C.money.toDate)}">${esc(D.m.toDateL)}</span><span>${esc(K.m.sum(short(t.actual), short(t.plan), R.pct(t.pct)))}</span>` +
      (words ? `<span>·</span><b class="${tone}">${esc(words)}</b>` : '') + `<span>·</span><span>${left}</span>`;
  }

  /* ---------- Row 3 — Channel attainment (the table of Campaign & Phase) ---------- */
  const gapCell = v => (v == null ? none() : `<span class="${R.tone(v, 'up')}">${esc((v > 0.5 ? '+' : '') + val(v))}</span>`);
  const achCell = n => (n.status == null && n.ach == null ? none(n.tgtTD == null ? C.att.none : '') : U.pctBar(n.ach, '', n.status || ''));
  const sortSel = (attr, v) => `<label class="ms"><select class="ms-trigger sel" ${attr} aria-label="${esc(D.p.sortL)}">${R.ATT_SORTS.map(k => `<option value="${k}"${v === k ? ' selected' : ''}>${esc(D.p.sortBtn(K.sorts[k]))}</option>`).join('')}</select></label>`;
  function renderCh() {
    const box = $('b_ch'), c = byId(st.cid); if (!c) { box.innerHTML = ''; return; }
    const a = R.attainment(U.seed(), c.id, { channel: ch(), unit: st.unit, today: U.today() }), Kc = K.ch.cols, folded = new Set(st.chFolded), table = st.chView === 'table';
    const anyOpen = a.channels.some(x => x.subs.length && !folded.has(x.channel));
    const head = `<div class="card-head"><h3>${labelInfo(K.ch.title, K.ch.tip)}</h3><div class="ctl">${sortSel('data-chsort', st.chSort)}` +
      `<button type="button" class="btn small" data-chfoldall="${anyOpen ? '1' : '0'}">${esc(anyOpen ? D.p.collapseAll : D.p.expandAll)}</button>` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="chView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (fold(c) && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('c_channel', ctx()), 'c_channel')}</div>`; return; }
    const cols = [{ l: Kc.channel }, { l: Kc.tgtTD, num: 1, tip: K.tip.tgtTD }, { l: Kc.actual, num: 1 }, { l: Kc.ach, tip: K.tip.ach }, { l: Kc.gap, num: 1, tip: K.tip.gap },
      { l: Kc.full, num: 1 }, { l: Kc.remaining, num: 1, tip: K.tip.remaining }, { l: Kc.status }];
    const th = x => `<th class="${x.num ? 'num' : ''}">${x.tip ? labelInfo(x.l, x.tip, x.l, true) : esc(x.l)}</th>`;
    const cells = n => `<td class="num">${n.tgtTD == null ? none(C.att.none) : esc(val(n.tgtTD))}</td><td class="num">${n.actTD == null ? none(C.att.none) : esc(val(n.actTD))}</td><td>${achCell(n)}</td>` +
      `<td class="num">${gapCell(n.gap)}</td><td class="num">${n.target == null ? none() : esc(val(n.target))}</td><td class="num">${n.remaining == null ? none() : esc(val(n.remaining))}</td><td>${U.attChip(n.status)}</td>`;
    const rows = R.sortAtt(a.channels, st.chSort, x => x.channel).map(x => {
      const open = x.subs.length && !folded.has(x.channel), subs = R.sortAtt(x.subs, st.chSort, s => s.sub);
      return `<tr class="grp"><td class="nm"><div class="nmw"><button type="button" class="chev" data-chfold="${esc(x.channel)}" aria-expanded="${!!open}" aria-label="${esc((open ? D.p.collapse : D.p.expand)(C.channel[x.channel]))}">${ICON.chevronDown}</button>` +
        `<div class="nmt"><b>${esc(C.channel[x.channel])} <span class="muted small" style="font-weight:400">${esc(C.channelLong[x.channel])}</span></b></div></div></td>${cells(x.node)}</tr>` +
        (open ? subs.map((s, i) => `<tr class="child${i === subs.length - 1 ? ' last' : ''}"><td class="nm"><span class="chname">${esc(s.sub)}</span></td>${cells(s.node)}</tr>`).join('') : '');
    }).join('');
    box.innerHTML = head + `<div class="tablewrap" style="margin-top:12px"><table class="tbl port atttbl"><thead><tr>${cols.map(th).join('')}</tr></thead><tbody>${rows}` +
      `<tr class="total"><td>${esc(K.total)}</td>${cells(a.total)}</tr></tbody></table></div>`;
  }

  /* ---------- Row 4 — SKU attainment (On target n / m SKUs in the head · D40) ---------- */
  function renderSku() {
    const box = $('b_sku'), c = byId(st.cid); if (!c) { box.innerHTML = ''; return; }
    const a = R.attainment(U.seed(), c.id, { channel: ch(), unit: st.unit, today: U.today() }), S = K.sku, table = st.skuView === 'table', plain = !a.months.length;
    const count = s => a.skus.filter(x => x.node && x.node.status === s).length, withT = a.skus.filter(x => x.node && x.node.target != null).length;
    const tabs = `<div class="sttabs" role="tablist">${[['all', S.all, a.skus.length], ['behind', C.att.behind, count('behind')], ['at_risk', C.att.at_risk, count('at_risk')], ['on_target', C.att.on_target, count('on_target')]]
      .map(([k, l, n]) => `<button type="button" role="tab" data-skutab="${k}" class="${st.skuTab === k ? 'on' : ''}${k !== 'all' ? ' ' + k : ''}" aria-selected="${st.skuTab === k}">${esc(l)} <span class="n">${n}</span></button>`).join('')}</div>`;
    const onT = plain ? '' : `<span class="hnote" title="${esc(K.tip.onTarget.d)}">${esc(K.k.skuHead(count('on_target'), withT))}</span>`;
    const head = `<div class="card-head"><h3>${labelInfo(S.title, S.tip)}${onT}</h3><div class="ctl">${segHTML('data-unit', [{ v: 'amount', label: K.m.baht }, { v: 'qty', label: K.m.qty }], st.unit, { label: K.m.unitL })}` +
      `${sortSel('data-skusort', st.skuSort)}<button type="button" class="btn small${table ? ' on' : ''}" data-view="skuView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (fold(c) && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + tabs + `<div class="ctable">${U.tableHTML(X.rowsFor('c_sku', ctx()), 'c_sku', { maxH: 560 })}</div>`; return; }
    const { rows } = X.skuRows(ctx()), chs = a.channel ? [a.channel] : R.CHANNELS;
    const cellCh = (s, k) => { const n = s.byCh[k]; if (!n || n.target == null) return '<td></td>';
      const t = S.cellTip(C.channel[k], n.tgtTD == null ? '—' : val(n.tgtTD), n.actTD == null ? '—' : val(n.actTD), n.gap == null ? '—' : (n.gap > 0 ? '+' : '') + val(n.gap));
      return `<td class="chc" title="${esc(t)}">${n.ach == null ? none(n.tgtTD == null ? C.att.none : t) : U.pctBar(n.ach, '', n.status || '', 40)}</td>`; };
    const cols = [{ l: S.cols.sku }].concat(chs.map(k => ({ l: C.channel[k], tip: K.tip.chCell })), [{ l: S.cols.tgtTD, num: 1, tip: K.tip.tgtTD }, { l: S.cols.actual, num: 1 },
      { l: S.cols.ach, tip: K.tip.ach }, { l: S.cols.gap, num: 1, tip: K.tip.gap }, { l: S.cols.status }], plain ? [{ l: K.ch.cols.full, num: 1 }] : []);
    const th = x => `<th class="${x.num ? 'num' : ''}">${x.tip ? labelInfo(x.l, x.tip, x.l, true) : esc(x.l)}</th>`;
    const body = rows.map(s => { const p = s.product, n = s.node;
      return `<tr><td class="nm sku"><b>${esc(p.nickname || p.name || s.key)}</b><span class="sk2">${esc([p.group, p.code].filter(Boolean).join(' · ') || (p.in_master === false ? S.notInMaster : ''))}</span></td>` +
        chs.map(k => cellCh(s, k)).join('') +
        `<td class="num">${n.tgtTD == null ? none(C.att.none) : esc(val(n.tgtTD))}</td><td class="num">${n.actTD == null ? none(C.att.none) : esc(val(n.actTD))}</td><td>${achCell(n)}</td><td class="num">${gapCell(n.gap)}</td><td>${U.attChip(n.status)}</td>` +
        (plain ? `<td class="num">${n.target == null ? none() : esc(val(n.target))}</td>` : '') + '</tr>'; }).join('');
    box.innerHTML = head + tabs + (rows.length ? `<div class="tablewrap sku-wrap" style="margin-top:4px"><table class="tbl port atttbl sku"><thead><tr>${cols.map(th).join('')}</tr></thead><tbody>${body}</tbody></table></div>` : `<div class="c3-empty">${esc(S.none)}</div>`);
  }

  /* ---------- Row 5 — P&L statement · Spend by line (Spend & Profit with Scope = this Campaign) ---------- */
  function renderRow5() {
    const c = byId(st.cid);
    if (!c) { $('b_st').innerHTML = ''; $('b_sl').innerHTML = ''; $('b_open').innerHTML = ''; return; }
    const x = pnlCtx(c);
    $('b_st').innerHTML = CP.pnl.statementHTML(x); $('b_sl').innerHTML = CP.pnl.spendLineHTML(x);
    $('b_open').innerHTML = `<span class="muted small">${esc(K.span(R.dmy(x.from), R.dmy(x.to)))}</span><button type="button" class="link" data-openspend title="${esc(K.openSpendTip(c.name))}">${esc(K.openSpend)}</button>`;
  }

  /* ---------- events ---------- */
  const scopeText = () => { const c = byId(st.cid); return `${c ? c.name : ''}${ch() ? ' ' + ch() : ''}`; };
  const meta = () => { const c = byId(st.cid); return P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.campaign}`], [D.meta.campaign, c ? `${c.name} · ${R.dmy(c.start)} – ${R.dmy(c.end)}` : ''],
    [D.meta.channel, ch() ? C.channel[ch()] : K.all], [D.meta.unit, isQty() ? K.m.qty : 'Baht']]); };
  function onClick(e) {
    const t = e.target;
    if (P.onShowTarget(e, TAB, renderAll)) return;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.campaign, scopeText(), X.tabTables('campaign', ctx()), meta()); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl], scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    if (t.closest('[data-openspend]')) { CP.tabs.spend.setScope(st.cid); CP.screens.dashboard.go('spend'); return; }
    const sb = t.closest('[data-step]'); if (sb) { step(+sb.dataset.step); return; }
    const pn = CP.pnl.onClick(e, st);
    if (pn) { save(); if (pn === 'sl') $('b_sl').innerHTML = CP.pnl.spendLineHTML(pnlCtx(byId(st.cid))); else $('b_st').innerHTML = CP.pnl.statementHTML(pnlCtx(byId(st.cid))); return; }
    const vw = t.closest('[data-view]'); if (vw) { const k = vw.dataset.view; st[k] = st[k] === 'table' ? (k === 'mView' ? 'chart' : 'list') : 'table'; save(); ({ mView: renderMonth, chView: renderCh, skuView: renderSku })[k](); return; }
    const sg = t.closest('.seg[data-chf] button, .seg[data-unit] button, .seg[data-bmode] button');
    if (sg) { const g = sg.closest('.seg'), v = sg.dataset.v;
      if (g.hasAttribute('data-chf')) { st.channel = oneOf(v, CHS, 'all'); save(); renderAll(); return; }
      if (g.hasAttribute('data-unit')) { st.unit = v === 'qty' ? 'qty' : 'amount'; save(); renderMonth(); renderCh(); renderSku(); return; }
      st.mode = v === 'cumulative' ? 'cumulative' : 'monthly'; save(); renderMonth(); return; }
    const tb = t.closest('[data-skutab]'); if (tb) { st.skuTab = tb.dataset.skutab; save(); renderSku(); return; }
    const fa = t.closest('[data-chfoldall]'); if (fa) { st.chFolded = fa.dataset.chfoldall === '1' ? R.CHANNELS.slice() : []; save(); renderCh(); return; }
    const fd = t.closest('[data-chfold]'); if (fd) { const s = new Set(st.chFolded), k = fd.dataset.chfold; if (s.has(k)) s.delete(k); else s.add(k); st.chFolded = [...s]; save(); renderCh(); }
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-year]')) { st.year = +t.value; const id = yearId(st.year); st.cid = id; save(); CP.screens.dashboard.openCampaign(id); return; }
    if (t.matches('[data-chsort]')) { st.chSort = oneOf(t.value, R.ATT_SORTS, 'gap'); save(); renderCh(); return; }
    if (t.matches('[data-skusort]')) { st.skuSort = oneOf(t.value, R.ATT_SORTS, 'gap'); save(); renderSku(); }
  }
  return { render, current: () => st.cid };
})();
