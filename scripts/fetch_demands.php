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

echo "KML data fetched successfully. Converting to GeoJSON...\n";

// Create temp directory
if (!file_exists($temp_dir)) {
    mkdir($temp_dir, 0777, true);
}

// Use k2g tool to convert KML to GeoJSON
exec("/home/kiang/.local/bin/k2g {$temp_kml} {$temp_dir}");

// Look for the generated GeoJSON file
$geojson_file = $temp_dir . '/style.json';
if (!file_exists($geojson_file)) {
    // Try alternative filename
    $geojson_file = $temp_dir . '/demands.geojson';
    if (!file_exists($geojson_file)) {
        die("Error: Could not find generated GeoJSON file\n");
    }
}

// Read and process the GeoJSON
$geojson_content = file_get_contents($geojson_file);
if ($geojson_content === false) {
    die("Error: Could not read GeoJSON file\n");
}

$geojson_array = json_decode($geojson_content, true);
if (!$geojson_array) {
    die("Error: Could not parse GeoJSON data\n");
}

// Process features to extract additional properties from original KML
if (isset($geojson_array['features'])) {
    // Load KML as DOM to extract additional properties
    $dom = new DOMDocument();
    $dom->loadXML($kml_content);
    $xpath = new DOMXPath($dom);
    
    // Register KML namespace
    $xpath->registerNamespace('kml', 'http://www.opengis.net/kml/2.2');
    
    // Get all placemarks
    $placemarks = $xpath->query('//kml:Placemark');
    
    foreach ($geojson_array['features'] as $index => &$feature) {
        if ($index < $placemarks->length) {
            $placemark = $placemarks->item($index);
            
            // Extract name
            $nameNode = $xpath->query('.//kml:name', $placemark)->item(0);
            if ($nameNode) {
                $feature['properties']['name'] = $nameNode->textContent;
            }
            
            // Extract description
            $descNode = $xpath->query('.//kml:description', $placemark)->item(0);
            if ($descNode) {
                $feature['properties']['description'] = $descNode->textContent;
                
                // Determine demand type based on description
                $desc = strtolower($descNode->textContent);
                if (strpos($desc, '人力') !== false || strpos($desc, 'labor') !== false) {
                    $feature['properties']['demand_type'] = 'labor';
                    $feature['properties']['demand_type_zh'] = '需要人力';
                } elseif (strpos($desc, '物資') !== false || strpos($desc, 'supplies') !== false) {
                    $feature['properties']['demand_type'] = 'supplies';
                    $feature['properties']['demand_type_zh'] = '需要物資';
                } elseif (strpos($desc, '機具') !== false || strpos($desc, 'equipment') !== false) {
                    $feature['properties']['demand_type'] = 'equipment';
                    $feature['properties']['demand_type_zh'] = '需要機具';
                } else {
                    $feature['properties']['demand_type'] = 'mixed';
                    $feature['properties']['demand_type_zh'] = '綜合需求';
                }
            }
        }
    }
}

// Save processed GeoJSON file
$json_output = json_encode($geojson_array, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if (file_put_contents($output_file, $json_output) === false) {
    die("Error: Could not write GeoJSON file\n");
}

// Clean up temp files
unlink($temp_kmz);
unlink($temp_kml);
if (file_exists($geojson_file)) {
    unlink($geojson_file);
}
rmdir($temp_dir);

echo "Success! GeoJSON file saved to: " . $output_file . "\n";
echo "Features processed: " . count($geojson_array['features'] ?? []) . "\n";
?>