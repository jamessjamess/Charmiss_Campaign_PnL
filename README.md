# Campaign P&L — demo (Charmiss) · v0.13.1

A **demo** of the Campaign P&L web in the look and behaviour of KOL Management v0.1.19: **plan a Campaign in 7 steps with many
teams**, get it approved by the Executive, **watch it run** (Campaign Tracking) — and the Dashboard of the whole year. **Every number is
made up** (CR-06 · D51): the page makes them in the browser from `data/mock-scenario.js`; nothing is read from or written to the Campaign
P&L Excel files. The way of the real P&L files (v0.5.0) is kept in [`archive/v0.5-real/`](archive/v0.5-real/README.md); what CR-07 took
out (Operations · By campaign · Expenses …) is in `archive/v0.6-dashboard/` and `archive/v0.6-expenses/`; what CR-08 took out of the
Dashboard (Sales & Budget · the year bar · the question lines) is in `archive/v0.7-dashboard/`. What CR-13 retired from Campaign Planning (Edit details · Open plan · the 6-step plan) is in `archive/v0.12-planning/`.
Specs: [CR-01](docs/CR-01.md) · [CR-02](docs/CR-02.md) · [CR-03](docs/CR-03.md) · [CR-04](docs/CR-04.md) · [CR-05](docs/CR-05.md) · [CR-06](docs/CR-06.md) · [CR-07](docs/CR-07.md) · [CR-08](docs/CR-08.md) · [CR-09](docs/CR-09.md) · [CR-10](docs/CR-10.md) · [CR-11](docs/CR-11.md) · [CR-12](docs/CR-12.md) · [CR-13](docs/CR-13.md) · QA: [QA-v0.13](docs/QA-v0.13.md) (fixed in v0.13.1) · [regression checklist](docs/REGRESSION.md).

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
  person. The people of the demo and their department (CR-07 §10):

| Person | Department | Does |
|---|---|---|
| Ploy · Nok | Brand (Staff) | New campaign · step 1 Campaign details · step 2 Products · step 4 Budget envelope · step 7 Review & submit (the owner of their plans) · Period change · Close campaign |
| Beam | Sales (Staff) | step 3 Sales target · step 5b Sales exp |
| Fah | Marketing (Staff) | step 5a Marketing exp |
| Mai | Finance (Staff) | step 5c Other exp · step 6 Forecast & summary |
| Ann | Executive (Manager) | approves: Approve · **Revise** (the steps to do again) · Reject · every request (Budget · Period · Close) |
| Admin | — | everything · *Edit people…* · Reopen a closed Campaign |

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
| WORK | **Campaign Planning** — **Plans · Timeline · My tasks (n) · My requests (n)** (an Executive: Approvals) · **the campaign page** (CR-13): a draft = the plan in 7 steps · approved = Overview · Plan · Requests · History | `#planning/plans` … `#planning/<id>` · `#planning/<id>/overview\|plan\|requests\|history` · `#planning/<id>/plan/<step>` |
| MASTER DATA | **Product Master** — the SKUs a plan can use (50 rows a page) | `#products` |

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
  (7 dots — an approved plan: the state *On going · 26 days left* · *Ended · to close · 5 days late* · *Closed 30/09/2026* — CR-13) · tab **To close n** · **Waiting on** · Approval · Target · **Budget (plan)** + A&P · Tracking › ·
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

## A plan in 7 steps (CR-07 §7 · D64 · D70 · D71 · CR-13 D121 – D124)

| Step | Department (who by default) | What | Done when |
|---|---|---|---|
| 1 Campaign details | Brand (the owner) | name · Brand · Category · Objective · Start · End marketing · End campaign · channels · owner · **who does each step + Due** | the fields and dates are right · every step has someone and a Due |
| 2 Products | Brand | SKUs from the Product Master · Role Hero · Core · GWP · net price a channel (0 = not sold there) | ≥ 1 SKU · every SKU has COGS and a price in each channel |
| 3 Sales target | Sales (Beam) | **Target builder** (Full target · Channel split · SKU split Hero 2 / Core 1 / GWP 0 · Even / Launch / Follow marketing / Custom · Copy mix from → *Fill the grid*: qty = round(฿ ÷ price)) + the grid **SKU × Channel × month** | target > 0 · inside Start – End |
| 4 Budget envelope | Brand (the owner) | each group (Marketing · Sales · Other) = % of the target ↔ ฿ · Phasing · Reference = the average of the approved plans of the category · *No expense* | every group has an envelope or *No expense* |
| 5 Budget lines 5a · 5b · 5c | Marketing (Fah) · Sales (Beam) · Finance (Mai) | a grid line × month each · the head *Envelope · Allocated · Left* · **Spread** a line · **Fill the rest** — over / under the envelope = a warning only (the plan budget = Σ lines) | each group on its own |
| 6 Forecast & summary | Finance (Mai) | achievement by channel · Worst / Best · the Forecast P&L · **Summary by SKU · by channel · by month** | 3 · 4 · 5 done · a comment |
| 7 Review & submit | Brand (the owner) | the whole plan · the summary · **Envelope vs lines** · checks · a note → **Submit for approval** | 1 – 6 done · every check passes |

