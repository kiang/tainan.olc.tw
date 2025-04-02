let map;
let vectorSource;
let clusterSource;
let overlay;
let highlightedIndex = null;
let searchResults = [];
let currentSpiderFeatures = null;
let points = {};
const photoData = {};
let fishFarmLayer = null;

// Add spider layout function
function calculateSpiderPositions(center, count, radius = 40) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        const x = center[0] + radius * Math.cos(angle);
        const y = center[1] + radius * Math.sin(angle);
        positions.push([x, y]);
    }
    return positions;
}

// Modify createMarkerStyle to handle spider state
function createMarkerStyle(feature, highlighted = false, isSpider = false) {
    const color = highlighted ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 204, 0, 0.8)';
    const strokeColor = highlighted ? '#cc0000' : '#cc9900';
    
    const styles = [
        new ol.style.Style({
            image: new ol.style.Circle({
                radius: 12,
                fill: new ol.style.Fill({ color: color }),
                stroke: new ol.style.Stroke({
                    color: strokeColor,
                    width: 2
                })
            })
        })
    ];

    if (isSpider) {
        // Add line to original position
        const originalPosition = feature.get('originalGeometry').getCoordinates();
        const currentPosition = feature.getGeometry().getCoordinates();
        
        styles.unshift(new ol.style.Style({
            geometry: new ol.geom.LineString([originalPosition, currentPosition]),
            stroke: new ol.style.Stroke({
                color: strokeColor,
                width: 1
            })
        }));
    }

    return styles;
}

function createClusterStyle(feature) {
    const size = feature.get('features').length;
    const hasHighlighted = feature.get('features').some(f => 
        (f.get('申請年度') + f.get('項次')) === highlightedIndex
    );
    
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 20,
            fill: new ol.style.Fill({
                color: hasHighlighted ? 'rgba(255, 100, 0, 0.8)' : 'rgba(255, 153, 0, 0.8)'
            }),
            stroke: new ol.style.Stroke({
                color: hasHighlighted ? '#cc3300' : '#cc6600',
                width: 2
            })
        }),
        text: new ol.style.Text({
            text: size.toString(),
            font: 'bold 14px Arial',
            fill: new ol.style.Fill({color: '#fff'}),
            stroke: new ol.style.Stroke({
                color: hasHighlighted ? '#cc3300' : '#cc6600',
                width: 2
            }),
            offsetY: 1
        })
    });
}

function highlightFeatures(index) {
    highlightedIndex = index;
    // Force redraw of the layer
    clusterSource.refresh();
}

function showPopup(feature, coordinate) {
    const lonLat = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');
    const index = feature.get('申請年度') + feature.get('項次');
    const uuid = feature.get('uuid');
    highlightFeatures(index);
    
    // Update URL without triggering a page reload
    window.history.replaceState(null, '', `#point/${uuid}`);
    
    // Generate photo gallery HTML if photos exist
    let photoGallery = '';
    if(photoData[uuid]) {
        photoGallery = `
        <div class="mb-3">
            <div class="ratio ratio-16x9">
                <iframe src="https://drive.google.com/file/d/${photoData[uuid]}/preview"
                        class="rounded"
                        style="border: none;">
                </iframe>
            </div>
        </div>
    `;
    }
    
    const content = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">${feature.get('電廠名稱')}</h5>
                ${!photoData[uuid] ? `
                    <div class="d-grid mb-3">
                        <button class="btn btn-success btn-sm" onclick="window.open('https://docs.google.com/forms/d/e/1FAIpQLSeSsT5DdsJ-YscydKqWZ_sS0gY89Kz0T5pnPB1y05oaTPidfw/viewform?usp=pp_url&entry.2072773208=${uuid}', '_blank')">
                            <i class="bi bi-camera"></i> 協助拍照
                        </button>
                    </div>
                ` : ''}
                ${photoGallery}
                <p class="card-text">
                    業者名稱: ${feature.get('業者名稱')}<br>
                    施工取得日期: ${feature.get('施工取得日期')}<br>
                    土地面積: ${feature.get('土地面積')} 平方公尺<br>
                    裝置容量: ${feature.get('裝置容量')} <br>
                    地號: ${feature.get('縣市')}${feature.get('鄉鎮區')}${feature.get('地段')}${feature.get('地號')}
                </p>
                <div class="d-grid gap-2">
                    <button class="btn btn-primary btn-sm" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${lonLat[1]},${lonLat[0]}', '_blank')">
                        <i class="bi bi-google"></i> Google Maps
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.open('https://www.bing.com/maps/directions?rtp=~pos.${lonLat[1]}_${lonLat[0]}', '_blank')">
                        <i class="bi bi-map"></i> Bing Maps
                    </button>
                    <button class="btn btn-info btn-sm" onclick="window.open('https://wego.here.com/directions/drive/mylocation/${lonLat[1]},${lonLat[0]}', '_blank')">
                        <i class="bi bi-signpost-2"></i> HERE Maps
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('popup-content').innerHTML = content;
    overlay.setPosition(coordinate);
}

