<?php
// Localhost-only access check
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
if ($ip !== '127.0.0.1' && $ip !== '::1') {
    http_response_code(403);
    echo '403 Forbidden';
    exit;
}

$dataFile = __DIR__ . '/data/candidates.json';
$zonesFile = __DIR__ . '/data/zones.json';

function loadData() {
    global $dataFile;
    return json_decode(file_get_contents($dataFile), true);
}

function saveData($data) {
    global $dataFile;
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
}

function loadZones() {
    global $zonesFile;
    $zones = json_decode(file_get_contents($zonesFile), true);
    return $zones ?: [];
}

function saveZones($zones) {
    global $zonesFile;
    file_put_contents($zonesFile, json_encode($zones, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
}

// API handling
if (isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['action'];
    $data = loadData();

    if ($action === 'load') {
        $data['districts'] = loadZones();
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['error' => 'POST required']);
        exit;
    }

    $post = json_decode(file_get_contents('php://input'), true);

    if ($action === 'save_candidate') {
        $index = (int)($post['index'] ?? -1);
        $candidate = $post['candidate'] ?? [];
        if (isset($candidate['number'])) $candidate['number'] = (int)$candidate['number'];
        if (isset($candidate['age'])) $candidate['age'] = (int)$candidate['age'];
        // Remove empty optional fields
        foreach (['district', 'townCode', 'townName', 'villCode', 'villName'] as $f) {
            if (isset($candidate[$f]) && $candidate[$f] === '') unset($candidate[$f]);
        }
        if ($index >= 0 && $index < count($data['candidates'])) {
            $data['candidates'][$index] = $candidate;
        } else {
            $data['candidates'][] = $candidate;
        }
        saveData($data);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_candidate') {
        $index = (int)($post['index'] ?? -1);
        if ($index >= 0 && $index < count($data['candidates'])) {
            array_splice($data['candidates'], $index, 1);
            saveData($data);
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['error' => 'Invalid index']);
        }
        exit;
    }

    if ($action === 'delete_candidates') {
        $indices = $post['indices'] ?? [];
        if (!is_array($indices) || empty($indices)) {
            echo json_encode(['error' => 'No indices provided']);
            exit;
        }
        // Sort descending so splicing doesn't shift subsequent indices
        $indices = array_map('intval', $indices);
        rsort($indices);
        $deleted = 0;
        foreach ($indices as $index) {
            if ($index >= 0 && $index < count($data['candidates'])) {
                array_splice($data['candidates'], $index, 1);
                $deleted++;
            }
        }
        saveData($data);
        echo json_encode(['ok' => true, 'deleted' => $deleted]);
        exit;
    }

    if ($action === 'save_district') {
        $electionType = $post['electionType'] ?? '';
        $areaCode = $post['areaCode'] ?? '';
        $districtIndex = (int)($post['districtIndex'] ?? -1);
        $district = $post['district'] ?? [];
        // Parse comma-separated codes
        if (isset($district['townCodes'])) {
            $district['townCodes'] = array_values(array_filter(array_map('trim', explode(',', $district['townCodes']))));
            if (empty($district['townCodes'])) unset($district['townCodes']);
        }
        if (isset($district['villCodes'])) {
            $district['villCodes'] = array_values(array_filter(array_map('trim', explode(',', $district['villCodes']))));
            if (empty($district['villCodes'])) unset($district['villCodes']);
        }
        $zones = loadZones();
        if (!isset($zones[$electionType])) {
            $zones[$electionType] = [];
        }
        if (!isset($zones[$electionType][$areaCode])) {
            $zones[$electionType][$areaCode] = [];
        }
        if ($districtIndex >= 0 && $districtIndex < count($zones[$electionType][$areaCode])) {
            $zones[$electionType][$areaCode][$districtIndex] = $district;
        } else {
            $zones[$electionType][$areaCode][] = $district;
        }
        saveZones($zones);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_district') {
        $electionType = $post['electionType'] ?? '';
        $areaCode = $post['areaCode'] ?? '';
        $districtIndex = (int)($post['districtIndex'] ?? -1);
        $zones = loadZones();
        if (isset($zones[$electionType][$areaCode][$districtIndex])) {
            array_splice($zones[$electionType][$areaCode], $districtIndex, 1);
            if (empty($zones[$electionType][$areaCode])) {
                unset($zones[$electionType][$areaCode]);
            }
            if (empty($zones[$electionType])) {
                unset($zones[$electionType]);
            }
            saveZones($zones);
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['error' => 'Invalid district']);
        }
        exit;
    }

    echo json_encode(['error' => 'Unknown action']);
    exit;
}
?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2026 選舉候選人管理</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
        .table td, .table th { vertical-align: middle; font-size: 0.9rem; }
        .btn-sm { font-size: 0.8rem; }
        #districtMapContainer { height: 400px; width: 100%; }
        .map-breadcrumb { background: #f8f9fa; padding: 6px 12px; border-radius: 4px; margin-bottom: 8px; font-size: 0.9rem; }
        .map-breadcrumb a { cursor: pointer; color: #0d6efd; text-decoration: none; }
        .map-breadcrumb a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<div class="container-fluid py-3">
    <h4>2026 選舉候選人管理</h4>
    <ul class="nav nav-tabs mb-3" id="mainTabs">
        <li class="nav-item"><a class="nav-link active" href="#" data-tab="candidates">候選人 Candidates</a></li>
        <li class="nav-item"><a class="nav-link" href="#" data-tab="districts">選區 Districts</a></li>
    </ul>

    <!-- Candidates Tab -->
    <div id="tab-candidates">
        <div class="row mb-2">
            <div class="col-auto">
                <select id="filterElection" class="form-select form-select-sm"><option value="">所有選舉類型</option></select>
            </div>
            <div class="col-auto">
                <select id="filterCounty" class="form-select form-select-sm"><option value="">所有縣市</option></select>
            </div>
            <div class="col-auto">
                <button class="btn btn-primary btn-sm" onclick="editCandidate(-1)">+ 新增候選人</button>
                <button class="btn btn-danger btn-sm d-none" id="batchDeleteBtn" onclick="batchDelete()">刪除所選 (<span id="batchCount">0</span>)</button>
            </div>
        </div>
        <div class="table-responsive">
            <table class="table table-striped table-bordered table-sm">
                <thead><tr>
                    <th><input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)"></th><th>#</th><th>選舉類型</th><th>縣市</th><th>選區</th><th>號次</th><th>姓名</th><th>政黨</th><th>性別</th><th>年齡</th><th>操作</th>
                </tr></thead>
                <tbody id="candidateTable"></tbody>
            </table>
        </div>
    </div>

    <!-- Districts Tab -->
    <div id="tab-districts" style="display:none">
        <div class="mb-2">
            <button class="btn btn-primary btn-sm" onclick="editDistrict(null,null,-1)">+ 新增選區</button>
        </div>
        <div id="districtList"></div>
    </div>
</div>

<!-- Candidate Modal -->
<div class="modal fade" id="candidateModal" tabindex="-1">
<div class="modal-dialog modal-lg">
<div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">候選人</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
        <input type="hidden" id="c_index">
        <div class="row g-2">
            <div class="col-md-4">
                <label class="form-label">選舉類型</label>
                <select id="c_election" class="form-select form-select-sm"></select>
            </div>
            <div class="col-md-4">
                <label class="form-label">countyCode</label>
                <input id="c_countyCode" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">countyName</label>
                <input id="c_countyName" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">district</label>
                <input id="c_district" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">townCode</label>
                <input id="c_townCode" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">townName</label>
                <input id="c_townName" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">villCode</label>
                <input id="c_villCode" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">villName</label>
                <input id="c_villName" class="form-control form-control-sm">
            </div>
            <div class="col-md-2">
                <label class="form-label">號次</label>
                <input id="c_number" type="number" class="form-control form-control-sm">
            </div>
            <div class="col-md-2">
                <label class="form-label">性別</label>
                <select id="c_gender" class="form-select form-select-sm">
                    <option value="男">男</option><option value="女">女</option>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">姓名</label>
                <input id="c_name" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">nameEn</label>
                <input id="c_nameEn" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">政黨</label>
                <input id="c_party" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
                <label class="form-label">partyEn</label>
                <input id="c_partyEn" class="form-control form-control-sm">
            </div>
            <div class="col-md-2">
                <label class="form-label">年齡</label>
                <input id="c_age" type="number" class="form-control form-control-sm">
            </div>
            <div class="col-md-6">
                <label class="form-label">學歷</label>
                <input id="c_education" class="form-control form-control-sm">
            </div>
            <div class="col-md-6">
                <label class="form-label">經歷</label>
                <input id="c_experience" class="form-control form-control-sm">
            </div>
            <div class="col-md-6">
                <label class="form-label">政見</label>
                <textarea id="c_platform" class="form-control form-control-sm" rows="2"></textarea>
            </div>
            <div class="col-md-6">
                <label class="form-label">platformEn</label>
                <textarea id="c_platformEn" class="form-control form-control-sm" rows="2"></textarea>
            </div>
            <div class="col-md-12">
                <label class="form-label">photo URL</label>
                <input id="c_photo" class="form-control form-control-sm">
            </div>
        </div>
    </div>
    <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">取消</button>
        <button class="btn btn-primary btn-sm" onclick="saveCandidate()">儲存</button>
    </div>
</div>
</div>
</div>

<!-- District Modal -->
<div class="modal fade" id="districtModal" tabindex="-1">
<div class="modal-dialog modal-xl">
<div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">選區</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
        <input type="hidden" id="d_origElection">
        <input type="hidden" id="d_origArea">
        <input type="hidden" id="d_origIndex">
        <div class="row g-2">
            <div class="col-md-6">
                <label class="form-label">選舉類型</label>
                <select id="d_electionType" class="form-select form-select-sm"></select>
            </div>
            <div class="col-md-6">
                <label class="form-label">區域代碼 (countyCode/townCode)</label>
                <input id="d_areaCode" class="form-control form-control-sm">
            </div>
            <div class="col-md-6">
                <label class="form-label">選區名稱</label>
                <input id="d_name" class="form-control form-control-sm">
            </div>
            <div class="col-md-6">
                <label class="form-label">nameEn</label>
                <input id="d_nameEn" class="form-control form-control-sm">
            </div>
            <div class="col-md-12">
                <label class="form-label">townCodes (逗號分隔)</label>
                <input id="d_townCodes" class="form-control form-control-sm" readonly>
            </div>
            <div class="col-md-12">
                <label class="form-label">villCodes (逗號分隔)</label>
                <input id="d_villCodes" class="form-control form-control-sm" readonly>
            </div>
            <div class="col-md-12 mt-2">
                <label class="form-label fw-bold">地圖選取</label>
                <div class="mb-2">
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" name="mapSelMode" id="selModeTown" value="town" checked>
                        <label class="btn btn-outline-primary" for="selModeTown">選取鄉鎮市區 Towns</label>
                        <input type="radio" class="btn-check" name="mapSelMode" id="selModeVill" value="vill">
                        <label class="btn btn-outline-primary" for="selModeVill">選取村里 Villages</label>
                    </div>
                </div>
                <div class="map-breadcrumb" id="mapBreadcrumb">
                    <span>全部縣市</span>
                </div>
                <div id="districtMapContainer"></div>
            </div>
        </div>
    </div>
    <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">取消</button>
        <button class="btn btn-primary btn-sm" onclick="saveDistrict()">儲存</button>
    </div>
</div>
</div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js"></script>
<script>
let appData = null;
const candidateFields = ['election','countyCode','countyName','district','townCode','townName','villCode','villName','number','name','nameEn','party','partyEn','gender','age','education','experience','platform','platformEn','photo'];

async function api(action, body) {
    const opts = body ? { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) } : {};
    const r = await fetch('?action=' + action, opts);
    return r.json();
}

