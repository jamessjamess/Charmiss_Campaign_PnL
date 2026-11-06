/* screen-spend.js — Dashboard › Spend & Profit (CR-04 §10.3, was P&L Waterfall · screen-waterfall.js): where the money goes, what budget is left,
   and what we keep. #dashboard/spend → CP.tabs.spend · the shared parts of the P&L statement and Spend by line → CP.pnl (By campaign › Row 5 too).
   Toolbar: Scope (All campaigns or one Campaign) · the shared period · Status · Export.
   Row 1 KPI (Gross profit · Total spend · Campaign profit · Budget left) · Row 2 P&L waterfall (D18: Plan | Actual · Summary | Lines) ·
   Row 3 Budget vs Actual by month (U.monthChart, Marketing / Sales stacked) · Row 4 Spend & profit by campaign (R.spendTable · a row = Scope) ·
   Row 5 P&L statement | Spend by line — the waterfall = the statement = the KPI (one R.statement()). */

/* ===================== the P&L statement and Spend by line (Spend & Profit · By campaign) ===================== */
CP.pnl = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, { C, R, esc, ICON, labelInfo, none, segHTML } = U, Wd = C.wf, D = C.dash;
  /* x = { seed, from, to, statuses, includeCancelled, only, today, ids (one Campaign id or null), basis, stOpen [], sl { type, view }, scopeText, mock } */
  function statementHTML(x) {
    /* CR-05 V7 — Same months as actual with no month of actual → the Full plan by itself */
    const S = Wd.st; let s = R.statement(x.seed, x, x.ids, x.basis); if (x.basis !== 'full' && !s.actualTo) s = R.statement(x.seed, x, x.ids, 'full');
    const p = s.pnl, A = p.actual, Wy = D.p.why, open = new Set(x.stOpen || []), mode = s.mode;
    const cellV = (v, why, good, isVar) => (v == null ? none(why) : `<span class="${isVar ? R.tone(v, good) : Math.round(v) < 0 ? 'neg' : ''}">${esc((isVar && v > 0.5 ? '+' : '') + R.baht(v))}</span>`);
    const pctV = (v, good) => (v == null ? none() : `<span class="${R.tone(v, good)}">${esc((v > 0.0005 ? '+' : '') + R.pct(v, 1))}</span>`);
    const planWhy = mode === 'same' ? S.noLfl : Wy.noPlan;
    const body = s.rows.map(r => {
      const major = ['revenue', 'gp', 'profit'].includes(r.key), lines = r.key === 'mkt' || r.key === 'sls' ? s.lines[r.key] : null, isOpen = lines && open.has(r.key);
      /* P8 — GP % / Margin % a small line under the label (no sideways scroll) */
      const pp = r.key === 'gp' ? S.gpPct(R.pct(s.pct.gp[1])) : r.key === 'profit' ? S.marginPct(R.pct(s.pct.margin[1])) : '';
      const ppPlan = r.key === 'gp' ? R.pct(s.pct.gp[0]) : r.key === 'profit' ? R.pct(s.pct.margin[0]) : '';
      const rowTip = r.key === 'revenue' ? S.revenueTip : r.key === 'mkt' || r.key === 'sls' ? S.expTip : '';
      const label = `<span class="lblw">${lines ? `<button type="button" class="chev" data-stlines="${r.key}" aria-expanded="${!!isOpen}" aria-label="${esc((isOpen ? S.collapseLines : S.expandLines)(S.rows[r.key]))}"${lines.length ? '' : ' disabled'}>${ICON.chevronDown}</button>` : '<span class="chev ph"></span>'}` +
        `<span class="lbt"><span${rowTip ? ` class="tiph" title="${esc(rowTip)}"` : ''}>${esc(S.rows[r.key])}</span>${pp ? `<small class="pp" title="${esc(`${S.cols.plan} ${ppPlan}`)}">${esc(pp)}</small>` : ''}</span></span>`;
      const whyA = r.key === 'mkt' || r.key === 'sls' ? Wy.noSpend : A.rev == null ? Wy.noSales : Wy.noCogs;
      const cg = r.key === 'cogs' || r.key === 'gp' || r.key === 'profit', eP = cg && s.est.plan && r.plan != null ? U.cogsEstBadge(s.est.planAmt, s.est.who[0]) : '', eA = cg && s.est.actual && r.actual != null ? U.cogsEstBadge(s.est.actualAmt, s.est.who[1]) : '';
      const main = `<tr class="${major ? 'major' : ''}"><td class="lbl">${label}</td><td class="num">${eP}${cellV(r.plan, cg && p.cogsBad[0] && mode === 'full' ? Wy.noCogs : planWhy)}</td>` +
        `<td class="num">${eA}${cellV(r.actual, whyA)}</td><td class="num">${cellV(r.var, '', r.good, true)}</td><td class="num">${pctV(r.varPct, r.good)}</td></tr>`;
      const subs = isOpen ? (lines.length ? lines.map(l => `<tr class="sub"><td class="lbl">${esc(l.line)}</td><td class="num">${cellV(l.plan, planWhy)}</td><td class="num">${cellV(l.actual, Wy.noSpend)}</td><td class="num">${cellV(l.var, '', 'down', true)}</td><td class="num">${pctV(l.varPct, 'down')}</td></tr>`).join('')
        : `<tr class="sub"><td class="lbl muted" colspan="5">${esc(S.noLines)}</td></tr>`) : '';
      return main + subs;
    }).join('');
    return `<div class="card-head"><h3>${esc(S.title)}</h3><div class="ctl">${segHTML('data-basis-seg', [{ v: 'same', label: S.same }, { v: 'full', label: S.full }], mode, { label: S.modeL })}` +
      `<button type="button" class="btn small" data-dl="statement">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      `<div class="sumline"><span class="noa">${esc(`${x.scopeText} · ${s.actualTo ? S.actualTo(R.monthName(s.actualTo)) : S.noActual}`)}</span></div>` +
      `<div class="tablewrap stwrap" style="margin-top:10px"><table class="tbl stmt"><thead><tr><th></th><th class="num"><span class="tiph" title="${esc(S.planTip)}">${esc(S.cols.plan)}</span></th><th class="num">${esc(S.cols.actual)}</th><th class="num">${esc(S.cols.var)}</th><th class="num">${esc(S.cols.varPct)}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  /* Spend by line: top 8 + Other · bar = actual · black tick = budget */
  function spendLineHTML(x) {
    const L = D.sl, s = x.sl, type = s.type === 'sales' ? 'sales' : 'marketing', table = s.view === 'table', all = X.lineRowsFor(x, type), rows = X.topLines(all, 8);
    const sum = k => all.reduce((t, r) => (r[k] == null ? t : (t || 0) + r[k]), null), anyA = all.some(r => r.actual != null);
    const items = rows.map(r => ({ label: r.line, fill: r.actual, tick: r.budget, value: r.actual == null ? none(D.p.why.noSpend) : `<span>${esc(R.compact(r.actual))}</span>`, sub: `${L.colB} ${r.budget == null ? '—' : R.compact(r.budget)}`,
      tip: `${r.line}\n${L.colA} ${R.baht(r.actual)} · ${L.colB} ${R.baht(r.budget)}${r.variance == null ? '' : ` · ${L.colVar} ${r.variance > 0 ? '+' : ''}${R.baht(r.variance)}`}` }));
    const color = type === 'sales' ? 'var(--sls)' : 'var(--mkt)';
    /* CR-05 V8 — nothing to show in either type: the card folds (CR-04 §7.3) */
    if (!table && !items.length && !X.lineRowsFor(x, type === 'sales' ? 'marketing' : 'sales').length) return `<div class="card-head"><h3>${labelInfo(L.title, L.tip)}</h3></div>` + U.foldedLine(L.empty);
    return `<div class="card-head"><h3>${labelInfo(L.title, L.tip)}</h3><div class="ctl"><div class="legend"><span><i class="bar" style="--sw:${color}"></i>${esc(L.colA)}</span><span><i class="tick"></i>${esc(L.colB)}</span></div>` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="sl" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      `<div class="c3-seg">${segHTML('data-sltype', [{ v: 'marketing', label: L.mkt }, { v: 'sales', label: L.sls }], type)}</div>` +
      `<div class="c3-body">${table ? U.tableHTML(X.rowsFor('spendline', x), 'spendline', { maxH: 420 }) : items.length ? U.hbars(items, color) : U.emptyState({ title: L.empty })}</div>` +
      (!table && items.length ? `<div class="c3-note">${esc(`${C.common.total}: ${L.colA} ${anyA ? R.baht(sum('actual')) : C.common.none} · ${L.colB} ${R.baht(sum('budget'))}`)}</div>` : '');
  }
  /* the clicks of the two cards on a state { basis, stOpen, sl } → what to draw again: 'st' · 'basis' · 'sl' · null */
  function onClick(e, st) {
    const t = e.target;
    const lb = t.closest('[data-stlines]'); if (lb) { const s = new Set(st.stOpen), k = lb.dataset.stlines; if (s.has(k)) s.delete(k); else s.add(k); st.stOpen = [...s]; return 'st'; }
    const bs = t.closest('.seg[data-basis-seg] button'); if (bs) { st.basis = bs.dataset.v === 'full' ? 'full' : 'same'; return 'basis'; }
    const ty = t.closest('.seg[data-sltype] button'); if (ty) { st.sl.type = ty.dataset.v === 'sales' ? 'sales' : 'marketing'; return 'sl'; }
    if (t.closest('[data-view="sl"]')) { st.sl.view = st.sl.view === 'table' ? 'chart' : 'table'; return 'sl'; }
    return null;
  }
  return { statementHTML, spendLineHTML, onClick };
})();

