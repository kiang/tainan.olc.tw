// Constants and Configuration
const CONFIG = {
    baseMapUrl: 'https://wmts.nlsc.gov.tw/wmts',
    topoJsonUrl: 'https://kiang.github.io/taiwan_basecode/cunli/topo/city/20240807/臺南市.json',
    schoolDataUrl: 'https://kiang.github.io/std.tn.edu.tw/zones/cunli_to_school.json',
    schoolDistrictUrl: 'https://kiang.github.io/std.tn.edu.tw/zones/school_to_cunli.json',
    defaultHash: 'village' // Default route
};

// Global Variables
const app = {
    map: null,
    vectorSource: null,
    clusterSource: null,
    overlay: null,
    schoolData: null,
    schoolDistricts: null,
    selectedVillage: null,  // Track village highlight
    selectedDistrict: [],    // Track district highlights
    isRouting: false,  // Add flag to prevent recursive routing
    isAnimating: false,  // Track if map is currently animating
    routeTimeout: null   // For debouncing route changes
};

// Add style functions
const styles = {
    default: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#319FD3',
            width: 1
        })
    }),
    
    highlight: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 243, 0, 0.4)'
        }),
        stroke: new ol.style.Stroke({
            color: '#f00',
            width: 2
        }),
        text: new ol.style.Text({
            font: '14px Arial',
            fill: new ol.style.Fill({
                color: '#000'
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 3
            }),
            overflow: true
        })
    }),

    districtHighlight: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(0, 255, 0, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#0f0',
            width: 2
        }),
        text: new ol.style.Text({
            font: '14px Arial',
            fill: new ol.style.Fill({
                color: '#000'
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 3
            }),
            overflow: true
        })
    })
};

// Add debounce function
function debounce(func, wait) {
    return function executedFunction(...args) {
        if (app.routeTimeout) {
            clearTimeout(app.routeTimeout);
        }
        app.routeTimeout = setTimeout(() => {
            func.apply(this, args);
            app.routeTimeout = null;
        }, wait);
    };
}

// Initialize Map
function initMap() {
    Promise.all([
        fetch(CONFIG.schoolDataUrl).then(response => response.json()),
        fetch(CONFIG.schoolDistrictUrl).then(response => response.json())
    ])
    .then(([schoolData, districtData]) => {
        app.schoolData = schoolData;
        app.schoolDistricts = districtData;
        initializeMap();
    })
    .catch(error => console.error('Error loading data:', error));
}

function showPopup(feature, coordinate) {
    const villcode = feature.get('VILLCODE');
    if (!app.isRouting) {
        window.location.hash = `#village/${villcode}`;
    }
    
    const villname = feature.get('TOWNNAME') + feature.get('VILLNAME');
    const schoolInfo = app.schoolData[villcode];
    
    let content = `<div class="card">
        <div class="card-body">
            <h5 class="card-title">${villname}</h5>`;

    if (schoolInfo) {
        if (schoolInfo['國中'] && schoolInfo['國中'].length > 0) {
            content += '<h6 class="mt-3">國中</h6><ul class="list-group">';
            schoolInfo['國中'].forEach(school => {
                content += `<li class="list-group-item" data-school-code="${school.code}" data-school-type="國中">
                    <strong><a href="#school/${school.code}">${school.name}</a></strong><br>
                    <small>里鄰: ${school.scope}</small>
                </li>`;
            });
            content += '</ul>';
        }

        if (schoolInfo['國小'] && schoolInfo['國小'].length > 0) {
            content += '<h6 class="mt-3">國小</h6><ul class="list-group">';
            schoolInfo['國小'].forEach(school => {
                content += `<li class="list-group-item" data-school-code="${school.code}" data-school-type="國小">
                    <strong><a href="#school/${school.code}">${school.name}</a></strong><br>
                    <small>里鄰: ${school.scope}</small>
                </li>`;
            });
            content += '</ul>';
        }
    } else {
        content += '<p class="text-muted">此區無學校資料</p>';
    }

    content += '</div></div>';

    document.getElementById('popup-content').innerHTML = content;
    app.overlay.setPosition(coordinate);

    // Highlight any list items for currently selected school
    const hash = window.location.hash;
    if (hash.startsWith('#school/')) {
        const schoolCode = hash.split('/')[1];
        highlightSchoolListItems(schoolCode);
    }
}

function highlightSchoolListItems(schoolCode) {
    // Clear all highlights first
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add highlight to matching items
    document.querySelectorAll(`.list-group-item[data-school-code="${schoolCode}"]`).forEach(item => {
        item.classList.add('active');
    });
}

