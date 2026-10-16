#!/usr/bin/env python3
import json
from collections import defaultdict

CUNLI_SRC = '/home/kiang/public_html/taiwan_basecode/cunli/geo/20260407.json'
OUTPUT = '/home/kiang/public_html/tainan.olc.tw/docs/p/2026/clean/data/centroids.json'

with open(CUNLI_SRC) as f:
    geo = json.load(f)

with open(OUTPUT) as f:
    centroids = json.load(f)

town_points = defaultdict(list)

for feature in geo['features']:
    props = feature['properties']
    county = props['COUNTYNAME']
    town = props['TOWNNAME']
    key = county + town
    geom = feature['geometry']
    coords = []
    if geom['type'] == 'Polygon':
        coords = geom['coordinates'][0]
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']:
            coords.extend(poly[0])
    for lng, lat in coords:
        town_points[key].append((lat, lng))

for key, points in town_points.items():
    if key not in centroids:
        avg_lat = round(sum(p[0] for p in points) / len(points), 5)
        avg_lng = round(sum(p[1] for p in points) / len(points), 5)
        centroids[key] = [avg_lat, avg_lng]

with open(OUTPUT, 'w') as f:
    json.dump(centroids, f, ensure_ascii=False)
