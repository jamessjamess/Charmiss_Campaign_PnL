/* store.js — CR-03 §6: the one place that reads and writes files (File System Access API of Edge / Chrome, from file://). → CP.store
   Two folders, each chosen by the person once (showDirectoryPicker) and kept in IndexedDB charmiss_campaign_pnl › handles:
     project = "Campaign PnL - Web Dev" (has index.html and data/campaigns.csv) · pnl = "Available Campaign" (a file of the list, or its name)
   Opening the page asks nothing · the permission is asked on Save only (a user gesture) · a wrong folder is refused, not kept.
   Save (§6.2): read data/campaigns.csv from the disk → apply the change on that copy → check again → (New + template) copy the template →
   write campaigns.csv → campaigns.js → add to campaigns_log.csv · any write fails after the copy → the error names the P&L file made.
   No picker / cancelled / refused → the Download way (§6.5): campaigns.csv + campaigns.js as downloads (no template, no log).
   Tests: _use(key, handle) puts a handle in (e.g. OPFS) · _failNext('list' | 'plan' | 'expenses') makes the next write of it fail.
   CR-05: plans · expenses · people (Real files + mirrors · Mock localStorage) — the rev check of §4.3. */
CP.store = (function () {
  'use strict';
  const R = CP.rules;
  const DB = 'charmiss_campaign_pnl', ST = 'handles';
  const mem = { project: null, pnl: null };
  let failNext = null;
  const supported = () => typeof window.showDirectoryPicker === 'function';
  const err = (code, extra) => Object.assign(new Error(code), { code }, extra || {});

  /* ---------- IndexedDB (no IndexedDB → the handle lives in the page only: choose again each visit) ---------- */
  function idb() { return new Promise((res, rej) => { let q; try { q = indexedDB.open(DB, 1); } catch (e) { rej(e); return; } q.onupgradeneeded = () => q.result.createObjectStore(ST); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  async function idbGet(k) { try { const db = await idb(); return await new Promise(res => { const g = db.transaction(ST).objectStore(ST).get(k); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); }); } catch (e) { return null; } }
  async function idbPut(k, v) { try { const db = await idb(); await new Promise(res => { const tx = db.transaction(ST, 'readwrite'); tx.objectStore(ST).put(v, k); tx.oncomplete = res; tx.onerror = res; }); return true; } catch (e) { return false; } }
  async function handle(key) { if (mem[key]) return mem[key]; const h = await idbGet(key); if (h) mem[key] = h; return h; }
  const permOf = async (h, mode) => { try { return h && h.queryPermission ? await h.queryPermission({ mode }) : 'denied'; } catch (e) { return 'denied'; } };

  /* ---------- paths inside a folder ---------- */
  async function dirOf(root, path, create) { const parts = path.split('/'); let d = root; for (let i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i], { create: !!create }); return { dir: d, name: parts[parts.length - 1] }; }
  async function exists(root, path) { try { const { dir, name } = await dirOf(root, path); await dir.getFileHandle(name); return true; } catch (e) { return false; } }
  async function readFile(root, path) { const { dir, name } = await dirOf(root, path); return (await dir.getFileHandle(name)).getFile(); }
  async function readText(root, path) { return (await readFile(root, path)).text(); }
  /* the whole file in one write, then close (createWritable writes to a copy and swaps it in on close) */
  async function writeFile(root, path, data) {
    const { dir, name } = await dirOf(root, path, true), fh = await dir.getFileHandle(name, { create: true }), w = await fh.createWritable();
    try { await w.write(data); await w.close(); } catch (e) { try { await w.abort(); } catch (x) { /* nothing more to undo */ } throw e; }
  }

  /* ---------- the right folder? ---------- */
  async function check(key, dir, ctx) {
    if (key === 'project') return (await exists(dir, 'index.html')) && (await exists(dir, 'data/campaigns.csv'));
    for (const f of (ctx && ctx.files) || []) if (f && (await exists(dir, f))) return true;
    const tail = String((ctx && ctx.sourceFolder) || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop();
    return !!tail && tail.toLowerCase() === String(dir.name).toLowerCase();
  }
  /* the picker (a user gesture) · a wrong folder is refused and not kept */
  async function pick(key, ctx) {
    if (!supported()) throw err('unsupported');
    let dir;
    try { dir = await window.showDirectoryPicker({ id: 'cp-' + key, mode: 'readwrite' }); }
    catch (e) { throw err(e && e.name === 'AbortError' ? 'cancelled' : e && e.name === 'SecurityError' ? 'need_click' : 'denied', { key, cause: e }); }
    if (!(await check(key, dir, ctx))) throw err('wrong_folder', { key, got: dir.name });
    if (dir.requestPermission && (await permOf(dir, 'readwrite')) !== 'granted' && (await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') throw err('denied', { key });
    mem[key] = dir; await idbPut(key, dir);
    return dir;
  }
  /* a folder with read-write permission — asks only here (Save · Connect) */
  async function ready(key, ctx) {
    const h = await handle(key);
    if (!h) return pick(key, ctx);
    if ((await permOf(h, 'readwrite')) === 'granted') return h;
    let p = 'denied';
    try { p = h.requestPermission ? await h.requestPermission({ mode: 'readwrite' }) : 'denied'; } catch (e) { throw err(e && e.name === 'SecurityError' ? 'need_click' : 'denied', { key, cause: e }); }
    if (p !== 'granted') throw err('denied', { key });
    return h;
  }
  /* the line under the toolbar: which folders are known · nothing is asked */
  async function info() {
    const p = await handle('project'), q = await handle('pnl');
    return { supported: supported(), project: p ? { name: p.name, granted: (await permOf(p, 'readwrite')) === 'granted' } : null, pnl: q ? { name: q.name, granted: (await permOf(q, 'readwrite')) === 'granted' } : null };
  }

  /* ---------- the P&L folder ---------- */
  /* .xlsx in the P&L folder not used by the list (not ~$…) · null when that folder is not readable now (the page then shows meta.ignored_files) */
  async function listPnlFiles(usedFiles) {
    const d = await handle('pnl'); if (!d || (await permOf(d, 'read')) !== 'granted') return null;
    const used = new Set((usedFiles || []).map(f => String(f).toLowerCase())), out = [];
    try { for await (const e of d.values()) if (e.kind === 'file' && /\.xlsx$/i.test(e.name) && !e.name.startsWith('~$') && !used.has(e.name.toLowerCase())) out.push(e.name); } catch (e) { return null; }
    return out.sort((a, b) => a.localeCompare(b));
  }
  async function pnlNames() { const d = await handle('pnl'); if (!d || (await permOf(d, 'read')) !== 'granted') return null; const out = []; try { for await (const e of d.values()) if (e.kind === 'file') out.push(e.name); } catch (e) { return null; } return out; }

  /* ---------- the text of campaigns.js (window.CP_LIST) ---------- */
  function listJs(rows, fmt, updatedAt) {
    const data = { updated_at: updatedAt, columns: (fmt.columns || R.LIST_COLUMNS).map(c => String(c).trim().toLowerCase()), fmt: { bom: !!fmt.bom, eol: fmt.eol || '\n' },
      rows: rows.map(r => Object.fromEntries(R.LIST_COLUMNS.map(c => [c, r[c] == null ? '' : String(r[c])]))) };
    return { data, text: '/* Do not edit — generated from campaigns.csv (tools/build_seed.py or the Campaigns page). */\nwindow.CP_LIST = ' + JSON.stringify(data) + ';\n' };
  }
  const same = (a, b) => JSON.stringify(a.map(r => R.LIST_COLUMNS.map(c => r[c] || ''))) === JSON.stringify(b.map(r => R.LIST_COLUMNS.map(c => r[c] || '')));

  /* ===================== Save (§6.2) =====================
     change = { action, id, values, fileMode } · ctx = { rows (what the page shows), fmt, today, template (name in data/templates), sourceFolder, files (of the list), pnl (names) }
     → { list (the new CP_LIST), row, reloaded, created (P&L file made) } · throws { code: 'invalid' (errors) · 'wrong_folder' · 'cancelled' · 'denied' · 'unsupported' ·
       'need_click' · 'file_exists' · 'write_failed' (created) } */
  async function save(change, ctx) {
    if (isMock()) return saveMockList(change, ctx);   // CR-05 · D48 — the Mock list lives in localStorage
    const proj = await ready('project', ctx);
    /* 1 · the list as it is on the disk (a row typed in by hand stays) */
    const text = await readText(proj, 'data/campaigns.csv'), disk = R.listParse(text);
    disk.rows.forEach(r => { r.id = r.id || R.campaignId(r.campaign, []); });
    const reloaded = !same(disk.rows, ctx.rows || []);
    /* 2 · check again against the disk */
    const id = change.action === 'add' ? R.campaignId(change.values.campaign, disk.rows, ctx.today) : change.id;
    if (change.action === 'add' || change.action === 'edit') {
      let pnl = ctx.pnl || null;
      if (change.fileMode === 'template') { const q = await ready('pnl', ctx); pnl = []; for await (const e of q.values()) if (e.kind === 'file') pnl.push(e.name); }
      const errors = R.validateCampaign(Object.assign({}, change.values, { name: change.values.campaign, fileMode: change.fileMode, file: change.values.file }), disk.rows, change.action === 'edit' ? id : null, { pnl, template: ctx.template });
      if (Object.keys(errors).length) throw err('invalid', { errors, reloaded });
    } else if (!disk.rows.some(r => r.id === id)) throw err('invalid', { errors: { name: CP.content.camps.v.gone }, reloaded });
    /* 3 · New + template: copy the template whole (D26) — never over a file that is there */
    let created = null;
    const values = Object.assign({}, change.values);
    if (change.fileMode === 'template') {
      const q = await ready('pnl', ctx), name = R.pnlFileName(values.campaign);
      if (await exists(q, name)) throw err('file_exists', { file: name });
      const tpl = await readFile(proj, 'data/templates/' + ctx.template);
      await writeFile(q, name, await tpl.arrayBuffer());
      created = name; values.file = name;
    }
    /* 4 · campaigns.csv → campaigns.js → campaigns_log.csv */
    const at = R.nowLocal(), res = R.applyChange(disk.rows, Object.assign({}, change, { id, values }), ctx.today, at);
    const js = listJs(res.rows, disk.fmt, at);
    try {
      if (failNext === 'list') { failNext = null; throw new Error('test: the list write failed'); }
      await writeFile(proj, 'data/campaigns.csv', R.listStringify(res.rows, disk.fmt));
      await writeFile(proj, 'data/campaigns.js', js.text);
      const logRows = R.logRows(change.action, res.before, res.row, at);
      if (logRows.length) {
        let old = ''; try { old = await readText(proj, 'data/campaigns_log.csv'); } catch (e) { old = ''; }
        const lp = old ? R.listParse(old) : { rows: [], fmt: { bom: disk.fmt.bom, eol: disk.fmt.eol, columns: R.LOG_COLUMNS, trailing: true } };
        await writeFile(proj, 'data/campaigns_log.csv', listStringifyLog(lp.rows.concat(logRows), lp.fmt));
      }
    } catch (e) { throw err('write_failed', { created, cause: e }); }
    return { list: js.data, row: res.row, reloaded, created };
  }
  /* the log has its own columns (at · action · id · field · old · new) */
  function listStringifyLog(rows, fmt) {
    const q = v => { const x = v == null ? '' : String(v); return /[",\r\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; }, eol = fmt.eol || '\n', cols = R.LOG_COLUMNS;
    return (fmt.bom ? '﻿' : '') + [cols.join(',')].concat(rows.map(r => cols.map(c => q(r[c])).join(','))).join(eol) + eol;
  }

  /* ===================== the Download way (§6.5) ===================== */
  /* the change on the list the page has · campaigns.csv + campaigns.js as downloads · no template, no log */
  function saveAsDownloads(change, ctx) {
    const rows = (ctx.rows || []).map(r => Object.assign({}, r)), fmt = ctx.fmt || { bom: false, eol: '\n', columns: R.LIST_COLUMNS, trailing: true };
    const id = change.action === 'add' ? R.campaignId(change.values.campaign, rows, ctx.today) : change.id;
    const at = R.nowLocal(), res = R.applyChange(rows, Object.assign({}, change, { id }), ctx.today, at), js = listJs(res.rows, fmt, at);
    CP.ui.download('campaigns.csv', R.listStringify(res.rows, fmt), 'text/csv;charset=utf-8');
    setTimeout(() => CP.ui.download('campaigns.js', js.text, 'text/javascript;charset=utf-8'), 400);
    return { list: js.data, row: res.row, reloaded: false, created: null, downloaded: true };
  }


  /* ===================== CR-05 §4 — plans · expenses · people =====================
     Real: data/plans/<id>.json · data/expenses/<id>.csv · data/people.csv in the project folder + their mirrors data/plans.js · expenses.js · people.js
     (file:// cannot read JSON / CSV) written again after every Save. Mock (D48): the made-up ones (CP.mock.data) + what was clicked, kept in localStorage
     charmiss_campaign_pnl_mockstate { plans, expenses, people, list } — Reset mock data removes it.
     §4.3 — before a write the file is read from the disk (Mock: localStorage): its rev (expenses: its SHA-1) ≠ what the page has → nothing is written,
     the page takes the disk copy and the save fails with 'conflict'. */
  const MOCK_KEY = 'charmiss_campaign_pnl_mockstate';
  const isMock = () => !!(CP.ui && CP.ui.isMock());
  let real = null, mockSt = null, mockRaw = null, gen = 0;
  const bump = () => { gen++; document.dispatchEvent(new CustomEvent('cp:plans')); };
  function realData() {
    if (!real) {
      const P = window.CP_PLANS || {}, E = window.CP_EXPENSES || {}, H = window.CP_PEOPLE || {};
      real = { plans: Object.assign({}, P.plans || {}), expenses: Object.fromEntries(Object.entries(E.files || {}).map(([k, v]) => [k, (v.rows || []).map(r => Object.assign({}, r))])),
        sigs: Object.fromEntries(Object.entries(E.files || {}).map(([k, v]) => [k, v.sig || ''])), people: (H.rows || []).map(r => ({ id: r.id, name: r.name, role: R.roleKey(r.role), active: r.active !== false })) };
    }
    return real;
  }
  function readMockState() { try { return JSON.parse(localStorage.getItem(MOCK_KEY) || 'null') || {}; } catch (e) { return {}; } }
  /* the Mock as it is now: the made-up data + what was clicked (cached until a write here or in another tab) */
  function mockData() {
    const base = CP.mock.data(CP.ui.today());
    /* read localStorage again only after a write here (writeMock · resetMock) or in another tab (the storage event) — not on every call */
    if (mockSt && mockSt.base === base) return mockSt;
    let raw = null; try { raw = localStorage.getItem(MOCK_KEY); } catch (e) { raw = null; }
    if (!mockSt || raw !== mockRaw || mockSt.base !== base) {
      const st = raw ? readMockState() : {};
      const list = st.list ? { updated_at: st.list.updated_at || null, columns: R.LIST_COLUMNS, rows: st.list.rows } : base.list;
      mockSt = { base, raw, list, seed: st.list ? R.mergeList(base.seed, list) : base.seed, plans: Object.assign({}, base.plans, st.plans || {}), expenses: Object.assign({}, base.expenses, st.expenses || {}),
        people: st.people || base.people, actor: base.actor, sigs: {} };
      mockRaw = raw;
    }
    return mockSt;
  }
  const data = () => (isMock() ? mockData() : realData());
  function writeMock(f) { const st = readMockState(); f(st); try { localStorage.setItem(MOCK_KEY, JSON.stringify(st)); } catch (e) { throw err('denied', { cause: e }); } mockSt = null; bump(); }
  function resetMock() { try { localStorage.removeItem(MOCK_KEY); } catch (e) { /* nothing kept */ } mockSt = null; bump(); }
  window.addEventListener('storage', e => { if (e.key === MOCK_KEY) { mockSt = null; bump(); } });
  async function sha1(text) { const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const jsText = (src, v, d) => `/* Do not edit — generated from ${src} (tools/build_seed.py or the page). */\nwindow.${v} = ${JSON.stringify(d)};\n`;

  /* the mirrors from every file of the folder (§4.3) */
  async function rebuildMirrors(proj, which) {
    const w = which || ['plans', 'expenses', 'people'];
    const files = async dir => { const out = []; try { const { dir: d } = await dirOf(proj, dir + '/x'); for await (const e of d.values()) if (e.kind === 'file') out.push(e.name); } catch (e) { /* no folder yet */ } return out.sort(); };
    if (w.includes('plans')) {
      const plans = {}; let at = null;
      for (const f of await files('data/plans')) if (/\.json$/i.test(f)) { try { const p = JSON.parse(await readText(proj, 'data/plans/' + f)); plans[p.id || f.slice(0, -5)] = p; (p.log || []).forEach(x => { if (x.at && (!at || x.at > at)) at = x.at; }); } catch (e) { /* a broken file is left out */ } }
      await writeFile(proj, 'data/plans.js', jsText('data/plans/*.json', 'CP_PLANS', { updated_at: at, plans }));
    }
    if (w.includes('expenses')) {
      const out = {};
      for (const f of await files('data/expenses')) if (/\.csv$/i.test(f)) { const t = await readText(proj, 'data/expenses/' + f); out[f.slice(0, -4)] = { sig: await sha1(t), rows: R.expParse(t) }; }
      await writeFile(proj, 'data/expenses.js', jsText('data/expenses/*.csv', 'CP_EXPENSES', { files: out }));
    }
    if (w.includes('people')) {
      let rows = []; try { rows = R.listParse(await readText(proj, 'data/people.csv')).rows.filter(r => r.name).map(r => ({ id: r.id || R.campaignId(r.name, []), name: r.name, role: R.roleKey(r.role), active: !/^(0|no|false)$/i.test(String(r.active || '1')) })); } catch (e) { rows = []; }
      await writeFile(proj, 'data/people.js', jsText('data/people.csv', 'CP_PEOPLE', { rows }));
    }
  }

  /* a step on one plan · step(plan) → the new plan · o.create = the plan when there is none yet (New campaign · the first request of a pnl Campaign) ·
     o.rev = the rev the page worked on (the grid · the review drawn earlier) — another tab wrote since → conflict */
  const revOf = p => (p ? p.rev || 0 : null);
  async function savePlan(id, step, o = {}) {
    if (isMock()) {
      const disk = (readMockState().plans || {})[id] || CP.mock.data(CP.ui.today()).plans[id] || null, mine = mockData().plans[id] || null, known = o.rev != null ? o.rev : revOf(mine);
      if ((disk || known != null) && revOf(disk) !== known) { mockSt = null; bump(); throw err('conflict', { id }); }
      const base = disk || o.create; if (!base) throw err('invalid', { errors: { plan: 'no plan' } });
      const next = step(R.clonePlan(base)); next.rev = (base.rev || 0) + 1;
      writeMock(st => { st.plans = Object.assign({}, st.plans, { [id]: next }); });
      return next;
    }
    if (!supported()) throw err('unsupported');
    const proj = await ready('project', o.ctx || {}), path = `data/plans/${id}.json`;
    let disk = null; try { disk = JSON.parse(await readText(proj, path)); } catch (e) { disk = null; }
    const D = realData(), mine = D.plans[id] || null, known = o.rev != null ? o.rev : revOf(mine);
    if ((disk || known != null) && revOf(disk) !== known) {
      D.plans = Object.assign({}, D.plans); if (disk) D.plans[id] = disk; else delete D.plans[id]; bump(); throw err('conflict', { id });
    }
    const base = disk || o.create; if (!base) throw err('invalid', { errors: { plan: 'no plan' } });
    const next = step(R.clonePlan(base)); next.rev = (base.rev || 0) + 1;
    if (failNext === 'plan') { failNext = null; throw err('write_failed', { cause: new Error('test: the plan write failed') }); }
    await writeFile(proj, path, JSON.stringify(next, null, 1) + '\n');
    D.plans = Object.assign({}, D.plans, { [id]: next }); bump();
    await rebuildMirrors(proj, ['plans']);
    return next;
  }
  /* a step on the expenses of one Campaign · step(rows) → rows · the plan's log gets one line (o.log) */
  async function saveExpenses(id, step, o = {}) {
    if (isMock()) {
      const st = readMockState(), disk = (st.expenses || {})[id] || CP.mock.data(CP.ui.today()).expenses[id] || [], mine = mockData().expenses[id] || [];
      if (JSON.stringify(disk) !== JSON.stringify(mine)) { mockSt = null; bump(); throw err('conflict', { id }); }
      const rows = step(disk.map(r => Object.assign({}, r)));
      writeMock(s => { s.expenses = Object.assign({}, s.expenses, { [id]: rows }); });
      if (o.log) await savePlan(id, p => R.planAct(p, o.log)).catch(() => null);
      return rows;
    }
    if (!supported()) throw err('unsupported');
    const proj = await ready('project', o.ctx || {}), path = `data/expenses/${id}.csv`, D = realData();
    let text = null; try { text = await readText(proj, path); } catch (e) { text = null; }
    const sig = text == null ? '' : await sha1(text);
    if (sig !== (D.sigs[id] || '')) { D.expenses = Object.assign({}, D.expenses, { [id]: text == null ? [] : R.expParse(text) }); D.sigs = Object.assign({}, D.sigs, { [id]: sig }); bump(); throw err('conflict', { id }); }
    const rows = step((D.expenses[id] || []).map(r => Object.assign({}, r))), out = R.expStringify(rows);
    if (failNext === 'expenses') { failNext = null; throw err('write_failed', { cause: new Error('test: the expenses write failed') }); }
    await writeFile(proj, path, out);
    D.expenses = Object.assign({}, D.expenses, { [id]: R.expParse(out) }); D.sigs = Object.assign({}, D.sigs, { [id]: await sha1(out) }); bump();
    await rebuildMirrors(proj, ['expenses']);
    if (o.log) await savePlan(id, p => R.planAct(p, o.log)).catch(() => null);
    return rows;
  }
  /* Admin — the list of people (data/people.csv) */
  async function savePeople(rows) {
    const clean = rows.map(r => ({ id: r.id || R.campaignId(r.name, []), name: String(r.name || '').trim(), role: R.roleKey(r.role), active: r.active !== false })).filter(r => r.name);
    if (isMock()) { writeMock(st => { st.people = clean; }); return clean; }
    if (!supported()) throw err('unsupported');
    const proj = await ready('project', {}), q = v => { const x = v == null ? '' : String(v); return /[",\r\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
    await writeFile(proj, 'data/people.csv', [R.PEOPLE_COLUMNS.join(',')].concat(clean.map(r => [r.id, r.name, r.role, r.active ? 1 : 0].map(q).join(','))).join('\n') + '\n');
    realData().people = clean; bump();
    await rebuildMirrors(proj, ['people']);
    return clean;
  }
  /* the Campaign list in Mock (New · Edit · Cancel · Restore — D48): the same change on the made-up list, kept in localStorage */
  function saveMockList(change, ctx) {
    const md = mockData(), rows = md.list.rows.map(r => Object.assign({}, r)), id = change.action === 'add' ? R.campaignId(change.values.campaign, rows, ctx.today) : change.id;
    if (change.action === 'add' || change.action === 'edit') {
      const errors = R.validateCampaign(Object.assign({}, change.values, { name: change.values.campaign, fileMode: change.fileMode === 'template' ? 'later' : change.fileMode, file: change.values.file }), rows, change.action === 'edit' ? id : null, { pnl: null, template: null });
      if (Object.keys(errors).length) throw err('invalid', { errors });
    }
    const at = R.nowLocal(), res = R.applyChange(rows, Object.assign({}, change, { id }), ctx.today, at);
    writeMock(st => { st.list = { updated_at: at, rows: res.rows }; });
    return { list: null, row: res.row, reloaded: false, created: null, mock: true };
  }

  return { supported, info, handle, ready, pick, check, listPnlFiles, pnlNames, save, saveAsDownloads, listJs,
    data, savePlan, saveExpenses, savePeople, saveMockList, resetMock, rebuildMirrors, gen: () => gen, MOCK_KEY,
    _use: (key, h) => { mem[key] = h; }, _failNext: what => { failNext = what; }, _forget: async key => { mem[key] = null; await idbPut(key, null); } };
})();
