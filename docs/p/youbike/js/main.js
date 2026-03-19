// Initialize map
var map = L.map('map', {
  center: [23.000694, 120.221507],
  zoom: 13,
  zoomControl: true
});

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
}).addTo(map);

// Cycling paths
var linesLayer = null;

fetch('https://kiang.github.io/traffic.tainan.gov.tw/bike/lines.json')
  .then(function (r) { return r.json(); })
  .then(function (geojson) {
    linesLayer = L.geoJSON(geojson, {
      style: { color: '#e65100', weight: 5, opacity: 0.8, dashArray: '10 6' }
    }).addTo(map);
  })
  .catch(function (err) { console.error('Failed to load cycling paths:', err); });

// Station markers with clustering
var stationsLayer = L.markerClusterGroup({
  maxClusterRadius: 50,
  disableClusteringAtZoom: 16,
  spiderfyOnMaxZoom: false,
  showCoverageOnHover: false
}).addTo(map);
var labelMarkers = [];

function createStationIcon() {
  // Bicycle icon for YouBike stations
  return L.divIcon({
    className: '',
    html: '<svg width="32" height="32" viewBox="0 0 32 32">' +
      '<circle cx="16" cy="16" r="15" fill="#f9a825" stroke="#fff" stroke-width="2"/>' +
      '<g transform="translate(6,7) scale(0.8)">' +
      '<circle cx="5" cy="14" r="4" fill="none" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="20" cy="14" r="4" fill="none" stroke="#fff" stroke-width="2"/>' +
      '<path d="M5 14 L10 5 L15 5 M10 5 L13 14 L20 14 M13 14 L17 5 L20 5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</g></svg>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

function showPanel(name, address, capacity, lat, lon) {
  var panel = document.getElementById('bottomPanel');
  var overlay = document.getElementById('panelOverlay');

  document.getElementById('panelTitle').textContent = name;

  var html = '<div class="info-row"><span class="info-label">地址</span><span class="info-value">' + (address || '-') + '</span></div>' +
    '<div class="info-row"><span class="info-label">車位數</span><span class="info-value">' + capacity + '</span></div>' +
    '<div class="nav-buttons">' +
    '<a class="nav-btn" href="https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon + '&travelmode=walking" target="_blank">Google 導航</a>' +
    '<a class="nav-btn" href="https://wego.here.com/directions/drive/mylocation/' + lat + ',' + lon + '" target="_blank">Here WeGo 導航</a>' +
    '</div>';

  document.getElementById('panelBody').innerHTML = html;
  panel.classList.add('show');
  overlay.classList.add('show');
}

function hidePanel() {
  document.getElementById('bottomPanel').classList.remove('show');
  document.getElementById('panelOverlay').classList.remove('show');
}

document.getElementById('panelClose').addEventListener('click', hidePanel);
document.getElementById('panelOverlay').addEventListener('click', hidePanel);

// Load stations from TDX
fetch('https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Tainan?%24format=JSON')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    data.forEach(function (station) {
      var lat = station.StationPosition.PositionLat;
      var lon = station.StationPosition.PositionLon;
      var name = station.StationName.Zh_tw;
      var address = station.StationAddress.Zh_tw;
      var capacity = station.BikesCapacity;

      var marker = L.marker([lat, lon], { icon: createStationIcon() });
      marker.stationData = { name: name, address: address, capacity: capacity, lat: lat, lon: lon };

      marker.on('click', function () {
        var d = this.stationData;
        showPanel(d.name, d.address, d.capacity, d.lat, d.lon);
      });

      stationsLayer.addLayer(marker);
    });

    updateLabels();
  })
  .catch(function (err) { console.error('Failed to load stations:', err); });

// Show capacity labels when zoomed in
function updateLabels() {
  // Remove old labels
  labelMarkers.forEach(function (m) { map.removeLayer(m); });
  labelMarkers = [];

  if (map.getZoom() < 15) return;

  stationsLayer.eachLayer(function (marker) {
    if (!marker.stationData) return;
    var d = marker.stationData;
    var label = L.marker([d.lat, d.lon], {
      icon: L.divIcon({
        className: 'capacity-tooltip',
        html: d.capacity + '',
        iconSize: [30, 16],
        iconAnchor: [-2, 24]
      }),
      interactive: false
    }).addTo(map);
    labelMarkers.push(label);
  });
}

map.on('zoomend', updateLabels);

// Geolocation
var userMarker = null;
var locateBtn = document.getElementById('locateBtn');

locateBtn.addEventListener('click', function () {
  locateBtn.classList.add('tracking');
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
  locateBtn.classList.remove('tracking');
  alert('無法取得您的位置');
});
