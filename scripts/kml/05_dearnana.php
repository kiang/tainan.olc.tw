<?php
$basePath = dirname(dirname(__DIR__));
require_once $basePath . '/scripts/vendor/autoload.php';
$jsonPath = $basePath . '/raw/dearnana';

if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}

$kmlFile = $jsonPath . '/raw.kml';
$jsonFile = $jsonPath . '/raw.json';

if (!file_exists($kmlFile)) {
    file_put_contents($kmlFile, file_get_contents('https://www.google.com/maps/d/u/0/kml?mid=1AHxHvFe6Aq0hLxMF9BxXPJK9AW-TzUY&forcekml=1'));
    exec("/home/kiang/.local/bin/k2g {$kmlFile} {$jsonPath}");

    $styleFile = $jsonPath . '/style.json';
    if (file_exists($styleFile)) {
        copy($styleFile, $jsonFile);
        unlink($styleFile);
    }
}

$json = json_decode(file_get_contents($jsonFile), true);
$totalMeters = 0.0;
$fc = [
    'type' => 'FeatureCollection',
    'features' => [],
];
$videos = [];
foreach ($json['features'] as $k => $f) {
    if ($k < 61) {
        continue;
    }
    if ($f['geometry']['type'] === 'LineString') {
        try {
            $line = geoPHP::load(json_encode($f), 'json');
        } catch (\Throwable $th) {
            throw $th;
        }
        if (!empty($line)) {
            $length = round($line->greatCircleLength());

            $totalMeters += $length;
            $reduced_geometry = $line->simplify(0.00001);
            $json = json_decode($reduced_geometry->out('json'), true);
            unset($f['properties']['styleUrl']);
            $f['properties']['length'] = $length;
            $f['geometry'] = $json;
            $fc['features'][] = $f;
        }
    } else {
        $fc['features'][] = $f;
    }
    $videos[$f['properties']['name']] = [
        'videos' => [],
    ];
}

echo $totalMeters;

$videoFile = $basePath . '/docs/p/dearnana/json/videos.json';
if (!file_exists($videoFile)) {
    file_put_contents($videoFile, json_encode($videos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
file_put_contents($basePath . '/docs/p/dearnana/json/lines.json', json_encode($fc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
