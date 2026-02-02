<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps({
  center: {
    type: Array,
    default: () => [23.004582, 120.198],
  },
  zoom: {
    type: Number,
    default: 14,
  },
  geoJsonUrl: {
    type: String,
    default: "",
  },
  boundaryUrl: {
    type: String,
    default: "",
  },
  mapType: {
    type: String,
    default: "district", // district, lines, points
  },
});

const emit = defineEmits(["featureClick"]);

const mapContainer = ref(null);
let map = null;
let geoJsonLayer = null;
let boundaryLayer = null;

// Color scheme
const colors = {
  primary: "#28c8c8",
  primaryDark: "#1a9a9a",
  boundary: "#50a5a4",
  lineDefault: "#28c8c8",
  lineHover: "#ff6b6b",
  superAged: "rgba(220, 53, 69, 0.5)",
  aged: "rgba(255, 193, 7, 0.5)",
  aging: "rgba(255, 193, 7, 0.3)",
  normal: "rgba(40, 200, 200, 0.2)",
};

// Style functions based on map type
function getFeatureStyle(feature, isHovered = false) {
  if (props.mapType === "district") {
    return getDistrictStyle(feature, isHovered);
  } else if (props.mapType === "lines") {
    return getLineStyle(feature, isHovered);
  }
  return {};
}

