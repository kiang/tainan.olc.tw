// Constants and Configuration
const CONFIG = {
    defaultCity: '臺南市',
    defaultYear: new Date().getFullYear() - 1911,
    cities: ['基隆市', '臺北市', '新北市', '桃園市', '新竹縣', '新竹市', '苗栗縣', '臺中市', '南投縣', '彰化縣', '雲林縣', '嘉義縣', '嘉義市', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '金門縣', '澎湖縣', '連江縣'],
    dataUrl: 'https://kiang.github.io/landchg.tcd.gov.tw/csv/points'
};

// Global Variables
const app = {
    map: null,
    dataPool: {},
    typeOptions: { 'all': true },
    selectedCity: CONFIG.defaultCity,
    selectedYear: CONFIG.defaultYear,
    years: Array.from({ length: CONFIG.defaultYear - 92 }, (_, i) => CONFIG.defaultYear - i),
    markerClusterGroup: null,
    currentMarkers: [],
    legendControl: null,
    currentPopup: null,
    isFirstLoad: true,
    customMarker: null,
    customMarkerTimeout: null
};

// Custom marker icons
const icons = {
    legal: L.divIcon({
        className: 'legal-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -20]
    }),
    illegal: L.divIcon({
        className: 'illegal-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -20]
    })
};

