var dataBase = 'https://kiang.github.io/2384.tainan.gov.tw/';
var map = L.map('map').setView([23.000694, 120.221507], 13);

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
    opacity: 0.8
}).addTo(map);

var routesData = [];
var stopsData = {};
var routeStopsData = [];
var routePolylines = L.layerGroup().addTo(map);
var stopMarkers = L.layerGroup().addTo(map);
var activeRouteId = null;
var activeDirection = 'outbound';
var routeStopsByRoute = {};

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
        results[1].forEach(function (s) {
            stopsData[s.stop_id] = s;
        });
        routeStopsData = results[2];

        routeStopsData.forEach(function (rs) {
            if (!routeStopsByRoute[rs.route_id]) {
                routeStopsByRoute[rs.route_id] = {};
            }
            if (!routeStopsByRoute[rs.route_id][rs.direction]) {
                routeStopsByRoute[rs.route_id][rs.direction] = [];
            }
            routeStopsByRoute[rs.route_id][rs.direction].push(rs);
        });

        renderRouteList(routesData);
        checkHash();
    });
}

function renderRouteList(routes) {
    var list = document.getElementById('route-list');
    list.innerHTML = '';
    routes.forEach(function (r) {
        var li = document.createElement('li');
        li.dataset.routeId = r.route_id;
        li.innerHTML = '<span class="route-name">' + r.route_name + '</span><br>' +
            '<span class="route-dest">' + r.departure + ' → ' + r.destination + '</span>';
        li.addEventListener('click', function () {
            selectRoute(r.route_id);
        });
        if (r.route_id === activeRouteId) {
            li.classList.add('active');
        }
        list.appendChild(li);
    });
}

function selectRoute(routeId) {
    activeRouteId = routeId;
    activeDirection = 'outbound';
    window.location.hash = routeId;

    document.querySelectorAll('#route-list li').forEach(function (li) {
        li.classList.toggle('active', li.dataset.routeId === routeId);
    });

    var route = routesData.find(function (r) { return r.route_id === routeId; });
    if (!route) return;

    var panel = document.getElementById('stop-panel');
    panel.style.display = 'flex';
    document.getElementById('stop-panel-title').textContent = route.route_name;

    var dirs = routeStopsByRoute[routeId] ? Object.keys(routeStopsByRoute[routeId]) : [];
    renderDirectionTabs(dirs, route);
    showDirection(routeId, activeDirection);
}

function renderDirectionTabs(dirs, route) {
    var tabs = document.getElementById('direction-tabs');
    tabs.innerHTML = '';
    if (dirs.length <= 1) {
        tabs.style.display = 'none';
        return;
    }
    tabs.style.display = 'flex';
    dirs.forEach(function (dir) {
        var btn = document.createElement('button');
        btn.textContent = dir === 'outbound'
            ? '去程 (' + route.departure + '→' + route.destination + ')'
            : '返程 (' + route.destination + '→' + route.departure + ')';
        btn.classList.toggle('active', dir === activeDirection);
        btn.addEventListener('click', function () {
            activeDirection = dir;
            tabs.querySelectorAll('button').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
            showDirection(activeRouteId, dir);
        });
        tabs.appendChild(btn);
    });
}

function showDirection(routeId, direction) {
    routePolylines.clearLayers();
    stopMarkers.clearLayers();

    var stops = routeStopsByRoute[routeId] && routeStopsByRoute[routeId][direction]
        ? routeStopsByRoute[routeId][direction]
        : [];

    var list = document.getElementById('stop-list');
    list.innerHTML = '';

    var latlngs = [];
    stops.forEach(function (rs, idx) {
        var stop = stopsData[rs.stop_id];
        if (!stop) return;

        var ll = [stop.latitude, stop.longitude];
        latlngs.push(ll);

        var li = document.createElement('li');
        li.innerHTML = '<span class="seq">' + rs.stop_sequence + '</span> ' + rs.stop_name;
        li.addEventListener('click', function () {
            map.setView(ll, 16);
            stopMarkers.eachLayer(function (m) {
                if (m.options.stopId === rs.stop_id) {
                    m.openPopup();
                }
            });
        });
        list.appendChild(li);

        var isFirst = idx === 0;
        var isLast = idx === stops.length - 1;
        var radius = (isFirst || isLast) ? 8 : 5;
        var fillColor = isFirst ? '#2ecc71' : (isLast ? '#e74c3c' : '#3498db');

        var marker = L.circleMarker(ll, {
            radius: radius,
            fillColor: fillColor,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.9,
            stopId: rs.stop_id
        }).addTo(stopMarkers);

        var otherRoutes = findRoutesAtStop(rs.stop_id, routeId);
        var popupHtml = '<b>' + rs.stop_name + '</b><br>第 ' + rs.stop_sequence + ' 站';
        if (otherRoutes.length > 0) {
            popupHtml += '<br><small style="color:#666">其他路線: ' +
                otherRoutes.map(function (r) {
                    return '<a href="#' + r.route_id + '" style="color:#0d6efd">' + r.route_name + '</a>';
                }).join(', ') + '</small>';
        }
        marker.bindPopup(popupHtml);
    });

    if (latlngs.length > 1) {
        var color = routeColors[Math.abs(hashCode(routeId)) % routeColors.length];
        L.polyline(latlngs, {
            color: color,
            weight: 4,
            opacity: 0.8
        }).addTo(routePolylines);

        map.fitBounds(L.latLngBounds(latlngs).pad(0.1));
    }
}

function findRoutesAtStop(stopId, excludeRouteId) {
    var found = {};
    routeStopsData.forEach(function (rs) {
        if (rs.stop_id === stopId && rs.route_id !== excludeRouteId && !found[rs.route_id]) {
            var route = routesData.find(function (r) { return r.route_id === rs.route_id; });
            if (route) {
                found[rs.route_id] = route;
            }
        }
    });
    return Object.values(found);
}

function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function checkHash() {
    var hash = window.location.hash.replace('#', '');
    if (hash) {
        selectRoute(hash);
        var el = document.querySelector('#route-list li[data-route-id="' + hash + '"]');
        if (el) el.scrollIntoView({ block: 'center' });
    }
}

document.getElementById('route-search').addEventListener('input', function () {
    var keyword = this.value.trim().toLowerCase();
    if (!keyword) {
        renderRouteList(routesData);
        return;
    }

    var stopRouteIds = {};
    routeStopsData.forEach(function (rs) {
        if (rs.stop_name.toLowerCase().indexOf(keyword) !== -1) {
            stopRouteIds[rs.route_id] = true;
        }
    });

    var filtered = routesData.filter(function (r) {
        return r.route_name.toLowerCase().indexOf(keyword) !== -1
            || r.departure.toLowerCase().indexOf(keyword) !== -1
            || r.destination.toLowerCase().indexOf(keyword) !== -1
            || stopRouteIds[r.route_id];
    });
    renderRouteList(filtered);
});

document.getElementById('stop-panel-close').addEventListener('click', function () {
    document.getElementById('stop-panel').style.display = 'none';
    activeRouteId = null;
    window.location.hash = '';
    routePolylines.clearLayers();
    stopMarkers.clearLayers();
    document.querySelectorAll('#route-list li').forEach(function (li) {
        li.classList.remove('active');
    });
});

window.addEventListener('hashchange', checkHash);

init();