async function load() {
    appData = await api('load');
    renderCandidates();
    renderDistricts();
    populateFilters();
    populateElectionDropdowns();
}

function populateFilters() {
    const elections = Object.keys(appData.elections);
    const counties = [...new Set(appData.candidates.map(c => c.countyName))];
    const fe = document.getElementById('filterElection');
    const fc = document.getElementById('filterCounty');
    fe.innerHTML = '<option value="">所有選舉類型</option>' + elections.map(e => `<option>${e}</option>`).join('');
    fc.innerHTML = '<option value="">所有縣市</option>' + counties.map(c => `<option>${c}</option>`).join('');
}

function populateElectionDropdowns() {
    const opts = Object.keys(appData.elections).map(e => `<option value="${e}">${e}</option>`).join('');
    document.getElementById('c_election').innerHTML = opts;
    document.getElementById('d_electionType').innerHTML = opts;
}

function renderCandidates() {
    const fe = document.getElementById('filterElection').value;
    const fc = document.getElementById('filterCounty').value;
    let filtered = appData.candidates.map((c, i) => ({...c, _i: i}));
    if (fe) filtered = filtered.filter(c => c.election === fe);
    if (fc) filtered = filtered.filter(c => c.countyName === fc);
    document.getElementById('candidateTable').innerHTML = filtered.map(c => `<tr>
        <td><input type="checkbox" class="row-check" data-index="${c._i}" onchange="updateBatchBtn()"></td>
        <td>${c._i}</td>
        <td>${c.election}</td>
        <td>${c.countyName}</td>
        <td>${c.district || ''}</td>
        <td>${c.number}</td>
        <td>${c.name}</td>
        <td>${c.party}</td>
        <td>${c.gender}</td>
        <td>${c.age}</td>
        <td>
            <button class="btn btn-outline-primary btn-sm" onclick="editCandidate(${c._i})">編輯</button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteCandidate(${c._i})">刪除</button>
        </td>
    </tr>`).join('');
    document.getElementById('selectAll').checked = false;
    updateBatchBtn();
}

