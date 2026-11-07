/* screen-plan.js — the Campaign page (CP.cpage) · the review (CP.reqdraw · CP.review) · the change drawers (CP.chgdraw)
   #planning/<id>/overview|plan[/<page>]|requests|history · the head: name · Approval · Owner · Period · the buttons of the one acting (Review (Executive) ·
   Withdraw · Duplicate · Restore · ⋯ with Export PDF) · CR-14 (D126): the Plan tab of a plan not approved = the 4 steps of CP.steps (screen-steps.js:
   Brief → Sales target ∥ Expense lines → Summary & submit · the P&L bar · the checks in the bar at the bottom) · an approved plan: Overview (+ the P&L of
   §8.3 · Export PDF) · Plan (read only: the P&L · the summaries · the budget) · Requests · History · the 7 pages of CR-13 = git history (v0.13.1). */
CP.cpage = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON, labelInfo, none, statusChip } = U;
  const P = C.plan, A = C.appr, SP = C.step, W = C.s14;
  const me = () => CP.actor.get();
  const allCamps = () => { const s = U.seed(); return s.allCampaigns || s.campaigns || []; };
  const campOf = id => allCamps().find(c => c.id === id) || null;
  const planOf = id => CP.store.data().plans[id] || null;
  const people = () => CP.actor.people();
  const at = () => R.nowLocal();
  let el = null, st = { id: null, tab: 'plan', hf: 'all', editD: false, ver: null };
  /* QA-v0.13 B5 — a cancelled Campaign: every step read only (⋯ / the head: Restore) */
  const isCancelled = c => !!c && R.statusOf(c, U.today()) === R.CANCELLED;

  /* ===================== render — CR-13 §2 (D114): one Campaign page, two modes — a plan not approved: Plan · History (Plan opens at the first step open for
     the one acting) · an approved one: Overview · Plan · Requests · History (opens at Overview) · the old #planning/<id>/details|products|envelope|target|budget|
     forecast|review → /plan/<the new page> (CR-14 §12.2) · the frame (banner · head · tabs) is built once, its parts drawn again ===================== */
  const TABS_LIVE = ['overview', 'plan', 'requests', 'history'], TABS_DRAFT = ['plan', 'history'], CG = C.cpg;
  let stick = { toTop() {} };
  function render(root, id, sub) {
    el = root; const c = campOf(id), plan = planOf(id);
    if (st.id !== id) st = Object.assign(st, { id, hf: 'all', editD: false, ver: null });
    if (!c || !plan) { el.innerHTML = `<div class="pbanner"><div class="crumb"><a href="#planning">${esc(SP.title)}</a></div><h1>${esc(P.notFound)}</h1></div>`; return; }
    const live = plan.approval === 'approved', S = CP.steps;
    let [t0, t1] = String(sub || '').split('/'); if (S.pageOf(t0)) { t1 = t0; t0 = 'plan'; }
    const tabs = live ? TABS_LIVE : TABS_DRAFT;
    st.tab = tabs.includes(t0) ? t0 : live ? 'overview' : 'plan';
    const page = st.tab === 'plan' && !live ? S.pageOf(t1) || (S.current() === id ? S.page() : null) || S.firstPage(plan) : null;
    const want = `#planning/${encodeURIComponent(id)}/${st.tab}${page ? '/' + page : ''}`;
    if (location.hash !== want) history.replaceState(null, '', want);
    if (!el.querySelector('#cp_tabs')) { el.innerHTML = `<div class="pbanner" id="cp_ban"></div><div class="cp-head" id="cp_head"></div><div class="ptabs cptabs" role="tablist" id="cp_tabs"></div><div id="cp_main"></div>`; stick = U.stickyTabs(el, $('cp_tabs')); }
    $('cp_ban').innerHTML = `<div class="crumb"><a href="#planning">${esc(SP.title)}</a><span>›</span>${esc(c.name)}</div><h1>${esc(c.name)}</h1>`;
    $('cp_tabs').innerHTML = tabs.map(t => `<a role="tab" href="#planning/${esc(id)}/${t}" data-cptab="${t}" class="${t === st.tab ? 'on' : ''}" aria-selected="${t === st.tab}">${esc(CG.tabs[t])}</a>`).join('');
    const main = $('cp_main');
    if (page) S.render(main, c, plan, page, el);
    else { S.detach(); ({ overview: renderOverview, plan: renderPlanRO, requests: renderRequests, history: renderHistoryTab })[st.tab](c, plan); }
    $('cp_head').innerHTML = headHTML(c, plan);
    document.title = `${c.name} · ${SP.title} · ${C.app.title}`;
  }
  /* ---------- CR-13 §2.2 — the head: the approval chip (Approved v2) · the state of the campaign (On going · 26 days left · Ended · to close · Closed …) ·
     a request waiting (Period change pending · Close requested) · Owner · the period · the buttons of the one acting (Save draft · Mark step done · Submit:
     the bar at the bottom of a step — CR-14 §9) ---------- */
  const stateNow = (c, plan) => R.campState(c, plan, U.today());
  /* o.by — Closed with who (the chip of Tracking: Closed 30/09/2026 · Ann) · late to close = one red chip: Ended · to close · 5 days late */
  function stateChip(cs, c, o = {}) {
    const X = CG.st;
    if (cs.key === 'cancelled') return statusChip(R.CANCELLED);
    if (cs.key === 'closed') { const by = cs.by ? X.closedBy(R.dmy(cs.at), cs.by) : ''; return `<span class="st closed" title="${esc(by)}">${esc(o.by && by ? by : X.closed(R.dmy(cs.at)))}</span>`; }
    if (cs.key === 'toclose') return `<span class="st toclose${cs.late ? ' late' : ''}" title="${esc(X.endedOn(R.dmy(c.end)))}">${esc(cs.late ? `${X.toclose} · ${X.late(cs.late)}` : X.toclose)}</span>`;
    if (cs.key === 'not_started') return `<span class="st not_started">${esc(X.not_started(cs.n))}</span>`;
    return `<span class="st ongoing">${esc(X.ongoing(cs.n))}</span>`;
  }
  const pendingOf = plan => ((plan && plan.requests) || []).filter(q => q.status === 'pending');
  const kindOf = q => (q.type === 'period' || q.type === 'close' ? q.type : 'budget');
  const changeX = (c, plan, kind) => { const cs = stateNow(c, plan); return { kind, closed: cs.key === 'closed', cancelled: cs.key === 'cancelled' }; };
  function headHTML(c, plan) {
    const a = me(), w = R.working(plan), appr = plan.approval, live = appr === 'approved', ver = live ? R.approvedVersion(plan) : w, cs = live ? stateNow(c, plan) : null;
    const apc = live ? `<span class="st aapproved">${esc(CG.apprV(A.state.approved, ver ? ver.v : 1))}</span>` : U.apChip(appr, { tip: appr === 'returned' && w && w.comment ? w.comment : '' });
    const pend = [...new Set(pendingOf(plan).map(kindOf))].map(k => `<a class="chip warn pchip" href="#planning/${esc(c.id)}/requests">${esc(CG.pending[k])}</a>`).join('');
    const chips = apc + (live ? stateChip(cs, c) : isCancelled(c) ? statusChip(R.CANCELLED) : '') + pend;
    const meta = [plan.owner ? P.owner(plan.owner) : '', `${R.dmy(c.start)} – ${R.dmy(c.end)}${c.end_marketing ? ` (${CG.endMktOf(R.dmy(c.end_marketing))})` : ''}`].filter(Boolean).map(esc).join('<span class="sep">·</span>');
    const b = [], can = x => R.canDo(x, a, plan);
    if (!live) {
      if (appr === 'submitted') { const d = can('approve'); if (d.ok) b.push(`<button type="button" class="btn primary" data-cpact="review">${esc(SP.reviewBtn)}</button>`); else if (d.why) b.push(`<button type="button" class="btn primary" disabled title="${esc(d.why)}">${esc(P.btn.approve)}</button>`); }
      if (can('withdraw').ok) b.push(`<button type="button" class="btn" data-cpact="withdraw">${esc(P.btn.withdraw)}</button>`);
      if (can('duplicate').ok && appr === 'rejected') b.push(`<button type="button" class="btn" data-cpact="duplicate">${esc(P.btn.duplicate)}</button>`);
      if (isCancelled(c) && a && R.canDo('details', a, plan).ok) b.push(`<button type="button" class="btn primary" data-cpact="restore">${esc(C.camps.menu.restore)}</button>`);
    } else {
      /* §3 — Request change ▾ (Budget change · Period change · Close campaign / Close early) while not closed · Campaign Tracking › */
      if (cs.key !== 'closed' && cs.key !== 'cancelled' && ['budget', 'period', 'close'].some(k => R.canDo('change', a, plan, changeX(c, plan, k)).ok))
        b.push(`<button type="button" class="btn primary" data-cpchange aria-haspopup="menu">${esc(CG.change)} ${ICON.chevronDown}</button>`);
      b.push(`<a class="btn ghost" href="#tracking/${esc(c.id)}">${esc(CG.toTracking)}</a>`);
    }
    /* CR-14 §10.1 — Export PDF is in the ⋯ of every Campaign page */
    return `<div class="cp-ttl"><div class="cp-chips">${chips}</div><div class="cp-meta">${meta}</div></div><div class="cp-act">${b.join('')}` +
      `<button type="button" class="icon-btn" data-cpmore aria-haspopup="menu" aria-label="${esc(P.btn.more)}" title="${esc(P.btn.more)}">${ICON.more}</button></div>`;
  }
  /* the menu of Request change (a menu under the button) */
  function changeMenu(btn, id) {
    const c = campOf(id), plan = planOf(id), a = me(); if (!c || !plan) return;
    const old = $('cp_chg'); if (old) { old.remove(); return; }
    const cs = stateNow(c, plan), T = CG.types, items = [['budget', T.budget], ['period', T.period], ['close', cs.key === 'toclose' ? T.close : T.closeEarly]].filter(([k]) => !(k === 'close' && cs.key === 'not_started'))
      .map(([k, l]) => { const d = R.canDo('change', a, plan, changeX(c, plan, k)); return `<button type="button" role="menuitem" data-chg="${k}"${d.ok ? '' : ` disabled title="${esc(d.why || '')}"`}>${esc(l)}</button>`; }).join('');
    const m = document.createElement('div'); m.id = 'cp_chg'; m.className = 'menu-pop'; m.setAttribute('role', 'menu'); m.innerHTML = items; document.body.appendChild(m);
    const r = btn.getBoundingClientRect(); m.style.top = Math.min(innerHeight - m.offsetHeight - 8, r.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.left)) + 'px';
    const f = m.querySelector('button:not([disabled])'); if (f) f.focus();
    m.addEventListener('click', e => { const x = e.target.closest('[data-chg]'); if (!x || x.disabled) return; m.remove(); startChange(x.dataset.chg, id); });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); m.remove(); btn.focus(); } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const bs = [...m.querySelectorAll('button:not([disabled])')], i = bs.indexOf(document.activeElement); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); } });
  }
  document.addEventListener('click', e => { const m = $('cp_chg'); if (m && !e.target.closest('#cp_chg') && !e.target.closest('[data-cpchange]') && !e.target.closest('[data-rqnew]')) m.remove(); }, true);
  const startChange = (kind, id) => (kind === 'budget' ? CP.reqdraw.open(id) : kind === 'period' ? CP.chgdraw.period(id) : CP.chgdraw.close(id));

  /* ---------- CR-13 §2.3 — Overview: Campaign details (Edit — no approval, in the history · the period = the Campaign period of CR-11 + Request period change) |
     Plan in use · CR-14 §8.3 the P&L (one table) + Export PDF · Open items (the requests waiting · Close campaign when ended) · Latest activity ---------- */
  function renderOverview(c, plan) {
    const a = me(), cs = stateNow(c, plan), ver = R.approvedVersion(plan) || R.working(plan), D = (ver && ver.details) || {}, X = CG.d, F = X.f, edit = st.editD && R.canDo('details.approved', a, plan, { closed: cs.key === 'closed' }).ok;
    const canEd = R.canDo('details.approved', a, plan, { closed: cs.key === 'closed' }), canPer = R.canDo('change', a, plan, changeX(c, plan, 'period')).ok;
    const kv = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`, brands = people().filter(p => (p.dept === 'brand' || p.role === 'admin') && p.active !== false);
    const subs = (ver.subs || []).map(R.subName).join(' · '), note = D.note != null ? D.note : D.objective;
    const view = `<dl class="kv ov-kv">${kv(F.name, esc(c.name))}${kv(F.brand, esc(D.brand || '—'))}${kv(F.category, esc(D.category || '—'))}${kv(W.brief.a.note, esc(note || '—'))}` +
      `${kv(F.channels, esc(subs || (D.channels || []).map(k => C.channel[k]).join(' · ') || '—'))}${kv(F.owner, esc(plan.owner || '—'))}</dl>`;
    const form = `<div class="kform ov-form"><div class="frow"><div class="field"><label for="ov_name">${esc(F.name)}</label><input id="ov_name" class="inp" maxlength="80" value="${esc(c.name)}"></div><div class="field"><label for="ov_owner">${esc(F.owner)}</label><select id="ov_owner" class="inp">${brands.map(p => `<option${p.name === plan.owner ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div></div>` +
      `<div class="frow"><div class="field"><label for="ov_brand">${esc(F.brand)}</label><input id="ov_brand" class="inp" value="${esc(D.brand || '')}"></div><div class="field"><label>${esc(F.category)}</label><div class="muted ov-ro">${esc(D.category || '—')}</div></div></div>` +
      `<div class="field"><label for="ov_obj">${esc(W.brief.a.note)}</label><textarea id="ov_obj" class="inp" rows="2" maxlength="600">${esc(note || '')}</textarea></div>` +
      `<div class="ferr" id="ov_e"></div><div class="ov-btns"><button type="button" class="btn" data-ovcancel>${esc(X.cancel)}</button><button type="button" class="btn primary" data-ovsave>${esc(X.save)}</button></div></div>`;
    const per = `<div class="ov-per"><div class="ov-pl">${esc(X.period)}</div><div class="cperiod ov-period" id="ov_period">${U.periodHTML(c, { today: U.today(), chips: '' })}</div>` +
      `<div class="muted small ov-dates">${esc(X.dates(R.dmy(c.start), c.end_marketing ? R.dmy(c.end_marketing) : '', R.dmy(c.end)))}${canPer ? ` · <button type="button" class="link" data-chgopen="period">${esc(X.reqPeriod)}</button>` : ''}</div></div>`;
    const det = `<div class="card ov-det"><div class="card-head"><h3>${esc(X.title)}</h3><div class="ctl">${cs.key === 'closed' ? `<span class="muted small">${esc(X.readOnly)}</span>` : canEd.ok && !edit ? `<button type="button" class="btn small" data-ovedit>${esc(X.edit)}</button>` : ''}</div></div>${edit ? form : view}${per}</div>`;
    /* Plan in use: v · approved · Target · Budget now (original + approved changes) · Plan profit · A&P · Ach · Used · Campaign Tracking › · Open plan › */
    const T = R.planTotals(ver), U2 = CG.use, t = R.budgetTrack(U.seed(), { from: '2000-01-01', to: '2099-12-31', statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: U.today() }).rows[0] || null;
    const cur = t ? t.current : T.budget, chg = Math.abs(cur - T.budget) > 0.5;
    const sp = R.campaignPace(U.seed(), c.id, U.today()), row = (l, v, sub) => `<div class="ov-r"><span>${esc(l)}</span><b>${esc(v)}</b>${sub ? `<div class="muted small">${esc(sub)}</div>` : ''}</div>`;
    const use = `<div class="card ov-use"><div class="card-head"><h3>${esc(U2.title)}</h3></div><div class="muted small">${esc(U2.approved(ver.v, R.dmy(String(ver.decided_at || '').slice(0, 10)), ver.decided_by || '—'))}</div>` +
      row(U2.target, R.baht(T.target)) + row(U2.budget, R.baht(cur), t ? U2.budgetSub(R.shortBaht(t.original), R.signedShort(t.changes)) : '') +
      row(U2.profit, R.baht(T.gp - cur), chg ? U2.planWas(R.baht(T.profit)) : '') + row(U2.ap, R.pct(R.ratio(cur, T.target), 1), chg ? U2.planWas(R.pct(T.ap, 1)) : '') +
      `<div class="ov-line">${esc(U2.line(R.pct(sp && sp.ach), R.pct(t && t.used)))} · <a class="link" href="#tracking/${esc(c.id)}">${esc(CG.toTracking)}</a></div><a class="link" href="#planning/${esc(c.id)}/plan" data-cptab="plan">${esc(U2.open)}</a></div>`;
    const pl = `<div class="card ov-pl"><div class="card-head"><h3>${esc(W.pl.title)} <span class="hnote">${esc(P.v(ver.v))}</span></h3><div class="ctl"><button type="button" class="btn small" data-cppdf>${ICON.download}<span>${esc(W.pdf.btn)}</span></button></div></div>${CP.steps.plTable(ver)}</div>`;
    /* Open items: the requests waiting (pending · returned) · Close campaign when it ended and is not closed */
    const I = CG.items, open = ((plan.requests) || []).filter(q => q.status === 'pending' || q.status === 'returned');
    const card = q => `<div class="oitem"><span class="apt ${esc(q.type)}">${esc(CG.rq.kind[q.type] || q.type)} #${q.no}</span><span class="oi-s">${esc(reqSummary(q))}</span>${U.apChip(q.status)}<span class="muted small">${esc(`${q.by || '—'} · ${R.dmy(String(q.at || '').slice(0, 10))}`)}</span><button type="button" class="btn small" data-rqopen="${q.no}">${esc(I.open)}</button></div>`;
    const canClose = R.canDo('change', a, plan, changeX(c, plan, 'close')).ok;
    const closeItem = cs.key === 'toclose' ? `<div class="oitem ${cs.late ? 'late' : ''}"><span class="apt close">${esc(I.close)}</span><span class="oi-s">${esc(I.closeSub(R.dmy(cs.due), cs.late ? CG.st.late(cs.late) : ''))}</span>${canClose ? `<button type="button" class="btn small primary" data-chgopen="close">${esc(I.closeBtn)}</button>` : ''}</div>` : '';
    const items = closeItem + open.map(card).join('');
    const L = CG.latest, last = `<div class="card ov-last"><div class="card-head"><h3>${esc(L.title)}</h3><div class="ctl"><a class="link" href="#planning/${esc(c.id)}/history" data-cptab="history">${esc(L.all)}</a></div></div>${U.historyHTML(plan, { limit: 5, chips: false })}</div>`;
    $('cp_main').innerHTML = `<div class="r21 ov1">${det}${use}</div><div class="card ov-items"><div class="card-head"><h3>${esc(I.title)} <span class="hnote">${(closeItem ? 1 : 0) + open.length}</span></h3></div>${items || `<div class="na-none small"><span class="okm">✓</span> ${esc(I.none)}</div>`}</div>${pl}${last}`;
    U.periodFit($('ov_period'));
  }
  /* the words of a request in a list (Summary): +฿500,000 · ADS · Nov · End 30/11 → 31/12/2026 · Close · unused ฿0 */
  function reqSummary(q) {
    if (q.type === 'period' || q.type === 'close') return R.reqWords(q);
    const t = R.sumLines(q.lines), l0 = (q.lines || [])[0];
    if (R.requestType(q.lines) === 'reallocation') { const from = (q.lines || []).find(l => +l.amount < 0), to = (q.lines || []).find(l => +l.amount > 0);
      return `${reqAmount(q)}${from && to ? ` · ${from.line} → ${to.line}` : ''}`; }
    return `${R.signedShort(t)}${l0 ? ` · ${l0.line} · ${R.monthShort(l0.month)}` : ''}${(q.lines || []).length > 1 ? ` +${q.lines.length - 1}` : ''}`;
  }
  /* QA-v0.13 B21 — the amount of a budget request: +฿600K · −฿200K · a reallocation = Move ฿250K (what it moves, not ฿0) */
  function reqAmount(q) { const t = R.sumLines(q.lines); return R.requestType(q.lines) === 'reallocation' ? C.req.move(R.shortBaht(R.movedOf(q.lines))) : R.signedShort(t); }
  /* ---------- §2.5 — Requests: every request of the Campaign · a row opens it (the review drawer) · New request ▾ ---------- */
  function renderRequests(c, plan) {
    const Q = CG.rq, K2 = Q.cols, a = me(), cs = stateNow(c, plan), list = ((plan.requests) || []).slice().sort((x, y) => y.no - x.no), d = s => (s ? R.dmy(String(s).slice(0, 10)) : '—');
    const can = cs.key !== 'closed' && cs.key !== 'cancelled' && ['budget', 'period', 'close'].some(k => R.canDo('change', a, plan, changeX(c, plan, k)).ok);
    $('cp_main').innerHTML = `<div class="card"><div class="card-head"><h3>${esc(Q.title)} <span class="hnote">${list.length}</span></h3><div class="ctl">${can ? `<button type="button" class="btn small primary" data-rqnew aria-haspopup="menu">${esc(Q.new)} ${ICON.chevronDown}</button>` : ''}</div></div>` +
      (list.length ? `<div class="tablewrap"><table class="tbl port rqtbl"><thead><tr><th>${esc(K2.no)}</th><th>${esc(K2.type)}</th><th>${esc(K2.summary)}</th><th>${esc(K2.by)}</th><th>${esc(K2.sent)}</th><th>${esc(K2.status)}</th><th>${esc(K2.decided)}</th></tr></thead><tbody>` +
        list.map(q => `<tr class="click" tabindex="0" data-rqopen="${q.no}"><td>#${q.no}</td><td><span class="apt ${esc(q.type)}">${esc(Q.kind[q.type] || q.type)}</span></td><td class="wrap">${esc(reqSummary(q))}</td><td>${esc(q.by || '—')}</td><td class="nowrap">${esc(d(q.at))}</td><td>${U.apChip(q.status)}</td><td class="nowrap">${esc(q.decided_at ? `${d(q.decided_at)} · ${q.decided_by || ''}` : '—')}</td></tr>`).join('') + '</tbody></table></div>'
        : `<div class="c3-empty">${esc(Q.none)}</div>`) + '</div>';
  }
  /* ---------- §6 — History (the helper of Tracking › History) ---------- */
  function renderHistoryTab(c, plan) {
    $('cp_main').innerHTML = `<div class="card"><div class="card-head"><h3>${esc(CG.tabs.history)}</h3></div><div id="cp_hist">${U.historyHTML(plan, { filter: st.hf })}</div></div>`;
  }
  function openCompare(id, a, b) {
    const c = campOf(id), plan = planOf(id), va = plan && plan.versions.find(v => v.v === a), vb = plan && plan.versions.find(v => v.v === b); if (!va || !vb) return;
    U.openDialog(`<div class="dlg-h">${esc(C.mon.hist2.compareTitle(c.name, a, b))}</div><div class="dlg-b">${diffHTML(R.planDiff(va, vb), a, b)}</div><div class="dlg-f"><button type="button" class="btn" data-dlgclose>${esc(C.mon.hist2.close)}</button></div>`, true);
    const d = $('dlg'), cl = d.querySelector('[data-dlgclose]'); if (cl) cl.addEventListener('click', () => U.closeDialog());
  }
  /* ---------- §2.5 — Plan of an approved Campaign: the version in use, read only (no stepper) · v1 (in use) ▾ · Compare · CR-14: the P&L of §8.3 · the
     products (sub-channel prices) · the budget (Original · Approved changes · Current · Spent · Remaining a line) · the summaries (no GP % — D137) ---------- */
  function renderPlanRO(c, plan) {
    const vs = (plan.versions || []).filter(v => v.status === 'approved' || v.status === 'returned' || v.status === 'submitted'), inUse = R.approvedVersion(plan) || R.working(plan), Pp = CG.plan, S2 = Pp.sections;
    const ver = vs.find(v => v.v === st.ver) || inUse, G = P.grid, T = R.planTotals(ver), subs = ver.subs || [];
    const pick = `<label class="ms"><select class="ms-trigger sel" data-cpver aria-label="${esc(Pp.compare)}">${vs.map(v => `<option value="${v.v}"${v.v === ver.v ? ' selected' : ''}>${esc(v.v === inUse.v ? Pp.inUse(v.v) : `${Pp.ver(v.v)} · ${A.state[v.status] || v.status}`)}</option>`).join('')}</select></label>` +
      (vs.length > 1 && ver.v !== inUse.v ? `<button type="button" class="btn small" data-cmp="${Math.min(ver.v, inUse.v)}|${Math.max(ver.v, inUse.v)}">${esc(Pp.compare)}</button>` : vs.length > 1 ? `<button type="button" class="btn small" data-cmp="${vs[vs.length - 2].v}|${inUse.v}">${esc(Pp.compare)}</button>` : '') +
      `<button type="button" class="btn small" data-cpxlsx>${ICON.download}<span>${esc(W.xl.btn)}</span></button><button type="button" class="btn small" data-cppdf>${ICON.download}<span>${esc(W.pdf.btn)}</span></button>`;
    const pr = (s, sb) => { const v = R.priceOf(s, R.subCh(sb), sb); return v == null ? '—' : R.fmtNum(v, 2); };
    const prod = `<div class="tablewrap"><table class="tbl simple prodtbl"><thead><tr><th>${esc(G.code)}</th><th>${esc(G.product)}</th><th>${esc(SP.p.role)}</th><th class="num">${esc(G.cogs)}</th>` +
      (subs.length ? subs.map(sb => `<th class="num">${esc(R.subName(sb))}</th>`).join('') : R.CHANNELS.map(k => `<th class="num">${esc(G.price(k))}</th>`).join('')) + '</tr></thead><tbody>' +
      (ver.skus || []).map(s => `<tr><td><b>${esc(s.code)}</b>${s.temp || /^TMP-/i.test(s.code) ? ` <span class="chip warn">${esc(W.brief.b.tempTag)}</span>` : ''}</td><td>${esc(s.nickname || s.name || '')}</td><td>${esc(SP.p.roles[s.role || 'core'])}</td><td class="num">${esc(s.cogs == null ? C.common.none : R.fmtNum(+s.cogs, 2))}</td>` +
        (subs.length ? subs.map(sb => `<td class="num">${esc(pr(s, sb))}</td>`).join('') : R.CHANNELS.map(k => `<td class="num">${esc(s.price && s.price[k] !== '' && s.price[k] != null ? R.fmtNum(+s.price[k], 2) : SP.p.notSold)}</td>`).join('')) + '</tr>').join('') + '</tbody></table></div>';
    const t = ver.v === inUse.v && plan.approval === 'approved' ? R.budgetTrack(U.seed(), { from: '2000-01-01', to: '2099-12-31', statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: U.today() }).rows[0] : null, TK = G.tracked;
    const bud = t ? `<div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(G.lineCorner)}</th><th class="num">${esc(TK.orig)}</th><th class="num">${esc(TK.changes)}</th><th class="num">${esc(TK.cur)}</th><th class="num">${esc(TK.com)}</th><th class="num">${esc(TK.rem)}</th></tr></thead><tbody>` +
      t.lines.map(l => `<tr><td><span class="muted small">${esc(G.groups[l.type] || l.type)}</span> ${esc(l.line)}</td><td class="num">${esc(R.baht(l.original))}</td><td class="num">${l.changes ? esc(R.signedShort(l.changes)) : ''}</td><td class="num"><b>${esc(R.baht(l.current))}</b></td><td class="num">${esc(R.baht(l.committed))}</td><td class="num${l.current - l.committed < -0.5 ? ' neg' : ''}">${esc(R.baht(l.current - l.committed))}</td></tr>`).join('') +
      `<tr class="total"><td>${esc(C.common.total)}</td><td class="num">${esc(R.baht(t.original))}</td><td class="num">${esc(R.signedShort(t.changes))}</td><td class="num">${esc(R.baht(t.current))}</td><td class="num">${esc(R.baht(t.committed))}</td><td class="num">${esc(R.baht(t.current - t.committed))}</td></tr></tbody></table></div>`
      : CP.steps.expHTML(ver);
    $('cp_main').innerHTML = `<div class="toolbar cpro-tools">${pick}</div><div class="card"><div class="card-head"><h3>${esc(W.pl.title)} <span class="hnote">${esc(P.v(ver.v))}</span></h3></div>${CP.steps.plTable(ver)}</div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S2.products)}</h3></div>${prod}</div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S2.budget)}</h3></div>${bud}</div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S2.summary)}</h3></div>${CP.steps.sumHTML(ver, c, 'ro')}</div>`;
    CP.steps.drawSummary(ver, c, 'ro'); void T;
  }
  /* the budget of an approved Campaign by line (whole Campaign) + the bar — Campaign Monitor shows it too */
  function budgetTrackHTML(c) {
    const s = U.seed(), span = R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end), td = U.today();
    const bt = R.budgetTrack(s, { from: R.monthFirst(span[0]), to: R.monthLast(span[span.length - 1]), statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: td }), t = bt.rows[0], K = C.track;
    if (!t) return '';
    return `<div class="card"><div class="card-head"><h3>${labelInfo(K.block.title, K.block.tip)}</h3></div><div class="bblk"><div class="bbv"><b>${esc(R.baht(t.committed))}</b> <span class="muted">${esc(K.of(R.baht(t.current)))}</span></div>${U.budgetBar(t)}<div class="muted small">${esc(U.budgetCap(t))}</div></div></div>`;
  }
  /* v a ↔ v b: totals · SKUs · lines (the review) — QA-v0.13 B17: the Δ of a % in points (A&P down = good) · no GP % (CR-14 D137) */
  const apD = (x, y) => { if (x == null || y == null) return ''; const z = (y - x) * 100; return Math.abs(z) < 0.05 ? '<span class="muted">—</span>' : `<span class="${z < 0 ? 'good' : 'bad'}">${esc(P.history.pts(z))}</span>`; };
  function diffHTML(d, a, b) {
    const H = P.history, T = d.totals, dv = (x, y, f) => { const z = y - x; return `<span class="${Math.abs(z) < 0.5 ? 'muted' : z > 0 ? 'good' : 'bad'}">${Math.abs(z) < 0.5 ? '—' : (z > 0 ? '+' : '') + f(z)}</span>`; };
    const tot = `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.totals)}</th><th class="num">v${a}</th><th class="num">v${b}</th><th class="num">${esc(H.diff)}</th></tr></thead><tbody>` +
      [[P.sum.target, T.target, R.baht], [P.sum.budget, T.budget, R.baht], [P.sum.profit, T.profit, R.baht]].map(([l, v, f]) => `<tr><td>${esc(l)}</td><td class="num">${esc(f(v[0]))}</td><td class="num">${esc(f(v[1]))}</td><td class="num">${dv(v[0], v[1], f)}</td></tr>`).join('') +
      `<tr><td>${esc(P.sum.ap)}</td><td class="num">${esc(R.pct(T.ap[0], 1))}</td><td class="num">${esc(R.pct(T.ap[1], 1))}</td><td class="num">${apD(T.ap[0], T.ap[1])}</td></tr></tbody></table>`;
    const sk = d.skus.length ? `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.sku)}</th><th class="num">${esc(H.qty)} v${a}</th><th class="num">${esc(H.qty)} v${b}</th><th class="num">฿ ${esc(H.diff)}</th></tr></thead><tbody>${d.skus.map(r => `<tr><td>${esc(r.name)} <span class="muted small">${esc(r.code)}</span></td><td class="num">${esc(R.fmtNum(r.qtyA))}</td><td class="num">${esc(R.fmtNum(r.qtyB))}</td><td class="num">${dv(r.amtA, r.amtB, R.baht)}</td></tr>`).join('')}</tbody></table>` : '';
    const ln = d.lines.length ? `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.line)}</th><th class="num">v${a}</th><th class="num">v${b}</th><th class="num">${esc(H.diff)}</th></tr></thead><tbody>${d.lines.map(r => `<tr><td>${esc(r.line)}</td><td class="num">${esc(R.baht(r.a))}</td><td class="num">${esc(R.baht(r.b))}</td><td class="num">${dv(r.a, r.b, R.baht)}</td></tr>`).join('')}</tbody></table>` : '';
    return `<div class="diffw">${tot}${sk}${ln}${!sk && !ln ? `<div class="muted small">${esc(H.same)}</div>` : ''}</div>`;
  }
  const legendHTML = () => `<div class="legend bbleg"><span><i class="sw com"></i>${esc(C.track.legend.com)}</span><span><i class="sw rem"></i>${esc(C.track.legend.rem)}</span><span><i class="sw pend"></i>${esc(C.track.legend.pend)}</span><span><i class="sw tick"></i>${esc(C.track.legend.tick)}</span></div>`;

  /* ===================== actions (the head · Overview · the read only Plan — the steps act in CP.steps) ===================== */
  async function save(id, step, okMsg, o) {
    try { const p = await CP.store.savePlan(id, step, o || {}); if (okMsg) U.toast(okMsg); return p; }
    catch (e) { U.toast(e.code === 'conflict' ? A.toast.conflict : A.toast.failed); if (e.code === 'conflict') { CP.steps.reset(); CP.app.refresh(); } return null; }
  }
  /* the details of an approved Campaign: name · owner · brand · the campaign details (CR-14: no channels / category to type — D128) */
  async function saveDetails(c, plan) {
    const a = me(), name = ($('ov_name') || {}).value.trim(), e = $('ov_e'), ver = R.approvedVersion(plan) || R.working(plan), D = ver.details || {};
    const det = { brand: $('ov_brand').value.trim(), note: $('ov_obj').value.trim() };
    if (!name) { if (e) e.textContent = C.camps.v.nameReq; return; }
    const row = CP.store.data().list.rows.find(r => r.id === c.id);
    if (row && name !== row.campaign) { try { await CP.store.saveList({ action: 'edit', id: c.id, values: { campaign: name, start: row.start, end: row.end, end_marketing: row.end_marketing, status: 'auto' } }, { today: U.today() }); } catch (x) { if (e) e.textContent = (x.errors && x.errors.name) || A.toast.failed; return; } }
    const changed = Object.keys(det).filter(k => JSON.stringify(det[k]) !== JSON.stringify(k === 'note' ? (D.note != null ? D.note : D.objective || '') : D[k]));
    const owner = $('ov_owner').value, p = await save(c.id, x => R.planAct(x, { type: 'details', details: Object.fromEntries(changed.map(k => [k, det[k]])), owner, name, oldName: c.name, by: a.name, at: at() }), CG.d.saved(name), { rev: plan.rev || 0 });
    if (p) { st.editD = false; CP.steps.reset(); CP.app.refresh(); }
  }
  async function onClick(e) {
    const t = e.target, c = campOf(st.id); if (!c) return;
    const pg = t.closest('[data-cppage]'); if (pg) { e.preventDefault(); const to = `#planning/${st.id}/plan/${pg.dataset.cppage}`; if (location.hash !== to) location.hash = to; return; }
    const plan = planOf(st.id), a = me(), ac = t.closest('[data-cpact]');
    /* CR-13 — the tabs · Request change ▾ · the details of Overview · a request · the history */
    if (t.closest('[data-cptab]')) { stick.toTop(); st.editD = false; return; }
    const cg = t.closest('[data-cpchange], [data-rqnew]'); if (cg) return changeMenu(cg, st.id);
    const co = t.closest('[data-chgopen]'); if (co) return startChange(co.dataset.chgopen, st.id);
    if (t.closest('[data-ovedit]')) { st.editD = true; renderOverview(c, plan); const n = $('ov_name'); if (n) n.focus(); return; }
    if (t.closest('[data-ovcancel]')) { st.editD = false; renderOverview(c, plan); return; }
    if (t.closest('[data-ovsave]')) return saveDetails(c, plan);
    const ro2 = t.closest('[data-rqopen], [data-openreq]'); if (ro2) return CP.review.open({ kind: 'request', id: st.id, no: +(ro2.dataset.rqopen || ro2.dataset.openreq) });
    const hf = t.closest('[data-hfilter]'); if (hf) { st.hf = hf.dataset.hfilter; const b2 = $('cp_hist'); if (b2) b2.innerHTML = U.historyHTML(plan, { filter: st.hf }); return; }
    const cm = t.closest('[data-cmp]'); if (cm) { const [x1, x2] = cm.dataset.cmp.split('|').map(Number); return openCompare(st.id, x1, x2); }
    if (t.closest('[data-cppdf]')) { CP.steps.pdf(plan, c); return; }
    if (t.closest('[data-cpxlsx]')) { CP.steps.xlsx(plan, c, { ver: (plan.versions || []).find(v => v.v === st.ver) }); return; }
    if (ac) {
      const w = ac.dataset.cpact;
      if (w === 'review') return CP.review.open({ kind: 'plan', id: st.id });
      if (w === 'withdraw') { if (CP.steps.isDirty()) CP.steps.reset(); const p = await save(st.id, x => R.planAct(x, { type: 'withdraw', by: a.name, at: at() }), A.toast.withdrawn(c.name), { rev: plan.rev || 0 }); if (p) { CP.steps.reset(); CP.app.refresh(); } return; }
      if (w === 'request') return CP.reqdraw.open(st.id);
      if (w === 'duplicate') return CP.screens.planning.duplicate(st.id);
      if (w === 'restore') { await CP.screens.planning.run({ action: 'restore', id: st.id, values: {} }, c.name); CP.steps.reset(); CP.app.refresh(); return; }
    }
    if (t.closest('[data-cpmore]')) return CP.screens.planning.menuFor(t.closest('[data-cpmore]'), st.id, true);
  }
  function onInput(e) { const t = e.target; if (t.matches('[data-cpver]')) { st.ver = +t.value; renderPlanRO(campOf(st.id), planOf(st.id)); } }
  document.addEventListener('click', e => { if (el && el.contains(e.target) && el.offsetParent) onClick(e); });
  document.addEventListener('change', e => { if (el && el.contains(e.target) && el.offsetParent) onInput(e); });
  /* ---------- leaving with changes (the hash changes): the steps keep the draft ---------- */
  return { render, isDirty: () => CP.steps.isDirty(), confirmLeave: () => CP.steps.confirmLeave(), current: () => st.id, reset: () => CP.steps.reset(), diffHTML, legendHTML, budgetTrackHTML,
    draft: () => CP.steps.draft(), PAGES: CP.steps.PAGES, summaryHTML: (v, c, k, o) => CP.steps.sumHTML(v, c, k, o), drawSummary: (v, c, k) => CP.steps.drawSummary(v, c, k), openCompare,
    stateChip: (c, plan, o) => stateChip(R.campState(c, plan, U.today()), c, o), reqSummary, reqAmount, changeMenu };
})();

