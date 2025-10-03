// Initialize variables
let map;
let markersLayer;
let markers = [];
let coordinatesModal;
let cunliLayer;
let damageLayer;
let lostLayer;
let foundLayer;
let layerData = {
    damage: [],
    lost: [],
    found: []
};
let activeMarkers = {};
let submissionMarkers = {};
let uuidToLayer = {};

// Comprehensive feature cache for instant access
let featureCache = {
    damage: {},
    lost: {},
    found: {}
};

// Data loading status tracking for bounds fitting
let dataLoadStatus = {
    damage: false,
    lost: false,
    found: false
};

// Track if initial load is complete to avoid duplicate bounds fitting
let initialLoadComplete = false;

// Fit map to show bounds of specific layer markers
function fitMapToLayerBounds(layerName) {
    const layerBounds = [];

    // Collect bounds from the specified layer
    if (layerData[layerName]) {
        layerData[layerName].forEach(item => {
            if (item.geometry && item.geometry.coordinates) {
                layerBounds.push([item.geometry.coordinates[1], item.geometry.coordinates[0]]);
            }
        });
    }

    // Fit map to collected bounds if any exist
    if (layerBounds.length > 0) {
        const bounds = L.latLngBounds(layerBounds);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Initialize the map centered on Guangfu, Hualien
function initMap() {
    map = L.map('map', {
        center: [23.6697, 121.4236],
        zoom: 13,
        zoomControl: true
    });

    // Add NLSC base map layer
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster groups
    damageLayer = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    lostLayer = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    foundLayer = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    // Add default layer to map (disaster damage photos as primary)
    map.addLayer(damageLayer);

    // Load administrative boundaries
    loadCunliLayer();

    // Load all item data from single source
    loadAllItems();
}

// Generate UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Load village/cunli administrative boundaries
function loadCunliLayer() {
    fetch('data/hualien.json')
        .then(response => response.json())
        .then(topoData => {
            // Convert TopoJSON to GeoJSON
            const objectKey = Object.keys(topoData.objects)[0];
            const geojsonData = topojson.feature(topoData, topoData.objects[objectKey]);

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
                        const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSc1B9g3pR5n4BVMI8TNCI5FkyPjICpJ7syaKttp_cgt5_NwKw/viewform?usp=pp_url&entry.777643802=${encodeURIComponent(townName)}&entry.1805907913=${encodeURIComponent(villName)}&entry.118100066=${encodeURIComponent(lng)}&entry.2113518605=${encodeURIComponent(lat)}&entry.872952482=${encodeURIComponent(uuid)}`;

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
                                    <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                                        座標
                                    </td>
                                    <td style="padding: 6px 8px; vertical-align: top; font-family: monospace; font-size: 11px;">
                                        ${lat}, ${lng}
                                    </td>
                                </tr>
                            `;
                        }

                        popupContent += `
                                </table>
                                <div style="text-align: center; margin-top: 10px;">
                                    <button onclick="window.open('${formUrl}', '_blank')" class="btn btn-primary btn-sm" style="background-color: #319FD3; border-color: #319FD3; padding: 8px 16px; font-size: 12px; border-radius: 4px; color: white; border: none; cursor: pointer; text-decoration: none; display: inline-block;">
                                        📝 通報失物招領資訊
                                    </button>
                                </div>
                            </div>
                        `;

                        layer.bindPopup(popupContent);
                    }
                }
            }).addTo(map);
        })
        .catch(error => console.error('Error loading cunli data:', error));
}