function editCandidate(index) {
    document.getElementById('c_index').value = index;
    const c = index >= 0 ? appData.candidates[index] : {};
    candidateFields.forEach(f => {
        const el = document.getElementById('c_' + f);
        if (el) el.value = c[f] ?? '';
    });
    new bootstrap.Modal(document.getElementById('candidateModal')).show();
}

async function saveCandidate() {
    const index = parseInt(document.getElementById('c_index').value);
    const candidate = {};
    candidateFields.forEach(f => {
        const el = document.getElementById('c_' + f);
        if (el) candidate[f] = el.value;
    });
    await api('save_candidate', { index, candidate });
    bootstrap.Modal.getInstance(document.getElementById('candidateModal')).hide();
    await load();
}

async function deleteCandidate(index) {
    const c = appData.candidates[index];
    if (!confirm(`確定刪除 ${c.name} (${c.election})?`)) return;
    await api('delete_candidate', { index });
    await load();
}

function renderDistricts() {
    let html = '';
    for (const [elType, areas] of Object.entries(appData.districts)) {
        html += `<h5 class="mt-3">${elType}</h5>`;
        for (const [areaCode, districts] of Object.entries(areas)) {
            html += `<div class="card mb-2"><div class="card-header py-1"><strong>${areaCode}</strong></div><div class="card-body p-2">`;
            html += `<table class="table table-sm table-bordered mb-1"><thead><tr><th>名稱</th><th>nameEn</th><th>townCodes</th><th>villCodes</th><th>操作</th></tr></thead><tbody>`;
            districts.forEach((d, i) => {
                html += `<tr>
                    <td>${d.name}</td>
                    <td>${d.nameEn || ''}</td>
                    <td>${(d.townCodes || []).join(', ')}</td>
                    <td>${(d.villCodes || []).join(', ')}</td>
                    <td>
                        <button class="btn btn-outline-primary btn-sm" onclick="editDistrict('${elType}','${areaCode}',${i})">編輯</button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteDistrict('${elType}','${areaCode}',${i})">刪除</button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table>`;
            html += `<button class="btn btn-outline-secondary btn-sm" onclick="editDistrict('${elType}','${areaCode}',-1)">+ 新增選區至 ${areaCode}</button>`;
            html += `</div></div>`;
        }
    }
    document.getElementById('districtList').innerHTML = html;
}

function editDistrict(elType, areaCode, index) {
    document.getElementById('d_origElection').value = elType || '';
    document.getElementById('d_origArea').value = areaCode || '';
    document.getElementById('d_origIndex').value = index;
    const d = (elType && areaCode && index >= 0) ? appData.districts[elType][areaCode][index] : {};
    document.getElementById('d_electionType').value = elType || Object.keys(appData.elections)[0];
    document.getElementById('d_areaCode').value = areaCode || '';
    document.getElementById('d_name').value = d.name || '';
    document.getElementById('d_nameEn').value = d.nameEn || '';
    document.getElementById('d_townCodes').value = (d.townCodes || []).join(', ');
    document.getElementById('d_villCodes').value = (d.villCodes || []).join(', ');
    // Pre-populate selection sets from existing codes
    selectedTownCodes = new Set(d.townCodes || []);
    selectedVillCodes = new Set(d.villCodes || []);
    // Auto-select mode based on existing data
    if ((d.villCodes || []).length > 0) {
        document.getElementById('selModeVill').checked = true;
    } else {
        document.getElementById('selModeTown').checked = true;
    }
    new bootstrap.Modal(document.getElementById('districtModal')).show();
}

async function saveDistrict() {
    const origEl = document.getElementById('d_origElection').value;
    const origArea = document.getElementById('d_origArea').value;
    const origIndex = parseInt(document.getElementById('d_origIndex').value);
    const electionType = document.getElementById('d_electionType').value;
    const areaCode = document.getElementById('d_areaCode').value;
    const district = {
        name: document.getElementById('d_name').value,
        nameEn: document.getElementById('d_nameEn').value,
        townCodes: document.getElementById('d_townCodes').value,
        villCodes: document.getElementById('d_villCodes').value
    };
    // If election type or area code changed, delete old entry first
    if (origEl && origArea && origIndex >= 0 && (origEl !== electionType || origArea !== areaCode)) {
        await api('delete_district', { electionType: origEl, areaCode: origArea, districtIndex: origIndex });
        await api('save_district', { electionType, areaCode, districtIndex: -1, district });
    } else {
        await api('save_district', { electionType, areaCode, districtIndex: origIndex, district });
    }
    bootstrap.Modal.getInstance(document.getElementById('districtModal')).hide();
    await load();
}

async function deleteDistrict(elType, areaCode, index) {
    const d = appData.districts[elType][areaCode][index];
    if (!confirm(`確定刪除 ${d.name}?`)) return;
    await api('delete_district', { electionType: elType, areaCode, districtIndex: index });
    await load();
}

// Batch delete
function toggleSelectAll(el) {
    document.querySelectorAll('.row-check').forEach(cb => { cb.checked = el.checked; });
    updateBatchBtn();
}

function updateBatchBtn() {
    const checked = document.querySelectorAll('.row-check:checked');
    const btn = document.getElementById('batchDeleteBtn');
    document.getElementById('batchCount').textContent = checked.length;
    btn.classList.toggle('d-none', checked.length === 0);
}

async function batchDelete() {
    const indices = [...document.querySelectorAll('.row-check:checked')].map(cb => parseInt(cb.dataset.index));
    if (indices.length === 0) return;
    if (!confirm(`確定刪除所選的 ${indices.length} 筆候選人資料？`)) return;
    await api('delete_candidates', { indices });
    await load();
}

// Tab switching
document.querySelectorAll('#mainTabs a').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('#mainTabs a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        document.getElementById('tab-candidates').style.display = a.dataset.tab === 'candidates' ? '' : 'none';
        document.getElementById('tab-districts').style.display = a.dataset.tab === 'districts' ? '' : 'none';
    });
});

