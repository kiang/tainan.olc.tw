// Initialize the map
const map = L.map('map').setView([23.9739, 120.9876], 7);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Initialize sidebar
const sidebar = L.control.sidebar('sidebar').addTo(map);

// Layer groups for different alert types
const alertLayers = {};
let alertsData = [];
let aggregatedData = {};
let currentView = 'aggregated'; // 'aggregated' or 'detailed'
let currentTitle = null;

// Taiwan-hosted proxy for CAP data
const PROXY_URL = 'https://proxy.olc.tw/';
const CAP_FEED_URL = 'https://alerts.ncdr.nat.gov.tw/RssAtomFeeds.ashx';

// Function to parse CAP XML
function parseCapXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const alerts = [];
    const entries = xmlDoc.getElementsByTagName('entry');
    
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        
        // Extract basic information
        const alert = {
            id: getTextContent(entry, 'id'),
            title: getTextContent(entry, 'title'),
            updated: getTextContent(entry, 'updated'),
            summary: getTextContent(entry, 'summary'),
            sender: getTextContent(entry, 'cap:sender'),
            sent: getTextContent(entry, 'cap:sent'),
            status: getTextContent(entry, 'cap:status'),
            msgType: getTextContent(entry, 'cap:msgType'),
            scope: getTextContent(entry, 'cap:scope'),
            category: getTextContent(entry, 'cap:category'),
            event: getTextContent(entry, 'cap:event'),
            urgency: getTextContent(entry, 'cap:urgency'),
            severity: getTextContent(entry, 'cap:severity'),
            certainty: getTextContent(entry, 'cap:certainty'),
            effective: getTextContent(entry, 'cap:effective'),
            expires: getTextContent(entry, 'cap:expires'),
            senderName: getTextContent(entry, 'cap:senderName'),
            headline: getTextContent(entry, 'cap:headline'),
            description: getTextContent(entry, 'cap:description'),
            web: getTextContent(entry, 'cap:web'),
            areaDesc: getTextContent(entry, 'cap:areaDesc'),
            polygon: getTextContent(entry, 'cap:polygon'),
            circle: getTextContent(entry, 'cap:circle'),
            geocode: extractGeocode(entry),
            capLink: extractCapLink(entry)
        };
        
        alerts.push(alert);
    }
    
    return alerts;
}

// Helper function to get text content
function getTextContent(parent, tagName) {
    const elem = parent.getElementsByTagName(tagName)[0];
    return elem ? elem.textContent : '';
}

// Helper function to extract geocode
function extractGeocode(entry) {
    const geocode = {};
    const geocodeElems = entry.getElementsByTagName('cap:geocode');
    
    for (let i = 0; i < geocodeElems.length; i++) {
        const valueNameElem = geocodeElems[i].getElementsByTagName('cap:valueName')[0];
        const valueElem = geocodeElems[i].getElementsByTagName('cap:value')[0];
        
        if (valueNameElem && valueElem) {
            geocode[valueNameElem.textContent] = valueElem.textContent;
        }
    }
    
    return geocode;
}

// Helper function to extract CAP link
function extractCapLink(entry) {
    // Look for link elements with type application/cap+xml
    const linkElems = entry.getElementsByTagName('link');
    for (let i = 0; i < linkElems.length; i++) {
        const link = linkElems[i];
        const type = link.getAttribute('type');
        const href = link.getAttribute('href');
        
        if (type === 'application/cap+xml' && href) {
            return href;
        }
    }
    
    // Fallback: look for any link element
    if (linkElems.length > 0) {
        const href = linkElems[0].getAttribute('href');
        if (href) {
            return href;
        }
    }
    
    return null;
}

// Function to fetch individual CAP XML data
async function fetchCapDetails(capLink) {
    if (!capLink) {
        return null;
    }
    
    try {
        const response = await fetch(PROXY_URL + '?url=' + encodeURIComponent(capLink));
        if (!response.ok) {
            throw new Error('Failed to fetch CAP data');
        }
        
        const xmlText = await response.text();
        return parseCapDetails(xmlText);
    } catch (error) {
        console.error('Error fetching CAP details:', error);
        return null;
    }
}