// Custom Legend Control
L.Control.Legend = L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'legend-control leaflet-bar');
        
        // Prevent map clicks/drags on the control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        // Create legend HTML
        container.innerHTML = `
            <div class="legend-header">
                <span class="legend-title">
                    <i class="fa fa-filter"></i> 篩選與圖例
                </span>
                <i class="fa fa-chevron-down legend-toggle" id="legendToggle"></i>
            </div>
            <div class="legend-content" id="legendContent">
                <div class="filter-section">
                    <div class="filter-label"><i class="fa fa-map-marker"></i> 選擇縣市</div>
                    <select id="pointCity" class="select-filter"></select>
                    
                    <div class="filter-label"><i class="fa fa-calendar"></i> 選擇年份</div>
                    <select id="pointYear" class="select-filter"></select>
                    
                    <div class="filter-label"><i class="fa fa-filter"></i> 變異類型</div>
                    <select id="pointType" class="select-filter"></select>
                </div>
                
                <hr style="margin: 10px 0; border: none; border-top: 1px solid #e0e6ed;">
                
                <div style="margin-top: 10px;">
                    <div class="legend-item">
                        <span class="legend-icon legal"></span>
                        <span>合法變異</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-icon illegal"></span>
                        <span>非法變異</span>
                    </div>
                </div>
                
                <hr style="margin: 10px 0; border: none; border-top: 1px solid #e0e6ed;">
                
                <div style="margin-bottom: 10px;">
                    <div class="filter-label"><i class="fa fa-crosshairs"></i> 跳至座標</div>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="coordinateInput" placeholder="緯度,經度 (如: 23.0,120.2)" 
                               style="flex: 1; padding: 6px 10px; border: 1px solid #e0e6ed; border-radius: 6px; font-size: 13px;">
                        <button id="goToCoordinate" style="padding: 6px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; white-space: nowrap;
                                transition: all 0.3s ease;"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';"
                                onmouseout="this.style.transform=''; this.style.boxShadow='';">
                            <i class="fa fa-search"></i> 前往
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 12px; padding-top: 10px; padding-bottom: 5px; border-top: 1px solid #e0e6ed;">
                    <a href="https://landchg.tcd.gov.tw/Module/RWD/Web/Default.aspx" target="_blank" style="font-size: 12px; color: #667eea; text-decoration: none; display: inline-block; white-space: nowrap;">
                        <i class="fa fa-external-link"></i> 資料來源：國土利用監測整合資訊網
                    </a>
                </div>
            </div>
        `;

        // Set up toggle functionality
        setTimeout(() => {
            const toggle = document.getElementById('legendToggle');
            const content = document.getElementById('legendContent');
            
            toggle.addEventListener('click', function() {
                toggle.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
                
                // Store collapsed state for max-height calculation
                if (!content.classList.contains('collapsed')) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                } else {
                    content.style.maxHeight = '0';
                }
            });
            
            // Set initial max-height for animation
            content.style.maxHeight = content.scrollHeight + 'px';
            
            // Set up coordinate input functionality
            const coordInput = document.getElementById('coordinateInput');
            const goButton = document.getElementById('goToCoordinate');
            
            const goToCoordinate = () => {
                const value = coordInput.value.trim();
                const parts = value.split(',');
                
                if (parts.length === 2) {
                    const lat = parseFloat(parts[0].trim());
                    const lng = parseFloat(parts[1].trim());
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        // Check valid coordinate ranges
                        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                            // Pan and zoom to the coordinate
                            map.setView([lat, lng], 18);
                            
                            // Remove existing custom marker if any
                            if (app.customMarker) {
                                map.removeLayer(app.customMarker);
                                clearTimeout(app.customMarkerTimeout);
                            }
                            
                            // Add a persistent marker at the location
                            app.customMarker = L.marker([lat, lng], {
                                icon: L.divIcon({
                                    className: 'custom-coordinate-marker',
                                    html: '<div style="background: rgba(255, 165, 0, 0.9); border: 2px solid #ff8c00; border-radius: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px;"></div>',
                                    iconSize: [12, 12],
                                    iconAnchor: [6, 6]
                                })
                            }).addTo(map);
                            
                            app.customMarker.bindPopup(`<div style="text-align: center;">
                                <strong>自訂座標</strong><br>
                                緯度: ${lat}<br>
                                經度: ${lng}<br>
                                <button onclick="
                                    if(app.customMarker) {
                                        app.map.removeLayer(app.customMarker);
                                        app.customMarker = null;
                                        clearTimeout(app.customMarkerTimeout);
                                    }
                                " style="margin-top: 8px; padding: 4px 8px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    移除標記
                                </button>
                            </div>`).openPopup();
                            
                            // Auto-remove after 5 minutes instead of 10 seconds
                            app.customMarkerTimeout = setTimeout(() => {
                                if (app.customMarker) {
                                    map.removeLayer(app.customMarker);
                                    app.customMarker = null;
                                }
                            }, 300000);
                        } else {
                            alert('座標超出有效範圍！\n緯度: -90 到 90\n經度: -180 到 180');
                        }
                    } else {
                        alert('請輸入有效的座標格式！\n例如: 23.0,120.2');
                    }
                } else {
                    alert('請輸入正確格式：緯度,經度\n例如: 23.0,120.2');
                }
            };
            
            goButton.addEventListener('click', goToCoordinate);
            
            // Allow Enter key to trigger the search
            coordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    goToCoordinate();
                }
            });
        }, 0);

        return container;
    }
});

