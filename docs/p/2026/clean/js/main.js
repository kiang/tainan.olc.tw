var map, clusterGroup, zoneLayer, cityModal;
var allCandidates = [];
var currentCityCandidates = [];
var activeFilters = new Set();
var zoneCentroids = {};
var localCentroids = {};

var NLSC_TILE = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';

var countyCodeToName = {
    '63000': '臺北市', '64000': '高雄市', '65000': '新北市', '66000': '臺中市',
    '67000': '臺南市', '68000': '桃園市', '09007': '連江縣', '09020': '金門縣',
    '10002': '宜蘭縣', '10004': '新竹縣', '10005': '苗栗縣', '10007': '彰化縣',
    '10008': '南投縣', '10009': '雲林縣', '10010': '嘉義縣', '10013': '屏東縣',
    '10014': '臺東縣', '10015': '花蓮縣', '10016': '澎湖縣', '10017': '基隆市',
    '10018': '新竹市', '10020': '嘉義市'
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
    clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });
    map.addLayer(clusterGroup);
    cityModal = new bootstrap.Modal(document.getElementById('cityModal'));

    Promise.all([
        fetch('../../../json/council2026.json').then(function (r) { return r.json(); }),
        fetch('../../../json/local2026.json').then(function (r) { return r.json(); }),
        fetch('../zones/index.json').then(function (r) { return r.json(); }),
        fetch('data/centroids.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
        var council = results[0];
        var localData = results[1];
        var zoneIndex = results[2];
        localCentroids = results[3];
        normalizeData(council, localData);
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
                var code = f.properties.code;
                var centroid = f.properties.centroid;
                if (centroid) {
                    zoneCentroids[code] = [centroid[1], centroid[0]];
                }
            });
        });
        assignCoordinates();
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
            source: 'council',
            latlng: null
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
        var locationKey = (p.county || '') + (p.township || '') + (p.village || '');
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
            source: 'local',
            locationKey: locationKey,
            latlng: null
        });
    });
}

function assignCoordinates() {
    // Assign coordinates to local candidates from cunli centroids
    allCandidates.forEach(function (c) {
        if (c.source === 'local' && c.locationKey) {
            var coords = localCentroids[c.locationKey];
            if (!coords) {
                var altKey = c.locationKey.replace(/台/g, '臺');
                coords = localCentroids[altKey];
            }
            if (!coords) {
                var altKey2 = c.locationKey.replace(/臺/g, '台');
                coords = localCentroids[altKey2];
            }
            if (coords) {
                c.latlng = coords;
            }
        }
    });

    // Assign coordinates to council candidates from zone centroids
    // Build zone code lookup by city+district
    var zoneCodeByCity = {};
    Object.keys(zoneCentroids).forEach(function (code) {
        var parts = code.split('-');
        var countyCode = parts[1] || '';
        var distPadded = parts[2] || '';
        var distNum = parseInt(distPadded, 10);
        var cityName = countyCodeToName[countyCode] || '';
        if (!cityName || isNaN(distNum)) return;
        zoneCodeByCity[cityName + '|' + distNum] = code;
        var altCity = cityName.replace(/臺/g, '台');
        if (altCity !== cityName) zoneCodeByCity[altCity + '|' + distNum] = code;
    });

    allCandidates.forEach(function (c) {
        if (c.source !== 'council') return;
        var m = c.district.match(/(\d+)/);
        if (!m) return;
        var distNum = parseInt(m[1], 10);
        var key = c.city + '|' + distNum;
        var zoneCode = zoneCodeByCity[key];
        if (zoneCode && zoneCentroids[zoneCode]) {
            c.latlng = zoneCentroids[zoneCode];
        }
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

function getMarkerColor(c) {
    if (c.tags.indexOf('刑事犯罪') >= 0) return '#c0392b';
    if (c.tags.indexOf('起訴') >= 0) return '#e67e22';
    if (c.tags.indexOf('酒駕') >= 0) return '#d35400';
    if (c.tags.indexOf('當選無效') >= 0) return '#8e44ad';
    if (c.tags.indexOf('親屬紀錄') >= 0) return '#2980b9';
    return '#c0392b';
}

function renderMap() {
    clusterGroup.clearLayers();
    var filtered = getFilteredCandidates();

    filtered.forEach(function (c) {
        if (!c.latlng) return;
        var color = getMarkerColor(c);
        var icon = L.divIcon({
            className: '',
            html: '<div class="candidate-marker" style="background:' + color + ';">' +
                escHtml(c.name.charAt(0)) + '</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
        var marker = L.marker(c.latlng, { icon: icon });
        var tooltip = c.name + ' (' + c.party + ')\n' +
            c.city + ' ' + c.district + '\n' +
            c.tags.join('、');
        marker.bindTooltip(tooltip, { direction: 'top' });
        marker.on('click', function () {
            openCityModal(c.city + ' ' + c.district, [c]);
        });
        clusterGroup.addLayer(marker);
    });
}

function buildLegend() {
    var el = document.getElementById('legend');
    el.innerHTML =
        '<div class="legend-item"><div class="legend-dot" style="background:#c0392b;"></div>刑事犯罪（有罪）</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#e67e22;"></div>起訴中</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#d35400;"></div>酒駕</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#8e44ad;"></div>當選無效</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#2980b9;"></div>親屬紀錄</div>' +
        '<div style="margin-top:4px;color:#888;font-size:0.65rem;">點擊標記查看候選人詳情<br>數字圓圈為群組，點擊展開</div>';
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
