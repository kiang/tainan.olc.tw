// ==============================================
// GOOGLE FORM & SPREADSHEET SETTINGS
// ==============================================
const GOOGLE_SPREADSHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQtqxsotdWdQGEweXOounQ2oga7Vk8VOxo9HN1uGK2RackLjFZYk--nc7VIV4VJrUawO2L7i-giKVua/pub?gid=729351195&single=true&output=csv';

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSelYkFRamuPXdp3lVvXfgGKm49byuiAh-KAyTTjVpAP1Wd-nw/viewform?usp=pp_url&hl=zh_TW';

// Google Form field entry IDs
const FORM_FIELDS = {
    longitude: 'entry.878731854',   // 經度
    latitude: 'entry.158869420',    // 緯度
    uuid: 'entry.1072963415'        // 地點編號 (UUID)
};

// CSV Column Mappings (0-based indices)
const CSV_COLUMNS = {
    timestamp: 0,      // 時間戳記
    eiaUrl: 1,         // 環評書公開網址
    area: 2,           // 開發面積
    capacity: 3,       // 裝置容量
    longitude: 4,      // 經度
    latitude: 5,       // 緯度
    uuid: 6,           // 地點編號
    description: 7     // 說明
};

// Map settings
const MAP_CENTER = [23.5, 120.5]; // Taiwan center
const MAP_ZOOM = 8;
const CLUSTER_DISTANCE = 50;

// Marker color
const MARKER_COLOR = '#2a5298';

// ==============================================
// INITIALIZATION
// ==============================================
var map;
var markers = L.markerClusterGroup({
    maxClusterRadius: CLUSTER_DISTANCE
});
var points = {};
var coordinatesModal;
var allMarkersBounds = null;

// ==============================================
// MAP INITIALIZATION
// ==============================================
function initMap() {
    // Create map
    map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add marker cluster group
    map.addLayer(markers);

    // Load data from CSV
    loadMarkersFromCSV();

    // Setup event handlers
    setupEventHandlers();

    // Setup routing
    setupRouting();
}

// ==============================================
// DATA LOADING
// ==============================================
function loadMarkersFromCSV() {
    Papa.parse(GOOGLE_SPREADSHEET_CSV_URL, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            const rows = results.data;
            let markerCount = 0;

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];

                if (!row || row.length < 2) {
                    continue;
                }

                const lon = parseFloat(row[CSV_COLUMNS.longitude]);
                const lat = parseFloat(row[CSV_COLUMNS.latitude]);

                if (!isNaN(lon) && !isNaN(lat)) {
                    const uuid = (row[CSV_COLUMNS.uuid] || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
                    const timestamp = row[CSV_COLUMNS.timestamp] || '';
                    const eiaUrl = row[CSV_COLUMNS.eiaUrl] || '';
                    const area = row[CSV_COLUMNS.area] || '';
                    const capacity = row[CSV_COLUMNS.capacity] || '';
                    const description = row[CSV_COLUMNS.description] || '';

                    // Extract project name from EIA URL or timestamp
                    let name = '水面型光電案場';
                    if (uuid) {
                        name += ` #${uuid.substring(0, 8)}`;
                    }

                    const marker = createMarker(lat, lon, {
                        uuid: uuid,
                        name: name,
                        capacity: capacity,
                        area: area,
                        timestamp: timestamp,
                        eiaUrl: eiaUrl,
                        description: description
                    });

                    markers.addLayer(marker);
                    if (uuid) {
                        points[uuid] = marker;
                    }
                    markerCount++;
                }
            }

            // Fit map bounds to show all markers
            if (markerCount > 0) {
                allMarkersBounds = markers.getBounds();

                // Check if there's a hash in URL to show specific point
                const hash = window.location.hash.substring(1);
                if (hash.startsWith('point/')) {
                    // Don't fit bounds, let the routing handle it
                } else {
                    // No specific point requested, fit to all markers
                    map.fitBounds(allMarkersBounds, { padding: [50, 50] });
                }

                // Trigger routing after data is loaded
                handleRoute();
            }
        },
        error: function(error) {
            console.error('Error parsing CSV:', error);
            alert('資料載入失敗，請確認 Google Spreadsheet CSV URL 設定是否正確');
        }
    });
}

// ==============================================
// MARKER CREATION
// ==============================================
function createMarker(lat, lon, properties) {
    const icon = getMarkerIcon();
    const marker = L.marker([lat, lon], { icon: icon });

    marker.properties = properties;
    marker.on('click', function() {
        showMarkerPopup(marker);
    });

    return marker;
}

