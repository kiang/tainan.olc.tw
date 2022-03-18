<?php
$plans = [
    '臺南市北區' => [
        'title' => '北中西區台南市議員參選人江明宗',
        'frame1' => 'frame/江明宗1.png',
        'frame2' => 'frame/江明宗2.png',
    ],
    '臺南市中西區' => [
        'title' => '北中西區台南市議員參選人江明宗',
        'frame1' => 'frame/江明宗1.png',
        'frame2' => 'frame/江明宗2.png',
    ],
];

$siteChars = [
    '　' => '',
    ' ' => '',
];

$json = json_decode(file_get_contents('/home/kiang/public_html/taiwan_basecode/cunli/geo/20211007.json'), true);
$meta = [];
foreach ($json['features'] as $f) {
    $check = $f['properties']['COUNTYNAME'] . $f['properties']['TOWNNAME'];
    if (isset($plans[$check])) {
        $metaKey = $check . $f['properties']['VILLNAME'];
        $x1 = 150; // x1, the lowest x coordinate
        $x2 = 100; // x2, the highest x coordinate
        $y1 = 30; // y1, the lowest y coordinate
        $y2 = 20; // y2, the highest y coordinate
        foreach ($f['geometry']['coordinates'] as $val1) {
            foreach ($val1 as $point) {
                if ($point[0] < $x1) {
                    $x1 = $point[0];
                }
                if ($point[0] > $x2) {
                    $x2 = $point[0];
                }
                if ($point[1] < $y1) {
                    $y1 = $point[1];
                }
                if ($point[1] > $y2) {
                    $y2 = $point[1];
                }
            }
        }
        switch ($f['properties']['VILLNAME']) {
            case '石[曹]里':
                $f['properties']['VILLNAME'] = '石𥕢里';
                break;
            case '[那]拔里':
                $f['properties']['VILLNAME'] = '𦰡拔里';
                break;
        }
        $meta[$metaKey]['code'] = $f['properties']['VILLCODE'];
        $meta[$metaKey]['cunli'] = $f['properties']['VILLNAME'];
        $meta[$metaKey]['area'] = $f['properties']['TOWNNAME'] . $f['properties']['VILLNAME'];
        $meta[$metaKey]['center'] = [
            'x' => $x1 + (($x2 - $x1) / 2),
            'y' => $y1 + (($y2 - $y1) / 2),
        ];
    }
}

$bdmd = [];
$years = [2016, 2017, 2018, 2019, 2020, 2021];
foreach ($years as $year) {
    foreach (glob('/home/kiang/public_html/tw_population/bdmd/' . $year . '/*/data.csv') as $csvFile) {
        $fh = fopen($csvFile, 'r');
        $head = fgetcsv($fh, 4096);
        $head[0] = 'statistic_yyymm';
        fgetcsv($fh, 4096);
        while ($line = fgetcsv($fh, 4096)) {
            $data = array_combine($head, $line);
            $data['site_id'] = strtr($data['site_id'], $siteChars);
            if (isset($plans[$data['site_id']])) {
                $key = $data['site_id'] . $data['village'];
                $y = intval(substr($data['statistic_yyymm'], 0, 3)) + 1911;
                if (!isset($bdmd[$y])) {
                    $bdmd[$y] = [];
                }
                if (!isset($bdmd[$y][$key])) {
                    $bdmd[$y][$key] = [
                        'birth' => 0,
                        'death' => 0,
                        'marry' => 0,
                        'divorce' => 0,
                    ];
                }
                $bdmd[$y][$key]['birth'] += $data['birth_total'];
                $bdmd[$y][$key]['death'] += $data['death_total'];
                foreach ($data as $k => $v) {
                    $parts = explode('_', $k);
                    switch ($parts[0]) {
                        case 'marry':
                            $bdmd[$y][$key]['marry'] += $v * 2;
                            break;
                        case 'divorce':
                            $bdmd[$y][$key]['divorce'] += $v * 2;
                            break;
                    }
                }
            }
        }
    }
}

