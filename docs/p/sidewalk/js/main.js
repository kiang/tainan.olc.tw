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

var cityList = {};
var filterCity = '', filterTown = '';
var filterExtent = false;
function areaStyle(f) {
  let polygonStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: '#3c0',
      width: 5
    }),
    fill: new ol.style.Fill({
      color: '#3c0'
    }),
  });
  return polygonStyle;
}
var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.721507, 23.700694]),
  zoom: 9
});

var areaFormat = new ol.format.GeoJSON({
  featureProjection: appView.getProjection()
});

var vectorPolygons = new ol.layer.Vector({
  source: new ol.source.Vector({
    format: areaFormat
  }),
  style: areaStyle
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

function countyStyle(f) {
  var p = f.getProperties();
  var k = getKey(p.COUNTYNAME, p.TOWNNAME);
  if (selectedKey === k) {
    return null;
  }
  var color = '#ffffff';
  var strokeWidth = 1;
  var strokeColor = 'rgba(0,0,0,0.3)';
  var textColor = '#000000';
  var baseStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: strokeColor,
      width: strokeWidth
    }),
    fill: new ol.style.Fill({
      color: color
    }),
    text: new ol.style.Text({
      font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      text: p.COUNTYNAME + p.TOWNNAME,
      fill: new ol.style.Fill({
        color: textColor
      })
    })
  });
  return baseStyle;
}

var county = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'https://kiang.github.io/taiwan_basecode/city/city.topo.json',
    format: new ol.format.TopoJSON({
      featureProjection: appView.getProjection()
    })
  }),
  style: countyStyle,
  zIndex: 50
});


var map = new ol.Map({
  layers: [baseLayer, county, vectorPolygons],
  target: 'map',
  view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var selectedKey = '';
var mapPool = {};

function getKey(county, city) {
  switch (county) {
    case '臺中市':
      county = '台中市';
      break;
    case '臺北市':
      county = '台北市';
      break;
    case '臺南市':
      county = '台南市';
      break;
    case '臺東市':
      county = '台東市';
      break;
  }
  return county + '/' + city;
}

var lonLat
map.on('singleclick', function (evt) {
  var clickedRoad = '';
  content.innerHTML = '';
  lonLat = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      pointClicked = true;
      var p = feature.getProperties();
      if (p.COUNTYNAME) {
        selectedKey = getKey(p.COUNTYNAME, p.TOWNNAME);
        if (!mapPool[selectedKey]) {
          $.getJSON('https://kiang.github.io/sidewalk.cpami.gov.tw/json/sidewalks/' + selectedKey + '.json', function (c) {
            mapPool[selectedKey] = true;
            vectorPolygons.getSource().addFeatures(areaFormat.readFeatures(c));
            vectorPolygons.getSource().refresh();
          });
        } else {
          vectorPolygons.getSource().refresh();
        }
        map.getView().fit(feature.getGeometry().getExtent());
        map.getView().setZoom(16);
        county.getSource().refresh();
      } else {
        currentFeature = feature;
        vectorPolygons.getSource().refresh();

        var message = '<table class="table table-dark">';
        message += '<tbody>';
        message += '<tr><th scope="row" style="width: 100px;">Road</th><td>' + p.road + '</td></tr>';
        message += '<tr><th scope="row">width</th><td>' + p.width + '</td></tr>';
        message += '</tbody></table>';
        clickedRoad = p.road;
        sidebarTitle.innerHTML = p.road;
        content.innerHTML = message;
      }
    }
  });
  var message = '<table class="table table-dark">';
  message += '<tbody>';
  message += '<tr><th scope="row" style="width: 100px;">Longitude</th><td>' + lonLat[0] + '</td></tr>';
  message += '<tr><th scope="row">Latitude</th><td>' + lonLat[1] + '</td></tr>';
  message += '</tbody></table>';
  message += '<div class="btn-group-vertical" role="group" style="width: 100%;">';
  message += '<a class="btn btn-info btn-lg btn-block" href="https://docs.google.com/forms/d/e/1FAIpQLSfl6z6ciMFJK2SFRhqWjY8qBtMYJ71XLzTPF8mqvTwWfFbTQA/viewform?usp=pp_url&entry.383105126=' + clickedRoad + '&entry.1777912860=' + lonLat[0] + '&entry.1403726968=' + lonLat[0] + '" target="_blank">通報</a>';
  message += '</div>';
  content.innerHTML += message;
  sidebar.open('home');
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