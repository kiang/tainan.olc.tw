// EMIC Disaster Map JavaScript

// Initialize map centered on Taiwan
const map = L.map('map').setView([23.5, 121], 8);

// Add NLSC map tiles
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>',
    maxZoom: 18
}).addTo(map);

// Add typhoon KMZ layer
let typhoonLayer = null;

// Function to fetch and parse KMZ/KML data
async function loadTyphoonData() {
    try {
        // First, let's try fetching as binary data
        const response = await fetch('https://kiang.github.io/alerts.ncdr.nat.gov.tw/typhoon.kmz');
        const arrayBuffer = await response.arrayBuffer();
        
        let kmlContent = null;
        
        // Try to parse as KMZ first
        try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(arrayBuffer);
            
            // Find KML file in the ZIP
            for (const filename in zipContent.files) {
                if (filename.endsWith('.kml')) {
                    kmlContent = await zipContent.files[filename].async('string');
                    break;
                }
            }
        } catch (zipError) {
            // If ZIP parsing fails, try as KML text
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(arrayBuffer);
            
            if (text.includes('<kml') || text.includes('<?xml')) {
                kmlContent = text;
            } else {
                throw new Error('File is neither valid KMZ nor KML');
            }
        }
        
        if (kmlContent) {
            // Parse KML using DOMParser
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlContent, 'application/xml');
            
            // Check for parsing errors
            const parserError = kmlDoc.querySelector('parsererror');
            if (parserError) {
                console.error('KML parsing error:', parserError.textContent);
                // Try with text/xml instead
                const kmlDoc2 = parser.parseFromString(kmlContent, 'text/xml');
                if (!kmlDoc2.querySelector('parsererror')) {
                    // Use the successfully parsed document
                    const features = parseKMLFeatures(kmlDoc2);
                    displayTyphoonFeatures(features);
                    return;
                }
            } else {
                // Convert KML to GeoJSON-like format for Leaflet
                const features = parseKMLFeatures(kmlDoc);
                displayTyphoonFeatures(features);
            }
        }
    } catch (error) {
        console.error('Error loading typhoon data:', error);
        // Try alternative approach - load as KML directly
        try {
            const kmlUrl = 'https://kiang.github.io/alerts.ncdr.nat.gov.tw/typhoon.kml';
            const response = await fetch(kmlUrl);
            const kmlText = await response.text();
            
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlText, 'application/xml');
            
            const features = parseKMLFeatures(kmlDoc);
            displayTyphoonFeatures(features);
        } catch (altError) {
            console.error('Alternative KML loading also failed:', altError);
        }
    }
}

// Function to display typhoon features on the map
function displayTyphoonFeatures(features) {
    if (features.length === 0) {
        console.warn('No features found in KML file');
        return;
    }
    
    // Create typhoon layer
    typhoonLayer = L.layerGroup();
    
    features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
            L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
                icon: L.divIcon({
                    html: '<div style="background: #ff0000; border-radius: 50%; width: 10px; height: 10px; border: 2px solid #fff;"></div>',
                    className: 'typhoon-marker',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                })
            }).bindPopup(`<strong>颱風資料</strong><br>${feature.properties.name || '颱風路徑點'}<br>${feature.properties.description || ''}`).addTo(typhoonLayer);
        } else if (feature.geometry.type === 'LineString') {
            L.polyline(feature.geometry.coordinates.map(coord => [coord[1], coord[0]]), {
                color: '#ff0000',
                weight: 3,
                opacity: 0.7
            }).bindPopup(`<strong>颱風路徑</strong><br>${feature.properties.name || '颱風路徑線'}<br>${feature.properties.description || ''}`).addTo(typhoonLayer);
        } else if (feature.geometry.type === 'Polygon') {
            L.polygon(feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]), {
                color: '#ff0000',
                weight: 2,
                opacity: 0.7,
                fillColor: '#ff0000',
                fillOpacity: 0.2
            }).bindPopup(`<strong>颱風警戒區域</strong><br>${feature.properties.name || '警戒範圍'}<br>${feature.properties.description || ''}`).addTo(typhoonLayer);
        }
    });
    
    // Add typhoon layer to layer control
    overlayLayers["颱風資料"] = typhoonLayer;
    layerControl.addOverlay(typhoonLayer, "颱風資料");
    
    // Add typhoon layer to map by default
    typhoonLayer.addTo(map);
    
    console.log(`Loaded ${features.length} typhoon features`);
}

