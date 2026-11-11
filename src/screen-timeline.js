/* screen-timeline.js — Campaign Planning › Timeline (CR-06 §5 · D56 · CR-07 §6 · CR-09 §5.5 — the bar of the Dashboard, U.timelineLite · 3 months back → 12 ahead ·
   the rows outside fold into one line · the colour = the state of the plan): when does each Campaign start — every approval state, for planning (the
   Dashboard's calendar stays for the results: approved only). The toolbar and the status tabs are the Plans table's (screen-planning.js). → CP.ktimeline
   CR-07 R6: the axis has room on the left (the first month's name is never cut) · a start date that would sit on the Today line goes to the other side of the
   bar's start · the "Today" word turns to the right when Today is at the left edge.
   Card head: Month | Quarter (the column) · Group None | Owner | Approval · Export (1 sheet) · the axis: the Year = Jan–Dec · All years = the month of the first
   Start → the month of the last End · the month names as KOL (Jan + the year under the first month and where the year changes) · this month bold ·
   the Today line (red, dashed) · Running = Approved Campaigns live in that column (not cancelled · all of them, whatever the filters) · a row: name + owner ·
   a chip when not Approved · the bar Start → End marketing · the line → End campaign (the gantt pieces of Overview: ganttAxis · .gbar · .gline) ·
   the start date at the head of the bar (◀ dd/mm/yyyy when it starts before the axis) · the summary on the right · a row / bar opens the Campaign page ·
   ↑ ↓ Enter · the card scrolls sideways (name and summary stay) and opens with Today in the middle. */
