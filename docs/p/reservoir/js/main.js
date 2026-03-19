// ============================================================
// Tab switching
// ============================================================
var activeMainTab = 'realtime';
var rtMapInitialized = false;

document.querySelectorAll('.main-tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var tab = this.getAttribute('data-tab');
    if (tab === activeMainTab) return;
    activeMainTab = tab;

    document.querySelectorAll('.main-tab').forEach(function (b) { b.classList.remove('active'); });
    this.classList.add('active');

    document.querySelectorAll('.main-content').forEach(function (c) { c.classList.remove('active'); });
    document.getElementById('content-' + tab).classList.add('active');

    // Show/hide water quality legend
    var wqLegend = document.getElementById('wqLegend');
    if (tab === 'quality') {
      wqLegend.classList.add('active');
      // Load water quality data on first visit
      if (!wqLoaded) {
        wqLoaded = true;
        var params = parseHash();
        if (params.year) {
          currentYear = params.year;
          document.getElementById('yearSelect').value = currentYear;
        }
        loadReservoirs(currentYear).then(function () {
          if (params.reservoir) openReservoirByName(params.reservoir);
        });
      }
    } else {
      wqLegend.classList.remove('active');
    }

    if (tab === 'realtime' && rtMap) {
      setTimeout(function () { rtMap.invalidateSize(); }, 100);
    }
  });
});

// ============================================================
// Real-time water status
// ============================================================
var rtMap = null;
var rtStations = {};  // keyed by StationNo
var rtRealtime = [];  // raw realtime array
var rtMerged = [];    // merged station+realtime
var rtMarkers = {};   // map markers keyed by StationNo

function getStorageLevel(pct) {
  if (pct === null || pct === undefined) return 'normal';
  if (pct > 80) return 'full';
  if (pct > 50) return 'normal';
  if (pct > 20) return 'low';
  return 'critical';
}

function getLevelLabel(level) {
  var labels = { full: '充沛', normal: '正常', low: '偏低', critical: '嚴重不足' };
  return labels[level] || '';
}

function getLevelColor(level) {
  var colors = { full: '#1565c0', normal: '#2e7d32', low: '#f57f17', critical: '#c62828' };
  return colors[level] || '#999';
}

function formatNum(n, digits) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits !== undefined ? digits : 2 });
}

function initRtMap() {
  rtMap = L.map('realtimeMap', {
    center: [23.7, 121],
    zoom: 8,
    zoomControl: true
  });

  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
  }).addTo(rtMap);

  rtMapInitialized = true;

  rtMap.on('zoomend', function () {
    var btn = document.getElementById('rtOverviewBtn');
    if (rtMap.getZoom() > 9) {
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';
    }
  });
}

function rtZoomOverview() {
  if (rtMap) {
    rtMap.closePopup();
    rtMap.setView([23.7, 121], 8);
  }
}

function loadRealtimeData() {
  Promise.all([
    fetch('https://fhy.wra.gov.tw/WraApi/v1/Reservoir/Station').then(function (r) { return r.json(); }),
    fetch('https://fhy.wra.gov.tw/WraApi/v1/Reservoir/RealTimeInfo').then(function (r) { return r.json(); })
  ]).then(function (results) {
    var stations = results[0];
    var realtime = results[1];

    // Index stations
    rtStations = {};
    stations.forEach(function (s) {
      rtStations[s.StationNo] = s;
    });

    rtRealtime = realtime;

    // Merge
    rtMerged = [];
    realtime.forEach(function (rt) {
      var st = rtStations[rt.StationNo];
      if (!st) return;
      // Only include stations that are important reservoirs or have percentage data
      if (rt.PercentageOfStorage === undefined && rt.EffectiveStorage === undefined) return;
      rtMerged.push({
        stationNo: rt.StationNo,
        name: st.StationName,
        lat: st.Latitude,
        lon: st.Longitude,
        effectiveCapacity: st.EffectiveCapacity,
        fullWaterHeight: st.FullWaterHeight,
        deadWaterHeight: st.DeadWaterHeight,
        basinName: st.BasinName,
        importance: st.Importance,
        time: rt.Time,
        waterHeight: rt.WaterHeight,
        effectiveStorage: rt.EffectiveStorage,
        percentage: rt.PercentageOfStorage,
        inflow: rt.Inflow,
        outflow: rt.Outflow,
        accRainfall: rt.AccumulatedRainfall,
        level: getStorageLevel(rt.PercentageOfStorage)
      });
    });

    // Update time display
    if (rtMerged.length > 0) {
      var times = rtMerged.map(function (d) { return d.time; }).sort().reverse();
      var latest = times[0].replace('T', ' ').substring(0, 16);
      document.getElementById('rtUpdateTime').textContent = '更新: ' + latest;
    }

    renderRtMap();
    sortAndRenderRtGrid();
  }).catch(function (err) {
    console.error('Failed to load realtime data:', err);
    document.getElementById('rtGrid').innerHTML = '<div class="no-data">無法載入即時資料，請稍後再試</div>';
  });
}

