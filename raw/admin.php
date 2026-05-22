<?php
$dataFiles = [
    'lines' => __DIR__ . '/../docs/json/lines.json',
    'youtube' => __DIR__ . '/../docs/json/youtube.json',
    'youtube_list' => __DIR__ . '/../docs/json/youtube_list.json',
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
            if (!empty($coords) && !empty($_POST['v'])) {
                $lines['features'][] = [
                    'type' => 'Feature',
                    'properties' => [
                        'ymdh' => intval($_POST['ymdh']),
                        'v' => $_POST['v'],
                    ],
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => $coords,
                    ],
                ];
                saveJson($dataFiles['lines'], $lines);
                $message = '已新增掃街路線';
                $messageType = 'success';
            } else {
                $message = '請填寫完整資料（座標與影片ID）';
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
                if (!empty($coords)) {
                    $lines['features'][$idx]['properties']['ymdh'] = intval($_POST['ymdh']);
                    $lines['features'][$idx]['properties']['v'] = $_POST['v'];
                    $lines['features'][$idx]['geometry']['coordinates'] = $coords;
                    saveJson($dataFiles['lines'], $lines);
                    $message = '已更新掃街路線 #' . $idx;
                    $messageType = 'success';
                }
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

$editIndex = isset($_GET['edit']) ? intval($_GET['edit']) : -1;
?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>資料管理 - 掃街/街講</title>
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
</style>
</head>
<body>
<div class="container">
<h1>資料管理 - 掃街紀錄 / 街講地點</h1>

<?php if ($message): ?>
<div class="msg <?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
<?php endif; ?>

<div class="tabs">
    <a href="?tab=lines" class="<?= $tab === 'lines' ? 'active' : '' ?>">掃街路線 (lines.json)</a>
    <a href="?tab=youtube" class="<?= $tab === 'youtube' ? 'active' : '' ?>">街講地點 (youtube.json)</a>
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
        <label>YouTube 影片 ID</label>
        <input type="text" name="v" value="<?= htmlspecialchars($ef['properties']['v'] ?? '') ?>" required>
        <label>座標 (每行一組 lng,lat)</label>
        <textarea name="coordinates" required><?php
            foreach (($ef['geometry']['coordinates'] ?? []) as $c) {
                echo $c[0] . ',' . $c[1] . "\n";
            }
        ?></textarea>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=lines" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增掃街路線</h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="create">
        <label>日期時間 (ymdh 格式，如 2022080315)</label>
        <input type="text" name="ymdh" placeholder="2022080315" required>
        <label>YouTube 影片 ID</label>
        <input type="text" name="v" placeholder="XbQ5lpJo910" required>
        <label>座標 (每行一組 lng,lat)</label>
        <textarea name="coordinates" placeholder="120.19837595,22.99293332&#10;120.19743906,22.99314248&#10;120.19738947,22.99341597" required></textarea>
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
            <tr><th>#</th><th>日期時間</th><th>影片ID</th><th>座標點數</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (($lines['features'] ?? []) as $i => $feature): ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td><?= htmlspecialchars($feature['properties']['ymdh'] ?? '') ?></td>
                <td><a href="https://www.youtube.com/watch?v=<?= htmlspecialchars($feature['properties']['v'] ?? '') ?>" target="_blank"><?= htmlspecialchars($feature['properties']['v'] ?? '') ?></a></td>
                <td><?= count($feature['geometry']['coordinates'] ?? []) ?></td>
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
        <label>經度 (lng)</label>
        <input type="text" name="lng" value="<?= $ef['geometry']['coordinates'][0] ?? 0 ?>" required>
        <label>緯度 (lat)</label>
        <input type="text" name="lat" value="<?= $ef['geometry']['coordinates'][1] ?? 0 ?>" required>
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
    <h2>新增街講地點</h2>
    <form method="post" class="edit-form" id="createForm">
        <input type="hidden" name="action" value="create">
        <label>地點名稱 (key)</label>
        <input type="text" name="key" placeholder="北區和緯路四段/文賢路" required>
        <label>經度 (lng)</label>
        <input type="text" name="lng" placeholder="120.193953" required>
        <label>緯度 (lat)</label>
        <input type="text" name="lat" placeholder="23.009592" required>
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
<?php endif; ?>

</div>

<script>
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

function addVideoRow(containerId) {
    var div = document.getElementById(containerId);
    var row = document.createElement('div');
    row.className = 'video-row';
    row.innerHTML = '<input type="text" name="video_id[]" placeholder="影片 ID">'
        + '<input type="text" name="video_title[]" placeholder="影片標題">'
        + '<span class="remove-video" onclick="this.parentElement.remove()">✕</span>';
    div.appendChild(row);
}
</script>
</body>
</html>
