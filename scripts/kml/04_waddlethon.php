<?php
$basePath = dirname(dirname(__DIR__));
require_once $basePath . '/scripts/vendor/autoload.php';
$jsonPath = $basePath . '/raw/waddlethon';

if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}

$kmlFile = $jsonPath . '/raw.kml';
$jsonFile = $jsonPath . '/raw.json';

file_put_contents($kmlFile, file_get_contents('https://www.google.com/maps/d/u/0/kml?mid=16Y79OT_7wj_53sJ9GSVgIzjdwvykzpk&forcekml=1'));
exec("/home/kiang/.local/bin/k2g {$kmlFile} {$jsonPath}");

$styleFile = $jsonPath . '/style.json';
if (file_exists($styleFile)) {
    copy($styleFile, $jsonFile);
    unlink($styleFile);
}

$json = json_decode(file_get_contents($jsonFile), true);
$totalMeters = 0.0;
$fc = [
    'type' => 'FeatureCollection',
    'features' => [],
];
foreach ($json['features'] as $f) {
    if ($f['geometry']['type'] === 'LineString') {
        try {
            $line = geoPHP::load(json_encode($f), 'json');
        } catch (\Throwable $th) {
            throw $th;
        }
        if (!empty($line)) {
            $length = round($line->greatCircleLength());
            $parts = explode(' ', $f['properties']['name']);
            foreach ($parts as $k => $part) {
                if ($part === 'Day') {
                    $f['properties']['name'] = $part . ' ' . $parts[$k + 1];
                    break;
                }
            }
            echo "{$f['properties']['name']}: {$length} meters\n";
            $totalMeters += $length;
            $reduced_geometry = $line->simplify(0.00001);
            $json = json_decode($reduced_geometry->out('json'), true);
            unset($f['properties']['styleUrl']);
            $f['properties']['length'] = $length;
            $f['geometry'] = $json;
            $fc['features'][] = $f;
        }
    }
}
echo "Total: {$totalMeters} meters\n";
file_put_contents($basePath . '/docs/p/waddlethon/json/lines.json', json_encode($fc));