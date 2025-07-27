// Initialize map
const map = L.map('map').setView([23.8, 120.9], 8);

// Add NLSC base layer
L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">國土測繪中心</a>'
}).addTo(map);

// Color based on agree vs disagree votes
function getColor(agreeVotes, disagreeVotes) {
    if (agreeVotes === 0 && disagreeVotes === 0) {
        return '#999999'; // Gray for no data
    }
    
    if (agreeVotes > disagreeVotes) {
        // Green shades for agree majority
        const ratio = agreeVotes / (agreeVotes + disagreeVotes);
        return ratio > 0.8 ? '#006400' :  // Dark green
               ratio > 0.7 ? '#228B22' :  // Forest green
               ratio > 0.6 ? '#32CD32' :  // Lime green
                             '#90EE90';   // Light green
    } else {
        // Blue shades for disagree majority
        const ratio = disagreeVotes / (agreeVotes + disagreeVotes);
        return ratio > 0.8 ? '#000080' :  // Navy blue
               ratio > 0.7 ? '#0000CD' :  // Medium blue
               ratio > 0.6 ? '#4169E1' :  // Royal blue
                             '#87CEEB';   // Sky blue
    }
}

// Style function for polygons
function style(feature) {
    const villcode = feature.properties.VILLCODE;
    const data = villageData[villcode];
    
    if (!data) {
        return {
            fillColor: '#999999',
            weight: 1,
            opacity: 0.3,
            color: 'white',
            fillOpacity: 0.1
        };
    }
    
    return {
        fillColor: getColor(data.sum_fields.agree_votes, data.sum_fields.disagree_votes),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}

// Show popup on click
function onEachFeature(feature, layer) {
    layer.on({
        click: async function(e) {
            const props = feature.properties;
            const villcode = props.VILLCODE;
            
            // Check if this village has data for the current filter
            if (!villageData[villcode]) {
                layer.bindPopup(`
                    <div class="popup-content">
                        <h4>${props.COUNTYNAME} ${props.TOWNNAME} ${props.VILLNAME}</h4>
                        <div style="text-align: center; color: #999; padding: 20px;">
                            此村里無此罷免案資料
                        </div>
                    </div>
                `).openPopup();
                return;
            }
            
            // Show loading popup first
            layer.bindPopup(`<div style="text-align: center;">載入詳細資料中...</div>`).openPopup();
            
            // Load detailed data on demand
            const data = await loadDetailedVillageData(villcode);
            
            let popupContent = `
                <div class="popup-content">
                    <h4>${props.COUNTYNAME} ${props.TOWNNAME} ${props.VILLNAME}</h4>
                    <h5>總計</h5>
                    <table>
                        <tr><td>同意票數</td><td>${data.sum_fields.agree_votes.toLocaleString()}</td></tr>
                        <tr><td>不同意票數</td><td>${data.sum_fields.disagree_votes.toLocaleString()}</td></tr>
                        <tr><td>有效票數</td><td>${data.sum_fields.valid_votes.toLocaleString()}</td></tr>
                        <tr><td>無效票數</td><td>${data.sum_fields.invalid_votes ? data.sum_fields.invalid_votes.toLocaleString() : '0'}</td></tr>
                        <tr><td>投票人數</td><td>${data.sum_fields.total_voters.toLocaleString()}</td></tr>
                        <tr><td>選舉人數</td><td>${data.sum_fields.eligible_voters.toLocaleString()}</td></tr>
                        <tr><td>平均投票率</td><td>${data.sum_fields.average_turnout_rate}%</td></tr>
                    </table>
            `;
            
            // Add individual polling station data
            if (data.records && data.records.length > 0) {
                popupContent += `<h5>各投開票所 (共 ${data.records.length} 個)</h5>`;
                data.records.forEach(record => {
                    popupContent += `
                        <div style="margin: 10px 0; padding: 5px; background: #f5f5f5;">
                            <b>投開票所 ${record.polling_station}</b><br>
                            <small>${record.recall_case}</small><br>
                            同意: ${record.agree_votes} | 不同意: ${record.disagree_votes} | 投票率: ${record.turnout_rate}%
                        </div>
                    `;
                });
            }
            
            popupContent += '</div>';
            
            layer.bindPopup(popupContent, {maxWidth: 400}).openPopup();
        }
    });
}

// Info control
const info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

info.update = function () {
    this._div.innerHTML = '<h4>2025年罷免案投票結果</h4>點擊村里查看詳細資料';
};

info.addTo(map);

// Legend
const legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    
    div.innerHTML = '<h4>投票結果</h4>';
    
    // Green shades for agree majority
    div.innerHTML += '<i style="background:#006400"></i> 同意多數 (>80%)<br>';
    div.innerHTML += '<i style="background:#228B22"></i> 同意多數 (70-80%)<br>';
    div.innerHTML += '<i style="background:#32CD32"></i> 同意多數 (60-70%)<br>';
    div.innerHTML += '<i style="background:#90EE90"></i> 同意多數 (50-60%)<br>';
    
    div.innerHTML += '<br>';
    
    // Blue shades for disagree majority
    div.innerHTML += '<i style="background:#87CEEB"></i> 不同意多數 (50-60%)<br>';
    div.innerHTML += '<i style="background:#4169E1"></i> 不同意多數 (60-70%)<br>';
    div.innerHTML += '<i style="background:#0000CD"></i> 不同意多數 (70-80%)<br>';
    div.innerHTML += '<i style="background:#000080"></i> 不同意多數 (>80%)<br>';
    
    return div;
};

