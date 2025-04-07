let map;
let clusterSource;
let shelterLayer;
let shelterFeatures = [];
let currentPopup = null;
let currentPopupType = null; // 'list' or 'detail'
let currentPopupFeatures = null; // Store the features for the list view
let userLocation = null;
let userLocationFeature = null;
let userLocationLayer = null;

// Store all features globally
let allFeatures = [];

// Initialize map
function initMap() {
    // Create NLSC EMAP base layer
    const nlscLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}',
            projection: 'EPSG:3857',
            tileGrid: new ol.tilegrid.TileGrid({
                origin: [-20037508.342789244, 20037508.342789244],
                resolutions: [
                    559082264.0287178 * 0.28E-3,
                    279541132.0143589 * 0.28E-3,
                    139770566.00717944 * 0.28E-3,
                    69885283.00358972 * 0.28E-3,
                    34942641.50179486 * 0.28E-3,
                    17471320.75089743 * 0.28E-3,
                    8735660.375448715 * 0.28E-3,
                    4367830.187724357 * 0.28E-3,
                    2183915.0938621787 * 0.28E-3,
                    1091957.5469310893 * 0.28E-3,
                    545978.7734655447 * 0.28E-3,
                    272989.3867327723 * 0.28E-3,
                    136494.69336638616 * 0.28E-3,
                    68247.34668319308 * 0.28E-3,
                    34123.67334159654 * 0.28E-3,
                    17061.83667079827 * 0.28E-3,
                    8530.918335399136 * 0.28E-3,
                    4265.459167699568 * 0.28E-3,
                    2132.729583849784 * 0.28E-3,
                    1066.364791924892 * 0.28E-3,
                    533.182395962446 * 0.28E-3,
                    266.591197981223 * 0.28E-3,
                    133.2955989906115 * 0.28E-3,
                    66.64779949530575 * 0.28E-3
                ]
            })
        })
    });

    map = new ol.Map({
        target: 'map',
        layers: [nlscLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([121.5, 23.5]),
            zoom: 7
        }),
        controls: ol.control.defaults.defaults().extend([
            new ol.control.FullScreen(),
            new ol.control.ScaleLine()
        ])
    });

    // Create cluster source
    clusterSource = new ol.source.Cluster({
        distance: 40,
        source: new ol.source.Vector()
    });

    // Create cluster layer
    shelterLayer = new ol.layer.Vector({
        source: clusterSource,
        style: function(feature) {
            const size = feature.get('features').length;
            const radius = 10 + Math.min(size, 20);
            
            // Create a static style for clusters
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius,
                    fill: new ol.style.Fill({
                        color: 'rgba(13, 110, 253, 0.8)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#fff',
                        width: 2
                    })
                }),
                text: new ol.style.Text({
                    text: size.toString(),
                    fill: new ol.style.Fill({
                        color: '#fff'
                    }),
                    font: 'bold ' + Math.min(14 + Math.min(size, 10), 20) + 'px Arial'
                })
            });
        }
    });

    map.addLayer(shelterLayer);

    // Create user location layer
    userLocationLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        zIndex: 1000 // Ensure it's above other layers
    });
    map.addLayer(userLocationLayer);

    // Add click handler for clusters
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });

        if (feature) {
            const features = feature.get('features');
            if (features.length === 1) {
                // Single shelter
                const shelter = features[0];
                showPopup(shelter, evt.coordinate);
            } else if (features.length > 1) {
                // Multiple shelters at the same location
                showMultipleSheltersPopup(features, evt.coordinate);
            } else {
                // Cluster
                map.getView().setCenter(feature.getGeometry().getCoordinates());
                map.getView().setZoom(map.getView().getZoom() + 2);
            }
        }
    });
    
    // Request user location on map initialization
    requestUserLocation();
}

// Request user location
function requestUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                // Store user location
                userLocation = [position.coords.longitude, position.coords.latitude];
                
                // Update user location marker
                updateUserLocationMarker();
                
                // Center map on user location
                centerMapOnUserLocation();
            },
            function(error) {
                console.warn("Geolocation error:", error.message);
                // Continue with default center if geolocation fails
            }
        );
    }
}

