<?php
$jsonFile = __DIR__ . '/points.json';

if (isset($_GET['api'])) {
    header('Content-Type: application/xml; charset=utf-8');
    $word = $_GET['word'] ?? '';
    if ($word === '') {
        echo '<root></root>';
        exit;
    }
    $center = '120.248485,23.184943';
    $commonHeaders = [
        'Accept: application/xml, text/xml, */*; q=0.01',
        'Origin: https://maps.nlsc.gov.tw',
        'Referer: https://maps.nlsc.gov.tw/',
        'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    ];
    $doubleEncoded = rawurlencode(rawurlencode($word));

    if ($_GET['api'] === 'search') {
        $url = 'https://api.nlsc.gov.tw/MapSearch/ContentSearch?word=' . $doubleEncoded
             . '&mode=AutoComplete&count=10&feedback=XML&center=' . rawurlencode($center);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => $commonHeaders,
        ]);
        $result = curl_exec($ch);
        curl_close($ch);
        echo $result ?: '<root></root>';
        exit;
    }

    if ($_GET['api'] === 'query') {
        $postData = 'word=' . $doubleEncoded . '&feedback=XML&center=' . rawurlencode($center);
        $ch = curl_init('https://api.nlsc.gov.tw/MapSearch/QuerySearch');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPHEADER => array_merge($commonHeaders, [
                'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
            ]),
        ]);
        $result = curl_exec($ch);
        curl_close($ch);
        echo $result ?: '<root></root>';
        exit;
    }

    echo '<root></root>';
    exit;
}

