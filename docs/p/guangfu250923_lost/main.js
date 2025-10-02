// Initialize variables
let map;
let markersLayer;
let markers = [];
let coordinatesModal;
let cunliLayer;
let lostLayer;
let foundLayer;
let layerData = {
    lost: [],
    found: []
};
let activeMarkers = {};
let submissionMarkers = {};
let uuidToLayer = {};

// Comprehensive feature cache for instant access
let featureCache = {
    lost: {},
    found: {}
};

// Data loading status tracking for bounds fitting
let dataLoadStatus = {
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

    // Add default layer to map
    map.addLayer(lostLayer);

    // Load administrative boundaries
    loadCunliLayer();

    // Load lost and found data
    loadLostItems();
    loadFoundItems();
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

// Load lost items data
function loadLostItems() {
    // This would be replaced with actual data fetch from Google Sheets or API
    // For now, using placeholder structure
    fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?type=lost')
        .then(response => response.json())
        .then(data => {
            layerData.lost = data.features || [];
            renderLostMarkers();
            updateListCounter('lost');
            dataLoadStatus.lost = true;
            checkInitialLoadComplete();
        })
        .catch(error => {
            console.error('Error loading lost items:', error);
            // Show empty state
            document.querySelector('#lost-pane .list-counter').textContent = '目前無遺失物品通報';
            dataLoadStatus.lost = true;
        });
}

// Load found items data
function loadFoundItems() {
    // This would be replaced with actual data fetch from Google Sheets or API
    fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?type=found')
        .then(response => response.json())
        .then(data => {
            layerData.found = data.features || [];
            renderFoundMarkers();
            updateListCounter('found');
            dataLoadStatus.found = true;
            checkInitialLoadComplete();
        })
        .catch(error => {
            console.error('Error loading found items:', error);
            // Show empty state
            document.querySelector('#found-pane .list-counter').textContent = '目前無拾獲物品通報';
            dataLoadStatus.found = true;
        });
}

// Check if initial data load is complete
function checkInitialLoadComplete() {
    if (!initialLoadComplete && dataLoadStatus.lost && dataLoadStatus.found) {
        initialLoadComplete = true;
        // Fit bounds to show all lost items by default
        fitMapToLayerBounds('lost');
    }
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
            marker.bindPopup(createLostPopupContent(props));

            marker.on('click', () => {
                highlightListItem('lost', props.uuid);
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
            marker.bindPopup(createFoundPopupContent(props));

            marker.on('click', () => {
                highlightListItem('found', props.uuid);
            });

            foundLayer.addLayer(marker);
            submissionMarkers[props.uuid] = marker;
            uuidToLayer[props.uuid] = 'found';
            featureCache.found[props.uuid] = item;
        }
    });

    renderFoundList();
}

// Create popup content for lost items
function createLostPopupContent(props) {
    let content = `<div style="min-width: 200px;">`;
    content += `<h6 style="margin-bottom: 10px; color: #dc3545;"><strong>🔍 遺失物品</strong></h6>`;

    if (props.item_name) content += `<p style="margin: 5px 0;"><strong>物品名稱：</strong>${props.item_name}</p>`;
    if (props.description) content += `<p style="margin: 5px 0;"><strong>描述：</strong>${props.description}</p>`;
    if (props.lost_date) content += `<p style="margin: 5px 0;"><strong>遺失日期：</strong>${props.lost_date}</p>`;
    if (props.location) content += `<p style="margin: 5px 0;"><strong>遺失地點：</strong>${props.location}</p>`;
    if (props.contact_name) content += `<p style="margin: 5px 0;"><strong>聯絡人：</strong>${props.contact_name}</p>`;
    if (props.contact_phone) content += `<p style="margin: 5px 0;"><strong>聯絡電話：</strong>${props.contact_phone}</p>`;
    if (props.timestamp) content += `<p style="margin: 5px 0; font-size: 11px; color: #6c757d;"><strong>通報時間：</strong>${props.timestamp}</p>`;

    content += `</div>`;
    return content;
}

// Create popup content for found items
function createFoundPopupContent(props) {
    let content = `<div style="min-width: 200px;">`;
    content += `<h6 style="margin-bottom: 10px; color: #28a745;"><strong>📦 拾獲物品</strong></h6>`;

    if (props.item_name) content += `<p style="margin: 5px 0;"><strong>物品名稱：</strong>${props.item_name}</p>`;
    if (props.description) content += `<p style="margin: 5px 0;"><strong>描述：</strong>${props.description}</p>`;
    if (props.found_date) content += `<p style="margin: 5px 0;"><strong>拾獲日期：</strong>${props.found_date}</p>`;
    if (props.location) content += `<p style="margin: 5px 0;"><strong>拾獲地點：</strong>${props.location}</p>`;
    if (props.contact_name) content += `<p style="margin: 5px 0;"><strong>聯絡人：</strong>${props.contact_name}</p>`;
    if (props.contact_phone) content += `<p style="margin: 5px 0;"><strong>聯絡電話：</strong>${props.contact_phone}</p>`;
    if (props.timestamp) content += `<p style="margin: 5px 0; font-size: 11px; color: #6c757d;"><strong>通報時間：</strong>${props.timestamp}</p>`;

    content += `</div>`;
    return content;
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

        li.innerHTML = `
            <div class="data-list-item-header">
                <div class="data-list-item-title">🔴 ${props.item_name || '未指定物品'}</div>
                ${props.timestamp ? `<div class="data-list-item-timestamp">${props.timestamp}</div>` : ''}
            </div>
            ${props.description ? `<div class="data-list-item-details">${props.description}</div>` : ''}
            ${props.location ? `<div class="data-list-item-address">${props.location}</div>` : ''}
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

        li.innerHTML = `
            <div class="data-list-item-header">
                <div class="data-list-item-title">🟢 ${props.item_name || '未指定物品'}</div>
                ${props.timestamp ? `<div class="data-list-item-timestamp">${props.timestamp}</div>` : ''}
            </div>
            ${props.description ? `<div class="data-list-item-details">${props.description}</div>` : ''}
            ${props.location ? `<div class="data-list-item-address">${props.location}</div>` : ''}
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
    if (tabName === 'lost') {
        map.removeLayer(foundLayer);
        map.addLayer(lostLayer);
    } else if (tabName === 'found') {
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
    }
}

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

    // Zoom to coordinates
    document.getElementById('zoomToCoordinates').addEventListener('click', () => {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);

        if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 15);
            coordinatesModal.hide();
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
});
