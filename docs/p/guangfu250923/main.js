// Initialize variables
let map;
let markersLayer;
let markers = [];
let coordinatesModal;
let cunliLayer;
let submissionsLayer;
let submissionsLayer2;
let governmentLayer;
let targetsLayer;
let layerData = {
    government: [],
    submissions: [],
    submissions2: [],
    targets: []
};
let activeMarkers = {};
let submissionMarkers = {}; // Store submission markers by UUID
let uuidToLayer = {}; // Map UUID to layer (1 or 2)

// Comprehensive feature cache for instant access
let featureCache = {
    submissions: {}, // UUID -> full feature data
    government: {}, // ID -> full feature data  
    targets: {}     // ID -> full feature data
};

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

// Helper function to show a marker in cluster group with multiple strategies
function showMarkerInCluster(marker, clusterGroup) {
    if (!marker || !clusterGroup) return false;
    
    // Strategy 1: Use zoomToShowLayer if available (most reliable method)
    if (clusterGroup.zoomToShowLayer) {
        clusterGroup.zoomToShowLayer(marker, function() {
            // Marker is now visible, open popup after a short delay
            setTimeout(() => {
                marker.openPopup();
            }, 100);
        });
        return true;
    }
    
    // Strategy 2: Try zoom-based approach first
    const currentZoom = map.getZoom();
    const maxZoom = map.getMaxZoom();
    
    if (currentZoom < maxZoom) {
        // Zoom in to potentially break up clusters
        map.setView(marker.getLatLng(), Math.min(currentZoom + 3, maxZoom));
        
        setTimeout(() => {
            // Check if marker is now visible after zoom
            const visibleParent = clusterGroup.getVisibleParent(marker);
            if (!visibleParent || visibleParent === marker) {
                marker.openPopup();
            } else {
                // Still clustered, try recursive expansion
                expandClusterRecursively(marker, clusterGroup, 0);
            }
        }, 500);
        return true;
    }
    
    // Strategy 3: Enhanced fallback with recursive cluster expansion
    return expandClusterRecursively(marker, clusterGroup, 0);
}

// Recursively expand clusters until the target marker is visible
function expandClusterRecursively(marker, clusterGroup, depth) {
    if (depth > 10) {
        console.warn('Maximum cluster expansion depth reached');
        return false;
    }
    
    if (depth === 0) console.log('Starting cluster expansion for marker');
    
    try {
        const visibleOne = clusterGroup.getVisibleParent(marker);
        
        if (!visibleOne || visibleOne === marker) {
            // Marker is already visible, open popup
            console.log('Target marker is now visible, opening popup');
            setTimeout(() => {
                marker.openPopup();
            }, 50);
            return true;
        }
        
        if (depth < 3) console.log(`Target marker still clustered, attempting expansion (depth ${depth})`);
        
        // The marker is inside a cluster, expand it
        if (visibleOne.spiderfy) {
            if (depth < 2) console.log('Using spiderfy to expand cluster');
            visibleOne.spiderfy();
            
            // Wait for spiderfy animation to complete, then check again
            setTimeout(() => {
                expandClusterRecursively(marker, clusterGroup, depth + 1);
            }, 300);
            return true;
        } else if (visibleOne.fire) {
            // Try firing click event directly on the cluster
            if (depth < 2) console.log('Firing click event on cluster');
            visibleOne.fire('click');
            
            setTimeout(() => {
                expandClusterRecursively(marker, clusterGroup, depth + 1);
            }, 300);
            return true;
        } else {
            // Try simulating click on the cluster using lower-level approach
            if (depth < 2) console.log('Attempting manual cluster expansion');
            
            // Get cluster bounds and zoom to it
            const bounds = visibleOne.getBounds ? visibleOne.getBounds() : null;
            if (bounds) {
                map.fitBounds(bounds, { maxZoom: map.getZoom() + 2 });
            }
            
            setTimeout(() => {
                expandClusterRecursively(marker, clusterGroup, depth + 1);
            }, 400);
            return true;
        }
    } catch (e) {
        console.log('Cluster expansion failed at depth', depth, ':', e);
        return false;
    }
}

