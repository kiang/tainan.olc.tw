var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });
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

var appView = new ol.View({
    center: ol.proj.fromLonLat([120.198, 23.004582]),
    zoom: 14
});

var theList = {};
$.getJSON('json/youtube_list.json', {}, function (c) {
    theList = c;
});

var baseStyle = new ol.style.Style({
    image: new ol.style.RegularShape({
        radius: 20,
        points: 3,
        fill: new ol.style.Fill({
            color: '#00c0d8'
        }),
        stroke: new ol.style.Stroke({
            color: '#000',
            width: 2
        })
    }),
    text: new ol.style.Text({
        font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
        fill: new ol.style.Fill({
            color: 'rgba(255,255,255,1)'
        })
    })
});

var pointStyle = function (f) {
    var p = f.getProperties();
    var finalStyle = baseStyle.clone();
    finalStyle.getText().setText(p.count + '');
    return finalStyle;
}

var points = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'json/youtube.json',
        format: new ol.format.GeoJSON()
    }),
    style: pointStyle
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

var vectorAreasStyleBase = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#000',
        width: 1
    }),
    text: new ol.style.Text({
        font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
        fill: new ol.style.Fill({
            color: 'rgba(0,0,255,0.7)'
        })
    })
});
var vectorAreasStyleFunc = function(f) {
    var s = vectorAreasStyleBase.clone(), p = f.getProperties();
    s.getText().setText(p.name + ' ' + p.areas);
    return s;
}
var vectorAreas = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'https://kiang.github.io/vote2022/2022.json',
        format: new ol.format.GeoJSON()
    }),
    style: vectorAreasStyleFunc
});

var map = new ol.Map({
    layers: [baseLayer, vectorAreas, points],
    target: 'map',
    view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var previousFeature = false;
var currentFeature = false;
var selectedCunli = '';

var barTitle = $('#sidebarTitle');
var barContent = $('#sidebarContent');

map.on('singleclick', function (evt) {
    pointClicked = false;
    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (false === pointClicked) {
            var p = feature.getProperties();
            if (p.key && theList[p.key]) {
                pointClicked = true;
                sidebar.open('home');
                var message = '';
                for (k in theList[p.key]) {
                    message += '<iframe width="100%" height="315" src="https://www.youtube.com/embed/' + theList[p.key][k].id + '" title="' + theList[p.key][k].title + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
                }
                barTitle.html(p.key);
                barContent.html(message);
            }
        }
    });
    if (false === pointClicked) {
        sidebar.open('book');
    }
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

geolocation.on('change:position', function () {
    var coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
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