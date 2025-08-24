let map;
let geoLayer;
let referendumData = {};
let geoData = null;
let currentMode = 'agree_rate';

// Initialize map
function initMap() {
    map = L.map('map').setView([23.8, 120.9], 9);
    
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '© 國土測繪中心 NLSC'
    }).addTo(map);
    
    // Update layer styles when zoom changes
    map.on('zoomend', function() {
        if (geoLayer) {
            geoLayer.eachLayer(function(layer) {
                layer.setStyle(style(layer.feature));
            });
        }
    });
}

// Load data from URLs
async function loadData() {
    try {
        console.log('Loading referendum data...');
        const referendumResponse = await fetch('https://kiang.github.io/vote2025/referendum_cunli_data.json');
        const referendumDataFull = await referendumResponse.json();
        
        // Store verified totals for statistics
        window.verifiedTotals = referendumDataFull.verified_totals;
        
        // Convert villages array to object for faster lookup
        referendumDataFull.villages.forEach(item => {
            if (item.villcode) {
                referendumData[item.villcode] = item;
            }
        });
        
        console.log('Loading geo data...');
        const geoResponse = await fetch('https://kiang.github.io/taiwan_basecode/cunli/s_geo/20250620.json');
        geoData = await geoResponse.json();
        
        console.log('Data loaded successfully');
        populateCountyFilter();
        visualizeData();
        updateStats();
        
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 
            '<div class="error">載入資料時發生錯誤: ' + error.message + '</div>';
    }
}

// Populate county filter dropdown
function populateCountyFilter() {
    const counties = new Set();
    Object.values(referendumData).forEach(item => {
        counties.add(item.county);
    });
    
    const select = document.getElementById('countyFilter');
    Array.from(counties).sort().forEach(county => {
        const option = document.createElement('option');
        option.value = county;
        option.textContent = county;
        select.appendChild(option);
    });
}

// Get color based on value and mode
function getColor(value, mode) {
    if (value === null || value === undefined) return '#999';
    
    let ranges;
    if (mode === 'agree_rate') {
        // Light blue for agree rates
        ranges = [
            { min: 80, color: '#08519c' },
            { min: 70, color: '#2171b5' },
            { min: 60, color: '#4292c6' },
            { min: 50, color: '#6baed6' },
            { min: 40, color: '#9ecae1' },
            { min: 0, color: '#deebf7' }
        ];
    } else if (mode === 'disagree_rate') {
        // Green for disagree rates
        ranges = [
            { min: 80, color: '#00441b' },
            { min: 70, color: '#238b45' },
            { min: 60, color: '#41ab5d' },
            { min: 50, color: '#74c476' },
            { min: 40, color: '#a1d99b' },
            { min: 0, color: '#e5f5e0' }
        ];
    } else if (mode === 'turnout_rate') {
        // Red for turnout rates
        ranges = [
            { min: 50, color: '#67000d' },
            { min: 40, color: '#a50f15' },
            { min: 30, color: '#cb181d' },
            { min: 20, color: '#fb6a4a' },
            { min: 10, color: '#fc9272' },
            { min: 0, color: '#fee0d2' }
        ];
    } else {
        // Red gradient for total votes
        ranges = [
            { min: 1000, color: '#67000d' },
            { min: 500, color: '#a50f15' },
            { min: 200, color: '#cb181d' },
            { min: 100, color: '#fb6a4a' },
            { min: 50, color: '#fc9272' },
            { min: 0, color: '#fee0d2' }
        ];
    }
    
    for (let range of ranges) {
        if (value >= range.min) {
            return range.color;
        }
    }
    return '#999';
}

// Calculate value based on mode
function getValue(data, mode) {
    if (!data) return null;
    
    switch (mode) {
        case 'agree_rate':
            return data.total_votes.valid > 0 ? 
                (data.total_votes.agree / data.total_votes.valid * 100) : 0;
        case 'disagree_rate':
            return data.total_votes.valid > 0 ? 
                (data.total_votes.disagree / data.total_votes.valid * 100) : 0;
        case 'turnout_rate':
            return data.turnout_rate || 0;
        case 'total_votes':
            return data.total_votes.total || 0;
        default:
            return 0;
    }
}

