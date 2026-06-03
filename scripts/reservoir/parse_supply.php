<?php

$basePath = __DIR__ . '/../../';
$cityPath = '/home/kiang/public_html/taiwan_basecode/city/city.geo.json';
$csvPath = $basePath . 'docs/p/reservoir/data/supp7.csv';
$outputPath = $basePath . 'docs/p/reservoir/data/plants.json';

// Load administrative area names for matching
echo "Loading administrative area data...\n";

$cityGeo = json_decode(file_get_contents($cityPath), true);

// Build lookup tables
$counties = []; // name => COUNTYCODE
$towns = [];    // name => [TOWNCODE => full_info]

// County names from city.geo.json
foreach ($cityGeo['features'] as $f) {
    $p = $f['properties'];
    $counties[$p['COUNTYNAME']] = $p['COUNTYCODE'];
    $key = $p['TOWNNAME'];
    if (!isset($towns[$key])) {
        $towns[$key] = [];
    }
    $towns[$key][$p['TOWNCODE']] = [
        'county' => $p['COUNTYNAME'],
        'town' => $p['TOWNNAME'],
    ];
}

echo "Loaded: " . count($counties) . " counties, " . count($towns) . " towns\n";

// TWD97 TM2 -> WGS84
function twd97ToWgs84($x, $y) {
    $a = 6378137.0;
    $b = 6356752.314245;
    $lng0 = 121.0 * M_PI / 180;
    $k0 = 0.9999;
    $dx = 250000;
    $dy = 0;

    $e = pow((1 - pow($b, 2) / pow($a, 2)), 0.5);
    $x -= $dx;
    $y -= $dy;

    $M = $y / $k0;
    $mu = $M / ($a * (1.0 - pow($e, 2) / 4.0 - 3 * pow($e, 4) / 64.0 - 5 * pow($e, 6) / 256.0));
    $e1 = (1.0 - pow((1.0 - pow($e, 2)), 0.5)) / (1.0 + pow((1.0 - pow($e, 2)), 0.5));

    $J1 = (3 * $e1 / 2 - 27 * pow($e1, 3) / 32.0);
    $J2 = (21 * pow($e1, 2) / 16 - 55 * pow($e1, 4) / 32.0);
    $J3 = (151 * pow($e1, 3) / 96.0);
    $J4 = (1097 * pow($e1, 4) / 512.0);

    $fp = $mu + $J1 * sin(2 * $mu) + $J2 * sin(4 * $mu) + $J3 * sin(6 * $mu) + $J4 * sin(8 * $mu);

    $e2 = pow(($e * $a / $b), 2);
    $C1 = $e2 * pow(cos($fp), 2);
    $T1 = pow(tan($fp), 2);
    $R1 = $a * (1 - pow($e, 2)) / pow((1 - pow($e, 2) * pow(sin($fp), 2)), 1.5);
    $N1 = $a / pow((1 - pow($e, 2) * pow(sin($fp), 2)), 0.5);
    $D = $x / ($N1 * $k0);

    $Q1 = $N1 * tan($fp) / $R1;
    $Q2 = (pow($D, 2) / 2.0);
    $Q3 = (5 + 3 * $T1 + 10 * $C1 - 4 * pow($C1, 2) - 9 * $e2) * pow($D, 4) / 24.0;
    $Q4 = (61 + 90 * $T1 + 298 * $C1 + 45 * pow($T1, 2) - 3 * pow($C1, 2) - 252 * $e2) * pow($D, 6) / 720.0;

    $lat = $fp - $Q1 * ($Q2 - $Q3 + $Q4);

    $Q5 = $D;
    $Q6 = (1 + 2 * $T1 + $C1) * pow($D, 3) / 6;
    $Q7 = (5 - 2 * $C1 + 28 * $T1 - 3 * pow($C1, 2) + 8 * $e2 + 24 * pow($T1, 2)) * pow($D, 5) / 120.0;

    $lng = $lng0 + ($Q5 - $Q6 + $Q7) / cos($fp);

    return [
        round($lat * 180 / M_PI, 6),
        round($lng * 180 / M_PI, 6),
    ];
}

// Aliases for county/city names
$countyAliases = [
    '台北市' => '臺北市', '台北縣' => '新北市',
    '台中市' => '臺中市', '台中縣' => '臺中市',
    '台南市' => '臺南市', '台南縣' => '臺南市',
    '台東市' => '臺東縣', '台東縣' => '臺東縣',
    '高雄縣' => '高雄市', '桃園縣' => '桃園市',
];

