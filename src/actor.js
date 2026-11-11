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
  const titleOf = p => (p && (p.title || (p.dept ? A.depts[p.dept] : '') || A.roles[p.role])) || '';
  function draw() {
    const b = $('actorBtn'), a = get(); if (!b) return;
    /* CR-15 §11.2 — the chip = the position (none = the department) — not the role any more */
    b.innerHTML = `${U.avatar(a.name)}<span class="ab-t"><span class="ab-l">${esc(A.actingAs)}</span><span class="ab-n">${esc(a.name || '—')}</span></span><span class="rchip ${esc(a.role)} ptitle">${esc(titleOf(a))}</span><span class="ab-c" aria-hidden="true">▾</span>`;
    b.title = `${A.actingAs} ${a.name} · ${titleOf(a)} · ${A.roles[a.role] || a.role} — ${A.switchUser}`; b.setAttribute('aria-label', b.title);
  }
  let menu = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; $('actorBtn').setAttribute('aria-expanded', 'false'); } }
  function openMenu() {
    closeMenu();
    const a = get(), list = active(), b = $('actorBtn'), r = b.getBoundingClientRect();
    menu = document.createElement('div'); menu.className = 'amenu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', A.switchUser);
    menu.innerHTML = `<div class="am-h">${esc(A.switchUser)}</div>` + (list.length ? list.map(p => `<button type="button" role="menuitemradio" aria-checked="${p.id === a.id}" class="am-o${p.id === a.id ? ' on' : ''}" data-actor="${esc(p.id)}">${U.avatar(p.name, true)}<span class="am-n">${esc(p.name)}<span class="am-s">${esc([p.title, p.dept ? A.depts[p.dept] : ''].filter(Boolean).join(' · '))}</span></span>${U.roleChip(p.role)}<span class="am-k">${p.id === a.id ? '✓' : ''}</span></button>`).join('') : `<div class="am-none">${esc(A.none)}</div>`) +
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
    const o = e.target.closest('[data-actor]'); if (o) { const id = o.dataset.actor; closeMenu(); if (id !== get().id) switchTo(id); return; }
    if (e.target.closest('[data-actor-people]')) { closeMenu(); editPeople(); return; }   /* CR-15 §10.2 — Settings › Users */
    if (e.target.closest('[data-actor-reset]')) { closeMenu(); resetDemo(); return; }
    if (!e.target.closest('.amenu')) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (!menu) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); $('actorBtn').focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const os = [...menu.querySelectorAll('.am-o')], i = os.indexOf(document.activeElement); const n = os[(i + (e.key === 'ArrowDown' ? 1 : -1) + os.length) % os.length]; if (n) n.focus(); }
  });
  window.addEventListener('resize', closeMenu);

  /* ---------- Admin: Manage users › — CR-15 §10.2: the people are edited in Settings › Users (was the Edit people… dialog) ---------- */
  function editPeople() { location.hash = '#settings/users'; }

  /* CR-14.1 D149 — a plan with changes not saved: ask before acting as another person — Save as <the one acting now> · Discard · Cancel
     (else what Ploy typed would be saved in the name of Beam) */
  function askUnsaved(from, to) {
    const W = C.s14;
    return new Promise(res => {
      U.openDialog(`<div class="dlg-h">${esc(W.switchQ(from))}</div><div class="dlg-b"><p>${esc(W.switchBody(from, to))}</p></div>` +
        `<div class="dlg-f"><button type="button" class="btn" data-r="cancel">${esc(C.common.cancel)}</button><button type="button" class="btn" data-r="discard">${esc(W.switchDiscard)}</button><button type="button" class="btn primary" data-r="save">${esc(W.switchSave(from))}</button></div>`);
      const d = $('dlg'); let done = false; const end = v => { if (done) return; done = true; U.closeDialog(); res(v); };
      d.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => end(b.dataset.r)));
      d.addEventListener('close', () => end('cancel'), { once: true });
    });
  }
  async function switchTo(id) {
    const next = active().find(p => p.id === id) || { name: id };
    if (CP.cpage && CP.cpage.isDirty && CP.cpage.isDirty()) {
      const how = await askUnsaved(get().name, next.name); if (how === 'cancel') return;
      if (how === 'save' && !(await CP.steps.saveDraft())) return;
      if (how === 'discard') CP.steps.reset();
    }
    set(id); U.toast(`${A.actingAs} ${get().name}`);
  }
  /* D52 — Reset demo data: what was clicked in this browser goes, the made-up data (the anchor of CR-04) comes back */
  async function resetDemo() {
    const R0 = C.demo;
    if (await U.confirmDialog(R0.resetQ, R0.resetBody, R0.reset, true, C.common.cancel)) { if (CP.cpage && CP.cpage.reset) CP.cpage.reset(); CP.store.resetMock(); U.toast(R0.resetDone); if (CP.app) CP.app.refresh(); }
  }
  document.addEventListener('cp:plans', draw);
  return { get, set, can, draw, people: active, editPeople, resetDemo, titleOf };
})();
