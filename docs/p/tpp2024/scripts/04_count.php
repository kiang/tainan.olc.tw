<?php
$basePath = dirname(__DIR__);
$jsonFiles = [
    '2024' => $basePath . '/candidates.json',
    '2022' => $basePath . '/2022/candidates.json',
    '2020' => $basePath . '/2020/candidates.json',
];

$pool = [];
foreach ($jsonFiles as $year => $jsonFile) {
    $candidates = json_decode(file_get_contents($jsonFile), true);
    foreach ($candidates as $candidate) {
        if (!isset($pool[$candidate['姓名']])) {
            $pool[$candidate['姓名']] = [
                'name' => $candidate['姓名'],
                'count' => 0,
            ];
        }
        $pool[$candidate['姓名']]['count']++;
        $pool[$candidate['姓名']][$year] = intval($candidate['votes']);
    }
}

function cmp($a, $b)
{
    if ($a['count'] == $b['count']) {
        return 0;
    }
    return ($a['count'] > $b['count']) ? -1 : 1;
}

usort($pool, "cmp");

$oFh = fopen($basePath . '/count.csv', 'w');
fputcsv($oFh, ['姓名', '2024', '2022', '2020']);
foreach ($pool as $row) {
    fputcsv($oFh, [
        $row['name'],
        $row['2024'] ?? 0,
        $row['2022'] ?? 0,
        $row['2020'] ?? 0,
    ]);
}