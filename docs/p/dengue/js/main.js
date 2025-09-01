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

function getFillColor(villCode) {
    var color = 'rgba(200,200,200,0.5)';
    if (villCode && dengue[villCode] !== undefined) {
        for (var i = 0; i < colorTable[mapStyle].length; i++) {
            var entry = colorTable[mapStyle][i];
            if (color === 'rgba(200,200,200,0.5)' && dengue[villCode] > entry[0]) {
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

function normalizeCode(k) {
    var prefix = k.substr(0, 1);
    if (prefix === '6') {
        k = k.replace('-', '');
        k = k.substr(0, 3) + '00' + k.substr(3, 3) + k.substr(7, 3);
    } else {
        k = k.replace('-', '0');
    }
    return k;
}

function styleFeature(feature) {
    var p = feature.properties || {};
    var villCode = p.VILLCODE;
    var hasData = dengue[villCode] !== undefined && dengue[villCode] > 0;
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
        var count = dengue[villCode];
        var html = '<table class="table table-striped mb-0">' +
            '<tr><th>村里</th><td>' + (p.COUNTYNAME || '') + (p.TOWNNAME || '') + (p.VILLNAME || '') + '</td></tr>' +
            (count !== undefined ? ('<tr><th>確診數</th><td>' + count + '</td></tr>') : '') +
            '</table>';
        layer.bindPopup(html, { maxWidth: 260 }).openPopup();
    });

    layer.on('mouseover', function () { 
        var hasData = dengue[feature.properties.VILLCODE] !== undefined && dengue[feature.properties.VILLCODE] > 0;
        if (hasData) {
            layer.setStyle({ weight: 2 });
        }
    });
    layer.on('mouseout', function () { layer.setStyle(styleFeature(feature)); });
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
        var html = '<div><strong>圖例</strong></div><table class="table table-sm table-striped mb-2">';
        for (var i = 0; i < colorTable[mapStyle].length; i++) {
            var entry = colorTable[mapStyle][i];
            html += '<tr><td style="background:' + entry[1] + ';width:22px"></td>' +
                '<td class="pl-2">&gt; ' + entry[0] + '</td></tr>';
        }
        html += '</table>';
        html += '<div><small>資料來源：' +
            '<ul class="mb-0 pl-3">' +
            '<li><a href="https://data.gov.tw/dataset/21025" target="_blank">登革熱1998年起每日確定病例統計</a></li>' +
            '<li><a href="https://data.gov.tw/dataset/7438" target="_blank">村里界圖(TWD97經緯度)</a></li>' +
            '</ul></small></div>';
        div.innerHTML = html;
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
        div.innerHTML = '' +
            '<div class="mb-2"><strong>請點選地圖中的區塊</strong></div>' +
            '<div class="btn-group-vertical" style="width:220px">' +
            '<a href="https://github.com/kiang/tainan.olc.tw/issues" target="_blank" class="btn btn-sm" style="background-color: #0056b3; color: white; border: 1px solid #004085; font-weight: 500;">網站問題反應</a>' +
            '<a href="https://kiang.github.io/ovitrap/" target="_blank" class="btn btn-sm" style="background-color: #5a6268; color: white; border: 1px solid #4e555b; font-weight: 500;">病媒蚊監控採樣數據地圖</a>' +
            '<a href="https://github.com/kiang/tainan.olc.tw" target="_blank" class="btn btn-sm" style="background-color: #212529; color: white; border: 1px solid #1a1d20; font-weight: 500;"><i class="fa fa-github"></i> 原始碼</a>' +
            '</div>';
        L.DomEvent.disableClickPropagation(div);
        return div;
    }
});
map.addControl(new LinksControl());

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

// Load boundaries (GeoJSON version)
fetch('https://kiang.github.io/taiwan_basecode/cunli/s_geo/20250620.json')
    .then(function (r) { return r.json(); })
    .then(function (geojson) {
        areasLayer = L.geoJSON(geojson, {
            style: styleFeature,
            onEachFeature: onEachArea
        }).addTo(map);
    });

// Load dengue counts then refresh styles
$.getJSON('https://kiang.github.io/dengue/daily/2025/cunli.json', {}, function (data) {
    $.each(data, function (k, v) {
        dengue[normalizeCode(k)] = v;
    });
    refreshAreaStyles();
});
