const map = L.map('map').setView([23.7, 120.9], 8);
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">內政部國土測繪中心</a>'
}).addTo(map);

const cluster = L.markerClusterGroup();
map.addLayer(cluster);

const statusLabels = {
    found: ['已定位', 'success'],
    manual: ['已定位', 'success'],
    not_found: ['查無登記', 'secondary'],
    anonymized: ['個資遮蔽', 'secondary'],
    geocode_failed: ['地址無法定位', 'warning']
};

let allRows = [];
let productByAlias = {};
let productById = {};
let terminalRows = [];
let terminalBySeq = {};
let rowBySeq = {};
let currentView = 'map';

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

function rowProducts(p) {
    const seen = [];
    p.products.forEach(function (name) {
        const prod = productByAlias[name];
        if (prod && seen.indexOf(prod) === -1) {
            seen.push(prod);
        }
    });
    return seen;
}

function batchHtml(p) {
    let html = '';
    p.batches.forEach(function (code, i) {
        html += '<div class="batch-line"><code>' + escapeHtml(code) + '</code>';
        const expiry = p.expiries[i] || p.expiries[0];
        if (expiry) {
            html += ' <span class="text-muted">' + escapeHtml(expiry) + '</span>';
        }
        html += '</div>';
    });
    return html;
}

function popupHtml(p) {
    let html = '<table class="popup-table">';
    html += '<tr><td>序號</td><td>' + p.seq + (p.new ? ' <span class="badge-new">7/6 新增</span>' : '') + '</td></tr>';
    html += '<tr><td>業者</td><td>' + escapeHtml(p.name) + '</td></tr>';
    if (p.gcis_name && p.gcis_name !== p.name) {
        html += '<tr><td>登記名稱</td><td>' + escapeHtml(p.gcis_name) + '</td></tr>';
    }
    html += '<tr><td>縣市</td><td>' + escapeHtml(p.counties.join('、')) + '</td></tr>';
    if (p.address) {
        html += '<tr><td>登記地址</td><td>' + escapeHtml(p.address) + '</td></tr>';
    }
    html += '<tr><td>購買品項</td><td>' + p.products.map(function (x) {
        return '<span class="product-badge">' + escapeHtml(x) + '</span>';
    }).join('') + '</td></tr>';
    if (p.batches.length) {
        html += '<tr><td>批號 / 有效日期</td><td>' + batchHtml(p) + '</td></tr>';
    }
    const prods = rowProducts(p);
    if (prods.length) {
        html += '<tr><td>產品外觀</td><td>' + prods.map(function (prod) {
            return '<a href="' + prod.image + '" target="_blank"><img class="product-photo" src="' + prod.image + '" alt="' + escapeHtml(prod.name) + '" title="' + escapeHtml(prod.company + ' ' + prod.name) + '"></a>';
        }).join('') + '</td></tr>';
    }
    if (p.note) {
        html += '<tr><td>備註</td><td>' + escapeHtml(p.note) + '</td></tr>';
    }
    if (terminalBySeq[p.seq]) {
        html += '<tr><td>終端產品</td><td>' + terminalBySeq[p.seq].products.length + ' 項（見「終端產品」）</td></tr>';
    }
    if (p.gcis_id) {
        html += '<tr><td>商工登記</td><td><a href="https://company.g0v.ronny.tw/id/' + escapeHtml(p.gcis_id) + '" target="_blank">' + escapeHtml(p.gcis_id) + '</a></td></tr>';
    }
    html += '</table>';
    html += '<div class="text-muted" style="font-size:0.75rem;">登記地址可能與實際營業地點不同</div>';
    return html;
}

function toggleProductRow(tr, pid) {
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('product-detail-row')) {
        const samePid = next.getAttribute('data-pid') === pid;
        next.remove();
        if (samePid) {
            return;
        }
    }
    const prod = productById[pid];
    if (!prod) {
        return;
    }
    const detail = document.createElement('tr');
    detail.className = 'product-detail-row';
    detail.setAttribute('data-pid', pid);
    const td = document.createElement('td');
    td.colSpan = 7;
    td.innerHTML = '<div class="product-detail">' +
        '<a href="' + prod.image + '" target="_blank"><img src="' + prod.image + '" alt="' + escapeHtml(prod.name) + '"></a>' +
        '<div class="product-detail-caption">' + escapeHtml(prod.company) + '<br><strong>' + escapeHtml(prod.name) + '</strong><br>' +
        prod.batches.map(function (b) {
            return '<span class="batch-line"><code>' + escapeHtml(b.code) + '</code> <span class="text-muted">' + escapeHtml(b.expiry) + '</span></span>';
        }).join('<br>') +
        '</div></div>';
    detail.appendChild(td);
    tr.parentNode.insertBefore(detail, tr.nextSibling);
}

