/* screen-campaigns.js — WORK › Campaigns (CR-03 §7–8 · CR-05 §10 · CR-06): add · edit · cancel · restore a Campaign. → CP.screens.campaigns
   #campaigns (the tab seen last) · #campaigns/table · #campaigns/timeline (CR-06 §5 — screen-timeline.js) · #campaigns/approvals (the KOL cards) ·
   #campaigns/new opens the form · #campaigns/<id>[/<tab>] = the Campaign page (CP.cpage).
   The rows = the made-up list + what was clicked in this browser (CP.store · D48 · D52). Toolbar (as Campaign & Phase): Year · Search · Include cancelled ···
   Sort · Export · + New campaign · status tabs (+ Draft · Pending approval) · the table: Name · Approval · Status · Time · Owner · Target · Budget · ⋯ (CR-06 §4: no Data).
   The New / Edit drawer (480px) checks with R.validateCampaign · New campaign = a Draft plan (owner = the one acting) → its page. */
CP.screens = CP.screens || {};
CP.screens.campaigns = (function () {
  'use strict';
  const U = CP.ui, S = CP.store, X = CP.export;
  const { C, R, $, esc, pref, ICON, labelInfo, none, statusChip } = U;
  const K = C.camps, D = C.dash, AP = C.appr;
  const saved = pref.json('camps', {}) || {};
  const st = Object.assign({ year: 'all', includeCancelled: false, sort: 'status', tsort: 'start', tab: 'all', view: 'table' }, saved);
  st.q = '';   // the search is for this visit only
  if (!R.LIST_SORTS.includes(st.sort)) st.sort = 'status';
  if (!['start', 'status', 'name'].includes(st.tsort)) st.tsort = 'start';
  const VIEWS = ['table', 'timeline', 'approvals'];
  const save = () => pref.setJson('camps', { year: st.year, includeCancelled: st.includeCancelled, sort: st.sort, tsort: st.tsort, tab: st.tab, view: st.view });
  const td = () => U.today();
  const me = () => CP.actor.get();
  const listRows = () => S.data().list.rows;
  const ro = () => (R.canDo('create', me()).ok ? '' : ` disabled aria-disabled="true"`);
  const fold = t => String(t || '').toLocaleLowerCase('th').replace(/\s+/g, ' ').trim();

  let sec = null, view = 'table';
  function render(sub) {
    sec = $('tab-campaigns');
    if (!sec.dataset.built) build();
    const parts = String(sub || '').split('/');
    /* #campaigns/<id>[/<tab>] — the Campaign page */
    if (parts[0] && parts[0] !== 'new' && !VIEWS.includes(parts[0])) { view = 'page'; $('k_listv').classList.add('hidden'); $('k_pagev').classList.remove('hidden'); CP.cpage.render($('k_pagev'), decodeURIComponent(parts[0]), parts[1] || null); return; }
    /* the tab seen last (as the Dashboard) — #campaigns alone opens it */
    view = VIEWS.includes(parts[0]) ? parts[0] : VIEWS.includes(st.view) ? st.view : 'table';
    if (st.view !== view) { st.view = view; save(); }
    const want = view === 'table' ? (parts[0] === 'table' ? '#campaigns/table' : '#campaigns') : `#campaigns/${view}`;
    if (sub !== 'new' && location.hash !== want && !(view === 'table' && location.hash === '#campaigns/table')) history.replaceState(null, '', want);
    $('k_pagev').classList.add('hidden'); $('k_pagev').innerHTML = ''; $('k_listv').classList.remove('hidden');
    renderAll();
    if (sub === 'new') { history.replaceState(null, '', '#campaigns'); if (R.canDo('create', me()).ok) openForm(null); }
  }
  function build() {
    sec.innerHTML = `<div id="k_listv"><div class="pbanner"><h1>${esc(K.title)}</h1></div>
      <div class="vtabs" role="tablist" id="k_vtabs"></div><div id="k_tablev">
      <div class="toolbar ctools" id="k_tools"></div>
      <div class="sttabs ktabs" role="tablist" id="k_tabs"></div><div class="card ktable" id="k_table"></div><div class="card ktl hidden" id="k_tl"></div></div><div id="k_apprv" class="hidden"></div></div><div id="k_pagev" class="hidden"></div>`;
    sec.addEventListener('click', onClick);
    sec.addEventListener('change', onChange);
    sec.addEventListener('input', e => { if (e.target.matches('[data-kq]')) { st.q = e.target.value; renderTabs(); renderRows(); } });
    sec.addEventListener('keydown', e => { const tr = e.target.closest('tr[data-open]'); if (tr && e.target === tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = `#campaigns/${tr.dataset.open}`; } });
    sec.dataset.built = '1';
  }
  function renderAll() {
    renderVTabs();
    $('k_tablev').classList.toggle('hidden', view === 'approvals'); $('k_apprv').classList.toggle('hidden', view !== 'approvals');
    if (view === 'approvals') { renderAppr(); return; }
    $('k_table').classList.toggle('hidden', view !== 'table'); $('k_tl').classList.toggle('hidden', view !== 'timeline');
    renderTools(); renderTabs(); renderRows();
  }
  const renderRows = () => (view === 'timeline' ? renderTimeline() : renderTable());
  /* ---------- Table · Timeline · Approvals (n) — a Manager: what waits for a decision · the rest: My requests (n = returned to them) ---------- */
  const apItems = () => R.approvalItems(seedNow(), td());
  const apCount = () => R.waitingFor(apItems(), me()).length;
  function renderVTabs() {
    const a = me(), n = apCount(), mgr = R.isMgr(a), lbl = mgr || a.role === 'viewer' || a.role === 'accounting' ? AP.tab : AP.tabStaff;
    const tab = (v, href, label) => `<a role="tab" href="${href}" class="${view === v ? 'on' : ''}" aria-selected="${view === v}">${label}</a>`;
    $('k_vtabs').innerHTML = tab('table', '#campaigns/table', esc(AP.tabTable)) + tab('timeline', '#campaigns/timeline', esc(K.tl.tab)) +
      tab('approvals', '#campaigns/approvals', `${esc(lbl)}${n ? ` <span class="nbadge" title="${esc(mgr ? AP.badgeTip(n) : AP.badgeTipStaff(n))}">${n}</span>` : ''}`);
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
      (list.length ? `<div class="apcards">${list.map(apCard).join('')}</div>` : `<div class="card"><div class="c3-empty">${esc(AP.none[ap.seg])}</div></div>`);
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
      const q = x.req, t = R.sumLines(q.lines);
      body = kv(A.amount, R.signedShort(t), t < 0 ? 'neg' : '') + kv(A.reason, q.reason) + kv(A.lines(q.lines.length), q.lines.slice(0, 3).map(l => `${l.line} ${R.monthShort(l.month)} ${R.signedShort(+l.amount)}`).join(' · ') + (q.lines.length > 3 ? ' …' : ''));
      if (x.status === 'pending') { const im = R.requestImpact(seedNow(), c.id, q.lines); body += kv(A.impact, `${R.shortBaht(im.before)} → ${R.shortBaht(im.after)} · A&P ${R.pct(im.ap[1], 1)}`); }
    }
    const decided = ['approved', 'returned', 'rejected'].includes(x.status) ? `<div class="apdec">${esc(AP.decided(AP.state[x.status], x.decided_by || '—', d(x.decided_at)))}${x.comment ? ` — <i>${esc(x.comment)}</i>` : ''}</div>` : '';
    const can = x.status === 'pending' && (x.kind === 'plan' ? R.canDo('approve', a, x.plan) : R.canDo('request.decide', a, x.plan, { req: x.req }));
    const btns = (x.status === 'draft' ? '' : `<button type="button" class="btn small${can.ok ? ' primary' : ''}" data-aprev="${esc(x.kind)}|${esc(c.id)}|${x.req ? x.req.no : ''}"${!can.ok && can.why ? ` title="${esc(can.why)}"` : ''}>${esc(can.ok ? AP.review : AP.view)}</button>`) +
      `<a class="btn small ghost" href="#campaigns/${esc(c.id)}${x.kind === 'request' ? '/requests' : ''}">${esc(AP.open)}</a>`;
    return `<article class="apcard ${esc(x.status)}"><header><span class="apt ${esc(x.kind === 'plan' ? 'plan' : x.req.type)}">${esc(kind)}${x.req ? ` #${x.req.no}` : ''}</span>${U.apChip(x.status)}${x.status === 'pending' && x.age >= 3 ? `<span class="chip warn">${esc(AP.ago(x.age))}</span>` : ''}</header>` +
      `<h3><a href="#campaigns/${esc(c.id)}">${esc(c.name)}</a></h3><div class="apsub">${U.avatar(x.by || x.plan.owner, true)}<span>${esc(sub)}</span></div><div class="apbody">${body}</div>${decided}<footer>${btns}</footer></article>`;
  }

  /* ---------- the rows: the list over the made-up seed · Year · Search · Include cancelled · status tab ---------- */
  const seedNow = () => U.seed();
  const campaigns = () => seedNow().allCampaigns || seedNow().campaigns || [];
  /* the status tab of a row: a plan not approved yet → Draft (draft · returned) · Pending approval · Rejected — else the Campaign status */
  const tabOf = c => { const s = R.statusOf(c, td()); if (s === R.CANCELLED || c.approval === 'approved') return s; return c.approval === 'submitted' ? 'pending' : c.approval === 'rejected' ? 'rejected' : 'draft'; };
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
    const keys = ['all', 'ongoing', 'not_started', 'complete', 'draft', 'pending'].concat(n('rejected') ? ['rejected'] : [], st.includeCancelled ? ['cancelled'] : []);
    if (!keys.includes(st.tab)) st.tab = 'all';
    $('k_tabs').innerHTML = keys.map(k => `<button type="button" role="tab" data-ktab="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${esc(K.tabs[k])} <span class="n">${n(k)}</span></button>`).join('');
  }

  /* ---------- the table (as Campaign & Phase, no child rows) ---------- */
  /* the target and the budget of every row: the approved plan · a plan not approved yet: its draft */
  function numbersOf(seed, rows) {
    const tgt = new Map(); (seed.sales || []).forEach(r => { if (r.scenario === 'target') tgt.set(r.campaign_id, (tgt.get(r.campaign_id) || 0) + (r.amount || 0)); });
    const live = rows.filter(c => c.approval === 'approved'), span = live.length ? [live.reduce((m, c) => (c.start < m ? c.start : m), live[0].start), live.reduce((m, c) => (c.end > m ? c.end : m), live[0].end)] : null;
    const bt = span ? R.budgetTrack(seed, { from: R.monthFirst(R.addMonths(R.ym(span[0]), -1)), to: span[1], statuses: R.STATUSES, includeCancelled: true, only: live.map(c => c.id), today: td() }) : { rows: [] };
    const bmap = new Map(bt.rows.map(t => [t.id, t])), out = new Map();
    rows.forEach(c => { if (c.approval !== 'approved') { const p = (seed.plans || {})[c.id], T = p ? R.planTotals(R.working(p)) : null; out.set(c.id, { target: T ? T.target : null, budget: T ? T.budget : null, draft: true }); }
      else out.set(c.id, { target: tgt.has(c.id) ? tgt.get(c.id) : null, track: bmap.get(c.id) || null }); });
    return out;
  }
  function renderTable() {
    const box = $('k_table'), seed = seedNow(), rows = R.sortList(filtered(), st.sort, td()), Kc = K.cols;
    if (!campaigns().length) { box.innerHTML = `<div class="empty-st"><b>${esc(K.empty)}</b><span class="links"><button type="button" class="btn primary" data-knew${ro()}>${ICON.plus}<span>${esc(K.newBtn)}</span></button></span></div>`; return; }
    if (!rows.length) { box.innerHTML = `<div class="c3-empty">${esc(K.noMatch)}</div>`; return; }
    const th = (l, o = {}) => `<th class="${o.num ? 'num' : ''}">${o.tip ? labelInfo(l, o.tip, l, true) : esc(l)}</th>`, nums = numbersOf(seed, rows);
    const body = rows.map(c => {
      const s = R.statusOf(c, td()), cancelled = s === R.CANCELLED, appr = c.approval || 'draft', N = nums.get(c.id) || {};
      const days = cancelled ? '' : X.daysText(R.daysLeft(c, td())), dl = R.daysLeft(c, td());
      const time = `<div class="nowrap">${esc(`${R.dmy(c.start)} – ${R.dmy(c.end)}`)}</div>${days && typeof days === 'string' && !days.startsWith('<') ? `<div class="small dleft${dl.soon ? ' soon' : ''}">${esc(days)}</div>` : ''}`;
      const t = N.track, bud = N.draft ? (N.budget ? `<div class="num">${esc(R.baht(N.budget))}</div><div class="muted small">${esc(AP.state[appr] || appr)}</div>` : none())
        : t && t.current > 0 ? `<div class="bcell"><span class="num">${esc(R.shortBaht(t.current))}</span>${U.budgetBar(Object.assign({}, t, { paid: t.paidV }), { short: true })}<span class="small ${t.used > 1 ? 'neg' : 'muted'}">${esc(R.pctA(t.used, true))}</span></div>` : none(C.track.noBudget(''));
      return `<tr class="click grp" tabindex="0" data-open="${esc(c.id)}"><td class="nm"><div class="nmt"><b${c.note ? ` title="${esc(c.note)}"` : ''}>${esc(c.name)}</b></div></td>` +
        `<td>${U.apChip(appr)}</td><td>${statusChip(s)}</td><td>${time}</td>` +
        `<td>${c.owner ? `<span class="owner">${U.avatar(c.owner, true)}${esc(c.owner)}</span>` : none()}</td><td class="num">${N.target == null ? none() : `${esc(R.shortBaht(N.target))}${N.draft ? `<div class="muted small">${esc(C.plan.v(c.v || 1))}</div>` : ''}`}</td>` +
        `<td class="bud">${bud}</td>` +
        `<td class="kmore"><button type="button" class="icon-btn" data-kmore="${esc(c.id)}" aria-haspopup="menu" aria-label="${esc(`${K.menu.more} · ${c.name}`)}" title="${esc(K.menu.more)}">${ICON.more}</button></td></tr>`;
    }).join('');
    box.innerHTML = `<div class="tablewrap"><table class="tbl port klist"><thead><tr>${th(Kc.name)}${th(Kc.approval)}${th(Kc.status)}${th(Kc.time, { tip: C.money.daysLeft })}${th(Kc.owner)}${th(Kc.targetV, { num: true, tip: K.colTips.target })}${th(Kc.budget, { tip: K.colTips.budget })}<th></th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* ---------- CR-06 §5 — Timeline (screen-timeline.js): the same filters as the table · Rejected only on its tab · sorted Start date · Status · Name ---------- */
  const tlRows = () => R.sortList(filtered().filter(c => st.tab === 'rejected' || c.approval !== 'rejected'), st.tsort, td());
  const tlCtx = () => { const rows = tlRows(), seed = seedNow(); return { seed, rows, all: campaigns(), year: st.year, today: td(), includeCancelled: st.includeCancelled, nums: numbersOf(seed, rows) }; };
  function renderTimeline() { CP.ktimeline.render($('k_tl'), tlCtx()); }

  /* ---------- the ⋯ menu ---------- */
  function closeMenu() { const m = $('k_menu'); if (m) m.remove(); }
  function openMenu(btn, id) {
    closeMenu();
    const c = campaigns().find(x => x.id === id); if (!c) return;
    const cancelled = R.statusOf(c, td()) === R.CANCELLED, m = document.createElement('div'), live = c.approval === 'approved', off = canEdit(c) ? '' : ' disabled';
    m.id = 'k_menu'; m.className = 'menu-pop'; m.setAttribute('role', 'menu');
    m.innerHTML = (view === 'page' ? '' : `<button type="button" role="menuitem" data-kact="page">${esc(K.menu.page)}</button>`) + (live ? `<button type="button" role="menuitem" data-kact="open">${esc(K.menu.dash)}</button>` : '') +
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
    if (what === 'page') location.hash = `#campaigns/${id}`;
    if (what === 'edit') openForm(id);
    if (what === 'open') CP.screens.dashboard.openCampaign(id);
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
    try { await S.savePlan(id, p => (from ? Object.assign(p, { versions: [Object.assign(R.clonePlan(from), { v: 1, status: 'draft', submitted_at: null, submitted_by: null, decided_at: null, decided_by: null, comment: '' })] }) : p), { create: R.newPlan(id, a.name, at, a.name) }); }
    catch (x) { U.toast(AP.toast.failed); return; }
    location.hash = `#campaigns/${id}`;
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
    const rv = t.closest('[data-aprev]'); if (rv) { const [kind, id, no] = rv.dataset.aprev.split('|'); CP.review.open({ kind, id, no: no ? +no : null }); return; }
    const mb = t.closest('[data-kmore]'); if (mb) { e.stopPropagation(); if ($('k_menu') && $('k_menu').dataset.id === mb.dataset.kmore) closeMenu(); else openMenu(mb, mb.dataset.kmore); return; }
    const tb = t.closest('[data-ktab]'); if (tb) { st.tab = tb.dataset.ktab; save(); renderTabs(); renderRows(); return; }
    if (t.closest('[data-kexport], [data-tlexport]')) { exportNow(); return; }
    const tr = t.closest('tr[data-open]'); if (tr && !t.closest('button, a, input, select')) location.hash = `#campaigns/${tr.dataset.open}`;
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-kyear]')) { st.year = t.value; save(); renderTabs(); renderRows(); }
    if (t.matches('[data-kcancel]')) { st.includeCancelled = t.checked; save(); renderTabs(); renderRows(); }
    if (t.matches('[data-ksort]')) { if (view === 'timeline') st.tsort = t.value; else st.sort = t.value; save(); renderRows(); }
    if (t.matches('[data-aptype]')) { ap.type = t.value; pref.setJson('camps_appr', ap); renderAppr(); }
  }
  return { render, openNew: () => openForm(null), openForm, run, duplicate, menuFor: (btn, id) => openMenu(btn, id), approvalsCount: apCount, tabOf, renderTimeline };
})();
