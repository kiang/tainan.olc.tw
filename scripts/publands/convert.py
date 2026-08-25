#!/usr/bin/env python3
"""
Convert public land KML+XML files into GeoJSON.
Each KML file contains parcels for one section (or sub-section).
Merge all parcels per file into one MultiPolygon.
Match XML metadata by first 4 digits of section ID.
Output: per-district GeoJSON files + an index JSON for the map.
Coordinates trimmed to 6 decimal places.
"""

import glob
import json
import os
import sys
from collections import defaultdict
from lxml import etree
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union
from shapely import set_precision

KML_NS = {'k': 'http://www.opengis.net/kml/2.2'}
SRC_DIR = os.path.expanduser('/home/kiang/下載/D')
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       '../../docs/p/publands/json')


def parse_kml_polygons(kml_path):
    tree = etree.parse(kml_path)
    polygons = []
    for poly_el in tree.findall('.//k:Polygon', KML_NS):
        coords_el = poly_el.find('.//k:outerBoundaryIs/k:LinearRing/k:coordinates', KML_NS)
        if coords_el is None or not coords_el.text:
            continue
        pts = []
        for c in coords_el.text.strip().split():
            parts = c.split(',')
            if len(parts) >= 2:
                pts.append((float(parts[0]), float(parts[1])))
        if len(pts) >= 4:
            try:
                p = Polygon(pts)
                if p.is_valid and not p.is_empty:
                    polygons.append(p)
            except Exception:
                pass
    return polygons


def parse_xml_metadata(xml_path, sect_id):
    if not os.path.exists(xml_path):
        return None
    tree = etree.parse(xml_path)
    lands = tree.findall('.//土地標示部')
    if not lands:
        return None

    first = lands[0]
    city = first.findtext('縣市', '')
    district = first.findtext('鄉鎮市區', '')
    sect_name = first.findtext('段小段', '')

    total_area = 0.0
    managers = defaultdict(int)
    for l in lands:
        area_text = l.findtext('登記面積', '0')
        try:
            total_area += float(area_text)
        except ValueError:
            pass
        m = l.find('.//管理者名稱')
        if m is not None and m.text:
            managers[m.text] += 1

    top_managers = sorted(managers.items(), key=lambda x: -x[1])[:5]

    return {
        'city': city,
        'district': district,
        'sect_name': sect_name,
        'total_area': round(total_area, 2),
        'parcels': len(lands),
        'managers': ', '.join(f'{name}({count})' for name, count in top_managers),
    }


def trim_coords(coords):
    if isinstance(coords[0], (list, tuple)) and isinstance(coords[0][0], (list, tuple)):
        return [trim_coords(c) for c in coords]
    return [[round(x, 6), round(y, 6)] for x, y in coords]


def process_section(kml_path):
    basename = os.path.basename(kml_path)
    sect_id = basename.replace('.kml', '').replace('d_', '')
    sect4 = sect_id[:4]

    xml_path = os.path.join(SRC_DIR, f'd_{sect4}.xml')
    meta = parse_xml_metadata(xml_path, sect_id)

    polygons = parse_kml_polygons(kml_path)
    if not polygons:
        return None

    try:
        merged = unary_union(polygons)
        merged = set_precision(merged, 1e-6)
        if merged.is_empty:
            return None
    except Exception as e:
        print(f'  Warning: merge failed for {basename}: {e}', file=sys.stderr)
        return None

    geom = mapping(merged)

    if geom['type'] == 'Polygon':
        geom['coordinates'] = trim_coords(geom['coordinates'])
    elif geom['type'] == 'MultiPolygon':
        geom['coordinates'] = [trim_coords(p) for p in geom['coordinates']]
    elif geom['type'] == 'GeometryCollection':
        return None

    props = {'id': sect_id}
    if meta:
        props.update(meta)
    else:
        props.update({
            'city': '', 'district': '', 'sect_name': '',
            'total_area': 0, 'parcels': len(polygons), 'managers': '',
        })

    return {
        'type': 'Feature',
        'properties': props,
        'geometry': geom,
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    kml_files = sorted(glob.glob(os.path.join(SRC_DIR, '*.kml')))
    print(f'Processing {len(kml_files)} KML files...')

    by_district = defaultdict(list)
    skipped = 0

    for i, kml_path in enumerate(kml_files):
        if (i + 1) % 500 == 0:
            print(f'  {i + 1}/{len(kml_files)}...')
        feat = process_section(kml_path)
        if feat:
            district = feat['properties'].get('district', '') or '未分類'
            by_district[district].append(feat)
        else:
            skipped += 1

    print(f'Skipped: {skipped}')

    index = []
    for district, features in sorted(by_district.items()):
        geojson = {
            'type': 'FeatureCollection',
            'features': features,
        }
        safe_name = district if district else '未分類'
        out_path = os.path.join(OUT_DIR, f'{safe_name}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, separators=(',', ':'))

        size_kb = os.path.getsize(out_path) / 1024
        total_area = sum(feat['properties'].get('total_area', 0) for feat in features)

        bbox = [180, 90, -180, -90]
        for feat in features:
            geom = feat['geometry']
            coords_list = geom['coordinates']
            if geom['type'] == 'Polygon':
                coords_list = [coords_list]
            for poly in coords_list:
                ring = poly[0] if isinstance(poly[0][0], list) else poly
                for pt in ring:
                    bbox[0] = min(bbox[0], pt[0])
                    bbox[1] = min(bbox[1], pt[1])
                    bbox[2] = max(bbox[2], pt[0])
                    bbox[3] = max(bbox[3], pt[1])

        index.append({
            'district': safe_name,
            'file': f'{safe_name}.json',
            'sections': len(features),
            'total_area': round(total_area, 2),
            'bbox': [round(x, 6) for x in bbox],
            'size_kb': round(size_kb, 1),
        })
        print(f'  {safe_name}: {len(features)} sections, {size_kb:.0f} KB')

    index_path = os.path.join(OUT_DIR, 'index.json')
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    total_size = sum(item['size_kb'] for item in index)
    print(f'\nTotal: {sum(item["sections"] for item in index)} sections, {total_size:.0f} KB')


if __name__ == '__main__':
    main()
