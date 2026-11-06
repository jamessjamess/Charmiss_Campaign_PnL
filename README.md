# Campaign P&L — demo (Charmiss) · v0.10.0

A **demo** of the Campaign P&L web in the look and behaviour of KOL Management v0.1.19: **plan a Campaign in 6 steps with many
teams**, get it approved by the Executive, **watch it run** (Campaign Monitor) — and the Dashboard of the whole year. **Every number is
made up** (CR-06 · D51): the page makes them in the browser from `data/mock-scenario.js`; nothing is read from or written to the Campaign
P&L Excel files. The way of the real P&L files (v0.5.0) is kept in [`archive/v0.5-real/`](archive/v0.5-real/README.md); what CR-07 took
out (Operations · By campaign · Expenses …) is in `archive/v0.6-dashboard/` and `archive/v0.6-expenses/`; what CR-08 took out of the
Dashboard (Sales & Budget · the year bar · the question lines) is in `archive/v0.7-dashboard/`.
Specs: [CR-01](docs/CR-01.md) · [CR-02](docs/CR-02.md) · [CR-03](docs/CR-03.md) · [CR-04](docs/CR-04.md) · [CR-05](docs/CR-05.md) · [CR-06](docs/CR-06.md) · [CR-07](docs/CR-07.md) · [CR-08](docs/CR-08.md) · [CR-09](docs/CR-09.md) · [CR-10](docs/CR-10.md).

## Open it

Double-click `index.html` (Edge or Chrome, `file://`). No server, no install, no internet needed. Keep every file where it is.

- `?today=2026-11-04` after `index.html` makes the page act as if it were that day (checks and screenshots — the anchor numbers are
  for that day).
- **Acting as** (top bar — no login): choose who you act as. Every action is saved with that name; each browser tab can act as another
  person. The people of the demo and their department (CR-07 §10):

| Person | Department | Does |
|---|---|---|
| Ploy · Nok | Brand (Staff) | New campaign · step 1 Campaign details · step 2 Products · step 6 Review & submit (the owner of their plans) |
| Beam | Sales (Staff) | step 3 Sales target · step 4b Sales exp |
| Fah | Marketing (Staff) | step 4a Marketing exp |
| Mai | Finance (Staff) | step 4c Other exp · step 5 Forecast |
| Ann | Executive (Manager) | approves: Approve · **Revise** (the steps to do again) · Reject · budget requests |
| Admin | — | everything · *Edit people…* |

## Where the data is (D52)

- **The made-up story** — 13 Campaigns (2025–2027, one cancelled) with their SKUs, targets (SKU × Channel × month), budgets
  (Marketing · Sales · **Other**), sales and spend actual + 4 plans on the way (Songkran Glow 2027 · Year-end Gift Set 2027 · Back to School
  Brow 2027 · Mid-year Lip Festival 2027) + people · budget requests · the Product Master — is worked out by `src/mock.js` every time the
  page opens. The same day gives the same numbers on every machine; the actuals run to today.
- **What people click** (New campaign · the steps · approvals · requests · Product Master · people) is kept **in this browser only**
  (`localStorage` › `charmiss_campaign_pnl_mockstate`).
- **Reset demo data** — the last item of the **Acting as** menu: the made-up story comes back (= **Mock anchor v0.7**: Net revenue
  ฿212,942,085 · Total expenses ฿39,168,292 · Campaign profit ฿104,753,605 · full-year budget ฿47,901,073 — see docs/CR-07.md › E).
- **Export** (.xlsx) works everywhere; the first sheet says *Data: demo (made-up numbers)* (D54).

## The pages (CR-07 · D61 · CR-08 · D73)

| Menu | Page | Route |
|---|---|---|
| WORK | **Dashboard** — the year: **Overview · P&L · Sales · Expenses** (CR-10) · toolbar in one line = **Year** · Status …… *As of dd/mm/yyyy* ⓘ · Export | `#dashboard/overview` · `#dashboard/pnl` · `#dashboard/sales` · `#dashboard/expenses` |
| WORK | **Campaign Monitor** — one approved Campaign: **Summary · Sales · Expenses · P&L · History** | `#monitor/<id>/<tab>` |
| WORK | **Campaign Planning** — **Plans · My tasks (n) · Approvals (n) · Timeline** · the plan in 6 steps | `#planning/plans` … `#planning/<id>/<step>` |
| MASTER DATA | **Product Master** — the SKUs a plan can use (50 rows a page) | `#products` |

