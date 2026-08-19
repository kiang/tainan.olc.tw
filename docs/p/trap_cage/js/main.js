var map;
var markerClusterGroup;
var markers = {};
var allMarkers = [];
var formModal;
var townLayer = null;

var newPointFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSetGCwQjxN79SlH1CdZEIa-R6iq-X98j4jy_2BqAUvzibokng/viewform?embedded=true';
var mainDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjqrmw9hDDuMBZfsaUh8HrtfHi-x3XnfRzS95sZtLvayCcF9i83_f1NufITtrTdoUIJNEBZyDqbNsr/pub?gid=1918697992&single=true&output=csv';

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function createMarkerIcon() {
    return L.divIcon({
        html: '<div class="marker-icon">🐱</div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function buildPopupContent(props) {
    var content = '<div class="popup-card card border-0">';
    content += '<div class="card-body p-2">';
    content += '<h6 class="card-title">🐾 ' + escapeHtml(props.name || '') + '</h6>';
    if (props.timestamp) {
        content += '<p class="card-text mb-1"><small class="text-muted"><i class="bi bi-clock"></i> ' + escapeHtml(props.timestamp) + '</small></p>';
    }
    if (props.city) {
        content += '<p class="card-text mb-1"><i class="bi bi-geo-alt-fill" style="color:#e8834a;"></i> ' + escapeHtml(props.city) + ' ' + escapeHtml(props.town || '') + '</p>';
    }
    if (props.description) {
        content += '<p class="card-text mb-1">' + escapeHtml(props.description) + '</p>';
    }
    if (props.contact) {
        content += '<p class="card-text mb-1"><i class="bi bi-telephone-fill" style="color:#e8834a;"></i> ' + escapeHtml(props.contact) + '</p>';
    }
    if (props.hours) {
        content += '<p class="card-text mb-1"><i class="bi bi-clock-fill" style="color:#e8834a;"></i> ' + escapeHtml(props.hours) + '</p>';
    }
    if (props.fee) {
        content += '<p class="card-text mb-1"><i class="bi bi-cash-stack" style="color:#e8834a;"></i> ' + escapeHtml(props.fee) + '</p>';
    }
    if (props.reply) {
        content += '<div class="mt-2 p-2 rounded" style="background:#fff8f0;border:1px solid #f4a261;"><small><strong>💬 回覆：</strong>' + escapeHtml(props.reply) + '</small></div>';
    }
    content += '</div>';

    content += '<div class="card-footer p-2 border-0" style="background:transparent;">';
    content += '<div class="d-grid">';
    content += '<button class="btn btn-nav btn-sm" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination=' + props.lat + ',' + props.lon + '\', \'_blank\')"><i class="bi bi-sign-turn-right-fill"></i> Google Maps 導航</button>';
    content += '</div>';
    content += '</div>';
    content += '</div>';

    return content;
}

var cityCounts = {};

function addMarkersFromCSV() {
    return new Promise(function (resolve) {
        Papa.parse(mainDataUrl, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: function (results) {
                for (var i = 1; i < results.data.length; i++) {
                    var row = results.data[i];
                    var timestamp = row[0];
                    var name = row[1];
                    var city = row[2];
                    var town = row[3];
                    var lon = parseFloat(row[4]);
                    var lat = parseFloat(row[5]);
                    var uuid = row[6];
                    var description = row[7];
                    var contact = row[8];
                    var hours = row[9];
                    var fee = row[10];
                    var reply = row[11];

                    if (!isNaN(lon) && !isNaN(lat)) {
                        (function () {
                            var props = {
                                name: name,
                                timestamp: timestamp,
                                city: city,
                                town: town,
                                uuid: uuid,
                                description: description,
                                contact: contact,
                                hours: hours,
                                fee: fee,
                                reply: reply,
                                lon: lon,
                                lat: lat
                            };

                            var marker = L.marker([lat, lon], { icon: createMarkerIcon() });
                            marker.bindPopup(function () {
                                return buildPopupContent(props);
                            }, { maxWidth: 300 });
                            marker.properties = props;
                            markers[props.uuid] = marker;
                            allMarkers.push(marker);
                            markerClusterGroup.addLayer(marker);
                        })();

                        var cityKey = city || '未知';
                        cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
                    }
                }

                createStatsChart(cityCounts);

                if (window.location.hash) {
                    var pointId = window.location.hash.replace('#point/', '');
                    showPoint(pointId);
                }

                resolve();
            },
            error: function (error) {
                console.error('Error fetching CSV:', error);
                resolve();
            }
        });
    });
}

function showPoint(pointId) {
    var marker = markers[pointId];
    if (marker) {
        map.setView(marker.getLatLng(), 17);
        markerClusterGroup.zoomToShowLayer(marker, function () {
            marker.openPopup();
        });
    }
}

function filterMarkers() {
    var filterValue = document.getElementById('filter-input').value.toLowerCase();
    markerClusterGroup.clearLayers();

    allMarkers.forEach(function (marker) {
        var props = marker.properties;
        var searchStr = ((props.name || '') + ' ' + (props.city || '') + ' ' + (props.town || '') + ' ' + (props.description || '')).toLowerCase();
        if (searchStr.includes(filterValue)) {
            markerClusterGroup.addLayer(marker);
        }
    });
}

function createStatsChart(data) {
    var canvas = document.getElementById('statsChart');
    if (!canvas) return;

    var labels = Object.keys(data).sort(function (a, b) { return data[b] - data[a]; });
    var values = labels.map(function (k) { return data[k]; });
    var total = values.reduce(function (s, v) { return s + v; }, 0);

    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '租借點數量',
                data: values,
                backgroundColor: '#e8834a',
                borderColor: '#d4845e',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '各縣市租借點統計 (總計: ' + total + ')',
                    font: { size: 14, weight: 'bold' }
                },
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true, title: { display: true, text: '數量' } }
            }
        }
    });
}

