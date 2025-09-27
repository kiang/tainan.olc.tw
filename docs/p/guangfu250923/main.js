// Initialize variables
let map;
let markersLayer;
let markers = [];
let filterInput = document.getElementById('filter-input');
let coordinatesModal;
let cunliLayer;
let submissionsLayer;
let stayLayer;
let washPointsLayer;
let myMapsLayer;
let governmentLayer;
let villageLabels = L.layerGroup();
let layerData = {
    government: [],
    demands: [],
    stay: [],
    wash: [],
    submissions: []
};
let activeMarkers = {};

// Generate UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize map
function initMap() {
    // Set default view to Hualien Guangfu area
    map = L.map('map').setView([23.6533, 121.4207], 13);

    // Add NLSC tile layer
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
        maxZoom: 19
    }).addTo(map);

    // Load and add Hualien cunli basemap
    loadCunliBasemap();

    // Initialize marker cluster group
    markersLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    });

    map.addLayer(markersLayer);

    // Initialize submissions layer group
    submissionsLayer = L.layerGroup().addTo(map);

    // Initialize stay layer cluster group  
    stayLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    }).addTo(map);

    // Initialize wash points layer cluster group
    washPointsLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    }).addTo(map);

    // Initialize Google My Maps layer cluster group
    myMapsLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    }).addTo(map);

    // Initialize government points layer cluster group
    governmentLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    }).addTo(map);

    // Initialize village labels layer
    map.addLayer(villageLabels);

    // Add zoom event listener to show/hide village names
    map.on('zoomend', updateVillageLabels);

    // Load markers data
    loadMarkers();
    
    // Load form submissions
    loadFormSubmissions();
    
    // Load stay locations
    loadStayLocations();
    
    // Load wash points
    loadWashPoints();
    
    // Load Google My Maps data
    loadMyMapsData();
    
    // Load government points
    loadGovernmentPoints();
}

// Load Hualien cunli basemap
function loadCunliBasemap() {
    fetch('data/hualien.json')
        .then(response => response.json())
        .then(topoData => {
            // Convert TopoJSON to GeoJSON
            // Find the correct object key (it might be named after the file or contain the geometries)
            const objectKey = Object.keys(topoData.objects)[0];
            const geojsonData = topojson.feature(topoData, topoData.objects[objectKey]);
            
            // Create and add the layer
            cunliLayer = L.geoJSON(geojsonData, {
                style: {
                    color: '#319FD3',
                    weight: 1,
                    fillColor: 'rgba(255, 255, 255, 0.2)',
                    fillOpacity: 0.2
                },
                onEachFeature: function(feature, layer) {
                    // Add popup with specific cunli information
                    if (feature.properties) {
                        const props = feature.properties;
                        const townName = props.TOWNNAME || '';
                        const villName = props.VILLNAME || '';
                        
                        // Get coordinates from the feature geometry (centroid)
                        let lat = '';
                        let lng = '';
                        if (feature.geometry && feature.geometry.type === 'Polygon') {
                            // Calculate centroid for polygon
                            const bounds = L.geoJSON(feature).getBounds();
                            lat = bounds.getCenter().lat.toFixed(6);
                            lng = bounds.getCenter().lng.toFixed(6);
                        }
                        
                        // Generate UUID for the entry
                        const uuid = generateUUID();
                        
                        // Google Form URL with parameters
                        const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLScjTrlW1dFTY3nDKe1SjtHwhqZluC1wn6IaMaXhDPF_2jyiEw/viewform?usp=pp_url&entry.1588782081=${encodeURIComponent(townName)}&entry.1966779823=${encodeURIComponent(villName)}&entry.1998738256=${encodeURIComponent(lng)}&entry.1387778236=${encodeURIComponent(lat)}&entry.2072773208=${encodeURIComponent(uuid)}`;
                        
                        let popupContent = `
                            <div style="max-width: 350px; font-family: Arial, sans-serif;">
                                <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: #319FD3; color: white; border-radius: 4px; text-align: center;">
                                    🗺️ 行政區資訊
                                </h6>
                                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
                        `;
                        
                        if (townName) {
                            popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                                        鄉鎮
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top;">
                                        ${townName}
                                    </td>
                                </tr>
                            `;
                        }
                        
                        if (villName) {
                            popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                                        村里
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top;">
                                        ${villName}
                                    </td>
                                </tr>
                            `;
                        }
                        
                        if (lat && lng) {
                            popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                                        座標
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top;">
                                        ${lat}, ${lng}
                                    </td>
                                </tr>
                            `;
                        }
                        
                        popupContent += `
                                </table>
                                <div style="text-align: center;">
                                    <button onclick="window.open('${formUrl}', '_blank')" class="btn btn-primary btn-sm" style="background-color: #319FD3; border-color: #319FD3; padding: 8px 16px; font-size: 12px; border-radius: 4px; color: white; border: none; cursor: pointer; text-decoration: none; display: inline-block;">
                                        📝 填寫救災資訊表單
                                    </button>
                                </div>
                            </div>
                        `;
                        
                        layer.bindPopup(popupContent);
                    }
                    
                    // Highlight on hover
                    layer.on({
                        mouseover: function(e) {
                            const layer = e.target;
                            layer.setStyle({
                                weight: 2,
                                color: '#666',
                                fillOpacity: 0.4
                            });
                        },
                        mouseout: function(e) {
                            cunliLayer.resetStyle(e.target);
                        }
                    });
                }
            }).addTo(map);
            
            // Fit map to Hualien bounds
            map.fitBounds(cunliLayer.getBounds());
            
            // Create village labels
            createVillageLabels(geojsonData);
            
            // Initial update of village labels based on current zoom
            updateVillageLabels();
        })
        .catch(error => {
            console.error('Error loading cunli basemap:', error);
        });
}

