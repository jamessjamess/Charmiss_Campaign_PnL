"""build_seed.py — CR-01 §3: the Campaign P&L files (.xlsx) → data/seed.js (window.CP_SEED) + docs/SEED_REPORT.md.

A tool for the developer only (Python 3 + openpyxl) — the web page never runs it.
    python tools/build_seed.py                      # the source folder of CR-01 §3
    python tools/build_seed.py "D:\\another\\folder"  # the same files somewhere else

Which files: data/campaigns.csv (the list of the Google Sheet "All Campaigns Tracking") — any other file in the folder
([Input Campaign Name n], Template …) is not read. Sheets are found by name, never by position (the order differs, some
files have no "Campaign Date"). The header row of a sheet is the first row with a "Jan yyyy" cell (the rows above are Thai
help text) · only the month columns are read (never "Total") · data_only=True (the values Excel saved) · blank / 0 / #REF!
are skipped. Nothing is filled in or guessed: a sheet with no numbers stays empty and the report says so.
"""
import csv
import hashlib
import datetime as dt
import json
import os
import re
import sys
from collections import OrderedDict, defaultdict

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = r"G:\My Drive\Campaign Tracking\On Going Campaign\Available Campaign"
LIST_CSV = os.path.join(ROOT, 'data', 'campaigns.csv')
LINES_CSV = os.path.join(ROOT, 'data', 'expense_lines.csv')   # CR-02 §3.3 — raw expense line name → the name used
TARGET_DIR = os.path.join(ROOT, 'data', 'targets')            # CR-02 §3.1 — <campaign-id>.csv replaces the P&L target sheets
LIST_JS = os.path.join(ROOT, 'data', 'campaigns.js')          # CR-03 §3.2 — the list for the page (file:// cannot fetch the CSV)
TEMPLATE_DIR = os.path.join(ROOT, 'data', 'templates')        # CR-03 §3.3 — the P&L template the page copies for a new Campaign
SEED_JS = os.path.join(ROOT, 'data', 'seed.js')
REPORT_MD = os.path.join(ROOT, 'docs', 'SEED_REPORT.md')

SHEETS = OrderedDict([
    ('initial', 'Initial Data'),
    ('products', 'Product Master'),
    ('target_qty', 'Sales Target Quantity (piece)'),
    ('actual_qty', 'Sales Actual Quantity (piece)'),
    ('target_amt', 'Sales Target Amount (Baht)'),
    ('actual_amt', 'Sales Actual (Amount Baht)'),
    ('mkt_budget', 'Marketing Expenses Budget'),
    ('mkt_actual', 'Marketing Expenses Actual'),
    ('sls_budget', 'Sales Expenses Budget'),
    ('sls_actual', 'Sales Expenses Actual'),
])
SALES_SHEETS = {'target_qty': ('target', 'qty'), 'actual_qty': ('actual', 'qty'), 'target_amt': ('target', 'amount'), 'actual_amt': ('actual', 'amount')}
EXPENSE_SHEETS = {'mkt_budget': ('marketing', 'budget'), 'mkt_actual': ('marketing', 'actual'), 'sls_budget': ('sales', 'budget'), 'sls_actual': ('sales', 'actual')}
STATUS = {'on going': 'ongoing', 'ongoing': 'ongoing', 'not started': 'not_started', 'complete': 'complete', 'completed': 'complete', 'cancelled': 'cancelled', 'canceled': 'cancelled'}
LIST_COLUMNS = ['id', 'campaign', 'file', 'start', 'end', 'end_marketing', 'status', 'note', 'created_at', 'updated_at']   # CR-05: owner · web | pnl live in data/plans/<id>.json
CHANNEL = {'moderntrade': 'MT', 'modern trade': 'MT', 'mt': 'MT', 'traditional trade': 'TT', 'traditionaltrade': 'TT', 'tt': 'TT',
           'ecommerce': 'ECOM', 'e-commerce': 'ECOM', 'e commerce': 'ECOM', 'ecom': 'ECOM'}
MONTH_RE = re.compile(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})$', re.I)
MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
ERRORS = ('#REF!', '#VALUE!', '#DIV/0!', '#N/A', '#NAME?', '#NUM!', '#NULL!')


def clean(s):
    """trim + one space between words ("Marketing Expense -  Fixed" → "Marketing Expense - Fixed")"""
    return re.sub(r'\s+', ' ', str(s)).strip() if s is not None else ''


def fold(s):
    return clean(s).lower()


def code_text(v):
    """52011.0 → '52011' · '' when blank"""
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return clean(v)


def month_of(v):
    """a header cell → 'yyyy-mm' (a "Jan 2026" text or a date) · None for anything else (Total …)"""
    if isinstance(v, (dt.datetime, dt.date)):
        return f'{v.year:04d}-{v.month:02d}'
    m = MONTH_RE.match(clean(v)) if isinstance(v, str) else None
    if not m:
        return None
    return f'{int(m.group(2)):04d}-{MONTHS.index(m.group(1)[:3].lower()) + 1:02d}'


