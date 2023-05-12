<?php
$basePath = dirname(dirname(__DIR__));
$jsonPath = $basePath . '/raw/waddlethon';

if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}

$kmlFile = $jsonPath . '/raw.kml';
$jsonFile = $jsonPath . '/raw.json';
file_put_contents($kmlFile, file_get_contents('https://www.google.com/maps/d/u/0/kml?mid=16Y79OT_7wj_53sJ9GSVgIzjdwvykzpk&forcekml=1'));
exec("/home/kiang/.local/bin/k2g {$kmlFile} {$jsonPath}");

$styleFile = $jsonPath . '/style.json';
if (file_exists($styleFile)) {
    copy($styleFile, $jsonFile);
    unlink($styleFile);
}