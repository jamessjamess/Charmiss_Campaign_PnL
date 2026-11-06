/* screen-salesbudget.js — Dashboard › Sales & Budget (CR-07 §4.3 · was Sales, screen-sales.js, + the budget cards of Spend & Profit): where sales are
   short and where the money goes. #dashboard/salesbudget → CP.tabs.salesbudget · the shared toolbar (Year · Status · Export) ·
   Row 1 Target vs Actual by month (฿ | Qty) · Row 2 By channel (Ach of MT · TT · ECOM · a Sub-channel = its share of the actual only, D63) | SKU watchlist ·
   Row 3 Budget vs Actual by month (Marketing · Sales · Other) | Spend by line · Row 4 Budget by campaign (KOL — a row opens Campaign Monitor › Budget). */
CP.tabs.salesbudget = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, none, moneyCell, statusChip, segHTML } = U;
  const D = C.dash, S = C.sales, MN = C.money, TAB = 'salesbudget';
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);
  const saved = pref.json('sb', {}) || {};
  /* R5 — the channels folded at first (a click opens one) */
  const st = Object.assign({ unit: 'amount', mode: 'monthly', view: 'chart', sort: 'attention', chFolded: R.CHANNELS.slice(), chView: 'chart', sku: 'behind', skuView: 'list',
    bva: { mode: 'monthly', view: 'chart' }, sl: { type: 'marketing', view: 'chart' }, bOpen: [] }, saved);
  st.sort = oneOf(st.sort, R.SALES_SORTS, 'attention');
  const save = () => pref.setJson('sb', st);
  const rng = () => P.rng();
  const ctx = () => Object.assign(rng(), { seed: U.seed(), sort: st.sort, unit: st.unit, mode: st.mode, sku: st.sku, sl: st.sl, bOpen: st.bOpen, ids: null, m: { measure: 'spend', mode: st.bva.mode } });
  const noSales = () => !R.kpis(U.seed(), rng()).anySales;
  const showT = () => P.showTarget.has(TAB);
  const isQty = () => st.unit === 'qty';

  let el = null;
  function render(root) { el = root; if (!el.dataset.built) build(); renderAll(); return TAB; }
  function build() {
    el.innerHTML = `<div class="toolbar" id="s_tools"></div><div class="srcline" id="s_src"></div><div id="s_ns"></div>
      <div class="card" id="s_month"></div><div class="r2"><div class="card" id="s_ch"></div><div class="card" id="s_sku"></div></div>
      <div class="r2 st2"><div class="card" id="s_bva"></div><div class="card" id="s_sl"></div></div><div class="card" id="s_bud"></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr[data-open], tr[data-mon]'); if (tr && e.target === tr) { e.preventDefault(); tr.click(); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (el.offsetParent) { renderMonth(); renderBva(); } }, 120); };
    window.addEventListener('resize', redraw);
    document.addEventListener('cp:contentresize', redraw);
    el.dataset.built = '1';
  }
  function renderAll() {
    $('s_tools').innerHTML = P.periodHTML('s', renderAll) + `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button>`;
    $('s_src').innerHTML = P.sourceHTML(); $('s_ns').innerHTML = P.noSalesHTML(TAB, noSales());
    renderMonth(); renderCh(); renderSku(); renderBva(); renderSl(); renderBud();
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

  const gapCell = v => (v == null ? none() : `<span class="${R.tone(v, 'up')}">${esc((v > 0.5 ? '+' : '') + R.baht(v))}</span>`);
  const CH_COLOR = { MT: 'var(--ch-mt)', TT: 'var(--ch-tt)', ECOM: 'var(--ch-ecom)' };
  /* ---------- Row 2 — By channel: Ach of each channel · a Sub-channel = its share of the channel's actual (D63 — no target there) ---------- */
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
        .concat(open ? r.subs.filter(s => s.sub && s.actual != null).map(s => ({ label: s.sub, child: true, color: CH_COLOR[r.channel], fill: s.actual, value: `<span>${esc(R.pct(R.ratio(s.actual, r.actual)))}</span>`,
          sub: `${R.shortBaht(s.actual)} ${K.share}`, tip: `${s.sub}\n${K.cols.actual} ${R.baht(s.actual)} · ${K.shareTip(R.pct(R.ratio(s.actual, r.actual)), C.channel[r.channel])}` })) : []); });
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

  /* ---------- Row 3 — Budget vs Actual by month (Marketing · Sales · Other · the black tick = budget) | Spend by line ---------- */
  function renderBva() {
    const box = $('s_bva'); if (!box) return;
    const B = C.wf.bva, M = D.m, s = st.bva, table = s.view === 'table', md = R.byMonth(U.seed(), rng(), 'spend');
    const o = { mode: s.mode, stack: [{ k: 'mkt', color: '--mkt', label: M.legend.mkt }, { k: 'sls', color: '--sls', label: M.legend.sls }, { k: 'oth', color: '--oth', label: M.legend.oth }], good: 'down', planWord: M.legend.budget, lflWord: M.tip.budgetLfl, h: 320 };
    const t = md.toDate, gap = t ? t.gap : null, words = gap == null ? '' : Math.abs(gap) < 0.5 ? M.onBudget : (gap > 0 ? M.over : M.under)(R.shortBaht(Math.abs(gap)));
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(B.title, B.tip)}</h3><div class="ctl">${table ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      segHTML('data-bvamode', [{ v: 'monthly', label: M.monthly }, { v: 'cumulative', label: M.cumulative }], s.mode, { label: M.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="bva" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      `<div class="sumline">${t ? `<span class="tdl" tabindex="0" title="${esc(MN.budgetTD.d)}">${esc(M.toDateL)}</span><span>${esc(M.toDate(R.shortBaht(t.actual), R.shortBaht(t.plan), R.pctA(t.pct, true)))}</span>${words ? `<span>·</span><b class="${R.tone(gap, 'down')}">${esc(words)}</b>` : ''}`
        : `<span class="noa">${esc(D.k.noSpend)}</span>`}</div>` +
      (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('w_month', ctx()), 'w_month')}</div>` : `<div class="chartbox" id="bva_box"><svg id="bva_svg" role="img" aria-label="${esc(B.title)}"></svg><div class="tip" id="bva_tip"></div></div>`);
    if (!table) U.monthChart($('bva_svg'), $('bva_box'), $('bva_tip'), md, o);
  }
  function renderSl() { $('s_sl').innerHTML = CP.pnl.spendLineHTML(ctx()); }
  /* ---------- Row 4 — Budget by campaign (KOL · R.budgetTrack · the Status of R.issues) ---------- */
  function renderBud() {
    const T = C.sb.bud;
    $('s_bud').innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><button type="button" class="btn small" data-dl="w_budget">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` + CP.pnl.budgetTableHTML(ctx());
  }

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.salesbudget}`], [D.meta.scope, P.periodWords()], [D.meta.status, P.statusWords()]]);
  function onClick(e) {
    const t = e.target;
    if (P.onShowTarget(e, TAB, renderAll)) return;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.salesbudget, P.scopeText(), X.tabTables('salesbudget', ctx()), meta()); return; }
    const pn = CP.pnl.onClick(e, st); if (pn) { save(); if (pn === 'sl') renderSl(); else if (pn === 'b') renderBud(); return; }
    const bm = t.closest('.seg[data-bvamode] button'); if (bm) { st.bva.mode = bm.dataset.v === 'cumulative' ? 'cumulative' : 'monthly'; save(); renderBva(); return; }
    const mo = t.closest('tr[data-mon]'); if (mo && !t.closest('button, a')) { const [id, tab] = mo.dataset.mon.split('|'); CP.screens.dashboard.openCampaign(id, tab); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl], P.scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    const vw = t.closest('[data-view]');
    if (vw) { const k = vw.dataset.view; if (k === 'bva') { st.bva.view = st.bva.view === 'table' ? 'chart' : 'table'; save(); renderBva(); return; }
      st[k] = st[k] === 'table' ? (k === 'view' || k === 'chView' ? 'chart' : 'list') : 'table'; save(); ({ view: renderMonth, chView: renderCh, skuView: renderSku })[k](); return; }
    const sg = t.closest('.seg[data-sunit] button, .seg[data-smode] button, .seg[data-sskumode] button');
    if (sg) { const g = sg.closest('.seg'), v = sg.dataset.v;
      if (g.hasAttribute('data-sunit')) { st.unit = v === 'qty' ? 'qty' : 'amount'; renderMonth(); }
      else if (g.hasAttribute('data-smode')) { st.mode = v === 'cumulative' ? 'cumulative' : 'monthly'; renderMonth(); }
      else { st.sku = v === 'best' ? 'best' : 'behind'; renderSku(); }
      save(); return; }
    const hf = t.closest('[data-hbfold]');
    if (hf) { const k = hf.dataset.hbfold, s = new Set(st.chFolded); if (s.has(k)) s.delete(k); else s.add(k); st.chFolded = [...s]; save(); renderCh(); const again = el.querySelector(`[data-hbfold="${CSS.escape(k)}"]`); if (again) again.focus(); return; }
    const tr = t.closest('tr[data-open]'); if (tr && !t.closest('button, a, input, select')) CP.screens.dashboard.openCampaign(tr.dataset.open, 'sales');
  }
  function onChange(e) {
    void e;
  }
  return { render };
})();