// Function to parse KML features
function parseKMLFeatures(kmlDoc) {
    const features = [];
    
    // Parse Placemarks
    const placemarks = kmlDoc.querySelectorAll('Placemark');
    placemarks.forEach(placemark => {
        const name = placemark.querySelector('name')?.textContent || '';
        const description = placemark.querySelector('description')?.textContent || '';
        
        // Parse Point
        const point = placemark.querySelector('Point coordinates');
        if (point) {
            const coords = point.textContent.trim().split(',');
            features.push({
                type: 'Feature',
                properties: { name, description },
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(coords[0]), parseFloat(coords[1])]
                }
            });
        }
        
        // Parse LineString
        const lineString = placemark.querySelector('LineString coordinates');
        if (lineString) {
            const coordsText = lineString.textContent.trim();
            const coordinates = coordsText.split(/\s+/).map(coord => {
                const [lng, lat] = coord.split(',');
                return [parseFloat(lng), parseFloat(lat)];
            });
            features.push({
                type: 'Feature',
                properties: { name, description },
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            });
        }
        
        // Parse Polygon
        const polygon = placemark.querySelector('Polygon outerBoundaryIs LinearRing coordinates');
        if (polygon) {
            const coordsText = polygon.textContent.trim();
            const coordinates = coordsText.split(/\s+/).map(coord => {
                const parts = coord.split(',');
                if (parts.length >= 2) {
                    return [parseFloat(parts[0]), parseFloat(parts[1])];
                }
                return null;
            }).filter(coord => coord !== null);
            
            if (coordinates.length > 0) {
                features.push({
                    type: 'Feature',
                    properties: { name, description },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    }
                });
            }
        }
    });
    
    return features;
}

// Define colors and icons for different disaster types
const disasterTypes = {
    '路樹災情': { color: '#228B22', icon: '🌳' },
    '民生、基礎設施災情': { color: '#FF6347', icon: '🏗️' },
    '橋梁災情': { color: '#8B4513', icon: '🌉' },
    '積淹水災情': { color: '#4682B4', icon: '💧' },
    '土石災情': { color: '#8B7355', icon: '⛰️' },
    '其他災情': { color: '#708090', icon: '⚠️' },
    '建物毀損災情': { color: '#DC143C', icon: '🏠' },
    '廣告招牌災情': { color: '#FF8C00', icon: '🪧' },
    '交通號誌災情': { color: '#FFD700', icon: '🚦' },
    '道路災情': { color: '#696969', icon: '🛣️' }
};

// Create legend
const legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = '<h4>災情類別</h4>';
    
    for (const [type, config] of Object.entries(disasterTypes)) {
        div.innerHTML += 
            '<i style="background:' + config.color + '"></i> ' + config.icon + ' ' + type + '<br>';
    }
    
    // Add typhoon layer legend
    div.innerHTML += '<hr><h4>颱風資料</h4>';
    div.innerHTML += '<i style="background:#ff0000; border-radius: 50%;"></i> 🌀 颱風路徑<br>';
    
    return div;
};
legend.addTo(map);

// Create layer control
const baseLayers = {
    "國土測繪中心": L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>',
        maxZoom: 18
    })
};

const overlayLayers = {};

const layerControl = L.control.layers(baseLayers, overlayLayers, {
    position: 'topright'
});
layerControl.addTo(map);

// Function to create custom marker
function createCustomMarker(feature, latlng) {
    const disasterType = feature.properties.DISASTER_MAIN_TYPE;
    const config = disasterTypes[disasterType] || { color: '#808080', icon: '❓' };
    const isSerious = feature.properties.IS_SERIOUS;
    const isTraffic = feature.properties.IS_TRAFFIC;
    
    // Create custom HTML marker
    const markerHtml = `
        <div class="custom-marker ${isSerious ? 'serious' : ''} ${isTraffic ? 'traffic' : ''}" 
             style="background-color: ${config.color};">
            <div class="marker-icon">${config.icon}</div>
            ${isSerious ? '<div class="serious-indicator">!</div>' : ''}
            ${isTraffic ? '<div class="traffic-indicator">🚧</div>' : ''}
        </div>
    `;
    
    return L.marker(latlng, {
        icon: L.divIcon({
            html: markerHtml,
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        })
    });
}