function getMarkerIcon() {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${MARKER_COLOR}; color: white;
                      border: 3px solid white;
                      width: 44px; height: 44px; display: flex;
                      align-items: center; justify-content: center;
                      font-weight: bold; font-size: 20px;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                      transform: skewX(-20deg);">
                      <i class="bi bi-sun-fill" style="transform: skewX(20deg);"></i>
                </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
    });
}

// ==============================================
// POPUP HANDLING
// ==============================================
function showMarkerPopup(marker) {
    const props = marker.properties;
    const latLng = marker.getLatLng();

    let content = '<div class="card" style="border: none;">';

    // Card body
    content += '<div class="card-body" style="padding: 20px;">';

    // Title
    content += `<h5 class="card-title mb-3" style="color: #2a5298; font-weight: 600;">${props.name}</h5>`;

    // Main information
    content += '<div class="mb-2">';

    content += `<div class="row mb-2">`;
    content += `<div class="col-5 text-muted"><i class="bi bi-lightning-charge-fill"></i> 裝置容量</div>`;
    content += `<div class="col-7 fw-bold">${props.capacity} MW</div>`;
    content += `</div>`;

    content += `<div class="row mb-2">`;
    content += `<div class="col-5 text-muted"><i class="bi bi-map-fill"></i> 開發面積</div>`;
    content += `<div class="col-7">${props.area} 公頃</div>`;
    content += `</div>`;

    if (props.eiaUrl && props.eiaUrl.trim() !== '') {
        content += `<div class="row mb-2">`;
        content += `<div class="col-5 text-muted"><i class="bi bi-file-earmark-text-fill"></i> 環評書</div>`;
        content += `<div class="col-7"><a href="${props.eiaUrl}" target="_blank" class="btn btn-sm btn-outline-primary" style="padding: 2px 10px; font-size: 0.85rem;">查看環評書 <i class="bi bi-box-arrow-up-right"></i></a></div>`;
        content += `</div>`;
    }

    if (props.description && props.description.trim() !== '') {
        content += `<div class="row mb-2">`;
        content += `<div class="col-5 text-muted"><i class="bi bi-chat-left-text-fill"></i> 說明</div>`;
        content += `<div class="col-7">${props.description}</div>`;
        content += `</div>`;
    }

    content += `<div class="row mb-2">`;
    content += `<div class="col-5 text-muted"><i class="bi bi-geo-alt-fill"></i> 座標</div>`;
    content += `<div class="col-7"><small><code>${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}</code></small></div>`;
    content += `</div>`;

    if (props.timestamp) {
        content += `<div class="row">`;
        content += `<div class="col-12 text-muted" style="font-size: 0.85rem; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">`;
        content += `<i class="bi bi-clock"></i> 登記時間：${props.timestamp}`;
        content += `</div>`;
        content += `</div>`;
    }

    content += '</div>'; // End main info div
    content += '</div>'; // End card-body

    // Navigation buttons
    content += '<div class="card-footer" style="background-color: #f8f9fa; border-top: 1px solid rgba(0,0,0,.125); padding: 15px;">';
    content += '<div class="d-grid gap-2">';
    content += `<button class="btn btn-primary btn-sm" style="border-radius: 6px;" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${latLng.lat},${latLng.lng}', '_blank')"><i class="bi bi-google"></i> 在 Google Maps 中查看</button>`;
    content += `<button class="btn btn-outline-secondary btn-sm" style="border-radius: 6px;" onclick="navigator.clipboard.writeText('${latLng.lat}, ${latLng.lng}'); alert('座標已複製！');"><i class="bi bi-clipboard"></i> 複製座標</button>`;
    content += '</div>';
    content += '</div>';
    content += '</div>';

    marker.bindPopup(content, {
        maxWidth: 400,
        className: 'custom-popup'
    }).openPopup();

    // Update URL hash
    if (props.uuid) {
        window.location.hash = 'point/' + props.uuid;
    }
}