// Update user location marker
function updateUserLocationMarker() {
    if (!userLocation) return;
    
    // Create a canvas for the location icon
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    // Draw a white circle background
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#0d6efd';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw the location arrow icon
    ctx.fillStyle = '#0d6efd';
    ctx.beginPath();
    ctx.moveTo(20, 8);
    ctx.lineTo(16, 16);
    ctx.lineTo(12, 16);
    ctx.lineTo(20, 28);
    ctx.lineTo(28, 16);
    ctx.lineTo(24, 16);
    ctx.closePath();
    ctx.fill();
    
    // Create or update the user location feature
    const userCoord = ol.proj.fromLonLat(userLocation);
    
    if (!userLocationFeature) {
        userLocationFeature = new ol.Feature({
            geometry: new ol.geom.Point(userCoord)
        });
        userLocationLayer.getSource().addFeature(userLocationFeature);
    } else {
        userLocationFeature.getGeometry().setCoordinates(userCoord);
    }
    
    // Set the style for the user location feature
    userLocationFeature.setStyle(new ol.style.Style({
        image: new ol.style.Icon({
            src: canvas.toDataURL(),
            anchor: [0.5, 0.5],
            scale: 1
        })
    }));
}

// Center map on user location
function centerMapOnUserLocation() {
    if (userLocation) {
        const userCoord = ol.proj.fromLonLat(userLocation);
        map.getView().animate({
            center: userCoord,
            zoom: 14,
            duration: 1000
        });
    }
}

// Load shelter data
function loadShelterData() {
    fetch('json/points.json')
        .then(response => response.json())
        .then(data => {
            // Create features from GeoJSON
            allFeatures = new ol.format.GeoJSON().readFeatures(data, {
                featureProjection: 'EPSG:3857'
            });

            // Log properties of a few features to understand their structure
            console.log('Sample feature properties:');
            for (let i = 0; i < Math.min(3, allFeatures.length); i++) {
                const props = allFeatures[i].getProperties();
                console.log(`Feature ${i}:`, props);
            }

            // Add features to source
            clusterSource.getSource().addFeatures(allFeatures);

            // Populate disaster types dropdown
            populateDisasterTypes(data.features);
        })
        .catch(error => console.error('Error loading shelter data:', error));
}

// Populate disaster types dropdown
function populateDisasterTypes(features) {
    const disasterTypes = new Set();
    
    features.forEach(feature => {
        if (feature.properties.disaster_types) {
            const types = feature.properties.disaster_types.split(',');
            types.forEach(type => disasterTypes.add(type.trim()));
        }
    });
    
    const disasterTypeSelect = document.getElementById('disasterType');
    
    Array.from(disasterTypes).sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        disasterTypeSelect.appendChild(option);
    });
}

// Update shelter layer based on filters
function updateShelterLayer() {
    // Get filter values
    const disasterType = document.getElementById('disasterType').value;
    const indoor = document.getElementById('indoor').checked;
    const outdoor = document.getElementById('outdoor').checked;
    const weakSuitable = document.getElementById('weakSuitable').checked;
    
    console.log('Filter values:', { disasterType, indoor, outdoor, weakSuitable });
    
    // Check if all shelter type filters are unchecked
    if (!indoor && !outdoor && !weakSuitable) {
        // If all shelter types are unchecked, show no points
        shelterLayer.setVisible(false);
        return;
    }
    
    // Otherwise, show the layer
    shelterLayer.setVisible(true);
    
    // Create a new source with filtered features
    const filteredFeatures = allFeatures.filter(feature => {
        // Get properties directly from the feature
        const props = feature.getProperties();
        
        // Check if feature matches disaster type filter
        let matchesDisasterType = true;
        if (disasterType) {
            // Get the disaster types string
            const disasterTypesStr = props.disaster_types || '';
            
            // Check if the selected disaster type is included in the string
            matchesDisasterType = disasterTypesStr.includes(disasterType);
        }
        
        // Check if feature matches shelter type filters
        // If a filter is checked, the feature must have that property set to true
        const isIndoor = props.indoor === true || props.indoor === 'true';
        const isOutdoor = props.outdoor === true || props.outdoor === 'true';
        const isWeakSuitable = props.weak_suitable === true || props.weak_suitable === 'true';
        
        // A feature must match at least one of the checked shelter types
        const matchesShelterType = 
            (!indoor || isIndoor) && 
            (!outdoor || isOutdoor) && 
            (!weakSuitable || isWeakSuitable);
        
        // Return true if the feature matches all criteria
        return matchesDisasterType && matchesShelterType;
    });
    
    console.log('Filtered features count:', filteredFeatures.length);
    
    // Replace the source with a new one containing only filtered features
    const newSource = new ol.source.Vector({
        features: filteredFeatures
    });
    
    // Update the cluster source
    clusterSource.setSource(newSource);
}