CP.ktimeline = (function () {
  'use strict';
  const U = CP.ui, { C, R, esc, pref, ICON, labelInfo, segHTML } = U;
  const K = C.camps, T = K.tl, AP = C.appr, Dp = C.dash.p;
  const st = Object.assign({ scale: 'month', group: 'none' }, pref.json('ktl', {}) || {});
  if (!['month', 'quarter'].includes(st.scale)) st.scale = 'month';
  if (!['none', 'owner', 'approval'].includes(st.group)) st.group = 'none';
  const save = () => pref.setJson('ktl', st);
  const COLW = { month: 56, quarter: 120 };
  const APPR_ORDER = ['approved', 'submitted', 'returned', 'draft', 'rejected'];

  /* the axis: [from, to] (whole months) and its columns (a month · a quarter) */
  function axisOf(x) {
    let a, b;
    if (x.year !== 'all') { a = `${x.year}-01`; b = `${x.year}-12`; }
    else { const cs = x.rows.length ? x.rows : x.all; if (!cs.length) { a = b = R.ym(x.today); } else { a = R.ym(cs.reduce((m, c) => (c.start < m ? c.start : m), cs[0].start)); b = R.ym(cs.reduce((m, c) => (c.end > m ? c.end : m), cs[0].end)); } }
    if (st.scale === 'quarter') { const q = m => `${m.slice(0, 4)}-${String(Math.floor((+m.slice(5, 7) - 1) / 3) * 3 + 1).padStart(2, '0')}`; a = q(a); b = R.addMonths(q(b), 2); }
    const months = R.monthsIn(R.monthFirst(a), R.monthLast(b)), cols = [];
    if (st.scale === 'quarter') for (let i = 0; i < months.length; i += 3) cols.push({ from: months[i], to: months[Math.min(i + 2, months.length - 1)] });
    else months.forEach(m => cols.push({ from: m, to: m }));
    return { from: R.monthFirst(months[0]), to: R.monthLast(months[months.length - 1]), cols };
  }
  const qOf = m => Math.floor((+m.slice(5, 7) - 1) / 3) + 1;
  /* the approval of a row · its bar class: Approved = the time status · Draft · Pending approval · Returned · Rejected · Cancelled */
  const apprOf = c => c.approval || 'draft';
  function barCls(c, td) {
    const s = R.statusOf(c, td), a = apprOf(c);
    if (s === R.CANCELLED) return 'kcan';
    return a === 'approved' ? s : a === 'submitted' ? 'kpend' : a === 'returned' ? 'kret' : a === 'rejected' ? 'krej' : 'kdraft';
  }
  /* the summary on the right: Starts in 58 days · 57 days left · Ended 30/09/2026 · Draft · starts 01/04/2027 · Cancelled 20/07/2026 */
  function summary(c, td) {
    const s = R.statusOf(c, td), a = apprOf(c);
    if (s === R.CANCELLED) return T.cancelledOn(R.dmy(String(c.updated_at || c.end).slice(0, 10)));
    if (a !== 'approved') return T.notApproved(AP.state[a] || a, R.dmy(c.start));
    const d = R.daysLeft(c, td);
    return d.kind === 'ended' ? Dp.endedOn(R.dmy(c.end)) : d.kind === 'starts' ? (d.n === 0 ? Dp.startsToday : Dp.startsIn(d.n)) : d.n === 0 ? Dp.endsToday : Dp.daysLeft(d.n);
  }
  /* Running: Approved and not cancelled, live at any day of the column — every Campaign, whatever the search / tab */
  function running(all, cols, td) {
    const live = all.filter(c => apprOf(c) === 'approved' && R.statusOf(c, td) !== R.CANCELLED);
    return cols.map(k => live.filter(c => c.start <= R.monthLast(k.to) && c.end >= R.monthFirst(k.from)).length);
  }
  function groupsOf(rows) {
    if (st.group === 'none') return [{ key: '', rows }];
    const m = new Map(), key = c => (st.group === 'owner' ? c.owner || '—' : apprOf(c));
    rows.forEach(c => { const k = key(c); if (!m.has(k)) m.set(k, []); m.get(k).push(c); });
    const keys = [...m.keys()].sort((a, b) => (st.group === 'approval' ? APPR_ORDER.indexOf(a) - APPR_ORDER.indexOf(b) : a.localeCompare(b, 'en')));
    return keys.map(k => ({ key: k, rows: m.get(k) }));
  }

  /* ===================== the card — CR-09 §5.5 (D88): the bar of the Dashboard (U.timelineLite) · 3 months back → 12 ahead at first (a Year = Jan – Dec) ·
     the rows wholly outside fold into one line each (ended before · start after) · Running (approved) on top · the colour = the state of the plan ===================== */
  const fold = { before: false, after: false };
  function rangeOf(x) {
    if (x.year !== 'all') return { from: `${x.year}-01-01`, to: `${x.year}-12-31` };
    const a = R.addMonths(R.ym(x.today), -3), b = R.addMonths(R.ym(x.today), 12);
    if (st.scale !== 'quarter') return { from: R.monthFirst(a), to: R.monthLast(b) };
    const q = m => `${m.slice(0, 4)}-${String(Math.floor((+m.slice(5, 7) - 1) / 3) * 3 + 1).padStart(2, '0')}`;
    return { from: R.monthFirst(q(a)), to: R.monthLast(R.addMonths(q(b), 2)) };
  }
  /* the bar of a plan: Approved — running (solid to today · faded after) · not started (light blue) · ended (dark grey) · Draft (dashed) · In review (hatched) ·
     Returned (orange outline) · Rejected · Cancelled */
  function planCls(c, td) {
    const s = R.statusOf(c, td), a = apprOf(c);
    if (s === R.CANCELLED) return 'cancelled';
    if (a === 'approved') return s === 'ongoing' ? 'p-run' : s === 'not_started' ? 'p-ns' : 'ended';
    return a === 'submitted' ? 'p-rev' : a === 'returned' ? 'p-ret' : a === 'rejected' ? 'p-rej' : 'p-draft';
  }
  function render(box, x) {
    const td = x.today, Rg = rangeOf(x), all = x.rows, T2 = C.plng.tl2, L = T2.legend;
    const before = all.filter(c => c.end < Rg.from), after = all.filter(c => c.start > Rg.to), inside = all.filter(c => c.end >= Rg.from && c.start <= Rg.to);
    const months = R.monthsIn(Rg.from, Rg.to).filter((m, i) => st.scale !== 'quarter' || i % 3 === 0);
    const cols = months.map((m, i) => ({ from: m, to: st.scale === 'quarter' ? R.addMonths(m, 2) : m })), run = running(x.all, cols, td), max = Math.max(1, ...run);
    const rowOf = c => { const cls = planCls(c, td), a = apprOf(c), sum = summary(c, td), N = (x.nums && x.nums.get(c.id)) || {}, chip = (cls === 'cancelled' ? U.statusChip(R.CANCELLED) : a === 'approved' ? '' : U.apChip(a)) + (x.seed && x.seed.plans && R.cancelPending(x.seed.plans[c.id]) ? `<span class="chip warn" data-cxchip>${esc(C.cpg.pending.cancel)}</span>` : '');   /* CR-15 §2.3 */
      const tip = [c.name, `${T.tip2.approval} ${AP.state[a] || a} · ${T.tip2.status} ${C.status[R.statusOf(c, td)]}`, `${R.dmy(c.start)} – ${R.dmy(c.end)}`, c.end_marketing ? `${C.dash.t.span.marketing} ${R.dmy(c.end_marketing)}` : T.tip2.noEndMkt,
        `${T.tip2.owner} ${c.owner || '—'}`, `${T.tip2.target} ${N.target == null ? '—' : R.baht(N.target)} · ${T.tip2.budget} ${N.budget == null ? '—' : R.baht(N.budget)}`].join('\n');
      return { id: c.id, open: true, name: c.name, nameHTML: `<div class="kgn">${U.avatar(c.owner, true)}<b>${esc(c.name)}</b></div>${chip ? `<div class="kgc">${chip}</div>` : ''}`, start: c.start, end: c.end, endMkt: c.end_marketing || null,
        cls, single: cls !== 'p-run', cancelled: cls === 'cancelled', sum, sumCls: a === 'approved' && cls !== 'cancelled' ? '' : 'none', tip, title: tip, mktTip: `${C.dash.t.span.marketing} ${R.dmy(c.end_marketing)}`, aria: `${c.name} · ${AP.state[a] || a} · ${sum}` }; };
    const groups = groupsOf(inside), mo = R.monthName(R.ym(Rg.from)).replace(/^(\w{3})\w*/, '$1'), mt = R.monthName(R.ym(Rg.to)).replace(/^(\w{3})\w*/, '$1');
    const rows = [];
    if (before.length) { rows.push({ fold: T2.before(before.length, mo), key: 'before', show: fold.before ? T2.hide : T2.show }); if (fold.before) before.forEach(c => rows.push(rowOf(c))); }
    groups.forEach(g => { if (g.key) rows.push({ head: st.group === 'owner' ? T.groupOwner(g.key) : AP.state[g.key] || g.key, n: g.rows.length }); g.rows.forEach(c => rows.push(rowOf(c))); });
    if (after.length) { rows.push({ fold: T2.after(after.length, mt), key: 'after', show: fold.after ? T2.hide : T2.show }); if (fold.after) after.forEach(c => rows.push(rowOf(c))); }
    /* the shown rows that reach outside the axis are clipped there (fold open) */
    const extra = ax => `<tr class="krun"><td class="gn"><span class="tiph" title="${esc(T.runningTip)}">${esc(T2.running)}</span></td><td class="gtl"><div class="gt-row">${ax.grid}${ax.today}` +
      cols.map((k, i) => { const l = ax.pct(R.monthFirst(k.from)), w = ax.pct(R.addDays(R.monthLast(k.to), 1)) - l;
        return `<span class="krn" style="left:${l}%;width:${w}%" title="${esc(T.runningN(run[i], st.scale === 'quarter' ? `Q${qOf(k.from)} ${k.from.slice(0, 4)}` : R.monthName(k.from)))}"><b>${run[i] || ''}</b>${run[i] ? `<i style="width:${(run[i] / max * 70).toFixed(1)}%"></i>` : ''}</span>`; }).join('') + `</div></td><td class="gs"></td></tr>`;
    const leg = (cls, w) => `<span><i class="tlb ${cls}"></i>${esc(w)}</span>`;
    box.innerHTML = `<div class="card-head"><h3>${labelInfo(T2.title, T2.tip)} <span class="hnote">${all.length}</span></h3><div class="ctl">` +
      segHTML('data-tlscale', [{ v: 'month', label: T.month }, { v: 'quarter', label: T.quarter }], st.scale, { label: T.scaleL }) +
      `<span class="ktlg-l">${esc(T.groupL)}</span>` + segHTML('data-tlgroup', ['none', 'owner', 'approval'].map(v => ({ v, label: T.groups[v] })), st.group, { label: T.groupL }) +
      `<button type="button" class="btn small" data-tlexport>${ICON.download}<span>${esc(C.dash.downloadXlsx)}</span></button></div></div>` +
      `<div class="tl-sub"><span class="legend tl-leg">${leg('p-run past', L.run)}${leg('p-ns', L.ns)}${leg('ended', L.ended)}${leg('p-draft', L.draft)}${leg('p-rev', L.review)}${leg('p-ret', L.ret)}${x.includeCancelled ? leg('cancelled', L.can) : ''}<span><i class="tlm lg"></i>${esc(L.endMkt)}</span></span></div>` +
      (all.length ? `<div class="tl-box">${U.timelineLite(rows, { from: Rg.from, to: Rg.to, months, today: td, all: true, cols: { campaign: C.dash.t.cols.campaign, summary: T.summary }, todayWord: C.dash.m.today,
        label: st.scale === 'quarter' ? m => `Q${qOf(m)}` : null, extra })}</div>` : `<div class="c3-empty">${esc(K.noMatch)}</div>`);
  }

  /* ===================== Export: 1 sheet ===================== */
  function table(x) {
    const td = x.today, H = T.cols;
    return { key: 'ktimeline', title: T.title, header: [H.campaign, H.approval, H.status, H.start, H.endMkt, H.end, H.owner, H.when],
      cols: x.rows.length ? Array(8).fill('text') : [],
      rows: x.rows.map(c => [{ v: c.name, bold: true }, AP.state[apprOf(c)] || apprOf(c), C.status[R.statusOf(c, td)], R.dmy(c.start), c.end_marketing ? R.dmy(c.end_marketing) : '', R.dmy(c.end), c.owner || '', summary(c, td)]) };
  }

  /* the card's own controls (the toolbar is the table's) */
  document.addEventListener('click', e => {
    const f = e.target.closest('#k_tl [data-tlshow]'); if (f) { fold[f.dataset.tlshow] = !fold[f.dataset.tlshow]; if (CP.screens.planning && CP.screens.planning.renderTimeline) CP.screens.planning.renderTimeline(); return; }
    const b = e.target.closest('.seg[data-tlscale] button, .seg[data-tlgroup] button'); if (!b) return;
    if (b.closest('[data-tlscale]')) st.scale = b.dataset.v; else st.group = b.dataset.v;
    save(); if (CP.screens.planning && CP.screens.planning.renderTimeline) CP.screens.planning.renderTimeline();
  });
  return { render, table, axisOf, rangeOf, running, summary, planCls, st };
})();