function highlightFeature(feature) {
    // Handle single village highlight
    if (app.selectedVillage) {
        app.selectedVillage.setStyle(styles.default);
    }
    
    if (feature) {
        const highlightStyle = styles.highlight.clone();
        highlightStyle.getText().setText(feature.get('TOWNNAME') + feature.get('VILLNAME'));
        feature.setStyle(highlightStyle);
        app.selectedVillage = feature;
    } else {
        app.selectedVillage = null;
    }

    // reset district highlights if they exist
    if (app.selectedDistrict.length > 0) {
        app.selectedDistrict.forEach(f => {
            if (f !== app.selectedVillage) {
                f.setStyle(styles.default);
            }
        });
        app.selectedDistrict = [];
    }
}

function highlightSchoolDistrict(schoolCode) {
    if (!app.isRouting) {
        window.location.hash = `#school/${schoolCode}`;
    }
    
    // Clear previous district highlights
    app.selectedDistrict.forEach(f => {
        if (f !== app.selectedVillage) {
            f.setStyle(styles.default);
        }
    });
    app.selectedDistrict = [];

    // Highlight matching list items
    highlightSchoolListItems(schoolCode);

    const districtVillages = app.schoolDistricts[schoolCode];
    if (districtVillages) {
        const features = app.vectorSource.getFeatures()
            .filter(f => districtVillages.includes(f.get('VILLCODE')));
        
        features.forEach(f => {
            if (f !== app.selectedVillage) {
                const districtStyle = styles.districtHighlight.clone();
                districtStyle.getText().setText(f.get('TOWNNAME') + f.get('VILLNAME'));
                f.setStyle(districtStyle);
            }
            app.selectedDistrict.push(f);
        });

        // Fit view to show all highlighted features
        if (features.length > 0) {
            const extent = ol.extent.createEmpty();
            features.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
            
            app.isAnimating = true;
            app.map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000,
                callback: function() {
                    app.isAnimating = false;
                }
            });
        }
    }
}

function initializeMap() {
    // Create base WMTS layer
    const baseLayer = new ol.layer.Tile({
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
            attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
        }),
        opacity: 0.3
    });

    // Create TopoJSON layer for village boundaries
    const villageLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: CONFIG.topoJsonUrl,
            format: new ol.format.TopoJSON(),
            overlaps: false
        }),
        style: styles.default
    });

    // Store vector source and setup routing after features are loaded
    villageLayer.getSource().on('addfeature', function() {
        app.vectorSource = villageLayer.getSource();
    });

    // Wait for features to load before setting up routing
    villageLayer.getSource().on('change', function(e) {
        const source = e.target;
        if (source.getState() === 'ready') {
            app.vectorSource = source;
            setupRouting();
            
            // Handle initial hash if present
            const hash = window.location.hash;
            if (hash) {
                routie.reload();
            }
        }
    });

    // Create map
    app.map = new ol.Map({
        target: 'map',
        layers: [baseLayer, villageLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([120.221507, 23.000694]), // Centered on Tainan
            zoom: 12
        })
    });

    // Create overlay for popup
    app.overlay = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });
    app.map.addOverlay(app.overlay);

    // Add click handler for village boundaries
    app.map.on('singleclick', debounce(function(evt) {
        if (app.isAnimating) return;
        
        const feature = app.map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });

        if (feature) {
            window.location.hash = `#village/${feature.get('VILLCODE')}`;
        } else {
            window.location.hash = '';
        }
    }, 300));

    // Update popup closer to use routing
    document.getElementById('popup-closer').onclick = function() {
        window.location.hash = '';
        return false;
    };
}

// Add routing functions
function setupRouting() {
    routie({
        'village/:villcode': debounce(function(villcode) {
            if (app.isRouting || app.isAnimating) return;
            app.isRouting = true;
            
            const feature = app.vectorSource.getFeatures()
                .find(f => f.get('VILLCODE') === villcode);
            
            if (feature) {
                const geometry = feature.getGeometry();
                const center = geometry.getInteriorPoint().getCoordinates();
                
                highlightFeature(feature);
                showPopup(feature, center);
                
                app.isAnimating = true;
                app.map.getView().animate({
                    center: center,
                    zoom: 14,
                    duration: 1000
                }, function() {
                    app.isAnimating = false;
                });
            }
            app.isRouting = false;
        }, 300),
        
        'school/:code': debounce(function(code) {
            if (app.isRouting || app.isAnimating) return;
            app.isRouting = true;
            
            highlightSchoolDistrict(code);
            app.isRouting = false;
        }, 300),
        
        '': debounce(function() {
            if (app.isRouting || app.isAnimating) return;
            app.isRouting = true;
            
            highlightFeature(null);
            app.selectedDistrict.forEach(f => f.setStyle(styles.default));
            app.selectedDistrict = [];
            app.overlay.setPosition(undefined);
            document.querySelectorAll('.list-group-item').forEach(item => {
                item.classList.remove('active');
            });
            app.isRouting = false;
        }, 300)
    });
}

// Initialize when the window loads
window.onload = initMap;
