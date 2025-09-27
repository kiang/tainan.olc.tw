// Initialize variables
let map;
let markersLayer;
let markers = [];
let filterInput = document.getElementById('filter-input');
let coordinatesModal;

// Initialize map
function initMap() {
    // Set default view to Hualien Guangfu area
    map = L.map('map').setView([23.6533, 121.4207], 13);

    // Add NLSC tile layer
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster group
    markersLayer = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 80
    });

    map.addLayer(markersLayer);

    // Load markers data
    loadMarkers();
}

// Load markers from data source
function loadMarkers() {
    // Load data from CSV file
    fetch('data/base.csv')
        .then(response => response.text())
        .then(csvText => {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',');
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const data = {
                    id: values[0],
                    name: values[1],
                    lat: parseFloat(values[2]),
                    lng: parseFloat(values[3]),
                    description: values[4],
                    image: values[5] || null
                };
                
                if (!isNaN(data.lat) && !isNaN(data.lng)) {
                    createMarker(data);
                }
            }
            
            updateChart();
        })
        .catch(error => {
            console.error('Error loading CSV:', error);
            // Fallback to sample data
            const sampleData = [
                { id: '1', name: '光復鄉公所', lat: 23.6656, lng: 121.4233, description: '光復鄉災害應變中心', image: null },
                { id: '2', name: '光復國中', lat: 23.6533, lng: 121.4207, description: '避難收容處所', image: null },
                { id: '3', name: '光復車站', lat: 23.6665, lng: 121.4204, description: '交通樞紐與物資集散地', image: null }
            ];
            
            sampleData.forEach(data => {
                createMarker(data);
            });
            
            updateChart();
        });
}

// Create a marker
function createMarker(data) {
    const marker = L.marker([data.lat, data.lng], {
        icon: createCustomIcon(data)
    });

    marker.data = data;
    
    // Create popup content
    let popupContent = '<div class="popup-content">';
    if (data.image) {
        popupContent += `<img src="${data.image}" class="popup-image" alt="${data.name}">`;
    }
    popupContent += `<h6>${data.name}</h6>`;
    popupContent += `<p>${data.description || ''}</p>`;
    
    if (data.lat && data.lng) {
        popupContent += `<small>座標: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}</small><br>`;
        popupContent += `<a href="https://www.google.com/maps?q=${data.lat},${data.lng}" target="_blank" class="btn btn-sm btn-primary mt-2">
            <i class="bi bi-geo-alt"></i> Google Maps
        </a>`;
    }
    popupContent += '</div>';

    marker.bindPopup(popupContent);
    
    markers.push(marker);
    markersLayer.addLayer(marker);
}

// Create custom icon for marker
function createCustomIcon(data) {
    return L.divIcon({
        html: `<div class="custom-marker">${data.name ? data.name.substring(0, 2) : 'M'}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

// Filter markers
function filterMarkers(keyword) {
    markersLayer.clearLayers();
    
    markers.forEach(marker => {
        if (!keyword || marker.data.name.toLowerCase().includes(keyword.toLowerCase())) {
            markersLayer.addLayer(marker);
        }
    });
}

// Update statistics chart
function updateChart() {
    const ctx = document.getElementById('nameChart');
    if (!ctx) return;

    const nameCount = {};
    markers.forEach(marker => {
        const name = marker.data.name || '未知';
        nameCount[name] = (nameCount[name] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(nameCount),
            datasets: [{
                data: Object.values(nameCount),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                datalabels: {
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// Geolocation
function locateMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                map.setView([lat, lng], 16);
                
                // Add location marker
                L.marker([lat, lng], {
                    icon: L.icon({
                        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI4IiBmaWxsPSIjMDA3YmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    })
                }).addTo(map).bindPopup('您的位置').openPopup();
            },
            error => {
                alert('無法取得您的位置');
            }
        );
    } else {
        alert('您的瀏覽器不支援地理定位功能');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // Initialize Bootstrap modal
    coordinatesModal = new bootstrap.Modal(document.getElementById('coordinatesModal'));

    // Filter input
    filterInput.addEventListener('input', function() {
        filterMarkers(this.value);
    });

    // Locate me button
    document.getElementById('locate-me').addEventListener('click', locateMe);

    // Coordinates input button
    document.getElementById('input-coordinates').addEventListener('click', function() {
        coordinatesModal.show();
    });

    // Coordinate input handling
    document.getElementById('coordinatesInput').addEventListener('input', function() {
        const coords = this.value.split(',');
        if (coords.length === 2) {
            document.getElementById('latitude').value = coords[0].trim();
            document.getElementById('longitude').value = coords[1].trim();
        }
    });

    // Zoom to coordinates
    document.getElementById('zoomToCoordinates').addEventListener('click', function() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 16);
            coordinatesModal.hide();
            
            // Clear inputs
            document.getElementById('coordinatesInput').value = '';
            document.getElementById('latitude').value = '';
            document.getElementById('longitude').value = '';
        } else {
            alert('請輸入有效的座標');
        }
    });

    // Readme popup
    document.getElementById('readme-icon').addEventListener('click', function() {
        document.getElementById('readme-popup').style.display = 'block';
    });

    document.getElementById('readme-closer').addEventListener('click', function() {
        document.getElementById('readme-popup').style.display = 'none';
    });

    // Tutorial popup
    document.getElementById('tutorial-icon').addEventListener('click', function() {
        document.getElementById('tutorial-popup').style.display = 'block';
    });

    document.getElementById('tutorial-closer').addEventListener('click', function() {
        document.getElementById('tutorial-popup').style.display = 'none';
    });

    // Route handling
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const coords = hash.split('/');
        if (coords.length === 2) {
            const lat = parseFloat(coords[0]);
            const lng = parseFloat(coords[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                setTimeout(() => {
                    map.setView([lat, lng], 16);
                }, 500);
            }
        }
    }
});