function renderRtMap() {
  // Clear existing markers
  Object.values(rtMarkers).forEach(function (m) { rtMap.removeLayer(m); });
  rtMarkers = {};

  rtMerged.forEach(function (d) {
    if (!d.lat || !d.lon) return;

    var color = getLevelColor(d.level);
    var pctText = d.percentage !== undefined && d.percentage !== null ? formatNum(d.percentage, 1) + '%' : '-';
    var radius = d.importance ? 10 : 7;

    var marker = L.circleMarker([d.lat, d.lon], {
      radius: radius,
      fillColor: color,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(rtMap);

    var popupHtml = '<div style="min-width:180px">' +
      '<strong style="font-size:15px">' + d.name + '</strong>' +
      '<div style="margin:6px 0">' +
      '<div style="background:#e8e8e8;border-radius:8px;height:16px;position:relative;overflow:hidden">' +
      '<div style="height:100%;border-radius:8px;background:' + color + ';width:' + Math.min(d.percentage || 0, 100) + '%"></div>' +
      '<div style="position:absolute;top:0;left:0;right:0;text-align:center;font-size:11px;font-weight:bold;line-height:16px">' + pctText + '</div>' +
      '</div></div>' +
      '<table class="rt-popup-table">' +
      '<tr><th>有效蓄水量</th><td>' + formatNum(d.effectiveStorage) + ' 萬m³</td></tr>' +
      '<tr><th>有效容量</th><td>' + formatNum(d.effectiveCapacity) + ' 萬m³</td></tr>' +
      '<tr><th>水位</th><td>' + formatNum(d.waterHeight) + ' m</td></tr>';

    if (d.inflow !== undefined) popupHtml += '<tr><th>進水量</th><td>' + formatNum(d.inflow) + ' cms</td></tr>';
    if (d.outflow !== undefined) popupHtml += '<tr><th>出水量</th><td>' + formatNum(d.outflow) + ' cms</td></tr>';
    if (d.accRainfall !== undefined) popupHtml += '<tr><th>累積雨量</th><td>' + formatNum(d.accRainfall) + ' mm</td></tr>';

    popupHtml += '</table>' +
      '<div style="font-size:11px;color:#999;margin-top:4px">' + d.time.replace('T', ' ').substring(0, 16) + '</div>' +
      '</div>';

    marker.bindPopup(popupHtml);
    rtMarkers[d.stationNo] = marker;
  });
}

function sortAndRenderRtGrid() {
  var sortVal = document.getElementById('rtSortSelect').value;
  var searchTerm = document.getElementById('rtSearchInput').value.trim().toLowerCase();

  var filtered = rtMerged.slice();
  if (searchTerm) {
    filtered = filtered.filter(function (d) {
      return d.name.toLowerCase().indexOf(searchTerm) !== -1 ||
        (d.basinName && d.basinName.toLowerCase().indexOf(searchTerm) !== -1);
    });
  }

  filtered.sort(function (a, b) {
    switch (sortVal) {
      case 'percentage-asc':
        return (a.percentage || 0) - (b.percentage || 0);
      case 'percentage-desc':
        return (b.percentage || 0) - (a.percentage || 0);
      case 'name':
        return a.name.localeCompare(b.name, 'zh-Hant');
      case 'capacity-desc':
        return (b.effectiveCapacity || 0) - (a.effectiveCapacity || 0);
      default:
        return 0;
    }
  });

  renderRtGrid(filtered);
}

function renderRtGrid(data) {
  var grid = document.getElementById('rtGrid');
  grid.innerHTML = '';

  if (data.length === 0) {
    grid.innerHTML = '<div class="no-data">找不到符合的水庫</div>';
    return;
  }

  data.forEach(function (d) {
    var pct = d.percentage !== undefined && d.percentage !== null ? d.percentage : null;
    var pctText = pct !== null ? formatNum(pct, 1) + '%' : '無資料';
    var barWidth = pct !== null ? Math.min(pct, 100) : 0;

    var card = document.createElement('div');
    card.className = 'rt-card level-' + d.level;
    card.onclick = function () {
      if (rtMarkers[d.stationNo]) {
        rtMap.setView([d.lat, d.lon], 13);
        rtMarkers[d.stationNo].openPopup();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    var html = '<div class="rt-card-header">' +
      '<h5>' + d.name + '</h5>' +
      '<span class="rt-badge level-' + d.level + '">' + getLevelLabel(d.level) + '</span>' +
      '</div>' +
      '<div class="rt-bar-track">' +
      '<div class="rt-bar-fill level-' + d.level + '" style="width:' + barWidth + '%"></div>' +
      '<div class="rt-bar-label">' + pctText + '</div>' +
      '</div>' +
      '<div class="rt-card-details">';

    html += '<div class="rt-detail"><span class="label">蓄水量</span><span class="value">' + formatNum(d.effectiveStorage) + ' 萬m³</span></div>';
    html += '<div class="rt-detail"><span class="label">容量</span><span class="value">' + formatNum(d.effectiveCapacity) + ' 萬m³</span></div>';
    html += '<div class="rt-detail"><span class="label">水位</span><span class="value">' + formatNum(d.waterHeight) + ' m</span></div>';

    if (d.inflow !== undefined) {
      html += '<div class="rt-detail"><span class="label">進水量</span><span class="value">' + formatNum(d.inflow) + ' cms</span></div>';
    }
    if (d.outflow !== undefined) {
      html += '<div class="rt-detail"><span class="label">出水量</span><span class="value">' + formatNum(d.outflow) + ' cms</span></div>';
    }
    if (d.accRainfall !== undefined && d.accRainfall > 0) {
      html += '<div class="rt-detail"><span class="label">累積雨量</span><span class="value">' + formatNum(d.accRainfall) + ' mm</span></div>';
    }

    html += '</div>';
    html += '<div class="rt-card-time">' + d.time.replace('T', ' ').substring(0, 16) + '</div>';

    card.innerHTML = html;
    grid.appendChild(card);
  });
}

document.getElementById('rtSearchInput').addEventListener('input', function () {
  sortAndRenderRtGrid();
});

document.getElementById('rtSortSelect').addEventListener('change', function () {
  sortAndRenderRtGrid();
});

// Initialize real-time tab
initRtMap();
loadRealtimeData();

// ============================================================
// Water Quality (existing code)
// ============================================================
var wqLoaded = false;
var currentYear = '2025';
var reservoirsList = [];
var reservoirsData = {};
var allReservoirsData = [];
var waterUsageData = {};

// Process SVG to color-code monitoring points based on Carlson Index
function processSVG(svgContent, data) {
  var parser = new DOMParser();
  var svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

  var circles = svgDoc.querySelectorAll('circle[id^="Dam_S"]');

  circles.forEach(function (circle) {
    var id = circle.getAttribute('id');
    var match = id.match(/Dam_S(\d+)/);

    if (match) {
      var locationKey = match[1];
      var locationData = data[locationKey];

      if (locationData && locationData.data) {
        var dates = Object.keys(locationData.data).sort().reverse();
        if (dates.length > 0) {
          var latestData = locationData.data[dates[0]];

          var ctsi = latestData.find(function (item) {
            return item.itemname === '卡爾森指數' ||
              item.itemname === '卡爾森優養指數' ||
              item.itemname === '卡爾森優養指數(CTSI)';
          });

          if (ctsi) {
            var value = parseFloat(ctsi.itemvalue);
            var color = '#999';

            if (value < 40) {
              color = '#3498db';
            } else if (value <= 50) {
              color = '#27ae60';
            } else {
              color = '#f39c12';
            }

            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '2');

            var title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = '測站 ' + locationKey + '\n卡爾森指數: ' + value + '\n日期: ' + dates[0];
            circle.appendChild(title);
          }
        }
      }
    }
  });

  var serializer = new XMLSerializer();
  return serializer.serializeToString(svgDoc);
}

// Load water usage CSV data
function loadWaterUsageData(year) {
  return fetch('data/' + year + '.csv')
    .then(function (response) {
      if (!response.ok) return;
      return response.text();
    })
    .then(function (csvText) {
      if (!csvText) return;
      var lines = csvText.trim().split('\n');
      waterUsageData = {};

      for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        var parts = [];
        var current = '';
        var inQuotes = false;

        for (var j = 0; j < line.length; j++) {
          var ch = line[j];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            parts.push(current);
            current = '';
          } else {
            current += ch;
          }
        }
        parts.push(current);

        if (parts.length >= 5) {
          var name = parts[0];
          var agriculture = parseFloat(parts[2].replace(/,/g, '').replace(/-00/g, '0'));
          var domestic = parseFloat(parts[3].replace(/,/g, '').replace(/-00/g, '0'));
          var industrial = parseFloat(parts[4].replace(/,/g, '').replace(/-00/g, '0'));

          waterUsageData[name] = {
            agriculture: agriculture,
            domestic: domestic,
            industrial: industrial
          };
        }
      }
    })
    .catch(function () {
      console.log('Water usage data not available');
    });
}

// Load reservoir list and data
function loadReservoirs(year) {
  document.getElementById('loading').classList.add('show');

  return loadWaterUsageData('2024')
    .then(function () {
      return fetch('https://kiang.github.io/reservoir_data/json/' + year + '/list.json');
    })
    .then(function (response) {
      return response.json();
    })
    .then(function (list) {
      reservoirsList = list;
      reservoirsData = {};
      allReservoirsData = [];

      var promises = reservoirsList.map(function (reservoir) {
        return fetch('https://kiang.github.io/reservoir_data/json/' + year + '/' + reservoir + '.json')
          .then(function (r) { return r.json(); })
          .then(function (data) {
            reservoirsData[reservoir] = data;

            return fetch('shaps/' + reservoir + '.svg')
              .then(function (svgR) {
                if (!svgR.ok) return null;
                return svgR.text();
              })
              .then(function (svgContent) {
                if (svgContent) svgContent = processSVG(svgContent, data);
                allReservoirsData.push({
                  name: reservoir,
                  data: data,
                  svg: svgContent
                });
              })
              .catch(function () {
                allReservoirsData.push({
                  name: reservoir,
                  data: data,
                  svg: null
                });
              });
          })
          .catch(function (error) {
            console.error('Error loading ' + reservoir + ':', error);
          });
      });

      return Promise.all(promises);
    })
    .then(function () {
      // Sort by latest update date
      allReservoirsData.sort(function (a, b) {
        var latestDateA = null;
        var locationKeysA = Object.keys(a.data).filter(function (key) { return key !== 'name' && key !== 'svg'; });
        locationKeysA.forEach(function (locationKey) {
          var locationData = a.data[locationKey];
          if (locationData.data && Object.keys(locationData.data).length > 0) {
            var dates = Object.keys(locationData.data).sort().reverse();
            if (!latestDateA || dates[0] > latestDateA) latestDateA = dates[0];
          }
        });

        var latestDateB = null;
        var locationKeysB = Object.keys(b.data).filter(function (key) { return key !== 'name' && key !== 'svg'; });
        locationKeysB.forEach(function (locationKey) {
          var locationData = b.data[locationKey];
          if (locationData.data && Object.keys(locationData.data).length > 0) {
            var dates = Object.keys(locationData.data).sort().reverse();
            if (!latestDateB || dates[0] > latestDateB) latestDateB = dates[0];
          }
        });

        if (!latestDateA && !latestDateB) return 0;
        if (!latestDateA) return 1;
        if (!latestDateB) return -1;
        return latestDateB.localeCompare(latestDateA);
      });

      renderReservoirsGrid(allReservoirsData);
      document.getElementById('loading').classList.remove('show');
    })
    .catch(function (error) {
      console.error('Error loading reservoirs:', error);
      document.getElementById('loading').classList.remove('show');
    });
}

// Render reservoirs grid
function renderReservoirsGrid(reservoirs) {
  var grid = document.getElementById('reservoirsGrid');
  grid.innerHTML = '';

  if (reservoirs.length === 0) {
    grid.innerHTML = '<div class="no-data">找不到符合的水庫資料</div>';
    return;
  }

  reservoirs.forEach(function (reservoir) {
    var card = document.createElement('div');
    card.className = 'reservoir-card';
    card.onclick = function () {
      updateHash(currentYear, reservoir.name);
      showReservoirDetail(reservoir);
    };

    var cardHTML = '<h5>' + reservoir.name + '</h5>';

    if (reservoir.svg) {
      cardHTML += '<div class="reservoir-svg">' + reservoir.svg + '</div>';
    } else {
      cardHTML += '<div class="reservoir-svg"><div class="no-data">無圖形資料</div></div>';
    }

    cardHTML += '<div class="reservoir-info">';

    var usageData = waterUsageData[reservoir.name];
    if (usageData && (usageData.agriculture > 0 || usageData.domestic > 0 || usageData.industrial > 0)) {
      if (usageData.agriculture > 0) {
        cardHTML += '<div class="info-item"><span class="label">農業用水</span><span>' + usageData.agriculture.toLocaleString() + ' 萬噸</span></div>';
      }
      if (usageData.domestic > 0) {
        cardHTML += '<div class="info-item"><span class="label">生活用水</span><span>' + usageData.domestic.toLocaleString() + ' 萬噸</span></div>';
      }
      if (usageData.industrial > 0) {
        cardHTML += '<div class="info-item"><span class="label">工業用水</span><span>' + usageData.industrial.toLocaleString() + ' 萬噸</span></div>';
      }
    }

    var locationKeys = Object.keys(reservoir.data).filter(function (key) { return key !== 'name' && key !== 'svg'; });
    var hasData = false;

    if (locationKeys.length > 0) {
      var locationData = reservoir.data[locationKeys[0]];

      if (locationData.data && Object.keys(locationData.data).length > 0) {
        var dates = Object.keys(locationData.data).sort().reverse();
        var latestDate = dates[0];
        var latestData = locationData.data[latestDate];

        var ctsi = latestData.find(function (item) {
          return item.itemname === '卡爾森指數' || item.itemname === '卡爾森優養指數' || item.itemname === '卡爾森優養指數(CTSI)';
        });
        var ph = latestData.find(function (item) { return item.itemname === 'pH'; });

        if (ctsi) {
          cardHTML += '<div class="info-item"><span class="label">卡爾森指數</span><span>' + ctsi.itemvalue + '</span></div>';
          hasData = true;
        }
        if (ph) {
          cardHTML += '<div class="info-item"><span class="label">pH值</span><span>' + ph.itemvalue + '</span></div>';
          hasData = true;
        }

        if (hasData) {
          cardHTML += '<div class="info-item"><span class="label">更新日期</span><span>' + latestDate + '</span></div>';
        }
      }
    }

    if (!hasData && !usageData) {
      cardHTML += '<div class="no-data">目前無監測資料</div>';
    }

    cardHTML += '</div>';

    card.innerHTML = cardHTML;
    grid.appendChild(card);
  });
}

// Global variable to store current reservoir data for chart generation
var currentReservoirData = null;
var usageChartInstance = null;
var itemChartInstances = {};
var chartIdCounter = 0;
var chartClickInProgress = false;

// Show reservoir detail in modal
function showReservoirDetail(reservoir) {
  var modal = document.getElementById('detailModal');
  var modalBody = document.getElementById('modalBody');

  if (reservoirMap) {
    reservoirMap.remove();
    reservoirMap = null;
  }
  mapInitialized = false;
  mapMarkers = {};

  Object.values(itemChartInstances).forEach(function (chart) {
    if (chart) {
      try { chart.destroy(); } catch (e) { }
    }
  });
  itemChartInstances = {};

  currentReservoirData = reservoir;

  var html = '<h2 style="color: #667eea; margin-bottom: 20px; text-align: center;">' + reservoir.name + ' (' + currentYear + ')</h2>';

  var usageData = waterUsageData[reservoir.name];
  if (usageData && (usageData.agriculture > 0 || usageData.domestic > 0 || usageData.industrial > 0)) {
    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">' +
      '<h5 style="text-align: center; color: #667eea; margin-bottom: 15px;">供水用途分布</h5>' +
      '<div style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: wrap;">' +
      '<canvas id="usageChart" style="max-width: 250px; max-height: 250px;"></canvas>' +
      '<div style="display: flex; flex-direction: column; gap: 8px;">' +
      '<div><span style="display: inline-block; width: 20px; height: 20px; background: #27ae60; margin-right: 8px;"></span><strong>農業用水:</strong> ' + usageData.agriculture.toLocaleString() + ' 萬噸</div>' +
      '<div><span style="display: inline-block; width: 20px; height: 20px; background: #3498db; margin-right: 8px;"></span><strong>生活用水:</strong> ' + usageData.domestic.toLocaleString() + ' 萬噸</div>' +
      '<div><span style="display: inline-block; width: 20px; height: 20px; background: #f39c12; margin-right: 8px;"></span><strong>工業用水:</strong> ' + usageData.industrial.toLocaleString() + ' 萬噸</div>' +
      '</div></div></div>';
  }

  // View switcher
  html += '<div class="view-tabs">' +
    '<button class="view-tab-button active" data-view="svg">SVG 圖形</button>' +
    '<button class="view-tab-button" data-view="map">地理位置</button>' +
    '</div>';

  html += '<div class="view-content active" id="svgView">';
  if (reservoir.svg) {
    html += '<div class="modal-svg" id="modalSvg">' + reservoir.svg + '</div>';
  }
  html += '</div>';

  html += '<div class="view-content" id="mapView">';
  html += '<div id="modalMap" class="modal-map"></div>';
  html += '</div>';

  var locationKeys = Object.keys(reservoir.data).filter(function (key) { return key !== 'name' && key !== 'svg'; });
  var hasData = false;
  var allDates = [];

  if (locationKeys.length > 0) {
    html += '<h4 style="color: #28a745; margin-top: 20px;">監測站資料</h4>';

    if (locationKeys.length > 1) {
      html += '<div class="tabs-container"><div class="tabs-nav">';
      locationKeys.forEach(function (locationKey, index) {
        var activeClass = index === 0 ? 'active' : '';
        html += '<button class="tab-button ' + activeClass + '" data-tab="tab-' + locationKey + '">測站 ' + locationKey + '</button>';
      });
      html += '</div>';
    }

    locationKeys.forEach(function (locationKey, index) {
      var locationData = reservoir.data[locationKey];

      if (locationData.data && Object.keys(locationData.data).length > 0) {
        var dates = Object.keys(locationData.data).sort().reverse();
        allDates = allDates.concat(dates);
        var latestDate = dates[0];
        var activeClass = index === 0 ? 'active' : '';

        if (locationKeys.length > 1) {
          html += '<div class="tab-content ' + activeClass + '" id="tab-' + locationKey + '">';
        }

        html += '<div class="station-info">';
        html += '<p><strong>測站編號：</strong>' + locationKey + '</p>';
        html += '<p><strong>最新更新：</strong>' + latestDate + '</p>';
        html += '<p><strong>資料筆數：</strong>' + dates.length + ' 筆</p>';
        if (locationData.twd97lon && locationData.twd97lat) {
          html += '<p><strong>座標：</strong>' + locationData.twd97lat + ', ' + locationData.twd97lon + '</p>';
        }
        html += '</div>';

        if (dates.length > 1) {
          html += '<div class="tabs-container" style="margin-top: 15px;"><div class="tabs-nav">';
          dates.forEach(function (date, dateIndex) {
            var dateActiveClass = dateIndex === 0 ? 'active' : '';
            var dateLabel = dateIndex === 0 ? '最新 ' + date : date;
            html += '<button class="tab-button date-tab ' + dateActiveClass + '" data-tab="date-' + locationKey + '-' + dateIndex + '">' + dateLabel + '</button>';
          });
          html += '</div>';
        }

        dates.forEach(function (date, dateIndex) {
          var dateData = locationData.data[date];
          var dateActiveClass = dateIndex === 0 ? 'active' : '';

          if (dates.length > 1) {
            html += '<div class="tab-content ' + dateActiveClass + '" id="date-' + locationKey + '-' + dateIndex + '">';
          } else {
            html += '<div style="margin-top: 15px;">';
          }

          var measurements = {};
          dateData.forEach(function (item) {
            if (!measurements[item.itemname]) measurements[item.itemname] = [];
            measurements[item.itemname].push(item);
          });

          html += '<table class="data-table">';
          html += '<thead><tr><th>監測項目</th><th>數值</th><th>單位</th><th>採樣深度</th></tr></thead>';
          html += '<tbody>';

          Object.entries(measurements).forEach(function (entry) {
            entry[1].forEach(function (item) {
              var depthKey = item.sampledepth || 'default';
              var layerKey = item.samplelayer || 'default';
              html += '<tr class="data-row" data-location="' + locationKey + '" data-item="' + item.itemname + '" data-depth="' + depthKey + '" data-layer="' + layerKey + '" data-unit="' + item.itemunit + '">' +
                '<td><strong>' + item.itemname + '</strong></td>' +
                '<td>' + item.itemvalue + '</td>' +
                '<td>' + item.itemunit + '</td>' +
                '<td>' + (item.sampledepth || '-') + ' ' + (item.samplelayer || '') + '</td>' +
                '</tr>';
            });
          });

          html += '</tbody></table></div>';
        });

        if (dates.length > 1) {
          html += '</div>';
        }

        if (locationKeys.length > 1) {
          html += '</div>';
        }

        hasData = true;
      }
    });

    if (locationKeys.length > 1) {
      html += '</div>';
    }

    if (allDates.length > 1) {
      var uniqueDates = allDates.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort().reverse();
      html += '<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">' +
        '<strong>歷史資料：</strong><br>' +
        '共有 ' + uniqueDates.length + ' 筆監測資料<br>' +
        '最早：' + uniqueDates[uniqueDates.length - 1] + '<br>' +
        '最新：' + uniqueDates[0] +
        '</div>';
    }
  }

  if (!hasData) {
    html += '<div class="no-data" style="margin-top: 20px; padding: 30px;">目前無監測資料</div>';
  }

  modalBody.innerHTML = html;
  modal.classList.add('show');

  // Create water usage pie chart
  if (usageData && (usageData.agriculture > 0 || usageData.domestic > 0 || usageData.industrial > 0)) {
    setTimeout(function () {
      var canvas = document.getElementById('usageChart');
      if (canvas) {
        if (usageChartInstance) usageChartInstance.destroy();

        var ctx = canvas.getContext('2d');
        var total = usageData.agriculture + usageData.domestic + usageData.industrial;
        var chartData = [];
        var labels = [];
        var colors = [];

        if (usageData.agriculture > 0) {
          chartData.push(usageData.agriculture);
          labels.push('農業用水 (' + ((usageData.agriculture / total) * 100).toFixed(1) + '%)');
          colors.push('#27ae60');
        }
        if (usageData.domestic > 0) {
          chartData.push(usageData.domestic);
          labels.push('生活用水 (' + ((usageData.domestic / total) * 100).toFixed(1) + '%)');
          colors.push('#3498db');
        }
        if (usageData.industrial > 0) {
          chartData.push(usageData.industrial);
          labels.push('工業用水 (' + ((usageData.industrial / total) * 100).toFixed(1) + '%)');
          colors.push('#f39c12');
        }

        usageChartInstance = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{ data: chartData, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return (context.label || '') + ': ' + context.parsed.toLocaleString() + ' 萬噸';
                  }
                }
              }
            }
          }
        });
      }
    }, 100);
  }

  // Add event handlers after render
  setTimeout(function () {
    // View switcher
    document.querySelectorAll('.view-tab-button').forEach(function (button) {
      button.addEventListener('click', function () {
        switchView(this.getAttribute('data-view'), reservoir, locationKeys);
      });
    });

    // SVG circle clicks
    var svgContainer = document.getElementById('modalSvg');
    if (svgContainer) {
      svgContainer.querySelectorAll('circle[id^="Dam_S"]').forEach(function (circle) {
        circle.addEventListener('click', function (e) {
          e.stopPropagation();
          var match = this.getAttribute('id').match(/Dam_S(\d+)/);
          if (match) {
            moveMarkToCircle(svgContainer, circle);
            activateTab(match[1]);
          }
        });
      });
    }

    // Station tab buttons
    document.querySelectorAll('.tab-button:not(.date-tab)').forEach(function (button) {
      button.addEventListener('click', function () {
        var locationKey = this.getAttribute('data-tab').replace('tab-', '');
        activateTabByButton(this);
        var circle = document.querySelector('#modalSvg circle[id="Dam_S' + locationKey + '"]');
        if (circle) moveMarkToCircle(document.getElementById('modalSvg'), circle);
      });
    });

    // Date tab buttons
    document.querySelectorAll('.tab-button.date-tab').forEach(function (button) {
      button.addEventListener('click', function () { activateTabByButton(this); });
    });

    // Data row clicks for charts
    document.querySelectorAll('.data-row').forEach(function (row) {
      row.addEventListener('click', function () {
        showItemChart(
          this.getAttribute('data-location'),
          this.getAttribute('data-item'),
          this.getAttribute('data-depth'),
          this.getAttribute('data-layer'),
          this.getAttribute('data-unit'),
          this
        );
      });
    });
  }, 100);
}

