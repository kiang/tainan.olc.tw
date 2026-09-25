var map, zoneLayer, cityModal;
var allCandidates = [];
var councilRaw = [];
var localRaw = {};
var currentCityCandidates = [];
var activeFilters = new Set();
var zoneFeatures = [];
var candidatesByZone = {};

var NLSC_TILE = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';

var countyCodeToName = {
    '63000': '台北市', '64000': '高雄市', '65000': '新北市', '66000': '台中市',
    '67000': '台南市', '68000': '桃園市', '09007': '連江縣', '09020': '金門縣',
    '10002': '宜蘭縣', '10003': '新竹縣', '10004': '苗栗縣', '10005': '彰化縣',
    '10007': '南投縣', '10008': '雲林縣', '10009': '嘉義縣', '10010': '屏東縣',
    '10013': '花蓮縣', '10014': '台東縣', '10015': '澎湖縣', '10016': '基隆市',
    '10017': '新竹市', '10018': '嘉義市'
};

var tagConfig = {
    '刑事犯罪': { label: '刑事犯罪', badge: 'badge-conviction', color: '#c0392b' },
    '起訴': { label: '起訴中', badge: 'badge-indictment', color: '#e67e22' },
    '酒駕': { label: '酒駕', badge: 'badge-dui', color: '#d35400' },
    '當選無效': { label: '當選無效', badge: 'badge-invalidation', color: '#8e44ad' },
    '親屬紀錄': { label: '親屬紀錄', badge: 'badge-family', color: '#2980b9' }
};

