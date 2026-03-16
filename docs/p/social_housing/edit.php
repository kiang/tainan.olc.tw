<?php
$dataFile = __DIR__ . '/data/social_housing.json';

// Handle POST: save updated data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    // Load current data
    $data = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) : [];
    if (!is_array($data)) {
        $data = [];
    }

    // Build lookup by city+name
    $lookup = [];
    foreach ($data as $i => &$item) {
        $lookup[$item['city'] . '_' . $item['name']] = &$item;
    }
    unset($item);

    // Apply updates
    foreach ($input as $update) {
        $key = $update['city'] . '_' . $update['name'];
        if (isset($lookup[$key])) {
            $lookup[$key]['lat'] = isset($update['lat']) && $update['lat'] !== '' ? floatval($update['lat']) : null;
            $lookup[$key]['lng'] = isset($update['lng']) && $update['lng'] !== '' ? floatval($update['lng']) : null;
            if (array_key_exists('nickname', $update)) {
                $lookup[$key]['nickname'] = $update['nickname'] !== '' ? $update['nickname'] : '';
            }
        }
    }

    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok' => true, 'count' => count($input)]);
    exit;
}

// GET: serve the editor UI
$data = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) : [];
$cities = [];
$statuses = [];
foreach ($data as $item) {
    $cities[$item['city']] = true;
    $statuses[$item['status']] = true;
}
ksort($cities);
ksort($statuses);
?>
<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
    <meta charset="utf-8">
    <title>社會住宅資料維護</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { font-family: 'Noto Sans TC', sans-serif; background: #f5f6fa; }
        .top-bar {
            background: #2c3e50; color: white; padding: 12px 20px;
            display: flex; align-items: center; gap: 15px; flex-wrap: wrap;
            position: sticky; top: 0; z-index: 1100;
        }
        .top-bar h5 { margin: 0; white-space: nowrap; }
        .top-bar select, .top-bar input { font-size: 14px; }
        .main-wrap { display: flex; height: calc(100vh - 56px); }
        .table-panel { flex: 1; overflow-y: auto; padding: 0; }
        .map-panel { width: 45%; min-width: 350px; position: relative; }
        #editMap { height: 100%; }
        table.data-table { width: 100%; font-size: 13px; border-collapse: collapse; }
        table.data-table th {
            position: sticky; top: 0; background: #34495e; color: white;
            padding: 8px 6px; text-align: left; white-space: nowrap; z-index: 10;
        }
        table.data-table td { padding: 5px 6px; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
        table.data-table tr:hover { background: #eaf2f8; }
        table.data-table tr.active-row { background: #d4efdf; }
        table.data-table tr.no-coords { color: #999; }
        table.data-table tr.no-coords td:first-child { border-left: 3px solid #e74c3c; }
        table.data-table tr.has-coords td:first-child { border-left: 3px solid #27ae60; }
        .coord-input { width: 180px; font-size: 12px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px; }
        .nickname-input { width: 120px; font-size: 12px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px; }
        .coord-input:focus, .nickname-input:focus { border-color: #3498db; outline: none; box-shadow: 0 0 0 2px rgba(52,152,219,0.2); }
        .coord-input.changed, .nickname-input.changed { border-color: #e67e22; background: #fef9e7; }
        .btn-pick { font-size: 11px; padding: 2px 6px; cursor: pointer; }
        .btn-save-all {
            background: #27ae60; color: white; border: none; padding: 6px 18px;
            border-radius: 5px; font-size: 14px; cursor: pointer;
        }
        .btn-save-all:hover { background: #219a52; }
        .btn-save-all:disabled { background: #95a5a6; cursor: default; }
        .pick-hint {
            position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
            background: rgba(231,76,60,0.9); color: white; padding: 8px 18px;
            border-radius: 8px; z-index: 1000; font-size: 14px; display: none;
            pointer-events: none;
        }
        .changes-badge {
            background: #e74c3c; color: white; border-radius: 10px;
            padding: 2px 8px; font-size: 12px; margin-left: 5px;
        }
        .filter-select { padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: white; }
        .filter-select option { color: #333; background: white; }
        .search-box { padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: white; width: 160px; }
        .search-box::placeholder { color: rgba(255,255,255,0.6); }
        .coord-filter { display: flex; gap: 5px; }
        .coord-filter label { font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 3px; }
        @media (max-width: 900px) {
            .main-wrap { flex-direction: column; }
            .map-panel { width: 100%; height: 40vh; min-width: auto; }
            .table-panel { height: 60vh; }
        }
    </style>
</head>
<body>

<div class="top-bar">
    <h5>社會住宅資料維護</h5>
    <select id="filterCity" class="filter-select">
        <option value="">全部縣市</option>
        <?php foreach ($cities as $c => $_): ?>
        <option value="<?= htmlspecialchars($c) ?>"><?= htmlspecialchars($c) ?></option>
        <?php endforeach; ?>
    </select>
    <select id="filterStatus" class="filter-select">
        <option value="">全部狀態</option>
        <?php foreach ($statuses as $s => $_): ?>
        <option value="<?= htmlspecialchars($s) ?>"><?= htmlspecialchars($s) ?></option>
        <?php endforeach; ?>
    </select>
    <div class="coord-filter">
        <label><input type="radio" name="coordFilter" value="" checked> 全部</label>
        <label><input type="radio" name="coordFilter" value="no"> 無座標</label>
        <label><input type="radio" name="coordFilter" value="yes"> 有座標</label>
    </div>
    <input type="text" id="searchBox" class="search-box" placeholder="搜尋案名...">
    <button class="btn-save-all" id="btnSave" disabled><span id="btnSaveText">儲存變更</span> <span class="changes-badge" id="changeCount" style="display:none">0</span></button>
    <a href="./" style="color:rgba(255,255,255,0.7);font-size:13px;text-decoration:none;">← 回地圖</a>
</div>

<div class="main-wrap">
    <div class="table-panel">
        <table class="data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>縣市</th>
                    <th>案名</th>
                    <th>興辦主體</th>
                    <th>戶數</th>
                    <th>狀態</th>
                    <th>別名</th>
                    <th>座標 (lat,lng)</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody id="dataBody"></tbody>
        </table>
    </div>
    <div class="map-panel">
        <div id="editMap"></div>
        <div class="pick-hint" id="pickHint">點擊地圖設定座標</div>
    </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var rawData = <?= json_encode($data, JSON_UNESCAPED_UNICODE) ?>;

var map = L.map('editMap').setView([23.7, 120.9], 8);
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; 國土測繪中心',
    maxZoom: 19
}).addTo(map);

var markerLayer = L.layerGroup().addTo(map);
var pickMarker = null;
var pickingIndex = -1;
var changes = {};  // key -> {lat, lng, nickname, city, name}

function getKey(item) {
    return item.city + '_' + item.name;
}

function getCoords(item) {
    var key = getKey(item);
    if (changes[key]) return { lat: changes[key].lat, lng: changes[key].lng };
    return { lat: item.lat, lng: item.lng };
}

function getNickname(item) {
    var key = getKey(item);
    if (changes[key] && changes[key].nickname !== undefined) return changes[key].nickname;
    return item.nickname || '';
}

function applyFilters() {
    var city = document.getElementById('filterCity').value;
    var status = document.getElementById('filterStatus').value;
    var coordFilter = document.querySelector('input[name="coordFilter"]:checked').value;
    var search = document.getElementById('searchBox').value.toLowerCase();
    var tbody = document.getElementById('dataBody');
    var rows = tbody.querySelectorAll('tr');

    rows.forEach(function(row) {
        var idx = parseInt(row.dataset.index);
        var item = rawData[idx];
        var coords = getCoords(item);
        var hasCoords = coords.lat !== null && coords.lng !== null;
        var show = true;

        if (city && item.city !== city) show = false;
        if (status && item.status !== status) show = false;
        if (coordFilter === 'no' && hasCoords) show = false;
        if (coordFilter === 'yes' && !hasCoords) show = false;
        if (search && item.name.toLowerCase().indexOf(search) === -1) show = false;

        row.style.display = show ? '' : 'none';
    });
}

function updateMapMarkers() {
    markerLayer.clearLayers();
    rawData.forEach(function(item, idx) {
        var coords = getCoords(item);
        if (coords.lat && coords.lng) {
            L.circleMarker([coords.lat, coords.lng], {
                radius: 6, fillColor: '#3498db', color: '#fff',
                weight: 2, fillOpacity: 0.8
            }).bindTooltip(item.name, { direction: 'top' })
              .on('click', function() { highlightRow(idx); })
              .addTo(markerLayer);
        }
    });
}

function highlightRow(idx) {
    document.querySelectorAll('#dataBody tr').forEach(function(r) {
        r.classList.remove('active-row');
    });
    var row = document.querySelector('tr[data-index="' + idx + '"]');
    if (row) {
        row.classList.add('active-row');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function updateChangeBadge() {
    var count = Object.keys(changes).length;
    var badge = document.getElementById('changeCount');
    var btn = document.getElementById('btnSave');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
    btn.disabled = count === 0;
}

function formatCoord(item) {
    if (item.lat !== null && item.lng !== null) return item.lat + ',' + item.lng;
    return '';
}

function parseCoord(val) {
    var parts = val.split(',');
    if (parts.length === 2) {
        var lat = parseFloat(parts[0].trim());
        var lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) return { lat: lat, lng: lng };
    }
    return { lat: null, lng: null };
}

function onRowInput(idx) {
    var row = document.querySelector('tr[data-index="' + idx + '"]');
    var coordEl = row.querySelector('.coord-input');
    var nickEl = row.querySelector('.nickname-input');
    var item = rawData[idx];
    var key = getKey(item);

    var newCoord = coordEl.value.trim();
    var origCoord = formatCoord(item);
    var coordChanged = newCoord !== origCoord;

    var newNick = nickEl.value;
    var origNick = item.nickname || '';
    var nickChanged = newNick !== origNick;

    coordEl.classList.toggle('changed', coordChanged);
    nickEl.classList.toggle('changed', nickChanged);

    if (coordChanged || nickChanged) {
        var parsed = parseCoord(newCoord);
        changes[key] = {
            city: item.city,
            name: item.name,
            lat: coordChanged ? parsed.lat : item.lat,
            lng: coordChanged ? parsed.lng : item.lng,
            nickname: newNick
        };
    } else {
        delete changes[key];
    }

    var coords = getCoords(item);
    var hasCoords = coords.lat !== null && coords.lng !== null;
    row.className = 'data-row ' + (hasCoords ? 'has-coords' : 'no-coords');

    updateChangeBadge();
    updateMapMarkers();
}

function startPick(idx) {
    pickingIndex = idx;
    document.getElementById('pickHint').style.display = 'block';
    document.getElementById('editMap').style.cursor = 'crosshair';
    highlightRow(idx);

    // Zoom to existing coordinates if available
    var coords = getCoords(rawData[idx]);
    if (coords.lat && coords.lng) {
        map.setView([coords.lat, coords.lng], 16);
    }
}

function cancelPick() {
    pickingIndex = -1;
    document.getElementById('pickHint').style.display = 'none';
    document.getElementById('editMap').style.cursor = '';
    if (pickMarker) {
        map.removeLayer(pickMarker);
        pickMarker = null;
    }
}

map.on('click', function(e) {
    if (pickingIndex < 0) return;

    var lat = Math.round(e.latlng.lat * 1000000) / 1000000;
    var lng = Math.round(e.latlng.lng * 1000000) / 1000000;

    var row = document.querySelector('tr[data-index="' + pickingIndex + '"]');
    row.querySelector('.coord-input').value = lat + ',' + lng;
    onRowInput(pickingIndex);

    if (pickMarker) map.removeLayer(pickMarker);
    pickMarker = L.marker([lat, lng]).addTo(map);

    cancelPick();
});

// ESC to cancel picking
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') cancelPick();
});

function buildTable() {
    var tbody = document.getElementById('dataBody');
    tbody.innerHTML = '';

    rawData.forEach(function(item, idx) {
        var coords = getCoords(item);
        var hasCoords = coords.lat !== null && coords.lng !== null;
        var tr = document.createElement('tr');
        tr.dataset.index = idx;
        tr.className = 'data-row ' + (hasCoords ? 'has-coords' : 'no-coords');
        var nick = item.nickname || '';
        tr.innerHTML =
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + item.city + '</td>' +
            '<td>' + item.name + '</td>' +
            '<td>' + item.organizer + '</td>' +
            '<td>' + item.units + '</td>' +
            '<td>' + item.status + '</td>' +
            '<td><input type="text" class="nickname-input" value="' + nick.replace(/"/g, '&quot;') + '" placeholder="別名"></td>' +
            '<td><input type="text" class="coord-input" value="' + formatCoord(item) + '" placeholder="lat,lng"></td>' +
            '<td><button class="btn btn-outline-primary btn-pick btn-sm" title="從地圖點選座標">&#x1f4cd;</button></td>';
        tbody.appendChild(tr);

        tr.querySelector('.nickname-input').addEventListener('input', function() { onRowInput(idx); });
        tr.querySelector('.coord-input').addEventListener('input', function() { onRowInput(idx); });
        tr.querySelector('.btn-pick').addEventListener('click', function() { startPick(idx); });
    });

    updateMapMarkers();
}

// Save
document.getElementById('btnSave').addEventListener('click', function() {
    var updates = Object.values(changes);
    if (updates.length === 0) return;

    var btn = this;
    var btnText = document.getElementById('btnSaveText');
    btn.disabled = true;
    btnText.textContent = '儲存中...';

    fetch('edit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    })
    .then(function(r) { return r.json(); })
    .then(function(result) {
        if (result.ok) {
            // Apply changes to rawData so they become the new baseline
            updates.forEach(function(u) {
                rawData.forEach(function(item) {
                    if (item.city === u.city && item.name === u.name) {
                        item.lat = u.lat !== null && u.lat !== '' ? parseFloat(u.lat) : null;
                        item.lng = u.lng !== null && u.lng !== '' ? parseFloat(u.lng) : null;
                        if (u.nickname !== undefined) item.nickname = u.nickname;
                    }
                });
            });
            changes = {};
            updateChangeBadge();
            document.querySelectorAll('.coord-input.changed, .nickname-input.changed').forEach(function(el) {
                el.classList.remove('changed');
            });
            btnText.textContent = '已儲存 ✓';
            setTimeout(function() {
                btnText.textContent = '儲存變更';
            }, 1500);
        } else {
            alert('儲存失敗: ' + (result.error || 'unknown'));
            btnText.textContent = '儲存變更';
            btn.disabled = false;
        }
    })
    .catch(function(err) {
        alert('儲存失敗: ' + err);
        btnText.textContent = '儲存變更';
        btn.disabled = false;
    });
});

// Filters
document.getElementById('filterCity').addEventListener('change', applyFilters);
document.getElementById('filterStatus').addEventListener('change', applyFilters);
document.querySelectorAll('input[name="coordFilter"]').forEach(function(r) {
    r.addEventListener('change', applyFilters);
});
document.getElementById('searchBox').addEventListener('input', applyFilters);

buildTable();
</script>
</body>
</html>
