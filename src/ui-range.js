/* ui-range.js — KOL CR-10 §4.8 range field + picker (no library), here in whole months (CR-01 §5: Custom picks months · one Apply).
   The field keeps the ISO dates in data-from (1st of the first month) / data-to (last day of the last month). Apply writes them and sends one
   bubbling 'change' from the field, so a screen reads both ends at once (el.dataset.from / .to). The picker: a header with the range
   ("Jan – Mar 2026"), two years side by side (12 months each), first click = start, second = end (a click before the start becomes the start),
   hover shows the range, ✎ types the months (mm/yyyy, R.validateMonthRange), arrows move a month (↑ ↓ a quarter), PageUp / PageDown a year,
   Enter picks, Esc = Cancel; on a phone a full-screen sheet with the years one under another. Adds to CP.ui: rangeHTML · setRange · openRange. */
Object.assign(CP.ui, (function (U) {
  'use strict';
  const { C, R, $, esc, ICON } = U;
  const G = C.range;
  const short = m => `${R.monthShort(m)}`;
  /* "Jan – Mar 2026" · across years both carry the year · no end yet = "Jan 2026 – End month" */
  function bigText(a, b) {
    if (!a) return G.pick;
    if (!b) return `${short(a)} ${a.slice(0, 4)} – ${G.endMonth}`;
    return a.slice(0, 4) === b.slice(0, 4) ? (a === b ? R.monthName(a) : `${short(a)} – ${short(b)} ${b.slice(0, 4)}`) : `${R.monthName(a)} – ${R.monthName(b)}`;
  }
  const fieldText = (a, b) => (a && b ? `${R.dmy(a)} – ${R.dmy(b)}` : '');
  const mmyyyy = m => (m ? `${m.slice(5, 7)}/${m.slice(0, 4)}` : '');

  /* ---------- the field ---------- */
  const rangeHTML = (attrs, from, to, o = {}) => {
    const n = R.monthCount(from, to);
    return `<span class="drange" ${attrs} data-from="${esc(from || '')}" data-to="${esc(to || '')}">` +
      `<button type="button" class="drange-t" aria-haspopup="dialog"${o.label ? ` aria-label="${esc(o.label)}"` : ''}>${ICON.calendar}` +
      `<span class="drange-v${from && to ? '' : ' ph'}">${esc(fieldText(from, to) || G.placeholder)}</span>${n ? `<span class="drange-n">${esc(G.months(n))}</span>` : ''}</button></span>`;
  };
  function setRange(el, from, to, fire) {
    el.dataset.from = from || ''; el.dataset.to = to || '';
    const v = el.querySelector('.drange-v'); if (v) { v.textContent = fieldText(from, to) || G.placeholder; v.classList.toggle('ph', !(from && to)); }
    if (fire) el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------- the picker ---------- */
  let P = null;   // { el, anchor, from (yyyy-mm), to, hover, view (first year shown), focus (yyyy-mm), typing, errs }
  const wide = () => innerWidth >= 720;
  function dlgEl() {
    let d = $('drp');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'drp'; d.className = 'drp'; d.setAttribute('aria-label', G.title); document.body.appendChild(d);
      d.addEventListener('cancel', e => { e.preventDefault(); close(); });
      d.addEventListener('click', onClick); d.addEventListener('keydown', onKey); d.addEventListener('input', onType);
      d.addEventListener('mouseover', e => { const b = e.target.closest('[data-m]'); if (P && P.from && !P.to && b && b.dataset.m !== P.hover) { P.hover = b.dataset.m; paint(); } });
      d.addEventListener('mousedown', e => { if (e.target === d) close(); });
    }
    return d;
  }
  /* o = { anchor } — a hidden field opens from the button that asked (Custom) */
  function openRange(el, o = {}) {
    if (!el) return;
    const from = el.dataset.from ? R.ym(el.dataset.from) : '', to = el.dataset.to ? R.ym(el.dataset.to) : '';
    const focus = from || R.ym(R.todayISO());
    P = { el, anchor: o.anchor || null, from, to, hover: '', view: +focus.slice(0, 4), focus, typing: false, errs: [], startText: mmyyyy(from), endText: mmyyyy(to) };
    const d = dlgEl(); d.classList.toggle('sheet', !wide());
    draw();
    if (!d.open) d.showModal();
    place(); focusMonth();
  }
  function place() {
    const d = $('drp'); if (!wide()) { d.style.left = ''; d.style.top = ''; return; }
    const at = P.el.offsetParent || !P.anchor ? P.el : P.anchor;
    const r = at.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
    const left = Math.max(8, Math.min(r.left, innerWidth - w - 8)), below = r.bottom + 6, top = below + h > innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : Math.max(8, Math.min(below, innerHeight - h - 8));
    d.style.left = left + 'px'; d.style.top = top + 'px';
  }
  function close() {
    const d = $('drp'); if (d && d.open) d.close();
    const el = P && P.el, an = P && P.anchor; P = null;
    const back = el && el.isConnected && el.offsetParent ? el.querySelector('.drange-t') : an && an.isConnected ? an : null; if (back) back.focus();
  }
  function apply() {
    if (!P || !P.from || !P.to || P.errs.length) return;
    const { el, from, to } = P; close();
    if (el.isConnected) setRange(el, R.monthFirst(from), R.monthLast(to), true);
  }
  const inRange = (m, a, b) => a && b && m >= a && m <= b;
  function monthClass(m) {
    const a = P.from, b = P.to || (P.from && P.hover && P.hover >= P.from ? P.hover : ''), c = [];
    if (m === P.from) c.push('start'); if (P.to && m === P.to) c.push('end'); else if (!P.to && b && m === b) c.push('end', 'prev');
    if (inRange(m, a, b) && m !== a && m !== b) c.push('in');
    if (!P.to && b && inRange(m, a, b)) c.push('prev');
    if (m === R.ym(R.todayISO())) c.push('today');
    return c.join(' ');
  }
  function yearHTML(y) {
    let cells = '';
    for (let i = 1; i <= 12; i++) {
      const m = `${y}-${String(i).padStart(2, '0')}`;
      cells += `<button type="button" class="drp-d ${monthClass(m)}" data-m="${m}" tabindex="${m === P.focus ? 0 : -1}" aria-label="${esc(R.monthLong(m))}" aria-pressed="${m === P.from || m === P.to}"><span>${esc(R.monthShort(m))}</span></button>`;
    }
    return `<div class="drp-m" data-y="${y}"><div class="drp-mt">${y}</div><div class="drp-g mg" role="grid">${cells}</div></div>`;
  }
  function yearsHTML() {
    if (wide()) return `<div class="drp-nav"><button type="button" class="icon-btn" data-nav="-1" aria-label="${esc(G.prev)}">${ICON.prev}</button><button type="button" class="icon-btn" data-nav="1" aria-label="${esc(G.next)}">${ICON.next}</button></div>` +
      `<div class="drp-ms">${yearHTML(P.view)}${yearHTML(P.view + 1)}</div>`;
    let out = ''; for (let i = -1; i <= 2; i++) out += yearHTML(P.view + i);
    return `<div class="drp-ms vert">${out}</div>`;
  }
  function draw() {
    const d = $('drp'), ok = P.from && P.to && !P.errs.length;
    d.innerHTML = `<div class="drp-h"><div><div class="drp-l">${esc(G.selected)}</div><div class="drp-big" id="drp_big">${esc(bigText(P.from, P.to))}</div></div>` +
      `<button type="button" class="icon-btn drp-edit${P.typing ? ' on' : ''}" data-typing aria-pressed="${P.typing}" aria-label="${esc(P.typing ? G.showCalendar : G.typeDates)}" title="${esc(P.typing ? G.showCalendar : G.typeDates)}">${P.typing ? ICON.calendar : ICON.pencil}</button></div>` +
      (P.typing ? `<div class="drp-type"><div class="field"><label for="drp_s">${esc(G.start)}</label><input id="drp_s" inputmode="numeric" placeholder="${esc(C.common.datePh)}" value="${esc(P.startText)}" autocomplete="off"></div>` +
        `<div class="field"><label for="drp_e">${esc(G.end)}</label><input id="drp_e" inputmode="numeric" placeholder="${esc(C.common.datePh)}" value="${esc(P.endText)}" autocomplete="off"></div></div><div class="checks" id="drp_err"></div>` : '') +
      `<div class="drp-body" id="drp_body">${yearsHTML()}</div>` +
      `<div class="drp-f"><button type="button" class="btn" data-cancel>${esc(C.common.cancel)}</button><button type="button" class="btn primary" data-apply${ok ? '' : ' disabled'}>${esc(G.apply)}</button></div>`;
    errs();
  }
  function paint() {
    const d = $('drp');
    d.querySelectorAll('[data-m]').forEach(b => { const m = b.dataset.m; b.className = `drp-d ${monthClass(m)}`; b.setAttribute('aria-pressed', String(m === P.from || m === P.to)); b.tabIndex = m === P.focus ? 0 : -1; });
    $('drp_big').textContent = bigText(P.from, P.to);
    d.querySelector('[data-apply]').disabled = !(P.from && P.to && !P.errs.length);
  }
  function errs() { const e = $('drp_err'); if (e) e.innerHTML = U.checksHTML({ errs: P.errs }); }
  function focusMonth() { const b = $('drp') && $('drp').querySelector(`[data-m="${P.focus}"]`); if (b) b.focus(); }
  function pick(m) {
    if (!P.from || P.to) { P.from = m; P.to = ''; }
    else if (m < P.from) P.from = m;
    else P.to = m;
    P.focus = m; P.hover = ''; P.errs = []; P.startText = mmyyyy(P.from); P.endText = mmyyyy(P.to);
    if (P.typing) { $('drp_s').value = P.startText; $('drp_e').value = P.endText; errs(); }
    paint();
  }
  function goTo(m) {
    P.focus = m;
    const y = +m.slice(0, 4);
    if (wide() && y !== P.view && y !== P.view + 1) { P.view = y < P.view ? y : y - 1; $('drp_body').innerHTML = yearsHTML(); }
    else if (!wide() && !$('drp').querySelector(`[data-m="${m}"]`)) { P.view = y; $('drp_body').innerHTML = yearsHTML(); }
    paint(); focusMonth();
  }
  function onClick(e) {
    if (!P) return;
    const mb = e.target.closest('[data-m]'); if (mb) { pick(mb.dataset.m); return; }
    const nv = e.target.closest('[data-nav]'); if (nv) { P.view += +nv.dataset.nav; $('drp_body').innerHTML = yearsHTML(); return; }
    if (e.target.closest('[data-typing]')) { P.typing = !P.typing; draw(); place(); if (P.typing) $('drp_s').focus(); else focusMonth(); return; }
    if (e.target.closest('[data-cancel]')) { close(); return; }
    if (e.target.closest('[data-apply]')) apply();
  }
  function onType(e) {
    if (!P || !P.typing || !['drp_s', 'drp_e'].includes(e.target.id)) return;
    P.startText = $('drp_s').value; P.endText = $('drp_e').value;
    const r = R.validateMonthRange(P.startText, P.endText);
    P.errs = r.errs; P.from = r.from ? R.ym(r.from) : ''; P.to = r.to ? R.ym(r.to) : '';
    const jump = e.target.id === 'drp_s' ? P.from : P.to;
    if (jump) { P.focus = jump; const y = +jump.slice(0, 4); if (y !== P.view && y !== P.view + 1) { P.view = wide() && e.target.id === 'drp_e' ? y - 1 : y; $('drp_body').innerHTML = yearsHTML(); } }
    errs(); paint();
  }
  function onKey(e) {
    if (!P) return;
    if (e.key === 'Enter' && e.target.closest('#drp_s, #drp_e')) { e.preventDefault(); apply(); return; }
    const mb = e.target.closest('[data-m]'); if (!mb) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 }[e.key];
    if (step) { e.preventDefault(); goTo(R.addMonths(mb.dataset.m, step)); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(mb.dataset.m); }
  }
  document.addEventListener('click', e => { const t = e.target.closest('.drange-t'); if (t) openRange(t.closest('.drange')); });
  addEventListener('resize', () => { if (P && $('drp') && $('drp').open) { $('drp').classList.toggle('sheet', !wide()); draw(); place(); } });

  return { rangeHTML, setRange, openRange };
})(CP.ui));
