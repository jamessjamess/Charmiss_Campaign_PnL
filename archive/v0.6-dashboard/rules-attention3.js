/* archived by CR-07 (v0.7.0) — R.attention3 of src/rules-plan.js: the 3 groups of Needs attention on Operations (screen-operations.js).
   CR-07 §3 replaces it with R.issues (one rule: Sales Behind / At risk · Budget Over / Near / Spending ahead / Ended over budget). */
  /* ===================== §9.3 — Needs attention in 3 groups (V1 · V11 · CR-06 §6: on Operations, no Data group) ===================== */
  /* sales: R.attention without Over budget (it moves to Budget) · budget: the whole Campaign (budgetTrack) · approval: plans · requests · a month with no sales */
  function attention3(seed, o) {
    const td = o.today || R.todayISO(), S = R.scope(seed, o), M = S.M, cur = R.ym(td), prev = R.addMonths(cur, -1);
    const sales = R.attention(seed, o).map(x => { const is = x.issues.filter(i => i.key !== 'over'); return Object.assign({}, x, { issues: is, severity: is.some(i => i.sev === 'err') ? 'err' : 'warn' }); }).filter(x => x.issues.length);
    const live = S.ids.map(id => M.byId.get(id)).filter(c => { const s = R.statusOf(c, td); return s === 'ongoing' || s === 'not_started'; }), budget = [], approval = [];
    if (live.length) {
      const from = live.reduce((m, c) => (c.start < m ? c.start : m), live[0].start), to = live.reduce((m, c) => (c.end > m ? c.end : m), live[0].end);
      budgetTrack(seed, { from: R.monthFirst(R.addMonths(R.ym(from), -1)), to, statuses: R.STATUSES, includeCancelled: true, only: live.map(c => c.id), today: td }).rows.forEach(t => {
        if (!(t.current > 0) && !(t.committed > 0)) return;
        const is = [], over = t.committed > t.current + 0.5, ln = t.lines.find(l => l.committed > l.current + 0.5);
        if (over) is.push({ key: 'overb', sev: 'err', v: t.committed - t.current });
        else if (ln) is.push({ key: 'lineover', sev: 'warn', l: ln.line, v: ln.committed - ln.current });
        if (t.svt != null && t.svt > 20 && R.statusOf(t.c, td) === 'ongoing') is.push({ key: 'ahead', sev: 'warn', v: t.svt });
        if (!over && t.current > 0 && t.remaining / t.current < 0.1 && t.elapsed != null && 1 - t.elapsed > 0.25) is.push({ key: 'almost', sev: 'warn', v: t.used });
        if (is.length) budget.push({ id: t.id, c: t.c, severity: is.some(i => i.sev === 'err') ? 'err' : 'warn', issues: is, track: t, main: t.remaining, href: `#campaigns/${t.id}/expenses` });
      });
    }
    budget.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'err' ? -1 : 1) || a.main - b.main);
    const all = seed.allCampaigns || seed.campaigns || [], inScope = new Set(S.ids);
    approvalItems(seed, td).filter(x => x.status === 'pending' && x.latest && R.statusOf(x.c, td) !== R.CANCELLED).forEach(x => {
      if (x.kind === 'plan') { if (x.age != null && x.age >= 3) approval.push({ id: x.c.id, c: x.c, severity: 'warn', issues: [{ key: 'pendingPlan', sev: 'warn', n: x.age }], main: null, href: '#campaigns/approvals' }); }
      else if (inScope.has(x.c.id) || !M.byId.has(x.c.id)) approval.push({ id: x.c.id, c: x.c, severity: 'warn', issues: [{ key: 'pendingReq', sev: 'warn', no: x.req.no, v: sumLines(x.req.lines) }], main: sumLines(x.req.lines), href: '#campaigns/approvals' });
    });
    S.ids.forEach(id => { const c = M.byId.get(id), s = R.statusOf(c, td); if (s === R.CANCELLED || s === 'not_started') return;
      const cm = M.cells.get(id); if (!cm) return; const ms = R.monthsIn(c.start, c.end).filter(m => m <= prev), have = ms.filter(m => cm.get(m) && cm.get(m).rev[1] != null);
      if (have.length) { const miss = ms.filter(m => m > have[0] && !have.includes(m)); if (miss.length) approval.push({ id, c, severity: 'warn', issues: [{ key: 'nosalesMonth', sev: 'warn', m: miss[miss.length - 1] }], main: null, href: null }); } });
    void all;
    return { sales, budget, approval, pendingPlans: approvalItems(seed, td).filter(x => x.kind === 'plan' && x.status === 'pending' && x.latest).length,
      pendingReqs: approvalItems(seed, td).filter(x => x.kind === 'request' && x.status === 'pending').length };
  }
