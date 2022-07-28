<?php
$basePath = dirname(dirname(__DIR__));
$youtubePath = $basePath . '/json/youtube';

$fh = fopen($youtubePath . '/list.csv', 'w');
fputcsv($fh, ['id', 'title', 'location', 'latitude', 'longitude']);
foreach (glob($youtubePath . '/*.json') as $jsonFile) {
    $json = json_decode(file_get_contents($jsonFile), true);
    foreach ($json['items'] as $item) {
        if (!isset($item['id']['videoId'])) {
            continue;
        }
        fputcsv($fh, [$item['id']['videoId'], $item['snippet']['title'], '', '', '']);
    }
}
