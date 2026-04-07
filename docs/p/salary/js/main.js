// ── Formatting ─────────────────────────────────────────────────────────────
// Values in data are 千元. Divide by 10 → 萬元.
function fmtWan(val) {
    if (val === null || val === undefined || val === 0) return '—';
    const wan = val / 10;
    if (wan >= 10000) return (wan / 10000).toFixed(1) + ' 億';
    if (wan >= 1000)  return (wan / 1000).toFixed(2) + ' 億';
    return wan.toFixed(1) + ' 萬';
}
function fmtNum(val) {
    if (!val) return '—';
    return Number(val).toLocaleString();
}

// ── State ──────────────────────────────────────────────────────────────────
const LABEL_ZOOM = 13;
let map, geoLayer, currentChart = null;
let cunliSalary = {};
let geoData = null;
let featureBounds = [];   // [{ feature, minLat, maxLat, minLng, maxLng, layer? }]
let layerCache = {};      // { VILLCODE: L.layer } — reuse layers across viewport updates
let countrySort   = {};   // { VILLCODE: { year: { metric: rank } } }
let sortedRanks   = {};   // { year: { metric: [villcode sorted desc] } }
let cunliListPool = {};   // { year: { metric: { value: [VILLCODE...] } } }
let villageNames  = {};   // { VILLCODE: fullName }
let totalVillages = 0;

let currentYear   = '2023';
let currentMetric = 'mid';
let currentMode   = 'snapshot';   // snapshot | change | inequality
let baseYear      = '2016';
let currentVillcode = '';
let selectedLayer = null;
let geolocationCentered = false;

const METRICS = { avg: '平均數', mid: '中位數', sd: '標準差', mid1: 'Q1', mid3: 'Q3' };
const YEARS   = ['2023','2022','2021','2020','2019','2018','2017','2016','2015','2014','2013','2012','2011'];

// ── Color scales ───────────────────────────────────────────────────────────
// Snapshot: orange-red scale (values in 千元, thresholds match original)
// Snapshot: YlGnBu — yellow (low income) → teal → dark blue (high income)
// Visually distinct from red-based change/inequality modes
const SNAPSHOT_COLORS = [
    { max: 300,      fill: 'rgba(255,255,204,0.85)' },
    { max: 400,      fill: 'rgba(199,233,180,0.85)' },
    { max: 500,      fill: 'rgba(127,205,187,0.85)' },
    { max: 700,      fill: 'rgba(65,182,196,0.85)'  },
    { max: 900,      fill: 'rgba(29,145,192,0.85)'  },
    { max: 1100,     fill: 'rgba(34,94,168,0.85)'   },
    { max: 1300,     fill: 'rgba(37,52,148,0.85)'   },
    { max: 1500,     fill: 'rgba(8,29,88,0.85)'     },
    { max: Infinity, fill: 'rgba(2,10,50,0.9)'      }
];

function snapshotColor(val) {
    if (!val) return 'rgba(210,210,210,0.5)';
    for (const c of SNAPSHOT_COLORS) { if (val <= c.max) return c.fill; }
    return 'rgba(2,10,50,0.9)';
}

// Change: RdBu diverging — red (decline) / blue (growth), neutral at zero
function changeColor(delta) {
    if (delta === null) return 'rgba(200,200,200,0.6)';
    if (delta >  120) return 'rgba(33,102,172,0.85)';
    if (delta >   90) return 'rgba(67,147,195,0.85)';
    if (delta >   60) return 'rgba(146,197,222,0.85)';
    if (delta >   30) return 'rgba(209,229,240,0.85)';
    if (delta >=   0) return 'rgba(234,243,248,0.85)';
    if (delta > -30)  return 'rgba(253,219,199,0.85)';
    if (delta > -60)  return 'rgba(244,165,130,0.85)';
    if (delta > -90)  return 'rgba(214,96,77,0.85)';
    if (delta > -120) return 'rgba(178,24,43,0.85)';
    return 'rgba(103,0,31,0.9)';
}

// Inequality: YlOrRd — yellow (low CV/equal) → orange → red (high CV/unequal)
function inequalityColor(cv) {
    if (!cv) return 'rgba(210,210,210,0.5)';
    if (cv <=  60) return 'rgba(255,255,178,0.85)';
    if (cv <=  80) return 'rgba(254,204,92,0.85)';
    if (cv <= 100) return 'rgba(253,141,60,0.85)';
    if (cv <= 120) return 'rgba(240,59,32,0.85)';
    if (cv <= 150) return 'rgba(189,0,38,0.85)';
    return 'rgba(100,0,20,0.9)';
}

