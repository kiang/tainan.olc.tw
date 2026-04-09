// Dengue map - mobile-friendly refactor
var mapStyle = 'countBased';
var colorTable = {
    'countBased': [
        [5120, 'rgba(71,6,23,0.6)'],
        [2560, 'rgba(95,9,38,0.6)'],
        [1280, 'rgba(100,3,107,0.6)'],
        [640, 'rgba(117,0,139,0.6)'],
        [320, 'rgba(175,0,79,0.6)'],
        [160, 'rgba(210,26,52,0.6)'],
        [80, 'rgba(236,98,52,0.6)'],
        [40, 'rgba(255,161,51,0.6)'],
        [20, 'rgba(255,208,44,0.6)'],
        [10, 'rgba(255,251,38,0.6)'],
        [0, 'rgba(137,205,67,0.6)']
    ]
};

// State
var currentYear = new Date().getFullYear();
var currentSource = 'cunli';
var labelMarkers = [];
var dengue = {};
var areasLayer = null;

function getFillColor(villCode) {
    var color = 'rgba(200,200,200,0.5)';
    if (villCode && dengue[villCode] !== undefined) {
        var count = dengue[villCode].count !== undefined ? dengue[villCode].count : dengue[villCode];
        for (var i = 0; i < colorTable[mapStyle].length; i++) {
            var entry = colorTable[mapStyle][i];
            if (color === 'rgba(200,200,200,0.5)' && count > entry[0]) {
                color = entry[1];
            }
        }
    }
    return color;
}

// Initialize Leaflet map
var map = L.map('map', {
    center: [23.176082, 120.341986],
    zoom: 8
});

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; 國土測繪中心'
}).addTo(map);

function styleFeature(feature) {
    var p = feature.properties || {};
    var villCode = p.VILLCODE;
    var hasData = dengue[villCode] !== undefined && (dengue[villCode].count > 0 || dengue[villCode] > 0);
    return {
        color: hasData ? '#000' : 'transparent',
        weight: hasData ? 1 : 0,
        fillColor: getFillColor(villCode),
        fillOpacity: 1
    };
}

function onEachArea(feature, layer) {
    layer.on('click', function () {
        var p = feature.properties || {};
        var villCode = p.VILLCODE;
        var data = dengue[villCode];
        var html = '<table class="table table-striped mb-0">' +
            '<tr><th>村里</th><td>' + (p.COUNTYNAME || '') + (p.TOWNNAME || '') + (p.VILLNAME || '') + '</td></tr>';
        if (data !== undefined) {
            if (typeof data === 'object') {
                html += '<tr><th>確診數</th><td>' + data.count + '</td></tr>';
                html += '<tr><th>最後發病日</th><td>' + data.latest_sick_date + '</td></tr>';
            } else {
                html += '<tr><th>確診數</th><td>' + data + '</td></tr>';
            }
        }
        html += '</table>';
        layer.bindPopup(html, { maxWidth: 260 }).openPopup();
    });
    layer.on('mouseover', function () {
        var data = dengue[feature.properties.VILLCODE];
        if (data !== undefined && (data.count > 0 || data > 0)) {
            layer.setStyle({ weight: 2 });
        }
    });
    layer.on('mouseout', function () { layer.setStyle(styleFeature(feature)); });
}

function clearLabels() {
    for (var i = 0; i < labelMarkers.length; i++) {
        map.removeLayer(labelMarkers[i]);
    }
    labelMarkers = [];
}

function addLabels() {
    if (!areasLayer) return;
    areasLayer.eachLayer(function (layer) {
        var villCode = layer.feature.properties.VILLCODE;
        var data = dengue[villCode];
        if (data && (data.count > 0 || data > 0)) {
            var count = data.count !== undefined ? data.count : data;
            var center = layer.getBounds().getCenter();
            var labelMarker = L.circleMarker(center, {
                radius: 12,
                fillColor: '#000',
                color: '#fff',
                weight: 1,
                fillOpacity: 0.9,
                interactive: false
            });
            labelMarker.bindTooltip(count.toString(), {
                permanent: true,
                direction: 'center',
                className: 'count-tooltip',
                offset: [0, 0]
            });
            labelMarker.addTo(map);
            labelMarkers.push(labelMarker);
        }
    });
}

function refreshAreaStyles() {
    if (areasLayer) areasLayer.setStyle(styleFeature);
}

