<?php
/**
 * Look up registered addresses for entries in raw/oil_products/list.json
 * through the g0v GCIS mirror API, output raw/oil_products/addresses.json
 */
$basePath = dirname(__DIR__, 2);
$listFile = $basePath . '/raw/oil_products/list.json';
$cachePath = $basePath . '/raw/oil_products/gcis';
$outFile = $basePath . '/raw/oil_products/addresses.json';

if (!file_exists($cachePath)) {
    mkdir($cachePath, 0777, true);
}

function normalizeTai($str)
{
    return strtr($str, ['臺' => '台']);
}

function isAnonymized($name)
{
    // personal names are masked like 蔡O彤 / 謝O齡
    return preg_match('/[\x{4e00}-\x{9fff}][OＯ0][\x{4e00}-\x{9fff}]/u', $name)
        || preg_match('/[\x{4e00}-\x{9fff}][OＯ]$/u', $name);
}

function nameVariants($name)
{
    $variants = [$name];

    $v = $name;
    // 零售-XXX / 現兌-XXX prefixes
    $v = preg_replace('/^(零售|現兌)[-–]/u', '', $v);
    // (股) abbreviation
    $v = str_replace(['(股)公司', '（股）公司'], '股份有限公司', $v);
    // brackets and trailing parentheticals
    $v = preg_replace('/【[^】]*】/u', '', $v);
    $v = preg_replace('/[\(（][^\)）]*[\)）]$/u', '', $v);
    $variants[] = trim($v);

    // part before space (e.g. 樂豐 台南物流倉庫)
    $parts = preg_split('/\s+/u', $v);
    $variants[] = trim($parts[0]);

    // part before dash (e.g. 聯華食品工業股份有限公司-基隆, 瑔盛-油脂)
    $dashed = preg_split('/[-–]+/u', $v);
    $variants[] = trim($dashed[0]);

    // company base name of a branch / affiliated unit
    // (e.g. 大買家股份有限公司大里國光分公司, 福懋興業股份有限公司職工福利委員會)
    if (preg_match('/^(.+?公司)./u', $v, $matches)) {
        $variants[] = $matches[1];
    }
    // drop trailing store descriptors (e.g. 溢鼎鱻海鮮館漁港店)
    $variants[] = trim(preg_replace('/(分?店|門市)$/u', '', $v));

    // drop trailing 倉庫 / 營業所 / 倉
    $variants[] = trim(preg_replace('/(倉庫|營業所|新?倉)$/u', '', trim($dashed[0])));

    $out = [];
    foreach ($variants as $item) {
        if (mb_strlen($item) >= 2 && !in_array($item, $out)) {
            $out[] = $item;
        }
    }
    return $out;
}

function gcisSearch($keyword, $cachePath)
{
    $cacheFile = $cachePath . '/' . md5($keyword) . '.json';
    if (file_exists($cacheFile)) {
        return json_decode(file_get_contents($cacheFile), true);
    }
    $url = 'http://gcis.nat.g0v.tw/api/search?q=' . urlencode($keyword) . '&page=1';
    $content = false;
    for ($try = 0; $try < 3 && false === $content; $try++) {
        $content = @file_get_contents($url, false, stream_context_create([
            'http' => ['timeout' => 30],
        ]));
        if (false === $content) {
            sleep(2);
        }
    }
    $json = json_decode($content, true);
    if (!is_array($json)) {
        echo "  ! api failed for {$keyword}\n";
        return null;
    }
    file_put_contents($cacheFile, json_encode($json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    usleep(500000);
    return $json;
}

function pickCandidate($items, $keyword, $counties)
{
    $counties = array_map('normalizeTai', $counties);
    $candidates = [];
    foreach ($items as $item) {
        $name = $item['公司名稱'] ?? $item['商業名稱'] ?? '';
        if (is_array($name)) {
            $name = implode('', $name);
        }
        $address = $item['公司所在地'] ?? $item['地址'] ?? '';
        if (empty($address)) {
            continue;
        }
        $status = $item['現況'] ?? $item['公司狀況'] ?? '';

        $score = 0;
        if ($name === $keyword) {
            $score += 100;
        } elseif (false !== mb_strpos($name, $keyword)) {
            $score += 20;
        } else {
            continue;
        }
        $countyMatched = false;
        foreach ($counties as $county) {
            if (0 === mb_strpos(normalizeTai($address), $county)) {
                $countyMatched = true;
                break;
            }
        }
        if ($countyMatched) {
            $score += 50;
        }
        if ('' === $status || false !== mb_strpos($status, '核准設立')) {
            $score += 10;
        } elseif (preg_match('/(歇業|解散|廢止|撤銷|停業)/u', $status)) {
            $score -= 30;
        }
        $candidates[] = [
            'score' => $score,
            'name' => $name,
            'address' => $address,
            'status' => $status,
            'id' => $item['統一編號'] ?? '',
        ];
    }
    if (empty($candidates)) {
        return null;
    }
    usort($candidates, function ($a, $b) {
        return $b['score'] - $a['score'];
    });
    // county must match unless the candidate is a unique exact-name hit
    if ($candidates[0]['score'] < 150) {
        $exact = array_filter($candidates, function ($c) {
            return $c['score'] >= 100;
        });
        if (1 !== count($exact) || $candidates[0]['score'] < 100) {
            return null;
        }
    }
    return $candidates[0];
}

$list = json_decode(file_get_contents($listFile), true);
$result = [];
$found = 0;
$skipped = 0;
foreach ($list as $entry) {
    $seq = $entry['seq'];
    if (isAnonymized($entry['name'])) {
        $result[$seq] = ['status' => 'anonymized'];
        $skipped++;
        continue;
    }
    $matched = null;
    foreach (nameVariants($entry['name']) as $keyword) {
        $json = gcisSearch($keyword, $cachePath);
        if (empty($json['data'])) {
            continue;
        }
        $matched = pickCandidate($json['data'], $keyword, $entry['counties']);
        if (null !== $matched) {
            $matched['keyword'] = $keyword;
            break;
        }
    }
    if (null !== $matched) {
        unset($matched['score']);
        $matched['status'] = 'found';
        $result[$seq] = $matched;
        $found++;
        echo "{$seq} {$entry['name']} => {$matched['address']}\n";
    } else {
        $result[$seq] = ['status' => 'not_found'];
        echo "{$seq} {$entry['name']} => NOT FOUND\n";
    }
}

file_put_contents($outFile, json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo sprintf("total %d, found %d, anonymized %d, not found %d\n",
    count($list), $found, $skipped, count($list) - $found - $skipped);
