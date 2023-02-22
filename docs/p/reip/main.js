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
        url: 'http://wmts.nlsc.gov.tw/wmts',
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
    opacity: 0.3
});

var parkStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'rgba(193, 255, 7, 1)',
        width: 1
    }),
    fill: new ol.style.Fill({
        color: 'rgba(35, 255, 7, 0.5)'
    })
});

var wetlandStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'rgba(255, 193, 7, 1)',
        width: 1
    }),
    fill: new ol.style.Fill({
        color: 'rgba(255, 35, 7, 0.5)'
    })
});

var animalStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'rgba(255, 193, 255, 1)',
        width: 1
    }),
    fill: new ol.style.Fill({
        color: 'rgba(255, 35, 255, 0.5)'
    })
});

var sunStyle = new ol.style.Style({
  stroke: new ol.style.Stroke({
      color: 'rgba(200, 200, 10, 1)',
      width: 1
  }),
  fill: new ol.style.Fill({
      color: 'rgba(255, 255, 7, 0.5)'
  })
});

var sunPlanStyle = new ol.style.Style({
  stroke: new ol.style.Stroke({
      color: 'rgba(0, 0, 255, 1)',
      width: 1
  }),
  fill: new ol.style.Fill({
      color: 'rgba(150, 150, 7, 0.5)'
  })
});

var park = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'json/park.json',
        format: new ol.format.GeoJSON()
    }),
    style: parkStyle
});

var parkLand = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'json/park_land.json',
        format: new ol.format.GeoJSON()
    }),
    style: parkStyle
});

var wetland = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'json/base.json',
        format: new ol.format.GeoJSON()
    }),
    style: wetlandStyle
});

var animal = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'json/animal.json',
        format: new ol.format.GeoJSON()
    }),
    style: animalStyle
});

var sunProj = new ol.layer.Vector({
  source: new ol.source.Vector({
      url: 'json/reip.json',
      format: new ol.format.GeoJSON()
  }),
  style: sunStyle
});

var sunPlanProj = new ol.layer.Vector({
  source: new ol.source.Vector({
      url: 'json/plan.json',
      format: new ol.format.GeoJSON()
  }),
  style: sunPlanStyle
});

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.071507, 23.094694]),
  zoom: 14
});

var geolocation = new ol.Geolocation({
  projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function(error) {
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

geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
});

new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [positionFeature]
  })
});

var source = new ol.source.Vector();

var vector = new ol.layer.Vector({
  source: source,
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: '#ffcc33',
      width: 2
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#ffcc33'
      })
    })
  })
});


/**
 * Currently drawn feature.
 * @type {ol.Feature}
 */
var sketch;


/**
 * The help tooltip element.
 * @type {Element}
 */
var helpTooltipElement;


/**
 * Overlay to show the help messages.
 * @type {ol.Overlay}
 */
var helpTooltip;


/**
 * The measure tooltip element.
 * @type {Element}
 */
var measureTooltipElement;


/**
 * Overlay to show the measurement.
 * @type {ol.Overlay}
 */
var measureTooltip;


/**
 * Message to show when the user is drawing a polygon.
 * @type {string}
 */
var continuePolygonMsg = '點選來繪製多邊形';


/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */
var continueLineMsg = '點選來劃線';


/**
 * Handle pointer move.
 * @param {ol.MapBrowserEvent} evt The event.
 */
var pointerMoveHandler = function(evt) {
  if (evt.dragging) {
    return;
  }
  /** @type {string} */
  var helpMsg = '點選後開始拉線';

  if (sketch) {
    var geom = (sketch.getGeometry());
    if (geom instanceof ol.geom.Polygon) {
      helpMsg = continuePolygonMsg;
    } else if (geom instanceof ol.geom.LineString) {
      helpMsg = continueLineMsg;
    }
  }

  helpTooltipElement.innerHTML = helpMsg;
  helpTooltip.setPosition(evt.coordinate);

  helpTooltipElement.classList.remove('hidden');
};

