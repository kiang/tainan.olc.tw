// Initialize the map
var map;

// Set up the WMTS layer
function setupWMTSLayer() {
    var projection = ol.proj.get('EPSG:3857');
    var projectionExtent = projection.getExtent();
    var size = ol.extent.getWidth(projectionExtent) / 256;
    var resolutions = new Array(20);
    var matrixIds = new Array(20);
    for (var z = 0; z < 20; ++z) {
        resolutions[z] = size / Math.pow(2, z);
        matrixIds[z] = z;
    }

    return new ol.layer.Tile({
        source: new ol.source.WMTS({
            matrixSet: 'EPSG:3857',
            format: 'image/png',
            url: 'https://wmts.nlsc.gov.tw/wmts',
            layer: 'EMAP',
            tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(projectionExtent),
                resolutions: resolutions,
                matrixIds: matrixIds
            }),
            style: 'default',
            wrapX: true,
            attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
        }),
        opacity: 1
    });
}

// Set up the TopoJSON vector layer
function setupTopoJSONLayer() {
    return new ol.layer.Vector({
        source: new ol.source.Vector({
            url: 'https://kiang.github.io/taiwan_basecode/city/topo/20230317.json',
            format: new ol.format.TopoJSON(),
            overlaps: false
        }),
        style: new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.2)'
            }),
            stroke: new ol.style.Stroke({
                color: '#319FD3',
                width: 1
            })
        })
    });
}

// Initialize the map
function initMap() {
    var emapLayer = setupWMTSLayer();
    var topoJSONLayer = setupTopoJSONLayer();

    map = new ol.Map({
        target: 'map',
        layers: [emapLayer, topoJSONLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([120.221507, 23.000694]), // Centered on Tainan
            zoom: 12
        })
    });

    // Add map click event
    map.on('singleclick', function(evt) {
        var coordinate = ol.proj.toLonLat(evt.coordinate);
        var hdms = ol.coordinate.toStringHDMS(coordinate);

        var content = '<p>You clicked here:</p><code>' + hdms + '</code>';
        
        // Check if the click is on a feature from the TopoJSON layer
        var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
            if (layer === topoJSONLayer) {
                return feature;
            }
        });

        if (feature) {
            content += '<p>City: ' + feature.get('COUNTYNAME') + '</p>';
            content += '<p>District: ' + feature.get('TOWNNAME') + '</p>';
        }

        document.getElementById('popup-content').innerHTML = content;
        overlay.setPosition(evt.coordinate);
    });

    // Create an overlay for the popup
    var overlay = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });
    map.addOverlay(overlay);

    // Add a click handler to hide the popup
    document.getElementById('popup-closer').onclick = function() {
        overlay.setPosition(undefined);
        return false;
    };
}

// Initialize the map when the window loads
window.onload = initMap;