function getTownInfo(latlng) {
    if (!townLayer) return { county: '', town: '' };

    var foundCounty = '';
    var foundTown = '';

    townLayer.eachLayer(function (layer) {
        if (layer.feature && layer.feature.geometry) {
            var bounds = layer.getBounds();
            if (bounds.contains(latlng)) {
                var point = turf.point([latlng.lng, latlng.lat]);
                if (turf.booleanPointInPolygon(point, layer.feature)) {
                    foundCounty = layer.feature.properties.COUNTYNAME || '';
                    foundTown = layer.feature.properties.TOWNNAME || '';
                }
            }
        }
    });

    return { county: foundCounty, town: foundTown };
}

function loadTownBoundaries() {
    fetch('https://kiang.github.io/taiwan_basecode/city/topo/20230317.json')
        .then(function (response) { return response.json(); })
        .then(function (topoData) {
            var geoData = topojson.feature(topoData, topoData.objects['20230317']);
            townLayer = L.geoJSON(geoData, {
                style: {
                    color: '#3388ff',
                    weight: 1,
                    opacity: 0.5,
                    fillOpacity: 0.05,
                    fillColor: '#ffffff'
                }
            }).addTo(map);
        })
        .catch(function (error) {
            console.error('Error loading town boundaries:', error);
        });
}

function openFormInModal(lat, lon) {
    var latlng = L.latLng(lat, lon);
    var townInfo = getTownInfo(latlng);
    var formUrl = newPointFormUrl;
    formUrl += '&entry.246582967=' + encodeURIComponent(townInfo.county);
    formUrl += '&entry.940380164=' + encodeURIComponent(townInfo.town);
    formUrl += '&entry.1138570188=' + lon.toFixed(6);
    formUrl += '&entry.764388761=' + lat.toFixed(6);
    formUrl += '&entry.153821494=' + uuidv4();
    document.getElementById('form-iframe').src = formUrl;
    formModal.show();
}