// Style function for geo features
function style(feature) {
    const villcode = feature.properties.VILLCODE;
    const data = referendumData[villcode];
    const value = getValue(data, currentMode);
    const currentZoom = map ? map.getZoom() : 9;
    
    return {
        fillColor: getColor(value, currentMode),
        weight: currentZoom > 9 ? 0.5 : 0,
        opacity: currentZoom > 9 ? 1 : 0,
        color: '#666',
        fillOpacity: 0.7
    };
}

// Create popup content
function createPopupContent(feature, data) {
    const props = feature.properties;
    const villcode = props.VILLCODE;
    
    if (!data) {
        return `
            <div>
                <h4>${props.COUNTYNAME} ${props.TOWNNAME} ${props.VILLNAME}</h4>
                <p>村里代碼: ${villcode}</p>
                <p style="color: #e74c3c;">無投票資料</p>
            </div>
        `;
    }
    
    const agreeRate = data.total_votes.valid > 0 ? 
        (data.total_votes.agree / data.total_votes.valid * 100).toFixed(1) : '0.0';
    const disagreeRate = data.total_votes.valid > 0 ? 
        (data.total_votes.disagree / data.total_votes.valid * 100).toFixed(1) : '0.0';
    
    return `
        <div>
            <h4>${props.COUNTYNAME} ${props.TOWNNAME} ${props.VILLNAME}</h4>
            <p><strong>村里代碼:</strong> ${villcode}</p>
            <p><strong>投票所數量:</strong> ${data.station_count}</p>
            <hr>
            <p><strong>同意票:</strong> ${data.total_votes.agree.toLocaleString()} 票 (${agreeRate}%)</p>
            <p><strong>不同意票:</strong> ${data.total_votes.disagree.toLocaleString()} 票 (${disagreeRate}%)</p>
            <p><strong>有效票:</strong> ${data.total_votes.valid.toLocaleString()} 票</p>
            <p><strong>無效票:</strong> ${data.total_votes.invalid.toLocaleString()} 票</p>
            <p><strong>總投票數:</strong> ${data.total_votes.total.toLocaleString()} 票</p>
            <p><strong>投票權人數:</strong> ${data.total_eligible_voters.toLocaleString()} 人</p>
            <p><strong>投票率:</strong> ${data.turnout_rate.toFixed(2)}%</p>
        </div>
    `;
}

// Handle feature events
function onEachFeature(feature, layer) {
    const villcode = feature.properties.VILLCODE;
    const data = referendumData[villcode];
    
    layer.bindPopup(createPopupContent(feature, data));
    
    layer.on({
        mouseover: function(e) {
            const layer = e.target;
            layer.setStyle({
                weight: 2,
                color: '#2c3e50',
                fillOpacity: 0.9
            });
            layer.bringToFront();
        },
        mouseout: function(e) {
            geoLayer.resetStyle(e.target);
        }
    });
}

// Visualize data on map
function visualizeData() {
    const selectedCounty = document.getElementById('countyFilter').value;
    
    if (geoLayer) {
        map.removeLayer(geoLayer);
    }
    
    // Filter geo data if county is selected
    let filteredFeatures = geoData.features;
    if (selectedCounty) {
        filteredFeatures = geoData.features.filter(feature => 
            feature.properties.COUNTYNAME === selectedCounty
        );
    }
    
    const filteredGeoData = {
        type: 'FeatureCollection',
        features: filteredFeatures
    };
    
    geoLayer = L.geoJSON(filteredGeoData, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);
    
    // Fit map to filtered data bounds
    if (filteredFeatures.length > 0) {
        map.fitBounds(geoLayer.getBounds());
        // Ensure zoom level is not smaller than 9
        if (map.getZoom() < 9) {
            map.setZoom(9);
        }
    }
    
    updateLegend();
    document.getElementById('loading').style.display = 'none';
}

