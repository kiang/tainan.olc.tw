var map, overviewLayer, detailLayer, locateMarker;
var candidatesData = null;
var indexData = null;
var tppZonesData = null;
var currentElType = '';
var overviewCache = {};
var infoModal;

var NLSC_TILE = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';

var partyColors = {
    '台灣民眾黨': '#28C8C8',
    '民主進步黨': '#1B9431',
    '中國國民黨': '#000095',
    '時代力量': '#FBBE01',
    '台灣基進': '#A73F24',
    '無黨籍及未經政黨推薦': '#999999'
};

function initMap() {
    map = L.map('map', { center: [23.5, 121], zoom: 7, zoomControl: true });
    L.tileLayer(NLSC_TILE, { maxZoom: 18, attribution: '&copy; NLSC' }).addTo(map);
    infoModal = new bootstrap.Modal(document.getElementById('infoModal'));

    Promise.all([
        fetch('zones/index.json').then(function (r) { return r.json(); }),
        fetch('data/candidates.json').then(function (r) { return r.json(); }),
        fetch('tpp/zones.json').then(function (r) { return r.json(); }).catch(function () { return []; })
    ]).then(function (results) {
        indexData = results[0];
        candidatesData = results[1];
        tppZonesData = results[2];
        buildElectionTypeSelector();
        // Default to first type that has zones
        var types = indexData.types.filter(function (t) { return indexData.counts[t]; });
        if (types.length > 0) {
            selectElectionType(types[0]);
        }
    });
}

function buildElectionTypeSelector() {
    var sel = document.getElementById('electionTypeSelect');
    sel.innerHTML = '';
    indexData.types.forEach(function (et) {
        var count = indexData.counts[et] || 0;
        if (count === 0) return;
        var opt = document.createElement('option');
        opt.value = et;
        opt.textContent = et + ' (' + count + ')';
        sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
        selectElectionType(this.value);
    });
}

function selectElectionType(et) {
    currentElType = et;
    document.getElementById('electionTypeSelect').value = et;
    clearDetail();
    loadOverview(et);
}

function loadOverview(et) {
    if (overviewCache[et]) {
        renderOverview(overviewCache[et]);
        return;
    }
    var url = 'zones/overview/' + encodeURIComponent(et) + '.json';
    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (fc) {
            overviewCache[et] = fc;
            renderOverview(fc);
        })
        .catch(function (err) {
            console.error('Failed to load overview for', et, err);
        });
}

function getZoneStyle(feature) {
    var count = feature.properties.candidateCount || 0;
    if (count > 0) {
        return {
            fillColor: '#0ABAB5',
            weight: 2,
            opacity: 1,
            color: '#089E9A',
            fillOpacity: 0.5
        };
    }
    return {
        fillColor: '#0ABAB5',
        weight: 1,
        opacity: 0.8,
        color: '#089E9A',
        fillOpacity: 0.25
    };
}

function highlightStyle() {
    return { weight: 3, fillOpacity: 0.7 };
}

function renderOverview(fc) {
    if (overviewLayer) map.removeLayer(overviewLayer);

    clearDetail();

    overviewLayer = L.geoJSON(fc, {
        style: getZoneStyle,
        onEachFeature: function (feature, layer) {
            var props = feature.properties;
            var tip = props.name;
            if (props.candidates && props.candidates.length > 0) {
                tip += '\n' + props.candidates.join('、');
            }
            layer.bindTooltip(tip, { sticky: true });
            layer.on({
                mouseover: function (e) { e.target.setStyle(highlightStyle()); },
                mouseout: function (e) { overviewLayer.resetStyle(e.target); },
                click: function (e) {
                    L.DomEvent.stopPropagation(e);
                    onZoneClick(props, layer);
                }
            });
        }
    }).addTo(map);

    if (overviewLayer.getLayers().length > 0) {
        map.fitBounds(overviewLayer.getBounds());
    }
}

function onZoneClick(props, layer) {
    map.fitBounds(layer.getBounds());
    showZoneInfo(props);
    loadDetail(props.code);
}

function loadDetail(code) {
    clearDetail();
    var url = 'zones/detail/' + encodeURIComponent(code) + '.json';
    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (fc) {
            detailLayer = L.geoJSON(fc, {
                style: {
                    fillColor: '#0ABAB5',
                    weight: 1,
                    opacity: 0.6,
                    color: '#089E9A',
                    fillOpacity: 0.15
                },
                onEachFeature: function (feature, layer) {
                    var p = feature.properties;
                    layer.bindTooltip((p.TOWNNAME || '') + (p.VILLNAME || ''), { sticky: true });
                }
            }).addTo(map);
        })
        .catch(function () {});
}

function clearDetail() {
    if (detailLayer) {
        map.removeLayer(detailLayer);
        detailLayer = null;
    }
}

