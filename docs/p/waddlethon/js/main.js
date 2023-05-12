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

var lineStyle = function (f) {
    var p = f.getProperties(), theColor = '#00c0d8';
    if (f === currentFeature) {
        theColor = '#d800c0';
    }
    var finalStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: theColor,
            width: 5
        }),
        text: new ol.style.Text({
            font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
            fill: new ol.style.Fill({
                color: 'rgba(255,255,255,1)'
            }),
            backgroundFill: new ol.style.Fill({
                color: theColor
            })
        })
    });
    finalStyle.getText().setText(p.name + "\n" + Math.round(p.length / 100) / 10 + ' KM');
    return finalStyle;
}

var lines = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'json/lines.json',
        format: new ol.format.GeoJSON()
    }),
    style: lineStyle
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
    layers: [baseLayer, lines],
    target: 'map',
    view: appView
});

map.addControl(sidebar);
var lineClicked = false;
var previousFeature = false;
var currentFeature = false;

var barTitle = $('#sidebarTitle');
var barContent = $('#sidebarContent');
var videos = {};

$.getJSON('json/videos.json', function (data) {
    videos = data;
});

map.on('singleclick', function (evt) {
    lineClicked = false;
    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (false === lineClicked) {
            previousFeature = currentFeature;
            currentFeature = feature;
            if (false !== previousFeature) {
                previousFeature.setStyle(lineStyle(previousFeature));
            }
            if (false !== currentFeature) {
                currentFeature.setStyle(lineStyle(currentFeature));
            }

            var p = feature.getProperties();
            if (p.name) {
                lineClicked = true;
                sidebar.open('home');
                var message = '';
                if (videos[p.name]) {
                    for (k in videos[p.name]) {
                        message += '<iframe width="100%" height="315" src="https://www.youtube.com/embed/' + videos[p.name][k] + '" title="' + p.name + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
                    }
                }
                barTitle.html(p.name);
                barContent.html(message);
            }
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

$('#btn-fit').click(function () {
    setFit();
    return false;
});

var setZoom = function (zoomCode) {
    zoomCode = parseInt(zoomCode);
    if (zoomCode > 8 && zoomCode < 21) {
        map.getView().setZoom(zoomCode);
    }
}

setTimeout(() => {
    setFit();
}, 1000);

var setFit = function () {
    map.getView().fit(lines.getSource().getExtent(), map.getSize());
}

var routes = {
    '/zoom/:zoomCode': setZoom
};

var router = Router(routes);

router.init();