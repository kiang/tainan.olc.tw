<?php
$basePath = dirname(__DIR__);

$count = [];
foreach(glob($basePath . '/json/cunli/*.json') AS $jsonFile) {
    $json = json_decode(file_get_contents($jsonFile), true);
    if(!isset($count[$json['meta']['type']])) {
        $count[$json['meta']['type']] = 0;
    }
    ++$count[$json['meta']['type']];
}
print_r($count);