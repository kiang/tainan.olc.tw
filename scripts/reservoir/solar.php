<?php

$url = 'https://www.wra.gov.tw/cp.aspx?n=45013';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; DataBot/1.0)');
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || empty($html)) {
    echo "Failed to fetch page (HTTP {$httpCode})\n";
    exit(1);
}

$dom = new DOMDocument();
@$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
$xpath = new DOMXPath($dom);

$reservoirs = [];

// The page uses a dl/dt/dd structure to list reservoirs
// Try to find reservoir names in dt elements within the content area
$dtNodes = $xpath->query('//div[contains(@class,"cp")]//dt | //div[contains(@class,"area-essay")]//dt | //div[@id="ContentPlaceHolder1_divContent"]//dt');

if ($dtNodes->length > 0) {
    foreach ($dtNodes as $dt) {
        $name = trim($dt->textContent);
        if (!empty($name) && mb_strlen($name) < 20) {
            $reservoirs[] = ['name' => $name];
        }
    }
}

// Fallback: try table rows
if (empty($reservoirs)) {
    $rows = $xpath->query('//table//tr');
    foreach ($rows as $i => $row) {
        $cells = $row->getElementsByTagName('td');
        if ($cells->length > 0) {
            $name = trim($cells->item(0)->textContent);
            if (!empty($name) && $name !== '水庫') {
                $reservoirs[] = ['name' => $name];
            }
        }
    }
}

// Fallback: try list items
if (empty($reservoirs)) {
    $lis = $xpath->query('//div[contains(@class,"cp")]//li | //div[contains(@class,"area-essay")]//li | //div[@id="ContentPlaceHolder1_divContent"]//li');
    foreach ($lis as $li) {
        $name = trim($li->textContent);
        if (!empty($name) && mb_strlen($name) < 20 && !preg_match('/水質|淨水/', $name)) {
            $reservoirs[] = ['name' => $name];
        }
    }
}

// Fallback: regex scan for known reservoir patterns
if (empty($reservoirs)) {
    $knownReservoirs = ['烏山頭', '阿公店', '鳳山', '金湖', '內埔子', '鹽水埤'];
    foreach ($knownReservoirs as $name) {
        if (mb_strpos($html, $name) !== false) {
            $reservoirs[] = ['name' => $name];
        }
    }
    if (!empty($reservoirs)) {
        echo "Warning: used regex fallback to find reservoir names\n";
    }
}

if (empty($reservoirs)) {
    echo "No reservoirs found on page\n";
    exit(1);
}

echo "Found " . count($reservoirs) . " reservoirs with floating solar panels:\n";
foreach ($reservoirs as $r) {
    echo "  - {$r['name']}\n";
}

$output = [
    'reservoirs' => $reservoirs,
    'source' => $url,
    'last_updated' => date('Y-m-d'),
    'description' => '設有浮動式太陽光電之水庫清單',
];

$outputPath = __DIR__ . '/../../docs/p/reservoir/data/floating_solar.json';
$outputDir = dirname($outputPath);
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
}

file_put_contents($outputPath, json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
echo "Written to {$outputPath}\n";
