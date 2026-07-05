#!/usr/bin/env python3
"""Parse docs/p/oil_products/raw.pdf (福懋、福壽及泰山油品下游業者清單)
into raw/oil_products/list.json"""
import json
import os
import re

import pdfplumber

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'raw.pdf')
OUT_FILE = os.path.join(BASE, 'raw', 'oil_products', 'list.json')


def clean(s):
    return re.sub(r'\s+', ' ', s or '').strip()


entries = []
current = None
with pdfplumber.open(PDF_FILE) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for row in table:
                if not row or len(row) < 4:
                    continue
                seq = clean(row[0])
                county = clean(row[1])
                name = clean(row[2])
                product = clean(row[3])
                if re.match(r'^\d+$', seq):
                    current = {
                        'seq': int(seq),
                        'counties': [county] if county else [],
                        'name': name,
                        'products': [product] if product else [],
                    }
                    entries.append(current)
                elif current is not None:
                    # continuation row of a merged cell span
                    if county and county not in current['counties']:
                        current['counties'].append(county)
                    if product and product not in current['products']:
                        current['products'].append(product)

entries.sort(key=lambda e: e['seq'])

# Entry 126 (金食在食材有限公司) spans the page 3->4 break, so its header
# cell is not captured by extract_tables(); its product rows get appended
# to entry 125. Grid rules on page 3 show entry 125 owns only the first
# product. Re-split explicitly, verified by assertions below.
seqs = [e['seq'] for e in entries]
if 126 not in seqs:
    e125 = next(e for e in entries if e['seq'] == 125)
    assert e125['name'] == '鴻昌商行倉庫' and len(e125['products']) == 5, e125
    entries.append({
        'seq': 126,
        'counties': ['臺中市'],
        'name': '金食在食材有限公司',
        'products': e125['products'][1:],
    })
    e125['products'] = e125['products'][:1]
    entries.sort(key=lambda e: e['seq'])
    seqs = [e['seq'] for e in entries]

# sanity checks
assert seqs == list(range(1, len(entries) + 1)), 'sequence gap: %s' % [
    s for s in range(1, max(seqs) + 1) if s not in seqs]
for e in entries:
    assert e['counties'] and e['name'] and e['products'], 'incomplete entry: %s' % e

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)
print('parsed %d entries -> %s' % (len(entries), OUT_FILE))
