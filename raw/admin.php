<?php
$dataFiles = [
    'lines' => __DIR__ . '/../docs/json/lines.json',
    'youtube' => __DIR__ . '/../docs/json/youtube.json',
    'youtube_list' => __DIR__ . '/../docs/json/youtube_list.json',
    'schedule' => __DIR__ . '/../docs/json/schedule.json',
    'schedule_types' => __DIR__ . '/../docs/json/schedule_types.json',
];

function loadJson($path) {
    if (!file_exists($path)) return null;
    return json_decode(file_get_contents($path), true);
}

function saveJson($path, $data) {
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function sortVideosByTitleDesc(&$videos) {
    usort($videos, function($a, $b) {
        return strcmp(mb_substr($b['title'], 0, 8), mb_substr($a['title'], 0, 8));
    });
}

$tab = $_GET['tab'] ?? 'lines';
$action = $_POST['action'] ?? '';
$message = '';
$messageType = '';

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
                $message = '已新增掃街路線';
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
                $message = '已更新掃街路線 #' . $idx;
                $messageType = 'success';
            }
        } elseif ($action === 'delete') {
            $idx = intval($_POST['index']);
            if (isset($lines['features'][$idx])) {
                array_splice($lines['features'], $idx, 1);
                saveJson($dataFiles['lines'], $lines);
                $message = '已刪除掃街路線 #' . $idx;
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
            $lng = floatval($_POST['lng'] ?? 0);
            $lat = floatval($_POST['lat'] ?? 0);
            if ($date !== '' && $time !== '' && $location !== '') {
                $schedule[] = [
                    'date' => $date,
                    'time' => $time,
                    'location' => $location,
                    'type' => $type,
                    'lng' => $lng,
                    'lat' => $lat,
                ];
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
                $schedule[$idx] = [
                    'date' => trim($_POST['date'] ?? ''),
                    'time' => trim($_POST['time'] ?? ''),
                    'location' => trim($_POST['location'] ?? ''),
                    'type' => trim($_POST['type'] ?? '掃街'),
                    'lng' => floatval($_POST['lng'] ?? 0),
                    'lat' => floatval($_POST['lat'] ?? 0),
                ];
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
    if ($message && $messageType === 'success') {
        header('Location: admin.php?tab=' . urlencode($tab) . '&msg=' . urlencode($message));
        exit;
    }
}

if (isset($_GET['msg'])) {
    $message = $_GET['msg'];
    $messageType = 'success';
}

$lines = loadJson($dataFiles['lines']);
$youtube = loadJson($dataFiles['youtube']);
$youtubeList = loadJson($dataFiles['youtube_list']);
$schedule = loadJson($dataFiles['schedule']) ?: [];
$scheduleTypes = loadJson($dataFiles['schedule_types']) ?: [['name' => '掃街', 'color' => '#28c8c8'], ['name' => '街講', 'color' => '#f0a030']];

$editIndex = isset($_GET['edit']) ? intval($_GET['edit']) : -1;
?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>資料管理 - 掃街/街講/行程</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; }
.container { max-width: 1200px; margin: 0 auto; padding: 16px; }
h1 { font-size: 20px; margin-bottom: 16px; }
.tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tabs a { padding: 8px 16px; background: #ddd; text-decoration: none; color: #333; border-radius: 6px 6px 0 0; font-size: 14px; }
.tabs a.active { background: #fff; font-weight: 600; }
.card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card h2 { font-size: 16px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f9f9f9; font-weight: 600; white-space: nowrap; }
td { vertical-align: top; }
.actions { white-space: nowrap; }
.actions form { display: inline; }
.btn { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; }
.btn-sm { padding: 3px 8px; }
.btn-primary { background: #28c8c8; color: #fff; }
.btn-danger { background: #e74c3c; color: #fff; }
.btn-secondary { background: #888; color: #fff; }
.btn:hover { opacity: 0.85; }
form.edit-form label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; margin-top: 10px; }
form.edit-form input[type="text"],
form.edit-form input[type="number"],
form.edit-form textarea { width: 100%; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: monospace; }
form.edit-form textarea { min-height: 100px; }
.msg { padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
.msg.success { background: #d4edda; color: #155724; }
.msg.error { background: #f8d7da; color: #721c24; }
.video-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: center; }
.video-row input { flex: 1; }
.video-row .remove-video { cursor: pointer; color: #e74c3c; font-weight: bold; padding: 4px 8px; }
.add-video-btn { cursor: pointer; color: #28c8c8; font-size: 13px; margin-top: 4px; display: inline-block; }
.coord-preview { font-size: 11px; color: #888; max-height: 60px; overflow: auto; }
.truncate { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.filter-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.filter-bar input { flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.filter-bar .count { font-size: 12px; color: #888; white-space: nowrap; }
tr.editing { background: #e0f7f7; }
#pickerMap { height: 300px; border-radius: 6px; margin-top: 6px; border: 1px solid #ccc; }
.map-hint { font-size: 12px; color: #888; margin-top: 4px; }
</style>
</head>
<body>
<div class="container">
<h1>資料管理 - 掃街紀錄 / 街講地點 / 行程</h1>

<?php if ($message): ?>
<div class="msg <?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
<?php endif; ?>

<div class="tabs">
    <a href="?tab=lines" class="<?= $tab === 'lines' ? 'active' : '' ?>">掃街路線 (lines.json)</a>
    <a href="?tab=youtube" class="<?= $tab === 'youtube' ? 'active' : '' ?>">街講地點 (youtube.json)</a>
    <a href="?tab=schedule" class="<?= $tab === 'schedule' ? 'active' : '' ?>">行程 (schedule.json)</a>
    <a href="?tab=schedule_types" class="<?= $tab === 'schedule_types' ? 'active' : '' ?>">行程類型</a>
</div>

<?php if ($tab === 'lines'): ?>
<!-- Lines Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($lines['features'][$editIndex])):
        $ef = $lines['features'][$editIndex];
    ?>
    <h2>編輯掃街路線 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <label>日期時間 (ymdh)</label>
        <input type="text" name="ymdh" value="<?= htmlspecialchars($ef['properties']['ymdh'] ?? '') ?>" required id="editFocus">
        <label>YouTube 網址或影片 ID</label>
        <div style="display:flex;gap:8px">
            <input type="text" name="v" value="<?= htmlspecialchars($ef['properties']['v'] ?? '') ?>" required id="editVideoInput" placeholder="貼上 YouTube 網址或影片 ID" style="flex:1">
            <button type="button" class="btn btn-primary" onclick="fetchYoutubeInfo('editVideoInput','editTitleInput')">取得標題</button>
        </div>
        <label>標題</label>
        <input type="text" name="title" value="<?= htmlspecialchars($ef['properties']['title'] ?? '') ?>" id="editTitleInput">
        <label>座標 (每行一組 lng,lat，可只填一個點)</label>
        <textarea name="coordinates"><?php
            $geomType = $ef['geometry']['type'] ?? 'LineString';
            $geomCoords = $ef['geometry']['coordinates'] ?? [];
            if ($geomType === 'Point' && count($geomCoords) === 2 && !is_array($geomCoords[0])) {
                echo $geomCoords[0] . ',' . $geomCoords[1] . "\n";
            } else {
                foreach ($geomCoords as $c) {
                    if (is_array($c)) echo $c[0] . ',' . $c[1] . "\n";
                }
            }
        ?></textarea>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=lines" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增掃街路線<?= isset($_GET['from_schedule']) ? ' (從行程帶入)' : '' ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="create">
        <label>日期時間 (ymdh 格式，如 2022080315)</label>
        <input type="text" name="ymdh" placeholder="2022080315" value="<?= htmlspecialchars($_GET['pre_ymdh'] ?? '') ?>" required>
        <label>YouTube 網址或影片 ID</label>
        <div style="display:flex;gap:8px">
            <input type="text" name="v" placeholder="貼上 YouTube 網址或影片 ID" required id="createVideoInput" style="flex:1">
            <button type="button" class="btn btn-primary" onclick="fetchYoutubeInfo('createVideoInput','createTitleInput')">取得標題</button>
        </div>
        <label>標題</label>
        <input type="text" name="title" placeholder="影片標題（自動取得或手動輸入）" id="createTitleInput">
        <label>座標 (每行一組 lng,lat，可只填一個點)</label>
        <?php $preCoord = (isset($_GET['pre_lng']) && isset($_GET['pre_lat']) && floatval($_GET['pre_lng']) != 0) ? $_GET['pre_lng'] . ',' . $_GET['pre_lat'] : ''; ?>
        <textarea name="coordinates" placeholder="120.19837595,22.99293332&#10;120.19743906,22.99314248&#10;（可只填一個點或留空）"><?= htmlspecialchars($preCoord) ?></textarea>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>掃街路線列表 (<?= count($lines['features'] ?? []) ?> 筆)</h2>
    <div class="filter-bar">
        <input type="text" id="linesFilter" placeholder="搜尋日期時間或影片ID..." oninput="filterTable('linesTable', this.value, 'linesCount')">
        <span class="count" id="linesCount"></span>
    </div>
    <table id="linesTable">
        <thead>
            <tr><th>#</th><th>日期時間</th><th>影片ID</th><th>標題</th><th>類型/座標</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (($lines['features'] ?? []) as $i => $feature):
            $gType = $feature['geometry']['type'] ?? 'LineString';
            $gCoords = $feature['geometry']['coordinates'] ?? [];
            $coordInfo = $gType === 'Point' ? '點' : count($gCoords) . '點路線';
        ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td><?= htmlspecialchars($feature['properties']['ymdh'] ?? '') ?></td>
                <td><a href="https://www.youtube.com/watch?v=<?= htmlspecialchars($feature['properties']['v'] ?? '') ?>" target="_blank"><?= htmlspecialchars($feature['properties']['v'] ?? '') ?></a></td>
                <td class="truncate" title="<?= htmlspecialchars($feature['properties']['title'] ?? '') ?>"><?= htmlspecialchars($feature['properties']['title'] ?? '') ?></td>
                <td><?= $coordInfo ?></td>
                <td class="actions">
                    <a href="?tab=lines&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <form method="post" onsubmit="return confirm('確定刪除此路線？')">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="index" value="<?= $i ?>">
                        <button type="submit" class="btn btn-sm btn-danger">刪除</button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php elseif ($tab === 'youtube'): ?>
<!-- YouTube/StreetTalk Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($youtube['features'][$editIndex])):
        $ef = $youtube['features'][$editIndex];
        $eKey = $ef['properties']['key'] ?? '';
        $eVideos = $youtubeList[$eKey] ?? [];
    ?>
    <h2>編輯街講地點 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <input type="hidden" name="old_key" value="<?= htmlspecialchars($eKey) ?>">
        <label>地點名稱 (key)</label>
        <input type="text" name="key" value="<?= htmlspecialchars($eKey) ?>" required id="editFocus">
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" value="<?= $ef['geometry']['coordinates'][0] ?? 0 ?>" required placeholder="經度" id="inputLng">
            <input type="text" name="lat" value="<?= $ef['geometry']['coordinates'][1] ?? 0 ?>" required placeholder="緯度" id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <label>影片列表</label>
        <div id="editVideos">
            <?php foreach ($eVideos as $v): ?>
            <div class="video-row">
                <input type="text" name="video_id[]" value="<?= htmlspecialchars($v['id'] ?? '') ?>" placeholder="影片 ID">
                <input type="text" name="video_title[]" value="<?= htmlspecialchars($v['title'] ?? '') ?>" placeholder="影片標題">
                <span class="remove-video" onclick="this.parentElement.remove()">✕</span>
            </div>
            <?php endforeach; ?>
            <?php if (empty($eVideos)): ?>
            <div class="video-row">
                <input type="text" name="video_id[]" placeholder="影片 ID">
                <input type="text" name="video_title[]" placeholder="影片標題">
                <span class="remove-video" onclick="this.parentElement.remove()">✕</span>
            </div>
            <?php endif; ?>
        </div>
        <span class="add-video-btn" onclick="addVideoRow('editVideos')">+ 新增影片</span>
        <br>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=youtube" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增街講地點<?= isset($_GET['from_schedule']) ? ' (從行程帶入)' : '' ?></h2>
    <form method="post" class="edit-form" id="createForm">
        <input type="hidden" name="action" value="create">
        <label>地點名稱 (key)</label>
        <input type="text" name="key" placeholder="北區和緯路四段/文賢路" value="<?= htmlspecialchars($_GET['pre_key'] ?? '') ?>" required>
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" placeholder="120.193953" value="<?= htmlspecialchars($_GET['pre_lng'] ?? '') ?>" required id="inputLng">
            <input type="text" name="lat" placeholder="23.009592" value="<?= htmlspecialchars($_GET['pre_lat'] ?? '') ?>" required id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <label>影片列表</label>
        <div id="createVideos">
            <div class="video-row">
                <input type="text" name="video_id[]" placeholder="影片 ID (如 _o6Gsei4kp0)">
                <input type="text" name="video_title[]" placeholder="影片標題">
                <span class="remove-video" onclick="this.parentElement.remove()">✕</span>
            </div>
        </div>
        <span class="add-video-btn" onclick="addVideoRow('createVideos')">+ 新增影片</span>
        <br>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>街講地點列表 (<?= count($youtube['features'] ?? []) ?> 筆)</h2>
    <div class="filter-bar">
        <input type="text" id="youtubeFilter" placeholder="搜尋地點名稱或座標..." oninput="filterTable('youtubeTable', this.value, 'youtubeCount')">
        <span class="count" id="youtubeCount"></span>
    </div>
    <table id="youtubeTable">
        <thead>
            <tr><th>#</th><th>地點</th><th>座標</th><th>影片數</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (($youtube['features'] ?? []) as $i => $feature):
            $key = $feature['properties']['key'] ?? '';
            $videos = $youtubeList[$key] ?? [];
        ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td class="truncate" title="<?= htmlspecialchars($key) ?>"><?= htmlspecialchars($key) ?></td>
                <td><?= ($feature['geometry']['coordinates'][0] ?? '') . ', ' . ($feature['geometry']['coordinates'][1] ?? '') ?></td>
                <td><?= count($videos) ?></td>
                <td class="actions">
                    <a href="?tab=youtube&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <form method="post" onsubmit="return confirm('確定刪除此地點及所有影片？')">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="index" value="<?= $i ?>">
                        <button type="submit" class="btn btn-sm btn-danger">刪除</button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php elseif ($tab === 'schedule'): ?>
<!-- Schedule Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($schedule[$editIndex])):
        $ef = $schedule[$editIndex];
    ?>
    <h2>編輯行程 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <label>日期</label>
        <input type="date" name="date" value="<?= htmlspecialchars($ef['date'] ?? '') ?>" required id="editFocus">
        <label>時間 (HH:MM)</label>
        <input type="text" name="time" value="<?= htmlspecialchars($ef['time'] ?? '') ?>" placeholder="17:20" required>
        <label>地點</label>
        <input type="text" name="location" value="<?= htmlspecialchars($ef['location'] ?? '') ?>" required>
        <label>類型</label>
        <select name="type" style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px">
            <?php foreach ($scheduleTypes as $st): ?>
            <option value="<?= htmlspecialchars($st['name']) ?>"<?= ($ef['type'] ?? '') === $st['name'] ? ' selected' : '' ?>><?= htmlspecialchars($st['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" value="<?= $ef['lng'] ?? 0 ?>" required placeholder="經度" id="inputLng">
            <input type="text" name="lat" value="<?= $ef['lat'] ?? 0 ?>" required placeholder="緯度" id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=schedule" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增行程</h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="create">
        <label>日期</label>
        <input type="date" name="date" required>
        <label>時間 (HH:MM)</label>
        <input type="text" name="time" placeholder="17:20" required>
        <label>地點</label>
        <input type="text" name="location" placeholder="和緯黃昏市場" required>
        <label>類型</label>
        <select name="type" style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px">
            <?php foreach ($scheduleTypes as $st): ?>
            <option value="<?= htmlspecialchars($st['name']) ?>"><?= htmlspecialchars($st['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" placeholder="120.193953" required id="inputLng">
            <input type="text" name="lat" placeholder="23.009592" required id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>行程列表 (<?= count($schedule) ?> 筆)</h2>
    <div class="filter-bar">
        <input type="text" id="scheduleFilter" placeholder="搜尋日期、地點或類型..." oninput="filterTable('scheduleTable', this.value, 'scheduleCount')">
        <span class="count" id="scheduleCount"></span>
    </div>
    <table id="scheduleTable">
        <thead>
            <tr><th>#</th><th>日期</th><th>時間</th><th>地點</th><th>類型</th><th>座標</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach ($schedule as $i => $item): ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td><?= htmlspecialchars($item['date'] ?? '') ?></td>
                <td><?= htmlspecialchars($item['time'] ?? '') ?></td>
                <td><?= htmlspecialchars($item['location'] ?? '') ?></td>
                <td><?= htmlspecialchars($item['type'] ?? '') ?></td>
                <td><?= ($item['lng'] ?? '') . ', ' . ($item['lat'] ?? '') ?></td>
                <td class="actions">
                    <a href="?tab=schedule&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <?php
                        $ymdh = str_replace('-', '', $item['date'] ?? '') . str_replace(':', '', substr($item['time'] ?? '00:00', 0, 2));
                        $prefillLines = http_build_query(['tab' => 'lines', 'from_schedule' => '1', 'pre_ymdh' => $ymdh, 'pre_lng' => $item['lng'] ?? 0, 'pre_lat' => $item['lat'] ?? 0]);
                        $prefillYt = http_build_query(['tab' => 'youtube', 'from_schedule' => '1', 'pre_key' => $item['location'] ?? '', 'pre_lng' => $item['lng'] ?? 0, 'pre_lat' => $item['lat'] ?? 0]);
                    ?>
                    <a href="?<?= $prefillLines ?>" class="btn btn-sm btn-secondary" title="以此行程建立掃街路線">+路線</a>
                    <a href="?<?= $prefillYt ?>" class="btn btn-sm btn-secondary" title="以此行程建立街講地點">+街講</a>
                    <form method="post" onsubmit="return confirm('確定刪除此行程？')">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="index" value="<?= $i ?>">
                        <button type="submit" class="btn btn-sm btn-danger">刪除</button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php elseif ($tab === 'schedule_types'): ?>
<!-- Schedule Types Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($scheduleTypes[$editIndex])):
        $ef = $scheduleTypes[$editIndex];
    ?>
    <h2>編輯行程類型 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <label>類型名稱</label>
        <input type="text" name="name" value="<?= htmlspecialchars($ef['name'] ?? '') ?>" required id="editFocus">
        <label>標記顏色</label>
        <div style="display:flex;gap:8px;align-items:center">
            <input type="color" name="color" value="<?= htmlspecialchars($ef['color'] ?? '#28c8c8') ?>" style="width:50px;height:36px;border:1px solid #ccc;border-radius:4px;cursor:pointer">
            <input type="text" name="color_text" value="<?= htmlspecialchars($ef['color'] ?? '#28c8c8') ?>" style="width:100px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;font-family:monospace" oninput="this.previousElementSibling.value=this.value" id="colorText">
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=schedule_types" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增行程類型</h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="create">
        <label>類型名稱</label>
        <input type="text" name="name" placeholder="掃街" required>
        <label>標記顏色</label>
        <div style="display:flex;gap:8px;align-items:center">
            <input type="color" name="color" value="#28c8c8" style="width:50px;height:36px;border:1px solid #ccc;border-radius:4px;cursor:pointer">
            <input type="text" name="color_text" value="#28c8c8" style="width:100px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;font-family:monospace" oninput="this.previousElementSibling.value=this.value" id="colorText">
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>行程類型列表 (<?= count($scheduleTypes) ?> 筆)</h2>
    <table>
        <thead>
            <tr><th>#</th><th>名稱</th><th>顏色</th><th>預覽</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach ($scheduleTypes as $i => $st): ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td><?= htmlspecialchars($st['name'] ?? '') ?></td>
                <td style="font-family:monospace;font-size:12px"><?= htmlspecialchars($st['color'] ?? '') ?></td>
                <td><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:<?= htmlspecialchars($st['color'] ?? '#ccc') ?>;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></span></td>
                <td class="actions">
                    <a href="?tab=schedule_types&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <form method="post" onsubmit="return confirm('確定刪除此類型？')">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="index" value="<?= $i ?>">
                        <button type="submit" class="btn btn-sm btn-danger">刪除</button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php endif; ?>

</div>

<script>
function extractYoutubeId(input) {
    input = input.trim();
    var m;
    if ((m = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|live\/|embed\/|shorts\/))([A-Za-z0-9_-]{11})/))) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
    return null;
}

function fetchYoutubeInfo(inputId, titleId) {
    var input = document.getElementById(inputId);
    var titleInput = document.getElementById(titleId);
    var vid = extractYoutubeId(input.value);
    if (!vid) { alert('無法辨識 YouTube 影片 ID'); return; }
    input.value = vid;
    var btn = event.target;
    btn.textContent = '取得中...';
    btn.disabled = true;
    fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + vid + '&format=json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.title) titleInput.value = data.title;
            btn.textContent = '取得標題';
            btn.disabled = false;
        })
        .catch(function() {
            alert('無法取得影片資訊，請確認影片 ID 是否正確');
            btn.textContent = '取得標題';
            btn.disabled = false;
        });
}

document.addEventListener('DOMContentLoaded', function() {
    ['createVideoInput', 'editVideoInput'].forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('paste', function() {
            var titleId = id === 'createVideoInput' ? 'createTitleInput' : 'editTitleInput';
            setTimeout(function() { fetchYoutubeInfo(id, titleId); }, 100);
        });
    });
});

function filterTable(tableId, query, countId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var rows = table.tBodies[0].rows;
    var q = query.toLowerCase();
    var shown = 0, total = 0;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        total++;
        if (!q || row.textContent.toLowerCase().indexOf(q) !== -1) {
            row.style.display = '';
            shown++;
        } else {
            row.style.display = 'none';
        }
    }
    var countEl = document.getElementById(countId);
    if (countEl) {
        countEl.textContent = q ? (shown + ' / ' + total + ' 筆') : '';
    }
}

var ef = document.getElementById('editFocus');
if (ef) {
    ef.closest('.card').scrollIntoView({ behavior: 'smooth' });
    ef.focus();
}

// Sync color picker with text input
document.querySelectorAll('input[type="color"]').forEach(function(picker) {
    var textInput = picker.nextElementSibling;
    if (textInput && textInput.tagName === 'INPUT') {
        picker.addEventListener('input', function() {
            textInput.value = picker.value;
        });
    }
});

function addVideoRow(containerId) {
    var div = document.getElementById(containerId);
    var row = document.createElement('div');
    row.className = 'video-row';
    row.innerHTML = '<input type="text" name="video_id[]" placeholder="影片 ID">'
        + '<input type="text" name="video_title[]" placeholder="影片標題">'
        + '<span class="remove-video" onclick="this.parentElement.remove()">✕</span>';
    div.appendChild(row);
}

(function() {
    var mapDiv = document.getElementById('pickerMap');
    if (!mapDiv) return;
    var lngInput = document.getElementById('inputLng');
    var latInput = document.getElementById('inputLat');
    var initLng = parseFloat(lngInput.value) || 120.198;
    var initLat = parseFloat(latInput.value) || 23.004582;
    var hasCoord = lngInput.value && latInput.value && parseFloat(lngInput.value) !== 0;

    var map = L.map('pickerMap').setView([initLat, initLng], hasCoord ? 16 : 14);
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        maxZoom: 20,
        attribution: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }).addTo(map);

    var marker = null;
    if (hasCoord) {
        marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
        marker.on('dragend', function() {
            var pos = marker.getLatLng();
            lngInput.value = pos.lng.toFixed(6);
            latInput.value = pos.lat.toFixed(6);
        });
    }

    map.on('click', function(e) {
        lngInput.value = e.latlng.lng.toFixed(6);
        latInput.value = e.latlng.lat.toFixed(6);
        if (marker) {
            marker.setLatLng(e.latlng);
        } else {
            marker = L.marker(e.latlng, { draggable: true }).addTo(map);
            marker.on('dragend', function() {
                var pos = marker.getLatLng();
                lngInput.value = pos.lng.toFixed(6);
                latInput.value = pos.lat.toFixed(6);
            });
        }
    });

    function updateFromInputs() {
        var lng = parseFloat(lngInput.value);
        var lat = parseFloat(latInput.value);
        if (!isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) {
            var pos = L.latLng(lat, lng);
            map.setView(pos, map.getZoom());
            if (marker) {
                marker.setLatLng(pos);
            } else {
                marker = L.marker(pos, { draggable: true }).addTo(map);
                marker.on('dragend', function() {
                    var p = marker.getLatLng();
                    lngInput.value = p.lng.toFixed(6);
                    latInput.value = p.lat.toFixed(6);
                });
            }
        }
    }
    lngInput.addEventListener('change', updateFromInputs);
    latInput.addEventListener('change', updateFromInputs);
})();
</script>
</body>
</html>