- The keys saved stay `1 · 2 · 3 · 4a · 4b · 4c · 5 · 6` + **`env`** (the screen numbers them 1 – 7) — a plan made before CR-13 has its
  envelope **Done** (the sums of its lines) · the stepper is one row ≤ 72 px (it scrolls under 1280 px) · Plans › Progress = 7 dots.
- **Order**: 2 after 1 · 3 after 2 · 4 after 3 · 5a / 5b / 5c after 4 (side by side) · 6 after 3 + 4 + 5 · 7 after 1 – 6. **Due** from
  Start: 1 −75 · 2 −60 · 3 −50 · 4 −45 · 5 −40 · 6 −35 · 7 −30 days. A step is edited by its assignee · the owner · Admin.
- **Changing a step that is Done**: 3 → the envelope and step 6 *Needs refresh* · the envelope → 5a / 5b / 5c *Envelope changed*.
- **The Executive** (Ann): the review (the summary · the Forecast in it) → **Approve** · **Revise** · **Reject**. Approved → on the
  Dashboard and in Campaign Tracking. *Target with no Marketing budget* only counts the months up to End marketing (as ranges).
- **Forecast P&L (step 6)**: Base revenue = Σ target of a channel × its achievement · COGS in the same share · the expenses = the budget ·
  Worst = Base × 80% · Best = Base × 110% · **Break-even revenue** = budget ÷ plan GP % · **Break-even achievement** = ÷ target ·
  ⚠ Worst loses · A&P > 20% · Break-even > 70%. The Base approved is shown in Tracking beside *Forecast end (Est.)* of the real pace.

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
                          screen-sales → screen-expenses-tab → screen-tracking → screen-planning → screen-timeline → screen-plan → screen-products → app
data/mock-scenario.js     the demo story (edit freely)
src/boot.js               (in <head>) the language (?lang · pref · Thai) and the theme (?theme · pref · System) before the page draws
src/content.js            every word on screen and in the exports (English — the list of keys) → CP.content
src/content.th.js         the same words in Thai (CR-12)                                   → CP.contentTH
src/i18n.js               Thai merged into CP.content · the switch (reload in place) · ?i18n=check → CP.i18n
src/icons.js              inline SVG icons                                                → CP.icons
src/rules-pnl.js          every number, pure functions (no DOM) · Other exp · timeGone · paceOf · salesStatus · campaignPace · mktEfficiency → CP.rules
src/rules-list.js         the Campaign list: id · checks · status · the change of a Save    → CP.rules
src/rules-plan.js         plans (totals · checks · diff · rights) · the 7 steps (stepState · canDoStep · stepChecks · envOf) · planForecast ·
                          breakEven · budgetStatus · issues · pnlForecast · requests · budgetTrack · mergePlans · Product Master ·
                          periodImpact · periodMoves · campState · closeChecks (CR-13) → CP.rules
src/mock.js               the demo data from mock-scenario.js (+ the Product Master) · CP.store = it + what was clicked (localStorage)
src/ui.js · ui-range.js · ui-grid.js   shared UI (kpiCard + Time gone tick · paceBar · issueChip · donut · timelineLite · rowBars · the axis
                          inside the card · 50-row pager · periodHTML · historyHTML …) · the month-range picker · the one editable grid
src/xlsx.js · export.js   the .xlsx writer · the rows of each card (Table view = Export)
src/actor.js              Acting as (top bar · Switch user · Edit people… · Reset demo data) → CP.actor
src/screen-dashboard.js   banner · the 4 tabs · Year · Status · As of ⓘ · Export · the shared KPI cards → CP.screens.dashboard · CP.dash
src/screen-overview.js · screen-pnl.js · screen-sales.js · screen-expenses-tab.js   the Dashboard tabs → CP.tabs.* (+ CP.pnl: statement · waterfall · budget table)
src/screen-tracking.js    Campaign Tracking (CR-11 — was screen-monitor.js)               → CP.screens.tracking
src/screen-planning.js    Campaign Planning: Plans · Timeline · My tasks · Approvals · New campaign drawer → CP.screens.planning
src/screen-timeline.js    Planning › Timeline (Gantt)                                     → CP.ktimeline
src/screen-plan.js        the campaign page (Overview · Plan · Requests · History · the 7 steps · Target builder · envelope)
                          · the review · Request budget · Period change · Close         → CP.cpage · CP.review · CP.reqdraw · CP.chgdraw
src/screen-products.js    Product Master · its drawer                                     → CP.screens.products · CP.products
src/app.js                shell: side menu · top bar (Acting as · ไทย │ EN · Light │ Dark │ System · Display) · Ctrl+K · route (+ the old routes)
src/styles.css · fonts/   tokens (KOL Light / Dark) and components · Noto Sans Thai (SIL OFL 1.1)
docs/                     CR-01.md … CR-13.md · ref/ · tc17/ · tc-cr02/ … tc-cr13/ (pictures · before / after)
archive/                  v0.5-real/ (the real P&L-file way) · v0.6-dashboard/ (Operations · By campaign · Sales · Spend · Campaigns ·
                          the Campaign page · attention3) · v0.6-expenses/ (Expenses screen · its store and words) · v0.7-dashboard/
                          (Sales & Budget · the year bar · the question lines) · v0.12-planning/ (Edit details drawer · Open plan ·
                          the 6-step plan — CR-13) · docs-duplicates/ (a copy of a spec from Google Drive)
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
