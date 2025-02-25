var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
  resolutions[z] = size / Math.pow(2, z);
  matrixIds[z] = z;
}

var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var currentFeature = null;

// Animation frame for pulsing effect
var frameState = 0;
function animate() {
  frameState = (frameState + 1) % 60;
  if (currentFeature) {
    vectorLayer.changed();
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

var overlay = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

closer.onclick = function() {
  overlay.setPosition(undefined);
  if (currentFeature) {
    currentFeature = null;
    vectorLayer.changed();
  }
  closer.blur();
  return false;
};

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

function pointStyleFunction(feature, isHover = false) {
  var properties = feature.getProperties();
  var isSelected = feature === currentFeature;
  
  // Determine radius and stroke based on state
  var radius = isSelected ? 18 : (isHover ? 15 : 12);
  var strokeWidth = isSelected ? 4 : (isHover ? 3 : 2);
  var styles = [];
  
  // Add outer black border for better contrast
  if (properties.inform === 'Y') {
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius + 2,
        fill: new ol.style.Fill({
          color: '#000000'
        })
      })
    }));
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius,
        fill: new ol.style.Fill({
          color: '#ff0000'
        }),
        stroke: new ol.style.Stroke({
          color: '#000000',
          width: strokeWidth
        })
      })
    }));
  } else if (properties.wait_see > 0 || 
      properties.wait_bed > 0 || 
      properties.wait_general > 0 || 
      properties.wait_icu > 0) {
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius + 2,
        fill: new ol.style.Fill({
          color: '#000000'
        })
      })
    }));
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius,
        fill: new ol.style.Fill({
          color: '#ffdd57'
        }),
        stroke: new ol.style.Stroke({
          color: '#000000',
          width: strokeWidth
        })
      })
    }));
  } else {
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius + 2,
        fill: new ol.style.Fill({
          color: '#000000'
        })
      })
    }));
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius,
        fill: new ol.style.Fill({
          color: '#48c774'
        }),
        stroke: new ol.style.Stroke({
          color: '#000000',
          width: strokeWidth
        })
      })
    }));
  }

  // Add highlight effect for selected state
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

var vectorSource = new ol.source.Vector({
  url: 'https://kiang.github.io/info.nhi.gov.tw/geojson/er.json',
  format: new ol.format.GeoJSON()
});

var vectorLayer = new ol.layer.Vector({
  source: vectorSource,
  style: pointStyleFunction
});

var map = new ol.Map({
  layers: [baseLayer, vectorLayer],
  overlays: [overlay],
  target: 'map',
  view: new ol.View({
    center: ol.proj.fromLonLat([120.221507, 23.000694]),
    zoom: 8
  })
});

map.on('singleclick', function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
    return feature;
  });
  
  if (feature) {
    var coordinates = feature.getGeometry().getCoordinates();
    var props = feature.getProperties();
    
    // Update current feature and refresh layer
    if (currentFeature !== feature) {
      currentFeature = feature;
      vectorLayer.changed();
    }
    
    // Format the date by replacing 'T' with space before parsing
    var dateStr = props.date ? moment(props.date.replace('T', ' ')).format('YYYY-MM-DD HH:mm:ss') : '';
    
    var popupContent = '<div class="table-responsive"><table class="table table-sm">';
    popupContent += '<tr><th colspan="2" class="text-center">' + props.name + '</th></tr>';
    popupContent += '<tr><td>通報滿載</td><td>' + (props.inform === 'Y' ? '是' : '否') + '</td></tr>';
    popupContent += '<tr><td>等待看診</td><td>' + (props.wait_see || '0') + '</td></tr>';
    popupContent += '<tr><td>等待推床</td><td>' + (props.wait_bed || '0') + '</td></tr>';
    popupContent += '<tr><td>等待住院</td><td>' + (props.wait_general || '0') + '</td></tr>';
    popupContent += '<tr><td>等待加護病房</td><td>' + (props.wait_icu || '0') + '</td></tr>';
    popupContent += '<tr><td>更新時間</td><td>' + dateStr + '</td></tr>';
    popupContent += '</table></div>';
    
    content.innerHTML = popupContent;
    overlay.setPosition(coordinates);
  } else {
    // Clear selection when clicking outside markers
    if (currentFeature) {
      currentFeature = null;
      vectorLayer.changed();
    }
  }
});

// Update hover interaction with new style
var hoverInteraction = new ol.interaction.Select({
  condition: ol.events.condition.pointerMove,
  style: function(feature) {
    return pointStyleFunction(feature, true);
  }
});

map.addInteraction(hoverInteraction);

// Handle geolocation
var geolocation = new ol.Geolocation({
  projection: map.getView().getProjection(),
  trackingOptions: {
    enableHighAccuracy: true
  }
});

geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  if (coordinates) {
    map.getView().setCenter(coordinates);
    map.getView().setZoom(15);
  }
});

// Add geolocation button
var locationButton = document.createElement('button');
locationButton.innerHTML = '定位';
locationButton.className = 'btn btn-info';
locationButton.style.position = 'fixed';
locationButton.style.top = '10px';
locationButton.style.right = '10px';
locationButton.style.zIndex = '1000';

locationButton.addEventListener('click', function() {
  geolocation.setTracking(true);
});

document.body.appendChild(locationButton);
