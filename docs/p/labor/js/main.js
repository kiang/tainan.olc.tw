// Initialize variables
let companies = [];
let dataTable = null;
let currentSelectedIndex = -1;

// Function to select a random company
function selectRandomCompany() {
    if (companies.length > 0) {
        const randomIndex = Math.floor(Math.random() * companies.length);
        const randomCompany = companies[randomIndex];
        $('#searchInput').val(randomCompany);
        loadCompanyData(randomCompany);
    } else {
        alert('尚未載入公司列表，請稍後再試。');
    }
}

// Function to update selected item in search results
function updateSelectedItem() {
    $('.search-result-item').removeClass('selected');
    if (currentSelectedIndex >= 0) {
        const selectedItem = $('.search-result-item').eq(currentSelectedIndex);
        selectedItem.addClass('selected');
        
        // Scroll the selected item into view
        const container = $('#searchResults');
        const itemTop = selectedItem.position().top;
        const itemBottom = itemTop + selectedItem.outerHeight();
        const containerHeight = container.height();
        
        if (itemTop < 0) {
            // Item is above the visible area
            container.scrollTop(container.scrollTop() + itemTop);
        } else if (itemBottom > containerHeight) {
            // Item is below the visible area
            container.scrollTop(container.scrollTop() + (itemBottom - containerHeight));
        }
    }
}

// Load company list
async function loadCompanies() {
    try {
        const response = await fetch('https://kiang.github.io/announcement.mol.gov.tw/company.csv');
        const text = await response.text();
        companies = text.split('\n').filter(line => line.trim());
        
        // Randomly select a company if we have companies loaded
        if (companies.length > 0) {
            selectRandomCompany();
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        alert('無法載入公司列表，請稍後再試。');
    }
}

// Search companies
function searchCompanies(query) {
    if (!query) return [];
    query = query.toLowerCase();
    return companies.filter(company => 
        company.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
}

// Load company data
async function loadCompanyData(companyName) {
    try {
        const response = await fetch(`https://kiang.github.io/announcement.mol.gov.tw/company/${encodeURIComponent(companyName)}.csv`);
        const text = await response.text();
        const rows = text.split('\n').filter(line => line.trim());
        
        // Parse CSV data
        const headers = rows[0].split(',');
        const data = rows.slice(1).map(row => {
            const values = row.split(',');
            return {
                '主管機關': values[0] || '',
                '公告日期': values[1] || '',
                '處分日期': values[2] || '',
                '處分字號': values[3] || '',
                '事業單位名稱或負責人': values[4] || '',
                '違法法規法條': values[5] || '',
                '違反法規內容': values[6] || '',
                '罰鍰金額': values[7] || '',
                '備註說明': values[8] || ''
            };
        });

        // Update DataTable
        if (dataTable) {
            dataTable.destroy();
        }
        
        dataTable = $('#dataTable').DataTable({
            data: data,
            columns: [
                { data: '主管機關' },
                { data: '公告日期' },
                { data: '處分日期' },
                { data: '處分字號' },
                { data: '事業單位名稱或負責人' },
                { data: '違法法規法條' },
                { data: '違反法規內容' },
                { data: '罰鍰金額' },
                { data: '備註說明' }
            ],
            language: {
                "emptyTable": "沒有資料",
                "info": "顯示第 _START_ 至 _END_ 項結果，共 _TOTAL_ 項",
                "infoEmpty": "顯示第 0 至 0 項結果，共 0 項",
                "infoFiltered": "(由 _MAX_ 項結果過濾)",
                "infoThousands": ",",
                "lengthMenu": "顯示 _MENU_ 項結果",
                "loadingRecords": "載入中...",
                "processing": "處理中...",
                "search": "搜尋:",
                "zeroRecords": "沒有符合的結果",
                "paginate": {
                    "first": "首頁",
                    "last": "末頁",
                    "next": "下頁",
                    "previous": "上頁"
                },
                "aria": {
                    "sortAscending": ": 升序排列",
                    "sortDescending": ": 降序排列"
                }
            },
            order: [[1, 'desc']], // Sort by 公告日期 descending
            pageLength: 10,
            responsive: true,
            dom: '<"top"lf>rt<"bottom"ip><"clear">',
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "全部"]]
        });

        // Show the table
        $('#dataTable').show();
        
        // Scroll to table
        $('html, body').animate({
            scrollTop: $('#dataTable').offset().top - 20
        }, 500);
    } catch (error) {
        console.error('Error loading company data:', error);
        alert('無法載入公司資料，請稍後再試。');
    }
}

// Initialize the application
$(document).ready(function() {
    // Load companies
    loadCompanies();

    // Setup search input
    const searchInput = $('#searchInput');
    const searchResults = $('#searchResults');
    const searchButton = $('#searchButton');
    const randomButton = $('#randomButton');

    // Handle random button click
    randomButton.on('click', function() {
        selectRandomCompany();
    });

    // Handle input changes
    searchInput.on('input', function() {
        const query = $(this).val();
        if (query.length >= 2) {
            const results = searchCompanies(query);
            searchResults.empty();
            if (results.length > 0) {
                results.forEach(company => {
                    searchResults.append(
                        $('<div class="search-result-item">').text(company)
                    );
                });
                searchResults.show();
                currentSelectedIndex = -1;
                updateSelectedItem();
            } else {
                searchResults.hide();
            }
        } else {
            searchResults.hide();
        }
    });

    // Handle keyboard navigation
    searchInput.on('keydown', function(e) {
        const items = $('.search-result-item');
        if (items.length === 0) return;

        switch(e.keyCode) {
            case 38: // Up arrow
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateSelectedItem();
                }
                break;
            case 40: // Down arrow
                e.preventDefault();
                if (currentSelectedIndex < items.length - 1) {
                    currentSelectedIndex++;
                    updateSelectedItem();
                }
                break;
            case 13: // Enter
                e.preventDefault();
                if (currentSelectedIndex >= 0) {
                    const selectedCompany = items.eq(currentSelectedIndex).text();
                    searchInput.val(selectedCompany);
                    searchResults.hide();
                    loadCompanyData(selectedCompany);
                } else {
                    searchButton.click();
                }
                break;
            case 27: // Escape
                searchResults.hide();
                currentSelectedIndex = -1;
                break;
        }
    });

    // Handle result click
    searchResults.on('click', '.search-result-item', function() {
        const companyName = $(this).text();
        searchInput.val(companyName);
        searchResults.hide();
        currentSelectedIndex = -1;
        loadCompanyData(companyName);
    });

    // Handle search button click
    searchButton.on('click', function() {
        const query = searchInput.val();
        if (query) {
            const results = searchCompanies(query);
            if (results.length > 0) {
                loadCompanyData(results[0]);
            } else {
                alert('找不到符合的公司。');
            }
        }
    });

    // Hide results when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-input-group').length) {
            searchResults.hide();
            currentSelectedIndex = -1;
        }
    });
});
