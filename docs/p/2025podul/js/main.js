const map = L.map('map').setView([23.000694, 120.221507], 12);

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '地圖資料 © 國土測繪中心',
    maxZoom: 19
}).addTo(map);

let townLayer = null;
let clickedPoint = null;
let markersLayer = null;
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgqoP2qnWbKlStGlvFYVYIgAkZBTFKwC0FyqTKUOySCTSwq6_8bPzVL16ve6eIyXXhIDUR-Yz9UOdL/pub?output=csv';

const townStyle = {
    color: '#3388ff',
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.1,
    fillColor: '#ffffff'
};

const highlightStyle = {
    color: '#ff7800',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.2,
    fillColor: '#ffff00'
};

async function loadTownBoundaries() {
    try {
        const response = await fetch('https://kiang.github.io/taiwan_basecode/city/topo/20230317.json');
        const topoData = await response.json();
        
        const geoData = topojson.feature(topoData, topoData.objects['20230317']);
        
        townLayer = L.geoJSON(geoData, {
            style: townStyle,
            onEachFeature: function(feature, layer) {
                layer.on({
                    mouseover: function(e) {
                        const layer = e.target;
                        layer.setStyle(highlightStyle);
                        layer.bringToFront();
                    },
                    mouseout: function(e) {
                        townLayer.resetStyle(e.target);
                    }
                });
            }
        }).addTo(map);
        
    } catch (error) {
        console.error('Error loading town boundaries:', error);
    }
}

function getTownInfo(latlng) {
    if (!townLayer) return { county: '', town: '' };
    
    let foundCounty = '';
    let foundTown = '';
    
    townLayer.eachLayer(function(layer) {
        if (layer.feature && layer.feature.geometry) {
            const bounds = layer.getBounds();
            if (bounds.contains(latlng)) {
                const point = turf.point([latlng.lng, latlng.lat]);
                const polygon = layer.feature;
                
                if (turf.booleanPointInPolygon(point, polygon)) {
                    foundCounty = layer.feature.properties.COUNTYNAME || '';
                    foundTown = layer.feature.properties.TOWNNAME || '';
                }
            }
        }
    });
    
    return { county: foundCounty, town: foundTown };
}

function createPopupContent(latlng, countyName, townName) {
    const lat = latlng.lat.toFixed(6);
    const lng = latlng.lng.toFixed(6);
    
    const content = `
        <div class="popup-content">
            <div class="info-row">
                <span class="info-label">縣市：</span>${countyName || '未知'}
            </div>
            <div class="info-row">
                <span class="info-label">鄉鎮區：</span>${townName || '未知'}
            </div>
            <div class="info-row">
                <span class="info-label">經度：</span>${lng}
            </div>
            <div class="info-row">
                <span class="info-label">緯度：</span>${lat}
            </div>
            <button class="btn btn-primary btn-sm report-btn" onclick="openGoogleForm('${countyName}', '${townName}', '${lng}', '${lat}', '${Date.now()}')">
                回報
            </button>
            <div class="navigation-buttons">
                <small style="color: #666; display: block; margin-bottom: 5px;">導航到此位置:</small>
                <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="nav-btn google">Google地圖</a>
                <a href="https://www.bing.com/maps?cp=${lat}~${lng}&lvl=16" target="_blank" class="nav-btn bing">Bing地圖</a>
                <a href="https://wego.here.com/?map=${lat},${lng},16" target="_blank" class="nav-btn here">HERE地圖</a>
            </div>
        </div>
    `;
    
    return content;
}

window.openGoogleForm = function(county, town, longitude, latitude, id) {
    const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSd09-3OLaEqEvPqdu58jnarwK4cqUBxrzRibhT1WRc4oUlupw/viewform';
    const params = new URLSearchParams({
        'usp': 'pp_url',
        'entry.1683067847': '',
        'entry.1608282544': '',
        'entry.647359499': '',
        'entry.8069441': county || '',
        'entry.329095753': town || '',
        'entry.878731854': longitude,
        'entry.158869420': latitude,
        'entry.1072963415': id
    });
    
    window.open(`${formUrl}?${params.toString()}`, '_blank');
};

