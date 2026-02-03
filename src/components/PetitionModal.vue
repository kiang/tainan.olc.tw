<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { useWindowSize } from "@vueuse/core";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

// Google Form base URL
const googleFormBaseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdjxtlIlumA2pIiVpSm_ItW6ebaRhVBcZvj6PpaPUPWOTQGzg/viewform";

// Generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Build Google Form URL with parameters
function buildFormUrl(options = {}) {
  const { county = "no", town = "no", longitude = "no", latitude = "no" } = options;
  const uuid = generateUUID();
  const hasLocation = county !== "no" || town !== "no";
  const locationType = hasLocation ? "有具體地點" : "其他事項";

  const params = new URLSearchParams({
    "usp": "pp_url",
    "entry.1683067847": locationType,
    "entry.8069441": county,
    "entry.329095753": town,
    "entry.878731854": longitude,
    "entry.158869420": latitude,
    "entry.1072963415": uuid,
  });

  return `${googleFormBaseUrl}?${params.toString()}`;
}

const emit = defineEmits(["update:modelValue"]);

const { width } = useWindowSize();

// State
const step = ref("choose"); // choose, map
const mapContainer = ref(null);
let map = null;
let geoJsonLayer = null;
let clickMarker = null;
let geoJsonData = null;

const zoom = computed(() => {
  return width.value <= 576 ? 13 : 14;
});

const center = [23.004582, 120.198];
const geoJsonUrl = "https://tainan.olc.tw/json/cunli.json";

// Style for cunli boundaries - no fill, only borders
const cunliStyle = {
  fillColor: "transparent",
  fillOpacity: 0,
  color: "#999",
  weight: 1,
};

const cunliHoverStyle = {
  fillColor: "transparent",
  fillOpacity: 0,
  color: "#28c8c8",
  weight: 2,
};

function closeModal() {
  emit("update:modelValue", false);
  // Reset state after modal closes
  setTimeout(() => {
    step.value = "choose";
  }, 300);
}

function chooseLocation() {
  step.value = "map";
}

function chooseOther() {
  const formUrl = buildFormUrl();
  window.open(formUrl, "_blank");
  closeModal();
}

function goBackToChoose() {
  step.value = "choose";
  destroyMap();
}

// Find which cunli contains the clicked point
function findCunliAtPoint(latlng) {
  if (!geoJsonData) return null;

  const point = L.latLng(latlng.lat, latlng.lng);

  for (const feature of geoJsonData.features) {
    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
      // Create a temporary layer to use contains check
      const tempLayer = L.geoJSON(feature);
      const bounds = tempLayer.getBounds();

      if (bounds.contains(point)) {
        // More precise check using ray casting
        const coords = feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates[0]
          : feature.geometry.coordinates[0][0];

        if (isPointInPolygon(latlng.lat, latlng.lng, coords)) {
          return feature.properties;
        }
      }
    }
  }
  return null;
}

// Ray casting algorithm to check if point is in polygon
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function handleMapClick(e) {
  const { lat, lng } = e.latlng;

  // Find cunli at this point
  const cunli = findCunliAtPoint(e.latlng);
  const county = cunli?.TOWNNAME || "no";
  const town = cunli?.VILLNAME || "no";
  const locationName = (county !== "no" ? county : "") + (town !== "no" ? town : "") || "選區外";

  // Remove existing marker
  if (clickMarker) {
    map.removeLayer(clickMarker);
  }

  // Add new marker at clicked location
  clickMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: "click-marker",
      html: `<div class="marker-pin"></div>`,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
    }),
  }).addTo(map);

  // Build form URL with location parameters
  const formUrl = buildFormUrl({
    county,
    town,
    longitude: lng.toFixed(6),
    latitude: lat.toFixed(6),
  });

  const popupContent = `
    <div class="location-popup">
      <div class="popup-location">${locationName}</div>
      <div class="popup-coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
      <a href="${formUrl}" target="_blank" rel="noopener" class="popup-form-link">
        前往填寫表單
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5-.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
          <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
        </svg>
      </a>
    </div>
  `;

  clickMarker.bindPopup(popupContent, {
    className: "petition-popup",
    closeButton: false,
    offset: [0, -35],
  }).openPopup();

  // Add click handler to close modal after clicking form link
  setTimeout(() => {
    const formLink = document.querySelector(".popup-form-link");
    if (formLink) {
      formLink.addEventListener("click", () => {
        setTimeout(closeModal, 100);
      });
    }
  }, 0);
}

async function loadGeoJson() {
  if (!map) return;

  try {
    const response = await fetch(geoJsonUrl);
    geoJsonData = await response.json();

    if (geoJsonLayer) {
      map.removeLayer(geoJsonLayer);
    }

    geoJsonLayer = L.geoJSON(geoJsonData, {
      style: () => cunliStyle,
      onEachFeature: (feature, layer) => {
        // Hover effects
        layer.on({
          mouseover: (e) => {
            e.target.setStyle(cunliHoverStyle);
          },
          mouseout: (e) => {
            e.target.setStyle(cunliStyle);
          },
        });

        // Add label
        if (feature.properties.VILLNAME) {
          const center = layer.getBounds().getCenter();
          const label = L.marker(center, {
            icon: L.divIcon({
              className: "petition-village-label",
              html: `<span>${feature.properties.VILLNAME}</span>`,
              iconSize: [100, 20],
              iconAnchor: [50, 10],
            }),
            interactive: false,
          });
          label.addTo(map);
        }
      },
    }).addTo(map);
  } catch (error) {
    console.error("Failed to load GeoJSON:", error);
  }
}

