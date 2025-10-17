// Global variables
let currentYear = '2025';
let reservoirsList = [];
let reservoirsData = {};
let allReservoirsData = [];

// Process SVG to color-code monitoring points based on Carlson Index
function processSVG(svgContent, data) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

  // Find all circles with Dam_S* IDs
  const circles = svgDoc.querySelectorAll('circle[id^="Dam_S"]');

  circles.forEach(circle => {
    const id = circle.getAttribute('id');
    const match = id.match(/Dam_S(\d+)/);

    if (match) {
      const locationKey = match[1];
      const locationData = data[locationKey];

      if (locationData && locationData.data) {
        // Get latest data
        const dates = Object.keys(locationData.data).sort().reverse();
        if (dates.length > 0) {
          const latestData = locationData.data[dates[0]];

          // Find Carlson Index
          const ctsi = latestData.find(item =>
            item.itemname === '卡爾森指數' ||
            item.itemname === '卡爾森優養指數' ||
            item.itemname === '卡爾森優養指數(CTSI)'
          );

          if (ctsi) {
            const value = parseFloat(ctsi.itemvalue);
            let color = '#999'; // Default gray

            // Color coding based on Carlson Index
            // <40: Oligotrophic (blue)
            // 40-50: Mesotrophic (green)
            // 50-60: Eutrophic (yellow/orange)
            // >60: Hypereutrophic (red)
            if (value < 40) {
              color = '#3498db'; // Blue
            } else if (value < 50) {
              color = '#27ae60'; // Green
            } else if (value < 60) {
              color = '#f39c12'; // Orange
            } else {
              color = '#e74c3c'; // Red
            }

            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '2');

            // Add title for tooltip
            const title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `測站 ${locationKey}\n卡爾森指數: ${value}\n日期: ${dates[0]}`;
            circle.appendChild(title);
          }
        }
      }
    }
  });

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgDoc);
}

// Load reservoir list and data
async function loadReservoirs(year) {
  try {
    document.getElementById('loading').classList.add('show');

    const response = await fetch(`https://kiang.github.io/reservoir_data/json/${year}/list.json`);
    reservoirsList = await response.json();

    reservoirsData = {};
    allReservoirsData = [];

    // Load each reservoir's data
    const promises = reservoirsList.map(async (reservoir) => {
      try {
        const dataResponse = await fetch(`https://kiang.github.io/reservoir_data/json/${year}/${reservoir}.json`);
        const data = await dataResponse.json();
        reservoirsData[reservoir] = data;

        // Load SVG
        let svgContent = null;
        try {
          const svgResponse = await fetch(`shaps/${reservoir}.svg`);
          if (svgResponse.ok) {
            svgContent = await svgResponse.text();
            // Process SVG to color-code monitoring points
            svgContent = processSVG(svgContent, data);
          }
        } catch (error) {
          console.log(`SVG not found for ${reservoir}`);
        }

        allReservoirsData.push({
          name: reservoir,
          data: data,
          svg: svgContent
        });

        return data;
      } catch (error) {
        console.error(`Error loading ${reservoir}:`, error);
        return null;
      }
    });

    await Promise.all(promises);

    // Sort by name
    allReservoirsData.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));

    // Render grid
    renderReservoirsGrid(allReservoirsData);

    document.getElementById('loading').classList.remove('show');
  } catch (error) {
    console.error('Error loading reservoirs:', error);
    document.getElementById('loading').classList.remove('show');
    alert('載入資料失敗，請稍後再試');
  }
}

