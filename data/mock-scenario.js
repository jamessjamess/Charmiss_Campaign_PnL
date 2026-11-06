/* mock-scenario.js — the story of the Mock data (CR-04 §3.2). Made-up Campaigns, not real ones: edit this file freely, no code needed.
   src/mock.js turns it into a whole seed (Campaigns · Products · Target · Budget · Sales actual · Spend actual) every time the page opens,
   with today's date (?today=yyyy-mm-dd stands in for today) — the same day gives the same numbers on every machine. Nothing is written to a file:
   what people click (new Campaigns, plans, approvals, expenses, Product Master) stays in their own browser until Reset demo data (CR-06 · D52).

   A Campaign:
     id            m-… (stays the same: the page remembers the one you looked at by its id)
     name          the name on screen
     start · end_marketing · end   yyyy-mm-dd (Status comes from the dates, as in the real list)
     target        Full target ฿ (whole baht) — the monthly targets add up to it exactly
     mkt_budget    Marketing budget ฿ · sls_budget  Sales expenses budget ฿ — the budget lines add up to them exactly
     oth_budget    Other expenses budget ฿ (CR-07 · D69: Contingency + Registration & FDA, 1–3% of the target) · royalty  Royalty / License fee ฿ (a collab)
     channels      the channels it sells in: MT · TT · ECOM
     ach           Actual ÷ Target to date the Campaign should show (1.05 = 105%) · ach_by { TT: 0.70 } = a weaker channel
     used          Spend actual ÷ Budget to date it should show
     shape         launch (month 2 the peak, then down) · steady · promo (the first month big)
     line          the product line its SKUs come from (see LINES in src/mock.js) · skus = how many (3–7)
     cancelled     yyyy-mm-dd → Cancelled on that day (actuals stop there) · note = the reason
   ach / used are left out for a Campaign that has not started. */
