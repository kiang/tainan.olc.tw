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

function extraPointStyleFunction(feature, isHover = false) {
  var properties = feature.getProperties();
  var isSelected = feature === currentFeature;
  
  // Determine radius and stroke based on state
  var radius = isSelected ? 18 : (isHover ? 15 : 12);
  var strokeWidth = isSelected ? 4 : (isHover ? 3 : 2);
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

  // Main marker style (white)
  styles.push(new ol.style.Style({
    image: new ol.style.Circle({
      radius: radius,
      fill: new ol.style.Fill({
        color: '#ffffff'
      }),
      stroke: new ol.style.Stroke({
        color: '#000000',
        width: strokeWidth
      })
    }),
    text: new ol.style.Text({
      text: properties.level,
      font: 'bold 12px "Open Sans", "Arial Unicode MS", "sans-serif"',
      fill: new ol.style.Fill({
        color: '#000000'
      }),
      stroke: new ol.style.Stroke({
        color: '#ffffff',
        width: 3
      }),
      offsetY: -1
    })
  }));

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

var extraVectorSource = new ol.source.Vector({
  url: 'https://kiang.github.io/info.nhi.gov.tw/geojson/er_extra.json',
  format: new ol.format.GeoJSON()
});

var extraVectorLayer = new ol.layer.Vector({
  source: extraVectorSource,
  style: extraPointStyleFunction
});

var map = new ol.Map({
  layers: [baseLayer, extraVectorLayer, vectorLayer],
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
    
    // Update current feature and refresh layers
    if (currentFeature !== feature) {
      currentFeature = feature;
      vectorLayer.changed();
      extraVectorLayer.changed();
    }
    
    var popupContent = '<div class="table-responsive"><table class="table table-sm">';
    
    if (props.hasOwnProperty('inform')) {
      // Original ER data
      var dateStr = props.date ? moment(props.date.replace('T', ' ')).format('YYYY-MM-DD HH:mm:ss') : '';
      popupContent += '<tr><th colspan="2" class="text-center">' + props.name + '</th></tr>';
      popupContent += '<tr><td>通報滿載</td><td>' + (props.inform === 'Y' ? '是' : '否') + '</td></tr>';
      popupContent += '<tr><td>等待看診</td><td>' + (props.wait_see || '0') + '</td></tr>';
      popupContent += '<tr><td>等待推床</td><td>' + (props.wait_bed || '0') + '</td></tr>';
      popupContent += '<tr><td>等待住院</td><td>' + (props.wait_general || '0') + '</td></tr>';
      popupContent += '<tr><td>等待加護病房</td><td>' + (props.wait_icu || '0') + '</td></tr>';
      popupContent += '<tr><td>更新時間</td><td>' + dateStr + '</td></tr>';
    } else {
      // Extra ER data
      popupContent += '<tr><th colspan="2" class="text-center">' + props.醫院全名 + '</th></tr>';
      popupContent += '<tr><td>區域別</td><td>' + props.區域別 + '</td></tr>';
      popupContent += '<tr><td>縣市別</td><td>' + props.縣市別 + '</td></tr>';
      popupContent += '<tr><td>緊急醫療能力分級</td><td>' + props.緊急醫療能力分級 + '</td></tr>';
      if (props.公告日) {
        popupContent += '<tr><td>公告日</td><td>' + props.公告日 + '</td></tr>';
      }
      if (props.效期) {
        popupContent += '<tr><td>效期</td><td>' + props.效期 + '</td></tr>';
      }
    }
    
    popupContent += '</table></div>';
    
    content.innerHTML = popupContent;
    overlay.setPosition(coordinates);
  } else {
    // Clear selection when clicking outside markers
    if (currentFeature) {
      currentFeature = null;
      vectorLayer.changed();
      extraVectorLayer.changed();
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

// Function to calculate and display wait status statistics
function calculateWaitStats() {
  const features = vectorSource.getFeatures();
  
  let waitSeeTotal = 0;
  let waitBedTotal = 0;
  let waitGeneralTotal = 0;
  let waitIcuTotal = 0;
  let hospitalCount = 0;
  
  features.forEach(function(feature) {
    const props = feature.getProperties();
    if (props.hasOwnProperty('inform')) {
      hospitalCount++;
      waitSeeTotal += parseInt(props.wait_see) || 0;
      waitBedTotal += parseInt(props.wait_bed) || 0;
      waitGeneralTotal += parseInt(props.wait_general) || 0;
      waitIcuTotal += parseInt(props.wait_icu) || 0;
    }
  });
  
  return {
    waitSeeTotal,
    waitBedTotal,
    waitGeneralTotal,
    waitIcuTotal,
    hospitalCount
  };
}

// Function to display statistics in modal
function displayStats() {
  const stats = calculateWaitStats();
  
  // Update modal content with stats
  document.getElementById('hospitalCount').textContent = stats.hospitalCount;
  document.getElementById('waitSeeTotal').textContent = stats.waitSeeTotal;
  document.getElementById('waitBedTotal').textContent = stats.waitBedTotal;
  document.getElementById('waitGeneralTotal').textContent = stats.waitGeneralTotal;
  document.getElementById('waitIcuTotal').textContent = stats.waitIcuTotal;
  
  // Update timestamp
  const updateTime = document.getElementById('updateTime');
  updateTime.textContent = `資料更新時間：${moment().format('YYYY-MM-DD HH:mm:ss')}`;
  
  // Show modal
  const modal = document.getElementById('statsModal');
  modal.style.display = 'flex';
  
  // Add animation class for highlight effect
  setTimeout(() => {
    const statsItems = document.querySelectorAll('.stats-item');
    statsItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.animation = 'pulse 0.6s ease-in-out';
      }, index * 100);
    });
  }, 300);
}

// Function to hide statistics modal
function hideStats() {
  const modal = document.getElementById('statsModal');
  modal.style.display = 'none';
}

// Add event listeners for modal functionality
document.addEventListener('DOMContentLoaded', function() {
  const showStatsBtn = document.getElementById('showStatsBtn');
  const statsModal = document.getElementById('statsModal');
  const statsClose = document.getElementById('statsClose');
  
  if (showStatsBtn) {
    showStatsBtn.addEventListener('click', function() {
      // Wait for data to load if not already loaded
      if (vectorSource.getFeatures().length === 0) {
        vectorSource.once('change', function() {
          if (vectorSource.getState() === 'ready') {
            displayStats();
          }
        });
      } else {
        displayStats();
      }
    });
  }
  
  // Close modal when clicking close button
  if (statsClose) {
    statsClose.addEventListener('click', hideStats);
  }
  
  // Close modal when clicking outside content area
  if (statsModal) {
    statsModal.addEventListener('click', function(e) {
      if (e.target === statsModal) {
        hideStats();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && statsModal.style.display === 'flex') {
      hideStats();
    }
  });
});
