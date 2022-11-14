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
                        if (!isset($timePoints[$currentKey][$timeS]) && isset($f['geometry']['geometries'][$k])) {
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
$videos = [];
$mapFile = $basePath . '/raw/line_video_map.json';
if (file_exists($mapFile)) {
    $videos = json_decode(file_get_contents($mapFile), true);
}

foreach ($timePoints as $k => $points) {
    $fc['features'][] = [
        'type' => 'Feature',
        'properties' => [
            'ymdh' => $k,
            'v' => isset($videos[$k]) ? $videos[$k] : '',
        ],
        'geometry' => [
            'type' => 'LineString',
            'coordinates' => array_values($points),
        ],
    ];
    if (!isset($videos[$k])) {
        $videos[$k] = '';
    }
}
file_put_contents($mapFile, json_encode($videos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
file_put_contents($basePath . '/docs/json/lines.json', json_encode($fc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$jsonPath = $basePath . '/raw/car_json';
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
                        if (!isset($timePoints[$currentKey][$timeS]) && isset($f['geometry']['geometries'][$k])) {
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
            'ymdh' => $k
        ],
        'geometry' => [
            'type' => 'LineString',
            'coordinates' => array_values($points),
        ],
    ];
}
file_put_contents($basePath . '/docs/json/car_lines.json', json_encode($fc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
