// Leaflet refactor for dengue map
// Colors and thresholds
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
var currentYear = 2025;
var currentSource = 'cunli'; // 'cunli' = local, 'cunli_imported' = imported
var labelMarkers = [];

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

// Base layer - NLSC map
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; 國土測繪中心'
}).addTo(map);

// Data containers
var dengue = {};
var areasLayer = null;
var geojsonCache = null;

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
        var hasData = data !== undefined && (data.count > 0 || data > 0);
        if (hasData) {
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
    areasLayer.eachLayer(function(layer) {
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
    if (areasLayer) {
        areasLayer.setStyle(styleFeature);
    }
}

// Legend + sources control
var LegendControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function () {
        var div = L.DomUtil.create('div', 'leaflet-control legend p-2');
        div.style.background = 'rgba(255,255,255,0.9)';
        div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        div.style.cursor = 'pointer';

        var header = '<div style="display: flex; justify-content: space-between; align-items: center;"><strong>圖例</strong><span id="legend-toggle" style="font-size: 12px;">▼</span></div>';
        var content = '<div id="legend-content"><table class="table table-sm table-striped mb-2">';
        for (var i = 0; i < colorTable[mapStyle].length; i++) {
            var entry = colorTable[mapStyle][i];
            content += '<tr><td style="background:' + entry[1] + ';width:22px"></td>' +
                '<td class="pl-2">&gt; ' + entry[0] + '</td></tr>';
        }
        content += '</table>';
        content += '<div><small>資料來源：' +
            '<ul class="mb-0 pl-3">' +
            '<li><a href="https://data.gov.tw/dataset/21025" target="_blank">登革熱1998年起每日確定病例統計</a></li>' +
            '<li><a href="https://data.gov.tw/dataset/7438" target="_blank">村里界圖(TWD97經緯度)</a></li>' +
            '</ul></small></div></div>';

        div.innerHTML = header + content;

        L.DomEvent.on(div, 'click', function (e) {
            var content = div.querySelector('#legend-content');
            var toggle = div.querySelector('#legend-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.innerHTML = '▼';
            } else {
                content.style.display = 'none';
                toggle.innerHTML = '▶';
            }
            L.DomEvent.stopPropagation(e);
        });

        L.DomEvent.disableClickPropagation(div);
        return div;
    }
});
map.addControl(new LegendControl());

// Quick links control (moved from sidebar)
var LinksControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
        var div = L.DomUtil.create('div', 'leaflet-control p-2');
        div.style.background = 'rgba(255,255,255,0.9)';
        div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        div.style.cursor = 'pointer';

        var header = '<div style="display: flex; justify-content: space-between; align-items: center;"><strong>選單</strong><span id="links-toggle" style="font-size: 12px;">▼</span></div>';
        var content = '<div id="links-content">' +
            '<div class="mb-2">請點選地圖中的區塊</div>' +
            '<div class="btn-group-vertical" style="width:220px">' +
            '<a href="https://github.com/kiang/tainan.olc.tw/issues" target="_blank" class="btn btn-sm" style="background-color: #0056b3; color: white; border: 1px solid #004085; font-weight: 500;">網站問題反應</a>' +
            '<a href="https://kiang.github.io/ovitrap/" target="_blank" class="btn btn-sm" style="background-color: #5a6268; color: white; border: 1px solid #4e555b; font-weight: 500;">病媒蚊監控採樣數據地圖</a>' +
            '<a href="https://github.com/kiang/tainan.olc.tw" target="_blank" class="btn btn-sm" style="background-color: #212529; color: white; border: 1px solid #1a1d20; font-weight: 500;"><i class="fa fa-github"></i> 原始碼</a>' +
            '</div></div>';

        div.innerHTML = header + content;

        L.DomEvent.on(div, 'click', function (e) {
            var content = div.querySelector('#links-content');
            var toggle = div.querySelector('#links-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.innerHTML = '▼';
            } else {
                content.style.display = 'none';
                toggle.innerHTML = '▶';
            }
            L.DomEvent.stopPropagation(e);
        });

        L.DomEvent.disableClickPropagation(div);
        return div;
    }
});
map.addControl(new LinksControl());

