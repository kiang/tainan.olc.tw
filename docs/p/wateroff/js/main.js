// Initialize the map
var map;
var overlay;

// Set up the WMTS layer
function setupWMTSLayer() {
    var projection = ol.proj.get('EPSG:3857');
    var projectionExtent = projection.getExtent();
    var size = ol.extent.getWidth(projectionExtent) / 256;
    var resolutions = new Array(20);
    var matrixIds = new Array(20);
    for (var z = 0; z < 20; ++z) {
        resolutions[z] = size / Math.pow(2, z);
        matrixIds[z] = z;
    }

    return new ol.layer.Tile({
        source: new ol.source.WMTS({
            matrixSet: 'EPSG:3857',
            format: 'image/png',
            url: 'https://wmts.nlsc.gov.tw/wmts',
            layer: 'EMAP',
            tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(projectionExtent),
                resolutions: resolutions,
                matrixIds: matrixIds
            }),
            style: 'default',
            wrapX: true,
            attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
        }),
        opacity: 0.8
    });
}

// Create styles for different features
const waterOffStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255, 0, 0, 0.4)'
    }),
    stroke: new ol.style.Stroke({
        color: '#ff0000',
        width: 2
    })
});

const pressureDownStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255, 165, 0, 0.4)'
    }),
    stroke: new ol.style.Stroke({
        color: '#ffa500',
        width: 2
    })
});

const pastEventStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(128, 128, 128, 0.4)'
    }),
    stroke: new ol.style.Stroke({
        color: '#808080',
        width: 2
    })
});

const supplyPointStyle = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
            color: '#3388ff'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffffff',
            width: 2
        })
    })
});

// Function to create popup content for water off cases
function createWaterOffPopupContent(feature) {
    const properties = feature.getProperties();
    
    let content = '<div class="card">';
    content += '<div class="card-body">';
    content += `<h5 class="card-title">停水資訊</h5>`;
    content += `<p class="card-text">案件編號: ${properties.id || '未提供'}</p>`;
    content += `<p class="card-text">開始時間: ${properties.begin || '未提供'}</p>`;
    content += `<p class="card-text">預計完成時間: ${properties.end || '未提供'}</p>`;
    if (properties.note) {
        content += `<p class="card-text">備註: ${properties.note}</p>`;
    }
    content += '</div></div>';
    return content;
}

// Function to create popup content for supply points
function createSupplyPointPopupContent(feature) {
    const properties = feature.getProperties();
    const geometry = feature.getGeometry();
    const coordinates = ol.proj.transform(geometry.getCoordinates(), 'EPSG:3857', 'EPSG:4326');
    const [lon, lat] = coordinates;
    
    let content = '<div class="card">';
    content += '<div class="card-body">';
    content += `<h5 class="card-title">供水點資訊</h5>`;
    content += `<p class="card-text">地點: ${properties.name || '未提供'}</p>`;
    content += `<p class="card-text">地址: ${properties.address || '未提供'}</p>`;
    if (properties.memo) {
        content += `<p class="card-text">備註: ${properties.memo}</p>`;
    }
    content += '</div>';
    
    // Add navigation buttons
    content += '<div class="card-footer nav-buttons">';
    content += '<div class="d-grid gap-2">';
    content += `<a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" class="btn nav-btn google">
        <i class="fa fa-google"></i>
        <span>Google Maps 導航</span>
    </a>`;
    content += `<a href="https://www.bing.com/maps/directions?rtp=~pos.${lat}_${lon}" target="_blank" class="btn nav-btn bing">
        <i class="fa fa-map"></i>
        <span>Bing Maps 導航</span>
    </a>`;
    content += `<a href="https://wego.here.com/directions/drive/mylocation/${lat},${lon}" target="_blank" class="btn nav-btn here">
        <i class="fa fa-location-arrow"></i>
        <span>HERE Maps 導航</span>
    </a>`;
    content += '</div>';
    content += '</div>';
    content += '</div>';
    return content;
}

