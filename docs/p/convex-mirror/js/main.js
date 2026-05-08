// Status color mapping
var STATUS_COLORS = {
    '正常': '#4CAF50',
    '損壞': '#F44336',
    '遮蔽': '#FF9800',
    '缺失': '#9E9E9E'
};

var STATUS_CLUSTER_CLASS = {
    '正常': 'marker-cluster-normal',
    '損壞': 'marker-cluster-damaged',
    '遮蔽': 'marker-cluster-obscured',
    '缺失': 'marker-cluster-missing'
};

// Google Sheets & Forms URLs
var DATA_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOS9lxm6qX6mt-B21YUekFllFK3zlRkPzQJvzcrrKJoWz9m0ANgHWXtKLucwulgfZFY3JX7gCkHLmQ/pub?output=csv';
var ADDITIONAL_IMAGES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRThi7eeQcxIr3P09clG1TRi8nd2mxqXAnL_ti2slOuYHZDJYk_nmMjF1omIa6Lskt8JuG_B1AYSrhq/pub?output=csv';
var REPORT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfDKVhKr4oqlvb30l64hXHBpWktwfnRyif5guqwk9ARHFnMXQ/viewform?usp=pp_url';
var ADD_IMAGE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdmlxWIGLjyRFMTs9p27JpwUoPL1H_XPkjH383rANyw5lQR6w/viewform?usp=pp_url';

// State
var map;
var markersLayer;
var allMarkers = [];
var points = {};
var additionalImages = {};
var statusCounts = { '正常': 0, '損壞': 0, '遮蔽': 0, '缺失': 0 };
var activeStatusFilter = 'all';
var activeTextFilter = '';
var userMarker = null;

// Check-in mode
var isCheckinMode = false;
var checkedMarkers = new Set();
var checkinStartTime = null;

// Initialize map centered on Taiwan
map = L.map('map', {
    center: [23.7, 120.96],
    zoom: 8,
    zoomControl: true
});

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
}).addTo(map);

// Marker cluster group with custom cluster class
markersLayer = L.markerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 17,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: function (cluster) {
        var children = cluster.getAllChildMarkers();
        var counts = { '正常': 0, '損壞': 0, '遮蔽': 0, '缺失': 0 };
        children.forEach(function (m) {
            var s = m.mirrorData && m.mirrorData.status;
            if (counts.hasOwnProperty(s)) counts[s]++;
        });

        var dominant = '正常';
        var max = 0;
        var mixed = false;
        var nonZeroCount = 0;
        for (var k in counts) {
            if (counts[k] > 0) nonZeroCount++;
            if (counts[k] > max) { max = counts[k]; dominant = k; }
        }
        if (nonZeroCount > 1) mixed = true;

        var cls = mixed ? 'marker-cluster-mixed' : (STATUS_CLUSTER_CLASS[dominant] || 'marker-cluster-mixed');
        var size = children.length;
        var dim = Math.min(50, 30 + Math.sqrt(size) * 4);

        return L.divIcon({
            html: '<div style="width:' + dim + 'px;height:' + dim + 'px;line-height:' + dim + 'px;text-align:center;border-radius:50%;font-size:13px;">' + size + '</div>',
            className: 'marker-cluster ' + cls,
            iconSize: [dim, dim]
        });
    }
}).addTo(map);