legend.addTo(map);

// Global variables
let villageData = {};
let geojson;
let allRecallCases = new Set();
let currentRecallCase = '';
let allVillageData = {};
let caseMappingData = null;

// Load village summary data for fast initial loading
async function loadVillageSummary() {
    try {
        const response = await fetch('https://kiang.github.io/recall-2025/cunli_json/cunli_summary.json');
        const summaryData = await response.json();
        
        // Store summary data for initial map display
        for (const [villcode, data] of Object.entries(summaryData)) {
            villageData[villcode] = data;
            allVillageData[villcode] = data;
        }
        
        console.log(`Loaded summary data for ${Object.keys(villageData).length} villages`);
        
    } catch (error) {
        console.error('Error loading village summary:', error);
    }
}

// Load recall cases from dedicated file
async function loadRecallCases() {
    try {
        console.log('Loading recall cases from recall_cases.json...');
        
        const response = await fetch('https://kiang.github.io/recall-2025/cunli_json/recall_cases.json');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const recallCasesData = await response.json();
        
        console.log('Recall cases data loaded:', recallCasesData);
        
        // Store the mapping data for later use
        caseMappingData = recallCasesData;
        
        // Extract cleaned cases from the data
        if (recallCasesData.cases && Array.isArray(recallCasesData.cases)) {
            recallCasesData.cases.forEach(caseName => {
                allRecallCases.add(caseName);
            });
            
            console.log(`Loaded ${allRecallCases.size} recall cases:`, Array.from(allRecallCases));
        } else {
            console.warn('No cases found in recall_cases.json');
        }
        
        // Populate dropdown
        populateRecallCaseDropdown();
        
    } catch (error) {
        console.error('Error loading recall cases:', error);
        
        // Fallback: try to load from individual village files
        console.log('Falling back to loading from individual village files...');
        await loadRecallCasesFromVillages();
    }
}

