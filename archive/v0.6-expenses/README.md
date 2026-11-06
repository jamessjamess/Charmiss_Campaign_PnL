# archive/v0.6-expenses — WORK › Expenses, cut by CR-07 (D65)

Moved here, not deleted. `index.html` does not load these files.

| File | Was |
|---|---|
| `screen-expenses.js` | WORK › Expenses (KOL Payments): the list · New / Edit drawer · Mark paid · Void · Export (`CP.screens.expenses` · `CP.expenses`) |
| `expenses-mock-store.js` | the expense items of the demo (Committed · Paid · Void) and `CP.store.saveExpenses` of `src/mock.js` |
| `expenses-words.js` | `C.exp` of `src/content.js` (every word of the Expenses screen) |

Since v0.7.0 the **Spent** of a Campaign is the actual of the demo lines by month (the same Spend actual as before — the anchor did not
move); there is no Committed / Paid and no block when saving an expense (D47). The Budget bar is Spent · Remaining · Pending request.
