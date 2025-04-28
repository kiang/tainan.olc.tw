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

// Add this at the top with other global variables
var additionalImages = {};

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
    let backgroundColor, textColor;
    if (name === '陳亭妃') {
        backgroundColor = '#d04f95';
        textColor = '#ffffff';
    } else if (name === '林俊憲') {
        backgroundColor = '#7f9c73';
        textColor = '#ffffff';
    } else {
        backgroundColor = '#ffff00';
        textColor = '#000000';
    }

    // Use a fixed radius for all markers
    var radius = 30;

    // Check if the feature has an ID in additionalImages
    const featureId = feature.get('uuid');
    const hasAdditionalImages = featureId && additionalImages[featureId] && additionalImages[featureId].length > 0;

    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: radius,
            fill: new ol.style.Fill({color: backgroundColor}),
            stroke: new ol.style.Stroke({
                color: hasAdditionalImages ? '#0000ff' : '#ffffff',
                width: hasAdditionalImages ? 3 : 2
            })
        }),
        text: new ol.style.Text({
            text: name,
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
    
    // Check if any feature in the cluster has additional images
    var hasAdditionalImages = false;
    var features = feature.get('features');
    
    // Count the occurrences of each marker type
    var nameCounts = {
        '陳亭妃': 0,
        '林俊憲': 0,
        'other': 0
    };
    
    if (features) {
        for (var i = 0; i < features.length; i++) {
            var name = features[i].get('name');
            if (name === '陳亭妃') {
                nameCounts['陳亭妃']++;
            } else if (name === '林俊憲') {
                nameCounts['林俊憲']++;
            } else {
                nameCounts['other']++;
            }
            
            // Check for additional images
            var featureId = features[i].get('uuid');
            if (featureId && additionalImages[featureId] && additionalImages[featureId].length > 0) {
                hasAdditionalImages = true;
            }
        }
    }
    
    // Determine the dominant color based on the most common marker type
    var dominantColor;
    var textColor = '#ffffff'; // Default text color is white
    
    if (nameCounts['陳亭妃'] >= nameCounts['林俊憲'] && nameCounts['陳亭妃'] >= nameCounts['other']) {
        dominantColor = '#d04f95'; // Pink for 陳亭妃
    } else if (nameCounts['林俊憲'] >= nameCounts['陳亭妃'] && nameCounts['林俊憲'] >= nameCounts['other']) {
        dominantColor = '#7f9c73'; // Green for 林俊憲
    } else {
        dominantColor = '#ffff00'; // Yellow for others
        textColor = '#000000'; // Black text for yellow background
    }
    
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: radius,
            fill: new ol.style.Fill({color: dominantColor}),
            stroke: new ol.style.Stroke({
                color: hasAdditionalImages ? '#0000ff' : '#ffffff',
                width: hasAdditionalImages ? 3 : 2
            })
        }),
        text: new ol.style.Text({
            text: size.toString(),
            font: 'bold 14px Arial,sans-serif',
            fill: new ol.style.Fill({color: textColor}),
            stroke: new ol.style.Stroke({color: dominantColor, width: 1}),
            offsetY: 1
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
const nameCounts = {
    '林俊憲': 0,
    '陳亭妃': 0,
    '王定宇': 0,
    '謝龍介': 0,
    '其他': 0
};

// Function to fetch CSV data and add markers
function addMarkersFromCSV() {
    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTEzTO4cQ9fO0UXFihhpXsgkakGeNK7gJSU7DKIinsgNahkLyWgdYecGs61OfA8ZpGWn5kEo7T0bp2v/pub?single=true&output=csv')
        .then(response => response.text())
        .then(data => {
            // Use a CSV parser that handles quoted fields containing newlines
            const parseCSV = (str) => {
                const arr = [];
                let quote = false;
                let col = '';
                let row = [];

                for (let char of str) {
                    if (char === '"') {
                        quote = !quote;
                    } else if (char === ',' && !quote) {
                        row.push(col.trim());
                        col = '';
                    } else if (char === '\n' && !quote) {
                        row.push(col.trim());
                        arr.push(row);
                        row = [];
                        col = '';
                    } else {
                        col += char;
                    }
                }
                if (col) row.push(col.trim());
                if (row.length) arr.push(row);
                return arr;
            };

            const rows = parseCSV(data);
            const features = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const lon = parseFloat(row[5]);
                const lat = parseFloat(row[6]);
                const name = row[2];
                const city = row[3];
                const town = row[4];
                const timestamp = row[0];
                const fileUrl = row[1];
                const uuid = row[7];
                const hasLocal = (row[8] == 1) ? '1' : '0';
                const reply = row[14];
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
                        city: city,
                        town: town,
                        uuid: uuid,
                        hasLocal: hasLocal,
                        reply: reply
                    });
                    features.push(feature);
                    points[uuid] = feature;

                    // Count names
                    let found = false;
                    for(let k in nameCounts){
                        if (name.includes(k)) {
                            nameCounts[k] += 1;
                            found = true;
                        }
                    }
                    if(!found){
                        nameCounts['其他'] += 1;
                    }
                }
            }
            vectorSource.addFeatures(features);
            clusterSource.refresh();

            // Create the pie chart
            createNameChart(nameCounts);

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
        showPopup(feature, coordinate);
    }
}

