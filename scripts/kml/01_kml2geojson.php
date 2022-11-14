<?php
$basePath = dirname(dirname(__DIR__));
$jsonPath = $basePath . '/raw/json';
if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}
foreach (glob($basePath . '/raw/kml/*.kml') as $kmlFile) {
    $p = pathinfo($kmlFile);
    $jsonFile = $jsonPath . '/' . $p['filename'] . '.geojson';
    if (!file_exists($jsonFile)) {
        exec("/home/kiang/.local/bin/k2g {$kmlFile} {$jsonPath}");
        $styleFile = $jsonPath . '/style.json';
        if (file_exists($styleFile)) {
            copy($styleFile, $jsonFile);
            unlink($styleFile);
        }
    }
}

$jsonPath = $basePath . '/raw/car_json';
if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}
foreach (glob($basePath . '/raw/car_kml/*.kml') as $kmlFile) {
    $p = pathinfo($kmlFile);
    $jsonFile = $jsonPath . '/' . $p['filename'] . '.geojson';
    if (!file_exists($jsonFile)) {
        exec("/home/kiang/.local/bin/k2g {$kmlFile} {$jsonPath}");
        $styleFile = $jsonPath . '/style.json';
        if (file_exists($styleFile)) {
            copy($styleFile, $jsonFile);
            unlink($styleFile);
        }
    }
}
