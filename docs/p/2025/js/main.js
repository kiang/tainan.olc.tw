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
    switch(candidates[p.id].party) {
        case '中國國民黨':
            color = 'rgba(0, 81, 255, 0.7)';
            break;
        case '民主進步黨':
            color = 'rgba(34, 255, 0, 0.7)';
            break;
        case '無':
            color = 'rgba(200,200,200,0.7)';
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

var appView = new ol.View({
    center: ol.proj.fromLonLat([120.341986, 23.176082]),
    zoom: 8
});

var vectorAreas = new ol.layer.Vector({
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
var candidates = {};

$.getJSON('json/candidates.json', function (c) {
    candidates = c;
    vectorAreas.setSource(new ol.source.Vector({
        url: 'json/zones.json',
        format: new ol.format.TopoJSON()
    }));
});

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
                if (candidates[p.id]) {
                    sidebarTitle = candidates[p.id].candidate;
                    c = '<img src="img/' + p.id + '.jpg" style="width: 100%;" />';
                    c += '<table class="table table-striped">';
                    c += '<tr><th>姓名</th><td><a href="' + candidates[p.id].link + '" target="_blank">' + candidates[p.id].candidate + '</a></td></tr>';
                    c += '<tr><th>政黨</th><td>' + candidates[p.id].party + '</td></tr>';
                    c += '<tr><th>選區</th><td>' + p.name + '</td></tr>';
                    c += '<tr><th>行政區</th><td>' + p.areas.replaceAll(',', '<br />') + '</td></tr>';
                    if(candidates[p.id].linktr != '') {
                        c += '<tr><td colspan="2"><a href="' + candidates[p.id].linktr + '" target="_blank" class="btn btn-primary btn-lg btn-block">罷免討論</a></td></tr>';
                    }
                    c += '<tr><th>得票</th><td>' + candidates[p.id].votes + '</td></tr>';
                    c += '<tr><th>選舉人數</th><td>' + candidates[p.id].total + '</td></tr>';
                    c += '<tr><th>階段一</th><td>' + Math.ceil((candidates[p.id].total * 0.01)) + '</td></tr>';
                    c += '<tr><th>階段二</th><td>' + Math.ceil((candidates[p.id].total * 0.1)) + '</td></tr>';
                    c += '<tr><th>階段三</th><td>' + Math.ceil((candidates[p.id].total * 0.25)) + '</td></tr>';
                    c += '</table>';
                } else {
                    sidebarTitle = p.name;
                    c += '<table class="table table-striped">';
                    c += '<tr><th>選區</th><td>' + p.name + '</td></tr>';
                    c += '<tr><th>行政區</th><td>' + p.areas.replaceAll(',', '<br />') + '</td></tr>';
                    c += '</table>';
                }
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