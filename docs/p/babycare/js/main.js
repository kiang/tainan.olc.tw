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

function pointStyleFunction(f) {
  var p = f.getProperties(), color, stroke, radius, fPoints = 3;
  if (f === currentFeature) {
    stroke = new ol.style.Stroke({
      color: 'rgba(255,0,255,0.5)',
      width: 10
    });
    radius = 35;
    fPoints = 5;
  } else {
    stroke = new ol.style.Stroke({
      color: '#fff',
      width: 2
    });

    radius = 20;
  }
  if(p.is_active != true){
    color = '#cccccc';
  } else if (p.capacity > p.status) {
    color = '#48c774';
  } else {
    color = '#ffdd57';
  }
  let pointStyle = new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: radius,
      points: fPoints,
      fill: new ol.style.Fill({
        color: color
      }),
      stroke: stroke
    }),
    text: new ol.style.Text({
      font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      fill: new ol.style.Fill({
        color: 'rgba(0,0,255,0.7)'
      })
    })
  });
  pointStyle.getText().setText(p.status.toString() + '/' + p.capacity.toString());
  return pointStyle;
}
var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('infoBox');

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.221507, 23.000694]),
  zoom: 14
});

var vectorSource = new ol.source.Vector({
  format: new ol.format.GeoJSON({
    featureProjection: appView.getProjection()
  })
});

var vectorPoints = new ol.layer.Vector({
  source: vectorSource,
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
  layers: [baseLayer, vectorPoints],
  target: 'map',
  view: appView
});

map.addControl(sidebar);
var pointClicked = false;
map.on('singleclick', function (evt) {
  // Check if the click is on an ad iframe
  const clickedElement = document.elementFromPoint(evt.pixel[0], evt.pixel[1]);
  if (clickedElement && (clickedElement.tagName === 'IFRAME' || clickedElement.closest('iframe'))) {
    return; // Ignore clicks on ad iframes
  }

  content.innerHTML = '';
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      var p = feature.getProperties();
      var targetHash = '#' + p.id;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      pointClicked = true;
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

function showPoint(pointId) {
  firstPosDone = true;
  $('#findPoint').val('');
  var features = vectorPoints.getSource().getFeatures();
  for (k in features) {
    var p = features[k].getProperties();
    if (p.id === pointId) {
      currentFeature = features[k];
      features[k].setStyle(pointStyleFunction(features[k]));
      if (false !== previousFeature) {
        previousFeature.setStyle(pointStyleFunction(previousFeature));
      }
      previousFeature = currentFeature;
      appView.setCenter(features[k].getGeometry().getCoordinates());
      appView.setZoom(15);
      var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());

      $.getJSON('https://kiang.github.io/ncwisweb.sfaa.gov.tw/data/' + p.city + '/' + p.id + '.json', {}, function (c) {
        console.log(c);
        var message = '<table class="table table-dark">';
        message += '<tbody>';
        message += '<tr><th scope="row" style="width: 100px;">機構名稱</th><td><a href="https://ncwisweb.sfaa.gov.tw/home/childcare-center/detail/' + c['id'] + '" target="_blank">' + c['機構名稱'] + '</a></td></tr>';
        message += '<tr><th scope="row">負責人姓名</th><td>' + c['負責人姓名'] + '</td></tr>';
        message += '<tr><th scope="row">聯絡電話</th><td>' + c['聯絡電話'] + '</td></tr>';
        message += '<tr><th scope="row">所在地</th><td>' + c['所在地'] + '</td></tr>';
        message += '<tr><th scope="row">核定收托</th><td>' + c['核定收托'] + '</td></tr>';
        message += '<tr><th scope="row">實際收托</th><td>' + c['實際收托'] + '</td></tr>';
        message += '<tr><th scope="row">最近一次評鑑年度</th><td>' + c['最近一次評鑑年度'] + '</td></tr>';
        message += '<tr><th scope="row">評鑑等級</th><td>' + c['評鑑等級'] + '</td></tr>';
        message += '<tr><th scope="row">總面積</th><td>' + c['總面積'] + '</td></tr>';
        message += '<tr><th scope="row">室內面積</th><td>' + c['室內面積'] + '</td></tr>';
        message += '<tr><th scope="row">室外面積</th><td>' + c['室外面積'] + '</td></tr>';
        message += '<tr><th scope="row">公共安全說明</th><td>' + c['公共安全說明'] + '</td></tr>';
        message += '<tr><th scope="row">消防安全說明</th><td>' + c['消防安全說明'] + '</td></tr>';
        message += '<tr><th scope="row">準公共化資格</th><td>' + c['準公共化資格'] + '</td></tr>';
        message += '<tr><th scope="row">核備工作人員數</th><td>';
        for (k in c['核備工作人員數']) {
          message += k + ' ' + c['核備工作人員數'][k] + '人<br />';
        }
        message += '</td></tr>';
        message += '<tr><th scope="row" colspan="2">收費情形</th></tr><tr><td colspan="2">';
        for (k1 in c['收費情形']) {
          message += k1 + '<ul>';
          for (k2 in c['收費情形'][k1]) {
            message += '<li>' + c['收費情形'][k1][k2]['費用名稱'] + ': ' + c['收費情形'][k1][k2]['費用金額'];
            if (c['收費情形'][k1][k2]['費用說明'] != '') {
              message += ' (' + c['收費情形'][k1][k2]['費用說明'] + ')';
            }
            message += '</li>';
          }

          message += '</ul>';
        }
        message += '</td></tr>';
        message += '<tr><th scope="row" colspan="2">退費說明</th></tr><tr><td colspan="2"><p style="white-space: pre-line">' + c['退費說明'] + '</p></td></tr>';
        message += '<tr><td colspan="2">';
        message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
        message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
        message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
        message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
        message += '</div></td></tr>';
        message += '</tbody></table>';
        sidebarTitle.innerHTML = c['機構名稱'];
        content.innerHTML = message;
      });
    }
  }
  sidebar.open('home');
}

var pointsFc;
var adminTree = {};
var findTerms = [];
$.getJSON('https://kiang.github.io/ncwisweb.sfaa.gov.tw/babycare.json', {}, function (c) {
  pointsFc = c;
  var vFormat = vectorSource.getFormat();
  vectorSource.addFeatures(vFormat.readFeatures(pointsFc));

  for (k in pointsFc.features) {
    var p = pointsFc.features[k].properties;
    findTerms.push({
      value: p.id,
      label: p.name + ' ' + p.address
    });
  }

  routie(':pointId', showPoint);
  routie('pos/:lng/:lat', showPos);

  $('#findPoint').autocomplete({
    source: findTerms,
    select: function (event, ui) {
      var targetHash = '#' + ui.item.value;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  });
});