// Render reservoirs grid
function renderReservoirsGrid(reservoirs) {
  const grid = document.getElementById('reservoirsGrid');
  grid.innerHTML = '';

  if (reservoirs.length === 0) {
    grid.innerHTML = '<div class="no-data">找不到符合的水庫資料</div>';
    return;
  }

  reservoirs.forEach(reservoir => {
    const card = document.createElement('div');
    card.className = 'reservoir-card';
    card.onclick = () => showReservoirDetail(reservoir);

    let cardHTML = `<h5>${reservoir.name}</h5>`;

    // Add SVG
    if (reservoir.svg) {
      cardHTML += `<div class="reservoir-svg">${reservoir.svg}</div>`;
    } else {
      cardHTML += `<div class="reservoir-svg"><div class="no-data">無圖形資料</div></div>`;
    }

    // Add basic info
    cardHTML += '<div class="reservoir-info">';

    // Get latest data summary - data structure has location IDs as keys
    const locationKeys = Object.keys(reservoir.data).filter(key => key !== 'name' && key !== 'svg');
    let hasData = false;

    if (locationKeys.length > 0) {
      // Get first location's data
      const locationData = reservoir.data[locationKeys[0]];

      if (locationData.data && Object.keys(locationData.data).length > 0) {
        const dates = Object.keys(locationData.data).sort().reverse();
        const latestDate = dates[0];
        const latestData = locationData.data[latestDate];

        // Find key measurement
        const ctsi = latestData.find(item => item.itemname === '卡爾森指數' || item.itemname === '卡爾森優養指數' || item.itemname === '卡爾森優養指數(CTSI)');
        const waterTemp = latestData.find(item => item.itemname === '水溫');
        const ph = latestData.find(item => item.itemname === 'pH');

        if (ctsi) {
          cardHTML += `<div class="info-item"><span class="label">卡爾森指數</span><span>${ctsi.itemvalue}</span></div>`;
          hasData = true;
        }
        if (waterTemp) {
          cardHTML += `<div class="info-item"><span class="label">水溫</span><span>${waterTemp.itemvalue}${waterTemp.itemunit}</span></div>`;
          hasData = true;
        }
        if (ph) {
          cardHTML += `<div class="info-item"><span class="label">pH值</span><span>${ph.itemvalue}</span></div>`;
          hasData = true;
        }

        if (hasData) {
          cardHTML += `<div class="info-item"><span class="label">更新日期</span><span>${latestDate}</span></div>`;
        }
      }
    }

    if (!hasData) {
      cardHTML += '<div class="no-data">目前無監測資料</div>';
    }

    cardHTML += '</div>';

    card.innerHTML = cardHTML;
    grid.appendChild(card);
  });
}

// Global variable to store current reservoir data for chart generation
let currentReservoirData = null;

