<?php
$basePath = dirname(__DIR__);
$pdfPath = $basePath . '/pdf';
$photoPath = $basePath . '/photos';

// Create photos directory if it doesn't exist
if (!file_exists($photoPath)) {
    mkdir($photoPath, 0777, true);
}

foreach (glob($pdfPath . '/*.pdf') as $pdfFile) {
    $p = pathinfo($pdfFile);
    $city = substr($p['filename'], 2);
    $cityPath = $photoPath . '/' . $city;
    if (!file_exists($cityPath)) {
        mkdir($cityPath, 0777, true);
    }
    exec("/usr/bin/pdfimages -all {$pdfFile} {$cityPath}/");
}