function rowMatches(row, county, keyword) {
    const p = row.properties;
    if (county && p.counties.indexOf(county) === -1) {
        return false;
    }
    if (keyword) {
        const terminal = terminalBySeq[p.seq]
            ? terminalBySeq[p.seq].products.map(function (x) { return x.name; }).join(' ')
            : '';
        const haystack = (p.name + ' ' + (p.gcis_name || '') + ' ' + (p.address || '') + ' '
            + p.products.join(' ') + ' ' + p.batches.join(' ') + ' ' + terminal).toLowerCase();
        if (haystack.indexOf(keyword) === -1) {
            return false;
        }
    }
    return true;
}

function renderTerminal(county, keyword) {
    const tbody = document.getElementById('terminalBody');
    tbody.innerHTML = '';
    let shown = 0;
    terminalRows.forEach(function (item) {
        if (county && item.county !== county) {
            return;
        }
        if (keyword) {
            const haystack = (item.vendor + ' ' + item.pname).toLowerCase();
            if (haystack.indexOf(keyword) === -1) {
                return;
            }
        }
        shown++;
        const row = rowBySeq[item.seq];
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + item.pseq + '</td>' +
            '<td>' + escapeHtml(item.pname) + '</td>' +
            '<td>' + escapeHtml(item.vendor) + '</td>' +
            '<td>' + escapeHtml(item.county) + '</td>' +
            '<td>' + item.seq + '</td>';
        if (row && row.latlng) {
            tr.className = 'row-located';
            tr.addEventListener('click', function () {
                showMap();
                if (window.innerWidth <= 768) {
                    collapseBar();
                }
                map.setView(row.latlng, 16);
                if (row.marker) {
                    row.marker.openPopup();
                }
            });
        }
        tbody.appendChild(tr);
    });
    return shown;
}

function render() {
    const county = document.getElementById('countyFilter').value;
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();

    cluster.clearLayers();
    let locatedCount = 0;
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    let shown = 0;

    allRows.forEach(function (row) {
        if (!rowMatches(row, county, keyword)) {
            return;
        }
        shown++;
        const p = row.properties;
        if (row.latlng) {
            locatedCount++;
            const marker = L.marker(row.latlng);
            marker.bindPopup(popupHtml(p));
            cluster.addLayer(marker);
            row.marker = marker;
        } else {
            row.marker = null;
        }

        const tr = document.createElement('tr');
        const status = statusLabels[row.latlng ? p.status : (p.status === 'found' ? 'geocode_failed' : p.status)] || ['-', 'secondary'];
        tr.innerHTML = '<td>' + p.seq + (p.new ? ' <span class="badge-new">新增</span>' : '') + '</td>' +
            '<td>' + escapeHtml(p.counties.join('、')) + '</td>' +
            '<td>' + escapeHtml(p.name) +
            (terminalBySeq[p.seq] ? ' <span class="terminal-badge" data-seq="' + p.seq + '" title="檢視終端產品">' + terminalBySeq[p.seq].products.length + ' 項終端產品</span>' : '') +
            (p.note ? '<div class="note-text">' + escapeHtml(p.note) + '</div>' : '') + '</td>' +
            '<td>' + escapeHtml(p.address || '') + '</td>' +
            '<td>' + p.products.map(function (x) {
                const prod = productByAlias[x];
                if (prod) {
                    return '<span class="product-badge clickable" data-pid="' + prod.id + '" title="點擊顯示產品照片">' + escapeHtml(x) + ' 📷</span>';
                }
                return '<span class="product-badge">' + escapeHtml(x) + '</span>';
            }).join('') + '</td>' +
            '<td>' + batchHtml(p) + '</td>' +
            '<td><span class="badge bg-' + status[1] + '">' + status[0] + '</span></td>';
        if (row.latlng) {
            tr.className = 'row-located';
            tr.addEventListener('click', function () {
                showMap();
                if (window.innerWidth <= 768) {
                    collapseBar();
                }
                map.setView(row.latlng, 16);
                row.marker.openPopup();
            });
        }
        tr.querySelectorAll('.product-badge.clickable').forEach(function (badge) {
            badge.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleProductRow(tr, badge.getAttribute('data-pid'));
            });
        });
        tr.querySelectorAll('.terminal-badge').forEach(function (badge) {
            badge.addEventListener('click', function (e) {
                e.stopPropagation();
                document.getElementById('searchInput').value = p.name;
                showTerminal();
            });
        });
        tbody.appendChild(tr);
    });

    const terminalShown = renderTerminal(county, keyword);
    document.getElementById('statNote').textContent = currentView === 'terminal'
        ? '顯示 ' + terminalShown + ' 項終端產品'
        : '顯示 ' + shown + ' 筆，其中 ' + locatedCount + ' 筆可定位';
}

