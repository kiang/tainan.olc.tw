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
let shuttleBusLayer;
let myMapsLayer;
let layerData = {
    government: [],
    submissions: [],
    submissions2: [],
    targets: []
};
let activeMarkers = {};
let submissionMarkers = {}; // Store submission markers by UUID
let uuidToLayer = {}; // Map UUID to layer (1 or 2)
let commentsData = {}; // Store comments by UUID

// Comprehensive feature cache for instant access
let featureCache = {
    submissions: {}, // UUID -> full feature data
    government: {}, // ID -> full feature data  
    targets: {}     // ID -> full feature data
};

// Data loading status tracking for bounds fitting
let dataLoadStatus = {
    submissions: false,
    submissions2: false,
    government: false,
    targets: false
};

// Track if initial load is complete to avoid duplicate bounds fitting
let initialLoadComplete = false;

// Tutorial mode variables
let tutorialMode = false;
let tutorialStep = 0;
let tutorialType = '';
let tutorialMarker = null;

// Update tutorial navigation buttons
function updateTutorialButtons(prevFunction, nextFunction, nextText = '繼續', showCancel = true) {
    const stepsContainer = document.getElementById('tutorial-steps');
    
    // Create button container for proper layout
    let buttonContainer = document.getElementById('tutorial-button-container');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.id = 'tutorial-button-container';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '15px';
        stepsContainer.appendChild(buttonContainer);
    }
    buttonContainer.innerHTML = ''; // Clear existing buttons
    
    // Button order: 上一步, 取消教學, 繼續 (from left to right)
    
    // Add previous button if function provided
    if (prevFunction) {
        const prevBtn = document.createElement('button');
        prevBtn.id = 'tutorial-prev';
        prevBtn.className = 'tutorial-button secondary';
        prevBtn.textContent = '上一步';
        prevBtn.onclick = prevFunction;
        buttonContainer.appendChild(prevBtn);
    }
    
    // Add cancel button in the middle (unless explicitly disabled)
    if (showCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'tutorial-cancel';
        cancelBtn.className = 'tutorial-button secondary';
        cancelBtn.textContent = '取消教學';
        cancelBtn.onclick = cancelTutorial;
        buttonContainer.appendChild(cancelBtn);
    }
    
    // Add next/continue button if function provided
    if (nextFunction) {
        const nextBtn = document.createElement('button');
        nextBtn.id = 'tutorial-continue';
        nextBtn.className = 'tutorial-button primary';
        nextBtn.textContent = nextText;
        nextBtn.onclick = nextFunction;
        buttonContainer.appendChild(nextBtn);
    }
}

// Fit map to show bounds of specific layer markers
function fitMapToLayerBounds(layerName) {
    const layerBounds = [];
    
    // Collect bounds from the specified layer
    if (layerData[layerName]) {
        layerData[layerName].forEach(item => {
            if (item.lat && item.lng) {
                layerBounds.push([item.lat, item.lng]);
            }
        });
    }
    
    // Fit bounds if we have any markers in this layer
    if (layerBounds.length > 0) {
        const bounds = L.latLngBounds(layerBounds);
        map.fitBounds(bounds, { 
            padding: [50, 50],
            maxZoom: 15 
        });
        console.log(`Fitted map bounds to ${layerBounds.length} markers in ${layerName} layer`);
    } else {
        console.log(`No markers found in ${layerName} layer for bounds fitting`);
    }
}

// Check if data is loaded and fit bounds for the current active layer
function checkDataLoadedAndFitBounds(layerName) {
    if (dataLoadStatus[layerName]) {
        console.log(`${layerName} data loaded, fitting bounds for this layer`);
        setTimeout(() => {
            fitMapToLayerBounds(layerName);
        }, 500); // Small delay to ensure all markers are rendered
    }
}

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

// Clean up all temporary highlighted markers and restore original icons
function cleanupTemporaryMarkers() {
    Object.entries(activeMarkers).forEach(([id, marker]) => {
        if (marker) {
            // Check if this is a temporary marker (not in any cluster layer)
            const isTemporary = !submissionsLayer.hasLayer(marker) &&
                               !submissionsLayer2.hasLayer(marker) &&
                               !governmentLayer.hasLayer(marker) &&
                               !targetsLayer.hasLayer(marker);

            if (isTemporary && map.hasLayer(marker)) {
                // Remove temporary marker from map
                map.removeLayer(marker);
            } else {
                // This is an original marker that was highlighted, restore its icon
                if (marker.setIcon) {
                    // Determine layer type from marker properties
                    let layerName = 'submissions'; // default
                    if (marker.itemType) {
                        layerName = 'government';
                    } else if (marker.itemPriority) {
                        layerName = 'targets';
                    } else if (marker.reportContent) {
                        layerName = 'submissions';
                    }

                    recreateOriginalIcon(marker, layerName);
                }
            }
        }
    });
    activeMarkers = {}; // Clear the object
}

