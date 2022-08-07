<?php
$basePath = dirname(dirname(__DIR__));

$json1 = json_decode(file_get_contents($basePath . '/docs/json/youtube.json'), true);
$json2 = json_decode(file_get_contents($basePath . '/docs/json/youtube_list.json'), true);

$hours = $minutes = $seconds = 0;
foreach ($json2 as $place => $videos) {
    foreach ($videos as $video) {
        $detail = json_decode(file_get_contents($basePath . '/docs/json/youtube/details/' . $video['id'] . '.json'), true);
        $parts = preg_split('/[^0-9]/', $detail['items'][0]['contentDetails']['duration']);

        switch (count($parts)) {
            case 6:
                $hours += $parts[2];
                $minutes += $parts[3];
                $seconds += $parts[4];
                break;
            case 5:
                $minutes += $parts[2];
                $seconds += $parts[3];
                break;
        }
    }
}

$finalSeconds = $seconds % 60;
$minutes += ($seconds - $finalSeconds) / 60;
$finalMinutes = $minutes % 60;
$hours += ($minutes - $finalMinutes) / 60;

echo "{$hours}:{$finalMinutes}:{$finalSeconds}\n";