// ── Map init ───────────────────────────────────────────────────────────────
function initMap() {
    map = L.map('map', { preferCanvas: true }).setView([23.97, 120.97], 8);
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '© <a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪中心</a>',
        opacity: 0.7
    }).addTo(map);

    const posMarker = L.circleMarker([0, 0], {
        radius: 8, color: '#fff', weight: 2, fillColor: '#3399CC', fillOpacity: 1
    });
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
            const ll = [pos.coords.latitude, pos.coords.longitude];
            posMarker.setLatLng(ll).addTo(map);
            if (!geolocationCentered) { map.setView(ll, 14); geolocationCentered = true; }
        }, null, { enableHighAccuracy: true });
    }
    map.on('zoomend', updateLabelVisibility);
}

// ── TopoJSON → GeoJSON ─────────────────────────────────────────────────────
function topoToGeoJSON(topo) {
    const objName = Object.keys(topo.objects)[0];
    const obj = topo.objects[objName];
    const { scale, translate } = topo.transform;
    const decodedArcs = topo.arcs.map(arc => {
        let x = 0, y = 0;
        return arc.map(pt => [
            (x += pt[0]) * scale[0] + translate[0],
            (y += pt[1]) * scale[1] + translate[1]
        ]);
    });
    const getArc = i => i >= 0 ? decodedArcs[i].slice() : decodedArcs[~i].slice().reverse();
    const ring2coords = ring => {
        let c = [];
        for (const i of ring) { const a = getArc(i); if (c.length) a.shift(); c = c.concat(a); }
        return c;
    };
    const features = obj.geometries.map(geom => {
        if (!geom) return null;
        let geometry;
        if (geom.type === 'Polygon')
            geometry = { type: 'Polygon', coordinates: geom.arcs.map(ring2coords) };
        else if (geom.type === 'MultiPolygon')
            geometry = { type: 'MultiPolygon', coordinates: geom.arcs.map(p => p.map(ring2coords)) };
        else return null;
        return { type: 'Feature', properties: geom.properties || {}, geometry };
    }).filter(Boolean);
    return { type: 'FeatureCollection', features };
}

// ── Data loading ──────────────────────────────────────────────────────────
async function loadData() {
    try {
        const [salaryRes, geoRes] = await Promise.all([
            fetch('https://kiang.github.io/salary/map/fia_data.json'),
            fetch('https://kiang.github.io/taiwan_basecode/cunli/topo/20210324.json')
        ]);
        cunliSalary = await salaryRes.json();
        geoData = topoToGeoJSON(await geoRes.json());

        buildIndexes();
        buildFeatureBounds();

        // Extract village names
        for (const feat of geoData.features) {
            const p = feat.properties;
            if (p.VILLCODE) {
                const name = p.COUNTYNAME + p.TOWNNAME + p.VILLNAME;
                villageNames[p.VILLCODE] = name;
                if (countrySort[p.VILLCODE]) countrySort[p.VILLCODE].name = name;
            }
        }
        totalVillages = Object.keys(countrySort).length;

        renderLayer();
        updateRankingList();
        document.getElementById('loading').style.display = 'none';
        applyHash();
    } catch (err) {
        document.getElementById('loading').innerHTML =
            '<div style="color:#c0392b;">載入失敗：' + err.message + '</div>';
        console.error(err);
    }
}

function buildIndexes() {
    for (const vc in cunliSalary) {
        countrySort[vc] = { name: '' };
        for (const year in cunliSalary[vc]) {
            countrySort[vc][year] = {};
            if (!cunliListPool[year]) cunliListPool[year] = {};
            for (const key in cunliSalary[vc][year]) {
                if (!cunliListPool[year][key]) cunliListPool[year][key] = {};
                const val = cunliSalary[vc][year][key];
                if (!cunliListPool[year][key][val]) cunliListPool[year][key][val] = [];
                cunliListPool[year][key][val].push(vc);
            }
        }
    }
    // Build sorted rank arrays per year/metric
    for (const year in cunliListPool) {
        sortedRanks[year] = {};
        for (const key in cunliListPool[year]) {
            const vals = Object.keys(cunliListPool[year][key]).map(Number).sort((a, b) => b - a);
            let rank = 1;
            sortedRanks[year][key] = [];
            for (const v of vals) {
                for (const vc of cunliListPool[year][key][v]) {
                    countrySort[vc][year][key] = rank;
                    sortedRanks[year][key].push(vc);
                }
                rank += cunliListPool[year][key][v].length;
            }
        }
    }
}

