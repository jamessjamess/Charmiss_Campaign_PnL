# Changelog

## v0.10.0 — 06/11/2026 · CR-10 Dashboard: tab order + the tab bar that stays · Overview All campaigns · P&L by campaign · Sales by campaign · Lite

- **Tabs** (D90 · D91 · D92): **Overview · P&L · Sales · Expenses** · *Budget* → **Expenses** (the Dashboard tab · *Expenses to watch* ·
  the Monitor tab) — "Budget" stays the yardstick (Budget used · Budget by campaign) · `#dashboard/budget` and a remembered "budget" →
  Expenses · `#monitor/<id>/expenses` · Ctrl+K in the new order · `screen-budget.js` renamed `screen-expenses-tab.js`.
- **The tab bar stays** (D98 · `U.stickyTabs`): once the banner scrolls away the tabs stay under the top bar (a soft shadow) · from 1280 px
  the toolbar joins them in one row (Dashboard: Year · Status · As of · Export · Monitor: Year · Campaign · ‹ › · Export) · Planning: the
  tabs only · under 1280 px the tabs only · a tab clicked while scrolled opens at the top of its content · the cards a link scrolls to
  stay clear of the bar.
- **Overview** (D94 · D95): Row 3 **All campaigns** — the bar of each campaign (`U.timelineLite`) + Sales · Ach % (Time gone tick) ·
  Expenses · Used % · Status, grouped On going · Not started · Ended (they fold) · the total = the KPI · Row 4 Sales to watch | **Expenses
  to watch** · Row 5 **Where each ฿100 of sales goes** (COGS ฿32 · Marketing ฿8 · Sales ฿8 · Other ฿2 · Profit ฿49 · plan ฿49).
- **P&L by campaign** (D96): Net revenue · **COGS · Gross profit · Total expenses ▸** (opens Marketing · Sales · Other) · Campaign profit ·
  Margin · Profit vs plan to date · ROI — **no GP % by campaign** (the channel mix makes it mislead · GP % of the year stays).
- **Sales** (D93 · D97): Target vs Actual by month **Total | By campaign | By channel** — By campaign = Top 5 of the year + Others
  (the colours `--ph1…--ph5` by rank · the tooltip lists every campaign of the month · a legend click highlights one) · Sales vs Time gone
  in one line a row (`91% · 26 days left` · `100% · Ended 30/09`) · **Revenue by campaign** (donut Top 5 + Others | the bars of every
  campaign + the full-target tick) · **Revenue by channel × campaign** (`U.channelMatrix` — the SKU × Channel of CR-09, now one helper
  for both) + the channel mix of the year · SKU watchlist **Behind — Top 10 | Best — Top 10** together · Revenue by channel / By
  channel cards removed (their numbers are in the matrix).
- Rules (no formula changed): `R.per100` · `R.campaignRank` · Mock anchor v0.7 the same to the baht.

## v0.9.0 — 06/11/2026 · CR-09 Campaign Monitor clean + deeper · Campaign Planning in line with the Dashboard · Lite

- **One status rule at every level** (D80): Campaign · Channel · SKU · SKU × Channel use the **Pace** of D67 (Ach % of its full target ÷
  Time gone) — the target to date of D14 stays in the tooltips (Heart Cushion = At risk everywhere) · `R.paceNode` · **Near budget** replaces
  *Near limit* on every page (D89).
- **Campaign Monitor › Summary** (D79): Time gone written once (the head) · KPI Net revenue · Budget used · Campaign profit · Forecast end (Est.)
  in the Dashboard's anatomy (one-line captions · the Time gone tick) · Required run-rate moved into **What to do** (*Sell ฿10.3M a month for
  the last 26 days — 2.5× the current pace* · See SKUs behind › · Request budget · ✓ On pace and within budget) · **Burn-up** + the End
  marketing line + the dashed forecast ends (Ach → Forecast end % · Used → the spend pace) + *Mar / 2026* under the axis.
- **Sales** (D81 · D82 · D83): the Channel and ฿ | Qty belong to the tab · Target vs Actual by month **Total | By channel** · **Sales mix
  by channel** (donut + Target mix / Actual mix) · Channel attainment (Actual · Share % · Full target · Ach % + Time gone · Gap to pace ·
  Remaining · Status) · **SKU × Channel** (actual ฿ in every cell · Ach % under · the tint = the status · Actual ฿ | Ach % | Share % · Behind ·
  At risk · On track · Sort) · **Sub-channel share** · **SKU contribution** (Pareto).
