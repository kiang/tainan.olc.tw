window.app = {};
var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
var clickedCoordinate, populationLayer, gPopulation;
for (var z = 0; z < 20; ++z) {
  // generate resolutions and matrixIds arrays for this WMTS
  resolutions[z] = size / Math.pow(2, z);
  matrixIds[z] = z;
}

var selectedCity = '臺南市';
var selectedYear = new Date().getFullYear() - 1911;
var cities = ['基隆市', '臺北市', '新北市', '桃園市', '新竹縣', '新竹市', '苗栗縣', '臺中市', '南投縣', '彰化縣', '雲林縣', '嘉義縣', '嘉義市', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '金門縣', '澎湖縣', '連江縣'];
var years = [];
for (i = selectedYear; i > 92; i--) {
  years.push(i);
}
var dataPool = {}, textOptions = '';
for (k in cities) {
  textOptions += '<option>' + cities[k] + '</option>';
}
$('#pointCity').html(textOptions);
textOptions = '';
for (k in years) {
  textOptions += '<option>' + years[k] + '</option>';
}
$('#pointYear').html(textOptions);
var typeOptions = {
  'all': true
};

var pointsStyle = function (f) {
  var p = f.getProperties().properties;
  var imgColor = 'rgba(236, 120, 62, 1)';
  if (p['查證結果'] === '合法') {
    imgColor = 'rgba(120, 236, 62, 1)';
  }
  return new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: 10,
      points: 3,
      fill: new ol.style.Fill({
        color: imgColor
      }),
      stroke: new ol.style.Stroke({
        color: '#00f',
        width: 1
      })
    }),
    text: new ol.style.Text({
      font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
      placement: 'point',
      textAlign: 'left',
      textBaseline: 'bottom',
      fill: new ol.style.Fill({
        color: 'rgba(255, 0, 255, 1)'
      }),
      text: p['變異類型']
    })
  });
}

var points = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: pointsStyle
});

function showData(city, year, type = 'all') {
  points.getSource().clear();
  $('#pointCity').val(city);
  $('#pointYear').val(year);
  if (!dataPool[city]) {
    dataPool[city] = {};
  }
  if (!dataPool[city][year]) {
    $.get('https://kiang.github.io/landchg.tcd.gov.tw/csv/' + year + '/' + city + '.csv', {}, function (c) {
      dataPool[city][year] = $.csv.toObjects(c);
      var fc = [];
      for (i in dataPool[city][year]) {
        if (type !== 'all' && type !== dataPool[city][year][i]['變異類型']) {
          continue;
        }
        var f = new ol.Feature({
          geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(dataPool[city][year][i].longitude), parseFloat(dataPool[city][year][i].latitude)])),
          properties: dataPool[city][year][i],
        });
        fc.push(f);
        if (!typeOptions[dataPool[city][year][i]['變異類型']]) {
          typeOptions[dataPool[city][year][i]['變異類型']] = true;
        }
      }
      textOptions = '';
      for (k in typeOptions) {
        textOptions += '<option>' + k + '</option>';
      }
      $('#pointType').html(textOptions).val(type);
      points.getSource().addFeatures(fc);
      map.getView().fit(points.getSource().getExtent());
    })
  } else {
    var fc = [];
    for (i in dataPool[city][year]) {
      if (type !== 'all' && type !== dataPool[city][year][i]['變異類型']) {
        continue;
      }
      var f = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(dataPool[city][year][i].longitude), parseFloat(dataPool[city][year][i].latitude)])),
        properties: dataPool[city][year][i],
      });
      fc.push(f);
      if (!typeOptions[dataPool[city][year][i]['變異類型']]) {
        typeOptions[dataPool[city][year][i]['變異類型']] = true;
      }
    }
    textOptions = '';
    for (k in typeOptions) {
      textOptions += '<option>' + k + '</option>';
    }
    $('#pointType').html(textOptions).val(type);
    points.getSource().addFeatures(fc);
    map.getView().fit(points.getSource().getExtent());
  }
}
showData(selectedCity, selectedYear);

$('.select-filter').change(function () {
  var theCity = $('#pointCity').val();
  var theYear = $('#pointYear').val();
  var theType = $('#pointType').val();
  showData(theCity, theYear, theType);
});

var layerYellow = new ol.style.Style({
  stroke: new ol.style.Stroke({
    color: 'rgba(0,0,0,1)',
    width: 1
  }),
  fill: new ol.style.Fill({
    color: 'rgba(255,255,0,0.3)'
  }),
  text: new ol.style.Text({
    font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
    placement: 'point',
    fill: new ol.style.Fill({
      color: 'blue'
    })
  })
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
    attributions: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
  }),
  opacity: 0.3
});

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.221507, 23.000694]),
  zoom: 13
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

var map = new ol.Map({
  layers: [baseLayer, points],
  target: 'map',
  view: appView
});
map.addControl(sidebar);

new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [positionFeature]
  })
});

var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

map.on('singleclick', function (evt) {
  content.innerHTML = '';
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      var p = feature.getProperties();
      if (p.properties.latitude) {
        var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
        var message = '<table class="table table-dark">';
        message += '<tbody>';
        for (k in p.properties) {
          message += '<tr><th scope="row" style="width: 80px;">' + k + '</th><td>' + p.properties[k] + '</td></tr>';
        }
        message += '<tr><td colspan="2">';
        message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
        message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
        message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
        message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
        message += '</div></td></tr>';
        message += '</tbody></table>';
        sidebarTitle.innerHTML = p.properties['變異類型'];
        content.innerHTML = message;
        sidebar.open('home');
        pointClicked = true;
      }
    }
  });
});