CP.tabs.spend = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, none, moneyCell, statusChip, segHTML } = U;
  const Wd = C.wf, D = C.dash, MN = C.money, TAB = 'spend';
  const saved = pref.json('wf', {}) || {};
  const st = Object.assign({ scope: 'all', side: 'actual', lines: false, view: 'chart', basis: 'same', stOpen: [], sl: { type: 'marketing', view: 'chart' }, bva: { mode: 'monthly', view: 'chart' }, tView: 'list' }, saved);
  st.bva = Object.assign({ mode: 'monthly', view: 'chart' }, st.bva || {});
  const save = () => pref.setJson('wf', st);
  const camps = () => U.seed().campaigns || [];
  const ids = () => (st.scope !== 'all' && camps().some(c => c.id === st.scope) ? st.scope : null);
  const scopeName = () => { const id = ids(); return id ? camps().find(c => c.id === id).name : Wd.allScope; };
  /* the range of the cards: the shared period · Scope = one Campaign: that one only, whatever its status */
  const rng = () => { const x = P.rng(), id = ids(); return id ? Object.assign(x, { statuses: R.STATUSES.slice(), includeCancelled: true, only: [id] }) : x; };
  const ctx = () => Object.assign(rng(), { seed: U.seed(), allRange: P.rng(), ids: ids(), side: effSide(), basis: st.basis, lines: st.lines, sl: st.sl, stOpen: st.stOpen, scopeText: scopeName(), m: { measure: 'spend', mode: st.bva.mode } });
  const noSales = () => !R.kpis(U.seed(), rng()).anySales;
  const showT = () => P.showTarget.has(TAB);
  /* §7.3 — Show target: the waterfall draws the Plan side while there is no actual */
  const effSide = () => (st.side === 'actual' && showT() && noSales() ? 'plan' : st.side);

  let el = null;
  function render(root) {
    el = root;
    if (!el.dataset.built) build();
    if (st.scope !== 'all' && !ids()) st.scope = 'all';
    renderAll();
    return TAB;
  }
  function build() {
    el.innerHTML = `<div class="toolbar" id="w_tools"></div><div class="srcline" id="w_src"></div><div id="w_ns"></div><div class="kpis" id="w_kpis"></div>
      <div class="card" id="w_chart"></div><div class="card" id="w_bva"></div><div class="card" id="w_tbl"></div><div class="r2 st2"><div class="card" id="w_st"></div><div class="card" id="w_sl"></div></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr[data-scopeto]'); if (tr && e.target === tr) { e.preventDefault(); setScope(tr.dataset.scopeto); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (el.offsetParent) { renderChart(); renderBva(); } }, 120); };
    window.addEventListener('resize', redraw);
    document.addEventListener('cp:contentresize', redraw);
    el.dataset.built = '1';
  }
  function renderAll() { renderTools(); $('w_src').innerHTML = P.sourceHTML(); $('w_ns').innerHTML = P.noSalesHTML(TAB, noSales()); renderKpis(); renderChart(); renderBva(); renderTable(); renderSt(); renderSl(); }
  /* the Scope of another tab (By campaign › Open in Spend & Profit) */
  function setScope(id) { st.scope = id && camps().some(c => c.id === id) ? id : 'all'; save(); if (el && el.offsetParent) { renderAll(); window.scrollTo({ top: 0 }); } }

  /* ---------- toolbar: Scope (a choice with a search, by year — as wide as its words, P6) · presets · range · Status · Export ---------- */
  function renderTools() {
    const td = U.today(), yearOf = c => c.year || +c.start.slice(0, 4), years = [...new Set(camps().map(yearOf))].sort();
    const opts = [{ value: 'all', label: Wd.allScope }].concat(years.flatMap(y => camps().filter(c => yearOf(c) === y).map((c, i) => ({ value: c.id, label: c.name, sub: `${R.dm(c.start)} – ${R.dm(c.end)}`,
      chip: (R.statusOf(c, td) === R.CANCELLED ? statusChip(R.CANCELLED) : ''), inGroup: String(y), group: i === 0 ? String(y) : '' }))));
    $('w_tools').innerHTML = U.singleSelect({ id: 'w_scope', options: opts, value: st.scope, label: `${Wd.scope}: ${scopeName()}`, aria: Wd.scope, placeholder: C.camp.campaignPh, fit: true,
        onChange: v => { st.scope = v; save(); renderAll(); } }) +
      P.periodHTML('w', renderAll) +
      `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button>`;
  }

  /* ---------- Row 1 — KPI (§10.3): Gross profit · Total spend · Campaign profit · Budget left ---------- */
  function renderKpis() {
    const seed = U.seed(), s = R.statement(seed, rng(), ids(), st.basis), sf = R.statement(seed, rng(), ids(), 'full'), p = s.pnl, A = p.actual, K = Wd.k, kc = U.kpiCard, bs = U.barSeg;
    const g = (k, side, from) => (from || s).rows.find(r => r.key === k)[side];
    const plan = k => { const v = g(k, 'plan'); return v != null ? { v, full: st.basis === 'full' } : { v: g(k, 'plan', sf), full: true }; };
    const suf = p0 => (p0.v == null ? K.plan(C.common.none) : K.plan(R.baht(p0.v))), sufTip = p0 => (p0.full ? Wd.st.full : Wd.st.same);
    const noRev = A.rev == null, why = noRev ? D.k.noSales : D.p.why.noCogs;
    const estOf = p0 => (p0.full && st.basis !== 'full' ? sf.est : s.est);
    /* GP · Campaign profit: actual · Plan (the statement's basis) · none yet = the plan of the period in grey (P4) */
    const card = (key, label, tip, v, cap, o = {}) => {
      const p0 = plan(key);
      if (noRev) { const pv = g(key, 'plan', sf), e = sf.est.plan;
        return kc({ label: labelInfo(label, tip), value: pv == null ? C.common.none : R.shortBaht(pv), none: pv == null, neg: pv < 0, goal: pv == null ? '' : D.k.badge.plan, valueTip: pv == null ? Wd.chart.noCogs : `${Wd.st.full} ${R.baht(pv)}${e ? ' · ' + U.cogsEstTip(sf.est.planAmt, sf.est.who[0]) : ''}`,
          cap: esc(D.k.noSales) }); }
      const e = estOf(p0), pe = e && e.plan, ae = s.est.actual && v != null;
      return kc({ label: labelInfo(label, tip), value: v == null ? C.common.none : R.baht(v), none: v == null, neg: v != null && v < 0, valueTip: v == null ? why : '',
        badge: ae && !o.est ? U.cogsEstBadge(s.est.actualAmt, s.est.who[1]) : '', suffix: suf(p0), suffixTip: sufTip(p0) + (pe ? ' · ' + U.cogsEstTip(e.planAmt, e.who[0]) : ''),
        bar: o.bar || '', barTip: o.barTip || '', cap: esc(cap), capTip: o.capTip || '' });
    };
    const gp = card('gp', K.gp, MN.gp, A.gp, A.gp == null ? why : K.gpCap(R.pct(A.gpPct)), { bar: bs(Math.abs(A.gpPct || 0) * 100, A.gp < 0 ? 'neg' : 'ok') });
    /* CR-05 V10 — the Est. badge of the actual moves to the end of the caption */
    const estOn = s.est.actual && A.profit != null;
    const profit = card('profit', K.profit, MN.profit, A.profit, A.profit == null ? why : K.profitCap(R.pct(A.margin), R.times(A.roi)), { bar: bs(Math.abs(A.margin || 0) * 100, A.profit < 0 ? 'neg' : 'ok'), capTip: `ROAS ${R.times(A.roas)}`, est: estOn });
    /* Total spend: actual · of the budget to date · bar = Used % */
    const over = p.used != null && p.used > 1, fb = p.plan.spend;
    const spend = A.spend == null
      ? kc({ label: labelInfo(K.spend, MN.spend), value: fb == null ? C.common.none : R.shortBaht(fb), none: fb == null, goal: fb == null ? '' : D.k.badge.budget, valueTip: fb == null ? '' : D.k.budgetTip(R.baht(fb)), cap: esc(D.k.noSpend) })
      : kc({ label: labelInfo(K.spend, MN.spend), value: R.baht(A.spend), suffix: p.lfl.spend == null ? '' : C.track.ofTD(R.baht(p.lfl.spend)), suffixTip: MN.budgetTD.d,
        bar: p.used == null ? '' : bs(Math.min(1, p.used) * 100, over ? 'over' : 'ok'), barTip: D.k.spendTip(R.baht(A.mkt), R.baht(A.sls), R.baht(p.lfl.spend), R.baht(fb)),
        cap: `<b class="${over ? 'bad' : ''}">${esc(R.pctA(p.used, true))}</b> ${esc(D.k.spendCap(A.ap == null ? '' : R.pct(A.ap)))}` });
    /* CR-05 V2 — Budget left → Budget: the one Budget bar of the current budget (§9.1) */
    const left = P.budgetCard(seed, rng(), A);
    $('w_kpis').innerHTML = gp + spend + profit + left;
  }

  /* ---------- Row 2 — the waterfall ---------- */
  function renderChart() {
    const box = $('w_chart'); if (!box) return;
    const Ch = Wd.chart, table = st.view === 'table', side = effSide(), w = R.waterfall(U.seed(), rng(), ids(), side, st.basis, st.lines);
    const legend = `<div class="legend wf-leg"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(Ch.legend.up)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(Ch.legend.down)}</span><span><i class="subt"></i>${esc(Ch.legend.sub)}</span></div>`;
    const fold = !table && side === 'actual' && !w.ok && w.reason === 'no_revenue' && noSales();
    const head = `<div class="card-head"><h3>${labelInfo(Ch.title, Ch.tip)}</h3><div class="ctl">${table || fold ? '' : legend}` +
      segHTML('data-wside', [{ v: 'plan', label: Ch.plan }, { v: 'actual', label: Ch.actual }], side) +
      segHTML('data-wlines', [{ v: 'summary', label: Ch.summary }, { v: 'lines', label: Ch.lines }], st.lines ? 'lines' : 'summary') +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="w" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (fold) { box.innerHTML = head + U.foldedLine(); return; }
    const sub = `<div class="sumline"><span class="noa">${esc(`${scopeName()} · ${P.periodWords()}${side === 'plan' ? ' · ' + Ch.basis(st.basis === 'full' ? Wd.st.full : Wd.st.same) : ''}`)}</span></div>`;
    if (table) { box.innerHTML = head + sub + `<div class="ctable">${U.tableHTML(X.rowsFor('w_chart', ctx()), 'w_chart')}</div>`; return; }
    if (!w.ok) {
      box.innerHTML = head + sub + (w.reason === 'no_cogs' ? `<div class="empty-st"><b>${esc(Ch.noCogs)}</b><span>${esc(Ch.noCogsWho(w.bad || []))}</span></div>`
        : `<div class="empty-st"><b>${esc(side === 'actual' ? D.k.noSales : Ch.noPlan)}</b>${side === 'plan' && st.basis === 'same' ? `<span class="links"><button type="button" class="link" data-basis="full">${esc(Wd.st.full)}</button></span>` : ''}</div>`);
      return;
    }
    box.innerHTML = head + sub + `<div class="chartbox wf" id="wf_box"><svg id="wf_svg" role="img" aria-label="${esc(Ch.title)}"></svg><div class="tip" id="wf_tip"></div></div>` +
      (w.est ? `<div class="estnote">${U.cogsEstBadge(w.estAmt, w.estWho)}<span>${esc(C.cogsEst.note(R.baht(w.estAmt), w.estWho).replace(/^Est\. — /, ''))}</span></div>` : '');
    drawWaterfall($('wf_svg'), $('wf_box'), $('wf_tip'), w);
  }
  /* square bars · increase green · decrease red · Gross profit / Campaign profit dark with an outline (negative = red outlined) · a faint band a group ·
     the labels wrap (never cut) · the value on the bar short + % of revenue · the tooltip in full baht */
  function drawWaterfall(svg, box, tip, w) {
    tip.classList.remove('show');
    const Ch = Wd.chart, steps = w.steps, n = steps.length, css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    const W = Math.max(320, Math.round(box.clientWidth || 900)), narrow = W < 700, H = narrow ? 340 : 400;
    const band = (W - (narrow ? 58 : 72) - 8) / n, small = band < 64 ? (band < 56 ? 'sm xs' : 'sm') : '', perLine = Math.max(6, Math.floor(band / (band < 56 ? 5.8 : small ? 6.3 : 7.4)));
    const pctOf = v => R.pct(v != null && Math.abs(v) < 0.005 ? 0 : v);
    const wrap = t => { const words = String(t).split(/\s+/), out = []; let cur = '';
      words.forEach(x => { if (!cur) cur = x; else if ((cur + ' ' + x).length <= perLine) cur += ' ' + x; else { out.push(cur); cur = x; } }); if (cur) out.push(cur);
      return out; };
    const labels = steps.map(s => wrap(Ch.steps[s.label] || s.label)), maxLines = Math.max(...labels.map(l => l.length));
    const m = { l: narrow ? 58 : 72, r: 8, t: 46, b: 24 + maxLines * 16 }, ih = H - m.t - m.b;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const vals = steps.flatMap(s => [s.from, s.to]), hi = Math.max(0, ...vals), lo = Math.min(0, ...vals), step = R.niceStep((hi - lo) / 4 || 1);
    const yMax = hi > 0 ? step * Math.ceil(hi * 1.08 / step) : 0, yMin = lo < 0 ? -step * Math.ceil(-lo * 1.08 / step) : 0, y = v => m.t + (yMax - v) / (yMax - yMin || 1) * ih;
    const bw = Math.max(8, Math.min(74, band * 0.6)), cx = i => m.l + band * i + band / 2;
    const cOk = css('--ok'), cErr = css('--err'), cInk = css('--text'), cSub = css('--text-2'), cGrid = css('--grid'), cAxis = css('--border-strong'), cBand = css('--surface-2'), cMuted = css('--muted');
    let g = '';
    let gi = 0;
    while (gi < n) { let gj = gi; while (gj + 1 < n && steps[gj + 1].group === steps[gi].group && steps[gj + 1].kind !== 'total') gj++;
      const x0 = m.l + band * gi + 2, x1 = m.l + band * (gj + 1) - 2;
      if (steps[gi].kind !== 'total') g += `<rect x="${x0}" y="${m.t - 34}" width="${x1 - x0}" height="${ih + 34}" fill="${cBand}" fill-opacity=".55" rx="0"/><text x="${x0 + 8}" y="${m.t - 18}" class="wf-g">${esc(Ch.groups[steps[gi].group])}</text>`;
      gi = gj + 1; }
    for (let v = yMin; v <= yMax + 1e-6; v += step) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${cGrid}" stroke-width="1"/><text x="${m.l - 10}" y="${y(v) + 4.5}" text-anchor="end" class="axis">${esc(R.compact(Math.abs(v) < 1e-6 ? 0 : v))}</text>`;
    let marks = '', text = '';
    steps.forEach((s, i) => {
      const x0 = cx(i) - bw / 2, top = Math.min(y(s.from), y(s.to)), h = Math.max(1, Math.abs(y(s.from) - y(s.to))), sub = s.kind === 'sub' || s.kind === 'total';
      const fill = sub ? (s.value < 0 ? cErr : cSub) : s.kind === 'up' ? cOk : cErr;
      marks += `<rect x="${x0.toFixed(2)}" y="${top.toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="0" fill="${fill}"${sub ? ` stroke="${cInk}" stroke-width="2"` : ''}/>`;
      if (i < n - 1) { const nx = cx(i + 1) - bw / 2; marks += `<line x1="${(x0 + bw).toFixed(2)}" x2="${nx.toFixed(2)}" y1="${y(s.to).toFixed(2)}" y2="${y(s.to).toFixed(2)}" stroke="${cMuted}" stroke-width="1" stroke-dasharray="3 3"/>`; }
      const below = sub && s.value < 0, vy = below ? top + h + 16 : top - 22, py = below ? top + h + 30 : top - 8;
      const words = s.kind === 'down' ? '−' + R.compact(Math.abs(s.value)) : R.compact(s.value);
      if (band >= 40) text += `<text x="${cx(i)}" y="${vy}" text-anchor="middle" class="wf-v${sub ? ' b' : ''}${small ? ' ' + small : ''}">${esc(words)}</text>` + (band >= 52 ? `<text x="${cx(i)}" y="${py}" text-anchor="middle" class="wf-p">${esc(pctOf(s.pctRev))}</text>` : '');
      labels[i].forEach((l, j) => { text += `<text x="${cx(i)}" y="${m.t + ih + 18 + j * 15}" text-anchor="middle" class="wf-l${sub ? ' b' : ''}${small ? ' ' + small : ''}">${esc(l)}</text>`; });
    });
    const hits = steps.map((s, i) => `<rect class="hit" data-i="${i}" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}" tabindex="0" aria-label="${esc(`${Ch.steps[s.label] || s.label} ${R.baht(s.value)}`)}"/>`).join('');
    svg.innerHTML = g + `<g>${hits}</g><g style="pointer-events:none">${marks}<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${cAxis}" stroke-width="1"/>${text}</g>`;
    const show = i => {
      const s = steps[i]; tip.textContent = '';
      const add = (cls, t) => { const e = document.createElement('div'); e.className = cls; e.textContent = t; tip.appendChild(e); return e; };
      const row = (l, v, cls) => { const e = add('r' + (cls ? ' ' + cls : ''), ''); const a = document.createElement('span'); a.textContent = l; const b = document.createElement('b'); b.textContent = v; e.appendChild(a); e.appendChild(b); };
      add('h', Ch.steps[s.label] || s.label); add('d', Ch.groups[s.group]);
      row(s.kind === 'sub' || s.kind === 'total' ? 'Amount' : s.kind === 'up' ? Ch.legend.up : Ch.legend.down, R.baht(s.value));
      row('% of revenue', R.pct(s.pctRev, 1)); row('Running total', R.baht(s.to), 'tot');
      const bx = box.getBoundingClientRect(), sc = bx.width / W; let left = cx(i) * sc + 14; if (left + 230 > bx.width) left = cx(i) * sc - 244;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = (m.t + 4) + 'px'; tip.classList.add('show');
    };
    svg.querySelectorAll('.hit').forEach(h => { const i = +h.dataset.i;
      h.addEventListener('pointerenter', () => show(i)); h.addEventListener('focus', () => show(i));
      h.addEventListener('pointerleave', () => tip.classList.remove('show')); h.addEventListener('blur', () => tip.classList.remove('show')); });
  }

  /* ---------- Row 3 — Budget vs Actual by month (the one monthly chart, Spend: Marketing / Sales stacked · the black tick = budget) ---------- */
  function renderBva() {
    const box = $('w_bva'); if (!box) return;
    const B = Wd.bva, M = D.m, s = st.bva, table = s.view === 'table', md = R.byMonth(U.seed(), rng(), 'spend');
    const o = { mode: s.mode, stack: [{ k: 'mkt', color: '--mkt', label: M.legend.mkt }, { k: 'sls', color: '--sls', label: M.legend.sls }], good: 'down', planWord: M.legend.budget, lflWord: M.tip.budgetLfl, h: 340 };
    const t = md.toDate, gap = t ? t.gap : null, words = gap == null ? '' : Math.abs(gap) < 0.5 ? M.onBudget : (gap > 0 ? M.over : M.under)(R.shortBaht(Math.abs(gap)));
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(B.title, B.tip)}</h3><div class="ctl">${table ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      segHTML('data-bvamode', [{ v: 'monthly', label: M.monthly }, { v: 'cumulative', label: M.cumulative }], s.mode, { label: M.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="bva" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      `<div class="sumline">${t ? `<span class="tdl" tabindex="0" title="${esc(MN.budgetTD.d)}">${esc(M.toDateL)}</span><span>${esc(M.toDate(R.shortBaht(t.actual), R.shortBaht(t.plan), R.pctA(t.pct, true)))}</span>${words ? `<span>·</span><b class="${R.tone(gap, 'down')}">${esc(words)}</b>` : ''}`
        : `<span class="noa">${esc(D.k.noSpend)}</span>${md.planTotal != null ? `<span class="noa">· ${esc(M.planOnly(M.legend.budget, R.shortBaht(md.planTotal)))}</span>` : ''}`}</div>` +
      (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('w_month', ctx()), 'w_month')}</div>` : `<div class="chartbox" id="bva_box"><svg id="bva_svg" role="img" aria-label="${esc(B.title)}"></svg><div class="tip" id="bva_tip"></div></div>`);
    if (!table) U.monthChart($('bva_svg'), $('bva_box'), $('bva_tip'), md, o);
  }

  /* ---------- Row 4 — Spend & profit by campaign (10 columns · a row sets Scope) ---------- */
  function renderTable() {
    const box = $('w_tbl'); if (!box) return;
    const T = Wd.table, Kc = T.cols, table = st.tView === 'table', d = R.spendTable(U.seed(), P.rng()), Wy = D.p.why, id = ids(), set = st.tSet === 'profit' ? 'profit' : 'budget';
    const head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl">${segHTML('data-tset', [{ v: 'budget', label: C.track.seg.budget }, { v: 'profit', label: C.track.seg.profit }], set)}` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="tView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor(set === 'budget' ? 'w_budget' : 'w_table', ctx()), set === 'budget' ? 'w_budget' : 'w_table')}</div>`; return; }
    if (set === 'budget') { box.innerHTML = head + budgetTableHTML(id); return; }
    if (!d.rows.length) { box.innerHTML = head + `<div class="c3-empty">${esc(D.noCampaign)}</div>`; return; }
    const cols = [{ l: Kc.campaign, cls: 'nm' }, { l: Kc.spend, num: 1 }, { l: Kc.budgetTD, num: 1, tip: MN.budgetTD }, { l: Kc.used, tip: MN.used }, { l: Kc.full, num: 1 }, { l: Kc.ap, num: 1, tip: MN.ap },
      { l: Kc.gp, num: 1, tip: MN.gp }, { l: Kc.profit, num: 1, tip: MN.profit }, { l: Kc.margin, num: 1, tip: MN.margin }, { l: Kc.roi, num: 1, tip: MN.roi }];
    const th = x => `<th class="${x.num ? 'num' : ''}${x.cls ? ' ' + x.cls : ''}">${x.tip ? labelInfo(x.l, x.tip, x.l, true) : esc(x.l)}</th>`;
    const pc = (v, why) => (v == null ? none(why) : `<span class="${v < 0 ? 'neg' : ''}">${esc(R.pct(v))}</span>`);
    const cells = p => { const a = p.actual, L = p.lfl, pl = p.plan;
      return `<td class="num">${moneyCell(a.spend, Wy.noSpend)}</td><td class="num">${moneyCell(a.spend == null ? null : L.spend, a.spend == null ? Wy.noSpend : Wy.noBudget)}</td>` +
        `<td>${U.pctBar(p.used, a.spend == null ? Wy.noSpend : Wy.noBudget, p.used > 1 ? 'over' : 'ok', 44)}</td><td class="num">${moneyCell(pl.spend, Wy.noBudget)}</td><td class="num">${pc(a.ap, Wy.noRev)}</td>` +
        `<td class="num">${moneyCell(a.gp, a.rev == null ? Wy.noSales : Wy.noCogs)}${a.gp != null && a.est ? U.cogsEstBadge(a.estAmt) : ''}</td><td class="num">${moneyCell(a.profit, a.rev == null ? Wy.noSales : Wy.noCogs)}</td>` +
        `<td class="num">${pc(a.margin, Wy.noRev)}</td><td class="num">${a.roi == null ? none(a.spend == null ? Wy.noSpendRoi : Wy.noRev) : esc(R.times(a.roi))}</td>`; };
    const rows = d.rows.map(r => `<tr class="click${r.c.id === id ? ' sel' : ''}" tabindex="0" data-scopeto="${esc(r.c.id)}" title="${esc(T.scopeTo(r.c.name))}"${r.c.id === id ? ' aria-current="true"' : ''}><td class="nm"><div class="nmt"><b>${esc(r.c.name)}</b>` +
      `<span class="chips">${r.status === R.CANCELLED ? `<span class="chip grey" title="${esc(r.c.note || C.status.cancelled)}">${esc(C.status.cancelled)}</span>` : ''}${r.c.id === id ? `<span class="chip sel">${esc(T.inScope)}</span>` : ''}</span></div></td>${cells(r.pnl)}</tr>`).join('');
    box.innerHTML = head + `<div class="tablewrap" style="margin-top:12px"><table class="tbl port wtbl"><thead><tr>${cols.map(th).join('')}</tr></thead><tbody>${rows}` +
      `<tr class="total"><td title="${esc(T.allNote)}">${esc(D.p.total)}</td>${cells(d.total)}</tr></tbody></table></div>`;
  }

  /* CR-05 §9.2 — the Budget set (KOL): Campaign · Original · Changes · Current budget · Committed · Used % · Remaining · Pending · Spend vs time · A&P % ·
     a row opens to its lines (Marketing ▸ / Sales ▸) · the Campaigns with no budget in one row (V4) */
  function budgetTableHTML(id) {
    const B = C.track, K2 = B.cols, bt = R.budgetTrack(U.seed(), P.rng()), ap = new Map(R.spendTable(U.seed(), P.rng()).rows.map(r => [r.c.id, r.pnl.actual.ap])), open = new Set(st.bOpen || []);
    const th = (l, tip, num) => `<th class="${num ? 'num' : ''}">${tip ? labelInfo(l, tip, l, true) : esc(l)}</th>`;
    const cells = (x, apv) => `<td class="num">${esc(R.baht(x.original))}</td><td class="num">${x.changes ? `<span class="${x.changes < 0 ? 'neg' : ''}">${esc((x.changes > 0 ? '+' : '') + R.baht(x.changes))}</span>` : none()}</td>` +
      `<td class="num"><b>${esc(R.baht(x.current))}</b></td><td class="num">${esc(R.baht(x.committed))}${x.paidV != null && x.committed ? `<div class="muted small">${esc(B.legend.paid)} ${esc(R.shortBaht(x.paidV))}</div>` : ''}</td>` +
      `<td>${x.current > 0 ? `<div class="bcell">${U.budgetBar(Object.assign({}, x, { paid: x.paidV }), { short: true })}<span class="small ${x.used > 1 ? 'neg' : 'muted'}">${esc(R.pctA(x.used, true))}</span></div>` : none(B.noBudget(''))}</td>` +
      `<td class="num${x.remaining < -0.5 ? ' neg' : ''}">${esc(R.baht(x.remaining))}</td><td class="num">${x.pending ? `<a class="link" href="#campaigns/approvals" title="${esc(B.toApprovals)}">${esc(R.signedShort(x.pending))}</a>` : none()}</td>` +
      `<td class="num">${x.svt == null ? none() : `<span class="${x.svt > 20 ? 'warnx' : 'okx'}">${esc(B.pts(x.svt))}</span>`}</td><td class="num">${apv === undefined ? '' : apv == null ? none() : esc(R.pct(apv))}</td>`;
    const withB = bt.rows.filter(t => t.current > 0 || t.committed > 0 || t.pending), noB = bt.rows.filter(t => !(t.current > 0 || t.committed > 0 || t.pending));
    const rows = withB.sort((a, b) => b.current - a.current).map(t => {
      const isO = open.has(t.id), sel = t.id === id;
      const lines = isO ? ['marketing', 'sales'].map(ty => { const ls = t.lines.filter(l => l.type === ty); if (!ls.length) return '';
        return `<tr class="sub grp"><td class="lbl" colspan="10"><b>${esc(ty === 'marketing' ? C.plan.grid.mkt : C.plan.grid.sls)}</b></td></tr>` + ls.map(l => `<tr class="sub"><td class="lbl">${esc(l.line)}</td>${cells(Object.assign({}, l, { svt: null }), undefined)}</tr>`).join(''); }).join('') : '';
      return `<tr class="click${sel ? ' sel' : ''}" tabindex="0" data-scopeto="${esc(t.id)}" title="${esc(Wd.table.scopeTo(t.c.name))}"><td class="nm"><div class="nmt"><span class="bnm"><button type="button" class="chev" data-bopen="${esc(t.id)}" aria-expanded="${isO}" aria-label="${esc((isO ? B.collapse : B.expand)(t.c.name))}">${ICON.chevronDown}</button><b>${esc(t.c.name)}</b></span>` +
        `<span class="chips">${t.status === R.CANCELLED ? `<span class="chip grey" title="${esc(t.c.note || C.status.cancelled)}">${esc(C.status.cancelled)}</span>` : ''}${sel ? `<span class="chip sel">${esc(Wd.table.inScope)}</span>` : ''}</span></div></td>${cells(t, ap.get(t.id))}</tr>` + lines; }).join('');
    const nb = noB.length ? `<tr class="nob"><td colspan="10" class="muted" title="${esc(noB.map(t => t.c.name).join(', '))}">${esc(B.noBudgetRows(noB.length))}</td></tr>` : '';
    const tot = bt.total, totAp = R.kpis(U.seed(), P.rng()).pnl.actual.ap;
    return `<div class="legend bbleg" style="margin-top:10px"><span><i class="sw paid"></i>${esc(B.legend.paid)}</span><span><i class="sw com"></i>${esc(B.legend.com)}</span><span><i class="sw rem"></i>${esc(B.legend.rem)}</span><span><i class="sw pend"></i>${esc(B.legend.pend)}</span><span><i class="sw tick"></i>${esc(B.legend.tick)}</span></div>` +
      `<div class="tablewrap" style="margin-top:8px"><table class="tbl port wtbl btbl"><thead><tr>${th(K2.campaign)}${th(K2.original, null, true)}${th(K2.changes, B.tips.changes, true)}${th(K2.current, B.tips.current, true)}${th(K2.committed, B.tips.committed, true)}${th(K2.used, B.tips.used)}${th(K2.remaining, B.tips.remaining, true)}${th(K2.pending, B.tips.pending, true)}${th(K2.svt, B.tips.svt, true)}${th(K2.ap, MN.ap, true)}</tr></thead>` +
      `<tbody>${rows}${nb}<tr class="total"><td>${esc(D.p.total)}</td>${cells(Object.assign({}, tot, { paidV: tot.paidPnl ? null : tot.paid }), totAp)}</tr></tbody></table></div>`;
  }

  /* ---------- Row 5 — P&L statement · Spend by line (CP.pnl) ---------- */
  function renderSt() { $('w_st').innerHTML = CP.pnl.statementHTML(ctx()); }
  function renderSl() { $('w_sl').innerHTML = CP.pnl.spendLineHTML(ctx()); }

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.spend}`], [Wd.scope, scopeName()], [D.meta.scope, P.periodWords()]].concat(ids() ? [] : [[D.meta.status, P.statusWords()]]));
  const fileScope = () => `${scopeName()} ${P.scopeText()}`;
  function onClick(e) {
    const t = e.target;
    if (P.onPreset(e, 'w', renderAll) || P.onShowTarget(e, TAB, renderAll)) return;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.spend, fileScope(), X.tabTables('spend', ctx()), meta()); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl], fileScope(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    const bs = t.closest('[data-basis]'); if (bs) { st.basis = bs.dataset.basis; save(); renderAll(); return; }
    const pn = CP.pnl.onClick(e, st);
    if (pn) { save(); if (pn === 'basis') { renderKpis(); renderChart(); renderSt(); } else if (pn === 'st') renderSt(); else renderSl(); return; }
    const vw = t.closest('[data-view]');
    if (vw) { const k = vw.dataset.view;
      if (k === 'w') { st.view = st.view === 'table' ? 'chart' : 'table'; renderChart(); }
      else if (k === 'bva') { st.bva.view = st.bva.view === 'table' ? 'chart' : 'table'; renderBva(); }
      else if (k === 'tView') { st.tView = st.tView === 'table' ? 'list' : 'table'; renderTable(); }
      save(); return; }
    const ts = t.closest('.seg[data-tset] button'); if (ts) { st.tSet = ts.dataset.v === 'profit' ? 'profit' : 'budget'; save(); renderTable(); return; }
    const bo = t.closest('[data-bopen]'); if (bo) { const s = new Set(st.bOpen || []), k = bo.dataset.bopen; if (s.has(k)) s.delete(k); else s.add(k); st.bOpen = [...s]; save(); renderTable(); return; }
    const sg = t.closest('.seg[data-wside] button, .seg[data-wlines] button, .seg[data-bvamode] button');
    if (sg) { const g = sg.closest('.seg'), v = sg.dataset.v;
      if (g.hasAttribute('data-wside')) { st.side = v === 'plan' ? 'plan' : 'actual'; if (st.side === 'actual') P.showTarget.delete(TAB); renderAll(); }
      else if (g.hasAttribute('data-wlines')) { st.lines = v === 'lines'; renderChart(); }
      else { st.bva.mode = v === 'cumulative' ? 'cumulative' : 'monthly'; renderBva(); }
      save(); return; }
    const tr = t.closest('tr[data-scopeto]'); if (tr && !t.closest('button, a, input, select')) setScope(tr.dataset.scopeto === ids() ? 'all' : tr.dataset.scopeto);
  }
  function onChange(e) {
    P.onRange(e, renderAll);
  }
  return { render, setScope };
})();