- **Budget** (M6 · M7): an Other line stays in **Other** (Contingency · Registration & FDA were under Sales — the totals never moved) ·
  **Budget by line** Marketing ▸ Sales ▸ Other folded · Used % with the Time gone tick · Over / Near budget / OK · Spend by group (donut).
- **P&L** (D84): waterfall LEFT | statement RIGHT · Spend by line removed (it is in Budget) · **Sales vs Marketing by month** (bars =
  Marketing · line = Net revenue on its own axis · End marketing) · `R.afterMarketingDrop` · `R.mktEfficiency` by Campaign.
- **History**: an icon a kind · **Compare v1 ↔ v2** (the plan diff in a dialog).
- **Campaign Planning** (D85 – D88): the plans only (no Used % bar, no result chips) · KPI In progress · Steps overdue · In review · Next
  12 months (`R.planningKpi`) · tabs **In progress** first · Start + *in n days* · Approved = *Approved dd/mm/yyyy · Ann* + Monitor › ·
  Budget (plan) + A&P · My tasks (summary line · *Blocked · n steps* ⓘ · overdue first) · Pending = cards (**Review · Open plan** · 2 lines
  + *+n more*, never "…") · Decided / Drafts = a short table, one row a campaign (open it for the earlier versions) · **Timeline** on the
  Dashboard's bar (`U.timelineLite`) · 3 months back → 12 ahead · the rows outside fold into one line · plan colours.
- New in `ui.js`: `comboChart` (monthChart + a line on its own axis + vertical lines) · `mixBars` · `paretoBars` · `timelineLite` group /
  fold / extra rows · `donutHTML` fmt · the numbers: Mock anchor v0.7 the same to the baht (Dashboard · Monitor of every Campaign · Export).

## v0.8.0 — 06/11/2026 · CR-08 Dashboard clean, the insight on the first screen: Overview · Sales · Budget · P&L · Lite

- **4 tabs** (D73): **Overview · Sales · Budget · P&L** (can we sell → what do we spend → what is left) · `#dashboard/sales` ·
  `#dashboard/budget` · `#dashboard/salesbudget` and a remembered "salesbudget" tab → Sales · Ctrl+K: Overview · Sales · Budget · P&L.
- **One header for every tab** (§2 · D72): no question line under the tabs · no year bar · the toolbar in one line *Year · Status ……
  As of dd/mm/yyyy ⓘ · Export* (the ⓘ: *Actual to … · 2026 is 84% gone (57 days left)*).
- **KPI anatomy** (§2.3 · D76): 4 cards a row · value + grey suffix · a bar with the black **Time gone** tick where the number moves with
  the time · **a caption of one line** `% · what is left · the time` (1 line at 1280 / 1440 / 1920 · the bars of a row on one line).
- **ⓘ after its words on every page** (§2.4 · D75 — C12 of CR-01 replaced): KPI · card titles · table headers (`Ach % ⓘ`, right-aligned
  as one block) · 4 px · the last word never apart from its ⓘ.
- **Charts inside their card** (§2.5): the y axis = the longest label + 8 px · short money without `.00` (`฿300M`) · the P&L waterfall no
  longer leaves the card (Campaign Monitor › P&L uses the same helper) · horizontal bars from 0 at the left (a 0 in the middle only with a loss).
- **Overview** (§3 · D74): KPI Net revenue · Budget used · Campaign profit · Campaigns (`6 running · 2 ended · 4 to watch ›`) · Revenue vs
  target by month (270 px) · **Sales to watch | Budget to watch** (Sales first · one line a row · the same height) · **Campaign timeline**
  one bar a row (§7 · D78): solid Start → today, faded today → End · the colour = the sales status · dark grey ended · grey outline not
  started · End marketing tick · `Ach 79% · 26 days left` · sorted by Start · no monthly mini bars, no Revenue / Spend switch.
- **Sales** (§4): KPI Net revenue · Forecast end (Est.) · Units sold · On track · Target vs Actual by month · **Sales vs Time gone** (moved
  from Overview — the same rows · Pace in the tooltip of Status) · **Revenue by channel** donut (1/3) | By channel (2/3) · SKU watchlist 5 + 5.
