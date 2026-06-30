<?php
$basePath = dirname(dirname(__DIR__));
$dataPath = $basePath . '/docs/p/2026/data';
$photosPath = $dataPath . '/photos';
$tppJsonPath = $basePath . '/scripts/2026/tpp_candidates_2026.json';
$tppPhotosPath = $basePath . '/scripts/2026/photos';

if (!file_exists($tppJsonPath)) {
    echo "Please place tpp_candidates_2026.json in scripts/2026/\n";
    exit(1);
}

$tppCandidates = json_decode(file_get_contents($tppJsonPath), true);
$candidatesData = json_decode(file_get_contents($dataPath . '/candidates.json'), true);

$variantMap = [
    "\u{5C19}" => "\u{5C1A}", // 尙 -> 尚
];

$nameAlias = [
    '張啓愷' => '張啓楷',
];

function normalizeName($name)
{
    global $variantMap, $nameAlias;
    $name = trim($name);
    $name = strtr($name, $variantMap);
    if (isset($nameAlias[$name])) {
        $name = $nameAlias[$name];
    }
    return $name;
}

function cleanSocialUrl($url)
{
    $parsed = parse_url($url);
    if (!isset($parsed['query'])) {
        return rtrim($url, '?');
    }

    parse_str($parsed['query'], $params);

    $trackingKeys = [
        'fbclid', 'mibextid', 'igsh', 'igshid',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'si', 'invite', 'locale', 'sk',
    ];
    foreach ($trackingKeys as $key) {
        unset($params[$key]);
    }

    $base = $parsed['scheme'] . '://' . $parsed['host'];
    if (!empty($parsed['path'])) {
        $base .= $parsed['path'];
    }
    if (!empty($params)) {
        $base .= '?' . http_build_query($params);
    }

    return $base;
}

$existingByName = [];
foreach ($candidatesData['candidates'] as $idx => $c) {
    $normalized = normalizeName($c['name']);
    $existingByName[$normalized] = $idx;
}

$matched = 0;
$added = 0;
$photoUpdated = 0;

foreach ($tppCandidates as $tpp) {
    $name = normalizeName($tpp['name']);
    $found = false;
    $idx = null;

    if (isset($existingByName[$name])) {
        $found = true;
        $idx = $existingByName[$name];
    }

    if ($found) {
        $candidate = &$candidatesData['candidates'][$idx];
        $matched++;
    } else {
        $added++;
        $election = '';
        if ($tpp['electionType'] === '縣市候選人') {
            $election = '縣市首長';
        } elseif ($tpp['electionType'] === '議員候選人') {
            $election = '直轄市議員';
        } elseif ($tpp['electionType'] === '鄉鎮市區候選人') {
            $election = '鄉鎮市長';
        }
        $newCandidate = [
            'election' => $election,
            'countyCode' => '',
            'countyName' => '',
            'district' => '',
            'number' => 0,
            'name' => $tpp['name'],
            'nameEn' => '',
            'party' => '台灣民眾黨',
            'partyEn' => '',
            'gender' => '',
            'age' => 0,
            'education' => '',
            'experience' => '',
            'platform' => '',
            'platformEn' => '',
            'photo' => '',
        ];
        $candidatesData['candidates'][] = $newCandidate;
        $idx = count($candidatesData['candidates']) - 1;
        $candidate = &$candidatesData['candidates'][$idx];
        echo "  Added new: {$tpp['name']} [{$tpp['electionType']}]\n";
    }

    if (!empty($tpp['experience'])) {
        $candidate['experience'] = $tpp['experience'];
    }
    if (!empty($tpp['platform'])) {
        $candidate['platform'] = $tpp['platform'];
    }

    $socialKeys = ['facebook', 'instagram', 'youtube', 'thread' => 'threads'];
    foreach ($socialKeys as $srcKey => $destKey) {
        if (is_int($srcKey)) {
            $srcKey = $destKey;
        }
        if (!empty($tpp['socialLinks'][$srcKey])) {
            $candidate[$destKey] = cleanSocialUrl($tpp['socialLinks'][$srcKey]);
        }
    }

    if (!empty($tpp['photo'])) {
        $ext = pathinfo(parse_url($tpp['photo'], PHP_URL_PATH), PATHINFO_EXTENSION);
        if (empty($ext)) {
            $ext = 'png';
        }
        $srcFilename = 'tpp_' . $tpp['cid'] . '.' . $ext;
        $srcPath = $tppPhotosPath . '/' . $srcFilename;

        if (file_exists($srcPath)) {
            copy($srcPath, $photosPath . '/' . $srcFilename);
            $candidate['photo'] = 'data/photos/' . $srcFilename;
            $photoUpdated++;
        } else {
            echo "  Photo not found: {$srcFilename} for {$tpp['name']}\n";
        }
    }

    unset($candidate);
}

file_put_contents(
    $dataPath . '/candidates.json',
    json_encode($candidatesData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

echo "\nDone!\n";
echo "  Matched: {$matched}\n";
echo "  Added: {$added}\n";
echo "  Photos updated: {$photoUpdated}\n";
echo "  Total candidates: " . count($candidatesData['candidates']) . "\n";
