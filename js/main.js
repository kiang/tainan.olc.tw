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
    switch (p.age_type) {
      case 'super-aged': // rate_elder >= 20
        color = 'rgba(120,0,0,0.4)';
        break;
      case 'aged': // rate_elder < 20
        color = 'rgba(120,120,0,0.4)';
        break;
      case 'aging': // rate_elder < 14
        color = 'rgba(120,120,0,0.2)';
        break;
      default: //rate_elder < 7
        color = 'rgba(120,120,0,0)';
    }


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
  zoom: 14
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

var imgFeature = new ol.Feature({
  name: 'kiang',
  geometry: new ol.geom.Point(ol.proj.fromLonLat([120.144, 23.004582])),
});
imgFeature.setStyle(
  new ol.style.Style({
    image: new ol.style.Icon({
      scale: 0.6,
      src: 'img/kiang.png'
    })
  })
);
var imgLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    features: [imgFeature]
  })
});

var map = new ol.Map({
  layers: [baseLayer, theArea, cunli, imgLayer],
  target: 'map',
  view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var previousFeature = false;
var currentFeature = false;
var selectedCunli = '';

var viewCunli = function (cunliId) {
  selectedCunli = cunliId;

  setTimeout(function () {
    $.getJSON('json/cunli/' + cunliId + '.json', function (c) {
      cunli.getSource().forEachFeature(function (f) {
        var fp = f.getProperties();
        if (fp.VILLCODE == selectedCunli) {
          currentFeature = f;
          if (false !== previousFeature) {
            previousFeature.setStyle(cunliStyle(previousFeature));
          }
          currentFeature.setStyle(cunliStyle(currentFeature));
          previousFeature = currentFeature;
        }
      });
      barTitle.html(c.meta.area);
      barContent.html('<canvas id="chart2" height="300"></canvas><canvas id="chart1" height="300"></canvas><canvas id="chart3" height="300"></canvas>');
      const config1 = {
        type: 'bar',
        data: c.chart1,
        options: {
          scales: {
            xAxis: {
              stacked: true
            },
            yAxis: {
              stacked: true
            }
          }
        }
      };
      const config2 = {
        type: 'bar',
        data: c.chart2,
        options: {
          indexAxis: 'y',
          scales: {
            xAxis: {
              stacked: true,
              ticks: {
                callback: (val) => (Math.abs(val))
              }
            },
            yAxis: {
              stacked: true
            }
          }
        }
      };
      const config3 = {
        type: 'line',
        data: c.chart3
      };

      const ctx1 = document.getElementById('chart1').getContext('2d');
      const myChart1 = new Chart(ctx1, config1);

      const ctx2 = document.getElementById('chart2').getContext('2d');
      const myChart2 = new Chart(ctx2, config2);

      const ctx3 = document.getElementById('chart3').getContext('2d');
      const myChart3 = new Chart(ctx3, config3);

      sidebar.open('home');
    });
  }, 500);
};

var routes = {
  '/cunli/:cunliId': viewCunli
};

var router = Router(routes);

router.init();

var barTitle = $('#sidebarTitle');
var barContent = $('#sidebarContent');

map.on('singleclick', function (evt) {
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      var p = feature.getProperties();
      barTitle.html('請點選地圖中的村里');
      barContent.html('請點選地圖中的村里');
      if (p.VILLCODE) {
        currentFeature = feature;
        if (false !== previousFeature) {
          previousFeature.setStyle(cunliStyle(previousFeature));
        }
        currentFeature.setStyle(cunliStyle(currentFeature));
        previousFeature = currentFeature;

        router.setRoute('/cunli/' + p.VILLCODE);
      } else {
        sidebar.open('book');
      }

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
    alert('目前使用的設備無法提供地理資訊');
  }
  return false;
});