// Show feature popup instantly using cached data (bypasses cluster expansion)
function showFeaturePopupInstantly(featureId, layerName) {
    let featureData = null;
    
    // Get feature data from cache
    if (layerName === 'submissions' || layerName === 'submissions2') {
        featureData = featureCache.submissions[featureId];
    } else if (layerName === 'government') {
        featureData = featureCache.government[featureId];
    } else if (layerName === 'targets') {
        featureData = featureCache.targets[featureId];
    }
    
    if (!featureData) {
        console.warn('Feature data not found in cache for:', featureId);
        return false;
    }
    
    // Create and show popup instantly without needing the marker
    const popup = L.popup({
        maxWidth: 400,
        autoPan: false,
        keepInView: true
    });
    
    let popupContent = '';
    
    // Generate popup content based on layer type
    if (layerName === 'submissions' || layerName === 'submissions2') {
        popupContent = createSubmissionPopupContent(featureData);
    } else if (layerName === 'government') {
        popupContent = createGovernmentPopupContent(featureData);
    } else if (layerName === 'targets') {
        popupContent = createTargetPopupContent(featureData);
    }
    
    // Show popup at the feature location
    popup.setLatLng([featureData.lat, featureData.lng])
         .setContent(popupContent)
         .openOn(map);
    
    // Center map on the feature
    map.setView([featureData.lat, featureData.lng], 16);
    
    // Create and place a temporary highlighted marker at the exact location
    // This ensures users can see exactly which point the popup refers to
    createAndPlaceTemporaryMarker(featureData, layerName, featureId);
    
    return true;
}

