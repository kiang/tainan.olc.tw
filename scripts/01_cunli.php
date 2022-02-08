<?php
$basePath = dirname(__DIR__);
$json = json_decode(file_get_contents('/home/kiang/public_html/taiwan_basecode/cunli/geo/20211007.json'), true);
$fc = [
    'type' => 'FeatureCollection',
    'features' => [],
];
foreach($json['features'] AS $f) {
    if($f['properties']['COUNTYNAME'] === '臺南市' && ($f['properties']['TOWNNAME'] === '中西區' || $f['properties']['TOWNNAME'] == '北區')) {
        $cunliFile = $basePath . '/json/cunli/' . $f['properties']['VILLCODE'] . '.json';
        if(file_exists($cunliFile)) {
            $json = json_decode(file_get_contents($cunliFile), true);
            $f['properties']['age_type'] = $json['meta']['type'];
        }
        $fc['features'][] = $f;
    }
}

file_put_contents($basePath . '/json/cunli.json', json_encode($fc));