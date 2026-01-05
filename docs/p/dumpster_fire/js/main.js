// Initialize the map
var map;
var vectorSource;
var vectorLayer;
var clusterSource;
var clusterLayer;
var overlay;
var coordinatesModal;
var geolocation;
var positionFeature;

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
            url: 'json/tainan.json',
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

// Category colors for different fire types
const categoryColors = {
    '公有掩埋場': '#e74c3c',
    '公有臨時堆置場': '#e67e22',
    '私有回收場': '#f1c40f',
    '私有臨時堆置場': '#27ae60',
    '私有農地工廠': '#3498db',
    '其他廠房': '#9b59b6'
};

// Function to create style for markers
function createMarkerStyle(feature) {
    var category = feature.get('category') || '其他';
    var backgroundColor = categoryColors[category] || categoryColors['其他'];

    // Check if the feature has an ID in additionalImages
    const featureId = feature.get('uuid');
    const hasAdditionalImages = featureId && additionalImages[featureId] && additionalImages[featureId].length > 0;

    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 22,
            fill: new ol.style.Fill({color: backgroundColor}),
            stroke: new ol.style.Stroke({
                color: hasAdditionalImages ? '#0000ff' : '#ffffff',
                width: hasAdditionalImages ? 3 : 2
            })
        }),
        text: new ol.style.Text({
            text: '🔥',
            font: '20px sans-serif',
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

    // Count the occurrences of each category type
    var categoryCounts = {};

    if (features) {
        for (var i = 0; i < features.length; i++) {
            var category = features[i].get('category') || '其他';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;

            // Check for additional images
            var featureId = features[i].get('uuid');
            if (featureId && additionalImages[featureId] && additionalImages[featureId].length > 0) {
                hasAdditionalImages = true;
            }
        }
    }

    // Determine the dominant color based on the most common category
    var dominantCategory = '其他';
    var maxCount = 0;
    for (var cat in categoryCounts) {
        if (categoryCounts[cat] > maxCount) {
            maxCount = categoryCounts[cat];
            dominantCategory = cat;
        }
    }
    var dominantColor = categoryColors[dominantCategory] || categoryColors['其他'];

    return [
        new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({color: dominantColor}),
                stroke: new ol.style.Stroke({
                    color: hasAdditionalImages ? '#0000ff' : '#ffffff',
                    width: hasAdditionalImages ? 3 : 2
                })
            }),
            text: new ol.style.Text({
                text: '🔥',
                font: (radius * 0.8) + 'px sans-serif',
                offsetY: -4
            })
        }),
        new ol.style.Style({
            text: new ol.style.Text({
                text: size.toString(),
                font: 'bold ' + Math.max(12, radius * 0.4) + 'px Arial,sans-serif',
                fill: new ol.style.Fill({color: '#ffffff'}),
                stroke: new ol.style.Stroke({color: '#000000', width: 3}),
                offsetY: 8
            })
        })
    ];
}

// Function to filter features
function filterFeatures(feature) {
    var filterValue = document.getElementById('filter-input').value.toLowerCase();
    var category = (feature.get('category') || '').toLowerCase();
    var description = (feature.get('description') || '').toLowerCase();
    var town = (feature.get('town') || '').toLowerCase();
    return category.includes(filterValue) || description.includes(filterValue) || town.includes(filterValue);
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
const categoryCounts = {
    '公有掩埋場': 0,
    '公有臨時堆置場': 0,
    '私有回收場': 0,
    '私有臨時堆置場': 0,
    '私有農地工廠': 0,
    '其他廠房': 0
};

// Function to fetch additional images using PapaParse
function fetchAdditionalImages() {
    return new Promise((resolve, reject) => {
        // TODO: Replace with actual Google Sheets URL for additional images
        // For now, resolve immediately with no additional images
        resolve();
    });
}

// Function to fetch CSV data and add markers using PapaParse
function addMarkersFromCSV() {
    return new Promise((resolve, reject) => {
        // Columns: Timestamp, 照片, 類型, 新聞報導連結, 市府回應, 縣市, 鄉鎮市區, 經度, 緯度, 地點編號, 開始日期, 結束日期
        Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vR_tdklyNWGZpPb1EKaQXx2JQQYPuMr7iT8jcJVE-tER3QfCnArWGtCHz9LakrAZ9NXnVAe_BUmMZse/pub?gid=287726231&single=true&output=csv', {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: function(results) {
                const features = [];

                // Skip header row (index 0)
                for (let i = 1; i < results.data.length; i++) {
                    const row = results.data[i];
                    const timestamp = row[0];
                    const fileUrl = row[1];
                    const category = row[2] || '其他廠房';
                    const newsLink = row[3] || '';
                    const reply = row[4] || '';
                    const city = row[5];
                    const town = row[6];
                    const lon = parseFloat(row[7]);
                    const lat = parseFloat(row[8]);
                    const uuid = row[9];
                    const startDate = row[10] || '';
                    const endDate = row[11] || '';
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
                            category: category,
                            timestamp: timestamp,
                            fileId: fileId,
                            city: city,
                            town: town,
                            uuid: uuid,
                            newsLink: newsLink,
                            reply: reply,
                            startDate: startDate,
                            endDate: endDate
                        });
                        features.push(feature);
                        points[uuid] = feature;

                        // Count categories
                        if (categoryCounts.hasOwnProperty(category)) {
                            categoryCounts[category] += 1;
                        } else {
                            categoryCounts['其他廠房'] += 1;
                        }
                    }
                }
                vectorSource.addFeatures(features);
                clusterSource.refresh();

                // Create the chart
                createCategoryChart(categoryCounts);

                // Set up routing
                routie({
                    'point/:pointId': showPoint
                });

                resolve();
            },
            error: function(error) {
                console.error('Error fetching CSV:', error);
                // Create empty chart even on error
                createCategoryChart(categoryCounts);
                resolve();
            }
        });
    });
}

