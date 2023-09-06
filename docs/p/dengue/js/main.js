var sidebar = new ol.control.Sidebar({
    element: 'sidebar',
    position: 'right'
});
var jsonFiles, filesLength, fileKey = 0;

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}
var mapStyle = 'countBased';
var colorTable = {
    'countBased': [
        [5120, '#470617'],
        [2560, '#5f0926'],
        [1280, '#64036b'],
        [640, '#75008b'],
        [320, '#af004f'],
        [160, '#d21a34'],
        [80, '#ec6234'],
        [40, '#ffa133'],
        [20, '#ffd02c'],
        [10, '#fffb26'],
        [0, '#89cd43']
    ],
};

function updateColorTable() {
    var tableLines = '';
    for (k in colorTable[mapStyle]) {
        tableLines += '<tr><td style="background-color: ' + colorTable[mapStyle][k][1] + '">&nbsp;&nbsp;</td><td> &gt;' + colorTable[mapStyle][k][0] + '</td></tr>';
    }
    $('table#colorTable').html(tableLines);
}
updateColorTable();

function areaStyleFunction(f) {
    var color = 'rgba(200,200,200,0.5)',
        stroke, radius;
    var p = f.getProperties();

    if (dengue[p.VILLCODE]) {
        for (k in colorTable[mapStyle]) {
            if (color === 'rgba(200,200,200,0.5)' && dengue[p.VILLCODE] > colorTable[mapStyle][k][0]) {
                color = colorTable[mapStyle][k][1];
            }
        }
        stroke = new ol.style.Stroke({
            color: '#000',
            width: 1
        });
    }

    if (f === currentFeature) {
        color = 'rgba(200,200,0,0)';
        stroke = new ol.style.Stroke({
            color: 'rgba(255,0,0,0.5)',
            width: 5
        });
    }

    return new ol.style.Style({
        fill: new ol.style.Fill({
            color: color
        }),
        stroke: stroke
    })
}

var appView = new ol.View({
    center: ol.proj.fromLonLat([120.341986, 23.176082]),
    zoom: 8
});

var vectorAreas = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'https://kiang.github.io/taiwan_basecode/cunli/s_topo/20230317.json',
        format: new ol.format.TopoJSON()
    }),
    style: areaStyleFunction
});

var baseLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'https://wmts.nlsc.gov.tw/wmts',
        layer: 'EMAP',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        style: 'default',
        wrapX: true,
        attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }),
    opacity: 0.8
});

var map = new ol.Map({
    layers: [baseLayer, vectorAreas],
    target: 'map',
    view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var previousFeature = false;
var currentFeature = false;
var dengue = {};

$.getJSON('https://kiang.github.io/dengue/daily/2023/cunli.json', {}, function (data) {
    $.each(data, function (k, v) {
        var prefix = k.substr(0, 1);
        if (prefix === '6') {
            k = k.replace('-', '');
            k = k.substr(0, 3) + '00' + k.substr(3, 3) + k.substr(7, 3);
        } else {
            k = k.replace('-', '0');
        }
        dengue[k] = v;
    });
    vectorAreas.getSource().refresh();
});

map.on('singleclick', function (evt) {
    pointClicked = false;
    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (false === pointClicked) {
            currentFeature = feature;
            if (false !== previousFeature) {
                previousFeature.setStyle(areaStyleFunction(previousFeature));
            }
            currentFeature.setStyle(areaStyleFunction(currentFeature));
            previousFeature = currentFeature;
            var p = feature.getProperties();
            var c = '',
                sidebarTitle = '';
            if (dengue[p.VILLCODE]) {
                sidebarTitle = p.COUNTYNAME + p.TOWNNAME + p.VILLNAME;
                c += '<table class="table table-striped">';
                c += '<tr><th>村里</th><td>' + p.COUNTYNAME + p.TOWNNAME + p.VILLNAME + '</td></tr>';
                c += '<tr><th>確診數</th><td>' + dengue[p.VILLCODE] + '</td></tr>';
                c += '</table>';
            } else {
                sidebarTitle = p.name;
                c += '<table class="table table-striped">';
                c += '<tr><th>村里</th><td>' + p.COUNTYNAME + p.TOWNNAME + p.VILLNAME + '</td></tr>';
                c += '</table>';
            }

            $('#sidebarTitle').html(sidebarTitle);
            $('#sidebarContent').html(c);
            sidebar.open('home');
            pointClicked = true;
        }
    });
});

var geolocation = new ol.Geolocation({
    projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function (error) {
    console.log(error.message);
});

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
    image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({
            color: '#3399CC'
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2
        })
    })
}));

var firstPosDone = false;
geolocation.on('change:position', function () {
    var coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
    if (false === firstPosDone) {
        appView.setCenter(coordinates);
        firstPosDone = true;
    }
});

new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [positionFeature]
    })
});

$('#btn-geolocation').click(function () {
    var coordinates = geolocation.getPosition();
    if (coordinates) {
        appView.setCenter(coordinates);
    } else {
        alert('目前使用的設備無法提供地理資訊');
    }
    return false;
});