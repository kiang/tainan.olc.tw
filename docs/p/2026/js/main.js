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
var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
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
var historyData = null;
var currentModalTab = 'candidates';

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

    map.on('click', function (e) {
        if (cunliLayer) {
            backToCounty();
        }
    });

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
                click: function (e) { L.DomEvent.stopPropagation(e); onCunliClick(feature, layer); }
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
        countyName: props.COUNTYNAME || '',
        townCode: townCode,
        townName: props.TOWNNAME || '',
        villCode: villCode,
        villName: props.VILLNAME || '',
        isMunicipal: municipalCodes.indexOf(countyCode) >= 0,
        currentElType: '',
        currentCandidate: null
    };

    // Reset to candidates tab
    currentModalTab = 'candidates';
    switchModalTab('candidates');

    // Load historical data
    historyData = null;
    document.getElementById('modalBodyHistory').innerHTML = '<p class="text-muted text-center py-3">載入中...</p>';
    fetch('data/2020-2024/' + villCode + '.json')
        .then(function (r) {
            if (!r.ok) throw new Error('Not found');
            return r.json();
        })
        .then(function (data) {
            historyData = data;
            renderHistory();
        })
        .catch(function () {
            historyData = null;
            document.getElementById('modalBodyHistory').innerHTML = '<p class="text-muted text-center py-3">此村里無歷史投票資料</p>';
        });

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
        var label = electionLabel(elType);
        var district = findDistrict(elType, ctx.countyCode, ctx.townCode, ctx.villCode);
        if (district) {
            var distName = currentLang === 'en' && district.nameEn ? district.nameEn : district.name;
            label += ' - ' + distName;
        }
        html += '<tr class="election-row" onclick="showCandidates(\'' + elType.replace(/'/g, "\\'") + '\')">';
        html += '<td>' + label + '</td>';
        html += '<td class="text-end">';
        if (isLocal && districtElectionTypes.indexOf(elType) >= 0) {
            var dAreaCode = townBasedElectionTypes.indexOf(elType) >= 0 ? ctx.townCode : ctx.countyCode;
            if (district) {
                var dIdx = findDistrictIndex(elType, dAreaCode, district);
                html += '<a href="admin.php?edit=district&electionType=' + encodeURIComponent(elType) + '&areaCode=' + encodeURIComponent(dAreaCode) + '&districtIndex=' + dIdx + '" class="btn btn-outline-primary btn-sm me-1" target="_blank" onclick="event.stopPropagation()" title="編輯選區"><i class="bi bi-pencil-square"></i></a>';
            } else {
                html += '<a href="admin.php?edit=district&electionType=' + encodeURIComponent(elType) + '&areaCode=' + encodeURIComponent(dAreaCode) + '&districtIndex=-1" class="btn btn-outline-success btn-sm me-1" target="_blank" onclick="event.stopPropagation()" title="新增選區"><i class="bi bi-plus-circle"></i></a>';
            }
        }
        if (isLocal) {
            var addParams = 'edit=candidate&index=-1&election=' + encodeURIComponent(elType)
                + '&countyCode=' + encodeURIComponent(ctx.countyCode)
                + '&countyName=' + encodeURIComponent(ctx.countyName)
                + '&townCode=' + encodeURIComponent(ctx.townCode)
                + '&townName=' + encodeURIComponent(ctx.townName)
                + '&villCode=' + encodeURIComponent(ctx.villCode)
                + '&villName=' + encodeURIComponent(ctx.villName);
            html += '<a href="admin.php?' + addParams + '" class="btn btn-outline-success btn-sm me-1" target="_blank" onclick="event.stopPropagation()" title="新增候選人"><i class="bi bi-person-plus"></i></a>';
        }
        html += '<span class="badge bg-primary badge-count">' + count + '</span></td>';
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
            if (isLocal) {
                var cIdx = findCandidateIndex(c);
                if (cIdx >= 0) {
                    html += '<a href="admin.php?edit=candidate&index=' + cIdx + '" class="btn btn-outline-primary btn-sm me-2" target="_blank" onclick="event.stopPropagation()"><i class="bi bi-pencil-square"></i></a>';
                }
            }
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

    if (isLocal) {
        var cIdx = findCandidateIndex(c);
        if (cIdx >= 0) {
            html += '<div class="text-end"><a href="admin.php?edit=candidate&index=' + cIdx + '" class="btn btn-outline-primary btn-sm" target="_blank"><i class="bi bi-pencil-square"></i> 編輯候選人</a></div>';
        }
    }

    document.getElementById('modalBody').innerHTML = html;
}