// Function to format date
function formatDate(dateStr) {
    // Handle format like "2025/7/6 下午 05:18:00"
    // Replace Chinese AM/PM indicators
    let normalizedDate = dateStr
        .replace('上午', 'AM')
        .replace('下午', 'PM');
    
    // Parse the date
    const date = new Date(normalizedDate);
    
    // If still invalid, try direct parsing
    if (isNaN(date.getTime())) {
        return dateStr; // Return original string if parsing fails
    }
    
    return date.toLocaleString('zh-TW');
}

// Function to fetch case details
async function fetchCaseDetails(caseId) {
    try {
        const response = await fetch(`https://kiang.github.io/portal2.emic.gov.tw/case/${caseId}.json`);
        if (!response.ok) throw new Error('Failed to fetch case details');
        return await response.json();
    } catch (error) {
        console.error('Error fetching case details:', error);
        return null;
    }
}

// Function to create popup content
function createPopupContent(properties, details) {
    let content = `<div class="case-popup">`;
    content += `<h3>案件編號: ${properties.CASE_ID}</h3>`;
    content += `<div class="info-row"><span class="label">發生時間:</span> <span class="value">${formatDate(properties.CASE_DT)}</span></div>`;
    content += `<div class="info-row"><span class="label">災情類別:</span> <span class="value">${properties.DISASTER_MAIN_TYPE}</span></div>`;
    content += `<div class="info-row"><span class="label">處理狀態:</span> <span class="value">${properties.CASE_STATUS}</span></div>`;
    
    if (details) {
        content += `<div class="info-row"><span class="label">縣市:</span> <span class="value">${details.COUNTY_N}</span></div>`;
        content += `<div class="info-row"><span class="label">鄉鎮市區:</span> <span class="value">${details.TOWN_N}</span></div>`;
        content += `<div class="info-row"><span class="label">發生地點:</span> <span class="value">${details.CASE_LOC}</span></div>`;
        content += `<div class="info-row"><span class="label">災情細項:</span> <span class="value">${details.DISASTER_SUB_TYPE}</span></div>`;
        if (details.CASE_DESCRIPTION) {
            content += `<div class="info-row"><span class="label">災情描述:</span> <span class="value">${details.CASE_DESCRIPTION}</span></div>`;
        }
        if (details.PERSON_ID) {
            content += `<div class="info-row"><span class="label">上傳單位:</span> <span class="value">${details.PERSON_ID}</span></div>`;
        }
    }
    
    content += `<div class="info-row"><span class="label">交通障礙:</span> <span class="value">${properties.IS_TRAFFIC ? '是' : '否'}</span></div>`;
    content += `<div class="info-row"><span class="label">重大災情:</span> <span class="value">${properties.IS_SERIOUS ? '是' : '否'}</span></div>`;
    
    // Add timeline if logs exist
    if (details && details.logs && details.logs.length > 0) {
        content += `<div class="timeline">`;
        content += `<h4>變更記錄 (${details.logs.length} 筆)</h4>`;
        
        // Show last 5 changes
        const recentLogs = details.logs.slice(-5).reverse();
        recentLogs.forEach(log => {
            content += `<div class="log-entry">`;
            content += `<div class="timestamp">${log.timestamp}</div>`;
            content += `<div>欄位 <span class="field">${log.field}</span>: `;
            
            // Format old and new values
            const oldVal = log.old_value === null ? '(空值)' : 
                          log.old_value === true ? '是' : 
                          log.old_value === false ? '否' : log.old_value;
            const newVal = log.new_value === true ? '是' : 
                          log.new_value === false ? '否' : log.new_value;
            
            content += `<span class="old-value">${oldVal}</span> → `;
            content += `<span class="new-value">${newVal}</span>`;
            content += `</div></div>`;
        });
        
        if (details.logs.length > 5) {
            content += `<div style="text-align: center; color: #666; font-size: 12px; margin-top: 5px;">...還有 ${details.logs.length - 5} 筆較早的變更</div>`;
        }
        
        content += `</div>`;
    }
    
    content += `</div>`;
    
    return content;
}