// Show line chart for selected monitoring item
function showItemChart(locationKey, itemName, depth, layer, unit, clickedRow) {
  if (chartClickInProgress) return;
  chartClickInProgress = true;
  setTimeout(function () { chartClickInProgress = false; }, 500);

  if (!currentReservoirData) return;

  var locationData = currentReservoirData.data[locationKey];
  if (!locationData || !locationData.data) return;

  var existingChart = clickedRow.nextElementSibling;
  if (existingChart && existingChart.classList.contains('chart-row')) {
    var existingChartId = existingChart.getAttribute('data-chart-id');
    if (existingChartId && itemChartInstances[existingChartId]) {
      itemChartInstances[existingChartId].destroy();
      delete itemChartInstances[existingChartId];
    }
    existingChart.remove();
    return;
  }

  var chartId = 'chart-' + (chartIdCounter++) + '-' + locationKey + '-' + itemName.replace(/[^a-zA-Z0-9]/g, '');

  var dates = Object.keys(locationData.data).sort();
  var chartData = [];

  dates.forEach(function (date) {
    var dateData = locationData.data[date];
    var item = dateData.find(function (d) {
      return d.itemname === itemName && (d.sampledepth || 'default') === depth && (d.samplelayer || 'default') === layer;
    });
    if (item && item.itemvalue !== null && item.itemvalue !== undefined) {
      chartData.push({ date: date, value: parseFloat(item.itemvalue) });
    }
  });

  if (chartData.length === 0) return;

  var depthLabel = depth !== 'default' ? ' (深度: ' + depth + (layer !== 'default' ? ' ' + layer : '') + ')' : '';
  var chartTitle = itemName + depthLabel + ' 歷史趨勢';

  var chartRow = document.createElement('tr');
  chartRow.className = 'chart-row';
  chartRow.setAttribute('data-chart-id', chartId);
  chartRow.innerHTML = '<td colspan="4"><div class="chart-container"><span class="chart-close">&times;</span>' +
    '<h6 style="margin: 0 0 15px 0; color: #667eea;">' + chartTitle + '</h6>' +
    '<canvas id="' + chartId + '"></canvas></div></td>';

  if (clickedRow && clickedRow.parentNode) {
    clickedRow.parentNode.insertBefore(chartRow, clickedRow.nextSibling);
  } else {
    return;
  }

  chartRow.querySelector('.chart-close').addEventListener('click', function () {
    if (itemChartInstances[chartId]) {
      itemChartInstances[chartId].destroy();
      delete itemChartInstances[chartId];
    }
    chartRow.remove();
  });

  var canvas = chartRow.querySelector('canvas');
  if (!canvas) return;

  if (itemChartInstances[chartId]) itemChartInstances[chartId].destroy();

  try {
    itemChartInstances[chartId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: chartData.map(function (d) { return d.date; }),
        datasets: [{
          label: itemName + ' (' + unit + ')',
          data: chartData.map(function (d) { return d.value; }),
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
        plugins: { legend: { display: true, position: 'top' }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          y: { beginAtZero: false, title: { display: true, text: unit } },
          x: { title: { display: true, text: '監測日期' }, ticks: { maxRotation: 45, minRotation: 45 } }
        }
      }
    });
  } catch (error) {
    console.error('Error creating chart:', error);
  }
}

