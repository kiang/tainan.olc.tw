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

// Parse KML and convert to GeoJSON manually to preserve all folders
$xml = simplexml_load_string($kmlContent);
$namespaces = $xml->getNamespaces(true);
$kmlNs = $namespaces[''] ?? 'http://www.opengis.net/kml/2.2';

$features = [];

// Category mapping based on folder names
$categoryMapping = [
    '流動廁所' => '流動廁所',
    '沐浴站' => '物資',
    '取水站' => '物資',
    '便當站' => '物資',
    '相關醫療站' => '物資',
    '領取物資站' => '物資',
    '花蓮縣政府前進指揮所' => '物資',
    '志工報到服務站' => '志工服務站',
    '安心關懷站' => '安心關懷站',
];

// Get all folders (use default namespace)
$folders = $xml->xpath('//*[local-name()="Folder"]');

foreach ($folders as $folder) {
    $folderName = (string)$folder->name;

    // Determine category from folder name
    $category = '';
    foreach ($categoryMapping as $key => $value) {
        if (strpos($folderName, $key) !== false) {
            $category = $value;
            break;
        }
    }

    // Get all placemarks in this folder (use local-name to ignore namespace)
    $placemarks = $folder->xpath('.//*[local-name()="Placemark"]');

    foreach ($placemarks as $placemark) {
        $name = (string)$placemark->name;
        $description = (string)$placemark->description;

        // Skip if no name (likely a container element)
        if (empty($name)) {
            continue;
        }

        // Extract coordinates (use local-name to ignore namespace)
        $coordinates = $placemark->xpath('.//*[local-name()="coordinates"]');

        $lng = 0.0;
        $lat = 0.0;
        $alt = 0.0;

        if (!empty($coordinates)) {
            $coordStr = trim((string)$coordinates[0]);
            if (!empty($coordStr)) {
                $coordParts = preg_split('/[\s,]+/', $coordStr);
                if (count($coordParts) >= 2) {
                    $lng = floatval($coordParts[0]);
                    $lat = floatval($coordParts[1]);
                    $alt = isset($coordParts[2]) ? floatval($coordParts[2]) : 0.0;
                }
            }
        }

        // Parse description HTML for properties
        $properties = [
            'name' => $name,
            'description' => $description,
            '類別' => $category,
        ];

        // Extract properties from description HTML (parse the original HTML)
        if ($description) {
            // Use the raw description with <br> tags as delimiters
            $parts = preg_split('/<br\s*\/?>/i', $description);
            foreach ($parts as $part) {
                $part = trim(strip_tags($part));
                if (preg_match('/^類別:\s*(.+)$/', $part, $match)) {
                    $properties['類別'] = trim($match[1]);
                } elseif (preg_match('/^地址或google座標:\s*(.+)$/', $part, $match)) {
                    $properties['地址或google座標'] = trim($match[1]);
                } elseif (preg_match('/^備註:\s*(.+)$/', $part, $match)) {
                    $properties['備註'] = trim($match[1]);
                } elseif (preg_match('/^專線:\s*(.+)$/', $part, $match)) {
                    $properties['專線'] = trim($match[1]);
                } elseif (preg_match('/^地址LINK:\s*([0-9.]+),\s*([0-9.]+)/', $part, $match)) {
                    // Extract coordinates from 地址LINK if main coordinates are 0,0
                    if ($lat == 0.0 && $lng == 0.0) {
                        $lat = floatval($match[1]);
                        $lng = floatval($match[2]);
                    }
                }
            }
        }

        $features[] = [
            'type' => 'Feature',
            'properties' => $properties,
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [$lng, $lat, $alt]
            ]
        ];
    }
}

// Create GeoJSON structure
$geojson = [
    'type' => 'FeatureCollection',
    'features' => $features,
    'name' => 'main'
];

// Save to file
$jsonPath = $basePath . '/docs/p/guangfu250923/data';
if (!file_exists($jsonPath)) {
    mkdir($jsonPath, 0777, true);
}

$jsonFile = $jsonPath . '/mymaps.json';
file_put_contents($jsonFile, json_encode($geojson, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo "KML converted to GeoJSON successfully: {$jsonFile}\n";
echo "Total features: " . count($features) . "\n";
