// Initialize map centered on Tainan
var map = L.map('map').setView([23.0, 120.2], 13);

// Add NLSC base tile layer
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
    opacity: 0.5
}).addTo(map);

// Define colors for each company
var companyColors = {
    '平○公司1': '#e74c3c',
    '平○公司2': '#3498db',
    '新○公司': '#2ecc71'
};

// Define GeoJSON files to load
var geojsonFiles = [
    { name: '平○公司1', file: 'json/平○公司1.geojson' },
    { name: '平○公司2', file: 'json/平○公司2.geojson' },
    { name: '新○公司', file: 'json/新○公司.geojson' }
];

// Store all layers
var layers = [];
var allBounds = null;

// Function to create popup content
function createPopupContent(feature, companyName) {
    var props = feature.properties;
    var coords = feature.geometry.coordinates;

    // Get center point for navigation
    var centerLng, centerLat;
    if (feature.geometry.type === 'MultiPolygon') {
        centerLng = props.xcenter || coords[0][0][0][0];
        centerLat = props.ycenter || coords[0][0][0][1];
    } else if (feature.geometry.type === 'Polygon') {
        centerLng = props.xcenter || coords[0][0][0];
        centerLat = props.ycenter || coords[0][0][1];
    } else {
        centerLng = props.xcenter || 120.2;
        centerLat = props.ycenter || 23.0;
    }

    var content = '<div style="max-width: 300px;">';
    content += '<h4 style="margin-top: 0; color: ' + companyColors[companyName] + ';">' + companyName + '</h4>';
    content += '<table style="width: 100%; font-size: 13px;">';

    // Only show specific fields
    if (props['縣市']) {
        content += '<tr><td style="padding: 3px; width: 35%;"><strong>縣市</strong></td>';
        content += '<td style="padding: 3px;">' + props['縣市'] + '</td></tr>';
    }
    if (props['鄉鎮']) {
        content += '<tr><td style="padding: 3px; width: 35%;"><strong>鄉鎮</strong></td>';
        content += '<td style="padding: 3px;">' + props['鄉鎮'] + '</td></tr>';
    }
    if (props['地段']) {
        content += '<tr><td style="padding: 3px; width: 35%;"><strong>地段</strong></td>';
        content += '<td style="padding: 3px;">' + props['地段'] + '</td></tr>';
    }
    if (props['地號']) {
        content += '<tr><td style="padding: 3px; width: 35%;"><strong>地號</strong></td>';
        content += '<td style="padding: 3px;">' + props['地號'] + '</td></tr>';
    }

    content += '</table>';

    // Add navigation buttons
    content += '<div style="margin-top: 10px;">';
    content += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + centerLat + ',' + centerLng + '&travelmode=driving" target="_blank" style="display: block; margin-bottom: 5px; padding: 8px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 5px; text-align: center;">Google 導航</a>';
    content += '<a href="https://wego.here.com/directions/drive/mylocation/' + centerLat + ',' + centerLng + '" target="_blank" style="display: block; margin-bottom: 5px; padding: 8px; background-color: #00AFAA; color: white; text-decoration: none; border-radius: 5px; text-align: center;">Here WeGo 導航</a>';
    content += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + centerLat + '_' + centerLng + '" target="_blank" style="display: block; padding: 8px; background-color: #008272; color: white; text-decoration: none; border-radius: 5px; text-align: center;">Bing 導航</a>';
    content += '</div>';

    content += '</div>';
    return content;
}

// Function to style features
function getFeatureStyle(companyName) {
    return {
        color: companyColors[companyName],
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.3,
        fillColor: companyColors[companyName]
    };
}

// Load TopoJSON layer first
fetch('https://kiang.github.io/taiwan_basecode/cunli/topo/city/20240807/臺南市.json')
    .then(response => response.json())
    .then(data => {
        // Convert TopoJSON to GeoJSON
        var objectKey = Object.keys(data.objects)[0];
        var geojson = topojson.feature(data, data.objects[objectKey]);

        L.geoJSON(geojson, {
            style: {
                color: '#666666',
                weight: 1.5,
                opacity: 0.6,
                fillOpacity: 0,
                fillColor: 'transparent'
            },
            interactive: false,
            onEachFeature: function(feature, layer) {
                if (feature.properties) {
                    var props = feature.properties;
                    var label = (props.COUNTYNAME || '') + (props.TOWNNAME || '') + (props.VILLNAME || '');
                    if (label) {
                        layer.bindTooltip(label, {
                            permanent: true,
                            direction: 'center',
                            className: 'village-label'
                        });
                    }
                }
            }
        }).addTo(map);
    })
    .catch(error => {
        console.error('Error loading Tainan City boundaries:', error);
    });

// Load each GeoJSON file
geojsonFiles.forEach(function(item) {
    fetch(item.file)
        .then(response => response.json())
        .then(data => {
            var layer = L.geoJSON(data, {
                style: function(feature) {
                    return getFeatureStyle(item.name);
                },
                onEachFeature: function(feature, layer) {
                    layer.bindPopup(function() {
                        return createPopupContent(feature, item.name);
                    });

                    // Highlight on hover
                    layer.on('mouseover', function(e) {
                        e.target.setStyle({
                            weight: 3,
                            fillOpacity: 0.5
                        });
                    });

                    layer.on('mouseout', function(e) {
                        e.target.setStyle(getFeatureStyle(item.name));
                    });
                }
            }).addTo(map);

            layers.push(layer);

            // Update bounds to include this layer
            var layerBounds = layer.getBounds();
            if (allBounds === null) {
                allBounds = layerBounds;
            } else {
                allBounds.extend(layerBounds);
            }

            // After all layers loaded, fit map to show all features
            if (layers.length === geojsonFiles.length) {
                map.fitBounds(allBounds, { padding: [50, 50] });
            }
        })
        .catch(error => {
            console.error('Error loading ' + item.file + ':', error);
        });
});
