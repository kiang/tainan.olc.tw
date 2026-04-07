// ── State ──────────────────────────────────────────────────────────────────
let map, geoLayer, currentChart = null;
let cunliSalary = {};           // { VILLCODE: { year: { avg, mid, sd, mid1, mid3, ... } } }
let geoData = null;             // GeoJSON FeatureCollection
let countrySort = {};           // { VILLCODE: { year: { metric: rank } } }
let countrySortPool = {};       // { year: { metric: { value: rank } } }
let cunliListPool = {};         // { year: { metric: { value: [VILLCODE...] } } }
let villageNames = {};          // { VILLCODE: 'CountyTownVill' }

let currentYear = '2023';
let currentMetric = 'avg';
let currentVillcode = '';
let geolocationCentered = false;
let selectedLayer = null;

const METRICS = {
    avg:  '平均數',
    mid:  '中位數',
    sd:   '標準差',
    mid1: '第一分位數',
    mid3: '第三分位數'
};

const COLORS = [
    { max: 300,  fill: 'rgba(254,232,200,0.7)' },
    { max: 400,  fill: 'rgba(253,212,158,0.7)' },
    { max: 500,  fill: 'rgba(253,187,132,0.7)' },
    { max: 700,  fill: 'rgba(252,141,89,0.7)'  },
    { max: 900,  fill: 'rgba(239,101,72,0.7)'  },
    { max: 1100, fill: 'rgba(215,48,31,0.7)'   },
    { max: 1300, fill: 'rgba(179,0,0,0.7)'     },
    { max: 1500, fill: 'rgba(127,0,0,0.7)'     },
    { max: Infinity, fill: 'rgba(64,0,0,0.7)'  }
];

function getColor(value) {
    if (!value || value === 0) return 'rgba(255,255,255,0.5)';
    for (const c of COLORS) {
        if (value <= c.max) return c.fill;
    }
    return 'rgba(64,0,0,0.7)';
}

// ── Map init ───────────────────────────────────────────────────────────────
function initMap() {
    map = L.map('map', { preferCanvas: true }).setView([23.97, 120.97], 8);

    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '© <a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪中心 NLSC</a>',
        opacity: 0.7
    }).addTo(map);

    // Geolocation dot
    const posMarker = L.circleMarker([0, 0], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#3399CC',
        fillOpacity: 1
    });

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function (pos) {
            const ll = [pos.coords.latitude, pos.coords.longitude];
            posMarker.setLatLng(ll).addTo(map);
            if (!geolocationCentered) {
                map.setView(ll, 14);
                geolocationCentered = true;
            }
        }, null, { enableHighAccuracy: true });
    }
}

// ── Data loading ──────────────────────────────────────────────────────────
async function loadData() {
    try {
        const [salaryRes, geoRes] = await Promise.all([
            fetch('https://kiang.github.io/salary/map/fia_data.json'),
            fetch('https://kiang.github.io/taiwan_basecode/cunli/topo/20210324.json')
        ]);

        const salaryRaw = await salaryRes.json();
        const topoRaw = await geoRes.json();

        // Convert TopoJSON → GeoJSON
        geoData = topoToGeoJSON(topoRaw);

        cunliSalary = salaryRaw;

        // Build ranking indexes
        for (const villcode in cunliSalary) {
            countrySort[villcode] = { name: '' };
            for (const year in cunliSalary[villcode]) {
                countrySort[villcode][year] = {};
                if (!countrySortPool[year]) countrySortPool[year] = {};
                if (!cunliListPool[year]) cunliListPool[year] = {};
                for (const key in cunliSalary[villcode][year]) {
                    countrySort[villcode][year][key] = 0;
                    if (!countrySortPool[year][key]) countrySortPool[year][key] = {};
                    if (!cunliListPool[year][key]) cunliListPool[year][key] = {};
                    const val = cunliSalary[villcode][year][key];
                    if (!cunliListPool[year][key][val]) cunliListPool[year][key][val] = [];
                    countrySortPool[year][key][val] = 0;
                    cunliListPool[year][key][val].push(villcode);
                }
            }
        }

        // Assign ranks (1 = highest value)
        for (const year in countrySortPool) {
            for (const key in countrySortPool[year]) {
                const pool = Object.keys(countrySortPool[year][key]).sort((a, b) => b - a);
                pool.forEach((v, i) => { countrySortPool[year][key][v] = i + 1; });
            }
        }

        for (const villcode in countrySort) {
            for (const year in countrySort[villcode]) {
                for (const key in countrySort[villcode][year]) {
                    const val = cunliSalary[villcode][year][key];
                    countrySort[villcode][year][key] = countrySortPool[year][key][val] || 0;
                }
            }
        }

        // Extract names from geoData features
        for (const feat of geoData.features) {
            const p = feat.properties;
            if (p.VILLCODE) {
                villageNames[p.VILLCODE] = p.COUNTYNAME + p.TOWNNAME + p.VILLNAME;
                if (countrySort[p.VILLCODE]) {
                    countrySort[p.VILLCODE].name = villageNames[p.VILLCODE];
                }
            }
        }

        renderLayer();
        updateRankingList();
        document.getElementById('loading').style.display = 'none';

        // Handle initial hash
        applyHash();

    } catch (err) {
        document.getElementById('loading').innerHTML =
            '<div style="color:#c0392b;">載入資料失敗：' + err.message + '</div>';
        console.error(err);
    }
}