$points = json_decode(file_get_contents($jsonFile), true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'save' && isset($_POST['index'])) {
        $i = (int)$_POST['index'];
        if (isset($points[$i])) {
            $points[$i]['name'] = $_POST['name'] ?? $points[$i]['name'];
            $points[$i]['category'] = $_POST['category'] ?? $points[$i]['category'];
            $points[$i]['oldLocation'] = $_POST['oldLocation'] ?? $points[$i]['oldLocation'];
            $points[$i]['address'] = $_POST['address'] ?? $points[$i]['address'];
            $points[$i]['lat'] = (float)($_POST['lat'] ?? $points[$i]['lat']);
            $points[$i]['lng'] = (float)($_POST['lng'] ?? $points[$i]['lng']);
            $points[$i]['phone'] = $_POST['phone'] ?? $points[$i]['phone'];
            $points[$i]['note'] = $_POST['note'] ?? $points[$i]['note'];
            $points[$i]['updated'] = date('Y-m-d');
            file_put_contents($jsonFile, json_encode($points, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            header('Location: edit.php?msg=saved&index=' . $i);
            exit;
        }
    }
}

$editIndex = isset($_GET['index']) ? (int)$_GET['index'] : -1;
$editPoint = ($editIndex >= 0 && isset($points[$editIndex])) ? $points[$editIndex] : null;
$msg = $_GET['msg'] ?? '';
?>
<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>麻豆中央市場攤商 - 編輯工具</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
#map { height: 400px; border-radius: 8px; border: 1px solid #ddd; }
.point-list .item { padding: 8px 12px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.point-list .item:hover { background: #f8f9fa; }
.point-list .item.active { background: #fff3e0; border-left: 3px solid #e65100; }
.point-list .item.geocoded { }
.point-list .item.not-geocoded { background: #fff8e1; }
.point-list .item.not-geocoded.active { background: #ffe0b2; }
.badge-geo { font-size: 11px; }
.geocode-results { max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 6px; }
.geocode-results .result-item { padding: 6px 12px; cursor: pointer; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
.geocode-results .result-item:hover { background: #e3f2fd; }
.geocode-results .result-item.selected { background: #bbdefb; }
#geocode-status { font-size: 13px; }
</style>
</head>
<body>
<div class="container-fluid py-3">
  <?php if ($msg === 'saved'): ?>
  <div class="alert alert-success alert-dismissible fade show" role="alert">
    已儲存！
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>
  <?php endif; ?>

  <div class="row">
    <div class="col-md-4">
      <h5>攤商列表 <span class="text-muted">(<?= count($points) ?>)</span></h5>
      <div class="point-list" style="max-height: calc(100vh - 100px); overflow-y: auto;">
        <?php foreach ($points as $i => $p): ?>
        <a href="edit.php?index=<?= $i ?>" class="text-decoration-none text-dark">
          <div class="item <?= $i === $editIndex ? 'active' : '' ?> <?= ($p['lat'] == 0 && $p['lng'] == 0) ? 'not-geocoded' : 'geocoded' ?>">
            <div>
              <div><strong><?= htmlspecialchars($p['name']) ?></strong></div>
              <div class="text-muted" style="font-size:13px"><?= htmlspecialchars($p['address']) ?></div>
            </div>
            <?php if ($p['lat'] == 0 && $p['lng'] == 0): ?>
              <span class="badge bg-warning text-dark badge-geo">未定位</span>
            <?php else: ?>
              <span class="badge bg-success badge-geo">已定位</span>
            <?php endif; ?>
          </div>
        </a>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="col-md-8">
      <?php if ($editPoint): ?>
      <h5>編輯：<?= htmlspecialchars($editPoint['name']) ?></h5>

      <div id="map" class="mb-3"></div>

      <div class="card mb-3">
        <div class="card-body">
          <h6>地址定位</h6>
          <div class="input-group mb-2">
            <input type="text" id="geocode-input" class="form-control" value="<?= htmlspecialchars($editPoint['address']) ?>" placeholder="輸入地址搜尋...">
            <button class="btn btn-primary" type="button" id="geocode-btn">搜尋地址</button>
          </div>
          <div id="geocode-status" class="mb-2"></div>
          <div id="geocode-results" class="geocode-results" style="display:none;"></div>
        </div>
      </div>

      <form method="post">
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <div class="row g-2 mb-2">
          <div class="col-md-6">
            <label class="form-label">名稱</label>
            <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($editPoint['name']) ?>">
          </div>
          <div class="col-md-3">
            <label class="form-label">分類</label>
            <input type="text" name="category" class="form-control" value="<?= htmlspecialchars($editPoint['category']) ?>">
          </div>
          <div class="col-md-3">
            <label class="form-label">電話</label>
            <input type="text" name="phone" class="form-control" value="<?= htmlspecialchars($editPoint['phone']) ?>">
          </div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-md-6">
            <label class="form-label">新地址</label>
            <input type="text" name="address" class="form-control" value="<?= htmlspecialchars($editPoint['address']) ?>">
          </div>
          <div class="col-md-6">
            <label class="form-label">原攤位</label>
            <input type="text" name="oldLocation" class="form-control" value="<?= htmlspecialchars($editPoint['oldLocation']) ?>">
          </div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-md-3">
            <label class="form-label">緯度 (lat)</label>
            <input type="number" step="any" name="lat" id="input-lat" class="form-control" value="<?= $editPoint['lat'] ?>">
          </div>
          <div class="col-md-3">
            <label class="form-label">經度 (lng)</label>
            <input type="number" step="any" name="lng" id="input-lng" class="form-control" value="<?= $editPoint['lng'] ?>">
          </div>
          <div class="col-md-6">
            <label class="form-label">備註</label>
            <input type="text" name="note" class="form-control" value="<?= htmlspecialchars($editPoint['note']) ?>">
          </div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button type="submit" class="btn btn-success">儲存</button>
          <?php if ($editIndex < count($points) - 1): ?>
          <a href="edit.php?index=<?= $editIndex + 1 ?>" class="btn btn-outline-secondary">下一筆 &rarr;</a>
          <?php endif; ?>
        </div>
      </form>

      <?php else: ?>
      <div class="text-center text-muted mt-5">
        <h5>請從左側選擇一筆資料進行編輯</h5>
        <p>黃色底色為尚未定位的攤商</p>
      </div>
      <?php endif; ?>
    </div>
  </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<?php if ($editPoint): ?>
<script>
(function() {
  var marketLatLng = [23.184943, 120.248485];
  var pointLat = <?= $editPoint['lat'] ?>;
  var pointLng = <?= $editPoint['lng'] ?>;
  var hasCoords = (pointLat !== 0 || pointLng !== 0);
  var center = hasCoords ? [pointLat, pointLng] : marketLatLng;
  var zoom = hasCoords ? 18 : 16;

  var map = L.map('map').setView(center, zoom);
  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 20,
    attribution: '&copy; 國土測繪圖資服務雲'
  }).addTo(map);

  var marketIcon = L.divIcon({
    className: '',
    html: '<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="#b71c1c" stroke="#fff" stroke-width="2"/><text x="15" y="21" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">&#10006;</text></svg>',
    iconSize: [30, 30], iconAnchor: [15, 15]
  });
  L.marker(marketLatLng, { icon: marketIcon }).addTo(map).bindPopup('麻豆中央市場（已關閉）');

  var marker = null;
  if (hasCoords) {
    marker = L.marker(center, { draggable: true }).addTo(map);
    marker.on('dragend', function() {
      var ll = marker.getLatLng();
      document.getElementById('input-lat').value = ll.lat.toFixed(6);
      document.getElementById('input-lng').value = ll.lng.toFixed(6);
    });
  }

  function placeMarker(lat, lng) {
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', function() {
        var ll = marker.getLatLng();
        document.getElementById('input-lat').value = ll.lat.toFixed(6);
        document.getElementById('input-lng').value = ll.lng.toFixed(6);
      });
    }
    document.getElementById('input-lat').value = lat.toFixed(6);
    document.getElementById('input-lng').value = lng.toFixed(6);
    map.setView([lat, lng], 18);
  }

  map.on('click', function(e) {
    placeMarker(e.latlng.lat, e.latlng.lng);
  });

  var geocodeBtn = document.getElementById('geocode-btn');
  var geocodeInput = document.getElementById('geocode-input');
  var geocodeStatus = document.getElementById('geocode-status');
  var geocodeResults = document.getElementById('geocode-results');

  geocodeInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); geocodeBtn.click(); }
  });

  geocodeBtn.addEventListener('click', function() {
    var word = geocodeInput.value.trim();
    if (!word) return;

    geocodeStatus.innerHTML = '<span class="text-info">搜尋中...</span>';
    geocodeResults.style.display = 'none';
    geocodeResults.innerHTML = '';

    var url = 'edit.php?api=search&word=' + encodeURIComponent(word);

    fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(xml) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, 'text/xml');
        var items = doc.querySelectorAll('lucene');
        if (items.length === 0) {
          geocodeStatus.innerHTML = '<span class="text-warning">找不到結果</span>';
          return;
        }
        geocodeStatus.innerHTML = '<span class="text-success">找到 ' + items.length + ' 筆結果，點選以定位：</span>';
        geocodeResults.style.display = 'block';
        items.forEach(function(item) {
          var text = item.textContent;
          var div = document.createElement('div');
          div.className = 'result-item';
          div.textContent = text;
          div.addEventListener('click', function() {
            document.querySelectorAll('.result-item').forEach(function(el) { el.classList.remove('selected'); });
            div.classList.add('selected');
            queryLocation(text);
          });
          geocodeResults.appendChild(div);
        });
      })
      .catch(function(err) {
        geocodeStatus.innerHTML = '<span class="text-danger">搜尋失敗：' + err.message + '</span>';
      });
  });

  function queryLocation(address) {
    geocodeStatus.innerHTML = '<span class="text-info">定位中...</span>';

    fetch('edit.php?api=query&word=' + encodeURIComponent(address))
      .then(function(r) { return r.text(); })
      .then(function(xml) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, 'text/xml');
        var loc = doc.querySelector('LOCATION');
        if (!loc) {
          geocodeStatus.innerHTML = '<span class="text-warning">無法取得座標</span>';
          return;
        }
        var parts = loc.textContent.split(',');
        var lng = parseFloat(parts[0]);
        var lat = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lng)) {
          geocodeStatus.innerHTML = '<span class="text-warning">座標解析失敗</span>';
          return;
        }
        geocodeStatus.innerHTML = '<span class="text-success">已定位：' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</span>';
        placeMarker(lat, lng);
      })
      .catch(function(err) {
        geocodeStatus.innerHTML = '<span class="text-danger">定位失敗：' + err.message + '</span>';
      });
  }
})();
</script>
<?php endif; ?>
</body>
</html>