function initMap() {
    map = L.map('map', { center: [23.7, 120.9], zoom: 7, zoomControl: true });
    L.tileLayer(NLSC_TILE, { maxZoom: 18, attribution: '&copy; NLSC' }).addTo(map);
    zoneLayer = L.layerGroup().addTo(map);
    cityModal = new bootstrap.Modal(document.getElementById('cityModal'));

    Promise.all([
        fetch('../../../json/council2026.json').then(function (r) { return r.json(); }),
        fetch('../../../json/local2026.json').then(function (r) { return r.json(); }),
        fetch('../zones/index.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
        councilRaw = results[0];
        localRaw = results[1];
        var zoneIndex = results[2];
        normalizeData(councilRaw, localRaw);
        buildFilters();
        updateStats();
        buildLegend();
        loadZoneOverviews(zoneIndex);
    });
}

function loadZoneOverviews(zoneIndex) {
    var types = Object.keys(zoneIndex.counts).filter(function (t) { return zoneIndex.counts[t] > 0; });
    var fetches = types.map(function (t) {
        return fetch('../zones/overview/' + encodeURIComponent(t) + '.json')
            .then(function (r) { return r.json(); })
            .then(function (fc) { return { type: t, features: fc.features }; })
            .catch(function () { return { type: t, features: [] }; });
    });
    Promise.all(fetches).then(function (results) {
        results.forEach(function (r) {
            r.features.forEach(function (f) {
                f.properties._electionType = r.type;
                zoneFeatures.push(f);
            });
        });
        mapCandidatesToZones();
        renderMap();
    });
}

function normalizeData(council, localData) {
    council.forEach(function (c) {
        if (!c.hasCriminalRecord &&
            (!c.electionInvalidityRecords || c.electionInvalidityRecords.length === 0) &&
            (!c.familyRecords || c.familyRecords.length === 0)) return;
        var tags = (c.tags || []).slice();
        if (c.electionInvalidityRecords && c.electionInvalidityRecords.length > 0 && tags.indexOf('當選無效') === -1) tags.push('當選無效');
        if (c.familyRecords && c.familyRecords.length > 0 && tags.indexOf('親屬紀錄') === -1) tags.push('親屬紀錄');
        allCandidates.push({
            name: c.name,
            city: c.city,
            district: c.district,
            level: c.level || '議員',
            party: c.party,
            incumbent: c.incumbent,
            tags: tags,
            records: (c.records || []).map(function (r) {
                return {
                    type: r.recordType,
                    offense: r.offense,
                    sentence: r.sentence,
                    status: r.status,
                    caseNo: r.caseNo,
                    judgmentUrl: r.judgmentUrl,
                    sources: r.sources || []
                };
            }),
            electionInvalidityRecords: c.electionInvalidityRecords || [],
            familyRecords: c.familyRecords || [],
            source: 'council'
        });
    });

    var localPeople = localData.people || [];
    localPeople.forEach(function (p) {
        if (!p.records || p.records.length === 0) return;
        var tags = [];
        p.records.forEach(function (r) {
            if (r.recordType === 'conviction' && tags.indexOf('刑事犯罪') === -1) tags.push('刑事犯罪');
            if (r.recordType === 'indictment' && tags.indexOf('起訴') === -1) tags.push('起訴');
        });
        var level = '村里長';
        if (p.records[0] && p.records[0].officeType) {
            var ot = p.records[0].officeType;
            if (ot === 'village-chief') level = '村里長';
            else if (ot === 'township-rep') level = '鄉鎮市民代表';
            else if (ot === 'township-mayor') level = '鄉鎮市長';
            else if (ot === 'county-mayor') level = '縣市長';
            else level = ot;
        }
        allCandidates.push({
            name: p.name,
            city: p.county,
            district: (p.township || '') + (p.village || ''),
            level: level,
            party: p.party || '無',
            incumbent: p.incumbent === '是',
            tags: tags,
            records: p.records.map(function (r) {
                return {
                    type: r.recordTypeLabel || r.recordType,
                    offense: r.offense,
                    sentence: r.sentence,
                    status: (r.displayStage || '') + (r.finality ? ' (' + r.finality + ')' : ''),
                    caseNo: r.judgmentNumber || '',
                    judgmentUrl: r.judgmentUrl,
                    sources: (r.sources || []).map(function (s) {
                        if (typeof s === 'string') return { url: s };
                        return s;
                    })
                };
            }),
            electionInvalidityRecords: [],
            familyRecords: [],
            source: 'local'
        });
    });
}

function mapCandidatesToZones() {
    candidatesByZone = {};

    // Build lookup: normalize city name (台→臺 and vice versa) + district number → candidates
    var cityDistrictMap = {};
    allCandidates.forEach(function (c) {
        if (c.source !== 'council') return;
        var m = c.district.match(/(\d+)/);
        if (!m) return;
        var distNum = parseInt(m[1], 10);
        var keys = [c.city + '|' + distNum];
        // Also add normalized variants (台↔臺)
        var altCity = c.city.replace(/台/g, '臺');
        if (altCity !== c.city) keys.push(altCity + '|' + distNum);
        altCity = c.city.replace(/臺/g, '台');
        if (altCity !== c.city) keys.push(altCity + '|' + distNum);

        keys.forEach(function (key) {
            if (!cityDistrictMap[key]) cityDistrictMap[key] = [];
            cityDistrictMap[key].push(c);
        });
    });

    zoneFeatures.forEach(function (f) {
        var code = f.properties.code;
        var parts = code.split('-');
        var countyCode = parts[1] || '';
        var distPadded = parts[2] || '';
        var distNum = parseInt(distPadded, 10);
        var cityName = countyCodeToName[countyCode] || '';

        if (!cityName || isNaN(distNum)) return;

        var key = cityName + '|' + distNum;
        var matched = cityDistrictMap[key] || [];

        if (matched.length > 0) {
            candidatesByZone[code] = matched;
        }
    });

    // Add local candidates grouped by city
    allCandidates.forEach(function (c) {
        if (c.source !== 'local') return;
        var cityKey = 'city-' + c.city;
        if (!candidatesByZone[cityKey]) candidatesByZone[cityKey] = [];
        candidatesByZone[cityKey].push(c);
    });
}

function buildFilters() {
    var bar = document.getElementById('filterBar');
    var allTags = {};
    allCandidates.forEach(function (c) {
        c.tags.forEach(function (t) {
            allTags[t] = (allTags[t] || 0) + 1;
        });
    });

    var levelTypes = {};
    allCandidates.forEach(function (c) {
        levelTypes[c.level] = (levelTypes[c.level] || 0) + 1;
    });

    Object.keys(tagConfig).forEach(function (tag) {
        if (!allTags[tag]) return;
        var btn = document.createElement('button');
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.textContent = tagConfig[tag].label + ' (' + allTags[tag] + ')';
        btn.setAttribute('data-tag', tag);
        btn.addEventListener('click', function () {
            toggleFilter('tag:' + tag, btn);
        });
        bar.appendChild(btn);
    });

    var sep = document.createElement('span');
    sep.style.cssText = 'border-left:1px solid #ccc;height:20px;margin:0 4px;';
    bar.appendChild(sep);

    Object.keys(levelTypes).forEach(function (lv) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.textContent = lv + ' (' + levelTypes[lv] + ')';
        btn.setAttribute('data-level', lv);
        btn.addEventListener('click', function () {
            toggleFilter('level:' + lv, btn);
        });
        bar.appendChild(btn);
    });
}

