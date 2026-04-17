var stateData = {
  'Arunachal Pradesh': {zh:'阿魯納恰爾邦',anchor:'arunachal',rec:false,badge:'日出之邦',pop:'1,383,727',area:'83,743 km²'},
  'Assam': {zh:'阿薩姆邦',anchor:'assam',rec:false,badge:'犀牛與茶葉之邦',pop:'31,205,576',area:'78,438 km²'},
  'Nagaland': {zh:'那加蘭邦',anchor:'nagaland',rec:false,badge:'犀鳥節之邦',pop:'1,978,502',area:'16,579 km²'},
  'Meghalaya': {zh:'梅加拉亞邦',anchor:'meghalaya',rec:true,badge:'推薦',pop:'3,000,000',area:'22,429 km²'},
  'Manipur': {zh:'曼尼普爾邦',anchor:'manipur',rec:false,badge:'印度的明珠',pop:'2,855,794',area:'22,327 km²'},
  'Tripura': {zh:'特里普拉邦',anchor:'tripura',rec:true,badge:'推薦',pop:'4,222,000',area:'10,492 km²'},
  'Mizoram': {zh:'米佐拉姆邦',anchor:'mizoram',rec:true,badge:'推薦',pop:'1,264,000',area:'21,081 km²'}
};

var geojsonCache = null;

function getStateStyle(name) {
  var info = stateData[name];
  return {
    fillColor: info && info.rec ? '#27ae60' : '#e74c3c',
    weight: 2,
    color: '#fff',
    fillOpacity: 0.5
  };
}

function loadGeoJSON() {
  if (geojsonCache) return Promise.resolve(geojsonCache);
  return fetch('ne_states.geojson').then(function(r) { return r.json(); }).then(function(data) {
    geojsonCache = data;
    return data;
  });
}

function initOverviewMap() {
  var map = L.map('map', {scrollWheelZoom: false}).setView([25.5, 93], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 12
  }).addTo(map);

  loadGeoJSON().then(function(geojson) {
    var geoLayer = L.geoJSON(geojson, {
      style: function(feature) { return getStateStyle(feature.properties.NAME_1); },
      onEachFeature: function(feature, layer) {
        var name = feature.properties.NAME_1;
        var info = stateData[name];
        if (!info) return;
        var badgeClass = info.rec ? 'pop-rec' : 'pop-not';
        layer.bindPopup(
          '<div class="state-popup">' +
          '<h3>' + info.zh + ' ' + name + '</h3>' +
          '<span class="pop-badge ' + badgeClass + '">' + info.badge + '</span>' +
          '<div style="margin-top:6px">' +
          '<div>人口：' + info.pop + '</div>' +
          '<div>面積：' + info.area + '</div>' +
          '</div>' +
          '<a href="#' + info.anchor + '" style="display:block;margin-top:8px">查看詳細資料 →</a>' +
          '</div>', {maxWidth: 260}
        );
        layer.on({
          mouseover: function(e) {
            e.target.setStyle({fillOpacity: 0.8, weight: 3});
            e.target.bringToFront();
          },
          mouseout: function(e) { geoLayer.resetStyle(e.target); },
          click: function(e) { map.fitBounds(e.target.getBounds(), {padding: [30, 30]}); }
        });
      }
    }).addTo(map);
    map.fitBounds(geoLayer.getBounds(), {padding: [20, 20]});

    var legend = L.control({position: 'bottomright'});
    legend.onAdd = function() {
      var div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = '<strong>圖例</strong><br><i style="background:#27ae60"></i> 推薦邦<br><i style="background:#e74c3c"></i> 不推薦邦';
      return div;
    };
    legend.addTo(map);
  });
}

function initStateMaps() {
  var mapElements = document.querySelectorAll('.state-map');
  loadGeoJSON().then(function(geojson) {
    mapElements.forEach(function(el) {
      var stateName = el.getAttribute('data-state');
      if (!stateName) return;

      var stateFeature = null;
      for (var i = 0; i < geojson.features.length; i++) {
        if (geojson.features[i].properties.NAME_1 === stateName) {
          stateFeature = geojson.features[i];
          break;
        }
      }
      if (!stateFeature) return;

      var miniMap = L.map(el, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 12
      }).addTo(miniMap);

      var allLayer = L.geoJSON(geojson, {
        style: function() {
          return {fillColor: '#ccc', weight: 1, color: '#999', fillOpacity: 0.3};
        }
      }).addTo(miniMap);

      L.geoJSON(stateFeature, {
        style: function() { return getStateStyle(stateName); }
      }).addTo(miniMap);

      miniMap.fitBounds(L.geoJSON(stateFeature).getBounds(), {padding: [15, 15]});
    });
  });
}

// Nav active state observer
var navLinks = document.querySelectorAll('.nav a');
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) {
      var id = e.target.id;
      navLinks.forEach(function(l) {
        l.classList.toggle('active', l.getAttribute('href') === '#' + id);
      });
    }
  });
}, {threshold: 0.2, rootMargin: '-70px 0px -40% 0px'});
document.querySelectorAll('section[id]').forEach(function(s) { observer.observe(s); });

// Initialize maps
initOverviewMap();
initStateMaps();
