// Load tariff data from JSON file
let tariffData = {};
let countryData = [];
let viewMode = 'current'; // 'current' or 'change'
let markersLayer;

// Initialize the map
const map = L.map('map').setView([20, 0], 2);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Function to get color based on tariff rate
function getTariffColor(rate) {
    if (rate >= 50) return '#4B0000';      // Very dark red for extreme (50%+)
    if (rate >= 40) return '#8B0000';      // Dark red for very high (40-49%)
    if (rate >= 30) return '#DC143C';      // Crimson for high (30-39%)
    if (rate >= 20) return '#FF4500';      // Orange red for medium-high (20-29%)
    if (rate >= 15) return '#FFA500';      // Orange for medium (15-19%)
    if (rate >= 10) return '#FFD700';      // Gold for low-medium (10-14%)
    return '#90EE90';                      // Light green for low (0-9%)
}

// Function to get color based on change
function getChangeColor(change) {
    if (change === null || change === 'Variable') return '#999999'; // Gray for unknown/variable
    if (change < -10) return '#006400';     // Dark green for big decrease
    if (change < -5) return '#228B22';      // Forest green for moderate decrease
    if (change < 0) return '#90EE90';       // Light green for small decrease
    if (change === 0) return '#FFD700';     // Gold for no change
    if (change < 5) return '#FFA500';       // Orange for small increase
    if (change < 10) return '#FF4500';      // Orange red for moderate increase
    return '#8B0000';                       // Dark red for big increase
}

// Function to create custom marker
function createTariffMarker(countryInfo) {
    const rate = countryInfo.tariff_rate;
    const change = countryInfo.change;
    let displayValue, color;
    
    if (viewMode === 'current') {
        displayValue = typeof rate === 'number' ? rate + '%' : (countryInfo.name === 'European Union' ? '0-15%' : 'VAR');
        color = getTariffColor(typeof rate === 'number' ? rate : 15);
    } else {
        // Change view
        if (countryInfo.type === 'special') {
            displayValue = 'SPEC';
            color = '#8A2BE2'; // Blue violet for special case
        } else if (countryInfo.type === 'removed') {
            displayValue = 'REM';
            color = '#006400'; // Dark green for removed
        } else if (change === null) {
            displayValue = 'NEW';
            color = '#FF1493'; // Deep pink for new
        } else if (change === 'Variable') {
            displayValue = 'VAR';
            color = '#999999';
        } else {
            displayValue = (change >= 0 ? '+' : '') + change + '%';
            color = getChangeColor(change);
        }
    }
    
    // Create a custom div icon
    const icon = L.divIcon({
        className: 'tariff-marker',
        html: `<div style="
            background-color: ${color};
            border: 3px solid #fff;
            border-radius: 50%;
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${typeof rate === 'number' ? '14px' : (countryInfo.name === 'European Union' ? '11px' : '12px')};
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            cursor: pointer;
        ">${displayValue}</div>`,
        iconSize: [45, 45],
        iconAnchor: [22.5, 22.5]
    });
    
    return L.marker(countryInfo.coordinates, { icon: icon });
}

