/* ui-grid.js — CR-05 §5.2 · §5.3: the one editable grid of the page (Sales target: SKU ▸ Channel ▸ Sub-channel × month · Budget: Marketing / Sales ▸ line
   × month). → CP.ui.grid(box, spec) · never written twice (§12).
   spec = { id, rows [{ key, label, sub, level 0 · 1 · 2, leaf, fold (has children), open, tip }], cols [{ key (yyyy-mm), label, year }],
            get(rowKey, colKey) → number | null · canEdit(rowKey, colKey) → bool · readOnly · fmt(v) · onChange([{ r, c, v }]) (the owner keeps the numbers,
            then calls refresh) · onFold(rowKey) · totalLabel · share + shareLabel (CR-14.2: a read-only column after Total = the row's share of the grand total) }
   The grid keeps: the active cell · typing (a digit starts it, F2 / Enter / double-click edits what is there) · ← ↑ → ↓ · Tab · Enter · Delete ·
   Ctrl+Z / Ctrl+Y (undo / redo in the page) · Ctrl+V (a tab-separated block from the active cell down / right, over the cells that can be typed) ·
   Ctrl+C (the active cell) · the sums (group rows · Total column · Total row) · a dot on a cell changed and not saved. The Total of a row typed =
   Spread total (an equal share of every month it can have, whole numbers). Sticky: the header, the first column, the Total column and the Total row. */