// Map for water quality modal
var reservoirMap = null;
var mapMarkers = {};
var mapInitialized = false;

function switchView(view, reservoir, locationKeys) {
  document.querySelectorAll('.view-tab-button').forEach(function (btn) { btn.classList.remove('active'); });
  document.querySelector('.view-tab-button[data-view="' + view + '"]').classList.add('active');

  document.querySelectorAll('.view-content').forEach(function (content) { content.classList.remove('active'); });

  if (view === 'svg') {
    document.getElementById('svgView').classList.add('active');
  } else if (view === 'map') {
    document.getElementById('mapView').classList.add('active');
    if (!mapInitialized) {
      setTimeout(function () {
        initializeReservoirMap(reservoir, locationKeys);
        mapInitialized = true;
      }, 100);
    } else if (reservoirMap) {
      setTimeout(function () { reservoirMap.invalidateSize(); }, 100);
    }
  }
}

function initializeReservoirMap(reservoir, locationKeys) {
  var mapContainer = document.getElementById('modalMap');
  if (!mapContainer) return;

  var bounds = [];
  var centerLat = 0;
  var centerLon = 0;
  var validLocations = 0;

  locationKeys.forEach(function (locationKey) {
    var locationData = reservoir.data[locationKey];
    if (locationData && locationData.twd97lat && locationData.twd97lon) {
      var lat = parseFloat(locationData.twd97lat);
      var lon = parseFloat(locationData.twd97lon);
      bounds.push([lat, lon]);
      centerLat += lat;
      centerLon += lon;
      validLocations++;
    }
  });

  if (validLocations === 0) return;

  centerLat /= validLocations;
  centerLon /= validLocations;

  reservoirMap = L.map('modalMap').setView([centerLat, centerLon], 14);

  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>',
    maxZoom: 18
  }).addTo(reservoirMap);

  locationKeys.forEach(function (locationKey) {
    var locationData = reservoir.data[locationKey];
    if (locationData && locationData.twd97lat && locationData.twd97lon) {
      var lat = parseFloat(locationData.twd97lat);
      var lon = parseFloat(locationData.twd97lon);

      var markerColor = '#999';
      if (locationData.data) {
        var dates = Object.keys(locationData.data).sort().reverse();
        if (dates.length > 0) {
          var latestData = locationData.data[dates[0]];
          var ctsi = latestData.find(function (item) {
            return item.itemname === '卡爾森指數' || item.itemname === '卡爾森優養指數' || item.itemname === '卡爾森優養指數(CTSI)';
          });

          if (ctsi) {
            var value = parseFloat(ctsi.itemvalue);
            if (value < 40) markerColor = '#3498db';
            else if (value <= 50) markerColor = '#27ae60';
            else markerColor = '#f39c12';
          }
        }
      }

      var markerIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: ' + markerColor + '; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      var marker = L.marker([lat, lon], { icon: markerIcon }).addTo(reservoirMap);
      marker.bindPopup('<strong>測站 ' + locationKey + '</strong><br>點擊切換至此測站資料');

      marker.on('click', function () {
        activateTab(locationKey);
        var circle = document.querySelector('#modalSvg circle[id="Dam_S' + locationKey + '"]');
        if (circle) moveMarkToCircle(document.getElementById('modalSvg'), circle);
      });

      mapMarkers[locationKey] = marker;
    }
  });

  if (bounds.length > 1) {
    reservoirMap.fitBounds(bounds, { padding: [50, 50] });
  }
}