$stack = [];
$years = [2016, 2017, 2018, 2019, 2020, 2021];
$months = ['03', '06', '09', '12'];
foreach ($years as $year) {
    foreach ($months as $month) {
        $csvFile = '/home/kiang/public_html/tw_population/population/' . $year . '/' . $month . '/data.csv';
        $fh = fopen($csvFile, 'r');
        $head = fgetcsv($fh, 4096);
        $head[0] = 'statistic_yyymm';
        fgetcsv($fh, 4096);
        while ($line = fgetcsv($fh, 4096)) {
            $data = array_combine($head, $line);
            $data['site_id'] = strtr($data['site_id'], $siteChars);
            if (isset($plans[$data['site_id']])) {
                $key = $data['site_id'] . $data['village'];
                $y = intval(substr($data['statistic_yyymm'], 0, 3)) + 1911;
                $ym = $y . substr($data['statistic_yyymm'], 3, 2);
                if (!isset($stack[$ym])) {
                    $stack[$ym] = [];
                }
                if (!isset($stack[$ym][$key])) {
                    $stack[$ym][$key] = [
                        'child' => 0,
                        'adult' => 0,
                        'elder' => 0,
                    ];
                }
                foreach ($data as $k => $v) {
                    $parts = explode('_', $k);
                    if (isset($parts[2]) && $parts[1] === 'age') {
                        $age = intval($parts[2]);
                        if ($age < 15) {
                            $stack[$ym][$key]['child'] += $v;
                        } elseif ($age < 65) {
                            $stack[$ym][$key]['adult'] += $v;
                        } else {
                            $stack[$ym][$key]['elder'] += $v;
                        }
                    }
                }
            }
        }
    }
}