// ── Minimal TopoJSON → GeoJSON converter ─────────────────────────────────
// Handles arc stitching for the cunli TopoJSON file
function topoToGeoJSON(topo) {
    // Determine object name
    const objName = Object.keys(topo.objects)[0];
    const obj = topo.objects[objName];

    const transform = topo.transform;
    const arcs = topo.arcs;

    // Decode arcs with delta encoding + quantized transform
    function decodeArc(arc) {
        let x = 0, y = 0;
        return arc.map(function (pt) {
            x += pt[0];
            y += pt[1];
            return [
                x * transform.scale[0] + transform.translate[0],
                y * transform.scale[1] + transform.translate[1]
            ];
        });
    }

    const decodedArcs = arcs.map(decodeArc);

    function getArc(i) {
        if (i >= 0) return decodedArcs[i].slice();
        // Reversed arc
        return decodedArcs[~i].slice().reverse();
    }

    function ringToCoords(ring) {
        let coords = [];
        for (const i of ring) {
            const a = getArc(i);
            if (coords.length > 0) a.shift(); // remove duplicate junction point
            coords = coords.concat(a);
        }
        return coords;
    }

    function geomToGeoJSON(geom, props) {
        if (!geom) return null;
        if (geom.type === 'Polygon') {
            return {
                type: 'Feature',
                properties: props,
                geometry: {
                    type: 'Polygon',
                    coordinates: geom.arcs.map(ringToCoords)
                }
            };
        }
        if (geom.type === 'MultiPolygon') {
            return {
                type: 'Feature',
                properties: props,
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: geom.arcs.map(poly => poly.map(ringToCoords))
                }
            };
        }
        return null;
    }

    const features = [];
    for (const geom of obj.geometries) {
        const f = geomToGeoJSON(geom, geom.properties || {});
        if (f) features.push(f);
    }

    return { type: 'FeatureCollection', features };
}

// ── Layer rendering ────────────────────────────────────────────────────────
function getFeatureStyle(feature) {
    const vc = feature.properties.VILLCODE;
    const val = cunliSalary[vc] && cunliSalary[vc][currentYear]
        ? cunliSalary[vc][currentYear][currentMetric] : 0;
    return {
        fillColor: getColor(val),
        weight: 0.5,
        color: 'rgba(0,0,0,0.4)',
        fillOpacity: 0.75
    };
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: function (e) {
            const l = e.target;
            if (l !== selectedLayer) {
                l.setStyle({ weight: 2, color: '#2c3e50', fillOpacity: 0.9 });
                l.bringToFront();
            }
        },
        mouseout: function (e) {
            if (e.target !== selectedLayer) {
                geoLayer.resetStyle(e.target);
            }
        },
        click: function (e) {
            selectVillage(feature, layer);
        }
    });
}

function renderLayer() {
    if (geoLayer) map.removeLayer(geoLayer);

    geoLayer = L.geoJSON(geoData, {
        style: getFeatureStyle,
        onEachFeature: onEachFeature
    }).addTo(map);
}

function refreshStyles() {
    if (!geoLayer) return;
    geoLayer.eachLayer(function (layer) {
        if (layer !== selectedLayer) {
            layer.setStyle(getFeatureStyle(layer.feature));
        }
    });
    updateRankingList();
}