function searchFeatures(query) {
    if (!query) {
        document.getElementById('search-results').classList.add('d-none');
        return;
    }

    query = query.toLowerCase();
    searchResults = [];
    const features = vectorSource.getFeatures();
    const seen = new Set(); // To prevent duplicate suggestions
    const suggestions = {
        exact: [],
        startsWith: [],
        contains: []
    };
    
    features.forEach(feature => {
        const operator = feature.get('業者名稱').toLowerCase();
        const plantName = feature.get('電廠名稱').toLowerCase();
        const key = operator + '|' + plantName;
        
        if (seen.has(key)) return;
        seen.add(key);

        if (operator === query || plantName === query) {
            suggestions.exact.push(feature);
        } else if (operator.startsWith(query) || plantName.startsWith(query)) {
            suggestions.startsWith.push(feature);
        } else if (operator.includes(query) || plantName.includes(query)) {
            suggestions.contains.push(feature);
        }
    });

    // Combine results in priority order
    searchResults = [
        ...suggestions.exact,
        ...suggestions.startsWith,
        ...suggestions.contains
    ].slice(0, 10); // Limit to 10 results

    displaySearchResults();
}

function displaySearchResults() {
    const resultsDiv = document.getElementById('search-results');
    
    if (searchResults.length === 0) {
        resultsDiv.classList.add('d-none');
        return;
    }

    let html = '<div class="list-group list-group-flush">';
    searchResults.forEach((feature, index) => {
        const plantName = feature.get('電廠名稱');
        const operator = feature.get('業者名稱');
        const location = `${feature.get('縣市')}${feature.get('鄉鎮區')}`;
        const capacity = feature.get('裝置容量');

        html += `
            <a href="#" class="list-group-item list-group-item-action py-2" data-index="${index}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${plantName}</div>
                        <small class="text-muted">${operator}</small>
                    </div>
                    <div class="text-end">
                        <small class="text-muted d-block">${location}</small>
                        <small class="text-muted">${capacity}</small>
                    </div>
                </div>
            </a>
        `;
    });
    html += '</div>';

    resultsDiv.innerHTML = html;
    resultsDiv.classList.remove('d-none');
}

function zoomToFeature(feature) {
    const geometry = feature.getGeometry();
    const coordinate = geometry.getCoordinates();
    
    map.getView().animate({
        center: coordinate,
        zoom: 16,
        duration: 1000
    });

    showPopup(feature, coordinate);
}

