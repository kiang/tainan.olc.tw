<?php
// Localhost-only access check
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
if ($ip !== '127.0.0.1' && $ip !== '::1') {
    http_response_code(403);
    echo '403 Forbidden';
    exit;
}

$dataFile = __DIR__ . '/data/candidates.json';

function loadData() {
    global $dataFile;
    return json_decode(file_get_contents($dataFile), true);
}

function saveData($data) {
    global $dataFile;
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
}

// API handling
if (isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['action'];
    $data = loadData();

    if ($action === 'load') {
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
        if (!isset($data['districts'][$electionType])) {
            $data['districts'][$electionType] = [];
        }
        if (!isset($data['districts'][$electionType][$areaCode])) {
            $data['districts'][$electionType][$areaCode] = [];
        }
        if ($districtIndex >= 0 && $districtIndex < count($data['districts'][$electionType][$areaCode])) {
            $data['districts'][$electionType][$areaCode][$districtIndex] = $district;
        } else {
            $data['districts'][$electionType][$areaCode][] = $district;
        }
        saveData($data);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_district') {
        $electionType = $post['electionType'] ?? '';
        $areaCode = $post['areaCode'] ?? '';
        $districtIndex = (int)($post['districtIndex'] ?? -1);
        if (isset($data['districts'][$electionType][$areaCode][$districtIndex])) {
            array_splice($data['districts'][$electionType][$areaCode], $districtIndex, 1);
            if (empty($data['districts'][$electionType][$areaCode])) {
                unset($data['districts'][$electionType][$areaCode]);
            }
            if (empty($data['districts'][$electionType])) {
                unset($data['districts'][$electionType]);
            }
            saveData($data);
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
    <style>
        .table td, .table th { vertical-align: middle; font-size: 0.9rem; }
        .btn-sm { font-size: 0.8rem; }
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
            </div>
        </div>
        <div class="table-responsive">
            <table class="table table-striped table-bordered table-sm">
                <thead><tr>
                    <th>#</th><th>選舉類型</th><th>縣市</th><th>選區</th><th>號次</th><th>姓名</th><th>政黨</th><th>性別</th><th>年齡</th><th>操作</th>
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
<div class="modal-dialog">
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
                <input id="d_townCodes" class="form-control form-control-sm">
            </div>
            <div class="col-md-12">
                <label class="form-label">villCodes (逗號分隔)</label>
                <input id="d_villCodes" class="form-control form-control-sm">
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

load();
</script>
</body>
</html>