function showEmptyPointPopup(latLng) {
    const formUrl = buildFormUrl(latLng);

    let content = '<div class="card" style="border: none;">';
    content += '<div class="card-body" style="padding: 20px;">';
    content += '<h5 class="card-title mb-3" style="color: #2a5298; font-weight: 600;">';
    content += '<i class="bi bi-pin-map"></i> 新增案場資訊';
    content += '</h5>';

    content += '<div class="mb-3">';
    content += `<div class="row mb-2">`;
    content += `<div class="col-4 text-muted"><i class="bi bi-geo-alt"></i> 經度</div>`;
    content += `<div class="col-8"><code>${latLng.lng.toFixed(6)}</code></div>`;
    content += `</div>`;
    content += `<div class="row">`;
    content += `<div class="col-4 text-muted"><i class="bi bi-geo-alt"></i> 緯度</div>`;
    content += `<div class="col-8"><code>${latLng.lat.toFixed(6)}</code></div>`;
    content += `</div>`;
    content += '</div>';

    content += '<div class="alert alert-info" role="alert" style="font-size: 0.9rem; margin-bottom: 15px;">';
    content += '<i class="bi bi-info-circle-fill"></i> 點擊下方按鈕開啟表單，填寫水面型光電案場資訊';
    content += '</div>';

    content += '</div>';
    content += '<div class="card-footer" style="background-color: #f8f9fa; border-top: 1px solid rgba(0,0,0,.125); padding: 15px;">';
    content += '<div class="d-grid gap-2">';
    content += `<button class="btn btn-primary" style="border-radius: 6px; font-weight: 500;" onclick="window.open('${formUrl}', '_blank')"><i class="bi bi-plus-circle-fill"></i> 填寫案場資料</button>`;
    content += `<button class="btn btn-outline-secondary btn-sm" style="border-radius: 6px;" onclick="navigator.clipboard.writeText('${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}'); alert('座標已複製！');"><i class="bi bi-clipboard"></i> 複製座標</button>`;
    content += '</div>';
    content += '</div>';
    content += '</div>';

    L.popup({
        maxWidth: 350,
        className: 'custom-popup'
    })
        .setLatLng(latLng)
        .setContent(content)
        .openOn(map);
}

function buildFormUrl(latLng) {
    let formUrl = GOOGLE_FORM_URL;
    formUrl += '&' + FORM_FIELDS.longitude + '=' + latLng.lng.toFixed(6);
    formUrl += '&' + FORM_FIELDS.latitude + '=' + latLng.lat.toFixed(6);
    formUrl += '&' + FORM_FIELDS.uuid + '=' + uuidv4();
    return formUrl;
}

// ==============================================
// EVENT HANDLERS
// ==============================================
function setupEventHandlers() {
    // Map click
    map.on('click', function(e) {
        showEmptyPointPopup(e.latlng);
        document.getElementById('readme-popup').style.display = 'none';
    });

    // View all markers button
    document.getElementById('view-all-markers').addEventListener('click', function() {
        if (allMarkersBounds) {
            map.fitBounds(allMarkersBounds, { padding: [50, 50] });
            // Clear any URL hash
            if (window.location.hash) {
                history.pushState('', document.title, window.location.pathname + window.location.search);
            }
            // Close any open popups
            map.closePopup();
        }
    });

    // Coordinates input
    document.getElementById('input-coordinates').addEventListener('click', function() {
        coordinatesModal.show();
    });

    // Coordinates modal
    coordinatesModal = new bootstrap.Modal(document.getElementById('coordinatesModal'));

    document.getElementById('coordinatesInput').addEventListener('input', function() {
        const coords = parseCoordinates(this.value);
        if (coords) {
            document.getElementById('latitude').value = coords.latitude;
            document.getElementById('longitude').value = coords.longitude;
        }
    });

    document.getElementById('zoomToCoordinates').addEventListener('click', function() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lon = parseFloat(document.getElementById('longitude').value);

        if (isNaN(lat) || isNaN(lon)) {
            alert('請輸入有效的緯度和經度');
            return;
        }

        map.setView([lat, lon], 18);
        showEmptyPointPopup(L.latLng(lat, lon));
        coordinatesModal.hide();
    });

    // Readme popup
    document.getElementById('readme-icon').addEventListener('click', function() {
        document.getElementById('readme-popup').style.display = 'block';
    });

    document.getElementById('readme-closer').addEventListener('click', function() {
        document.getElementById('readme-popup').style.display = 'none';
    });
}

// ==============================================
// ROUTING
// ==============================================
function setupRouting() {
    window.addEventListener('hashchange', handleRoute);
    // Don't call handleRoute() here - will be called after data loads
}

function handleRoute() {
    const hash = window.location.hash.substring(1);

    if (hash.startsWith('point/')) {
        const pointId = hash.substring(6);
        showPoint(pointId);
    }
}

function showPoint(pointId) {
    const marker = points[pointId];

    if (marker) {
        const latLng = marker.getLatLng();
        map.setView(latLng, 16);
        setTimeout(() => {
            showMarkerPopup(marker);
        }, 500);
    }
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================
function parseCoordinates(input) {
    const parts = input.split(',').map(part => part.trim());
    if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
            return { latitude: lat, longitude: lon };
        }
    }
    return null;
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==============================================
// START APPLICATION
// ==============================================
window.onload = initMap;
