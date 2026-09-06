<?php
// POST action handlers for each tab

if ($tab === 'lines') {
    $lines = loadJson($dataFiles['lines']);
    if ($action === 'create') {
        $coords = array_map(function($line) {
            $parts = array_map('floatval', explode(',', trim($line)));
            return count($parts) === 2 ? [$parts[0], $parts[1]] : null;
        }, array_filter(explode("\n", trim($_POST['coordinates'] ?? ''))));
        $coords = array_values(array_filter($coords));
        if (!empty($_POST['v'])) {
            if (count($coords) === 1) {
                $geometry = ['type' => 'Point', 'coordinates' => $coords[0]];
            } elseif (count($coords) > 1) {
                $geometry = ['type' => 'LineString', 'coordinates' => $coords];
            } else {
                $geometry = ['type' => 'Point', 'coordinates' => [0, 0]];
            }
            $props = [
                'ymdh' => intval($_POST['ymdh']),
                'v' => $_POST['v'],
            ];
            $title = trim($_POST['title'] ?? '');
            if ($title !== '') $props['title'] = $title;
            $lines['features'][] = [
                'type' => 'Feature',
                'properties' => $props,
                'geometry' => $geometry,
            ];
            saveJson($dataFiles['lines'], $lines);
            $message = '已新增掃街紀錄';
            $messageType = 'success';
        } else {
            $message = '請填寫影片ID';
            $messageType = 'error';
        }
    } elseif ($action === 'update') {
        $idx = intval($_POST['index']);
        if (isset($lines['features'][$idx])) {
            $coords = array_map(function($line) {
                $parts = array_map('floatval', explode(',', trim($line)));
                return count($parts) === 2 ? [$parts[0], $parts[1]] : null;
            }, array_filter(explode("\n", trim($_POST['coordinates'] ?? ''))));
            $coords = array_values(array_filter($coords));
            $lines['features'][$idx]['properties']['ymdh'] = intval($_POST['ymdh']);
            $lines['features'][$idx]['properties']['v'] = $_POST['v'];
            $title = trim($_POST['title'] ?? '');
            if ($title !== '') {
                $lines['features'][$idx]['properties']['title'] = $title;
            } else {
                unset($lines['features'][$idx]['properties']['title']);
            }
            if (count($coords) === 1) {
                $lines['features'][$idx]['geometry'] = ['type' => 'Point', 'coordinates' => $coords[0]];
            } elseif (count($coords) > 1) {
                $lines['features'][$idx]['geometry'] = ['type' => 'LineString', 'coordinates' => $coords];
            }
            saveJson($dataFiles['lines'], $lines);
            $message = '已更新掃街紀錄 #' . $idx;
            $messageType = 'success';
        }
    } elseif ($action === 'delete') {
        $idx = intval($_POST['index']);
        if (isset($lines['features'][$idx])) {
            array_splice($lines['features'], $idx, 1);
            saveJson($dataFiles['lines'], $lines);
            $message = '已刪除掃街紀錄 #' . $idx;
            $messageType = 'success';
        }
    }
} elseif ($tab === 'schedule') {
    $schedule = loadJson($dataFiles['schedule']) ?: [];
    if ($action === 'create') {
        $date = trim($_POST['date'] ?? '');
        $time = trim($_POST['time'] ?? '');
        $location = trim($_POST['location'] ?? '');
        $type = trim($_POST['type'] ?? '掃街');
        $endTime = trim($_POST['end_time'] ?? '');
        $lng = floatval($_POST['lng'] ?? 0);
        $lat = floatval($_POST['lat'] ?? 0);
        if ($date !== '' && $time !== '' && $location !== '') {
            $item = [
                'date' => $date,
                'time' => $time,
                'end_time' => $endTime,
                'location' => $location,
                'type' => $type,
                'lng' => $lng,
                'lat' => $lat,
            ];
            if ($endTime === '') unset($item['end_time']);
            $schedule[] = $item;
            usort($schedule, function($a, $b) {
                return strcmp($a['date'] . $a['time'], $b['date'] . $b['time']);
            });
            saveJson($dataFiles['schedule'], $schedule);
            $message = '已新增行程：' . htmlspecialchars($date . ' ' . $time . ' ' . $location);
            $messageType = 'success';
        } else {
            $message = '請填寫完整資料（日期、時間、地點）';
            $messageType = 'error';
        }
    } elseif ($action === 'update') {
        $idx = intval($_POST['index']);
        if (isset($schedule[$idx])) {
            $endTime = trim($_POST['end_time'] ?? '');
            $schedule[$idx] = [
                'date' => trim($_POST['date'] ?? ''),
                'time' => trim($_POST['time'] ?? ''),
                'location' => trim($_POST['location'] ?? ''),
                'type' => trim($_POST['type'] ?? '掃街'),
                'lng' => floatval($_POST['lng'] ?? 0),
                'lat' => floatval($_POST['lat'] ?? 0),
            ];
            if ($endTime !== '') $schedule[$idx]['end_time'] = $endTime;
            usort($schedule, function($a, $b) {
                return strcmp($a['date'] . $a['time'], $b['date'] . $b['time']);
            });
            saveJson($dataFiles['schedule'], $schedule);
            $message = '已更新行程 #' . $idx;
            $messageType = 'success';
        }
    } elseif ($action === 'delete') {
        $idx = intval($_POST['index']);
        if (isset($schedule[$idx])) {
            $info = $schedule[$idx]['date'] . ' ' . $schedule[$idx]['location'];
            array_splice($schedule, $idx, 1);
            saveJson($dataFiles['schedule'], $schedule);
            $message = '已刪除行程：' . htmlspecialchars($info);
            $messageType = 'success';
        }
    }
} elseif ($tab === 'schedule_types') {
    $types = loadJson($dataFiles['schedule_types']) ?: [];
    if ($action === 'create') {
        $name = trim($_POST['name'] ?? '');
        $color = trim($_POST['color'] ?? '#28c8c8');
        if ($name !== '') {
            $types[] = ['name' => $name, 'color' => $color];
            saveJson($dataFiles['schedule_types'], $types);
            $message = '已新增類型：' . htmlspecialchars($name);
            $messageType = 'success';
        } else {
            $message = '請填寫類型名稱';
            $messageType = 'error';
        }
    } elseif ($action === 'update') {
        $idx = intval($_POST['index']);
        if (isset($types[$idx])) {
            $types[$idx] = [
                'name' => trim($_POST['name'] ?? ''),
                'color' => trim($_POST['color'] ?? '#28c8c8'),
            ];
            saveJson($dataFiles['schedule_types'], $types);
            $message = '已更新類型 #' . $idx;
            $messageType = 'success';
        }
    } elseif ($action === 'delete') {
        $idx = intval($_POST['index']);
        if (isset($types[$idx])) {
            $info = $types[$idx]['name'];
            array_splice($types, $idx, 1);
            saveJson($dataFiles['schedule_types'], $types);
            $message = '已刪除類型：' . htmlspecialchars($info);
            $messageType = 'success';
        }
    }
} elseif ($tab === 'youtube') {
    $youtube = loadJson($dataFiles['youtube']);
    $youtubeList = loadJson($dataFiles['youtube_list']);
    if ($action === 'create') {
        $key = trim($_POST['key'] ?? '');
        $lng = floatval($_POST['lng'] ?? 0);
        $lat = floatval($_POST['lat'] ?? 0);
        $videos = [];
        $videoIds = $_POST['video_id'] ?? [];
        $videoTitles = $_POST['video_title'] ?? [];
        for ($i = 0; $i < count($videoIds); $i++) {
            $vid = trim($videoIds[$i] ?? '');
            $vtitle = trim($videoTitles[$i] ?? '');
            if ($vid !== '') {
                $videos[] = ['id' => $vid, 'title' => $vtitle];
            }
        }
        sortVideosByTitleDesc($videos);
        if ($key !== '' && $lng != 0 && $lat != 0) {
            $youtube['features'][] = [
                'type' => 'Feature',
                'properties' => [
                    'key' => $key,
                    'count' => count($videos),
                ],
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [$lng, $lat],
                ],
            ];
            $youtubeList[$key] = $videos;
            saveJson($dataFiles['youtube'], $youtube);
            saveJson($dataFiles['youtube_list'], $youtubeList);
            $message = '已新增街講地點：' . htmlspecialchars($key);
            $messageType = 'success';
        } else {
            $message = '請填寫完整資料（地點名稱與座標）';
            $messageType = 'error';
        }
    } elseif ($action === 'update') {
        $idx = intval($_POST['index']);
        $oldKey = $_POST['old_key'] ?? '';
        if (isset($youtube['features'][$idx])) {
            $key = trim($_POST['key'] ?? '');
            $lng = floatval($_POST['lng'] ?? 0);
            $lat = floatval($_POST['lat'] ?? 0);
            $videos = [];
            $videoIds = $_POST['video_id'] ?? [];
            $videoTitles = $_POST['video_title'] ?? [];
            for ($i = 0; $i < count($videoIds); $i++) {
                $vid = trim($videoIds[$i] ?? '');
                $vtitle = trim($videoTitles[$i] ?? '');
                if ($vid !== '') {
                    $videos[] = ['id' => $vid, 'title' => $vtitle];
                }
            }
            sortVideosByTitleDesc($videos);
            $youtube['features'][$idx]['properties']['key'] = $key;
            $youtube['features'][$idx]['properties']['count'] = count($videos);
            $youtube['features'][$idx]['geometry']['coordinates'] = [$lng, $lat];
            if ($oldKey !== $key && isset($youtubeList[$oldKey])) {
                unset($youtubeList[$oldKey]);
            }
            $youtubeList[$key] = $videos;
            saveJson($dataFiles['youtube'], $youtube);
            saveJson($dataFiles['youtube_list'], $youtubeList);
            $message = '已更新街講地點：' . htmlspecialchars($key);
            $messageType = 'success';
        }
    } elseif ($action === 'delete') {
        $idx = intval($_POST['index']);
        if (isset($youtube['features'][$idx])) {
            $key = $youtube['features'][$idx]['properties']['key'] ?? '';
            array_splice($youtube['features'], $idx, 1);
            if ($key !== '' && isset($youtubeList[$key])) {
                unset($youtubeList[$key]);
            }
            saveJson($dataFiles['youtube'], $youtube);
            saveJson($dataFiles['youtube_list'], $youtubeList);
            $message = '已刪除街講地點：' . htmlspecialchars($key);
            $messageType = 'success';
        }
    }
}
