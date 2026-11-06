# archive/v0.7-dashboard — what CR-08 (v0.8.0) took out of the Dashboard

Moved here, not deleted. `index.html` does not load these files; they are kept to read or to bring a part back.

| File | Was | Replaced in v0.8.0 by |
|---|---|---|
| `screen-salesbudget.js` | Dashboard › Sales & Budget (CR-07 §4.3: Target vs Actual · By channel · SKU watchlist · Budget vs Actual · Spend by line · Budget by campaign) | two tabs (D73): Dashboard › Sales (`src/screen-sales.js`) and Dashboard › Budget (`src/screen-budget.js`) |

Taken out of the screens that stay (the code is gone from them, the words below are kept here):

| What | Was in | Why (CR-08) |
|---|---|---|
| the question line under the tabs (`C.dash.q`: *How is the year going — and which campaigns need a look?* · *What do the campaigns earn — in total and one by one?* · *Are we selling to the target, and is the budget in line with the time?*) | `src/screen-dashboard.js` · `src/content.js` | §2.1 · D72 |
| the source line under the toolbar (*As of 04/11/2026 · 2026 is 84% gone*) | each tab | §2.2 — *As of* is in the toolbar now, the % of the year in its ⓘ |
| the year bar of Overview (*2026 · 84% of the year gone · Sales 82% of the full-year target · Budget 82% used · Profit ฿104.8M of plan ฿127M · 4 campaigns need a look ›*) and its export sheet *The year* (`o_year`) | `src/screen-overview.js` | §2.2 · D72 — the same numbers are in the KPI cards |
| Sales vs Time gone on Overview (`o_pace`) | `src/screen-overview.js` | D74 — the same table (the same rows, the same rule) is on Sales (`s_pace`) |
| the Campaign timeline with the monthly mini bars and the Revenue / Spend switch (`R.timeline` is still in `src/rules-pnl.js` — the Table of Campaign Planning uses its words) | `src/screen-overview.js` | §7 · D78 — one bar a row |

The old routes still open the new places: `#dashboard/salesbudget` → `#dashboard/sales` (and a remembered tab "salesbudget" opens Sales) — `src/screen-dashboard.js` › `ALIAS`.
