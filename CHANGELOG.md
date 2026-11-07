# Changelog

## v0.14.2 — 07/11/2026 · the last items of CR-14

- **Sales target › the grid (CR-14 §6.4)** — the tools of the row chosen: **Spread this row's total** (a SKU row → its months · a
  sub-channel / channel / SKU-group row → its rows by the shares of the filler, then the months — to the baht) · **Copy from another row** ·
  **Clear row** · a read-only column **% of target** after Total (`CP.ui.grid` spec `share`).
- **Expense lines › Show all months (CR-14 §7.1)** — the toolbar of the grid: Fill right · Spread total · Clear row · Undo · Redo.
- Numbers: Dashboard / Tracking unchanged (Mock anchor v0.7 the same).
- **Housekeeping (07/11/2026)** — deleted the test pictures of CR-02 – CR-13 (`docs/tc17` · `docs/tc-cr02` … `docs/tc-cr13` · `docs/qa-cr13`
  · `docs/qa-v013`) and the retired code in `archive/` (v0.6-dashboard · v0.6-expenses · v0.7-dashboard · v0.12-planning · v0.13-plan ·
  docs-duplicates) — 61 MB · 215 files. Kept: `archive/v0.5-real/` · every spec `docs/*.md` · `docs/ref/` · `docs/tc-cr14/`. The
  older entries below still name those folders as they were.

## v0.14.1 — 07/11/2026 · CR-14.1: the answers to D140 – D150 · the work left of CR-14 · the holidays of 2027