$fh = fopen('/home/kiang/public_html/tw_population/population/2022/02/data.csv', 'r');
$head = fgetcsv($fh, 4096);
fgetcsv($fh, 4096);
while ($line = fgetcsv($fh, 4096)) {
    $data = array_combine($head, $line);
    $data['site_id'] = strtr($data['site_id'], $siteChars);
    if (isset($plans[$data['site_id']])) {
        $vData = [];
        $key = $data['site_id'] . $data['village'];

        $meta[$key]['people_total'] = $data['people_total'];
        $meta[$key]['people_child'] = $stack['202112'][$key]['child'];
        $meta[$key]['people_adult'] = $stack['202112'][$key]['adult'];
        $meta[$key]['people_elder'] = $stack['202112'][$key]['elder'];
        $meta[$key]['rate_elder'] = round($meta[$key]['people_elder'] / $meta[$key]['people_total'], 2) * 100;
        $meta[$key]['diff_total'] = $meta[$key]['people_total'] - $stack['202012'][$key]['child'] - $stack['202012'][$key]['adult'] - $stack['202012'][$key]['elder'];
        $meta[$key]['diff_child'] = $meta[$key]['people_child'] - $stack['202012'][$key]['child'];
        $meta[$key]['diff_adult'] = $meta[$key]['people_adult'] - $stack['202012'][$key]['adult'];
        $meta[$key]['diff_elder'] = $meta[$key]['people_elder'] - $stack['202012'][$key]['elder'];
        if ($meta[$key]['diff_total'] < 0) {
            $meta[$key]['diff_total'] = "減少 " . abs($meta[$key]['diff_total']) . " 人";
        } else {
            $meta[$key]['diff_total'] = "增加 {$meta[$key]['diff_total']} 人";
        }
        if ($meta[$key]['diff_child'] < 0) {
            $meta[$key]['diff_child'] = "減少 " . abs($meta[$key]['diff_child']) . " 人";
        } else {
            $meta[$key]['diff_child'] = "增加 {$meta[$key]['diff_child']} 人";
        }
        if ($meta[$key]['diff_adult'] < 0) {
            $meta[$key]['diff_adult'] = "減少 " . abs($meta[$key]['diff_adult']) . " 人";
        } else {
            $meta[$key]['diff_adult'] = "增加 {$meta[$key]['diff_adult']} 人";
        }
        if ($meta[$key]['diff_elder'] < 0) {
            $meta[$key]['diff_elder'] = "減少 " . abs($meta[$key]['diff_elder']) . " 人";
        } else {
            $meta[$key]['diff_elder'] = "增加 {$meta[$key]['diff_elder']} 人";
        }

        $meta[$key]['rate_care'] = round(($meta[$key]['people_elder'] + $meta[$key]['people_child']) / $meta[$key]['people_adult'], 2) * 100;
        if ($meta[$key]['people_child'] > 0) {
            $meta[$key]['rate_old'] = round($meta[$key]['people_elder'] / $meta[$key]['people_child'], 2) * 100;
        } else {
            $meta[$key]['rate_old'] = '無法計算';
        }

        $json = [
            'labels' => [],
            'datasets' => [],
        ];
        $json['labels'] = array_keys($stack);
        $datasets = [
            'child' => [
                'label' => '未滿15歲',
                'backgroundColor' => 'rgb(255, 99, 132)',
                'data' => [],
            ],
            'adult' => [
                'label' => '15-64歲',
                'backgroundColor' => 'rgb(54, 162, 235)',
                'data' => [],
            ],
            'elder' => [
                'label' => '年滿65歲',
                'backgroundColor' => 'rgb(201, 203, 207)',
                'data' => [],
            ],
        ];
        foreach ($stack as $ym => $values) {
            if (isset($values[$key])) {
                $datasets['child']['data'][] = $values[$key]['child'];
                $datasets['adult']['data'][] = $values[$key]['adult'];
                $datasets['elder']['data'][] = $values[$key]['elder'];
            } else {
                $datasets['child']['data'][] = 0;
                $datasets['adult']['data'][] = 0;
                $datasets['elder']['data'][] = 0;
            }
        }
        $json['datasets'] = array_values($datasets);
        $vData['chart1'] = $json;

        $pool = [];
        foreach ($data as $k => $v) {
            if (false !== strpos($k, 'people_age')) {
                $parts = explode('_', $k);
                $age = intval($parts[2]);
                $lv = floor($age / 5) * 5;
                if (!isset($pool[$lv])) {
                    $pool[$lv] = [];
                }
                if (!isset($pool[$lv][$parts[3]])) {
                    $pool[$lv][$parts[3]] = [
                        'age' => [],
                        'count' => 0,
                    ];
                }
                $pool[$lv][$parts[3]]['count'] += $v;
                $pool[$lv][$parts[3]]['age'][] = $age;
            }
        }
        krsort($pool);
        $json = [
            'labels' => [],
            'datasets' => [],
        ];
        $male = [
            'label' => '男',
            'backgroundColor' => 'rgb(54, 162, 235)',
            'data' => [],
        ];
        $female = [
            'label' => '女',
            'backgroundColor' => 'rgb(255, 99, 132)',
            'data' => [],
        ];
        foreach ($pool as $klv => $lv) {
            if (count($lv['m']['age']) > 1) {
                $ageFirst = array_shift($lv['m']['age']);
                $ageLast = array_pop($lv['m']['age']);
                $pool[$klv]['m']['age_label'] = $ageFirst . '-' . $ageLast;
            } else {
                $pool[$klv]['m']['age_label'] = array_shift($lv['m']['age']);
            }
            $json['labels'][] = $pool[$klv]['m']['age_label'];
            $male['data'][] = 0 - $lv['m']['count'];
            $female['data'][] = $lv['f']['count'];
        }
        $json['datasets'][] = $male;
        $json['datasets'][] = $female;
        $vData['chart2'] = $json;

        $json = [
            'labels' => [],
            'datasets' => [],
        ];
        $json['labels'] = array_keys($bdmd);
        $datasets = [
            'birth' => [
                'label' => '出生',
                'borderColor' => 'rgb(75, 192, 192)',
                'backgroundColor' => 'rgb(75, 192, 192)',
                'borderWidth' => 10,
                'data' => [],
            ],
            'death' => [
                'label' => '死亡',
                'borderColor' => 'rgb(201, 203, 207)',
                'backgroundColor' => 'rgb(201, 203, 207)',
                'borderWidth' => 10,
                'data' => [],
            ],
            'marry' => [
                'label' => '結婚',
                'borderColor' => 'rgb(255, 159, 64)',
                'backgroundColor' => 'rgb(255, 159, 64)',
                'borderWidth' => 10,
                'data' => [],
            ],
            'divorce' => [
                'label' => '離婚',
                'borderColor' => 'rgb(153, 102, 255)',
                'backgroundColor' => 'rgb(153, 102, 255)',
                'borderWidth' => 10,
                'data' => [],
            ],
        ];
        foreach ($bdmd as $ym => $values) {
            if (isset($values[$key])) {
                $datasets['birth']['data'][] = $values[$key]['birth'];
                $datasets['death']['data'][] = $values[$key]['death'];
                $datasets['marry']['data'][] = $values[$key]['marry'];
                $datasets['divorce']['data'][] = $values[$key]['divorce'];
            } else {
                $datasets['birth']['data'][] = 0;
                $datasets['death']['data'][] = 0;
                $datasets['marry']['data'][] = 0;
                $datasets['divorce']['data'][] = 0;
            }
        }
        $json['datasets'] = array_values($datasets);
        $vData['chart3'] = $json;

        if ($meta[$key]['rate_elder'] < 7) {
            $meta[$key]['type'] = 'good';
        } elseif ($meta[$key]['rate_elder'] < 14) {
            $meta[$key]['type'] = 'aging';
        } elseif ($meta[$key]['rate_elder'] < 20) {
            $meta[$key]['type'] = 'aged';
        } else {
            $meta[$key]['type'] = 'super-aged';
        }

        $vData['meta'] = $meta[$key];

        file_put_contents(dirname(__DIR__) . '/json/cunli/' . $meta[$key]['code'] . '.json', json_encode($vData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