// ── Rank / percentile helpers ─────────────────────────────────────────────
function getRank(vc, year, metric) {
    return countrySort[vc] && countrySort[vc][year] ? countrySort[vc][year][metric] || 0 : 0;
}
function getPercentile(rank) {
    if (!rank || !totalVillages) return null;
    return ((1 - rank / totalVillages) * 100).toFixed(0);
}

// ── Feature styling ────────────────────────────────────────────────────────
function featureColor(feature) {
    const vc = feature.properties.VILLCODE;
    const d = cunliSalary[vc];
    if (currentMode === 'snapshot') {
        const val = d && d[currentYear] ? d[currentYear][currentMetric] : 0;
        return snapshotColor(val);
    }
    if (currentMode === 'change') {
        if (!d || !d[currentYear] || !d[baseYear]) return 'rgba(200,200,200,0.6)';
        const delta = d[currentYear][currentMetric] - d[baseYear][currentMetric];
        return changeColor(delta);
    }
    if (currentMode === 'inequality') {
        const val = d && d[currentYear] ? d[currentYear].cv : 0;
        return inequalityColor(val);
    }
    return 'rgba(200,200,200,0.5)';
}

function getFeatureStyle(feature) {
    return { fillColor: featureColor(feature), weight: 0.5, color: 'rgba(0,0,0,0.35)', fillOpacity: 0.8 };
}

// ── Layer ─────────────────────────────────────────────────────────────────

// Pre-compute bounding box for each feature (called once after geoData is ready)
function buildFeatureBounds() {
    featureBounds = geoData.features.map(feature => {
        const coords = [];
        function collect(c) {
            if (Array.isArray(c[0])) { c.forEach(collect); }
            else { coords.push(c); }
        }
        collect(feature.geometry.coordinates);
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        for (const [lng, lat] of coords) {
            if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
        }
        return { feature, minLat, maxLat, minLng, maxLng };
    });
}

function makeLayer(feature) {
    const vc = feature.properties.VILLCODE;
    const layer = L.geoJSON(feature, { style: getFeatureStyle });
    // L.geoJSON wraps in a FeatureGroup; get the actual path layer
    let path;
    layer.eachLayer(l => { path = l; });
    path.feature = feature;
    path.on({
        mouseover(e) {
            if (e.target !== selectedLayer)
                e.target.setStyle({ weight: 2, color: '#1a252f', fillOpacity: 0.95 });
            e.target.bringToFront();
        },
        mouseout(e) {
            if (e.target !== selectedLayer) {
                e.target.setStyle(getFeatureStyle(feature));
            }
        },
        click() { selectVillage(feature, path); }
    });
    path.bindPopup(() => buildPopup(feature), { maxWidth: 260 });
    path.bindTooltip(feature.properties.VILLNAME, {
        permanent: true, direction: 'center', className: 'cunli-label'
    });
    layerCache[vc] = path;
    return path;
}

function renderLayer() {
    if (!geoLayer) {
        geoLayer = L.layerGroup().addTo(map);
        map.on('moveend', updateViewport);
    }
    // Clear existing layers from group but keep layerCache for reuse
    geoLayer.clearLayers();
    // Reset selected if any
    if (selectedLayer) selectedLayer = null;
    updateViewport();
}

