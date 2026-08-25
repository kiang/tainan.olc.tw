var map = L.map('map', {
  center: [23.0, 120.3],
  zoom: 11
});

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
  attribution: '&copy; 內政部國土測繪中心 | <a href="https://tainan.olc.tw" target="_blank">江明宗</a>',
  maxZoom: 20
}).addTo(map);

var districtIndex = [];
var loadedDistricts = {};
var geoLayer = L.geoJSON(null, {
  style: function () {
    return {
      color: '#1a5276',
      weight: 1,
      fillColor: '#3498db',
      fillOpacity: 0.35
    };
  },
  onEachFeature: function (feature, layer) {
    layer.on('click', function () {
      showInfo(feature.properties);
      highlightFeature(layer);
    });
  }
}).addTo(map);

var highlightedLayer = null;

function highlightFeature(layer) {
  if (highlightedLayer) {
    geoLayer.resetStyle(highlightedLayer);
  }
  layer.setStyle({
    color: '#e74c3c',
    weight: 3,
    fillColor: '#e74c3c',
    fillOpacity: 0.45
  });
  highlightedLayer = layer;
}

function formatArea(sqm) {
  if (sqm >= 10000) {
    return (sqm / 10000).toFixed(2) + ' 公頃';
  }
  return sqm.toFixed(0) + ' m²';
}

function showInfo(props) {
  var info = document.getElementById('info');
  var html = '<h3>' + (props.sect_name || props.id) + '</h3>';
  if (props.district) {
    html += '<div><span class="label">行政區：</span>' + props.city + props.district + '</div>';
  }
  html += '<div><span class="label">段代碼：</span>' + (props.sect_code || props.id) + '</div>';
  html += '<div><span class="label">面積：</span>' + formatArea(props.total_area) + '</div>';
  html += '<div><span class="label">筆數：</span>' + props.parcels + '</div>';
  if (props.managers) {
    html += '<div><span class="label">管理者：</span>' + props.managers + '</div>';
  }
  info.innerHTML = html;
  info.classList.add('active');
}

function loadDistrict(name, callback) {
  if (loadedDistricts[name]) {
    if (callback) callback();
    return;
  }
  loadedDistricts[name] = 'loading';
  fetch('json/' + encodeURIComponent(name) + '.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      geoLayer.addData(data);
      loadedDistricts[name] = 'loaded';
      if (callback) callback();
    })
    .catch(function () {
      loadedDistricts[name] = null;
    });
}

function loadVisibleDistricts() {
  var bounds = map.getBounds();
  districtIndex.forEach(function (d) {
    var bbox = d.bbox;
    var dBounds = L.latLngBounds(
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]]
    );
    if (bounds.intersects(dBounds)) {
      loadDistrict(d.district);
    }
  });
}

function renderDistrictList() {
  var container = document.getElementById('district-list');
  var html = '<h3>行政區</h3>';
  districtIndex.forEach(function (d) {
    html += '<div class="district-item" data-district="' + d.district + '">';
    html += '<span class="name">' + d.district + '</span>';
    html += '<span class="count">' + d.sections + ' 段</span>';
    html += '</div>';
  });
  container.innerHTML = html;

  container.querySelectorAll('.district-item').forEach(function (el) {
    el.addEventListener('click', function () {
      var name = this.dataset.district;
      var d = districtIndex.find(function (x) { return x.district === name; });
      if (!d) return;
      container.querySelectorAll('.district-item').forEach(function (e) {
        e.classList.remove('active');
      });
      this.classList.add('active');
      var bbox = d.bbox;
      map.fitBounds([
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]]
      ], { padding: [20, 20] });
      loadDistrict(name);
    });
  });
}

var sidebarEl = document.getElementById('sidebar');
document.getElementById('sidebar-toggle').addEventListener('click', function () {
  sidebarEl.classList.toggle('collapsed');
  setTimeout(function () { map.invalidateSize(); }, 350);
});

fetch('json/index.json')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    districtIndex = data;
    var totalSections = data.reduce(function (s, d) { return s + d.sections; }, 0);
    var totalArea = data.reduce(function (s, d) { return s + d.total_area; }, 0);
    document.getElementById('stats').innerHTML =
      data.length + ' 個行政區 / ' + totalSections + ' 個地段 / ' + formatArea(totalArea);
    renderDistrictList();
    loadVisibleDistricts();
  });

map.on('moveend', loadVisibleDistricts);
