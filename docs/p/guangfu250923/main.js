// Initialize variables
let map;
let markersLayer;
let markers = [];
let coordinatesModal;
let cunliLayer;
let submissionsLayer;
let governmentLayer;
let layerData = {
    government: [],
    submissions: []
};
let activeMarkers = {};
let submissionMarkers = {}; // Store submission markers by UUID

// Generate map service buttons
function getMapServiceButtons(lat, lng) {
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const bingMapsUrl = `https://www.bing.com/maps?cp=${lat}~${lng}&lvl=16&sp=point.${lat}_${lng}_Location`;
    
    return `
        <div style="display: flex; gap: 8px; margin-top: 10px;">
            <a href="${googleMapsUrl}" target="_blank" style="flex: 1; padding: 6px 12px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; text-align: center; font-size: 12px; display: inline-block;">
                <i class="bi bi-geo-alt"></i> Google Maps
            </a>
            <a href="${bingMapsUrl}" target="_blank" style="flex: 1; padding: 6px 12px; background-color: #00897b; color: white; text-decoration: none; border-radius: 4px; text-align: center; font-size: 12px; display: inline-block;">
                <i class="bi bi-map"></i> Bing Maps
            </a>
        </div>
    `;
}

// Generate UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Helper function to show a marker in cluster group
function showMarkerInCluster(marker, clusterGroup) {
    if (!marker || !clusterGroup) return false;
    
    // Use zoomToShowLayer if available (most reliable method)
    if (clusterGroup.zoomToShowLayer) {
        clusterGroup.zoomToShowLayer(marker, function() {
            // Marker is now visible, open popup after a short delay
            setTimeout(() => {
                marker.openPopup();
            }, 100);
        });
        return true;
    }
    
    // Fallback: try to get the visible parent and spiderfy
    try {
        const visibleOne = clusterGroup.getVisibleParent(marker);
        
        if (visibleOne && visibleOne !== marker) {
            // The marker is inside a cluster
            if (visibleOne.spiderfy) {
                visibleOne.spiderfy();
                // Open popup after spiderfying
                setTimeout(() => {
                    marker.openPopup();
                }, 200);
                return true;
            }
        }
    } catch (e) {
        console.log('Cluster navigation fallback failed:', e);
    }
    
    return false;
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

    // Initialize submissions layer cluster group
    submissionsLayer = L.markerClusterGroup({
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


    // Load markers data
    loadMarkers();
    
    // Load form submissions
    loadFormSubmissions();
    
    
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
                        
                        popupContent += `
                                </table>
                                <div style="text-align: center; margin-top: 10px;">
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
        })
        .catch(error => {
            console.error('Error loading cunli basemap:', error);
        });
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
            layerData.submissions = [];
            
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
                    // Extract UUID from submission data
                    let uuid = null;
                    Object.entries(submission).forEach(([key, value]) => {
                        if (key.includes('地點編號') || key.toLowerCase().includes('uuid') || 
                            (key.includes('編號') && value && value.length >= 8)) {
                            uuid = value;
                        }
                    });
                    
                    const marker = createSubmissionMarker(submission, lat, lng);
                    
                    // Add to layer data for data list
                    layerData.submissions.push({
                        id: `submission-${i}`,
                        uuid: uuid,
                        name: submission['通報內容'] || '救災資訊',
                        description: submission['聯絡資訊與說明'] || '',
                        lat: lat,
                        lng: lng,
                        marker: marker,
                        properties: submission
                    });
                }
            }
            
            // Update the data list for submissions
            updateDataList('submissions');
        })
        .catch(error => {
            console.error('Error loading form submissions:', error);
        });
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
            </table>
            ${getMapServiceButtons(lat, lng)}
        </div>
    `;
    
    marker.bindPopup(popupContent, {
        maxWidth: 400,
        autoPan: false,
        keepInView: true
    });
    
    // Add click event to update URL hash with coordinates
    marker.on('click', function() {
        history.replaceState(null, null, `#${lat}/${lng}`);
    });
    
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

// Extract Google Drive file ID from various URL formats
function extractGoogleDriveFileId(url) {
    if (!url) return null;
    
    // Match various Google Drive URL patterns
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9-_]+)/,  // /file/d/FILE_ID/
        /id=([a-zA-Z0-9-_]+)/,         // ?id=FILE_ID
        /\/([a-zA-Z0-9-_]{25,})/       // Generic long ID pattern
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
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
    `;
    
    // Check for photo uploads in submission
    let photoUrl = null;
    Object.entries(submission).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
            // Look for fields that might contain Google Drive photo URLs
            if (key.includes('照片') || key.includes('圖片') || key.includes('photo') || key.includes('image') || 
                key.toLowerCase().includes('upload') || value.includes('drive.google.com')) {
                const fileId = extractGoogleDriveFileId(value);
                if (fileId) {
                    photoUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                }
            }
        }
    });
    
    // Add photo preview if available
    if (photoUrl) {
        popupContent += `
            <div style="margin-bottom: 10px;">
                <iframe src="${photoUrl}" width="100%" height="200" style="border: none; border-radius: 4px;" allow="autoplay"></iframe>
            </div>
        `;
    }
    
    popupContent += `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    `;
    
    // Define which columns to show and their labels based on actual Google Sheets structure
    const columnMapping = {
        0: '通報時間',        // Column 0: timestamp
        // 1: skip photo column (already shown as preview)
        2: '通報內容',        // Column 2: content
        3: '聯絡資訊與說明',   // Column 3: contact/description
        4: '鄉鎮市區',        // Column 4: city/district
        5: '村里'            // Column 5: village
    };

    const submissionEntries = Object.entries(submission);
    submissionEntries.forEach(([key, value], index) => {
        if (value && value.trim() !== '' && columnMapping[index]) {
            popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                        ${columnMapping[index]}
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${value}
                    </td>
                </tr>
            `;
        }
    });
    
    popupContent += `
            </table>
            ${getMapServiceButtons(lat, lng)}
        </div>
    `;
    
    marker.bindPopup(popupContent, {
        maxWidth: 400,
        autoPan: false,
        keepInView: true
    });
    
    // Extract UUID from submission data (it could be in various field names)
    let uuid = null;
    Object.entries(submission).forEach(([key, value]) => {
        if (key.includes('地點編號') || key.toLowerCase().includes('uuid') || 
            (key.includes('編號') && value && value.length >= 8)) {
            uuid = value;
        }
    });
    
    // Add click event to set URL hash and update hash when popup opens
    if (uuid) {
        submissionMarkers[uuid] = marker;
        marker.on('click', function() {
            history.replaceState(null, null, `#${uuid}`);
        });
    }
    
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

    marker.bindPopup(popupContent, {
        maxWidth: 400,
        autoPan: false,
        keepInView: true
    });
    
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

    // Filter input (removed - now handled in sidebar)
    // filterInput.addEventListener('input', function() {
    //     filterMarkers(this.value);
    // });

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
            // Handle coordinate-based hash (lat/lng format)
            const lat = parseFloat(coords[0]);
            const lng = parseFloat(coords[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                setTimeout(() => {
                    map.setView([lat, lng], 16);
                }, 500);
            }
        } else {
            // Handle UUID-based hash for reports
            handleUrlHash();
        }
    }
});

