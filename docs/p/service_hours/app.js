// Global variables
let serviceData = [];
let filteredData = [];
let allAreas = new Set();

// Zip code mapping for Tainan districts
const zipCodeMap = {
    '中西區': 700,
    '東區': 701,
    '南區': 702,
    '北區': 704,
    '安平區': 708,
    '安南區': 709,
    '永康區': 710,
    '歸仁區': 711,
    '新化區': 712,
    '左鎮區': 713,
    '玉井區': 714,
    '楠西區': 715,
    '南化區': 716,
    '仁德區': 717,
    '關廟區': 718,
    '龍崎區': 719,
    '官田區': 720,
    '麻豆區': 721,
    '佳里區': 722,
    '西港區': 723,
    '七股區': 724,
    '將軍區': 725,
    '學甲區': 726,
    '北門區': 727,
    '新營區': 730,
    '後壁區': 731,
    '白河區': 732,
    '東山區': 733,
    '六甲區': 734,
    '下營區': 735,
    '柳營區': 736,
    '鹽水區': 737,
    '善化區': 741,
    '大內區': 742,
    '山上區': 743,
    '新市區': 744,
    '安定區': 745
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadDataAndInitialize();
});

async function loadDataAndInitialize() {
    try {
        // Fetch JSON data
        const response = await fetch('https://kiang.github.io/tn.edu.tw/json/service_learning_organizations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        serviceData = await response.json();
        
        // Initialize app after data is loaded
        initializeApp();
    } catch (error) {
        console.error('Error loading data:', error);
        // Try to fall back to data.js if it exists
        if (typeof window.serviceData !== 'undefined') {
            serviceData = window.serviceData;
            initializeApp();
        } else {
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">無法載入資料，請稍後再試</td></tr>';
        }
    }
}

function initializeApp() {
    // Process data
    processData();
    
    // Sort data by zip code
    sortDataByZipCode();
    
    // Populate area filter
    populateAreaFilter();
    
    // Display all data initially
    filteredData = [...serviceData];
    displayData();
    
    // Setup event listeners
    setupEventListeners();
}

function sortDataByZipCode() {
    serviceData.sort((a, b) => {
        // Get the first district from each item's area field
        const areaA = a['區域'] || '';
        const areaB = b['區域'] || '';
        
        // Extract first district name if multiple districts
        const districtA = areaA.split(' ')[0];
        const districtB = areaB.split(' ')[0];
        
        // Get zip codes, use 999 for unknown districts
        const zipA = zipCodeMap[districtA] || 999;
        const zipB = zipCodeMap[districtB] || 999;
        
        // Sort by zip code
        if (zipA !== zipB) {
            return zipA - zipB;
        }
        
        // If same zip code, sort by organization name
        const orgA = a['機關/單位'] || '';
        const orgB = b['機關/單位'] || '';
        return orgA.localeCompare(orgB, 'zh-TW');
    });
}

function processData() {
    // Collect all unique areas (handle multiple zones separated by spaces)
    serviceData.forEach(item => {
        if (item['區域']) {
            // Split by space to handle multiple zones
            const zones = item['區域'].split(' ').filter(z => z.trim() && z !== '全區');
            zones.forEach(zone => {
                if (zone.endsWith('區')) {
                    allAreas.add(zone);
                }
            });
            // Also add special cases
            if (item['區域'] === '全區' || item['區域'] === '臺南市') {
                allAreas.add(item['區域']);
            }
        }
    });
}

function populateAreaFilter() {
    const areaFilter = document.getElementById('areaFilter');
    
    // Sort areas by zip code
    const sortedAreas = Array.from(allAreas).sort((a, b) => {
        // Get zip codes for sorting
        const zipA = zipCodeMap[a] || 999;
        const zipB = zipCodeMap[b] || 999;
        
        // Sort by zip code
        if (zipA !== zipB) {
            return zipA - zipB;
        }
        
        // If same zip code or both unknown, sort alphabetically
        return a.localeCompare(b, 'zh-TW');
    });
    
    sortedAreas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

function setupEventListeners() {
    // Search input
    document.getElementById('searchInput').addEventListener('input', filterData);
    
    // Filter dropdowns
    document.getElementById('areaFilter').addEventListener('change', filterData);
    document.getElementById('typeFilter').addEventListener('change', filterData);
    document.getElementById('timeFilter').addEventListener('change', filterData);
    
    // Clear filters button
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
}

function filterData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const areaFilter = document.getElementById('areaFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const timeFilter = document.getElementById('timeFilter').value;
    
    // Filter data while maintaining the original sorted order
    filteredData = serviceData.filter(item => {
        // Search filter
        if (searchTerm) {
            const searchableText = Object.values(item).join(' ').toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // Area filter (check if selected area is in the zones)
        if (areaFilter) {
            const itemZones = item['區域'] || '';
            // Check for exact match or if the zone is part of multiple zones
            if (areaFilter === '全區' || areaFilter === '臺南市') {
                // Special cases - exact match only
                if (itemZones !== areaFilter) {
                    return false;
                }
            } else {
                // Check if the selected area is one of the zones
                const zones = itemZones.split(' ');
                if (!zones.includes(areaFilter)) {
                    return false;
                }
            }
        }
        
        // Type filter
        if (typeFilter) {
            const remarks = item['備註'] || '';
            const orgName = item['機關/單位'] || '';
            
            if (typeFilter === '公家機關' && !remarks.includes('公家機關')) {
                return false;
            }
            if (typeFilter === '人民團體' && !remarks.includes('人民團體')) {
                return false;
            }
            if (typeFilter === '財團法人' && !orgName.includes('財團法人')) {
                return false;
            }
            if (typeFilter === '社團法人' && !orgName.includes('社團法人')) {
                return false;
            }
        }
        
        // Time filter
        if (timeFilter) {
            const serviceTime = item['服務時間及員額'] || '';
            if (timeFilter === '寒暑假' && !serviceTime.includes('寒暑假')) {
                return false;
            }
            if (timeFilter === '週六' && !serviceTime.includes('週六') && !serviceTime.includes('六')) {
                return false;
            }
            if (timeFilter === '週日' && !serviceTime.includes('週日') && !serviceTime.includes('日')) {
                return false;
            }
            if (timeFilter === '平日' && !serviceTime.includes('週一') && !serviceTime.includes('週二') && 
                !serviceTime.includes('週三') && !serviceTime.includes('週四') && !serviceTime.includes('週五')) {
                return false;
            }
        }
        
        return true;
    });
    
    displayData();
}

function displayData() {
    const tableBody = document.getElementById('tableBody');
    const noResults = document.getElementById('noResults');
    const visibleCount = document.getElementById('visibleCount');
    const totalCount = document.getElementById('totalCount');
    const areaFilter = document.getElementById('areaFilter').value;
    
    // Update counts
    visibleCount.textContent = filteredData.length;
    totalCount.textContent = serviceData.length;
    
    // Hide/show area column based on filter
    const areaHeader = document.querySelector('#dataTable thead th:first-child');
    const shouldHideArea = areaFilter !== '';
    
    if (shouldHideArea) {
        areaHeader.style.display = 'none';
    } else {
        areaHeader.style.display = '';
    }
    
    // Clear table
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    // Display filtered data
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        
        // Format area with special styling for multiple zones
        const areaText = item['區域'] || '';
        let formattedArea = areaText;
        if (areaText.includes(' ') && areaText !== '全區' && areaText !== '臺南市') {
            // Multiple zones - add special styling
            const zones = areaText.split(' ').filter(z => z.trim());
            formattedArea = `<span class="multiple-zones" title="服務多個區域">${zones.join(' • ')}</span>`;
        } else if (areaText === '全區' || areaText === '臺南市') {
            formattedArea = `<span class="all-zones">${areaText}</span>`;
        }
        
        // Format contact info
        const contactInfo = item['聯絡方式與窗口'] || '';
        const formattedContact = contactInfo.replace(/電話:/g, '<br>電話:').replace(/聯絡人:/g, '<strong>聯絡人:</strong>');
        
        // Format service content
        const serviceContent = item['服務內容'] || '';
        const formattedService = serviceContent.split(/\d+\./).filter(s => s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`).join('<br>');
        
        // Format service time
        const serviceTime = item['服務時間及員額'] || '';
        const formattedTime = serviceTime.replace(/每日/g, '<br>每日').replace(/每週/g, '<br>每週').replace(/週/g, '<br>週');
        
        // Build row HTML based on whether area column should be hidden
        if (shouldHideArea) {
            row.innerHTML = `
                <td class="org-cell">${item['機關/單位'] || ''}</td>
                <td class="time-cell">${formattedTime}</td>
                <td class="service-cell">${formattedService || item['服務內容'] || ''}</td>
                <td class="contact-cell">${formattedContact}</td>
                <td class="remark-cell">${item['備註'] || ''}</td>
            `;
        } else {
            row.innerHTML = `
                <td class="area-cell">${formattedArea}</td>
                <td class="org-cell">${item['機關/單位'] || ''}</td>
                <td class="time-cell">${formattedTime}</td>
                <td class="service-cell">${formattedService || item['服務內容'] || ''}</td>
                <td class="contact-cell">${formattedContact}</td>
                <td class="remark-cell">${item['備註'] || ''}</td>
            `;
        }
        
        tableBody.appendChild(row);
    });
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('areaFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('timeFilter').value = '';
    
    filteredData = [...serviceData];
    displayData();
}