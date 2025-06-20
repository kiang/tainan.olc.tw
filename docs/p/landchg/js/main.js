// Constants and Configuration
const CONFIG = {
    defaultCity: '臺南市',
    defaultYear: new Date().getFullYear() - 1911,
    cities: ['基隆市', '臺北市', '新北市', '桃園市', '新竹縣', '新竹市', '苗栗縣', '臺中市', '南投縣', '彰化縣', '雲林縣', '嘉義縣', '嘉義市', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '金門縣', '澎湖縣', '連江縣'],
    baseMapUrl: 'https://wmts.nlsc.gov.tw/wmts',
    dataUrl: 'https://kiang.github.io/landchg.tcd.gov.tw/csv/points'
};

// Global Variables
const app = {
    map: null,
    sidebar: null,
    dataPool: {},
    typeOptions: { 'all': true },
    selectedCity: CONFIG.defaultCity,
    selectedYear: CONFIG.defaultYear,
    years: Array.from({ length: CONFIG.defaultYear - 92 }, (_, i) => CONFIG.defaultYear - i),
    clusterSource: null,
    vectorSource: null
};

// Map Style Functions
const styles = {
    cluster: function(feature) {
        const size = feature.get('features').length;
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 20,
                fill: new ol.style.Fill({
                    color: 'rgba(255, 153, 0, 0.8)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#cc6600',
                    width: 2
                })
            }),
            text: new ol.style.Text({
                text: size.toString(),
                font: 'bold 14px Arial',
                fill: new ol.style.Fill({
                    color: '#fff'
                }),
                stroke: new ol.style.Stroke({
                    color: '#cc6600',
                    width: 2
                }),
                offsetY: 1
            })
        });
    },

    point: function (feature) {
        const p = feature.getProperties().properties;
        const z = app.map.getView().getZoom();
        const imgColor = p['查證結果'] === '合法' ? 'rgba(120, 236, 62, 1)' : 'rgba(236, 120, 62, 1)';

        const baseStyle = new ol.style.Style({
            image: new ol.style.RegularShape({
                radius: 10,
                points: 3,
                fill: new ol.style.Fill({ color: imgColor }),
                stroke: new ol.style.Stroke({
                    color: '#00f',
                    width: 1
                })
            })
        });

        if (z > 12) {
            baseStyle.setText(new ol.style.Text({
                font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
                placement: 'point',
                textAlign: 'left',
                textBaseline: 'bottom',
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 255, 1)'
                }),
                text: p['變異類型']
            }));
        }

        return baseStyle;
    }
};

// Map Layers
const layers = {
    base: new ol.layer.Tile({
        source: new ol.source.WMTS({
            matrixSet: 'EPSG:3857',
            format: 'image/png',
            url: CONFIG.baseMapUrl,
            layer: 'EMAP',
            tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(ol.proj.get('EPSG:3857').getExtent()),
                resolutions: Array(20).fill().map((_, i) => 156543.03392804097 / Math.pow(2, i)),
                matrixIds: Array(20).fill().map((_, i) => i.toString())
            }),
            style: 'default',
            wrapX: true,
            attributions: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
        }),
        opacity: 0.3
    }),
    points: new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: styles.point
    })
};

// UI Functions
const ui = {
    initializeSelects: function () {
        $('#pointCity').html(CONFIG.cities.map(city => `<option>${city}</option>`).join(''));
        $('#pointYear').html(app.years.map(year => `<option>${year}</option>`).join(''));

        $('.select-filter').change(function () {
            const theCity = $('#pointCity').val();
            const theYear = $('#pointYear').val();
            const theType = $('#pointType').val();
            data.showData(theCity, theYear, theType);
        });
    },

    updatePopup: function (feature) {
        const p = feature.getProperties();
        if (p.properties) {
            const lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
            
            // Organize data by importance
            const importantFields = ['變異點編號', '變異類型', '查證結果', '變異點位置', '通報機關'];
            const regularFields = Object.keys(p.properties).filter(key => !importantFields.includes(key));
            
            let message = '<div class="popup-content">';
            
            // Important information section
            if (importantFields.some(field => p.properties[field])) {
                message += '<div class="info-highlight">';
                importantFields.forEach(field => {
                    if (p.properties[field]) {
                        const value = p.properties[field];
                        const isLegal = field === '查證結果' && value === '合法';
                        const statusClass = field === '查證結果' ? (isLegal ? 'status-legal' : 'status-illegal') : '';
                        message += `<div class="info-item ${statusClass}">
                            <span class="info-label">${field}</span>
                            <span class="info-value">${value}</span>
                        </div>`;
                    }
                });
                message += '</div>';
            }
            
            // Other information
            if (regularFields.length > 0) {
                message += '<div class="info-details">';
                message += '<h6 class="details-title"><i class="fa fa-list"></i> 詳細資訊</h6>';
                message += '<table class="table table-dark table-sm"><tbody>';
                regularFields.forEach(key => {
                    if (p.properties[key]) {
                        message += `<tr><th scope="row">${key}</th><td>${p.properties[key]}</td></tr>`;
                    }
                });
                message += '</tbody></table>';
                message += '</div>';
            }
            
            // Action buttons
            const caseId = p.properties['變異點編號'] || '';
            const currentCity = $('#pointCity').val();
            const currentYear = $('#pointYear').val();
            
            message += '<div class="action-buttons">';
            message += '<div class="btn-group-vertical" role="group">';
            
            if (caseId) {
                message += `<a href="https://landchg.olc.tw/#detail/${caseId}?city=${encodeURIComponent(currentCity)}&year=${currentYear}" target="_blank" class="btn btn-primary btn-lg btn-block">
                    <i class="fa fa-search"></i> 查看詳細資料
                </a>`;
            }
            
            message += `
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lonLat[1]},${lonLat[0]}&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">
                    <i class="fa fa-map-marker"></i> Google 導航
                </a>
                <a href="https://wego.here.com/directions/drive/mylocation/${lonLat[1]},${lonLat[0]}" target="_blank" class="btn btn-info btn-lg btn-block">
                    <i class="fa fa-location-arrow"></i> Here WeGo 導航
                </a>
                <a href="https://bing.com/maps/default.aspx?rtp=~pos.${lonLat[1]}_${lonLat[0]}" target="_blank" class="btn btn-info btn-lg btn-block">
                    <i class="fa fa-globe"></i> Bing 導航
                </a>
            `;
            
            message += '</div></div></div>';

            $('#sidebarTitle').text(p.properties['變異類型'] || '變異點資訊');
            $('#sidebarContent').html(message);
            app.sidebar.open('home');
            return true;
        }
        return false;
    }
};