// Show reservoir detail in modal
function showReservoirDetail(reservoir) {
  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');

  // Store reservoir data for chart generation
  currentReservoirData = reservoir;

  let html = `<h2 style="color: #667eea; margin-bottom: 20px; text-align: center;">${reservoir.name}</h2>`;

  // Add view switcher tabs
  html += `<div class="view-tabs">
    <button class="view-tab-button active" data-view="svg">SVG 圖形</button>
    <button class="view-tab-button" data-view="map">地理位置</button>
  </div>`;

  // SVG view container
  html += `<div class="view-content active" id="svgView">`;
  if (reservoir.svg) {
    html += `<div class="modal-svg" id="modalSvg">${reservoir.svg}</div>`;
  }
  html += `</div>`;

  // Map view container
  html += `<div class="view-content" id="mapView">`;
  html += `<div id="modalMap" class="modal-map"></div>`;
  html += `</div>`;

  // Get all data - data structure has location IDs as keys
  const locationKeys = Object.keys(reservoir.data).filter(key => key !== 'name' && key !== 'svg');
  let hasData = false;
  let allDates = [];

  if (locationKeys.length > 0) {
    html += `<h4 style="color: #28a745; margin-top: 20px;">監測站資料</h4>`;

    // Create tabs if multiple stations
    if (locationKeys.length > 1) {
      html += '<div class="tabs-container">';
      html += '<div class="tabs-nav">';

      locationKeys.forEach((locationKey, index) => {
        const activeClass = index === 0 ? 'active' : '';
        html += `<button class="tab-button ${activeClass}" data-tab="tab-${locationKey}">測站 ${locationKey}</button>`;
      });

      html += '</div>';
    }

    // Process each location
    locationKeys.forEach((locationKey, index) => {
      const locationData = reservoir.data[locationKey];

      if (locationData.data && Object.keys(locationData.data).length > 0) {
        const dates = Object.keys(locationData.data).sort().reverse();
        allDates = allDates.concat(dates);
        const latestDate = dates[0];

        const activeClass = index === 0 ? 'active' : '';

        if (locationKeys.length > 1) {
          html += `<div class="tab-content ${activeClass}" id="tab-${locationKey}">`;
        }

        // Station info
        html += '<div class="station-info">';
        html += `<p><strong>測站編號：</strong>${locationKey}</p>`;
        html += `<p><strong>最新更新：</strong>${latestDate}</p>`;
        html += `<p><strong>資料筆數：</strong>${dates.length} 筆</p>`;
        if (locationData.twd97lon && locationData.twd97lat) {
          html += `<p><strong>座標：</strong>${locationData.twd97lat}, ${locationData.twd97lon}</p>`;
        }
        html += '</div>';

        // Create date tabs if multiple dates
        if (dates.length > 1) {
          html += '<div class="tabs-container" style="margin-top: 15px;">';
          html += '<div class="tabs-nav">';

          dates.forEach((date, dateIndex) => {
            const activeClass = dateIndex === 0 ? 'active' : '';
            const dateLabel = dateIndex === 0 ? `最新 ${date}` : date;
            html += `<button class="tab-button date-tab ${activeClass}" data-tab="date-${locationKey}-${dateIndex}">${dateLabel}</button>`;
          });

          html += '</div>';
        }

        // Display data for all dates (latest first)
        dates.forEach((date, dateIndex) => {
          const dateData = locationData.data[date];
          const activeClass = dateIndex === 0 ? 'active' : '';

          if (dates.length > 1) {
            html += `<div class="tab-content ${activeClass}" id="date-${locationKey}-${dateIndex}">`;
          } else {
            html += `<div style="margin-top: 15px;">`;
          }

          // Group data by measurement
          const measurements = {};
          dateData.forEach(item => {
            if (!measurements[item.itemname]) {
              measurements[item.itemname] = [];
            }
            measurements[item.itemname].push(item);
          });

          // Display all measurements in table
          html += '<table class="data-table">';
          html += '<thead><tr><th>監測項目</th><th>數值</th><th>單位</th><th>採樣深度</th></tr></thead>';
          html += '<tbody>';

          Object.entries(measurements).forEach(([name, items]) => {
            items.forEach(item => {
              const depthKey = item.sampledepth || 'default';
              const layerKey = item.samplelayer || 'default';
              html += `<tr class="data-row" data-location="${locationKey}" data-item="${item.itemname}" data-depth="${depthKey}" data-layer="${layerKey}" data-unit="${item.itemunit}">
                <td><strong>${item.itemname}</strong></td>
                <td>${item.itemvalue}</td>
                <td>${item.itemunit}</td>
                <td>${item.sampledepth || '-'} ${item.samplelayer || ''}</td>
              </tr>`;
            });
          });

          html += '</tbody></table>';
          html += '</div>';
        });

        if (dates.length > 1) {
          html += '</div>'; // Close date tabs-container
        }

        if (locationKeys.length > 1) {
          html += '</div>'; // Close tab-content
        }

        hasData = true;
      }
    });

    if (locationKeys.length > 1) {
      html += '</div>'; // Close tabs-container
    }

    // Show all available dates summary
    if (allDates.length > 1) {
      const uniqueDates = [...new Set(allDates)].sort().reverse();
      html += `<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <strong>歷史資料：</strong><br>
        共有 ${uniqueDates.length} 筆監測資料<br>
        最早：${uniqueDates[uniqueDates.length - 1]}<br>
        最新：${uniqueDates[0]}
      </div>`;
    }
  }

  if (!hasData) {
    html += '<div class="no-data" style="margin-top: 20px; padding: 30px;">目前無監測資料</div>';
  }

  modalBody.innerHTML = html;
  modal.classList.add('show');

  // Add click handlers to SVG circles, tab buttons, and view switcher after modal is rendered
  setTimeout(() => {
    // View switcher handlers
    const viewButtons = document.querySelectorAll('.view-tab-button');
    viewButtons.forEach(button => {
      button.addEventListener('click', function() {
        const view = this.getAttribute('data-view');
        switchView(view, reservoir, locationKeys);
      });
    });

    const svgContainer = document.getElementById('modalSvg');
    if (svgContainer) {
      const circles = svgContainer.querySelectorAll('circle[id^="Dam_S"]');
      circles.forEach(circle => {
        circle.addEventListener('click', function(e) {
          e.stopPropagation();
          const id = this.getAttribute('id');
          const match = id.match(/Dam_S(\d+)/);
          if (match) {
            const locationKey = match[1];
            moveMarkToCircle(svgContainer, circle);
            activateTab(locationKey);
          }
        });
      });
    }

    // Add tab button handlers for station tabs
    const tabButtons = document.querySelectorAll('.tab-button:not(.date-tab)');
    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        const locationKey = tabId.replace('tab-', '');

        // Activate this tab
        activateTabByButton(this);

        // Move mark to corresponding circle
        const circle = document.querySelector(`#modalSvg circle[id="Dam_S${locationKey}"]`);
        if (circle) {
          moveMarkToCircle(document.getElementById('modalSvg'), circle);
        }
      });
    });

    // Add tab button handlers for date tabs
    const dateTabButtons = document.querySelectorAll('.tab-button.date-tab');
    dateTabButtons.forEach(button => {
      button.addEventListener('click', function() {
        activateTabByButton(this);
      });
    });

    // Add click handlers to data rows to show charts
    const dataRows = document.querySelectorAll('.data-row');
    dataRows.forEach(row => {
      row.addEventListener('click', function() {
        const locationKey = this.getAttribute('data-location');
        const itemName = this.getAttribute('data-item');
        const depth = this.getAttribute('data-depth');
        const layer = this.getAttribute('data-layer');
        const unit = this.getAttribute('data-unit');
        showItemChart(locationKey, itemName, depth, layer, unit, this);
      });
    });
  }, 100);
}

