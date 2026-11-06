/* screen-products.js — MASTER DATA › Product Master (CR-06 §7 · D58), the look of KOL Master. #products → CP.screens.products · CP.products
   Toolbar: Search (Code · Barcode · name · Nickname) · Category · Group · Sort ··· Export · + New product (Admin / Manager) · status tabs All (= not Discontinued) ·
   NPD · Active · Clearance · Discontinued · the table Code · Product (name + Nickname) · Barcode · Group · Category · Status · COGS / pc · Net price MT · TT · ECOM ·
   Campaigns (how many · their names in the tooltip) · ⋯ (Edit · View campaigns · Discontinue / Reactivate · Delete — Admin, never used).
   The drawer (New / Edit · read only for Staff · Viewer · Accounting): the checks of R.productChecks · the code fixed once a plan uses it · Used in campaigns · History
   (who · when · field · old → new). Discontinue = not offered to a new plan · the plans that have it keep it · Dashboard numbers never change with the master. */
CP.screens = CP.screens || {};
CP.products = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON, pref, labelInfo, none } = U, M = C.prod;
  const me = () => CP.actor.get();
  const canEdit = () => R.canDo('product', me()).ok;
  const all = () => CP.store.data().products || [];
  const plans = () => CP.store.data().plans || {};
  const camps = () => { const s = U.seed(); return new Map((s.allCampaigns || s.campaigns || []).map(c => [c.id, c])); };
  const useOf = code => { const cs = camps(); return R.productUse(code, plans()).map(u => Object.assign({ c: cs.get(u.id) || { id: u.id, name: u.id } }, u)); };
  const saved = pref.json('prods', {}) || {};
  const st = Object.assign({ tab: 'all', cat: 'all', group: 'all', sort: 'code' }, saved, { q: '' });
  const SORTS = ['code', 'name', 'category', 'status', 'updated'], TABS = ['all', 'npd', 'active', 'clearance', 'discontinued'], ST_RANK = { npd: 0, active: 1, clearance: 2, discontinued: 3 };
  if (!SORTS.includes(st.sort)) st.sort = 'code';
  if (!TABS.includes(st.tab)) st.tab = 'all';
  const keep = () => pref.setJson('prods', { tab: st.tab, cat: st.cat, group: st.group, sort: st.sort });
  const money = v => (v === '' || v == null || !R.isNum(+v) ? null : +v);
  const fmt2 = v => (money(v) == null ? '' : R.fmtNum(+v, 2));
  const stChip = s => `<span class="st p${esc(s)}">${esc(M.state[s] || s)}</span>`;

  /* ===================== the page ===================== */
  let sec = null;
  function render() {
    sec = $('tab-products');
    if (!sec.dataset.built) {
      sec.innerHTML = `<div class="pbanner"><h1>${esc(M.title)} <span class="pbsub" id="p_sum"></span></h1></div><div class="toolbar ctools" id="p_tools"></div>` +
        `<div class="sttabs ktabs" role="tablist" id="p_tabs"></div><div class="card ktable" id="p_table"></div>`;
      sec.addEventListener('click', onClick); sec.addEventListener('change', onChange);
      sec.addEventListener('input', e => { if (e.target.matches('[data-pq]')) { st.q = e.target.value; st.page = 1; drawTabs(); drawTable(); } });
      sec.addEventListener('keydown', e => { const tr = e.target.closest('tr[data-pcode]'); if (tr && e.target === tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openForm(tr.dataset.pcode); } });
      sec.dataset.built = '1';
    }
    drawTools(); drawTabs(); drawTable();
  }
  const fold = t => R.foldText(String(t == null ? '' : t));
  function filtered(noTab) {
    const q = fold(st.q);
    return all().filter(p => (st.cat === 'all' || p.category === st.cat) && (st.group === 'all' || p.group === st.group)
      && (!q || [p.code, p.barcode, p.name, p.nickname].some(x => fold(x).includes(q)))
      && (noTab || (st.tab === 'all' ? p.status !== 'discontinued' : p.status === st.tab)));
  }
  function sorted(rows) {
    const nm = (a, b) => a.name.localeCompare(b.name, 'en'), cd = (a, b) => a.code.localeCompare(b.code, 'en');
    const f = { code: cd, name: (a, b) => nm(a, b) || cd(a, b), category: (a, b) => a.category.localeCompare(b.category, 'en') || cd(a, b), status: (a, b) => ST_RANK[a.status] - ST_RANK[b.status] || cd(a, b),
      updated: (a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || cd(a, b) }[st.sort];
    return rows.slice().sort(f);
  }
  function drawTools() {
    const ps = all(), cats = [...new Set(ps.map(p => p.category))].sort(), groups = [...new Set(ps.map(p => p.group))].sort();
    const n = ps.length, live = ps.filter(p => p.status !== 'discontinued').length;
    $('p_sum').textContent = M.summary(n, live, groups.length);
    const sel = (attr, label, list, cur, allW) => `<label class="ms"><select class="ms-trigger sel" ${attr} aria-label="${esc(label)}"><option value="all">${esc(allW)}</option>${list.map(x => `<option value="${esc(x)}"${cur === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
    $('p_tools').innerHTML = `<label class="ksearch">${ICON.search}<input type="search" data-pq value="${esc(st.q)}" placeholder="${esc(M.search)}" aria-label="${esc(M.search)}" autocomplete="off"></label>` +
      sel('data-pcat', M.category, cats, st.cat, M.allCats) + sel('data-pgroup', M.group, groups, st.group, M.allGroups) + `<span class="spacer"></span>` +
      `<label class="ms"><select class="ms-trigger sel" data-psort aria-label="${esc(C.dash.p.sortL)}">${SORTS.map(k => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${esc(C.camps.sortBtn(M.sorts[k]))}</option>`).join('')}</select></label>` +
      `<button type="button" class="btn" data-pexport>${ICON.download}<span>${esc(M.exportBtn)}</span></button>` +
      (canEdit() ? `<button type="button" class="btn primary" data-pnew>${ICON.plus}<span>${esc(M.newBtn)}</span></button>` : '');
  }
  function drawTabs() {
    const rows = filtered(true), n = k => (k === 'all' ? rows.filter(p => p.status !== 'discontinued').length : rows.filter(p => p.status === k).length);
    $('p_tabs').innerHTML = TABS.map(k => `<button type="button" role="tab" data-ptab="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}"${k === 'all' ? ` title="${esc(M.allTip)}"` : ''}>${esc(k === 'all' ? M.all : M.state[k])} <span class="n">${n(k)}</span></button>`).join('');
  }
  function drawTable() {
    const box = $('p_table'), every = sorted(filtered()), H = M.cols;
    if (!every.length) { box.innerHTML = `<div class="c3-empty">${esc(all().length ? M.noMatch : M.empty)}</div>`; return; }
    /* CR-07 R7 — 50 rows a page */
    st.page = U.pageOf(every.length, st.page); const rows = every.slice((st.page - 1) * U.PAGE, st.page * U.PAGE);
    const th = (l, o = {}) => `<th class="${o.num ? 'num' : ''}">${o.tip ? labelInfo(l, o.tip, l, true) : esc(l)}</th>`, cs = camps(), P = plans();
    const body = rows.map(p => {
      const use = R.productUse(p.code, P), names = use.map(u => (cs.get(u.id) || { name: u.id }).name);
      const pr = R.CHANNELS.map(k => `<td class="num">${money(p.price && p.price[k]) == null ? none() : `<span class="${money(p.price[k]) < +p.cogs ? 'warnx' : ''}">${esc(fmt2(p.price[k]))}</span>`}</td>`).join('');
      return `<tr class="click${p.status === 'discontinued' ? ' pdisc' : ''}" tabindex="0" data-pcode="${esc(p.code)}"><td><b>${esc(p.code)}</b></td><td class="pnm"><b>${esc(p.name)}</b><div class="muted small">${esc(p.nickname)}</div></td>` +
        `<td class="small nowrap">${p.barcode ? esc(p.barcode) : none()}</td><td>${esc(p.group)}</td><td>${esc(p.category)}</td><td>${stChip(p.status)}${p.status === 'npd' && p.launch ? `<div class="muted small">${esc(M.launchOn(R.dmy(p.launch)))}</div>` : ''}</td>` +
        `<td class="num">${esc(fmt2(p.cogs))}</td>${pr}<td class="num">${use.length ? `<span class="tiph" title="${esc(names.join('\n'))}">${use.length}</span>` : none()}</td>` +
        `<td class="kmore"><button type="button" class="icon-btn" data-pmore="${esc(p.code)}" aria-haspopup="menu" aria-label="${esc(`${C.camps.menu.more} · ${p.name}`)}" title="${esc(C.camps.menu.more)}">${ICON.more}</button></td></tr>`;
    }).join('');
    box.innerHTML = `<div class="tablewrap"><table class="tbl port ptbl"><thead><tr>${th(H.code)}${th(H.product)}${th(H.barcode)}${th(H.group)}${th(H.category)}${th(H.status)}` +
      `${th(H.cogs, { num: true, tip: M.tips.cogs })}${R.CHANNELS.map(k => th(H.price(k), { num: true, tip: M.tips.price })).join('')}${th(H.campaigns, { num: true, tip: M.tips.campaigns })}<th></th></tr></thead><tbody>${body}</tbody></table></div>` + U.pagerHTML(every.length, st.page, 'data-ppage');
  }

  /* ---------- the ⋯ menu ---------- */
  function closeMenu() { const m = $('p_menu'); if (m) m.remove(); }
  function openMenu(btn, code) {
    closeMenu();
    const p = all().find(x => x.code === code); if (!p) return;
    const ed = canEdit(), used = useOf(code).length > 0, del = R.canDo('product.delete', me(), null, { used }).ok, m = document.createElement('div');
    m.id = 'p_menu'; m.className = 'menu-pop'; m.setAttribute('role', 'menu'); m.dataset.code = code;
    m.innerHTML = `<button type="button" role="menuitem" data-pact="edit">${esc(ed ? M.menu.edit : M.menu.view)}</button><button type="button" role="menuitem" data-pact="camps">${esc(M.menu.campaigns)}</button>` +
      (ed ? (p.status === 'discontinued' ? `<button type="button" role="menuitem" data-pact="reactivate">${esc(M.menu.reactivate)}</button>` : `<button type="button" role="menuitem" class="danger" data-pact="discontinue">${esc(M.menu.discontinue)}</button>`) : '') +
      (del ? `<button type="button" role="menuitem" class="danger" data-pact="delete">${esc(M.menu.del)}</button>` : '');
    document.body.appendChild(m);
    const r = btn.getBoundingClientRect();
    m.style.top = Math.min(innerHeight - m.offsetHeight - 8, r.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    m.querySelector('button').focus();
    m.addEventListener('click', e => { const b = e.target.closest('[data-pact]'); if (!b) return; closeMenu(); act(b.dataset.pact, code); });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); btn.focus(); } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const b = [...m.querySelectorAll('button')], i = b.indexOf(document.activeElement); b[(i + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length].focus(); } });
  }
  document.addEventListener('click', e => { if ($('p_menu') && !e.target.closest('#p_menu') && !e.target.closest('[data-pmore]')) closeMenu(); }, true);
  function act(what, code) {
    if (what === 'edit') openForm(code);
    if (what === 'camps') openForm(code, { focus: 'use' });
    if (what === 'discontinue' || what === 'reactivate') setStatus(code, what === 'discontinue' ? 'discontinued' : 'active');
    if (what === 'delete') askDelete(code);
  }

  /* ===================== the save of a product (CP.store · history) ===================== */
  const FIELDS = ['code', 'barcode', 'name', 'nickname', 'group', 'category', 'status', 'launch', 'cogs', 'price.MT', 'price.TT', 'price.ECOM', 'note'];
  const getF = (p, f) => (f.startsWith('price.') ? (p.price || {})[f.slice(6)] : p[f]);
  const show = (f, v) => (v === '' || v == null ? '—' : f === 'cogs' || f.startsWith('price.') ? `฿${fmt2(v)}` : f === 'status' ? M.state[v] || v : f === 'launch' ? R.dmy(v) : String(v));
  function changes(a, b) { return FIELDS.filter(f => String(getF(a, f) ?? '') !== String(getF(b, f) ?? '')).map(f => ({ field: f, old: show(f, getF(a, f)), new: show(f, getF(b, f)) })); }
  /* → { p } when saved (p = null: deleted) · null when it failed */
  async function saveOne(code, next, o) {
    const a = me(), at = R.nowLocal();
    try {
      return { p: await CP.store.saveProduct(code, prev => {
        if (!next) return null;
        const p = Object.assign({}, next, { updated_at: at, updated_by: a.name, history: ((prev && prev.history) || []).slice() });
        if (!prev) { p.created_at = at; p.history.push({ at, by: a.name, field: 'created', old: '', new: p.code }); }
        else changes(prev, p).forEach(c => p.history.push(Object.assign({ at, by: a.name }, c)));
        return p;
      }, o) };
    } catch (x) { U.toast(x.code === 'conflict' ? M.toast.conflict : x.code === 'exists' ? M.v.codeDup(code) : C.appr.toast.failed); if (x.code === 'conflict') refresh(); return null; }
  }
  const refresh = () => { if (CP.app) CP.app.refresh(); };
  async function setStatus(code, status) {
    const p = all().find(x => x.code === code); if (!p || !canEdit()) return;
    if (status === 'discontinued' && !(await U.confirmDialog(M.discQ(p.name), M.discBody(useOf(code).length), M.menu.discontinue, true, C.common.cancel))) return;
    const r = await saveOne(code, Object.assign({}, p, { status }), { rev: p.rev || 0 });
    if (r) { U.toast(status === 'discontinued' ? M.toast.disc(p.name) : M.toast.react(p.name)); refresh(); }
  }
  async function askDelete(code) {
    const p = all().find(x => x.code === code); if (!p) return;
    if (!R.canDo('product.delete', me(), null, { used: useOf(code).length > 0 }).ok) return;
    if (!(await U.confirmDialog(M.delQ(p.name), M.delBody, M.menu.del, true, C.common.cancel))) return;
    if (await saveOne(code, null, { rev: p.rev || 0 })) { U.toast(M.toast.deleted(p.name)); refresh(); }
  }

  /* ===================== the drawer (§7.2) ===================== */
  let F = null;
  function blank() { return { code: '', barcode: '', name: '', nickname: '', group: '', category: '', status: 'active', launch: '', cogs: '', price: { MT: '', TT: '', ECOM: '' }, note: '' }; }
  function openForm(code, o = {}) {
    const p = code ? all().find(x => x.code === code) : null; if (code && !p) return;
    const ed = canEdit(), use = p ? useOf(p.code) : [];
    F = { code, p, v: p ? JSON.parse(JSON.stringify(Object.assign(blank(), p, { price: Object.assign({ MT: '', TT: '', ECOM: '' }, p.price) }))) : blank(), ed, use, tried: false, touched: new Set(), dirty: false, onSaved: o.onSaved || null, rev: p ? p.rev || 0 : null };
    U.openDrawer({ kind: 'product', isDirty: () => F && F.dirty, onClose: () => { F = null; }, onKey }, formHTML());
    $('drawer_content').classList.add('form');
    wire(); update();
    if (o.focus === 'use') { const u = $('pf_use'); if (u) u.scrollIntoView({ block: 'start' }); }
    else { const f = $(ed ? (code && use.length ? 'pf_barcode' : 'pf_code') : 'pf_close'); if (f) f.focus(); }
  }
  function formHTML() {
    const D = M.d, v = F.v, p = F.p, ro = !F.ed, dis = ro ? ' disabled' : '', lock = !!p && F.use.length > 0;
    const opt = (list, cur) => list.map(x => `<option value="${esc(x)}">`).join('');
    const ps = all(), groups = [...new Set(ps.map(x => x.group))].sort(), cats = [...new Set(ps.map(x => x.category))].sort();
    const inp = (id, key, label, o = {}) => `<div class="field${o.cls ? ' ' + o.cls : ''}"><label for="${id}">${esc(label)}${o.req ? ' <span class="req">*</span>' : ''}</label><input id="${id}" class="inp${o.num ? ' num' : ''}" data-pf="${key}" value="${esc(o.val != null ? o.val : v[key] == null ? '' : v[key])}"${o.list ? ` list="${o.list}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.off || dis ? ' disabled' : ''} autocomplete="off">${o.help ? `<div class="help">${esc(o.help)}</div>` : ''}<div class="ferr" id="pe_${key.replace('.', '_')}"></div><div class="fwarn" id="pw_${key.replace('.', '_')}"></div></div>`;
    const use = F.use.length ? `<ul class="puse">${F.use.map(u => `<li><a class="link" href="#planning/${esc(u.id)}">${esc(u.c.name)}</a> ${U.apChip(u.approval)}</li>`).join('')}</ul>` : `<div class="muted small">${esc(D.notUsed)}</div>`;
    const hist = p && (p.history || []).length ? `<ul class="hist">${p.history.slice().reverse().map(h => `<li><span class="hw">${esc(h.field === 'created' ? D.created : `${D.field[h.field] || h.field}: ${h.old} → ${h.new}`)}</span><span class="muted"> · ${esc(h.by || '—')} · ${esc(R.dmy(String(h.at).slice(0, 10)))} ${esc(String(h.at).slice(11, 16))}</span></li>`).join('')}</ul>` : `<div class="muted small">${esc(D.noHistory)}</div>`;
    return `<div class="dr-head"><div class="dr-title"><h2 id="k_f_h">${esc(p ? (F.ed ? D.editTitle : D.viewTitle) : D.newTitle)}</h2>${p ? `<div class="dr-sub">${esc([p.code, M.state[p.status], p.updated_at ? D.updated(R.dmy(p.updated_at.slice(0, 10)), p.updated_by || '—') : ''].filter(Boolean).join(' · '))}</div>` : ''}</div>` +
      `<button type="button" class="icon-btn" id="pf_close" data-dr-close aria-label="${esc(C.common.close)}" title="${esc(C.common.close)} (Esc)">${ICON.close}</button></div>` +
      `<form class="dr-body kform" id="p_form" novalidate autocomplete="off">` + (ro ? `<div class="nsband"><span class="nsb-t">${esc(D.readOnly)}</span></div>` : '') +
      `<div class="frow">${inp('pf_code', 'code', D.code, { req: true, max: 30, off: lock, help: lock ? D.codeLocked(F.use.length) : D.codeHelp })}${inp('pf_barcode', 'barcode', D.barcode, { mode: 'numeric', max: 13, help: D.barcodeHelp })}</div>` +
      inp('pf_name', 'name', D.name, { req: true, max: 120 }) + inp('pf_nick', 'nickname', D.nickname, { req: true, max: 60 }) +
      `<div class="frow">${inp('pf_group', 'group', D.group, { req: true, list: 'pf_groups', help: D.pickOrType })}${inp('pf_cat', 'category', D.category, { req: true, list: 'pf_cats', help: D.pickOrType })}</div>` +
      `<datalist id="pf_groups">${opt(groups)}</datalist><datalist id="pf_cats">${opt(cats)}</datalist>` +
      `<div class="frow"><div class="field"><label for="pf_status">${esc(D.status)} <span class="req">*</span></label><select id="pf_status" class="inp" data-pf="status"${dis}>${R.PRODUCT_STATES.map(s => `<option value="${s}"${v.status === s ? ' selected' : ''}>${esc(M.state[s])}</option>`).join('')}</select><div class="ferr" id="pe_status"></div></div>` +
      `<div class="field${v.status === 'npd' ? '' : ' hidden'}" id="pf_launchw"><label for="pf_t_launch">${esc(D.launch)}</label>${U.dateHTML(`id="pf_launch" data-pf="launch"${dis}`, v.launch, { textId: 'pf_t_launch' })}<div class="ferr" id="pe_launch"></div></div></div>` +
      `<div class="frow f4">${inp('pf_cogs', 'cogs', D.cogs, { req: true, num: true, mode: 'decimal', help: D.exVat })}${R.CHANNELS.map(k => inp('pf_p' + k, 'price.' + k, D.price(k), { num: true, mode: 'decimal', val: v.price[k] == null ? '' : v.price[k] })).join('')}</div>` +
      `<div class="help">${esc(D.priceHelp)}</div>` +
      `<div class="field"><label for="pf_note">${esc(D.note)}</label><textarea id="pf_note" class="inp" rows="2" maxlength="300" data-pf="note"${dis}>${esc(v.note || '')}</textarea></div>` +
      (p ? `<section class="psec" id="pf_use"><h4>${esc(D.used)} <span class="n">${F.use.length}</span></h4>${use}</section><section class="psec"><h4>${esc(D.history)}</h4>${hist}</section>` : '') +
      `</form><div class="dr-foot"><div class="ferr fmsg" id="pf_msg"></div>` +
      (F.ed && p ? `<button type="button" class="btn ghost" data-pfstatus="${p.status === 'discontinued' ? 'active' : 'discontinued'}">${esc(p.status === 'discontinued' ? M.menu.reactivate : M.menu.discontinue)}</button><span class="spacer"></span>` : '') +
      `<button type="button" class="btn" data-dr-close>${esc(F.ed ? D.cancel : C.common.close)}</button>` + (F.ed ? `<button type="button" class="btn primary" id="pf_save">${esc(D.save)}</button>` : '') + '</div>';
  }
  function read() {
    const dc = $('drawer_content'); if (!dc) return;
    dc.querySelectorAll('[data-pf]').forEach(e => { const k = e.dataset.pf; if (k.startsWith('price.')) F.v.price[k.slice(6)] = e.value.trim(); else F.v[k] = k === 'note' ? e.value : e.value.trim(); });
  }
  const checks = () => R.productChecks(F.v, all(), F.p ? F.p.code : null);
  function update() {
    if (!F) return;
    const r = checks(), keys = ['code', 'barcode', 'name', 'nickname', 'group', 'category', 'status', 'launch', 'cogs'].concat(R.CHANNELS.map(k => 'price_' + k));
    const shown = k => F.tried || F.touched.has(k);
    keys.forEach(k => { const e = $('pe_' + k), w = $('pw_' + k); if (e) e.textContent = r.errs[k] && shown(k) ? r.errs[k] : ''; if (w) w.textContent = r.warns[k] || ''; });
    const lw = $('pf_launchw'); if (lw) lw.classList.toggle('hidden', F.v.status !== 'npd');
    const s = $('pf_save'); if (s) s.disabled = !r.ok || !!F.saving;
  }
  function wire() {
    const dc = $('drawer_content');
    const touch = e => { const k = e.target.dataset && e.target.dataset.pf; if (k) F.touched.add(k.replace('.', '_')); };
    dc.oninput = e => { if (!F || !F.ed) return; F.dirty = true; touch(e); read(); update(); };
    dc.onchange = e => { if (!F || !F.ed) return; F.dirty = true; touch(e); read(); update(); };
    dc.onclick = async e => {
      if (e.target.closest('#pf_save')) { doSave(); return; }
      const s = e.target.closest('[data-pfstatus]'); if (s && F && F.p) { const code = F.p.code, to = s.dataset.pfstatus; F.dirty = false; U.closeDrawer(); await setStatus(code, to); }
    };
  }
  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey && !e.target.matches('textarea, button, select') && e.target.closest('#p_form') && F && F.ed) { e.preventDefault(); doSave(); } }
  async function doSave() {
    if (!F || F.saving || !F.ed) return;
    read(); F.tried = true; update();
    const r = checks(); if (!r.ok) { const k = Object.keys(r.errs)[0], el = document.querySelector(`[data-pf="${k.replace('_', '.')}"]`); if (el) el.focus(); return; }
    const v = F.v, n = x => (x === '' || x == null ? '' : +String(x).replace(/,/g, ''));
    const next = { code: v.code.trim(), barcode: v.barcode.trim(), name: v.name.trim(), nickname: v.nickname.trim(), group: v.group.trim(), category: v.category.trim(), status: v.status,
      launch: v.launch || '', cogs: n(v.cogs), price: Object.fromEntries(R.CHANNELS.map(k => [k, n(v.price[k])])), note: (v.note || '').trim() };
    F.saving = true; update();
    const code = F.p ? F.p.code : next.code, isNew = !F.p, out = await saveOne(code, F.p ? Object.assign({}, F.p, next) : next, F.p ? { rev: F.rev } : { create: true });
    if (!F) return;
    F.saving = false;
    if (!out || !out.p) { update(); return; }
    const res = out.p, cb = F.onSaved; F.dirty = false; U.closeDrawer(); U.toast(isNew ? M.toast.added(res.name) : M.toast.saved(res.name)); refresh();
    if (cb) setTimeout(() => cb(res), 0);
  }

  /* ---------- events of the page ---------- */
  function exportNow() {
    const H = M.cols, cs = camps(), P = plans(), rows = sorted(filtered());
    U.saveXlsx(M.file, st.tab === 'all' ? M.all : M.state[st.tab], [{ key: 'products', title: M.title,
      header: [H.code, H.barcode, M.d.name, M.d.nickname, H.group, H.category, H.status, M.d.launch, H.cogs].concat(R.CHANNELS.map(k => H.price(k)), [H.campaigns, M.x.names, M.x.updated, M.d.note]),
      cols: rows.length ? ['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'money', 'money', 'money', 'money', 'num', 'text', 'text', 'text'] : [],
      rows: rows.map(p => { const use = R.productUse(p.code, P);
        return [{ v: p.code, bold: true }, p.barcode || '', p.name, p.nickname, p.group, p.category, M.state[p.status], p.launch ? R.dmy(p.launch) : '', money(p.cogs)].concat(R.CHANNELS.map(k => money(p.price && p.price[k])),
          [use.length, use.map(u => (cs.get(u.id) || { name: u.id }).name).join(', '), p.updated_at ? R.dmy(p.updated_at.slice(0, 10)) : '', p.note || '']); }) }], [[C.camps.meta.at, R.dmy(U.today())]]);
  }
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-pnew]')) { if (canEdit()) openForm(null); return; }
    if (t.closest('[data-pexport]')) { exportNow(); return; }
    const pg = t.closest('[data-ppage]'); if (pg) { st.page = (st.page || 1) + +pg.dataset.ppage; drawTable(); return; }
    const tb = t.closest('[data-ptab]'); if (tb) { st.tab = tb.dataset.ptab; st.page = 1; keep(); drawTabs(); drawTable(); return; }
    const mb = t.closest('[data-pmore]'); if (mb) { e.stopPropagation(); if ($('p_menu') && $('p_menu').dataset.code === mb.dataset.pmore) closeMenu(); else openMenu(mb, mb.dataset.pmore); return; }
    const tr = t.closest('tr[data-pcode]'); if (tr && !t.closest('button, a, input, select')) openForm(tr.dataset.pcode);
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-pcat]')) { st.cat = t.value; st.page = 1; keep(); drawTabs(); drawTable(); }
    if (t.matches('[data-pgroup]')) { st.group = t.value; st.page = 1; keep(); drawTabs(); drawTable(); }
    if (t.matches('[data-psort]')) { st.sort = t.value; st.page = 1; keep(); drawTable(); }
  }
  /* #products/<code> opens its drawer (Ctrl+K) */
  CP.screens.products = { render: sub => { render(); if (sub) { const code = decodeURIComponent(sub); history.replaceState(null, '', '#products'); if (all().some(p => p.code === code)) openForm(code); else if (sub === 'new' && canEdit()) openForm(null); } } };
  return { render, openForm, all };
})();
