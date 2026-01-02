// Initialize map centered on Taiwan
var map = L.map('map').setView([23.5, 121], 8);

// Add NLSC base tile layer
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
    opacity: 0.8
}).addTo(map);

// Store loaded layers and data
var countyLayers = {};
var countyData = {};  // Store raw feature data for filtering
var manifest = [];
var locationTypes = new Set();  // Track unique 設置位置 values
var currentFilter = '';
var markers = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});
map.addLayer(markers);

// Generate color based on county name
function getCountyColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    var hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ', 70%, 50%)';
}

// Create popup content
function createPopupContent(feature) {
    var props = feature.properties;
    var coords = feature.geometry.coordinates;

    var content = '<div style="max-width: 300px;">';
    content += '<h4 style="margin-top: 0; margin-bottom: 10px;">' + (props.name || '未命名') + '</h4>';
    content += '<table style="width: 100%; font-size: 13px;">';

    // Show solar panel specific info
    if (props['設置者名稱']) {
        content += '<tr><td style="padding: 3px; width: 35%;"><strong>設置者</strong></td>';
        content += '<td style="padding: 3px;">' + props['設置者名稱'] + '</td></tr>';
    }
    if (props['案件狀態']) {
        content += '<tr><td style="padding: 3px;"><strong>狀態</strong></td>';
        content += '<td style="padding: 3px;">' + props['案件狀態'] + '</td></tr>';
    }
    if (props['商轉容量']) {
        content += '<tr><td style="padding: 3px;"><strong>商轉容量</strong></td>';
        content += '<td style="padding: 3px;">' + parseFloat(props['商轉容量']).toLocaleString() + ' kW</td></tr>';
    }
    if (props['設備型別']) {
        content += '<tr><td style="padding: 3px;"><strong>設備型別</strong></td>';
        content += '<td style="padding: 3px;">' + props['設備型別'] + '</td></tr>';
    }
    if (props['設置位置']) {
        content += '<tr><td style="padding: 3px;"><strong>設置位置</strong></td>';
        content += '<td style="padding: 3px;">' + props['設置位置'] + '</td></tr>';
    }
    if (props['再生能源類別']) {
        content += '<tr><td style="padding: 3px;"><strong>類別</strong></td>';
        content += '<td style="padding: 3px;">' + props['再生能源類別'] + '</td></tr>';
    }

    content += '</table>';

    // Add navigation buttons
    content += '<div style="margin-top: 10px;">';
    content += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + coords[1] + ',' + coords[0] + '&travelmode=driving" target="_blank" style="display: block; margin-bottom: 5px; padding: 8px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 5px; text-align: center;">Google 導航</a>';
    content += '</div>';

    content += '</div>';
    return content;
}

// Create marker icon
function createMarkerIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="12" cy="12" r="8" fill="' + color + '" stroke="white" stroke-width="2"/>' +
            '</svg>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

// Load a county's data
function loadCountyData(countyName, filename) {
    if (countyLayers[countyName]) {
        // Already loaded, just apply current filter
        applyFilter();
        return Promise.resolve();
    }

    return fetch(filename)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            var color = getCountyColor(countyName);
            var icon = createMarkerIcon(color);
            var layerMarkers = [];
            var featureData = [];

            data.features.forEach(function(feature) {
                var coords = feature.geometry.coordinates;
                var marker = L.marker([coords[1], coords[0]], { icon: icon });
                marker.bindPopup(function() { return createPopupContent(feature); });
                marker.feature = feature;  // Store feature reference
                layerMarkers.push(marker);
                featureData.push(feature);

                // Track location types
                var locationType = feature.properties['設置位置'];
                if (locationType) {
                    locationTypes.add(locationType);
                }
            });

            countyLayers[countyName] = layerMarkers;
            countyData[countyName] = featureData;

            // Update filter dropdown
            updateFilterDropdown();

            // Apply current filter
            applyFilter();
        })
        .catch(function(error) {
            console.error('Error loading ' + filename + ':', error);
        });
}

// Remove a county's data
function removeCountyData(countyName) {
    if (countyLayers[countyName]) {
        markers.removeLayers(countyLayers[countyName]);
        delete countyLayers[countyName];
        delete countyData[countyName];
        updateFilterStats();
    }
}

