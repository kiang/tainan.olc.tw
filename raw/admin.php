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
    require __DIR__ . '/admin_handlers.php';
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
<?php require __DIR__ . '/admin_assets.php'; ?>
</head>
<body>
<div class="container">
<h1>資料管理 - 掃街紀錄 / 街講地點 / 行程</h1>

<?php if ($message): ?>
<div class="msg <?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
<?php endif; ?>

<div class="tabs">
    <a href="?tab=lines" class="<?= $tab === 'lines' ? 'active' : '' ?>">掃街 (lines.json)</a>
    <a href="?tab=youtube" class="<?= $tab === 'youtube' ? 'active' : '' ?>">街講地點 (youtube.json)</a>
    <a href="?tab=schedule" class="<?= $tab === 'schedule' ? 'active' : '' ?>">行程 (schedule.json)</a>
    <a href="?tab=schedule_types" class="<?= $tab === 'schedule_types' ? 'active' : '' ?>">行程類型</a>
</div>

<?php
if ($tab === 'lines') {
    require __DIR__ . '/admin_tab_lines.php';
} elseif ($tab === 'youtube') {
    require __DIR__ . '/admin_tab_youtube.php';
} elseif ($tab === 'schedule') {
    require __DIR__ . '/admin_tab_schedule.php';
} elseif ($tab === 'schedule_types') {
    require __DIR__ . '/admin_tab_schedule_types.php';
}
?>

</div>
</body>
</html>