// Create and place a temporary highlighted marker for instant popups
function createAndPlaceTemporaryMarker(featureData, layerName, featureId) {
    // Clean up all existing temporary markers first
    cleanupTemporaryMarkers();

    // Create a highlighted marker based on layer type
    let markerIcon;

    if (layerName === 'government') {
        const iconInfo = getMyMapsIconInfo(featureData.type || '');
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
    `;

    // Add comments section if UUID has comments
    const uuid = featureData.uuid;
    if (uuid && commentsData[uuid] && commentsData[uuid].length > 0) {
        popupContent += `
            <div style="margin-top: 10px; padding: 10px; background-color: #fffbea; border-left: 4px solid #ffc107; border-radius: 4px;">
                <div style="font-size: 12px; font-weight: bold; color: #f57c00; margin-bottom: 8px;">
                    💬 修正與建議 (${commentsData[uuid].length})
                </div>
        `;

        commentsData[uuid].forEach((commentItem, index) => {
            const commentStyle = index > 0 ? 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffe082;' : '';
            popupContent += `
                <div style="${commentStyle}">
                    <div style="font-size: 10px; color: #9e9e9e; margin-bottom: 4px;">
                        📅 ${commentItem.timestamp}
                    </div>
                    <div style="font-size: 12px; color: #424242; white-space: pre-wrap; line-height: 1.5;">
                        ${commentItem.comment}
                    </div>
                </div>
            `;
        });

        popupContent += `</div>`;
    }

    // Add update button if UUID exists
    if (uuid) {
        let textareaContent = '';
        submissionEntries.forEach(([key, value], index) => {
            if (value && value.trim() !== '' && columnMapping[index]) {
                textareaContent += `${columnMapping[index]}: ${value}\n`;
            }
        });

        const updateFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfuWAODqFbTVg8vICS_AnUcsOMd9mABoI8NaVK0ltWJqmXXXA/viewform?usp=pp_url&entry.1631998399=${encodeURIComponent(textareaContent)}&entry.1349169460=${encodeURIComponent(uuid)}`;
        popupContent += `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6;">
                <a href="${updateFormUrl}" target="_blank" class="btn btn-sm btn-primary" style="width: 100%; text-decoration: none; display: inline-block; padding: 8px; background-color: #007bff; color: white; border-radius: 4px; text-align: center; font-size: 13px;">
                    📝 回報更新資訊
                </a>
            </div>
        `;
    }

    popupContent += `</div>`;

    return popupContent;
}