// Show line chart for selected monitoring item
function showItemChart(locationKey, itemName, depth, layer, unit, clickedRow) {
  if (!currentReservoirData) return;

  const locationData = currentReservoirData.data[locationKey];
  if (!locationData || !locationData.data) return;

  // Check if chart already exists for this row
  const existingChart = clickedRow.nextElementSibling;
  if (existingChart && existingChart.classList.contains('chart-row')) {
    // Remove existing chart
    existingChart.remove();
    return;
  }

  // Collect data for this item + depth + layer combination across all dates
  const dates = Object.keys(locationData.data).sort();
  const chartData = [];

  dates.forEach(date => {
    const dateData = locationData.data[date];
    // Match by item name, depth, and layer
    const item = dateData.find(d => {
      const itemDepth = d.sampledepth || 'default';
      const itemLayer = d.samplelayer || 'default';
      return d.itemname === itemName && itemDepth === depth && itemLayer === layer;
    });
    if (item && item.itemvalue !== null && item.itemvalue !== undefined) {
      chartData.push({
        date: date,
        value: parseFloat(item.itemvalue)
      });
    }
  });

  if (chartData.length === 0) return;

  // Create descriptive label
  const depthLabel = depth !== 'default' ? ` (深度: ${depth}${layer !== 'default' ? ' ' + layer : ''})` : '';
  const chartTitle = `${itemName}${depthLabel} 歷史趨勢`;

  // Create chart row
  const chartRow = document.createElement('tr');
  chartRow.className = 'chart-row';
  const chartId = `chart-${locationKey}-${itemName.replace(/[^a-zA-Z0-9]/g, '')}-${depth}-${layer}`;
  chartRow.innerHTML = `
    <td colspan="4">
      <div class="chart-container">
        <span class="chart-close" onclick="this.closest('.chart-row').remove()">&times;</span>
        <h6 style="margin: 0 0 15px 0; color: #667eea;">${chartTitle}</h6>
        <canvas id="${chartId}"></canvas>
      </div>
    </td>
  `;

  // Insert chart row after clicked row
  clickedRow.parentNode.insertBefore(chartRow, clickedRow.nextSibling);

  // Create chart
  const canvas = chartRow.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map(d => d.date),
      datasets: [{
        label: `${itemName} (${unit})`,
        data: chartData.map(d => d.value),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: unit
          }
        },
        x: {
          title: {
            display: true,
            text: '監測日期'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  });
}

// Global map variable
let reservoirMap = null;
let mapMarkers = {};
let mapInitialized = false;