// Show popup for shelter
function showPopup(feature, coordinate) {
    // Remove any existing popup
    if (currentPopup) {
        map.removeOverlay(currentPopup);
    }

    currentPopupType = 'detail';
    currentPopupFeatures = null;

    // Check if feature exists
    if (!feature) {
        console.warn('Invalid feature in showPopup');
        return;
    }

    // Get properties directly from the feature
    const properties = feature.getProperties();
    
    // Get coordinates from geometry
    const geom = feature.getGeometry();
    if (!geom) {
        console.warn('Feature has no geometry in showPopup');
        return;
    }
    
    const coords = ol.proj.transform(geom.getCoordinates(), 'EPSG:3857', 'EPSG:4326');
    const lon = coords[0].toFixed(6);
    const lat = coords[1].toFixed(6);
    
    // Ensure required properties exist with fallbacks
    const name = properties.name || '未命名 | Unnamed';
    const address = properties.address || '無地址 | No address';
    const capacity = properties.capacity || '未知 | Unknown';
    const villageCapacity = properties.village_capacity || '未知 | Unknown';
    const disasterTypes = properties.disaster_types || '未知 | Unknown';
    const managerName = properties.manager_name || '未知 | Unknown';
    const managerPhone = properties.manager_phone || '未知 | Unknown';
    const indoor = properties.indoor ? '室內 | Indoor ' : '';
    const outdoor = properties.outdoor ? '室外 | Outdoor ' : '';
    const weakSuitable = properties.weak_suitable ? '適合避難弱者 | Suitable for Vulnerable People' : '';
    
    const content = `
        <div class="popup-content">
            <h5>${name}</h5>
            <p><strong>地址 | Address：</strong>${address}</p>
            <p><strong>收容人數 | Capacity：</strong>${capacity}人</p>
            <p><strong>收容村里 | Village Capacity：</strong>${villageCapacity}</p>
            <p><strong>災害類型 | Disaster Types：</strong>${disasterTypes}</p>
            <p><strong>管理人 | Manager：</strong>${managerName}</p>
            <p><strong>聯絡電話 | Contact：</strong>${managerPhone}</p>
            <p>
                <strong>收容類型 | Shelter Types：</strong>
                ${indoor}
                ${outdoor}
                ${weakSuitable}
            </p>
            <div class="navigation-buttons">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" class="btn btn-sm google-maps-btn">
                    <i class="fab fa-google"></i> Google Maps
                </a>
                <a href="https://www.bing.com/maps/directions?rtp=~pos.${lat}_${lon}" target="_blank" class="btn btn-sm bing-maps-btn">
                    <i class="fab fa-microsoft"></i> Bing Maps
                </a>
                <a href="https://wego.here.com/directions/drive/mylocation/${lat},${lon}" target="_blank" class="btn btn-sm here-maps-btn">
                    <i class="fas fa-map-marked-alt"></i> HERE Maps
                </a>
            </div>
        </div>
    `;

    const popup = new ol.Overlay({
        element: document.createElement('div'),
        position: coordinate,
        positioning: 'top-center',
        offset: [0, 10]
    });

    popup.getElement().className = 'ol-popup';
    popup.getElement().innerHTML = content;
    map.addOverlay(popup);
    currentPopup = popup;

    // Remove popup when clicking elsewhere
    map.once('click', function() {
        map.removeOverlay(popup);
        currentPopup = null;
        currentPopupType = null;
    });
}

