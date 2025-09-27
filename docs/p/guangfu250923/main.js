// Initialize variables
let map;
let markersLayer;
let markers = [];
let filterInput = document.getElementById('filter-input');
let coordinatesModal;
let cunliLayer;
let submissionsLayer;
let villageLabels = L.layerGroup();

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

    // Initialize village labels layer
    map.addLayer(villageLabels);

    // Add zoom event listener to show/hide village names
    map.on('zoomend', updateVillageLabels);

    // Load markers data
    loadMarkers();
    
    // Load form submissions
    loadFormSubmissions();
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