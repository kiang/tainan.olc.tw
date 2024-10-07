// Initialize the map
var map;
var vectorSource;
var vectorLayer;
var clusterSource;
var clusterLayer;
var overlay;

// Set up the WMTS layer
function setupWMTSLayer() {
    var projection = ol.proj.get('EPSG:3857');
    var projectionExtent = projection.getExtent();
    var size = ol.extent.getWidth(projectionExtent) / 256;
    var resolutions = new Array(20);
    var matrixIds = new Array(20);
    for (var z = 0; z < 20; ++z) {
        resolutions[z] = size / Math.pow(2, z);
        matrixIds[z] = z;
    }

    return new ol.layer.Tile({
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
}

// Set up the TopoJSON vector layer
function setupTopoJSONLayer() {
    return new ol.layer.Vector({
        source: new ol.source.Vector({
            url: 'https://kiang.github.io/taiwan_basecode/city/topo/20230317.json',
            format: new ol.format.TopoJSON(),
            overlaps: false
        }),
        style: new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.2)'
            }),
            stroke: new ol.style.Stroke({
                color: '#319FD3',
                width: 1
            })
        })
    });
}

// Function to create style for markers
function createMarkerStyle(feature) {
    var name = feature.get('name');
    let color = '#ffff00'; // default color
    if (name === '陳亭妃') {
        color = '#d04f95';
    } else if (name === '林俊憲') {
        color = '#7f9c73';
    }

    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({color: color}),
            stroke: new ol.style.Stroke({color: 'white', width: 2})
        }),
        text: new ol.style.Text({
            text: name,
            font: '12px Calibri,sans-serif',
            fill: new ol.style.Fill({color: '#000'}),
            stroke: new ol.style.Stroke({color: '#fff', width: 3}),
            offsetY: -15
        })
    });
}

// Function to create style for clusters
function createClusterStyle(feature) {
    var size = feature.get('features').length;
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 10 + Math.min(size, 20),
            fill: new ol.style.Fill({color: 'rgba(255, 153, 0, 0.8)'}),
            stroke: new ol.style.Stroke({color: '#fff'})
        }),
        text: new ol.style.Text({
            text: size.toString(),
            fill: new ol.style.Fill({color: '#fff'}),
            stroke: new ol.style.Stroke({color: 'rgba(0, 0, 0, 0.6)', width: 3})
        })
    });
}

// Function to filter features
function filterFeatures(feature) {
    var filterValue = document.getElementById('filter-input').value.toLowerCase();
    var name = feature.get('name').toLowerCase();
    return name.includes(filterValue);
}

var originalFeatures = [];
// Function to update the cluster source based on the filter
function updateFilter() {
  if(originalFeatures.length === 0){
    originalFeatures = vectorSource.getFeatures();
  }
    var filteredFeatures = originalFeatures.filter(filterFeatures);
    vectorSource.clear(true);
    vectorSource.addFeatures(filteredFeatures);
    clusterSource.refresh();
}

var points = {};

// Function to fetch CSV data and add markers
function addMarkersFromCSV() {
    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTEzTO4cQ9fO0UXFihhpXsgkakGeNK7gJSU7DKIinsgNahkLyWgdYecGs61OfA8ZpGWn5kEo7T0bp2v/pub?single=true&output=csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').map(row => row.split(','));
            const features = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const lon = parseFloat(row[5]);
                const lat = parseFloat(row[6]);
                const name = row[2];
                const timestamp = row[0];
                const fileUrl = row[1];
                const uuid = row[7]; // Assuming the UUID is in column 8
                let fileId = '';
                
                if (fileUrl) {
                    const match = fileUrl.match(/[-\w]{25,}/);
                    if (match) {
                        fileId = match[0];
                    }
                }

                if (!isNaN(lon) && !isNaN(lat)) {
                    const feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                        name: name,
                        timestamp: timestamp,
                        fileId: fileId,
                        uuid: uuid
                    });
                    features.push(feature);
                    points[uuid] = feature;
                }
            }
            vectorSource.addFeatures(features);
            clusterSource.refresh();

            // Set up routing
    routie({
      'point/:pointId': showPoint
  });
        })
        .catch(error => console.error('Error fetching CSV:', error));
}

function showPoint(pointId) {
    const feature = points[pointId];
    if (feature) {
        const coordinate = feature.getGeometry().getCoordinates();
        map.getView().animate({
            center: coordinate,
            zoom: 16,
            duration: 500
        });
        setTimeout(() => {
            showPopup(feature, coordinate);
        }, 1000);
    }
}

function showPopup(feature, coordinate) {
    var lonLat = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');
    
    var content = '<div class="card">';
    var fileId = feature.get('fileId');
    if (fileId) {
        content += '<div class="card-img-top"><iframe src="https://drive.google.com/file/d/' + fileId + '/preview" width="100%" height="300" allow="autoplay"></iframe></div>';
    }
    content += '<div class="card-body">';
    content += '<h5 class="card-title">' + feature.get('name') + '</h5>';
    content += '<p class="card-text">時間: ' + feature.get('timestamp') + '</p>';
    content += '</div>';

    // Add routing buttons
    content += '<div class="card-footer">';
    content += '<div class="d-grid gap-2">';
    content += '<button class="btn btn-primary btn-sm" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '\', \'_blank\')"><i class="bi bi-google"></i> Google Maps</button>';
    content += '<button class="btn btn-secondary btn-sm" onclick="window.open(\'https://www.bing.com/maps/directions?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '\', \'_blank\')"><i class="bi bi-map"></i> Bing Maps</button>';
    content += '<button class="btn btn-info btn-sm" onclick="window.open(\'https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '\', \'_blank\')"><i class="bi bi-signpost-2"></i> HERE Maps</button>';
    content += '</div>';
    content += '</div>';
    content += '</div>';

    document.getElementById('popup-content').innerHTML = content;
    overlay.setPosition(coordinate);
}

