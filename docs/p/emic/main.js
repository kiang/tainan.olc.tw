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
function createPopupContent(properties, details, geometry) {
    let content = `<div class="case-popup">`;
    content += `<h3>案件編號: ${properties.CASE_ID}</h3>`;
    
    // Add URL sharing field
    const shareUrl = `${window.location.origin}${window.location.pathname}#${properties.CASE_ID}`;
    content += `<div class="share-url-container">
        <div class="share-url-group">
            <input type="text" class="share-url-input" value="${shareUrl}" readonly>
            <button class="copy-url-btn" onclick="copyShareUrl(this, '${shareUrl}')" title="複製連結">📋</button>
        </div>
        <div class="copy-notice" style="display: none;">已複製連結，可以分享給其他人！</div>
    </div>`;
    
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
    
    // Add photo submission button
    const county = details ? details.COUNTY_N : '';
    const town = details ? details.TOWN_N : '';
    // Get coordinates from geometry
    let longitude = '';
    let latitude = '';
    if (geometry && geometry.coordinates) {
        longitude = geometry.coordinates[0];
        latitude = geometry.coordinates[1];
    }
    const caseId = properties.CASE_ID;
    
    const photoSubmitUrl = `https://docs.google.com/forms/d/e/1FAIpQLSco8W8CeiWIXrJje_HmiWYJRiS_pjJBT1AFqrbGkra9pS0XAA/viewform?usp=pp_url&entry.1588782081=${encodeURIComponent(county)}&entry.1966779823=${encodeURIComponent(town)}&entry.1998738256=${longitude}&entry.1387778236=${latitude}&entry.2072773208=${encodeURIComponent(caseId)}`;
    
    content += `<div class="photo-submit-container">`;
    content += `<a href="${photoSubmitUrl}" target="_blank" class="photo-submit-btn">📷 提供照片</a>`;
    content += `</div>`;
    
    // Add photo display section
    content += `<div class="case-photos" id="photos-${caseId}" data-case-id="${caseId}">`;
    content += `<div class="photos-loading">載入照片中...</div>`;
    content += `</div>`;
    
    content += `</div>`;
    
    return content;
}

// Function to fetch and display photos for a case
async function loadCasePhotos(caseId) {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS6S645uoSKsgkXT8TIOF2SkXB8QJRQ2oEZYUgwmtCbIkTuzUT4V1qASaPmRa0AndnabEs28onKzhG_/pub?gid=1352548907&single=true&output=csv');
        const text = await response.text();
        
        // Parse CSV
        const rows = text.split('\n').map(row => {
            // Handle CSV parsing with proper quote handling
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            if (current) {
                result.push(current.trim());
            }
            
            return result;
        });
        
        // Skip header row and filter for this case ID
        const headers = rows[0];
        
        // Map the actual column names
        const caseIdIndex = headers.indexOf('地點編號(系統自動填入，不用理會或調整)');
        const urlIndex = headers.indexOf('照片(<10MB)');
        const timestampIndex = headers.indexOf('Timestamp');
        
        if (caseIdIndex === -1 || urlIndex === -1) {
            console.error('Required columns not found in CSV');
            console.error('Looking for: 地點編號(系統自動填入，不用理會或調整), 照片(<10MB)');
            console.error('Available headers:', headers);
            
            // Try to update the photos container with error message
            const photosContainer = document.getElementById(`photos-${caseId}`);
            if (photosContainer) {
                photosContainer.innerHTML = '<div class="no-photos">尚無照片</div>';
            }
            return;
        }
        
        const casePhotos = rows.slice(1)
            .filter(row => row[caseIdIndex] === caseId && row[urlIndex])
            .map(row => ({
                url: row[urlIndex],
                timestamp: row[timestampIndex] || ''
            }));
        
        // Update the photos section
        const photosContainer = document.getElementById(`photos-${caseId}`);
        if (!photosContainer) return;
        
        if (casePhotos.length === 0) {
            photosContainer.innerHTML = '<div class="no-photos">尚無照片</div>';
        } else {
            let photosHtml = '<div class="photos-grid">';
            
            casePhotos.forEach((photo, index) => {
                // Extract Google Drive file ID from various URL formats
                let fileId = null;
                
                // Handle different Google Drive URL formats
                if (photo.url.includes('drive.google.com/open?id=')) {
                    // Format: https://drive.google.com/open?id=FILE_ID
                    const match = photo.url.match(/id=([a-zA-Z0-9_-]+)/);
                    if (match) {
                        fileId = match[1];
                    }
                } else if (photo.url.includes('drive.google.com/file/d/')) {
                    // Format: https://drive.google.com/file/d/FILE_ID/view
                    const match = photo.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (match) {
                        fileId = match[1];
                    }
                } else {
                    // Try generic pattern for file IDs
                    const match = photo.url.match(/[-\w]{25,}(?!.*[-\w]{25,})/);
                    if (match) {
                        fileId = match[0];
                    }
                }
                
                if (fileId) {
                    photosHtml += `
                        <div class="photo-item">
                            <iframe src="https://drive.google.com/file/d/${fileId}/preview" 
                                    width="100%" 
                                    height="100%" 
                                    allow="autoplay"
                                    frameborder="0"
                                    style="display: block;">
                            </iframe>
                            ${photo.timestamp ? `<div class="photo-timestamp">${formatDate(photo.timestamp)}</div>` : ''}
                        </div>
                    `;
                }
            });
            
            photosHtml += '</div>';
            photosContainer.innerHTML = photosHtml;
        }
    } catch (error) {
        console.error('Error loading photos:', error);
        const photosContainer = document.getElementById(`photos-${caseId}`);
        if (photosContainer) {
            photosContainer.innerHTML = '<div class="photos-error">載入照片失敗</div>';
        }
    }
}

