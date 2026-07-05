<?php
/**
 * Geocode addresses in raw/oil_products/addresses.json through the NLSC
 * MapSearch API, output docs/p/oil_products/data/points.json
 */
$basePath = dirname(__DIR__, 2);
$listFile = $basePath . '/raw/oil_products/list.json';
$addrFile = $basePath . '/raw/oil_products/addresses.json';
$missingFile = $basePath . '/raw/oil_products/missing.json';
$cachePath = $basePath . '/raw/oil_products/nlsc';
$outFile = $basePath . '/docs/p/oil_products/data/points.json';

if (!file_exists($cachePath)) {
    mkdir($cachePath, 0777, true);
}
if (!file_exists(dirname($outFile))) {
    mkdir(dirname($outFile), 0777, true);
}

function nlscCurl($url, $postData = null)
{
    $headers = [
        'Accept: application/xml, text/xml, */*; q=0.01',
        'Accept-Language: zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin: https://maps.nlsc.gov.tw',
        'Referer: https://maps.nlsc.gov.tw/',
        'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    ];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if (null !== $postData) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }
    $result = curl_exec($ch);
    curl_close($ch);
    return $result;
}

function nlscGeocode($address, $cachePath)
{
    $cacheFile = $cachePath . '/' . md5($address) . '.json';
    if (file_exists($cacheFile)) {
        return json_decode(file_get_contents($cacheFile), true);
    }
    $point = null;
    $result = nlscCurl('https://api.nlsc.gov.tw/MapSearch/ContentSearch?word=' . urlencode($address) . '&mode=AutoComplete&count=1&feedback=XML');
    $cleanKeyword = trim(strip_tags($result));
    if (!empty($cleanKeyword)) {
        $result = nlscCurl(
            'https://api.nlsc.gov.tw/MapSearch/QuerySearch',
            'word=' . urlencode(urlencode($cleanKeyword)) . '&feedback=XML&center=120.218280%2C23.007292'
        );
        $xml = @simplexml_load_string($result);
        if (false !== $xml) {
            $json = json_decode(json_encode($xml), true);
            $item = $json['ITEM'] ?? [];
            if (isset($item[0])) {
                $item = $item[0];
            }
            if (!empty($item['LOCATION'])) {
                $parts = explode(',', $item['LOCATION']);
                if (2 === count($parts)) {
                    $point = [
                        'lng' => floatval($parts[0]),
                        'lat' => floatval($parts[1]),
                        'keyword' => $cleanKeyword,
                    ];
                }
            }
        }
    }
    file_put_contents($cacheFile, json_encode([
        'address' => $address,
        'point' => $point,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    usleep(500000);
    return ['address' => $address, 'point' => $point];
}

$list = json_decode(file_get_contents($listFile), true);
$addresses = json_decode(file_get_contents($addrFile), true);

// manual fixes: raw/oil_products/missing.json lists every entry that could
// not be located; fill in lng/lat (or a better address) there by hand and
// rerun this script to bring them onto the map.
$manual = [];
if (file_exists($missingFile)) {
    foreach (json_decode(file_get_contents($missingFile), true) as $item) {
        $manual[$item['seq']] = $item;
    }
}

$features = [];
$unlocated = [];
$located = 0;
foreach ($list as $entry) {
    $seq = $entry['seq'];
    $addr = $addresses[$seq] ?? ['status' => 'not_found'];
    $properties = [
        'seq' => $seq,
        'name' => $entry['name'],
        'counties' => $entry['counties'],
        'products' => $entry['products'],
        'status' => $addr['status'],
    ];
    if ('found' === $addr['status']) {
        $properties['address'] = $addr['address'];
        $properties['gcis_name'] = $addr['name'];
        $properties['gcis_id'] = $addr['id'];
    }
    $point = null;
    if (isset($manual[$seq]) && !empty($manual[$seq]['lng']) && !empty($manual[$seq]['lat'])) {
        $point = [
            'lng' => floatval($manual[$seq]['lng']),
            'lat' => floatval($manual[$seq]['lat']),
        ];
        $properties['status'] = 'manual';
        if (!empty($manual[$seq]['address'])) {
            $properties['address'] = $manual[$seq]['address'];
        }
    } elseif (isset($manual[$seq]) && !empty($manual[$seq]['address'])
        && $manual[$seq]['address'] !== ($properties['address'] ?? null)) {
        $properties['address'] = $manual[$seq]['address'];
        $geo = nlscGeocode($manual[$seq]['address'], $cachePath);
        $point = $geo['point'];
    } elseif (!empty($properties['address'])) {
        $geo = nlscGeocode($properties['address'], $cachePath);
        $point = $geo['point'];
        if (null === $point) {
            echo "{$seq} {$entry['name']} geocode failed: {$properties['address']}\n";
        }
    }
    if (null !== $point) {
        $features[] = [
            'type' => 'Feature',
            'properties' => $properties,
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [$point['lng'], $point['lat']],
            ],
        ];
        $located++;
    } else {
        $unlocated[] = $properties;
    }
}

// refresh the manual-fix worksheet: add newly missing entries, keep
// everything already there (including rows the user has filled in).
foreach ($unlocated as $properties) {
    if (!isset($manual[$properties['seq']])) {
        $manual[$properties['seq']] = [
            'seq' => $properties['seq'],
            'name' => $properties['name'],
            'counties' => $properties['counties'],
            'address' => $properties['address'] ?? '',
            'lng' => null,
            'lat' => null,
        ];
    }
}
ksort($manual);
file_put_contents($missingFile, json_encode(array_values($manual), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

file_put_contents($outFile, json_encode([
    'type' => 'FeatureCollection',
    'features' => $features,
    'unlocated' => $unlocated,
], JSON_UNESCAPED_UNICODE));
echo sprintf("total %d, located %d, unlocated %d -> %s\n",
    count($list), $located, count($unlocated), $outFile);