function createMirrorIcon(status, checked) {
    var color = STATUS_COLORS[status] || '#9E9E9E';
    var fillColor = (isCheckinMode && !checked) ? '#ffffff' : color;
    var textColor = (isCheckinMode && !checked) ? '#333' : '#fff';
    var strokeColor = (isCheckinMode && checked) ? '#2196F3' : color;
    var strokeWidth = (isCheckinMode && checked) ? 3 : 2;

    var statusLabel = status || '?';
    return L.divIcon({
        className: '',
        html: '<svg width="32" height="32" viewBox="0 0 32 32">' +
            '<circle cx="16" cy="16" r="14" fill="' + fillColor + '" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '"/>' +
            '<text x="16" y="17" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="' + textColor + '">' + statusLabel + '</text>' +
            '</svg>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Fetch additional images
function fetchAdditionalImages() {
    if (ADDITIONAL_IMAGES_CSV_URL.indexOf('REPLACE') === 0) return Promise.resolve();
    return new Promise(function (resolve, reject) {
        Papa.parse(ADDITIONAL_IMAGES_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: function (results) {
                for (var i = 1; i < results.data.length; i++) {
                    var row = results.data[i];
                    var fileUrl = row[1];
                    var id = row[7];
                    if (id && fileUrl) {
                        var trimmedId = id.trim();
                        if (!additionalImages[trimmedId]) additionalImages[trimmedId] = [];
                        var match = fileUrl.match(/[-\w]{25,}/);
                        if (match) {
                            additionalImages[trimmedId].push({ fileId: match[0], timestamp: row[0] });
                        }
                    }
                }
                resolve();
            },
            error: function (err) { console.error('Error fetching additional images:', err); reject(err); }
        });
    });
}

// Fetch main data
function addMarkersFromCSV() {
    if (DATA_CSV_URL.indexOf('REPLACE') === 0) {
        createStatusChart(statusCounts);
        return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
        Papa.parse(DATA_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: function (results) {
                for (var i = 1; i < results.data.length; i++) {
                    var row = results.data[i];
                    var lon = parseFloat(row[5]);
                    var lat = parseFloat(row[6]);
                    if (isNaN(lon) || isNaN(lat)) continue;

                    var data = {
                        timestamp: row[0],
                        fileUrl: row[1],
                        status: row[2] || '正常',
                        city: row[3],
                        town: row[4],
                        lon: lon,
                        lat: lat,
                        uuid: row[7],
                        hasLocal: false,
                        address: row[8] || '',
                        notes: row[9] || ''
                    };

                    var fileId = '';
                    if (data.fileUrl) {
                        var match = data.fileUrl.match(/[-\w]{25,}/);
                        if (match) fileId = match[0];
                    }
                    data.fileId = fileId;

                    var marker = L.marker([lat, lon], { icon: createMirrorIcon(data.status, false) });
                    marker.mirrorData = data;
                    marker.on('click', onMarkerClick);

                    allMarkers.push(marker);
                    points[data.uuid] = marker;

                    if (statusCounts.hasOwnProperty(data.status)) {
                        statusCounts[data.status]++;
                    }
                }

                applyFilters();
                createStatusChart(statusCounts);
                setupRouting();
                resolve();
            },
            error: function (err) { console.error('Error fetching CSV:', err); reject(err); }
        });
    });
}

function onMarkerClick() {
    var data = this.mirrorData;
    if (!data) return;

    if (isCheckinMode) {
        if (checkedMarkers.has(data.uuid)) {
            checkedMarkers.delete(data.uuid);
        } else {
            checkedMarkers.add(data.uuid);
        }
        this.setIcon(createMirrorIcon(data.status, checkedMarkers.has(data.uuid)));
    }

    showPanel(data);
    window.location.hash = 'point/' + data.uuid;
}

function showPanel(data) {
    var panel = document.getElementById('bottomPanel');
    var overlay = document.getElementById('panelOverlay');

    document.getElementById('panelTitle').innerHTML =
        '<span class="status-badge status-' + data.status + '">' + data.status + '</span> 道路反光鏡';

    var html = '';

    // Photo
    if (data.hasLocal) {
        html += '<div class="photo-container"><img src="pic/' + data.uuid + '.jpg" alt="道路反光鏡照片"></div>';
    } else if (data.fileId) {
        html += '<div class="photo-container"><iframe src="https://drive.google.com/file/d/' + data.fileId + '/preview" allow="autoplay"></iframe></div>';
    }

    // Additional images
    if (additionalImages[data.uuid] && additionalImages[data.uuid].length > 0) {
        html += '<div class="additional-images"><h6>追蹤照片</h6>';
        additionalImages[data.uuid].forEach(function (img) {
            html += '<iframe src="https://drive.google.com/file/d/' + img.fileId + '/preview" allow="autoplay"></iframe>';
            html += '<small class="text-muted d-block text-center mb-2">' + img.timestamp + '</small>';
        });
        html += '</div>';
    }

    // Add image button
    if (ADD_IMAGE_FORM_URL.indexOf('REPLACE') !== 0) {
        var imgFormUrl = ADD_IMAGE_FORM_URL +
            '&entry.282491100=' + encodeURIComponent(data.city) +
            '&entry.2011060178=' + encodeURIComponent(data.town) +
            '&entry.1755310223=' + data.lon.toFixed(6) +
            '&entry.1416473723=' + data.lat.toFixed(6) +
            '&entry.122195793=' + data.uuid;
        html += '<div class="d-grid mb-2"><a class="btn btn-outline-primary btn-sm" href="' + imgFormUrl + '" target="_blank"><i class="bi bi-plus-circle"></i> 新增照片</a></div>';
    }

    // Info rows
    html += '<div class="info-row"><span class="info-label">時間</span><span class="info-value">' + data.timestamp + '</span></div>';
    html += '<div class="info-row"><span class="info-label">縣市</span><span class="info-value">' + data.city + '</span></div>';
    html += '<div class="info-row"><span class="info-label">鄉鎮市區</span><span class="info-value">' + data.town + '</span></div>';
    if (data.address) {
        html += '<div class="info-row"><span class="info-label">地址</span><span class="info-value">' + data.address + '</span></div>';
    }
    if (data.notes) {
        html += '<div class="info-row"><span class="info-label">備註</span><span class="info-value">' + data.notes + '</span></div>';
    }

    // Reply
    if (data.reply) {
        html += '<div class="reply-section"><strong>處理情形：</strong><br>' + data.reply + '</div>';
    }

    // Navigation buttons
    html += '<div class="nav-buttons">';
    html += '<a class="nav-btn" href="https://www.google.com/maps/dir/?api=1&destination=' + data.lat + ',' + data.lon + '" target="_blank"><i class="bi bi-google"></i> Google Maps 導航</a>';
    html += '<a class="nav-btn secondary" href="https://wego.here.com/directions/drive/mylocation/' + data.lat + ',' + data.lon + '" target="_blank"><i class="bi bi-signpost-2"></i> HERE Maps 導航</a>';
    html += '</div>';

    document.getElementById('panelBody').innerHTML = html;
    panel.classList.add('show');
    overlay.classList.add('show');
}

