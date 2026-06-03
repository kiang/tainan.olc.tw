<?php
$dataDir = __DIR__ . '/data/';
$plantsFile = $dataDir . 'plants.json';
$areasFile = $dataDir . 'areas.json';
$fileWritable = is_writable($plantsFile);

// Handle save
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    if (!$fileWritable) {
        echo json_encode(['ok' => false, 'error' => '檔案無法寫入: ' . $plantsFile]);
        exit;
    }
    $plantsData = json_decode(file_get_contents($plantsFile), true);

    if ($_POST['action'] === 'save_plant') {
        $idx = intval($_POST['index']);
        if (isset($plantsData['plants'][$idx])) {
            $plant = &$plantsData['plants'][$idx];
            $plant['name'] = $_POST['name'];
            $plant['source'] = $_POST['source'];
            $plant['level'] = $_POST['level'];
            $plant['areas']['county'] = $_POST['county'] ?: null;
            $plant['areas']['towns'] = array_values(array_filter(array_map('intval', explode(',', $_POST['towns']))));
            $plant['areas']['villages'] = array_values(array_filter(array_map('intval', explode(',', $_POST['villages']))));
            if ($_POST['lat'] !== '' && $_POST['lng'] !== '') {
                $plant['lat'] = round(floatval($_POST['lat']), 6);
                $plant['lng'] = round(floatval($_POST['lng']), 6);
            } else {
                unset($plant['lat'], $plant['lng']);
            }
            file_put_contents($plantsFile, json_encode($plantsData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'error' => 'Invalid index']);
        }
    } elseif ($_POST['action'] === 'save_all_areas') {
        $updates = json_decode($_POST['updates'], true);
        foreach ($updates as $u) {
            $idx = intval($u['index']);
            if (!isset($plantsData['plants'][$idx])) continue;
            $plant = &$plantsData['plants'][$idx];
            $plant['areas']['county'] = $u['county'] ?: null;
            $plant['areas']['towns'] = array_values(array_map('intval', $u['towns']));
            $plant['areas']['villages'] = array_values(array_map('intval', $u['villages']));
            $plant['level'] = $u['level'];
        }
        file_put_contents($plantsFile, json_encode($plantsData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
        echo json_encode(['ok' => true]);
    }
    exit;
}

// Load data
$plantsData = json_decode(file_get_contents($plantsFile), true);
$plants = $plantsData['plants'];

// Build admin area lookup from lightweight areas.json
$areas = json_decode(file_get_contents($areasFile), true);
$areaLookup = []; // code => {county, town}
$counties = [];   // countyCode => countyName
$townsByCounty = []; // countyCode => [{code, name}]
foreach ($areas as $p) {
    $counties[$p['COUNTYCODE']] = $p['COUNTYNAME'];
    if (!isset($townsByCounty[$p['COUNTYCODE']])) {
        $townsByCounty[$p['COUNTYCODE']] = [];
    }
    $townsByCounty[$p['COUNTYCODE']][] = [
        'code' => $p['TOWNCODE'],
        'name' => $p['TOWNNAME'],
    ];
    $areaLookup[$p['TOWNCODE']] = $p['COUNTYNAME'] . $p['TOWNNAME'];
}
ksort($counties);
foreach ($townsByCounty as &$ts) {
    usort($ts, function ($a, $b) { return strcmp($a['code'], $b['code']); });
}
unset($ts);
?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<title>淨水場資料編輯</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f0f2f5; color: #333; }
.top-bar { background: #1565c0; color: #fff; padding: 12px 20px; display: flex; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 1000; }
.top-bar h1 { font-size: 18px; font-weight: 600; }
.top-bar .stats { font-size: 13px; opacity: .85; }
.warn-banner { background: #c62828; color: #fff; padding: 10px 20px; font-size: 14px; text-align: center; }
.filters { padding: 12px 20px; background: #fff; border-bottom: 1px solid #ddd; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; position: sticky; top: 44px; z-index: 999; }
.filters input, .filters select { padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
.filters input[type=text] { width: 240px; }
.filters label { font-size: 13px; display: flex; align-items: center; gap: 4px; }
.container { max-width: 1400px; margin: 0 auto; padding: 12px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); font-size: 13px; }
th { background: #f5f5f5; padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
td { padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; }
tr:hover { background: #f8f9ff; }
tr.level-unknown { background: #fff3e0; }
tr.level-unknown:hover { background: #ffe0b2; }
.tag { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; margin: 1px; }
.tag-town { background: #e3f2fd; color: #1565c0; }
.tag-village { background: #e8f5e9; color: #2e7d32; }
.tag-county { background: #fce4ec; color: #c62828; }
.tag-unknown { background: #fff3e0; color: #e65100; }
.btn { padding: 4px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; }
.btn-edit { background: #1976d2; color: #fff; }
.btn-edit:hover { background: #1565c0; }
.btn-save { background: #2e7d32; color: #fff; }
.btn-save:hover { background: #1b5e20; }
.btn-cancel { background: #757575; color: #fff; }
.btn-map { background: #f57c00; color: #fff; }
.btn-map:hover { background: #e65100; }

/* Modal */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 2000; justify-content: center; align-items: flex-start; padding-top: 40px; }
.modal-overlay.active { display: flex; }
.modal { background: #fff; border-radius: 8px; width: 900px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,.3); }
.modal-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { font-size: 16px; }
.modal-body { padding: 20px; }
.modal-body .form-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
.modal-body .form-row label { min-width: 80px; font-size: 13px; font-weight: 600; padding-top: 6px; }
.modal-body .form-row input, .modal-body .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.modal-body .form-row input[type=text] { width: 100%; }

/* Area picker */
.area-picker { border: 1px solid #ddd; border-radius: 4px; padding: 8px; background: #fafafa; }
.area-picker .county-select { margin-bottom: 8px; }
.area-picker .town-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 200px; overflow-y: auto; }
.area-picker .town-chip { padding: 3px 8px; border-radius: 3px; font-size: 12px; cursor: pointer; border: 1px solid #ccc; background: #fff; transition: all .15s; }
.area-picker .town-chip:hover { border-color: #1976d2; }
.area-picker .town-chip.selected { background: #1976d2; color: #fff; border-color: #1976d2; }
.area-search { margin-bottom: 8px; width: 100%; padding: 5px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }

/* Map in modal */
#modal-map { height: 300px; border-radius: 4px; margin-top: 8px; }
.coord-hint { font-size: 11px; color: #888; margin-top: 4px; }

/* Selected areas summary */
.selected-areas { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
.selected-area { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #e3f2fd; border-radius: 3px; font-size: 12px; }
.selected-area .remove { cursor: pointer; color: #c62828; font-weight: bold; }

/* Pagination */
.pagination { display: flex; justify-content: center; gap: 4px; padding: 16px; }
.pagination button { padding: 6px 12px; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; font-size: 13px; }
.pagination button.active { background: #1976d2; color: #fff; border-color: #1976d2; }
.pagination button:hover:not(.active) { background: #f5f5f5; }
.plant-count { font-size: 13px; color: #666; padding: 8px 0; }
</style>
</head>
<body>

<div class="top-bar">
  <h1>淨水場資料編輯</h1>
  <span class="stats"><?= count($plants) ?> 筆資料 · <?= count(array_filter($plants, fn($p) => $p['level'] === 'unknown')) ?> 筆待確認</span>
</div>

<?php if (!$fileWritable): ?>
<div class="warn-banner">plants.json 無法寫入，編輯功能已停用。請確認檔案權限: <?= htmlspecialchars($plantsFile) ?></div>
<?php endif; ?>

<div class="filters">
  <input type="text" id="searchBox" placeholder="搜尋淨水場名稱或水源...">
  <select id="levelFilter">
    <option value="">全部等級</option>
    <option value="unknown">unknown (待確認)</option>
    <option value="county">county</option>
    <option value="town">town</option>
    <option value="village">village</option>
  </select>
  <select id="countyFilter">
    <option value="">全部縣市</option>
    <?php foreach ($counties as $code => $name): ?>
    <option value="<?= $name ?>"><?= $name ?></option>
    <?php endforeach; ?>
  </select>
  <label><input type="checkbox" id="noCoordFilter"> 無座標</label>
  <span class="plant-count" id="plantCount"></span>
</div>

<div class="container">
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th style="width:140px">淨水場</th>
        <th style="width:140px">水源</th>
        <th style="width:70px">等級</th>
        <th style="width:80px">縣市</th>
        <th>供水區域</th>
        <th style="width:90px">座標</th>
        <th style="width:60px">操作</th>
      </tr>
    </thead>
    <tbody id="plantTable"></tbody>
  </table>
  <div class="pagination" id="pagination"></div>
</div>

<!-- Edit Modal -->
<div class="modal-overlay" id="editModal">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modalTitle">編輯淨水場</h2>
      <button class="btn btn-cancel" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="editIndex">
      <div class="form-row">
        <label>名稱</label>
        <input type="text" id="editName">
      </div>
      <div class="form-row">
        <label>水源</label>
        <input type="text" id="editSource">
      </div>
      <div class="form-row">
        <label>等級</label>
        <select id="editLevel">
          <option value="unknown">unknown</option>
          <option value="county">county</option>
          <option value="town">town</option>
          <option value="village">village</option>
        </select>
      </div>
      <div class="form-row">
        <label>座標</label>
        <div style="flex:1">
          <div style="display:flex;gap:8px">
            <input type="text" id="editLat" placeholder="緯度 (lat)" style="flex:1">
            <input type="text" id="editLng" placeholder="經度 (lng)" style="flex:1">
            <button class="btn btn-map" onclick="locateOnMap()">地圖定位</button>
          </div>
          <div class="coord-hint">點擊地圖可設定座標</div>
          <div id="modal-map"></div>
        </div>
      </div>
      <div class="form-row">
        <label>供水區域</label>
        <div style="flex:1">
          <div class="area-picker">
            <input type="text" class="area-search" id="areaSearch" placeholder="搜尋鄉鎮市區名稱...">
            <div class="county-select">
              <select id="editCounty" onchange="renderTownGrid()">
                <option value="">選擇縣市</option>
                <?php foreach ($counties as $code => $name): ?>
                <option value="<?= $name ?>"><?= $name ?></option>
                <?php endforeach; ?>
              </select>
              <button class="btn" onclick="selectAllTowns()" style="margin-left:4px;background:#e3f2fd;font-size:11px">全選</button>
              <button class="btn" onclick="deselectAllTowns()" style="margin-left:2px;background:#fce4ec;font-size:11px">全消</button>
            </div>
            <div class="town-grid" id="townGrid"></div>
          </div>
          <div class="selected-areas" id="selectedAreas"></div>
        </div>
      </div>
      <div style="text-align:right;margin-top:16px">
        <button class="btn btn-cancel" onclick="closeModal()" style="margin-right:8px">取消</button>
        <button class="btn btn-save" onclick="savePlant()">儲存</button>
      </div>
    </div>
  </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var plants = <?= json_encode($plants, JSON_UNESCAPED_UNICODE) ?>;
var fileWritable = <?= $fileWritable ? 'true' : 'false' ?>;
var areaLookup = <?= json_encode($areaLookup, JSON_UNESCAPED_UNICODE) ?>;
var townsByCounty = <?= json_encode($townsByCounty, JSON_UNESCAPED_UNICODE) ?>;
var counties = <?= json_encode($counties, JSON_UNESCAPED_UNICODE) ?>;

// Reverse: countyName => countyCode
var countyNameToCode = {};
for (var code in counties) { countyNameToCode[counties[code]] = code; }

var PAGE_SIZE = 50;
var currentPage = 1;
var filtered = [];
var modalMap = null;
var modalMarker = null;
var selectedTowns = {}; // townCode => true

function getFiltered() {
  var q = document.getElementById('searchBox').value.trim().toLowerCase();
  var lv = document.getElementById('levelFilter').value;
  var cn = document.getElementById('countyFilter').value;
  var noCoord = document.getElementById('noCoordFilter').checked;
  return plants.map(function(p, i) { return {plant: p, index: i}; }).filter(function(item) {
    var p = item.plant;
    if (q && p.name.toLowerCase().indexOf(q) === -1 && (p.source || '').toLowerCase().indexOf(q) === -1) return false;
    if (lv && p.level !== lv) return false;
    if (cn && p.areas.county !== cn) return false;
    if (noCoord && p.lat) return false;
    return true;
  });
}

function areaName(code) {
  return areaLookup[code] || code;
}

function renderTable() {
  filtered = getFiltered();
  document.getElementById('plantCount').textContent = '顯示 ' + filtered.length + ' / ' + plants.length + ' 筆';
  var total = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > total) currentPage = total || 1;
  var start = (currentPage - 1) * PAGE_SIZE;
  var page = filtered.slice(start, start + PAGE_SIZE);

  var html = '';
  page.forEach(function(item) {
    var p = item.plant;
    var i = item.index;
    var levelClass = 'tag-' + p.level;
    var rowClass = p.level === 'unknown' ? ' class="level-unknown"' : '';
    var towns = (p.areas.towns || []).map(function(c) { return '<span class="tag tag-town">' + areaName(c) + '</span>'; }).join('');
    var villages = (p.areas.villages || []).slice(0, 5).map(function(c) { return '<span class="tag tag-village">' + c + '</span>'; }).join('');
    if (p.areas.villages && p.areas.villages.length > 5) villages += '<span class="tag">...+' + (p.areas.villages.length - 5) + '</span>';
    var coord = p.lat ? p.lat.toFixed(4) + ', ' + p.lng.toFixed(4) : '<span style="color:#c62828">無</span>';
    html += '<tr' + rowClass + '>'
      + '<td>' + i + '</td>'
      + '<td><strong>' + p.name + '</strong></td>'
      + '<td>' + (p.source || '') + '</td>'
      + '<td><span class="tag ' + levelClass + '">' + p.level + '</span></td>'
      + '<td>' + (p.areas.county || '') + '</td>'
      + '<td>' + (towns || '<span style="color:#aaa">—</span>') + ' ' + villages + '</td>'
      + '<td style="font-size:11px">' + coord + '</td>'
      + '<td>' + (fileWritable ? '<button class="btn btn-edit" onclick="openEdit(' + i + ')">編輯</button>' : '') + '</td>'
      + '</tr>';
  });
  document.getElementById('plantTable').innerHTML = html;

  // Pagination
  var pagHtml = '';
  if (total > 1) {
    if (currentPage > 1) pagHtml += '<button onclick="goPage(1)">«</button><button onclick="goPage(' + (currentPage - 1) + ')">‹</button>';
    var from = Math.max(1, currentPage - 3), to = Math.min(total, currentPage + 3);
    for (var pg = from; pg <= to; pg++) {
      pagHtml += '<button' + (pg === currentPage ? ' class="active"' : '') + ' onclick="goPage(' + pg + ')">' + pg + '</button>';
    }
    if (currentPage < total) pagHtml += '<button onclick="goPage(' + (currentPage + 1) + ')">›</button><button onclick="goPage(' + total + ')">»</button>';
  }
  document.getElementById('pagination').innerHTML = pagHtml;
}

function goPage(p) { currentPage = p; renderTable(); window.scrollTo(0, 0); }

// Filters
document.getElementById('searchBox').addEventListener('input', function() { currentPage = 1; renderTable(); });
document.getElementById('levelFilter').addEventListener('change', function() { currentPage = 1; renderTable(); });
document.getElementById('countyFilter').addEventListener('change', function() { currentPage = 1; renderTable(); });
document.getElementById('noCoordFilter').addEventListener('change', function() { currentPage = 1; renderTable(); });

// Modal
function openEdit(idx) {
  var p = plants[idx];
  document.getElementById('editIndex').value = idx;
  document.getElementById('editName').value = p.name;
  document.getElementById('editSource').value = p.source || '';
  document.getElementById('editLevel').value = p.level;
  document.getElementById('editLat').value = p.lat || '';
  document.getElementById('editLng').value = p.lng || '';
  document.getElementById('editCounty').value = p.areas.county || '';
  document.getElementById('modalTitle').textContent = '編輯: ' + p.name;

  selectedTowns = {};
  (p.areas.towns || []).forEach(function(c) { selectedTowns[c] = true; });

  renderTownGrid();
  renderSelectedAreas();

  document.getElementById('editModal').classList.add('active');

  setTimeout(function() {
    if (!modalMap) {
      modalMap = L.map('modal-map').setView([23.7, 120.9], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
      }).addTo(modalMap);
      modalMap.on('click', function(e) {
        document.getElementById('editLat').value = e.latlng.lat.toFixed(6);
        document.getElementById('editLng').value = e.latlng.lng.toFixed(6);
        updateMapMarker(e.latlng.lat, e.latlng.lng);
      });
    } else {
      modalMap.invalidateSize();
    }
    if (p.lat && p.lng) {
      modalMap.setView([p.lat, p.lng], 14);
      updateMapMarker(p.lat, p.lng);
    } else {
      modalMap.setView([23.7, 120.9], 7);
      if (modalMarker) { modalMap.removeLayer(modalMarker); modalMarker = null; }
    }
  }, 200);
}

function updateMapMarker(lat, lng) {
  if (modalMarker) modalMap.removeLayer(modalMarker);
  modalMarker = L.marker([lat, lng]).addTo(modalMap);
}

function locateOnMap() {
  var lat = parseFloat(document.getElementById('editLat').value);
  var lng = parseFloat(document.getElementById('editLng').value);
  if (!isNaN(lat) && !isNaN(lng) && modalMap) {
    modalMap.setView([lat, lng], 15);
    updateMapMarker(lat, lng);
  }
}

function renderTownGrid() {
  var county = document.getElementById('editCounty').value;
  var search = document.getElementById('areaSearch').value.trim().toLowerCase();
  var grid = document.getElementById('townGrid');

  if (!county && !search) {
    grid.innerHTML = '<span style="color:#999;font-size:12px">請先選擇縣市或搜尋</span>';
    return;
  }

  var html = '';
  var codeToShow = [];

  if (search) {
    // Search across all counties
    for (var cc in townsByCounty) {
      townsByCounty[cc].forEach(function(t) {
        if (t.name.indexOf(search) !== -1 || areaLookup[t.code].indexOf(search) !== -1) {
          codeToShow.push(t);
        }
      });
    }
  } else {
    var cc = countyNameToCode[county];
    if (cc && townsByCounty[cc]) {
      codeToShow = townsByCounty[cc];
    }
  }

  codeToShow.forEach(function(t) {
    var sel = selectedTowns[t.code] ? ' selected' : '';
    var label = search ? areaLookup[t.code] : t.name;
    html += '<div class="town-chip' + sel + '" data-code="' + t.code + '" onclick="toggleTown(this, \'' + t.code + '\')">' + label + '</div>';
  });

  grid.innerHTML = html || '<span style="color:#999;font-size:12px">無結果</span>';
}

document.getElementById('areaSearch').addEventListener('input', renderTownGrid);

function toggleTown(el, code) {
  if (selectedTowns[code]) {
    delete selectedTowns[code];
    el.classList.remove('selected');
  } else {
    selectedTowns[code] = true;
    el.classList.add('selected');
  }
  renderSelectedAreas();
}

function selectAllTowns() {
  document.querySelectorAll('#townGrid .town-chip').forEach(function(el) {
    var code = el.getAttribute('data-code');
    selectedTowns[code] = true;
    el.classList.add('selected');
  });
  renderSelectedAreas();
}

function deselectAllTowns() {
  document.querySelectorAll('#townGrid .town-chip').forEach(function(el) {
    var code = el.getAttribute('data-code');
    delete selectedTowns[code];
    el.classList.remove('selected');
  });
  renderSelectedAreas();
}

function renderSelectedAreas() {
  var html = '';
  var codes = Object.keys(selectedTowns).sort();
  codes.forEach(function(c) {
    html += '<span class="selected-area">' + areaLookup[c] + ' <span class="remove" onclick="removeTown(\'' + c + '\')">✕</span></span>';
  });
  document.getElementById('selectedAreas').innerHTML = html || '<span style="color:#999;font-size:12px">尚未選擇</span>';
}

function removeTown(code) {
  delete selectedTowns[code];
  renderTownGrid();
  renderSelectedAreas();
}

function closeModal() {
  document.getElementById('editModal').classList.remove('active');
}

function savePlant() {
  var idx = document.getElementById('editIndex').value;
  var townCodes = Object.keys(selectedTowns);
  var data = new FormData();
  data.append('action', 'save_plant');
  data.append('index', idx);
  data.append('name', document.getElementById('editName').value);
  data.append('source', document.getElementById('editSource').value);
  data.append('level', document.getElementById('editLevel').value);
  data.append('county', document.getElementById('editCounty').value);
  data.append('towns', townCodes.join(','));
  data.append('villages', (plants[idx].areas.villages || []).join(','));
  data.append('lat', document.getElementById('editLat').value);
  data.append('lng', document.getElementById('editLng').value);

  fetch('admin.php', { method: 'POST', body: data })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.ok) {
        // Update local data
        var p = plants[idx];
        p.name = document.getElementById('editName').value;
        p.source = document.getElementById('editSource').value;
        p.level = document.getElementById('editLevel').value;
        p.areas.county = document.getElementById('editCounty').value || null;
        p.areas.towns = townCodes.map(Number);
        var lat = document.getElementById('editLat').value;
        var lng = document.getElementById('editLng').value;
        if (lat && lng) { p.lat = parseFloat(lat); p.lng = parseFloat(lng); }
        else { delete p.lat; delete p.lng; }
        closeModal();
        renderTable();
      } else {
        alert('儲存失敗: ' + (res.error || ''));
      }
    })
    .catch(function(e) { alert('儲存錯誤: ' + e); });
}

// Keyboard shortcut: Escape to close modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

renderTable();
</script>
</body>
</html>
