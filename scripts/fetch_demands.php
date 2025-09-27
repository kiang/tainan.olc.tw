<?php
// Fetch Google My Maps KML and convert to GeoJSON
// Run this script to update the disaster demands data

// Google My Maps KML URL
$kml_url = 'https://www.google.com/maps/d/kml?mid=1z3Lh3pKucPyjFiq-OVOQeAAJ_Y3viQk';

// Temp and output file paths
$temp_kmz = '/tmp/demands.kmz';
$temp_kml = '/tmp/demands.kml';
$temp_dir = '/tmp/demands_json';
$output_file = __DIR__ . '/../docs/p/guangfu250923/data/demands.json';

echo "Fetching KMZ data from Google My Maps...\n";

// Fetch KMZ data (Google My Maps exports as KMZ, not KML)
$kmz_content = file_get_contents($kml_url);

if ($kmz_content === false) {
    die("Error: Could not fetch KMZ data from URL\n");
}

// Save to temp file
if (file_put_contents($temp_kmz, $kmz_content) === false) {
    die("Error: Could not save temp KMZ file\n");
}

echo "KMZ data fetched successfully. Extracting KML...\n";

// Extract KML from KMZ (which is a ZIP file)
$zip = new ZipArchive;
if ($zip->open($temp_kmz) === TRUE) {
    // Extract doc.kml from the KMZ
    $kml_content = $zip->getFromName('doc.kml');
    if ($kml_content === false) {
        $zip->close();
        die("Error: Could not extract doc.kml from KMZ\n");
    }
    $zip->close();
    
    // Save extracted KML
    if (file_put_contents($temp_kml, $kml_content) === false) {
        die("Error: Could not save extracted KML file\n");
    }
} else {
    die("Error: Could not open KMZ file\n");
}

echo "Manually parsing KML to extract all placemarks...\n";

// Create geocoding cache directory
$geocodingDir = __DIR__ . '/geocoding';
if (!file_exists($geocodingDir)) {
    mkdir($geocodingDir, 0777, true);
}