// Data Handling
const data = {
    showData: function (city, year, type = 'all') {
        app.vectorSource.clear();
        $('#pointCity').val(city);
        $('#pointYear').val(year);

        if (!app.dataPool[city]) {
            app.dataPool[city] = {};
        }

        if (!app.dataPool[city][year]) {
            this.fetchData(city, year, type);
        } else {
            this.processData(app.dataPool[city][year], type);
        }
    },

    fetchData: function (city, year, type) {
        // Show loading state
        $('#sidebarContent').html('<div class="text-center"><div class="loading"></div><p style="margin-top: 10px;">載入資料中...</p></div>');
        
        $.get(`${CONFIG.dataUrl}/${year}/${city}.csv`, {}, function (csv) {
            if (csv.length > 0) {
                app.dataPool[city][year] = $.csv.toObjects(csv);
            } else {
                app.dataPool[city][year] = [];
            }
            data.processData(app.dataPool[city][year], type);
            
            // Clear loading state
            if (app.dataPool[city][year].length === 0) {
                $('#sidebarContent').html('<div class="text-center text-muted"><i class="fa fa-info-circle"></i><p>此地區年份無資料</p></div>');
            } else {
                $('#sidebarContent').html('');
            }
        }).fail(function() {
            $('#sidebarContent').html('<div class="text-center text-warning"><i class="fa fa-exclamation-triangle"></i><p>資料載入失敗</p></div>');
        });
    },

    processData: function (data, type) {
        const features = [];
        data.forEach(item => {
            if (item['變異類型'] === '') {
                item['變異類型'] = '其他';
            }
            if (type !== 'all' && type !== item['變異類型']) return;

            const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([
                    parseFloat(item.longitude),
                    parseFloat(item.latitude)
                ])),
                properties: item
            });
            features.push(feature);

            if (!app.typeOptions[item['變異類型']]) {
                app.typeOptions[item['變異類型']] = true;
            }
        });

        $('#pointType').html(Object.keys(app.typeOptions).map(k => `<option>${k}</option>`).join('')).val(type);
        app.vectorSource.addFeatures(features);
        if (features.length > 0) {
            app.map.getView().fit(app.vectorSource.getExtent());
        }
    }
};

// Initialize Map
function initMap() {
    // Create sources
    app.vectorSource = new ol.source.Vector();
    app.clusterSource = new ol.source.Cluster({
        distance: 40,
        source: app.vectorSource
    });

    // Create cluster layer
    const clusterLayer = new ol.layer.Vector({
        source: app.clusterSource,
        style: function(feature) {
            const features = feature.get('features');
            return features.length > 1 ? styles.cluster(feature) : styles.point(features[0]);
        }
    });

    // Create sidebar
    app.sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });

    // Create map
    app.map = new ol.Map({
        layers: [layers.base, clusterLayer],
        target: 'map',
        view: new ol.View({
            center: ol.proj.fromLonLat([120.221507, 23.000694]),
            zoom: 13
        })
    });

    app.map.addControl(app.sidebar);

    // Add click handler
    app.map.on('singleclick', function (evt) {
        let pointClicked = false;
        app.map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            if (!pointClicked) {
                const features = feature.get('features');
                if (features && features.length > 1) {
                    // Zoom to cluster
                    const extent = ol.extent.createEmpty();
                    features.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
                    app.map.getView().fit(extent, {
                        duration: 1000,
                        padding: [50, 50, 50, 50],
                        maxZoom: 18
                    });
                } else {
                    // Show popup for single feature
                    pointClicked = ui.updatePopup(features ? features[0] : feature);
                }
            }
        });
    });

    // Initialize UI
    ui.initializeSelects();

    // Load initial data
    data.showData(app.selectedCity, app.selectedYear);
}

// Start the application
$(document).ready(initMap);