// ── Village selection & detail ─────────────────────────────────────────────
function selectVillage(feature, layer) {
    // Restore previous selection style
    if (selectedLayer && selectedLayer !== layer) {
        geoLayer.resetStyle(selectedLayer);
    }
    selectedLayer = layer;
    layer.setStyle({ weight: 3, color: '#e74c3c', fillColor: 'rgba(255,230,0,0.6)', fillOpacity: 0.85 });
    layer.bringToFront();

    const vc = feature.properties.VILLCODE;
    const props = feature.properties;
    currentVillcode = vc;

    // Zoom to feature
    map.fitBounds(layer.getBounds(), { maxZoom: 16 });
    geolocationCentered = true;

    // Show detail pane
    showVillageDetail(props, vc);

    // Activate info tab
    activateTab('info');

    // Update hash
    const newHash = '#' + currentYear + '/' + currentMetric + '/' + vc;
    if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
    }
}

function showVillageDetail(props, vc) {
    const container = document.getElementById('village-detail');
    const fullName = (props.COUNTYNAME || '') + (props.TOWNNAME || '') + (props.VILLNAME || '');
    const data = cunliSalary[vc];

    let html = '<h3>' + fullName + '</h3>';

    if (!data) {
        html += '<p style="color:#999;">無所得資料</p>';
        container.innerHTML = html;
        return;
    }

    // Chart
    html += '<div id="village-chart-container"><canvas id="village-chart" height="180"></canvas></div>';

    // Table
    html += '<div class="detail-unit">單位：金額(千元)</div>';
    html += '<div style="overflow-x:auto;"><table><thead><tr>';
    html += '<th>年度</th><th>納稅</th><th>總額</th><th>平均</th><th>中位</th><th>Q1</th><th>Q3</th><th>標差</th></tr></thead><tbody>';

    const chartLabels = [], chartMid = [], chartAvg = [];
    for (const year of Object.keys(data).sort()) {
        const d = data[year];
        chartLabels.push(year);
        chartMid.push(d.mid || 0);
        chartAvg.push(d.avg || 0);
        const rank = countrySort[vc] && countrySort[vc][year]
            ? countrySort[vc][year][currentMetric] : '';
        html += '<tr>'
            + '<td>' + year + '</td>'
            + '<td>' + (d.adm || '') + '</td>'
            + '<td>' + (d.total || '') + '</td>'
            + '<td>' + (d.avg || '') + '</td>'
            + '<td>' + (d.mid || '') + '</td>'
            + '<td>' + (d.mid1 || '') + '</td>'
            + '<td>' + (d.mid3 || '') + '</td>'
            + '<td>' + (d.sd || '') + '</td>'
            + '</tr>';
    }
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Destroy previous chart if exists
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    const ctx = document.getElementById('village-chart');
    if (ctx) {
        currentChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: '中位數', borderColor: 'rgb(255,99,132)', backgroundColor: 'rgba(255,99,132,0.1)', data: chartMid, tension: 0.3 },
                    { label: '平均數', borderColor: 'rgb(99,132,255)', backgroundColor: 'rgba(99,132,255,0.1)', data: chartAvg, tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { title: { display: true, text: '千元' } } }
            }
        });
    }
}

// ── Ranking list ───────────────────────────────────────────────────────────
function updateRankingList() {
    const pool = cunliListPool[currentYear] && cunliListPool[currentYear][currentMetric];
    if (!pool) return;

    const sortedVals = Object.keys(pool).map(Number).sort((a, b) => b - a);

    let html = '<h4 style="margin:0 0 8px 0;">' + currentYear + ' / ' + METRICS[currentMetric] + '</h4>';
    html += '<table><thead><tr><th>值(千元)</th><th>村里</th></tr></thead><tbody>';

    for (const val of sortedVals) {
        const codes = pool[val];
        html += '<tr><td class="rank-value">' + val + '</td><td>';
        for (const code of codes) {
            const name = countrySort[code] ? countrySort[code].name : code;
            html += '<a data-villcode="' + code + '">' + name + '</a> ';
        }
        html += '</td></tr>';
    }
    html += '</tbody></table>';

    const container = document.getElementById('ranking-content');
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('a[data-villcode]').forEach(function (a) {
        a.addEventListener('click', function () {
            const vc = this.getAttribute('data-villcode');
            navigateToVillcode(vc);
            activateTab('info');
        });
    });
}

