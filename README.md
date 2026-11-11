# Campaign P&L — demo (Charmiss) · v0.15.0

A **demo** of the Campaign P&L web in the look and behaviour of KOL Management v0.1.19: **plan a Campaign in 4 steps with many
teams**, get it approved by the Executive, **watch it run** (Campaign Tracking) — and the Dashboard of the whole year. **Every number is
made up** (CR-06 · D51): the page makes them in the browser from `data/mock-scenario.js`; nothing is read from or written to the Campaign
P&L Excel files. The way of the real P&L files (v0.5.0) is kept in [`archive/v0.5-real/`](archive/v0.5-real/README.md). The other retired
code (the screens CR-07 · CR-08 · CR-13 · CR-14 took out) and the test pictures of CR-02 – CR-13 were deleted on 07/11/2026; the code of
v0.10.0 · v0.13.0 · v0.13.1 (the 7 pages of CR-13) stays in the git history of `Charmiss_Campaign_PnL`.
Specs: [CR-01](docs/CR-01.md) · [CR-02](docs/CR-02.md) · [CR-03](docs/CR-03.md) · [CR-04](docs/CR-04.md) · [CR-05](docs/CR-05.md) · [CR-06](docs/CR-06.md) · [CR-07](docs/CR-07.md) · [CR-08](docs/CR-08.md) · [CR-09](docs/CR-09.md) · [CR-10](docs/CR-10.md) · [CR-11](docs/CR-11.md) · [CR-12](docs/CR-12.md) · [CR-13](docs/CR-13.md) · [CR-14](docs/CR-14.md) · [CR-14.1](docs/CR-14.1.md) · [CR-15](docs/CR-15.md) · QA: [QA-v0.13](docs/QA-v0.13.md) (fixed in v0.13.1) · [regression checklist](docs/REGRESSION.md).

## Open it

Double-click `index.html` (Edge or Chrome, `file://`). No server, no install, no internet needed. Keep every file where it is.

- `?today=2026-11-04` after `index.html` makes the page act as if it were that day (checks and screenshots — the anchor numbers are
  for that day).
- **ไทย │ EN** (top bar, CR-12): the page opens in **Thai** the first time, then in the language last chosen (this browser). A click
  loads the same page again in the other language (the route, the tab, the scroll, Acting as and the filters stay). `?lang=th|en` forces
  one load only (not remembered). Ctrl+K: *Switch to English* / *เปลี่ยนเป็นภาษาไทย*. The data is never translated (campaign · product ·
  SKU · sub-channel · budget line · people names and what people typed); the team's short words stay English (P&L · GP · COGS · A&P ·
  ROI · SKU · MT / TT / ECOM · Ach % · Pace …); the dates stay A.D. `dd/mm/yyyy`, the month names Thai (`มี.ค. 2026`). Export follows the
  language on screen (`Campaign PnL - ภาพรวม …xlsx`) — the numbers are the same.
- **☀ Light │ ☾ Dark │ 🖥 System** (top bar): System follows the computer at once (the default of a new browser). `?theme=light|dark|system`
  forces one load only. A phone (< 640 px): one **Display** button → language + theme.
- `?i18n=check` (dev): a panel in the corner + `console.table` — (a) English words with no Thai · (b) Thai keys English does not have ·
  (c) functions whose arguments differ · (d) English words on screen that are not kept and not data. Every change closes with 0.
- **Acting as** (top bar — no login): choose who you act as. Every action is saved with that name; each browser tab can act as another
  person. The people of the demo — a **position** (shown on the top bar and on the sign-off page of the PDF), a department and a **role**
  (CR-15 §11: **Admin · Approver · Planner · Viewer** — the keys `admin · manager · staff · viewer` stay):

