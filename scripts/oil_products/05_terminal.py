#!/usr/bin/env python3
"""Parse docs/p/oil_products/terminal_products.pdf (232項產品清單 115.7.7)
into docs/p/oil_products/data/terminal_products.json

Terminal food products made with the affected oils, keyed back to the
vendor sequence numbers of the downstream vendor list (raw.pdf)."""
import json
import os
import re

import pdfplumber

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'terminal_products.pdf')
LIST_FILE = os.path.join(BASE, 'raw', 'oil_products', 'list.json')
OUT_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'data', 'terminal_products.json')


def clean(s):
    return re.sub(r'\s+', ' ', s or '').strip()


title = None
updated = None
vendors = {}
with pdfplumber.open(PDF_FILE) as pdf:
    head = (pdf.pages[0].extract_text() or '').split('\n')
    title = clean(head[0])
    for line in head[:5]:
        if '更新日期' in line:
            updated = clean(line).strip('()（）')
            break
    for page in pdf.pages:
        for table in page.extract_tables():
            for row in table:
                if not row or len(row) < 5:
                    continue
                seq = clean(row[0])
                if not re.match(r'^\d+$', seq):
                    continue
                seq = int(seq)
                vendor = vendors.setdefault(seq, {
                    'seq': seq,
                    'county': clean(row[1]),
                    'name': clean(row[2]),
                    'products': [],
                })
                product = {
                    'seq': int(clean(row[3])),
                    'name': clean(row[4]),
                }
                if len(row) >= 6 and clean(row[5]):
                    product['expiry'] = clean(row[5])
                vendor['products'].append(product)

# cross-check vendor names against the downstream list; long names get
# wrapped in the PDF cell, so compare ignoring whitespace and keep the
# authoritative name from list.json
main_list = {e['seq']: e for e in json.load(open(LIST_FILE, encoding='utf-8'))}
for seq, vendor in vendors.items():
    entry = main_list.get(seq)
    assert entry, 'vendor seq %d not in list.json' % seq
    assert re.sub(r'\s+', '', entry['name']) == re.sub(r'\s+', '', vendor['name']), \
        'name mismatch at %d: %s / %s' % (seq, entry['name'], vendor['name'])
    vendor['name'] = entry['name']

out = sorted(vendors.values(), key=lambda v: v['seq'])
count = sum(len(v['products']) for v in out)
product_seqs = sorted(p['seq'] for v in out for p in v['products'])
assert product_seqs == list(range(1, count + 1)), 'product sequence gap'

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump({'title': title, 'updated': updated, 'vendors': out},
              f, ensure_ascii=False, indent=2)
print('parsed %d products from %d vendors (%s / %s) -> %s' % (
    count, len(out), title, updated, OUT_FILE))