// Show detailed popup for a specific shelter
function showDetailedPopup(feature, coordinate) {
    // Remove any existing popup
    if (currentPopup) {
        map.removeOverlay(currentPopup);
    }

    currentPopupType = 'detail';

    // Check if feature exists
    if (!feature) {
        console.warn('Invalid feature in showDetailedPopup');
        return;
    }

    // Get properties directly from the feature
    const properties = feature.getProperties();
    
    // Get coordinates from geometry
    const geom = feature.getGeometry();
    if (!geom) {
        console.warn('Feature has no geometry in showDetailedPopup');
        return;
    }
    
    const coords = ol.proj.transform(geom.getCoordinates(), 'EPSG:3857', 'EPSG:4326');
    const lon = coords[0].toFixed(6);
    const lat = coords[1].toFixed(6);
    
    // Ensure required properties exist with fallbacks
    const name = properties.name || '未命名 | Unnamed';
    const address = properties.address || '無地址 | No address';
    const capacity = properties.capacity || '未知 | Unknown';
    const villageCapacity = properties.village_capacity || '未知 | Unknown';
    const disasterTypes = properties.disaster_types || '未知 | Unknown';
    const managerName = properties.manager_name || '未知 | Unknown';
    const managerPhone = properties.manager_phone || '未知 | Unknown';
    const indoor = properties.indoor ? '室內 | Indoor ' : '';
    const outdoor = properties.outdoor ? '室外 | Outdoor ' : '';
    const weakSuitable = properties.weak_suitable ? '適合避難弱者 | Suitable for Vulnerable People' : '';
    
    const content = `
        <div class="popup-content">
            <h5>${name}</h5>
            <p><strong>地址 | Address：</strong>${address}</p>
            <p><strong>收容人數 | Capacity：</strong>${capacity}人</p>
            <p><strong>收容村里 | Village Capacity：</strong>${villageCapacity}</p>
            <p><strong>災害類型 | Disaster Types：</strong>${disasterTypes}</p>
            <p><strong>管理人 | Manager：</strong>${managerName}</p>
            <p><strong>聯絡電話 | Contact：</strong>${managerPhone}</p>
            <p>
                <strong>收容類型 | Shelter Types：</strong>
                ${indoor}
                ${outdoor}
                ${weakSuitable}
            </p>
            <div class="navigation-buttons">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" class="btn btn-sm google-maps-btn">
                    <i class="fab fa-google"></i> Google Maps
                </a>
                <a href="https://www.bing.com/maps/directions?rtp=~pos.${lat}_${lon}" target="_blank" class="btn btn-sm bing-maps-btn">
                    <i class="fab fa-microsoft"></i> Bing Maps
                </a>
                <a href="https://wego.here.com/directions/drive/mylocation/${lat},${lon}" target="_blank" class="btn btn-sm here-maps-btn">
                    <i class="fas fa-map-marked-alt"></i> HERE Maps
                </a>
            </div>
            ${currentPopupFeatures ? '<button class="btn btn-sm btn-outline-secondary mt-2" id="back-to-list"><i class="fas fa-arrow-left"></i> 返回列表 | Back to List</button>' : ''}
        </div>
    `;

    const popup = new ol.Overlay({
        element: document.createElement('div'),
        position: coordinate,
        positioning: 'top-center',
        offset: [0, 10]
    });

    popup.getElement().className = 'ol-popup';
    popup.getElement().innerHTML = content;
    map.addOverlay(popup);
    currentPopup = popup;

    // Add event listener for the back button if it exists
    setTimeout(() => {
        const backButton = document.getElementById('back-to-list');
        if (backButton && currentPopupFeatures) {
            backButton.addEventListener('click', () => {
                showMultipleSheltersPopup(currentPopupFeatures, coordinate);
            });
        }
    }, 0);

    // Remove popup when clicking elsewhere
    map.once('click', function() {
        map.removeOverlay(popup);
        currentPopup = null;
        currentPopupType = null;
    });
}

