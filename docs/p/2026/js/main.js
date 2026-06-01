var map, overviewLayer, detailLayer, locateMarker, selectedLayer, selectedCunliLayer, cunliLabel;
var candidatesData = null;
var indexData = null;
var tppZonesData = null;
var linksData = null;
var currentElType = '';
var overviewCache = {};
var infoModal, galleryModal;

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
    galleryModal = new bootstrap.Modal(document.getElementById('galleryModal'));

    Promise.all([
        fetch('zones/index.json').then(function (r) { return r.json(); }),
        fetch('data/candidates.json').then(function (r) { return r.json(); }),
        fetch('tpp/zones.json').then(function (r) { return r.json(); }).catch(function () { return []; }),
        fetch('data/links.json').then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (results) {
        indexData = results[0];
        candidatesData = results[1];
        tppZonesData = results[2];
        linksData = results[3];
        buildElectionTypeSelector();
        // Preload indigenous overview caches for gallery type detection
        ['平地原住民議員', '山地原住民議員'].forEach(function (t) {
            if (indexData.counts[t]) loadOverviewCache(t);
        });
        // Default to first type that has zones
        var types = indexData.types.filter(function (t) { return indexData.counts[t]; });
        if (types.length > 0) {
            selectElectionType(types[0]);
        }
    });
}

function buildElectionTypeSelector() {
    var container = document.getElementById('electionBtns');
    container.innerHTML = '';
    indexData.types.forEach(function (et) {
        var count = indexData.counts[et] || 0;
        if (count === 0) return;
        var btn = document.createElement('button');
        btn.className = 'btn btn-outline-dark btn-sm shadow-sm';
        btn.setAttribute('data-et', et);
        btn.textContent = et + ' (' + count + ')';
        btn.addEventListener('click', function () {
            selectElectionType(et);
        });
        container.appendChild(btn);
    });
    var galleryBtn = document.createElement('button');
    galleryBtn.className = 'btn btn-outline-secondary btn-sm shadow-sm';
    galleryBtn.textContent = '全部參選人';
    galleryBtn.addEventListener('click', openGallery);
    container.appendChild(galleryBtn);
}

function updateElectionBtns(et) {
    var btns = document.querySelectorAll('#electionBtns .btn');
    btns.forEach(function (btn) {
        if (btn.getAttribute('data-et') === et) {
            btn.className = 'btn btn-dark btn-sm shadow-sm';
        } else {
            btn.className = 'btn btn-outline-dark btn-sm shadow-sm';
        }
    });
}

function selectElectionType(et) {
    currentElType = et;
    updateElectionBtns(et);
    selectedLayer = null;
    clearDetail();
    loadOverview(et);
}

function loadOverviewCache(et) {
    if (overviewCache[et]) return Promise.resolve();
    var url = 'zones/overview/' + encodeURIComponent(et) + '.json';
    return fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (fc) { overviewCache[et] = fc; })
        .catch(function () {});
}

function loadOverview(et) {
    if (overviewCache[et]) {
        renderOverview(overviewCache[et]);
        return Promise.resolve();
    }
    var url = 'zones/overview/' + encodeURIComponent(et) + '.json';
    return fetch(url)
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

function selectedStyle() {
    return { fillColor: '#FFD700', weight: 3, color: '#E53935', fillOpacity: 0.6 };
}

function cunliSelectedStyle() {
    return { fillColor: '#FF6F00', weight: 3, color: '#E53935', fillOpacity: 0.5 };
}

function cunliDefaultStyle() {
    return {
        fillColor: '#0ABAB5',
        weight: 1,
        opacity: 0.6,
        color: '#089E9A',
        fillOpacity: 0.15
    };
}

function clearCunliSelection() {
    if (selectedCunliLayer && detailLayer) {
        selectedCunliLayer.setStyle(cunliDefaultStyle());
    }
    selectedCunliLayer = null;
    if (cunliLabel) {
        map.removeLayer(cunliLabel);
        cunliLabel = null;
    }
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
                mouseover: function (e) {
                    if (e.target !== selectedLayer) e.target.setStyle(highlightStyle());
                },
                mouseout: function (e) {
                    if (e.target !== selectedLayer) overviewLayer.resetStyle(e.target);
                },
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
    if (selectedLayer && overviewLayer) {
        overviewLayer.resetStyle(selectedLayer);
    }
    selectedLayer = layer;
    layer.setStyle(selectedStyle());
    layer.bringToFront();
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
                style: cunliDefaultStyle,
                onEachFeature: function (feature, layer) {
                    var p = feature.properties;
                    var name = (p.TOWNNAME || '') + (p.VILLNAME || '');
                    layer.bindTooltip(name, { sticky: true });
                    layer.on({
                        mouseover: function (e) {
                            if (e.target !== selectedCunliLayer) {
                                e.target.setStyle({ weight: 2, fillOpacity: 0.3 });
                            }
                        },
                        mouseout: function (e) {
                            if (e.target !== selectedCunliLayer) {
                                e.target.setStyle(cunliDefaultStyle());
                            }
                        },
                        click: function (e) {
                            L.DomEvent.stopPropagation(e);
                            onCunliClick(feature, layer);
                        }
                    });
                }
            }).addTo(map);
        })
        .catch(function () {});
}

