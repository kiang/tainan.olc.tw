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
var projectIndex = {};  // Map projectKey -> array of markers
var projectSearchIndex = {};  // Map projectKey -> { owner, count } for search
var projectScopeLayer = null;  // Layer for showing project boundary
var currentProjectKey = null;  // Current project in view mode
var projectViewMode = false;  // Whether in project view mode
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
    var projectKey = props.projectKey || '';

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

    // Add navigation button
    content += '<div style="margin-top: 10px;">';
    content += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + coords[1] + ',' + coords[0] + '&travelmode=driving" target="_blank" style="display: block; padding: 8px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 5px; text-align: center;">Google 導航</a>';
    content += '</div>';

    // Show project info at bottom (only show button when not in project view mode)
    if (projectKey && projectIndex[projectKey]) {
        var projectCount = projectIndex[projectKey].length;
        content += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">';
        content += '<table style="width: 100%; font-size: 13px;">';
        content += '<tr><td style="padding: 3px; width: 35%;"><strong>案件編號</strong></td>';
        content += '<td style="padding: 3px;">' + projectKey + '</td></tr>';
        content += '<tr><td style="padding: 3px;"><strong>案場範圍</strong></td>';
        content += '<td style="padding: 3px;">' + projectCount + ' 筆地號</td></tr>';
        content += '</table>';

        // Show project scope button only when not in project view mode
        if (!projectViewMode && projectCount > 1) {
            content += '<button onclick="showProjectScope(\'' + projectKey + '\')" style="width: 100%; margin-top: 8px; padding: 8px; background-color: #e67e22; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;">顯示案場範圍</button>';
        }
        content += '</div>';
    }

    content += '</div>';
    return content;
}

// Show project scope on map
function showProjectScope(projectKey) {
    // Close any open popup
    map.closePopup();

    // Remove existing project scope layer
    if (projectScopeLayer) {
        map.removeLayer(projectScopeLayer);
        projectScopeLayer = null;
    }

    var projectMarkers = projectIndex[projectKey];
    if (!projectMarkers || projectMarkers.length === 0) return;

    // Enter project view mode
    projectViewMode = true;
    currentProjectKey = projectKey;

    // Clear all markers and show only project markers
    markers.clearLayers();
    projectMarkers.forEach(function(marker) {
        markers.addLayer(marker);
    });

    // Collect all coordinates
    var latlngs = projectMarkers.map(function(marker) {
        var coords = marker.feature.geometry.coordinates;
        return [coords[1], coords[0]];
    });

    // Create bounds and convex hull-like polygon
    if (latlngs.length === 1) {
        // Single point - show circle
        projectScopeLayer = L.circle(latlngs[0], {
            radius: 100,
            color: '#e67e22',
            weight: 3,
            fillColor: '#e67e22',
            fillOpacity: 0.2
        }).addTo(map);
    } else if (latlngs.length === 2) {
        // Two points - show line with buffer
        projectScopeLayer = L.polyline(latlngs, {
            color: '#e67e22',
            weight: 4
        }).addTo(map);
    } else {
        // Multiple points - create convex hull
        var hull = getConvexHull(latlngs);
        projectScopeLayer = L.polygon(hull, {
            color: '#e67e22',
            weight: 3,
            fillColor: '#e67e22',
            fillOpacity: 0.2
        }).addTo(map);
    }

    // Fit map to show project scope
    var bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Get project owner from first marker
    var firstMarker = projectMarkers[0];
    var owner = firstMarker.feature.properties['設置者名稱'] || '-';

    // Show project section in info panel
    document.getElementById('projectSection').style.display = 'block';
    document.getElementById('projectId').textContent = projectKey;
    document.getElementById('projectCount').textContent = projectMarkers.length + ' 筆地號';
    document.getElementById('projectOwner').textContent = owner;

    // Update filter stats
    document.getElementById('filterStats').textContent = '案場模式';
}

// Exit project view mode and restore all markers
function exitProjectView() {
    // Close any open popup
    map.closePopup();

    // Remove project scope layer
    if (projectScopeLayer) {
        map.removeLayer(projectScopeLayer);
        projectScopeLayer = null;
    }

    // Exit project view mode
    projectViewMode = false;
    currentProjectKey = null;

    // Hide project section in info panel
    document.getElementById('projectSection').style.display = 'none';

    // Restore all markers with current filter
    applyFilter();
}

// Simple convex hull algorithm (Graham scan)
function getConvexHull(points) {
    if (points.length < 3) return points;

    // Find the point with lowest y (and leftmost if tie)
    var start = 0;
    for (var i = 1; i < points.length; i++) {
        if (points[i][0] < points[start][0] ||
            (points[i][0] === points[start][0] && points[i][1] < points[start][1])) {
            start = i;
        }
    }

    // Sort points by polar angle with respect to start point
    var startPoint = points[start];
    var sorted = points.slice().sort(function(a, b) {
        var angleA = Math.atan2(a[0] - startPoint[0], a[1] - startPoint[1]);
        var angleB = Math.atan2(b[0] - startPoint[0], b[1] - startPoint[1]);
        return angleA - angleB;
    });

    // Build hull
    var hull = [];
    for (var i = 0; i < sorted.length; i++) {
        while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], sorted[i]) <= 0) {
            hull.pop();
        }
        hull.push(sorted[i]);
    }

    return hull;
}

