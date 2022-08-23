<?php
$basePath = dirname(dirname(__DIR__));
$jsonPath = $basePath . '/raw/json';
if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}
foreach (glob($basePath . '/raw/kml/*.kml') as $kmlFile) {
    exec("/home/kiang/.local/bin/k2g {$kmlFile} {$jsonPath}");
}