// Load all items data from single CSV source (damage, lost, found)
function loadAllItems() {
    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSAiNYDq4xgfkzg2nx_14F9rh9SOJqCeySSW7Fyt8cIEDgg2pYQoFqMVca9QZ6OSocTyIEpdlDQxUFZ/pub?gid=1008030730&single=true&output=csv')
        .then(response => response.text())
        .then(csvText => {
            // Parse CSV data using Papa Parse
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    layerData.damage = [];
                    layerData.lost = [];
                    layerData.found = [];

                    results.data.forEach(row => {
                        // Get coordinates from row
                        const latitude = row['緯度(系統自動填入，不用理會或調整)'] || row['緯度'] || '';
                        const longitude = row['經度(系統自動填入，不用理會或調整)'] || row['經度'] || '';

                        // Only process rows with valid coordinates
                        if (latitude && longitude && parseFloat(latitude) && parseFloat(longitude)) {
                            // Determine item type based on 照片類型 column
                            const photoType = row['照片類型'] || '';
                            const isDamage = photoType === '災損照片';
                            const isLost = photoType === '我有遺失';
                            const isFound = photoType === '我要招領';

                            const item = {
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                                },
                                properties: {
                                    uuid: row['地點編號(系統自動填入，不用理會或調整)'] || row['地點編號'] || '',
                                    description: row['描述與聯絡資訊'] || '',
                                    photo: row['照片'] || '',
                                    photoType: photoType,
                                    town: row['鄉鎮市區(系統自動填入，不用理會或調整)'] || row['鄉鎮市區'] || '',
                                    village: row['村里(系統自動填入，不用理會或調整)'] || row['村里'] || '',
                                    timestamp: row['時間戳記'] || ''
                                }
                            };

                            // Add to appropriate array based on type
                            if (isDamage) {
                                layerData.damage.push(item);
                            } else if (isLost) {
                                layerData.lost.push(item);
                            } else if (isFound) {
                                layerData.found.push(item);
                            }
                        }
                    });

                    // Render all layers
                    renderDamageMarkers();
                    renderLostMarkers();
                    renderFoundMarkers();
                    updateListCounter('damage');
                    updateListCounter('lost');
                    updateListCounter('found');

                    dataLoadStatus.damage = true;
                    dataLoadStatus.lost = true;
                    dataLoadStatus.found = true;
                    checkInitialLoadComplete();
                },
                error: function(error) {
                    console.error('Error parsing CSV:', error);
                    document.querySelector('#damage-pane .list-counter').textContent = '載入失敗或目前無資料';
                    document.querySelector('#lost-pane .list-counter').textContent = '載入失敗或目前無資料';
                    document.querySelector('#found-pane .list-counter').textContent = '載入失敗或目前無資料';
                    dataLoadStatus.damage = true;
                    dataLoadStatus.lost = true;
                    dataLoadStatus.found = true;
                    checkInitialLoadComplete();
                }
            });
        })
        .catch(error => {
            console.error('Error loading items data:', error);
            document.querySelector('#damage-pane .list-counter').textContent = '載入失敗或目前無資料';
            document.querySelector('#lost-pane .list-counter').textContent = '載入失敗或目前無資料';
            document.querySelector('#found-pane .list-counter').textContent = '載入失敗或目前無資料';
            dataLoadStatus.damage = true;
            dataLoadStatus.lost = true;
            dataLoadStatus.found = true;
            checkInitialLoadComplete();
        });
}

// Check if initial data load is complete
function checkInitialLoadComplete() {
    if (!initialLoadComplete && dataLoadStatus.damage && dataLoadStatus.lost && dataLoadStatus.found) {
        initialLoadComplete = true;
        // Fit bounds to show all damage items by default (primary layer)
        fitMapToLayerBounds('damage');
    }
}

// Render disaster damage markers
function renderDamageMarkers() {
    damageLayer.clearLayers();

    layerData.damage.forEach(item => {
        if (item.geometry && item.geometry.coordinates) {
            const coords = item.geometry.coordinates;
            const marker = L.marker([coords[1], coords[0]], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #ff6b6b; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📷</div>',
                    iconSize: [35, 35]
                })
            });

            const props = item.properties;
            // Add coordinates to props for popup use
            props.coordinates = coords;

            marker.bindPopup(createDamagePopupContent(props), {
                maxWidth: 400,
                autoPan: false,
                keepInView: true
            });

            marker.on('click', () => {
                highlightListItem('damage', props.uuid);
                // Update URL hash for sharing
                if (props.uuid) {
                    history.replaceState(null, null, `#${props.uuid}`);
                }
            });

            damageLayer.addLayer(marker);
            submissionMarkers[props.uuid] = marker;
            uuidToLayer[props.uuid] = 'damage';
            featureCache.damage[props.uuid] = item;
        }
    });

    renderDamageList();
}

