/* export.js — the rows of each card = what the card shows (the Table button draws the same rows on screen) · Export of a tab = one .xlsx,
   one sheet a card, the scope on top of the first (CR-01 §5 · CR-02 §7–8 · CR-04 · CR-07 · CR-08: Overview · Sales · Budget · P&L · Campaign Monitor). → CP.export
   A table: { key, title, sub, header, cols ['text' | 'money' | 'pct' | 'num' | 'x'], rows, total, notes } · a cell may be { v, fmt, bold, why }
   · null = not there (blank in the file, "—" on screen, never 0). The words follow CR-04 §7.1: Target (sales) · Budget (spend) · Plan (profit). */
CP.export = (function () {
  'use strict';
  const C = CP.content, R = CP.rules, D = C.dash, K = C.camp, W = C.wf, S = C.sales, MN = C.money;
  /* the widgets of each tab, in the order of the page */
  /* CR-08 §1 — the 4 tabs, in the order of their cards · registered by their screens: o_watch · o_tl (screen-overview.js) · s_kpi · s_pace · s_chmix (screen-sales.js) ·
     b_kpi · b_group (screen-budget.js) · p_kpi · p_table · p_profit · p_eff (screen-pnl.js) */
  const TABS = { overview: ['kpi', 'pnlmonth', 'o_all', 'o_watch', 'o_p100'], sales: ['s_kpi', 's_month', 's_pace', 's_rbc', 's_cxm', 's_sku'],
    expenses: ['b_kpi', 'w_month', 'w_budget', 'b_group', 'spendline'], pnl: ['p_kpi', 'w_chart', 'statement', 'p_table', 'p_profit', 'p_eff'],
    /* CR-09 · CR-11 — Campaign Tracking: c_kpi · c_mix · c_channel · c_matrix · c_lines · c_svm … are registered by screen-tracking.js */
    tracking: ['c_kpi', 'c_pkpi', 'w_chart', 'statement', 'c_p100', 'c_cum', 'c_svm', 'c_month', 'c_mix', 'c_channel', 'c_matrix', 'c_subs', 'c_trend', 'w_month', 'c_lines'] };
  const cell = (v, fmt, o) => Object.assign({ v, fmt }, o || {});
  const rangeOf = x => ({ from: x.from, to: x.to, statuses: x.statuses, includeCancelled: x.includeCancelled, only: x.only, today: x.today });
  const daysText = d => (d.kind === 'ended' ? C.common.none : d.kind === 'starts' ? (d.n === 0 ? D.p.startsToday : D.p.startsIn(d.n)) : d.n === 0 ? D.p.endsToday : D.p.daysLeft(d.n));
  const timeText = t => (t.kind === 'cancelled' ? C.status.cancelled : t.kind === 'ended' ? D.p.endedOn(R.dmy(t.end)) : t.kind === 'starts' ? (t.n === 0 ? D.p.startsToday : D.p.startsIn(t.n)) : t.n === 0 ? D.p.endsToday : D.p.daysLeft(t.n));
  const monthLabel = (r, cur) => R.monthName(r.m) + (r.m === cur ? ` (${D.m.legend.mtd.toLowerCase()})` : '');
  const aw = (x, w) => w;
  const stText = st => (st ? C.att[st] : C.common.none);
  const estN = q => (q && q.est ? C.cogsEst.note(R.baht(q.estAmt)) : '');   // E1 → E

  /* ===================== Overview ===================== */
  function kpiTable(x) {
    const k = R.kpis(x.seed, rangeOf(x)), p = k.pnl, A = p.actual, P = p.plan, L = p.lfl, c = k.campaigns, look = R.issues(x.seed, rangeOf(x)).rows.length, Kk = D.k;
    const rows = [
      [Kk.campaigns, cell(c.n, 'num'), R.STATUSES.concat([R.CANCELLED]).filter(s => c.by[s]).map(s => `${c.by[s]} ${C.status[s]}`).concat(look ? [Kk.needLook(look)] : []).join(' · ')],
      [aw(x, C.xl.actual(Kk.revenue)), cell(A.rev, 'money'), A.rev == null ? Kk.noSales : ''], [C.xl.targetTD(Kk.revenue), cell(L.rev, 'money'), MN.tgtTD.f],
      [C.xl.fullOf(Kk.revenue), cell(P.rev, 'money'), ''], [MN.ach.h, cell(p.ach, 'pct'), MN.ach.f],
      [C.xl.actual(Kk.spend), cell(A.spend, 'money'), A.spend == null ? Kk.noSpend : ''], [`  ${W.st.rows.mkt}`, cell(A.mkt, 'money'), ''], [`  ${W.st.rows.sls}`, cell(A.sls, 'money'), ''], [`  ${W.st.rows.oth}`, cell(A.oth, 'money'), ''],
      [C.xl.budgetTD(Kk.spend), cell(L.spend, 'money'), MN.budgetTD.f], [C.xl.fullBudget(Kk.spend), cell(P.spend, 'money'), ''],
      [MN.used.h, cell(p.used, 'pct'), MN.used.f], [MN.ap.h, cell(A.ap, 'pct'), MN.ap.f],
      [C.xl.actual(MN.gp.h), cell(A.gp, 'money'), estN(A)], ['GP %', cell(A.gpPct, 'pct'), ''],
      [C.xl.actual(Kk.profit), cell(A.profit, 'money'), [MN.profit.f, estN(A)].filter(Boolean).join(' · ')], [C.xl.planTD(Kk.profit), cell(L.profit, 'money'), estN(L)],
      [C.xl.plan(Kk.profit), cell(P.profit, 'money'), P.profit == null && p.cogsBad[0] ? Kk.noPlanProfit : estN(P)],
      [MN.margin.h, cell(A.margin, 'pct'), ''], [MN.roi.h, cell(A.roi, 'x'), MN.roi.f], ['ROAS', cell(A.roas, 'x'), ''],
    ];
    return { key: 'kpi', title: D.file.kpi, header: [C.xl.metric, C.xl.value, C.xl.note], cols: ['text', 'money', 'text'], rows };
  }
  /* the one monthly chart of Overview (Revenue · Spend · Profit) */
  function pnlMonthTable(x) {
    const ms = x.m.measure, md = R.byMonth(x.seed, rangeOf(x), ms), cur = R.ym(x.today), Kc = D.m.cols, spend = ms === 'spend';
    const goal = spend ? Kc.budget : ms === 'profit' ? Kc.plan : Kc.target, lfl = spend ? Kc.budgetLfl : ms === 'profit' ? Kc.planLfl : Kc.targetLfl, cum = spend ? Kc.cumBudget : ms === 'profit' ? Kc.cumPlan : Kc.cumTarget;
    const title = `${D.m.titles[ms]} · ${x.m.mode === 'cumulative' ? D.m.cumulative : D.m.monthly}`;
    const act = spend ? Kc.actual : aw(x, Kc.actual);
    if (x.m.mode === 'cumulative') {
      return { key: 'pnlmonth', title, header: [Kc.month, cum, spend ? Kc.cumActual : aw(x, Kc.cumActual), Kc.variance], cols: ['text', 'money', 'money', 'money'],
        rows: md.cum.map(r => [monthLabel(r, cur), r.plan, r.actual, r.variance]) };
    }
    const sum = k => md.rows.reduce((s, r) => (r[k] == null ? s : (s || 0) + r[k]), null);
    const header = spend ? [Kc.month, goal, Kc.mkt, Kc.sls, Kc.oth, act, lfl, Kc.variance] : [Kc.month, goal, act, lfl, Kc.variance];
    const rows = md.rows.map(r => (spend ? [monthLabel(r, cur), r.plan, r.mkt, r.sls, r.oth, r.actual, r.lfl, r.variance] : [monthLabel(r, cur), r.plan == null && r.cogsBad && ms === 'profit' ? cell(null, 'money', { why: D.m.profitNull }) : r.plan, r.actual, r.lfl, r.variance]));
    const total = spend ? [C.common.total, sum('plan'), sum('mkt'), sum('sls'), sum('oth'), sum('actual'), sum('lfl'), sum('variance')] : [C.common.total, md.planTotal, sum('actual'), sum('lfl'), sum('variance')];
    return { key: 'pnlmonth', title, header, cols: ['text'].concat(header.slice(1).map(() => 'money')), rows, total };
  }
  /* Needs attention (§9) — every Campaign of the list, not only the first 6 */
  function attentionTable(x) {
    const A = D.att, list = R.attention(x.seed, rangeOf(x));
    const words = i => (i.key === 'soon' ? A.issues.soon(i.n) : i.key === 'nosales' ? A.issues.nosales(i.n) : A.issues[i.key](R.pct(i.v)));
    return { key: 'attention', title: A.title, header: [C.xl.campaign, C.xl.severity, C.xl.problems, MN.ach.h, MN.used.h, C.xl.fcOfFull(MN.forecast.h), MN.gap.h], cols: ['text', 'text', 'text', 'pct', 'pct', 'pct', 'money'],
      rows: list.map(a => [cell(a.c.name, 'text', { bold: true }), a.severity === 'err' ? C.xl.red : C.xl.orange, a.issues.map(words).join(' · '), a.ach, a.used, a.forecast.pct, a.gap]),
      notes: list.length ? [] : [`✓ ${A.none}`] };
  }
  /* CR-04 §7.4 — ≤ 10 columns: the period's goal · actual · Ach % / Used % of each Campaign (the months are in the chart and in "by month") */
  function timelineTable(x) {
    const T = R.timeline(x.seed, rangeOf(x), x.tl.measure, x.sort), Kc = D.t.tcols, sp = x.tl.measure === 'spend', Mc = D.m.cols;
    const header = [Kc.campaign, Kc.status, Kc.start, Kc.endMkt, Kc.end, sp ? Mc.budget : Mc.target, sp ? Mc.actual : aw(x, Mc.actual), sp ? MN.used.h : MN.ach.h, Kc.summary];
    const rows = T.rows.map(r => { const p = r.pnl; return [cell(r.c.name, 'text', { bold: true }), C.status[r.status], R.dmy(r.c.start), r.c.end_marketing ? R.dmy(r.c.end_marketing) : '', R.dmy(r.c.end),
      sp ? p.plan.spend : p.plan.rev, sp ? p.actual.spend : p.actual.rev, sp ? p.used : p.ach, r.summary.text]; });
    return { key: 'timeline', title: `${D.t.title} · ${D.t.measures[x.tl.measure]}`, header, cols: ['text', 'text', 'text', 'text', 'text', 'money', 'money', 'pct', 'text'], rows };
  }

  /* ===================== Sales ===================== */
  function sKpiTable(x) {
    const k = R.kpis(x.seed, rangeOf(x)), T = R.salesTable(x.seed, rangeOf(x), 'attention'), p = k.pnl, A = p.actual, L = p.lfl, t = T.total, Sk = S.k;
    const rows = [
      [aw(x, C.xl.actual(Sk.revenue)), cell(A.rev, 'money'), A.rev == null ? D.k.noSales : ''], [C.xl.targetTD(Sk.revenue), cell(L.rev, 'money'), MN.tgtTD.f], [MN.ach.h, cell(p.ach, 'pct'), MN.ach.f],
      [Sk.forecast, cell(t.forecast, 'money'), [MN.forecast.f, t.atTarget.length ? Sk.fcAtTarget(t.atTarget) : '', t.notCounted.length ? Sk.fcNotCounted(t.notCounted.length) : ''].filter(Boolean).join(' · ')],
      [C.xl.fcCounted(Sk.forecast), cell(t.forecastFull, 'money'), ''], [C.xl.pctOf(Sk.forecast), cell(R.ratio(t.forecast, t.forecastFull), 'pct'), ''],
      [aw(x, C.xl.pcs(Sk.units)), cell(A.rev == null ? null : A.qty, 'num'), ''], [C.xl.piecesTD(Sk.units), cell(A.rev == null ? null : L.qty, 'num'), MN.units.f],
      [`${Sk.onTarget} (${Sk.onTargetW})`, cell(T.by.on_target, 'num'), C.xl.withSales(T.withAch, C.att.at_risk, T.by.at_risk, C.att.behind, T.by.behind)],
    ];
    return { key: 's_kpi', title: D.file.s_kpi, header: [C.xl.metric, C.xl.value, C.xl.note], cols: ['text', 'money', 'text'], rows };
  }
  function sMonthTable(x) {
    const qty = x.unit === 'qty', md = R.byMonth(x.seed, rangeOf(x), qty ? 'qty' : 'revenue'), cur = R.ym(x.today), Kc = D.m.cols, f = qty ? 'num' : 'money';
    const title = `${S.m.title} · ${qty ? S.m.qty : C.xl.baht} · ${x.mode === 'cumulative' ? D.m.cumulative : D.m.monthly}`;
    if (x.mode === 'cumulative') return { key: 's_month', title, header: [Kc.month, Kc.cumTarget, aw(x, Kc.cumActual), Kc.variance], cols: ['text', f, f, f], rows: md.cum.map(r => [monthLabel(r, cur), r.plan, r.actual, r.variance]) };
    const sum = k => md.rows.reduce((s, r) => (r[k] == null ? s : (s || 0) + r[k]), null);
    return { key: 's_month', title, header: [Kc.month, Kc.target, aw(x, Kc.actual), Kc.targetLfl, Kc.variance], cols: ['text', f, f, f, f],
      rows: md.rows.map(r => [monthLabel(r, cur), r.plan, r.actual, r.lfl, r.variance]), total: [C.common.total, md.planTotal, sum('actual'), sum('lfl'), sum('variance')] };
  }
  /* Campaign attainment (10 columns, as the card) · its channels under it */
  function sTableTable(x) {
    const T = R.salesTable(x.seed, rangeOf(x), x.sort), Kc = S.t.cols, Wy = D.p.why;
    const fcv = part => (part.kind === 'est' || part.kind === 'final' ? part.v : null);
    const line = (name, st, time, n, part, child) => [child ? cell(`    ${name}`, 'text') : cell(name, 'text', { bold: true }), st, time, cell(n.tgtTD, 'money', { why: Wy.noSales }), cell(n.actual, 'money', { why: Wy.noSales }),
      cell(n.ach, 'pct', { why: n.actual == null ? Wy.noSales : Wy.noPlan }), cell(n.gap, 'money'), cell(n.full, 'money', { why: Wy.noPlan }), cell(fcv(part), 'money', { why: part.kind === 'atTarget' ? S.t.noPace : S.t.notCounted }), stText(n.status)];
    const rows = [];
    T.rows.forEach(r => { rows.push(line(r.c.name, C.status[r.status], timeText(r.time), r.node, r.part, false)); r.ch.forEach(h => rows.push(line(C.channel[h.channel], '', '', h.node, h.part, true))); });
    const t = T.total;
    return { key: 's_table', title: `${S.t.title}`, header: [Kc.campaign, Kc.status, Kc.time, Kc.tgtTD, aw(x, Kc.actual), Kc.ach, Kc.gap, Kc.full, Kc.forecast, Kc.att],
      cols: ['text', 'text', 'text', 'money', 'money', 'pct', 'money', 'money', 'money', 'text'], rows,
      total: [cell(D.p.total, 'text', { bold: true }), '', '', t.tgtTD, t.actual, t.ach, t.gap, t.full, t.forecast, stText(t.status)],
      notes: [t.atTarget.length ? S.k.fcAtTarget(t.atTarget) : '', t.notCounted.length ? S.k.fcNotCounted(t.notCounted.length) : ''].filter(Boolean) };
  }
  function sChannelTable(x) {
    const d = R.channelSubs(x.seed, rangeOf(x)), Kc = S.ch.cols, rows = [];
    const line = (name, n, child) => [child ? cell(`    ${name}`, 'text') : cell(name, 'text', { bold: true }), n.plan, n.actual == null ? null : n.lfl, n.actual, n.ach, n.gap];
    d.rows.forEach(r => { rows.push(line(`${C.channel[r.channel]} · ${C.channelLong[r.channel]}`, r, false)); r.subs.forEach(s => rows.push(line(s.sub, s, true))); });
    return { key: 's_channel', title: S.ch.title, header: [Kc.channel, Kc.full, Kc.tgtTD, aw(x, Kc.actual), Kc.ach, Kc.gap], cols: ['text', 'money', 'money', 'money', 'pct', 'money'], rows,
      total: [cell(C.common.total, 'text', { bold: true }), d.total.plan, d.total.actual == null ? null : d.total.lfl, d.total.actual, d.total.ach, d.total.gap] };
  }
  function sSkuTable(x) {
    const d = R.skuWatch(x.seed, rangeOf(x), x.sku), Kc = S.sku.cols;
    return { key: 's_sku', title: `${S.sku.title} · ${d.mode === 'best' ? S.sku.best : S.sku.behind}`, header: [Kc.sku, Kc.campaign, Kc.code, Kc.tgtTD, aw(x, Kc.actual), Kc.ach, Kc.gap, Kc.status],
      cols: ['text', 'text', 'text', 'money', 'money', 'pct', 'money', 'text'],
      rows: d.rows.map(r => [cell(r.product.nickname || r.product.name || r.key, 'text', { bold: true }), r.c.name, r.product.code || '', r.tgtTD, r.actual, r.ach, r.gap, stText(r.status)]),
      notes: [S.sku.of(d.rows.length, d.n)] };
  }

  /* ===================== By campaign ===================== */
  const unitFmt = x => (x.unit === 'qty' ? 'num' : 'money');
  const unitWord = x => (x.unit === 'qty' ? K.m.qty : C.xl.baht);
  function cKpiTable(x) {
    const c = R.model(x.seed).byId.get(x.cid), tp = R.timeProgress(c, x.today), rr = R.runRate(x.seed, x.cid, { channel: x.channel, unit: 'amount', today: x.today }), T = rr.att.total;
    const sk = R.attainment(x.seed, x.cid, { channel: x.channel, unit: 'amount', today: x.today }).skus, by = st => sk.filter(s => s.node && s.node.status === st).length;
    const s = R.statement(x.seed, rangeOf(x), x.cid, 'same'), A = s.pnl.actual, plan = s.rows.find(r => r.key === 'profit').plan, pc = R.campaignPace(x.seed, x.cid, x.today);
    const rows = [
      [K.k.time, cell(tp.started ? tp.daysLeft : null, 'num'), tp.started ? `${K.k.timeOf(tp.total)} · ${R.pct(tp.pct)} passed · ends ${R.dmy(c.end)}` : K.k.notStarted(R.dmy(c.start))],
      [aw(x, C.xl.actualTo(K.k.revenue)), cell(T.actTD, 'money'), T.actTD == null ? K.noActual : ''], [C.xl.targetTD(K.k.revenue), cell(T.tgtTD, 'money'), MN.tgtTD.f],
      [C.yr.timeGone, cell(R.timeGone(c, x.today), 'pct'), C.yr.timeGoneF], [`${C.yr.pace.cols.pace} (${C.yr.pace.cols.ach} ÷ ${C.yr.timeGone})`, cell(pc && pc.status ? +R.paceText(pc.pace) : null, 'num'), pc && pc.status ? C.yr.st[pc.status] : C.yr.pace.early],
      [MN.ach.h, cell(T.ach, 'pct'), stText(T.status)], [MN.gap.h, cell(T.gap, 'money'), ''], [C.xl.fullTarget, cell(T.target, 'money'), ''], [C.xl.remaining, cell(T.remaining, 'money'), ''],
      [K.k.rate, cell(rr.required, 'money'), rr.monthsLeft == null ? K.noActual : K.k.rateFor(Math.round(rr.monthsLeft * 10) / 10)], [C.xl.pace, cell(rr.pace, 'money'), rr.pace == null ? K.k.noPace : ''],
      [MN.forecast.h, cell(rr.forecast, 'money'), C.est.tip],
      [aw(x, C.xl.actual(K.k.profit)), cell(A.profit, 'money'), estN(A)], [C.xl.planTD(K.k.profit), cell(plan, 'money'), ''], [MN.margin.h, cell(A.margin, 'pct'), ''], [MN.roi.h, cell(A.roi, 'x'), ''],
      [C.xl.skus(C.att.on_target), cell(by('on_target'), 'num'), C.xl.skusOf(sk.filter(q => q.node && q.node.target != null).length, C.att.at_risk, by('at_risk'), C.att.behind, by('behind'))],
    ];
    return { key: 'c_kpi', title: D.file.c_kpi, header: [C.xl.metric, C.xl.value, C.xl.note], cols: ['text', 'money', 'text'], rows };
  }
  function cMonthTable(x) {
    const md = R.targetByMonth(x.seed, x.cid, { channel: x.channel, unit: x.unit, today: x.today }), cur = R.ym(x.today), f = unitFmt(x), Kc = D.m.cols;
    const title = `${K.m.title} · ${unitWord(x)} · ${x.mode === 'cumulative' ? D.m.cumulative : D.m.monthly}`;
    if (x.mode === 'cumulative') return { key: 'c_month', title, header: [Kc.month, Kc.cumTarget, aw(x, Kc.cumActual), Kc.variance], cols: ['text', f, f, f], rows: md.cum.map(r => [monthLabel(r, cur), r.plan, r.actual, r.variance]) };
    const sum = k => md.rows.reduce((s, r) => (r[k] == null ? s : (s || 0) + r[k]), null);
    return { key: 'c_month', title, header: [Kc.month, K.m.target, aw(x, Kc.actual), K.m.targetLfl, Kc.variance], cols: ['text', f, f, f, f],
      rows: md.rows.map(r => [monthLabel(r, cur), r.plan, r.actual, r.lfl, r.variance]), total: [C.common.total, md.planTotal, sum('actual'), sum('lfl'), sum('variance')] };
  }
  function cChannelTable(x) {
    const a = R.attainment(x.seed, x.cid, { channel: x.channel, unit: x.unit, today: x.today }), f = unitFmt(x), Kc = K.ch.cols;
    const line = (name, n, child) => [child ? `    ${name}` : cell(name, 'text', { bold: true }), cell(n.tgtTD, f), cell(n.actTD, f), cell(n.ach, 'pct'), cell(n.gap, f), cell(n.target, f), cell(n.remaining, f), stText(n.status)];
    const rows = [];
    R.sortAtt(a.channels, x.chSort, r => r.channel).forEach(ch => { rows.push(line(`${C.channel[ch.channel]} · ${C.channelLong[ch.channel]}`, ch.node, false)); R.sortAtt(ch.subs, x.chSort, r => r.sub).forEach(s => rows.push(line(s.sub, s.node, true))); });
    const t = a.total;
    return { key: 'c_channel', title: `${K.ch.title} · ${unitWord(x)}`, header: [Kc.channel, Kc.tgtTD, aw(x, Kc.actual), Kc.ach, Kc.gap, Kc.full, Kc.remaining, Kc.status], cols: ['text', f, f, 'pct', f, f, f, 'text'],
      rows, total: [cell(K.total, 'text', { bold: true }), t.tgtTD, t.actTD, t.ach, t.gap, t.target, t.remaining, stText(t.status)] };
  }
  const skuName = s => s.product.nickname || s.product.name || s.key;
  function skuRows(x) {
    const a = R.attainment(x.seed, x.cid, { channel: x.channel, unit: x.unit, today: x.today });
    const list = a.skus.filter(s => !x.skuTab || x.skuTab === 'all' || (s.node && s.node.status === x.skuTab));
    return { a, rows: R.sortAtt(list, x.skuSort, skuName) };
  }
  function cSkuTable(x) {
    const { a, rows } = skuRows(x), f = unitFmt(x), chs = a.channel ? [a.channel] : R.CHANNELS, Kc = K.sku.cols;
    const header = [Kc.sku, C.xl.code].concat(chs.map(k => `${C.channel[k]} Ach %`), [Kc.tgtTD, aw(x, Kc.actual), Kc.ach, Kc.gap, Kc.status]);
    return { key: 'c_sku', title: `${K.sku.title} · ${unitWord(x)}${x.skuTab && x.skuTab !== 'all' ? ' · ' + C.att[x.skuTab] : ''}`, header,
      cols: ['text', 'text'].concat(chs.map(() => 'pct'), [f, f, 'pct', f, 'text']),
      rows: rows.map(s => [cell(skuName(s), 'text', { bold: true }), s.product.code || ''].concat(chs.map(k => (s.byCh[k] ? s.byCh[k].ach : null)), [s.node.tgtTD, s.node.actTD, s.node.ach, s.node.gap, stText(s.node.status)])) };
  }

  /* ===================== Spend & Profit ===================== */
  function wKpiTable(x) {
    const s = R.statement(x.seed, rangeOf(x), x.ids, x.basis), g = k => s.rows.find(r => r.key === k), A = s.pnl.actual, p = s.pnl, bl = R.budgetLeft(x.seed, rangeOf(x)), basis = x.basis === 'full' ? W.st.full : W.st.same;
    const rows = [[aw(x, C.xl.actual(W.k.revenue)), cell(g('revenue').actual, 'money'), ''], [C.xl.targetBasis(W.k.revenue, basis), cell(g('revenue').plan, 'money'), W.st.revenueTip],
      [C.xl.actual(W.k.gp), cell(g('gp').actual, 'money'), estN(A)], [C.xl.planBasis(W.k.gp, basis), cell(g('gp').plan, 'money'), ''], ['GP %', cell(A.gpPct, 'pct'), `${W.st.cols.plan} ${R.pct(s.pct.gp[0])}`],
      [C.xl.actual(W.k.spend), cell(A.spend, 'money'), ''], [C.xl.budgetTD(W.k.spend), cell(p.lfl.spend, 'money'), MN.budgetTD.f], [MN.used.h, cell(p.used, 'pct'), MN.used.f], [MN.ap.h, cell(A.ap, 'pct'), MN.ap.f],
      [C.xl.actual(W.k.profit), cell(g('profit').actual, 'money'), estN(A)], [C.xl.planBasis(W.k.profit, basis), cell(g('profit').plan, 'money'), ''], [MN.margin.h, cell(A.margin, 'pct'), `${W.st.cols.plan} ${R.pct(s.pct.margin[0])}`], [MN.roi.h, cell(A.roi, 'x'), ''],
      [`${W.k.left}`, cell(bl.left, 'money'), MN.budgetLeft.f], [C.xl.fullBudget(W.k.spend), cell(bl.full, 'money'), ''], [C.xl.used(W.k.left), cell(bl.pct, 'pct'), '']];
    return { key: 'w_kpi', title: D.file.w_kpi, header: [C.xl.metric, C.xl.value, C.xl.note], cols: ['text', 'money', 'text'], rows };
  }
  function wChartTable(x) {
    const side = x.side || 'actual', w = CP.pnl.waterfallOf(x, side), Ch = W.chart, lab = st => Ch.steps[st.label] || st.label;
    const title = `${C.pl.wf.title} · ${C.pl.wf[side === 'forecast' ? 'fc' : side]}`;
    if (!w.ok) return { key: 'w_chart', title, header: [C.xl.step, C.xl.group, C.xl.amount, C.xl.pctRev, C.xl.running], cols: ['text', 'text', 'money', 'pct', 'money'], rows: [], notes: [w.reason === 'no_cogs' ? Ch.noCogs : C.empty.title] };
    return { key: 'w_chart', title, header: [C.xl.step, C.xl.group, C.xl.amount, C.xl.pctRev, C.xl.running], cols: ['text', 'text', 'money', 'pct', 'money'],
      rows: w.steps.map(st => [cell(lab(st), 'text', { bold: st.kind === 'sub' || st.kind === 'total' }), Ch.groups[st.group], st.value, st.pctRev, st.to]),
      notes: w.est ? [C.cogsEst.note(R.baht(w.estAmt), w.estWho)] : [] };
  }
  function wMonthTable(x) { return Object.assign(pnlMonthTable(Object.assign({}, x, { m: { measure: 'spend', mode: x.m ? x.m.mode : 'monthly' } })), { key: 'w_month', title: `${W.bva.title} · ${x.m && x.m.mode === 'cumulative' ? D.m.cumulative : D.m.monthly}` }); }
  /* Spend & profit by campaign (10 columns · every Campaign of the period and Status) */
  function wTableTable(x) {
    const d = R.spendTable(x.seed, x.allRange || rangeOf(x)), Kc = W.table.cols;
    const line = (name, p, bold) => { const a = p.actual; return [cell(name, 'text', { bold }), a.spend, a.spend == null ? null : p.lfl.spend, p.used, p.plan.spend, a.ap, a.gp, a.profit, a.margin, a.roi]; };
    return { key: 'w_table', title: W.table.title, header: [Kc.campaign, Kc.spend, Kc.budgetTD, Kc.used, Kc.full, Kc.ap, Kc.gp, Kc.profit, Kc.margin, Kc.roi],
      cols: ['text', 'money', 'money', 'pct', 'money', 'pct', 'money', 'money', 'pct', 'x'], rows: d.rows.map(r => line(r.c.name, r.pnl, true)), total: line(D.p.total, d.total, true), notes: [W.table.allNote] };
  }
  /* CR-05 §9.2 — the Budget set (KOL): a row a Campaign + its lines · Paid apart (web expenses) */
  function wBudgetTable(x) {
    const B = C.track, K2 = B.cols, o = x.allRange || rangeOf(x), bt = R.budgetTrack(x.seed, o), ap = new Map(R.spendTable(x.seed, o).rows.map(r => [r.c.id, r.pnl.actual.ap]));
    const iss = R.issues(x.seed, o).byId, stOf = id => { const r = iss.get(id); return r && r.budget && r.budget.status ? C.yr.st[r.budget.status] : ''; };
    const line = (name, t, apv, bold, st) => [cell(name, 'text', { bold }), t.original, t.changes, t.current, t.committed, t.used, t.svt == null ? null : Math.round(t.svt), t.remaining, t.pending || null, apv == null ? null : apv, st || ''];
    const rows = bt.rows.flatMap(t => [line(t.c.name, t, ap.get(t.id), true, stOf(t.id))].concat(t.lines.map(l => line(`    ${C.plan.grid.groups[l.type] || l.type} · ${l.line}`, Object.assign({}, l, { svt: null }), null))));
    return { key: 'w_budget', title: C.sb.bud.title, header: [K2.campaign, K2.original, K2.changes, K2.current, K2.committed, K2.used, C.xl.pts(K2.svt), K2.remaining, K2.pending, K2.ap, K2.status],
      cols: ['text', 'money', 'money', 'money', 'money', 'pct', 'num', 'money', 'money', 'pct', 'text'], rows,
      total: line(D.p.total, bt.total, R.kpis(x.seed, o).pnl.actual.ap, true), notes: [B.tips.svt.f] };
  }
  /* CR-05 §9.3 — the Campaign tracker */
  function trackerTable(x) {
    const T = C.track.tracker, B = C.track, rows = R.trackerRows(x.seed, rangeOf(x));
    return { key: 'tracker', title: T.title, header: [T.cols.campaign, T.cols.status, C.xl.pctOf(T.cols.time), T.cols.sales, B.cols.current, B.cols.committed, B.cols.used, C.xl.pts(T.cols.svt), T.cols.pending, T.cols.owner],
      cols: ['text', 'text', 'pct', 'pct', 'money', 'money', 'pct', 'num', 'money', 'text'],
      rows: rows.map(r => [cell(r.c.name, 'text', { bold: true }), C.status[r.status] || r.status, r.tp.started ? r.tp.pct : null, r.ach, r.t ? r.t.current : null, r.t ? r.t.committed : null, r.t ? r.t.used : null,
        r.t && r.t.svt != null ? Math.round(r.t.svt) : null, r.t && r.t.pending ? r.t.pending : null, r.c.owner || '']) };
  }
  /* the statement (CR-07 §4.2): Plan (full) · Actual (to date) · Forecast end (Est.) · Forecast vs Plan · the lines of Marketing · Sales · Other */
  function statementTable(x) {
    const s = R.statement(x.seed, rangeOf(x), x.ids, 'full'), F = R.pnlForecast(x.seed, rangeOf(x), x.ids).forecast, S = C.pl.st, cols = x.cols || S.cols, rows = [];
    const fcOf = { revenue: F.rev, cogs: F.cogs, gp: F.gp, mkt: F.mkt, sls: F.sls, oth: F.oth, profit: F.profit };
    s.rows.forEach(r => {
      const label = r.key === 'gp' ? `${S.rows.gp} (${S.pct(R.pct(s.pct.gp[1]))})` : r.key === 'profit' ? `${S.rows.profit} (${S.pct(R.pct(s.pct.margin[1]))})` : S.rows[r.key], fc = fcOf[r.key];
      rows.push([cell(label, 'text', { bold: ['revenue', 'gp', 'profit'].includes(r.key) }), r.plan, r.actual, fc == null ? null : fc, fc == null || r.plan == null ? null : fc - r.plan]);
      if (s.lines[r.key]) s.lines[r.key].forEach(l => rows.push([cell(`    ${l.line}`, 'text'), l.plan, l.actual, null, null]));
    });
    return { key: 'statement', title: S.title, header: [S.title, cols.plan, cols.actual, cols.fc, cols.fcVar], cols: ['text', 'money', 'money', 'money', 'money'], rows,
      sub: `${x.scopeText || ''} · ${R.dmy(x.from)} – ${R.dmy(x.to)} · ${s.actualTo ? W.st.actualTo(R.monthName(s.actualTo)) : W.st.noActual}`, notes: [S.fcInfo.d || ''].filter(Boolean) };
  }
  /* top 8 lines + Other (n) — the same rows as the card */
  function topLines(rows, n) {
    if (rows.length <= n) return rows;
    const head = rows.slice(0, n), rest = rows.slice(n), sum = k => rest.reduce((s, r) => (r[k] == null ? s : (s || 0) + r[k]), null);
    const o = { line: D.sl.other(rest.length), other: true, budget: sum('budget'), actual: sum('actual') };
    o.variance = o.actual == null || o.budget == null ? null : o.actual - o.budget;
    return head.concat([o]);
  }
  function spendLineTable(x) {
    const type = ['sales', 'other'].includes(x.sl.type) ? x.sl.type : 'marketing', rows = lineRowsFor(x, type), shown = topLines(rows, 8);
    const sum = k => rows.reduce((s, r) => (r[k] == null ? s : (s || 0) + r[k]), null), ta = sum('actual'), tb = sum('budget');
    return { key: 'spendline', title: `${D.sl.title} · ${type === 'sales' ? D.sl.sls : type === 'other' ? D.sl.oth : D.sl.mkt}`, header: [D.sl.colLine, D.sl.colA, D.sl.colB, D.sl.colVar], cols: ['text', 'money', 'money', 'money'],
      rows: shown.map(r => [r.line, r.actual, r.budget, r.variance]), total: [C.common.total, ta, tb, ta == null || tb == null ? null : ta - tb] };
  }
  /* the lines of a chosen set of Campaigns (Scope) — the full budget and the actual of the period, largest first */
  function lineRowsFor(x, type) {
    const s = R.statement(x.seed, rangeOf(x), x.ids, 'full');
    return s.lines[type === 'sales' ? 'sls' : type === 'other' ? 'oth' : 'mkt'].map(l => ({ line: l.line, budget: l.plan, actual: l.actual, variance: l.var }));
  }

  /* ===================== Campaign Planning › Plans (CR-03 §7 · CR-06 §4 · CR-07 §6) — the table as filtered and sorted on the page ===================== */
  function campaignsTable(x) {
    const Kc = C.camps.cols, nums = x.nums || new Map(), plans = x.seed.plans || {};
    const progress = c => { const p = plans[c.id]; return p && p.steps ? `${R.planProgress(p, x.today).done} / ${R.STEP_KEYS.length}` : ''; };
    const waiting = c => { const p = plans[c.id]; if (!p || !p.steps || (p.approval !== 'draft' && p.approval !== 'returned')) return p && p.approval === 'submitted' ? C.plng.execWord : '';
      return R.planProgress(p, x.today).waiting.map(s => `${C.step.names[s.key]} · ${s.assignee || '—'}${s.due ? ' · ' + R.dmy(s.due) : ''}${s.overdue ? ' · ' + C.step.overdue(s.daysLate) : ''}`).join(' | '); };
    const rows = x.rows.map(c => { const s = R.statusOf(c, x.today), N = nums.get(c.id) || {}, t = N.track;
      return [cell(c.name, 'text', { bold: true }), c.id, C.appr.state[c.approval] || c.approval || '', C.status[s], R.dmy(c.start), R.dmy(c.end), s === R.CANCELLED ? '' : daysText(R.daysLeft(c, x.today)),
        c.end_marketing ? R.dmy(c.end_marketing) : '', c.owner || '', N.target == null ? null : N.target, N.budget != null ? N.budget : t ? t.current : null, N.ap != null ? N.ap : null,
        progress(c), waiting(c), c.note || '', c.created_at ? R.dmy(c.created_at.slice(0, 10)) : '', c.updated_at ? R.dmy(c.updated_at.slice(0, 10)) : '']; });
    return { key: 'campaigns', title: C.plng.title, header: [Kc.name, 'id', Kc.approval, Kc.status, C.xl.start, C.xl.endCampaign, Kc.days, Kc.endMkt, Kc.owner, Kc.targetV, C.plng.cols2.budget, 'A&P %', C.plng.cols.progress, C.plng.cols.waiting, C.xl.note, C.xl.created, Kc.updated],
      cols: x.rows.length ? ['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'money', 'money', 'pct', 'text', 'text', 'text', 'text', 'text'] : [], rows };
  }

  const BUILD = { campaigns: campaignsTable, kpi: kpiTable, pnlmonth: pnlMonthTable, attention: attentionTable, timeline: timelineTable,
    s_kpi: sKpiTable, s_month: sMonthTable, s_table: sTableTable, s_channel: sChannelTable, s_sku: sSkuTable,
    c_kpi: cKpiTable, c_month: cMonthTable, c_channel: cChannelTable, c_sku: cSkuTable,
    w_kpi: wKpiTable, w_chart: wChartTable, w_month: wMonthTable, w_table: wTableTable, w_budget: wBudgetTable, tracker: trackerTable, statement: statementTable, spendline: spendLineTable };
  const rowsFor = (w, x) => BUILD[w](x);
  const register = (key, fn) => { BUILD[key] = fn; };
  const tabTables = (tab, x) => TABS[tab].map(w => rowsFor(w, x));

  /* a table → a sheet: the scope (first sheet) · the title · the header (frozen) · rows · total · notes */
  function sheetOf(t, meta) {
    const out = [], cols = t.cols || [];
    if (meta) { meta.forEach(([k, v]) => out.push([{ v: k, bold: true }, v])); out.push([]); }
    out.push([{ v: t.title, bold: true }]); if (t.sub) out.push([t.sub]);
    out.push(t.header.map(h => ({ v: h, bold: true })));
    const freeze = out.length;
    const conv = (row, bold) => row.map((c, i) => {
      const o = c && typeof c === 'object' ? c : { v: c }, fmt = o.fmt || cols[i];
      const v = o.v == null || o.v === '' ? null : o.v;
      return v == null ? '' : { v, money: fmt === 'money', pct: fmt === 'pct', bold: bold || o.bold };
    });
    t.rows.forEach(r => out.push(conv(r)));
    if (t.total) out.push(conv(t.total, true));
    (t.notes || []).forEach(n => out.push([n]));
    return { name: t.title.split(' · ')[0].slice(0, 31), rows: out, widths: t.header.map((h, i) => (i ? Math.max(12, Math.min(28, String(h).length + 4)) : 38)), freeze };
  }
  const safeName = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const fileName = (base, scope, today, ext) => `${safeName(base)} - ${safeName(scope)} - ${today}.${ext}`;

  return { TABS, rowsFor, tabTables, register, sheetOf, fileName, safeName, daysText, timeText, topLines, skuRows, lineRowsFor };
})();
