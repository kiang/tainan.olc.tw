// Global variables
let currentYear = '2025';
let reservoirsList = [];
let reservoirsData = {};
let allReservoirsData = [];

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

// Show reservoir detail in modal
function showReservoirDetail(reservoir) {
  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');

  let html = `<h2 style="color: #667eea; margin-bottom: 20px; text-align: center;">${reservoir.name}</h2>`;

  // Add SVG
  if (reservoir.svg) {
    html += `<div class="modal-svg">${reservoir.svg}</div>`;
  }

  // Get all data - data structure has location IDs as keys
  const locationKeys = Object.keys(reservoir.data).filter(key => key !== 'name' && key !== 'svg');
  let hasData = false;
  let allDates = [];

  if (locationKeys.length > 0) {
    // Process each location
    locationKeys.forEach((locationKey, index) => {
      const locationData = reservoir.data[locationKey];

      if (locationData.data && Object.keys(locationData.data).length > 0) {
        const dates = Object.keys(locationData.data).sort().reverse();
        allDates = allDates.concat(dates);
        const latestDate = dates[0];
        const latestData = locationData.data[latestDate];

        if (index === 0) {
          html += `<h4 style="color: #28a745; margin-top: 20px;">最新監測資料</h4>`;
        }

        if (locationKeys.length > 1) {
          html += `<h5 style="color: #666; margin-top: 15px;">測站 ${locationKey}</h5>`;
        }
        html += `<p style="color: #666; margin-bottom: 15px;">日期：${latestDate}</p>`;

        // Group data by measurement
        const measurements = {};
        latestData.forEach(item => {
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
            html += `<tr>
              <td><strong>${item.itemname}</strong></td>
              <td>${item.itemvalue}</td>
              <td>${item.itemunit}</td>
              <td>${item.sampledepth || '-'} ${item.samplelayer || ''}</td>
            </tr>`;
          });
        });

        html += '</tbody></table>';
        hasData = true;

        // Add coordinates for this location
        if (locationData.twd97lon && locationData.twd97lat) {
          html += `<p style="margin-top: 10px; color: #666; font-size: 13px;">
            座標：${locationData.twd97lat}, ${locationData.twd97lon}
          </p>`;
        }
      }
    });

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