- **Holidays** — `HOLIDAYS.dates` = the bank holidays that move: 07/12/2026 (Father's Day on a Saturday) · 2027 by the BOT notice of
  25/08/2026 (22/02 · 03/05 · 20/05 · 19/07 · 25/10 · 06/12 — the rest are fixed). The due dates of a plan follow them (the example of
  CR-14 §3.3 with Start 01/03/2027 moves one working day earlier).
- **Split SKU shares by channel** (CR-14 §6.3 B) — a column a channel, each 100% · 0% = not sold there (no cell in the grid) · the default =
  the roles of the SKUs that have a price in that channel · *Rescale to 100%* · kept with the version.
- **Stepper under 1280 px** — one row ① ─ ② ─ ③ ─ ④ (the tooltip says 2 and 3 run together).
- **D146** — Admin's *Link ERP code* task from the time the plan is sent (In review · Approved) · Due = Start − 10 working days.
- **D148** — the checklist has its own row **Whole plan** (months outside · a negative number) — no longer under Finance review.
- **D149** — Acting as another person while a plan has changes not saved asks: **Save as <the one acting now>** · Discard · Cancel.
- **PDF** — the Campaign · P&L · Checks · Sign-off first; the summaries and the expenses from a new page.
- Numbers: Dashboard / Tracking unchanged (Mock anchor v0.7 the same). Open for the team: company holidays (HR) · A&P with Other (Finance,
  D140) · the expense template (Fah · Mai, D145). See `docs/CR-14.1.md`.

## v0.14.0 — 06/11/2026 · CR-14 Campaign Planning: a new plan in 4 steps · automatic due dates · prices and sub-channels · signed PDF

- **The flow (D126)** — **1 Brief** (owner: the campaign · products · the estimated target + the spend envelope % · who does what + the
  due dates) → **2 Sales target ∥ 3 Expense lines (3a · 3b · 3c)** at the same time → **4 Summary & submit** (Finance review · the note to
  the Executive · Submit). New keys `brief · target · exp_mkt · exp_sls · exp_oth · fin · submit` · `PLAN_SCHEMA` 13 → 14 through
  `R.migratePlan` (the plans of the seed and what a browser kept from v0.13.0 / v0.13.1) · the old routes go to the new pages ·
  a done step stays editable with **Edit this step** · editing 2 / 3 after Finance confirmed = **Needs re-check**.
- **Due dates in working days (D127)** — `DUE_RULES` (Brief 5 · 2 ∥ 3 10 · Summary 3 · Approval 5 · Buffer 10 = 33) and `HOLIDAYS` in
  `src/rules-plan.js` · normal / squeezed (12 ≤ A < 33) / urgent (A < 12 or started) with their bands · the drawer shows the dues under
  the dates · a due set by hand is kept (⚠ later than it should be) · **Recalculate due dates** · Plans › Steps overdue of the seed 17 → 0.
- **Brief (D128 · D129)** — no channels / category to type (category = the Hero's) · *Campaign details (optional)* · one product search
  (code · name · nickname · barcode) · tick several · a whole group · paste codes · **temporary SKU** `TMP-0002…` · the envelope as % of
  the target with ฿ (no typing past 100% or past the target).
- **Prices · sub-channels (D130 · D131)** — Product Master has 2 tabs **Products | Sub-channels** (Admin: add · rename · order · on/off ·
  delete only when never used) · the net price of a sub-channel (`subPrice`, empty = the channel price) · the plan keeps a standard and a
  campaign price per SKU × sub-channel (discount for a whole channel · *Standard price changed → Use the new price*).
- **Sales target (D133 · D134)** — the sub-channels sold · the prices used · **the target filler** (% ↔ ฿ at every level · Total 100.0% ✓ ·
  Spread it · Copy shares from) → the grid **SKU × sub-channel × month** to the baht (largest remainder) · ฿ by default · the basis kept
  (a row typed in pieces keeps its pieces when a price changes) · group / tabs / hide empty rows · a phone: read only.
- **Expense lines (D135)** — prefilled from the template `R.EXP_TEMPLATE` (untick what is not used · Spread the rest · Rescale) ·
  ฿ ↔ % of the envelope · phasing Even / Until End marketing / Follow sales / Month before start / First month / One month / Custom ·
  Platform Fee suggestion (12% of the ECOM target) · *No expense in this group* · ≤ ฿100 off = complete.
- **Summary & submit (D136 · D137)** — the checklist (✕ blocks · ⚠ does not) · **one P&L table** As planned (100%) · Finance forecast ·
  Worst · Best (+ break-even) · the summaries by channel › sub-channel · SKU · month · the expenses · who did what. The same table in the
  Executive's review, Overview and the PDF · **no GP % anywhere in Planning** · the P&L bar under the stepper replaces the side panel ·
  the checks in the bar at the bottom.
- **Export PDF (D139)** — `window.print()` → Save as PDF (no library) · A4 · Thai · the sign-off one row a person · a draft watermark ·
  the file name `แผนแคมเปญ - <name> - v<n>` · Export (.xlsx) of a plan (target with its sub-channel · expenses with Used · no GP %).
- **Admin — Link ERP code (D132)** — a temporary SKU in an approved plan = a task (Due = Start − 5 working days) · link to an existing
  product (→ Merged) or a new code (→ NPD) · every plan gets the code · one history line.
- **Words (§11)** — A&P = all the campaign expenses (Marketing + Sales + Other) ÷ sales: the ⓘ text fixed in EN and TH (8 places) ·
  the renames of §11.2 · KEEP + `Brief` · `PDF` · `?i18n=check` = 0.
- **Retired** — the 7 pages of CR-13 (`screen-plan.js` v0.13.1) → `archive/v0.13-plan/`.
- **Numbers** — Dashboard / Tracking unchanged (Mock anchor v0.7 the same) · TT actual = Dealer + Wholesale (Σ a campaign × month the same) ·
  the approved targets per SKU × channel × month the same.

## v0.13.1 — 06/11/2026 · QA-v0.13 fixes (B1 – B38 · P9 · P10)

- **Blocking** — B26: a plan made before v0.13 (Songkran Glow 2027 · Year-end Gift Set 2027 · Back to School Brow 2027) saves step 1 again ·
  **P9**: every plan is read through `R.migratePlan` (`plan.schema = 13`): the missing envelope step is added — Done (auto) when the plan
  already has budget lines or was sent, else step 4 of its owner (B6) · `step.assign` makes a missing step instead of failing ·
  B27: Edit people has a **Department** column, Save keeps it, at least one active Brand person must stay · people saved by v0.13.0
  get their department back.
- **Numbers the Executive uses** — B1: the impact of a budget request counts Other (Heart Cushion #2: ฿7.43M → ฿8.03M · A&P 19.1%) ·
  B21: a reallocation reads `Move ฿250K · ADS → KOL` (cards · Decided · Requests · History · Expenses KPI), never ฿0 · B7: Plan in use =
  profit and A&P on the current budget (the plan's own under it).
- **Planning** — B2: the Target builder defaults add up to 100.0 · B3: the Undo toast shows on top of the review · B4: a returned plan
  shows `Returned by Ann · date · "comment" · Steps to fix: …` on every step · B5: a cancelled draft is read only with Restore · Ctrl+K
  says Cancelled · B10: no Close early before Start · B14: the checks say 5a · 5b · 5c · B15: ≤ ฿100 off the envelope = no warning · B16:
  the % tile is GP % · B17: A&P Δ in points · B18: Return (not Return to draft) · the close review has the profit line · B19: New
  campaign = Start → End marketing → End + Owner (Brand) · B20: why New campaign is off · B22: Mark step done goes to the next step of the
  same person · B24: Save + Mark done = one History row · B29: a campaign starting soon gets its Due dates squeezed into the days left
  (+ a band) · B13: History words of a budget request from the request, in the language on screen.
- **Tracking** — B28 · B31 · B38: one order for the list and ‹ › — the year chosen, Urgent → To watch (running) → **To close** → Others
  → Cancelled · B8: **Request change ▾** (Budget · Period · Close) · B9: a campaign not started says so · B11: `Ended at 95% of target`
  instead of At risk · B30: `26% of the full target … (106% of the target to date)` · B32: a channel the campaign does not sell in goes
  back to All, its button off, the donut says All channels · B33: `#tracking/<unknown>` = Campaign not found · B37: the request links
  open the Campaign's Requests (a row opens the request).
- **Words / routes / phone** — B12: `ชิ้น` (not pcs) · B36: `41 SKU` · `pcs` / `SKUs` out of the i18n keep-list · B34:
  `#planning/requests` → My requests · B35: Product Master `Active n` · B25: the chosen grid cell never covers the SKU names · Planning KPI
  scroll sideways on a phone · B23: checked — Edge / Chrome name a Thai export right (the QA tool's `download` came from the tool).
- **P10**: `docs/REGRESSION.md` — the checklist run before every CR report (R01 – R15).
- Numbers: none changed — Mock anchor v0.7 the same · Pending the same.

## v0.13.0 — 06/11/2026 · CR-13 Campaign Planning: one page a campaign · Period change · Close campaign · History · 7 steps with helpers

- **The campaign page** (`#planning/<id>` · D114): one page, two modes — a Draft / In review / Returned plan = **Plan** (the steps) ·
  an approved plan = **Overview · Plan · Requests · History** (`#planning/<id>/overview|plan|requests|history` · the old step routes
  `#planning/<id>/budget` … go to `…/plan/<step>`) · the head: the approval chip (`Approved v1`) + the state of the campaign
  (`On going · 26 days left` · `Ended · to close · 5 days late` · `Closed 30/09/2026` · `Cancelled`) + `Period change pending` /
  `Close requested` · **Request change ▾** · Campaign Tracking › · ⋯.
- **Overview**: the details (Name · Brand · Category · Objective · Channels · Owner) — **Edit** in place, no approval, in History (D115) ·
  the Campaign period bar of CR-11 (`U.periodHTML`, shared) · **Plan in use** (v · Target · Budget original + changes · Plan profit · A&P) ·
  **Open items** (the requests waiting · the task *Close campaign*) · **Latest activity** (5 + All history ›). **Plan** = the version in
  use read only (version ▾ · Compare · Products · Target · Budget Original / Changes / Current / Spent / Remaining · the summary).
  **Requests** = every request (# · Type · Summary · By · Sent · Status · Decided) + New request ▾.
- **Plans**: a click on the row opens the page (Approved → Overview · a draft → Plan at my step) · ⋯ = Open · Campaign Tracking ›
  · Request change › · Duplicate as draft (also an approved plan) · Cancel campaign… / Admin: Reopen · **no Open plan · no Edit details**
  (the drawer is New campaign only, no Status) · Progress of an approved plan = the state of the campaign · Start of an ended one =
  `Ended 30/09/2026` · the tab **To close n** · 7 dots.
- **Request change** (D117): Budget change (as before) · **Period change** · **Close campaign / Close early** — the owner or Admin ·
  the Executive decides every one (never their own) · Approve · Return · Reject · Withdraw · Undo · Approvals types *Period change* ·
  *Close*.
- **Period change** (§4 · D116): Start (locked once started) · End marketing · End · Reason ≥ 10 · **Impact** now → after (days · Time
  gone · Ach · Pace · Status · sales a month · moves) + *Status improves because the period is longer, not because sales went up.* ·
  a month with actuals cannot be cut · the target / budget of the months cut move into the nearest month · approved = the dates change
  everywhere (no new version) — `R.periodImpact` · `R.periodMoves`.
- **Close** (§5 · D118 – D120): Ended ≠ Closed — no auto close · the task *Close campaign* (the owner · Due = End + 30 · late in red) ·
  the close request: checks · *No more expenses are expected* · a note ≥ 20 (`Explain the gap: …`) · not with another request waiting ·
  approved = **Closed** (read only · `Closed 30/09/2026 · Ann` in Tracking) · the unused budget stays in the numbers · **Close early**
  (a close date ≥ today → End changes, the months after move in) · Admin **Reopen** (a reason) — `plan.closure` · `R.campState` ·
  `R.closeChecks`. Seed (D125): Blush Mochi · Songkran Lip Splash · Summer Sun Shield closed (approved close requests) · Airy Kiss Tint
  to close (5 days late) · no request waiting added.
- **History** (§6): one helper (`U.historyHTML`) for Tracking › History · the campaign page › History · Latest activity — newest first, a
  month a group · All · Approvals · Changes · Budget · Steps · Compare v1 ↔ v2 · Open request #n · the new events (Details · Period ·
  Close · Closed · Reopened …).
- **7 steps** (§7 · D121 – D124): 1 Campaign details · 2 Products · 3 Sales target · **4 Budget envelope** (new key `env`, the owner,
  −45) · 5 Budget lines 5a · 5b · 5c (−40) · 6 Forecast & summary (−35) · 7 Review & submit (−30) — the keys kept, an old plan's envelope
  = Done · the stepper one row ≤ 72 px · **Target builder** (Full target · Channel split · SKU split Hero 2 / Core 1 / GWP 0 · Not sold
  = 0 · Even / Launch / Follow marketing / Custom · Copy mix from · Fill the grid = qty `round(฿ ÷ price)` · kept with the version) ·
  **Budget envelope** (% ↔ ฿ · Phasing · Reference = the average of the approved plans of the category · a guide only — the plan budget =
  Σ lines) · the lines: Envelope · Allocated · Left · **Spread** · **Fill the rest** · **Forecast & summary** (by SKU · by channel · by
  month — one set for steps 6 · 7 · the Executive · the Plan tab) · F2 (no-marketing months only up to End marketing, as ranges) · F6
  (plain ticks).
- Words: ~170 new words EN + TH (`content.js` / `content.th.js`) · `?i18n=check` = 0 · keyboard names *Tab · Delete · Shift* kept in Thai.
- Numbers: none changed — Mock anchor v0.7 the same · Pending the same as v0.12.0.

## v0.12.0 — 06/11/2026 · CR-12 ไทย │ EN · Thai on every page · Light │ Dark │ System · Lite

- **Language** (D106 · D107 · D108): **ไทย │ EN** on the top bar (each language written in itself · tooltip *ภาษา · Language* · a
  radiogroup, ←/→ · Enter) · a new browser opens in **Thai** · remembered (pref `lang`) · `?lang=` for one load only · a switch loads the
  same page again (route · tab · scroll · Acting as · filters stay — a grid with changes asks first) · `<html lang>` · Ctrl+K *Switch to
  English* / *เปลี่ยนเป็นภาษาไทย*.
- **Thai** (`src/content.th.js` + `src/i18n.js` — merged into `CP.content` before the screens load · a missing Thai = English): every page,
  tab, dialog, toast, tooltip ⓘ and export · the team's short words kept (P&L · GP · COGS · A&P · ROI · SKU · MT / TT / ECOM · Ach % ·
  Pace …) · the data not translated · dates A.D., Thai month names (`มี.ค. 2026` · `คุ้มทุน มี.ค. 2026`) · Noto Sans Thai (in the project).
- **Theme** (D111): **☀ Light │ ☾ Dark │ 🖥 System** (System follows the computer at once and the charts are drawn again · the default of a
  new browser · the old pref light / dark kept) · `src/boot.js` sets the theme and the language in `<head>` (no white flash) · `?theme=`
  for one load only · a phone (< 640 px): one **Display** button → both (D112).
- **Words out of the code** (§4.3): the export words (`C.xl` — Metric · Value · … — actual · — target to date · the waterfall sheet …) ·
  the step names (`R.STEP_NAMES` = `C.step.names`) · `pts` · the label of the Ctrl+K dialog.
- **Export** (D110): file · sheet · header in the language on screen (`Campaign PnL - ภาพรวม …`) · the same numbers · English the same
  as v0.11.0 to the cell.
- `?i18n=check` (dev): (a) (b) (c) (d) in a corner panel + `console.table` · `docs/CR-11 (1).md` (a copy) → `archive/docs-duplicates/`.
- Numbers: none changed — Mock anchor v0.7 the same in both languages.

## v0.11.0 — 06/11/2026 · CR-11 Campaign Tracking (was Monitor): the name · the tab order · a clean Summary · Sales / Expenses / P&L charts · Planning tabs · Lite

- **Name** (D99 · D100): Campaign Monitor → **Campaign Tracking** (the menu · the banner · Ctrl+K · every link and word) · `#tracking/<id>/<tab>` ·
  `#monitor/…` goes there · the tabs **Summary · P&L · Sales · Expenses · History** (route `expenses` — `budget` and a remembered "budget" go
  there) · `screen-monitor.js` renamed `screen-tracking.js`.
- **Toolbar** (D101): the Campaign field ≥ 360 px (the longest name on one line) · its list 520 px (name · `01/03 – 30/11` · status + issue,
  rows of 40 px) · **Request budget · View plan · Export** on the right of every tab · stuck (≥ 1280 px) the buttons show their icon only ·
  **no head card** (no Owner).
- **Summary**: **Campaign period** — one bar Start → End marketing → End (Marketing dark · Sell-through light · solid to today, faded
  after · the Today line) · `Start 01/03/2026` · `End marketing 30/06/2026` · `End 30/11/2026` · `91% of time gone · 26 days left` /
  `Ended 30/09/2026` / `Starts in 58 days` · Burn-up: the Marketing period shaded · the legend Time gone (a dashed diagonal) · Forecast
  (dashed in its 2 colours) · End marketing only on the chart.
- **P&L** (D104): KPI Net revenue · Gross profit (`GP 67% · plan 67%`) · Total expenses (`A&P 24% · plan 18%`) · Campaign profit ·
  waterfall | statement · **Where each ฿100 of sales goes** (`U.p100Card`, shared with Overview) · **Cumulative profit by month** (the bars
  = the profit of each month, a loss red · the running profit · the plan dashed · **Break-even in Mar 2026** / *Not yet — ฿x to break
  even* — `R.profitByMonth`) · Sales vs Marketing by month.
- **Sales** (D102 · D103): SKU × Channel + **Rank** (Share % in every mode · its tooltip *Top 2 SKUs = 61%*) · **Sub-channel share** = a
  100% bar a channel (the largest at the left · 2 or more under 5% = Other n · the channel's actual at the end · as tall as its rows) ·
  **SKU trend** (Ach % a SKU a month · ≥ 100 / 90 – 99 / < 90 · this month hatched · the End marketing line · a row → that SKU in the matrix —
  `R.skuTrend`) · SKU contribution removed.
- **Expenses**: Budget · Budget vs Actual by month | Spend by group · Budget by line · Budget requests.
- **Campaign Planning** (D105): Plans · **Timeline** · My tasks · My requests (an Executive / Manager: Approvals) · Tracking ›.
- Rules: `R.profitByMonth` · `R.skuTrend` (no formula changed) · Mock anchor v0.7 the same to the baht.

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
- **Target contract** `data/targets/<campaign-id>.csv` ([docs/TARGET_CONTRACT.md](archive/v0.5-real/docs/TARGET_CONTRACT.md) — now in `archive/v0.5-real/`) replaces the P&L target
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
