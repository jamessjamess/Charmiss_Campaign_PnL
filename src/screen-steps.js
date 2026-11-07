/* screen-steps.js — CR-14 (D126 – D139): the plan of a Campaign in 4 steps, drawn in the Plan tab of the Campaign page (CP.cpage) → CP.steps
   1 Brief (the owner: the campaign · products · the estimated target + the spend envelope % · who does what + the due dates of §3) →
   2 Sales target (Sales: sub-channels · prices · the target filler · SKU × sub-channel × month) ∥ 3 Expense lines (3a Marketing · 3b Sales · 3c Other: prefilled
   from the template) → 4 Summary & submit (the checklist · one P&L · the summaries · the Finance review · the note to the Executive · PDF · Submit).
   The P&L bar (one line under the stepper) replaces the side panel · the checks of a step sit in the bar at the bottom with Save draft · Mark step done ·
   a done step is read only until "Edit this step" (§2.3) · no GP % anywhere in Planning (D137) · the old pages of CR-13 = git history (v0.13.1). */
CP.steps = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON, labelInfo } = U;
  const W = C.s14, P = C.plan, A = C.appr, SP = C.step, CG = C.cpg;
  const PAGES = ['brief', 'target', 'expenses', 'summary'];
  const PAGE_STEPS = { brief: ['brief'], target: ['target'], expenses: ['exp_mkt', 'exp_sls', 'exp_oth'], summary: ['fin', 'submit'] };
  /* the old pages (CR-07 · CR-13) → the new ones (§12.2) */
  const OLD_PAGE = { details: 'brief', products: 'brief', envelope: 'brief', target: 'target', budget: 'expenses', forecast: 'summary', review: 'summary' };
  const GROUPS = ['marketing', 'sales', 'other'], GSTEP = { marketing: 'exp_mkt', sales: 'exp_sls', other: 'exp_oth' };
  const me = () => CP.actor.get();
  const allCamps = () => { const s = U.seed(); return s.allCampaigns || s.campaigns || []; };
  const campOf = id => allCamps().find(c => c.id === id) || null;
  const planOf = id => CP.store.data().plans[id] || null;
  const master = () => new Map((CP.store.data().products || []).map(p => [p.code, p]));
  const people = () => CP.actor.people();
  const subsAll = () => (CP.store.data().subchannels || []).slice().sort((a, b) => R.CHANNELS.indexOf(a.ch) - R.CHANNELS.indexOf(b.ch) || (a.order || 0) - (b.order || 0));
  const subOf = id => subsAll().find(x => x.id === id) || null;
  const at = () => R.nowLocal();
  const pref = U.pref;
  let host = null, cpHost = null;
  let st = { id: null, page: 'brief', F: null, tab: 'all', group: 'sub', unit: (pref.get('s14unit') || 'baht'), hideEmpty: false, folded: new Set(), q: '', sel: new Set(), hi: 0, showAll: false,
    temp: null, paste: null, rmSub: null, priceOpen: null, fillOpen: null, fillMode: 'replace', expOpen: new Set(), monthsOpen: new Set(), gridAll: {}, plPop: false, g: null, gx: {} };

  /* ===================== the working copy of the version (the page edits it) ===================== */
  const cellKey = (code, ch, sub, m) => `${code}|${ch}|${sub || ''}|${m}`;
  function draftOf(id) {
    const plan = planOf(id), ver = plan ? R.working(plan) : null, c = campOf(id), v = ver || {};
    const F = { id, rev: plan ? plan.rev || 0 : 0, ver, skus: R.clonePlan(v.skus || []).map(s => Object.assign({ prices: {} }, s)), cells: new Map(), subs: (v.subs || []).slice(),
      details: R.clonePlan(v.details || { note: '', brand: 'Charmiss', category: '', channels: [] }), brief: R.clonePlan(v.brief || { targetEst: null, envelope: {} }),
      forecast: R.clonePlan(v.forecast || { ach: { MT: 1, TT: 1, ECOM: 1 }, worst: 0.8, best: 1.1, comment: '' }), review: R.clonePlan(v.review || { comment: '' }), builder: v.builder ? R.clonePlan(v.builder) : null,
      lines: [], list: c ? { name: c.name, start: c.start, end: c.end, end_marketing: c.end_marketing || '' } : null, owner: plan ? plan.owner : '', assign: new Map(), dirty: 0, dirtySteps: new Set(), flags: { skus: false, dates: false, env: new Set() } };
    GROUPS.forEach(g => { F.brief.envelope = F.brief.envelope || {}; const e = R.envOf(v)[g]; if (!F.brief.envelope[g]) F.brief.envelope[g] = { pct: e.pct == null ? null : Math.round(e.pct * 1000) / 1000, phasing: e.phasing, none: e.none }; });
    (v.target || []).forEach(r => { const k = cellKey(r.code, r.channel, r.sub, r.month), o = F.cells.get(k) || { amount: 0, qty: 0, basis: r.basis || 'amount' };
      const sk = F.skus.find(s => s.code === r.code), a = R.isNum(r.amount) ? +r.amount : R.rowAmount(r, sk); o.amount += a || 0; o.qty += +r.qty || 0; F.cells.set(k, o); });
    const lm = new Map(); (v.budget || []).forEach(r => { const k = `${r.type}|${r.line}`; let L = lm.get(k); if (!L) { L = { type: r.type, line: r.line, used: r.used !== false, phasing: r.phasing || defPhase(r.type, r.line), months: new Map() }; lm.set(k, L); F.lines.push(L); }
      if (+r.amount) L.months.set(r.month, (L.months.get(r.month) || 0) + +r.amount); });
    return F;
  }
  function serialize(F) {
    const target = [], budget = [], order = new Map(F.skus.map((s, i) => [s.code, i])), sm = new Map(F.skus.map(s => [s.code, s])), chs = new Set();
    F.cells.forEach((o, k) => { const [code, ch, sub, month] = k.split('|'); if (!order.has(code)) return; if (!(+o.amount) && !(+o.qty)) return;
      const row = { code, channel: ch, sub, month, qty: o.qty == null ? null : Math.round(o.qty), amount: o.amount == null ? null : Math.round(o.amount * 100) / 100, basis: o.basis || 'amount' }; target.push(row); chs.add(ch); void sm; });
    target.sort((a, b) => order.get(a.code) - order.get(b.code) || R.CHANNELS.indexOf(a.channel) - R.CHANNELS.indexOf(b.channel) || String(a.sub).localeCompare(String(b.sub)) || a.month.localeCompare(b.month));
    const m0 = F.list ? R.ym(F.list.start) : null;
    F.lines.forEach(L => { let any = false; L.months.forEach((v, month) => { if (v) { any = true; budget.push({ type: L.type, line: L.line, month, amount: v, used: L.used, phasing: L.phasing }); } });
      if (!any && L.keep && m0) budget.push({ type: L.type, line: L.line, month: m0, amount: 0, used: L.used, phasing: L.phasing }); });
    F.subs.forEach(id => { const x = subOf(id); if (x) chs.add(x.ch); });
    const details = Object.assign(R.clonePlan(F.details), { channels: R.CHANNELS.filter(k => chs.has(k)) });
    const hero = F.skus.find(s => s.role === 'hero') || F.skus[0]; if (hero && !F.details.categoryKept) details.category = details.category || hero.category || '';
    return { skus: F.skus.map(s => Object.assign({}, s, { cogs: s.cogs === '' || s.cogs == null ? null : +s.cogs })), target, budget, subs: F.subs.slice(), details, brief: R.clonePlan(F.brief),
      forecast: R.clonePlan(F.forecast), review: R.clonePlan(F.review), builder: F.builder ? R.clonePlan(F.builder) : undefined };
  }
  /* the version as it is typed · the plan with it (the checks · the P&L bar) */
  const liveVer = () => Object.assign({}, st.F.ver || {}, serialize(st.F), { schema14: true });
  const livePlan = plan => { const c = campOf(st.id), lp = Object.assign({}, plan, { versions: (plan.versions || []).slice(0, -1).concat([liveVer()]), steps: R.clonePlan(plan.steps || {}) });
    st.F.assign.forEach((z, k) => { if (lp.steps[k]) { if (z.assignee != null) lp.steps[k].assignee = z.assignee; if (z.due != null) lp.steps[k].due = z.due; } }); void c; return lp; };
  const liveCamp = c => (st.F && st.F.list ? Object.assign({}, c, { name: st.F.list.name, start: st.F.list.start, end: st.F.list.end, end_marketing: st.F.list.end_marketing || null }) : c);
  const isCancelled = c => !!c && R.statusOf(c, U.today()) === R.CANCELLED;
  const canStep = (plan, k) => (isCancelled(campOf(st.id)) ? { ok: false, why: CG.cancelledRO } : R.canDoStep(me(), plan, k));
  const ro = (plan, k) => !canStep(plan, k).ok;
  const isDirty = () => !!(st.F && st.F.dirty);
  const touch = k => { st.F.dirty++; st.F.dirtySteps.add(k); dirtyNote(); renderBar(); };
  const months = c => R.monthsIn(c.start, c.end);
  const bmonths = c => R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end);
  const monthCols = list => { const cur = R.ym(U.today()); return list.map((m, i) => ({ key: m, label: R.monthShort(m), year: i === 0 || m.slice(0, 4) !== list[i - 1].slice(0, 4) ? m.slice(0, 4) : '', cur: m === cur })); };
  const fmtB = v => (v == null || v === '' || Number.isNaN(v) ? '' : R.fmtNum(Math.round(v)));
  const pct1 = v => (v == null || !isFinite(v) ? '' : (Math.round(v * 10) / 10).toFixed(1));
  const num = v => { const x = U.parseNum(v); return x == null || Number.isNaN(x) ? null : x; };
  /* the default phasing of an expense line (the template · else the group's) */
  function defPhase(type, line) { const t = (R.EXP_TEMPLATE[type] || []).find(x => x[0] === line); return t ? t[2] : type === 'marketing' ? 'mkt' : type === 'sales' ? 'sales' : 'even'; }

  /* ===================== prices (§5.3 · D131): a SKU in a sub-channel = its campaign price ?? its standard (the master: sub price ?? channel price) ===================== */
  function stdOf(sk, sub) { const x = subOf(sub), m = master().get(sk.code); if (!x) return null;
    if (m) { const v = m.subPrice && m.subPrice[sub] != null && m.subPrice[sub] !== '' ? +m.subPrice[sub] : m.price && m.price[x.ch] !== '' && m.price[x.ch] != null ? +m.price[x.ch] : null; if (v != null) return v; }
    return sk.price && sk.price[x.ch] !== '' && sk.price[x.ch] != null ? +sk.price[x.ch] : null; }
  function priceAt(sk, ch, sub) { if (!sk) return null; const x = sub && sk.prices ? sk.prices[sub] : null; if (x) { if (x.camp != null && x.camp !== '') return +x.camp; if (x.std != null && x.std !== '') return +x.std; }
    if (sub) { const s0 = stdOf(sk, sub); if (s0 != null) return s0; } return sk.price && sk.price[ch] !== '' && sk.price[ch] != null ? +sk.price[ch] : null; }
  /* every SKU × sub-channel chosen has its price entry (std now) */
  function ensurePrices() { const F = st.F; F.skus.forEach(sk => { sk.prices = sk.prices || {}; F.subs.forEach(id => { if (!sk.prices[id]) sk.prices[id] = { std: stdOf(sk, id), camp: null }; }); }); }
  /* a price changed: the cells typed in ฿ keep ฿ (qty again) · typed in pieces keep pieces (฿ again) — §6.4 basis */
  function repriced(code, sub) { const F = st.F, sk = F.skus.find(s => s.code === code); F.cells.forEach((o, k) => { const [c0, ch, sb] = k.split('|'); if (c0 !== code || (sub != null && sb !== sub)) return; const p = priceAt(sk, ch, sb);
    if (o.basis === 'qty') o.amount = p != null && o.qty != null ? o.qty * p : o.amount; else o.qty = p ? Math.round((o.amount || 0) / p) : o.qty; }); }

  /* ===================== the P&L of the plan (§8.3 — one table) ===================== */
  function plOf(ver) {
    const fc = R.planForecast(ver), T = fc.totals, E = R.envOf(ver), est = !(T.target > 0), envUse = !(T.budget > 0);
    /* before step 2 / 3 have numbers: the estimate of the Brief · the envelope (the bar says so) */
    const tgt = est ? E.marketing.base || 0 : T.target, spend = envUse ? GROUPS.reduce((t, g) => t + (E[g].none ? 0 : E[g].amount || 0), 0) : T.budget;
    const cogs = est ? 0 : T.cogs, gp = tgt - cogs, profit = gp - spend;
    return { fc, T, E, tgt, spend, est, envUse, ap: R.ratio(spend, tgt), profit, margin: R.ratio(profit, tgt), roi: R.ratio(profit, spend) };
  }
  /* the P&L table: As planned (100%) · Finance forecast · Worst · Best — the expenses stay · no GP % (D137) · o.edit = the Finance fields above it */
  function plTable(ver, o = {}) {
    const fc = R.planForecast(ver), T = fc.totals, X = W.pl, cols = [['plan', X.plan], ['base', X.fc(R.pct(fc.baseAch == null ? 1 : fc.baseAch, 1))], ['worst', X.worst(R.pct(fc.f.worst))], ['best', X.best(R.pct(fc.f.best))]];
    const f = (k, fn) => cols.map(([c]) => `<td class="num${c === 'plan' ? ' pl0' : ''}">${esc(fn(fc[c][k], fc[c]))}</td>`).join('');
    const row = (l, k, fn, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${l}</td>${f(k, fn)}</tr>`, B = v => R.baht(v), pc = v => R.pct(v, 1);
    const be = fc.breakEven.rev == null || !(T.budget > 0) ? '' : `<div class="pl-be" data-be>${esc(X.be(R.pct(fc.breakEven.ach, 1), R.baht(fc.breakEven.rev)))}</div>`;
    const inputs = o.edit ? `<div class="pl-in"><span class="muted small">${esc(X.achL)}</span>${R.CHANNELS.filter(k => T.byChannel[k]).map(k => `<label class="tb-pin"><span>${esc(C.channel[k])}</span><input class="inp sm num" data-fach="${k}" inputmode="decimal" value="${esc(Math.round(fc.achOf(k) * 1000) / 10)}"><span class="muted">%</span></label>`).join('')}` +
      `<span class="sep">·</span><label class="tb-pin"><span>${esc(X.worstL)}</span><input class="inp sm num" data-fworst inputmode="decimal" value="${esc(Math.round(fc.f.worst * 100))}"><span class="muted">%</span></label><label class="tb-pin"><span>${esc(X.bestL)}</span><input class="inp sm num" data-fbest inputmode="decimal" value="${esc(Math.round(fc.f.best * 100))}"><span class="muted">%</span></label></div>` : '';
    return inputs + `<div class="tablewrap"><table class="tbl simple pltbl" data-pltbl><thead><tr><th></th>${cols.map(([c, l]) => `<th class="num${c === 'plan' ? ' pl0' : ''}">${esc(l)}</th>`).join('')}</tr></thead><tbody>` +
      row(esc(X.rev), 'rev', B) + row('COGS', 'cogs', B) + row(esc(X.gp), 'gp', B) + row(esc(X.mkt), 'mkt', B) + row(esc(X.sls), 'sls', B) + row(esc(X.oth), 'oth', B) + row(`<b>${esc(X.spend)}</b>`, 'spend', B, 'sub') +
      row(labelInfo(X.ap, C.money.ap), 'ap', pc, 'sub') + row(`<b>${esc(X.profit)}</b>`, 'profit', B, 'major') + row(esc(X.margin), 'margin', pc) + row('ROI', 'roi', v => R.times(v)) + '</tbody></table></div>' + be +
      (o.chart === false || !(T.target > 0) ? '' : `<details class="plcurve"><summary>${esc(X.chart)}</summary>${curveSVG(fc)}</details>`);
  }
  /* §8.3 — the profit by the % of the target sold (folded under the table · the curve of CR-07 step 5): 50 % … 120 % · 0 · break-even · 100 % */
  function curveSVG(fc) {
    const pts = fc.curve, Wd = 640, H = 200, m = { l: 70, r: 14, t: 14, b: 30 }, xs = pts.map(p => p.a), ys = pts.map(p => p.profit).concat([0]), lo = Math.min(...ys), hi = Math.max(...ys);
    const x = a => m.l + (a - xs[0]) / (xs[xs.length - 1] - xs[0]) * (Wd - m.l - m.r), y = v => m.t + (hi - v) / ((hi - lo) || 1) * (H - m.t - m.b);
    const tick = v => `<text x="${m.l - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="axis">${esc(U.trimMoney(R.compact(v)))}</text>`;
    const be = fc.breakEven.ach != null && fc.breakEven.ach >= xs[0] && fc.breakEven.ach <= xs[xs.length - 1] ? `<line x1="${x(fc.breakEven.ach).toFixed(1)}" x2="${x(fc.breakEven.ach).toFixed(1)}" y1="${m.t}" y2="${H - m.b}" class="plc-be"/>` : '';
    return `<div class="chartbox plc"><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(W.pl.chartT)}"><line x1="${m.l}" x2="${Wd - m.r}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="plc-0"/>${be}` +
      `<line x1="${x(1).toFixed(1)}" x2="${x(1).toFixed(1)}" y1="${m.t}" y2="${H - m.b}" class="plc-100"/>${tick(hi)}${tick(0)}${lo < 0 ? tick(lo) : ''}` +
      `<polyline points="${pts.map(p => `${x(p.a).toFixed(1)},${y(p.profit).toFixed(1)}`).join(' ')}" class="plc-l"/>` +
      pts.filter((p, i) => !(i % 2)).map(p => `<text x="${x(p.a).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="mon">${Math.round(p.a * 100)}%</text>`).join('') + `</svg><div class="muted small">${esc(W.pl.chartT)}</div></div>`;
  }

  /* ===================== the stepper (§2.2 — one row ≤ 72 px: ① Brief ─┬─ ② Sales target ─┬─ ④ Summary & submit · ③ Expenses under ②) ===================== */
  const pdCls = s => (s.status === 'done' ? 'done' : s.status === 'returned' ? 'ret' : s.status === 'in_progress' ? 'prog' : s.open ? 'open' : 'todo');
  function stepCell(plan, pg, num) {
    const ks = PAGE_STEPS[pg], S = ks.map(k => R.stepState(plan, k, U.today())), n = S.length, done = S.filter(s => s.status === 'done').length, on = pg === st.page;
    const cls = n > 1 ? (done === n ? 'done' : S.some(s => s.status === 'returned') ? 'ret' : S.some(s => s.status !== 'not_started') ? 'prog' : S.some(s => s.open) ? 'open' : 'wait') : pdCls(S[0]) === 'todo' ? 'wait' : pdCls(S[0]);
    const late = S.some(s => s.overdue), flag = S.some(s => s.refresh || s.env), s0 = S[0];
    const tip = S.map(s => `${s.num} ${SP.names[s.key]} · ${SP.dept[s.dept] || s.dept} · ${s.assignee || '—'}${s.due ? ' · ' + SP.due(R.dmy(s.due)) : ''} · ${SP.state[s.status]}${s.overdue ? ' · ' + SP.overdue(s.daysLate) : ''}${s.refresh ? ' · ' + W.recheck : ''}`).join('\n') + (pg === 'target' || pg === 'expenses' ? '\n' + W.parallel(pg === 'target' ? 3 : 2) : '');
    const sub = n > 1 ? `<span class="s7dots">${S.map(s => `<i class="pd ${pdCls(s)}${s.overdue ? ' late' : ''}" title="${esc(`${s.num} ${SP.names[s.key]}`)}"></i>`).join('')}</span><span>${pg === 'summary' ? esc(W.finSend) : `${done}/${n}`}</span>`
      : `<span>${esc(s0.assignee || '—')}</span>${s0.due && s0.status !== 'done' ? `<span class="${late ? 'neg' : ''}">· ${esc(R.dmy(s0.due).slice(0, 5))}</span>` : ''}`;
    return `<a class="s7 ${cls}${on ? ' on' : ''}${late ? ' late' : ''}" href="#planning/${esc(st.id)}/plan/${pg}" data-cppage="${pg}" title="${esc(tip)}"${on ? ' aria-current="step"' : ''}>` +
      `<span class="s7n" aria-hidden="true">${cls === 'done' ? '✓' : cls === 'ret' ? '↩' : num}</span><span class="s7t"><b>${esc(W.pages[pg])}${flag ? ' <i class="s7f" aria-hidden="true"></i>' : ''}</b><span class="s7w">${sub}</span></span></a>`;
  }
  function stepperHTML(plan) {
    return `<nav class="stepper s14" id="cp_steps" aria-label="${esc(SP.stepsL)}">${stepCell(plan, 'brief', 1)}<span class="s7l" aria-hidden="true"></span>` +
      `<span class="s14par">${stepCell(plan, 'target', 2)}${stepCell(plan, 'expenses', 3)}</span><span class="s7l" aria-hidden="true"></span>${stepCell(plan, 'summary', 4)}</nav>`;
  }

  /* ===================== the bands above the page: returned (B4) · cancelled (B5) · the Brief not done (§2.1) · the due mode (§3.2) ===================== */
  function bandsHTML(c, plan) {
    const out = [], w = R.working(plan), band = (cls, t) => `<div class="nsband ${cls}"><span class="nsb-t">${t}</span></div>`;
    if (isCancelled(c)) out.push(band('cancb', esc(CG.cancelledRO)));
    if (plan.approval === 'returned' && w) { const fix = R.STEP_KEYS.filter(k => plan.steps && plan.steps[k] && plan.steps[k].status === 'returned').map(k => `${R.STEP_NUM[k]} ${SP.names[k]}`);
      out.push(band('warnb retband', esc(SP.retBand(w.decided_by || '—', w.decided_at ? R.dmy(String(w.decided_at).slice(0, 10)) : '—', w.comment || '—', fix.join(' · ') || '—')))); }
    const bs = R.stepState(plan, 'brief', U.today());
    if (st.page !== 'brief' && st.page !== 'summary' && bs.status !== 'done') out.push(band('', esc(W.briefOpen)));
    return out.join('');
  }
  function modeBand(c) {
    const D = R.planDues(c.start, U.today());
    if (D.mode === 'squeeze') return `<div class="nsband warnb" data-dmode="squeeze"><span class="nsb-t">${esc(W.squeezeBand(D.A, D.total))}</span></div>`;
    if (D.mode === 'urgent') return `<div class="nsband errb" data-dmode="urgent"><span class="nsb-t">${esc(D.late ? W.startedBand(D.late) : W.urgentBand(D.A))}</span></div>`;
    return `<div class="muted small" data-dmode="normal">${esc(W.dueLine(R.dmy(D.submit), R.dmy(D.planFrom), R.dmy(D.approveBy)))}</div>`;
  }

  /* ===================== the P&L bar (§9 — one line under the stepper · live while typing) ===================== */
  function plBarHTML() {
    if (!st.F) return ''; const x = plOf(liveVer()), X = W.bar, sh = v => R.shortBaht(v);
    const pop = st.plPop ? `<div class="plpop card" data-plpop>${plTable(liveVer(), { chart: false })}</div>` : '';
    return `<div class="plbar" id="cp_plbar"><span><b>${esc(X.target)}</b> ${esc(sh(x.tgt))}${x.est ? ` <span class="muted small">${esc(X.est)}</span>` : ''}</span><span class="sep">·</span>` +
      `<span><b>${esc(X.spend)}</b> ${esc(sh(x.spend))}${x.envUse ? ` <span class="muted small">${esc(X.env)}</span>` : ''}</span><span class="sep">·</span>` +
      `<span class="${x.ap > 0.2 ? 'warnx' : ''}"><b>A&amp;P</b> ${esc(R.pct(x.ap, 1))}</span><span class="sep">·</span><span><b>${esc(X.profit)}</b> ${esc(sh(x.profit))}</span><span class="sep">·</span>` +
      `<span><b>${esc(X.margin)}</b> ${esc(R.pct(x.margin, 1))}</span><span class="sep">·</span><span><b>ROI</b> ${esc(R.times(x.roi))}</span>` +
      `<button type="button" class="link small plsee" data-plsee aria-expanded="${st.plPop}">${esc(st.plPop ? X.hide : X.see)}</button>${pop}</div>`;
  }
  function renderPl() { const b = $('cp_plbar'); if (b) b.outerHTML = plBarHTML(); }

  /* ===================== the bar at the bottom (§9): the checks of this page ✓ n · ✕ n · ⚠ n [See] · Save draft · Mark step done ===================== */
  function checksOf(plan, c) { const lp = livePlan(plan), lc = liveCamp(c); return PAGE_STEPS[st.page].filter(k => k !== 'submit').map(k => Object.assign({ key: k }, R.stepChecks(lp, k, lc, { today: U.today() }))); }
  function barHTML(plan, c) {
    if (!st.F) return ''; const ck = checksOf(plan, c), okN = ck.reduce((t, x) => t + x.list.filter(y => y.ok).length, 0), errN = ck.reduce((t, x) => t + x.list.filter(y => !y.ok).length, 0), wnN = ck.reduce((t, x) => t + x.warns.length, 0);
    const ed = PAGE_STEPS[st.page].some(k => canStep(plan, k).ok), b = [];
    if (ed && st.page !== 'summary') b.push(`<span class="dirtyn muted small" id="cp_dirty">${st.F.dirty ? esc(P.grid.unsaved(st.F.dirty)) : ''}</span><button type="button" class="btn" data-cpact="save"${st.F.dirty ? '' : ' disabled'}>${esc(P.btn.save)}</button>`);
    if (st.page === 'brief' || st.page === 'target') { const k = PAGE_STEPS[st.page][0], s = R.stepState(plan, k, U.today()), w = canStep(plan, k);
      if (w.ok && s.status !== 'done') b.push(`<button type="button" class="btn primary" data-cpdone="${k}">${esc(SP.markDone)}</button>`);
      if (!w.ok && w.reopen) b.push(`<button type="button" class="btn" data-reopen="${k}">${esc(W.reopen)}</button>`); }
    const list = ck.map(x => `<div class="bck-g"><b>${esc(R.STEP_NUM[x.key] + ' ' + SP.names[x.key])}</b><ul class="checks2">${x.list.map(y => `<li class="${y.ok ? 'ok' : 'err'}"><span class="ci">${y.ok ? '✓' : '✕'}</span>${esc(y.text)}${y.detail ? ` <span class="muted">— ${esc(y.detail)}</span>` : ''}</li>`).join('')}` +
      x.warns.map(y => `<li class="warn"><span class="ci">⚠</span>${esc(y.text)}</li>`).join('') + '</ul></div>').join('');
    return `<div class="bbar" id="cp_bbar"><div class="bb-l"><button type="button" class="link bb-ck" data-bbck aria-expanded="${!!st.ckOpen}">${esc(W.bar.checks)} <span class="okx">✓ ${okN}</span> <span class="${errN ? 'neg' : 'muted'}">✕ ${errN}</span> <span class="${wnN ? 'warnx' : 'muted'}">⚠ ${wnN}</span></button></div>` +
      `<div class="bb-r">${b.join('')}</div>${st.ckOpen ? `<div class="bb-pop card">${list}</div>` : ''}</div>`;
  }
  function renderBar() { const b = $('cp_bbar'); if (b && st.F) { const plan = planOf(st.id), c = campOf(st.id); if (plan && c) b.outerHTML = barHTML(plan, c); } }
  function dirtyNote() { const d = $('cp_dirty'), b = host && host.querySelector('[data-cpact="save"]'); if (d) d.textContent = st.F.dirty ? P.grid.unsaved(st.F.dirty) : ''; if (b) b.disabled = !st.F.dirty; renderPl(); }

  /* ===================== render: the Plan tab of a plan not approved ===================== */
  function firstPage(plan) {
    if (!plan || !plan.steps || plan.approval === 'approved' || plan.approval === 'submitted') return 'summary';
    const a = me(), open = R.STEP_KEYS.map(x => R.stepState(plan, x, U.today())).filter(s => s.status !== 'done' && s.open), mine = open.find(s => a && s.assignee === a.name) || open[0];
    return mine ? R.STEP_PAGE[mine.key] : 'summary';
  }
  const pageOf = p => (PAGES.includes(p) ? p : OLD_PAGE[p] || null);
  function render(main, c, plan, page, root) {
    host = main; cpHost = root || host;
    if (st.id !== c.id) { st.id = c.id; st.F = null; st.q = ''; st.sel = new Set(); st.temp = null; st.paste = null; st.rmSub = null; st.expOpen = new Set(); st.monthsOpen = new Set(); st.gridAll = {}; st.plPop = false; st.ckOpen = false; st.fillOpen = null; st.priceOpen = null; }
    /* another person acting: their own cards open (3 — mine first) */
    const who = (me() || {}).name || ''; if (st.who !== who) { st.who = who; st.expOpen = new Set(); st.monthsOpen = new Set(); st.gridAll = {}; st.prefilled = new Set(); st.ckOpen = false; }
    st.page = pageOf(page) || firstPage(plan);
    if (!st.F || (!st.F.dirty && st.F.rev !== (plan.rev || 0))) st.F = draftOf(c.id);
    const mob = innerWidth < 768;
    main.innerHTML = bandsHTML(c, plan) + stepperHTML(plan) + plBarHTML() + `<div id="cp_body" class="cp-body s14body${mob ? ' mob' : ''}"></div>` + barHTML(plan, c);
    ({ brief: renderBrief, target: renderTarget, expenses: renderExpenses, summary: renderSummary })[st.page](c, plan);
    return st.page;
  }
  const redraw = () => { const c = campOf(st.id), plan = planOf(st.id); if (c && plan && host && host.isConnected) { ({ brief: renderBrief, target: renderTarget, expenses: renderExpenses, summary: renderSummary })[st.page](c, plan); renderBar(); renderPl(); } };

  /* ===================== actions ===================== */
  async function save(id, step, okMsg, o) {
    try { const p = await CP.store.savePlan(id, step, Object.assign({ rev: st.F && st.F.id === id ? st.F.rev : undefined }, o || {})); if (okMsg) U.toast(okMsg); return p; }
    catch (e) { U.toast(e.code === 'conflict' ? A.toast.conflict : A.toast.failed); if (e.code === 'conflict') { st.F = null; CP.app.refresh(); } return null; }
  }
  /* Save draft: the list row (name · dates) · the plan (the rest) · the steps edited go In progress · the flags of §2.3 · the Due again when Start changed (§3.4) */
  async function doSave(quiet) {
    const c = campOf(st.id), F = st.F, a = me(); if (!F || !F.dirty) return true;
    const L = F.list, startChanged = L && c && L.start !== c.start;
    if (L && c && (L.name !== c.name || L.start !== c.start || L.end !== c.end || (L.end_marketing || '') !== (c.end_marketing || ''))) {
      const e = R.validateCampaign({ name: L.name, start: L.start, end: L.end, end_marketing: L.end_marketing }, CP.store.data().list.rows, st.id);
      if (Object.keys(e).length) { U.toast(Object.values(e)[0] || SP.fixFirst); return false; }
      try { await CP.store.saveList({ action: 'edit', id: st.id, values: { campaign: L.name, start: L.start, end: L.end, end_marketing: L.end_marketing, status: 'auto' } }, { today: U.today() }); }
      catch (x) { U.toast(A.toast.failed); return false; }
    }
    const v = serialize(F), steps = [...F.dirtySteps], assign = [...F.assign.entries()], owner = F.owner, flags = { skus: F.flags.skus, dates: F.flags.dates, env: [...F.flags.env] };
    const p = await save(st.id, x => { let y = R.planAct(x, { type: 'save', by: a.name, at: at(), skus: v.skus, target: v.target, budget: v.budget, details: v.details, forecast: v.forecast, review: v.review, builder: v.builder, brief: v.brief, subs: v.subs, steps, flags });
      assign.forEach(([k, z]) => { const s = y.steps[k] || {}; if ((z.assignee != null && z.assignee !== s.assignee) || (z.due != null && z.due !== s.due)) y = R.planAct(y, { type: 'step.assign', step: k, assignee: z.assignee, due: z.due, manual: z.manual !== false, by: a.name, at: at() }); });
      if (startChanged) y = R.planAct(y, { type: 'dues', start: L.start, today: U.today(), by: a.name, at: at() });
      if (owner && owner !== y.owner) { const was = y.owner; y.owner = owner; R.STEP_KEYS.forEach(k => { if (y.steps[k] && y.steps[k].assignee === was && R.STEP_DEPT[k] === 'brand') y.steps[k].assignee = owner; }); }
      return y; }, quiet ? '' : A.toast.saved);
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); return true; }
    return false;
  }
  /* Mark step done (the checks ✕ first) → the next step of the same person, open · none → 4 Summary (B22) */
  async function markDone(k, none) {
    if (st.F.dirty && !(await doSave(true))) return;
    const plan = planOf(st.id), c = campOf(st.id), ck = R.stepChecks(plan, k, c, { today: U.today() });
    if (!none && !ck.ok) { U.toast(SP.checksFirst(ck.list.filter(x => !x.ok).map(x => x.text).join(' · '))); return; }
    const p = await save(st.id, x => R.planAct(x, { type: 'step.done', step: k, none: !!none, by: me().name, at: at() }), SP.doneToast(SP.names[k]), { rev: plan.rev || 0 });
    if (p) { st.F = draftOf(st.id); const nx = nextMine(planOf(st.id)) || 'summary'; if (nx !== st.page) location.hash = `#planning/${st.id}/plan/${nx}`; else CP.app.refresh(); }
  }
  function nextMine(plan) { const a = me(); if (!plan || !a) return null; const s = R.STEP_KEYS.map(x => R.stepState(plan, x, U.today())).find(x => x.status !== 'done' && x.open && x.assignee === a.name && x.key !== 'submit'); return s ? R.STEP_PAGE[s.key] : null; }
  async function reopen(k) {
    if (st.F.dirty && !(await doSave(true))) return; const plan = planOf(st.id);
    const p = await save(st.id, x => R.planAct(x, { type: 'step.reopen', step: k, by: me().name, at: at() }), W.reopened(SP.names[k]), { rev: plan.rev || 0 });
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); }
  }
  async function recalcDues() {
    if (st.F.dirty && !(await doSave(true))) return; const plan = planOf(st.id), c = campOf(st.id);
    const p = await save(st.id, x => R.planAct(x, { type: 'dues', start: c.start, today: U.today(), all: true, by: me().name, at: at() }), W.recalced, { rev: plan.rev || 0 });
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); }
  }
  async function submit() {
    if (st.F.dirty && !(await doSave(true))) return;
    const plan = planOf(st.id), c = campOf(st.id), cl = checklist(plan, c); if (cl.errN) { U.toast(W.sum.left(cl.errN)); return; }
    const p = await save(st.id, x => R.planAct(x, { type: 'submit', by: me().name, at: at() }), A.toast.submitted(c.name), { rev: plan.rev || 0 });
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); }
  }


  /* ===================== 1 · Brief (§4 — the owner · one page, 4 cards) ===================== */
  const fold = t => String(t == null ? '' : t).toLocaleLowerCase('th').replace(/\s+/g, '');
  const roleGuess = (m, k) => (k === 0 ? 'hero' : /puff|brush|box|mini/i.test(`${m.nickname || ''} ${m.name || ''}`) ? 'gwp' : 'core');
  function renderBrief(c, plan) {
    const F = st.F, ed = !ro(plan, 'brief'), dis = ed ? '' : ' disabled', B = W.brief, L = F.list || {}, lc = liveCamp(c);
    const brands = people().filter(p => p.active !== false && p.dept === 'brand');
    /* A — the campaign */
    const a = `<div class="card bfa"><div class="card-head"><h3>${esc(B.a.title)}</h3></div><div class="kform"><div class="frow"><div class="field"><label for="bf_name">${esc(B.a.name)} <span class="req">*</span></label><input id="bf_name" class="inp" maxlength="120" value="${esc(L.name || '')}"${dis}></div>` +
      `<div class="field"><label>${esc(B.a.brand)}</label><input class="inp" value="${esc(F.details.brand || 'Charmiss')}" disabled></div></div>` +
      `<div class="field"><label for="bf_note">${esc(B.a.note)}</label><textarea id="bf_note" class="inp" rows="2" maxlength="400" placeholder="${esc(B.a.notePh)}"${dis}>${esc(F.details.note || '')}</textarea></div>` +
      `<div class="frow f3">${[['start', B.a.start, true], ['end_marketing', B.a.endMkt, false], ['end', B.a.end, true]].map(([k, l, req]) => `<div class="field"><label for="bf_t_${k}">${esc(l)}${req ? ' <span class="req">*</span>' : ''}</label>${U.dateHTML(`data-bfd="${k}"${dis}`, L[k] || '', { textId: 'bf_t_' + k })}</div>`).join('')}</div>` +
      `<div class="bf-due">${modeBand(lc)}${lc.start < U.today() ? `<div class="nsband warnb"><span class="nsb-t">${esc(W.ck.started(R.dayDiff(U.today(), lc.start)))}</span></div>` : ''}<a class="link small" href="#bf_d" data-bfgo>${esc(B.seeDues)}</a></div>` +
      `<div class="field"><label for="bf_owner">${esc(B.a.owner)}</label><select id="bf_owner" class="inp"${dis}>${brands.map(p => `<option${p.name === F.owner ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}${brands.some(p => p.name === F.owner) ? '' : `<option selected>${esc(F.owner || '—')}</option>`}</select></div></div></div>`;
    $('cp_body').innerHTML = a + `<div class="card bfb" id="bf_b"></div><div class="card bfc" id="bf_c"></div><div class="card bfd" id="bf_d"></div>`;
    drawProducts(c, plan, ed); drawEnvelope(c, plan, ed); drawAssign(c, plan, ed);
  }
  /* B — the products: one search (code · name · nickname · barcode) · tick several · a whole group · paste codes · a temporary SKU (§4.2 · §5.4) */
  function searchHits() {
    const q = fold(st.q); if (!q) return [];
    return (CP.store.data().products || []).filter(p => p.status !== 'merged' && [p.code, p.name, p.nickname, p.barcode].some(x => fold(x).includes(q)));
  }
  function drawProducts(c, plan, ed) {
    const F = st.F, X = W.brief.b, box = $('bf_b'); if (!box) return; const dis = ed ? '' : ' disabled', inPlan = new Set(F.skus.map(s => s.code)), M = master();
    const groups = [...(CP.store.data().products || []).reduce((m, p) => { if (p.status !== 'discontinued' && p.status !== 'merged') m.set(p.group, (m.get(p.group) || 0) + 1); return m; }, new Map())].sort((x, y) => String(x[0]).localeCompare(String(y[0])));
    const hits = searchHits(), shown = st.showAll ? hits : hits.slice(0, 8);
    const hitRow = (p, i) => { const inn = inPlan.has(p.code), off = p.status === 'discontinued', tmp = p.status === 'temp';
      return `<li class="bhit${inn || off ? ' dim' : ''}${i === st.hi ? ' hi' : ''}" data-bhit="${esc(p.code)}"><label class="chk"><input type="checkbox" data-bsel="${esc(p.code)}"${st.sel.has(p.code) ? ' checked' : ''}${inn || off || !ed ? ' disabled' : ''}><span></span></label>` +
        `<b class="bh-c">${esc(p.code)}</b><span class="bh-n">${esc(p.name)}</span><span class="muted small">${esc(p.group || '')}</span>${tmp ? `<span class="chip warn">${esc(X.tempTag)}</span>` : `<span class="muted small">${esc((C.prod.state || {})[p.status] || p.status)}</span>`}` +
        `<span class="num small">${esc(p.price && p.price.MT !== '' && p.price.MT != null ? R.baht(+p.price.MT) : '—')}</span>${inn ? `<span class="muted small">${esc(X.inPlan)}</span>` : ''}</li>`; };
    const res = st.q ? `<ul class="bhits" role="listbox">${shown.map(hitRow).join('')}${hits.length > shown.length ? `<li><button type="button" class="link small" data-ball>${esc(X.seeAll(hits.length))}</button></li>` : ''}` +
      `<li class="bh-nf"><span class="muted small">${esc(X.notFound)}</span> <button type="button" class="link small" data-btemp${dis}>${esc(X.createTemp(st.q))}</button></li></ul>` +
      (st.sel.size ? `<button type="button" class="btn small primary" data-badd>${esc(X.addSel(st.sel.size))}</button>` : '') : '';
    const T = st.temp ? tempForm() : '';
    const drift = s => { const m = M.get(s.code); return m && s.cogs != null && Math.abs(+m.cogs - +s.cogs) > 0.005 ? ` <span class="chip warn" title="${esc(P.grid.drift(R.fmtNum(+m.cogs, 2)))}">⚠</span>${ed ? ` <button type="button" class="link small" data-bdrift="${esc(s.code)}">${esc(P.grid.driftUse)}</button>` : ''}` : ''; };
    const stdTxt = s => R.CHANNELS.filter(k => s.price && s.price[k] !== '' && s.price[k] != null).map(k => `${k} ${R.baht(+s.price[k])}`).join(' · ') || '—';
    const subTip = s => subsAll().filter(x => x.active !== false).map(x => `${x.name} ${(v => (v == null ? '—' : R.baht(v)))(stdOf(s, x.id))}`).join('\n');
    const rows = F.skus.map((s, i) => `<tr data-bsi="${i}"><td><b>${esc(s.code)}</b>${s.temp || /^TMP-/i.test(s.code) ? ` <span class="chip warn">${esc(X.tempTag)}</span>` : ''}</td><td>${esc(s.nickname || s.name)}<div class="muted small">${esc(s.name)}</div></td>` +
      `<td><select class="inp sm" data-brole${dis}>${['hero', 'core', 'gwp'].map(r => `<option value="${r}"${(s.role || 'core') === r ? ' selected' : ''}>${esc(C.step.p.roles[r])}</option>`).join('')}</select></td>` +
      `<td class="num">${esc(s.cogs == null ? '—' : R.fmtNum(+s.cogs, 2))}${drift(s)}</td><td class="small" title="${esc(subTip(s))}">${esc(stdTxt(s))}</td><td>${ed ? `<button type="button" class="icon-btn" data-bdel="${i}" aria-label="${esc(X.remove)}" title="${esc(X.remove)}">${ICON.close}</button>` : ''}</td></tr>`).join('');
    const rm = st.rmSku ? (() => { const s = F.skus.find(x => x.code === st.rmSku), t = [...F.cells].filter(([k]) => k.startsWith(st.rmSku + '|')).reduce((x, [, o]) => x + (o.amount || 0), 0);
      return `<div class="nsband warnb"><span class="nsb-t">${esc(X.rmHas(s ? s.nickname || s.code : st.rmSku, R.baht(t)))}</span> <button type="button" class="btn small danger" data-brmyes>${esc(X.rmYes)}</button> <button type="button" class="btn small" data-brmno>${esc(C.common.cancel)}</button></div>`; })() : '';
    box.innerHTML = `<div class="card-head"><h3>${esc(X.title)} <span class="hnote">${esc(X.n(F.skus.length))}</span></h3><div class="ctl">${ed ? `<button type="button" class="btn small" data-bpaste>${esc(X.paste)}</button>` +
      `<select class="inp sm" data-bgroup aria-label="${esc(X.addGroup)}"><option value="">${esc(X.addGroup)} ▾</option>${groups.map(([g, n]) => `<option value="${esc(g)}">${esc(X.groupN(g, n))}</option>`).join('')}</select>` : ''}</div></div>` +
      (ed ? `<div class="bsearch"><span class="bs-i">${ICON.search}</span><input id="bf_q" class="inp" autocomplete="off" placeholder="${esc(X.search)}" value="${esc(st.q)}" aria-label="${esc(X.search)}"></div>${res}${T}` : '') + rm +
      (F.skus.length ? `<div class="tablewrap"><table class="tbl simple bskus"><thead><tr><th>${esc(X.cols.code)}</th><th>${esc(X.cols.name)}</th><th>${esc(X.cols.role)}</th><th class="num">${esc(X.cols.cogs)}</th><th>${labelInfo(X.cols.std, W.netTip)}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="c3-empty">${esc(X.none)}</div>`);
    if (st.q && document.activeElement && document.activeElement.id !== 'bf_q') { /* keep */ }
  }
  function tempForm() {
    const X = W.brief.temp, t = st.temp, prods = CP.store.data().products || [], groups = [...new Set(prods.map(p => p.group).filter(Boolean))].sort(), cats = [...new Set(prods.map(p => p.category).filter(Boolean))].sort();
    const f = (k, l, req, attrs) => `<div class="field"><label for="bt_${k}">${esc(l)}${req ? ' <span class="req">*</span>' : ''}</label><input id="bt_${k}" class="inp${attrs && attrs.num ? ' num' : ''}" data-bt="${k}" value="${esc(t[k] == null ? '' : t[k])}"${attrs && attrs.list ? ` list="${attrs.list}"` : ''}${attrs && attrs.num ? ' inputmode="decimal"' : ''}></div>`;
    return `<div class="btemp card"><div class="card-head"><h3>${esc(X.title)}</h3><div class="ctl"><span class="muted small">${esc(X.note)}</span></div></div><div class="kform">` +
      `<div class="frow">${f('name', X.name, true)}${f('nickname', X.nickname, false)}</div><div class="frow">${f('group', X.group, true, { list: 'bt_groups' })}${f('category', X.category, true, { list: 'bt_cats' })}${f('cogs', X.cogs, true, { num: 1 })}</div>` +
      `<div class="frow f3">${f('MT', X.price('MT'), true, { num: 1 })}${f('TT', X.price('TT'), false, { num: 1 })}${f('ECOM', X.price('ECOM'), false, { num: 1 })}</div>` +
      `<datalist id="bt_groups">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist><datalist id="bt_cats">${cats.map(g => `<option value="${esc(g)}">`).join('')}</datalist>` +
      `<div class="ferr" id="bt_e"></div><div class="ov-btns"><button type="button" class="btn" data-btcancel>${esc(C.common.cancel)}</button><button type="button" class="btn primary" data-btsave>${esc(X.create)}</button></div></div></div>`;
  }
  function addSkus(codes) {
    const F = st.F, M = master(), have = new Set(F.skus.map(s => s.code)); let n = 0;
    codes.forEach(code => { const m = M.get(code); if (!m || have.has(code) || m.status === 'discontinued' || m.status === 'merged') return;
      F.skus.push({ code: m.code, name: m.name, nickname: m.nickname || '', group: m.group || '', category: m.category || '', cogs: +m.cogs, role: roleGuess(m, F.skus.length),
        price: Object.fromEntries(R.CHANNELS.map(k => [k, m.price && m.price[k] !== '' && m.price[k] != null ? +m.price[k] : ''])), prices: {}, temp: m.status === 'temp' || undefined }); have.add(code); n++; });
    if (n) { ensurePrices(); F.flags.skus = true; touch('brief'); }
    return n;
  }
  async function createTemp() {
    const t = st.temp, X = W.brief.temp, e = $('bt_e'), n = v => { const x = num(v); return x == null ? null : x; };
    const need = [['name', t.name], ['group', t.group], ['category', t.category]].filter(([, v]) => !String(v || '').trim()).map(([k]) => X[k]);
    if (need.length || !(n(t.cogs) > 0) || !(n(t.MT) > 0)) { if (e) e.textContent = X.need; return; }
    const code = CP.store.nextTemp(), mt = n(t.MT), p = { code, barcode: '', name: String(t.name).trim(), nickname: String(t.nickname || '').trim(), group: String(t.group).trim(), category: String(t.category).trim(), status: 'temp', launch: '',
      cogs: n(t.cogs), price: { MT: mt, TT: n(t.TT) || mt, ECOM: n(t.ECOM) || mt }, subPrice: {}, note: X.noteAuto, created_at: at(), updated_at: at(), updated_by: me().name, history: [] };
    try { await CP.store.saveProduct(code, () => p, { create: true }); } catch (x) { if (e) e.textContent = A.toast.failed; return; }
    st.temp = null; st.q = ''; addSkus([code]); U.toast(X.made(code)); drawProducts(campOf(st.id), planOf(st.id), true);
  }
  function openPaste() {
    const X = W.brief.b;
    U.openDialog(`<div class="dlg-h">${esc(X.pasteTitle)}</div><div class="dlg-b"><p class="muted small">${esc(X.pasteHelp)}</p><textarea id="bp_txt" class="inp" rows="6" placeholder="${esc(X.pastePh)}"></textarea><div class="help" id="bp_res"></div></div>` +
      `<div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(C.common.cancel)}</button><button type="button" class="btn primary" data-r="1">${esc(X.pasteAdd)}</button></div>`);
    const d = $('dlg'), txt = $('bp_txt'), M = master(), parse = () => { const codes = [...new Set(String(txt.value).split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))], byL = new Map([...M.keys()].map(k => [k.toLowerCase(), k]));
      const found = codes.map(x => byL.get(x.toLowerCase())).filter(Boolean), miss = codes.filter(x => !byL.has(x.toLowerCase())); $('bp_res').textContent = codes.length ? X.found(found.length, miss.join(' · ')) : ''; return found; };
    txt.addEventListener('input', parse); txt.focus();
    d.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { if (b.dataset.r === '1') { const n = addSkus(parse()); U.toast(X.added(n)); } U.closeDialog(); drawProducts(campOf(st.id), planOf(st.id), true); }));
  }
  /* C — the estimated target and the spend envelope (§4.3 · D129): % of the target ↔ ฿ · phasing · reference · No expense · no typing past 100% or past the target */
  function envRef(cat, id) {
    const P0 = CP.store.data().plans || {}, rows = [];
    allCamps().forEach(x => { if (x.id === id || x.approval !== 'approved') return; const v = R.approvedVersion(P0[x.id]); if (!v) return; const T = R.planTotals(v); if (!(T.target > 0)) return; rows.push({ cat: (v.details && v.details.category) || '', marketing: T.mkt / T.target, sales: T.sls / T.target, other: T.oth / T.target }); });
    const same = rows.filter(r => cat && r.cat === cat), use = same.length ? same : rows, avg = k => (use.length ? use.reduce((a, r) => a + r[k], 0) / use.length : null);
    return { n: use.length, same: !!same.length, marketing: avg('marketing'), sales: avg('sales'), other: avg('other') };
  }
  function drawEnvelope(c, plan, ed) {
    const F = st.F, X = W.brief.c, box = $('bf_c'); if (!box) return; const dis = ed ? '' : ' disabled', v = liveVer(), E = R.envOf(v), T = R.planTotals(v), base = E.marketing.base, est = num(F.brief.targetEst);
    const hero = F.skus.find(s => s.role === 'hero') || F.skus[0], ref = envRef(F.details.category || (hero && hero.category) || '', c.id), G = P.grid.groups;
    const row = g => { const e = F.brief.envelope[g] || {}, none = !!e.none, pv = e.pct == null ? '' : pct1(+e.pct), amt = none ? 0 : E[g].amount, err = st.envErr && st.envErr[g];
      return `<tr data-benv="${g}"><td><b>${esc(G[g])}</b></td><td class="num"><input class="inp sm num benvp" data-bpct="${g}" inputmode="decimal" value="${esc(none ? '0.0' : pv)}"${dis || (none ? ' disabled' : '')}> %</td>` +
        `<td class="num"><input class="inp sm num" data-bamt="${g}" inputmode="decimal" value="${esc(none ? '0' : base > 0 && e.pct != null ? fmtB(amt) : '')}"${dis || (none || !(base > 0) ? ' disabled' : '')}${!(base > 0) ? ` title="${esc(X.noEst)}"` : ''}></td>` +
        `<td><select class="inp sm" data-bph="${g}"${dis}>${['mkt', 'sales', 'even'].map(p => `<option value="${p}"${E[g].phasing === p ? ' selected' : ''}>${esc(SP.env.ph[p])}</option>`).join('')}</select></td>` +
        `<td class="num muted small">${ref[g] == null ? '—' : esc(`${R.pct(ref[g], 1)}${base > 0 ? ' · ' + R.shortBaht(ref[g] * base) : ''}`)}</td><td><label class="chk"><input type="checkbox" data-bnone="${g}"${none ? ' checked' : ''}${dis}><span>${esc(X.none)}</span></label></td>` +
        `${err ? `<td class="ferr small" data-benverr="${g}">✕ ${esc(err)}</td>` : '<td></td>'}</tr>`; };
    const tot = R.envTotal(v), src = E.marketing.src === 'target' ? X.fromTarget : E.marketing.src === 'est' ? X.fromEst : '';
    const vs = est > 0 && T.target > 0 ? `<div class="muted small" data-bvs>${esc(X.estVsSet(R.baht(est), R.baht(T.target), R.pct((T.target - est) / est, 1)))}</div>` : '';
    box.innerHTML = `<div class="card-head"><h3>${esc(X.title)}</h3></div><div class="kform"><div class="field bf-est"><label for="bf_est">${esc(X.est)}</label><input id="bf_est" class="inp num" inputmode="decimal" value="${esc(est > 0 ? fmtB(est) : '')}"${dis}><div class="help">${esc(X.estHelp)}</div>${vs}</div></div>` +
      `<h4 class="bf-h4">${labelInfo(X.envTitle, C.s14.envTip)}${src ? ` <span class="muted small">· ${esc(src)}</span>` : ''}</h4>` + (base > 0 ? '' : `<div class="muted small">${esc(X.noEst)}</div>`) +
      `<div class="tablewrap"><table class="tbl simple envtbl benvtbl"><thead><tr><th>${esc(SP.env.cols.group)}</th><th class="num">${esc(X.pctOf)}</th><th class="num">฿</th><th>${esc(SP.env.cols.phasing)}</th><th class="num">${esc(SP.env.cols.ref)}</th><th></th><th></th></tr></thead>` +
      `<tbody>${GROUPS.map(row).join('')}<tr class="total"><td>${labelInfo(X.total, C.money.ap)}</td><td class="num" data-benvpct>${esc(R.pct(tot.pct, 1))}</td><td class="num" data-benvtot>${esc(base > 0 ? R.baht(tot.amount) : '—')}</td><td colspan="4">${tot.pct > 0.2 ? `<span class="chip warn">${esc(P.checks.apHigh(R.pct(tot.pct, 1)))}</span>` : ''}</td></tr></tbody></table></div>`;
  }
  /* a % or ฿ typed: 0 – 100 with one decimal · ฿ ≤ the target · else ✕ in the row and the value is not taken */
  function readEnv(t) {
    const F = st.F, X = W.brief.c, v = liveVer(), base = R.envOf(v).marketing.base; st.envErr = st.envErr || {};
    const g = t.dataset.bpct || t.dataset.bamt || t.dataset.bph || t.dataset.bnone; if (!g) return false; const e = F.brief.envelope[g] = F.brief.envelope[g] || { pct: null, phasing: 'even', none: false };
    if (t.dataset.bph) { e.phasing = t.value; F.flags.env.add(g); return true; }
    if (t.dataset.bnone) { e.none = t.checked; if (e.none) e.pct = 0; F.flags.env.add(g); delete st.envErr[g]; return true; }
    const x = num(t.value);
    if (t.dataset.bpct) { if (x == null) { e.pct = null; delete st.envErr[g]; } else if (x < 0 || x > 100) { st.envErr[g] = X.over100; return false; } else { e.pct = Math.round(x * 10) / 10; delete st.envErr[g]; } F.flags.env.add(g); return true; }
    if (t.dataset.bamt) { if (!(base > 0)) return false; if (x == null) { e.pct = null; delete st.envErr[g]; } else if (x < 0 || x > base) { st.envErr[g] = X.overT(R.baht(base)); return false; } else { e.pct = x / base * 100; delete st.envErr[g]; } F.flags.env.add(g); return true; }
    return false;
  }
  /* D — who does what · the due dates (§4.4 · §3.4): by department · typed = manual (kept) · Recalculate due dates · ⚠ later than it should be */
  function drawAssign(c, plan, ed) {
    const F = st.F, X = W.brief.d, box = $('bf_d'); if (!box) return; const dis = ed ? '' : ' disabled', lc = liveCamp(c), D = R.planDues(lc.start, U.today());
    const ks = ['target', 'exp_mkt', 'exp_sls', 'exp_oth', 'fin', 'submit'];
    const rows = ks.map(k => { const s = R.stepState(plan, k, U.today()), z = F.assign.get(k) || {}, who = z.assignee != null ? z.assignee : s.assignee, due = z.due != null ? z.due : s.due, man = z.due != null ? z.manual !== false : s.dueManual;
      const dept = R.STEP_DEPT[k], opts = people().filter(p => p.active !== false && p.dept === dept), should = D[R.STEP_PHASE[k]], late = man && due && should && due > should;
      const sel = `<select class="inp sm" data-bwho="${k}"${dis}>${(opts.length ? opts : people().filter(p => p.name === F.owner)).map(p => `<option${p.name === who ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}${(opts.some(p => p.name === who) || (!opts.length && who === F.owner)) ? '' : `<option selected>${esc(who || '—')}</option>`}</select>`;
      return `<tr data-bstep="${k}"><td><b>${esc(`${R.STEP_NUM[k]} ${SP.names[k]}`)}</b></td><td>${esc(SP.dept[dept] || dept)}</td><td>${sel}${opts.length ? '' : `<div class="warnx small">⚠ ${esc(X.noDept(SP.dept[dept] || dept))}</div>`}</td>` +
        `<td>${U.dateHTML(`data-bdue="${k}"${dis || (s.status === 'done' ? ' disabled' : '')}`, due || '', { label: SP.names[k] })}${late ? `<div class="warnx small" data-blate="${k}">⚠ ${esc(W.lateDue(R.dmy(should)))}</div>` : ''}${man && s.status !== 'done' ? ` <span class="muted small">${esc(X.manual)}</span>` : ''}</td><td>${esc(SP.state[s.status])}</td></tr>`; });
    box.innerHTML = `<div class="card-head"><h3>${esc(X.title)}</h3><div class="ctl">${ed ? `<button type="button" class="btn small" data-brecalc>${esc(W.recalc)}</button>` : ''}</div></div>${modeBand(lc)}` +
      `<div class="tablewrap"><table class="tbl simple bassign"><thead><tr><th>${esc(X.cols.step)}</th><th>${esc(X.cols.dept)}</th><th>${esc(X.cols.who)}</th><th>${esc(X.cols.due)}</th><th>${esc(X.cols.status)}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function onBrief(e) {
    const t = e.target, F = st.F, c = campOf(st.id), plan = planOf(st.id), ed = !ro(plan, 'brief');
    if (t.id === 'bf_name') { F.list.name = t.value; touch('brief'); return; }
    if (t.id === 'bf_note') { F.details.note = t.value; touch('brief'); return; }
    if (t.id === 'bf_owner') { F.owner = t.value; touch('brief'); return; }
    if (t.matches('[data-bfd]')) { if (t.value === 'invalid') return; F.list[t.dataset.bfd] = t.value || (t.dataset.bfd === 'end_marketing' ? '' : F.list[t.dataset.bfd]); F.flags.dates = true; touch('brief'); if (e.type === 'change') { renderBrief(c, plan); } return; }
    if (t.id === 'bf_q') { st.q = t.value; st.hi = 0; st.showAll = false; drawProducts(c, plan, ed); const q = $('bf_q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } return; }
    if (t.matches('[data-bsel]')) { if (t.checked) st.sel.add(t.dataset.bsel); else st.sel.delete(t.dataset.bsel); drawProducts(c, plan, ed); return; }
    if (t.matches('[data-bgroup]') && e.type === 'change') { const g = t.value; if (g) { const n = addSkus((CP.store.data().products || []).filter(p => p.group === g && p.status !== 'discontinued' && p.status !== 'merged').map(p => p.code)); U.toast(W.brief.b.added(n)); } drawProducts(c, plan, ed); drawEnvelope(c, plan, ed); return; }
    if (t.matches('[data-bt]')) { st.temp[t.dataset.bt] = t.value; return; }
    if (t.matches('[data-brole]')) { const s = F.skus[+t.closest('tr').dataset.bsi]; if (s) { s.role = t.value; touch('brief'); } return; }
    if (t.closest('#bf_c')) { if (t.id === 'bf_est') { const x = num(t.value); F.brief.targetEst = x == null ? null : Math.round(x); GROUPS.forEach(g => F.flags.env.add(g)); touch('brief'); if (e.type === 'change') drawEnvelope(c, plan, ed); else liveEnv(); return; }
      const okv = readEnv(t); touch('brief'); if (e.type === 'change' || !okv || t.dataset.bnone || t.dataset.bph) { const keep = t.dataset.bpct ? `[data-bpct="${t.dataset.bpct}"]` : t.dataset.bamt ? `[data-bamt="${t.dataset.bamt}"]` : null; drawEnvelope(c, plan, ed); if (keep && e.type !== 'change') { const x = $('bf_c').querySelector(keep); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } } } else liveEnv(t); return; }
    if (t.matches('[data-bwho]')) { const k = t.dataset.bwho, z = F.assign.get(k) || {}; z.assignee = t.value; F.assign.set(k, z); touch('brief'); return; }
    if (t.matches('[data-bdue]')) { if (t.value === 'invalid' || !t.value) return; const k = t.dataset.bdue, z = F.assign.get(k) || {}; z.due = t.value; z.manual = true; F.assign.set(k, z); touch('brief'); if (e.type === 'change') drawAssign(c, plan, ed); return; }
  }
  /* the envelope live (the other field · the total) without drawing the card again (the focus stays) */
  function liveEnv(t) {
    const v = liveVer(), E = R.envOf(v), base = E.marketing.base, box = $('bf_c'); if (!box) return;
    GROUPS.forEach(g => { if (t && t.dataset.bamt === g) { const x = box.querySelector(`[data-bpct="${g}"]`); if (x) x.value = pct1(st.F.brief.envelope[g].pct); }
      if (t && t.dataset.bpct === g) { const x = box.querySelector(`[data-bamt="${g}"]`); if (x && base > 0) x.value = fmtB(E[g].amount); }
      if (!t) { const x = box.querySelector(`[data-bamt="${g}"]`); if (x && base > 0 && st.F.brief.envelope[g].pct != null) x.value = fmtB(E[g].amount); } });
    const tot = R.envTotal(v), tp = box.querySelector('[data-benvpct]'), ta = box.querySelector('[data-benvtot]'); if (tp) tp.textContent = R.pct(tot.pct, 1); if (ta) ta.textContent = base > 0 ? R.baht(tot.amount) : '—';
  }
  async function onBriefClick(t) {
    const F = st.F, c = campOf(st.id), plan = planOf(st.id), ed = !ro(plan, 'brief');
    if (t.closest('[data-bfgo]')) { const d = $('bf_d'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
    if (t.closest('[data-badd]')) { const n = addSkus([...st.sel]); st.sel = new Set(); st.q = ''; U.toast(W.brief.b.added(n)); drawProducts(c, plan, ed); drawEnvelope(c, plan, ed); return true; }
    if (t.closest('[data-ball]')) { st.showAll = true; drawProducts(c, plan, ed); return true; }
    if (t.closest('[data-btemp]')) { st.temp = { name: st.q, nickname: '', group: '', category: '', cogs: '', MT: '', TT: '', ECOM: '' }; drawProducts(c, plan, ed); const x = $('bt_group'); if (x) x.focus(); return true; }
    if (t.closest('[data-btcancel]')) { st.temp = null; drawProducts(c, plan, ed); return true; }
    if (t.closest('[data-btsave]')) { await createTemp(); return true; }
    if (t.closest('[data-bpaste]')) { openPaste(); return true; }
    const hit = t.closest('[data-bhit]'); if (hit && !t.closest('label') && !t.closest('button')) { const cb = hit.querySelector('[data-bsel]'); if (cb && !cb.disabled) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true })); } return true; }
    const dl = t.closest('[data-bdel]'); if (dl) { const s = F.skus[+dl.dataset.bdel], has = [...F.cells].some(([k, o]) => k.startsWith(s.code + '|') && (o.amount || o.qty));
      if (has) { st.rmSku = s.code; drawProducts(c, plan, ed); return true; } F.skus.splice(+dl.dataset.bdel, 1); F.flags.skus = true; touch('brief'); drawProducts(c, plan, ed); return true; }
    if (t.closest('[data-brmyes]')) { const i = F.skus.findIndex(s => s.code === st.rmSku); if (i >= 0) { [...F.cells.keys()].forEach(k => { if (k.startsWith(st.rmSku + '|')) F.cells.delete(k); }); F.skus.splice(i, 1); F.flags.skus = true; touch('brief'); } st.rmSku = null; drawProducts(c, plan, ed); return true; }
    if (t.closest('[data-brmno]')) { st.rmSku = null; drawProducts(c, plan, ed); return true; }
    const dr = t.closest('[data-bdrift]'); if (dr) { const s = F.skus.find(x => x.code === dr.dataset.bdrift), m = master().get(dr.dataset.bdrift); if (s && m) { s.cogs = +m.cogs; touch('brief'); drawProducts(c, plan, ed); U.toast(P.grid.driftDone(s.code, R.fmtNum(+m.cogs, 2))); } return true; }
    if (t.closest('[data-brecalc]')) { st.F.assign.forEach(z => { delete z.due; delete z.manual; }); await recalcDues(); return true; }
    return false;
  }
  function onBriefKey(e) {
    if (e.target.id !== 'bf_q') return; const hits = searchHits(), shown = st.showAll ? hits : hits.slice(0, 8);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); st.hi = Math.max(0, Math.min(shown.length - 1, st.hi + (e.key === 'ArrowDown' ? 1 : -1))); drawProducts(campOf(st.id), planOf(st.id), true); const q = $('bf_q'); if (q) q.focus(); }
    else if (e.key === 'Enter') { e.preventDefault(); const p = shown[st.hi]; if (p) { const n = addSkus([p.code]); if (n) U.toast(W.brief.b.added(n)); } st.q = ''; drawProducts(campOf(st.id), planOf(st.id), true); drawEnvelope(campOf(st.id), planOf(st.id), true); const q = $('bf_q'); if (q) q.focus(); }
    else if (e.key === 'Escape') { st.q = ''; st.sel = new Set(); drawProducts(campOf(st.id), planOf(st.id), true); }
  }


  /* ===================== 2 · Sales target (§6 — Sales · the sub-channels sold · the prices used · the target filler · SKU × sub-channel × month) ===================== */
  const CH_SHARE = () => ((window.CP_MOCK_SCENARIO || {}).channels || { MT: 45, TT: 20, ECOM: 35 });
  const ROLE_W = { hero: 2, core: 1, gwp: 0 };
  const unitKey = () => `s14unit.${(me() || {}).id || ''}`;
  /* largest remainder: whole baht over weights → Σ = the total to the baht (D133) */
  function lrSplit(total, w) { const T = Math.round(total), t = w.reduce((a, b) => a + b, 0); if (!(t > 0)) return w.map(() => 0); const raw = w.map(x => T * x / t), out = raw.map(Math.floor);
    let left = T - out.reduce((a, b) => a + b, 0); raw.map((x, i) => [x - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } }); return out; }
  const chsOfSubs = ids => R.CHANNELS.filter(ch => ids.some(id => (subOf(id) || {}).ch === ch));
  /* the default sub-channels of a plan: the ones in use with a share > 0 (§6.1) */
  function defaultSubs() { return subsAll().filter(x => x.active !== false && x.share > 0).map(x => x.id); }
  function norm100(keys, w) { const t = keys.reduce((a, k) => a + (w[k] || 0), 0); return Object.fromEntries(keys.map(k => [k, t > 0 ? (w[k] || 0) / t * 100 : 100 / keys.length])); }
  /* the month weights of a preset: even · launch (month 1 lower, the top until End marketing, then half) · follow marketing (after: 45%) */
  function presetW(preset, c, ms) { const em = c.end_marketing ? R.ym(c.end_marketing) : R.ym(c.end);
    const w = ms.map((m, i) => (preset === 'launch' ? (i === 0 ? 0.6 : m <= em ? 1 : 0.5) : preset === 'follow' ? (m <= em ? 1 : 0.45) : 1)); const t = w.reduce((a, b) => a + b, 0); return Object.fromEntries(ms.map((m, i) => [m, w[i] / t * 100])); }
  /* a level kept with the version (or typed) is used when it has every key of now (a sub-channel / SKU added → the defaults again) · the builder of CR-13
     is changed by R.migratePlan (its total only) */
  const okLvl = (o, keys) => !!o && keys.length > 0 && keys.every(k => o[k] != null && o[k] !== '' && isFinite(+o[k]));
  function builderOf(c) {
    const F = st.F, b = F.builder || {}, chs = chsOfSubs(F.subs), ms = months(liveCamp(c)), B = {};
    B.total = b.total != null ? b.total : num(F.brief.targetEst) || null; B.from = b.from || 'suggest'; B.copy = b.copy || ''; B.preset = ['even', 'launch', 'follow', 'custom'].includes(b.preset) ? b.preset : 'even'; B.filledAt = b.filledAt || null; B.edited = !!b.edited; B.skuByCh = !!b.skuByCh;
    B.ch = okLvl(b.ch, chs) ? Object.fromEntries(chs.map(k => [k, +b.ch[k]])) : norm100(chs, CH_SHARE());
    B.sub = {}; chs.forEach(ch => { const ids = F.subs.filter(id => (subOf(id) || {}).ch === ch), d = norm100(ids, Object.fromEntries(ids.map(id => [id, (subOf(id) || {}).share || 0])));
      ids.forEach(id => { B.sub[id] = okLvl(b.sub, ids) ? +b.sub[id] : d[id]; }); });
    const codes = F.skus.map(s => s.code), sd = norm100(codes, Object.fromEntries(F.skus.map(s => [s.code, ROLE_W[s.role || 'core'] ?? 1])));
    B.sku = Object.fromEntries(codes.map(k => [k, okLvl(b.sku, codes) ? +b.sku[k] : sd[k]]));
    /* §6.3 B (CR-14.1) — Split SKU shares by channel: a column a channel, each 100 % · the default = the roles of the SKUs with a price in that channel (no price = 0 % = not sold there) */
    B.skuCh = {}; chs.forEach(ch => { const has = s => F.subs.some(id => (subOf(id) || {}).ch === ch && (p => p != null && p > 0)(priceAt(s, ch, id)));
      const d = norm100(codes, Object.fromEntries(F.skus.map(s => [s.code, has(s) ? (ROLE_W[s.role || 'core'] ?? 1) : 0]))), o = b.skuCh && b.skuCh[ch];
      B.skuCh[ch] = Object.fromEntries(codes.map(k => [k, okLvl(o, codes) ? +o[k] : d[k]])); });
    const md = presetW(B.preset === 'custom' ? 'even' : B.preset, liveCamp(c), ms); B.months = Object.fromEntries(ms.map(m => [m, okLvl(b.months, ms) ? +b.months[m] : md[m]]));
    return B;
  }
  /* Copy shares from an approved plan: its channels · its sub-channels (the ones chosen here) · its roles spread on the SKUs here · its month curve fitted to these months */
  function mixFrom(xid, c) {
    const p = planOf(xid), v = p && R.approvedVersion(p), F = st.F; if (!v) return null;
    const T = R.planTotals(v), chs = chsOfSubs(F.subs), sm = R.skuMap(v), ch = norm100(chs, Object.fromEntries(chs.map(k => [k, (T.byChannel[k] || {}).amount || 0]))), sub = {};
    chs.forEach(k => { const ids = F.subs.filter(id => (subOf(id) || {}).ch === k), d = norm100(ids, Object.fromEntries(ids.map(id => [id, (T.bySub.get(`${k}|${id}`) || {}).amount || 0]))); ids.forEach(id => { sub[id] = d[id]; }); });
    const byRole = { hero: 0, core: 0, gwp: 0 }; v.target.forEach(r => { const s = sm.get(r.code); byRole[(s && s.role) || 'core'] += R.rowAmount(r, s) || 0; });
    const here = { hero: 0, core: 0, gwp: 0 }; F.skus.forEach(s => { here[s.role || 'core']++; });
    const sku = norm100(F.skus.map(s => s.code), Object.fromEntries(F.skus.map(s => [s.code, here[s.role || 'core'] ? byRole[s.role || 'core'] / here[s.role || 'core'] : 0])));
    const xm = [...T.byMonth].filter(([, o]) => o.amount > 0).sort((a, b) => a[0].localeCompare(b[0])).map(([, o]) => o.amount), ms = months(liveCamp(c)), raw = {};
    ms.forEach((m, j) => { raw[m] = xm.length ? xm[Math.min(xm.length - 1, Math.floor((j + 0.5) / ms.length * xm.length))] : 1; });
    return { ch, sub, sku, months: norm100(ms, raw), preset: 'custom' };
  }
  function renderTarget(c, plan) {
    const F = st.F, ed = !ro(plan, 'target'), X = W.tgt, lc = liveCamp(c);
    if (!F.subs.length && !F.cells.size) F.subs = defaultSubs();
    ensurePrices();
    st.unit = pref.get(unitKey()) || 'baht';
    const T = R.planTotals(liveVer()), est = num(F.brief.targetEst), d = est > 0 ? T.target - est : null;
    const band = `<div class="tgband" data-tgband>${est > 0 ? `<span>${esc(X.est)} <b>${esc(R.baht(est))}</b></span><span class="sep">·</span>` : ''}<span>${esc(X.set)} <b>${esc(R.baht(T.target))}</b></span>` +
      (d != null ? `<span class="sep">·</span><span class="${Math.abs(d) / est > 0.1 ? 'warnx' : 'muted'}">${esc(X.diff(R.signedShort(d), R.pct(d / est, 1)))}</span>` : '') + '</div>';
    $('cp_body').innerHTML = band + `<div class="card" id="tg_subs"></div><div class="card" id="tg_price"></div><div class="card tbuild" id="tg_fill"></div><div class="card" id="tg_grid"></div>`;
    drawSubs(c, plan, ed); drawPrices(c, plan, ed); drawFiller(c, plan, ed); drawGrid(c, plan, ed); void lc;
  }
  /* 6.1 — the sub-channels sold (the channels of the plan come from them) · a sub-channel with a target taken out asks in place */
  function drawSubs(c, plan, ed) {
    const F = st.F, X = W.tgt, box = $('tg_subs'); if (!box) return; const dis = ed ? '' : ' disabled', on = new Set(F.subs), all = subsAll();
    const rm = st.rmSub ? (() => { const x = subOf(st.rmSub), t = [...F.cells].filter(([k]) => k.split('|')[2] === st.rmSub).reduce((a, [, o]) => a + (o.amount || 0), 0);
      return `<div class="nsband warnb"><span class="nsb-t">${esc(X.rmHas(x ? x.name : st.rmSub, R.baht(t)))}</span> <button type="button" class="btn small danger" data-tsrmyes>${esc(X.rmYes)}</button> <button type="button" class="btn small" data-tsrmno>${esc(C.common.cancel)}</button></div>`; })() : '';
    box.innerHTML = `<div class="card-head"><h3>${esc(X.subsT)}</h3><div class="ctl"><span class="muted small">${esc(X.subsHelp)}</span></div></div>${rm}<div class="tsubs">` + R.CHANNELS.map(ch => {
      const xs = all.filter(x => x.ch === ch && (x.active !== false || on.has(x.id))), allOn = xs.filter(x => x.active !== false).every(x => on.has(x.id));
      return `<div class="tsrow"><label class="chk tsch"><input type="checkbox" data-tsch="${ch}"${allOn && xs.length ? ' checked' : ''}${dis}><span><b>${esc(C.channel[ch])}</b></span></label><span class="tschips">` +
        xs.map(x => `<button type="button" class="tsub${on.has(x.id) ? ' on' : ''}${x.active === false ? ' off' : ''}" data-tsub="${esc(x.id)}" aria-pressed="${on.has(x.id)}"${dis}>${on.has(x.id) ? '✓ ' : ''}${esc(x.name)}${x.active === false ? ` <span class="muted small">${esc(X.notUsed)}</span>` : ''}</button>`).join('') + '</span></div>'; }).join('') + '</div>';
    R.CHANNELS.forEach(ch => { const cb = box.querySelector(`[data-tsch="${ch}"]`), xs = all.filter(x => x.ch === ch && x.active !== false), n = xs.filter(x => on.has(x.id)).length; if (cb) cb.indeterminate = n > 0 && n < xs.length; });
  }
  function setSubs(ids) { const F = st.F, before = new Set(F.subs); F.subs = subsAll().filter(x => ids.includes(x.id)).map(x => x.id); ensurePrices(); if (F.builder) { F.builder.ch = null; F.builder.sub = null; } touch('target'); void before; }
  /* 6.2 — the prices used: grey = the standard (Product Master) · bold = the campaign price + % off · a standard changed → ⚠ Use the new price · the whole channel −% · clear */
  function drawPrices(c, plan, ed) {
    const F = st.F, X = W.tgt, box = $('tg_price'); if (!box) return; const dis = ed ? '' : ' disabled', subs = F.subs.map(subOf).filter(Boolean);
    const miss = F.skus.some(sk => subs.some(x => priceAt(sk, x.ch, x.id) == null)), open = st.priceOpen != null ? st.priceOpen : miss;
    const cell = (sk, x) => { const e = sk.prices[x.id] || {}, sd = e.std, now = stdOf(sk, x.id), cp = e.camp, p = priceAt(sk, x.ch, x.id), off = cp != null && cp !== '' && sd ? (cp - sd) / sd : null;
      const drift = now != null && sd != null && Math.abs(now - sd) > 0.005 ? `<div class="warnx small">⚠ ${esc(X.stdChanged(R.fmtNum(sd, 2), R.fmtNum(now, 2)))}${ed ? ` <button type="button" class="link small" data-tpnew="${esc(sk.code)}|${esc(x.id)}">${esc(X.useNew)}</button>` : ''}</div>` : '';
      return `<td class="num tpc${p == null ? ' nop' : ''}"><span class="tp-std${cp != null && cp !== '' ? ' x' : ''}">${sd == null ? '' : esc(R.fmtNum(sd, 2))}</span><input class="inp sm num" data-tpc="${esc(sk.code)}|${esc(x.id)}" inputmode="decimal" value="${esc(cp == null ? '' : cp)}" placeholder="${esc(sd == null ? X.noPrice : R.fmtNum(sd, 2))}"${dis}>` +
        `${off != null ? `<span class="small ${off < 0 ? 'good' : 'warnx'}">${esc(R.pct(off, 1))}</span>` : ''}${p == null ? `<div class="neg small">${esc(X.noPrice)}</div>` : ''}${drift}</td>`; };
    const tools = ed ? `<div class="tptools"><span class="muted small">${esc(X.discL)}</span><select class="inp sm" data-tdch>${chsOfSubs(F.subs).map(k => `<option value="${k}">${esc(C.channel[k])}</option>`).join('')}</select><input class="inp sm num" data-tdpct inputmode="decimal" placeholder="15"><span class="muted">%</span>` +
      `<button type="button" class="btn small" data-tdgo>${esc(X.discGo)}</button><button type="button" class="btn small ghost" data-tdclear>${esc(X.clear)}</button></div>` : '';
    box.innerHTML = `<details class="tpd"${open ? ' open' : ''} data-tpopen><summary><b>${labelInfo(X.priceT, W.netTip)}</b>${miss ? ` <span class="chip err">${esc(X.missing)}</span>` : ''}</summary>${tools}` +
      `<div class="tablewrap"><table class="tbl simple tptbl"><thead><tr><th>SKU</th>${subs.map(x => `<th class="num" title="${esc(C.s14.priceName[x.priceName] || '')}">${esc(x.name)}<small>${esc(x.ch)}</small></th>`).join('')}</tr></thead><tbody>` +
      F.skus.map(sk => `<tr><td>${esc(sk.nickname || sk.name)} <span class="muted small">${esc(sk.code)}</span></td>${subs.map(x => cell(sk, x)).join('')}</tr>`).join('') + '</tbody></table></div></details>';
  }
  /* 6.3 — the target filler: every row % ↔ ฿ · each level adds to 100.0 (≤ 0.5 off: Spread it) · months as % (not weights) · Fill = Σ the total to the baht */
  function sumState(vals) { const t = vals.reduce((a, b) => a + (+b || 0), 0), d = Math.round((100 - t) * 10) / 10; return { t, d, ok: Math.abs(d) < 0.05, near: Math.abs(d) <= 0.5 }; }
  function sumLine(key, vals) { const s = sumState(vals), X = W.tgt.f;
    return `<div class="fsum ${s.ok ? 'okx' : s.near ? 'warnx' : 'neg'}" data-fsum="${esc(key)}">${s.ok ? esc(X.sumOk(pct1(s.t))) : esc(s.d > 0 ? X.sumShort(pct1(s.t), pct1(s.d)) : X.sumOver(pct1(s.t), pct1(-s.d)))}${!s.ok && s.near ? ` <button type="button" class="link small" data-fspread="${esc(key)}">${esc(X.spreadIt)}</button>` : !s.ok && /^skuch:/.test(key) && s.t > 0 ? ` <button type="button" class="link small" data-fspread="${esc(key)}">${esc(X.rescaleIt)}</button>` : ''}</div>`; }
  function drawFiller(c, plan, ed) {
    const F = st.F, X = W.tgt.f, box = $('tg_fill'); if (!box) return; const dis = ed ? '' : ' disabled', B = builderOf(c), tot = num(B.total) || 0, chs = chsOfSubs(F.subs), ms = months(liveCamp(c));
    F.builder = Object.assign({}, F.builder || {}, B);
    const open = st.fillOpen != null ? st.fillOpen : !R.planTotals(liveVer()).target;
    const others = allCamps().filter(x => x.id !== c.id && x.approval === 'approved').sort((a, b) => b.start.localeCompare(a.start));
    const inp = (attr, v, w) => `<input class="inp sm num${w ? ' ' + w : ''}" ${attr} inputmode="decimal" value="${esc(v)}"${dis}>`;
    const chRows = chs.map(ch => { const p = B.ch[ch], amt = tot * p / 100, ids = F.subs.filter(id => (subOf(id) || {}).ch === ch);
      return `<tr class="fch"><td><b>${esc(C.channel[ch])}</b></td><td class="num">${inp(`data-fch="${ch}"`, pct1(p))}</td><td class="num">${inp(`data-fchb="${ch}"`, fmtB(amt), 'wide')}</td><td class="num muted">${esc(pct1(p))}</td></tr>` +
        ids.map(id => { const sp = B.sub[id] || 0, sa = amt * sp / 100; return `<tr class="fsub"><td>┗ ${esc((subOf(id) || {}).name || id)}</td><td class="num">${inp(`data-fsb="${esc(id)}"`, pct1(sp))}</td><td class="num">${inp(`data-fsbb="${esc(id)}"`, fmtB(sa), 'wide')}</td><td class="num muted">${esc(pct1(p * sp / 100))}</td></tr>`; }).join('') +
        `<tr class="fsubsum"><td colspan="4">${sumLine('sub:' + ch, ids.map(id => B.sub[id]))}</td></tr>`; }).join('');
    const codes = F.skus.map(s => s.code), byCh = !!B.skuByCh && chs.length > 0;
    const skuChTbl = byCh ? `<div class="tablewrap"><table class="tbl simple fsktbl fskch"><thead><tr><th>SKU</th>${chs.map(ch => `<th class="num">${esc(C.channel[ch])} %</th>`).join('')}</tr></thead><tbody>` +
      F.skus.map(sk => `<tr><td>${esc(sk.nickname || sk.name)} <span class="muted small">${esc(C.step.p.roles[sk.role || 'core'])}</span></td>${chs.map(ch => `<td class="num">${inp(`data-fskc="${esc(sk.code)}|${ch}"`, pct1((B.skuCh[ch] || {})[sk.code]))}</td>`).join('')}</tr>`).join('') +
      `<tr class="fsubsum"><td></td>${chs.map(ch => `<td>${sumLine('skuch:' + ch, codes.map(k => (B.skuCh[ch] || {})[k]))}</td>`).join('')}</tr></tbody></table></div>` : '';
    const skuRows = F.skus.map(sk => `<tr><td>${esc(sk.nickname || sk.name)} <span class="muted small">${esc(C.step.p.roles[sk.role || 'core'])}</span></td><td class="num">${inp(`data-fsk="${esc(sk.code)}"`, pct1(B.sku[sk.code]))}</td><td class="num">${inp(`data-fskb="${esc(sk.code)}"`, fmtB(tot * (B.sku[sk.code] || 0) / 100), 'wide')}</td></tr>`).join('');
    const mx = Math.max(...ms.map(m => B.months[m] || 0), 0.0001);
    const mCols = `<div class="tablewrap"><table class="tbl simple fmtbl"><thead><tr><th></th>${ms.map(m => `<th class="num">${esc(R.monthShort(m))}${m.slice(5) === '01' || m === ms[0] ? `<small>${m.slice(0, 4)}</small>` : ''}</th>`).join('')}<th class="num">${esc(C.common.total)}</th></tr></thead><tbody>` +
      `<tr><td>%</td>${ms.map(m => `<td class="num">${inp(`data-fm="${m}"`, pct1(B.months[m]))}</td>`).join('')}<td class="num"><b>${esc(pct1(ms.reduce((a, m) => a + (B.months[m] || 0), 0)))}</b></td></tr>` +
      `<tr><td>฿</td>${ms.map(m => `<td class="num">${inp(`data-fmb="${m}"`, fmtB(tot * (B.months[m] || 0) / 100), 'wide')}</td>`).join('')}<td class="num"><b>${esc(fmtB(tot))}</b></td></tr>` +
      `<tr class="fbars"><td></td>${ms.map(m => `<td><i style="height:${Math.round(4 + (B.months[m] || 0) / mx * 22)}px"></i></td>`).join('')}<td></td></tr></tbody></table></div>`;
    const skuSums = byCh ? chs.map(ch => sumState(codes.map(k => (B.skuCh[ch] || {})[k]))) : [sumState(F.skus.map(s => B.sku[s.code]))];
    const sums = [sumState(chs.map(k => B.ch[k])), ...chs.map(ch => sumState(F.subs.filter(id => (subOf(id) || {}).ch === ch).map(id => B.sub[id]))), ...skuSums, sumState(ms.map(m => B.months[m]))];
    const nSku = ch => F.skus.filter(s => ((byCh ? (B.skuCh[ch] || {}) : B.sku)[s.code] || 0) > 0).length;
    const bad = sums.some(s => !s.near), nCells = F.subs.filter(id => (B.ch[(subOf(id) || {}).ch] || 0) > 0 && (B.sub[id] || 0) > 0).reduce((a, id) => a + nSku((subOf(id) || {}).ch), 0) * ms.filter(m => (B.months[m] || 0) > 0).length;
    const filled = B.filledAt ? `<span class="muted small">${esc(X.filledAt(R.dmy(String(B.filledAt).slice(0, 10))))}</span>${B.edited ? ` <span class="chip warn">${esc(SP.tb.edited)}</span>` : ''}` : '';
    box.innerHTML = `<details${open ? ' open' : ''} data-fopen><summary><b>${esc(X.title)}</b> <span class="muted small">${esc(X.sub)}</span>${B.edited ? ` <span class="chip warn">${esc(SP.tb.edited)}</span>` : ''}</summary><div class="tb-body">` +
      `<div class="tb-row"><label class="tb-l" for="tf_total">${esc(X.total)}</label><input id="tf_total" class="inp num tb-full" data-ftotal inputmode="decimal" value="${esc(tot ? fmtB(tot) : '')}"${dis}>` +
      `<span class="tb-l">${esc(X.from)}</span><label class="chk"><input type="radio" name="tf_from" data-ffrom="suggest"${B.from !== 'copy' ? ' checked' : ''}${dis}><span>${esc(X.suggest)}</span></label><label class="chk"><input type="radio" name="tf_from" data-ffrom="copy"${B.from === 'copy' ? ' checked' : ''}${dis}><span>${esc(X.copy)}</span></label>` +
      `<select class="inp sm" data-fcopy${dis}${B.from === 'copy' ? '' : ' disabled'}><option value="">—</option>${others.map(x => `<option value="${esc(x.id)}"${x.id === B.copy ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` +
      `<h4 class="bf-h4">A · ${esc(X.chT)}</h4><div class="tablewrap"><table class="tbl simple fchtbl"><thead><tr><th>${esc(X.chCol)}</th><th class="num">%</th><th class="num">฿</th><th class="num">${esc(X.ofTotal)}</th></tr></thead><tbody>${chs.length ? chRows : `<tr><td colspan="4" class="muted">${esc(W.tgt.noSubs)}</td></tr>`}</tbody></table></div>${chs.length ? sumLine('ch', chs.map(k => B.ch[k])) : ''}` +
      `<h4 class="bf-h4">B · ${esc(X.skuT)}</h4><div class="tb-row"><span class="muted small">${esc(X.skuDef)}</span><label class="chk"><input type="checkbox" data-fskuch${byCh ? ' checked' : ''}${dis}><span>${esc(X.skuByCh)}</span></label></div>` +
      (byCh ? `<div class="muted small">${esc(X.skuChHelp)}</div>${skuChTbl}` : `<div class="tablewrap"><table class="tbl simple fsktbl"><thead><tr><th>SKU</th><th class="num">%</th><th class="num">฿</th></tr></thead><tbody>${skuRows}</tbody></table></div>${sumLine('sku', F.skus.map(s => B.sku[s.code]))}`) +
      `<h4 class="bf-h4">C · ${esc(X.monT)}</h4><div class="tb-row">${U.segHTML('data-fpreset', ['even', 'launch', 'follow', 'custom'].map(v => ({ v, label: SP.tb.curves[v] })), B.preset)}</div>${mCols}${sumLine('months', ms.map(m => B.months[m]))}` +
      `<div class="tb-row tb-act fillrow"><span data-fwill>${esc(X.will(F.skus.length, F.subs.length, ms.length, nCells, R.baht(tot)))}</span><label class="chk"><input type="radio" name="tf_mode" data-fmode="replace"${st.fillMode !== 'empty' ? ' checked' : ''}${dis}><span>${esc(X.replace)}</span></label>` +
      `<label class="chk"><input type="radio" name="tf_mode" data-fmode="empty"${st.fillMode === 'empty' ? ' checked' : ''}${dis}><span>${esc(X.empty)}</span></label>` +
      (ed ? `<button type="button" class="btn primary small" data-ffill${bad || !(tot > 0) ? ` disabled title="${esc(!(tot > 0) ? SP.tb.errFull : X.notSum)}"` : ''}>${esc(X.fill)}</button>` : '') + `${filled}</div></div></details>`;
  }
  /* a level of the filler typed (% or ฿ — the other one follows) · a month typed → Custom from what is shown */
  function readFill(t) {
    const F = st.F, c = campOf(st.id), B = F.builder || builderOf(c), tot = num(B.total) || 0, v = num(t.value), ms = months(liveCamp(c));
    if (t.matches('[data-ftotal]')) { B.total = v == null ? null : Math.round(v); return; }
    if (t.dataset.fch) { B.ch[t.dataset.fch] = v || 0; return; } if (t.dataset.fchb) { B.ch[t.dataset.fchb] = tot > 0 && v != null ? v / tot * 100 : 0; return; }
    if (t.dataset.fsb) { B.sub[t.dataset.fsb] = v || 0; return; } if (t.dataset.fsbb) { const id = t.dataset.fsbb, ca = tot * (B.ch[(subOf(id) || {}).ch] || 0) / 100; B.sub[id] = ca > 0 && v != null ? v / ca * 100 : 0; return; }
    if (t.dataset.fskc) { const [k, ch] = t.dataset.fskc.split('|'); B.skuCh = B.skuCh || {}; B.skuCh[ch] = Object.assign({}, B.skuCh[ch] || {}); B.skuCh[ch][k] = v || 0; return; }
    if (t.dataset.fsk) { B.sku[t.dataset.fsk] = v || 0; return; } if (t.dataset.fskb) { B.sku[t.dataset.fskb] = tot > 0 && v != null ? v / tot * 100 : 0; return; }
    if (t.dataset.fm) { B.months[t.dataset.fm] = v || 0; B.preset = 'custom'; return; } if (t.dataset.fmb) { B.months[t.dataset.fmb] = tot > 0 && v != null ? v / tot * 100 : 0; B.preset = 'custom'; return; }
    void ms;
  }
  function spreadIt(key) { const F = st.F, B = F.builder, c = campOf(st.id); let obj, keys;
    if (key.startsWith('skuch:')) { obj = B.skuCh[key.slice(6)]; keys = F.skus.map(s => s.code); } else if (key === 'ch') { obj = B.ch; keys = chsOfSubs(F.subs); } else if (key === 'sku') { obj = B.sku; keys = F.skus.map(s => s.code); } else if (key === 'months') { obj = B.months; keys = months(liveCamp(c)); }
    else { const ch = key.slice(4); obj = B.sub; keys = F.subs.filter(id => (subOf(id) || {}).ch === ch); }
    const s = sumState(keys.map(k => obj[k])), big = keys.slice().sort((a, b) => (obj[b] || 0) - (obj[a] || 0))[0];
    /* CR-14.1 — a SKU set to 0 % in a channel: the others are rescaled to 100 (their shares kept) · else the largest row takes the small difference */
    if (!s.near && /^skuch:/.test(key) && s.t > 0) { keys.forEach(k => { obj[k] = Math.round((obj[k] || 0) / s.t * 1000) / 10; }); const s2 = sumState(keys.map(k => obj[k])); if (big != null) obj[big] = (obj[big] || 0) + (100 - s2.t); return; }
    if (big != null) obj[big] = (obj[big] || 0) + (100 - s.t); }
  /* Fill: ฿ of a cell = total × channel % × sub-channel % × SKU % × month % · whole baht by the largest remainder → Σ = the total exactly · qty = round(฿ ÷ price) */
  function fillGrid(c) {
    const F = st.F, B = F.builder, tot = Math.round(num(B.total) || 0), ms = months(liveCamp(c)), cells = [];
    const norm = (keys, o) => { const t = keys.reduce((a, k) => a + (o[k] || 0), 0); return k => (t > 0 ? (o[k] || 0) / t : 0); }, chs = chsOfSubs(F.subs), nc = norm(chs, B.ch), nsk = norm(F.skus.map(s => s.code), B.sku), nm = norm(ms, B.months);
    chs.forEach(ch => { const ids = F.subs.filter(id => (subOf(id) || {}).ch === ch), ns = norm(ids, B.sub);
      const nk = B.skuByCh && B.skuCh && B.skuCh[ch] ? norm(F.skus.map(s => s.code), B.skuCh[ch]) : nsk;
      ids.forEach(id => F.skus.forEach(sk => { const p = priceAt(sk, ch, id); if (p === 0) return; ms.forEach(m => { const w = nc(ch) * ns(id) * nk(sk.code) * nm(m); if (w > 0) cells.push({ k: cellKey(sk.code, ch, id, m), sk, ch, id, w }); }); })); });
    const amt = lrSplit(tot, cells.map(x => x.w));
    if (st.fillMode !== 'empty') F.cells.clear();
    cells.forEach((x, i) => { const cur = F.cells.get(x.k); if (st.fillMode === 'empty' && cur && (cur.amount || cur.qty)) return; const p = priceAt(x.sk, x.ch, x.id); F.cells.set(x.k, { amount: amt[i], qty: p ? Math.round(amt[i] / p) : null, basis: 'amount' }); });
    B.filledAt = at(); B.edited = false; touch('target'); U.toast(W.tgt.f.filled(R.baht(R.planTotals(liveVer()).target)));
  }
  /* 6.4 — the grid: ฿ by default (remembered a person) · tabs All · MT · TT · ECOM · grouped sub-channel › SKU or SKU › sub-channel · hide empty rows · a phone: read only */
  function gridRows(c) {
    const F = st.F, X = W.tgt, tab = st.tab, chs = R.CHANNELS.filter(ch => tab === 'all' || tab === ch), rows = [], has = new Map();
    F.cells.forEach((o, k) => { if (o.amount || o.qty) { const [code, ch, sub] = k.split('|'); has.set(`${code}|${ch}|${sub}`, true); } });
    const subsIn = ch => { const ids = F.subs.filter(id => (subOf(id) || {}).ch === ch); if ([...has.keys()].some(k => { const [, c2, s2] = k.split('|'); return c2 === ch && !s2; })) ids.push(''); return ids; };
    const subLabel = (ch, id) => (id ? (subOf(id) || {}).name || id : `${ch} · ${X.unspecified}`);
    const hide = key => st.hideEmpty && !has.has(key);
    if (st.group === 'sku') {
      F.skus.forEach(sk => { const kids = []; chs.forEach(ch => subsIn(ch).forEach(id => { const key = `${sk.code}|${ch}|${id}`; if (!hide(key)) kids.push({ key, label: subLabel(ch, id), sub: C.channel[ch], level: 1, leaf: true }); }));
        if (!kids.length) return; const g = 'K|' + sk.code, open = !st.folded.has(g); rows.push({ key: g, label: sk.nickname || sk.name, sub: sk.code, level: 0, fold: true, open }); kids.forEach(x => rows.push(Object.assign(x, { hidden: !open }))); });
    } else {
      chs.forEach(ch => { const ids = subsIn(ch), block = []; ids.forEach(id => { const kids = F.skus.map(sk => ({ key: `${sk.code}|${ch}|${id}`, label: `${sk.nickname || sk.name}${sk.role === 'hero' ? ' (Hero)' : ''}`, sub: sk.code, level: 2, leaf: true })).filter(x => !hide(x.key));
          if (!kids.length) return; const g = `S|${ch}|${id}`; block.push({ g, label: subLabel(ch, id), kids }); });
        if (!block.length) return; const gc = 'C|' + ch, openC = !st.folded.has(gc); rows.push({ key: gc, label: C.channel[ch], sub: C.channelLong[ch], level: 0, fold: true, open: openC });
        block.forEach(b => { const open = openC && !st.folded.has(b.g); rows.push({ key: b.g, label: b.label, level: 1, fold: true, open, hidden: !openC }); b.kids.forEach(x => rows.push(Object.assign(x, { hidden: !open }))); }); });
    }
    return rows;
  }
  function drawGrid(c, plan, ed0) {
    const F = st.F, X = W.tgt, box = $('tg_grid'); if (!box) return; const mob = innerWidth < 768, ed = ed0 && !mob, T = R.planTotals(liveVer()), ms = months(liveCamp(c));
    const tabs = ['all'].concat(R.CHANNELS.filter(ch => F.subs.some(id => (subOf(id) || {}).ch === ch) || (T.byChannel[ch] || {}).amount)).map(k => `<button type="button" role="tab" data-ttab="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${esc(k === 'all' ? X.all : C.channel[k])} <span class="n">${esc(R.shortBaht(k === 'all' ? T.target : (T.byChannel[k] || {}).amount || 0))}</span></button>`).join('');
    const byCh = R.CHANNELS.filter(k => T.byChannel[k]).map(k => `<span><b>${esc(C.channel[k])}</b> ${esc(R.baht(T.byChannel[k].amount))} · ≈${esc(C.common.pcs(R.fmtNum(Math.round(T.byChannel[k].qty))))}</span>`).join('<span class="sep">·</span>');
    /* §6.4 (CR-14.2) — the tools of the row chosen in the grid: Spread this row's total (a SKU row: over the months · a sub-channel / channel / SKU group row: over
       its rows by the shares of the filler, then the months) · Copy from another row · Clear row */
    const spreadF = ed ? `<div class="tgspread tgrow" data-tgrow><span class="small" data-trowname>${esc(X.rowL)}: <b>${esc(X.rowNone)}</b></span><span class="sep">·</span>` +
      `<input class="inp sm num" data-tsamt inputmode="decimal" placeholder="฿" disabled><button type="button" class="btn small" data-tsgo disabled>${esc(X.spreadRow)}</button><span class="sep">·</span>` +
      `<select class="inp sm" data-tcopy disabled><option value="">${esc(X.copyFrom)}</option></select><button type="button" class="btn small" data-tcopygo disabled>${esc(X.copyGo)}</button>` +
      `<button type="button" class="btn small ghost" data-tclear disabled>${esc(X.clearRow)}</button></div>` : '';
    box.innerHTML = `<div class="card-head"><h3>${esc(X.gridT)}</h3><div class="ctl">${U.segHTML('data-tunit', [{ v: 'baht', label: '฿' }, { v: 'qty', label: X.pieces }], st.unit, { label: X.unitL })}</div></div>` +
      `<div class="sttabs ktabs" role="tablist">${tabs}</div><div class="tgtools">${U.segHTML('data-tgroup', [{ v: 'sub', label: X.gSub }, { v: 'sku', label: X.gSku }], st.group, { label: X.groupL })}` +
      `<label class="chk"><input type="checkbox" data-thide${st.hideEmpty ? ' checked' : ''}><span>${esc(X.hideEmpty)}</span></label><button type="button" class="link small" data-texp>${esc(X.expand)}</button><button type="button" class="link small" data-tcol>${esc(X.collapse)}</button>` +
      (ed ? `<button type="button" class="btn small ghost" data-tundo>${esc(P.grid.undo)}</button><button type="button" class="btn small ghost" data-tredo>${esc(P.grid.redo)}</button>` : '') + `</div>${spreadF}` +
      `<div class="sumline">${byCh}<span class="sep">·</span><span><b>${esc(C.common.total)}</b> ${esc(R.baht(T.target))}</span></div>` + (mob ? `<div class="nsband"><span class="nsb-t">${esc(X.onComputer)}</span></div>` : '') +
      (F.skus.length && F.subs.length ? `<div id="tg_g" class="cp-grid"></div>` : `<div class="c3-empty">${esc(F.skus.length ? X.noSubs : X.noSku)}</div>`) + `<div class="muted small cp-keys">${ed ? esc(P.grid.keys) : ''}</div>`;
    if (!$('tg_g')) return;
    const rows = gridRows(c), sm = new Map(F.skus.map(s => [s.code, s])); st.gk = rows.map(r => r.key);
    st.g = U.grid($('tg_g'), { id: 'g14', rows, cols: monthCols(ms), corner: X.corner, aria: X.gridT, readOnly: !ed, share: true, shareLabel: X.shareCol, fmt: v => (st.unit === 'qty' ? R.fmtNum(Math.round(v)) : R.fmtNum(Math.round(v))),
      get: (rk, m) => { const o = F.cells.get(`${rk}|${m}`); if (!o) return null; const v = st.unit === 'qty' ? o.qty : o.amount; return v == null || v === 0 ? null : v; },
      canEdit: () => ed,
      onChange: ch => { ch.forEach(x => { const [code, c2, sub] = x.r.split('|'), k = `${x.r}|${x.c}`, p = priceAt(sm.get(code), c2, sub);
          if (x.v == null || x.v === 0) { F.cells.delete(k); return; }
          if (st.unit === 'qty') F.cells.set(k, { qty: Math.round(x.v), amount: p != null ? Math.round(x.v) * p : null, basis: 'qty' }); else F.cells.set(k, { amount: Math.round(x.v), qty: p ? Math.round(x.v / p) : null, basis: 'amount' }); });
        if (F.builder && F.builder.filledAt) F.builder.edited = true; touch('target'); const sl = box.querySelector('.sumline'); if (sl) { const T2 = R.planTotals(liveVer()); sl.innerHTML = R.CHANNELS.filter(k => T2.byChannel[k]).map(k => `<span><b>${esc(C.channel[k])}</b> ${esc(R.baht(T2.byChannel[k].amount))} · ≈${esc(C.common.pcs(R.fmtNum(Math.round(T2.byChannel[k].qty))))}</span>`).join('<span class="sep">·</span>') + `<span class="sep">·</span><span><b>${esc(C.common.total)}</b> ${esc(R.baht(T2.target))}</span>`; } },
      onFold: k => { if (st.folded.has(k)) st.folded.delete(k); else st.folded.add(k); drawGrid(c, plan, ed0); } });
    const gb = $('tg_g'); if (ed && gb) { const upd = () => rowTools(c); gb.addEventListener('click', upd); gb.addEventListener('keyup', upd); gb.addEventListener('focusin', upd); }
    if (st.rowKey && st.gk.includes(st.rowKey) && st.g) st.g.setActive(st.gk.indexOf(st.rowKey), 0);
    rowTools(c);
  }
  /* the row chosen (the active cell of the grid) → the tools: its name · Copy from (the other SKU rows) · on / off */
  function rowLabel(key) {
    const F = st.F, [a, b, cc] = key.split('|'), sk = F.skus.find(s => s.code === a), sub = id => (id ? (subOf(id) || {}).name || id : W.tgt.unspecified);
    if (a === 'C') return C.channel[b]; if (a === 'S') return `${C.channel[b]} · ${sub(cc)}`; if (a === 'K') { const s = F.skus.find(x => x.code === b); return s ? s.nickname || s.name : b; }
    return `${sk ? sk.nickname || sk.name : a} · ${sub(cc)}`;
  }
  function rowTools(c) {
    const box = host && host.querySelector('[data-tgrow]'); if (!box || !st.g) return; const X = W.tgt, a = st.g.active(), row = a && a.row; st.rowKey = row ? row.key : null;
    const nm = box.querySelector('[data-trowname]'); nm.innerHTML = `${esc(X.rowL)}: <b>${esc(row ? rowLabel(row.key) : X.rowNone)}</b>`;
    const leaf = !!(row && row.leaf), on = !!row; box.querySelector('[data-tsamt]').disabled = !on; box.querySelector('[data-tsgo]').disabled = !on; box.querySelector('[data-tclear]').disabled = !on;
    const sel = box.querySelector('[data-tcopy]'), btn = box.querySelector('[data-tcopygo]'); sel.disabled = btn.disabled = !leaf;
    const keys = leaf ? (st.gk || []).filter(k => k !== row.key && k.split('|').length === 3 && !/^[CSK]$/.test(k.split('|')[0])) : [];
    sel.innerHTML = `<option value="">${esc(X.copyFrom)}</option>` + keys.map(k => `<option value="${esc(k)}">${esc(rowLabel(k))}</option>`).join(''); void c;
  }
  /* the leaf rows (SKU · channel · sub-channel) of a row of the grid */
  function leavesOf(key) { const [a, b, cc] = key.split('|'), F = st.F;
    if (a === 'C') return F.subs.filter(id => (subOf(id) || {}).ch === b).flatMap(id => F.skus.map(s => `${s.code}|${b}|${id}`));
    if (a === 'S') return F.skus.map(s => `${s.code}|${b}|${cc}`);
    if (a === 'K') return F.subs.map(id => `${b}|${(subOf(id) || {}).ch}|${id}`);
    return [key]; }
  /* a ฿ total over leaf rows (their weights from the filler) and the months (C) · whole baht, Σ = the total */
  function spreadKeys(c, keys, total) {
    const F = st.F, B = builderOf(c), ms = months(liveCamp(c)), cells = [];
    keys.forEach(k => { const [code, ch, sub] = k.split('|'), sw = B.skuByCh ? (B.skuCh[ch] || {}) : B.sku, w0 = keys.length === 1 ? 1 : (B.ch[ch] || 0) * (B.sub[sub] || 0) * (sw[code] || 0);
      ms.forEach(m => { const w = w0 * (B.months[m] || 0); if (w > 0) cells.push({ k: `${k}|${m}`, code, ch, sub, w }); }); });
    if (!cells.length) return false;
    keys.forEach(k => ms.forEach(m => F.cells.delete(`${k}|${m}`)));
    const amt = lrSplit(total, cells.map(x => x.w)), sm = new Map(F.skus.map(s => [s.code, s]));
    cells.forEach((x, i) => { if (!amt[i]) return; const p = priceAt(sm.get(x.code), x.ch, x.sub); F.cells.set(x.k, { amount: amt[i], qty: p ? Math.round(amt[i] / p) : null, basis: 'amount' }); });
    return true;
  }
  function rowAct(c, plan, what) {
    const F = st.F, X = W.tgt, key = st.rowKey; if (!key) return; const ms = months(liveCamp(c)), keys = leavesOf(key), name = rowLabel(key);
    if (what === 'spread') { const v = num((host.querySelector('[data-tsamt]') || {}).value); if (v == null || v < 0) return; if (!spreadKeys(c, keys, Math.round(v))) return; U.toast(X.rowSpread(name, R.baht(Math.round(v)))); }
    if (what === 'clear') { keys.forEach(k => [...F.cells.keys()].forEach(x => { if (x.startsWith(k + '|')) F.cells.delete(x); })); U.toast(X.rowCleared(name)); }
    if (what === 'copy') { const from = (host.querySelector('[data-tcopy]') || {}).value; if (!from) return; const [code, ch, sub] = key.split('|'), sk = F.skus.find(s => s.code === code), p = priceAt(sk, ch, sub);
      ms.forEach(m => { F.cells.delete(`${key}|${m}`); const o = F.cells.get(`${from}|${m}`); if (o && o.amount) F.cells.set(`${key}|${m}`, { amount: o.amount, qty: p ? Math.round(o.amount / p) : null, basis: 'amount' }); });
      U.toast(X.rowCopied(name, rowLabel(from))); }
    if (F.builder && F.builder.filledAt) F.builder.edited = true; touch('target'); renderTarget(c, plan);
  }
  /* ⋯ Spread this row's total: a sub-channel ฿ → its SKUs by the SKU shares (B) and the months by C */
  function spreadRow(c, id, total) {
    const F = st.F, B = builderOf(c), x = subOf(id), ms = months(liveCamp(c)); if (!x) return;
    const sw = B.skuByCh ? B.skuCh[x.ch] || {} : B.sku, ks = []; F.skus.forEach(sk => ms.forEach(m => { const w = (sw[sk.code] || 0) * (B.months[m] || 0); if (w > 0) ks.push({ k: cellKey(sk.code, x.ch, id, m), sk, w }); }));
    [...F.cells.keys()].forEach(k => { if (k.split('|')[2] === id) F.cells.delete(k); });
    const amt = lrSplit(total, ks.map(y => y.w)); ks.forEach((y, i) => { const p = priceAt(y.sk, x.ch, id); if (amt[i]) F.cells.set(y.k, { amount: amt[i], qty: p ? Math.round(amt[i] / p) : null, basis: 'amount' }); });
    touch('target');
  }
  function onTarget(e) {
    const t = e.target, F = st.F, c = campOf(st.id), plan = planOf(st.id), ed = !ro(plan, 'target');
    if (t.matches('[data-tpc]')) { const [code, id] = t.dataset.tpc.split('|'), sk = F.skus.find(s => s.code === code); if (!sk) return; const v = num(t.value); sk.prices[id] = Object.assign({ std: stdOf(sk, id) }, sk.prices[id] || {}, { camp: v == null ? null : v }); repriced(code, id); touch('target'); if (e.type === 'change') { drawPrices(c, plan, ed); drawGrid(c, plan, ed); } return true; }
    if (t.closest('#tg_fill')) { if (t.matches('[data-fmode]')) { st.fillMode = t.dataset.fmode; return true; }
      if (t.matches('[data-fskuch]')) { if (e.type !== 'change') return true; const B = F.builder || builderOf(c); B.skuByCh = t.checked; F.builder = B; touch('target'); st.fillOpen = true; drawFiller(c, plan, ed); return true; }
      if (t.matches('[data-ffrom]') || t.matches('[data-fcopy]')) { const B = F.builder || builderOf(c); if (t.matches('[data-ffrom]')) B.from = t.dataset.ffrom; if (t.matches('[data-fcopy]')) B.copy = t.value;
        if (B.from === 'copy' && B.copy) { const mx = mixFrom(B.copy, c); if (mx) Object.assign(B, mx); } else if (B.from === 'suggest' && t.matches('[data-ffrom]')) { F.builder = { total: B.total, from: 'suggest' }; }
        F.builder = Object.assign(F.builder || {}, B.from === 'suggest' && t.matches('[data-ffrom]') ? {} : B); touch('target'); st.fillOpen = true; drawFiller(c, plan, ed); return true; }
      readFill(t); touch('target'); if (e.type === 'change') { st.fillOpen = true; const keep = t.outerHTML.match(/data-f\w+(="[^"]*")?/); drawFiller(c, plan, ed); if (keep) { const x = $('tg_fill').querySelector(`[${keep[0]}]`); if (x && document.activeElement === document.body) x.focus(); } } return true; }
    if (t.matches('[data-thide]')) { st.hideEmpty = t.checked; drawGrid(c, plan, ed); return true; }
    if (t.matches('[data-tdpct]') || t.matches('[data-tdch]') || t.matches('[data-tsrow]') || t.matches('[data-tsamt]') || t.matches('[data-tcopy]')) return true;
    if (t.matches('[data-tsch]')) { const ch = t.dataset.tsch, ids = subsAll().filter(x => x.ch === ch && x.active !== false).map(x => x.id); const has = ids.filter(id => [...F.cells].some(([k, o]) => k.split('|')[2] === id && (o.amount || o.qty)));
      if (!t.checked && has.length) { st.rmSub = has[0]; t.checked = true; drawSubs(c, plan, ed); return true; }
      setSubs(t.checked ? [...new Set(F.subs.concat(ids))] : F.subs.filter(id => !ids.includes(id))); renderTarget(c, plan); return true; }
    return false;
  }
  function onTargetClick(t) {
    const F = st.F, c = campOf(st.id), plan = planOf(st.id), ed = !ro(plan, 'target');
    const sb = t.closest('[data-tsub]'); if (sb) { const id = sb.dataset.tsub; if (F.subs.includes(id)) { const has = [...F.cells].some(([k, o]) => k.split('|')[2] === id && (o.amount || o.qty)); if (has) { st.rmSub = id; drawSubs(c, plan, ed); return true; } setSubs(F.subs.filter(x => x !== id)); } else setSubs(F.subs.concat([id])); renderTarget(c, plan); return true; }
    if (t.closest('[data-tsrmyes]')) { const id = st.rmSub; [...F.cells.keys()].forEach(k => { if (k.split('|')[2] === id) F.cells.delete(k); }); st.rmSub = null; setSubs(F.subs.filter(x => x !== id)); renderTarget(c, plan); return true; }
    if (t.closest('[data-tsrmno]')) { st.rmSub = null; drawSubs(c, plan, ed); return true; }
    const pn = t.closest('[data-tpnew]'); if (pn) { const [code, id] = pn.dataset.tpnew.split('|'), sk = F.skus.find(s => s.code === code); if (sk) { sk.prices[id] = Object.assign({}, sk.prices[id] || {}, { std: stdOf(sk, id) }); repriced(code, id); touch('target'); drawPrices(c, plan, ed); drawGrid(c, plan, ed); } return true; }
    if (t.closest('[data-tdgo]')) { const ch = (host.querySelector('[data-tdch]') || {}).value, pc = num((host.querySelector('[data-tdpct]') || {}).value); if (!ch || pc == null) return true;
      F.skus.forEach(sk => F.subs.forEach(id => { const x = subOf(id); if (!x || x.ch !== ch) return; const sd = (sk.prices[id] || {}).std != null ? sk.prices[id].std : stdOf(sk, id); if (sd == null) return; sk.prices[id] = Object.assign({}, sk.prices[id] || {}, { std: sd, camp: Math.round(sd * (1 - pc / 100)) }); repriced(sk.code, id); }));
      touch('target'); st.priceOpen = true; drawPrices(c, plan, ed); drawGrid(c, plan, ed); return true; }
    if (t.closest('[data-tdclear]')) { F.skus.forEach(sk => Object.keys(sk.prices || {}).forEach(id => { if (sk.prices[id].camp != null) { sk.prices[id].camp = null; repriced(sk.code, id); } })); touch('target'); drawPrices(c, plan, ed); drawGrid(c, plan, ed); return true; }
    const fs = t.closest('[data-fspread]'); if (fs) { spreadIt(fs.dataset.fspread); touch('target'); st.fillOpen = true; drawFiller(c, plan, ed); return true; }
    const pr = t.closest('.seg[data-fpreset] button'); if (pr) { const B = F.builder || builderOf(c); B.preset = pr.dataset.v; if (B.preset !== 'custom') B.months = presetW(B.preset, liveCamp(c), months(liveCamp(c))); F.builder = B; touch('target'); st.fillOpen = true; drawFiller(c, plan, ed); return true; }
    if (t.closest('[data-ffill]')) { const has = [...F.cells.values()].some(o => o.amount || o.qty);
      if (has && st.fillMode !== 'empty') { U.confirmDialog(SP.tb.replaceQ, SP.tb.replaceBody, SP.tb.replace, false, C.common.cancel).then(ok => { if (ok) { fillGrid(c); renderTarget(c, plan); } }); return true; }
      fillGrid(c); renderTarget(c, plan); return true; }
    const tb = t.closest('[data-ttab]'); if (tb) { st.tab = tb.dataset.ttab; drawGrid(c, plan, ed); return true; }
    const gp = t.closest('.seg[data-tgroup] button'); if (gp) { st.group = gp.dataset.v; drawGrid(c, plan, ed); return true; }
    const un = t.closest('.seg[data-tunit] button'); if (un) { st.unit = un.dataset.v; pref.set(unitKey(), st.unit); drawGrid(c, plan, ed); return true; }
    if (t.closest('[data-texp]')) { st.folded.clear(); drawGrid(c, plan, ed); return true; }
    if (t.closest('[data-tcol]')) { gridRows(c).filter(r => r.fold && r.level === 1).forEach(r => st.folded.add(r.key)); drawGrid(c, plan, ed); return true; }
    if (t.closest('[data-tundo]')) { if (st.g) st.g.undo(); return true; } if (t.closest('[data-tredo]')) { if (st.g) st.g.redo(); return true; }
    if (t.closest('[data-tsgo]')) { rowAct(c, plan, 'spread'); return true; }
    if (t.closest('[data-tcopygo]')) { rowAct(c, plan, 'copy'); return true; }
    if (t.closest('[data-tclear]')) { rowAct(c, plan, 'clear'); return true; }
    return false;
  }


  /* ===================== 3 · Expense lines (§7 — 3a Marketing · 3b Sales · 3c Other: one card each, mine first and open · prefilled from the template) ===================== */
  const targetByMonth = () => { const m = new Map(); R.planTotals(liveVer()).byMonth.forEach((o, k) => m.set(k, o.amount || 0)); return m; };
  const linesOf = g => st.F.lines.filter(L => L.type === g);
  const lineTotal = L => [...L.months.values()].reduce((a, b) => a + (+b || 0), 0);
  const usedTotal = g => linesOf(g).filter(L => L.used).reduce((a, L) => a + lineTotal(L), 0);
  function spreadLine(c, L, total) { const ms = bmonths(liveCamp(c)), w = R.phaseWeights(ms, liveCamp(c), L.phasing, targetByMonth(), L.custom), v = R.spreadWhole(Math.round(total), w); L.months = new Map(); ms.forEach((m, i) => { if (v[i]) L.months.set(m, v[i]); }); }
  /* the template of a group (R.EXP_TEMPLATE — the one place to change it) + the other known lines (0 · not used) */
  function templateOf(g) { const t = (R.EXP_TEMPLATE[g] || []).slice(), known = (CP.mock.lines() || {})[g] || []; known.forEach(l => { if (!t.some(x => x[0] === l)) t.push([l, 0, g === 'marketing' ? 'mkt' : g === 'sales' ? 'sales' : 'even']); }); return t; }
  /* §7.2 — the first time a group opens with no line: the template × the envelope (whole baht, Σ = the envelope) · the lines of 0 % = not used */
  function prefill(c, g) {
    const F = st.F, E = R.envOf(liveVer())[g], env = E.none ? 0 : E.amount || 0, t = templateOf(g), used = t.filter(x => x[1] > 0), amt = lrSplit(env, used.map(x => x[1]));
    t.forEach(([line, pct, ph]) => { const L = { type: g, line, used: pct > 0, phasing: ph, months: new Map(), keep: true }; F.lines.push(L); const i = used.findIndex(x => x[0] === line); if (i >= 0 && amt[i]) spreadLine(c, L, amt[i]); });
    st.prefilled = st.prefilled || new Set(); st.prefilled.add(g); touch(GSTEP[g]);
  }
  function renderExpenses(c, plan) {
    const a = me(), F = st.F, mine = GROUPS.filter(g => { const s = R.stepState(plan, GSTEP[g], U.today()); return a && (s.assignee === a.name); }), order = mine.concat(GROUPS.filter(g => !mine.includes(g)));
    GROUPS.forEach(g => { if (!linesOf(g).length && canStep(plan, GSTEP[g]).ok && R.stepState(plan, GSTEP[g], U.today()).status !== 'done' && !(F.brief.envelope[g] || {}).none) prefill(c, g); });
    if (!st.expOpen.size) (mine.length ? mine : [order[0]]).forEach(g => st.expOpen.add(g));
    $('cp_body').innerHTML = order.map(g => `<div class="card excard" id="ex_${g}" data-exg="${g}"></div>`).join('');
    order.forEach(g => drawGroup(c, plan, g));
  }
  function drawGroup(c, plan, g) {
    const F = st.F, X = W.exp, box = $('ex_' + g); if (!box) return; const k = GSTEP[g], s = R.stepState(plan, k, U.today()), w = canStep(plan, k), ed = w.ok, dis = ed ? '' : ' disabled';
    const v = liveVer(), E = R.envOf(v)[g], T = R.planTotals(v), env = E.none ? 0 : E.amount, alloc = usedTotal(g), left = env - alloc, over = alloc - env, open = st.expOpen.has(g), ms = bmonths(liveCamp(c));
    const pctE = L => (env > 0 ? lineTotal(L) / env * 100 : null), bar = env > 0 ? Math.min(100, alloc / env * 100) : alloc > 0 ? 100 : 0;
    const head = `<div class="exh"><div class="exh-t"><b>${esc(`${R.STEP_NUM[k]} ${SP.names[k]}`)}</b> <span class="muted small">${esc(`${s.assignee || '—'}${s.due ? ' · ' + SP.due(R.dmy(s.due)) : ''} · ${SP.state[s.status]}`)}</span>${s.env ? ` <span class="chip warn">${esc(SP.envChanged)}</span>` : ''}${s.none ? ` <span class="chip">${esc(X.none)}</span>` : ''}</div>` +
      `<div class="exh-n"><span>${esc(X.head(R.baht(env), E.pct == null ? '—' : R.pct(E.pct / 100, 1), E.src === 'target' ? X.ofTarget : X.ofEst, R.baht(alloc), R.baht(Math.max(0, left))))}</span><span class="envbar" aria-hidden="true"><i class="ok" style="width:${bar.toFixed(1)}%"></i>${over > R.ENV_TOL && env > 0 ? `<i class="ov" style="width:${Math.min(100, over / env * 100).toFixed(1)}%"></i>` : ''}</span>` +
      `${env > 0 && Math.abs(over) > R.ENV_TOL ? `<span class="chip warn" data-exwarn="${g}">${esc(over > 0 ? W.ck.envOver(R.baht(over)) : W.ck.envUnder(R.baht(-over)))}</span>` : ''}</div>` +
      `<div class="exh-b">${ed && s.status !== 'done' ? `<button type="button" class="btn small" data-enone="${k}">${esc(X.noneBtn)}</button><button type="button" class="btn small primary" data-cpdone="${k}">${esc(SP.markDone)}</button>` : ''}${!ed && w.reopen ? `<button type="button" class="btn small" data-reopen="${k}">${esc(W.reopen)}</button>` : ''}` +
      `<button type="button" class="icon-btn" data-extog="${g}" aria-expanded="${open}" aria-label="${esc(SP.names[k])}">${ICON.chevronDown}</button></div></div>`;
    if (!open) { box.innerHTML = head; box.classList.add('shut'); return; } box.classList.remove('shut');
    const lines = linesOf(g), pfSug = g === 'sales' && (T.byChannel.ECOM || {}).amount ? Math.round(T.byChannel.ECOM.amount * ((window.CP_MOCK_SCENARIO || {}).platformFeeRate || 0.12)) : null;
    const PH = ['even', 'mkt', 'sales', 'before', 'first', 'one', 'custom'];
    const row = (L, i) => { const tot = L.used ? lineTotal(L) : 0, mo = st.monthsOpen.has(`${g}|${i}`), pe = pctE(L);
      const sug = L.line === 'Platform Fee' && pfSug != null ? `<div class="muted small exsug">${esc(X.pfSug(R.pct(((window.CP_MOCK_SCENARIO || {}).platformFeeRate || 0.12), 0), R.baht(T.byChannel.ECOM.amount)))} <b>${esc(R.baht(pfSug))}</b>${ed ? ` <button type="button" class="link small" data-epf="${i}">${esc(X.use)}</button>` : ''}</div>` : '';
      return `<tr class="exl${L.used ? '' : ' dim'}" data-exl="${i}"><td><label class="chk"><input type="checkbox" data-eu="${g}|${i}"${L.used ? ' checked' : ''}${dis}><span></span></label></td><td>${esc(L.line)}${sug}</td>` +
        `<td class="num"><input class="inp sm num wide" data-ea="${g}|${i}" inputmode="decimal" value="${esc(L.used ? fmtB(tot) : '0')}"${dis || (L.used ? '' : ' disabled')}></td><td class="num"><input class="inp sm num" data-ep="${g}|${i}" inputmode="decimal" value="${esc(L.used && pe != null ? pct1(pe) : '')}"${dis || (L.used && env > 0 ? '' : ' disabled')}></td>` +
        `<td><select class="inp sm" data-eph="${g}|${i}"${dis || (L.used ? '' : ' disabled')}>${PH.map(p => `<option value="${p}"${L.phasing === p ? ' selected' : ''}>${esc(X.ph[p])}</option>`).join('')}</select>${L.phasing === 'one' ? `<select class="inp sm" data-eone="${g}|${i}"${dis}>${ms.map(m => `<option value="${m}"${(L.custom && L.custom[m]) ? ' selected' : ''}>${esc(R.monthShort(m))} ${m.slice(0, 4)}</option>`).join('')}</select>` : ''}</td>` +
        `<td><button type="button" class="link small" data-emo="${g}|${i}" aria-expanded="${mo}">${mo ? '▾' : '▸'}</button></td></tr>` +
        (mo ? `<tr class="exm"><td></td><td colspan="5"><div class="exms">${ms.map(m => `<label class="tb-pin"><span>${esc(R.monthShort(m))}</span><input class="inp sm num" data-em="${g}|${i}|${m}" inputmode="decimal" value="${esc(L.used && L.months.get(m) ? fmtB(L.months.get(m)) : '')}"${dis || (L.used ? '' : ' disabled')}></label>`).join('')}</div></td></tr>` : ''); };
    const pre = st.prefilled && st.prefilled.has(g) ? `<div class="nsband"><span class="nsb-t">${esc(X.prefilled)}</span></div>` : '';
    const envCh = s.env ? `<div class="nsband warnb"><span class="nsb-t">${esc(X.envChanged(R.baht(env)))}</span>${ed ? ` <button type="button" class="btn small" data-escale="${g}">${esc(X.rescale)}</button>` : ''}</div>` : '';
    const known = templateOf(g).map(x => x[0]).filter(l => !lines.some(L => L.line === l));
    const all = st.gridAll[g];
    const gbar = all && ed ? `<div class="gridbar exgbar">${[['fillRight', P.grid.fillRight], ['spreadTotal', P.grid.spread], ['clearRow', P.grid.clearRow], ['undo', P.grid.undo], ['redo', P.grid.redo]].map(([k, l]) => `<button type="button" class="btn small${k === 'undo' || k === 'redo' ? ' ghost' : ''}" data-gxtool="${k}" data-g="${g}">${esc(l)}</button>`).join('')}</div>` : '';
    box.innerHTML = head + pre + envCh + (all ? `${gbar}<div class="exgrid" id="exg_${g}"></div>` : `<div class="tablewrap"><table class="tbl simple extbl"><thead><tr><th>${esc(X.used)}</th><th>${esc(X.line)}</th><th class="num">฿</th><th class="num">${esc(X.pctEnv)}</th><th>${esc(X.phasing)}</th><th></th></tr></thead><tbody>` +
      lines.map(L => row(L, F.lines.indexOf(L))).join('') + `<tr class="total"><td></td><td>${esc(C.common.total)}</td><td class="num">${esc(R.baht(alloc))}</td><td class="num">${env > 0 ? esc(pct1(alloc / env * 100)) : ''}</td><td colspan="2"></td></tr></tbody></table></div>`) +
      `<div class="exf">${ed ? `<span class="exadd"><input class="inp sm" data-eaddname="${g}" list="exl_${g}" placeholder="${esc(X.otherPh)}"><datalist id="exl_${g}">${known.map(l => `<option value="${esc(l)}">`).join('')}</datalist><button type="button" class="btn small" data-eadd="${g}">${esc(X.other)}</button></span>` +
        `<button type="button" class="btn small" data-erest="${g}"${left > R.ENV_TOL ? '' : ' disabled'}>${esc(X.rest)}</button><select class="inp sm" data-ecopy="${g}" aria-label="${esc(X.copyFrom)}"><option value="">${esc(X.copyFrom)}</option>${allCamps().filter(x => x.id !== c.id && x.approval === 'approved').sort((p, q) => q.start.localeCompare(p.start)).map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select>` : ''}<button type="button" class="link small" data-eall="${g}">${esc(all ? X.lessMonths : X.allMonths)}</button></div>`;
    if (all) { const usedLines = lines.filter(L => L.used); st.gx[g] = U.grid($('exg_' + g), { id: 'gx' + g, rows: usedLines.map(L => ({ key: String(F.lines.indexOf(L)), label: L.line, level: 0, leaf: true })), cols: monthCols(ms), corner: X.line, aria: SP.names[k], readOnly: !ed,
      get: (rk, m) => { const v2 = F.lines[+rk].months.get(m); return v2 == null || v2 === 0 ? null : v2; }, canEdit: () => ed,
      onChange: ch => { ch.forEach(x => { const L = F.lines[+x.r]; if (x.v == null || x.v === 0) L.months.delete(x.c); else L.months.set(x.c, Math.round(x.v)); L.phasing = 'custom'; }); touch(k); } }); }
  }
  /* §7.2 — Copy from a campaign (an approved plan): its lines of the group, scaled to this envelope (whole baht · Σ = the envelope) · the phasing of the template */
  function copyLines(c, g, xid) {
    const F = st.F, p = planOf(xid), v = p && R.approvedVersion(p); if (!v) return 0;
    const by = new Map(); (v.budget || []).forEach(r => { if (r.type === g && r.used !== false && +r.amount) by.set(r.line, (by.get(r.line) || 0) + +r.amount); });
    const lines = [...by].sort((a, b) => b[1] - a[1]); if (!lines.length) return 0;
    const E = R.envOf(liveVer())[g], env = E.none ? 0 : E.amount || 0, amt = env > 0 ? lrSplit(env, lines.map(x => x[1])) : lines.map(x => Math.round(x[1]));
    F.lines = F.lines.filter(L => L.type !== g);
    lines.forEach(([line], i) => { const L = { type: g, line, used: true, phasing: defPhase(g, line), months: new Map(), keep: true }; F.lines.push(L); if (amt[i]) spreadLine(c, L, amt[i]); });
    templateOf(g).forEach(([line]) => { if (!by.has(line)) F.lines.push({ type: g, line, used: false, phasing: defPhase(g, line), months: new Map(), keep: true }); });
    if (st.prefilled) st.prefilled.delete(g); touch(GSTEP[g]); return lines.length;
  }
  function onExpenses(e) {
    const t = e.target, F = st.F, c = campOf(st.id), plan = planOf(st.id);
    if (t.matches('[data-ecopy]')) { if (e.type === 'change' && t.value) { const g = t.dataset.ecopy, x = campOf(t.value), n = copyLines(c, g, t.value); if (n) U.toast(W.exp.copied(x ? x.name : t.value, n)); drawGroup(c, plan, g); } return true; }
    const key = t.dataset.eu || t.dataset.ea || t.dataset.ep || t.dataset.eph || t.dataset.em || t.dataset.eone; if (!key) return t.matches('[data-eaddname]');
    const [g, i, m] = key.split('|'), L = F.lines[+i], k = GSTEP[g]; if (!L) return true; const env = (E => (E.none ? 0 : E.amount))(R.envOf(liveVer())[g]);
    if (t.dataset.eu) { L.used = t.checked; touch(k); drawGroup(c, plan, g); return true; }
    if (t.dataset.ea) { const v = num(t.value); spreadLine(c, L, v == null ? 0 : Math.max(0, v)); touch(k); if (e.type === 'change') drawGroup(c, plan, g); else liveGroup(g, L, t); return true; }
    if (t.dataset.ep) { const v = num(t.value); if (env > 0) spreadLine(c, L, v == null ? 0 : env * Math.max(0, v) / 100); touch(k); if (e.type === 'change') drawGroup(c, plan, g); else liveGroup(g, L, t); return true; }
    if (t.dataset.eph) { L.phasing = t.value; if (L.phasing === 'one' && !L.custom) L.custom = { [R.ym(liveCamp(c).start)]: 1 }; spreadLine(c, L, lineTotal(L)); touch(k); drawGroup(c, plan, g); return true; }
    if (t.dataset.eone) { L.custom = { [t.value]: 1 }; spreadLine(c, L, lineTotal(L)); touch(k); drawGroup(c, plan, g); return true; }
    if (t.dataset.em) { const v = num(t.value); if (v == null || !v) L.months.delete(m); else L.months.set(m, Math.round(v)); L.phasing = 'custom'; touch(k); if (e.type === 'change') drawGroup(c, plan, g); return true; }
    return true;
  }
  /* a line typed: the other field · the total · the head — without drawing the card again (the focus stays) */
  function liveGroup(g, L, t) { const box = $('ex_' + g); if (!box) return; const i = st.F.lines.indexOf(L), E = R.envOf(liveVer())[g], env = E.none ? 0 : E.amount, tot = lineTotal(L);
    if (t.dataset.ea) { const x = box.querySelector(`[data-ep="${g}|${i}"]`); if (x && env > 0) x.value = pct1(tot / env * 100); } if (t.dataset.ep) { const x = box.querySelector(`[data-ea="${g}|${i}"]`); if (x) x.value = fmtB(tot); }
    const tr = box.querySelector('tr.total'); if (tr) { const alloc = usedTotal(g); tr.children[2].textContent = R.baht(alloc); tr.children[3].textContent = env > 0 ? pct1(alloc / env * 100) : ''; } }
  function onExpensesClick(t) {
    const F = st.F, c = campOf(st.id), plan = planOf(st.id);
    const gx = t.closest('[data-gxtool]'); if (gx) { const G = st.gx[gx.dataset.g]; if (G && G[gx.dataset.gxtool]) { G[gx.dataset.gxtool](); if (G.focus) G.focus(); } return true; }
    const tg = t.closest('[data-extog]'); if (tg) { const g = tg.dataset.extog; if (st.expOpen.has(g)) st.expOpen.delete(g); else st.expOpen.add(g); drawGroup(c, plan, g); return true; }
    const mo = t.closest('[data-emo]'); if (mo) { const k = mo.dataset.emo; if (st.monthsOpen.has(k)) st.monthsOpen.delete(k); else st.monthsOpen.add(k); drawGroup(c, plan, k.split('|')[0]); return true; }
    const al = t.closest('[data-eall]'); if (al) { const g = al.dataset.eall; st.gridAll[g] = !st.gridAll[g]; drawGroup(c, plan, g); return true; }
    const ad = t.closest('[data-eadd]'); if (ad) { const g = ad.dataset.eadd, inp = host.querySelector(`[data-eaddname="${g}"]`), nm = inp ? inp.value.trim() : ''; if (!nm) return true;
      if (!F.lines.some(L => L.type === g && L.line === nm)) { F.lines.push({ type: g, line: nm, used: true, phasing: defPhase(g, nm), months: new Map(), keep: true }); touch(GSTEP[g]); } drawGroup(c, plan, g); return true; }
    const rs = t.closest('[data-erest]'); if (rs) { const g = rs.dataset.erest, E = R.envOf(liveVer())[g], env = E.none ? 0 : E.amount, left = Math.round(env - usedTotal(g)), use = linesOf(g).filter(L => L.used && lineTotal(L) > 0); if (left <= 0 || !use.length) { U.toast(SP.env.noRest); return true; }
      const add = lrSplit(left, use.map(lineTotal)); use.forEach((L, i) => spreadLine(c, L, lineTotal(L) + add[i])); touch(GSTEP[g]); drawGroup(c, plan, g); return true; }
    const sc = t.closest('[data-escale]'); if (sc) { const g = sc.dataset.escale, E = R.envOf(liveVer())[g], env = E.none ? 0 : E.amount, use = linesOf(g).filter(L => L.used && lineTotal(L) > 0), alloc = usedTotal(g); if (!(alloc > 0)) return true;
      const nw = lrSplit(env, use.map(lineTotal)); use.forEach((L, i) => spreadLine(c, L, nw[i])); touch(GSTEP[g]); drawGroup(c, plan, g); return true; }
    const pf = t.closest('[data-epf]'); if (pf) { const L = F.lines[+pf.dataset.epf], T = R.planTotals(liveVer()); if (L && T.byChannel.ECOM) { L.used = true; spreadLine(c, L, Math.round(T.byChannel.ECOM.amount * ((window.CP_MOCK_SCENARIO || {}).platformFeeRate || 0.12))); touch('exp_sls'); drawGroup(c, plan, 'sales'); } return true; }
    const nn = t.closest('[data-enone]'); if (nn) { markDone(nn.dataset.enone, true); return true; }
    return false;
  }


  /* ===================== 4 · Summary & submit (§8 — the checklist · one P&L · the summaries · Finance review · the note · who did what · PDF · Submit) ===================== */
  /* §8.2 — a row a step: its state · its result (✕ blocks · ⚠ does not) · Go to step › / Edit this step › — counted live */
  function checklist(plan, c, o = {}) {
    const lp = o.live && st.F ? livePlan(plan) : plan, lc = o.live && st.F ? liveCamp(c) : c, X = W.sum, rows = [];
    ['brief', 'target', 'exp_mkt', 'exp_sls', 'exp_oth', 'fin'].forEach(k => {
      const s = R.stepState(lp, k, U.today()), ck = R.stepChecks(lp, k, lc, { today: U.today() }), errs = ck.list.filter(x => !x.ok && !(k === 'fin' && x.key === 'before5' && !s.open)).map(x => x.text), warns = ck.warns.map(x => x.text);
      if (s.status !== 'done') errs.unshift(s.open ? X.notDone : X.waiting(s.waitFor.map(x => R.STEP_NUM[x]).join(' · ')));
      if (k === 'fin' && s.refresh) errs.unshift(W.recheck);
      const state = s.status === 'done' ? `✓ ${s.by || s.assignee || '—'} · ${s.done_at ? R.dmy(String(s.done_at).slice(0, 10)) : '—'}` : s.status === 'returned' ? `↩ ${SP.state.returned} · ${s.assignee || '—'}` : s.status === 'in_progress' ? `● ${SP.state.in_progress} · ${s.assignee || '—'}` : `○ ${s.open ? SP.state.not_started : X.waitShort} · ${s.assignee || '—'}`;
      const w = canStep(lp, k); rows.push({ k, s, state, errs, warns, reopen: !!w.reopen, go: R.STEP_PAGE[k] }); });
    /* the checks of the whole plan that no step shows (the months · a negative number) — under Finance review */
    /* CR-14.1 D148 — the checks of the whole plan that no step shows (months outside · a negative number) = their own row "Whole plan" */
    if (o.withPlan !== false) { const pc = R.planChecks(R.working(lp), lc), errs = pc.errs.filter(x => !x.ok && (x.key === 'months' || x.key === 'negative')).map(x => x.text + (x.detail ? ` — ${x.detail}` : ''));
      rows.push({ k: 'plan', s: null, state: errs.length ? '✕' : '✓', errs, warns: [], reopen: false, go: 'summary' }); }
    return { rows, errN: rows.filter(r => r.errs.length).length, warnN: rows.reduce((t, r) => t + r.warns.length, 0) };
  }
  const stepLabel = k => (k === 'plan' ? W.sum.planRow : `${R.STEP_NUM[k]} ${SP.names[k]}`);
  function checklistHTML(cl, o = {}) {
    const X = W.sum;
    return `<div class="tablewrap"><table class="tbl simple cltbl" data-cltbl><thead><tr><th>${esc(X.cols.step)}</th><th>${esc(X.cols.state)}</th><th>${esc(X.cols.result)}</th>${o.links === false ? '' : '<th></th>'}</tr></thead><tbody>` +
      cl.rows.map(r => `<tr data-clk="${r.k}" class="${r.errs.length ? 'err' : r.warns.length ? 'warn' : 'ok'}"><td><b>${esc(stepLabel(r.k))}</b></td><td>${esc(r.state)}</td>` +
        `<td>${r.errs.map(x => `<div class="neg small">✕ ${esc(x)}</div>`).join('')}${r.warns.map(x => `<div class="warnx small">⚠ ${esc(x)}</div>`).join('')}${!r.errs.length && !r.warns.length ? '<span class="muted">—</span>' : ''}</td>` +
        (o.links === false ? '' : r.k === 'plan' ? '<td></td>' : `<td>${r.s.status === 'done' && r.reopen ? `<button type="button" class="link small" data-reopen="${r.k}">${esc(X.editStep)}</button>` : `<a class="link small" href="#planning/${esc(st.id)}/plan/${r.go}" data-cppage="${r.go}">${esc(X.goStep)}</a>`}</td>`) + '</tr>').join('') + '</tbody></table></div>';
  }
  /* §8.4 — the summaries: by channel ▸ sub-channel · by SKU · by month (the chart of CR-13) — no GP % · each total = the P&L */
  function sumHTML(ver, c, key, o = {}) {
    const X = W.sum, T = R.planTotals(ver), sm = R.skuMap(ver), pc = v => R.pct(v, 1), B = v => R.baht(v);
    const chs = R.CHANNELS.filter(k => T.byChannel[k]), subsBy = ch => [...T.bySub].filter(([k]) => k.startsWith(ch + '|')).map(([k, x]) => ({ id: k.split('|')[1], x })).sort((a, b) => b.x.amount - a.x.amount);
    const byC = `<div class="tablewrap"><table class="tbl simple sumtbl" data-sumch><thead><tr><th>${esc(X.chSub)}</th><th class="num">${esc(X.target)}</th><th class="num">${esc(X.share)}</th><th class="num">${esc(X.pieces)}</th><th class="num">COGS</th><th class="num">${esc(X.gp)}</th></tr></thead><tbody>` +
      chs.map(k => { const x = T.byChannel[k]; return `<tr class="grp"><td><b>${esc(C.channel[k])}</b> <span class="muted small">${esc(C.channelLong[k])}</span></td><td class="num" data-v="${x.amount}">${esc(B(x.amount))}</td><td class="num">${esc(pc(R.ratio(x.amount, T.target)))}</td><td class="num">${esc(R.fmtNum(Math.round(x.qty)))}</td><td class="num">${esc(B(x.cogs))}</td><td class="num">${esc(B(x.amount - x.cogs))}</td></tr>` +
        subsBy(k).map(({ id, x: y }) => `<tr class="sub"><td>┗ ${esc(id ? R.subName(id) : W.tgt.unspecified)}</td><td class="num">${esc(B(y.amount))}</td><td class="num">${esc(pc(R.ratio(y.amount, T.target)))}</td><td class="num">${esc(R.fmtNum(Math.round(y.qty)))}</td><td class="num">${esc(B(y.cogs))}</td><td class="num">${esc(B(y.amount - y.cogs))}</td></tr>`).join(''); }).join('') +
      `<tr class="total"><td>${esc(C.common.total)}</td><td class="num" data-v="${T.target}">${esc(B(T.target))}</td><td class="num">100.0%</td><td class="num">${esc(R.fmtNum(Math.round(T.qty)))}</td><td class="num">${esc(B(T.cogs))}</td><td class="num">${esc(B(T.gp))}</td></tr></tbody></table></div>`;
    const skus = [...T.bySku].map(([code, x]) => ({ code, s: sm.get(code) || {}, x })).sort((a, b) => b.x.amount - a.x.amount);
    const byS = `<div class="tablewrap"><table class="tbl simple sumtbl" data-sumsku><thead><tr><th>SKU</th><th>${esc(SP.p.role)}</th><th class="num">${esc(X.pieces)}</th><th class="num">${esc(X.target)}</th><th class="num">${esc(X.share)}</th><th class="num">COGS</th><th class="num">${esc(X.gp)}</th></tr></thead><tbody>` +
      skus.map(r => `<tr><td>${esc(r.s.nickname || r.s.name || r.code)} <span class="muted small">${esc(r.code)}</span>${r.s.temp || /^TMP-/i.test(r.code) ? ` <span class="chip warn">${esc(W.brief.b.tempTag)}</span>` : ''}</td><td>${esc(SP.p.roles[r.s.role || 'core'])}</td><td class="num">${esc(R.fmtNum(Math.round(r.x.qty)))}</td><td class="num" data-v="${r.x.amount}">${esc(B(r.x.amount))}</td><td class="num">${esc(pc(R.ratio(r.x.amount, T.target)))}</td><td class="num">${esc(B(r.x.cogs))}</td><td class="num">${esc(B(r.x.amount - r.x.cogs))}</td></tr>`).join('') +
      `<tr class="total"><td>${esc(C.common.total)}</td><td></td><td class="num">${esc(R.fmtNum(Math.round(T.qty)))}</td><td class="num" data-v="${T.target}">${esc(B(T.target))}</td><td class="num">100.0%</td><td class="num">${esc(B(T.cogs))}</td><td class="num">${esc(B(T.gp))}</td></tr></tbody></table></div>`;
    const ms = R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end).filter(m => T.byMonth.has(m) || m >= R.ym(c.start));
    const byM = `<div class="tablewrap"><table class="tbl simple sumtbl" data-summon><thead><tr><th>${esc(X.month)}</th><th class="num">${esc(X.target)}</th><th class="num">${esc(P.grid.groups.marketing)}</th><th class="num">${esc(P.grid.groups.sales)}</th><th class="num">${esc(P.grid.groups.other)}</th><th class="num">${esc(SP.sum.profit)}</th></tr></thead><tbody>` +
      ms.map(m => { const x = T.byMonth.get(m) || { amount: 0, cogs: 0, mkt: 0, sls: 0, oth: 0 }; return `<tr><td>${esc(R.monthName(m))}</td><td class="num">${esc(B(x.amount || 0))}</td><td class="num">${esc(B(x.mkt || 0))}</td><td class="num">${esc(B(x.sls || 0))}</td><td class="num">${esc(B(x.oth || 0))}</td><td class="num">${esc(B((x.amount || 0) - (x.cogs || 0) - (x.mkt || 0) - (x.sls || 0) - (x.oth || 0)))}</td></tr>`; }).join('') + '</tbody></table></div>';
    const leg = `<div class="legend"><span><i class="bar" style="--sw:var(--rev)"></i>${esc(X.target)}</span><span><i class="bar" style="--sw:var(--mkt)"></i>${esc(P.grid.groups.marketing)}</span><span><i class="bar" style="--sw:var(--sls)"></i>${esc(P.grid.groups.sales)}</span><span><i class="bar" style="--sw:var(--oth)"></i>${esc(P.grid.groups.other)}</span><span><i class="ln" style="--sw:var(--text)"></i>${esc(SP.sum.run)}</span></div>`;
    const chart = o.noChart ? byM : `<div class="sumh"><b>${esc(SP.sum.byMonth)}</b>${leg}</div><div class="chartbox" id="sm_${key}_box"><svg id="sm_${key}_svg" role="img" aria-label="${esc(SP.sum.byMonth)}"></svg><div class="tip" id="sm_${key}_tip"></div></div>`;
    return `<div class="sumset" data-sumset="${key}"><div class="sumh"><b>${esc(X.byCh)}</b></div>${byC}<div class="sumh"><b>${esc(X.bySku)}</b></div>${byS}${chart}</div>`;
  }
  function drawSummary(ver, c, key) {
    const svg = $(`sm_${key}_svg`), box = $(`sm_${key}_box`), tip = $(`sm_${key}_tip`); if (!svg || !box) return;
    const T = R.planTotals(ver), ms = R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end).filter(m => T.byMonth.has(m) || (m >= R.ym(c.start)));
    const rows = ms.map(m => { const o = T.byMonth.get(m) || { amount: 0, cogs: 0, mkt: 0, sls: 0, oth: 0 }; return { m, t: o.amount || 0, mkt: o.mkt || 0, sls: o.sls || 0, oth: o.oth || 0, p: (o.amount || 0) - (o.cogs || 0) - (o.mkt || 0) - (o.sls || 0) - (o.oth || 0) }; });
    let run = 0; rows.forEach(r => { run += r.p; r.run = run; });
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim(), Wd = Math.max(300, Math.round(box.clientWidth || 700)), H = 260, m = { l: 64, r: 10, t: 22, b: 40 }, ih = H - m.t - m.b;
    const vals = rows.flatMap(r => [r.t, r.mkt + r.sls + r.oth, r.run]).concat([0]), hi = Math.max(...vals), lo = Math.min(...vals), stp = R.niceStep((hi - lo) / 4 || 1);
    const yMax = hi > 0 ? stp * Math.ceil(hi * 1.05 / stp) : 0, yMin = lo < 0 ? -stp * Math.ceil(-lo * 1.05 / stp) : 0, yt = []; for (let v = yMin; v <= yMax + 1e-6; v += stp) yt.push(v);
    const axf = v => U.trimMoney(R.compact(Math.abs(v) < 1e-6 ? 0 : v)); m.l = U.axisLeft(svg, yt.map(axf));
    const iw = Wd - m.l - m.r, band = iw / Math.max(1, rows.length), bw = Math.max(4, Math.min(26, band * 0.34)), cx = i => m.l + band * i + band / 2, y = v => m.t + (yMax - v) / (yMax - yMin || 1) * ih;
    let g = ''; yt.forEach(v => { g += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${css('--grid')}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${esc(axf(v))}</text>`; });
    const rect = (x, a, b2, col) => { const t2 = Math.min(y(a), y(b2)), h = Math.abs(y(a) - y(b2)); return h > 0.2 ? `<rect x="${x.toFixed(1)}" y="${t2.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>` : ''; };
    rows.forEach((r, i) => { const x0 = cx(i) - bw - 1; g += rect(x0, 0, r.t, css('--rev')); let acc = 0; [['mkt', '--mkt'], ['sls', '--sls'], ['oth', '--oth']].forEach(([k, col]) => { g += rect(cx(i) + 1, acc, acc + r[k], css(col)); acc += r[k]; });
      if (!i || r.m.slice(5) === '01' || !(i % Math.max(1, Math.ceil(34 / band)))) g += `<text x="${cx(i)}" y="${m.t + ih + 16}" text-anchor="middle" class="mon">${esc(R.monthShort(r.m))}</text>`;
      if (!i || r.m.slice(5) === '01') g += `<text x="${cx(i)}" y="${m.t + ih + 31}" text-anchor="middle" class="yr">${r.m.slice(0, 4)}</text>`; });
    g += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${css('--border-strong')}"/>`;
    g += `<path d="${rows.map((r, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(r.run).toFixed(1)}`).join(' ')}" fill="none" stroke="${css('--text')}" stroke-width="2.2" data-sumrun="${run}"/>`;
    if (c.end_marketing) { const i = rows.findIndex(r => r.m === R.ym(c.end_marketing)); if (i >= 0) { const d = +c.end_marketing.slice(8, 10), nd = +R.monthLast(rows[i].m).slice(8, 10), vx = m.l + band * i + band * (d / nd);
      g += `<line x1="${vx.toFixed(1)}" x2="${vx.toFixed(1)}" y1="${m.t - 10}" y2="${m.t + ih}" stroke="${css('--text')}" stroke-dasharray="2 3"/><text x="${(vx + 4).toFixed(1)}" y="${m.t - 12}" class="today-l vl">${esc(C.mon.burn2.endMkt)}</text>`; } }
    const hits = rows.map((r, i) => `<rect class="hit" data-i="${i}" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent"/>`).join('');
    svg.setAttribute('viewBox', `0 0 ${Wd} ${H}`); svg.setAttribute('width', Wd); svg.setAttribute('height', H); svg.innerHTML = `<g>${hits}</g><g style="pointer-events:none">${g}</g>`;
    const S = SP.sum;
    svg.querySelectorAll('.hit').forEach(h => { const r = rows[+h.dataset.i]; const show = () => { tip.innerHTML = `<div class="h">${esc(R.monthName(r.m))}</div>` + [[S.target, r.t], [P.grid.groups.marketing, r.mkt], [P.grid.groups.sales, r.sls], [P.grid.groups.other, r.oth], [S.profit, r.p], [S.run, r.run]].map(([l, v]) => `<div class="r"><span>${esc(l)}</span><b>${esc(R.baht(v))}</b></div>`).join('');
      const bx = box.getBoundingClientRect(), sc = bx.width / Wd; let left = cx(+h.dataset.i) * sc + 12; if (left + 220 > bx.width) left = cx(+h.dataset.i) * sc - 232; tip.style.left = Math.max(0, left) + 'px'; tip.style.top = (m.t + 4) + 'px'; tip.classList.add('show'); };
      h.addEventListener('pointerenter', show); h.addEventListener('pointerleave', () => tip.classList.remove('show')); });
  }
  /* the expenses: a group = envelope · allocated · difference + the lines in use (largest first) */
  function expHTML(ver) {
    const X = W.sum, T = R.planTotals(ver), E = R.envOf(ver);
    return `<div class="exsum">${GROUPS.map(g => { const e = E[g], env = e.none ? 0 : e.amount, lines = [...T.byLine].filter(([k]) => k.startsWith(g + '|')).map(([k, o]) => [k.split('|')[1], o.amount]).sort((a, b) => b[1] - a[1]), al = lines.reduce((t, x) => t + x[1], 0);
      return `<div class="exsg"><div class="exsh"><b>${esc(P.grid.groups[g])}</b> <span class="muted small" data-exs="${g}">${esc(X.envVs(R.baht(env), R.baht(al), R.signedShort(al - env)))}</span>${e.none ? ` <span class="chip">${esc(W.exp.none)}</span>` : ''}</div>` +
        (lines.length ? `<table class="tbl simple exstbl"><tbody>${lines.map(([l, a]) => `<tr><td>${esc(l)}</td><td class="num">${esc(R.baht(a))}</td></tr>`).join('')}</tbody></table>` : '') + '</div>'; }).join('')}</div>`;
  }
  /* who did what (§8.1 — and the sign-off of the PDF) */
  function whoRows(plan) { return R.STEP_KEYS.map(k => { const s = R.stepState(plan, k, U.today()); return { k, who: s.status === 'done' ? s.by || s.assignee : s.assignee, done: s.status === 'done' ? s.done_at : null, dept: R.STEP_DEPT[k] }; }); }
  function renderSummary(c, plan) {
    const F = st.F, X = W.sum, lv = liveVer(), lp = livePlan(plan), cl = checklist(plan, c, { live: true }), finEd = canStep(plan, 'fin').ok || (R.stepState(plan, 'fin', U.today()).status === 'done' && false), subEd = canStep(plan, 'submit').ok;
    const fs = R.stepState(plan, 'fin', U.today()), fe = R.canDoStep(me(), plan, 'fin'), finCan = fe.ok, subS = R.stepState(plan, 'submit', U.today());
    const head = `<div class="smhead"><div>${U.apChip(plan.approval)} ${cl.errN ? `<span class="neg small" data-left>${esc(X.left(cl.errN))}</span>` : `<span class="okx small">${esc(X.ready)}</span>`}${cl.warnN ? ` <span class="warnx small">⚠ ${cl.warnN}</span>` : ''}</div>` +
      `<div class="smbtn"><button type="button" class="btn" data-xlsx>${ICON.download}<span>${esc(W.xl.btn)}</span></button><button type="button" class="btn" data-pdf>${ICON.download}<span>${esc(W.pdf.btn)}</span></button>${subEd ? `<button type="button" class="btn primary" data-cpact="submit"${cl.errN ? ` disabled title="${esc(X.left(cl.errN))}"` : ''}>${esc(P.btn.submit)}</button>` : ''}</div></div>`;
    const fin = `<div class="card smfin"><div class="card-head"><h3>${esc(X.finT)}</h3><div class="ctl">${fs.refresh ? `<span class="chip warn">${esc(W.recheck)}</span>` : fs.status === 'done' ? `<span class="okx small">✓ ${esc(`${fs.by || fs.assignee || '—'} · ${fs.done_at ? R.dmy(String(fs.done_at).slice(0, 10)) : ''}`)}</span>` : ''}</div></div>` +
      `<div class="field"><label for="sm_fc">${esc(X.finL)} <span class="req">*</span></label><textarea id="sm_fc" class="inp" rows="3" maxlength="800" data-fcmt${finCan ? '' : ' disabled'}>${esc(F.forecast.comment || '')}</textarea></div>` +
      (finCan ? `<div class="ov-btns"><button type="button" class="btn primary" data-cpdone="fin">${esc(fs.refresh || fs.status === 'done' ? W.confirmAgain : W.confirm)}</button></div>` : !fe.ok && fe.reopen ? `<div class="ov-btns"><button type="button" class="btn" data-reopen="fin">${esc(W.reopen)}</button></div>` : fs.open ? '' : `<div class="muted small">${esc(X.finWait)}</div>`) +
      `<div class="field"><label for="sm_note">${esc(X.noteL)}</label><textarea id="sm_note" class="inp" rows="2" maxlength="600" data-rcmt${subEd ? '' : ' disabled'}>${esc(F.review.comment || '')}</textarea></div>` +
      (subEd && F.dirty ? `<div class="ov-btns"><button type="button" class="btn" data-cpact="save">${esc(P.btn.save)}</button></div>` : '') + '</div>';
    const who = whoRows(lp).filter(r => r.k !== 'submit' || subS.status === 'done');
    const whoT = `<div class="card"><div class="card-head"><h3>${esc(X.whoT)}</h3></div><div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(X.cols.step)}</th><th>${esc(X.who)}</th><th>${esc(X.doneAt)}</th></tr></thead><tbody>` +
      who.map(r => `<tr><td>${esc(`${R.STEP_NUM[r.k]} ${SP.names[r.k]}`)}</td><td>${esc(r.who || '—')}</td><td>${esc(r.done ? R.dmy(String(r.done).slice(0, 10)) : '—')}</td></tr>`).join('') + '</tbody></table></div></div>';
    $('cp_body').innerHTML = head + `<div class="card"><div class="card-head"><h3>${esc(X.readyT)}</h3></div>${checklistHTML(cl)}</div>` +
      `<div class="card"><div class="card-head"><h3>P&amp;L</h3></div><div id="sm_pl">${plTable(lv, { edit: finCan })}</div></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(X.sumT)}</h3></div>${sumHTML(lv, liveCamp(c), 'st')}</div>` +
      `<div class="card"><div class="card-head"><h3>${esc(X.expT)}</h3></div>${expHTML(lv)}</div>` + fin + whoT;
    drawSummary(lv, liveCamp(c), 'st');
  }
  function onSummary(e) {
    const t = e.target, F = st.F;
    if (t.matches('[data-fcmt]')) { F.forecast.comment = t.value; touch('fin'); return true; }
    if (t.matches('[data-rcmt]')) { F.review.comment = t.value; touch('submit'); return true; }
    if (t.matches('[data-fach]') || t.matches('[data-fworst]') || t.matches('[data-fbest]')) { const v = num(t.value); if (v == null) return true;
      if (t.dataset.fach) { F.forecast.ach = Object.assign({}, F.forecast.ach || {}); F.forecast.ach[t.dataset.fach] = v / 100; } else if (t.matches('[data-fworst]')) F.forecast.worst = v / 100; else F.forecast.best = v / 100;
      touch('fin'); if (e.type === 'change') { const box = $('sm_pl'); if (box) box.innerHTML = plTable(liveVer(), { edit: true }); } return true; }
    return false;
  }

  /* ===================== §10 — Export PDF (D139): a print page (#printDoc) + window.print() → Save as PDF of Edge / Chrome · no library · the approval is the one in the system ===================== */
  function pdfHTML(plan, c, o = {}) {
    const X = W.pdf, ver = o.ver || (plan.approval === 'approved' ? R.approvedVersion(plan) : R.working(plan)), T = R.planTotals(ver), w = R.working(plan), draft = plan.approval === 'draft' || plan.approval === 'returned';
    const status = plan.approval === 'approved' ? X.approved(ver.decided_by || '—', R.dmy(String(ver.decided_at || '').slice(0, 10))) : plan.approval === 'submitted' ? X.submitted(R.dmy(String(w.submitted_at || '').slice(0, 10))) : X.draft;
    const now = R.nowLocal(), d = ver.details || {}, subs = (ver.subs || []).map(R.subName).join(' · ') || '—', a = me();
    const skus = (ver.skus || []).map(s => `${s.code} ${s.nickname || s.name} (${SP.p.roles[s.role || 'core']}${s.temp || /^TMP-/i.test(s.code) ? ' · ' + W.brief.b.tempTag : ''})`).join(' · ');
    const lp = Object.assign({}, plan, { versions: plan.versions }), cl = checklist(lp, c, { withPlan: true });
    const people0 = new Map(); whoRows(plan).forEach(r => { if (!r.who) return; const p = people0.get(r.who) || { name: r.who, dept: r.dept, roles: [], done: null }; p.roles.push(SP.names[r.k]); if (r.done && (!p.done || r.done > p.done)) p.done = r.done; people0.set(r.who, p); });
    const signRows = [...people0.values()].map(p => `<tr><td>${esc(p.roles.join(' · '))}</td><td>${esc(SP.dept[p.dept] || p.dept)}</td><td>${esc(p.name)}</td><td>${esc(p.done ? R.dmy(String(p.done).slice(0, 10)) : '—')}</td><td class="sign">…………………………</td><td class="sign">………</td></tr>`).join('') +
      `<tr><td>${esc(X.approve)}</td><td>${esc(X.exec)}</td><td>${esc(plan.approval === 'approved' ? ver.decided_by || '—' : '—')}</td><td>${esc(plan.approval === 'approved' ? X.inSystem(R.dmy(String(ver.decided_at || '').slice(0, 10))) : '—')}</td><td class="sign">…………………………</td><td class="sign">………</td></tr>`;
    const sec = (h, body, cls) => `<section class="pd-sec${cls ? ' ' + cls : ''}"><h2>${esc(h)}</h2>${body}</section>`;
    return `<div class="pd-doc${draft ? ' draft' : ''}">${draft ? `<div class="pd-wm">${esc(X.wm)}</div>` : ''}<header class="pd-h"><div class="pd-brand">Charmiss · ${esc(X.title)}</div><h1>${esc(c.name)} <small>v${ver.v || 1}</small></h1>` +
      `<div class="pd-meta"><b>${esc(status)}</b> · ${esc(X.printed(R.dmy(now.slice(0, 10)), now.slice(11, 16), a ? a.name : '—'))}</div></header>` +
      sec(X.campaign, `<table class="pd-kv"><tbody><tr><td>${esc(W.brief.a.start)}</td><td>${esc(R.dmy(c.start))}</td><td>${esc(W.brief.a.endMkt)}</td><td>${esc(c.end_marketing ? R.dmy(c.end_marketing) : '—')}</td><td>${esc(W.brief.a.end)}</td><td>${esc(R.dmy(c.end))}</td></tr>` +
        `<tr><td>${esc(W.brief.a.owner)}</td><td colspan="5">${esc(plan.owner || '—')}</td></tr><tr><td>${esc(W.brief.a.note)}</td><td colspan="5">${esc(d.note || d.objective || '—')}</td></tr><tr><td>${esc(W.tgt.subsT)}</td><td colspan="5">${esc(subs)}</td></tr><tr><td>SKU</td><td colspan="5">${esc(skus || '—')}</td></tr></tbody></table>`) +
      sec('P&L', plTable(ver, { chart: false }).replace(/<button[^>]*>.*?<\/button>/g, '')) +
      sec(X.checks, `<ul class="pd-ck">${cl.rows.map(r => `<li>${r.errs.length ? '✕' : '✓'} ${esc(stepLabel(r.k))}${r.warns.length ? ` — ⚠ ${esc(r.warns.join(' · '))}` : ''}</li>`).join('')}</ul>` +
        `<p><b>${esc(W.sum.finL)}:</b> ${esc((ver.forecast || {}).comment || '—')}</p><p><b>${esc(W.sum.noteL)}:</b> ${esc((ver.review || {}).comment || '—')}</p>`) +
      sec(X.sign, `<table class="tbl pd-sign"><thead><tr><th>${esc(X.role)}</th><th>${esc(X.dept)}</th><th>${esc(X.name)}</th><th>${esc(X.doneSys)}</th><th>${esc(X.signC)}</th><th>${esc(X.date)}</th></tr></thead><tbody>${signRows}</tbody></table><p class="pd-note">${esc(X.note)}</p>`) +
      sec(W.sum.sumT, sumHTML(ver, c, 'pdf', { noChart: true }), 'pd-detail') + sec(W.sum.expT, expHTML(ver)) +
      `<footer class="pd-f">Campaign P&amp;L · ${esc(c.name)} v${ver.v || 1} · ${esc(X.printedShort(R.dmy(now.slice(0, 10)), now.slice(11, 16)))}</footer></div>`;
  }
  function pdf(plan, c, o = {}) {
    let box = $('printDoc'); if (!box) { box = document.createElement('div'); box.id = 'printDoc'; box.setAttribute('aria-hidden', 'true'); document.body.appendChild(box); }
    box.innerHTML = pdfHTML(plan, c, o); if (o.preview) return box.innerHTML;
    const ver = plan.approval === 'approved' ? R.approvedVersion(plan) : R.working(plan), old = document.title;
    document.title = W.pdf.file(c.name, (ver && ver.v) || 1); document.body.classList.add('printing');
    const done = () => { document.title = old; document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); setTimeout(() => window.print(), 50); setTimeout(done, 60000);
    return '';
  }

  /* ===================== §12.5 — Export of the plan (.xlsx): P&L (no GP %) · Target (with its sub-channel) · Expenses (with Used) ===================== */
  function xlsx(plan, c, o = {}) {
    const X = W.xl, K = X.cols, ver = o.ver || (plan.approval === 'approved' ? R.approvedVersion(plan) : R.working(plan)), fc = R.planForecast(ver), sm = R.skuMap(ver), L = W.pl;
    const cols4 = [['plan', L.plan], ['base', L.fc(R.pct(fc.baseAch == null ? 1 : fc.baseAch, 1))], ['worst', L.worst(R.pct(fc.f.worst))], ['best', L.best(R.pct(fc.f.best))]];
    const plRows = [['rev', L.rev, 'money'], ['cogs', 'COGS', 'money'], ['gp', L.gp, 'money'], ['mkt', L.mkt, 'money'], ['sls', L.sls, 'money'], ['oth', L.oth, 'money'], ['spend', L.spend, 'money'], ['ap', L.ap, 'pct'], ['profit', L.profit, 'money'], ['margin', L.margin, 'pct'], ['roi', 'ROI', 'num']]
      .map(([k, l]) => [l].concat(cols4.map(([s]) => fc[s][k] == null ? null : fc[s][k])));
    const tRows = (ver.target || []).map(r => { const s = sm.get(r.code) || {}, a = R.rowAmount(r, s); return [r.code, s.nickname || s.name || '', C.channel[r.channel] || r.channel, r.sub ? R.subName(r.sub) : W.tgt.unspecified, R.monthName(r.month), +r.qty || 0, a == null ? null : a, r.basis === 'qty' ? K.pcs : '฿']; });
    const bRows = (ver.budget || []).filter(r => +r.amount || r.used === false).map(r => [P.grid.groups[r.type] || r.type, r.line, R.monthName(r.month), +r.amount || 0, r.used === false ? K.no : K.yes, W.exp.ph[r.phasing] || r.phasing || '']);
    U.saveXlsx(X.file, `${c.name} v${ver.v || 1}`, [
      { key: 'pl', title: L.title, header: [''].concat(cols4.map(x => x[1])), cols: ['text', 'money', 'money', 'money', 'money'], rows: plRows.map((r, i) => i === 7 || i === 9 ? [r[0]].concat(r.slice(1).map(v => ({ v, fmt: 'pct' }))) : r) },
      { key: 'target', title: X.target, header: [K.sku, K.product, K.ch, K.sub, K.month, K.qty, K.amount, K.basis], cols: tRows.length ? ['text', 'text', 'text', 'text', 'text', 'num', 'money', 'text'] : [], rows: tRows },
      { key: 'exp', title: X.exp, header: [K.group, K.line, K.month, K.amount, K.used, K.phasing], cols: bRows.length ? ['text', 'text', 'text', 'money', 'text', 'text'] : [], rows: bRows }],
      [[C.camps.meta.at, R.dmy(U.today())], [A.state[plan.approval] || plan.approval, `v${ver.v || 1}`]]);
  }

  /* ===================== the events of the page ===================== */
  async function onClick(e) {
    if (!host || !host.contains(e.target) || !st.F) return; const t = e.target, c = campOf(st.id), plan = planOf(st.id); if (!c || !plan) return;
    if (t.closest('[data-plsee]')) { st.plPop = !st.plPop; renderPl(); return; }
    if (t.closest('[data-bbck]')) { st.ckOpen = !st.ckOpen; renderBar(); return; }
    const ac = t.closest('[data-cpact]'); if (ac && ac.dataset.cpact === 'save') return doSave(false); if (ac && ac.dataset.cpact === 'submit') return submit();
    const dn = t.closest('[data-cpdone]'); if (dn) return markDone(dn.dataset.cpdone, false);
    const rp = t.closest('[data-reopen]'); if (rp) return reopen(rp.dataset.reopen);
    if (t.closest('[data-pdf]')) { pdf(plan, c); return; }
    if (t.closest('[data-xlsx]')) { xlsx(livePlan(plan), liveCamp(c)); return; }
    if (st.page === 'brief' && await onBriefClick(t)) return;
    if (st.page === 'target' && onTargetClick(t)) return;
    if (st.page === 'expenses' && onExpensesClick(t)) return;
  }
  function onInput(e) {
    if (!host || !host.contains(e.target) || !st.F) return; const t = e.target;
    if (t.disabled || t.matches('[data-tpopen]') || t.matches('details')) return;
    if (st.page === 'brief') return onBrief(e);
    if (st.page === 'target') return onTarget(e);
    if (st.page === 'expenses') return onExpenses(e);
    if (st.page === 'summary') return onSummary(e);
  }
  document.addEventListener('click', e => { if (host && host.contains(e.target) && host.offsetParent) onClick(e); });
  document.addEventListener('input', e => { if (host && host.contains(e.target) && host.offsetParent && !e.target.matches('.dtext')) onInput(e); });
  document.addEventListener('change', e => { if (host && host.contains(e.target) && host.offsetParent) onInput(e); });
  document.addEventListener('keydown', e => { if (host && host.contains(e.target) && host.offsetParent && st.page === 'brief') onBriefKey(e); });
  document.addEventListener('toggle', e => { if (!host || !host.contains(e.target)) return; if (e.target.matches('[data-fopen]')) st.fillOpen = e.target.open; if (e.target.matches('[data-tpopen]')) st.priceOpen = e.target.open; }, true);
  async function confirmLeave() { if (!isDirty()) return true; const G = P.grid; const ok = await U.confirmDialog(G.leaveQ, G.leaveBody, G.leave, true, G.stay); if (ok) st.F = null; return ok; }
  window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  return { render, isDirty, confirmLeave, saveDraft: () => (st.F && st.F.dirty ? doSave(true) : Promise.resolve(true)), reset: () => { st.F = null; }, detach: () => { host = null; st.plPop = false; st.ckOpen = false; }, draft: () => st.F, current: () => st.id, page: () => st.page, PAGES, pageOf, firstPage, plTable, sumHTML, drawSummary, expHTML, checklist, checklistHTML,
    pdf, pdfHTML, xlsx, serialize, grid: () => st.g, gridKeys: () => (st.gk || []).slice(), gridX: () => st.gx, dirtyCount: () => (st.F ? st.F.dirty : 0), builderOf: c => builderOf(c), redraw };
})();
