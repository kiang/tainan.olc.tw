<script setup>
import { ref, computed } from "vue";
import { useWindowSize } from "@vueuse/core";
import LeafletMap from "@/components/LeafletMap.vue";

const { width } = useWindowSize();

const zoom = computed(() => {
  return width.value <= 576 ? 13 : 14;
});

const center = [23.004582, 120.198];
const geoJsonUrl = "https://tainan.olc.tw/json/lines.json";
const boundaryUrl = "https://tainan.olc.tw/json/67000-08.json";

// Video player state
const showPlayer = ref(false);
const currentVideoId = ref("");
const currentDateTime = ref("");

// Format date from ymdh
function formatDate(ymdh) {
  const str = String(ymdh);
  const year = str.substring(0, 4);
  const month = str.substring(4, 6);
  const day = str.substring(6, 8);
  const hour = str.substring(8, 10);
  return `${year}/${month}/${day} ${hour}:00`;
}

function handleFeatureClick(feature) {
  if (feature.properties.v) {
    currentVideoId.value = feature.properties.v;
    currentDateTime.value = feature.properties.ymdh ? formatDate(feature.properties.ymdh) : "";
    showPlayer.value = true;
  }
}

function closePlayer() {
  showPlayer.value = false;
  currentVideoId.value = "";
  currentDateTime.value = "";
}
</script>

<template>
  <main class="street-record-page">
    <div class="map-wrapper">
      <LeafletMap
        :center="center"
        :zoom="zoom"
        :geoJsonUrl="geoJsonUrl"
        :boundaryUrl="boundaryUrl"
        mapType="lines"
        @featureClick="handleFeatureClick"
      />

      <div class="map-info">
        <div class="info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </div>
        <p>點擊路線觀看掃街紀錄影片</p>
      </div>
    </div>

    <!-- Video Player Panel -->
    <Transition name="slide">
      <div v-if="showPlayer" class="video-panel">
        <div class="panel-header">
          <div class="location-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
            </svg>
            <span>{{ currentDateTime || "掃街紀錄" }}</span>
          </div>
          <button class="close-btn" @click="closePlayer" aria-label="關閉">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <div class="video-container" v-if="currentVideoId">
          <iframe
            :src="`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>

        <div class="video-actions">
          <a
            :href="`https://www.youtube.com/watch?v=${currentVideoId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="youtube-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z"/>
            </svg>
            <span>在 YouTube 上觀看</span>
          </a>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped lang="scss">
.street-record-page {
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

// Video Panel
.video-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  z-index: 1001;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    width: 420px;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
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
  background: #252525;
  border-bottom: 1px solid #333;

  .location-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #28c8c8;
    font-size: 14px;
    font-weight: 600;

    svg {
      flex-shrink: 0;
    }

    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
    color: #999;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s;

    &:hover {
      background: #333;
      color: white;
    }
  }
}

.video-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%; // 16:9 aspect ratio
  background: #000;

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

.video-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #252525;

  .youtube-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: #ff0000;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
      background: #cc0000;
    }

    svg {
      flex-shrink: 0;
    }
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