// Handle URL hash navigation to specific reports
function navigateToReport(uuid) {
    if (submissionMarkers[uuid]) {
        const marker = submissionMarkers[uuid];
        const latLng = marker.getLatLng();
        
        // Center map on marker and zoom in
        map.setView(latLng, 16);
        
        // Handle clustered marker - try to spiderfy or zoom to show
        setTimeout(() => {
            if (showMarkerInCluster(marker, submissionsLayer)) {
                // Cluster navigation handled the popup
                return;
            }
            
            // Marker is not in cluster or cluster handling failed, open popup directly
            marker.openPopup();
        }, 500);
        
        return true;
    }
    return false;
}

// Check URL hash on page load and handle navigation
function handleUrlHash() {
    const hash = window.location.hash.slice(1); // Remove the # symbol
    if (hash) {
        // Wait for submissions to be loaded before trying to navigate
        const checkAndNavigate = () => {
            if (navigateToReport(hash)) {
                return; // Successfully navigated
            }
            // If marker not found yet, try again in 500ms
            setTimeout(checkAndNavigate, 500);
        };
        checkAndNavigate();
    }
}

// Listen for hash changes
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        navigateToReport(hash);
    }
});

// Sidebar control functions
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebar-toggle');
    sidebar.classList.add('active');
    // Hide toggle button when sidebar is open
    if (toggleButton) {
        toggleButton.style.display = 'none';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebar-toggle');
    sidebar.classList.remove('active');
    // Show toggle button when sidebar is closed
    if (toggleButton) {
        toggleButton.style.display = 'block';
    }
}

