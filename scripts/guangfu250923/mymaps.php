<?php
$basePath = dirname(dirname(__DIR__));

// Fetch KML from Google My Maps
$kmlUrl = 'https://www.google.com/maps/d/u/0/kml?forcekml=1&mid=1euJJbnUwI0z0SNe4cWVcqzIDT6MMCrM';
$kmlContent = file_get_contents($kmlUrl);

// Save KML to raw directory
$kmlPath = $basePath . '/raw/kml';
if (!file_exists($kmlPath)) {
    mkdir($kmlPath, 0777, true);
}

$kmlFile = $kmlPath . '/guangfu250923_mymaps.kml';
file_put_contents($kmlFile, $kmlContent);

// Convert to GeoJSON
$jsonPath = $basePath . '/docs/p/guangfu250923/data';
if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}

exec("/home/kiang/.local/bin/k2g {$kmlFile} {$jsonPath}");

// Move and rename the output file
$styleFile = $jsonPath . '/style.json';
$jsonFile = $jsonPath . '/mymaps.json';

if (file_exists($styleFile)) {
    rename($styleFile, $jsonFile);
    echo "KML converted to GeoJSON successfully: {$jsonFile}\n";
} else {
    echo "Error: Conversion failed\n";
}