function updateViewport() {
    if (!geoData || !geoLayer) return;
    const bounds = map.getBounds();
    const s = bounds.getSouth(), n = bounds.getNorth();
    const w = bounds.getWest(),  e = bounds.getEast();

    // Track which VILLCODEs should be visible
    const visible = new Set();
    for (const fb of featureBounds) {
        if (fb.maxLat < s || fb.minLat > n || fb.maxLng < w || fb.minLng > e) continue;
        visible.add(fb.feature.properties.VILLCODE);
    }

    // Remove layers no longer in viewport (except selectedLayer)
    const toRemove = [];
    geoLayer.eachLayer(layer => {
        const vc = layer.feature && layer.feature.properties.VILLCODE;
        if (vc && !visible.has(vc) && layer !== selectedLayer) toRemove.push(layer);
    });
    toRemove.forEach(l => geoLayer.removeLayer(l));

    // Add new layers that entered the viewport
    const existing = new Set();
    geoLayer.eachLayer(layer => {
        if (layer.feature) existing.add(layer.feature.properties.VILLCODE);
    });

    for (const fb of featureBounds) {
        const vc = fb.feature.properties.VILLCODE;
        if (!visible.has(vc) || existing.has(vc)) continue;
        const layer = layerCache[vc] || makeLayer(fb.feature);
        geoLayer.addLayer(layer);
    }

    updateLabelVisibility();
}

function updateLabelVisibility() {
    if (!geoLayer) return;
    const show = map.getZoom() >= LABEL_ZOOM;
    geoLayer.eachLayer(layer => {
        const tt = layer.getTooltip ? layer.getTooltip() : null;
        if (tt) show ? layer.openTooltip() : layer.closeTooltip();
    });
}

function refreshStyles() {
    if (!geoLayer) return;
    geoLayer.eachLayer(layer => {
        if (layer !== selectedLayer && layer.feature) layer.setStyle(getFeatureStyle(layer.feature));
    });
    updateRankingList();
}

// ── Popup ─────────────────────────────────────────────────────────────────
function buildPopup(feature) {
    const vc = feature.properties.VILLCODE;
    const p  = feature.properties;
    const d  = cunliSalary[vc];
    const name = p.COUNTYNAME + p.TOWNNAME + p.VILLNAME;

    let html = '<div class="popup-name">' + name + '</div>';

    if (!d || !d[currentYear]) {
        html += '<div style="color:#aaa;font-size:12px;">無資料</div>';
        return html;
    }

    const yr = d[currentYear];

    if (currentMode === 'snapshot') {
        const rank = getRank(vc, currentYear, currentMetric);
        const pct  = getPercentile(rank);
        html += '<div class="popup-stat"><span class="label">' + METRICS[currentMetric] + '</span><span class="value">' + fmtWan(yr[currentMetric]) + '</span></div>';
        if (currentMetric !== 'mid') html += '<div class="popup-stat"><span class="label">中位數</span><span class="value">' + fmtWan(yr.mid) + '</span></div>';
        if (currentMetric !== 'avg') html += '<div class="popup-stat"><span class="label">平均數</span><span class="value">' + fmtWan(yr.avg) + '</span></div>';
        html += '<div class="popup-stat"><span class="label">納稅單位</span><span class="value">' + fmtNum(yr.adm) + '</span></div>';
        if (rank) html += '<div class="popup-rank">全國第 ' + rank + ' 名 · 前 ' + pct + '%</div>';
    } else if (currentMode === 'change') {
        const base = d[baseYear];
        if (base) {
            const delta = yr[currentMetric] - base[currentMetric];
            const cls   = delta >= 0 ? 'popup-change-pos' : 'popup-change-neg';
            const sign  = delta >= 0 ? '+' : '';
            html += '<div class="popup-stat"><span class="label">' + currentYear + ' ' + METRICS[currentMetric] + '</span><span class="value">' + fmtWan(yr[currentMetric]) + '</span></div>';
            html += '<div class="popup-stat"><span class="label">' + baseYear + ' ' + METRICS[currentMetric] + '</span><span class="value">' + fmtWan(base[currentMetric]) + '</span></div>';
            html += '<div class="popup-stat"><span class="label">變化</span><span class="value ' + cls + '">' + sign + fmtWan(delta) + '</span></div>';
        }
    } else if (currentMode === 'inequality') {
        html += '<div class="popup-stat"><span class="label">變異係數 CV</span><span class="value">' + (yr.cv || '—') + '%</span></div>';
        html += '<div class="popup-stat"><span class="label">中位數</span><span class="value">' + fmtWan(yr.mid) + '</span></div>';
        html += '<div class="popup-stat"><span class="label">平均數</span><span class="value">' + fmtWan(yr.avg) + '</span></div>';
        html += '<div class="popup-stat"><span class="label">Q1 / Q3</span><span class="value">' + fmtWan(yr.mid1) + ' / ' + fmtWan(yr.mid3) + '</span></div>';
    }
    return html;
}