- **Budget** (§5): KPI Budget used · Remaining · To watch · Pending requests · Budget vs Actual by month · **Budget by campaign** (Current ·
  Spent · Used % + Time gone · Remaining · Pending · Status — the worst first) · **Spend by group** donut (1/3) | Spend by line (2/3).
- **P&L** (§6): KPI Gross profit `GP 68% · plan 68%` · Total expenses `A&P 18.4% · plan 18.5%` (the groups in the bar's colours and its
  tooltip) · **waterfall left | statement right** (half and half, the same height) · P&L by campaign (*Profit vs plan to date ⓘ*) ·
  **Profit by campaign | Marketing efficiency** (new, D77: net sales per ฿1 of marketing · the tick = plan · the dashed line = the 2026
  average 11.8× · ok ≥ plan · warn ≤ 20% below · err more) — the same rows at the same height, read across.
- **Numbers**: Mock anchor v0.7 the same to the baht (KPI · statement · tables · Export) · the only new number = Marketing efficiency
  (`R.mktEfficiency` — from Net revenue · Marketing · Target · Marketing budget already there).
- Archived (not deleted): `screen-salesbudget.js` + the words of the question lines / year bar → `archive/v0.7-dashboard/`. New:
  `screen-sales.js` · `screen-budget.js` · `U.donutHTML / drawDonut` (KOL drawRing) · `U.timelineLite` · `U.rowBars` · `U.axisLeft`.

## v0.7.0 — 05/11/2026 · CR-07 Dashboard of the year · Campaign Monitor · Campaign Planning in 6 steps · Lite

- **Menu** (D61): WORK Dashboard · **Campaign Monitor** · **Campaign Planning** — MASTER DATA Product Master · sidebar v0.7.0 · the old
  routes go to the new ones (`#dashboard/sales|spend|operations` → the matching tab · `#dashboard/campaign/<id>` → `#monitor/<id>` ·
  `#campaigns…` → `#planning…` · `#expenses` → the Dashboard) · Ctrl+K: the 3 tabs · Monitor (+ a Campaign) · Planning (+ My tasks ·
  Approvals · Timeline) · Product Master · New campaign.
- **One rule for Time gone · Pace · issues** (§3 · D67 · D68): Time gone % · Ach % of the full target · Pace = Ach ÷ Time gone (On track ≥
  0.95 · At risk 0.85–0.95 · Behind < 0.85 · "—" before Start / under 10%) · Budget status Over · Near limit · Spending ahead · Ended over
  budget · `R.issues` gives the same count to the year bar, KPI Campaigns, the Watchlist, Monitor and Plans (R2 · R3).
- **Dashboard by year** (D66): toolbar Year + Status (no presets) · *As of dd/mm/yyyy · 2026 is 84% gone* · 3 tabs (R1):
  **Overview** (the year in one line — R10 · KPI with the Time gone tick · Sales vs Time gone — R4 · Watchlist Budget | Sales · by month ·
  calendar) · **P&L** (KPI · statement Plan / Actual / Forecast end (Est.) / Forecast vs Plan · waterfall Plan / Actual / Forecast · P&L by
  campaign · Profit by campaign) · **Sales & Budget** (by month · By channel folded — R5 · sub-channel = share of the actual — D63 · SKU
  watchlist · Budget vs Actual · Spend by line · Budget by campaign). Operations is gone — its queue lives in Planning › Approvals (R9).
- **Campaign Monitor** (`#monitor/<id>/<tab>`, was *By campaign* — R8): Year · Campaign · ‹ › urgent → watch → rest · Channel · the head
  (Time gone · chips · Request budget · View plan) · Summary (Sales vs Time gone · Budget used · Forecast end vs plan and the approved
  Forecast · run-rate · Burn-up · What to do) · Sales · Budget (Marketing ▸ Sales ▸ Other) · P&L · History.
- **Campaign Planning** (`#planning`, was Campaigns): **Plans** (Progress 6 dots · Waiting on · In review · 50 rows a page — R7) · **My tasks**
  · **Approvals** · **Timeline** (R6: the first month whole · a start date off the Today line). **The plan in 6 steps** by department (D64):
  1 Campaign details · 2 Products (Role Hero / Core / GWP) · 3 Sales target **SKU × Channel × month** (D62) · 4a Marketing · 4b Sales ·
  4c **Other** exp · 5 **Forecast** (Worst / Base / Best · break-even — D71) · 6 Review & submit · assignee + Due per step · Overdue /
  Due soon · read only for the others · a Done step changed → step 5 *Needs refresh* · the Executive **Revises by step** (D70).