// Function to parse detailed CAP XML structure
function parseCapDetails(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Get the alert element
    const alertElem = xmlDoc.getElementsByTagName('alert')[0];
    if (!alertElem) {
        return null;
    }
    
    const capDetails = {
        identifier: getTextContent(alertElem, 'identifier'),
        sender: getTextContent(alertElem, 'sender'),
        sent: getTextContent(alertElem, 'sent'),
        status: getTextContent(alertElem, 'status'),
        msgType: getTextContent(alertElem, 'msgType'),
        scope: getTextContent(alertElem, 'scope'),
        restriction: getTextContent(alertElem, 'restriction'),
        addresses: getTextContent(alertElem, 'addresses'),
        code: getTextContent(alertElem, 'code'),
        note: getTextContent(alertElem, 'note'),
        references: getTextContent(alertElem, 'references'),
        incidents: getTextContent(alertElem, 'incidents'),
        info: []
    };
    
    // Parse info elements
    const infoElems = alertElem.getElementsByTagName('info');
    for (let i = 0; i < infoElems.length; i++) {
        const infoElem = infoElems[i];
        
        const info = {
            language: getTextContent(infoElem, 'language'),
            category: getTextContent(infoElem, 'category'),
            event: getTextContent(infoElem, 'event'),
            responseType: getTextContent(infoElem, 'responseType'),
            urgency: getTextContent(infoElem, 'urgency'),
            severity: getTextContent(infoElem, 'severity'),
            certainty: getTextContent(infoElem, 'certainty'),
            audience: getTextContent(infoElem, 'audience'),
            eventCode: extractEventCode(infoElem),
            effective: getTextContent(infoElem, 'effective'),
            onset: getTextContent(infoElem, 'onset'),
            expires: getTextContent(infoElem, 'expires'),
            senderName: getTextContent(infoElem, 'senderName'),
            headline: getTextContent(infoElem, 'headline'),
            description: getTextContent(infoElem, 'description'),
            instruction: getTextContent(infoElem, 'instruction'),
            web: getTextContent(infoElem, 'web'),
            contact: getTextContent(infoElem, 'contact'),
            parameter: extractParameters(infoElem),
            resource: extractResources(infoElem),
            area: extractAreas(infoElem)
        };
        
        capDetails.info.push(info);
    }
    
    return capDetails;
}

// Helper function to extract event codes
function extractEventCode(infoElem) {
    const eventCode = {};
    const eventCodeElems = infoElem.getElementsByTagName('eventCode');
    
    for (let i = 0; i < eventCodeElems.length; i++) {
        const valueNameElem = eventCodeElems[i].getElementsByTagName('valueName')[0];
        const valueElem = eventCodeElems[i].getElementsByTagName('value')[0];
        
        if (valueNameElem && valueElem) {
            eventCode[valueNameElem.textContent] = valueElem.textContent;
        }
    }
    
    return eventCode;
}

// Helper function to extract parameters
function extractParameters(infoElem) {
    const parameters = {};
    const paramElems = infoElem.getElementsByTagName('parameter');
    
    for (let i = 0; i < paramElems.length; i++) {
        const valueNameElem = paramElems[i].getElementsByTagName('valueName')[0];
        const valueElem = paramElems[i].getElementsByTagName('value')[0];
        
        if (valueNameElem && valueElem) {
            parameters[valueNameElem.textContent] = valueElem.textContent;
        }
    }
    
    return parameters;
}

// Helper function to extract resources
function extractResources(infoElem) {
    const resources = [];
    const resourceElems = infoElem.getElementsByTagName('resource');
    
    for (let i = 0; i < resourceElems.length; i++) {
        const resourceElem = resourceElems[i];
        const resource = {
            resourceDesc: getTextContent(resourceElem, 'resourceDesc'),
            mimeType: getTextContent(resourceElem, 'mimeType'),
            size: getTextContent(resourceElem, 'size'),
            uri: getTextContent(resourceElem, 'uri'),
            derefUri: getTextContent(resourceElem, 'derefUri'),
            digest: getTextContent(resourceElem, 'digest')
        };
        resources.push(resource);
    }
    
    return resources;
}

// Helper function to extract areas
function extractAreas(infoElem) {
    const areas = [];
    const areaElems = infoElem.getElementsByTagName('area');
    
    for (let i = 0; i < areaElems.length; i++) {
        const areaElem = areaElems[i];
        const area = {
            areaDesc: getTextContent(areaElem, 'areaDesc'),
            polygon: getTextContent(areaElem, 'polygon'),
            circle: getTextContent(areaElem, 'circle'),
            geocode: extractAreaGeocode(areaElem),
            altitude: getTextContent(areaElem, 'altitude'),
            ceiling: getTextContent(areaElem, 'ceiling')
        };
        areas.push(area);
    }
    
    return areas;
}

