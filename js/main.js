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

function cunliStyle(f) {
  var color = '', stroke, radius;
  var p = f.getProperties();
  if (f === currentFeature) {
    color = 'rgba(200,200,0,0.5)';
    stroke = new ol.style.Stroke({
      color: 'rgba(255,0,0,0.5)',
      width: 5
    });
    radius = 25;
  } else {
    color = 'rgba(29,168,165,0)';

    stroke = new ol.style.Stroke({
      color: '#000',
      width: 1
    });
    radius = 15;
  }
  var fStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: color
    }),
    stroke: stroke,
    text: new ol.style.Text({
      font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
      placement: 'point',
      fill: new ol.style.Fill({
        color: 'rgba(0,0,0,1)'
      })
    })
  });
  fStyle.getText().setText(p.VILLNAME);
  return fStyle;
}

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.198, 23.004582]),
  zoom: 15
});

var theArea = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'json/67000-08.json',
    format: new ol.format.GeoJSON()
  }),
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(29,168,165,1)'
    }),
    stroke: new ol.style.Stroke({
      color: '#000',
      width: 1
    })
  })
});

var cunli = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'json/cunli.json',
    format: new ol.format.GeoJSON()
  }),
  style: cunliStyle
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
  layers: [baseLayer, theArea, cunli],
  target: 'map',
  view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var previousFeature = false;
var currentFeature = false;
map.on('singleclick', function (evt) {
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      currentFeature = feature;
      if (false !== previousFeature) {
        previousFeature.setStyle(cunliStyle(previousFeature));
      }
      currentFeature.setStyle(cunliStyle(currentFeature));
      previousFeature = currentFeature;
      var p = feature.getProperties();
      

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
    console.log('目前使用的設備無法提供地理資訊');
  }
  return false;
});