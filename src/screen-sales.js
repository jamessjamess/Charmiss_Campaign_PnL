/* screen-sales.js — Dashboard › Sales (CR-08 §4 · CR-10 §5: by campaign · Revenue by campaign · Channel × campaign · SKU watchlist both sides): can we sell to the target?
   → CP.tabs.sales · #dashboard/sales (the old #dashboard/salesbudget opens here) · the shared toolbar (Year · Status …… As of ⓘ · Export) ·
   Row 1 KPI: Net revenue (as Overview) · Forecast end (Est.) · Units sold · On track · Row 2 Target vs Actual by month (฿ | Qty) ·
   Row 3 Sales vs Time gone (moved from Overview, D74 — Pace in the tooltip of Status · the worst first) ·
   Row 4 Revenue by channel (donut, 1/3) | By channel (Ach of MT · TT · ECOM · a Sub-channel = its share of the actual, 2/3) ·
   Row 5 SKU watchlist (Behind | Best · 2 columns of 5). A Campaign opens Campaign Monitor › Sales. */
CP.tabs.sales = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, none, segHTML } = U;
  const D = C.dash, S = C.sales, SB = C.sb, MN = C.money, TAB = 'sales';
  const td = () => R.todayISO();
  /* the state of Sales & Budget is kept (the same cards) */
  const saved = pref.json('sb', {}) || {};
  /* R5 — the channels folded at first (a click opens one) */
  const st = Object.assign({ unit: 'amount', mode: 'monthly', view: 'chart', by: 'total', chFolded: R.CHANNELS.slice(), chView: 'chart', sku: 'behind', skuView: 'list', mixView: 'chart', cxSeg: 'actual', cxmView: 'list', rbcAll: false }, saved);
  if (!['total', 'campaign', 'channel'].includes(st.by)) st.by = 'total';
  st.focus = null;   /* the Campaign highlighted (this visit only) */
  const save = () => pref.setJson('sb', Object.assign(pref.json('sb', {}) || {}, st));
  const rng = () => P.rng();
  const ctx = () => Object.assign(rng(), { seed: U.seed(), sort: 'attention', unit: st.unit, mode: st.mode, sku: st.sku, ids: null });
  const noSales = () => !R.kpis(U.seed(), rng()).anySales;
  const showT = () => P.showTarget.has(TAB);
  const isQty = () => st.unit === 'qty';

  let el = null;
  function render(root) { el = root; if (!el.dataset.built) build(); renderAll(); return TAB; }
  function build() {
    /* CR-10 §5 — Row 4 Revenue by campaign (donut | bars) · Row 5 Revenue by channel × campaign · Row 6 SKU watchlist (both sides) — no Revenue by channel / By channel cards (D97) */
    el.innerHTML = `<div class="toolbar" id="s_tools"></div><div id="s_ns"></div><div class="kpis" id="s_kpis"></div>
      <div class="card" id="s_month"></div><div class="card" id="s_pace"></div><div class="r13"><div class="card" id="s_rbcd"></div><div class="card" id="s_rbcb"></div></div><div class="card" id="s_cxm"></div><div class="card" id="s_sku"></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr[data-open], tr[data-mon]'); if (tr && e.target === tr) { e.preventDefault(); tr.click(); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (el.offsetParent) renderMonth(); }, 120); };
    window.addEventListener('resize', redraw);
    document.addEventListener('cp:contentresize', redraw);
    el.dataset.built = '1';
  }
  function renderAll() {
    $('s_tools').innerHTML = P.toolsHTML('s', renderAll);
    $('s_ns').innerHTML = P.noSalesHTML(TAB, noSales());
    renderKpis(); renderMonth(); renderPace(); renderRbc(); renderCxm(); renderSku();
  }

  /* ---------- Row 3 — the rows of Sales vs Time gone: Ach % of the full target · Time gone · Gap · Pace · Status · Forecast end (Est.) — the worst first ---------- */
  const RANK = { behind: 0, at_risk: 1, on_track: 2 };
  function paceRows() {
    const seed = U.seed(), Sc = R.scope(seed, rng());
    return Sc.ids.map(id => R.campaignPace(seed, id, td())).filter(x => x && R.statusOf(x.c, td()) !== R.CANCELLED)
      .map(x => Object.assign(x, { fc: R.forecast(seed, x.c.id, { today: td() }) }))
      .sort((a, b) => (a.status == null) - (b.status == null) || (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3) || (a.pace ?? 9) - (b.pace ?? 9) || a.c.name.localeCompare(b.c.name, 'en'));
  }

  /* ---------- Row 1 — KPI: Net revenue · Forecast end (Est.) · Units sold · On track (§2.3 anatomy) ---------- */
  function renderKpis() {
    const seed = U.seed(), k = R.kpis(seed, rng()), A = k.pnl.actual, L = k.pnl.lfl, Pl = k.pnl.plan, K = SB.sk, kc = U.kpiCard, bs = U.barSeg;
    /* Forecast end (Est.) — the revenue of the P&L statement's Forecast end against the full-year target */
    const F = R.pnlForecast(seed, rng()).forecast, fr = R.ratio(F.rev, Pl.rev), fst = R.attStatus(fr) || 'on_target', fgap = F.rev == null || Pl.rev == null ? null : F.rev - Pl.rev;
    const fc = kc({ key: 'forecast', label: labelInfo(K.fc, K.fcTip), value: F.rev == null ? C.common.none : R.shortBaht(F.rev), none: F.rev == null, valueTip: F.rev == null ? '' : R.baht(F.rev), suffix: K.fcOf(R.shortBaht(Pl.rev)),
      bar: bs(Math.min(1, fr || 0) * 100, fst), barTip: `${R.baht(F.rev)} · ${R.pct(fr, 1)}`,
      cap: F.rev == null ? esc(S.k.fcNone) : `<b class="attx ${fst}">${esc(R.pct(fr))}</b> · ${esc(K.fcVs(R.signedShort(fgap)))}` });
    /* Units sold — pieces against the target pieces to date */
    const ur = A.rev == null ? null : R.ratio(A.qty, L.qty), ust = R.attStatus(ur) || 'on_target', ugo = (L.qty || 0) - (A.qty || 0);
    const units = kc({ key: 'units', label: labelInfo(K.units, K.unitsTip), value: A.rev == null || !A.qty ? C.common.none : R.fmtNum(Math.round(A.qty)), none: A.rev == null || !A.qty, suffix: A.rev == null ? '' : K.unitsOf(R.fmtNum(Math.round(L.qty || 0))),
      bar: bs(Math.min(1, ur || 0) * 100, ust), barTip: `${R.fmtNum(Math.round(A.qty || 0))} / ${R.fmtNum(Math.round(L.qty || 0))} pcs`,
      cap: ur == null ? esc(K.noUnits) : `<b class="attx ${ust}">${esc(R.pct(ur))}</b> · ${esc(ugo >= -0.5 ? K.unitsToGo(U.shortNum(ugo)) : K.unitsAhead(U.shortNum(-ugo)))}` });
    /* On track — the campaigns of the year by the Pace (D67) */
    const rows = paceRows(), n = rows.length, by = { on_track: 0, at_risk: 0, behind: 0, early: 0 };
    rows.forEach(x => { by[x.status || 'early']++; });
    const parts = ['at_risk', 'behind'].map(x => K.by[x](by[x])).concat(by.early ? [K.by.early(by.early)] : []);
    const ont = kc({ key: 'ontrack', label: labelInfo(K.onTrack, K.onTrackTip), value: `${by.on_track} / ${n}`, suffix: K.onTrackOf,
      bar: [['on_track', 'on_target'], ['at_risk', 'at_risk'], ['behind', 'behind'], ['early', 'time']].map(([x, c]) => bs(by[x] / Math.max(1, n) * 100, c)).join(''),
      barTip: `${by.on_track} ${C.yr.st.on_track} · ${by.at_risk} ${C.yr.st.at_risk} · ${by.behind} ${C.yr.st.behind}`,
      cap: !n ? esc(D.noCampaign) : by.at_risk || by.behind ? esc(parts.join(' · ')) : esc([K.allOn].concat(by.early ? [K.by.early(by.early)] : []).join(' · ')) });
    $('s_kpis').innerHTML = P.revenueKpi(k) + fc + units + ont;
  }

  /* ---------- CR-10 §5.1 (D93) — the Campaigns of the year by net revenue: Top 5 have a colour (--ph1 … --ph5, the rank) · the rest = Others (grey) ---------- */
  const TOPN = 5, PH = ['--ph1', '--ph2', '--ph3', '--ph4', '--ph5'], OTH = '--series-grey';
  const ranks = () => R.campaignRank(U.seed(), rng());
  const colorOf = rk => (rk.rank < TOPN ? PH[rk.rank] : OTH);
  /* ---------- Row 2 — Target vs Actual by month (฿ | Qty · Total | By campaign | By channel) ---------- */
  const CH_TOKEN = { MT: '--ch-mt', TT: '--ch-tt', ECOM: '--ch-ecom' };
  const chartOpts = () => ({ mode: st.mode, color: '--rev', good: 'up', planWord: D.m.legend.target, lflWord: D.m.tip.targetLfl, h: 300,
    fmt: isQty() ? U.shortNum : R.compact, full: isQty() ? v => `${R.fmtNum(Math.round(v))} pcs` : R.baht });
  /* the stack of a month: by campaign (Top 5 + Others — the tooltip lists every campaign of the month) · by channel (MT · TT · ECOM) */
  function stackOf(md, o) {
    const seed = U.seed(), meas = isQty() ? 'qty' : 'revenue', BC = SB.bycamp;
    if (st.by === 'campaign') {
      const rk = ranks(), per = rk.map(x => ({ x, rows: R.byMonth(seed, Object.assign(rng(), { only: [x.id] }), meas).rows })), top = per.filter(p => p.x.rank < TOPN);
      md.rows.forEach((r, i) => { let s = 0; top.forEach(p => { const v = p.rows[i] ? p.rows[i].actual : null; r['c' + p.x.rank] = v; s += v || 0; }); r.oth = r.actual == null ? null : Math.max(0, r.actual - s);
        r.all = per.map(p => [p.x.c.name, p.rows[i] ? p.rows[i].actual : null]).filter(z => z[1] > 0).sort((a, b) => b[1] - a[1]); });
      o.stack = top.map(p => ({ k: 'c' + p.x.rank, color: PH[p.x.rank], label: p.x.c.name, fade: st.focus != null && st.focus !== p.x.id })).concat(per.length > TOPN ? [{ k: 'oth', color: OTH, label: BC.others(per.length - TOPN), fade: st.focus != null && st.focus !== 'others' }] : []);
      o.noStackRows = true; o.noteOf = r => (r.actual == null ? null : r.all.map(z => [z[0], o.full(z[1])]));
      return top.map(p => ({ key: p.x.id, label: p.x.c.name, color: PH[p.x.rank] })).concat(per.length > TOPN ? [{ key: 'others', label: BC.others(per.length - TOPN), color: OTH }] : []);
    }
    if (st.by === 'channel') {
      /* the actual of a channel a month = Σ its sales rows (the same rows as the Total bar) */
      const M = R.model(seed), Sc = R.scope(seed, rng()), unit = isQty() ? 'qty' : 'amount';
      md.rows.forEach(r => { R.CHANNELS.forEach(k => { r[k] = r.actual == null ? null : 0; }); if (r.actual == null) return; Sc.ids.forEach(id => (M.salesRows.get(id) || []).forEach(x => { if (x.month === r.m && x.scenario !== 'target' && x[unit] != null && r[x.channel] != null) r[x.channel] += x[unit]; })); });
      o.stack = R.CHANNELS.map(k => ({ k, color: CH_TOKEN[k], label: C.channel[k] }));
      return null;
    }
    return null;
  }
  function renderMonth() {
    const box = $('s_month'); if (!box) return;
    const M = S.m, BC = SB.bycamp, table = st.view === 'table', md = R.byMonth(U.seed(), rng(), isQty() ? 'qty' : 'revenue'), o = chartOpts();
    const fold = !md.toDate && noSales() && !showT() && !table, leg = table || fold ? null : stackOf(md, o);
    const legend = leg ? leg.map(x => `<button type="button" class="lgb${st.focus === x.key ? ' on' : ''}${st.focus != null && st.focus !== x.key ? ' off' : ''}" data-sfocus="${esc(x.key)}" aria-pressed="${st.focus === x.key}" title="${esc(BC.focus(x.label))}"><i class="bar" style="--sw:var(${x.color})"></i>${esc(x.label)}</button>`).join('') +
      `<span><i class="tick"></i>${esc(o.planWord)}</span>` : '';
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(M.title, M.tip)}</h3><div class="ctl">` +
      segHTML('data-sby', [{ v: 'total', label: BC.total }, { v: 'campaign', label: BC.byCamp }, { v: 'channel', label: BC.byCh }], st.by, { label: BC.viewL }) +
      segHTML('data-sunit', [{ v: 'amount', label: M.baht }, { v: 'qty', label: M.qty }], st.unit, { label: M.unitL }) +
      segHTML('data-smode', [{ v: 'monthly', label: D.m.monthly }, { v: 'cumulative', label: D.m.cumulative }], st.mode, { label: D.m.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="view" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      (table || fold ? '' : `<div class="legend mleg">${legend || U.monthLegend(o)}</div>`) +
      (fold ? U.foldedLine() : `<div class="sumline">${sumHTML(md)}</div>` +
        (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('s_month', ctx()), 's_month')}</div>` : `<div class="chartbox" id="s_box"><svg id="s_svg" role="img" aria-label="${esc(M.title)}"></svg><div class="tip" id="s_tip"></div></div>`));
    if (!table && !fold) U.monthChart($('s_svg'), $('s_box'), $('s_tip'), md, o);
  }
  function sumHTML(md) {
    const M = D.m, t = md.toDate, sh = v => (isQty() ? `${U.shortNum(v)} pcs` : R.shortBaht(v));
    if (!t) return `<span class="noa">${esc(D.k.noSales)}</span>` + (md.planTotal != null ? `<span class="noa">· ${esc(M.planOnly(M.legend.target, sh(md.planTotal)))}</span>` : '');
    const tone = R.tone(t.gap, 'up'), words = t.gap == null ? '' : Math.abs(t.gap) < 0.5 ? M.onTarget : (t.gap < 0 ? M.behind : M.ahead)(sh(Math.abs(t.gap)));
    return `<span class="tdl" tabindex="0" title="${esc(MN.toDate)}">${esc(M.toDateL)}</span><span>${esc(M.toDate(sh(t.actual), sh(t.plan), R.pctA(t.pct)))}</span>` + (words ? `<span>·</span><b class="${tone}">${esc(words)}</b>` : '');
  }

  /* ---------- Row 3 — Sales vs Time gone (CR-08 §4): Campaign · Ach % · Time gone (bar + tick) · Gap pts ⓘ · Status (Pace in its tooltip) · Forecast end ⓘ ---------- */
  const stCls = s => (s === 'behind' ? 'behind' : s === 'at_risk' ? 'at_risk' : s === 'on_track' ? 'on_target' : '');
  function renderPace() {
    const T = C.yr.pace, Q = SB.pace, rows = paceRows(), th = (l, tip, num) => `<th class="${num ? 'num' : ''}">${tip ? labelInfo(l, tip, l) : esc(l)}</th>`;
    const body = rows.map(x => { const dl = R.daysLeft(x.c, td()), early = x.status == null, pc = x.pace == null || early ? '' : R.paceText(x.pace);
      /* CR-10 S2 — one line a row: the name alone · Time gone + the days left after the bar (91% · 24 days left · 100% · Ended 30/09) */
      const dw = dl.kind === 'ended' ? D.p.endedOn(R.dm(x.c.end)) : X.daysText(dl);
      return `<tr class="click" tabindex="0" data-mon="${esc(x.c.id)}|sales" title="${esc(T.open(x.c.name))}"><td class="nm"><b>${esc(x.c.name)}</b></td>` +
        `<td title="${esc(Q.barTip(R.pct(x.ach), R.pct(x.timeGone), pc))}">${x.ach == null ? U.none(D.p.why.noSales) : `<span class="pcell">${U.paceBar(x.ach, x.timeGone, stCls(x.status) || 'ok', 120)}<span class="tgv">${esc(Q.tgLine(R.pct(x.timeGone), dw))}</span></span>`}</td>` +
        `<td class="num">${x.gap == null || early ? U.none() : `<span class="${x.gap < -0.5 ? 'neg' : 'okx'}">${esc(C.track.pts(x.gap))}</span>`}</td>` +
        `<td>${early ? `<span class="muted small" title="${esc(T.earlyTip)}">${esc(T.early)}</span>` : `<span title="${esc(Q.statusTip(C.yr.st[x.status], pc))}">${U.paceChip(x.status)}</span>`}</td>` +
        `<td class="num">${x.fc.forecast == null ? U.none(T.noFc) : `${esc(R.shortBaht(x.fc.forecast))} <span class="muted small">${esc(R.pct(x.fc.pct))}</span>`}</td></tr>`; }).join('');
    $('s_pace').innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><div class="legend"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(C.yr.st.on_track)}</span><span><i class="bar" style="--sw:var(--warn)"></i>${esc(C.yr.st.at_risk)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(C.yr.st.behind)}</span><span><i class="tick"></i>${esc(C.yr.timeGone)}</span></div>` +
      `<button type="button" class="btn small" data-dl="s_pace">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      (rows.length ? `<div class="tablewrap" style="margin-top:10px"><table class="tbl port pacetbl"><thead><tr>${th(T.cols.campaign)}${th(T.cols.bar, T.barTip)}${th(T.cols.gap, Q.gapTip, true)}${th(T.cols.status)}${th(T.cols.fc, Q.fcTip, true)}</tr></thead><tbody>${body}</tbody></table></div>`
        : `<div class="c3-empty">${esc(D.noCampaign)}</div>`);
  }

  /* ---------- Row 4 — Revenue by campaign (CR-10 §5.2 · D93): the donut Top 5 + Others (1/3) · the bars of every campaign (2/3) ---------- */
  function rbcData() {
    const seed = U.seed(), rk = ranks(), tot = rk.reduce((s, x) => s + x.rev, 0), f = new Map(R.pnlForecast(seed, rng()).rows.map(r => [r.id, r]));
    const rows = rk.map(x => { const p = R.campaignPace(seed, x.id, td()), r = f.get(x.id); return Object.assign({}, x, { target: r ? r.plan.rev : null, pace: p, share: tot ? x.rev / tot : null }); });
    const top = rows.filter(x => x.rank < TOPN), rest = rows.filter(x => x.rank >= TOPN);
    const slices = top.filter(x => x.rev > 0).map(x => ({ key: x.id, label: x.c.name, value: x.rev, color: PH[x.rank], tip: SB.chmix.slice(x.c.name, R.baht(x.rev), R.pct(x.share, 1)) }))
      .concat(rest.length && rest.some(x => x.rev > 0) ? [{ key: 'others', label: SB.bycamp.others(rest.length), value: rest.reduce((s, x) => s + x.rev, 0), color: OTH, tip: SB.rbc.othersTip }] : []);
    return { rows, slices, tot };
  }
  function renderRbc() {
    const dBox = $('s_rbcd'), bBox = $('s_rbcb'); if (!dBox || !bBox) return;
    const K = SB.rbc, d = rbcData(), head = `<div class="card-head"><h3>${labelInfo(K.title, K.tip)}</h3></div>`;
    if (!d.tot) { dBox.innerHTML = head + U.foldedLine(); bBox.innerHTML = `<div class="card-head"><h3>${esc(K.title)}</h3></div>` + U.foldedLine(); return; }
    dBox.innerHTML = head + `<div class="c3-body dbody">${U.donutHTML({ id: 's_rdn', label: K.title, slices: d.slices, total: d.tot, cols: K.cols })}</div>`;
    U.drawDonut({ id: 's_rdn', slices: d.slices, total: d.tot, center: R.shortBaht(d.tot), size: 164 });
    dBox.querySelectorAll('#s_rdn_svg .sl').forEach(p => { p.style.cursor = 'pointer'; p.addEventListener('click', () => { const k = d.slices[+p.dataset.i].key; st.focus = st.focus === k ? null : k; save(); renderMonth(); renderRbc(); }); });
    const many = d.rows.length > 15, list = many && !st.rbcAll ? d.rows.slice(0, 15) : d.rows;
    const items = list.map(x => { const s = x.pace && x.pace.status, cls = s === 'behind' ? 'err' : s === 'at_risk' ? 'warn' : 'ok', inF = st.focus == null || st.focus === x.id || (st.focus === 'others' && x.rank >= TOPN);
      return { id: x.id, name: x.c.name, v: x.rev, tick: x.target, cls: inF ? cls : cls + ' dim', value: K.bar(R.shortBaht(x.rev), R.pct(R.ratio(x.rev, x.target))), tip: `${x.c.name}\n${R.baht(x.rev)} · ${R.pct(x.share, 1)} · target ${R.baht(x.target)}` }; });
    bBox.innerHTML = `<div class="card-head"><h3>${esc(K.title)}</h3><div class="ctl"><div class="legend"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(C.yr.st.on_track)}</span><span><i class="bar" style="--sw:var(--warn)"></i>${esc(C.yr.st.at_risk)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(C.yr.st.behind)}</span><span><i class="tick"></i>${esc(S.ch.cols.full)}</span></div>` +
      (many ? `<button type="button" class="btn small" data-rbcall aria-pressed="${!!st.rbcAll}">${esc(st.rbcAll ? K.collapse : K.showAll)}</button>` : '') + `</div></div>` + U.rowBars(items).replace(/data-monrow="([^"|]+)\|pnl"/g, 'data-monrow="$1|sales"').replace('pbars rb', 'pbars rb rbc');
  }
  /* ---------- Row 5 — Revenue by channel × campaign (CR-10 §5.3 · D97): the matrix of CR-09 (rows = Campaigns, the order of §5.2) + the channel mix of the year ---------- */
  function cxmData() {
    const seed = U.seed(), rk = ranks(), tot = rk.reduce((s, x) => s + x.rev, 0);
    const cellOf = (n, tg) => (n && (n.plan != null || n.actual != null) ? Object.assign({ actual: n.actual, target: n.plan, share: tot ? (n.actual || 0) / tot : null }, R.paceNode({ actTD: n.actual, target: n.plan }, tg)) : null);
    const rows = rk.map(x => { const ch = R.channelSubs(seed, Object.assign(rng(), { only: [x.id] })), tg = R.timeGone(x.c, td()), byCh = {};
      R.CHANNELS.forEach(k => { byCh[k] = cellOf(ch.rows.find(r => r.channel === k), tg); });
      return { id: x.id, name: x.c.name, byCh, total: cellOf({ actual: ch.total.actual, plan: ch.total.plan }, tg), tg, attrs: ` class="click" tabindex="0" data-mon="${esc(x.id)}|sales"` }; });
    const all = R.channelSubs(seed, rng()), totals = { all: { actual: all.total.actual, target: all.total.plan, share: 1, achF: R.ratio(all.total.actual, all.total.plan), status: null } };
    R.CHANNELS.forEach(k => { const r = all.rows.find(z => z.channel === k); totals[k] = r ? { actual: r.actual, target: r.plan, share: tot ? (r.actual || 0) / tot : null, achF: R.ratio(r.actual, r.plan) } : null; });
    return { rows, totals, all, tot };
  }
  function renderCxm() {
    const box = $('s_cxm'); if (!box) return;
    const K = SB.cxm, X9 = C.mon.mx, table = st.cxmView === 'table', d = cxmData(), chs = R.CHANNELS.filter(k => d.totals[k]);
    const head = `<div class="card-head"><h3>${labelInfo(K.title, K.tip)}</h3><div class="ctl">${segHTML('data-cxseg', ['actual', 'ach', 'share'].map(v => ({ v, label: X9.seg[v] })), st.cxSeg, { label: X9.segL })}` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="cxmView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (noSales() && !showT() && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('s_cxm', ctx()), 's_cxm')}</div>`; return; }
    if (!d.rows.length) { box.innerHTML = head + `<div class="c3-empty">${esc(K.none)}</div>`; return; }
    const mix = k => chs.map(c2 => ({ key: c2, label: C.channel[c2], value: (k === 'target' ? d.totals[c2].target : d.totals[c2].actual) || 0, color: CH_TOKEN[c2], money: R.baht(k === 'target' ? d.totals[c2].target : d.totals[c2].actual) }));
    box.innerHTML = head + U.channelMatrix({ channels: chs, seg: st.cxSeg, fmt: v => (v == null ? C.common.none : R.shortBaht(v)), stCls, cols: { name: K.cols.campaign, total: K.cols.total, share: K.cols.share, totalRow: K.total },
      rows: d.rows, totals: d.totals, cellTip: (r, k, x) => X9.cellTip(r.name, C.channel[k], R.baht(x.actual), R.baht(x.target), R.pct(x.achF), x.status ? C.yr.st[x.status] : '') }) +
      `<div class="cxmix">${U.mixBars([{ label: C.mon.mix.target, parts: mix('target') }, { label: C.mon.mix.actual, parts: mix('actual') }])}</div>`;
  }

  /* ---------- Row 6 — SKU watchlist (CR-10 §5.4): Behind — Top 10 (left) · Best — Top 10 (right), together · no SKU on both sides ---------- */
  function skuSides() {
    const seed = U.seed(), b = R.skuWatch(seed, rng(), 'behind', 10), all = R.skuWatch(seed, rng(), 'best', 1e6), inB = new Set(b.rows.map(x => x.c.id + '|' + x.key));
    return { behind: b.rows, best: all.rows.filter(x => !inB.has(x.c.id + '|' + x.key)).slice(0, 10), n: b.n, by: b.by };
  }
  function renderSku() {
    const box = $('s_sku'), K = S.sku, W = SB.skuw, table = st.skuView === 'table', d = skuSides();
    const head = `<div class="card-head"><h3>${labelInfo(K.title, K.tip)}</h3><div class="ctl"><button type="button" class="btn small${table ? ' on' : ''}" data-view="skuView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (noSales() && !showT() && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('s_sku', Object.assign(ctx(), { sku: 'behind' })), 's_sku')}${U.tableHTML(X.rowsFor('s_sku', Object.assign(ctx(), { sku: 'best' })), 's_sku', { noDownload: true })}</div>`; return; }
    const tr = (x, best) => { const tg = R.timeGone(x.c, td());
      return `<tr class="click" tabindex="0" data-open="${esc(x.c.id)}" title="${esc(`${x.product.name || x.key} · ${x.c.name}\n${K.cols.tgtTD} ${R.baht(x.tgtTD)} · ${K.cols.actual} ${R.baht(x.actual)}`)}">` +
        `<td class="nm sku"><b>${esc(x.product.nickname || x.product.name || x.key)}</b><span class="sk2">${esc(x.c.name)}</span></td><td>${U.paceBar(x.ach, tg, stCls(x.status === 'on_target' ? 'on_track' : x.status) || 'ok', 56)}</td>` +
        `<td class="num">${gapCell(x.gap)}</td></tr>`; };   /* the Gap on both sides (Ach % is on the bar) */
    const tbl = (list, best, title, tip) => `<div class="skuside"><div class="skuh" title="${esc(tip)}">${esc(title)}</div>${list.length ? `<div class="tablewrap"><table class="tbl sku skuw"><thead><tr><th>${esc(K.cols.sku)}</th><th>${labelInfo(K.cols.ach, MN.ach, K.cols.ach)}</th><th class="num">${labelInfo(K.cols.gap, MN.gap, K.cols.gap)}</th></tr></thead><tbody>${list.map(x => tr(x, best)).join('')}</tbody></table></div>` : `<div class="c3-empty">${esc(W.none)}</div>`}</div>`;
    box.innerHTML = head + `<div class="sku2">${tbl(d.behind, false, W.behind, W.behindTip)}${tbl(d.best, true, W.best, W.bestTip)}</div>` +
      `<div class="c3-note">${esc(`${d.n} SKUs · ${C.att.behind} ${d.by.behind} · ${C.att.at_risk} ${d.by.at_risk} · ${C.att.on_target} ${d.by.on_target}`)}</div>`;
  }
  const gapCell = v => (v == null ? none() : `<span class="${R.tone(v, 'up')}">${esc((v > 0.5 ? '+' : '') + R.baht(v))}</span>`);

  /* ---------- Export: KPI · by month · Sales vs Time gone · Revenue by channel · By channel · SKU watchlist ---------- */
  X.register('s_kpi', x => { const k = R.kpis(x.seed, x), A = k.pnl.actual, L = k.pnl.lfl, Pl = k.pnl.plan, F = R.pnlForecast(x.seed, x).forecast, K = SB.sk, yg = R.yearGone(x.year, x.today);
    const rows = paceRows(), by = { on_track: 0, at_risk: 0, behind: 0, early: 0 }; rows.forEach(r => { by[r.status || 'early']++; });
    return { key: 's_kpi', title: D.file.s_kpi, header: [C.xl.metric, C.xl.value, C.xl.of, '%', C.xl.note], cols: ['text', 'money', 'money', 'pct', 'text'],
      rows: [[C.yr.k.revenue, A.rev, Pl.rev, R.ratio(A.rev, Pl.rev), `${C.yr.timeGone} ${R.pct(yg)} · ${C.yr.k.toGo(R.baht((Pl.rev || 0) - (A.rev || 0)))}`],
        [K.fc, F.rev, Pl.rev, R.ratio(F.rev, Pl.rev), K.fcVs(R.signedShort(F.rev == null ? null : F.rev - (Pl.rev || 0)))],
        [C.xl.pcs(K.units), { v: A.rev == null ? null : A.qty, fmt: 'num' }, { v: A.rev == null ? null : L.qty, fmt: 'num' }, A.rev == null ? null : R.ratio(A.qty, L.qty), MN.units.f],
        [`${K.onTrack} (${K.onTrackOf})`, { v: by.on_track, fmt: 'num' }, { v: rows.length, fmt: 'num' }, R.ratio(by.on_track, rows.length), `${C.yr.st.at_risk} ${by.at_risk} · ${C.yr.st.behind} ${by.behind}${by.early ? ` · ${K.by.early(by.early)}` : ''}`]] }; });
  X.register('s_pace', () => { const T = C.yr.pace.cols, rows = paceRows();
    return { key: 's_pace', title: C.yr.pace.title, header: [T.campaign, T.ach, T.time, T.gap, T.pace, T.status, T.fc], cols: ['text', 'pct', 'pct', 'num', 'num', 'text', 'money'],
      rows: rows.map(x => [{ v: x.c.name, bold: true }, x.ach, x.timeGone, x.gap == null || x.status == null ? null : Math.round(x.gap), x.status == null ? null : +R.paceText(x.pace), x.status ? C.yr.st[x.status] : C.yr.pace.early, x.fc.forecast]) }; });
  X.register('s_rbc', () => { const K = SB.rbc, d = rbcData();
    return { key: 's_rbc', title: K.title, header: [K.cols[0], C.xl.rank, K.cols[1], K.cols[2], S.ch.cols.full, C.money.ach.h], cols: ['text', 'num', 'money', 'pct', 'money', 'pct'],
      rows: d.rows.map(x => [{ v: x.c.name, bold: true }, x.rank + 1, x.rev, x.share, x.target, R.ratio(x.rev, x.target)]), total: [C.common.total, null, d.tot, d.tot ? 1 : null, null, null] }; });
  X.register('s_cxm', () => { const K = SB.cxm, d = cxmData(), chs = R.CHANNELS.filter(k => d.totals[k]);
    return { key: 's_cxm', title: K.title, header: [K.cols.campaign].concat(chs.map(k => C.channel[k]), chs.map(k => `${C.channel[k]} Ach %`), [K.cols.total, K.cols.share]), cols: ['text'].concat(chs.map(() => 'money'), chs.map(() => 'pct'), ['money', 'pct']),
      rows: d.rows.map(r => [{ v: r.name, bold: true }].concat(chs.map(k => (r.byCh[k] ? r.byCh[k].actual : null)), chs.map(k => (r.byCh[k] ? r.byCh[k].achF : null)), [r.total ? r.total.actual : null, r.total ? r.total.share : null])),
      total: [K.total].concat(chs.map(k => d.totals[k].actual), chs.map(k => d.totals[k].achF), [d.totals.all.actual, 1]) }; });

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.sales}`], [D.meta.scope, P.periodWords()], [D.meta.status, P.statusWords()]]);
  function onClick(e) {
    const t = e.target;
    if (P.onShowTarget(e, TAB, renderAll)) return;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.sales, P.scopeText(), X.tabTables('sales', ctx()), meta()); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl] || dl.dataset.dl, P.scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    const mo = t.closest('tr[data-mon]'); if (mo && !t.closest('button, a')) { const [id, tab] = mo.dataset.mon.split('|'); CP.screens.dashboard.openCampaign(id, tab); return; }
    const vw = t.closest('[data-view]');
    if (vw) { const k = vw.dataset.view; st[k] = st[k] === 'table' ? (k === 'skuView' || k === 'cxmView' ? 'list' : 'chart') : 'table'; save(); ({ view: renderMonth, skuView: renderSku, cxmView: renderCxm })[k](); return; }
    const sg = t.closest('.seg[data-sunit] button, .seg[data-smode] button, .seg[data-sby] button, .seg[data-cxseg] button');
    if (sg) { const g = sg.closest('.seg'), v = sg.dataset.v;
      if (g.hasAttribute('data-sunit')) { st.unit = v === 'qty' ? 'qty' : 'amount'; renderMonth(); }
      else if (g.hasAttribute('data-smode')) { st.mode = v === 'cumulative' ? 'cumulative' : 'monthly'; renderMonth(); }
      else if (g.hasAttribute('data-sby')) { st.by = ['campaign', 'channel'].includes(v) ? v : 'total'; st.focus = null; renderMonth(); renderRbc(); }
      else { st.cxSeg = ['ach', 'share'].includes(v) ? v : 'actual'; renderCxm(); }
      save(); return; }
    const fo = t.closest('[data-sfocus]'); if (fo) { const k = fo.dataset.sfocus; st.focus = st.focus === k ? null : k; renderMonth(); renderRbc(); return; }
    if (t.closest('[data-rbcall]')) { st.rbcAll = !st.rbcAll; save(); renderRbc(); return; }
    const pb = t.closest('.pbrow[data-monrow]'); if (pb) { const [id, tab] = pb.dataset.monrow.split('|'); CP.screens.dashboard.openCampaign(id, tab); return; }
    const tr = t.closest('tr[data-open]'); if (tr && !t.closest('button, a, input, select')) CP.screens.dashboard.openCampaign(tr.dataset.open, 'sales');
  }
  return { render, paceRows, rbcData, cxmData, skuSides, ranks };
})();
