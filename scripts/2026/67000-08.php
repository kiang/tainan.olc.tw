<?php
$basePath = dirname(dirname(__DIR__));
$linksJsonPath = $basePath . '/docs/p/2026/tpp/67000-08_cunli_links.json';
$areaPath = $basePath . '/docs/p/2026/data/area_names.json';
$candidateBase = 'https://kiang.github.io/vote2026/candidates/';

$links = [];
if (file_exists($linksJsonPath)) {
    $links = json_decode(file_get_contents($linksJsonPath), true) ?: [];
}

$message = '';
$needsInit = empty($links);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'save') {
        foreach ($links as $label => &$entry) {
            $candidates = $_POST['candidates'][$label] ?? [];
            foreach ($entry['candidates'] as $candName => &$candData) {
                $input = $candidates[$candName] ?? [];
                $candData['facebook'] = trim($input['facebook'] ?? '');
                $candData['threads'] = trim($input['threads'] ?? '');
                $candData['website'] = trim($input['website'] ?? '');
            }
            unset($candData);
        }
        unset($entry);
        file_put_contents($linksJsonPath, json_encode($links, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $message = '已儲存 ' . date('Y-m-d H:i:s');
    }

    if ($action === 'fetch') {
        $areaNames = json_decode(file_get_contents($areaPath), true);
        $targetTowns = [];
        foreach ($areaNames['towns'] as $code => $name) {
            if (str_starts_with($code, '67000') && in_array($name, ['北區', '中西區'])) {
                $targetTowns[$code] = $name;
            }
        }
        $villageList = [];
        foreach ($areaNames['villages'] as $code => $name) {
            foreach ($targetTowns as $tcode => $tname) {
                if (str_starts_with($code, $tcode)) {
                    $villageList[] = ['code' => $code, 'town' => $tname, 'name' => $name, 'label' => $tname . $name];
                }
            }
        }

        $fetchCount = 0;
        foreach ($villageList as $v) {
            $url = $candidateBase . $v['code'] . '.json';
            $json = @file_get_contents($url);
            if ($json === false) continue;
            $data = json_decode($json, true);
            if (!$data) continue;
            $lz = $data['elections']['村里長'] ?? null;
            if (!$lz || empty($lz['candidates'])) continue;

            $label = $v['label'];
            if (!isset($links[$label])) {
                $links[$label] = ['candidates' => []];
            }
            foreach ($lz['candidates'] as $c) {
                $name = $c['name'];
                if (!isset($links[$label]['candidates'][$name])) {
                    $links[$label]['candidates'][$name] = [
                        '_party' => $c['party'] ?? '',
                        'facebook' => '',
                        'threads' => '',
                        'website' => '',
                    ];
                } else {
                    $links[$label]['candidates'][$name]['_party'] = $c['party'] ?? '';
                }
            }
            $fetchCount++;
        }
        ksort($links);
        file_put_contents($linksJsonPath, json_encode($links, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $links = json_decode(file_get_contents($linksJsonPath), true) ?: [];
        $needsInit = false;
        $message = "已從選委會更新 {$fetchCount} 里候選人名單";
    }
}

if (isset($_GET['json'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo json_encode($links, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>67000-08 里長候選人連結管理</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5;padding:16px;font-size:14px}
h1{font-size:1.3em;margin-bottom:12px}
.msg{background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:10px;margin-bottom:12px}
.actions{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.btn{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:.9em;font-weight:600}
.btn-primary{background:#28c7b7;color:#fff}.btn-primary:hover{background:#1ea99b}
.btn-secondary{background:#607d8b;color:#fff}.btn-secondary:hover{background:#455a64}
.cunli-section{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px}
.cunli-title{font-weight:700;font-size:.95em;margin-bottom:8px;color:#333;display:flex;align-items:center;gap:8px}
.town-tag{font-size:.75em;padding:2px 6px;border-radius:3px;color:#fff}
.town-tag.north{background:#1565c0}.town-tag.west{background:#6a1b9a}
.cand-row{display:grid;grid-template-columns:100px 80px 1fr 1fr 1fr;gap:6px;align-items:center;margin-bottom:6px;font-size:.85em}
.cand-row input{padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:.85em;width:100%}
.cand-name{font-weight:600}.cand-party{font-size:.8em;color:#666}
.header-row{font-weight:700;font-size:.8em;color:#666;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:6px}
.init-box{background:#fff3e0;border:2px solid #ffb74d;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px}
@media(max-width:768px){.cand-row{grid-template-columns:1fr;}.header-row{display:none}}
</style>
</head>
<body>
<h1>臺南市第08選區 里長候選人連結管理</h1>
<p style="color:#666;margin-bottom:12px;font-size:.85em">中西區、北區 53 里 — 管理各里長候選人的 Facebook / Threads / 網站連結</p>

<?php if ($message): ?>
<div class="msg"><?= htmlspecialchars($message) ?></div>
<?php endif; ?>

<?php if ($needsInit): ?>
<div class="init-box">
    <p style="margin-bottom:12px">尚無候選人資料，請先初始化：</p>
    <form method="post" style="display:inline">
        <input type="hidden" name="action" value="fetch">
        <button type="submit" class="btn btn-primary">從選委會載入候選人名單</button>
    </form>
</div>
<?php else: ?>

<div class="actions">
    <form method="post" style="display:inline">
        <input type="hidden" name="action" value="fetch">
        <button type="submit" class="btn btn-secondary">重新載入候選人名單</button>
    </form>
    <a href="?json" target="_blank" class="btn btn-secondary" style="display:inline-block;text-decoration:none;color:#fff">檢視 JSON</a>
</div>

<form method="post">
<input type="hidden" name="action" value="save">
<div class="actions">
    <button type="submit" class="btn btn-primary">儲存所有連結</button>
</div>

<div class="header-row cand-row" style="background:none;border:none;padding:12px">
    <span>候選人</span>
    <span>政黨</span>
    <span>Facebook</span>
    <span>Threads</span>
    <span>網站</span>
</div>

<?php foreach ($links as $label => $entry):
    $cunliCands = $entry['candidates'] ?? [];
    if (empty($cunliCands)) continue;
    $parts = mb_substr($label, 0, mb_strpos($label, '區') + 1);
    $townClass = $parts === '北區' ? 'north' : 'west';
    $villageName = mb_substr($label, mb_strpos($label, '區') + 1);
?>
<div class="cunli-section">
    <div class="cunli-title">
        <span class="town-tag <?= $townClass ?>"><?= htmlspecialchars($parts) ?></span>
        <?= htmlspecialchars($villageName) ?>
    </div>
    <?php foreach ($cunliCands as $candName => $candData):
        $party = $candData['_party'] ?? '';
    ?>
    <div class="cand-row">
        <span class="cand-name"><?= htmlspecialchars($candName) ?></span>
        <span class="cand-party"><?= htmlspecialchars($party ?: '無') ?></span>
        <input type="text" name="candidates[<?= htmlspecialchars($label) ?>][<?= htmlspecialchars($candName) ?>][facebook]"
               value="<?= htmlspecialchars($candData['facebook'] ?? '') ?>" placeholder="Facebook 網址">
        <input type="text" name="candidates[<?= htmlspecialchars($label) ?>][<?= htmlspecialchars($candName) ?>][threads]"
               value="<?= htmlspecialchars($candData['threads'] ?? '') ?>" placeholder="Threads 網址">
        <input type="text" name="candidates[<?= htmlspecialchars($label) ?>][<?= htmlspecialchars($candName) ?>][website]"
               value="<?= htmlspecialchars($candData['website'] ?? '') ?>" placeholder="網站網址">
    </div>
    <?php endforeach; ?>
</div>
<?php endforeach; ?>

<div class="actions" style="margin-top:16px">
    <button type="submit" class="btn btn-primary">儲存所有連結</button>
</div>
</form>
<?php endif; ?>
</body>
</html>