function initMap() {
    // Create base layer
    const baseLayer = new ol.layer.Tile({
        source: new ol.source.WMTS({
            matrixSet: 'EPSG:3857',
            format: 'image/png',
            url: 'https://wmts.nlsc.gov.tw/wmts',
            layer: 'EMAP',
            tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(ol.proj.get('EPSG:3857').getExtent()),
                resolutions: Array(20).fill().map((_, i) => 156543.03392804097 / Math.pow(2, i)),
                matrixIds: Array(20).fill().map((_, i) => i.toString())
            }),
            style: 'default',
            wrapX: true,
            attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
        })
    });

    // Create vector source and cluster source
    vectorSource = new ol.source.Vector();
    clusterSource = new ol.source.Cluster({
        distance: 40,
        source: vectorSource
    });

    // Add spider layer
    const spiderLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const index = feature.get('申請年度') + feature.get('項次');
            return createMarkerStyle(feature, index === highlightedIndex, true);
        },
        zIndex: 2
    });

    // Modify cluster layer initialization
    const clusterLayer = new ol.layer.Vector({
        source: clusterSource,
        style: function(feature) {
            const features = feature.get('features');
            if (features.length > 1) {
                return createClusterStyle(feature);
            } else {
                const index = features[0].get('申請年度') + features[0].get('項次');
                return createMarkerStyle(features[0], index === highlightedIndex);
            }
        },
        zIndex: 1
    });

    // Initialize map
    map = new ol.Map({
        target: 'map',
        layers: [baseLayer, clusterLayer, spiderLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([120.301507, 23.124694]),
            zoom: 8
        })
    });

    // Create popup overlay
    overlay = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });
    map.addOverlay(overlay);

    // Add click handler
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });

        if (feature) {
            if (feature.get('features')) {
                // Handle cluster features
                const features = feature.get('features');
                if (features.length === 1) {
                    showPopup(features[0], evt.coordinate);
                } else if (features.length <= 8 || map.getView().getZoom() >= 18) {
                    // Spider effect for small clusters or at max zoom
                    if (currentSpiderFeatures) {
                        spiderLayer.getSource().clear();
                        currentSpiderFeatures = null;
                    }

                    const positions = calculateSpiderPositions(feature.getGeometry().getCoordinates(), features.length);
                    features.forEach((f, i) => {
                        const spiderFeature = f.clone();
                        spiderFeature.set('originalGeometry', f.getGeometry());
                        spiderFeature.setGeometry(new ol.geom.Point(positions[i]));
                        spiderLayer.getSource().addFeature(spiderFeature);
                    });
                    currentSpiderFeatures = features;
                } else {
                    // Zoom in for large clusters
                    const extent = ol.extent.createEmpty();
                    features.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
                    map.getView().fit(extent, {
                        duration: 1000,
                        padding: [50, 50, 50, 50],
                        maxZoom: 18
                    });
                }
            } else if (feature.get('fishfarm_id')) {
                // Handle fish farm features
                showFishFarmPopup(feature, evt.coordinate);
            } else {
                // Handle regular solar features
                showPopup(feature, evt.coordinate);
            }
        } else {
            overlay.setPosition(undefined);
            if (currentSpiderFeatures) {
                spiderLayer.getSource().clear();
                currentSpiderFeatures = null;
            }
        }
    });

    // Add view change handler to clear spider effect
    map.getView().on('change:resolution', function() {
        if (currentSpiderFeatures) {
            spiderLayer.getSource().clear();
            currentSpiderFeatures = null;
        }
    });

    // Add popup closer handler
    document.getElementById('popup-closer').onclick = function() {
        overlay.setPosition(undefined);
        highlightedIndex = null;
        clusterSource.refresh();
        window.history.replaceState(null, '', window.location.pathname);
        return false;
    };

    // Add geolocation button handler
    document.getElementById('locate-me').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const coords = ol.proj.fromLonLat([position.coords.longitude, position.coords.latitude]);
                map.getView().animate({
                    center: coords,
                    zoom: 15,
                    duration: 1000
                });
            });
        }
    });

    // Add search functionality
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const searchResultsDiv = document.getElementById('search-results');

    searchInput.addEventListener('input', debounce((e) => {
        searchFeatures(e.target.value);
    }, 300)); // Wait 300ms after typing stops

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchFeatures('');
    });

    searchResultsDiv.addEventListener('click', (e) => {
        e.preventDefault();
        const link = e.target.closest('.list-group-item-action');
        if (link) {
            const index = parseInt(link.dataset.index);
            if (index >= 0 && index < searchResults.length) {
                zoomToFeature(searchResults[index]);
                searchInput.value = '';
                searchResultsDiv.classList.add('d-none');
            }
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResultsDiv.contains(e.target)) {
            searchResultsDiv.classList.add('d-none');
        }
    });

    // Load data
    fetch('https://kiang.github.io/moeaea.gov.tw/solar_points.csv')
        .then(response => response.text())
        .then(csv => {
            const rows = csv.split('\n').slice(1);
            rows.forEach(row => {
                const cols = row.split(',');
                if (cols.length >= 14) { // Updated to account for UUID field
                    const feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(cols[12]), parseFloat(cols[13])])),
                        'uuid': cols[0],
                        '申請年度': cols[1],
                        '項次': cols[2],
                        '業者名稱': cols[3],
                        '電廠名稱': cols[4],
                        '施工取得日期': cols[5],
                        '土地面積': cols[6],
                        '裝置容量': cols[7],
                        '縣市': cols[8],
                        '鄉鎮區': cols[9],
                        '地段': cols[10],
                        '地號': cols[11]
                    });
                    vectorSource.addFeature(feature);
                    points[cols[0]] = feature; // Store feature by UUID
                }
            });

            // Set up routing
            routie({
                'point/:pointId': showPoint
            });

            // Check if there's a point ID in the URL
            const hash = window.location.hash;
            if (hash.startsWith('#point/')) {
                const pointId = hash.replace('#point/', '');
                showPoint(pointId);
            }
        });

    // Fetch photo data
    fetchPhotoData();

    // Add fish farm button after the search clear button
    const fishFarmButton = document.createElement('button');
    fishFarmButton.className = 'btn btn-outline-secondary btn-sm';
    fishFarmButton.innerHTML = '<i class="bi bi-water"></i> 漁電共生';
    fishFarmButton.onclick = loadFishFarmData;
    searchClear.parentNode.insertBefore(fishFarmButton, searchClear.nextSibling);
}

