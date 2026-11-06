/* screen-monitor.js — WORK › Campaign Monitor (CR-07 §5 · CR-09 §4): one approved Campaign, to dig in and follow — clean as the Dashboard, deeper than it.
   #monitor/<id>[/summary|sales|budget|pnl|history] → CP.screens.monitor · from the Dashboard (every row · Watch lists) · Campaign Planning (an approved plan) · Ctrl+K.
   Toolbar: Year · Campaign (a search · by status · its issue chip) · ‹ › (urgent → watch → the rest) · Export (the Channel moved into Sales — D81) · the head: name ·
   status · the issue chips (R.issues) · Owner · period · days left · End marketing · the Time gone bar (the only place it is written — M1) · Request budget · View plan.
   Summary (D79): KPI Net revenue · Budget used · Campaign profit · Forecast end (the anatomy of CR-08 §2.3) · Burn-up (End marketing · the forecast ends) | What to do.
   Sales (D80 — the Pace at every level · D82 · D83): Channel · ฿ | Qty · Target vs Actual by month (Total | By channel) · Sales mix by channel | Channel attainment ·
   SKU × Channel · Sub-channel share | SKU contribution (Pareto). Budget: the bar · Budget by line (Marketing ▸ Sales ▸ Other — M6) · Budget vs Actual by month |
   Spend by group · the requests. P&L (D84): waterfall | statement · Sales vs Marketing by month. History: the log (an icon a kind · Compare v1 ↔ v2). */
