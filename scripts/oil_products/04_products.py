#!/usr/bin/env python3
"""Extract product photos and batch data from docs/p/oil_products/products.pdf.

The PDF pages are flattened images (no text layer), one page per oil
company, each holding a bordered table: product names / photos / batch
codes / expiry dates. Column grid lines are detected from the crisp
batch-code row, photo cells (which may merge several batch columns) are
cropped by known column groups, and the batch/expiry values — verified
visually against high-resolution renders — are hardcoded below.

Output:
  docs/p/oil_products/images/<id>.jpg   product photos
  docs/p/oil_products/data/products.json
"""
import json
import os
import subprocess
import tempfile

import numpy as np
from PIL import Image

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'products.pdf')
IMG_DIR = os.path.join(BASE, 'docs', 'p', 'oil_products', 'images')
OUT_FILE = os.path.join(BASE, 'docs', 'p', 'oil_products', 'data', 'products.json')

DPI = 300

# per page: y-band (height fractions) of the batch-code row used for grid
# detection, y-band of the photo row, and the products with their column
# group (0-based indexes into the detected column list, [start, end]).
# aliases are the exact 品項 strings used in the vendor list (list.json).
PAGES = [
    {
        'page': 1,
        'company': '泰山企業股份有限公司',
        'batch_band': (0.665, 0.75),
        'photo_band': (0.345, 0.655),
        'products': [
            {'id': 'ts_fry_18l', 'name': '泰山金酥耐炸油 18L', 'cols': [1, 2],
             'batches': [{'code': '20270408', 'expiry': '2027.04.08'}],
             'aliases': ['金酥耐炸油-18L']},
            {'id': 'ts_salad_18l', 'name': '泰山沙拉油 18L', 'cols': [2, 3],
             'batches': [{'code': '20270409', 'expiry': '2027.04.09'}],
             'aliases': ['沙拉油-18L(泰山)']},
            {'id': 'ts_iron_18kg', 'name': '泰山環保鐵桶沙拉油 18KG', 'cols': [3, 4],
             'batches': [{'code': '20270409', 'expiry': '2027.04.09'}],
             'aliases': ['環保鐵桶沙拉油-18Kg']},
            {'id': 'ts_unsat_26', 'name': '泰山不飽和大豆沙拉油 2.6L*6入(新版)', 'cols': [4, 5],
             'batches': [{'code': '20270409', 'expiry': '2027.04.09'}],
             'aliases': ['泰山不飽和大豆沙拉油2.6L*6入(新版)']},
            {'id': 'ts_veg_3l', 'name': '泰山精選蔬菜油 3L*6', 'cols': [5, 6],
             'batches': [{'code': '20270725d', 'expiry': '2027.07.25'}],
             'aliases': ['泰山精選蔬菜油-3L*6']},
        ],
    },
    {
        'page': 2,
        'company': '泰山企業股份有限公司',
        'batch_band': (0.665, 0.75),
        'photo_band': (0.345, 0.655),
        'products': [
            {'id': 'ts_haoli_2l', 'name': '泰山好理調合油 2L*6', 'cols': [1, 2],
             'batches': [{'code': '20270725d', 'expiry': '2027.07.25'}],
             'aliases': ['泰山好理調合油-2L*6']},
            {'id': 'ts_soy_06', 'name': '泰山大豆沙拉油 0.6L*12入(新版)', 'cols': [2, 3],
             'batches': [{'code': '20270413E', 'expiry': '2027.04.13'}],
             'aliases': ['泰山大豆沙拉油0.6L*12入(新版)']},
            {'id': 'ts_euro_15', 'name': '泰山歐式果實精華調合油 1.5L*6入', 'cols': [3, 4],
             'batches': [{'code': '20271013', 'expiry': '2027.10.13'}],
             'aliases': ['泰山歐式果實精華調合油1.5L*6入']},
            {'id': 'ts_haoli_06', 'name': '泰山好理調合油 0.6L*24', 'cols': [4, 5],
             'batches': [{'code': '20270725f', 'expiry': '2027.07.25'}],
             'aliases': []},
            {'id': 'ts_peanut_2l', 'name': '泰山花生風味調和油 2L*6', 'cols': [5, 6],
             'batches': [{'code': '20271009', 'expiry': '2027.10.09'}],
             'aliases': ['泰山花生風味調和油2L*6入']},
        ],
    },
    {
        'page': 3,
        'company': '福壽實業股份有限公司',
        'batch_band': (0.615, 0.665),
        'photo_band': (0.34, 0.605),
        'products': [
            {'id': 'fs_3l', 'name': '福壽大豆沙拉油 3L', 'cols': [1, 3],
             'batches': [{'code': 'C1140426K', 'expiry': '2027.04.13'},
                         {'code': 'C1160426K', 'expiry': '2027.04.15'}],
             'aliases': ['沙拉油－塑桶 3L']},
            {'id': 'fs_18l', 'name': '福壽大豆沙拉油 18L', 'cols': [3, 10],
             'batches': [{'code': 'C2140426O', 'expiry': '2027.04.13'},
                         {'code': 'C2140426P', 'expiry': '2027.04.13'},
                         {'code': 'C2150426O', 'expiry': '2027.04.14'},
                         {'code': 'C2150426P', 'expiry': '2027.04.14'},
                         {'code': 'C2160426O', 'expiry': '2027.04.15'},
                         {'code': 'C2160426P', 'expiry': '2027.04.15'},
                         {'code': 'C2210426O', 'expiry': '2027.04.20'}],
             'aliases': ['沙拉油 18Ｌ(福壽)']},
            {'id': 'fs_sesame', 'name': '福壽健味香油 3L', 'cols': [10, 12],
             'batches': [{'code': 'BL240426L', 'expiry': '2028.04.19'},
                         {'code': 'BL150426L', 'expiry': '2028.04.05'}],
             'aliases': ['健味香油 3L']},
        ],
    },
    {
        'page': 4,
        'company': '福懋油脂股份有限公司',
        'batch_band': (0.615, 0.665),
        'photo_band': (0.34, 0.605),
        'products': [
            {'id': 'fm_yk_18l', 'name': '益康大豆沙拉油 18L', 'cols': [1, 3],
             'batches': [{'code': '20270410000407', 'expiry': '2027.04.10'},
                         {'code': '20270411000408', 'expiry': '2027.04.11'}],
             'aliases': ['益康大豆沙拉油 18L']},
            {'id': 'fm_yk_18kg', 'name': '益康大豆沙拉油 18KG', 'cols': [3, 4],
             'batches': [{'code': '20270413000408', 'expiry': '2027.04.13'}],
             'aliases': ['益康大豆沙拉油 18KG']},
            {'id': 'fm_yk_cook', 'name': '益康烹調油 18L', 'cols': [4, 6],
             'batches': [{'code': '20270413000403', 'expiry': '2027.04.13'},
                         {'code': '20270414000403', 'expiry': '2027.04.14'}],
             'aliases': ['益康烹調油(調合油)']},
            # cols 6/7 are the adjacent right/left edges of the two tables
            {'id': 'fm_bulk', 'name': '一級黃豆油(散裝)', 'cols': [7, 10],
             'batches': [{'code': '202604081315', 'expiry': '2026.10.04'},
                         {'code': '202604101315', 'expiry': '2026.10.04'},
                         {'code': '202604091315', 'expiry': '2026.10.04'}],
             'aliases': ['一級黃豆油']},
        ],
    },
]