// Render lost items markers
function renderLostMarkers() {
    lostLayer.clearLayers();

    layerData.lost.forEach(item => {
        if (item.geometry && item.geometry.coordinates) {
            const coords = item.geometry.coordinates;
            const marker = L.marker([coords[1], coords[0]], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #dc3545; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🔴</div>',
                    iconSize: [35, 35]
                })
            });

            const props = item.properties;
            // Add coordinates to props for popup use
            props.coordinates = coords;

            marker.bindPopup(createLostPopupContent(props), {
                maxWidth: 400,
                autoPan: false,
                keepInView: true
            });

            marker.on('click', () => {
                highlightListItem('lost', props.uuid);
                // Update URL hash for sharing
                if (props.uuid) {
                    history.replaceState(null, null, `#${props.uuid}`);
                }
            });

            lostLayer.addLayer(marker);
            submissionMarkers[props.uuid] = marker;
            uuidToLayer[props.uuid] = 'lost';
            featureCache.lost[props.uuid] = item;
        }
    });

    renderLostList();
}

// Render found items markers
function renderFoundMarkers() {
    foundLayer.clearLayers();

    layerData.found.forEach(item => {
        if (item.geometry && item.geometry.coordinates) {
            const coords = item.geometry.coordinates;
            const marker = L.marker([coords[1], coords[0]], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #28a745; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🟢</div>',
                    iconSize: [35, 35]
                })
            });

            const props = item.properties;
            // Add coordinates to props for popup use
            props.coordinates = coords;

            marker.bindPopup(createFoundPopupContent(props), {
                maxWidth: 400,
                autoPan: false,
                keepInView: true
            });

            marker.on('click', () => {
                highlightListItem('found', props.uuid);
                // Update URL hash for sharing
                if (props.uuid) {
                    history.replaceState(null, null, `#${props.uuid}`);
                }
            });

            foundLayer.addLayer(marker);
            submissionMarkers[props.uuid] = marker;
            uuidToLayer[props.uuid] = 'found';
            featureCache.found[props.uuid] = item;
        }
    });

    renderFoundList();
}

// Extract Google Drive file ID from various URL formats
function extractGoogleDriveFileId(url) {
    if (!url) return null;

    const patterns = [
        /\/file\/d\/([a-zA-Z0-9-_]+)/,
        /id=([a-zA-Z0-9-_]+)/,
        /\/([a-zA-Z0-9-_]{25,})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
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

// Create popup content for disaster damage photos
function createDamagePopupContent(props) {
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: #ff6b6b; color: white; border-radius: 4px; text-align: center;">
                📷 災損照片
            </h6>
    `;

    // Add photo preview if available
    if (props.photo) {
        const fileId = extractGoogleDriveFileId(props.photo);
        if (fileId) {
            const photoUrl = `https://drive.google.com/file/d/${fileId}/preview`;
            popupContent += `
                <div style="margin-bottom: 10px;">
                    <iframe src="${photoUrl}" width="100%" height="200" style="border: none; border-radius: 4px;" allow="autoplay"></iframe>
                </div>
            `;
        }
    }

    popupContent += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">`;

    if (props.timestamp) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                    通報時間
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.timestamp}
                </td>
            </tr>
        `;
    }

    if (props.description) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    描述與聯絡資訊
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.description}
                </td>
            </tr>
        `;
    }

    if (props.town) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    鄉鎮市區
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.town}
                </td>
            </tr>
        `;
    }

    if (props.village) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    村里
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.village}
                </td>
            </tr>
        `;
    }

    popupContent += `</table>`;

    // Get coordinates from the item
    const coords = props.coordinates || [0, 0];
    popupContent += getMapServiceButtons(coords[1], coords[0]);

    popupContent += `</div>`;

    return popupContent;
}

