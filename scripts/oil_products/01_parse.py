#!/usr/bin/env python3
"""Parse docs/p/oil_products/raw.pdf (福懋、福壽及泰山油品下游業者清單)
into raw/oil_products/list.json

1150709-12:00 revision: 360 entries; vendors with several products use
merged rows with unnumbered continuation lines. Cells wrap and are even
clipped by the spreadsheet print (e.g. 泰山大豆沙拉油0.6L*12入(新 with
no 版) anywhere in the PDF), and one vendor name overflows into the
product column, so product cells are normalized against the canonical
product names below. Footer notes mark excluded/annotated entries."""
import json
import os
import re

import pdfplumber

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'raw.pdf')
OUT_FILE = os.path.join(BASE, 'raw', 'oil_products', 'list.json')

# canonical 品項 strings as they appear when a cell survives intact;
# wrapped/clipped cells are matched back to these
CANONICAL_PRODUCTS = [
    '金酥耐炸油-18L',
    '沙拉油-18L(泰山)',
    '環保鐵桶沙拉油-18Kg',
    '泰山不飽和大豆沙拉油2.6L*6入(新版)',
    '泰山精選蔬菜油-3L*6',
    '泰山好理調合油-2L*6',
    '泰山好理調合油0.6L*24',
    '泰山大豆沙拉油0.6L*12入(新版)',
    '泰山歐式果實精華調合油1.5L*6入',
    '泰山花生風味調和油2L*6入',
    '沙拉油－塑桶 3L',
    '沙拉油 18Ｌ(福壽)',
    '健味香油 3L',
    '益康大豆沙拉油 18L',
    '益康大豆沙拉油 18KG',
    '益康烹調油(調合油)',
    '一級黃豆油',
    '原油',
]

# footer 備註 on the last page (1150709 revision)
TAGS = {}
NOTES = {}
for seq in (98, 331):
    TAGS[seq] = '整併刪除'
    NOTES[seq] = '與序號96建樹企業有限公司為同一業者，已整併扣除。'
TAGS[199] = '整併刪除'
NOTES[199] = '與序號163同為群用企業有限公司，已整併扣除。'
NOTES[163] = '與序號199同為群用企業有限公司（199已整併扣除）。'
for seq in (104, 243, 298, 345):
    TAGS[seq] = '衛生局刪除'
    NOTES[seq] = '經衛生局回報刪除（未販售該批問題油品給該業者）。'
for seq in (240, 266, 267, 301, 322):
    TAGS[seq] = '飼料用'
    NOTES[seq] = '售作飼料用途。'
TAGS[274] = '非食品用途'
NOTES[274] = ('購買中聯或益康的食品級大豆油，都是作為「環氧大豆油」之用，'
              '用於當環保塑膠容器的增塑劑或是安定劑，並非供「食品烹製用途」。')
NOTES[360] = '單據誤植「誠一食品有限公司」，經衛生局確認實際應為「和香行」，地址品項不變。'


def clean(s):
    return re.sub(r'\s+', ' ', s or '').strip()


def cells(s):
    return [clean(x) for x in (s or '').split('\n') if clean(x)]


def norm(s):
    return re.sub(r'\s+', '', s or '')


NORM_MAP = {norm(p): p for p in CANONICAL_PRODUCTS}


def normalize_product(cell):
    """Return (product, spilled_prefix). Wrapped cells are joined, clipped
    cells matched by unique prefix, and text that overflowed from the
    name column is split off as spilled_prefix."""
    n = norm(cell)
    if not n:
        return None, ''
    if n in NORM_MAP:
        return NORM_MAP[n], ''
    starts = [p for k, p in NORM_MAP.items() if k.startswith(n)]
    if 1 == len(starts):
        return starts[0], ''
    ends = [(k, p) for k, p in NORM_MAP.items() if n.endswith(k) and len(n) > len(k)]
    if 1 == len(ends):
        k, p = ends[0]
        return p, n[:-len(k)]
    print('! unknown product kept verbatim: %r' % cell)
    return clean(cell), ''


entries = []
current = None
with pdfplumber.open(PDF_FILE) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for row in table:
                if not row or len(row) < 6:
                    continue
                seq = clean(row[0])
                if '序號' in seq or '品項' == clean(row[3]):
                    continue  # repeated header row
                m = re.match(r'^(\d+)\*?$', seq)
                county = clean(row[1]).rstrip('*')
                product, spill = normalize_product(row[3])
                batches = cells(row[4])
                expiries = cells(row[5])
                if m:
                    current = {
                        'seq': int(m.group(1)),
                        'counties': [county] if county else [],
                        'name': clean(row[2]) + spill,
                        'products': [product] if product else [],
                        'batches': batches,
                        'expiries': expiries,
                    }
                    entries.append(current)
                elif current is not None and (product or batches):
                    # unnumbered continuation line of a merged row
                    if county and county not in current['counties']:
                        current['counties'].append(county)
                    if product and product not in current['products']:
                        current['products'].append(product)
                    for i, batch in enumerate(batches):
                        if batch in current['batches']:
                            continue
                        current['batches'].append(batch)
                        expiry = expiries[i] if i < len(expiries) else (
                            expiries[-1] if expiries else '')
                        current['expiries'].append(expiry)

entries.sort(key=lambda e: e['seq'])
by_seq = {e['seq']: e for e in entries}

# Entry 296 spans the page 8->9 break: its first product line is printed
# below the last grid rule of page 8, so extract_tables hands it to entry
# 295; the numbered remainder of 296 follows on page 9. Re-attach it.
e295, e296 = by_seq[295], by_seq[296]
if '泰山歐式果實精華調合油1.5L*6入' in e295['products']:
    assert e295['name'] == '原香有限公司' and e296['name'] == '明輝菸酒有限公司', \
        (e295, e296)
    assert e295['products'][-1] == '泰山歐式果實精華調合油1.5L*6入'
    assert e295['batches'][-1] == '2027101301'
    e295['products'].pop()
    e296['products'].insert(0, '泰山歐式果實精華調合油1.5L*6入')
    e296['batches'].insert(0, e295['batches'].pop())
    e296['expiries'].insert(0, e295['expiries'].pop())

for e in entries:
    if e['seq'] in TAGS:
        e['tag'] = TAGS[e['seq']]
    if e['seq'] in NOTES:
        e['note'] = NOTES[e['seq']]

# sanity checks
seqs = [e['seq'] for e in entries]
assert seqs == list(range(1, len(entries) + 1)), 'sequence gap: %s' % [
    s for s in range(1, max(seqs) + 1) if s not in seqs]
for e in entries:
    assert e['counties'] and e['name'] and e['products'], 'incomplete entry: %s' % e
    assert e['batches'], 'batches missing: %s' % e

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)
print('parsed %d entries (%d tagged) -> %s' % (
    len(entries), sum(1 for e in entries if e.get('tag')), OUT_FILE))