// Global variable to store all markers for case lookup
let allMarkers = {};

// Global variable to store all cases data
let allCasesData = [];

// Global variable to track navigation attempts
let navigationAttempts = 0;

// Function to handle URL hash navigation
function handleHashNavigation() {
    const hash = window.location.hash.substring(1); // Remove # symbol
    if (hash && allMarkers[hash]) {
        const marker = allMarkers[hash];
        navigationAttempts = 0; // Reset counter
        
        // Use markerClusterGroup's zoomToShowLayer method if available
        if (markerClusterGroup.zoomToShowLayer) {
            markerClusterGroup.zoomToShowLayer(marker, function() {
                // After zooming, open the popup
                setTimeout(() => {
                    marker.openPopup();
                }, 100);
            });
        } else {
            // Fallback method if zoomToShowLayer is not available
            navigateToMarkerFallback(marker, hash);
        }
    } else if (hash) {
        console.warn('Marker not found for hash:', hash);
    }
}

// Fallback navigation method
function navigateToMarkerFallback(marker, hash) {
    navigationAttempts++;
    
    // Prevent infinite loops
    if (navigationAttempts > 5) {
        console.warn('Max navigation attempts reached for marker', hash);
        navigationAttempts = 0;
        // Try one last time with max zoom
        map.setView(marker.getLatLng(), map.getMaxZoom());
        setTimeout(() => {
            marker.openPopup();
        }, 500);
        return;
    }
    
    // Calculate zoom level
    const targetZoom = Math.min(15 + navigationAttempts, map.getMaxZoom());
    map.setView(marker.getLatLng(), targetZoom);
    
    // Wait for map to update
    setTimeout(() => {
        // Try to open popup
        marker.openPopup();
        
        // Check if popup opened
        setTimeout(() => {
            const popup = marker.getPopup();
            if (!popup || !popup.isOpen()) {
                // If not at max zoom, try again with higher zoom
                if (targetZoom < map.getMaxZoom()) {
                    navigateToMarkerFallback(marker, hash);
                } else {
                    // At max zoom, try to find and click parent cluster
                    let parentCluster = null;
                    markerClusterGroup.eachLayer(layer => {
                        if (layer instanceof L.MarkerCluster && layer.getAllChildMarkers().includes(marker)) {
                            parentCluster = layer;
                        }
                    });
                    
                    if (parentCluster && parentCluster._icon) {
                        parentCluster.fire('click');
                        setTimeout(() => {
                            marker.fire('click');
                            navigationAttempts = 0;
                        }, 800);
                    } else {
                        navigationAttempts = 0;
                    }
                }
            } else {
                // Success
                navigationAttempts = 0;
            }
        }, 200);
    }, 400);
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
        // Store all cases data
        allCasesData = data.features;
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
                layer.bindPopup(createPopupContent(feature.properties, null, feature.geometry), {
                    maxHeight: 400,
                    className: 'custom-popup'
                });
                
                // Add click handler to update URL hash
                layer.on('click', function() {
                    updateHashForCase(caseId);
                });
                
                // Fetch detailed info when popup opens
                layer.on('popupopen', async function() {
                    // Check if popup already has detailed content to avoid flickering
                    const currentContent = layer.getPopup().getContent();
                    if (currentContent.includes('縣市:') || currentContent.includes('鄉鎮市區:')) {
                        // If already has detailed content, just load photos
                        loadCasePhotos(caseId);
                        return;
                    }
                    
                    const details = await fetchCaseDetails(caseId);
                    if (details) {
                        layer.setPopupContent(createPopupContent(feature.properties, details, feature.geometry));
                        // Load photos after setting content
                        loadCasePhotos(caseId);
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
window.addEventListener('hashchange', function() {
    navigationAttempts = 0; // Reset attempts on hash change
    handleHashNavigation();
});

// Handle initial page load with hash
window.addEventListener('load', function() {
    // Give a moment for map to initialize
    setTimeout(handleHashNavigation, 200);
});

// Major Disasters Popup Functionality
const majorDisastersBtn = document.getElementById('majorDisastersBtn');
const majorDisastersPopup = document.getElementById('majorDisastersPopup');
const popupClose = document.getElementById('popupClose');
const popupBody = document.getElementById('popupBody');

// Function to show major disasters popup
function showMajorDisastersPopup() {
    // Filter cases where IS_SERIOUS is true
    const seriousCases = allCasesData.filter(feature => 
        feature.properties.IS_SERIOUS === true || feature.properties.IS_SERIOUS === '是'
    );
    
    // Clear popup body
    popupBody.innerHTML = '';
    
    if (seriousCases.length === 0) {
        popupBody.innerHTML = '<div class="empty-state">目前沒有重大災情</div>';
    } else {
        // Sort by date (most recent first)
        seriousCases.sort((a, b) => {
            const dateA = new Date(a.properties.CASE_DT.replace('上午', 'AM').replace('下午', 'PM'));
            const dateB = new Date(b.properties.CASE_DT.replace('上午', 'AM').replace('下午', 'PM'));
            return dateB - dateA;
        });
        
        // Create list items
        seriousCases.forEach(feature => {
            const caseItem = document.createElement('div');
            caseItem.className = 'case-item';
            caseItem.dataset.caseId = feature.properties.CASE_ID;
            
            const disasterConfig = disasterTypes[feature.properties.DISASTER_MAIN_TYPE] || { icon: '⚠️' };
            
            caseItem.innerHTML = `
                <div class="case-item-header">
                    <div class="case-type">
                        ${disasterConfig.icon} ${feature.properties.DISASTER_MAIN_TYPE}
                    </div>
                    <div class="case-id">#${feature.properties.CASE_ID}</div>
                </div>
                <div class="case-time">發生時間: ${formatDate(feature.properties.CASE_DT)}</div>
            `;
            
            // Add click handler
            caseItem.addEventListener('click', function() {
                // Update URL hash
                window.location.hash = feature.properties.CASE_ID;
                // Close popup
                majorDisastersPopup.style.display = 'none';
            });
            
            popupBody.appendChild(caseItem);
        });
    }
    
    // Show popup
    majorDisastersPopup.style.display = 'block';
}

// Event listeners
majorDisastersBtn.addEventListener('click', showMajorDisastersPopup);

popupClose.addEventListener('click', function() {
    majorDisastersPopup.style.display = 'none';
});

// Close popup when clicking outside
majorDisastersPopup.addEventListener('click', function(e) {
    if (e.target === majorDisastersPopup) {
        majorDisastersPopup.style.display = 'none';
    }
});

// Close popup with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && majorDisastersPopup.style.display === 'block') {
        majorDisastersPopup.style.display = 'none';
    }
    if (e.key === 'Escape' && locationInputPopup.style.display === 'block') {
        locationInputPopup.style.display = 'none';
    }
});

// Location input functionality
const locationInputBtn = document.getElementById('locationInputBtn');
const locationInputPopup = document.getElementById('locationInputPopup');
const locationPopupClose = document.getElementById('locationPopupClose');
const locationForm = document.getElementById('locationForm');
const cancelLocationBtn = document.getElementById('cancelLocation');
const coordinatesInput = document.getElementById('coordinates');
const getCurrentLocationBtn = document.getElementById('getCurrentLocation');

// Current location marker
let currentLocationMarker = null;

// Show location input popup
locationInputBtn.addEventListener('click', function() {
    locationInputPopup.style.display = 'block';
    coordinatesInput.focus();
});

// Close location popup
locationPopupClose.addEventListener('click', function() {
    locationInputPopup.style.display = 'none';
});

cancelLocationBtn.addEventListener('click', function() {
    locationInputPopup.style.display = 'none';
});

// Close popup when clicking outside
locationInputPopup.addEventListener('click', function(e) {
    if (e.target === locationInputPopup) {
        locationInputPopup.style.display = 'none';
    }
});

// Get current location using geolocation API
getCurrentLocationBtn.addEventListener('click', function() {
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援地理定位功能');
        return;
    }
    
    // Show loading state
    getCurrentLocationBtn.classList.add('loading');
    getCurrentLocationBtn.disabled = true;
    getCurrentLocationBtn.textContent = '⏳';
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
    };
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Format coordinates to 6 decimal places
            const formattedCoords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            coordinatesInput.value = formattedCoords;
            
            // Reset button state
            resetGeolocationButton();
            
            // Show success message
            showTemporaryMessage('已取得目前位置！', 'success');
        },
        function(error) {
            let errorMessage = '無法取得位置資訊';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = '位置存取被拒絕，請允許瀏覽器存取位置資訊';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = '無法取得位置資訊';
                    break;
                case error.TIMEOUT:
                    errorMessage = '取得位置資訊逾時，請重新嘗試';
                    break;
            }
            
            alert(errorMessage);
            
            // Reset button state
            resetGeolocationButton();
        },
        options
    );
});

