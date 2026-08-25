var map;
var markerClusterGroup;
var allMarkers = [];

var mainDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTSIQi8jr0U6E1G4GrCt6W-DihSB8Sg75Id5OwQm1oiifk1nNWHmmP-iwNFyW2YLh6B-PFfDxqovuZi/pub?output=csv';

function createMarkerIcon() {
    return L.divIcon({
        html: '<div class="marker-icon">&#x1f6a8;</div>',
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

function getThreadsEmbedUrl(url) {
    if (!url) return null;
    var match = url.match(/threads\.com\/@([^/]+)\/post\/([^/?#]+)/);
    if (match) {
        return 'https://www.threads.com/@' + match[1] + '/post/' + match[2] + '/embed/';
    }
    return null;
}

function buildPopupContent(props) {
    var content = '<div class="popup-card card border-0">';
    content += '<div class="card-body p-2">';

    if (props.postDate) {
        content += '<p class="card-text mb-1"><i class="bi bi-clock"></i> ' + escapeHtml(props.postDate) + '</p>';
    }
    if (props.description) {
        content += '<p class="card-text mb-1">' + escapeHtml(props.description) + '</p>';
    }

    var embedUrl = getThreadsEmbedUrl(props.photoUrl);
    if (embedUrl) {
        content += '<iframe src="' + embedUrl + '" width="320" height="400" frameborder="0" allowfullscreen style="border:none;max-width:100%;border-radius:8px;"></iframe>';
    }

    content += '<p class="card-text mb-1"><small class="text-muted">' + props.lat.toFixed(6) + ', ' + props.lon.toFixed(6) + '</small></p>';
    content += '</div>';

    content += '<div class="card-footer p-2 border-0" style="background:transparent;">';
    content += '<div class="d-grid gap-1">';
    content += '<button class="btn btn-nav btn-sm" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination=' + props.lat + ',' + props.lon + '\', \'_blank\')"><i class="bi bi-sign-turn-right-fill"></i> Google Maps 導航</button>';
    content += '</div>';
    content += '</div>';
    content += '</div>';

    return content;
}

function addMarkersFromCSV() {
    Papa.parse(mainDataUrl, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function (results) {
            for (var i = 1; i < results.data.length; i++) {
                var row = results.data[i];
                var photoUrl = row[1];
                var postDate = row[2];
                var lat = parseFloat(row[3]);
                var lon = parseFloat(row[4]);
                var description = row[5];

                if (isNaN(lat) || isNaN(lon)) continue;

                (function () {
                    var props = {
                        photoUrl: photoUrl,
                        postDate: postDate,
                        lat: lat,
                        lon: lon,
                        description: description
                    };

                    var marker = L.marker([lat, lon], { icon: createMarkerIcon() });
                    marker.bindPopup(function () {
                        return buildPopupContent(props);
                    }, { maxWidth: 350, minWidth: 320 });
                    marker.properties = props;
                    allMarkers.push(marker);
                    markerClusterGroup.addLayer(marker);
                })();
            }

            if (window.location.hash) {
                var idx = parseInt(window.location.hash.replace('#point/', ''), 10);
                if (!isNaN(idx) && idx >= 0 && idx < allMarkers.length) {
                    var m = allMarkers[idx];
                    map.setView(m.getLatLng(), 15);
                    markerClusterGroup.zoomToShowLayer(m, function () {
                        m.openPopup();
                    });
                }
            }
        },
        error: function (error) {
            console.error('Error fetching CSV:', error);
        }
    });
}

function filterMarkers() {
    var filterValue = document.getElementById('filter-input').value.toLowerCase();
    markerClusterGroup.clearLayers();

    allMarkers.forEach(function (marker) {
        var props = marker.properties;
        var searchStr = ((props.description || '') + ' ' + (props.postDate || '')).toLowerCase();
        if (searchStr.includes(filterValue)) {
            markerClusterGroup.addLayer(marker);
        }
    });
}

function initMap() {
    map = L.map('map', {
        center: [23.0, 120.3],
        zoom: 10,
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
                html: '<div style="background:linear-gradient(135deg,#dc3545,#fd7e14);color:#fff;border-radius:50%;width:' + size + 'px;height:' + size + 'px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid #fff;box-shadow:0 3px 8px rgba(44,24,16,0.35);">' + count + '</div>',
                className: '',
                iconSize: [size, size]
            });
        }
    });
    map.addLayer(markerClusterGroup);

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

    document.getElementById('filter-input').addEventListener('input', filterMarkers);

    addMarkersFromCSV();
}

window.onload = initMap;