// Year + Source selector control
var SelectorControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
        var div = L.DomUtil.create('div', 'leaflet-control p-2');
        div.style.background = 'rgba(255,255,255,0.9)';
        div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        div.style.minWidth = '200px';

        // Year select
        var yearOptions = '';
        for (var y = 2026; y >= 1998; y--) {
            yearOptions += '<option value="' + y + '"' + (y === currentYear ? ' selected' : '') + '>' + y + ' 年</option>';
        }

        div.innerHTML =
            '<div style="margin-bottom:6px"><strong>年份 / 資料類型</strong></div>' +
            '<div style="margin-bottom:4px">' +
            '<select id="year-select" class="form-control form-control-sm">' + yearOptions + '</select>' +
            '</div>' +
            '<div class="btn-group btn-group-sm" style="width:100%">' +
            '<button id="btn-local" class="btn btn-primary btn-sm" style="width:50%">本土病例</button>' +
            '<button id="btn-imported" class="btn btn-outline-secondary btn-sm" style="width:50%">境外移入</button>' +
            '</div>';

        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);

        // Bind events after DOM insertion
        setTimeout(function () {
            var yearSelect = document.getElementById('year-select');
            var btnLocal = document.getElementById('btn-local');
            var btnImported = document.getElementById('btn-imported');

            yearSelect.addEventListener('change', function () {
                currentYear = parseInt(this.value);
                loadData();
            });

            btnLocal.addEventListener('click', function () {
                if (currentSource === 'cunli') return;
                currentSource = 'cunli';
                btnLocal.className = 'btn btn-primary btn-sm';
                btnLocal.style.width = '50%';
                btnImported.className = 'btn btn-outline-secondary btn-sm';
                btnImported.style.width = '50%';
                loadData();
            });

            btnImported.addEventListener('click', function () {
                if (currentSource === 'cunli_imported') return;
                currentSource = 'cunli_imported';
                btnImported.className = 'btn btn-secondary btn-sm';
                btnImported.style.width = '50%';
                btnLocal.className = 'btn btn-outline-primary btn-sm';
                btnLocal.style.width = '50%';
                loadData();
            });
        }, 0);

        return div;
    }
});
map.addControl(new SelectorControl());

// Geolocation control
var LocateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
        var btn = L.DomUtil.create('a', 'leaflet-control btn btn-sm');
        btn.href = '#';
        btn.title = '回到目前位置';
        btn.style.margin = '10px';
        btn.innerHTML = '<i class="fa fa-location-arrow"></i> 定位';
        btn.style.backgroundColor = '#0056b3';
        btn.style.color = 'white';
        btn.style.border = '1px solid #004085';
        btn.style.fontWeight = '500';
        L.DomEvent.on(btn, 'click', function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            map.locate({ setView: true, maxZoom: 13, enableHighAccuracy: true });
        });
        return btn;
    }
});
map.addControl(new LocateControl());

var userMarker = null, accuracyCircle = null;
map.on('locationfound', function (e) {
    if (accuracyCircle) { map.removeLayer(accuracyCircle); }
    if (userMarker) { map.removeLayer(userMarker); }
    accuracyCircle = L.circle(e.latlng, { radius: e.accuracy, color: '#3399CC', fillColor: '#3399CC', fillOpacity: 0.2 }).addTo(map);
    userMarker = L.circleMarker(e.latlng, { radius: 6, color: '#fff', weight: 2, fillColor: '#3399CC', fillOpacity: 1 }).addTo(map);
});
map.on('locationerror', function () { alert('目前使用的設備無法提供地理資訊'); });

// Function to fit map to areas with data
function fitMapToDataBounds() {
    if (areasLayer && Object.keys(dengue).length > 0) {
        var bounds = null;
        areasLayer.eachLayer(function (layer) {
            var villCode = layer.feature.properties.VILLCODE;
            if (dengue[villCode] && (dengue[villCode].count > 0 || dengue[villCode] > 0)) {
                if (!bounds) {
                    bounds = L.latLngBounds(layer.getBounds());
                } else {
                    bounds.extend(layer.getBounds());
                }
            }
        });
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
}

function loadData() {
    var url = 'https://kiang.github.io/dengue/daily/' + currentYear + '/' + currentSource + '.json';
    $.getJSON(url, {}, function (data) {
        dengue = Array.isArray(data) ? {} : data;
        clearLabels();
        refreshAreaStyles();
        addLabels();
        fitMapToDataBounds();

        // Update page title
        var sourceLabel = currentSource === 'cunli' ? '本土病例' : '境外移入';
        document.title = '台灣登革熱' + sourceLabel + '地圖 - ' + currentYear + '年';
    }).fail(function () {
        dengue = {};
        clearLabels();
        refreshAreaStyles();
    });
}

// Load boundaries first (cached), then load dengue data
fetch('https://kiang.github.io/taiwan_basecode/cunli/s_geo/20250620.json')
    .then(function (r) { return r.json(); })
    .then(function (geojson) {
        geojsonCache = geojson;
        areasLayer = L.geoJSON(geojson, {
            style: styleFeature,
            onEachFeature: onEachArea
        }).addTo(map);

        loadData();
    });