// Fallback method to load recall cases from village files
async function loadRecallCasesFromVillages() {
    try {
        const allVillages = Object.keys(allVillageData);
        const sampleSize = Math.min(20, allVillages.length);
        const sampleVillages = allVillages.slice(0, sampleSize);
        
        console.log(`Fallback: Loading recall cases from ${sampleVillages.length} village files...`);
        
        for (const villcode of sampleVillages) {
            try {
                const response = await fetch(`https://kiang.github.io/recall-2025/cunli_json/${villcode}.json`);
                
                if (!response.ok) continue;
                
                const detailedData = await response.json();
                
                if (detailedData.records && Array.isArray(detailedData.records)) {
                    detailedData.records.forEach(record => {
                        if (record.recall_case && record.recall_case.trim()) {
                            allRecallCases.add(record.recall_case.trim());
                        }
                    });
                }
            } catch (error) {
                // Continue if individual file fails
                continue;
            }
        }
        
        console.log(`Fallback loaded ${allRecallCases.size} recall cases:`, Array.from(allRecallCases));
        
        // Populate dropdown
        populateRecallCaseDropdown();
        
    } catch (error) {
        console.error('Fallback loading also failed:', error);
        
        // Final fallback with manual cases
        const fallbackCases = [
            '罷免新北市議員',
            '罷免台北市議員', 
            '罷免桃園市議員',
            '罷免台中市議員',
            '罷免高雄市議員'
        ];
        
        fallbackCases.forEach(caseName => {
            allRecallCases.add(caseName);
        });
        
        console.log('Using manual fallback recall cases');
        populateRecallCaseDropdown();
    }
}

// Populate the recall case dropdown
function populateRecallCaseDropdown() {
    const selector = document.getElementById('recall-case-selector');
    
    if (!selector) {
        console.error('Recall case selector not found');
        return;
    }
    
    // Clear existing options except the first one
    selector.innerHTML = '<option value="">所有罷免案</option>';
    
    if (allRecallCases.size === 0) {
        console.warn('No recall cases found');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '沒有找到罷免案';
        option.disabled = true;
        selector.appendChild(option);
        return;
    }
    
    // Add recall cases
    const sortedCases = Array.from(allRecallCases).sort();
    console.log('Adding recall cases to dropdown:', sortedCases);
    
    sortedCases.forEach(recallCase => {
        const option = document.createElement('option');
        option.value = recallCase;
        option.textContent = recallCase;
        selector.appendChild(option);
    });
    
    console.log(`Dropdown populated with ${sortedCases.length} recall cases`);
}

// Load detailed village data on demand
async function loadDetailedVillageData(villcode) {
    try {
        if (villageData[villcode] && villageData[villcode].records) {
            // Already loaded detailed data
            return villageData[villcode];
        }
        
        const response = await fetch(`https://kiang.github.io/recall-2025/cunli_json/${villcode}.json`);
        const detailedData = await response.json();
        
        // Merge detailed data with summary data
        villageData[villcode] = { ...villageData[villcode], ...detailedData };
        
        return villageData[villcode];
        
    } catch (error) {
        console.error(`Error loading detailed data for ${villcode}:`, error);
        return villageData[villcode]; // Return summary data if detailed load fails
    }
}

// Filter villages by recall case
async function filterByRecallCase(recallCase) {
    currentRecallCase = recallCase;
    
    if (!recallCase) {
        // Show all villages
        villageData = { ...allVillageData };
        console.log('Showing all villages');
    } else {
        console.log(`Filtering by: "${recallCase}"`);
        
        // Get village codes for this recall case from the recall cases data
        if (caseMappingData && caseMappingData.case_details && caseMappingData.case_details[recallCase]) {
            const caseDetails = caseMappingData.case_details[recallCase];
            const targetVillages = caseDetails.village_codes || [];
            
            console.log(`Found ${targetVillages.length} villages for case: ${recallCase}`);
            
            // Filter villages to only include those with data for this recall case
            villageData = {};
            
            // Load detailed data only for villages that have this recall case
            const loadPromises = targetVillages.map(async (villcode) => {
                if (allVillageData[villcode]) {
                    try {
                        const detailedData = await loadDetailedVillageData(villcode);
                        
                        if (detailedData.records) {
                            // Get the original case name for filtering
                            const originalCaseName = caseMappingData.case_mapping[recallCase];
                            
                            // Filter records for this specific recall case
                            const filteredRecords = detailedData.records.filter(record => 
                                record.recall_case === originalCaseName
                            );
                            
                            if (filteredRecords.length > 0) {
                                // Recalculate summary for this specific recall case
                                const recalculatedSummary = {
                                    sum_fields: {
                                        agree_votes: filteredRecords.reduce((sum, r) => sum + (r.agree_votes || 0), 0),
                                        disagree_votes: filteredRecords.reduce((sum, r) => sum + (r.disagree_votes || 0), 0),
                                        valid_votes: filteredRecords.reduce((sum, r) => sum + (r.valid_votes || 0), 0),
                                        invalid_votes: filteredRecords.reduce((sum, r) => sum + (r.invalid_votes || 0), 0),
                                        total_voters: filteredRecords.reduce((sum, r) => sum + (r.total_voters || 0), 0),
                                        eligible_voters: filteredRecords.reduce((sum, r) => sum + (r.eligible_voters || 0), 0),
                                        average_turnout_rate: filteredRecords.length > 0 ? 
                                            (filteredRecords.reduce((sum, r) => sum + (parseFloat(r.turnout_rate) || 0), 0) / filteredRecords.length).toFixed(2) : 0
                                    },
                                    records: filteredRecords
                                };
                                
                                villageData[villcode] = recalculatedSummary;
                            }
                        }
                    } catch (error) {
                        console.log(`Failed to load detailed data for ${villcode}:`, error.message);
                    }
                }
            });
            
            // Wait for all villages to be processed
            await Promise.all(loadPromises);
            
            console.log(`Successfully filtered to ${Object.keys(villageData).length} villages for case: ${recallCase}`);
        } else {
            console.warn(`No case details found for: ${recallCase}`);
            villageData = {};
        }
    }
    
    // Update map display
    updateMapDisplay();
    
    // Fit bounds to filtered data
    fitMapBounds();
}