map.on('click', function(e) {
    if (clickedPoint) {
        map.removeLayer(clickedPoint);
    }
    
    const townInfo = getTownInfo(e.latlng);
    const popupContent = createPopupContent(e.latlng, townInfo.county, townInfo.town);
    
    clickedPoint = L.marker(e.latlng)
        .addTo(map)
        .bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        })
        .openPopup();
});

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            // Handle CSV with potential commas in values
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].replace(/"/g, '').trim() : '';
            });
            data.push(row);
        }
    }
    return data;
}

async function loadReports() {
    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        
        console.log('CSV Response first 500 chars:', csvText.substring(0, 500)); // Debug log
        
        const reports = parseCSV(csvText);
        console.log('Total parsed reports:', reports.length);
        
        // Log the headers and first few rows for debugging
        if (reports.length > 0) {
            console.log('Column headers found:', Object.keys(reports[0]));
            console.log('First report data:', reports[0]);
            if (reports.length > 1) {
                console.log('Second report data:', reports[1]);
            }
        }
        
        if (markersLayer) {
            map.removeLayer(markersLayer);
        }
        
        markersLayer = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        
        let validReports = 0;
        reports.forEach((report, index) => {
            // Use the exact column names from the CSV
            const lat = parseFloat(report['緯度(系統自動填入，不用理會或調整)']);
            const lng = parseFloat(report['經度(系統自動填入，不用理會或調整)']);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                validReports++;
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'report-marker',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                });
                
                // Get all values from the report
                const timestamp = report['時間戳記'] || '';
                const county = report['縣市(系統自動填入，不用理會或調整)'] || '';
                const town = report['鄉鎮市區(系統自動填入，不用理會或調整)'] || '';
                const description = report['災情簡述'] || '';
                const needHelp = report['是否需要協助？'] || '';
                const contact = report['地方聯絡窗口'] || '';
                const photo = report['照片'] || '';
                const locationId = report['地點編號(系統自動填入，不用理會或調整)'] || '';
                
                // Extract Google Drive file ID from URL
                let photoEmbed = '';
                if (photo) {
                    const match = photo.match(/[-\w]{25,}/);
                    if (match) {
                        const fileId = match[0];
                        photoEmbed = `<iframe src="https://drive.google.com/file/d/${fileId}/preview" width="100%" height="200" allow="autoplay"></iframe>`;
                    }
                }
                
                const popupContent = `
                    <div class="popup-content">
                        ${photoEmbed ? `<div class="photo-container">${photoEmbed}</div>` : ''}
                        <table class="report-table">
                            <tbody>
                                <tr>
                                    <td>時間</td>
                                    <td>${timestamp || '(無資料)'}</td>
                                </tr>
                                <tr>
                                    <td>縣市</td>
                                    <td>${county || '(無資料)'}</td>
                                </tr>
                                <tr>
                                    <td>鄉鎮區</td>
                                    <td>${town || '(無資料)'}</td>
                                </tr>
                                <tr>
                                    <td>經度</td>
                                    <td>${lng.toFixed(6)}</td>
                                </tr>
                                <tr>
                                    <td>緯度</td>
                                    <td>${lat.toFixed(6)}</td>
                                </tr>
                                <tr>
                                    <td>災情簡述</td>
                                    <td>${description || '(無資料)'}</td>
                                </tr>
                                <tr>
                                    <td>需要協助</td>
                                    <td>${needHelp || '(無資料)'}</td>
                                </tr>
                                <tr>
                                    <td>聯絡窗口</td>
                                    <td>${contact || '(無資料)'}</td>
                                </tr>
                                <tr>
                                    <td>地點編號</td>
                                    <td>${locationId || '(無資料)'}</td>
                                </tr>
                                ${photo && !photoEmbed ? `<tr>
                                    <td>照片連結</td>
                                    <td><a href="${photo}" target="_blank" class="btn btn-sm btn-primary">查看照片</a></td>
                                </tr>` : ''}
                            </tbody>
                        </table>
                        <div class="navigation-buttons">
                            <small style="color: #666; display: block; margin-bottom: 5px;">導航到此位置:</small>
                            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="nav-btn google">Google地圖</a>
                            <a href="https://www.bing.com/maps?cp=${lat}~${lng}&lvl=16" target="_blank" class="nav-btn bing">Bing地圖</a>
                            <a href="https://wego.here.com/?map=${lat},${lng},16" target="_blank" class="nav-btn here">HERE地圖</a>
                        </div>
                    </div>
                `;
                
                marker.bindPopup(popupContent);
                
                // Store location ID on marker for hash navigation
                marker.locationId = locationId;
                
                // Add click handler to update URL hash
                marker.on('click', function() {
                    if (locationId) {
                        window.history.replaceState(null, null, '#' + locationId);
                    }
                });
                
                markersLayer.addLayer(marker);
            } else if (index < 5) {
                console.log(`Invalid coordinates for row ${index}:`, report);
            }
        });
        
        console.log(`Added ${validReports} valid reports out of ${reports.length} total`);
        
        if (validReports > 0) {
            map.addLayer(markersLayer);
            
            // Check for URL hash and trigger marker click after markers are loaded
            setTimeout(function() {
                checkHashAndTriggerClick();
            }, 100);
        }
        
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

