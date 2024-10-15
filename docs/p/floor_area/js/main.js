// WMTS layer configuration
const projection = ol.proj.get('EPSG:3857');
const projectionExtent = projection.getExtent();
const size = ol.extent.getWidth(projectionExtent) / 256;
const resolutions = new Array(20);
const matrixIds = new Array(20);
for (let z = 0; z < 20; ++z) {
  resolutions[z] = size / Math.pow(2, z);
  matrixIds[z] = z;
}

const wmtsLayer = new ol.layer.Tile({
  source: new ol.source.WMTS({
    url: 'https://wmts.nlsc.gov.tw/wmts',
    layer: 'EMAP',
    matrixSet: 'EPSG:3857',
    format: 'image/png',
    projection: projection,
    tileGrid: new ol.tilegrid.WMTS({
      origin: [-20037508.342789244, 20037508.342789244],
      resolutions: resolutions,
      matrixIds: matrixIds
    }),
    style: 'default',
    wrapX: true
  })
});

// Create vector source and layer for markers
const vectorSource = new ol.source.Vector();
const vectorLayer = new ol.layer.Vector({
  source: vectorSource
});

// Create map
const map = new ol.Map({
  target: 'map',
  layers: [wmtsLayer, vectorLayer],
  view: new ol.View({
    center: ol.proj.fromLonLat([120.2, 23.0]),
    zoom: 12
  })
});

// Function to create a building icon
function createBuildingIcon() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 32;
  canvas.height = 32;

  // Draw a simple building icon
  context.beginPath();
  context.moveTo(4, 28);
  context.lineTo(4, 4);
  context.lineTo(16, 0);
  context.lineTo(28, 4);
  context.lineTo(28, 28);
  context.closePath();
  context.fillStyle = 'rgba(0, 128, 0, 0.8)'; // Darker green with higher opacity
  context.fill();
  context.strokeStyle = 'white';
  context.lineWidth = 2;
  context.stroke();

  return canvas;
}

const buildingIcon = createBuildingIcon();

// Create a popup overlay
const popupElement = document.createElement('div');
popupElement.className = 'ol-popup';
popupElement.style.minWidth = '500px'; // Increased minimum width
popupElement.style.maxWidth = '800px'; // Increased maximum width
const popup = new ol.Overlay({
  element: popupElement,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

// Add popup to map
map.addOverlay(popup);

// Create popup closer element
const closer = document.createElement('a');
closer.className = 'ol-popup-closer';
closer.href = '#';
popupElement.appendChild(closer);

// Add click event to close popup
closer.onclick = function() {
  popup.setPosition(undefined);
  closer.blur();
  return false;
};

// Function to parse CSV, handling quoted fields
function parseCSV(text) {
  const rows = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(currentField.trim());
      rows.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField) {
    row.push(currentField.trim());
  }
  if (row.length > 0) {
    rows.push(row);
  }

  return rows;
}

// Function to add markers from CSV data
function addMarkers(data) {
  data.forEach((row, index) => {
    try {
      const x = parseFloat(row[7]);
      const y = parseFloat(row[8]);
      const label = row[3];
      const uuid = row[0];

      if (isNaN(x) || isNaN(y)) {
        console.error(`Invalid coordinates for row ${index + 1}:`, row[7], row[8]);
        return; // Skip this iteration
      }

      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([x, y])),
        name: label,
        properties: row,
        uuid: uuid
      });
      
      feature.setStyle(new ol.style.Style({
        image: new ol.style.Icon({
          img: buildingIcon,
          imgSize: [32, 32],
          anchor: [0.5, 1]
        }),
        text: new ol.style.Text({
          text: label,
          offsetY: -40,
          fill: new ol.style.Fill({color: 'black'}),
          stroke: new ol.style.Stroke({color: 'white', width: 2}),
          font: '12px sans-serif'
        })
      }));
      
      vectorSource.addFeature(feature);
    } catch (error) {
      console.error(`Error processing row ${index + 1}:`, error);
      console.error('Problematic row:', row);
    }
  });
}

// Function to create route buttons
function createRouteButtons(lat, lon) {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const bingMapsUrl = `https://www.bing.com/maps?rtp=~pos.${lat}_${lon}`;
  const hereMapsUrl = `https://wego.here.com/directions/drive/mylocation/${lat},${lon}`;

  return `
    <div class="d-flex justify-content-between mt-3">
      <a href="${googleMapsUrl}" target="_blank" class="btn btn-sm btn-primary">Google Maps</a>
      <a href="${bingMapsUrl}" target="_blank" class="btn btn-sm btn-secondary">Bing Maps</a>
      <a href="${hereMapsUrl}" target="_blank" class="btn btn-sm btn-info">HERE Maps</a>
    </div>
  `;
}