// Helper function to extract area geocode
function extractAreaGeocode(areaElem) {
    const geocode = {};
    const geocodeElems = areaElem.getElementsByTagName('geocode');
    
    for (let i = 0; i < geocodeElems.length; i++) {
        const valueNameElem = geocodeElems[i].getElementsByTagName('valueName')[0];
        const valueElem = geocodeElems[i].getElementsByTagName('value')[0];
        
        if (valueNameElem && valueElem) {
            geocode[valueNameElem.textContent] = valueElem.textContent;
        }
    }
    
    return geocode;
}

// Function to aggregate alerts by title
function aggregateAlerts(alerts) {
    const aggregated = {};
    
    alerts.forEach(alert => {
        const title = alert.title || alert.event || '未知警報';
        
        if (!aggregated[title]) {
            aggregated[title] = {
                title: title,
                alerts: [],
                count: 0,
                maxSeverity: 'Unknown',
                lastUpdate: null
            };
        }
        
        aggregated[title].alerts.push(alert);
        aggregated[title].count++;
        
        // Update max severity
        const severityLevels = {
            'Unknown': 0,
            'Minor': 1,
            'Moderate': 2,
            'Severe': 3,
            'Extreme': 4
        };
        
        if (severityLevels[alert.severity] > severityLevels[aggregated[title].maxSeverity]) {
            aggregated[title].maxSeverity = alert.severity;
        }
        
        // Update last update time
        const alertTime = new Date(alert.updated || alert.sent);
        if (!aggregated[title].lastUpdate || alertTime > aggregated[title].lastUpdate) {
            aggregated[title].lastUpdate = alertTime;
        }
    });
    
    return aggregated;
}

// Function to get severity color
function getSeverityColor(severity) {
    const colors = {
        'Extreme': '#d73027',
        'Severe': '#fc8d59',
        'Moderate': '#fee08b',
        'Minor': '#d9ef8b',
        'Unknown': '#999'
    };
    return colors[severity] || colors['Unknown'];
}