loadTownBoundaries();
loadReports();

setInterval(loadReports, 60000);

// Scripts are now loaded in index.html before main.js

const locationBtn = document.getElementById('locationBtn');
let userLocationMarker = null;
let searchCoordsMarker = null; // For marker from modal search

// Modal elements
const searchCoordsBtn = document.getElementById('searchCoordsBtn');
const searchCoordsModal = new bootstrap.Modal(document.getElementById('searchCoordsModal'));
const coordinatesInput = document.getElementById('coordinatesInput');
const locateCoordsBtn = document.getElementById('locateCoordsBtn');
const useCurrentLocationModalBtn = document.getElementById('useCurrentLocationModalBtn');

// Event listener for the main search button to open modal
searchCoordsBtn.addEventListener('click', function() {
    searchCoordsModal.show();
});

// Event listener for "Locate" button in modal
locateCoordsBtn.addEventListener('click', function() {
    const coordsValue = coordinatesInput.value.trim();
    const coordsParts = coordsValue.split(',');
    
    if (coordsParts.length !== 2) {
        alert('請輸入正確格式：緯度,經度\n例如：23.000694,120.221507');
        return;
    }
    
    const lat = parseFloat(coordsParts[0].trim());
    const lng = parseFloat(coordsParts[1].trim());

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('請輸入有效的經緯度值。\n緯度範圍: -90 到 90\n經度範圍: -180 到 180');
        return;
    }

    const latlng = L.latLng(lat, lng);
    map.setView(latlng, 16);

    if (searchCoordsMarker) {
        map.removeLayer(searchCoordsMarker);
    }
    searchCoordsMarker = L.marker(latlng, {
        icon: L.divIcon({
            html: '<div style="background-color: #FFD700; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            className: 'search-coords-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        })
    }).addTo(map);

    // Simulate a click on the map to open the reporting popup
    setTimeout(() => {
        map.fire('click', {
            latlng: latlng,
            layerPoint: map.latLngToLayerPoint(latlng),
            containerPoint: map.latLngToContainerPoint(latlng)
        });
    }, 100);


    searchCoordsModal.hide();
});

