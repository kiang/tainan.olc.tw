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

function loadAreaCodes() {
    $listCsv = '/home/kiang/public_html/db.cec.gov.tw/data/elections/2026/list.csv';
    $counties = [];
    $towns = [];
    $zoneDistricts = [];
    if (!file_exists($listCsv)) return ['counties' => $counties, 'towns' => $towns, 'zoneDistricts' => $zoneDistricts];

    $lines = file($listCsv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    array_shift($lines); // skip header
    foreach ($lines as $line) {
        $row = str_getcsv($line);
        if (count($row) < 4) continue;
        $code = $row[1];
        $name = $row[2];
        $parts = explode('-', $code);
        if (count($parts) < 3) continue;
        $prefix = $parts[0];
        $areaCode = $parts[1];
        $districtNum = $parts[2];

        if ($prefix === 'T1') {
            $countyCode = $areaCode;
            $countyName = mb_ereg_replace('第\d+選區$', '', $name);
            if (!isset($counties[$countyCode])) {
                $counties[$countyCode] = $countyName;
            }
            $zoneDistricts[$prefix][$countyCode][] = '第' . ltrim($districtNum, '0') . '選舉區';
        } elseif ($prefix === 'R1' || $prefix === 'R2' || $prefix === 'R3') {
            $townCode = $areaCode;
            $townFullName = mb_ereg_replace('第\d+選區$', '', $name);
            if (!isset($towns[$townCode])) {
                $towns[$townCode] = $townFullName;
            }
            $zoneDistricts[$prefix][$townCode][] = '第' . ltrim($districtNum, '0') . '選舉區';
        } elseif ($prefix === 'T2' || $prefix === 'T3') {
            $countyCode = $areaCode;
            $zoneDistricts[$prefix][$countyCode][] = '第' . ltrim($districtNum, '0') . '選舉區';
        }
    }

    ksort($counties);
    ksort($towns);
    return ['counties' => $counties, 'towns' => $towns, 'zoneDistricts' => $zoneDistricts];
}

function loadAreaNames() {
    $cacheFile = __DIR__ . '/data/area_names.json';
    if (file_exists($cacheFile)) {
        return json_decode(file_get_contents($cacheFile), true);
    }
    $names = ['towns' => [], 'villages' => []];
    // Same cunli version as the client-side topo (kiang.github.io/taiwan_basecode)
    $topoFile = '/home/kiang/public_html/taiwan_basecode/cunli/s_topo/20240807.json';
    if (!file_exists($topoFile)) return $names;
    $topo = json_decode(file_get_contents($topoFile), true);
    if (!$topo || empty($topo['objects'])) return $names;
    $objKey = array_key_first($topo['objects']);
    foreach ($topo['objects'][$objKey]['geometries'] as $g) {
        $p = $g['properties'] ?? [];
        if (!empty($p['TOWNCODE']) && !isset($names['towns'][$p['TOWNCODE']])) {
            $names['towns'][$p['TOWNCODE']] = $p['TOWNNAME'] ?? '';
        }
        if (!empty($p['VILLCODE'])) {
            $names['villages'][$p['VILLCODE']] = $p['VILLNAME'] ?? '';
        }
    }
    ksort($names['towns']);
    ksort($names['villages']);
    file_put_contents($cacheFile, json_encode($names, JSON_UNESCAPED_UNICODE) . "\n");
    return $names;
}

// Photo upload/delete (multipart, before JSON parsing)
if (isset($_GET['action']) && $_GET['action'] === 'upload_photo' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    $photoDir = __DIR__ . '/data/photos';
    if (!is_dir($photoDir)) mkdir($photoDir, 0755, true);
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['error' => 'Upload failed']);
        exit;
    }
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
    $mime = mime_content_type($_FILES['photo']['tmp_name']);
    if (!isset($allowed[$mime])) {
        echo json_encode(['error' => 'Invalid file type']);
        exit;
    }
    $ext = $allowed[$mime];
    $filename = uniqid('photo_') . '.' . $ext;
    $dest = $photoDir . '/' . $filename;
    move_uploaded_file($_FILES['photo']['tmp_name'], $dest);
    echo json_encode(['ok' => true, 'url' => 'data/photos/' . $filename]);
    exit;
}