- **Other expenses** = the 3rd group everywhere (D69): Mock Contingency · Registration & FDA (+ Royalty for Pastel Friends Collab) ·
  **Mock anchor v0.7** (Target · Net revenue · COGS · Marketing · Sales exp of every Campaign the same to the baht).
- **Expenses cut** (D65): no menu, route, drawer or *Committed / Paid* · Spent = the actual of the Mock lines · the Budget bar = Spent ·
  Remaining · Pending request · `archive/v0.6-expenses/` (screen · store · words).
- Archived (not deleted): `screen-operations.js` · `screen-campaign.js` · `screen-sales.js` · `screen-spend.js` · `screen-campaigns.js` ·
  `screen-campaign-page.js` · `R.attention3` → `archive/v0.6-dashboard/`. New: `screen-pnl.js` · `screen-salesbudget.js` ·
  `screen-monitor.js` · `screen-planning.js` · `screen-plan.js`.

## v0.6.0 — 05/11/2026 · CR-06 Mock only · clean-up · Campaigns › Timeline · Dashboard › Operations · Product Master · Lite

- **Demo data only** (D51 · D52): the Data Mock | Real switch, the Mock band and every Real-only text are gone · the page loads no real
  data file · the P&L-file way (`build_seed.py` · `seed.js` · `campaigns.csv` · the mirrors · `targets/` · `templates/` · `expense_lines.csv`
  · `SEED_REPORT` · `TARGET_CONTRACT` · `src/store.js`) moved to `archive/v0.5-real/` (not deleted) · what people click stays in their
  browser · **Reset demo data** moved to the Acting as menu · Export keeps no `_MOCK`, the first sheet says *Data: demo (made-up numbers)*
  (D54) · source line *Actual to dd/mm/yyyy* · legends *Actual*. The demo store (`CP.store`) now lives at the end of `src/mock.js`.
- **No import** (D53): Paste sheet · Import targets CSV · Paste rows removed — Ctrl+V of a block in the grid stays.
- **Clean-up** (§4): no Prototype band (Acting as stays — D60) · no `Work ›` on the banners · the Campaign page `Campaigns › <name>` (D55) ·
  Campaigns table without Data · no *Copy file name* · no P&L file field in New / Edit · no P&L-file lines on the Summary.
- **Campaigns › Timeline** (D56 · `src/screen-timeline.js`): Table · Timeline · Approvals · every approval state on a Gantt (the gantt
  pieces of Overview) · Running a month · Month | Quarter · Group by Owner / Approval · Today in the middle · tooltip · ↑ ↓ Enter ·
  Export · the tab seen last opens.
- **Dashboard › Operations** (D57 · `src/screen-operations.js`): KPI Needs attention · Pending approvals · Budget requests · Unpaid
  expenses · Needs attention (moved from Overview, no Data group, 3 columns ≥ 1200 px) · Approval queue · Upcoming 30 days · 4-sheet
  Export · Overview: the Campaign timeline gets the whole row, *2 need a look* opens Operations.
- **MASTER DATA › Product Master** (D58 · `src/screen-products.js`): 75 made-up products (every SKU of the 16 Campaigns, one code a
  product, COGS as before + 12 more) · search · Category · Group · status tabs · sort · Export · the drawer (checks · Used in campaigns ·
  History) · Admin / Manager change, the others view · Discontinue / Reactivate · Admin deletes a product never used · **the plans take
  SKUs from it only** (snapshot of COGS and price · *COGS changed in Product Master* · *Update to ฿x* on a Draft / Returned plan · the
  review shows *Products vs Product Master*).
- Ctrl+K: Timeline · Operations · Product Master · PRODUCTS · New product. Side menu: WORK · MASTER DATA. Expense lines in
  `mock-scenario.js` › `lines` (D59).
- The anchor (CR-04 table D) is the same before any click and after Reset demo data.

## v0.5.0 — 05/11/2026 · CR-05 Campaign Plan by SKU · Approval · Budget requests · Track · Lite (a prototype)