// Create popup content for government facilities
function createGovernmentPopupContent(featureData) {
    const iconInfo = getMyMapsIconInfo(featureData.type);
    
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

// Function to fit map to bounds of all markers
function fitMapToMarkerBounds() {
    const allBounds = [];
    
    // Collect bounds from all layer data
    layerData.submissions.forEach(item => {
        if (item.lat && item.lng) {
            allBounds.push([item.lat, item.lng]);
        }
    });
    
    layerData.submissions2.forEach(item => {
        if (item.lat && item.lng) {
            allBounds.push([item.lat, item.lng]);
        }
    });
    
    layerData.government.forEach(item => {
        if (item.lat && item.lng) {
            allBounds.push([item.lat, item.lng]);
        }
    });
    
    layerData.targets.forEach(item => {
        if (item.lat && item.lng) {
            allBounds.push([item.lat, item.lng]);
        }
    });
    
    // Fit map to bounds if we have markers
    if (allBounds.length > 0) {
        const bounds = L.latLngBounds(allBounds);
        map.fitBounds(bounds, { 
            padding: [50, 50],
            maxZoom: 15 
        });
        console.log(`Fitting map to ${allBounds.length} markers`);
    } else {
        console.log('No markers to fit bounds to, using default view');
    }
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


    // Load targets data
    loadTargets();

    // Load shuttle bus routes
    loadShuttleBusRoutes();

    // Load MyMaps layer
    loadMyMapsLayer();

    // Load comments data
    loadCommentsData();
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
                    
                    // Highlight on hover and handle click
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
                        },
                        click: function(e) {
                            // Check if we're in tutorial mode step 3
                            if (tutorialMode && tutorialStep === 3) {
                                // Move to tutorial step 4
                                moveToTutorialStep4();
                                
                                // Add red border highlight to the opened popup
                                setTimeout(() => {
                                    const popupElement = document.querySelector('.leaflet-popup');
                                    if (popupElement) {
                                        popupElement.classList.add('tutorial-highlight-popup');
                                    }
                                }, 100);
                            }
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
    
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            
            // Clear existing submissions and mappings
            submissionsLayer.clearLayers();
            submissionsLayer2.clearLayers();
            layerData.submissions = [];
            layerData.submissions2 = [];
            uuidToLayer = {}; // Clear UUID to layer mapping
            featureCache.submissions = {}; // Clear submissions feature cache
            
            results.data.forEach((submission, i) => {
                
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
            });
            
            // Update the data lists for both submission layers
            updateDataList('submissions');
            updateDataList('submissions2');
            
            // Mark both submission layers as loaded and do initial bounds fitting for submissions
            dataLoadStatus.submissions = true;
            dataLoadStatus.submissions2 = true;
            
            // Do initial bounds fitting for the default submissions tab
            const activeTab = document.querySelector('.sidebar-tab.active');
            const activeTabName = activeTab ? activeTab.getAttribute('data-tab') : 'submissions';
            if (activeTabName === 'submissions') {
                checkDataLoadedAndFitBounds('submissions');
            }
        },
        error: function(error) {
            console.error('Error loading CSV:', error);
        }
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
            
            // Mark government data as loaded (no bounds fitting needed for government layer)
            dataLoadStatus.government = true;
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
        cleanupTemporaryMarkers(); // Remove any highlighted markers
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
            
            // Mark targets data as loaded and complete initial loading
            dataLoadStatus.targets = true;
            
            // Mark initial load as complete
            initialLoadComplete = true;
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
        cleanupTemporaryMarkers(); // Remove any highlighted markers
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

// Load shuttle bus routes from KML with folder structure preservation
function loadShuttleBusRoutes() {
    shuttleBusLayer = L.layerGroup();

    // Fetch and parse KML manually to preserve folder structure
    fetch('data/shuttle_bus.kml')
        .then(response => response.text())
        .then(kmlText => {
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
            const folders = kmlDoc.querySelectorAll('Folder');

            folders.forEach(folder => {
                const folderNameElem = folder.querySelector('name');
                const folderName = folderNameElem ? folderNameElem.textContent : 'Unknown Route';

                const placemarks = folder.querySelectorAll('Placemark');
                const markers = [];
                const lines = [];

                placemarks.forEach(placemark => {
                    const nameElem = placemark.querySelector('name');
                    const name = nameElem ? nameElem.textContent : '';

                    // Check if it's a point
                    const pointElem = placemark.querySelector('Point coordinates');
                    if (pointElem) {
                        const coords = pointElem.textContent.trim().split(',');
                        const lng = parseFloat(coords[0]);
                        const lat = parseFloat(coords[1]);
                        markers.push({ name, lat, lng });
                    }

                    // Check if it's a line
                    const lineElem = placemark.querySelector('LineString coordinates');
                    if (lineElem) {
                        const coordsText = lineElem.textContent.trim();
                        const coordPairs = coordsText.split(/\s+/);
                        const latLngs = coordPairs.map(pair => {
                            const parts = pair.split(',');
                            return [parseFloat(parts[1]), parseFloat(parts[0])];
                        }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

                        if (latLngs.length > 0) {
                            lines.push({ name, coordinates: latLngs });
                        }
                    }
                });

                // Add lines to map and store references
                const routeLines = [];
                lines.forEach(line => {
                    const polyline = L.polyline(line.coordinates, {
                        color: '#ff6b00',
                        weight: 4,
                        opacity: 0.7
                    });
                    routeLines.push(polyline);
                    shuttleBusLayer.addLayer(polyline);
                });

                // Store all markers for this route for cross-referencing
                const routeMarkers = [];

                // Add markers with numbering starting from 1 for each folder
                markers.forEach((markerData, index) => {
                    const stopNumber = index + 1;
                    const customIcon = L.divIcon({
                        html: `<div style="background-color: #ff6b00; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${stopNumber}</div>`,
                        className: '',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14],
                        popupAnchor: [0, -14]
                    });

                    const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon });
                    marker._stopIndex = index; // Store index for later reference
                    routeMarkers.push(marker);

                    // Build stops list with current stop highlighted
                    let stopsListHTML = '<div style="margin-bottom: 10px;">';
                    stopsListHTML += '<div style="font-size: 12px; font-weight: bold; color: #e65100; margin-bottom: 5px;">📍 路線站點</div>';
                    stopsListHTML += '<ol style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.8;">';

                    markers.forEach((stop, idx) => {
                        const isCurrentStop = idx === index;
                        if (isCurrentStop) {
                            const stopStyle = 'background-color: #fff3e0; font-weight: bold; padding: 4px 8px; margin: 2px -8px; border-left: 4px solid #ff6b00; color: #e65100;';
                            stopsListHTML += `<li style="${stopStyle}">${stop.name}</li>`;
                        } else {
                            const stopStyle = 'padding: 4px 8px;';
                            stopsListHTML += `<li style="${stopStyle}"><a href="#" onclick="event.preventDefault(); window.shuttleBusNavigate_${folderName.replace(/\s+/g, '_')}_${idx}();" style="color: #007bff; text-decoration: none; cursor: pointer;">${stop.name}</a></li>`;
                        }
                    });

                    stopsListHTML += '</ol></div>';

                    const popupContent = `
                        <div style="max-width: 350px; font-family: Arial, sans-serif;">
                            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: #ff6b00; color: white; border-radius: 4px; text-align: center;">
                                🚌 ${folderName}
                            </h6>
                            <div style="padding: 8px; font-size: 14px; margin-bottom: 10px;">
                                <strong>目前站點：${markerData.name}</strong>
                            </div>
                            ${stopsListHTML}
                            <div style="padding: 8px; background-color: #fff3e0; border-radius: 4px; margin-bottom: 10px;">
                                <div style="font-size: 12px; font-weight: bold; color: #e65100; margin-bottom: 5px;">
                                    ⏰ 發車時刻
                                </div>
                                <div style="font-size: 12px; line-height: 1.6;">
                                    <div style="margin-bottom: 4px;">
                                        <strong>往程：</strong>07:00、08:00、09:00、10:00
                                    </div>
                                    <div>
                                        <strong>返程：</strong>16:00、17:00、18:00、19:00、20:00
                                    </div>
                                </div>
                            </div>
                            ${getMapServiceButtons(markerData.lat, markerData.lng)}
                        </div>
                    `;

                    marker.bindPopup(popupContent);

                    // Add click handler to highlight route
                    marker.on('click', function() {
                        // Reset all routes to default style
                        shuttleBusLayer.eachLayer(function(layer) {
                            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                                layer.setStyle({
                                    color: '#ff6b00',
                                    weight: 4,
                                    opacity: 0.7
                                });
                            }
                        });

                        // Highlight this route's lines
                        routeLines.forEach(function(line) {
                            line.setStyle({
                                color: '#ff0000',
                                weight: 6,
                                opacity: 0.9
                            });
                            line.bringToFront();
                        });
                    });

                    shuttleBusLayer.addLayer(marker);
                });

                // Create navigation functions for each stop in this route
                markers.forEach((markerData, idx) => {
                    const functionName = `shuttleBusNavigate_${folderName.replace(/\s+/g, '_')}_${idx}`;
                    window[functionName] = function() {
                        const targetMarker = routeMarkers[idx];
                        if (targetMarker) {
                            map.setView(targetMarker.getLatLng(), 16);
                            targetMarker.fire('click');
                        }
                    };
                });

                console.log(`Loaded route: ${folderName} with ${markers.length} stops`);
            });

            shuttleBusLayer.addTo(map);
            console.log('All shuttle bus routes loaded successfully');
        })
        .catch(error => {
            console.error('Error loading shuttle bus routes:', error);
        });
}

// Get icon info for MyMaps markers based on category
function getMyMapsIconInfo(category) {
    switch(category) {
        case '流動廁所':
            return { icon: '🚻', color: '#E65100', label: '流動廁所' };
        case '物資':
            return { icon: '📦', color: '#558B2F', label: '物資' };
        case '志工服務站':
            return { icon: '🤝', color: '#E65100', label: '志工服務站' };
        case '安心關懷站':
            return { icon: '❤️', color: '#FF5252', label: '安心關懷站' };
        default:
            return { icon: '📍', color: '#0288D1', label: category || '其他' };
    }
}

