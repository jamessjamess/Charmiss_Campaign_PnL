/* i18n.js — CR-12 §4 (D106 · D107 · D113): Thai over English.
   content.js = the English words (the list of keys) · content.th.js = the Thai words on the same keys (CP.contentTH) · with CP.lang === 'th' (boot.js) the Thai
   words are merged INTO CP.content in place — before any rule or screen loads, so every screen keeps its `const C = CP.content` and nothing is redrawn.
   Merge: an object key by key · an array index by index (an object item merged, a string replaced — nav / cmdk.pages keep their key · route · icon · hash) ·
   a string or a function replaced only by the same kind (a function with the same number of arguments) · a key with a dot in its name is a plain key ·
   a Thai key English does not have = skipped (check b) · no Thai = the English word (the page never breaks).
   CP.i18n = { lang, set(lang) — remember it and load the same page again (route · tab · scroll back) · check() — ?i18n=check (dev):
   (a) English words with no Thai · (b) Thai keys English does not have · (c) functions whose arguments differ · (d) English words on screen }. */
CP.i18n = (function () {
  'use strict';
  const C = CP.content, TH = CP.contentTH || {}, lang = CP.lang === 'en' ? 'en' : 'th';
  const NOT_WORDS = new Set(['key', 'icon', 'route', 'hash', 'version']), SKIP_TOP = new Set(['ops']);
  /* §5.2 — kept in English in both languages (the team's short words · keys · brand) */
  const KEEP = ['P&L Waterfall', 'P&L', 'GP %', 'GP', 'COGS', 'A&P %', 'A&P', 'ROI', 'ROAS', 'SKU', 'KPI', 'YTD', 'VAT', 'MT', 'TT', 'ECOM', 'Modern trade',
    'Traditional trade', 'E-commerce', 'NPD', 'Hero', 'Core', 'GWP', 'Ach %', 'Ach', 'Pace', 'pace', 'Burn-up', 'DEV', 'Ctrl+K', 'Ctrl', 'Esc', 'Enter', 'Tab', 'Delete', 'Shift', 'id', 'v1', 'v2', 'Campaign P&L',
    'Campaign PnL', 'Charmiss', 'LOMR', 'EN', 'English', 'xlsx', 'Excel', 'CSV', 'Windows', 'macOS', 'Mock', 'Language', 'Switch to English', 'mm/yyyy', 'dd/mm/yyyy', 'yyyy', 'Est.'];
  const KEEP_RE = new RegExp('(?<![A-Za-z])(?:' + KEEP.slice().sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z])', 'g');
  const strip = s => String(s).replace(/"[^"]*"/g, ' ').replace(/\bD\d+\b/g, ' ').replace(/\bv\d+\b/g, ' ').replace(KEEP_RE, ' ');
  const latin = s => /[A-Za-z]{2,}/.test(strip(s));
  /* the words a function writes: its text between quotes / backticks, without ${…} */
  /* the words a function writes: every quoted / backtick text in its source, the ${…} code taken out (nested templates included) */
  const fnWords = f => { const src = String(f), body = src.slice(src.indexOf('=>') >= 0 ? src.indexOf('=>') + 2 : 0); let out = '', q = '', i = 0;
    const code = (from) => { let d = 0; for (let j = from; j < body.length; j++) { const ch = body[j]; if (ch === '`' || ch === "'" || ch === '"') { j = lit(j + 1, ch, true); continue; } if (ch === '{') d++; else if (ch === '}') { if (!d) return j; d--; } } return body.length; };
    const lit = (from, end, inner) => { for (let j = from; j < body.length; j++) { const ch = body[j]; if (ch === '\\') { out += ' '; j++; continue; } if (ch === end) { out += ' '; return j; }
      if (end === '`' && ch === '$' && body[j + 1] === '{') { out += ' '; j = code(j + 2); continue; } out += ch; } void inner; return body.length; };
    for (i = 0; i < body.length; i++) { const ch = body[i]; if (ch === '`' || ch === "'" || ch === '"') i = lit(i + 1, ch, false); }
    void q; return out; };
  const needs = v => (typeof v === 'string' ? latin(v) : typeof v === 'function' ? latin(fnWords(v)) : false);
  const found = { a: [], b: [], c: [], d: [] };
  const isObj = v => v && typeof v === 'object';

  /* (b) (c) — and the merge itself (only in Thai) */
  function merge(en, th, path, write) {
    if (Array.isArray(en)) {
      if (!Array.isArray(th)) { found.b.push(path + ' (not a list)'); return; }
      th.forEach((v, i) => { if (v === undefined) return; if (i >= en.length) { found.b.push(`${path}[${i}]`); return; } put(en, i, v, `${path}[${i}]`, write); });
      return;
    }
    Object.keys(th).forEach(k => { if (!(k in en)) { found.b.push(`${path}.${k}`); return; } put(en, k, th[k], `${path}.${k}`, write); });
  }
  function put(obj, k, v, path, write) {
    const e = obj[k];
    if (isObj(e) && isObj(v)) { merge(e, v, path, write); return; }
    if (typeof e === 'function' && typeof v === 'function') { if (e.length !== v.length) { found.c.push(`${path} (${e.length} ≠ ${v.length})`); return; } if (write) obj[k] = v; return; }
    if (typeof e === 'string' && typeof v === 'string') { if (write) obj[k] = v; return; }
    found.c.push(`${path} (${typeof e} ≠ ${typeof v})`);
  }
  /* (a) — every English word that needs Thai and has none (walked before the merge) */
  function missing(en, th, path) {
    if (Array.isArray(en)) { en.forEach((v, i) => leaf(v, Array.isArray(th) ? th[i] : undefined, `${path}[${i}]`, i)); return; }
    Object.keys(en).forEach(k => { if (path === 'C' && SKIP_TOP.has(k)) return; leaf(en[k], isObj(th) ? th[k] : undefined, `${path}.${k}`, k); });
  }
  function leaf(v, t, path, k) {
    if (NOT_WORDS.has(k)) return;
    if (isObj(v)) { missing(v, t, path); return; }
    if (t === undefined && needs(v)) found.a.push(path);
  }
  missing(C, TH, 'C');
  merge(C, TH, 'C', lang === 'th');

  /* ---------- switch: remember · keep the place · the same page again (D107) ---------- */
  const KEY = 'charmiss_campaign_pnl_', SCROLL = KEY + 'scroll';
  async function set(to) {
    if (to !== 'th' && to !== 'en') return;
    if (to === lang && !CP.langForced) return;
    /* a grid or a drawer with changes not saved asks first (the dialog of CR-05) */
    try { if (CP.cpage && CP.cpage.isDirty() && !(await CP.cpage.confirmLeave())) return; } catch (e) { /* nothing open */ }
    try { if (CP.ui.drawerOwner() && !(await CP.ui.requestCloseDrawer())) return; } catch (e) { /* no drawer */ }
    try { localStorage.setItem(KEY + 'lang', to); sessionStorage.setItem(SCROLL, JSON.stringify({ hash: location.hash, y: Math.round(window.scrollY) })); } catch (e) { /* not remembered */ }
    /* ?lang= forces one load only: drop it so the choice holds */
    const u = new URL(location.href); if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); location.replace(u.toString()); } else location.reload();
  }
  /* after a switch: back to the same scroll (once) */
  function restore() {
    let v = null; try { v = JSON.parse(sessionStorage.getItem(SCROLL) || 'null'); sessionStorage.removeItem(SCROLL); } catch (e) { v = null; }
    if (v && v.hash === location.hash && v.y > 0) { const go = () => window.scrollTo(0, v.y); requestAnimationFrame(() => { go(); setTimeout(go, 120); setTimeout(go, 400); }); }
  }

  /* ---------- ?i18n=check (dev) ---------- */
  /* (d) — English words on screen (text · title · aria-label · placeholder) that are not kept (§5.2) and not data (§5.3: anything the demo data holds) */
  let dataWords = null;
  function dataSet() {
    if (dataWords) return dataWords;
    dataWords = new Set(); const seen = new Set();
    const add = s => { if (typeof s !== 'string' || seen.has(s) || /^[a-z0-9_.:|-]+$/.test(s)) return; seen.add(s); (s.match(/[A-Za-z][A-Za-z'’-]+/g) || []).forEach(w => { dataWords.add(w); w.split(/[-'’]/).forEach(p => p && dataWords.add(p)); }); };
    const walk = (x, depth) => { if (depth > 8 || x == null) return; if (typeof x === 'string') { add(x); return; } if (Array.isArray(x)) { x.forEach(y => walk(y, depth + 1)); return; } if (typeof x === 'object') Object.values(x).forEach(y => walk(y, depth + 1)); };
    try { const D = CP.store.data(); walk(D.plans, 0); walk(D.people, 0); const s = CP.ui.seed(); walk(s.campaigns, 0); walk(s.allCampaigns, 0); walk(s.products, 0); walk(CP.store.data().products, 0);
      const sub = new Set(), line = new Set(); (s.sales || []).forEach(r => { sub.add(r.sub_channel); }); (s.expenses || []).forEach(r => { line.add(r.line); }); sub.forEach(add); line.forEach(add); } catch (e) { /* no data yet */ }
    return dataWords;
  }
  const PANEL = 'i18n_check';
  function selOf(e) { const p = []; for (let x = e; x && x !== document.body && p.length < 4; x = x.parentElement) p.unshift(x.id ? '#' + x.id : x.tagName.toLowerCase() + (x.classList[0] ? '.' + x.classList[0] : '')); return p.join(' > '); }
  function screenWords() {
    const W = dataSet(), out = [], seen = new Set();
    const test = (s, el, how) => { const t = strip(s); (t.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || []).forEach(w => { const w0 = w.replace(/[-'’]+$/, ''); if (w0.length < 3 || W.has(w0) || W.has(w)) return;
      const k = w0 + '|' + selOf(el); if (seen.has(k)) return; seen.add(k); out.push({ word: w0, how, text: String(s).trim().slice(0, 80), where: selOf(el) }); }); };
    const shown = el => { if (!el || el.closest('#' + PANEL) || el.closest('#brand')) return false; if (el.closest('.hidden, [hidden]')) return false; const st = getComputedStyle(el); if (st.display === 'none' || st.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 || r.height > 0; };
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.nodeValue.trim() && /[A-Za-z]/.test(n.nodeValue) && !['SCRIPT', 'STYLE'].includes(n.parentElement.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (shown(n.parentElement)) test(n.nodeValue, n.parentElement, 'text');
    document.querySelectorAll('[title], [aria-label], [placeholder]').forEach(el => { if (!shown(el)) return; ['title', 'aria-label', 'placeholder'].forEach(a => { const v = el.getAttribute(a); if (v && /[A-Za-z]/.test(v)) test(v, el, a); }); });
    return out;
  }
  function check() {
    found.d = lang === 'th' ? screenWords() : [];
    return { lang, a: found.a.slice(), b: found.b.slice(), c: found.c.slice(), d: found.d.slice() };
  }
  let last = '';
  function panel() {
    const r = check(), sig = [r.a.length, r.b.length, r.c.length, r.d.map(x => x.word + x.where).join(',')].join('|');
    let p = document.getElementById(PANEL); if (!p) { p = document.createElement('div'); p.id = PANEL; p.className = 'i18nchk'; document.body.appendChild(p); }
    p.innerHTML = `<b>i18n check · ${lang}</b> a ${r.a.length} · b ${r.b.length} · c ${r.c.length} · d ${r.d.length}` + (r.d.length ? `<ol>${r.d.slice(0, 12).map(x => `<li><code>${x.word}</code> ${x.how} · ${x.where.replace(/</g, '&lt;')}</li>`).join('')}</ol>` : '');
    p.classList.toggle('ok', !(r.a.length + r.b.length + r.c.length + r.d.length));
    if (sig !== last) { last = sig; if (r.a.length) console.table(r.a.map(k => ({ a: k }))); if (r.b.length) console.table(r.b.map(k => ({ b: k }))); if (r.c.length) console.table(r.c.map(k => ({ c: k }))); if (r.d.length) console.table(r.d); }
  }
  if (CP.i18nCheck) {
    let t = 0; const later = () => { clearTimeout(t); t = setTimeout(panel, 500); };
    window.addEventListener('load', () => { later(); new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('#' + PANEL)) && x.target.id !== PANEL)) later(); }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder', 'class'] }); });
  }
  return { lang, set, check, restore, words: () => dataSet() };
})();