// Event listener for "Use My Current Location" button in modal
useCurrentLocationModalBtn.addEventListener('click', function() {
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援地理位置功能');
        return;
    }

    useCurrentLocationModalBtn.disabled = true;
    useCurrentLocationModalBtn.textContent = '取得中...';

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            coordinatesInput.value = `${lat},${lng}`;
            useCurrentLocationModalBtn.disabled = false;
            useCurrentLocationModalBtn.textContent = '取得目前位置';
        },
        function(error) {
            let errorMsg = '無法取得您的位置：';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg += '您拒絕了位置存取權限';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg += '無法取得位置資訊';
                    break;
                case error.TIMEOUT:
                    errorMsg += '請求超時';
                    break;
                default:
                    errorMsg += '未知錯誤';
            }
            alert(errorMsg);
            useCurrentLocationModalBtn.disabled = false;
            useCurrentLocationModalBtn.textContent = '取得目前位置';
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
});


locationBtn.addEventListener('click', function() {
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援地理位置功能');
        return;
    }
    
    locationBtn.classList.add('active');
    locationBtn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const latlng = L.latLng(lat, lng);
            
            if (userLocationMarker) {
                map.removeLayer(userLocationMarker);
            }
            
            userLocationMarker = L.marker(latlng, {
                icon: L.divIcon({
                    html: '<div style="background-color: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                    className: 'user-location-marker',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                })
            }).addTo(map);
            
            map.setView(latlng, 16);
            
            setTimeout(() => {
                map.fire('click', {
                    latlng: latlng,
                    layerPoint: map.latLngToLayerPoint(latlng),
                    containerPoint: map.latLngToContainerPoint(latlng)
                });
            }, 500);
            
            locationBtn.classList.remove('active');
            locationBtn.disabled = false;
        },
        function(error) {
            let errorMsg = '無法取得您的位置：';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg += '您拒絕了位置存取權限';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg += '無法取得位置資訊';
                    break;
                case error.TIMEOUT:
                    errorMsg += '請求超時';
                    break;
                default:
                    errorMsg += '未知錯誤';
            }
            alert(errorMsg);
            locationBtn.classList.remove('active');
            locationBtn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
});

// Hash-based navigation to trigger marker clicks
function checkHashAndTriggerClick() {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const locationId = hash.substring(1); // Remove # from hash
        triggerMarkerClick(locationId);
    }
}

// Function to trigger click on a marker by location ID
function triggerMarkerClick(locationId) {
    // Wait for markers layer to be loaded
    if (!markersLayer || !markersLayer.getLayers || markersLayer.getLayers().length === 0) {
        // Try again after a short delay if markers not ready
        setTimeout(function() {
            triggerMarkerClick(locationId);
        }, 100);
        return;
    }
    
    // Find the marker with matching location ID
    let targetMarker = null;
    markersLayer.eachLayer(function(layer) {
        if (layer.locationId === locationId) {
            targetMarker = layer;
            return false; // Break out of eachLayer
        }
    });
    
    if (targetMarker) {
        // Check if marker is currently visible (not clustered)
        const visibleLayers = markersLayer.getVisibleParent(targetMarker);
        
        if (visibleLayers === targetMarker) {
            // Marker is visible, can click directly
            const markerLatLng = targetMarker.getLatLng();
            map.setView(markerLatLng, 16, {
                animate: true,
                duration: 1.0
            });
            
            setTimeout(function() {
                targetMarker.openPopup();
                // Update hash
                window.history.replaceState(null, null, '#' + locationId);
            }, 500);
        } else {
            // Marker is clustered, need to zoom to show it
            markersLayer.zoomToShowLayer(targetMarker, function() {
                // After zooming to show the layer, center on it and open popup
                const markerLatLng = targetMarker.getLatLng();
                map.setView(markerLatLng, map.getZoom(), {
                    animate: true,
                    duration: 0.5
                });
                
                setTimeout(function() {
                    targetMarker.openPopup();
                    // Update hash
                    window.history.replaceState(null, null, '#' + locationId);
                }, 200);
            });
        }
    } else {
        console.log('Marker with location ID not found:', locationId);
    }
}

// Listen for hash changes
window.addEventListener('hashchange', checkHashAndTriggerClick);

// No need for separate initialization - hash checking is now done directly in loadReports