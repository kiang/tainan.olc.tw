<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useWindowSize } from "@vueuse/core";
import LeafletMap from "@/components/LeafletMap.vue";
import Chart from "chart.js/auto";

const { width } = useWindowSize();

const zoom = computed(() => {
  return width.value <= 576 ? 13 : 14;
});

const center = [23.004582, 120.198];
const geoJsonUrl = "https://tainan.olc.tw/json/cunli.json";
const boundaryUrl = "https://tainan.olc.tw/json/67000-08.json";

// Panel state
const showPanel = ref(false);
const loading = ref(false);
const cunliData = ref(null);

// Chart instances
let chart1Instance = null;
let chart2Instance = null;
let chart3Instance = null;

async function handleFeatureClick(feature) {
  const villCode = feature.properties.VILLCODE;
  if (!villCode) return;

  loading.value = true;
  showPanel.value = true;
  destroyCharts();

  try {
    const response = await fetch(`https://tainan.olc.tw/json/cunli/${villCode}.json`);
    if (!response.ok) throw new Error("Data not found");
    cunliData.value = await response.json();
    loading.value = false;

    // Wait for DOM update then render charts
    await nextTick();
    renderCharts();
  } catch (error) {
    console.error("Failed to load cunli data:", error);
    cunliData.value = null;
    loading.value = false;
  }
}

function closePanel() {
  showPanel.value = false;
  cunliData.value = null;
  destroyCharts();
}

function destroyCharts() {
  if (chart1Instance) {
    chart1Instance.destroy();
    chart1Instance = null;
  }
  if (chart2Instance) {
    chart2Instance.destroy();
    chart2Instance = null;
  }
  if (chart3Instance) {
    chart3Instance.destroy();
    chart3Instance = null;
  }
}

function renderCharts() {
  if (!cunliData.value) return;

  destroyCharts();

  const data = cunliData.value;

  // Chart 2: Population Pyramid (horizontal bar)
  const ctx2 = document.getElementById("chart2");
  if (ctx2 && data.chart2) {
    chart2Instance = new Chart(ctx2, {
      type: "bar",
      data: data.chart2,
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "人口金字塔",
            font: { size: 14, weight: "bold" },
          },
          legend: {
            position: "bottom",
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: {
              callback: (val) => Math.abs(val),
            },
          },
          y: {
            stacked: true,
          },
        },
      },
    });
  }

  // Chart 1: Population by age group (stacked bar)
  const ctx1 = document.getElementById("chart1");
  if (ctx1 && data.chart1) {
    chart1Instance = new Chart(ctx1, {
      type: "bar",
      data: data.chart1,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "人口結構變化",
            font: { size: 14, weight: "bold" },
          },
          legend: {
            position: "bottom",
          },
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
          },
        },
      },
    });
  }

  // Chart 3: Birth/Death/Marriage/Divorce (line chart)
  const ctx3 = document.getElementById("chart3");
  if (ctx3 && data.chart3) {
    chart3Instance = new Chart(ctx3, {
      type: "line",
      data: data.chart3,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "人口動態",
            font: { size: 14, weight: "bold" },
          },
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }
}

function getAgeTypeLabel(type) {
  switch (type) {
    case "super-aged":
      return "超高齡社區";
    case "aged":
      return "高齡社區";
    case "aging":
      return "高齡化社區";
    default:
      return "一般社區";
  }
}

function getAgeTypeClass(type) {
  switch (type) {
    case "super-aged":
      return "badge-super-aged";
    case "aged":
      return "badge-aged";
    case "aging":
      return "badge-aging";
    default:
      return "badge-normal";
  }
}

onUnmounted(() => {
  destroyCharts();
});
</script>

