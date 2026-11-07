/* rules-list.js — the Campaign list of the demo (CR-03 §5 · CR-06: Mock only), pure functions (no DOM, no files) → added to CP.rules (R)
   the id of a new Campaign · the checks of the form · the status words · the change of a Save (add · edit · cancel · restore) ·
   applyList(seed, list): the list kept in this browser over the made-up seed — a new or edited Campaign shows at once · the sorts of the Campaigns page.
   The CSV / P&L-file side (campaigns.csv · the log · the folder checks · mergeList of the build) is in archive/v0.5-real/. */
Object.assign(CP.rules, (function (R) {
  'use strict';
  const C = CP.content;
  const WORD = { ongoing: 'On going', not_started: 'Not started', complete: 'Complete', cancelled: 'Cancelled' };
  const KEY = { 'on going': 'ongoing', ongoing: 'ongoing', 'not started': 'not_started', complete: 'complete', completed: 'complete', cancelled: 'cancelled', canceled: 'cancelled' };
  const fold = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
  const statusKey = w => KEY[fold(w)] || 'ongoing';

  /* ===================== id ===================== */
  const slug = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  /* a slug of the name · nothing left (a Thai name) → campaign-yyyymmdd · taken → -2, -3 … (the ids of every row, Cancelled too) */
  function campaignId(name, rows, today) {
    const base = slug(name) || `campaign-${String(today || R.todayISO()).replace(/-/g, '')}`, used = new Set((rows || []).map(r => r.id));
    if (!used.has(base)) return base;
    for (let k = 2; ; k++) if (!used.has(`${base}-${k}`)) return `${base}-${k}`;
  }

  /* ===================== status (§4 · D25) ===================== */
  /* the word a Save writes: Cancelled · Complete (closed early or past End) · else worked out from the dates */
  function statusAuto(row, today) {
    const k = statusKey(row.status), td = today || R.todayISO();
    if (k === 'cancelled') return WORD.cancelled;
    if (row.end && td > row.end) return WORD.complete;
    if (k === 'complete') return WORD.complete;
    return row.start && td < row.start ? WORD.not_started : WORD.ongoing;
  }

  /* ===================== the checks of the form ===================== */
  /* form { name, start, end, end_marketing } · id = the row being edited → { field: message } (empty = valid) */
  function validateCampaign(form, rows, id) {
    const V = C.camps.v, e = {}, name = String(form.name || '').trim(), others = (rows || []).filter(r => r.id !== id);
    if (!name) e.name = V.nameReq;
    else if (name.length > 80) e.name = V.nameLong;
    else { const dup = others.find(r => fold(r.campaign) === fold(name)); if (dup) e.name = V.nameDup(dup.campaign, statusKey(dup.status) === 'cancelled'); }
    if (!form.start) e.start = V.startReq; else if (!R.isISODate(form.start)) e.start = V.date;
    if (!form.end) e.end = V.endReq; else if (!R.isISODate(form.end)) e.end = V.date;
    else if (R.isISODate(form.start) && form.end < form.start) e.end = V.endBefore;
    if (form.end_marketing) {
      if (!R.isISODate(form.end_marketing)) e.end_marketing = V.date;
      else if ((form.start && form.end_marketing < form.start) || (form.end && form.end_marketing > form.end)) e.end_marketing = V.endMktOut;
    }
    return e;
  }

  /* ===================== a Save: the rows after it ===================== */
  /* local time yyyy-mm-ddThh:mm:ss */
  const nowLocal = (d = new Date()) => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
  /* change = { action 'add' | 'edit' | 'cancel' | 'restore', id, values {campaign, start, end, end_marketing, status ('auto' | 'complete' | 'cancelled'), note, owner} } */
  function applyChange(rows, change, today, at) {
    const out = rows.map(r => Object.assign({}, r)), stamp = at || nowLocal(), td = today || R.todayISO();
    const v = change.values || {}, word = (st, row) => (st === 'cancelled' ? WORD.cancelled : st === 'complete' ? WORD.complete : statusAuto(Object.assign({}, row, { status: '' }), td));
    if (change.action === 'add') {
      const row = { id: change.id, campaign: v.campaign.trim(), start: v.start, end: v.end, end_marketing: v.end_marketing || '', status: '', note: v.note || '', created_at: stamp, updated_at: stamp, owner: v.owner || '' };
      row.status = word(v.status, row);
      out.push(row);
      return { rows: out, row, before: null };
    }
    const i = out.findIndex(r => r.id === change.id); if (i < 0) throw new Error('not in the list: ' + change.id);
    const before = Object.assign({}, out[i]), row = out[i];
    if (change.action === 'edit') {
      Object.assign(row, { campaign: v.campaign.trim(), start: v.start, end: v.end, end_marketing: v.end_marketing || '' });
      if (v.note !== undefined) row.note = v.note || '';
      row.status = word(v.status, row);
    } else if (change.action === 'cancel') { row.status = WORD.cancelled; if (v.note) row.note = v.note; }
    else if (change.action === 'restore') row.status = word('auto', row);
    row.updated_at = stamp;
    return { rows: out, row, before };
  }

  /* ===================== the list of this browser over the made-up seed ===================== */
  const OVER = new WeakMap();
  /* list rows set name · start · end · end_marketing · status · note · owner of the seed's Campaigns · a row the seed has not got = a new Campaign
     (no numbers yet: its plan is a Draft, D50) · one object a pair */
  function applyList(seed, list) {
    if (!list || !Array.isArray(list.rows) || !seed) return seed;
    let byList = OVER.get(seed); if (!byList) OVER.set(seed, byList = new WeakMap());
    if (byList.has(list)) return byList.get(list);
    const byId = new Map((seed.campaigns || []).map(c => [c.id, c])), seen = new Set(), campaigns = [];
    list.rows.forEach(r => {
      const id = r.id || slug(r.campaign); if (!id || seen.has(id)) return; seen.add(id);
      const s = byId.get(id) || {}, endm = R.isISODate(r.end_marketing) ? r.end_marketing : null;
      campaigns.push(Object.assign({}, s, { id, name: String(r.campaign || '').trim(), start: r.start, end: r.end, end_marketing: endm, status: statusKey(r.status), year: +String(r.start).slice(0, 4),
        note: r.note || null, created_at: r.created_at || s.created_at || null, updated_at: r.updated_at || s.updated_at || null, owner: r.owner || s.owner || null, plan: 'web' }));
    });
    const out = Object.assign({}, seed, { campaigns });
    byList.set(list, out);
    return out;
  }

  /* ===================== the Campaigns page ===================== */
  const LIST_SORTS = ['status', 'start', 'name', 'updated'];
  const ST_RANK = { ongoing: 0, not_started: 1, complete: 2, cancelled: 3 };
  function sortList(rows, key, today) {
    const nm = (a, b) => a.name.localeCompare(b.name, 'en');
    const f = { status: (a, b) => ST_RANK[R.statusOf(a, today)] - ST_RANK[R.statusOf(b, today)] || (a.end < b.end ? -1 : a.end > b.end ? 1 : 0) || nm(a, b),
      start: (a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0) || nm(a, b), name: nm,
      updated: (a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || nm(a, b) }[LIST_SORTS.includes(key) ? key : 'status'];
    return rows.slice().sort(f);
  }

  return { STATUS_WORD: WORD, statusKey, campaignId, statusAuto, validateCampaign, nowLocal, applyChange, applyList, LIST_SORTS, sortList };
})(CP.rules));
