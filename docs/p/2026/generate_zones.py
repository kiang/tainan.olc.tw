#!/usr/bin/env python3
import json
import os
import sys
import glob
import csv
from datetime import datetime
from shapely.geometry import shape, mapping, MultiPolygon
from shapely.ops import unary_union

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
ZONES_DIR = os.path.join(BASE_DIR, 'zones')
OVERVIEW_DIR = os.path.join(ZONES_DIR, 'overview')
DETAIL_DIR = os.path.join(ZONES_DIR, 'detail')
ELECTION_GEOJSON_DIR = '/home/kiang/public_html/db.cec.gov.tw/data/elections/2026'

ELECTION_TYPE_TO_ZONE_PREFIX = {
    '直轄市議員': ['T1', 'T2', 'T3'],
    '縣市議員': ['T1', 'T2', 'T3'],
    '直轄市山地原住民區區民代表': ['R3'],
    '鄉鎮市民代表': ['R1', 'R2'],
}

MUNICIPAL_CODES = ['63000', '64000', '65000', '66000', '67000', '68000']


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)


def load_list_csv():
    """Load zone code -> zone name mapping from list.csv"""
    result = {}
    csv_path = os.path.join(ELECTION_GEOJSON_DIR, 'list.csv')
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            result[row['code']] = {
                'name': row['name'],
                'type_name': row['type_name'],
                'prefix': row['type'],
            }
    return result


def find_zone_code(election_type, county_code, district_name, town_code=None, vill_code=None, zone_list=None):
    """Map candidate fields to a zone code like T1-63000-01"""
    if election_type in ('直轄市市長', '縣市首長'):
        return f'mayor-{county_code}'
    if election_type == '鄉鎮市長':
        return f'mayor-{town_code}'
    if election_type == '直轄市山地原住民區區長':
        return f'mayor-{town_code}'
    if election_type == '村里長':
        return f'village-{vill_code}'

    district_num = None
    if district_name:
        import re
        m = re.search(r'(\d+)', district_name)
        if m:
            district_num = m.group(1).zfill(2)

    if not district_num:
        return None

    if election_type in ('直轄市議員', '縣市議員'):
        prefixes = ['T1', 'T2', 'T3']
    elif election_type == '直轄市山地原住民區區民代表':
        prefixes = ['R3']
    elif election_type == '鄉鎮市民代表':
        prefixes = ['R1', 'R2']
    else:
        return None

    for prefix in prefixes:
        if election_type == '鄉鎮市民代表':
            code = f'{prefix}-{town_code}-{district_num}'
        else:
            code = f'{prefix}-{county_code}-{district_num}'
        if zone_list and code in zone_list:
            return code
        geojson_path = os.path.join(ELECTION_GEOJSON_DIR, f'{code}.json')
        if os.path.exists(geojson_path):
            return code

    return None


def union_features(features):
    """Union all feature geometries into a single polygon/multipolygon"""
    polys = []
    for f in features:
        try:
            geom = shape(f['geometry'])
            if geom.is_valid:
                polys.append(geom)
            else:
                polys.append(geom.buffer(0))
        except Exception:
            continue
    if not polys:
        return None
    merged = unary_union(polys)
    return merged


def get_centroid(geom):
    c = geom.centroid
    return [round(c.x, 4), round(c.y, 4)]


def build_zone_for_candidate(candidate, zones_def, zone_list):
    """Determine zone code and find source GeoJSON features for a candidate"""
    et = candidate['election']
    cc = candidate.get('countyCode', '')
    district = candidate.get('district', '')
    tc = candidate.get('townCode', '')
    vc = candidate.get('villCode', '')

    zone_code = find_zone_code(et, cc, district, tc, vc, zone_list)
    if not zone_code:
        return None, None, None

    # Find the source geojson features
    geojson_path = os.path.join(ELECTION_GEOJSON_DIR, f'{zone_code}.json')
    if os.path.exists(geojson_path):
        fc = load_json(geojson_path)
        return zone_code, fc['features'], et

    # For mayor/village types, we need to build from zones.json or cunli data
    if zone_code.startswith('mayor-') or zone_code.startswith('village-'):
        area_code = zone_code.split('-', 1)[1]
        features = find_cunli_features_for_area(et, area_code, cc, zones_def)
        if features:
            return zone_code, features, et

    return zone_code, None, et


