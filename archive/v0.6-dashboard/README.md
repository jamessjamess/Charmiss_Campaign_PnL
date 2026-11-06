# archive/v0.6-dashboard — what CR-07 (v0.7.0) took out of the screens

Moved here, not deleted (CR-07 §11). `index.html` does not load any of these files; they are kept to read or to bring a part back.

| File | Was | Replaced in v0.7.0 by |
|---|---|---|
| `screen-operations.js` | Dashboard › Operations (CR-06 §6: Needs attention in 3 groups · Approval queue · Upcoming 30 days) | Overview › Watchlist (`R.issues`) · Campaign Planning › Approvals (R9) |
| `rules-attention3.js` | `R.attention3` of `src/rules-plan.js` (the 3 groups of Operations) | `R.issues` — one rule (CR-07 §3.3) |
| `screen-campaign.js` | Dashboard › By campaign | Campaign Monitor (`src/screen-monitor.js`, `#monitor/<id>/<tab>`) |
| `screen-sales.js` | Dashboard › Sales | Dashboard › Sales & Budget (`src/screen-salesbudget.js`) |
| `screen-spend.js` | Dashboard › Spend & Profit | Dashboard › P&L (`src/screen-pnl.js` — `CP.pnl`) |
| `screen-campaigns.js` | WORK › Campaigns (Table · Timeline · Approvals) | Campaign Planning (`src/screen-planning.js` — Plans · My tasks · Approvals · Timeline) |
| `screen-campaign-page.js` | the Campaign page (Summary · Sales target · Budget · Expenses · Requests · History) · the review · Request budget | the plan in 6 steps (`src/screen-plan.js` — `CP.cpage` · `CP.review` · `CP.reqdraw`) |

The old routes still open the new places (`src/app.js` › `redirect` · `src/screen-dashboard.js` › `ALIAS`).
