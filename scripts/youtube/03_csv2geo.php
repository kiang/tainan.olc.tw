<?php
$basePath = dirname(dirname(__DIR__));
$youtubePath = $basePath . '/json/youtube';

$listFile = $youtubePath . '/list.csv';
$fh = fopen($listFile, 'r');
fgetcsv($fh, 2048);
$pool = [];
$fc = [
    'type' => 'FeatureCollection',
    'features' => [],
];
while ($line = fgetcsv($fh, 2048)) {
    if (false !== strpos($line[1], '街講')) {
        if (!isset($pool[$line[2]])) {
            $pool[$line[2]] = [
                'type' => 'Feature',
                'properties' => [
                    'key' => $line[2],
                    'count' => 1,
                ],
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [
                        floatval($line[4]),
                        floatval($line[3]),
                    ],
                ],
            ];
        } else {
            ++$pool[$line[2]]['properties']['count'];
        }
    }
}
$fc['features'] = array_values($pool);

file_put_contents($basePath . '/json/youtube.json', json_encode($fc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
