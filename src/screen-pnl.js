/* screen-pnl.js — Dashboard › P&L (CR-07 §4.2 · CR-08 §6): what the campaigns earn, in total and one by one. → CP.tabs.pnl
   #dashboard/pnl · the shared toolbar (Year · Status …… As of ⓘ · Export) · Row 1 KPI (Net revenue · Gross profit · Total expenses · Campaign profit — the
   anatomy of §2.3) · Row 2 the P&L waterfall (Plan · Actual · Forecast, LEFT) | the P&L statement (Plan full · Actual YTD · Forecast end (Est.) · Forecast vs Plan ·
   Marketing ▸ Sales ▸ Other ▸, RIGHT) · Row 3 P&L by campaign (Actual | Plan | Forecast — a row opens Campaign Monitor › P&L) · Row 4 Profit by campaign | Marketing
   efficiency (the same rows, the same order — read across). CP.pnl — the parts shared with Budget and Campaign Monitor: the statement · Spend by line · the
   waterfall · Budget by campaign (KOL). */
CP.pnl = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, { C, R, esc, ICON, labelInfo, none, segHTML } = U, Wd = C.wf, D = C.dash, PL = C.pl;
  const GROUPS = { mkt: 'marketing', sls: 'sales', oth: 'other' };
  const money = (v, why, cls) => (v == null ? none(why) : `<span class="${cls || (Math.round(v) < 0 ? 'neg' : '')}">${esc(R.baht(v))}</span>`);
  const varCell = (v, good) => (v == null ? none() : `<span class="${R.tone(v, good)}">${esc((v > 0.5 ? '+' : '') + R.baht(v))}</span>`);

  /* ---------- the P&L statement: Plan (the scope's full plan) · Actual (to date) · Forecast end (Est.) · Forecast vs Plan ---------- */
  /* x = { seed, from, to, statuses, includeCancelled, only, today, ids (one id · a list · null = the scope), stOpen [], scopeText, cols { plan, actual } } */
  function statementHTML(x) {
    const S = PL.st, s = R.statement(x.seed, x, x.ids, 'full'), F = R.pnlForecast(x.seed, x, x.ids).forecast, open = new Set(x.stOpen || []), Wy = D.p.why, A = s.pnl.actual;
    const fcOf = { revenue: F.rev, cogs: F.cogs, gp: F.gp, mkt: F.mkt, sls: F.sls, oth: F.oth, profit: F.profit };
    const body = s.rows.map(r => {
      const major = ['revenue', 'gp', 'profit'].includes(r.key), lines = s.lines[r.key] || null, isOpen = lines && open.has(r.key), good = r.good, fc = fcOf[r.key];
      const pp = r.key === 'gp' ? S.pct(R.pct(s.pct.gp[1])) : r.key === 'profit' ? S.pct(R.pct(s.pct.margin[1])) : '';
      const label = `<span class="lblw">${lines ? `<button type="button" class="chev" data-stlines="${r.key}" aria-expanded="${!!isOpen}" aria-label="${esc((isOpen ? Wd.st.collapseLines : Wd.st.expandLines)(S.rows[r.key]))}"${lines.length ? '' : ' disabled'}>${ICON.chevronDown}</button>` : '<span class="chev ph"></span>'}` +
        `<span class="lbt"><span>${esc(S.rows[r.key])}</span>${pp ? `<small class="pp">${esc(pp)}</small>` : ''}</span></span>`;
      const main = `<tr class="${major ? 'major' : ''}"><td class="lbl">${label}</td><td class="num">${money(r.plan, Wy.noPlan)}</td><td class="num">${money(r.actual, ['mkt', 'sls', 'oth'].includes(r.key) ? Wy.noSpend : A.rev == null ? Wy.noSales : Wy.noCogs)}</td>` +
        `<td class="num"><span class="fcv" title="${esc(S.fcTip)}">${money(fc)}</span></td><td class="num">${varCell(fc == null || r.plan == null ? null : fc - r.plan, good)}</td></tr>`;
      const subs = isOpen ? (lines.length ? lines.map(l => `<tr class="sub"><td class="lbl">${esc(l.line)}</td><td class="num">${money(l.plan)}</td><td class="num">${money(l.actual, Wy.noSpend)}</td><td class="num"></td><td class="num"></td></tr>`).join('')
        : `<tr class="sub"><td class="lbl muted" colspan="5">${esc(Wd.st.noLines)}</td></tr>`) : '';
      return main + subs;
    }).join('');
    const cols = x.cols || S.cols;
    return `<div class="card-head"><h3>${labelInfo(S.title, S.tip)}</h3><div class="ctl"><button type="button" class="btn small" data-dl="statement">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      `<div class="sumline"><span class="noa">${esc(`${x.scopeText || ''}${s.actualTo ? ' · ' + Wd.st.actualTo(R.monthName(s.actualTo)) : ''}`)}</span></div>` +
      `<div class="tablewrap stwrap" style="margin-top:10px"><table class="tbl stmt"><thead><tr><th></th><th class="num">${esc(cols.plan)}</th><th class="num">${esc(cols.actual)}</th>` +
      `<th class="num">${labelInfo(cols.fc, S.fcInfo, cols.fc, true)}</th><th class="num">${esc(cols.fcVar)}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* ---------- Spend by line: Marketing · Sales · Other (top 8 + Other) · bar = actual · black tick = budget ---------- */
  function spendLineHTML(x) {
    const L = D.sl, s = x.sl, type = ['sales', 'other'].includes(s.type) ? s.type : 'marketing', table = s.view === 'table', all = X.lineRowsFor(x, type), rows = X.topLines(all, 8);
    const sum = k => all.reduce((t, r) => (r[k] == null ? t : (t || 0) + r[k]), null), anyA = all.some(r => r.actual != null);
    const items = rows.map(r => ({ label: r.line, fill: r.actual, tick: r.budget, value: r.actual == null ? none(D.p.why.noSpend) : `<span>${esc(R.compact(r.actual))}</span>`, sub: `${L.colB} ${r.budget == null ? '—' : R.compact(r.budget)}`,
      tip: `${r.line}\n${L.colA} ${R.baht(r.actual)} · ${L.colB} ${R.baht(r.budget)}${r.variance == null ? '' : ` · ${L.colVar} ${r.variance > 0 ? '+' : ''}${R.baht(r.variance)}`}` }));
    const color = type === 'sales' ? 'var(--sls)' : type === 'other' ? 'var(--oth)' : 'var(--mkt)';
    return `<div class="card-head"><h3>${labelInfo(L.title, L.tip)}</h3><div class="ctl"><div class="legend"><span><i class="bar" style="--sw:${color}"></i>${esc(L.colA)}</span><span><i class="tick"></i>${esc(L.colB)}</span></div>` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="sl" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      `<div class="c3-seg">${segHTML('data-sltype', [{ v: 'marketing', label: L.mkt }, { v: 'sales', label: L.sls }, { v: 'other', label: L.oth }], type)}</div>` +
      `<div class="c3-body">${table ? U.tableHTML(X.rowsFor('spendline', Object.assign({}, x, { sl: { type, view: 'table' } })), 'spendline', { maxH: 420 }) : items.length ? U.hbars(items, color) : U.emptyState({ title: L.empty })}</div>` +
      (!table && items.length ? `<div class="c3-note">${esc(`${C.common.total}: ${L.colA} ${anyA ? R.baht(sum('actual')) : C.common.none} · ${L.colB} ${R.baht(sum('budget'))}`)}</div>` : '');
  }

  /* ---------- the waterfall: the steps of a set (Forecast) · R.waterfall for Plan / Actual ---------- */
  function stepsOf(v) {
    const steps = []; let run = 0, rev = v.rev;
    const push = (key, group, label, val, kind) => { const from = kind === 'sub' || kind === 'total' ? 0 : run, to = kind === 'sub' || kind === 'total' ? val : run + val;
      steps.push({ key, group, label, value: val, kind: kind || (val >= 0 ? 'up' : 'down'), from, to, pctRev: rev ? val / rev : null }); run = to; };
    push('revenue', 'rev', 'revenue', v.rev, 'up'); push('cogs', 'rev', 'cogs', -(v.cogs || 0)); push('gp', 'rev', 'gp', v.gp, 'sub');
    if (v.mkt) push('mkt', 'mkt', 'mkt', -v.mkt); if (v.sls) push('sls', 'sls', 'sls', -v.sls); if (v.oth) push('oth', 'oth', 'oth', -v.oth);
    push('profit', 'oth', 'profit', v.profit, 'total');
    return { ok: v.rev != null && v.cogs != null, steps, rev: v.rev, profit: v.profit };
  }
  function waterfallOf(x, side) {
    if (side === 'forecast') { const F = R.pnlForecast(x.seed, x, x.ids).forecast; return F.rev ? stepsOf(F) : { ok: false, reason: 'no_revenue' }; }
    return R.waterfall(x.seed, x, x.ids, side === 'plan' ? 'plan' : 'actual', 'full', false);
  }
  /* square bars · increase green · decrease red · Gross profit / Campaign profit dark with an outline · a faint band a group · the tooltip in full baht */
  function drawWaterfall(svg, box, tip, w) {
    tip.classList.remove('show');
    const Ch = Wd.chart, steps = w.steps, n = steps.length, css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    const W = Math.max(300, Math.round(box.clientWidth || 600)), narrow = W < 700, H = narrow ? 320 : 360;
    /* CR-08 §2.5 · §6.2 — the axis labels first (short, no ".00"): the longest + 8 px of room = the left margin, so nothing leaves the card */
    const vals0 = steps.flatMap(s => [s.from, s.to]), hi0 = Math.max(0, ...vals0), lo0 = Math.min(0, ...vals0), step0 = R.niceStep((hi0 - lo0) / 4 || 1);
    const yMax0 = hi0 > 0 ? step0 * Math.ceil(hi0 * 1.08 / step0) : 0, yMin0 = lo0 < 0 ? -step0 * Math.ceil(-lo0 * 1.08 / step0) : 0, axf = v => U.trimMoney(R.compact(Math.abs(v) < 1e-6 ? 0 : v)), yt = [];
    for (let v = yMin0; v <= yMax0 + 1e-6; v += step0) yt.push(v);
    const ml = U.axisLeft(svg, yt.map(axf));
    const band = (W - ml - 8) / n, small = band < 64 ? (band < 56 ? 'sm xs' : 'sm') : '', perLine = Math.max(6, Math.floor(band / (band < 56 ? 5.8 : small ? 6.3 : 7.4)));
    const pctOf = v => R.pct(v != null && Math.abs(v) < 0.005 ? 0 : v);
    const wrap = t => { const words = String(t).split(/\s+/), out = []; let cur = '';
      words.forEach(x => { if (!cur) cur = x; else if ((cur + ' ' + x).length <= perLine) cur += ' ' + x; else { out.push(cur); cur = x; } }); if (cur) out.push(cur); return out; };
    const labels = steps.map(s => wrap(Ch.steps[s.label] || s.label)), maxLines = Math.max(...labels.map(l => l.length));
    const m = { l: ml, r: 8, t: 46, b: 24 + maxLines * 16 }, ih = H - m.t - m.b;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const yMax = yMax0, yMin = yMin0, y = v => m.t + (yMax - v) / (yMax - yMin || 1) * ih;
    const bw = Math.max(8, Math.min(74, band * 0.6)), cx = i => m.l + band * i + band / 2;
    const cOk = css('--ok'), cErr = css('--err'), cInk = css('--text'), cSub = css('--text-2'), cGrid = css('--grid'), cAxis = css('--border-strong'), cBand = css('--surface-2'), cMuted = css('--muted');
    let g = '', gi = 0;
    while (gi < n) { let gj = gi; while (gj + 1 < n && steps[gj + 1].group === steps[gi].group && steps[gj + 1].kind !== 'total') gj++;
      const x0 = m.l + band * gi + 2, x1 = m.l + band * (gj + 1) - 2;
      const gl = Ch.groups[steps[gi].group] || '';   /* the name of a group only where its band has room (CR-07: Marketing · Sales exp · Other exp one bar each) */
      if (steps[gi].kind !== 'total') g += `<rect x="${x0}" y="${m.t - 34}" width="${x1 - x0}" height="${ih + 34}" fill="${cBand}" fill-opacity=".55" rx="0"/>${x1 - x0 >= gl.length * 7.2 + 14 ? `<text x="${x0 + 8}" y="${m.t - 18}" class="wf-g">${esc(gl)}</text>` : ''}`;
      gi = gj + 1; }
    yt.forEach(v => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${cGrid}" stroke-width="1"/><text x="${m.l - 10}" y="${y(v) + 4.5}" text-anchor="end" class="axis">${esc(axf(v))}</text>`; });
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
      add('h', Ch.steps[s.label] || s.label); add('d', Ch.groups[s.group] || '');
      row(s.kind === 'sub' || s.kind === 'total' ? C.xl.amount : s.kind === 'up' ? Ch.legend.up : Ch.legend.down, R.baht(s.value));
      row(C.xl.pctRev, R.pct(s.pctRev, 1)); row(C.xl.running, R.baht(s.to), 'tot');
      const bx = box.getBoundingClientRect(), sc = bx.width / W; let left = cx(i) * sc + 14; if (left + 230 > bx.width) left = cx(i) * sc - 244;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = (m.t + 4) + 'px'; tip.classList.add('show');
    };
    svg.querySelectorAll('.hit').forEach(h => { const i = +h.dataset.i;
      h.addEventListener('pointerenter', () => show(i)); h.addEventListener('focus', () => show(i));
      h.addEventListener('pointerleave', () => tip.classList.remove('show')); h.addEventListener('blur', () => tip.classList.remove('show')); });
  }
  /* the waterfall card (P&L tab · Monitor › P&L) · side 'plan' | 'actual' | 'forecast' */
  function waterfallCard(box, x, side) {
    const Ch = Wd.chart, w = waterfallOf(x, side);
    const legend = `<div class="legend wf-leg"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(Ch.legend.up)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(Ch.legend.down)}</span><span><i class="subt"></i>${esc(Ch.legend.sub)}</span></div>`;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(PL.wf.title, PL.wf.tip)}</h3><div class="ctl">${legend}` +
      segHTML('data-wside', [{ v: 'plan', label: PL.wf.plan }, { v: 'actual', label: PL.wf.actual }, { v: 'forecast', label: PL.wf.fc }], side) + '</div></div>' +
      (w.ok ? `<div class="chartbox wf" data-wfbox><svg role="img" aria-label="${esc(PL.wf.title)}"></svg><div class="tip"></div></div>`
        : `<div class="empty-st"><b>${esc(w.reason === 'no_cogs' ? Ch.noCogs : side === 'actual' ? D.k.noSales : Ch.noPlan)}</b></div>`);
    if (w.ok) { const b = box.querySelector('[data-wfbox]'); drawWaterfall(b.querySelector('svg'), b, b.querySelector('.tip'), w); }
  }

  /* ---------- Budget by campaign (KOL): (Original · Changes ·) Current · Spent · Used % (+ the Time gone tick) · Remaining · Pending request · Status ----------
     CR-08 §5 — x.compact (Dashboard › Budget): no Original / Changes (they stay in the export) · the worst first: Over → Ended over → Near → Spending ahead → the rest by Used % */
  const BRANK = { over: 0, ended_over: 1, near: 2, ahead: 3, ok: 4 };
  function budgetTableHTML(x) {
    const B = C.track, K2 = B.cols, bt = R.budgetTrack(x.seed, x), iss = R.issues(x.seed, x), open = new Set(x.bOpen || []), td = x.today, cp = !!x.compact, nc = cp ? 7 : 9;
    const th = (l, tip, num) => `<th class="${num ? 'num' : ''}">${tip ? labelInfo(l, tip, l) : esc(l)}</th>`;
    const cells = (t, st, tg) => (cp ? '' : `<td class="num">${esc(R.baht(t.original))}</td><td class="num">${t.changes ? `<span class="${t.changes < 0 ? 'neg' : ''}">${esc((t.changes > 0 ? '+' : '') + R.baht(t.changes))}</span>` : none()}</td>`) +
      `<td class="num"><b>${esc(R.baht(t.current))}</b></td><td class="num">${esc(R.baht(t.committed))}</td>` +
      `<td>${t.current > 0 ? U.paceBar(t.used, tg, t.used > 1 ? 'over' : 'ok', 60) : none(B.noBudget(''))}</td>` +
      `<td class="num${t.remaining < -0.5 ? ' neg' : ''}">${esc(R.baht(t.remaining))}</td><td class="num">${t.pending ? `<a class="link" href="#planning/approvals" title="${esc(B.toApprovals)}">${esc(R.signedShort(t.pending))}</a>` : none()}</td>` +
      `<td>${st === undefined ? '' : U.issueChip(st)}</td>`;
    const bst = t => { const ir = iss.byId.get(t.id); return ir && ir.budget && ir.budget.status ? ir.budget.status : 'ok'; };
    const withB = bt.rows.filter(t => t.current > 0 || t.committed > 0 || t.pending).sort((a, b) => (cp ? (BRANK[bst(a)] ?? 5) - (BRANK[bst(b)] ?? 5) : 0) || (b.used || 0) - (a.used || 0));
    const rows = withB.map(t => {
      const isO = open.has(t.id), ir = iss.byId.get(t.id), bs = ir && ir.budget ? ir.budget.status : null, tg = R.timeGone(t.c, td);
      const lines = isO ? ['marketing', 'sales', 'other'].map(ty => { const ls = t.lines.filter(l => l.type === ty); if (!ls.length) return '';
        return `<tr class="sub grp"><td class="lbl" colspan="${nc}"><b>${esc(C.plan.grid.groups[ty])}</b></td></tr>` + ls.map(l => `<tr class="sub"><td class="lbl">${esc(l.line)}</td>${cells(l, undefined, tg)}</tr>`).join(''); }).join('') : '';
      return `<tr class="click" tabindex="0" data-mon="${esc(t.id)}|expenses" title="${esc(PL.tbl.open(t.c.name))}"><td class="nm"><div class="nmt"><span class="bnm"><button type="button" class="chev" data-bopen="${esc(t.id)}" aria-expanded="${isO}" aria-label="${esc((isO ? B.collapse : B.expand)(t.c.name))}">${ICON.chevronDown}</button><b>${esc(t.c.name)}</b></span></div></td>${cells(t, bs || 'ok', tg)}</tr>` + lines;
    }).join('');
    const tot = bt.total;
    return `<div class="legend bbleg" style="margin-top:6px"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(K2.used)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(C.yr.st.over)}</span><span><i class="tick"></i>${esc(C.yr.timeGone)}</span></div>` +
      `<div class="tablewrap" style="margin-top:8px"><table class="tbl port wtbl btbl${cp ? ' bcomp' : ''}"><thead><tr>${th(K2.campaign)}${cp ? '' : th(K2.original, null, true) + th(K2.changes, B.tips.changes, true)}${th(K2.current, B.tips.current, true)}${th(K2.committed, B.tips.committed, true)}${th(K2.used, B.tips.usedTime)}${th(K2.remaining, B.tips.remaining, true)}${th(K2.pending, B.tips.pending, true)}${th(K2.status)}</tr></thead>` +
      `<tbody>${rows || `<tr><td colspan="${nc}" class="muted">${esc(D.noCampaign)}</td></tr>`}<tr class="total"><td>${esc(D.p.total)}</td>${cells(tot, undefined, null)}</tr></tbody></table></div>`;
  }

  /* the clicks of the shared cards on a state { stOpen, sl, bOpen } → what to draw again: 'st' · 'sl' · 'b' · null */
  function onClick(e, st) {
    const t = e.target;
    const lb = t.closest('[data-stlines]'); if (lb) { const s = new Set(st.stOpen || []), k = lb.dataset.stlines; if (s.has(k)) s.delete(k); else s.add(k); st.stOpen = [...s]; return 'st'; }
    const ty = t.closest('.seg[data-sltype] button'); if (ty) { st.sl.type = ty.dataset.v; return 'sl'; }
    if (t.closest('[data-view="sl"]')) { st.sl.view = st.sl.view === 'table' ? 'chart' : 'table'; return 'sl'; }
    const bo = t.closest('[data-bopen]'); if (bo) { const s = new Set(st.bOpen || []), k = bo.dataset.bopen; if (s.has(k)) s.delete(k); else s.add(k); st.bOpen = [...s]; return 'b'; }
    return null;
  }
  return { statementHTML, spendLineHTML, stepsOf, waterfallOf, drawWaterfall, waterfallCard, budgetTableHTML, onClick, GROUPS };
})();

CP.tabs = CP.tabs || {};
CP.tabs.pnl = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, ICON, pref, labelInfo, none, segHTML } = U;
  const D = C.dash, PL = C.pl, MN = C.money, TAB = 'pnl';
  const st = Object.assign({ side: 'actual', tSide: 'actual', stOpen: [], sl: { type: 'marketing', view: 'chart' }, effView: 'chart' }, pref.json('pl', {}) || {});
  const save = () => pref.setJson('pl', st);
  const rng = () => P.rng();
  const ctx = () => Object.assign(rng(), { seed: U.seed(), ids: null, stOpen: st.stOpen, sl: st.sl, side: st.side, scopeText: P.periodWords(), basis: 'full' });
  let el = null;
  function render(root) { el = root; if (!el.dataset.built) build(); renderAll(); return TAB; }
  function build() {
    /* CR-08 §6.1 — the waterfall LEFT, the statement RIGHT (the same height) · Profit by campaign | Marketing efficiency (the same rows) */
    el.innerHTML = `<div class="toolbar" id="p_tools"></div><div class="kpis" id="p_kpis"></div>
      <div class="r2 pl2"><div class="card" id="p_wf"></div><div class="card" id="p_st"></div></div><div class="card" id="p_tbl"></div>
      <div class="r2 pl4"><div class="card" id="p_bars"></div><div class="card" id="p_eff"></div></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr[data-mon]'); if (tr && e.target === tr) { e.preventDefault(); tr.click(); } });
    let rt = null; const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (el.offsetParent) renderWf(); }, 120); };
    window.addEventListener('resize', redraw); document.addEventListener('cp:contentresize', redraw);
    el.dataset.built = '1';
  }
  function renderAll() {
    $('p_tools').innerHTML = P.toolsHTML('p', renderAll);
    renderKpis(); renderWf(); $('p_st').innerHTML = CP.pnl.statementHTML(ctx()); renderTbl(); renderBars(); renderEff();
  }
  /* Row 1 — CR-08 §6.1: Net revenue (as Overview) · Gross profit (GP 68% · plan 68%) · Total expenses (A&P 18.4% · plan 18.5% — the groups in the bar's colours and
     its tooltip) · Campaign profit (as Overview) — Actual YTD of the full-year plan · the Time gone tick where the number moves with the time */
  function renderKpis() {
    const kk = R.kpis(U.seed(), rng()), k = kk.pnl, A = k.actual, Pl = k.plan, K = PL.k, kc = U.kpiCard, bs = U.barSeg, yg = P.yearGone(), gr = R.ratio(A.gp, Pl.gp), ur = R.ratio(A.spend, Pl.spend);
    $('p_kpis').innerHTML = P.revenueKpi(kk) +
      kc({ key: 'gp', label: labelInfo(K.gp, MN.gp), value: A.gp == null ? C.common.none : R.baht(A.gp), none: A.gp == null, suffix: K.ofPlan(R.shortBaht(Pl.gp)), bar: bs(Math.min(1, Math.max(0, gr || 0)) * 100, 'ok'), tg: yg,
        barTip: K.gpTip(R.pct(gr)), cap: esc(K.gpCap(R.pct(A.gpPct), R.pct(Pl.gpPct))) }) +
      kc({ key: 'exp', label: labelInfo(K.exp, MN.spend), value: A.spend == null ? C.common.none : R.baht(A.spend), none: A.spend == null, suffix: K.ofPlan(R.shortBaht(Pl.spend)),
        bar: Pl.spend ? ['mkt', 'sls', 'oth'].map(g => bs(Math.min(1, (A[g] || 0) / Pl.spend) * 100, g)).join('') : '', tg: yg, barTip: K.expTip(R.shortBaht(A.mkt), R.shortBaht(A.sls), R.shortBaht(A.oth), R.pct(ur)),
        cap: esc(K.expCap(R.pct(A.ap, 1), R.pct(R.ratio(Pl.spend, Pl.rev), 1))) }) +
      P.profitKpi(kk);
  }
  function renderWf() { const box = $('p_wf'); if (box) CP.pnl.waterfallCard(box, ctx(), st.side); }
  /* Row 3 — P&L by campaign: Actual | Plan | Forecast · the total = the statement · a row → Campaign Monitor › P&L */
  function renderTbl() {
    const T = PL.tbl, K = T.cols, f = R.pnlForecast(U.seed(), rng()), side = st.tSide, Wy = D.p.why;
    const setOf = r => (side === 'plan' ? r.plan : side === 'forecast' ? r.forecast : r.actual);
    const vs = r => { const a = setOf(r); if (side === 'plan' || a.profit == null) return null; const pl = side === 'forecast' ? r.plan.profit : r.pnl.lfl.profit; return pl == null ? null : a.profit - pl; };
    const pc = v => (v == null ? none() : `<span class="${v < 0 ? 'neg' : ''}">${esc(R.pct(v, 1))}</span>`);
    /* CR-10 §4 (D96) — COGS · Gross profit · Total expenses (▸ Marketing · Sales · Other) · no GP % by campaign (the channel mix makes it mislead) */
    const op = !!st.expOpen, mny = v => (v == null ? none() : esc(R.baht(v))), tot = a => (a.mkt == null && a.sls == null && a.oth == null ? null : (a.mkt || 0) + (a.sls || 0) + (a.oth || 0));
    const cells = (a, v) => `<td class="num">${a.rev == null ? none(Wy.noSales) : esc(R.baht(a.rev))}</td><td class="num">${mny(a.cogs)}</td><td class="num">${mny(a.gp)}</td><td class="num exp">${mny(tot(a))}</td>` +
      (op ? `<td class="num sub">${mny(a.mkt)}</td><td class="num sub">${mny(a.sls)}</td><td class="num sub">${mny(a.oth)}</td>` : '') + `<td class="num"><b class="${a.profit < 0 ? 'neg' : ''}">${a.profit == null ? '—' : esc(R.baht(a.profit))}</b></td>` +
      `<td class="num">${pc(R.ratio(a.profit, a.rev))}</td><td class="num">${v == null ? none() : `<span class="${R.tone(v, 'up')}">${esc(R.signedShort(v))}</span>`}</td><td class="num">${R.ratio(a.profit, a.spend) == null ? none() : esc(R.times(R.ratio(a.profit, a.spend)))}</td>`;
    const rows = f.rows.slice().sort((a, b) => (setOf(b).profit || 0) - (setOf(a).profit || 0)).map(r => `<tr class="click" tabindex="0" data-mon="${esc(r.id)}|pnl" title="${esc(T.open(r.c.name))}"><td class="nm"><b>${esc(r.c.name)}</b></td>${cells(setOf(r), vs(r))}</tr>`).join('');
    const totA = side === 'plan' ? f.total.plan : side === 'forecast' ? f.forecast : f.total.actual, totV = side === 'plan' ? null : side === 'forecast' ? (f.forecast.profit == null || f.total.plan.profit == null ? null : f.forecast.profit - f.total.plan.profit) : (totA.profit == null || f.total.lfl.profit == null ? null : totA.profit - f.total.lfl.profit);
    const th = (l, tip, num) => `<th class="${num ? 'num' : ''}">${tip ? labelInfo(l, tip, l) : esc(l)}</th>`;
    $('p_tbl').innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl">${segHTML('data-tside', [{ v: 'actual', label: PL.wf.actual }, { v: 'plan', label: PL.wf.plan }, { v: 'forecast', label: PL.wf.fc }], side)}` +
      `<button type="button" class="btn small" data-dl="p_table">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      (f.rows.length ? `<div class="tablewrap" style="margin-top:10px"><table class="tbl port wtbl ptbl${op ? ' expopen' : ''}"><thead><tr>${th(K.campaign)}${th(K.rev, null, true)}${th(K.cogs, MN.cogs, true)}${th(K.gp, T.gpTip, true)}` +
        `<th class="num exp"><span class="exph"><button type="button" class="chev" data-expcols aria-expanded="${op}" aria-label="${esc(op ? T.expClose : T.expOpen)}" title="${esc(op ? T.expClose : T.expOpen)}">${ICON.chevronDown}</button>${labelInfo(K.exp, T.expTip, K.exp)}</span></th>` +
        (op ? `${th(K.mkt, null, true).replace('<th class="num">', '<th class="num sub">')}${th(K.sls, null, true).replace('<th class="num">', '<th class="num sub">')}${th(K.oth, null, true).replace('<th class="num">', '<th class="num sub">')}` : '') +
        `${th(K.profit, MN.profit, true)}${th(K.margin, MN.margin, true)}${th(K.vsPlan, T.vsTip, true)}${th(K.roi, MN.roi, true)}</tr></thead>` +
        `<tbody>${rows}<tr class="total"><td>${esc(D.p.total)}</td>${cells(totA, totV)}</tr></tbody></table></div>` : `<div class="c3-empty">${esc(D.noCampaign)}</div>`);
  }
  /* Row 4 — the rows of Profit by campaign and Marketing efficiency: the same Campaigns in the same order (Campaign profit, largest first) */
  const barRows = () => R.pnlForecast(U.seed(), rng()).rows.filter(r => r.actual.profit != null || r.plan.profit != null).sort((a, b) => (b.actual.profit || 0) - (a.actual.profit || 0) || a.c.name.localeCompare(b.c.name, 'en'));
  /* Profit by campaign (CR-08 §6.3): Actual (the bar, from 0 at the left) + Plan (the tick) · a 0 in the middle only when there is a loss · one line ฿47.5M · plan ฿49.3M */
  function renderBars() {
    const T = PL.bars, rows = barRows();
    const items = rows.map(r => ({ id: r.id, name: r.c.name, v: r.actual.profit, tick: r.plan.profit, cls: r.actual.profit < 0 ? 'neg' : 'ok', vcls: r.actual.profit < 0 ? 'neg' : '',
      value: T.val(r.actual.profit == null ? C.common.none : R.shortBaht(r.actual.profit), R.shortBaht(r.plan.profit)), tip: `${r.c.name}\n${T.actual} ${R.baht(r.actual.profit)} · ${T.plan} ${R.baht(r.plan.profit)}` }));
    $('p_bars').innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3></div>` +
      `<div class="effleg"><div class="legend"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(T.actual)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(T.loss)}</span><span><i class="tick"></i>${esc(T.plan)}</span></div></div>` +
      (rows.length ? U.rowBars(items) : `<div class="c3-empty">${esc(D.noCampaign)}</div>`);
  }
  /* Marketing efficiency (CR-08 §6.4 · D77): net sales per ฿1 of marketing (the bar) · the plan (the tick) · the year's average (the dashed line) · the rows of Profit by campaign */
  function renderEff() {
    const T = PL.eff, e = R.mktEfficiency(U.seed(), rng()), rows = barRows(), y = P.year(), table = st.effView === 'table';
    const items = rows.map(r => { const x = e.byId.get(r.id) || {};
      return { id: r.id, name: r.c.name, v: x.actual, tick: x.plan, cls: x.tone || 'ok', vcls: x.actual == null ? 'none' : '',
        value: x.actual == null ? T.none : T.val(R.times(x.actual), R.pct(x.share, 1)), tip: T.rowTip(r.c.name, R.times(x.actual), R.times(x.plan), R.times(e.avg), R.baht(x.mkt), R.baht(x.rev)) }; });
    const lg = `<div class="legend"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(T.legend.ok)}</span><span><i class="bar" style="--sw:var(--warn)"></i>${esc(T.legend.warn)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(T.legend.err)}</span>` +
      `<span><i class="tick"></i>${esc(T.legend.plan)}</span><span><i class="avgd"></i>${esc(T.legend.avg(y))} ${esc(R.times(e.avg))}</span></div>`;
    $('p_eff').innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip(y))}</h3><div class="ctl"><button type="button" class="btn small${table ? ' on' : ''}" data-view="eff" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('p_eff', ctx()), 'p_eff')}</div>` : `<div class="effleg">${lg}</div>` + (rows.length ? U.efficiencyBars(items, { avg: e.avg }) : `<div class="c3-empty">${esc(D.noCampaign)}</div>`));
  }

  /* ---------- Export: 4 sheets (KPI · statement · P&L by campaign · Profit by campaign) ---------- */
  X.register('p_kpi', x => { const k = R.kpis(x.seed, x).pnl, A = k.actual, Pl = k.plan, K = PL.k;
    return { key: 'p_kpi', title: PL.file.kpi, header: [C.xl.metric, C.xl.actualYTD, C.xl.planFull], cols: ['text', 'money', 'money'],
      rows: [[K.revenue, A.rev, Pl.rev], [K.gp, A.gp, Pl.gp], [`${K.exp} · ${C.plan.grid.groups.marketing}`, A.mkt, Pl.mkt], [`${K.exp} · ${C.plan.grid.groups.sales}`, A.sls, Pl.sls], [`${K.exp} · ${C.plan.grid.groups.other}`, A.oth, Pl.oth], [K.exp, A.spend, Pl.spend], [K.profit, A.profit, Pl.profit]] }; });
  X.register('p_table', x => { const f = R.pnlForecast(x.seed, x), K = PL.tbl.cols, rows = [];
    f.rows.forEach(r => ['actual', 'plan', 'forecast'].forEach(sd => { const a = r[sd]; rows.push([{ v: r.c.name, bold: true }, PL.wf[sd === 'forecast' ? 'fc' : sd], a.rev, a.cogs, a.gp, a.spend, a.mkt, a.sls, a.oth, a.profit, R.ratio(a.profit, a.rev), R.ratio(a.profit, a.spend)]); }));
    return { key: 'p_table', title: PL.tbl.title, header: [K.campaign, C.xl.set, K.rev, K.cogs, K.gp, K.exp, K.mkt, K.sls, K.oth, K.profit, K.margin, K.roi], cols: ['text', 'text', 'money', 'money', 'money', 'money', 'money', 'money', 'money', 'money', 'pct', 'num'], rows }; });
  X.register('p_profit', () => ({ key: 'p_profit', title: PL.bars.title, header: [PL.tbl.cols.campaign, PL.bars.actual, PL.bars.plan], cols: ['text', 'money', 'money'], rows: barRows().map(r => [{ v: r.c.name, bold: true }, r.actual.profit, r.plan.profit]) }));
  X.register('p_eff', x => { const T = PL.eff, K = T.cols, e = R.mktEfficiency(x.seed, x);
    return { key: 'p_eff', title: T.title, header: [K.campaign, K.rev, K.mkt, K.actual, K.plan, K.vsPlan, K.share], cols: ['text', 'money', 'money', 'x', 'x', 'pct', 'pct'],
      rows: barRows().map(r => { const z = e.byId.get(r.id) || {}; return [{ v: r.c.name, bold: true }, z.rev, z.mkt, z.actual, z.plan, z.vs, z.share]; }),
      total: [T.avgRow(x.year), e.rev, e.mkt, e.avg, null, null, R.ratio(e.mkt, e.rev)], notes: [T.tip(x.year).f] }; });

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.pnl}`], [D.meta.scope, P.periodWords()], [D.meta.status, P.statusWords()]]);
  function onClick(e) {
    const t = e.target;
    if (P.onYear(e, renderAll)) return;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.pnl, P.scopeText(), X.tabTables('pnl', ctx()), meta()); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl] || PL.tbl.title, P.scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    const pn = CP.pnl.onClick(e, st); if (pn) { save(); if (pn === 'st') $('p_st').innerHTML = CP.pnl.statementHTML(ctx()); return; }
    if (t.closest('[data-view="eff"]')) { st.effView = st.effView === 'table' ? 'chart' : 'table'; save(); renderEff(); return; }
    const sg = t.closest('.seg[data-wside] button'); if (sg) { st.side = sg.dataset.v; save(); renderWf(); return; }
    const ts = t.closest('.seg[data-tside] button'); if (ts) { st.tSide = ts.dataset.v; save(); renderTbl(); return; }
    if (t.closest('[data-expcols]')) { st.expOpen = !st.expOpen; save(); renderTbl(); const b = el.querySelector('[data-expcols]'); if (b) b.focus(); return; }
    const m = t.closest('[data-mon], [data-monrow]'); if (m && !t.closest('button:not(.click), a')) { const [id, tab] = (m.dataset.mon || m.dataset.monrow).split('|'); location.hash = `#tracking/${id}/${tab}`; }
  }
  return { render };
})();
