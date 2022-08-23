<?php
$basePath = dirname(dirname(__DIR__));
$jsonPath = $basePath . '/raw/json';
$timePoints = [];
foreach (glob($jsonPath . '/*.geojson') as $jsonFile) {
    $json = json_decode(file_get_contents($jsonFile), true);
    $currentKey = false;
    foreach ($json['features'] as $f) {
        switch ($f['geometry']['type']) {
            case 'GeometryCollection':
                foreach ($f['properties']['times'] as $k => $points) {
                    foreach ($points as $pk => $pv) {
                        $time = strtotime($pv);
                        if (false === $currentKey) {
                            $currentKey = date('YmdH', $time);
                            $timePoints[$currentKey] = [];
                        }
                        $timeS = date('YmdHi', $time);
                        if (!isset($timePoints[$currentKey][$timeS])) {
                            $timePoints[$currentKey][$timeS] = [
                                $f['geometry']['geometries'][$k]['coordinates'][$pk][0],
                                $f['geometry']['geometries'][$k]['coordinates'][$pk][1]
                            ];
                        }
                    }
                }
                break;
            case 'LineString':
                foreach ($f['properties']['times'] as $pk => $pv) {
                    $time = strtotime($pv);
                    if (false === $currentKey) {
                        $currentKey = date('YmdH', $time);
                        $timePoints[$currentKey] = [];
                    }
                    $timeS = date('YmdHi', $time);
                    if (!isset($timePoints[$currentKey][$timeS])) {
                        $timePoints[$currentKey][$timeS] = [
                            $f['geometry']['coordinates'][$pk][0],
                            $f['geometry']['coordinates'][$pk][1]
                        ];
                    }
                }
                break;
        }
    }
}
$fc = [
    'type' => 'FeatureCollection',
    'features' => [],
];
foreach ($timePoints as $k => $points) {
    $fc['features'][] = [
        'type' => 'Feature',
        'properties' => [
            'ymdh' => $k,
        ],
        'geometry' => [
            'type' => 'LineString',
            'coordinates' => array_values($points),
        ],
    ];
}
file_put_contents($basePath . '/docs/json/lines.json', json_encode($fc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