function showZoneInfo(props) {
    var code = props.code;
    var candidates = findCandidatesForZone(code, currentElType);
    var tppInfo = findTppZoneInfo(code);

    var bc = '<ol class="breadcrumb mb-0">';
    bc += '<li class="breadcrumb-item">' + currentElType + '</li>';
    bc += '<li class="breadcrumb-item active">' + props.name + '</li>';
    bc += '</ol>';
    document.getElementById('modalBreadcrumb').innerHTML = bc;

    var html = '';

    // Candidates section
    if (candidates.length > 0) {
        candidates.forEach(function (c) {
            html += '<div class="candidate-card">';
            html += '<div class="candidate-photo mb-2">';
            if (c.photo) {
                html += '<img src="' + c.photo + '" alt="' + c.name + '">';
            } else {
                html += c.name ? c.name.charAt(0) : '?';
            }
            html += '</div>';
            html += '<div class="flex-grow-1">';
            html += '<h6 class="mb-1">' + (c.number || '') + (c.number ? '. ' : '') + c.name + '</h6>';
            html += '<small class="text-muted">' + (c.party || '') + '</small>';
            if (c.platform) {
                html += '<p class="mb-0 mt-1 small">' + c.platform + '</p>';
            }
            html += '</div></div>';
        });
    } else {
        html += '<p class="text-muted text-center py-3">尚無候選人資料</p>';
    }

    // TPP analysis link
    if (tppInfo) {
        html += '<div class="mt-3 pt-3 border-top">';
        html += '<h6>選情分析</h6>';
        html += '<div class="row g-2 mb-2">';
        html += '<div class="col-4 text-center"><div class="small text-muted">2024 政黨票</div><div class="fw-bold">' + tppInfo.r2024 + '%</div></div>';
        html += '<div class="col-4 text-center"><div class="small text-muted">成長</div><div class="fw-bold ' + (tppInfo.chg >= 0 ? 'text-success' : 'text-danger') + '">' + (tppInfo.chg >= 0 ? '+' : '') + tppInfo.chg + '%</div></div>';
        html += '<div class="col-4 text-center"><div class="small text-muted">估計基盤</div><div class="fw-bold">' + tppInfo.est.toLocaleString() + '</div></div>';
        html += '</div>';
        if (tppInfo.threshold) {
            html += '<div class="small text-muted">2022 當選門檻：' + tppInfo.threshold.toLocaleString() + ' 票</div>';
        }
        html += '<a href="tpp/zone.html?zone=' + encodeURIComponent(tppInfo.code) + '" class="btn btn-outline-info btn-sm mt-2" target="_blank">查看完整備戰報告</a>';
        html += '</div>';
    }

    document.getElementById('modalBody').innerHTML = html;
    infoModal.show();
}

function findCandidatesForZone(zoneCode, elType) {
    if (!candidatesData) return [];

    return candidatesData.candidates.filter(function (c) {
        if (c.election !== elType) return false;

        // Match based on zone code pattern
        // Zone codes: T1-67000-07, R1-10002010-01, mayor-67000, village-67000180001
        if (zoneCode.startsWith('mayor-')) {
            var areaCode = zoneCode.substring(6);
            if (areaCode.length === 5) return c.countyCode === areaCode;
            if (areaCode.length === 8) return c.townCode === areaCode;
            return false;
        }
        if (zoneCode.startsWith('village-')) {
            return c.villCode === zoneCode.substring(8);
        }
        // District-based: T1-67000-07 → countyCode=67000, district=第07選區 or 第7選舉區
        var parts = zoneCode.split('-');
        if (parts.length === 3) {
            var districtNum = parseInt(parts[2], 10);
            var districtMatch = c.district && parseInt(c.district.replace(/[^\d]/g, ''), 10) === districtNum;
            // For R-type (town-based), match on townCode
            if (parts[0].startsWith('R')) {
                return c.townCode === parts[1] && districtMatch;
            }
            // For T-type (county-based), match on countyCode
            return c.countyCode === parts[1] && districtMatch;
        }
        return false;
    });
}

function findTppZoneInfo(zoneCode) {
    if (!tppZonesData || !Array.isArray(tppZonesData)) return null;
    // tpp zones.json uses code like "67000-07", zone code is "T1-67000-07"
    var shortCode = zoneCode.replace(/^[A-Z]\d-/, '');
    for (var i = 0; i < tppZonesData.length; i++) {
        if (tppZonesData[i].code === shortCode) return tppZonesData[i];
    }
    return null;
}

function locateUser() {
    if (!navigator.geolocation) {
        alert('無法取得您的位置');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function (pos) {
            var latlng = [pos.coords.latitude, pos.coords.longitude];
            map.setView(latlng, 14);
            if (locateMarker) map.removeLayer(locateMarker);
            locateMarker = L.marker(latlng).addTo(map).bindPopup('您的位置').openPopup();
        },
        function () { alert('無法取得您的位置'); }
    );
}

document.addEventListener('DOMContentLoaded', initMap);