function hidePanel() {
    document.getElementById('bottomPanel').classList.remove('show');
    document.getElementById('panelOverlay').classList.remove('show');
    window.location.hash = '';
}

document.getElementById('panelClose').addEventListener('click', hidePanel);
document.getElementById('panelOverlay').addEventListener('click', hidePanel);

// Click on empty map area to report
map.on('click', function (e) {
    if (isCheckinMode) return;

    // Check if click hit a marker (handled by marker click)
    var dominated = false;
    map.eachLayer(function (layer) {
        if (layer instanceof L.Marker && layer.getBounds) return;
    });

    // Show report form popup
    var lat = e.latlng.lat.toFixed(6);
    var lon = e.latlng.lng.toFixed(6);

    if (REPORT_FORM_URL.indexOf('REPLACE') === 0) return;

    var formUrl = REPORT_FORM_URL +
        '&entry.914392718=' + lon +
        '&entry.2078651376=' + lat +
        '&entry.1915251208=' + uuidv4();

    var popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(
            '<div style="text-align:center;min-width:180px;">' +
            '<p style="margin:0 0 8px;font-size:13px;color:#666;">經度: ' + lon + '<br>緯度: ' + lat + '</p>' +
            '<a href="' + formUrl + '" target="_blank" style="display:inline-block;padding:8px 16px;background:#4CAF50;color:white;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">' +
            '<i class="bi bi-plus-circle"></i> 回報道路反光鏡</a></div>'
        )
        .openOn(map);
});

// Filters
function applyFilters() {
    markersLayer.clearLayers();
    var textFilter = activeTextFilter.toLowerCase();

    allMarkers.forEach(function (marker) {
        var data = marker.mirrorData;
        if (activeStatusFilter !== 'all' && data.status !== activeStatusFilter) return;
        if (textFilter && data.address.toLowerCase().indexOf(textFilter) === -1 &&
            data.city.toLowerCase().indexOf(textFilter) === -1 &&
            data.town.toLowerCase().indexOf(textFilter) === -1) return;
        markersLayer.addLayer(marker);
    });
}

// Status filter buttons
document.querySelectorAll('.status-filter .btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.status-filter .btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        activeStatusFilter = this.getAttribute('data-status');
        applyFilters();
    });
});

// Text filter
document.getElementById('filter-input').addEventListener('input', function () {
    activeTextFilter = this.value;
    applyFilters();
});

// Geolocation
document.getElementById('locate-me').addEventListener('click', function () {
    map.locate({ setView: true, maxZoom: 16 });
});

map.on('locationfound', function (e) {
    if (userMarker) {
        userMarker.setLatLng(e.latlng);
    } else {
        userMarker = L.circleMarker(e.latlng, {
            radius: 8,
            fillColor: '#3399CC',
            color: '#fff',
            weight: 3,
            fillOpacity: 1
        }).addTo(map);
    }
});

