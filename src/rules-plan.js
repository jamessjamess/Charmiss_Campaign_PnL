/* rules-plan.js — CR-05: the Campaign plan made in the web · its approval · budget requests · expenses · the budget track (pure: no DOM) → added to CP.rules
   CR-06: the Product Master (productChecks · productUse · planCogsDrift · skuFromMaster) · Timeline (runningByMonth).
   CR-07: the 6 steps (newSteps · stepState · canDoStep · stepChecks) · Other expenses · the Forecast of step 5 (planForecast · breakEven) ·
   budgetStatus · issues (one rule for every screen) · no expense items (D65).
   A plan: { id, rev, owner, approval, versions [{ v, status, submitted_*, decided_*, comment, skus, target, budget }], requests, log }.
   The Dashboard reads mergePlans(seed, plans, expenses): the seed schema of CR-01 (target → sales 'target' · Current budget → expenses 'budget' ·
   Committed + Paid → expenses 'actual'), so every rule of rules-pnl.js works on a web plan without a change. Roles as KOL (rules-roles.js):
   admin · manager · staff · viewer · accounting. */
Object.assign(CP.rules, (function (R) {
  'use strict';
  const C = CP.content;
  const isNum = R.isNum, num = v => (v === '' || v == null ? null : isNum(+v) ? +v : null);
  const CHANNELS = R.CHANNELS;

  /* ===================== people · roles (KOL rules-roles.js) ===================== */
  const ROLE_KEYS = ['admin', 'manager', 'staff', 'viewer', 'accounting'];
  const roleKey = r => { const k = String(r || '').trim().toLowerCase().replace(/^administrator$/, 'admin').replace(/^kol manager$/, 'manager'); return ROLE_KEYS.includes(k) ? k : 'viewer'; };
  const isMgr = a => !!a && (a.role === 'manager' || a.role === 'admin');
  const canDraft = a => !!a && (a.role === 'staff' || isMgr(a));
  /* CR-07 §10 — the departments: Brand · Sales · Marketing · Finance · Executive · Admin */
  const DEPTS = ['brand', 'sales', 'marketing', 'finance', 'executive', 'admin'];

  /* ===================== CR-07 §7 — the steps of a plan · CR-13 §7.1 (D121): 7 on the page — 1 · 2 · 3 · 4 Budget envelope (key env) · 5 Budget lines (4a 4b 4c) ·
     6 Forecast & summary (key 5) · 7 Review & submit (key 6) — the keys saved before stay (no migration) · a plan without env (made before CR-13) = env done ===================== */
  const STEP_KEYS = ['1', '2', '3', 'env', '4a', '4b', '4c', '5', '6'];
  /* the number a step shows (its key stays) */
  const STEP_NUM = { 1: '1', 2: '2', 3: '3', env: '4', '4a': '5a', '4b': '5b', '4c': '5c', 5: '6', 6: '7' };
  /* CR-12 §4.3 — the names of the steps are words of the page (C.step.names — Thai in Thai) */
  const STEP_NAMES = C.step.names;
  const STEP_DEPT = { 1: 'brand', 2: 'brand', 3: 'sales', env: 'brand', '4a': 'marketing', '4b': 'sales', '4c': 'finance', 5: 'finance', 6: 'brand' };
  const STEP_DUE = { 1: -75, 2: -60, 3: -50, env: -45, '4a': -40, '4b': -40, '4c': -40, 5: -35, 6: -30 };
  const STEP_TYPE = { '4a': 'marketing', '4b': 'sales', '4c': 'other' };
  const STEP_PAGE = { 1: 'details', 2: 'products', 3: 'target', env: 'envelope', '4a': 'budget', '4b': 'budget', '4c': 'budget', 5: 'forecast', 6: 'review' };
  /* the steps of a new plan: Brand steps = the owner · the others = the first person of that department · Due counted back from Start */
  function newSteps(start, owner, people) {
    const of = d => { const p = (people || []).find(x => x.active !== false && x.dept === d); return p ? p.name : owner; };
    return Object.fromEntries(STEP_KEYS.map(k => [k, { assignee: STEP_DEPT[k] === 'brand' ? owner : of(STEP_DEPT[k]), due: start ? R.addDays(start, STEP_DUE[k]) : null, status: 'not_started', done_at: null, by: null, refresh: false, none: false }]));
  }
  /* CR-13 — a plan made before the envelope step: env is done (its envelope = the lines of each group) */
  const autoEnv = (plan, k) => k === 'env' && !!plan && !!plan.steps && !plan.steps.env;
  const stepDone = (plan, k) => autoEnv(plan, k) || (!!plan && !!plan.steps && !!plan.steps[k] && plan.steps[k].status === 'done');
  /* a step is open when the steps before it are done: 2 after 1 · 3 after 2 · the envelope after 3 · the lines (4a 4b 4c) after the envelope ·
     the forecast (5) after 3 + the envelope + the lines · review (6) after all */
  const NEEDS = { 1: [], 2: ['1'], 3: ['2'], env: ['3'], '4a': ['env'], '4b': ['env'], '4c': ['env'], 5: ['3', 'env', '4a', '4b', '4c'], 6: ['1', '2', '3', 'env', '4a', '4b', '4c', '5'] };
  function stepState(plan, k, today) {
    const s = autoEnv(plan, k) ? { status: 'done', auto: true } : (plan && plan.steps && plan.steps[k]) || { status: 'not_started' }, td = today || R.todayISO(), wait = NEEDS[k].filter(x => !stepDone(plan, x));
    const open = !wait.length, due = s.due || null, late = !!due && s.status !== 'done' && due < td, soon = !!due && s.status !== 'done' && !late && R.dayDiff(due, td) <= 3;
    return { key: k, name: STEP_NAMES[k], dept: STEP_DEPT[k], assignee: s.assignee || null, due, status: s.status, open, waitFor: wait, overdue: late, soon, daysLate: late ? R.dayDiff(td, due) : 0,
      refresh: !!s.refresh, none: !!s.none, done_at: s.done_at, by: s.by, auto: !!s.auto, env: !!s.envChanged, num: STEP_NUM[k] };
  }
  /* the 6 dots of the Plans table (4 = its three groups) · what the plan waits on (the first step not done that is open) */
  function planProgress(plan, today) {
    const S = STEP_KEYS.map(k => stepState(plan, k, today)), waiting = plan && (plan.approval === 'draft' || plan.approval === 'returned') ? S.filter(s => s.status !== 'done' && s.open) : [];
    return { steps: S, done: S.filter(s => s.status === 'done').length, waiting, overdue: S.filter(s => s.overdue) };
  }
  /* who may edit / finish a step: its assignee · the owner · Admin — while the plan is a Draft or Returned and the step is open */
  function canDoStep(a, plan, k) {
    const no = why => ({ ok: false, why: why || '' }), P = C.plan.why;
    if (!a || !plan || a.active === false) return no();
    if (plan.approval !== 'draft' && plan.approval !== 'returned') return no(plan.approval === 'submitted' ? P.locked : '');
    const s = stepState(plan, k), who = a.role === 'admin' || plan.owner === a.name || s.assignee === a.name;
    if (!who) return no(P.notYours(s.assignee || '—'));
    if (!s.open) return no(P.waitStep(s.waitFor.map(x => STEP_NAMES[x]).join(' · ')));
    return { ok: true, why: '' };
  }

  /* ===================== a plan ===================== */
  const PLAN_STATES = ['draft', 'submitted', 'approved', 'returned', 'rejected'];
  const REQ_STATES = ['pending', 'approved', 'returned', 'rejected', 'withdrawn'];
  const emptyVersion = v => ({ v, status: 'draft', submitted_at: null, submitted_by: null, decided_at: null, decided_by: null, comment: '', skus: [], target: [], budget: [],
    details: { objective: '', brand: 'Charmiss', category: '', channels: R.CHANNELS.slice() }, forecast: { ach: { MT: 1, TT: 1, ECOM: 1 }, worst: 0.8, best: 1.1, note: '', comment: '' }, review: { comment: '' } });
  function newPlan(id, owner, at, by) { return { id, rev: 0, source: 'web', owner, approval: 'draft', versions: [emptyVersion(1)], requests: [], log: [{ at, by, action: 'created', detail: '' }] }; }
  const working = p => (p && p.versions && p.versions.length ? p.versions[p.versions.length - 1] : null);
  const approvedVersion = p => (p && p.versions ? p.versions.slice().reverse().find(v => v.status === 'approved') || null : null);
  const skuMap = ver => new Map(((ver && ver.skus) || []).map(s => [s.code, s]));
  const priceOf = (s, ch) => (s && s.price ? num(s.price[ch]) : null);
  /* ฿ of a target cell: the amount the row carries (an import · the Mock — a typed price may not give it exactly) else qty × the net price of its channel */
  const rowAmount = (r, s) => { if (isNum(r.amount)) return r.amount; const q = num(r.qty), p = priceOf(s, r.channel); return q != null && p != null ? q * p : null; };
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ===================== the numbers of a version (§5.1 · live while it is typed) ===================== */
  function planTotals(ver) {
    const sm = skuMap(ver), T = { skus: ((ver && ver.skus) || []).length, subs: 0, months: 0, qty: 0, target: 0, cogs: 0, mkt: 0, sls: 0, oth: 0, noPrice: 0,
      bySku: new Map(), byChannel: {}, byMonth: new Map(), byLine: new Map() };
    const subs = new Set(), months = new Set(), acc = (map, k, f) => { const o = map.get(k) || { qty: 0, amount: 0, cogs: 0, mkt: 0, sls: 0, oth: 0 }; f(o); map.set(k, o); };
    ((ver && ver.target) || []).forEach(r => {
      const q = num(r.qty) || 0, s = sm.get(r.code), a = rowAmount(r, s); if (!q && !a) return;
      subs.add(r.code + '|' + r.channel); months.add(r.month); T.qty += q;
      if (a == null) { T.noPrice++; return; }
      const cg = s && num(s.cogs) != null ? q * num(s.cogs) : 0;
      T.target += a; T.cogs += cg;
      acc(T.bySku, r.code, o => { o.qty += q; o.amount += a; o.cogs += cg; });
      const ch = T.byChannel[r.channel] || (T.byChannel[r.channel] = { qty: 0, amount: 0, cogs: 0 }); ch.qty += q; ch.amount += a; ch.cogs += cg;
      acc(T.byMonth, r.month, o => { o.qty += q; o.amount += a; o.cogs += cg; });
    });
    ((ver && ver.budget) || []).forEach(r => { const a = num(r.amount) || 0; if (!a) return; months.add(r.month);
      const g = r.type === 'marketing' ? 'mkt' : r.type === 'other' ? 'oth' : 'sls'; T[g] += a;
      acc(T.byLine, `${r.type}|${r.line}`, o => { o.amount += a; }); acc(T.byMonth, r.month, o => { o[g] += a; }); });
    T.subs = subs.size; T.months = months.size; T.budget = T.mkt + T.sls + T.oth; T.gp = T.target - T.cogs;
    T.gpPct = R.ratio(T.gp, T.target); T.ap = R.ratio(T.budget, T.target); T.profit = T.gp - T.budget; T.margin = R.ratio(T.profit, T.target); T.roi = R.ratio(T.profit, T.budget);
    return T;
  }
  /* §5.1 — the checks before Submit (✕ blocks) and the warnings (⚠ do not) */
  function planChecks(ver, c) {
    const W = C.plan.checks, T = planTotals(ver), errs = [], warns = [], sm = skuMap(ver);
    const s0 = c && c.start ? R.ym(c.start) : null, e0 = c && c.end ? R.ym(c.end) : null, b0 = s0 ? R.addMonths(s0, -1) : null;
    const ok = (key, pass, detail) => errs.push({ key, ok: !!pass, text: W[key], detail: detail || '' });
    ok('sku', T.skus > 0);
    const noCogs = ((ver && ver.skus) || []).filter(s => num(s.cogs) == null).map(s => s.code);
    const usedCh = new Map(); ((ver && ver.target) || []).forEach(r => { if (num(r.qty) > 0) { const k = r.code; if (!usedCh.has(k)) usedCh.set(k, new Set()); usedCh.get(k).add(r.channel); } });
    const noPrice = []; usedCh.forEach((chs, code) => chs.forEach(ch => { if (!isNum(priceOf(sm.get(code), ch)) && !((ver.target || []).some(r => r.code === code && r.channel === ch && isNum(r.amount)))) noPrice.push(`${code} ${ch}`); }));
    ok('cogsPrice', T.skus > 0 && !noCogs.length && !noPrice.length, noCogs.map(x => `${x} COGS`).concat(noPrice).join(' · '));
    ok('target', T.target > 0 || T.qty > 0);
    ok('budget', T.budget > 0);
    const outT = ((ver && ver.target) || []).filter(r => num(r.qty) && s0 && (r.month < s0 || r.month > e0)).length, outB = ((ver && ver.budget) || []).filter(r => num(r.amount) && s0 && (r.month < b0 || r.month > e0)).length;
    ok('months', !outT && !outB, outT + outB ? W.monthsOut(outT + outB) : '');
    const neg = ((ver && ver.target) || []).filter(r => num(r.qty) < 0).length + ((ver && ver.budget) || []).filter(r => num(r.amount) < 0).length;
    ok('negative', !neg, neg ? W.negOut(neg) : '');
    if (T.ap != null && T.ap > 0.2) warns.push({ key: 'ap', text: W.apHigh(R.pct(T.ap)) });
    if (T.gpPct != null && T.target > 0 && T.gpPct < 0.5) warns.push({ key: 'gp', text: W.gpLow(R.pct(T.gpPct)) });
    if (T.target > 0 && !T.sls) warns.push({ key: 'sls', text: W.noSales });
    /* CR-13 F2 — only the months up to End marketing (after it, no marketing is the plan) · in time order · as ranges (Jul – Dec 2025) */
    const em = c && c.end_marketing ? R.ym(c.end_marketing) : null, noMkt = [...T.byMonth].filter(([m, o]) => o.amount > 0 && !o.mkt && (!em || m <= em)).map(([m]) => m).sort();
    if (T.target > 0 && noMkt.length) warns.push({ key: 'mkt', text: W.noMkt(monthRanges(noMkt)) });
    return { errs, warns, ok: errs.every(x => x.ok), totals: T };
  }
  /* CR-07 §7 — the checks of one step (the side panel · Mark step done needs every ✓) */
  function stepChecks(plan, k, c) {
    const W = C.plan.checks, ver = working(plan), d = (ver && ver.details) || {}, T = planTotals(ver), out = [], ok = (key, pass, detail) => out.push({ key, ok: !!pass, text: W[key] || key, detail: detail || '' });
    const chs = d.channels && d.channels.length ? d.channels : R.CHANNELS, s0 = c && c.start ? R.ym(c.start) : null, e0 = c && c.end ? R.ym(c.end) : null, b0 = s0 ? R.addMonths(s0, -1) : null;
    if (k === '1') {
      ok('name', c && String(c.name || '').trim()); ok('objective', String(d.objective || '').trim().length > 0); ok('channels', (d.channels || []).length > 0);
      ok('dates', c && R.isISODate(c.start) && R.isISODate(c.end) && c.end >= c.start && (!c.end_marketing || (c.end_marketing >= c.start && c.end_marketing <= c.end)));
      ok('assigned', STEP_KEYS.every(x => plan.steps && plan.steps[x] && plan.steps[x].assignee && plan.steps[x].due));
    } else if (k === '2') {
      ok('sku', T.skus > 0);
      const miss = ((ver && ver.skus) || []).flatMap(s => chs.filter(ch => !isNum(priceOf(s, ch))).map(ch => `${s.code} ${ch}`)).concat(((ver && ver.skus) || []).filter(s => num(s.cogs) == null).map(s => `${s.code} COGS`));
      ok('skuPrice', T.skus > 0 && !miss.length, miss.slice(0, 4).join(' · ') + (miss.length > 4 ? ' …' : ''));
    } else if (k === '3') {
      ok('target', T.target > 0 || T.qty > 0);
      const out1 = ((ver && ver.target) || []).filter(r => num(r.qty) && s0 && (r.month < s0 || r.month > e0)).length, neg = ((ver && ver.target) || []).filter(r => num(r.qty) < 0).length;
      ok('monthsT', !out1, out1 ? W.monthsOut(out1) : ''); ok('negative', !neg, neg ? W.negOut(neg) : '');
    } else if (k === 'env') {
      /* CR-13 §7.4 — every group has an envelope or "No expense" (the lines may differ from it — D122) */
      const E = envOf(ver); ok('envelope', ENV_GROUPS.every(g => E[g].amount > 0 || E[g].none), ENV_GROUPS.filter(g => !(E[g].amount > 0 || E[g].none)).map(g => C.plan.grid.groups[g]).join(' · '));
    } else if (STEP_TYPE[k]) {
      const rows = ((ver && ver.budget) || []).filter(r => r.type === STEP_TYPE[k] && num(r.amount)), sumG = rows.reduce((x, r) => x + (num(r.amount) || 0), 0), st = plan.steps && plan.steps[k];
      ok('group', sumG > 0 || (st && st.none), sumG > 0 ? R.baht(sumG) : '');
      const out2 = rows.filter(r => s0 && (r.month < b0 || r.month > e0)).length, neg = rows.filter(r => num(r.amount) < 0).length;
      ok('monthsB', !out2, out2 ? W.monthsOut(out2) : ''); ok('negative', !neg, neg ? W.negOut(neg) : '');
    } else if (k === '5') {
      ok('before5', ['3', 'env', '4a', '4b', '4c'].every(x => stepDone(plan, x)));
      ok('fcComment', String(((ver && ver.forecast) || {}).comment || '').trim().length > 0);
    } else if (k === '6') {
      ok('before6', ['1', '2', '3', 'env', '4a', '4b', '4c', '5'].every(x => stepDone(plan, x)));
      const pc = planChecks(ver, c); ok('allChecks', pc.ok, pc.errs.filter(x => !x.ok).map(x => x.text).join(' · '));
    }
    return { list: out, ok: out.every(x => x.ok) };
  }

  /* CR-13 F2 — months as ranges: [2025-07 … 2025-12] → "Jul – Dec 2025" · a gap starts a new range · another year → "Nov 2025 – Jan 2026" */
  function monthRanges(ms) {
    const out = []; let a = null, b = null;
    const put = () => { if (!a) return; out.push(a === b ? R.monthName(a) : a.slice(0, 4) === b.slice(0, 4) ? `${R.monthShort(a)} – ${R.monthName(b)}` : `${R.monthName(a)} – ${R.monthName(b)}`); };
    ms.slice().sort().forEach(m => { if (b && R.addMonths(b, 1) === m) b = m; else { put(); a = b = m; } }); put();
    return out.join(', ');
  }
  /* ===================== CR-13 §7.4 (D122) — the budget envelope of a version: a group = { pct of the target, amount, phasing, none } · a version made before
     CR-13 (no envelope) = the lines of each group (derived) · the envelope only guides — the budget of the plan = Σ lines ===================== */
  const ENV_GROUPS = ['marketing', 'sales', 'other'], ENV_PHASE = { marketing: 'mkt', sales: 'sales', other: 'even' };
  function envOf(ver) {
    const T = planTotals(ver), E = (ver && ver.envelope) || null, lines = { marketing: T.mkt, sales: T.sls, other: T.oth };
    return Object.fromEntries(ENV_GROUPS.map(g => { const e = E && E[g] ? E[g] : null, amount = e ? num(e.amount) || 0 : lines[g];
      return [g, { amount, pct: R.ratio(amount, T.target), phasing: (e && e.phasing) || ENV_PHASE[g], none: !!(e && e.none), lines: lines[g], left: amount - lines[g], derived: !e }]; }));
  }
  /* the weights of the months of a phasing: even (Start … End) · mkt (Start … End marketing) · sales (the target of each month) · custom ({ month: weight }) */
  function phaseWeights(months, c, phasing, targetByMonth, custom) {
    const s = R.ym(c.start), e = R.ym(c.end), em = c.end_marketing ? R.ym(c.end_marketing) : e;
    const w = months.map(m => (phasing === 'mkt' ? (m >= s && m <= em ? 1 : 0) : phasing === 'sales' ? (targetByMonth && targetByMonth.get(m)) || 0 : phasing === 'custom' ? +((custom || {})[m] || 0) : m >= s && m <= e ? 1 : 0));
    const t = w.reduce((x, y) => x + y, 0); return t > 0 ? w.map(x => x / t) : months.map(m => (m >= s && m <= e ? 1 : 0)).map((x, i, a) => x / Math.max(1, a.reduce((p, q) => p + q, 0)));
  }
  /* an amount spread on weights, whole baht, the rounding on the last month that has weight → Σ = the amount exactly */
  function spreadWhole(total, w) {
    const out = w.map(x => Math.round(total * x)), d = Math.round(total) - out.reduce((a, b) => a + b, 0), i = w.map(x => x > 0).lastIndexOf(true);
    if (i >= 0) out[i] += d; return out;
  }

  /* ===================== CR-07 §8 (D71) — the Forecast of step 5: achievement × target · Worst / Base / Best · Break-even ===================== */
  /* f = { ach { MT, TT, ECOM } (1 = 100%), worst 0.8, best 1.1 } · the budget stays (it is the plan) · COGS follows revenue by channel (the SKU mix) */
  function planForecast(ver) {
    const T = planTotals(ver), f = Object.assign({ ach: {}, worst: 0.8, best: 1.1 }, (ver && ver.forecast) || {}), chs = Object.keys(T.byChannel);
    const ach = k => (isNum(+f.ach[k]) && f.ach[k] !== '' && f.ach[k] != null ? +f.ach[k] : 1);
    const baseRev = chs.reduce((s, k) => s + T.byChannel[k].amount * ach(k), 0), baseCogs = chs.reduce((s, k) => s + T.byChannel[k].cogs * ach(k), 0);
    const set = (rev, cogs) => { const gp = rev - cogs, profit = gp - T.budget; return { rev, cogs, gp, gpPct: R.ratio(gp, rev), mkt: T.mkt, sls: T.sls, oth: T.oth, spend: T.budget, profit, margin: R.ratio(profit, rev), roi: R.ratio(profit, T.budget), ap: R.ratio(T.budget, rev) }; };
    const plan = set(T.target, T.cogs), base = set(baseRev, baseCogs), worst = set(baseRev * f.worst, baseCogs * f.worst), best = set(baseRev * f.best, baseCogs * f.best);
    const be = breakEven(T), warns = [];
    if (worst.profit < 0) warns.push({ key: 'worstLoss', v: worst.profit });
    if (base.ap != null && base.ap > 0.2) warns.push({ key: 'apHigh', v: base.ap });
    if (be.ach != null && be.ach > 0.7) warns.push({ key: 'beHigh', v: be.ach });
    const curve = []; for (let a = 0.5; a <= 1.2001; a += 0.05) curve.push({ a: Math.round(a * 100) / 100, profit: T.target * a * (T.gpPct || 0) - T.budget });
    return { totals: T, f, achOf: ach, baseAch: R.ratio(baseRev, T.target), plan, worst, base, best, breakEven: be, warns, curve };
  }
  /* the revenue that pays the budget back at the plan's GP % · as a share of the target */
  function breakEven(T) { const g = T.gpPct; const rev = g && g > 0 ? T.budget / g : null; return { rev, ach: rev == null ? null : R.ratio(rev, T.target) }; }

  /* §5.4 Compare v1 ↔ v2 — target by SKU (qty · ฿) and budget by line, a → b */
  function planDiff(a, b) {
    const ta = planTotals(a), tb = planTotals(b), codes = [...new Set([...ta.bySku.keys(), ...tb.bySku.keys()])], lines = [...new Set([...ta.byLine.keys(), ...tb.byLine.keys()])];
    const nm = new Map(((b && b.skus) || []).concat((a && a.skus) || []).map(s => [s.code, s.nickname || s.name || s.code]));
    const z = { qty: 0, amount: 0 };
    return { skus: codes.map(k => { const x = ta.bySku.get(k) || z, y = tb.bySku.get(k) || z; return { code: k, name: nm.get(k) || k, qtyA: x.qty, qtyB: y.qty, amtA: x.amount, amtB: y.amount, d: y.amount - x.amount }; }).filter(r => r.qtyA !== r.qtyB || Math.abs(r.d) > 0.5),
      lines: lines.map(k => { const [type, line] = k.split('|'), x = (ta.byLine.get(k) || z).amount, y = (tb.byLine.get(k) || z).amount; return { type, line, a: x, b: y, d: y - x }; }).filter(r => Math.abs(r.d) > 0.5),
      totals: { target: [ta.target, tb.target], budget: [ta.budget, tb.budget], ap: [ta.ap, tb.ap], profit: [ta.profit, tb.profit], oth: [ta.oth, tb.oth] } };
  }

  /* ===================== who may do what (§3 · §6 · KOL can(user, action)) ===================== */
  /* → { ok, why } · why = the words of a disabled button (only the important ones show — the rest are hidden) */
  function canDo(action, a, plan, x) {
    x = x || {};
    const no = why => ({ ok: false, why: why || '' }), yes = { ok: true, why: '' };
    if (!a || a.active === false) return no();
    const P = C.plan.why, st = plan ? plan.approval : null, own = !!plan && plan.owner === a.name, w = working(plan);
    switch (action) {
      case 'create': return a.dept === 'brand' || a.role === 'admin' ? yes : no();
      case 'edit': case 'submit':
        if (!canDraft(a) || !(own || isMgr(a))) return no();
        return st === 'draft' || st === 'returned' ? yes : no(st === 'submitted' ? P.locked : '');
      case 'withdraw': return st === 'submitted' && w && (w.submitted_by === a.name || own) ? yes : no();
      case 'approve': case 'return': case 'reject': case 'revise':
        if (!isMgr(a) || st !== 'submitted') return no();
        return w && w.submitted_by === a.name ? no(P.self) : yes;
      /* CR-13 §2.4 — Duplicate as draft: a rejected plan or an approved one */
      case 'duplicate': return (st === 'rejected' || st === 'approved') && canDraft(a) ? yes : no();
      case 'details': return canDraft(a) && (own || isMgr(a)) && st !== 'rejected' ? yes : no();
      case 'request': return st === 'approved' && x.live && canDraft(a) ? yes : no();
      /* CR-13 §3 (D117) — Budget change: as before (the campaign not closed / cancelled — an ended one still takes late invoices) · Period change · Close: the owner or Admin */
      case 'change': { if (st !== 'approved' || x.closed || x.cancelled) return no(C.cpg.cantRequest);
        if (x.kind === 'budget') return canDraft(a) ? yes : no(); return own || a.role === 'admin' ? yes : no(C.cpg.onlyOwner); }
      case 'reopen': return a.role === 'admin' && x.closed ? yes : no();
      case 'details.approved': return st === 'approved' && !x.closed && (own || a.role === 'admin') ? yes : no(x.closed ? C.cpg.d.readOnly : '');
      case 'request.decide': { const q = x.req; if (!isMgr(a) || !q || q.status !== 'pending') return no(); return q.by === a.name ? no(P.selfReq) : yes; }
      case 'request.withdraw': { const q = x.req; return q && q.by === a.name && (q.status === 'pending' || q.status === 'returned') ? yes : no(); }
      case 'request.edit': { const q = x.req; return q && q.by === a.name && q.status === 'returned' ? yes : no(); }
      case 'people': return a.role === 'admin' ? yes : no();
      /* CR-06 §7.2 (D58) — the Product Master: Admin · Manager add / edit / discontinue · delete = Admin, a product never used */
      case 'product': return isMgr(a) ? yes : no();
      case 'product.delete': return a.role === 'admin' && !x.used ? yes : no();
      default: return no();
    }
  }

  /* ===================== the plan's steps (pure: a copy in, the new plan out · rev is the store's) ===================== */
  /* act = { type, by, at, ... } · types: save (skus · target · budget · details) · submit · withdraw · approve · return · reject · duplicate-into ·
     req.new · req.edit · req.withdraw · req.approve · req.return · req.reject · log */
  function planAct(plan0, act) {
    const p = clone(plan0), L = (action, detail) => p.log.push({ at: act.at, by: act.by, action, detail: detail || '' });
    let w = working(p);
    switch (act.type) {
      case 'save': {
        if (p.approval === 'returned' && w && w.status === 'returned') { const nv = clone(w); Object.assign(nv, { v: w.v + 1, status: 'draft', submitted_at: null, submitted_by: null, decided_at: null, decided_by: null, comment: '' }); p.versions.push(nv); w = nv; p.approval = 'draft'; }
        ['skus', 'target', 'budget', 'details', 'forecast', 'review', 'builder', 'envelope'].forEach(k => { if (act[k]) w[k] = act[k]; });
        /* CR-07 §7 — the step edited goes (back) to In progress · a change before step 5 when 5 is done → 5 Needs refresh (D70) */
        (act.steps || (act.step ? [act.step] : [])).forEach(k => { const s = p.steps && p.steps[k]; if (!s) return;
          if (s.status !== 'in_progress') Object.assign(s, { status: 'in_progress', done_at: null }); if (k === '5') s.refresh = false;
          if (['1', '2', '3', 'env', '4a', '4b', '4c'].includes(k) && p.steps['5'] && (p.steps['5'].status === 'done' || p.steps['5'].status === 'in_progress') && p.steps['5'].done_at !== undefined) {
            if (p.steps['5'].status === 'done') Object.assign(p.steps['5'], { status: 'in_progress', refresh: true, done_at: null }); }
          /* CR-13 §7.1 — the target changed → the envelope Needs refresh · the envelope changed → the lines say "Envelope changed" (not reset) */
          if (k === '3' && p.steps.env && p.steps.env.status === 'done') Object.assign(p.steps.env, { status: 'in_progress', refresh: true, done_at: null });
          if (k === 'env') ['4a', '4b', '4c'].forEach(x => { if (p.steps[x] && p.steps[x].status !== 'not_started') p.steps[x].envChanged = true; });
          if (['4a', '4b', '4c'].includes(k) && p.steps[k]) p.steps[k].envChanged = false;
          if (p.steps['6'] && p.steps['6'].status === 'done') Object.assign(p.steps['6'], { status: 'not_started', done_at: null }); });
        L('saved', act.detail || `v${w.v}`); break;
      }
      case 'step.done': { const s = p.steps[act.step]; Object.assign(s, { status: 'done', done_at: act.at, by: act.by, refresh: false, none: !!act.none }); L('step.done', `${STEP_NAMES[act.step]}${act.none ? ' · ' + C.plan.noExpense : ''}`); break; }
      case 'step.assign': { const s = p.steps[act.step]; const old = `${s.assignee || '—'} · ${s.due ? R.dmy(s.due) : '—'}`;
        if (act.assignee != null) s.assignee = act.assignee; if (act.due != null) s.due = act.due; L('step.assign', `${STEP_NAMES[act.step]}: ${old} → ${s.assignee || '—'} · ${s.due ? R.dmy(s.due) : '—'}`); break; }
      case 'submit': {
        if (p.approval === 'returned' && w.status === 'returned') { const nv = clone(w); Object.assign(nv, { v: w.v + 1 }); p.versions.push(nv); w = nv; }
        Object.assign(w, { status: 'submitted', submitted_at: act.at, submitted_by: act.by, decided_at: null, decided_by: null, comment: '' }); p.approval = 'submitted';
        if (p.steps && p.steps['6']) Object.assign(p.steps['6'], { status: 'done', done_at: act.at, by: act.by });
        L(w.v > 1 ? 'resubmitted' : 'submitted', `v${w.v}`); break;
      }
      case 'withdraw': Object.assign(w, { status: 'draft', submitted_at: null, submitted_by: null }); p.approval = 'draft'; L('withdrawn', `v${w.v}`); break;
      case 'approve': case 'return': case 'reject': case 'revise': {
        const st = { approve: 'approved', return: 'returned', reject: 'rejected', revise: 'returned' }[act.type];
        Object.assign(w, { status: st, decided_at: act.at, decided_by: act.by, comment: act.comment || '', revise: act.type === 'revise' ? (act.steps || []).slice() : undefined }); p.approval = st;
        /* CR-07 §7 (D70) — Revise: the steps chosen go back to their people (Returned) · step 5 Needs refresh · step 6 again */
        if (act.type === 'revise' && p.steps) { (act.steps || []).forEach(k => { if (p.steps[k]) Object.assign(p.steps[k], { status: 'returned', done_at: null }); });
          if (!(act.steps || []).includes('5') && p.steps['5']) Object.assign(p.steps['5'], { status: 'in_progress', refresh: true, done_at: null });
          if (p.steps['6']) Object.assign(p.steps['6'], { status: 'not_started', done_at: null }); }
        L(act.type === 'revise' ? 'revise' : st, `v${w.v}${act.type === 'revise' ? ' · ' + (act.steps || []).map(k => STEP_NAMES[k]).join(' · ') : ''}${act.comment ? ' · ' + act.comment : ''}`); break;
      }
      case 'req.new': {
        const no = (p.requests.reduce((m, q) => Math.max(m, q.no), 0) || 0) + 1;
        /* CR-13 — a period change ({ period: { from, to, moves } }) · a close request ({ close: { early, close_date, note, checks, moves } }) · else a budget change */
        if (act.kind === 'period' || act.kind === 'close') {
          p.requests.push({ no, type: act.kind, status: 'pending', reason: act.reason, lines: [], period: act.period || null, close: act.close || null, by: act.by, at: act.at, decided_by: null, decided_at: null, comment: '' });
          L(act.kind, `#${no} ${reqWords(p.requests[p.requests.length - 1])}`); break; }
        p.requests.push({ no, type: requestType(act.lines), status: 'pending', reason: act.reason, lines: act.lines, by: act.by, at: act.at, decided_by: null, decided_at: null, comment: '' });
        L('request', `#${no} ${requestType(act.lines)} ${R.baht(sumLines(act.lines))}`); break;
      }
      case 'req.edit': { const q = p.requests.find(x => x.no === act.no);
        if (q.type === 'period' || q.type === 'close') { Object.assign(q, { reason: act.reason, period: act.period || q.period, close: act.close || q.close, status: 'pending', at: act.at, decided_by: null, decided_at: null, comment: '' }); L(q.type, `#${q.no} ${reqWords(q)}`); break; }
        Object.assign(q, { reason: act.reason, lines: act.lines, type: requestType(act.lines), status: 'pending', at: act.at, decided_by: null, decided_at: null, comment: '' }); L('request', `#${q.no} resubmitted`); break; }
      case 'req.withdraw': { const q = p.requests.find(x => x.no === act.no); q.status = 'withdrawn'; L(q.type === 'period' || q.type === 'close' ? q.type + '.withdrawn' : 'request.withdrawn', `#${q.no}`); break; }
      case 'req.approve': case 'req.return': case 'req.reject': {
        const q = p.requests.find(x => x.no === act.no), st = { 'req.approve': 'approved', 'req.return': 'returned', 'req.reject': 'rejected' }[act.type];
        Object.assign(q, { status: st, decided_by: act.by, decided_at: act.at, comment: act.comment || '' });
        if (q.type === 'period') { L('period.' + st, `#${q.no} ${reqWords(q)}${act.comment ? ' · ' + act.comment : ''}`); break; }
        if (q.type === 'close') {
          /* §5.3 (D120) — Closed: read only · the unused budget written down, never released */
          if (st === 'approved') p.closure = { status: 'closed', closed_at: act.at, closed_by: act.by, note: (q.close && q.close.note) || '', unused: q.close && q.close.checks ? q.close.checks.unused : null, early: !!(q.close && q.close.early), req: q.no };
          L(st === 'approved' ? 'closed' : 'close.' + st, `#${q.no} ${reqWords(q)}${act.comment ? ' · ' + act.comment : ''}`); break; }
        L('request.' + st, `#${q.no} ${R.baht(sumLines(q.lines))}${act.comment ? ' · ' + act.comment : ''}`); break;
      }
      /* CR-13 §2.3 (D115) — the details of an approved plan (Name · Brand · Category · Objective · Channels · Owner): no approval, in the history */
      case 'details': { const v = approvedVersion(p) || w, ch = [];
        Object.entries(act.details || {}).forEach(([k, val]) => { const old = v.details[k]; if (JSON.stringify(old) !== JSON.stringify(val)) { ch.push(`${C.cpg.d.f[k] || k}: ${fmtD(old)} → ${fmtD(val)}`); v.details[k] = val; } });
        if (act.owner && act.owner !== p.owner) { ch.push(`${C.cpg.d.f.owner}: ${p.owner || '—'} → ${act.owner}`); p.owner = act.owner; }
        if (act.name && act.oldName && act.name !== act.oldName) ch.unshift(`${C.cpg.d.f.name}: ${act.oldName} → ${act.name}`);
        if (ch.length) L('details', ch.join(' · ')); break; }
      /* §5.3 (D119) — Admin › Reopen: no approval · a reason · Ended · to close again */
      case 'reopen': p.closure = { status: 'open', reopened_at: act.at, reopened_by: act.by, reason: act.reason || '' }; L('reopened', act.reason || ''); break;
      case 'log': L(act.action, act.detail); break;
      default: throw new Error('unknown step ' + act.type);
    }
    return p;
  }

  /* CR-13 — the words of a period / close request in the history (the dates · the close date · the unused budget) */
  const fmtD = v => (Array.isArray(v) ? v.join(' · ') : v == null || v === '' ? '—' : String(v));
  function reqWords(q) {
    const W = C.cpg.rq;
    if (q.type === 'period' && q.period) { const a = q.period.from, b = q.period.to, out = [];
      if (a.start !== b.start) out.push(W.sumStart(R.dmy(a.start), R.dmy(b.start)));
      if ((a.end_marketing || '') !== (b.end_marketing || '')) out.push(W.sumMkt(a.end_marketing ? R.dmy(a.end_marketing) : '—', b.end_marketing ? R.dmy(b.end_marketing) : '—'));
      if (a.end !== b.end) out.push(W.sumPeriod(R.dmy(a.end), R.dmy(b.end)));
      return out.join(' · '); }
    if (q.type === 'close' && q.close) { const u = q.close.checks && q.close.checks.unused != null ? R.baht(q.close.checks.unused) : '—'; return q.close.early ? W.sumEarly(R.dmy(q.close.close_date), u) : W.sumClose(u); }
    return '';
  }

  /* ===================== budget requests (§7) ===================== */
  const sumLines = lines => (lines || []).reduce((s, l) => s + (num(l.amount) || 0), 0);
  const requestType = lines => { const t = sumLines(lines); return Math.abs(t) < 0.5 ? 'reallocation' : t > 0 ? 'increase' : 'release'; };
  /* Impact of the lines on a Campaign (merged seed): Current budget · A&P % · Plan profit before → after · each line × month: current · committed ·
     remaining before → after · a − below committed = an error */
  function requestImpact(seed, cid, lines) {
    const M = R.model(seed), cm = M.cells.get(cid) || new Map(), cur = { budget: 0, target: 0, cogs: 0 }, by = new Map(), lineTot = new Map();
    cm.forEach((c, m) => { cur.target += c.rev[0] || 0; cur.cogs += c.cogs[0] || 0; cur.budget += (c.mkt[0] || 0) + (c.sls[0] || 0);
      ['marketing', 'sales'].forEach(t => c.lines[t].forEach((v, line) => { by.set(`${t}|${line}|${m}`, { cur: v[0] || 0, com: v[1] || 0 }); const k = `${t}|${line}`, o = lineTot.get(k) || { cur: 0, com: 0 }; o.cur += v[0] || 0; o.com += v[1] || 0; lineTot.set(k, o); })); });
    const add = sumLines(lines), after = cur.budget + add, gp = cur.target - cur.cogs;
    const rows = (lines || []).map(l => { const k = `${l.type}|${l.line}|${l.month}`, o = by.get(k) || { cur: 0, com: 0 }, t = lineTot.get(`${l.type}|${l.line}`) || { cur: 0, com: 0 }, a = num(l.amount) || 0;
      return Object.assign({}, l, { cur: o.cur, com: o.com, before: o.cur - o.com, after: o.cur + a - o.com, lineCur: t.cur, lineCom: t.com, err: a < 0 && o.cur + a < o.com - 0.5 }); });
    return { type: requestType(lines), total: add, before: cur.budget, after, ap: [R.ratio(cur.budget, cur.target), R.ratio(after, cur.target)], profit: [gp - cur.budget, gp - after], rows, ok: rows.every(r => !r.err) && (lines || []).length > 0 };
  }

  /* ===================== CR-07 (D65) — no expense items: the Spend actual is the seed's own rows (archive/v0.6-expenses) ===================== */

  /* ===================== the budget track (§9 · KOL Budget · Committed · Used % · Remaining · Pending) ===================== */
  /* the Campaigns of the scope, the months of the period: Original · Changes (approved requests) · Current · Committed (Committed + Paid) · Paid ·
     Open (committed, not paid) · Remaining · Pending (requests waiting) · Used % = Committed ÷ Current · Elapsed % (the Campaign's time) ·
     Spend vs time = Used % − Elapsed % (points) · To date = the current budget scheduled to today (this month its share) · by line */
  function budgetTrack(seed, o) {
    const S = R.scope(seed, o), M = S.M, inP = new Set(S.months), cur = R.ym(S.today), pend = seed.pending || [], rows = [];
    const blank = () => ({ original: 0, changes: 0, current: 0, committed: 0, paid: 0, hasPaid: false, pending: 0, toDate: 0, lines: new Map() });
    const exps = new Map(); (seed.expenses || []).forEach(r => { if (!inP.has(r.month)) return; if (!exps.has(r.campaign_id)) exps.set(r.campaign_id, []); exps.get(r.campaign_id).push(r); });
    S.ids.forEach(id => {
      const c = M.byId.get(id), t = blank(), line = (ty, ln) => { const k = `${ty}|${ln}`; if (!t.lines.has(k)) t.lines.set(k, Object.assign(blank(), { type: ty, line: ln })); return t.lines.get(k); };
      (exps.get(id) || []).forEach(r => {
        /* CR-09 M6 — an Other line stays in Other (it fell into Sales before: Contingency · Registration & FDA under Sales) · the totals do not move */
        const a = r.amount || 0, ty = r.type === 'marketing' || r.type === 'other' ? r.type : 'sales', L = line(ty, r.line);
        if (r.scenario === 'budget') { [t, L].forEach(x => { if (r.src === 'req') x.changes += a; else x.original += a; x.current += a; x.toDate += r.month < cur ? a : r.month === cur ? a * R.toDateShare(r.month, S.today) : 0; }); }
        else { [t, L].forEach(x => { x.committed += a; if (isNum(r.paid)) { x.paid += r.paid; x.hasPaid = true; } }); }
      });
      pend.forEach(q => { if (q.campaign_id === id && inP.has(q.month)) { t.pending += q.amount; line(q.type, q.line).pending += q.amount; } });
      const tp = R.timeProgress(c, S.today), fin = x => Object.assign(x, { remaining: x.current - x.committed, open: x.hasPaid ? x.committed - x.paid : null, paidV: x.hasPaid ? x.paid : null,
        used: R.ratio(x.committed, x.current), elapsed: tp.pct, svt: R.ratio(x.committed, x.current) == null || tp.pct == null ? null : (R.ratio(x.committed, x.current) - tp.pct) * 100 });
      fin(t); t.lines = [...t.lines.values()].map(fin).sort((a, b) => (a.type === b.type ? 0 : a.type === 'marketing' ? -1 : 1) || b.current - a.current || a.line.localeCompare(b.line));
      rows.push(Object.assign(t, { c, id, status: R.statusOf(c, S.today), owner: c.owner || null, rev: M.cells.get(id) ? sumRev(M, id, S.months) : null }));
    });
    const tot = blank(); let wElapsed = 0;
    rows.forEach(r => { ['original', 'changes', 'current', 'committed', 'paid', 'pending', 'toDate'].forEach(k => { tot[k] += r[k]; }); if (r.hasPaid) tot.hasPaid = true; if (r.elapsed != null) wElapsed += r.elapsed * r.current; });
    tot.remaining = tot.current - tot.committed; tot.open = tot.hasPaid ? rows.filter(r => r.hasPaid).reduce((s, r) => s + r.open, 0) : null; tot.used = R.ratio(tot.committed, tot.current);
    tot.elapsed = tot.current ? wElapsed / tot.current : null; tot.svt = tot.used == null || tot.elapsed == null ? null : (tot.used - tot.elapsed) * 100;
    tot.rev = rows.reduce((s, r) => (r.rev == null ? s : (s || 0) + r.rev), null); tot.paidPnl = rows.some(r => !r.hasPaid && r.committed);
    return { scope: S, rows, total: tot };
  }
  function sumRev(M, id, months) { let s = null; const cm = M.cells.get(id); months.forEach(m => { const c = cm.get(m); if (c && c.rev[1] != null) s = (s || 0) + c.rev[1]; }); return s; }

  /* ===================== the plans over the seed (§12) ===================== */
  /* a Campaign: its approved version (target · SKUs) + the approved requests (Current budget) + its expenses (Committed + Paid) replace the seed's own
     target / budget / spend — its Sales actual stays (D46) · not approved = not on the Dashboard (D50) but in allCampaigns · pending = the lines of the
     requests waiting */
  const MERGED = new WeakMap();
  function mergePlans(seed, plans) {
    if (!seed) return seed;
    const P = plans || {};
    let byP = MERGED.get(seed); if (!byP) MERGED.set(seed, byP = new WeakMap()); if (byP.has(P)) return byP.get(P);
    const all = (seed.campaigns || []).map(c => {
      const plan = P[c.id] || null, appr = plan ? plan.approval : 'draft', ver = approvedVersion(plan), w = working(plan);
      /* CR-13 §4.3 · §5.1 — the dates of the approved period changes / close early, in the order they were decided · the closure of the plan */
      const dates = periodDates(plan, c);
      return Object.assign({}, c, dates, { plan: 'web', owner: (plan && plan.owner) || c.owner || null, approval: appr, v: w ? w.v : 1,
        vApproved: ver ? ver.v : null, submitted_at: w && w.status === 'submitted' ? w.submitted_at : null, closure: (plan && plan.closure) || null });
    });
    const live = all.filter(c => c.approval === 'approved' && approvedVersion(P[c.id]));
    const liveIds = new Set(live.map(c => c.id)), web = liveIds;
    const products = [], sales = [], exps = [], pending = [];
    (seed.products || []).forEach(p => { if (liveIds.has(p.campaign_id)) products.push(p); });
    (seed.sales || []).forEach(r => { if (liveIds.has(r.campaign_id) && (!web.has(r.campaign_id) || r.scenario === 'actual')) sales.push(r); });
    /* the Spend actual = the seed's own rows (D65) · the budget = the approved plan (below) */
    (seed.expenses || []).forEach(r => { if (liveIds.has(r.campaign_id) && r.scenario === 'actual') exps.push(r); });
    live.forEach(c => {
      const plan = P[c.id];
      if (web.has(c.id)) {
        const ver = approvedVersion(plan), sm = skuMap(ver), have = new Set(ver.skus.map(s => s.code));
        for (let i = products.length - 1; i >= 0; i--) if (products[i].campaign_id === c.id && have.has(products[i].key)) products.splice(i, 1);
        ver.skus.forEach(s => products.push({ campaign_id: c.id, key: s.code, code: s.code, name: s.name, nickname: s.nickname, group: s.group, category: s.category, cogs: num(s.cogs) }));
        const mvT = monthMoves(plan, 'T'), mvB = monthMoves(plan, 'B'), mT = m => mvT(m), mB = m => mvB(m);
        ver.target.forEach(r => { const q = num(r.qty) || 0, a = rowAmount(r, sm.get(r.code)); if (!q && !a) return;
          sales.push({ campaign_id: c.id, product_key: r.code, channel: r.channel, sub_channel: r.sub_channel || '', month: mT(r.month), scenario: 'target', qty: q, amount: a }); });
        ver.budget.forEach(r => { const a = num(r.amount) || 0; if (a) exps.push({ campaign_id: c.id, type: r.type, line: r.line, month: mB(r.month), scenario: 'budget', amount: a, src: 'orig' }); });
      }
      ((plan && plan.requests) || []).forEach(q => {
        if (q.status === 'approved') (q.lines || []).forEach(l => { const a = num(l.amount) || 0; if (a) exps.push({ campaign_id: c.id, type: l.type, line: l.line, month: monthMoves(plan, 'B', q.decided_at)(l.month), scenario: 'budget', amount: a, src: 'req', req: q.no }); });
        else if (q.status === 'pending') (q.lines || []).forEach(l => pending.push({ campaign_id: c.id, no: q.no, type: l.type, line: l.line, month: l.month, amount: num(l.amount) || 0 }));
      });
    });
    const out = Object.assign({}, seed, { campaigns: live, allCampaigns: all, products, sales, expenses: exps, pending, plans: P });
    byP.set(P, out);
    return out;
  }


  /* ===================== CR-13 §4.3 · §5.1 — the approved period changes of a plan (and a close early): the dates now · the months moved ===================== */
  const decidedOf = plan => ((plan && plan.requests) || []).filter(q => q.status === 'approved' && ((q.type === 'period' && q.period) || (q.type === 'close' && q.close && q.close.early)))
    .sort((a, b) => String(a.decided_at || '').localeCompare(String(b.decided_at || '')));
  function periodDates(plan, c) {
    const list = decidedOf(plan); if (!list.length) return {};
    const d = { start: c.start, end: c.end, end_marketing: c.end_marketing || null };
    list.forEach(q => { if (q.type === 'period') Object.assign(d, { start: q.period.to.start, end: q.period.to.end, end_marketing: q.period.to.end_marketing || null });
      else { d.end = q.close.close_date; if (d.end_marketing && d.end_marketing > d.end) d.end_marketing = d.end; } });
    return d;
  }
  /* the month a target (T) / budget (B) row of a month goes to after every approved move (in order) */
  function monthMoves(plan, kind) {
    const steps = decidedOf(plan).map(q => (q.type === 'period' ? q.period.moves : q.close.moves) || []).filter(x => x.length);
    if (!steps.length) return m => m;
    return m => steps.reduce((x, mv) => { const hit = mv.find(y => y.from === x); return hit ? (kind === 'T' ? hit.toT || x : hit.toB || x) : x; }, m);
  }

  /* ===================== CR-13 §4 (D116) — Period change · §5 (D118 – D120) — Close · Close early · the campaign state (Ended ≠ Closed) ===================== */
  /* to = { start, end_marketing, end } · the months that leave the period give their target to the nearest month inside (a later Start → the first month ·
     a shorter End → the last) and their budget the same (a budget may sit in the month before Start) · the months added get nothing · a month with
     sales actual (or spend actual) cannot leave (cut) → { moves [{ from, toT, toB, target, budget }], cut [{ m, sales, spend }] } */
  function periodMoves(seed, cid, to) {
    const M = R.model(seed), cm = M.cells.get(cid) || new Map(), first = R.ym(to.start), last = R.ym(to.end), before = R.addMonths(first, -1), moves = [], cut = [];
    cm.forEach((x, m) => {
      const outT = m < first || m > last, outB = m < before || m > last; if (!outT && !outB) return;
      const sales = x.rev[1] != null && outT ? x.rev[1] : null, spend = (x.mkt[1] != null || x.sls[1] != null || x.oth[1] != null) && outB ? (x.mkt[1] || 0) + (x.sls[1] || 0) + (x.oth[1] || 0) : null;
      if ((sales != null && Math.abs(sales) > 0.5) || (spend != null && Math.abs(spend) > 0.5)) cut.push({ m, sales: sales || 0, spend: spend || 0 });
      const target = outT ? x.rev[0] || 0 : 0, budget = outB ? (x.mkt[0] || 0) + (x.sls[0] || 0) + (x.oth[0] || 0) : 0;
      if (Math.abs(target) > 0.5 || Math.abs(budget) > 0.5) moves.push({ from: m, toT: outT ? (m < first ? first : last) : m, toB: outB ? (m < before ? before : last) : m, target, budget }); });
    return { moves: moves.sort((a, b) => a.from.localeCompare(b.from)), cut: cut.sort((a, b) => a.m.localeCompare(b.m)) };
  }
  /* the rows of a Campaign moved (pure: a new list) · kind T = target rows · B = budget rows */
  function moveRows(rows, cid, moves, kind) {
    if (!moves.length) return rows;
    const to = new Map(moves.map(x => [x.from, kind === 'T' ? x.toT : x.toB])), is = r => (kind === 'T' ? r.scenario === 'target' : r.scenario === 'budget');
    return (rows || []).map(r => (r.campaign_id === cid && is(r) && to.has(r.month) && to.get(r.month) !== r.month ? Object.assign({}, r, { month: to.get(r.month) }) : r));
  }
  /* Impact (§4.2): now → after — days · days left · Time gone · Ach % (the full target stays) · Pace · Status · the sales a month still needed · the moves ·
     "better only because longer" — the same rules (R.timeProgress · R.campaignPace · R.runRate) on a copy of the seed with the new dates and the rows moved */
  function periodImpact(seed, cid, to, today) {
    const td = today || R.todayISO(), c0 = (seed.campaigns || []).find(x => x.id === cid); if (!c0) return null;
    const mv = periodMoves(seed, cid, to), c1 = Object.assign({}, c0, { start: to.start, end: to.end, end_marketing: to.end_marketing || null });
    const s1 = Object.assign({}, seed, { campaigns: seed.campaigns.map(x => (x.id === cid ? c1 : x)), sales: moveRows(seed.sales, cid, mv.moves, 'T'), expenses: moveRows(seed.expenses, cid, mv.moves, 'B') });
    const side = (s, c) => { const tp = R.timeProgress(c, td), dl = R.daysLeft(c, td), sp = R.campaignPace(s, cid, td), rr = R.runRate(s, cid, { today: td });
      return { days: tp.total, left: dl.kind === 'left' ? dl.n : dl.kind === 'ended' ? 0 : tp.total, started: td >= c.start, ended: td > c.end, timeGone: sp ? sp.timeGone : null, ach: sp ? sp.ach : null,
        target: sp ? sp.target : null, pace: sp ? sp.pace : null, status: sp ? sp.status : null, rate: td <= c.end && rr.required != null && rr.monthsLeft > 1e-9 ? rr.required : null }; };
    const a = side(seed, c0), b = side(s1, c1), rank = { behind: 0, at_risk: 1, on_track: 2 };
    const better = !!(a.status && b.status && rank[b.status] > rank[a.status] && to.end > c0.end);
    const added = to.end > c0.end ? R.monthsIn(R.addDays(c0.end, 1), to.end).filter(m => m > R.ym(c0.end)) : [];
    return { now: a, after: b, moves: mv.moves, cut: mv.cut, ok: !mv.cut.length, better, added, from: { start: c0.start, end: c0.end, end_marketing: c0.end_marketing || null }, to };
  }
  /* the closure of a plan (§5.4): { status 'open' | 'closed', closed_at, closed_by, note, unused } — never the status of the dates */
  const closureOf = (c, plan) => { const z = (plan && plan.closure) || (c && c.closure) || null; return z && z.status === 'closed' ? z : { status: 'open' }; };
  /* the state of an approved Campaign (§2.2 · §5.1): not_started · ongoing · toclose (Ended, not closed — Due End + 30 days) · closed · cancelled */
  function campState(c, plan, today) {
    const td = today || R.todayISO(), s = R.statusOf(c, td), z = closureOf(c, plan);
    if (s === R.CANCELLED) return { key: 'cancelled', s };
    if (z.status === 'closed') return { key: 'closed', s, at: String(z.closed_at || '').slice(0, 10), by: z.closed_by, z };
    if (s === 'complete') { const due = R.addDays(c.end, 30), late = td > due ? R.dayDiff(td, due) : 0; return { key: 'toclose', s, due, late }; }
    if (s === 'not_started') return { key: 'not_started', s, n: R.dayDiff(c.start, td) };
    return { key: 'ongoing', s, n: Math.max(0, R.dayDiff(c.end, td)) };
  }
  /* the checks of a close request (§5.3): requests waiting · plan steps open · the last expense · spent / current budget (Used %) · net revenue · Ach ·
     campaign profit · plan profit · the unused budget (stays in the numbers — D120) · the gap to explain (below the target · over the budget) */
  function closeChecks(seed, cid, plan, today) {
    const M = R.model(seed), c = M.byId.get(cid), cm = M.cells.get(cid) || new Map(), td = today || R.todayISO(); if (!c) return null;
    const waiting = ((plan && plan.requests) || []).filter(q => q.status === 'pending' || q.status === 'returned');
    const stepsOpen = plan && plan.steps && plan.approval !== 'approved' ? STEP_KEYS.filter(k => !stepDone(plan, k)).length : 0;
    let lastExp = null; cm.forEach((x, m) => { if ((x.mkt[1] || 0) + (x.sls[1] || 0) + (x.oth[1] || 0) > 0 && (!lastExp || m > lastExp)) lastExp = m; });
    let lastSales = null; cm.forEach((x, m) => { if ((x.rev[1] || 0) > 0 && (!lastSales || m > lastSales)) lastSales = m; });
    const ms = [...cm.keys()].sort(), t = budgetTrack(seed, { from: ms.length ? R.monthFirst(ms[0]) : c.start, to: ms.length ? R.monthLast(ms[ms.length - 1]) : c.end, statuses: R.STATUSES, includeCancelled: true, only: [cid], today: td }).rows[0] || null;
    const sp = R.campaignPace(seed, cid, td), p = R.pnl(M, [cid], ms, { today: td });
    return { waiting, stepsOpen, lastExp, lastSales, lastDay: lastExp ? (R.monthLast(lastExp) < td ? R.monthLast(lastExp) : td) : null,
      spent: t ? t.committed : null, current: t ? t.current : null, used: t ? t.used : null, unused: t ? Math.max(0, t.current - t.committed) : null, over: t ? Math.max(0, t.committed - t.current) : 0,
      rev: p.actual.rev, ach: sp ? sp.ach : null, target: sp ? sp.target : null, short: sp && sp.target != null ? Math.max(0, sp.target - (sp.actual || 0)) : 0, profit: p.actual.profit, planProfit: p.plan.profit };
  }

  /* ===================== the work waiting (Approvals · badge · Needs attention) ===================== */
  /* one item a plan submitted or a request pending/returned/decided — the cards of Approvals (KOL: one card a request) */
  function approvalItems(seed, today) {
    const P = seed.plans || {}, all = seed.allCampaigns || seed.campaigns || [], out = [];
    all.forEach(c => { const p = P[c.id]; if (!p) return;
      (p.versions || []).forEach((v, i) => { if (v.status === 'draft' && i < p.versions.length - 1) return;
        out.push({ kind: 'plan', c, plan: p, v, status: v.status === 'submitted' ? 'pending' : v.status, by: v.submitted_by || p.owner, at: v.submitted_at || null, decided_by: v.decided_by, decided_at: v.decided_at, comment: v.comment,
          age: v.submitted_at && v.status === 'submitted' ? R.dayDiff(today, v.submitted_at.slice(0, 10)) : null, latest: i === p.versions.length - 1 }); });
      (p.requests || []).forEach(q => out.push({ kind: 'request', c, plan: p, req: q, status: q.status, by: q.by, at: q.at, decided_by: q.decided_by, decided_at: q.decided_at, comment: q.comment,
        age: q.status === 'pending' && q.at ? R.dayDiff(today, q.at.slice(0, 10)) : null, latest: true }));
    });
    return out;
  }
  /* what is waiting for this person: a manager — the pending ones not theirs · a drafter — their returned ones */
  function waitingFor(items, a) {
    if (!a) return [];
    if (isMgr(a)) return items.filter(x => x.status === 'pending' && x.latest && x.by !== a.name);
    return items.filter(x => x.latest && x.status === 'returned' && (x.by === a.name || (x.plan && x.plan.owner === a.name)));
  }

  /* §9.3 — the Campaign tracker: a row a Campaign of the scope over its whole time — Time · Sales (Ach % to date) · the budget track */
  function trackerRows(seed, o) {
    const td = o.today || R.todayISO(), S = R.scope(seed, o), cs = S.ids.map(id => S.M.byId.get(id)); if (!cs.length) return [];
    const from = R.monthFirst(R.addMonths(R.ym(cs.reduce((m, c) => (c.start < m ? c.start : m), cs[0].start)), -1)), to = cs.reduce((m, c) => (c.end > m ? c.end : m), cs[0].end);
    const whole = { from, to, statuses: R.STATUSES.concat([R.CANCELLED]), includeCancelled: true, only: S.ids, today: td };
    const bt = new Map(budgetTrack(seed, whole).rows.map(t => [t.id, t]));
    return R.salesTable(seed, whole, 'attention').rows.map(r => ({ c: r.c, status: r.status, tp: R.timeProgress(r.c, td), days: R.daysLeft(r.c, td), ach: r.node.ach, att: r.node.status, t: bt.get(r.c.id) || null }));
  }
  /* ===================== CR-06 §7 — the Product Master ===================== */
  const PRODUCT_STATES = ['npd', 'active', 'clearance', 'discontinued'];
  const foldCode = x => String(x == null ? '' : x).trim().toLowerCase();
  /* the plans whose versions hold this code → [{ id, plan, approval }] (a code a plan uses is locked in the master) */
  function productUse(code, plans) {
    const k = foldCode(code), out = [];
    Object.values(plans || {}).forEach(p => { if ((p.versions || []).some(v => (v.skus || []).some(s => foldCode(s.code) === k))) out.push({ id: p.id, plan: p, approval: p.approval }); });
    return out;
  }
  /* the checks of the drawer (§7.2) → { errs { field: message }, warns { field: message } } · products = the master · code0 = the product being edited */
  function productChecks(f, products, code0) {
    const V = C.prod.v, e = {}, w = {}, code = String(f.code || '').trim(), n = v => (v === '' || v == null ? null : +String(v).replace(/,/g, ''));
    if (!code) e.code = V.codeReq; else if (code.length > 30) e.code = V.codeLong;
    else if ((products || []).some(p => foldCode(p.code) === foldCode(code) && foldCode(p.code) !== foldCode(code0))) e.code = V.codeDup(code);
    const bc = String(f.barcode || '').trim(); if (bc && !/^(\d{8}|\d{13})$/.test(bc)) e.barcode = V.barcode;
    ['name', 'nickname', 'group', 'category'].forEach(k => { if (!String(f[k] || '').trim()) e[k] = V.req; });
    if (!PRODUCT_STATES.includes(f.status)) e.status = V.req;
    if (f.launch && !R.isISODate(f.launch)) e.launch = C.camps.v.date;
    const cg = n(f.cogs); if (cg == null) e.cogs = V.req; else if (!isNum(cg) || cg <= 0) e.cogs = V.cogsPos;
    R.CHANNELS.forEach(k => { const v = n((f.price || {})[k]); if (v == null) return; if (!isNum(v) || v <= 0) e['price_' + k] = V.pricePos; else if (isNum(cg) && cg > 0 && v < cg) w['price_' + k] = V.belowCogs(k); });
    return { errs: e, warns: w, ok: !Object.keys(e).length };
  }
  /* a SKU of a plan from the master: the snapshot of its COGS and net prices (§7.3) */
  const skuFromMaster = m => ({ code: m.code, name: m.name, nickname: m.nickname || '', group: m.group || '', category: m.category || '', cogs: +m.cogs,
    price: Object.fromEntries(CHANNELS.map(k => [k, m.price && m.price[k] !== '' && m.price[k] != null && isNum(+m.price[k]) ? +m.price[k] : ''])) });
  /* the SKUs of a version whose COGS (o.prices: or a net price) differs from the master → [{ code, name, nickname, cogs, master, cogsDiff, prices { ch: { plan, master, off } } }] */
  function planCogsDrift(ver, products, o = {}) {
    const M = new Map((products || []).map(p => [p.code, p])), out = [];
    ((ver && ver.skus) || []).forEach(s => {
      const m = M.get(s.code); if (!m) return;
      const cogsDiff = isNum(+m.cogs) && Math.abs(+m.cogs - (+s.cogs || 0)) > 0.0001, prices = {};
      if (o.prices) CHANNELS.forEach(k => { const a = num(s.price && s.price[k]), b = num(m.price && m.price[k]); if (a != null && b != null && Math.abs(a - b) > 0.0001) prices[k] = { plan: a, master: b, off: R.ratio(a - b, b) }; });
      if (cogsDiff || Object.keys(prices).length) out.push({ code: s.code, name: s.name, nickname: s.nickname, cogs: +s.cogs || 0, master: m, cogsDiff, prices });
    });
    return out;
  }

  /* ===================== CR-06 §5 — Running: Approved Campaigns live in each column (not cancelled) ===================== */
  /* cols = [{ from: 'yyyy-mm', to: 'yyyy-mm' }] → [n] */
  function runningByMonth(campaigns, cols, today) {
    const live = (campaigns || []).filter(c => c.approval === 'approved' && R.statusOf(c, today) !== R.CANCELLED);
    return cols.map(k => live.filter(c => c.start <= R.monthLast(k.to) && c.end >= R.monthFirst(k.from)).length);
  }

  /* ===================== CR-09 §5.1 (D86) — the planning work at a glance (Campaign Planning › Plans · the 4 KPI) ===================== */
  /* In progress = Draft · In review · Returned (not cancelled) · Steps overdue (the latest first) · In review (the oldest first) ·
     Next 12 months = the Campaigns that start within 12 months from today (Approved + in planning, not Rejected / cancelled): target · budget · A&P · the approved part */
  function planningKpi(seed, today) {
    const P = seed.plans || {}, all = (seed.allCampaigns || seed.campaigns || []).filter(c => R.statusOf(c, today) !== R.CANCELLED), work = ['draft', 'submitted', 'returned'];
    const inProg = all.filter(c => work.includes(c.approval)), by = { draft: 0, returned: 0, submitted: 0 }; inProg.forEach(c => { by[c.approval]++; });
    const overdue = []; inProg.filter(c => c.approval !== 'submitted').forEach(c => { const p = P[c.id]; if (!p || !p.steps) return; STEP_KEYS.forEach(k => { const s = stepState(p, k, today); if (s.overdue) overdue.push({ c, s }); }); });
    overdue.sort((a, b) => b.s.daysLate - a.s.daysLate || a.c.name.localeCompare(b.c.name, 'en'));
    const review = inProg.filter(c => c.approval === 'submitted').map(c => { const w = working(P[c.id]); return { c, days: w && w.submitted_at ? R.dayDiff(today, String(w.submitted_at).slice(0, 10)) : 0 }; }).sort((a, b) => b.days - a.days);
    const end = today.slice(5) === '02-29' ? `${+today.slice(0, 4) + 1}-02-28` : `${+today.slice(0, 4) + 1}${today.slice(4)}`, soon = all.filter(c => c.start > today && c.start <= end && (c.approval === 'approved' || work.includes(c.approval)));
    const tot = c => { const p = P[c.id], v = c.approval === 'approved' ? approvedVersion(p) : working(p); return v ? planTotals(v) : { target: 0, budget: 0 }; };
    const sum = (list, k) => list.reduce((s, c) => s + (tot(c)[k] || 0), 0), appr = soon.filter(c => c.approval === 'approved');
    return { inProgress: { n: inProg.length, by }, overdue, review, next: { n: soon.length, to: end, target: sum(soon, 'target'), budget: sum(soon, 'budget'), approved: sum(appr, 'target'), ids: soon.map(c => c.id) } };
  }

  /* ===================== CR-07 §3.2 (D68) — Budget health · §3.3 — Issues: one rule for every screen ===================== */
  /* Used % = Spent ÷ Current budget (the whole Campaign) · Over > 100% (Ended over budget once it ended — watch) · Near 90–100% while it runs ·
     Spending ahead = Used % − Time gone > 20 pts */
  function budgetStatus(used, tg, ended) {
    if (used == null) return null;
    if (used > 1 + 1e-9) return ended ? 'ended_over' : 'over';
    if (!ended && used >= 0.9) return 'near';
    if (tg != null && !ended && (used - tg) * 100 > 20) return 'ahead';
    return 'ok';
  }
  const URGENT = new Set(['behind', 'over']);
  /* one row a Campaign of the scope (o: the year · Status) → { id, c, severity urgent | watch, chips [{ key, sev }], sales (campaignPace), budget (whole Campaign) } ·
     only the ones with a problem · urgent first, then the furthest behind */
  function issues(seed, o) {
    const td = o.today || R.todayISO(), S = R.scope(seed, o), M = S.M, out = [];
    const all = S.ids.map(id => M.byId.get(id)).filter(c => R.statusOf(c, td) !== R.CANCELLED);
    if (!all.length) return { rows: [], urgent: 0, watch: 0, byId: new Map() };
    const from = R.monthFirst(R.addMonths(R.ym(all.reduce((m, c) => (c.start < m ? c.start : m), all[0].start)), -1)), to = all.reduce((m, c) => (c.end > m ? c.end : m), all[0].end);
    const bt = new Map(budgetTrack(seed, { from, to, statuses: R.STATUSES.concat([R.CANCELLED]), includeCancelled: true, only: all.map(c => c.id), today: td }).rows.map(t => [t.id, t]));
    const byId = new Map();
    all.forEach(c => {
      const sp = R.campaignPace(seed, c.id, td), t = bt.get(c.id), used = t && t.current > 0 ? t.committed / t.current : null, ended = td > c.end, bs = budgetStatus(used, sp ? sp.timeGone : null, ended), chips = [];
      if (sp && (sp.status === 'behind' || sp.status === 'at_risk')) chips.push({ key: sp.status, sev: sp.status === 'behind' ? 'urgent' : 'watch', ach: sp.ach, tg: sp.timeGone });
      if (bs && bs !== 'ok') chips.push({ key: bs, sev: URGENT.has(bs) ? 'urgent' : 'watch', used, tg: sp ? sp.timeGone : null, left: t ? t.current - t.committed : null });
      const row = { id: c.id, c, sales: sp, budget: t ? Object.assign({ used, status: bs }, { current: t.current, spent: t.committed, remaining: t.current - t.committed, pending: t.pending }) : null, chips,
        severity: chips.some(x => x.sev === 'urgent') ? 'urgent' : chips.length ? 'watch' : null };
      byId.set(c.id, row); if (chips.length) out.push(row);
    });
    out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'urgent' ? -1 : 1) || ((a.sales && a.sales.pace != null ? a.sales.pace : 9) - (b.sales && b.sales.pace != null ? b.sales.pace : 9)) || a.c.name.localeCompare(b.c.name, 'en'));
    return { rows: out, urgent: out.filter(x => x.severity === 'urgent').length, watch: out.filter(x => x.severity === 'watch').length, byId };
  }

  /* ===================== CR-07 §4.2 — the P&L of a scope: Plan (the months of the scope) · Actual (to date) · Forecast end (Est.) ===================== */
  /* Forecast end (Est.) a Campaign: revenue = R.forecast (actual + the pace of the complete months × the months left) — no pace yet → the plan ·
     COGS = revenue × its COGS share (actual, else plan) · each expense group = its budget, or the actual once above it (ended: the actual) */
  function pnlForecast(seed, o, ids) {
    const S = R.scope(seed, o), M = S.M, td = S.today, list = ids == null ? S.ids : typeof ids === 'string' ? [ids] : ids, G = ['mkt', 'sls', 'oth'];
    const rows = list.map(id => {
      const c = M.byId.get(id), p = R.pnl(M, [id], S.months, { today: td }), P0 = p.plan, A = p.actual, f = R.forecast(seed, id, { from: S.from, to: S.to, today: td }), ended = td > c.end;
      const rev = ended ? A.rev || 0 : f.forecast != null ? f.forecast : td < c.start ? P0.rev || 0 : Math.max(A.rev || 0, P0.rev || 0);
      const share = A.rev > 0 && A.cogs != null ? A.cogs / A.rev : P0.rev > 0 && P0.cogs != null ? P0.cogs / P0.rev : null, cogs = share == null ? null : rev * share;
      const g = Object.fromEntries(G.map(k => [k, ended ? A[k] || 0 : Math.max(A[k] || 0, P0[k] || 0)])), spend = G.reduce((s, k) => s + g[k], 0), gp = cogs == null ? null : rev - cogs;
      const fc = { rev, cogs, gp, mkt: g.mkt, sls: g.sls, oth: g.oth, spend, profit: gp == null ? null : gp - spend, est: f.forecast == null && !ended };
      Object.assign(fc, { gpPct: R.ratio(fc.gp, rev), margin: R.ratio(fc.profit, rev), roi: R.ratio(fc.profit, spend), ap: R.ratio(spend, rev) });
      return { c, id, plan: P0, actual: A, forecast: fc, pnl: p };
    });
    const sumK = (side, k) => rows.reduce((s, r) => (r[side][k] == null ? s : (s || 0) + r[side][k]), null);
    const tot = {}; ['rev', 'cogs', 'gp', 'mkt', 'sls', 'oth', 'spend', 'profit'].forEach(k => { tot[k] = sumK('forecast', k); });
    Object.assign(tot, { gpPct: R.ratio(tot.gp, tot.rev), margin: R.ratio(tot.profit, tot.rev), roi: R.ratio(tot.profit, tot.spend), ap: R.ratio(tot.spend, tot.rev) });
    return { scope: S, rows, forecast: tot, total: R.pnl(M, list, S.months, { today: td }) };
  }

  return { ROLE_KEYS, DEPTS, roleKey, isMgr, PLAN_STATES, REQ_STATES, PRODUCT_STATES, newPlan, working,
    monthRanges, envOf, ENV_GROUPS, phaseWeights, spreadWhole, STEP_KEYS, STEP_NAMES, STEP_NUM, STEP_DEPT, STEP_TYPE, STEP_PAGE, newSteps, periodDates, monthMoves, periodMoves, periodImpact, moveRows, closureOf, campState, closeChecks, reqWords, stepState, planProgress, canDoStep, stepChecks, planForecast, breakEven, budgetStatus, issues, pnlForecast, planningKpi, approvedVersion, skuMap, priceOf, rowAmount,
    planTotals, planChecks, planDiff, canDo, planAct, sumLines, requestType, requestImpact,
    budgetTrack, mergePlans, approvalItems, waitingFor, clonePlan: clone, trackerRows,
    productUse, productChecks, skuFromMaster, planCogsDrift, runningByMonth };
})(CP.rules));