// Add this function to handle popup expansion
function expandPopup(button) {
    const popup = document.getElementById('popup');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    
    if (!isExpanded) {
        // When expanding
        popup.style.cssText = `
            position: fixed !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            z-index: 2000 !important;
            background-color: rgba(255, 255, 255, 0.95) !important;
            overflow-y: auto !important;
            padding: 20px !important;
        `;
        button.textContent = '收合處理情形';

        // Get the current map center
        const center = map.getView().getCenter();
        overlay.setPosition(center);
    } else {
        // When collapsing
        popup.style.cssText = ''; // Reset all inline styles
        button.textContent = '顯示處理情形';

        // Return to original position
        const feature = points[window.location.hash.split('/')[1]];
        if (feature) {
            overlay.setPosition(feature.getGeometry().getCoordinates());
        }
    }
}

// Add this function to fetch additional images
function fetchAdditionalImages() {
    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS1i3CTbXdGTyTQiTKt5LIFgLXB5mt-RVecYcgiseoND0IZOiVpU4bK9kQ8bXP8NFGIq2OxLF8ITUHC/pub?gid=1036449859&single=true&output=csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').slice(1); // Skip header row
            rows.forEach(row => {
                const [timestamp, fileUrl, name, city, town, lon, lat, id] = row.split(',');
                if (id && fileUrl) {
                    const trimmedId = id.trim();
                    if (!additionalImages[trimmedId]) {
                        additionalImages[trimmedId] = [];
                    }
                    const fileId = fileUrl.match(/[-\w]{25,}/)?.[0];
                    if (fileId) {
                        additionalImages[trimmedId].push({
                            fileId: fileId,
                            timestamp: timestamp
                        });
                    }
                }
            });
            
            // Refresh the markers to apply the blue border to markers with additional images
            refreshMarkers();
        })
        .catch(error => console.error('Error fetching additional images:', error));
}

// Function to refresh markers
function refreshMarkers() {
    // Force the cluster source to refresh
    if (clusterSource) {
        clusterSource.refresh();
    }
    
    // Force the vector layer to refresh if it exists
    if (vectorLayer) {
        vectorLayer.changed();
    }
}