// Filter events
document.getElementById('filterElection').addEventListener('change', renderCandidates);
document.getElementById('filterCounty').addEventListener('change', renderCandidates);

// === District Map Picker ===
let districtMap = null;
let mapDataLayer = null;
let selectedTownCodes = new Set();
let selectedVillCodes = new Set();
let currentCountyName = null;
let currentCountyCode = null;
let countyTopoCache = null;
let cunliTopoCache = {};

const COUNTY_TOPO_URL = 'https://kiang.github.io/taiwan_basecode/county/topo/20200820.json';
const CUNLI_TOPO_BASE = 'https://kiang.github.io/taiwan_basecode/cunli/topo/city/20240807/';
const NLSC_TILE = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';

function getSelectionMode() {
    return document.querySelector('input[name="mapSelMode"]:checked').value;
}

function defaultStyle() {
    return { color: '#3388ff', weight: 1, fillOpacity: 0.15, fillColor: '#3388ff' };
}

function selectedStyle() {
    return { color: '#ff6600', weight: 2, fillOpacity: 0.45, fillColor: '#ff6600' };
}

function hoverStyle() {
    return { weight: 3, fillOpacity: 0.3 };
}

function initDistrictMap() {
    if (districtMap) {
        districtMap.remove();
        districtMap = null;
    }
    districtMap = L.map('districtMapContainer', { zoomSnap: 0.5 }).setView([23.7, 120.9], 7);
    L.tileLayer(NLSC_TILE, { maxZoom: 18, attribution: 'NLSC' }).addTo(districtMap);
    loadCountiesForPicker();
}