- **Every Dashboard tab** (CR-08 §2): no question line · no year bar · KPI 4 cards in one row with one anatomy — value + grey suffix · a bar
  (+ the black **Time gone** tick where the number moves with the time) · **a caption of one line** `% · what is left · the time`
  (*to go* = sales · *left* = budget · *days left* = the year) · ⓘ always **after** its words (every page — D75) · the axis of every chart
  inside its card (its width = the longest label + 8 px · `฿300M`, no `.00`) · the first screen (1440 × 900) shows the KPI and the main
  chart whole · **the tab bar stays under the top bar** once the banner scrolls away — from 1280 px the toolbar joins it in one row (the same
  on Campaign Monitor · Campaign Planning shows its tabs only — CR-10 D98).
- **Overview** — KPI **Net revenue** (`82% · ฿45.5M to go · 57 days left`) · **Budget used** (`82% used · ฿8.7M left`) · **Campaign
  profit** (`Margin 49% · ROI 2.7×`) · **Campaigns** (`6 running · 2 ended · 4 to watch ›`) · Revenue vs target by month (Revenue · Spend ·
  Profit) · **All campaigns** (CR-10 D94 — the bar of each campaign + Sales · Ach % · Expenses · Used % · Status, grouped On going ·
  Not started · Ended · the total = the KPI) · **Sales to watch | Expenses to watch** · **Where each ฿100 of sales goes** (COGS · Marketing ·
  Sales · Other · Profit — Actual and Plan, D95).
- **Sales** — KPI Net revenue · **Forecast end (Est.)** (`104% · +฿11.6M vs target`) · **Units sold** · **On track** (`6 / 8 campaigns ·
  2 at risk · 0 behind`) · Target vs Actual by month (฿ | Qty) · **Sales vs Time gone** (moved from Overview — D74 · Pace in the tooltip
  of Status · one line a row: `91% · 26 days left`) · Target vs Actual by month **Total | By campaign (Top 5 + Others — D93) | By channel** ·
  **Revenue by campaign** (donut Top 5 + Others | the bars of every campaign) · **Revenue by channel × campaign** (the matrix of CR-09 ·
  Actual ฿ | Ach % | Share % · the channel mix under it — D97) · SKU watchlist **Behind — Top 10 | Best — Top 10** together.
- **Expenses** (was Budget — D91) — KPI Budget used · **Remaining** · **To watch** (`2 over · 1 near · 1 spending ahead`) · **Pending requests** (`+฿600K ·
  2 requests · oldest 2 days`) · Budget vs Actual by month (Marketing · Sales · Other) · **Budget by campaign** (Current · Spent · Used %
  with the Time gone tick · Remaining · Pending · Status — the worst first) · **Spend by group** (donut) | Spend by line.