// Update legend based on current mode
function updateLegend() {
    const legendContent = document.getElementById('legendContent');
    const mode = currentMode;
    
    let legendItems;
    let unit = '';
    
    if (mode === 'agree_rate') {
        unit = '%';
        legendItems = [
            { color: '#08519c', label: '80% 以上' },
            { color: '#2171b5', label: '70-80%' },
            { color: '#4292c6', label: '60-70%' },
            { color: '#6baed6', label: '50-60%' },
            { color: '#9ecae1', label: '40-50%' },
            { color: '#deebf7', label: '40% 以下' }
        ];
    } else if (mode === 'disagree_rate') {
        unit = '%';
        legendItems = [
            { color: '#00441b', label: '80% 以上' },
            { color: '#238b45', label: '70-80%' },
            { color: '#41ab5d', label: '60-70%' },
            { color: '#74c476', label: '50-60%' },
            { color: '#a1d99b', label: '40-50%' },
            { color: '#e5f5e0', label: '40% 以下' }
        ];
    } else if (mode === 'turnout_rate') {
        unit = '%';
        legendItems = [
            { color: '#67000d', label: '50% 以上' },
            { color: '#a50f15', label: '40-50%' },
            { color: '#cb181d', label: '30-40%' },
            { color: '#fb6a4a', label: '20-30%' },
            { color: '#fc9272', label: '10-20%' },
            { color: '#fee0d2', label: '10% 以下' }
        ];
    } else {
        unit = '票';
        legendItems = [
            { color: '#67000d', label: '1000+ 票' },
            { color: '#a50f15', label: '500-1000 票' },
            { color: '#cb181d', label: '200-500 票' },
            { color: '#fb6a4a', label: '100-200 票' },
            { color: '#fc9272', label: '50-100 票' },
            { color: '#fee0d2', label: '50 票以下' }
        ];
    }
    
    legendContent.innerHTML = legendItems.map(item => 
        `<div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color}"></div>
            <span>${item.label}</span>
        </div>`
    ).join('');
}

// Update statistics
function updateStats() {
    const selectedCounty = document.getElementById('countyFilter').value;
    const statsContent = document.getElementById('statsContent');
    
    if (selectedCounty) {
        // For county filtering, calculate from filtered data
        let filteredData = Object.values(referendumData).filter(item => item.county === selectedCounty);
        
        const totalVillages = filteredData.length;
        const totalAgree = filteredData.reduce((sum, item) => sum + item.total_votes.agree, 0);
        const totalDisagree = filteredData.reduce((sum, item) => sum + item.total_votes.disagree, 0);
        const totalValid = filteredData.reduce((sum, item) => sum + item.total_votes.valid, 0);
        const totalVotes = filteredData.reduce((sum, item) => sum + item.total_votes.total, 0);
        const totalEligible = filteredData.reduce((sum, item) => sum + item.total_eligible_voters, 0);
        const totalStations = filteredData.reduce((sum, item) => sum + item.station_count, 0);
        
        const agreeRate = totalValid > 0 ? (totalAgree / totalValid * 100).toFixed(1) : '0.0';
        const disagreeRate = totalValid > 0 ? (totalDisagree / totalValid * 100).toFixed(1) : '0.0';
        const turnoutRate = totalEligible > 0 ? (totalVotes / totalEligible * 100).toFixed(1) : '0.0';
        
        statsContent.innerHTML = `
            <div class="stat-item">
                <span>村里數量 (顯示於地圖):</span>
                <span>${totalVillages.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>投票所數量:</span>
                <span>${Math.round(totalStations).toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>同意票:</span>
                <span>${totalAgree.toLocaleString()} (${agreeRate}%)</span>
            </div>
            <div class="stat-item">
                <span>不同意票:</span>
                <span>${totalDisagree.toLocaleString()} (${disagreeRate}%)</span>
            </div>
            <div class="stat-item">
                <span>有效票:</span>
                <span>${totalValid.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>總投票數:</span>
                <span>${totalVotes.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>投票權人數:</span>
                <span>${totalEligible.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>投票率:</span>
                <span>${turnoutRate}%</span>
            </div>
        `;
    } else {
        // For all Taiwan, use verified totals from raw files
        const verifiedTotals = window.verifiedTotals;
        const totalVillages = Object.keys(referendumData).length;
        
        statsContent.innerHTML = `
            <div class="stat-item">
                <span>同意票:</span>
                <span>${verifiedTotals.agree.toLocaleString()} (${verifiedTotals.agree_rate.toFixed(1)}%)</span>
            </div>
            <div class="stat-item">
                <span>不同意票:</span>
                <span>${verifiedTotals.disagree.toLocaleString()} (${verifiedTotals.disagree_rate.toFixed(1)}%)</span>
            </div>
            <div class="stat-item">
                <span>有效票:</span>
                <span>${verifiedTotals['有效票'].toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>總投票數:</span>
                <span>${verifiedTotals['總投票數'].toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>投票權人數:</span>
                <span>${verifiedTotals['投票權人數'].toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span>投票率:</span>
                <span>${verifiedTotals['投票率']}%</span>
            </div>
        `;
    }
}

