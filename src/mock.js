/* mock.js — CR-04 §3 · CR-06 (Mock only): the whole demo data, made in the browser from data/mock-scenario.js (D33). → CP.mock · CP.store
   CP.mock.seed(today) = an object with the seed's schema (campaigns · products · sales · expenses · meta) + the list's fields (note · created_at · updated_at),
   one object a day (the rules' cache holds it) · CP.mock.data(today) = + plans (CR-07: 6 steps · forecast) · requests · people (with a department) ·
   the Product Master (CR-06 §7.4) · CR-07: Other expenses (§10) · no expense items (D65 — the Spend actual is the seed's own rows).
   CP.store (end of this file) = that + what was clicked in this browser (localStorage, D52).
   A seeded PRNG (FNV-1a hash → mulberry32): the same day gives the same numbers on every machine.
   Target and Budget never depend on today · Sales / Spend actual run to today (this month to date), to the day it was cancelled for a Cancelled one.
   §3.3 — Products (3–7 a Campaign, a hero 35–50%) · Target (channel → sub-channel → SKU → month, the sum = Full target to the baht, largest remainder) ·
   Sales actual (ach of the Campaign × channel × SKU × sub-channel × ±8% a month, then set so Ach % to date = ach) · Budget (the lines and months of the
   scenario, the sums = the budgets to the baht) · Spend actual (budget × used × ±15% a line, Platform Fee = 12% of the ECOM sales actual, the rest set so
   Used % to date = used). */