function findDistrictIndex(elType, areaCode, district) {
    if (!candidatesData || !candidatesData.districts) return -1;
    var districtMap = candidatesData.districts[elType];
    if (!districtMap || !districtMap[areaCode]) return -1;
    var districts = districtMap[areaCode];
    for (var i = 0; i < districts.length; i++) {
        if (districts[i] === district) return i;
    }
    return -1;
}

function findCandidateIndex(c) {
    if (!candidatesData) return -1;
    for (var i = 0; i < candidatesData.candidates.length; i++) {
        if (candidatesData.candidates[i] === c) return i;
    }
    return -1;
}

// --- Data helpers ---

// Town-based election types (districts keyed by townCode, not countyCode)
var townBasedElectionTypes = ['直轄市山地原住民區區民代表', '鄉鎮市民代表'];

function findDistrict(elType, countyCode, townCode, villCode) {
    if (!candidatesData || !candidatesData.districts) return null;
    var districtMap = candidatesData.districts[elType];
    if (!districtMap) return null;
    var key = townBasedElectionTypes.indexOf(elType) >= 0 ? townCode : countyCode;
    if (!districtMap[key]) return null;
    var districts = districtMap[key];
    for (var i = 0; i < districts.length; i++) {
        var d = districts[i];
        if (d.villCodes && villCode && d.villCodes.indexOf(villCode) >= 0) {
            return d;
        }
        if (d.townCodes && d.townCodes.indexOf(townCode) >= 0) {
            return d;
        }
    }
    return null;
}

function countCandidates(elType, countyCode, townCode, villCode) {
    if (!candidatesData) return 0;
    return filterCandidates(elType, countyCode, townCode, villCode).length;
}

// Election types that use electoral districts
var districtElectionTypes = ['直轄市議員', '縣市議員', '直轄市山地原住民區區民代表', '鄉鎮市民代表'];

