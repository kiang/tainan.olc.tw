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

var activeFilters = {
  type: '',
  age: ''
};

function pointStyleFunction(f) {
  var p = f.getProperties().properties, color, stroke, radius;
  
  // Type filter
  if(activeFilters.type && schools[p.key]['類型'] !== activeFilters.type) {
    return null;
  }

  // Age filter
  switch(activeFilters.age) {
    case 2:
      if(!schools[p.key]['招生']['2歲'] || schools[p.key]['招生']['2歲'] == 0) {
        return null;
      }
      break;
    case 3:
      if(!schools[p.key]['招生']['3歲'] || schools[p.key]['招生']['3歲'] == 0) {
        return null;
      }
      break;
    case 4:
      if(!schools[p.key]['招生']['4歲'] || schools[p.key]['招生']['4歲'] == 0) {
        return null;
      }
      break;
    case 5:
      if(!schools[p.key]['招生']['5歲'] || schools[p.key]['招生']['5歲'] == 0) {
        return null;
      }
      break;
    case '3-5':
      if(!schools[p.key]['招生']['3-5歲'] || schools[p.key]['招生']['3-5歲'] == 0) {
        return null;
      }
      break;
  }
  if (f === currentFeature) {
    stroke = new ol.style.Stroke({
      color: '#000',
      width: 5
    });
    radius = 25;
  } else {
    stroke = new ol.style.Stroke({
      color: '#fff',
      width: 2
    });
    radius = 15;
  }

  if (p.count > 5) {
    color = '#48c774';
  } else if (p.count > 0) {
    color = '#ffdd57';
  } else {
    color = '#f00';
  }
  return new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: radius,
      points: 3,
      fill: new ol.style.Fill({
        color: color
      }),
      stroke: stroke
    })
  })
}
var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.221507, 23.000694]),
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
  opacity: 0.8
});

var map = new ol.Map({
  layers: [baseLayer, vectorPoints],
  target: 'map',
  view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var previousFeature = false;
var currentFeature = false;

// Create a reusable function to show school details
function showSchoolDetails(feature) {
  currentFeature = feature;
  currentFeature.setStyle(pointStyleFunction(currentFeature));
  if (false !== previousFeature) {
    previousFeature.setStyle(pointStyleFunction(previousFeature));
  }
  previousFeature = currentFeature;
  
  appView.setCenter(feature.getGeometry().getCoordinates());
  appView.setZoom(15);
  
  var p = feature.getProperties();
  var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
  var downloadLink = (schools[p.properties.key]['簡章下載']) ? '<a href="' + schools[p.properties.key]['簡章下載'] + '" target="_blank">下載</a>' : '';
  var message = '<table class="table table-dark">';
  message += '<tbody>';
  message += '<tr><th scope="row" style="width: 80px;">名稱</th><td>' + schools[p.properties.key]['幼兒園名稱'] + '</td></tr>';
  message += '<tr><th scope="row">電話</th><td>' + schools[p.properties.key]['幼兒園電話'] + '</td></tr>';
  message += '<tr><th scope="row">住址</th><td>' + schools[p.properties.key]['幼兒園住址'] + '</td></tr>';
  message += '<tr><th scope="row">招生簡章</th><td>' + downloadLink + '</td></tr>';
  for (k in schools[p.properties.key]['招生']) {
    message += '<tr><th scope="row">' + k + '</th><td>'
    message += schools[p.properties.key]['招生'][k];
    message += '</td></tr>';
  }
  message += '<tr><td colspan="2">';
  if(schools[p.properties.key]['類型'] == '準公共') {
    message += '* 準公共幼兒園名額僅供參考，因為尚未公告最終餘額';
  }
  message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
  message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
  message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
  message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
  message += '</div></td></tr>';
  message += '</tbody></table>';
  sidebarTitle.innerHTML = schools[p.properties.key]['幼兒園名稱'];
  content.innerHTML = message;
  sidebar.open('home');
  
  return true;
}

map.on('singleclick', function (evt) {
  content.innerHTML = '';
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      pointClicked = showSchoolDetails(feature);
    }
  });
});