CP.mock = (function () {
  'use strict';
  const R = CP.rules;
  /* FNV-1a (32 bit) of a text → mulberry32: the same key gives the same numbers on every machine */
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const prng = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rnd = key => prng(hash(key))();
  const sum = a => a.reduce((s, v) => s + (v || 0), 0);
  /* largest remainder: a whole-baht total split by weights — the parts add up to the total exactly */
  function split(total, weights) {
    const W = sum(weights); if (!(W > 0)) return weights.map(() => 0);
    const raw = weights.map(w => total * (w || 0) / W), out = raw.map(Math.floor);
    let left = Math.round(total - sum(out));
    raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return out;
  }
  const daysIn = m => +R.monthLast(m).slice(8, 10);
  /* the share of a month inside a Campaign (a start on the 15th = half of the month) */
  function cover(m, a, b) { const f = R.monthFirst(m), l = R.monthLast(m), s = a > f ? a : f, e = b < l ? b : l; return e < s ? 0 : (R.dayDiff(e, s) + 1) / daysIn(m); }

  /* ===================== the product lines (made-up names, M-codes) — [nickname, name, net price a piece ฿, category when not the line's] ===================== */
  const LINES = {
    blush: { group: 'Blush Mochi', category: 'Blush', items: [['Mochi #01 Peach', 'Blush Mochi #01 Peach Mochi 5 g', 189], ['Mochi #02 Rose', 'Blush Mochi #02 Rose Mochi 5 g', 189], ['Mochi #03 Coral', 'Blush Mochi #03 Coral Mochi 5 g', 189],
      ['Mochi #04 Berry', 'Blush Mochi #04 Berry Mochi 5 g', 189], ['Mochi Mini Duo', 'Blush Mochi Mini Duo Set 2 × 2 g', 249], ['Mochi Brush', 'Blush Mochi Kabuki Brush', 129]] },
    lip: { group: 'Lip Splash', category: 'Lip tint', items: [['Splash #01 Watermelon', 'Lip Splash Water Tint #01 Watermelon 3 g', 149], ['Splash #02 Lychee', 'Lip Splash Water Tint #02 Lychee 3 g', 149],
      ['Splash #03 Cherry', 'Lip Splash Water Tint #03 Cherry 3 g', 149], ['Splash #04 Peach Tea', 'Lip Splash Water Tint #04 Peach Tea 3 g', 149], ['Splash Mini Set', 'Lip Splash Mini Set 3 × 1.5 g', 229]] },
    cushion: { group: 'Matte Cushion', category: 'Cushion', items: [['Matte #02 Light Beige', 'Matte Cushion SPF50 PA+++ #02 Light Beige 13 g', 289], ['Matte #01 Ivory', 'Matte Cushion SPF50 PA+++ #01 Ivory 13 g', 289],
      ['Matte #03 Natural', 'Matte Cushion SPF50 PA+++ #03 Natural Beige 13 g', 289], ['Matte #04 Sand', 'Matte Cushion SPF50 PA+++ #04 Sand 13 g', 289], ['Matte Refill #02', 'Matte Cushion Refill #02 Light Beige 13 g', 199],
      ['Matte Refill #03', 'Matte Cushion Refill #03 Natural Beige 13 g', 199], ['Air Puff 2 pcs', 'Matte Cushion Air Puff 2 pcs', 89]] },
    tint: { group: 'Airy Kiss', category: 'Lip tint', items: [['Airy #01 Rosy', 'Airy Kiss Tint #01 Rosy Air 3.5 g', 169], ['Airy #02 Nude', 'Airy Kiss Tint #02 Nude Air 3.5 g', 169], ['Airy #03 Red', 'Airy Kiss Tint #03 Red Air 3.5 g', 169],
      ['Airy #04 Mauve', 'Airy Kiss Tint #04 Mauve Air 3.5 g', 169], ['Airy Mini Duo', 'Airy Kiss Mini Duo 2 × 1.5 g', 199]] },
    heart: { group: 'Heart Cushion', category: 'Cushion', items: [['Heart #02 Natural', 'Heart Cushion Glow SPF50 #02 Natural 12 g', 299], ['Heart #01 Light', 'Heart Cushion Glow SPF50 #01 Light 12 g', 299],
      ['Heart #03 Tan', 'Heart Cushion Glow SPF50 #03 Tan 12 g', 299], ['Heart Refill #01', 'Heart Cushion Refill #01 Light 12 g', 209], ['Heart Refill #02', 'Heart Cushion Refill #02 Natural 12 g', 209],
      ['Heart Holiday Box', 'Heart Cushion Holiday Box (Cushion + Puff + Pouch)', 299]] },
    sun: { group: 'Sun Shield', category: 'Sunscreen', items: [['Sun Shield 30 ml', 'Sun Shield Aqua SPF50+ PA++++ 30 ml', 259], ['Sun Shield 15 ml', 'Sun Shield Aqua SPF50+ PA++++ 15 ml', 159],
      ['Sun Stick', 'Sun Shield Stick SPF50+ 15 g', 229], ['Tone-up Sun', 'Sun Shield Tone-up Cream SPF50+ 30 ml', 249]] },
    eye: { group: 'Glowlogram', category: 'Eyeshadow', items: [['Palette #01 Holo Pink', 'Glowlogram 6-Color Palette #01 Holo Pink', 249], ['Palette #02 Holo Brown', 'Glowlogram 6-Color Palette #02 Holo Brown', 249],
      ['Glitter #01 Moon', 'Glowlogram Liquid Glitter #01 Moon 3 g', 149], ['Glitter #02 Star', 'Glowlogram Liquid Glitter #02 Star 3 g', 149], ['Single #03 Aurora', 'Glowlogram Single Shadow #03 Aurora 1.5 g', 129]] },
    brow: { group: 'Brow High', category: 'Brow', items: [['Brow #01 Natural Brown', 'Brow High Tint #01 Natural Brown 5 g', 149], ['Brow #02 Dark Brown', 'Brow High Tint #02 Dark Brown 5 g', 149],
      ['Brow #03 Grey Brown', 'Brow High Tint #03 Grey Brown 5 g', 149], ['Brow Pencil #01', 'Brow High Slim Pencil #01 Natural Brown', 119], ['Brow Mascara Clear', 'Brow High Clear Brow Mascara 5 g', 129]] },
    collab: { group: 'Pastel Friends', category: 'Cushion', items: [['Pastel Cushion #01', 'Pastel Friends Cushion SPF50 #01 Light 12 g', 299], ['Pastel Blush Cotton', 'Pastel Friends Blush Cotton Candy 4 g', 199, 'Blush'],
      ['Pastel Tint Bubble', 'Pastel Friends Lip Tint Bubble Pink 3 g', 169, 'Lip tint'], ['Pastel Palette', 'Pastel Friends 9-Color Eyeshadow Palette', 279, 'Eyeshadow'], ['Pastel Brow', 'Pastel Friends Brow Tint Soft Brown 4 g', 149, 'Brow'],
      ['Pastel Mini Tint Set', 'Pastel Friends Mini Lip Tint Set 3 × 1.5 g', 249, 'Lip tint'], ['Pastel Sun Cream', 'Pastel Friends Tone-up Sun Cream SPF50+ 30 ml', 229, 'Sunscreen']] },
    mega: { group: '11.11 Sets', category: 'Cushion', items: [['Mega Cushion + Refill', '11.11 Set Matte Cushion + Refill', 299], ['Mega Lip Duo', '11.11 Set Airy Kiss Lip Duo', 239, 'Lip tint'], ['Mega Blush + Brush', '11.11 Set Blush Mochi + Brush', 259, 'Blush']] },
    glow: { group: 'Glow Cushion', category: 'Cushion', items: [['Glow #01 Pearl', 'Glow Cushion Dewy SPF50 #01 Pearl 12 g', 289], ['Glow #02 Honey', 'Glow Cushion Dewy SPF50 #02 Honey 12 g', 289], ['Glow #03 Beige', 'Glow Cushion Dewy SPF50 #03 Beige 12 g', 289],
      ['Glow Refill #02', 'Glow Cushion Refill #02 Honey 12 g', 199], ['Glow Blush Balm', 'Glow Blush Balm #01 Peach Glow 4 g', 179, 'Blush']] },
    lipduo: { group: 'Lip Duo', category: 'Lip tint', items: [['Duo #01 Love Letter', 'Valentine Lip Duo #01 Love Letter', 199], ['Duo #02 Sweet Heart', 'Valentine Lip Duo #02 Sweet Heart', 199], ['Duo #03 Rose Date', 'Valentine Lip Duo #03 Rose Date', 199]] },
    acne: { group: 'Acne Care', category: 'Cleanser', items: [['Gel Cleanser 100 ml', 'Acne Care Gel Cleanser 100 ml', 169], ['Gel Cleanser 50 ml', 'Acne Care Gel Cleanser 50 ml', 99], ['Spot Gel 10 g', 'Acne Care Spot Gel 10 g', 129],
      ['Clear Toner 150 ml', 'Acne Care Clear Toner 150 ml', 159]] },
  };

  /* ===================== one Campaign ===================== */
  /* 3–7 SKUs · net price ฿89–฿299 · COGS 25–38% of it · the first = the hero (35–50% of the target) */
  function productsOf(c, ci) {
    const L = LINES[c.line] || LINES.blush, n = Math.max(3, Math.min(7, c.skus || 5, L.items.length)), w0 = 0.35 + 0.15 * rnd(c.id + '|hero');
    const rest = L.items.slice(1, n).map((_, k) => 0.5 + rnd(`${c.id}|w|${k}`)), rs = sum(rest);
    return L.items.slice(0, n).map((it, k) => {
      const price = Math.max(89, Math.min(299, Math.round(it[2] * (0.95 + 0.1 * rnd(`${c.id}|p|${k}`))))), code = `M${String(ci + 1).padStart(2, '0')}${String(k + 1).padStart(2, '0')}`;
      return { campaign_id: c.id, key: code, code, name: it[1], nickname: it[0], group: L.group, category: it[3] || L.category, cogs: Math.round(price * (0.25 + 0.13 * rnd(`${c.id}|c|${k}`)) * 100) / 100,
        price, weight: k ? (1 - w0) * rest[k - 1] / rs : w0 };
    });
  }
  /* the weight of each month: launch (month 2 the peak, then down) · steady · promo (the first month big) · after End marketing ~60% ·
     ECOM: November × 1.6 and December × 1.3 (11.11 · 12.12) · a month the Campaign only partly covers, its share */
  function monthWeights(c, months, ch) {
    const em = R.ym(c.end_marketing || c.end);
    return months.map((m, i) => {
      const sh = c.shape === 'steady' ? 1 : c.shape === 'promo' ? (i === 0 ? 1 : 0.45) : i === 0 ? 0.78 : i === 1 ? 1 : Math.max(0.55, 1 - 0.07 * (i - 1));
      const mm = +m.slice(5, 7), bump = ch === 'ECOM' ? (mm === 11 ? 1.6 : mm === 12 ? 1.3 : 1) : 1;
      return sh * bump * (m > em ? 0.6 : 1) * cover(m, c.start, c.end);
    });
  }
  /* Target rows: the Full target to the baht over channel × sub-channel × SKU × month · qty = amount ÷ the net price a piece */
  function targetsOf(c, prods, SC) {
    const chs = c.channels.filter(k => SC.subChannels[k]), months = R.monthsIn(c.start, c.end), chw = chs.map(k => SC.channels[k] || 0), cs = sum(chw), cells = [];
    chs.forEach((ch, x) => {
      const mw = monthWeights(c, months, ch), ms = sum(mw), subs = Object.entries(SC.subChannels[ch]), ss = sum(subs.map(s => s[1]));
      subs.forEach(([sub, sw]) => prods.forEach(p => months.forEach((m, i) => { const w = chw[x] / cs * mw[i] / ms * sw / ss * p.weight; if (w > 0) cells.push({ ch, sub, p, m, w }); })));
    });
    const amt = split(c.target, cells.map(x => x.w));
    return cells.map((x, i) => ({ campaign_id: c.id, product_key: x.p.key, channel: x.ch, sub_channel: x.sub, month: x.m, scenario: 'target', qty: Math.round(amt[i] / x.p.price), amount: amt[i] }))
      .filter(r => r.amount > 0);
  }
  /* the SKU factors: the hero at 1 · the others 0.94–1.06 · one SKU set to land in another status than the Campaign (Behind when the Campaign is
     not) and one On target, so every SKU table has more than one status */
  function skuFactors(c, prods) {
    const a = c.ach, s = prods.map((p, k) => (k === 0 ? 1 : 0.94 + 0.12 * rnd(`${c.id}|s|${p.key}`)));
    if (prods.length >= 3) {
      const lo = prods.length - 1, hi = 1, tLo = a >= R.AT_RISK ? 0.84 : Math.max(0.4, a - 0.1), tHi = a < 1 ? 1.07 : a + 0.06;
      for (let it = 0; it < 12; it++) { const sb = sum(prods.map((p, k) => p.weight * s[k])); s[lo] = tLo * sb / a; s[hi] = tHi * sb / a; }
    }
    return new Map(prods.map((p, k) => [p.key, s[k]]));
  }
  /* the day the actuals stop: today · the day it was cancelled (when that is before today) */
  const stopOf = (c, today) => (c.cancelled && c.cancelled < today ? c.cancelled : today);
  const dayShare = (m, stop) => (m === R.ym(stop) ? Math.min(1, +stop.slice(8, 10) / daysIn(m)) : 1);
  /* Sales actual: Start … today (this month to date) · each channel set so its actual ÷ its target to date = ach of the channel, the Campaign = ach */
  function salesOf(c, prods, tgt, today, SC) {
    if (c.ach == null) return [];
    const stop = stopOf(c, today), last = R.ym(stop), rows = tgt.filter(r => r.month <= last);
    if (!rows.length || stop < c.start) return [];
    const ttd = {}; rows.forEach(r => { ttd[r.channel] = (ttd[r.channel] || 0) + r.amount * R.toDateShare(r.month, today); });
    const chs = Object.keys(ttd), fixed = c.ach_by || {}, all = sum(chs.map(k => ttd[k])), restW = sum(chs.filter(k => fixed[k] == null).map(k => ttd[k]));
    const restA = restW > 0 ? (c.ach * all - sum(chs.filter(k => fixed[k] != null).map(k => fixed[k] * ttd[k]))) / restW : c.ach;
    const achOf = k => (fixed[k] != null ? fixed[k] : restA), sk = skuFactors(c, prods), u = new Map();
    /* SKU × sub-channel 0.85–1.15, set back to an average of 1 for each SKU in a channel */
    chs.forEach(ch => { const subs = Object.entries(SC.subChannels[ch]), ss = sum(subs.map(x => x[1]));
      prods.forEach(p => { const raw = subs.map(([s]) => 0.85 + 0.3 * rnd(`${c.id}|u|${p.key}|${ch}|${s}`)), avg = sum(raw.map((v, j) => v * subs[j][1] / ss)); subs.forEach(([s], j) => u.set(`${p.key}|${ch}|${s}`, raw[j] / avg)); }); });
    const f = rows.map(r => sk.get(r.product_key) * (u.get(`${r.product_key}|${r.channel}|${r.sub_channel}`) || 1) * (1 + rnd(`${c.id}|n|${r.product_key}|${r.sub_channel}|${r.month}`) * 0.16 - 0.08) * dayShare(r.month, stop));
    const got = {}; rows.forEach((r, i) => { got[r.channel] = (got[r.channel] || 0) + r.amount * f[i]; });
    return rows.map((r, i) => { const x = f[i] * achOf(r.channel) * ttd[r.channel] / got[r.channel];
      return { campaign_id: c.id, product_key: r.product_key, channel: r.channel, sub_channel: r.sub_channel, month: r.month, scenario: 'actual', qty: Math.round(r.qty * x), amount: Math.round(r.amount * x) }; });
  }
  const xrow = (c, type, line, month, scenario, amount) => ({ campaign_id: c.id, type, line, month, scenario, amount });
  /* Budget: Marketing over Start … End marketing (4 months or more: the first 2 take 40%) · Production the month before Start ·
     Sales expenses over Start … End: Platform Fee by the ECOM target of the month · Marketing Expense - Sharing by the MT target · the rest by the target */
  function budgetsOf(c, tgt, SC) {
    const out = [], startM = R.ym(c.start), mm = R.monthsIn(c.start, c.end_marketing || c.end), n = mm.length;
    const mw = mm.map((m, i) => (n >= 4 ? (i < 2 ? 0.2 : 0.6 / (n - 2)) : 1 / n) * Math.max(0.25, cover(m, c.start, c.end)));
    const ml = Object.entries(SC.marketingLines), ma = split(c.mkt_budget, ml.map(x => x[1]));
    ml.forEach(([line], j) => { if (line === 'Production') { if (ma[j]) out.push(xrow(c, 'marketing', line, R.addMonths(startM, -1), 'budget', ma[j])); return; }
      split(ma[j], mw).forEach((v, i) => { if (v) out.push(xrow(c, 'marketing', line, mm[i], 'budget', v)); }); });
    const months = R.monthsIn(c.start, c.end), by = ch => months.map(m => sum(tgt.filter(r => r.month === m && (!ch || r.channel === ch)).map(r => r.amount)));
    const tot = by(null), base = { 'Platform Fee': by('ECOM'), 'Marketing Expense - Sharing': by('MT') }, sl = Object.entries(SC.salesLines), sa = split(c.sls_budget, sl.map(x => x[1]));
    sl.forEach(([line], j) => { const w = base[line] && sum(base[line]) ? base[line] : tot; split(sa[j], w).forEach((v, i) => { if (v) out.push(xrow(c, 'sales', line, months[i], 'budget', v)); }); });
    return out;
  }
  /* Spend actual: the budget months up to today (this month to date) · budget × used × ±15% a line · Platform Fee = 12% of the ECOM sales actual of
     the month · the other lines set so Used % to date = used (rounded down, so 100% never shows as over) */
  function spendOf(c, bud, sales, today, SC) {
    const stop = stopOf(c, today), last = R.ym(stop), used = c.used != null ? c.used : 1, PF = 'Platform Fee', rows = bud.filter(r => r.month <= last);
    if (!rows.length) return [];
    const ecom = new Map(); sales.forEach(r => { if (r.channel === 'ECOM') ecom.set(r.month, (ecom.get(r.month) || 0) + r.amount); });
    const raw = rows.map(r => (r.line === PF ? null : r.amount * used * (1 + rnd(`${c.id}|x|${r.line}|${r.month}`) * 0.3 - 0.15) * dayShare(r.month, stop)));
    const pf = [...new Set(rows.filter(r => r.line === PF).map(r => r.month))].filter(m => ecom.get(m) > 0).map(m => ({ m, v: Math.floor(ecom.get(m) * (SC.platformFeeRate || 0.12)) }));
    const months = new Set(rows.map(r => r.month)), goal = used * sum(bud.filter(r => months.has(r.month)).map(r => r.amount * R.toDateShare(r.month, today)));
    const rs = sum(raw.filter(v => v != null)), k = rs > 0 ? Math.max(0.2, (goal - sum(pf.map(x => x.v))) / rs) : 0;
    const out = rows.map((r, i) => (raw[i] == null ? null : xrow(c, r.type, r.line, r.month, 'actual', Math.floor(raw[i] * k)))).filter(r => r && r.amount > 0);
    pf.forEach(x => out.push(xrow(c, 'sales', PF, x.m, 'actual', x.v)));
    return out;
  }

  /* CR-07 §10 (D69) — Other expenses: Registration & FDA the month before Start · Contingency over Start … End by the target · Royalty / License fee
     (a collab) by the target of the month · the sum = oth_budget + royalty to the baht */
  function othersOf(c, tgt, SC) {
    const out = [], startM = R.ym(c.start), months = R.monthsIn(c.start, c.end), byM = months.map(m => sum(tgt.filter(r => r.month === m).map(r => r.amount)));
    const ol = Object.entries(SC.otherLines || { Contingency: 60, 'Registration & FDA': 40 }), oa = split(c.oth_budget || 0, ol.map(x => x[1]));
    ol.forEach(([line], j) => { if (!oa[j]) return; if (line === 'Registration & FDA') { out.push(xrow(c, 'other', line, R.addMonths(startM, -1), 'budget', oa[j])); return; }
      split(oa[j], sum(byM) ? byM : months.map(() => 1)).forEach((v, i) => { if (v) out.push(xrow(c, 'other', line, months[i], 'budget', v)); }); });
    if (c.royalty) split(c.royalty, byM).forEach((v, i) => { if (v) out.push(xrow(c, 'other', 'Royalty / License fee', months[i], 'budget', v)); });
    return out;
  }
  /* the Other spend: its budget × used × ±10% a line, months up to today (this month to date) — its own keys, so Marketing / Sales never move */
  function otherSpendOf(c, bud, today) {
    const stop = stopOf(c, today), last = R.ym(stop), used = c.used != null ? c.used : 1;
    return bud.filter(r => r.month <= last).map(r => xrow(c, 'other', r.line, r.month, 'actual', Math.floor(r.amount * used * (0.9 + 0.2 * rnd(`${c.id}|o|${r.line}|${r.month}`)) * dayShare(r.month, stop))))
      .filter(r => r.amount > 0);
  }

  /* ===================== CR-14 §12.5 (D130) — TT = Dealer 60 · Wholesale 40: each row of "Traditional Trade" cut in two (largest remainder on ฿ and on pieces) ·
     Σ TT of a Campaign × month the same to the baht · done after the budgets and the spend were made from the rows ===================== */
  const TT_SPLIT = [['Dealer', 60], ['Wholesale', 40]];
  function lrInt(total, w) {
    const sc = Number.isInteger(total) ? 1 : 100, T = Math.round(total * sc), t = w.reduce((a, b) => a + b, 0), raw = w.map(x => T * x / t), out = raw.map(Math.floor);
    let left = T - out.reduce((a, b) => a + b, 0); raw.map((x, i) => [x - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return out.map(x => x / sc);
  }
  function splitTT(rows) {
    const out = []; rows.forEach(r => { if (r.channel !== 'TT' || r.sub_channel !== 'Traditional Trade') { out.push(r); return; }
      const w = TT_SPLIT.map(x => x[1]), a = lrInt(r.amount || 0, w), q = lrInt(r.qty || 0, w);
      TT_SPLIT.forEach(([nm], i) => { if (a[i] || q[i]) out.push(Object.assign({}, r, { sub_channel: nm, amount: a[i], qty: q[i] })); }); });
    return out;
  }
  /* CR-14 §5.2 (D130) — the sub-channels (master data · Admin): id stays · name shown · key = the name in the rows of the data · share = the default of the
     Target filler (% inside its channel) · 7-Eleven new (no sales yet) */
  const SUBS0 = [['mt-watsons', 'MT', 'Watsons', 'Watsons', 30], ['mt-eveandboy', 'MT', 'Eveandboy', 'Eveandboy', 18], ['mt-konvy', 'MT', 'Konvy', 'Konvy', 12], ['mt-beautrium', 'MT', 'Beautrium', 'Beautrium', 12],
    ['mt-multy', 'MT', 'Multy', 'Multy', 8], ['mt-tsuruha', 'MT', 'Tsuruha', 'Tsuruha', 8], ['mt-cj', 'MT', 'CJ', 'CJ', 7], ['mt-lotuss', 'MT', "Lotus's", 'Lotuss', 5], ['mt-7eleven', 'MT', '7-Eleven', '7-Eleven', 0],
    ['tt-dealer', 'TT', 'Dealer', 'Dealer', 60], ['tt-wholesale', 'TT', 'Wholesale', 'Wholesale', 40],
    ['ecom-shopee', 'ECOM', 'Shopee', 'Shopee', 45], ['ecom-tiktok', 'ECOM', 'TikTok', 'Tiktok', 35], ['ecom-lazada', 'ECOM', 'Lazada', 'Lazada', 20]];
  const PRICE_NAME = { MT: 'retailer', TT: null, ECOM: 'list' };
  const subsSeed = () => SUBS0.map(([id, ch, name, key, share], i) => ({ id, ch, name, key, share, priceName: PRICE_NAME[ch] || (id === 'tt-dealer' ? 'dealer' : 'wholesale'), active: true, order: i, rev: 1 }));
  const subIdOf = (ch, key) => { const x = SUBS0.find(y => y[1] === ch && y[3] === key); return x ? x[0] : ''; };

  /* ===================== the seed ===================== */
  const cache = new Map();
  function seed(today) {
    const SC = window.CP_MOCK_SCENARIO || { campaigns: [] }, k = today;
    const hit = cache.get(k); if (hit && hit.sc === SC) return hit.seed;
    const out = { campaigns: [], products: [], sales: [], expenses: [], meta: {} };
    (SC.campaigns || []).forEach((c, ci) => {
      const prods = productsOf(c, ci), tgt = targetsOf(c, prods, SC), act = salesOf(c, prods, tgt, today, SC), bud = budgetsOf(c, tgt, SC);
      const cancelled = !!c.cancelled && c.cancelled <= today, back = d => (d < today ? d : R.addDays(today, -7));
      const created = back(R.addDays(c.start, -45)), upd = cancelled ? c.cancelled : [R.addDays(c.start, 14), R.addDays(today, -2)].sort()[0];
      out.campaigns.push({ id: c.id, name: c.name, start: c.start, end_marketing: c.end_marketing || null, end: c.end,
        status: cancelled ? 'cancelled' : 'ongoing', year: +c.start.slice(0, 4), note: c.note || null,
        created_at: `${created}T09:30:00`, updated_at: `${upd > created ? upd : created}T${cancelled ? '10:15' : '16:40'}:00`, owner: ownerOf(SC, c, ci), plan: 'web' });
      prods.forEach(p => out.products.push({ campaign_id: p.campaign_id, key: p.key, code: p.code, name: p.name, nickname: p.nickname, group: p.group, category: p.category, cogs: p.cogs }));
      splitTT(tgt).forEach(r => out.sales.push(r)); splitTT(act).forEach(r => out.sales.push(r));
      bud.forEach(r => out.expenses.push(r)); spendOf(c, bud, act, today, SC).forEach(r => out.expenses.push(r));
      const oth = othersOf(c, tgt, SC); oth.forEach(r => out.expenses.push(r)); otherSpendOf(c, oth, today).forEach(r => out.expenses.push(r));
    });
    out.meta = { actual_to: R.ym(today) };
    cache.set(k, { sc: SC, seed: out });
    return out;
  }
  const ownerOf = (SC, c, ci) => ((SC.approval || {}).owners || {})[c.id] || (ci % 2 ? 'Nok' : 'Ploy');

  /* ===================== CR-05 §11 — the plans · requests · expenses · people · list of the Mock (D48: what is clicked goes to localStorage, CP.store) =====================
     The 13 Campaigns: approved plans whose target / Current budget / expenses are exactly the rows above (the anchor of CR-04 holds) — the target rows carry
     their amount (qty × a typed price would not give it to the baht) · an approved request is inside the budget above, so the first version had less ·
     expenses = the Spend actual above cut into 1–4 items (vendors made up): the months before last month Paid · last month ~60% Paid · this month Committed.
     The drafts: not approved — not on the Dashboard (D50) · their target typed as qty (฿ = qty × price). */
  const listRow = c => ({ id: c.id, campaign: c.name, start: c.start, end: c.end, end_marketing: c.end_marketing || '', status: c.status === 'cancelled' ? 'Cancelled' : 'On going',
    note: c.note || '', created_at: c.created_at || '', updated_at: c.updated_at || '', owner: c.owner || '' });
  /* CR-07 §7 — a SKU's role: the first = Hero · a puff / brush / box / mini set = GWP · the rest Core */
  const roleOf = (p, k) => (k === 0 ? 'hero' : /puff|brush|box|mini/i.test(p.nickname + ' ' + p.name) ? 'gwp' : 'core');
  const skuOf = (p, chs, ecom, k) => ({ code: p.code, name: p.name, nickname: p.nickname, group: p.group, category: p.category, cogs: p.cogs, role: roleOf(p, k || 0),
    price: Object.fromEntries(R.CHANNELS.map(k2 => [k2, chs.includes(k2) ? (k2 === 'ECOM' && ecom ? Math.round(p.price * ecom) : p.price) : ''])) });
  /* D62 — the target of a plan by SKU × Channel × month (the sub-channels added up: qty and ฿ the same to the baht) */
  function byChannel(rows, withAmount) {
    const m = new Map();
    rows.forEach(r => { const k = `${r.code}|${r.channel}|${r.month}`, x = m.get(k) || { code: r.code, channel: r.channel, month: r.month, qty: 0, amount: 0 };
      x.qty += r.qty || 0; x.amount += r.amount || 0; m.set(k, x); });
    return [...m.values()].map(x => (withAmount ? x : { code: x.code, channel: x.channel, month: x.month, qty: x.qty }));
  }
  const details = (c, L) => ({ objective: c.objective || `${(L || {}).group || c.name}: ${c.shape === 'promo' ? 'a short promotion' : c.shape === 'steady' ? 'steady sales all through the campaign' : 'launch and build the line'}`,
    brand: 'Charmiss', category: (L || {}).category || '', channels: c.channels.slice() });
  const FC = () => ({ ach: { MT: 1, TT: 1, ECOM: 1 }, worst: 0.8, best: 1.1, note: '', comment: 'Base = the target (achievement 100%).' });
  /* every step done by the people of its department, before the plan was sent */
  function stepsDone(c, owner, people, sentAt) {
    const s = R.newStepsV1(c.start, owner, people), sent = String(sentAt || '').slice(0, 10);
    Object.keys(s).forEach(k => { const d = s[k].due < sent || !sent ? s[k].due : sent; Object.assign(s[k], { status: 'done', done_at: `${d}T16:00:00`, by: s[k].assignee }); });
    delete s.env;   /* CR-13 (D121) — the plans of the story were made before the envelope step: env = done (R.stepState) */
    return s;
  }

  /* ===================== CR-06 §7.4 — Product Master: every SKU of the 16 Campaigns (COGS as they are — the anchor holds) + 12 more ===================== */
  /* EAN-13 of Thailand (885…) from the code · the check digit worked out */
  function ean(code) { const d = ('885' + String(hash('bc|' + code)).padStart(10, '0')).slice(0, 12); let s = 0; for (let i = 0; i < 12; i++) s += +d[i] * (i % 2 ? 3 : 1); return d + ((10 - (s % 10)) % 10); }
  /* [code, nickname, name, group, category, status, net price ฿, COGS ฿, launch (NPD), barcode? , note] — not in any Campaign yet */
  const MORE = [
    ['M9001', 'Mochi #05 Lilac', 'Blush Mochi #05 Lilac Mochi 5 g', 'Blush Mochi', 'Blush', 'active', 189, 58.4],
    ['M9002', 'Splash #05 Guava', 'Lip Splash Water Tint #05 Guava 3 g', 'Lip Splash', 'Lip tint', 'active', 149, 44.7],
    ['M9003', 'Matte #05 Honey', 'Matte Cushion SPF50 PA+++ #05 Honey 13 g', 'Matte Cushion', 'Cushion', 'active', 289, 92.5],
    ['M9004', 'Sun Mist 50 ml', 'Sun Shield Aqua Mist SPF50 PA+++ 50 ml', 'Sun Shield', 'Sunscreen', 'active', 279, 81.9],
    ['M9005', 'Airy #05 Coral', 'Airy Kiss Tint #05 Coral Air 3.5 g', 'Airy Kiss', 'Lip tint', 'active', 169, 52.4],
    ['M9006', 'Brow #04 Ash Brown', 'Brow High Tint #04 Ash Brown 5 g', 'Brow High', 'Brow', 'active', 149, 43.2],
    ['M9007', 'Clear Mask 50 g', 'Acne Care Clear Clay Mask 50 g', 'Acne Care', 'Cleanser', 'active', 189, 55.8],
    ['M9008', 'Glow Brush Set', 'Glowlogram Eye Brush Set 3 pcs', 'Glowlogram', 'Eyeshadow', 'active', 199, 61.3],
    ['M9009', 'Velvet #01 Fig', 'Velvet Lip Mousse #01 Fig 4 g', 'Velvet Lip', 'Lip tint', 'npd', 179, 57.3, '2027-03-01', '', 'Launch with the Velvet campaign (to plan)'],
    ['M9010', 'Velvet #02 Cocoa', 'Velvet Lip Mousse #02 Cocoa 4 g', 'Velvet Lip', 'Lip tint', 'npd', 179, 57.3, '2027-03-01', '', ''],
    ['M9011', 'Heart Valentine 2025', 'Heart Cushion Valentine Edition 2025 12 g', 'Heart Cushion', 'Cushion', 'clearance', 259, 96, '', null, 'Old packaging — sell out by Q1 2027'],
    ['M9012', 'Splash #00 Clear', 'Lip Splash Water Tint #00 Clear Gloss 3 g', 'Lip Splash', 'Lip tint', 'discontinued', 129, 41.3, '', null, 'Replaced by Splash #05 Guava'],
  ];
  const price3 = v => ({ MT: v, TT: v, ECOM: v });

  /* CR-13 §5.5 — the closed Campaigns of the story: days after End (or the date) · their closing note */
  const CLOSED = { 'm-blush-mochi-launch': 20, 'm-songkran-lip-splash': 20, 'm-summer-sun-shield': '2026-09-30' };
  const CLOSE_NOTE = { 'm-blush-mochi-launch': 'All invoices in — the launch sold ahead of the target; Mochi #02 carried the line.', 'm-songkran-lip-splash': 'Short Songkran push closed — the late KOL invoice is in.',
    'm-summer-sun-shield': 'All invoices in — sales below the target after the rainy June; the ADS stopped on time.' };
  const dcache = new Map();
  function data(today) {
    const SC = window.CP_MOCK_SCENARIO || { campaigns: [] }, hit = dcache.get(today); if (hit && hit.sc === SC) return hit.d;
    const base = seed(today), A = SC.approval || {}, appr = A.approver || 'Ann', list = [], plans = {}, extra = [];
    const people = (SC.people || []).map(p => ({ id: p.id, name: p.name, role: p.role, dept: p.dept || '', active: true }));
    const at = (d, t) => `${d}T${t || '10:00:00'}`, before = (d, n, lim) => { const x = R.addDays(d, -n), y = R.addDays(today, -lim); return x < y ? x : y; };
    /* the master: one product a name — the first Campaign that sells it gives its code, COGS and price (a draft of a later Campaign uses the same code) */
    const master = new Map(), soon = R.addDays(today, 92);
    const toMaster = (p, c) => { if (master.has(p.name)) return master.get(p.name);
      const npd = c.start > today && c.start <= soon, m = { code: p.code, barcode: ean(p.code), name: p.name, nickname: p.nickname, group: p.group, category: p.category, status: npd ? 'npd' : 'active',
        launch: npd ? c.start : '', cogs: p.cogs, price: price3(p.price), note: '', created_at: at(before(c.start, 75, 30), '09:15:00'), updated_at: at(before(c.start, 60, 20), '11:00:00'), updated_by: 'Admin', rev: 1, history: [] };
      master.set(p.name, m); return m; };
    (SC.campaigns || []).forEach((c, ci) => {
      const camp = base.campaigns.find(x => x.id === c.id), owner = camp.owner, pr = productsOf(c, ci), skus = pr.map((p, k) => skuOf(p, c.channels, 0, k));
      pr.forEach(p => toMaster(p, c));
      /* CR-14 §12.5 — the target of the plan by SKU × sub-channel × month (the rows of the data: Σ by SKU × channel × month the same to the baht) */
      const target = base.sales.filter(r => r.campaign_id === c.id && r.scenario === 'target').map(r => ({ code: r.product_key, channel: r.channel, sub: subIdOf(r.channel, r.sub_channel), month: r.month, qty: r.qty, amount: r.amount }));
      let budget = base.expenses.filter(r => r.campaign_id === c.id && r.scenario === 'budget').map(r => ({ type: r.type, line: r.line, month: r.month, amount: r.amount }));
      const reqs = (SC.requests || {})[c.id] || [];
      reqs.filter(q => q.status === 'approved').forEach(q => q.lines.forEach(l => { const b = budget.find(x => x.type === l.type && x.line === l.line && x.month === l.month);
        if (b) b.amount -= l.amount; else budget.push({ type: l.type, line: l.line, month: l.month, amount: -l.amount }); }));
      budget = budget.filter(b => b.amount);
      const twice = (A.twice || {})[c.id], versions = [];
      if (twice) versions.push({ v: 1, status: 'returned', submitted_at: at(before(c.start, 40, 9)), submitted_by: owner, decided_at: at(before(c.start, 37, 8), '15:30:00'), decided_by: appr, comment: twice,
        details: details(c, LINES[c.line]), skus, target, budget: budget.map(b => Object.assign({}, b, { amount: b.line === 'ADS' ? Math.round(b.amount * 1.15) : b.amount })), forecast: FC(), review: { comment: '' } });
      versions.push({ v: versions.length + 1, status: 'approved', submitted_at: at(before(c.start, twice ? 35 : 30, 7)), submitted_by: owner, decided_at: at(before(c.start, twice ? 33 : 28, 6), '14:00:00'),
        decided_by: appr, comment: '', details: details(c, LINES[c.line]), skus, target, budget, forecast: FC(), review: { comment: '' } });
      const log = [{ at: at(before(c.start, 45, 12), '09:30:00'), by: owner, action: 'created', detail: '' }];
      versions.forEach(v => { log.push({ at: v.submitted_at, by: owner, action: v.v > 1 ? 'resubmitted' : 'submitted', detail: `v${v.v}` }); log.push({ at: v.decided_at, by: appr, action: v.status, detail: `v${v.v}${v.comment ? ' · ' + v.comment : ''}` }); });
      const requests = reqs.map((q, i) => ({ no: i + 1, type: R.requestType(q.lines), status: q.status, reason: q.reason, lines: q.lines.map(l => Object.assign({}, l)), by: q.by, at: q.at,
        decided_by: q.decided_by || null, decided_at: q.decided_at || null, comment: q.comment || '' }));
      requests.forEach(q => { log.push({ at: q.at, by: q.by, action: 'request', detail: `#${q.no} ${q.type} ${R.baht(R.sumLines(q.lines))}` }); if (q.decided_at) log.push({ at: q.decided_at, by: q.decided_by, action: 'request.' + q.status, detail: `#${q.no} ${R.baht(R.sumLines(q.lines))}` }); });
      log.sort((a, b) => a.at.localeCompare(b.at));
      plans[c.id] = { id: c.id, rev: 1, source: 'web', owner, approval: 'approved', versions, requests, log, steps: stepsDone(c, owner, people, versions[versions.length - 1].submitted_at) };
      /* CR-13 §5.5 (D125) — closed by the Executive: the 2025 campaigns (End + 20 days) · Summer Sun Shield (30/09/2026) — an approved close request, nothing waiting ·
         the unused budget written down, not released (D120) · Airy Kiss Tint stays Ended · to close */
      const cdays = CLOSED[c.id], cAt = cdays == null ? null : typeof cdays === 'number' ? R.addDays(c.end, cdays) : cdays;
      if (cAt && cAt < today && !c.cancelled) {
        const cur = budget.reduce((t, b) => t + b.amount, 0) + reqs.filter(q => q.status === 'approved').reduce((t, q) => t + q.lines.reduce((u, l) => u + l.amount, 0), 0),
          spent = base.expenses.filter(r => r.campaign_id === c.id && r.scenario === 'actual').reduce((t, r) => t + (r.amount || 0), 0), unused = Math.max(0, Math.round(cur - spent)), no = requests.length + 1;
        const note = CLOSE_NOTE[c.id] || 'Closed — all invoices in.', sentAt = at(R.addDays(cAt, -3), '10:30:00'), doneAt = at(cAt, '16:00:00');
        requests.push({ no, type: 'close', status: 'approved', reason: note, lines: [], close: { early: false, close_date: null, note, checks: { unused, sure: true } }, by: owner, at: sentAt, decided_by: appr, decided_at: doneAt, comment: '' });
        plans[c.id].closure = { status: 'closed', closed_at: doneAt, closed_by: appr, note, unused, early: false, req: no };
        log.push({ at: sentAt, by: owner, action: 'close', detail: `#${no} ${R.reqWords(requests[requests.length - 1])}` }, { at: doneAt, by: appr, action: 'closed', detail: `#${no} ${R.reqWords(requests[requests.length - 1])}` });
        log.sort((a, b) => a.at.localeCompare(b.at));
      }
      list.push(listRow(camp));
    });
    (SC.drafts || []).forEach((d, di) => {
      const ci = (SC.campaigns || []).length + di, pr = productsOf(d, ci);
      /* a product the master has: its code · COGS · net price (the plan's snapshot) — the draft's ECOM price is a promo (−8%, skuOf) */
      pr.forEach(p => { const m = toMaster(p, d); p.code = p.key = m.code; p.cogs = m.cogs; p.price = +m.price.MT; });
      const tgt0 = targetsOf(d, pr, SC), bud = d.mkt_budget || d.sls_budget ? budgetsOf(d, tgt0, SC) : [], tgt = splitTT(tgt0);
      const skus = pr.map((p, k) => skuOf(p, d.channels, 0.92, k)); if (d.incomplete && skus[1]) skus[1].price.ECOM = '';
      const lastCode = skus.length ? skus[skus.length - 1].code : null;
      const target = tgt.filter(r => !(d.incomplete && r.product_key === lastCode)).map(r => ({ code: r.product_key, channel: r.channel, sub: subIdOf(r.channel, r.sub_channel), month: r.month, qty: r.qty }));
      const budget = bud.concat(d.oth_budget ? othersOf(d, tgt0, SC) : []).map(r => ({ type: r.type, line: r.line, month: r.month, amount: r.amount }));
      const camp = { id: d.id, name: d.name, start: d.start, end_marketing: d.end_marketing || null, end: d.end, status: 'ongoing', year: +d.start.slice(0, 4), note: null,
        created_at: at(d.created, '09:00:00'), updated_at: d.decided || d.submitted || at(d.created, '09:00:00'), owner: d.owner, plan: 'web' };
      const v = { v: 1, status: d.approval, submitted_at: d.submitted || null, submitted_by: d.submitted ? d.owner : null, decided_at: d.decided || null, decided_by: d.decided ? appr : null, comment: d.comment || '',
        details: details(d, LINES[d.line]), skus, target, budget, forecast: d.approval === 'draft' ? Object.assign(FC(), { comment: '' }) : FC(), review: { comment: d.submitted ? 'All steps done — please approve.' : '' } };
      /* the steps (CR-07 §10): sent ones = every step done · a returned one = its steps back · a draft = as the scenario says */
      const steps = d.submitted ? stepsDone(d, d.owner, people, d.submitted) : R.newStepsV1(d.start, d.owner, people);
      delete steps.env;   /* CR-13 — made before the envelope step */
      if (!d.submitted) Object.entries(d.steps || {}).forEach(([k, s2]) => { const s = steps[k]; s.status = s2; if (s2 === 'done') Object.assign(s, { done_at: `${R.addDays(today, -6)}T15:00:00`, by: s.assignee }); });
      if (d.due3 != null) steps['3'].due = R.addDays(today, d.due3);
      if (d.approval === 'returned') { (d.revise || []).forEach(k => { steps[k].status = 'returned'; steps[k].done_at = null; }); Object.assign(steps['5'], { status: 'in_progress', refresh: true, done_at: null }); Object.assign(steps['6'], { status: 'not_started', done_at: null }); }
      const log = [{ at: at(d.created, '09:00:00'), by: d.owner, action: 'created', detail: '' }, { at: at(d.created, '17:20:00'), by: d.owner, action: 'saved', detail: 'v1' }];
      if (d.submitted) log.push({ at: d.submitted, by: d.owner, action: 'submitted', detail: 'v1' });
      if (d.decided) log.push({ at: d.decided, by: appr, action: d.approval, detail: `v1${d.comment ? ' · ' + d.comment : ''}` });
      if (d.approval === 'returned') log.push({ at: d.decided, by: appr, action: 'revise', detail: `v1 · ${(d.revise || []).map(k => R.STEP_NAMES[k] || k).join(' · ')} · ${d.comment}` });
      plans[d.id] = { id: d.id, rev: 1, source: 'web', owner: d.owner, approval: d.approval, versions: [v], requests: [], log, steps };
      extra.push(camp); list.push(listRow(camp));
    });
    MORE.forEach(x => { const [code, nickname, name, group, category, status, pr, cogs, launch, bc, note] = x;
      master.set(name, { code, barcode: bc === null ? '' : bc || (status === 'npd' ? '' : ean(code)), name, nickname, group, category, status, launch: launch || '', cogs, price: price3(pr), note: note || '',
        created_at: at(R.addDays(today, -40 - (hash(code) % 60)), '09:15:00'), updated_at: at(R.addDays(today, -3 - (hash(code + 'u') % 30)), '11:00:00'), updated_by: 'Admin', rev: 1, history: [] }); });
    /* CR-14 §5.3 — standard prices by sub-channel: samples on products of no Campaign only (M9001 – M9004 — no number of the story moves) */
    const SUBP = { M9001: { 'mt-7eleven': 179, 'tt-dealer': 132, 'tt-wholesale': 123 }, M9002: { 'mt-7eleven': 139, 'ecom-shopee': 139 }, M9003: { 'mt-watsons': 279, 'tt-dealer': 202, 'tt-wholesale': 189 }, M9004: { 'ecom-tiktok': 259, 'ecom-lazada': 265 } };
    [...master.values()].forEach(m => { m.subPrice = Object.assign({}, SUBP[m.code] || {}); if (SUBP[m.code]) { if (m.code === 'M9001' || m.code === 'M9003') m.price.TT = SUBP[m.code]['tt-dealer']; } });
    /* CR-14 §12.5 · §5.4 — a temporary SKU (no ERP code yet) in the draft of Songkran Glow 2027 */
    const sg = plans['m-songkran-glow-2027'], sg0 = sg && sg.versions[0].skus[0];
    if (sg0) { const tmp = { code: 'TMP-0001', barcode: '', name: 'Glow Palette #04 Sunset 9 g', nickname: 'Glow Palette #04', group: sg0.group, category: sg0.category, status: 'temp', launch: '', cogs: 78, price: price3(259), subPrice: {},
        note: 'Temporary — waiting for its ERP code', created_at: at(R.addDays(today, -5), '10:20:00'), updated_at: at(R.addDays(today, -5), '10:20:00'), updated_by: sg.owner, rev: 1, history: [] };
      master.set(tmp.name, tmp); sg.versions[0].skus.push({ code: tmp.code, name: tmp.name, nickname: tmp.nickname, group: tmp.group, category: tmp.category, cogs: tmp.cogs, role: 'core', temp: true,
        price: Object.fromEntries(R.CHANNELS.map(k => [k, Object.keys(sg0.price || {}).includes(k) && sg0.price[k] !== '' ? 259 : ''])) }); }
    const d = { seed: Object.assign({}, base, { campaigns: base.campaigns.concat(extra) }), list: { rows: list }, plans, people, products: [...master.values()], subchannels: subsSeed(), actor: SC.actor || 'Ann' };
    dcache.set(today, { sc: SC, d });
    return d;
  }
  /* D59 — the expense lines a budget can use (were data/expense_lines.csv): the scenario's lines first, then the others of the list */
  function lines() { const SC = window.CP_MOCK_SCENARIO || {}, L = SC.lines || {};
    const one = (t, own) => [...new Set(Object.keys(own || {}).concat(L[t] || []))];
    return { marketing: one('marketing', SC.marketingLines), sales: one('sales', SC.salesLines), other: one('other', SC.otherLines) }; }
  return { seed, data, lines, hash, prng, LINES, subsSeed, subIdOf };
})();

/* ===================== CR-06 · D52 — the demo's data of this browser → CP.store =====================
   The made-up data (CP.mock.data) + what was clicked, kept in localStorage charmiss_campaign_pnl_mockstate { list, plans, expenses, people, products } —
   never shared with another person or computer · Reset demo data (the Acting as menu) removes it and the made-up data comes back (the anchor of CR-04).
   §4.3 of CR-05 — before a write the saved copy is read again: its rev (expenses: the rows) ≠ what the page has → nothing is written, the page takes the
   saved copy and the save fails with 'conflict' (another tab of this browser wrote first). */
CP.store = (function () {
  'use strict';
  const R = CP.rules, KEY = 'charmiss_campaign_pnl_mockstate';
  const err = (code, extra) => Object.assign(new Error(code), { code }, extra || {});
  let st = null, gen = 0;
  const bump = () => { gen++; document.dispatchEvent(new CustomEvent('cp:plans')); };
  const base = () => CP.mock.data(CP.ui.today());
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  /* the demo as it is now: the made-up data + what was clicked (kept until a write here or in another tab) */
  function data() {
    const b = base(); if (st && st.base === b) return st;
    const s = read(), list = s.list ? { updated_at: s.list.updated_at || null, rows: s.list.rows } : b.list, seed = s.list ? R.applyList(b.seed, list) : b.seed;
    /* QA-v0.13 P9 — every plan read through R.migratePlan (a plan saved before CR-13 gets its envelope step) */
    const camp = campOf(seed), plans = Object.assign({}, b.plans, s.plans || {}), td = CP.ui.today();
    R.SUBS = s.subchannels || b.subchannels || [];
    Object.keys(plans).forEach(id => { plans[id] = R.migratePlan(plans[id], camp(id), td); });
    /* QA-v0.13 B27 — people saved by v0.13.0 lost their department: it comes back from the made-up list (same id or name) */
    const people = s.people ? s.people.map(p => (p.dept !== undefined ? p : Object.assign({}, p, { dept: ((b.people || []).find(x => x.id === p.id || x.name === p.name) || {}).dept || '' }))) : b.people;
    st = { base: b, list, seed, plans, people, products: s.products || b.products, subchannels: R.SUBS, actor: b.actor };
    return st;
  }
  const campOf = seed => { const m = new Map(); (seed.allCampaigns || []).concat(seed.campaigns || []).forEach(c => { if (!m.has(c.id)) m.set(c.id, c); }); return id => m.get(id) || null; };
  function write(f) { const s = read(); f(s); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { throw err('denied', { cause: e }); } st = null; bump(); }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ } st = null; bump(); }
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) { st = null; bump(); } });
  const revOf = p => (p ? p.rev || 0 : null);

  /* a step on one plan · step(plan) → the new plan · o.create = the plan when there is none yet (New campaign) · o.rev = the rev the page worked on */
  async function savePlan(id, step, o = {}) {
    const saved = (read().plans || {})[id] || base().plans[id] || null, mine = data().plans[id] || null, known = o.rev != null ? o.rev : revOf(mine);
    if ((saved || known != null) && revOf(saved) !== known) { st = null; bump(); throw err('conflict', { id }); }
    const b0 = saved || o.create; if (!b0) throw err('invalid', { errors: { plan: 'no plan' } });
    const b = R.migratePlan(b0, campOf(data().seed)(id), CP.ui.today());
    const next = step(R.clonePlan(b)); next.rev = (b.rev || 0) + 1;
    write(s => { s.plans = Object.assign({}, s.plans, { [id]: next }); });
    return next;
  }
  /* Admin — the people of the demo */
  async function savePeople(rows) {
    /* QA-v0.13 B27 — the department is kept (a plan's steps go to the people of a department) · at least one active person of Brand stays */
    const clean = rows.map(r => ({ id: r.id || R.campaignId(r.name, []), name: String(r.name || '').trim(), role: R.roleKey(r.role), dept: R.DEPTS.includes(r.dept) ? r.dept : '', active: r.active !== false })).filter(r => r.name);
    if (!clean.some(r => r.active && r.dept === 'brand')) throw err('invalid', { errors: { people: 'brand' } });
    write(s => { s.people = clean; }); return clean;
  }
  /* the Campaign list (New · Edit · Cancel · Restore — D48) */
  async function saveList(change, ctx) {
    const rows = data().list.rows.map(r => Object.assign({}, r)), id = change.action === 'add' ? R.campaignId(change.values.campaign, rows, ctx.today) : change.id;
    if (change.action === 'add' || change.action === 'edit') {
      const errors = R.validateCampaign(Object.assign({}, change.values, { name: change.values.campaign }), rows, change.action === 'edit' ? id : null);
      if (Object.keys(errors).length) throw err('invalid', { errors });
    } else if (!rows.some(r => r.id === id)) throw err('invalid', { errors: { name: CP.content.camps.v.gone } });
    const at = R.nowLocal(), res = R.applyChange(rows, Object.assign({}, change, { id }), ctx.today, at);
    write(s => { s.list = { updated_at: at, rows: res.rows }; });
    return { row: res.row };
  }
  /* CR-06 §7 — a step on one product of the master · step(product | null) → the product (null = deleted) · o.rev = the rev the drawer opened with ·
     o.create = a new one (its code must not be taken) */
  async function saveProduct(code, step, o = {}) {
    const all = (read().products || base().products).map(p => Object.assign({}, p)), k = String(code).toLowerCase(), i = all.findIndex(p => p.code.toLowerCase() === k);
    if (o.create ? i >= 0 : i < 0 || (o.rev != null && revOf(all[i]) !== o.rev)) { st = null; bump(); throw err(o.create ? 'exists' : 'conflict', { code }); }
    const next = step(o.create ? null : JSON.parse(JSON.stringify(all[i])));
    if (next) { next.rev = (o.create ? 0 : all[i].rev || 0) + 1; if (o.create) all.push(next); else all[i] = next; } else all.splice(i, 1);
    write(s => { s.products = all; });
    return next;
  }
  /* CR-14 §5.2 — a sub-channel of the master (Admin): add · rename · order · on / off — a rev guards a save over another tab */
  async function saveSubchannel(id, step, o = {}) {
    const all = (read().subchannels || base().subchannels).map(x => Object.assign({}, x)), i = all.findIndex(x => x.id === id);
    if (o.create ? i >= 0 : i < 0 || (o.rev != null && (all[i].rev || 0) !== o.rev)) { st = null; bump(); throw err(o.create ? 'exists' : 'conflict', { id }); }
    const next = step(o.create ? null : Object.assign({}, all[i])); if (next) { next.rev = (o.create ? 0 : all[i].rev || 0) + 1; if (o.create) all.push(next); else all[i] = next; } else all.splice(i, 1);
    write(s => { s.subchannels = all; }); return next;
  }
  /* CR-14 §5.4 (D132) — a temporary SKU gets its real code: (a) an existing product → the temporary row is Merged into it · (b) a new code → it becomes a
     product of that code (NPD) · every plan using it: the code changed (sku.link · one history line each) */
  async function linkTemp(from, to, o = {}) {
    const d = data(), prods = (read().products || base().products).map(x => Object.assign({}, x)), i = prods.findIndex(x => x.code === from); if (i < 0) throw err('invalid', { errors: { code: from } });
    const exist = prods.find(x => x.code.toLowerCase() === String(to).toLowerCase() && x.code !== from), at = o.at || R.nowLocal(), by = o.by || '';
    if (o.mode === 'new' && exist) throw err('exists', { code: to });
    if (o.mode === 'existing' && !exist) throw err('invalid', { errors: { code: to } });
    const tmp = prods[i], real = exist ? exist.code : to;
    if (exist) Object.assign(prods[i], { status: 'merged', mergedInto: real, updated_at: at, updated_by: by, rev: (tmp.rev || 0) + 1 });
    else Object.assign(prods[i], { code: real, status: 'npd', updated_at: at, updated_by: by, rev: (tmp.rev || 0) + 1, history: (tmp.history || []).concat([{ at, by, what: `${from} → ${real}` }]) });
    const sku = exist ? { name: exist.name, nickname: exist.nickname, group: exist.group, category: exist.category } : {};
    const plans = {}; Object.entries(d.plans).forEach(([id, p]) => { if ((p.versions || []).some(v => (v.skus || []).some(x => x.code === from))) { const n = R.planAct(R.clonePlan(p), { type: 'sku.link', from, to: real, sku, by, at }); n.rev = (p.rev || 0) + 1; plans[id] = n; } });
    write(s => { s.products = prods; s.plans = Object.assign({}, s.plans, plans); });
    return { code: real, plans: Object.keys(plans) };
  }
  /* the next code of a temporary SKU: TMP- + the highest number + 1 */
  const nextTemp = () => { const n = Math.max(0, ...(data().products || []).map(x => (/^TMP-(\d+)$/i.exec(x.code) || [])[1]).filter(Boolean).map(Number)); return `TMP-${String(n + 1).padStart(4, '0')}`; };
  return { data, savePlan, savePeople, saveList, saveProduct, saveSubchannel, linkTemp, nextTemp, resetMock: reset, gen: () => gen, KEY };
})();