// Load MyMaps layer from GeoJSON (replaces government layer)
function loadMyMapsLayer() {
    myMapsLayer = L.layerGroup();
    governmentLayer = myMapsLayer; // Use myMapsLayer as governmentLayer

    fetch('data/mymaps.json')
        .then(response => response.json())
        .then(data => {
            // Clear existing data
            layerData.government = [];
            featureCache.government = {};

            data.features.forEach((feature, index) => {
                const coords = feature.geometry.coordinates;
                const props = feature.properties;

                if (feature.geometry.type === 'Point') {
                    const lat = coords[1];
                    const lng = coords[0];
                    const category = props['類別'] || '';
                    const iconInfo = getMyMapsIconInfo(category);

                    // Create marker icon matching government marker style
                    const myMapsIcon = L.divIcon({
                        html: `<div style="background-color: ${iconInfo.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`,
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, -12]
                    });

                    const marker = L.marker([lat, lng], { icon: myMapsIcon });

                    // Store type info on marker for compatibility
                    marker.itemType = category;

                    // Build popup content matching government marker style
                    let popupContent = `
                        <div style="max-width: 400px; font-family: Arial, sans-serif;">
                            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${iconInfo.color}; color: white; border-radius: 4px; text-align: center;">
                                ${iconInfo.icon} ${iconInfo.label}
                            </h6>
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                                        名稱
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                                        ${props.name || ''}
                                    </td>
                                </tr>
                    `;

                    // Add other properties to the table
                    if (props['地址或google座標'] && props['地址或google座標'].trim() !== '') {
                        popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                                        地址
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                                        ${props['地址或google座標']}
                                    </td>
                                </tr>
                        `;
                    }

                    if (props['備註'] && props['備註'].trim() !== '') {
                        popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                                        備註
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                                        ${props['備註']}
                                    </td>
                                </tr>
                        `;
                    }

                    if (props['專線'] && props['專線'].trim() !== '') {
                        popupContent += `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                                        專線
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                                        ${props['專線']}
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

                    // Add click event to update URL hash
                    marker.on('click', function() {
                        cleanupTemporaryMarkers();
                        history.replaceState(null, null, `#${lat}/${lng}`);
                    });

                    myMapsLayer.addLayer(marker);

                    // Add to layerData.government for sidebar list
                    const description = [
                        props['地址或google座標'],
                        props['備註'],
                        props['專線']
                    ].filter(Boolean).join(' | ');

                    const featureData = {
                        id: `mymaps-${index}`,
                        name: props.name || '',
                        description: description,
                        lat: lat,
                        lng: lng,
                        type: category,
                        marker: marker
                    };

                    layerData.government.push(featureData);
                    featureCache.government[`mymaps-${index}`] = featureData;
                } else if (feature.geometry.type === 'LineString') {
                    const latLngs = coords.map(coord => [coord[1], coord[0]]);
                    const line = L.polyline(latLngs, {
                        color: '#4285F4',
                        weight: 3,
                        opacity: 0.7
                    });

                    if (props.name) {
                        line.bindPopup(`<h4 style="margin: 0;">${props.name}</h4>`);
                    }
                    myMapsLayer.addLayer(line);
                } else if (feature.geometry.type === 'Polygon') {
                    const latLngs = coords[0].map(coord => [coord[1], coord[0]]);
                    const polygon = L.polygon(latLngs, {
                        color: '#4285F4',
                        weight: 2,
                        opacity: 0.7,
                        fillOpacity: 0.2
                    });

                    if (props.name) {
                        polygon.bindPopup(`<h4 style="margin: 0;">${props.name}</h4>`);
                    }
                    myMapsLayer.addLayer(polygon);
                }
            });

            myMapsLayer.addTo(map);

            // Update the sidebar list
            updateDataList('government');

            // Mark government data as loaded
            dataLoadStatus.government = true;

            console.log('MyMaps layer loaded successfully with', data.features.length, 'features');
        })
        .catch(error => {
            console.error('Error loading MyMaps layer:', error);
        });
}

// Load comments data from Google Sheets CSV
function loadCommentsData() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSaeODzJrFc5BAlatXIIIEvCQstcJ7fpnBuUPX5B_gM8ONv76JWe0e0ydvMiPWZf7SLu_6MRaHr1E8W/pub?output=csv';

    Papa.parse(csvUrl, {
        download: true,
        header: true,
        complete: function(results) {
            // Organize comments by UUID
            results.data.forEach(row => {
                const uuid = row['地點編號(系統自動填入，不用理會或調整)'];
                const comment = row['修正或建議'];
                const timestamp = row['時間戳記'];

                if (uuid && uuid.trim() !== '' && comment && comment.trim() !== '') {
                    if (!commentsData[uuid]) {
                        commentsData[uuid] = [];
                    }
                    commentsData[uuid].push({
                        timestamp: timestamp || '',
                        comment: comment.trim()
                    });
                }
            });

            console.log(`Loaded comments for ${Object.keys(commentsData).length} locations`);

            // Refresh popups if any markers are already loaded
            refreshMarkersWithComments();

            // If there's currently an open popup, refresh it to show comments
            let needsRefresh = false;
            let refreshUuid = null;
            let refreshLatLng = null;

            // Check if there's an open popup on a marker
            map.eachLayer(function(layer) {
                if (layer instanceof L.Marker && layer.isPopupOpen()) {
                    // Find the UUID for this marker
                    Object.entries(submissionMarkers).forEach(([uuid, marker]) => {
                        if (marker === layer) {
                            refreshUuid = uuid;
                            refreshLatLng = layer.getLatLng();
                        }
                    });
                }
            });

            // Check if there's an open standalone popup (from cached data)
            if (!refreshUuid) {
                const openPopup = map._popup;
                if (openPopup && openPopup.isOpen()) {
                    // Try to find UUID from active markers or URL hash
                    const hash = window.location.hash.slice(1);
                    if (hash && hash.indexOf('/') === -1) {
                        // Hash is a UUID
                        refreshUuid = hash;
                        refreshLatLng = openPopup.getLatLng();
                    }
                }
            }

            // If we found a UUID and it has comments, refresh the popup
            if (refreshUuid && commentsData[refreshUuid] && commentsData[refreshUuid].length > 0) {
                console.log(`Refreshing open popup for ${refreshUuid} with ${commentsData[refreshUuid].length} comments`);

                // For cached popups, we need to regenerate content and update
                if (featureCache.submissions[refreshUuid]) {
                    const featureData = featureCache.submissions[refreshUuid];
                    const newContent = createSubmissionPopupContent(featureData);

                    // Update the popup content
                    const openPopup = map._popup;
                    if (openPopup && openPopup.isOpen()) {
                        openPopup.setContent(newContent);
                    }
                } else {
                    // For marker-based popups, close and reopen
                    const marker = submissionMarkers[refreshUuid];
                    if (marker) {
                        marker.closePopup();
                        setTimeout(() => {
                            marker.openPopup();
                        }, 100);
                    }
                }
            }
        },
        error: function(error) {
            console.error('Error loading comments data:', error);
        }
    });
}

