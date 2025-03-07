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
  var p = f.getProperties(), color, stroke, radius, fPoints = 3, z = map.getView().getZoom();
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
    if (z <= 12) {
      radius = 10;
    }
  }
  color = '#ffff00';

  let pointStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: radius,
      fill: new ol.style.Fill({
        color: color
      }),
      stroke: stroke
    }),
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
    pointStyle.getText().setText(p.title);
  }

  return pointStyle;
}
var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
  center: ol.proj.fromLonLat([121.530427, 25.060817]),
  zoom: 14
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
  opacity: 1
});

var map = new ol.Map({
  layers: [baseLayer, vectorPoints],
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

map.on('singleclick', function (evt) {
  clickedCoordinate = ol.proj.toLonLat(evt.coordinate);
  content.innerHTML = '';
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      var p = feature.getProperties();
      var targetHash = '#point/' + p.id;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      pointClicked = true;
      newFeature.setStyle(null);
    }
  });
  setTimeout(() => {
    if (false === pointClicked) {
      window.location.hash = '';
      sidebarTitle.innerHTML = '提供新的政績';
      currentFeature = false;
      if (false !== previousFeature) {
        previousFeature.setStyle(pointStyleFunction(previousFeature));
      }
      $('#sidebarContent').append('<iframe src="https://docs.google.com/forms/d/e/1FAIpQLSeCIRhBx_HWfQKR3W03rJs5WQiUiF9Vs3GK0H9jUzdLWnXrGg/viewform?usp=pp_url&entry.1998738256=' + clickedCoordinate[0] + '&entry.1387778236=' + clickedCoordinate[1] + '&entry.2072773208=' + uuidv4() + '&embedded=true" height="1200" frameborder="0" marginheight="0" marginwidth="0" style="width: 100%;">Loading…</iframe>');
      newFeature.setStyle(new ol.style.Style({
        image: new ol.style.RegularShape({
          radius: 15,
          points: 3,
          fill: new ol.style.Fill({
            color: '#CC9900'
          }),
          stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2
          })
        })
      }));
      newFeature.setGeometry(new ol.geom.Point(ol.proj.fromLonLat(clickedCoordinate)));
    }
    sidebar.open('home');
  }, 500);
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
  // if (false === firstPosDone) {
  //   appView.setCenter(coordinates);
  //   firstPosDone = true;
  // }
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
  var features = vectorPoints.getSource().getFeatures();
  var pointFound = false;
  for (k in features) {
    var p = features[k].getProperties();
    if (p.id === pointId) {
      pointFound = true;
      currentFeature = features[k];
      features[k].setStyle(pointStyleFunction(features[k]));
      if (false !== previousFeature) {
        previousFeature.setStyle(pointStyleFunction(previousFeature));
      }
      previousFeature = currentFeature;
      appView.setCenter(features[k].getGeometry().getCoordinates());
      appView.setZoom(15);
      var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
      var message = '<table class="table table-dark">';
      message += '<tbody>';
      message += '<tr><th scope="row">政績</th><td>' + p.title + '</td></tr>';
      message += '<tr><th scope="row">介紹</th><td>' + p.description + '</td></tr>';
      message += '<tr><th scope="row">更新時間</th><td>' + p.time + '</td></tr>';
      message += '<tr><td colspan="2">';
      message += '<div class="btn-group-vertical" role="group" style="width: 100%;">';
      message += '<input type="button" class="btn btn-info btn-lg btn-block" data-id="' + p.id + '" id="btn-update" value="更新這個地點" />';
      message += '</div>';
      message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
      message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
      message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
      message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
      message += '</div></td></tr>';
      message += '</tbody></table>';

      sidebarTitle.innerHTML = p.title;
      content.innerHTML = message;
      $('input#btn-update').click(function (e) {
        var p = currentFeature.getProperties();
        e.preventDefault();
        $(this).parent().html('<iframe src="https://docs.google.com/forms/d/e/1FAIpQLSeCIRhBx_HWfQKR3W03rJs5WQiUiF9Vs3GK0H9jUzdLWnXrGg/viewform?usp=pp_url&entry.1998738256=' + p.longitude + '&entry.1387778236=' + p.latitude + '&entry.2072773208=' + p.id + '&embedded=true" height="1200" frameborder="0" marginheight="0" marginwidth="0" style="width: 100%;">Loading…</iframe>');
      });
    }
  }
  sidebar.open('home');
}

var points = {};

$.get('data/base.csv', {}, function (bc) {
  var baseLines = $.csv.toArrays(bc);
  for (k in baseLines) {
    points[baseLines[k][0]] = {
      'id': baseLines[k][0],
      'title': baseLines[k][3],
      'description': baseLines[k][4],
      'longitude': parseFloat(baseLines[k][2]),
      'latitude': parseFloat(baseLines[k][1]),
      'time': ''
    };
  }
  $.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vRgNribTcOIVfqJXJNMD2VhlEBYoC3PLwvSBtrzwSZ0Jiu02PYTwd2LxnhPbbAPATLABOYTRzwo1Am9/pub?output=csv', {}, function (c) {
    var lines = $.csv.toArrays(c);
    lines.shift();
    for (k in lines) {
      if (!lines[k][2] || Number.isNaN(lines[k][2])) {
        continue;
      }
      var key = lines[k][4];
      if (!points[key]) {
        points[key] = {
          'id': key,
          'title': lines[k][1],
          'description': lines[k][2],
          'longitude': parseFloat(lines[k][3]),
          'latitude': parseFloat(lines[k][4]),
          'time': lines[k][0]
        };
      } else {
        points[key]['title'] = lines[k][1];
        points[key]['description'] = lines[k][2];
        points[key]['time'] = lines[k][0];
      }
    }
    var pointsFc = [];
    for (k in points) {
      var pointFeature = new ol.Feature({
        geometry: new ol.geom.Point(
          ol.proj.fromLonLat([points[k].longitude, points[k].latitude])
        )
      });
      pointFeature.setProperties(points[k]);
      pointsFc.push(pointFeature);
    }
    if (pointsFc.length > 0) {
      vectorPoints.getSource().addFeatures(pointsFc);
    }

    routie('point/:pointId', showPoint);
    routie('pos/:lng/:lat', showPos);
  });
})

// ref https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}