// Function to create map layers from alerts
function createMapLayers(alerts) {
    // Clear existing layers
    Object.values(alertLayers).forEach(layer => {
        map.removeLayer(layer);
    });
    
    alerts.forEach((alert, index) => {
        let layer = null;
        
        // Handle polygon data
        if (alert.polygon) {
            const coordPairs = alert.polygon.trim().split(' ');
            const coordinates = coordPairs.map(pair => {
                const [lat, lon] = pair.split(',').map(Number);
                return [lat, lon];
            });
            
            if (coordinates.length > 3) {
                layer = L.polygon(coordinates, {
                    color: getSeverityColor(alert.severity),
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.3
                });
            }
        }
        
        // Handle circle data
        if (alert.circle) {
            const [coords, radiusKm] = alert.circle.split(' ');
            const [lat, lon] = coords.split(',').map(Number);
            const radiusMeters = parseFloat(radiusKm) * 1000;
            
            layer = L.circle([lat, lon], {
                color: getSeverityColor(alert.severity),
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3,
                radius: radiusMeters
            });
        }
        
        if (layer) {
            layer.alertData = alert;
            layer.alertIndex = index;
            
            // Add popup
            const popupContent = `
                <div>
                    <h4>${alert.headline || alert.event || alert.title}</h4>
                    <p><strong>發布單位：</strong>${alert.senderName || alert.sender}</p>
                    <p><strong>嚴重程度：</strong>${translateSeverity(alert.severity)}</p>
                    <p><strong>影響區域：</strong>${alert.areaDesc || '未指定'}</p>
                </div>
            `;
            layer.bindPopup(popupContent);
            
            // Add click event
            layer.on('click', function() {
                showAlertDetails(alert, index);
            });
            
            alertLayers[alert.id] = layer;
            layer.addTo(map);
        }
    });
    
    // Fit map to show all alerts
    if (alerts.length > 0) {
        const group = new L.featureGroup(Object.values(alertLayers));
        if (group.getBounds().isValid()) {
            map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
    }
}

// Function to display aggregated alerts in sidebar
function displayAggregatedAlerts(aggregated) {
    const container = document.getElementById('sidebar-content');
    
    const titles = Object.keys(aggregated);
    if (titles.length === 0) {
        container.innerHTML = '<div class="error">目前無警報資訊</div>';
        return;
    }
    
    const lastUpdate = new Date().toLocaleString('zh-TW');
    let html = `<div class="last-update">最後更新：${lastUpdate}</div>`;
    
    // Sort by severity and then by update time
    titles.sort((a, b) => {
        const severityOrder = { 'Extreme': 4, 'Severe': 3, 'Moderate': 2, 'Minor': 1, 'Unknown': 0 };
        const aSeverity = severityOrder[aggregated[a].maxSeverity];
        const bSeverity = severityOrder[aggregated[b].maxSeverity];
        
        if (aSeverity !== bSeverity) {
            return bSeverity - aSeverity;
        }
        
        return aggregated[b].lastUpdate - aggregated[a].lastUpdate;
    });
    
    titles.forEach(title => {
        const group = aggregated[title];
        const severityClass = `alert-severity-${group.maxSeverity}`;
        const updateTime = group.lastUpdate ? group.lastUpdate.toLocaleString('zh-TW') : '';
        
        html += `
            <div class="alert-group ${severityClass}" data-title="${title}">
                <h4>${title}</h4>
                <div class="count">${group.count} 個警報</div>
                <div class="last-update">最後更新：${updateTime}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.alert-group').forEach(item => {
        item.addEventListener('click', function() {
            const title = this.getAttribute('data-title');
            showTitleDetails(title);
        });
    });
}

// Function to show details for a specific title
function showTitleDetails(title) {
    currentView = 'detailed';
    currentTitle = title;
    
    const group = aggregatedData[title];
    const container = document.getElementById('sidebar-content');
    
    let html = `
        <button class="back-button" onclick="showAggregatedView()">← 返回警報列表</button>
        <h3>${title}</h3>
        <div class="count">${group.count} 個警報</div>
        <hr>
    `;
    
    // Sort alerts by update time
    const sortedAlerts = [...group.alerts].sort((a, b) => {
        const aTime = new Date(a.updated || a.sent);
        const bTime = new Date(b.updated || b.sent);
        return bTime - aTime;
    });
    
    sortedAlerts.forEach((alert, index) => {
        const severityClass = `alert-severity-${alert.severity || 'Unknown'}`;
        const effective = alert.effective ? new Date(alert.effective).toLocaleString('zh-TW') : '';
        
        html += `
            <div class="alert-item ${severityClass}" data-alert-id="${alert.id}">
                <h5>${alert.headline || alert.event || alert.title}</h5>
                <div class="sender">${alert.senderName || alert.sender}</div>
                <div class="effective">發布時間：${effective}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add click handlers for individual alerts
    container.querySelectorAll('.alert-item').forEach(item => {
        item.addEventListener('click', function() {
            const alertId = this.getAttribute('data-alert-id');
            const alert = alertsData.find(a => a.id === alertId);
            if (alert) {
                showAlertDetails(alert);
            }
        });
    });
    
    // Show only alerts for this title on map
    const titleAlerts = group.alerts;
    createMapLayers(titleAlerts);
}

// Function to show aggregated view
function showAggregatedView() {
    currentView = 'aggregated';
    currentTitle = null;
    displayAggregatedAlerts(aggregatedData);
    createMapLayers(alertsData);
}

// Make showAggregatedView globally accessible
window.showAggregatedView = showAggregatedView;

// Function to show alert details
async function showAlertDetails(alert) {
    const container = document.getElementById('sidebar-content');
    
    // Show loading state
    container.innerHTML = `
        <button class="back-button" onclick="showTitleDetails('${currentTitle}')" style="margin-right: 10px;">← 返回 ${currentTitle}</button>
        <button class="back-button" onclick="showAggregatedView()">← 返回警報列表</button>
        <div class="loading">載入詳細資料中...</div>
    `;
    
    // Fetch detailed CAP data
    let capDetails = null;
    if (alert.capLink) {
        capDetails = await fetchCapDetails(alert.capLink);
    }
    
    // Use detailed data if available, otherwise use RSS data
    const detailInfo = capDetails && capDetails.info.length > 0 ? capDetails.info[0] : null;
    
    const effective = (detailInfo?.effective || alert.effective) ? 
        new Date(detailInfo?.effective || alert.effective).toLocaleString('zh-TW') : '';
    const expires = (detailInfo?.expires || alert.expires) ? 
        new Date(detailInfo?.expires || alert.expires).toLocaleString('zh-TW') : '';
    const onset = detailInfo?.onset ? 
        new Date(detailInfo.onset).toLocaleString('zh-TW') : '';
    
    let html = `
        <button class="back-button" onclick="showTitleDetails('${currentTitle}')" style="margin-right: 10px;">← 返回 ${currentTitle}</button>
        <button class="back-button" onclick="showAggregatedView()">← 返回警報列表</button>
        <div class="alert-details">
            <h3>${detailInfo?.headline || alert.headline || alert.event || alert.title}</h3>
            <p><strong>發布單位：</strong>${detailInfo?.senderName || alert.senderName || alert.sender}</p>
            <p><strong>嚴重程度：</strong>${translateSeverity(detailInfo?.severity || alert.severity)}</p>
            <p><strong>緊急程度：</strong>${translateUrgency(detailInfo?.urgency || alert.urgency)}</p>
            <p><strong>確定性：</strong>${translateCertainty(detailInfo?.certainty || alert.certainty)}</p>
            <p><strong>事件類型：</strong>${detailInfo?.event || alert.event || '未指定'}</p>
            <p><strong>回應類型：</strong>${translateResponseType(detailInfo?.responseType)}</p>
            <p><strong>生效時間：</strong>${effective}</p>
            ${onset ? `<p><strong>開始時間：</strong>${onset}</p>` : ''}
            <p><strong>失效時間：</strong>${expires}</p>
            <p><strong>目標受眾：</strong>${detailInfo?.audience || '一般大眾'}</p>
    `;
    
    // Display area information
    if (detailInfo?.area && detailInfo.area.length > 0) {
        html += `<p><strong>影響區域：</strong></p><ul>`;
        detailInfo.area.forEach(area => {
            html += `<li>${area.areaDesc || '未指定區域'}`;
            if (area.geocode && Object.keys(area.geocode).length > 0) {
                html += `<br><small>地理編碼：${Object.entries(area.geocode).map(([k, v]) => `${k}: ${v}`).join(', ')}</small>`;
            }
            html += `</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<p><strong>影響區域：</strong>${alert.areaDesc || '未指定'}</p>`;
    }
    
    // Display description and instruction
    const description = detailInfo?.description || alert.description;
    const instruction = detailInfo?.instruction;
    
    if (description) {
        html += `<div class="description"><strong>描述：</strong><br>${description}</div>`;
    }
    
    if (instruction) {
        html += `<div class="description"><strong>指示：</strong><br>${instruction}</div>`;
    }
    
    // Display parameters if available
    if (detailInfo?.parameter && Object.keys(detailInfo.parameter).length > 0) {
        html += `<div class="description"><strong>參數：</strong><br>`;
        Object.entries(detailInfo.parameter).forEach(([key, value]) => {
            html += `<p><strong>${key}:</strong> ${value}</p>`;
        });
        html += `</div>`;
    }
    
    // Display event codes if available
    if (detailInfo?.eventCode && Object.keys(detailInfo.eventCode).length > 0) {
        html += `<div class="description"><strong>事件代碼：</strong><br>`;
        Object.entries(detailInfo.eventCode).forEach(([key, value]) => {
            html += `<p><strong>${key}:</strong> ${value}</p>`;
        });
        html += `</div>`;
    }
    
    // Display resources if available
    if (detailInfo?.resource && detailInfo.resource.length > 0) {
        html += `<div class="description"><strong>相關資源：</strong><br>`;
        detailInfo.resource.forEach(resource => {
            if (resource.uri) {
                html += `<p><a href="${resource.uri}" target="_blank">${resource.resourceDesc || '資源連結'}</a></p>`;
            }
        });
        html += `</div>`;
    }
    
    // Display web link
    const webLink = detailInfo?.web || alert.web;
    if (webLink) {
        html += `<p><a href="${webLink}" target="_blank">詳細資訊連結</a></p>`;
    }
    
    // Display contact information
    if (detailInfo?.contact) {
        html += `<p><strong>聯絡資訊：</strong>${detailInfo.contact}</p>`;
    }
    
    // Display CAP link if available
    if (alert.capLink) {
        html += `<p><a href="${alert.capLink}" target="_blank">CAP 原始資料</a></p>`;
    }
    
    html += `</div>`;
    
    container.innerHTML = html;
    
    // Update map with detailed area information if available
    if (capDetails && detailInfo?.area) {
        updateMapWithDetailedAreas(alert, detailInfo.area);
    } else {
        // Zoom to the alert area if it has geometry
        const alertLayer = alertLayers[alert.id];
        if (alertLayer) {
            if (alertLayer.getBounds && alertLayer.getBounds().isValid()) {
                map.fitBounds(alertLayer.getBounds(), { padding: [20, 20] });
            } else if (alertLayer.getLatLng) {
                map.setView(alertLayer.getLatLng(), 10);
            }
        }
    }
}

// Make showTitleDetails globally accessible
window.showTitleDetails = showTitleDetails;

// Function to update map with detailed area information
function updateMapWithDetailedAreas(alert, areas) {
    // Remove existing layer for this alert
    if (alertLayers[alert.id]) {
        map.removeLayer(alertLayers[alert.id]);
    }
    
    const layerGroup = [];
    
    areas.forEach(area => {
        let layer = null;
        
        // Handle polygon data
        if (area.polygon) {
            const coordPairs = area.polygon.trim().split(' ');
            const coordinates = coordPairs.map(pair => {
                const [lat, lon] = pair.split(',').map(Number);
                return [lat, lon];
            });
            
            if (coordinates.length > 3) {
                layer = L.polygon(coordinates, {
                    color: getSeverityColor(alert.severity),
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.3
                });
            }
        }
        
        // Handle circle data
        if (area.circle) {
            const [coords, radiusKm] = area.circle.split(' ');
            const [lat, lon] = coords.split(',').map(Number);
            const radiusMeters = parseFloat(radiusKm) * 1000;
            
            layer = L.circle([lat, lon], {
                color: getSeverityColor(alert.severity),
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3,
                radius: radiusMeters
            });
        }
        
        if (layer) {
            // Add popup with area information
            const popupContent = `
                <div>
                    <h4>${alert.headline || alert.event || alert.title}</h4>
                    <p><strong>影響區域：</strong>${area.areaDesc || '未指定'}</p>
                    ${area.geocode && Object.keys(area.geocode).length > 0 ? 
                        `<p><strong>地理編碼：</strong>${Object.entries(area.geocode).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>` : ''}
                </div>
            `;
            layer.bindPopup(popupContent);
            
            layerGroup.push(layer);
            layer.addTo(map);
        }
    });
    
    // Store the layer group
    if (layerGroup.length > 0) {
        alertLayers[alert.id] = layerGroup.length === 1 ? layerGroup[0] : L.layerGroup(layerGroup);
        
        // Fit map to show all areas
        const group = new L.featureGroup(layerGroup);
        if (group.getBounds().isValid()) {
            map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
    }
}

// Translation functions
function translateSeverity(severity) {
    const translations = {
        'Extreme': '非常嚴重',
        'Severe': '嚴重',
        'Moderate': '中等',
        'Minor': '輕微',
        'Unknown': '未知'
    };
    return translations[severity] || severity;
}

function translateUrgency(urgency) {
    const translations = {
        'Immediate': '立即',
        'Expected': '預期',
        'Future': '未來',
        'Past': '過去',
        'Unknown': '未知'
    };
    return translations[urgency] || urgency;
}

function translateCertainty(certainty) {
    const translations = {
        'Observed': '已觀測到',
        'Likely': '很可能',
        'Possible': '可能',
        'Unlikely': '不太可能',
        'Unknown': '未知'
    };
    return translations[certainty] || certainty;
}

function translateResponseType(responseType) {
    const translations = {
        'Shelter': '避難',
        'Evacuate': '疏散',
        'Prepare': '準備',
        'Execute': '執行',
        'Avoid': '避免',
        'Monitor': '監視',
        'Assess': '評估',
        'AllClear': '解除警報',
        'None': '無'
    };
    return translations[responseType] || responseType || '未指定';
}

// Function to load alerts
async function loadAlerts() {
    const container = document.getElementById('sidebar-content');
    container.innerHTML = '<div class="loading">載入中...</div>';
    
    try {
        const response = await fetch(PROXY_URL + '?url=' + encodeURIComponent(CAP_FEED_URL));
        if (!response.ok) {
            throw new Error('無法載入資料');
        }
        
        const xmlText = await response.text();
        alertsData = parseCapXML(xmlText);
        aggregatedData = aggregateAlerts(alertsData);
        
        displayAggregatedAlerts(aggregatedData);
        createMapLayers(alertsData);
        
    } catch (error) {
        console.error('Error loading alerts:', error);
        container.innerHTML = `<div class="error">載入失敗：${error.message}</div>
                              <button onclick="loadAlerts()" style="margin-top: 10px;">重試</button>`;
    }
}

// Auto-refresh every 5 minutes
setInterval(loadAlerts, 5 * 60 * 1000);

// Initial load
sidebar.open('alerts');
loadAlerts();