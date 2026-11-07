# archive/v0.5-real — the real P&L-file way of v0.5.0 (kept, not in use)

From v0.6.0 (CR-06 · D51) the web is a **demo**: it uses the made-up data of `data/mock-scenario.js` only. Everything the page needed to
read the real Campaign P&L Excel files — and to write the list, the plans, the expenses and the people as files — was moved here as it
was on 05/11/2026 (v0.5.0). Nothing here is loaded by `index.html`.

| File | What it was |
|---|---|
| `tools/build_seed.py` | the ETL: the .xlsx files of *Available Campaign* (+ the targets CSV) → `data/seed.js` · `campaigns.js` · the mirrors · `docs/SEED_REPORT.md` |
| `data/seed.js` | the numbers of the 7 real Campaigns (built — do not edit) |
| `data/campaigns.csv` · `campaigns.js` | the Campaign list kept from the page (CR-03) and its mirror |
| `data/plans.js` · `expenses.js` · `people.js` · `people.csv` | the plans / expenses / people of the web (CR-05) — the mirrors of `data/plans/*.json` · `data/expenses/*.csv` · `people.csv` |
| `data/targets/` | the targets CSV of the Sales Target system (`_TEMPLATE.csv`) |
| `data/templates/` | the copy of the P&L template a New campaign was made from (CR-03) |
| `data/expense_lines.csv` | the raw expense line names → the names used (the lines of the demo are now in `mock-scenario.js` › `lines`, D59) |
| `docs/SEED_REPORT.md` · `docs/TARGET_CONTRACT.md` | what the last build read · the contract of the targets CSV |
| `src/store.js` | the one place that wrote files (File System Access API · the Download way · the rev / SHA-1 check of CR-05 §4.3) |

## Bring it back (when there is a system with a login and a database)

The demo is not the place for it: files on Drive written by many people at once is what CR-05 §16 said must go first. When the real
system is ready, take from here what it still needs:

1. The ETL (`build_seed.py`) shows how every sheet of the P&L file maps to the seed schema (campaigns · products · sales · expenses) —
   the schema `src/rules-pnl.js` still reads, so a database that gives the same rows needs no change in the rules.
2. `src/store.js` shows the save rules to keep: read before write, refuse a save over a newer copy (rev), one log line per change.
3. To run v0.5.0 as it was: copy the whole project folder somewhere else, move these files back to the same paths, put back the 6
   `<script>` lines of `index.html` (seed · campaigns · plans · expenses · people · store) and the Real branches of the `src/` files of
   v0.5.0 (the CR-05 copy of the project) — the v0.6.0 code no longer has them.