// ── Village selection ─────────────────────────────────────────────────────
function selectVillage(feature, layer) {
    if (selectedLayer && selectedLayer !== layer) selectedLayer.setStyle(getFeatureStyle(selectedLayer.feature));
    selectedLayer = layer;
    layer.setStyle({ weight: 3, color: '#e74c3c', fillColor: 'rgba(255,230,50,0.65)', fillOpacity: 0.9 });
    layer.bringToFront();

    const vc = feature.properties.VILLCODE;
    currentVillcode = vc;
    map.fitBounds(layer.getBounds(), { maxZoom: 16 });
    geolocationCentered = true;

    showVillageDetail(feature.properties, vc);
    activateTab('village');
    history.replaceState(null, '', '#' + currentYear + '/' + currentMetric + '/' + vc);
}

// ── Village detail panel ───────────────────────────────────────────────────
function showVillageDetail(props, vc) {
    const container = document.getElementById('village-detail');
    const name = villageNames[vc] || (props.COUNTYNAME + props.TOWNNAME + props.VILLNAME);
    const data = cunliSalary[vc];

    if (!data) {
        container.innerHTML = '<p class="detail-name">' + name + '</p><p style="color:#aaa;">無所得資料</p>';
        return;
    }

    const yr   = data[currentYear] || {};
    const rank = getRank(vc, currentYear, currentMetric);
    const pct  = getPercentile(rank);

    let html = '<p class="detail-name">' + name + '</p>';

    // Rank badges
    if (rank) {
        html += '<div class="detail-rank">'
            + '<div class="rank-badge"><strong>#' + rank + '</strong><span>' + currentYear + '/' + METRICS[currentMetric] + '</span></div>'
            + '<div class="rank-badge"><strong>前 ' + pct + '%</strong><span>全國村里</span></div>';
        if (yr.cv) html += '<div class="rank-badge"><strong>CV ' + yr.cv + '%</strong><span>差距指數</span></div>';
        html += '</div>';
    }

    // Chart
    html += '<canvas id="village-chart" height="160"></canvas>';

    // Full table
    const years = Object.keys(data).sort((a, b) => b - a);
    html += '<div class="detail-table-wrap"><table class="detail-table"><thead><tr>'
        + '<th>年</th><th>中位</th><th>平均</th><th>Q1</th><th>Q3</th><th>CV%</th><th>排名</th>'
        + '</tr></thead><tbody>';
    for (const y of years) {
        const d = data[y];
        const r = countrySort[vc] && countrySort[vc][y] ? countrySort[vc][y][currentMetric] : '—';
        const cls = y === currentYear ? 'class="current-year"' : '';
        html += '<tr ' + cls + '>'
            + '<td>' + y + '</td>'
            + '<td>' + fmtWan(d.mid) + '</td>'
            + '<td>' + fmtWan(d.avg) + '</td>'
            + '<td>' + fmtWan(d.mid1) + '</td>'
            + '<td>' + fmtWan(d.mid3) + '</td>'
            + '<td>' + (d.cv || '—') + '</td>'
            + '<td>' + (r || '—') + '</td>'
            + '</tr>';
    }
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Build chart (ascending order for left→right time axis)
    if (currentChart) { currentChart.destroy(); currentChart = null; }
    const ctx = document.getElementById('village-chart');
    if (ctx) {
        const labels = years.slice().reverse();
        currentChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '中位數', borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)',
                      data: labels.map(y => data[y] ? data[y].mid : null), tension: 0.3, spanGaps: true },
                    { label: '平均數', borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.1)',
                      data: labels.map(y => data[y] ? data[y].avg : null), tension: 0.3, spanGaps: true },
                    { label: 'Q1',    borderColor: '#27ae60', backgroundColor: 'transparent',
                      data: labels.map(y => data[y] ? data[y].mid1 : null), tension: 0.3, spanGaps: true, borderDash: [4,3] },
                    { label: 'Q3',    borderColor: '#9b59b6', backgroundColor: 'transparent',
                      data: labels.map(y => data[y] ? data[y].mid3 : null), tension: 0.3, spanGaps: true, borderDash: [4,3] }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } },
                    tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtWan(ctx.parsed.y) } }
                },
                scales: {
                    y: { ticks: { callback: v => fmtWan(v), font: { size: 10 } }, title: { display: true, text: '萬元', font: { size: 10 } } },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
    }
}

