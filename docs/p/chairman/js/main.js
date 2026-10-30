(function () {
    'use strict';

    var ZONE_BASE = 'zones/';
    var NLSC_TILE = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';

    var PARTY_COLORS = {
        '中國國民黨': '#000095',
        '民主進步黨': '#1b9431',
        '台灣民眾黨': '#28c8c8',
        '時代力量': '#ffd700',
        '台灣基進': '#a73f24',
        '新黨': '#ffdb00',
        '親民黨': '#ff6310',
        '台灣綠黨': '#55aa33',
        '社會民主黨': '#ff7bad',
        '無黨籍及未經政黨推薦': '#888',
        '無': '#888'
    };

    var ZONE_FILES = ['直轄市議員', '縣市議員'];

    var map, overviewLayer, locateMarker, selectedLayer;
    var challengeData = null;
    var allZonesFc = null;
    var filterJoinedOnly = true;
    var currentZoneProps = null;
    var autoTourTimer = null;
    var autoTourLayers = [];
    var autoTourIndex = 0;

    function initMap() {
        map = L.map('map', { center: [23.5, 121], zoom: 7, zoomControl: true });
        L.tileLayer(NLSC_TILE, { maxZoom: 18, attribution: '&copy; NLSC' }).addTo(map);

        document.getElementById('closePanel').addEventListener('click', closePanel);

        ['pointerdown', 'touchstart', 'wheel'].forEach(function (evt) {
            document.getElementById('map').addEventListener(evt, stopAutoTour, { passive: true });
        });

        Promise.all([
            fetch('candidates.json').then(function (r) { return r.json(); }),
            fetch(ZONE_BASE + encodeURIComponent(ZONE_FILES[0]) + '.json').then(function (r) { return r.json(); }),
            fetch(ZONE_BASE + encodeURIComponent(ZONE_FILES[1]) + '.json').then(function (r) { return r.json(); })
        ]).then(function (results) {
            challengeData = results[0];
            allZonesFc = {
                type: 'FeatureCollection',
                features: results[1].features.concat(results[2].features)
            };
            updateStats();
            renderOverview(allZonesFc);
        });
    }

    function getZoneChallenge(zoneCode) {
        if (!challengeData || !challengeData.zones) return null;
        return challengeData.zones[zoneCode] || null;
    }

    function zoneHasJoined(zoneCode) {
        var z = getZoneChallenge(zoneCode);
        if (!z || !z.candidates) return false;
        return z.candidates.some(function (c) { return c.joined; });
    }

    function zoneHasCandidates(zoneCode) {
        var z = getZoneChallenge(zoneCode);
        return z && z.candidates && z.candidates.length > 0;
    }

    function getZoneStyle(feature) {
        var code = feature.properties.code;
        var hasJoined = zoneHasJoined(code);
        var hasCandidates = zoneHasCandidates(code);

        if (hasJoined) {
            return { fillColor: '#10b981', weight: 2, opacity: 1, color: '#059669', fillOpacity: 0.55 };
        }
        if (feature.properties.candidateCount > 0) {
            return { fillColor: '#8b5cf6', weight: 2, opacity: 1, color: '#6d28d9', fillOpacity: 0.4 };
        }
        return { fillColor: '#cbd5e1', weight: 1, opacity: 0.6, color: '#94a3b8', fillOpacity: 0.25 };
    }

    function renderOverview(fc) {
        if (overviewLayer) map.removeLayer(overviewLayer);
        selectedLayer = null;

        var filteredFeatures = fc.features;
        if (filterJoinedOnly) {
            filteredFeatures = fc.features.filter(function (f) {
                return zoneHasJoined(f.properties.code);
            });
        }

        var filteredFc = { type: 'FeatureCollection', features: filteredFeatures };

        overviewLayer = L.geoJSON(filteredFc, {
            style: getZoneStyle,
            onEachFeature: function (feature, layer) {
                var props = feature.properties;
                var tip = props.name;
                if (props.candidates && props.candidates.length > 0) {
                    tip += '\n' + props.candidates.join('、');
                }
                var z = getZoneChallenge(props.code);
                if (z && z.candidates) {
                    var joined = z.candidates.filter(function (c) { return c.joined; });
                    if (joined.length > 0) {
                        tip += '\n♿ 已坐輪椅：' + joined.map(function (c) { return c.name; }).join('、');
                    }
                }
                layer.bindTooltip(tip, { sticky: true });
                layer.on({
                    mouseover: function (e) {
                        if (e.target !== selectedLayer) e.target.setStyle({ weight: 3, fillOpacity: 0.65 });
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

        updateStats();
        startAutoTour();
    }

    function startAutoTour() {
        stopAutoTour();
        if (!overviewLayer) return;
        var layers = overviewLayer.getLayers().filter(function (l) { return l.feature; });
        if (layers.length === 0) return;
        for (var i = layers.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = layers[i]; layers[i] = layers[j]; layers[j] = tmp;
        }
        autoTourLayers = layers;
        autoTourIndex = 0;
        autoTourStep();
        autoTourTimer = setInterval(autoTourStep, 5000);
    }

    function autoTourStep() {
        if (autoTourLayers.length === 0) return;
        if (autoTourIndex >= autoTourLayers.length) autoTourIndex = 0;
        var layer = autoTourLayers[autoTourIndex++];
        var props = layer.feature.properties;
        if (selectedLayer && overviewLayer) {
            overviewLayer.resetStyle(selectedLayer);
        }
        selectedLayer = layer;
        layer.setStyle({ fillColor: '#f59e0b', weight: 3, color: '#d97706', fillOpacity: 0.6 });
        layer.bringToFront();
        map.fitBounds(layer.getBounds());
        layer.openTooltip(layer.getBounds().getCenter());
        showZonePanel(props);
    }

    function stopAutoTour() {
        if (autoTourTimer) {
            clearInterval(autoTourTimer);
            autoTourTimer = null;
        }
    }

    function onZoneClick(props, layer) {
        stopAutoTour();
        if (selectedLayer && overviewLayer) {
            overviewLayer.resetStyle(selectedLayer);
        }
        selectedLayer = layer;
        layer.setStyle({ fillColor: '#f59e0b', weight: 3, color: '#d97706', fillOpacity: 0.6 });
        layer.bringToFront();
        map.fitBounds(layer.getBounds());
        showZonePanel(props);
    }

    function showZonePanel(props) {
        var panel = document.getElementById('infoPanel');
        var title = document.getElementById('infoPanelTitle');

        currentZoneProps = props;
        title.textContent = props.name;
        panel.classList.add('open');
        renderZonePanel(props);
    }

    function renderZonePanel(props) {
        var body = document.getElementById('infoPanelBody');
        var z = getZoneChallenge(props.code);
        var candidates = (z && z.candidates) ? z.candidates : [];

        var html = '';
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="font-size:0.85rem;color:#64748b;">' + esc(props.type || '') + '</div>';
        html += '<div style="font-weight:700;font-size:1.1rem;">' + esc(props.name) + '</div>';
        html += '<div style="font-size:0.8rem;color:#94a3b8;margin-top:2px;">' + candidates.length + ' 位候選人</div>';
        html += '</div>';

        if (candidates.length === 0) {
            html += '<p style="color:#94a3b8;text-align:center;padding:20px;">尚無候選人資料</p>';
            body.innerHTML = html;
            return;
        }

        var joined = candidates.filter(function (c) { return c.joined; });
        var notJoined = candidates.filter(function (c) { return !c.joined; });

        if (joined.length > 0) {
            html += '<div style="font-size:0.85rem;font-weight:700;color:#059669;margin-bottom:8px;">♿ 已坐輪椅 (' + joined.length + ')</div>';
            joined.forEach(function (c) { html += renderCandCard(c); });
        }

        if (notJoined.length > 0) {
            if (joined.length > 0) {
                html += '<div style="font-size:0.85rem;font-weight:700;color:#64748b;margin:12px 0 8px;">尚未坐輪椅 (' + notJoined.length + ')</div>';
            }
            notJoined.forEach(function (c) { html += renderCandCard(c); });
        }

        body.innerHTML = html;
        if (html.indexOf('text-post-media') !== -1) reloadThreadsEmbed();
    }

    function renderCandCard(c) {
        var isJoined = c.joined || false;
        var photoSrc = c.photo || '';
        if (photoSrc && !photoSrc.startsWith('http')) {
            photoSrc = 'https://kiang.github.io/tainan.olc.tw/p/2026/' + photoSrc;
        }

        var html = '<div class="cand-card' + (isJoined ? ' is-joined' : '') + '">';

        if (photoSrc) {
            html += '<img class="cand-photo" src="' + esc(photoSrc) + '" alt="' + esc(c.name) + '" onerror="this.style.display=\'none\'">';
        }

        html += '<div class="cand-info">';
        html += '<div class="cand-name">';
        if (c.party) {
            html += '<span class="party-dot" style="background:' + partyColor(c.party) + '"></span>';
        }
        html += esc(c.name);
        if (isJoined) {
            html += '<span class="joined-badge">♿ 已坐輪椅</span>';
        }
        html += '</div>';
        if (c.party) {
            html += '<div class="cand-party">' + esc(c.party) + '</div>';
        }

        var embeds = c.embeds || [];
        if (isJoined && embeds.length > 0) {
            html += renderEmbed(embeds[0]);
            if (embeds.length > 1) {
                html += '<button class="more-posts-btn" onclick="showAllPosts(\'' + esc(c.name) + '\');event.stopPropagation();">';
                html += '<i class="bi bi-collection-play"></i> 查看全部 ' + embeds.length + ' 則貼文';
                html += '</button>';
            }
        }

        html += '</div></div>';
        return html;
    }

    function showAllPostsPanel(candidateName) {
        var panel = document.getElementById('infoPanel');
        var title = document.getElementById('infoPanelTitle');
        var body = document.getElementById('infoPanelBody');
        var candidate = null;

        if (challengeData && challengeData.zones) {
            Object.keys(challengeData.zones).some(function (code) {
                var z = challengeData.zones[code];
                return (z.candidates || []).some(function (c) {
                    if (c.name === candidateName && c.joined) {
                        candidate = { c: c, zone: z };
                        return true;
                    }
                    return false;
                });
            });
        }

        if (!candidate) return;
        var c = candidate.c;
        var embeds = c.embeds || [];

        title.textContent = c.name + ' — 所有貼文';
        var html = '';
        html += '<div style="margin-bottom:12px;display:flex;align-items:center;gap:10px;">';
        html += '<button onclick="goBackToZone();event.stopPropagation();" style="background:none;border:none;color:#5b21b6;font-size:1.2rem;cursor:pointer;padding:0;"><i class="bi bi-arrow-left"></i></button>';

        var photoSrc = c.photo || '';
        if (photoSrc && !photoSrc.startsWith('http')) {
            photoSrc = 'https://kiang.github.io/tainan.olc.tw/p/2026/' + photoSrc;
        }
        if (photoSrc) {
            html += '<img src="' + esc(photoSrc) + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.style.display=\'none\'">';
        }
        html += '<div>';
        html += '<div style="font-weight:700;font-size:1rem;">' + esc(c.name) + '</div>';
        html += '<div style="font-size:0.8rem;color:#64748b;">' + esc(c.party || '') + ' · ' + esc(candidate.zone.name) + '</div>';
        html += '</div></div>';

        html += '<div style="font-size:0.85rem;color:#059669;font-weight:700;margin-bottom:12px;">' + embeds.length + ' 則輪椅踏查貼文</div>';

        embeds.forEach(function (url, i) {
            html += '<div style="margin-bottom:16px;">';
            html += '<div style="font-size:0.75rem;color:#94a3b8;margin-bottom:4px;">第 ' + (i + 1) + ' 則</div>';
            html += renderEmbed(url);
            html += '</div>';
        });

        body.innerHTML = html;
        panel.classList.add('open');
        if (html.indexOf('text-post-media') !== -1) reloadThreadsEmbed();
    }

    function reloadThreadsEmbed() {
        var existing = document.querySelector('script[src*="threads.com/embed.js"]');
        if (existing) existing.remove();
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.threads.com/embed.js';
        document.body.appendChild(s);
    }

    function renderEmbed(url) {
        if (!url) return '';
        var html = '<div class="embed-wrap">';

        if (url.match(/youtube\.com\/(?:watch|shorts)/) || url.match(/youtu\.be\//)) {
            var vid = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/);
            if (vid) {
                var isShorts = url.indexOf('shorts') !== -1;
                var aspect = isShorts ? 'aspect-ratio:9/16;max-height:500px;' : 'aspect-ratio:16/9;';
                html += '<iframe src="https://www.youtube.com/embed/' + esc(vid[1]) + '" allowfullscreen loading="lazy" style="' + aspect + 'min-height:auto;"></iframe>';
            }
        } else if (url.match(/facebook\.com|fb\.watch/)) {
            html += '<iframe src="https://www.facebook.com/plugins/post.php?href=' + encodeURIComponent(url) + '&width=380" style="min-height:400px;" scrolling="no" allowfullscreen loading="lazy"></iframe>';
        } else if (url.match(/instagram\.com\/p\//)) {
            html += '<iframe src="' + esc(url) + 'embed/" style="min-height:480px;" scrolling="no" allowfullscreen loading="lazy"></iframe>';
        } else if (url.match(/threads\.(net|com)/)) {
            html += '<blockquote class="text-post-media" data-text-post-permalink="' + esc(url) + '" style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;margin:0;padding:16px;min-height:100px;">';
            html += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="color:#5b21b6;font-weight:700;text-decoration:none;"><i class="bi bi-box-arrow-up-right"></i> 載入中...</a>';
            html += '</blockquote>';
        } else {
            html += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="display:block;padding:12px;color:#5b21b6;font-weight:700;text-decoration:none;"><i class="bi bi-box-arrow-up-right"></i> 查看貼文</a>';
        }

        html += '</div>';
        return html;
    }

    function closePanel() {
        document.getElementById('infoPanel').classList.remove('open');
    }

    function updateStats() {
        var totalZones = 0;
        var totalCandidates = 0;
        var totalJoined = 0;

        if (challengeData && challengeData.zones) {
            Object.keys(challengeData.zones).forEach(function (zoneCode) {
                totalZones++;
                var z = challengeData.zones[zoneCode];
                if (z.candidates) {
                    totalCandidates += z.candidates.length;
                    z.candidates.forEach(function (c) {
                        if (c.joined) totalJoined++;
                    });
                }
            });
        }

        document.getElementById('statZones').textContent = totalZones;
        document.getElementById('statCandidates').textContent = totalCandidates;
        document.getElementById('statJoined').textContent = totalJoined;
    }

    function partyColor(party) {
        if (!party) return '#aaa';
        for (var key in PARTY_COLORS) {
            if (party.indexOf(key) !== -1 || key.indexOf(party) !== -1) return PARTY_COLORS[key];
        }
        return '#aaa';
    }

    function esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Global functions
    window.toggleFilter = function () {
        filterJoinedOnly = !filterJoinedOnly;
        var btn = document.getElementById('filterJoined');
        btn.classList.toggle('active', filterJoinedOnly);
        if (allZonesFc) {
            renderOverview(allZonesFc);
        }
    };

    window.showAllPosts = function (name) {
        showAllPostsPanel(name);
    };

    window.goBackToZone = function () {
        if (currentZoneProps) {
            showZonePanel(currentZoneProps);
        }
    };

    window.showInvitationVideo = function () {
        var videoUrl = (challengeData && challengeData.invitation_video) || 'https://www.youtube.com/shorts/Jo_qkLUiPG8';
        var vid = videoUrl.match(/(?:shorts\/|v=|youtu\.be\/)([^&?]+)/);
        if (vid) {
            document.getElementById('invitationIframe').src = 'https://www.youtube.com/embed/' + vid[1];
        }
        var modal = new bootstrap.Modal(document.getElementById('videoModal'));
        modal.show();
        document.getElementById('videoModal').addEventListener('hidden.bs.modal', function () {
            document.getElementById('invitationIframe').src = '';
        }, { once: true });
    };

    window.locateUser = function () {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            function (pos) {
                var latlng = [pos.coords.latitude, pos.coords.longitude];
                map.setView(latlng, 13);
                if (locateMarker) map.removeLayer(locateMarker);
                locateMarker = L.marker(latlng).addTo(map).bindPopup('您的位置').openPopup();
            },
            function () {}
        );
    };

    document.addEventListener('DOMContentLoaded', initMap);
})();
