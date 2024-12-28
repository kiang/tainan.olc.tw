let map;
let vectorSource;
let clusterSource;
let overlay;

function createMarkerStyle(feature) {
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 12,
            fill: new ol.style.Fill({color: 'rgba(255, 204, 0, 0.8)'}),
            stroke: new ol.style.Stroke({color: '#cc9900', width: 2})
        })
    });
}

function createClusterStyle(feature) {
    const size = feature.get('features').length;
    
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 20,
            fill: new ol.style.Fill({color: 'rgba(255, 153, 0, 0.8)'}),
            stroke: new ol.style.Stroke({color: '#cc6600', width: 2})
        }),
        text: new ol.style.Text({
            text: size.toString(),
            font: 'bold 14px Arial',
            fill: new ol.style.Fill({color: '#fff'}),
            stroke: new ol.style.Stroke({
                color: '#cc6600',
                width: 2
            }),
            offsetY: 1
        })
    });
}

function showPopup(feature, coordinate) {
    const content = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">${feature.get('電廠名稱')}</h5>
                <p class="card-text">
                    業者名稱: ${feature.get('業者名稱')}<br>
                    施工取得日期: ${feature.get('施工取得日期')}<br>
                    土地面積: ${feature.get('土地面積')} 平方公尺<br>
                    裝置容量: ${feature.get('裝置容量')} <br>
                    地址: ${feature.get('縣市')}${feature.get('鄉鎮區')}${feature.get('地段')}${feature.get('地號')}
                </p>
            </div>
        </div>
    `;
    
    document.getElementById('popup-content').innerHTML = content;
    overlay.setPosition(coordinate);
}

function initMap() {
    // Create base layer
    const baseLayer = new ol.layer.Tile({
        source: new ol.source.WMTS({
            matrixSet: 'EPSG:3857',
            format: 'image/png',
            url: 'https://wmts.nlsc.gov.tw/wmts',
            layer: 'EMAP',
            tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(ol.proj.get('EPSG:3857').getExtent()),
                resolutions: Array(20).fill().map((_, i) => 156543.03392804097 / Math.pow(2, i)),
                matrixIds: Array(20).fill().map((_, i) => i.toString())
            }),
            style: 'default',
            wrapX: true,
            attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
        })
    });

    // Create vector source and cluster source
    vectorSource = new ol.source.Vector();
    clusterSource = new ol.source.Cluster({
        distance: 40,
        source: vectorSource
    });

    // Create cluster layer
    const clusterLayer = new ol.layer.Vector({
        source: clusterSource,
        style: function(feature) {
            const features = feature.get('features');
            return features.length > 1 ? createClusterStyle(feature) : createMarkerStyle(features[0]);
        }
    });

    // Initialize map
    map = new ol.Map({
        target: 'map',
        layers: [baseLayer, clusterLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([120.301507, 23.124694]),
            zoom: 8
        })
    });

    // Create popup overlay
    overlay = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });
    map.addOverlay(overlay);

    // Add click handler
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });

        if (feature) {
            const features = feature.get('features');
            if (features.length === 1) {
                showPopup(features[0], evt.coordinate);
            } else {
                const extent = ol.extent.createEmpty();
                features.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
                map.getView().fit(extent, {
                    duration: 1000,
                    padding: [50, 50, 50, 50]
                });
            }
        } else {
            overlay.setPosition(undefined);
        }
    });

    // Add popup closer handler
    document.getElementById('popup-closer').onclick = function() {
        overlay.setPosition(undefined);
        return false;
    };

    // Add geolocation button handler
    document.getElementById('locate-me').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const coords = ol.proj.fromLonLat([position.coords.longitude, position.coords.latitude]);
                map.getView().animate({
                    center: coords,
                    zoom: 15,
                    duration: 1000
                });
            });
        }
    });

    // Load data
    fetch('https://kiang.github.io/moeaea.gov.tw/solar_points.csv')
        .then(response => response.text())
        .then(csv => {
            const rows = csv.split('\n').slice(1);
            rows.forEach(row => {
                const cols = row.split(',');
                if (cols.length >= 13) {
                    const feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(cols[11]), parseFloat(cols[12])])),
                        '申請年度': cols[0],
                        '項次': cols[1],
                        '業者名稱': cols[2],
                        '電廠名稱': cols[3],
                        '施工取得日期': cols[4],
                        '土地面積': cols[5],
                        '裝置容量': cols[6],
                        '縣市': cols[7],
                        '鄉鎮區': cols[8],
                        '地段': cols[9],
                        '地號': cols[10]
                    });
                    vectorSource.addFeature(feature);
                }
            });
        });
}

window.onload = initMap;