// Reset geolocation button to normal state
function resetGeolocationButton() {
    getCurrentLocationBtn.classList.remove('loading');
    getCurrentLocationBtn.disabled = false;
    getCurrentLocationBtn.textContent = '🌐';
}

// Show temporary message
function showTemporaryMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `temp-message temp-message-${type}`;
    messageDiv.textContent = message;
    
    // Add to popup body
    const popupBody = locationInputPopup.querySelector('.popup-body');
    popupBody.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Handle form submission
locationForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const coordinates = coordinatesInput.value.trim();
    
    // Parse coordinates
    const coords = parseCoordinates(coordinates);
    
    if (coords) {
        // Remove existing location marker
        if (currentLocationMarker) {
            map.removeLayer(currentLocationMarker);
        }
        
        // Create new location marker
        const locationIcon = L.divIcon({
            html: '<div style="background-color: #ff0000; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 12px; font-weight: bold;">📍</span></div>',
            className: 'custom-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        currentLocationMarker = L.marker([coords.lat, coords.lng], { icon: locationIcon })
            .addTo(map)
            .bindPopup(`<b>自訂位置</b><br>緯度: ${coords.lat}<br>經度: ${coords.lng}`);
        
        // Zoom to location
        map.setView([coords.lat, coords.lng], 15);
        
        // Close popup
        locationInputPopup.style.display = 'none';
        
        // Clear input
        coordinatesInput.value = '';
        
        // Show success message
        currentLocationMarker.openPopup();
    } else {
        alert('座標格式錯誤，請輸入正確的緯度、經度格式 (例如: 23.5, 121.0)');
    }
});

