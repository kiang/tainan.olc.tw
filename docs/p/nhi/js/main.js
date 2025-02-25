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

function getClusterStyle(feature) {
  var size = feature.get('features').length;
  // Calculate min and max fees
  var minFee = Infinity;
  var maxFee = 0;
  feature.get('features').forEach(function(f) {
    const fee = f.getProperties().normal;
    minFee = Math.min(minFee, fee);
    maxFee = Math.max(maxFee, fee);
  });

  // Determine color based on average fee
  var avgFee = (minFee + maxFee) / 2;
  var color;
  if (avgFee >= 200) {
    color = '#ff0000';
  } else if (avgFee >= 150) {
    color = '#ff9900';
  } else if (avgFee >= 100) {
    color = '#ffdd57';
  } else {
    color = '#48c774';
  }

  var radius = Math.min(25 + size, 50);

  var styles = [
    // Black border style
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius + 2,
        fill: new ol.style.Fill({
          color: '#000000'
        })
      })
    }),
    // Main cluster style with fee range
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius,
        fill: new ol.style.Fill({
          color: color
        }),
        stroke: new ol.style.Stroke({
          color: '#ffffff',
          width: 2
        })
      }),
      text: new ol.style.Text({
        text: size.toString() + '\n' + minFee + '-' + maxFee + '元',
        font: 'bold 14px "Open Sans", "Arial Unicode MS", "sans-serif"',
        fill: new ol.style.Fill({
          color: '#ffffff'
        }),
        stroke: new ol.style.Stroke({
          color: '#000000',
          width: 3
        }),
        textAlign: 'center',
        textBaseline: 'middle'
      })
    })
  ];

  return styles;
}

function pointStyleFunction(f) {
  var p = f.getProperties(), color, stroke, radius;
  var isSelected = f === currentFeature;
  
  // Determine color based on registration fee
  if (p.normal >= 200) {
    color = '#ff0000';
  } else if (p.normal >= 150) {
    color = '#ff9900';
  } else if (p.normal >= 100) {
    color = '#ffdd57';
  } else {
    color = '#48c774';
  }

  // Determine size and stroke based on selection state
  if (isSelected) {
    stroke = new ol.style.Stroke({
      color: '#000000',
      width: 4
    });
    radius = 25;
  } else {
    stroke = new ol.style.Stroke({
      color: '#ffffff',
      width: 2
    });
    radius = 18;
  }

  var styles = [];
  
  // Add outer black border
  styles.push(new ol.style.Style({
    image: new ol.style.Circle({
      radius: radius + 2,
      fill: new ol.style.Fill({
        color: '#000000'
      })
    })
  }));

  // Main marker style
  styles.push(new ol.style.Style({
    image: new ol.style.Circle({
      radius: radius,
      fill: new ol.style.Fill({
        color: color
      }),
      stroke: stroke
    }),
    text: new ol.style.Text({
      text: p.normal + '元',
      font: 'bold 14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      fill: new ol.style.Fill({
        color: '#ffffff'
      }),
      stroke: new ol.style.Stroke({
        color: '#000000',
        width: 3
      }),
      offsetY: -1
    })
  }));

  if (isSelected) {
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius + 6,
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.4)',
          width: 3
        })
      })
    }));
  }

  return styles;
}

var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.221507, 23.000694]),
  zoom: 14
});

var clusterSource = new ol.source.Cluster({
  distance: 40,
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON({
      featureProjection: appView.getProjection()
    })
  })
});

var vectorPoints = new ol.layer.Vector({
  source: clusterSource,
  style: function(feature) {
    var size = feature.get('features').length;
    if (size > 1) {
      return getClusterStyle(feature);
    }
    return pointStyleFunction(feature.get('features')[0]);
  }
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
map.on('singleclick', function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
    return feature;
  });

  if (feature) {
    var features = feature.get('features');
    if (features.length > 1) {
      // If cluster clicked, zoom to extent of features
      var extent = ol.extent.createEmpty();
      features.forEach(function(f) {
        ol.extent.extend(extent, f.getGeometry().getExtent());
      });
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 500
      });
    } else {
      // Single feature clicked
      var f = features[0];
      var p = f.getProperties();
      var targetHash = '#' + p.id;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  }
});