| Person | Position · Department (role) | Does |
|---|---|---|
| Ploy · Nok | Brand Manager · Brand (Planner) | New campaign (the owner = the one who makes it) · **1 Campaign setup** · **4 Submit** · Cancel / Request to cancel · Period change · Close |
| Beam | Sales Manager · Sales (Planner) | **2 Sales target** (+ the sales risk) · **3b Sales expenses** |
| Golf | Sales Director · Sales (Planner) | no task in the system — signs the PDF (Sales target · Sales expenses) |
| Fah | Marketing Manager · Marketing (Planner) | **3a Marketing expenses** |
| Mai | Finance Manager · Finance (Planner) | **3c Other expenses** · **4 Finance review** (+ Worst / Best %) |
| Ann | Managing Director · Executive (Approver) | approves: Approve · **Revise** · Reject · every request (Budget · Period · Close · **Cancel**) · Restore a cancelled campaign |
| Admin | System Admin (Admin) | everything · **Settings** (CR-15 §10) · Transfer owner · Reopen a closed Campaign · **Link ERP code** of a temporary SKU (from the time the plan is sent · Due = Start − 10 working days) |

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
| WORK | **Campaign Tracking** (CR-11 — was Campaign Monitor) — one approved Campaign: **Summary · P&L · Sales · Expenses · History** | `#tracking/<id>/<tab>` |
| WORK | **Campaign Planning** — **Plans · Timeline · My tasks (n) · My requests (n)** (an Executive: Approvals) · **the campaign page** (CR-13): a draft = the plan in 4 steps (CR-14) · approved = Overview · Plan · Requests · History | `#planning/plans` … `#planning/<id>` · `#planning/<id>/overview\|plan\|requests\|history` · `#planning/<id>/plan/<step>` |
| MASTER DATA | **Product Master** — the SKUs a plan can use · 50 rows a page · temporary SKUs (the sub-channels moved to Settings — CR-15) | `#products` |
| SYSTEM | **Settings** (CR-15 §10 — Admin only) — **Users · Sub-channels · Holidays · Due dates · Expense template · Signers · Plan defaults · Settings history** | `#settings/<tab>` |

- **Every Dashboard tab** (CR-08 §2): no question line · no year bar · KPI 4 cards in one row with one anatomy — value + grey suffix · a bar
  (+ the black **Time gone** tick where the number moves with the time) · **a caption of one line** `% · what is left · the time`
  (*to go* = sales · *left* = budget · *days left* = the year) · ⓘ always **after** its words (every page — D75) · the axis of every chart
  inside its card (its width = the longest label + 8 px · `฿300M`, no `.00`) · the first screen (1440 × 900) shows the KPI and the main
  chart whole · **the tab bar stays under the top bar** once the banner scrolls away — from 1280 px the toolbar joins it in one row (the same
  on Campaign Tracking · Campaign Planning shows its tabs only — CR-10 D98).
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
- **Campaign Tracking** (CR-09 · CR-11 — was Campaign Monitor) — Year · **Campaign** (≥ 360 px · the list 520 px: name · dates · status +
  issue, grouped Urgent · To watch · Others) · ‹ › …… **Request budget · View plan · Export** (no head card, no Owner — D101) ·
  **Summary**: **Campaign period** (one bar Start → End marketing → End · Marketing dark · Sell-through light · Today · `91% of time gone ·
  26 days left` · the status + issue chips) · KPI Net revenue · Budget used · Campaign profit · Forecast end (Est.) · **Burn-up** (the
  Marketing period shaded · Time gone / Forecast in the legend) | **What to do** · **P&L** (D104): KPI Net revenue · Gross profit · Total
  expenses · Campaign profit · waterfall | statement · **Where each ฿100 of sales goes** (this Campaign) · **Cumulative profit by month**
  (the bars = the profit of each month · the running profit · the plan · **Break-even in Mar 2026** / *Not yet — ฿x to break even*) ·
  **Sales vs Marketing by month** · **Sales** (its own Channel All · MT · TT · ECOM and ฿ | Qty · by month Total | By channel · Sales mix
  by channel | Channel attainment (the **Pace** at every level — D80) · **SKU × Channel** (+ Share % · **Rank** in every mode — the Share
  tooltip: *Top 2 SKUs = 61%*) · **Sub-channel share** (a 100% bar a channel, D102) | **SKU trend** (Ach % a SKU a month · a row → that SKU
  in the matrix, D103)) · **Expenses** (the bar · Budget vs Actual by month | Spend by group · **Budget by line** Marketing ▸ Sales ▸ Other ·
  the requests) · **History** (an icon a kind · Compare v1 ↔ v2).
