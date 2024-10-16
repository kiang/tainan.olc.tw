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

function areaStyleFunction(f) {
    var color = 'rgba(200,200,200,0.5)',
        stroke, radius;
    var p = f.getProperties();
    if (tpp[p.id]) {
        color = 'rgba(29,168,165,0.7)';
    }
    if (f === currentFeature) {
        color = 'rgba(200,200,0,0.5)';
        stroke = new ol.style.Stroke({
            color: 'rgba(255,0,0,0.5)',
            width: 5
        });
        radius = 25;
    } else {
        stroke = new ol.style.Stroke({
            color: '#000',
            width: 1
        });
        radius = 15;
    }
    return new ol.style.Style({
        fill: new ol.style.Fill({
            color: color
        }),
        stroke: stroke,
        text: new ol.style.Text({
            font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
            fill: new ol.style.Fill({
                color: 'rgba(255, 0, 255, 1)'
            }),
            text: p.name
        })
    })
}

function pointStyleFunction(f) {
    var color = 'rgba(200,200,200,0.7)',
        stroke, radius;
    var p = f.getProperties();
    if (p.days > 7) {
        color = 'rgba(0,200,0,0.7)'
    } else if (p.days > 0) {
        color = 'rgba(200,200,0,0.7)'
    } else {
        color = 'rgba(200,200,200,0.7)'
    }

    if (f === currentFeature) {
        color = 'rgba(200,200,0,0.5)';
        stroke = new ol.style.Stroke({
            color: 'rgba(255,0,0,0.5)',
            width: 5
        });
        radius = 15;
    } else {
        stroke = new ol.style.Stroke({
            color: '#000',
            width: 1
        });
        radius = 10;
    }
    return new ol.style.Style({
        image: new ol.style.RegularShape({
            points: 3,
            radius: radius,
            fill: new ol.style.Fill({
                color: color
            }),
            stroke: stroke
        })
    });
}

var appView = new ol.View({
    center: ol.proj.fromLonLat([120.341986, 23.176082]),
    zoom: 8
});

var vectorAreas = new ol.layer.Vector({
    style: areaStyleFunction
});

var vectorPoints = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: pointStyleFunction
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
    layers: [baseLayer, vectorAreas, vectorPoints],
    target: 'map',
    view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var previousFeature = false;
var currentFeature = false;
var tpp = {};

$.getJSON('json/tpp.json', function (c) {
    tpp = c;
    vectorAreas.setSource(new ol.source.Vector({
        url: 'json/zones.json',
        format: new ol.format.TopoJSON()
    }));
});

$.getJSON('json/places.json', function (c) {
    var pointsFc = [],
        counter = 0;
    for (k in c) {
        if (c[k].longitude && !isNaN(c[k].longitude)) {
            var pointFeature = new ol.Feature({
                geometry: new ol.geom.Point(
                    ol.proj.fromLonLat([
                        parseFloat(c[k].longitude),
                        parseFloat(c[k].latitude)
                    ])
                )
            });
            pointFeature.setProperties(c[k]);
            if (pointFeature) {
                pointsFc.push(pointFeature);
            }
        }
        
    }
    vectorPoints.getSource().addFeatures(pointsFc);
    vectorPoints.getSource().refresh();
})

map.on('singleclick', function (evt) {
    pointClicked = false;
    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (false === pointClicked) {
            currentFeature = feature;
            var p = feature.getProperties();
            var c = '',
                sidebarTitle = '';
            if (p.areas) {
                if (false !== previousFeature) {
                    previousFeature.setStyle(areaStyleFunction(previousFeature));
                }
                currentFeature.setStyle(areaStyleFunction(currentFeature));
                previousFeature = currentFeature;
                if (tpp[p.id]) {
                    sidebarTitle = tpp[p.id].name;
                    c = '<img src="img/' + p.id + '.jpg" style="width: 100%;" />';
                    c += '<table class="table table-striped">';
                    if (tpp[p.id].fb !== '') {
                        c += '<tr><th>姓名</th><td><a href="' + tpp[p.id].fb + '" target="_blank">' + tpp[p.id].name + '</a></td></tr>';
                    } else {
                        c += '<tr><th>姓名</th><td>' + tpp[p.id].name + '</td></tr>';
                    }
                    c += '<tr><th>選區</th><td>' + p.name + '</td></tr>';
                    c += '<tr><th>行政區</th><td>' + p.areas.replaceAll(',', '<br />') + '</td></tr>';
                    c += '<tr><th>介紹</th><td>' + tpp[p.id].info.replace("\n", '<br />') + '</td></tr>';
                    if (tpp[p.id].yt) {
                        c += '<tr><td colspan="2"><iframe width="100%" height="315" src="https://www.youtube.com/embed/' + tpp[p.id].yt + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></td></tr>';
                    }
                    c += '</table>';
                    if (tpp[p.id].fb !== '') {
                        c += '<div class="fb-page" data-href="' + tpp[p.id].fb + '" data-tabs="timeline" data-width="380" data-small-header="false" data-adapt-container-width="true" data-hide-cover="false" data-show-facepile="true"><blockquote cite="' + tpp[p.id].fb + '" class="fb-xfbml-parse-ignore"><a href="' + tpp[p.id].fb + '">' + tpp[p.id].name + '</a></blockquote></div>';
                    }
                } else {
                    sidebarTitle = p.name;
                    c += '<table class="table table-striped">';
                    c += '<tr><th>選區</th><td>' + p.name + '</td></tr>';
                    c += '<tr><th>行政區</th><td>' + p.areas.replaceAll(',', '<br />') + '</td></tr>';
                    c += '</table>';
                }
            } else {
                if (false !== previousFeature) {
                    previousFeature.setStyle(pointStyleFunction(previousFeature));
                }
                currentFeature.setStyle(pointStyleFunction(currentFeature));
                previousFeature = currentFeature;
                sidebarTitle = p.name;
                c += '<table class="table table-striped">';
                c += '<tr><th>地點</th><td>' + p.name + '</td></tr>';
                c += '<tr><th>活動時間</th><td>' + p.events[0].time_gather + '</td></tr>';
                c += '<tr><th>活動內容</th><td>' + p.events[0].name + '</td></tr>';
                c += '</table>';
            }


            $('#sidebarTitle').html(sidebarTitle);
            $('#sidebarContent').html(c);
            sidebar.open('home');
            pointClicked = true;

            if (FB) {
                FB.XFBML.parse();
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