// Create marker icon for points
function createPointIcon(count, isHovered = false) {
  const size = Math.min(24 + count * 3, 48);
  const bgColor = isHovered ? "#ff6b6b" : colors.primary;

  return L.divIcon({
    className: "point-marker",
    html: `<div class="marker-content" style="
      width: ${size}px;
      height: ${size}px;
      background: ${bgColor};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: ${size > 36 ? 14 : 12}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function getDistrictStyle(feature, isHovered) {
  const p = feature.properties;
  let fillColor = colors.normal;

  if (p.age_type === "super-aged") {
    fillColor = colors.superAged;
  } else if (p.age_type === "aged") {
    fillColor = colors.aged;
  } else if (p.age_type === "aging") {
    fillColor = colors.aging;
  }

  return {
    fillColor: isHovered ? colors.primary : fillColor,
    fillOpacity: isHovered ? 0.6 : 0.5,
    color: isHovered ? colors.primaryDark : "#333",
    weight: isHovered ? 3 : 1,
  };
}

function getLineStyle(feature, isHovered) {
  return {
    color: isHovered ? colors.lineHover : colors.primary,
    weight: isHovered ? 5 : 3,
    opacity: isHovered ? 1 : 0.8,
  };
}

function getBoundaryStyle() {
  return {
    fillColor: colors.boundary,
    fillOpacity: 0.15,
    color: colors.primaryDark,
    weight: 2,
  };
}

// Format date from ymdh
function formatDate(ymdh) {
  const str = String(ymdh);
  const year = str.substring(0, 4);
  const month = str.substring(4, 6);
  const day = str.substring(6, 8);
  const hour = str.substring(8, 10);
  return `${year}/${month}/${day} ${hour}:00`;
}

// Create popup content
function createPopupContent(feature) {
  const p = feature.properties;

  if (props.mapType === "district") {
    let content = `<div class="map-popup">
      <h4>${p.VILLNAME || "未知"}</h4>`;

    if (p.p_cnt) {
      content += `<p><strong>人口數：</strong>${p.p_cnt.toLocaleString()}</p>`;
    }
    if (p.area) {
      content += `<p><strong>面積：</strong>${p.area.toFixed(2)} km²</p>`;
    }
    if (p.rate_elder) {
      content += `<p><strong>老年人口比例：</strong>${p.rate_elder.toFixed(1)}%</p>`;
    }

    content += `</div>`;
    return content;
  } else if (props.mapType === "lines") {
    let content = `<div class="map-popup">`;

    if (p.ymdh) {
      content += `<p><strong>時間：</strong>${formatDate(p.ymdh)}</p>`;
    }

    if (p.v) {
      content += `<p>
        <a href="https://www.youtube.com/watch?v=${p.v}" target="_blank" rel="noopener" class="video-link">
          觀看影片
        </a>
      </p>`;
    }

    content += `</div>`;
    return content;
  } else if (props.mapType === "points") {
    let content = `<div class="map-popup">
      <h4>${p.key || "未知地點"}</h4>
      <p><strong>街講次數：</strong>${p.count} 次</p>
    </div>`;
    return content;
  }

  return "";
}

async function loadGeoJson() {
  if (!props.geoJsonUrl || !map) return;

  try {
    const response = await fetch(props.geoJsonUrl);
    const data = await response.json();

    if (geoJsonLayer) {
      map.removeLayer(geoJsonLayer);
    }

    // Handle point features differently
    if (props.mapType === "points") {
      geoJsonLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const count = feature.properties.count || 1;
          return L.marker(latlng, {
            icon: createPointIcon(count),
          });
        },
        onEachFeature: (feature, layer) => {
          const popupContent = createPopupContent(feature);
          if (popupContent) {
            layer.bindPopup(popupContent, {
              className: "custom-popup",
            });
          }

          layer.on({
            mouseover: (e) => {
              const count = feature.properties.count || 1;
              e.target.setIcon(createPointIcon(count, true));
            },
            mouseout: (e) => {
              const count = feature.properties.count || 1;
              e.target.setIcon(createPointIcon(count, false));
            },
            click: (e) => {
              emit("featureClick", feature);
            },
          });
        },
      }).addTo(map);
    } else {
      geoJsonLayer = L.geoJSON(data, {
        style: (feature) => getFeatureStyle(feature),
        onEachFeature: (feature, layer) => {
          // Popup
          const popupContent = createPopupContent(feature);
          if (popupContent) {
            layer.bindPopup(popupContent, {
              className: "custom-popup",
            });
          }

          // Hover effects
          layer.on({
            mouseover: (e) => {
              const layer = e.target;
              layer.setStyle(getFeatureStyle(feature, true));
              if (props.mapType === "district") {
                layer.bringToFront();
              }
            },
            mouseout: (e) => {
              const layer = e.target;
              layer.setStyle(getFeatureStyle(feature, false));
            },
            click: (e) => {
              emit("featureClick", feature);
            },
          });

          // Add label for district
          if (props.mapType === "district" && feature.properties.VILLNAME) {
            const center = layer.getBounds().getCenter();
            const label = L.marker(center, {
              icon: L.divIcon({
                className: "village-label",
                html: `<span>${feature.properties.VILLNAME}</span>`,
                iconSize: [100, 20],
                iconAnchor: [50, 10],
              }),
              interactive: true,
            });
            // Add click handler to label
            label.on("click", () => {
              emit("featureClick", feature);
            });
            label.addTo(map);
          }
        },
      }).addTo(map);
    }
  } catch (error) {
    console.error("Failed to load GeoJSON:", error);
  }
}

async function loadBoundary() {
  if (!props.boundaryUrl || !map) return;

  try {
    const response = await fetch(props.boundaryUrl);
    const data = await response.json();

    if (boundaryLayer) {
      map.removeLayer(boundaryLayer);
    }

    boundaryLayer = L.geoJSON(data, {
      style: getBoundaryStyle,
    }).addTo(map);

    // Send to back
    if (geoJsonLayer) {
      boundaryLayer.bringToBack();
    }
  } catch (error) {
    console.error("Failed to load boundary:", error);
  }
}

function initMap() {
  if (!mapContainer.value) return;

  // Create map
  map = L.map(mapContainer.value, {
    center: props.center,
    zoom: props.zoom,
    zoomControl: true,
  });

  // Add tile layer - using OpenStreetMap for clean look
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  // Load data
  loadBoundary();
  loadGeoJson();
}

watch(
  () => props.zoom,
  (newZoom) => {
    if (map) {
      map.setZoom(newZoom);
    }
  }
);

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div ref="mapContainer" class="leaflet-map"></div>
</template>

<style lang="scss">
.leaflet-map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

// Custom popup styles
.custom-popup .leaflet-popup-content-wrapper {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.custom-popup .leaflet-popup-content {
  margin: 0;
}

.custom-popup .leaflet-popup-tip {
  background: white;
}

.map-popup {
  padding: 12px 16px;
  min-width: 150px;

  h4 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 700;
    color: #333;
  }

  p {
    margin: 4px 0;
    font-size: 13px;
    color: #666;
  }

  .video-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: #28c8c8;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.2s;

    &:hover {
      background: #1a9a9a;
    }
  }
}

// Village label styles
.village-label {
  background: transparent;
  border: none;

  span {
    display: block;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: #333;
    text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white,
      -1px 1px 2px white;
    white-space: nowrap;
  }
}

// Point marker styles
.point-marker {
  background: transparent;
  border: none;

  .marker-content {
    cursor: pointer;
  }
}

// Leaflet control customization
.leaflet-control-zoom {
  border: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;

  a {
    background: white !important;
    color: #333 !important;
    border: none !important;

    &:hover {
      background: #f5f5f5 !important;
    }
  }
}

.leaflet-control-attribution {
  background: rgba(255, 255, 255, 0.8) !important;
  font-size: 10px;
}
</style>
