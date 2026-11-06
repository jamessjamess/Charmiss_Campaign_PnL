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
  const PAGES = ['details', 'products', 'target', 'budget', 'forecast', 'review'];
  const PAGE_STEPS = { details: ['1'], products: ['2'], target: ['3'], budget: ['4a', '4b', '4c'], forecast: ['5'], review: ['6'] };
  const GROUP_OF = { '4a': 'marketing', '4b': 'sales', '4c': 'other' };
  const me = () => CP.actor.get();
  const allCamps = () => { const s = U.seed(); return s.allCampaigns || s.campaigns || []; };
  const campOf = id => allCamps().find(c => c.id === id) || null;
  const planOf = id => CP.store.data().plans[id] || null;
  const master = () => new Map((CP.store.data().products || []).map(p => [p.code, p]));
  const people = () => CP.actor.people();
  const at = () => R.nowLocal();
  let el = null, st = { id: null, page: 'details', mode: 'qty', folded: new Set(), F: null, gT: null, gB: {} };

  /* ===================== the working copy of the version (the page edits it) ===================== */
  function draftOf(id) {
    const plan = planOf(id), ver = plan ? (plan.approval === 'approved' ? R.approvedVersion(plan) : R.working(plan)) : null, c = campOf(id);
    const F = { id, rev: plan ? plan.rev || 0 : 0, ver, skus: ver ? R.clonePlan(ver.skus || []) : [], q: new Map(), amt: new Map(), bud: new Map(), lines: [], dirty: 0, dirtySteps: new Set(),
      details: R.clonePlan((ver && ver.details) || { objective: '', brand: 'Charmiss', category: '', channels: R.CHANNELS.slice() }),
      forecast: R.clonePlan((ver && ver.forecast) || { ach: { MT: 1, TT: 1, ECOM: 1 }, worst: 0.8, best: 1.1, note: '', comment: '' }), review: R.clonePlan((ver && ver.review) || { comment: '' }),
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
      target, budget, details: R.clonePlan(F.details), forecast: R.clonePlan(F.forecast), review: R.clonePlan(F.review) };
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

  /* ===================== render ===================== */
  function render(root, id, page) {
    el = root; const c = campOf(id);
    if (st.id !== id) st = Object.assign(st, { id, F: null, folded: new Set() });
    const plan = planOf(id);
    st.page = PAGES.includes(page) ? page : st.page && st.id === id && PAGES.includes(st.page) ? st.page : firstPage(plan);
    if (!c || !plan) { el.innerHTML = `<div class="pbanner"><div class="crumb"><a href="#planning">${esc(SP.title)}</a></div><h1>${esc(P.notFound)}</h1></div>`; return; }
    if (!st.F || (!st.F.dirty && st.F.rev !== (plan.rev || 0))) st.F = draftOf(id);
    el.innerHTML = `<div class="pbanner"><div class="crumb"><a href="#planning">${esc(SP.title)}</a><span>›</span>${esc(c.name)}</div><h1>${esc(c.name)}</h1></div>` +
      `<div class="cp-head" id="cp_head">${headHTML(c, plan)}</div><nav class="stepper" id="cp_steps" aria-label="${esc(SP.stepsL)}">${stepperHTML(plan)}</nav>` +
      `<div class="plan-wrap"><div id="cp_body" class="cp-body"></div><aside class="plan-side" id="cp_side" aria-label="${esc(SP.side.title)}"></aside></div>`;
    ({ details: renderDetails, products: renderProducts, target: renderTarget, budget: renderBudget, forecast: renderForecast, review: renderReview })[st.page](c, plan);
    renderSide();
  }
  /* the first page that waits on someone (an approved plan: the review) */
  function firstPage(plan) {
    if (!plan || !plan.steps || plan.approval === 'approved' || plan.approval === 'submitted') return 'review';
    const k = R.STEP_KEYS.find(x => { const s = R.stepState(plan, x, U.today()); return s.status !== 'done' && s.open; });
    return k ? R.STEP_PAGE[k] : 'review';
  }
  /* ---------- the head: chips · owner · period · v · the buttons ---------- */
  function headHTML(c, plan) {
    const a = me(), w = R.working(plan), appr = plan.approval, chips = U.apChip(appr, { tip: appr === 'returned' && w && w.comment ? w.comment : '' }) + (appr === 'approved' ? statusChip(R.statusOf(c, U.today())) : '');
    const meta = [plan.owner ? P.owner(plan.owner) : '', `${R.dmy(c.start)} – ${R.dmy(c.end)}`, w ? P.v(w.v) : ''].filter(Boolean).map(esc).join('<span class="sep">·</span>');
    const b = [], can = x => R.canDo(x, a, plan);
    const editable = PAGE_STEPS[st.page].some(k => canStep(plan, k).ok);
    if (editable && st.page !== 'review') b.push(`<span class="dirtyn muted small" id="cp_dirty">${st.F && st.F.dirty ? esc(P.grid.unsaved(st.F.dirty)) : ''}</span><button type="button" class="btn" data-cpact="save"${st.F && st.F.dirty ? '' : ' disabled'}>${esc(P.btn.save)}</button>`);
    if (st.page !== 'budget' && st.page !== 'review') { const k = PAGE_STEPS[st.page][0], s = R.stepState(plan, k, U.today()), ok = canStep(plan, k).ok;
      if (ok && s.status !== 'done') b.push(`<button type="button" class="btn primary" data-cpdone="${k}">${esc(SP.markDone)}</button>`); }
    if (st.page === 'review' && canStep(plan, '6').ok) { const ck = R.stepChecks(livePlan(plan), '6', c); b.push(`<button type="button" class="btn primary" data-cpact="submit"${ck.ok ? '' : ` disabled title="${esc(SP.notReady)}"`}>${esc(P.btn.submit)}</button>`); }
    if (appr === 'submitted') { const d = can('approve'); if (d.ok) b.push(`<button type="button" class="btn primary" data-cpact="review">${esc(SP.reviewBtn)}</button>`); else if (d.why) b.push(`<button type="button" class="btn primary" disabled title="${esc(d.why)}">${esc(P.btn.approve)}</button>`); }
    if (can('withdraw').ok) b.push(`<button type="button" class="btn" data-cpact="withdraw">${esc(P.btn.withdraw)}</button>`);
    if (can('duplicate').ok) b.push(`<button type="button" class="btn" data-cpact="duplicate">${esc(P.btn.duplicate)}</button>`);
    if (appr === 'approved') b.push(`<a class="btn ghost" href="#tracking/${esc(c.id)}">${esc(SP.toMonitor)}</a>`);
    const more = R.canDo('details', a, plan).ok || (a && R.isMgr(a));
    return `<div class="cp-ttl"><div class="cp-chips">${chips}</div><div class="cp-meta">${meta}</div></div><div class="cp-act">${b.join('')}` +
      (more ? `<button type="button" class="icon-btn" data-cpmore aria-haspopup="menu" aria-label="${esc(P.btn.more)}" title="${esc(P.btn.more)}">${ICON.more}</button>` : '') + '</div>';
  }
  /* ---------- the stepper: 6 steps (4 = its three groups) · department · who · Due · status ---------- */
  function stepCell(plan, k) {
    const s = R.stepState(plan, k, U.today()), stc = s.status === 'done' ? 'done' : s.status === 'returned' ? 'ret' : s.status === 'in_progress' ? 'prog' : s.open ? 'open' : 'wait';
    const flags = [s.overdue ? `<span class="chip err">${esc(SP.overdue(s.daysLate))}</span>` : s.soon ? `<span class="chip warn">${esc(SP.dueSoon)}</span>` : '', s.refresh ? `<span class="chip warn">${esc(SP.refresh)}</span>` : ''].join('');
    return `<span class="sd ${stc}" aria-hidden="true">${s.status === 'done' ? '✓' : s.status === 'returned' ? '↩' : k.replace(/[abc]/, '')}</span><span class="sx"><b>${esc(SP.names[k])}</b><span class="muted small sw">${esc(SP.dept[s.dept])} · ${s.assignee ? U.avatar(s.assignee, true) : ''}${esc(s.assignee || '—')}${s.due ? ' · ' + esc(SP.due(R.dmy(s.due))) : ''}</span>` +
      `<span class="ss">${esc(SP.state[s.status])}${s.open || s.status === 'done' ? '' : ' · ' + esc(SP.waiting)}</span>${flags}</span>`;
  }
  function stepperHTML(plan) {
    return PAGES.map((pg, i) => { const ks = PAGE_STEPS[pg], on = pg === st.page;
      const body = ks.length > 1 ? `<span class="sgrp"><span class="sn">${i + 1} · ${esc(SP.pages[pg])}</span>${ks.map(k => `<span class="srow">${stepCell(plan, k)}</span>`).join('')}</span>` : stepCell(plan, ks[0]);
      return `<a class="step${on ? ' on' : ''}${ks.length > 1 ? ' multi' : ''}" href="#planning/${esc(st.id)}/${pg}" data-cppage="${pg}"${on ? ' aria-current="step"' : ''}>${body}</a>`; }).join('');
  }
  /* ---------- the side panel: the Plan P&L live + the checks of this step ---------- */
  function renderSide() {
    const box = $('cp_side'), plan = planOf(st.id), c = campOf(st.id); if (!box || !plan || !c) return;
    const T = R.planTotals(liveVer()), S = SP.side, row = (l, v, cls) => `<div class="ps-r${cls ? ' ' + cls : ''}"><span>${esc(l)}</span><b>${esc(v)}</b></div>`;
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
    $('cp_body').innerHTML = roNote(plan, '3') + `<div class="card"><div class="card-head"><h3>${esc(SP.names[3])}</h3><div class="ctl">${U.segHTML('data-cpmode', [{ v: 'qty', label: G.qty }, { v: 'baht', label: G.baht }], st.mode)}</div></div>` +
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
      onChange: list => { list.forEach(x => { const [, code, ch] = x.r.split('|'), k = `${code}|${ch}|${x.c}`; if (x.v == null || x.v === 0) F.q.delete(k); else F.q.set(k, Math.round(x.v)); F.amt.delete(k); }); F.dirty += list.length - 1; touch('3'); },
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
        `<div class="bstep">${stepCell(plan, k)}${!ed && w.why ? `<span class="muted small">${esc(w.why)}</span>` : ''}${s.none ? `<span class="chip grey">${esc(P.noExpense)}</span>` : ''}</div>` +
        (ed ? toolbarHTML('b' + k) : '') + `<div id="cp_gridB_${k}" class="cp-grid"></div></div>`; };
    $('cp_body').innerHTML = `<div class="cp-apline">${esc(G.apLine(R.pct(T.ap, 1), R.baht(T.mkt), R.baht(T.sls)))} · ${esc(SP.b.other(R.baht(T.oth)))}</div>` + ['4a', '4b', '4c'].map(card).join('');
    ['4a', '4b', '4c'].forEach(k => {
      const type = GROUP_OF[k], ed = !ro(plan, k), ls = F.lines.filter(l => l.type === type), box = $('cp_gridB_' + k);
      if (!ls.length) { box.innerHTML = `<div class="muted small">${esc(G.noLine)}</div>`; st.gB[k] = null; return; }
      st.gB[k] = U.grid(box, { id: 'gB' + k, rows: ls.map(l => ({ key: `B|${type}|${l.line}`, label: l.line, level: 0, leaf: true })), cols: monthCols(bmonths(c)), corner: G.lineCorner, aria: SP.names[k], readOnly: !ed, fmt: v => R.fmtNum(Math.round(v)),
        get: (rk, ck) => { const [, t, line] = rk.split('|'), m = F.bud.get(`${t}|${line}`); return m && m.has(ck) ? m.get(ck) : null; }, canEdit: () => true,
        onChange: list => { list.forEach(x => { const [, t, line] = x.r.split('|'), kk = `${t}|${line}`; if (!F.bud.has(kk)) F.bud.set(kk, new Map()); if (x.v == null || x.v === 0) F.bud.get(kk).delete(x.c); else F.bud.get(kk).set(x.c, Math.round(x.v)); });
          F.dirty += list.length - 1; touch(k); const T2 = R.planTotals(liveVer()), ap = el.querySelector('.cp-apline'); if (ap) ap.textContent = `${G.apLine(R.pct(T2.ap, 1), R.baht(T2.mkt), R.baht(T2.sls))} · ${SP.b.other(R.baht(T2.oth))}`; } });
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
      `<div class="card"><div class="card-head"><h3>${labelInfo(S5.curve, S5.curveTip)}</h3></div><div class="chartbox"><svg id="f_svg" role="img" aria-label="${esc(S5.curve)}"></svg></div></div></div>`;
    drawCurve(fc);
  }
  function drawCurve(fc) {
    const svg = $('f_svg'); if (!svg) return;
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim(), W = Math.max(280, Math.round(svg.parentNode.clientWidth || 420)), H = 240, m = { l: 62, r: 14, t: 14, b: 30 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const pts = fc.curve, ys = pts.map(p => p.profit), lo = Math.min(0, ...ys), hi = Math.max(0, ...ys), y = v => m.t + (hi - v) / ((hi - lo) || 1) * ih, x = a => m.l + (a - 0.5) / 0.7 * iw;
    const T = fc.totals, prof = a => T.target * a * (T.gpPct || 0) - T.budget, dot = (a, l, color) => `<circle cx="${x(a)}" cy="${y(prof(a))}" r="5" fill="${color}"/><text x="${x(a)}" y="${y(prof(a)) - 9}" text-anchor="middle" class="blab">${esc(l)}</text>`;
    let g = `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${css('--text-2')}"/>`;
    [0.5, 0.7, 0.9, 1, 1.1, 1.2].forEach(a => { g += `<text x="${x(a)}" y="${H - 10}" text-anchor="middle" class="axis">${Math.round(a * 100)}%</text>`; });
    [lo, hi].forEach(v => { g += `<text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${esc(R.compact(v))}</text>`; });
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
      `<div class="card"><div class="card-head"><h3>${esc(P.sum.checks)}</h3></div><ul class="checks2">${ck.errs.map(x => `<li class="${x.ok ? 'ok' : 'err'}"><span class="ci">${x.ok ? '✓' : '✕'}</span>${esc(x.text)}${x.detail ? ` <span class="muted">— ${esc(x.detail)}</span>` : ''}</li>`).join('')}${ck.warns.map(x => `<li class="warn"><span class="ci">⚠</span>${esc(x.text)}</li>`).join('')}</ul></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(S6.comment)}</h3></div>${ed ? `<textarea class="inp" id="r_cmt" rows="3" maxlength="500" data-rcmt placeholder="${esc(S6.commentPh)}">${esc(F.review.comment || '')}</textarea>` : `<div>${esc(F.review.comment || '—')}</div>`}</div>`;
    void lp;
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
    if (F.dirtySteps.has('1')) {
      const L = F.list, e = R.validateCampaign({ name: L.name, start: L.start, end: L.end, end_marketing: L.end_marketing }, CP.store.data().list.rows, st.id);
      Object.keys(e).forEach(k => { const x = $('d_e_' + k); if (x) x.textContent = e[k]; }); if (Object.keys(e).length) { U.toast(SP.fixFirst); return false; }
      if (L.name !== c.name || L.start !== c.start || L.end !== c.end || (L.end_marketing || '') !== (c.end_marketing || '')) {
        try { await CP.store.saveList({ action: 'edit', id: st.id, values: { campaign: L.name, start: L.start, end: L.end, end_marketing: L.end_marketing, status: 'auto' } }, { today: U.today() }); }
        catch (x) { U.toast(A.toast.failed); return false; } }
    }
    const v = serialize(F), steps = [...F.dirtySteps], assign = [...F.assign.entries()], owner = F.owner;
    const p = await save(st.id, x => { let y = R.planAct(x, { type: 'save', by: a.name, at: at(), skus: v.skus, target: v.target, budget: v.budget, details: v.details, forecast: v.forecast, review: v.review, steps: steps.filter(k => k !== '1' || true) });
      assign.forEach(([k, z]) => { const s = y.steps[k] || {}; if ((z.assignee != null && z.assignee !== s.assignee) || (z.due != null && z.due !== s.due)) y = R.planAct(y, { type: 'step.assign', step: k, assignee: z.assignee, due: z.due, by: a.name, at: at() }); });
      if (owner && owner !== y.owner) { y.owner = owner; ['1', '2', '6'].forEach(k => { if (y.steps[k] && y.steps[k].assignee === x.owner) y.steps[k].assignee = owner; }); }
      return y; }, quiet ? '' : A.toast.saved);
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); return true; }
    return false;
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
    const pg = t.closest('[data-cppage]'); if (pg) { e.preventDefault(); if (pg.dataset.cppage !== st.page) location.hash = `#planning/${st.id}/${pg.dataset.cppage}`; return; }
    const plan = planOf(st.id), a = me(), ac = t.closest('[data-cpact]');
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
  return { render, isDirty, confirmLeave, current: () => st.id, reset: () => { st.F = null; }, diffHTML, planTiles, legendHTML, budgetTrackHTML, grids: () => ({ t: st.gT, b: st.gB }), draft: () => st.F, serialize, PAGES };
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
      (it.req ? '' : `<fieldset class="rvsteps"><legend>${esc(A.rv.reviseSteps)}</legend><div class="chkrow">${['1', '2', '3', '4a', '4b', '4c', '5'].map(k => `<label class="chk"><input type="checkbox" data-rvk="${k}"><span>${esc(C.step.names[k])} <span class="muted small">${esc(it.plan.steps && it.plan.steps[k] ? it.plan.steps[k].assignee || '' : '')}</span></span></label>`).join('')}</div></fieldset>`) +
      `<div class="rv-btns"><button type="button" class="btn danger" data-rvdo="reject">${esc(A.rv.reject)}</button><button type="button" class="btn" data-rvdo="${it.req ? 'return' : 'revise'}">${esc(it.req ? A.rv.ret : A.rv.revise)}</button><button type="button" class="btn primary" data-rvdo="approve" disabled>${esc(A.rv.approve)}</button></div>`
      : `<div class="muted">${esc(pending ? dec.why || A.rv.readOnly : A.decided(A.state[it.status] || it.status, it.req ? it.req.decided_by || '—' : it.v.decided_by || '—', it.req ? R.dmy(String(it.req.decided_at || '').slice(0, 10)) : R.dmy(String(it.v.decided_at || '').slice(0, 10))))}</div>` +
        (pending && wd.ok ? `<div class="rv-btns"><button type="button" class="btn" data-rvdo="withdraw">${esc(A.rv.withdraw)}</button></div>` : ''), 'rv_dec'));
    const head = `<div class="rv-h"><div class="rv-t"><h2>${esc(A.rv.title(it.title, c.name))}</h2><div class="rv-sub">${U.apChip(it.status)} <span class="apt ${esc(it.req ? it.req.type : 'plan')}">${esc(it.title)}</span> <span class="muted">${esc(A.sub(it.by || '—', it.at ? R.dmy(String(it.at).slice(0, 10)) : '—', age == null ? '' : A.ago(age), it.v ? it.v.v : null))}</span></div></div>` +
      `${nav}<button type="button" class="icon-btn" data-rvclose aria-label="${esc(C.common.close)}" title="${esc(C.common.close)}">${ICON.close}</button></div>`;
    const foot = pending && dec.ok ? `<div class="rv-f"><span class="muted small" id="rv_hint">${esc(A.rv.scroll)}</span><button type="button" class="btn small" data-rvjump>${esc(A.rv.jump)}</button></div>` : '';
    const m = U.openModal(head + `<div class="rv-b" id="rv_b">${out.join('')}</div>` + foot, 'L', () => { cur = null; });
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