function initMap() {
  if (!mapContainer.value || map) return;

  map = L.map(mapContainer.value, {
    center: center,
    zoom: zoom.value,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  // Handle map clicks
  map.on("click", handleMapClick);

  loadGeoJson();
}

function destroyMap() {
  if (map) {
    map.off("click", handleMapClick);
    map.remove();
    map = null;
    geoJsonLayer = null;
    clickMarker = null;
    geoJsonData = null;
  }
}

// Watch for step changes to initialize/destroy map
watch(step, (newStep) => {
  if (newStep === "map") {
    // Wait for DOM to update
    setTimeout(() => {
      initMap();
    }, 100);
  } else if (newStep !== "map") {
    destroyMap();
  }
});

// Watch for modal visibility
watch(
  () => props.modelValue,
  (isVisible) => {
    if (!isVisible) {
      destroyMap();
    }
  }
);

onUnmounted(() => {
  destroyMap();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="petition-modal-overlay">
        <!-- Choose Step -->
        <div v-if="step === 'choose'" class="petition-modal" @click.stop>
          <div class="modal-header">
            <h2>我要陳情</h2>
            <button class="close-btn" @click="closeModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </div>

          <div class="modal-content">
            <p class="choose-description">請選擇陳情類型：</p>
            <div class="choose-options">
              <button class="choose-option" @click="chooseLocation">
                <div class="option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                  </svg>
                </div>
                <h3>有具體地點</h3>
                <p>在地圖上點選位置</p>
              </button>
              <button class="choose-option" @click="chooseOther">
                <div class="option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                    <path d="M4.5 5.5a.5.5 0 0 0-1 0v5a.5.5 0 0 0 1 0v-5zm7 0a.5.5 0 0 0-1 0v5a.5.5 0 0 0 1 0v-5zm-5 8a.5.5 0 0 0 0-1h-2a.5.5 0 0 0 0 1h2zm4 0a.5.5 0 0 0 0-1h-2a.5.5 0 0 0 0 1h2z"/>
                  </svg>
                </div>
                <h3>其他事項</h3>
                <p>直接填寫陳情表單</p>
              </button>
            </div>
          </div>
        </div>

        <!-- Full Page Map Step -->
        <div v-else-if="step === 'map'" class="petition-fullpage-map">
          <!-- Map Header -->
          <div class="map-header">
            <button class="back-btn" @click="goBackToChoose">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
              </svg>
            </button>
            <h2>選擇地點</h2>
            <button class="close-btn" @click="closeModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </div>

          <!-- Map Container -->
          <div ref="mapContainer" class="petition-map"></div>

          <!-- Map Instruction -->
          <div class="map-instruction">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
            </svg>
            <span>點擊地圖選擇陳情地點</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss">
// Village label styles for petition map
.petition-village-label {
  background: transparent;
  border: none;

  span {
    display: block;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: #666;
    text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white,
      -1px 1px 2px white;
    white-space: nowrap;
  }
}

// Click marker styles
.click-marker {
  background: transparent;
  border: none;

  .marker-pin {
    width: 30px;
    height: 40px;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 24px;
      height: 24px;
      background: #ff6b6b;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: translateX(-50%) rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    &::after {
      content: "";
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
    }
  }
}

// Popup styles
.petition-popup {
  .leaflet-popup-content-wrapper {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    padding: 0;
  }

  .leaflet-popup-content {
    margin: 0;
  }

  .leaflet-popup-tip {
    background: white;
  }
}

.location-popup {
  padding: 12px 16px;
  text-align: center;

  .popup-location {
    font-size: 15px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
  }

  .popup-coords {
    font-size: 12px;
    color: #666;
    font-family: monospace;
    margin-bottom: 10px;
  }

  .popup-form-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #ff6b6b;
    color: white;
    text-decoration: none;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.2s;

    &:hover {
      background: #ee5a5a;
      color: white;
    }

    svg {
      flex-shrink: 0;
    }
  }
}
</style>

<style lang="scss" scoped>
.petition-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.petition-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  gap: 12px;

  h2 {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #333;
  }

  .back-btn,
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: none;
    color: #6c757d;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s;

    &:hover {
      background: #e9ecef;
      color: #333;
    }
  }
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
}

// Choose section
.choose-description {
  margin: 0 0 20px;
  font-size: 15px;
  color: #666;
  text-align: center;
}

.choose-options {
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: 480px) {
    flex-direction: row;
  }
}

.choose-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #28c8c8;
    background: rgba(40, 200, 200, 0.05);

    .option-icon {
      background: #28c8c8;
      color: white;
    }
  }

  .option-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(40, 200, 200, 0.1);
    color: #28c8c8;
    border-radius: 50%;
    margin-bottom: 16px;
    transition: all 0.2s;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 700;
    color: #333;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #666;
    text-align: center;
  }
}

// Full page map
.petition-fullpage-map {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  z-index: 10000;
}

.map-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e9ecef;
  gap: 12px;
  z-index: 1001;

  h2 {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #333;
  }

  .back-btn,
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: none;
    color: #6c757d;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s;

    &:hover {
      background: #e9ecef;
      color: #333;
    }
  }
}

.petition-map {
  flex: 1;
  width: 100%;
}

.map-instruction {
  position: absolute;
  top: 76px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  color: #28c8c8;
  font-size: 14px;
  font-weight: 600;
}

// Modal transitions
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;

  .petition-modal {
    transition: transform 0.3s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .petition-modal {
    transform: scale(0.9);
  }
}

</style>
