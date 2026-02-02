<script setup>
import { computed } from "vue";
import { useWindowSize } from "@vueuse/core";
import LeafletMap from "@/components/LeafletMap.vue";

const { width } = useWindowSize();

const zoom = computed(() => {
  return width.value <= 576 ? 13 : 15;
});

const center = [23.004582, 120.198];
const geoJsonUrl = "https://tainan.olc.tw/json/youtube.json";
const boundaryUrl = "https://tainan.olc.tw/json/67000-08.json";

function handleFeatureClick(feature) {
  console.log("Location clicked:", feature.properties.key);
}
</script>

<template>
  <main class="street-talk-page">
    <div class="map-wrapper">
      <LeafletMap
        :center="center"
        :zoom="zoom"
        :geoJsonUrl="geoJsonUrl"
        :boundaryUrl="boundaryUrl"
        mapType="points"
        @featureClick="handleFeatureClick"
      />
      <div class="map-info">
        <div class="info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </div>
        <p>點擊地點查看街講次數</p>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.street-talk-page {
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
</style>
