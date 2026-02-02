<script setup>
import { ref, computed } from "vue";
import { useWindowSize } from "@vueuse/core";
import LeafletMap from "@/components/LeafletMap.vue";

const { width } = useWindowSize();

const zoom = computed(() => {
  return width.value <= 576 ? 13 : 14;
});

const center = [23.004582, 120.198];
const geoJsonUrl = "https://tainan.olc.tw/json/cunli.json";
const boundaryUrl = "https://tainan.olc.tw/json/67000-08.json";

function handleFeatureClick(feature) {
  console.log("Feature clicked:", feature.properties);
}
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
    </div>
  </main>
</template>

<style scoped lang="scss">
.district-map-page {
  height: calc(100vh - 89.3px);
  position: relative;

  @media (min-width: 992px) {
    height: calc(100vh - 81.609px);
  }
}

.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
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
</style>