function setView(view) {
    currentView = view;
    document.getElementById('map').style.display = view === 'map' ? 'block' : 'none';
    document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('terminalView').style.display = view === 'terminal' ? 'block' : 'none';
    document.getElementById('btnMap').className = view === 'map' ? 'btn btn-warning' : 'btn btn-outline-warning';
    document.getElementById('btnTable').className = view === 'table' ? 'btn btn-warning' : 'btn btn-outline-warning';
    document.getElementById('btnTerminal').className = view === 'terminal' ? 'btn btn-warning' : 'btn btn-outline-warning';
    if (view === 'map') {
        map.invalidateSize();
    }
    render();
}

function showMap() { setView('map'); }
function showTable() { setView('table'); }
function showTerminal() { setView('terminal'); }

function collapseBar() {
    document.querySelector('.top-bar').style.display = 'none';
    document.getElementById('barToggle').style.display = 'block';
    map.invalidateSize();
}

function expandBar() {
    document.querySelector('.top-bar').style.display = '';
    document.getElementById('barToggle').style.display = 'none';
    map.invalidateSize();
}

document.getElementById('barToggle').addEventListener('click', expandBar);
document.getElementById('btnMap').addEventListener('click', showMap);
document.getElementById('btnTable').addEventListener('click', showTable);
document.getElementById('btnTerminal').addEventListener('click', showTerminal);

const infoModal = document.getElementById('infoModal');
document.getElementById('btnInfo').addEventListener('click', function () {
    infoModal.style.display = 'flex';
});
document.getElementById('infoClose').addEventListener('click', function () {
    infoModal.style.display = 'none';
});
infoModal.addEventListener('click', function (e) {
    if (e.target === infoModal) {
        infoModal.style.display = 'none';
    }
});

// on small screens the bar competes with the content, so any button
// click in it collapses the bar; the floating button restores it
document.querySelectorAll('.top-bar .btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
            collapseBar();
        }
    });
});
document.getElementById('countyFilter').addEventListener('change', function () {
    render();
    // on small screens the wrapped top bar covers most of the map, so
    // hide it before fitting bounds and leave a button to bring it back
    if (currentView === 'map' && window.innerWidth <= 768) {
        collapseBar();
    }
    const bounds = cluster.getBounds();
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
    }
});
document.getElementById('searchInput').addEventListener('input', render);

Promise.all([
    fetch('data/points.json').then(function (res) { return res.json(); }),
    fetch('data/products.json').then(function (res) { return res.json(); }),
    fetch('data/terminal_products.json').then(function (res) { return res.json(); })
]).then(function (results) {
    const json = results[0];
    results[1].products.forEach(function (prod) {
        productById[prod.id] = prod;
        prod.aliases.forEach(function (alias) {
            productByAlias[alias] = prod;
        });
    });
    results[2].vendors.forEach(function (vendor) {
        terminalBySeq[vendor.seq] = vendor;
        vendor.products.forEach(function (prod) {
            terminalRows.push({
                seq: vendor.seq,
                county: vendor.county,
                vendor: vendor.name,
                pseq: prod.seq,
                pname: prod.name
            });
        });
    });

    json.features.forEach(function (f) {
        allRows.push({
            properties: f.properties,
            latlng: [f.geometry.coordinates[1], f.geometry.coordinates[0]]
        });
    });
    json.unlocated.forEach(function (p) {
        allRows.push({ properties: p, latlng: null });
    });
    allRows.forEach(function (row) {
        rowBySeq[row.properties.seq] = row;
    });
    allRows.sort(function (a, b) {
        return a.properties.seq - b.properties.seq;
    });

    const counties = [];
    allRows.forEach(function (row) {
        row.properties.counties.forEach(function (c) {
            if (counties.indexOf(c) === -1) {
                counties.push(c);
            }
        });
    });
    const select = document.getElementById('countyFilter');
    counties.forEach(function (c) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });

    render();
});
