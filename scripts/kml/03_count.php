<?php
$bastPath = dirname(dirname(__DIR__));
require_once $bastPath . '/scripts/vendor/autoload.php';

$totalMeters = 0.0;
foreach (glob($bastPath . '/raw/json/*.geojson') as $jsonFile) {
    $raw = file_get_contents($jsonFile);
    $json = json_decode($raw, true);
    $timeBegin = $timeEnd = false;
    foreach ($json['features'] as $f) {
        $begin = strtotime($f['properties']['timeSpan']['begin']);
        $end = strtotime($f['properties']['timeSpan']['end']);
        if (false === $timeBegin || $timeBegin > $begin) {
            $timeBegin = $begin;
        }
        if (false === $timeEnd || $timeEnd < $end) {
            $timeEnd = $end;
        }
    }
    $timeDiff = $timeEnd - $timeBegin;
    $hours = floor($timeDiff / 3600);
    $minutes = floor(($timeDiff - ($hours * 3600)) / 60);
    $seconds = $timeDiff - ($hours * 3600) - ($minutes * 60);

    try {
        $line = geoPHP::load($raw, 'json');
    } catch (\Throwable $th) {
        //throw $th;
    }
    if (!empty($line)) {
        $length = $line->greatCircleLength();
        echo date('Y-m-d H:i:s', $timeBegin) . " {$hours}:{$minutes}:{$seconds} / {$length} meters\n";
        $totalMeters += $length;
    }
}

echo round($totalMeters) . " meters";
