#!/usr/bin/env python3
"""Parse docs/p/oil_products/raw.pdf (福懋、福壽及泰山油品下游業者清單)
into raw/oil_products/list.json

2026-07-06 revision: 360 rows, one row per vendor, with 批號/有效日期
columns. The 103 vendors added in this revision are highlighted with an
orange background (footnote 2), drawn as merged fill rects spanning
contiguous rows."""
import json
import os
import re

import pdfplumber

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'raw.pdf')
OUT_FILE = os.path.join(BASE, 'raw', 'oil_products', 'list.json')

ORANGE = (1.0, 0.753, 0.0)

# footnote 1 on the last page
NOTES = {
    274: '購買中聯或益康的食品級大豆油，都是作為「環氧大豆油」之用，'
         '用於當環保塑膠容器的增塑劑或是安定劑，並非供「食品烹製用途」。',
}


def clean(s):
    return re.sub(r'\s+', ' ', s or '').strip()


def cells(s):
    """split a multi-value cell (newline separated) into a clean list"""
    return [clean(x) for x in (s or '').split('\n') if clean(x)]


entries = []
with pdfplumber.open(PDF_FILE) as pdf:
    for page in pdf.pages:
        highlights = [
            (r['top'], r['bottom']) for r in page.rects
            if r.get('fill') and r.get('non_stroking_color') == ORANGE
        ]
        for table in page.find_tables():
            rows = table.rows
            extracted = table.extract()
            for row_obj, row in zip(rows, extracted):
                if not row or len(row) < 6:
                    continue
                seq = clean(row[0])
                m = re.match(r'^(\d+)\*?$', seq)
                if not m:
                    continue
                center = (row_obj.bbox[1] + row_obj.bbox[3]) / 2
                is_new = any(top <= center <= bottom for top, bottom in highlights)
                batches = cells(row[4])
                expiries = cells(row[5])
                entry = {
                    'seq': int(m.group(1)),
                    'counties': [clean(row[1])],
                    'name': clean(row[2]),
                    'products': [clean(row[3])],
                    'batches': batches,
                    'expiries': expiries,
                }
                if is_new:
                    entry['new'] = True
                if entry['seq'] in NOTES:
                    entry['note'] = NOTES[entry['seq']]
                entries.append(entry)

entries.sort(key=lambda e: e['seq'])

# sanity checks
seqs = [e['seq'] for e in entries]
assert seqs == list(range(1, len(entries) + 1)), 'sequence gap: %s' % [
    s for s in range(1, max(seqs) + 1) if s not in seqs]
for e in entries:
    assert e['counties'][0] and e['name'] and e['products'][0], \
        'incomplete entry: %s' % e

new_count = sum(1 for e in entries if e.get('new'))
os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)
print('parsed %d entries (%d new) -> %s' % (len(entries), new_count, OUT_FILE))
