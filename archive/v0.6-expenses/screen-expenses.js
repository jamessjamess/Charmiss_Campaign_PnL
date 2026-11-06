/* screen-expenses.js — CR-05 §8: WORK › Expenses (#expenses) — the expenses of the approved Campaigns (this browser's demo data, CR-06).
   Committed (entered) · Paid (Admin / Accounting: Mark paid) · Void (kept in the list, no longer counted). Committed + Paid = the Spend actual (D45).
   New / Edit (a drawer, the Line budget beside it): over the Campaign's remaining budget → blocked + Request budget (the part over) · over the line → a warning,
   it saves with "Over line budget" (D47). Export (CR-06 · D53: no Paste rows). The table also sits in the Expenses tab of the Campaign page. → CP.screens.expenses · CP.expenses */
CP.screens = CP.screens || {};
CP.expenses = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON, none, pref } = U, E = C.exp;
  const me = () => CP.actor.get();
  const saved = pref.json('exps', {}) || {};
  const st = Object.assign({ year: 'all', cid: 'all', line: 'all', status: ['committed', 'paid'], q: '' }, saved, { q: '' });
  const keep = () => pref.setJson('exps', { year: st.year, cid: st.cid, line: st.line, status: st.status });
  /* the Campaigns that take expenses: a web plan, approved (D46 — the rest spend in their P&L file) */
  const seed = () => U.seed();
  const webCamps = () => seed().campaigns || [];
  const campOf = id => (seed().allCampaigns || seed().campaigns || []).find(c => c.id === id) || null;
  const planOf = id => CP.store.data().plans[id] || null;
  const live = c => !!c && R.statusOf(c, U.today()) !== R.CANCELLED;
  /* every row with its Campaign (id · name) — the line over its budget (whole Campaign) gets a chip */
  function allRows() {
    const D = CP.store.data(), s = seed(), out = [], budget = new Map();
    (s.expenses || []).forEach(r => { if (r.scenario === 'budget') { const k = `${r.campaign_id}|${r.type}|${r.line}`; budget.set(k, (budget.get(k) || 0) + (r.amount || 0)); } });
    Object.entries(D.expenses || {}).forEach(([cid, rows]) => {
      const c = campOf(cid); if (!c) return;
      const com = new Map(); rows.forEach(r => { if (r.status !== 'void') { const k = `${cid}|${r.type}|${r.line}`; com.set(k, (com.get(k) || 0) + (+r.amount || 0)); } });
      rows.forEach(r => { const k = `${cid}|${r.type}|${r.line}`; out.push(Object.assign({}, r, { cid, cname: c.name, overLine: r.status !== 'void' && (com.get(k) || 0) > (budget.get(k) || 0) + 0.5 })); });
    });
    return out;
  }
  const lineKey = r => `${r.type}|${r.line}`;
  function filtered(o = {}) {
    const q = R.foldText(o.cid ? '' : st.q);
    return allRows().filter(r => (o.cid ? r.cid === o.cid : (st.cid === 'all' || r.cid === st.cid) && (st.year === 'all' || r.month.slice(0, 4) === String(st.year)) && (st.line === 'all' || lineKey(r) === st.line) && st.status.includes(r.status))
      && (!q || [r.vendor, r.doc_no, r.description, r.cname, r.line].some(x => R.foldText(x).includes(q))))
      .sort((a, b) => b.month.localeCompare(a.month) || a.cname.localeCompare(b.cname) || b.no - a.no);
  }

  /* ---------- the table (the page · the Campaign page's tab) ---------- */
  function tableHTML(rows, o = {}) {
    const K = E.cols, a = me();
    if (!rows.length) return `<div class="c3-empty">${esc(E.none)}</div>`;
    const tot = rows.reduce((s, r) => s + (r.status === 'void' ? 0 : +r.amount || 0), 0);
    const body = rows.map(r => { const plan = planOf(r.cid), can = R.canDo('expense.edit', a, plan, { row: r }).ok || R.canDo('expense.paid', a, plan, { row: r }).ok;
      return `<tr class="${r.status === 'void' ? 'void' : ''}"><td class="num">${r.no}</td><td class="nowrap">${esc(R.monthName(r.month))}</td>${o.cid ? '' : `<td><a class="link" href="#campaigns/${esc(r.cid)}/expenses">${esc(r.cname)}</a></td>`}` +
        `<td><span class="muted small">${esc(r.type === 'marketing' ? C.plan.grid.mkt : C.plan.grid.sls)}</span> ${esc(r.line)}${r.overLine ? ` <span class="chip warn" title="${esc(E.overLineTip)}">${esc(E.overLine)}</span>` : ''}</td>` +
        `<td>${esc(r.vendor || '')}</td><td class="wrap">${esc(r.description || '')}${r.note ? `<div class="muted small">${esc(r.note)}</div>` : ''}</td><td class="nowrap">${esc(r.doc_no || '')}</td>` +
        `<td class="num">${esc(R.baht(+r.amount || 0))}</td><td>${U.expChip(r.status)}${r.status === 'paid' && r.paid_at ? `<div class="muted small">${esc(R.dmy(String(r.paid_at).slice(0, 10)))}</div>` : ''}</td><td>${esc(r.by || '')}</td>` +
        `<td class="kmore">${can || !o.cid ? `<button type="button" class="icon-btn" data-exmore="${esc(r.cid)}|${r.no}" aria-haspopup="menu" aria-label="${esc(`${E.menu.more} · #${r.no}`)}" title="${esc(E.menu.more)}">${ICON.more}</button>` : ''}</td></tr>`; }).join('');
    return `<div class="tablewrap"><table class="tbl simple exptbl"><thead><tr><th class="num">${esc(K.no)}</th><th>${esc(K.month)}</th>${o.cid ? '' : `<th>${esc(K.campaign)}</th>`}<th>${esc(K.line)}</th><th>${esc(K.vendor)}</th><th>${esc(K.description)}</th><th>${esc(K.doc)}</th><th class="num">${esc(K.amount)}</th><th>${esc(K.status)}</th><th>${esc(K.by)}</th><th></th></tr></thead>` +
      `<tbody>${body}</tbody><tfoot><tr class="total"><td colspan="${o.cid ? 6 : 7}"><b>${esc(E.total(rows.filter(r => r.status !== 'void').length))}</b></td><td class="num"><b>${esc(R.baht(tot))}</b></td><td colspan="3"></td></tr></tfoot></table></div>`;
  }
  function table(box, o) { box.innerHTML = tableHTML(filtered(o), o); }

  /* ---------- the ⋯ menu (Edit · Mark paid… · Void… · Open campaign) ---------- */
  function closeMenu() { const m = $('x_menu'); if (m) m.remove(); }
  function openMenu(btn, cid, no) {
    closeMenu();
    const r = (CP.store.data().expenses[cid] || []).find(x => x.no === no); if (!r) return;
    const a = me(), plan = planOf(cid), ed = R.canDo('expense.edit', a, plan, { row: r }).ok, pd = R.canDo('expense.paid', a, plan, { row: r }).ok, m = document.createElement('div');
    m.id = 'x_menu'; m.className = 'menu-pop'; m.setAttribute('role', 'menu');
    m.innerHTML = `<button type="button" role="menuitem" data-xact="edit"${ed ? '' : ' disabled'}>${esc(E.menu.edit)}</button><button type="button" role="menuitem" data-xact="paid"${pd ? '' : ' disabled'}>${esc(E.menu.paid)}</button>` +
      `<button type="button" role="menuitem" data-xact="open">${esc(E.menu.open)}</button><button type="button" role="menuitem" class="danger" data-xact="void"${ed ? '' : ' disabled'}>${esc(E.menu.void)}</button>`;
    document.body.appendChild(m);
    const b = btn.getBoundingClientRect();
    m.style.top = Math.min(innerHeight - m.offsetHeight - 8, b.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, b.right - m.offsetWidth)) + 'px';
    const f = m.querySelector('button:not([disabled])'); if (f) f.focus();
    m.addEventListener('click', e => { const x = e.target.closest('[data-xact]'); if (!x || x.disabled) return; closeMenu();
      if (x.dataset.xact === 'edit') openForm({ cid, no }); if (x.dataset.xact === 'paid') askPaid(cid, r); if (x.dataset.xact === 'void') askVoid(cid, r); if (x.dataset.xact === 'open') location.hash = `#campaigns/${cid}/expenses`; });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); btn.focus(); } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const bs = [...m.querySelectorAll('button:not([disabled])')], i = bs.indexOf(document.activeElement); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); } });
  }
  document.addEventListener('click', e => {
    if ($('x_menu') && !e.target.closest('#x_menu') && !e.target.closest('[data-exmore]')) closeMenu();
    const b = e.target.closest('[data-exmore]'); if (!b) return;
    e.stopPropagation(); const [cid, no] = [b.dataset.exmore.slice(0, b.dataset.exmore.lastIndexOf('|')), +b.dataset.exmore.slice(b.dataset.exmore.lastIndexOf('|') + 1)];
    if ($('x_menu')) { closeMenu(); return; } openMenu(b, cid, no);
  }, true);

  /* ---------- a save ---------- */
  async function save(cid, act, msg, detail) {
    const a = me(), at = R.nowLocal();
    try { await CP.store.saveExpenses(cid, rows => R.expenseAct(rows, Object.assign({ by: a.name, at }, act)), { log: { type: 'log', action: 'expense', detail, by: a.name, at } }); U.toast(msg); CP.app.refresh(); return true; }
    catch (x) { U.toast(x.code === 'conflict' ? C.appr.toast.conflict : C.appr.toast.failed); if (x.code === 'conflict') CP.app.refresh(); return false; }
  }
  function askPaid(cid, r) {
    const P = E.paidD, Dd = C.camps.d;
    U.openDialog(`<div class="dlg-h">${esc(P.title(r.no))}</div><div class="dlg-b"><div class="field"><label for="xp_t">${esc(P.date)}</label>${U.dateHTML('id="xp_d"', U.today(), { textId: 'xp_t' })}</div>` +
      `<div class="field"><label for="xp_ref">${esc(P.ref)}</label><input id="xp_ref" class="inp" maxlength="80" placeholder="${esc(P.refPh)}"></div><div class="ferr" id="xp_e"></div></div>` +
      `<div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(Dd.cancel)}</button><button type="button" class="btn primary" data-r="1">${esc(P.ok)}</button></div>`);
    const dlg = $('dlg');
    dlg.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', async () => {
      if (b.dataset.r === '0') { U.closeDialog(); return; }
      const d = $('xp_d').value; if (!R.isISODate(d)) { $('xp_e').textContent = C.camps.err.date || C.exp.d.required; return; }
      const ref = $('xp_ref').value.trim(); U.closeDialog();
      save(cid, { type: 'paid', no: r.no, paid_at: d, note: ref ? `Ref ${ref}` : '' }, E.toast.paid(r.no), `#${r.no} ${C.exp.state.paid} ${R.baht(+r.amount)}`);
    }));
  }
  function askVoid(cid, r) {
    const V = E.voidD, Dd = C.camps.d;
    U.openDialog(`<div class="dlg-h">${esc(V.title(r.no))}</div><div class="dlg-b"><p>${esc(V.body)}</p><div class="field"><label for="xv_r">${esc(V.reason)} <span class="req">*</span></label><textarea id="xv_r" class="inp" rows="2" maxlength="200"></textarea><div class="ferr" id="xv_e"></div></div></div>` +
      `<div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(Dd.cancel)}</button><button type="button" class="btn danger" data-r="1">${esc(V.ok)}</button></div>`);
    $('xv_r').focus();
    $('dlg').querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.r === '0') { U.closeDialog(); return; }
      const why = $('xv_r').value.trim(); if (!why) { $('xv_e').textContent = V.need; return; }
      U.closeDialog(); save(cid, { type: 'void', no: r.no, note: why }, E.toast.void(r.no), `#${r.no} ${C.exp.state.void} — ${why}`);
    }));
  }

  /* ===================== New / Edit (a drawer · the Line budget beside it) ===================== */
  let F = null;
  const monthsOf = c => R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end);
  /* the lines of a Campaign = the lines of its current budget */
  function linesOf(cid) { const set = new Set(); (seed().expenses || []).forEach(r => { if (r.campaign_id === cid && r.scenario === 'budget') set.add(`${r.type}|${r.line}`); }); return [...set].sort((a, b) => (a.startsWith('marketing') === b.startsWith('marketing') ? a.localeCompare(b) : a.startsWith('marketing') ? -1 : 1)); }
  const openCamps = () => { const a = me(); return webCamps().filter(c => live(c) && R.canDo('expense.new', a, planOf(c.id)).ok); };
  function openForm(o = {}) {
    const cur = R.ym(U.today()), r0 = o.no ? (CP.store.data().expenses[o.cid] || []).find(x => x.no === o.no) : null;
    const cid = o.cid || (st.cid !== 'all' ? st.cid : (openCamps()[0] || {}).id || ''), c = campOf(cid);
    const ms = c ? monthsOf(c) : [], lines = cid ? linesOf(cid) : [];
    F = { cid, no: r0 ? r0.no : null, orig: r0, dirty: false, tried: false,
      v: r0 ? { key: `${r0.type}|${r0.line}`, month: r0.month, vendor: r0.vendor || '', description: r0.description || '', doc_no: r0.doc_no || '', amount: String(r0.amount) }
        : { key: o.key || lines[0] || '', month: ms.includes(cur) ? cur : ms[ms.length - 1] || cur, vendor: '', description: '', doc_no: '', amount: '' } };
    U.openDrawer({ kind: 'exp', isDirty: () => F && F.dirty, onClose: () => { F = null; }, onKey: e => { if (e.key === 'Enter' && !e.target.matches('textarea, button, select') && !e.shiftKey) { e.preventDefault(); submit(); } } }, formHTML());
    $('drawer_content').classList.add('form', 'wide'); wire(); update();
    const f = $(F.no ? 'xf_amount' : cid ? 'xf_vendor' : 'xf_c'); if (f) f.focus();
  }
  function formHTML() {
    const D = E.d, c = campOf(F.cid), camps = F.no ? [c] : openCamps(), lines = F.cid ? linesOf(F.cid) : [], ms = c ? monthsOf(c) : [], v = F.v;
    const fld = (id, label, inp, req) => `<div class="field"><label for="${id}">${esc(label)}${req ? ' <span class="req">*</span>' : ''}</label>${inp}<div class="ferr" id="${id}_e"></div></div>`;
    return `<div class="dr-head"><div class="dr-title"><h2 id="k_f_h">${esc(F.no ? D.editTitle(F.no) : D.newTitle)}</h2>${c ? `<div class="dr-sub">${esc(c.name)}</div>` : ''}</div><button type="button" class="icon-btn" data-dr-close aria-label="${esc(C.common.close)}">${ICON.close}</button></div>` +
      `<div class="dr-body xform"><div class="xf-main">` +
      fld('xf_c', D.campaign, `<select id="xf_c" class="inp"${F.no ? ' disabled' : ''}><option value="">${esc(D.campaignPh)}</option>${camps.filter(Boolean).map(x => `<option value="${esc(x.id)}"${x.id === F.cid ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select><div class="help">${esc(D.onlyWeb)}</div>`, true) +
      `<div class="frow">${fld('xf_line', D.line, `<select id="xf_line" class="inp">${lines.map(k => `<option value="${esc(k)}"${k === v.key ? ' selected' : ''}>${esc(k.split('|')[1])} · ${esc(k.startsWith('marketing') ? C.plan.grid.mkt : C.plan.grid.sls)}</option>`).join('')}</select>`, true)}` +
      fld('xf_month', D.month, `<select id="xf_month" class="inp">${ms.map(m => `<option value="${m}"${m === v.month ? ' selected' : ''}>${esc(R.monthName(m))}</option>`).join('')}</select>`, true) + '</div>' +
      fld('xf_vendor', D.vendor, `<input id="xf_vendor" class="inp" maxlength="100" value="${esc(v.vendor)}">`, true) +
      fld('xf_desc', D.description, `<input id="xf_desc" class="inp" maxlength="200" value="${esc(v.description)}">`) +
      `<div class="frow">${fld('xf_doc', D.doc, `<input id="xf_doc" class="inp" maxlength="40" value="${esc(v.doc_no)}">`)}${fld('xf_amount', D.amount, `<input id="xf_amount" class="inp num" inputmode="decimal" value="${esc(v.amount)}">`, true)}</div>` +
      (F.orig ? `<div class="muted small">${esc(D.status)}: ${esc(C.exp.state[F.orig.status])}</div>` : '') +
      `</div><aside class="xf-side" id="xf_side" aria-live="polite"></aside></div>` +
      `<div class="dr-foot"><div class="ferr fmsg" id="xf_msg"></div><button type="button" class="btn" data-dr-close>${esc(C.common.cancel)}</button><button type="button" class="btn primary" id="xf_save">${esc(D.save)}</button></div>`;
  }
  function read() { const g = id => ($(id) ? $(id).value : ''); F.v = { key: g('xf_line'), month: g('xf_month'), vendor: g('xf_vendor'), description: g('xf_desc'), doc_no: g('xf_doc'), amount: g('xf_amount') }; }
  function room() {
    if (!F.cid || !F.v.key) return null; const [type, line] = F.v.key.split('|'), amt = U.parseNum(F.v.amount);
    return R.expenseRoom(seed(), F.cid, type, line, F.v.month, amt == null || Number.isNaN(amt) ? 0 : amt, F.orig && F.orig.status !== 'void' ? +F.orig.amount : 0);
  }
  function update() {
    if (!F) return;
    const D = E.d, x = room(), amt = U.parseNum(F.v.amount), side = $('xf_side'), msg = $('xf_msg');
    side.innerHTML = x ? `<div class="xs-h">${esc(D.side)}</div><div class="xs-l">${esc(F.v.key.split('|')[1])}</div>` +
      `<dl class="kv xs"><dt>${esc(D.thisMonth)}</dt><dd>${esc(`${R.baht(x.month.committed)} / ${R.baht(x.month.budget)}`)}</dd><dt>${esc(D.whole)}</dt><dd>${esc(`${R.baht(x.line.committed)} / ${R.baht(x.line.budget)}`)}</dd>` +
      `<dt>${esc(D.remaining)}</dt><dd class="${x.line.after < -0.5 ? 'neg' : ''}">${esc(`${R.baht(x.line.remaining)} → ${R.baht(x.line.after)}`)}</dd></dl>` +
      `<div class="xs-h">${esc(D.campaignLeft)}</div>${U.budgetBar({ current: x.campaign.budget, committed: x.campaign.committed, paid: null, pending: 0, toDate: 0 })}<dl class="kv xs"><dt>${esc(D.remaining)}</dt><dd class="${x.campaign.after < -0.5 ? 'neg' : ''}">${esc(`${R.baht(x.campaign.remaining)} → ${R.baht(x.campaign.after)}`)}</dd></dl>` : '';
    let block = false;
    if (x && x.overCampaign) { block = true; msg.innerHTML = `<span>${esc(D.blockOver(R.baht(x.short)))}</span> <button type="button" class="btn small" data-xreq>${esc(D.request)}</button>`; msg.className = 'ferr fmsg'; }
    else if (x && x.overLine) { msg.textContent = D.warnLine(R.baht(-x.line.after)); msg.className = 'fwarn fmsg'; }
    else { msg.textContent = ''; msg.className = 'ferr fmsg'; }
    const errs = {}; if (!F.cid) errs.xf_c = D.required; if (!F.v.key) errs.xf_line = D.required; if (!F.v.vendor.trim()) errs.xf_vendor = D.required; if (!(amt > 0)) errs.xf_amount = D.amountPos;
    ['xf_c', 'xf_line', 'xf_vendor', 'xf_amount'].forEach(k => { const el = $(k + '_e'); if (el) el.textContent = F.tried && errs[k] ? errs[k] : ''; });
    $('xf_save').disabled = block; F.errs = errs; F.block = block;
  }
  function wire() {
    const dc = $('drawer_content');
    dc.oninput = () => { F.dirty = true; read(); update(); };
    dc.onchange = e => { F.dirty = true; if (e.target.id === 'xf_c') { F.cid = e.target.value; F.v.key = (linesOf(F.cid)[0]) || ''; const c = campOf(F.cid), ms = c ? monthsOf(c) : [], cur = R.ym(U.today()); F.v.month = ms.includes(cur) ? cur : ms[ms.length - 1] || cur; read(); const keepV = Object.assign({}, F.v); U.fillDrawer(formHTML()); dc.classList.add('form', 'wide'); wire(); F.v = Object.assign(keepV, { key: $('xf_line') ? $('xf_line').value : '' }); } else read(); update(); };
    dc.onclick = e => {
      if (e.target.closest('#xf_save')) { submit(); return; }
      if (e.target.closest('[data-xreq]')) { const x = room(), [type, line] = F.v.key.split('|'), cid = F.cid, month = F.v.month; F.dirty = false; U.closeDrawer();
        CP.reqdraw.open(cid, { key: `${type}|${line}`, month, amount: Math.ceil(x.short), reason: C.req.shortFor(line, R.monthName(month)) }); }
    };
  }
  async function submit() {
    if (!F) return; read(); F.tried = true; update();
    if (Object.keys(F.errs).length || F.block) { const k = Object.keys(F.errs)[0]; if (k && $(k)) $(k).focus(); return; }
    const [type, line] = F.v.key.split('|'), row = { type, line, month: F.v.month, vendor: F.v.vendor.trim(), description: F.v.description.trim(), doc_no: F.v.doc_no.trim(), amount: Math.round(U.parseNum(F.v.amount) * 100) / 100 };
    const cid = F.cid, no = F.no, x = room();
    $('xf_save').disabled = true;
    const rowsNow = CP.store.data().expenses[cid] || [], nn = no || R.nextNo(rowsNow);
    const ok = await save(cid, no ? { type: 'edit', no, row } : { type: 'add', row }, E.toast.saved(nn), `#${nn} ${row.line} ${R.monthName(row.month)} ${R.baht(row.amount)}${x && x.overLine ? ' · ' + E.overLine : ''}`);
    if (ok) { F = null; U.closeDrawer(); } else if (F) $('xf_save').disabled = false;
  }

  /* ===================== the page ===================== */
  let sec = null;
  function render() {
    sec = $('tab-expenses');
    if (!sec.dataset.built) {
      sec.innerHTML = `<div class="pbanner"><h1>${esc(E.title)}</h1></div>` +
        `<div class="toolbar ctools" id="x_tools"></div><div class="card" id="x_table"></div>`;
      sec.addEventListener('click', onClick); sec.addEventListener('change', onChange);
      sec.addEventListener('input', e => { if (e.target.matches('[data-xq]')) { st.q = e.target.value; drawTable(); } });
      sec.dataset.built = '1';
    }
    drawTools(); drawTable();
  }
  function drawTools() {
    const rows = allRows(), years = [...new Set(rows.map(r => r.month.slice(0, 4)))].sort(), camps = webCamps(), lines = [...new Set(rows.filter(r => st.cid === 'all' || r.cid === st.cid).map(lineKey))].sort();
    if (st.cid !== 'all' && !camps.some(c => c.id === st.cid)) st.cid = 'all'; if (st.line !== 'all' && !lines.includes(st.line)) st.line = 'all';
    const a = me(), canNew = openCamps().length > 0, sAll = st.status.length === 3;
    $('x_tools').innerHTML = `<label class="ms"><select class="ms-trigger sel yr" data-xyear aria-label="${esc(E.yearL)}"><option value="all">${esc(E.allYears)}</option>${years.map(y => `<option value="${y}"${String(st.year) === y ? ' selected' : ''}>${y}</option>`).join('')}</select></label>` +
      `<label class="ms"><select class="ms-trigger sel" data-xcamp aria-label="${esc(E.campaignL)}"><option value="all">${esc(E.allCampaigns)}</option>${camps.map(c => `<option value="${esc(c.id)}"${st.cid === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` +
      `<label class="ms"><select class="ms-trigger sel" data-xline aria-label="${esc(E.lineL)}"><option value="all">${esc(E.allLines)}</option>${lines.map(k => `<option value="${esc(k)}"${st.line === k ? ' selected' : ''}>${esc(k.split('|')[1])}</option>`).join('')}</select></label>` +
      `<span class="seg xst" role="group" aria-label="${esc(E.statusL)}">${['committed', 'paid', 'void'].map(k => `<button type="button" data-xst="${k}" class="${st.status.includes(k) ? 'on' : ''}" aria-pressed="${st.status.includes(k)}">${esc(E.state[k])}</button>`).join('')}</span>` +
      `<label class="ksearch">${ICON.search}<input type="search" data-xq value="${esc(st.q)}" placeholder="${esc(E.search)}" aria-label="${esc(E.search)}" autocomplete="off"></label><span class="spacer"></span>` +
      `<button type="button" class="btn" data-xexport>${ICON.download}<span>${esc(E.exportBtn)}</span></button>` +
      (canNew ? `<button type="button" class="btn primary" data-xnew>${ICON.plus}<span>${esc(E.newBtn)}</span></button>` : '') + (sAll ? '' : '');
    void a;
  }
  function drawTable() { $('x_table').innerHTML = tableHTML(filtered()); }
  function exportTable() {
    const rows = filtered(), K = E.cols;
    U.saveXlsx(E.file, st.cid === 'all' ? E.allCampaigns : (campOf(st.cid) || {}).name || st.cid, [{ title: E.title, header: [K.no, K.month, K.campaign, 'Type', K.line, K.vendor, K.description, K.doc, K.amount, K.status, 'Paid date', K.by, 'Note'],
      cols: [null, null, null, null, null, null, null, null, 'money'], rows: rows.map(r => [r.no, r.month, r.cname, r.type, r.line, r.vendor, r.description, r.doc_no, +r.amount, E.state[r.status], r.paid_at || '', r.by, r.note || '']),
      total: [E.total(rows.filter(r => r.status !== 'void').length), '', '', '', '', '', '', '', rows.reduce((s, r) => s + (r.status === 'void' ? 0 : +r.amount || 0), 0)] }], [[C.camps.meta.at, R.dmy(U.today())]]);
  }
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-xnew]')) return openForm({});
    if (t.closest('[data-xexport]')) return exportTable();
    const s = t.closest('[data-xst]'); if (s) { const k = s.dataset.xst; st.status = st.status.includes(k) ? st.status.filter(x => x !== k) : st.status.concat([k]); if (!st.status.length) st.status = [k]; keep(); drawTools(); drawTable(); }
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-xyear]')) st.year = t.value; else if (t.matches('[data-xcamp]')) { st.cid = t.value; st.line = 'all'; } else if (t.matches('[data-xline]')) st.line = t.value; else return;
    keep(); drawTools(); drawTable();
  }
  CP.screens.expenses = { render };
  /* CR-06 §6 — Operations › Unpaid expenses opens this page with Committed only */
  const showStatus = list => { Object.assign(st, { status: list.slice(), year: 'all', cid: 'all', line: 'all', q: '' }); keep(); };
  return { table, openForm, allRows, showStatus };
})();
