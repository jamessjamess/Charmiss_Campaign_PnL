# Target contract — Sales Target by SKU × Sub-channel × Month (CR-02 §3.1)

Today the Sales Target of each Campaign comes from its P&L file (*Sales Target Quantity (piece)* and *Sales Target Amount (Baht)*).
It will come from the **Sales Target system** (Total → Channel → Sub-channel → SKU → Month). This file is the hand-over point:
when a Campaign has a file `data/targets/<campaign-id>.csv`, `tools/build_seed.py` uses it **instead of** the target sheets of that
Campaign's P&L file. No file → the P&L file, as before. The web page never edits a target (read only).

## File

- Path: `data/targets/<campaign-id>.csv` — the id is the `id` column of `data/campaigns.csv` (CR-03: it never changes, even when
  the Campaign is renamed — it was made from the first name: lower case, `-` for spaces) (`charming-lab.csv`,
  `charmiss-sanrio-paradise-island.csv` — the ids are listed in `docs/SEED_REPORT.md` and on the Campaigns page).
- UTF-8 (a BOM is fine) · comma-separated · one header row · **one row = one SKU × one Sub-channel × one month**.
- `data/targets/_TEMPLATE.csv` is the empty header (files starting with `_` are never read).

| Column | Required | Format | Meaning |
|---|---|---|---|
| `campaign` | yes | text | **The Campaign id (advised, CR-03)** or its name — must be this file's Campaign (other rows are skipped with a warning). A name stops matching when the Campaign is renamed on the Campaigns page; the id never does |
| `sku_code` | one of the two | text | Product Master **Code** (`12130`) — matched first |
| `sku_name` | one of the two | text | Product Master **Product Name** — used when the code is blank |
| `channel` | yes | `MT` · `TT` · `ECOM` | Modern trade · Traditional trade · E-commerce (`Moderntrade` / `Traditional Trade` / `Ecommerce` also read) |
| `sub_channel` | yes | text | as in the P&L files (`Watsons`, `Shopee`, `Traditional Trade` …) |
| `month` | yes | `yyyy-mm` | the month of the target (`2026-03`) |
| `target_qty` | no | number | pieces · blank = not set (COGS of that row then cannot be worked out — D2) |
| `target_net_sales` | no | number | net sales **ex VAT**, in Baht · blank = not set |
| `source` | no | text | where the number came from (`Sales Target system v1`, a person …) |
| `updated_at` | no | `yyyy-mm-dd` or ISO time | when it was set |

- A row with neither `target_qty` nor `target_net_sales` is skipped. Two rows with the same SKU × Sub-channel × month are **added up**.
- Numbers: plain (`1234.5`) or with thousands commas inside quotes (`"1,234.5"`) · 0 = no target (skipped, as in the P&L files).
- The SKU should exist in the Campaign's Product Master (that is where COGS comes from); an unknown SKU is kept and listed in
  SEED_REPORT as "not in Product Master".

## What the dashboard shows

- `docs/SEED_REPORT.md` and the *Source* line of the dashboard say where each Campaign's target comes from
  (`Target: P&L file` or `Target: targets CSV · <source> · <latest updated_at>`).
- Every Target / Plan number (All campaigns, By campaign, P&L Waterfall, Export) reads the same rows — the CSV replaces the sheet
  for that Campaign everywhere.

## Example

```
campaign,sku_code,sku_name,channel,sub_channel,month,target_qty,target_net_sales,source,updated_at
Charming Lab,12130,Charmiss Matte All Day,MT,Watsons,2026-01,2400,74112,Sales Target system,2026-11-02
Charming Lab,12130,Charmiss Matte All Day,ECOM,Shopee,2026-01,1800,55584,Sales Target system,2026-11-02
```