// Function to create popup content
function createPopupContent(properties, lat, lon) {
  const content = `
    <div class="card" style="width: 100%;">
      <div class="card-body">
        <button type="button" class="btn-close float-end" aria-label="Close"></button>
        <h5 class="card-title">${properties[3]}</h5>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>公告日期:</strong> ${properties[1]}</li>
          <li class="list-group-item"><strong>容積移轉:</strong> ${properties[2]}</li>
          <li class="list-group-item"><strong>建設公司:</strong> ${properties[4]}</li>
          <li class="list-group-item"><strong>公益回饋:</strong> ${properties[5] || '無'}</li>
        </ul>
        ${createRouteButtons(lat, lon)}
        <div id="additional-data" class="mt-3">
          <p>載入中...</p>
        </div>
      </div>
    </div>
  `;

  // Lazy load additional data
  setTimeout(() => {
    const key = properties[5];
    if (key) {
      fetch(`https://kiang.github.io/ardata.cy.gov.tw/incomes/business/${key}.csv`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(text => {
          const rows = text.trim().split('\n').map(row => row.split(','));
          if (rows.length > 1) {
            const dataCount = rows.length - 1; // Subtract 1 for header row
            const additionalDataElement = document.getElementById('additional-data');
            additionalDataElement.innerHTML = `
              <button class="btn btn-primary" id="show-details-btn">
                歷年政治獻金捐款有 (${dataCount} 筆)
              </button>
            `;
            
            // Add click event to show details
            document.getElementById('show-details-btn').addEventListener('click', function() {
              const tableContent = `
                <table class="table table-striped table-sm">
                  <thead>
                    <tr>
                      <th>選舉</th>
                      <th>捐贈對象</th>
                      <th>捐贈人</th>
                      <th>捐贈日期</th>
                      <th>捐贈金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.slice(1).map(row => `
                      <tr>
                        <td>${row[0]}</td>
                        <td>${row[1]}</td>
                        <td>${row[2]}</td>
                        <td>${row[3]}</td>
                        <td>${row[4]}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
              additionalDataElement.innerHTML = tableContent;
            });
          } else {
            document.getElementById('additional-data').innerHTML = '<p>無政治獻金捐款資料</p>';
          }
        })
        .catch(error => {
          console.error('Error fetching additional data:', error);
          if (error.message.includes('404')) {
            document.getElementById('additional-data').innerHTML = '<p>無政治獻金捐款資料</p>';
          } else {
            document.getElementById('additional-data').innerHTML = '<p>無法載入政治獻金捐款資料</p>';
          }
        });
    } else {
      document.getElementById('additional-data').innerHTML = '<p>無政治獻金捐款資料</p>';
    }
  }, 100);

  return content;
}

// Function to open popup for a feature
function openPopup(feature) {
  const coordinates = feature.getGeometry().getCoordinates();
  const properties = feature.get('properties');
  const [lon, lat] = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326');

  const content = createPopupContent(properties, lat, lon);
  popup.getElement().innerHTML = content;
  popup.setPosition(coordinates);

  // Add click event to close button
  const closeButton = popup.getElement().querySelector('.btn-close');
  closeButton.addEventListener('click', function() {
    popup.setPosition(undefined);
    window.location.hash = '';
  });

  // Update URL hash
  window.location.hash = feature.get('uuid');
}

// Add click event to show popup
map.on('click', function(evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
    return feature;
  });

  if (feature) {
    openPopup(feature);
  } else {
    popup.setPosition(undefined);
    window.location.hash = '';
  }
});

// Function to check URL hash and open corresponding popup
function checkUrlHash() {
  const hash = window.location.hash.substr(1);
  if (hash) {
    const feature = vectorSource.getFeatures().find(f => f.get('uuid') === hash);
    if (feature) {
      openPopup(feature);
      const coordinates = feature.getGeometry().getCoordinates();
      map.getView().animate({center: coordinates, zoom: 15});
    }
  }
}

// Fetch and parse CSV data
fetch('data/buildings.csv')
  .then(response => response.text())
  .then(text => {
    const rows = parseCSV(text);
    console.log('First few rows:', rows.slice(1, 5)); // Log the first few rows for debugging
    addMarkers(rows.slice(1)); // Skip header row
    checkUrlHash(); // Check URL hash after adding markers
  })
  .catch(error => {
    console.error('Error fetching or parsing CSV:', error);
  });

// Listen for hash changes
window.addEventListener('hashchange', checkUrlHash);

// Add some additional styles to the document
const style = document.createElement('style');
style.textContent = `
  .ol-popup {
    min-width: 500px;
    max-width: 800px;
  }
  .ol-popup .card {
    width: 100%;
  }
  .ol-popup table {
    font-size: 0.9em;
    width: 100%;
  }
  .ol-popup .card-body {
    padding: 1.25rem;
  }
  .ol-popup .list-group-item {
    padding: 0.75rem 1.25rem;
  }
  .ol-popup .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
`;
document.head.appendChild(style);