// Create and place a temporary highlighted marker for instant popups
function createAndPlaceTemporaryMarker(featureData, layerName, featureId) {
    // Create a highlighted marker based on layer type
    let markerIcon;
    
    if (layerName === 'government') {
        const iconInfo = getGovernmentIconType(featureData.type || 'general');
        markerIcon = L.divIcon({
            html: `<div style="background-color: ${iconInfo.color}; border: 4px solid #ffff00; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3); animation: pulse 2s infinite;">${iconInfo.icon}</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    } else if (layerName === 'targets') {
        const priorityInfo = getTargetPriorityInfo(featureData.priorityLevel || '6級');
        markerIcon = L.divIcon({
            html: `<div style="background-color: ${priorityInfo.color}; border: 4px solid #ffff00; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3); animation: pulse 2s infinite;">${priorityInfo.level}</div>`,
            className: '',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17]
        });
    } else if (layerName === 'submissions' || layerName === 'submissions2') {
        const reportContent = featureData.properties['通報內容'] || '其他';
        const iconInfo = getIconForReportType(reportContent);
        markerIcon = L.divIcon({
            html: `<div style="background-color: ${iconInfo.color}; border: 4px solid #ffff00; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3); animation: pulse 2s infinite;">${iconInfo.icon}</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    } else {
        // Default highlighted marker
        markerIcon = L.divIcon({
            html: '<div style="background-color: #007bff; border: 4px solid #ffff00; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3); animation: pulse 2s infinite;">📍</div>',
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    }
    
    // Create temporary marker
    const tempMarker = L.marker([featureData.lat, featureData.lng], { 
        icon: markerIcon,
        zIndexOffset: 1000  // Ensure it appears above clusters
    }).addTo(map);
    
    // Store the temporary marker for cleanup
    activeMarkers[featureId] = tempMarker;
    
    // Also try to highlight the original marker if it's accessible
    setTimeout(() => {
        if (featureData.marker && featureData.marker.setIcon) {
            try {
                highlightMarker(featureData.marker, layerName);
            } catch (e) {
                console.log('Could not highlight original marker (likely clustered):', e);
            }
        }
    }, 100);
}

// Create popup content for submissions
function createSubmissionPopupContent(featureData) {
    const reportContent = featureData.properties['通報內容'] || '';
    const iconInfo = getIconForReportType(reportContent);
    
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${iconInfo.color}; color: white; border-radius: 4px; text-align: center;">
                ${iconInfo.icon} 救災資訊回報
            </h6>
    `;
    
    // Check for photo uploads in submission
    let photoUrl = null;
    Object.entries(featureData.properties).forEach(([key, value]) => {
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
    
    // Use the same column mapping as original markers
    const columnMapping = {
        0: '通報時間',        // Column 0: timestamp
        // 1: skip photo column (already shown as preview)
        2: '通報內容',        // Column 2: content
        3: '聯絡資訊與說明',   // Column 3: contact/description
        4: '鄉鎮市區',        // Column 4: city/district
        5: '村里'            // Column 5: village
    };
    
    const submissionEntries = Object.entries(featureData.properties);
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
            ${getMapServiceButtons(featureData.lat, featureData.lng)}
        </div>
    `;
    
    return popupContent;
}

// Create popup content for government facilities
function createGovernmentPopupContent(featureData) {
    const iconInfo = getGovernmentIconType(featureData.type);
    
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
                        ${featureData.name}
                    </td>
                </tr>
    `;
    
    if (featureData.description && featureData.description.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        說明
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${featureData.description}
                    </td>
                </tr>
        `;
    }
    
    popupContent += `
            </table>
            ${getMapServiceButtons(featureData.lat, featureData.lng)}
        </div>
    `;
    
    return popupContent;
}

// Create popup content for targets
function createTargetPopupContent(featureData) {
    const priorityInfo = getTargetPriorityInfo(featureData.priorityLevel);
    
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${priorityInfo.color}; color: white; border-radius: 4px; text-align: center;">
                🏠 救災目標 (${featureData.priorityLevel})
            </h6>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 35%; border-right: 1px solid #dee2e6;">
                        地址
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${featureData.address}
                    </td>
                </tr>
    `;
    
    if (featureData.sedimentLevel && featureData.sedimentLevel.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        泥沙淤積程度
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${featureData.sedimentLevel}
                    </td>
                </tr>
        `;
    }
    
    if (featureData.furnitureRemoved && featureData.furnitureRemoved.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        大型廢棄家具已移除
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${featureData.furnitureRemoved}
                    </td>
                </tr>
        `;
    }
    
    if (featureData.cleaningStage && featureData.cleaningStage.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        進入一般清潔階段
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${featureData.cleaningStage}
                    </td>
                </tr>
        `;
    }
    
    if (featureData.lastUpdateDate && featureData.lastUpdateDate.trim() !== '') {
        const updateInfo = featureData.lastUpdateTime && featureData.lastUpdateTime.trim() !== '' ? `${featureData.lastUpdateDate} ${featureData.lastUpdateTime}` : featureData.lastUpdateDate;
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        最後更新
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${updateInfo}
                    </td>
                </tr>
        `;
    }
    
    popupContent += `
            </table>
            ${getMapServiceButtons(featureData.lat, featureData.lng)}
        </div>
    `;
    
    return popupContent;
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

    // Initialize submissions layer cluster group (layer 1: urgent needs)
    submissionsLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    }).addTo(map);

    // Initialize submissions layer 2 cluster group (other reports)
    submissionsLayer2 = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    });  // Not added to map by default

    // Initialize government points layer cluster group
    governmentLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    }).addTo(map);

    // Initialize targets layer cluster group
    targetsLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    });  // Not added to map by default

    // Load markers data
    loadMarkers();
    
    // Load form submissions
    loadFormSubmissions();
    
    
    // Load government points
    loadGovernmentPoints();
    
    // Load targets data
    loadTargets();
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
            
            // Clear existing submissions and mappings
            submissionsLayer.clearLayers();
            submissionsLayer2.clearLayers();
            layerData.submissions = [];
            layerData.submissions2 = [];
            uuidToLayer = {}; // Clear UUID to layer mapping
            featureCache.submissions = {}; // Clear submissions feature cache
            
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
                    
                    // Determine which layer based on report content
                    const reportContent = (submission['通報內容'] || '').trim();
                    
                    // Layer 2 (Resources): 提供洗澡點, 提供住宿點, 其他
                    // Layer 1 (Urgent needs): 需要志工, 需要物資
                    const isResource = reportContent === '提供洗澡點' || 
                                      reportContent === '提供住宿點' || 
                                      reportContent === '其他' ||
                                      reportContent.includes('提供洗澡點') || 
                                      reportContent.includes('提供住宿點') || 
                                      reportContent.includes('其他');
                    
                    const isUrgent = !isResource;  // If not a resource, it's an urgent need
                    
                    const marker = createSubmissionMarker(submission, lat, lng, isUrgent);
                    
                    // Add to appropriate layer data
                    const dataEntry = {
                        id: `submission-${i}`,
                        uuid: uuid,
                        name: submission['通報內容'] || '救災資訊',
                        description: submission['聯絡資訊與說明'] || '',
                        lat: lat,
                        lng: lng,
                        marker: marker,
                        properties: submission
                    };
                    
                    if (isUrgent) {
                        layerData.submissions.push(dataEntry);
                        // Map UUID to layer 1 and cache feature data
                        if (uuid) {
                            uuidToLayer[uuid] = 1;
                            featureCache.submissions[uuid] = dataEntry;
                        }
                    } else {
                        layerData.submissions2.push(dataEntry);
                        // Map UUID to layer 2 and cache feature data
                        if (uuid) {
                            uuidToLayer[uuid] = 2;
                            featureCache.submissions[uuid] = dataEntry;
                        }
                    }
                }
            }
            
            // Update the data lists for both submission layers
            updateDataList('submissions');
            updateDataList('submissions2');
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
            // Clear existing government markers and cache
            governmentLayer.clearLayers();
            layerData.government = [];
            featureCache.government = {};
            
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
                    const featureData = {
                        id: `gov-${index}`,
                        name: name,
                        description: description,
                        lat: lat,
                        lng: lng,
                        type: type,
                        marker: marker
                    };
                    
                    layerData.government.push(featureData);
                    // Cache the feature data for instant access
                    featureCache.government[`gov-${index}`] = featureData;
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
    
    // Store type info on marker for icon recreation
    marker.itemType = type;
    
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
        case 'meal_distribution':
            return { icon: '🍱', color: '#ff6b35', label: '便當發放點' }; // Orange for meal distribution
        default:
            return { icon: '🏛️', color: '#3498db', label: '政府設施' }; // Blue for general government
    }
}

// Load targets data
function loadTargets() {
    fetch('data/targets.json')
        .then(response => response.json())
        .then(geojsonData => {
            // Clear existing targets markers and cache
            targetsLayer.clearLayers();
            layerData.targets = [];
            featureCache.targets = {};
            
            geojsonData.features.forEach((feature, index) => {
                if (feature.geometry && feature.geometry.type === 'Point') {
                    const coordinates = feature.geometry.coordinates;
                    const lng = coordinates[0];
                    const lat = coordinates[1];
                    const properties = feature.properties || {};
                    
                    const address = properties['地址'] || '';
                    const sedimentLevel = properties['家戶內泥沙淤積程度現況（公分）'] || '';
                    const furnitureRemoved = properties['屋內大型廢棄家具是否已移除'] || '';
                    const cleaningStage = properties['是否進入一般清潔階段'] || '';
                    const priorityLevel = properties['需求參考的分級與顏色'] || '';
                    const lastUpdateDate = properties['最後更新日期'] || '';
                    const lastUpdateTime = properties['最後更新時間'] || '';
                    
                    const marker = createTargetMarker(address, sedimentLevel, furnitureRemoved, cleaningStage, priorityLevel, lastUpdateDate, lastUpdateTime, lat, lng);
                    const featureData = {
                        id: `target-${index}`,
                        address: address,
                        sedimentLevel: sedimentLevel,
                        furnitureRemoved: furnitureRemoved,
                        cleaningStage: cleaningStage,
                        priorityLevel: priorityLevel,
                        lastUpdateDate: lastUpdateDate,
                        lastUpdateTime: lastUpdateTime,
                        lat: lat,
                        lng: lng,
                        marker: marker
                    };
                    
                    layerData.targets.push(featureData);
                    // Cache the feature data for instant access
                    featureCache.targets[`target-${index}`] = featureData;
                }
            });
            updateDataList('targets');
        })
        .catch(error => {
            console.error('Error loading targets:', error);
        });
}

// Create marker for targets with priority-based color coding
function createTargetMarker(address, sedimentLevel, furnitureRemoved, cleaningStage, priorityLevel, lastUpdateDate, lastUpdateTime, lat, lng) {
    // Get color based on priority level - smaller level means needs more help
    const priorityInfo = getTargetPriorityInfo(priorityLevel);
    
    // Create marker icon
    const targetIcon = L.divIcon({
        html: `<div style="background-color: ${priorityInfo.color}; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${priorityInfo.level}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
    
    const marker = L.marker([lat, lng], { icon: targetIcon });
    
    // Store priority info on marker for highlighting
    marker.itemPriority = priorityLevel;
    
    // Create popup content
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${priorityInfo.color}; color: white; border-radius: 4px; text-align: center;">
                🏠 救災目標 (${priorityLevel})
            </h6>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 35%; border-right: 1px solid #dee2e6;">
                        地址
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${address}
                    </td>
                </tr>
    `;
    
    if (sedimentLevel && sedimentLevel.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        泥沙淤積程度
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${sedimentLevel}
                    </td>
                </tr>
        `;
    }
    
    if (furnitureRemoved && furnitureRemoved.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        大型廢棄家具已移除
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${furnitureRemoved}
                    </td>
                </tr>
        `;
    }
    
    if (cleaningStage && cleaningStage.trim() !== '') {
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        進入一般清潔階段
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${cleaningStage}
                    </td>
                </tr>
        `;
    }
    
    if (lastUpdateDate && lastUpdateDate.trim() !== '') {
        const updateInfo = lastUpdateTime && lastUpdateTime.trim() !== '' ? `${lastUpdateDate} ${lastUpdateTime}` : lastUpdateDate;
        popupContent += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                        最後更新
                    </td>
                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                        ${updateInfo}
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
    
    targetsLayer.addLayer(marker);
    return marker;
}

// Get priority info for target markers
function getTargetPriorityInfo(priorityLevel) {
    const level = priorityLevel.replace('級', '').trim();
    
    switch (level) {
        case '1':
            return { color: '#cf6e69', level: '1', label: '最高優先' };
        case '2':
            return { color: '#cf6e69', level: '2', label: '高優先' };
        case '3':
            return { color: '#d8964b', level: '3', label: '中高優先' };
        case '4':
            return { color: '#e7c451', level: '4', label: '中優先' };
        case '5':
            return { color: '#9dc285', level: '5', label: '低優先' };
        case '6':
            return { color: '#7fa6d7', level: '6', label: '最低優先' };
        default:
            return { color: '#6c757d', level: '?', label: '無法判斷' };
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
function createSubmissionMarker(submission, lat, lng, isUrgent = true) {
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
    
    // Store report content for icon recreation
    marker.reportContent = reportContent;
    
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
    
    // Add marker to appropriate layer
    if (isUrgent) {
        submissionsLayer.addLayer(marker);
    } else {
        submissionsLayer2.addLayer(marker);
    }
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
        
        // Check which layer this UUID belongs to and auto-switch if needed
        const targetLayerNum = uuidToLayer[uuid];
        let targetLayer = null;
        
        if (targetLayerNum === 2) {
            // UUID is in layer 2 (resources)
            targetLayer = submissionsLayer2;
            
            // If layer 2 is not visible, switch to it
            if (!map.hasLayer(submissionsLayer2)) {
                // Remove layer 1 if visible
                if (map.hasLayer(submissionsLayer)) {
                    map.removeLayer(submissionsLayer);
                }
                // Add layer 2
                map.addLayer(submissionsLayer2);
                
                // Update UI to show layer 2 tab as active
                switchTab('submissions2');
            }
        } else {
            // UUID is in layer 1 (urgent needs) - default
            targetLayer = submissionsLayer;
            
            // If layer 1 is not visible, switch to it
            if (!map.hasLayer(submissionsLayer)) {
                // Remove layer 2 if visible
                if (map.hasLayer(submissionsLayer2)) {
                    map.removeLayer(submissionsLayer2);
                }
                // Add layer 1
                map.addLayer(submissionsLayer);
                
                // Update UI to show layer 1 tab as active
                switchTab('submissions');
            }
        }
        
        // Center map on marker and zoom in
        map.setView(latLng, 16);
        
        // Use instant popup system for hash navigation (much faster)
        setTimeout(() => {
            const layerName = targetLayerNum === 2 ? 'submissions2' : 'submissions';
            
            if (showFeaturePopupInstantly(uuid, layerName)) {
                console.log('Hash navigation: Showed popup instantly using cached data');
                return;
            } else {
                // Fallback to cluster expansion if instant popup fails
                console.log('Hash navigation: Falling back to cluster expansion');
                if (targetLayer && showMarkerInCluster(marker, targetLayer)) {
                    // Cluster navigation handled the popup
                    return;
                }
                
                // Marker is not in cluster or cluster handling failed, open popup directly
                marker.openPopup();
            }
        }, 300);
        
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
    
    // Toggle layer visibility based on tab
    if (tabName === 'submissions') {
        // Show urgent needs layer, hide others
        if (!map.hasLayer(submissionsLayer)) {
            map.addLayer(submissionsLayer);
        }
        if (map.hasLayer(submissionsLayer2)) {
            map.removeLayer(submissionsLayer2);
        }
        if (map.hasLayer(targetsLayer)) {
            map.removeLayer(targetsLayer);
        }
    } else if (tabName === 'submissions2') {
        // Show resources layer, hide urgent needs
        if (map.hasLayer(submissionsLayer)) {
            map.removeLayer(submissionsLayer);
        }
        if (!map.hasLayer(submissionsLayer2)) {
            map.addLayer(submissionsLayer2);
        }
        if (map.hasLayer(targetsLayer)) {
            map.removeLayer(targetsLayer);
        }
    } else if (tabName === 'targets') {
        // Show targets layer, hide submission layers
        if (map.hasLayer(submissionsLayer)) {
            map.removeLayer(submissionsLayer);
        }
        if (map.hasLayer(submissionsLayer2)) {
            map.removeLayer(submissionsLayer2);
        }
        if (!map.hasLayer(targetsLayer)) {
            map.addLayer(targetsLayer);
        }
    } else if (tabName === 'government') {
        // Hide submission and targets layers when showing government only
        if (map.hasLayer(submissionsLayer)) {
            map.removeLayer(submissionsLayer);
        }
        if (map.hasLayer(submissionsLayer2)) {
            map.removeLayer(submissionsLayer2);
        }
        if (map.hasLayer(targetsLayer)) {
            map.removeLayer(targetsLayer);
        }
    }
    // Government layer stays visible regardless
    
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
            
            // For targets, also search address and priority level
            if (layerName === 'targets') {
                const addressMatch = item.address && item.address.toLowerCase().includes(searchStr);
                const priorityMatch = item.priorityLevel && item.priorityLevel.toLowerCase().includes(searchStr);
                const sedimentMatch = item.sedimentLevel && item.sedimentLevel.toLowerCase().includes(searchStr);
                const cleaningMatch = item.cleaningStage && item.cleaningStage.toLowerCase().includes(searchStr);
                
                return nameMatch || descMatch || addressMatch || priorityMatch || sedimentMatch || cleaningMatch || propsMatch;
            }
            
            return nameMatch || descMatch || propsMatch;
        }) : data;
    
    // Sort submissions by reported time in descending order (newest first)
    if (layerName === 'submissions' || layerName === 'submissions2') {
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
    } else if (layerName === 'targets') {
        // Sort targets by priority level (ascending, so 1級 comes first)
        filteredData = filteredData.sort((a, b) => {
            const levelA = parseInt(a.priorityLevel.replace('級', '')) || 999;
            const levelB = parseInt(b.priorityLevel.replace('級', '')) || 999;
            return levelA - levelB;
        });
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
        } else if (layerName === 'targets') {
            const priorityInfo = getTargetPriorityInfo(item.priorityLevel);
            title = `${priorityInfo.level}級 ${item.address}`;
            details = `泥沙: ${item.sedimentLevel || '無'} | 清潔階段: ${item.cleaningStage || '無'}`;
            address = item.address;
        } else if (layerName === 'submissions' || layerName === 'submissions2') {
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
        
        // Add timestamp for submissions (reports) and targets
        let timestampHtml = '';
        if (layerName === 'submissions' && item.properties) {
            const timestamp = Object.values(item.properties)[0] || '';
            if (timestamp) {
                // Format timestamp for display
                const displayTime = timestamp.replace('2025/', '').replace(' ', ' '); // Remove year, keep as is
                timestampHtml = `<div class="data-list-item-timestamp">${displayTime}</div>`;
            }
        } else if (layerName === 'targets' && (item.lastUpdateDate || item.lastUpdateTime)) {
            const updateInfo = item.lastUpdateTime ? `${item.lastUpdateDate} ${item.lastUpdateTime}` : item.lastUpdateDate;
            if (updateInfo) {
                const displayTime = updateInfo.replace('2025/', '');
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
    // Auto-switch layer if needed based on which layer the item belongs to
    if (layerName === 'submissions2' && !map.hasLayer(submissionsLayer2)) {
        // Need to switch to layer 2
        if (map.hasLayer(submissionsLayer)) {
            map.removeLayer(submissionsLayer);
        }
        map.addLayer(submissionsLayer2);
    } else if (layerName === 'submissions' && !map.hasLayer(submissionsLayer)) {
        // Need to switch to layer 1
        if (map.hasLayer(submissionsLayer2)) {
            map.removeLayer(submissionsLayer2);
        }
        map.addLayer(submissionsLayer);
    } else if (layerName === 'targets' && !map.hasLayer(targetsLayer)) {
        // Need to switch to targets layer
        if (map.hasLayer(submissionsLayer)) {
            map.removeLayer(submissionsLayer);
        }
        if (map.hasLayer(submissionsLayer2)) {
            map.removeLayer(submissionsLayer2);
        }
        map.addLayer(targetsLayer);
    }
    
    // Close sidebar to show the marker clearly
    closeSidebar();
    
    // Close any currently open popups
    map.closePopup();
    
    // Remove previous active states
    document.querySelectorAll('.data-list-item').forEach(el => {
        el.classList.remove('active');
    });
    
    // Add active state to clicked item
    const listItem = document.getElementById(`list-item-${item.id}`);
    if (listItem) {
        listItem.classList.add('active');
    }
    
    // Clear previous highlighted markers with proper layer context
    Object.entries(activeMarkers).forEach(([markerId, marker]) => {
        if (marker) {
            if (marker.setIcon) {
                // This is an original marker that was highlighted
                // Determine the layer type for proper icon recreation
                let markerLayerName = layerName; // default to current layer
                if (markerId.startsWith('target-')) {
                    markerLayerName = 'targets';
                } else if (markerId.startsWith('gov-')) {
                    markerLayerName = 'government';
                } else if (markerId.includes('submissions')) {
                    markerLayerName = markerId.includes('2') ? 'submissions2' : 'submissions';
                }
                
                // Reset to original icon
                recreateOriginalIcon(marker, markerLayerName);
            } else if (marker.remove || marker.removeFrom) {
                // This is a temporary marker created by instant popup system
                try {
                    if (marker.remove) {
                        marker.remove();
                    } else if (marker.removeFrom && map) {
                        marker.removeFrom(map);
                    }
                } catch (e) {
                    console.log('Error removing temporary marker:', e);
                }
            }
        }
    });
    activeMarkers = {};
    
    // Navigate to the location
    if (item.lat && item.lng) {
        map.setView([item.lat, item.lng], 16);
        
        // Update URL hash 
        if (item.uuid && (layerName === 'submissions' || layerName === 'submissions2')) {
            // Use UUID for submissions
            history.replaceState(null, null, `#${item.uuid}`);
        } else {
            // Use coordinates for other layer types
            history.replaceState(null, null, `#${item.lat}/${item.lng}`);
        }
        
        // Use instant popup system for much faster response
        setTimeout(() => {
            // Try instant popup first (much faster than cluster expansion)
            const featureId = layerName === 'submissions' || layerName === 'submissions2' ? 
                              item.uuid : item.id;
            
            if (featureId && showFeaturePopupInstantly(featureId, layerName)) {
                console.log('Showed popup instantly using cached data');
                // Instant popup system handles everything including highlighting
            } else {
                // Fallback to original cluster expansion method if needed
                console.log('Falling back to cluster expansion method');
                if (item.marker) {
                    // Handle clustered markers
                    let clusterGroup = null;
                    if (layerName === 'submissions') {
                        clusterGroup = submissionsLayer;
                    } else if (layerName === 'submissions2') {
                        clusterGroup = submissionsLayer2;
                    } else if (layerName === 'government') {
                        clusterGroup = governmentLayer;
                    } else if (layerName === 'targets') {
                        clusterGroup = targetsLayer;
                    }
                    
                    // Try to show marker in cluster first
                    if (clusterGroup && showMarkerInCluster(item.marker, clusterGroup)) {
                        // Cluster navigation handled the popup, but we still need to highlight
                        setTimeout(() => {
                            highlightMarker(item.marker, layerName);
                            activeMarkers[item.id] = item.marker;
                        }, 800);
                    } else {
                        // Marker is not clustered or cluster handling failed
                        item.marker.openPopup();
                        
                        // Highlight the marker
                        highlightMarker(item.marker, layerName);
                        activeMarkers[item.id] = item.marker;
                    }
                }
            }
        }, 100);
    }
}

function highlightMarker(marker, layerName) {
    // Create a highlighted version of the icon
    let iconHtml = '';
    
    if (layerName === 'government') {
        const iconInfo = getGovernmentIconType(marker.itemType || 'general');
        iconHtml = `<div style="background-color: ${iconInfo.color}; border: 4px solid #ffff00; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`;
    } else if (layerName === 'targets') {
        const priorityInfo = getTargetPriorityInfo(marker.itemPriority || '6級');
        iconHtml = `<div style="background-color: ${priorityInfo.color}; border: 4px solid #ffff00; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 0 20px rgba(255,255,0,0.8), 0 2px 5px rgba(0,0,0,0.3);">${priorityInfo.level}</div>`;
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
    let iconHtml = '';
    let iconSize = [24, 24];
    let iconAnchor = [12, 12];
    let popupAnchor = [0, -12];
    
    if (layerName === 'government') {
        const iconInfo = getGovernmentIconType(marker.itemType || 'general');
        iconHtml = `<div style="background-color: ${iconInfo.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`;
    } else if (layerName === 'targets') {
        const priorityInfo = getTargetPriorityInfo(marker.itemPriority || '6級');
        iconSize = [28, 28];
        iconAnchor = [14, 14];
        popupAnchor = [0, -14];
        iconHtml = `<div style="background-color: ${priorityInfo.color}; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${priorityInfo.level}</div>`;
    } else if (layerName === 'submissions' || layerName === 'submissions2') {
        // For submissions, try to get the report content from marker properties
        const reportContent = marker.reportContent || '其他';
        const iconInfo = getIconForReportType(reportContent);
        iconHtml = `<div style="background-color: ${iconInfo.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`;
    } else {
        // Default icon
        iconHtml = '<div style="background-color: #007bff; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">📍</div>';
    }
    
    const normalIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        popupAnchor: popupAnchor
    });
    
    marker.setIcon(normalIcon);
}