/* ===================== §6 — the review (KOL: one big container · What changed · Campaign · Plan / Request · Checks · History · Decision at the end) ===================== */
CP.review = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON } = U, A = C.appr, P = C.plan;
  let cur = null;   // { kind, id, no, list (the queue it steps through) }
  const me = () => CP.actor.get();
  /* the queue: what this person may decide now, oldest first */
  const queue = () => R.waitingFor(R.approvalItems(U.seed(), U.today()), me()).filter(x => x.status === 'pending').sort((a, b) => String(a.at).localeCompare(String(b.at))).map(x => ({ kind: x.kind, id: x.c.id, no: x.req ? x.req.no : null }));
  function open(item) { cur = Object.assign({}, item, { list: queue() }); draw(); }
  function itemNow() {
    const s = U.seed(), c = (s.allCampaigns || s.campaigns || []).find(x => x.id === cur.id), plan = CP.store.data().plans[cur.id] || null;
    if (!c || !plan) return null;
    if (cur.kind === 'plan') { const v = R.working(plan); return { c, plan, v, status: plan.approval === 'submitted' ? 'pending' : plan.approval, by: v.submitted_by || plan.owner, at: v.submitted_at, title: A.kind.plan }; }
    const q = plan.requests.find(x => x.no === cur.no); return q ? { c, plan, req: q, status: q.status, by: q.by, at: q.at, title: A.kind[q.type] || q.type } : null;
  }
  function draw() {
    const it = itemNow(); if (!it) { U.closeModal(); return; }
    const a = me(), dec = it.req ? R.canDo('request.decide', a, it.plan, { req: it.req }) : R.canDo('approve', a, it.plan), wd = it.req ? R.canDo('request.withdraw', a, it.plan, { req: it.req }) : R.canDo('withdraw', a, it.plan);
    const i = cur.list.findIndex(x => x.kind === cur.kind && x.id === cur.id && x.no === cur.no), age = it.at && it.status === 'pending' ? R.dayDiff(U.today(), String(it.at).slice(0, 10)) : null;
    const nav = cur.list.length > 1 && i >= 0 ? `<span class="rv-nav"><button type="button" class="icon-btn" data-rvstep="-1" aria-label="${esc(A.rv.prev)}" title="${esc(A.rv.prev)}">${ICON.prev}</button><span class="muted small">${esc(A.rv.of(i + 1, cur.list.length))}</span><button type="button" class="icon-btn" data-rvstep="1" aria-label="${esc(A.rv.next)}" title="${esc(A.rv.next)}">${ICON.next}</button></span>` : '';
    const sec = (h, body, id) => `<section class="rv-sec"${id ? ` id="${id}"` : ''}><h4>${esc(h)}</h4>${body}</section>`, out = [];
    if (it.v && it.v.v > 1) { const prev = it.plan.versions.find(v => v.v === it.v.v - 1); if (prev) out.push(sec(A.rv.changed(prev.v), (prev.comment ? `<div class="rv-note">${esc(A.rv.returnedIn(prev.v, prev.comment))}</div>` : '') + CP.cpage.diffHTML(R.planDiff(prev, it.v), prev.v, it.v.v))); }
    const c = it.c;
    out.push(sec(A.rv.campaign, `<dl class="kv"><dt>${esc(C.camps.cols.period)}</dt><dd>${esc(`${R.dmy(c.start)} – ${R.dmy(c.end)}`)}${c.end_marketing ? esc(` · ${C.camp.endMkt(R.dmy(c.end_marketing))}`) : ''}</dd><dt>${esc(C.camps.cols.owner)}</dt><dd>${esc(c.owner || it.plan.owner || '—')}</dd></dl>`));
    if (it.v) {
      /* CR-14 §8.5 — the same parts as 4 Summary & submit: the P&L (one table) + Export PDF · the checklist short (All steps done ✓ · ⚠ 2 — open it) ·
         the Finance review · the note to the Executive · the summaries · the expenses */
      const S = CP.steps, X = C.s14, cl = S.checklist(it.plan, c, { withPlan: true }), fcm = (it.v.forecast || {}).comment, rnote = (it.v.review || {}).comment;
      out.push(sec(A.rv.plan, S.plTable(it.v) + `<div class="ov-btns"><button type="button" class="btn small" data-rvpdf>${ICON.download}<span>${esc(X.pdf.btn)}</span></button></div>`));
      out.push(sec(X.sum.readyT, `<details class="rvck"><summary data-rvck>${esc(X.sum.short(cl.errN, cl.warnN))}</summary>${S.checklistHTML(cl, { links: false })}</details>` +
        `<div class="rv-note"><b>${esc(X.sum.finL)}:</b> ${esc(fcm || '—')}</div>` + (rnote ? `<div class="rv-note"><b>${esc(X.sum.noteL)}:</b> ${esc(rnote)}</div>` : '')));
      out.push(sec(X.sum.sumT, S.sumHTML(it.v, c, 'rv')), sec(X.sum.expT, S.expHTML(it.v)));
      /* CR-06 §7.3 — the plan's COGS / net price against the Product Master (only the SKUs that differ) */
      const dr = R.planCogsDrift(it.v, CP.store.data().products, { prices: true }), G = P.grid;
      if (dr.length) out.push(sec(A.rv.master, `<div class="tablewrap"><table class="tbl simple mdtbl"><thead><tr><th>${esc(P.history.sku)}</th><th class="num">${esc(G.mcols.cogsPlan)}</th><th class="num">${esc(G.mcols.cogsMaster)}</th>${R.CHANNELS.map(k => `<th class="num">${esc(G.mcols.price(k))}</th>`).join('')}</tr></thead><tbody>` +
        dr.map(d => `<tr><td>${esc(d.nickname || d.name)} <span class="muted small">${esc(d.code)}</span></td><td class="num">${esc(R.fmtNum(d.cogs, 2))}</td><td class="num${d.cogsDiff ? ' warnx' : ''}">${esc(R.fmtNum(d.master.cogs, 2))}</td>` +
          R.CHANNELS.map(k => { const x = d.prices[k]; return `<td class="num">${x ? `${esc(R.fmtNum(x.plan, 2))} <span class="muted small">${esc(G.mcols.vs(R.fmtNum(x.master, 2), R.pct(x.off, 0)))}</span>` : ''}</td>`; }).join('') + '</tr>').join('') +
        `</tbody></table></div><div class="muted small">${esc(A.rv.masterNote)}</div>`));
    } else if (it.req.type === 'period' || it.req.type === 'close') {
      /* CR-13 §4.2 · §5.3 — a period change: from → to + the Impact (and the warning when only the time makes it better) · a close request: the note · the checks */
      const q = it.req, W = C.cpg, Q = C.req, kv = (k, v) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
      if (q.type === 'period') { const a0 = q.period.from, b0 = q.period.to, d = x => (x ? R.dmy(x) : '—');
        out.push(sec(W.rv.period, `<div class="rv-reason"><b>${esc(Q.reason)}:</b> ${esc(q.reason)}</div><table class="tbl simple pctbl"><thead><tr><th></th><th class="num">${esc(W.rv.from)}</th><th class="num">${esc(W.rv.to)}</th></tr></thead><tbody>` +
          [['start', W.per.start], ['end_marketing', W.per.endMkt], ['end', W.per.end]].map(([k, l]) => `<tr class="${(a0[k] || '') !== (b0[k] || '') ? 'chg' : ''}"><td>${esc(l)}</td><td class="num">${esc(d(a0[k]))}</td><td class="num"><b>${esc(d(b0[k]))}</b></td></tr>`).join('') + '</tbody></table>' +
          (q.status === 'pending' ? `<div class="rv-imp">${CP.chgdraw.impactHTML(R.periodImpact(U.seed(), c.id, b0, U.today()))}</div>` : '')));
      } else { const k = Object.assign({}, R.closeChecks(U.seed(), c.id, it.plan, U.today()) || {}, (q.close && q.close.checks) || {}), li = t => `<li class="info"><span class="ci">·</span>${esc(t)}</li>`;
        out.push(sec(W.rv.close, `<div class="rv-reason"><b>${esc(W.rv.note)}:</b> ${esc(q.close ? q.close.note : q.reason)}</div><ul class="checks2">` +
          (q.close && q.close.early ? li(`${W.cl.date} ${R.dmy(q.close.close_date)}`) : '') + (k.spent != null ? li(W.cl.spent(R.baht(k.spent), R.baht(k.current), R.pct(k.used))) : '') +
          (k.rev != null ? li(W.cl.rev(R.baht(k.rev), R.pct(k.ach))) : '') + (k.profit != null ? li(W.cl.profit(R.baht(k.profit), R.baht(k.planProfit))) : '') + li(W.cl.unused(R.baht(k.unused))) + '</ul>')); }
    } else {
      const q = it.req, im = R.requestImpact(U.seed(), c.id, q.lines), Q = C.req;
      out.push(sec(A.rv.request, `<div class="rv-reason"><b>${esc(Q.reason)}:</b> ${esc(q.reason)}</div><div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(Q.line)}</th><th>${esc(Q.month)}</th><th class="num">${esc(Q.amount)}</th><th class="num">${esc(Q.com)}</th><th class="num">${esc(Q.rem)}</th></tr></thead><tbody>` +
        im.rows.map(r => `<tr class="${r.err ? 'errrow' : ''}"><td>${esc(r.line)}</td><td>${esc(R.monthName(r.month))}</td><td class="num"><b class="${r.amount < 0 ? 'neg' : ''}">${esc(R.signedShort(+r.amount))}</b></td><td class="num">${esc(R.baht(r.com))}</td><td class="num">${esc(`${R.shortBaht(r.before)} → ${R.shortBaht(r.after)}`)}</td></tr>`).join('') + '</tbody></table></div>' +
        `<dl class="kv"><dt>${esc(Q.current)}</dt><dd>${esc(`${R.baht(im.before)} → ${R.baht(im.after)}`)}</dd><dt>${esc(Q.ap)}</dt><dd>${esc(`${R.pct(im.ap[0], 1)} → ${R.pct(im.ap[1], 1)}`)}</dd><dt>${esc(Q.profit)}</dt><dd>${esc(`${R.baht(im.profit[0])} → ${R.baht(im.profit[1])}`)}</dd></dl>`));
    }
    const log = (it.plan.log || []).filter(x => (it.req ? String(x.detail).startsWith(`#${it.req.no}`) || x.action === 'request' && String(x.detail).startsWith(`#${it.req.no}`) : !String(x.action).startsWith('request'))).slice().reverse();
    out.push(sec(A.rv.history, `<ul class="hist">${log.map(x => `<li><span class="hw">${esc(A.log[x.action] || x.action)}</span><span class="muted"> · ${esc(x.by || '—')} · ${esc(R.dmy(String(x.at).slice(0, 10)))}</span>${x.detail ? `<div class="hd">${esc(x.detail)}</div>` : ''}</li>`).join('')}</ul>`));
    const pending = it.status === 'pending';
    out.push(sec(A.rv.decision, pending && dec.ok ? `<div class="field"><label for="rv_c">${esc(A.rv.comment)}</label><textarea id="rv_c" class="inp" rows="3" maxlength="500"></textarea><div class="help">${esc(A.rv.hint)}</div><div class="ferr" id="rv_e"></div></div>` +
      /* CR-07 §7 (D70) — a plan: Revise = the steps to do again (≥ 1) + a comment · a request: Return */
      (it.req ? '' : `<fieldset class="rvsteps"><legend>${esc(A.rv.reviseSteps)}</legend><div class="chkrow">${['brief', 'target', 'exp_mkt', 'exp_sls', 'exp_oth'].map(k => `<label class="chk"><input type="checkbox" data-rvk="${k}"><span>${esc(`${R.STEP_NUM[k]} ${C.step.names[k]}`)} <span class="muted small">${esc(it.plan.steps && it.plan.steps[k] ? it.plan.steps[k].assignee || '' : '')}</span></span></label>`).join('')}</div></fieldset>`) +
      `<div class="rv-btns"><button type="button" class="btn danger" data-rvdo="reject">${esc(A.rv.reject)}</button><button type="button" class="btn" data-rvdo="${it.req ? 'return' : 'revise'}">${esc(it.req ? A.rv.ret : A.rv.revise)}</button><button type="button" class="btn primary" data-rvdo="approve" disabled>${esc(A.rv.approve)}</button></div>`
      : `<div class="muted">${esc(pending ? dec.why || A.rv.readOnly : A.decided(A.state[it.status] || it.status, it.req ? it.req.decided_by || '—' : it.v.decided_by || '—', it.req ? R.dmy(String(it.req.decided_at || '').slice(0, 10)) : R.dmy(String(it.v.decided_at || '').slice(0, 10))))}</div>` +
        (pending && wd.ok ? `<div class="rv-btns"><button type="button" class="btn" data-rvdo="withdraw">${esc(A.rv.withdraw)}</button></div>` : ''), 'rv_dec'));
    const head = `<div class="rv-h"><div class="rv-t"><h2>${esc(A.rv.title(it.title, c.name))}</h2><div class="rv-sub">${U.apChip(it.status)} <span class="apt ${esc(it.req ? it.req.type : 'plan')}">${esc(it.title)}</span> <span class="muted">${esc(A.sub(it.by || '—', it.at ? R.dmy(String(it.at).slice(0, 10)) : '—', age == null ? '' : A.ago(age), it.v ? it.v.v : null))}</span></div></div>` +
      `${nav}<button type="button" class="icon-btn" data-rvclose aria-label="${esc(C.common.close)}" title="${esc(C.common.close)}">${ICON.close}</button></div>`;
    const foot = pending && dec.ok ? `<div class="rv-f"><span class="muted small" id="rv_hint">${esc(A.rv.scroll)}</span><button type="button" class="btn small" data-rvjump>${esc(A.rv.jump)}</button></div>` : '';
    const m = U.openModal(head + `<div class="rv-b" id="rv_b">${out.join('')}</div>` + foot, 'L', () => { cur = null; });
    if (it.v) CP.cpage.drawSummary(it.v, c, 'rv');
    wire(m, it);
  }
  function wire(m, it) {
    const b = $('rv_b'), dec = $('rv_dec'), okb = m.querySelector('[data-rvdo="approve"]');
    /* KOL: Approve only once the Decision is in view — seen by an IntersectionObserver and, as a fallback, by the scroll position of the container */
    const seen = () => { if (!okb || !okb.disabled) return; const r = dec.getBoundingClientRect(), rb = b.getBoundingClientRect(); if (r.top < rb.bottom - Math.min(60, r.height * 0.6)) { okb.disabled = false; const h = $('rv_hint'); if (h) h.textContent = ''; } };
    if (okb && dec) {
      if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { seen(); okb.disabled = false; const h = $('rv_hint'); if (h) h.textContent = ''; io.disconnect(); } }, { root: b, threshold: 0.6 }); io.observe(dec); }
      b.addEventListener('scroll', seen, { passive: true }); requestAnimationFrame(seen);
    }
    m.onclick = async e => {
      const t = e.target;
      if (t.closest('[data-rvclose]')) { U.closeModal(); return; }
      if (t.closest('[data-rvpdf]')) { CP.steps.pdf(it.plan, it.c); return; }
      if (t.closest('[data-rvjump]')) { dec.scrollIntoView({ behavior: 'smooth', block: 'end' }); const ta = $('rv_c'); setTimeout(() => { seen(); if (ta) ta.focus(); }, 400); return; }
      const sp = t.closest('[data-rvstep]'); if (sp) { const i = cur.list.findIndex(x => x.kind === cur.kind && x.id === cur.id && x.no === cur.no), n = cur.list[(i + +sp.dataset.rvstep + cur.list.length) % cur.list.length]; Object.assign(cur, n); draw(); return; }
      const d = t.closest('[data-rvdo]'); if (d && !d.disabled) await decide(d.dataset.rvdo, it);
    };
  }
  async function decide(what, it) {
    const a = me(), ta = $('rv_c'), comment = ta ? ta.value.trim() : '', e = $('rv_e');
    const steps = [...document.querySelectorAll('[data-rvk]:checked')].map(x => x.dataset.rvk);
    if (what === 'revise' && !steps.length) { if (e) e.textContent = A.rv.pickStep; return; }
    if ((what === 'return' || what === 'reject' || what === 'revise') && comment.length < 5) { if (e) e.textContent = A.rv.short; if (ta) ta.focus(); return; }
    if (what === 'reject' && !(await U.confirmDialog(A.rv.rejectQ(it.c.name), it.req ? A.rv.rejectReqBody : A.rv.rejectBody, A.rv.reject, true, C.common.cancel))) return;
    const before = R.clonePlan(it.plan), step = it.req ? { approve: 'req.approve', return: 'req.return', reject: 'req.reject', withdraw: 'req.withdraw' }[what] : what;
    let p = null;
    try { p = await CP.store.savePlan(it.c.id, x => R.planAct(x, { type: step, no: it.req ? it.req.no : undefined, by: a.name, at: R.nowLocal(), comment, steps }), { rev: it.plan.rev || 0 }); }
    catch (x) { U.toast(x.code === 'conflict' ? A.toast.conflict : A.toast.failed); CP.app.refresh(); draw(); return; }
    const nm = it.req ? `#${it.req.no} · ${it.c.name}` : it.c.name, msg = { approve: A.toast.approved(nm), return: A.toast.returned(nm), revise: A.toast.revised(nm), reject: A.toast.rejected(nm), withdraw: A.toast.withdrawn(nm) }[what];
    if (CP.cpage.reset) CP.cpage.reset();
    CP.app.refresh();
    /* KOL — Undo for 10 s (the plan as it was, one more rev) */
    U.toastAction(msg, A.toast.undo, async () => { try { await CP.store.savePlan(it.c.id, x => Object.assign(R.clonePlan(before), { rev: x.rev, log: x.log.concat([{ at: R.nowLocal(), by: a.name, action: 'undo', detail: what }]) })); U.toast(A.toast.undone); if (CP.cpage.reset) CP.cpage.reset(); CP.app.refresh(); } catch (y) { U.toast(A.toast.failed); } }, 10000);
    /* the next one waiting (KOL), or close */
    const nx = queue().find(x => !(x.kind === cur.kind && x.id === cur.id && x.no === cur.no));
    if (nx && what !== 'withdraw') { cur = Object.assign({}, nx, { list: queue() }); draw(); } else U.closeModal();
    return p;
  }
  return { open, queue };
})();