// Refresh markers to include comments
function refreshMarkersWithComments() {
    // Update existing submission markers with comments
    Object.entries(submissionMarkers).forEach(([uuid, marker]) => {
        // Recreate popup for all markers to include current comment state
        const submission = marker._submission;
        if (!submission) return; // Skip if no submission data stored

        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const isUrgent = marker._isUrgent;

        // Create updated popup content
        const reportContent = submission['通報內容'] || submission['Report Content'] || '';
        let iconInfo = getIconForReportType(reportContent);

        // Create popup content with styled table (same logic as createSubmissionMarker)
        let popupContent = `
            <div style="max-width: 400px; font-family: Arial, sans-serif;">
                <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: ${iconInfo.color}; color: white; border-radius: 4px; text-align: center;">
                    ${iconInfo.icon} 救災資訊回報
                </h6>
        `;

        // Check for photo uploads
        let photoUrl = null;
        Object.entries(submission).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
                if (key.includes('照片') || key.includes('圖片') || key.includes('photo') || key.includes('image') ||
                    key.toLowerCase().includes('upload') || value.includes('drive.google.com')) {
                    const fileId = extractGoogleDriveFileId(value);
                    if (fileId) {
                        photoUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                    }
                }
            }
        });

        if (photoUrl) {
            popupContent += `
                <div style="margin-bottom: 10px;">
                    <iframe src="${photoUrl}" width="100%" height="200" style="border: none; border-radius: 4px;" allow="autoplay"></iframe>
                </div>
            `;
        }

        popupContent += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">`;

        const columnMapping = {
            0: '通報時間',
            2: '通報內容',
            3: '聯絡資訊與說明',
            4: '鄉鎮市區',
            5: '村里'
        };

        let textareaContent = '';
        Object.entries(submission).forEach(([key, value], index) => {
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
                textareaContent += `${columnMapping[index]}: ${value}\n`;
            }
        });

        popupContent += `
                </table>
                ${getMapServiceButtons(lat, lng)}
        `;

        // Add comments section if UUID has comments
        if (uuid && commentsData[uuid] && commentsData[uuid].length > 0) {
            popupContent += `
                <div style="margin-top: 10px; padding: 10px; background-color: #fffbea; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <div style="font-size: 12px; font-weight: bold; color: #f57c00; margin-bottom: 8px;">
                        💬 修正與建議 (${commentsData[uuid].length})
                    </div>
            `;

            commentsData[uuid].forEach((commentItem, index) => {
                const commentStyle = index > 0 ? 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffe082;' : '';
                popupContent += `
                    <div style="${commentStyle}">
                        <div style="font-size: 10px; color: #9e9e9e; margin-bottom: 4px;">
                            📅 ${commentItem.timestamp}
                        </div>
                        <div style="font-size: 12px; color: #424242; white-space: pre-wrap; line-height: 1.5;">
                            ${commentItem.comment}
                        </div>
                    </div>
                `;
            });

            popupContent += `</div>`;
        }

        // Add update button if UUID exists
        if (uuid) {
            const updateFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfuWAODqFbTVg8vICS_AnUcsOMd9mABoI8NaVK0ltWJqmXXXA/viewform?usp=pp_url&entry.1631998399=${encodeURIComponent(textareaContent)}&entry.1349169460=${encodeURIComponent(uuid)}`;
            popupContent += `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6;">
                    <a href="${updateFormUrl}" target="_blank" class="btn btn-sm btn-primary" style="width: 100%; text-decoration: none; display: inline-block; padding: 8px; background-color: #007bff; color: white; border-radius: 4px; text-align: center; font-size: 13px;">
                        📝 回報更新資訊
                    </a>
                </div>
            `;
        }

        popupContent += `</div>`;

        // Update the marker's popup
        marker.setPopupContent(popupContent);
    });

    console.log('Refreshed all markers with comment data');
}

// parseCSVLine function removed - now using Papa Parse for robust CSV parsing

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

    // Extract UUID early for use in popup
    let uuid = null;
    Object.entries(submission).forEach(([key, value]) => {
        if (key.includes('地點編號') || key.toLowerCase().includes('uuid') ||
            (key.includes('編號') && value && value.length >= 8)) {
            uuid = value;
        }
    });

    // Create a custom icon based on report type
    const submissionIcon = L.divIcon({
        html: `<div style="background-color: ${iconInfo.color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconInfo.icon}</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });

    const marker = L.marker([lat, lng], { icon: submissionIcon });

    // Store report content and submission data for icon recreation and refresh
    marker.reportContent = reportContent;
    marker._submission = submission;
    marker._isUrgent = isUrgent;
    
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

    // Build textarea content for the update form while creating popup table
    let textareaContent = '';

    submissionEntries.forEach(([key, value], index) => {
        if (value && value.trim() !== '' && columnMapping[index]) {
            // Add to popup table
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
            // Add to textarea content for update form
            textareaContent += `${columnMapping[index]}: ${value}\n`;
        }
    });

    popupContent += `
            </table>
            ${getMapServiceButtons(lat, lng)}
    `;

    // Add comments section if UUID has comments
    if (uuid && commentsData[uuid] && commentsData[uuid].length > 0) {
        popupContent += `
            <div style="margin-top: 10px; padding: 10px; background-color: #fffbea; border-left: 4px solid #ffc107; border-radius: 4px;">
                <div style="font-size: 12px; font-weight: bold; color: #f57c00; margin-bottom: 8px;">
                    💬 修正與建議 (${commentsData[uuid].length})
                </div>
        `;

        commentsData[uuid].forEach((commentItem, index) => {
            const commentStyle = index > 0 ? 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffe082;' : '';
            popupContent += `
                <div style="${commentStyle}">
                    <div style="font-size: 10px; color: #9e9e9e; margin-bottom: 4px;">
                        📅 ${commentItem.timestamp}
                    </div>
                    <div style="font-size: 12px; color: #424242; white-space: pre-wrap; line-height: 1.5;">
                        ${commentItem.comment}
                    </div>
                </div>
            `;
        });

        popupContent += `
            </div>
        `;
    }

    // Add update button if UUID exists
    if (uuid) {
        const updateFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfuWAODqFbTVg8vICS_AnUcsOMd9mABoI8NaVK0ltWJqmXXXA/viewform?usp=pp_url&entry.1631998399=${encodeURIComponent(textareaContent)}&entry.1349169460=${encodeURIComponent(uuid)}`;
        popupContent += `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6;">
                <a href="${updateFormUrl}" target="_blank" class="btn btn-sm btn-primary" style="width: 100%; text-decoration: none; display: inline-block; padding: 8px; background-color: #007bff; color: white; border-radius: 4px; text-align: center; font-size: 13px;">
                    📝 回報更新資訊
                </a>
            </div>
        `;
    }

    popupContent += `
        </div>
    `;

    marker.bindPopup(popupContent, {
        maxWidth: 400,
        autoPan: false,
        keepInView: true
    });
    
    // Add click event to set URL hash and update hash when popup opens
    if (uuid) {
        submissionMarkers[uuid] = marker;
        marker.on('click', function() {
            cleanupTemporaryMarkers(); // Remove any highlighted markers
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
    
    // Fit map bounds to the active layer if data is loaded (except government layer)
    // Only after initial load is complete to avoid duplicate bounds fitting
    if (dataLoadStatus[tabName] && tabName !== 'government' && initialLoadComplete) {
        setTimeout(() => {
            fitMapToLayerBounds(tabName);
        }, 200); // Small delay to ensure layer visibility changes are complete
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

            // Convert Chinese AM/PM format to standard format for Date parsing
            // Replace 上午 with AM and 下午 with PM
            const convertTime = (timeStr) => {
                if (!timeStr) return new Date(0);
                let converted = timeStr.replace('上午', 'AM').replace('下午', 'PM');
                // Handle 12-hour format: convert to 24-hour
                const match = converted.match(/(\d{4}\/\d{1,2}\/\d{1,2})\s+(AM|PM)\s+(\d{1,2}):(\d{2}):(\d{2})/);
                if (match) {
                    const [, date, period, hour, minute, second] = match;
                    let hour24 = parseInt(hour);
                    if (period === 'PM' && hour24 !== 12) {
                        hour24 += 12;
                    } else if (period === 'AM' && hour24 === 12) {
                        hour24 = 0;
                    }
                    return new Date(`${date} ${hour24}:${minute}:${second}`);
                }
                return new Date(timeStr);
            };

            const dateA = convertTime(timeA);
            const dateB = convertTime(timeB);

            // Sort in descending order (newest first)
            return dateB - dateA;
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
            const iconInfo = getMyMapsIconInfo(item.type);
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
        if ((layerName === 'submissions' || layerName === 'submissions2') && item.properties) {
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
        const iconInfo = getMyMapsIconInfo(marker.itemType || '');
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
        const iconInfo = getMyMapsIconInfo(marker.itemType || '');
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

// Tutorial Mode Functions
function startTutorial(type) {
    if (!type) return;
    
    tutorialType = type;
    tutorialMode = true;
    tutorialStep = 1;
    
    // Show tutorial overlay without blocking map interactions for step 1
    const overlay = document.getElementById('tutorial-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('blocking'); // Don't block map clicks in step 1
    overlay.style.display = 'block';
    
    document.getElementById('tutorial-title').textContent = `步驟 1：認識定位功能`;
    document.getElementById('tutorial-description').innerHTML = `
        <i class="bi bi-geo-alt"></i> 「<strong>定位</strong>」按鈕可以快速找到您的當前位置<br>
        <span style="color: #666; font-size: 14px;">點擊下方繼續了解更多功能</span>
    `;
    
    // Close sidebar if open
    closeSidebar();
    
    // Add navigation buttons for step 1
    updateTutorialButtons(null, moveToTutorialStep2);
    
    // Highlight the location button
    const locateBtn = document.getElementById('locate-me');
    if (locateBtn) {
        locateBtn.classList.add('tutorial-highlight');
    }
}

function moveToTutorialStep2() {
    // Update tutorial step
    tutorialStep = 2;
    
    // Remove highlight from location button
    const locateBtn = document.getElementById('locate-me');
    if (locateBtn) {
        locateBtn.classList.remove('tutorial-highlight');
    }
    
    // Update the tutorial overlay content
    document.getElementById('tutorial-title').textContent = '步驟 2：認識座標功能';
    document.getElementById('tutorial-description').innerHTML = `
        <i class="bi bi-geo"></i> 「<strong>座標</strong>」按鈕可以輸入經緯度跳轉到特定位置<br>
        <span style="color: #666; font-size: 14px;">如果您知道確切座標，可使用此功能快速定位</span>
    `;
    
    // Highlight the coordinates button
    const coordBtn = document.getElementById('input-coordinates');
    if (coordBtn) {
        coordBtn.classList.add('tutorial-highlight');
    }
    
    // Update navigation buttons
    updateTutorialButtons(backToTutorialStep1, moveToTutorialStep3);
}

function backToTutorialStep1() {
    // Remove highlight from coordinates button
    const coordBtn = document.getElementById('input-coordinates');
    if (coordBtn) {
        coordBtn.classList.remove('tutorial-highlight');
    }
    
    tutorialStep = 1;
    document.getElementById('tutorial-title').textContent = `步驟 1：認識定位功能`;
    document.getElementById('tutorial-description').innerHTML = `
        <i class="bi bi-geo-alt"></i> 「<strong>定位</strong>」按鈕可以快速找到您的當前位置<br>
        <span style="color: #666; font-size: 14px;">點擊下方繼續了解更多功能</span>
    `;
    
    // Highlight the location button
    const locateBtn = document.getElementById('locate-me');
    if (locateBtn) {
        locateBtn.classList.add('tutorial-highlight');
    }
    
    updateTutorialButtons(null, moveToTutorialStep2);
}

function moveToTutorialStep3() {
    // Update tutorial step
    tutorialStep = 3;
    
    // Remove highlight from coordinates button
    const coordBtn = document.getElementById('input-coordinates');
    if (coordBtn) {
        coordBtn.classList.remove('tutorial-highlight');
    }
    
    // Update the tutorial overlay content
    document.getElementById('tutorial-title').textContent = `步驟 3：選擇地點`;
    document.getElementById('tutorial-description').innerHTML = `
        現在請在地圖上點擊您要回報「<strong>${tutorialType}</strong>」的位置<br>
        <span style="color: #666; font-size: 14px;">點擊地圖上的任何位置即可</span>
    `;
    
    // Update navigation buttons - no next button for this step (waiting for map click)
    updateTutorialButtons(backToTutorialStep2, null);
}

function backToTutorialStep2() {
    tutorialStep = 2;
    document.getElementById('tutorial-title').textContent = '步驟 2：認識座標功能';
    document.getElementById('tutorial-description').innerHTML = `
        <i class="bi bi-geo"></i> 「<strong>座標</strong>」按鈕可以輸入經緯度跳轉到特定位置<br>
        <span style="color: #666; font-size: 14px;">如果您知道確切座標，可使用此功能快速定位</span>
    `;
    
    // Highlight the coordinates button
    const coordBtn = document.getElementById('input-coordinates');
    if (coordBtn) {
        coordBtn.classList.add('tutorial-highlight');
    }
    
    updateTutorialButtons(backToTutorialStep1, moveToTutorialStep3);
}

function handleTutorialMapClick(e) {
    if (!tutorialMode || tutorialStep !== 1) return;
    
    // Remove existing tutorial marker if any
    if (tutorialMarker) {
        map.removeLayer(tutorialMarker);
    }
    
    // Create a temporary marker at clicked location
    tutorialMarker = L.marker(e.latlng, {
        icon: L.divIcon({
            html: `<div style="background-color: #ff6b6b; border: 3px solid white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 3px 10px rgba(0,0,0,0.4); animation: pulse 1.5s infinite;">📍</div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);
    
    // Create popup with form link
    const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScLTif33-ans7aChSyWS9NYre10WnX7RbtH1hSbgD35DHTdHQ/viewform';
    const popupContent = `
        <div style="padding: 10px; min-width: 250px;">
            <h6 style="margin: 0 0 10px 0; color: #007bff;">步驟 2：填寫表單</h6>
            <p style="margin: 10px 0; font-size: 14px;">
                位置：${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}<br>
                類型：<strong>${tutorialType}</strong>
            </p>
            <p style="margin: 10px 0; font-size: 14px; color: #666;">
                請點擊下方按鈕填寫救災資訊表單：
            </p>
            <a href="${formUrl}" target="_blank" class="btn btn-primary btn-sm" style="width: 100%; text-decoration: none;">
                <i class="bi bi-pencil-square"></i> 填寫救災資訊表單
            </a>
        </div>
    `;
    
    tutorialMarker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'tutorial-popup-content'
    }).openPopup();
    
    // Move to step 4 immediately - this function is not used anymore
    moveToTutorialStep4();
}