// UI Functions
const ui = {
    initializeSelects: function () {
        setTimeout(() => {
            $('#pointCity').html(CONFIG.cities.map(city => `<option>${city}</option>`).join('')).val(app.selectedCity);
            $('#pointYear').html(app.years.map(year => `<option>${year}</option>`).join('')).val(app.selectedYear);

            $('.select-filter').change(function () {
                const theCity = $('#pointCity').val();
                const theYear = $('#pointYear').val();
                const theType = $('#pointType').val();
                data.showData(theCity, theYear, theType);
            });
        }, 100);
    },

    createPopupContent: function (properties) {
        if (!properties) return '';
        
        // Organize data by importance
        const importantFields = ['變異點編號', '變異類型', '查證結果', '變異點位置', '通報機關'];
        const regularFields = Object.keys(properties).filter(key => 
            !importantFields.includes(key) && key !== 'latitude' && key !== 'longitude'
        );
        
        let html = `<div class="popup-header">${properties['變異類型'] || '變異點資訊'}</div>`;
        html += '<div class="popup-content">';
        
        // Important information section
        if (importantFields.some(field => properties[field])) {
            html += '<div class="info-section">';
            importantFields.forEach(field => {
                if (properties[field]) {
                    const value = properties[field];
                    const isLegal = field === '查證結果' && value === '合法';
                    const statusClass = field === '查證結果' ? (isLegal ? 'status-legal' : 'status-illegal') : '';
                    html += `<div class="info-item ${statusClass}">
                        <span class="info-label">${field}</span>
                        <span class="info-value">${value}</span>
                    </div>`;
                }
            });
            html += '</div>';
        }
        
        // Other information (if exists)
        if (regularFields.length > 0) {
            html += '<div class="info-section">';
            html += '<div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">其他資訊</div>';
            regularFields.forEach(key => {
                if (properties[key]) {
                    html += `<div class="info-item">
                        <span class="info-label">${key}</span>
                        <span class="info-value">${properties[key]}</span>
                    </div>`;
                }
            });
            html += '</div>';
        }
        
        // Action buttons
        const caseId = properties['變異點編號'] || '';
        const currentCity = $('#pointCity').val() || app.selectedCity;
        const currentYear = $('#pointYear').val() || app.selectedYear;
        const lat = parseFloat(properties.latitude);
        const lng = parseFloat(properties.longitude);
        
        html += '<div class="action-buttons">';
        
        if (caseId) {
            html += `<a href="https://landchg.olc.tw/#detail/${caseId}?city=${encodeURIComponent(currentCity)}&year=${currentYear}" target="_blank" class="btn-action btn-primary-action">
                <i class="fa fa-search"></i> 查看詳細資料
            </a>`;
        }
        
        html += `
            <a href="https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},18z/data=!3m1!1e3" target="_blank" class="btn-action btn-secondary-action">
                <i class="fa fa-satellite"></i> Google 衛星
            </a>
            <a href="https://www.bing.com/maps?cp=${lat}~${lng}&lvl=18&style=h&sp=point.${lat}_${lng}_${encodeURIComponent(properties['變異類型'] || '變異點')}" target="_blank" class="btn-action btn-secondary-action">
                <i class="fa fa-globe"></i> Bing 衛星
            </a>
        `;
        
        html += '</div></div>';
        
        return html;
    }
};