async function loadCountiesForPicker() {
    if (!countyTopoCache) {
        const resp = await fetch(COUNTY_TOPO_URL);
        countyTopoCache = await resp.json();
    }
    const objectKey = Object.keys(countyTopoCache.objects)[0];
    const geojson = topojson.feature(countyTopoCache, countyTopoCache.objects[objectKey]);

    if (mapDataLayer) districtMap.removeLayer(mapDataLayer);
    currentCountyName = null;
    currentCountyCode = null;

    mapDataLayer = L.geoJSON(geojson, {
        style: defaultStyle,
        onEachFeature: (feature, layer) => {
            const name = feature.properties.COUNTYNAME;
            const code = feature.properties.COUNTYCODE;
            layer.bindTooltip(name, { sticky: true });
            layer.on('click', () => drillIntoCounty(name, code));
            layer.on('mouseover', () => layer.setStyle(hoverStyle()));
            layer.on('mouseout', () => mapDataLayer.resetStyle(layer));
        }
    }).addTo(districtMap);

    districtMap.fitBounds(mapDataLayer.getBounds());
    updateBreadcrumb();
}

async function drillIntoCounty(countyName, countyCode) {
    currentCountyName = countyName;
    currentCountyCode = countyCode;

    if (!cunliTopoCache[countyName]) {
        const resp = await fetch(CUNLI_TOPO_BASE + countyName + '.json');
        cunliTopoCache[countyName] = await resp.json();
    }

    const topo = cunliTopoCache[countyName];
    const objectKey = Object.keys(topo.objects)[0];
    const geojson = topojson.feature(topo, topo.objects[objectKey]);

    renderSubLayer(geojson);
    updateBreadcrumb();
}