// Create popup content for lost items
function createLostPopupContent(props) {
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: #dc3545; color: white; border-radius: 4px; text-align: center;">
                🔍 遺失物品
            </h6>
    `;

    // Add photo preview if available
    if (props.photo) {
        const fileId = extractGoogleDriveFileId(props.photo);
        if (fileId) {
            const photoUrl = `https://drive.google.com/file/d/${fileId}/preview`;
            popupContent += `
                <div style="margin-bottom: 10px;">
                    <iframe src="${photoUrl}" width="100%" height="200" style="border: none; border-radius: 4px;" allow="autoplay"></iframe>
                </div>
            `;
        }
    }

    popupContent += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">`;

    if (props.timestamp) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                    通報時間
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.timestamp}
                </td>
            </tr>
        `;
    }

    if (props.description) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    描述與聯絡資訊
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.description}
                </td>
            </tr>
        `;
    }

    if (props.town) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    鄉鎮市區
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.town}
                </td>
            </tr>
        `;
    }

    if (props.village) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    村里
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.village}
                </td>
            </tr>
        `;
    }

    popupContent += `</table>`;

    // Get coordinates from the item
    const coords = props.coordinates || [0, 0];
    popupContent += getMapServiceButtons(coords[1], coords[0]);

    popupContent += `</div>`;

    return popupContent;
}

// Create popup content for found items
function createFoundPopupContent(props) {
    let popupContent = `
        <div style="max-width: 400px; font-family: Arial, sans-serif;">
            <h6 style="margin: 0 0 10px 0; padding: 8px; background-color: #28a745; color: white; border-radius: 4px; text-align: center;">
                📦 拾獲物品
            </h6>
    `;

    // Add photo preview if available
    if (props.photo) {
        const fileId = extractGoogleDriveFileId(props.photo);
        if (fileId) {
            const photoUrl = `https://drive.google.com/file/d/${fileId}/preview`;
            popupContent += `
                <div style="margin-bottom: 10px;">
                    <iframe src="${photoUrl}" width="100%" height="200" style="border: none; border-radius: 4px;" allow="autoplay"></iframe>
                </div>
            `;
        }
    }

    popupContent += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">`;

    if (props.timestamp) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; width: 30%; border-right: 1px solid #dee2e6;">
                    通報時間
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.timestamp}
                </td>
            </tr>
        `;
    }

    if (props.description) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    描述與聯絡資訊
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.description}
                </td>
            </tr>
        `;
    }

    if (props.town) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    鄉鎮市區
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.town}
                </td>
            </tr>
        `;
    }

    if (props.village) {
        popupContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 8px; background-color: #f8f9fa; font-weight: bold; vertical-align: top; border-right: 1px solid #dee2e6;">
                    村里
                </td>
                <td style="padding: 6px 8px; vertical-align: top; word-wrap: break-word;">
                    ${props.village}
                </td>
            </tr>
        `;
    }

    popupContent += `</table>`;

    // Get coordinates from the item
    const coords = props.coordinates || [0, 0];
    popupContent += getMapServiceButtons(coords[1], coords[0]);

    popupContent += `</div>`;

    return popupContent;
}

// Render disaster damage list
function renderDamageList() {
    const listElement = document.getElementById('damage-list');
    listElement.innerHTML = '';

    layerData.damage.forEach(item => {
        const props = item.properties;
        const li = document.createElement('li');
        li.className = 'data-list-item';
        li.dataset.uuid = props.uuid;

        const locationText = props.town && props.village ? `${props.town}${props.village}` : (props.town || props.village || '');
        const descriptionPreview = props.description ? props.description.substring(0, 50) + (props.description.length > 50 ? '...' : '') : '';

        li.innerHTML = `
            <div class="data-list-item-header">
                <div class="data-list-item-title">📷 災損照片</div>
                ${props.timestamp ? `<div class="data-list-item-timestamp">${props.timestamp}</div>` : ''}
            </div>
            ${descriptionPreview ? `<div class="data-list-item-details">${descriptionPreview}</div>` : ''}
            ${locationText ? `<div class="data-list-item-address">${locationText}</div>` : ''}
        `;

        li.addEventListener('click', () => {
            zoomToMarker(props.uuid);
        });

        listElement.appendChild(li);
    });
}

