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
  /* CR-15 §11 (D166) — the keys stay · the names shown: Admin · Approver (manager) · Planner (staff) · Viewer · accounting (only a name) = a Planner */
  const ROLE_KEYS = ['admin', 'manager', 'staff', 'viewer'];
  const roleKey = r => { const k = String(r || '').trim().toLowerCase().replace(/^administrator$/, 'admin').replace(/^kol manager$/, 'manager').replace(/^accounting$/, 'staff'); return ROLE_KEYS.includes(k) ? k : 'viewer'; };
  const isMgr = a => !!a && (a.role === 'manager' || a.role === 'admin');
  const canDraft = a => !!a && (a.role === 'staff' || isMgr(a));
  /* CR-07 §10 — the departments: Brand · Sales · Marketing · Finance · Executive · Admin */
  const DEPTS = ['brand', 'sales', 'marketing', 'finance', 'executive', 'admin'];

  /* ===================== CR-14 §2 (D126) — the 4 steps: 1 Brief (brief) → 2 Sales target (target) ∥ 3 Expense lines (exp_mkt · exp_sls · exp_oth) →
     4 Summary & submit (fin · submit) · the keys of CR-07 / CR-13 (1 · 2 · 3 · env · 4a · 4b · 4c · 5 · 6) are read through migratePlan (schema 14) ===================== */
  const STEP_KEYS = ['brief', 'target', 'exp_mkt', 'exp_sls', 'exp_oth', 'fin', 'submit'];
  const STEP_NUM = { brief: '1', target: '2', exp_mkt: '3a', exp_sls: '3b', exp_oth: '3c', fin: '4', submit: '4' };
  /* CR-12 §4.3 — the names of the steps are words of the page (C.step.names — the old keys too: an old history line) */
  const STEP_NAMES = C.step.names;
  const STEP_DEPT = { brief: 'brand', target: 'sales', exp_mkt: 'marketing', exp_sls: 'sales', exp_oth: 'finance', fin: 'finance', submit: 'brand' };
  const STEP_TYPE = { exp_mkt: 'marketing', exp_sls: 'sales', exp_oth: 'other' }, TYPE_STEP = { marketing: 'exp_mkt', sales: 'exp_sls', other: 'exp_oth' };
  const STEP_PAGE = { brief: 'brief', target: 'target', exp_mkt: 'expenses', exp_sls: 'expenses', exp_oth: 'expenses', fin: 'summary', submit: 'summary' };
  /* the part of the plan time a step's Due comes from (planDues) */
  const STEP_PHASE = { brief: 'brief', target: 'work', exp_mkt: 'work', exp_sls: 'work', exp_oth: 'work', fin: 'fin', submit: 'submit' };
  /* the steps of a new plan: Brand steps = the owner · the others = the first person of that department · Due = planDues (CR-14 §3) */
  function newSteps(start, owner, people, today) {
    const of = d => { const p = (people || []).find(x => x.active !== false && x.dept === d); return p ? p.name : owner; }, D = start ? planDues(start, today || R.todayISO()) : null;
    return Object.fromEntries(STEP_KEYS.map(k => [k, { assignee: STEP_DEPT[k] === 'brand' ? owner : of(STEP_DEPT[k]), due: D ? D[STEP_PHASE[k]] : null, dueManual: false, status: 'not_started', done_at: null, by: null, refresh: false, none: false }]));
  }
  /* the steps as they were before CR-14 (the made-up plans of the Mock are written that way and read through migratePlan — P9) */
  const STEP_KEYS_V1 = ['1', '2', '3', 'env', '4a', '4b', '4c', '5', '6'];
  const STEP_DEPT_V1 = { 1: 'brand', 2: 'brand', 3: 'sales', env: 'brand', '4a': 'marketing', '4b': 'sales', '4c': 'finance', 5: 'finance', 6: 'brand' };
  const STEP_DUE_V1 = { 1: -75, 2: -60, 3: -50, env: -45, '4a': -40, '4b': -40, '4c': -40, 5: -35, 6: -30 };
  function newStepsV1(start, owner, people) {
    const of = d => { const p = (people || []).find(x => x.active !== false && x.dept === d); return p ? p.name : owner; };
    return Object.fromEntries(STEP_KEYS_V1.map(k => [k, { assignee: STEP_DEPT_V1[k] === 'brand' ? owner : of(STEP_DEPT_V1[k]), due: start ? R.addDays(start, STEP_DUE_V1[k]) : null, status: 'not_started', done_at: null, by: null, refresh: false, none: false }]));
  }
  /* ===================== CR-14 §3 — the due dates in working days (Mon – Fri, not HOLIDAYS) · the one place to change them =====================
     Brief 5 · Target ∥ Expenses 10 · Summary 3 (Finance 1 working day before the send) · Approval 5 · Buffer before Start 10 = 33.
     A = the working days from today to Start: A ≥ 33 normal (back from Start) · 12 ≤ A < 33 squeeze (every part × A ÷ 33, ≥ 1, the rounding
     on the Buffer) · A < 12 (or started) urgent (forward from today: Brief +1 · Target ∥ Expenses +3 · Finance +4 · Send +5) */
  const DUE_RULES = { brief: 5, work: 10, summary: 3, approval: 5, buffer: 10, squeezeMin: 12 };
  /* the holidays on a fixed date every year (mm-dd) + one-off dates (yyyy-mm-dd: the lunar ones · substitution days · company days) */
  /* CR-14.1 — dates: the bank holidays that move (BOT · substitution days · the lunar ones): 07/12/2026 (Father's Day on a Saturday) · 2027 = the
     BOT notice of 25/08/2026 (18 days — the rest are in fixed) · CR-15 §10: the list lives in Settings › Holidays (with names · kind) */
  const HOLIDAYS = { fixed: ['01-01', '04-06', '04-13', '04-14', '04-15', '05-01', '05-04', '06-03', '07-28', '08-12', '10-13', '10-23', '12-05', '12-10', '12-31'],
    dates: ['2026-12-07', '2027-02-22', '2027-05-03', '2027-05-20', '2027-07-19', '2027-10-25', '2027-12-06'] };
  /* ===================== CR-15 §10 (D165) — the settings (Admin › Settings): the defaults = the constants of v0.14.2 · the saved copy = R.SETTINGS (set by
     CP.store) · every rule reads cfg() — one place · Reset demo data = the defaults again · nothing saved before changes by itself ===================== */
  const HOL_NAMES = { '01-01': ['วันขึ้นปีใหม่', "New Year's Day"], '04-06': ['วันจักรี', 'Chakri Day'], '04-13': ['วันสงกรานต์', 'Songkran'], '04-14': ['วันสงกรานต์', 'Songkran'],
    '04-15': ['วันสงกรานต์', 'Songkran'], '05-01': ['วันแรงงาน', 'Labour Day'], '05-04': ['วันฉัตรมงคล', 'Coronation Day'], '06-03': ['วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี', "The Queen's Birthday"],
    '07-28': ['วันเฉลิมพระชนมพรรษา ร.10', "The King's Birthday"], '08-12': ['วันแม่แห่งชาติ', "Mother's Day"], '10-13': ['วันนวมินทรมหาราช', 'King Bhumibol Memorial Day'],
    '10-23': ['วันปิยมหาราช', 'Chulalongkorn Day'], '12-05': ['วันพ่อแห่งชาติ', "Father's Day"], '12-10': ['วันรัฐธรรมนูญ', 'Constitution Day'], '12-31': ['วันสิ้นปี', "New Year's Eve"],
    '2026-12-07': ['ชดเชยวันพ่อแห่งชาติ', "Father's Day (substitution)"], '2027-02-22': ['ชดเชยวันมาฆบูชา', 'Makha Bucha (substitution)'], '2027-05-03': ['ชดเชยวันแรงงาน', 'Labour Day (substitution)'],
    '2027-05-20': ['วันวิสาขบูชา', 'Visakha Bucha'], '2027-07-19': ['ชดเชยวันอาสาฬหบูชา', 'Asanha Bucha (substitution)'], '2027-10-25': ['ชดเชยวันปิยมหาราช', 'Chulalongkorn Day (substitution)'],
    '2027-12-06': ['ชดเชยวันพ่อแห่งชาติ', "Father's Day (substitution)"] };
  const SIGN_SECTIONS = ['brief', 'target', 'exp_mkt', 'exp_sls', 'exp_oth', 'approve'];
  const CFG0 = {
    due: Object.assign({}, DUE_RULES),
    holidays: HOLIDAYS.fixed.map(d => ({ date: d, th: HOL_NAMES[d][0], en: HOL_NAMES[d][1], kind: 'yearly' })).concat(HOLIDAYS.dates.map(d => ({ date: d, th: HOL_NAMES[d][0], en: HOL_NAMES[d][1], kind: 'once' }))),
    /* §10.2 — the expense template: [line, in the template, %] (the % of the lines in the template = 100 a group) · no phasing a line any more (§7 · D161) */
    template: {
      marketing: [['KOL & Agency Fee', true, 35], ['ADS', true, 25], ['MEDIAS', true, 12], ['Production', true, 10], ['Event / Pop-up booth', true, 8], ['Sample', true, 4], ['PR Box', true, 3],
        ['Always On & Others', true, 3], ['Comment (On social)', false, 0], ['TT Materials', false, 0]],
      sales: [['Platform Fee', true, 40], ['Marketing Expense - Sharing', true, 20], ['Tester /GWP', true, 15], ['POSM', true, 10], ['Warehouse & Logistic Cost', true, 10], ['Employee Expense - Sale', true, 5]],
      other: [['Contingency', true, 60], ['Registration & FDA', true, 40], ['Royalty / License fee', false, 0], ['Other', false, 0]] },
    platformFee: 12,
    /* §9.2 — the sign-off rows of the PDF: section · position · who = step (the one who did the step) · person (a name) · blank */
    signers: [{ sec: 'brief', title: 'Brand Manager', who: 'step', person: '' }, { sec: 'target', title: 'Sales Manager', who: 'step', person: '' }, { sec: 'target', title: 'Sales Director', who: 'person', person: 'Golf' },
      { sec: 'exp_mkt', title: 'Marketing Manager', who: 'step', person: '' }, { sec: 'exp_sls', title: 'Sales Manager', who: 'step', person: '' }, { sec: 'exp_sls', title: 'Sales Director', who: 'person', person: 'Golf' },
      { sec: 'exp_oth', title: 'Finance Manager', who: 'step', person: '' }, { sec: 'approve', title: 'Managing Director', who: 'step', person: '' }],
    /* the plan defaults: A&P warning % · Worst / Best % · ฿ off the envelope = complete · the SKU shares by role */
    defaults: { apWarn: 20, worst: 80, best: 110, envTol: 100, roleW: { hero: 2, core: 1, gwp: 0 } }
  };
  const CFG_KEYS = Object.keys(CFG0);
  let CFG_LAST = null;
  /* the settings now: the saved copy over the defaults (a key not saved = its default) · the same object while nothing changed (the holiday sets are cached on it) */
  function cfg() {
    const s = R.SETTINGS || null; if (CFG_LAST && CFG_LAST.src === s) return CFG_LAST.v;
    const v = clone(CFG0); if (s) CFG_KEYS.forEach(k => { if (s[k] != null) v[k] = k === 'due' || k === 'defaults' ? Object.assign({}, CFG0[k], clone(s[k])) : clone(s[k]); });
    if (v.defaults && v.defaults.roleW) v.defaults.roleW = Object.assign({}, CFG0.defaults.roleW, v.defaults.roleW);
    v.holSet = { fixed: new Set(v.holidays.filter(h => h.kind === 'yearly').map(h => String(h.date).slice(-5))), dates: new Set(v.holidays.filter(h => h.kind !== 'yearly').map(h => h.date)) };
    CFG_LAST = { src: s, v }; return v;
  }
  const apWarn = () => (+cfg().defaults.apWarn || 20) / 100;
  /* the template a group in the form the steps use: [line, % (0 = not in the template), the group's phasing] */
  const expTemplate = g => ((cfg().template || {})[g] || []).map(([line, on, pct]) => [line, on ? +pct || 0 : 0, ENV_PHASE[g]]);
  function isWorkday(iso) { const w = new Date(iso + 'T00:00:00').getDay(), H = cfg().holSet; return w !== 0 && w !== 6 && !H.fixed.has(iso.slice(5)) && !H.dates.has(iso); }
  function addWorkdays(iso, n) { let d = iso, k = Math.abs(n); const step = n < 0 ? -1 : 1; while (k > 0) { d = R.addDays(d, step); if (isWorkday(d)) k--; } return d; }
  /* the working days after `from` up to and with `to` (0 when `to` is not after `from`) */
  function workdaysBetween(from, to) { let n = 0, d = from; while (d < to) { d = R.addDays(d, 1); if (isWorkday(d)) n++; } return n; }
  /* T0 = other due rules (Settings › Due dates shows its example before a save) */
  function planDues(start, today, T0) {
    const T = T0 || cfg().due, parts = ['brief', 'work', 'summary', 'approval', 'buffer'], total = parts.reduce((a, k) => a + T[k], 0), A = workdaysBetween(today, start), late = today > start ? R.dayDiff(today, start) : 0;
    if (A < T.squeezeMin) { const brief = addWorkdays(today, 1), work = addWorkdays(today, 3), fin = addWorkdays(today, 4), submit = addWorkdays(today, 5);
      return { mode: 'urgent', A, total, d: null, brief, work, fin, submit, approveBy: null, planFrom: today, late }; }
    let d = Object.fromEntries(parts.map(k => [k, T[k]]));
    if (A < total) { const f = A / total; d = Object.fromEntries(parts.map(k => [k, Math.max(1, Math.round(T[k] * f))])); d.buffer = Math.max(0, A - d.brief - d.work - d.summary - d.approval); }
    const submit = addWorkdays(start, -(d.buffer + d.approval)), work = addWorkdays(submit, -d.summary), brief = addWorkdays(work, -d.work);
    return { mode: A < total ? 'squeeze' : 'normal', A, total, d, brief, work, fin: addWorkdays(submit, -1), submit, approveBy: addWorkdays(submit, d.approval), planFrom: addWorkdays(brief, -d.brief), late };
  }
  /* ===================== P9 — every plan is read through migratePlan (never throws · a new copy · the same result twice) =====================
     schema 13 (v0.13.1): the envelope step env added (Done when the plan has budget lines or was sent) · schema 14 (CR-14 §12): the 4 steps —
     brief = 1 + 2 + env (done when the 3 are done) · target = 3 · exp_mkt / exp_sls / exp_oth = 4a / 4b / 4c · fin = 5 · submit = 6 · a Draft / Returned:
     the Due of the steps not done again from planDues (the old ones counted −75 calendar days) · a version: details.note · brief (targetEst ·
     envelope %) · subs · target rows sub + basis · skus prices {} */
  const PLAN_SCHEMA = 15;
  const V1_TO_14 = { 3: 'target', '4a': 'exp_mkt', '4b': 'exp_sls', '4c': 'exp_oth', 5: 'fin', 6: 'submit' };
  function migrate13(plan, c) {
    const miss = STEP_KEYS_V1.filter(k => !plan.steps[k]), p = Object.assign({}, plan, { schema: 13, steps: Object.assign({}, plan.steps) }); if (!miss.length) return p;
    const w = working(plan), lines = ((w && w.budget) || []).some(x => Math.abs(num(x.amount) || 0) > 0.5), sent = plan.approval !== 'draft' && plan.approval !== 'returned', start = c && c.start;
    miss.forEach(k => { const st0 = { assignee: STEP_DEPT_V1[k] === 'brand' ? plan.owner || null : null, due: start ? R.addDays(start, STEP_DUE_V1[k]) : null, status: 'not_started', done_at: null, by: null, refresh: false, none: false };
      if (k === 'env' && (lines || sent)) Object.assign(st0, { status: 'done', auto: true });
      p.steps[k] = st0; });
    return p;
  }
  const maxOf = xs => xs.filter(Boolean).sort().pop() || null;
  function migrateVer(v) {
    if (!v || v.schema14) return v;
    const x = Object.assign({}, v, { schema14: true }), T = planTotals(v), d = Object.assign({}, v.details || {});
    if (d.note == null) d.note = d.objective || ''; x.details = d;
    if (!x.brief) { const E = v.envelope || null, lines = { marketing: T.mkt, sales: T.sls, other: T.oth }, base = T.target;
      x.brief = { targetEst: null, envelope: Object.fromEntries(ENV_GROUPS.map(g => { const e = E && E[g], amt = e ? num(e.amount) || 0 : lines[g];
        return [g, { pct: base > 0 && amt > 0 ? Math.round(amt / base * 100000) / 1000 : null, phasing: (e && e.phasing) || ENV_PHASE[g], none: !!(e && e.none) }]; })) }; }
    x.target = (v.target || []).map(r => (r.sub != null && r.basis ? r : Object.assign({}, r, { sub: r.sub || '', basis: r.basis || (isNum(r.amount) ? 'amount' : 'qty') })));
    if (!x.subs) x.subs = [...new Set(x.target.map(r => r.sub).filter(Boolean))];
    x.skus = (v.skus || []).map(sk => (sk.prices ? sk : Object.assign({}, sk, { prices: {} })));
    /* the Target builder of CR-13 (full · channel weights · curve · custom weights) → the filler of CR-14 keeps its total and its curve (the levels start again from the defaults) */
    if (v.builder && (v.builder.full != null || v.builder.curve != null) && v.builder.preset == null) { const b = v.builder;
      x.builder = { total: num(b.full), from: 'suggest', preset: ['even', 'launch', 'follow'].includes(b.curve) ? b.curve : 'even', filledAt: b.filled || null, edited: !!b.edited }; }
    if (Array.isArray(v.revise)) x.revise = [...new Set(v.revise.map(k => (['1', '2', 'env'].includes(k) ? 'brief' : V1_TO_14[k] || k)))];
    return x;
  }
  /* ===================== CR-15 §12 — schema 15: TT = one sub-channel "TT total" (tt-all) — the rows of Dealer / Wholesale added up (฿ and pieces of the same
     SKU × month · ฿ kept to the baht: a row in pieces gets its ฿ at its old price first) · their campaign prices dropped · ver.subs · the filler's TT shares =
     tt-all 100 · an expense line whose phasing was not its group's rule = custom (its months stay as saved — D161) ===================== */
  const TT_OLD = ['tt-dealer', 'tt-wholesale'];
  const OLD_LINE_PH = { Production: 'before', 'PR Box': 'first', 'Always On & Others': 'even', 'Employee Expense - Sale': 'even', 'Registration & FDA': 'before' };
  function migrate15Ver(v) {
    if (!v || v.schema15) return v;
    const x = Object.assign({}, v, { schema15: true }), sm = skuMap(v), hit = (v.target || []).some(r => TT_OLD.includes(r.sub)) || (v.subs || []).some(s => TT_OLD.includes(s));
    if (hit) { const out = [], tt = new Map();
      (v.target || []).forEach(r => { if (!TT_OLD.includes(r.sub)) { out.push(r); return; }
        const k = `${r.code}|${r.month}`, a = rowAmount(r, sm.get(r.code)), o = tt.get(k) || { code: r.code, channel: 'TT', sub: 'tt-all', month: r.month, qty: 0, amount: 0, basis: 'amount' };
        o.qty += num(r.qty) || 0; o.amount += a || 0; if (!tt.has(k)) { tt.set(k, o); out.push(o); } });
      out.forEach(o => { if (o.sub === 'tt-all') o.amount = Math.round(o.amount * 100) / 100; });
      x.target = out;
      x.subs = [...new Set((v.subs || []).map(s => (TT_OLD.includes(s) ? 'tt-all' : s)))];
      x.skus = (v.skus || []).map(sk => { if (!sk.prices) return sk; const pr = Object.assign({}, sk.prices); TT_OLD.forEach(id => { delete pr[id]; }); return Object.assign({}, sk, { prices: pr }); });
      if (v.builder && v.builder.sub && typeof v.builder.sub === 'object') { const b = clone(v.builder); Object.keys(b.sub).forEach(k => { if (TT_OLD.includes(k)) delete b.sub[k]; }); if (Object.keys(v.builder.sub).some(k => TT_OLD.includes(k))) b.sub['tt-all'] = 100; x.builder = b; } }
    x.budget = (v.budget || []).map(r => { const was = r.phasing || OLD_LINE_PH[r.line] || ENV_PHASE[r.type] || 'even'; return Object.assign({}, r, { phasing: was === ENV_PHASE[r.type] ? was : 'custom' }); });
    return x;
  }
  function migrate15(p0) { return Object.assign({}, p0, { schema: 15, versions: (p0.versions || []).map(migrate15Ver) }); }
  function migrate14(p0, c, today) {
    const p = Object.assign({}, p0, { schema: 14, versions: (p0.versions || []).map(migrateVer) });
    if (!p0.steps || p0.steps.brief) return p;
    const S0 = p0.steps, S = {}, live = p0.approval === 'draft' || p0.approval === 'returned';
    const b = ['1', '2', 'env'].map(k => S0[k]).filter(Boolean), one = S0['1'] || {};
    const bst = b.length && b.every(x => x.status === 'done') ? 'done' : b.some(x => x.status === 'returned') ? 'returned' : b.some(x => x.status === 'in_progress' || x.status === 'done') ? 'in_progress' : 'not_started';
    S.brief = { assignee: one.assignee || p0.owner || null, due: maxOf(b.map(x => x.due)), dueManual: false, status: bst, done_at: bst === 'done' ? maxOf(b.map(x => x.done_at)) : null, by: bst === 'done' ? one.by || null : null, refresh: false, none: false };
    Object.entries(V1_TO_14).forEach(([o, n]) => { const x = S0[o] || { status: 'not_started' }; S[n] = Object.assign({ assignee: null, due: null, done_at: null, by: null, refresh: false, none: false }, x, { dueManual: false }); delete S[n].auto; delete S[n].squeezed; });
    if (live && c && c.start) { const D = planDues(c.start, today || R.todayISO()); STEP_KEYS.forEach(k => { if (S[k].status !== 'done') S[k].due = D[STEP_PHASE[k]]; }); }
    p.steps = S; return p;
  }
  function migratePlan(plan, c, today) {
    if (!plan || (plan.schema || 0) >= PLAN_SCHEMA) return plan;
    try { let p = plan; if (p.steps && (p.schema || 0) < 13 && !p.steps.brief) p = migrate13(p, c); if ((p.schema || 0) < 14) p = migrate14(p, c, today); return migrate15(p); }
    catch (e) { return Object.assign({}, plan, { schema: PLAN_SCHEMA }); }
  }
  /* CR-15 §6.4 — a sales risk is complete: No risk to report · or a level + at least 10 characters */
  const riskOk = x => !!x && (!!x.none || (!!x.level && String(x.text || '').trim().length >= 10));
  const stepDone = (plan, k) => !!plan && !!plan.steps && !!plan.steps[k] && plan.steps[k].status === 'done';
  /* CR-15 §2 — a plan sent to the Executive before (any version sent · or its state says so) · a cancel request waiting */
  const wasSent = plan => !!plan && (['submitted', 'approved', 'returned', 'rejected'].includes(plan.approval) || (plan.versions || []).some(v => v.submitted_at));
  const cancelReq = plan => ((plan && plan.requests) || []).filter(q => q.type === 'cancel' && q.status === 'pending').slice(-1)[0] || null;
  const cancelPending = plan => !!cancelReq(plan);
  /* §2.1 — open: Brief at once · 2 Sales target when the Brief has a SKU · 3x when the Brief has the envelope of its group (or No expense) — not waiting for the
     Brief to be done (a band says it is not done) · fin when 2 and 3a / 3b / 3c are done · submit when fin is done */
  function waitsOf(plan, k) {
    const v = working(plan);
    if (k === 'target') return ((v && v.skus) || []).length ? [] : ['brief'];
    if (STEP_TYPE[k]) { const e = envOf(v)[STEP_TYPE[k]]; return e.amount > 0.5 || (e.pct || 0) > 0 || e.none ? [] : ['brief']; }
    if (k === 'fin') return ['target', 'exp_mkt', 'exp_sls', 'exp_oth'].filter(x => !stepDone(plan, x));
    if (k === 'submit') return stepDone(plan, 'fin') ? [] : ['fin'];
    return [];
  }
  function stepState(plan, k, today) {
    const s = (plan && plan.steps && plan.steps[k]) || { status: 'not_started' }, td = today || R.todayISO(), wait = plan ? waitsOf(plan, k) : [];
    const open = !wait.length, due = s.due || null, late = !!due && s.status !== 'done' && due < td, soon = !!due && s.status !== 'done' && !late && R.dayDiff(due, td) <= 3;
    return { key: k, name: STEP_NAMES[k], dept: STEP_DEPT[k], assignee: s.assignee || null, due, dueManual: !!s.dueManual, status: s.status, open, waitFor: wait, overdue: late, soon, daysLate: late ? R.dayDiff(td, due) : 0,
      refresh: !!s.refresh, none: !!s.none, done_at: s.done_at, by: s.by, env: !!s.envChanged, num: STEP_NUM[k] };
  }
  /* the 4 dots of the Plans table (3 = its three groups · 4 = fin + submit) · what the plan waits on (the steps open and not done — 2 and 3 can be together) */
  function planProgress(plan, today) {
    const S = STEP_KEYS.map(k => stepState(plan, k, today)), waiting = plan && (plan.approval === 'draft' || plan.approval === 'returned') ? S.filter(s => s.status !== 'done' && s.open) : [];
    return { steps: S, done: S.filter(s => s.status === 'done').length, waiting, overdue: S.filter(s => s.overdue) };
  }
  /* who may edit a step: its assignee · the owner · Admin — a Draft or Returned plan, the step open and not done (a done step: Edit this step first — §2.3) */
  function canDoStep(a, plan, k) {
    const no = (why, x) => Object.assign({ ok: false, why: why || '' }, x || {}), P = C.plan.why;
    if (!a || !plan || a.active === false) return no();
    if (plan.approval !== 'draft' && plan.approval !== 'returned') return no(plan.approval === 'submitted' ? P.locked : '');
    if (cancelPending(plan)) return no(C.s15.cancelWaiting);
    const s = stepState(plan, k), who = a.role === 'admin' || plan.owner === a.name || s.assignee === a.name;
    if (!who) return no(P.notYours(s.assignee || '—'));
    if (s.status === 'done') return no(C.s14.doneRO, { reopen: true });
    if (!s.open && k !== 'submit') return no(P.waitStep(s.waitFor.map(x => STEP_NAMES[x]).join(' · ')));
    return { ok: true, why: '' };
  }

  /* ===================== a plan ===================== */
  const PLAN_STATES = ['draft', 'submitted', 'approved', 'returned', 'rejected'];
  const REQ_STATES = ['pending', 'approved', 'returned', 'rejected', 'withdrawn'];
  const emptyVersion = v => ({ v, status: 'draft', submitted_at: null, submitted_by: null, decided_at: null, decided_by: null, comment: '', skus: [], target: [], budget: [], subs: [], schema14: true,
    details: { note: '', brand: 'Charmiss', category: '', channels: [] }, brief: { targetEst: null, envelope: { marketing: { pct: null, phasing: 'mkt', none: false }, sales: { pct: null, phasing: 'sales', none: false }, other: { pct: null, phasing: 'even', none: false } } },
    forecast: { ach: { MT: 1, TT: 1, ECOM: 1 }, worst: (+cfg().defaults.worst || 80) / 100, best: (+cfg().defaults.best || 110) / 100, note: '', comment: '' }, review: { comment: '' } });
  function newPlan(id, owner, at, by) { return { id, rev: 0, source: 'web', owner, approval: 'draft', versions: [emptyVersion(1)], requests: [], log: [{ at, by, action: 'created', detail: '' }] }; }
  const working = p => (p && p.versions && p.versions.length ? p.versions[p.versions.length - 1] : null);
  const approvedVersion = p => (p && p.versions ? p.versions.slice().reverse().find(v => v.status === 'approved') || null : null);
  const skuMap = ver => new Map(((ver && ver.skus) || []).map(s => [s.code, s]));
  /* CR-14 §5.3 (D131) — the net price a piece (excl. VAT) of a SKU in a sub-channel: the campaign price of the plan ?? its standard price · no sub-channel (an
     older row) = the price of the channel */
  const priceOf = (s, ch, sub) => { if (!s) return null; const x = sub && s.prices ? s.prices[sub] : null; if (x) { const cp = num(x.camp), sd = num(x.std); if (cp != null) return cp; if (sd != null) return sd; } return s.price ? num(s.price[ch]) : null; };
  /* ฿ of a target cell: the amount the row carries (typed in ฿ · the Mock) else qty × its price */
  const rowAmount = (r, s) => { if (isNum(r.amount)) return r.amount; const q = num(r.qty), p = priceOf(s, r.channel, r.sub); return q != null && p != null ? q * p : null; };
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ===================== the numbers of a version (§5.1 · live while it is typed) ===================== */
  function planTotals(ver) {
    const sm = skuMap(ver), T = { skus: ((ver && ver.skus) || []).length, subs: 0, months: 0, qty: 0, target: 0, cogs: 0, mkt: 0, sls: 0, oth: 0, noPrice: 0,
      bySku: new Map(), byChannel: {}, bySub: new Map(), byMonth: new Map(), byLine: new Map() };
    const subs = new Set(), months = new Set(), acc = (map, k, f) => { const o = map.get(k) || { qty: 0, amount: 0, cogs: 0, mkt: 0, sls: 0, oth: 0 }; f(o); map.set(k, o); };
    ((ver && ver.target) || []).forEach(r => {
      const q = num(r.qty) || 0, s = sm.get(r.code), a = rowAmount(r, s); if (!q && !a) return;
      subs.add(r.code + '|' + r.channel); months.add(r.month); T.qty += q;
      if (a == null) { T.noPrice++; return; }
      const cg = s && num(s.cogs) != null ? q * num(s.cogs) : 0;
      T.target += a; T.cogs += cg;
      acc(T.bySku, r.code, o => { o.qty += q; o.amount += a; o.cogs += cg; });
      const ch = T.byChannel[r.channel] || (T.byChannel[r.channel] = { qty: 0, amount: 0, cogs: 0 }); ch.qty += q; ch.amount += a; ch.cogs += cg;
      acc(T.bySub, `${r.channel}|${r.sub || ''}`, o => { o.qty += q; o.amount += a; o.cogs += cg; });
      acc(T.byMonth, r.month, o => { o.qty += q; o.amount += a; o.cogs += cg; });
    });
    ((ver && ver.budget) || []).forEach(r => { const a = num(r.amount) || 0; if (!a || r.used === false) return; months.add(r.month);
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
    const noPrice = []; ((ver && ver.target) || []).forEach(r => { if (!(num(r.qty) > 0 || num(r.amount) > 0)) return; if (!isNum(priceOf(sm.get(r.code), r.channel, r.sub)) && !isNum(r.amount)) noPrice.push(`${r.code} ${r.sub || r.channel}`); }); void usedCh;
    ok('cogsPrice', T.skus > 0 && !noCogs.length && !noPrice.length, noCogs.map(x => `${x} COGS`).concat(noPrice).join(' · '));
    ok('target', T.target > 0 || T.qty > 0);
    ok('budget', T.budget > 0);
    const outT = ((ver && ver.target) || []).filter(r => num(r.qty) && s0 && (r.month < s0 || r.month > e0)).length, outB = ((ver && ver.budget) || []).filter(r => num(r.amount) && r.used !== false && s0 && (r.month < b0 || r.month > e0)).length;
    ok('months', !outT && !outB, outT + outB ? W.monthsOut(outT + outB) : '');
    const neg = ((ver && ver.target) || []).filter(r => num(r.qty) < 0).length + ((ver && ver.budget) || []).filter(r => num(r.amount) < 0).length;
    ok('negative', !neg, neg ? W.negOut(neg) : '');
    if (T.ap != null && T.ap > apWarn()) warns.push({ key: 'ap', text: W.apHigh(R.pct(T.ap)) });
    if (T.target > 0 && !T.sls) warns.push({ key: 'sls', text: W.noSales });
    /* CR-13 F2 — only the months up to End marketing (after it, no marketing is the plan) · in time order · as ranges (Jul – Dec 2025) */
    const em = c && c.end_marketing ? R.ym(c.end_marketing) : null, noMkt = [...T.byMonth].filter(([m, o]) => o.amount > 0 && !o.mkt && (!em || m <= em)).map(([m]) => m).sort();
    if (T.target > 0 && noMkt.length) warns.push({ key: 'mkt', text: W.noMkt(monthRanges(noMkt)) });
    return { errs, warns, ok: errs.every(x => x.ok), totals: T };
  }
  /* CR-14 — the checks of one step: list ✕ (Mark step done / Submit need every ✓) · warns ⚠ (they do not block) · o.today */
  function stepChecks(plan, k, c, o = {}) {
    const W = C.plan.checks, X = C.s14.ck, ver = working(plan), d = (ver && ver.details) || {}, T = planTotals(ver), out = [], warns = [], td = o.today || R.todayISO();
    const ok = (key, pass, detail) => out.push({ key, ok: !!pass, text: X[key] || W[key] || key, detail: detail || '' }), wn = (key, text) => warns.push({ key, text });
    const s0 = c && c.start ? R.ym(c.start) : null, e0 = c && c.end ? R.ym(c.end) : null, b0 = s0 ? R.addMonths(s0, -1) : null, skus = (ver && ver.skus) || [], E = envOf(ver);
    if (k === 'brief') {
      ok('name', c && String(c.name || '').trim());
      ok('dates', c && R.isISODate(c.start) && R.isISODate(c.end) && c.end >= c.start && (!c.end_marketing || (c.end_marketing >= c.start && c.end_marketing <= c.end)));
      ok('sku', skus.length > 0);
      const miss = skus.filter(sk => num(sk.cogs) == null || !R.CHANNELS.some(ch => isNum(priceOf(sk, ch)) || Object.values(sk.prices || {}).some(x => isNum(num(x.std))))).map(sk => sk.code);
      ok('skuCogsPrice', skus.length > 0 && !miss.length, miss.slice(0, 4).join(' · '));
      ok('envAll', ENV_GROUPS.every(g => E[g].pct > 0 || E[g].amount > 0.5 || E[g].none), ENV_GROUPS.filter(g => !(E[g].pct > 0 || E[g].amount > 0.5 || E[g].none)).map(g => C.plan.grid.groups[g]).join(' · '));
      ok('assigned', STEP_KEYS.every(x => plan.steps && plan.steps[x] && plan.steps[x].assignee && plan.steps[x].due));
      const est = num(((ver && ver.brief) || {}).targetEst); if (!(est > 0)) wn('noEst', X.noEst);
      const ap = envTotal(ver); if (ap.pct > apWarn()) wn('apHigh', W.apHigh(R.pct(ap.pct, 1)));
      const tmp = skus.filter(sk => sk.temp || /^TMP-/i.test(sk.code)); if (tmp.length) wn('tempSku', X.tempSku(tmp.length, tmp.map(x => x.code).join(' · ')));
      if (c && c.start < td) wn('started', X.started(R.dayDiff(td, c.start)));
    } else if (k === 'target') {
      ok('target', T.target > 0);
      /* CR-15 §6.4 (D160) — the sales risk before Mark step done (a plan whose step 2 is done already: not asked again) */
      ok('risk', riskOk(ver && ver.salesRisk) || stepDone(plan, 'target'));
      const noP = []; ((ver && ver.target) || []).forEach(r => { if (!(num(r.qty) > 0 || num(r.amount) > 0)) return; const sk = skus.find(x => x.code === r.code); if (!isNum(priceOf(sk, r.channel, r.sub))) noP.push(`${r.code} ${subName(r.sub) || r.channel}`); });
      ok('cellPrice', !noP.length, [...new Set(noP)].slice(0, 3).join(' · '));
      const out1 = ((ver && ver.target) || []).filter(r => (num(r.qty) || num(r.amount)) && s0 && (r.month < s0 || r.month > e0)).length, neg = ((ver && ver.target) || []).filter(r => num(r.qty) < 0 || num(r.amount) < 0).length;
      ok('monthsT', !out1, out1 ? W.monthsOut(out1) : ''); ok('negative', !neg, neg ? W.negOut(neg) : '');
      const est = num(((ver && ver.brief) || {}).targetEst); if (est > 0 && T.target > 0 && Math.abs(T.target - est) / est > 0.1) wn('estDiff', X.estDiff(R.pct((T.target - est) / est, 1)));
      const noT = ((ver && ver.subs) || []).filter(sb => !((T.bySub.get(`${subCh(sb)}|${sb}`) || {}).amount > 0)); if (noT.length) wn('subNoTarget', X.subNoTarget(noT.map(subName).join(' · ')));
      const noM = s0 ? R.monthsIn(c.start, c.end).map(R.ym).filter((m, i, a) => a.indexOf(m) === i && !((T.byMonth.get(m) || {}).amount > 0)) : []; if (T.target > 0 && noM.length) wn('monthNoTarget', X.monthNoTarget(monthRanges(noM)));
    } else if (STEP_TYPE[k]) {
      const g = STEP_TYPE[k], rows = ((ver && ver.budget) || []).filter(r => r.type === g && r.used !== false && num(r.amount)), sumG = rows.reduce((x, r) => x + (num(r.amount) || 0), 0), st = plan.steps && plan.steps[k];
      ok('group', sumG > 0 || (st && st.none), sumG > 0 ? R.baht(sumG) : '');
      const out2 = rows.filter(r => s0 && (r.month < b0 || r.month > e0)).length, neg = rows.filter(r => num(r.amount) < 0).length;
      ok('monthsB', !out2, out2 ? W.monthsOut(out2) : ''); ok('negative', !neg, neg ? W.negOut(neg) : '');
      const e = E[g]; if (!(st && st.none) && e.amount > 0.5 && Math.abs(sumG - e.amount) > envTol()) wn('envDiff', sumG > e.amount ? X.envOver(R.baht(sumG - e.amount)) : X.envUnder(R.baht(e.amount - sumG)));
      if (g === 'marketing' && T.target > 0) { const em = c && c.end_marketing ? R.ym(c.end_marketing) : null, noMkt = [...T.byMonth].filter(([m, o2]) => o2.amount > 0 && !o2.mkt && (!em || m <= em)).map(([m]) => m).sort(); if (noMkt.length) wn('noMkt', W.noMkt(monthRanges(noMkt))); }
    } else if (k === 'fin') {
      ok('before5', ['target', 'exp_mkt', 'exp_sls', 'exp_oth'].every(x => stepDone(plan, x)));
      ok('fcComment', String(((ver && ver.forecast) || {}).comment || '').trim().length > 0);
    } else if (k === 'submit') {
      ok('before6', ['brief', 'target', 'exp_mkt', 'exp_sls', 'exp_oth', 'fin'].every(x => stepDone(plan, x)) && !(plan.steps.fin && plan.steps.fin.refresh));
      const pc = planChecks(ver, c); ok('allChecks', pc.ok, pc.errs.filter(x => !x.ok).map(x => x.text).join(' · '));
    }
    return { list: out, warns, ok: out.every(x => x.ok) };
  }
  /* the envelope of the Brief in all: Σ groups ÷ its base (the target set · else the estimate) */
  function envTotal(ver) { const E = envOf(ver), amt = ENV_GROUPS.reduce((t, g) => t + (E[g].none ? 0 : E[g].amount), 0), base = E.marketing.base; return { amount: amt, pct: base > 0 ? amt / base : ENV_GROUPS.reduce((t, g) => t + (E[g].none ? 0 : (E[g].pct || 0) / 100), 0), base }; }
  const ENV_TOL = 100;   /* QA-v0.13 B15 · CR-14 D135 — ฿100 off the envelope = complete · CR-15: Settings › Plan defaults (envTol()) */
  const envTol = () => { const v = +cfg().defaults.envTol; return isNum(v) && v >= 0 ? v : ENV_TOL; };
  /* the sub-channels of the master (set by the store: CP.rules.SUBS = [{ id, ch, name, … }]) */
  /* CR-15 §6.1 — TT total (tt-all) is a word of the page while its name is the default one (Thai / English) */
  const subLabel = x => (!x ? '' : x.id === 'tt-all' && (!x.name || x.name === 'TT total' || x.name === 'TT รวม') ? ((C.s15 || {}).ttAll || 'TT total') : x.name);
  const subName = id => { const x = (R.SUBS || []).find(y => y.id === id); return x ? subLabel(x) : id || ''; };
  const subCh = id => { const x = (R.SUBS || []).find(y => y.id === id); return x ? x.ch : ''; };
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
  /* CR-14 §4.3 (D129) — the envelope of a version: the Brief keeps a % of the target a group (+ phasing · No expense) · its ฿ = % × the target set in step 2
     (else the estimate of the Brief) · a version of CR-13 (envelope in ฿) or older (none: the lines) is read the same way · it only guides (D122) */
  function envOf(ver) {
    const T = planTotals(ver), B = (ver && ver.brief) || null, E = (ver && ver.envelope) || null, lines = { marketing: T.mkt, sales: T.sls, other: T.oth };
    const est = B ? num(B.targetEst) : null, base = T.target > 0 ? T.target : est > 0 ? est : 0, src = T.target > 0 ? 'target' : est > 0 ? 'est' : '';
    return Object.fromEntries(ENV_GROUPS.map(g => { const b = B && B.envelope ? B.envelope[g] : null, e = E && E[g] ? E[g] : null;
      const pct = b && num(b.pct) != null ? num(b.pct) : e ? (T.target > 0 ? (num(e.amount) || 0) / T.target * 100 : null) : (T.target > 0 && lines[g] > 0 ? lines[g] / T.target * 100 : null);
      const none = !!((b && b.none) || (e && e.none)), amount = none ? 0 : pct != null && base > 0 ? Math.round(base * pct / 100) : e ? num(e.amount) || 0 : lines[g];
      return [g, { amount, pct: pct == null ? null : pct, phasing: (b && b.phasing) || (e && e.phasing) || ENV_PHASE[g], none, lines: lines[g], left: amount - lines[g], derived: !b && !e, base, src }]; }));
  }
  /* CR-14 §7.2 (D134) — the template of the expense lines: [line, % of the group's envelope, phasing] · the lines of 0 % come not used ·
     the one place to change it (README) · phasings: even · mkt (Start … End marketing) · sales (as the target) · before (the month before Start) ·
     first (the Start month) · one / custom (the months chosen) */
  const EXP_TEMPLATE = {
    marketing: [['KOL & Agency Fee', 35, 'mkt'], ['ADS', 25, 'mkt'], ['MEDIAS', 12, 'mkt'], ['Production', 10, 'before'], ['Event / Pop-up booth', 8, 'mkt'], ['Sample', 4, 'mkt'], ['PR Box', 3, 'first'],
      ['Always On & Others', 3, 'even'], ['Comment (On social)', 0, 'mkt'], ['TT Materials', 0, 'mkt']],
    sales: [['Platform Fee', 40, 'sales'], ['Marketing Expense - Sharing', 20, 'sales'], ['Tester /GWP', 15, 'sales'], ['POSM', 10, 'sales'], ['Warehouse & Logistic Cost', 10, 'sales'], ['Employee Expense - Sale', 5, 'even']],
    other: [['Contingency', 60, 'even'], ['Registration & FDA', 40, 'before'], ['Royalty / License fee', 0, 'even'], ['Other', 0, 'even']]
  };
  const PHASINGS = ['even', 'mkt', 'sales', 'before', 'first', 'one', 'custom'];
  /* the weights of the months of a phasing: even (Start … End) · mkt (Start … End marketing) · sales (the target of each month) · before (the month before
     Start) · first (the Start month) · one / custom ({ month: weight }) */
  function phaseWeights(months, c, phasing, targetByMonth, custom) {
    const s = R.ym(c.start), e = R.ym(c.end), em = c.end_marketing ? R.ym(c.end_marketing) : e, b = R.addMonths(s, -1);
    const w = months.map(m => (phasing === 'mkt' ? (m >= s && m <= em ? 1 : 0) : phasing === 'sales' ? (targetByMonth && targetByMonth.get(m)) || 0 : phasing === 'custom' || phasing === 'one' ? +((custom || {})[m] || 0)
      : phasing === 'before' ? (m === b ? 1 : 0) : phasing === 'first' ? (m === s ? 1 : 0) : m >= s && m <= e ? 1 : 0));
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
    /* CR-14 §8.3 (D137) — Worst / Best = a share of the target (80 % · 110 %) · the expenses stay (they are the plan) */
    const plan = set(T.target, T.cogs), base = set(baseRev, baseCogs), worst = set(T.target * f.worst, T.cogs * f.worst), best = set(T.target * f.best, T.cogs * f.best);
    const be = breakEven(T), warns = [];
    if (worst.profit < 0) warns.push({ key: 'worstLoss', v: worst.profit });
    if (base.ap != null && base.ap > apWarn()) warns.push({ key: 'apHigh', v: base.ap });
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
    /* CR-15 §2.3 — a cancel request waiting: no other request · no step · no decision on the plan until it is decided */
    if (plan && cancelPending(plan) && ['edit', 'submit', 'approve', 'return', 'reject', 'revise', 'request', 'change', 'details.approved'].includes(action)) return no(C.s15.cancelWaiting);
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
      case 'people': case 'settings': return a.role === 'admin' ? yes : no();
      /* CR-15 §2.1 (D151) — Cancel: the owner or Admin · a plan never sent = at once · sent before (returned · in review · approved, not closed) = a request
         the Executive decides · rejected / closed / cancelled: none (x.cancelled · x.closed) */
      case 'cancel': { if (!plan || x.cancelled || x.closed || st === 'rejected') return no(); if (!(own || a.role === 'admin')) return no(C.s15.onlyOwnerAdmin);
        if (cancelPending(plan)) return no(C.s15.cancelWaiting); return Object.assign({ mode: wasSent(plan) ? 'request' : 'direct' }, yes); }
      /* §2.4 (D152) — Restore: the Executive or Admin at once (a reason) · a draft the owner cancelled itself (never sent): the owner too */
      case 'restore': { if (!plan || !x.cancelled) return no(); if (isMgr(a)) return yes; return own && !wasSent(plan) && canDraft(a) ? yes : no(C.s15.restoreWho); }
      /* §3 (D153) — Transfer owner: Admin only */
      case 'transfer': return a.role === 'admin' && plan && !x.cancelled ? yes : no();
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
        ['skus', 'target', 'budget', 'details', 'forecast', 'review', 'builder', 'envelope', 'brief', 'subs', 'salesRisk'].forEach(k => { if (act[k]) w[k] = act[k]; }); w.schema14 = true; w.schema15 = true;
        /* CR-14 §2.3 — the step edited is In progress · the Brief's SKUs / dates changed → 2 Needs re-check · its envelope of a group changed → that 3x "Envelope
           changed" · 2 or 3 changed after Finance confirmed → fin Needs re-check (its comment stays) */
        const S = p.steps || {}, fl = act.flags || {}, mark = (k, o) => { if (S[k] && S[k].status !== 'not_started') Object.assign(S[k], o); };
        (act.steps || (act.step ? [act.step] : [])).forEach(k => { const s = S[k]; if (!s) return;
          if (s.status !== 'in_progress' && s.status !== 'returned') Object.assign(s, { status: 'in_progress', done_at: null }); if (k === 'fin') s.refresh = false;
          if (STEP_TYPE[k]) s.envChanged = false;
          if ((k === 'target' || STEP_TYPE[k]) && S.fin && (S.fin.status === 'done' || ((w.forecast || {}).confirmed_at))) mark('fin', { status: 'in_progress', refresh: true, done_at: null }); });
        if (fl.skus || fl.dates) mark('target', { refresh: true });
        (fl.env || []).forEach(g => mark(TYPE_STEP[g], { envChanged: true }));
        L('saved', act.detail || `v${w.v}`); break;
      }
      case 'step.done': { const s = p.steps[act.step] || (p.steps[act.step] = { assignee: act.by, due: null, status: 'not_started' }); Object.assign(s, { status: 'done', done_at: act.at, by: act.by, refresh: false, none: !!act.none, envChanged: false });
        if (act.step === 'fin' && w) w.forecast = Object.assign({}, w.forecast || {}, { confirmed_at: act.at, confirmed_by: act.by });
        L('step.done', `${STEP_NAMES[act.step]}${act.none ? ' · ' + C.plan.noExpense : ''}`); break; }
      /* CR-14 §2.3 — Edit this step: a done step goes back In progress (Draft · Returned) · 2 / 3 reopened after Finance confirmed → fin Needs re-check */
      case 'step.reopen': { const s = p.steps[act.step]; if (!s) break; Object.assign(s, { status: 'in_progress', done_at: null });
        if ((act.step === 'target' || STEP_TYPE[act.step]) && p.steps.fin && p.steps.fin.status === 'done') Object.assign(p.steps.fin, { status: 'in_progress', refresh: true, done_at: null });
        L('step.reopen', STEP_NAMES[act.step]); break; }
      /* CR-14 §3.4 — the Due again (Start changed · Recalculate due dates): the steps not done and not typed by hand (act.all: every step not done) */
      case 'dues': { const D = planDues(act.start, act.today || R.todayISO()); STEP_KEYS.forEach(k => { const s = p.steps[k]; if (!s || s.status === 'done' || (s.dueManual && !act.all)) return; s.due = D[STEP_PHASE[k]]; if (act.all) s.dueManual = false; });
        if (act.log !== false) L('dues', `${C.s14.mode[D.mode] || D.mode} · ${R.dmy(D.submit)}`); break; }
      /* CR-14 §5.4 (D132) — a temporary SKU linked to its real code: every row of the plan · one history line */
      case 'sku.link': { (p.versions || []).forEach(v => { (v.skus || []).forEach(sk => { if (sk.code === act.from) Object.assign(sk, act.sku || {}, { code: act.to, temp: false }); }); (v.target || []).forEach(t => { if (t.code === act.from) t.code = act.to; }); });
        L('sku.link', `${act.from} → ${act.to}`); break; }
      case 'step.assign': { const s = p.steps[act.step] || (p.steps[act.step] = { assignee: null, due: null, status: 'not_started', done_at: null, by: null, refresh: false, none: false }); const old = `${s.assignee || '—'} · ${s.due ? R.dmy(s.due) : '—'}`;
        if (act.assignee != null) s.assignee = act.assignee; if (act.due != null) { s.due = act.due; s.dueManual = act.manual !== false; } L('step.assign', `${STEP_NAMES[act.step]}: ${old} → ${s.assignee || '—'} · ${s.due ? R.dmy(s.due) : '—'}`); break; }
      case 'submit': {
        if (p.approval === 'returned' && w.status === 'returned') { const nv = clone(w); Object.assign(nv, { v: w.v + 1 }); p.versions.push(nv); w = nv; }
        Object.assign(w, { status: 'submitted', submitted_at: act.at, submitted_by: act.by, decided_at: null, decided_by: null, comment: '' }); p.approval = 'submitted';
        if (p.steps && p.steps.submit) Object.assign(p.steps.submit, { status: 'done', done_at: act.at, by: act.by });
        L(w.v > 1 ? 'resubmitted' : 'submitted', `v${w.v}`); break;
      }
      case 'withdraw': Object.assign(w, { status: 'draft', submitted_at: null, submitted_by: null }); p.approval = 'draft'; L('withdrawn', `v${w.v}`); break;
      case 'approve': case 'return': case 'reject': case 'revise': {
        const st = { approve: 'approved', return: 'returned', reject: 'rejected', revise: 'returned' }[act.type];
        Object.assign(w, { status: st, decided_at: act.at, decided_by: act.by, comment: act.comment || '', revise: act.type === 'revise' ? (act.steps || []).slice() : undefined }); p.approval = st;
        /* CR-07 §7 (D70) — Revise: the steps chosen go back to their people (Returned) · step 5 Needs refresh · step 6 again */
        /* CR-14 §2.3 — Revise: the steps ticked (Brief · 2 · 3a · 3b · 3c) go back Returned · Finance Needs re-check · Submit again */
        if (act.type === 'revise' && p.steps) { (act.steps || []).forEach(k => { if (p.steps[k]) Object.assign(p.steps[k], { status: 'returned', done_at: null }); });
          if (p.steps.fin) Object.assign(p.steps.fin, { status: 'in_progress', refresh: true, done_at: null });
          if (p.steps.submit) Object.assign(p.steps.submit, { status: 'not_started', done_at: null }); }
        L(act.type === 'revise' ? 'revise' : st, `v${w.v}${act.type === 'revise' ? ' · ' + (act.steps || []).map(k => STEP_NAMES[k]).join(' · ') : ''}${act.comment ? ' · ' + act.comment : ''}`); break;
      }
      case 'req.new': {
        const no = (p.requests.reduce((m, q) => Math.max(m, q.no), 0) || 0) + 1;
        /* CR-13 — a period change ({ period: { from, to, moves } }) · a close request ({ close: { early, close_date, note, checks, moves } }) · else a budget change */
        if (act.kind === 'period' || act.kind === 'close') {
          p.requests.push({ no, type: act.kind, status: 'pending', reason: act.reason, lines: [], period: act.period || null, close: act.close || null, by: act.by, at: act.at, decided_by: null, decided_at: null, comment: '' });
          L(act.kind, `#${no} ${reqWords(p.requests[p.requests.length - 1])}`); break; }
        /* CR-15 §2 — a cancel request ({ cancel: the impact when sent }) */
        if (act.kind === 'cancel') {
          p.requests.push({ no, type: 'cancel', status: 'pending', reason: act.reason, lines: [], cancel: act.cancel || null, by: act.by, at: act.at, decided_by: null, decided_at: null, comment: '' });
          p.cancel = { status: 'pending', by: act.by, at: act.at, reason: act.reason, req: no }; L('cancel', `#${no} · ${act.reason}`); break; }
        p.requests.push({ no, type: requestType(act.lines), status: 'pending', reason: act.reason, lines: act.lines, by: act.by, at: act.at, decided_by: null, decided_at: null, comment: '' });
        L('request', `#${no} ${requestType(act.lines)} ${R.baht(sumLines(act.lines))}`); break;
      }
      case 'req.edit': { const q = p.requests.find(x => x.no === act.no);
        if (q.type === 'period' || q.type === 'close') { Object.assign(q, { reason: act.reason, period: act.period || q.period, close: act.close || q.close, status: 'pending', at: act.at, decided_by: null, decided_at: null, comment: '' }); L(q.type, `#${q.no} ${reqWords(q)}`); break; }
        if (q.type === 'cancel') { Object.assign(q, { reason: act.reason, cancel: act.cancel || q.cancel, status: 'pending', at: act.at, decided_by: null, decided_at: null, comment: '' }); p.cancel = { status: 'pending', by: q.by, at: act.at, reason: act.reason, req: q.no }; L('cancel', `#${q.no} · ${act.reason}`); break; }
        Object.assign(q, { reason: act.reason, lines: act.lines, type: requestType(act.lines), status: 'pending', at: act.at, decided_by: null, decided_at: null, comment: '' }); L('request', `#${q.no} resubmitted`); break; }
      case 'req.withdraw': { const q = p.requests.find(x => x.no === act.no); q.status = 'withdrawn'; if (q.type === 'cancel') p.cancel = { status: 'withdrawn', by: act.by, at: act.at, req: q.no };
        L(q.type === 'period' || q.type === 'close' || q.type === 'cancel' ? q.type + '.withdrawn' : 'request.withdrawn', `#${q.no}`); break; }
      case 'req.approve': case 'req.return': case 'req.reject': {
        const q = p.requests.find(x => x.no === act.no), st = { 'req.approve': 'approved', 'req.return': 'returned', 'req.reject': 'rejected' }[act.type];
        Object.assign(q, { status: st, decided_by: act.by, decided_at: act.at, comment: act.comment || '' });
        if (q.type === 'period') { L('period.' + st, `#${q.no} ${reqWords(q)}${act.comment ? ' · ' + act.comment : ''}`); break; }
        /* CR-15 §2.3 — the cancel approved: the plan Cancelled (the list row: the store) · the other requests waiting = withdrawn automatically */
        if (q.type === 'cancel') {
          if (st === 'approved') { const auto = p.requests.filter(x => x !== q && (x.status === 'pending' || x.status === 'returned'));
            auto.forEach(x => Object.assign(x, { status: 'withdrawn', auto: true, decided_by: act.by, decided_at: act.at, comment: C.s15.autoWithdrawn }));
            p.cancel = { status: 'cancelled', by: q.by, at: act.at, reason: q.reason, req: q.no, approved_by: act.by };
            L('cancel.approved', `#${q.no} · ${q.reason}${auto.length ? ' · ' + C.s15.autoWithdrawn + ' ' + auto.map(x => '#' + x.no).join(' ') : ''}${act.comment ? ' · ' + act.comment : ''}`); }
          else { p.cancel = { status: st, by: q.by, at: act.at, req: q.no }; L('cancel.' + st, `#${q.no}${act.comment ? ' · ' + act.comment : ''}`); }
          break; }
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
      /* CR-15 §2.1 — Cancel a plan never sent (at once · a reason) · §2.4 Restore (a reason) — the list row is the store's */
      case 'cancel': p.cancel = { status: 'cancelled', by: act.by, at: act.at, reason: act.reason || '', req: null }; L('cancelled', act.reason || ''); break;
      case 'restore': p.cancel = { status: 'restored', by: act.by, at: act.at, reason: act.reason || '' }; L('restored', act.reason || ''); break;
      /* §3 (D153) — Transfer owner (Admin): the steps of the owner (Brand) go with it */
      case 'transfer': { const was = p.owner; p.owner = act.to; STEP_KEYS.forEach(k => { const s = p.steps && p.steps[k]; if (s && s.assignee === was && STEP_DEPT[k] === 'brand') s.assignee = act.to; });
        L('transfer', `${C.s15.transferred(was || '—', act.to)}${act.reason ? ' · ' + act.reason : ''}`); break; }
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
    if (q.type === 'cancel') return q.reason || '';
    if (q.type === 'close' && q.close) { const u = q.close.checks && q.close.checks.unused != null ? R.baht(q.close.checks.unused) : '—'; return q.close.early ? W.sumEarly(R.dmy(q.close.close_date), u) : W.sumClose(u); }
    return '';
  }

  /* ===================== budget requests (§7) ===================== */
  const sumLines = lines => (lines || []).reduce((s, l) => s + (num(l.amount) || 0), 0);
  const requestType = lines => { const t = sumLines(lines); return Math.abs(t) < 0.5 ? 'reallocation' : t > 0 ? 'increase' : 'release'; };
  const movedOf = lines => (lines || []).reduce((s, l) => s + Math.max(0, num(l.amount) || 0), 0);
  /* Impact of the lines on a Campaign (merged seed): Current budget · A&P % · Plan profit before → after · each line × month: current · committed ·
     remaining before → after · a − below committed = an error */
  function requestImpact(seed, cid, lines) {
    const M = R.model(seed), cm = M.cells.get(cid) || new Map(), cur = { budget: 0, target: 0, cogs: 0 }, by = new Map(), lineTot = new Map();
    cm.forEach((c, m) => { cur.target += c.rev[0] || 0; cur.cogs += c.cogs[0] || 0; cur.budget += (c.mkt[0] || 0) + (c.sls[0] || 0) + (c.oth[0] || 0);
      ['marketing', 'sales', 'other'].forEach(t => (c.lines[t] || new Map()).forEach((v, line) => { by.set(`${t}|${line}|${m}`, { cur: v[0] || 0, com: v[1] || 0 }); const k = `${t}|${line}`, o = lineTot.get(k) || { cur: 0, com: 0 }; o.cur += v[0] || 0; o.com += v[1] || 0; lineTot.set(k, o); })); });
    const add = sumLines(lines), after = cur.budget + add, gp = cur.target - cur.cogs;
    const rows = (lines || []).map(l => { const k = `${l.type}|${l.line}|${l.month}`, o = by.get(k) || { cur: 0, com: 0 }, t = lineTot.get(`${l.type}|${l.line}`) || { cur: 0, com: 0 }, a = num(l.amount) || 0;
      return Object.assign({}, l, { cur: o.cur, com: o.com, before: o.cur - o.com, after: o.cur + a - o.com, lineCur: t.cur, lineCom: t.com, err: a < 0 && o.cur + a < o.com - 0.5 }); });
    return { type: requestType(lines), total: add, before: cur.budget, after, ap: [R.ratio(cur.budget, cur.target), R.ratio(after, cur.target)], profit: [gp - cur.budget, gp - after], rows, ok: rows.every(r => !r.err) && (lines || []).length > 0 };
  }

  /* ===================== CR-07 (D65) — no expense items: the Spend actual is the seed's own rows (the old Expenses screen was retired) ===================== */

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
        ver.budget.forEach(r => { const a = num(r.amount) || 0; if (a && r.used !== false) exps.push({ campaign_id: c.id, type: r.type, line: r.line, month: mB(r.month), scenario: 'budget', amount: a, src: 'orig' }); });
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
  const PRODUCT_STATES = ['npd', 'active', 'clearance', 'discontinued', 'temp'];   /* CR-14 §5.4 — temp: a temporary SKU (TMP-0001) · merged: linked into a real code (not in the list) */
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
    monthRanges, envOf, ENV_GROUPS, EXP_TEMPLATE, PHASINGS, phaseWeights, spreadWhole, STEP_KEYS, STEP_NAMES, STEP_NUM, STEP_DEPT, STEP_TYPE, TYPE_STEP, STEP_PAGE, STEP_PHASE, STEP_KEYS_V1, newSteps, newStepsV1, migratePlan, PLAN_SCHEMA, movedOf, envTotal, ENV_TOL, stepDone, subName, subCh, DUE_RULES, HOLIDAYS, isWorkday, addWorkdays, workdaysBetween, planDues, periodDates, monthMoves, periodMoves, periodImpact, moveRows, closureOf, campState, closeChecks, reqWords, stepState, planProgress, canDoStep, stepChecks, planForecast, breakEven, budgetStatus, issues, pnlForecast, planningKpi, approvedVersion, skuMap, priceOf, rowAmount,
    planTotals, planChecks, planDiff, canDo, planAct, sumLines, requestType, requestImpact,
    budgetTrack, mergePlans, approvalItems, waitingFor, clonePlan: clone, trackerRows,
    productUse, productChecks, skuFromMaster, planCogsDrift, runningByMonth,
    cfg, CFG0, expTemplate, apWarn, envTol, SIGN_SECTIONS, wasSent, cancelReq, cancelPending, subLabel, riskOk };
})(CP.rules));