def find_cunli_features_for_area(election_type, area_code, county_code, zones_def):
    """Find cunli features for mayor/village types by scanning zone geojsons"""
    if election_type in ('直轄市市長', '縣市首長'):
        # Collect all cunli features for this county from T1 zone files
        pattern = os.path.join(ELECTION_GEOJSON_DIR, f'T1-{county_code}-*.json')
        all_features = []
        seen_villcodes = set()
        for path in sorted(glob.glob(pattern)):
            fc = load_json(path)
            for f in fc['features']:
                vc = f['properties'].get('VILLCODE', '')
                if vc not in seen_villcodes:
                    seen_villcodes.add(vc)
                    all_features.append(f)
        return all_features if all_features else None

    if election_type == '鄉鎮市長' or election_type == '直轄市山地原住民區區長':
        # Collect all cunli features for this town
        # Try R1 zones first (for 鄉鎮), then T1 zones
        town_code = area_code
        all_features = []
        seen_villcodes = set()

        # Try R1 zone files for this town
        pattern = os.path.join(ELECTION_GEOJSON_DIR, f'R1-{town_code}-*.json')
        for path in sorted(glob.glob(pattern)):
            fc = load_json(path)
            for f in fc['features']:
                vc = f['properties'].get('VILLCODE', '')
                if vc not in seen_villcodes:
                    seen_villcodes.add(vc)
                    all_features.append(f)

        if all_features:
            return all_features

        # Fallback: scan T1 zones that contain this town's cunli
        county = town_code[:5]
        pattern = os.path.join(ELECTION_GEOJSON_DIR, f'T1-{county}-*.json')
        for path in sorted(glob.glob(pattern)):
            fc = load_json(path)
            for f in fc['features']:
                if f['properties'].get('TOWNCODE', '') == town_code:
                    vc = f['properties'].get('VILLCODE', '')
                    if vc not in seen_villcodes:
                        seen_villcodes.add(vc)
                        all_features.append(f)
        return all_features if all_features else None

    if election_type == '村里長':
        vill_code = area_code
        county = vill_code[:5]
        town = vill_code[:8]
        # Scan T1 or R1 zones to find this village
        for prefix in ['T1', 'R1']:
            if prefix == 'R1':
                pattern = os.path.join(ELECTION_GEOJSON_DIR, f'{prefix}-{town}-*.json')
            else:
                pattern = os.path.join(ELECTION_GEOJSON_DIR, f'{prefix}-{county}-*.json')
            for path in sorted(glob.glob(pattern)):
                fc = load_json(path)
                for f in fc['features']:
                    if f['properties'].get('VILLCODE', '') == vill_code:
                        return [f]

    return None


def generate():
    os.makedirs(OVERVIEW_DIR, exist_ok=True)
    os.makedirs(DETAIL_DIR, exist_ok=True)

    candidates_data = load_json(os.path.join(DATA_DIR, 'candidates.json'))
    zones_def = load_json(os.path.join(DATA_DIR, 'zones.json'))
    zone_list = load_list_csv()

    candidates = candidates_data['candidates']
    election_types = list(candidates_data['elections'].keys())

    # Group candidates by zone
    zone_candidates = {}
    for i, c in enumerate(candidates):
        zone_code, features, et = build_zone_for_candidate(c, zones_def, zone_list)
        if not zone_code:
            print(f'WARNING: cannot map candidate {c["name"]} ({c["election"]}, {c.get("countyName","")}, {c.get("district","")})')
            continue
        if zone_code not in zone_candidates:
            zone_candidates[zone_code] = {
                'election_type': et,
                'features': features,
                'candidates': [],
            }
        zone_candidates[zone_code]['candidates'].append(i)
        if features and not zone_candidates[zone_code]['features']:
            zone_candidates[zone_code]['features'] = features

    # Build overview and detail files
    overview_collections = {}  # election_type -> [features]
    stats = {'detail': 0, 'overview_features': 0, 'skipped': 0}

    for zone_code, info in zone_candidates.items():
        et = info['election_type']
        features = info['features']
        cand_indices = info['candidates']

        if not features:
            print(f'WARNING: no geometry for zone {zone_code}')
            stats['skipped'] += 1
            continue

        # Write detail file
        detail_fc = {
            'type': 'FeatureCollection',
            'features': features,
        }
        save_json(os.path.join(DETAIL_DIR, f'{zone_code}.json'), detail_fc)
        stats['detail'] += 1

        # Build overview feature (union)
        merged_geom = union_features(features)
        if not merged_geom:
            stats['skipped'] += 1
            continue

        zone_name = zone_list.get(zone_code, {}).get('name', zone_code)
        centroid = get_centroid(merged_geom)

        # Candidate names for tooltip
        cand_names = [candidates[i]['name'] for i in cand_indices]

        overview_feature = {
            'type': 'Feature',
            'properties': {
                'code': zone_code,
                'name': zone_name,
                'type': et,
                'candidateCount': len(cand_indices),
                'candidates': cand_names,
                'centroid': centroid,
            },
            'geometry': mapping(merged_geom),
        }

        if et not in overview_collections:
            overview_collections[et] = []
        overview_collections[et].append(overview_feature)
        stats['overview_features'] += 1

    # Write overview files (one per election type)
    for et, features in overview_collections.items():
        overview_fc = {
            'type': 'FeatureCollection',
            'features': features,
        }
        save_json(os.path.join(OVERVIEW_DIR, f'{et}.json'), overview_fc)

    # Write index.json
    counts = {et: len(fs) for et, fs in overview_collections.items()}
    index_data = {
        'generated': datetime.now().isoformat(),
        'types': election_types,
        'counts': counts,
    }
    save_json(os.path.join(ZONES_DIR, 'index.json'), index_data)

    print(json.dumps({
        'ok': True,
        'detail_files': stats['detail'],
        'overview_types': len(overview_collections),
        'overview_features': stats['overview_features'],
        'skipped': stats['skipped'],
    }, ensure_ascii=False))


if __name__ == '__main__':
    generate()