/* ===================== §7 — Request budget (a drawer: Reason · lines · Impact live) ===================== */
CP.reqdraw = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON } = U, Q = C.req;
  let F = null;   // { cid, no (edit), reason, lines [{ key 'type|line', month, amount }], dirty }
  function lineOptions(cid) {
    const s = U.seed(), set = new Map();
    (s.expenses || []).forEach(r => { if (r.campaign_id === cid && r.scenario === 'budget') set.set(`${r.type}|${r.line}`, r); });
    const L = CP.mock.lines(); ['marketing', 'sales', 'other'].forEach(t => (L[t] || []).forEach(l => { if (!set.has(t + '|' + l)) set.set(t + '|' + l, null); }));
    return [...set.keys()].sort((a, b) => a.localeCompare(b));
  }
  function open(cid, o = {}) {
    const s = U.seed(), c = (s.allCampaigns || s.campaigns).find(x => x.id === cid), plan = CP.store.data().plans[cid];
    const q = o.no && plan ? plan.requests.find(x => x.no === o.no) : null, cur = R.ym(U.today());
    F = { cid, rev: plan ? plan.rev || 0 : null, no: q ? q.no : null, reason: q ? q.reason : o.reason || '', lines: q ? q.lines.map(l => ({ key: `${l.type}|${l.line}`, month: l.month, amount: String(l.amount) })) : [{ key: o.key || '', month: o.month || (cur < R.ym(c.start) ? R.ym(c.start) : cur > R.ym(c.end) ? R.ym(c.end) : cur), amount: o.amount ? String(o.amount) : '' }], dirty: false, c };
    U.openDrawer({ kind: 'req', isDirty: () => F && F.dirty, onClose: () => { F = null; } }, html());
    $('drawer_content').classList.add('form', 'wide');
    wire(); update(); const r = $('rq_reason'); if (r) r.focus();
  }
  const monthsOf = c => R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end);
  function html() {
    const c = F.c, opts = lineOptions(F.cid), ms = monthsOf(c);
    const row = (l, i) => `<div class="rqrow" data-i="${i}"><select class="inp" data-rk aria-label="${esc(Q.line)}"><option value="">${esc(Q.line)}</option>${opts.map(k => `<option value="${esc(k)}"${k === l.key ? ' selected' : ''}>${esc(k.split('|')[1])} · ${esc(C.plan.grid.groups[k.split('|')[0]] || '')}</option>`).join('')}</select>` +
      `<select class="inp" data-rm aria-label="${esc(Q.month)}">${ms.map(m => `<option value="${m}"${m === l.month ? ' selected' : ''}>${esc(R.monthName(m))}</option>`).join('')}</select><input class="inp num" data-ra inputmode="decimal" value="${esc(l.amount)}" placeholder="0" aria-label="${esc(Q.amount)}">` +
      `<button type="button" class="icon-btn" data-rdel="${i}" aria-label="${esc(Q.remove)}" title="${esc(Q.remove)}">${ICON.close}</button><div class="rqinfo" data-ri="${i}"></div></div>`;
    return `<div class="dr-head"><div class="dr-title"><h2 id="k_f_h">${esc(F.no ? Q.editTitle(F.no) : Q.title)}</h2><div class="dr-sub">${esc(c.name)}</div></div><button type="button" class="icon-btn" data-dr-close aria-label="${esc(C.common.close)}">${ICON.close}</button></div>` +
      `<div class="dr-body kform"><div class="field"><label for="rq_reason">${esc(Q.reason)} <span class="req">*</span></label><textarea id="rq_reason" class="inp" rows="2" maxlength="300" placeholder="${esc(Q.reasonPh)}">${esc(F.reason)}</textarea><div class="ferr" id="rq_e_reason"></div></div>` +
      `<div class="field"><label>${esc(Q.line)} · ${esc(Q.month)} · ${esc(Q.amount)}</label><div id="rq_rows">${F.lines.map(row).join('')}</div><button type="button" class="link" data-radd>${esc(Q.addLine)}</button><div class="ferr" id="rq_e_lines"></div></div>` +
      `<div class="field"><label>${esc(Q.impact)} <span id="rq_type"></span></label><div id="rq_imp" class="rqimp"></div></div></div>` +
      `<div class="dr-foot"><div class="ferr fmsg" id="rq_msg"></div><button type="button" class="btn" data-dr-close>${esc(C.common.cancel)}</button><button type="button" class="btn primary" id="rq_save">${esc(Q.submit)}</button></div>`;
  }
  const lines = () => F.lines.filter(l => l.key && U.parseNum(l.amount)).map(l => { const [type, line] = l.key.split('|'); return { type, line, month: l.month, amount: Math.round(U.parseNum(l.amount)) }; });
  function update() {
    if (!F) return;
    const ls = lines(), im = R.requestImpact(U.seed(), F.cid, ls), dc = $('drawer_content');
    $('rq_type').innerHTML = ls.length ? `<span class="apt ${esc(im.type)}">${esc(Q.type[im.type])} ${esc(R.signedShort(im.total))}</span>` : '';
    $('rq_imp').innerHTML = `<dl class="kv"><dt>${esc(Q.current)}</dt><dd>${esc(`${R.baht(im.before)} → ${R.baht(im.after)}`)}</dd><dt>${esc(Q.ap)}</dt><dd>${esc(`${R.pct(im.ap[0], 1)} → ${R.pct(im.ap[1], 1)}`)}</dd><dt>${esc(Q.profit)}</dt><dd>${esc(`${R.baht(im.profit[0])} → ${R.baht(im.profit[1])}`)}</dd></dl>`;
    let i2 = 0;
    F.lines.forEach((l, i) => { const info = dc.querySelector(`[data-ri="${i}"]`); if (!info) return; if (!l.key || !U.parseNum(l.amount)) { info.textContent = ''; return; }
      const r = im.rows[i2++]; info.className = 'rqinfo' + (r.err ? ' err' : ''); info.textContent = `${Q.com} ${R.shortBaht(r.com)} · ${Q.rem} ${R.shortBaht(r.before)} → ${R.shortBaht(r.after)}${r.err ? ' — ' + Q.belowCom : ''}`; });
    const ok = !!F.reason.trim() && ls.length > 0 && im.ok;
    $('rq_save').disabled = !ok;
  }
  function wire() {
    const dc = $('drawer_content');
    dc.oninput = e => { F.dirty = true; if (e.target.id === 'rq_reason') F.reason = e.target.value; const rw = e.target.closest('.rqrow'); if (rw) { const l = F.lines[+rw.dataset.i]; if (e.target.matches('[data-ra]')) l.amount = e.target.value; } update(); };
    dc.onchange = e => { F.dirty = true; const rw = e.target.closest('.rqrow'); if (rw) { const l = F.lines[+rw.dataset.i]; if (e.target.matches('[data-rk]')) l.key = e.target.value; if (e.target.matches('[data-rm]')) l.month = e.target.value; } update(); };
    dc.onclick = async e => {
      if (e.target.closest('[data-radd]')) { F.lines.push({ key: '', month: F.lines.length ? F.lines[F.lines.length - 1].month : R.ym(F.c.start), amount: '' }); U.fillDrawer(html()); dc.classList.add('form', 'wide'); wire(); update(); return; }
      const d = e.target.closest('[data-rdel]'); if (d) { F.lines.splice(+d.dataset.rdel, 1); if (!F.lines.length) F.lines.push({ key: '', month: R.ym(F.c.start), amount: '' }); U.fillDrawer(html()); dc.classList.add('form', 'wide'); wire(); update(); return; }
      if (e.target.closest('#rq_save')) await submit();
    };
  }
  async function submit() {
    const ls = lines(), a = CP.actor.get(); if (!F.reason.trim()) { $('rq_e_reason').textContent = Q.needReason; return; } if (!ls.length) { $('rq_e_lines').textContent = Q.needLine; return; }
    const cid = F.cid, no = F.no, plan = CP.store.data().plans[cid];
    $('rq_save').disabled = true;
    try {
      const p = await CP.store.savePlan(cid, x => R.planAct(x, no ? { type: 'req.edit', no, reason: F.reason.trim(), lines: ls, by: a.name, at: R.nowLocal() } : { type: 'req.new', reason: F.reason.trim(), lines: ls, by: a.name, at: R.nowLocal() }),
        { rev: F.rev == null ? undefined : F.rev });
      const n = no || p.requests[p.requests.length - 1].no; U.closeDrawer(); U.toast(Q.toast.sent(n)); CP.app.refresh();
    } catch (x) { $('rq_msg').textContent = x.code === 'conflict' ? C.appr.toast.conflict : C.appr.toast.failed; $('rq_save').disabled = false; if (x.code === 'conflict') CP.app.refresh(); }
  }
  return { open };
})();

