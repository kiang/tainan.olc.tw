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
$videos = [
    '2022042115' => '',
    '2022042516' => 'GFVUKlVaRvI',
    '2022042816' => 'ZeeFXgqcf3I',
    '2022051915' => 'LipCluJvAOw',
    '2022060115' => 'y_OdmA3HskE',
    '2022061815' => 'ig9V57L8sUA',
    '2022062416' => 'C5Lpe2XmNQI',
    '2022070410' => 'ww2-Sw3FQmM',
    '2022070415' => '',
    '2022080315' => 'XbQ5lpJo910',
    '2022081316' => '',
    '2022081814' => 'OFGO2S_PdwU',
    '2022082110' => 'a5OfXHZJsH4',
];

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
}
file_put_contents($basePath . '/docs/json/lines.json', json_encode($fc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