// Update map display based on current filter
function updateMapDisplay() {
    if (geojson) {
        geojson.eachLayer(function(layer) {
            const villcode = layer.feature.properties.VILLCODE;
            const hasData = villageData[villcode];
            
            if (hasData) {
                layer.setStyle(style(layer.feature));
                layer.options.interactive = true;
            } else {
                layer.setStyle({
                    fillColor: '#999999',
                    weight: 1,
                    opacity: 0.3,
                    color: 'white',
                    fillOpacity: 0.1
                });
                layer.options.interactive = false;
            }
        });
    }
}

// Fit map bounds to currently visible data
function fitMapBounds() {
    if (!geojson) return;
    
    const visibleLayers = [];
    geojson.eachLayer(function(layer) {
        const villcode = layer.feature.properties.VILLCODE;
        if (villageData[villcode]) {
            visibleLayers.push(layer);
        }
    });
    
    if (visibleLayers.length > 0) {
        const group = new L.featureGroup(visibleLayers);
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
}

// Load GeoJSON and initialize map
async function initializeMap() {
    try {
        // Load village summary data first for fast loading
        await loadVillageSummary();
        
        // Load recall cases
        await loadRecallCases();
        
        // Load TopoJSON
        const response = await fetch('https://kiang.github.io/taiwan_basecode/cunli/s_topo/20250620.json');
        const topoData = await response.json();
        
        // Convert TopoJSON to GeoJSON
        // Find the topology object name (usually the first key in objects)
        const objectName = Object.keys(topoData.objects)[0];
        const geoData = topojson.feature(topoData, topoData.objects[objectName]);
        
        // Create GeoJSON layer with all features (filtering will be done later)
        geojson = L.geoJSON(geoData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);
        
        // Initial map display
        updateMapDisplay();
        fitMapBounds();
        
        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        document.getElementById('loading').innerHTML = '載入失敗';
    }
}

// Chart functionality
let chartInstances = {};

function calculateOverallResults() {
    let totalAgree = 0;
    let totalDisagree = 0;
    let totalValid = 0;
    let totalInvalid = 0;
    let totalVoters = 0;
    let totalEligible = 0;
    let villageCount = 0;
    let countyStats = {};
    let turnoutRanges = {
        'low': 0,    // <50%
        'medium': 0, // 50-70%
        'high': 0,   // 70-85%
        'veryHigh': 0 // >85%
    };
    
    for (const [villcode, data] of Object.entries(villageData)) {
        totalAgree += data.sum_fields.agree_votes;
        totalDisagree += data.sum_fields.disagree_votes;
        totalValid += data.sum_fields.valid_votes;
        totalInvalid += data.sum_fields.invalid_votes || 0;
        totalVoters += data.sum_fields.total_voters;
        totalEligible += data.sum_fields.eligible_voters;
        villageCount++;
        
        // Get county name from first feature that matches this villcode
        let countyName = '未知';
        if (geojson) {
            geojson.eachLayer(function(layer) {
                if (layer.feature.properties.VILLCODE === villcode) {
                    countyName = layer.feature.properties.COUNTYNAME;
                }
            });
        }
        
        // County statistics
        if (!countyStats[countyName]) {
            countyStats[countyName] = {
                agree: 0,
                disagree: 0,
                valid: 0,
                villages: 0
            };
        }
        countyStats[countyName].agree += data.sum_fields.agree_votes;
        countyStats[countyName].disagree += data.sum_fields.disagree_votes;
        countyStats[countyName].valid += data.sum_fields.valid_votes;
        countyStats[countyName].villages++;
        
        // Turnout rate distribution
        const turnoutRate = data.sum_fields.eligible_voters > 0 ? 
            (data.sum_fields.total_voters / data.sum_fields.eligible_voters) * 100 : 0;
        
        if (turnoutRate < 50) turnoutRanges.low++;
        else if (turnoutRate < 70) turnoutRanges.medium++;
        else if (turnoutRate < 85) turnoutRanges.high++;
        else turnoutRanges.veryHigh++;
    }
    
    const turnoutRate = totalEligible > 0 ? ((totalVoters / totalEligible) * 100).toFixed(2) : 0;
    const agreePercentage = totalValid > 0 ? ((totalAgree / totalValid) * 100).toFixed(1) : 0;
    const disagreePercentage = totalValid > 0 ? ((totalDisagree / totalValid) * 100).toFixed(1) : 0;
    
    return {
        totalAgree,
        totalDisagree,
        totalValid,
        totalInvalid,
        totalVoters,
        totalEligible,
        villageCount,
        turnoutRate,
        agreePercentage,
        disagreePercentage,
        countyStats,
        turnoutRanges
    };
}

function showChart() {
    const results = calculateOverallResults();
    
    // Show popup
    const popup = document.getElementById('chart-popup');
    popup.style.display = 'flex';
    
    // Update title based on current filter
    const chartTitle = document.querySelector('.chart-content h3');
    if (currentRecallCase) {
        chartTitle.textContent = `${currentRecallCase} 投票結果分析`;
    } else {
        chartTitle.textContent = '2025年罷免案總體投票結果分析';
    }
    
    // Update statistics with enhanced layout
    const statsDiv = document.getElementById('chart-stats');
    statsDiv.innerHTML = `
        <div class="stat-item">
            <div class="stat-value" style="color: #28a745;">${results.totalAgree.toLocaleString()}</div>
            <div class="stat-label">同意票數 (${results.agreePercentage}%)</div>
        </div>
        <div class="stat-item">
            <div class="stat-value" style="color: #dc3545;">${results.totalDisagree.toLocaleString()}</div>
            <div class="stat-label">不同意票數 (${results.disagreePercentage}%)</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${results.totalValid.toLocaleString()}</div>
            <div class="stat-label">有效票數</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${results.totalInvalid.toLocaleString()}</div>
            <div class="stat-label">無效票數</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${results.totalVoters.toLocaleString()}</div>
            <div class="stat-label">投票人數</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${results.totalEligible.toLocaleString()}</div>
            <div class="stat-label">選舉人數</div>
        </div>
        <div class="stat-item">
            <div class="stat-value" style="color: #007bff;">${results.turnoutRate}%</div>
            <div class="stat-label">平均投票率</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${results.villageCount}</div>
            <div class="stat-label">統計村里數</div>
        </div>
    `;
    
    // Destroy existing charts
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};
    
    // 1. Results Pie Chart
    const resultsCtx = document.getElementById('resultsChart').getContext('2d');
    chartInstances.results = new Chart(resultsCtx, {
        type: 'doughnut',
        data: {
            labels: ['同意', '不同意'],
            datasets: [{
                data: [results.totalAgree, results.totalDisagree],
                backgroundColor: ['#28a745', '#dc3545'],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 12 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const percentage = ((value / results.totalValid) * 100).toFixed(1);
                            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // 2. Turnout Distribution Chart
    const turnoutCtx = document.getElementById('turnoutChart').getContext('2d');
    chartInstances.turnout = new Chart(turnoutCtx, {
        type: 'bar',
        data: {
            labels: ['<50%', '50-70%', '70-85%', '>85%'],
            datasets: [{
                label: '村里數',
                data: [
                    results.turnoutRanges.low,
                    results.turnoutRanges.medium,
                    results.turnoutRanges.high,
                    results.turnoutRanges.veryHigh
                ],
                backgroundColor: ['#ffc107', '#fd7e14', '#20c997', '#0d6efd'],
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = Object.values(results.turnoutRanges).reduce((a,b) => a+b, 0);
                            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                            return `${context.parsed.y} 個村里 (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
    
    // 3. County Comparison Chart
    const countyLabels = Object.keys(results.countyStats);
    const countyAgreePercentages = countyLabels.map(county => {
        const stats = results.countyStats[county];
        return stats.valid > 0 ? parseFloat(((stats.agree / stats.valid) * 100).toFixed(1)) : 0;
    });
    
    const countyCtx = document.getElementById('countyChart').getContext('2d');
    chartInstances.county = new Chart(countyCtx, {
        type: 'bar',
        data: {
            labels: countyLabels,
            datasets: [{
                label: '同意比例 (%)',
                data: countyAgreePercentages,
                backgroundColor: countyAgreePercentages.map(p => 
                    p > 50 ? '#28a745' : '#dc3545'
                ),
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const county = context.label;
                            const stats = results.countyStats[county];
                            return [
                                `同意比例: ${context.parsed.x}%`,
                                `同意: ${stats.agree.toLocaleString()}`,
                                `不同意: ${stats.disagree.toLocaleString()}`,
                                `村里數: ${stats.villages}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: { 
                    beginAtZero: true, 
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
    
    // 4. Participation Chart
    const participationCtx = document.getElementById('participationChart').getContext('2d');
    const participationData = [
        results.totalVoters, 
        Math.max(0, results.totalEligible - results.totalVoters)
    ];
    
    chartInstances.participation = new Chart(participationCtx, {
        type: 'pie',
        data: {
            labels: ['已投票', '未投票'],
            datasets: [{
                data: participationData,
                backgroundColor: ['#007bff', '#e9ecef'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        padding: 15, 
                        font: { size: 12 },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, index) => {
                                    const value = data.datasets[0].data[index];
                                    const percentage = ((value / results.totalEligible) * 100).toFixed(1);
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[index],
                                        strokeStyle: data.datasets[0].borderColor,
                                        lineWidth: data.datasets[0].borderWidth,
                                        index: index
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const percentage = ((value / results.totalEligible) * 100).toFixed(1);
                            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Event listeners for chart functionality
document.addEventListener('DOMContentLoaded', function() {
    const chartButton = document.getElementById('chart-button');
    const chartPopup = document.getElementById('chart-popup');
    const chartCloser = document.getElementById('chart-closer');
    const recallSelector = document.getElementById('recall-case-selector');
    
    chartButton.addEventListener('click', showChart);
    
    chartCloser.addEventListener('click', function() {
        chartPopup.style.display = 'none';
    });
    
    // Close popup when clicking outside
    chartPopup.addEventListener('click', function(e) {
        if (e.target === chartPopup) {
            chartPopup.style.display = 'none';
        }
    });
    
    // Handle recall case selection
    recallSelector.addEventListener('change', async function(e) {
        const selectedCase = e.target.value;
        
        // Show loading
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        loading.innerHTML = selectedCase ? `載入 ${selectedCase} 資料中...` : '載入所有資料中...';
        
        try {
            await filterByRecallCase(selectedCase);
            
            // Update the chart button text
            const chartButton = document.getElementById('chart-button');
            chartButton.textContent = selectedCase ? `📊 ${selectedCase} 結果` : '📊 總體結果';
            
        } catch (error) {
            console.error('Error filtering by recall case:', error);
            alert('載入失敗，請重試');
        } finally {
            loading.style.display = 'none';
        }
    });
});

// Initialize the map
initializeMap();