function toggleFilter(key, btn) {
    if (activeFilters.has(key)) {
        activeFilters.delete(key);
        btn.classList.remove('active');
    } else {
        activeFilters.add(key);
        btn.classList.add('active');
    }
    updateStats();
    renderMap();
}

function getFilteredCandidates() {
    if (activeFilters.size === 0) return allCandidates;
    var tagFilters = [];
    var levelFilters = [];
    activeFilters.forEach(function (f) {
        if (f.startsWith('tag:')) tagFilters.push(f.substring(4));
        if (f.startsWith('level:')) levelFilters.push(f.substring(6));
    });
    return allCandidates.filter(function (c) {
        var tagMatch = tagFilters.length === 0 || tagFilters.some(function (t) { return c.tags.indexOf(t) >= 0; });
        var levelMatch = levelFilters.length === 0 || levelFilters.indexOf(c.level) >= 0;
        return tagMatch && levelMatch;
    });
}

function updateStats() {
    var filtered = getFilteredCandidates();
    var el = document.getElementById('headerStats');
    el.innerHTML =
        '<span class="stat-item">候選人 <span class="stat-num">' + filtered.length + '</span> 人</span>' +
        '<span class="stat-item">涵蓋 <span class="stat-num">' + countCities(filtered) + '</span> 縣市</span>';
}

function countCities(list) {
    var s = {};
    list.forEach(function (c) { s[c.city] = true; });
    return Object.keys(s).length;
}

function filterZoneCandidates(candidates) {
    if (activeFilters.size === 0) return candidates;
    var tagFilters = [];
    var levelFilters = [];
    activeFilters.forEach(function (f) {
        if (f.startsWith('tag:')) tagFilters.push(f.substring(4));
        if (f.startsWith('level:')) levelFilters.push(f.substring(6));
    });
    return candidates.filter(function (c) {
        var tagMatch = tagFilters.length === 0 || tagFilters.some(function (t) { return c.tags.indexOf(t) >= 0; });
        var levelMatch = levelFilters.length === 0 || levelFilters.indexOf(c.level) >= 0;
        return tagMatch && levelMatch;
    });
}

