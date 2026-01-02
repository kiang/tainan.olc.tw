<?php
/**
 * Process taiwan_solar_all.json and split into separate GeoJSON files
 * by first 3 Chinese characters of the name property (county name)
 */

$sourceFile = '/home/kiang/public_html/public.revo.org.tw/data/raw/taiwan_solar_all.json';
$outputDir = dirname(__DIR__, 2) . '/docs/p/revo/json';

// Read source JSON
$jsonContent = file_get_contents($sourceFile);
$data = json_decode($jsonContent, true);

if (!$data || !isset($data['points'])) {
    die("Error: Cannot read source file or invalid format\n");
}

// Group points by first 3 characters of name
$groups = [];
$stats = [];

foreach ($data['points'] as $point) {
    $name = $point['name'] ?? '';

    // Get first 3 characters (works for UTF-8 Chinese characters)
    $prefix = mb_substr($name, 0, 3, 'UTF-8');

    if (empty($prefix)) {
        $prefix = 'unknown';
    }

    if (!isset($groups[$prefix])) {
        $groups[$prefix] = [];
        $stats[$prefix] = 0;
    }

    // Parse groupContent to get solar panel details and project key
    $solarInfo = [];
    $projectKey = '';
    if (!empty($point['groupContent'])) {
        // Get project key from first groupContent
        if (isset($point['groupContent'][0]['key'])) {
            $projectKey = $point['groupContent'][0]['key'];
        }
        foreach ($point['groupContent'] as $content) {
            if (isset($content['value'])) {
                $decoded = json_decode($content['value'], true);
                if ($decoded) {
                    $solarInfo = array_merge($solarInfo, $decoded);
                }
            }
        }
    }

    // Create GeoJSON feature
    $feature = [
        'type' => 'Feature',
        'geometry' => [
            'type' => 'Point',
            'coordinates' => [
                floatval($point['x']),
                floatval($point['y'])
            ]
        ],
        'properties' => [
            'id' => $point['id'] ?? '',
            'name' => $name,
            'address' => $point['address'] ?? '',
            'village' => $point['village'] ?? '',
            'neighborhood' => $point['neighborhood'] ?? '',
            'projectKey' => $projectKey,
        ]
    ];

    // Add solar info to properties
    foreach ($solarInfo as $key => $value) {
        $feature['properties'][$key] = $value;
    }

    $groups[$prefix][] = $feature;
    $stats[$prefix]++;
}

// Output GeoJSON files
$manifest = [];

foreach ($groups as $prefix => $features) {
    $geojson = [
        'type' => 'FeatureCollection',
        'features' => $features
    ];

    $filename = $prefix . '.json';
    $outputPath = $outputDir . '/' . $filename;

    file_put_contents($outputPath, json_encode($geojson, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    $manifest[] = [
        'name' => $prefix,
        'file' => 'json/' . $filename,
        'count' => count($features)
    ];

    echo "Created: {$filename} ({$stats[$prefix]} features)\n";
}

// Sort manifest by count in descending order
usort($manifest, function($a, $b) {
    return $b['count'] - $a['count'];
});

// Write manifest file
$manifestPath = $outputDir . '/manifest.json';
file_put_contents($manifestPath, json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

echo "\n";
echo "Total groups: " . count($groups) . "\n";
echo "Total features: " . array_sum($stats) . "\n";
echo "Manifest written to: manifest.json\n";