function initMap() {
    formModal = new bootstrap.Modal(document.getElementById('form-modal'));

    document.getElementById('form-modal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('form-iframe').src = 'about:blank';
    });

    map = L.map('map', {
        center: [23.000694, 120.221507],
        zoom: 12,
        zoomControl: true
    });

    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        maxZoom: 20,
        attribution: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }).addTo(map);

    markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 40,
        iconCreateFunction: function (cluster) {
            var count = cluster.getChildCount();
            var size = Math.min(50, 30 + Math.sqrt(count) * 3);
            return L.divIcon({
                html: '<div style="background:linear-gradient(135deg,#e8834a,#f4a261);color:#fff;border-radius:50%;width:' + size + 'px;height:' + size + 'px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid #fff;box-shadow:0 3px 8px rgba(90,62,43,0.35);">' + count + '</div>',
                className: '',
                iconSize: [size, size]
            });
        }
    });
    map.addLayer(markerClusterGroup);

    loadTownBoundaries();

    map.on('click', function (e) {
        var lat = e.latlng.lat;
        var lon = e.latlng.lng;
        var townInfo = getTownInfo(e.latlng);
        var locationStr = (townInfo.county || '') + ' ' + (townInfo.town || '');

        L.popup()
            .setLatLng(e.latlng)
            .setContent(
                '<div class="popup-card card border-0">' +
                '<div class="card-body p-2">' +
                '<h6>📍 此位置</h6>' +
                (locationStr.trim() ? '<p class="mb-1"><i class="bi bi-geo-alt-fill" style="color:#e8834a;"></i> ' + escapeHtml(locationStr.trim()) + '</p>' : '') +
                '<p class="mb-1"><small class="text-muted">' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</small></p>' +
                '</div>' +
                '<div class="card-footer p-2 border-0" style="background:transparent;">' +
                '<div class="d-grid">' +
                '<button class="btn btn-form btn-sm" onclick="openFormInModal(' + lat + ',' + lon + ')">' +
                '🐾 新增租借點資訊</button>' +
                '</div>' +
                '</div>' +
                '</div>'
            )
            .openOn(map);
    });

    document.getElementById('locate-me').addEventListener('click', function () {
        map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true });
    });

    map.on('locationfound', function (e) {
        L.circleMarker(e.latlng, {
            radius: 8,
            fillColor: '#3399CC',
            color: '#fff',
            weight: 2,
            fillOpacity: 1
        }).addTo(map);
    });

    document.getElementById('add-point-hint').addEventListener('click', function () {
        var toast = document.createElement('div');
        toast.className = 'cat-toast alert alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        toast.style.zIndex = '3000';
        toast.innerHTML = '🐾 請點選地圖上的位置來新增租借點 <button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
        document.body.appendChild(toast);
        setTimeout(function () { if (toast.parentNode) toast.remove(); }, 4000);
    });

    var coordinatesModal = new bootstrap.Modal(document.getElementById('coordinates-modal'));
    var coordinatesInput = document.getElementById('coordinatesInput');
    var latInput = document.getElementById('latInput');
    var lonInput = document.getElementById('lonInput');

    document.getElementById('input-coordinates').addEventListener('click', function () {
        coordinatesInput.value = '';
        latInput.value = '';
        lonInput.value = '';
        coordinatesModal.show();
    });

    coordinatesInput.addEventListener('input', function () {
        var parts = this.value.split(',').map(function (s) { return s.trim(); });
        if (parts.length === 2) {
            var lat = parseFloat(parts[0]);
            var lon = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lon)) {
                latInput.value = lat;
                lonInput.value = lon;
            }
        }
    });

    document.getElementById('zoomToCoordinates').addEventListener('click', function () {
        var lat = parseFloat(latInput.value);
        var lon = parseFloat(lonInput.value);
        if (isNaN(lat) || isNaN(lon)) return;

        var latlng = L.latLng(lat, lon);
        map.setView(latlng, 18);
        coordinatesModal.hide();

        setTimeout(function () {
            var townInfo = getTownInfo(latlng);
            var locationStr = (townInfo.county || '') + ' ' + (townInfo.town || '');

            L.popup()
                .setLatLng(latlng)
                .setContent(
                    '<div class="popup-card card border-0">' +
                    '<div class="card-body p-2">' +
                    '<h6>📍 此位置</h6>' +
                    (locationStr.trim() ? '<p class="mb-1"><i class="bi bi-geo-alt-fill" style="color:#e8834a;"></i> ' + escapeHtml(locationStr.trim()) + '</p>' : '') +
                    '<p class="mb-1"><small class="text-muted">' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</small></p>' +
                    '</div>' +
                    '<div class="card-footer p-2 border-0" style="background:transparent;">' +
                    '<div class="d-grid">' +
                    '<button class="btn btn-form btn-sm" onclick="openFormInModal(' + lat + ',' + lon + ')">' +
                    '🐾 新增租借點資訊</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>'
                )
                .openOn(map);
        }, 500);
    });

    document.getElementById('filter-input').addEventListener('input', filterMarkers);

    document.getElementById('readme-icon').addEventListener('click', function () {
        document.getElementById('readme-popup').style.display = 'block';
    });

    document.getElementById('readme-closer').addEventListener('click', function () {
        document.getElementById('readme-popup').style.display = 'none';
    });

    addMarkersFromCSV();

    window.addEventListener('hashchange', function () {
        if (window.location.hash.startsWith('#point/')) {
            var pointId = window.location.hash.replace('#point/', '');
            showPoint(pointId);
        }
    });
}

window.onload = initMap;