function moveToTutorialStep4() {
    // Update tutorial step
    tutorialStep = 4;
    
    // Update the tutorial overlay content
    document.getElementById('tutorial-title').textContent = '步驟 4：填寫表單';
    document.getElementById('tutorial-description').innerHTML = `
        請點擊彈出視窗中的「<strong>填寫救災資訊表單</strong>」按鈕<br>
        <span style="color: #666; font-size: 14px;">這將開啟 Google 表單供您填寫資訊</span>
    `;
    
    // Update navigation buttons
    updateTutorialButtons(backToTutorialStep3, showTutorialStep5, '我已開啟表單');
}

function backToTutorialStep3() {
    tutorialStep = 3;
    document.getElementById('tutorial-title').textContent = `步驟 3：選擇地點`;
    document.getElementById('tutorial-description').innerHTML = `
        現在請在地圖上點擊您要回報「<strong>${tutorialType}</strong>」的位置<br>
        <span style="color: #666; font-size: 14px;">點擊地圖上的任何位置即可</span>
    `;
    
    // Remove any popup highlights and tutorial markers
    if (tutorialMarker) {
        map.removeLayer(tutorialMarker);
        tutorialMarker = null;
    }
    const highlightedPopups = document.querySelectorAll('.leaflet-popup.tutorial-highlight-popup');
    highlightedPopups.forEach(popup => {
        popup.classList.remove('tutorial-highlight-popup');
    });
    map.closePopup();
    
    updateTutorialButtons(backToTutorialStep2, null);
}