function moveMarkToCircle(svgContainer, circle) {
  var svg = svgContainer.querySelector('svg');
  if (!svg) return;

  var markGroup = svg.querySelector('#Mark');
  if (!markGroup) return;

  var cx = parseFloat(circle.getAttribute('cx'));
  var cy = parseFloat(circle.getAttribute('cy'));

  var gMark = markGroup.querySelector('#gMark');
  if (gMark) {
    gMark.setAttribute('transform', 'translate(' + cx + ', ' + cy + ') translate(-14, -14)');
  }
}

function activateTab(locationKey) {
  var tabButton = document.querySelector('.tab-button[data-tab="tab-' + locationKey + '"]');
  if (tabButton) activateTabByButton(tabButton);
}

function activateTabByButton(button) {
  var tabId = button.getAttribute('data-tab');
  var isDateTab = button.classList.contains('date-tab');

  if (isDateTab) {
    var parentContainer = button.closest('.tabs-container');
    if (parentContainer) {
      parentContainer.querySelectorAll('.tab-button').forEach(function (btn) { btn.classList.remove('active'); });
      parentContainer.querySelectorAll('.tab-content').forEach(function (content) { content.classList.remove('active'); });
    }
  } else {
    document.querySelectorAll('.tab-button:not(.date-tab)').forEach(function (btn) { btn.classList.remove('active'); });
    document.querySelectorAll('.tab-content[id^="tab-"]').forEach(function (content) { content.classList.remove('active'); });
  }

  button.classList.add('active');
  var tabContent = document.getElementById(tabId);
  if (tabContent) tabContent.classList.add('active');
}