// Global variable to store all markers for case lookup
let allMarkers = {};

// Function to handle URL hash navigation
function handleHashNavigation() {
    const hash = window.location.hash.substring(1); // Remove # symbol
    if (hash && allMarkers[hash]) {
        const marker = allMarkers[hash];
        
        // Zoom to marker and open popup
        map.setView(marker.getLatLng(), 15);
        
        // If marker is in a cluster, need to spiderfy first
        if (markerClusterGroup.hasLayer(marker)) {
            // Find the cluster containing this marker
            const zoom = map.getZoom();
            const clusters = markerClusterGroup.getLayers();
            
            // Force spiderfy by zooming to bounds that contain only this marker
            const bounds = L.latLngBounds([marker.getLatLng()]);
            bounds.extend([marker.getLatLng().lat + 0.001, marker.getLatLng().lng + 0.001]);
            bounds.extend([marker.getLatLng().lat - 0.001, marker.getLatLng().lng - 0.001]);
            
            // Wait a moment then open popup
            setTimeout(() => {
                marker.openPopup();
            }, 500);
        } else {
            marker.openPopup();
        }
    }
}

// Function to update URL hash when marker is clicked
function updateHashForCase(caseId) {
    const newHash = `#${caseId}`;
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    }
}

// Create marker cluster group with custom options
const markerClusterGroup = L.markerClusterGroup({
    // Custom cluster icon creation
    iconCreateFunction: function(cluster) {
        const markers = cluster.getAllChildMarkers();
        const counts = {};
        
        // Count markers by disaster type
        markers.forEach(marker => {
            const disasterType = marker.feature.properties.DISASTER_MAIN_TYPE;
            counts[disasterType] = (counts[disasterType] || 0) + 1;
        });
        
        // Find the most common disaster type
        let maxType = '';
        let maxCount = 0;
        for (const [type, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                maxType = type;
            }
        }
        
        const config = disasterTypes[maxType] || { color: '#808080', icon: '⚠️' };
        const size = Math.min(40 + (cluster.getChildCount() / 10), 60);
        
        return L.divIcon({
            html: `<div class="cluster-marker" style="background-color: ${config.color}; width: ${size}px; height: ${size}px;">
                     <div class="cluster-icon">${config.icon}</div>
                     <div class="cluster-count">${cluster.getChildCount()}</div>
                   </div>`,
            className: 'custom-cluster-icon',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });
    },
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 50
});

// Load GeoJSON data
fetch('https://kiang.github.io/portal2.emic.gov.tw/cases.json')
    .then(response => response.json())
    .then(data => {
        const geoJsonLayer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                const marker = createCustomMarker(feature, latlng);
                // Store feature data on marker for clustering
                marker.feature = feature;
                
                // Store marker in global lookup table using case ID
                const caseId = feature.properties.CASE_ID;
                allMarkers[caseId] = marker;
                
                return marker;
            },
            onEachFeature: function (feature, layer) {
                const caseId = feature.properties.CASE_ID;
                
                // Initial popup with basic info
                layer.bindPopup(createPopupContent(feature.properties, null));
                
                // Add click handler to update URL hash
                layer.on('click', function() {
                    updateHashForCase(caseId);
                });
                
                // Fetch detailed info when popup opens
                layer.on('popupopen', async function() {
                    const details = await fetchCaseDetails(caseId);
                    if (details) {
                        layer.setPopupContent(createPopupContent(feature.properties, details));
                    }
                });
            }
        });
        
        // Add markers to cluster group
        markerClusterGroup.addLayer(geoJsonLayer);
        
        // Add cluster group to map
        map.addLayer(markerClusterGroup);
        
        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';
        
        // Handle initial hash navigation after data is loaded
        setTimeout(() => {
            handleHashNavigation();
        }, 100);
        
        // Load typhoon data
        loadTyphoonData();
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        document.getElementById('loading').innerText = '載入失敗';
    });

// Listen for hash changes (browser back/forward navigation)
window.addEventListener('hashchange', handleHashNavigation);

// Handle initial page load with hash
window.addEventListener('load', function() {
    // Give a moment for map to initialize
    setTimeout(handleHashNavigation, 200);
});