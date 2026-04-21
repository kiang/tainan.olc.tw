var dataBase = 'https://kiang.github.io/2384.tainan.gov.tw/';
var map = L.map('map').setView([23.000694, 120.221507], 13);

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
    opacity: 0.8
}).addTo(map);

var routesData = [];
var routesById = {};
var stopsData = {};
var routeStopsData = [];
var routesByStop = {};
var routeStopsByRoute = {};
var routePolylines = L.layerGroup().addTo(map);
var routeStopMarkers = L.layerGroup().addTo(map);
var clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnBounds: false,
    disableClusteringAtZoom: 16
}).addTo(map);
var activeStopId = null;
var activeRouteIds = [];
var routeColorMap = {};

var routeColors = [
    '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#bfef45', '#469990', '#dcbeff',
    '#9A6324', '#800000', '#aaffc3', '#808000', '#000075'
];

function init() {
    Promise.all([
        fetch(dataBase + 'routes.json').then(function (r) { return r.json(); }),
        fetch(dataBase + 'stops.json').then(function (r) { return r.json(); }),
        fetch(dataBase + 'route_stops.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
        routesData = results[0];
        routesData.forEach(function (r) {
            routesById[r.route_id] = r;
        });

        results[1].forEach(function (s) {
            stopsData[s.stop_id] = s;
        });

        routeStopsData = results[2];

        routeStopsData.forEach(function (rs) {
            if (!routesByStop[rs.stop_id]) {
                routesByStop[rs.stop_id] = {};
            }
            routesByStop[rs.stop_id][rs.route_id] = true;

            if (!routeStopsByRoute[rs.route_id]) {
                routeStopsByRoute[rs.route_id] = {};
            }
            if (!routeStopsByRoute[rs.route_id][rs.direction]) {
                routeStopsByRoute[rs.route_id][rs.direction] = [];
            }
            routeStopsByRoute[rs.route_id][rs.direction].push(rs);
        });

        addStopsToMap();
        checkHash();
    });
}

function addStopsToMap() {
    var stopIds = Object.keys(stopsData);
    for (var i = 0; i < stopIds.length; i++) {
        var stop = stopsData[stopIds[i]];
        if (!stop.latitude || !stop.longitude) continue;

        var routeCount = routesByStop[stop.stop_id]
            ? Object.keys(routesByStop[stop.stop_id]).length
            : 0;
        if (routeCount === 0) continue;

        var size = routeCount >= 10 ? 24 : 20;
        var marker = L.marker([stop.latitude, stop.longitude], {
            icon: L.divIcon({
                className: 'stop-icon',
                html: '<div class="stop-count">' + routeCount + '</div>',
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
            }),
            stopId: stop.stop_id
        });

        marker.bindTooltip(stop.stop_name + ' (' + routeCount + ' 條路線)', { direction: 'top', offset: [0, -size / 2] });
        marker.on('click', (function (stopId) {
            return function (e) {
                L.DomEvent.stopPropagation(e);
                selectStop(stopId);
            };
        })(stop.stop_id));

        clusterGroup.addLayer(marker);
    }
}

function selectStop(stopId) {
    var stop = stopsData[stopId];
    if (!stop) return;

    activeStopId = stopId;
    window.location.hash = stopId;

    routePolylines.clearLayers();
    routeStopMarkers.clearLayers();
    activeRouteIds = [];
    routeColorMap = {};

    map.removeLayer(clusterGroup);

    var routeIdMap = routesByStop[stopId] || {};
    var routeIdList = Object.keys(routeIdMap);

    var panel = document.getElementById('info-panel');
    panel.style.display = 'flex';
    document.getElementById('info-panel-title').textContent =
        stop.stop_name + ' (' + routeIdList.length + ' 條路線)';

    var list = document.getElementById('route-list');
    list.innerHTML = '';

    routeIdList.forEach(function (routeId, idx) {
        var route = routesById[routeId];
        if (!route) return;

        var color = routeColors[idx % routeColors.length];
        routeColorMap[routeId] = color;

        var li = document.createElement('li');
        li.dataset.routeId = routeId;
        li.innerHTML = '<span class="color-dot" style="background:' + color + '"></span>' +
            '<span class="route-info"><span class="route-name">' + route.route_name + '</span><br>' +
            '<span class="route-dest">' + route.departure + ' → ' + route.destination + '</span></span>';

        li.addEventListener('click', function () {
            toggleRoute(routeId, color, li);
        });

        list.appendChild(li);
        showRoute(routeId, color);
        li.classList.add('active');
        activeRouteIds.push(routeId);
    });

    addSelectedStopMarker(stopId);

    map.setView([stop.latitude, stop.longitude], Math.max(map.getZoom(), 15));
}

function addSelectedStopMarker(stopId) {
    var stop = stopsData[stopId];
    if (!stop) return;
    L.circleMarker([stop.latitude, stop.longitude], {
        radius: 10,
        fillColor: '#e74c3c',
        color: '#fff',
        weight: 3,
        fillOpacity: 1,
        stopId: stopId,
        isSelectedStop: true
    }).bindTooltip(stop.stop_name, { direction: 'top', offset: [0, -10] })
        .addTo(routeStopMarkers);
}

function toggleRoute(routeId, color, li) {
    var idx = activeRouteIds.indexOf(routeId);
    if (idx !== -1) {
        activeRouteIds.splice(idx, 1);
        li.classList.remove('active');
        removeRouteFromMap(routeId);
    } else {
        activeRouteIds.push(routeId);
        li.classList.add('active');
        showRoute(routeId, color);
    }
}

function removeRouteFromMap(routeId) {
    var toRemove = [];
    routePolylines.eachLayer(function (layer) {
        if (layer.options.routeId === routeId) {
            toRemove.push(layer);
        }
    });
    toRemove.forEach(function (layer) {
        routePolylines.removeLayer(layer);
    });

    toRemove = [];
    routeStopMarkers.eachLayer(function (layer) {
        if (layer.options.routeId === routeId) {
            toRemove.push(layer);
        }
    });
    toRemove.forEach(function (layer) {
        routeStopMarkers.removeLayer(layer);
    });
}

function showRoute(routeId, color) {
    var routeStops = routeStopsByRoute[routeId];
    if (!routeStops) return;

    var directions = Object.keys(routeStops);
    var addedStops = {};

    directions.forEach(function (dir) {
        var stops = routeStops[dir];
        var latlngs = [];
        stops.forEach(function (rs) {
            var stop = stopsData[rs.stop_id];
            if (!stop || !stop.latitude || !stop.longitude) return;
            latlngs.push([stop.latitude, stop.longitude]);

            if (!addedStops[rs.stop_id] && rs.stop_id !== activeStopId) {
                addedStops[rs.stop_id] = true;
                var marker = L.circleMarker([stop.latitude, stop.longitude], {
                    radius: 5,
                    fillColor: color,
                    color: '#fff',
                    weight: 1.5,
                    fillOpacity: 0.8,
                    routeId: routeId,
                    stopId: rs.stop_id
                });
                marker.bindTooltip(stop.stop_name, { direction: 'top', offset: [0, -6] });
                marker.on('click', function (e) {
                    L.DomEvent.stopPropagation(e);
                    selectStop(rs.stop_id);
                });
                marker.addTo(routeStopMarkers);
            }
        });
        if (latlngs.length > 1) {
            var route = routesById[routeId];
            var routeName = route ? route.route_name : routeId;
            var dirLabel = dir === 'outbound' ? '去程' : '返程';
            L.polyline(latlngs, {
                color: color,
                weight: 4,
                opacity: 0.7,
                routeId: routeId,
                dashArray: dir === 'inbound' ? '8 6' : null
            }).bindTooltip(routeName + ' ' + dirLabel, { sticky: true })
                .addTo(routePolylines);
        }
    });
}

function resetToClusterView() {
    document.getElementById('info-panel').style.display = 'none';
    activeStopId = null;
    activeRouteIds = [];
    routeColorMap = {};
    window.location.hash = '';
    routePolylines.clearLayers();
    routeStopMarkers.clearLayers();
    if (!map.hasLayer(clusterGroup)) {
        map.addLayer(clusterGroup);
    }
}

function checkHash() {
    var hash = window.location.hash.replace('#', '');
    if (hash && stopsData[hash]) {
        selectStop(hash);
    }
}

document.getElementById('stop-search').addEventListener('input', function () {
    var keyword = this.value.trim().toLowerCase();
    var resultsEl = document.getElementById('search-results');

    if (!keyword) {
        resultsEl.style.display = 'none';
        resultsEl.innerHTML = '';
        return;
    }

    var matches = [];
    var stopIds = Object.keys(stopsData);
    for (var i = 0; i < stopIds.length; i++) {
        var stop = stopsData[stopIds[i]];
        if (stop.stop_name.toLowerCase().indexOf(keyword) !== -1) {
            var routeCount = routesByStop[stop.stop_id]
                ? Object.keys(routesByStop[stop.stop_id]).length
                : 0;
            if (routeCount > 0) {
                matches.push({ stop: stop, routeCount: routeCount });
            }
        }
        if (matches.length >= 20) break;
    }

    if (matches.length === 0) {
        var routeMatches = [];
        routesData.forEach(function (r) {
            if (r.route_name.toLowerCase().indexOf(keyword) !== -1 ||
                r.departure.toLowerCase().indexOf(keyword) !== -1 ||
                r.destination.toLowerCase().indexOf(keyword) !== -1) {
                routeMatches.push(r);
            }
        });
        if (routeMatches.length > 0) {
            resultsEl.style.display = 'block';
            resultsEl.innerHTML = '';
            routeMatches.slice(0, 20).forEach(function (r) {
                var li = document.createElement('li');
                li.innerHTML = '<span class="stop-name">' + r.route_name + '</span><br>' +
                    '<span class="route-count">' + r.departure + ' → ' + r.destination + '</span>';
                li.addEventListener('click', function () {
                    showRouteAndFocusFirstStop(r.route_id);
                    resultsEl.style.display = 'none';
                    document.getElementById('stop-search').value = '';
                });
                resultsEl.appendChild(li);
            });
            return;
        }

        resultsEl.style.display = 'none';
        resultsEl.innerHTML = '';
        return;
    }

    resultsEl.style.display = 'block';
    resultsEl.innerHTML = '';
    matches.forEach(function (m) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="stop-name">' + m.stop.stop_name + '</span><br>' +
            '<span class="route-count">' + m.routeCount + ' 條路線經過</span>';
        li.addEventListener('click', function () {
            selectStop(m.stop.stop_id);
            resultsEl.style.display = 'none';
            document.getElementById('stop-search').value = '';
        });
        resultsEl.appendChild(li);
    });
});

function showRouteAndFocusFirstStop(routeId) {
    var routeStops = routeStopsByRoute[routeId];
    if (!routeStops) return;
    var dir = routeStops['outbound'] ? 'outbound' : Object.keys(routeStops)[0];
    var stops = routeStops[dir];
    if (!stops || stops.length === 0) return;
    var firstStopId = stops[0].stop_id;
    selectStop(firstStopId);
}

document.getElementById('info-panel-close').addEventListener('click', function () {
    resetToClusterView();
});

document.getElementById('stop-search').addEventListener('blur', function () {
    setTimeout(function () {
        document.getElementById('search-results').style.display = 'none';
    }, 200);
});

document.getElementById('stop-search').addEventListener('focus', function () {
    if (document.getElementById('search-results').children.length > 0) {
        document.getElementById('search-results').style.display = 'block';
    }
});

map.on('click', function () {
    if (activeStopId) {
        resetToClusterView();
    }
});

window.addEventListener('hashchange', checkHash);

init();
