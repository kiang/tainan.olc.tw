var dataBase = 'https://kiang.github.io/clean.tnepb.gov.tw_data/';
var map, vehicleLayer, routeLayer, stopLayer;
var routesData = [], vehiclesData = [];
var carRoutesData = {};
var currentTab = 'routes';
var activeRoute = null;
var highlightedVehicles = [];

function init() {
    map = L.map('map', { zoomControl: false }).setView([23.0, 120.2], 12);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>'
    }).addTo(map);

    vehicleLayer = L.markerClusterGroup({
        disableClusteringAtZoom: 16
    });
    map.addLayer(vehicleLayer);

    routeLayer = L.featureGroup().addTo(map);
    stopLayer = L.layerGroup().addTo(map);

    loadData();
    setupEvents();
}

function loadData() {
    Promise.all([
        fetch(dataBase + 'vehicles.geojson').then(function (r) { return r.json(); }),
        fetch(dataBase + 'routes.json').then(function (r) { return r.json(); }),
        fetch(dataBase + 'car_routes.json').then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (results) {
        var geojson = results[0];
        var routes = results[1];
        carRoutesData = results[2];

        vehiclesData = geojson.features;
        routesData = routes;

        showVehicles(geojson);
        renderSidebar();
        document.getElementById('loading').style.display = 'none';
    });
}

function statusClass(status) {
    if (status === '0') return 'status-running';
    if (status === '90') return 'status-stopped';
    return 'status-other';
}

function statusText(status) {
    if (status === '0') return '行駛中';
    if (status === '90') return '停止';
    if (status === '71') return '暫停';
    if (status === '95') return '收車';
    if (status === '96') return '未發車';
    return '狀態 ' + status;
}

function vehicleIcon(status, direction) {
    var color = status === '0' ? '#28a745' : (status === '90' ? '#dc3545' : '#ffc107');
    return L.divIcon({
        className: '',
        html: '<div style="background:' + color + ';color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">' + direction + '</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

var vehicleMarkers = {};

function showVehicles(geojson) {
    vehicleLayer.clearLayers();
    vehicleMarkers = {};
    L.geoJSON(geojson, {
        pointToLayer: function (feature, latlng) {
            var p = feature.properties;
            var marker = L.marker(latlng, {
                icon: vehicleIcon(p.status, p.direction)
            });
            var popupHtml = '<b>' + p.car_licence + '</b><br>' +
                '<span class="status-dot ' + statusClass(p.status) + '"></span>' + statusText(p.status) + '<br>' +
                p.caption + '<br>' +
                '<small>' + p.dt + '</small>';
            var routes = carRoutesData[p.car_licence];
            if (routes && routes.length > 0) {
                popupHtml += '<br><div style="margin-top:4px;font-size:12px">路線: ';
                popupHtml += routes.map(function (r) {
                    return '<a href="#" class="car-route-link" data-linename="' + r + '" style="color:#0d6efd">' + r + '</a>';
                }).join('、');
                popupHtml += '</div>';
            }
            marker.bindPopup(popupHtml);
            marker.on('popupopen', function () {
                var container = marker.getPopup().getElement();
                if (container) {
                    container.querySelectorAll('.car-route-link').forEach(function (link) {
                        link.addEventListener('click', function (e) {
                            e.preventDefault();
                            map.closePopup();
                            loadRoute(this.dataset.linename);
                            currentTab = 'routes';
                            document.querySelectorAll('.sidebar-tab').forEach(function (t) { t.classList.remove('active'); });
                            document.querySelector('.sidebar-tab[data-tab="routes"]').classList.add('active');
                            document.getElementById('sidebar').classList.remove('collapsed');
                        });
                    });
                }
            });
            vehicleMarkers[p.car_licence] = marker;
            return marker;
        }
    }).addTo(vehicleLayer);
}

function renderSidebar() {
    var content = document.getElementById('sidebar-content');
    var search = document.getElementById('route-search').value.trim().toLowerCase();

    if (currentTab === 'routes') {
        renderRouteList(content, search);
    } else {
        renderVehicleList(content, search);
    }
}

function renderRouteList(container, search) {
    var grouped = {};
    routesData.forEach(function (r) {
        if (!grouped[r.linename]) {
            grouped[r.linename] = { linename: r.linename, areas: [], totalStops: 0, clearsecs: [] };
        }
        var g = grouped[r.linename];
        g.totalStops += r.stop_count;
        g.clearsecs.push(r.clearsec);
        r.areas.forEach(function (a) {
            if (g.areas.indexOf(a) === -1) g.areas.push(a);
        });
    });

    var lines = Object.values(grouped);
    if (search) {
        lines = lines.filter(function (l) {
            return l.linename.toLowerCase().indexOf(search) !== -1 ||
                l.areas.join(' ').toLowerCase().indexOf(search) !== -1;
        });
    }

    lines.sort(function (a, b) { return a.linename.localeCompare(b.linename, 'zh-Hant'); });

    var html = '';
    lines.forEach(function (l) {
        html += '<div class="route-item" data-linename="' + l.linename + '">' +
            '<div><b>' + l.linename + '</b> <small>(' + l.totalStops + ' 站)</small></div>' +
            '<div class="areas">' + l.areas.join('、') + '</div>' +
            '</div>';
    });

    if (!html) {
        html = '<div style="padding:20px;text-align:center;color:#888">找不到符合的路線</div>';
    }

    container.innerHTML = html;

    container.querySelectorAll('.route-item').forEach(function (el) {
        el.addEventListener('click', function () {
            loadRoute(this.dataset.linename);
        });
    });
}

function renderVehicleList(container, search) {
    var vehicles = vehiclesData.slice();
    if (search) {
        vehicles = vehicles.filter(function (v) {
            var p = v.properties;
            return p.car_licence.toLowerCase().indexOf(search) !== -1 ||
                p.caption.toLowerCase().indexOf(search) !== -1;
        });
    }

    vehicles.sort(function (a, b) {
        return a.properties.car_licence.localeCompare(b.properties.car_licence);
    });

    var html = '';
    vehicles.forEach(function (v) {
        var p = v.properties;
        var routes = carRoutesData[p.car_licence];
        var routeHtml = '';
        if (routes && routes.length > 0) {
            routeHtml = '<div class="areas" style="margin-top:2px">路線: ' +
                routes.map(function (r) {
                    return '<a href="#" class="vehicle-route-link" data-linename="' + r + '" style="color:#0d6efd">' + r + '</a>';
                }).join('、') + '</div>';
        }
        html += '<div class="vehicle-item" data-lng="' + v.geometry.coordinates[0] + '" data-lat="' + v.geometry.coordinates[1] + '">' +
            '<div><span class="status-dot ' + statusClass(p.status) + '"></span><b>' + p.car_licence + '</b> ' + statusText(p.status) + '</div>' +
            '<div class="areas">' + p.caption + '</div>' +
            routeHtml +
            '</div>';
    });

    if (!html) {
        html = '<div style="padding:20px;text-align:center;color:#888">找不到符合的車輛</div>';
    }

    container.innerHTML = html;

    container.querySelectorAll('.vehicle-item').forEach(function (el) {
        el.addEventListener('click', function (e) {
            if (e.target.classList.contains('vehicle-route-link')) return;
            var lat = parseFloat(this.dataset.lat);
            var lng = parseFloat(this.dataset.lng);
            map.setView([lat, lng], 17);
        });
    });

    container.querySelectorAll('.vehicle-route-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var linename = this.dataset.linename;
            currentTab = 'routes';
            document.querySelectorAll('.sidebar-tab').forEach(function (t) { t.classList.remove('active'); });
            document.querySelector('.sidebar-tab[data-tab="routes"]').classList.add('active');
            loadRoute(linename);
        });
    });
}

function highlightVehicle(car_licence, color) {
    var marker = vehicleMarkers[car_licence];
    if (marker) {
        var icon = L.divIcon({
            className: '',
            html: '<div style="background:' + color + ';color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🚛</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        marker.setIcon(icon);
        marker.setZIndexOffset(1000);
        highlightedVehicles.push({ marker: marker, car_licence: car_licence });
    }
}

function clearHighlightedVehicles() {
    highlightedVehicles.forEach(function (h) {
        var v = vehiclesData.find(function (f) { return f.properties.car_licence === h.car_licence; });
        if (v) {
            h.marker.setIcon(vehicleIcon(v.properties.status, v.properties.direction));
            h.marker.setZIndexOffset(0);
        }
    });
    highlightedVehicles = [];
}

function loadRoute(linename) {
    activeRoute = linename;
    var routeFiles = routesData.filter(function (r) { return r.linename === linename; });

    routeLayer.clearLayers();
    stopLayer.clearLayers();
    clearHighlightedVehicles();

    var allStops = [];
    var loaded = 0;

    var colors = ['#0d6efd', '#dc3545', '#28a745', '#fd7e14', '#6f42c1', '#20c997'];
    var carColors = {};
    var colorIndex = 0;

    routeFiles.forEach(function (rf) {
        fetch(dataBase + rf.file).then(function (r) { return r.json(); }).then(function (data) {
            var carGroups = {};
            data.stops.forEach(function (s) {
                if (s.lng && s.lat) {
                    allStops.push(s);
                    if (!carGroups[s.car_licence]) carGroups[s.car_licence] = [];
                    carGroups[s.car_licence].push(s);
                    var marker = L.marker([s.lat, s.lng], {
                        icon: L.divIcon({
                            className: 'stop-marker',
                            iconSize: [10, 10],
                            iconAnchor: [5, 5]
                        })
                    });
                    marker.bindPopup(
                        '<b>' + s.caption + '</b><br>' +
                        s.area + ' ' + s.village + '<br>' +
                        '車牌: ' + s.car_licence + '<br>' +
                        '類型: ' + s.task_type + '<br>' +
                        '時間: ' + s.estimated_time + '<br>' +
                        '收運日: ' + s.days
                    );
                    stopLayer.addLayer(marker);
                }
            });

            Object.keys(carGroups).forEach(function (licence) {
                if (!carColors[licence]) {
                    carColors[licence] = colors[colorIndex % colors.length];
                    colorIndex++;
                }
                var lineColor = carColors[licence];
                var coords = carGroups[licence].map(function (s) { return [s.lat, s.lng]; });
                if (coords.length > 0) {
                    var line = L.polyline(coords, { color: lineColor, weight: 3, opacity: 0.7 });
                    routeLayer.addLayer(line);
                }
                highlightVehicle(licence, lineColor);
            });

            loaded++;
            if (loaded === routeFiles.length && allStops.length > 0) {
                map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
                renderRouteDetail(linename, allStops);
            }
        });
    });
}

function renderRouteDetail(linename, stops) {
    var content = document.getElementById('sidebar-content');
    var html = '<div id="route-detail">' +
        '<div class="back-btn" id="back-to-list">← 返回列表</div>' +
        '<h6>' + linename + '</h6>' +
        '<div style="margin-bottom:8px;font-size:12px;color:#666">' + stops.length + ' 個收運點</div>' +
        '<ul class="stop-list">';

    stops.forEach(function (s) {
        html += '<li>' +
            '<div>' + s.caption + ' <small>(' + s.village + ')</small></div>' +
            '<div class="stop-time">' + s.task_type + ' ' + s.estimated_time + ' | ' + s.days + '</div>' +
            '</li>';
    });

    html += '</ul></div>';
    content.innerHTML = html;

    document.getElementById('back-to-list').addEventListener('click', function () {
        activeRoute = null;
        routeLayer.clearLayers();
        stopLayer.clearLayers();
        clearHighlightedVehicles();
        renderSidebar();
    });
}

function setupEvents() {
    document.getElementById('route-search').addEventListener('input', function () {
        if (!activeRoute) {
            renderSidebar();
        }
    });

    document.querySelectorAll('.sidebar-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.sidebar-tab').forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');
            currentTab = this.dataset.tab;
            activeRoute = null;
            routeLayer.clearLayers();
            stopLayer.clearLayers();
            clearHighlightedVehicles();
            renderSidebar();
        });
    });

    document.getElementById('sidebar-toggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
}

init();
