/* ui.js — the shared pieces of every screen, taken from KOL Management (ui.js) with the namespace KT → CP and restyled to v0.1.19:
   labelInfo · ⓘ popover · multiSelect / msLabel · ganttAxis · toast · download / downloadCSV · pref · shortNum / bahtShort · ICON —
   plus this app's own: the demo data (CR-06: Mock only) · KPI card · the one monthly chart (P&L by month = Target vs Actual, CR-02 §9) ·
   the table of CP.export rows · the empty state (F4) · a single choice with search · status chips. → CP.ui (U) */
CP.ui = (function () {
  'use strict';
  const C = CP.content, R = CP.rules;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => R.todayISO();

  /* per-viewer conveniences (preset · range · status · card toggles · open rows · folded menu · theme · tab · data mode) — never the data itself (§2.5) */
  const pref = {
    get(k, d) { try { const v = localStorage.getItem('charmiss_campaign_pnl_' + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('charmiss_campaign_pnl_' + k, v); } catch (e) { /* not remembered */ } },
    json(k, d) { try { const v = JSON.parse(pref.get(k, 'null')); return v == null ? d : v; } catch (e) { return d; } },
    setJson(k, v) { pref.set(k, JSON.stringify(v)); },
  };

  /* ===================== the demo data (CR-06 · D51: Mock only) — the made-up seed + its plans + what was clicked in this browser (D48 · D52) ===================== */
  /* R.mergePlans: the seed schema, so every rule works as before (an approved plan's target · budget · expenses · the approved requests) */
  const seed = () => { const D = CP.store.data(); return R.mergePlans(D.seed, D.plans); };
  const actualWord = w => w || C.dash.m.legend.actual;

  /* ===================== formats (KOL) ===================== */
  const trimZeros = s => s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  /* axis style: 1,500,000 → 1.5M · 774,579 → 774.6K */
  function shortNum(n) {
    const v = Number(n) || 0, a = Math.abs(v), sign = v < 0 ? '-' : '';
    if (a >= 1e6) return sign + trimZeros((a / 1e6).toFixed(2)) + 'M';
    if (a >= 1e3) return sign + trimZeros((a / 1e3).toFixed(1)) + 'K';
    return sign + Math.round(a).toLocaleString('en-US');
  }
  const bahtShort = n => (Number(n) < 0 ? '-' : '') + '฿' + shortNum(Math.abs(Number(n) || 0));
  const ICON = CP.icons;

  /* ===================== ⓘ (KOL CR-05 §4.6 · CR-11 §4.13): only beside a number that is worked out — every other label has its tooltip ===================== */
  const info = (body, heading) => {
    const o = typeof body === 'object' && body ? body : { h: heading || '', d: body || '' };
    return `<button type="button" class="info" data-info-h="${esc(o.h || '')}" data-info-d="${esc(o.d || '')}" data-info-f="${esc(o.f || '')}" aria-label="${esc(o.h || C.common.about)}" aria-expanded="false">ⓘ</button>`;
  };
  const infoObj = (body, heading) => (typeof body === 'object' && body ? body : { h: heading || '', d: body || '' });
  const isFormulaInfo = o => !!(o && o.f);
  const tipText = o => [o.d, o.f].filter(Boolean).join(' — ');
  /* "Net revenue ⓘ" for a worked-out number · otherwise the label with its explanation as the tooltip ·
     CR-08 §2.4 (D75) — ⓘ always AFTER the words, on every page (table headers too: "Ach % ⓘ" — the 4th argument of CR-01 C12 is no longer read) */
  const labelInfo = (label, body, heading) => {
    const o = infoObj(body, heading || label);
    if (!isFormulaInfo(o)) return `<span class="tiph"${tipText(o) ? ` title="${esc(tipText(o))}"` : ''}>${esc(label)}</span>`;
    /* the last word and ⓘ never part: a header that wraps keeps "date ⓘ" on one line */
    const t = String(label), i = t.length > 16 ? t.lastIndexOf(' ') : -1;   /* a short label stays whole */
    return `<span class="lbi">${i > 0 ? esc(t.slice(0, i + 1)) : ''}<span class="nw">${esc(i > 0 ? t.slice(i + 1) : t)}${info(o)}</span></span>`;
  };
  let infoBtn = null;
  function closeInfo(focusBack) { const p = $('infoPop'); if (p) p.remove(); if (infoBtn) { infoBtn.setAttribute('aria-expanded', 'false'); if (focusBack) infoBtn.focus(); } infoBtn = null; }
  function openInfo(btn) {
    closeInfo(); infoBtn = btn; btn.setAttribute('aria-expanded', 'true');
    const p = document.createElement('div'); p.id = 'infoPop'; p.className = 'infopop'; p.setAttribute('role', 'dialog'); p.tabIndex = -1;
    p.setAttribute('aria-label', btn.dataset.infoH || C.common.about);
    p.innerHTML = (btn.dataset.infoH ? `<b>${esc(btn.dataset.infoH)}</b>` : '') + `<p>${esc(btn.dataset.infoD)}</p>` + (btn.dataset.infoF ? `<p class="f">${esc(btn.dataset.infoF)}</p>` : '');
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    p.style.left = Math.max(8, Math.min(r.left - 12, innerWidth - w - 8)) + 'px';
    p.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
    p.focus();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('button.info[data-info-d]');
    if (b) { e.preventDefault(); e.stopPropagation(); if (infoBtn === b) closeInfo(); else openInfo(b); return; }
    if (infoBtn && !e.target.closest('#infoPop')) closeInfo();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && infoBtn) { e.stopPropagation(); closeInfo(true); } }, true);
  document.addEventListener('scroll', e => { if (infoBtn && !(e.target.closest && e.target.closest('#infoPop'))) closeInfo(); }, true);

  /* ===================== small helpers ===================== */
  /* QA-v0.13 B3 — a toast shows above an open dialog (the review of the Executive: Approved #2 · Undo) — a modal <dialog> is in the top layer,
     so the toast goes inside it while it is open and back to <body> when it closes */
  function toastHost() { let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    const d = [...document.querySelectorAll('dialog[open]')].pop(), want = d || document.body; if (t && t.parentNode !== want) want.appendChild(t); return t; }
  document.addEventListener('close', e => { const t = $('toast'); if (t && e.target && e.target.contains && e.target.contains(t)) document.body.appendChild(t); }, true);
  function toast(msg) { const t = toastHost(); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
  function download(name, data, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const csvCell = v => { const t = v == null ? '' : String(v); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  /* CSV for Excel: UTF-8 with BOM */
  function downloadCSV(name, header, rows) {
    download(name, '﻿' + [header].concat(rows).map(r => r.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  /* "—" in grey with the reason as its tooltip — never ฿0 for a value that is not there (§2.5) */
  const none = why => `<span class="none"${why ? ` title="${esc(why)}"` : ''}>${esc(C.common.none)}</span>`;
  /* money in a cell: ฿1,234 · negative red · null → "—" + why */
  const moneyCell = (v, why, o = {}) => (R.isNum(v) ? `<span class="${Math.round(v) < 0 ? 'neg' : ''}${o.cls ? ' ' + o.cls : ''}"${o.title ? ` title="${esc(o.title)}"` : ''}>${esc(R.baht(v))}</span>` : none(why));
  /* status chip (On going = accent · Complete = green · Not started = grey) */
  const statusChip = st => `<span class="st ${esc(st)}">${esc(C.status[st] || st)}</span>`;
  /* a segmented control: [{v, label}] · the one on = value */
  const segHTML = (attr, opts, value, o = {}) => `<div class="seg${o.dark ? ' dark' : ''}" ${attr} role="group"${o.label ? ` aria-label="${esc(o.label)}"` : ''}>` +
    opts.map(x => `<button type="button" data-v="${esc(x.v)}" class="${x.v === value ? 'on' : ''}" aria-pressed="${x.v === value}">${esc(x.label)}</button>`).join('') + '</div>';
  const checksHTML = res => (res.errs || []).map(x => `<div class="check err">✕ <span>${esc(x.msg)}</span></div>`).join('');
  /* attainment status (D14) — the words always written, the colour only helps: On target · At risk · Behind · No target */
  const attChip = st => (st ? `<span class="att ${esc(st)}">${esc(C.att[st])}</span>` : none(C.att.none));
  /* a fixed bar + the %: tone 'ok' | 'over' (red, Used > 100%) | an attainment status (its colour) */
  const pctBar = (v, why, cls, w) => (v == null ? none(why) : `<span class="used"><span class="ub"${w ? ` style="width:${w}px"` : ''}><i class="${esc(cls || '')}" style="width:${Math.max(v > 0 ? 2 : 0, Math.min(100, v * 100)).toFixed(1)}%"></i></span><span class="pc ${esc(cls || '')}">${esc(R.pctA(v, cls === 'ok' || cls === 'over'))}</span></span>`);
  /* CR-07 §3 — a bar of a share (Ach % · Used % · Time gone) + the black tick of Time gone · cls: on_track | at_risk | behind | ok | over | time (grey) */
  const paceBar = (v, tick, cls, w) => (v == null ? none() : `<span class="used pbw"><span class="ub"${w ? ` style="width:${w}px"` : ''}><i class="${esc(cls || '')}" style="width:${Math.max(v > 0 ? 2 : 0, Math.min(100, v * 100)).toFixed(1)}%"></i>` +
    `${tick != null ? `<b class="tg" style="left:${Math.max(0, Math.min(100, tick * 100)).toFixed(1)}%" title="${esc(`${C.yr.timeGone} ${R.pct(tick)}`)}"></b>` : ''}</span><span class="pc ${esc(cls || '')}">${esc(R.pctA(v, cls === 'ok' || cls === 'over'))}</span></span>`);
  /* the Pace status (On track · At risk · Behind) — "—" when not started or Time gone < 10% (D67) */
  const paceChip = st => (st ? `<span class="pchip ${esc(st)}">${esc(C.yr.st[st])}</span>` : none(C.yr.pace.earlyTip));
  /* one chip of R.issues: Behind · Over budget (urgent, red) · At risk · Near budget · Spending ahead · Ended over budget (watch, orange) · OK */
  const issueChip = key => `<span class="ichip ${esc(key)}${key === 'behind' || key === 'over' ? ' urgent' : key === 'ok' || key === 'on_track' ? '' : ' watch'}" title="${esc(C.yr.stTip[key] || '')}">${esc(C.yr.st[key] || key)}</span>`;
  /* R7 — a table over 50 rows: 1–50 of 312 ‹ › */
  const PAGE = 50;
  const pagerHTML = (n, page, attr) => { if (n <= PAGE) return ''; const pages = Math.ceil(n / PAGE), p = Math.min(Math.max(1, page), pages);
    return `<div class="pager"><span class="muted small">${esc(C.common.range((p - 1) * PAGE + 1, Math.min(n, p * PAGE), n))}</span><button type="button" class="btn small" ${attr}="-1" aria-label="${esc(C.common.prevPage)}"${p <= 1 ? ' disabled' : ''}>${ICON.prev}</button>` +
      `<button type="button" class="btn small" ${attr}="1" aria-label="${esc(C.common.nextPage)}"${p >= pages ? ' disabled' : ''}>${ICON.next}</button></div>`; };
  const pageOf = (n, page) => Math.min(Math.max(1, page || 1), Math.max(1, Math.ceil(n / PAGE)));
  /* a message in a card (a filter with nothing in it · Spend by line with no line) */
  const emptyState = o => `<div class="empty-st"><b>${esc(o.title || C.empty.title)}</b></div>`;
  /* CR-04 §7.3 — the one empty state of a tab: a band on top · No sales actual yet · Show target */
  const noSalesBand = (shown, words) => `<div class="nsband" role="status"><span class="nsb-t">${esc(words || C.empty.band)}</span><span class="links">` +
    `<button type="button" class="link" data-showtarget="${shown ? '0' : '1'}" aria-pressed="${!!shown}">${esc(shown ? C.empty.hideTarget : C.empty.showTarget)}</button></span></div>`;
  /* a card that needs actual, folded: its head + one grey line (~56px) */
  const foldedLine = words => `<div class="foldl">${esc(words || C.empty.card)}</div>`;

  /* ===================== the KPI card (CR-01 §2.3): label ⓘ · value + grey suffix · bar · a caption that may wrap ===================== */
  /* CR-04 §7.2 (P4) — no actual: o.goal = 'Target' | 'Budget' | 'Plan' → the goal as the value in grey with a small tag, an empty bar, the caption */
  const barSeg = (w, cls, style) => (w > 0 ? `<i class="${cls}" style="width:${Math.max(0.6, Math.min(100, w)).toFixed(2)}%${style ? ';' + style : ''}"></i>` : '');
  /* CR-08 §2.3 — o.tg = Time gone (0–1): the black tick on the bar (its tooltip "Time gone 85%") · o.key = data-kpi (the tests read the cards by it) */
  const kTick = tg => (tg == null ? '' : `<i class="ktick" style="left:${(Math.max(0, Math.min(1, tg)) * 100).toFixed(1)}%" title="${esc(`${C.yr.timeGone} ${R.pct(tg)}`)}"></i>`);
  const kpiCard = o => `<div class="kpi${o.goal ? ' goal' : ''}"${o.key ? ` data-kpi="${esc(o.key)}"` : ''}><div class="l">${o.label}</div>` +
    `<div class="v"><span class="vn${o.none ? ' none' : ''}${o.goal ? ' gv' : ''}${o.neg ? ' neg' : ''}"${o.valueTip ? ` title="${esc(o.valueTip)}"` : ''}>${esc(o.value)}</span>${o.goal ? `<span class="gtag">${esc(o.goal)}</span>` : ''}${o.badge || ''}${o.suffix ? `<small${o.suffixTip ? ` title="${esc(o.suffixTip)}"` : ''}>${esc(o.suffix)}</small>` : ''}</div>` +
    `<div class="kbar" role="img" aria-label="${esc(o.barTip || '')}"${o.barTip ? ` title="${esc(o.barTip)}"` : ''}>${o.bar || ''}${kTick(o.tg)}</div>` +
    `<div class="cap"${o.capTip ? ` title="${esc(o.capTip)}"` : ''}>${o.cap}</div></div>`;
  /* CR-04 §7.4 — the Time column: a short elapsed bar + 57 days left · Ended 30/09 · Starts in 58 days · Cancelled (the period in the tooltip) */
  function timeCell(t) {
    const P = C.dash.p, w = t.kind === 'cancelled' ? C.status.cancelled : t.kind === 'ended' ? P.endedOn(R.dm(t.end)) : t.kind === 'starts' ? (t.n === 0 ? P.startsToday : P.startsIn(t.n)) : t.n === 0 ? P.endsToday : P.daysLeft(t.n);
    return `<span class="tcell" title="${esc(P.period(R.dmy(t.start), R.dmy(t.end)))}"><span class="tb"><i style="width:${((t.pct || 0) * 100).toFixed(1)}%"></i></span><span class="tw${t.soon && t.kind === 'left' ? ' soon' : ''}${t.kind === 'cancelled' || t.kind === 'ended' ? ' muted' : ''}">${esc(w)}</span></span>`;
  }
  const estBadge = tip => `<span class="est" title="${esc(tip || C.est.tip)}">${esc(C.est.label)}</span>`;
  /* E1 → E: the mark of a COGS / GP / profit that holds an estimated COGS · amt = the revenue estimated · who = the Campaigns */
  const cogsEstTip = (amt, who) => C.cogsEst.tip(R.baht(amt), who);
  const cogsEstBadge = (amt, who) => estBadge(cogsEstTip(amt, who));

  /* ===================== horizontal bars (Spend by line · Sales › By channel): the label (+ a small line) · bar = fill, black tick = tick · the value at the end ·
     x.chev = { key, open, aria } a fold button (data-hbfold) · x.child = an indented row under it ===================== */
  function hbars(items, color) {
    const max = Math.max(1, ...items.flatMap(x => [x.fill, x.tick]).filter(R.isNum));
    return `<div class="hbars">${items.map(x => `<div class="hb${x.child ? ' child' : ''}${x.chev ? ' grp' : ''}"${x.tip ? ` title="${esc(x.tip)}"` : ''}><span class="hl">` +
      (x.chev ? `<button type="button" class="chev" data-hbfold="${esc(x.chev.key)}" aria-expanded="${!!x.chev.open}" aria-label="${esc(x.chev.aria)}">${ICON.chevronDown}</button>` : '') +
      `<span class="hlt">${esc(x.label)}${x.lsub ? ` <small>${esc(x.lsub)}</small>` : ''}</span></span>` +
      `<span class="ht">${R.isNum(x.fill) && x.fill > 0 ? `<i class="hf" style="width:${(x.fill / max * 100).toFixed(2)}%;--hc:${x.color || color}"></i>` : ''}${R.isNum(x.tick) && x.tick > 0 ? `<i class="hk" style="left:${(x.tick / max * 100).toFixed(2)}%"></i>` : ''}</span>` +
      `<span class="hv">${x.value}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span></div>`).join('')}</div>`;
  }

  /* ===================== CR-10 §2.2 (D98) — the tab bar that stays under the top bar (Dashboard · Monitor · Planning) ===================== */
  /* section gets .is-stuck once the bar reaches the top bar (a sentinel just before the bar knows where it would be) · CSS: the bar sticks · from 1280 px the
     toolbar of the page (.sticktools) sticks over it to the right — one row · toTop() = back to the top of the content (the bar just stuck) */
  function stickyTabs(section, bar) {
    if (!section || !bar) return { toTop() {} };
    bar.classList.add('stickytabs');
    let s = bar.previousElementSibling; if (!s || !s.classList.contains('stk-s')) { s = document.createElement('i'); s.className = 'stk-s'; s.setAttribute('aria-hidden', 'true'); bar.parentNode.insertBefore(s, bar); }
    const topH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 52;
    const on = () => { if (!section.offsetParent) return; section.classList.toggle('is-stuck', s.getBoundingClientRect().top < topH() - 0.5); };
    window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on); document.addEventListener('cp:contentresize', on); setTimeout(on, 0);
    return { on, toTop() { if (!section.classList.contains('is-stuck')) return; window.scrollTo(0, Math.max(0, window.scrollY + s.getBoundingClientRect().top - topH())); setTimeout(on, 0); } };
  }

  /* ===================== CR-08 §6.5 — the donut (KOL drawRing, CR-13 — copied back as the reuse rule asks) ===================== */
  /* o = { id, label, slices [{ label, value, color (a token, e.g. '--ch-mt'), tip }], total, center (the words in the middle), size } ·
     ≤ 5 slices · largest first, clockwise from 12 o'clock · square-ended with a 2px surface gap · the legend beside: name · ฿ · % (never the colour alone) */
  function donutHTML(o) {
    const sl = o.slices.filter(x => x.value > 0), tot = o.total || sl.reduce((s, x) => s + x.value, 0);
    return `<div class="tm-wrap"><div class="tm-donut chartbox" id="${esc(o.id)}_box"><svg id="${esc(o.id)}_svg" role="img" aria-label="${esc(o.label)}"></svg><div class="tip" id="${esc(o.id)}_tip"></div></div>` +
      `<table class="tm-leg" id="${esc(o.id)}_leg"><thead><tr><th>${esc(o.cols[0])}</th><th class="num">${esc(o.cols[1])}</th><th class="num">${esc(o.cols[2])}</th></tr></thead><tbody>` +
      sl.map(x => `<tr title="${esc(x.tip || '')}"><td><span class="tn"><i class="sw" style="background:var(${x.color})"></i>${esc(x.label)}</span></td><td class="num">${esc((o.fmt || R.baht)(x.value))}</td><td class="num">${esc(R.pct(tot ? x.value / tot : null, 1))}</td></tr>`).join('') +
      `</tbody><tfoot><tr><td>${esc(C.common.total)}</td><td class="num">${esc((o.fmt || R.baht)(tot))}</td><td class="num">${esc(R.pct(tot ? 1 : null, 1))}</td></tr></tfoot></table></div>`;
  }
  function drawDonut(o) {
    const svg = $(o.id + '_svg'), tip = $(o.id + '_tip'), box = $(o.id + '_box'); if (!svg) return;
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim(), cSurf = css('--surface'), S = o.size || 168;
    const slices = o.slices.filter(x => x.value > 0), total = o.total || slices.reduce((s, x) => s + x.value, 0);
    const cx = S / 2, cy = S / 2, ro = S / 2 - 2, ri = ro * 0.62;
    svg.setAttribute('viewBox', `0 0 ${S} ${S}`); svg.setAttribute('width', S); svg.setAttribute('height', S);
    const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    const arc = (a0, a1) => { const big = a1 - a0 > Math.PI ? 1 : 0; return `M${pt(ro, a0)} A${ro} ${ro} 0 ${big} 1 ${pt(ro, a1)} L${pt(ri, a1)} A${ri} ${ri} 0 ${big} 0 ${pt(ri, a0)} Z`; };
    let a = -Math.PI / 2, paths = '';
    slices.forEach((x, i) => {
      const sweep = x.value / total * Math.PI * 2, a1 = a + sweep;
      const d = sweep >= Math.PI * 2 - 1e-6 ? arc(a, a + Math.PI) + arc(a + Math.PI, a + Math.PI * 2 - 1e-4) : arc(a, a1);
      paths += `<path class="sl" data-i="${i}" data-a="${(a + a1) / 2}" d="${d}" fill="${css(x.color)}" stroke="${cSurf}" stroke-width="2" tabindex="0" aria-label="${esc(x.tip)}"/>`;
      a = a1;
    });
    const center = total ? `<text x="${cx}" y="${cy + 6}" text-anchor="middle" class="tm-c">${esc(o.center)}</text>` : '';
    svg.innerHTML = (slices.length ? paths : `<circle cx="${cx}" cy="${cy}" r="${(ro + ri) / 2}" fill="none" stroke="${css('--surface-3')}" stroke-width="${ro - ri}"/>`) + center;
    const show = el => {
      const x = slices[+el.dataset.i], am = +el.dataset.a, r = (ro + ri) / 2, rect = box.getBoundingClientRect(), sc = rect.width ? Math.min(1, rect.width / S) : 1;
      tip.textContent = ''; const t = document.createElement('div'); t.className = 'r tot'; t.textContent = x.tip; tip.appendChild(t);
      tip.style.left = Math.max(0, (cx + r * Math.cos(am)) * sc + 8) + 'px'; tip.style.top = Math.max(0, (cy + r * Math.sin(am)) * sc - 10) + 'px'; tip.classList.add('show');
    };
    svg.querySelectorAll('.sl').forEach(el => {
      el.addEventListener('pointerenter', () => show(el)); el.addEventListener('focus', () => show(el));
      el.addEventListener('pointerleave', () => tip.classList.remove('show')); el.addEventListener('blur', () => tip.classList.remove('show'));
    });
  }

  /* ===================== CR-08 §7 (D78) — the campaign timeline of Overview: one row = one bar (KOL ganttAxis) ===================== */
  /* rows [{ id, name, start, end, endMkt, cls (on_track | at_risk | behind | early | ended | not_started | cancelled), sum, sumCls, tip, aria, title }] ·
     o = { from, to, months ['yyyy-mm'], today, all (Show all), cols { campaign, summary }, todayWord } · solid = Start → today · faded = today → End */
  function timelineLite(rows, o) {
    const cur = R.ym(o.today);
    const ticks = o.months.map((mm, i) => ({ date: R.monthFirst(mm), cls: mm === cur || (o.label && cur >= mm && (i === o.months.length - 1 || cur < o.months[i + 1])) ? 'cur' : '', html: `${esc(o.label ? o.label(mm) : R.monthShort(mm))}${i === 0 || mm.slice(0, 4) !== o.months[i - 1].slice(0, 4) ? `<small>${mm.slice(0, 4)}</small>` : ''}` }));
    const ax = ganttAxis(o.from, o.to, ticks, o.today), td = o.today, clip = d => (d < o.from ? o.from : d > o.to ? R.addDays(o.to, 1) : d);
    /* CR-10 §3.1 — o.cols.extra = [{ label, num, tipHTML }]: number columns after the bar (All campaigns) instead of the summary · r.cells = [{ html, cls }] ·
       a group head with its own cells and a fold button (r.grp) · r.total = the total row */
    const X = o.cols.extra || null, nc = X ? 2 + X.length : 3, xc = r => (r.cells || []).map(c => `<td class="gx${c.cls ? ' ' + esc(c.cls) : ''}"${c.title ? ` title="${esc(c.title)}"` : ''}>${c.html}</td>`).join('');
    const body = (o.extra ? o.extra(ax) : '') + rows.map(r => {
      if (r.head && X) return `<tr class="kgrp agrp" data-agrp="${esc(r.grp || '')}"><td class="gn"><span class="bnm"><button type="button" class="chev" data-agfold="${esc(r.grp || '')}" aria-expanded="${!r.folded}" aria-label="${esc(r.foldAria || r.head)}">${ICON.chevronDown}</button><b>${esc(r.head)}</b> <span class="n">${r.n}</span></span></td><td class="gtl"></td>${xc(r)}</tr>`;
      if (r.head) return `<tr class="kgrp"><td class="gn" colspan="${nc}"><span>${esc(r.head)}</span> <span class="n">${r.n}</span></td></tr>`;
      if (r.total) return `<tr class="total"><td class="gn"><b>${esc(r.total)}</b></td><td class="gtl"></td>${xc(r)}</tr>`;
      if (r.fold) return `<tr class="tlfold"><td colspan="${nc}"><span>${esc(r.fold)}</span> <button type="button" class="link" data-tlshow="${esc(r.key)}">${esc(r.show)}</button></td></tr>`;
      const a = clip(r.start), b = clip(R.addDays(r.end, 1)), on = r.start <= o.to && r.end >= o.from;
      const L = ax.pct(a), Wd = Math.max(0.4, ax.pct(b) - L);
      let bar = '';
      if (on) {
        if (r.cls === 'ended' || r.cls === 'not_started' || r.cancelled || r.single) bar = `<span class="tlb ${esc(r.cls)}" style="left:${L.toFixed(3)}%;width:${Wd.toFixed(3)}%"></span>`;
        else { const t = td < a ? a : td > b ? b : td, P = ax.pct(t);
          bar = `<span class="tlb ${esc(r.cls)} rest" style="left:${L.toFixed(3)}%;width:${Wd.toFixed(3)}%"></span>` + (P > L ? `<span class="tlb ${esc(r.cls)} past" data-past style="left:${L.toFixed(3)}%;width:${(P - L).toFixed(3)}%"></span>` : ''); }
        if (r.endMkt && r.endMkt >= o.from && r.endMkt <= o.to && r.endMkt < r.end) bar += `<i class="tlm" style="left:${ax.pct(R.addDays(r.endMkt, 1)).toFixed(3)}%" title="${esc(r.mktTip)}"></i>`;
      }
      return `<tr class="click" tabindex="0" ${r.open ? `data-open="${esc(r.id)}"` : `data-mon="${esc(r.id)}|summary"`} aria-label="${esc(r.aria)}" title="${esc(r.title)}"><td class="gn">${r.nameHTML || `<b>${esc(r.name)}</b>`}</td>` +
        `<td class="gtl"><div class="gt-row tlr" title="${esc(r.tip)}">${ax.grid}${ax.today}${bar}</div></td>${X ? xc(r) : `<td class="gs ${esc(r.sumCls || '')}">${esc(r.sum)}</td>`}</tr>`;
    }).join('');
    const tdl = ax.today ? `<span class="gt-todayl" style="left:${ax.pct(td)}%">${esc(o.todayWord)}</span>` : '';
    return `<div class="tl-scroll tll${o.all ? ' all' : ''}${X ? ' allc' : ''}"><table class="gantt tlg${X ? ' acg' : ''}"><thead><tr><th class="gn">${esc(o.cols.campaign)}</th><th class="gtl"><div class="gt-head">${ax.head}${tdl}</div></th>` +
      `${X ? X.map(c => `<th class="gx${c.num ? ' num' : ''}">${c.tipHTML || esc(c.label)}</th>`).join('') : `<th class="gs">${esc(o.cols.summary)}</th>`}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* ===================== CR-10 §5.3 — the channel matrix of CR-09 (SKU × Channel) as one helper: rows = SKUs (Monitor) or Campaigns (Dashboard › Sales) ===================== */
  /* o = { channels ['MT' …], rows [{ id, name, sub, attrs, byCh { MT: cell }, total: cell }], totals { MT: cell, all: cell }, seg 'actual' | 'ach' | 'share', fmt (short money),
     tg (Time gone of the total row's bar), stCls (status → css), cols { name, total, share, ach?, status? }, cellTip(row, ch, cell) } · cell = { actual, target, achF, share, status } */
  function channelMatrix(o) {
    const main = x => (o.seg === 'ach' ? R.pct(x.achF) : o.seg === 'share' ? R.pct(x.share, 1) : o.fmt(x.actual)), sub = x => (o.seg === 'actual' ? R.pct(x.achF) : o.fmt(x.actual));
    const cell = (x, r, k) => (!x ? '<td class="mxc empty"></td>' : `<td class="mxc ${esc(x.status ? 'st-' + x.status : '')}" title="${esc(o.cellTip ? o.cellTip(r, k, x) : '')}"><b>${esc(main(x))}</b><small>${esc(sub(x))}</small></td>`);
    const tail = (t, tg) => (o.cols.ach ? `<td>${t.achF == null ? none() : paceBar(t.achF, tg, o.stCls(t.status) || 'ok', 50)}</td>` : '') + (o.cols.status ? `<td>${paceChip(t.status)}</td>` : '');
    /* CR-11 §5.3 — o.rank: a Rank column after Share % (r.rank = #1 the largest) · o.shareTip(r): the running share in the Share % tooltip */
    const body = o.rows.map(r => { const t = r.total || {};
      return `<tr${r.attrs || ''}><td class="nm sku"><b>${esc(r.name)}</b>${r.sub ? `<span class="sk2">${esc(r.sub)}</span>` : ''}</td>${o.channels.map(k => cell(r.byCh[k], r, k)).join('')}` +
        `<td class="num"><b>${esc(o.fmt(t.actual))}</b></td><td class="num"${o.shareTip ? ` title="${esc(o.shareTip(r))}" data-mxshare` : ''}>${esc(R.pct(t.share, 1))}</td>${o.rank ? `<td class="num rk" data-rank="${r.rank}">#${esc(r.rank)}</td>` : ''}${tail(t, r.tg)}</tr>`; }).join('');
    const T = o.totals, totRow = T ? `<tr class="total"><td>${esc(o.cols.totalRow || o.cols.total)}</td>${o.channels.map(k => `<td class="num" data-mxtot="${esc(k)}"><b>${esc(o.fmt(T[k] && T[k].actual))}</b></td>`).join('')}<td class="num" data-mxtot="all"><b>${esc(o.fmt(T.all.actual))}</b></td><td class="num">${esc(R.pct(T.all.actual ? 1 : null, 1))}</td>${o.rank ? '<td></td>' : ''}${tail(T.all, o.tg)}</tr>` : '';
    return `<div class="tablewrap mxwrap"><table class="tbl port mxtbl"><thead><tr><th>${esc(o.cols.name)}</th>${o.channels.map(k => `<th class="num">${esc(C.channel[k])}</th>`).join('')}<th class="num">${esc(o.cols.total)}</th><th class="num">${esc(o.cols.share)}</th>${o.rank ? `<th class="num">${esc(o.cols.rank)}</th>` : ''}` +
      `${o.cols.ach ? `<th>${esc(o.cols.ach)}</th>` : ''}${o.cols.status ? `<th>${esc(o.cols.status)}</th>` : ''}</tr></thead><tbody>${body}${totRow}</tbody></table></div>`;
  }

  /* ===================== CR-10 §3.2 (D95) — where each ฿100 of sales goes: one 100% bar a row (Actual · Plan) ===================== */
  /* rows [{ label, parts [{ key, label, v (฿ of each ฿100), money (the whole ฿), color (a token) }], faded }] · a label in its part when it has room (≥ 7%), else under */
  function spendPer100(rows) {
    return `<div class="p100">${rows.map(r => { const tot = r.parts.reduce((s, x) => s + Math.max(0, x.v || 0), 0) || 1;
      const segs = r.parts.map(x => { const w = Math.max(0, x.v || 0) / tot * 100; return w > 0 ? `<i class="p1s ${esc(x.key)}" data-p100="${esc(x.key)}" data-v="${(x.v || 0).toFixed(6)}" style="width:${w.toFixed(3)}%;background:var(${x.color})" title="${esc(`${x.label} ฿${(x.v || 0).toFixed(1)} of ฿100 · ${x.money}`)}">${w >= 7 ? `<b>฿${Math.round(x.v)}</b>` : ''}</i>` : ''; }).join('');
      const under = r.parts.filter(x => { const w = Math.max(0, x.v || 0) / tot * 100; return w > 0 && w < 7; }).map(x => `<span><i style="background:var(${x.color})"></i>${esc(x.label)} ฿${Math.round(x.v)}</span>`).join('');
      return `<div class="p1r${r.faded ? ' faded' : ''}"><span class="p1l">${esc(r.label)}</span><span class="p1t" role="img" aria-label="${esc(r.label + ': ' + r.parts.map(x => `${x.label} ฿${Math.round(x.v || 0)}`).join(' · '))}">${segs}</span><span class="p1v">${r.right || ''}</span>${under ? `<span class="p1u">${under}</span>` : ''}</div>`; }).join('')}</div>`;
  }

  /* ===================== CR-11 §4.1 · CR-13 §2.3 — Campaign period (one helper: Campaign Tracking › Summary · Campaign Planning › Overview) ===================== */
  /* one bar Start → End · Marketing (Start → End marketing, dark) · Sell-through (light) · solid to today, faded after · the Today line · the full dates at the ends and
     under the joint · o.chips (the status + issue chips, left) · one sentence (right): 91% of time gone · 24 days left | Ended 30/09/2026 | Starts in 56 days ·
     the places are the ones of the Burn-up (a day = its end) */
  const periodPos = (c, iso) => { const span = R.dayDiff(R.addDays(c.end, 1), c.start); return Math.max(0, Math.min(1, (R.dayDiff(iso, c.start) + 1) / span)); };
  function periodOf(c, td) {
    const tp = R.timeProgress(c, td), dl = R.daysLeft(c, td), em = c.end_marketing && c.end_marketing >= c.start && c.end_marketing <= c.end ? c.end_marketing : null;
    return { t: td, tp, dl, em, now: td < c.start ? 0 : td > c.end ? 1 : periodPos(c, td), emp: em ? periodPos(c, em) : null, ended: td > c.end, started: td >= c.start };
  }
  function periodHTML(c, o = {}) {
    const T = C.mon.period, p = periodOf(c, o.today || today()), pc = v => (v * 100).toFixed(3);
    const words = p.ended ? T.ended(R.dmy(c.end)) : !p.started ? T.starts(p.dl.n) : T.going(R.pct(p.tp.pct), p.dl.n === 0 ? T.endsToday : T.left(p.dl.n));
    const cut = p.emp == null ? [[0, 1, 'm']] : [[0, p.emp, 'm'], [p.emp, 1, 's']], pieces = [];
    cut.forEach(([a, b, k]) => { const mid = Math.max(a, Math.min(b, p.now)); if (mid > a) pieces.push([a, mid, k, 'on']); if (b > mid) pieces.push([mid, b, k, 'off']); });
    const seg = ([a, b, k, s]) => `<i class="cp-p ${k} ${s}" style="left:${pc(a)}%;width:${pc(b - a)}%"></i>`;
    const name = (a, b, k, word) => (p.emp == null || b - a < 0.14 ? '' : `<span class="cp-n ${k}${(a + b) / 2 < p.now ? ' on' : ''}" style="left:${pc(a)}%;width:${pc(b - a)}%">${esc(word)}</span>`);
    const td = p.started && !p.ended ? `<i class="cp-today" data-today="${p.now}" style="left:${pc(p.now)}%"></i>` : '';
    return `<div class="cp-top"><span class="cp-chips">${o.chips || ''}</span><b class="cp-w" data-cpwords>${esc(words)}</b></div>` +
      `<div class="cp-row"><span class="cp-end">${esc(T.start)} <b>${esc(R.dmy(c.start))}</b></span>` +
      `<div class="cp-bar" data-emp="${p.emp == null ? '' : p.emp}" data-now="${p.now}" role="img" aria-label="${esc(`${T.start} ${R.dmy(c.start)} · ${p.em ? `${C.mon.burn2.endMkt} ${R.dmy(p.em)} · ` : ''}${T.end} ${R.dmy(c.end)} · ${words}`)}">` +
      pieces.map(seg).join('') + (p.emp == null ? '' : name(0, p.emp, 'm', T.mkt) + name(p.emp, 1, 's', T.sell) + `<i class="cp-j" style="left:${pc(p.emp)}%"></i>`) + td + `</div>` +
      `<span class="cp-end">${esc(T.end)} <b>${esc(R.dmy(c.end))}</b></span>` +
      `<div class="cp-under">${p.em ? `<span class="cp-l em" data-emlab style="left:${pc(p.emp)}%">${esc(C.mon.burn2.endMkt)} ${esc(R.dmy(p.em))}</span>` : ''}` +
      (td ? `<span class="cp-l td" data-tdlab style="left:${pc(p.now)}%">${esc(C.dash.m.today)} ${esc(R.dm(p.t))}</span>` : '') + `</div></div>`;
  }
  /* two labels under the bar too close: the one on the left ends at its line, the one on the right starts at its line · still too close: Today one line lower */
  function periodFit(box) {
    if (!box) return; const a = box.querySelector('[data-emlab]'), b = box.querySelector('[data-tdlab]'), bar = box.querySelector('.cp-bar'); if (!a || !b || !bar) return;
    const emp = +bar.dataset.emp, now = +bar.dataset.now, ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    if (ra.right > rb.left - 8 && rb.right > ra.left - 8) { const right = now >= emp; a.classList.add(right ? 'toL' : 'toR'); b.classList.add(right ? 'toR' : 'toL');
      const ra2 = a.getBoundingClientRect(), rb2 = b.getBoundingClientRect(); if (ra2.right > rb2.left - 6 && rb2.right > ra2.left - 6) b.classList.add('low'); }
  }

  /* ===================== CR-13 §6 — the history of a plan (one helper: Campaign Tracking › History · Campaign Planning › History · Overview › Latest activity) ===================== */
  /* newest first · a group a month · filter chips All · Approvals · Changes · Budget · Steps · a row: the icon of its kind · dd/mm/yyyy hh:mm · who · the words ·
     the detail (comment · reason · old → new) · Compare v1 ↔ v2 (an approval of v2+) · Open request #n · o = { filter, limit, chips } */
  const HIST_KIND = {
    approvals: ['submitted', 'resubmitted', 'withdrawn', 'approved', 'returned', 'revise', 'rejected', 'undo', 'close', 'closed', 'close.returned', 'close.rejected', 'close.withdrawn', 'reopened', 'cancel', 'cancel.approved', 'cancel.returned', 'cancel.rejected', 'cancel.withdrawn'],
    changes: ['created', 'saved', 'details', 'period', 'period.approved', 'period.returned', 'period.rejected', 'period.withdrawn', 'cancelled', 'restored', 'duplicated', 'transfer'],
    budget: ['request', 'request.approved', 'request.returned', 'request.rejected', 'request.withdrawn'], steps: ['step.done', 'step.assign'] };
  const HIST_ICON = { cancel: '⊘', 'cancel.approved': '⊘', 'cancel.returned': '↩', 'cancel.rejected': '✕', 'cancel.withdrawn': '↓', transfer: '⇄', created: '+', saved: '✎', details: '✎', submitted: '↑', resubmitted: '↑', approved: '✓', returned: '↩', revise: '↩', rejected: '✕', withdrawn: '↓', undo: '↶', duplicated: '⧉',
    cancelled: '⊘', restored: '↺', request: '฿', 'request.approved': '฿', 'request.returned': '฿', 'request.rejected': '฿', 'request.withdrawn': '฿', 'step.done': '✓', 'step.assign': '→',
    period: '⇆', 'period.approved': '⇆', 'period.returned': '⇆', 'period.rejected': '⇆', 'period.withdrawn': '⇆', close: '■', closed: '■', 'close.returned': '■', 'close.rejected': '■', 'close.withdrawn': '■', reopened: '↺' };
  const histCls = a => (/^request/.test(a) ? 'req' : ['approved', 'step.done', 'closed', 'period.approved'].includes(a) ? 'ok' : /returned|revise|rejected/.test(a) ? 'back' : ['submitted', 'resubmitted', 'close', 'period'].includes(a) ? 'sub' : 'other');
  const histGroup = a => Object.keys(HIST_KIND).find(k => HIST_KIND[k].includes(a)) || 'changes';
  function reqDetail(plan, x) {
    const d = String(x.detail || ''), m = d.match(/^#(\d+)/); if (!m || !/^request/.test(x.action)) return d;
    const q = ((plan && plan.requests) || []).find(r => r.no === +m[1]); if (!q || !q.lines || !q.lines.length || q.type === 'period' || q.type === 'close') return d;
    const t = R.requestType(q.lines), amt = t === 'reallocation' ? C.req.move(R.shortBaht(R.movedOf(q.lines))) : R.signedShort(R.sumLines(q.lines)), cm = d.indexOf(' · ');
    return `#${q.no} · ${C.req.type[t] || t} ${amt}${/resubmitted$/.test(d) ? ` · ${C.appr.log.resubmitted}` : ''}${x.action !== 'request' && cm > 0 ? d.slice(cm) : ''}`;
  }
  function historyHTML(plan, o = {}) {
    const H = C.hist, f = o.filter || 'all', srt = ((plan && plan.log) || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    /* QA-v0.13 B24 — Mark step done saves the draft first: the Draft saved of the same person in the same minute is not a row of its own */
    const all = srt.filter((x, i) => !(x.action === 'saved' && srt.slice(Math.max(0, i - 2), i + 3).some(y => y !== x && y.action === 'step.done' && y.by === x.by && String(y.at).slice(0, 16) === String(x.at).slice(0, 16))));
    const list = all.filter(x => f === 'all' || histGroup(x.action) === f).slice(0, o.limit || 1e9), n = k => (k === 'all' ? all.length : all.filter(x => histGroup(x.action) === k).length);
    const chips = o.chips === false ? '' : `<div class="sttabs hchips" role="tablist">${['all', 'approvals', 'changes', 'budget', 'steps'].map(k => `<button type="button" role="tab" data-hfilter="${k}" class="${f === k ? 'on' : ''}" aria-selected="${f === k}">${esc(H.f[k])} <span class="n">${n(k)}</span></button>`).join('')}</div>`;
    if (!list.length) return chips + `<div class="c3-empty">${esc(H.none)}</div>`;
    const vs = ((plan && plan.versions) || []).filter(v => v.status !== 'draft').map(v => v.v);
    const link = x => { const d = String(x.detail || ''), m = d.match(/^#(\d+)/), v = d.match(/^v(\d+)/);
      if (m && /^(request|period|close)/.test(x.action)) return `<button type="button" class="link small" data-openreq="${m[1]}">${esc(H.openReq(m[1]))}</button>`;
      if (m && x.action === 'closed') return `<button type="button" class="link small" data-openreq="${m[1]}">${esc(H.openReq(m[1]))}</button>`;
      if (v && +v[1] > 1 && ['submitted', 'resubmitted', 'approved', 'returned', 'revise', 'rejected'].includes(x.action) && vs.includes(+v[1] - 1)) return `<button type="button" class="link small" data-cmp="${+v[1] - 1}|${v[1]}">${esc(H.compare(+v[1] - 1, v[1]))}</button>`;
      return ''; };
    let mo = '', out = '';
    list.forEach(x => { const m = String(x.at).slice(0, 7);
      if (m !== mo && o.limit == null) { out += `<li class="hmon">${esc(R.monthName(m))}</li>`; mo = m; }
      out += `<li data-hk="${esc(histGroup(x.action))}" data-ha="${esc(x.action)}"><span class="hic ${histCls(x.action)}" aria-hidden="true">${esc(HIST_ICON[x.action] || '•')}</span><div class="hrow"><div class="hl"><span class="hw">${esc(C.appr.log[x.action] || x.action)}</span>` +
        `<span class="muted"> · ${x.by ? avatar(x.by, true) : ''}${esc(x.by || '—')} · ${esc(R.dmy(String(x.at).slice(0, 10)))} ${esc(String(x.at).slice(11, 16))}</span> ${link(x)}</div>${x.detail ? `<div class="hd">${esc(reqDetail(plan, x))}</div>` : ''}</div></li>`; });
    return chips + `<ul class="hist h9 h13">${out}</ul>`;
  }

  /* CR-11 §5.2 — the card "Where each ฿100 of sales goes" (one place: Overview = the year · Campaign Tracking › P&L = one Campaign) · p = R.per100(statement) */
  const P100 = [['cogs', '--series-grey'], ['mkt', '--mkt'], ['sls', '--sls'], ['oth', '--oth'], ['profit', '--ok']];
  function p100Card(p) {
    const T = C.dash.p100, row = (side, label, faded) => ({ label, faded, parts: P100.map(([key, color]) => ({ key, label: T.parts[key], v: side[key], color, money: R.baht(side.money[key]) })) });
    return `<div class="card-head"><h3>${labelInfo(T.title, T.tip)}</h3>${p.actual ? `<div class="ctl"><span class="p1right">${esc(T.right(Math.round(p.actual.profit), p.plan ? Math.round(p.plan.profit) : '—'))}</span></div>` : ''}</div>` +
      (p.actual ? spendPer100([row(p.actual, T.actual), p.plan ? row(p.plan, T.plan, true) : null].filter(Boolean)) : `<div class="foldl">${esc(T.none)}</div>`);
  }

  /* ===================== CR-08 §6.3 · §6.4 — the bars of a list of campaigns (Profit by campaign · Marketing efficiency): rows of 32 px in the same order ===================== */
  /* items [{ id, name, v (the bar), tick (black), cls (ok | warn | err | neg), value (one line), tip }] · o = { avg (a dashed line), fmt } ·
     the bars start at 0 at the left · a 0 in the middle only when a value is negative */
  function rowBars(items, o = {}) {
    const vals = items.flatMap(x => [x.v, x.tick]).concat(o.avg != null ? [o.avg] : []).filter(R.isNum), hi = Math.max(0, ...vals), lo = Math.min(0, ...vals), span = hi - lo || 1;
    const X = v => ((v - lo) / span * 100), z = X(0);
    return `<div class="pbars rb">${items.map(x => {
      const f = R.isNum(x.v) ? `<i class="pb-f ${esc(x.cls || 'ok')}" style="left:${Math.min(z, X(x.v)).toFixed(2)}%;width:${Math.max(x.v ? 0.4 : 0, Math.abs(X(x.v) - z)).toFixed(2)}%"></i>` : '';
      const k = R.isNum(x.tick) ? `<i class="pb-k" style="left:${X(x.tick).toFixed(2)}%"></i>` : '';
      const av = o.avg != null ? `<i class="pb-avg" style="left:${X(o.avg).toFixed(2)}%"></i>` : '';
      return `<div class="pbrow click" tabindex="0" data-monrow="${esc(x.id)}|pnl" title="${esc(x.tip || '')}"><span class="pb-n">${esc(x.name)}</span><div class="pbar">${lo < 0 ? `<span class="pb-mid" style="left:${z.toFixed(2)}%"></span>` : ''}${av}${f}${k}</div>` +
        `<span class="pb-v${x.vcls ? ' ' + esc(x.vcls) : ''}">${esc(x.value)}</span></div>`; }).join('')}</div>`;
  }
  const efficiencyBars = (items, o) => rowBars(items, o);

  /* ===================== the table of CP.export rows (the Table view of a card = its download) ===================== */
  function tableHTML(t, w, o = {}) {
    const fmt = (c, col) => {
      const x = c && typeof c === 'object' ? c : { v: c }, f = x.fmt || col, v = x.v;
      if (f === 'text') return `<span${x.bold ? ' style="font-weight:700"' : ''}>${esc(v == null ? '' : v)}</span>`;
      if (v == null || v === '') return none(x.why || '');
      if (f === 'money') return `<span class="${Math.round(v) < 0 ? 'neg' : ''}">${esc(R.baht(v))}</span>`;
      if (f === 'pct') return esc(R.pct(v, 1));
      if (f === 'x') return esc(R.times(v));
      return esc(R.fmtNum(Math.round(v)));
    };
    const cols = t.cols || [], isNumCol = i => cols[i] && cols[i] !== 'text';
    const row = (r, cls) => `<tr${cls ? ` class="${cls}"` : ''}>${r.map((c, i) => `<td class="${isNumCol(i) ? 'num' : ''}">${fmt(c, cols[i])}</td>`).join('')}</tr>`;
    return `<div class="tbar">${o.noDownload ? '' : `<button type="button" class="btn small" data-dl="${esc(w)}">${ICON.download}<span>${esc(C.dash.downloadXlsx)}</span></button>`}</div>` +
      `<div class="tablewrap"${o.maxH ? ` style="max-height:${o.maxH}px"` : ''}><table class="tbl simple"><thead><tr>${t.header.map((h, i) => `<th class="${isNumCol(i) ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
      t.rows.map(r => row(r)).join('') + (t.total ? row(t.total, 'total') : '') + `</tbody></table></div>` + (t.notes && t.notes.length ? `<div class="c3-note">${t.notes.map(esc).join(' · ')}</div>` : '');
  }

  /* ===================== CR-08 §2.5 — the y axis inside the card: its width = the longest label + 8 px · short money without ".00" (฿300M) ===================== */
  const trimMoney = s => String(s).replace(/\.0+(?=[A-Za-z]*$)/, '').replace(/(\.\d*?[1-9])0+(?=[A-Za-z]*$)/, '$1');
  /* the widest of the texts in the font of an SVG class (a hidden svg is measured by the number of characters) */
  function textW(svg, list, cls) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.setAttribute('class', cls); t.setAttribute('x', '-9999'); t.setAttribute('y', '-9999'); svg.appendChild(t);
    let w = 0; list.forEach(s => { t.textContent = s; const m = t.getComputedTextLength ? t.getComputedTextLength() : 0; w = Math.max(w, m > 0 ? m : String(s).length * 7); }); t.remove(); return w;
  }
  /* the left margin of a plot: 8 px of room + the longest label + the 10 px between the labels and the axis */
  const axisLeft = (svg, labels) => Math.ceil(8 + textW(svg, labels, 'axis') + 10);

  /* ===================== the one monthly chart (CR-01 Budget-vs-Actual card · CR-02 §9: P&L by month and Target vs Actual call it) ===================== */
  /* md.rows / md.cum: [{ m, plan, actual, lfl, variance, cogsBad, <stack parts> }] · o = { mode 'monthly' | 'cumulative', good 'up' | 'down',
     color (token) or stack [{ k, color, label }], fmt (axis / labels) · full (tooltip), planWord, lflWord, noPlanWhy, empty } */
  function monthChart(svg, box, tip, md, o) {
    tip.classList.remove('show');
    const rows = md.rows, cur = R.ym(today()), n = rows.length, mode = o.mode, fmt = o.fmt || R.compact, full = o.full || R.baht, sgn = v => (v > 0.5 ? '+' : '') + fmt(v);
    const W = Math.max(300, Math.round(box.clientWidth || 800)), narrow = W < 640, H = narrow ? Math.min(300, o.h || 300) : o.h || 392;
    const m = { l: 72, r: 8, t: o.vlines && o.vlines.length ? 40 : 30, b: 70 }, ih = H - m.t - m.b;
    let iw = W - m.l - m.r;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    const cInk = css('--text'), cGrid = css('--grid'), cAxis = css('--border-strong'), cSurf = css('--surface'), cToday = css('--today');
    const stack = (o.stack || [{ k: 'actual', color: o.color || '--rev' }]).map(s => Object.assign({}, s, { c: css(s.color) }));
    /* cumulative: running totals (each stack part too) up to the last month with actual */
    const lastA = rows.map(r => r.actual != null).lastIndexOf(true), run = {};
    const ser = rows.map((r, i) => {
      if (mode !== 'cumulative') return r;
      const c = md.cum[i], out = Object.assign({}, r, { plan: c.plan, actual: i <= lastA ? c.actual : null, lfl: c.lfl, variance: c.variance });
      if (o.stack) o.stack.forEach(s => { if (r.actual != null && r[s.k] != null) run[s.k] = (run[s.k] || 0) + r[s.k]; out[s.k] = i <= lastA ? run[s.k] || null : null; });
      return out;
    });
    const vals = ser.flatMap(r => [r.plan, r.actual]).filter(v => R.isNum(v));
    if (!vals.length) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="empty">${esc(o.empty || C.dash.m.empty)}</text>`; return; }
    const hi = Math.max(0, ...vals), lo = Math.min(0, ...vals), step = R.niceStep((hi - lo) / 4 || 1);
    const yMax = hi > 0 ? step * Math.ceil(hi * 1.06 / step) : 0, yMin = lo < 0 ? -step * Math.ceil(-lo * 1.06 / step) : 0, y = v => m.t + (yMax - v) / (yMax - yMin || 1) * ih;
    /* CR-08 §2.5 — the labels of the y axis (short, no ".00") decide the left margin */
    const axf = v => trimMoney(fmt(Math.abs(v) < 1e-6 ? 0 : v)), yt = []; for (let v = yMin; v <= yMax + 1e-6; v += step) yt.push(v);
    m.l = axisLeft(svg, yt.map(axf));
    /* CR-09 §4.5 — o.line = { key, color, label, fmt }: a second series (a line) on its own axis at the right, inside the card */
    const L = o.line, lv = L ? ser.map(r => r[L.key]).filter(R.isNum) : [], lstep = lv.length ? R.niceStep(Math.max(...lv, 0) / 4 || 1) : 1, lMax = lv.length ? lstep * Math.ceil(Math.max(...lv, 0) * 1.06 / lstep) || lstep : 1;
    const lf = v => trimMoney((L && L.fmt ? L.fmt : fmt)(v)), lt = []; if (L) for (let v = 0; v <= lMax + 1e-6; v += lstep) lt.push(v);
    if (L) m.r = Math.ceil(10 + textW(svg, lt.map(lf), 'axis') + 8);
    iw = W - m.l - m.r;
    const band = iw / n, bw = Math.max(5, Math.min(64, band * 0.47)), tw = Math.min(band * 0.92, bw + Math.max(8, bw * 0.34)), cx = i => m.l + band * i + band / 2;
    const pat = (id, c) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${cSurf}"/><rect width="2.2" height="7" fill="${c}"/></pattern>`;
    const pid = svg.id || 'mc';
    let g = `<defs>${stack.map((s, i) => pat(`${pid}_h${i}`, s.c)).join('')}</defs>`;
    yt.forEach(v => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${cGrid}" stroke-width="1"/><text x="${m.l - 10}" y="${y(v) + 4.5}" text-anchor="end" class="axis">${esc(axf(v))}</text>`; });
    /* bars: square (rx 0) · stacked parts touch (no gap) · the month in progress hatched · plan / budget / target = a dark tick wider than the bar */
    let marks = '';
    const rect = (x0, a, b, fill, stroke) => { const t = Math.min(y(a), y(b)), h = Math.abs(y(a) - y(b)); return h > 0.2 ? `<rect x="${x0.toFixed(2)}" y="${t.toFixed(2)}" width="${bw.toFixed(2)}" height="${Math.max(1, h).toFixed(2)}" rx="0" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1"` : ''}/>` : ''; };
    ser.forEach((r, i) => {
      const x0 = cx(i) - bw / 2, mtd = r.m === cur && mode !== 'cumulative';
      if (r.actual != null) {
        /* CR-10 §5.1 — a stack part with fade: true is drawn light (the legend highlights one Campaign) */
        if (o.stack) { let acc = 0; stack.forEach((s, j) => { const v = r[s.k] || 0, rr = rect(x0, acc, acc + v, mtd ? `url(#${pid}_h${j})` : s.c, mtd ? s.c : ''); marks += s.fade && rr ? rr.replace('<rect ', '<rect opacity=".22" ') : rr; acc += v; }); }
        else marks += rect(x0, 0, r.actual, mtd ? `url(#${pid}_h0)` : stack[0].c, mtd ? stack[0].c : '');
      }
      if (R.isNum(r.plan)) marks += `<line x1="${(cx(i) - tw / 2).toFixed(2)}" x2="${(cx(i) + tw / 2).toFixed(2)}" y1="${y(r.plan).toFixed(2)}" y2="${y(r.plan).toFixed(2)}" stroke="${cInk}" stroke-width="3"/>`;
    });
    /* under each month: its name (this month bold) · the year under the first month and where it changes · the variance (polarity colour) */
    const every = Math.max(1, Math.ceil(34 / band)), roomy = band >= 52;
    let labels = '';
    ser.forEach((r, i) => {
      const base = m.t + ih;
      if (!(i % every)) labels += `<text x="${cx(i)}" y="${base + 22}" text-anchor="middle" class="mon${r.m === cur ? ' cur' : ''}">${esc(R.monthShort(r.m))}</text>`;
      if (i === 0 || r.m.slice(0, 4) !== ser[i - 1].m.slice(0, 4)) labels += `<text x="${cx(i)}" y="${base + 38}" text-anchor="middle" class="yr">${r.m.slice(0, 4)}</text>`;
      if (o.noPlan || r.variance == null || Math.abs(r.variance) < 0.5) return;
      const tn = R.tone(r.variance, o.good), words = sgn(r.variance);
      labels += roomy ? `<text x="${cx(i)}" y="${base + 57}" text-anchor="middle" class="var ${tn}">${esc(words)}</text>`
        : `<circle cx="${cx(i)}" cy="${base + 53}" r="3.5" fill="${css(tn === 'good' ? '--ok' : '--err')}"><title>${esc(words)}</title></circle>`;
    });
    let now = '';
    const ci = ser.findIndex(r => r.m === cur);
    if (ci >= 0) { const d = +today().slice(8, 10), nd = +R.monthLast(cur).slice(8, 10), tx = m.l + band * ci + band * ((d - 0.5) / nd);
      now = `<line x1="${tx}" x2="${tx}" y1="${m.t - 12}" y2="${m.t + ih}" stroke="${cToday}" stroke-width="1.6" stroke-dasharray="5 4"/><text x="${tx + 5}" y="${m.t - 2}" class="today-l">${esc(C.dash.m.today)}</text>`; }
    const hits = ser.map((r, i) => `<rect class="hit" data-i="${i}" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}" tabindex="0" aria-label="${esc(R.monthName(r.m))}"/>`).join('');
    /* the line series (a dot a month) and its axis · the vertical lines of dates (End marketing) */
    let extra = '';
    if (L) { const yl = v => m.t + (lMax - v) / lMax * ih, pts = ser.map((r, i) => (R.isNum(r[L.key]) ? [cx(i), yl(r[L.key])] : null)).filter(Boolean), cL = css(L.color);
      lt.forEach(v => { extra += `<text x="${W - m.r + 10}" y="${yl(v) + 4.5}" class="axis">${esc(lf(v))}</text>`; });
      if (pts.length) extra += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${cL}" stroke-width="2.5" data-line="${esc(L.key)}"/>` + pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${cL}"/>`).join(''); }
    (o.vlines || []).forEach(v => { const mm = R.ym(v.date), i = ser.findIndex(r => r.m === mm); if (i < 0) return; const d = +v.date.slice(8, 10), nd = +R.monthLast(mm).slice(8, 10), vx = m.l + band * i + band * (d / nd);
      extra += `<line x1="${vx.toFixed(1)}" x2="${vx.toFixed(1)}" y1="${m.t - 14}" y2="${m.t + ih}" stroke="${cInk}" stroke-width="1.4" stroke-dasharray="2 3" data-vline="${esc(v.date)}"/><text x="${(vx + (vx > W - m.r - 90 ? -5 : 5)).toFixed(1)}" y="${m.t - 18}" class="today-l vl"${vx > W - m.r - 90 ? ' text-anchor="end"' : ''}>${esc(v.label)}</text>`; });
    svg.innerHTML = g + `<g>${hits}</g><g style="pointer-events:none">${marks}<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${cAxis}" stroke-width="1"/>${extra}</g>` + labels + now;
    const T = C.dash.m.tip;
    const show = i => {
      const r = ser[i]; tip.textContent = '';
      const add = (cls, text) => { const el = document.createElement('div'); el.className = cls; el.textContent = text; tip.appendChild(el); return el; };
      const row = (l, v, cls) => { const el = add('r' + (cls ? ' ' + cls : ''), ''); const a = document.createElement('span'); a.textContent = l; const b = document.createElement('b'); b.textContent = v; el.appendChild(a); el.appendChild(b); return b; };
      add('h', R.monthName(r.m) + (r.m === cur ? ` · ${T.mtd}` : '') + (mode === 'cumulative' ? ` · ${C.dash.m.cumulative}` : ''));
      if (!o.noPlan) row(o.planWord, R.isNum(r.plan) ? full(r.plan) : r.cogsBad && o.noPlanWhy ? T.noPlan : C.common.none);
      if (o.stack && r.actual != null && !o.noStackRows) stack.forEach(s => row(s.label, full(r[s.k] || 0)));
      row(o.actualWord || actualWord(T.actual), r.actual == null ? C.common.none : full(r.actual));
      if (L) row(L.label, R.isNum(r[L.key]) ? (L.full || full)(r[L.key]) : C.common.none);
      if (r.actual != null && !o.noPlan) row(o.lflWord, full(r.lfl));
      if (r.variance != null && !o.noPlan) { const b = row(T.variance, (r.variance > 0 ? '+' : '') + full(r.variance), 'tot'); b.className = R.tone(r.variance, o.good); }
      if (r.cogsBad && o.noPlanWhy && !R.isNum(r.plan)) add('d', o.noPlanWhy);
      if (r.est && o.estWhy) add('d', o.estWhy(r.estAmt));
      if (o.noteOf) { const nt = o.noteOf(r); if (Array.isArray(nt)) nt.forEach(x => { if (Array.isArray(x)) row(x[0], x[1]); else add('d', x); }); else if (nt) add('d', nt); }
      const bx = box.getBoundingClientRect(), sc = bx.width / W; let left = cx(i) * sc + 14;
      if (left + 240 > bx.width) left = cx(i) * sc - 254;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = (m.t + 4) + 'px'; tip.classList.add('show');
    };
    svg.querySelectorAll('.hit').forEach(h => { const i = +h.dataset.i;
      h.addEventListener('pointerenter', () => show(i)); h.addEventListener('focus', () => show(i));
      h.addEventListener('pointerleave', () => tip.classList.remove('show')); h.addEventListener('blur', () => tip.classList.remove('show')); });
  }
  /* the legend of that chart: ■ Actual · ▨ Month in progress · — Plan (stack: one square a part) */
  function monthLegend(o) {
    const L = C.dash.m.legend, sw = (cls, color, t) => `<span><i class="${cls}" style="--sw:${color}"></i>${esc(t)}</span>`;
    return (o.stack ? o.stack.map(s => sw('bar', `var(${s.color})`, s.label)).join('') : sw('bar', `var(${o.color || '--rev'})`, o.actualWord || actualWord())) +
      sw('hatch', `var(${o.stack ? o.stack[0].color : o.color || '--rev'})`, L.mtd) + (o.noPlan ? '' : sw('tick', '', o.planWord)) + (o.line ? sw('ln', `var(${o.line.color})`, o.line.label) : '') +
      (o.vlines || []).slice(0, 1).map(v => `<span><i class="ln dash" style="--sw:var(--text)"></i>${esc(v.legend || v.label)}</span>`).join('');
  }
  /* CR-09 §4.5 — the combo chart (bars + a line on its own axis): monthChart with o.line — no second monthly chart (§6) */
  const comboChart = (svg, box, tip, md, o) => monthChart(svg, box, tip, md, o);
  /* CR-09 §4.3 (D83) — Target mix / Actual mix: one 100% bar a row · the share in each part (when it has room) · the colours of the donut */
  function mixBars(rows) {
    return `<div class="mixbars">${rows.map(r => { const tot = r.parts.reduce((s, p) => s + (p.value || 0), 0);
      return `<div class="mxr"><span class="mxl">${esc(r.label)}</span><span class="mxt" role="img" aria-label="${esc(r.label + ': ' + r.parts.map(p => `${p.label} ${R.pct(tot ? p.value / tot : null)}`).join(' · '))}">${r.parts.map(p => { const w = tot ? p.value / tot * 100 : 0;
        return w > 0 ? `<i style="width:${w.toFixed(2)}%;background:var(${p.color})" title="${esc(`${p.label} ${R.pct(w / 100, 1)}${p.money ? ' · ' + p.money : ''}`)}" data-mx="${esc(p.key)}" data-share="${w.toFixed(4)}">${w >= 11 ? `<b>${esc(R.pct(w / 100))}</b>` : ''}</i>` : ''; }).join('')}</span></div>`; }).join('')}</div>`;
  }
  /* CR-09 §4.3 — the Pareto of the SKUs: a bar a SKU (largest first) + the running share as a line on the same rows (0–100% across) ·
     items [{ label, sub, value, text }] · rows of 28 px */
  function paretoBars(items) {
    const tot = items.reduce((s, x) => s + (x.value || 0), 0), max = Math.max(1, ...items.map(x => x.value || 0)); let run = 0;
    const rows = items.map(x => { run += x.value || 0; return Object.assign({}, x, { cum: tot ? run / tot : null }); }), H = rows.length * 28;
    const pts = rows.map((x, i) => `${((x.cum || 0) * 100).toFixed(2)},${(i * 28 + 14).toFixed(1)}`).join(' ');
    return `<div class="pareto"><div class="pr-rows">${rows.map(x => `<div class="pr" title="${esc(`${x.label}${x.sub ? ' · ' + x.sub : ''}\n${x.text} · ${R.pct(tot ? x.value / tot : null, 1)} · cumulative ${R.pct(x.cum, 1)}`)}"><span class="prl">${esc(x.label)}${x.sub ? ` <small>${esc(x.sub)}</small>` : ''}</span>` +
      `<span class="prt"><i style="width:${((x.value || 0) / max * 100).toFixed(2)}%"></i></span><span class="prv">${esc(x.text)}</span><span class="prc" data-cum="${x.cum == null ? '' : x.cum.toFixed(6)}">${esc(R.pct(x.cum))}</span></div>`).join('')}</div>` +
      `<svg class="pr-line" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true" style="height:${H}px"><polyline points="${pts}" fill="none" stroke="var(--text)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/></svg></div>`;
  }

  /* ===================== multiSelect (KOL CR-14 §4.2) — one multi-select for every list of values ===================== */
  /* multiSelect(o) → HTML · the screen may draw it again whenever it likes — what is open and the search typed stay here, by o.id.
     o = { id, options [{value, label, sub, chip, dot}], value [values], label, aria, title, searchable, placeholder, defaultValue, min, minTip, onChange(values) } */
  const MS = new Map();
  const msSearchable = o => (o.searchable != null ? !!o.searchable : o.options.length > 7);
  function multiSelect(o) {
    const st = Object.assign({ open: false, q: '' }, MS.get(o.id) || {}, { o });
    MS.set(o.id, st);
    const MC = C.ms, value = o.value || [], search = msSearchable(o), open = st.open;
    const shown = new Set(R.msFilter(o.options, search ? st.q : '').map(x => String(x.value)));
    const opt = x => {
      const on = value.includes(x.value), locked = R.msLocked(value, x.value, o.min);
      const dot = !x.dot ? '' : `<span class="ms-dot" style="background:${x.dot}"></span>`;
      return (x.sep ? '<div class="ms-sep" role="separator"></div>' : '') + `<label class="ms-opt${shown.has(String(x.value)) ? '' : ' hidden'}"${locked && o.minTip ? ` title="${esc(o.minTip)}"` : ''}>` +
        `<input type="checkbox" data-msv="${esc(x.value)}"${on ? ' checked' : ''}${locked ? ' aria-disabled="true" data-mslock' : ''}>${dot}` +
        `<span class="ms-name">${esc(x.label)}</span>${x.sub != null && x.sub !== '' ? `<span class="ms-sub">${esc(x.sub)}</span>` : ''}${x.chip || ''}</label>`;
    };
    const pop = `<div class="ms-pop${open ? ' open' : ''}" role="group" aria-label="${esc(o.aria || o.label || '')}">` +
      (search ? `<div class="ms-qw">${ICON.search}<input type="text" class="ms-q" data-msq value="${esc(st.q)}" placeholder="${esc(o.placeholder || MC.search)}" aria-label="${esc(o.placeholder || MC.search)}" autocomplete="off"></div>` : '') +
      `<div class="ms-list">${o.options.map(opt).join('')}<div class="ms-none${shown.size ? ' hidden' : ''}">${esc(MC.noMatches)}</div></div>` +
      `<div class="ms-foot"><button type="button" class="btn small ghost" data-msall>${esc(MC.selectAll)}</button><button type="button" class="btn small ghost" data-msclear>${esc(o.defaultValue ? MC.reset : MC.clear)}</button></div></div>`;
    return `<div class="ms${o.fit ? ' fit' : ''}" data-ms="${esc(o.id)}"><button type="button" class="ms-trigger" data-mst aria-haspopup="true" aria-expanded="${open}"${o.title ? ` title="${esc(o.title)}"` : ''}><span class="ms-l">${esc(o.label)}</span><span class="ms-caret">${ICON.chevronDown}</span></button>` + pop + '</div>';
  }
  /* CR-02 §7 — one choice with a search (the Campaign of By campaign): the same popover, a click picks and closes ·
     o = { id, options [{value, label, sub, chip}], value, label (button words), aria, placeholder, onChange(value) } */
  function singleSelect(o) {
    const st = Object.assign({ open: false, q: '' }, MS.get(o.id) || {}, { o: Object.assign({}, o, { single: true }) });
    MS.set(o.id, st);
    const shown = new Set(R.msFilter(o.options, st.q).map(x => String(x.value)));
    const opt = x => `<button type="button" class="ms-opt pick${x.value === o.value ? ' on' : ''}${shown.has(String(x.value)) ? '' : ' hidden'}" data-msv="${esc(x.value)}" data-mspick role="option" aria-selected="${x.value === o.value}">` +
      `<span class="ms-name">${esc(x.label)}</span>${x.sub ? `<span class="ms-sub">${esc(x.sub)}</span>` : ''}${x.chip || ''}</button>`;
    return `<div class="ms single${o.fit ? ' fit' : ''}${o.cls ? ' ' + esc(o.cls) : ''}" data-ms="${esc(o.id)}"><button type="button" class="ms-trigger" data-mst aria-haspopup="listbox" aria-expanded="${st.open}"${o.aria ? ` aria-label="${esc(o.aria)}"` : ''}><span class="ms-l">${o.labelHTML || esc(o.label)}</span><span class="ms-caret">${ICON.chevronDown}</span></button>` +
      `<div class="ms-pop${st.open ? ' open' : ''}" role="listbox" aria-label="${esc(o.aria || '')}"><div class="ms-qw">${ICON.search}<input type="text" class="ms-q" data-msq value="${esc(st.q)}" placeholder="${esc(o.placeholder || C.ms.search)}" aria-label="${esc(o.placeholder || C.ms.search)}" autocomplete="off"></div>` +
      `<div class="ms-list">${o.options.map(x => (x.group ? `<div class="ms-grp${o.options.some(y => y.inGroup === x.group && shown.has(String(y.value))) ? '' : ' hidden'}" data-msgrp="${esc(x.group)}">${esc(x.group)}</div>` : '') + opt(x)).join('')}<div class="ms-none${shown.size ? ' hidden' : ''}">${esc(C.ms.noMatches)}</div></div></div></div>`;
  }
  /* the words on a button: none → allText · one → its label · more → "n selected" */
  const msLabel = (value, options, allText) => (!value.length || value.length === options.length ? allText : value.length === 1 ? ((options.find(x => x.value === value[0]) || {}).label || '') : C.ms.nSelected(value.length));
  const msRoot = el => (el && el.closest ? el.closest('[data-ms]') : null);
  const msState = root => (root ? MS.get(root.dataset.ms) : null);
  function msPlace(root) {
    const pop = root.querySelector('.ms-pop'); if (!pop) return;
    pop.classList.remove('right');
    if (pop.getBoundingClientRect().right > document.documentElement.clientWidth - 8) pop.classList.add('right');
  }
  function msOpen(root, on) {
    const st = msState(root); if (!st) return;
    st.open = on;
    const pop = root.querySelector('.ms-pop'), t = root.querySelector('[data-mst]');
    pop.classList.toggle('open', on); if (t) t.setAttribute('aria-expanded', String(on));
    if (on) { msPlace(root); const f = root.querySelector('[data-msq]') || root.querySelector('.ms-opt:not(.hidden) [data-msv]'); if (f) f.focus(); }
  }
  const msCloseAll = except => document.querySelectorAll('.ms .ms-pop.open').forEach(p => { const r = msRoot(p); if (r !== except) msOpen(r, false); });
  function msSet(root, values, focusValue) {
    const st = msState(root); if (!st) return;
    const id = root.dataset.ms;
    st.o.value = values;
    st.o.onChange(values);
    const again = document.querySelector(`[data-ms="${CSS.escape(id)}"]`); if (!again) return;
    msPlace(again);
    const el = focusValue != null ? again.querySelector(`[data-msv="${CSS.escape(focusValue)}"]`) : again.querySelector('[data-msq]');
    if (el && again !== root) el.focus();
  }
  document.addEventListener('click', e => {
    const root = msRoot(e.target);
    msCloseAll(root);
    const st = msState(root); if (!st) return;
    if (e.target.closest('[data-mst]')) { msOpen(root, !st.open); return; }
    const pk = e.target.closest('[data-mspick]');
    if (pk) { msOpen(root, false); st.q = ''; const v = st.o.options.map(x => x.value).find(x => String(x) === pk.dataset.msv); if (v !== st.o.value) st.o.onChange(v); return; }
    if (e.target.closest('[data-msall]')) { msSet(root, R.msSelectAll(st.o.options, st.o.value, msSearchable(st.o) ? st.q : '')); return; }
    if (e.target.closest('[data-msclear]')) { msSet(root, st.o.defaultValue ? st.o.defaultValue.slice() : st.o.min ? (st.o.value || []).slice(0, st.o.min) : []); return; }
    if (e.target.closest('input[data-mslock]')) e.preventDefault();
  });
  document.addEventListener('change', e => {
    const cb = e.target.closest ? e.target.closest('input[data-msv]') : null; if (!cb) return;
    const root = msRoot(cb), st = msState(root); if (!st) return;
    msSet(root, R.msToggle(st.o.options, st.o.value, st.o.options.map(x => x.value).find(v => String(v) === cb.dataset.msv), cb.checked, st.o.min), cb.dataset.msv);
  });
  document.addEventListener('input', e => {
    if (!e.target.matches || !e.target.matches('[data-msq]')) return;
    const root = msRoot(e.target), st = msState(root); if (!st) return;
    st.q = e.target.value;
    const shown = new Set(R.msFilter(st.o.options, st.q).map(x => String(x.value)));
    root.querySelectorAll('.ms-opt').forEach(l => l.classList.toggle('hidden', !shown.has((l.dataset.msv != null ? l : l.querySelector('[data-msv]')).dataset.msv)));
    root.querySelector('.ms-none').classList.toggle('hidden', shown.size > 0);
    root.querySelectorAll('[data-msgrp]').forEach(g => g.classList.toggle('hidden', !st.o.options.some(y => y.inGroup === g.dataset.msgrp && shown.has(String(y.value)))));
  });
  document.addEventListener('keydown', e => {
    const root = msRoot(e.target), st = msState(root); if (!st) return;
    if (e.key === 'Escape' && st.open) { e.preventDefault(); e.stopPropagation(); msOpen(root, false); const t = root.querySelector('[data-mst]'); if (t) t.focus(); return; }
    if (e.key === 'Enter' && e.target.matches('[data-msq]')) { e.preventDefault(); const f = root.querySelector('.ms-opt.pick:not(.hidden)'); if (f) f.click(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (e.target.matches('[data-mst]')) { if (e.key === 'ArrowDown') { e.preventDefault(); msOpen(root, true); } return; }
    const items = [...root.querySelectorAll('.ms-opt:not(.hidden) [data-msv], .ms-opt.pick:not(.hidden)')]; if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(e.target), q = root.querySelector('[data-msq]');
    const nx = e.key === 'ArrowDown' ? items[i < 0 ? 0 : Math.min(items.length - 1, i + 1)] : i <= 0 ? q || items[0] : items[i - 1];
    nx.focus();
  }, true);

  /* ===================== ganttAxis (KOL CR-19) — a range [from, to] laid out in % ===================== */
  /* head = the tick labels with their grid line · grid = the grid lines of a row · today = the dashed Today line */
  function ganttAxis(from, to, ticks, td) {
    const days = R.dayDiff(R.addDays(to, 1), from), pct = iso => R.dayDiff(iso, from) / days * 100, inside = (ticks || []).filter(t => t.date >= from && t.date <= to);
    return { from, to, days, pct,
      head: inside.map(t => `<span class="gt-tick${t.cls ? ' ' + t.cls : ''}" style="left:${pct(t.date)}%">${t.html || esc(t.label)}</span>`).join(''),
      grid: inside.map(t => `<i class="gt-grid" style="left:${pct(t.date)}%"></i>`).join(''),
      today: td && td >= from && td <= to ? `<i class="gt-today" style="left:${pct(td)}%"></i>` : '' };
  }

  /* ===================== dialogs (KOL ui.js — openDialog · closeDialog · confirmDialog) — never the browser's alert / confirm / prompt ===================== */
  const dlg = $('dlg');
  /* QA-v0.13 B3 — a dialog drawn again keeps a toast that is showing (Undo) above it */
  function keepToast(box, f) { const t = $('toast'), on = !!t && t.classList.contains('show'); if (t && box.contains(t)) document.body.appendChild(t); f(); if (on && box.open !== false) box.appendChild(t); }
  function openDialog(html, wide) { keepToast(dlg, () => { dlg.innerHTML = html; }); dlg.classList.toggle('wide', wide === true); if (!dlg.open) dlg.showModal(); }
  function closeDialog() { if (dlg.open) dlg.close(); }
  /* ===================== a date as KOL (ui.js dateHTML · CR-03 §8): dd/mm/yyyy typed or picked — the browser's own date box follows its language (mm/dd in English US) ===================== */
  /* attrs go on the hidden input that holds yyyy-mm-dd ('invalid' while the text is not a date · '' when empty) */
  function parseDmy(text) {
    const t = String(text || '').trim(); if (!t) return '';
    const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(t) || /^(\d{2})(\d{2})(\d{4})$/.exec(t);
    if (!m) return null;
    const y = m[3].length === 2 ? '20' + m[3] : m[3], iso = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return R.isISODate(iso) ? iso : null;
  }
  /* a field the one acting may not edit: the attrs carry " disabled" → the text and the picker are off too (CR-07: a step of someone else) */
  const dateHTML = (attrs, iso, o = {}) => { const off = /(^|\s)disabled(\s|$)/.test(attrs) ? ' disabled' : ''; return `<span class="dfield"><input type="text" class="inp dtext" inputmode="numeric" placeholder="${esc(C.common.dayPh)}" value="${esc(R.dmy(iso))}" autocomplete="off"${o.label ? ` aria-label="${esc(o.label)}"` : ''}${o.textId ? ` id="${esc(o.textId)}"` : ''}${off}>` +
    `<button type="button" class="dpick" tabindex="-1" aria-label="${esc(C.common.pickDate)}" title="${esc(C.common.pickDate)}"${off}>${ICON.calendar}</button><input type="date" class="dnative" tabindex="-1" aria-hidden="true"><input type="hidden" ${attrs} value="${esc(iso || '')}"></span>`; };
  const hiddenOf = w => w.querySelector('input[type=hidden]');
  document.addEventListener('input', e => {
    if (!e.target.classList || !e.target.classList.contains('dtext')) return;
    const h = hiddenOf(e.target.closest('.dfield')), iso = parseDmy(e.target.value);
    h.value = iso === null ? 'invalid' : iso; h.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.addEventListener('change', e => {
    const t = e.target; if (!t.classList) return;
    if (t.classList.contains('dtext')) { const h = hiddenOf(t.closest('.dfield')), iso = parseDmy(t.value); if (iso) t.value = R.dmy(iso); h.value = iso === null ? 'invalid' : iso; h.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (t.classList.contains('dnative')) { const w = t.closest('.dfield'), h = hiddenOf(w); h.value = t.value || ''; w.querySelector('.dtext').value = R.dmy(t.value); h.dispatchEvent(new Event('input', { bubbles: true })); h.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.dpick'); if (!b) return;
    const w = b.closest('.dfield'), n = w.querySelector('.dnative'), h = hiddenOf(w);
    n.value = R.isISODate(h.value) ? h.value : '';
    try { n.showPicker(); } catch (err) { n.focus(); n.click(); }
  });

  function confirmDialog(title, body, okLabel, danger, noLabel) {
    return new Promise(resolve => {
      openDialog(`<div class="dlg-h">${esc(title)}</div><div class="dlg-b">${esc(body)}</div>
        <div class="dlg-f"><button type="button" class="btn" data-r="0">${esc(noLabel || C.common.cancel)}</button><button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(okLabel)}</button></div>`);
      const done = v => { dlg.removeEventListener('close', onClose); closeDialog(); resolve(v); };
      const onClose = () => { if (!dlg.open) done(false); };
      dlg.addEventListener('close', onClose);
      dlg.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => done(b.dataset.r === '1')));
      dlg.querySelector('[data-r="1"]').focus();
    });
  }

  /* ===================== the side drawer (KOL ui.js — openDrawer · fillDrawer · closeDrawer · requestCloseDrawer) · one at a time ===================== */
  /* owner: { isDirty(): bool, onClose(), onKey(e) } — the screen that filled #drawer_content · CR-03: the form drawer is 480px (full screen under 768px) */
  const drawer = { owner: null, back: null };
  function openDrawer(owner, html) {
    if (!drawer.owner) drawer.back = document.activeElement;
    drawer.owner = owner;
    $('drawer_content').className = 'drawer';
    $('drawer_content').innerHTML = html;
    $('drawer').classList.remove('hidden');
    document.body.classList.add('drawer-open');
  }
  function fillDrawer(html) { $('drawer_content').innerHTML = html; }
  function hideDrawer() { $('drawer').classList.add('hidden'); $('drawer_content').innerHTML = ''; document.body.classList.remove('drawer-open'); }
  function closeDrawer() {
    const o = drawer.owner; drawer.owner = null;
    hideDrawer();
    if (o && o.onClose) o.onClose();
    if (drawer.back && drawer.back.isConnected) drawer.back.focus();
  }
  /* something typed → "Discard changes?" first */
  async function requestCloseDrawer() {
    const o = drawer.owner;
    if (o && o.isDirty && o.isDirty() && !(await confirmDialog(C.common.discardTitle, C.common.discardBody, C.common.discard, true, C.common.keepEditing))) return false;
    closeDrawer(); return true;
  }
  const drawerOwner = () => drawer.owner;
  $('drawer').addEventListener('click', e => { if (e.target.closest('[data-dr-close]')) requestCloseDrawer(); });
  document.addEventListener('keydown', e => {
    if (!drawer.owner || dlg.open || document.querySelector('dialog.cmdk[open]')) return;
    if (e.key === 'Escape' && !$('infoPop')) { e.preventDefault(); requestCloseDrawer(); return; }
    if (drawer.owner.onKey) drawer.owner.onKey(e);
  });

  /* a text to the clipboard (Copy command · Copy file name) — the old way when the Clipboard API says no */
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; } a.remove(); return ok;
    }
  }

  /* ===================== CR-05 — the Budget bar (§9.1) · chips of the approval / roles / expenses (KOL) · avatar · the review modal · a toast with Undo ===================== */
  /* t = { current, committed (= Spent: the actual of the Mock lines, D65), pending, toDate } · o.short = in a table · CR-07: 3 parts Spent · Remaining · Pending */
  function budgetTip(t) {
    return C.track.barTip(R.shortBaht(t.committed), R.shortBaht(t.current - t.committed), R.shortBaht(t.current), t.pending ? R.signedShort(t.pending) : '', R.shortBaht(t.toDate));
  }
  function budgetBar(t, o = {}) {
    const cur = Math.max(0, t.current || 0), com = Math.max(0, t.committed || 0), pend = Math.max(0, t.pending || 0), max = Math.max(cur, com) + pend || 1, w = v => (Math.max(0, v) / max * 100).toFixed(2);
    const seg = (cls, v) => (v > 0 ? `<i class="${cls}" style="width:${w(v)}%"></i>` : ''), inCur = Math.min(com, cur);
    let segs = '';
    segs = seg('com', inCur) + seg('rem', cur - inCur) + seg('over', com - cur) + seg('pend', pend);
    const tick = t.toDate > 0 && cur > 0 ? `<i class="bb-tick" style="left:${w(Math.min(t.toDate, max))}%"></i>` : '';
    return `<span class="bbar${o.short ? ' short' : ''}" role="img" aria-label="${esc(budgetTip(t))}" title="${esc(budgetTip(t))}"><span class="bb-t">${segs}</span>${tick}</span>`;
  }
  /* KOL caption: 83% used · ฿7.39M left · ฿0.6M pending (over: ฿x over · no budget: No budget · ฿x pending) */
  function budgetCap(t) {
    const B = C.track, p = t.pending ? R.shortBaht(t.pending) : '';
    if (!(t.current > 0)) return B.noBudget(p);
    const left = t.current - t.committed;
    return left < -0.5 ? B.capOver(R.pctA(R.ratio(t.committed, t.current), true), R.shortBaht(-left), p) : B.cap(R.pctA(R.ratio(t.committed, t.current), true), R.shortBaht(left), p);
  }
  const apChip = (state, o = {}) => { const A = C.appr.state; return `<span class="st a${esc(state)}"${o.tip ? ` title="${esc(o.tip)}"` : ''}>${esc(A[state] || state)}</span>`; };
  const roleChip = r => `<span class="rchip ${esc(r)}">${esc(C.actor.roles[r] || r)}</span>`;
  const avatar = (name, sm) => `<span class="av${sm ? ' sm' : ''}" aria-hidden="true">${esc(String(name || '?').trim().charAt(0).toUpperCase())}</span>`;
  /* the big container of a review (KOL createModal size L: 90vw · max 1400px · 85vh) · M = 720px */
  function openModal(html, size, onClose) {
    let m = $('mdl'); if (!m) { m = document.createElement('dialog'); m.id = 'mdl'; m.className = 'mdl'; document.body.appendChild(m); m.addEventListener('close', () => { const f = m._onClose; m._onClose = null; if (f) f(); }); }
    m.className = 'mdl ' + (size || 'L'); keepToast(m, () => { m.innerHTML = html; }); m._onClose = onClose || null; if (!m.open) m.showModal(); return m;
  }
  function closeModal() { const m = $('mdl'); if (m && m.open) m.close(); }
  /* a toast with one action (Undo · Request budget) for ms (KOL: Undo 10 s) */
  function toastAction(msg, label, fn, ms) {
    const t = toastHost(); t.textContent = ''; const s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
    if (label) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tbtn'; b.textContent = label; b.addEventListener('click', () => { t.classList.remove('show', 'act'); fn(); }); t.appendChild(b); }
    t.classList.add('show', 'act'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show', 'act'), ms || 10000);
  }

  /* ===================== the xlsx of a card / a tab — the first sheet says the numbers are made up (D54) ===================== */
  const fileOf = (base, scope, ext) => CP.export.fileName(base, scope, today(), ext);
  function saveXlsx(base, scope, tables, meta) {
    const name = fileOf(base, scope, 'xlsx'), m = (meta || []).slice();
    m.unshift([C.demo.sheetL, C.demo.sheet]);
    download(name, CP.xlsx.workbook(tables.map((t, i) => CP.export.sheetOf(t, i ? null : m))), CP.xlsx.MIME);
    toast(C.dash.exported(name, tables.length));
  }

  return { C, R, $, esc, today, seed, actualWord, pref, shortNum, bahtShort, ICON, info, infoObj, isFormulaInfo, tipText, labelInfo, toast, download, downloadCSV,
    none, moneyCell, statusChip, attChip, pctBar, paceBar, paceChip, issueChip, pagerHTML, pageOf, PAGE, emptyState, noSalesBand, foldedLine, timeCell, segHTML, checksHTML, multiSelect, singleSelect, msLabel, ganttAxis, barSeg, kpiCard, estBadge, cogsEstTip, cogsEstBadge, hbars, tableHTML, monthChart, monthLegend, saveXlsx,
    stickyTabs, spendPer100, p100Card, periodHTML, periodFit, historyHTML, channelMatrix, trimMoney, textW, axisLeft, donutHTML, drawDonut, timelineLite, rowBars, efficiencyBars, comboChart, mixBars, paretoBars,
    dateHTML, parseDmy, openDialog, closeDialog, confirmDialog, openDrawer, fillDrawer, closeDrawer, requestCloseDrawer, drawerOwner, copyText,
    budgetBar, budgetCap, budgetTip, apChip, roleChip, avatar, openModal, closeModal, toastAction };
})();