var previousFeature = false;
var currentFeature = false;
function showPoint(pointId) {
  $('#findPoint').val(pointId);
  
  var features = vectorPoints.getSource().getFeatures();
  var pointFound = false;
  
  for (k in features) {
    var clusterFeatures = features[k].get('features');
    // Search through cluster features
    for (var i = 0; i < clusterFeatures.length; i++) {
      var f = clusterFeatures[i];
      var p = f.getProperties();
      if (p.id == pointId) {
        currentFeature = f;
        
        // Update styles for current and previous features
        if (false !== previousFeature) {
          previousFeature.setStyle(pointStyleFunction(previousFeature));
        }
        previousFeature = currentFeature;
        currentFeature.setStyle(pointStyleFunction(currentFeature));
        
        // Center map on the point
        appView.setCenter(f.getGeometry().getCoordinates());
        
        var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
        var message = '<table class="table table-dark">';
        message += '<tbody>';
        message += '<tr><th scope="row" style="width: 100px;">名稱</th><td>';
        message += '<a href="https://info.nhi.gov.tw/INAE1000/INAE1000S03?id=' + p.id + '" target="_blank" class="sidebar-link">' + p.name + '</a>';
        message += '</td></tr>';
        message += '<tr><th scope="row">一般掛號</th><td>' + p.normal + '</td></tr>';
        if (p.emergency > 0) {
          message += '<tr><th scope="row">急診掛號</th><td>' + p.emergency + '</td></tr>';
        }
        message += '<tr><th scope="row">備註</th><td>' + p.note.replace(/\\n/g, '<br />') + '</td></tr>';
        message += '<tr><th scope="row">電話</th><td>' + p.phone + '</td></tr>';
        message += '<tr><th scope="row">住址</th><td>' + p.address + '</td></tr>';
        message += '<tr><td colspan="2">';
        if (p.service_periods != '') {
          var sParts = p.service_periods.split('');
          message += '<table class="table table-bordered text-center" style="color: black;">';
          message += '<thead class="table-dark"><tr><th></th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th><th>日</th></tr></thead><tbody>';
          message += '<tr><td class="table-dark">上</td>';
          for (i = 0; i < 7; i++) {
            if (sParts[i] == 'N') {
              message += '<td class="table-success"><i class="fa fa-check-circle"></i></td>';
            } else {
              message += '<td class="table-danger"><i class="fa fa-times-circle"></i></td>';
            }
          }
          message += '</tr>';
          message += '<tr><td class="table-dark">下</td>';
          for (i = 7; i < 14; i++) {
            if (sParts[i] == 'N') {
              message += '<td class="table-success"><i class="fa fa-check-circle"></i></td>';
            } else {
              message += '<td class="table-danger"><i class="fa fa-times-circle"></i></td>';
            }
          }
          message += '</tr>';
          message += '<tr><td class="table-dark">晚</td>';
          for (i = 14; i < 21; i++) {
            if (sParts[i] == 'N') {
              message += '<td class="table-success"><i class="fa fa-check-circle"></i></td>';
            } else {
              message += '<td class="table-danger"><i class="fa fa-times-circle"></i></td>';
            }
          }
          message += '</tr>';
          message += '</tbody></table>';
        }
        message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
        message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
        message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
        message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
        message += '</div></td></tr>';
        message += '</tbody></table>';
        sidebarTitle.innerHTML = p.name;
        content.innerHTML = message;
        pointFound = true;
        break;
      }
    }
    if (pointFound) break;
  }
  sidebar.open('home');
}

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
    appView.setZoom(17);
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

var pointsFc;
var findTerms = [];
$.getJSON('https://kiang.github.io/info.nhi.gov.tw/geojson/hospitals.json', {}, function(c) {
  pointsFc = c;
  var vSource = clusterSource.getSource();
  var vFormat = vSource.getFormat();
  vSource.addFeatures(vFormat.readFeatures(pointsFc));

  for (k in pointsFc.features) {
    var p = pointsFc.features[k].properties;
    findTerms.push({
      value: p.id,
      label: p.id + ' ' + p.name + ' ' + p.address
    });
  }
  routie(':pointId', showPoint);

  $('#findPoint').autocomplete({
    source: findTerms,
    select: function(event, ui) {
      var targetHash = '#' + ui.item.value;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  });
});