map.on('locationerror', function () {
    alert('無法取得您的位置');
});

// Coordinates modal
var coordinatesModal;
document.getElementById('input-coordinates').addEventListener('click', function () {
    document.getElementById('coordinatesInput').value = '';
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    coordinatesModal = new bootstrap.Modal(document.getElementById('coordinatesModal'));
    coordinatesModal.show();
});

document.getElementById('coordinatesInput').addEventListener('input', function () {
    var parts = this.value.split(',').map(function (p) { return p.trim(); });
    if (parts.length === 2) {
        var lat = parseFloat(parts[0]);
        var lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lon;
        }
    }
});

document.getElementById('zoomToCoordinates').addEventListener('click', function () {
    var lat = parseFloat(document.getElementById('latitude').value);
    var lon = parseFloat(document.getElementById('longitude').value);
    if (isNaN(lat) || isNaN(lon)) {
        alert('請輸入有效的緯度和經度');
        return;
    }
    map.setView([lat, lon], 18);
    if (coordinatesModal) coordinatesModal.hide();
});

// Check-in mode
var checkinModeBtn = document.getElementById('checkin-mode');
checkinModeBtn.addEventListener('click', function () {
    isCheckinMode = !isCheckinMode;
    if (isCheckinMode) {
        checkinModeBtn.classList.remove('btn-outline-primary');
        checkinModeBtn.classList.add('btn-primary');
        checkinStartTime = new Date();
        checkedMarkers.clear();
    } else {
        checkinModeBtn.classList.remove('btn-primary');
        checkinModeBtn.classList.add('btn-outline-primary');
        showCheckinSummary();
    }
    refreshMarkerIcons();
});

function refreshMarkerIcons() {
    allMarkers.forEach(function (marker) {
        var data = marker.mirrorData;
        marker.setIcon(createMirrorIcon(data.status, checkedMarkers.has(data.uuid)));
    });
}

function showCheckinSummary() {
    var duration = Math.floor((new Date() - checkinStartTime) / 1000);
    var minutes = Math.floor(duration / 60);
    var seconds = duration % 60;

    var popup = L.popup()
        .setLatLng(map.getCenter())
        .setContent(
            '<div style="text-align:center;">' +
            '<h5 style="margin:0 0 8px;">巡檢完成！</h5>' +
            '<p style="margin:4px 0;">已巡檢 <strong>' + checkedMarkers.size + '</strong> 個道路反光鏡</p>' +
            '<p style="margin:4px 0;">使用時間：' + minutes + '分' + seconds + '秒</p>' +
            '</div>'
        )
        .openOn(map);
}

// Readme popup
document.getElementById('readme-icon').addEventListener('click', function () {
    document.getElementById('readme-popup').style.display = 'block';
});
document.getElementById('readme-closer').addEventListener('click', function () {
    document.getElementById('readme-popup').style.display = 'none';
});

// Status chart
function createStatusChart(data) {
    var ctx = document.getElementById('statusChart');
    if (!ctx) return;
    var total = Object.values(data).reduce(function (s, c) { return s + c; }, 0);

    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: '數量',
                data: Object.values(data),
                backgroundColor: ['#4CAF50', '#F44336', '#FF9800', '#9E9E9E'],
                borderColor: ['#388E3C', '#D32F2F', '#F57C00', '#757575'],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.8,
            plugins: {
                title: {
                    display: true,
                    text: '總計: ' + total,
                    font: { size: 14, weight: 'bold' }
                },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            var value = context.raw || 0;
                            var pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return value + ' (' + pct + '%)';
                        }
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, title: { display: true, text: '數量' } },
                y: { title: { display: true, text: '狀態' } }
            }
        }
    });
}

// Hash routing
function setupRouting() {
    function checkHash() {
        var hash = window.location.hash;
        if (hash.indexOf('#point/') === 0) {
            var uuid = hash.replace('#point/', '');
            var marker = points[uuid];
            if (marker) {
                var data = marker.mirrorData;
                map.setView([data.lat, data.lon], 17);
                showPanel(data);
            }
        }
    }
    window.addEventListener('hashchange', checkHash);
    checkHash();
}

// Load data
Promise.all([
    fetchAdditionalImages(),
    addMarkersFromCSV()
]).then(function () {
    refreshMarkerIcons();
});