// Keep toggleSidebar for backward compatibility if needed
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('active')) {
        closeSidebar();
    } else {
        openSidebar();
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
    let filteredData = filterText ? 
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
    
    // Sort submissions by reported time in descending order (newest first)
    if (layerName === 'submissions') {
        console.log('Before sorting, first few items:', filteredData.slice(0, 3).map(item => ({
            name: item.name,
            properties: item.properties,
            firstValue: item.properties ? Object.values(item.properties)[0] : 'no props'
        })));
        
        filteredData = filteredData.sort((a, b) => {
            // Get the first column value (index 0) which should be the timestamp
            const timeA = a.properties ? Object.values(a.properties)[0] || '' : '';
            const timeB = b.properties ? Object.values(b.properties)[0] || '' : '';
            
            // Sort in descending order (newest first) using simple string comparison
            const result = timeB.localeCompare(timeA);
            
            return result;
        });
        
        console.log('After sorting, first few items:', filteredData.slice(0, 3).map(item => ({
            name: item.name,
            firstValue: item.properties ? Object.values(item.properties)[0] : 'no props'
        })));
    }
    
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
                     
        }
        
        if (layerName === 'government') {
            const iconInfo = getGovernmentIconType(item.type);
            title = `${iconInfo.icon} ${item.name}`;
            details = item.description || '';
        } else if (layerName === 'submissions') {
            const reportContent = item.properties['通報內容'] || '';
            const iconInfo = getIconForReportType(reportContent);
            title = `${iconInfo.icon} ${item.name || '通報資訊'}`;
            
            // Get contact info for details if available
            const contact = item.properties['聯絡資訊與說明'] || item.properties['聯繫方式'] || '';
            if (contact) {
                details = contact;
            }
            
            // Combine town and village for address display
            const submissionEntries = Object.entries(item.properties);
            let town = '';
            let village = '';
            
            // Get town (column 4) and village (column 5) based on column mapping
            if (submissionEntries.length > 4 && submissionEntries[4][1]) {
                town = submissionEntries[4][1].trim();
            }
            if (submissionEntries.length > 5 && submissionEntries[5][1]) {
                village = submissionEntries[5][1].trim();
            }
            
            // Combine town and village for address
            if (town || village) {
                address = [town, village].filter(Boolean).join('');
            }
        }
        
        // Add timestamp for submissions (reports)
        let timestampHtml = '';
        if (layerName === 'submissions' && item.properties) {
            const timestamp = Object.values(item.properties)[0] || '';
            if (timestamp) {
                // Format timestamp for display
                const displayTime = timestamp.replace('2025/', '').replace(' ', ' '); // Remove year, keep as is
                timestampHtml = `<div class="data-list-item-timestamp">${displayTime}</div>`;
            }
        }
        
        li.innerHTML = `
            <div class="data-list-item-header">
                <div class="data-list-item-title">${title}</div>
                ${timestampHtml}
            </div>
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
    // Close sidebar to show the marker clearly
    closeSidebar();
    
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
        
        // Update URL hash 
        if (item.uuid && layerName === 'submissions') {
            // Use UUID for submissions
            history.replaceState(null, null, `#${item.uuid}`);
        } else {
            // Use coordinates for other layer types
            history.replaceState(null, null, `#${item.lat}/${item.lng}`);
        }
        
        // Open the popup
        if (item.marker) {
            // Handle clustered markers
            let clusterGroup = null;
            if (layerName === 'submissions') {
                clusterGroup = submissionsLayer;
            } else if (layerName === 'government') {
                clusterGroup = governmentLayer;
            }
            
            // Try to show marker in cluster first
            if (clusterGroup && showMarkerInCluster(item.marker, clusterGroup)) {
                // Cluster navigation handled the popup, but we still need to highlight
                setTimeout(() => {
                    highlightMarker(item.marker, layerName);
                    activeMarkers[item.id] = item.marker;
                }, 300);
            } else {
                // Marker is not clustered or cluster handling failed
                item.marker.openPopup();
                
                // Highlight the marker
                highlightMarker(item.marker, layerName);
                activeMarkers[item.id] = item.marker;
            }
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
                    // Extract UUID from submission data
                    let uuid = null;
                    Object.entries(submission).forEach(([key, value]) => {
                        if (key.includes('地點編號') || key.toLowerCase().includes('uuid') || 
                            (key.includes('編號') && value && value.length >= 8)) {
                            uuid = value;
                        }
                    });
                    
                    const marker = createSubmissionMarker(submission, lat, lng);
                    layerData.submissions.push({
                        id: `submission-${i}`,
                        uuid: uuid,
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