<template>
  <main class="district-map-page">
    <div class="map-wrapper">
      <LeafletMap
        :center="center"
        :zoom="zoom"
        :geoJsonUrl="geoJsonUrl"
        :boundaryUrl="boundaryUrl"
        mapType="district"
        @featureClick="handleFeatureClick"
      />
      <div class="map-legend">
        <h4>人口老化程度</h4>
        <div class="legend-item">
          <span class="legend-color super-aged"></span>
          <span>超高齡 (≥20%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color aged"></span>
          <span>高齡 (14-20%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color aging"></span>
          <span>高齡化 (7-14%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color normal"></span>
          <span>一般 (&lt;7%)</span>
        </div>
      </div>

      <div class="map-info">
        <div class="info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </div>
        <p>點擊村里查看人口統計</p>
      </div>
    </div>

    <!-- Data Panel -->
    <Transition name="slide">
      <div v-if="showPanel" class="data-panel">
        <div class="panel-header">
          <div class="location-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
            </svg>
            <span>{{ cunliData?.meta?.area || "載入中..." }}</span>
          </div>
          <button class="close-btn" @click="closePanel" aria-label="關閉">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <div class="panel-content">
          <!-- Loading State -->
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>載入資料中...</p>
          </div>

          <!-- Data Content -->
          <template v-else-if="cunliData">
            <!-- Summary Stats -->
            <div class="stats-section">
              <div class="age-badge" :class="getAgeTypeClass(cunliData.meta?.type)">
                {{ getAgeTypeLabel(cunliData.meta?.type) }}
              </div>

              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-label">總人口</div>
                  <div class="stat-value">{{ cunliData.meta?.people_total?.toLocaleString() }}</div>
                  <div class="stat-diff" :class="{ negative: cunliData.meta?.diff_total?.includes('減少') }">
                    {{ cunliData.meta?.diff_total }}
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">幼年人口</div>
                  <div class="stat-value">{{ cunliData.meta?.people_child?.toLocaleString() }}</div>
                  <div class="stat-diff" :class="{ negative: cunliData.meta?.diff_child?.includes('減少') }">
                    {{ cunliData.meta?.diff_child }}
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">青壯年人口</div>
                  <div class="stat-value">{{ cunliData.meta?.people_adult?.toLocaleString() }}</div>
                  <div class="stat-diff" :class="{ negative: cunliData.meta?.diff_adult?.includes('減少') }">
                    {{ cunliData.meta?.diff_adult }}
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">老年人口</div>
                  <div class="stat-value">{{ cunliData.meta?.people_elder?.toLocaleString() }}</div>
                  <div class="stat-diff" :class="{ negative: cunliData.meta?.diff_elder?.includes('減少') }">
                    {{ cunliData.meta?.diff_elder }}
                  </div>
                </div>
              </div>

              <div class="rate-bars">
                <div class="rate-item">
                  <span class="rate-label">老年人口比例</span>
                  <div class="rate-bar-container">
                    <div
                      class="rate-bar"
                      :style="{ width: `${Math.min(cunliData.meta?.rate_elder || 0, 100)}%` }"
                      :class="getAgeTypeClass(cunliData.meta?.type)"
                    ></div>
                  </div>
                  <span class="rate-value">{{ cunliData.meta?.rate_elder }}%</span>
                </div>
                <div class="rate-item">
                  <span class="rate-label">扶養比</span>
                  <div class="rate-bar-container">
                    <div
                      class="rate-bar badge-normal"
                      :style="{ width: `${Math.min(cunliData.meta?.rate_care || 0, 100)}%` }"
                    ></div>
                  </div>
                  <span class="rate-value">{{ cunliData.meta?.rate_care }}%</span>
                </div>
                <div class="rate-item">
                  <span class="rate-label">老化指數</span>
                  <div class="rate-bar-container">
                    <div
                      class="rate-bar badge-aged"
                      :style="{ width: `${Math.min(cunliData.meta?.rate_old || 0, 100)}%` }"
                    ></div>
                  </div>
                  <span class="rate-value">{{ cunliData.meta?.rate_old }}%</span>
                </div>
              </div>
            </div>

            <!-- Charts -->
            <div class="charts-section">
              <div class="chart-container">
                <canvas id="chart2"></canvas>
              </div>
              <div class="chart-container">
                <canvas id="chart1"></canvas>
              </div>
              <div class="chart-container">
                <canvas id="chart3"></canvas>
              </div>
            </div>
          </template>

          <!-- Error State -->
          <div v-else class="error-state">
            <p>無法載入資料</p>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped lang="scss">
.district-map-page {
  height: calc(100vh - 89.3px);
  position: relative;
  display: flex;

  @media (min-width: 992px) {
    height: calc(100vh - 81.609px);
  }
}

.map-wrapper {
  flex: 1;
  height: 100%;
  position: relative;
}

.map-info {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 10px 16px;
  border-radius: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;

  @media (min-width: 768px) {
    top: 20px;
    padding: 12px 20px;
  }

  .info-icon {
    color: #28c8c8;
    display: flex;
    align-items: center;
  }

  p {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #333;

    @media (min-width: 768px) {
      font-size: 14px;
    }
  }
}

.map-legend {
  position: absolute;
  bottom: 24px;
  left: 12px;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-size: 12px;

  @media (min-width: 768px) {
    bottom: 32px;
    left: 20px;
    padding: 16px 20px;
    font-size: 13px;
  }

  h4 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 700;
    color: #333;

    @media (min-width: 768px) {
      font-size: 14px;
    }
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
    color: #666;
  }

  .legend-color {
    width: 20px;
    height: 14px;
    border-radius: 2px;
    border: 1px solid rgba(0, 0, 0, 0.1);

    &.super-aged {
      background: rgba(220, 53, 69, 0.5);
    }
    &.aged {
      background: rgba(255, 193, 7, 0.5);
    }
    &.aging {
      background: rgba(255, 193, 7, 0.3);
    }
    &.normal {
      background: rgba(40, 200, 200, 0.2);
    }
  }
}

// Data Panel
.data-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: #f8f9fa;
  z-index: 1001;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    width: 420px;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  }

  @media (min-width: 1200px) {
    width: 480px;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e9ecef;

  .location-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #28c8c8;
    font-size: 16px;
    font-weight: 700;

    svg {
      flex-shrink: 0;
    }
  }

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

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6c757d;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e9ecef;
    border-top-color: #28c8c8;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    margin-top: 12px;
    font-size: 14px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// Stats Section
.stats-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.age-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;

  &.badge-super-aged {
    background: rgba(220, 53, 69, 0.15);
    color: #dc3545;
  }
  &.badge-aged {
    background: rgba(255, 193, 7, 0.2);
    color: #856404;
  }
  &.badge-aging {
    background: rgba(255, 193, 7, 0.15);
    color: #856404;
  }
  &.badge-normal {
    background: rgba(40, 200, 200, 0.15);
    color: #1a9a9a;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;

  .stat-label {
    font-size: 12px;
    color: #6c757d;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #333;
  }

  .stat-diff {
    font-size: 11px;
    color: #28a745;
    margin-top: 4px;

    &.negative {
      color: #dc3545;
    }
  }
}

.rate-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rate-item {
  display: flex;
  align-items: center;
  gap: 8px;

  .rate-label {
    width: 90px;
    font-size: 12px;
    color: #6c757d;
    flex-shrink: 0;
  }

  .rate-bar-container {
    flex: 1;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }

  .rate-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;

    &.badge-super-aged {
      background: #dc3545;
    }
    &.badge-aged {
      background: #ffc107;
    }
    &.badge-aging {
      background: #ffc107;
      opacity: 0.7;
    }
    &.badge-normal {
      background: #28c8c8;
    }
  }

  .rate-value {
    width: 45px;
    text-align: right;
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }
}

// Charts Section
.charts-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: 280px;

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
}

// Slide transition
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
