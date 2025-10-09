// Initialize map
var map = L.map('map').setView([23.000694, 120.221507], 14);

// Add base tile layer
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
    opacity: 0.8
}).addTo(map);

// Variables
var currentFeature = null;
var markers = {};
var markersLayer = L.layerGroup().addTo(map);
var userLocationMarker = null;
var punishmentsData = {};

// Create custom icon for markers
function createIcon(properties) {
    var color, isActive = properties.is_active !== false;

    if (!isActive) {
        color = '#cccccc';
    } else if (properties.capacity > properties.status) {
        color = '#48c774';
    } else {
        color = '#ffdd57';
    }

    var size = currentFeature && currentFeature.properties && currentFeature.properties.id === properties.id ? 40 : 30;
    var hasPunishment = punishmentsData[properties.id];
    var strokeColor = hasPunishment ? '#ff0000' : (currentFeature && currentFeature.properties && currentFeature.properties.id === properties.id ? '#ff00ff' : '#fff');
    var strokeWidth = hasPunishment ? '3' : (currentFeature && currentFeature.properties && currentFeature.properties.id === properties.id ? '3' : '2');

    return L.divIcon({
        html: `<div style="
            width: ${size}px;
            height: ${size}px;
            position: relative;
            transform: translate(-50%, -50%);
        ">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <polygon points="${size/2},2 ${size-2},${size-2} 2,${size-2}"
                    fill="${color}"
                    stroke="${strokeColor}"
                    stroke-width="${strokeWidth}"/>
            </svg>
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #0000ff;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 1px 1px 1px white, -1px -1px 1px white, 1px -1px 1px white, -1px 1px 1px white;
            ">${properties.status}/${properties.capacity}</div>
        </div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

// Create popup content
function createPopupContent(feature, detailData) {
    if (!detailData) {
        return '<div style="text-align: center; padding: 20px;">載入中...</div>';
    }

    var lonLat = [feature.geometry.coordinates[0], feature.geometry.coordinates[1]];

    var content = '<div style="max-width: 400px; max-height: 500px; overflow-y: auto;">';
    content += '<h4 style="margin-top: 0;">' + detailData['機構名稱'] + '</h4>';

    // Show punishments if they exist
    var punishments = punishmentsData[feature.properties.id];
    if (punishments && punishments.length > 0) {
        content += '<div style="background-color: #fff5f5; border: 2px solid #ff0000; border-radius: 10px; padding: 10px; margin-bottom: 15px;">';
        content += '<h5 style="color: #ff0000; margin: 0 0 10px 0; font-size: 16px;">⚠️ 裁罰記錄 (' + punishments.length + ' 筆)</h5>';
        punishments.forEach(function(punishment) {
            content += '<div style="margin-bottom: 10px; padding: 8px; background-color: white; border-radius: 5px;">';
            content += '<table class="table table-sm mb-0" style="font-size: 13px;">';

            // Show all columns dynamically
            for (var key in punishment) {
                if (punishment.hasOwnProperty(key)) {
                    var value = punishment[key];
                    // Handle nested objects (like 裁罰對象)
                    if (typeof value === 'object' && value !== null) {
                        for (var subKey in value) {
                            if (value.hasOwnProperty(subKey)) {
                                content += '<tr><td style="width: 40%;"><strong>' + subKey + '</strong></td><td>' + value[subKey] + '</td></tr>';
                            }
                        }
                    } else {
                        // Make case_id clickable
                        if (key === 'case_id') {
                            content += '<tr><td style="width: 40%;"><strong>' + key + '</strong></td><td><a href="https://crc.olc.tw/cases/' + value + '.html" target="_blank" style="color: #74b9ff; text-decoration: underline;">' + value + '</a></td></tr>';
                        } else {
                            content += '<tr><td style="width: 40%;"><strong>' + key + '</strong></td><td>' + value + '</td></tr>';
                        }
                    }
                }
            }

            content += '</table>';
            content += '</div>';
        });
        content += '</div>';
    }

    content += '<table class="table table-sm">';
    content += '<tr><td><strong>負責人</strong></td><td>' + detailData['負責人姓名'] + '</td></tr>';
    content += '<tr><td><strong>電話</strong></td><td>' + detailData['聯絡電話'] + '</td></tr>';
    content += '<tr><td><strong>地址</strong></td><td>' + detailData['所在地'] + '</td></tr>';
    content += '<tr><td><strong>核定收托</strong></td><td>' + detailData['核定收托'] + '</td></tr>';
    content += '<tr><td><strong>實際收托</strong></td><td>' + detailData['實際收托'] + '</td></tr>';
    content += '</table>';

    content += '<div class="btn-group-vertical" role="group" style="width: 100%; margin-top: 10px;">';
    content += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-primary btn-sm" style="margin-bottom: 5px;">Google 導航</a>';
    content += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-primary btn-sm" style="margin-bottom: 5px;">Here WeGo 導航</a>';
    content += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-primary btn-sm" style="margin-bottom: 5px;">Bing 導航</a>';
    content += '<a href="https://babycare.olc.tw/babycare/view/' + detailData['id'] + '/" target="_blank" class="btn btn-success btn-sm">查看詳細資料</a>';
    content += '</div>';
    content += '</div>';

    return content;
}

// Show point information
function showPoint(currentPointId) {
    if (!currentPointId || !markers[currentPointId]) {
        return;
    }
    
    var feature = markers[currentPointId];
    currentFeature = feature;
    updateAllMarkers();
    
    var marker = feature._leafletMarker;
    if (marker) {
        // Don't change zoom, just pan to the marker
        map.panTo(marker.getLatLng());
        marker.openPopup();
    }
}

// Update all markers when selection changes
function updateAllMarkers() {
    markersLayer.clearLayers();
    
    for (var id in markers) {
        var feature = markers[id];
        var marker = L.marker(
            [feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 
            { icon: createIcon(feature.properties) }
        );
        
        // Store reference to marker in feature
        feature._leafletMarker = marker;
        
        // Bind popup with loading content
        marker.bindPopup(createPopupContent(feature, null), {
            maxWidth: 450,
            maxHeight: 550,
            offset: L.point(0, -20) // Offset popup to appear above the triangle marker
        });
        
        // Load detailed data when popup opens
        marker.on('popupopen', (function(feature) {
            return function(e) {
                var popup = e.popup;
                
                // Update URL hash
                if (window.location.hash !== '#' + feature.properties.id) {
                    window.location.hash = '#' + feature.properties.id;
                }
                
                // Load detailed data
                $.getJSON('https://kiang.github.io/ncwisweb.sfaa.gov.tw/data/' + feature.properties.city + '/' + feature.properties.id + '.json', {}, function(detailData) {
                    popup.setContent(createPopupContent(feature, detailData));
                });
            };
        })(feature));
        
        markersLayer.addLayer(marker);
    }
}

// Show position
function showPos(lng, lat) {
    map.setView([lat, lng], 16);
}

// Load punishments data first
$.getJSON('data/punishments.json', {}, function(data) {
    punishmentsData = data;
}).fail(function() {
    console.log('Failed to load punishments data, continuing without it');
}).always(function() {
    // Load babycare data after punishments (or even if it fails)
    loadBabycareData();
});

// Load data
var findTerms = [];
function loadBabycareData() {
    $.getJSON('https://kiang.github.io/ncwisweb.sfaa.gov.tw/babycare.json', {}, function (data) {
        // Process features
        data.features.forEach(function(feature) {
            markers[feature.properties.id] = feature;
            findTerms.push({
                value: feature.properties.id,
                label: feature.properties.name + ' ' + feature.properties.address
            });
        });

        // Add all markers to map
        updateAllMarkers();

        // Set up routing
        routie(':pointId', showPoint);
        routie('pos/:lng/:lat', showPos);

        // Set up autocomplete
        $('#findPoint').autocomplete({
            source: findTerms,
            select: function (event, ui) {
                window.location.hash = '#' + ui.item.value;
                return false;
            }
        });

        // Handle initial route
        setTimeout(function() {
            var currentHash = window.location.hash;
            if (currentHash && currentHash !== '#') {
                var pointId = currentHash.substring(1);
                showPoint(pointId);
            }
        }, 500);
    });
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
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            
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