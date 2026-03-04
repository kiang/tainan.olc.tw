// i18n strings
var lang = {
    zh: {
        title: '2026 台灣選舉候選人地圖',
        back: '返回縣市',
        elections: '選舉類型',
        candidates: '候選人',
        candidateDetail: '候選人資訊',
        party: '政黨',
        number: '號次',
        gender: '性別',
        age: '年齡',
        education: '學歷',
        experience: '經歷',
        platform: '政見',
        count: '人數',
        noCandidate: '目前沒有候選人資料',
        locating: '定位中...',
        locateError: '無法取得您的位置',
        male: '男',
        female: '女'
    },
    en: {
        title: '2026 Taiwan Election Candidates Map',
        back: 'Back to Counties',
        elections: 'Election Types',
        candidates: 'Candidates',
        candidateDetail: 'Candidate Details',
        party: 'Party',
        number: 'Number',
        gender: 'Gender',
        age: 'Age',
        education: 'Education',
        experience: 'Experience',
        platform: 'Platform',
        count: 'Count',
        noCandidate: 'No candidate data available',
        locating: 'Locating...',
        locateError: 'Unable to get your location',
        male: 'Male',
        female: 'Female'
    }
};

var currentLang = 'zh';
var candidatesData = null;
var map, countyLayer, cunliLayer;
var currentCounty = null;
var selectedCunliLayer = null;
var infoModal;

// Current modal context for breadcrumb navigation
var modalContext = {
    areaName: '',
    countyCode: '',
    townCode: '',
    villCode: '',
    isMunicipal: false,
    currentElType: '',
    currentCandidate: null
};

// Election type definitions
var electionTypes = {
    municipal: ['直轄市市長', '直轄市議員', '直轄市山地原住民區區長', '直轄市山地原住民區區民代表'],
    county: ['縣市首長', '縣市議員', '鄉鎮市長', '鄉鎮市民代表'],
    village: ['村里長']
};

// Municipality codes (直轄市)
var municipalCodes = ['63000', '64000', '65000', '66000', '67000', '68000'];

function t(key) {
    return lang[currentLang][key] || key;
}

function electionLabel(elType) {
    return currentLang === 'en' && candidatesData && candidatesData.elections[elType]
        ? candidatesData.elections[elType].en
        : elType;
}

function toggleLang() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    document.getElementById('langLabel').textContent = currentLang === 'zh' ? 'EN' : '中文';
    document.getElementById('backLabel').textContent = t('back');
    document.title = t('title');
}

function initMap() {
    map = L.map('map', {
        center: [23.5, 121],
        zoom: 7,
        zoomControl: true
    });

    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">NLSC</a>'
    }).addTo(map);

    infoModal = new bootstrap.Modal(document.getElementById('infoModal'));

    loadCandidates();
    loadCounties();
}

function loadCandidates() {
    fetch('data/candidates.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            candidatesData = data;
        })
        .catch(function (err) {
            console.error('Failed to load candidates:', err);
            candidatesData = { elections: {}, candidates: [] };
        });
}

function loadCounties() {
    fetch('https://kiang.github.io/taiwan_basecode/county/topo/20200820.json')
        .then(function (r) { return r.json(); })
        .then(function (topoData) {
            var geojson = topojson.feature(topoData, Object.values(topoData.objects)[0]);
            renderCounties(geojson);
        })
        .catch(function (err) {
            console.error('Failed to load counties:', err);
        });
}

function countyStyle() {
    return {
        fillColor: '#a8d5e2',
        weight: 2,
        opacity: 1,
        color: '#2c3e50',
        fillOpacity: 0.4
    };
}

function countyHighlight(e) {
    e.target.setStyle({ fillColor: '#5dade2', fillOpacity: 0.6 });
}

function countyReset(e) {
    if (countyLayer) countyLayer.resetStyle(e.target);
}

function renderCounties(geojson) {
    if (countyLayer) map.removeLayer(countyLayer);

    countyLayer = L.geoJSON(geojson, {
        style: countyStyle,
        onEachFeature: function (feature, layer) {
            var name = feature.properties.COUNTYNAME || feature.properties.name || '';
            layer.bindTooltip(name, { sticky: true });
            layer.on({
                mouseover: countyHighlight,
                mouseout: countyReset,
                click: function () { onCountyClick(feature, layer); }
            });
        }
    }).addTo(map);
}