def iso_date(v):
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    t = clean(v)
    for fmt in ('%Y-%m-%d', '%d/%m/%Y'):
        try:
            return dt.datetime.strptime(t, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def month_name(ym):
    return f"{MONTHS[int(ym[5:7]) - 1].capitalize()} {ym[:4]}"


def baht(v):
    return '—' if v is None else ('-' if v < 0 else '') + '฿' + f'{abs(v):,.0f}'


def num(v, ctx, where):
    """a cell → a number or None · blank / 0 / an Excel error are skipped (errors and text counted for the report)"""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return None if v == 0 else float(v)
    t = clean(v)
    if not t:
        return None
    if t.upper() in ERRORS:
        ctx['errors'][where] += 1
        return None
    try:
        x = float(t.replace(',', ''))
    except ValueError:
        ctx['texts'][where] += 1
        return None
    ctx['textnums'][where] += 1
    return None if x == 0 else x


def header_row(rows):
    """the first row with a month cell (Jan yyyy) · its index and {column: 'yyyy-mm'}"""
    for i, r in enumerate(rows):
        cols = {j: month_of(v) for j, v in enumerate(r) if month_of(v)}
        if cols:
            return i, cols
    return None, {}


def find_col(header, names):
    for j, v in enumerate(header):
        if fold(v) in names:
            return j
    return None


def read_sheet(wb, title):
    """the sheet named `title` (trim / case / spaces do not matter) → rows of values · None when it is not there"""
    for ws in wb.worksheets:
        if fold(ws.title) == fold(title):
            return [list(r) for r in ws.iter_rows(values_only=True)]
    return None


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def load_expense_lines():
    """data/expense_lines.csv → {(type, folded raw name): line} · type 'marketing' | 'sales'"""
    out = {}
    if os.path.isfile(LINES_CSV):
        with open(LINES_CSV, encoding='utf-8-sig', newline='') as fh:
            for r in csv.DictReader(fh):
                raw, line, grp = clean(r.get('raw_name')), clean(r.get('line')), fold(r.get('group'))
                if raw and line:
                    out[('sales' if grp.startswith('sales') else 'marketing', fold(raw))] = line
    return out


def read_targets(path, camp, products, by_name, rep):
    """data/targets/<id>.csv (docs/TARGET_CONTRACT.md) → target sales records · None when the file is not there"""
    if not os.path.isfile(path):
        return None
    recs, sources, updated, skipped = OrderedDict(), set(), [], defaultdict(int)
    with open(path, encoding='utf-8-sig', newline='') as fh:
        for i, r in enumerate(csv.DictReader(fh), start=2):
            r = {fold(k): v for k, v in r.items() if k}
            if fold(r.get('campaign')) not in (fold(camp['name']), camp['id']):
                skipped['other campaign'] += 1; continue
            m = clean(r.get('month'))
            if not re.match(r'^\d{4}-(0[1-9]|1[0-2])$', m):
                skipped['month not yyyy-mm'] += 1; continue
            ch = CHANNEL.get(fold(r.get('channel')))
            if ch is None:
                skipped['channel not MT / TT / ECOM'] += 1; continue
            numv = lambda v: None if clean(v) == '' else (lambda x: None if x == 0 else x)(float(clean(v).replace(',', '')))
            try:
                qty, amt = numv(r.get('target_qty')), numv(r.get('target_net_sales'))
            except ValueError:
                skipped['number not readable'] += 1; continue
            if qty is None and amt is None:
                skipped['no qty and no net sales'] += 1; continue
            code, pname = clean(r.get('sku_code')), clean(r.get('sku_name'))
            if code.endswith('.0') and code[:-2].isdigit():
                code = code[:-2]
            if code:
                key = code
            else:
                hits = by_name.get(fold(pname), [])
                key = hits[0] if len(hits) == 1 else 'name:' + fold(pname)
            sub = clean(r.get('sub_channel')) or '(blank)'
            k = (key, ch, sub, m, 'target')
            rec = recs.get(k) or recs.setdefault(k, {'campaign_id': camp['id'], 'product_key': key, 'channel': ch, 'sub_channel': sub, 'month': m, 'scenario': 'target', 'qty': None, 'amount': None, '_name': pname})
            if qty is not None: rec['qty'] = (rec['qty'] or 0) + qty
            if amt is not None: rec['amount'] = (rec['amount'] or 0) + amt
            if clean(r.get('source')): sources.add(clean(r.get('source')))
            if clean(r.get('updated_at')): updated.append(clean(r.get('updated_at')))
    for why, n in skipped.items():
        rep['warnings'].append(f'{os.path.basename(path)}: {n} row(s) skipped — {why}')
    label = 'targets CSV' + (' · ' + ', '.join(sorted(sources)) if sources else '') + (' · ' + max(updated)[:10] if updated else '')
    return list(recs.values()), label


def read_list():
    """data/campaigns.csv (CR-03 §3.1) — read by the header names, any order, a missing column = blank · rows with an id given or made"""
    raw = open(LIST_CSV, 'rb').read()
    fmt = {'bom': raw.startswith(b'\xef\xbb\xbf'), 'eol': '\r\n' if b'\r\n' in raw else '\n'}
    with open(LIST_CSV, encoding='utf-8-sig', newline='') as fh:
        rd = csv.DictReader(fh)
        cols = [fold(h) for h in (rd.fieldnames or [])]
        rows = []
        for r in rd:
            r = {fold(k): (v or '').strip() for k, v in r.items() if k}
            if r.get('campaign'):
                rows.append({k: r.get(k, '') for k in LIST_COLUMNS})
    return rows, cols, fmt


def write_list_js(rows, cols, fmt):
    """data/campaigns.js — window.CP_LIST = { updated_at, columns, rows } (CR-03 §3.2) · written on every build"""
    stamps = [r['updated_at'] for r in rows if r.get('updated_at')]
    data = {'updated_at': max(stamps) if stamps else None, 'columns': cols, 'fmt': fmt, 'rows': rows}
    with open(LIST_JS, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('/* Do not edit — generated from campaigns.csv (tools/build_seed.py or the Campaigns page). */\n')
        fh.write('window.CP_LIST = ')
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write(';\n')
    return data['updated_at']


PLANS_DIR = os.path.join(ROOT, 'data', 'plans')
EXPENSES_DIR = os.path.join(ROOT, 'data', 'expenses')
PEOPLE_CSV = os.path.join(ROOT, 'data', 'people.csv')
EXP_COLUMNS = ['no', 'type', 'line', 'month', 'vendor', 'description', 'doc_no', 'amount', 'status', 'committed_at', 'paid_at', 'by', 'note']


def write_plan_mirrors():
    """CR-05 §4.3 — file:// cannot read JSON / CSV: data/plans.js (window.CP_PLANS) · data/expenses.js (window.CP_EXPENSES) · data/people.js
    (window.CP_PEOPLE), made again from data/plans/*.json · data/expenses/*.csv · data/people.csv (the page writes them too after every Save)"""
    def dump(path, var, data, src):
        with open(path, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(f'/* Do not edit — generated from {src} (tools/build_seed.py or the page). */\n')
            fh.write(f'window.{var} = ')
            json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
            fh.write(';\n')
    plans, stamps = {}, []
    if os.path.isdir(PLANS_DIR):
        for f in sorted(os.listdir(PLANS_DIR)):
            if f.lower().endswith('.json'):
                with open(os.path.join(PLANS_DIR, f), encoding='utf-8-sig') as fh:
                    pl = json.load(fh)
                plans[pl.get('id') or f[:-5]] = pl
                stamps += [x.get('at') for x in pl.get('log', []) if x.get('at')]
    dump(os.path.join(ROOT, 'data', 'plans.js'), 'CP_PLANS', {'updated_at': max(stamps) if stamps else None, 'plans': plans}, 'data/plans/*.json')
    files = {}
    if os.path.isdir(EXPENSES_DIR):
        for f in sorted(os.listdir(EXPENSES_DIR)):
            if f.lower().endswith('.csv'):
                raw = open(os.path.join(EXPENSES_DIR, f), 'rb').read()
                with open(os.path.join(EXPENSES_DIR, f), encoding='utf-8-sig', newline='') as fh:
                    rows = []
                    for r in csv.DictReader(fh):
                        r = {fold(k): (v or '').strip() for k, v in r.items() if k}
                        row = {k: r.get(k, '') for k in EXP_COLUMNS}
                        row['no'] = int(float(row['no'] or 0))
                        row['amount'] = float(row['amount'] or 0)
                        row['status'] = row['status'].lower() if row['status'].lower() in ('committed', 'paid', 'void') else 'committed'
                        rows.append(row)
                files[f[:-4]] = {'sig': hashlib.sha1(raw).hexdigest(), 'rows': rows}
    dump(os.path.join(ROOT, 'data', 'expenses.js'), 'CP_EXPENSES', {'files': files}, 'data/expenses/*.csv')
    people = []
    if os.path.isfile(PEOPLE_CSV):
        with open(PEOPLE_CSV, encoding='utf-8-sig', newline='') as fh:
            for r in csv.DictReader(fh):
                r = {fold(k): (v or '').strip() for k, v in r.items() if k}
                if r.get('name'):
                    people.append({'id': r.get('id') or slug(r['name']), 'name': r['name'], 'role': (r.get('role') or 'viewer').lower(), 'active': r.get('active', '1') not in ('0', 'no', 'false')})
    dump(os.path.join(ROOT, 'data', 'people.js'), 'CP_PEOPLE', {'rows': people}, 'data/people.csv')
    return len(plans), len(files), len(people)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else SOURCE
    listed, list_cols, list_fmt = read_list()
    seed = {'campaigns': [], 'products': [], 'sales': [], 'expenses': [],
            'meta': {'built_at': dt.datetime.now().replace(microsecond=0).isoformat(), 'source_folder': src, 'files_read': 0}}
    reports = []
    emap = load_expense_lines()
    raw_lines = defaultdict(set)   # (type, raw name) → campaign ids (every name in column A, with or without numbers)
    in_folder = sorted(f for f in os.listdir(src) if f.lower().endswith('.xlsx') and not f.startswith('~$')) if os.path.isdir(src) else []
    listed_files = set()
    seen_ids, list_warnings = set(), []
    for c in listed:   # the id: given, else made from the name as before (CR-03 §3.4)
        c['id'] = c['id'] or slug(c['campaign'])
    for c in listed:
        name, file = clean(c['campaign']), c['file']
        cid = c['id']
        if cid in seen_ids:
            list_warnings.append(f'id "{cid}" is in the list twice — the row "{name}" is skipped')
            continue
        seen_ids.add(cid)
        rep = {'id': cid, 'name': name, 'file': file, 'warnings': [], 'sheets': OrderedDict(), 'totals': {}, 'actual_months': {}}
        reports.append(rep)
        path = os.path.join(src, file) if file else None
        if path and not os.path.isfile(path):
            # the same name with other spacing (the list keeps the file's own double space)
            alt = next((f for f in in_folder if fold(f) == fold(file)), None)
            if alt:
                rep['warnings'].append(f'File name spacing differs from the list: read "{alt}"')
                path = os.path.join(src, alt)
                file = alt
        if path:
            listed_files.add(os.path.basename(path))
        status = STATUS.get(fold(c.get('status')), None)
        if status is None:
            rep['warnings'].append(f'Unknown status "{c.get("status")}" in the list — read as On going')
            status = 'ongoing'
        # CR-03 §3.4 — End marketing of the list wins (D28) · blank = Initial Data (D4) · checked against the period below
        endm_list = iso_date(c.get('end_marketing')) if c.get('end_marketing') else None
        if c.get('end_marketing') and not endm_list:
            rep['warnings'].append(f'End marketing "{c.get("end_marketing")}" in the list is not yyyy-mm-dd — Initial Data is used')
        camp = {'id': cid, 'name': name, 'file': file or None, 'file_modified': None, 'start': c['start'].strip(), 'end_marketing': None,
                'end': c['end'].strip(), 'status': status, 'year': int(c['start'][:4]), 'target_source': 'P&L file',
                'file_found': None if not file else os.path.isfile(path), 'note': c.get('note') or None, 'created_at': c.get('created_at') or None,
                'updated_at': c.get('updated_at') or None, 'end_marketing_source': None, 'end_marketing_initial': None}
        if endm_list and camp['start'] <= endm_list <= camp['end']:
            camp['end_marketing'], camp['end_marketing_source'] = endm_list, 'list'
        elif endm_list:
            rep['warnings'].append(f'End marketing {endm_list} in the list is outside {camp["start"]} – {camp["end"]} — not used')
        rep['status'], rep['file_state'] = status, ('none' if not file else 'found' if camp['file_found'] else 'not found')
        seed['campaigns'].append(camp)
        if not file:
            rep['warnings'].append('No P&L file yet — the Campaign is listed without numbers')
            continue
        if not os.path.isfile(path):
            rep['warnings'].append('File not found — nothing read for this Campaign')
            rep['missing_file'] = True
            continue
        camp['file_modified'] = dt.datetime.fromtimestamp(os.path.getmtime(path)).replace(microsecond=0).isoformat()
        seed['meta']['files_read'] += 1
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        ctx = {'errors': defaultdict(int), 'texts': defaultdict(int), 'textnums': defaultdict(int)}

        # ---------- Initial Data: Start Date · End Marketing · End Campaign (D4: the list wins, a difference is a warning) ----------
        rows = read_sheet(wb, SHEETS['initial'])
        rep['sheets']['initial'] = 'missing' if rows is None else 'ok'
        if rows is None:
            rep['warnings'].append('Sheet "Initial Data" missing — End marketing not known')
        else:
            init = {fold(r[0]): (r[1] if len(r) > 1 else None) for r in rows if r and r[0] is not None}
            start, endm, end = iso_date(init.get('start date')), iso_date(init.get('end marketing')), iso_date(init.get('end campaign'))
            rep['initial'] = {'start': start, 'end_marketing': endm, 'end': end}
            if start and start != camp['start']:
                rep['warnings'].append(f'Initial Data Start Date {start} ≠ list {camp["start"]} — the list is used (D4)')
            if end and end != camp['end']:
                rep['warnings'].append(f'Initial Data End Campaign {end} ≠ list {camp["end"]} — the list is used (D4)')
            if endm and camp['start'] <= endm <= camp['end']:
                camp['end_marketing_initial'] = endm
            if camp['end_marketing_source'] == 'list':
                if endm and endm != camp['end_marketing']:
                    rep['warnings'].append(f'Initial Data End Marketing {endm} ≠ list {camp["end_marketing"]} — the list is used (D28)')
            elif not endm:
                rep['warnings'].append('Initial Data End Marketing is blank — the Timeline draws the bar to End campaign')
            elif endm < camp['start'] or endm > camp['end']:
                rep['warnings'].append(f'End Marketing {endm} is outside the list period {camp["start"]} – {camp["end"]} — not used')
            else:
                camp['end_marketing'], camp['end_marketing_source'] = endm, 'Initial Data'

        # ---------- Product Master: Code · Barcode · Product Name · Product Nickname · Product Group · Category · COGS ----------
        rows = read_sheet(wb, SHEETS['products'])
        products, by_name = OrderedDict(), defaultdict(list)
        if rows is None:
            rep['sheets']['products'] = 'missing'
            rep['warnings'].append('Sheet "Product Master" missing — COGS cannot be worked out (GP "—")')
        else:
            hdr_i = next((i for i, r in enumerate(rows) if find_col(r, {'product name'}) is not None), 0)
            h = rows[hdr_i]
            col = {k: find_col(h, n) for k, n in {'code': {'code'}, 'barcode': {'barcode'}, 'name': {'product name'}, 'nick': {'product nickname'},
                                                   'group': {'product group'}, 'cat': {'category'}, 'cogs': {'cogs'}}.items()}
            get = lambda r, k: r[col[k]] if col[k] is not None and col[k] < len(r) else None
            no_cogs = 0
            for r in rows[hdr_i + 1:]:
                pname, code = clean(get(r, 'name')), code_text(get(r, 'code'))
                if not pname and not code:
                    continue
                key = code or 'name:' + fold(pname)
                cogs = num(get(r, 'cogs'), ctx, 'Product Master')
                if cogs is None:
                    no_cogs += 1
                if key in products:
                    rep['warnings'].append(f'Product Master: "{pname or code}" listed twice — the first row is used')
                    continue
                products[key] = {'campaign_id': cid, 'key': key, 'code': code or None, 'name': pname, 'nickname': clean(get(r, 'nick')) or None,
                                 'group': clean(get(r, 'group')) or None, 'category': clean(get(r, 'cat')) or None, 'cogs': cogs}
                by_name[fold(pname)].append(key)
            rep['sheets']['products'] = f'{len(products)} products' if products else 'empty'
            if products and all(p['code'] is None for p in products.values()):
                rep['warnings'].append('Product Master has no Code — products are matched by Product Name')
            if no_cogs:
                rep['warnings'].append(f'Product Master: {no_cogs} product(s) without COGS')
        seed['products'].extend(products.values())

        # ---------- Sales sheets: Code · Product Name · Channel · Sub-Channel · months … ----------
        recs = OrderedDict()   # (product_key, channel, sub_channel, month, scenario) → record
        unknown_products, unknown_channels, blank_code_rows = set(), set(), 0
        for sk, (scenario, field) in SALES_SHEETS.items():
            rows = read_sheet(wb, SHEETS[sk])
            if rows is None:
                rep['sheets'][sk] = 'missing'
                rep['warnings'].append(f'Sheet "{SHEETS[sk]}" missing')
                continue
            hi, mcols = header_row(rows)
            if hi is None:
                rep['sheets'][sk] = 'no header'
                rep['warnings'].append(f'Sheet "{SHEETS[sk]}": no "Jan yyyy" header row found')
                continue
            h = rows[hi]
            ci, ni, chi, sci = (find_col(h, {'code'}), find_col(h, {'product name'}), find_col(h, {'channel'}), find_col(h, {'sub-channel', 'sub channel', 'subchannel'}))
            cells = 0
            for r in rows[hi + 1:]:
                at = lambda j: r[j] if j is not None and j < len(r) else None
                pname, code = clean(at(ni)), code_text(at(ci))
                if not pname and not code:
                    continue
                if fold(pname).startswith('total') or fold(code).startswith('total'):
                    continue
                vals = {m: num(at(j), ctx, SHEETS[sk]) for j, m in mcols.items()}
                vals = {m: v for m, v in vals.items() if v is not None}
                if not vals:
                    continue
                ch_raw = clean(at(chi))
                ch = CHANNEL.get(fold(ch_raw))
                if ch is None:
                    unknown_channels.add(ch_raw or '(blank)')
                    ch = ch_raw.upper() or 'OTHER'
                if code:
                    key = code
                    if code not in products:
                        unknown_products.add(f'{code} {pname}'.strip())
                else:
                    blank_code_rows += 1
                    hits = by_name.get(fold(pname), [])
                    key = hits[0] if len(hits) == 1 else 'name:' + fold(pname)
                    if len(hits) != 1:
                        unknown_products.add(pname + (' (name matches several products)' if hits else ''))
                sub = clean(at(sci)) or '(blank)'
                for m, v in vals.items():
                    k = (key, ch, sub, m, scenario)
                    rec = recs.get(k)
                    if rec is None:
                        rec = recs[k] = {'campaign_id': cid, 'product_key': key, 'channel': ch, 'sub_channel': sub, 'month': m, 'scenario': scenario, 'qty': None, 'amount': None, '_name': pname}
                    rec[field] = (rec[field] or 0) + v
                    cells += 1
            rep['sheets'][sk] = f'{cells} cells' if cells else 'no numbers'
        if unknown_channels:
            rep['warnings'].append('Channel not MT / TT / ECOM: ' + ', '.join(sorted(unknown_channels)))
        if blank_code_rows:
            rep['warnings'].append(f'{blank_code_rows} sales row(s) with a blank Code — matched by Product Name')
        if unknown_products:
            rep['warnings'].append(f'{len(unknown_products)} product(s) in the sales sheets not found in Product Master (no COGS): ' + '; '.join(sorted(unknown_products)[:8]) + (' …' if len(unknown_products) > 8 else ''))
        # CR-02 §3.1 — a targets CSV of this Campaign replaces the two target sheets
        tg = read_targets(os.path.join(TARGET_DIR, cid + '.csv'), camp, products, by_name, rep)
        if tg is not None:
            recs = OrderedDict((k, v) for k, v in recs.items() if v['scenario'] != 'target')
            for r in tg[0]:
                recs[(r['product_key'], r['channel'], r['sub_channel'], r['month'], 'target')] = r
            camp['target_source'] = tg[1]
            rep['sheets']['target_qty'] = rep['sheets']['target_amt'] = f'replaced by data/targets/{cid}.csv ({len(tg[0])} rows)'
            missing = sorted({r['_name'] or r['product_key'] for r in tg[0] if r['product_key'] not in products})
            if missing:
                rep['warnings'].append(f'targets CSV: {len(missing)} SKU(s) not in Product Master (no COGS): ' + '; '.join(missing[:8]) + (' …' if len(missing) > 8 else ''))
        rep['target_source'] = camp['target_source']
        # a product the sales / target rows name but Product Master does not: kept so every screen can name it (no COGS)
        for r in recs.values():
            if r['product_key'] not in products:
                nm = r.pop('_name', None) or (r['product_key'][5:] if r['product_key'].startswith('name:') else r['product_key'])
                products[r['product_key']] = {'campaign_id': cid, 'key': r['product_key'], 'code': None if r['product_key'].startswith('name:') else r['product_key'], 'name': nm,
                                              'nickname': None, 'group': None, 'category': None, 'cogs': None, 'in_master': False}
                seed['products'].append(products[r['product_key']])
            r.pop('_name', None)
        seed['sales'].extend(recs.values())

        # ---------- Expense sheets: column A = the line (kept as typed, D7) · months … ----------
        exps = OrderedDict()   # (type, line, month, scenario) → record
        for sk, (typ, scenario) in EXPENSE_SHEETS.items():
            rows = read_sheet(wb, SHEETS[sk])
            if rows is None:
                rep['sheets'][sk] = 'missing'
                rep['warnings'].append(f'Sheet "{SHEETS[sk]}" missing')
                continue
            hi, mcols = header_row(rows)
            if hi is None:
                rep['sheets'][sk] = 'no header'
                rep['warnings'].append(f'Sheet "{SHEETS[sk]}": no "Jan yyyy" header row found')
                continue
            cells = 0
            for r in rows[hi + 1:]:
                raw = clean(r[0] if r else None)
                if not raw or fold(raw).startswith('total'):
                    continue
                raw_lines[(typ, raw)].add(cid)
                line = emap.get((typ, fold(raw)), raw)   # CR-02 §3.3 — the name used · not in the table → as typed (reported)
                for j, m in mcols.items():
                    v = num(r[j] if j < len(r) else None, ctx, SHEETS[sk])
                    if v is None:
                        continue
                    k = (typ, line, m, scenario)
                    rec = exps.get(k)
                    if rec is None:
                        rec = exps[k] = {'campaign_id': cid, 'type': typ, 'line': line, 'month': m, 'scenario': scenario, 'amount': 0.0}
                    rec['amount'] += v
                    cells += 1
            rep['sheets'][sk] = f'{cells} cells' if cells else 'no numbers'
        seed['expenses'].extend(exps.values())

        for where, n in ctx['errors'].items():
            rep['warnings'].append(f'{where}: {n} Excel error cell(s) (#REF! …) skipped')
        for where, n in ctx['textnums'].items():
            rep['warnings'].append(f'{where}: {n} number(s) typed as text — read as numbers')
        for where, n in ctx['texts'].items():
            rep['warnings'].append(f'{where}: {n} text cell(s) in month columns skipped')

        # ---------- totals · months with actual · checks (D9 one month · outside the period · COGS coverage) ----------
        S = [r for r in seed['sales'] if r['campaign_id'] == cid]
        E = [r for r in seed['expenses'] if r['campaign_id'] == cid]
        tot = lambda rows, f: sum(r[f] or 0 for r in rows) if any(r[f] is not None for r in rows) else None
        T = rep['totals']
        T['target_rev'], T['target_qty'] = tot([r for r in S if r['scenario'] == 'target'], 'amount'), tot([r for r in S if r['scenario'] == 'target'], 'qty')
        T['actual_rev'], T['actual_qty'] = tot([r for r in S if r['scenario'] == 'actual'], 'amount'), tot([r for r in S if r['scenario'] == 'actual'], 'qty')
        for typ, sc in (('marketing', 'budget'), ('marketing', 'actual'), ('sales', 'budget'), ('sales', 'actual')):
            T[f'{typ}_{sc}'] = tot([r for r in E if r['type'] == typ and r['scenario'] == sc], 'amount')
        months = lambda rows: sorted({r['month'] for r in rows})
        for label, rows in (('Sales', [r for r in S if r['scenario'] == 'actual' and r['amount'] is not None]),
                            ('Marketing exp', [r for r in E if r['type'] == 'marketing' and r['scenario'] == 'actual']),
                            ('Sales exp', [r for r in E if r['type'] == 'sales' and r['scenario'] == 'actual'])):
            ms = months(rows)
            rep['actual_months'][label] = (ms[0], ms[-1]) if ms else None
        p0, p1 = camp['start'][:7], camp['end'][:7]
        for label, rows in (('Sales target', [r for r in S if r['scenario'] == 'target']), ('Sales actual', [r for r in S if r['scenario'] == 'actual']),
                            ('Marketing budget', [r for r in E if r['type'] == 'marketing' and r['scenario'] == 'budget']), ('Marketing actual', [r for r in E if r['type'] == 'marketing' and r['scenario'] == 'actual']),
                            ('Sales exp budget', [r for r in E if r['type'] == 'sales' and r['scenario'] == 'budget']), ('Sales exp actual', [r for r in E if r['type'] == 'sales' and r['scenario'] == 'actual'])):
            amt = [r for r in rows if r.get('amount')]
            ms = months(amt)
            total = sum(r['amount'] for r in amt)
            if len(ms) == 1 and p0 != p1 and total:
                rep['warnings'].append(f'{label}: all {baht(total)} is in one month ({month_name(ms[0])}) — shown as entered, not spread (D9)')
            out = sum(r['amount'] for r in amt if r['month'] < p0 or r['month'] > p1)
            if out:
                rep['warnings'].append(f'{label}: {baht(out)} is in months outside the list period {month_name(p0)} – {month_name(p1)} — kept, counted in those months')
        for sc in ('target', 'actual'):
            rows = [r for r in S if r['scenario'] == sc and r['amount']]
            if not rows:
                continue
            ok = sum(r['amount'] for r in rows if r['qty'] is not None and (products.get(r['product_key']) or {}).get('cogs') is not None)
            allv = sum(r['amount'] for r in rows)
            rep.setdefault('cogs_cover', {})[sc] = ok / allv if allv else None
            if ok < allv - 0.5:
                no_qty = sum(1 for r in rows if r['qty'] is None)
                no_cogs = sum(1 for r in rows if r['qty'] is not None and (products.get(r['product_key']) or {}).get('cogs') is None)
                # E1 → E (James, 04/11/2026): the page estimates the COGS of a row with no quantity from the SKU's net price a piece (Est.) ·
                # a product with no COGS still makes Gross profit "—" (D2)
                rep['warnings'].append(f'COGS ({sc}): {baht(allv - ok)} of revenue has no quantity ({no_qty} row-months) or no COGS ({no_cogs}) — '
                                       + ('Gross profit shows "—" (D2)' if no_cogs else 'the page estimates their COGS from the same SKU\'s net price a piece (Est.) — add the quantities to make it exact'))
        qty_only = sum(1 for r in S if r['qty'] is not None and r['amount'] is None)
        if qty_only:
            rep['warnings'].append(f'{qty_only} row-month(s) with a quantity but no amount — their COGS is counted (cost of pieces with no revenue entered)')
        if T['actual_rev'] is None:
            rep['warnings'].append('No Sales Actual yet — revenue, Gross profit and Campaign profit show "—" (not ฿0)')
        if all(T[k] is None for k in T):
            rep['warnings'].append('No numbers in any sheet yet (product list only) — every value shows "—"')

    seed['meta']['ignored_files'] = [f for f in in_folder if f not in listed_files]
    last = [r['month'] for r in seed['sales'] if r['scenario'] == 'actual'] + [r['month'] for r in seed['expenses'] if r['scenario'] == 'actual']
    seed['meta']['actual_to'] = max(last) if last else None
    # CR-03 — the list as the page sees it (data/campaigns.js) · its last change · the template a new Campaign is copied from
    seed['meta']['list_updated_at'] = write_list_js(listed, list_cols, list_fmt)
    seed['meta']['plan_mirrors'] = write_plan_mirrors()   # CR-05 — plans · expenses · people (counts)
    tpl = sorted(f for f in os.listdir(TEMPLATE_DIR) if f.lower().endswith('.xlsx') and not f.startswith('~$')) if os.path.isdir(TEMPLATE_DIR) else []
    seed['meta']['template'] = tpl[0] if tpl else None
    seed['meta']['list_warnings'] = list_warnings

    os.makedirs(os.path.dirname(SEED_JS), exist_ok=True)
    with open(SEED_JS, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('/* seed.js — built by tools/build_seed.py from the Campaign P&L files (CR-01 §3). Do not edit: run the tool again. */\n')
        fh.write('window.CP_SEED = ')
        json.dump(seed, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write(';\n')
    seed['meta']['unmapped_lines'] = sorted({f'{t}: {n}' for (t, n) in raw_lines if (t, fold(n)) not in emap})
    write_report(seed, reports, src, raw_lines, emap)
    print(f"seed.js: {len(seed['campaigns'])} campaigns · {len(seed['products'])} products · {len(seed['sales'])} sales · {len(seed['expenses'])} expenses · files read {seed['meta']['files_read']}")
    for r in reports:
        t = r['totals']
        print(f"  {r['name']}: target {baht(t.get('target_rev'))} · actual {baht(t.get('actual_rev'))} · mkt {baht(t.get('marketing_budget'))}/{baht(t.get('marketing_actual'))} · sls {baht(t.get('sales_budget'))}/{baht(t.get('sales_actual'))} · {len(r['warnings'])} warning(s)")


def write_report(seed, reports, src, raw_lines, emap):
    L = []
    w = L.append
    meta = seed['meta']
    w('# SEED_REPORT — Campaign P&L seed')
    w('')
    w(f"Built {meta['built_at'].replace('T', ' ')} by `tools/build_seed.py` · source `{src}` · {meta['files_read']} of {len(seed['campaigns'])} files read · "
      f"actual to {month_name(meta['actual_to']) if meta['actual_to'] else '—'}")
    if meta.get('ignored_files'):
        w('')
        w('Files in the folder not in `data/campaigns.csv` (not read): ' + ', '.join(f'`{f}`' for f in meta['ignored_files']))
    w('')
    w('Money in Baht as saved in the files (ex VAT · Sales Actual Amount = Net revenue). "—" = the sheet has no numbers (never ฿0).')
    w('')
    # CR-03 §3.4 — the Campaign list (data/campaigns.csv, the main list — D21)
    w('## Campaign list')
    w('')
    w(f"`data/campaigns.csv` · last change {(meta.get('list_updated_at') or '—').replace('T', ' ')} · template for new Campaigns: "
      f"{('`data/templates/' + meta['template'] + '`') if meta.get('template') else '**none** — put the P&L template in data/templates/'}")
    w('')
    w('| id | Campaign | Status | P&L file | End marketing from |')
    w('|---|---|---|---|---|')
    for r in reports:
        c = next(x for x in seed['campaigns'] if x['id'] == r['id'])
        fs = {'none': 'none', 'found': 'found', 'not found': '**not found**'}[r.get('file_state', 'none')]
        w(f"| `{c['id']}` | {c['name']} | {c['status']} | {fs}{(' · `' + c['file'] + '`') if c.get('file') else ''} | {c.get('end_marketing_source') or '—'} |")
    for x in meta.get('list_warnings') or []:
        w(f'- ⚠ {x}')
    w('')
    w('## Summary')
    w('')
    w('| Campaign | Target revenue | Actual revenue | Target qty | Actual qty | Marketing budget | Marketing actual | Sales exp budget | Sales exp actual | Warnings |')
    w('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
    grand = defaultdict(float)
    has = defaultdict(bool)
    qty = lambda v: '—' if v is None else f'{v:,.0f}'
    for r in reports:
        t = r['totals']
        w(f"| {r['name']} | {baht(t.get('target_rev'))} | {baht(t.get('actual_rev'))} | {qty(t.get('target_qty'))} | {qty(t.get('actual_qty'))} | {baht(t.get('marketing_budget'))} | {baht(t.get('marketing_actual'))} | {baht(t.get('sales_budget'))} | {baht(t.get('sales_actual'))} | {len(r['warnings'])} |")
        for k, v in t.items():
            if v is not None:
                grand[k] += v
                has[k] = True
    g = lambda k: baht(grand[k]) if has[k] else '—'
    gq = lambda k: qty(grand[k]) if has[k] else '—'
    w(f"| **Total** | **{g('target_rev')}** | **{g('actual_rev')}** | **{gq('target_qty')}** | **{gq('actual_qty')}** | **{g('marketing_budget')}** | **{g('marketing_actual')}** | **{g('sales_budget')}** | **{g('sales_actual')}** | |")
    w('')
    w('Totals with satang (for reconciling with the dashboard, This year · every status):')
    w('')
    for k, label in (('target_rev', 'Target revenue'), ('actual_rev', 'Actual revenue'), ('marketing_budget', 'Marketing budget'), ('marketing_actual', 'Marketing actual'),
                     ('sales_budget', 'Sales exp budget'), ('sales_actual', 'Sales exp actual')):
        w(f"- {label}: {('฿' + format(grand[k], ',.2f')) if has[k] else '—'}")
    w(f"- Total spend budget (Marketing + Sales): {('฿' + format(grand['marketing_budget'] + grand['sales_budget'], ',.2f')) if has['marketing_budget'] or has['sales_budget'] else '—'}")
    w(f"- Total spend actual (Marketing + Sales): {('฿' + format(grand['marketing_actual'] + grand['sales_actual'], ',.2f')) if has['marketing_actual'] or has['sales_actual'] else '—'}")
    w('')
    w('### Data available (✓ numbers · · none · ✕ sheet missing)')
    w('')
    keys = list(SHEETS.keys())[1:]
    w('| Campaign | ' + ' | '.join(SHEETS[k].replace(' (piece)', '').replace(' (Baht)', '').replace(' (Amount Baht)', '') for k in keys) + ' |')
    w('|---|' + '|'.join(':-:' for _ in keys) + '|')
    for r in reports:
        cells = []
        for k in keys:
            v = r['sheets'].get(k, 'missing')
            cells.append('✕' if v == 'missing' or v == 'no header' else '·' if v in ('no numbers', 'empty') else '✓')
        w(f"| {r['name']} | " + ' | '.join(cells) + ' |')
    w('')
    # CR-02 §3.3 — every raw expense line name → the name used (data/expense_lines.csv) · how many Campaigns use it
    w('### Expense line names (data/expense_lines.csv)')
    w('')
    w('| Group | Raw name in the files | Name used | Campaigns | In the table |')
    w('|---|---|---|---:|:-:|')
    for (t, n) in sorted(raw_lines, key=lambda k: (k[0], fold(emap.get((k[0], fold(k[1])), k[1])), fold(k[1]))):
        used = emap.get((t, fold(n)))
        w(f"| {t.capitalize()} | {n} | {used or n} | {len(raw_lines[(t, n)])} | {'✓' if used else '**✕ add it**'} |")
    miss = [k for k in raw_lines if (k[0], fold(k[1])) not in emap]
    w('')
    w(f"{len(miss)} raw name(s) not in `data/expense_lines.csv`" + (': ' + ', '.join(f'{t}: {n}' for t, n in sorted(miss)) if miss else '.'))
    w('')
    w('### Campaign ids and target source (data/targets/<id>.csv replaces the P&L target sheets — docs/TARGET_CONTRACT.md)')
    w('')
    w('| Campaign | id | Target from |')
    w('|---|---|---|')
    for r in reports:
        w(f"| {r['name']} | `{r['id']}` | {r.get('target_source', 'P&L file')} |")
    w('')
    for r in reports:
        c = next(x for x in seed['campaigns'] if x['id'] == r['id'])
        t = r['totals']
        w(f"## {r['name']}")
        w('')
        w(f"- File: `{r['file']}`" + (f" · modified {c['file_modified'].replace('T', ' ')}" if c.get('file_modified') else ' · **not found**') + f" · target from {c.get('target_source', 'P&L file')}")
        w(f"- Period (list): {c['start']} – {c['end']} · End marketing {c['end_marketing'] or '—'} · status {c['status']}" +
          (f" · Initial Data: {r['initial']['start'] or '—'} / {r['initial']['end_marketing'] or '—'} / {r['initial']['end'] or '—'}" if r.get('initial') else ''))
        w('- Sheets: ' + ' · '.join(f"{SHEETS[k]}: {v}" for k, v in r['sheets'].items()))
        am = r['actual_months']
        w('- Months with actual: ' + ' · '.join(f"{k} {month_name(v[0])} – {month_name(v[1])}" if v else f"{k} none" for k, v in am.items()))
        w(f"- Revenue: target {baht(t.get('target_rev'))} ({qty(t.get('target_qty'))} pcs) · actual {baht(t.get('actual_rev'))} ({qty(t.get('actual_qty'))} pcs)")
        w(f"- Marketing: budget {baht(t.get('marketing_budget'))} · actual {baht(t.get('marketing_actual'))} — Sales expenses: budget {baht(t.get('sales_budget'))} · actual {baht(t.get('sales_actual'))}")
        if r.get('cogs_cover'):
            w('- COGS coverage (revenue with quantity × COGS): ' + ' · '.join(f"{k} {v * 100:.1f}%" for k, v in r['cogs_cover'].items() if v is not None))
        if r['warnings']:
            w('- Warnings:')
            for x in r['warnings']:
                w(f'  - {x}')
        else:
            w('- Warnings: none')
        w('')
    os.makedirs(os.path.dirname(REPORT_MD), exist_ok=True)
    with open(REPORT_MD, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(L))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