// Create village name labels
function createVillageLabels(geojsonData) {
    geojsonData.features.forEach(feature => {
        if (feature.properties && feature.properties.VILLNAME) {
            const villName = feature.properties.VILLNAME;
            
            // Calculate centroid for label placement
            const bounds = L.geoJSON(feature).getBounds();
            const center = bounds.getCenter();
            
            // Create label marker
            const labelIcon = L.divIcon({
                html: `<div style="
                    background-color: rgba(255, 255, 255, 0.95);
                    border: 2px solid #2c3e50;
                    border-radius: 4px;
                    padding: 3px 8px;
                    font-size: 12px;
                    font-weight: bold;
                    color: #2c3e50;
                    text-align: center;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    white-space: nowrap;
                    text-shadow: 1px 1px 1px rgba(255,255,255,0.8);
                    display: inline-block;
                ">${villName}</div>`,
                className: 'village-label',
                iconSize: null, // Let the content determine the size
                iconAnchor: [0, 0]
            });
            
            const labelMarker = L.marker(center, { 
                icon: labelIcon,
                interactive: false // Labels shouldn't interfere with clicks
            });
            
            villageLabels.addLayer(labelMarker);
        }
    });
}

// Update village labels visibility based on zoom level
function updateVillageLabels() {
    const zoomLevel = map.getZoom();
    const showLabels = zoomLevel > 12; // Show labels when zoom is higher than 12
    
    if (showLabels && !map.hasLayer(villageLabels)) {
        map.addLayer(villageLabels);
    } else if (!showLabels && map.hasLayer(villageLabels)) {
        map.removeLayer(villageLabels);
    }
}

// Load form submissions from Google Sheets
function loadFormSubmissions() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJH_nQEBtvPNRvFS4EYo-deJ6WqnLb8vII1D2atzeHeGObimmfgE11wA_gveSWYt9uAhD7kYsUlH0m/pub?gid=1425282360&single=true&output=csv';
    
    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) return; // No data rows
            
            const headers = parseCSVLine(lines[0]);
            
            // Clear existing submissions
            submissionsLayer.clearLayers();
            
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                const submission = {};
                
                // Map values to headers
                headers.forEach((header, index) => {
                    submission[header] = values[index] || '';
                });
                
                // Extract coordinates - assuming columns are named something like these
                // Adjust column names based on actual CSV headers
                let lat = parseFloat(submission['緯度'] || submission['latitude'] || submission['Latitude']);
                let lng = parseFloat(submission['經度'] || submission['longitude'] || submission['Longitude']);
                
                // Try alternative column patterns if main ones don't work
                if (isNaN(lat) || isNaN(lng)) {
                    // Look for any column that might contain coordinates
                    Object.entries(submission).forEach(([key, value]) => {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                            if (key.toLowerCase().includes('lat') || key.includes('緯')) {
                                lat = numValue;
                            } else if (key.toLowerCase().includes('lng') || key.toLowerCase().includes('lon') || key.includes('經')) {
                                lng = numValue;
                            }
                        }
                    });
                }
                
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    createSubmissionMarker(submission, lat, lng);
                }
            }
        })
        .catch(error => {
            console.error('Error loading form submissions:', error);
        });
}

