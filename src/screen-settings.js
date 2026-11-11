/* screen-settings.js — CR-15 §10 (D165): SYSTEM › Settings — only what the plans need, the Admin only. #settings/<tab> → CP.screens.settings
   7 tabs + the history: Users (was Edit people… of Acting as) · Sub-channels (was a tab of Product Master) · Holidays · Due dates · Expense template ·
   Signers (the sign-off rows of the PDF) · Plan defaults · Settings history. Each tab: Save · Restore defaults (asked in the page) · Last edited: who · when.
   Kept in this browser (CP.store: settings · people · subchannels) · a rev guards a save over another tab · nothing saved before changes by itself — the
   new values serve what is made from now on (a new plan · Recalculate due dates · Fill from the template · a PDF opened again) · Reset demo data = the defaults. */
CP.screens = CP.screens || {};
CP.screens.settings = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON, labelInfo, none } = U, Z = C.s15.set, A = C.actor;
  const TABS = ['users', 'subs', 'holidays', 'due', 'template', 'signers', 'defaults', 'history'];
  const me = () => CP.actor.get();
  const isAdmin = () => R.canDo('settings', me()).ok;
  const D = () => CP.store.data();
  const rev = () => ((D().settings || {}).rev || 0);
  const at = () => R.nowLocal();
  const fold = t => R.foldText(String(t == null ? '' : t));
  const num = v => { const x = U.parseNum(v); return x == null || Number.isNaN(x) ? null : x; };
  let sec = null, tab = 'users', W = null, dirty = false, year = +String(U.today()).slice(0, 4), err = '';

  function render(sub) {
    sec = $('tab-settings');
    if (!sec.dataset.built) { sec.addEventListener('click', onClick); sec.addEventListener('input', onInput); sec.addEventListener('change', onInput); sec.dataset.built = '1'; }
    if (!isAdmin()) { sec.innerHTML = `<div class="pbanner"><h1>${esc(Z.title)}</h1></div><div class="card"><div class="empty-st" data-noaccess><b>${esc(Z.noAccess)}</b><span class="links"><a class="btn" href="#dashboard">${esc(Z.backHome)}</a></span></div></div>`; return; }
    const want = TABS.includes(sub) ? sub : TABS.includes(tab) ? tab : 'users';
    if (want !== tab || !W || (!dirty && W.rev !== rev())) { tab = want; W = load(tab); dirty = false; err = ''; }
    if (location.hash !== `#settings/${tab}`) history.replaceState(null, '', `#settings/${tab}`);
    sec.innerHTML = `<div class="pbanner"><h1>${esc(Z.title)}</h1></div><div class="vtabs" role="tablist" id="set_tabs">${TABS.map(k => `<a role="tab" href="#settings/${k}" data-settab="${k}" class="${tab === k ? 'on' : ''}" aria-selected="${tab === k}">${esc(Z.tabs[k])}</a>`).join('')}</div>` +
      `<div class="card setcard" id="set_body" data-set="${tab}">${body()}</div>`;
  }
  /* the working copy of a tab (what the page edits until Save) */
  function load(k) {
    const c = R.cfg(), x = { rev: rev() };
    if (k === 'users') x.rows = (D().people || []).map(p => Object.assign({}, p));
    if (k === 'holidays') x.rows = c.holidays.map(h => Object.assign({}, h));
    if (k === 'due') x.v = Object.assign({}, c.due);
    if (k === 'template') { x.t = JSON.parse(JSON.stringify(c.template)); x.fee = c.platformFee; }
    if (k === 'signers') x.rows = c.signers.map(r => Object.assign({}, r));
    if (k === 'defaults') x.v = JSON.parse(JSON.stringify(c.defaults));
    return x;
  }
  const lastEdit = k => { const e = ((D().settings || {}).edits || {})[k]; return e && e.by ? Z.lastEdited(e.by, `${R.dmy(String(e.at).slice(0, 10))} ${String(e.at).slice(11, 16)}`) : Z.never; };
  const foot = (o = {}) => `<div class="set-foot"><span class="muted small" data-lastedit>${esc(lastEdit(tab))}</span><span class="ferr" id="set_err">${esc(err)}</span><span class="spacer"></span>` +
    (o.noRestore ? '' : `<button type="button" class="btn" data-setreset>${esc(Z.restore)}</button>`) + `<button type="button" class="btn primary" data-setsave${dirty ? '' : ' disabled'}>${esc(Z.save)}</button></div>`;
  function body() {
    if (tab === 'users') return usersHTML();
    if (tab === 'subs') return subsHTML();
    if (tab === 'holidays') return holHTML();
    if (tab === 'due') return dueHTML();
    if (tab === 'template') return tplHTML();
    if (tab === 'signers') return signHTML();
    if (tab === 'defaults') return defHTML();
    return histHTML();
  }
  const redraw = () => { const b = $('set_body'); if (b) b.innerHTML = body(); };
  const touch = () => { dirty = true; err = ''; const b = sec && sec.querySelector('[data-setsave]'); if (b) b.disabled = false; const e = $('set_err'); if (e) e.textContent = ''; };

  /* ---------- Users (§10.2 · §11): name · position · department · role · active · + person — Brand ≥ 1 · Approver ≥ 1 · Admin ≥ 1 ---------- */
  function usersHTML() {
    const row = (p, i) => `<tr data-pi="${i}"><td><input class="inp sm" data-pf="name" value="${esc(p.name)}" aria-label="${esc(A.name)}"></td>` +
      `<td><input class="inp sm" data-pf="title" value="${esc(p.title || '')}" placeholder="${esc(A.titlePh)}" aria-label="${esc(A.title)}"></td>` +
      `<td><select class="inp sm" data-pf="dept" aria-label="${esc(A.dept)}"><option value=""${p.dept ? '' : ' selected'}>${esc(A.depts.none)}</option>${R.DEPTS.map(k => `<option value="${k}"${k === p.dept ? ' selected' : ''}>${esc(A.depts[k])}</option>`).join('')}</select></td>` +
      `<td><select class="inp sm" data-pf="role" aria-label="${esc(A.role)}">${R.ROLE_KEYS.map(k => `<option value="${k}"${k === p.role ? ' selected' : ''}>${esc(A.roles[k])}</option>`).join('')}</select></td>` +
      `<td class="c"><input type="checkbox" data-pf="active"${p.active !== false ? ' checked' : ''} aria-label="${esc(A.active)}"></td></tr>`;
    return `<p class="muted small">${esc(Z.users.help)}</p><div class="tablewrap"><table class="tbl simple ptbl settbl"><thead><tr><th>${esc(A.name)}</th><th>${esc(A.title)}</th><th>${esc(A.dept)}</th><th>${esc(A.role)}</th><th class="c">${esc(A.active)}</th></tr></thead><tbody>${W.rows.map(row).join('')}</tbody></table></div>` +
      `<button type="button" class="link" data-padd>${esc(A.add)}</button>${foot()}`;
  }

  /* ---------- Sub-channels (§10.2 · was Product Master › Sub-channels): channel · name · price name · active · order · default share (read only) · used ---------- */
  const subsAll = () => (D().subchannels || []).slice().sort((a, b) => R.CHANNELS.indexOf(a.ch) - R.CHANNELS.indexOf(b.ch) || (a.order || 0) - (b.order || 0));
  function subUse(x) {
    const ids = new Set(); Object.values(D().plans || {}).forEach(p => { if ((p.versions || []).some(v => (v.subs || []).includes(x.id) || (v.target || []).some(r => r.sub === x.id))) ids.add(p.id); });
    ((U.seed().sales) || []).forEach(r => { if (r.scenario === 'actual' && r.channel === x.ch && (r.sub_channel === x.name || r.sub_channel === R.subLabel(x))) ids.add(r.campaign_id); });
    return ids.size;
  }
  function subsHTML() {
    const S = C.prod.sub, K = S.cols, xs = subsAll();
    return `<div class="toolbar ctools"><span class="muted small">${esc(S.offNote)}</span><span class="spacer"></span><button type="button" class="btn primary" data-psadd>${ICON.plus}<span>${esc(S.add)}</span></button></div>` +
      `<div class="tablewrap"><table class="tbl port pstbl"><thead><tr><th>${esc(K.ch)}</th><th>${esc(K.name)}</th><th>${esc(K.priceName)}</th><th>${esc(K.active)}</th><th class="num">${esc(K.order)}</th><th class="num">${labelInfo(Z.subs.share, Z.subs.shareTip)}</th><th class="num">${esc(K.used)}</th><th></th></tr></thead><tbody>` +
      xs.map(x => { const n = subUse(x); return `<tr data-psid="${esc(x.id)}"${x.active === false ? ' class="pdisc"' : ''}><td><b>${esc(C.channel[x.ch])}</b></td><td>${esc(R.subLabel(x))}</td><td>${esc(x.ch === 'TT' ? Z.subs.ttPrice : C.s14.priceName[x.priceName] || x.priceName || '—')}</td>` +
        `<td>${x.active === false ? `<span class="st pdiscontinued">${esc(S.off)}</span>` : `<span class="st pactive">${esc(S.on)}</span>`}</td><td class="num">${esc(String(x.order == null ? '' : x.order))}</td><td class="num">${esc(x.share == null ? '—' : `${x.share}%`)}</td><td class="num">${n || none()}</td>` +
        `<td class="nowrap"><button type="button" class="btn small" data-psedit="${esc(x.id)}">${esc(S.edit)}</button> <button type="button" class="btn small ghost" data-psdel="${esc(x.id)}"${n ? ` disabled title="${esc(S.usedNoDel)}"` : ''}>${esc(S.del)}</button></td></tr>`; }).join('') + '</tbody></table></div>' +
      `<div class="set-foot"><span class="muted small" data-lastedit>${esc(lastEdit('subs'))}</span><span class="spacer"></span><button type="button" class="btn" data-setreset>${esc(Z.restore)}</button></div>`;
  }
  function openSub(id) {
    const S = C.prod.sub, x = id ? subsAll().find(y => y.id === id) : null; if (id && !x) return;
    const v = x ? Object.assign({}, x) : { ch: 'MT', name: '', priceName: 'retailer', order: 1 + Math.max(0, ...subsAll().filter(y => y.ch === 'MT').map(y => y.order || 0)), active: true };
    U.openDialog(`<div class="dlg-h">${esc(x ? S.editT(R.subLabel(x)) : S.addT)}</div><div class="dlg-b kform">` +
      `<div class="frow"><div class="field"><label for="ps_ch">${esc(S.cols.ch)}</label><select id="ps_ch" class="inp"${x ? ' disabled' : ''}>${R.CHANNELS.map(k => `<option value="${k}"${v.ch === k ? ' selected' : ''}>${esc(C.channel[k])}</option>`).join('')}</select></div>` +
      `<div class="field"><label for="ps_name">${esc(S.cols.name)} <span class="req">*</span></label><input id="ps_name" class="inp" maxlength="40" value="${esc(x ? R.subLabel(x) : v.name)}"></div></div>` +
      `<div class="frow"><div class="field"><label for="ps_pn">${esc(S.cols.priceName)}</label><select id="ps_pn" class="inp">${Object.keys(C.s14.priceName).map(k => `<option value="${k}"${v.priceName === k ? ' selected' : ''}>${esc(C.s14.priceName[k])}</option>`).join('')}</select></div>` +
      `<div class="field"><label for="ps_ord">${esc(S.cols.order)}</label><input id="ps_ord" class="inp num" inputmode="numeric" value="${esc(String(v.order || ''))}"></div></div>` +
      `<label class="chk"><input type="checkbox" id="ps_on"${v.active !== false ? ' checked' : ''}><span>${esc(S.on)}</span></label><div class="help">${esc(S.offNote)}</div><div class="ferr" id="ps_e"></div></div>` +
      `<div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(C.common.cancel)}</button><button type="button" class="btn primary" data-r="1">${esc(S.save)}</button></div>`);
    const d = $('dlg'), e = $('ps_e'); $('ps_name').focus();
    d.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', async () => {
      if (b.dataset.r !== '1') { U.closeDialog(); return; }
      const ch = $('ps_ch').value, typed = $('ps_name').value.trim(), ord = +$('ps_ord').value || 0;
      if (!typed) { e.textContent = S.nameReq; return; }
      if (subsAll().some(y => y.ch === ch && y.id !== id && fold(R.subLabel(y)) === fold(typed))) { e.textContent = S.nameDup; return; }
      /* TT total keeps its default name (a word of the page) while it is not renamed */
      const name = x && x.id === 'tt-all' && typed === R.subLabel(x) ? x.name : typed;
      const nid = id || (() => { const base = `${ch.toLowerCase()}-${fold(typed).replace(/[^a-z0-9฀-๿]+/g, '-').replace(/^-|-$/g, '') || 'sub'}`; let k = base, i = 2; while (subsAll().some(y => y.id === k)) k = `${base}-${i++}`; return k; })();
      try { await CP.store.saveSubchannel(nid, prev => Object.assign({}, prev || { id: nid, ch, key: typed, share: 0 }, { name, priceName: $('ps_pn').value, order: ord, active: $('ps_on').checked }), Object.assign(x ? { rev: x.rev || 0 } : { create: true }, { by: me().name, at: at() }));
        U.closeDialog(); U.toast(S.saved(typed)); render(tab); }
      catch (y) { e.textContent = y.code === 'conflict' ? C.prod.toast.conflict : C.appr.toast.failed; }
    }));
  }
  async function delSub(id) {
    const S = C.prod.sub, x = subsAll().find(y => y.id === id); if (!x || subUse(x)) return;
    if (!(await U.confirmDialog(S.delQ(R.subLabel(x)), S.delBody, S.del, true, C.common.cancel))) return;
    try { await CP.store.saveSubchannel(id, () => null, { rev: x.rev || 0, by: me().name, at: at() }); U.toast(S.deleted(R.subLabel(x))); render(tab); } catch (y) { U.toast(C.appr.toast.failed); }
  }

  /* ---------- Holidays (§10.2): a list a year — date · name · kind (every year · this year only · company holiday) · add / delete ---------- */
  const holName = h => (CP.lang === 'en' ? h.en || h.th : h.th || h.en) || '';
  const holIso = (h, y) => (h.kind === 'yearly' ? `${y}-${String(h.date).slice(-5)}` : h.date);
  function holHTML() {
    const H = Z.hol, ys = [year - 1, year, year + 1, year + 2], rows = W.rows.map((h, i) => ({ h, i, iso: holIso(h, year) })).filter(x => x.iso.slice(0, 4) === String(year)).sort((a, b) => a.iso.localeCompare(b.iso));
    const wd = iso => new Date(iso + 'T00:00:00').getDay(), weekend = iso => wd(iso) === 0 || wd(iso) === 6;
    return `<p class="muted small">${esc(H.help)}</p><div class="toolbar ctools"><label class="ms"><select class="ms-trigger sel" data-holyear aria-label="${esc(H.year)}">${ys.map(y => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}</select></label>` +
      `<span class="muted small">${esc(H.count(rows.length))}</span></div>` +
      `<div class="tablewrap"><table class="tbl simple settbl holtbl"><thead><tr><th>${esc(H.date)}</th><th>${esc(H.name)}</th><th>${esc(H.kind)}</th><th></th></tr></thead><tbody>` +
      rows.map(({ h, i, iso }) => `<tr data-hi="${i}"><td class="nowrap">${esc(R.dmy(iso))}${weekend(iso) ? ` <span class="chip">${esc(H.weekend)}</span>` : ''}</td><td><input class="inp sm" data-hf="name" value="${esc(holName(h))}" aria-label="${esc(H.name)}"></td>` +
        `<td><select class="inp sm" data-hf="kind" aria-label="${esc(H.kind)}">${['yearly', 'once', 'company'].map(k => `<option value="${k}"${h.kind === k ? ' selected' : ''}>${esc(H.kinds[k])}</option>`).join('')}</select></td>` +
        `<td><button type="button" class="icon-btn" data-hdel="${i}" aria-label="${esc(H.del)}" title="${esc(H.del)}">${ICON.close}</button></td></tr>`).join('') + '</tbody></table></div>' +
      `<div class="frow holadd"><div class="field"><label for="hol_t">${esc(H.date)}</label>${U.dateHTML('id="hol_d"', '', { textId: 'hol_t' })}</div><div class="field"><label for="hol_n">${esc(H.name)}</label><input id="hol_n" class="inp" maxlength="60"></div>` +
      `<div class="field"><label for="hol_k">${esc(H.kind)}</label><select id="hol_k" class="inp">${['company', 'once', 'yearly'].map(k => `<option value="${k}">${esc(H.kinds[k])}</option>`).join('')}</select></div><div class="field"><label>&nbsp;</label><button type="button" class="btn" data-hadd>${esc(H.add)}</button></div></div>` + foot();
  }
  function addHoliday() {
    const H = Z.hol, iso = $('hol_d').value, name = $('hol_n').value.trim(), kind = $('hol_k').value;
    if (!R.isISODate(iso)) { err = H.dateBad; redraw(); return; }
    const date = kind === 'yearly' ? iso.slice(5) : iso;
    if (W.rows.some(h => (h.kind === 'yearly' ? `${iso.slice(0, 4)}-${String(h.date).slice(-5)}` : h.date) === iso)) { err = H.dup(R.dmy(iso)); redraw(); return; }
    W.rows.push({ date, th: name || H.company, en: name || H.company, kind }); year = +iso.slice(0, 4); touch(); redraw();
  }

  /* ---------- Due dates (§10.2 · CR-14 §3): working days a part + a live example ---------- */
  const DUE_KEYS = ['brief', 'work', 'summary', 'approval', 'buffer', 'squeezeMin'];
  function dueHTML() {
    const H = Z.due, v = W.v, ok = DUE_KEYS.every(k => Number.isInteger(+v[k]) && +v[k] >= (k === 'buffer' ? 0 : 1)), ex = '2027-03-01';
    const D0 = ok ? R.planDues(ex, U.today(), Object.fromEntries(DUE_KEYS.map(k => [k, +v[k]]))) : null;
    return `<p class="muted small">${esc(H.help)}</p><div class="setgrid">${DUE_KEYS.map(k => `<label class="setf"><span>${esc(H.f[k])}</span><span class="setin"><input class="inp sm num" data-due="${k}" inputmode="numeric" value="${esc(String(v[k]))}"><span class="muted small">${esc(H.wd)}</span></span></label>`).join('')}</div>` +
      `<div class="setex" data-dueex>${D0 ? esc(H.example(R.dmy(ex), R.dmy(D0.submit), D0.approveBy ? R.dmy(D0.approveBy) : '—', D0.mode === 'normal' ? '' : C.s14.mode[D0.mode])) : `<span class="neg">${esc(H.bad)}</span>`}</div>` + foot();
  }

  /* ---------- Expense template (§10.2 · CR-14 §7.2 · D145): line · in the template · % (the lines in the template = 100 a group) · Platform Fee % of the ECOM target ---------- */
  const GROUPS = ['marketing', 'sales', 'other'];
  const tplSum = g => W.t[g].filter(r => r[1]).reduce((a, r) => a + (+r[2] || 0), 0);
  function tplHTML() {
    const H = Z.tpl, G = C.plan.grid.groups;
    return `<p class="muted small">${esc(H.help)}</p><div class="tplgrid">` + GROUPS.map(g => { const t = Math.round(tplSum(g) * 10) / 10, okS = Math.abs(t - 100) < 0.05;
      return `<div class="tplg" data-tplg="${g}"><h3>${esc(G[g])} <span class="${okS ? 'okx' : 'neg'} small" data-tplsum="${g}">${esc(H.sum(t))}${okS ? ' ✓' : ''}</span></h3><table class="tbl simple settbl"><thead><tr><th>${esc(H.line)}</th><th class="c">${esc(H.inTpl)}</th><th class="num">%</th><th></th></tr></thead><tbody>` +
        W.t[g].map((r, i) => `<tr data-tr="${g}|${i}"><td><input class="inp sm" data-tf="line" value="${esc(r[0])}" aria-label="${esc(H.line)}"></td><td class="c"><input type="checkbox" data-tf="on"${r[1] ? ' checked' : ''} aria-label="${esc(H.inTpl)}"></td>` +
          `<td class="num"><input class="inp sm num" data-tf="pct" inputmode="decimal" value="${esc(String(r[2]))}"${r[1] ? '' : ' disabled'} aria-label="%"></td><td><button type="button" class="icon-btn" data-tdel="${g}|${i}" aria-label="${esc(H.del)}" title="${esc(H.del)}">${ICON.close}</button></td></tr>`).join('') +
        `</tbody></table><button type="button" class="link small" data-tadd="${g}">${esc(H.add)}</button></div>`; }).join('') + '</div>' +
      `<label class="setf"><span>${labelInfo(H.fee, H.feeTip)}</span><span class="setin"><input class="inp sm num" data-tfee inputmode="decimal" value="${esc(String(W.fee))}"><span class="muted small">${esc(H.feeUnit)}</span></span></label>` + foot();
  }

  /* ---------- Signers (§9.2 · §10.2): section · position · name = the step's owner / a person / blank · order ---------- */
  function signHTML() {
    const H = Z.sign, ppl = (D().people || []).filter(p => p.active !== false);
    const row = (r, i) => `<tr data-si="${i}"><td class="nowrap"><button type="button" class="icon-btn" data-sup="${i}" aria-label="${esc(H.up)}" title="${esc(H.up)}"${i ? '' : ' disabled'}>▲</button><button type="button" class="icon-btn" data-sdown="${i}" aria-label="${esc(H.down)}" title="${esc(H.down)}"${i < W.rows.length - 1 ? '' : ' disabled'}>▼</button></td>` +
      `<td><select class="inp sm" data-sf="sec" aria-label="${esc(H.sec)}">${R.SIGN_SECTIONS.map(k => `<option value="${k}"${r.sec === k ? ' selected' : ''}>${esc(H.secs[k])}</option>`).join('')}</select></td>` +
      `<td><input class="inp sm" data-sf="title" value="${esc(r.title || '')}" aria-label="${esc(H.title)}"></td>` +
      `<td><select class="inp sm" data-sf="who" aria-label="${esc(H.who)}">${['step', 'person', 'blank'].map(k => `<option value="${k}"${r.who === k ? ' selected' : ''}>${esc(H.whos[k])}</option>`).join('')}</select>` +
      (r.who === 'person' ? ` <select class="inp sm" data-sf="person" aria-label="${esc(H.person)}"><option value=""></option>${ppl.map(p => `<option${p.name === r.person ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : '') + `</td>` +
      `<td><button type="button" class="icon-btn" data-sdel="${i}" aria-label="${esc(H.del)}" title="${esc(H.del)}">${ICON.close}</button></td></tr>`;
    return `<p class="muted small">${esc(H.help)}</p><div class="tablewrap"><table class="tbl simple settbl"><thead><tr><th></th><th>${esc(H.sec)}</th><th>${esc(H.title)}</th><th>${esc(H.who)}</th><th></th></tr></thead><tbody>${W.rows.map(row).join('')}</tbody></table></div>` +
      `<button type="button" class="link" data-sadd${W.rows.length >= 12 ? ` disabled title="${esc(H.max)}"` : ''}>${esc(H.add)}</button>` + foot();
  }

  /* ---------- Plan defaults (§10.2): A&P warning · Worst / Best · ฿ off the envelope = complete · the SKU shares by role ---------- */
  function defHTML() {
    const H = Z.def, v = W.v, f = (k, l, unit) => `<label class="setf"><span>${esc(l)}</span><span class="setin"><input class="inp sm num" data-def="${k}" inputmode="decimal" value="${esc(String(v[k]))}"><span class="muted small">${esc(unit)}</span></span></label>`;
    return `<p class="muted small">${esc(H.help)}</p><div class="setgrid">${f('apWarn', H.apWarn, '%')}${f('worst', H.worst, '%')}${f('best', H.best, '%')}${f('envTol', H.envTol, '฿')}</div>` +
      `<h3 class="seth">${esc(H.roleW)}</h3><div class="setgrid">${['hero', 'core', 'gwp'].map(k => `<label class="setf"><span>${esc(((C.step.p || {}).roles || {})[k] || k)}</span><span class="setin"><input class="inp sm num" data-defw="${k}" inputmode="decimal" value="${esc(String(v.roleW[k]))}"></span></label>`).join('')}</div>` + foot();
  }

  /* ---------- Settings history (who · when · tab · before → after) ---------- */
  function histHTML() {
    const H = Z.hist, L = (D().settingsLog || []).slice().reverse();
    return `<div class="tablewrap"><table class="tbl simple settbl"><thead><tr><th>${esc(H.when)}</th><th>${esc(H.who)}</th><th>${esc(H.tab)}</th><th>${esc(H.what)}</th></tr></thead><tbody>` +
      (L.length ? L.map(x => `<tr><td class="nowrap">${esc(`${R.dmy(String(x.at).slice(0, 10))} ${String(x.at).slice(11, 16)}`)}</td><td>${esc(x.by)}</td><td>${esc(Z.tabs[x.tab] || x.tab)}</td><td class="small">${esc(x.what || '—')}</td></tr>`).join('')
        : `<tr><td colspan="4" class="muted">${esc(H.none)}</td></tr>`) + '</tbody></table></div>';
  }

  /* ---------- save · restore defaults ---------- */
  const diff = (a, b, keys, lbl) => keys.filter(k => String(a[k]) !== String(b[k])).map(k => `${lbl[k] || k}: ${a[k]} → ${b[k]}`).join(' · ');
  async function save() {
    const o = { rev: W.rev, by: me().name, at: at() }, c0 = R.cfg();
    try {
      if (tab === 'users') {
        try { await CP.store.savePeople(W.rows.map(p => Object.assign({}, p, { id: p.id || R.campaignId(p.name, W.rows.filter(x => x !== p && x.id)) })), o); }
        catch (x) { err = x.errors && x.errors.people === 'brand' ? A.needBrand : x.errors && x.errors.people === 'approver' ? A.needApprover : x.errors && x.errors.people === 'admin' ? A.needAdmin : C.appr.toast.failed; redraw(); return; }
        CP.actor.draw(); document.dispatchEvent(new CustomEvent('cp:actor'));
      } else if (tab === 'holidays') {
        await CP.store.saveSettings('holidays', { holidays: W.rows }, Object.assign(o, { what: Z.hol.what(W.rows.length - c0.holidays.length, W.rows.filter(h => h.kind === 'company').map(h => R.dmy(h.date)).join(' ')) }));
      } else if (tab === 'due') {
        if (!DUE_KEYS.every(k => Number.isInteger(+W.v[k]) && +W.v[k] >= (k === 'buffer' ? 0 : 1))) { err = Z.due.bad; redraw(); return; }
        const v = Object.fromEntries(DUE_KEYS.map(k => [k, +W.v[k]])); await CP.store.saveSettings('due', { due: v }, Object.assign(o, { what: diff(c0.due, v, DUE_KEYS, Z.due.f) }));
      } else if (tab === 'template') {
        const bad = GROUPS.find(g => Math.abs(tplSum(g) - 100) >= 0.05); if (bad) { err = Z.tpl.sumBad(C.plan.grid.groups[bad]); redraw(); return; }
        if (GROUPS.some(g => W.t[g].some(r => !String(r[0]).trim()))) { err = Z.tpl.lineReq; redraw(); return; }
        if (GROUPS.some(g => new Set(W.t[g].map(r => fold(r[0]))).size !== W.t[g].length)) { err = Z.tpl.lineDup; redraw(); return; }
        const fee = num(W.fee); if (fee == null || fee < 0 || fee > 100) { err = Z.tpl.feeBad; redraw(); return; }
        const t = Object.fromEntries(GROUPS.map(g => [g, W.t[g].map(r => [String(r[0]).trim(), !!r[1], r[1] ? +r[2] || 0 : 0])]));
        const what = GROUPS.flatMap(g => t[g].map(r => { const o0 = c0.template[g].find(x => x[0] === r[0]); return !o0 ? `+ ${r[0]} ${r[2]}%` : o0[2] !== r[2] || o0[1] !== r[1] ? `${r[0]}: ${o0[1] ? o0[2] : 0}% → ${r[1] ? r[2] : 0}%` : ''; }).filter(Boolean)).concat(fee !== c0.platformFee ? [`Platform Fee ${c0.platformFee}% → ${fee}%`] : []).join(' · ');
        await CP.store.saveSettings('template', { template: t, platformFee: fee }, Object.assign(o, { what }));
      } else if (tab === 'signers') {
        if (W.rows.some(r => r.who === 'person' && !r.person)) { err = Z.sign.needPerson; redraw(); return; }
        await CP.store.saveSettings('signers', { signers: W.rows.map(r => ({ sec: r.sec, title: String(r.title || '').trim(), who: r.who, person: r.who === 'person' ? r.person : '' })) }, Object.assign(o, { what: Z.sign.what(W.rows.length) }));
      } else if (tab === 'defaults') {
        const v = W.v, keys = ['apWarn', 'worst', 'best', 'envTol'], n = Object.fromEntries(keys.map(k => [k, num(v[k])])), w = Object.fromEntries(['hero', 'core', 'gwp'].map(k => [k, num(v.roleW[k])]));
        if (keys.some(k => n[k] == null || n[k] < 0) || Object.values(w).some(x => x == null || x < 0) || !(n.worst <= 100 && n.best >= 100)) { err = Z.def.bad; redraw(); return; }
        await CP.store.saveSettings('defaults', { defaults: Object.assign({}, n, { roleW: w }) }, Object.assign(o, { what: diff(c0.defaults, n, keys, Z.def.short) + (JSON.stringify(c0.defaults.roleW) !== JSON.stringify(w) ? ` · ${Z.def.roleW}` : '') }));
      }
    } catch (x) { if (x.code === 'conflict') { U.toast(Z.conflict); W = load(tab); dirty = false; render(tab); return; } U.toast(C.appr.toast.failed); return; }
    dirty = false; err = ''; W = load(tab); U.toast(Z.saved(Z.tabs[tab])); render(tab);
  }
  async function restore() {
    if (!(await U.confirmDialog(Z.restoreQ(Z.tabs[tab]), Z.restoreBody, Z.restore, true, C.common.cancel))) return;
    const o = { by: me().name, at: at(), what: Z.restored };
    try {
      if (tab === 'users') await CP.store.resetPart('people', 'users', o);
      else if (tab === 'subs') await CP.store.resetPart('subchannels', 'subs', o);
      else { const keys = { holidays: ['holidays'], due: ['due'], template: ['template', 'platformFee'], signers: ['signers'], defaults: ['defaults'] }[tab] || [];
        await CP.store.saveSettings(tab, Object.fromEntries(keys.map(k => [k, null])), o); }
    } catch (x) { U.toast(C.appr.toast.failed); return; }
    if (tab === 'users') { CP.actor.draw(); document.dispatchEvent(new CustomEvent('cp:actor')); }
    dirty = false; err = ''; W = load(tab); U.toast(Z.restoredT(Z.tabs[tab])); render(tab);
  }

  /* ---------- events ---------- */
  async function onClick(e) {
    const t = e.target;
    const tb = t.closest('[data-settab]'); if (tb) { e.preventDefault(); if (tb.dataset.settab === tab) return;
      if (dirty && !(await U.confirmDialog(C.plan.grid.leaveQ, C.plan.grid.leaveBody, C.plan.grid.leave, true, C.common.cancel))) return; dirty = false; W = null; location.hash = `#settings/${tb.dataset.settab}`; return; }
    if (t.closest('[data-setsave]')) { save(); return; }
    if (t.closest('[data-setreset]')) { restore(); return; }
    if (t.closest('[data-padd]')) { W.rows.push({ id: '', name: '', title: '', role: 'staff', dept: '', active: true }); touch(); redraw(); const ins = sec.querySelectorAll('[data-pf="name"]'); ins[ins.length - 1].focus(); return; }
    if (t.closest('[data-psadd]')) { openSub(null); return; }
    const se = t.closest('[data-psedit]'); if (se) { openSub(se.dataset.psedit); return; }
    const sd = t.closest('[data-psdel]'); if (sd) { delSub(sd.dataset.psdel); return; }
    if (t.closest('[data-hadd]')) { addHoliday(); return; }
    const hd = t.closest('[data-hdel]'); if (hd) { W.rows.splice(+hd.dataset.hdel, 1); touch(); redraw(); return; }
    const ta = t.closest('[data-tadd]'); if (ta) { W.t[ta.dataset.tadd].push(['', true, 0]); touch(); redraw(); return; }
    const tdl = t.closest('[data-tdel]'); if (tdl) { const [g, i] = tdl.dataset.tdel.split('|'); W.t[g].splice(+i, 1); touch(); redraw(); return; }
    if (t.closest('[data-sadd]')) { if (W.rows.length < 12) { W.rows.push({ sec: 'target', title: '', who: 'blank', person: '' }); touch(); redraw(); } return; }
    const sdl = t.closest('[data-sdel]'); if (sdl) { W.rows.splice(+sdl.dataset.sdel, 1); touch(); redraw(); return; }
    const su = t.closest('[data-sup], [data-sdown]'); if (su) { const i = +(su.dataset.sup != null ? su.dataset.sup : su.dataset.sdown), j = su.dataset.sup != null ? i - 1 : i + 1; if (j < 0 || j >= W.rows.length) return; [W.rows[i], W.rows[j]] = [W.rows[j], W.rows[i]]; touch(); redraw(); }
  }
  function onInput(e) {
    const t = e.target; if (!W) return;
    if (t.matches('[data-holyear]')) { year = +t.value; redraw(); return; }
    if (t.closest('.holadd')) return;
    const pr = t.closest('tr[data-pi]'); if (pr && t.dataset.pf) { const p = W.rows[+pr.dataset.pi]; p[t.dataset.pf] = t.type === 'checkbox' ? t.checked : t.value; touch(); return; }
    const hr = t.closest('tr[data-hi]'); if (hr && t.dataset.hf) { const h = W.rows[+hr.dataset.hi];
      if (t.dataset.hf === 'name') { if (CP.lang === 'en') h.en = t.value; else h.th = t.value; }
      else { const iso = holIso(h, year); h.kind = t.value; h.date = t.value === 'yearly' ? iso.slice(5) : iso; } touch(); return; }
    if (t.dataset.due) { W.v[t.dataset.due] = t.value; touch(); const ex = sec.querySelector('[data-dueex]'); if (ex) { const tmp = document.createElement('div'); tmp.innerHTML = dueHTML(); ex.innerHTML = tmp.querySelector('[data-dueex]').innerHTML; } return; }
    const tr = t.closest('tr[data-tr]'); if (tr && t.dataset.tf) { const [g, i] = tr.dataset.tr.split('|'), r = W.t[g][+i];
      if (t.dataset.tf === 'line') r[0] = t.value; else if (t.dataset.tf === 'on') { r[1] = t.checked; if (!t.checked) r[2] = 0; } else r[2] = num(t.value) == null ? t.value : num(t.value);
      touch(); if (t.dataset.tf === 'on') redraw(); else { const sm = sec.querySelector(`[data-tplsum="${g}"]`), s0 = Math.round(tplSum(g) * 10) / 10, okS = Math.abs(s0 - 100) < 0.05; if (sm) { sm.textContent = Z.tpl.sum(s0) + (okS ? ' ✓' : ''); sm.className = `${okS ? 'okx' : 'neg'} small`; } } return; }
    if (t.matches('[data-tfee]')) { W.fee = t.value; touch(); return; }
    const sr = t.closest('tr[data-si]'); if (sr && t.dataset.sf) { const r = W.rows[+sr.dataset.si]; r[t.dataset.sf] = t.value; touch(); if (t.dataset.sf === 'who') redraw(); return; }
    if (t.dataset.def) { W.v[t.dataset.def] = t.value; touch(); return; }
    if (t.dataset.defw) { W.v.roleW[t.dataset.defw] = t.value; touch(); }
  }
  return { render, isDirty: () => dirty };
})();