// Event listeners
document.getElementById('visualMode').addEventListener('change', function(e) {
    currentMode = e.target.value;
    visualizeData();
});

document.getElementById('countyFilter').addEventListener('change', function(e) {
    visualizeData();
    updateStats();
});

// User location functionality
function findMatchingCunli(lat, lng) {
    if (!geoData) return null;
    
    // Check each cunli to see if the coordinates fall within its boundaries
    for (const feature of geoData.features) {
        if (feature.geometry && feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0];
            if (isPointInPolygon([lng, lat], coords)) {
                return feature;
            }
        } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            for (const polygon of feature.geometry.coordinates) {
                const coords = polygon[0];
                if (isPointInPolygon([lng, lat], coords)) {
                    return feature;
                }
            }
        }
    }
    return null;
}

// Simple point-in-polygon algorithm
function isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// Location button event handler
document.getElementById('locationBtn').addEventListener('click', function() {
    const button = this;
    
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援地理位置功能');
        return;
    }
    
    button.disabled = true;
    button.textContent = '定位中...';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Find matching cunli
            const matchingCunli = findMatchingCunli(lat, lng);
            
            if (matchingCunli) {
                // Create a temporary layer to get bounds
                const tempLayer = L.geoJSON(matchingCunli);
                const bounds = tempLayer.getBounds();
                
                // Fit map to the cunli bounds
                map.fitBounds(bounds, { padding: [20, 20] });
                // Ensure zoom level is not smaller than 9
                if (map.getZoom() < 9) {
                    map.setZoom(9);
                }
                
                // Highlight the cunli
                setTimeout(() => {
                    if (geoLayer) {
                        geoLayer.eachLayer(layer => {
                            if (layer.feature.properties.VILLCODE === matchingCunli.properties.VILLCODE) {
                                layer.openPopup();
                                layer.setStyle({
                                    weight: 3,
                                    color: '#e74c3c',
                                    fillOpacity: 0.9
                                });
                                setTimeout(() => {
                                    geoLayer.resetStyle(layer);
                                }, 3000);
                            }
                        });
                    }
                }, 500);
            } else {
                alert('無法找到對應的村里，可能您不在台灣境內或資料不完整');
            }
            
            button.disabled = false;
            button.textContent = '📍 定位到我的村里';
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
            button.disabled = false;
            button.textContent = '📍 定位到我的村里';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
});

// Sidebar toggle functionality for mobile
document.getElementById('sidebarToggle').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
});

// Close sidebar when clicking on map (mobile only)
document.getElementById('map').addEventListener('click', function() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.remove('open');
    }
});

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadData();
});