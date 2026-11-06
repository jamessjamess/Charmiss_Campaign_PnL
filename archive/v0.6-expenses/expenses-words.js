/* archived by CR-07 (v0.7.0, D65) — C.exp of src/content.js: the words of WORK › Expenses (screen-expenses.js). Spent now = the actual of the Mock lines. */
    /* ===================== CR-05 §8 — Expenses (WORK › Expenses · the Payments of KOL) ===================== */
    exp: {
      title: 'Expenses', state: { committed: 'Committed', paid: 'Paid', void: 'Void' }, newBtn: 'New expense', exportBtn: 'Export', search: 'Search vendor, doc no or description',
      allYears: 'All years', allCampaigns: 'All campaigns', allLines: 'All lines', statusL: 'Status', statusBtn: v => `Status: ${v}`, statusAll: 'All', yearL: 'Year', campaignL: 'Campaign', lineL: 'Line',
      cols: { no: 'No', month: 'Month', campaign: 'Campaign', line: 'Line', vendor: 'Vendor', description: 'Description', doc: 'Doc no', amount: 'Amount', status: 'Status', by: 'By' },
      total: n => `Total · ${n} line${n === 1 ? '' : 's'}`, menu: { edit: 'Edit', paid: 'Mark paid…', void: 'Void…', open: 'Open campaign', more: 'More actions' },
      overLine: 'Over line budget', overLineTip: 'More than the budget of this line — allowed, the campaign stays within its budget (D47)',
      d: { newTitle: 'New expense', editTitle: n => `Edit expense #${n}`, campaign: 'Campaign', campaignPh: 'Choose a campaign', line: 'Line', month: 'Month', vendor: 'Vendor', description: 'Description', doc: 'Doc no (PO / Invoice)',
        amount: 'Amount ฿ ex VAT', status: 'Status', paidOn: 'Paid date', save: 'Save expense', side: 'Line budget', budget: 'Budget', committed: 'Committed', remaining: 'Remaining', thisMonth: 'This month', whole: 'Whole campaign',
        campaignLeft: 'Campaign left', blockOver: v => `Over the campaign’s remaining budget by ${v} — ask for more first`, warnLine: v => `Over this line’s budget by ${v} — you can still save it (Over line budget)`,
        request: 'Request budget', required: 'Required', amountPos: 'Enter an amount above 0', onlyWeb: 'Approved campaigns' },
      paidD: { title: n => `Mark paid · #${n}`, date: 'Paid date', ref: 'Ref (optional)', refPh: 'PR no. · transfer no. — no account numbers', ok: 'Mark paid' },
      voidD: { title: n => `Void expense #${n}?`, body: 'The row stays in the list as Void and is no longer counted in the spend.', reason: 'Reason', ok: 'Void', need: 'Enter the reason' },
      none: 'No expense in this filter', file: 'Expenses',
      toast: { saved: n => `Expense #${n} saved`, paid: n => `#${n} marked paid`, void: n => `#${n} void` },
    },
