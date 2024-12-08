<?php
$basePath = dirname(__DIR__);
$data = [];
$c2022 = ['周曉芸', '徐勝凌', '林子丞', '林志學', '葉國文', '莊貽量', '劉家榮', '王如意', '邱于珊', '許瑞宏', '江明宗', '林昭印', '曾姸潔'];
$pngList = ['陳思妤', '黃浚閣', '簡令紘', '顏靖彬', '黃守仕', '連宗聖', '陳姿樺', '林昭印', '葉國文', '楊瓊瑛', '王博賢', '吳子呈', '賴秋雅', '江明宗', '莊貽量', '宋國清', '曾尹儷'];

foreach (glob($basePath . '/csv/*.csv') as $csvFile) {
    $p = pathinfo($csvFile);
    $fh = fopen($csvFile, 'r');
    $header = array_map(function ($field) {
        // Remove BOM and other hidden characters from header
        return preg_replace('/[\r\n]/', '', trim($field));
    }, fgetcsv($fh));
    $header[] = 'sort';
    $theSort = intval($p['filename']);

    while ($row = fgetcsv($fh)) {
        // Clean each field in the row
        $row = array_map(function ($field) {
            // Remove hidden characters and trim whitespace
            return preg_replace('/[\r\n]/', '', trim($field));
        }, $row);
        $row[] = $theSort;

        if (count($header) === count($row) && $row[0] !== '選舉區') {
            $item = array_combine($header, $row);
            if (in_array($item['姓名'], $c2022)) {
                $item['特殊身分'] = '2022議員參選人';
            }
            if (in_array($item['姓名'], $pngList)) {
                $item['照片'] = $item['選舉區'] . '/-' . str_pad($item['號次'], 3, '0', STR_PAD_LEFT) . '.png';
            } else {
                $item['照片'] = $item['選舉區'] . '/-' . str_pad($item['號次'], 3, '0', STR_PAD_LEFT) . '.jpg';
            }

            $data[] = $item;
        }
    }
    fclose($fh);
}

// Sort the data by 'sort' and then by '號次'
usort($data, function ($a, $b) {
    // First compare by sort field
    $sortCompare = $a['sort'] - $b['sort'];
    if ($sortCompare !== 0) {
        return $sortCompare;
    }
    // If sort is the same, compare by 號次
    return intval($a['號次']) - intval($b['號次']);
});

// Output cleaned and sorted data
file_put_contents($basePath . '/candidates.json', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