// Town name suffixes to try
$townSuffixes = ['區', '鄉', '鎮', '市'];

function normalizeName($name) {
    $name = str_replace(['台北', '台中', '台南', '台東'], ['臺北', '臺中', '臺南', '臺東'], $name);
    return $name;
}

function resolveCounty($text, $counties, $countyAliases) {
    foreach ($countyAliases as $alias => $real) {
        if (mb_strpos($text, $alias) !== false) return $real;
    }
    foreach ($counties as $name => $code) {
        if (mb_strpos($text, $name) !== false) return $name;
    }
    return null;
}

function parseTowns($text, $towns, $countyHint) {
    $found = [];
    foreach ($towns as $name => $entries) {
        if (mb_strpos($text, $name) !== false) {
            foreach ($entries as $code => $info) {
                if ($countyHint && $info['county'] !== $countyHint) continue;
                $found[$code] = $info;
            }
            if (empty($found) && !$countyHint) {
                foreach ($entries as $code => $info) {
                    $found[$code] = $info;
                }
            }
        }
    }
    return $found;
}

// Parse CSV
echo "Parsing CSV...\n";

$handle = fopen($csvPath, 'r');
$header = fgetcsv($handle);
$plants = [];

while (($row = fgetcsv($handle)) !== false) {
    if (count($row) < 5) continue;

    $plantName = trim($row[1]);
    $x = trim($row[2]);
    $y = trim($row[3]);
    $supplyArea = normalizeName(trim($row[4]));
    $waterSource = isset($row[5]) ? trim($row[5]) : '';

    if (empty($plantName)) continue;

    // Detect county context
    $countyHint = resolveCounty($supplyArea, $counties, $countyAliases);

    // Parse lines separately (multi-line supply areas)
    $lines = preg_split('/\n/', $supplyArea);

    $matchedTowns = [];

    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;

        // Detect per-line county override: e.g. "(桃園區)..." or "新北市..."
        $lineCounty = resolveCounty($line, $counties, $countyAliases);
        $effectiveCounty = $lineCounty ?: $countyHint;

        // Find towns in this line
        $lineTowns = parseTowns($line, $towns, $effectiveCounty);
        foreach ($lineTowns as $code => $info) {
            $matchedTowns[$code] = $info;
        }
    }

    // If no towns found, try the whole text
    if (empty($matchedTowns)) {
        $matchedTowns = parseTowns($supplyArea, $towns, $countyHint);
    }

    // Determine resolution level
    $level = 'unknown';
    if (!empty($matchedTowns)) {
        $level = 'town';
    } elseif ($countyHint) {
        $level = 'county';
    }

    $plant = [
        'name' => $plantName,
        'source' => $waterSource,
        'level' => $level,
        'areas' => [
            'county' => $countyHint,
            'towns' => array_keys($matchedTowns),
        ],
    ];

    if ($x && $y && is_numeric($x) && is_numeric($y)) {
        $coords = twd97ToWgs84(floatval($x), floatval($y));
        $plant['lat'] = $coords[0];
        $plant['lng'] = $coords[1];
    }

    $plants[] = $plant;
}

fclose($handle);

// Stats
$levelCounts = [];
foreach ($plants as $p) {
    $l = $p['level'];
    if (!isset($levelCounts[$l])) $levelCounts[$l] = 0;
    $levelCounts[$l]++;
}

echo "\nParsed " . count($plants) . " plants\n";
echo "Resolution levels:\n";
foreach ($levelCounts as $level => $count) {
    echo "  $level: $count\n";
}

// Show some examples
echo "\n=== Sample results ===\n";
$shown = 0;
foreach ($plants as $p) {
    if ($shown >= 5) break;
    if (count($p['areas']['towns']) > 0) {
        echo "\n{$p['name']} (level: {$p['level']})\n";
        echo "  Source: {$p['source']}\n";
        echo "  County: {$p['areas']['county']}\n";
        echo "  Towns: " . implode(', ', $p['areas']['towns']) . "\n";
        $shown++;
    }
}

// Write output
$output = [
    'generated' => date('Y-m-d'),
    'source' => 'supp7.csv',
    'plants' => $plants,
];

file_put_contents($outputPath, json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
echo "\nWritten to $outputPath\n";
