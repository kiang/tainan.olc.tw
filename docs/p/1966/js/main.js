(function () {
  var map = L.map('map', { preferCanvas: true }).setView([23.7, 121.0], 7);

  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">NLSC</a>'
  }).addTo(map);

  var markerCluster = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50,
    disableClusteringAtZoom: 16
  });
  map.addLayer(markerCluster);

  var townLayer = null;
  var townMap = {};
  var allData = [];
  var markers = [];
  var highlightedZones = [];
  var activeMarker = null;
  var activeOverlay = null;

  var abcColors = { A: '#27ae60', B: '#2980b9', C: '#e67e22' };
  var abcLabels = { A: '個案管理服務', B: '直接照護服務', C: '巷弄長照站' };

  var typeLabels = {
    '1': '居家式', '2': '社區式', '3': '機構住宿式', '4': '綜合式',
    'A1': '老人長照中心', 'A2': '老人安養護機構', 'A3': '老人服務機構',
    'B1': '身障住宿機構', 'B2': '身障日間機構', 'B3': '身障家庭式機構',
    'B4': '身障社區式機構', 'B5': '身障輔具中心', 'B6': '身障居家式機構',
    'B7': '身障社區日間', 'B8': '身障日間照顧', 'B9': '身障臨時短托',
    'BA': '身障就業機構', 'BB': '日間照顧', 'BD': '身障社區居住',
    'BE': '身障家園', 'BF': '身障教養機構', 'BG': '身障庇護工場'
  };

  var cityNames = {};
  var userLocationMarker = null;

  var defaultStyle = {
    weight: 1,
    color: '#999',
    fillColor: 'transparent',
    fillOpacity: 0
  };

  var highlightStyle = {
    weight: 2.5,
    color: '#e74c3c',
    fillColor: '#f39c12',
    fillOpacity: 0.3
  };

  function makeIcon(abc, active, avail) {
    var color = abcColors[abc] || '#888';
    var size = active ? 24 : 14;
    var cls = active ? 'circle-marker active' : 'circle-marker';
    var html = '<div class="marker-wrap">';
    if (typeof avail === 'number') {
      html += '<span class="avail-badge">' + avail + '</span>';
    }
    html += '<div class="' + cls + '" style="background:' + color + '"></div></div>';
    var h = (typeof avail === 'number') ? size + 16 : size;
    return L.divIcon({
      className: '',
      html: html,
      iconSize: [Math.max(size, 28), h],
      iconAnchor: [Math.max(size, 28) / 2, h]
    });
  }

  function loadTopoJSON() {
    return fetch('https://kiang.github.io/taiwan_basecode/city/topo/20230317.json')
      .then(function (r) { return r.json(); })
      .then(function (topo) {
        var geojson = topojson.feature(topo, topo.objects['20230317']);
        townLayer = L.geoJSON(geojson, {
          style: defaultStyle,
          interactive: false,
          onEachFeature: function (feature, layer) {
            var p = feature.properties;
            townMap[p.TOWNCODE] = layer;
            if (!cityNames[p.COUNTYCODE]) {
              cityNames[p.COUNTYCODE] = p.COUNTYNAME;
            }
          }
        }).addTo(map);
      });
  }

  function loadPoints() {
    return fetch('data/points.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allData = data;
        buildCityFilter();
        applyFilters();
      });
  }

  function buildCityFilter() {
    var cities = {};
    allData.forEach(function (d) {
      if (d.city && !cities[d.city]) {
        cities[d.city] = cityNames[d.city] || d.city;
      }
    });
    var select = document.getElementById('city-filter');
    var sorted = Object.keys(cities).sort(function (a, b) {
      return cities[a].localeCompare(cities[b], 'zh-TW');
    });
    sorted.forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = cities[code];
      select.appendChild(opt);
    });
  }

  function getCheckedABC() {
    var boxes = document.querySelectorAll('input[name="abc"]');
    var vals = [];
    boxes.forEach(function (b) { if (b.checked) vals.push(b.value); });
    return vals;
  }

  function applyFilters() {
    var abcVals = getCheckedABC();
    var typeVal = document.getElementById('type-filter').value;
    var cityVal = document.getElementById('city-filter').value;
    var keyword = document.getElementById('keyword').value.trim().toLowerCase();

    markerCluster.clearLayers();
    markers = [];

    var counts = { A: 0, B: 0, C: 0 };
    var total = 0;

    allData.forEach(function (d) {
      if (abcVals.length && abcVals.indexOf(d.abc) === -1) return;
      if (typeVal) {
        if (typeVal.length === 1 && /^[AB]$/.test(typeVal)) {
          if (d.type.charAt(0) !== typeVal) return;
        } else if (d.type !== typeVal) return;
      }
      if (cityVal && d.city !== cityVal) return;
      if (keyword && d.name.toLowerCase().indexOf(keyword) === -1) return;

      var avail = (d.beds && d.beds > 0) ? d.beds - (d.residents || 0) : undefined;
      var marker = L.marker([d.lat, d.lng], { icon: makeIcon(d.abc, false, avail) });
      marker._pointData = d;
      marker.on('click', function () { showDetail(d, marker); });
      markers.push(marker);

      if (counts[d.abc] !== undefined) counts[d.abc]++;
      total++;
    });

    markerCluster.addLayers(markers);
    updateStats(total, counts);
  }

  function updateStats(total, counts) {
    document.getElementById('stats').innerHTML =
      '顯示 <strong>' + total.toLocaleString() + '</strong> 筆機構<br>' +
      '<span style="color:' + abcColors.A + '">●</span> A ' + counts.A.toLocaleString() + ' ' +
      '<span style="color:' + abcColors.B + '">●</span> B ' + counts.B.toLocaleString() + ' ' +
      '<span style="color:' + abcColors.C + '">●</span> C ' + counts.C.toLocaleString();
  }

  function showDetail(d, marker) {
    clearHighlight();

    if (marker) {
      activeMarker = marker;
      var avail = (d.beds && d.beds > 0) ? d.beds - (d.residents || 0) : undefined;
      activeOverlay = L.marker([d.lat, d.lng], {
        icon: makeIcon(d.abc, true, avail),
        zIndexOffset: 2000
      }).addTo(map);
    }

    document.getElementById('detail').classList.remove('hidden');
    document.getElementById('detail-name').textContent = d.name;

    var html = '';
    html += '<div><span class="label">地址:</span>' + escapeHtml(d.addr) + '</div>';
    html += '<div><span class="label">服務類型:</span>' + d.abc + ' - ' + (abcLabels[d.abc] || '') + '</div>';
    html += '<div><span class="label">機構種類:</span>' + (typeLabels[d.type] || d.type) + '</div>';
    html += '<div><span class="label">服務項目:</span>' + escapeHtml(d.service) + '</div>';
    if (d.phone) html += '<div><span class="label">電話:</span>' + escapeHtml(d.phone) + '</div>';
    if (d.owner) html += '<div><span class="label">負責人:</span>' + escapeHtml(d.owner) + '</div>';
    if (d.start) html += '<div><span class="label">特約期間:</span>' + d.start + ' ~ ' + d.end + '</div>';
    if (d.beds) html += '<div><span class="label">開放床數:</span>' + d.beds + '</div>';
    if (d.residents) html += '<div><span class="label">現有住民:</span>' + d.residents + '</div>';

    if (d.zones && d.zones.length) {
      var zoneNames = [];
      d.zones.forEach(function (code) {
        var layer = townMap[code];
        if (layer) {
          var p = layer.feature.properties;
          zoneNames.push(p.TOWNNAME);
          layer.setStyle(highlightStyle);
          layer.options.interactive = true;
          layer.bindTooltip(p.COUNTYNAME + p.TOWNNAME, { sticky: true });
          layer.bringToFront();
          highlightedZones.push(layer);
        }
      });
      html += '<div class="zones-info"><span class="label">特約涵蓋區域 (' + d.zones.length + '區):</span><br>' +
        escapeHtml(zoneNames.join('、')) + '</div>';
    }

    document.getElementById('detail-content').innerHTML = html;
  }

  function clearHighlight() {
    if (activeOverlay) {
      map.removeLayer(activeOverlay);
      activeOverlay = null;
      activeMarker = null;
    }
    highlightedZones.forEach(function (layer) {
      layer.setStyle(defaultStyle);
      layer.options.interactive = false;
      layer.unbindTooltip();
    });
    highlightedZones = [];
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  map.on('click', function () {
    clearHighlight();
    document.getElementById('detail').classList.add('hidden');
  });

  document.querySelectorAll('input[name="abc"]').forEach(function (el) {
    el.addEventListener('change', applyFilters);
  });
  document.getElementById('type-filter').addEventListener('change', applyFilters);
  document.getElementById('city-filter').addEventListener('change', function () {
    applyFilters();
    var code = this.value;
    if (code && townLayer) {
      var bounds = L.latLngBounds([]);
      townLayer.eachLayer(function (layer) {
        if (layer.feature.properties.COUNTYCODE === code) {
          bounds.extend(layer.getBounds());
        }
      });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    }
  });

  var keywordTimer;
  document.getElementById('keyword').addEventListener('input', function () {
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(applyFilters, 300);
  });

  document.getElementById('sidebar-toggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('open');
  });

  function findCountyAtPoint(lat, lng) {
    var pt = L.latLng(lat, lng);
    var found = null;
    if (townLayer) {
      townLayer.eachLayer(function (layer) {
        if (!found && layer.getBounds().contains(pt)) {
          var polys = layer.feature.geometry;
          if (leafletPip(polys, pt)) {
            found = layer.feature.properties.COUNTYCODE;
          }
        }
      });
    }
    return found;
  }

  function leafletPip(geometry, pt) {
    var coords = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
    for (var i = 0; i < coords.length; i++) {
      if (pointInPolygon(pt.lng, pt.lat, coords[i][0])) return true;
    }
    return false;
  }

  function pointInPolygon(x, y, ring) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1];
      var xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function goToUserLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;

      if (userLocationMarker) {
        userLocationMarker.setLatLng([lat, lng]);
      } else {
        userLocationMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: '<div class="user-location-marker"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 20]
          }),
          zIndexOffset: 2000
        }).addTo(map);
      }

      map.setView([lat, lng], 13);

      var county = findCountyAtPoint(lat, lng);
      if (county) {
        var select = document.getElementById('city-filter');
        if (select.value !== county) {
          select.value = county;
          applyFilters();
        }
      }
    });
  }

  function autoLocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;

      userLocationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: '<div class="user-location-marker"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        }),
        zIndexOffset: 2000
      }).addTo(map);

      var county = findCountyAtPoint(lat, lng);
      if (county) {
        var select = document.getElementById('city-filter');
        select.value = county;
        applyFilters();
        var bounds = L.latLngBounds([]);
        townLayer.eachLayer(function (layer) {
          if (layer.feature.properties.COUNTYCODE === county) {
            bounds.extend(layer.getBounds());
          }
        });
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      }
    });
  }

  document.getElementById('geolocate-btn').addEventListener('click', goToUserLocation);

  loadTopoJSON().then(function () {
    return loadPoints();
  }).then(function () {
    autoLocate();
  });
})();