if (isset($_GET['action']) && $_GET['action'] === 'delete_photo' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    $post = json_decode(file_get_contents('php://input'), true);
    $url = $post['url'] ?? '';
    // Only allow deleting files in data/photos/
    if ($url && preg_match('#^data/photos/[a-zA-Z0-9_]+\.\w+$#', $url)) {
        $path = __DIR__ . '/' . $url;
        if (file_exists($path)) unlink($path);
        echo json_encode(['ok' => true]);
    } else {
        echo json_encode(['error' => 'Invalid path']);
    }
    exit;
}

function unlinkPhoto($candidate) {
    $photo = $candidate['photo'] ?? '';
    if ($photo && preg_match('#^data/photos/[a-zA-Z0-9_]+\.\w+$#', $photo)) {
        $path = __DIR__ . '/' . $photo;
        if (file_exists($path)) unlink($path);
    }
}

// API handling
if (isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['action'];
    $data = loadData();

    if ($action === 'load') {
        $data['districts'] = loadZones();
        $data['areaCodes'] = loadAreaCodes();
        $data['areaNames'] = loadAreaNames();
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
        foreach (['district', 'townCode', 'townName', 'villCode', 'villName'] as $f) {
            if (isset($candidate[$f]) && $candidate[$f] === '') unset($candidate[$f]);
        }
        foreach (['facebook', 'instagram', 'youtube', 'threads', 'x', 'tiktok', 'line', 'website', 'donate'] as $f) {
            if (isset($candidate[$f]) && $candidate[$f] === '') unset($candidate[$f]);
        }
        if ($index >= 0 && $index < count($data['candidates'])) {
            $oldPhoto = $data['candidates'][$index]['photo'] ?? '';
            $newPhoto = $candidate['photo'] ?? '';
            if ($oldPhoto && $oldPhoto !== $newPhoto) unlinkPhoto($data['candidates'][$index]);
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
            unlinkPhoto($data['candidates'][$index]);
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
                unlinkPhoto($data['candidates'][$index]);
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
        .thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 4px; }
        .thumb-placeholder { width: 36px; height: 36px; background: #e9ecef; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: #adb5bd; font-size: 18px; }
        .photo-preview { max-width: 120px; max-height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #dee2e6; }
        .photo-drop-zone { border: 2px dashed #dee2e6; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: border-color 0.2s; }
        .photo-drop-zone:hover, .photo-drop-zone.drag-over { border-color: #0d6efd; background: #f8f9fa; }
        .badge { font-size: 0.65rem; padding: 2px 4px; }
    </style>
</head>
<body>
<div class="container-fluid py-3">
    <h4>2026 選舉候選人管理</h4>
    <div class="d-flex align-items-center mb-3">
        <ul class="nav nav-tabs flex-grow-1" id="mainTabs">
            <li class="nav-item"><a class="nav-link active" href="#" data-tab="candidates">候選人 Candidates</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-tab="districts">選區 Districts</a></li>
        </ul>
        <button class="btn btn-success btn-sm ms-2 flex-shrink-0" id="generateZonesBtn" onclick="generateZones()">
            ⚙ 產生地圖 Generate Zones
        </button>
    </div>

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
                    <th><input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)"></th><th>#</th><th>照片</th><th>選舉類型</th><th>縣市</th><th>選區</th><th>號次</th><th>姓名</th><th>政黨</th><th>性別</th><th>年齡</th><th>社群</th><th>操作</th>
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
                <label class="form-label">縣市</label>
                <select id="c_county" class="form-select form-select-sm" onchange="onCountyChange()"></select>
                <input type="hidden" id="c_countyCode">
                <input type="hidden" id="c_countyName">
            </div>
            <div class="col-md-4">
                <label class="form-label">鄉鎮市區</label>
                <select id="c_town" class="form-select form-select-sm" onchange="onTownChange()"></select>
                <input type="hidden" id="c_townCode">
                <input type="hidden" id="c_townName">
            </div>
            <div class="col-md-4">
                <label class="form-label">選區</label>
                <select id="c_districtSelect" class="form-select form-select-sm" onchange="onDistrictChange()"></select>
                <input type="hidden" id="c_district">
            </div>
            <div class="col-md-4">
                <label class="form-label">村里</label>
                <select id="c_vill" class="form-select form-select-sm" onchange="onVillChange()"></select>
                <input type="hidden" id="c_villCode">
                <input type="hidden" id="c_villName">
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
            <div class="col-12"><hr class="my-2"><label class="form-label fw-bold">社群連結 Social Links</label></div>
            <div class="col-md-4">
                <label class="form-label">Facebook</label>
                <input id="c_facebook" class="form-control form-control-sm" placeholder="https://facebook.com/...">
            </div>
            <div class="col-md-4">
                <label class="form-label">Instagram</label>
                <input id="c_instagram" class="form-control form-control-sm" placeholder="https://instagram.com/...">
            </div>
            <div class="col-md-4">
                <label class="form-label">YouTube</label>
                <input id="c_youtube" class="form-control form-control-sm" placeholder="https://youtube.com/...">
            </div>
            <div class="col-md-4">
                <label class="form-label">Threads</label>
                <input id="c_threads" class="form-control form-control-sm" placeholder="https://threads.net/...">
            </div>
            <div class="col-md-4">
                <label class="form-label">X (Twitter)</label>
                <input id="c_x" class="form-control form-control-sm" placeholder="https://x.com/...">
            </div>
            <div class="col-md-4">
                <label class="form-label">TikTok</label>
                <input id="c_tiktok" class="form-control form-control-sm" placeholder="https://tiktok.com/...">
            </div>
            <div class="col-md-4">
                <label class="form-label">LINE</label>
                <input id="c_line" class="form-control form-control-sm" placeholder="https://line.me/...">
            </div>
            <div class="col-md-4">
                <label class="form-label">Website</label>
                <input id="c_website" class="form-control form-control-sm" placeholder="https://...">
            </div>
            <div class="col-md-4">
                <label class="form-label">Donate</label>
                <input id="c_donate" class="form-control form-control-sm" placeholder="https://...">
            </div>
            <div class="col-md-12">
                <label class="form-label">照片</label>
                <input type="hidden" id="c_photo">
                <div class="d-flex align-items-start gap-3">
                    <div id="photoPreviewWrap">
                        <img id="photoPreview" class="photo-preview d-none" src="" alt="">
                    </div>
                    <div class="flex-grow-1">
                        <div class="photo-drop-zone" id="photoDropZone" onclick="document.getElementById('photoFileInput').click()">
                            <input type="file" id="photoFileInput" accept="image/*" class="d-none" onchange="handlePhotoFile(this.files)">
                            <div>點擊或拖曳上傳照片</div>
                            <small class="text-muted">支援 JPG / PNG / GIF / WebP</small>
                        </div>
                        <div class="mt-2 d-flex gap-2">
                            <input id="c_photoUrl" class="form-control form-control-sm" placeholder="或輸入圖片網址" onchange="setPhotoFromUrl(this.value)">
                            <button type="button" class="btn btn-outline-danger btn-sm flex-shrink-0" id="photoDeleteBtn" onclick="deletePhoto()" style="display:none">刪除</button>
                        </div>
                    </div>
                </div>
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
const candidateFields = ['election','countyCode','countyName','district','townCode','townName','villCode','villName','number','name','nameEn','party','partyEn','gender','age','education','experience','platform','platformEn','photo','facebook','instagram','youtube','threads','x','tiktok','line','website','donate'];
const socialLinkFields = ['facebook','instagram','youtube','threads','x','tiktok','line','website','donate'];

const socialLabels = {facebook:'FB',instagram:'IG',youtube:'YT',threads:'Th',x:'X',tiktok:'TT',line:'Li',website:'W',donate:'$'};
function socialBadges(c) {
    return socialLinkFields.filter(f => c[f]).map(f => `<a href="${c[f]}" target="_blank" rel="noopener" class="badge bg-secondary text-decoration-none" title="${c[f]}">${socialLabels[f]}</a>`).join(' ');
}

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
        <td>${c.photo ? `<img src="${c.photo}" class="thumb" alt="">` : '<div class="thumb-placeholder">?</div>'}</td>
        <td>${c.election}</td>
        <td>${c.countyName}</td>
        <td>${c.district || ''}</td>
        <td>${c.number}</td>
        <td>${c.name}</td>
        <td>${c.party}</td>
        <td>${c.gender}</td>
        <td>${c.age}</td>
        <td>${socialBadges(c)}</td>
        <td>
            <button class="btn btn-outline-primary btn-sm" onclick="editCandidate(${c._i})">編輯</button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteCandidate(${c._i})">刪除</button>
        </td>
    </tr>`).join('');
    document.getElementById('selectAll').checked = false;
    updateBatchBtn();
}

// Field visibility per election type
const electionFieldRules = {
    '直轄市市長':               { county: true, town: false, district: false, vill: false },
    '縣市首長':                 { county: true, town: false, district: false, vill: false },
    '直轄市議員':               { county: true, town: false, district: true,  vill: false },
    '縣市議員':                 { county: true, town: false, district: true,  vill: false },
    '直轄市山地原住民區區長':     { county: true, town: true,  district: false, vill: false },
    '鄉鎮市長':                 { county: true, town: true,  district: false, vill: false },
    '直轄市山地原住民區區民代表': { county: true, town: true,  district: true,  vill: false },
    '鄉鎮市民代表':             { county: true, town: true,  district: true,  vill: false },
    '村里長':                   { county: true, town: true,  district: false, vill: true  },
};

const municipalCodes = ['63000', '64000', '65000', '66000', '67000', '68000'];

// Cached cunli data per county for village dropdowns
let cunliCache = {};

function applyFieldRules(elType) {
    const rules = electionFieldRules[elType] || {};
    ['county', 'town', 'districtSelect', 'vill'].forEach(f => {
        const key = f === 'districtSelect' ? 'district' : f;
        const wrap = document.getElementById('c_' + f)?.closest('.col-md-4');
        if (wrap) {
            wrap.style.display = rules[key] !== false ? '' : 'none';
        }
    });
    populateCountyDropdown(elType);
}

function getApplicableCounties(elType) {
    if (!appData.areaCodes) return {};
    const all = appData.areaCodes.counties;
    if (elType === '村里長') return all;
    const isMunicipal = ['直轄市市長', '直轄市議員', '直轄市山地原住民區區長', '直轄市山地原住民區區民代表'].includes(elType);
    const isCounty = ['縣市首長', '縣市議員', '鄉鎮市長', '鄉鎮市民代表'].includes(elType);
    const result = {};
    for (const [code, name] of Object.entries(all)) {
        const isMun = municipalCodes.includes(code);
        if (isMunicipal && isMun) result[code] = name;
        else if (isCounty && !isMun) result[code] = name;
    }
    return result;
}

function populateCountyDropdown(elType) {
    const sel = document.getElementById('c_county');
    const counties = getApplicableCounties(elType);
    sel.innerHTML = '<option value="">-- 選擇縣市 --</option>';
    for (const [code, name] of Object.entries(counties)) {
        sel.innerHTML += `<option value="${code}">${name}</option>`;
    }
}

async function onCountyChange() {
    const code = document.getElementById('c_county').value;
    const sel = document.getElementById('c_county');
    const name = sel.options[sel.selectedIndex]?.textContent || '';
    document.getElementById('c_countyCode').value = code;
    document.getElementById('c_countyName').value = name;

    const elType = document.getElementById('c_election').value;
    const rules = electionFieldRules[elType] || {};

    // Clear downstream
    document.getElementById('c_town').innerHTML = '<option value="">-- 選擇鄉鎮市區 --</option>';
    document.getElementById('c_districtSelect').innerHTML = '<option value="">-- 選擇選區 --</option>';
    document.getElementById('c_vill').innerHTML = '<option value="">-- 選擇村里 --</option>';
    document.getElementById('c_townCode').value = '';
    document.getElementById('c_townName').value = '';
    document.getElementById('c_district').value = '';
    document.getElementById('c_villCode').value = '';
    document.getElementById('c_villName').value = '';

    if (rules.town) await populateTownDropdown(code);
    else if (rules.district) populateDistrictDropdown(elType, code);
}

async function populateTownDropdown(countyCode) {
    const sel = document.getElementById('c_town');
    sel.innerHTML = '<option value="">-- 選擇鄉鎮市區 --</option>';
    if (!countyCode) return;

    // Use static towns from list.csv for non-municipal counties only
    if (!municipalCodes.includes(countyCode)) {
        const staticTowns = appData.areaCodes?.towns || {};
        let found = false;
        for (const [code, name] of Object.entries(staticTowns)) {
            if (code.startsWith(countyCode)) {
                const countyName = appData.areaCodes.counties[countyCode] || '';
                const shortName = name.startsWith(countyName) ? name.substring(countyName.length) : name;
                sel.innerHTML += `<option value="${code}" data-fullname="${name}">${shortName}</option>`;
                found = true;
            }
        }
        if (found) return;
    }

    // For 直轄市 or missing towns: extract from cunli topo
    const countyName = appData.areaCodes?.counties[countyCode] || '';
    if (!countyName) return;
    sel.innerHTML = '<option value="">載入中...</option>';
    try {
        if (!cunliCache[countyName]) {
            const url = 'https://kiang.github.io/taiwan_basecode/cunli/topo/city/20240807/' + encodeURIComponent(countyName) + '.json';
            const resp = await fetch(url);
            const topo = await resp.json();
            const objKey = Object.keys(topo.objects)[0];
            cunliCache[countyName] = topojson.feature(topo, topo.objects[objKey]);
        }
        const geojson = cunliCache[countyName];
        const towns = {};
        geojson.features.forEach(f => {
            const tc = f.properties.TOWNCODE;
            if (tc && !towns[tc]) towns[tc] = f.properties.TOWNNAME;
        });
        sel.innerHTML = '<option value="">-- 選擇鄉鎮市區 --</option>';
        Object.entries(towns).sort((a, b) => a[0].localeCompare(b[0])).forEach(([code, name]) => {
            sel.innerHTML += `<option value="${code}" data-fullname="${countyName}${name}">${name}</option>`;
        });
    } catch (e) {
        sel.innerHTML = '<option value="">載入失敗</option>';
    }
}

function onTownChange() {
    const code = document.getElementById('c_town').value;
    const sel = document.getElementById('c_town');
    const opt = sel.options[sel.selectedIndex];
    const fullName = opt?.dataset.fullname || opt?.textContent || '';
    const shortName = opt?.textContent || '';
    document.getElementById('c_townCode').value = code;
    document.getElementById('c_townName').value = shortName;

    const elType = document.getElementById('c_election').value;
    const rules = electionFieldRules[elType] || {};

    // Clear downstream
    document.getElementById('c_districtSelect').innerHTML = '<option value="">-- 選擇選區 --</option>';
    document.getElementById('c_vill').innerHTML = '<option value="">-- 選擇村里 --</option>';
    document.getElementById('c_district').value = '';
    document.getElementById('c_villCode').value = '';
    document.getElementById('c_villName').value = '';

    if (rules.district) populateDistrictDropdown(elType, code);
    if (rules.vill) populateVillDropdown(code);
}

function shortAreaName(name) {
    // 台西鄉 -> 台西, 安平區 -> 安平, 頂洲里 -> 頂洲; keep 2-char names like 東區 as-is
    if (name.length > 2 && '鄉鎮市區村里'.includes(name.slice(-1))) return name.slice(0, -1);
    return name;
}

function districtCoverageLabel(elType, areaCode, districtName) {
    const defs = appData.districts?.[elType]?.[areaCode];
    if (!defs) return '';
    const d = defs.find(x => x.name === districtName);
    if (!d) return '';
    const names = [];
    (d.townCodes || []).forEach(c => {
        const n = appData.areaNames?.towns?.[c];
        if (n) names.push(shortAreaName(n));
    });
    (d.villCodes || []).forEach(c => {
        const n = appData.areaNames?.villages?.[c];
        if (n) names.push(shortAreaName(n));
    });
    return names.length ? `(${names.join('、')})` : '';
}

function populateDistrictDropdown(elType, areaCode) {
    const sel = document.getElementById('c_districtSelect');
    sel.innerHTML = '<option value="">-- 選擇選區 --</option>';
    if (!areaCode) return;

    const prefixes = getZonePrefixes(elType);
    if (!prefixes) return;
    const prefixLabels = { 'T1': '', 'T2': ' (平地原住民)', 'T3': ' (山地原住民)', 'R1': '', 'R2': ' (平原原住民)', 'R3': '' };
    const seen = new Set();
    prefixes.forEach(prefix => {
        const districts = appData.areaCodes?.zoneDistricts?.[prefix]?.[areaCode];
        if (!districts) return;
        districts.forEach(name => {
            if (seen.has(name)) return;
            seen.add(name);
            let label = name + (prefixLabels[prefix] || '');
            // Region zones (T1/R1) carry town/village coverage from zones.json
            if (prefix === 'T1' || prefix === 'R1') {
                label += districtCoverageLabel(elType, areaCode, name);
            }
            sel.innerHTML += `<option value="${name}">${label}</option>`;
        });
    });
}

function getZoneKey(elType) {
    if (elType === '直轄市議員' || elType === '縣市議員') return elType;
    if (elType === '直轄市山地原住民區區民代表' || elType === '鄉鎮市民代表') return elType;
    return null;
}

function getZonePrefixes(elType) {
    const map = {
        '直轄市議員': ['T1', 'T2', 'T3'],
        '縣市議員': ['T1', 'T2', 'T3'],
        '直轄市山地原住民區區民代表': ['R3'],
        '鄉鎮市民代表': ['R1'],
    };
    return map[elType] || null;
}

function onDistrictChange() {
    const val = document.getElementById('c_districtSelect').value;
    document.getElementById('c_district').value = val;
}

async function populateVillDropdown(townCode) {
    const sel = document.getElementById('c_vill');
    sel.innerHTML = '<option value="">載入中...</option>';
    if (!townCode) { sel.innerHTML = '<option value="">-- 選擇村里 --</option>'; return; }

    const countyCode = townCode.substring(0, 5);
    const countyName = appData.areaCodes?.counties[countyCode] || '';
    if (!countyName) { sel.innerHTML = '<option value="">-- 選擇村里 --</option>'; return; }

    try {
        if (!cunliCache[countyName]) {
            const url = 'https://kiang.github.io/taiwan_basecode/cunli/topo/city/20240807/' + encodeURIComponent(countyName) + '.json';
            const resp = await fetch(url);
            const topo = await resp.json();
            const objKey = Object.keys(topo.objects)[0];
            cunliCache[countyName] = topojson.feature(topo, topo.objects[objKey]);
        }
        const geojson = cunliCache[countyName];
        sel.innerHTML = '<option value="">-- 選擇村里 --</option>';
        geojson.features
            .filter(f => f.properties.TOWNCODE === townCode)
            .sort((a, b) => (a.properties.VILLNAME || '').localeCompare(b.properties.VILLNAME || ''))
            .forEach(f => {
                const p = f.properties;
                sel.innerHTML += `<option value="${p.VILLCODE}" data-name="${p.VILLNAME}">${p.VILLNAME}</option>`;
            });
    } catch (e) {
        sel.innerHTML = '<option value="">載入失敗</option>';
    }
}

function onVillChange() {
    const sel = document.getElementById('c_vill');
    const code = sel.value;
    const opt = sel.options[sel.selectedIndex];
    document.getElementById('c_villCode').value = code;
    document.getElementById('c_villName').value = opt?.dataset.name || opt?.textContent || '';
}

function editCandidate(index) {
    document.getElementById('c_index').value = index;
    const c = index >= 0 ? appData.candidates[index] : {};
    candidateFields.forEach(f => {
        const el = document.getElementById('c_' + f);
        if (el) el.value = c[f] ?? '';
    });
    const elType = c.election || Object.keys(appData.elections)[0];
    document.getElementById('c_election').value = elType;
    applyFieldRules(elType);

    // Restore dropdown selections from existing candidate data
    restoreDropdowns(c, elType);

    // Sync photo UI
    const photoUrl = c.photo || '';
    document.getElementById('c_photoUrl').value = photoUrl;
    updatePhotoPreview(photoUrl);
    document.getElementById('photoFileInput').value = '';
    new bootstrap.Modal(document.getElementById('candidateModal')).show();
}

async function restoreDropdowns(c, elType) {
    const rules = electionFieldRules[elType] || {};

    // County
    if (c.countyCode) {
        document.getElementById('c_county').value = c.countyCode;
    }

    // Town
    if (rules.town && c.countyCode) {
        await populateTownDropdown(c.countyCode);
        if (c.townCode) {
            document.getElementById('c_town').value = c.townCode;
        }
    }

    // District
    if (rules.district) {
        const areaCode = rules.town ? c.townCode : c.countyCode;
        if (areaCode) {
            populateDistrictDropdown(elType, areaCode);
            if (c.district) {
                document.getElementById('c_districtSelect').value = c.district;
            }
        }
    }

    // Village
    if (rules.vill && c.townCode) {
        await populateVillDropdown(c.townCode);
        if (c.villCode) {
            document.getElementById('c_vill').value = c.villCode;
        }
    }
}

async function saveCandidate() {
    const index = parseInt(document.getElementById('c_index').value);
    const candidate = {};
    candidateFields.forEach(f => {
        const el = document.getElementById('c_' + f);
        if (el) candidate[f] = el.value;
    });
    if (!candidate.photo) delete candidate.photo;
    socialLinkFields.forEach(f => { if (!candidate[f]) delete candidate[f]; });
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

// Photo handling
function updatePhotoPreview(url) {
    const img = document.getElementById('photoPreview');
    const delBtn = document.getElementById('photoDeleteBtn');
    if (url) {
        img.src = url;
        img.classList.remove('d-none');
        delBtn.style.display = '';
    } else {
        img.src = '';
        img.classList.add('d-none');
        delBtn.style.display = 'none';
    }
}

function setPhotoFromUrl(url) {
    document.getElementById('c_photo').value = url;
    updatePhotoPreview(url);
}

async function handlePhotoFile(files) {
    if (!files || !files.length) return;
    const fd = new FormData();
    fd.append('photo', files[0]);
    const r = await fetch('?action=upload_photo', { method: 'POST', body: fd });
    const res = await r.json();
    if (res.ok) {
        document.getElementById('c_photo').value = res.url;
        document.getElementById('c_photoUrl').value = res.url;
        updatePhotoPreview(res.url);
    } else {
        alert(res.error || 'Upload failed');
    }
}

async function deletePhoto() {
    const url = document.getElementById('c_photo').value;
    if (url && url.startsWith('data/photos/')) {
        await fetch('?action=delete_photo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url })
        });
    }
    document.getElementById('c_photo').value = '';
    document.getElementById('c_photoUrl').value = '';
    document.getElementById('photoFileInput').value = '';
    updatePhotoPreview('');
}

// Drag and drop
const dropZone = document.getElementById('photoDropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handlePhotoFile(e.dataTransfer.files);
});

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

// Update field visibility and reset cascading dropdowns when election type changes
document.getElementById('c_election').addEventListener('change', e => {
    applyFieldRules(e.target.value);
    // Clear all downstream selections
    document.getElementById('c_county').value = '';
    document.getElementById('c_town').innerHTML = '<option value="">-- 選擇鄉鎮市區 --</option>';
    document.getElementById('c_districtSelect').innerHTML = '<option value="">-- 選擇選區 --</option>';
    document.getElementById('c_vill').innerHTML = '<option value="">-- 選擇村里 --</option>';
    ['countyCode', 'countyName', 'townCode', 'townName', 'district', 'villCode', 'villName'].forEach(f => {
        document.getElementById('c_' + f).value = '';
    });
});

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

function generateZones() {
    const script = location.pathname.replace(/admin\.php$/, 'generate_zones.py');
    const absPath = '/home/kiang/public_html/tainan.olc.tw/docs/p/2026/generate_zones.py';
    prompt('請在終端機執行以下指令產生地圖資料：', 'python3 ' + absPath);
}

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
            const prefill = {};
            ['election', 'countyCode', 'countyName', 'district', 'townCode', 'townName', 'villCode', 'villName'].forEach(f => {
                const val = params.get(f);
                if (val) prefill[f] = val;
            });
            editCandidate(-1);
            // After editCandidate initializes the form, restore from URL params
            if (prefill.election) {
                document.getElementById('c_election').value = prefill.election;
                applyFieldRules(prefill.election);
            }
            restoreDropdowns(prefill, prefill.election || Object.keys(appData.elections)[0]);
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