// Data Handling
const data = {
    showData: function (city, year, type = 'all') {
        // Clear existing markers (but preserve custom marker)
        if (app.markerClusterGroup) {
            app.markerClusterGroup.clearLayers();
        }
        
        // Close current popup if exists (unless it's the custom marker popup)
        if (app.currentPopup && (!app.customMarker || app.currentPopup !== app.customMarker.getPopup())) {
            app.map.closePopup(app.currentPopup);
            app.currentPopup = null;
        }
        
        // Update selected values
        app.selectedCity = city;
        app.selectedYear = year;
        
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
        // Show loading state in legend
        const legendContent = document.getElementById('legendContent');
        if (legendContent) {
            const loadingDiv = document.createElement('div');
            loadingDiv.innerHTML = '<div class="text-center" style="padding: 10px;"><div class="loading"></div><p style="margin-top: 10px; font-size: 12px;">載入資料中...</p></div>';
            loadingDiv.id = 'loadingIndicator';
            legendContent.appendChild(loadingDiv);
        }
        
        $.get(`${CONFIG.dataUrl}/${year}/${city}.csv`, {}, function (csv) {
            if (csv.length > 0) {
                app.dataPool[city][year] = $.csv.toObjects(csv);
            } else {
                app.dataPool[city][year] = [];
            }
            data.processData(app.dataPool[city][year], type);
            
            // Remove loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            
            if (app.dataPool[city][year].length === 0) {
                // Show no data message as popup
                L.popup()
                    .setLatLng(app.map.getCenter())
                    .setContent('<div style="padding: 10px; text-align: center;"><i class="fa fa-info-circle"></i> 此地區年份無資料</div>')
                    .openOn(app.map);
            }
        }).fail(function() {
            // Remove loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            
            L.popup()
                .setLatLng(app.map.getCenter())
                .setContent('<div style="padding: 10px; text-align: center; color: #e74c3c;"><i class="fa fa-exclamation-triangle"></i> 資料載入失敗</div>')
                .openOn(app.map);
        });
    },

    processData: function (data, type) {
        const markers = [];
        const bounds = L.latLngBounds();
        
        data.forEach(item => {
            if (item['變異類型'] === '') {
                item['變異類型'] = '其他';
            }
            if (type !== 'all' && type !== item['變異類型']) return;

            const lat = parseFloat(item.latitude);
            const lng = parseFloat(item.longitude);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                const isLegal = item['查證結果'] === '合法';
                const marker = L.marker([lat, lng], {
                    icon: isLegal ? icons.legal : icons.illegal,
                    isIllegal: !isLegal
                });
                
                // Bind popup
                const popupContent = ui.createPopupContent(item);
                marker.bindPopup(popupContent, {
                    maxWidth: 400,
                    className: 'custom-popup'
                });
                
                // Store reference to popup
                marker.on('popupopen', function(e) {
                    app.currentPopup = e.popup;
                });
                
                markers.push(marker);
                bounds.extend([lat, lng]);
            }

            if (!app.typeOptions[item['變異類型']]) {
                app.typeOptions[item['變異類型']] = true;
            }
        });

        $('#pointType').html(Object.keys(app.typeOptions).map(k => `<option>${k}</option>`).join('')).val(type);
        
        // Add markers to cluster group
        if (markers.length > 0) {
            app.markerClusterGroup.addLayers(markers);
            
            // Only fit bounds on first load
            if (app.isFirstLoad) {
                app.map.fitBounds(bounds, { padding: [50, 50] });
                app.isFirstLoad = false;
            }
        }
        
        // Re-add custom marker if it exists (in case it was accidentally removed)
        if (app.customMarker && !app.map.hasLayer(app.customMarker)) {
            app.customMarker.addTo(app.map);
        }
    }
};

// Initialize Map
function initMap() {
    // Create map
    app.map = L.map('map', {
        center: [23.000694, 120.221507],
        zoom: 13
    });

    // Add WMTS base layer (NLSC EMAP)
    const wmtsUrl = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';
    L.tileLayer(wmtsUrl, {
        attribution: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
        opacity: 0.3,
        maxZoom: 19
    }).addTo(app.map);

    // Create marker cluster group
    app.markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 40,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            const markers = cluster.getAllChildMarkers();
            
            // Check if any marker in the cluster is illegal (red)
            let hasIllegal = false;
            for (let marker of markers) {
                if (marker.options.isIllegal) {
                    hasIllegal = true;
                    break;
                }
            }
            
            // Use red color if any illegal marker exists, otherwise use blue
            const bgColor = hasIllegal ? 'rgba(231, 76, 60, 0.9)' : 'rgba(41, 128, 185, 0.9)';
            const borderColor = hasIllegal ? '#a93226' : '#1e5a7a';
            
            return L.divIcon({
                html: '<div style="background: ' + bgColor + '; color: white; border: 2px solid ' + borderColor + '; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">' + count + '</div>',
                className: 'marker-cluster-custom',
                iconSize: L.point(40, 40)
            });
        }
    });
    app.map.addLayer(app.markerClusterGroup);

    // Add legend control
    app.legendControl = new L.Control.Legend();
    app.map.addControl(app.legendControl);

    // Initialize UI
    ui.initializeSelects();

    // Load initial data
    data.showData(app.selectedCity, app.selectedYear);
}

// Start the application
$(document).ready(initMap);