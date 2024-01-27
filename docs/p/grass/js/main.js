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
var cunliList = ['63000040032', '68000020036', '65000060020', '64000040016', '63000020030', '65000080015', '10013010060', '63000110026', '68000060010', '63000040035', '66000040004', '63000020024', '68000100029', '68000040030', '68000010079', '66000050004', '64000120049', '67000360011', '67000330039', '67000340044', '67000370042', '67000370048', '68000060019', '67000110008', '10005020018', '67000350020', '65000070017', '67000310039', '10004010025', '67000280020', '64000180001', '64000040016', '68000020073', '67000360017', '63000100024', '66000270032', '10007210006', '68000070010'];

function areaStyleFunction(f) {
  var p = f.getProperties(), color, stroke, z = map.getView().getZoom();
  if (f === currentFeature) {
    stroke = new ol.style.Stroke({
      color: 'rgba(255,0,0,0.5)',
      width: 10
    });
  } else {
    stroke = new ol.style.Stroke({
      color: '#666',
      width: 2
    });

  }
  color = 'rgba(29,168,165,0)';
  if (cunliList.indexOf(p.VILLCODE) > -1) {
    color = 'rgba(29,168,165,0.7)';
  }

  let areaStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: color
    }),
    stroke: stroke,
    text: new ol.style.Text({
      font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      fill: new ol.style.Fill({
        color: 'rgba(0,155,0,1)'
      }),
      stroke: new ol.style.Stroke({
        color: '#fff',
        width: 5
      })
    })
  });
  if (z > 12 && p.VILLNAME) {
    areaStyle.getText().setText(p.TOWNNAME + p.VILLNAME);
  }

  return areaStyle;
}
var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
  center: ol.proj.fromLonLat([121.530427, 24.060817]),
  zoom: 12
});


var vectorAreas = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'https://kiang.github.io/taiwan_basecode/cunli/topo/20230317.json',
    format: new ol.format.TopoJSON()
  }),
  style: areaStyleFunction
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
  layers: [baseLayer, vectorAreas],
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
      pointClicked = true;
      var p = feature.getProperties();
      if (!p.VILLCODE) {
        return;
      }
      console.log(p);
      var cunliName = p.COUNTYNAME + p.TOWNNAME + p.VILLNAME;
      sidebarTitle.innerHTML = '報名 ' + cunliName;
      currentFeature = false;
      if (false !== previousFeature) {
        previousFeature.setStyle(areaStyleFunction(previousFeature));
      }
      $('#sidebarContent').append('<iframe src="https://docs.google.com/forms/d/e/1FAIpQLScwF6GlY0YVijDRRyZSzYUojpdfFH7Pcaa0_-vFMZYSUaWNnA/viewform?usp=pp_url&entry.1998738256=' + cunliName + '&entry.1387778236=' + p.VILLCODE + '&embedded=true" height="1200" frameborder="0" marginheight="0" marginwidth="0" style="width: 100%;">Loading…</iframe>');
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
      sidebar.open('home');
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