(function (U) {
  'use strict';
  const { C, R, esc, ICON } = U;
  const parseNum = t => { const s = String(t == null ? '' : t).trim().replace(/[฿,\s]/g, ''); if (!s || s === '-' || s === '—') return null; const neg = /^\(.*\)$/.test(s), v = +s.replace(/[()]/g, ''); return isFinite(v) ? (neg ? -v : v) : NaN; };
  /* equal whole numbers that add up to the total (largest remainder) */
  function spread(total, n) { if (!n) return []; const base = Math.trunc(total / n), out = Array(n).fill(base); let left = Math.round(total - base * n); for (let i = 0; left !== 0 && i < n; i++) { out[i] += Math.sign(left); left -= Math.sign(left); } return out; }

  function grid(box, spec) {
    const st = { r: 0, c: 0, editing: false, undo: [], redo: [], dirty: new Set(), spec };
    const leaves = () => st.spec.rows.map((x, i) => (x.leaf ? i : -1)).filter(i => i >= 0);
    const can = (ri, ci) => { const row = st.spec.rows[ri], col = st.spec.cols[ci]; if (!row || st.spec.readOnly || !row.leaf) return false; if (ci === st.spec.cols.length) return !!(row.leaf && (st.spec.canEdit ? st.spec.cols.some(c => st.spec.canEdit(row.key, c.key)) : true)); return !col ? false : st.spec.canEdit ? st.spec.canEdit(row.key, col.key) : true; };
    const fmt = v => (v == null || v === '' ? '' : st.spec.fmt ? st.spec.fmt(v) : R.fmtNum(v));
    /* the descendants (leaf rows) of each row — sums of the group rows */
    function kids() {
      const rows = st.spec.rows, out = new Map(); let stack = [];
      rows.forEach((x, i) => { stack = stack.filter(j => rows[j].level < x.level); if (x.leaf) stack.forEach(j => out.get(j).push(i)); else out.set(i, []); stack.push(i); });
      return out;
    }
    function render() {
      const S = st.spec, rows = S.rows, cols = S.cols, K = kids(), val = (ri, ci) => (rows[ri].leaf ? S.get(rows[ri].key, cols[ci].key) : (K.get(ri) || []).reduce((t, j) => { const v = S.get(rows[j].key, cols[ci].key); return v == null ? t : (t || 0) + v; }, null));
      const tot = ri => cols.reduce((t, c, ci) => { const v = val(ri, ci); return v == null ? t : (t || 0) + v; }, null);
      const all = rows.reduce((t, x) => (x.leaf ? cols.reduce((u, c) => { const v = S.get(x.key, c.key); return v == null ? u : u + v; }, t) : t), 0), sh = v => (S.share ? `<td class="num gs ro">${esc(all > 0 && v != null ? R.pct(v / all, 1) : '')}</td>` : '');
      const head = `<thead><tr><th class="gl">${esc(S.corner || '')}</th>${cols.map((c, ci) => `<th class="num${c.cur ? ' cur' : ''}" data-hc="${ci}">${esc(c.label)}${c.year ? `<small>${esc(c.year)}</small>` : ''}</th>`).join('')}<th class="num gt">${esc(S.totalLabel || C.common.total)}</th>${S.share ? `<th class="num gs">${esc(S.shareLabel || '%')}</th>` : ''}</tr></thead>`;
      const body = rows.map((x, ri) => {
        if (x.hidden) return '';
        const cls = `lv${x.level}${x.leaf ? ' leaf' : ' grp'}`, chev = x.fold ? `<button type="button" class="chev" data-gfold="${esc(x.key)}" aria-expanded="${!!x.open}" aria-label="${esc(x.label)}">${ICON.chevronDown}</button>` : '<span class="chev ph"></span>';
        return `<tr class="${cls}" data-r="${ri}"><th class="gl"${x.tip ? ` title="${esc(x.tip)}"` : ''}><span class="glw">${chev}<span class="glt">${esc(x.label)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span></span></th>` +
          cols.map((c, ci) => { const v = val(ri, ci), e = can(ri, ci); return `<td class="num${e ? ' ed' : ' ro'}${st.dirty.has(x.key + '|' + c.key) ? ' dirty' : ''}${v != null && v < 0 ? ' neg' : ''}" data-c="${ci}">${esc(fmt(v))}</td>`; }).join('') +
          `<td class="num gt${can(ri, cols.length) ? ' ed' : ' ro'}" data-c="${cols.length}">${esc(fmt(tot(ri)))}</td>${sh(tot(ri))}</tr>`;
      }).join('');
      const grand = cols.map((c, ci) => rows.reduce((t, x, ri) => { if (!x.leaf) return t; const v = S.get(x.key, c.key); return v == null ? t : (t || 0) + v; }, null));
      const foot = `<tfoot><tr><th class="gl">${esc(C.common.total)}</th>${grand.map(v => `<td class="num">${esc(fmt(v))}</td>`).join('')}<td class="num gt">${esc(fmt(grand.reduce((t, v) => (v == null ? t : (t || 0) + v), null)))}</td>${S.share ? `<td class="num gs">${esc(all > 0 ? R.pct(1, 1) : '')}</td>` : ''}</tr></tfoot>`;
      const keep = box.querySelector('.grid-wrap'), sl = keep ? keep.scrollLeft : 0, stp = keep ? keep.scrollTop : 0;
      /* fixed column widths: the browser lays the table out once, not cell by cell (2,000+ cells stay fast) */
      box.innerHTML = `<div class="grid-wrap" tabindex="0" role="grid" aria-label="${esc(S.aria || '')}"><table class="grid${S.readOnly ? ' ro' : ''}" style="width:${240 + (cols.length + 1) * 90 + (S.share ? 76 : 0)}px">${head}<tbody>${body}</tbody>${foot}</table></div>`;
      const w = box.querySelector('.grid-wrap'); w.scrollLeft = sl; w.scrollTop = stp;
      mark();
    }
    /* after an edit: the same rows — only the numbers, the dots and the sums change (no new table: fast with 2,000+ cells · TC05) */
    function update() {
      const S = st.spec, rows = S.rows, cols = S.cols, tb = box.querySelector('tbody'); if (!tb) { render(); return; }
      const K = kids(), val = (ri, ci) => (rows[ri].leaf ? S.get(rows[ri].key, cols[ci].key) : (K.get(ri) || []).reduce((t, j) => { const v = S.get(rows[j].key, cols[ci].key); return v == null ? t : (t || 0) + v; }, null));
      const put = (td, v) => { const txt = fmt(v); if (td.classList.contains('editing')) { td.classList.remove('editing'); td.textContent = txt; } else if (td.textContent !== txt) td.textContent = txt; td.classList.toggle('neg', v != null && v < 0); };
      const all = rows.reduce((t, x) => (x.leaf ? cols.reduce((u, c) => { const v = S.get(x.key, c.key); return v == null ? u : u + v; }, t) : t), 0), pc = v => (all > 0 && v != null ? R.pct(v / all, 1) : '');
      tb.querySelectorAll('tr[data-r]').forEach(tr => { const ri = +tr.dataset.r, x = rows[ri]; if (!x) return; let t = null;
        cols.forEach((c, ci) => { const v = val(ri, ci), td = tr.children[ci + 1]; if (v != null) t = (t || 0) + v; if (!td) return; put(td, v); td.classList.toggle('dirty', st.dirty.has(x.key + '|' + c.key)); });
        const gt = tr.children[cols.length + 1]; if (gt) put(gt, t); const gs = S.share ? tr.children[cols.length + 2] : null; if (gs) gs.textContent = pc(t); });
      const grand = cols.map(c => rows.reduce((t, x) => { if (!x.leaf) return t; const v = S.get(x.key, c.key); return v == null ? t : (t || 0) + v; }, null)), ft = box.querySelectorAll('tfoot td');
      grand.forEach((v, i) => { if (ft[i]) put(ft[i], v); }); if (ft[cols.length]) put(ft[cols.length], grand.reduce((t, v) => (v == null ? t : (t || 0) + v), null));
      mark(true);
    }
    const cell = (ri, ci) => box.querySelector(`tr[data-r="${ri}"] td[data-c="${ci}"]`);
    function mark(stay) { box.querySelectorAll('td.on').forEach(t => t.classList.remove('on')); const t = cell(st.r, st.c); if (t) { t.classList.add('on'); if (!stay) scrollInto(t); } }
    function scrollInto(t) { const w = box.querySelector('.grid-wrap'), gl = w.querySelector('th.gl'), head = w.querySelector('thead'), lw = gl ? gl.offsetWidth : 0, hh = head ? head.offsetHeight : 0, tw = w.querySelector('td.gt') ? w.querySelector('td.gt').offsetWidth : 0;
      if (t.offsetLeft - lw < w.scrollLeft) w.scrollLeft = t.offsetLeft - lw; else if (t.offsetLeft + t.offsetWidth + tw > w.scrollLeft + w.clientWidth) w.scrollLeft = t.offsetLeft + t.offsetWidth + tw - w.clientWidth;
      if (t.offsetTop - hh < w.scrollTop) w.scrollTop = t.offsetTop - hh; else if (t.offsetTop + t.offsetHeight + 40 > w.scrollTop + w.clientHeight) w.scrollTop = t.offsetTop + t.offsetHeight + 40 - w.clientHeight; }
    const visible = () => st.spec.rows.map((x, i) => (x.hidden ? -1 : i)).filter(i => i >= 0);
    function move(dr, dc) { const vis = visible(), i = vis.indexOf(st.r), nr = vis[Math.max(0, Math.min(vis.length - 1, (i < 0 ? 0 : i) + dr))]; st.r = nr == null ? st.r : nr; st.c = Math.max(0, Math.min(st.spec.cols.length, st.c + dc)); mark(); }
    /* the change of some cells (Total of a row = spread) — undo-able · the owner applies */
    function apply(changes, rec = true) {
      const S = st.spec, out = [];
      changes.forEach(ch => {
        const ri = S.rows.findIndex(x => x.key === ch.r); if (ri < 0) return;
        if (ch.c === '__total') { const cs = S.cols.filter(c => !S.canEdit || S.canEdit(ch.r, c.key)), parts = ch.v == null ? cs.map(() => null) : spread(Math.round(ch.v), cs.length); cs.forEach((c, i) => out.push({ r: ch.r, c: c.key, v: parts[i] })); }
        else out.push(ch);
      });
      const real = out.map(x => ({ r: x.r, c: x.c, v: x.v, old: S.get(x.r, x.c) })).filter(x => (x.v == null ? null : x.v) !== (x.old == null ? null : x.old));
      if (!real.length) return;
      if (rec) { st.undo.push(real); st.redo = []; }
      real.forEach(x => st.dirty.add(x.r + '|' + x.c));
      S.onChange(real.map(x => ({ r: x.r, c: x.c, v: x.v })));
      update();
    }
    function editor(ri, ci, start) {
      if (!can(ri, ci)) return;
      const t = cell(ri, ci); if (!t) return;
      const S = st.spec, row = S.rows[ri], isTot = ci === S.cols.length, cur = isTot ? t.textContent.replace(/,/g, '') : S.get(row.key, S.cols[ci].key);
      st.editing = true; t.classList.add('editing'); t.innerHTML = `<input class="gin" inputmode="decimal" aria-label="${esc(row.label + ' ' + (isTot ? (S.totalLabel || C.common.total) : S.cols[ci].label))}" value="${esc(start != null ? start : cur == null ? '' : cur)}">`;
      const inp = t.querySelector('input'); inp.focus(); if (start == null) inp.select(); else { const n = inp.value.length; inp.setSelectionRange(n, n); }
      const done = (commit, dr, dc) => {
        if (!st.editing) return; st.editing = false;
        const v = parseNum(inp.value);
        if (commit && !Number.isNaN(v)) apply([{ r: row.key, c: isTot ? '__total' : S.cols[ci].key, v }]);
        update();
        box.querySelector('.grid-wrap').focus({ preventScroll: true }); if (dr || dc) move(dr || 0, dc || 0);
      };
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(true, e.shiftKey ? -1 : 1, 0); }
        else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); done(true, 0, e.shiftKey ? -1 : 1); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && start != null) { e.preventDefault(); e.stopPropagation(); done(true, e.key === 'ArrowUp' ? -1 : 1, 0); }
      });
      inp.addEventListener('blur', () => done(true));
    }
    box.addEventListener('mousedown', e => { const t = e.target.closest('td[data-c]'); if (!t || e.target.closest('input')) return; const tr = t.closest('tr[data-r]'); if (!tr) return; st.r = +tr.dataset.r; st.c = +t.dataset.c; mark(); });
    box.addEventListener('dblclick', e => { const t = e.target.closest('td[data-c]'); if (t && t.closest('tr[data-r]')) editor(st.r, st.c); });
    box.addEventListener('click', e => { const f = e.target.closest('[data-gfold]'); if (f && st.spec.onFold) { st.spec.onFold(f.dataset.gfold); } });
    box.addEventListener('keydown', e => {
      if (st.editing || !e.target.classList || !e.target.classList.contains('grid-wrap')) return;
      const S = st.spec, k = e.key, mod = e.ctrlKey || e.metaKey;
      if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
      if (mod && (k === 'c' || k === 'C')) { const t = cell(st.r, st.c); if (t && navigator.clipboard) navigator.clipboard.writeText(t.textContent.replace(/,/g, '')).catch(() => {}); return; }
      if (mod) return;
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      if (mv) { e.preventDefault(); move(mv[0], mv[1]); return; }
      if (k === 'Tab') { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); return; }
      if (k === 'Enter' || k === 'F2') { e.preventDefault(); editor(st.r, st.c); return; }
      if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); const row = S.rows[st.r]; if (can(st.r, st.c)) apply([{ r: row.key, c: st.c === S.cols.length ? '__total' : S.cols[st.c].key, v: null }]); return; }
      if (/^[0-9.\-]$/.test(k)) { e.preventDefault(); editor(st.r, st.c, k); }
    });
    /* Ctrl+V — a block of Excel cells (tab / new line) from the active cell: down over the rows that can be typed, right over the months */
    box.addEventListener('paste', e => {
      if (st.editing) return;
      const text = (e.clipboardData || window.clipboardData).getData('text'); if (!text) return; e.preventDefault();
      pasteBlock(text);
    });
    function pasteBlock(text) {
      const S = st.spec, lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t')), vis = visible().filter(i => S.rows[i].leaf), start = Math.max(0, vis.indexOf(st.r)), out = [];
      lines.forEach((cells, i) => { const ri = vis[start + i]; if (ri == null) return; cells.forEach((v, j) => { const ci = st.c + j; if (ci >= S.cols.length || !can(ri, ci)) return; const n = parseNum(v); if (!Number.isNaN(n)) out.push({ r: S.rows[ri].key, c: S.cols[ci].key, v: n }); }); });
      apply(out); return out.length;
    }
    function undo() { const b = st.undo.pop(); if (!b) return; st.redo.push(b); st.spec.onChange(b.map(x => ({ r: x.r, c: x.c, v: x.old }))); update(); }
    function redo() { const b = st.redo.pop(); if (!b) return; st.undo.push(b); st.spec.onChange(b.map(x => ({ r: x.r, c: x.c, v: x.v }))); update(); }
    /* the helpers of the toolbar (on the active row) */
    function fillRight() { const S = st.spec, row = S.rows[st.r]; if (!row || !row.leaf || st.c >= S.cols.length) return; const v = S.get(row.key, S.cols[st.c].key); apply(S.cols.slice(st.c + 1).filter(c => !S.canEdit || S.canEdit(row.key, c.key)).map(c => ({ r: row.key, c: c.key, v }))); }
    function clearRow() { const S = st.spec, row = S.rows[st.r]; if (row && row.leaf) apply(S.cols.map(c => ({ r: row.key, c: c.key, v: null }))); }
    function spreadTotal() { const S = st.spec; if (!S.rows[st.r] || !S.rows[st.r].leaf) return; st.c = S.cols.length; mark(); editor(st.r, st.c); }
    render();
    return { refresh: s => { if (s) st.spec = Object.assign(st.spec, s); render(); }, clean: () => { st.dirty.clear(); render(); }, dirty: () => st.dirty.size > 0, undo, redo, fillRight, clearRow, spreadTotal,
      paste: pasteBlock, active: () => ({ row: st.spec.rows[st.r], col: st.spec.cols[st.c] }), focus: () => { const w = box.querySelector('.grid-wrap'); if (w) w.focus(); }, setActive: (r, c) => { st.r = r; st.c = c; mark(); },
      canUndo: () => st.undo.length > 0, canRedo: () => st.redo.length > 0 };
  }
  return Object.assign(U, { grid, parseNum, spread });
})(CP.ui);