// Close modal
document.getElementById('modalClose').addEventListener('click', function () {
  document.getElementById('detailModal').classList.remove('show');
  updateHash(currentYear, null);
});

document.getElementById('detailModal').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('show');
    updateHash(currentYear, null);
  }
});

// Year selector
document.getElementById('yearSelect').addEventListener('change', function (e) {
  var newYear = e.target.value;
  var oldHash = window.location.hash;
  updateHash(newYear, null);

  setTimeout(function () {
    if (window.location.hash === oldHash && newYear !== currentYear) {
      currentYear = newYear;
      document.getElementById('detailModal').classList.remove('show');
      loadReservoirs(currentYear).then(function () {
        var searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm !== '') {
          var filtered = allReservoirsData.filter(function (reservoir) {
            return reservoir.name.toLowerCase().includes(searchTerm);
          });
          renderReservoirsGrid(filtered);
        }
      });
    }
  }, 10);
});

// Search functionality for water quality
document.getElementById('searchInput').addEventListener('input', function (e) {
  var searchTerm = e.target.value.toLowerCase().trim();

  if (searchTerm === '') {
    renderReservoirsGrid(allReservoirsData);
  } else {
    var filtered = allReservoirsData.filter(function (reservoir) {
      return reservoir.name.toLowerCase().includes(searchTerm);
    });
    renderReservoirsGrid(filtered);
  }
});

