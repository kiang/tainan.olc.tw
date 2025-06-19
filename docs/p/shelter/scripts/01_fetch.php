<?php
$json = json_decode(file_get_contents('https://data.gov.tw/api/v2/rest/dataset/73242'), true);

// Create stream context with SSL verification disabled and User-Agent header
$arrContextOptions = [
    "ssl" => [
        "verify_peer" => false,
        "verify_peer_name" => false,
    ],
    "http" => [
        "method" => "GET",
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36\r\n"
    ]
];

// Load reference CSV for coordinate updates
$referenceData = [];
$refCsvUrl = 'https://github.com/kiang/rvis.mohw.gov.tw/raw/refs/heads/master/rvis_all_data.csv';
$refCsvFh = fopen($refCsvUrl, 'r', false, stream_context_create($arrContextOptions));

if ($refCsvFh) {
    $refHeader = null;
    while ($refLine = fgetcsv($refCsvFh, 2048)) {
        if ($refHeader === null) {
            $refHeader = $refLine;
            continue;
        }
        
        $refData = array_combine($refHeader, $refLine);
        
        // Create lookup key using name + phone
        if (!empty($refData['name']) && !empty($refData['phone']) && 
            !empty($refData['lat']) && !empty($refData['lng'])) {
            $key = trim($refData['name']) . '|' . trim($refData['phone']);
            $referenceData[$key] = [
                'lat' => floatval($refData['lat']),
                'lng' => floatval($refData['lng'])
            ];
        }
    }
    fclose($refCsvFh);
    echo "Loaded " . count($referenceData) . " reference records\n";
}

$csvFh = fopen($json['result']['distribution'][0]['resourceDownloadUrl'], 'r', false, stream_context_create($arrContextOptions));

// Initialize GeoJSON structure
$geojson = [
    'type' => 'FeatureCollection',
    'features' => []
];

// Taiwan bounding box (including Kinmen and Matsu islands)
$taiwanBounds = [
    'minLon' => 118.0,  // Kinmen is around 118.3°E
    'maxLon' => 124.5,
    'minLat' => 21.5,
    'maxLat' => 26.5   // Matsu is around 26.2°N
];

// Process CSV data
$header = null;
$skippedCount = 0;
$totalCount = 0;
$updatedCount = 0;

while($line = fgetcsv($csvFh, 2048)) {
    $totalCount++;
        
    // First line is header
    if($header === null) {
        $header = $line;
        $header[0] = '序號';
        continue;
    }
    
    // Combine header with values
    $data = array_combine($header, $line);
    
    // Convert coordinates to float
    $lon = floatval($data['經度']);
    $lat = floatval($data['緯度']);
    
    // Check for coordinate updates from reference data
    if (!empty($data['避難收容處所名稱']) && !empty($data['管理人電話'])) {
        $lookupKey = trim($data['避難收容處所名稱']) . '|' . trim($data['管理人電話']);
        if (isset($referenceData[$lookupKey])) {
            $lon = $referenceData[$lookupKey]['lng'];
            $lat = $referenceData[$lookupKey]['lat'];
            $updatedCount++;
        }
    }
    
    // Skip if no coordinates after lookup
    if(empty($lon) || empty($lat)) {
        $skippedCount++;
        continue;
    }
    
    // Skip points outside Taiwan
    // if($lon < $taiwanBounds['minLon'] || $lon > $taiwanBounds['maxLon'] || 
    //    $lat < $taiwanBounds['minLat'] || $lat > $taiwanBounds['maxLat']) {
    //     $skippedCount++;
    //     continue;
    // }
    
    // Create GeoJSON feature
    $feature = [
        'type' => 'Feature',
        'geometry' => [
            'type' => 'Point',
            'coordinates' => [
                $lon,
                $lat
            ]
        ],
        'properties' => [
            'id' => $data['序號'],
            'name' => $data['避難收容處所名稱'],
            'address' => $data['避難收容處所地址'],
            'county' => $data['縣市及鄉鎮市區'],
            'village' => $data['村里'],
            'capacity' => $data['預計收容人數'],
            'village_capacity' => $data['預計收容村里'],
            'disaster_types' => $data['適用災害類別'],
            'manager_name' => $data['管理人姓名'],
            'manager_phone' => $data['管理人電話'],
            'indoor' => ($data['室內'] == '是'),
            'outdoor' => ($data['室外'] == '是'),
            'weak_suitable' => ($data['適合避難弱者安置'] == '是')
        ]
    ];
    
    // Add feature to GeoJSON
    $geojson['features'][] = $feature;
}

// Close the file handle
fclose($csvFh);

// Save GeoJSON to file
$outputDir = __DIR__ . '/../json';
if (!file_exists($outputDir)) {
    mkdir($outputDir, 0755, true);
}

file_put_contents($outputDir . '/points.json', json_encode($geojson, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

echo "GeoJSON data saved to " . $outputDir . "/points.json\n";
echo "Total records: " . $totalCount . "\n";
echo "Skipped records: " . $skippedCount . "\n";
echo "Included records: " . count($geojson['features']) . "\n";
echo "Updated coordinates: " . $updatedCount . "\n";