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
form.edit-form input[type="date"],
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

<script>
function parseQuickCoord(val) {
    var parts = val.split(/[,\s]+/).filter(function(s) { return s !== ''; });
    if (parts.length >= 2) {
        var lat = parseFloat(parts[0]);
        var lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
            var latInput = document.getElementById('inputLat');
            var lngInput = document.getElementById('inputLng');
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;
        }
    }
}

function extractYoutubeId(input) {
    input = input.trim();
    var m;
    if ((m = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|live\/|embed\/|shorts\/))([A-Za-z0-9_-]{11})/))) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
    return null;
}

function fetchYoutubeInfo(inputId, titleId, btnEl) {
    var input = document.getElementById(inputId);
    var titleInput = document.getElementById(titleId);
    var vid = extractYoutubeId(input.value);
    if (!vid) { if (btnEl) alert('無法辨識 YouTube 影片 ID'); return; }
    input.value = vid;
    if (btnEl) {
        btnEl.textContent = '取得中...';
        btnEl.disabled = true;
    }
    fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + vid + '&format=json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.title) titleInput.value = data.title;
            if (btnEl) { btnEl.textContent = '取得標題'; btnEl.disabled = false; }
        })
        .catch(function() {
            if (btnEl) { alert('無法取得影片資訊，請確認影片 ID 是否正確'); btnEl.textContent = '取得標題'; btnEl.disabled = false; }
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
        var searchText = row.textContent + ' ' + (row.dataset.videos || '');
        if (!q || searchText.toLowerCase().indexOf(q) !== -1) {
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
    row.innerHTML = '<input type="text" name="video_id[]" placeholder="網址或影片 ID" onpaste="autoFetchVideoRow(this)">'
        + '<input type="text" name="video_title[]" placeholder="影片標題">'
        + '<button type="button" class="btn btn-sm btn-primary" onclick="fetchVideoRow(this)" style="flex-shrink:0">取得</button>'
        + '<span class="remove-video" onclick="this.parentElement.remove()">✕</span>';
    div.appendChild(row);
}

function fetchVideoRow(btn) {
    var row = btn.closest('.video-row');
    var idInput = row.querySelector('input[name="video_id[]"]');
    var titleInput = row.querySelector('input[name="video_title[]"]');
    var vid = extractYoutubeId(idInput.value);
    if (!vid) { alert('無法辨識 YouTube 影片 ID'); return; }
    idInput.value = vid;
    btn.textContent = '...';
    btn.disabled = true;
    fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + vid + '&format=json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.title) titleInput.value = data.title;
            btn.textContent = '取得'; btn.disabled = false;
        })
        .catch(function() {
            alert('無法取得影片資訊'); btn.textContent = '取得'; btn.disabled = false;
        });
}

function autoFetchVideoRow(idInput) {
    setTimeout(function() {
        var row = idInput.closest('.video-row');
        var titleInput = row.querySelector('input[name="video_title[]"]');
        var vid = extractYoutubeId(idInput.value);
        if (!vid) return;
        idInput.value = vid;
        fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + vid + '&format=json')
            .then(function(r) { return r.json(); })
            .then(function(data) { if (data.title) titleInput.value = data.title; })
            .catch(function() {});
    }, 100);
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