function showPoint(pointId) {
    const feature = points[pointId];
    if (feature) {
        const coordinate = feature.getGeometry().getCoordinates();
        showPopup(feature, coordinate);
    }
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
    var uuid = feature.get('uuid');

    // Display original image
    if (fileId) {
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
    var formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScTOu1GWPBWaV1TnmkIsJEiV-ZNW-nFvH5T9WH0YKDM2YqWaA/viewform?usp=pp_url';
    formUrl += '&entry.8069441=' + encodeURIComponent(feature.get('city'));
    formUrl += '&entry.329095753=' + encodeURIComponent(feature.get('town'));
    formUrl += '&entry.878731854=' + lonLat[0].toFixed(6);
    formUrl += '&entry.158869420=' + lonLat[1].toFixed(6);
    formUrl += '&entry.1072963415=' + uuid;

    content += '<div class="d-grid gap-2 p-2">';
    content += '<button class="btn btn-outline-primary btn-sm" onclick="window.open(\'' + formUrl + '\', \'_blank\')">';
    content += '<i class="bi bi-plus-circle"></i> 新增圖片</button>';
    content += '</div>';

    var categoryColor = categoryColors[feature.get('category')] || categoryColors['其他廠房'];
    content += '<div class="card-body">';
    content += '<h5 class="card-title"><span class="badge" style="background-color:' + categoryColor + '">' + feature.get('category') + '</span></h5>';
    content += '<p class="card-text">縣市: ' + feature.get('city') + '</p>';
    content += '<p class="card-text">鄉鎮市區: ' + feature.get('town') + '</p>';

    // Display fire dates
    var startDate = feature.get('startDate');
    var endDate = feature.get('endDate');
    if (startDate) {
        if (endDate && endDate !== startDate) {
            content += '<p class="card-text"><i class="bi bi-calendar-range"></i> 發爐期間: ' + startDate + ' ~ ' + endDate + '</p>';
        } else {
            content += '<p class="card-text"><i class="bi bi-calendar-event"></i> 發爐日期: ' + startDate + '</p>';
        }
    }

    // Display news links (may have multiple URLs separated by line breaks)
    var newsLink = feature.get('newsLink');
    if (newsLink) {
        var links = newsLink.split(/[\r\n]+/).filter(function(link) {
            return link.trim().length > 0;
        });
        if (links.length > 0) {
            content += '<div class="card-text"><i class="bi bi-newspaper"></i> 新聞報導連結:';
            content += '<ul class="list-unstyled ms-3 mb-0">';
            links.forEach(function(link, index) {
                link = link.trim();
                content += '<li><a href="' + link + '" target="_blank">' + (links.length > 1 ? '連結 ' + (index + 1) : link.substring(0, 30) + '...') + '</a></li>';
            });
            content += '</ul></div>';
        }
    }

    // Add collapsible reply section if reply exists
    const reply = feature.get('reply');
    if (reply) {
        const replyId = 'reply-' + feature.get('uuid');
        content += '<div class="d-grid gap-2 mt-2">';
        content += '<button class="btn btn-outline-primary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#' + replyId + '" aria-expanded="false">';
        content += '顯示市府回應</button>';
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
}

function showEmptyPointPopup(coordinate, city, town) {
    var lonLat = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');

    var content = '<div class="card">';
    content += '<div class="card-body">';
    content += '<h5 class="card-title">位置資訊</h5>';
    content += '<p class="card-text">經度: ' + lonLat[0].toFixed(6) + '</p>';
    content += '<p class="card-text">緯度: ' + lonLat[1].toFixed(6) + '</p>';
    if (city) {
        content += '<p class="card-text">縣市: ' + city + '</p>';
    }
    if (town) {
        content += '<p class="card-text">鄉鎮市區: ' + town + '</p>';
    }
    content += '</div>';

    // Add button to open Google Form
    var formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScTOu1GWPBWaV1TnmkIsJEiV-ZNW-nFvH5T9WH0YKDM2YqWaA/viewform?usp=pp_url';
    if (city) {
        formUrl += '&entry.8069441=' + encodeURIComponent(city);
    }
    if (town) {
        formUrl += '&entry.329095753=' + encodeURIComponent(town);
    }
    formUrl += '&entry.878731854=' + lonLat[0].toFixed(6);
    formUrl += '&entry.158869420=' + lonLat[1].toFixed(6);
    formUrl += '&entry.1072963415=' + uuidv4();

    content += '<div class="card-footer">';
    content += '<div class="d-grid">';
    content += '<button class="btn btn-primary" onclick="window.open(\'' + formUrl + '\', \'_blank\')"><i class="bi bi-plus-circle"></i> 新增廢棄物發爐事件</button>';
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
function createCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const totalCount = Object.values(data).reduce((sum, count) => sum + count, 0);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: '數量',
                data: Object.values(data),
                backgroundColor: Object.keys(data).map(k => categoryColors[k] || categoryColors['其他']),
                borderColor: Object.keys(data).map(k => {
                    const color = categoryColors[k] || categoryColors['其他'];
                    return color;
                }),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
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
                            let percentage = totalCount > 0 ? ((value / totalCount) * 100).toFixed(2) : 0;
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
            const pixel = map.getPixelFromCoordinate(coordinates);

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
        geolocation.setTracking(true);
        geolocation.once('change:position', function() {
            var coordinates = geolocation.getPosition();
            map.getView().animate({
                center: coordinates,
                zoom: 15,
                duration: 1000
            });
            geolocation.setTracking(false);
        });
    });

    // Add markers from CSV and fetch additional images
    Promise.all([
        fetchAdditionalImages(),
        addMarkersFromCSV()
    ]).then(() => {
        refreshMarkers();
    });

    // Add event listener for the filter input
    document.getElementById('filter-input').addEventListener('input', updateFilter);

    // Add click event listener to the map
    map.on('singleclick', function(evt) {
        let markerClicked = false;
        let cityInfo = { city: '', town: '' };

        // First pass: check for markers/clusters and collect city info from TopoJSON
        map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            var p = feature.getProperties();

            // Check if this is a TopoJSON feature (has COUNTYNAME)
            if (p.COUNTYNAME) {
                cityInfo.city = p.COUNTYNAME;
                cityInfo.town = p.TOWNNAME || '';
                return;
            }

            // Check if this is a marker/cluster feature
            var features = feature.get('features');
            if (features) {
                markerClicked = true;
                if (features.length > 1) {
                    // Cluster clicked - zoom in
                    var view = map.getView();
                    var zoom = view.getZoom();
                    view.animate({
                        center: feature.getGeometry().getCoordinates(),
                        zoom: zoom + 1,
                        duration: 250
                    });
                } else {
                    // Single feature clicked
                    var clickedFeature = features[0];
                    var uuid = clickedFeature.get('uuid');
                    if (uuid) {
                        window.location.hash = 'point/' + uuid;
                    }
                }
                return true;
            }
        });

        // If no marker was clicked, show the empty point popup
        if (!markerClicked) {
            showEmptyPointPopup(evt.coordinate, cityInfo.city, cityInfo.town);
            window.location.hash = '';
        }

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
        popup.style.cssText = '';
        overlay.setPosition(undefined);
        window.location.hash = '';
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
}

// Initialize the map when the window loads
window.onload = initMap;