function showTutorialStep5() {
    tutorialStep = 5;
    document.getElementById('tutorial-title').textContent = '步驟 5：提交表單';
    document.getElementById('tutorial-description').innerHTML = `
        <strong>請在開啟的表單頁面中：</strong><br>
        1. 填寫您的聯絡資訊<br>
        2. 詳細描述「${tutorialType}」的需求<br>
        3. 如有需要，上傳相關照片<br>
        4. 點擊表單底部的「提交」按鈕<br>
        <span style="color: #28a745; margin-top: 10px; display: block;">
            <i class="bi bi-check-circle"></i> 完成提交後，請點擊下方按鈕
        </span>
    `;
    
    updateTutorialButtons(backToTutorialStep4, showTutorialStep6, '我已提交表單');
}

function backToTutorialStep4() {
    tutorialStep = 4;
    document.getElementById('tutorial-title').textContent = '步驟 4：填寫表單';
    document.getElementById('tutorial-description').innerHTML = `
        請點擊彈出視窗中的「<strong>填寫救災資訊表單</strong>」按鈕<br>
        <span style="color: #666; font-size: 14px;">這將開啟 Google 表單供您填寫資訊</span>
    `;
    
    updateTutorialButtons(backToTutorialStep3, showTutorialStep5, '我已開啟表單');
}

