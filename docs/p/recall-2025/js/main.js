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
    
    return {
        fillColor: getColor(data.sum_fields.agree_votes, data.sum_fields.disagree_votes),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}

// Highlight feature on hover
function highlightFeature(e) {
    const layer = e.target;
    
    layer.setStyle({
        weight: 3,
        color: '#666',
        fillOpacity: 0.9
    });
    
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    
    info.update(layer.feature.properties);
}

// Reset highlight
function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update();
}

// Show popup on click
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: async function(e) {
            const props = feature.properties;
            const villcode = props.VILLCODE;
            
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

info.update = function (props) {
    if (!props) {
        this._div.innerHTML = '<h4>2025年罷免案投票結果</h4>將滑鼠移至村里查看資料';
        return;
    }
    
    const villcode = props.VILLCODE;
    const data = villageData[villcode];
    const agreeVotes = data.sum_fields.agree_votes;
    const disagreeVotes = data.sum_fields.disagree_votes;
    const majority = agreeVotes > disagreeVotes ? '同意多數' : '不同意多數';
    const majorityColor = agreeVotes > disagreeVotes ? 'green' : 'blue';
    
    this._div.innerHTML = `
        <h4>${props.COUNTYNAME} ${props.TOWNNAME} ${props.VILLNAME}</h4>
        <div class="stats">
            <div><b style="color: ${majorityColor};">${majority}</b></div>
            <div><b>同意票:</b> ${agreeVotes.toLocaleString()}</div>
            <div><b>不同意票:</b> ${disagreeVotes.toLocaleString()}</div>
            <div><b>平均投票率:</b> ${data.sum_fields.average_turnout_rate}%</div>
            <div><b>選舉人數:</b> ${data.sum_fields.eligible_voters.toLocaleString()}</div>
        </div>
    `;
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

// Load village summary data for fast initial loading
async function loadVillageSummary() {
    try {
        const response = await fetch('https://kiang.github.io/recall-2025/cunli_json/cunli_summary.json');
        const summaryData = await response.json();
        
        // Store summary data for initial map display
        for (const [villcode, data] of Object.entries(summaryData)) {
            villageData[villcode] = data;
        }
        
        console.log(`Loaded summary data for ${Object.keys(villageData).length} villages`);
        
    } catch (error) {
        console.error('Error loading village summary:', error);
    }
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

// Load GeoJSON and initialize map
async function initializeMap() {
    try {
        // Load village summary data first for fast loading
        await loadVillageSummary();
        
        // Load TopoJSON
        const response = await fetch('https://kiang.github.io/taiwan_basecode/cunli/s_topo/20250620.json');
        const topoData = await response.json();
        
        // Convert TopoJSON to GeoJSON
        // Find the topology object name (usually the first key in objects)
        const objectName = Object.keys(topoData.objects)[0];
        const geoData = topojson.feature(topoData, topoData.objects[objectName]);
        
        // Filter features to only include villages with voting data
        const filteredFeatures = geoData.features.filter(feature => {
            const villcode = feature.properties.VILLCODE;
            return villageData[villcode]; // Only include if we have data
        });
        
        console.log(`Filtered ${geoData.features.length} features to ${filteredFeatures.length} with voting data`);
        
        // Create filtered GeoJSON
        const filteredGeoData = {
            type: "FeatureCollection",
            features: filteredFeatures
        };
        
        // Add GeoJSON layer
        geojson = L.geoJSON(filteredGeoData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);
        
        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        document.getElementById('loading').innerHTML = '載入失敗';
    }
}

// Initialize the map
initializeMap();