function showEmptyPointPopup(coordinate, city, town) {
    var lonLat = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');
    
    var content = '<div class="card">';
    content += '<div class="card-body">';
    content += '<h5 class="card-title">位置資訊</h5>';
    content += '<p class="card-text">經度: ' + lonLat[0].toFixed(6) + '</p>';
    content += '<p class="card-text">緯度: ' + lonLat[1].toFixed(6) + '</p>';
    content += '<p class="card-text">縣市: ' + (city || 'N/A') + '</p>';
    content += '<p class="card-text">鄉鎮市區: ' + (town || 'N/A') + '</p>';
    content += '</div>';

    // Add button to open Google Form
    var formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeTfx52aNFu9eY-IGU7wn3t1y8iEdBtEqg2FHHJE1_Wuc5xLQ/viewform?usp=pp_url&hl=zh_TW';
    formUrl += '&entry.1588782081=' + encodeURIComponent(city || '');
    formUrl += '&entry.1966779823=' + encodeURIComponent(town || '');
    formUrl += '&entry.1998738256=' + lonLat[0].toFixed(6);
    formUrl += '&entry.1387778236=' + lonLat[1].toFixed(6);
    formUrl += '&entry.2072773208=' + uuidv4(); // Generate a new UUID for each submission

    content += '<div class="card-footer">';
    content += '<div class="d-grid">';
    content += '<button class="btn btn-primary" onclick="window.open(\'' + formUrl + '\', \'_blank\')"><i class="bi bi-plus-circle"></i> 新增看板資訊</button>';
    content += '</div>';
    content += '</div>';
    content += '</div>';

    document.getElementById('popup-content').innerHTML = content;
    overlay.setPosition(coordinate);
}

// Function to generate UUID
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// Initialize the map
function initMap() {
    var emapLayer = setupWMTSLayer();
    var topoJSONLayer = setupTopoJSONLayer();

    vectorSource = new ol.source.Vector();
    clusterSource = new ol.source.Cluster({
        distance: 40,
        source: vectorSource
    });

    clusterLayer = new ol.layer.Vector({
        source: clusterSource,
        style: function(feature) {
            var features = feature.get('features');
            if (!features) {
                // Return a default style if features is undefined
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 5,
                        fill: new ol.style.Fill({color: 'gray'}),
                        stroke: new ol.style.Stroke({color: 'white', width: 1})
                    })
                });
            }
            var size = features.length;
            if (size > 1) {
                return createClusterStyle(feature);
            } else {
                return createMarkerStyle(features[0]);
            }
        }
    });

    // Create a vector layer for the user's location
    positionFeature = new ol.Feature();
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

    var userLocationLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [positionFeature]
        })
    });

    map = new ol.Map({
        target: 'map',
        layers: [emapLayer, topoJSONLayer, clusterLayer, userLocationLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([120.221507, 23.000694]), // Centered on Tainan
            zoom: 12
        })
    });

    // Set up geolocation
    geolocation = new ol.Geolocation({
        projection: map.getView().getProjection(),
        trackingOptions: {
            enableHighAccuracy: true
        }
    });

    // Update the position feature when the position changes
    geolocation.on('change:position', function() {
        var coordinates = geolocation.getPosition();
        positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
    });

    // Add click event listener to the locate button
    document.getElementById('locate-me').addEventListener('click', function() {
        geolocation.setTracking(true); // Start tracking
        geolocation.once('change:position', function() {
            var coordinates = geolocation.getPosition();
            map.getView().animate({
                center: coordinates,
                zoom: 15,
                duration: 1000
            });
            geolocation.setTracking(false); // Stop tracking after centering
        });
    });

    // Add markers from CSV
    addMarkersFromCSV();

    // Add event listener for the filter input
    document.getElementById('filter-input').addEventListener('input', updateFilter);

    // Add map click event
    map.on('singleclick', function(evt) {
        var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
          var p = feature.getProperties();
          if(p.COUNTYNAME) {
            showEmptyPointPopup(evt.coordinate, p.COUNTYNAME, p.TOWNNAME);
          } else {
            var features = feature.get('features');
            if (features && features.length > 1) {
                // Cluster clicked
                var view = map.getView();
                var zoom = view.getZoom();
                view.animate({
                    center: feature.getGeometry().getCoordinates(),
                    zoom: zoom + 1,
                    duration: 250
                });
            } else {
                // Single feature clicked
                var clickedFeature = features ? features[0] : feature;
                var uuid = clickedFeature.get('uuid');
                if (uuid) {
                    // Update the hash and let routie handle it
                    window.location.hash = 'point/' + uuid;
                }
            }
          }
            
        });
    });

    // Create an overlay for the popup
    overlay = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });
    map.addOverlay(overlay);

    // Add a click handler to hide the popup
    document.getElementById('popup-closer').onclick = function() {
        overlay.setPosition(undefined);
        window.location.hash = ''; // Clear hash when closing popup
        return false;
    };

    // Hide popup when zoom changes
    map.getView().on('change:resolution', function() {
        overlay.setPosition(undefined);
    });

    // Add click event listener for readme icon
    document.getElementById('readme-icon').addEventListener('click', function() {
      document.getElementById('readme-popup').style.display = 'block';
    });

    // Add click event listener for readme closer
    document.getElementById('readme-closer').addEventListener('click', function() {
        document.getElementById('readme-popup').style.display = 'none';
    });

}

// Initialize the map when the window loads
window.onload = initMap;