function onCountyClick(feature, layer) {
    var props = feature.properties;
    var countyName = props.COUNTYNAME || props.name || '';
    var countyCode = props.COUNTYCODE || props.code || '';
    currentCounty = { name: countyName, code: countyCode, feature: feature };

    map.fitBounds(layer.getBounds());

    var url = 'https://kiang.github.io/taiwan_basecode/cunli/topo/city/20240807/' + countyName + '.json';
    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (topoData) {
            var geojson = topojson.feature(topoData, Object.values(topoData.objects)[0]);
            renderCunli(geojson);
            if (countyLayer) map.removeLayer(countyLayer);
            document.getElementById('backBtn').style.display = 'block';
        })
        .catch(function (err) {
            console.error('Failed to load cunli for ' + countyName + ':', err);
        });
}

function cunliStyle() {
    return {
        fillColor: '#a8e6cf',
        weight: 1,
        opacity: 1,
        color: '#27ae60',
        fillOpacity: 0.3
    };
}

function cunliHighlight(e) {
    var layer = e.target;
    layer.setStyle({ fillColor: '#2ecc71', fillOpacity: 0.5 });
}

function cunliReset(e) {
    if (e.target === selectedCunliLayer) return;
    if (cunliLayer) cunliLayer.resetStyle(e.target);
}

function renderCunli(geojson) {
    if (cunliLayer) map.removeLayer(cunliLayer);

    cunliLayer = L.geoJSON(geojson, {
        style: cunliStyle,
        onEachFeature: function (feature, layer) {
            var props = feature.properties;
            var name = (props.COUNTYNAME || '') + (props.TOWNNAME || '') + (props.VILLNAME || '');
            layer.bindTooltip(name, { sticky: true });
            layer.on({
                mouseover: cunliHighlight,
                mouseout: cunliReset,
                click: function () { onCunliClick(feature, layer); }
            });
        }
    }).addTo(map);
}

function onCunliClick(feature, layer) {
    if (cunliLayer) cunliLayer.resetStyle();
    selectedCunliLayer = layer;
    layer.setStyle({ fillColor: '#e67e22', fillOpacity: 0.6 });
    map.fitBounds(layer.getBounds());

    var props = feature.properties;
    var countyCode = props.COUNTYCODE || '';
    var townCode = props.TOWNCODE || '';
    var villCode = props.VILLCODE || '';
    var fullName = (props.COUNTYNAME || '') + (props.TOWNNAME || '') + (props.VILLNAME || '');

    modalContext = {
        areaName: fullName,
        countyCode: countyCode,
        townCode: townCode,
        villCode: villCode,
        isMunicipal: municipalCodes.indexOf(countyCode) >= 0,
        currentElType: '',
        currentCandidate: null
    };

    showElections();
    infoModal.show();
}

// --- Breadcrumb rendering ---

function renderBreadcrumb(items) {
    // items: [{label, onclick}, ...] last one is active (no onclick)
    var html = '<ol class="breadcrumb mb-0">';
    items.forEach(function (item, i) {
        if (i < items.length - 1) {
            html += '<li class="breadcrumb-item"><a href="#" onclick="' + item.onclick + '; return false;">' + item.label + '</a></li>';
        } else {
            html += '<li class="breadcrumb-item active" aria-current="page">' + item.label + '</li>';
        }
    });
    html += '</ol>';
    document.getElementById('modalBreadcrumb').innerHTML = html;
}

// --- View: Election types ---

