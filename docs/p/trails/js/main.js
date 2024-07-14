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

function lineStyleFunction(f) {
  var p = f.getProperties(), color, stroke, radius, z = map.getView().getZoom();
  if (p.TrailHeight < 500) {
    color = '#ff0000';
  } else if (p.TrailHeight < 1000) {
    color = '#ffff00';
  } else {
    color = '#00ff00';
  }
  if (f === currentFeature) {
    stroke = new ol.style.Stroke({
      color: 'rgba(255,0,255,1)',
      width: 10
    });
    radius = 35;
  } else {
    stroke = new ol.style.Stroke({
      color: color,
      width: 5
    });

    radius = 20;
    if (z <= 12) {
      radius = 10;
    }
  }

  let lineStyle = new ol.style.Style({
    stroke: stroke,
    text: new ol.style.Text({
      font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      fill: new ol.style.Fill({
        color: 'rgba(0,0,0,1)'
      }),
      stroke: new ol.style.Stroke({
        color: '#fff',
        width: 3
      })
    })
  });
  if (z > 12 || radius === 35) {
    lineStyle.getText().setText(p.statusText);
  }

  return lineStyle;
}
var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.221507, 23.000694]),
  zoom: 10
});

var vectorLines = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'https://kiang.github.io/media.taiwan.net.tw/geojson/trails.json',
    format: new ol.format.GeoJSON()
  }),
  style: lineStyleFunction
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
  opacity: 1
});

var map = new ol.Map({
  layers: [baseLayer, vectorLines],
  target: 'map',
  view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var clickedCoordinate = {};
var newFeature = new ol.Feature();
new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [newFeature]
  })
});

var selectedCity = '', selectedTown = '';
map.on('singleclick', function (evt) {
  clickedCoordinate = ol.proj.toLonLat(evt.coordinate);
  content.innerHTML = '';
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      var p = feature.getProperties();
      if (p.TrailID) {
        var targetHash = '#line/' + p.TrailID;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
        pointClicked = true;
        newFeature.setStyle(null);
      }
    }
  });
});

var previousFeature = false;
var currentFeature = false;

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
    sidebar.close();
  } else {
    alert('目前使用的設備無法提供地理資訊');
  }
  return false;
});

function showPos(lng, lat) {
  firstPosDone = true;
  appView.setCenter(ol.proj.fromLonLat([parseFloat(lng), parseFloat(lat)]));
}

var previousFeature = false;
var currentFeature = false;
function showLine(lineId) {
  firstPosDone = true;
  var features = vectorLines.getSource().getFeatures();
  var pointFound = false;
  for (k in features) {
    var p = features[k].getProperties();
    if (p.TrailID === lineId) {
      pointFound = true;
      currentFeature = features[k];
      features[k].setStyle(lineStyleFunction(features[k]));
      if (false !== previousFeature) {
        previousFeature.setStyle(lineStyleFunction(previousFeature));
      }
      previousFeature = currentFeature;
      var geo = features[k].getGeometry();
      appView.fit(geo);
      var lonLat = ol.proj.toLonLat(geo.getFirstCoordinate());
      var message = '<table class="table table-dark">';
      message += '<tbody>';
      message += '<tr><th scope="row">步道名稱</th><td>' + p.TrailName + '</td></tr>';
      message += '<tr><th scope="row">介紹</th><td>' + p.Description + '</td></tr>';
      message += '<tr><th scope="row">交通</th><td>' + p.TrafficInfo + '</td></tr>';
      message += '<tr><th scope="row">長度</th><td>' + p.TrailLength + ' 公尺</td></tr>';
      message += '<tr><th scope="row">海拔</th><td>' + p.TrailHeight + ' 公尺</td></tr>';
      message += '<tr><td colspan="2">';
      message += '<div class="btn-group-vertical" role="group" style="width: 100%;">';
      message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
      message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
      message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
      message += '</div></td></tr>';
      message += '</tbody></table>';

      content.innerHTML = message;
      sidebarTitle.innerHTML = p.TrailName;
    }
  }
  sidebar.open('home');
}

vectorLines.getSource().once('change', function (e) {
  if (vectorLines.getSource().getState() === 'ready') {
    routie('line/:lineId', showLine);
    routie('pos/:lng/:lat', showPos);
  }
});