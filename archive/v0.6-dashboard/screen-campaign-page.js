/* screen-campaign-page.js — CR-05 §5: the Campaign page (#campaigns/<id>[/<tab>]) · §6 the review (KOL: one container, the Decision at the end) ·
   §7 Request budget (a drawer). → CP.cpage · CP.review · CP.reqdraw
   Head: name · Approval chip · Status chip · Owner · Period · vN · the buttons this person may use (a button they cannot use is hidden — except
   "You submitted this — another Manager must approve"). Tabs: Summary · Sales target · Budget · Expenses · Requests · History.
   The grids (CP.ui.grid) edit a copy of the version in the page — Save draft writes it (CP.store.savePlan, the rev of §4.3); leaving with changes asks.
   CR-06: Mock only (no P&L-file Campaign) · no Paste sheet / Import targets CSV (Ctrl+V in the grid stays — D53) · the banner Campaigns › <name> (D55) ·
   §7.3 — + Add SKU picks from the Product Master only (not Discontinued) · the plan keeps a snapshot of COGS and the net price (the price may be the promo
   price of the Campaign · COGS not editable) · Draft / Returned: COGS changed in Product Master → Update to ฿x · the review shows the plan vs the master. */
CP.cpage = (function () {
  'use strict';
  const U = CP.ui, { C, R, $, esc, ICON, labelInfo, none, statusChip } = U;
  const P = C.plan, A = C.appr, TABS = ['summary', 'target', 'budget', 'expenses', 'requests', 'history'];
  const me = () => CP.actor.get();
  const allCamps = () => { const s = U.seed(); return s.allCampaigns || s.campaigns || []; };
  const campOf = id => allCamps().find(c => c.id === id) || null;
  const planOf = id => CP.store.data().plans[id] || null;
  const master = () => new Map((CP.store.data().products || []).map(p => [p.code, p]));
  const live = c => !!c && R.statusOf(c, U.today()) !== R.CANCELLED && R.statusOf(c, U.today()) !== 'complete';
  const at = () => R.nowLocal();
  let el = null, st = { id: null, tab: 'summary', mode: 'qty', folded: new Set(), F: null, gT: null, gB: null, showMonths: false, cmp: null };

  /* ===================== the working copy of the version (the grids edit it) ===================== */
  function draftOf(id) {
    const plan = planOf(id), ver = plan ? (plan.approval === 'approved' ? R.approvedVersion(plan) : R.working(plan)) : null;
    const F = { id, rev: plan ? plan.rev || 0 : 0, ver, skus: ver ? R.clonePlan(ver.skus || []) : [], q: new Map(), amt: new Map(), subs: new Map(), bud: new Map(), lines: [], dirty: 0 };
    (ver ? ver.target : []).forEach(r => { const k = `${r.code}|${r.channel}|${r.sub_channel}`; F.q.set(`${k}|${r.month}`, R.isNum(+r.qty) ? +r.qty : null); if (R.isNum(r.amount)) F.amt.set(`${k}|${r.month}`, r.amount);
      if (!F.subs.has(r.code)) F.subs.set(r.code, new Set()); F.subs.get(r.code).add(`${r.channel}|${r.sub_channel}`); });
    (ver ? ver.budget : []).forEach(r => { const k = `${r.type}|${r.line}`; if (!F.bud.has(k)) { F.bud.set(k, new Map()); F.lines.push({ type: r.type, line: r.line }); } F.bud.get(k).set(r.month, +r.amount); });
    return F;
  }
  function serialize(F) {
    const target = [], budget = [];
    /* one pass over the cells (O(cells) — 10 SKU × 14 Sub-channel × 12 months stays fast) · a cell counts when its SKU and Sub-channel are still there */
    const order = new Map(F.skus.map((s, i) => [s.code, i]));
    F.q.forEach((v, k) => { if (v == null || v === 0) return; const p = k.split('|'), subs = F.subs.get(p[0]); if (!order.has(p[0]) || !subs || !subs.has(`${p[1]}|${p[2]}`)) return;
      const row = { code: p[0], channel: p[1], sub_channel: p[2], month: p[3], qty: v }; if (F.amt.has(k)) row.amount = F.amt.get(k); target.push(row); });
    target.sort((a, b) => order.get(a.code) - order.get(b.code) || R.CHANNELS.indexOf(a.channel) - R.CHANNELS.indexOf(b.channel) || a.sub_channel.localeCompare(b.sub_channel) || a.month.localeCompare(b.month));
    F.lines.forEach(l => { const m = F.bud.get(`${l.type}|${l.line}`); if (m) m.forEach((v, month) => { if (v) budget.push({ type: l.type, line: l.line, month, amount: v }); }); });
    return { skus: F.skus.map(s => Object.assign({}, s, { cogs: s.cogs === '' || s.cogs == null ? null : +s.cogs, price: Object.fromEntries(R.CHANNELS.map(k => [k, s.price && s.price[k] !== '' && s.price[k] != null ? +s.price[k] : ''])) })), target, budget };
  }
  const editable = (c, plan) => !!plan && R.canDo('edit', me(), plan).ok;
  const months = c => R.monthsIn(c.start, c.end);
  const bmonths = c => R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end);
  const monthCols = list => { const cur = R.ym(U.today()); return list.map((m, i) => ({ key: m, label: R.monthShort(m), year: i === 0 || m.slice(0, 4) !== list[i - 1].slice(0, 4) ? m.slice(0, 4) : '', cur: m === cur })); };
  const isDirty = () => !!(st.F && st.F.dirty);

  /* ===================== render ===================== */
  function render(root, id, tab) {
    el = root; const c = campOf(id);
    if (st.id !== id) { st = Object.assign(st, { id, F: null, folded: new Set(), cmp: null, showMonths: false }); }
    st.tab = TABS.includes(tab) ? tab : st.tab && st.id === id ? st.tab : 'summary';
    if (!c) { el.innerHTML = `<div class="pbanner"><div class="crumb"><a href="#campaigns">${esc(C.camps.title)}</a></div><h1>${esc(P.notFound)}</h1></div>`; return; }
    if (!st.F || (!st.F.dirty && st.F.rev !== ((planOf(id) || {}).rev || 0))) st.F = draftOf(id);
    const plan = planOf(id);
    el.innerHTML = `<div class="pbanner"><div class="crumb"><a href="#campaigns">${esc(C.camps.title)}</a><span>›</span>${esc(c.name)}</div><h1>${esc(c.name)}</h1></div>` +
      `<div class="cp-head" id="cp_head">${headHTML(c, plan)}</div>` +
      `<div class="ptabs" role="tablist" id="cp_tabs">${TABS.map(t => `<a role="tab" href="#campaigns/${esc(id)}/${t}" data-cptab="${t}" class="${t === st.tab ? 'on' : ''}" aria-selected="${t === st.tab}">${esc(P.tabs[t])}${tabCount(t, c, plan)}</a>`).join('')}</div>` +
      `<div id="cp_body" class="cp-body"></div>`;
    ({ summary: renderSummary, target: renderTarget, budget: renderBudget, expenses: renderExpenses, requests: renderRequests, history: renderHistory })[st.tab](c, plan);
  }
  function tabCount(t, c, plan) {
    if (t === 'requests') { const n = ((plan && plan.requests) || []).length; return n ? ` <span class="n">${n}</span>` : ''; }
    if (t === 'expenses') { const n = (CP.store.data().expenses[c.id] || []).filter(r => r.status !== 'void').length; return n ? ` <span class="n">${n}</span>` : ''; }
    return '';
  }
  /* ---------- the head: chips · owner · period · v · the buttons ---------- */
  function headHTML(c, plan) {
    const a = me(), w = R.working(plan), appr = plan ? plan.approval : 'draft';
    const chips = U.apChip(appr, { tip: appr === 'returned' && w && w.comment ? w.comment : '' }) + (appr === 'approved' ? statusChip(R.statusOf(c, U.today())) : '');
    const meta = [c.owner ? P.owner(c.owner) : '', `${R.dmy(c.start)} – ${R.dmy(c.end)}`, w ? P.v(w.v) : ''].filter(Boolean).map(esc).join('<span class="sep">·</span>');
    const b = [], can = (x, extra) => R.canDo(x, a, plan, extra);
    if (plan) {
      if (can('submit').ok) { const ck = R.planChecks(serialize(st.F), c); b.push(`<button type="button" class="btn primary" data-cpact="submit"${ck.ok ? '' : ` disabled title="${esc(P.sum.checks)}"`}>${esc(P.btn.submit)}</button>`); }
      if (plan.approval === 'submitted') { const d = can('approve'); if (d.ok) b.push(`<button type="button" class="btn primary" data-cpact="review">${esc(P.btn.review)}</button>`); else if (d.why) b.push(`<button type="button" class="btn primary" disabled title="${esc(d.why)}">${esc(P.btn.approve)}</button>`); }
      if (can('withdraw').ok) b.push(`<button type="button" class="btn" data-cpact="withdraw">${esc(P.btn.withdraw)}</button>`);
      if (can('duplicate').ok) b.push(`<button type="button" class="btn" data-cpact="duplicate">${esc(P.btn.duplicate)}</button>`);
    }
    if (can('request', { live: live(c) }).ok) b.push(`<button type="button" class="btn" data-cpact="request">${esc(P.btn.request)}</button>`);
    if (plan && plan.approval === 'approved') b.push(`<a class="btn ghost" href="#dashboard/campaign/${esc(c.id)}">${esc(P.btn.dashboard)}</a>`);
    const more = (plan && R.canDo('details', a, plan).ok) || (a && R.isMgr(a));
    return `<div class="cp-ttl"><div class="cp-chips">${chips}</div><div class="cp-meta">${meta}</div></div><div class="cp-act">${b.join('')}` +
      (more ? `<button type="button" class="icon-btn" data-cpmore aria-haspopup="menu" aria-label="${esc(P.btn.more)}" title="${esc(P.btn.more)}">${ICON.more}</button>` : '') + '</div>';
  }

  /* ---------- Summary ---------- */
  const tile = (l, v, sub, cls) => `<div class="tile${cls ? ' ' + cls : ''}"><div class="tl">${esc(l)}</div><div class="tv">${esc(v)}</div>${sub ? `<div class="ts">${esc(sub)}</div>` : ''}</div>`;
  function planTiles(T) {
    const S = P.sum;
    return `<div class="tiles">${tile(S.target, R.baht(T.target), `${R.fmtNum(Math.round(T.qty))} pcs`)}${tile(S.cogs, R.baht(T.cogs), `${S.gp} ${R.baht(T.gp)}`)}${tile(S.gp, R.pct(T.gpPct, 1), '')}` +
      `${tile(S.budget, R.baht(T.budget), `${S.mkt} ${R.shortBaht(T.mkt)} · ${S.sls} ${R.shortBaht(T.sls)}`)}${tile(S.ap, R.pct(T.ap, 1), '', T.ap > 0.2 ? 'warn' : '')}${tile(S.profit, R.baht(T.profit), `${S.margin} ${R.pct(T.margin, 1)} · ${S.roi} ${R.times(T.roi)}`, T.profit < 0 ? 'neg' : '')}</div>` +
      `<div class="muted small cp-counts">${esc(S.counts(T.skus, T.subs, T.months))}</div>`;
  }
  function renderSummary(c, plan) {
    const box = $('cp_body'), S = P.sum, out = [];
    if (plan) {
      const v = serialize(st.F), T = R.planTotals(v), ck = R.planChecks(v, c);
      out.push(`<div class="card"><div class="card-head"><h3>${esc(S.plan)} <span class="hnote">${esc(P.v(R.working(plan).v))}${st.F.dirty ? ' · ' + esc(P.grid.unsaved(st.F.dirty)) : ''}</span></h3></div>${planTiles(T)}</div>`);
      if (plan.approval !== 'approved') out.push(`<div class="card"><div class="card-head"><h3>${esc(S.checks)}</h3></div><ul class="checks2">${ck.errs.map(x => `<li class="${x.ok ? 'ok' : 'err'}"><span class="ci">${x.ok ? '✓' : '✕'}</span>${esc(x.text)}${x.detail ? ` <span class="muted">— ${esc(x.detail)}</span>` : ''}</li>`).join('')}</ul>` +
        (ck.warns.length ? `<div class="card-sub">${esc(S.warnings)}</div><ul class="checks2">${ck.warns.map(x => `<li class="warn"><span class="ci">⚠</span>${esc(x.text)}</li>`).join('')}</ul>` : '') + '</div>');
    }
    if (plan && plan.approval === 'approved') out.push(trackHTML(c));
    out.push(`<div class="card"><div class="card-head"><h3>${esc(S.details)}</h3></div><dl class="kv">` +
      [[S.endMkt, c.end_marketing ? R.dmy(c.end_marketing) : C.common.none], [S.created, c.created_at ? R.dmy(c.created_at.slice(0, 10)) : ''], [S.updated, c.updated_at ? R.dmy(c.updated_at.slice(0, 10)) : '']]
        .filter(x => x[1]).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl></div>');
    box.innerHTML = out.join('');
  }
  /* the Track of an approved Campaign: Time left · Net revenue · Budget bar · Campaign profit (as By campaign) */
  function trackHTML(c) {
    const s = U.seed(), td = U.today(), tp = R.timeProgress(c, td), dl = R.daysLeft(c, td), S = P.sum;
    const span = R.monthsIn(c.start, c.end), o = { from: R.monthFirst(R.addMonths(span[0], -1)), to: R.monthLast(span[span.length - 1]), statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: td };
    const bt = R.budgetTrack(s, o), t = bt.rows[0], k = R.kpis(s, o).pnl, A = k.actual;
    const time = !tp.started ? C.camp.k.startsIn(dl.n) : tp.ended ? C.camp.k.ended(R.dmy(c.end)) : C.camp.k.timeV(tp.daysLeft);
    const bud = t ? `<div class="tl">${esc(C.track.budget)}</div><div class="tv">${esc(R.baht(t.committed))} <small>${esc(C.track.of(R.baht(t.current)))}</small></div>${U.budgetBar(Object.assign({}, t, { paid: t.paidV }))}<div class="ts">${esc(U.budgetCap(t))}</div>` : '';
    return `<div class="card"><div class="card-head"><h3>${esc(S.track)}</h3><div class="ctl"><a class="link" href="#dashboard/campaign/${esc(c.id)}">${esc(P.btn.dashboard)}</a></div></div><div class="tiles t4">` +
      tile(S.timeLeft, time, tp.started && !tp.ended ? C.camp.k.timeCap(R.pct(tp.pct), R.dmy(c.end)) : '') +
      tile(S.revenue, A.rev == null ? C.common.none : R.baht(A.rev), A.rev == null ? C.empty.card : `${R.pctA(k.ach)} ${C.dash.k.onTarget.replace(' · on target', '')}`) +
      `<div class="tile wide">${bud}</div>` + tile(S.profitA, A.profit == null ? C.common.none : R.baht(A.profit), A.profit == null ? '' : C.wf.k.profitCap(R.pct(A.margin), R.times(A.roi))) + '</div></div>';
  }

  /* ---------- Sales target: Products (from the Product Master) + the grid SKU ▸ Channel ▸ Sub-channel × month ---------- */
  const knownSubs = () => { const m = { MT: new Set(['Watsons', 'Eveandboy', 'Konvy', 'Beautrium', 'Multy', 'Tsuruha', 'CJ', 'Lotuss', '24shopping', 'Mr.DIY']), TT: new Set(['Traditional Trade']), ECOM: new Set(['Shopee', 'Tiktok', 'Lazada']) };
    (U.seed().sales || []).forEach(r => { if (m[r.channel]) m[r.channel].add(r.sub_channel); }); return m; };
  const canMaster = () => R.canDo('product', me()).ok;
  function renderTarget(c, plan) {
    const box = $('cp_body'), G = P.grid;
    const ed = editable(c, plan), F = st.F, chs = R.CHANNELS, M = master(), open = plan && (plan.approval === 'draft' || plan.approval === 'returned');
    const prodRows = F.skus.map((s, i) => { const m = M.get(s.code), drift = open && m && R.isNum(+m.cogs) && Math.abs(+m.cogs - (+s.cogs || 0)) > 0.0001;
      return `<tr data-si="${i}"><td><b>${esc(s.code)}</b></td><td class="pnm"><b>${esc(s.name || '')}</b>${s.nickname ? `<div class="muted small">${esc(s.nickname)}</div>` : ''}</td><td>${esc(s.group || '')}</td><td>${esc(s.category || '')}</td>` +
        `<td class="num"><span title="${esc(G.cogsTip)}">${esc(s.cogs == null || s.cogs === '' ? C.common.none : R.fmtNum(+s.cogs, 2))}</span>${drift ? `<div class="cdrift"><span class="chip warn" title="${esc(G.driftTip(R.fmtNum(+s.cogs, 2), R.fmtNum(+m.cogs, 2)))}">${esc(G.drift)}</span>${ed ? `<button type="button" class="link" data-skupd="${i}">${esc(G.driftUpd(R.fmtNum(+m.cogs, 2)))}</button>` : ''}</div>` : ''}</td>` +
        chs.map(k => `<td class="num">${ed ? `<input class="inp sm num" data-sp="${k}" inputmode="decimal" value="${esc(s.price && s.price[k] != null ? s.price[k] : '')}" aria-label="${esc(G.price(k))}"${m && m.price && m.price[k] !== '' && R.isNum(+m.price[k]) ? ` title="${esc(G.masterPrice(R.fmtNum(+m.price[k], 2)))}"` : ''}>` : esc(s.price && s.price[k] !== '' && s.price[k] != null ? s.price[k] : C.common.none)}</td>`).join('') +
        `<td>${ed ? `<button type="button" class="icon-btn" data-skdel="${i}" aria-label="${esc(G.remove)}" title="${esc(G.remove)}">${ICON.close}</button>` : ''}</td></tr>`; }).join('');
    const pick = [...M.values()].filter(p => p.status !== 'discontinued' && !F.skus.some(s => s.code === p.code)).sort((a, b) => a.code.localeCompare(b.code));
    box.innerHTML = `<div class="card"><div class="card-head"><h3>${esc(G.products)}</h3>${ed ? `<div class="ctl"><input class="inp sm skuadd" list="cp_skulist" id="cp_skuq" placeholder="${esc(G.skuPh)}" aria-label="${esc(G.addSku)}" autocomplete="off"><button type="button" class="btn small" data-cpaddsku>${esc(G.addSku)}</button>` +
      `<datalist id="cp_skulist">${pick.map(p => `<option value="${esc(p.code)}">${esc(`${p.code} · ${p.nickname} — ${p.name}${p.status === 'npd' ? ` (${C.prod.state.npd})` : p.status === 'clearance' ? ` (${C.prod.state.clearance})` : ''}`)}</option>`).join('')}</datalist>` +
      (canMaster() ? `<button type="button" class="link" data-cpnewprod>${esc(G.createProduct)}</button>` : '') + `</div>` : ''}</div>` +
      (ed ? `<div class="muted small cp-pmnote">${esc(G.fromMaster)} <a class="link" href="#products">${esc(C.prod.title)}</a></div>` : '') +
      `<div class="tablewrap"><table class="tbl simple prodtbl"><thead><tr><th>${esc(G.code)}</th><th>${esc(G.product)}</th><th>${esc(G.group)}</th><th>${esc(G.category)}</th><th class="num">${labelInfo(G.cogs, G.cogsInfo, G.cogs, true)}</th>${chs.map(k => `<th class="num" title="${esc(G.priceTip)}">${esc(G.price(k))}</th>`).join('')}<th></th></tr></thead><tbody>${prodRows || `<tr><td colspan="9" class="muted">${esc(G.noSku)}</td></tr>`}</tbody></table></div></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(P.tabs.target)}</h3><div class="ctl">${U.segHTML('data-cpmode', [{ v: 'qty', label: G.qty }, { v: 'baht', label: G.baht }], st.mode)}` +
      (ed ? `<span class="subadd"><select class="inp sm" id="cp_subsku" aria-label="SKU">${F.skus.map(s => `<option value="${esc(s.code)}">${esc(s.nickname || s.name || s.code)}</option>`).join('')}</select><select class="inp sm" id="cp_subch" aria-label="${esc(C.dash.meta.channel)}">${chs.map(k => `<option>${k}</option>`).join('')}</select>` +
        `<input class="inp sm" id="cp_subname" list="cp_sublist" placeholder="${esc(G.subPh)}" aria-label="${esc(G.subPh)}"><datalist id="cp_sublist"></datalist><button type="button" class="btn small" data-cpaddsub${F.skus.length ? '' : ' disabled'}>${esc(G.addSub)}</button></span>` : '') + '</div></div>' +
      (ed ? toolbarHTML('t') : `<div class="muted small">${esc(G.readOnly)}</div>`) + `<div id="cp_gridT" class="cp-grid"></div><div class="muted small cp-keys">${ed ? esc(G.keys) : ''}${st.mode === 'baht' ? ` · ${esc(G.bahtTip)}` : ''}</div></div>`;
    fillSubList();
    const sm = new Map(F.skus.map(s => [s.code, s])), rows = [];
    F.skus.forEach(s => {
      const subs = [...(F.subs.get(s.code) || [])].sort((a, b) => chs.indexOf(a.split('|')[0]) - chs.indexOf(b.split('|')[0]) || a.localeCompare(b)), open = !st.folded.has(s.code);
      rows.push({ key: 'S|' + s.code, label: s.nickname || s.name || s.code, sub: s.code, level: 0, fold: subs.length > 0, open });
      chs.forEach(ch => { const list = subs.filter(x => x.startsWith(ch + '|')); if (!list.length) return;
        rows.push({ key: `C|${s.code}|${ch}`, label: ch, sub: C.channelLong[ch], level: 1, hidden: !open });
        list.forEach(x => rows.push({ key: `L|${s.code}|${x}`, label: x.split('|')[1], level: 2, leaf: true, hidden: !open })); });
    });
    const mcols = monthCols(months(c));
    const spec = { id: 'gT', rows, cols: mcols, corner: G.corner, aria: P.tabs.target, readOnly: !ed || st.mode === 'baht',
      get: (rk, ck) => { const [, code, ch, sub] = rk.split('|'), k = `${code}|${ch}|${sub}|${ck}`, q = F.q.get(k); if (st.mode === 'qty') return q == null ? null : q;
        if (q == null) return null; return F.amt.has(k) ? F.amt.get(k) : (R.priceOf(sm.get(code), ch) == null ? null : q * R.priceOf(sm.get(code), ch)); },
      canEdit: () => true, fmt: v => R.fmtNum(Math.round(v)),
      onChange: list => { list.forEach(x => { const [, code, ch, sub] = x.r.split('|'), k = `${code}|${ch}|${sub}|${x.c}`; if (x.v == null || x.v === 0) F.q.delete(k); else F.q.set(k, Math.round(x.v)); F.amt.delete(k); }); F.dirty += list.length; dirtyNote(); },
      onFold: k => { const code = k.split('|')[1]; if (st.folded.has(code)) st.folded.delete(code); else st.folded.add(code); renderTarget(c, plan); } };
    st.gT = U.grid($('cp_gridT'), spec);
  }
  function fillSubList() { const ch = $('cp_subch'), dl = $('cp_sublist'); if (!ch || !dl) return; dl.innerHTML = [...(knownSubs()[ch.value] || [])].sort().map(x => `<option value="${esc(x)}">`).join(''); }
  const toolbarHTML = w => { const G = P.grid; return `<div class="gridbar"><button type="button" class="btn small" data-gtool="fillRight" data-g="${w}">${esc(G.fillRight)}</button><button type="button" class="btn small" data-gtool="spreadTotal" data-g="${w}">${esc(G.spread)}</button>` +
    `<button type="button" class="btn small" data-gtool="clearRow" data-g="${w}">${esc(G.clearRow)}</button><button type="button" class="btn small ghost" data-gtool="undo" data-g="${w}">${esc(G.undo)}</button><button type="button" class="btn small ghost" data-gtool="redo" data-g="${w}">${esc(G.redo)}</button>` +
    `<span class="spacer"></span>` +
    `<span class="dirtyn muted small" id="cp_dirty">${st.F && st.F.dirty ? esc(G.unsaved(st.F.dirty)) : ''}</span><button type="button" class="btn small primary" data-cpact="save"${st.F && st.F.dirty ? '' : ' disabled'}>${esc(P.btn.save)}</button></div>`; };
  function dirtyNote() { const d = $('cp_dirty'), b = el && el.querySelector('[data-cpact="save"]'); if (d) d.textContent = st.F.dirty ? P.grid.unsaved(st.F.dirty) : ''; if (b) b.disabled = !st.F.dirty;
    const h = $('cp_head'), c = campOf(st.id); if (h && c) { const x = headHTML(c, planOf(st.id)); if (h._html !== x) { h.innerHTML = x; h._html = x; } } }

  /* ---------- Budget: line × month (Marketing · Sales) · after approval: Original · Approved changes · Current · Committed · Remaining · Pending ---------- */
  const knownLines = () => { const L = CP.mock.lines(), m = { marketing: new Set(L.marketing), sales: new Set(L.sales) };
    (U.seed().expenses || []).forEach(r => { if (m[r.type]) m[r.type].add(r.line); }); return m; };
  function renderBudget(c, plan) {
    const box = $('cp_body'), G = P.grid, ed = editable(c, plan), F = st.F, out = [];
    if (plan && plan.approval === 'approved') out.push(budgetTrackHTML(c));
    if (plan) {
      const T = R.planTotals(serialize(F)), showGrid = plan.approval !== 'approved' || st.showMonths;
      out.push(`<div class="card"><div class="card-head"><h3>${esc(P.tabs.budget)} <span class="hnote">${esc(P.v(R.working(plan).v))}</span></h3><div class="ctl">` +
        (plan.approval === 'approved' ? `<button type="button" class="btn small" data-cpmonths aria-pressed="${st.showMonths}">${esc(st.showMonths ? C.dash.t.collapse : C.camp.m.title.replace('Target vs Actual by month', 'Months'))}</button>` : '') +
        (ed ? `<span class="subadd"><select class="inp sm" id="cp_ltype" aria-label="Type"><option value="marketing">${esc(G.mkt)}</option><option value="sales">${esc(G.sls)}</option></select><input class="inp sm" id="cp_lname" list="cp_linelist" placeholder="${esc(G.linePh)}" aria-label="${esc(G.linePh)}"><datalist id="cp_linelist"></datalist><button type="button" class="btn small" data-cpaddline>${esc(G.addLine)}</button></span>` : '') + '</div></div>' +
        (showGrid ? (ed ? toolbarHTML('b') : '') + `<div id="cp_gridB" class="cp-grid"></div>` : '') +
        `<div class="cp-apline">${esc(G.apLine(R.pct(T.ap, 1), R.baht(T.mkt), R.baht(T.sls)))}</div></div>`);
      box.innerHTML = out.join('');
      fillLineList();
      if (!showGrid) return;
      const rows = [];
      ['marketing', 'sales'].forEach(t => { const ls = F.lines.filter(l => l.type === t); rows.push({ key: 'T|' + t, label: t === 'marketing' ? G.mkt : G.sls, level: 0 }); ls.forEach(l => rows.push({ key: `B|${t}|${l.line}`, label: l.line, level: 1, leaf: true })); });
      st.gB = U.grid($('cp_gridB'), { id: 'gB', rows, cols: monthCols(bmonths(c)), corner: G.lineCorner, aria: P.tabs.budget, readOnly: !ed, fmt: v => R.fmtNum(Math.round(v)),
        get: (rk, ck) => { const [, t, line] = rk.split('|'), m = F.bud.get(`${t}|${line}`); return m && m.has(ck) ? m.get(ck) : null; }, canEdit: () => true,
        onChange: list => { list.forEach(x => { const [, t, line] = x.r.split('|'), k = `${t}|${line}`; if (!F.bud.has(k)) F.bud.set(k, new Map()); if (x.v == null || x.v === 0) F.bud.get(k).delete(x.c); else F.bud.get(k).set(x.c, Math.round(x.v)); });
          F.dirty += list.length; dirtyNote(); const T2 = R.planTotals(serialize(F)), ap = el.querySelector('.cp-apline'); if (ap) ap.textContent = G.apLine(R.pct(T2.ap, 1), R.baht(T2.mkt), R.baht(T2.sls)); } });
    } else box.innerHTML = out.join('');
  }
  function fillLineList() { const t = $('cp_ltype'), dl = $('cp_linelist'); if (!t || !dl) return; dl.innerHTML = [...(knownLines()[t.value] || [])].sort().map(x => `<option value="${esc(x)}">`).join(''); }
  /* the budget of an approved Campaign by line (whole Campaign) + the bar */
  function budgetTrackHTML(c) {
    const s = U.seed(), span = R.monthsIn(R.monthFirst(R.addMonths(R.ym(c.start), -1)), c.end), td = U.today();
    const bt = R.budgetTrack(s, { from: R.monthFirst(span[0]), to: R.monthLast(span[span.length - 1]), statuses: R.STATUSES, includeCancelled: true, only: [c.id], today: td }), t = bt.rows[0], G = P.grid.tracked, K = C.track;
    if (!t) return '';
    const row = (x, label, cls) => `<tr class="${cls || ''}"><td>${label}</td><td class="num">${esc(R.baht(x.original))}</td><td class="num">${x.changes ? `<span class="${x.changes > 0 ? '' : 'neg'}">${esc((x.changes > 0 ? '+' : '') + R.baht(x.changes))}</span>` : none()}</td>` +
      `<td class="num"><b>${esc(R.baht(x.current))}</b></td><td class="num">${esc(R.baht(x.committed))}</td><td>${U.pctBar(x.used, '', x.used > 1 ? 'over' : 'ok', 44)}</td><td class="num${x.remaining < -0.5 ? ' neg' : ''}">${esc(R.baht(x.remaining))}</td><td class="num">${x.pending ? esc(R.signedShort(x.pending)) : none()}</td></tr>`;
    return `<div class="card"><div class="card-head"><h3>${labelInfo(K.block.title, K.block.tip)}</h3></div>` +
      `<div class="bblk"><div class="bbv"><b>${esc(R.baht(t.committed))}</b> <span class="muted">${esc(K.of(R.baht(t.current)))}</span></div>${U.budgetBar(Object.assign({}, t, { paid: t.paidV }))}<div class="muted small">${esc(U.budgetCap(t))}</div>${legendHTML()}</div>` +
      `<div class="tablewrap"><table class="tbl simple"><thead><tr><th>${esc(P.grid.lineCorner)}</th><th class="num">${esc(G.orig)}</th><th class="num">${esc(G.changes)}</th><th class="num">${esc(G.cur)}</th><th class="num">${esc(G.com)}</th><th>${esc(C.track.cols.used)}</th><th class="num">${esc(G.rem)}</th><th class="num">${esc(G.pend)}</th></tr></thead><tbody>` +
      t.lines.map(l => row(l, `<span class="muted small">${esc(l.type === 'marketing' ? P.grid.mkt : P.grid.sls)}</span> ${esc(l.line)}`)).join('') + row(t, `<b>${esc(C.common.total)}</b>`, 'total') + '</tbody></table></div></div>';
  }
  const legendHTML = () => `<div class="legend bbleg"><span><i class="sw paid"></i>${esc(C.track.legend.paid)}</span><span><i class="sw com"></i>${esc(C.track.legend.com)}</span>` +
    `<span><i class="sw rem"></i>${esc(C.track.legend.rem)}</span><span><i class="sw pend"></i>${esc(C.track.legend.pend)}</span><span><i class="sw tick"></i>${esc(C.track.legend.tick)}</span></div>`;

  /* ---------- Expenses · Requests · History ---------- */
  function renderExpenses(c, plan) {
    const box = $('cp_body'), can = R.canDo('expense.new', me(), plan).ok;
    box.innerHTML = `<div class="card"><div class="card-head"><h3>${esc(P.tabs.expenses)}</h3><div class="ctl">${can ? `<button type="button" class="btn primary small" data-cpnewexp>${ICON.plus}<span>${esc(P.btn.newExpense)}</span></button>` : ''}</div></div><div id="cp_exp"></div></div>`;
    CP.expenses.table($('cp_exp'), { cid: c.id });
  }
  function renderRequests(c, plan) {
    const box = $('cp_body'), Q = C.req, list = ((plan && plan.requests) || []).slice().reverse(), a = me();
    const canNew = !!plan && R.canDo('request', a, plan, { live: live(c) }).ok;
    const rows = list.map(q => { const dec = R.canDo('request.decide', a, plan, { req: q }), wd = R.canDo('request.withdraw', a, plan, { req: q }), edt = R.canDo('request.edit', a, plan, { req: q });
      return `<tr><td>#${q.no}</td><td>${esc(Q.type[q.type] || q.type)}</td><td class="wrap">${esc(q.reason)}${q.comment ? `<div class="muted small">${esc(q.comment)}</div>` : ''}</td><td class="wrap small">${q.lines.map(l => esc(`${l.line} ${R.monthName(l.month)} ${R.signedShort(+l.amount)}`)).join('<br>')}</td>` +
        `<td class="num"><b class="${R.sumLines(q.lines) < 0 ? 'neg' : ''}">${esc(R.signedShort(R.sumLines(q.lines)))}</b></td><td>${esc(q.by)}<div class="muted small">${esc(R.dmy(String(q.at).slice(0, 10)))}</div></td><td>${U.apChip(q.status === 'pending' ? 'pending' : q.status)}</td>` +
        `<td class="small">${q.decided_by ? esc(`${q.decided_by} · ${R.dmy(String(q.decided_at).slice(0, 10))}`) : ''}</td><td class="nowrap">${dec.ok ? `<button type="button" class="btn small primary" data-reqrev="${q.no}">${esc(Q.review)}</button>` : dec.why ? `<button type="button" class="btn small" disabled title="${esc(dec.why)}">${esc(Q.review)}</button>` : ''}` +
        `${edt.ok ? `<button type="button" class="btn small" data-reqedit="${q.no}">${esc(Q.edit)}</button>` : ''}${wd.ok ? `<button type="button" class="btn small ghost" data-reqwd="${q.no}">${esc(Q.withdraw)}</button>` : ''}</td></tr>`; }).join('');
    box.innerHTML = `<div class="card"><div class="card-head"><h3>${esc(P.tabs.requests)}</h3><div class="ctl">${canNew ? `<button type="button" class="btn primary small" data-cpact="request">${esc(P.btn.request)}</button>` : ''}</div></div>` +
      (list.length ? `<div class="tablewrap"><table class="tbl simple reqtbl"><thead><tr><th>${esc(Q.cols.no)}</th><th>${esc(Q.cols.type)}</th><th>${esc(Q.cols.reason)}</th><th>${esc(Q.cols.lines)}</th><th class="num">${esc(Q.cols.amount)}</th><th>${esc(Q.cols.by)}</th><th>${esc(Q.cols.status)}</th><th>${esc(Q.cols.decided)}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="c3-empty">${esc(Q.none)}</div>`) + '</div>';
  }
  function renderHistory(c, plan) {
    const box = $('cp_body'), H = P.history, log = ((plan && plan.log) || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at))), vs = ((plan && plan.versions) || []).filter(v => v.status !== 'draft' || v === R.working(plan));
    let cmp = '';
    if (vs.length > 1) {
      if (!st.cmp) st.cmp = [vs[vs.length - 2].v, vs[vs.length - 1].v];
      const va = vs.find(v => v.v === st.cmp[0]) || vs[0], vb = vs.find(v => v.v === st.cmp[1]) || vs[vs.length - 1], d = R.planDiff(va, vb), sel = (i, cur) => `<select class="inp sm" data-cpcmp="${i}">${vs.map(v => `<option value="${v.v}"${v.v === cur ? ' selected' : ''}>v${v.v} · ${esc(A.state[v.status])}</option>`).join('')}</select>`;
      cmp = `<div class="card"><div class="card-head"><h3>${esc(H.compare)}</h3><div class="ctl">${sel(0, va.v)}<span>↔</span>${sel(1, vb.v)}</div></div>` + diffHTML(d, va.v, vb.v) + '</div>';
    }
    box.innerHTML = cmp + `<div class="card"><div class="card-head"><h3>${esc(P.tabs.history)}</h3></div>` + (log.length ? `<ul class="hist">${log.map(x => `<li><span class="hw">${esc(A.log[x.action] || x.action)}</span><span class="muted"> · ${esc(x.by || '—')} · ${esc(R.dmy(String(x.at).slice(0, 10)))} ${esc(String(x.at).slice(11, 16))}</span>${x.detail ? `<div class="hd">${esc(x.detail)}</div>` : ''}</li>`).join('')}</ul>` : `<div class="c3-empty">${esc(H.none)}</div>`) + '</div>';
  }
  /* v a ↔ v b: totals · SKUs · lines (also in the review) */
  function diffHTML(d, a, b) {
    const H = P.history, T = d.totals, dv = (x, y, f) => { const z = y - x; return `<span class="${Math.abs(z) < 0.5 ? 'muted' : z > 0 ? 'good' : 'bad'}">${Math.abs(z) < 0.5 ? '—' : (z > 0 ? '+' : '') + f(z)}</span>`; };
    const tot = `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.totals)}</th><th class="num">v${a}</th><th class="num">v${b}</th><th class="num">${esc(H.diff)}</th></tr></thead><tbody>` +
      [[P.sum.target, T.target, R.baht], [P.sum.budget, T.budget, R.baht], [P.sum.profit, T.profit, R.baht]].map(([l, v, f]) => `<tr><td>${esc(l)}</td><td class="num">${esc(f(v[0]))}</td><td class="num">${esc(f(v[1]))}</td><td class="num">${dv(v[0], v[1], f)}</td></tr>`).join('') +
      `<tr><td>${esc(P.sum.ap)}</td><td class="num">${esc(R.pct(T.ap[0], 1))}</td><td class="num">${esc(R.pct(T.ap[1], 1))}</td><td></td></tr></tbody></table>`;
    const sk = d.skus.length ? `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.sku)}</th><th class="num">${esc(H.qty)} v${a}</th><th class="num">${esc(H.qty)} v${b}</th><th class="num">฿ ${esc(H.diff)}</th></tr></thead><tbody>${d.skus.map(r => `<tr><td>${esc(r.name)} <span class="muted small">${esc(r.code)}</span></td><td class="num">${esc(R.fmtNum(r.qtyA))}</td><td class="num">${esc(R.fmtNum(r.qtyB))}</td><td class="num">${dv(r.amtA, r.amtB, R.baht)}</td></tr>`).join('')}</tbody></table>` : '';
    const ln = d.lines.length ? `<table class="tbl simple dtbl"><thead><tr><th>${esc(H.line)}</th><th class="num">v${a}</th><th class="num">v${b}</th><th class="num">${esc(H.diff)}</th></tr></thead><tbody>${d.lines.map(r => `<tr><td>${esc(r.line)}</td><td class="num">${esc(R.baht(r.a))}</td><td class="num">${esc(R.baht(r.b))}</td><td class="num">${dv(r.a, r.b, R.baht)}</td></tr>`).join('')}</tbody></table>` : '';
    return `<div class="diffw">${tot}${sk}${ln}${!sk && !ln ? `<div class="muted small">${esc(H.same)}</div>` : ''}</div>`;
  }

  /* ===================== actions ===================== */
  async function save(id, step, okMsg, o) {
    try { const p = await CP.store.savePlan(id, step, Object.assign({ rev: st.F && st.F.id === id && CP.store.data().plans[id] ? st.F.rev : undefined }, o || {})); if (okMsg) U.toast(okMsg); return p; }
    catch (e) { U.toast(e.code === 'conflict' ? A.toast.conflict : A.toast.failed); if (e.code === 'conflict') { st.F = null; CP.app.refresh(); } return null; }
  }
  async function doSave(andSubmit) {
    const c = campOf(st.id), F = st.F, a = me(), v = serialize(F);
    /* Submit only when every check of §5.1 passes (the button is off too — this is the guard) */
    if (andSubmit && !R.planChecks(v, c).ok) { U.toast(P.sum.checks); if (st.tab !== 'summary') location.hash = `#campaigns/${st.id}/summary`; return; }
    const p = await save(st.id, x => { let y = R.planAct(x, { type: 'save', by: a.name, at: at(), skus: v.skus, target: v.target, budget: v.budget }); if (andSubmit) y = R.planAct(y, { type: 'submit', by: a.name, at: at() }); return y; },
      andSubmit ? A.toast.submitted(c.name) : A.toast.saved);
    if (p) { st.F = draftOf(st.id); CP.app.refresh(); }
  }
  async function onClick(e) {
    const t = e.target, c = campOf(st.id); if (!c) return;
    const tb = t.closest('[data-cptab]'); if (tb) { e.preventDefault(); if (tb.dataset.cptab !== st.tab) location.hash = `#campaigns/${st.id}/${tb.dataset.cptab}`; return; }
    const plan = planOf(st.id), a = me(), ac = t.closest('[data-cpact]');
    if (ac) {
      const w = ac.dataset.cpact;
      if (w === 'save') return doSave(false);
      if (w === 'submit') return doSave(true);
      if (w === 'review') return CP.review.open({ kind: 'plan', id: st.id });
      if (w === 'withdraw') { const p = await save(st.id, x => R.planAct(x, { type: 'withdraw', by: a.name, at: at() }), A.toast.withdrawn(c.name)); if (p) { st.F = draftOf(st.id); CP.app.refresh(); } return; }
      if (w === 'request') return CP.reqdraw.open(st.id);
      if (w === 'duplicate') return CP.screens.campaigns.duplicate(st.id);
    }
    if (t.closest('[data-cpmore]')) return CP.screens.campaigns.menuFor(t.closest('[data-cpmore]'), st.id, true);
    const md = t.closest('.seg[data-cpmode] button'); if (md) { st.mode = md.dataset.v === 'baht' ? 'baht' : 'qty'; renderTarget(c, plan); return; }
    const gt = t.closest('[data-gtool]'); if (gt) { const g = gt.dataset.g === 't' ? st.gT : st.gB; if (g) { g[gt.dataset.gtool](); g.focus(); } return; }
    if (t.closest('[data-cpaddsku]')) return addSku(c, plan);
    if (t.closest('[data-cpnewprod]')) return CP.products.openForm(null, { onSaved: p => { renderTarget(c, plan); const j = $('cp_skuq'); if (j) { j.value = p.code; j.focus(); } } });
    const up = t.closest('[data-skupd]'); if (up) { const s = st.F.skus[+up.dataset.skupd], m = master().get(s && s.code); if (s && m) { s.cogs = +m.cogs; st.F.dirty++; renderTarget(c, plan); U.toast(P.grid.driftDone(s.code, R.fmtNum(+m.cogs, 2))); } return; }
    const sd = t.closest('[data-skdel]'); if (sd) { const s = st.F.skus[+sd.dataset.skdel]; st.F.skus.splice(+sd.dataset.skdel, 1); [...st.F.q.keys()].forEach(k => { if (k.startsWith(s.code + '|')) st.F.q.delete(k); }); st.F.subs.delete(s.code); st.F.dirty++; renderTarget(c, plan); return; }
    if (t.closest('[data-cpaddsub]')) { const code = $('cp_subsku').value, ch = $('cp_subch').value, sub = $('cp_subname').value.trim(); if (!code || !sub) return; if (!st.F.subs.has(code)) st.F.subs.set(code, new Set()); st.F.subs.get(code).add(`${ch}|${sub}`); st.folded.delete(code); st.F.dirty++; renderTarget(c, plan); return; }
    if (t.closest('[data-cpaddline]')) { const ty = $('cp_ltype').value, nm = $('cp_lname').value.trim(); if (!nm) return; if (!st.F.lines.some(l => l.type === ty && l.line === nm)) { st.F.lines.push({ type: ty, line: nm }); st.F.bud.set(`${ty}|${nm}`, new Map()); st.F.dirty++; } renderBudget(c, plan); return; }
    if (t.closest('[data-cpmonths]')) { st.showMonths = !st.showMonths; renderBudget(c, plan); return; }
    if (t.closest('[data-cpnewexp]')) return CP.expenses.openForm({ cid: st.id });
    const rr = t.closest('[data-reqrev]'); if (rr) return CP.review.open({ kind: 'request', id: st.id, no: +rr.dataset.reqrev });
    const re = t.closest('[data-reqedit]'); if (re) return CP.reqdraw.open(st.id, { no: +re.dataset.reqedit });
    const rw = t.closest('[data-reqwd]'); if (rw) { const no = +rw.dataset.reqwd; const p = await save(st.id, x => R.planAct(x, { type: 'req.withdraw', no, by: a.name, at: at() }), C.req.toast.withdrawn(no)); if (p) CP.app.refresh(); }
  }
  function onInput(e) {
    const t = e.target, tr = t.closest('tr[data-si]'); if (!tr || !st.F) return;
    const s = st.F.skus[+tr.dataset.si]; if (!s) return;
    if (!t.dataset.sp) return; s.price = s.price || {}; s.price[t.dataset.sp] = t.value.trim();
    st.F.dirty++; dirtyNote();
  }
  function onChange(e) {
    const t = e.target;
    if (t.id === 'cp_subch') fillSubList();
    if (t.id === 'cp_ltype') fillLineList();
    if (t.matches('[data-cpcmp]')) { st.cmp[+t.dataset.cpcmp] = +t.value; renderHistory(campOf(st.id), planOf(st.id)); }
  }
  /* §7.3 — only a product of the Product Master (a code, or its exact name / nickname) · not Discontinued · the snapshot: its COGS and net prices */
  function addSku(c, plan) {
    const q = $('cp_skuq').value.trim(); if (!q) return;
    const M = [...master().values()], f = R.foldText(q), key = q.split(/\s·\s/)[0].trim().toLowerCase();
    const m = M.find(p => p.code.toLowerCase() === key) || M.find(p => R.foldText(p.name) === f || R.foldText(p.nickname) === f);
    if (!m || m.status === 'discontinued') { U.toast(m ? P.grid.discontinued(m.code) : P.grid.pickMaster); return; }
    if (st.F.skus.some(s => s.code === m.code)) { $('cp_skuq').value = ''; return; }
    st.F.skus.push(R.skuFromMaster(m));
    st.F.dirty++; renderTarget(c, plan); const i = $('cp_skuq'); if (i) i.focus();
  }

  /* ---------- leaving with changes (the hash changes) ---------- */
  async function confirmLeave() { if (!isDirty()) return true; const G = P.grid; const ok = await U.confirmDialog(G.leaveQ, G.leaveBody, G.leave, true, G.stay); if (ok) st.F = null; return ok; }
  window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('click', e => { if (el && el.contains(e.target) && el.offsetParent) onClick(e); });
  document.addEventListener('input', e => { if (el && el.contains(e.target) && el.offsetParent) onInput(e); });
  document.addEventListener('change', e => { if (el && el.contains(e.target) && el.offsetParent) onChange(e); });
  return { render, isDirty, confirmLeave, current: () => st.id, reset: () => { st.F = null; }, diffHTML, planTiles, legendHTML, budgetTrackHTML, grids: () => ({ t: st.gT, b: st.gB }), draft: () => st.F, serialize };
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
        [...T.byLine].sort((x, y) => y[1].amount - x[1].amount).map(([k, o]) => { const [t, l] = k.split('|'); return `<tr><td><span class="muted small">${esc(t === 'marketing' ? P.grid.mkt : P.grid.sls)}</span> ${esc(l)}</td><td class="num">${esc(R.baht(o.amount))}</td><td class="num">${esc(R.pct(R.ratio(o.amount, T.budget), 1))}</td></tr>`; }).join('') + '</tbody></table></div>';
      out.push(sec(A.rv.plan, CP.cpage.planTiles(T)), sec(A.rv.target, tg));
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
      `<div class="rv-btns"><button type="button" class="btn danger" data-rvdo="reject">${esc(A.rv.reject)}</button><button type="button" class="btn" data-rvdo="return">${esc(A.rv.ret)}</button><button type="button" class="btn primary" data-rvdo="approve" disabled>${esc(A.rv.approve)}</button></div>`
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
    if ((what === 'return' || what === 'reject') && comment.length < 5) { if (e) e.textContent = A.rv.short; if (ta) ta.focus(); return; }
    if (what === 'reject' && !(await U.confirmDialog(A.rv.rejectQ(it.c.name), it.req ? A.rv.rejectReqBody : A.rv.rejectBody, A.rv.reject, true, C.common.cancel))) return;
    const before = R.clonePlan(it.plan), step = it.req ? { approve: 'req.approve', return: 'req.return', reject: 'req.reject', withdraw: 'req.withdraw' }[what] : what;
    let p = null;
    try { p = await CP.store.savePlan(it.c.id, x => R.planAct(x, { type: step, no: it.req ? it.req.no : undefined, by: a.name, at: R.nowLocal(), comment }), { rev: it.plan.rev || 0 }); }
    catch (x) { U.toast(x.code === 'conflict' ? A.toast.conflict : A.toast.failed); CP.app.refresh(); draw(); return; }
    const nm = it.req ? `#${it.req.no} · ${it.c.name}` : it.c.name, msg = { approve: A.toast.approved(nm), return: A.toast.returned(nm), reject: A.toast.rejected(nm), withdraw: A.toast.withdrawn(nm) }[what];
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
    const L = CP.mock.lines(); L.marketing.forEach(l => { if (!set.has('marketing|' + l)) set.set('marketing|' + l, null); }); L.sales.forEach(l => { if (!set.has('sales|' + l)) set.set('sales|' + l, null); });
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
    const row = (l, i) => `<div class="rqrow" data-i="${i}"><select class="inp" data-rk aria-label="${esc(Q.line)}"><option value="">${esc(Q.line)}</option>${opts.map(k => `<option value="${esc(k)}"${k === l.key ? ' selected' : ''}>${esc(k.split('|')[1])} · ${esc(k.startsWith('marketing') ? C.plan.grid.mkt : C.plan.grid.sls)}</option>`).join('')}</select>` +
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
