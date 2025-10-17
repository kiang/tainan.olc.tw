let allData = [];
let locationStats = {};
let displayedReasons = 0;
const reasonsPerPage = 30;
let isLoading = false;
let allReasonsLoaded = false;

// Infinite scroll handler
let scrollTimeout;
$(window).scroll(function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function() {
        if (isLoading || allReasonsLoaded) return;

        const scrollPosition = $(window).scrollTop() + $(window).height();
        const documentHeight = $(document).height();

        // Load more when user is within 500px of bottom
        if (scrollPosition > documentHeight - 500) {
            displayReasons(true);
        }
    }, 100);
});

// Fetch and process data
$.getJSON('https://kiang.github.io/join.gov.tw/842b1b2a-464b-4f1d-9d61-d5a0ab1b946b.json', function(data) {
    allData = data;
    processData();
    createTicker();
    displayReasons();
    updateCTA();
});

function createTicker() {
    const reasons = allData.filter(item => item['附議原因'] && item['附議原因'].trim() !== '');

    // Select random reasons for ticker
    const shuffled = reasons.sort(() => 0.5 - Math.random()).slice(0, 50);

    let tickerHTML = '';
    // Duplicate for seamless loop
    for (let i = 0; i < 2; i++) {
        shuffled.forEach(item => {
            const text = item['附議原因'].length > 80 ?
                item['附議原因'].substring(0, 80) + '...' : item['附議原因'];
            tickerHTML += `<div class="ticker-item">${text}</div>`;
        });
    }

    $('#reasonTicker').html(tickerHTML);
}

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

function displayReasons(loadMore = false) {
    if (isLoading) return;

    const reasons = allData
        .filter(item => item['附議原因'] && item['附議原因'].trim() !== '')
        .sort((a, b) => {
            const dateA = new Date(a['附議時間']);
            const dateB = new Date(b['附議時間']);
            return dateB - dateA; // Descending order (newest first)
        });

    if (!loadMore) {
        displayedReasons = 0;
        allReasonsLoaded = false;
        $('#allReasons').empty();
    }

    // Check if all reasons are already loaded
    if (displayedReasons >= reasons.length) {
        allReasonsLoaded = true;
        $('#loadMoreBtn').html('已顯示所有附議原因').prop('disabled', true);
        return;
    }

    isLoading = true;
    $('#loadingIndicator').addClass('active');
    $('#loadMoreBtn').html('載入中...').prop('disabled', true);

    const start = displayedReasons;
    const end = Math.min(start + reasonsPerPage, reasons.length);
    const gradients = ['gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
                       'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8'];

    // Simulate slight delay for smooth loading
    setTimeout(function() {
        for (let i = start; i < end; i++) {
            const item = reasons[i];
            const gradient = gradients[i % gradients.length];
            const date = new Date(item['附議時間']);
            const dateStr = isNaN(date) ? '' : date.toLocaleDateString('zh-TW');

            // Extract username if nickname contains '@'
            let displayName = item['附議人暱稱'];
            if (displayName.includes('@')) {
                displayName = displayName.split('@')[0];
            }

            const card = $(`
                <div class="reason-card ${gradient}">
                    <div class="reason-text">${item['附議原因']}</div>
                    <div class="reason-meta">
                        <span><i class="fa fa-user"></i> ${displayName}</span>
                        <span><i class="fa fa-map-marker"></i> ${item['居住縣市']} ${item['鄉鎮市區'] || ''}</span>
                    </div>
                </div>
            `);

            $('#allReasons').append(card);
        }

        displayedReasons = end;

        // Update button and loading indicator state
        $('#loadingIndicator').removeClass('active');

        if (displayedReasons >= reasons.length) {
            allReasonsLoaded = true;
            $('#loadMoreBtn').html('已顯示所有附議原因 (' + reasons.length + ' 筆)').prop('disabled', true).addClass('btn-success').removeClass('btn-primary');
        } else {
            $('#loadMoreBtn').html('載入更多附議原因 (' + displayedReasons + '/' + reasons.length + ')').prop('disabled', false);
        }

        isLoading = false;
    }, 200);
}

// Load more button handler
$('#loadMoreBtn').click(function() {
    displayReasons(true);
});

// Minimize floating CTA
$('#closeCta').click(function(e) {
    e.stopPropagation();
    $('#floatingCta').addClass('minimized');
});

// Expand floating CTA when clicking on minimized box
$('#floatingCta').click(function(e) {
    if ($(this).hasClass('minimized')) {
        $(this).removeClass('minimized');
    }
});

// Prevent clicks on content from closing
$('.cta-content').click(function(e) {
    e.stopPropagation();
});

// Update CTA with dynamic data
function updateCTA() {
    const targetGoal = 5000;
    const endorsementCount = allData.length;

    // Update endorsement count
    $('#ctaEndorsementCount').text(endorsementCount.toLocaleString() + ' 人');

    // Calculate progress percentage
    const progressPercentage = (endorsementCount / targetGoal) * 100;
    $('#ctaProgressBar').css('width', progressPercentage.toFixed(1) + '%');

    // Calculate days remaining
    // Fixed start date: October 16, 2025 (GMT+8)
    const startDate = new Date('2025-10-16T00:00:00+08:00');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 60); // 60 days from start (December 15, 2025)

    // Get current time in GMT+8
    const now = new Date();
    const taiwanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

    const daysRemaining = Math.ceil((endDate - taiwanTime) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 0) {
        $('#ctaDaysRemaining').text(daysRemaining);
    } else {
        $('#ctaDaysRemaining').text('0');
    }
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