- **P&L** — KPI (Net revenue · Gross profit `GP 68% · plan 68%` · Total expenses `A&P 18.4% · plan 18.5%` · Campaign profit) ·
  **waterfall** (Plan · Actual · Forecast) | **P&L statement** (Plan full · Actual YTD · **Forecast end (Est.)** · Forecast vs Plan ·
  Marketing ▸ Sales ▸ Other ▸) · **P&L by campaign** (Actual | Plan | Forecast · Net revenue · COGS · Gross profit · Total expenses ▸ · no GP %
  by campaign — D96 · *Profit vs plan to date*) · **Profit by campaign** |
  **Marketing efficiency** (net sales per ฿1 of marketing · the tick = plan · the dashed line = the year's average — the same rows, D77).
- **Campaign Monitor** (CR-09) — Year · Campaign (grouped Urgent · To watch · Others) · ‹ › · Export · the head (status · issue chips ·
  End marketing · **Time gone** — the only place it is written · **Request budget** · View plan) · **Summary**: KPI Net revenue · Budget used ·
  Campaign profit · Forecast end (Est.) (the Dashboard's anatomy · Time gone = the tick) · **Burn-up** (End marketing · the dashed forecast
  ends) | **What to do** (Sell ฿x a month … — See SKUs behind › · Over budget — Request budget · ✓ On pace and within budget) ·
  **Sales** (its own Channel All · MT · TT · ECOM and ฿ | Qty · by month Total | By channel · **Sales mix by channel** (donut + Target mix /
  Actual mix) | Channel attainment (Share % · Ach % of the full target · Gap to pace · the status = the **Pace** at every level — D80) ·
  **SKU × Channel** (the actual of every SKU in every channel) · Sub-channel share | **SKU contribution** (Pareto)) · **Budget** (the bar ·
  **Budget by line** Marketing ▸ Sales ▸ Other folded · the Time gone tick · Over / Near budget / OK · by month | Spend by group · the
  requests) · **P&L** (waterfall | statement · **Sales vs Marketing by month** — sales per ฿1 marketing · the drop after End marketing) ·
  **History** (an icon a kind · Compare v1 ↔ v2).
- **Campaign Planning** (CR-09 — the plans only, the results live in Monitor / Dashboard) — **Plans**: KPI In progress · Steps overdue ·
  In review · Next 12 months · tabs **In progress** (first) · Approved · Rejected · All · Name · Owner · Start (in n days) · **Progress**
  (6 dots — an approved plan: *Approved dd/mm/yyyy · Ann*) · **Waiting on** · Approval · Target · **Budget (plan)** + A&P · Monitor › ·
  **My tasks** (n open · n overdue · next due · *Blocked · n steps* ⓘ) · **Approvals / My requests** (Pending = cards: Review · Open plan ·
  2 lines + *+n more* · Decided / Drafts = a table, one row a campaign) · **Timeline** (the Dashboard's bar · 3 months back → 12 ahead ·
  the rows outside fold into one line · Running (approved) · the colour = the state of the plan).
- Ctrl+K (from anywhere): Overview · P&L · Sales · Expenses · Campaign Monitor · Campaign Planning · My tasks · Approvals · Timeline ·
  Product Master · New campaign · New product · a Campaign (approved → its Monitor, else its plan) · PRODUCTS by code or name.
- The old links still work: `#dashboard/salesbudget` → Sales · `#dashboard/budget` → Expenses · `#dashboard/spend` → P&L · `#dashboard/operations` → Overview ·
  `#dashboard/campaign/<id>` → `#monitor/<id>` · `#campaigns…` → `#planning…` · `#expenses` → the Dashboard.

## A plan in 6 steps (CR-07 §7 · D64 · D70 · D71)

| Step | Department (who by default) | What | Done when |
|---|---|---|---|
| 1 Campaign details | Brand (the owner) | name · Brand · Category · Objective · Start · End marketing · End campaign · channels · owner · **who does each step + Due** | the fields and dates are right · every step has someone and a Due |
| 2 Products | Brand | SKUs from the Product Master · Role Hero · Core · GWP · net price a channel | ≥ 1 SKU · every SKU has COGS and a price in each channel |
| 3 Sales target | Sales (Beam) | the grid **SKU × Channel × month** (Qty \| ฿ · Fill right · Spread total · Ctrl+V a block) — no sub-channel (D62) | target > 0 · inside Start – End |
| 4a · 4b · 4c Budget | Marketing (Fah) · Sales (Beam) · Finance (Mai) | a grid line × month each · *No expense* for a group without one | each group on its own |
| 5 Forecast | Finance (Mai) | achievement by channel · Worst / Best (80% / 110% of Base) · assumptions · comment → the Forecast P&L | 3 and 4 done · a comment |
| 6 Review & submit | Brand (the owner) | the whole plan · checks · a note → **Submit for approval** | 1 – 5 done · every check passes |

- **Order**: 2 after 1 · 3 and 4 after 2 (side by side) · 5 after 3 + 4 · 6 after 1 – 5. **Due** from Start: 2 −60 days · 3 / 4 −45 · 5 −35 ·
  6 −30. A step is edited by its assignee · the owner · Admin; the others see it read only.
- **Changing a step that is Done** puts it back *In progress* and step 5 gets **Needs refresh**.
- **The Executive** (Ann): the review (the Forecast in it) → **Approve** · **Revise** (tick the steps to do again + a comment — they go
  back *Returned* to their people, step 5 *Needs refresh*, step 6 again) · **Reject**. Approved → on the Dashboard and in Campaign Monitor.
- **Forecast P&L (step 5)**: Base revenue = Σ target of a channel × its achievement · COGS in the same share · the expenses = the budget ·
  Worst = Base × 80% · Best = Base × 110% · **Break-even revenue** = budget ÷ plan GP % · **Break-even achievement** = ÷ target ·
  ⚠ Worst loses · A&P > 20% · Break-even > 70%. The Base approved is shown in Monitor beside *Forecast end (Est.)* of the real pace.
- **Request budget** (Monitor head · Ctrl+K): Increase · Reallocation · Release → the Executive approves → Current budget.

## Time gone · Pace · issues — one rule everywhere (CR-07 §3 · D67 · D68)

| Value | How |
|---|---|
| **Time gone %** | (today − Start + 1) ÷ (End − Start + 1) · 0% before Start · 100% after End · the year: day of the year ÷ days of the year |
| **Ach %** (Dashboard · Monitor) | Actual to date ÷ the **full** target of the Campaign (the year: Actual YTD ÷ full-year target) |
| **Pace** | Ach % ÷ Time gone % — shown with 2 decimals cut (0.9496 → 0.94) |
| **Sales status** | **On track** Pace ≥ 0.95 · **At risk** 0.85 – 0.95 · **Behind** < 0.85 · "—" before Start or under 10% of the time |
| **Used %** | Spent ÷ Current budget (the approved plan + the approved requests) |
| **Budget status** | **Over budget** Used > 100% · **Near budget** 90 – 100% and not ended (D89) · **Spending ahead** Used % − Time gone > 20 pts · ended over its budget = **Ended over budget** |
| **Issues** (`R.issues`) | one row a Campaign · **urgent** = Behind · Over budget · **watch** = At risk · Near budget · Spending ahead · Ended over budget — the same count in KPI Campaigns (*4 to watch*), Sales to watch / Budget to watch, Budget › To watch, Monitor and Plans |

The old *Ach % to date* (against the target of the months with actual) stays in the tooltips and in Monitor › Sales.

## Change the demo story — `data/mock-scenario.js` (no code)

Each Campaign is one line: `name` · `start` · `end_marketing` · `end` (yyyy-mm-dd) · `target` (฿) · `mkt_budget` · `sls_budget` ·
**`oth_budget`** (Other expenses ฿) · `channels` · `ach` · `ach_by` · `used` · `shape` · `line` · `skus` · `cancelled` + `note`. Below them:
the people (with `dept`) · who does each step (`stepPeople`) · who owns and approved what · the budget requests · the plans on the way
(their steps) · `lines` (the expense lines of Marketing · Sales · **Other**) · `otherLines` (how Other is split). Save the file, then
**Reset demo data**.

## Files

```
index.html                the page — load order: mock-scenario → content → icons → rules-pnl → rules-list → rules-plan → mock → ui →
                          ui-range → ui-grid → xlsx → export → actor → screen-dashboard → screen-overview → screen-pnl →
                          screen-sales → screen-expenses-tab → screen-monitor → screen-planning → screen-timeline → screen-plan → screen-products → app
data/mock-scenario.js     the demo story (edit freely)
src/content.js            every word on screen (English)                                  → CP.content
src/icons.js              inline SVG icons                                                → CP.icons
src/rules-pnl.js          every number, pure functions (no DOM) · Other exp · timeGone · paceOf · salesStatus · campaignPace · mktEfficiency → CP.rules
src/rules-list.js         the Campaign list: id · checks · status · the change of a Save    → CP.rules
src/rules-plan.js         plans (totals · checks · diff · rights) · the 6 steps (stepState · canDoStep · stepChecks) · planForecast ·
                          breakEven · budgetStatus · issues · pnlForecast · requests · budgetTrack · mergePlans · Product Master → CP.rules
src/mock.js               the demo data from mock-scenario.js (+ the Product Master) · CP.store = it + what was clicked (localStorage)
src/ui.js · ui-range.js · ui-grid.js   shared UI (kpiCard + Time gone tick · paceBar · issueChip · donut · timelineLite · rowBars · the axis
                          inside the card · 50-row pager …) · the month-range picker · the one editable grid
src/xlsx.js · export.js   the .xlsx writer · the rows of each card (Table view = Export)
src/actor.js              Acting as (top bar · Switch user · Edit people… · Reset demo data) → CP.actor
src/screen-dashboard.js   banner · the 4 tabs · Year · Status · As of ⓘ · Export · the shared KPI cards → CP.screens.dashboard · CP.dash
src/screen-overview.js · screen-pnl.js · screen-sales.js · screen-expenses-tab.js   the Dashboard tabs → CP.tabs.* (+ CP.pnl: statement · waterfall · budget table)
src/screen-monitor.js     Campaign Monitor                                                → CP.screens.monitor
src/screen-planning.js    Campaign Planning: Plans · My tasks · Approvals · New / Edit drawer → CP.screens.planning
src/screen-timeline.js    Planning › Timeline (Gantt)                                     → CP.ktimeline
src/screen-plan.js        the plan in 6 steps · the review · Request budget               → CP.cpage · CP.review · CP.reqdraw
src/screen-products.js    Product Master · its drawer                                     → CP.screens.products · CP.products
src/app.js                shell: side menu · top bar · Ctrl+K · theme · route (+ the old routes)
src/styles.css · fonts/   tokens (KOL Light / Dark) and components · Noto Sans Thai (SIL OFL 1.1)
docs/                     CR-01.md … CR-10.md · ref/ · tc17/ · tc-cr02/ … tc-cr10/ (pictures · before / after)
archive/                  v0.5-real/ (the real P&L-file way) · v0.6-dashboard/ (Operations · By campaign · Sales · Spend · Campaigns ·
                          the Campaign page · attention3) · v0.6-expenses/ (Expenses screen · its store and words) · v0.7-dashboard/
                          (Sales & Budget · the year bar · the question lines)
```

## Money — the definitions (one function each in `src/rules-pnl.js`)

| Number | How |
|---|---|
| Net revenue | Σ *Sales Actual (Amount Baht)* (= net revenue ex VAT) · **Target** = Σ the approved plan's target (qty × the net price) |
| COGS | Σ quantity × COGS a piece (the plan's snapshot of the Product Master) · a row with no quantity: estimated (**Est.**) · no COGS = "—" (D2) |
| Gross profit · GP % | Net revenue − COGS · ÷ Net revenue |
| Marketing · Sales · **Other** expenses | Σ of the lines of each group · Budget = the approved plan + the approved requests · Spent = the actual of the lines (D65 — no Committed / Paid) |
| Total expenses · A&P % | Marketing + Sales + Other · ÷ Net revenue |
| Campaign profit · Margin % · ROI | Gross profit − Marketing − Sales − Other · ÷ Net revenue · ÷ Total expenses |
| Plan (profit) | Target − COGS − Budget (the 3 groups) |
| Forecast end (Est.) | revenue at the current pace (none yet = the target) · COGS in the same share · each expense group = the larger of actual and budget · an ended Campaign = its actual |
| Waterfall | the same `R.statement()` as the P&L statement: Net revenue (+) → COGS (−) → Gross profit → Marketing (−) → Sales (−) → Other (−) → Campaign profit |

- A value that cannot be worked out is `null` → "—" in grey with the reason in its tooltip. It is never shown as ฿0.
- Status of a Campaign (CR-03 §4): Cancelled → past End campaign = Complete → Complete set in the list → before Start = Not started → On going.