function renderMap() {
    zoneLayer.clearLayers();
    var filtered = getFilteredCandidates();
    var filteredSet = new Set(filtered);

    // Render zone polygons for council candidates
    zoneFeatures.forEach(function (f) {
        var code = f.properties.code;
        var zoneCandidates = candidatesByZone[code] || [];
        var visibleCandidates = zoneCandidates.filter(function (c) { return filteredSet.has(c); });
        if (visibleCandidates.length === 0) return;

        var hasConviction = visibleCandidates.some(function (c) { return c.tags.indexOf('刑事犯罪') >= 0; });
        var hasIndictment = visibleCandidates.some(function (c) { return c.tags.indexOf('起訴') >= 0; });
        var hasDUI = visibleCandidates.some(function (c) { return c.tags.indexOf('酒駕') >= 0; });

        var fillColor = hasConviction ? '#e74c3c' : hasIndictment ? '#e67e22' : hasDUI ? '#d35400' : '#8e44ad';
        var weight = 2;
        var fillOpacity = 0.35 + Math.min(visibleCandidates.length * 0.08, 0.35);

        var layer = L.geoJSON(f, {
            style: {
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                color: fillColor,
                weight: weight,
                opacity: 0.7
            }
        });

        var zoneName = f.properties.name || code;
        var tooltipLines = [zoneName + '：' + visibleCandidates.length + ' 人有紀錄'];
        visibleCandidates.forEach(function (c) {
            tooltipLines.push('• ' + c.name + ' (' + c.party + ') ' + c.tags.join('、'));
        });
        layer.bindTooltip(tooltipLines.join('\n'), { sticky: true, direction: 'top' });

        layer.on('click', function () {
            openCityModal(zoneName, visibleCandidates);
        });

        zoneLayer.addLayer(layer);
    });

    // Render local candidates as city-level circle markers
    var cityCentroids = {
        '台北市': [25.033, 121.565], '新北市': [25.012, 121.465], '基隆市': [25.128, 121.739],
        '桃園市': [24.994, 121.301], '新竹市': [24.804, 120.969], '新竹縣': [24.839, 121.174],
        '苗栗縣': [24.560, 120.821], '台中市': [24.148, 120.674], '彰化縣': [24.052, 120.516],
        '南投縣': [23.911, 120.687], '雲林縣': [23.710, 120.431], '嘉義市': [23.480, 120.449],
        '嘉義縣': [23.452, 120.255], '台南市': [23.000, 120.227], '高雄市': [22.627, 120.301],
        '屏東縣': [22.552, 120.549], '宜蘭縣': [24.702, 121.738], '花蓮縣': [23.992, 121.601],
        '台東縣': [22.756, 121.144], '澎湖縣': [23.571, 119.579], '金門縣': [24.449, 118.377],
        '連江縣': [26.160, 119.950]
    };

    Object.keys(candidatesByZone).forEach(function (key) {
        if (!key.startsWith('city-')) return;
        var city = key.substring(5);
        var candidates = candidatesByZone[key];
        var visibleCandidates = candidates.filter(function (c) { return filteredSet.has(c); });
        if (visibleCandidates.length === 0) return;

        var coords = cityCentroids[city];
        if (!coords) return;

        var hasConviction = visibleCandidates.some(function (c) { return c.tags.indexOf('刑事犯罪') >= 0; });
        var color = hasConviction ? '#c0392b' : '#e67e22';
        var radius = Math.max(8, Math.min(20, 8 + visibleCandidates.length));

        var marker = L.circleMarker(coords, {
            radius: radius,
            fillColor: color,
            fillOpacity: 0.7,
            color: '#fff',
            weight: 2
        });

        var tooltipLines = [city + ' 村里長等：' + visibleCandidates.length + ' 人有紀錄'];
        marker.bindTooltip(tooltipLines.join('\n'), { direction: 'top' });
        marker.on('click', function () {
            openCityModal(city + ' — 村里長/鄉鎮市代表等', visibleCandidates);
        });

        zoneLayer.addLayer(marker);
    });
}

function buildLegend() {
    var el = document.getElementById('legend');
    el.innerHTML =
        '<div class="legend-item"><div class="legend-dot" style="background:#c0392b;"></div>刑事犯罪（有罪）</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#e67e22;"></div>起訴中</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#d35400;"></div>酒駕</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#8e44ad;"></div>當選無效／其他</div>' +
        '<div style="margin-top:4px;color:#888;font-size:0.65rem;">顏色深淺代表人數多寡<br>點擊選區查看候選人詳情</div>';
}

function openCityModal(title, candidates) {
    currentCityCandidates = candidates;
    document.getElementById('cityModalTitle').textContent = title + ' — ' + candidates.length + ' 位候選人有紀錄';
    document.getElementById('citySearch').value = '';
    renderCityList(candidates);
    cityModal.show();
}

function filterCityList(query) {
    query = query.toLowerCase();
    var filtered = currentCityCandidates.filter(function (c) {
        return c.name.toLowerCase().indexOf(query) >= 0 ||
            c.district.toLowerCase().indexOf(query) >= 0 ||
            c.party.toLowerCase().indexOf(query) >= 0;
    });
    renderCityList(filtered);
}

