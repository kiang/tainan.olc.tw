<?php
$json = json_decode(file_get_contents('/home/kiang/public_html/taiwan_basecode/cunli/geo/20211007.json'), true);
$fc = [
    'type' => 'FeatureCollection',
    'features' => [],
];
foreach($json['features'] AS $f) {
    if($f['properties']['COUNTYNAME'] === '臺南市' && ($f['properties']['TOWNNAME'] === '中西區' || $f['properties']['TOWNNAME'] == '北區')) {
        $fc['features'][] = $f;
    }
}

file_put_contents(dirname(__DIR__) . '/json/cunli.json', json_encode($fc));