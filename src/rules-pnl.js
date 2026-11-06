/* rules-pnl.js — CR-01 §4: every number of the dashboard, one function a thing (pure: no DOM). → CP.rules (R)
   KPI · P&L by month · Portfolio · Timeline · the three cards · the Drawer · Export all call these, so a number is the same everywhere.
   null = cannot be worked out → the screen shows "—" with the reason · null is never turned into 0 (§4).
   Plan of a month = target (sales) / budget (expenses) · "to date" (Ach % · Used % · To date) = actual ÷ the plan of the same
   campaign-months that already have actual (D3, like-for-like). */
CP.rules = (function () {
  'use strict';
  const C = CP.content;
  const TZ = 'Asia/Bangkok';

  /* ===================== dates (ISO yyyy-mm-dd · a month = yyyy-mm) ===================== */
  const isISODate = s => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  };
  /* CP.TODAY (set by app.js from ?today=yyyy-mm-dd, or by a check script) stands in for today */
  const todayISO = (now = new Date()) => (isISODate(CP.TODAY) ? CP.TODAY : now.toLocaleDateString('en-CA', { timeZone: TZ }));
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayDiff = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000);
  const dmy = iso => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
  const dm = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
  const ym = iso => String(iso).slice(0, 7);
  const pad = n => String(n).padStart(2, '0');
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthFirst = m => m + '-01';
  const monthLast = m => `${m}-${pad(lastDay(+m.slice(0, 4), +m.slice(5, 7)))}`;
  const addMonths = (m, n) => { const t = +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1) + n; return `${Math.floor(t / 12)}-${pad(t % 12 + 1)}`; };
  /* the months a range touches (CR-01 §4: the filter works on whole months) */
  function monthsIn(from, to) {
    const out = []; if (!from || !to || to < from) return out;
    for (let m = ym(from); m <= ym(to); m = addMonths(m, 1)) out.push(m);
    return out;
  }
  const monthShort = m => C.monthsShort[+m.slice(5, 7) - 1];
  const monthName = m => (m ? `${monthShort(m)} ${m.slice(0, 4)}` : '');
  const monthLong = m => `${C.months[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
  const PRESETS = ['this_year', 'this_quarter', 'this_month', 'last_month'];
  function presetRange(key, today) {
    const y = +today.slice(0, 4), m = +today.slice(5, 7);
    if (key === 'this_quarter') { const a = Math.floor((m - 1) / 3) * 3 + 1; return [`${y}-${pad(a)}-01`, `${y}-${pad(a + 2)}-${pad(lastDay(y, a + 2))}`]; }
    if (key === 'this_month') return [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(lastDay(y, m))}`];
    if (key === 'last_month') { const p = addMonths(`${y}-${pad(m)}`, -1); return [monthFirst(p), monthLast(p)]; }
    return [`${y}-01-01`, `${y}-12-31`];
  }
  /* the typed months of the Custom picker: mm/yyyy (or yyyy-mm) → { from (1st of the month), to (its last day), errs } */
  function validateMonthRange(a, b) {
    const read = v => { const t = String(v == null ? '' : v).trim(); if (!t) return ''; let r = /^(\d{1,2})\/(\d{4})$/.exec(t);
      if (r && +r[1] >= 1 && +r[1] <= 12) return `${r[2]}-${pad(+r[1])}`; r = /^(\d{4})-(\d{2})$/.exec(t); return r && +r[2] >= 1 && +r[2] <= 12 ? t : null; };
    const s = read(a), e = read(b), errs = [];
    if (s === null) errs.push({ field: 'start', msg: C.range.errFormat });
    if (e === null) errs.push({ field: 'end', msg: C.range.errFormat });
    if (s && e && e < s) errs.push({ field: 'end', msg: C.range.errOrder });
    return { from: s ? monthFirst(s) : '', to: e ? monthLast(e) : '', errs };
  }
  const monthCount = (from, to) => (from && to && to >= from ? monthsIn(from, to).length : null);
  /* CR-04 — the share of a month that is "to date": the month in progress = day ÷ days of the month (its actual is month-to-date), any other = 1.
     Target to date / Budget to date of the month in progress take this share of its target / budget, so Ach % and Used % compare like with like. */
  const toDateShare = (m, today) => { const t = today || todayISO(); return m === ym(t) ? +t.slice(8, 10) / lastDay(+m.slice(0, 4), +m.slice(5, 7)) : 1; };
  const mul = (v, f) => (v == null ? null : f === 1 ? v : v * f);

  /* ===================== formats ===================== */
  const isNum = v => typeof v === 'number' && isFinite(v);
  const fmtNum = n => (isNum(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '');
  /* ฿1,790,579 · -฿67,500 (the table's minus, as KOL) */
  const baht = n => (isNum(n) ? (Math.round(n) < 0 ? '-' : '') + '฿' + Math.abs(Math.round(n)).toLocaleString('en-US') : C.common.none);
  /* short money (KOL fmtCompact): ฿1.20M · ฿143K · ฿4.4K · ฿950 · a minus is "−" */
  function compact(n) {
    if (!isNum(n)) return C.common.none;
    const a = Math.abs(n), sign = n < 0 && Math.round(a) > 0 ? '−' : '';
    const t = a >= 999500 ? (a / 1e6).toFixed(2) + 'M' : a >= 9950 ? Math.round(a / 1e3) + 'K' : a >= 999.5 ? String(Math.round(a / 100) / 10).replace(/\.0$/, '') + 'K' : String(Math.round(a));
    return sign + '฿' + t;
  }
  const signed = n => (isNum(n) ? (n > 0.5 ? '+' : '') + compact(n) : C.common.none);
  /* CR-04 — the short money of a sentence (captions · Timeline summary · goal values): ฿290.2M · ฿58.2M · ฿143K · ฿950 · a minus is "−" */
  function shortBaht(n) {
    if (!isNum(n)) return C.common.none;
    const a = Math.abs(n), sign = n < 0 && Math.round(a) > 0 ? '−' : '';
    return sign + '฿' + (a >= 999500 ? (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : a >= 999.5 ? Math.round(a / 1e3) + 'K' : String(Math.round(a)));
  }
  const signedShort = n => (isNum(n) ? (n > 0.5 ? '+' : '') + shortBaht(n) : C.common.none);
  const pct = (v, d = 0) => (isNum(v) ? `${(v * 100).toFixed(d)}%` : C.common.none);
  /* CR-04 — Ach % / Used % next to a status: one decimal where rounding would cross 90% or 100% (99.8% At risk never reads "100%") */
  function pctA(v, used) {
    if (!isNum(v)) return C.common.none;
    const p = v * 100;
    if ((p >= 99.5 && p < 100) || (!used && p >= 89.5 && p < 90)) return `${(Math.floor(p * 10) / 10).toFixed(1)}%`;
    if (p > 100 && p < 100.5) return `${(Math.ceil(p * 10) / 10).toFixed(1)}%`;
    return pct(v);
  }
  const times = v => (isNum(v) ? `${v.toFixed(1)}×` : C.common.none);
  const niceStep = raw => { if (!(raw > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };

  /* ===================== multi-select (KOL rules.js, CR-14 §4.2) ===================== */
  const foldText = t => String(t == null ? '' : t).toLocaleLowerCase('th').normalize('NFC').trim();
  const msFilter = (options, q) => { const k = foldText(q); return !k ? options.slice() : options.filter(o => foldText(o.search != null ? o.search : o.label).includes(k)); };
  const msOrder = (options, set) => options.map(o => o.value).filter(v => set.has(v));
  function msToggle(options, value, v, on, min) {
    const set = new Set(value || []);
    if (on) set.add(v); else if (!(set.has(v) && set.size <= (min || 0))) set.delete(v);
    return msOrder(options, set);
  }
  const msSelectAll = (options, value, q) => msOrder(options, new Set(msFilter(options, q).map(o => o.value).concat(value || [])));
  const msLocked = (value, v, min) => !!min && (value || []).includes(v) && (value || []).length <= min;

  /* ===================== the seed → one index (built once per seed) ===================== */
  const STATUSES = ['ongoing', 'not_started', 'complete'];
  const CHANNELS = ['MT', 'TT', 'ECOM'];
  const add = (a, b) => (b == null ? a : a == null ? b : a + b);
  const pair = () => [null, null];
  const cache = new WeakMap();
  function model(seed) {
    if (cache.has(seed)) return cache.get(seed);
    const campaigns = (seed.campaigns || []).slice(), byId = new Map(campaigns.map(c => [c.id, c])), order = new Map(campaigns.map((c, i) => [c.id, i]));
    const prod = new Map();
    (seed.products || []).forEach(p => { if (!prod.has(p.campaign_id)) prod.set(p.campaign_id, new Map()); prod.get(p.campaign_id).set(p.key, p); });
    const cells = new Map(), salesRows = new Map();
    const chPart = () => ({ rev: pair(), qty: pair(), cogs: pair(), bad: [false, false], est: [false, false], estAmt: [0, 0] });
    const cellOf = (cid, m) => {
      if (!cells.has(cid)) cells.set(cid, new Map());
      const cm = cells.get(cid);
      if (!cm.has(m)) cm.set(m, { rev: pair(), qty: pair(), cogs: pair(), bad: [false, false], badAmt: [0, 0], est: [false, false], estAmt: [0, 0], mkt: pair(), sls: pair(), oth: pair(), ch: {}, sub: new Map(), lines: { marketing: new Map(), sales: new Map(), other: new Map() } });
      return cm.get(m);
    };
    /* E1 → E (James, 04/11/2026): the net price a piece of each SKU — Σ amount ÷ Σ quantity of its rows that have both (same Campaign ·
       same scenario, else the other one) · a revenue row with no quantity takes quantity = amount ÷ that price for its COGS (Est.) */
    const unit = new Map();
    (seed.sales || []).forEach(r => { if (isNum(r.qty) && r.qty > 0 && isNum(r.amount) && r.amount > 0) {
      const k = `${r.campaign_id}|${r.product_key}|${r.scenario === 'actual' ? 1 : 0}`, u = unit.get(k) || [0, 0]; u[0] += r.amount; u[1] += r.qty; unit.set(k, u); } });
    const priceOf = (cid, key, i) => { for (const j of [i, 1 - i]) { const u = unit.get(`${cid}|${key}|${j}`); if (u && u[0] > 0 && u[1] > 0) return u[0] / u[1]; } return null; };
    (seed.sales || []).forEach(r => {
      if (!salesRows.has(r.campaign_id)) salesRows.set(r.campaign_id, []);
      salesRows.get(r.campaign_id).push(r);
      const i = r.scenario === 'actual' ? 1 : 0, c = cellOf(r.campaign_id, r.month), p = (prod.get(r.campaign_id) || new Map()).get(r.product_key);
      const ch = c.ch[r.channel] || (c.ch[r.channel] = chPart()), sk = `${r.channel}|${r.sub_channel}`;
      const sub = c.sub.get(sk) || (c.sub.set(sk, { channel: r.channel, sub: r.sub_channel, rev: pair() }), c.sub.get(sk));
      if (r.amount != null) { c.rev[i] = add(c.rev[i], r.amount); ch.rev[i] = add(ch.rev[i], r.amount); sub.rev[i] = add(sub.rev[i], r.amount); }
      if (r.qty != null) { c.qty[i] = add(c.qty[i], r.qty); ch.qty[i] = add(ch.qty[i], r.qty); }
      /* COGS = qty × COGS a piece · no quantity → estimated from the SKU's net price a piece (E1 → E, marked est) ·
         no COGS a piece, or no price to estimate with → the COGS of what holds it is null (D2) */
      const cogs = p && isNum(p.cogs) ? p.cogs : null, price = r.qty == null && cogs != null && isNum(r.amount) ? priceOf(r.campaign_id, r.product_key, i) : null;
      if (r.qty != null && cogs != null) { const v = r.qty * cogs; c.cogs[i] = add(c.cogs[i], v); ch.cogs[i] = add(ch.cogs[i], v); }
      else if (price != null) { const v = r.amount / price * cogs; c.cogs[i] = add(c.cogs[i], v); ch.cogs[i] = add(ch.cogs[i], v); c.est[i] = ch.est[i] = true; c.estAmt[i] += r.amount; ch.estAmt[i] += r.amount; }
      else { c.bad[i] = true; ch.bad[i] = true; c.badAmt[i] += r.amount || 0; }
    });
    (seed.expenses || []).forEach(r => {
      /* CR-07 (D69) — three groups: Marketing · Sales · Other */
      const i = r.scenario === 'actual' ? 1 : 0, c = cellOf(r.campaign_id, r.month), k = r.type === 'marketing' ? 'mkt' : r.type === 'other' ? 'oth' : 'sls';
      c[k][i] = add(c[k][i], r.amount);
      const L = c.lines[r.type] || c.lines.sales, cur = L.get(r.line) || pair(); cur[i] = add(cur[i], r.amount); L.set(r.line, cur);
    });
    const actualMonths = [], salesTo = [], spendTo = [];
    cells.forEach(cm => cm.forEach((c, m) => { const sp = c.mkt[1] != null || c.sls[1] != null || c.oth[1] != null; if (c.rev[1] != null || sp) actualMonths.push(m); if (c.rev[1] != null) salesTo.push(m); if (sp) spendTo.push(m); }));
    const M = { seed, campaigns, byId, order, prod, cells, salesRows, actualTo: actualMonths.sort().pop() || null, salesTo: salesTo.sort().pop() || null, spendTo: spendTo.sort().pop() || null };
    cache.set(seed, M);
    return M;
  }
  const cellsOf = (M, cid) => M.cells.get(cid) || new Map();

  /* ===================== status · days left · scope ===================== */
  /* CR-03 §4 (D25 · D5): Cancelled → past End campaign = Complete → Complete set by hand (closed early) → before Start = Not started → On going ·
     On going / Not started are worked out from the dates every time (a list's "Not started" turns On going by itself on its Start) */
  const CANCELLED = 'cancelled';
  const statusOf = (c, today) => (c.status === CANCELLED ? CANCELLED : c.end && today > c.end ? 'complete' : c.status === 'complete' ? 'complete' : c.start && today < c.start ? 'not_started' : 'ongoing');
  /* Days left: "n days left" (≤ 7 = soon) · "Starts in n days" · ended = "—" */
  function daysLeft(c, today) {
    if (c.end && today > c.end) return { kind: 'ended', n: null, soon: false };
    if (c.start && today < c.start) return { kind: 'starts', n: dayDiff(c.start, today), soon: false };
    const n = dayDiff(c.end, today);
    return { kind: 'left', n, soon: n <= 7 };
  }
  /* a Campaign is in scope when its Start – End overlaps the range and its status is chosen (§4) · Cancelled only with o.includeCancelled (CR-03) ·
     CR-04: statuses [] with includeCancelled = the Cancelled ones only (the Status menu) · o.only = these ids only (Spend & Profit › Scope) */
  function scope(seed, o) {
    const M = model(seed), today = o.today || todayISO(), sts = Array.isArray(o.statuses) ? o.statuses : STATUSES;
    const ok = st => sts.includes(st) || (st === CANCELLED && !!o.includeCancelled), only = Array.isArray(o.only) ? new Set(o.only) : null;
    const ids = M.campaigns.filter(c => c.start <= o.to && c.end >= o.from && (!only || only.has(c.id)) && ok(statusOf(c, today))).map(c => c.id);
    return { M, from: o.from, to: o.to, months: monthsIn(o.from, o.to), ids, today, statuses: sts, includeCancelled: !!o.includeCancelled };
  }
  /* counts a status for the Status menu (the period only, every status · Cancelled too) */
  function statusCounts(seed, from, to, today) {
    const out = { ongoing: 0, not_started: 0, complete: 0, cancelled: 0 };
    model(seed).campaigns.filter(c => c.start <= to && c.end >= from).forEach(c => { out[statusOf(c, today)]++; });
    return out;
  }

  /* ===================== sums over campaign-months ===================== */
  /* T = the raw sums (index 0 = plan, 1 = actual) + the like-for-like plans (D3) · o.channel: one channel's revenue / COGS */
  function sumCells(M, ids, months, o = {}) {
    const T = { rev: pair(), qty: pair(), cogs: pair(), bad: [false, false], mkt: pair(), sls: pair(), oth: pair(), revLfl: null, qtyLfl: null, cogsLfl: null, badLfl: false, spendLfl: null, mktLfl: null, slsLfl: null, othLfl: null, badAmt: 0, n: 0, est: [false, false], estAmt: [0, 0], estLfl: false, estAmtLfl: 0 };
    const today = o.today || todayISO();
    ids.forEach(cid => { const cm = cellsOf(M, cid); months.forEach(m => {
      const c = cm.get(m); if (!c) return;
      const s = o.channel ? c.ch[o.channel] : c, f = toDateShare(m, today); T.n++;
      if (s) {
        for (let i = 0; i < 2; i++) { T.rev[i] = add(T.rev[i], s.rev[i]); T.qty[i] = add(T.qty[i], s.qty[i]); T.cogs[i] = add(T.cogs[i], s.cogs[i]); if (s.bad[i]) T.bad[i] = true; }
        if (s.bad[0]) T.badAmt += o.channel ? 0 : c.badAmt[0];
        /* to date (D3): the target of the campaign-months with actual sales · the month in progress its share to date (CR-04) */
        if (s.rev[1] != null) { T.revLfl = add(T.revLfl, mul(s.rev[0], f)); T.qtyLfl = add(T.qtyLfl, mul(s.qty[0], f)); T.cogsLfl = add(T.cogsLfl, mul(s.cogs[0], f)); if (s.bad[0]) T.badLfl = true; if (s.est[0]) { T.estLfl = true; T.estAmtLfl += s.estAmt[0] * f; } }
        for (let i = 0; i < 2; i++) if (s.est[i]) { T.est[i] = true; T.estAmt[i] += s.estAmt[i]; }
      }
      if (o.channel) return;
      for (let i = 0; i < 2; i++) { T.mkt[i] = add(T.mkt[i], c.mkt[i]); T.sls[i] = add(T.sls[i], c.sls[i]); T.oth[i] = add(T.oth[i], c.oth[i]); }
      /* spend to date: the budget of a campaign-month that has actual spend (marketing · sales · other) · no budget there stays null, never ฿0 */
      if (c.mkt[1] != null || c.sls[1] != null || c.oth[1] != null) { T.mktLfl = add(T.mktLfl, mul(c.mkt[0], f)); T.slsLfl = add(T.slsLfl, mul(c.sls[0], f)); T.othLfl = add(T.othLfl, mul(c.oth[0], f));
        T.spendLfl = add(T.spendLfl, mul(add(add(c.mkt[0], c.sls[0]), c.oth[0]), f)); }
    }); });
    return T;
  }
  const ratio = (a, b) => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);
  const minus = (a, b) => (isNum(a) && isNum(b) ? a - b : null);
  /* the P&L lines of T (§4) — Net revenue · COGS · GP · Marketing · Sales · Total spend · Campaign profit · % and ratios */
  function pnlOf(T) {
    /* every revenue row carries its COGS or marks the set bad (model), so with revenue the COGS is a number unless something is missing */
    const side = i => {
      const rev = T.rev[i], cogs = T.bad[i] ? null : T.cogs[i], mkt = T.mkt[i], sls = T.sls[i], oth = T.oth[i];
      const gp = minus(rev, cogs), spend = add(add(mkt, sls), oth), profit = gp == null ? null : gp - (spend || 0);
      return { rev, qty: T.qty[i], cogs, gp, mkt, sls, oth, spend, profit, est: !T.bad[i] && T.est[i], estAmt: T.bad[i] ? 0 : T.estAmt[i],
        gpPct: ratio(gp, rev), margin: ratio(profit, rev), ap: rev == null ? null : ratio(spend, rev), roi: ratio(profit, spend), roas: ratio(rev, spend) };
    };
    const plan = side(0), actual = side(1);
    /* to date (D3): revenue / GP of the months with actual sales · spend of the months with actual spend */
    const gpLfl = T.badLfl ? null : minus(T.revLfl, T.cogsLfl);
    const lfl = { rev: T.revLfl, qty: T.qtyLfl, gp: gpLfl, spend: T.spendLfl, mkt: T.mktLfl, sls: T.slsLfl, oth: T.othLfl,
      profit: gpLfl == null ? null : gpLfl - (T.spendLfl || 0), est: !T.badLfl && T.estLfl, estAmt: T.badLfl ? 0 : T.estAmtLfl };
    return { plan, actual, lfl, badAmt: T.badAmt, cogsBad: T.bad.slice(), cogsEst: [plan.est, actual.est],
      ach: actual.rev == null ? null : ratio(actual.rev, lfl.rev), used: actual.spend == null ? null : ratio(actual.spend, lfl.spend) };
  }
  const pnl = (M, ids, months, o) => pnlOf(sumCells(M, ids, months, o));
  /* the last month with any actual of a set of campaigns (Actual to …) */
  function actualTo(M, ids, months) {
    let last = null; ids.forEach(cid => cellsOf(M, cid).forEach((c, m) => { if ((!months || months.includes(m)) && (c.rev[1] != null || c.mkt[1] != null || c.sls[1] != null || c.oth[1] != null) && (!last || m > last)) last = m; }));
    return last;
  }
  const hasSalesActual = (M, cid, months) => { let y = false; cellsOf(M, cid).forEach((c, m) => { if (c.rev[1] != null && (!months || months.includes(m))) y = true; }); return y; };
  const hasBudget = (M, cid) => { let y = false; cellsOf(M, cid).forEach(c => { if (c.mkt[0] != null || c.sls[0] != null || c.oth[0] != null) y = true; }); return y; };

  /* ===================== Row 1 — KPI ===================== */
  function kpis(seed, o) {
    const S = scope(seed, o), M = S.M, by = { ongoing: 0, not_started: 0, complete: 0, cancelled: 0 };
    S.ids.forEach(id => by[statusOf(M.byId.get(id), S.today)]++);
    /* Ending next: the On going one with the nearest End campaign (list order on a tie) */
    const next = S.ids.map(id => M.byId.get(id)).filter(c => statusOf(c, S.today) === 'ongoing').sort((a, b) => (a.end < b.end ? -1 : a.end > b.end ? 1 : M.order.get(a.id) - M.order.get(b.id)))[0] || null;
    return { scope: S, campaigns: { n: S.ids.length, by, next: next ? { c: next, days: daysLeft(next, S.today) } : null }, pnl: pnl(M, S.ids, S.months, { today: S.today }),
      anySales: S.ids.some(id => hasSalesActual(M, id, S.months)) };
  }

  /* ===================== CR-10 §3.2 (D95) — where each ฿100 of sales goes: the statement as ฿ of each ฿100 of net revenue (Actual YTD · Plan full) ===================== */
  /* st = R.statement(…, 'full') → { actual: { cogs, mkt, sls, oth, profit }, plan: {…} } (each ÷ net revenue × 100) · nothing new: the same rows as the statement */
  function per100(st) {
    const side = k => { const g = key => { const r = st.rows.find(x => x.key === key); return r ? r[k] : null; }, rev = g('revenue');
      if (!isNum(rev) || rev <= 0) return null; const f = v => (isNum(v) ? v / rev * 100 : null);
      return { rev, cogs: f(g('cogs')), mkt: f(g('mkt')), sls: f(g('sls')), oth: f(g('oth')), profit: f(g('profit')), money: { cogs: g('cogs'), mkt: g('mkt'), sls: g('sls'), oth: g('oth'), profit: g('profit') } }; };
    return { actual: side('actual'), plan: side('plan') };
  }
  /* CR-10 §5.1 (D93) — the rank of the Campaigns of a scope by net revenue (actual, largest first · a tie by name): the colour of a Campaign is its rank (Top 5) */
  function campaignRank(seed, o) {
    const S = scope(seed, o), M = S.M;
    return S.ids.map(id => ({ id, c: M.byId.get(id), rev: pnl(M, [id], S.months, { today: S.today }).actual.rev || 0 })).sort((a, b) => b.rev - a.rev || a.c.name.localeCompare(b.c.name, 'en')).map((x, i) => Object.assign(x, { rank: i }));
  }

  /* ===================== CR-09 §4 (D80) — one status rule at every level of Campaign Monitor: the Pace of D67 ===================== */
  /* a node of R.attainment (a Channel · a Sub-channel · a SKU · a SKU × Channel): Ach % of ITS full target ÷ Time gone of the Campaign · Gap to pace =
     what it sold less what it would have sold on pace (Full target × Time gone) · the target to date of D14 stays in the tooltips */
  function paceNode(n, tg) {
    if (!n) return { achF: null, pace: null, status: null, gapPace: null };
    const achF = ratio(n.actTD, n.target), pace = paceOf(achF, tg);
    return { achF, pace, status: salesStatus(pace, tg), gapPace: n.target == null || tg == null ? null : (n.actTD || 0) - n.target * tg };
  }
  /* CR-09 §4.3 — the Sales mix of a Campaign: each Channel's full target and actual (their share of the whole) · its Sub-channels (actual + share in the
     Channel only — D63) · o = { unit, today } */
  function salesMix(seed, cid, o = {}) {
    const a = attainment(seed, cid, { unit: o.unit, today: o.today }), T = a.channels.reduce((s, x) => s + (x.node.target || 0), 0), A = a.channels.reduce((s, x) => s + (x.node.actTD || 0), 0);
    const channels = a.channels.map(x => ({ channel: x.channel, target: x.node.target, actual: x.node.actTD, tShare: T ? (x.node.target || 0) / T : null, aShare: A ? (x.node.actTD || 0) / A : null,
      subs: x.subs.filter(s => s.sub && s.node && s.node.actTD != null).map(s => ({ sub: s.sub, actual: s.node.actTD, share: x.node.actTD ? s.node.actTD / x.node.actTD : null })).sort((p, q) => q.actual - p.actual) }));
    return { channels, target: T || null, actual: a.months.length ? A : null };
  }
  /* CR-09 §4.3 (D82) — SKU × Channel: the actual of every SKU in every Channel (+ Ach % of the full target · the Pace status) · share = of the Campaign's actual ·
     o = { unit, channel (one Channel only), today } */
  function skuMatrix(seed, cid, o = {}) {
    const a = attainment(seed, cid, { unit: o.unit, channel: o.channel, today: o.today }), c = model(seed).byId.get(cid), tg = c ? timeGone(c, o.today || todayISO()) : null;
    const chs = a.channel ? [a.channel] : CHANNELS.filter(k => a.channels.some(x => x.channel === k)), tot = a.total.actTD;
    const cell = n => (n ? Object.assign({ actual: n.actTD, target: n.target, share: tot ? (n.actTD || 0) / tot : null }, paceNode(n, tg)) : null);
    const rows = a.skus.map(s => ({ key: s.key, product: s.product, byCh: Object.fromEntries(chs.map(k => [k, s.byCh[k] && s.byCh[k].target != null || (s.byCh[k] && s.byCh[k].actTD) ? cell(s.byCh[k]) : null])), total: cell(s.node) }));
    const byCh = Object.fromEntries(chs.map(k => { const x = a.channels.find(y => y.channel === k); return [k, x ? cell(x.node) : null]; }));
    return { channels: chs, rows, byCh, total: cell(a.total), months: a.months, tg, unit: a.unit };
  }
  /* CR-09 §4.5 (D84) — what the sales did after End marketing: the average net revenue a month after it ÷ the average a month from Start to End marketing − 1 ·
     during = the months up to the month of End marketing · after = the complete months after it, up to End campaign · none after (or no End marketing) → null */
  function afterMarketingDrop(seed, cid, today) {
    const M = model(seed), c = M.byId.get(cid), td = today || todayISO(); if (!c || !c.end_marketing) return { drop: null, during: null, after: null, nDuring: 0, nAfter: 0 };
    const cur = ym(td), em = ym(c.end_marketing), endM = ym(c.end), A = new Set(salesMonths(M, cid)), cm = cellsOf(M, cid), rev = m => (cm.get(m) && cm.get(m).rev[1]) || 0;
    const during = [...A].filter(m => m <= em && m < cur), after = [...A].filter(m => m > em && m <= endM && m < cur);
    const avg = list => (list.length ? list.reduce((s, m) => s + rev(m), 0) / list.length : null), d = avg(during), f = avg(after);
    return { drop: d && f != null ? f / d - 1 : null, during: d, after: f, nDuring: during.length, nAfter: after.length, endMkt: c.end_marketing };
  }
  /* CR-09 §4.2 — the spend pace of a Campaign (the Burn-up's dashed Used %): spent to date + the average spend of its complete months × the months left of R.forecast */
  function spendPace(seed, cid, today) {
    const M = model(seed), c = M.byId.get(cid), td = today || todayISO(), cur = ym(td), cm = cellsOf(M, cid), f = forecast(seed, cid, { today: td });
    const sp = m => { const x = cm.get(m); return x ? (x.mkt[1] || 0) + (x.sls[1] || 0) + (x.oth[1] || 0) : 0; };
    const ms = [...cm.keys()].filter(m => sp(m) > 0).sort(), done = ms.filter(m => m < cur && m >= ym(c.start)), spent = ms.reduce((s, m) => s + sp(m), 0);
    const pace = done.length ? done.reduce((s, m) => s + sp(m), 0) / done.length : null, left = td > c.end ? 0 : f.monthsLeft;
    return { spent, pace, monthsLeft: left, end: pace == null || left == null ? spent : spent + pace * left };
  }

  /* ===================== CR-08 §6.4 (D77) — Marketing efficiency: net sales per ฿1 of marketing, a Campaign of the scope ===================== */
  /* actual = Net revenue ÷ Marketing expenses (to date) · plan = Target ÷ Marketing budget (the months of the scope) · vs = actual ÷ plan →
     ok ≥ the plan · warn up to 20% below · err more than 20% below · avg = Σ net revenue ÷ Σ marketing of the Campaigns that have both (the dashed line) ·
     nothing new is stored: the same Net revenue / Marketing / Target / Budget as the P&L (the anchor does not move) */
  function mktEfficiency(seed, o) {
    const S = scope(seed, o), M = S.M;
    const rows = S.ids.map(id => {
      const p = pnl(M, [id], S.months, { today: S.today }), A = p.actual, P0 = p.plan, actual = ratio(A.rev, A.mkt), plan = ratio(P0.rev, P0.mkt), vs = ratio(actual, plan);
      return { id, c: M.byId.get(id), rev: A.rev, mkt: A.mkt, target: P0.rev, mktBudget: P0.mkt, actual, plan, share: ratio(A.mkt, A.rev), vs,
        tone: vs == null ? null : vs >= 1 - 1e-9 ? 'ok' : vs >= 0.8 ? 'warn' : 'err' };
    });
    const both = rows.filter(r => isNum(r.rev) && isNum(r.mkt) && r.mkt > 0), sr = both.reduce((s, r) => s + r.rev, 0), sm = both.reduce((s, r) => s + r.mkt, 0);
    return { rows, byId: new Map(rows.map(r => [r.id, r])), avg: both.length ? sr / sm : null, rev: both.length ? sr : null, mkt: both.length ? sm : null };
  }

  /* ===================== Row 2 — P&L by month (revenue · spend · profit) ===================== */
  /* one row a month: plan (the tick) · actual (the bar, null = no bar) · lfl (the plan of the campaigns with actual that month) · variance = actual − lfl */
  function byMonth(seed, o, measure) {
    const S = scope(seed, o), M = S.M, cur = ym(S.today);
    const rows = S.months.map(m => {
      const p = pnl(M, S.ids, [m], { today: S.today }), row = { m, current: m === cur, future: m > cur, mkt: p.actual.mkt, sls: p.actual.sls, oth: p.actual.oth, mktPlan: p.plan.mkt, slsPlan: p.plan.sls, othPlan: p.plan.oth, cogsBad: p.cogsBad[0] };
      if (measure === 'spend') Object.assign(row, { plan: p.plan.spend, actual: p.actual.spend, lfl: p.actual.spend == null ? null : p.lfl.spend });
      /* CR-04 — Sales › Target vs Actual by month in pieces (Qty) */
      else if (measure === 'qty') Object.assign(row, { plan: p.plan.qty, actual: p.actual.rev == null ? null : p.actual.qty, lfl: p.actual.rev == null ? null : p.lfl.qty });
      else if (measure === 'profit') Object.assign(row, { plan: p.plan.profit, actual: p.actual.rev == null ? null : p.actual.profit, lfl: p.actual.rev == null ? null : p.lfl.profit,
        est: p.plan.est || (p.actual.rev != null && (p.actual.est || p.lfl.est)), estAmt: Math.max(p.plan.estAmt || 0, p.actual.rev != null ? p.actual.estAmt || 0 : 0) });
      else Object.assign(row, { plan: p.plan.rev, actual: p.actual.rev, lfl: p.actual.rev == null ? null : p.lfl.rev });
      row.variance = row.actual == null || row.lfl == null ? null : row.actual - row.lfl;
      return row;
    });
    /* cumulative: running plan · running actual up to the last month with actual · the variance of the running totals */
    let cp = null, ca = null, cl = null, planOk = true;
    const lastA = rows.map(r => r.actual != null).lastIndexOf(true);
    const cum = rows.map((r, i) => {
      if (r.plan == null && r.cogsBad && measure === 'profit') planOk = false;
      cp = add(cp, r.plan); if (r.actual != null) { ca = add(ca, r.actual); cl = add(cl, r.lfl); }
      const a = i <= lastA ? ca : null;
      return { m: r.m, plan: planOk ? cp : null, actual: a, lfl: a == null ? null : cl, variance: a == null || cl == null ? null : a - cl };
    });
    const withA = rows.filter(r => r.actual != null), sumOf = k => withA.reduce((s, r) => add(s, r[k]), null);
    const actual = sumOf('actual'), lfl = sumOf('lfl');
    const planTotal = rows.some(r => r.plan == null && r.cogsBad && measure === 'profit') ? null : rows.reduce((s, r) => add(s, r.plan), null);
    return { scope: S, measure, rows, cum, est: rows.some(r => r.est), toDate: actual == null ? null : { actual, plan: lfl, pct: ratio(actual, lfl), gap: lfl == null ? null : actual - lfl }, planTotal };
  }

  /* ===================== Row 3 — Campaign portfolio ===================== */
  /* CR-02 §6 — Attention (default): Behind → Over budget → Ending soon → the rest */
  const SORTS = ['attention', 'status', 'start', 'revenue', 'profit', 'name'];
  const ST_ORDER = { ongoing: 0, not_started: 1, complete: 2, cancelled: 3 };
  const ENDING_SOON = 30;   // D17
  const attentionRank = r => (r.chips.behind ? 0 : r.chips.over ? 1 : r.chips.soon && !r.chips.cancelled ? 2 : 3);
  /* a value that is null goes last whatever the direction */
  const byNum = (a, b) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : b - a);
  function sortRows(rows, key, M) {
    const tie = (a, b) => M.order.get(a.c.id) - M.order.get(b.c.id);
    const byStatus = (a, b) => ST_ORDER[a.status] - ST_ORDER[b.status] || (a.c.end < b.c.end ? -1 : a.c.end > b.c.end ? 1 : 0) || tie(a, b);
    const cmp = {
      attention: (a, b) => attentionRank(a) - attentionRank(b) || (a.chips.behind && b.chips.behind ? a.pnl.ach - b.pnl.ach : 0) || (a.chips.over && b.chips.over ? b.pnl.used - a.pnl.used : 0) || byStatus(a, b),
      status: byStatus,
      start: (a, b) => (a.c.start < b.c.start ? -1 : a.c.start > b.c.start ? 1 : 0) || tie(a, b),
      revenue: (a, b) => byNum(a.pnl.actual.rev, b.pnl.actual.rev) || byNum(a.pnl.plan.rev, b.pnl.plan.rev) || tie(a, b),
      profit: (a, b) => byNum(a.pnl.actual.profit, b.pnl.actual.profit) || byNum(a.pnl.plan.profit, b.pnl.plan.profit) || tie(a, b),
      name: (a, b) => a.c.name.localeCompare(b.c.name, 'en') || tie(a, b),
    }[SORTS.includes(key) ? key : 'attention'];
    return rows.slice().sort(cmp);
  }
  function portfolio(seed, o, sort) {
    const S = scope(seed, o), M = S.M;
    const rows = sortRows(S.ids.map(id => {
      const c = M.byId.get(id), p = pnl(M, [id], S.months, { today: S.today }), days = daysLeft(c, S.today);
      return { c, status: statusOf(c, S.today), days, pnl: p, actualTo: actualTo(M, [id], S.months),
        ch: CHANNELS.map(k => ({ channel: k, pnl: pnl(M, [id], S.months, { channel: k, today: S.today }) })).filter(x => x.pnl.plan.rev != null || x.pnl.actual.rev != null),
        /* CR-02 §6 — Behind (Ach % < 90%, D14) · Over budget (Used % > 100%) · Ending soon (≤ 30 days, D17) */
        /* CR-03 — Pending build (in the list, not in the seed yet) · Cancelled */
        chips: { pending: !!c.pending, cancelled: statusOf(c, S.today) === CANCELLED, noActual: !c.pending && !hasSalesActual(M, id), noBudget: !c.pending && !hasBudget(M, id), behind: p.ach != null && p.ach < AT_RISK, over: p.used != null && p.used > 1,
          soon: !c.pending && days.kind === 'left' && days.n <= ENDING_SOON && statusOf(c, S.today) !== CANCELLED } };
    }), sort, M);
    return { scope: S, rows, total: pnl(M, S.ids, S.months, { today: S.today }) };
  }

  /* ===================== Row 4 — Campaign timeline ===================== */
  function timeline(seed, o, measure, sort) {
    const P = portfolio(seed, o, sort), S = P.scope, M = S.M;
    let max = 0;
    const rows = P.rows.map(r => {
      const bins = S.months.map(m => { const c = cellsOf(M, r.c.id).get(m), v = !c ? null : measure === 'spend' ? add(add(c.mkt[1], c.sls[1]), c.oth[1]) : c.rev[1]; if (v > max) max = v; return { m, v }; });
      return Object.assign({}, r, { bins, summary: summaryOf(r.pnl, measure, r) });
    });
    return { scope: S, rows, max, measure };
  }
  /* CR-04 P7 — the short words at the right of a row (one line): Ach 96% · ฿58.2M — Used 94% · ฿3.1M — Starts 01/01/2027 — Cancelled — Target ฿x */
  function summaryOf(p, measure, r) {
    const T = C.dash.t;
    if (r && r.status === CANCELLED) return { kind: 'none', text: T.sumCancelled };
    if (measure === 'spend') {
      if (p.actual.spend != null) return { kind: 'ok', text: T.sumSpend(pct(p.used), shortBaht(p.actual.spend)) };
      if (r && r.status === 'not_started') return { kind: 'plan', text: T.sumStarts(dmy(r.c.start)) };
      if (p.plan.spend != null) return { kind: 'plan', text: T.sumBudgetOnly(shortBaht(p.plan.spend)) };
      return { kind: 'none', text: T.noData };
    }
    if (p.actual.rev != null) return { kind: 'ok', text: T.sumRev(pct(p.ach), shortBaht(p.actual.rev)) };
    if (r && r.status === 'not_started') return { kind: 'plan', text: T.sumStarts(dmy(r.c.start)) };
    if (p.plan.rev != null) return { kind: 'plan', text: T.sumPlanOnly(shortBaht(p.plan.rev)) };
    return { kind: 'none', text: T.noData };
  }

  /* ===================== Row 5 — channel · expense line · sub-channel ===================== */
  function byChannel(seed, o) {
    const S = scope(seed, o), M = S.M;
    const rows = CHANNELS.map(k => { const T = sumCells(M, S.ids, S.months, { channel: k }); return { channel: k, plan: T.rev[0], actual: T.rev[1] }; });
    const tot = i => rows.reduce((s, r) => add(s, i ? r.actual : r.plan), null);
    return { scope: S, rows, total: { plan: tot(0), actual: tot(1) } };
  }
  function byLine(seed, o, type) {
    const S = scope(seed, o), M = S.M, map = new Map();
    S.ids.forEach(cid => S.months.forEach(m => { const c = cellsOf(M, cid).get(m); if (!c) return;
      c.lines[type].forEach((v, line) => { const cur = map.get(line) || pair(); cur[0] = add(cur[0], v[0]); cur[1] = add(cur[1], v[1]); map.set(line, cur); }); }));
    const rows = [...map].map(([line, v]) => ({ line, budget: v[0], actual: v[1], variance: v[1] == null || v[0] == null ? null : v[1] - v[0] }))
      .sort((a, b) => byNum(a.actual, b.actual) || byNum(a.budget, b.budget) || a.line.localeCompare(b.line));
    const tot = k => rows.reduce((s, r) => add(s, r[k]), null);
    return { scope: S, type, rows, total: { budget: tot('budget'), actual: tot('actual') } };
  }
  /* top 8 by the chosen side (actual · plan — no actual yet: ranked by plan) + the rest as one Other row */
  function bySubChannel(seed, o, side, top = 8) {
    const S = scope(seed, o), M = S.M, map = new Map();
    S.ids.forEach(cid => S.months.forEach(m => { const c = cellsOf(M, cid).get(m); if (!c) return;
      c.sub.forEach((v, k) => { const cur = map.get(k) || { channel: v.channel, sub: v.sub, plan: null, actual: null }; cur.plan = add(cur.plan, v.rev[0]); cur.actual = add(cur.actual, v.rev[1]); map.set(k, cur); }); }));
    const all = [...map.values()], anyActual = all.some(r => r.actual != null), rankBy = side === 'actual' && anyActual ? 'actual' : 'plan';
    all.sort((a, b) => byNum(a[rankBy], b[rankBy]) || byNum(a.plan, b.plan) || a.sub.localeCompare(b.sub));
    const shown = all.filter(r => r[rankBy] != null || r.plan != null);
    const head = shown.slice(0, top), rest = shown.slice(top);
    const other = rest.length ? { other: true, n: rest.length, channel: '', sub: C.dash.sc.other(rest.length), plan: rest.reduce((s, r) => add(s, r.plan), null), actual: rest.reduce((s, r) => add(s, r.actual), null) } : null;
    const tot = k => shown.reduce((s, r) => add(s, r[k]), null);
    return { scope: S, side, rankBy, anyActual, rows: other ? head.concat([other]) : head, total: { plan: tot('plan'), actual: tot('actual') } };
  }

  /* ===================== P&L statement (CR-01 §6 → CR-02 §8: P&L Waterfall › P&L statement) ===================== */
  /* ids: one Campaign id, or the Campaigns of a scope (o.statuses applies then) · mode 'same' (D3 — each line's plan over the months that line has
     actual: revenue / COGS / GP the sales months, the expense lines the spend months) · 'full' */
  function statement(seed, o, ids, mode) {
    const one = typeof ids === 'string', S = scope(seed, one ? Object.assign({}, o, { statuses: STATUSES, includeCancelled: true }) : o), M = S.M;
    const list = one ? [ids] : ids == null ? S.ids : ids, c = one ? M.byId.get(ids) : null, months = S.months;
    const p = pnl(M, list, months, { today: S.today }), same = mode !== 'full';
    const lines = type => {
      const map = new Map();
      list.forEach(cid => { const cm = cellsOf(M, cid); months.forEach(m => { const cell = cm.get(m); if (!cell) return; const spendA = cell.mkt[1] != null || cell.sls[1] != null || cell.oth[1] != null, f = toDateShare(m, S.today);
        cell.lines[type].forEach((v, line) => { const cur = map.get(line) || { line, plan: null, actual: null }; cur.actual = add(cur.actual, v[1]);
          if (!same) cur.plan = add(cur.plan, v[0]); else if (spendA) cur.plan = add(cur.plan, mul(v[0], f)); map.set(line, cur); }); }); });
      return [...map.values()].filter(x => x.plan != null || x.actual != null)
        .map(x => Object.assign(x, { var: minus(x.actual, x.plan), varPct: isNum(x.actual) && isNum(x.plan) && x.plan !== 0 ? (x.actual - x.plan) / Math.abs(x.plan) : null }))
        .sort((a, b) => byNum(a.actual, b.actual) || byNum(a.plan, b.plan) || a.line.localeCompare(b.line));
    };
    const plan = same ? { rev: p.lfl.rev, gp: p.lfl.gp, mkt: p.lfl.mkt, sls: p.lfl.sls, oth: p.lfl.oth } : { rev: p.plan.rev, gp: p.plan.gp, mkt: p.plan.mkt, sls: p.plan.sls, oth: p.plan.oth };
    plan.cogs = same ? minus(plan.rev, plan.gp) : p.plan.cogs;
    plan.profit = plan.gp == null ? null : plan.gp - (plan.mkt || 0) - (plan.sls || 0) - (plan.oth || 0);
    const A = p.actual;
    const row = (key, pl, ac, good) => ({ key, plan: pl, actual: ac, var: minus(ac, pl), varPct: isNum(ac) && isNum(pl) && pl !== 0 ? (ac - pl) / Math.abs(pl) : null, good });
    return {
      campaign: c, ids: list, status: c ? statusOf(c, S.today) : null, scope: S, mode: same ? 'same' : 'full', actualTo: actualTo(M, list, months), pnl: p,
      rows: [row('revenue', plan.rev, A.rev, 'up'), row('cogs', plan.cogs, A.cogs, 'down'), row('gp', plan.gp, A.gp, 'up'),
        row('mkt', plan.mkt, A.mkt, 'down'), row('sls', plan.sls, A.sls, 'down'), row('oth', plan.oth, A.oth, 'down'), row('profit', plan.profit, A.profit, 'up')],
      pct: { gp: [ratio(plan.gp, plan.rev), A.gpPct], margin: [ratio(plan.profit, plan.rev), A.margin] },
      lines: { mkt: lines('marketing'), sls: lines('sales'), oth: lines('other') },
      est: (() => { const pe = same ? p.lfl.est : p.plan.est, who = i => list.filter(id => { const q = pnl(M, [id], months, { today: S.today }); return i === 0 ? (same ? q.lfl.est : q.plan.est) : q.actual.est; }).map(id => M.byId.get(id).name);
        return { plan: pe, actual: A.est, planAmt: pe ? (same ? p.lfl.estAmt : p.plan.estAmt) : 0, actualAmt: A.est ? A.estAmt : 0, who: [pe ? who(0) : [], A.est ? who(1) : []] }; })(),
    };
  }
  /* polarity (§2.4): revenue / profit under plan = bad · spend over budget = bad → 'good' | 'bad' | '' */
  const tone = (v, good) => (!isNum(v) || Math.abs(v) < 0.5 ? '' : (v > 0) === (good === 'up') ? 'good' : 'bad');

  /* ===================== CR-02 §4 — attainment · time · run-rate · waterfall ===================== */
  /* D14: On target ≥ 100% · At risk 90–99.9% · Behind < 90% of Ach % to date */
  const AT_RISK = 0.9;
  const ATT = ['behind', 'at_risk', 'on_target'];
  const attStatus = ach => (ach == null ? null : ach >= 1 ? 'on_target' : ach >= AT_RISK ? 'at_risk' : 'behind');
  /* the months a Campaign has Sales actual (at least one row) — inside them a SKU × Channel with no actual sold 0 · outside them = null */
  const salesMonths = (M, cid) => [...new Set((M.salesRows.get(cid) || []).filter(r => r.scenario === 'actual').map(r => r.month))].sort();
  /* the months a Campaign is looked at (D19): Start … End, and any month its target / actual sits in */
  function campaignMonths(M, cid) {
    const c = M.byId.get(cid), ms = (M.salesRows.get(cid) || []).map(r => r.month).sort();
    const a = [R0(c.start), ms[0]].filter(Boolean).sort()[0], b = [R0(c.end), ms[ms.length - 1]].filter(Boolean).sort().pop();
    return monthsIn(monthFirst(a), monthLast(b));
  }
  function R0(d) { return d ? ym(d) : null; }
  /* one row of attainment: full target · target to date · actual to date · Ach % · Gap · Remaining · status */
  function attNode(t, tTD, aTD) {
    const ach = tTD > 0 && aTD != null ? aTD / tTD : null;
    return { target: t, tgtTD: tTD, actTD: aTD, ach, gap: tTD != null && aTD != null ? aTD - tTD : null, remaining: t == null ? null : t - (aTD || 0),
      status: tTD > 0 ? attStatus(ach) : aTD > 0 ? 'no_target' : null };
  }
  /* o = { channel: 'MT' | 'TT' | 'ECOM' | null, unit: 'amount' | 'qty' } → the whole Campaign · each Channel (+ its Sub-channels) · each SKU (+ its Channels) */
  function attainment(seed, cid, o = {}) {
    const M = model(seed), c = M.byId.get(cid), unit = o.unit === 'qty' ? 'qty' : 'amount', ch = CHANNELS.includes(o.channel) ? o.channel : null, today = o.today || todayISO();
    const A = salesMonths(M, cid), inA = new Set(A), rows = (M.salesRows.get(cid) || []).filter(r => !ch || r.channel === ch), acc = new Map();
    const bump = (k, r) => { let a = acc.get(k); if (!a) acc.set(k, a = { t: null, tTD: null, aTD: null, n: 0 }); a.n++; const v = r[unit]; if (v == null) return;
      if (r.scenario === 'target') { a.t = add(a.t, v); if (inA.has(r.month)) a.tTD = add(a.tTD, v * toDateShare(r.month, today)); } else if (inA.has(r.month)) a.aTD = add(a.aTD, v); };
    rows.forEach(r => ['T', 'C|' + r.channel, `S|${r.channel}|${r.sub_channel}`, 'P|' + r.product_key, `PC|${r.product_key}|${r.channel}`].forEach(k => bump(k, r)));
    /* with months that have actual, a missing target / actual inside them is 0 · with none at all both are null */
    const node = k => { const a = acc.get(k); if (!a) return null; return attNode(a.t, A.length ? a.tTD || 0 : null, A.length ? a.aTD || 0 : null); };
    const prods = M.prod.get(cid) || new Map();
    const channels = CHANNELS.filter(k => acc.has('C|' + k)).map(k => ({ channel: k, node: node('C|' + k),
      subs: [...new Set(rows.filter(r => r.channel === k).map(r => r.sub_channel))].map(s => ({ sub: s, node: node(`S|${k}|${s}`) })) }));
    const skus = [...new Set(rows.map(r => r.product_key))].map(key => ({ key, product: prods.get(key) || { key, name: key.replace(/^name:/, ''), code: null },
      node: node('P|' + key), byCh: Object.fromEntries(CHANNELS.map(k => [k, node(`PC|${key}|${k}`)])) }));
    return { campaign: c, unit, channel: ch, months: A, total: node('T') || attNode(null, A.length ? 0 : null, A.length ? 0 : null), channels, skus };
  }
  /* ===================== CR-11 §5.3 (D103) — SKU trend: Ach % of each SKU each month (actual ÷ the target of that month) ===================== */
  /* months = Start … this month (or End) · a month with no actual of the Campaign yet stays empty · in a month with actual a SKU's missing actual is 0 ·
     no target that month = no Ach (empty) · the month in progress = its actual so far ÷ its whole target · o = { channel, unit, today } →
     { months, byKey: Map(product key → { 'yyyy-mm': { actual, target, ach } }) } · nothing new: the same sales rows as the matrix */
  function skuTrend(seed, cid, o = {}) {
    const M = model(seed), c = M.byId.get(cid), unit = o.unit === 'qty' ? 'qty' : 'amount', ch = CHANNELS.includes(o.channel) ? o.channel : null, today = o.today || todayISO();
    if (!c || today < c.start) return { months: [], byKey: new Map() };
    const months = monthsIn(c.start, today < c.end ? today : c.end), inM = new Set(months), inA = new Set(salesMonths(M, cid)), acc = new Map();
    (M.salesRows.get(cid) || []).filter(r => (!ch || r.channel === ch) && inM.has(r.month) && r[unit] != null).forEach(r => {
      let k = acc.get(r.product_key); if (!k) acc.set(r.product_key, k = {}); const x = k[r.month] || (k[r.month] = { t: null, a: null });
      if (r.scenario === 'target') x.t = add(x.t, r[unit]); else if (r.scenario === 'actual') x.a = add(x.a, r[unit]); });
    const byKey = new Map([...acc].map(([key, k]) => [key, Object.fromEntries(months.filter(m => inA.has(m) && k[m]).map(m => { const t = k[m].t, a = k[m].a || 0;
      return [m, { actual: a, target: t, ach: isNum(t) && t > 0 ? a / t : null }]; }))]));
    return { months, byKey, actualMonths: months.filter(m => inA.has(m)) };
  }
  /* ===================== CR-11 §5.2 (D104) — Cumulative profit: the profit of one Campaign a month and its running total (Actual · Plan) ===================== */
  /* a month = Net revenue − COGS − Marketing − Sales − Other of that month (a month with spend and no sales counts its loss) · Actual: the months with any actual ·
     the running Actual runs up to the last of them (its last value = the Campaign profit of the statement) · Plan: every month · break-even = the first month the
     running total is ≥ 0 (Actual · Plan) · o = { months, today } */
  function profitByMonth(seed, cid, o = {}) {
    const M = model(seed), cm = cellsOf(M, cid), cur = ym(o.today || todayISO()), months = o.months || [...cm.keys()].sort();
    const side = (x, i) => { if (!x || ![x.rev, x.mkt, x.sls, x.oth].some(p => p[i] != null)) return null; if (x.rev[i] != null && x.bad[i]) return null;
      return (x.rev[i] || 0) - (x.cogs[i] || 0) - (x.mkt[i] || 0) - (x.sls[i] || 0) - (x.oth[i] || 0); };
    const raw = months.map(m => ({ m, actual: side(cm.get(m), 1), plan: side(cm.get(m), 0), current: m === cur }));
    const lastA = raw.map(r => r.actual != null).lastIndexOf(true);
    let ca = null, cp = null, be = null, beP = null;
    const rows = raw.map((r, i) => { if (r.actual != null) ca = add(ca, r.actual); if (r.plan != null) cp = add(cp, r.plan);
      const cumActual = i <= lastA ? ca : null, cumPlan = cp;
      if (!be && i <= lastA && isNum(cumActual) && cumActual >= -1e-6) be = r.m; if (!beP && isNum(cumPlan) && cumPlan >= -1e-6) beP = r.m;
      return Object.assign(r, { cumActual, cumPlan }); });
    return { rows, lastA, be, beP, total: lastA >= 0 ? ca : null, planTotal: cp };
  }
  const ATT_SORTS = ['gap', 'ach', 'target', 'name'];
  /* Gap: furthest behind first · Ach %: lowest first · Target: largest first · Name: A→Z — null always last */
  function sortAtt(list, key, nameOf) {
    const up = (a, b) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : a - b);
    const f = { gap: (a, b) => up(a.node.gap, b.node.gap), ach: (a, b) => up(a.node.ach, b.node.ach), target: (a, b) => byNum(a.node.tgtTD, b.node.tgtTD) || byNum(a.node.target, b.node.target),
      name: () => 0 }[ATT_SORTS.includes(key) ? key : 'gap'];
    return list.slice().sort((a, b) => f(a, b) || String(nameOf(a)).localeCompare(String(nameOf(b)), 'en'));
  }
  /* time of a Campaign: Elapsed % = (today − Start + 1) ÷ (End − Start + 1) · Days left = End − today (End campaign, D16) */
  /* ===================== CR-07 §3.1 (D67) — Time gone · Ach of the Full target · Pace · Sales status ===================== */
  const PACE_OK = 0.95, PACE_RISK = 0.85, EARLY = 0.1;
  /* Time gone % = (today − Start + 1) ÷ (End − Start + 1) · 0 before Start · 1 after End */
  const timeGone = (c, today) => { const tp = timeProgress(c, today); return tp.pct == null ? null : tp.pct; };
  const paceOf = (ach, tg) => (isNum(ach) && isNum(tg) && tg > 0 ? ach / tg : null);
  /* On track ≥ 0.95 · At risk 0.85–0.95 · Behind < 0.85 · not started / under 10% of the time gone / no target → null ("—", too early) */
  const salesStatus = (pace, tg) => (pace == null || tg == null || tg < EARLY ? null : pace >= PACE_OK ? 'on_track' : pace >= PACE_RISK ? 'at_risk' : 'behind');
  /* one Campaign: the actual to today ÷ its Full target (every month) · against the time gone */
  function campaignPace(seed, cid, today) {
    const M = model(seed), c = M.byId.get(cid), td = today || todayISO(); if (!c) return null;
    let target = null, actual = null; cellsOf(M, cid).forEach(cell => { target = add(target, cell.rev[0]); actual = add(actual, cell.rev[1]); });
    const tg = timeGone(c, td), ach = ratio(actual, target), pace = paceOf(ach, tg), st = c.status === CANCELLED ? null : salesStatus(pace, tg);
    return { c, target, actual, ach, timeGone: tg, pace, status: st, gap: ach == null || tg == null ? null : (ach - tg) * 100, started: td >= c.start, ended: td > c.end };
  }
  /* the year: the share of the year gone · Actual YTD ÷ the Full-year target (the target of the year's months of the Campaigns in scope) */
  /* the Pace as shown: 2 decimals cut (not rounded) so the number never passes a threshold its status did not (0.9496 → 0.94 At risk) */
  const paceText = v => (v == null ? null : (Math.floor(v * 100 + 1e-6) / 100).toFixed(2));
  function yearGone(year, today) { const a = `${year}-01-01`, b = `${year}-12-31`, td = today || todayISO(); if (td < a) return 0; if (td > b) return 1; return (dayDiff(td, a) + 1) / (dayDiff(b, a) + 1); }

  function timeProgress(c, today) {
    const total = dayDiff(c.end, c.start) + 1, done = Math.max(0, Math.min(total, dayDiff(today, c.start) + 1));
    return { total, elapsed: done, pct: total > 0 ? done / total : null, daysLeft: Math.max(0, dayDiff(c.end, today)), started: today >= c.start, ended: today > c.end };
  }
  /* target vs actual by month (the one monthly chart's model): plan = target · actual only in months with actual (0 there when the filter has none) */
  function targetByMonth(seed, cid, o = {}) {
    const M = model(seed), unit = o.unit === 'qty' ? 'qty' : 'amount', ch = CHANNELS.includes(o.channel) ? o.channel : null, today = o.today || todayISO(), cur = ym(today);
    const inA = new Set(salesMonths(M, cid)), rows = (M.salesRows.get(cid) || []).filter(r => !ch || r.channel === ch);
    const out = campaignMonths(M, cid).map(m => {
      let t = null, a = null;
      rows.forEach(r => { if (r.month !== m || r[unit] == null) return; if (r.scenario === 'target') t = add(t, r[unit]); else a = add(a, r[unit]); });
      const actual = inA.has(m) ? a || 0 : null, lfl = actual == null ? null : (t || 0) * toDateShare(m, today);
      return { m, current: m === cur, future: m > cur, plan: t, actual, lfl, variance: actual == null ? null : actual - lfl };
    });
    let cp = null, ca = null, cl = null;
    const last = out.map(r => r.actual != null).lastIndexOf(true);
    const cum = out.map((r, i) => { cp = add(cp, r.plan); if (r.actual != null) { ca = add(ca, r.actual); cl = add(cl, r.lfl); } const a = i <= last ? ca : null;
      return { m: r.m, plan: cp, actual: a, lfl: a == null ? null : cl, variance: a == null || cl == null ? null : a - cl }; });
    const wa = out.filter(r => r.actual != null), sum = k => wa.reduce((s, r) => add(s, r[k]), null), actual = sum('actual'), lfl = sum('lfl');
    return { rows: out, cum, unit, toDate: actual == null ? null : { actual, plan: lfl, pct: ratio(actual, lfl), gap: lfl == null ? null : actual - lfl }, planTotal: out.reduce((s, r) => add(s, r.plan), null) };
  }
  /* CR-04 §8 — Forecast (Est.) of a Campaign (one rule for By campaign · Sales · Needs attention · D16 · E3):
     Current pace = the average actual of the complete months with actual (the month in progress is not complete) ·
     Months left = the rest of the month in progress (when it has actual: 1 − day ÷ days) + the whole months after the last month with actual, up to
     End campaign — and inside o.from … o.to when a period is given · Forecast = Actual to date + pace × months left ·
     Required run-rate = (Full target − Actual to date) ÷ months left · no actual → null ('no_actual') · no complete month yet → null ('no_pace').
     o = { from, to (the period, optional), today, channel, unit 'amount' | 'qty' } · Full target / to date = inside the period. */
  function forecast(seed, cid, o = {}) {
    const M = model(seed), c = M.byId.get(cid), today = o.today || todayISO(), cur = ym(today), unit = o.unit === 'qty' ? 'qty' : 'amount', ch = CHANNELS.includes(o.channel) ? o.channel : null;
    const fromM = o.from ? ym(o.from) : null, toM = o.to ? ym(o.to) : null, inP = m => (!fromM || m >= fromM) && (!toM || m <= toM);
    const A = salesMonths(M, cid), inA = new Set(A), AP = A.filter(inP), perM = new Map();
    let full = null, tgtTD = null, actTD = null;
    (M.salesRows.get(cid) || []).forEach(r => {
      if (ch && r.channel !== ch) return; const v = r[unit]; if (v == null) return;
      if (r.scenario === 'target') { if (inP(r.month)) { full = add(full, v); if (inA.has(r.month)) tgtTD = add(tgtTD, v * toDateShare(r.month, today)); } }
      else { perM.set(r.month, (perM.get(r.month) || 0) + v); if (inP(r.month)) actTD = add(actTD, v); }
    });
    const has = AP.length > 0, complete = A.filter(m => m < cur), last = A.length ? A[A.length - 1] : null;
    const pace = complete.length ? complete.reduce((s, m) => s + (perM.get(m) || 0), 0) / complete.length : null;
    const endM = [ym(c.end), toM].filter(Boolean).sort()[0];
    let left = null;
    if (has) {
      left = last === cur && inP(cur) && cur <= endM ? 1 - toDateShare(cur, today) : 0;
      for (let m = addMonths(last, 1); m <= endM; m = addMonths(m, 1)) if (inP(m)) left++;
    }
    const aTD = has ? actTD || 0 : null, tTD = has ? tgtTD || 0 : null, fc = has && pace != null ? aTD + pace * left : null;
    const remaining = full == null ? null : full - (aTD || 0), required = !has || !(left > 1e-9) || remaining == null ? null : Math.max(0, remaining) / left;
    return { campaign: c, unit, channel: ch, months: AP, last, full, tgtTD: tTD, actTD: aTD, ach: has && tTD > 0 ? aTD / tTD : null, pace, monthsLeft: left, forecast: fc,
      pct: ratio(fc, full), remaining, required, why: !has ? 'no_actual' : pace == null ? 'no_pace' : null };
  }
  /* By campaign › Required run-rate (the Campaign's own months, D19) — the same rule as forecast() */
  function runRate(seed, cid, o = {}) {
    const f = forecast(seed, cid, { today: o.today, channel: o.channel, unit: o.unit }), att = attainment(seed, cid, o);
    return { months: att.months, last: f.last, monthsLeft: f.monthsLeft, remaining: f.remaining, required: f.required, pace: f.pace, forecast: f.forecast, why: f.why, fc: f,
      need: f.required && f.pace ? f.required / f.pace : null, paceRatio: f.required > 0 && f.pace != null ? f.pace / f.required : f.required === 0 ? 1 : null, att };
  }
  /* the P&L waterfall (D18): Net revenue (+) → COGS (−) → Gross profit (subtotal) → Marketing (−, or its lines) → Sales exp (−, or its lines) →
     Campaign profit (total) · the same R.statement() as the statement card · side 'plan' | 'actual' · o.lines = lines (top 8 a group + Other (n)) */
  function waterfall(seed, o, ids, side, basis, lines) {
    const s = statement(seed, o, ids, basis), get = k => s.rows.find(r => r.key === k)[side === 'plan' ? 'plan' : 'actual'];
    const rev = get('revenue'), cogs = get('cogs'), gp = get('gp'), mkt = get('mkt'), sls = get('sls'), oth = get('oth'), profit = get('profit');
    if (rev == null) return { ok: false, reason: 'no_revenue', statement: s };
    if (gp == null || cogs == null) {
      /* which Campaigns hold the revenue rows with no quantity / no COGS (D2) — the screen names them */
      const i = side === 'plan' ? 0 : 1, M = s.scope.M, bad = s.ids.filter(id => pnl(M, [id], s.scope.months).cogsBad[i]).map(id => M.byId.get(id).name);
      return { ok: false, reason: 'no_cogs', bad, statement: s };
    }
    const steps = []; let run = 0;
    const push = (key, group, label, v, kind) => { const from = kind === 'sub' || kind === 'total' ? 0 : run, to = kind === 'sub' || kind === 'total' ? v : run + v;
      steps.push({ key, group, label, value: v, kind: kind || (v >= 0 ? 'up' : 'down'), from, to, pctRev: rev ? v / rev : null }); run = to; };
    const groupLines = (g, total, list) => {
      if (!lines) { if (total != null) push(g, g, g, -total); return; }
      const shown = list.map(l => ({ line: l.line, v: side === 'plan' ? l.plan : l.actual })).filter(l => l.v != null && Math.abs(l.v) > 0.004).sort((a, b) => b.v - a.v);
      const head = shown.slice(0, 8), rest = shown.slice(8);
      head.forEach(l => push(`${g}:${l.line}`, g, l.line, -l.v));
      if (rest.length) push(`${g}:other`, g, C.common.other + ` (${rest.length})`, -rest.reduce((t, l) => t + l.v, 0));
    };
    push('revenue', 'rev', 'revenue', rev, 'up'); push('cogs', 'rev', 'cogs', -cogs); push('gp', 'rev', 'gp', gp, 'sub');
    groupLines('mkt', mkt, s.lines.mkt); groupLines('sls', sls, s.lines.sls); groupLines('oth', oth, s.lines.oth);
    push('profit', 'sls', 'profit', profit, 'total');
    const ei = side === 'plan' ? 0 : 1, est = ei === 0 ? s.est.plan : s.est.actual;
    return { ok: true, steps, rev, profit, gp, statement: s, est, estAmt: est ? (ei === 0 ? s.est.planAmt : s.est.actualAmt) : 0, estWho: s.est.who[ei] };
  }

  /* ===================== CR-04 §8 — the new tabs (pure) ===================== */
  const up = (a, b) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : a - b);
  /* the Time column: elapsed share · n days left · Ended dd/mm · Starts in n days · Cancelled */
  function timeOf(c, today) {
    const tp = timeProgress(c, today), d = daysLeft(c, today);
    return { pct: tp.pct, kind: statusOf(c, today) === CANCELLED ? 'cancelled' : d.kind, n: d.n, soon: d.kind === 'left' && d.n <= ENDING_SOON, end: c.end, start: c.start };
  }
  /* Needs attention (§9 · D39): the On going Campaigns of the scope with a problem → [{ id, c, severity 'err' | 'warn', issues [{ key, sev, v, n }], gap }]
     Behind (Ach < 90%) · Over budget (Used > 100%) · Ending soon (≤ 30 days and Forecast < 100%) — err · At risk (90–99.9%) · Forecast short
     (Forecast < 90% of Full target, not said again when Behind / Ending soon already says it) · No sales yet (started ≥ 14 days, no actual) — warn ·
     severity first, then the Gap (furthest behind first) */
  const ATT_ISSUES = ['behind', 'over', 'soon', 'risk', 'short', 'nosales'];
  function attention(seed, o) {
    const S = scope(seed, o), M = S.M, out = [], anySales = S.ids.some(id => hasSalesActual(M, id, S.months));
    S.ids.forEach(id => {
      const c = M.byId.get(id); if (c.pending || statusOf(c, S.today) !== 'ongoing') return;
      const p = pnl(M, [id], S.months, { today: S.today }), d = daysLeft(c, S.today), fc = forecast(seed, id, { from: S.from, to: S.to, today: S.today }), is = [];
      if (p.ach != null && p.ach < AT_RISK) is.push({ key: 'behind', sev: 'err', v: p.ach });
      if (p.used != null && p.used > 1) is.push({ key: 'over', sev: 'err', v: p.used });
      if (d.kind === 'left' && d.n <= ENDING_SOON && fc.pct != null && fc.pct < 1) is.push({ key: 'soon', sev: 'err', n: d.n, v: fc.pct });
      if (p.ach != null && p.ach >= AT_RISK && p.ach < 1) is.push({ key: 'risk', sev: 'warn', v: p.ach });
      if (fc.pct != null && fc.pct < AT_RISK && !is.some(x => x.key === 'behind' || x.key === 'soon')) is.push({ key: 'short', sev: 'warn', v: fc.pct });
      /* No sales yet only when other Campaigns have theirs (P7 — with none at all the band on top says it once) */
      if (anySales && p.actual.rev == null && dayDiff(S.today, c.start) >= 14) is.push({ key: 'nosales', sev: 'warn', n: dayDiff(S.today, c.start) });
      if (!is.length) return;
      out.push({ id, c, severity: is.some(x => x.sev === 'err') ? 'err' : 'warn', issues: is, ach: p.ach, used: p.used, forecast: fc, pnl: p,
        gap: p.actual.rev == null ? null : p.actual.rev - (p.lfl.rev || 0) });
    });
    return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'err' ? -1 : 1) || up(a.gap, b.gap) || M.order.get(a.id) - M.order.get(b.id));
  }
  /* the Forecast (Est.) a row adds to a total: On going = its forecast (no complete month yet = actual to date + the rest at target) ·
     Complete / Cancelled = its actual (final) · Not started / no actual = not counted → { v, kind 'est' | 'atTarget' | 'final' | null } */
  function forecastPart(status, fc) {
    if (status === 'complete' || status === CANCELLED) return fc.actTD == null ? { v: null, kind: null } : { v: fc.actTD, kind: 'final' };
    if (status !== 'ongoing' || fc.actTD == null) return { v: null, kind: null };
    if (fc.forecast != null) return { v: fc.forecast, kind: 'est' };
    return { v: fc.actTD + Math.max(0, (fc.full || 0) - (fc.tgtTD || 0)), kind: 'atTarget' };
  }
  /* Sales › Campaign attainment (§10.2): a row a Campaign (+ its channels) · Target to date · Actual · Ach % · Gap · Full target · Forecast (Est.) ·
     Attainment (D14) — the sums of R.pnl over the period (the same as the KPI) · the total row = Overview / Sales KPI */
  const SALES_SORTS = ['attention', 'ach', 'gap', 'target', 'name'];
  function salesTable(seed, o, sort) {
    const S = scope(seed, o), M = S.M, att = attention(seed, o), rank = new Map(att.map((x, i) => [x.id, i]));
    const anySales = S.ids.some(id => hasSalesActual(M, id, S.months));
    const node = p => ({ tgtTD: p.actual.rev == null ? null : p.lfl.rev, actual: p.actual.rev, ach: p.ach, gap: p.actual.rev == null ? null : p.actual.rev - (p.lfl.rev || 0),
      full: p.plan.rev, status: attStatus(p.ach), qty: p.actual.qty, qtyTD: p.actual.rev == null ? null : p.lfl.qty });
    const per = { from: S.from, to: S.to, today: S.today };
    const rows = S.ids.map(id => {
      const c = M.byId.get(id), st = statusOf(c, S.today), p = pnl(M, [id], S.months, { today: S.today }), fc = forecast(seed, id, per);
      return { c, status: st, time: timeOf(c, S.today), node: node(p), forecast: fc, part: forecastPart(st, fc), attention: rank.has(id) ? att[rank.get(id)] : null,
        chips: { pending: !!c.pending, cancelled: st === CANCELLED, noActual: anySales && !c.pending && st !== 'not_started' && p.actual.rev == null },
        ch: CHANNELS.map(k => { const q = pnl(M, [id], S.months, { channel: k, today: S.today }), f = forecast(seed, id, Object.assign({ channel: k }, per));
          return { channel: k, node: node(q), forecast: f, part: forecastPart(st, f) }; }).filter(x => x.node.full != null || x.node.actual != null) };
    });
    const key = SALES_SORTS.includes(sort) ? sort : 'attention', tie = (a, b) => M.order.get(a.c.id) - M.order.get(b.c.id);
    const cmp = { attention: (a, b) => up(rank.has(a.c.id) ? rank.get(a.c.id) : null, rank.has(b.c.id) ? rank.get(b.c.id) : null) || ST_ORDER[a.status] - ST_ORDER[b.status] || up(a.node.ach, b.node.ach) || tie(a, b),
      ach: (a, b) => up(a.node.ach, b.node.ach) || tie(a, b), gap: (a, b) => up(a.node.gap, b.node.gap) || tie(a, b),
      target: (a, b) => byNum(a.node.full, b.node.full) || tie(a, b), name: (a, b) => a.c.name.localeCompare(b.c.name, 'en') || tie(a, b) }[key];
    rows.sort(cmp);
    const tp = pnl(M, S.ids, S.months, { today: S.today }), parts = rows.map(r => r.part).filter(x => x.v != null);
    const fcFull = rows.filter(r => r.part.v != null).reduce((s, r) => add(s, r.node.full), null);
    const total = Object.assign(node(tp), { forecast: parts.length ? parts.reduce((s, x) => s + x.v, 0) : null, forecastFull: fcFull,
      atTarget: rows.filter(r => r.part.kind === 'atTarget').map(r => r.c.name), notCounted: rows.filter(r => r.part.v == null && r.status !== CANCELLED).map(r => r.c.name) });
    const by = { on_target: 0, at_risk: 0, behind: 0 }; rows.forEach(r => { if (r.node.status && by[r.node.status] != null) by[r.node.status]++; });
    return { scope: S, rows, total, anySales, attention: att, by, withAch: rows.filter(r => r.node.ach != null).length };
  }
  /* Spend & Profit › Spend & profit by campaign (§10.3): Spend · Budget to date · Used % · Full budget · A&P % · GP · Campaign profit · Margin % · ROI */
  function spendTable(seed, o) {
    const S = scope(seed, o), M = S.M;
    const rows = S.ids.map(id => { const c = M.byId.get(id); return { c, status: statusOf(c, S.today), pnl: pnl(M, [id], S.months, { today: S.today }) }; })
      .sort((a, b) => byNum(a.pnl.actual.spend, b.pnl.actual.spend) || byNum(a.pnl.plan.spend, b.pnl.plan.spend) || M.order.get(a.c.id) - M.order.get(b.c.id));
    return { scope: S, rows, total: pnl(M, S.ids, S.months, { today: S.today }) };
  }
  /* Budget left (§10.3): Full budget of the period − Spend actual · the share used */
  function budgetLeft(seed, o) {
    const S = scope(seed, o), p = pnl(S.M, S.ids, S.months, { today: S.today }), full = p.plan.spend, a = p.actual.spend;
    return { full, actual: a, left: full == null ? null : full - (a || 0), pct: ratio(a, full) };
  }
  /* Sales › SKU watchlist (§10.2 Row 4): every SKU of the Campaigns in scope, inside the period · 'behind' = Behind first, then the Gap ·
     'best' = the highest Ach % · top n */
  function skuWatch(seed, o, mode, top = 10) {
    const S = scope(seed, o), M = S.M, inP = new Set(S.months), out = [];
    S.ids.forEach(id => {
      const A = new Set(salesMonths(M, id).filter(m => inP.has(m))); if (!A.size) return;
      const acc = new Map(), prods = M.prod.get(id) || new Map();
      (M.salesRows.get(id) || []).forEach(r => { if (!inP.has(r.month) || r.amount == null) return;
        let a = acc.get(r.product_key); if (!a) acc.set(r.product_key, a = { t: 0, tTD: 0, aTD: 0 });
        if (r.scenario === 'target') { a.t += r.amount; if (A.has(r.month)) a.tTD += r.amount * toDateShare(r.month, S.today); } else if (A.has(r.month)) a.aTD += r.amount; });
      acc.forEach((a, key) => { if (!(a.tTD > 0)) return; const ach = a.aTD / a.tTD;
        out.push({ c: M.byId.get(id), key, product: prods.get(key) || { key, name: key.replace(/^name:/, ''), code: null }, full: a.t, tgtTD: a.tTD, actual: a.aTD, ach, gap: a.aTD - a.tTD, status: attStatus(ach) }); });
    });
    const RK = { behind: 0, at_risk: 1, on_target: 2 }, by = { behind: 0, at_risk: 0, on_target: 0 };
    out.forEach(x => by[x.status]++);
    const list = out.slice().sort(mode === 'best' ? (a, b) => b.ach - a.ach || a.c.name.localeCompare(b.c.name) : (a, b) => RK[a.status] - RK[b.status] || a.gap - b.gap);
    return { scope: S, mode: mode === 'best' ? 'best' : 'behind', rows: list.slice(0, top), n: out.length, by, all: out };
  }
  /* Sales › By channel (§10.2 Row 4): each channel and its sub-channels · Target (full, the period) · Target to date (the months the channel has
     actual, the month in progress its share) · Actual — Σ sub-channels = the channel = R.pnl of that channel */
  function channelSubs(seed, o) {
    const S = scope(seed, o), M = S.M, map = new Map(CHANNELS.map(k => [k, { channel: k, plan: null, lfl: null, actual: null, subs: new Map() }]));
    S.ids.forEach(id => S.months.forEach(m => { const c = cellsOf(M, id).get(m); if (!c) return; const f = toDateShare(m, S.today);
      c.sub.forEach(v => { const ch = map.get(v.channel); if (!ch) return; const has = !!c.ch[v.channel] && c.ch[v.channel].rev[1] != null;
        let s = ch.subs.get(v.sub); if (!s) ch.subs.set(v.sub, s = { sub: v.sub, plan: null, lfl: null, actual: null });
        [s, ch].forEach(x => { x.plan = add(x.plan, v.rev[0]); x.actual = add(x.actual, v.rev[1]); if (has) x.lfl = add(x.lfl, mul(v.rev[0], f) || 0); }); }); }));
    const fin = x => Object.assign(x, { ach: x.actual == null ? null : ratio(x.actual, x.lfl), gap: x.actual == null ? null : x.actual - (x.lfl || 0), status: x.actual == null ? null : attStatus(ratio(x.actual, x.lfl)) });
    const rows = [...map.values()].filter(x => x.plan != null || x.actual != null).map(x => Object.assign(fin(x), { subs: [...x.subs.values()].map(fin).sort((a, b) => byNum(a.actual, b.actual) || byNum(a.plan, b.plan) || a.sub.localeCompare(b.sub)) }));
    const tot = k => rows.reduce((s, r) => add(s, r[k]), null);
    return { scope: S, rows, total: fin({ plan: tot('plan'), lfl: tot('lfl'), actual: tot('actual') }), anyActual: rows.some(r => r.actual != null) };
  }

  return { timeGone, paceOf, paceText, salesStatus, campaignPace, yearGone, PACE_OK, PACE_RISK,
    TZ, isISODate, todayISO, addDays, dayDiff, dmy, dm, ym, monthFirst, monthLast, addMonths, monthsIn, monthShort, monthName, monthLong, monthCount, PRESETS, presetRange, validateMonthRange,
    isNum, fmtNum, baht, compact, signed, shortBaht, signedShort, pct, pctA, times, niceStep, ratio,
    foldText, msFilter, msToggle, msSelectAll, msLocked,
    STATUSES, CANCELLED, CHANNELS, SORTS, model, statusOf, daysLeft, scope, statusCounts, sumCells, pnlOf, pnl, actualTo, hasSalesActual, hasBudget,
    kpis, mktEfficiency, per100, campaignRank, skuTrend, profitByMonth, paceNode, salesMix, skuMatrix, afterMarketingDrop, spendPace, byMonth, portfolio, sortRows, timeline, summaryOf, byChannel, byLine, bySubChannel, statement, tone,
    AT_RISK, ATT, ATT_SORTS, ENDING_SOON, attStatus, salesMonths, campaignMonths, attainment, sortAtt, timeProgress, targetByMonth, runRate, waterfall,
    toDateShare, forecast, timeOf, attention, ATT_ISSUES, forecastPart, SALES_SORTS, salesTable, spendTable, budgetLeft, skuWatch, channelSubs,
  };
})();