// Function to show popup
function showPopup(feature, coordinate) {
    const popupContent = document.getElementById('popup-content');
    let content;
    
    if (feature.get('type') === 'waterOff') {
        content = createWaterOffPopupContent(feature);
    } else if (feature.get('type') === 'supplyPoint') {
        content = createSupplyPointPopupContent(feature);
    }

    popupContent.innerHTML = content;
    overlay.setPosition(coordinate);
}

// Function to check if event has ended
function isEventEnded(endTime) {
    if (!endTime) return false;
    const now = new Date();
    const end = new Date(endTime);
    return now > end;
}

// Initialize the map
function initMap() {
    // Create the popup overlay
    overlay = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });

    // Create vector sources
    const waterOffSource = new ol.source.Vector();
    const supplyPointSource = new ol.source.Vector();

    // Create vector layers
    const waterOffLayer = new ol.layer.Vector({
        source: waterOffSource,
        style: function(feature) {
            const endTime = feature.get('end');
            if (isEventEnded(endTime)) {
                return pastEventStyle;
            }
            return feature.get('areaType') === 'waterOff' ? waterOffStyle : pressureDownStyle;
        }
    });

    const supplyPointLayer = new ol.layer.Vector({
        source: supplyPointSource,
        style: supplyPointStyle
    });

    // Initialize map
    map = new ol.Map({
        target: 'map',
        layers: [
            setupWMTSLayer(),
            waterOffLayer,
            supplyPointLayer
        ],
        overlays: [overlay],
        view: new ol.View({
            center: ol.proj.fromLonLat([120.221507, 23.000694]), // Tainan
            zoom: 13
        })
    });

    // Add click handler to hide popup
    document.getElementById('popup-closer').onclick = function() {
        overlay.setPosition(undefined);
        return false;
    };

    // Add click handler for features
    map.on('singleclick', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });

        if (feature) {
            showPopup(feature, evt.coordinate);
        } else {
            overlay.setPosition(undefined);
        }
    });

    // Load water off cases
    fetch('https://kiang.github.io/web.water.gov.tw/getWaterOffCases.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(item => {
                if (item.waterOffArea) {
                    const feature = new ol.Feature({
                        geometry: new ol.format.GeoJSON().readGeometry(item.waterOffArea, {
                            featureProjection: 'EPSG:3857'
                        }),
                        type: 'waterOff',
                        areaType: 'waterOff',
                        id: item.no,
                        begin: item.startDate.substring(0, 10) + ' ' + item.startTime,
                        end: item.endDate.substring(0, 10) + ' ' + item.endTime
                    });
                    waterOffSource.addFeature(feature);
                }
                if (item.pressureDownArea) {
                    const feature = new ol.Feature({
                        geometry: new ol.format.GeoJSON().readGeometry(item.pressureDownArea, {
                            featureProjection: 'EPSG:3857'
                        }),
                        type: 'waterOff',
                        areaType: 'pressureDown',
                        id: item.no,
                        begin: item.startDate.substring(0, 10) + ' ' + item.startTime,
                        end: item.endDate.substring(0, 10) + ' ' + item.endTime
                    });
                    waterOffSource.addFeature(feature);
                }
            });
        });

    // Load supply points
    fetch('https://kiang.github.io/web.water.gov.tw/getWaterOffSupply.json')
        .then(response => response.json())
        .then(data => {
            data.supply.forEach(item => {
                if (item.location) {
                    const feature = new ol.Feature({
                        geometry: new ol.format.GeoJSON().readGeometry(item.location, {
                            featureProjection: 'EPSG:3857'
                        }),
                        type: 'supplyPoint',
                        ...item
                    });
                    supplyPointSource.addFeature(feature);
                }
            });
        });
}

// Initialize the map when the window loads
window.onload = initMap; 