function showElections() {
    var ctx = modalContext;
    renderBreadcrumb([
        { label: ctx.areaName }
    ]);

    var applicableTypes = ctx.isMunicipal ? electionTypes.municipal.slice() : electionTypes.county.slice();
    applicableTypes = applicableTypes.concat(electionTypes.village);

    var html = '<table class="table table-hover mb-0">';
    html += '<thead><tr><th>' + t('elections') + '</th><th class="text-end">' + t('count') + '</th></tr></thead>';
    html += '<tbody>';

    applicableTypes.forEach(function (elType) {
        var count = countCandidates(elType, ctx.countyCode, ctx.townCode, ctx.villCode);
        html += '<tr class="election-row" onclick="showCandidates(\'' + elType.replace(/'/g, "\\'") + '\')">';
        html += '<td>' + electionLabel(elType) + '</td>';
        html += '<td class="text-end"><span class="badge bg-primary badge-count">' + count + '</span></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('modalBody').innerHTML = html;
}

// --- View: Candidate list ---

function showCandidates(elType) {
    var ctx = modalContext;
    ctx.currentElType = elType;
    var elLabel = electionLabel(elType);

    renderBreadcrumb([
        { label: ctx.areaName, onclick: 'showElections()' },
        { label: elLabel }
    ]);

    var candidates = filterCandidates(elType, ctx.countyCode, ctx.townCode, ctx.villCode);
    var html = '';

    if (candidates.length === 0) {
        html = '<p class="text-muted text-center py-3">' + t('noCandidate') + '</p>';
    } else {
        candidates.forEach(function (c, idx) {
            var name = currentLang === 'en' && c.nameEn ? c.nameEn : c.name;
            var party = currentLang === 'en' && c.partyEn ? c.partyEn : c.party;
            var initial = c.name ? c.name.charAt(0) : '?';

            html += '<div class="candidate-card d-flex align-items-center" onclick="showDetailByIndex(' + idx + ')">';
            html += '<div class="candidate-photo me-3">';
            if (c.photo) {
                html += '<img src="' + c.photo + '" class="rounded-circle" width="60" height="60" alt="' + name + '">';
            } else {
                html += initial;
            }
            html += '</div>';
            html += '<div class="flex-grow-1">';
            html += '<h6 class="mb-1">' + c.number + '. ' + name + '</h6>';
            html += '<small class="text-muted">' + party + '</small>';
            html += '</div>';
            html += '<i class="bi bi-chevron-right text-muted"></i>';
            html += '</div>';
        });
    }

    document.getElementById('modalBody').innerHTML = html;
}

// --- View: Candidate detail ---

function showDetailByIndex(idx) {
    var ctx = modalContext;
    var candidates = filterCandidates(ctx.currentElType, ctx.countyCode, ctx.townCode, ctx.villCode);
    if (idx >= 0 && idx < candidates.length) {
        showDetail(candidates[idx]);
    }
}

function showDetail(c) {
    var ctx = modalContext;
    ctx.currentCandidate = c;
    var elLabel = electionLabel(ctx.currentElType);
    var name = currentLang === 'en' && c.nameEn ? c.nameEn : c.name;
    var party = currentLang === 'en' && c.partyEn ? c.partyEn : c.party;
    var platform = currentLang === 'en' && c.platformEn ? c.platformEn : c.platform;
    var gender = c.gender;
    if (currentLang === 'en') {
        gender = c.gender === '男' ? t('male') : t('female');
    }

    renderBreadcrumb([
        { label: ctx.areaName, onclick: 'showElections()' },
        { label: elLabel, onclick: 'showCandidates(modalContext.currentElType)' },
        { label: name }
    ]);

    var html = '<div class="text-center mb-3">';
    html += '<div class="candidate-photo mx-auto mb-2" style="width:80px;height:80px;font-size:32px;">';
    if (c.photo) {
        html += '<img src="' + c.photo + '" class="rounded-circle" width="80" height="80" alt="' + name + '">';
    } else {
        html += c.name ? c.name.charAt(0) : '?';
    }
    html += '</div>';
    html += '<h5>' + c.number + '. ' + name + '</h5>';
    html += '<span class="badge bg-secondary">' + party + '</span>';
    html += '</div>';

    html += '<table class="table table-sm">';
    html += '<tr><th>' + t('gender') + '</th><td>' + gender + '</td></tr>';
    html += '<tr><th>' + t('age') + '</th><td>' + c.age + '</td></tr>';
    html += '<tr><th>' + t('education') + '</th><td>' + c.education + '</td></tr>';
    html += '<tr><th>' + t('experience') + '</th><td>' + c.experience + '</td></tr>';
    html += '<tr><th>' + t('platform') + '</th><td>' + platform + '</td></tr>';
    html += '</table>';

    document.getElementById('modalBody').innerHTML = html;
}

// --- Data helpers ---

function countCandidates(elType, countyCode, townCode, villCode) {
    if (!candidatesData) return 0;
    return filterCandidates(elType, countyCode, townCode, villCode).length;
}

function filterCandidates(elType, countyCode, townCode, villCode) {
    if (!candidatesData) return [];
    return candidatesData.candidates.filter(function (c) {
        if (c.election !== elType) return false;
        if (elType === '村里長') return c.villCode === villCode;
        if (elType === '直轄市市長' || elType === '縣市首長') return c.countyCode === countyCode;
        return c.townCode === townCode;
    });
}

// --- Map controls ---

function backToCounty() {
    currentCounty = null;
    selectedCunliLayer = null;
    if (cunliLayer) {
        map.removeLayer(cunliLayer);
        cunliLayer = null;
    }
    document.getElementById('backBtn').style.display = 'none';
    map.setView([23.5, 121], 7);
    loadCounties();
}

function locateUser() {
    if (!navigator.geolocation) {
        alert(t('locateError'));
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function (pos) {
            map.setView([pos.coords.latitude, pos.coords.longitude], 14);
            L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map)
                .bindPopup(t('locating').replace('...', ''))
                .openPopup();
        },
        function () {
            alert(t('locateError'));
        }
    );
}

document.addEventListener('DOMContentLoaded', initMap);
