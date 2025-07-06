// EMIC Disaster Map JavaScript

// Initialize map centered on Taiwan
const map = L.map('map').setView([23.5, 121], 8);

// Add NLSC map tiles
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>',
    maxZoom: 18
}).addTo(map);

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
    
    return div;
};
legend.addTo(map);

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
                return marker;
            },
            onEachFeature: function (feature, layer) {
                // Initial popup with basic info
                layer.bindPopup(createPopupContent(feature.properties, null));
                
                // Fetch detailed info when popup opens
                layer.on('popupopen', async function() {
                    const details = await fetchCaseDetails(feature.properties.CASE_ID);
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
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        document.getElementById('loading').innerText = '載入失敗';
    });