// Function to display markers
function displayMarkers() {
    // Clear existing markers
    if (markersLayer) {
        map.removeLayer(markersLayer);
    }
    markersLayer = L.layerGroup().addTo(map);
    
    // Add markers for each country with tariff data
    countryData.forEach(countryInfo => {
        if (countryInfo.coordinates) {
            const marker = createTariffMarker(countryInfo);
            
            // Create popup content
            let popupContent = `
                <div class="country-info">
                    <div class="country-name">${countryInfo.name}</div>
                    <div class="tariff-rate">${countryInfo.tariff_rate}${typeof countryInfo.tariff_rate === 'number' ? '%' : ''}</div>
            `;
            
            // Add special handling for China first
            if (countryInfo.type === 'special') {
                popupContent += `
                    <div style="font-size: 12px; color: #8A2BE2; margin-top: 8px;">
                        <strong>Special Timeline</strong><br>
                        ${countryInfo.timeline}<br><br>
                        <strong>Rate Breakdown:</strong><br>
                        ${countryInfo.rate_breakdown}<br><br>
                        <em>${countryInfo.description}</em>
                `;
                
                if (countryInfo.news_source) {
                    popupContent += `<br><br>
                        <div style="background: #f0f0f0; padding: 6px; border-radius: 4px; border-left: 3px solid #8A2BE2;">
                            <strong>News Confirmation:</strong><br>
                            <a href="${countryInfo.news_url}" target="_blank" style="color: #8A2BE2; text-decoration: none;">
                                ${countryInfo.news_source}
                            </a>
                        </div>`;
                }
                
                popupContent += `</div>`;
            } else if (countryInfo.previous_rate !== null) {
                popupContent += `
                    <div style="font-size: 12px; color: #666; margin-top: 8px;">
                        Previous rate: ${countryInfo.previous_rate}%<br>
                        Change: ${countryInfo.change === 'Variable' ? 'Variable' : 
                                 (countryInfo.change >= 0 ? '+' : '') + countryInfo.change + '%'}
                    </div>
                `;
            } else if (countryInfo.type === 'removed') {
                popupContent += `
                    <div style="font-size: 12px; color: #006400; margin-top: 8px;">
                        <strong>Removed from tariff list</strong><br>
                        Previous rate: ${countryInfo.previous_rate}%
                    </div>
                `;
            } else {
                popupContent += `
                    <div style="font-size: 12px; color: #FF1493; margin-top: 8px;">
                        <strong>Newly added to tariff list</strong>
                    </div>
                `;
            }
            
            if (countryInfo.type === 'variable' && countryInfo.description) {
                popupContent += `
                    <div style="font-size: 11px; color: #666; margin: 8px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                        <strong>Special Calculation:</strong><br>
                        ${countryInfo.description}
                    </div>
                `;
            }
            
            popupContent += `
                    <div style="font-size: 12px; color: #666; margin-top: 8px;">
                        Reciprocal Tariff Rate<br>
                        <em>Source: White House Executive Order, July 2025</em>
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent, {
                maxWidth: 300,
                closeButton: true
            });
            
            marker.addTo(markersLayer);
        }
    });
}

// Function to load and display tariff data
async function loadTariffData() {
    try {
        const response = await fetch('data/tariff_data.json');
        const data = await response.json();
        countryData = data.countries;
        
        displayMarkers();
        
        // Fit map to show all markers
        if (countryData.length > 0) {
            const validCoords = countryData
                .filter(c => c.coordinates)
                .map(c => c.coordinates);
            if (validCoords.length > 0) {
                const bounds = L.latLngBounds(validCoords);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
        
        console.log('US Tariff Map loaded with', countryData.length, 'countries');
        
        // Update metadata display
        if (data.metadata) {
            updateMetadata(data.metadata);
        }
        
    } catch (error) {
        console.error('Error loading tariff data:', error);
    }
}

// Function to update metadata display
function updateMetadata(metadata) {
    const infoPanel = document.querySelector('.info-panel');
    if (infoPanel && metadata) {
        const totalCountries = infoPanel.querySelector('p');
        if (totalCountries) {
            totalCountries.innerHTML = `This map shows ${metadata.total_countries} countries subject to reciprocal tariff rates as specified in the White House executive order "Further Modifying the Reciprocal Tariff Rates" from July 2025.`;
        }
    }
}

// Add click handler for map
map.on('click', function(e) {
    console.log('Map clicked at:', e.latlng);
});

// Function to toggle view mode
function toggleViewMode() {
    viewMode = viewMode === 'current' ? 'change' : 'current';
    displayMarkers();
    updateToggleButton();
}

// Function to update toggle button text
function updateToggleButton() {
    const button = document.getElementById('toggleViewBtn');
    if (button) {
        button.textContent = viewMode === 'current' ? 'Show Changes' : 'Show Current Rates';
    }
    
    // Toggle legend display
    const currentLegend = document.getElementById('currentLegend');
    const changeLegend = document.getElementById('changeLegend');
    
    if (viewMode === 'current') {
        currentLegend.style.display = 'block';
        changeLegend.style.display = 'none';
    } else {
        currentLegend.style.display = 'none';
        changeLegend.style.display = 'block';
    }
}

// Function to toggle info panel
function toggleInfoPanel() {
    const panel = document.getElementById('infoPanel');
    const btn = document.getElementById('collapseBtn');
    
    if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        btn.innerHTML = '◀';
        btn.title = 'Collapse panel';
    } else {
        panel.classList.add('collapsed');
        btn.innerHTML = '▶';
        btn.title = 'Expand panel';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTariffData();
    
    // Add toggle button if not exists
    if (!document.getElementById('toggleViewBtn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggleViewBtn';
        toggleBtn.className = 'toggle-view-btn';
        toggleBtn.textContent = 'Show Changes';
        toggleBtn.onclick = toggleViewMode;
        document.body.appendChild(toggleBtn);
    }
    
    // Add collapse button functionality
    const collapseBtn = document.getElementById('collapseBtn');
    if (collapseBtn) {
        collapseBtn.onclick = toggleInfoPanel;
    }
});