<?php
// Fetches social housing data from 內政部不動產資訊平台
// https://pip.moi.gov.tw/V3/B/SCRB0505.aspx
//
// Re-running this script preserves manually set lat/lng coordinates and nicknames

$baseDir = __DIR__ . '/../docs/p/social_housing';
$dataDir = $baseDir . '/data';
$dataFile = $dataDir . '/social_housing.json';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Load existing data to preserve manually set coordinates and nicknames
$existingManual = [];
if (file_exists($dataFile)) {
    $existing = json_decode(file_get_contents($dataFile), true);
    if (is_array($existing)) {
        foreach ($existing as $item) {
            $key = $item['city'] . '_' . $item['name'];
            $manual = [];
            if (!empty($item['lat']) && !empty($item['lng'])) {
                $manual['lat'] = $item['lat'];
                $manual['lng'] = $item['lng'];
            }
            if (!empty($item['nickname'])) {
                $manual['nickname'] = $item['nickname'];
            }
            if (!empty($manual)) {
                $existingManual[$key] = $manual;
            }
        }
    }
}

$cities = [
    '臺北市', '新北市', '桃園市', '新竹縣', '新竹市',
    '基隆市', '宜蘭縣', '臺中市', '苗栗縣', '彰化縣',
    '南投縣', '雲林縣', '臺南市', '高雄市', '嘉義縣',
    '嘉義市', '屏東縣', '花蓮縣', '臺東縣', '澎湖縣',
    '金門縣', '連江縣',
];

$url = 'https://pip.moi.gov.tw/V3/B/SCRB0505.aspx';

function extractFormTokens($html)
{
    $tokens = [];
    if (preg_match('/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]*)"/', $html, $m)) {
        $tokens['__VIEWSTATE'] = $m[1];
    }
    if (preg_match('/name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/', $html, $m)) {
        $tokens['__VIEWSTATEGENERATOR'] = $m[1];
    }
    if (preg_match('/name="__EVENTVALIDATION"\s+id="__EVENTVALIDATION"\s+value="([^"]*)"/', $html, $m)) {
        $tokens['__EVENTVALIDATION'] = $m[1];
    }
    return $tokens;
}

function fetchUrl($url, $postData = null, $cookieFile = null)
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_ENCODING, '');

    if ($cookieFile) {
        curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieFile);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieFile);
    }

    if ($postData) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded',
        ]);
    }

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        echo "  cURL error: {$error}\n";
        return false;
    }
    if ($httpCode !== 200) {
        echo "  HTTP error: {$httpCode}\n";
        return false;
    }

    return $result;
}

function cleanCellText($html)
{
    // Replace <br /> with space, then strip remaining tags and trim
    $text = str_replace(['<br />', '<br/>', '<br>'], ' ', $html);
    $text = strip_tags($text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
}

function parseTableData($html, $city)
{
    $items = [];

    // Find the type1 table (contains all records for the city)
    if (!preg_match('/<div class="table type1[^"]*">(.*?)<\/div>/s', $html, $tableMatch)) {
        return $items;
    }

    $tableHtml = $tableMatch[1];

    // Check for empty table
    if (strpos($tableHtml, '查無資料') !== false) {
        return $items;
    }

    // Parse each data row (skip thead)
    if (!preg_match('/<tbody>(.*?)<\/tbody>/s', $tableHtml, $tbodyMatch)) {
        return $items;
    }

    preg_match_all('/<tr>(.*?)<\/tr>/s', $tbodyMatch[1], $rows);

    foreach ($rows[1] as $row) {
        preg_match_all('/<td[^>]*>(.*?)<\/td>/s', $row, $cells);

        if (count($cells[1]) >= 8) {
            $item = [
                'city' => cleanCellText($cells[1][0]),
                'name' => cleanCellText($cells[1][1]),
                'organizer' => cleanCellText($cells[1][2]),
                'units' => intval(cleanCellText($cells[1][3])),
                'award_date' => cleanCellText($cells[1][4]),
                'start_date' => cleanCellText($cells[1][5]),
                'completion_date' => cleanCellText($cells[1][6]),
                'status' => cleanCellText($cells[1][7]),
                'nickname' => '',
                'lat' => null,
                'lng' => null,
            ];
            $items[] = $item;
        }
    }

    return $items;
}

$cookieFile = tempnam(sys_get_temp_dir(), 'social_housing_');
$allData = [];

foreach ($cities as $city) {
    echo "Fetching data for {$city}...\n";

    // GET main page to extract fresh form tokens
    $html = fetchUrl($url, null, $cookieFile);
    if (!$html) {
        echo "  Failed to fetch main page\n";
        continue;
    }

    $tokens = extractFormTokens($html);
    if (empty($tokens['__VIEWSTATE']) || empty($tokens['__EVENTVALIDATION'])) {
        echo "  Failed to extract form tokens\n";
        continue;
    }

    // POST to select city
    $postData = [
        '__VIEWSTATE' => $tokens['__VIEWSTATE'],
        '__VIEWSTATEGENERATOR' => $tokens['__VIEWSTATEGENERATOR'] ?? '',
        '__VIEWSTATEENCRYPTED' => '',
        '__EVENTVALIDATION' => $tokens['__EVENTVALIDATION'],
        'hfCity' => $city,
        'hfMode' => 'City',
        'btnChooseCity' => '選取',
    ];

    $response = fetchUrl($url, $postData, $cookieFile);
    if (!$response) {
        echo "  Failed to fetch data\n";
        continue;
    }

    $items = parseTableData($response, $city);
    echo "  Found " . count($items) . " items\n";

    $allData = array_merge($allData, $items);

    usleep(500000); // 0.5s delay between requests
}

// Restore previously set coordinates and nicknames
foreach ($allData as &$item) {
    $key = $item['city'] . '_' . $item['name'];
    if (isset($existingManual[$key])) {
        if (isset($existingManual[$key]['lat'])) {
            $item['lat'] = $existingManual[$key]['lat'];
            $item['lng'] = $existingManual[$key]['lng'];
        }
        if (isset($existingManual[$key]['nickname'])) {
            $item['nickname'] = $existingManual[$key]['nickname'];
        }
    }
}
unset($item);

// Clean up cookie file
if (file_exists($cookieFile)) {
    unlink($cookieFile);
}

echo "\nTotal items: " . count($allData) . "\n";
file_put_contents($dataFile, json_encode($allData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Data saved to {$dataFile}\n";