function cross(o, a, b) {
    return (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
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

                // Build project index and search index
                var projectKey = feature.properties.projectKey;
                if (projectKey) {
                    if (!projectIndex[projectKey]) {
                        projectIndex[projectKey] = [];
                    }
                    projectIndex[projectKey].push(marker);

                    // Build search index
                    if (!projectSearchIndex[projectKey]) {
                        projectSearchIndex[projectKey] = {
                            owner: feature.properties['設置者名稱'] || '',
                            count: 0
                        };
                    }
                    projectSearchIndex[projectKey].count++;
                }
            });

            countyLayers[countyName] = layerMarkers;
            countyData[countyName] = featureData;

            // Update filter dropdown and show search section
            updateFilterDropdown();
            updateSearchSection();

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
        // Check if current project view will be affected
        var affectsCurrentProject = false;
        if (projectViewMode && currentProjectKey) {
            countyLayers[countyName].forEach(function(marker) {
                if (marker.feature.properties.projectKey === currentProjectKey) {
                    affectsCurrentProject = true;
                }
            });
        }

        // Remove markers from project index and search index
        countyLayers[countyName].forEach(function(marker) {
            var projectKey = marker.feature.properties.projectKey;
            if (projectKey && projectIndex[projectKey]) {
                var idx = projectIndex[projectKey].indexOf(marker);
                if (idx > -1) {
                    projectIndex[projectKey].splice(idx, 1);
                }
                if (projectIndex[projectKey].length === 0) {
                    delete projectIndex[projectKey];
                    delete projectSearchIndex[projectKey];
                }
            }
        });

        markers.removeLayers(countyLayers[countyName]);
        delete countyLayers[countyName];
        delete countyData[countyName];

        // Update search section
        updateSearchSection();

        // Exit project view mode if current project was affected
        if (affectsCurrentProject) {
            exitProjectView();
        } else {
            // Clear project scope layer if visible
            if (projectScopeLayer) {
                map.removeLayer(projectScopeLayer);
                projectScopeLayer = null;
            }
            updateFilterStats();
        }
    }
}

// Update search section visibility
function updateSearchSection() {
    var searchSection = document.getElementById('searchSection');
    var projectCount = Object.keys(projectSearchIndex).length;
    if (projectCount > 0) {
        searchSection.style.display = 'block';
    } else {
        searchSection.style.display = 'none';
    }
}

// Search projects by keyword
function searchProjects(keyword) {
    if (!keyword || keyword.length < 1) {
        return [];
    }

    keyword = keyword.toLowerCase();
    var results = [];

    Object.keys(projectSearchIndex).forEach(function(projectKey) {
        var info = projectSearchIndex[projectKey];
        var matchKey = projectKey.toLowerCase().indexOf(keyword) !== -1;
        var matchOwner = info.owner.toLowerCase().indexOf(keyword) !== -1;

        if (matchKey || matchOwner) {
            results.push({
                projectKey: projectKey,
                owner: info.owner,
                count: projectIndex[projectKey] ? projectIndex[projectKey].length : info.count
            });
        }
    });

    // Sort by count descending
    results.sort(function(a, b) {
        return b.count - a.count;
    });

    return results.slice(0, 20);  // Limit to 20 results
}

// Render search results
function renderSearchResults(results) {
    var container = document.getElementById('searchResults');

    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">找不到符合的案件</div>';
        container.style.display = 'block';
        return;
    }

    var html = '';
    results.forEach(function(result) {
        html += '<div class="result-item" onclick="selectSearchResult(\'' + result.projectKey + '\')">';
        html += '<div class="project-id">' + result.projectKey + '</div>';
        html += '<div class="owner">' + result.owner + ' (' + result.count + ' 筆地號)</div>';
        html += '</div>';
    });

    container.innerHTML = html;
    container.style.display = 'block';
}

// Handle selecting a search result
function selectSearchResult(projectKey) {
    // Clear search
    document.getElementById('projectSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';

    // Check if project markers are loaded
    if (!projectIndex[projectKey] || projectIndex[projectKey].length === 0) {
        alert('請先勾選包含此案件的縣市');
        return;
    }

    // Enter project view mode
    showProjectScope(projectKey);
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
    // Exit project view mode when filter changes
    if (projectViewMode) {
        projectViewMode = false;
        currentProjectKey = null;
        if (projectScopeLayer) {
            map.removeLayer(projectScopeLayer);
            projectScopeLayer = null;
        }
        document.getElementById('projectSection').style.display = 'none';
    }
    applyFilter();
});

// Search input event
document.getElementById('projectSearch').addEventListener('input', function() {
    var keyword = this.value.trim();
    if (keyword.length === 0) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }
    var results = searchProjects(keyword);
    renderSearchResults(results);
});

// Hide search results when clicking outside
document.addEventListener('click', function(e) {
    var searchSection = document.getElementById('searchSection');
    if (!searchSection.contains(e.target)) {
        document.getElementById('searchResults').style.display = 'none';
    }
});

// Show search results when focusing on search input
document.getElementById('projectSearch').addEventListener('focus', function() {
    var keyword = this.value.trim();
    if (keyword.length > 0) {
        var results = searchProjects(keyword);
        renderSearchResults(results);
    }
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
