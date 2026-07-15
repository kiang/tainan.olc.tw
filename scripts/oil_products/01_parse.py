#!/usr/bin/env python3
"""Parse docs/p/oil_products/raw.pdf (福壽、福懋及泰山油品下游業者清單)
into raw/oil_products/list.json

1150715 revision: 1006 entries over 51 pages, columns
縣市/序號/業者/品項/批號/有效日期. The 縣市/序號/業者 cells are merged
vertically (a county over hundreds of rows, a vendor over its product
rows) and their text is re-centered in whatever portion of the cell is
visible on a page, so extract_tables() cannot be trusted for those
columns: at page breaks the label lands in the wrong detected cell (or
outside the table) and continuation rows silently attach to the previous
vendor. Instead, both levels are segmented by the horizontal grid rules
that cross the respective column — a rule through the 縣市 column starts
a new county, a rule through the 序號 column starts a new vendor — and
the words inside each span provide the label / seq / name. Product,
batch and expiry cells are taken from extract_tables() rows, assigned to
vendor spans by y position. Unlike the 1150709 revision the product
cells survive intact and there are no footer 備註, so products are kept
verbatim and no tag/note fixups apply."""
import json
import os
import re

import pdfplumber

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'raw.pdf')
OUT_FILE = os.path.join(BASE, 'raw', 'oil_products', 'list.json')

# column boundaries (pt): county 51-79, seq 80-103, name 103-263,
# product/batch/expiry 263-518 (from the table grid's vertical rules)
SEQ_X0, SEQ_X1 = 80, 103
NAME_X1 = 263
COUNTY_RE = re.compile(r'^[一-鿿]{2}[市縣]$')

RULE, WORD, ROW = 0, 1, 2  # event priorities at equal y


def clean(s):
    # the sheet's font maps 一 to the stroke glyph ㇐ (U+31D0); earlier
    # revisions and the product aliases in 04_products.py use plain 一
    return re.sub(r'\s+', ' ', (s or '').replace('㇐', '一')).strip()


def cells(s):
    return [clean(x) for x in (s or '').split('\n') if clean(x)]


def rule_ys(page, x0, x1):
    """y of horizontal rules crossing the column [x0, x1], doubled print
    strokes deduplicated"""
    ys = []
    for e in sorted(page.edges, key=lambda e: e['top']):
        if e['orientation'] != 'h' or e['x0'] > x0 or e['x1'] < x1:
            continue
        if not ys or e['top'] - ys[-1] > 2:
            ys.append(e['top'])
    return ys


entries = []
county_labels = []
county_entries = []
pending = None


def flush_entry():
    global pending
    if pending is None:
        return
    seq, name_words, rows = pending
    pending = None
    if seq is None:
        # span before/above the table or the header row; must hold no data
        assert not rows, 'vendor rows without a 序號: %s' % rows
        return
    lines = {}
    for top, x, text in name_words:
        lines.setdefault(round(top), []).append((x, text))
    name = clean(''.join(' '.join(t for _, t in sorted(ws))
                         for _, ws in sorted(lines.items())))
    entry = {
        'seq': seq,
        'counties': [],
        'name': name,
        'products': [],
        'batches': [],
        'expiries': [],
    }
    for product, batches, expiries in rows:
        if product and product not in entry['products']:
            entry['products'].append(product)
        for i, b in enumerate(batches):
            if b in entry['batches']:
                continue
            entry['batches'].append(b)
            entry['expiries'].append(expiries[i] if i < len(expiries) else (
                expiries[-1] if expiries else ''))
    entries.append(entry)
    county_entries.append(entry)


def flush_county():
    if county_entries:
        assert len(county_labels) == 1, (county_labels, county_entries[0])
        county = county_labels[0].replace('臺', '台')
        for e in county_entries:
            e['counties'] = [county]
    del county_labels[:], county_entries[:]


with pdfplumber.open(PDF_FILE) as pdf:
    for page in pdf.pages:
        events = []
        county_rules = set(rule_ys(page, 60, 75))
        for y in rule_ys(page, SEQ_X0 + 1, SEQ_X1 - 1):
            events.append((y, RULE, y in county_rules))
        for w in page.extract_words():
            y = (w['top'] + w['bottom']) / 2
            if w['x0'] > SEQ_X0 and w['x1'] < SEQ_X1 + 1 \
                    and re.match(r'^\d+$', w['text']):
                events.append((y, WORD, ('seq', int(w['text']))))
            elif w['x1'] < SEQ_X0 and COUNTY_RE.match(w['text']):
                events.append((y, WORD, ('county', w['text'])))
            elif SEQ_X1 <= w['x0'] and w['x1'] < NAME_X1:
                events.append((y, WORD, ('name', (w['top'], w['x0'], w['text']))))
        tables = page.find_tables()
        assert len(tables) == 1, 'expected 1 table, got %d' % len(tables)
        for tr, row in zip(tables[0].rows, tables[0].extract()):
            # nudge into the row body so the row sorts after the rule
            # that doubles as its top border
            events.append((tr.bbox[1] + 3, ROW, row))
        for y, kind, payload in sorted(events, key=lambda e: e[:2]):
            if kind == RULE:
                flush_entry()
                if payload:
                    flush_county()
            elif kind == WORD:
                if pending is None:
                    pending = [None, [], []]
                what, value = payload
                if what == 'seq':
                    assert pending[0] is None, 'two 序號 in one span: %s %s' % (
                        pending[0], value)
                    pending[0] = value
                elif what == 'county':
                    county_labels.append(value)
                else:
                    pending[1].append(value)
            else:
                product, batch, expiry = (clean(payload[-3]),
                                          cells(payload[-2]),
                                          cells(payload[-1]))
                if product == '品項' or not (product or batch):
                    continue  # header or blank row
                if pending is None:
                    pending = [None, [], []]
                pending[2].append((product, batch, expiry))
flush_entry()
flush_county()

entries.sort(key=lambda e: e['seq'])

# sanity checks
seqs = [e['seq'] for e in entries]
assert seqs == list(range(1, len(entries) + 1)), 'sequence gap: %s' % [
    s for s in range(1, max(seqs) + 1) if s not in seqs]
for e in entries:
    assert e['counties'] and e['name'] and e['products'], 'incomplete entry: %s' % e
    assert e['batches'] and len(e['batches']) == len(e['expiries']), \
        'batch/expiry mismatch: %s' % e

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)
print('parsed %d entries in %d counties -> %s' % (
    len(entries), len(set(c for e in entries for c in e['counties'])), OUT_FILE))
