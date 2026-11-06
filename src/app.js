/* app.js — the page shell of KOL Management v0.1.19 (CR-01 §2.3): side menu (logo · Search menu… · groups · version + DEV · fold to icons ·
   a drawer under 768px) · top bar (Search or jump to… Ctrl+K · DEV · Acting as · theme) · Ctrl+K palette (the Dashboard tabs + Campaigns) ·
   routing (#dashboard/overview · the old #dashboard/all and #dashboard/waterfall go to their new tabs).
   CR-05: Acting as (CP.actor, top bar) · Expenses in the menu · the Campaigns badge (what waits for the one acting) · leaving a grid with changes asks ·
   Ctrl+K: Expenses · New expense · Approvals · Request budget (on a Campaign page).
   CR-06: Mock only (no Data switch) · Ctrl+K + Timeline · Operations · Product Master · PRODUCTS (code / name → its drawer) · New product (Admin / Manager).
   CR-07 (D61): WORK Dashboard · Campaign Monitor · Campaign Planning — MASTER DATA Product Master · the old routes go to the new ones (#campaigns… → #planning… ·
   #expenses → #dashboard · #dashboard/sales|spend|operations|campaign/<id> in screen-dashboard.js) · the Planning badge = approvals waiting + my open steps ·
   Ctrl+K: the 3 Dashboard tabs · Campaign Monitor (+ a Campaign → its Monitor) · Campaign Planning (+ My tasks · Approvals · Timeline) · Product Master · New campaign.
   ?today=yyyy-mm-dd stands in for today (checks and screenshots). */