/* ===================== CR-13 §4 · §5 — Period change · Close campaign / Close early (drawers: the form · the Impact / the checks live) → CP.chgdraw ===================== */
CP.chgdraw = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON } = U, CG = C.cpg;
  let F = null;
  const seedNow = () => U.seed(), today = () => U.today();
  const campOf = id => { const s = seedNow(); return (s.campaigns || []).find(x => x.id === id) || (s.allCampaigns || []).find(x => x.id === id); };
  const head = (title, sub) => `<div class="dr-head"><div class="dr-title"><h2 id="k_f_h">${esc(title)}</h2><div class="dr-sub">${esc(sub)}</div></div><button type="button" class="icon-btn" data-dr-close aria-label="${esc(C.common.close)}">${ICON.close}</button></div>`;
  const foot = (send, id) => `<div class="dr-foot"><div class="ferr fmsg" id="cg_msg"></div><button type="button" class="btn" data-dr-close>${esc(C.common.cancel)}</button><button type="button" class="btn primary" id="${id}" disabled>${esc(send)}</button></div>`;

  /* ---------- Period change (§4.1 · §4.2): Start (locked once started) · End marketing · End campaign · Reason ≥ 10 · Impact now → after ---------- */
  function period(cid, o = {}) {
    const c = campOf(cid), plan = CP.store.data().plans[cid]; if (!c || !plan) return;
    const q = o.no ? plan.requests.find(x => x.no === o.no) : null, W = CG.per, started = today() >= c.start;
    F = { kind: 'period', cid, c, rev: plan.rev || 0, no: q ? q.no : null, to: q ? Object.assign({}, q.period.to) : { start: c.start, end_marketing: c.end_marketing || '', end: c.end }, reason: q ? q.reason : '', dirty: false, started };
    const df = (k, label, dis) => `<div class="field"><label for="pc_t_${k}">${esc(label)}</label>${U.dateHTML(`data-pdate="${k}"${dis ? ' disabled' : ''}`, F.to[k] || '', { textId: 'pc_t_' + k })}${k === 'start' && dis ? `<div class="help">${esc(W.locked)}</div>` : ''}</div>`;
    U.openDrawer({ kind: 'per', isDirty: () => F && F.dirty, onClose: () => { F = null; } }, head(W.title, c.name) +
      `<div class="dr-body kform"><div class="frow f3">${df('start', W.start, started)}${df('end_marketing', W.endMkt, false)}${df('end', W.end, false)}</div><div class="ferr" id="pc_e_dates"></div>` +
      `<div class="field"><label for="pc_reason">${esc(W.reason)} <span class="req">*</span></label><textarea id="pc_reason" class="inp" rows="2" maxlength="300" placeholder="${esc(W.reasonPh)}">${esc(F.reason)}</textarea><div class="ferr" id="pc_e_reason"></div></div>` +
      `<div class="field"><label>${esc(W.impact)}</label><div id="pc_imp" class="pcimp"></div></div></div>` + foot(W.send, 'pc_send'));
    $('drawer_content').classList.add('form', 'wide'); wire(); update(); const r = $('pc_reason'); if (r) r.focus();
  }
  function periodRead() { const dc = $('drawer_content'); dc.querySelectorAll('[data-pdate]').forEach(e => { if (e.value !== 'invalid') F.to[e.dataset.pdate] = e.value || (e.dataset.pdate === 'end_marketing' ? '' : F.to[e.dataset.pdate]); }); F.reason = $('pc_reason').value; }
  function periodCheck() {
    const W = CG.per, c = F.c, to = F.to, errs = [];
    if (!R.isISODate(to.start) || !R.isISODate(to.end) || to.end < to.start || (to.end_marketing && (to.end_marketing < to.start || to.end_marketing > to.end))) errs.push(W.order);
    if (to.start === c.start && to.end === c.end && (to.end_marketing || '') === (c.end_marketing || '')) errs.push(W.same);
    return errs;
  }
  function periodImpactHTML(im) {
    const W = CG.per, a = im.now, b = im.after, d = b.days - a.days, st = s => (s ? C.yr.st[s] : C.yr.pace.early), row = (l, x, y, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${esc(l)}</td><td class="num">${esc(x)}</td><td class="num">${esc(y)}</td></tr>`;
    const left = n => (n == null ? '—' : String(n));
    return `<table class="tbl simple pctbl"><thead><tr><th></th><th class="num">${esc(W.now)}</th><th class="num">${esc(W.after)}</th></tr></thead><tbody>` +
      row(W.days, W.daysV(a.days, left(a.left)), d ? W.daysPlus(b.days, (d > 0 ? '+' : '') + d, left(b.left)) : W.daysV(b.days, left(b.left))) +
      row(W.timeGone, R.pct(a.timeGone), R.pct(b.timeGone)) + row(W.ach(R.shortBaht(a.target)), R.pct(a.ach), R.pct(b.ach)) +
      row(W.pace, `${a.pace == null ? '—' : R.paceText(a.pace)} · ${st(a.status)}`, `${b.pace == null ? '—' : R.paceText(b.pace)} · ${st(b.status)}`, b.status !== a.status ? 'chg' : '') +
      row(W.rate, a.rate == null ? '—' : R.shortBaht(a.rate), b.rate == null ? '—' : `≈ ${R.shortBaht(b.rate)}`) +
      row(W.moves, '—', im.moves.length ? im.moves.map(x => W.move(R.monthName(x.from), R.monthName(x.target ? x.toT : x.toB), R.shortBaht(x.target), R.shortBaht(x.budget))).join(' · ') : W.noMove) + '</tbody></table>' +
      (im.better ? `<div class="nsband warnb" data-pcbetter><span class="nsb-t">${esc(W.better)}</span></div>` : '') +
      im.cut.map(x => `<div class="ferr" data-pccut>${esc(W.cut(R.monthName(x.m), R.baht(x.sales), x.spend ? R.baht(x.spend) : ''))}</div>`).join('') +
      (im.added.length ? `<div class="help">${esc(W.newMonths)}</div>` : '');
  }

  /* ---------- Close campaign · Close early (§5.1 · §5.3): the checks · No more expenses (ticked) · Closing note ≥ 20 · the gap to explain · Close date (early) ---------- */
  function close(cid, o = {}) {
    const c = campOf(cid), plan = CP.store.data().plans[cid]; if (!c || !plan) return;
    const q = o.no ? plan.requests.find(x => x.no === o.no) : null, early = today() <= c.end, W = CG.cl;
    F = { kind: 'close', cid, c, rev: plan.rev || 0, no: q ? q.no : null, early, date: q && q.close.close_date ? q.close.close_date : early ? today() : '', note: q ? q.close.note : '', sure: !!q, dirty: false };
    U.openDrawer({ kind: 'cls', isDirty: () => F && F.dirty, onClose: () => { F = null; } }, head(early ? W.early(c.name) : W.title(c.name), early ? `${R.dmy(c.start)} – ${R.dmy(c.end)}` : W.ended(R.dmy(c.end))) +
      `<div class="dr-body kform">${early ? `<div class="field"><label for="cl_t_date">${esc(W.date)} <span class="req">*</span></label>${U.dateHTML('data-cldate', F.date, { textId: 'cl_t_date' })}<div class="ferr" id="cl_e_date"></div></div>` : ''}` +
      `<div class="field"><label>${esc(W.checks)}</label><ul class="checks2" id="cl_checks"></ul></div>` +
      `<label class="chk clsure"><input type="checkbox" id="cl_sure"${F.sure ? ' checked' : ''}><span>${esc(W.sure)}</span></label>` +
      `<div class="field"><label for="cl_note">${esc(W.note)} <span class="req">*</span></label><div class="help" id="cl_gap"></div><textarea id="cl_note" class="inp" rows="3" maxlength="600" placeholder="${esc(W.notePh)}">${esc(F.note)}</textarea><div class="ferr" id="cl_e_note"></div></div></div>` + foot(W.send, 'cl_send'));
    $('drawer_content').classList.add('form', 'wide'); wire(); update(); const n = $('cl_note'); if (n) n.focus();
  }
  function closeData() {
    const plan = CP.store.data().plans[F.cid], k = R.closeChecks(seedNow(), F.cid, plan, today()); const W = CG.cl;
    const last = [k.lastSales, k.lastExp].filter(Boolean).sort().pop() || R.ym(F.c.start);
    return { k, last, W };
  }

  /* ---------- the form live · Send ---------- */
  function update() {
    if (!F) return; const dc = $('drawer_content'); if (!dc) return;
    if (F.kind === 'period') {
      periodRead(); const errs = periodCheck(), W = CG.per; $('pc_e_dates').textContent = errs.join(' · ');
      const im = !errs.length || errs.every(x => x === W.same) ? R.periodImpact(seedNow(), F.cid, F.to, today()) : null;
      $('pc_imp').innerHTML = im ? periodImpactHTML(im) : ''; F.im = im;
      $('pc_e_reason').textContent = F.reason.trim().length && F.reason.trim().length < 10 ? W.short : '';
      $('pc_send').disabled = !(im && im.ok && !errs.length && F.reason.trim().length >= 10);
      return;
    }
    const { k, last, W } = closeData();
    if (F.early) { const d = dc.querySelector('[data-cldate]'); if (d && d.value !== 'invalid') F.date = d.value; const bad = !R.isISODate(F.date) || F.date < today() || R.ym(F.date) < last || F.date > F.c.end;
      $('cl_e_date').textContent = bad ? W.dateErr(R.monthName(last)) : ''; F.badDate = bad; }
    const li = (ok, text, cls) => `<li class="${cls || (ok ? 'ok' : 'err')}"><span class="ci">${cls === 'info' ? '·' : ok ? '✓' : '✕'}</span>${esc(text)}</li>`;
    $('cl_checks').innerHTML = li(!k.waiting.length, k.waiting.length ? W.wait(k.waiting.length) : W.noWait) + li(!k.stepsOpen, W.noStep) +
      (k.lastDay ? li(true, W.lastExp(R.dmy(k.lastDay)), 'info') : '') + li(true, W.spent(R.baht(k.spent), R.baht(k.current), R.pct(k.used)), 'info') +
      li(true, W.rev(R.baht(k.rev), R.pct(k.ach)), 'info') + li(true, W.profit(R.baht(k.profit), R.baht(k.planProfit)), 'info') + li(true, W.unused(R.baht(k.unused)), 'info');
    const gap = (k.ach != null && k.ach < 1 - 1e-9 && k.short > 0.5) || k.over > 0.5 ? W.gap(k.short > 0.5 && k.ach < 1 ? R.baht(k.short) : '', k.over > 0.5 ? R.baht(k.over) : '') : '';
    $('cl_gap').textContent = gap;
    F.sure = $('cl_sure').checked; F.note = $('cl_note').value; F.k = k;
    $('cl_e_note').textContent = !F.sure ? W.tick : F.note.trim().length && F.note.trim().length < 20 ? W.short : '';
    $('cl_send').disabled = !(!k.waiting.length && !k.stepsOpen && F.sure && F.note.trim().length >= 20 && !(F.early && F.badDate));
  }
  function wire() {
    const dc = $('drawer_content');
    dc.oninput = () => { if (!F) return; F.dirty = true; update(); };
    dc.onchange = () => { if (!F) return; F.dirty = true; update(); };
    dc.onclick = async e => { if (e.target.closest('#pc_send') || e.target.closest('#cl_send')) await submit(); };
  }
  async function submit() {
    const a = CP.actor.get(), cid = F.cid, c = F.c; let act;
    if (F.kind === 'period') { const im = F.im; if (!im || !im.ok) return;
      act = { kind: 'period', reason: F.reason.trim(), period: { from: im.from, to: { start: F.to.start, end_marketing: F.to.end_marketing || null, end: F.to.end }, moves: im.moves.map(x => ({ from: x.from, toT: x.toT, toB: x.toB })) } };
    } else { const k = F.k, to = F.early ? { start: c.start, end: F.date, end_marketing: c.end_marketing && c.end_marketing > F.date ? F.date : c.end_marketing || null } : null;
      const mv = to ? R.periodMoves(seedNow(), cid, to).moves.map(x => ({ from: x.from, toT: x.toT, toB: x.toB })) : [];
      act = { kind: 'close', reason: F.note.trim(), close: { early: F.early, close_date: F.early ? F.date : null, note: F.note.trim(), moves: mv, checks: { unused: k.unused, spent: k.spent, current: k.current, used: k.used, rev: k.rev, ach: k.ach, profit: k.profit, planProfit: k.planProfit, sure: true } } }; }
    const btn = $(F.kind === 'period' ? 'pc_send' : 'cl_send'); btn.disabled = true;
    try {
      const p = await CP.store.savePlan(cid, x => R.planAct(x, Object.assign(F.no ? { type: 'req.edit', no: F.no } : { type: 'req.new' }, act, { by: a.name, at: R.nowLocal() })), { rev: F.rev });
      const n = F.no || p.requests[p.requests.length - 1].no, kind = F.kind; U.closeDrawer(); U.toast(kind === 'period' ? CG.per.sent(n) : CG.cl.sent(n)); if (CP.cpage.reset) CP.cpage.reset(); CP.app.refresh();
    } catch (x) { $('cg_msg').textContent = x.code === 'conflict' ? C.appr.toast.conflict : C.appr.toast.failed; btn.disabled = false; if (x.code === 'conflict') CP.app.refresh(); }
  }
  /* ---------- Admin › Reopen (§5.3 · D119): no approval · a reason · in the history ---------- */
  function reopen(cid) {
    const c = campOf(cid), plan = CP.store.data().plans[cid], W = CG.cl; if (!c || !plan) return;
    U.openDialog(`<div class="dlg-h">${esc(W.reopenQ(c.name))}</div><div class="dlg-b"><p>${esc(W.reopenBody)}</p><div class="field"><label for="ro_reason">${esc(W.reopenReason)} <span class="req">*</span></label><textarea id="ro_reason" class="inp" rows="2" maxlength="300"></textarea><div class="ferr" id="ro_e"></div></div></div>` +
      `<div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(C.common.cancel)}</button><button type="button" class="btn primary" data-r="1">${esc(CG.reopen)}</button></div>`);
    const d = $('dlg'); $('ro_reason').focus();
    d.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', async () => { if (b.dataset.r !== '1') { U.closeDialog(); return; } const r = $('ro_reason').value.trim(); if (r.length < 5) { $('ro_e').textContent = CG.per.short; return; }
      U.closeDialog(); try { await CP.store.savePlan(cid, x => R.planAct(x, { type: 'reopen', reason: r, by: CP.actor.get().name, at: R.nowLocal() }), { rev: plan.rev || 0 }); U.toast(W.reopened(c.name)); if (CP.cpage.reset) CP.cpage.reset(); CP.app.refresh(); } catch (x) { U.toast(C.appr.toast.failed); } }));
  }
  return { period, close, reopen, impactHTML: periodImpactHTML };
})();