// Switch between SVG and Map views
function switchView(view, reservoir, locationKeys) {
  // Update button states
  document.querySelectorAll('.view-tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.view-tab-button[data-view="${view}"]`).classList.add('active');

  // Update content visibility
  document.querySelectorAll('.view-content').forEach(content => content.classList.remove('active'));

  if (view === 'svg') {
    document.getElementById('svgView').classList.add('active');
  } else if (view === 'map') {
    document.getElementById('mapView').classList.add('active');
    // Initialize map only when first switching to map view
    if (!mapInitialized) {
      setTimeout(() => {
        initializeReservoirMap(reservoir, locationKeys);
        mapInitialized = true;
      }, 100);
    } else if (reservoirMap) {
      // Invalidate size if map already exists
      setTimeout(() => {
        reservoirMap.invalidateSize();
      }, 100);
    }
  }
}

// Initialize Leaflet map with NLSC basemap
function initializeReservoirMap(reservoir, locationKeys) {
  const mapContainer = document.getElementById('modalMap');
  if (!mapContainer) return;

  // Clear existing map and reset flag
  if (reservoirMap) {
    reservoirMap.remove();
    reservoirMap = null;
    mapMarkers = {};
  }
  mapInitialized = false;

  // Calculate center and bounds
  let bounds = [];
  let centerLat = 0;
  let centerLon = 0;
  let validLocations = 0;

  locationKeys.forEach(locationKey => {
    const locationData = reservoir.data[locationKey];
    if (locationData && locationData.twd97lat && locationData.twd97lon) {
      const lat = parseFloat(locationData.twd97lat);
      const lon = parseFloat(locationData.twd97lon);
      bounds.push([lat, lon]);
      centerLat += lat;
      centerLon += lon;
      validLocations++;
    }
  });

  if (validLocations === 0) return;

  centerLat /= validLocations;
  centerLon /= validLocations;

  // Initialize map
  reservoirMap = L.map('modalMap').setView([centerLat, centerLon], 14);

  // Add NLSC basemap (Taiwan WMTS)
  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>',
    maxZoom: 18
  }).addTo(reservoirMap);

  // Add monitoring stations as markers
  locationKeys.forEach(locationKey => {
    const locationData = reservoir.data[locationKey];
    if (locationData && locationData.twd97lat && locationData.twd97lon) {
      const lat = parseFloat(locationData.twd97lat);
      const lon = parseFloat(locationData.twd97lon);

      // Get CTSI value for color coding
      let markerColor = '#999';
      if (locationData.data) {
        const dates = Object.keys(locationData.data).sort().reverse();
        if (dates.length > 0) {
          const latestData = locationData.data[dates[0]];
          const ctsi = latestData.find(item =>
            item.itemname === '卡爾森指數' ||
            item.itemname === '卡爾森優養指數' ||
            item.itemname === '卡爾森優養指數(CTSI)'
          );

          if (ctsi) {
            const value = parseFloat(ctsi.itemvalue);
            if (value < 40) {
              markerColor = '#3498db';
            } else if (value < 50) {
              markerColor = '#27ae60';
            } else if (value < 60) {
              markerColor = '#f39c12';
            } else {
              markerColor = '#e74c3c';
            }
          }
        }
      }

      // Create custom icon
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(reservoirMap);
      marker.bindPopup(`<strong>測站 ${locationKey}</strong><br>點擊切換至此測站資料`);

      // Click handler to activate tab
      marker.on('click', () => {
        activateTab(locationKey);
        const circle = document.querySelector(`#modalSvg circle[id="Dam_S${locationKey}"]`);
        if (circle) {
          moveMarkToCircle(document.getElementById('modalSvg'), circle);
        }
      });

      mapMarkers[locationKey] = marker;
    }
  });

  // Fit bounds if multiple stations
  if (bounds.length > 1) {
    reservoirMap.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Move Mark group to clicked circle
function moveMarkToCircle(svgContainer, circle) {
  const svg = svgContainer.querySelector('svg');
  if (!svg) return;

  const markGroup = svg.querySelector('#Mark');
  if (!markGroup) return;

  // Get circle position
  const cx = parseFloat(circle.getAttribute('cx'));
  const cy = parseFloat(circle.getAttribute('cy'));

  // Update Mark group position
  const gMark = markGroup.querySelector('#gMark');
  if (gMark) {
    gMark.setAttribute('transform', `translate(${cx}, ${cy}) translate(-14, -14)`);
  }
}

// Activate tab by location key
function activateTab(locationKey) {
  const tabId = `tab-${locationKey}`;

  // Find and click the corresponding tab button
  const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  if (tabButton) {
    activateTabByButton(tabButton);
  }
}

// Activate tab by button element
function activateTabByButton(button) {
  const tabId = button.getAttribute('data-tab');
  const isDateTab = button.classList.contains('date-tab');

  if (isDateTab) {
    // For date tabs, only toggle within the same parent container
    const parentContainer = button.closest('.tabs-container');
    if (parentContainer) {
      parentContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      parentContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    }
  } else {
    // For station tabs, toggle all station-level tabs
    document.querySelectorAll('.tab-button:not(.date-tab)').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content[id^="tab-"]').forEach(content => content.classList.remove('active'));
  }

  // Add active class to clicked button
  button.classList.add('active');

  // Show corresponding content
  const tabContent = document.getElementById(tabId);
  if (tabContent) {
    tabContent.classList.add('active');
  }
}

// Close modal
document.getElementById('modalClose').addEventListener('click', function() {
  document.getElementById('detailModal').classList.remove('show');
});

document.getElementById('detailModal').addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('show');
  }
});

// Year selector
document.getElementById('yearSelect').addEventListener('change', function(e) {
  currentYear = e.target.value;
  document.getElementById('detailModal').classList.remove('show');
  loadReservoirs(currentYear);
});

// Search functionality
document.getElementById('searchInput').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (searchTerm === '') {
    renderReservoirsGrid(allReservoirsData);
  } else {
    const filtered = allReservoirsData.filter(reservoir =>
      reservoir.name.toLowerCase().includes(searchTerm)
    );
    renderReservoirsGrid(filtered);
  }
});

// Initial load
loadReservoirs(currentYear);
