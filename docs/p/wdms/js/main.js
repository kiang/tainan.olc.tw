// Initialize map centered on Taiwan
const map = L.map('map').setView([23.5, 121], 8);

// NLSC (National Land Surveying and Mapping Center) satellite base layer
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>',
    maxZoom: 18,
    opacity: 0.8
}).addTo(map);

// Variables
let markers = {};
let markersLayer = null;
let userLocationMarker = null;
let currentFeature = null;
let csvData = {};
let findTerms = [];

// Create custom garbage icon using Font Awesome
const garbageIcon = L.divIcon({
    html: '<i class="fas fa-trash-alt fa-2x"></i>',
    className: 'garbage-icon-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

// Create marker cluster group
markersLayer = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});

// Function to create popup content
function createPopupContent(feature, details) {
    const coords = feature.geometry.coordinates;
    const lonLat = [coords[0], coords[1]];
    const props = feature.properties;

    let content = '<div style="max-width: 400px; max-height: 500px; overflow-y: auto;">';
    content += `<h4>${props.name || '廢棄物案件'}</h4>`;

    if (details) {
        content += '<table class="table table-sm">';

        // Display all fields from CSV, excluding empty values
        for (const [key, value] of Object.entries(details)) {
            if (value !== null && value !== undefined && value !== '' && key !== 'id' && key !== 'ID') {
                content += `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`;
            }
        }

        content += '</table>';
    } else {
        content += `<p>案件 ID: ${props.id}</p>`;
    }

    // Navigation buttons
    content += '<div class="btn-group-vertical" role="group" style="width: 100%; margin-top: 10px;">';
    content += `<a href="https://www.google.com/maps/dir/?api=1&destination=${lonLat[1]},${lonLat[0]}&travelmode=driving" target="_blank" class="btn btn-primary btn-sm" style="margin-bottom: 5px;">Google 導航</a>`;
    content += `<a href="https://wego.here.com/directions/drive/mylocation/${lonLat[1]},${lonLat[0]}" target="_blank" class="btn btn-primary btn-sm" style="margin-bottom: 5px;">Here WeGo 導航</a>`;
    content += `<a href="https://bing.com/maps/default.aspx?rtp=~pos.${lonLat[1]}_${lonLat[0]}" target="_blank" class="btn btn-primary btn-sm">Bing 導航</a>`;
    content += '</div>';
    content += '</div>';

    return content;
}

// Show point information
function showPoint(pointId) {
    if (!pointId || !markers[pointId]) {
        return;
    }

    const feature = markers[pointId];

    // Update current feature
    currentFeature = feature;

    const marker = feature._leafletMarker;
    if (marker) {
        map.panTo(marker.getLatLng());
        marker.openPopup();
    }
}

// Show position
function showPos(lng, lat) {
    map.setView([lat, lng], 16);
}

// Function to load and process data
async function loadData() {
    try {
        // Load GeoJSON points
        const geoResponse = await fetch('https://kiang.github.io/geoser.moenv.gov.tw/json/points.json');
        const geoData = await geoResponse.json();

        // Load CSV data
        const csvResponse = await fetch('https://kiang.github.io/geoser.moenv.gov.tw/csv/points.csv');
        const csvText = await csvResponse.text();

        // Parse CSV using PapaParse
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                // Create lookup object by ID
                results.data.forEach(row => {
                    // Try multiple possible ID fields
                    const id = row.id || row.ID || row.SiteCode || row.案件編號;
                    if (id) {
                        csvData[id] = row;
                    }
                });

                // Process GeoJSON features
                geoData.features.forEach(feature => {
                    const coords = feature.geometry.coordinates;
                    const props = feature.properties;
                    const id = props.id || props.SiteCode;

                    // Store feature
                    markers[id] = feature;

                    // Add to search terms
                    const searchText = [];
                    if (props.name) searchText.push(props.name);
                    if (props.address) searchText.push(props.address);

                    // Add CSV data to search
                    const details = csvData[id];
                    if (details) {
                        for (const [key, value] of Object.entries(details)) {
                            if (value && typeof value === 'string') {
                                searchText.push(value);
                            }
                        }
                    }

                    findTerms.push({
                        value: id,
                        label: searchText.join(' ')
                    });

                    // Create marker with garbage icon
                    const marker = L.marker([coords[1], coords[0]], {
                        icon: garbageIcon,
                        title: props.name || props.SiteName || id
                    });

                    // Store reference to marker in feature
                    feature._leafletMarker = marker;

                    // Bind popup
                    marker.bindPopup(() => createPopupContent(feature, csvData[id]), {
                        maxWidth: 450,
                        maxHeight: 550,
                        offset: L.point(0, -20)
                    });

                    // Update URL hash when popup opens
                    marker.on('popupopen', function(e) {
                        const expectedHash = '#' + id;
                        if (window.location.hash !== expectedHash) {
                            window.location.hash = expectedHash;
                        }
                    });

                    // Add to cluster group
                    markersLayer.addLayer(marker);
                });

                // Add markers to map
                map.addLayer(markersLayer);

                // Hide loading indicator
                document.getElementById('loading').style.display = 'none';

                // Fit bounds to markers if any exist
                if (markersLayer.getBounds().isValid()) {
                    map.fitBounds(markersLayer.getBounds());
                }

                // Set up autocomplete
                $('#findPoint').autocomplete({
                    source: findTerms,
                    select: function(event, ui) {
                        window.location.hash = '#' + ui.item.value;
                        return false;
                    }
                });

                // Set up routing
                routie(':pointId', showPoint);
                routie('pos/:lng/:lat', showPos);

                // Handle initial route
                setTimeout(function() {
                    const currentHash = window.location.hash;
                    if (currentHash && currentHash !== '#') {
                        const pointId = currentHash.substring(1);
                        showPoint(pointId);
                    }
                }, 500);
            },
            error: function(error) {
                console.error('CSV parsing error:', error);
                document.getElementById('loading').textContent = '載入 CSV 資料失敗';
            }
        });

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').textContent = '載入資料失敗';
    }
}

// Geolocation button
document.getElementById('btn-geolocation').addEventListener('click', function(e) {
    e.preventDefault();

    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援地理定位功能');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            map.setView([lat, lng], 16);

            // Remove existing user location marker
            if (userLocationMarker) {
                map.removeLayer(userLocationMarker);
            }

            // Add user location marker
            userLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: '<div style="background-color: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                    className: 'user-location-marker',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                })
            }).addTo(map);
        },
        function(error) {
            alert('無法取得您的位置');
        }
    );
});

// Load data when page is ready
loadData();
