let map;
let vectorSource;
let clusterSource;
let overlay;
let highlightedIndex = null;
let searchResults = [];

function createMarkerStyle(feature, highlighted = false) {
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 12,
            fill: new ol.style.Fill({
                color: highlighted ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 204, 0, 0.8)'
            }),
            stroke: new ol.style.Stroke({
                color: highlighted ? '#cc0000' : '#cc9900',
                width: 2
            })
        })
    });
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
    highlightFeatures(index);
    
    const content = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">${feature.get('電廠名稱')}</h5>
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

    // Create cluster layer
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
        }
    });

    // Initialize map
    map = new ol.Map({
        target: 'map',
        layers: [baseLayer, clusterLayer],
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
            const features = feature.get('features');
            if (features.length === 1) {
                showPopup(features[0], evt.coordinate);
            } else {
                const extent = ol.extent.createEmpty();
                features.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
                map.getView().fit(extent, {
                    duration: 1000,
                    padding: [50, 50, 50, 50]
                });
            }
        } else {
            overlay.setPosition(undefined);
        }
    });

    // Add popup closer handler
    document.getElementById('popup-closer').onclick = function() {
        overlay.setPosition(undefined);
        highlightedIndex = null;
        clusterSource.refresh();
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
                if (cols.length >= 13) {
                    const feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(cols[11]), parseFloat(cols[12])])),
                        '申請年度': cols[0],
                        '項次': cols[1],
                        '業者名稱': cols[2],
                        '電廠名稱': cols[3],
                        '施工取得日期': cols[4],
                        '土地面積': cols[5],
                        '裝置容量': cols[6],
                        '縣市': cols[7],
                        '鄉鎮區': cols[8],
                        '地段': cols[9],
                        '地號': cols[10]
                    });
                    vectorSource.addFeature(feature);
                }
            });
        });
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

window.onload = initMap;