CP.screens = CP.screens || {};
CP.screens.monitor = (function () {
  'use strict';
  const U = CP.ui, X = CP.export, P = CP.dash;
  const { C, R, $, esc, pref, ICON, labelInfo, none, statusChip, segHTML } = U;
  const K = C.camp, D = C.dash, M0 = C.mon, TABS = ['summary', 'sales', 'budget', 'pnl', 'history'], TAB = 'monitor';
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);
  const CHS = ['all'].concat(R.CHANNELS), CH_TOKEN = { MT: '--ch-mt', TT: '--ch-tt', ECOM: '--ch-ecom' };
  const saved = pref.json('mon', {}) || {};
  const st = Object.assign({ cid: '', tab: 'summary', year: null, channel: 'all', unit: 'amount', mode: 'monthly', mView: 'chart', mBy: 'total', chFolded: R.CHANNELS.slice(), chView: 'list',
    mxSeg: 'actual', mxSort: 'actual', mxTab: 'all', mxView: 'list', bgOpen: [], stOpen: [], sl: { type: 'marketing', view: 'chart' }, side: 'actual', bva: 'monthly' }, saved);
  st.mxTab = oneOf(st.mxTab === 'on_target' ? 'on_track' : st.mxTab, ['all', 'behind', 'at_risk', 'on_track'], 'all');
  st.mxSort = oneOf(st.mxSort, ['actual', 'gap', 'ach', 'name'], 'actual'); st.mxSeg = oneOf(st.mxSeg, ['actual', 'ach', 'share'], 'actual'); st.mBy = oneOf(st.mBy, ['total', 'channel'], 'total');
  const save = () => pref.setJson('mon', st);
  const td = () => U.today();
  const camps = () => U.seed().campaigns || [];
  const byId = id => camps().find(c => c.id === id);
  const yearOf = c => c.year || +c.start.slice(0, 4);
  const plans = () => (U.seed().plans || {});
  const ch = () => (st.channel === 'all' ? null : st.channel);
  /* the Campaign's own months: Start … End and every month it has a number in (the month before Start too) */
  function spanOf(c) { const ms = [...(R.model(U.seed()).cells.get(c.id) || new Map()).keys()].concat([R.ym(c.start), R.ym(c.end)]).sort(); return [R.monthFirst(ms[0]), R.monthLast(ms[ms.length - 1])]; }
  const pnlCtx = c => { const [from, to] = spanOf(c); return { seed: U.seed(), from, to, statuses: R.STATUSES.slice(), includeCancelled: true, today: td(), ids: c.id, only: [c.id], stOpen: st.stOpen, sl: st.sl, side: st.side, scopeText: c.name, cols: M0.stCols }; };
  const ctx = () => { const c = byId(st.cid); return Object.assign(c ? pnlCtx(c) : { seed: U.seed() }, { today: td(), cid: st.cid, channel: ch(), unit: st.unit, mode: st.mode, skuSort: 'gap', skuTab: 'all', m: { measure: 'spend', mode: st.bva } }); };
  const isQty = () => st.unit === 'qty';
  const val = v => (v == null ? C.common.none : isQty() ? `${R.fmtNum(Math.round(v))}` : R.baht(v));
  const short = v => (v == null ? C.common.none : isQty() ? U.shortNum(v) : R.shortBaht(v));
  const noSales = c => !R.salesMonths(R.model(U.seed()), c.id).length;
  const notStarted = c => R.statusOf(c, td()) === 'not_started';
  const fold = c => noSales(c) && !notStarted(c) && !P.showTarget.has(TAB);
  /* every Campaign, every year — the issues of the one rule (R.issues) */
  const allScope = () => ({ from: '2000-01-01', to: '2099-12-31', statuses: R.STATUSES.slice(), includeCancelled: true, today: td() });
  const issuesAll = () => R.issues(U.seed(), allScope());
  /* ‹ › — urgent → watch → the rest (by Start) */
  function order() { const iss = issuesAll(), first = iss.rows.map(r => r.id); return first.concat(camps().filter(c => !first.includes(c.id) && R.statusOf(c, td()) !== R.CANCELLED).sort((a, b) => a.start.localeCompare(b.start)).map(c => c.id)); }
  function firstId() { const o = order(); return o[0] || (camps()[0] || {}).id || ''; }
  const stCls = s => (s === 'behind' ? 'behind' : s === 'at_risk' ? 'at_risk' : s === 'on_track' ? 'on_target' : '');
  const paceWord = s => (s ? C.yr.st[s] : C.yr.pace.early);

  let el = null, stick = { toTop() {} };
  function render(sub) {
    el = $('tab-monitor');
    if (!el.dataset.built) build();
    const [id, tab] = String(sub || '').split('/'), c = (id && byId(decodeURIComponent(id))) || byId(st.cid) || byId(firstId()) || null;
    const tab9 = tab === 'expenses' ? 'budget' : tab;   /* CR-10 D92 — the Expenses tab (its route stays budget) */
    st.cid = c ? c.id : ''; st.year = c ? yearOf(c) : st.year || +td().slice(0, 4); st.tab = TABS.includes(tab9) ? tab9 : TABS.includes(st.tab) && !id ? st.tab : 'summary'; save();
    const want = st.cid ? `#monitor/${st.cid}/${st.tab}` : '#monitor';
    if (location.hash !== want) history.replaceState(null, '', want);
    renderAll();
  }
  function build() {
    el.innerHTML = `<div class="pbanner"><h1>${esc(M0.title)}</h1></div><div class="toolbar sticktools" id="m_tools"></div><div class="card mhead" id="m_head"></div>
      <div class="ptabs" role="tablist" id="m_tabs"></div><div id="m_body"></div>`;
    /* CR-10 D98 — the tabs (+ Year · Campaign · ‹ › · Export from 1280 px) stay under the top bar */
    stick = U.stickyTabs(el, $('m_tabs'));
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-mtab]')) { e.preventDefault(); e.target.click(); } });
    let rt = null;
    const redraw = () => { clearTimeout(rt); rt = setTimeout(() => { if (!el.offsetParent) return; if (st.tab === 'summary') drawBurn(); if (st.tab === 'sales') { renderMonth(); renderMix(); } if (st.tab === 'pnl') { renderWf(); renderSvm(); } if (st.tab === 'budget') { renderBva(); renderGrp(); } }, 120); };
    window.addEventListener('resize', redraw); document.addEventListener('cp:contentresize', redraw);
    document.addEventListener('keydown', e => { if (!el.offsetParent || document.activeElement !== document.body || document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); } });
    el.dataset.built = '1';
  }
  function renderAll() {
    renderTools(); renderHead();
    $('m_tabs').innerHTML = TABS.map(t => `<a role="tab" href="#monitor/${esc(st.cid)}/${t}" data-mtab="${t}" class="${t === st.tab ? 'on' : ''}" aria-selected="${t === st.tab}">${esc(M0.tabs[t])}</a>`).join('');
    const c = byId(st.cid), body = $('m_body');
    if (!c) { body.innerHTML = `<div class="card"><div class="c3-empty">${esc(M0.none)}</div></div>`; return; }
    ({ summary: renderSummary, sales: renderSales, budget: renderBudget, pnl: renderPnl, history: renderHistory })[st.tab](c);
    document.title = `${c.name} · ${M0.title} · ${C.app.title}`;
  }
  function go(id, tab) { location.hash = `#monitor/${id}/${tab || st.tab}`; }
  function step(n) { const ids = order(), i = ids.indexOf(st.cid); if (!ids.length) return; go(ids[(i + n + ids.length) % ids.length]); }

  /* ---------- toolbar · the head (CR-09 §4.1 — no Channel here · Time gone only in the head) ---------- */
  function renderTools() {
    const years = [...new Set(camps().map(yearOf))].sort(), list = camps().filter(c => yearOf(c) === st.year), c = byId(st.cid), iss = issuesAll().byId;
    const rank = x => { const r = iss.get(x.id); return r && r.severity === 'urgent' ? 0 : r && r.severity === 'watch' ? 1 : 2; };
    const sorted = list.slice().sort((a, b) => rank(a) - rank(b) || a.start.localeCompare(b.start)), GL = M0.groups;
    const opts = sorted.map((x, i) => { const g = GL[rank(x)], r = iss.get(x.id); return { value: x.id, label: x.name, sub: `${R.dm(x.start)} – ${R.dm(x.end)}`, chip: statusChip(R.statusOf(x, td())) + (r && r.severity ? U.issueChip(r.chips[0].key) : ''),
      inGroup: g, group: i === 0 || rank(sorted[i - 1]) !== rank(x) ? g : '' }; });
    $('m_tools').innerHTML = `<label class="ms"><select class="ms-trigger sel yr" data-myear aria-label="${esc(K.year)}">${years.map(y => `<option value="${y}"${y === st.year ? ' selected' : ''}>${y}</option>`).join('')}</select></label>` +
      (list.length ? U.singleSelect({ id: 'm_camp', options: opts, value: st.cid, label: c ? c.name : K.campaign, labelHTML: c ? `<span class="cs-l">${esc(c.name)}</span>${statusChip(R.statusOf(c, td()))}` : esc(K.campaign), aria: K.campaign, placeholder: K.campaignPh,
        onChange: v => go(v) }) : `<span class="muted">${esc(K.none)}</span>`) +
      `<span class="navbtns"><button type="button" class="icon-btn" data-step="-1" title="${esc(K.prev)} (←)" aria-label="${esc(K.prev)}">${ICON.prev}</button><button type="button" class="icon-btn" data-step="1" title="${esc(K.next)} (→)" aria-label="${esc(K.next)}">${ICON.next}</button></span>` +
      `<button type="button" class="btn exp" data-export title="${esc(D.exportTip)}">${ICON.download}<span>${esc(D.exportBtn)}</span></button>`;
  }
  const canRequest = c => { const plan = plans()[c.id]; return !!plan && R.canDo('request', CP.actor.get(), plan, { live: R.statusOf(c, td()) === 'ongoing' || R.statusOf(c, td()) === 'not_started' }).ok; };
  function renderHead() {
    const c = byId(st.cid), box = $('m_head'); if (!c) { box.innerHTML = ''; return; }
    const tp = R.timeProgress(c, td()), dl = R.daysLeft(c, td()), r = issuesAll().byId.get(c.id);
    box.innerHTML = `<div class="mh-l"><div class="mh-n"><b>${esc(c.name)}</b>${statusChip(R.statusOf(c, td()))}${r ? r.chips.map(x => U.issueChip(x.key)).join('') : ''}</div>` +
      `<div class="mh-m">${[c.owner ? C.plan.owner(c.owner) : '', `${R.dmy(c.start)} – ${R.dmy(c.end)}`, X.daysText(dl), c.end_marketing ? K.endMkt(R.dmy(c.end_marketing)) : ''].filter(Boolean).map(esc).join('<span class="sep">·</span>')}</div>` +
      `<div class="mh-t" data-timegone><span class="muted small">${esc(C.yr.timeGone)}</span>${U.paceBar(tp.pct || 0, null, 'time', 220)}</div></div>` +
      `<div class="mh-r">${canRequest(c) ? `<button type="button" class="btn" data-mreq>${esc(C.plan.btn.request)}</button>` : ''}<a class="btn ghost" href="#planning/${esc(c.id)}/review">${esc(M0.viewPlan)}</a></div>`;
  }

  /* ---------- Summary (CR-09 §4.2) ---------- */
  function renderSummary(c) {
    $('m_body').innerHTML = `<div class="kpis" id="m_kpis"></div><div class="r21"><div class="card" id="m_burn"></div><div class="card" id="m_todo"></div></div>`;
    renderSumKpis(c); drawBurn(); renderTodo(c);
  }
  /* the numbers of a Campaign (its own months): actual · plan (full) · forecast end · the Pace · the budget of the whole Campaign (R.issues) */
  function nums(c) {
    const seed = U.seed(), f = R.pnlForecast(seed, pnlCtx(c), c.id), row = f.rows[0] || { actual: {}, plan: {}, forecast: {} }, sp = R.campaignPace(seed, c.id, td()), r = issuesAll().byId.get(c.id);
    return { A: row.actual, Pl: row.plan, F: row.forecast, sp, b: r && r.budget ? r.budget : null, tg: sp ? sp.timeGone : null };
  }
  function renderSumKpis(c) {
    const { A, Pl, F, sp, b, tg } = nums(c), Kk = M0.k9, kc = U.kpiCard, bs = U.barSeg, ended = td() > c.end;
    const ach = R.ratio(A.rev, Pl.rev), cls = stCls(sp && sp.status) || 'on_target', left = (Pl.rev || 0) - (A.rev || 0);
    const rev = kc({ key: 'revenue', label: labelInfo(Kk.revenue, Kk.revTip), value: A.rev == null ? C.common.none : R.baht(A.rev), none: A.rev == null, suffix: Kk.ofTarget(R.shortBaht(Pl.rev)),
      bar: bs(Math.min(1, ach || 0) * 100, cls), tg, barTip: C.sb.pace.barTip(R.pct(ach), R.pct(tg), sp && sp.pace != null && sp.status ? R.paceText(sp.pace) : ''),
      cap: A.rev == null ? esc(D.k.noSales) : `<b class="attx ${cls}">${esc(R.pct(ach))}</b> · ${esc(left < -0.5 ? Kk.above(R.shortBaht(-left)) : (ended ? Kk.short : Kk.toGo)(R.shortBaht(left)))} · <b class="attx ${cls}">${esc(paceWord(sp && sp.status))}</b>` });
    const used = b ? b.used : null, over = b && b.remaining < -0.5;
    const bud = kc({ key: 'budget', label: labelInfo(Kk.budget, Kk.budgetTip), value: b ? R.baht(b.spent) : C.common.none, none: !b, suffix: b ? Kk.ofBudget(R.shortBaht(b.current)) : '',
      bar: b ? bs(Math.min(1, used || 0) * 100, used > 1 ? 'over' : 'ok') : '', tg, barTip: b ? Kk.usedTip(R.pct(used), R.pct(tg)) : '',
      cap: b ? `<b class="${over ? 'bad' : ''}">${esc(Kk.used(R.pct(used)))}</b> · ${over ? `<b class="bad">${esc(Kk.over(R.shortBaht(-b.remaining)))}</b>` : esc(Kk.left(R.shortBaht(b.remaining)))}` : esc(C.track.noBudget('')) });
    const of = R.ratio(A.profit, Pl.profit);
    const pro = kc({ key: 'profit', label: labelInfo(Kk.profit, C.money.profit), value: A.profit == null ? C.common.none : R.baht(A.profit), none: A.profit == null, neg: A.profit < 0, suffix: Kk.ofPlan(R.shortBaht(Pl.profit)),
      bar: bs(Math.min(1, Math.abs(of || 0)) * 100, A.profit < 0 ? 'neg' : 'ok'), barTip: Kk.profitTip(R.pct(of)), cap: esc(Kk.profitCap(R.pct(A.margin), R.times(A.roi))) });
    const fr = R.ratio(F.rev, Pl.rev), fst = R.attStatus(fr) || 'on_target';
    const fc = kc({ key: 'forecast', label: labelInfo(Kk.fc, Kk.fcTip), value: F.rev == null ? C.common.none : R.baht(F.rev), none: F.rev == null, suffix: Kk.ofTarget(R.shortBaht(Pl.rev)),
      bar: bs(Math.min(1, fr || 0) * 100, fst), barTip: R.pct(fr, 1), capTip: Kk.fcCapTip(R.baht(F.profit), R.baht(Pl.profit)), cap: F.rev == null ? esc(C.empty.card) : `<b class="attx ${fst}">${esc(R.pct(fr))}</b> · ${esc(Kk.fcCap(R.shortBaht(F.profit), R.shortBaht(Pl.profit)))}` });
    $('m_kpis').innerHTML = rev + bud + pro + fc;
  }
  /* the Burn-up: Ach % (actual ÷ Full target, running) · Used % (spent ÷ current budget, running) · Time gone (the diagonal) — over Start … End ·
     CR-09 M10: the month + the year under the first month · the End marketing line · the forecast ends (Ach → Forecast end % · Used → the spend pace) */
  function burnData(c) {
    const M = R.model(U.seed()), cm = M.cells.get(c.id) || new Map(), sp = R.campaignPace(U.seed(), c.id, td()), r = issuesAll().byId.get(c.id), cur = r && r.budget ? r.budget.current : null;
    const months = R.monthsIn(c.start, c.end), stop = td() < c.end ? td() : c.end, pts = { ach: [], used: [] };
    let a = 0, s = 0;
    const spentOf = m => { const x = cm.get(m); return x ? (x.mkt[1] || 0) + (x.sls[1] || 0) + (x.oth[1] || 0) : 0; };
    /* the spend of the month before Start counts at Start */
    const before = R.addMonths(R.ym(c.start), -1); s += spentOf(before);
    months.forEach(m => { if (R.monthFirst(m) > stop) return; const x = cm.get(m); a += x && x.rev[1] != null ? x.rev[1] : 0; s += spentOf(m);
      const d = R.monthLast(m) < stop ? R.monthLast(m) : stop; pts.ach.push({ d, v: sp.target ? a / sp.target : null }); pts.used.push({ d, v: cur ? s / cur : null }); });
    const { F, Pl } = nums(c), spp = R.spendPace(U.seed(), c.id, td());
    const fc = td() < c.end ? { ach: R.ratio(F.rev, Pl.rev), used: cur ? spp.end / cur : null } : null;
    return { c, pts, sp, cur, stop, fc };
  }
  function drawBurn() {
    const box = $('m_burn'), c = byId(st.cid); if (!box || !c) return;
    const B = M0.burn, B2 = M0.burn2, d = burnData(c), css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(B.title, B2.tip)}</h3><div class="ctl"><div class="legend"><span><i class="ln" style="--sw:var(--rev)"></i>${esc(B.ach)}</span><span><i class="ln" style="--sw:var(--mkt)"></i>${esc(B.used)}</span><span><i class="ln dash" style="--sw:var(--text-2)"></i>${esc(C.yr.timeGone)}</span>` +
      (c.end_marketing ? `<span><i class="ln dash" style="--sw:var(--text)"></i>${esc(B2.endMkt)}</span>` : '') + (d.fc ? `<span><i class="ln dash" style="--sw:var(--muted)"></i>${esc(B2.fc)}</span>` : '') + `</div></div></div>` +
      `<div class="chartbox burn" id="m_bbox"><svg id="m_bsvg" role="img" aria-label="${esc(B.title)}"></svg></div>`;
    const svg = $('m_bsvg'), W = Math.max(300, Math.round($('m_bbox').clientWidth || 800)), H = 268;
    const ends = [d.pts.ach, d.pts.used].map(p => (p.length ? p[p.length - 1].v : null)).concat(d.fc ? [d.fc.ach, d.fc.used] : []).filter(R.isNum);
    const yMax = Math.max(1, Math.ceil(Math.max(1, ...d.pts.ach.concat(d.pts.used).map(p => p.v).filter(R.isNum), ...ends) * 4 - 1e-9) / 4);
    const ylab = []; for (let v = 0; v <= yMax + 1e-9; v += 0.25) ylab.push(`${Math.round(v * 100)}%`);
    const m = { l: U.axisLeft(svg, ylab), r: Math.ceil(12 + U.textW(svg, ['000%', C.yr.timeGone + ' 100%'], 'blab')) , t: 22, b: 40 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const span = R.dayDiff(R.addDays(c.end, 1), c.start), x = iso => m.l + Math.max(0, Math.min(1, (R.dayDiff(iso, c.start) + 1) / span)) * iw, y = v => m.t + (1 - v / yMax) * ih;
    let g = '';
    for (let v = 0; v <= yMax + 1e-9; v += 0.25) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${css('--grid')}"/><text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end" class="axis">${Math.round(v * 100)}%</text>`;
    R.monthsIn(c.start, c.end).forEach((mm, i) => { const xx = x(R.monthFirst(mm) < c.start ? c.start : R.monthFirst(mm));
      g += `<text x="${xx}" y="${m.t + ih + 18}" class="axis mon">${esc(R.monthShort(mm))}</text>` + (i === 0 || mm.slice(5) === '01' ? `<text x="${xx}" y="${m.t + ih + 33}" class="axis yr">${mm.slice(0, 4)}</text>` : ''); });
    const lab = (xx, yy, t, color) => { const w = U.textW(svg, [t], 'blab'), lx = Math.min(xx + 7, W - 2 - w); return `<text x="${lx.toFixed(1)}" y="${(yy + 4).toFixed(1)}" class="blab" fill="${color}">${esc(t)}</text>`; };
    const line = (pts, color, fcv) => { const p = pts.filter(q => q.v != null); if (!p.length) return ''; const dd = [`M${x(c.start)},${y(0)}`].concat(p.map(q => `L${x(q.d).toFixed(1)},${y(q.v).toFixed(1)}`)).join(' ');
      const e = p[p.length - 1], f = d.fc && R.isNum(fcv) ? `<path d="M${x(e.d).toFixed(1)},${y(e.v).toFixed(1)} L${x(c.end).toFixed(1)},${y(fcv).toFixed(1)}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5 4" opacity=".75" data-fc="${fcv}"/>` +
        `<circle cx="${x(c.end)}" cy="${y(fcv)}" r="3.5" fill="none" stroke="${color}" stroke-width="2"/>` + lab(x(c.end), y(fcv), `${Math.round(fcv * 100)}%`, color) : '';
      return `<path d="${dd}" fill="none" stroke="${color}" stroke-width="2.5"/><circle cx="${x(e.d)}" cy="${y(e.v)}" r="4" fill="${color}"/>${f}` + (f && Math.abs(x(c.end) - x(e.d)) < 40 ? '' : lab(x(e.d), y(e.v), `${Math.round(e.v * 100)}%`, color)); };
    const tg = d.sp.timeGone || 0, tline = `<path d="M${x(c.start)},${y(0)} L${x(d.stop)},${y(tg)}" stroke="${css('--text-2')}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/><path d="M${x(d.stop)},${y(tg)} L${x(c.end)},${y(1)}" stroke="${css('--grid')}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`;
    const today = td() >= c.start && td() <= c.end ? `<line x1="${x(td())}" x2="${x(td())}" y1="${m.t}" y2="${m.t + ih}" stroke="${css('--today')}" stroke-dasharray="5 4"/>` : '';
    const em = c.end_marketing && c.end_marketing >= c.start && c.end_marketing <= c.end ? (() => { const ex = x(c.end_marketing), right = ex > W - m.r - 100;
      return `<line x1="${ex.toFixed(1)}" x2="${ex.toFixed(1)}" y1="${m.t - 8}" y2="${m.t + ih}" stroke="${css('--text')}" stroke-width="1.3" stroke-dasharray="2 3" data-endmkt="${c.end_marketing}"/><text x="${(ex + (right ? -5 : 5)).toFixed(1)}" y="${m.t - 10}" class="blab"${right ? ' text-anchor="end"' : ''}>${esc(B2.endMkt)}</text>`; })() : '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = g + today + em + tline + line(d.pts.used, css('--mkt'), d.fc && d.fc.used) + line(d.pts.ach, css('--rev'), d.fc && d.fc.ach);
    svg.dataset.ach = d.pts.ach.length ? d.pts.ach[d.pts.ach.length - 1].v : ''; svg.dataset.used = d.pts.used.length ? d.pts.used[d.pts.used.length - 1].v : ''; svg.dataset.time = tg;
    svg.dataset.fcAch = d.fc && R.isNum(d.fc.ach) ? d.fc.ach : ''; svg.dataset.fcUsed = d.fc && R.isNum(d.fc.used) ? d.fc.used : '';
  }
  /* What to do (CR-09 §4.2): one row a thing — the chip · a short sentence · a button · Near budget / Spending ahead / nothing = ✓ */
  function renderTodo(c) {
    const T = M0.todo, T2 = M0.todo2, r = issuesAll().byId.get(c.id), rr = R.runRate(U.seed(), c.id, { today: td() }), dl = R.daysLeft(c, td()), b = (r && r.budget) || {};
    const items = ((r && r.chips) || []).filter(x => ['behind', 'at_risk', 'over', 'ended_over'].includes(x.key));
    const row = x => {
      if (x.key === 'behind' || x.key === 'at_risk') {
        const live = rr.required != null && rr.monthsLeft > 1e-9 && td() <= c.end, when = rr.monthsLeft < 1 ? T2.forDays(Math.max(0, dl.n || 0)) : T2.forMonths(Math.round(rr.monthsLeft * 10) / 10);
        const words = !live ? T.salesEnd : rr.need != null ? T2.sell(R.shortBaht(rr.required), when, R.times(rr.need)) : T2.sellNoPace(R.shortBaht(rr.required), when);
        return `<li class="${x.sev}">${U.issueChip(x.key)}<span>${esc(words)}</span>${live ? `<button type="button" class="btn small" data-gosku>${esc(T2.seeSku)}</button>` : ''}</li>`; }
      if (x.key === 'over') return `<li class="${x.sev}">${U.issueChip(x.key)}<span>${esc(T2.over(R.shortBaht(-b.remaining)))}</span>${canRequest(c) ? `<button type="button" class="btn small" data-mreq>${esc(T2.request)}</button>` : ''}</li>`;
      return `<li class="${x.sev}">${U.issueChip(x.key)}<span>${esc(T.endedOver(R.shortBaht(-b.remaining)))}</span></li>`;
    };
    $('m_todo').innerHTML = `<div class="card-head"><h3>${esc(T.title)}</h3></div>` + (items.length ? `<ul class="todo t9">${items.map(row).join('')}</ul>`
      : `<div class="na-none small" data-todook><span class="okm" aria-hidden="true">✓</span> ${esc(T2.none)}</div>`);
  }

  /* ---------- Sales (CR-09 §4.3): the Channel and the unit of the tab · by month (Total | By channel) · mix | channels · SKU × Channel · sub-channels | Pareto ---------- */
  function renderSales(c) {
    const S9 = M0.s9;
    $('m_body').innerHTML = `<div class="mtabbar">${segHTML('data-chf', CHS.map(v => ({ v, label: v === 'all' ? S9.all : C.channel[v] })), st.channel, { label: S9.channelL })}` +
      segHTML('data-unit', [{ v: 'amount', label: K.m.baht }, { v: 'qty', label: K.m.qty }], st.unit, { label: S9.unitL }) + `</div>` +
      `<div class="card" id="m_month"></div><div class="r13"><div class="card" id="m_mix"></div><div class="card" id="m_ch"></div></div><div class="card" id="m_mx"></div>` +
      `<div class="r2"><div class="card" id="m_subs"></div><div class="card" id="m_par"></div></div>`;
    renderMonth(); renderMix(); renderCh(); renderMatrix(); renderSubs(); renderPareto();
    void c;
  }
  function renderMonth() {
    const box = $('m_month'); if (!box) return;
    const c = byId(st.cid), M = K.m, S9 = M0.s9, table = st.mView === 'table', byCh = st.mBy === 'channel' && !ch();
    if (!c) { box.innerHTML = ''; return; }
    const md = R.targetByMonth(U.seed(), c.id, { channel: ch(), unit: st.unit, today: td() });
    const o = { mode: st.mode, color: '--rev', good: 'up', planWord: M.target, lflWord: M.targetLfl, fmt: isQty() ? U.shortNum : R.compact, full: isQty() ? v => `${R.fmtNum(Math.round(v))} pcs` : R.baht };
    /* By channel: the actual of each channel stacked (its colour) · the tick = the whole target */
    if (byCh) { const chs = R.CHANNELS.filter(k => (R.model(U.seed()).salesRows.get(c.id) || []).some(r => r.channel === k)), per = Object.fromEntries(chs.map(k => [k, R.targetByMonth(U.seed(), c.id, { channel: k, unit: st.unit, today: td() }).rows]));
      md.rows.forEach((r, i) => chs.forEach(k => { r[k] = per[k][i] ? per[k][i].actual : null; }));
      o.stack = chs.map(k => ({ k, color: CH_TOKEN[k], label: C.channel[k] })); }
    const folded = fold(c) && !table;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(M.title, M.tip)}</h3><div class="ctl">${table || folded ? '' : `<div class="legend">${U.monthLegend(o)}</div>`}` +
      (ch() ? '' : segHTML('data-mby', [{ v: 'total', label: S9.total }, { v: 'channel', label: S9.byCh }], st.mBy, { label: S9.viewL })) +
      segHTML('data-bmode', [{ v: 'monthly', label: D.m.monthly }, { v: 'cumulative', label: D.m.cumulative }], st.mode, { label: D.m.modeL }) +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="mView" aria-pressed="${table}">${esc(D.table)}</button></div></div>` +
      (folded ? U.foldedLine() : `<div class="sumline">${sumHTML(md, c)}</div>` +
        (table ? `<div class="ctable">${U.tableHTML(X.rowsFor('c_month', ctx()), 'c_month')}</div>` : `<div class="chartbox" id="mm_box"><svg id="mm_svg" role="img" aria-label="${esc(M.title)}"></svg><div class="tip" id="mm_tip"></div></div>`));
    /* its own ids — the Dashboard's Overview has m_svg (a hidden tab keeps its DOM) */
    if (!table && !folded) U.monthChart($('mm_svg'), $('mm_box'), $('mm_tip'), md, Object.assign(o, { h: 300 }));
  }
  function sumHTML(md, c) {
    const t = md.toDate, tp = R.timeProgress(c, td()), dl = R.daysLeft(c, td()), left = esc(!tp.started ? K.k.startsIn(dl.n) : K.m.left(tp.daysLeft));
    if (!t) return `<span class="noa">${esc(C.empty.card)}</span><span class="noa">· ${esc(D.m.planOnly(K.m.target, short(md.planTotal)))}</span><span class="noa">· ${left}</span>`;
    const tone = R.tone(t.gap, 'up'), words = t.gap == null ? '' : Math.abs(t.gap) < 0.5 ? D.m.onTarget : (t.gap < 0 ? D.m.behind : D.m.ahead)(short(Math.abs(t.gap)));
    return `<span class="tdl" tabindex="0" title="${esc(C.money.toDate)}">${esc(D.m.toDateL)}</span><span>${esc(K.m.sum(short(t.actual), short(t.plan), R.pct(t.pct)))}</span>` +
      (words ? `<span>·</span><b class="${tone}">${esc(words)}</b>` : '') + `<span>·</span><span>${left}</span>`;
  }
  /* Sales mix by channel (1/3): the donut of the actual · Target mix / Actual mix (D83) */
  function renderMix() {
    const box = $('m_mix'), c = byId(st.cid); if (!box || !c) return;
    const X9 = M0.mix, m = R.salesMix(U.seed(), c.id, { unit: st.unit, today: td() }), head = `<div class="card-head"><h3>${labelInfo(X9.title, X9.tip)}</h3></div>`;
    if (fold(c) || !m.actual) { box.innerHTML = head + U.foldedLine(); return; }
    const sl = m.channels.filter(x => x.actual > 0).sort((a, b) => b.actual - a.actual).map(x => ({ key: x.channel, label: `${C.channel[x.channel]} · ${C.channelLong[x.channel]}`, value: x.actual, color: CH_TOKEN[x.channel],
      tip: C.sb.chmix.slice(C.channelLong[x.channel], val(x.actual), R.pct(x.aShare, 1)) }));
    const parts = k => m.channels.map(x => ({ key: x.channel, label: C.channel[x.channel], value: k === 'target' ? x.target || 0 : x.actual || 0, color: CH_TOKEN[x.channel], money: val(k === 'target' ? x.target : x.actual) }));
    box.innerHTML = head + `<div class="c3-body dbody">${U.donutHTML({ id: 'm_dn', label: X9.title, slices: sl, total: m.actual, cols: X9.cols, fmt: val })}` +
      U.mixBars([{ label: X9.target, parts: parts('target') }, { label: X9.actual, parts: parts('actual') }]) + `</div>`;
    U.drawDonut({ id: 'm_dn', slices: sl, total: m.actual, center: short(m.actual), size: 150 });
  }
  /* Channel attainment (2/3): Channel · Actual · Share % · Full target · Ach % (the Time gone tick) · Gap to pace · Remaining · Status (the Pace — D80) */
  function renderCh() {
    const box = $('m_ch'), c = byId(st.cid); if (!box || !c) return;
    const a = R.attainment(U.seed(), c.id, { channel: ch(), unit: st.unit, today: td() }), T = M0.chT, Kc = T.cols, folded = new Set(st.chFolded), tg = R.timeGone(c, td()), table = st.chView === 'table';
    const tot = a.total.actTD;
    const head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><button type="button" class="btn small${table ? ' on' : ''}" data-view="chView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (fold(c) && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + `<div class="ctable">${U.tableHTML(X.rowsFor('c_channel', ctx()), 'c_channel')}</div>`; return; }
    const th = (l, tip, num) => `<th class="${num ? 'num' : ''}">${tip ? labelInfo(l, tip, l) : esc(l)}</th>`;
    const cells = (n, name) => { const p = R.paceNode(n, tg), cl = stCls(p.status) || 'ok';
      return `<td class="num" title="${esc(val(n.actTD))}" data-act="${n.actTD == null ? '' : n.actTD}">${n.actTD == null ? none(C.att.none) : esc(short(n.actTD))}</td><td class="num">${esc(R.pct(tot ? (n.actTD || 0) / tot : null, 1))}</td><td class="num" title="${esc(val(n.target))}">${n.target == null ? none() : esc(short(n.target))}</td>` +
        `<td title="${esc(T.rowTip(name, val(n.actTD), val(n.target), val(n.tgtTD), p.pace != null && p.status ? R.paceText(p.pace) : ''))}">${p.achF == null ? none() : U.paceBar(p.achF, tg, cl, 46)}</td>` +
        `<td class="num">${p.gapPace == null ? none() : `<span class="${R.tone(p.gapPace, 'up')}">${esc((p.gapPace > 0.5 ? '+' : '') + short(p.gapPace))}</span>`}</td>` +
        `<td class="num" title="${esc(val(n.remaining))}">${n.remaining == null ? none() : esc(short(n.remaining))}</td><td>${U.paceChip(p.status)}</td>`; };
    const rows = a.channels.map(x => {
      const subs = x.subs.filter(s => s.sub && s.node && s.node.actTD != null).sort((p, q) => q.node.actTD - p.node.actTD), open = subs.length && !folded.has(x.channel);
      return `<tr class="grp" data-chrow="${esc(x.channel)}"><td class="nm"><div class="nmw"><button type="button" class="chev" data-chfold="${esc(x.channel)}" aria-expanded="${!!open}" aria-label="${esc((open ? D.p.collapse : D.p.expand)(C.channel[x.channel]))}"${subs.length ? '' : ' disabled'}>${ICON.chevronDown}</button>` +
        `<div class="nmt" title="${esc(C.channelLong[x.channel])}"><b>${esc(C.channel[x.channel])}</b></div></div></td>${cells(x.node, C.channel[x.channel])}</tr>` +
        (open ? subs.map((s, i) => `<tr class="child${i === subs.length - 1 ? ' last' : ''}"><td class="nm"><span class="chname">${esc(s.sub)}</span></td><td class="num" title="${esc(val(s.node.actTD))}">${esc(short(s.node.actTD))}</td><td class="num muted small">${esc(T.subShare(R.pct(R.ratio(s.node.actTD, x.node.actTD)), C.channel[x.channel]))}</td><td colspan="5"></td></tr>`).join('') : '');
    }).join('');
    box.innerHTML = head + `<div class="tablewrap" style="margin-top:10px"><table class="tbl port atttbl chtbl"><thead><tr>${th(Kc.channel)}${th(Kc.actual, null, true)}${th(Kc.share, null, true)}${th(Kc.full, null, true)}${th(Kc.ach, T.achTip)}${th(Kc.gap, T.gapTip, true)}${th(Kc.remaining, K.tip.remaining, true)}${th(Kc.status)}</tr></thead>` +
      `<tbody>${rows}<tr class="total"><td>${esc(K.total)}</td>${cells(a.total, K.total)}</tr></tbody></table></div>`;
  }
  /* SKU × Channel (D82): the actual of every SKU in every channel · Ach % under it · the tint = the Pace status · Share % = of the campaign · the total row = Net revenue */
  const MX_RANK = { behind: 0, at_risk: 1, on_track: 2 };
  function mxRows(c) {
    const m = R.skuMatrix(U.seed(), c.id, { unit: st.unit, channel: ch(), today: td() }), nm = s => s.product.nickname || s.product.name || s.key;
    const rows = m.rows.filter(s => st.mxTab === 'all' || (s.total && s.total.status) === st.mxTab).sort((a, b) => {
      if (st.mxSort === 'name') return nm(a).localeCompare(nm(b), 'en');
      if (st.mxSort === 'ach') return (a.total.achF ?? 9) - (b.total.achF ?? 9) || nm(a).localeCompare(nm(b), 'en');
      if (st.mxSort === 'gap') return (a.total.gapPace ?? 1e18) - (b.total.gapPace ?? 1e18) || nm(a).localeCompare(nm(b), 'en');
      return (b.total.actual || 0) - (a.total.actual || 0) || nm(a).localeCompare(nm(b), 'en'); });
    return { m, rows, nm };
  }
  function renderMatrix() {
    const box = $('m_mx'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.mx, table = st.mxView === 'table', { m, rows, nm } = mxRows(c), count = k => m.rows.filter(s => s.total && s.total.status === k).length;
    const tabs = `<div class="sttabs" role="tablist">${[['all', T.tabs.all, m.rows.length], ['behind', T.tabs.behind, count('behind')], ['at_risk', T.tabs.at_risk, count('at_risk')], ['on_track', T.tabs.on_track, count('on_track')]]
      .map(([k, l, n]) => `<button type="button" role="tab" data-mxtab="${k}" class="${st.mxTab === k ? 'on' : ''}${k !== 'all' ? ' ' + stCls(k) : ''}" aria-selected="${st.mxTab === k}">${esc(l)} <span class="n">${n}</span></button>`).join('')}</div>`;
    const head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl">${segHTML('data-mxseg', ['actual', 'ach', 'share'].map(v => ({ v, label: v === 'actual' && isQty() ? K.m.qty : T.seg[v] })), st.mxSeg, { label: T.segL })}` +
      `<label class="ms"><select class="ms-trigger sel" data-mxsort aria-label="${esc(D.p.sortL)}">${['actual', 'gap', 'ach', 'name'].map(k => `<option value="${k}"${st.mxSort === k ? ' selected' : ''}>${esc(D.p.sortBtn(T.sorts[k]))}</option>`).join('')}</select></label>` +
      `<button type="button" class="btn small${table ? ' on' : ''}" data-view="mxView" aria-pressed="${table}">${esc(D.table)}</button></div></div>`;
    if (fold(c) && !table) { box.innerHTML = head + U.foldedLine(); return; }
    if (table) { box.innerHTML = head + tabs + `<div class="ctable">${U.tableHTML(X.rowsFor('c_matrix', ctx()), 'c_matrix', { maxH: 560 })}</div>`; return; }
    /* CR-10 §5.3 — the matrix is one helper (U.channelMatrix): rows = SKUs here, Campaigns on Dashboard › Sales */
    const html = U.channelMatrix({ channels: m.channels, seg: st.mxSeg, fmt: short, tg: m.tg, stCls, cols: { name: T.cols.sku, total: T.cols.total, share: T.cols.share, ach: T.cols.ach, status: T.cols.status, totalRow: T.total },
      rows: rows.map(s => ({ name: nm(s), sub: s.product.code || '', byCh: s.byCh, total: s.total, tg: m.tg })), totals: st.mxTab === 'all' ? Object.assign({ all: m.total }, m.byCh) : null,
      cellTip: (r, k, x) => T.cellTip(r.name, C.channel[k], val(x.actual), val(x.target), R.pct(x.achF), x.status ? C.yr.st[x.status] : '') });
    box.innerHTML = head + tabs + (rows.length ? html : `<div class="c3-empty">${esc(T.none)}</div>`);
  }
  /* Sub-channel share (1/2): the actual of each sub-channel by channel (its share of the channel — D63) · the 6 largest a channel + Other (n) */
  const topSubs = list => (list.length <= 7 ? list : list.slice(0, 6).concat([(r => ({ sub: M0.pareto.other(list.length - 6), actual: r.reduce((t, s) => t + s.actual, 0), share: r.reduce((t, s) => t + (s.share || 0), 0) }))(list.slice(6))]));
  function renderSubs() {
    const box = $('m_subs'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.subs, m = R.salesMix(U.seed(), c.id, { unit: st.unit, today: td() }), head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3></div>`;
    const chs = m.channels.filter(x => !ch() || x.channel === ch()).filter(x => x.subs.length);
    if (fold(c) || !chs.length) { box.innerHTML = head + U.foldedLine(); return; }
    const items = chs.flatMap(x => [{ label: C.channel[x.channel], lsub: C.channelLong[x.channel], fill: x.actual, color: `var(${CH_TOKEN[x.channel]})`, value: `<b>${esc(short(x.actual))}</b>`, sub: '' }]
      .concat(topSubs(x.subs).map(s => ({ label: s.sub, child: true, fill: s.actual, color: `var(${CH_TOKEN[x.channel]})`, value: `<span>${esc(short(s.actual))}</span>`, sub: T.of(R.pct(s.share), C.channel[x.channel]),
        tip: `${s.sub}\n${val(s.actual)} · ${T.of(R.pct(s.share, 1), C.channel[x.channel])}` }))));
    box.innerHTML = head + `<div class="c3-body">${U.hbars(items, 'var(--rev)')}</div>`;
  }
  /* SKU contribution (1/2): the Pareto — the actual of each SKU, largest first + the running share */
  function renderPareto() {
    const box = $('m_par'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.pareto, { m, nm } = mxRows(c), head = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><div class="legend"><span><i class="bar" style="--sw:var(--rev)"></i>${esc(U.actualWord())}</span><span><i class="ln dash" style="--sw:var(--text)"></i>${esc(T.cum)}</span></div></div></div>`;
    const all = m.rows.filter(s => s.total && s.total.actual > 0).sort((a, b) => b.total.actual - a.total.actual);
    if (fold(c) || !all.length) { box.innerHTML = head + U.foldedLine(); return; }
    const top = all.slice(0, 10), rest = all.slice(10), items = top.map(s => ({ label: nm(s), sub: s.product.code || '', value: s.total.actual, text: short(s.total.actual) }))
      .concat(rest.length ? [{ label: T.other(rest.length), value: rest.reduce((t, s) => t + s.total.actual, 0), text: short(rest.reduce((t, s) => t + s.total.actual, 0)) }] : []);
    box.innerHTML = head + `<div class="c3-body">${U.paretoBars(items)}</div>`;
  }

  /* ---------- Budget (CR-09 §4.4): the bar · Budget by line (Marketing ▸ Sales ▸ Other, folded) · by month | Spend by group · the requests ---------- */
  const GROUPS = ['marketing', 'sales', 'other'];
  /* the status of a line or a group: Over (> 100%) · Near budget (90 – 100% while the campaign runs) · OK — R.budgetStatus without "Spending ahead" */
  const lineSt = (used, ended) => { const s = R.budgetStatus(used, null, ended); return s === 'over' || s === 'ended_over' ? 'over' : s === 'near' ? 'near' : used == null ? null : 'ok'; };
  function trackOf(c) { return R.budgetTrack(U.seed(), Object.assign(pnlCtx(c), {})).rows[0] || null; }
  function renderBudget(c) {
    const t = trackOf(c), plan = plans()[c.id], reqs = ((plan && plan.requests) || []).slice().reverse(), Q = C.req, B = M0.bud;
    $('m_body').innerHTML = (t ? `<div class="card" id="m_bbar"><div class="card-head"><h3>${labelInfo(C.track.block.title, C.track.block.tip)}</h3></div><div class="bblk"><div class="bbv"><b>${esc(R.baht(t.committed))}</b> <span class="muted">${esc(C.track.of(R.baht(t.current)))}</span></div>${U.budgetBar(t)}<div class="muted small">${esc(U.budgetCap(t))}</div>` +
      `<div class="legend bbleg"><span><i class="sw com"></i>${esc(C.track.legend.com)}</span><span><i class="sw rem"></i>${esc(C.track.legend.rem)}</span><span><i class="sw pend"></i>${esc(C.track.legend.pend)}</span><span><i class="sw tick"></i>${esc(C.track.legend.tick)}</span></div></div></div>` +
      `<div class="card" id="m_lines"></div>` : `<div class="card"><div class="c3-empty">${esc(C.track.noBudget(''))}</div></div>`) +
      `<div class="r31"><div class="card" id="m_bva"></div><div class="card" id="m_grp"></div></div>` +
      `<div class="card"><div class="card-head"><h3>${esc(B.requests)} <span class="hnote">${reqs.length}</span></h3><div class="ctl"><a class="link" href="#planning/approvals">${esc(B.toApprovals)}</a></div></div>` +
      (reqs.length ? `<div class="tablewrap"><table class="tbl simple reqtbl"><thead><tr><th>${esc(Q.cols.no)}</th><th>${esc(Q.cols.type)}</th><th>${esc(Q.cols.reason)}</th><th class="num">${esc(Q.cols.amount)}</th><th>${esc(Q.cols.by)}</th><th>${esc(Q.cols.status)}</th></tr></thead><tbody>` +
        reqs.map(q => `<tr><td>#${q.no}</td><td>${esc(Q.type[q.type] || q.type)}</td><td class="wrap">${esc(q.reason)}</td><td class="num"><b class="${R.sumLines(q.lines) < 0 ? 'neg' : ''}">${esc(R.signedShort(R.sumLines(q.lines)))}</b></td><td>${esc(q.by)}</td><td>${U.apChip(q.status)}</td></tr>`).join('') + '</tbody></table></div>'
        : `<div class="c3-empty">${esc(Q.none)}</div>`) + '</div>';
    if (t) renderLines(c, t); renderBva(); renderGrp();
  }
  function renderLines(c, t) {
    const box = $('m_lines'); if (!box) return;
    const L = M0.lines, Kc = L.cols, tg = R.timeGone(c, td()), ended = td() > c.end, open = new Set(st.bgOpen);
    const chip = s => (s ? `<span class="lst ${esc(s)}">${esc(L.st[s])}</span>` : '');
    const cells = x => `<td class="num">${esc(R.baht(x.current))}</td><td class="num">${esc(R.baht(x.committed))}</td><td>${x.current > 0 ? U.paceBar(x.used, tg, x.used > 1 ? 'over' : 'ok', 70) : none()}</td>` +
      `<td class="num${x.remaining < -0.5 ? ' neg' : ''}">${esc(R.baht(x.remaining))}</td><td>${chip(lineSt(x.used, ended))}</td>`;
    const groups = GROUPS.map(g => { const ls = t.lines.filter(l => l.type === g); if (!ls.length) return '';
      const sum = k => ls.reduce((s, l) => s + (l[k] || 0), 0), G = { current: sum('current'), committed: sum('committed') }; G.remaining = G.current - G.committed; G.used = R.ratio(G.committed, G.current);
      const isO = open.has(g), name = C.plan.grid.groups[g];
      return `<tr class="grp" data-bgrow="${g}"><td class="nm"><span class="bnm"><button type="button" class="chev" data-bgopen="${g}" aria-expanded="${isO}" aria-label="${esc((isO ? L.collapse : L.expand)(name))}">${ICON.chevronDown}</button><b>${esc(name)}</b> <span class="muted small">${ls.length}</span></span></td>${cells(G)}</tr>` +
        (isO ? ls.slice().sort((a, b) => (b.used ?? -1) - (a.used ?? -1) || b.current - a.current).map(l => `<tr class="sub" data-bline="${esc(g)}"><td class="lbl">${esc(l.line)}</td>${cells(l)}</tr>`).join('') : ''); }).join('');
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(L.title, L.tip)}</h3><div class="ctl"><div class="legend"><span><i class="bar" style="--sw:var(--ok)"></i>${esc(Kc.used)}</span><span><i class="bar" style="--sw:var(--err)"></i>${esc(L.st.over)}</span><span><i class="tick"></i>${esc(C.yr.timeGone)}</span></div>` +
      `<button type="button" class="btn small" data-dl="c_lines">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      `<div class="tablewrap" style="margin-top:8px"><table class="tbl port wtbl btbl mlines"><thead><tr><th>${esc(Kc.line)}</th><th class="num">${esc(Kc.current)}</th><th class="num">${esc(Kc.spent)}</th><th>${esc(Kc.used)}</th><th class="num">${esc(Kc.remaining)}</th><th>${esc(Kc.status)}</th></tr></thead>` +
      `<tbody>${groups}<tr class="total"><td>${esc(C.common.total)}</td>${cells(t)}</tr></tbody></table></div>`;
  }
  function renderBva() {
    const box = $('m_bva'), c = byId(st.cid); if (!box || !c) return;
    const M = D.m, md = R.byMonth(U.seed(), pnlCtx(c), 'spend'), o = { mode: st.bva, stack: [{ k: 'mkt', color: '--mkt', label: M.legend.mkt }, { k: 'sls', color: '--sls', label: M.legend.sls }, { k: 'oth', color: '--oth', label: M.legend.oth }], good: 'down', planWord: M.legend.budget, lflWord: M.tip.budgetLfl, h: 300 };
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(C.wf.bva.title, C.wf.bva.tip)}</h3><div class="ctl"><div class="legend">${U.monthLegend(o)}</div>${segHTML('data-mbva', [{ v: 'monthly', label: M.monthly }, { v: 'cumulative', label: M.cumulative }], st.bva)}</div></div>` +
      `<div class="chartbox" id="mb_box"><svg id="mb_svg" role="img" aria-label="${esc(C.wf.bva.title)}"></svg><div class="tip" id="mb_tip"></div></div>`;
    U.monthChart($('mb_svg'), $('mb_box'), $('mb_tip'), md, o);
  }
  /* Spend by group (1/3): the donut of CR-08 §6.5 — Marketing · Sales · Other */
  const grpOf = c => { const t = trackOf(c), G = C.plan.grid.groups, tok = { marketing: '--mkt', sales: '--sls', other: '--oth' }; if (!t) return { tot: 0, slices: [] };
    const sl = GROUPS.map(g => ({ key: g, label: G[g], value: t.lines.filter(l => l.type === g).reduce((s, l) => s + (l.committed || 0), 0), color: tok[g] })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
    const tot = sl.reduce((s, x) => s + x.value, 0); sl.forEach(x => { x.tip = C.sb.chmix.slice(x.label, R.baht(x.value), R.pct(tot ? x.value / tot : null, 1)); }); return { tot, slices: sl }; };
  function renderGrp() {
    const box = $('m_grp'), c = byId(st.cid); if (!box || !c) return;
    const K9 = C.sb.grp, g = grpOf(c), head = `<div class="card-head"><h3>${labelInfo(K9.title, K9.tip)}</h3></div>`;
    if (!g.slices.length) { box.innerHTML = head + `<div class="c3-empty">${esc(D.k.noSpend)}</div>`; return; }
    box.innerHTML = head + `<div class="c3-body dbody">${U.donutHTML({ id: 'mg_dn', label: K9.title, slices: g.slices, total: g.tot, cols: [K9.cols.group, K9.cols.spent, K9.cols.share] })}</div>`;
    U.drawDonut({ id: 'mg_dn', slices: g.slices, total: g.tot, center: R.shortBaht(g.tot), size: 150 });
  }

  /* ---------- P&L (CR-09 §4.5): the waterfall LEFT | the statement RIGHT (as the Dashboard) · Sales vs Marketing by month (no Spend by line — it is in Budget) ---------- */
  function renderPnl(c) {
    $('m_body').innerHTML = `<div class="r2 pl2"><div class="card" id="m_wf"></div><div class="card" id="m_st"></div></div><div class="card" id="m_svm"></div>`;
    renderWf(); $('m_st').innerHTML = CP.pnl.statementHTML(pnlCtx(c)); renderSvm();
  }
  function renderWf() { const c = byId(st.cid), box = $('m_wf'); if (c && box) CP.pnl.waterfallCard(box, pnlCtx(c), st.side); }
  /* the months: the bar = Marketing spent (the Budget tab's Marketing) · the line = Net revenue (the Sales tab's actual) */
  function svmData(c) {
    const sp = R.byMonth(U.seed(), pnlCtx(c), 'spend'), rv = R.targetByMonth(U.seed(), c.id, { unit: 'amount', today: td() }), rev = new Map(rv.rows.map(r => [r.m, r.actual]));
    const rows = sp.rows.map(r => ({ m: r.m, plan: null, actual: r.mkt == null ? (r.actual == null ? null : 0) : r.mkt, lfl: null, variance: null, rev: rev.has(r.m) ? rev.get(r.m) : null }));
    return { rows, cum: rows, measure: 'spend', toDate: null };
  }
  function renderSvm() {
    const box = $('m_svm'), c = byId(st.cid); if (!box || !c) return;
    const T = M0.svm, e = R.mktEfficiency(U.seed(), Object.assign(pnlCtx(c), { statuses: R.STATUSES.slice(), includeCancelled: true })).byId.get(c.id) || {}, dr = R.afterMarketingDrop(U.seed(), c.id, td());
    const o = { mode: 'monthly', color: '--mkt', good: 'down', noPlan: true, actualWord: T.bars, planWord: '', h: 300, line: { key: 'rev', color: '--rev', label: T.line, full: R.baht },
      vlines: c.end_marketing ? [{ date: c.end_marketing, label: M0.burn2.endMkt }] : [] };
    const sum = `<span>${esc(T.eff(R.times(e.actual), R.times(e.plan)))}</span><span>·</span>` + (dr.drop == null ? `<span class="noa">${esc(T.noDrop)}</span>` : `<b class="${dr.drop < 0 ? 'bad' : 'good'}">${esc(T.drop((dr.drop > 0 ? '+' : '') + R.pct(dr.drop)))}</b>`);
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3><div class="ctl"><div class="legend">${U.monthLegend(o)}</div><button type="button" class="btn small" data-dl="c_svm">${ICON.download}<span>${esc(D.downloadXlsx)}</span></button></div></div>` +
      `<div class="sumline" data-svmsum>${sum}</div><div class="chartbox" id="ms_box"><svg id="ms_svg" role="img" aria-label="${esc(T.title)}"></svg><div class="tip" id="ms_tip"></div></div>`;
    U.comboChart($('ms_svg'), $('ms_box'), $('ms_tip'), svmData(c), o);
  }
  /* ---------- History: the log of the plan (an icon a kind) · Compare v1 ↔ v2 when there are versions ---------- */
  const HICON = { created: '+', saved: '✎', submitted: '↑', resubmitted: '↑', approved: '✓', returned: '↩', revise: '↩', rejected: '✕', withdrawn: '↓', request: '฿', 'request.approved': '฿', 'request.returned': '฿', 'request.rejected': '฿', 'request.withdrawn': '฿', 'step.done': '✓', 'step.assign': '→', duplicated: '⧉', undo: '↶' };
  const hkind = a => (/^request/.test(a) ? 'req' : ['approved', 'step.done'].includes(a) ? 'ok' : ['returned', 'revise', 'rejected'].includes(a) ? 'back' : ['submitted', 'resubmitted'].includes(a) ? 'sub' : 'other');
  function renderHistory(c) {
    const plan = plans()[c.id], log = ((plan && plan.log) || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at))), A = C.appr, vs = ((plan && plan.versions) || []).filter(v => v.status !== 'draft'), H = M0.hist2;
    const cmp = vs.slice(1).map((v, i) => `<button type="button" class="link" data-cmp="${vs[i].v}|${v.v}">${esc(H.compare(vs[i].v, v.v))}</button>`).join(' · ');
    $('m_body').innerHTML = `<div class="card"><div class="card-head"><h3>${esc(M0.tabs.history)}</h3><div class="ctl">${cmp}<a class="link" href="#planning/${esc(c.id)}/review">${esc(M0.viewPlan)}</a></div></div>` +
      (log.length ? `<ul class="hist h9">${log.map(x => `<li><span class="hic ${hkind(x.action)}" aria-hidden="true">${esc(HICON[x.action] || '•')}</span><div><span class="hw">${esc(A.log[x.action] || x.action)}</span><span class="muted"> · ${esc(x.by || '—')} · ${esc(R.dmy(String(x.at).slice(0, 10)))} ${esc(String(x.at).slice(11, 16))}</span>${x.detail ? `<div class="hd">${esc(x.detail)}</div>` : ''}</div></li>`).join('')}</ul>` : `<div class="c3-empty">${esc(C.plan.history.none)}</div>`) + '</div>';
  }
  function openCompare(a, b) {
    const c = byId(st.cid), plan = plans()[st.cid], va = plan && plan.versions.find(v => v.v === a), vb = plan && plan.versions.find(v => v.v === b); if (!va || !vb) return;
    U.openDialog(`<div class="dlg-h">${esc(M0.hist2.compareTitle(c.name, a, b))}</div><div class="dlg-b">${CP.cpage.diffHTML(R.planDiff(va, vb), a, b)}</div><div class="dlg-f"><button type="button" class="btn" data-dlgclose>${esc(M0.hist2.close)}</button></div>`, true);
    const d = $('dlg'), cl = d.querySelector('[data-dlgclose]'); if (cl) cl.addEventListener('click', () => U.closeDialog());
  }

  /* ---------- Export: the tabs of Monitor (registered here: c_kpi · c_mix · c_channel · c_matrix · c_lines · c_svm) ---------- */
  X.register('c_kpi', x => { const c = byId(x.cid); if (!c) return { key: 'c_kpi', title: D.file.c_kpi, header: ['Metric', 'Value', 'Of', '%'], cols: ['text', 'money', 'money', 'pct'], rows: [] };
    const { A, Pl, F, sp, b } = nums(c), Kk = M0.k9;
    return { key: 'c_kpi', title: D.file.c_kpi, header: ['Metric', 'Value', 'Of', '%', 'Note'], cols: ['text', 'money', 'money', 'pct', 'text'],
      rows: [[Kk.revenue, A.rev, Pl.rev, R.ratio(A.rev, Pl.rev), `${C.yr.timeGone} ${R.pct(sp && sp.timeGone)} · ${paceWord(sp && sp.status)}${sp && sp.pace != null ? ` · Pace ${R.paceText(sp.pace)}` : ''}`],
        [Kk.budget, b ? b.spent : null, b ? b.current : null, b ? b.used : null, b && b.status ? C.yr.st[b.status] : ''], [Kk.profit, A.profit, Pl.profit, R.ratio(A.profit, Pl.profit), `Margin ${R.pct(A.margin)} · ROI ${R.times(A.roi)}`],
        [Kk.fc, F.rev, Pl.rev, R.ratio(F.rev, Pl.rev), `Profit ${R.baht(F.profit)}`]] }; });
  X.register('c_mix', x => { const c = byId(x.cid), X9 = M0.mix, m = c ? R.salesMix(x.seed, c.id, { unit: x.unit, today: x.today }) : { channels: [] };
    return { key: 'c_mix', title: X9.title, header: [M0.chT.cols.channel, 'Target', X9.target, U.actualWord(), X9.actual], cols: ['text', 'money', 'pct', 'money', 'pct'],
      rows: m.channels.map(r => [C.channel[r.channel], r.target, r.tShare, r.actual, r.aShare]).concat(m.channels.flatMap(r => r.subs.map(s => [`    ${C.channel[r.channel]} · ${s.sub}`, null, null, s.actual, s.share]))) }; });
  X.register('c_channel', x => { const c = byId(x.cid), T = M0.chT, Kc = T.cols; if (!c) return { key: 'c_channel', title: T.title, header: [Kc.channel], rows: [] };
    const a = R.attainment(x.seed, c.id, { channel: x.channel, unit: x.unit, today: x.today }), tg = R.timeGone(c, x.today), tot = a.total.actTD;
    const line = (name, n) => { const p = R.paceNode(n, tg); return [name, n.actTD, tot ? (n.actTD || 0) / tot : null, n.target, p.achF, p.gapPace, n.remaining, p.status ? C.yr.st[p.status] : '', n.tgtTD]; };
    return { key: 'c_channel', title: T.title, header: [Kc.channel, Kc.actual, Kc.share, Kc.full, Kc.ach, Kc.gap, Kc.remaining, Kc.status, C.money.tgtTD.h], cols: ['text', 'money', 'pct', 'money', 'pct', 'money', 'money', 'text', 'money'],
      rows: a.channels.map(r => line(C.channel[r.channel], r.node)), total: line(K.total, a.total) }; });
  X.register('c_matrix', x => { const c = byId(x.cid), T = M0.mx; if (!c) return { key: 'c_matrix', title: T.title, header: [T.cols.sku], rows: [] };
    const { m, rows, nm } = mxRows(c);
    return { key: 'c_matrix', title: T.title, header: [T.cols.sku, 'Code'].concat(m.channels.map(k => `${C.channel[k]} actual`), m.channels.map(k => `${C.channel[k]} Ach %`), [T.cols.total, T.cols.share, T.cols.ach, T.cols.status]),
      cols: ['text', 'text'].concat(m.channels.map(() => 'money'), m.channels.map(() => 'pct'), ['money', 'pct', 'pct', 'text']),
      rows: rows.map(s => [{ v: nm(s), bold: true }, s.product.code || ''].concat(m.channels.map(k => (s.byCh[k] ? s.byCh[k].actual : null)), m.channels.map(k => (s.byCh[k] ? s.byCh[k].achF : null)), [s.total.actual, s.total.share, s.total.achF, s.total.status ? C.yr.st[s.total.status] : ''])),
      total: [T.total, ''].concat(m.channels.map(k => (m.byCh[k] ? m.byCh[k].actual : null)), m.channels.map(k => (m.byCh[k] ? m.byCh[k].achF : null)), [m.total.actual, m.total.actual ? 1 : null, m.total.achF, m.total.status ? C.yr.st[m.total.status] : '']) }; });
  X.register('c_lines', x => { const c = byId(x.cid), L = M0.lines, Kc = L.cols, t = c ? trackOf(c) : null; if (!t) return { key: 'c_lines', title: L.title, header: [Kc.line], rows: [] };
    const ended = x.today > c.end, line = (n, z, b) => [{ v: n, bold: b }, z.current, z.committed, z.used, z.remaining, (L.st[lineSt(z.used, ended)] || '')];
    return { key: 'c_lines', title: L.title, header: [Kc.line, Kc.current, Kc.spent, Kc.used, Kc.remaining, Kc.status], cols: ['text', 'money', 'money', 'pct', 'money', 'text'],
      rows: GROUPS.flatMap(g => { const ls = t.lines.filter(l => l.type === g); if (!ls.length) return []; const s = k => ls.reduce((a, l) => a + (l[k] || 0), 0), G = { current: s('current'), committed: s('committed') }; G.remaining = G.current - G.committed; G.used = R.ratio(G.committed, G.current);
        return [line(C.plan.grid.groups[g], G, true)].concat(ls.slice().sort((a, b) => (b.used ?? -1) - (a.used ?? -1)).map(l => line(`    ${l.line}`, l, false))); }), total: line(C.common.total, t, true) }; });
  X.register('c_svm', x => { const c = byId(x.cid), T = M0.svm; if (!c) return { key: 'c_svm', title: T.title, header: ['Month'], rows: [] };
    const d = svmData(c), e = R.mktEfficiency(x.seed, Object.assign(pnlCtx(c), { statuses: R.STATUSES.slice(), includeCancelled: true })).byId.get(c.id) || {}, dr = R.afterMarketingDrop(x.seed, c.id, x.today);
    return { key: 'c_svm', title: T.title, header: [D.m.cols.month, T.bars, T.line], cols: ['text', 'money', 'money'], rows: d.rows.map(r => [R.monthName(r.m), r.actual, r.rev]),
      notes: [T.eff(R.times(e.actual), R.times(e.plan)), dr.drop == null ? T.noDrop : T.drop((dr.drop > 0 ? '+' : '') + R.pct(dr.drop))] }; });

  /* ---------- events ---------- */
  const scopeText = () => { const c = byId(st.cid); return `${c ? c.name : ''}${ch() && st.tab === 'sales' ? ' ' + ch() : ''}`; };
  const meta = () => { const c = byId(st.cid); return P.metaRows([[D.meta.tab, `${M0.title} › ${M0.tabs[st.tab]}`], [D.meta.campaign, c ? `${c.name} · ${R.dmy(c.start)} – ${R.dmy(c.end)}` : ''], [D.meta.channel, ch() ? C.channel[ch()] : K.all]]); };
  function onClick(e) {
    const t = e.target;
    if (P.onShowTarget(e, TAB, renderAll)) return;
    const mt = t.closest('[data-mtab]'); if (mt) { e.preventDefault(); stick.toTop(); go(st.cid, mt.dataset.mtab); return; }
    if (t.closest('[data-export]')) { U.saveXlsx(D.file.campaign, scopeText(), X.tabTables('monitor', ctx()), meta()); return; }
    const dl = t.closest('[data-dl]'); if (dl) { U.saveXlsx(D.file[dl.dataset.dl] || dl.dataset.dl, scopeText(), [X.rowsFor(dl.dataset.dl, ctx())], meta()); return; }
    if (t.closest('[data-mreq]')) { CP.reqdraw.open(st.cid); return; }
    if (t.closest('[data-gosku]')) { st.mxTab = 'behind'; st.channel = 'all'; save(); go(st.cid, 'sales'); setTimeout(() => { const b = $('m_mx'); if (b) b.scrollIntoView({ block: 'start' }); }, 80); return; }
    const cp = t.closest('[data-cmp]'); if (cp) { const [a, b] = cp.dataset.cmp.split('|').map(Number); openCompare(a, b); return; }
    const sb = t.closest('[data-step]'); if (sb) { step(+sb.dataset.step); return; }
    const pn = CP.pnl.onClick(e, st); if (pn) { save(); const c = byId(st.cid); if (pn === 'st') $('m_st').innerHTML = CP.pnl.statementHTML(pnlCtx(c)); return; }
    const ws = t.closest('.seg[data-wside] button'); if (ws) { st.side = ws.dataset.v; save(); renderWf(); return; }
    const bm = t.closest('.seg[data-mbva] button'); if (bm) { st.bva = bm.dataset.v === 'cumulative' ? 'cumulative' : 'monthly'; save(); renderBva(); return; }
    const bg = t.closest('[data-bgopen]'); if (bg) { const s = new Set(st.bgOpen), k = bg.dataset.bgopen; if (s.has(k)) s.delete(k); else s.add(k); st.bgOpen = [...s]; save(); const c = byId(st.cid); renderLines(c, trackOf(c)); const again = el.querySelector(`[data-bgopen="${k}"]`); if (again) again.focus(); return; }
    const vw = t.closest('[data-view]'); if (vw) { const k = vw.dataset.view; st[k] = st[k] === 'table' ? (k === 'mView' ? 'chart' : 'list') : 'table'; save(); ({ mView: renderMonth, chView: renderCh, mxView: renderMatrix })[k](); return; }
    const sg = t.closest('.seg[data-chf] button, .seg[data-unit] button, .seg[data-bmode] button, .seg[data-mby] button, .seg[data-mxseg] button');
    if (sg) { const g = sg.closest('.seg'), v = sg.dataset.v;
      if (g.hasAttribute('data-chf')) { st.channel = oneOf(v, CHS, 'all'); save(); renderSales(byId(st.cid)); return; }
      if (g.hasAttribute('data-unit')) { st.unit = v === 'qty' ? 'qty' : 'amount'; save(); renderSales(byId(st.cid)); return; }
      if (g.hasAttribute('data-mby')) { st.mBy = v === 'channel' ? 'channel' : 'total'; save(); renderMonth(); return; }
      if (g.hasAttribute('data-mxseg')) { st.mxSeg = oneOf(v, ['actual', 'ach', 'share'], 'actual'); save(); renderMatrix(); return; }
      st.mode = v === 'cumulative' ? 'cumulative' : 'monthly'; save(); renderMonth(); return; }
    const tb = t.closest('[data-mxtab]'); if (tb) { st.mxTab = tb.dataset.mxtab; save(); renderMatrix(); return; }
    const fd = t.closest('[data-chfold]'); if (fd) { const s = new Set(st.chFolded), k = fd.dataset.chfold; if (s.has(k)) s.delete(k); else s.add(k); st.chFolded = [...s]; save(); renderCh(); }
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-myear]')) { st.year = +t.value; const list = camps().filter(c => yearOf(c) === st.year), o = order().find(id => list.some(c => c.id === id)) || (list[0] || {}).id; if (o) go(o); return; }
    if (t.matches('[data-mxsort]')) { st.mxSort = oneOf(t.value, ['actual', 'gap', 'ach', 'name'], 'actual'); save(); renderMatrix(); }
  }
  return { render, current: () => st.cid, order, nums, mxRows, svmData };
})();
