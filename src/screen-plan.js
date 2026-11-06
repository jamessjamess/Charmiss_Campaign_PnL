/* screen-plan.js — Campaign Planning › a plan in 6 steps (CR-07 §7 · §8 · D64 · D70 · D71 — was the Campaign page, screen-campaign-page.js). → CP.cpage · CP.review · CP.reqdraw
   #planning/<id>[/details|products|target|budget|forecast|review] · the head: name · Approval · Owner · Period · the stepper (1 Campaign details · 2 Products ·
   3 Sales target · 4 Budget = 4a Marketing exp · 4b Sales exp · 4c Other exp · 5 Forecast · 6 Review & submit — each: its department · who · Due · status) ·
   the buttons the one acting may use (Save draft · Mark step done · Submit for approval · Review (Executive) · Withdraw · Duplicate) ·
   the side panel (sticky): the Plan P&L live (Target · GP % · Marketing · Sales · Other · A&P % · Plan profit · Margin · ROI) + the checks of this step.
   A step is edited by its assignee · the owner · Admin, while the plan is a Draft or Returned and the step is open (R.canDoStep) · editing a step that is Done
   puts it back In progress and step 5 to Needs refresh (D70) · an approved plan opens read only (View plan from Campaign Monitor). */
CP.cpage = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON, labelInfo, none, statusChip } = U;
  const P = C.plan, A = C.appr, SP = C.step;
  const PAGES = ['details', 'products', 'target', 'envelope', 'budget', 'forecast', 'review'];
  const PAGE_STEPS = { details: ['1'], products: ['2'], target: ['3'], envelope: ['env'], budget: ['4a', '4b', '4c'], forecast: ['5'], review: ['6'] };
  const GROUP_OF = { '4a': 'marketing', '4b': 'sales', '4c': 'other' };
  const me = () => CP.actor.get();
  const allCamps = () => { const s = U.seed(); return s.allCampaigns || s.campaigns || []; };
  const campOf = id => allCamps().find(c => c.id === id) || null;
  const planOf = id => CP.store.data().plans[id] || null;
  const master = () => new Map((CP.store.data().products || []).map(p => [p.code, p]));
  const people = () => CP.actor.people();
  const at = () => R.nowLocal();
  let el = null, st = { id: null, page: 'details', tab: 'plan', mode: 'qty', folded: new Set(), F: null, gT: null, gB: {}, hf: 'all', editD: false, ver: null, bOpen: null };

  /* ===================== the working copy of the version (the page edits it) ===================== */
  function draftOf(id) {
    const plan = planOf(id), ver = plan ? (plan.approval === 'approved' ? R.approvedVersion(plan) : R.working(plan)) : null, c = campOf(id);
    const F = { id, rev: plan ? plan.rev || 0 : 0, ver, skus: ver ? R.clonePlan(ver.skus || []) : [], q: new Map(), amt: new Map(), bud: new Map(), lines: [], dirty: 0, dirtySteps: new Set(),
      details: R.clonePlan((ver && ver.details) || { objective: '', brand: 'Charmiss', category: '', channels: R.CHANNELS.slice() }),
      forecast: R.clonePlan((ver && ver.forecast) || { ach: { MT: 1, TT: 1, ECOM: 1 }, worst: 0.8, best: 1.1, note: '', comment: '' }), review: R.clonePlan((ver && ver.review) || { comment: '' }),
      /* CR-13 — the Target builder and the envelope kept with the version (none = the defaults / the lines) */
      builder: ver && ver.builder ? R.clonePlan(ver.builder) : null, envelope: ver && ver.envelope ? R.clonePlan(ver.envelope) : null,
      list: c ? { name: c.name, start: c.start, end: c.end, end_marketing: c.end_marketing || '' } : null, owner: plan ? plan.owner : '', assign: new Map() };
    /* D62 — the target by SKU × Channel × month (a sub-channel of an older plan is added into its channel) */
    (ver ? ver.target : []).forEach(r => { const k = `${r.code}|${r.channel}|${r.month}`; F.q.set(k, (F.q.get(k) || 0) + (R.isNum(+r.qty) ? +r.qty : 0)); if (R.isNum(r.amount)) F.amt.set(k, (F.amt.get(k) || 0) + r.amount); });
    (ver ? ver.budget : []).forEach(r => { const k = `${r.type}|${r.line}`; if (!F.bud.has(k)) { F.bud.set(k, new Map()); F.lines.push({ type: r.type, line: r.line }); } F.bud.get(k).set(r.month, (F.bud.get(k).get(r.month) || 0) + +r.amount); });
    return F;
  }
  function serialize(F) {
    const target = [], budget = [], order = new Map(F.skus.map((s, i) => [s.code, i])), chs = F.details.channels;
    F.q.forEach((v, k) => { if (v == null || v === 0) return; const [code, ch, month] = k.split('|'); if (!order.has(code) || !chs.includes(ch)) return;
      const row = { code, channel: ch, month, qty: v }; if (F.amt.has(k)) row.amount = F.amt.get(k); target.push(row); });
    target.sort((a, b) => order.get(a.code) - order.get(b.code) || R.CHANNELS.indexOf(a.channel) - R.CHANNELS.indexOf(b.channel) || a.month.localeCompare(b.month));
    F.lines.forEach(l => { const m = F.bud.get(`${l.type}|${l.line}`); if (m) m.forEach((v, month) => { if (v) budget.push({ type: l.type, line: l.line, month, amount: v }); }); });
    return { skus: F.skus.map(s => Object.assign({}, s, { cogs: s.cogs === '' || s.cogs == null ? null : +s.cogs, price: Object.fromEntries(R.CHANNELS.map(k => [k, s.price && s.price[k] !== '' && s.price[k] != null ? +s.price[k] : ''])) })),
      target, budget, details: R.clonePlan(F.details), forecast: R.clonePlan(F.forecast), review: R.clonePlan(F.review), builder: F.builder ? R.clonePlan(F.builder) : undefined, envelope: F.envelope ? R.clonePlan(F.envelope) : undefined };
  }
  /* the version as it is typed (for the side panel and the checks) */
  const liveVer = () => Object.assign({}, st.F.ver || {}, serialize(st.F));
  const livePlan = plan => Object.assign({}, plan, { versions: (plan.versions || []).slice(0, -1).concat([liveVer()]) });
  const canStep = (plan, k) => R.canDoStep(me(), plan, k);
  const months = c => R.monthsIn(c.start, c.end);
  const bmonths = c => R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end);
  const monthCols = list => { const cur = R.ym(U.today()); return list.map((m, i) => ({ key: m, label: R.monthShort(m), year: i === 0 || m.slice(0, 4) !== list[i - 1].slice(0, 4) ? m.slice(0, 4) : '', cur: m === cur })); };
  const isDirty = () => !!(st.F && st.F.dirty);
  const touch = k => { st.F.dirty++; st.F.dirtySteps.add(k); dirtyNote(); };

  /* ===================== render — CR-13 §2 (D114): one Campaign page, two modes — a plan not approved: Plan · History (Plan opens at the first step open for
     the one acting) · an approved one: Overview · Plan · Requests · History (opens at Overview) · #planning/<id>/overview|plan[/<step>]|requests|history ·
     the old #planning/<id>/details|products|target|budget|forecast|review → /plan/<step> · the frame (banner · head · tabs) is built once, its parts drawn again ===================== */
  const TABS_LIVE = ['overview', 'plan', 'requests', 'history'], TABS_DRAFT = ['plan', 'history'], CG = C.cpg;
  let stick = { toTop() {} };
  function render(root, id, sub) {
    el = root; const c = campOf(id), plan = planOf(id);
    if (st.id !== id) st = Object.assign(st, { id, F: null, folded: new Set(), hf: 'all', editD: false, ver: null, page: null });
    if (!c || !plan) { el.innerHTML = `<div class="pbanner"><div class="crumb"><a href="#planning">${esc(SP.title)}</a></div><h1>${esc(P.notFound)}</h1></div>`; return; }
    const live = plan.approval === 'approved';
    let [t0, t1] = String(sub || '').split('/'); if (PAGES.includes(t0)) { t1 = t0; t0 = 'plan'; }
    const tabs = live ? TABS_LIVE : TABS_DRAFT;
    st.tab = tabs.includes(t0) ? t0 : live ? 'overview' : 'plan';
    if (!live) st.page = PAGES.includes(t1) ? t1 : PAGES.includes(st.page) ? st.page : firstPage(plan);
    const want = `#planning/${encodeURIComponent(id)}/${st.tab}${st.tab === 'plan' && !live ? '/' + st.page : ''}`;
    if (location.hash !== want) history.replaceState(null, '', want);
    if (!st.F || (!st.F.dirty && st.F.rev !== (plan.rev || 0))) st.F = draftOf(id);
    if (!el.querySelector('#cp_tabs')) { el.innerHTML = `<div class="pbanner" id="cp_ban"></div><div class="cp-head" id="cp_head"></div><div class="ptabs cptabs" role="tablist" id="cp_tabs"></div><div id="cp_main"></div>`; stick = U.stickyTabs(el, $('cp_tabs')); }
    $('cp_ban').innerHTML = `<div class="crumb"><a href="#planning">${esc(SP.title)}</a><span>›</span>${esc(c.name)}</div><h1>${esc(c.name)}</h1>`;
    $('cp_head').innerHTML = headHTML(c, plan);
    $('cp_tabs').innerHTML = tabs.map(t => `<a role="tab" href="#planning/${esc(id)}/${t}" data-cptab="${t}" class="${t === st.tab ? 'on' : ''}" aria-selected="${t === st.tab}">${esc(CG.tabs[t])}</a>`).join('');
    const main = $('cp_main');
    if (st.tab === 'plan' && !live) {
      main.innerHTML = `<nav class="stepper s7" id="cp_steps" aria-label="${esc(SP.stepsL)}">${stepperHTML(plan)}</nav><div class="plan-wrap"><div id="cp_body" class="cp-body"></div><aside class="plan-side" id="cp_side" aria-label="${esc(SP.side.title)}"></aside></div>`;
      ({ details: renderDetails, products: renderProducts, target: renderTarget, envelope: renderEnvelope, budget: renderBudget, forecast: renderForecast, review: renderReview })[st.page](c, plan);
      renderSide();
    } else ({ overview: renderOverview, plan: renderPlanRO, requests: renderRequests, history: renderHistoryTab })[st.tab](c, plan);
    document.title = `${c.name} · ${SP.title} · ${C.app.title}`;
  }
  /* the first page that waits on the one acting · else the first step not done (an approved plan has no stepper) */
  function firstPage(plan) {
    if (!plan || !plan.steps || plan.approval === 'approved' || plan.approval === 'submitted') return 'review';
    const a = me(), open = R.STEP_KEYS.map(x => R.stepState(plan, x, U.today())).filter(s => s.status !== 'done' && s.open);
    const mine = open.find(s => a && s.assignee === a.name) || open[0];
    return mine ? R.STEP_PAGE[mine.key] : 'review';
  }
  /* ---------- CR-13 §2.2 — the head: the approval chip (Approved v2) · the state of the campaign (On going · 26 days left · Ended · to close · Closed …) ·
     a request waiting (Period change pending · Close requested) · Owner · the period · the buttons of the one acting ---------- */
  const stateNow = (c, plan) => R.campState(c, plan, U.today());
  /* o.by — Closed with who (the chip of Tracking: Closed 30/09/2026 · Ann) · late to close = one red chip: Ended · to close · 5 days late */
  function stateChip(cs, c, o = {}) {
    const W = CG.st;
    if (cs.key === 'cancelled') return statusChip(R.CANCELLED);
    if (cs.key === 'closed') { const by = cs.by ? W.closedBy(R.dmy(cs.at), cs.by) : ''; return `<span class="st closed" title="${esc(by)}">${esc(o.by && by ? by : W.closed(R.dmy(cs.at)))}</span>`; }
    if (cs.key === 'toclose') return `<span class="st toclose${cs.late ? ' late' : ''}" title="${esc(W.endedOn(R.dmy(c.end)))}">${esc(cs.late ? `${W.toclose} · ${W.late(cs.late)}` : W.toclose)}</span>`;
    if (cs.key === 'not_started') return `<span class="st not_started">${esc(W.not_started(cs.n))}</span>`;
    return `<span class="st ongoing">${esc(W.ongoing(cs.n))}</span>`;
  }
  const pendingOf = plan => ((plan && plan.requests) || []).filter(q => q.status === 'pending');
  const kindOf = q => (q.type === 'period' || q.type === 'close' ? q.type : 'budget');
  const changeX = (c, plan, kind) => { const cs = stateNow(c, plan); return { kind, closed: cs.key === 'closed', cancelled: cs.key === 'cancelled' }; };
  function headHTML(c, plan) {
    const a = me(), w = R.working(plan), appr = plan.approval, live = appr === 'approved', ver = live ? R.approvedVersion(plan) : w, cs = live ? stateNow(c, plan) : null;
    const apc = live ? `<span class="st aapproved">${esc(CG.apprV(A.state.approved, ver ? ver.v : 1))}</span>` : U.apChip(appr, { tip: appr === 'returned' && w && w.comment ? w.comment : '' });
    const pend = [...new Set(pendingOf(plan).map(kindOf))].map(k => `<a class="chip warn pchip" href="#planning/${esc(c.id)}/requests">${esc(CG.pending[k])}</a>`).join('');
    const chips = apc + (live ? stateChip(cs, c) : statusChip(R.statusOf(c, U.today())) === statusChip(R.CANCELLED) ? statusChip(R.CANCELLED) : '') + pend;
    const meta = [plan.owner ? P.owner(plan.owner) : '', `${R.dmy(c.start)} – ${R.dmy(c.end)}${c.end_marketing ? ` (${CG.endMktOf(R.dmy(c.end_marketing))})` : ''}`].filter(Boolean).map(esc).join('<span class="sep">·</span>');
    const b = [], can = x => R.canDo(x, a, plan);
    if (!live) {
      const onPlan = st.tab === 'plan', editable = onPlan && PAGE_STEPS[st.page].some(k => canStep(plan, k).ok);
      if (editable && st.page !== 'review') b.push(`<span class="dirtyn muted small" id="cp_dirty">${st.F && st.F.dirty ? esc(P.grid.unsaved(st.F.dirty)) : ''}</span><button type="button" class="btn" data-cpact="save"${st.F && st.F.dirty ? '' : ' disabled'}>${esc(P.btn.save)}</button>`);
      if (onPlan && !['budget', 'review'].includes(st.page)) { const k = PAGE_STEPS[st.page][0], s = R.stepState(plan, k, U.today()), ok = canStep(plan, k).ok;
        if (ok && s.status !== 'done') b.push(`<button type="button" class="btn primary" data-cpdone="${k}">${esc(SP.markDone)}</button>`); }
      if (onPlan && st.page === 'review' && canStep(plan, '6').ok) { const ck = R.stepChecks(livePlan(plan), '6', c); b.push(`<button type="button" class="btn primary" data-cpact="submit"${ck.ok ? '' : ` disabled title="${esc(SP.notReady)}"`}>${esc(P.btn.submit)}</button>`); }
      if (appr === 'submitted') { const d = can('approve'); if (d.ok) b.push(`<button type="button" class="btn primary" data-cpact="review">${esc(SP.reviewBtn)}</button>`); else if (d.why) b.push(`<button type="button" class="btn primary" disabled title="${esc(d.why)}">${esc(P.btn.approve)}</button>`); }
      if (can('withdraw').ok) b.push(`<button type="button" class="btn" data-cpact="withdraw">${esc(P.btn.withdraw)}</button>`);
      if (can('duplicate').ok && appr === 'rejected') b.push(`<button type="button" class="btn" data-cpact="duplicate">${esc(P.btn.duplicate)}</button>`);
    } else {
      /* §3 — Request change ▾ (Budget change · Period change · Close campaign / Close early) while not closed · Campaign Tracking › */
      if (cs.key !== 'closed' && cs.key !== 'cancelled' && ['budget', 'period', 'close'].some(k => R.canDo('change', a, plan, changeX(c, plan, k)).ok))
        b.push(`<button type="button" class="btn primary" data-cpchange aria-haspopup="menu">${esc(CG.change)} ${ICON.chevronDown}</button>`);
      b.push(`<a class="btn ghost" href="#tracking/${esc(c.id)}">${esc(CG.toTracking)}</a>`);
    }
    const more = R.canDo('details', a, plan).ok || (a && (R.isMgr(a) || a.role === 'admin')) || can('duplicate').ok;
    return `<div class="cp-ttl"><div class="cp-chips">${chips}</div><div class="cp-meta">${meta}</div></div><div class="cp-act">${b.join('')}` +
      (more ? `<button type="button" class="icon-btn" data-cpmore aria-haspopup="menu" aria-label="${esc(P.btn.more)}" title="${esc(P.btn.more)}">${ICON.more}</button>` : '') + '</div>';
  }
  /* the menu of Request change (a menu under the button) */
  function changeMenu(btn, id) {
    const c = campOf(id), plan = planOf(id), a = me(); if (!c || !plan) return;
    const old = $('cp_chg'); if (old) { old.remove(); return; }
    const cs = stateNow(c, plan), T = CG.types, items = [['budget', T.budget], ['period', T.period], ['close', cs.key === 'toclose' ? T.close : T.closeEarly]]
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
     Plan in use · Open items (the requests waiting · Close campaign when ended) · Latest activity (5 + All history ›) ---------- */
  function renderOverview(c, plan) {
    const a = me(), cs = stateNow(c, plan), ver = R.approvedVersion(plan) || R.working(plan), D = (ver && ver.details) || {}, W = CG.d, F = W.f, edit = st.editD && R.canDo('details.approved', a, plan, { closed: cs.key === 'closed' }).ok;
    const canEd = R.canDo('details.approved', a, plan, { closed: cs.key === 'closed' }), canPer = R.canDo('change', a, plan, changeX(c, plan, 'period')).ok;
    const kv = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`, brands = people().filter(p => p.dept === 'brand' || p.role === 'admin'), cats = [...new Set((CP.store.data().products || []).map(p => p.category))].sort();
    const view = `<dl class="kv ov-kv">${kv(F.name, esc(c.name))}${kv(F.brand, esc(D.brand || '—'))}${kv(F.category, esc(D.category || '—'))}${kv(F.objective, esc(D.objective || '—'))}${kv(F.channels, esc((D.channels || []).map(k => C.channel[k]).join(' · ') || '—'))}${kv(F.owner, esc(plan.owner || '—'))}</dl>`;
    const form = `<div class="kform ov-form"><div class="frow"><div class="field"><label for="ov_name">${esc(F.name)}</label><input id="ov_name" class="inp" maxlength="80" value="${esc(c.name)}"></div><div class="field"><label for="ov_owner">${esc(F.owner)}</label><select id="ov_owner" class="inp">${brands.map(p => `<option${p.name === plan.owner ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div></div>` +
      `<div class="frow"><div class="field"><label for="ov_brand">${esc(F.brand)}</label><input id="ov_brand" class="inp" value="${esc(D.brand || '')}"></div><div class="field"><label for="ov_cat">${esc(F.category)}</label><input id="ov_cat" class="inp" list="ov_cats" value="${esc(D.category || '')}"><datalist id="ov_cats">${cats.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>` +
      `<div class="field"><label for="ov_obj">${esc(F.objective)}</label><textarea id="ov_obj" class="inp" rows="2" maxlength="240">${esc(D.objective || '')}</textarea></div>` +
      `<fieldset class="field"><legend>${esc(F.channels)}</legend><div class="chkrow">${R.CHANNELS.map(k => `<label class="chk"><input type="checkbox" data-ovch="${k}"${(D.channels || []).includes(k) ? ' checked' : ''}><span>${esc(C.channel[k])}</span></label>`).join('')}</div></fieldset>` +
      `<div class="ferr" id="ov_e"></div><div class="ov-btns"><button type="button" class="btn" data-ovcancel>${esc(W.cancel)}</button><button type="button" class="btn primary" data-ovsave>${esc(W.save)}</button></div></div>`;
    const per = `<div class="ov-per"><div class="ov-pl">${esc(W.period)}</div><div class="cperiod ov-period" id="ov_period">${U.periodHTML(c, { today: U.today(), chips: '' })}</div>` +
      `<div class="muted small ov-dates">${esc(W.dates(R.dmy(c.start), c.end_marketing ? R.dmy(c.end_marketing) : '', R.dmy(c.end)))}${canPer ? ` · <button type="button" class="link" data-chgopen="period">${esc(W.reqPeriod)}</button>` : ''}</div></div>`;
    const det = `<div class="card ov-det"><div class="card-head"><h3>${esc(W.title)}</h3><div class="ctl">${cs.key === 'closed' ? `<span class="muted small">${esc(W.readOnly)}</span>` : canEd.ok && !edit ? `<button type="button" class="btn small" data-ovedit>${esc(W.edit)}</button>` : ''}</div></div>${edit ? form : view}${per}</div>`;
    /* Plan in use: v · approved · Target · Budget now (original + approved changes) · Plan profit · A&P · Ach · Used · Campaign Tracking › · Open plan › */
    const T = R.planTotals(ver), U2 = CG.use, t = R.budgetTrack(U.seed(), { from: '2000-01-01', to: '2099-12-31', statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: U.today() }).rows[0] || null;
    const sp = R.campaignPace(U.seed(), c.id, U.today()), row = (l, v, sub) => `<div class="ov-r"><span>${esc(l)}</span><b>${esc(v)}</b>${sub ? `<div class="muted small">${esc(sub)}</div>` : ''}</div>`;
    const use = `<div class="card ov-use"><div class="card-head"><h3>${esc(U2.title)}</h3></div><div class="muted small">${esc(U2.approved(ver.v, R.dmy(String(ver.decided_at || '').slice(0, 10)), ver.decided_by || '—'))}</div>` +
      row(U2.target, R.baht(T.target)) + row(U2.budget, R.baht(t ? t.current : T.budget), t ? U2.budgetSub(R.shortBaht(t.original), R.signedShort(t.changes)) : '') + row(U2.profit, R.baht(T.profit)) + row(U2.ap, R.pct(T.ap, 1)) +
      `<div class="ov-line">${esc(U2.line(R.pct(sp && sp.ach), R.pct(t && t.used)))} · <a class="link" href="#tracking/${esc(c.id)}">${esc(CG.toTracking)}</a></div><a class="link" href="#planning/${esc(c.id)}/plan" data-cptab="plan">${esc(U2.open)}</a></div>`;
    /* Open items: the requests waiting (pending · returned) · Close campaign when it ended and is not closed */
    const I = CG.items, open = ((plan.requests) || []).filter(q => q.status === 'pending' || q.status === 'returned');
    const card = q => `<div class="oitem"><span class="apt ${esc(q.type)}">${esc(CG.rq.kind[q.type] || q.type)} #${q.no}</span><span class="oi-s">${esc(reqSummary(q))}</span>${U.apChip(q.status)}<span class="muted small">${esc(`${q.by || '—'} · ${R.dmy(String(q.at || '').slice(0, 10))}`)}</span><button type="button" class="btn small" data-rqopen="${q.no}">${esc(I.open)}</button></div>`;
    const canClose = R.canDo('change', a, plan, changeX(c, plan, 'close')).ok;
    const closeItem = cs.key === 'toclose' ? `<div class="oitem ${cs.late ? 'late' : ''}"><span class="apt close">${esc(I.close)}</span><span class="oi-s">${esc(I.closeSub(R.dmy(cs.due), cs.late ? CG.st.late(cs.late) : ''))}</span>${canClose ? `<button type="button" class="btn small primary" data-chgopen="close">${esc(I.closeBtn)}</button>` : ''}</div>` : '';
    const items = closeItem + open.map(card).join('');
    const L = CG.latest, last = `<div class="card ov-last"><div class="card-head"><h3>${esc(L.title)}</h3><div class="ctl"><a class="link" href="#planning/${esc(c.id)}/history" data-cptab="history">${esc(L.all)}</a></div></div>${U.historyHTML(plan, { limit: 5, chips: false })}</div>`;
    $('cp_main').innerHTML = `<div class="r21 ov1">${det}${use}</div><div class="card ov-items"><div class="card-head"><h3>${esc(I.title)} <span class="hnote">${(closeItem ? 1 : 0) + open.length}</span></h3></div>${items || `<div class="na-none small"><span class="okm">✓</span> ${esc(I.none)}</div>`}</div>${last}`;
    U.periodFit($('ov_period'));
  }
  /* the words of a request in a list (Summary): +฿500,000 · ADS · Nov · End 30/11 → 31/12/2026 · Close · unused ฿0 */
  function reqSummary(q) {
    if (q.type === 'period' || q.type === 'close') return R.reqWords(q);
    const t = R.sumLines(q.lines), l0 = (q.lines || [])[0];
    return `${R.signedShort(t)}${l0 ? ` · ${l0.line} · ${R.monthShort(l0.month)}` : ''}${(q.lines || []).length > 1 ? ` +${q.lines.length - 1}` : ''}`;
  }
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
  /* ---------- §2.5 — Plan of an approved Campaign: the version in use, read only (no stepper) · v1 (in use) ▾ · Compare · Products · Sales target · Budget
     (Original · Approved changes · Current · Spent · Remaining a line) · Forecast & summary ---------- */
  function renderPlanRO(c, plan) {
    const vs = (plan.versions || []).filter(v => v.status === 'approved' || v.status === 'returned' || v.status === 'submitted'), inUse = R.approvedVersion(plan), Pp = CG.plan, S2 = Pp.sections;
    const ver = vs.find(v => v.v === st.ver) || inUse, G = P.grid, sm = R.skuMap(ver), T = R.planTotals(ver);
    const pick = `<label class="ms"><select class="ms-trigger sel" data-cpver aria-label="${esc(Pp.compare)}">${vs.map(v => `<option value="${v.v}"${v.v === ver.v ? ' selected' : ''}>${esc(v.v === inUse.v ? Pp.inUse(v.v) : `${Pp.ver(v.v)} · ${A.state[v.status] || v.status}`)}</option>`).join('')}</select></label>` +
      (vs.length > 1 && ver.v !== inUse.v ? `<button type="button" class="btn small" data-cmp="${Math.min(ver.v, inUse.v)}|${Math.max(ver.v, inUse.v)}">${esc(Pp.compare)}</button>` : vs.length > 1 ? `<button type="button" class="btn small" data-cmp="${vs[vs.length - 2].v}|${inUse.v}">${esc(Pp.compare)}</button>` : '');
    const prod = `<div class="tablewrap"><table class="tbl simple prodtbl"><thead><tr><th>${esc(G.code)}</th><th>${esc(G.product)}</th><th>${esc(SP.p.role)}</th><th class="num">${esc(G.cogs)}</th>${R.CHANNELS.map(k => `<th class="num">${esc(G.price(k))}</th>`).join('')}</tr></thead><tbody>` +
      (ver.skus || []).map(s => `<tr><td><b>${esc(s.code)}</b></td><td>${esc(s.nickname || s.name || '')}</td><td>${esc(SP.p.roles[s.role || 'core'])}</td><td class="num">${esc(s.cogs == null ? C.common.none : R.fmtNum(+s.cogs, 2))}</td>${R.CHANNELS.map(k => `<td class="num">${esc(s.price && s.price[k] !== '' && s.price[k] != null ? R.fmtNum(+s.price[k], 2) : SP.p.notSold)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
    const t = ver.v === inUse.v ? R.budgetTrack(U.seed(), { from: '2000-01-01', to: '2099-12-31', statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: U.today() }).rows[0] : null, TK = G.tracked;
    const bud = t ? `<div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(G.lineCorner)}</th><th class="num">${esc(TK.orig)}</th><th class="num">${esc(TK.changes)}</th><th class="num">${esc(TK.cur)}</th><th class="num">${esc(TK.com)}</th><th class="num">${esc(TK.rem)}</th></tr></thead><tbody>` +
      t.lines.map(l => `<tr><td><span class="muted small">${esc(G.groups[l.type] || l.type)}</span> ${esc(l.line)}</td><td class="num">${esc(R.baht(l.original))}</td><td class="num">${l.changes ? esc(R.signedShort(l.changes)) : ''}</td><td class="num"><b>${esc(R.baht(l.current))}</b></td><td class="num">${esc(R.baht(l.committed))}</td><td class="num${l.current - l.committed < -0.5 ? ' neg' : ''}">${esc(R.baht(l.current - l.committed))}</td></tr>`).join('') +
      `<tr class="total"><td>${esc(C.common.total)}</td><td class="num">${esc(R.baht(t.original))}</td><td class="num">${esc(R.signedShort(t.changes))}</td><td class="num">${esc(R.baht(t.current))}</td><td class="num">${esc(R.baht(t.committed))}</td><td class="num">${esc(R.baht(t.current - t.committed))}</td></tr></tbody></table></div>`
      : `<div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(G.lineCorner)}</th><th class="num">${esc(TK.orig)}</th></tr></thead><tbody>${[...T.byLine].map(([k, o]) => `<tr><td>${esc(k.split('|')[1])}</td><td class="num">${esc(R.baht(o.amount))}</td></tr>`).join('')}</tbody></table></div>`;
    $('cp_main').innerHTML = `<div class="toolbar cpro-tools">${pick}</div><div class="card"><div class="card-head"><h3>${esc(P.sum.plan)} <span class="hnote">${esc(P.v(ver.v))}</span></h3></div>${planTiles(T)}</div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S2.products)}</h3></div>${prod}</div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S2.budget)}</h3></div>${bud}</div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S2.summary)}</h3></div>${summaryHTML(ver, c, 'ro')}</div>`;
    drawSummary(ver, c, 'ro'); void sm;
  }
  /* a step of the budget lines (5a 5b 5c) in its card: department · who · Due · status */
  function stepCell(plan, k) {
    const s = R.stepState(plan, k, U.today()), stc = s.status === 'done' ? 'done' : s.status === 'returned' ? 'ret' : s.status === 'in_progress' ? 'prog' : s.open ? 'open' : 'wait';
    const flags = [s.overdue ? `<span class="chip err">${esc(SP.overdue(s.daysLate))}</span>` : s.soon ? `<span class="chip warn">${esc(SP.dueSoon)}</span>` : '', s.refresh ? `<span class="chip warn">${esc(SP.refresh)}</span>` : ''].join('');
    return `<span class="sd ${stc}" aria-hidden="true">${s.status === 'done' ? '✓' : s.status === 'returned' ? '↩' : s.num}</span><span class="sx"><b>${esc(SP.names[k])}</b><span class="muted small sw">${esc(SP.dept[s.dept])} · ${s.assignee ? U.avatar(s.assignee, true) : ''}${esc(s.assignee || '—')}${s.due ? ' · ' + esc(SP.due(R.dmy(s.due))) : ''}</span>` +
      `<span class="ss">${esc(SP.state[s.status])}${s.open || s.status === 'done' ? '' : ' · ' + esc(SP.waiting)}</span>${flags}</span>`;
  }
  /* ---------- CR-13 §7.2 — the stepper in one row (≤ 72 px): ① name ✓ ─ ② … · under the name: who · Due (red when late) · step 5 = 3 dots (5a 5b 5c) ·
     the tooltip: department · who · Due · the state in full · < 1280 px it scrolls sideways ---------- */
  const pdCls = s => (s.status === 'done' ? 'done' : s.status === 'returned' ? 'ret' : s.status === 'in_progress' ? 'prog' : 'todo');
  function stepperHTML(plan) {
    return PAGES.map((pg, i) => {
      const ks = PAGE_STEPS[pg], on = pg === st.page, S = ks.map(k => R.stepState(plan, k, U.today())), s0 = S[0], n = S.length, done = S.filter(s => s.status === 'done').length;
      const cls = n > 1 ? (done === n ? 'done' : S.some(s => s.status === 'returned') ? 'ret' : S.some(s => s.status !== 'not_started') ? 'prog' : S.some(s => s.open) ? 'open' : 'wait')
        : s0.status === 'done' ? 'done' : s0.status === 'returned' ? 'ret' : s0.status === 'in_progress' ? 'prog' : s0.open ? 'open' : 'wait';
      const late = S.some(s => s.overdue), flag = S.some(s => s.refresh || s.env);
      const tip = S.map(s => `${s.num} ${SP.names[s.key]} · ${SP.dept[s.dept]} · ${s.assignee || '—'}${s.due ? ' · ' + SP.due(R.dmy(s.due)) : ''} · ${SP.state[s.status]}${s.auto ? '' : ''}${s.overdue ? ' · ' + SP.overdue(s.daysLate) : ''}${s.refresh ? ' · ' + SP.refresh : ''}${s.env ? ' · ' + SP.envChanged : ''}`).join('\n');
      const sub = n > 1 ? `<span class="s7dots">${S.map(s => `<i class="pd ${pdCls(s)}${s.overdue ? ' late' : ''}"></i>`).join('')}</span><span>${done}/${n}</span>`
        : `<span>${esc(s0.assignee || '—')}</span>${s0.due && s0.status !== 'done' ? `<span class="${late ? 'neg' : ''}">· ${esc(R.dmy(s0.due).slice(0, 5))}</span>` : ''}`;
      return `${i ? '<span class="s7l" aria-hidden="true"></span>' : ''}<a class="s7 ${cls}${on ? ' on' : ''}${late ? ' late' : ''}" href="#planning/${esc(st.id)}/plan/${pg}" data-cppage="${pg}" title="${esc(tip)}"${on ? ' aria-current="step"' : ''}>` +
        `<span class="s7n" aria-hidden="true">${cls === 'done' ? '✓' : cls === 'ret' ? '↩' : i + 1}</span><span class="s7t"><b>${esc(SP.pages[pg])}${flag ? ' <i class="s7f" aria-hidden="true"></i>' : ''}</b><span class="s7w">${sub}</span></span></a>`; }).join('');
  }

  /* ---------- CR-13 §7.3 (D123) — Target builder (above the grid · open while the grid is empty): Start from (Blank · Copy mix from) · Full target ฿ ·
     Channel split (the channels of step 1, 100%) · SKU split (Hero 2 · Core 1 · GWP 0 parts · a SKU not sold in a channel = 0 there) · Month curve
     (Even · Launch · Follow marketing · Custom) → Fill the grid: qty = round(฿ ÷ the net price of the channel) · kept with the version (ver.builder) ---------- */
  const B3 = () => SP.tb, ROLE_W = { hero: 2, core: 1, gwp: 0 };
  function skuDefault(skus) { const w = skus.map(s => ROLE_W[s.role || 'core'] ?? 1), t = w.reduce((a, b) => a + b, 0) || 1; return Object.fromEntries(skus.map((s, i) => [s.code, Math.round(w[i] / t * 1000) / 10])); }
  function builderOf(F) {
    const chs = F.details.channels, b = F.builder || {}, d = {};
    d.from = b.from || 'blank'; d.copy = b.copy || ''; d.full = b.full != null ? b.full : ''; d.curve = b.curve || 'even'; d.custom = b.custom || {}; d.filled = b.filled || null; d.edited = !!b.edited;
    d.ch = Object.fromEntries(chs.map(k => [k, b.ch && b.ch[k] != null ? b.ch[k] : Math.round(1000 / chs.length) / 10]));
    const def = skuDefault(F.skus); d.sku = Object.fromEntries(F.skus.map(s => [s.code, b.sku && b.sku[s.code] != null ? b.sku[s.code] : def[s.code]]));
    return d;
  }
  function curveW(B, c, ms) {
    const em = c.end_marketing ? R.ym(c.end_marketing) : R.ym(c.end);
    const w = ms.map((m, i) => (B.curve === 'launch' ? (i === 0 ? 0.6 : m <= em ? 1 : 0.5) : B.curve === 'follow' ? (m <= em ? 1 : 0.45) : B.curve === 'custom' ? Math.max(0, +(B.custom[m] || 0)) : 1));
    const t = w.reduce((a, b) => a + b, 0) || 1; return w.map(x => x / t);
  }
  /* Copy mix from an approved plan: its channel shares · its shares by role (spread on the SKUs of the same role here) · its month curve fitted to these months */
  function mixFrom(xid, c) {
    const p = planOf(xid), v = p && R.approvedVersion(p), F = st.F; if (!v) return null;
    const T = R.planTotals(v), sm = R.skuMap(v), chs = F.details.channels, ct = chs.reduce((a, k) => a + ((T.byChannel[k] || {}).amount || 0), 0) || 1;
    const ch = Object.fromEntries(chs.map(k => [k, Math.round(((T.byChannel[k] || {}).amount || 0) / ct * 1000) / 10]));
    const byRole = { hero: 0, core: 0, gwp: 0 }; v.target.forEach(r => { const s = sm.get(r.code), a = R.rowAmount(r, s) || 0; byRole[(s && s.role) || 'core'] += a; });
    const here = { hero: 0, core: 0, gwp: 0 }; F.skus.forEach(s => { here[s.role || 'core']++; });
    const rt = Object.keys(byRole).reduce((a, k) => a + (here[k] ? byRole[k] : 0), 0) || 1;
    const sku = Object.fromEntries(F.skus.map(s => { const r = s.role || 'core'; return [s.code, here[r] ? Math.round(byRole[r] / rt / here[r] * 1000) / 10 : 0]; }));
    const xm = [...T.byMonth].filter(([, o]) => o.amount > 0).sort((a, b) => a[0].localeCompare(b[0])).map(([, o]) => o.amount), ms = months(c), custom = {};
    ms.forEach((m, j) => { custom[m] = xm.length ? Math.round(xm[Math.min(xm.length - 1, Math.floor((j + 0.5) / ms.length * xm.length))] / Math.max(...xm) * 100) : 100; });
    return { ch, sku, custom };
  }
  function builderHTML(c, plan, ed) {
    const F = st.F, B = builderOf(F), W = B3(), dis = ed ? '' : ' disabled', chs = F.details.channels, ms = months(c), w = curveW(B, c, ms), mx = Math.max(...w, 0.0001);
    const chSum = chs.reduce((a, k) => a + (+B.ch[k] || 0), 0), skSum = F.skus.reduce((a, s) => a + (+B.sku[s.code] || 0), 0);
    const others = allCamps().filter(x => x.id !== c.id && x.approval === 'approved').sort((a, b) => b.start.localeCompare(a.start));
    const open = st.bOpen != null ? st.bOpen : !R.planTotals(liveVer()).qty;
    const filled = B.filled ? `<div class="tb-res"><span>${esc(W.res(R.baht(B.filled.grid), R.baht(B.filled.total), R.signedShort(B.filled.grid - B.filled.total)))}</span>${B.edited ? ` <span class="chip warn">${esc(W.edited)}</span>` : ''}</div>` : '';
    return `<details class="card tbuild" id="cp_tb"${open ? ' open' : ''}><summary><b>${esc(W.title)}</b> <span class="muted small">${esc(W.sub)}</span>${B.edited ? ` <span class="chip warn">${esc(W.edited)}</span>` : ''}</summary><div class="tb-body">` +
      `<div class="tb-row"><span class="tb-l">${esc(W.from)}</span><label class="chk"><input type="radio" name="tb_from" data-tbfrom="blank"${B.from === 'blank' ? ' checked' : ''}${dis}><span>${esc(W.blank)}</span></label>` +
      `<label class="chk"><input type="radio" name="tb_from" data-tbfrom="copy"${B.from === 'copy' ? ' checked' : ''}${dis}><span>${esc(W.copy)}</span></label><select class="inp sm" data-tbcopy${dis}${B.from === 'copy' ? '' : ' disabled'}><option value="">—</option>${others.map(x => `<option value="${esc(x.id)}"${x.id === B.copy ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` +
      `<div class="tb-row"><label class="tb-l" for="tb_full">${esc(W.full)}</label><input id="tb_full" class="inp sm num tb-full" data-tbfull inputmode="decimal" value="${esc(B.full === '' ? '' : R.fmtNum(+B.full))}"${dis}></div>` +
      `<div class="tb-row"><span class="tb-l">${esc(W.ch)}</span>${chs.map(k => `<label class="tb-pin"><span>${esc(C.channel[k])}</span><input class="inp sm num" data-tbch="${k}" inputmode="decimal" value="${esc(B.ch[k])}"${dis}><span class="muted">%</span></label>`).join('')}<span class="tb-sum ${Math.abs(chSum - 100) < 0.05 ? 'okx' : 'neg'}">${esc(W.sum(R.fmtNum(Math.round(chSum * 10) / 10)))}</span></div>` +
      `<div class="tb-row tb-sku"><span class="tb-l">${esc(W.sku)}</span><div class="tb-skus">${F.skus.map(s => `<label class="tb-pin"><span>${esc(s.nickname || s.code)} <span class="muted small">${esc(SP.p.roles[s.role || 'core'])}</span></span><input class="inp sm num" data-tbsku="${esc(s.code)}" inputmode="decimal" value="${esc(B.sku[s.code])}"${dis}><span class="muted">%</span></label>`).join('')}</div><span class="tb-sum ${Math.abs(skSum - 100) < 0.05 ? 'okx' : 'neg'}">${esc(W.sum(R.fmtNum(Math.round(skSum * 10) / 10)))}</span></div>` +
      `<div class="tb-row"><span class="tb-l">${esc(W.curve)}</span>${U.segHTML('data-tbcurve', ['even', 'launch', 'follow', 'custom'].map(v => ({ v, label: W.curves[v] })), B.curve)}` +
      `<span class="tb-bars" aria-hidden="true">${w.map((x, i) => `<i style="height:${Math.round(4 + x / mx * 24)}px" title="${esc(`${R.monthName(ms[i])} ${R.pct(x, 1)}`)}"></i>`).join('')}</span></div>` +
      (B.curve === 'custom' ? `<div class="tb-row tb-cust">${ms.map(m => `<label class="tb-pin"><span>${esc(R.monthShort(m))}</span><input class="inp sm num" data-tbcust="${m}" inputmode="decimal" value="${esc(B.custom[m] != null ? B.custom[m] : 100)}"${dis}></label>`).join('')}</div>` : '') +
      `<div class="tb-row tb-act">${ed ? `<button type="button" class="btn primary small" data-tbfill>${esc(W.fill)}</button>` : ''}<span class="ferr" id="tb_e"></span>${filled}</div></div></details>`;
  }
  function readBuilder() {
    const F = st.F, B = builderOf(F), b = $('cp_tb'); if (!b) return B;
    const f = b.querySelector('[data-tbfull]'); if (f) { const v = U.parseNum(f.value); B.full = v == null || Number.isNaN(v) ? '' : v; }
    b.querySelectorAll('[data-tbch]').forEach(x => { const v = U.parseNum(x.value); B.ch[x.dataset.tbch] = v == null || Number.isNaN(v) ? 0 : v; });
    b.querySelectorAll('[data-tbsku]').forEach(x => { const v = U.parseNum(x.value); B.sku[x.dataset.tbsku] = v == null || Number.isNaN(v) ? 0 : v; });
    b.querySelectorAll('[data-tbcust]').forEach(x => { const v = U.parseNum(x.value); B.custom[x.dataset.tbcust] = v == null || Number.isNaN(v) ? 0 : v; });
    const r = b.querySelector('[data-tbfrom]:checked'); if (r) B.from = r.dataset.tbfrom; const cp = b.querySelector('[data-tbcopy]'); if (cp) B.copy = cp.value;
    F.builder = B; return B;
  }
  /* Fill the grid: ฿ of a cell = Full × channel % × the SKU's share among the SKUs sold in that channel × the month weight · qty = round(฿ ÷ net price) */
  async function fillGrid(c, plan) {
    const F = st.F, B = readBuilder(), W = B3(), e = $('tb_e'), chs = F.details.channels, ms = months(c), w = curveW(B, c, ms), full = +B.full || 0;
    const chSum = chs.reduce((a, k) => a + (+B.ch[k] || 0), 0), skSum = F.skus.reduce((a, s) => a + (+B.sku[s.code] || 0), 0);
    if (!(full > 0)) { if (e) e.textContent = W.errFull; return; }
    if (Math.abs(chSum - 100) > 0.05) { if (e) e.textContent = W.errCh; return; }
    if (Math.abs(skSum - 100) > 0.05) { if (e) e.textContent = W.errSku; return; }
    if (R.planTotals(liveVer()).qty > 0 && !(await U.confirmDialog(W.replaceQ, W.replaceBody, W.replace, false, C.common.cancel))) return;
    const q = new Map(); let grid = 0;
    chs.forEach(ch => { const sold = F.skus.filter(s => { const p = R.priceOf(s, ch); return p != null && p > 0; }), st2 = sold.reduce((a, s) => a + (+B.sku[s.code] || 0), 0);
      if (!st2) return; const chAmt = full * (+B.ch[ch] || 0) / 100;
      sold.forEach(s => { const share = (+B.sku[s.code] || 0) / st2, p = R.priceOf(s, ch);
        ms.forEach((m, i) => { const n = Math.round(chAmt * share * w[i] / p); if (n) { q.set(`${s.code}|${ch}|${m}`, n); grid += n * p; } }); }); });
    [...F.q.keys()].forEach(k => F.q.delete(k)); F.amt.clear(); q.forEach((v, k) => F.q.set(k, v));
    B.filled = { total: full, grid: Math.round(grid), at: at() }; B.edited = false; F.builder = B; st.bOpen = true; touch('3'); renderTarget(c, plan);
  }

  /* ---------- CR-13 §7.4 — 4 · Budget envelope (the owner): a group = % of the target ↔ ฿ · Phasing · Reference (the average of the approved plans of the same
     category — none → every category) · No expense · the Plan P&L at the side uses the envelope here · A&P > 20% = the warning of before ---------- */
  const EG = ['marketing', 'sales', 'other'], GK = { marketing: 'mkt', sales: 'sls', other: 'oth' };
  function envLive() {
    const F = st.F, ver = liveVer(), E0 = R.envOf(ver), T = R.planTotals(ver);
    if (!F.envelope) F.envelope = Object.fromEntries(EG.map(g => [g, { amount: Math.round(E0[g].amount || 0), phasing: E0[g].phasing, none: E0[g].none }]));
    return Object.fromEntries(EG.map(g => { const e = F.envelope[g], amount = e.none ? 0 : +e.amount || 0; return [g, Object.assign({}, e, { amount, pct: R.ratio(amount, T.target), lines: E0[g].lines, left: amount - E0[g].lines, derived: E0[g].derived && !(F.ver && F.ver.envelope) }) ]; }));
  }
  function envRef(cat, id) {
    const P0 = CP.store.data().plans || {}, rows = [];
    allCamps().forEach(x => { if (x.id === id || x.approval !== 'approved') return; const v = R.approvedVersion(P0[x.id]); if (!v) return; const T = R.planTotals(v); if (!(T.target > 0)) return;
      rows.push({ cat: (v.details && v.details.category) || '', mkt: T.mkt / T.target, sls: T.sls / T.target, oth: T.oth / T.target }); });
    const same = rows.filter(r => cat && r.cat === cat), use = same.length ? same : rows, avg = k => (use.length ? use.reduce((a, r) => a + r[k], 0) / use.length : null);
    return { n: use.length, same: !!same.length, cat, marketing: avg('mkt'), sales: avg('sls'), other: avg('oth') };
  }
  function renderEnvelope(c, plan) {
    const F = st.F, ed = !ro(plan, 'env'), dis = ed ? '' : ' disabled', W = SP.env, E = envLive(), T = R.planTotals(liveVer()), ref = envRef(F.details.category, c.id), G = P.grid.groups;
    const tot = EG.reduce((a, g) => a + E[g].amount, 0), s = R.stepState(plan, 'env', U.today());
    const row = g => `<tr data-envg="${g}"><td><b>${esc(G[g])}</b></td><td class="num"><input class="inp sm num" data-envpct="${g}" inputmode="decimal" value="${esc(E[g].none ? 0 : Math.round((E[g].pct || 0) * 1000) / 10)}"${dis || (E[g].none ? ' disabled' : '')}> %</td>` +
      `<td class="num"><input class="inp sm num" data-envamt="${g}" inputmode="decimal" value="${esc(E[g].none ? 0 : R.fmtNum(E[g].amount))}"${dis || (E[g].none ? ' disabled' : '')}></td>` +
      `<td><select class="inp sm" data-envph="${g}"${dis}>${['mkt', 'sales', 'even'].map(p => `<option value="${p}"${E[g].phasing === p ? ' selected' : ''}>${esc(W.ph[p])}</option>`).join('')}</select></td>` +
      `<td class="num muted" data-envref="${g}">${ref[g] == null ? '—' : esc(`${R.pct(ref[g], 1)} · ${R.shortBaht(ref[g] * T.target)}`)}</td><td><label class="chk"><input type="checkbox" data-envnone="${g}"${E[g].none ? ' checked' : ''}${dis}><span>${esc(SP.b.none)}</span></label></td></tr>`;
    $('cp_body').innerHTML = roNote(plan, 'env') + (s.refresh ? `<div class="nsband warnb"><span class="nsb-t">${esc(W.refresh)}</span></div>` : '') +
      `<div class="card"><div class="card-head"><h3>${labelInfo(SP.names.env, W.tip)}</h3><div class="ctl"><span class="muted small">${esc(W.of(R.baht(T.target)))}</span></div></div>` +
      `<div class="tablewrap"><table class="tbl simple envtbl"><thead><tr><th>${esc(W.cols.group)}</th><th class="num">${esc(W.cols.pct)}</th><th class="num">${esc(W.cols.amount)}</th><th>${esc(W.cols.phasing)}</th><th class="num">${labelInfo(W.cols.ref, W.refTip(ref.same ? ref.cat : W.allCat, ref.n))}</th><th></th></tr></thead>` +
      `<tbody>${EG.map(row).join('')}<tr class="total"><td>${esc(W.total)}</td><td class="num" data-envtotpct>${esc(R.pct(R.ratio(tot, T.target), 1))}</td><td class="num" data-envtot>${esc(R.baht(tot))}</td><td></td><td></td><td></td></tr></tbody></table></div>` +
      `<div class="muted small cp-keys">${esc(W.note)}</div>${R.ratio(tot, T.target) > 0.2 ? `<div class="nsband warnb"><span class="nsb-t">${esc(SP.f.warn.apHigh(R.pct(R.ratio(tot, T.target), 1)))}</span></div>` : ''}</div>`;
  }
  /* typed % → ฿ (or ฿ → %) · No expense → 0 */
  function readEnvelope(src) {
    const F = st.F, T = R.planTotals(liveVer()), b = $('cp_body'); envLive();
    EG.forEach(g => { const e = F.envelope[g], pc = b.querySelector(`[data-envpct="${g}"]`), am = b.querySelector(`[data-envamt="${g}"]`), ph = b.querySelector(`[data-envph="${g}"]`), no = b.querySelector(`[data-envnone="${g}"]`);
      if (no) e.none = no.checked; if (ph) e.phasing = ph.value;
      if (src && src.matches(`[data-envpct="${g}"]`)) { const v = U.parseNum(pc.value); e.amount = v == null || Number.isNaN(v) ? 0 : Math.round(T.target * v / 100); }
      else if (src && src.matches(`[data-envamt="${g}"]`)) { const v = U.parseNum(am.value); e.amount = v == null || Number.isNaN(v) ? 0 : Math.round(v); }
      if (e.none) e.amount = 0; });
  }

  /* ---------- CR-13 §7.4 — 5 · Budget lines: the head of a group = Envelope · Allocated · Left (a bar · over in orange) · the envelope guides (D122): over / under =
     a warning, Mark step done still works · + Line from list · Spread (a total on a line: Even · Until End marketing · Follow sales target) · Fill the rest ---------- */
  function envHead(g) {
    const W = SP.env, E = envLive()[g], alloc = E.lines, env = E.amount, over = alloc - env, pct = env > 0 ? Math.min(1, alloc / env) : alloc > 0 ? 1 : 0;
    const warn = env > 0 && Math.abs(over) > 0.5 ? `<span class="chip warn" data-envwarn="${g}">${esc(over > 0 ? W.over(R.baht(over)) : W.under(R.baht(-over)))}</span>` : '';
    return `<div class="envh" data-envh="${g}"><span>${esc(W.head(R.baht(env), R.baht(alloc), R.baht(Math.max(0, env - alloc))))}</span><span class="envbar" aria-hidden="true"><i class="ok" style="width:${(pct * 100).toFixed(1)}%"></i>${over > 0.5 && env > 0 ? `<i class="ov" style="width:${Math.min(100, over / env * 100).toFixed(1)}%"></i>` : ''}</span>${warn}</div>`;
  }
  function lineTools(k) {
    const type = GROUP_OF[k], ls = st.F.lines.filter(l => l.type === type), W = SP.env; if (!ls.length) return '';
    const sel = attr => `<select class="inp sm" ${attr}>${ls.map(l => `<option>${esc(l.line)}</option>`).join('')}</select>`;
    return `<div class="ltools"><span class="lt-g"><b>${esc(W.spread)}</b>${sel(`data-spl="${k}"`)}<input class="inp sm num" data-spt="${k}" inputmode="decimal" placeholder="${esc(W.totalPh)}" aria-label="${esc(W.totalPh)}"><select class="inp sm" data-spm="${k}">${['even', 'mkt', 'sales'].map(p => `<option value="${p}">${esc(W.ph[p])}</option>`).join('')}</select><button type="button" class="btn small" data-spgo="${k}">${esc(W.spreadBtn)}</button></span>` +
      `<span class="lt-g"><b>${esc(W.rest)}</b>${sel(`data-frl="${k}"`)}<button type="button" class="btn small" data-frgo="${k}">${esc(W.restBtn)}</button></span></div>`;
  }
  const targetByMonth = () => { const m = new Map(); R.planTotals(liveVer()).byMonth.forEach((o, k) => m.set(k, o.amount || 0)); return m; };
  function spreadLine(c, k, line, total, method) {
    const type = GROUP_OF[k], ms = bmonths(c), w = R.phaseWeights(ms, c, method, targetByMonth()), v = R.spreadWhole(total, w), key = `${type}|${line}`;
    if (!st.F.bud.has(key)) st.F.bud.set(key, new Map()); const m = st.F.bud.get(key); m.clear(); ms.forEach((x, i) => { if (v[i]) m.set(x, v[i]); }); touch(k);
  }
  function fillRest(c, k, line) {
    const type = GROUP_OF[k], E = envLive()[type], rest = Math.round(E.amount - E.lines); if (rest <= 0) { U.toast(SP.env.noRest); return; }
    const ms = bmonths(c), w = R.phaseWeights(ms, c, E.phasing, targetByMonth()), v = R.spreadWhole(rest, w), key = `${type}|${line}`;
    if (!st.F.bud.has(key)) st.F.bud.set(key, new Map()); const m = st.F.bud.get(key); ms.forEach((x, i) => { if (v[i]) m.set(x, (m.get(x) || 0) + v[i]); }); touch(k);
  }

  /* ---------- CR-13 §7.5 (D124) — Forecast & summary: by SKU · by channel · by month (target bars · the budget stacked · the running plan profit · End marketing) —
     one set for step 6 · step 7 · the review of the Executive · the Plan tab of an approved plan ---------- */
  function summaryHTML(ver, c, key, o = {}) {
    const W = SP.sum, T = R.planTotals(ver), sm = R.skuMap(ver), pc = v => R.pct(v, 1);
    const skus = [...T.bySku].map(([code, x]) => ({ code, s: sm.get(code) || {}, x })).sort((a, b) => b.x.amount - a.x.amount);
    const byS = `<div class="tablewrap"><table class="tbl simple sumtbl" data-sumsku><thead><tr><th>${esc(W.sku)}</th><th>${esc(SP.p.role)}</th><th class="num">${esc(W.qty)}</th><th class="num">${esc(W.target)}</th><th class="num">${esc(W.share)}</th><th class="num">COGS</th><th class="num">${esc(W.gp)}</th><th class="num">GP %</th></tr></thead><tbody>` +
      skus.map(r => `<tr><td>${esc(r.s.nickname || r.s.name || r.code)} <span class="muted small">${esc(r.code)}</span></td><td>${esc(SP.p.roles[r.s.role || 'core'])}</td><td class="num">${esc(R.fmtNum(Math.round(r.x.qty)))}</td><td class="num" data-v="${r.x.amount}">${esc(R.baht(r.x.amount))}</td><td class="num">${esc(pc(R.ratio(r.x.amount, T.target)))}</td><td class="num">${esc(R.baht(r.x.cogs))}</td><td class="num">${esc(R.baht(r.x.amount - r.x.cogs))}</td><td class="num">${esc(pc(R.ratio(r.x.amount - r.x.cogs, r.x.amount)))}</td></tr>`).join('') +
      `<tr class="total"><td>${esc(C.common.total)}</td><td></td><td class="num">${esc(R.fmtNum(Math.round(T.qty)))}</td><td class="num" data-v="${T.target}">${esc(R.baht(T.target))}</td><td class="num">100.0%</td><td class="num">${esc(R.baht(T.cogs))}</td><td class="num">${esc(R.baht(T.gp))}</td><td class="num" data-gppct="${T.gpPct}">${esc(pc(T.gpPct))}</td></tr></tbody></table></div>`;
    const chs = R.CHANNELS.filter(k => T.byChannel[k]);
    const byC = `<div class="tablewrap"><table class="tbl simple sumtbl" data-sumch><thead><tr><th>${esc(W.ch)}</th><th class="num">${esc(W.target)}</th><th class="num">${esc(W.share)}</th><th class="num">${esc(W.qty)}</th><th class="num">COGS</th><th class="num">${esc(W.gp)}</th><th class="num">GP %</th></tr></thead><tbody>` +
      chs.map(k => { const x = T.byChannel[k]; return `<tr><td><b>${esc(C.channel[k])}</b> <span class="muted small">${esc(C.channelLong[k])}</span></td><td class="num" data-v="${x.amount}">${esc(R.baht(x.amount))}</td><td class="num">${esc(pc(R.ratio(x.amount, T.target)))}</td><td class="num">${esc(R.fmtNum(Math.round(x.qty)))}</td><td class="num">${esc(R.baht(x.cogs))}</td><td class="num">${esc(R.baht(x.amount - x.cogs))}</td><td class="num">${esc(pc(R.ratio(x.amount - x.cogs, x.amount)))}</td></tr>`; }).join('') +
      `<tr class="total"><td>${esc(C.common.total)}</td><td class="num">${esc(R.baht(T.target))}</td><td class="num">100.0%</td><td class="num">${esc(R.fmtNum(Math.round(T.qty)))}</td><td class="num">${esc(R.baht(T.cogs))}</td><td class="num">${esc(R.baht(T.gp))}</td><td class="num">${esc(pc(T.gpPct))}</td></tr></tbody></table></div>`;
    const leg = `<div class="legend"><span><i class="bar" style="--sw:var(--rev)"></i>${esc(W.target)}</span><span><i class="bar" style="--sw:var(--mkt)"></i>${esc(P.grid.groups.marketing)}</span><span><i class="bar" style="--sw:var(--sls)"></i>${esc(P.grid.groups.sales)}</span><span><i class="bar" style="--sw:var(--oth)"></i>${esc(P.grid.groups.other)}</span><span><i class="ln" style="--sw:var(--text)"></i>${esc(W.run)}</span></div>`;
    const month = `<div class="sumh"><b>${esc(W.byMonth)}</b>${leg}</div><div class="chartbox" id="sm_${key}_box"><svg id="sm_${key}_svg" role="img" aria-label="${esc(W.byMonth)}"></svg><div class="tip" id="sm_${key}_tip"></div></div>`;
    return `<div class="sumset" data-sumset="${key}"><div class="sumh"><b>${esc(W.bySku)}</b></div>${byS}<div class="sumh"><b>${esc(W.byCh)}</b></div>${byC}${o.noMonth ? '' : month}</div>`;
  }
  function drawSummary(ver, c, key) {
    const svg = $(`sm_${key}_svg`), box = $(`sm_${key}_box`), tip = $(`sm_${key}_tip`); if (!svg || !box) return;
    const T = R.planTotals(ver), ms = R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end).filter(m => T.byMonth.has(m) || (m >= R.ym(c.start)));
    const rows = ms.map(m => { const o = T.byMonth.get(m) || { amount: 0, cogs: 0, mkt: 0, sls: 0, oth: 0 }; return { m, t: o.amount || 0, mkt: o.mkt || 0, sls: o.sls || 0, oth: o.oth || 0, p: (o.amount || 0) - (o.cogs || 0) - (o.mkt || 0) - (o.sls || 0) - (o.oth || 0) }; });
    let run = 0; rows.forEach(r => { run += r.p; r.run = run; });
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim(), W = Math.max(300, Math.round(box.clientWidth || 700)), H = 260, m = { l: 64, r: 10, t: 22, b: 40 }, ih = H - m.t - m.b;
    const vals = rows.flatMap(r => [r.t, r.mkt + r.sls + r.oth, r.run]).concat([0]), hi = Math.max(...vals), lo = Math.min(...vals), stp = R.niceStep((hi - lo) / 4 || 1);
    const yMax = hi > 0 ? stp * Math.ceil(hi * 1.05 / stp) : 0, yMin = lo < 0 ? -stp * Math.ceil(-lo * 1.05 / stp) : 0, yt = []; for (let v = yMin; v <= yMax + 1e-6; v += stp) yt.push(v);
    const axf = v => U.trimMoney(R.compact(Math.abs(v) < 1e-6 ? 0 : v)); m.l = U.axisLeft(svg, yt.map(axf));
    const iw = W - m.l - m.r, band = iw / Math.max(1, rows.length), bw = Math.max(4, Math.min(26, band * 0.34)), cx = i => m.l + band * i + band / 2, y = v => m.t + (yMax - v) / (yMax - yMin || 1) * ih;
    let g = ''; yt.forEach(v => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${css('--grid')}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${esc(axf(v))}</text>`; });
    const rect = (x, a, b2, col) => { const t2 = Math.min(y(a), y(b2)), h = Math.abs(y(a) - y(b2)); return h > 0.2 ? `<rect x="${x.toFixed(1)}" y="${t2.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>` : ''; };
    rows.forEach((r, i) => { const x0 = cx(i) - bw - 1; g += rect(x0, 0, r.t, css('--rev')); let acc = 0; [['mkt', '--mkt'], ['sls', '--sls'], ['oth', '--oth']].forEach(([k, col]) => { g += rect(cx(i) + 1, acc, acc + r[k], css(col)); acc += r[k]; });
      if (!i || r.m.slice(5) === '01' || !(i % Math.max(1, Math.ceil(34 / band)))) g += `<text x="${cx(i)}" y="${m.t + ih + 16}" text-anchor="middle" class="mon">${esc(R.monthShort(r.m))}</text>`;
      if (!i || r.m.slice(5) === '01') g += `<text x="${cx(i)}" y="${m.t + ih + 31}" text-anchor="middle" class="yr">${r.m.slice(0, 4)}</text>`; });
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${css('--border-strong')}"/>`;
    g += `<path d="${rows.map((r, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(r.run).toFixed(1)}`).join(' ')}" fill="none" stroke="${css('--text')}" stroke-width="2.2" data-sumrun="${run}"/>`;
    if (c.end_marketing) { const i = rows.findIndex(r => r.m === R.ym(c.end_marketing)); if (i >= 0) { const d = +c.end_marketing.slice(8, 10), nd = +R.monthLast(rows[i].m).slice(8, 10), vx = m.l + band * i + band * (d / nd);
      g += `<line x1="${vx.toFixed(1)}" x2="${vx.toFixed(1)}" y1="${m.t - 10}" y2="${m.t + ih}" stroke="${css('--text')}" stroke-dasharray="2 3"/><text x="${(vx + 4).toFixed(1)}" y="${m.t - 12}" class="today-l vl">${esc(C.mon.burn2.endMkt)}</text>`; } }
    const hits = rows.map((r, i) => `<rect class="hit" data-i="${i}" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent"/>`).join('');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.innerHTML = `<g>${hits}</g><g style="pointer-events:none">${g}</g>`;
    const S = SP.sum;
    svg.querySelectorAll('.hit').forEach(h => { const r = rows[+h.dataset.i]; const show = () => { tip.innerHTML = `<div class="h">${esc(R.monthName(r.m))}</div>` + [[S.target, r.t], [P.grid.groups.marketing, r.mkt], [P.grid.groups.sales, r.sls], [P.grid.groups.other, r.oth], [S.profit, r.p], [S.run, r.run]].map(([l, v]) => `<div class="r"><span>${esc(l)}</span><b>${esc(R.baht(v))}</b></div>`).join('');
      const bx = box.getBoundingClientRect(), sc = bx.width / W; let left = cx(+h.dataset.i) * sc + 12; if (left + 220 > bx.width) left = cx(+h.dataset.i) * sc - 232; tip.style.left = Math.max(0, left) + 'px'; tip.style.top = (m.t + 4) + 'px'; tip.classList.add('show'); };
      h.addEventListener('pointerenter', show); h.addEventListener('pointerleave', () => tip.classList.remove('show')); });
  }
  /* ---------- the side panel: the Plan P&L live + the checks of this step ---------- */
  function renderSide() {
    const box = $('cp_side'), plan = planOf(st.id), c = campOf(st.id); if (!box || !plan || !c) return;
    const T = Object.assign({}, R.planTotals(liveVer())), S = SP.side, row = (l, v, cls) => `<div class="ps-r${cls ? ' ' + cls : ''}"><span>${esc(l)}</span><b>${esc(v)}</b></div>`;
    /* CR-13 §7.4 — the envelope step: the Plan P&L from the target × COGS less the envelope */
    if (st.page === 'envelope') { const E = envLive(); T.mkt = E.marketing.amount; T.sls = E.sales.amount; T.oth = E.other.amount; T.budget = T.mkt + T.sls + T.oth; T.ap = R.ratio(T.budget, T.target); T.profit = T.gp - T.budget; T.margin = R.ratio(T.profit, T.target); T.roi = R.ratio(T.profit, T.budget); }
    const lp = livePlan(plan), checks = PAGE_STEPS[st.page].flatMap(k => R.stepChecks(lp, k, c).list.map(x => Object.assign({ step: k }, x)));
    box.innerHTML = `<div class="ps-h">${esc(S.title)}</div>` + row(S.target, R.baht(T.target)) + row(S.gp, R.pct(T.gpPct, 1)) + row(S.mkt, R.baht(T.mkt)) + row(S.sls, R.baht(T.sls)) + row(S.oth, R.baht(T.oth)) +
      row(S.ap, R.pct(T.ap, 1), T.ap > 0.2 ? 'warn' : '') + row(S.profit, R.baht(T.profit), T.profit < 0 ? 'neg' : 'major') + row(S.margin, R.pct(T.margin, 1)) + row(S.roi, R.times(T.roi)) +
      `<div class="ps-h">${esc(S.checks)}</div><ul class="checks2">${checks.map(x => `<li class="${x.ok ? 'ok' : 'err'}"><span class="ci">${x.ok ? '✓' : '✕'}</span>${PAGE_STEPS[st.page].length > 1 ? `<span class="muted small">${esc(x.step)}</span> ` : ''}${esc(x.text)}${x.detail ? ` <span class="muted">— ${esc(x.detail)}</span>` : ''}</li>`).join('')}</ul>`;
  }
  function dirtyNote() {
    const d = $('cp_dirty'), b = el && el.querySelector('[data-cpact="save"]'); if (d) d.textContent = st.F.dirty ? P.grid.unsaved(st.F.dirty) : ''; if (b) b.disabled = !st.F.dirty;
    renderSide();
  }
  const ro = (plan, k) => !canStep(plan, k).ok;
  const roNote = (plan, k) => { const w = canStep(plan, k); return w.ok ? '' : `<div class="nsband"><span class="nsb-t">${esc(w.why || SP.readOnly)}</span></div>`; };

  /* ---------- 1 · Campaign details ---------- */
  function renderDetails(c, plan) {
    const F = st.F, D = F.details, L = F.list, off = ro(plan, '1'), dis = off ? ' disabled' : '', S1 = SP.d;
    const brands = people().filter(p => p.dept === 'brand' || p.role === 'admin'), cats = [...new Set((CP.store.data().products || []).map(p => p.category))].sort();
    const assign = R.STEP_KEYS.filter(k => k !== '1').map(k => { const s = R.stepState(plan, k, U.today()), a = F.assign.get(k) || {}, who = a.assignee != null ? a.assignee : s.assignee, due = a.due != null ? a.due : s.due;
      const opts = people().filter(p => p.dept === R.STEP_DEPT[k] || p.role === 'admin' || (R.STEP_DEPT[k] === 'brand' && p.dept === 'brand'));
      return `<tr><td><b>${esc(SP.names[k])}</b></td><td>${esc(SP.dept[R.STEP_DEPT[k]])}</td><td><select class="inp sm" data-asg="${k}"${dis}>${opts.map(p => `<option${p.name === who ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}${opts.some(p => p.name === who) || !who ? '' : `<option selected>${esc(who)}</option>`}</select></td>` +
        `<td>${U.dateHTML(`data-asgdue="${k}"${dis}`, due || '', { label: SP.dueL })}</td><td>${esc(SP.state[s.status])}</td></tr>`; }).join('');
    $('cp_body').innerHTML = roNote(plan, '1') + `<div class="card"><div class="card-head"><h3>${esc(SP.names[1])}</h3></div><div class="kform pform">` +
      `<div class="field"><label for="d_name">${esc(S1.name)} <span class="req">*</span></label><input id="d_name" class="inp" data-dl="name" maxlength="80" value="${esc(L.name)}"${dis}><div class="ferr" id="d_e_name"></div></div>` +
      `<div class="frow"><div class="field"><label for="d_brand">${esc(S1.brand)}</label><input id="d_brand" class="inp" data-dd="brand" value="${esc(D.brand || '')}"${dis}></div><div class="field"><label for="d_cat">${esc(S1.category)}</label><input id="d_cat" class="inp" data-dd="category" list="d_cats" value="${esc(D.category || '')}"${dis}><datalist id="d_cats">${cats.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>` +
      `<div class="field"><label for="d_obj">${esc(S1.objective)} <span class="req">*</span></label><textarea id="d_obj" class="inp" rows="2" maxlength="240" data-dd="objective" placeholder="${esc(S1.objectivePh)}"${dis}>${esc(D.objective || '')}</textarea></div>` +
      `<div class="frow f3"><div class="field"><label for="d_t_start">${esc(S1.start)} <span class="req">*</span></label>${U.dateHTML(`id="d_start" data-dl="start"${dis}`, L.start, { textId: 'd_t_start' })}<div class="ferr" id="d_e_start"></div></div>` +
      `<div class="field"><label for="d_t_endm">${esc(S1.endMkt)}</label>${U.dateHTML(`id="d_endm" data-dl="end_marketing"${dis}`, L.end_marketing, { textId: 'd_t_endm' })}<div class="ferr" id="d_e_end_marketing"></div></div>` +
      `<div class="field"><label for="d_t_end">${esc(S1.end)} <span class="req">*</span></label>${U.dateHTML(`id="d_end" data-dl="end"${dis}`, L.end, { textId: 'd_t_end' })}<div class="ferr" id="d_e_end"></div></div></div>` +
      `<div class="frow"><fieldset class="field"><legend>${esc(S1.channels)} <span class="req">*</span></legend><div class="chkrow">${R.CHANNELS.map(k => `<label class="chk"><input type="checkbox" data-dch="${k}"${D.channels.includes(k) ? ' checked' : ''}${dis}><span>${esc(C.channel[k])} <span class="muted small">${esc(C.channelLong[k])}</span></span></label>`).join('')}</div></fieldset>` +
      `<div class="field"><label for="d_owner">${esc(S1.owner)}</label><select id="d_owner" class="inp" data-downer${dis}>${brands.map(p => `<option${p.name === F.owner ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div></div></div></div>` +
      `<div class="card"><div class="card-head"><h3>${labelInfo(S1.assignTitle, S1.assignTip)}</h3></div><div class="tablewrap"><table class="tbl simple asgtbl"><thead><tr><th>${esc(S1.cols.step)}</th><th>${esc(S1.cols.dept)}</th><th>${esc(S1.cols.who)}</th><th>${esc(S1.cols.due)}</th><th>${esc(S1.cols.status)}</th></tr></thead><tbody>${assign}</tbody></table></div></div>`;
  }
  function readDetails() {
    const F = st.F, b = $('cp_body'); if (!b) return;
    b.querySelectorAll('[data-dl]').forEach(e => { if (e.type !== 'text' || !e.classList.contains('dtext')) F.list[e.dataset.dl] = e.value.trim(); });
    b.querySelectorAll('[data-dd]').forEach(e => { F.details[e.dataset.dd] = e.value; });
    F.details.channels = R.CHANNELS.filter(k => { const x = b.querySelector(`[data-dch="${k}"]`); return x && x.checked; });
    const o = b.querySelector('[data-downer]'); if (o) F.owner = o.value;
    b.querySelectorAll('[data-asg]').forEach(e => { const k = e.dataset.asg, a = F.assign.get(k) || {}; a.assignee = e.value; F.assign.set(k, a); });
    b.querySelectorAll('[data-asgdue]').forEach(e => { const k = e.dataset.asgdue, a = F.assign.get(k) || {}; if (R.isISODate(e.value)) a.due = e.value; F.assign.set(k, a); });
  }

  /* ---------- 2 · Products (from the Product Master · Role · the net price of each channel of step 1) ---------- */
  const canMaster = () => R.canDo('product', me()).ok;
  function renderProducts(c, plan) {
    const G = P.grid, F = st.F, ed = !ro(plan, '2'), chs = F.details.channels, M = master(), open = plan.approval === 'draft' || plan.approval === 'returned';
    const rows = F.skus.map((s, i) => { const m = M.get(s.code), drift = open && m && R.isNum(+m.cogs) && Math.abs(+m.cogs - (+s.cogs || 0)) > 0.0001;
      return `<tr data-si="${i}"><td><b>${esc(s.code)}</b></td><td class="pnm"><b>${esc(s.name || '')}</b>${s.nickname ? `<div class="muted small">${esc(s.nickname)}</div>` : ''}</td>` +
        `<td>${ed ? `<select class="inp sm" data-srole aria-label="${esc(SP.p.role)}">${['hero', 'core', 'gwp'].map(r => `<option value="${r}"${(s.role || 'core') === r ? ' selected' : ''}>${esc(SP.p.roles[r])}</option>`).join('')}</select>` : esc(SP.p.roles[s.role || 'core'])}</td>` +
        `<td class="num"><span title="${esc(G.cogsTip)}">${esc(s.cogs == null || s.cogs === '' ? C.common.none : R.fmtNum(+s.cogs, 2))}</span>${drift ? `<div class="cdrift"><span class="chip warn" title="${esc(G.driftTip(R.fmtNum(+s.cogs, 2), R.fmtNum(+m.cogs, 2)))}">${esc(G.drift)}</span>${ed ? `<button type="button" class="link" data-skupd="${i}">${esc(G.driftUpd(R.fmtNum(+m.cogs, 2)))}</button>` : ''}</div>` : ''}</td>` +
        R.CHANNELS.map(k => `<td class="num">${chs.includes(k) ? (ed ? `<input class="inp sm num" data-sp="${k}" inputmode="decimal" value="${esc(s.price && s.price[k] != null ? s.price[k] : '')}" aria-label="${esc(G.price(k))}"${m && m.price && m.price[k] !== '' && R.isNum(+m.price[k]) ? ` title="${esc(G.masterPrice(R.fmtNum(+m.price[k], 2)))}"` : ''}>` : esc(s.price && s.price[k] !== '' && s.price[k] != null ? s.price[k] : C.common.none)) : `<span class="muted small">${esc(SP.p.notSold)}</span>`}</td>`).join('') +
        `<td>${ed ? `<button type="button" class="icon-btn" data-skdel="${i}" aria-label="${esc(G.remove)}" title="${esc(G.remove)}">${ICON.close}</button>` : ''}</td></tr>`; }).join('');
    const pick = [...M.values()].filter(p => p.status !== 'discontinued' && !F.skus.some(s => s.code === p.code)).sort((a, b) => a.code.localeCompare(b.code));
    $('cp_body').innerHTML = roNote(plan, '2') + `<div class="card"><div class="card-head"><h3>${esc(SP.names[2])}</h3>${ed ? `<div class="ctl"><input class="inp sm skuadd" list="cp_skulist" id="cp_skuq" placeholder="${esc(G.skuPh)}" aria-label="${esc(G.addSku)}" autocomplete="off"><button type="button" class="btn small" data-cpaddsku>${esc(G.addSku)}</button>` +
      `<datalist id="cp_skulist">${pick.map(p => `<option value="${esc(p.code)}">${esc(`${p.code} · ${p.nickname} — ${p.name}${p.status === 'npd' ? ` (${C.prod.state.npd})` : p.status === 'clearance' ? ` (${C.prod.state.clearance})` : ''}`)}</option>`).join('')}</datalist>` +
      (canMaster() ? `<button type="button" class="link" data-cpnewprod>${esc(G.createProduct)}</button>` : '') + '</div>' : ''}</div>` +
      (ed ? `<div class="muted small cp-pmnote">${esc(G.fromMaster)} <a class="link" href="#products">${esc(C.prod.title)}</a> · ${esc(SP.p.chNote(chs.map(k => C.channel[k]).join(' · ')))}</div>` : '') +
      `<div class="tablewrap"><table class="tbl simple prodtbl"><thead><tr><th>${esc(G.code)}</th><th>${esc(G.product)}</th><th>${esc(SP.p.role)}</th><th class="num">${labelInfo(G.cogs, G.cogsInfo, G.cogs, true)}</th>${R.CHANNELS.map(k => `<th class="num" title="${esc(G.priceTip)}">${esc(G.price(k))}</th>`).join('')}<th></th></tr></thead>` +
      `<tbody>${rows || `<tr><td colspan="9" class="muted">${esc(G.noSku)}</td></tr>`}</tbody></table></div></div>`;
  }
  function addSku(c, plan) {
    const q = $('cp_skuq').value.trim(); if (!q) return;
    const M = [...master().values()], f = R.foldText(q), key = q.split(/\s·\s/)[0].trim().toLowerCase();
    const m = M.find(p => p.code.toLowerCase() === key) || M.find(p => R.foldText(p.name) === f || R.foldText(p.nickname) === f);
    if (!m || m.status === 'discontinued') { U.toast(m ? P.grid.discontinued(m.code) : P.grid.pickMaster); return; }
    if (st.F.skus.some(s => s.code === m.code)) { $('cp_skuq').value = ''; return; }
    st.F.skus.push(Object.assign(R.skuFromMaster(m), { role: st.F.skus.length ? 'core' : 'hero' })); touch('2'); renderProducts(c, plan); const i = $('cp_skuq'); if (i) i.focus();
  }

  /* ---------- 3 · Sales target: SKU × Channel × month (D62) ---------- */
  function renderTarget(c, plan) {
    const G = P.grid, F = st.F, ed = !ro(plan, '3'), chs = F.details.channels, sm = new Map(F.skus.map(s => [s.code, s])), T = R.planTotals(liveVer());
    const byCh = chs.map(k => { const x = T.byChannel[k] || { qty: 0, amount: 0 }; return `<span><b>${esc(C.channel[k])}</b> ${esc(R.shortBaht(x.amount))} · ${esc(R.fmtNum(Math.round(x.qty)))} pcs</span>`; }).join('<span class="sep">·</span>');
    $('cp_body').innerHTML = roNote(plan, '3') + (F.skus.length && ed ? builderHTML(c, plan, ed) : '') + `<div class="card"><div class="card-head"><h3>${esc(SP.names[3])}</h3><div class="ctl">${U.segHTML('data-cpmode', [{ v: 'qty', label: G.qty }, { v: 'baht', label: G.baht }], st.mode)}</div></div>` +
      (ed ? toolbarHTML('t') : '') + `<div class="sumline">${byCh}<span class="sep">·</span><span><b>${esc(C.common.total)}</b> ${esc(R.baht(T.target))}</span></div>` +
      (F.skus.length ? `<div id="cp_gridT" class="cp-grid"></div>` : `<div class="c3-empty">${esc(SP.t.noSku)} <a class="link" href="#planning/${esc(c.id)}/products">${esc(SP.names[2])}</a></div>`) +
      `<div class="muted small cp-keys">${ed ? esc(G.keys) : ''}${st.mode === 'baht' ? ` · ${esc(G.bahtTip)}` : ''}</div></div>`;
    if (!F.skus.length) return;
    const rows = [];
    F.skus.forEach(s => { const open = !st.folded.has(s.code);
      rows.push({ key: 'S|' + s.code, label: s.nickname || s.name || s.code, sub: s.code, level: 0, fold: true, open });
      chs.forEach(ch => rows.push({ key: `L|${s.code}|${ch}`, label: C.channel[ch], sub: C.channelLong[ch], level: 1, leaf: true, hidden: !open })); });
    st.gT = U.grid($('cp_gridT'), { id: 'gT', rows, cols: monthCols(months(c)), corner: SP.t.corner, aria: SP.names[3], readOnly: !ed || st.mode === 'baht',
      get: (rk, ck) => { const [, code, ch] = rk.split('|'), k = `${code}|${ch}|${ck}`, q = F.q.get(k); if (st.mode === 'qty') return q == null ? null : q;
        if (q == null) return null; return F.amt.has(k) ? F.amt.get(k) : (R.priceOf(sm.get(code), ch) == null ? null : q * R.priceOf(sm.get(code), ch)); },
      canEdit: () => true, fmt: v => R.fmtNum(Math.round(v)),
      onChange: list => { list.forEach(x => { const [, code, ch] = x.r.split('|'), k = `${code}|${ch}|${x.c}`; if (x.v == null || x.v === 0) F.q.delete(k); else F.q.set(k, Math.round(x.v)); F.amt.delete(k); }); F.dirty += list.length - 1;
        if (F.builder && F.builder.filled) F.builder.edited = true; touch('3'); },
      onFold: k => { const code = k.split('|')[1]; if (st.folded.has(code)) st.folded.delete(code); else st.folded.add(code); renderTarget(c, plan); } });
  }
  const toolbarHTML = w => { const G = P.grid; return `<div class="gridbar"><button type="button" class="btn small" data-gtool="fillRight" data-g="${w}">${esc(G.fillRight)}</button><button type="button" class="btn small" data-gtool="spreadTotal" data-g="${w}">${esc(G.spread)}</button>` +
    `<button type="button" class="btn small" data-gtool="clearRow" data-g="${w}">${esc(G.clearRow)}</button><button type="button" class="btn small ghost" data-gtool="undo" data-g="${w}">${esc(G.undo)}</button><button type="button" class="btn small ghost" data-gtool="redo" data-g="${w}">${esc(G.redo)}</button></div>`; };

  /* ---------- 4 · Budget: 4a Marketing exp (Marketing) · 4b Sales exp (Sales) · 4c Other exp (Finance) — three cards, each its own step ---------- */
  const knownLines = () => { const L = CP.mock.lines(), m = { marketing: new Set(L.marketing), sales: new Set(L.sales), other: new Set(L.other) };
    (U.seed().expenses || []).forEach(r => { if (m[r.type]) m[r.type].add(r.line); }); return m; };
  function renderBudget(c, plan) {
    const G = P.grid, F = st.F, T = R.planTotals(liveVer());
    const card = k => { const type = GROUP_OF[k], s = R.stepState(plan, k, U.today()), ed = !ro(plan, k), w = canStep(plan, k), sum = T[{ marketing: 'mkt', sales: 'sls', other: 'oth' }[type]];
      const btns = ed ? `<span class="subadd"><input class="inp sm" list="cp_ll_${k}" data-lname="${k}" placeholder="${esc(G.linePh)}" aria-label="${esc(G.linePh)}"><datalist id="cp_ll_${k}">${[...knownLines()[type]].sort().map(x => `<option value="${esc(x)}">`).join('')}</datalist><button type="button" class="btn small" data-cpaddline="${k}">${esc(G.addLine)}</button></span>` +
        (s.status !== 'done' ? `<button type="button" class="btn small ghost" data-cpnone="${k}">${esc(SP.b.none)}</button><button type="button" class="btn small primary" data-cpdone="${k}">${esc(SP.markDone)}</button>` : '') : '';
      return `<div class="card bgrp" data-bk="${k}"><div class="card-head"><h3>${esc(SP.names[k])} <span class="hnote">${esc(R.baht(sum))}</span></h3><div class="ctl">${btns}</div></div>` +
        `<div class="bstep">${stepCell(plan, k)}${!ed && w.why ? `<span class="muted small">${esc(w.why)}</span>` : ''}${s.none ? `<span class="chip grey">${esc(P.noExpense)}</span>` : ''}${s.env ? `<span class="chip warn">${esc(SP.envChanged)}</span>` : ''}</div>` +
        envHead(type) + (ed ? lineTools(k) + toolbarHTML('b' + k) : '') + `<div id="cp_gridB_${k}" class="cp-grid"></div></div>`; };
    $('cp_body').innerHTML = `<div class="cp-apline">${esc(G.apLine(R.pct(T.ap, 1), R.baht(T.mkt), R.baht(T.sls)))} · ${esc(SP.b.other(R.baht(T.oth)))}</div>` + ['4a', '4b', '4c'].map(card).join('');
    ['4a', '4b', '4c'].forEach(k => {
      const type = GROUP_OF[k], ed = !ro(plan, k), ls = F.lines.filter(l => l.type === type), box = $('cp_gridB_' + k);
      if (!ls.length) { box.innerHTML = `<div class="muted small">${esc(G.noLine)}</div>`; st.gB[k] = null; return; }
      st.gB[k] = U.grid(box, { id: 'gB' + k, rows: ls.map(l => ({ key: `B|${type}|${l.line}`, label: l.line, level: 0, leaf: true })), cols: monthCols(bmonths(c)), corner: G.lineCorner, aria: SP.names[k], readOnly: !ed, fmt: v => R.fmtNum(Math.round(v)),
        get: (rk, ck) => { const [, t, line] = rk.split('|'), m = F.bud.get(`${t}|${line}`); return m && m.has(ck) ? m.get(ck) : null; }, canEdit: () => true,
        onChange: list => { list.forEach(x => { const [, t, line] = x.r.split('|'), kk = `${t}|${line}`; if (!F.bud.has(kk)) F.bud.set(kk, new Map()); if (x.v == null || x.v === 0) F.bud.get(kk).delete(x.c); else F.bud.get(kk).set(x.c, Math.round(x.v)); });
          F.dirty += list.length - 1; touch(k); const T2 = R.planTotals(liveVer()), ap = el.querySelector('.cp-apline'); if (ap) ap.textContent = `${G.apLine(R.pct(T2.ap, 1), R.baht(T2.mkt), R.baht(T2.sls))} · ${SP.b.other(R.baht(T2.oth))}`;
          const hd = el.querySelector(`[data-envh="${type}"]`); if (hd) hd.outerHTML = envHead(type); } });
    });
  }

  /* ---------- 5 · Forecast (D71): achievement by channel · Worst / Base / Best · Break-even · the profit by achievement ---------- */
  function renderForecast(c, plan) {
    const F = st.F, ed = !ro(plan, '5'), dis = ed ? '' : ' disabled', S5 = SP.f, fc = R.planForecast(liveVer()), chs = F.details.channels, s5 = R.stepState(plan, '5', U.today());
    const pin = (attr, v, label) => `<label class="fcin"><span>${esc(label)}</span><span class="pinw"><input class="inp sm num" ${attr} inputmode="decimal" value="${esc(Math.round((+v || 0) * 1000) / 10)}"${dis}><span class="muted">%</span></span></label>`;
    const set = (k, x) => `<td class="num">${esc(R.baht(x.rev))}</td>`;
    const rowsDef = [['rev', S5.rows.rev, 'baht'], ['cogs', S5.rows.cogs, 'baht'], ['gp', S5.rows.gp, 'baht'], ['gpPct', S5.rows.gpPct, 'pct'], ['mkt', S5.rows.mkt, 'baht'], ['sls', S5.rows.sls, 'baht'], ['oth', S5.rows.oth, 'baht'],
      ['profit', S5.rows.profit, 'baht', 'major'], ['margin', S5.rows.margin, 'pct'], ['roi', S5.rows.roi, 'x'], ['ap', S5.rows.ap, 'pct']];
    const fmt = (v, f) => (v == null ? '—' : f === 'pct' ? R.pct(v, 1) : f === 'x' ? R.times(v) : R.baht(v));
    const table = `<table class="tbl simple fctbl"><thead><tr><th></th><th class="num">${esc(S5.cols.plan)}</th><th class="num">${esc(S5.cols.worst(R.pct(fc.f.worst)))}</th><th class="num">${esc(S5.cols.base(R.pct(fc.baseAch)))}</th><th class="num">${esc(S5.cols.best(R.pct(fc.f.best)))}</th></tr></thead><tbody>` +
      rowsDef.map(([k, l, f, cls]) => `<tr class="${cls || ''}"><td>${esc(l)}</td>${['plan', 'worst', 'base', 'best'].map(sd => `<td class="num${k === 'profit' && fc[sd][k] < 0 ? ' neg' : ''}">${esc(fmt(fc[sd][k], f))}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
    const be = fc.breakEven, warns = fc.warns.map(w => `<li class="warn"><span class="ci">⚠</span>${esc(S5.warn[w.key](w.key === 'worstLoss' ? R.baht(w.v) : R.pct(w.v)))}</li>`).join('');
    $('cp_body').innerHTML = roNote(plan, '5') + (s5.refresh ? `<div class="nsband warnb"><span class="nsb-t">${esc(S5.refreshNote)}</span></div>` : '') +
      `<div class="card"><div class="card-head"><h3>${labelInfo(S5.inTitle, S5.inTip)}</h3></div><div class="fcins">${chs.map(k => pin(`data-fach="${k}"`, F.forecast.ach[k] != null ? F.forecast.ach[k] : 1, S5.ach(C.channel[k]))).join('')}` +
      pin('data-fworst', F.forecast.worst, S5.worst) + pin('data-fbest', F.forecast.best, S5.best) + `</div>` +
      `<div class="frow"><div class="field"><label for="f_note">${esc(S5.note)}</label><textarea id="f_note" class="inp" rows="2" data-fnote${dis}>${esc(F.forecast.note || '')}</textarea></div>` +
      `<div class="field"><label for="f_cmt">${esc(S5.comment)} <span class="req">*</span></label><textarea id="f_cmt" class="inp" rows="2" data-fcmt${dis}>${esc(F.forecast.comment || '')}</textarea></div></div></div>` +
      `<div class="r2 fc2"><div class="card"><div class="card-head"><h3>${labelInfo(S5.title, S5.tip)}</h3></div><div class="tablewrap">${table}</div>` +
      `<div class="bepl"><div><span class="muted">${esc(S5.be)}</span><b>${esc(be.rev == null ? '—' : R.baht(be.rev))}</b></div><div><span class="muted">${esc(S5.beAch)}</span><b>${esc(be.ach == null ? '—' : S5.beAchV(R.pct(be.ach)))}</b></div></div>` +
      (warns ? `<ul class="checks2">${warns}</ul>` : `<div class="na-none small"><span class="okm">✓</span> ${esc(S5.noWarn)}</div>`) + `</div>` +
      `<div class="card"><div class="card-head"><h3>${labelInfo(S5.curve, S5.curveTip)}</h3></div><div class="chartbox"><svg id="f_svg" role="img" aria-label="${esc(S5.curve)}"></svg></div></div></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(SP.sum.title)}</h3></div>${summaryHTML(liveVer(), c, 'f')}</div>`;
    drawCurve(fc); drawSummary(liveVer(), c, 'f');
  }
  function drawCurve(fc) {
    const svg = $('f_svg'); if (!svg) return;
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim(), W = Math.max(280, Math.round(svg.parentNode.clientWidth || 420)), H = 240, m = { l: 62, r: 14, t: 14, b: 30 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const pts = fc.curve, ys = pts.map(p => p.profit), lo = Math.min(0, ...ys), hi = Math.max(0, ...ys), y = v => m.t + (hi - v) / ((hi - lo) || 1) * ih, x = a => m.l + (a - 0.5) / 0.7 * iw;
    const T = fc.totals, prof = a => T.target * a * (T.gpPct || 0) - T.budget, dot = (a, l, color) => `<circle cx="${x(a)}" cy="${y(prof(a))}" r="5" fill="${color}"/><text x="${x(a)}" y="${y(prof(a)) - 9}" text-anchor="middle" class="blab">${esc(l)}</text>`;
    let g = `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${css('--text-2')}"/>`;
    [0.5, 0.7, 0.9, 1, 1.1, 1.2].forEach(a => { g += `<text x="${x(a)}" y="${H - 10}" text-anchor="middle" class="axis">${Math.round(a * 100)}%</text>`; });
    /* CR-13 F6 — the ticks of the axis: ฿0 · ฿10M · ฿20M (a nice step), not the min and max */
    const stp = R.niceStep((hi - lo) / 4 || 1); for (let v = Math.ceil(lo / stp) * stp; v <= hi + 1e-6; v += stp) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${css('--grid')}"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" class="axis" data-ftick>${esc(U.trimMoney(R.compact(Math.abs(v) < 1e-6 ? 0 : v)))}</text>`;
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.a).toFixed(1)},${y(p.profit).toFixed(1)}`).join(' '), base = fc.baseAch || 1;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = g + `<path d="${path}" fill="none" stroke="${css('--rev')}" stroke-width="2.5"/>` + (fc.breakEven.ach != null && fc.breakEven.ach >= 0.5 && fc.breakEven.ach <= 1.2 ? `<line x1="${x(fc.breakEven.ach)}" x2="${x(fc.breakEven.ach)}" y1="${m.t}" y2="${m.t + ih}" stroke="${css('--muted')}" stroke-dasharray="4 4"/>` : '') +
      dot(base * fc.f.worst, SP.f.dots.worst, css('--err')) + dot(base, SP.f.dots.base, css('--text')) + dot(base * fc.f.best, SP.f.dots.best, css('--ok'));
  }
  function readForecast() {
    const F = st.F, b = $('cp_body'); if (!b) return;
    const n = e => { const v = U.parseNum(e.value); return v == null || Number.isNaN(v) ? null : v / 100; };
    b.querySelectorAll('[data-fach]').forEach(e => { const v = n(e); if (v != null) F.forecast.ach[e.dataset.fach] = v; });
    const w = b.querySelector('[data-fworst]'), bb = b.querySelector('[data-fbest]'); if (w && n(w) != null) F.forecast.worst = n(w); if (bb && n(bb) != null) F.forecast.best = n(bb);
    const nt = b.querySelector('[data-fnote]'), cm = b.querySelector('[data-fcmt]'); if (nt) F.forecast.note = nt.value; if (cm) F.forecast.comment = cm.value;
  }

  /* ---------- 6 · Review & submit ---------- */
  const tile = (l, v, sub, cls) => `<div class="tile${cls ? ' ' + cls : ''}"><div class="tl">${esc(l)}</div><div class="tv">${esc(v)}</div>${sub ? `<div class="ts">${esc(sub)}</div>` : ''}</div>`;
  function planTiles(T) {
    const S = P.sum;
    return `<div class="tiles">${tile(S.target, R.baht(T.target), `${R.fmtNum(Math.round(T.qty))} pcs`)}${tile(S.cogs, R.baht(T.cogs), `${S.gp} ${R.baht(T.gp)}`)}${tile(S.gp, R.pct(T.gpPct, 1), '')}` +
      `${tile(S.budget, R.baht(T.budget), `${S.mkt} ${R.shortBaht(T.mkt)} · ${S.sls} ${R.shortBaht(T.sls)} · ${SP.side.oth} ${R.shortBaht(T.oth)}`)}${tile(S.ap, R.pct(T.ap, 1), '', T.ap > 0.2 ? 'warn' : '')}${tile(S.profit, R.baht(T.profit), `${S.margin} ${R.pct(T.margin, 1)} · ${S.roi} ${R.times(T.roi)}`, T.profit < 0 ? 'neg' : '')}</div>` +
      `<div class="muted small cp-counts">${esc(S.counts(T.skus, T.subs, T.months))}</div>`;
  }
  function renderReview(c, plan) {
    const F = st.F, ed = !ro(plan, '6'), lp = livePlan(plan), T = R.planTotals(liveVer()), fc = R.planForecast(liveVer()), w = R.working(plan), S6 = SP.r;
    const steps = R.STEP_KEYS.map(k => { const s = R.stepState(plan, k, U.today()); return `<li class="${s.status === 'done' ? 'ok' : s.status === 'returned' ? 'err' : ''}"><span class="ci">${s.status === 'done' ? '✓' : s.status === 'returned' ? '↩' : '○'}</span>${esc(SP.names[k])} <span class="muted small">— ${esc(s.assignee || '—')} · ${esc(SP.state[s.status])}${s.refresh ? ' · ' + esc(SP.refresh) : ''}</span></li>`; }).join('');
    const ck = R.planChecks(liveVer(), c), waitTxt = plan.approval === 'submitted' && w ? S6.waiting(R.dayDiff(U.today(), String(w.submitted_at).slice(0, 10))) : '';
    $('cp_body').innerHTML = (waitTxt ? `<div class="nsband"><span class="nsb-t">${esc(waitTxt)}</span></div>` : '') + (plan.approval === 'returned' && w && w.comment ? `<div class="nsband warnb"><span class="nsb-t">${esc(S6.returned(w.decided_by || '—', w.comment))}</span></div>` : '') +
      `<div class="card"><div class="card-head"><h3>${esc(P.sum.plan)} <span class="hnote">${esc(P.v(w ? w.v : 1))}</span></h3></div>${planTiles(T)}</div>` +
      `<div class="r2"><div class="card"><div class="card-head"><h3>${esc(S6.steps)}</h3></div><ul class="checks2">${steps}</ul></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(SP.f.title)}</h3><div class="ctl"><a class="link" href="#planning/${esc(c.id)}/forecast">${esc(SP.names[5])} ›</a></div></div>` +
      `<dl class="kv"><dt>${esc(SP.f.cols.base(R.pct(fc.baseAch)))}</dt><dd>${esc(`${R.baht(fc.base.rev)} · ${SP.f.rows.profit} ${R.baht(fc.base.profit)}`)}</dd><dt>${esc(SP.f.cols.worst(R.pct(fc.f.worst)))}</dt><dd class="${fc.worst.profit < 0 ? 'neg' : ''}">${esc(R.baht(fc.worst.profit))}</dd>` +
      `<dt>${esc(SP.f.be)}</dt><dd>${esc(fc.breakEven.rev == null ? '—' : `${R.baht(fc.breakEven.rev)} · ${SP.f.beAchV(R.pct(fc.breakEven.ach))}`)}</dd></dl>${fc.f.comment ? `<div class="muted small">${esc(fc.f.comment)}</div>` : ''}</div></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(SP.sum.title)}</h3></div>${summaryHTML(liveVer(), c, 'r', { noMonth: true })}</div>` + envVsLines() +
      `<div class="card"><div class="card-head"><h3>${esc(P.sum.checks)}</h3></div><ul class="checks2">${ck.errs.map(x => `<li class="${x.ok ? 'ok' : 'err'}"><span class="ci">${x.ok ? '✓' : '✕'}</span>${esc(x.text)}${x.detail ? ` <span class="muted">— ${esc(x.detail)}</span>` : ''}</li>`).join('')}${ck.warns.map(x => `<li class="warn"><span class="ci">⚠</span>${esc(x.text)}</li>`).join('')}</ul></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S6.comment)}</h3></div>${ed ? `<textarea class="inp" id="r_cmt" rows="3" maxlength="500" data-rcmt placeholder="${esc(S6.commentPh)}">${esc(F.review.comment || '')}</textarea>` : `<div>${esc(F.review.comment || '—')}</div>`}</div>`;
    void lp;
  }
  /* CR-13 §7.6 — Envelope vs lines, a group: the envelope · the lines · the difference (the envelope guides — D122) */
  function envVsLines() {
    const E = envLive(), W = SP.env, G = P.grid.groups;
    return `<div class="card"><div class="card-head"><h3>${esc(W.vs)}</h3></div><div class="tablewrap"><table class="tbl simple envvs"><thead><tr><th>${esc(W.cols.group)}</th><th class="num">${esc(W.env)}</th><th class="num">${esc(W.lines)}</th><th class="num">${esc(W.diff)}</th></tr></thead><tbody>` +
      EG.map(g => { const d = E[g].lines - E[g].amount; return `<tr><td>${esc(G[g])}${E[g].none ? ` <span class="chip grey">${esc(SP.b.none)}</span>` : ''}</td><td class="num">${esc(R.baht(E[g].amount))}</td><td class="num">${esc(R.baht(E[g].lines))}</td><td class="num${Math.abs(d) > 0.5 ? (d > 0 ? ' warnx' : ' muted') : ''}">${Math.abs(d) < 0.5 ? '—' : esc(R.signedShort(d))}</td></tr>`; }).join('') + '</tbody></table></div></div>';
  }
  /* the budget of an approved Campaign by line (whole Campaign) + the bar — Campaign Monitor shows it too */
  function budgetTrackHTML(c) {
    const s = U.seed(), span = R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end), td = U.today();
    const bt = R.budgetTrack(s, { from: R.monthFirst(span[0]), to: R.monthLast(span[span.length - 1]), statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: td }), t = bt.rows[0], K = C.track;
    if (!t) return '';
    return `<div class="card"><div class="card-head"><h3>${labelInfo(K.block.title, K.block.tip)}</h3></div><div class="bblk"><div class="bbv"><b>${esc(R.baht(t.committed))}</b> <span class="muted">${esc(K.of(R.baht(t.current)))}</span></div>${U.budgetBar(t)}<div class="muted small">${esc(U.budgetCap(t))}</div></div></div>`;
  }
  /* v a ↔ v b: totals · SKUs · lines (the review) */
  function diffHTML(d, a, b) {
    const H = P.history, T = d.totals, dv = (x, y, f) => { const z = y - x; return `<span class="${Math.abs(z) < 0.5 ? 'muted' : z > 0 ? 'good' : 'bad'}">${Math.abs(z) < 0.5 ? '—' : (z > 0 ? '+' : '') + f(z)}</span>`; };
    const tot = `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.totals)}</th><th class="num">v${a}</th><th class="num">v${b}</th><th class="num">${esc(H.diff)}</th></tr></thead><tbody>` +
      [[P.sum.target, T.target, R.baht], [P.sum.budget, T.budget, R.baht], [P.sum.profit, T.profit, R.baht]].map(([l, v, f]) => `<tr><td>${esc(l)}</td><td class="num">${esc(f(v[0]))}</td><td class="num">${esc(f(v[1]))}</td><td class="num">${dv(v[0], v[1], f)}</td></tr>`).join('') +
      `<tr><td>${esc(P.sum.ap)}</td><td class="num">${esc(R.pct(T.ap[0], 1))}</td><td class="num">${esc(R.pct(T.ap[1], 1))}</td><td></td></tr></tbody></table>`;
    const sk = d.skus.length ? `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.sku)}</th><th class="num">${esc(H.qty)} v${a}</th><th class="num">${esc(H.qty)} v${b}</th><th class="num">฿ ${esc(H.diff)}</th></tr></thead><tbody>${d.skus.map(r => `<tr><td>${esc(r.name)} <span class="muted small">${esc(r.code)}</span></td><td class="num">${esc(R.fmtNum(r.qtyA))}</td><td class="num">${esc(R.fmtNum(r.qtyB))}</td><td class="num">${dv(r.amtA, r.amtB, R.baht)}</td></tr>`).join('')}</tbody></table>` : '';
    const ln = d.lines.length ? `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.line)}</th><th class="num">v${a}</th><th class="num">v${b}</th><th class="num">${esc(H.diff)}</th></tr></thead><tbody>${d.lines.map(r => `<tr><td>${esc(r.line)}</td><td class="num">${esc(R.baht(r.a))}</td><td class="num">${esc(R.baht(r.b))}</td><td class="num">${dv(r.a, r.b, R.baht)}</td></tr>`).join('')}</tbody></table>` : '';
    return `<div class="diffw">${tot}${sk}${ln}${!sk && !ln ? `<div class="muted small">${esc(H.same)}</div>` : ''}</div>`;
  }
  const legendHTML = () => `<div class="legend bbleg"><span><i class="sw com"></i>${esc(C.track.legend.com)}</span><span><i class="sw rem"></i>${esc(C.track.legend.rem)}</span><span><i class="sw pend"></i>${esc(C.track.legend.pend)}</span><span><i class="sw tick"></i>${esc(C.track.legend.tick)}</span></div>`;

  /* ===================== actions ===================== */
  async function save(id, step, okMsg, o) {
    try { const p = await CP.store.savePlan(id, step, Object.assign({ rev: st.F && st.F.id === id ? st.F.rev : undefined }, o || {})); if (okMsg) U.toast(okMsg); return p; }
    catch (e) { U.toast(e.code === 'conflict' ? A.toast.conflict : A.toast.failed); if (e.code === 'conflict') { st.F = null; CP.app.refresh(); } return null; }
  }
  /* Save draft: the details (the list row: name · dates — the plan: the rest) · the step(s) edited go In progress (D70) */
  async function doSave(quiet) {
    const c = campOf(st.id), F = st.F, a = me(); if (!F || !F.dirty) return true;
    if (st.page === 'details') readDetails();
    if (st.page === 'forecast') readForecast();
    if (st.page === 'review') { const r = $('r_cmt'); if (r) F.review.comment = r.value; }
    if (st.page === 'target') readBuilder();
    if (F.dirtySteps.has('1')) {
      const L = F.list, e = R.validateCampaign({ name: L.name, start: L.start, end: L.end, end_marketing: L.end_marketing }, CP.store.data().list.rows, st.id);
      Object.keys(e).forEach(k => { const x = $('d_e_' + k); if (x) x.textContent = e[k]; }); if (Object.keys(e).length) { U.toast(SP.fixFirst); return false; }
      if (L.name !== c.name || L.start !== c.start || L.end !== c.end || (L.end_marketing || '') !== (c.end_marketing || '')) {
        try { await CP.store.saveList({ action: 'edit', id: st.id, values: { campaign: L.name, start: L.start, end: L.end, end_marketing: L.end_marketing, status: 'auto' } }, { today: U.today() }); }
        catch (x) { U.toast(A.toast.failed); return false; } }
    }
    const v = serialize(F), steps = [...F.dirtySteps], assign = [...F.assign.entries()], owner = F.owner;
    const p = await save(st.id, x => { let y = R.planAct(x, { type: 'save', by: a.name, at: at(), skus: v.skus, target: v.target, budget: v.budget, details: v.details, forecast: v.forecast, review: v.review, builder: v.builder, envelope: v.envelope, steps: steps.filter(k => k !== '1' || true) });
      assign.forEach(([k, z]) => { const s = y.steps[k] || {}; if ((z.assignee != null && z.assignee !== s.assignee) || (z.due != null && z.due !== s.due)) y = R.planAct(y, { type: 'step.assign', step: k, assignee: z.assignee, due: z.due, by: a.name, at: at() }); });
      if (owner && owner !== y.owner) { y.owner = owner; ['1', '2', '6'].forEach(k => { if (y.steps[k] && y.steps[k].assignee === x.owner) y.steps[k].assignee = owner; }); }
      return y; }, quiet ? '' : A.toast.saved);
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); return true; }
    return false;
  }
  async function saveDetails(c, plan) {
    const a = me(), name = ($('ov_name') || {}).value.trim(), e = $('ov_e'), ver = R.approvedVersion(plan) || R.working(plan);
    const det = { brand: $('ov_brand').value.trim(), category: $('ov_cat').value.trim(), objective: $('ov_obj').value.trim(), channels: R.CHANNELS.filter(k => { const x = el.querySelector(`[data-ovch="${k}"]`); return x && x.checked; }) };
    if (!name) { if (e) e.textContent = C.camps.v.nameReq; return; }
    if (!det.channels.length) { if (e) e.textContent = C.plan.checks.channels; return; }
    const row = CP.store.data().list.rows.find(r => r.id === c.id);
    if (row && name !== row.campaign) { try { await CP.store.saveList({ action: 'edit', id: c.id, values: { campaign: name, start: row.start, end: row.end, end_marketing: row.end_marketing, status: 'auto' } }, { today: U.today() }); } catch (x) { if (e) e.textContent = (x.errors && x.errors.name) || A.toast.failed; return; } }
    const changed = Object.keys(det).filter(k => JSON.stringify(det[k]) !== JSON.stringify((ver.details || {})[k]));
    const owner = $('ov_owner').value, p = await save(c.id, x => R.planAct(x, { type: 'details', details: Object.fromEntries(changed.map(k => [k, det[k]])), owner, name, oldName: c.name, by: a.name, at: at() }), CG.d.saved(name), { rev: plan.rev || 0 });
    if (p) { st.editD = false; st.F = null; CP.app.refresh(); }
  }
  async function markDone(k, none) {
    if (st.F.dirty && !(await doSave(true))) return;
    const plan = planOf(st.id), c = campOf(st.id), ck = R.stepChecks(plan, k, c);
    if (!none && !ck.ok) { U.toast(SP.checksFirst(ck.list.filter(x => !x.ok).map(x => x.text).join(' · '))); return; }
    const p = await save(st.id, x => R.planAct(x, { type: 'step.done', step: k, none: !!none, by: me().name, at: at() }), SP.doneToast(SP.names[k]), { rev: plan.rev || 0 });
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); }
  }
  async function submit() {
    const r = $('r_cmt'); if (r) { st.F.review.comment = r.value; st.F.dirty++; st.F.dirtySteps.add('6'); }
    if (st.F.dirty && !(await doSave(true))) return;
    const plan = planOf(st.id), c = campOf(st.id), ck = R.stepChecks(plan, '6', c); if (!ck.ok) { U.toast(SP.notReady); return; }
    const p = await save(st.id, x => R.planAct(x, { type: 'submit', by: me().name, at: at() }), A.toast.submitted(c.name), { rev: plan.rev || 0 });
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); }
  }
  async function onClick(e) {
    const t = e.target, c = campOf(st.id); if (!c) return;
    const pg = t.closest('[data-cppage]'); if (pg) { e.preventDefault(); if (pg.dataset.cppage !== st.page) location.hash = `#planning/${st.id}/plan/${pg.dataset.cppage}`; return; }
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
    if (t.closest('[data-tbfill]')) return fillGrid(c, plan);
    const tc = t.closest('.seg[data-tbcurve] button'); if (tc) { readBuilder(); st.F.builder.curve = tc.dataset.v; touch('3'); st.bOpen = true; renderTarget(c, plan); return; }
    const sg = t.closest('[data-spgo]'); if (sg) { const k = sg.dataset.spgo, line = el.querySelector(`[data-spl="${k}"]`).value, tot = U.parseNum(el.querySelector(`[data-spt="${k}"]`).value), mt = el.querySelector(`[data-spm="${k}"]`).value;
      if (!line || tot == null || Number.isNaN(tot)) { U.toast(SP.env.needTotal); return; } spreadLine(c, k, line, Math.round(tot), mt); renderBudget(c, plan); return; }
    const fr = t.closest('[data-frgo]'); if (fr) { const k = fr.dataset.frgo, line = el.querySelector(`[data-frl="${k}"]`).value; if (line) { fillRest(c, k, line); renderBudget(c, plan); } return; }
    if (ac) {
      const w = ac.dataset.cpact;
      if (w === 'save') return doSave(false);
      if (w === 'submit') return submit();
      if (w === 'review') return CP.review.open({ kind: 'plan', id: st.id });
      if (w === 'withdraw') { const p = await save(st.id, x => R.planAct(x, { type: 'withdraw', by: a.name, at: at() }), A.toast.withdrawn(c.name)); if (p) { st.F = draftOf(st.id); CP.app.refresh(); } return; }
      if (w === 'request') return CP.reqdraw.open(st.id);
      if (w === 'duplicate') return CP.screens.planning.duplicate(st.id);
    }
    const dn = t.closest('[data-cpdone]'); if (dn) return markDone(dn.dataset.cpdone, false);
    const no = t.closest('[data-cpnone]'); if (no) return markDone(no.dataset.cpnone, true);
    if (t.closest('[data-cpmore]')) return CP.screens.planning.menuFor(t.closest('[data-cpmore]'), st.id, true);
    const md = t.closest('.seg[data-cpmode] button'); if (md) { st.mode = md.dataset.v === 'baht' ? 'baht' : 'qty'; renderTarget(c, plan); return; }
    const gt = t.closest('[data-gtool]'); if (gt) { const k = gt.dataset.g, g = k === 't' ? st.gT : st.gB[k.slice(1)]; if (g) { g[gt.dataset.gtool](); g.focus(); } return; }
    if (t.closest('[data-cpaddsku]')) return addSku(c, plan);
    if (t.closest('[data-cpnewprod]')) return CP.products.openForm(null, { onSaved: p => { renderProducts(c, plan); const j = $('cp_skuq'); if (j) { j.value = p.code; j.focus(); } } });
    const up = t.closest('[data-skupd]'); if (up) { const s = st.F.skus[+up.dataset.skupd], m = master().get(s && s.code); if (s && m) { s.cogs = +m.cogs; touch('2'); renderProducts(c, plan); U.toast(P.grid.driftDone(s.code, R.fmtNum(+m.cogs, 2))); } return; }
    const sd = t.closest('[data-skdel]'); if (sd) { const s = st.F.skus[+sd.dataset.skdel]; st.F.skus.splice(+sd.dataset.skdel, 1); [...st.F.q.keys()].forEach(k => { if (k.startsWith(s.code + '|')) st.F.q.delete(k); }); touch('2'); renderProducts(c, plan); return; }
    const al = t.closest('[data-cpaddline]'); if (al) { const k = al.dataset.cpaddline, ty = GROUP_OF[k], inp = el.querySelector(`[data-lname="${k}"]`), nm = inp ? inp.value.trim() : ''; if (!nm) return;
      if (!st.F.lines.some(l => l.type === ty && l.line === nm)) { st.F.lines.push({ type: ty, line: nm }); st.F.bud.set(`${ty}|${nm}`, new Map()); touch(k); } renderBudget(c, plan); return; }
  }
  function onInput(e) {
    const t = e.target, F = st.F; if (!F) return;
    if (st.page === 'details' && t.closest('#cp_body')) { readDetails(); touch('1'); return; }
    if (st.page === 'forecast' && t.closest('#cp_body')) { readForecast(); touch('5'); const fc = R.planForecast(liveVer()); if (e.type === 'change' || /data-f(ach|worst|best)/.test(t.outerHTML)) { const keep = document.activeElement && document.activeElement.outerHTML.match(/data-f\w+(="\w+")?/); renderForecast(campOf(st.id), planOf(st.id)); if (keep) { const x = el.querySelector(`[${keep[0]}]`); if (x) { x.focus(); const v = x.value; x.value = ''; x.value = v; } } void fc; } return; }
    if (st.page === 'review' && t.matches('[data-rcmt]')) { F.review.comment = t.value; F.dirty++; F.dirtySteps.add('6'); dirtyNote(); return; }
    if (t.matches('[data-cpver]')) { st.ver = +t.value; renderPlanRO(campOf(st.id), planOf(st.id)); return; }
    /* CR-13 §7.3 — the builder: a field typed (the bars and sums again on change) · Copy mix from → the shares of that plan */
    if (t.closest('#cp_tb')) { const B = readBuilder(); touch('3');
      if (t.matches('[data-tbcopy]') || (t.matches('[data-tbfrom]') && B.from === 'copy' && B.copy)) { const mx = B.copy ? mixFrom(B.copy, campOf(st.id)) : null; if (mx) Object.assign(B, { ch: mx.ch, sku: mx.sku, custom: mx.custom, curve: 'custom' }); }
      if (e.type === 'change') { st.bOpen = true; const keep = document.activeElement && document.activeElement.matches('[data-tbfull],[data-tbch],[data-tbsku],[data-tbcust]') ? document.activeElement.outerHTML.match(/data-tb\w+(="[^"]*")?/) : null;
        renderTarget(campOf(st.id), planOf(st.id)); if (keep) { const x = el.querySelector(`[${keep[0]}]`); if (x) x.focus(); } } return; }
    /* §7.4 — the envelope: % ↔ ฿ · phasing · No expense */
    if (st.page === 'envelope' && t.closest('#cp_body')) { readEnvelope(t); touch('env'); if (e.type === 'change') { const sel = t.matches('[data-envpct],[data-envamt]') ? null : t.outerHTML.match(/data-env\w+="\w+"/); renderEnvelope(campOf(st.id), planOf(st.id)); renderSide(); if (sel) { const x = el.querySelector(`[${sel[0]}]`); if (x) x.focus(); } } else { const E = envLive(), T = R.planTotals(liveVer()), tot = EG.reduce((a2, g) => a2 + E[g].amount, 0);
      EG.forEach(g => { if (t.matches(`[data-envpct="${g}"]`)) { const x = el.querySelector(`[data-envamt="${g}"]`); if (x) x.value = R.fmtNum(E[g].amount); } if (t.matches(`[data-envamt="${g}"]`)) { const x = el.querySelector(`[data-envpct="${g}"]`); if (x) x.value = Math.round((E[g].pct || 0) * 1000) / 10; } });
      const tt = el.querySelector('[data-envtot]'), tp = el.querySelector('[data-envtotpct]'); if (tt) tt.textContent = R.baht(tot); if (tp) tp.textContent = R.pct(R.ratio(tot, T.target), 1); renderSide(); } return; }
    const tr = t.closest('tr[data-si]'); if (!tr) return;
    const s = F.skus[+tr.dataset.si]; if (!s) return;
    if (t.matches('[data-srole]')) s.role = t.value; else if (t.dataset.sp) { s.price = s.price || {}; s.price[t.dataset.sp] = t.value.trim(); } else return;
    touch('2');
  }
  /* ---------- leaving with changes (the hash changes) ---------- */
  async function confirmLeave() { if (!isDirty()) return true; const G = P.grid; const ok = await U.confirmDialog(G.leaveQ, G.leaveBody, G.leave, true, G.stay); if (ok) st.F = null; return ok; }
  window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('click', e => { if (el && el.contains(e.target) && el.offsetParent) onClick(e); });
  document.addEventListener('input', e => { if (el && el.contains(e.target) && el.offsetParent && !e.target.matches('[data-asgdue] , .dtext')) onInput(e); });
  document.addEventListener('change', e => { if (el && el.contains(e.target) && el.offsetParent) onInput(e); });
  return { render, isDirty, confirmLeave, current: () => st.id, reset: () => { st.F = null; }, diffHTML, planTiles, legendHTML, budgetTrackHTML, grids: () => ({ t: st.gT, b: st.gB }), draft: () => st.F, serialize, PAGES,
    summaryHTML, drawSummary, openCompare, stateChip: (c, plan, o) => stateChip(R.campState(c, plan, U.today()), c, o), reqSummary, curveW, builderOf, envRef, envLive, mixFrom };
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
      const T = R.planTotals(it.v), sm = R.skuMap(it.v), by = new Map();
      it.v.target.forEach(r => { const s = sm.get(r.code), a2 = R.rowAmount(r, s) || 0, o = by.get(r.code) || { MT: 0, TT: 0, ECOM: 0, qty: 0 }; o[r.channel] += a2; o.qty += +r.qty || 0; by.set(r.code, o); });
      const tg = `<div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(P.history.sku)}</th>${R.CHANNELS.map(k => `<th class="num">${k}</th>`).join('')}<th class="num">${esc(C.common.total)}</th><th class="num">${esc(P.history.qty)}</th></tr></thead><tbody>` +
        [...by].map(([code, o]) => `<tr><td>${esc((sm.get(code) || {}).nickname || (sm.get(code) || {}).name || code)} <span class="muted small">${esc(code)}</span></td>${R.CHANNELS.map(k => `<td class="num">${o[k] ? esc(R.baht(o[k])) : ''}</td>`).join('')}<td class="num"><b>${esc(R.baht(o.MT + o.TT + o.ECOM))}</b></td><td class="num">${esc(R.fmtNum(o.qty))}</td></tr>`).join('') + '</tbody></table></div>';
      const bl = `<div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(P.grid.lineCorner)}</th><th class="num">${esc(C.track.cols.current)}</th><th class="num">%</th></tr></thead><tbody>` +
        [...T.byLine].sort((x, y) => y[1].amount - x[1].amount).map(([k, o]) => { const [t, l] = k.split('|'); return `<tr><td><span class="muted small">${esc(P.grid.groups[t] || t)}</span> ${esc(l)}</td><td class="num">${esc(R.baht(o.amount))}</td><td class="num">${esc(R.pct(R.ratio(o.amount, T.budget), 1))}</td></tr>`; }).join('') + '</tbody></table></div>';
      out.push(sec(A.rv.plan, CP.cpage.planTiles(T)), sec(A.rv.target, tg));
      /* CR-13 §7.5 (D124) — the same summaries as step 6 · step 7 · the Plan tab */
      out.push(sec(C.step.sum.title, CP.cpage.summaryHTML(it.v, c, 'rv')));
      /* CR-07 §8 — the Forecast of step 5 (Plan · Worst · Base · Best · Break-even) and the comment of step 6 */
      const fc = R.planForecast(it.v), SF = C.step.f, fr = (l, k, f) => `<tr><td>${esc(l)}</td>${['plan', 'worst', 'base', 'best'].map(sd => `<td class="num${k === 'profit' && fc[sd][k] < 0 ? ' neg' : ''}">${esc(f(fc[sd][k]))}</td>`).join('')}</tr>`;
      out.push(sec(A.rv.forecast, `<div class="tablewrap"><table class="tbl simple fctbl"><thead><tr><th></th><th class="num">${esc(SF.cols.plan)}</th><th class="num">${esc(SF.cols.worst(R.pct(fc.f.worst)))}</th><th class="num">${esc(SF.cols.base(R.pct(fc.baseAch)))}</th><th class="num">${esc(SF.cols.best(R.pct(fc.f.best)))}</th></tr></thead><tbody>` +
        fr(SF.rows.rev, 'rev', R.baht) + fr(SF.rows.profit, 'profit', R.baht) + fr(SF.rows.margin, 'margin', v => R.pct(v, 1)) + fr(SF.rows.ap, 'ap', v => R.pct(v, 1)) + '</tbody></table></div>' +
        `<dl class="kv"><dt>${esc(SF.be)}</dt><dd>${esc(fc.breakEven.rev == null ? '—' : `${R.baht(fc.breakEven.rev)} · ${SF.beAchV(R.pct(fc.breakEven.ach))}`)}</dd></dl>` +
        (fc.warns.length ? `<ul class="checks2">${fc.warns.map(w => `<li class="warn"><span class="ci">⚠</span>${esc(SF.warn[w.key](w.key === 'worstLoss' ? R.baht(w.v) : R.pct(w.v)))}</li>`).join('')}</ul>` : '') +
        (fc.f.comment ? `<div class="rv-note">${esc(fc.f.comment)}</div>` : '') + (it.v.review && it.v.review.comment ? `<div class="rv-note"><b>${esc(C.step.r.comment)}:</b> ${esc(it.v.review.comment)}</div>` : '')));
      /* CR-06 §7.3 — the plan's COGS / net price against the Product Master (only the SKUs that differ) */
      const dr = R.planCogsDrift(it.v, CP.store.data().products, { prices: true }), G = P.grid;
      if (dr.length) out.push(sec(A.rv.master, `<div class="tablewrap"><table class="tbl simple mdtbl"><thead><tr><th>${esc(P.history.sku)}</th><th class="num">${esc(G.mcols.cogsPlan)}</th><th class="num">${esc(G.mcols.cogsMaster)}</th>${R.CHANNELS.map(k => `<th class="num">${esc(G.mcols.price(k))}</th>`).join('')}</tr></thead><tbody>` +
        dr.map(d => `<tr><td>${esc(d.nickname || d.name)} <span class="muted small">${esc(d.code)}</span></td><td class="num">${esc(R.fmtNum(d.cogs, 2))}</td><td class="num${d.cogsDiff ? ' warnx' : ''}">${esc(R.fmtNum(d.master.cogs, 2))}</td>` +
          R.CHANNELS.map(k => { const x = d.prices[k]; return `<td class="num">${x ? `${esc(R.fmtNum(x.plan, 2))} <span class="muted small">${esc(G.mcols.vs(R.fmtNum(x.master, 2), R.pct(x.off, 0)))}</span>` : ''}</td>`; }).join('') + '</tr>').join('') +
        `</tbody></table></div><div class="muted small">${esc(A.rv.masterNote)}</div>`));
      out.push(sec(A.rv.budget, bl));
      const ck = R.planChecks(it.v, c);
      out.push(sec(A.rv.checks, `<ul class="checks2">${ck.errs.map(x => `<li class="${x.ok ? 'ok' : 'err'}"><span class="ci">${x.ok ? '✓' : '✕'}</span>${esc(x.text)}</li>`).join('')}${ck.warns.map(x => `<li class="warn"><span class="ci">⚠</span>${esc(x.text)}</li>`).join('')}</ul>`));
    } else if (it.req.type === 'period' || it.req.type === 'close') {
      /* CR-13 §4.2 · §5.3 — a period change: from → to + the Impact (and the warning when only the time makes it better) · a close request: the note · the checks */
      const q = it.req, W = C.cpg, Q = C.req, kv = (k, v) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
      if (q.type === 'period') { const a0 = q.period.from, b0 = q.period.to, d = x => (x ? R.dmy(x) : '—');
        out.push(sec(W.rv.period, `<div class="rv-reason"><b>${esc(Q.reason)}:</b> ${esc(q.reason)}</div><table class="tbl simple pctbl"><thead><tr><th></th><th class="num">${esc(W.rv.from)}</th><th class="num">${esc(W.rv.to)}</th></tr></thead><tbody>` +
          [['start', W.per.start], ['end_marketing', W.per.endMkt], ['end', W.per.end]].map(([k, l]) => `<tr class="${(a0[k] || '') !== (b0[k] || '') ? 'chg' : ''}"><td>${esc(l)}</td><td class="num">${esc(d(a0[k]))}</td><td class="num"><b>${esc(d(b0[k]))}</b></td></tr>`).join('') + '</tbody></table>' +
          (q.status === 'pending' ? `<div class="rv-imp">${CP.chgdraw.impactHTML(R.periodImpact(U.seed(), c.id, b0, U.today()))}</div>` : '')));
      } else { const k = (q.close && q.close.checks) || {}, li = t => `<li class="info"><span class="ci">·</span>${esc(t)}</li>`;
        out.push(sec(W.rv.close, `<div class="rv-reason"><b>${esc(W.rv.note)}:</b> ${esc(q.close ? q.close.note : q.reason)}</div><ul class="checks2">` +
          (q.close && q.close.early ? li(`${W.cl.date} ${R.dmy(q.close.close_date)}`) : '') + (k.spent != null ? li(W.cl.spent(R.baht(k.spent), R.baht(k.current), R.pct(k.used))) : '') +
          (k.rev != null ? li(W.cl.rev(R.baht(k.rev), R.pct(k.ach))) : '') + li(W.cl.unused(R.baht(k.unused))) + '</ul>')); }
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
      (it.req ? '' : `<fieldset class="rvsteps"><legend>${esc(A.rv.reviseSteps)}</legend><div class="chkrow">${['1', '2', '3', 'env', '4a', '4b', '4c', '5'].map(k => `<label class="chk"><input type="checkbox" data-rvk="${k}"><span>${esc(C.step.names[k])} <span class="muted small">${esc(it.plan.steps && it.plan.steps[k] ? it.plan.steps[k].assignee || '' : '')}</span></span></label>`).join('')}</div></fieldset>`) +
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
      act = { kind: 'close', reason: F.note.trim(), close: { early: F.early, close_date: F.early ? F.date : null, note: F.note.trim(), moves: mv, checks: { unused: k.unused, spent: k.spent, current: k.current, used: k.used, rev: k.rev, ach: k.ach, profit: k.profit, sure: true } } }; }
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
