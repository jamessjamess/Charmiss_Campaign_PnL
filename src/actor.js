/* actor.js — CR-05 §3: Acting as (no login — D60: an approval must know who did it). The top bar shows who the page acts as (avatar · name · role chip
   as KOL); a click opens "Switch user" (the made-up people of the demo). Every action is saved with this name. Admin: "Edit people…".
   CR-06: the prototype band is gone (§4) · the last item of the menu = Reset demo data (D52). Remembered per tab, then per browser (pref actor_mock). → CP.actor */
CP.actor = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, pref } = U, A = C.actor;
  const key = () => 'actor_mock';
  /* this tab first (two tabs can act as two people — TC11) · then the last one chosen on this computer */
  const ss = { get(k) { try { return sessionStorage.getItem('charmiss_campaign_pnl_' + k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem('charmiss_campaign_pnl_' + k, v); } catch (e) { /* this tab only */ } } };
  const people = () => ((CP.store.data() || {}).people || []);
  const active = () => people().filter(p => p.active !== false);
  /* the one the page acts as: the remembered one · the scenario's actor (Ann, a Manager) · the first Admin · nobody → a Viewer with no name */
  function get() {
    const list = active(), want = ss.get(key()) || pref.get(key(), ''), D = CP.store.data() || {};
    return list.find(p => p.id === want) || list.find(p => p.name === D.actor) || list.find(p => p.role === 'admin') || list[0] || { id: '', name: '', role: 'viewer', active: true };
  }
  function set(id) { ss.set(key(), id); pref.set(key(), id); draw(); document.dispatchEvent(new CustomEvent('cp:actor', { detail: { id } })); }
  const can = (action, plan, x) => R.canDo(action, get(), plan, x);

  /* ---------- the top bar block + the menu ---------- */
  function draw() {
    const b = $('actorBtn'), a = get(); if (!b) return;
    b.innerHTML = `${U.avatar(a.name)}<span class="ab-t"><span class="ab-l">${esc(A.actingAs)}</span><span class="ab-n">${esc(a.name || '—')}</span></span>${U.roleChip(a.role)}<span class="ab-c" aria-hidden="true">▾</span>`;
    b.title = `${A.actingAs} ${a.name} · ${A.roles[a.role] || a.role} — ${A.switchUser}`; b.setAttribute('aria-label', b.title);
  }
  let menu = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; $('actorBtn').setAttribute('aria-expanded', 'false'); } }
  function openMenu() {
    closeMenu();
    const a = get(), list = active(), b = $('actorBtn'), r = b.getBoundingClientRect();
    menu = document.createElement('div'); menu.className = 'amenu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', A.switchUser);
    menu.innerHTML = `<div class="am-h">${esc(A.switchUser)}</div>` + (list.length ? list.map(p => `<button type="button" role="menuitemradio" aria-checked="${p.id === a.id}" class="am-o${p.id === a.id ? ' on' : ''}" data-actor="${esc(p.id)}">${U.avatar(p.name, true)}<span class="am-n">${esc(p.name)}</span>${U.roleChip(p.role)}<span class="am-k">${p.id === a.id ? '✓' : ''}</span></button>`).join('') : `<div class="am-none">${esc(A.none)}</div>`) +
      `<div class="am-sep"></div>` + (R.canDo('people', a).ok ? `<button type="button" role="menuitem" class="am-o am-x" data-actor-people>${esc(A.people)}</button>` : '') +
      `<button type="button" role="menuitem" class="am-o am-x" data-actor-reset title="${esc(C.demo.resetTip)}">${esc(C.demo.reset)}</button>`;
    document.body.appendChild(menu);
    const w = menu.offsetWidth; menu.style.top = `${Math.round(r.bottom + 6)}px`; menu.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)))}px`;
    b.setAttribute('aria-expanded', 'true');
    const first = menu.querySelector('.am-o.on') || menu.querySelector('.am-o'); if (first) first.focus();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#actorBtn'); if (b) { if (menu) closeMenu(); else openMenu(); return; }
    if (!menu) return;
    const o = e.target.closest('[data-actor]'); if (o) { const id = o.dataset.actor; closeMenu(); if (id !== get().id) { set(id); U.toast(`${A.actingAs} ${get().name}`); } return; }
    if (e.target.closest('[data-actor-people]')) { closeMenu(); editPeople(); return; }
    if (e.target.closest('[data-actor-reset]')) { closeMenu(); resetDemo(); return; }
    if (!e.target.closest('.amenu')) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (!menu) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); $('actorBtn').focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const os = [...menu.querySelectorAll('.am-o')], i = os.indexOf(document.activeElement); const n = os[(i + (e.key === 'ArrowDown' ? 1 : -1) + os.length) % os.length]; if (n) n.focus(); }
  });
  window.addEventListener('resize', closeMenu);

  /* ---------- Admin: Edit people… (data/people.csv · Mock: localStorage) ---------- */
  function editPeople() {
    const rows = people().map(p => Object.assign({}, p)), Dd = C.camps.d;
    /* QA-v0.13 B27 — a person has a department (the steps of a plan go to its people · New campaign = Brand) */
    const row = (p, i) => `<tr data-pi="${i}"><td><input class="inp sm" data-pn value="${esc(p.name)}" aria-label="${esc(A.name)}"></td><td><select class="inp sm" data-pr aria-label="${esc(A.role)}">${R.ROLE_KEYS.map(k => `<option value="${k}"${k === p.role ? ' selected' : ''}>${esc(A.roles[k])}</option>`).join('')}</select></td>` +
      `<td><select class="inp sm" data-pd aria-label="${esc(A.dept)}"><option value=""${p.dept ? '' : ' selected'}>${esc(A.depts.none)}</option>${R.DEPTS.map(k => `<option value="${k}"${k === p.dept ? ' selected' : ''}>${esc(A.depts[k])}</option>`).join('')}</select></td>` +
      `<td class="c"><input type="checkbox" data-pa${p.active !== false ? ' checked' : ''} aria-label="${esc(A.active)}"></td></tr>`;
    const body = () => `<div class="dlg-h">${esc(A.peopleTitle)}</div><div class="dlg-b"><p class="muted small">${esc(A.peopleHelp)}</p><table class="tbl simple ptbl"><thead><tr><th>${esc(A.name)}</th><th>${esc(A.role)}</th><th>${esc(A.dept)}</th><th class="c">${esc(A.active)}</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table>` +
      `<button type="button" class="link" data-padd>${esc(A.add)}</button><div class="ferr" id="pp_err"></div></div><div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(Dd.cancel)}</button><button type="button" class="btn primary" data-r="1">${esc(A.save)}</button></div>`;
    U.openDialog(body(), true);
    const dlg = $('dlg');
    const read = () => dlg.querySelectorAll('tr[data-pi]').forEach(tr => { const p = rows[+tr.dataset.pi]; p.name = tr.querySelector('[data-pn]').value; p.role = tr.querySelector('[data-pr]').value; p.dept = tr.querySelector('[data-pd]').value; p.active = tr.querySelector('[data-pa]').checked; });
    dlg.onclick = async e => {
      if (e.target.closest('[data-padd]')) { read(); rows.push({ id: '', name: '', role: 'staff', dept: '', active: true }); dlg.innerHTML = body(); const ins = dlg.querySelectorAll('[data-pn]'); ins[ins.length - 1].focus(); return; }
      const r = e.target.closest('[data-r]'); if (!r) return;
      if (r.dataset.r === '0') { dlg.onclick = null; U.closeDialog(); return; }
      read(); r.disabled = true;
      try { await CP.store.savePeople(rows.map(p => Object.assign({}, p, { id: p.id || R.campaignId(p.name, rows.filter(x => x !== p && x.id)) }))); dlg.onclick = null; U.closeDialog(); U.toast(A.saved); draw(); document.dispatchEvent(new CustomEvent('cp:actor')); }
      catch (x) { r.disabled = false; $('pp_err').textContent = x.errors && x.errors.people === 'brand' ? A.needBrand : C.appr.toast.failed; }
    };
  }

  /* D52 — Reset demo data: what was clicked in this browser goes, the made-up data (the anchor of CR-04) comes back */
  async function resetDemo() {
    const R0 = C.demo;
    if (await U.confirmDialog(R0.resetQ, R0.resetBody, R0.reset, true, C.common.cancel)) { if (CP.cpage && CP.cpage.reset) CP.cpage.reset(); CP.store.resetMock(); U.toast(R0.resetDone); if (CP.app) CP.app.refresh(); }
  }
  document.addEventListener('cp:plans', draw);
  return { get, set, can, draw, people: active, editPeople, resetDemo };
})();