// Function to parse coordinates
function parseCoordinates(input) {
    // Remove extra whitespace and split by comma
    const parts = input.split(',').map(part => part.trim());
    
    if (parts.length !== 2) {
        return null;
    }
    
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    // Check if valid numbers
    if (isNaN(lat) || isNaN(lng)) {
        return null;
    }
    
    // Check if coordinates are within reasonable bounds
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return null;
    }
    
    return { lat, lng };
}

// Function to copy share URL to clipboard
function copyShareUrl(button, url) {
    navigator.clipboard.writeText(url).then(function() {
        // Show success notice
        const container = button.closest('.share-url-container');
        const notice = container.querySelector('.copy-notice');
        notice.style.display = 'block';
        
        // Hide notice after 3 seconds
        setTimeout(() => {
            notice.style.display = 'none';
        }, 3000);
        
        // Briefly change button appearance
        const originalText = button.textContent;
        button.textContent = '✓';
        button.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
        }, 1000);
    }).catch(function(err) {
        // Fallback for older browsers
        const input = button.parentElement.querySelector('.share-url-input');
        input.select();
        input.setSelectionRange(0, 99999);
        document.execCommand('copy');
        
        // Show success notice
        const container = button.closest('.share-url-container');
        const notice = container.querySelector('.copy-notice');
        notice.style.display = 'block';
        
        setTimeout(() => {
            notice.style.display = 'none';
        }, 3000);
    });
}