// ── Ranking list ───────────────────────────────────────────────────────────
function updateRankingList() {
    const pool = cunliListPool[currentYear] && cunliListPool[currentYear][currentMetric];
    if (!pool) return;
    const sortedVals = Object.keys(pool).map(Number).sort((a, b) => b - a);

    let html = '<h4>' + currentYear + '年 · ' + METRICS[currentMetric] + '</h4>';
    html += '<table class="rank-table"><thead><tr><th>#</th><th>' + METRICS[currentMetric] + '</th><th>村里</th></tr></thead><tbody>';

    let rank = 1;
    for (const val of sortedVals) {
        const codes = pool[val];
        for (const code of codes) {
            const name = countrySort[code] ? countrySort[code].name : code;
            html += '<tr><td>' + rank + '</td><td class="rank-val">' + fmtWan(val) + '</td>'
                + '<td><a data-villcode="' + code + '">' + name + '</a></td></tr>';
        }
        rank += codes.length;
    }
    html += '</tbody></table>';

    const container = document.getElementById('ranking-content');
    container.innerHTML = html;
    container.querySelectorAll('a[data-villcode]').forEach(a => {
        a.addEventListener('click', function () {
            navigateToVillcode(this.getAttribute('data-villcode'));
            activateTab('village');
        });
    });
}

function navigateToVillcode(vc) {
    if (!geoData) return;
    // Find feature in full dataset
    const fb = featureBounds.find(f => f.feature.properties.VILLCODE === vc);
    if (!fb) return;
    // Pan map to feature bounds — this triggers moveend → updateViewport → layer appears
    const llBounds = L.latLngBounds(
        [fb.minLat, fb.minLng], [fb.maxLat, fb.maxLng]
    );
    map.fitBounds(llBounds, { maxZoom: 16 });
    // After viewport update the layer will be in layerCache; select it
    // Use setTimeout to run after updateViewport's moveend handler
    map.once('moveend', () => setTimeout(() => {
        const layer = layerCache[vc];
        if (layer) selectVillage(fb.feature, layer);
    }, 0));
}

// ── Search ────────────────────────────────────────────────────────────────
function initSearch() {
    const input   = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    input.addEventListener('input', function () {
        const q = this.value.trim();
        results.innerHTML = '';
        if (q.length < 1) { results.style.display = 'none'; return; }

        const matches = Object.entries(villageNames)
            .filter(([, name]) => name.includes(q))
            .slice(0, 20);

        if (!matches.length) { results.style.display = 'none'; return; }

        for (const [vc, name] of matches) {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = name;
            div.addEventListener('click', () => {
                input.value = name;
                results.style.display = 'none';
                navigateToVillcode(vc);
            });
            results.appendChild(div);
        }
        results.style.display = 'block';
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrap')) results.style.display = 'none';
    });
}

// ── Tabs ──────────────────────────────────────────────────────────────────
function activateTab(name) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
}

// ── Legend sync ───────────────────────────────────────────────────────────
function syncLegend() {
    document.getElementById('legend-snapshot').style.display    = currentMode === 'snapshot'   ? '' : 'none';
    document.getElementById('legend-change').style.display      = currentMode === 'change'     ? '' : 'none';
    document.getElementById('legend-inequality').style.display  = currentMode === 'inequality' ? '' : 'none';
}

// ── Mode helpers ───────────────────────────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    // metric buttons: irrelevant in inequality mode
    const metricBtns = document.getElementById('metric-btns');
    metricBtns.style.opacity = mode === 'inequality' ? '0.4' : '1';
    metricBtns.style.pointerEvents = mode === 'inequality' ? 'none' : '';
    document.getElementById('inequality-note').style.display = mode === 'inequality' ? '' : 'none';
    document.getElementById('base-year-ctrl').style.display  = mode === 'change'     ? '' : 'none';
    syncLegend();
    refreshStyles();
    if (currentVillcode) {
        const feat = findFeatureByVillcode(currentVillcode);
        if (feat) showVillageDetail(feat.properties, currentVillcode);
    }
}

function findFeatureByVillcode(vc) {
    if (!geoLayer) return null;
    let found = null;
    geoLayer.eachLayer(l => { if (l.feature && l.feature.properties.VILLCODE === vc) found = l.feature; });
    return found;
}

