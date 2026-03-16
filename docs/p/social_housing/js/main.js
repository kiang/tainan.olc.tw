var map = L.map('map').setView([23.7, 120.9], 8);

L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪中心</a> | <a href="https://pip.moi.gov.tw/V3/B/SCRB0505.aspx" target="_blank">資料來源</a>',
    maxZoom: 19
}).addTo(map);

var markers = L.layerGroup().addTo(map);
var allData = [];
var currentStatus = 'all';
var currentCity = '';
var currentSearch = '';

var statusColors = {
    '新完工': '#27ae60',
    '興建中': '#f39c12',
    '已決標待開工': '#3498db',
    '既有': '#8e44ad'
};

function getStatusColor(status) {
    for (var key in statusColors) {
        if (status.indexOf(key) !== -1) return statusColors[key];
    }
    return '#95a5a6';
}

var today = new Date();
today.setHours(0, 0, 0, 0);

function isExpiredEstimate(dateStr) {
    if (!dateStr || dateStr.indexOf('(預定)') === -1) return false;
    var m = dateStr.match(/(\d+)\/(\d+)\/(\d+)/);
    if (!m) return false;
    var d = new Date(parseInt(m[1]) + 1911, parseInt(m[2]) - 1, parseInt(m[3]));
    return d < today;
}

function hasExpiredDates(item) {
    return isExpiredEstimate(item.award_date) ||
        isExpiredEstimate(item.start_date) ||
        isExpiredEstimate(item.completion_date);
}

function formatDateCell(dateStr) {
    if (isExpiredEstimate(dateStr)) {
        return '<span style="color:#e74c3c;font-weight:600;">' + dateStr + '</span>';
    }
    return dateStr;
}

function createIcon(status, expired) {
    var color = getStatusColor(status);
    var border = expired ? '3px solid #e74c3c' : '3px solid white';
    return L.divIcon({
        className: '',
        html: '<div style="width:28px;height:28px;border-radius:50%;background:' + color +
            ';border:' + border + ';box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">' +
            '<i class="fa fa-home" style="color:white;font-size:13px;"></i></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
}

function buildPopup(item) {
    var title = item.nickname ? item.nickname + ' (' + item.name + ')' : item.name;
    return '<h4>' + title + '</h4>' +
        '<table>' +
        '<tr><td>縣市</td><td>' + item.city + '</td></tr>' +
        '<tr><td>興辦主體</td><td>' + item.organizer + '</td></tr>' +
        '<tr><td>戶數</td><td>' + item.units + '</td></tr>' +
        '<tr><td>決標日期</td><td>' + formatDateCell(item.award_date) + '</td></tr>' +
        '<tr><td>開工日期</td><td>' + formatDateCell(item.start_date) + '</td></tr>' +
        '<tr><td>完工日期</td><td>' + formatDateCell(item.completion_date) + '</td></tr>' +
        '<tr><td>狀態</td><td><span class="status-badge status-' + item.status.replace(/\s/g, '') + '">' + item.status + '</span></td></tr>' +
        '</table>';
}

function matchFilter(item) {
    if (currentCity && item.city !== currentCity) return false;
    if (currentStatus !== 'all' && item.status.indexOf(currentStatus) === -1) return false;
    if (currentSearch) {
        var q = currentSearch.toLowerCase();
        var nick = (item.nickname || '').toLowerCase();
        return (item.name.toLowerCase().indexOf(q) !== -1 ||
            nick.indexOf(q) !== -1 ||
            item.city.toLowerCase().indexOf(q) !== -1 ||
            item.organizer.toLowerCase().indexOf(q) !== -1);
    }
    return true;
}

function render() {
    markers.clearLayers();
    var listEl = document.getElementById('itemList');
    listEl.innerHTML = '';

    var filtered = allData.filter(matchFilter);
    var totalUnits = 0;
    var withCoords = 0;

    filtered.forEach(function (item, idx) {
        totalUnits += item.units;

        var li = document.createElement('li');
        li.className = 'item-card';
        item._li = li;

        if (item.lat && item.lng) {
            withCoords++;
            var marker = L.marker([item.lat, item.lng], { icon: createIcon(item.status, hasExpiredDates(item)) })
                .bindPopup(buildPopup(item))
                .on('click', (function (el) {
                    return function () {
                        document.querySelectorAll('#itemList .item-card').forEach(function (c) {
                            c.classList.remove('active');
                        });
                        el.classList.add('active');
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    };
                })(li));
            markers.addLayer(marker);
            item._marker = marker;
        } else {
            item._marker = null;
        }
        var displayName = item.nickname ? item.nickname + ' (' + item.name + ')' : item.name;
        li.innerHTML = '<div class="name">' + displayName + '</div>' +
            '<div class="meta">' +
            '<span class="status-badge status-' + item.status.replace(/\s/g, '') + '">' + item.status + '</span> ' +
            item.city + ' · ' + item.organizer + ' · ' + item.units + '戶' +
            '</div>' +
            ((!item.lat || !item.lng) ? '<div class="no-coords">尚無座標</div>' : '');

        li.addEventListener('click', (function (d, el) {
            return function () {
                document.querySelectorAll('#itemList .item-card').forEach(function (c) {
                    c.classList.remove('active');
                });
                el.classList.add('active');
                if (d.lat && d.lng) {
                    map.setView([d.lat, d.lng], 16);
                    if (d._marker) d._marker.openPopup();
                } else {
                    showDetailModal(d);
                }
            };
        })(item, li));

        listEl.appendChild(li);
    });

    document.getElementById('statsBar').textContent =
        '共 ' + filtered.length + ' 案 / ' + totalUnits + ' 戶 / ' + withCoords + ' 案有座標';
}

// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

// Status filter
document.querySelectorAll('#statusFilter .filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('#statusFilter .filter-btn').forEach(function (b) {
            b.classList.remove('active');
        });
        this.classList.add('active');
        currentStatus = this.dataset.status;
        render();
    });
});

// City filter
document.getElementById('cityFilter').addEventListener('change', function () {
    currentCity = this.value;
    render();
});

// Search
document.getElementById('searchInput').addEventListener('input', function () {
    currentSearch = this.value;
    render();
});

// Detail modal for items without coordinates
function showDetailModal(item) {
    var modal = document.getElementById('detailModal');
    var content = document.getElementById('modalContent');
    content.innerHTML = buildPopup(item);
    modal.classList.add('show');
}

document.getElementById('modalClose').addEventListener('click', function () {
    document.getElementById('detailModal').classList.remove('show');
});

document.getElementById('detailModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('show');
});

// Load data
fetch('data/social_housing.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
        allData = data;
        var cities = [];
        data.forEach(function (item) {
            if (cities.indexOf(item.city) === -1) cities.push(item.city);
        });
        var sel = document.getElementById('cityFilter');
        cities.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            sel.appendChild(opt);
        });
        render();
    })
    .catch(function (err) {
        console.error('Failed to load data:', err);
    });
