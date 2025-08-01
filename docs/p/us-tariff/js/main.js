// Load tariff data from JSON file
let tariffData = {};
let countryData = [];

// Initialize the map
const map = L.map('map').setView([20, 0], 2);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Function to get color based on tariff rate
function getTariffColor(rate) {
    if (rate >= 40) return '#8B0000';      // Dark red for very high (40%+)
    if (rate >= 30) return '#DC143C';      // Crimson for high (30-39%)
    if (rate >= 20) return '#FF4500';      // Orange red for medium-high (20-29%)
    if (rate >= 15) return '#FFA500';      // Orange for medium (15-19%)
    if (rate >= 10) return '#FFD700';      // Gold for low-medium (10-14%)
    return '#90EE90';                      // Light green for low (0-9%)
}

// Function to create custom marker
function createTariffMarker(countryInfo) {
    const rate = countryInfo.tariff_rate;
    const displayRate = typeof rate === 'number' ? rate : rate;
    const color = getTariffColor(typeof rate === 'number' ? rate : 15); // Default color for variable rates
    
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
        ">${typeof rate === 'number' ? rate + '%' : (countryInfo.name === 'European Union' ? '0-15%' : 'VAR')}</div>`,
        iconSize: [45, 45],
        iconAnchor: [22.5, 22.5]
    });
    
    return L.marker(countryInfo.coordinates, { icon: icon });
}

// Function to load and display tariff data
async function loadTariffData() {
    try {
        const response = await fetch('data/tariff_data.json');
        const data = await response.json();
        countryData = data.countries;
        
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
                
                marker.addTo(map);
            }
        });
        
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTariffData();
});