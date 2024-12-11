<?php
$basePath = dirname(__DIR__);
$data = [];
$c2022 = ['周曉芸', '徐勝凌', '林子丞', '林志學', '葉國文', '莊貽量', '劉家榮', '王如意', '邱于珊', '許瑞宏', '江明宗', '林昭印', '曾姸潔'];
$pngList = ['陳思妤', '黃浚閣', '簡令紘', '顏靖彬', '黃守仕', '連宗聖', '陳姿樺', '林昭印', '葉國文', '楊瓊瑛', '王博賢', '吳子呈', '賴秋雅', '江明宗', '莊貽量', '宋國清', '曾尹儷'];
$elected = ['卓志鋼', '楊恕人', '劉奕霆', '陳靜琳', '吳士廉', '李家宜', '張智翔', '魏瑞妤', '曾宣惠', '黃國豪', '林恩豪', '李嘉雯', '顏筱珊', '黃浚閣', '陳思妤', '陳大業', '楊曄', '吳承杰', '黃湘晴', '廖先嶸', '陳怡君', '簡幸甫', '吳亞倫', '黃守仕', '廖志杰', '羅怡媃', '林財祥', '王如意', '陳姿樺', '古又文', '侯志明', '許恒誠', '曾鼎文', '江建毅', '蕭珉亞', '許安成', '林政佑', '陳和謙', '曾姸潔', '林昭印', '楊大緯', '王少芸', '陳義佑', '彭士益', '楊美惠', '林岳龍', '柯美蘭', '吳俊民', '徐勝凌', '鍾心渝', '葉國文', '賴俊銘', '林志學', '鍾昀哲', '繆宗翰', '楊瓊瑛', '丁貞文', '邱于珊', '許瑞宏', '許書豪', '林坤詮', '王慧娟', '吳尚諭', '張元䅍', '王冠忠', '黃怡雯', '呂岱融', '徐尚裕', '張勝彬', '張仕穎', '林麗馨', '廖鳳翔', '魏怡婷', '陳瓊月', '吳宜穎', '賴渝璇', '蔡君婷', '何泰鋒', '王冠鈞', '朱國康', '林乃立', '洪梓傑', '江明宗', '楊家宜', '林慧雯', '陳癸妃', '曾尹儷', '莊貽量', '曾偉修', '劉家榮', '王宥晴', '陳欣玉', '宋國清', '陳正淋', '郭泰安', '鄧喬筠', '李辰于', '阮椲婷', '游孟璇', '蔡翼陽', '沈偉平', '翁瑾諺', '謝穎諄', '周曉芸', '簡俊德', '李苡棋', '卓仁凱', '吳燕雪', '張峻榮', '林文福'];

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
            if (in_array($item['姓名'], $elected)) {
                $item['elected'] = true;
            } else {
                $item['elected'] = false;
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
