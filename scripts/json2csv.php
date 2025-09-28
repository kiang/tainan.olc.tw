<?php
/**
 * Convert JSON data files to CSV format for Google Sheets import
 * Generates UUID for each record and maps fields to match spreadsheet columns
 */

// Function to generate UUID v4
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Function to convert JSON to CSV
function jsonToCSV($jsonFile, $outputFile, $dataType) {
    if (!file_exists($jsonFile)) {
        echo "Error: File $jsonFile not found\n";
        return false;
    }
    
    $jsonData = json_decode(file_get_contents($jsonFile), true);
    if (!$jsonData || !isset($jsonData['features'])) {
        echo "Error: Invalid JSON structure in $jsonFile\n";
        return false;
    }
    
    // Define column headers matching Google Sheets structure
    // Columns: 通報時間, 照片, 通報內容, 聯絡資訊與說明, 鄉鎮市區, 村里, 緯度, 經度, UUID
    $headers = ['通報時間', '照片', '通報內容', '聯絡資訊與說明', '鄉鎮市區', '村里', '緯度', '經度', 'UUID'];
    
    // Open CSV file for writing
    $fp = fopen($outputFile, 'w');
    if (!$fp) {
        echo "Error: Cannot open output file $outputFile\n";
        return false;
    }
    
    // Write UTF-8 BOM for Excel compatibility
    fprintf($fp, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Write headers
    fputcsv($fp, $headers);
    
    // Process each feature
    foreach ($jsonData['features'] as $feature) {
        $row = [];
        $props = $feature['properties'] ?? [];
        $geometry = $feature['geometry'] ?? [];
        
        // Extract coordinates
        $lat = '';
        $lng = '';
        if (isset($geometry['coordinates']) && is_array($geometry['coordinates'])) {
            $lng = $geometry['coordinates'][0] ?? '';
            $lat = $geometry['coordinates'][1] ?? '';
        }
        
        // Get current timestamp in correct format
        $hour = date('G');
        $ampm = ($hour < 12) ? '上午' : '下午';
        $timestamp = date('Y/n/j') . ' ' . $ampm . ' ' . date('g:i:s');
        
        // Map fields based on data type
        switch ($dataType) {
            case 'demands':
                // From demands.json (救災需求)
                $row[] = $props['時間戳記'] ?? $timestamp; // 通報時間
                $row[] = ''; // 照片 (empty)
                
                // Determine type based on content - default to 需要志工, but check for 需要物資
                $demandType = '需要志工';
                if (!empty($props['需要的物資']) && empty($props['需要的人力'])) {
                    $demandType = '需要物資';
                } elseif (!empty($props['需要的物資']) && !empty($props['需要的人力'])) {
                    // If both are needed, prioritize volunteer need
                    $demandType = '需要志工';
                }
                $row[] = $demandType; // 通報內容 (simple type)
                
                // Combine contact info with additional details
                $contactInfo = $props['聯繫方式'] ?? '';
                $additionalInfo = formatDemandDetails($props);
                $fullContact = trim($contactInfo . ($additionalInfo ? '；' . $additionalInfo : ''));
                $row[] = $fullContact; // 聯絡資訊與說明
                
                // Extract town and village from address or name
                list($town, $village) = extractLocation($props);
                $row[] = $town; // 鄉鎮市區
                $row[] = $village; // 村里
                break;
                
            case 'stay':
                // From stay.json (住宿點)
                $row[] = $timestamp; // 通報時間
                $row[] = ''; // 照片 (empty)
                $row[] = '提供住宿點'; // 通報內容 (simple type)
                
                // Combine contact with place name and additional details
                $placeName = $props['name'] ?? '';
                $contactDetails = formatStayInfo($props);
                $fullContact = trim($placeName . ($contactDetails ? '；' . $contactDetails : ''));
                $row[] = $fullContact; // 聯絡資訊與說明
                
                // Extract town and village
                $row[] = $props['town'] ?? '光復鄉'; // 鄉鎮市區
                $row[] = extractVillageFromAddress($props['address'] ?? ''); // 村里
                break;
                
            case 'wash':
                // From wash_points.json (洗澡點)
                $row[] = $timestamp; // 通報時間
                $row[] = ''; // 照片 (empty)
                $row[] = '提供洗澡點'; // 通報內容 (simple type)
                
                // Combine contact with place name and additional details
                $placeName = $props['name'] ?? '';
                $contactDetails = formatWashInfo($props);
                $fullContact = trim($placeName . ($contactDetails ? '；' . $contactDetails : ''));
                $row[] = $fullContact; // 聯絡資訊與說明
                
                // Extract town and village from address
                $row[] = '光復鄉'; // 鄉鎮市區 (default to 光復鄉)
                $row[] = extractVillageFromAddress($props['address'] ?? ''); // 村里
                break;
        }
        
        // Add coordinates
        $row[] = $lat; // 緯度
        $row[] = $lng; // 經度
        
        // Generate UUID
        $row[] = generateUUID(); // UUID
        
        // Write row to CSV
        fputcsv($fp, $row);
    }
    
    fclose($fp);
    
    $count = count($jsonData['features']);
    echo "Successfully converted $count records from $jsonFile to $outputFile\n";
    return true;
}

// Helper function to format demand details (for contact field)
function formatDemandDetails($props) {
    $details = [];
    
    if (!empty($props['地點'])) {
        $details[] = '地點: ' . $props['地點'];
    }
    
    if (!empty($props['需要的物資'])) {
        $details[] = '需要物資: ' . $props['需要的物資'];
    }
    
    if (!empty($props['需要的人力'])) {
        $details[] = '需要人力: ' . $props['需要的人力'];
    }
    
    if (!empty($props['備註'])) {
        $details[] = '備註: ' . $props['備註'];
    }
    
    return implode('；', $details);
}

// Helper function to format stay info
function formatStayInfo($props) {
    $info = [];
    
    if (!empty($props['contact'])) {
        $info[] = '聯絡: ' . $props['contact'];
    }
    
    if (!empty($props['address'])) {
        $info[] = '地址: ' . $props['address'];
    }
    
    if (!empty($props['date'])) {
        $info[] = '日期: ' . $props['date'];
    }
    
    if (!empty($props['notes'])) {
        $info[] = '備註: ' . $props['notes'];
    }
    
    return implode('；', $info);
}

// Helper function to format wash point info
function formatWashInfo($props) {
    $info = [];
    
    if (!empty($props['address'])) {
        $info[] = '地址: ' . $props['address'];
    }
    
    if (!empty($props['schedule'])) {
        $info[] = '時段: ' . $props['schedule'];
    }
    
    return implode('；', $info);
}

// Helper function to extract town and village from properties
function extractLocation($props) {
    $town = '光復鄉'; // Default
    $village = '';
    
    // Try to extract from various fields
    if (!empty($props['地點'])) {
        // Parse address to extract location
        $address = $props['地點'];
        if (strpos($address, '鄉') !== false) {
            preg_match('/(\w+鄉)/', $address, $matches);
            if (!empty($matches[1])) {
                $town = $matches[1];
            }
        }
        if (strpos($address, '村') !== false) {
            preg_match('/(\w+村)/', $address, $matches);
            if (!empty($matches[1])) {
                $village = $matches[1];
            }
        }
    }
    
    return [$town, $village];
}

// Helper function to extract village from address
function extractVillageFromAddress($address) {
    if (empty($address)) {
        return '';
    }
    
    // Try to extract village name
    if (strpos($address, '村') !== false) {
        preg_match('/(\w+村)/', $address, $matches);
        if (!empty($matches[1])) {
            return $matches[1];
        }
    }
    
    return '';
}

// Main execution
echo "JSON to CSV Converter for Guangfu Disaster Relief Data\n";
echo "=======================================================\n\n";

// Define file paths
$basePath = __DIR__ . '/../docs/p/guangfu250923/data/';
$outputPath = __DIR__ . '/output/';

// Create output directory if it doesn't exist
if (!file_exists($outputPath)) {
    mkdir($outputPath, 0755, true);
}

// Convert each JSON file
$conversions = [
    ['demands.json', 'demands.csv', 'demands'],
    ['stay.json', 'stay.csv', 'stay'],
    ['wash_points.json', 'wash_points.csv', 'wash']
];

foreach ($conversions as $conversion) {
    list($inputFile, $outputFile, $dataType) = $conversion;
    
    echo "Converting $inputFile...\n";
    jsonToCSV(
        $basePath . $inputFile,
        $outputPath . $outputFile,
        $dataType
    );
    echo "\n";
}

echo "Conversion complete!\n";
echo "CSV files saved to: " . realpath($outputPath) . "\n\n";
echo "You can now import these CSV files into Google Sheets.\n";
echo "Make sure to select 'UTF-8' encoding when importing.\n";