// Render lost items list
function renderLostList() {
    const listElement = document.getElementById('lost-list');
    listElement.innerHTML = '';

    layerData.lost.forEach(item => {
        const props = item.properties;
        const li = document.createElement('li');
        li.className = 'data-list-item';
        li.dataset.uuid = props.uuid;

        const locationText = props.town && props.village ? `${props.town}${props.village}` : (props.town || props.village || '');
        const descriptionPreview = props.description ? props.description.substring(0, 50) + (props.description.length > 50 ? '...' : '') : '';

        li.innerHTML = `
            <div class="data-list-item-header">
                <div class="data-list-item-title">🔴 遺失物品</div>
                ${props.timestamp ? `<div class="data-list-item-timestamp">${props.timestamp}</div>` : ''}
            </div>
            ${descriptionPreview ? `<div class="data-list-item-details">${descriptionPreview}</div>` : ''}
            ${locationText ? `<div class="data-list-item-address">${locationText}</div>` : ''}
        `;

        li.addEventListener('click', () => {
            zoomToMarker(props.uuid);
        });

        listElement.appendChild(li);
    });
}

// Render found items list
function renderFoundList() {
    const listElement = document.getElementById('found-list');
    listElement.innerHTML = '';

    layerData.found.forEach(item => {
        const props = item.properties;
        const li = document.createElement('li');
        li.className = 'data-list-item';
        li.dataset.uuid = props.uuid;

        const locationText = props.town && props.village ? `${props.town}${props.village}` : (props.town || props.village || '');
        const descriptionPreview = props.description ? props.description.substring(0, 50) + (props.description.length > 50 ? '...' : '') : '';

        li.innerHTML = `
            <div class="data-list-item-header">
                <div class="data-list-item-title">🟢 拾獲物品</div>
                ${props.timestamp ? `<div class="data-list-item-timestamp">${props.timestamp}</div>` : ''}
            </div>
            ${descriptionPreview ? `<div class="data-list-item-details">${descriptionPreview}</div>` : ''}
            ${locationText ? `<div class="data-list-item-address">${locationText}</div>` : ''}
        `;

        li.addEventListener('click', () => {
            zoomToMarker(props.uuid);
        });

        listElement.appendChild(li);
    });
}

// Update list counter
function updateListCounter(type) {
    const counter = document.querySelector(`#${type}-pane .list-counter`);
    const count = layerData[type].length;
    counter.textContent = `共 ${count} 筆資料`;
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-pane`).classList.add('active');

    // Switch map layers
    if (tabName === 'damage') {
        map.removeLayer(lostLayer);
        map.removeLayer(foundLayer);
        map.addLayer(damageLayer);
    } else if (tabName === 'lost') {
        map.removeLayer(damageLayer);
        map.removeLayer(foundLayer);
        map.addLayer(lostLayer);
    } else if (tabName === 'found') {
        map.removeLayer(damageLayer);
        map.removeLayer(lostLayer);
        map.addLayer(foundLayer);
    }

    // Fit bounds to current layer
    fitMapToLayerBounds(tabName);
}

// Filter data list
function filterDataList(type) {
    const filterInput = document.getElementById(`${type}-filter`);
    const filterValue = filterInput.value.toLowerCase();
    const listItems = document.querySelectorAll(`#${type}-list .data-list-item`);

    let visibleCount = 0;
    listItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(filterValue)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Update counter
    const counter = document.querySelector(`#${type}-pane .list-counter`);
    counter.textContent = `顯示 ${visibleCount} / ${layerData[type].length} 筆資料`;
}