// Geocoding function using NLSC API
function geocodeAddress($address, $geocodingDir) {
    $filename = $geocodingDir . '/' . md5($address) . '.json';
    
    // Check if geocoding result already exists
    if (file_exists($filename)) {
        return json_decode(file_get_contents($filename), true);
    }
    
    echo "Geocoding: $address\n";
    
    // First API call to get autocomplete suggestion
    $command = <<<EOD
curl 'https://api.nlsc.gov.tw/MapSearch/ContentSearch?word=___KEYWORD___&mode=AutoComplete&count=1&feedback=XML' \
   -H 'Accept: application/xml, text/xml, */*; q=0.01' \
   -H 'Accept-Language: zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7' \
   -H 'Connection: keep-alive' \
   -H 'Origin: https://maps.nlsc.gov.tw' \
   -H 'Referer: https://maps.nlsc.gov.tw/' \
   -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
EOD;

    $result = shell_exec(strtr($command, [
        '___KEYWORD___' => urlencode($address),
    ]));
    
    $cleanKeyword = trim(strip_tags($result));
    
    if (empty($cleanKeyword)) {
        $geocodeResult = ['error' => 'No autocomplete result'];
        file_put_contents($filename, json_encode($geocodeResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return $geocodeResult;
    }
    
    // Second API call to get actual coordinates
    $command = <<<EOD
curl 'https://api.nlsc.gov.tw/MapSearch/QuerySearch' \
  -H 'Accept: application/xml, text/xml, */*; q=0.01' \
  -H 'Accept-Language: zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
  -H 'Origin: https://maps.nlsc.gov.tw' \
  -H 'Referer: https://maps.nlsc.gov.tw/' \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' \
  --data-raw 'word=___KEYWORD___&feedback=XML&center=120.218280%2C23.007292'
EOD;

    $result = shell_exec(strtr($command, [
        '___KEYWORD___' => urlencode(urlencode($cleanKeyword)),
    ]));
    
    $xml = simplexml_load_string($result);
    $json = json_decode(json_encode($xml), true);
    
    if (!empty($json['ITEM']['LOCATION'])) {
        $parts = explode(',', $json['ITEM']['LOCATION']);
        if (count($parts) === 2) {
            $geocodeResult = [
                'address' => $address,
                'autocomplete' => $cleanKeyword,
                'lng' => floatval(trim($parts[0])),
                'lat' => floatval(trim($parts[1]))
            ];
        } else {
            $geocodeResult = ['error' => 'Invalid location format'];
        }
    } else {
        $geocodeResult = ['error' => 'No location found'];
    }
    
    file_put_contents($filename, json_encode($geocodeResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    // Add a small delay to be respectful to the API
    sleep(1);
    
    return $geocodeResult;
}

// Manually parse KML to create GeoJSON (avoiding k2g tool issues with multiple folders)
$dom = new DOMDocument();
$dom->loadXML($kml_content);
$xpath = new DOMXPath($dom);

// Register KML namespace
$xpath->registerNamespace('kml', 'http://www.opengis.net/kml/2.2');

// Get all placemarks from all folders
$placemarks = $xpath->query('//kml:Placemark');

$features = [];

foreach ($placemarks as $placemark) {
    // Extract name
    $nameNode = $xpath->query('.//kml:name', $placemark)->item(0);
    $name = $nameNode ? $nameNode->textContent : '';
    
    // Extract description
    $descNode = $xpath->query('.//kml:description', $placemark)->item(0);
    $description = $descNode ? $descNode->textContent : '';
    
    // Extract coordinates - try Point/coordinates first, then address field
    $lng = 0;
    $lat = 0;
    
    $coordNode = $xpath->query('.//kml:coordinates', $placemark)->item(0);
    if ($coordNode) {
        // Standard KML Point coordinates
        $coordText = trim($coordNode->textContent);
        $coords = explode(',', $coordText);
        
        if (count($coords) >= 2) {
            $lng = floatval($coords[0]);
            $lat = floatval($coords[1]);
        }
    } else {
        // Try address field (used in manual entries)
        $addressNode = $xpath->query('.//kml:address', $placemark)->item(0);
        if ($addressNode) {
            $addressText = trim($addressNode->textContent);
            $coords = explode(' ', $addressText);
            if (count($coords) >= 2) {
                $lat = floatval($coords[0]);  // lat first in address
                $lng = floatval($coords[1]);  // lng second in address
            }
        }
        
        // Also try ExtendedData Latitude/Longitude
        if ($lat == 0 && $lng == 0) {
            $latData = $xpath->query('.//kml:ExtendedData/kml:Data[@name="Latitude"]/kml:value', $placemark)->item(0);
            $lngData = $xpath->query('.//kml:ExtendedData/kml:Data[@name="Longitude"]/kml:value', $placemark)->item(0);
            
            if ($latData && $lngData) {
                $lat = floatval($latData->textContent);
                $lng = floatval($lngData->textContent);
            }
        }
    }
    
    // If still no coordinates, try geocoding from address in description or extended data
    if ($lat == 0 && $lng == 0) {
        // Try to extract address from description or extended data
        $addressToGeocode = '';
        
        // Look for address in extended data first
        $addressData = $xpath->query('.//kml:ExtendedData/kml:Data[@name="地點"]/kml:value', $placemark)->item(0);
        if ($addressData) {
            $addressToGeocode = $addressData->textContent;
        }
        
        // If no address in extended data, try to extract from description
        if (empty($addressToGeocode) && $description) {
            // Look for address patterns in description
            if (preg_match('/地點:\s*([^<\n]+)/', $description, $matches)) {
                $addressToGeocode = trim($matches[1]);
            }
        }
        
        // Geocode the address if we found one
        if (!empty($addressToGeocode)) {
            // Ensure address includes 花蓮縣 for better geocoding
            if (strpos($addressToGeocode, '花蓮縣') === false && strpos($addressToGeocode, '光復') !== false) {
                $addressToGeocode = '花蓮縣' . $addressToGeocode;
            }
            
            $geocodeResult = geocodeAddress($addressToGeocode, $geocodingDir);
            if (isset($geocodeResult['lng']) && isset($geocodeResult['lat'])) {
                $lng = $geocodeResult['lng'];
                $lat = $geocodeResult['lat'];
                echo "Geocoded $addressToGeocode to $lng, $lat\n";
            }
        }
    }
    
    if ($lat == 0 && $lng == 0) continue;
    
    // Determine demand type based on description and name
    $combinedText = strtolower($description . ' ' . $name);
    $demandType = 'mixed';
    $demandTypeZh = '綜合需求';
    
    if (strpos($combinedText, '人力') !== false || strpos($combinedText, 'labor') !== false) {
        $demandType = 'labor';
        $demandTypeZh = '需要人力';
    } elseif (strpos($combinedText, '物資') !== false || strpos($combinedText, 'supplies') !== false) {
        $demandType = 'supplies';
        $demandTypeZh = '需要物資';
    } elseif (strpos($combinedText, '機具') !== false || strpos($combinedText, 'equipment') !== false) {
        $demandType = 'equipment';
        $demandTypeZh = '需要機具';
    }
    
    // Extract additional data from ExtendedData if present
    $extendedData = [];
    $extDataNodes = $xpath->query('.//kml:ExtendedData/kml:Data', $placemark);
    foreach ($extDataNodes as $dataNode) {
        $dataName = $dataNode->getAttribute('name');
        $valueNode = $xpath->query('.//kml:value', $dataNode)->item(0);
        if ($valueNode) {
            $extendedData[$dataName] = $valueNode->textContent;
        }
    }
    
    // Create feature
    $feature = [
        'type' => 'Feature',
        'geometry' => [
            'type' => 'Point',
            'coordinates' => [$lng, $lat]
        ],
        'properties' => [
            'name' => $name,
            'description' => $description,
            'demand_type' => $demandType,
            'demand_type_zh' => $demandTypeZh
        ]
    ];
    
    // Add extended data to properties
    foreach ($extendedData as $key => $value) {
        $feature['properties'][$key] = $value;
    }
    
    $features[] = $feature;
}

// Create GeoJSON structure
$geojson_array = [
    'type' => 'FeatureCollection',
    'features' => $features
];


// Save processed GeoJSON file
$json_output = json_encode($geojson_array, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if (file_put_contents($output_file, $json_output) === false) {
    die("Error: Could not write GeoJSON file\n");
}

// Clean up temp files
unlink($temp_kmz);
unlink($temp_kml);

echo "Success! GeoJSON file saved to: " . $output_file . "\n";
echo "Features processed: " . count($geojson_array['features'] ?? []) . "\n";
?>