var schools = {};
$.getJSON('https://kiang.github.io/kid.tn.edu.tw/result.json', {}, function (c) {
  // Convert array to object with keys
  c.forEach(school => {
    schools[school['幼兒園名稱']] = school;
  });

  // Setup autocomplete
  var searchData = [];
  for (let k in schools) {
    searchData.push({
      label: schools[k]['幼兒園名稱'],
      value: k,
      phone: schools[k]['幼兒園電話'],
      address: schools[k]['幼兒園住址']
    });
  }

  $('#schoolSearch').autocomplete({
    source: function(request, response) {
      var term = request.term.toLowerCase();
      var matches = searchData.filter(item => 
        item.label.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.address.toLowerCase().includes(term)
      );
      response(matches.slice(0, 10)); // Limit to 10 results
    },
    select: function(event, ui) {
      // Find and highlight the selected school on the map
      vectorPoints.getSource().getFeatures().forEach(function(feature) {
        if (feature.get('properties').key === ui.item.value) {
          showSchoolDetails(feature);
        }
      });
    }
  }).autocomplete("instance")._renderItem = function(ul, item) {
    // Custom rendering of autocomplete items
    return $("<li>")
      .append("<div><strong>" + item.label + "</strong><br>" +
              "<small>電話: " + item.phone + "<br>" +
              "地址: " + item.address + "</small></div>")
      .appendTo(ul);
  };

  var features = [];
  var stat = {};
  for (k in schools) {
    var count = 0;
    for (j in schools[k]['招生']) {
      // Convert string values to integers
      var available = parseInt(schools[k]['招生'][j]) || 0;
      count += available;
      
      if(!stat[j]) {
        stat[j] = {
          total: 0,
          available: 0
        };
      }
      stat[j].total += available;
      stat[j].available += available;
    }
    var f = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([
        parseFloat(schools[k].longitude), 
        parseFloat(schools[k].latitude)
      ])),
      properties: {
        key: k,
        count: count
      }
    });
    features.push(f);
  }
  vectorPoints.getSource().addFeatures(features);

  var message = '報名概況<table class="table table-boarded"><tr><th>類型</th><th>剩餘名額</th><th>可招生名額</th></tr>';
  for(k in stat) {
    message += '<tr><td>' + k + '</td><td>' + stat[k].available + '</td><td>' + stat[k].total + '</td></tr>';
  }
  message += '</table>';
  $('#statContent').html(message);
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
    //appView.setCenter(coordinates);
  } else {
    alert('目前使用的設備無法提供地理資訊');
  }
  return false;
});

$('#btn-age2').click(function () {
  activeFilters.age = 2;
  vectorPoints.getSource().refresh();
  $('.age-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-age3').click(function () {
  activeFilters.age = 3;
  vectorPoints.getSource().refresh();
  $('.age-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-age4').click(function () {
  activeFilters.age = 4;
  vectorPoints.getSource().refresh();
  $('.age-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-age5').click(function () {
  activeFilters.age = 5;
  vectorPoints.getSource().refresh();
  $('.age-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-age-all').click(function () {
  activeFilters.age = '';
  vectorPoints.getSource().refresh();
  $('.age-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-age3-5').click(function () {
  activeFilters.age = '3-5';
  vectorPoints.getSource().refresh();
  $('.age-group .btn').removeClass('active');
  $(this).addClass('active');
});

// Add floating filter buttons
var filterButtonsHtml = `
<div id="type-filter-buttons" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
  <div class="btn-group type-group" role="group">
    <button id="btn-type-all" class="btn btn-secondary active">全部</button>
    <button id="btn-type-public" class="btn btn-secondary">公幼</button>
    <button id="btn-type-semi" class="btn btn-secondary">準公共</button>
    <button id="btn-type-nonprofit" class="btn btn-secondary">非營利</button>
  </div>
</div>`;

$('body').append(filterButtonsHtml);

// Update type filter click handlers
$('#btn-type-all').click(function() {
  activeFilters.type = '';
  vectorPoints.getSource().refresh();
  $('.type-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-type-public').click(function() {
  activeFilters.type = '公幼';
  vectorPoints.getSource().refresh();
  $('.type-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-type-semi').click(function() {
  activeFilters.type = '準公共';
  vectorPoints.getSource().refresh();
  $('.type-group .btn').removeClass('active');
  $(this).addClass('active');
});

$('#btn-type-nonprofit').click(function() {
  activeFilters.type = '非營利';
  vectorPoints.getSource().refresh();
  $('.type-group .btn').removeClass('active');
  $(this).addClass('active');
});