function navigateToVillcode(vc) {
    currentVillcode = vc;
    if (geoLayer) {
        geoLayer.eachLayer(function (layer) {
            if (layer.feature && layer.feature.properties.VILLCODE === vc) {
                selectVillage(layer.feature, layer);
            }
        });
    }
}

// ── Tabs ───────────────────────────────────────────────────────────────────
function activateTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="' + name + '"]').classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
}

// ── Hash routing ───────────────────────────────────────────────────────────
function applyHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const parts = hash.split('/');
    const year = parts[0];
    const metric = parts[1];
    const vc = parts[2] || '';

    if (year && cunliListPool[year]) {
        currentYear = year;
        updateActiveBtn('year', year);
    }
    if (metric && METRICS[metric]) {
        currentMetric = metric;
        updateActiveBtn('metric', metric);
    }

    refreshStyles();

    if (vc) {
        currentVillcode = vc;
        navigateToVillcode(vc);
    }
}

// ── Button helpers ─────────────────────────────────────────────────────────
function updateActiveBtn(type, value) {
    if (type === 'year') {
        document.querySelectorAll('[data-year]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-year') === value);
        });
    } else if (type === 'metric') {
        document.querySelectorAll('[data-metric]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-metric') === value);
        });
    }
}

// ── Locate me ─────────────────────────────────────────────────────────────
function isPointInPolygon(point, polygon) {
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

function findCunliByLatLng(lat, lng) {
    if (!geoData) return null;
    for (const feat of geoData.features) {
        const geom = feat.geometry;
        if (!geom) continue;
        const polys = geom.type === 'Polygon'
            ? [geom.coordinates]
            : geom.type === 'MultiPolygon'
                ? geom.coordinates
                : [];
        for (const poly of polys) {
            if (isPointInPolygon([lng, lat], poly[0])) return feat;
        }
    }
    return null;
}

// ── Event listeners ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    initMap();
    loadData();

    // Metric buttons
    document.querySelectorAll('[data-metric]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentMetric = this.getAttribute('data-metric');
            updateActiveBtn('metric', currentMetric);
            refreshStyles();
            history.replaceState(null, '', '#' + currentYear + '/' + currentMetric + (currentVillcode ? '/' + currentVillcode : ''));
        });
    });

    // Year buttons
    document.querySelectorAll('[data-year]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentYear = this.getAttribute('data-year');
            updateActiveBtn('year', currentYear);
            refreshStyles();
            history.replaceState(null, '', '#' + currentYear + '/' + currentMetric + (currentVillcode ? '/' + currentVillcode : ''));
        });
    });

    // City quick-nav buttons
    document.querySelectorAll('.btn-city').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const lat = parseFloat(this.getAttribute('data-lat'));
            const lng = parseFloat(this.getAttribute('data-lng'));
            map.setView([lat, lng], 13);
            geolocationCentered = true;
        });
    });

    // Locate me
    document.getElementById('locate-btn').addEventListener('click', function () {
        const btn = this;
        if (!navigator.geolocation) { alert('瀏覽器不支援定位'); return; }
        btn.disabled = true;
        btn.textContent = '定位中...';
        navigator.geolocation.getCurrentPosition(function (pos) {
            const { latitude: lat, longitude: lng } = pos.coords;
            const feat = findCunliByLatLng(lat, lng);
            if (feat) {
                if (geoLayer) {
                    geoLayer.eachLayer(function (layer) {
                        if (layer.feature && layer.feature.properties.VILLCODE === feat.properties.VILLCODE) {
                            selectVillage(layer.feature, layer);
                        }
                    });
                }
            } else {
                map.setView([lat, lng], 14);
                alert('無法找到對應村里');
            }
            btn.disabled = false;
            btn.textContent = '📍 定位到我的村里';
        }, function () {
            alert('無法取得位置');
            btn.disabled = false;
            btn.textContent = '📍 定位到我的村里';
        }, { enableHighAccuracy: true, timeout: 10000 });
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            activateTab(this.getAttribute('data-tab'));
        });
    });

    // Mobile sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('map').addEventListener('click', function () {
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    });

    // Hash change
    window.addEventListener('hashchange', applyHash);
});