- **Acting as** (top bar, as KOL's user block · a band *Prototype — no login*): Switch user among the people of `data/people.csv`
  (Mock: Ploy · Nok (Staff) · Ann (Manager) · Admin · Mai (Accounting)); roles Admin · Manager · Staff · Viewer · Accounting; every action is
  saved with the name; each tab can act as another person; Admin › *Edit people…*.
- **The Campaign page** `#campaigns/<id>[/tab]` (a row of Campaigns · Ctrl+K · New campaign): Approval + Status chips · Owner · period · vN ·
  the buttons this person may use · Summary · Sales target · Budget · Expenses · Requests · History (Compare). New `src/ui-grid.js` —
  the one Excel-like grid (keyboard · Ctrl+V a block · undo / redo · Fill right · Spread total · Clear row · sticky header / first column ·
  fixed widths: 10 SKU × 14 Sub-channel × 12 months draws in ~65 ms, an edit ~40 ms). **Paste sheet** from the P&L file's own sheets ·
  **Import targets CSV** (TARGET_CONTRACT).
- **Approval as KOL** (D44): Draft · Pending approval · Approved · Returned (+ Rejected = the end, Duplicate as draft) · Withdraw ·
  Campaigns › **Table · Approvals (n)** with the KOL cards (Pending · Decided · Drafts · All types) · the badge on Campaigns · the review in one
  big container (What changed since vN · Campaign · Plan · Target · Budget · Checks · History · Decision at the end; Approve only once the
  Decision is in view · comment ≥ 5 to Return / Reject · Undo 10 s · then the next one waiting).
- **Request budget** (Increase · Reallocation · Release by line × month, with its Impact; never below what is committed) → approved =
  the Current budget everywhere; pending = a dashed part of the bar, not counted.
- **WORK › Expenses** `#expenses` (D45): Committed · Paid · Void · New / Edit drawer with the Line budget beside it · over the Campaign's
  remaining budget = blocked + *Request budget* filled in (D47) · over a line = a warning + *Over line budget* chip · Mark paid (Admin /
  Accounting: date + Ref) · Void (reason) · Paste rows · Export. Spend actual = Committed + Paid.
- **Files** (Real, written through CR-03's store, never downloaded): `data/plans/<id>.json` (rev — a save over a newer file is refused:
  *Someone changed this campaign — reloaded*), `data/expenses/<id>.csv` (SHA-1 check), `data/people.csv` + their mirrors `data/plans.js` ·
  `expenses.js` · `people.js` (also made by `build_seed.py`). `campaigns.csv` keeps its 10 columns — web | P&L file comes from the plan file.
- **Rules** `src/rules-plan.js` (pure): planTotals · planChecks · planDiff · canDo · planAct · requestImpact · expenseRoom · budgetTrack ·
  **mergePlans** (the approved plans · requests · expenses over the seed in its own schema — every Dashboard rule unchanged) · attention3.
- **Dashboard (V1–V11)**: one **Budget bar** (Paid · Committed · Remaining of the current budget · Pending · ▲ budget to date — V2) · Overview
  KPI Total spend → **Budget** · **Needs attention** in 3 groups Sales · Budget · Approval / Data, never folded whole, as tall as it says,
  *Pending approvals n · Budget requests n* (V1 · V11) · **Campaign tracker** · Spend & Profit: Total spend *of budget to date*, Budget left →
  **Budget**, *Spend & profit by campaign* **Budget | Profit** (KOL columns, rows open to their lines, *n campaigns with no budget yet* — V4) ·
  Budget vs Actual: *includes ฿11.6M entered in one month (Charming Lab)* (V3) · Sales: no forecast before the first sales month (V5) ·
  By campaign: the **Budget block**, the statement opens on Full plan with no actual (V7), Spend by line folds when empty (V8) · source line
  chip *Spend not updated since May 2026* (V9) · *COGS partly estimated* at the end of the caption, no Est. badge beside Plan (V10).
- **Campaigns** (V12): Name · Approval · Status · Time · Owner · Target · Budget · Data · ⋯ · tabs + Draft · Pending approval (Rejected when
  there is one) · a row opens the Campaign page · ⋯ Open · Open in Dashboard · Edit details · Copy file name · Cancel / Restore.
- **Mock** (§11 · D48): 16 Campaigns (13 Approved web plans — 2 of them v2 after a Return — + Songkran Glow 2027 Draft · Mid-year Lip
  Festival 2027 Pending · Back to School Brow 2027 Returned), requests (Heart Cushion #1 Approved +฿400,000 · #2 Pending +฿600,000 ·
  Pastel Friends #1 Pending Reallocation), expenses = the CR-04 spend to the baht; clicks kept in `localStorage`, **Reset mock data**.
  The CR-04 anchor is unchanged before any click and after Reset; the Real anchors are unchanged.

## v0.4.0 — 04/11/2026 · CR-04 Mock data · Dashboard 4 tabs · readable UX

- **Data: Mock | Real** (top bar, Mock first, **Mock the default** while in DEV — D32). Mock is now a **whole made-up seed** worked out
  in the browser from `data/mock-scenario.js` (`src/mock.js`, D33): 13 made-up Campaigns 2025–2027, 3–7 SKUs each (codes M0101…),
  targets / budgets that add up to the scenario to the baht, sales and spend actual to today (this month to date · a Cancelled one to
  its day) shaped to each Campaign's `ach` / `used` · Platform Fee actual = 12% of the ECOM sales actual · the same day = the same
  numbers on every machine. It reads neither `seed.js` nor `campaigns.csv`. The old mock (made-up sales on the real targets) is gone.
  Mock band *Mock data — made-up numbers … Switch to Real* · `Source: Mock data · 13 campaigns · actual to dd/mm/yyyy` · exports `_MOCK`.
- **Dashboard in 4 tabs**, one question each (a grey line under the tabs): **Overview** (`#dashboard/overview`, the default — KPI
  Net revenue · Total spend · Campaign profit · Campaigns, Revenue vs target by month, **Needs attention** | Campaign timeline) ·
  **Sales** (`#dashboard/sales` — KPI Net revenue · Forecast (Est.) · Units sold · On target, Target vs Actual by month ฿ | Qty,
  **Campaign attainment** 10 columns with the channels under each, By channel with the sub-channels, SKU watchlist Behind | Best) ·
  **Spend & Profit** (`#dashboard/spend`, was P&L Waterfall — KPI Gross profit · Total spend · Campaign profit · **Budget left**,
  P&L waterfall, Budget vs Actual by month, **Spend & profit by campaign** (a row = Scope), P&L statement | Spend by line) ·
  **By campaign** (KPI Time left · Net revenue · Required run-rate · **Campaign profit**, the SKU card says *n / m SKUs on target*,
  Row 5 its P&L statement | Spend by line + *Open in Spend & Profit ›*). `#dashboard/all` → Overview · `#dashboard/waterfall` →
  Spend & Profit · the remembered tab of v0.3.1 is turned into the new one. The 14-column Portfolio is split between Sales and Spend & Profit.
- **Status: All except cancelled ▾** (as KOL) holds Cancelled (a line above it) — the Include cancelled box left the Dashboard
  (the Campaigns page keeps it). The toolbar stays on one line at 1440 px (Scope and Status as wide as their words).
- **One word a thing**: Target (sales) · Budget (spend) · Plan only for the profit plan and the statement's Plan column.
- **No actual yet**: one band a tab (*No sales actual in the P&L files yet · Show target · Switch to Mock data*), the KPI show the
  target / budget / plan in grey with a tag, the cards that need actual fold to one line (~56 px); *Show target* opens them.
- **Rules** (`rules-pnl.js`, pure): `forecast` (one rule for By campaign · Sales · Needs attention: the rest of this month counts as part
  of a month) · `attention` · `salesTable` · `spendTable` · `skuWatch` · `budgetLeft` · `channelSubs` · **Target / Budget to date of the
  month in progress = its share to date** (day ÷ days — the Mock's month-to-date actual is compared like with like; Real has no
  actual in this month, so nothing changes there) · Ach % / Used % show one decimal where rounding would cross 90% / 100%.
- Tables ≤ 10 columns, no sideways scroll at 1440 / 1920 px (the Timeline's Table view: the period's target · actual · Ach % instead
  of a column a month) · Time column (elapsed bar + n days left / Ended dd/mm / Starts in n days) · Timeline summary on one line
  (`Ach 96% · ฿58.2M`) · the P&L statement without a sideways scroll (GP % / Margin % under the label, side by side from 1440 px).
- **Campaigns page**: read only in Mock (D34 — + New campaign · Edit · Cancel / Restore off, tooltip *Switch to Real to change the
  campaign list*) · Target source moved into the Data tooltip · Updated hidden while every row is empty · Data `✓ Target` / `– Sales`
  · the Edit drawer says only what it has (no *Created —*).
- Ctrl+K: Overview · Sales · Spend & Profit · By campaign · Campaigns · New campaign (Real only).
- Real anchors unchanged: ฿290,203,210.28 · ฿24,257,999.00 · ฿11,130,023.03.

## v0.3.1 — 04/11/2026 · COGS of rows with no quantity (CR-02 E1 → option E)

- A revenue row typed without a quantity no longer blanks Gross profit: its quantity = amount ÷ the same SKU's net price a piece
  (from that SKU's rows with both, same Campaign · the other scenario when needed) × COGS a piece. Every COGS / Gross profit /
  Campaign profit that holds such a row shows **Est.** (tooltip: the revenue estimated and the Campaigns) — All campaigns KPI and
  Portfolio, P&L by month (tooltip), P&L Waterfall KPI, chart note and statement, and the exported files.
- Today: 73 target rows, ฿1,461,584 (0.50% of the year's target) — Perfect Heart (SKU 12260, Apr–Dec) and Sanrio (Jun–Dec).
  Plan Gross profit This year = ฿139,522,451.98 (was "—") · P&L Waterfall *Scope = All campaigns* draws again (Plan, and Actual in Mock).
- A product with no COGS still makes Gross profit "—" (D2). Fill the quantities in the P&L files and the Est. goes by itself.
- `build_seed.py`: the SEED_REPORT warning says the page estimates those rows (from the next build).
- Anchors unchanged: ฿290,203,210.28 · ฿24,257,999.00 · ฿11,130,023.03.

## v0.3.0 — 04/11/2026 · CR-03 Campaigns: Add · Edit · Cancel · Lite

- **WORK › Campaigns** (`#campaigns`, new): Year · Search campaign · Include cancelled · Sort (Status · Start date · Name · Updated) ·
  Export · **+ New campaign** · the folders line · a stale band (*run python tools/build_seed.py* + Copy command) · status tabs ·
  table Name · Status · Period · Days left · End marketing · P&L file · Data (Target · Sales · Budget · Spend) · Target source ·
  Updated · ⋯ (Edit · Open in By campaign · Copy file name · Cancel campaign… / Restore). A row opens By campaign.
- **New / Edit drawer** (480 px, full screen on a phone): name (id shown, fixed on Edit) · Start · End campaign · End marketing
  (dd/mm/yyyy + calendar, as KOL) · Status (Auto by dates · Complete closed early · Cancelled + Reason) · P&L file (Create from
  template · Use a file already in the folder · Add later · Edit: Change) · checks under each field · Esc / ✕ ask before losing typing.
- **Saves into the files** with the File System Access API of Edge / Chrome from `file://` (the project folder and the P&L folder,
  chosen once, kept in IndexedDB, permission asked on Save only) · reads `campaigns.csv` from the disk first (hand edits kept) ·
  writes `campaigns.csv` → `campaigns.js` → `campaigns_log.csv` · no picker / refused → downloads the two files.
- **Create from template** copies `data/templates/[Template 2026] - Campaign P&L.xlsx` byte for byte; a file with that name is never replaced.
- `data/campaigns.csv` is the Campaign list: new columns `id · end_marketing · note · created_at · updated_at` · `end_marketing` of
  the list wins over Initial Data (D28) · `build_seed.py` writes `data/campaigns.js` and a *Campaign list* part in SEED_REPORT.
- **Status**: Cancelled → past End = Complete → Complete (closed early) → before Start = Not started → On going.
- **Dashboard**: ☐ Include cancelled after Status (All campaigns + P&L Waterfall, shared, off by default) · chip *Cancelled* · grey
  Timeline bar · *Pending build* rows (numbers "—", reason in the tooltip) until the next build · By campaign: Cancelled last in its
  own group, ‹ › follow the Portfolio · Ctrl+K: Campaigns page and the action **New campaign**, Cancelled Campaigns labelled.
- `docs/TARGET_CONTRACT.md`: use the Campaign id in the `campaign` column (a name stops matching after a rename).
- No anchor moved (Real · This year · every status): Target revenue ฿290,203,210.28 · Spend budget ฿24,257,999.00 · Spend actual
  ฿11,130,023.03.

## v0.2.0 — 29/10/2026 · CR-02 Dashboard 3 tabs: All campaigns · By campaign · P&L Waterfall · Lite

- **Three tabs, one question each** (`#dashboard/all` · `#dashboard/campaign/<id>` · `#dashboard/waterfall`), the last one remembered ·
  Ctrl+K: By campaign / P&L Waterfall in *Go to page*, a Campaign opens its By campaign · the drawer is gone.
- **All campaigns**: Portfolio columns Revenue · **Plan to date** · Ach % · Full plan · Spend · **Budget to date** · Used % · Full budget ·
  Profit · Margin % — in every row Ach % = Revenue ÷ Plan to date and Used % = Spend ÷ Budget to date (F1) · chips Behind · Over budget ·
  Ending soon · **Sort: Attention** (default) · Gross profit and ROI moved to P&L Waterfall · Row 5 moved out (its cards now live in the
  other tabs) · a Campaign row opens By campaign.
- **By campaign** (new): Year · Campaign (search) · ‹ › · Channel · Export · KPI Time left · Net revenue to date · Required run-rate
  (Forecast *Est.*) · On target SKUs · Target vs Actual by month (฿ | Qty · Monthly | Cumulative — the same chart as P&L by month) ·
  Channel attainment (Channel → Sub-channel) · SKU attainment (status tabs, Ach % by channel).
- **P&L Waterfall** (new): Scope (All / one Campaign) · KPI · waterfall Plan | Actual · Summary | Lines · P&L statement · Spend by line
  (top 8 + Other).
- **Data: Real | Mock** in the top bar — mock Sales actuals from the targets for design review (seeded, never saved, expenses never
  mocked) · warn band · *Actual (mock)* · exports `_MOCK`.
- **One empty state** for every card that needs Sales actuals: *No actual sales yet · Show plan · Preview with mock actuals* (F4).
- Source line says Sales actual and Spend actual apart and where the target comes from (F2).
- `data/expense_lines.csv` — one name for an expense line typed several ways (*Event / Pop-up booth*) · SEED_REPORT lists every raw name (F3).
- **Target contract** `data/targets/<campaign-id>.csv` ([docs/TARGET_CONTRACT.md](docs/TARGET_CONTRACT.md)) replaces the P&L target
  sheets when present · seed `target_source`.
- Noto Sans Thai served from `src/fonts/` (OFL) — no CDN (F5).
- New rules: `attainment` · `targetByMonth` · `timeProgress` · `runRate` · `waterfall` · `statement()` for a set of Campaigns.

## v0.1.0 — 29/10/2026 · CR-01 Campaign P&L Dashboard (All campaigns) · Lite v1.1

First version.

- **Shell = KOL Management v0.1.19**: side menu (logo · Campaign P&L / Charmiss · Search menu… · WORK › Dashboard · v0.1.0 DEV · folds to
  icons, remembered · a drawer under 768px) · top bar (Search or jump to… Ctrl+K · DEV · theme) · Ctrl+K palette (Go to page · Campaigns →
  the Campaign's P&L drawer) · page banner · tabs · Light / Dark.
- **Dashboard › All campaigns**: presets This year · This quarter · This month · Last month · Custom (months, one Apply) · Status · Export
  (.xlsx, one sheet a card) · source line.
  - Row 1 KPI: Campaigns · Net revenue · Total spend · Campaign profit.
  - Row 2 P&L by month: Revenue · Spend · Profit · Monthly / Cumulative · plan as a black tick · month in progress hatched · variance under
    each month · year under the first month and where it changes · Today · Table.
  - Row 3 Campaign portfolio: the Campaign & Phase table (MT · TT · ECOM rows, chips No actual / No budget, Sort ×5, Collapse / Expand all, total row).
  - Row 4 Campaign timeline: Start → End marketing bar (status colour) · End marketing → End line · monthly actual · a summary on every row.
  - Row 5 Revenue by channel · Spend by line · Top sub-channels (each with a Table view).
- **Drawer — Campaign P&L**: header (status · dates · Actual to …) · ‹ › and ↑ ↓ · four values · statement Plan / Actual / Var ฿ / Var % with the
  expense lines · *Same months as actual* / *Full plan* · Download .xlsx.
- **Data**: `tools/build_seed.py` reads the 7 P&L files (sheets by name, header row = the first "Jan yyyy" row, month columns only) →
  `data/seed.js` + `docs/SEED_REPORT.md`.
- Helpers taken from KOL Web Dev (KT → CP): labelInfo · ⓘ popover · multiSelect / msLabel · rangeHTML (now in months) · ganttAxis ·
  openDrawer / closeDrawer · toast · download / downloadCSV · pref · shortNum / bahtShort · ICON · xlsx.workbook — restyled to v0.1.19.
