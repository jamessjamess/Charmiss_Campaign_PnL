# archive/v0.12-planning — what CR-13 (v0.13.0) took out of Campaign Planning

Moved here, not deleted. `index.html` does not load these files; they are the two screens as they were in v0.12.0, kept to read or to
bring a part back.

| File | Was | Replaced in v0.13.0 by |
|---|---|---|
| `screen-planning.js` | Plans › ⋯ **Open plan** · **Edit details** (the drawer: Name · Start · End marketing · End · **Status** Auto / Complete (closed early) / Cancelled + reason) · a click on the row opened the plan at its first step | a click on the row = the campaign page (§2.4 · D114) · ⋯ Open · Campaign Tracking › · Request change › · Duplicate as draft · Cancel campaign… · the drawer = **New campaign** only (no Status) |
| `screen-plan.js` | the plan in **6 steps** — the stepper of cards (~400 px) · an approved plan = the same 6 steps read only · the review | the campaign page: Overview · Plan · Requests · History (approved) · the plan in **7 steps** with the stepper in one row (§7 · D121) · the Target builder · the Budget envelope · Forecast & summary |

Where each old part went:

| Old | Now |
|---|---|
| Edit details › Name | Overview › Edit (approved — no approval, in History) · Plan › 1 Campaign details (draft) |
| Edit details › Start · End marketing · End | Request change › **Period change** (approved — the Executive decides) · Plan › 1 (draft) |
| Edit details › Status *Complete (closed early)* | Request change › **Close early** (§5.1) |
| Edit details › Status *Cancelled* | ⋯ Cancel campaign… (as before) |
| Open plan (⋯) | a click on the row · ⋯ Open |

The edit branch of the drawer (`openForm(id)` with an id) is still in `src/screen-planning.js` but nothing opens it any more.