// Modify the showPopup function
function showPopup(feature, coordinate) {
    // Reset popup state
    const popup = document.getElementById('popup');
    popup.style.cssText = '';
    
    var lonLat = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');
    
    var content = '<div class="card">';
    var fileId = feature.get('fileId');
    var hasLocal = feature.get('hasLocal');
    var uuid = feature.get('uuid');
    
    // Display original image
    if(hasLocal == '1'){
        content += '<div class="card-img-top"><img src="pic/' + uuid + '.jpg" width="300"></div>';
    } else if (fileId) {
        content += '<div class="card-img-top"><iframe src="https://drive.google.com/file/d/' + fileId + '/preview" width="100%" height="300" allow="autoplay"></iframe></div>';
    }
    
    // Display additional images if they exist
    if (additionalImages[uuid] && additionalImages[uuid].length > 0) {
        content += '<div class="card-img-top additional-images">';
        content += '<h6 class="text-center mt-2">其他圖片</h6>';
        additionalImages[uuid].forEach((img, index) => {
            content += '<div class="additional-image-container mb-2">';
            content += '<iframe src="https://drive.google.com/file/d/' + img.fileId + '/preview" width="100%" height="200" allow="autoplay"></iframe>';
            content += '<small class="text-muted d-block text-center">' + img.timestamp + '</small>';
            content += '</div>';
        });
        content += '</div>';
    }
    
    // Add button for additional images
    var formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfRKV0gaEcV6ln0_pFBOck-GayKQQeBpfdPir9jHyVyEcJufQ/viewform?usp=pp_url';
    formUrl += '&entry.465818780=' + encodeURIComponent(feature.get('name'));
    formUrl += '&entry.1588782081=' + encodeURIComponent(feature.get('city'));
    formUrl += '&entry.1966779823=' + encodeURIComponent(feature.get('town'));
    formUrl += '&entry.1998738256=' + lonLat[0].toFixed(6);
    formUrl += '&entry.1387778236=' + lonLat[1].toFixed(6);
    formUrl += '&entry.2072773208=' + uuid;
    
    content += '<div class="d-grid gap-2 p-2">';
    content += '<button class="btn btn-outline-primary btn-sm" onclick="window.open(\'' + formUrl + '\', \'_blank\')">';
    content += '<i class="bi bi-plus-circle"></i> 新增圖片</button>';
    content += '</div>';
    
    content += '<div class="card-body">';
    content += '<h5 class="card-title">' + feature.get('name') + '</h5>';
    content += '<p class="card-text">時間: ' + feature.get('timestamp') + '</p>';
    content += '<p class="card-text">縣市: ' + feature.get('city') + '</p>';
    content += '<p class="card-text">鄉鎮市區: ' + feature.get('town') + '</p>';
    
    // Add collapsible reply section if reply exists
    const reply = feature.get('reply');
    if (reply) {
        const replyId = 'reply-' + feature.get('uuid');
        content += '<div class="d-grid gap-2 mt-2">';
        content += '<button class="btn btn-outline-primary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#' + replyId + '" aria-expanded="false">';
        content += '顯示處理情形</button>';
        content += '<div class="collapse" id="' + replyId + '">';
        content += '<div class="card card-body text-break" style="white-space: pre-wrap; max-height: calc(100vh - 400px); overflow-y: auto;">' + reply + '</div>';
        content += '</div></div>';
    }
    
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
    
    // Force the popup to be visible
    popup.style.display = 'block';
    overlay.setPosition(coordinate);

    // Add collapse event handlers after content is added
    if (reply) {
        const replyId = 'reply-' + feature.get('uuid');
        const collapseElement = document.getElementById(replyId);
        const button = collapseElement.previousElementSibling; // Get the button

        // Remove any existing event listeners
        collapseElement.removeEventListener('show.bs.collapse', () => {});
        collapseElement.removeEventListener('hide.bs.collapse', () => {});

        // Add new event listeners
        collapseElement.addEventListener('show.bs.collapse', () => {
            expandPopup(button);
        });

        collapseElement.addEventListener('hide.bs.collapse', () => {
            expandPopup(button);
        });
    }
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

// Add this function to create the bar chart
function createNameChart(data) {
    const ctx = document.getElementById('nameChart').getContext('2d');
    const totalCount = Object.values(data).reduce((sum, count) => sum + count, 0);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: '數量',
                data: Object.values(data),
                backgroundColor: [
                    '#7f9c73',
                    '#d04f95',
                    '#FFCE56',
                    '#0000ff',
                    '#cccccc'
                ],
                borderColor: [
                    '#6a8a5e',
                    '#b03d7a',
                    '#e6b84d',
                    '#0000cc',
                    '#b3b3b3'
                ],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // This makes the bars horizontal
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5, // Fixed aspect ratio for consistent size
            plugins: {
                title: {
                    display: true,
                    text: `總計: ${totalCount}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.raw || 0;
                            let percentage = ((value / totalCount) * 100).toFixed(2);
                            return `${value} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '數量'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '類型'
                    }
                }
            }
        }
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

    // Add event listener for the filter input
    document.getElementById('filter-input').addEventListener('input', updateFilter);

    // Add map click event
    map.on('singleclick', function(evt) {
        let featureFound = false;
        var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
          var p = feature.getProperties();
          if(p.COUNTYNAME && !featureFound) {
            showEmptyPointPopup(evt.coordinate, p.COUNTYNAME, p.TOWNNAME);
            window.location.hash = ''; // Clear hash when showing empty point popup
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
        const popup = document.getElementById('popup');
        popup.style.cssText = ''; // Reset popup styles
        overlay.setPosition(undefined);
        window.location.hash = ''; // Clear hash when closing popup
        return false;
    };

    // Hide popup when zoom changes
    map.getView().on('change:resolution', function() {
        overlay.setPosition(undefined);
    });

    // Add click event listener for the readme icon
    document.getElementById('readme-icon').addEventListener('click', function() {
      document.getElementById('readme-popup').style.display = 'block';
    });

    // Add click event listener for readme closer
    document.getElementById('readme-closer').addEventListener('click', function() {
        document.getElementById('readme-popup').style.display = 'none';
    });

    // Call this function in your initMap function or wherever you initialize your page
    initCoordinatesModal();

    // Fetch additional images after all layers are initialized
    setTimeout(function() {
        fetchAdditionalImages();
    }, 1000);
}

// Initialize the map when the window loads
window.onload = initMap;