function filterCandidates(elType, countyCode, townCode, villCode) {
    if (!candidatesData) return [];
    return candidatesData.candidates.filter(function (c) {
        if (c.election !== elType) return false;
        if (elType === '村里長') return c.villCode === villCode;
        if (elType === '直轄市市長' || elType === '縣市首長') return c.countyCode === countyCode;
        // District-based elections
        if (districtElectionTypes.indexOf(elType) >= 0) {
            var district = findDistrict(elType, countyCode, townCode, villCode);
            if (district) {
                var isTownBased = townBasedElectionTypes.indexOf(elType) >= 0;
                var codeMatch = isTownBased ? c.townCode === townCode : c.countyCode === countyCode;
                return codeMatch && c.district === district.name;
            }
        }
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

// --- Modal tab switching ---

function switchModalTab(tab) {
    currentModalTab = tab;
    var tabs = document.querySelectorAll('#modalTabs a');
    tabs.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-mtab') === tab);
    });
    document.getElementById('modalBody').classList.toggle('d-none', tab !== 'candidates');
    document.getElementById('modalBodyHistory').classList.toggle('d-none', tab !== 'history');
}

// --- History chart rendering ---

// Party color mapping for major parties
var partyColors = {
    '民主進步黨': '#1B9431',
    '中國國民黨': '#000095',
    '台灣民眾黨': '#28C8C8',
    '時代力量': '#FBBE01',
    '台灣基進': '#A73F24',
    '親民黨': '#FF6310',
    '新黨': '#FFFF00',
    '綠黨': '#73BF00',
    '台灣團結聯盟': '#C69E6A',
    '無黨籍及未經政黨推薦': '#999999'
};

function getPartyColor(party) {
    return partyColors[party] || '#' + (Math.abs(hashStr(party)) % 0xFFFFFF).toString(16).padStart(6, '0');
}

function hashStr(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function renderHistory() {
    if (!historyData) return;
    var html = '';
    var keys = Object.keys(historyData).filter(function (k) {
        return k !== 'county' && k !== 'town' && k !== 'name';
    }).sort(function (a, b) {
        return b.localeCompare(a);
    });

    keys.forEach(function (key) {
        html += '<div class="history-section">';
        html += '<h6>' + key + '</h6>';
        var data = historyData[key];
        if (Array.isArray(data)) {
            html += renderCandidateChart(data);
        } else if (typeof data === 'object') {
            // Check if it's presidential format (nested objects with party+votes)
            var firstVal = data[Object.keys(data)[0]];
            if (firstVal && typeof firstVal === 'object' && firstVal.votes !== undefined) {
                html += renderPresidentialChart(data);
            } else {
                html += renderPartyChart(data);
            }
        }
        html += '</div>';
    });

    document.getElementById('modalBodyHistory').innerHTML = html;
}

function renderPartyChart(data) {
    // data: { partyName: votes, ... }
    var entries = Object.entries(data).sort(function (a, b) { return b[1] - a[1]; });
    var max = entries.length > 0 ? entries[0][1] : 1;
    if (max === 0) max = 1;
    var html = '';
    entries.forEach(function (e) {
        var party = e[0];
        var votes = e[1];
        var pct = (votes / max * 100).toFixed(0);
        html += '<div class="history-bar-row">';
        html += '<div class="history-bar-label" title="' + party + '">' + party + '</div>';
        html += '<div class="history-bar-track"><div class="history-bar-fill" style="width:' + pct + '%;background:' + getPartyColor(party) + '"></div></div>';
        html += '<div class="history-bar-value">' + votes + '</div>';
        html += '</div>';
    });
    return html;
}

function renderPresidentialChart(data) {
    // data: { candidateName: { party, votes }, ... }
    var entries = Object.entries(data).sort(function (a, b) { return b[1].votes - a[1].votes; });
    var max = entries.length > 0 ? entries[0][1].votes : 1;
    if (max === 0) max = 1;
    var html = '';
    entries.forEach(function (e) {
        var name = e[0];
        var info = e[1];
        var pct = (info.votes / max * 100).toFixed(0);
        html += '<div class="history-bar-row">';
        html += '<div class="history-bar-label" title="' + name + ' (' + info.party + ')">' + name + '</div>';
        html += '<div class="history-bar-track"><div class="history-bar-fill" style="width:' + pct + '%;background:' + getPartyColor(info.party) + '"></div></div>';
        html += '<div class="history-bar-value">' + info.votes + '</div>';
        html += '</div>';
    });
    return html;
}

function renderCandidateChart(data) {
    // data: [{ no, name, party, votes, elected }, ...]
    var sorted = data.slice().sort(function (a, b) { return b.votes - a.votes; });
    var max = sorted.length > 0 ? sorted[0].votes : 1;
    if (max === 0) max = 1;
    var html = '';
    sorted.forEach(function (c) {
        var pct = (c.votes / max * 100).toFixed(0);
        var label = c.name + (c.elected ? ' ✓' : '');
        html += '<div class="history-bar-row">';
        html += '<div class="history-bar-label" title="' + c.name + ' (' + c.party + ')">' + label + '</div>';
        html += '<div class="history-bar-track"><div class="history-bar-fill" style="width:' + pct + '%;background:' + getPartyColor(c.party) + '"></div></div>';
        html += '<div class="history-bar-value">' + c.votes + '</div>';
        html += '</div>';
    });
    return html;
}

document.addEventListener('DOMContentLoaded', initMap);
