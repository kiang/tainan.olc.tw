var marketLatLng = [23.184943, 120.248485];

var map = L.map('map', {
  center: marketLatLng,
  zoom: 16,
  zoomControl: true
});

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
}).addTo(map);

var marketIcon = L.divIcon({
  className: 'market-marker',
  html: '<svg width="40" height="40" viewBox="0 0 40 40">' +
    '<circle cx="20" cy="20" r="18" fill="#b71c1c" stroke="#fff" stroke-width="3"/>' +
    '<text x="20" y="26" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">&#10006;</text>' +
    '</svg>',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

L.marker(marketLatLng, { icon: marketIcon })
  .addTo(map)
  .bindPopup('<strong>麻豆中央市場（已關閉）</strong>');

var categoryStyles = {
  '小吃':  { color: '#e65100', emoji: '🍜' },
  '飲料':  { color: '#00838f', emoji: '☕' },
  '蔬果':  { color: '#2e7d32', emoji: '🥬' },
  '生鮮':  { color: '#1565c0', emoji: '🐟' },
  '百貨':  { color: '#6a1b9a', emoji: '🏪' },
  '服務':  { color: '#ad1457', emoji: '✂️' }
};
var defaultStyle = { color: '#757575', emoji: '📍' };

function createShopIcon(category) {
  var s = categoryStyles[category] || defaultStyle;
  return L.divIcon({
    className: 'market-marker',
    html: '<svg width="32" height="32" viewBox="0 0 32 32">' +
      '<circle cx="16" cy="16" r="14" fill="' + s.color + '" stroke="#fff" stroke-width="2"/>' +
      '<text x="16" y="22" text-anchor="middle" font-size="16">' + s.emoji + '</text>' +
      '</svg>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

var clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 40,
  disableClusteringAtZoom: 17,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false
}).addTo(map);

var allPoints = [];
var activeCategory = null;

function showPanel(point) {
  var panel = document.getElementById('bottomPanel');
  var overlay = document.getElementById('panelOverlay');

  document.getElementById('panelTitle').textContent = point.name;

  var rows = '';
  if (point.category) rows += '<div class="info-row"><span class="info-label">分類</span><span class="info-value">' + point.category + '</span></div>';
  if (point.oldLocation) rows += '<div class="info-row"><span class="info-label">原攤位</span><span class="info-value">' + point.oldLocation + '</span></div>';
  if (point.address) rows += '<div class="info-row"><span class="info-label">新地址</span><span class="info-value">' + point.address + '</span></div>';
  if (point.phone) rows += '<div class="info-row"><span class="info-label">電話</span><span class="info-value"><a href="tel:' + point.phone + '">' + point.phone + '</a></span></div>';
  if (point.note) rows += '<div class="info-row"><span class="info-label">備註</span><span class="info-value">' + point.note + '</span></div>';
  if (point.updated) rows += '<div class="info-row"><span class="info-label">更新日期</span><span class="info-value">' + point.updated + '</span></div>';

  rows += '<div class="nav-buttons">' +
    '<a class="nav-btn" href="https://www.google.com/maps/dir/?api=1&destination=' + point.lat + ',' + point.lng + '&travelmode=walking" target="_blank">Google 導航</a>' +
    '<a class="nav-btn" href="https://wego.here.com/directions/drive/mylocation/' + point.lat + ',' + point.lng + '" target="_blank">Here WeGo 導航</a>' +
    '</div>';

  document.getElementById('panelBody').innerHTML = rows;
  panel.classList.add('show');
  overlay.classList.add('show');
}

function hidePanel() {
  document.getElementById('bottomPanel').classList.remove('show');
  document.getElementById('panelOverlay').classList.remove('show');
}

document.getElementById('panelClose').addEventListener('click', hidePanel);
document.getElementById('panelOverlay').addEventListener('click', hidePanel);

function renderMarkers(category) {
  clusterGroup.clearLayers();
  allPoints.forEach(function (point) {
    if (category && point.category !== category) return;
    var marker = L.marker([point.lat, point.lng], { icon: createShopIcon(point.category) });
    marker.on('click', function () {
      showPanel(point);
    });
    clusterGroup.addLayer(marker);
  });
}

function buildFilters(points) {
  var categories = {};
  points.forEach(function (p) {
    if (p.category) categories[p.category] = (categories[p.category] || 0) + 1;
  });

  var bar = document.getElementById('filterBar');
  if (Object.keys(categories).length < 2) return;

  var allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = '全部 (' + points.length + ')';
  allBtn.addEventListener('click', function () {
    activeCategory = null;
    renderMarkers(null);
    updateFilterButtons();
  });
  bar.appendChild(allBtn);

  Object.keys(categories).sort().forEach(function (cat) {
    var btn = document.createElement('button');
    btn.className = 'filter-btn';
    var cs = categoryStyles[cat] || defaultStyle;
    btn.innerHTML = cs.emoji + ' ' + cat + ' (' + categories[cat] + ')';
    btn.dataset.category = cat;
    btn.addEventListener('click', function () {
      activeCategory = cat;
      renderMarkers(cat);
      updateFilterButtons();
    });
    bar.appendChild(btn);
  });
}

function updateFilterButtons() {
  var buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(function (btn) {
    if (!activeCategory && !btn.dataset.category) {
      btn.classList.add('active');
    } else if (btn.dataset.category === activeCategory) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

fetch('points.json')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    allPoints = data;
    buildFilters(data);
    renderMarkers(null);
  })
  .catch(function (err) { console.error('Failed to load points:', err); });

var userMarker = null;
var locateBtn = document.getElementById('locateBtn');

locateBtn.addEventListener('click', function () {
  locateBtn.classList.add('tracking');
  map.locate({ setView: true, maxZoom: 17 });
});

map.on('locationfound', function (e) {
  locateBtn.classList.remove('tracking');
  if (userMarker) {
    userMarker.setLatLng(e.latlng);
  } else {
    userMarker = L.circleMarker(e.latlng, {
      radius: 8, fillColor: '#3399CC', color: '#fff', weight: 3, fillOpacity: 1
    }).addTo(map);
  }
});

map.on('locationerror', function () {
  locateBtn.classList.remove('tracking');
  alert('無法取得您的位置');
});
