<?php
$oFh = fopen(dirname(dirname(__DIR__)) . '/docs/p/community/data/community-culture.csv', 'w');
fputcsv($oFh, ['name', 'address', 'longitude', 'latitude', 'id', 'type']);

$xml = simplexml_load_file(__DIR__ . '/points.kml');
foreach ($xml->Document->Folder->Placemark as $placemark) {
    $parts = explode(',', trim((string) $placemark->Point->coordinates));
    $data = [
        (string) $placemark->name,
        '',
        $parts[0],
        $parts[1],
        md5((string) $placemark->name),
        'star',
    ];
    fputcsv($oFh, $data);
}

$page = file_get_contents('https://community-culture.tainan.gov.tw/community/index.php?m2=19');
$pos = strpos($page, 'mapList_Array');
$posEnd = strpos($page, '</script>', $pos);
$lines = explode("\n", substr($page, $pos, $posEnd - $pos));

foreach ($lines as $line) {
    if (empty($line)) {
        continue;
    }
    $pos = strpos($line, 'Array("');
    eval('$data = ' . substr($line, $pos));
    $pos = strpos($data[1], '&id=');
    $posEnd = strpos($data[1], '\'', $pos);
    $data[4] = substr($data[1], $pos + 4, $posEnd - $pos - 4);
    $pos = strpos($data[1], '<br>');
    $posEnd = strpos($data[1], '<br/>', $pos);
    $data[1] = strip_tags(substr($data[1], $pos, $posEnd - $pos));
    $data[] = 'community';
    fputcsv($oFh, $data);
}
