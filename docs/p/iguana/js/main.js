// Initialize the map
var map;
var vectorSource;
var vectorLayer;
var clusterSource;
var clusterLayer;
var overlay;
var coordinatesModal;
const inputCoordinatesBtn = document.getElementById('input-coordinates');
const coordinatesInput = document.getElementById('coordinatesInput');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const zoomToCoordinatesBtn = document.getElementById('zoomToCoordinates');

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
    var type = feature.get('type');
    let backgroundColor, textColor;
    let labelText = '其他';
    
    if (type.includes('活體')) {
        backgroundColor = '#ff0000';
        textColor = '#ffffff';
        labelText = '活體';
    } else if (type.includes('屍體')) {
        backgroundColor = '#000000';
        textColor = '#ffffff';
        labelText = '屍體';
    } else if (type.includes('洞穴')) {
        backgroundColor = '#8b4513';
        textColor = '#ffffff';
        labelText = '洞穴';
    } else {
        backgroundColor = '#ffff00';
        textColor = '#000000';
    }

    // Determine the radius based on the matched label length
    var radius = Math.max(30, labelText.length * 5);

    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: radius,
            fill: new ol.style.Fill({color: backgroundColor}),
            stroke: new ol.style.Stroke({color: '#ffffff', width: 2})
        }),
        text: new ol.style.Text({
            text: labelText,
            font: 'bold 14px Arial,sans-serif',
            fill: new ol.style.Fill({color: textColor}),
            stroke: new ol.style.Stroke({color: backgroundColor, width: 1}),
            offsetY: 1
        })
    });
}

// Function to create style for clusters
function createClusterStyle(feature) {
    var size = feature.get('features').length;
    var radius = Math.min(40, 20 + Math.sqrt(size) * 3);
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: radius,
            fill: new ol.style.Fill({color: 'rgba(0, 123, 255, 0.8)'}),
            stroke: new ol.style.Stroke({color: '#ffffff', width: 2})
        }),
        text: new ol.style.Text({
            text: size.toString(),
            font: 'bold 14px Arial,sans-serif',
            fill: new ol.style.Fill({color: '#ffffff'}),
            stroke: new ol.style.Stroke({color: 'rgba(0, 123, 255, 0.8)', width: 1}),
            offsetY: 1
        })
    });
}

var points = {};

// Function to fetch CSV data and add markers
function addMarkersFromCSV() {
    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0-THrBko7oSZiDCkGUdz_7OU68wJJcdLk1lhsj7TAi7I_QxevDg4XX3-2mW4g_aEWvdAbnPPQ83-u/pub?single=true&output=csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').map(row => row.split(','));
            const features = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const lon = parseFloat(row[5]);
                const lat = parseFloat(row[6]);
                const type = row[2];
                const city = row[3];
                const town = row[4];
                const timestamp = row[0];
                const fileUrl = row[1];
                const uuid = row[7].trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
                const hasLocal = (row[8] == 1) ? '1' : '0';
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
                        type: type,
                        timestamp: timestamp,
                        fileId: fileId,
                        city: city,
                        town: town,
                        uuid: uuid,
                        hasLocal: hasLocal
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
    console.log(points);
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
    var hasLocal = feature.get('hasLocal');
    if(hasLocal == '1') {
        content += '<div class="card-img-top"><img src="pic/' + feature.get('uuid') + '.jpg" width="100%" height="300"></div>';
    } else if (fileId) {
        content += '<div class="card-img-top"><iframe src="https://drive.google.com/file/d/' + fileId + '/preview" width="100%" height="300" allow="autoplay"></iframe></div>';
    }
    content += '<div class="card-body">';
    content += '<h5 class="card-title">' + feature.get('type') + '</h5>';
    content += '<p class="card-text">時間: ' + feature.get('timestamp') + '</p>';
    content += '<p class="card-text">縣市: ' + feature.get('city') + '</p>';
    content += '<p class="card-text">鄉鎮市區: ' + feature.get('town') + '</p>';
    content += '<p class="card-text">備註: ' + (feature.get('note') || '無') + '</p>';
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
    content += '<p class="card-text">縣市: ' + (city || '') + '</p>';
    content += '<p class="card-text">鄉鎮市區: ' + (town || '') + '</p>';
    content += '</div>';

    // Add button to open Google Form
    var formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdO6bIo9jC5Sh3iW8KiYVxFfFEFuiFV8mmX9yxKQDXs9EbbGA/viewform?usp=pp_url&hl=zh_TW';
    formUrl += '&entry.1588782081=' + encodeURIComponent(city || '');
    formUrl += '&entry.1966779823=' + encodeURIComponent(town || '');
    formUrl += '&entry.1998738256=' + lonLat[0].toFixed(6);
    formUrl += '&entry.1387778236=' + lonLat[1].toFixed(6);
    formUrl += '&entry.2072773208=' + uuidv4();

    content += '<div class="card-footer">';
    content += '<div class="d-grid">';
    content += '<button class="btn btn-primary" onclick="window.open(\'' + formUrl + '\', \'_blank\')"><i class="bi bi-plus-circle"></i> 新增綠鬣蜥資訊</button>';
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

// Add this function to parse coordinates
function parseCoordinates(input) {
    const parts = input.split(',').map(part => part.trim());
    if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
            return { latitude: lat, longitude: lon };
        }
    }
    return null;
}

// Add this to your initMap function or wherever you initialize your page
function initCoordinatesModal() {
    coordinatesModal = new bootstrap.Modal(document.getElementById('coordinatesModal'));

    inputCoordinatesBtn.addEventListener('click', () => {
        coordinatesInput.value = '';
        latitudeInput.value = '';
        longitudeInput.value = '';
        coordinatesModal.show();
    });

    coordinatesInput.addEventListener('input', function() {
        const coords = parseCoordinates(this.value);
        if (coords) {
            latitudeInput.value = coords.latitude;
            longitudeInput.value = coords.longitude;
        } else {
            latitudeInput.value = '';
            longitudeInput.value = '';
        }
    });

    zoomToCoordinatesBtn.addEventListener('click', () => {
        const latitude = parseFloat(latitudeInput.value);
        const longitude = parseFloat(longitudeInput.value);

        if (isNaN(latitude) || isNaN(longitude)) {
            alert('請輸入有效的緯度和經度');
            return;
        }

        const coordinates = ol.proj.fromLonLat([longitude, latitude]);
        map.getView().animate({
            center: coordinates,
            zoom: 18,
            duration: 1000
        }, () => {
            // This callback function runs after the animation is complete
            // Trigger a single click event at the specified coordinates
            const pixel = map.getPixelFromCoordinate(coordinates);
            
            // Dispatch the click event on the map's viewport
            map.dispatchEvent({
                type: 'singleclick',
                coordinate: coordinates,
                pixel: pixel
            });
        });

        coordinatesModal.hide();
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

    // Add map click event
    map.on('singleclick', function(evt) {
        let featureFound = false;
        map.forEachFeatureAtPixel(evt.pixel, function(feature) {
          var p = feature.getProperties();
          if(p.COUNTYNAME && !featureFound) {
            showEmptyPointPopup(evt.coordinate, p.COUNTYNAME, p.TOWNNAME);
          } else {
            featureFound = true;
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
        document.getElementById('readme-popup').style.display = 'none';
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

    // Call this function in your initMap function or wherever you initialize your page
    initCoordinatesModal();

}

// Initialize the map when the window loads
window.onload = initMap;