// Add debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add this function to handle point selection from URL
function showPoint(pointId) {
    const feature = points[pointId];
    if (feature) {
        const coordinate = feature.getGeometry().getCoordinates();
        map.getView().animate({
            center: coordinate,
            zoom: 16,
            duration: 1000
        }, function() {
            showPopup(feature, coordinate);
        });
    }
}

// Add this function to fetch photo data
function fetchPhotoData() {
    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRqIu5kNVxq07Snh_1edCIXBSs_jJQ3xdQpX3_bmU82kqTHhaQ9TZ3M1NZ--Kp6zIi1H2AptEYVlB75/pub?output=csv')
        .then(response => response.text())
        .then(csv => {
            const rows = csv.split('\n').slice(1); // Skip header
            rows.forEach(row => {
                const [timestamp, fileUrl, uuid] = row.split(',');
                // Extract file ID from Google Drive URL
                const fileId = fileUrl.match(/[-\w]{25,}/);
                if (fileId && fileId[0]) {
                    photoData[uuid] = fileId[0];
                }
            });
        });
}

// Add this function to load fish farm data
function loadFishFarmData() {
    if (fishFarmLayer) {
        map.removeLayer(fishFarmLayer);
    }

    fetch('https://kiang.github.io/www.sfea.org.tw/json/fishfarms.json')
        .then(response => response.json())
        .then(data => {
            // Create features from GeoJSON
            const features = new ol.format.GeoJSON().readFeatures(data, {
                featureProjection: 'EPSG:3857'
            });

            const vectorSource = new ol.source.Vector({
                features: features
            });

            fishFarmLayer = new ol.layer.Vector({
                source: vectorSource,
                style: function(feature) {
                    const geometry = feature.getGeometry();
                    const extent = geometry.getExtent();
                    const bottomCenter = [
                        (extent[0] + extent[2]) / 2,
                        extent[1] // Use the bottom (minimum y) coordinate
                    ];

                    return [
                        new ol.style.Style({
                            fill: new ol.style.Fill({
                                color: 'rgba(0, 123, 255, 0.2)'
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#007bff',
                                width: 2
                            })
                        }),
                        new ol.style.Style({
                            geometry: new ol.geom.Point(bottomCenter),
                            text: new ol.style.Text({
                                text: '🐟',
                                font: '14px Arial',
                                offsetY: -5 // Move text up slightly from the bottom
                            })
                        })
                    ];
                }
            });

            map.addLayer(fishFarmLayer);
        })
        .catch(error => {
            console.error('Error loading fish farm data:', error);
        });
}

// Add this function to show fish farm popup
function showFishFarmPopup(feature, coordinate) {
    // Clear URL hash
    window.history.replaceState(null, '', window.location.pathname);
    
    const properties = feature.getProperties();
    const content = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">漁電共生資訊</h5>
                <p class="card-text">
                    <strong>漁場編號：</strong> ${properties.fishfarm_id || 'N/A'}<br>
                    <strong>漁場類型：</strong> ${properties.fishfarm_type || 'N/A'}<br>
                    <strong>縣市：</strong> ${properties.fishfarm_county || 'N/A'}<br>
                    <strong>鄉鎮市區：</strong> ${properties.fishfarm_town || 'N/A'}<br>
                    <strong>地段：</strong> ${properties.fishfarm_daun || 'N/A'}<br>
                    <strong>地號：</strong> ${properties.fishfarm_parcel || 'N/A'}<br>
                    <strong>漁場名稱：</strong> ${properties.fishfarm_name || 'N/A'}<br>
                    <strong>面積：</strong> ${properties.fishfarm_geoarea ? (parseFloat(properties.fishfarm_geoarea).toFixed(2) + ' 平方公尺') : 'N/A'}<br>
                    <strong>太陽能公司：</strong> ${properties.solar_company || 'N/A'}<br>
                    <strong>太陽能電廠：</strong> ${properties.solar_name || 'N/A'}<br>
                    <strong>裝置容量：</strong> ${properties.solar_capacity ? (parseFloat(properties.solar_capacity).toFixed(2) + ' kW') : 'N/A'}<br>
                    <strong>施工取得日期：</strong> ${properties.solar_date || 'N/A'}
                </p>
            </div>
        </div>
    `;
    
    document.getElementById('popup-content').innerHTML = content;
    overlay.setPosition(coordinate);
}

window.onload = initMap;