- **Campaign Planning** (CR-09 — the plans only, the results live in Tracking / Dashboard) — **Plans**: KPI In progress · Steps overdue ·
  In review · Next 12 months · tabs **In progress** (first) · Approved · Rejected · All · Name · Owner · Start (in n days) · **Progress**
  (4 dots — 3 split in 3a · 3b · 3c, 4 split in Finance · Submit (CR-14) — an approved plan: the state *On going · 26 days left* · *Ended · to close · 5 days late* · *Closed 30/09/2026* — CR-13) · tab **To close n** · **Waiting on** · Approval · Target · **Budget (plan)** + A&P · Tracking › ·
  **My tasks** (n open · n overdue · next due · *Blocked · n steps* ⓘ) · **Approvals / My requests** (Pending = cards: Review · Open plan ·
  2 lines + *+n more* · Decided / Drafts = a table, one row a campaign) · **Timeline** (the Dashboard's bar · 3 months back → 12 ahead ·
  the rows outside fold into one line · Running (approved) · the colour = the state of the plan).
- Ctrl+K (from anywhere): Overview · P&L · Sales · Expenses · Campaign Tracking · Campaign Planning · My tasks · Approvals · Timeline ·
  Product Master · New campaign · New product · a Campaign (approved → its Tracking, else its plan) · PRODUCTS by code or name.
- The old links still work: `#dashboard/salesbudget` → Sales · `#dashboard/budget` → Expenses · `#dashboard/spend` → P&L · `#dashboard/operations` → Overview ·
  `#dashboard/campaign/<id>` → `#tracking/<id>` · `#monitor/<id>/<tab>` → `#tracking/<id>/<tab>` (budget → expenses — CR-11) · `#campaigns…` → `#planning…` ·
  `#expenses` → the Dashboard · `#planning/<id>/<step>` → `#planning/<id>/plan/<step>` (CR-13).

## The campaign page (CR-13 · D114 – D120)

- **One page a Campaign** (`#planning/<id>`): a Draft / In review / Returned plan opens on **Plan** (the steps — at my step) · an approved
  one on **Overview** (`overview · plan · requests · history`). The head: `Approved v1` + the state `On going · 26 days left` · `Ended · to
  close · 5 days late` · `Closed 30/09/2026` · `Cancelled` + `Period change pending` / `Close requested` · **Request change ▾** · Campaign
  Tracking › · ⋯ (Duplicate as draft · Cancel campaign… · Admin: Reopen).
