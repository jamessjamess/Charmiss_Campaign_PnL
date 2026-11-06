/* screen-planning.js — WORK › Campaign Planning (CR-07 §6 · D61 — was Campaigns, screen-campaigns.js): make a plan in 6 steps with many teams, get it approved.
   #planning (the tab seen last) · #planning/plans · #planning/tasks · #planning/approvals · #planning/timeline (screen-timeline.js) · #planning/new opens the form ·
   #planning/<id>[/<step>] = the plan (screen-plan.js — CP.cpage) · an approved plan opens Campaign Monitor (View plan still opens the plan).
   Plans: Name · Owner · Period · Progress (6 dots ✓ ● ○ ↩) · Waiting on (department · who · Due) · Approval · Target · Budget · ⋯ · All · Draft · In review · Returned ·
   Approved · Rejected (+ Include cancelled) · 50 rows a page (R7) · My tasks: the steps of the one acting · Approvals: plans for an Executive + budget requests (the KOL cards).
   The New / Edit drawer (480px) checks with R.validateCampaign · New campaign (Brand · Admin) = a Draft plan with its 6 steps → step 1. */
CP.screens = CP.screens || {};
CP.screens.planning = (function () {
  'use strict';
  const U = CP.ui, S = CP.store, X = CP.export;
  const { C, R, $, esc, pref, ICON, labelInfo, none, statusChip } = U;
  const K = C.camps, D = C.dash, AP = C.appr;
  const st = Object.assign({ year: 'all', includeCancelled: false, sort: 'start', tsort: 'start', tab: 'progress', view: 'plans', page: 1 }, pref.json('plng', {}) || {});
  /* CR-09 §5.2 (D86) — the status tabs: In progress (first) · Approved · Rejected · All (+ Cancelled) · an old remembered tab → In progress */
  if (!['progress', 'approved', 'rejected', 'all', 'cancelled'].includes(st.tab)) st.tab = 'progress';
  st.q = '';   // the search is for this visit only
  if (!R.LIST_SORTS.includes(st.sort)) st.sort = 'start';
  if (!['start', 'status', 'name'].includes(st.tsort)) st.tsort = 'start';
  const VIEWS = ['plans', 'tasks', 'approvals', 'timeline'], PAGE = 50;
  const save = () => pref.setJson('plng', { year: st.year, includeCancelled: st.includeCancelled, sort: st.sort, tsort: st.tsort, tab: st.tab, view: st.view });
  const td = () => U.today();
  const me = () => CP.actor.get();
  const listRows = () => S.data().list.rows;
  const ro = () => (R.canDo('create', me()).ok ? '' : ` disabled aria-disabled="true"`);
  const fold = t => String(t || '').toLocaleLowerCase('th').replace(/\s+/g, ' ').trim();

  let sec = null, view = 'plans', stickP = { toTop() {} };
  function render(sub) {
    sec = $('tab-planning');
    if (!sec.dataset.built) build();
    const parts = String(sub || '').split('/');
    /* #planning/<id>[/<step>] — the plan (screen-plan.js) */
    if (parts[0] === 'table') parts[0] = 'plans';
    if (parts[0] && parts[0] !== 'new' && !VIEWS.includes(parts[0])) { view = 'page'; $('k_listv').classList.add('hidden'); $('k_pagev').classList.remove('hidden'); CP.cpage.render($('k_pagev'), decodeURIComponent(parts[0]), parts[1] || null); return; }
    /* the tab seen last (as the Dashboard) — #planning alone opens it */
    view = VIEWS.includes(parts[0]) ? parts[0] : VIEWS.includes(st.view) ? st.view : 'plans';
    if (st.view !== view) { st.view = view; save(); }
    const want = `#planning/${view}`;
    if (sub !== 'new' && location.hash !== want) history.replaceState(null, '', want);
    $('k_pagev').classList.add('hidden'); $('k_pagev').innerHTML = ''; $('k_listv').classList.remove('hidden');
    renderAll();
    if (sub === 'new') { history.replaceState(null, '', '#planning/plans'); if (R.canDo('create', me()).ok) openForm(null); }
  }
  function build() {
    sec.innerHTML = `<div id="k_listv"><div class="pbanner"><h1>${esc(PL.title)}</h1></div>
      <div class="vtabs" role="tablist" id="k_vtabs"></div><div id="k_tablev">
      <div class="toolbar ctools" id="k_tools"></div><div class="kpis hidden" id="k_kpis"></div>
      <div class="sttabs ktabs" role="tablist" id="k_tabs"></div><div class="card ktable" id="k_table"></div><div class="card ktl hidden" id="k_tl"></div></div><div id="k_taskv" class="hidden"></div><div id="k_apprv" class="hidden"></div></div><div id="k_pagev" class="hidden"></div>`;
    /* CR-10 D98 — Plans · My tasks · Approvals · Timeline stay under the top bar */
    stickP = U.stickyTabs(sec, $('k_vtabs'));
    $('k_vtabs').addEventListener('click', () => stickP.toTop());
    sec.addEventListener('click', onClick);
    sec.addEventListener('change', onChange);
    sec.addEventListener('input', e => { if (e.target.matches('[data-kq]')) { st.q = e.target.value; renderTabs(); renderRows(); } });
    sec.addEventListener('keydown', e => { const tr = e.target.closest('tr[data-open]'); if (tr && e.target === tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRow(tr.dataset.open); } });
    sec.dataset.built = '1';
  }
  function renderAll() {
    renderVTabs();
    $('k_tablev').classList.toggle('hidden', view === 'approvals' || view === 'tasks'); $('k_apprv').classList.toggle('hidden', view !== 'approvals'); $('k_taskv').classList.toggle('hidden', view !== 'tasks');
    if (view === 'approvals') { renderAppr(); return; }
    if (view === 'tasks') { renderTasks(); return; }
    $('k_table').classList.toggle('hidden', view !== 'plans'); $('k_tl').classList.toggle('hidden', view !== 'timeline');
    renderTools(); renderKpis(); renderTabs(); renderRows();
  }
  const renderRows = () => (view === 'timeline' ? renderTimeline() : renderTable());
  /* ---------- CR-09 §5.1 (D86) — the planning work in 4 KPI (Plans only): In progress · Steps overdue · In review · Next 12 months ---------- */
  function renderKpis() {
    const box = $('k_kpis'); box.classList.toggle('hidden', view !== 'plans'); if (view !== 'plans') return;
    const k = R.planningKpi(seedNow(), td()), Q = PL.kpi, kc = U.kpiCard, bs = U.barSeg, n = k.inProgress.n, by = k.inProgress.by;
    const open = campaigns().filter(c => ['draft', 'returned'].includes(c.approval) && R.statusOf(c, td()) !== R.CANCELLED).reduce((s, c) => { const p = (seedNow().plans || {})[c.id]; return s + (p && p.steps ? R.STEP_KEYS.filter(x => R.stepState(p, x, td()).status !== 'done').length : 0); }, 0);
    const ip = kc({ key: 'inprog', label: labelInfo(Q.inProg, Q.inProgTip), value: String(n), suffix: n === 1 ? Q.plans(1).replace(/^1 /, '') : Q.plans(n).replace(/^\d+ /, ''),
      bar: bs(by.draft / Math.max(1, n) * 100, 'time') + bs(by.returned / Math.max(1, n) * 100, 'warnb') + bs(by.submitted / Math.max(1, n) * 100, 'ongoing'),
      cap: esc(['draft', 'returned', 'submitted'].filter(x => by[x]).map(x => Q.by[x](by[x])).join(' · ') || Q.none) });
    const o0 = k.overdue[0];
    const od = kc({ key: 'overdue', label: labelInfo(Q.overdue, Q.overdueTip), value: String(k.overdue.length), neg: k.overdue.length > 0, bar: bs(k.overdue.length / Math.max(1, open) * 100, 'over'),
      cap: o0 ? `<b class="bad">${esc(Q.overCap(o0.s.assignee || '—', C.step.names[o0.s.key], o0.s.daysLate))}</b>` : `<span class="okx">✓ ${esc(Q.none)}</span>` });
    const r0 = k.review[0];
    /* the name of the oldest plan in review = the suffix (a long name may wrap there) · the caption stays one line */
    const rv = kc({ key: 'review', label: labelInfo(Q.review, Q.reviewTip), value: String(k.review.length), suffix: r0 ? r0.c.name : '', bar: bs(k.review.length / Math.max(1, n) * 100, 'ongoing'),
      cap: r0 ? esc(Q.reviewCap(r0.days)) : esc(Q.reviewNone) });
    const nx = k.next;
    /* the approved part = the suffix and the green of the bar · the caption: the budget and its A&P (one line) */
    const nt = kc({ key: 'next', label: labelInfo(Q.next, Q.nextTip), value: Q.nextV(R.shortBaht(nx.target)), suffix: Q.approved(R.shortBaht(nx.approved)), bar: bs(nx.target ? nx.approved / nx.target * 100 : 0, 'ok'), barTip: `${R.shortBaht(nx.approved)} / ${R.shortBaht(nx.target)}`,
      cap: esc(Q.nextCap(R.shortBaht(nx.budget), R.pct(R.ratio(nx.budget, nx.target)))) });
    box.innerHTML = ip + od + rv + nt;
  }
  /* ---------- Plans · My tasks (n) · Approvals (n) · Timeline — Approvals: an Executive what waits for a decision · the rest: My requests (n = returned to them) ---------- */
  const PL = C.plng;
  /* an approved plan opens Campaign Monitor · the others their plan (CR-07 §6) */
  const openRow = id => { const c = campaigns().find(x => x.id === id); location.hash = c && c.approval === 'approved' ? `#monitor/${id}` : `#planning/${id}`; };
  const taskRows = () => { const a = me(), plans = seedNow().plans || {}, out = [];
    campaigns().forEach(c => { const p = plans[c.id]; if (!p || !p.steps || (p.approval !== 'draft' && p.approval !== 'returned') || R.statusOf(c, td()) === R.CANCELLED) return;
      R.STEP_KEYS.forEach(k => { const s = R.stepState(p, k, td()); if (s.assignee === a.name && s.status !== 'done') out.push({ c, plan: p, s }); }); });
    return out.sort((x, y) => (x.s.open === y.s.open ? 0 : x.s.open ? -1 : 1) || String(x.s.due || '9').localeCompare(String(y.s.due || '9'))); };
  const apItems = () => R.approvalItems(seedNow(), td());
  const apCount = () => R.waitingFor(apItems(), me()).length;
  function renderVTabs() {
    const a = me(), n = apCount(), mgr = R.isMgr(a), lbl = mgr || a.role === 'viewer' || a.role === 'accounting' ? AP.tab : AP.tabStaff;
    const tab = (v, href, label) => `<a role="tab" href="${href}" class="${view === v ? 'on' : ''}" aria-selected="${view === v}">${label}</a>`, nt = taskRows().filter(x => x.s.open).length;
    $('k_vtabs').innerHTML = tab('plans', '#planning/plans', esc(PL.tabs.plans)) + tab('tasks', '#planning/tasks', `${esc(PL.tabs.tasks)}${nt ? ` <span class="nbadge">${nt}</span>` : ''}`) +
      tab('approvals', '#planning/approvals', `${esc(lbl)}${n ? ` <span class="nbadge" title="${esc(mgr ? AP.badgeTip(n) : AP.badgeTipStaff(n))}">${n}</span>` : ''}`) + tab('timeline', '#planning/timeline', esc(K.tl.tab));
  }
  const ap = Object.assign({ seg: 'pending', type: 'all' }, pref.json('camps_appr', {}) || {});
  function apLists() {
    const a = me(), mgr = R.isMgr(a) || a.role === 'viewer' || a.role === 'accounting', mine = x => x.by === a.name || (x.plan && x.plan.owner === a.name);
    const all = apItems().filter(x => (ap.type === 'all' || (ap.type === 'plan' ? x.kind === 'plan' : x.kind === 'request')) && (mgr || mine(x)) && R.statusOf(x.c, td()) !== R.CANCELLED);
    const at = x => String(x.at || ''), dec = x => String(x.decided_at || '');
    return { pending: all.filter(x => x.status === 'pending' && x.latest).sort((p, q) => at(p).localeCompare(at(q))),
      decided: all.filter(x => ['approved', 'returned', 'rejected'].includes(x.status) && x.decided_at).sort((p, q) => dec(q).localeCompare(dec(p))),
      drafts: all.filter(x => x.kind === 'plan' && x.status === 'draft' && x.latest) };
  }
  function renderAppr() {
    const L = apLists(), segs = ['pending', 'decided', 'drafts'], list = L[ap.seg] || [];
    $('k_apprv').innerHTML = `<div class="toolbar ctools">${U.segHTML('data-apseg', segs.map(k => ({ v: k, label: `${AP.segs[k]} ${L[k].length}` })), ap.seg, { label: AP.tab })}` +
      `<label class="ms"><select class="ms-trigger sel" data-aptype aria-label="${esc(AP.allTypes)}"><option value="all">${esc(AP.allTypes)}</option>${['plan', 'request'].map(k => `<option value="${k}"${ap.type === k ? ' selected' : ''}>${esc(AP.types[k])}</option>`).join('')}</select></label></div>` +
      (!list.length ? `<div class="card"><div class="c3-empty">${esc(AP.none[ap.seg])}</div></div>` : ap.seg === 'pending' ? `<div class="apcards">${list.map(apCard).join('')}</div>` : decTable(list));
  }
  /* CR-09 §5.4 (D87) — Decided · Drafts: a short table, one group a Campaign (the latest row on top · open it for the earlier ones) · newest first */
  const apOpen = new Set();
  function decTable(list) {
    const T = PL.dec, Kc = T.cols, d = s => (s ? R.dmy(String(s).slice(0, 10)) : '—'), groups = new Map();
    list.forEach(x => { if (!groups.has(x.c.id)) groups.set(x.c.id, []); groups.get(x.c.id).push(x); });
    const when = x => String(x.decided_at || x.at || ((x.plan.log || []).slice(-1)[0] || {}).at || '');
    const row = (x, sub, n, open) => { const kind = x.kind === 'plan' ? AP.kind.plan : AP.kind[x.req.type] || x.req.type, amt = x.kind === 'plan' ? R.planTotals(x.v).budget : R.sumLines(x.req.lines);
      return `<tr class="${sub ? 'sub' : 'grp'}"${sub ? ` data-decsub="${esc(x.c.id)}"` : ` data-decrow="${esc(x.c.id)}"`}><td class="nm">${sub ? '' : `<span class="bnm">${n > 1 ? `<button type="button" class="chev" data-decopen="${esc(x.c.id)}" aria-expanded="${open}" aria-label="${esc(open ? T.hide : T.earlier(n - 1))}">${ICON.chevronDown}</button>` : '<span class="chev ph"></span>'}<a href="#planning/${esc(x.c.id)}"><b>${esc(x.c.name)}</b></a>${n > 1 ? ` <span class="muted small">${esc(T.earlier(n - 1))}</span>` : ''}</span>`}</td>` +
        `<td>${esc(kind)}</td><td>${esc(x.kind === 'plan' ? `v${x.v.v}` : `#${x.req.no}`)}</td><td class="num"><b class="${amt < 0 ? 'neg' : ''}">${esc(x.kind === 'plan' ? R.shortBaht(amt) : R.signedShort(amt))}</b></td>` +
        `<td>${U.apChip(x.status)}</td><td>${esc(x.decided_by || x.by || '—')}</td><td class="nowrap">${esc(d(when(x)))}</td>` +
        `<td>${x.status === 'draft' ? `<a class="btn small ghost" href="#planning/${esc(x.c.id)}">${esc(AP.open)}</a>` : `<button type="button" class="btn small" data-aprev="${esc(x.kind)}|${esc(x.c.id)}|${x.req ? x.req.no : ''}">${esc(AP.review)}</button>`}</td></tr>`; };
    const body = [...groups.values()].map(g => g.sort((a, b) => when(b).localeCompare(when(a)))).sort((a, b) => when(b[0]).localeCompare(when(a[0])))
      .map(g => { const open = apOpen.has(g[0].c.id); return row(g[0], false, g.length, open) + (open ? g.slice(1).map(x => row(x, true, 0, false)).join('') : ''); }).join('');
    return `<div class="card"><div class="tablewrap"><table class="tbl port dectbl"><thead><tr><th>${esc(Kc.campaign)}</th><th>${esc(Kc.type)}</th><th>${esc(Kc.version)}</th><th class="num">${esc(Kc.amount)}</th><th>${esc(Kc.decision)}</th><th>${esc(Kc.by)}</th><th>${esc(Kc.date)}</th><th></th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  }
  function apCard(x) {
    const c = x.c, A = AP.card, a = me(), kind = x.kind === 'plan' ? AP.kind.plan : AP.kind[x.req.type] || x.req.type, d = s => (s ? R.dmy(String(s).slice(0, 10)) : '—');
    const sub = x.status === 'draft' ? AP.notSent(x.plan.owner || '—', d(((x.plan.log || []).slice(-1)[0] || {}).at)) : AP.sub(x.by || '—', d(x.at), AP.ago(R.dayDiff(td(), String(x.at || td()).slice(0, 10))), x.kind === 'plan' ? x.v.v : null);
    const kv = (k, v, cls) => `<div class="apkv${cls ? ' ' + cls : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`;
    let body = '';
    if (x.kind === 'plan') {
      const T = R.planTotals(x.v), prev = x.v.v > 1 ? x.plan.versions.find(v => v.v === x.v.v - 1) : null, Tp = prev ? R.planTotals(prev) : null;
      body = kv(A.period, `${R.dmy(c.start)} – ${R.dmy(c.end)}`) + kv(A.target, R.baht(T.target)) + kv(A.budget, R.baht(T.budget) + (Tp && Math.abs(T.budget - Tp.budget) > 0.5 ? ` (${R.signedShort(T.budget - Tp.budget)} ${A.vs(prev.v)})` : '')) +
        kv(A.ap, R.pct(T.ap, 1), T.ap > 0.2 ? 'warn' : '') + kv(A.profit, R.baht(T.profit), T.profit < 0 ? 'neg' : '');
    } else {
      const q = x.req, t = R.sumLines(q.lines), lw = l => `${l.line} ${R.monthShort(l.month)} ${R.signedShort(+l.amount)}`;
      /* P6 — no "…": the first 2 lines + "+2 more" (the whole list in its tooltip) */
      body = kv(A.amount, R.signedShort(t), t < 0 ? 'neg' : '') + kv(A.reason, q.reason) + `<div class="apkv aplines"><span>${esc(A.lines(q.lines.length))}</span><b>${q.lines.slice(0, 2).map(l => `<span class="apl">${esc(lw(l))}</span>`).join('')}` +
        (q.lines.length > 2 ? `<span class="chip more" title="${esc(q.lines.map(lw).join('\n'))}">${esc(AP.more(q.lines.length - 2))}</span>` : '') + `</b></div>`;
      if (x.status === 'pending') { const im = R.requestImpact(seedNow(), c.id, q.lines); body += kv(A.impact, `${R.shortBaht(im.before)} → ${R.shortBaht(im.after)} · A&P ${R.pct(im.ap[1], 1)}`); }
    }
    const decided = ['approved', 'returned', 'rejected'].includes(x.status) ? `<div class="apdec">${esc(AP.decided(AP.state[x.status], x.decided_by || '—', d(x.decided_at)))}${x.comment ? ` — <i>${esc(x.comment)}</i>` : ''}</div>` : '';
    const can = x.status === 'pending' && (x.kind === 'plan' ? R.canDo('approve', a, x.plan) : R.canDo('request.decide', a, x.plan, { req: x.req }));
    /* P7 — Review (the review drawer) · Open plan (the plan page) */
    const btns = (x.status === 'draft' ? '' : `<button type="button" class="btn small${can.ok ? ' primary' : ''}" data-aprev="${esc(x.kind)}|${esc(c.id)}|${x.req ? x.req.no : ''}"${!can.ok && can.why ? ` title="${esc(can.why)}"` : ''}>${esc(AP.review)}</button>`) +
      `<a class="btn small ghost" href="#planning/${esc(c.id)}/${x.kind === 'request' ? 'budget' : 'review'}">${esc(AP.open)}</a>`;
    return `<article class="apcard ${esc(x.status)}"><header><span class="apt ${esc(x.kind === 'plan' ? 'plan' : x.req.type)}">${esc(kind)}${x.req ? ` #${x.req.no}` : ''}</span>${U.apChip(x.status)}${x.status === 'pending' && x.age >= 3 ? `<span class="chip warn">${esc(AP.ago(x.age))}</span>` : ''}</header>` +
      `<h3><a href="#planning/${esc(c.id)}">${esc(c.name)}</a></h3><div class="apsub">${U.avatar(x.by || x.plan.owner, true)}<span>${esc(sub)}</span></div><div class="apbody">${body}</div>${decided}<footer>${btns}</footer></article>`;
  }

  /* ---------- the rows: the list over the made-up seed · Year · Search · Include cancelled · status tab ---------- */
  const seedNow = () => U.seed();
  const campaigns = () => seedNow().allCampaigns || seedNow().campaigns || [];
  /* CR-09 §5.2 — the status tabs of Plans: In progress (Draft · In review · Returned) · Approved · Rejected (+ Cancelled) */
  const tabOf = c => (R.statusOf(c, td()) === R.CANCELLED ? 'cancelled' : c.approval === 'approved' ? 'approved' : c.approval === 'rejected' ? 'rejected' : 'progress');
  const yearOf = c => c.year || +String(c.start).slice(0, 4);
  function filtered(noTab) {
    const q = fold(st.q);
    return campaigns().filter(c => (st.year === 'all' || String(yearOf(c)) === String(st.year)) && (st.includeCancelled || R.statusOf(c, td()) !== R.CANCELLED)
      && (!q || fold(c.name).includes(q) || fold(c.id).includes(q) || fold(c.owner).includes(q)) && (noTab || st.tab === 'all' || tabOf(c) === st.tab));
  }
  const TL_SORTS = ['start', 'status', 'name'];
  function renderTools() {
    const years = [...new Set(campaigns().map(yearOf))].sort(), tl = view === 'timeline', sorts = tl ? TL_SORTS : R.LIST_SORTS, cur = tl ? st.tsort : st.sort;
    $('k_tools').innerHTML = `<label class="ms"><select class="ms-trigger sel yr" data-kyear aria-label="${esc(K.yearL)}"><option value="all"${st.year === 'all' ? ' selected' : ''}>${esc(K.allYears)}</option>${years.map(y => `<option value="${y}"${String(st.year) === String(y) ? ' selected' : ''}>${y}</option>`).join('')}</select></label>` +
      `<label class="ksearch">${ICON.search}<input type="search" data-kq value="${esc(st.q)}" placeholder="${esc(K.search)}" aria-label="${esc(K.search)}" autocomplete="off"></label>` +
      `<label class="chk"><input type="checkbox" data-kcancel${st.includeCancelled ? ' checked' : ''}><span>${esc(K.includeCancelled)}</span></label><span class="spacer"></span>` +
      `<label class="ms"><select class="ms-trigger sel" data-ksort aria-label="${esc(D.p.sortL)}">${sorts.map(k => `<option value="${k}"${cur === k ? ' selected' : ''}>${esc(K.sortBtn(K.sorts[k]))}</option>`).join('')}</select></label>` +
      `<button type="button" class="btn" data-kexport>${ICON.download}<span>${esc(K.exportBtn)}</span></button>` +
      `<button type="button" class="btn primary" data-knew${ro()}>${ICON.plus}<span>${esc(K.newBtn)}</span></button>`;
  }
  function renderTabs() {
    const rows = filtered(true), n = k => (k === 'all' ? rows.length : rows.filter(c => tabOf(c) === k).length);
    const keys = ['progress', 'approved', 'rejected', 'all'].concat(st.includeCancelled ? ['cancelled'] : []);
    if (!keys.includes(st.tab)) st.tab = 'progress';
    /* the Timeline shows every plan (its own title count) — the tabs are the table's */
    $('k_tabs').classList.toggle('hidden', view === 'timeline');
    $('k_tabs').innerHTML = keys.map(k => `<button type="button" role="tab" data-ktab="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${esc(PL.stTabs2[k])} <span class="n">${n(k)}</span></button>`).join('');
  }

  /* ---------- the table (as Campaign & Phase, no child rows) ---------- */
  /* CR-09 §5.2 (D85) — the numbers of the PLAN of every row (no results here): the approved version · a plan not approved yet: its working version */
  function numbersOf(seed, rows) {
    const out = new Map();
    rows.forEach(c => { const p = (seed.plans || {})[c.id], v = p ? (c.approval === 'approved' ? R.approvedVersion(p) : R.working(p)) : null, T = v ? R.planTotals(v) : null;
      out.set(c.id, { target: T ? T.target : null, budget: T ? T.budget : null, ap: T ? T.ap : null, draft: c.approval !== 'approved', approvedAt: c.approval === 'approved' && v ? v.decided_at : null, approvedBy: c.approval === 'approved' && v ? v.decided_by : null }); });
    return out;
  }
  /* the 6 dots: ✓ done · ● in progress · ↩ returned · ○ not started (4 = its three groups as one dot: done when all three are) */
  function dotsHTML(plan) {
    if (!plan || !plan.steps) return none();
    const S = k => R.stepState(plan, k, td()), cls = s => (s.status === 'done' ? 'done' : s.status === 'returned' ? 'ret' : s.status === 'in_progress' ? 'prog' : 'todo');
    const one = (k, label) => { const s = S(k); return `<i class="pd ${cls(s)}${s.overdue ? ' late' : ''}" title="${esc(`${label} · ${C.step.state[s.status]}${s.assignee ? ' · ' + s.assignee : ''}${s.overdue ? ' · ' + C.step.overdue(s.daysLate) : ''}`)}">${s.status === 'done' ? '✓' : s.status === 'returned' ? '↩' : ''}</i>`; };
    const g4 = ['4a', '4b', '4c'].map(S), c4 = g4.every(s => s.status === 'done') ? 'done' : g4.some(s => s.status === 'returned') ? 'ret' : g4.some(s => s.status !== 'not_started') ? 'prog' : 'todo';
    return `<span class="pdots">${one('1', C.step.names[1])}${one('2', C.step.names[2])}${one('3', C.step.names[3])}<i class="pd ${c4}${g4.some(s => s.overdue) ? ' late' : ''}" title="${esc(g4.map(s => `${C.step.names[s.key]} · ${C.step.state[s.status]}`).join('\n'))}">${c4 === 'done' ? '✓' : c4 === 'ret' ? '↩' : ''}</i>${one('5', C.step.names[5])}${one('6', C.step.names[6])}</span>`;
  }
  /* Waiting on: the first open step not done — its department · who · Due (Overdue in red) · In review → the Executive */
  function waitingHTML(c, plan) {
    if (!plan) return none();
    if (plan.approval === 'submitted') { const w = R.working(plan), d = w && w.submitted_at ? R.dayDiff(td(), String(w.submitted_at).slice(0, 10)) : 0; return `<span class="small">${esc(PL.waitExec(d))}</span>`; }
    if (plan.approval !== 'draft' && plan.approval !== 'returned') return none();
    const w = R.planProgress(plan, td()).waiting; if (!w.length) return none();
    const s = w[0];
    return `<div class="wtn">${U.avatar(s.assignee, true)}<span><b>${esc(s.assignee || '—')}</b> <span class="muted small">${esc(C.step.dept[s.dept])} · ${esc(C.step.names[s.key])}</span>` +
      `<div class="small ${s.overdue ? 'neg' : s.soon ? 'warnx' : 'muted'}">${esc(s.overdue ? C.step.overdue(s.daysLate) : s.due ? C.step.due(R.dmy(s.due)) : '')}${w.length > 1 ? esc(PL.more(w.length - 1)) : ''}</div></span></div>`;
  }
  function renderTable() {
    const box = $('k_table'), seed = seedNow(), all = R.sortList(filtered(), st.sort, td()), Kc = K.cols, plans = seed.plans || {};
    if (!campaigns().length) { box.innerHTML = `<div class="empty-st"><b>${esc(K.empty)}</b><span class="links"><button type="button" class="btn primary" data-knew${ro()}>${ICON.plus}<span>${esc(K.newBtn)}</span></button></span></div>`; return; }
    if (!all.length) { box.innerHTML = `<div class="c3-empty">${esc(K.noMatch)}</div>`; return; }
    /* R7 — 50 rows a page */
    const pages = Math.max(1, Math.ceil(all.length / PAGE)); st.page = Math.min(Math.max(1, st.page || 1), pages);
    const rows = all.slice((st.page - 1) * PAGE, st.page * PAGE);
    const th = (l, o = {}) => `<th class="${o.num ? 'num' : ''}">${o.tip ? labelInfo(l, o.tip, l) : esc(l)}</th>`, nums = numbersOf(seed, rows);
    const body = rows.map(c => {
      const appr = c.approval || 'draft', N = nums.get(c.id) || {}, p = plans[c.id], live = appr === 'approved' && R.statusOf(c, td()) !== R.CANCELLED, d0 = R.dayDiff(c.start, td());
      /* Budget = the plan's (฿ + A&P) — no Used % bar, no result chips (P1 · D85) */
      const bud = N.budget ? `<div class="num"><b>${esc(R.shortBaht(N.budget))}</b></div><div class="small muted num">${esc(PL.ap(R.pct(N.ap)))}</div>` : none();
      const prog = appr === 'approved' && N.approvedAt ? `<span class="small apok">${esc(PL.approvedOn(R.dmy(String(N.approvedAt).slice(0, 10)), N.approvedBy || '—'))}</span>` : dotsHTML(p);
      return `<tr class="click grp" tabindex="0" data-open="${esc(c.id)}"><td class="nm"><div class="nmt"><b${c.note ? ` title="${esc(c.note)}"` : ''}>${esc(c.name)}</b></div></td>` +
        `<td>${c.owner ? `<span class="owner">${U.avatar(c.owner, true)}${esc(c.owner)}</span>` : none()}</td><td class="nowrap" title="${esc(`${R.dmy(c.start)} – ${R.dmy(c.end)}`)}"><span class="small">${esc(R.dmy(c.start))}</span><div class="small muted">${esc(PL.inDays(d0))}</div>${R.statusOf(c, td()) === R.CANCELLED ? `<div>${statusChip(R.CANCELLED)}</div>` : ''}</td>` +
        `<td>${prog}</td><td>${waitingHTML(c, p)}</td><td>${U.apChip(appr)}</td>` +
        `<td class="num">${N.target == null ? none() : esc(R.shortBaht(N.target))}</td><td class="bud">${bud}</td>` +
        `<td class="kmore">${live ? `<a class="link small tomon" href="#monitor/${esc(c.id)}">${esc(PL.toMonitor)}</a>` : ''}<button type="button" class="icon-btn" data-kmore="${esc(c.id)}" aria-haspopup="menu" aria-label="${esc(`${K.menu.more} · ${c.name}`)}" title="${esc(K.menu.more)}">${ICON.more}</button></td></tr>`;
    }).join('');
    const pager = U.pagerHTML(all.length, st.page, 'data-kpage'); void pages;
    box.innerHTML = `<div class="tablewrap"><table class="tbl port klist plist"><thead><tr>${th(Kc.name)}${th(Kc.owner)}${th(PL.cols2.start)}${th(PL.cols.progress, { tip: PL.tips.progress })}${th(PL.cols.waiting, { tip: PL.tips.waiting })}${th(Kc.approval)}${th(Kc.targetV, { num: true, tip: K.colTips.target })}${th(PL.cols2.budget, { tip: PL.budgetTip })}<th></th></tr></thead><tbody>${body}</tbody></table></div>` + pager;
  }

  /* ---------- My tasks (CR-07 §6): the steps given to the one acting — Due (late = red · ≤ 3 days = orange) · Status · Open ---------- */
  function renderTasks() {
    const T = PL.task, T2 = PL.task2, rows = taskRows().slice().sort((x, y) => (y.s.overdue ? 1 : 0) - (x.s.overdue ? 1 : 0) || (x.s.overdue && y.s.overdue ? y.s.daysLate - x.s.daysLate : 0) || String(x.s.due || '9').localeCompare(String(y.s.due || '9')));
    const od = rows.filter(x => x.s.overdue).length, nd = rows.map(x => x.s.due).filter(d => d && d >= td()).sort()[0];   /* next due = the nearest Due from today on */
    const stCell = x => (x.s.open || x.s.status !== 'not_started' ? esc(C.step.state[x.s.status]) : `<span class="blk">${esc(T2.blocked(x.s.waitFor.length))}</span>${U.info(T2.blockedTip(x.s.waitFor.map(k => C.step.names[k])))}`);
    $('k_taskv').innerHTML = `<div class="card"><div class="card-head"><h3>${labelInfo(T.title, T.tip)} <span class="hnote">${esc(me().name)}</span></h3></div>` + (rows.length ? `<div class="sumline tsum" data-tsum>${esc(T2.sum(rows.length, od, nd ? R.dmy(nd) : ''))}</div><div class="tablewrap"><table class="tbl port tasktbl"><thead><tr><th>${esc(T.cols.campaign)}</th><th>${esc(T.cols.step)}</th><th>${esc(T.cols.due)}</th><th>${esc(T.cols.status)}</th><th></th></tr></thead><tbody>` +
      rows.map(x => `<tr class="click" tabindex="0" data-task="${esc(x.c.id)}|${esc(R.STEP_PAGE[x.s.key])}"><td class="nm"><b>${esc(x.c.name)}</b><div class="muted small">${esc(`${R.dmy(x.c.start)} – ${R.dmy(x.c.end)}`)}</div></td><td>${esc(C.step.names[x.s.key])} <span class="muted small">${esc(C.step.dept[x.s.dept])}</span></td>` +
        `<td class="${x.s.overdue ? 'neg' : x.s.soon ? 'warnx' : ''}">${esc(x.s.due ? R.dmy(x.s.due) : '—')}${x.s.overdue ? ` <span class="chip err">${esc(C.step.overdue(x.s.daysLate))}</span>` : x.s.soon ? ` <span class="chip warn">${esc(C.step.dueSoon)}</span>` : ''}</td>` +
        `<td data-tst>${stCell(x)}${x.s.refresh ? ` <span class="chip warn">${esc(C.step.refresh)}</span>` : ''}</td>` +
        `<td><a class="btn small${x.s.open ? ' primary' : ''}" href="#planning/${esc(x.c.id)}/${esc(R.STEP_PAGE[x.s.key])}">${esc(T.open)}</a></td></tr>`).join('') + '</tbody></table></div>'
      : `<div class="na-none"><span class="okm" aria-hidden="true">✓</span> ${esc(T.none)}</div>`) + '</div>';
  }

  /* ---------- CR-06 §5 — Timeline (screen-timeline.js): the same filters as the table · Rejected only on its tab · sorted Start date · Status · Name ---------- */
  const tlRows = () => R.sortList(filtered(true).filter(c => c.approval !== 'rejected'), st.tsort, td());
  const tlCtx = () => { const rows = tlRows(), seed = seedNow(); return { seed, rows, all: campaigns(), year: st.year, today: td(), includeCancelled: st.includeCancelled, nums: numbersOf(seed, rows) }; };
  function renderTimeline() { CP.ktimeline.render($('k_tl'), tlCtx()); }

  /* ---------- the ⋯ menu ---------- */
  function closeMenu() { const m = $('k_menu'); if (m) m.remove(); }
  function openMenu(btn, id) {
    closeMenu();
    const c = campaigns().find(x => x.id === id); if (!c) return;
    const cancelled = R.statusOf(c, td()) === R.CANCELLED, m = document.createElement('div'), live = c.approval === 'approved', off = canEdit(c) ? '' : ' disabled';
    m.id = 'k_menu'; m.className = 'menu-pop'; m.setAttribute('role', 'menu');
    m.innerHTML = (view === 'page' ? '' : `<button type="button" role="menuitem" data-kact="page">${esc(PL.menu.plan)}</button>`) + (live ? `<button type="button" role="menuitem" data-kact="open">${esc(PL.menu.monitor)}</button>` : '') +
      `<button type="button" role="menuitem" data-kact="edit"${off}>${esc(K.menu.edit)}</button>` +
      (cancelled ? `<button type="button" role="menuitem" data-kact="restore"${off}>${esc(K.menu.restore)}</button>` : `<button type="button" role="menuitem" class="danger" data-kact="cancel"${off}>${esc(K.menu.cancel)}</button>`);
    m.dataset.id = id; document.body.appendChild(m);
    const r = btn.getBoundingClientRect();
    m.style.top = Math.min(innerHeight - m.offsetHeight - 8, r.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    m.querySelector('button:not([disabled])').focus();
    m.addEventListener('click', e => { const b = e.target.closest('[data-kact]'); if (!b) return; closeMenu(); act(b.dataset.kact, id, btn); });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); btn.focus(); } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const b = [...m.querySelectorAll('button:not([disabled])')], i = b.indexOf(document.activeElement); b[(i + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length].focus(); } });
  }
  document.addEventListener('click', e => { if ($('k_menu') && !e.target.closest('#k_menu') && !e.target.closest('[data-kmore]')) closeMenu(); }, true);
  /* Edit details · Cancel · Restore: the owner or a Manager */
  function canEdit(c) { const p = (seedNow().plans || {})[c.id]; return !!p && R.canDo('details', me(), p).ok; }
  function act(what, id) {
    const c = campaigns().find(x => x.id === id); if (!c) return;
    if (['edit', 'restore', 'cancel'].includes(what) && !canEdit(c)) return;
    if (what === 'page') location.hash = `#planning/${id}`;
    if (what === 'edit') openForm(id);
    if (what === 'open') location.hash = `#monitor/${id}`;
    if (what === 'restore') run({ action: 'restore', id, values: {} }, c.name);
    if (what === 'cancel') askCancel(c);
  }
  /* Cancel <name>? — a dialog in the page (never the browser's confirm) · Reason → note */
  function askCancel(c) {
    const Q = K.cancelD;
    U.openDialog(`<div class="dlg-h">${esc(Q.title(c.name))}</div><div class="dlg-b"><p>${esc(Q.body)}</p><div class="field"><label for="k_reason">${esc(Q.reason)}</label><textarea id="k_reason" rows="2" maxlength="300">${esc(c.note || '')}</textarea></div></div>
      <div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(Q.keep)}</button><button type="button" class="btn danger" data-r="1">${esc(Q.ok)}</button></div>`);
    const dlg = $('dlg'); $('k_reason').focus();
    dlg.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { const reason = $('k_reason').value.trim(); U.closeDialog(); if (b.dataset.r === '1') run({ action: 'cancel', id: c.id, values: { note: reason } }, c.name); }));
  }

  /* ===================== the save of every change (CP.store — this browser) ===================== */
  /* → the result when saved · o.onError(e) for the form */
  async function run(change, name, o = {}) {
    let res = null;
    try { res = await S.saveList(change, { today: td() }); }
    catch (e) { if (e.code !== 'invalid') U.toast(K.err.failed); if (o.onError) o.onError(e); return false; }
    const T = K.toast, act = change.action, word = act === 'add' ? T.added : act === 'cancel' || (change.values && change.values.status === 'cancelled') ? T.cancelled : act === 'restore' ? T.restored : T.saved;
    U.toast(word(name));
    if (U.drawerOwner()) U.closeDrawer();
    CP.app.refresh();
    return res;
  }

  /* ===================== the New / Edit drawer (§8) ===================== */
  let F = null;   // { id, form, row, touched, tried, dirty }
  const dateOk = R.isISODate;
  function formOf(row) {
    if (!row) return { name: '', start: '', end: '', end_marketing: '', status: 'auto', reason: '' };
    const k = R.statusKey(row.status), past = row.end && td() > row.end;
    return { name: row.campaign, start: row.start, end: row.end, end_marketing: row.end_marketing || '', status: k === 'cancelled' ? 'cancelled' : k === 'complete' && !past ? 'complete' : 'auto', reason: row.note || '' };
  }
  function openForm(id) {
    const row = id ? listRows().find(r => r.id === id) : null; if (id && !row) return;
    F = { id, row, form: formOf(row), touched: new Set(), tried: false, dirty: false };
    U.openDrawer({ kind: 'form', isDirty: () => F && F.dirty, onClose: () => { F = null; }, onKey }, formHTML());
    $('drawer_content').classList.add('form');
    $('k_f_name').focus();
    wireForm(); update();
  }
  const autoWord = () => C.status[R.statusOf({ status: 'auto', start: F.form.start, end: F.form.end }, td())] || C.status.ongoing;
  function formHTML() {
    const Dd = K.d, f = F.form, edit = !!F.id, idNow = edit ? F.id : R.campaignId(f.name, listRows(), td());
    return `<div class="dr-head"><div class="dr-title"><h2 id="k_f_h">${esc(edit ? Dd.editTitle : Dd.newTitle)}</h2>` +
      /* P11 — only the parts that have a value: id · Created · Updated */
      (edit ? `<div class="dr-sub">${esc([F.id, F.row.created_at ? Dd.metaParts.created(R.dmy(F.row.created_at.slice(0, 10))) : '', F.row.updated_at ? Dd.metaParts.updated(R.dmy(F.row.updated_at.slice(0, 10))) : ''].filter(Boolean).join(' · '))}</div>` : '') +
      `</div><button type="button" class="icon-btn" data-dr-close aria-label="${esc(C.common.close)}" title="${esc(C.common.close)} (Esc)">${ICON.close}</button></div>` +
      `<form class="dr-body kform" id="k_form" novalidate autocomplete="off">` +
      `<div class="field"><label for="k_f_name">${esc(Dd.name)} <span class="req">*</span></label><input id="k_f_name" class="inp" maxlength="120" value="${esc(f.name)}"><div class="help" id="k_f_idhelp">${esc(edit ? Dd.idLocked(idNow) : Dd.idHelp(idNow))}</div><div class="ferr" id="k_e_name"></div></div>` +
      `<div class="frow"><div class="field"><label for="k_t_start">${esc(Dd.start)} <span class="req">*</span></label>${U.dateHTML('id="k_f_start"', f.start, { textId: 'k_t_start' })}<div class="ferr" id="k_e_start"></div></div>` +
      `<div class="field"><label for="k_t_end">${esc(Dd.end)} <span class="req">*</span></label>${U.dateHTML('id="k_f_end"', f.end, { textId: 'k_t_end' })}<div class="ferr" id="k_e_end"></div></div></div>` +
      `<div class="help" id="k_f_days"></div>` +
      `<div class="field"><label for="k_t_endm">${esc(Dd.endMkt)}</label>${U.dateHTML('id="k_f_endm"', f.end_marketing, { textId: 'k_t_endm' })}<div class="help">${esc(Dd.endMktHelp)}</div><div class="ferr" id="k_e_end_marketing"></div></div>` +
      `<div class="field"><label for="k_f_status">${esc(Dd.status)}</label><select id="k_f_status" class="inp"><option value="auto"${f.status === 'auto' ? ' selected' : ''} id="k_f_auto">${esc(Dd.statusAuto(autoWord()))}</option>` +
      `<option value="complete"${f.status === 'complete' ? ' selected' : ''}>${esc(Dd.statusComplete)}</option><option value="cancelled"${f.status === 'cancelled' ? ' selected' : ''}>${esc(Dd.statusCancelled)}</option></select>` +
      `<div class="field sub${f.status === 'cancelled' ? '' : ' hidden'}" id="k_f_reasonw"><label for="k_f_reason">${esc(Dd.reason)}</label><textarea id="k_f_reason" class="inp" rows="2" maxlength="300" placeholder="${esc(Dd.reasonPh)}">${esc(f.reason)}</textarea></div></div>` +
      `</form><div class="dr-foot"><div class="ferr fmsg" id="k_f_msg"></div><button type="button" class="btn" data-dr-close>${esc(Dd.cancel)}</button><button type="button" class="btn primary" id="k_f_save">${esc(Dd.save)}</button></div>`;
  }
  function wireForm() {
    const dc = $('drawer_content');
    dc.oninput = e => { F.dirty = true; read(); F.touched.add(e.target.id); update(); };
    dc.onchange = e => { F.dirty = true; read(); F.touched.add(e.target.id); update(); };
    dc.onclick = e => { if (e.target.closest('#k_f_save')) doSave(); };
  }
  function read() {
    const v = id => { const el = $(id); return el ? el.value : ''; }, f = F.form;
    f.name = v('k_f_name'); f.start = v('k_f_start'); f.end = v('k_f_end'); f.end_marketing = v('k_f_endm'); f.status = v('k_f_status') || 'auto'; f.reason = v('k_f_reason');
  }
  const errorsNow = () => R.validateCampaign(F.form, listRows(), F.id);
  /* the parts that follow what is typed — the focus stays where it is */
  function update() {
    if (!F) return;
    const f = F.form, e = errorsNow(), show = k => F.tried || F.touched.has({ name: 'k_f_name', start: 'k_f_start', end: 'k_f_end', end_marketing: 'k_f_endm' }[k]);
    ['name', 'start', 'end', 'end_marketing'].forEach(k => { const el = $('k_e_' + k); if (el) el.textContent = e[k] && show(k) ? e[k] : ''; });
    if (!F.id) $('k_f_idhelp').textContent = K.d.idHelp(R.campaignId(f.name, listRows(), td()));
    $('k_f_days').textContent = dateOk(f.start) && dateOk(f.end) && f.end >= f.start ? K.d.days(R.dayDiff(f.end, f.start) + 1, f.start.slice(0, 4)) : '';
    const auto = $('k_f_auto'); if (auto) auto.textContent = K.d.statusAuto(autoWord());
    $('k_f_reasonw').classList.toggle('hidden', f.status !== 'cancelled');
    $('k_f_save').disabled = Object.keys(e).length > 0 || !!F.saving;
  }
  function onKey(e) {
    if (e.key !== 'Enter' || e.target.matches('textarea, button, select') || e.shiftKey) return;
    if (e.target.closest('#k_form')) { e.preventDefault(); doSave(); }
  }
  async function doSave() {
    if (!F || F.saving) return;
    read(); F.tried = true; update();
    const e = errorsNow(); if (Object.keys(e).length) { const first = ['name', 'start', 'end', 'end_marketing'].find(k => e[k]); const el = $({ name: 'k_f_name', start: 'k_t_start', end: 'k_t_end', end_marketing: 'k_t_endm' }[first]); if (el) el.focus(); return; }
    const f = F.form, edit = !!F.id;
    const values = { campaign: f.name.trim(), start: f.start, end: f.end, end_marketing: f.end_marketing, status: f.status };
    if (!edit) values.owner = me().name;
    if (f.status === 'cancelled') values.note = f.reason.trim(); else if (!edit) values.note = '';
    F.saving = true; $('k_f_save').textContent = K.d.saving; update(); $('k_f_msg').innerHTML = '';
    const res = await run({ action: edit ? 'edit' : 'add', id: F.id, values }, values.campaign, { onError: x => {
      if (F && x.code === 'invalid' && x.errors) Object.entries(x.errors).forEach(([k, m]) => { const el = $('k_e_' + k); if (el) el.textContent = m; });
    } });
    if (F && !res) { F.saving = false; $('k_f_save').textContent = K.d.save; update(); }
    /* CR-05 — a new Campaign is a Draft plan: the plan, then its page */
    if (res && !edit && res.row) await newPlanFor(res.row.id);
  }
  async function newPlanFor(id, from) {
    const a = me(), at = R.nowLocal();
    const c = campaigns().find(x => x.id === id) || S.data().list.rows.find(x => x.id === id) || {}, start = c.start;
    try { await S.savePlan(id, p => { const q = from ? Object.assign(p, { versions: [Object.assign(R.clonePlan(from), { v: 1, status: 'draft', submitted_at: null, submitted_by: null, decided_at: null, decided_by: null, comment: '' })] }) : p;
      q.steps = R.newSteps(start, a.name, CP.actor.people()); if (from) ['1', '2', '3', '4a', '4b', '4c'].forEach(k => { q.steps[k].status = 'in_progress'; }); return q; }, { create: R.newPlan(id, a.name, at, a.name) }); }
    catch (x) { U.toast(AP.toast.failed); return; }
    location.hash = `#planning/${id}/details`;
  }
  /* a Rejected plan → Duplicate as draft: a new Campaign (name (2)) with the plan's last version as v1 */
  async function duplicate(id) {
    const c = campaigns().find(x => x.id === id), p = (seedNow().plans || {})[id]; if (!c || !p) return;
    const names = new Set(campaigns().map(x => fold(x.name))); let n = 2, name = `${c.name} (${n})`; while (names.has(fold(name))) name = `${c.name} (${++n})`;
    const res = await run({ action: 'add', values: { campaign: name, start: c.start, end: c.end, end_marketing: c.end_marketing || '', status: 'auto', note: '', owner: me().name } }, name);
    if (res && res.row) { await newPlanFor(res.row.id, R.working(p)); U.toast(AP.toast.duplicated(name)); }
  }

  /* ---------- events of the page ---------- */
  function exportNow() {
    const scope = st.year === 'all' ? K.allYears : String(st.year), meta = [[K.meta.at, `${R.dmy(td())}`]];
    if (view === 'timeline') { U.saveXlsx(K.tl.file, scope, [CP.ktimeline.table(tlCtx())], meta); return; }
    const rows = R.sortList(filtered(), st.sort, td());
    U.saveXlsx(K.file, scope, [X.rowsFor('campaigns', { seed: seedNow(), rows, today: td(), nums: numbersOf(seedNow(), rows) })], meta);
  }
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-knew]')) { if (R.canDo('create', me()).ok) openForm(null); return; }
    const sg = t.closest('.seg[data-apseg] button'); if (sg) { ap.seg = sg.dataset.v; pref.setJson('camps_appr', ap); renderAppr(); return; }
    const dop = t.closest('[data-decopen]'); if (dop) { const k = dop.dataset.decopen; if (apOpen.has(k)) apOpen.delete(k); else apOpen.add(k); renderAppr(); return; }
    const rv = t.closest('[data-aprev]'); if (rv) { const [kind, id, no] = rv.dataset.aprev.split('|'); CP.review.open({ kind, id, no: no ? +no : null }); return; }
    const mb = t.closest('[data-kmore]'); if (mb) { e.stopPropagation(); if ($('k_menu') && $('k_menu').dataset.id === mb.dataset.kmore) closeMenu(); else openMenu(mb, mb.dataset.kmore); return; }
    const tb = t.closest('[data-ktab]'); if (tb) { st.tab = tb.dataset.ktab; st.page = 1; save(); renderTabs(); renderRows(); return; }
    if (t.closest('[data-kexport], [data-tlexport]')) { exportNow(); return; }
    const pg = t.closest('[data-kpage]'); if (pg) { st.page = (st.page || 1) + +pg.dataset.kpage; renderTable(); return; }
    const tk = t.closest('tr[data-task]'); if (tk && !t.closest('a, button')) { const [id, page] = tk.dataset.task.split('|'); location.hash = `#planning/${id}/${page}`; return; }
    const tr = t.closest('tr[data-open]'); if (tr && !t.closest('button, a, input, select')) openRow(tr.dataset.open);
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-kyear]')) { st.year = t.value; save(); renderTabs(); renderRows(); }
    if (t.matches('[data-kcancel]')) { st.includeCancelled = t.checked; save(); renderTabs(); renderRows(); }
    if (t.matches('[data-ksort]')) { if (view === 'timeline') st.tsort = t.value; else st.sort = t.value; save(); renderRows(); }
    if (t.matches('[data-aptype]')) { ap.type = t.value; pref.setJson('camps_appr', ap); renderAppr(); }
  }
  return { render, openNew: () => openForm(null), openForm, run, duplicate, menuFor: (btn, id) => openMenu(btn, id), approvalsCount: apCount, tabOf, renderTimeline, taskRows, openRow };
})();
