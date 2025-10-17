let allData = [];
let filteredData = [];
let locationStats = {};

// Fetch and process data
$.getJSON('https://kiang.github.io/join.gov.tw/842b1b2a-464b-4f1d-9d61-d5a0ab1b946b.json', function(data) {
    allData = data;
    filteredData = data;
    processData();
    updateDisplay();
    populateFilters();
});

function processData() {
    // Calculate location statistics
    locationStats = {};
    allData.forEach(item => {
        const city = item['居住縣市'];
        if (!locationStats[city]) {
            locationStats[city] = {
                count: 0,
                districts: {}
            };
        }
        locationStats[city].count++;

        const district = item['鄉鎮市區'];
        if (district) {
            if (!locationStats[city].districts[district]) {
                locationStats[city].districts[district] = 0;
            }
            locationStats[city].districts[district]++;
        }
    });

    // Update statistics cards
    $('#totalCount').text(allData.length.toLocaleString());
    $('#cityCount').text(Object.keys(locationStats).length);

    // Calculate date range
    const dates = allData.map(item => new Date(item['附議時間'])).filter(d => !isNaN(d));
    if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        $('#dateRange').html(
            minDate.toLocaleDateString('zh-TW', {month: 'numeric', day: 'numeric'}) +
            ' - ' +
            maxDate.toLocaleDateString('zh-TW', {month: 'numeric', day: 'numeric'})
        );
    }

    // Display location chart
    displayLocationChart();
}

function displayLocationChart() {
    // Sort locations by count
    const sortedLocations = Object.entries(locationStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20); // Top 20 locations

    const maxCount = sortedLocations[0][1].count;

    let html = '';
    sortedLocations.forEach(([city, stats]) => {
        const percentage = (stats.count / maxCount) * 100;
        html += `
            <div class="location-item">
                <div style="min-width: 100px;">${city}</div>
                <div style="flex-grow: 1; display: flex; align-items: center;">
                    <div class="location-bar" style="width: ${percentage}%;"></div>
                    <span style="margin-left: 10px; min-width: 50px;">${stats.count}</span>
                </div>
            </div>
        `;
    });

    $('#locationChart').html(html);
}

function populateFilters() {
    // Populate city filter
    const cities = Object.keys(locationStats).sort();
    cities.forEach(city => {
        $('#cityFilter').append(`<option value="${city}">${city} (${locationStats[city].count})</option>`);
    });

    // Event listeners
    $('#cityFilter').change(function() {
        const selectedCity = $(this).val();

        // Update district filter
        $('#districtFilter').html('<option value="">全部</option>');
        if (selectedCity && locationStats[selectedCity]) {
            const districts = Object.entries(locationStats[selectedCity].districts)
                .sort((a, b) => b[1] - a[1]);
            districts.forEach(([district, count]) => {
                $('#districtFilter').append(`<option value="${district}">${district} (${count})</option>`);
            });
        }

        applyFilters();
    });

    $('#districtFilter').change(applyFilters);
    $('#searchInput').on('input', applyFilters);
}

function applyFilters() {
    const city = $('#cityFilter').val();
    const district = $('#districtFilter').val();
    const searchTerm = $('#searchInput').val().toLowerCase();

    filteredData = allData.filter(item => {
        if (city && item['居住縣市'] !== city) return false;
        if (district && item['鄉鎮市區'] !== district) return false;
        if (searchTerm) {
            const nickname = (item['附議人暱稱'] || '').toLowerCase();
            const reason = (item['附議原因'] || '').toLowerCase();
            if (!nickname.includes(searchTerm) && !reason.includes(searchTerm)) {
                return false;
            }
        }
        return true;
    });

    updateDisplay();
}

function updateDisplay() {
    $('#recordCount').text(`(共 ${filteredData.length.toLocaleString()} 筆)`);

    const tbody = $('#dataTableBody');
    tbody.empty();

    if (filteredData.length === 0) {
        tbody.append('<tr><td colspan="6" class="text-center">無符合條件的資料</td></tr>');
        return;
    }

    // Display data (limit to first 100 for performance)
    const displayLimit = 100;
    const displayData = filteredData.slice(0, displayLimit);

    displayData.forEach(item => {
        const date = new Date(item['附議時間']);
        const dateStr = isNaN(date) ? item['附議時間'] :
            date.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

        const reason = item['附議原因'] || '-';
        const reasonDisplay = reason.length > 100 ?
            reason.substring(0, 100) + '...' : reason;

        tbody.append(`
            <tr>
                <td>${item['編號']}</td>
                <td>${dateStr}</td>
                <td>${item['居住縣市']}</td>
                <td>${item['鄉鎮市區'] || '-'}</td>
                <td>${item['附議人暱稱']}</td>
                <td title="${reason}">${reasonDisplay}</td>
            </tr>
        `);
    });

    if (filteredData.length > displayLimit) {
        tbody.append(`
            <tr>
                <td colspan="6" class="text-center text-muted">
                    顯示前 ${displayLimit} 筆，共 ${filteredData.length.toLocaleString()} 筆資料
                </td>
            </tr>
        `);
    }
}