function fitMapToDataBounds() {
    if (areasLayer && Object.keys(dengue).length > 0) {
        var bounds = null;
        areasLayer.eachLayer(function (layer) {
            var villCode = layer.feature.properties.VILLCODE;
            if (dengue[villCode] && (dengue[villCode].count > 0 || dengue[villCode] > 0)) {
                if (!bounds) bounds = L.latLngBounds(layer.getBounds());
                else bounds.extend(layer.getBounds());
            }
        });
        if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Geolocation control (keep as Leaflet control — top-left zoom area)
var LocateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
        var btn = L.DomUtil.create('a', 'leaflet-bar-part');
        btn.href = '#';
        btn.title = '回到目前位置';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.width = '30px';
        btn.style.height = '30px';
        btn.style.backgroundColor = '#fff';
        btn.style.fontSize = '16px';
        btn.innerHTML = '⊕';
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.appendChild(btn);
        L.DomEvent.on(btn, 'click', function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            map.locate({ setView: true, maxZoom: 13, enableHighAccuracy: true });
        });
        return container;
    }
});
map.addControl(new LocateControl());

var userMarker = null, accuracyCircle = null;
map.on('locationfound', function (e) {
    if (accuracyCircle) map.removeLayer(accuracyCircle);
    if (userMarker) map.removeLayer(userMarker);
    accuracyCircle = L.circle(e.latlng, { radius: e.accuracy, color: '#3399CC', fillColor: '#3399CC', fillOpacity: 0.2 }).addTo(map);
    userMarker = L.circleMarker(e.latlng, { radius: 6, color: '#fff', weight: 2, fillColor: '#3399CC', fillOpacity: 1 }).addTo(map);
});
map.on('locationerror', function () { alert('目前使用的設備無法提供地理資訊'); });

// ── UI: fixed toolbar at bottom ──────────────────────────────────────────────
// Inject styles
var style = document.createElement('style');
style.textContent = [
    '#dengue-bar {',
    '  position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;',
    '  background: rgba(255,255,255,0.97);',
    '  border-top: 1px solid #ccc;',
    '  padding: 6px 8px;',
    '  display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;',
    '}',
    '#dengue-bar select { flex: 1; min-width: 0; font-size: 16px; }',
    '#dengue-bar .src-btn {',
    '  white-space: nowrap; font-size: 16px; padding: 6px 12px;',
    '  border-radius: 4px; border: 1px solid #aaa; cursor: pointer;',
    '  background: #f8f8f8; color: #333;',
    '}',
    '#dengue-bar .src-btn.active { background: #0056b3; color: #fff; border-color: #004085; }',
    '#dengue-bar .bar-btn {',
    '  white-space: nowrap; font-size: 16px; padding: 6px 12px;',
    '  border-radius: 4px; border: 1px solid #aaa; cursor: pointer;',
    '  background: #f8f8f8; color: #333;',
    '}',
    // legend panel
    '#dengue-legend {',
    '  position: fixed; bottom: 58px; right: 8px; z-index: 1000;',
    '  background: rgba(255,255,255,0.97); border: 1px solid #ccc;',
    '  border-radius: 6px; padding: 10px; font-size: 15px; display: none;',
    '  max-height: 60vh; overflow-y: auto;',
    '}',
    '#dengue-legend table { border-collapse: collapse; margin-bottom: 6px; }',
    '#dengue-legend td { padding: 3px 6px; }',
    // menu panel
    '#dengue-menu {',
    '  position: fixed; bottom: 58px; right: 8px; z-index: 1000;',
    '  background: rgba(255,255,255,0.97); border: 1px solid #ccc;',
    '  border-radius: 6px; padding: 10px; font-size: 16px; display: none;',
    '  min-width: 200px;',
    '}',
    '#dengue-menu a { display: block; padding: 8px 12px; margin-bottom: 4px; border-radius: 4px; text-decoration: none; color: #fff; font-weight: 500; }',
    // push map up so bar doesn't overlap
    '#map { padding-bottom: 54px; box-sizing: border-box; }'
].join('\n');
document.head.appendChild(style);

// Build toolbar
var bar = document.createElement('div');
bar.id = 'dengue-bar';

// Year select
var yearSelect = document.createElement('select');
yearSelect.id = 'year-select';
for (var y = 2026; y >= 1998; y--) {
    var opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + ' 年';
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
}
bar.appendChild(yearSelect);

// Local button
var btnLocal = document.createElement('button');
btnLocal.className = 'src-btn active';
btnLocal.textContent = '本土';
bar.appendChild(btnLocal);