function renderSubLayer(geojson) {
    if (mapDataLayer) districtMap.removeLayer(mapDataLayer);

    const mode = getSelectionMode();

    if (mode === 'town') {
        const townGroups = groupByTown(geojson);
        mapDataLayer = L.layerGroup();
        for (const [townCode, data] of Object.entries(townGroups)) {
            const layer = L.geoJSON(data.features, {
                style: () => selectedTownCodes.has(townCode) ? selectedStyle() : defaultStyle(),
                onEachFeature: (feature, lyr) => {
                    lyr.on('mouseover', () => lyr.setStyle(hoverStyle()));
                    lyr.on('mouseout', () => {
                        lyr.setStyle(selectedTownCodes.has(townCode) ? selectedStyle() : defaultStyle());
                    });
                }
            });
            layer.bindTooltip(data.townName || townCode, { sticky: true });
            layer.on('click', () => toggleTownSelection(townCode, layer));
            layer.addTo(mapDataLayer);
        }
        mapDataLayer.addTo(districtMap);
        // Fit bounds from all sub-layers
        const allBounds = L.featureGroup([]);
        mapDataLayer.eachLayer(l => {
            if (l.getBounds) allBounds.addLayer(l);
        });
        if (allBounds.getLayers().length > 0) districtMap.fitBounds(allBounds.getBounds());
    } else {
        mapDataLayer = L.geoJSON(geojson, {
            style: (feature) => {
                const code = feature.properties.VILLCODE;
                return selectedVillCodes.has(code) ? selectedStyle() : defaultStyle();
            },
            onEachFeature: (feature, layer) => {
                const code = feature.properties.VILLCODE;
                const name = feature.properties.VILLNAME || code;
                const townName = feature.properties.TOWNNAME || '';
                layer.bindTooltip(townName + name, { sticky: true });
                layer.on('click', () => toggleVillSelection(code, layer));
                layer.on('mouseover', () => layer.setStyle(hoverStyle()));
                layer.on('mouseout', () => {
                    layer.setStyle(selectedVillCodes.has(code) ? selectedStyle() : defaultStyle());
                });
            }
        }).addTo(districtMap);
        districtMap.fitBounds(mapDataLayer.getBounds());
    }
}

function groupByTown(geojson) {
    const groups = {};
    for (const feature of geojson.features) {
        const tc = feature.properties.TOWNCODE;
        if (!groups[tc]) {
            groups[tc] = { features: [], townName: feature.properties.TOWNNAME };
        }
        groups[tc].features.push(feature);
    }
    return groups;
}