- **Overview**: the details — **Edit** in place by the owner / Admin (no approval · in History; the dates only through a Period change) ·
  the Campaign period bar · **Plan in use** · **Open items** (the requests waiting · *Close campaign*) · **Latest activity**. **Plan**: the
  version in use read only (▾ · Compare · the summary) · **Requests**: every request + New request ▾ · **History**: the helper of Tracking
  (All · Approvals · Changes · Budget · Steps · Compare v1 ↔ v2 · Open request #n).
- **Request change** — the owner or Admin (Budget change: as before) → **the Executive decides every one, never their own** (Approve ·
  Return · Reject · Withdraw · Undo):
  - **Budget change** — Increase · Reallocation · Release (CR-05).
  - **Period change** — Start (locked once started) · End marketing · End · a reason ≥ 10 · the **Impact** now → after (days · Time gone ·
    Ach · Pace · Status · sales still needed a month · what moves) + *Status improves because the period is longer…* · a month with an
    actual cannot be cut · the target / budget of a month cut moves into the nearest month left · approved = the new dates everywhere (no
    new version).
  - **Close campaign / Close early** — the checks (no request waiting · no step open · last expense · spent of the current budget · Ach ·
    profit · the unused budget, **not released**) · ✓ *No more expenses are expected* · a note ≥ 20 (*Explain the gap …*) · approved =
    **Closed**: read only everywhere, the numbers unchanged (Dashboard still groups it *Ended*) · Close early: a close date ≥ today → End =
    that date (the months after move in) · Admin **Reopen** (a reason · no approval).
- **No auto close**: an ended Campaign is *Ended · to close* until its close request is approved · My tasks of the owner: *Close campaign*
  Due = End + 30 days (late = red) · it still takes late invoices, a Budget change, a Period change.

## A plan in 4 steps (CR-14 · D126 – D141 · CR-15)

| # | Step (key) | Department (who by default) | What | Opens when |
|---|---|---|---|---|
| 1 | **Campaign setup** (`brief` — was *Campaign brief*, CR-15 §5) | Brand (the owner) | name · *Campaign details (optional)* · dates · products (**a click on the search = every product by group** · type to filter · a whole group · paste codes · temporary SKU) · **estimated target** · **spend envelope** % of the target (Marketing · Sales · Other or *No expense* — no phasing) · who does each step + the dues | at once |
| 2 | **Sales target** (`target`) | Sales (Beam) | the prices used · the **target filler in 4 parts** (① channel ② sub-channels — the ones sold are picked here ③ SKU ④ months · Fill when ① – ④ ✓) · the grid **SKU × sub-channel × month** with **3 filters** (channel · sub-channel · SKU — *Showing ฿x of ฿y*) · **the sales risk** (level + why, or *No risk to report* — needed to mark it done) | the setup has a SKU |
| 3 | **Expense lines** 3a (`exp_mkt`) · 3b (`exp_sls`) · 3c (`exp_oth`) | Marketing (Fah) · Sales (Beam) · Finance (Mai) | the lines of each group, **prefilled from the template** × the envelope · the months **by the group's rule** (a line typed by month = *Custom months* · *Back to automatic*) | the setup has that group's envelope |
| 4 | **Summary & submit** — Finance review (`fin`) · Submit (`submit`) | Finance (Mai) · Brand (the owner) | Ready? (a ✕ links to its field) → **Comments** (the sales risk · the Finance review + Worst / Best % · the note to the Executive) → **P&L in 3 columns** (Worst · As planned · Best) + **the break-even as a sum** → the summaries → the expenses → who did what · **Export PDF** (the sign-off alone on the last page) · Export (.xlsx) · Submit | Finance: 2 and 3 done · Submit: no ✕ |

- **The campaign head** (CR-15 §4.1): ‹ Campaign Planning (back to the tab · search · sort · scroll of the list) · the name · the status · ⋯ — the buttons
  of the one acting sit at the right of the tabs. **Cancel** (CR-15 §2): a reason of 10 characters or more · a plan never sent = at once · sent before =
  a **cancel request** the Executive decides (the other requests wait · the ones waiting are withdrawn when approved) · **Restore**: the Executive / Admin
  (a reason) · the owner of a draft it cancelled itself. **The owner** = the one who made it (Admin picks a person of Brand) · **Transfer owner…** = Admin.
- The target filler can **split the SKU shares by channel** (a column a channel, each 100% · 0% = not sold there) · the checklist ends with **Whole plan** ·
  Acting as another person with changes not saved asks *Save as … · Discard · Cancel* · under 1280 px the stepper is one row (CR-14.1).
- The target grid: the tools of the row chosen (Spread this row's total · Copy from another row · Clear row — on the rows shown) and a column
  **% of target** · Expense lines › *Show all months* has the grid toolbar (Fill right · Spread total · Clear row · Undo · Redo) (v0.14.2).
- **2 and 3 run at the same time** (the envelope is a % of the target — nobody waits) · a page opened before the setup is done shows
  *Campaign setup not finished — products / envelope may change* · a done step: **Edit this step** (its assignee · the owner · Admin) · editing 2 or 3
  after Finance confirmed → Finance review *Needs re-check* · the Executive can send back Campaign setup · 2 · 3a · 3b · 3c.
- The P&L bar under the stepper (Target · Campaign spend · A&P · Plan profit · Margin · ROI · *See P&L*) · the checks of the page in **the bar
  stuck to the bottom** (the content column wide · no count of 0) with *Save draft* · *Mark step done* · **no GP % in Planning** (Dashboard / Tracking keep it).
- Old plans and old routes: every plan is read through `R.migratePlan` (`schema 14`: 1 + 2 + env → brief · 3 → target · 4a/4b/4c →
  3a/3b/3c · 5 → fin · 6 → submit · **`schema 15`** (CR-15 §12): the target rows of Dealer / Wholesale = **TT total** (฿ and pieces added up — Σ TT
  the same to the baht) · an expense line whose months were not its group's rule = *Custom months*) · `#planning/<id>/plan/details|products|envelope` →
  Campaign setup · `target` → Sales target · `budget` → Expense lines · `forecast|review` → Summary & submit · `#products/subchannels` → Settings › Sub-channels.

### Where to change the rules — **Settings** (CR-15 §10 · Admin · `#settings/<tab>`)

The values below were constants of `src/rules-plan.js` (CR-14); now they are edited in the page and read through **`R.cfg()`** (one place ·
`R.CFG0` = the defaults = the values of v0.14.2). Each tab: Save · **Restore defaults** (asked in the page) · *Last edited: who · when* · every
save in **Settings history**. Kept in this browser (`CP.store`: `settings` · `people` · `subchannels`, a `rev` against a save over another
tab) · **Reset demo data** = the defaults. Nothing saved before changes by itself: a new value serves what is made from now on (a new plan ·
*Recalculate due dates* · *Prefill* · a PDF opened again).

- **Users** — name · position · department · role · active · + person (was *Edit people…*) · at least one active person of Brand · one Approver · one Admin.
- **Sub-channels** — channel · name · price name · active · order · the default share (read only, from the actual sales) · delete only a sub-channel never used.
  TT = **TT total** (`tt-all`) · Dealer / Wholesale off (kept) · ECOM + Website · LINE (CR-15 §6.1).
- **Holidays** — a list a year: date · name · kind (*every year* · *this year only* · *company holiday*). The defaults: the fixed bank holidays +
  07/12/2026 + the BOT days of 2027 (CR-14.1). The company's own days: here (when HR confirms them).
- **Due dates** — working days: Campaign setup 5 · Sales target ∥ Expense lines 10 · Summary 3 · Approval 5 · Buffer 10 (= 33) · urgent below 12 +
  a live example (Start 01/03/2027 → …). A = the working days from today to Start: A ≥ 33 back from Start · 12 ≤ A < 33 every part × A ÷ 33 ·
  A < 12 or started = forward from today.
- **Expense template** — 3 groups: line · in the template · % (the lines in the template = 100 a group) · the Platform Fee suggested (12 % of the
  ECOM target). The months of a line follow its group (CR-15 §7.2): Marketing to End marketing · Sales as the monthly target · Other the same every month.
- **Signers** — the rows of the sign-off page of the PDF: section · position · name = the step's owner / a person / blank · order (≤ 12 rows).
- **Plan defaults** — the A&P warning (20 %) · Worst / Best (80 % · 110 %) · ฿ off the envelope still complete (฿100) · the SKU shares by role (Hero 2 · Core 1 · GWP 0).

## Time gone · Pace · issues — one rule everywhere (CR-07 §3 · D67 · D68)

| Value | How |
|---|---|
| **Time gone %** | (today − Start + 1) ÷ (End − Start + 1) · 0% before Start · 100% after End · the year: day of the year ÷ days of the year |
| **Ach %** (Dashboard · Tracking) | Actual to date ÷ the **full** target of the Campaign (the year: Actual YTD ÷ full-year target) |
| **Pace** | Ach % ÷ Time gone % — shown with 2 decimals cut (0.9496 → 0.94) |
| **Sales status** | **On track** Pace ≥ 0.95 · **At risk** 0.85 – 0.95 · **Behind** < 0.85 · "—" before Start or under 10% of the time |
| **Used %** | Spent ÷ Current budget (the approved plan + the approved requests) |
| **Budget status** | **Over budget** Used > 100% · **Near budget** 90 – 100% and not ended (D89) · **Spending ahead** Used % − Time gone > 20 pts · ended over its budget = **Ended over budget** |
| **Issues** (`R.issues`) | one row a Campaign · **urgent** = Behind · Over budget · **watch** = At risk · Near budget · Spending ahead · Ended over budget — the same count in KPI Campaigns (*4 to watch*), Sales to watch / Budget to watch, Budget › To watch, Tracking and Plans |

The old *Ach % to date* (against the target of the months with actual) stays in the tooltips and in Tracking › Sales.

## Words · languages (CR-12 · D113)

- `src/content.js` = **English, the list of every key** · `src/content.th.js` = **Thai on the same keys** (`CP.contentTH`) ·
  `src/i18n.js` merges Thai into `CP.content` before any screen loads (a Thai key missing = the English word, the page never breaks).
- **The rule from now on:** a new word on screen (or in an export) goes into `content.js` **and** `content.th.js` in the same change —
  no word written in the code — and the change closes with `?i18n=check` = 0 (a · b · c · d) in Thai.

## Change the demo story — `data/mock-scenario.js` (no code)

Each Campaign is one line: `name` · `start` · `end_marketing` · `end` (yyyy-mm-dd) · `target` (฿) · `mkt_budget` · `sls_budget` ·
**`oth_budget`** (Other expenses ฿) · `channels` · `ach` · `ach_by` · `used` · `shape` · `line` · `skus` · `cancelled` + `note`. Below them:
the people (with `dept`) · who does each step (`stepPeople`) · who owns and approved what · the budget requests · the plans on the way
(their steps) · `lines` (the expense lines of Marketing · Sales · **Other**) · `otherLines` (how Other is split). Save the file, then
**Reset demo data**.

## Files

```
index.html                the page — <head>: styles · boot · load order: mock-scenario → content → content.th → i18n → icons → rules-pnl → rules-list → rules-plan → mock → ui →
                          ui-range → ui-grid → xlsx → export → actor → screen-dashboard → screen-overview → screen-pnl →
                          screen-sales → screen-expenses-tab → screen-tracking → screen-planning → screen-timeline → screen-steps → screen-plan → screen-products → app
data/mock-scenario.js     the demo story (edit freely)
src/boot.js               (in <head>) the language (?lang · pref · Thai) and the theme (?theme · pref · System) before the page draws
src/content.js            every word on screen and in the exports (English — the list of keys) → CP.content
src/content.th.js         the same words in Thai (CR-12)                                   → CP.contentTH
src/i18n.js               Thai merged into CP.content · the switch (reload in place) · ?i18n=check → CP.i18n
src/icons.js              inline SVG icons                                                → CP.icons
src/rules-pnl.js          every number, pure functions (no DOM) · Other exp · timeGone · paceOf · salesStatus · campaignPace · mktEfficiency → CP.rules
src/rules-list.js         the Campaign list: id · checks · status · the change of a Save    → CP.rules
src/rules-plan.js         plans (totals · checks · diff · rights) · the 4 steps (stepState · canDoStep · stepChecks · envOf · DUE_RULES · HOLIDAYS · planDues · EXP_TEMPLATE) · planForecast ·
                          breakEven · budgetStatus · issues · pnlForecast · requests · budgetTrack · mergePlans · Product Master ·
                          periodImpact · periodMoves · campState · closeChecks (CR-13) → CP.rules
src/mock.js               the demo data from mock-scenario.js (+ the Product Master) · CP.store = it + what was clicked (localStorage)
src/ui.js · ui-range.js · ui-grid.js   shared UI (kpiCard + Time gone tick · paceBar · issueChip · donut · timelineLite · rowBars · the axis
                          inside the card · 50-row pager · periodHTML · historyHTML …) · the month-range picker · the one editable grid
src/xlsx.js · export.js   the .xlsx writer · the rows of each card (Table view = Export)
src/actor.js              Acting as (top bar: the position · Switch user · Manage users › · Reset demo data) → CP.actor
src/screen-dashboard.js   banner · the 4 tabs · Year · Status · As of ⓘ · Export · the shared KPI cards → CP.screens.dashboard · CP.dash
src/screen-overview.js · screen-pnl.js · screen-sales.js · screen-expenses-tab.js   the Dashboard tabs → CP.tabs.* (+ CP.pnl: statement · waterfall · budget table)
src/screen-tracking.js    Campaign Tracking (CR-11 — was screen-monitor.js)               → CP.screens.tracking
src/screen-planning.js    Campaign Planning: Plans · Timeline · My tasks · Approvals · New campaign drawer → CP.screens.planning
src/screen-timeline.js    Planning › Timeline (Gantt)                                     → CP.ktimeline
src/screen-steps.js       the 4 steps of a plan (CR-14 · CR-15): Campaign setup · Sales target · Expense lines · Summary & submit · the P&L bar · the PDF → CP.steps
src/screen-plan.js        the campaign page (Overview · Plan · Requests · History — the Plan tab of a draft = CP.steps)
                          · the review · Request budget · Period change · Close         → CP.cpage · CP.review · CP.reqdraw · CP.chgdraw
src/screen-products.js    Product Master · its drawer                                     → CP.screens.products · CP.products
src/screen-settings.js    Settings (CR-15 §10): Users · Sub-channels · Holidays · Due dates · Expense template · Signers · Plan defaults · history → CP.screens.settings
src/app.js                shell: side menu · top bar (Acting as · ไทย │ EN · Light │ Dark │ System · Display) · Ctrl+K · route (+ the old routes)
src/styles.css · fonts/   tokens (KOL Light / Dark) and components · Noto Sans Thai (SIL OFL 1.1)
docs/                     CR-01.md … CR-14.md · CR-14.1.md · CR-15.md · QA-CR13.md · QA-v0.13.md · REGRESSION.md · ref/ (KOL pictures)
                          · tc-cr14/ · tc-cr15/ (pictures of CR-14 / CR-15 · before / after · PDF samples)
archive/                  v0.5-real/ (the real P&L-file way)
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