// Show popup for multiple shelters
function showMultipleSheltersPopup(features, coordinate) {
    // Remove any existing popup
    if (currentPopup) {
        map.removeOverlay(currentPopup);
    }

    // Store the features for later use
    currentPopupFeatures = features;
    currentPopupType = 'list';

    // Create content for multiple shelters
    let content = '<div class="multiple-shelters-popup">';
    content += '<h5>多個避難收容處所 | Multiple Shelters</h5>';
    content += '<div class="shelter-list">';
    
    features.forEach((feature, index) => {
        // Check if feature exists
        if (!feature) {
            console.warn('Invalid feature at index', index);
            return; // Skip this feature
        }
        
        // Get properties directly from the feature
        const props = feature.getProperties();
        
        // Get coordinates from geometry
        const geom = feature.getGeometry();
        if (!geom) {
            console.warn('Feature at index', index, 'has no geometry');
            return; // Skip this feature
        }
        
        const coords = ol.proj.transform(geom.getCoordinates(), 'EPSG:3857', 'EPSG:4326');
        const lon = coords[0].toFixed(6);
        const lat = coords[1].toFixed(6);
        
        // Ensure required properties exist
        const name = props.name || '未命名 | Unnamed';
        const address = props.address || '無地址 | No address';
        
        content += `<div class="shelter-item" data-index="${index}">
            <strong>${name}</strong>
            <p>${address}</p>
            <div class="navigation-buttons">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" class="btn btn-sm google-maps-btn">
                    <i class="fab fa-google"></i> Google Maps
                </a>
                <a href="https://www.bing.com/maps/directions?rtp=~pos.${lat}_${lon}" target="_blank" class="btn btn-sm bing-maps-btn">
                    <i class="fab fa-microsoft"></i> Bing Maps
                </a>
                <a href="https://wego.here.com/directions/drive/mylocation/${lat},${lon}" target="_blank" class="btn btn-sm here-maps-btn">
                    <i class="fas fa-map-marked-alt"></i> HERE Maps
                </a>
            </div>
        </div>`;
    });
    
    content += '</div>';
    content += '</div>';

    // Create popup
    const popup = new ol.Overlay({
        element: document.createElement('div'),
        position: coordinate,
        positioning: 'top-center',
        offset: [0, 10]
    });

    popup.getElement().className = 'ol-popup multiple-shelters';
    popup.getElement().innerHTML = content;
    map.addOverlay(popup);
    currentPopup = popup;

    // Add click handlers to shelter items
    setTimeout(() => {
        const shelterItems = document.querySelectorAll('.shelter-item');
        shelterItems.forEach((item, index) => {
            item.addEventListener('click', (e) => {
                // Prevent navigation buttons from triggering the item click
                if (!e.target.closest('.navigation-buttons')) {
                    // Hide the list popup before showing the detail popup
                    map.removeOverlay(popup);
                    showDetailedPopup(features[index], coordinate);
                }
            });
        });
    }, 0);

    // Remove popup when clicking elsewhere
    map.once('click', function() {
        map.removeOverlay(popup);
        currentPopup = null;
        currentPopupType = null;
        currentPopupFeatures = null;
    });
}

// Handle window resize
function handleResize() {
    if (map) {
        map.updateSize();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadShelterData();
    
    // Add event listeners for filters
    document.getElementById('disasterType').addEventListener('change', function() {
        console.log('Disaster type changed');
        updateShelterLayer();
    });
    
    // Add event listeners for shelter type checkboxes
    document.getElementById('indoor').addEventListener('change', function() {
        console.log('Indoor checkbox changed:', this.checked);
        updateShelterLayer();
    });
    
    document.getElementById('outdoor').addEventListener('change', function() {
        console.log('Outdoor checkbox changed:', this.checked);
        updateShelterLayer();
    });
    
    document.getElementById('weakSuitable').addEventListener('change', function() {
        console.log('Weak suitable checkbox changed:', this.checked);
        updateShelterLayer();
    });
    
    // Add event listener for geolocation button
    document.getElementById('geolocation-btn').addEventListener('click', function() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    // Update user location
                    userLocation = [position.coords.longitude, position.coords.latitude];
                    
                    // Update user location marker
                    updateUserLocationMarker();
                    
                    // Center map on user location
                    centerMapOnUserLocation();
                },
                function(error) {
                    console.warn("Geolocation error:", error.message);
                    alert("無法取得您的位置，請確認您已允許瀏覽器存取位置資訊。\nUnable to get your location. Please make sure you've allowed location access in your browser.");
                }
            );
        } else {
            alert("您的瀏覽器不支援地理定位功能。\nYour browser does not support geolocation.");
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
}); 