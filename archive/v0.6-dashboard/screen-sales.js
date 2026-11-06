/* screen-sales.js — Dashboard › Sales (CR-04 §10.1–10.2): are we reaching the sales target — and where are we short? → CP.tabs.sales
   #dashboard/sales · the shared toolbar · Row 1 KPI (Net revenue · Forecast (Est.) · Units sold · On target) · Row 2 Target vs Actual by month
   (U.monthChart · ฿ | Qty) · Row 3 Campaign attainment (R.salesTable, 10 columns, a row opens By campaign) · Row 4 By channel (R.channelSubs) |
   SKU watchlist (R.skuWatch). Every number from CP.rules · every Table view and Export = CP.export. */
CP.tabs.sales = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, none, moneyCell, statusChip, segHTML } = U;
  const D = C.dash, S = C.sales, MN = C.money, TAB = 'sales';
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);
  const saved = pref.json('sales', {}) || {};
  const st = Object.assign({ unit: 'amount', mode: 'monthly', view: 'chart', sort: 'attention', folded: [], tView: 'list', chFolded: [], chView: 'chart', sku: 'behind', skuView: 'list' }, saved);
  st.sort = oneOf(st.sort, R.SALES_SORTS, 'attention');
  const save = () => pref.setJson('sales', st);
  const rng = () => P.rng();
  const ctx = () => Object.assign(rng(), { seed: U.seed(), sort: st.sort, unit: st.unit, mode: st.mode, sku: st.sku });
  const noSales = () => !R.kpis(U.seed(), rng()).anySales;
  const showT = () => P.showTarget.has(TAB);
  const isQty = () => st.unit === 'qty';

  let el = null;
  function render(root) { el = root; if (!el.dataset.built) build(); renderAll(); return TAB; }
  function build() {
    el.innerHTML = `<div class="toolbar" id="s_tools"></div><div class="srcline" id="s_src"></div><div id="s_ns"></div><div class="kpis" id="s_kpis"></div>
      <div class="card" id="s_month"></div><div class="card" id="s_table"></div><div class="r2"><div class="card" id="s_ch"></div><div class="card" id="s_sku"></div></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr[data-open]'); if (tr && e.target === tr) { e.preventDefault(); CP.screens.dashboard.openCampaign(tr.dataset.open); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (el.offsetParent) renderMonth(); }, 120); };
    window.addEventListener('resize', redraw);
    document.addEventListener('cp:contentresize', redraw);
    el.dataset.built = '1';
  }
  function renderAll() {
    $('s_tools').innerHTML = P.periodHTML('s', renderAll) + `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button>`;
    $('s_src').innerHTML = P.sourceHTML(); $('s_ns').innerHTML = P.noSalesHTML(TAB, noSales());
    renderKpis(); renderMonth(); renderTable(); renderCh(); renderSku();
  }

  /* ---------- Row 1 — KPI (§10.1) ---------- */
  function renderKpis() {
    const seed = U.seed(), k = R.kpis(seed, rng()), T = R.salesTable(seed, rng(), 'attention'), p = k.pnl, A = p.actual, L = p.lfl, Pl = p.plan, K = S.k, kc = U.kpiCard, bs = U.barSeg, tot = T.total;
    /* Forecast (Est.): Σ forecast of the On going + the actual of the ended · of their full target */
    const fcLabel = labelInfo(K.forecast, MN.forecast), fpct = R.ratio(tot.forecast, tot.forecastFull), fst = R.attStatus(fpct) || 'ok';
    const notes = [tot.atTarget.length ? K.fcAtTarget(tot.atTarget) : '', tot.notCounted.length ? K.fcNotCounted(tot.notCounted.length) : ''].filter(Boolean);
    const forecast = tot.forecast == null
      /* CR-05 V5 — no actual: no forecast (the target is not a forecast) */
      ? kc({ label: fcLabel, value: C.common.none, none: true, valueTip: C.track.noForecast, cap: esc(C.track.noForecast) })
      : kc({ label: fcLabel, value: R.baht(tot.forecast), badge: U.estBadge(MN.forecast.f), suffix: K.fcOf(R.baht(tot.forecastFull)), bar: bs(Math.min(1, fpct || 0) * 100, fst), barTip: `${R.pct(fpct)} · ${R.baht(tot.forecast)} / ${R.baht(tot.forecastFull)}`,
        cap: `<b class="attx ${esc(fst)}">${esc(R.pctA(fpct))}</b> ${esc(K.fcCap)}` + (notes.length ? `<span class="capn">${esc(notes.join(' · '))}</span>` : ''), capTip: notes.join('\n') });
    /* Units sold: pieces of the actual · of the target pieces to date */
    const uLabel = labelInfo(K.units, MN.units), upct = R.ratio(A.qty, L.qty), ust = R.attStatus(upct) || 'ok';
    const units = A.rev == null || A.qty == null
      ? kc({ label: uLabel, value: Pl.qty == null ? C.common.none : K.pcs(U.shortNum(Pl.qty)), none: Pl.qty == null, goal: Pl.qty == null ? '' : D.k.badge.target, valueTip: Pl.qty == null ? '' : K.pcs(R.fmtNum(Math.round(Pl.qty))), cap: esc(A.rev == null ? D.k.noSales : K.noUnits) })
      : kc({ label: uLabel, value: K.pcs(R.fmtNum(Math.round(A.qty))), suffix: L.qty == null ? '' : K.unitsOf(K.pcs(R.fmtNum(Math.round(L.qty)))), bar: bs(Math.min(1, upct || 0) * 100, ust), barTip: R.pct(upct),
        cap: `<b class="attx ${esc(ust)}">${esc(R.pctA(upct))}</b> ${esc(K.unitsCap)}` });
    /* On target: campaigns On target / campaigns with an Ach % · On target | At risk | Behind */
    const n = T.withAch, by = T.by, oLabel = labelInfo(K.onTarget, S.t.attTip);
    const onT = !n ? kc({ label: oLabel, value: C.common.none, none: true, cap: esc(K.onTargetNone) })
      : kc({ label: oLabel, value: K.onTargetV(by.on_target, n), suffix: K.onTargetW, bar: ['on_target', 'at_risk', 'behind'].map(x => bs(by[x] / n * 100, x)).join(''),
        barTip: ['on_target', 'at_risk', 'behind'].map(x => `${by[x]} ${C.att[x]}`).join(' · '), cap: esc(K.onTargetCap(by.at_risk, by.behind)) });
    $('s_kpis').innerHTML = P.revenueCard(k) + forecast + units + onT;
  }

  /* ---------- Row 2 — Target vs Actual by month (every campaign in scope · ฿ | Qty) ---------- */
  const chartOpts = () => ({ mode: st.mode, color: '--rev', good: 'up', planWord: D.m.legend.target, lflWord: D.m.tip.targetLfl,
    fmt: isQty() ? U.shortNum : R.compact, full: isQty() ? v => `${R.fmtNum(Math.round(v))} pcs` : R.baht });
  function renderMonth() {
    const box = $('s_month'); if (!box) return;
    const M = S.m, table = st.view === 'table', md = R.byMonth(U.seed(), rng(), isQty() ? 'qty' : 'revenue'), o = chartOpts();
    const fold = !md.toDate && noSales() && !showT() && !table;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(M.title, M.tip)}</h3><div class="ctl">${table || fold ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      segHTML('data-sunit', [{ v: 'amount', label: M.baht }, { v: 'qty', label: M.qty }], st.unit, { label: M.unitL }) +
      segHTML('data-smode', [{ v: 'monthly', label: D.m.monthly }, { v: 'cumulative', label: D.m.cumulative }], st.mode, { label: D.m.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="view" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
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

  /* ---------- Row 3 — Campaign attainment (§10.2 · 10 columns) ---------- */
  const gapCell = v => (v == null ? none() : `<span class="${R.tone(v, 'up')}">${esc((v > 0.5 ? '+' : '') + R.baht(v))}</span>`);
  function fcCell(part, fc, status) {
    const T = S.t;
    if (part.kind === 'est') return moneyCell(part.v, '', { title: `${MN.forecast.h} · ${R.pct(fc.pct)} of ${R.baht(fc.full)}` });
    if (part.kind === 'final') return moneyCell(part.v, '', { title: T.final });
    if (part.kind === 'atTarget') return none(T.noPace);
    return none(status === 'not_started' || fc.why === 'no_actual' ? T.notCounted : T.noPace);
  }
  const CHIP = ['pending', 'cancelled', 'noActual'];
  function renderTable() {
    const box = $('s_table'), T = S.t, Kc = T.cols, data = R.salesTable(U.seed(), rng(), st.sort), table = st.tView === 'table', folded = new Set(st.folded);
    const anyOpen = data.rows.some(r => r.ch.length && !folded.has(r.c.id)), Wy = D.p.why;
    const head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl">` +
      `<label class="ms"><select class="ms-trigger sel" data-ssort aria-label="${esc(D.p.sortL)}">${R.SALES_SORTS.map(k => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${esc(D.p.sortBtn(T.sorts[k]))}</option>`).join('')}</select></label>` +
      `<button type="button" class="btn small" data-sfoldall="${anyOpen ? '1' : '0'}">${esc(anyOpen ? D.p.collapseAll : D.p.expandAll)}</button>` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="tView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (!data.anySales && !showT() && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('s_table', ctx()), 's_table')}</div>`; return; }
    if (!data.rows.length) { box.innerHTML = head + `<div class="c3-empty">${esc(D.noCampaign)}</div>`; return; }
    const cols = [{ l: Kc.campaign, cls: 'nm' }, { l: Kc.status }, { l: Kc.time, tip: T.timeTip }, { l: Kc.tgtTD, num: 1, tip: MN.tgtTD }, { l: Kc.actual, num: 1 },
      { l: Kc.ach, tip: MN.ach }, { l: Kc.gap, num: 1, tip: MN.gap }, { l: Kc.full, num: 1 }, { l: Kc.forecast, num: 1, tip: MN.forecast }, { l: Kc.att, tip: T.attTip }];
    const th = x => `<th class="${x.num ? 'num' : ''}${x.cls ? ' ' + x.cls : ''}">${x.tip ? labelInfo(x.l, x.tip, x.l, true) : esc(x.l)}</th>`;
    const cells = (n, fc) => `<td class="num">${moneyCell(n.tgtTD, n.actual == null ? Wy.noSales : '')}</td><td class="num">${moneyCell(n.actual, Wy.noSales)}</td>` +
      `<td>${U.pctBar(n.ach, n.actual == null ? Wy.noSales : Wy.noPlan, n.status || '', 44)}</td><td class="num">${gapCell(n.gap)}</td><td class="num">${moneyCell(n.full, Wy.noPlan)}</td><td class="num">${fc}</td>`;
    const rows = data.rows.map(r => {
      const open = r.ch.length && !folded.has(r.c.id), chips = CHIP.filter(k => r.chips[k]).map(k => `<span class="chip ${k === 'noActual' ? 'err' : 'grey'}" title="${esc(k === 'cancelled' && r.c.note ? r.c.note : D.p.chipTip[k])}">${esc(D.p.chips[k])}</span>`).join('');
      const main = `<tr class="click grp" tabindex="0" data-open="${esc(r.c.id)}" title="${esc(D.p.open(r.c.name))}"><td class="nm"><div class="nmw">` +
        (r.ch.length ? `<button type="button" class="chev" data-sfold="${esc(r.c.id)}" aria-expanded="${!!open}" aria-label="${esc(open ? D.p.collapse(r.c.name) : D.p.expand(r.c.name))}">${ICON.chevronDown}</button>` : `<span class="chev ph"></span>`) +
        `<div class="nmt"><b>${esc(r.c.name)}</b>${chips ? `<span class="chips">${chips}</span>` : ''}</div></div></td><td>${statusChip(r.status)}</td><td>${U.timeCell(r.time)}</td>` +
        cells(r.node, fcCell(r.part, r.forecast, r.status)) + `<td>${r.node.status ? U.attChip(r.node.status) : none(r.node.actual == null ? Wy.noSales : '')}</td></tr>`;
      const kids = open ? r.ch.map((h, i) => `<tr class="child${i === r.ch.length - 1 ? ' last' : ''}"><td class="nm"><span class="chname">${esc(C.channel[h.channel])} <span class="muted small">${esc(C.channelLong[h.channel])}</span></span></td><td></td><td></td>` +
        cells(h.node, fcCell(h.part, h.forecast, r.status)) + `<td>${h.node.status ? U.attChip(h.node.status) : ''}</td></tr>`).join('') : '';
      return main + kids;
    }).join('');
    const t = data.total, tfTip = [t.atTarget.length ? S.k.fcAtTarget(t.atTarget) : '', t.notCounted.length ? S.k.fcNotCounted(t.notCounted.length) : ''].filter(Boolean).join(' · ');
    box.innerHTML = head + `<div class="tablewrap" style="margin-top:12px"><table class="tbl port stbl"><thead><tr>${cols.map(th).join('')}</tr></thead><tbody>${rows}` +
      `<tr class="total"><td>${esc(D.p.total)}</td><td></td><td></td>${cells(t, t.forecast == null ? none(S.k.fcNone) : moneyCell(t.forecast, '', { title: tfTip }))}<td>${t.status ? U.attChip(t.status) : ''}</td></tr></tbody></table></div>`;
  }

  /* ---------- Row 4 — By channel (hbars: actual against the target to date · the sub-channels under each) ---------- */
  const CH_COLOR = { MT: 'var(--ch-mt)', TT: 'var(--ch-tt)', ECOM: 'var(--ch-ecom)' };
  function renderCh() {
    const box = $('s_ch'), K = S.ch, d = R.channelSubs(U.seed(), rng()), table = st.chView === 'table', folded = new Set(st.chFolded), tOnly = !d.anyActual;
    const head = `<div class="card-head"><h3>${labelInfo(K.title, K.tip)}</h3><div class="ctl">${table ? '' : `<div class="legend"><span><i class="bar" style="--sw:var(--ch-mt)"></i>${esc(U.actualWord())}</span><span><i class="tick"></i>${esc(tOnly ? K.cols.full : K.cols.tgtTD)}</span></div>`}` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="chView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (tOnly && !showT() && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('s_channel', ctx()), 's_channel', { maxH: 460 })}</div>`; return; }
    if (!d.rows.length) { box.innerHTML = head + `<div class="c3-empty">${esc(D.noCampaign)}</div>`; return; }
    const item = (x, label, lsub, child, color, chev) => ({ label, lsub, child, chev, color, fill: x.actual, tick: tOnly ? x.plan : x.lfl,
      value: tOnly ? `<span>${esc(R.shortBaht(x.plan))}</span>` : x.ach == null ? none(D.p.why.noSales) : `<b class="attx ${esc(x.status || '')}">${esc(R.pct(x.ach))}</b>`,
      sub: tOnly ? D.k.badge.target : `${R.shortBaht(x.actual)} / ${R.shortBaht(x.lfl)}`,
      tip: `${label}\n${K.cols.actual} ${R.baht(x.actual)} · ${K.cols.tgtTD} ${R.baht(x.lfl)} · ${K.cols.ach} ${R.pct(x.ach)} · ${K.cols.full} ${R.baht(x.plan)}` });
    const items = d.rows.flatMap(r => { const open = !folded.has(r.channel);
      return [item(r, C.channel[r.channel], C.channelLong[r.channel], false, CH_COLOR[r.channel], { key: r.channel, open, aria: (open ? K.collapse : K.expand)(C.channel[r.channel]) })]
        .concat(open ? r.subs.map(s => item(s, s.sub, '', true, CH_COLOR[r.channel])) : []); });
    box.innerHTML = head + `<div class="c3-body">${U.hbars(items, 'var(--rev)')}</div>` + (tOnly ? `<div class="c3-note">${esc(K.targetOnly)}</div>` :
      `<div class="c3-note">${esc(`${C.common.total}: ${K.cols.actual} ${R.baht(d.total.actual)} · ${K.cols.tgtTD} ${R.baht(d.total.lfl)} · ${K.cols.ach} ${R.pct(d.total.ach)}`)}</div>`);
  }

  /* ---------- Row 4 — SKU watchlist (Behind | Best · top 10 across every campaign) ---------- */
  function renderSku() {
    const box = $('s_sku'), K = S.sku, d = R.skuWatch(U.seed(), rng(), st.sku), table = st.skuView === 'table';
    const head = `<div class="card-head"><h3>${labelInfo(K.title, K.tip)}</h3><div class="ctl">${segHTML('data-sskumode', [{ v: 'behind', label: K.behind }, { v: 'best', label: K.best }], d.mode)}` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="skuView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (noSales() && !showT() && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('s_sku', ctx()), 's_sku')}</div>`; return; }
    if (!d.rows.length) { box.innerHTML = head + `<div class="c3-empty">${esc(K.none)}</div>`; return; }
    const body = d.rows.map(x => `<tr class="click" tabindex="0" data-open="${esc(x.c.id)}" title="${esc(`${x.product.name || x.key} · ${x.c.name}\n${K.cols.tgtTD} ${R.baht(x.tgtTD)} · ${K.cols.actual} ${R.baht(x.actual)}`)}">` +
      `<td class="nm sku"><b>${esc(x.product.nickname || x.product.name || x.key)}</b><span class="sk2">${esc(x.c.name)}</span></td><td>${U.pctBar(x.ach, '', x.status, 56)}</td><td class="num">${gapCell(x.gap)}</td></tr>`).join('');
    box.innerHTML = head + `<div class="tablewrap" style="margin-top:8px"><table class="tbl sku skuw"><thead><tr><th>${esc(K.cols.sku)}</th><th>${labelInfo(K.cols.ach, MN.ach, K.cols.ach, true)}</th><th class="num">${labelInfo(K.cols.gap, MN.gap, K.cols.gap, true)}</th></tr></thead><tbody>${body}</tbody></table></div>` +
      `<div class="c3-note">${esc(`${K.of(d.rows.length, d.n)} · ${C.att.behind} ${d.by.behind} · ${C.att.at_risk} ${d.by.at_risk} · ${C.att.on_target} ${d.by.on_target}`)}</div>`;
  }

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.sales}`], [D.meta.scope, P.periodWords()], [D.meta.status, P.statusWords()]]);
  function onClick(e) {
    const t = e.target;
    if (P.onPreset(e, 's', renderAll) || P.onShowTarget(e, TAB, renderAll)) return;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.sales, P.scopeText(), X.tabTables('sales', ctx()), meta()); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl], P.scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    const vw = t.closest('[data-view]');
    if (vw) { const k = vw.dataset.view; st[k] = st[k] === 'table' ? (k === 'view' || k === 'chView' ? 'chart' : 'list') : 'table'; save(); ({ view: renderMonth, tView: renderTable, chView: renderCh, skuView: renderSku })[k](); return; }
    const sg = t.closest('.seg[data-sunit] button, .seg[data-smode] button, .seg[data-sskumode] button');
    if (sg) { const g = sg.closest('.seg'), v = sg.dataset.v;
      if (g.hasAttribute('data-sunit')) { st.unit = v === 'qty' ? 'qty' : 'amount'; renderMonth(); }
      else if (g.hasAttribute('data-smode')) { st.mode = v === 'cumulative' ? 'cumulative' : 'monthly'; renderMonth(); }
      else { st.sku = v === 'best' ? 'best' : 'behind'; renderSku(); }
      save(); return; }
    const fa = t.closest('[data-sfoldall]');
    if (fa) { const d = R.salesTable(U.seed(), rng(), st.sort); st.folded = fa.dataset.sfoldall === '1' ? d.rows.filter(r => r.ch.length).map(r => r.c.id) : []; save(); renderTable(); return; }
    const fd = t.closest('[data-sfold]');
    if (fd) { e.stopPropagation(); const id = fd.dataset.sfold, s = new Set(st.folded); if (s.has(id)) s.delete(id); else s.add(id); st.folded = [...s]; save(); renderTable(); const again = el.querySelector(`[data-sfold="${CSS.escape(id)}"]`); if (again) again.focus(); return; }
    const hf = t.closest('[data-hbfold]');
    if (hf) { const k = hf.dataset.hbfold, s = new Set(st.chFolded); if (s.has(k)) s.delete(k); else s.add(k); st.chFolded = [...s]; save(); renderCh(); const again = el.querySelector(`[data-hbfold="${CSS.escape(k)}"]`); if (again) again.focus(); return; }
    const tr = t.closest('tr[data-open]'); if (tr && !t.closest('button, a, input, select')) CP.screens.dashboard.openCampaign(tr.dataset.open);
  }
  function onChange(e) {
    if (P.onRange(e, renderAll)) return;
    if (e.target.matches('[data-ssort]')) { st.sort = oneOf(e.target.value, R.SALES_SORTS, 'attention'); save(); renderTable(); }
  }
  /* the order the By campaign ‹ › walks: the Campaign attainment as sorted now */
  const order = () => R.salesTable(U.seed(), rng(), st.sort).rows.map(r => r.c.id);
  return { render, order };
})();