// Load stay locations from GeoJSON
function loadStayLocations() {
    fetch('data/stay.json')
        .then(response => response.json())
        .then(geojsonData => {
            // Clear existing stay markers
            stayLayer.clearLayers();
            layerData.stay = [];
            
            geojsonData.features.forEach((feature, index) => {
                if (feature.geometry && feature.geometry.type === 'Point') {
                    const coordinates = feature.geometry.coordinates;
                    const lng = coordinates[0];
                    const lat = coordinates[1];
                    const properties = feature.properties || {};
                    
                    // Create accommodation marker using the same icon style as form submissions
                    const stayIcon = L.divIcon({
                        html: `<div style="background-color: #6f42c1; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🏠</div>`,
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, -12]
                    });
                    
                    const marker = L.marker([lat, lng], { icon: stayIcon });
                    
                    // Create popup content with styled table
                    let popupContent = `
                        <div style="max-width: 400px; font-family: Arial, sans-serif;">
                            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: #6f42c1; color: white; border-radius: 4px; text-align: center;">
                                🏠 提供住宿點
                            </h6>
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    `;
                    
                    // Add all properties to the table
                    Object.entries(properties).forEach(([key, value]) => {
                        if (value && value.toString().trim() !== '') {
                            popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                                        ${key}
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                                        ${value}
                                    </td>
                                </tr>
                            `;
                        }
                    });
                    
                    // Add coordinates
                    popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                                        位置
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top;">
                                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                                    </td>
                                </tr>
                            </table>
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);
                    stayLayer.addLayer(marker);
                    
                    layerData.stay.push({
                        id: `stay-${index}`,
                        name: properties.name || properties['地點'] || '住宿點',
                        description: properties.description || properties['聯絡方式'] || '',
                        lat: lat,
                        lng: lng,
                        marker: marker,
                        properties: properties
                    });
                }
            });
            updateDataList('stay');
        })
        .catch(error => {
            console.error('Error loading stay locations:', error);
        });
}

// Load wash points from GeoJSON
function loadWashPoints() {
    fetch('data/wash_points.json')
        .then(response => response.json())
        .then(geojsonData => {
            // Clear existing wash point markers
            washPointsLayer.clearLayers();
            layerData.wash = [];
            
            geojsonData.features.forEach((feature, index) => {
                if (feature.geometry && feature.geometry.type === 'Point') {
                    const coordinates = feature.geometry.coordinates;
                    const lng = coordinates[0];
                    const lat = coordinates[1];
                    const properties = feature.properties || {};
                    
                    // Create wash point marker using the same icon style as form submissions
                    const washIcon = L.divIcon({
                        html: `<div style="background-color: #20c997; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🚿</div>`,
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, -12]
                    });
                    
                    const marker = L.marker([lat, lng], { icon: washIcon });
                    
                    // Create popup content with styled table
                    let popupContent = `
                        <div style="max-width: 400px; font-family: Arial, sans-serif;">
                            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: #20c997; color: white; border-radius: 4px; text-align: center;">
                                🚿 提供洗澡點
                            </h6>
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    `;
                    
                    // Add all properties to the table
                    Object.entries(properties).forEach(([key, value]) => {
                        if (value && value.toString().trim() !== '') {
                            popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                                        ${key}
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                                        ${value}
                                    </td>
                                </tr>
                            `;
                        }
                    });
                    
                    // Add coordinates
                    popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                                        位置
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top;">
                                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                                    </td>
                                </tr>
                            </table>
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);
                    washPointsLayer.addLayer(marker);
                    
                    layerData.wash.push({
                        id: `wash-${index}`,
                        name: properties.name || properties['地點'] || '洗澡點',
                        description: properties.description || properties['聯絡方式'] || '',
                        lat: lat,
                        lng: lng,
                        marker: marker,
                        properties: properties
                    });
                }
            });
            updateDataList('wash');
        })
        .catch(error => {
            console.error('Error loading wash points:', error);
        });
}

// Load Google My Maps data from converted GeoJSON
function loadMyMapsData() {
    fetch('data/demands.json')
        .then(response => response.json())
        .then(geojsonData => {
            // Clear existing My Maps markers
            myMapsLayer.clearLayers();
            layerData.demands = [];
            
            geojsonData.features.forEach((feature, index) => {
                if (feature.geometry && feature.geometry.type === 'Point') {
                    const coordinates = feature.geometry.coordinates;
                    const lng = coordinates[0];
                    const lat = coordinates[1];
                    const properties = feature.properties || {};
                    
                    const name = properties.name || '';
                    const description = properties.description || '';
                    const demandType = properties.demand_type || 'mixed';
                    const demandTypeZh = properties.demand_type_zh || '綜合需求';
                    
                    const marker = createMyMapsMarker(name, description, lat, lng, demandType, demandTypeZh);
                    layerData.demands.push({
                        id: `demand-${index}`,
                        name: name || '救災需求',
                        description: description,
                        lat: lat,
                        lng: lng,
                        type: demandType,
                        typeZh: demandTypeZh,
                        marker: marker,
                        properties: properties
                    });
                }
            });
            updateDataList('demands');
        })
        .catch(error => {
            console.error('Error loading My Maps data:', error);
        });
}

// Create marker for Google My Maps data
function createMyMapsMarker(name, description, lat, lng, demandType, demandTypeZh) {
    // Get icon info based on demand type
    let iconInfo = getMyMapsIconType(demandType);
    
    // Create marker icon
    const myMapsIcon = L.divIcon({
        html: `<div style="background-color: ${iconInfo.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
    
    const marker = L.marker([lat, lng], { icon: myMapsIcon });
    
    // Create popup content
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${iconInfo.color}; color: white; border-radius: 4px; text-align: center;">
                ${iconInfo.icon} ${demandTypeZh || iconInfo.label}
            </h6>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                        地點名稱
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${name}
                    </td>
                </tr>
    `;
    
    if (description && description.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        詳細說明
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${description}
                    </td>
                </tr>
        `;
    }
    
    popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        位置
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top;">
                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    myMapsLayer.addLayer(marker);
    return marker;
}

// Get icon type for My Maps markers based on demand type
function getMyMapsIconType(demandType) {
    // Based on the My Maps legend: Labor (red), Supplies (blue), Equipment (yellow), Mixed
    switch (demandType) {
        case 'labor':
            return { icon: '👷', color: '#dc3545', label: '需要人力' }; // Red for labor
        case 'supplies':
            return { icon: '📦', color: '#007bff', label: '需要物資' }; // Blue for supplies
        case 'equipment':
            return { icon: '🔧', color: '#ffc107', label: '需要機具' }; // Yellow for equipment
        default:
            return { icon: '📍', color: '#6c757d', label: '救災需求' }; // Gray for mixed/other
    }
}

// Load government points from GeoJSON
function loadGovernmentPoints() {
    fetch('data/government_points.json')
        .then(response => response.json())
        .then(geojsonData => {
            // Clear existing government markers
            governmentLayer.clearLayers();
            layerData.government = [];
            
            geojsonData.features.forEach((feature, index) => {
                if (feature.geometry && feature.geometry.type === 'Point') {
                    const coordinates = feature.geometry.coordinates;
                    const lng = coordinates[0];
                    const lat = coordinates[1];
                    const properties = feature.properties || {};
                    
                    const name = properties.name || '';
                    const type = properties.type || 'general';
                    const description = properties.description || '';
                    
                    const marker = createGovernmentMarker(name, description, lat, lng, type);
                    layerData.government.push({
                        id: `gov-${index}`,
                        name: name,
                        description: description,
                        lat: lat,
                        lng: lng,
                        type: type,
                        marker: marker
                    });
                }
            });
            updateDataList('government');
        })
        .catch(error => {
            console.error('Error loading government points:', error);
        });
}

// Create marker for government points
function createGovernmentMarker(name, description, lat, lng, type) {
    // Get icon info based on government point type
    let iconInfo = getGovernmentIconType(type);
    
    // Create marker icon
    const govIcon = L.divIcon({
        html: `<div style="background-color: ${iconInfo.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
    
    const marker = L.marker([lat, lng], { icon: govIcon });
    
    // Create popup content
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${iconInfo.color}; color: white; border-radius: 4px; text-align: center;">
                ${iconInfo.icon} ${iconInfo.label}
            </h6>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                        設施名稱
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${name}
                    </td>
                </tr>
    `;
    
    if (description && description.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        說明
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${description}
                    </td>
                </tr>
        `;
    }
    
    popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        位置
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top;">
                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    governmentLayer.addLayer(marker);
    return marker;
}

// Get icon type for government markers based on facility type
function getGovernmentIconType(type) {
    switch (type) {
        case 'medical':
            return { icon: '🚑', color: '#e74c3c', label: '政府救護站' }; // Red for medical
        case 'volunteer':
            return { icon: '👥', color: '#2ecc71', label: '政府志工站' }; // Green for volunteers
        case 'mud_storage':
            return { icon: '🏗️', color: '#8b4513', label: '政府污泥暫置場' }; // Brown for mud storage
        case 'waste_storage':
            return { icon: '🗑️', color: '#34495e', label: '政府垃圾暫置場' }; // Dark gray for waste storage
        default:
            return { icon: '🏛️', color: '#3498db', label: '政府設施' }; // Blue for general government
    }
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Get icon and color for different report types
function getIconForReportType(reportContent) {
    const content = reportContent.toLowerCase();
    
    if (content.includes('需要志工') || content.includes('volunteer')) {
        return { icon: '🙋', color: '#007bff' }; // Blue for volunteers needed
    } else if (content.includes('需要物資') || content.includes('supplies')) {
        return { icon: '📦', color: '#fd7e14' }; // Orange for supplies needed
    } else if (content.includes('提供洗澡點') || content.includes('shower') || content.includes('bath')) {
        return { icon: '🚿', color: '#20c997' }; // Teal for shower facilities
    } else if (content.includes('提供住宿點') || content.includes('accommodation') || content.includes('lodging')) {
        return { icon: '🏠', color: '#6f42c1' }; // Purple for accommodation
    } else if (content.includes('其他') || content.includes('other')) {
        return { icon: '❓', color: '#6c757d' }; // Gray for other
    } else {
        return { icon: '📋', color: '#dc3545' }; // Default red for general reports
    }
}

// Create marker for form submission
function createSubmissionMarker(submission, lat, lng) {
    // Get report content type and determine icon
    const reportContent = submission['通報內容'] || submission['Report Content'] || '';
    let iconInfo = getIconForReportType(reportContent);
    
    // Create a custom icon based on report type
    const submissionIcon = L.divIcon({
        html: `<div style="background-color: ${iconInfo.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
    
    const marker = L.marker([lat, lng], { icon: submissionIcon });
    
    // Create popup content with styled table
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${iconInfo.color}; color: white; border-radius: 4px; text-align: center;">
                ${iconInfo.icon} 救災資訊回報
            </h6>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    `;
    
    Object.entries(submission).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
            // Skip coordinates in display as they're already shown in location
            if (!key.toLowerCase().includes('lat') && 
                !key.toLowerCase().includes('lng') && 
                !key.toLowerCase().includes('lon') &&
                !key.includes('緯') && 
                !key.includes('經')) {
                
                popupContent += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                            ${key}
                        </td>
                        <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                            ${value}
                        </td>
                    </tr>
                `;
            }
        }
    });
    
    popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        位置
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top;">
                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    submissionsLayer.addLayer(marker);
    return marker;
}

// Load markers from data source
function loadMarkers() {
    // No static markers - all data comes from form submissions
    updateChart();
}

// Create a marker
function createMarker(data) {
    const marker = L.marker([data.lat, data.lng], {
        icon: createCustomIcon(data)
    });

    marker.data = data;
    
    // Create popup content
    let popupContent = '<div class="popup-content">';
    if (data.image) {
        popupContent += `<img src="${data.image}" class="popup-image" alt="${data.name}">`;
    }
    popupContent += `<h6>${data.name}</h6>`;
    popupContent += `<p>${data.description || ''}</p>`;
    
    if (data.lat && data.lng) {
        popupContent += `<small>座標: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}</small><br>`;
        popupContent += `<a href="https://www.google.com/maps?q=${data.lat},${data.lng}" target="_blank" class="btn btn-sm btn-primary mt-2">
            <i class="bi bi-geo-alt"></i> Google Maps
        </a>`;
    }
    popupContent += '</div>';

    marker.bindPopup(popupContent);
    
    markers.push(marker);
    markersLayer.addLayer(marker);
}

// Create custom icon for marker
function createCustomIcon(data) {
    return L.divIcon({
        html: `<div class="custom-marker">${data.name ? data.name.substring(0, 2) : 'M'}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

// Filter markers
function filterMarkers(keyword) {
    markersLayer.clearLayers();
    
    markers.forEach(marker => {
        if (!keyword || marker.data.name.toLowerCase().includes(keyword.toLowerCase())) {
            markersLayer.addLayer(marker);
        }
    });
}

// Update statistics chart
function updateChart() {
    const ctx = document.getElementById('nameChart');
    if (!ctx) return;

    const nameCount = {};
    markers.forEach(marker => {
        const name = marker.data.name || '未知';
        nameCount[name] = (nameCount[name] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(nameCount),
            datasets: [{
                data: Object.values(nameCount),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                datalabels: {
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// Geolocation
function locateMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                map.setView([lat, lng], 16);
                
                // Add location marker
                L.marker([lat, lng], {
                    icon: L.icon({
                        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI4IiBmaWxsPSIjMDA3YmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    })
                }).addTo(map).bindPopup('您的位置').openPopup();
            },
            error => {
                alert('無法取得您的位置');
            }
        );
    } else {
        alert('您的瀏覽器不支援地理定位功能');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // Initialize Bootstrap modal
    coordinatesModal = new bootstrap.Modal(document.getElementById('coordinatesModal'));

    // Filter input
    filterInput.addEventListener('input', function() {
        filterMarkers(this.value);
    });

    // Locate me button
    document.getElementById('locate-me').addEventListener('click', locateMe);

    // Coordinates input button
    document.getElementById('input-coordinates').addEventListener('click', function() {
        coordinatesModal.show();
    });

    // Coordinate input handling
    document.getElementById('coordinatesInput').addEventListener('input', function() {
        const coords = this.value.split(',');
        if (coords.length === 2) {
            document.getElementById('latitude').value = coords[0].trim();
            document.getElementById('longitude').value = coords[1].trim();
        }
    });

    // Zoom to coordinates
    document.getElementById('zoomToCoordinates').addEventListener('click', function() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 16);
            coordinatesModal.hide();
            
            // Clear inputs
            document.getElementById('coordinatesInput').value = '';
            document.getElementById('latitude').value = '';
            document.getElementById('longitude').value = '';
        } else {
            alert('請輸入有效的座標');
        }
    });

    // Tutorial popup
    document.getElementById('tutorial-icon').addEventListener('click', function() {
        document.getElementById('tutorial-popup').style.display = 'block';
    });

    document.getElementById('tutorial-closer').addEventListener('click', function() {
        document.getElementById('tutorial-popup').style.display = 'none';
    });

    // Route handling
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const coords = hash.split('/');
        if (coords.length === 2) {
            const lat = parseFloat(coords[0]);
            const lng = parseFloat(coords[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                setTimeout(() => {
                    map.setView([lat, lng], 16);
                }, 500);
            }
        }
    }
});

// Sidebar control functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        toggleBtn.classList.remove('sidebar-open');
        toggleBtn.innerHTML = '<i class="bi bi-list"></i> 圖層列表';
    } else {
        sidebar.classList.add('active');
        toggleBtn.classList.add('sidebar-open');
        toggleBtn.innerHTML = '<i class="bi bi-x"></i> 關閉';
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-pane`).classList.add('active');
    
    // Reapply filter if exists
    const filterInput = document.getElementById(`${tabName}-filter`);
    if (filterInput && filterInput.value) {
        filterDataList(tabName);
    }
}

function updateDataList(layerName, filterText = '') {
    const listElement = document.getElementById(`${layerName}-list`);
    const counterElement = listElement.previousElementSibling;
    const data = layerData[layerName];
    
    // Clear existing list
    listElement.innerHTML = '';
    
    // Filter data based on search text
    const filteredData = filterText ? 
        data.filter(item => {
            const searchStr = filterText.toLowerCase();
            const nameMatch = item.name && item.name.toLowerCase().includes(searchStr);
            const descMatch = item.description && item.description.toLowerCase().includes(searchStr);
            
            // Check properties for additional fields
            let propsMatch = false;
            if (item.properties) {
                propsMatch = Object.values(item.properties).some(val => 
                    val && val.toString().toLowerCase().includes(searchStr)
                );
            }
            
            return nameMatch || descMatch || propsMatch;
        }) : data;
    
    // Update counter
    const filterStatus = filterText ? ` (顯示 ${filteredData.length} / ${data.length} 筆)` : '';
    counterElement.textContent = `共 ${data.length} 筆資料${filterStatus}`;
    
    // Show no results message if needed
    if (filteredData.length === 0) {
        listElement.innerHTML = '<li class="no-results">沒有符合的搜尋結果</li>';
        return;
    }
    
    // Create list items
    filteredData.forEach(item => {
        const li = document.createElement('li');
        li.className = 'data-list-item';
        li.id = `list-item-${item.id}`;
        
        // Format the display based on layer type
        let title = item.name;
        let details = '';
        let address = '';
        
        // Extract address from properties
        if (item.properties) {
            // Common address field names
            address = item.properties['地址'] || 
                     item.properties['地點'] || 
                     item.properties['address'] || 
                     item.properties['location'] ||
                     item.properties['Address'] ||
                     item.properties['Location'] ||
                     '';
                     
            // For demands layer, sometimes address is in the name field
            if (!address && layerName === 'demands' && item.name) {
                // Check if name contains address patterns
                if (item.name.includes('路') || item.name.includes('街') || item.name.includes('巷') || item.name.includes('號')) {
                    address = item.name;
                }
            }
        }
        
        if (layerName === 'government') {
            const iconInfo = getGovernmentIconType(item.type);
            title = `${iconInfo.icon} ${item.name}`;
            details = item.description || '';
        } else if (layerName === 'demands') {
            const iconInfo = getMyMapsIconType(item.type);
            // If address is in the name, use a generic title
            if (address === item.name) {
                title = `${iconInfo.icon} ${item.typeZh || '救災需求'}`;
            } else {
                title = `${iconInfo.icon} ${item.name}`;
            }
            details = item.typeZh || '';
            if (item.properties && item.properties['聯繫方式']) {
                details += details ? ' | ' : '';
                details += item.properties['聯繫方式'];
            }
        } else if (layerName === 'stay') {
            title = `🏠 ${item.name}`;
            if (item.properties) {
                const contact = item.properties['聯繫方式'] || item.properties['contact'] || '';
                if (contact) {
                    details = contact;
                }
            }
        } else if (layerName === 'wash') {
            title = `🚿 ${item.name}`;
            if (item.properties) {
                const contact = item.properties['聯繫方式'] || item.properties['contact'] || '';
                if (contact) {
                    details = contact;
                }
            }
        } else if (layerName === 'submissions') {
            const reportContent = item.properties['通報內容'] || '';
            const iconInfo = getIconForReportType(reportContent);
            title = `${iconInfo.icon} ${item.name || '通報資訊'}`;
            // For submissions, try to get village info
            const village = item.properties['鄉鎮市區村里'] || '';
            if (village) {
                details = village;
            }
            // Also check for address in submission properties
            if (!address && item.properties) {
                address = item.properties['詳細地址'] || item.properties['地址'] || '';
            }
        }
        
        li.innerHTML = `
            <div class="data-list-item-title">${title}</div>
            ${address ? `<div class="data-list-item-address">📍 ${address}</div>` : ''}
            ${details ? `<div class="data-list-item-details">${details}</div>` : ''}
        `;
        
        // Add click handler
        li.addEventListener('click', () => {
            navigateToItem(item, layerName);
        });
        
        listElement.appendChild(li);
    });
}

function filterDataList(layerName) {
    const filterInput = document.getElementById(`${layerName}-filter`);
    const filterText = filterInput ? filterInput.value : '';
    updateDataList(layerName, filterText);
    
    // Show/hide clear button based on input
    const clearButton = filterInput ? filterInput.nextElementSibling : null;
    if (clearButton) {
        clearButton.style.display = filterText ? 'block' : 'none';
    }
}

function clearFilter(layerName) {
    const filterInput = document.getElementById(`${layerName}-filter`);
    if (filterInput) {
        filterInput.value = '';
        filterDataList(layerName);
    }
}

function navigateToItem(item, layerName) {
    // Remove previous active states
    document.querySelectorAll('.data-list-item').forEach(el => {
        el.classList.remove('active');
    });
    
    // Add active state to clicked item
    const listItem = document.getElementById(`list-item-${item.id}`);
    if (listItem) {
        listItem.classList.add('active');
    }
    
    // Clear previous highlighted markers
    Object.values(activeMarkers).forEach(marker => {
        if (marker && marker.setIcon) {
            // Reset to original icon (we need to recreate it)
            recreateOriginalIcon(marker, layerName);
        }
    });
    activeMarkers = {};
    
    // Navigate to the location
    if (item.lat && item.lng) {
        map.setView([item.lat, item.lng], 16);
        
        // Open the popup
        if (item.marker) {
            item.marker.openPopup();
            
            // Highlight the marker
            highlightMarker(item.marker, layerName);
            activeMarkers[item.id] = item.marker;
        }
    }
}

function highlightMarker(marker, layerName) {
    // Create a highlighted version of the icon
    let iconHtml = '';
    
    if (layerName === 'government') {
        const iconInfo = getGovernmentIconType(marker.itemType || 'general');
        iconHtml = `<div style="background-color: ${iconInfo.color}; border: 4px solid #ffff00; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`;
    } else {
        // Get the current icon HTML and add highlight
        const currentIcon = marker.options.icon;
        if (currentIcon && currentIcon.options && currentIcon.options.html) {
            const originalHtml = currentIcon.options.html;
            iconHtml = originalHtml.replace('width: 24px; height: 24px;', 'width: 32px; height: 32px;')
                                   .replace('border: 2px solid white;', 'border: 4px solid #ffff00;')
                                   .replace('box-shadow: 0 2px 5px rgba(0,0,0,0.3);', 'box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3);');
        }
    }
    
    if (iconHtml) {
        const highlightedIcon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
        marker.setIcon(highlightedIcon);
    }
}

function recreateOriginalIcon(marker, layerName) {
    // Recreate the original icon based on layer type
    // This is a simplified version - you might need to store original icon info
    const normalIcon = L.divIcon({
        html: marker.originalIconHtml || '<div style="background-color: #007bff; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">📍</div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
    marker.setIcon(normalIcon);
}

// Update form submissions loading to track data
const originalLoadFormSubmissions = loadFormSubmissions;
loadFormSubmissions = function() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJH_nQEBtvPNRvFS4EYo-deJ6WqnLb8vII1D2atzeHeGObimmfgE11wA_gveSWYt9uAhD7kYsUlH0m/pub?gid=1425282360&single=true&output=csv';
    
    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) return;
            
            const headers = parseCSVLine(lines[0]);
            
            submissionsLayer.clearLayers();
            layerData.submissions = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                const submission = {};
                
                headers.forEach((header, index) => {
                    submission[header] = values[index] || '';
                });
                
                let lat = parseFloat(submission['緯度'] || submission['latitude'] || submission['Latitude']);
                let lng = parseFloat(submission['經度'] || submission['longitude'] || submission['Longitude']);
                
                if (isNaN(lat) || isNaN(lng)) {
                    Object.entries(submission).forEach(([key, value]) => {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                            if (key.toLowerCase().includes('lat') || key.includes('緯')) {
                                lat = numValue;
                            } else if (key.toLowerCase().includes('lng') || key.toLowerCase().includes('lon') || key.includes('經')) {
                                lng = numValue;
                            }
                        }
                    });
                }
                
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    const marker = createSubmissionMarker(submission, lat, lng);
                    layerData.submissions.push({
                        id: `submission-${i}`,
                        name: submission['鄉鎮市區村里'] || submission['通報內容'] || '通報資訊',
                        lat: lat,
                        lng: lng,
                        marker: marker,
                        properties: submission
                    });
                }
            }
            updateDataList('submissions');
        })
        .catch(error => {
            console.error('Error loading form submissions:', error);
        });
};