var map = new ol.Map({
  layers: [baseLayer, sunPlanProj, sunProj, wetland, vector, park, parkLand, animal],
  target: 'map',
  view: appView
});
map.addControl(sidebar);

var content = document.getElementById('sidebarContent');
map.on('singleclick', function(evt) {
  content.innerHTML = '';
  clickedCoordinate = evt.coordinate;

  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    var message = '';
    var p = feature.getProperties();
    for(k in p) {
      if(k !== 'geometry') {
        message += k + ': ' + p[k] + '<br />';
      }
    }

    content.innerHTML += message + '<hr />';
  });

  sidebar.open('home');
});

var typeSelect = 'line';

var draw; // global so we can remove it later


/**
 * Format length output.
 * @param {ol.geom.LineString} line The line.
 * @return {string} The formatted length.
 */
var formatLength = function(line) {
  var length = ol.Sphere.getLength(line);
  var output;
  if (length > 100) {
    output = (Math.round(length / 1000 * 100) / 100) +
        ' ' + 'km';
  } else {
    output = (Math.round(length * 100) / 100) +
        ' ' + 'm';
  }
  return output;
};


/**
 * Format area output.
 * @param {ol.geom.Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
var formatArea = function(polygon) {
  var area = ol.Sphere.getArea(polygon);
  var output;
  if (area > 10000) {
    output = (Math.round(area / 1000000 * 100) / 100) +
        ' ' + 'km<sup>2</sup>';
  } else {
    output = (Math.round(area * 100) / 100) +
        ' ' + 'm<sup>2</sup>';
  }
  return output;
};

function addInteraction() {
  var type = (typeSelect == 'area' ? 'Polygon' : 'LineString');
  draw = new ol.interaction.Draw({
    source: source,
    type: type,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.7)'
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        })
      })
    })
  });
  map.addInteraction(draw);

  createMeasureTooltip();
  createHelpTooltip();

  var listener;
  draw.on('drawstart',
      function(evt) {
        // set sketch
        sketch = evt.feature;

        /** @type {ol.Coordinate|undefined} */
        var tooltipCoord = evt.coordinate;

        listener = sketch.getGeometry().on('change', function(evt) {
          var geom = evt.target;
          var output;
          if (geom instanceof ol.geom.Polygon) {
            output = formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
          } else if (geom instanceof ol.geom.LineString) {
            output = formatLength(geom);
            tooltipCoord = geom.getLastCoordinate();
          }
          measureTooltipElement.innerHTML = output;
          measureTooltip.setPosition(tooltipCoord);
        });
      }, this);

  draw.on('drawend',
      function() {
        measureTooltipElement.className = 'tooltip tooltip-static';
        measureTooltip.setOffset([0, -7]);
        // unset sketch
        sketch = null;
        // unset tooltip so that a new one can be created
        measureTooltipElement = null;
        createMeasureTooltip();
        ol.Observable.unByKey(listener);
      }, this);
}


/**
 * Creates a new help tooltip
 */
function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'tooltip hidden';
  helpTooltip = new ol.Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left'
  });
  map.addOverlay(helpTooltip);
}


/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'tooltip tooltip-measure';
  measureTooltip = new ol.Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  map.addOverlay(measureTooltip);
}

$('a.btnLine').click(function(event) {
  event.preventDefault();
  typeSelect = 'line';
  map.removeInteraction(draw);
  addInteraction();
  map.on('pointermove', pointerMoveHandler);
  map.getViewport().addEventListener('mouseout', function() {
    helpTooltipElement.classList.add('hidden');
  });
})

$('a.btnArea').click(function(event) {
  event.preventDefault();
  typeSelect = 'area';
  map.removeInteraction(draw);
  addInteraction();
  map.on('pointermove', pointerMoveHandler);
  map.getViewport().addEventListener('mouseout', function() {
    helpTooltipElement.classList.add('hidden');
  });
})