def detect_columns(gray, band):
    """x positions of vertical grid lines within a y-band, plus image edge"""
    h, w = gray.shape
    y0, y1 = int(h * band[0]), int(h * band[1])
    dark = (gray[y0:y1, :] < 180).mean(axis=0)
    runs = []
    for x in np.where(dark > 0.8)[0]:
        if runs and x - runs[-1][-1] <= 4:
            runs[-1].append(x)
        else:
            runs.append([x])
    xs = [int(np.mean(r)) for r in runs]
    if w - 1 - xs[-1] > 40:  # table runs to the page edge (pages 1-2)
        xs.append(w - 1)
    return xs


def trim_white(img, pad=8):
    """crop away near-white margins"""
    a = np.asarray(img.convert('L'))
    mask = a < 235
    if not mask.any():
        return img
    ys, xs = np.where(mask)
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad),
           min(img.width, xs.max() + pad), min(img.height, ys.max() + pad))
    return img.crop(box)


os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)

products = []
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['pdftoppm', '-png', '-r', str(DPI), PDF_FILE,
                    os.path.join(tmp, 'page')], check=True)
    for conf in PAGES:
        img = Image.open(os.path.join(tmp, 'page-%d.png' % conf['page']))
        gray = np.asarray(img.convert('L'))
        h = gray.shape[0]
        xs = detect_columns(gray, conf['batch_band'])
        y0, y1 = int(h * conf['photo_band'][0]), int(h * conf['photo_band'][1])
        for prod in conf['products']:
            c0, c1 = prod['cols']
            assert c1 < len(xs) + 1, '%s: column %d not detected (%s)' % (
                prod['id'], c1, xs)
            cell = img.crop((xs[c0] + 4, y0, xs[c1] - 4, y1))
            cell = trim_white(cell)
            out = os.path.join(IMG_DIR, prod['id'] + '.jpg')
            cell.convert('RGB').save(out, quality=85)
            products.append({
                'id': prod['id'],
                'company': conf['company'],
                'name': prod['name'],
                'image': 'images/' + prod['id'] + '.jpg',
                'batches': prod['batches'],
                'aliases': prod['aliases'],
            })

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump({'source': 'products.pdf', 'products': products},
              f, ensure_ascii=False, indent=2)
print('extracted %d products -> %s' % (len(products), OUT_FILE))