function showTutorialStep6() {
    tutorialStep = 6;
    document.getElementById('tutorial-title').textContent = '步驟 6：查看圖層列表';
    document.getElementById('tutorial-description').innerHTML = `
        <i class="bi bi-list"></i> 「<strong>圖層列表</strong>」包含不同類型的資訊：<br>
        🆘 緊急需求、🏠 提供資源、🏛️ 政府設施、🎯 救災目標<br>
        <span style="color: #666; font-size: 14px;">您的回報會根據類型出現在對應的圖層中</span>
    `;
    
    // Highlight the sidebar toggle button
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.classList.add('tutorial-highlight');
    }
    
    updateTutorialButtons(backToTutorialStep5, showTutorialStep7);
}

function backToTutorialStep5() {
    // Remove highlight from sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.classList.remove('tutorial-highlight');
    }
    
    tutorialStep = 5;
    document.getElementById('tutorial-title').textContent = '步驟 5：提交表單';
    document.getElementById('tutorial-description').innerHTML = `
        <strong>請在開啟的表單頁面中：</strong><br>
        1. 填寫您的聯絡資訊<br>
        2. 詳細描述「${tutorialType}」的需求<br>
        3. 如有需要，上傳相關照片<br>
        4. 點擊表單底部的「提交」按鈕<br>
        <span style="color: #28a745; margin-top: 10px; display: block;">
            <i class="bi bi-check-circle"></i> 完成提交後，請點擊下方按鈕
        </span>
    `;
    
    updateTutorialButtons(backToTutorialStep4, showTutorialStep6, '我已提交表單');
}

function showTutorialStep7() {
    tutorialStep = 7;
    
    // Remove highlight from sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.classList.remove('tutorial-highlight');
    }
    
    document.getElementById('tutorial-title').textContent = '步驟 7：完成！';
    document.getElementById('tutorial-description').innerHTML = `
        <strong style="color: #28a745;">✅ 感謝您的回報！</strong><br><br>
        您的「${tutorialType}」資訊將在幾分鐘內顯示在地圖上。<br>
        系統會自動同步並更新資料。<br><br>
        <span style="color: #666; font-size: 14px;">
            提示：您可以在圖層列表中切換檢視不同類型的資訊
        </span>
    `;
    
    updateTutorialButtons(backToTutorialStep6, completeTutorial, '完成教學', false);
}

function backToTutorialStep6() {
    tutorialStep = 6;
    document.getElementById('tutorial-title').textContent = '步驟 6：查看圖層列表';
    document.getElementById('tutorial-description').innerHTML = `
        <i class="bi bi-list"></i> 「<strong>圖層列表</strong>」包含不同類型的資訊：<br>
        🆘 緊急需求、🏠 提供資源、🏛️ 政府設施、🎯 救災目標<br>
        <span style="color: #666; font-size: 14px;">您的回報會根據類型出現在對應的圖層中</span>
    `;
    
    // Highlight the sidebar toggle button
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.classList.add('tutorial-highlight');
    }
    
    updateTutorialButtons(backToTutorialStep5, showTutorialStep7);
}

function completeTutorial() {
    // Reset tutorial
    tutorialMode = false;
    tutorialStep = 0;
    tutorialType = '';
    
    // Remove tutorial marker if any
    if (tutorialMarker) {
        map.removeLayer(tutorialMarker);
        tutorialMarker = null;
    }
    
    // Remove highlight from any buttons
    const locateBtn = document.getElementById('locate-me');
    const coordBtn = document.getElementById('input-coordinates');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (locateBtn) {
        locateBtn.classList.remove('tutorial-highlight');
    }
    if (coordBtn) {
        coordBtn.classList.remove('tutorial-highlight');
    }
    if (sidebarToggle) {
        sidebarToggle.classList.remove('tutorial-highlight');
    }
    
    // Remove highlight from any popups
    const highlightedPopups = document.querySelectorAll('.leaflet-popup.tutorial-highlight-popup');
    highlightedPopups.forEach(popup => {
        popup.classList.remove('tutorial-highlight-popup');
    });
    
    // Hide overlay and remove classes
    const overlay = document.getElementById('tutorial-overlay');
    overlay.style.display = 'none';
    overlay.classList.remove('active', 'blocking');
    
    // Reset dropdown
    document.getElementById('tutorial-dropdown').value = '';
    
    // Remove button container if exists
    const buttonContainer = document.getElementById('tutorial-button-container');
    if (buttonContainer) {
        buttonContainer.remove();
    }
}

function cancelTutorial() {
    // Cancel and reset tutorial
    completeTutorial();
}