// Parse URL hash
function parseHash() {
  var hash = window.location.hash.substring(1);
  if (!hash) return { year: currentYear, reservoir: null };

  var parts = hash.split('/');
  var parsedYear = currentYear;

  if (parts.length >= 1 && parts[0]) {
    if (['2019', '2020', '2021', '2022', '2023', '2024', '2025'].includes(parts[0])) {
      parsedYear = parts[0];
    }
  }

  return {
    year: parsedYear,
    reservoir: parts.length >= 2 ? decodeURIComponent(parts[1]) : null
  };
}

function updateHash(year, reservoir) {
  if (reservoir) {
    window.location.hash = year + '/' + encodeURIComponent(reservoir);
  } else {
    window.location.hash = year;
  }
}

window.addEventListener('hashchange', function () {
  var params = parseHash();
  if (params.year !== currentYear) {
    currentYear = params.year;
    document.getElementById('yearSelect').value = currentYear;
    document.getElementById('detailModal').classList.remove('show');
    loadReservoirs(currentYear).then(function () {
      var searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
      if (searchTerm !== '') {
        var filtered = allReservoirsData.filter(function (reservoir) {
          return reservoir.name.toLowerCase().includes(searchTerm);
        });
        renderReservoirsGrid(filtered);
      }

      if (params.reservoir) openReservoirByName(params.reservoir);
    });
  } else if (params.reservoir) {
    openReservoirByName(params.reservoir);
  } else {
    document.getElementById('detailModal').classList.remove('show');
  }
});

function openReservoirByName(name) {
  var reservoir = allReservoirsData.find(function (r) { return r.name === name; });
  if (reservoir) showReservoirDetail(reservoir);
}