// Update filter dropdown with available location types
function updateFilterDropdown() {
    var select = document.getElementById('locationFilter');
    var currentValue = select.value;

    // Clear existing options except "全部"
    select.innerHTML = '<option value="">全部</option>';

    // Add sorted location types
    var sortedTypes = Array.from(locationTypes).sort();
    sortedTypes.forEach(function(type) {
        var option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    });

    // Restore previous selection if still valid
    if (currentValue && locationTypes.has(currentValue)) {
        select.value = currentValue;
    }

    // Show filter section if we have data
    var filterSection = document.getElementById('filterSection');
    if (locationTypes.size > 0) {
        filterSection.style.display = 'block';
    }

    updateFilterStats();
}

// Apply current filter to all loaded markers
function applyFilter() {
    currentFilter = document.getElementById('locationFilter').value;

    // Clear all markers first
    markers.clearLayers();

    var totalCount = 0;
    var filteredCount = 0;

    // Re-add markers that match the filter
    Object.keys(countyLayers).forEach(function(countyName) {
        var layerMarkers = countyLayers[countyName];
        layerMarkers.forEach(function(marker) {
            totalCount++;
            var locationType = marker.feature.properties['設置位置'] || '';
            if (!currentFilter || locationType === currentFilter) {
                markers.addLayer(marker);
                filteredCount++;
            }
        });
    });

    updateFilterStats(filteredCount, totalCount);
}

// Update filter statistics display
function updateFilterStats(filtered, total) {
    var statsEl = document.getElementById('filterStats');
    if (typeof filtered === 'undefined') {
        // Calculate from current state
        filtered = 0;
        total = 0;
        Object.keys(countyLayers).forEach(function(countyName) {
            var layerMarkers = countyLayers[countyName];
            layerMarkers.forEach(function(marker) {
                total++;
                var locationType = marker.feature.properties['設置位置'] || '';
                if (!currentFilter || locationType === currentFilter) {
                    filtered++;
                }
            });
        });
    }

    if (total > 0) {
        statsEl.textContent = '顯示 ' + filtered.toLocaleString() + ' / ' + total.toLocaleString() + ' 筆';
    } else {
        statsEl.textContent = '';
    }
}

// Render county list
function renderCountyList() {
    var countyListEl = document.getElementById('countyList');
    countyListEl.innerHTML = '';

    manifest.forEach(function(item) {
        var li = document.createElement('li');
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'county-' + item.name;
        checkbox.dataset.name = item.name;
        checkbox.dataset.file = item.file;

        checkbox.addEventListener('change', function() {
            if (this.checked) {
                loadCountyData(item.name, item.file);
            } else {
                removeCountyData(item.name);
            }
        });

        var label = document.createElement('label');
        label.htmlFor = 'county-' + item.name;
        label.textContent = item.name;

        var count = document.createElement('span');
        count.className = 'count';
        count.textContent = ' (' + item.count.toLocaleString() + ')';

        li.appendChild(checkbox);
        li.appendChild(label);
        li.appendChild(count);
        countyListEl.appendChild(li);
    });
}

// Select all counties
document.getElementById('selectAll').addEventListener('click', function() {
    var checkboxes = document.querySelectorAll('#countyList input[type="checkbox"]');
    checkboxes.forEach(function(cb) {
        if (!cb.checked) {
            cb.checked = true;
            loadCountyData(cb.dataset.name, cb.dataset.file);
        }
    });
});

// Deselect all counties
document.getElementById('deselectAll').addEventListener('click', function() {
    var checkboxes = document.querySelectorAll('#countyList input[type="checkbox"]');
    checkboxes.forEach(function(cb) {
        if (cb.checked) {
            cb.checked = false;
            removeCountyData(cb.dataset.name);
        }
    });
});

// Filter change event
document.getElementById('locationFilter').addEventListener('change', function() {
    applyFilter();
});

// Load manifest and initialize
fetch('json/manifest.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
        manifest = data;
        renderCountyList();
    })
    .catch(function(error) {
        console.error('Error loading manifest:', error);
        document.getElementById('countyList').innerHTML = '<li style="color: red;">載入失敗</li>';
    });