window.CP_MOCK_SCENARIO = {
  label: 'Mock data',
  /* the share of the target a channel takes (a Campaign without a channel shares the rest) · the sub-channels in a channel (names of the P&L files) */
  channels: { MT: 45, TT: 20, ECOM: 35 },
  subChannels: {
    MT: { Watsons: 30, Eveandboy: 18, Konvy: 12, Beautrium: 12, Multy: 8, Tsuruha: 8, CJ: 7, Lotuss: 5 },
    TT: { 'Traditional Trade': 100 },
    ECOM: { Shopee: 45, Tiktok: 35, Lazada: 20 },
  },
  /* the budget lines of the made-up Campaigns and their share */
  marketingLines: { ADS: 25, 'KOL & Agency Fee': 35, MEDIAS: 12, Production: 10, 'Event / Pop-up booth': 8, Sample: 4, 'PR Box': 3, 'Always On & Others': 3 },
  salesLines: { 'Platform Fee': 40, 'Marketing Expense - Sharing': 20, 'Tester /GWP': 15, POSM: 10, 'Warehouse & Logistic Cost': 10, 'Employee Expense - Sale': 5 },
  /* CR-07 §10 — the Other expenses (Finance): the share of oth_budget a line takes · Registration & FDA in the month before Start · the rest over the months */
  otherLines: { Contingency: 60, 'Registration & FDA': 40 },
  /* D59 (CR-06) — every expense line a budget can use (was data/expense_lines.csv · the lines above come first) · CR-07: + other */
  lines: {
    marketing: ['ADS', 'KOL & Agency Fee', 'MEDIAS', 'Production', 'Event / Pop-up booth', 'Sample', 'PR Box', 'Always On & Others', 'Comment (On social)', 'TT Materials'],
    sales: ['Platform Fee', 'Marketing Expense - Sharing', 'Tester /GWP', 'POSM', 'Warehouse & Logistic Cost', 'Employee Expense - Sale', 'BA Event', 'Compensate', 'GWP Nail Sticker +Royalty 14%',
      'Marketing Expense - Fixed', 'Other', 'Platform Fee 20%', 'Royalty Fee 7%', 'Selling Entertainment', 'Travelling Expense', 'ค่าวางสินค้า 7-11 3 รอบ'],
    other: ['Royalty / License fee', 'Registration & FDA', 'Contingency', 'Other'],
  },
  platformFeeRate: 0.12,   // Platform Fee actual = 12% of the ECOM sales actual of the month
  campaigns: [
    { id: 'm-blush-mochi-launch', name: 'Blush Mochi Launch', start: '2025-03-01', end_marketing: '2025-06-30', end: '2025-12-31', target: 36000000, mkt_budget: 3200000, sls_budget: 2400000, oth_budget: 720000, channels: ['MT', 'TT', 'ECOM'], ach: 1.08, used: 0.94, shape: 'launch', line: 'blush', skus: 5 },
    { id: 'm-songkran-lip-splash', name: 'Songkran Lip Splash', start: '2025-04-01', end_marketing: '2025-04-30', end: '2025-06-30', target: 9000000, mkt_budget: 1100000, sls_budget: 600000, oth_budget: 135000, channels: ['MT', 'ECOM'], ach: 0.86, used: 1.05, shape: 'promo', line: 'lip', skus: 4 },
    { id: 'm-matte-cushion-2026', name: 'Matte Cushion 2026', start: '2026-01-01', end_marketing: '2026-06-30', end: '2026-12-31', target: 96000000, mkt_budget: 6500000, sls_budget: 7800000, oth_budget: 960000, channels: ['MT', 'TT', 'ECOM'], ach: 1.05, used: 0.97, shape: 'launch', line: 'cushion', skus: 7 },
    { id: 'm-airy-kiss-tint', name: 'Airy Kiss Tint', start: '2026-02-01', end_marketing: '2026-05-31', end: '2026-09-30', target: 28000000, mkt_budget: 2600000, sls_budget: 1900000, oth_budget: 560000, channels: ['MT', 'TT', 'ECOM'], ach: 0.95, used: 1.02, shape: 'launch', line: 'tint', skus: 5 },
    { id: 'm-heart-cushion-holiday', name: 'Heart Cushion Holiday', start: '2026-03-01', end_marketing: '2026-06-30', end: '2026-11-30', target: 42000000, mkt_budget: 3800000, sls_budget: 3000000, oth_budget: 630000, channels: ['MT', 'TT', 'ECOM'], ach: 0.84, ach_by: { TT: 0.70 }, used: 1.12, shape: 'launch', line: 'heart', skus: 6 },
    { id: 'm-summer-sun-shield', name: 'Summer Sun Shield', start: '2026-03-15', end_marketing: '2026-05-31', end: '2026-08-31', target: 18000000, mkt_budget: 1500000, sls_budget: 1100000, oth_budget: 450000, channels: ['MT', 'ECOM'], ach: 1.18, used: 0.90, shape: 'launch', line: 'sun', skus: 4 },
    { id: 'm-glowlogram-eyeshadow', name: 'Glowlogram Eyeshadow', start: '2026-06-01', end_marketing: '2026-09-30', end: '2026-12-31', target: 24000000, mkt_budget: 2400000, sls_budget: 1600000, oth_budget: 480000, channels: ['MT', 'TT', 'ECOM'], ach: 0.93, ach_by: { ECOM: 0.85 }, used: 0.96, shape: 'launch', line: 'eye', skus: 5 },
    { id: 'm-brow-high-tint', name: 'Brow High Tint', start: '2026-08-01', end_marketing: '2026-10-31', end: '2027-01-31', target: 15000000, mkt_budget: 1400000, sls_budget: 900000, oth_budget: 450000, channels: ['MT', 'TT', 'ECOM'], ach: 1.04, used: 0.88, shape: 'launch', line: 'brow', skus: 4 },
    { id: 'm-pastel-friends-collab', name: 'Pastel Friends Collab', start: '2026-10-01', end_marketing: '2026-12-31', end: '2027-03-31', target: 48000000, mkt_budget: 5200000, sls_budget: 3400000, oth_budget: 480000, royalty: 2400000, channels: ['MT', 'TT', 'ECOM'], ach: 1.06, used: 1.00, shape: 'steady', line: 'collab', skus: 7 },
    { id: 'm-11-11-mega-sale', name: '11.11 Mega Sale', start: '2026-11-01', end_marketing: '2026-11-15', end: '2026-11-30', target: 6000000, mkt_budget: 900000, sls_budget: 700000, oth_budget: 60000, channels: ['ECOM'], ach: 1.10, used: 1.00, shape: 'promo', line: 'mega', skus: 3 },
    { id: 'm-new-year-glow-2027', name: 'New Year Glow 2027', start: '2027-01-01', end_marketing: '2027-03-31', end: '2027-06-30', target: 30000000, mkt_budget: 2800000, sls_budget: 2100000, oth_budget: 600000, channels: ['MT', 'TT', 'ECOM'], shape: 'launch', line: 'glow', skus: 5 },
    { id: 'm-valentine-lip-duo', name: 'Valentine Lip Duo', start: '2027-02-01', end_marketing: '2027-02-28', end: '2027-04-30', target: 8000000, mkt_budget: 900000, sls_budget: 500000, oth_budget: 160000, channels: ['MT', 'ECOM'], shape: 'promo', line: 'lipduo', skus: 3 },
    { id: 'm-acne-care-relaunch', name: 'Acne Care Relaunch', start: '2026-05-01', end_marketing: '2026-08-31', end: '2026-12-31', target: 20000000, mkt_budget: 1800000, sls_budget: 1200000, oth_budget: 300000, channels: ['MT', 'TT', 'ECOM'], ach: 0.62, used: 0.55, shape: 'steady', line: 'acne', skus: 4,
      cancelled: '2026-07-20', note: 'Merged into Matte Cushion 2026' },
  ],

  /* ===================== CR-05 — who · the approval story · budget requests (the numbers above stay the Current budget and the Spend actual) =====================
     people: made-up names (role as KOL: admin · manager · staff · viewer · accounting) · actor = the one the page acts as at first
     approval: owner of each Campaign above (it submitted v1, Ann approved it ~4 weeks before Start) · twice = v1 returned, v2 approved
     requests: approved ones are already inside the budget above (the first version had less) · pending ones are not counted
     drafts: Campaigns not approved yet — never on the Dashboard (D50) */
  /* CR-07 §10 — every person has a department: Brand · Sales · Marketing · Finance · Executive (Ann approves) · Admin (+ the role of KOL) */
  people: [{ id: 'ploy', name: 'Ploy', role: 'staff', dept: 'brand' }, { id: 'nok', name: 'Nok', role: 'staff', dept: 'brand' }, { id: 'beam', name: 'Beam', role: 'staff', dept: 'sales' },
    { id: 'fah', name: 'Fah', role: 'staff', dept: 'marketing' }, { id: 'mai', name: 'Mai', role: 'staff', dept: 'finance' }, { id: 'ann', name: 'Ann', role: 'manager', dept: 'executive' },
    { id: 'admin', name: 'Admin', role: 'admin', dept: 'admin' }],
  /* the one who does each step when nothing else says (CR-07 §7): Products / details = the owner (Brand) · Sales target · Sales exp = Sales · Marketing exp = Marketing · Other exp · Forecast = Finance */
  stepPeople: { sales: 'Beam', marketing: 'Fah', finance: 'Mai' },
  actor: 'Ann',
  approval: {
    owners: { 'm-heart-cushion-holiday': 'Ploy', 'm-pastel-friends-collab': 'Nok' },   // the others: Ploy · Nok in turn
    approver: 'Ann',
    twice: { 'm-matte-cushion-2026': 'A&P 15% — trim ADS of the first two months', 'm-glowlogram-eyeshadow': 'ใส่ Sales exp ของ ECOM ให้ครบก่อน · ADS สูงไป' },
  },
  requests: {
    'm-heart-cushion-holiday': [
      { status: 'approved', by: 'Ploy', at: '2026-08-10T10:20:00', decided_by: 'Ann', decided_at: '2026-08-15T14:05:00', reason: 'ADS overspent Mar–Jun for the Holiday push — true-up',
        lines: [{ type: 'marketing', line: 'ADS', month: '2026-03', amount: 80000 }, { type: 'marketing', line: 'ADS', month: '2026-04', amount: 80000 },
          { type: 'marketing', line: 'ADS', month: '2026-05', amount: 120000 }, { type: 'marketing', line: 'ADS', month: '2026-06', amount: 120000 }] },
      { status: 'pending', by: 'Ploy', at: '2026-11-02T09:40:00', reason: 'Last push before the campaign ends — Shopee 11.11 + TikTok live',
        lines: [{ type: 'marketing', line: 'ADS', month: '2026-11', amount: 600000 }] },
    ],
    'm-pastel-friends-collab': [
      { status: 'pending', by: 'Nok', at: '2026-11-03T16:10:00', reason: 'Pop-up booth cancelled by the mall — move the money to KOL for December',
        lines: [{ type: 'marketing', line: 'Event / Pop-up booth', month: '2026-11', amount: -111334 }, { type: 'marketing', line: 'Event / Pop-up booth', month: '2026-12', amount: -138666 },
          { type: 'marketing', line: 'KOL & Agency Fee', month: '2026-12', amount: 250000 }] },
    ],
  },
  /* drafts: Campaigns not approved yet — never on the Dashboard (D50) · CR-07: the step each one is at (done · in_progress · returned · not_started) */
  drafts: [
    { id: 'm-songkran-glow-2027', name: 'Songkran Glow 2027', start: '2027-04-01', end_marketing: '2027-04-30', end: '2027-06-30', target: 12000000, mkt_budget: 0, sls_budget: 0, oth_budget: 0, channels: ['MT', 'ECOM'],
      shape: 'promo', line: 'glow', skus: 4, owner: 'Ploy', approval: 'draft', created: '2026-10-28', incomplete: true,
      steps: { 1: 'done', 2: 'done', 3: 'in_progress', '4a': 'not_started', '4b': 'not_started', '4c': 'not_started' }, due3: 5 },
    { id: 'm-year-end-gift-set-2027', name: 'Year-end Gift Set 2027', start: '2026-12-16', end_marketing: '2026-12-31', end: '2027-01-31', target: 9000000, mkt_budget: 800000, sls_budget: 500000, oth_budget: 90000,
      channels: ['MT', 'ECOM'], shape: 'promo', line: 'heart', skus: 3, owner: 'Nok', approval: 'draft', created: '2026-09-20',
      steps: { 1: 'done', 2: 'done', 3: 'done', '4a': 'in_progress', '4b': 'done', '4c': 'done' } },
    { id: 'm-mid-year-lip-festival-2027', name: 'Mid-year Lip Festival 2027', start: '2027-06-01', end_marketing: '2027-07-31', end: '2027-08-31', target: 16000000, mkt_budget: 1500000, sls_budget: 1000000, oth_budget: 240000,
      channels: ['MT', 'TT', 'ECOM'], shape: 'launch', line: 'lip', skus: 5, owner: 'Nok', approval: 'submitted', created: '2026-10-20', submitted: '2026-10-31T11:30:00' },
    { id: 'm-back-to-school-brow-2027', name: 'Back to School Brow 2027', start: '2027-05-01', end_marketing: '2027-06-30', end: '2027-07-31', target: 10000000, mkt_budget: 1700000, sls_budget: 700000, oth_budget: 200000,
      channels: ['MT', 'ECOM'], shape: 'launch', line: 'brow', skus: 4, owner: 'Ploy', approval: 'returned', created: '2026-10-15', submitted: '2026-10-25T15:00:00', decided: '2026-10-27T10:45:00',
      comment: 'A&P 24% — cut ADS in the first month', revise: ['4a'] },
  ],
};
