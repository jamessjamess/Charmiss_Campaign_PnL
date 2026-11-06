/* screen-operations.js — Dashboard › Operations (CR-06 §6 · D57): what needs action now — approvals, budget, and campaigns about to start or end. → CP.tabs.operations
   #dashboard/operations · the shared toolbar (period · Status · Export) · source line ·
   Row 1 KPI: Needs attention (Campaigns · urgent / to watch) · Pending approvals (plans + requests · the oldest) · Budget requests (pending · Σ) ·
   Unpaid expenses (Committed, not Paid · how many · the oldest) — a card opens its card / page ·
   Row 2 Needs attention — moved from Overview whole (R.attention3 — Sales · Budget · Approval, the Data group of the P&L files gone) · 3 columns ≥ 1200px ·
   Row 3 Approval queue (2/3: every plan and request waiting, whatever the period — a row opens its review in Campaigns › Approvals) | Upcoming 30 days (1/3:
   Starting — not approved yet within 14 days in red · Ending — Ach % · Used %). Export = 4 sheets (KPI · Needs attention · Approval queue · Upcoming). */
CP.tabs = CP.tabs || {};
CP.tabs.operations = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, ICON, labelInfo } = U;
  const D = C.dash, O = C.ops, A = D.att, AP = C.appr, TAB = 'operations';
  const rng = () => P.rng();
  const td = () => U.today();
  const ctx = () => Object.assign(rng(), { seed: U.seed(), expenses: CP.store.data().expenses });
  const MAX = 6;

  let el = null;
  function render(root) { el = root; if (!el.dataset.built) build(); renderAll(); return TAB; }
  function build() {
    el.innerHTML = `<div class="toolbar" id="op_tools"></div><div class="srcline" id="op_src"></div><div class="kpis" id="op_kpis"></div>
      <div class="card" id="op_att"></div><div class="r3b opr3"><div class="card" id="op_q"></div><div class="card" id="op_up"></div></div>`;
    el.addEventListener('click', onClick);
    el.addEventListener('change', e => P.onRange(e, renderAll));
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const k = e.target.closest('[data-opgo]'); if (k && e.target === k) { e.preventDefault(); go(k.dataset.opgo); return; }
      const tr = e.target.closest('tr[data-opq], tr[data-open]'); if (tr && e.target === tr) { e.preventDefault(); tr.click(); }
    });
    el.dataset.built = '1';
  }
  function renderAll() {
    $('op_tools').innerHTML = P.periodHTML('op', renderAll) + `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button>`;
    $('op_src').innerHTML = P.sourceHTML();
    const k = R.opsKpi(U.seed(), rng(), CP.store.data().expenses);
    renderKpis(k); renderAtt(k.attention.groups); renderQueue(); renderUp();
  }

  /* ---------- Row 1 — KPI (a card opens its card or page) ---------- */
  function renderKpis(k) {
    const kc = U.kpiCard, K = O.k, link = (go, html) => html.replace('<div class="kpi', `<div role="link" tabindex="0" data-opgo="${go}" title="${esc(K.go[go])}" class="kclick kpi`);
    const a = k.attention, p = k.pending, q = k.requests, u = k.unpaid, bs = U.barSeg;
    $('op_kpis').innerHTML =
      link('att', kc({ label: labelInfo(K.att, K.attTip), value: String(a.n), suffix: K.campaigns(a.n), bar: a.n ? bs(a.urgent / a.n * 100, 'neg') + bs(a.watch / a.n * 100, 'warnb') : '',
        barTip: K.attCap(a.urgent, a.watch), cap: a.n ? `<b class="${a.urgent ? 'bad' : ''}">${esc(K.urgent(a.urgent))}</b> · ${esc(K.watch(a.watch))}` : esc(A.noneGroup) })) +
      link('queue', kc({ label: labelInfo(K.pending, K.pendingTip), value: String(p.n), suffix: p.n ? K.pendingSplit(p.plans, p.requests) : '', cap: esc(p.n ? K.oldest(p.oldest) : K.noneWaiting) })) +
      link('requests', kc({ label: labelInfo(K.requests, K.requestsTip), value: String(q.n), cap: esc(q.n ? K.reqCap(R.signedShort(q.total)) : K.noneWaiting), capTip: q.n ? K.reqTip(R.baht(q.up), R.baht(q.total)) : '' })) +
      link('unpaid', kc({ label: labelInfo(K.unpaid, K.unpaidTip), value: R.baht(u.total), cap: esc(u.n ? K.unpaidCap(u.n, u.oldest) : K.noneUnpaid) }));
  }
  function go(where) {
    if (where === 'att') { $('op_att').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (where === 'queue') { $('op_q').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (where === 'requests') { U.pref.setJson('camps_appr', Object.assign(U.pref.json('camps_appr', {}) || {}, { seg: 'pending', type: 'request' })); location.hash = '#campaigns/approvals'; return; }
    if (where === 'unpaid') { CP.expenses.showStatus(['committed']); location.hash = '#expenses'; }
  }

  /* ---------- Row 2 — Needs attention (3 groups · CR-05 §9.3 · ≥ 1200px side by side) ---------- */
  const issueText = i => { const T = A.issues; return i.key === 'soon' ? T.soon(i.n) : i.key === 'nosales' ? T.nosales(i.n) : T[i.key](R.pct(i.v)); };
  const issue2 = i => { const T = A.issues2;
    return { overb: () => T.overb(R.shortBaht(i.v)), lineover: () => T.lineover(i.l), ahead: () => T.ahead(C.track.pts(i.v)), almost: () => T.almost(R.pct(i.v)), pendingPlan: () => T.pendingPlan(i.n),
      pendingReq: () => T.pendingReq(i.no, R.signedShort(i.v)), nosalesMonth: () => T.nosalesMonth(R.monthName(i.m)) }[i.key](); };
  const words = (i, g) => (g === 'sales' ? issueText(i) : issue2(i));
  function attRow(x, g) {
    const chips = x.issues.map(i => `<span class="chip ${i.sev === 'err' ? 'err' : 'warn'}" title="${esc((g === 'sales' ? A.issueTip : A.issueTip2)[i.key] || '')}">${esc(words(i, g))}</span>`).join('');
    const main = g === 'sales' ? `<span class="nav ${x.gap == null ? 'none' : R.tone(x.gap, 'up')}" title="${esc(x.gap == null ? '' : A.gapTip(R.baht(x.gap), R.baht(x.pnl.lfl.rev)))}">${esc(x.gap == null ? C.common.none : R.signedShort(x.gap))}</span>`
      : g === 'budget' ? `<span class="nav ${x.main < -0.5 ? 'bad' : 'none'}" title="${esc(C.track.tips.remaining.f)}">${esc(R.signedShort(x.main))}</span>`
      : `<span class="nav none">${x.main == null ? '' : esc(R.signedShort(x.main))}</span>`;
    return `<button type="button" class="nar ${x.severity}" data-open="${esc(x.id)}"${x.href ? ` data-href="${esc(x.href)}"` : ''} title="${esc(x.href === '#campaigns/approvals' ? C.track.toApprovals : A.open(x.c.name))}"><span class="dot" aria-hidden="true"></span>` +
      `<span class="nab"><b>${esc(x.c.name)}</b><span class="chips">${chips}</span></span>${main}<span class="nchev" aria-hidden="true">${ICON.chevron}</span></button>`;
  }
  function renderAtt(G) {
    const ns = !R.kpis(U.seed(), rng()).anySales;
    const group = (k, list) => `<div class="nag ${k}"><div class="nagh"><span>${esc(A.groups[k])}</span><span class="n">${list.length}</span></div>` +
      (list.length ? `<div class="nalist">${list.slice(0, MAX).map(x => attRow(x, k)).join('')}</div>${list.length > MAX ? `<div class="na-more muted small">${esc(k === 'sales' ? A.more(list.length - MAX) : `+${list.length - MAX}`)}</div>` : ''}`
        : `<div class="na-none small">${k === 'sales' && ns ? esc(D.k.noSales) : `<span class="okm" aria-hidden="true">✓</span> ${esc(A.noneGroup)}`}</div>`) + '</div>';
    $('op_att').innerHTML = `<div class="card-head"><h3>${labelInfo(A.title, A.tip)}</h3><div class="ctl"><a class="link" href="#dashboard/sales">${esc(A.seeAll)}</a></div></div>` +
      `<div class="nagrid">${group('sales', G.sales)}${group('budget', G.budget)}${group('approval', G.approval)}</div>`;
  }

  /* ---------- Row 3 — Approval queue (every pending one — not the period) ---------- */
  function queueRows() {
    const s = U.seed(), t = td();
    return R.approvalItems(s, t).filter(x => x.status === 'pending' && x.latest && R.statusOf(x.c, t) !== R.CANCELLED).sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))).map(x => {
      if (x.kind === 'plan') { const T = R.planTotals(x.v); return { x, type: AP.kind.plan, amount: T.budget, impact: O.q.planImpact(R.shortBaht(T.target), R.pct(T.ap, 1)), impactTip: O.q.planImpactTip(R.baht(T.target), R.baht(T.budget), R.pct(T.ap, 1)) }; }
      const q = x.req, im = R.requestImpact(s, x.c.id, q.lines);
      return { x, type: `${AP.kind[q.type] || q.type} #${q.no}`, amount: R.sumLines(q.lines), impact: O.q.reqImpact(R.shortBaht(im.before), R.shortBaht(im.after), R.pct(im.ap[1], 1)), impactTip: q.reason };
    });
  }
  function renderQueue() {
    const Q = O.q, rows = queueRows(), age = n => (n == null ? '—' : AP.ago(n));
    const body = rows.map(r => { const x = r.x, key = `${x.kind}|${x.c.id}|${x.req ? x.req.no : ''}`;
      return `<tr class="click" tabindex="0" data-opq="${esc(key)}" title="${esc(Q.open(x.c.name))}"><td><span class="apt ${esc(x.kind === 'plan' ? 'plan' : x.req.type)}">${esc(r.type)}</span></td><td class="nm"><b>${esc(x.c.name)}</b></td>` +
        `<td><span class="owner">${U.avatar(x.by, true)}${esc(x.by || '—')}</span></td><td class="num"><b class="${r.amount < -0.5 ? 'neg' : ''}">${esc(x.kind === 'plan' ? R.baht(r.amount) : R.signedShort(r.amount))}</b></td>` +
        `<td class="small" title="${esc(r.impactTip || '')}">${esc(r.impact)}</td><td class="${x.age >= 3 ? 'warnx' : 'muted'} nowrap">${esc(age(x.age))}</td></tr>`; }).join('');
    $('op_q').innerHTML = `<div class="card-head"><h3>${labelInfo(Q.title, Q.tip)}</h3><div class="ctl"><a class="link" href="#campaigns/approvals">${esc(Q.all)}</a></div></div>` +
      (rows.length ? `<div class="tablewrap" style="margin-top:8px"><table class="tbl port opq"><thead><tr><th>${esc(Q.cols.type)}</th><th>${esc(Q.cols.campaign)}</th><th>${esc(Q.cols.by)}</th><th class="num">${esc(Q.cols.amount)}</th><th>${esc(Q.cols.impact)}</th><th>${esc(Q.cols.age)}</th></tr></thead><tbody>${body}</tbody></table></div>`
        : `<div class="c3-empty"><span class="okm" aria-hidden="true">✓</span> ${esc(Q.none)}</div>`);
  }

  /* ---------- Row 3 — Upcoming 30 days ---------- */
  function upData() {
    const s = U.seed(), t = td(), u = R.upcoming(s, t, 30), ids = u.ending.map(x => x.c.id);
    let tr = new Map();
    if (ids.length) { const cs = u.ending.map(x => x.c), from = R.monthFirst(R.addMonths(R.ym(cs.reduce((m, c) => (c.start < m ? c.start : m), cs[0].start)), -1)), to = cs.reduce((m, c) => (c.end > m ? c.end : m), cs[0].end);
      tr = new Map(R.trackerRows(s, { from, to, statuses: R.STATUSES.concat([R.CANCELLED]), includeCancelled: true, only: ids, today: t }).map(r => [r.c.id, r])); }
    return { starting: u.starting, ending: u.ending.map(x => Object.assign({}, x, { ach: tr.get(x.c.id) ? tr.get(x.c.id).ach : null, att: tr.get(x.c.id) ? tr.get(x.c.id).att : null, used: tr.get(x.c.id) && tr.get(x.c.id).t ? tr.get(x.c.id).t.used : null })) };
  }
  function renderUp() {
    const W = O.up, d = upData();
    const start = d.starting.map(x => `<li><a class="upr" href="#campaigns/${esc(x.c.id)}"><span class="upn"><b>${esc(x.c.name)}</b><span class="muted small">${esc(W.starts(R.dmy(x.c.start), x.n))}</span></span>` +
      `${x.approved ? `<span class="chip ok">${esc(AP.state.approved)}</span>` : `<span class="chip ${x.late ? 'err' : 'warn'}" title="${esc(x.late ? W.lateTip : '')}">${esc(W.notYet)}</span>`}</a></li>`).join('');
    const end = d.ending.map(x => `<li><a class="upr" href="#dashboard/campaign/${esc(x.c.id)}"><span class="upn"><b>${esc(x.c.name)}</b><span class="muted small">${esc(W.ends(R.dmy(x.c.end), x.n))}</span></span>` +
      `<span class="upk"><span title="${esc(C.money.ach.h)}">${x.ach == null ? U.none() : `<b class="attx ${esc(x.att || 'ok')}">${esc(R.pctA(x.ach))}</b>`}</span><span class="muted small" title="${esc(C.track.tips.used.f)}">${esc(W.used(x.used == null ? '—' : R.pctA(x.used, true)))}</span></span></a></li>`).join('');
    $('op_up').innerHTML = `<div class="card-head"><h3>${labelInfo(W.title, W.tip)}</h3></div>` +
      `<div class="upg"><div class="uph">${esc(W.starting)} <span class="n">${d.starting.length}</span></div>${start ? `<ul class="upl">${start}</ul>` : `<div class="na-none small">${esc(W.noneStart)}</div>`}</div>` +
      `<div class="upg"><div class="uph">${esc(W.ending)} <span class="n">${d.ending.length}</span></div>${end ? `<ul class="upl">${end}</ul>` : `<div class="na-none small">${esc(W.noneEnd)}</div>`}</div>`;
  }

  /* ---------- Export: one sheet a card ---------- */
  const cell = (v, fmt, o) => Object.assign({ v, fmt }, o || {});
  X.register('o_kpi', x => { const k = R.opsKpi(x.seed, x, x.expenses), K = O.k;
    return { key: 'o_kpi', title: O.file.kpi, header: ['Metric', 'Value', 'Note'], cols: ['text', 'num', 'text'], rows: [
      [K.att, cell(k.attention.n, 'num'), K.attCap(k.attention.urgent, k.attention.watch)], [K.pending, cell(k.pending.n, 'num'), k.pending.n ? K.oldest(k.pending.oldest) : ''],
      [K.requests, cell(k.requests.n, 'num'), k.requests.n ? K.reqCap(R.signedShort(k.requests.total)) : ''], [K.unpaid, cell(k.unpaid.total, 'money'), k.unpaid.n ? K.unpaidCap(k.unpaid.n, k.unpaid.oldest) : '']] }; });
  X.register('o_att', x => { const G = R.attention3(x.seed, x), rows = [];
    ['sales', 'budget', 'approval'].forEach(g => G[g].forEach(a => rows.push([cell(a.c.name, 'text', { bold: true }), A.groups[g], a.severity === 'err' ? 'Red' : 'Orange', a.issues.map(i => words(i, g)).join(' · ')])));
    return { key: 'o_att', title: A.title, header: [O.cols.campaign, O.cols.group, O.cols.severity, O.cols.problems], cols: rows.length ? ['text', 'text', 'text', 'text'] : [], rows, notes: rows.length ? [] : [`✓ ${A.none}`] }; });
  X.register('o_queue', () => { const Q = O.q, rows = queueRows();
    return { key: 'o_queue', title: Q.title, header: [Q.cols.type, Q.cols.campaign, Q.cols.by, Q.cols.amount, Q.cols.impact, Q.cols.age], cols: rows.length ? ['text', 'text', 'text', 'money', 'text', 'text'] : [],
      rows: rows.map(r => [r.type, cell(r.x.c.name, 'text', { bold: true }), r.x.by || '', r.amount, r.impact, r.x.age == null ? '' : AP.ago(r.x.age)]), notes: rows.length ? [] : [Q.none] }; });
  X.register('o_upcoming', () => { const W = O.up, d = upData(), rows = [];
    d.starting.forEach(x => rows.push([W.starting, cell(x.c.name, 'text', { bold: true }), R.dmy(x.c.start), x.approved ? AP.state.approved : W.notYet, null, null]));
    d.ending.forEach(x => rows.push([W.ending, cell(x.c.name, 'text', { bold: true }), R.dmy(x.c.end), AP.state.approved, x.ach, x.used]));
    return { key: 'o_upcoming', title: W.title, header: [O.cols.when, O.cols.campaign, O.cols.date, O.cols.approval, C.money.ach.h, C.track.cols.used], cols: rows.length ? ['text', 'text', 'text', 'text', 'pct', 'pct'] : [], rows, notes: rows.length ? [] : [W.noneBoth] }; });

  /* ---------- events ---------- */
  const meta = () => P.metaRows([[D.meta.tab, `${D.title} › ${D.tabs.operations}`], [D.meta.scope, P.periodWords()], [D.meta.status, P.statusWords()]]);
  function onClick(e) {
    const t = e.target;
    if (P.onPreset(e, 'op', renderAll)) return;
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.operations, P.scopeText(), X.tabTables('operations', ctx()), meta()); return; }
    const k = t.closest('[data-opgo]'); if (k) { go(k.dataset.opgo); return; }
    const na = t.closest('.nar[data-open]'); if (na) { if (na.dataset.href) location.hash = na.dataset.href; else CP.screens.dashboard.openCampaign(na.dataset.open); return; }
    const q = t.closest('tr[data-opq]'); if (q) { const [kind, id, no] = q.dataset.opq.split('|'); location.hash = '#campaigns/approvals'; setTimeout(() => CP.review.open({ kind, id, no: no ? +no : null }), 0); }
  }
  return { render };
})();