function toggleTownSelection(code, layer) {
    if (selectedTownCodes.has(code)) {
        selectedTownCodes.delete(code);
        layer.setStyle(defaultStyle());
    } else {
        selectedTownCodes.add(code);
        layer.setStyle(selectedStyle());
    }
    syncCodeInputs();
}

function toggleVillSelection(code, layer) {
    if (selectedVillCodes.has(code)) {
        selectedVillCodes.delete(code);
        layer.setStyle(defaultStyle());
    } else {
        selectedVillCodes.add(code);
        layer.setStyle(selectedStyle());
    }
    syncCodeInputs();
}

function syncCodeInputs() {
    document.getElementById('d_townCodes').value = [...selectedTownCodes].sort().join(', ');
    document.getElementById('d_villCodes').value = [...selectedVillCodes].sort().join(', ');
}

function updateBreadcrumb() {
    const bc = document.getElementById('mapBreadcrumb');
    if (!currentCountyName) {
        bc.innerHTML = '<span>全部縣市</span>';
    } else {
        bc.innerHTML = `<a onclick="loadCountiesForPicker()">全部縣市</a> &gt; <span>${currentCountyName}</span>`;
    }
}

// Re-render sub-layer when selection mode changes
document.querySelectorAll('input[name="mapSelMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (currentCountyName && cunliTopoCache[currentCountyName]) {
            const topo = cunliTopoCache[currentCountyName];
            const objectKey = Object.keys(topo.objects)[0];
            const geojson = topojson.feature(topo, topo.objects[objectKey]);
            renderSubLayer(geojson);
        }
    });
});

// Init map when district modal is shown
document.getElementById('districtModal').addEventListener('shown.bs.modal', () => {
    if (!districtMap) {
        initDistrictMap();
    } else {
        districtMap.invalidateSize();
    }
    // Pre-populate: auto-drill into county if areaCode is set
    const areaCode = document.getElementById('d_areaCode').value;
    if (areaCode && countyTopoCache) {
        const objectKey = Object.keys(countyTopoCache.objects)[0];
        const geojson = topojson.feature(countyTopoCache, countyTopoCache.objects[objectKey]);
        // areaCode could be a county code (e.g. "67000") or town code (e.g. "67000010")
        const countyPrefix = areaCode.substring(0, 5);
        const match = geojson.features.find(f => f.properties.COUNTYCODE === countyPrefix || f.properties.COUNTYCODE === areaCode);
        if (match) {
            drillIntoCounty(match.properties.COUNTYNAME, match.properties.COUNTYCODE);
        }
    }
});

// Clean up map when modal is hidden
document.getElementById('districtModal').addEventListener('hidden.bs.modal', () => {
    if (districtMap) {
        districtMap.remove();
        districtMap = null;
        mapDataLayer = null;
    }
});

load().then(() => {
    // Handle URL parameters for direct editing
    const params = new URLSearchParams(window.location.search);
    const editType = params.get('edit');
    if (editType === 'candidate') {
        const index = parseInt(params.get('index'));
        if (!isNaN(index) && index >= 0 && index < appData.candidates.length) {
            editCandidate(index);
        } else if (!isNaN(index) && index === -1) {
            // New candidate with pre-filled fields from URL
            editCandidate(-1);
            const prefillFields = ['election', 'countyCode', 'countyName', 'townCode', 'townName', 'villCode', 'villName'];
            prefillFields.forEach(f => {
                const val = params.get(f);
                if (val) {
                    const el = document.getElementById('c_' + f);
                    if (el) el.value = val;
                }
            });
        }
    } else if (editType === 'district') {
        const elType = params.get('electionType');
        const areaCode = params.get('areaCode');
        const dIdx = parseInt(params.get('districtIndex'));
        if (elType && areaCode && !isNaN(dIdx)) {
            // Switch to districts tab
            document.querySelectorAll('#mainTabs a').forEach(a => a.classList.remove('active'));
            document.querySelector('#mainTabs a[data-tab="districts"]').classList.add('active');
            document.getElementById('tab-candidates').style.display = 'none';
            document.getElementById('tab-districts').style.display = '';
            editDistrict(elType, areaCode, dIdx);
        }
    }
});
</script>
</body>
</html>