// Imported button
var btnImported = document.createElement('button');
btnImported.className = 'src-btn';
btnImported.textContent = '境外';
bar.appendChild(btnImported);

// Legend toggle
var btnLegend = document.createElement('button');
btnLegend.className = 'bar-btn';
btnLegend.textContent = '圖例';
bar.appendChild(btnLegend);

// Menu toggle
var btnMenu = document.createElement('button');
btnMenu.className = 'bar-btn';
btnMenu.textContent = '☰';
bar.appendChild(btnMenu);

document.body.appendChild(bar);

// Legend panel
var legendDiv = document.createElement('div');
legendDiv.id = 'dengue-legend';
var legendHtml = '<strong>確診數圖例</strong><table>';
for (var li = 0; li < colorTable[mapStyle].length; li++) {
    var le = colorTable[mapStyle][li];
    legendHtml += '<tr><td style="background:' + le[1] + ';width:20px;height:14px"></td><td>&gt; ' + le[0] + '</td></tr>';
}
legendHtml += '</table><small>資料來源：<br>' +
    '<a href="https://data.gov.tw/dataset/21025" target="_blank">登革熱確定病例統計</a><br>' +
    '<a href="https://data.gov.tw/dataset/7438" target="_blank">村里界圖</a></small>';
legendDiv.innerHTML = legendHtml;
document.body.appendChild(legendDiv);

// Menu panel
var menuDiv = document.createElement('div');
menuDiv.id = 'dengue-menu';
menuDiv.innerHTML =
    '<a href="https://github.com/kiang/tainan.olc.tw/issues" target="_blank" style="background:#0056b3">網站問題反應</a>' +
    '<a href="https://kiang.github.io/ovitrap/" target="_blank" style="background:#5a6268">病媒蚊監控地圖</a>' +
    '<a href="https://facebook.com/k.olc.tw/" target="_blank" style="background:#3b5998">江明宗 製作</a>' +
    '<a href="https://github.com/kiang/tainan.olc.tw" target="_blank" style="background:#212529">原始碼</a>';
document.body.appendChild(menuDiv);

// Panel toggle helpers
function closeAll() {
    legendDiv.style.display = 'none';
    menuDiv.style.display = 'none';
}

btnLegend.addEventListener('click', function (e) {
    e.stopPropagation();
    var shown = legendDiv.style.display === 'block';
    closeAll();
    if (!shown) legendDiv.style.display = 'block';
});

btnMenu.addEventListener('click', function (e) {
    e.stopPropagation();
    var shown = menuDiv.style.display === 'block';
    closeAll();
    if (!shown) menuDiv.style.display = 'block';
});

document.addEventListener('click', function () { closeAll(); });
legendDiv.addEventListener('click', function (e) { e.stopPropagation(); });
menuDiv.addEventListener('click', function (e) { e.stopPropagation(); });

// Source toggle
function setSource(src) {
    currentSource = src;
    if (src === 'cunli') {
        btnLocal.classList.add('active');
        btnImported.classList.remove('active');
    } else {
        btnImported.classList.add('active');
        btnLocal.classList.remove('active');
    }
    loadData();
}

btnLocal.addEventListener('click', function () { if (currentSource !== 'cunli') setSource('cunli'); });
btnImported.addEventListener('click', function () { if (currentSource !== 'cunli_imported') setSource('cunli_imported'); });

yearSelect.addEventListener('change', function () {
    currentYear = parseInt(this.value);
    loadData();
});

// ── Data loading ──────────────────────────────────────────────────────────────
function loadData() {
    var url = 'https://kiang.github.io/dengue/daily/' + currentYear + '/' + currentSource + '.json';
    $.getJSON(url, {}, function (data) {
        dengue = Array.isArray(data) ? {} : data;
        clearLabels();
        refreshAreaStyles();
        addLabels();
        fitMapToDataBounds();
        var sourceLabel = currentSource === 'cunli' ? '本土病例' : '境外移入';
        document.title = '台灣登革熱' + sourceLabel + '地圖 - ' + currentYear + '年';
    }).fail(function () {
        dengue = {};
        clearLabels();
        refreshAreaStyles();
    });
}

fetch('https://kiang.github.io/taiwan_basecode/cunli/s_geo/20250620.json')
    .then(function (r) { return r.json(); })
    .then(function (geojson) {
        areasLayer = L.geoJSON(geojson, {
            style: styleFeature,
            onEachFeature: onEachArea
        }).addTo(map);
        loadData();
    });