// ── Hash routing ──────────────────────────────────────────────────────────
function applyHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const [year, metric, vc] = hash.split('/');
    if (year && cunliListPool[year]) {
        currentYear = year;
        setActiveBtn('[data-year]', 'data-year', year);
    }
    if (metric && METRICS[metric]) {
        currentMetric = metric;
        setActiveBtn('[data-metric]', 'data-metric', metric);
    }
    refreshStyles();
    if (vc) { currentVillcode = vc; navigateToVillcode(vc); }
}

function setActiveBtn(sel, attr, val) {
    document.querySelectorAll(sel).forEach(b => b.classList.toggle('active', b.getAttribute(attr) === val));
}

// ── Geolocation ───────────────────────────────────────────────────────────
function isPointInPolygon(point, polygon) {
    const [px, py] = point; let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}
function findCunliByLatLng(lat, lng) {
    if (!geoData) return null;
    for (const feat of geoData.features) {
        const g = feat.geometry; if (!g) continue;
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
        for (const poly of polys) { if (isPointInPolygon([lng, lat], poly[0])) return feat; }
    }
    return null;
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData().then(initSearch);

    // Tabs
    document.querySelectorAll('.tab').forEach(btn =>
        btn.addEventListener('click', () => activateTab(btn.dataset.tab)));

    // Mode
    document.querySelectorAll('.mode-btn').forEach(btn =>
        btn.addEventListener('click', () => setMode(btn.dataset.mode)));

    // Metric
    document.querySelectorAll('[data-metric]').forEach(btn =>
        btn.addEventListener('click', function () {
            currentMetric = this.dataset.metric;
            setActiveBtn('[data-metric]', 'data-metric', currentMetric);
            refreshStyles();
            if (currentVillcode) {
                const feat = findFeatureByVillcode(currentVillcode);
                if (feat) showVillageDetail(feat.properties, currentVillcode);
            }
            history.replaceState(null, '', '#' + currentYear + '/' + currentMetric + (currentVillcode ? '/' + currentVillcode : ''));
        }));

    // Year
    document.querySelectorAll('[data-year]').forEach(btn =>
        btn.addEventListener('click', function () {
            currentYear = this.dataset.year;
            setActiveBtn('[data-year]', 'data-year', currentYear);
            refreshStyles();
            if (currentVillcode) {
                const feat = findFeatureByVillcode(currentVillcode);
                if (feat) showVillageDetail(feat.properties, currentVillcode);
            }
            history.replaceState(null, '', '#' + currentYear + '/' + currentMetric + (currentVillcode ? '/' + currentVillcode : ''));
        }));

    // Base year select (comparison mode)
    const baseSelect = document.getElementById('base-year-select');
    for (const y of YEARS) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === baseYear) opt.selected = true;
        baseSelect.appendChild(opt);
    }
    baseSelect.addEventListener('change', function () {
        baseYear = this.value;
        refreshStyles();
    });

    // City buttons
    document.querySelectorAll('.btn-city').forEach(btn =>
        btn.addEventListener('click', function () {
            map.setView([parseFloat(this.dataset.lat), parseFloat(this.dataset.lng)], 13);
            geolocationCentered = true;
        }));

    // Locate me
    document.getElementById('locate-btn').addEventListener('click', function () {
        if (!navigator.geolocation) { alert('瀏覽器不支援定位'); return; }
        this.disabled = true; this.textContent = '定位中…';
        const btn = this;
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            const feat = findCunliByLatLng(lat, lng);
            if (feat) {
                geoLayer && geoLayer.eachLayer(layer => {
                    if (layer.feature && layer.feature.properties.VILLCODE === feat.properties.VILLCODE)
                        selectVillage(layer.feature, layer);
                });
            } else { map.setView([lat, lng], 14); alert('無法找到對應村里'); }
            btn.disabled = false; btn.textContent = '📍 定位到我的村里';
        }, () => { alert('無法取得位置'); btn.disabled = false; btn.textContent = '📍 定位到我的村里'; },
        { enableHighAccuracy: true, timeout: 10000 });
    });

    // Mobile
    document.getElementById('sidebar-toggle').addEventListener('click', () =>
        document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('map').addEventListener('click', () => {
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    });

    window.addEventListener('hashchange', applyHash);
});