function onCunliClick(feature, layer) {
    clearCunliSelection();
    selectedCunliLayer = layer;
    layer.setStyle(cunliSelectedStyle());
    layer.bringToFront();

    var p = feature.properties;
    var name = (p.TOWNNAME || '') + (p.VILLNAME || '');
    var center = layer.getBounds().getCenter();
    cunliLabel = L.marker(center, {
        icon: L.divIcon({
            className: 'cunli-label',
            html: '<span>' + name + '</span>',
            iconSize: null
        }),
        interactive: false
    }).addTo(map);
}

function clearDetail() {
    clearCunliSelection();
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
            html += renderCandidateLinks(c.name);
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

    var matchElTypes = [elType];
    if (elType === '平地原住民議員' || elType === '山地原住民議員') {
        matchElTypes = ['直轄市議員', '縣市議員'];
    }

    return candidatesData.candidates.filter(function (c) {
        if (matchElTypes.indexOf(c.election) === -1) return false;

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

function renderCandidateLinks(name) {
    var links = linksData && linksData[name];
    if (!links) return '';
    var html = '<div class="mt-2 d-flex flex-wrap gap-1">';
    if (links.donate) {
        html += '<a href="' + links.donate + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-danger"><i class="bi bi-heart-fill"></i> 捐款</a>';
    }
    if (links.facebook) {
        html += '<a href="' + links.facebook + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary"><i class="bi bi-facebook"></i></a>';
    }
    if (links.instagram) {
        html += '<a href="' + links.instagram + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-danger"><i class="bi bi-instagram"></i></a>';
    }
    if (links.youtube) {
        html += '<a href="' + links.youtube + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-danger"><i class="bi bi-youtube"></i></a>';
    }
    if (links.threads) {
        html += '<a href="' + links.threads + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-dark"><i class="bi bi-threads"></i></a>';
    }
    if (links.x) {
        html += '<a href="' + links.x + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-dark"><i class="bi bi-twitter-x"></i></a>';
    }
    if (links.tiktok) {
        html += '<a href="' + links.tiktok + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-dark"><i class="bi bi-tiktok"></i></a>';
    }
    if (links.line) {
        html += '<a href="' + links.line + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-success"><i class="bi bi-line"></i></a>';
    }
    if (links.website) {
        html += '<a href="' + links.website + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary"><i class="bi bi-globe"></i></a>';
    }
    html += '</div>';
    return html;
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

function candidateSortKey(c) {
    var key = c.election + '-' + (c.countyCode || '') + '-' + (c.townCode || '') + '-';
    if (c.district) {
        var num = parseInt(c.district.replace(/[^\d]/g, ''), 10);
        key += (isNaN(num) ? '000' : ('000' + num).slice(-3));
    }
    key += '-' + (c.villCode || '');
    return key;
}

function openGallery() {
    if (!candidatesData) return;
    var grid = document.getElementById('galleryGrid');
    var searchInput = document.getElementById('gallerySearch');
    searchInput.value = '';
    var sorted = candidatesData.candidates.map(function (c, idx) {
        return { c: c, idx: idx, key: candidateSortKey(c) };
    });
    for (var i = sorted.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = sorted[i]; sorted[i] = sorted[j]; sorted[j] = tmp;
    }
    var html = '';
    sorted.forEach(function (item) {
        var c = item.c;
        var searchText = [c.name, c.election, c.party, c.district, c.countyName].filter(Boolean).join(' ');
        html += '<div class="gallery-item" data-search="' + searchText + '" onclick="onGallerySelect(' + item.idx + ')">';
        if (c.photo) {
            html += '<img src="' + c.photo + '" alt="' + c.name + '" loading="lazy">';
        } else {
            html += '<div style="width:100%;aspect-ratio:1;background:#e9ecef;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#6c757d">' + (c.name ? c.name.charAt(0) : '?') + '</div>';
        }
        html += '<div class="gallery-label"><strong>' + c.name + '</strong>';
        var area = c.countyName || '';
        if (c.townName) area += c.townName;
        html += '<small>' + area + ' ' + c.election + (c.district ? ' ' + c.district : '') + '</small></div>';
        html += '</div>';
    });
    grid.innerHTML = html;
    galleryModal.show();
}

function filterGallery(keyword) {
    var items = document.querySelectorAll('#galleryGrid .gallery-item');
    var kw = keyword.trim().toLowerCase();
    items.forEach(function (el) {
        var text = (el.getAttribute('data-search') || '').toLowerCase();
        el.style.display = (!kw || text.indexOf(kw) !== -1) ? '' : 'none';
    });
}

function getDisplayElType(candidate) {
    var et = candidate.election;
    if (et === '直轄市議員' || et === '縣市議員') {
        var district = candidate.district || '';
        var num = parseInt(district.replace(/[^\d]/g, ''), 10);
        if (!isNaN(num)) {
            var code = candidate.countyCode;
            var numStr = (num < 10 ? '0' : '') + num;
            // Check if this zone exists in the preloaded overview caches
            var types = ['平地原住民議員', '山地原住民議員'];
            var prefixes = ['T2', 'T3'];
            for (var i = 0; i < types.length; i++) {
                if (overviewCache[types[i]]) {
                    var zc = prefixes[i] + '-' + code + '-' + numStr;
                    var found = overviewCache[types[i]].features.some(function (f) {
                        return f.properties.code === zc;
                    });
                    if (found) return types[i];
                }
            }
        }
    }
    return et;
}

function onGallerySelect(idx) {
    var c = candidatesData.candidates[idx];
    galleryModal.hide();

    function navigateToZone() {
        var zoneCode = findZoneCodeForCandidate(c);
        if (!zoneCode || !overviewLayer) return;
        overviewLayer.eachLayer(function (layer) {
            if (layer.feature && layer.feature.properties.code === zoneCode) {
                onZoneClick(layer.feature.properties, layer);
            }
        });
    }

    var displayEt = getDisplayElType(c);
    if (displayEt !== currentElType) {
        currentElType = displayEt;
        updateElectionBtns(displayEt);
        clearDetail();
        loadOverview(displayEt).then(navigateToZone);
    } else {
        navigateToZone();
    }
}

function findZoneCodeForCandidate(c) {
    if (!overviewLayer) return null;
    var found = null;
    overviewLayer.eachLayer(function (layer) {
        if (found) return;
        var code = layer.feature && layer.feature.properties.code;
        if (!code) return;

        if (code.startsWith('mayor-')) {
            var areaCode = code.substring(6);
            if ((areaCode.length === 5 && c.countyCode === areaCode) ||
                (areaCode.length === 8 && c.townCode === areaCode)) {
                found = code;
            }
            return;
        }
        if (code.startsWith('village-')) {
            if (c.villCode === code.substring(8)) found = code;
            return;
        }
        var parts = code.split('-');
        if (parts.length === 3) {
            var districtNum = parseInt(parts[2], 10);
            var districtMatch = c.district && parseInt(c.district.replace(/[^\d]/g, ''), 10) === districtNum;
            if (parts[0].startsWith('R')) {
                if (c.townCode === parts[1] && districtMatch) found = code;
            } else {
                if (c.countyCode === parts[1] && districtMatch) found = code;
            }
        }
    });
    return found;
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
