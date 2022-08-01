<?php
$basePath = dirname(dirname(__DIR__));
$youtubePath = $basePath . '/json/youtube';

$listFile = $youtubePath . '/list.csv';
$pool = $locations = [];
if (file_exists($listFile)) {
    $fh = fopen($listFile, 'r');
    fgetcsv($fh, 2048);
    while ($line = fgetcsv($fh, 2048)) {
        $pool[$line[0]] = $line;

        if (!empty($line[3])) {
            $locations[$line[2]] = [floatval($line[3]), floatval($line[4])];
        }
    }
}

$fh = fopen($listFile, 'w');
fputcsv($fh, ['id', 'title', 'location', 'latitude', 'longitude']);
foreach (glob($youtubePath . '/*.json') as $jsonFile) {
    $json = json_decode(file_get_contents($jsonFile), true);
    foreach ($json['items'] as $item) {
        if (!isset($item['id']['videoId'])) {
            continue;
        }
        $location = $pool[$item['id']['videoId']][2];
        $latitude = '';
        $longitude = '';
        if (isset($locations[$location])) {
            $latitude = $locations[$location][0];
            $longitude = $locations[$location][1];
        }
        if (isset($pool[$item['id']['videoId']])) {
            fputcsv($fh, [$item['id']['videoId'], $item['snippet']['title'], $location, $latitude, $longitude]);
        } else {
            fputcsv($fh, [$item['id']['videoId'], $item['snippet']['title'], '', $latitude, $longitude]);
        }
    }
}
