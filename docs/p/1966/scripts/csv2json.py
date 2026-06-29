#!/usr/bin/env python3
import csv
import json
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)
csv_path = os.path.join(project_dir, 'raw', 'abc.csv')
data_dir = os.path.join(project_dir, 'data')
county_dir = os.path.join(data_dir, 'county')

os.makedirs(county_dir, exist_ok=True)

by_city = {}
skipped = 0

with open(csv_path, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            lng = float(row['經度'])
            lat = float(row['緯度'])
        except (ValueError, KeyError):
            skipped += 1
            continue

        if not (118 < lng < 123 and 21 < lat < 26):
            skipped += 1
            continue

        zones_raw = row.get('特約區域', '').strip()
        zones = [z.strip() for z in zones_raw.split(';') if z.strip()] if zones_raw else []

        beds = 0
        residents = 0
        try:
            beds = int(row.get('開放床數', 0) or 0)
        except ValueError:
            pass
        try:
            residents = int(row.get('現有住民', 0) or 0)
        except ValueError:
            pass

        entry = {
            'name': row['機構名稱'],
            'code': row['機構代碼'],
            'type': row['機構種類'],
            'city': row['縣市'],
            'town': row['區'],
            'addr': row['地址全址'],
            'lng': round(lng, 6),
            'lat': round(lat, 6),
            'abc': row.get('O_ABC', ''),
            'service': row.get('特約服務項目', ''),
            'zones': zones,
            'phone': row.get('機構電話', ''),
            'owner': row.get('機構負責人姓名', ''),
            'start': row.get('特約起日', ''),
            'end': row.get('特約迄日', ''),
        }
        if beds:
            entry['beds'] = beds
        if residents:
            entry['residents'] = residents

        city = row['縣市']
        if city not in by_city:
            by_city[city] = []
        by_city[city].append(entry)

total = 0
for city, records in by_city.items():
    out_path = os.path.join(county_dir, f'{city}.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, separators=(',', ':'))
    total += len(records)
    print(f'  {city}: {len(records)} records')

print(f'Converted {total} records across {len(by_city)} counties, skipped {skipped}')