(function () {
  'use strict';
  const { C, R, $, esc, pref, ICON } = CP.ui;
  const A = C.app, shell = $('shell');
  try { const t = new URLSearchParams(location.search).get('today'); if (R.isISODate(t)) CP.TODAY = t; } catch (e) { /* no override */ }

  /* ===================== the frame's fixed parts ===================== */
  $('brand').innerHTML = `<span class="sn-logo">${ICON.logo}</span><span class="sn-bt"><span class="sn-bn"><b>${esc(A.brandBold)}</b> ${esc(A.brandRest)}</span><span class="sn-bs">${esc(A.org)}</span></span>`;
  $('navCollapse').innerHTML = ICON.collapse;
  $('navSearchIcon').outerHTML = ICON.search;
  $('navSearch').placeholder = A.searchMenu; $('navSearch').setAttribute('aria-label', A.searchMenu);
  $('navBottom').innerHTML = `<span class="sn-ver">${esc(A.version)}</span><span class="devb" title="${esc(A.devTip)}">${esc(A.dev)}</span>`;
  $('navOpen').innerHTML = ICON.menu; $('navOpen').setAttribute('aria-label', A.openMenu); $('navOpen').title = A.openMenu;
  $('jumpBtn').innerHTML = `${ICON.search}<span class="tx">${esc(A.jump)}</span><kbd>${esc(A.ctrlK)}</kbd>`; $('jumpBtn').setAttribute('aria-label', `${A.jump} (${A.ctrlK})`);
  $('topDev').textContent = A.dev; $('topDev').title = A.devTip;
  $('sidenav').setAttribute('aria-label', A.mainMenu);

  /* ===================== theme ===================== */
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.dataset.theme = 'dark'; else document.documentElement.dataset.theme = 'light';
    const label = t === 'dark' ? A.lightMode : A.darkMode;
    $('themeBtn').innerHTML = t === 'dark' ? ICON.moon : ICON.sun;
    $('themeBtn').title = label; $('themeBtn').setAttribute('aria-label', label);
  }
  $('themeBtn').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(t); pref.set('theme', t);
    if (current) showPage(current);   // the charts read their colours from the theme
  });

  /* ===================== side menu: open / folded (remembered) · a drawer under 768px ===================== */
  const mobileMQ = matchMedia('(max-width:767px)');
  function navTips() {
    const folded = shell.classList.contains('collapsed') && !mobileMQ.matches;
    shell.querySelectorAll('.sidenav .sn-item').forEach(b => { if (folded) b.title = b.querySelector('.lb').textContent; else b.removeAttribute('title'); });
    const t = folded ? A.expandMenu : A.collapseMenu;
    $('navCollapse').title = t; $('navCollapse').setAttribute('aria-label', t); $('navCollapse').setAttribute('aria-expanded', String(!folded));
  }
  function setCollapsed(on) { shell.classList.toggle('collapsed', on); pref.set('navcollapsed', on ? '1' : '0'); navTips(); document.dispatchEvent(new Event('cp:contentresize')); }
  $('navCollapse').addEventListener('click', () => setCollapsed(!shell.classList.contains('collapsed')));
  function openNav() { shell.classList.add('navopen'); $('navOverlay').classList.remove('hidden'); const a = shell.querySelector('.sn-item.active'); if (a) a.focus(); }
  function closeNav() { shell.classList.remove('navopen'); $('navOverlay').classList.add('hidden'); }
  $('navOpen').addEventListener('click', openNav);
  $('navOverlay').addEventListener('click', closeNav);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shell.classList.contains('navopen')) closeNav(); });
  mobileMQ.addEventListener('change', () => { closeNav(); navTips(); });

  /* ===================== pages · menu · hash ===================== */
  const PAGES = C.nav.flatMap(g => g.items.map(it => Object.assign({ group: g.group }, it)));
  let current = null;
  function renderNav() {
    const q = R.foldText($('navSearch').value);
    const groups = C.nav.map(g => ({ g, items: g.items.filter(it => !q || R.foldText(it.label).includes(q) || R.foldText(g.group).includes(q)) })).filter(x => x.items.length);
    $('nav').innerHTML = groups.map(x => `<div class="sn-group"><div class="sn-gl">${esc(x.g.group)}</div>` + x.items.map(it =>
      `<a class="sn-item${it.key === current ? ' active' : ''}" href="#${esc(it.route)}" data-page="${esc(it.key)}"${it.key === current ? ' aria-current="page"' : ''}><span class="ic">${ICON.nav[it.icon] || ''}</span><span class="lb">${esc(it.label)}</span>${badge(it.key)}</a>`).join('') + '</div>').join('') ||
      `<div class="sn-none">${esc(A.noMenuMatch)}</div>`;
    navTips();
  }
  /* CR-05 · CR-07 — Campaign Planning: what waits for the one acting (an Executive: plans / requests to decide · the rest: returned to them) + their open steps */
  function badge(key) {
    if (key !== 'planning' || !CP.actor) return '';
    let n = 0, m = 0; try { n = R.waitingFor(R.approvalItems(CP.ui.seed(), R.todayISO()), CP.actor.get()).length; m = CP.screens.planning.taskRows().filter(x => x.s.open).length; } catch (e) { n = 0; m = 0; }
    const mgr = R.isMgr(CP.actor.get()), tip = [n ? (mgr ? C.appr.badgeTip(n) : C.appr.badgeTipStaff(n)) : '', m ? C.plng.badgeTasks(m) : ''].filter(Boolean).join(' · ');
    return n + m ? `<span class="nbadge" title="${esc(tip)}">${n + m}</span>` : '';
  }
  $('navSearch').addEventListener('input', renderNav);
  $('navSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('nav').querySelector('.sn-item'); if (a) { e.preventDefault(); a.click(); } } if (e.key === 'Escape' && $('navSearch').value) { e.stopPropagation(); $('navSearch').value = ''; renderNav(); } });
  $('nav').addEventListener('click', e => { if (e.target.closest('.sn-item')) closeNav(); });
  /* CR-07 §11 — the old routes: #campaigns[/table|timeline|approvals|<id>/<page>] → #planning/… · #expenses → #dashboard (the Dashboard maps its own old tabs) */
  function redirect() {
    const [seg, ...rest] = location.hash.slice(1).split('/');
    if (seg === 'campaigns') { if (rest[0] === 'table') rest[0] = 'plans'; if (rest[1] === 'expenses' || rest[1] === 'requests') { history.replaceState(null, '', `#monitor/${rest[0]}/budget`); return; }
      /* the old tabs of a Campaign page: Summary · History of an approved one → its Monitor · of a plan → its review · Sales target / Budget → the plan's steps */
      if (rest[1] === 'summary' || rest[1] === 'history') { let live = false; try { live = (CP.ui.seed().campaigns || []).some(c => c.id === rest[0]); } catch (e) { live = false; }
        history.replaceState(null, '', live ? `#monitor/${rest[0]}/${rest[1]}` : `#planning/${rest[0]}/review`); return; }
      history.replaceState(null, '', '#planning' + (rest.length ? '/' + rest.join('/') : '')); }
    else if (seg === 'expenses') history.replaceState(null, '', '#dashboard');
  }
  function parseHash() { redirect(); const [seg, ...rest] = location.hash.slice(1).split('/'); const p = PAGES.find(x => x.key === seg); return { page: p ? p.key : null, sub: rest.join('/') || null }; }
  function showPage(key, sub) {
    if (!CP.screens[key]) key = PAGES[0].key;
    current = key;
    renderNav();
    document.title = `${(PAGES.find(p => p.key === key) || {}).label || ''} · ${A.title}`;
    document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'tab-' + key));
    CP.screens[key].render(sub || null);
  }
  /* CR-05 — the grid of a Campaign page with changes not saved: "Leave without saving?" (the hash goes back while it asks) */
  let lastHash = location.hash, asking = false;
  window.addEventListener('hashchange', async () => {
    if (asking) return;
    const to = location.hash, from = lastHash, samePage = s => String(s).split('/').slice(0, 2).join('/');
    if (CP.cpage && CP.cpage.isDirty() && samePage(to) !== samePage(from)) {
      asking = true; history.replaceState(null, '', from); const ok = await CP.cpage.confirmLeave(); asking = false;
      if (!ok) return; history.replaceState(null, '', to);
    }
    if (CP.ui.drawerOwner() && !(await CP.ui.requestCloseDrawer())) { history.replaceState(null, '', from); return; }
    lastHash = location.hash; const h = parseHash(); showPage(h.page, h.sub);
  });
  /* CR-03 — after a Save the page in view is drawn again from the new list */
  CP.app = { refresh: () => { if (current) { lastHash = location.hash; showPage(current, parseHash().sub); } } };
  /* CR-05 — another person to act as · a plan / expense changed (this tab or another one): draw again (once) */
  let again = 0; const later = () => { clearTimeout(again); again = setTimeout(() => CP.app.refresh(), 30); };
  document.addEventListener('cp:actor', later);
  document.addEventListener('cp:plans', later);

  /* ===================== Ctrl+K — Search or jump to… (pages + Campaigns; a Campaign opens its P&L drawer) ===================== */
  const K = C.cmdk, dlg = $('cmdk');
  let ck = { q: '', i: 0, items: [] };
  const mark = (label, q) => { const i = q ? R.foldText(label).indexOf(q) : -1; return i < 0 ? esc(label) : `${esc(label.slice(0, i))}<mark>${esc(label.slice(i, i + q.length))}</mark>${esc(label.slice(i + q.length))}`; };
  function ckItems() {
    const q = R.foldText(ck.q), seed = CP.ui.seed(), td = R.todayISO(), a = CP.actor.get();
    const pid = current === 'planning' && CP.cpage && CP.cpage.current() && /^#planning\/[^/]+/.test(location.hash) && !/^#planning\/(new|plans|tasks|approvals|timeline)$/.test(location.hash) ? CP.cpage.current()
      : current === 'monitor' && CP.screens.monitor.current() ? CP.screens.monitor.current() : null;
    const pc = pid ? (seed.allCampaigns || []).find(c => c.id === pid) : null, onPage = pc ? { c: pc, plan: (seed.plans || {})[pid] || null } : null;
    /* CR-07 §11 — Overview · P&L · Sales & Budget · Campaign Monitor · Campaign Planning · My tasks · Approvals · Timeline · Product Master · New campaign · New product */
    const pages = K.pages.map(p => ({ kind: 'tab', key: p.key, label: p.label, right: p.right, icon: ICON.nav[p.icon] }))
      .concat(PAGES.filter(p => p.key !== 'dashboard').map(p => ({ kind: 'page', key: p.key, label: p.label, right: p.group, icon: ICON.nav[p.icon] })))
      .concat(K.routes.map(p => ({ kind: 'route', key: p.key, hash: p.hash, label: p.label, right: p.right, icon: ICON.nav[p.icon] })))
      .concat(K.actions.filter(p => (p.key === 'new' ? R.canDo('create', a).ok : p.key === 'newProduct' ? R.canDo('product', a).ok : false))
        .map(p => ({ kind: 'action', key: p.key, label: p.label, right: p.right, icon: ICON.nav[p.icon] })))
      .concat(onPage && R.canDo('request', a, onPage.plan, { live: true }).ok ? [{ kind: 'action', key: 'request', label: K.requestAction.label, right: onPage.c.name, icon: ICON.nav.plus }] : [])
      .filter(p => !q || R.foldText(p.label).includes(q));
    const camps = (seed.allCampaigns || seed.campaigns || []).filter(c => !q || R.foldText(c.name).includes(q)).map(c => ({ kind: 'campaign', key: c.id, label: c.name, live: c.approval === 'approved',
      right: c.approval !== 'approved' ? C.appr.state[c.approval] || '' : R.statusOf(c, td) === R.CANCELLED ? K.cancelledTag : C.status[R.statusOf(c, td)], icon: ICON.nav.campaign }));
    /* CR-06 §8 — PRODUCTS: by code or name (only when something is typed) → its drawer */
    const prods = q ? (CP.store.data().products || []).filter(p => [p.code, p.name, p.nickname].some(x => R.foldText(x).includes(q))).slice(0, 8)
      .map(p => ({ kind: 'product', key: p.code, label: `${p.code} · ${p.nickname}`, right: C.prod.state[p.status] || p.status, icon: ICON.nav.products })) : [];
    return { pages, camps, prods };
  }
  function ckDraw() {
    const { pages, camps, prods } = ckItems(), q = R.foldText(ck.q);
    ck.items = pages.concat(camps, prods); ck.i = Math.max(0, Math.min(ck.i, ck.items.length - 1));
    let n = -1;
    const row = x => { n++; return `<div class="ck-o${n === ck.i ? ' on' : ''}" role="option" id="ck_${n}" data-ck="${n}" aria-selected="${n === ck.i}"><span class="ic">${x.icon || ''}</span><span class="lb">${mark(x.label, q)}</span><span class="rt">${esc(x.right)}</span></div>`; };
    $('ck_list').innerHTML = (pages.length ? `<div class="ck-g">${esc(K.goTo)}</div>${pages.map(row).join('')}` : '') + (camps.length ? `<div class="ck-g">${esc(K.campaigns)}</div>${camps.map(row).join('')}` : '') + (prods.length ? `<div class="ck-g">${esc(K.products)}</div>${prods.map(row).join('')}` : '') +
      (ck.items.length ? '' : `<div class="ck-none">${esc(K.none)}</div>`);
    $('ck_q').setAttribute('aria-activedescendant', ck.items.length ? 'ck_' + ck.i : '');
    const on = $('ck_list').querySelector('.ck-o.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function openJump() {
    if (dlg.open) { $('ck_q').select(); return; }
    ck = { q: '', i: 0, items: [] };
    dlg.innerHTML = `<div class="ck-in">${ICON.search}<input id="ck_q" type="text" role="combobox" aria-expanded="true" aria-controls="ck_list" aria-autocomplete="list" placeholder="${esc(K.placeholder)}" autocomplete="off" spellcheck="false"><kbd>${esc(K.esc)}</kbd></div>` +
      `<div class="ck-list" id="ck_list" role="listbox"></div><div class="ck-f"><span>${esc(K.footL)}</span><span>${esc(K.footR)}</span></div>`;
    ckDraw(); dlg.showModal(); $('ck_q').focus();
  }
  function choose(i) {
    const x = ck.items[i]; if (!x) return;
    dlg.close(); closeNav();
    if (x.kind === 'page') { const p = PAGES.find(y => y.key === x.key); if (location.hash !== '#' + p.route) location.hash = p.route; else showPage(p.key); return; }
    /* a tab · a Campaign → its Campaign Monitor (CR-07) */
    if (x.kind === 'tab') { CP.screens.dashboard.go(x.key); return; }
    if (x.kind === 'route') { location.hash = x.hash; return; }
    if (x.kind === 'product') { if (location.hash !== '#products') location.hash = 'products'; setTimeout(() => CP.products.openForm(x.key), 0); return; }
    /* CR-03 — New campaign: Campaign Planning and its drawer */
    if (x.kind === 'action') {
      if (x.key === 'newProduct') { if (location.hash !== '#products') location.hash = 'products'; setTimeout(() => CP.products.openForm(null), 0); return; }
      if (x.key === 'request') { CP.reqdraw.open(current === 'monitor' ? CP.screens.monitor.current() : CP.cpage.current()); return; }
      if (location.hash === '#planning/new') CP.screens.planning.openNew(); else location.hash = 'planning/new'; return;
    }
    /* CR-05 — a plan not approved yet opens its plan (not on the Dashboard, D50) · an approved one its Campaign Monitor */
    if (!x.live) { location.hash = `planning/${x.key}`; return; }
    location.hash = `monitor/${x.key}`;
  }
  dlg.addEventListener('input', e => { if (e.target.id !== 'ck_q') return; ck.q = e.target.value; ck.i = 0; ckDraw(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ck.i = (ck.i + (e.key === 'ArrowDown' ? 1 : -1) + ck.items.length) % Math.max(1, ck.items.length); ckDraw(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(ck.i); }
  });
  dlg.addEventListener('click', e => { const o = e.target.closest('[data-ck]'); if (o) { choose(+o.dataset.ck); return; } if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('mousemove', e => { const o = e.target.closest('[data-ck]'); if (o && +o.dataset.ck !== ck.i) { ck.i = +o.dataset.ck; dlg.querySelectorAll('.ck-o').forEach(x => x.classList.toggle('on', +x.dataset.ck === ck.i)); } });
  $('jumpBtn').addEventListener('click', openJump);
  /* Ctrl+K (⌘K) from anywhere — also over the drawer and inside a field */
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openJump(); } }, true);

  /* ===================== start ===================== */
  shell.classList.toggle('collapsed', pref.get('navcollapsed', '0') === '1');
  applyTheme(pref.get('theme', 'light'));
  CP.actor.draw();
  const h = parseHash();
  if (!h.page) history.replaceState(null, '', '#' + PAGES[0].route);
  const h2 = parseHash();
  showPage(h2.page, h2.sub);
  lastHash = location.hash;
})();