function renderCityList(candidates) {
    var body = document.getElementById('cityModalBody');
    if (candidates.length === 0) {
        body.innerHTML = '<p class="text-muted text-center py-4">無符合條件的候選人</p>';
        return;
    }

    var html = '';
    candidates.forEach(function (c) {
        var cardClass = 'candidate-card';
        if (c.tags.indexOf('刑事犯罪') >= 0) cardClass += ' has-conviction';
        else if (c.tags.indexOf('起訴') >= 0) cardClass += ' has-indictment';

        html += '<div class="' + cardClass + '">';
        html += '<div class="d-flex gap-3">';

        html += '<div class="flex-grow-1">';
        html += '<h6>' + escHtml(c.name);
        if (c.incumbent) html += ' <span class="badge bg-secondary" style="font-size:0.65rem;">現任</span>';
        html += '</h6>';
        html += '<div style="font-size:0.8rem;color:#666;">' + escHtml(c.district) + ' · ' + escHtml(c.level) + ' · ' + escHtml(c.party) + '</div>';

        html += '<div class="mt-1">';
        c.tags.forEach(function (t) {
            var cfg = tagConfig[t];
            if (cfg) {
                html += '<span class="badge ' + cfg.badge + ' me-1">' + escHtml(cfg.label) + '</span>';
            }
        });
        html += '</div>';
        html += '</div></div>';

        c.records.forEach(function (r) {
            html += '<div class="record-item">';
            html += '<div class="record-label">' + escHtml(r.type || '紀錄') + '</div>';
            if (r.offense) html += '<div><strong>罪名：</strong>' + escHtml(r.offense) + '</div>';
            if (r.sentence) html += '<div><strong>刑度：</strong>' + escHtml(r.sentence) + '</div>';
            if (r.status) html += '<div><strong>狀態：</strong>' + escHtml(r.status) + '</div>';
            if (r.caseNo) html += '<div><strong>案號：</strong>' + escHtml(r.caseNo) + '</div>';
            if (r.judgmentUrl) html += '<div><a href="' + escHtml(r.judgmentUrl) + '" target="_blank" rel="noopener">裁判書全文 <i class="bi bi-box-arrow-up-right"></i></a></div>';
            if (r.sources && r.sources.length > 0) {
                html += '<div class="mt-1"><strong>新聞來源：</strong>';
                r.sources.forEach(function (s, i) {
                    var label = s.media || s.url || '來源';
                    var url = s.url || s;
                    if (typeof url === 'string') {
                        html += (i > 0 ? '、' : '') + '<a href="' + escHtml(url) + '" target="_blank" rel="noopener">' + escHtml(label) + '</a>';
                    }
                });
                html += '</div>';
            }
            html += '</div>';
        });

        if (c.electionInvalidityRecords && c.electionInvalidityRecords.length > 0) {
            c.electionInvalidityRecords.forEach(function (r) {
                html += '<div class="record-item">';
                html += '<div class="record-label" style="color:#8e44ad;">當選無效</div>';
                if (r.resultMeaning) html += '<div><strong>結果：</strong>' + escHtml(r.resultMeaning) + '</div>';
                if (r.court) html += '<div><strong>法院：</strong>' + escHtml(r.court) + '</div>';
                if (r.caseNo) html += '<div><strong>案號：</strong>' + escHtml(r.caseNo) + '</div>';
                if (r.date) html += '<div><strong>日期：</strong>' + escHtml(r.date) + '</div>';
                if (r.finality) html += '<div><strong>確定狀態：</strong>' + escHtml(r.finality) + '</div>';
                html += '</div>';
            });
        }

        if (c.familyRecords && c.familyRecords.length > 0) {
            c.familyRecords.forEach(function (r) {
                html += '<div class="record-item">';
                html += '<div class="record-label" style="color:#2980b9;">親屬紀錄</div>';
                if (r.relationship) html += '<div><strong>關係：</strong>' + escHtml(r.relationship) + '</div>';
                if (r.predecessorName) html += '<div><strong>親屬：</strong>' + escHtml(r.predecessorName) + '</div>';
                if (r.predecessorOffense) html += '<div><strong>罪名：</strong>' + escHtml(r.predecessorOffense) + '</div>';
                if (r.predecessorSentence) html += '<div><strong>刑度：</strong>' + escHtml(r.predecessorSentence) + '</div>';
                if (r.predecessorCaseStage) html += '<div><strong>案件階段：</strong>' + escHtml(r.predecessorCaseStage) + '</div>';
                html += '</div>';
            });
        }

        html += '</div>';
    });

    body.innerHTML = html;
}

function escHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function locateUser() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
        map.setView([pos.coords.latitude, pos.coords.longitude], 12);
    });
}

document.addEventListener('DOMContentLoaded', initMap);
