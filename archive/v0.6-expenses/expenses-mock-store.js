/* archive/v0.6-expenses — what v0.6.0 had for the expense items (CR-05 §8), cut by CR-07 §9 (D65). Not loaded.
   From src/mock.js: the made-up expense items (the Spend actual cut into 1–4 items · Paid / Committed) — CP.mock.data().expenses.
   From src/mock.js › CP.store: saveExpenses (the rows check of CR-05 §4.3). See screen-expenses.js for the page. */

/* ---------- src/mock.js (inside CP.mock) ---------- */
  const VENDORS = { ADS: ['Shopee Ads', 'TikTok Ads', 'Meta Ads'], 'KOL & Agency Fee': ['Agency Alpha', 'Creator Hub'], MEDIAS: ['Media One'], Production: ['Studio Lumen'],
    'Event / Pop-up booth': ['Event Pro'], Sample: ['Pack & Go'], 'PR Box': ['Pack & Go'], 'Always On & Others': ['Agency Alpha'], 'Platform Fee': ['Shopee', 'Lazada', 'TikTok Shop'],
    'Marketing Expense - Sharing': ['Watsons', 'Eveandboy', 'Konvy'], 'Tester /GWP': ['Pack & Go'], POSM: ['Display Co'], 'Warehouse & Logistic Cost': ['Kerry Logistics'], 'Employee Expense - Sale': ['Payroll'] };
  function expenseItems(cid, rows, owner, today) {
    const cur = R.ym(today), last = R.addMonths(cur, -1), out = []; let no = 0;
    rows.slice().sort((a, b) => a.month.localeCompare(b.month) || a.type.localeCompare(b.type) || a.line.localeCompare(b.line)).forEach(r => {
      const k = `${cid}|e|${r.line}|${r.month}`, n = r.amount < 20000 ? 1 : 1 + Math.floor(rnd(k) * 4), parts = split(r.amount, Array.from({ length: n }, (_, i) => 0.6 + rnd(k + i))), vs = VENDORS[r.line] || ['Agency Alpha'];
      parts.forEach((a, i) => { if (!a) return; no++;
        const paid = r.month < last || (r.month === last && rnd(`${k}|p${i}`) < 0.6), pd = R.addDays(R.monthLast(r.month), 20);
        out.push({ no, type: r.type, line: r.line, month: r.month, vendor: vs[Math.floor(rnd(`${k}|v${i}`) * vs.length)], description: `${r.line} · ${R.monthName(r.month)}`,
          doc_no: `PO-${r.month.slice(2, 4)}${r.month.slice(5, 7)}-${String(no).padStart(4, '0')}`, amount: a, status: paid ? 'paid' : 'committed',
          committed_at: `${R.monthFirst(r.month)}T09:00:00`, paid_at: paid ? (pd < today ? pd : R.addDays(today, -1)) : '', by: owner, note: '' }); });
    });
    return out;
  }

/* ---------- src/mock.js (inside CP.store) ---------- */
  /* a step on the expenses of one Campaign · step(rows) → rows · the plan's log gets one line (o.log) */
  async function saveExpenses(id, step, o = {}) {
    const saved = (read().expenses || {})[id] || base().expenses[id] || [], mine = data().expenses[id] || [];
    if (JSON.stringify(saved) !== JSON.stringify(mine)) { st = null; bump(); throw err('conflict', { id }); }
    const rows = step(saved.map(r => Object.assign({}, r)));
    write(s => { s.expenses = Object.assign({}, s.expenses, { [id]: rows }); });
    if (o.log) await savePlan(id, p => R.planAct(p, o.log)).catch(() => null);
    return rows;
  }
