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
    var p = f.getProperties().properties, theColor = '#00c0d8';
    if (f === currentFeature) {
        theColor = '#d800c0';
    } else if (points[p.name] && points[p.name].points.length == 0) {
        theColor = '#00d800';
    }
    if ('Point' === f.getGeometry().getType()) {
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
        if (map.getView().getZoom() > 12) {
            label = p.line + "\n" + p.name;
        } else {
            label = p.line;
        }
        finalStyle.getText().setText(label);
    } else {
        var finalStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: theColor,
                width: 5
            })
        });
    }
    return finalStyle;
}

var lines = new ol.layer.Vector({
    source: new ol.source.Vector(),
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
var points = {};

$.getJSON('json/points.json', function (data) {
    points = data;
    var features = [], linePoints = [], thePoint = false, pointEnd = false;
    for (k1 in points) {
        if ('總統戰線' == k1) {
            continue;
        }
        for (k2 in points[k1]) {
            linePoints = [];
            for (k3 in points[k1][k2]) {
                if (0 == points[k1][k2][k3].lng || 0 == points[k1][k2][k3].lat) {
                    continue;
                }
                thePoint = new ol.geom.Point(ol.proj.transform([points[k1][k2][k3].lng, points[k1][k2][k3].lat], 'EPSG:4326', 'EPSG:3857'));
                features.push(new ol.Feature({
                    properties: {
                        name: k3,
                        team: k1,
                        line: k2
                    },
                    geometry: thePoint
                }));
                linePoints.push(thePoint.getCoordinates());
            }
            features.push(new ol.Feature({
                properties: {
                    name: k2
                },
                geometry: new ol.geom.LineString(linePoints)
            }));
        }
    }
    lines.getSource().addFeatures(features);
    lines.getSource().refresh();
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

            var p = feature.getProperties().properties;
            if (p.line) {
                lineClicked = true;
                sidebar.open('home');
                var message = '<div class="list-group">';
                message += '<div class="list-group-item bg-secondary text-light">' + p.team + '<br />' + p.line + '</div>';
                for (k1 in points[p.team][p.line]) {
                    if (k1 === p.name) {
                        message += '<div class="list-group-item bg-info text-light">' + k1 + '</div>';
                    } else {
                        message += '<div class="list-group-item">' + k1 + '</div>';
                    }
                }
                message += '</div>';
                $('#sidebarContent').html(message);
                barTitle.html(p.name);
            }
        }
    });

});

map.on("pointermove", function (evt) {
    var hit = this.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        return true;
    });
    if (hit) {
        this.getTargetElement().style.cursor = 'pointer';
    } else {
        this.getTargetElement().style.cursor = '';
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