// Clear filter
function clearFilter(type) {
    const filterInput = document.getElementById(`${type}-filter`);
    filterInput.value = '';
    filterDataList(type);
}

// Highlight list item
function highlightListItem(type, uuid) {
    document.querySelectorAll('.data-list-item').forEach(item => {
        item.classList.remove('active');
    });

    const item = document.querySelector(`#${type}-list [data-uuid="${uuid}"]`);
    if (item) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Zoom to marker
function zoomToMarker(uuid) {
    const marker = submissionMarkers[uuid];
    const layerType = uuidToLayer[uuid];

    if (marker && layerType) {
        // Switch to correct tab if needed
        const currentTab = document.querySelector('.sidebar-tab.active').dataset.tab;
        if (currentTab !== layerType) {
            switchTab(layerType);
        }

        // Zoom to marker
        map.setView(marker.getLatLng(), 16);
        marker.openPopup();

        // Highlight in list
        highlightListItem(layerType, uuid);

        // Update URL hash
        history.replaceState(null, null, `#${uuid}`);
    }
}

// Navigate to a specific report by UUID
function navigateToReport(uuid) {
    if (!uuid) return false;

    const marker = submissionMarkers[uuid];
    const layerType = uuidToLayer[uuid];

    if (marker && layerType) {
        // Switch to the correct layer tab
        switchTab(layerType);

        // Small delay to ensure layer is active
        setTimeout(() => {
            // Zoom to the marker location
            map.setView(marker.getLatLng(), 16);

            // Open the popup
            marker.openPopup();

            // Highlight in sidebar list
            highlightListItem(layerType, uuid);

            // Open sidebar to show the highlighted item
            openSidebar();
        }, 300);

        return true;
    }
    return false;
}

// Check URL hash on page load and handle navigation
function handleUrlHash() {
    const hash = window.location.hash.slice(1); // Remove the # symbol
    if (hash) {
        // Wait for data to be loaded before trying to navigate
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

// Open sidebar
function openSidebar() {
    document.getElementById('sidebar').classList.add('active');
}

// Close sidebar
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
}

// Initialize coordinate modal and controls
document.addEventListener('DOMContentLoaded', () => {
    initMap();

    coordinatesModal = new bootstrap.Modal(document.getElementById('coordinatesModal'));

    // Locate me button
    document.getElementById('locate-me').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 15);
                L.marker([lat, lng]).addTo(map)
                    .bindPopup('您的位置')
                    .openPopup();
            }, error => {
                alert('無法取得您的位置');
            });
        } else {
            alert('您的瀏覽器不支援定位功能');
        }
    });

    // Input coordinates button
    document.getElementById('input-coordinates').addEventListener('click', () => {
        coordinatesModal.show();
    });

    // Coordinate input handling - parse comma-separated coordinates
    document.getElementById('coordinatesInput').addEventListener('input', function() {
        const coords = this.value.split(',');
        if (coords.length === 2) {
            document.getElementById('latitude').value = coords[0].trim();
            document.getElementById('longitude').value = coords[1].trim();
        }
    });

    // Zoom to coordinates
    document.getElementById('zoomToCoordinates').addEventListener('click', () => {
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
    const tutorialIcon = document.getElementById('tutorial-icon');
    const tutorialPopup = document.getElementById('tutorial-popup');
    const tutorialCloser = document.getElementById('tutorial-closer');

    tutorialIcon.addEventListener('click', () => {
        tutorialPopup.style.display = 'block';
    });

    tutorialCloser.addEventListener('click', () => {
        tutorialPopup.style.display = 'none';
    });

    // Close tutorial when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === tutorialPopup) {
            tutorialPopup.style.display = 'none';
        }
    });

    // Handle URL hash for direct linking to specific items
    if (window.location.hash) {
        handleUrlHash();
    }
});
