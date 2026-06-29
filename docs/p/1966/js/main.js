(function () {
  var map = L.map('map', { preferCanvas: true, zoomControl: false }).setView([23.7, 121.0], 7);
  L.control.zoom({ position: 'topright' }).addTo(map);

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
  var cityData = {};
  var markers = [];
  var highlightedZones = [];
  var activeMarker = null;
  var activeOverlay = null;
  var bedsOnly = false;
  var punishmentMap = {};

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
  var cityCenters = {};
  var userLocationMarker = null;

  var defaultStyle = {
    weight: 1,
    color: '#999',
    fillColor: 'transparent',
    fillOpacity: 0
  };

  var highlightStyle = {
    weight: 2.5,
    color: '#1e8449',
    fillColor: '#27ae60',
    fillOpacity: 0.2
  };

  function makeIcon(abc, active, avail, punished) {
    var color = abcColors[abc] || '#888';
    var size = active ? 24 : 14;
    var cls = active ? 'circle-marker active' : 'circle-marker';
    if (punished) cls += ' punished';
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
        var cityBounds = {};
        townLayer = L.geoJSON(geojson, {
          style: defaultStyle,
          interactive: false,
          onEachFeature: function (feature, layer) {
            var p = feature.properties;
            townMap[p.TOWNCODE] = layer;
            if (!cityNames[p.COUNTYCODE]) {
              cityNames[p.COUNTYCODE] = p.COUNTYNAME;
            }
            if (!cityBounds[p.COUNTYCODE]) {
              cityBounds[p.COUNTYCODE] = L.latLngBounds([]);
            }
            cityBounds[p.COUNTYCODE].extend(layer.getBounds());
          }
        }).addTo(map);
        for (var code in cityBounds) {
          cityCenters[code] = cityBounds[code].getCenter();
        }
      });
  }

  function loadPunishment() {
    return fetch('data/punishment.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data.forEach(function (rec) {
          punishmentMap[rec.name] = rec.punishments;
        });
      });
  }

  function loadCityData(cityCode) {
    if (cityData[cityCode]) return Promise.resolve(cityData[cityCode]);
    return fetch('data/county/' + cityCode + '.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data.forEach(function (d) {
          for (var pname in punishmentMap) {
            if (d.name.indexOf(pname) !== -1) {
              d._punishments = punishmentMap[pname];
              break;
            }
          }
        });
        cityData[cityCode] = data;
        return data;
      });
  }

  function getCheckedCities() {
    var boxes = document.querySelectorAll('input[name="city"]');
    var vals = [];
    boxes.forEach(function (b) { if (b.checked) vals.push(b.value); });
    return vals;
  }

  function buildCityFilter(sortByDistanceFrom) {
    var container = document.getElementById('city-filter');
    container.innerHTML = '';
    var codes = Object.keys(cityNames);
    if (sortByDistanceFrom) {
      var refLat = sortByDistanceFrom.lat;
      var refLng = sortByDistanceFrom.lng;
      codes.sort(function (a, b) {
        var ca = cityCenters[a], cb = cityCenters[b];
        if (!ca || !cb) return 0;
        var da = (ca.lat - refLat) * (ca.lat - refLat) + (ca.lng - refLng) * (ca.lng - refLng);
        var db = (cb.lat - refLat) * (cb.lat - refLat) + (cb.lng - refLng) * (cb.lng - refLng);
        return da - db;
      });
    } else {
      codes.sort(function (a, b) {
        return cityNames[a].localeCompare(cityNames[b], 'zh-TW');
      });
    }
    codes.forEach(function (code) {
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'city';
      cb.value = code;
      cb.addEventListener('change', onCityChange);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + cityNames[code]));
      container.appendChild(label);
    });
  }

  function onCityChange() {
    var cities = getCheckedCities();
    if (!cities.length) {
      markerCluster.clearLayers();
      markers = [];
      document.getElementById('stats').innerHTML = '請先選擇縣市';
      return;
    }
    applyFilters();

    if (townLayer) {
      var bounds = L.latLngBounds([]);
      cities.forEach(function (code) {
        townLayer.eachLayer(function (layer) {
          if (layer.feature.properties.COUNTYCODE === code) {
            bounds.extend(layer.getBounds());
          }
        });
      });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  function getCheckedABC() {
    var boxes = document.querySelectorAll('input[name="abc"]');
    var vals = [];
    boxes.forEach(function (b) { if (b.checked) vals.push(b.value); });
    return vals;
  }

  function applyFilters() {
    var cities = getCheckedCities();

    if (!cities.length) {
      markerCluster.clearLayers();
      markers = [];
      document.getElementById('stats').innerHTML = '請先選擇縣市';
      return;
    }

    Promise.all(cities.map(function (c) { return loadCityData(c); }))
      .then(function (arrays) {
        var allData = [];
        arrays.forEach(function (arr) { allData = allData.concat(arr); });
        renderPoints(allData);
      });
  }

  function renderPoints(data) {
    var abcVals = getCheckedABC();
    var typeVal = document.getElementById('type-filter').value;
    var keyword = document.getElementById('keyword').value.trim().toLowerCase();

    markerCluster.clearLayers();
    markers = [];

    var counts = { A: 0, B: 0, C: 0 };
    var total = 0;

    data.forEach(function (d) {
      if (abcVals.length && abcVals.indexOf(d.abc) === -1) return;
      if (typeVal) {
        if (typeVal.length === 1 && /^[AB]$/.test(typeVal)) {
          if (d.type.charAt(0) !== typeVal) return;
        } else if (d.type !== typeVal) return;
      }
      if (keyword && d.name.toLowerCase().indexOf(keyword) === -1) return;
      if (bedsOnly && !d.beds) return;

      var avail = (d.beds && d.beds > 0) ? d.beds - (d.residents || 0) : undefined;
      var punished = !!d._punishments;
      var marker = L.marker([d.lat, d.lng], { icon: makeIcon(d.abc, false, avail, punished) });
      marker._pointData = d;
      marker.on('click', function () { showDetail(d, marker); });
      markers.push(marker);

      if (counts[d.abc] !== undefined) counts[d.abc]++;
      total++;
    });

    markerCluster.addLayers(markers);
    updateStats(total, counts);

    if (keyword && total > 0 && window.innerWidth <= 768) {
      closeSidebar();
    }
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
      var punished = !!d._punishments;
      activeOverlay = L.marker([d.lat, d.lng], {
        icon: makeIcon(d.abc, true, avail, punished),
        zIndexOffset: 2000
      }).addTo(map);
    }

    document.getElementById('detail').classList.remove('hidden');
    document.getElementById('detail-name').textContent = d.name;

    var html = '';
    if (d.phone) {
      html += '<div class="detail-phone"><a href="tel:' + escapeHtml(d.phone) + '">' + escapeHtml(d.phone) + '</a></div>';
    }
    var navName = encodeURIComponent(d.name);
    html += '<div class="detail-nav">';
    html += '<a class="nav-btn" href="https://www.google.com/maps/dir/?api=1&destination=' + d.lat + ',' + d.lng + '&destination_place_id=' + navName + '" target="_blank">Google 地圖</a>';
    html += '<a class="nav-btn" href="https://www.bing.com/maps?rtp=~pos.' + d.lat + '_' + d.lng + '_' + navName + '" target="_blank">Bing 地圖</a>';
    html += '<a class="nav-btn" href="https://wego.here.com/directions/drive/mylocation/' + d.lat + ',' + d.lng + '," target="_blank">HERE 地圖</a>';
    html += '</div>';
    html += '<div><span class="label">地址:</span>' + escapeHtml(d.addr) + '</div>';
    html += '<div><span class="label">服務類型:</span>' + d.abc + ' - ' + (abcLabels[d.abc] || '') + '</div>';
    html += '<div><span class="label">機構種類:</span>' + (typeLabels[d.type] || d.type) + '</div>';
    html += '<div><span class="label">服務項目:</span>' + escapeHtml(d.service) + '</div>';
    if (d.owner) html += '<div><span class="label">負責人:</span>' + escapeHtml(d.owner) + '</div>';
    if (d.start) html += '<div><span class="label">特約期間:</span>' + d.start + ' ~ ' + d.end + '</div>';
    if (d.beds) html += '<div><span class="label">開放床數:</span>' + d.beds + '</div>';
    if (d.residents) html += '<div><span class="label">現有住民:</span>' + d.residents + '</div>';

    if (d._punishments) {
      html += '<div class="punishment-info">';
      html += '<span class="label punishment-label">裁罰紀錄 (' + d._punishments.length + '筆):</span>';
      d._punishments.forEach(function (p) {
        html += '<div class="punishment-item">';
        html += '<div>' + escapeHtml(p.date) + ' 罰鍰 ' + escapeHtml(p.fine) + '</div>';
        if (p.reason) html += '<div class="punishment-reason">' + escapeHtml(p.reason) + '</div>';
        if (p.law) html += '<div class="punishment-law">' + escapeHtml(p.law) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

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

    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.add('open');
      var detailEl = document.getElementById('detail');
      setTimeout(function () { detailEl.scrollIntoView({ behavior: 'smooth' }); }, 100);
    }
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

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
  }

  map.on('click', function () {
    clearHighlight();
    document.getElementById('detail').classList.add('hidden');
    closeSidebar();
  });

  document.querySelectorAll('input[name="abc"]').forEach(function (el) {
    el.addEventListener('change', applyFilters);
  });
  document.getElementById('type-filter').addEventListener('change', applyFilters);

  var keywordTimer;
  document.getElementById('keyword').addEventListener('input', function () {
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(applyFilters, 300);
  });

  document.getElementById('sidebar-toggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('sidebar-overlay').addEventListener('click', function () {
    closeSidebar();
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

  function setCityChecked(code, checked) {
    var cb = document.querySelector('input[name="city"][value="' + code + '"]');
    if (cb && cb.checked !== checked) {
      cb.checked = checked;
    }
  }

  function sortCityFilterByDistance(lat, lng) {
    var checked = getCheckedCities();
    buildCityFilter({ lat: lat, lng: lng });
    checked.forEach(function (code) { setCityChecked(code, true); });
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
      sortCityFilterByDistance(lat, lng);

      var county = findCountyAtPoint(lat, lng);
      if (county) {
        setCityChecked(county, true);
        applyFilters();
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

      sortCityFilterByDistance(lat, lng);

      var county = findCountyAtPoint(lat, lng);
      if (county) {
        setCityChecked(county, true);
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

  document.getElementById('find-beds-btn').addEventListener('click', function () {
    bedsOnly = !bedsOnly;
    this.classList.toggle('active', bedsOnly);
    this.textContent = bedsOnly ? '顯示全部' : '找床位';
    applyFilters();
  });

  document.getElementById('geolocate-btn').addEventListener('click', goToUserLocation);

  Promise.all([loadTopoJSON(), loadPunishment()]).then(function () {
    buildCityFilter();
    autoLocate();
  });
})();
