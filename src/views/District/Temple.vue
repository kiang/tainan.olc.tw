<script setup>
import { ref, computed, onMounted } from "vue";
import { useWindowSize } from "@vueuse/core";
import LeafletMap from "@/components/LeafletMap.vue";

const { width } = useWindowSize();

const zoom = computed(() => {
  return width.value <= 576 ? 13 : 15;
});

const center = [23.004582, 120.198];
const geoJsonUrl = "/json/temples.json";
const boundaryUrl = "/json/67000-08.json";

const visitData = ref({});
const showPanel = ref(false);
const currentTemple = ref("");
const currentVisits = ref([]);
const currentVisitIndex = ref(0);
const currentPhotoIndex = ref(0);

const currentVisit = computed(() => {
  if (currentVisits.value.length > 0 && currentVisitIndex.value < currentVisits.value.length) {
    return currentVisits.value[currentVisitIndex.value];
  }
  return null;
});

const currentPhotos = computed(() => {
  return currentVisit.value?.photos || [];
});

const currentPhoto = computed(() => {
  if (currentPhotos.value.length > 0 && currentPhotoIndex.value < currentPhotos.value.length) {
    return currentPhotos.value[currentPhotoIndex.value];
  }
  return null;
});

onMounted(async () => {
  try {
    const response = await fetch("/json/temples_visits.json");
    visitData.value = await response.json();
  } catch (error) {
    console.error("Failed to load temple visit data:", error);
  }
});

function handleFeatureClick(feature) {
  const key = feature.properties.key;
  if (visitData.value[key]) {
    currentTemple.value = key;
    currentVisits.value = visitData.value[key];
    currentVisitIndex.value = 0;
    currentPhotoIndex.value = 0;
    showPanel.value = true;
  }
}

function closePanel() {
  showPanel.value = false;
  currentTemple.value = "";
  currentVisits.value = [];
  currentVisitIndex.value = 0;
  currentPhotoIndex.value = 0;
}

function selectVisit(index) {
  currentVisitIndex.value = index;
  currentPhotoIndex.value = 0;
}

function prevPhoto() {
  if (currentPhotoIndex.value > 0) {
    currentPhotoIndex.value--;
  }
}

function nextPhoto() {
  if (currentPhotoIndex.value < currentPhotos.value.length - 1) {
    currentPhotoIndex.value++;
  }
}
</script>

<template>
  <main class="temple-page">
    <div class="map-wrapper">
      <LeafletMap
        :center="center"
        :zoom="zoom"
        :geoJsonUrl="geoJsonUrl"
        :boundaryUrl="boundaryUrl"
        mapType="temples"
        @featureClick="handleFeatureClick"
      />

      <div class="map-info">
        <div class="info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </div>
        <p>點擊地點查看參訪紀錄</p>
      </div>
    </div>

    <!-- Visit Detail Panel -->
    <Transition name="slide">
      <div v-if="showPanel" class="visit-panel">
        <div class="panel-header">
          <div class="temple-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
            </svg>
            <span>{{ currentTemple }}</span>
          </div>
          <button class="close-btn" @click="closePanel" aria-label="關閉">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <!-- Photo Viewer -->
        <div class="photo-container" v-if="currentPhoto">
          <img :src="currentPhoto" :alt="`${currentTemple} - ${currentVisit?.reason}`" />
          <div class="photo-nav" v-if="currentPhotos.length > 1">
            <button class="photo-nav-btn" @click="prevPhoto" :disabled="currentPhotoIndex === 0" aria-label="上一張">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            </button>
            <div class="photo-counter">{{ currentPhotoIndex + 1 }} / {{ currentPhotos.length }}</div>
            <button class="photo-nav-btn" @click="nextPhoto" :disabled="currentPhotoIndex === currentPhotos.length - 1" aria-label="下一張">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="photo-container photo-placeholder" v-else>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
            <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
          </svg>
          <span>尚無照片</span>
        </div>

        <!-- Current Visit Info -->
        <div class="visit-detail" v-if="currentVisit">
          <div class="detail-row">
            <span class="detail-label">日期</span>
            <span class="detail-value">{{ currentVisit.date }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">事由</span>
            <span class="detail-value">{{ currentVisit.reason }}</span>
          </div>
          <div class="detail-row" v-if="currentVisit.note">
            <span class="detail-label">備註</span>
            <span class="detail-value">{{ currentVisit.note }}</span>
          </div>
        </div>

        <!-- Visit List -->
        <div class="visit-list">
          <div class="list-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
            </svg>
            <span>參訪紀錄 ({{ currentVisits.length }})</span>
          </div>
          <div class="list-items">
            <button
              v-for="(visit, index) in currentVisits"
              :key="index"
              class="visit-item"
              :class="{ active: index === currentVisitIndex }"
              @click="selectVisit(index)"
            >
              <div class="item-number">{{ index + 1 }}</div>
              <div class="item-info">
                <div class="item-title">{{ visit.reason }}</div>
                <div class="item-date">{{ visit.date }}</div>
              </div>
              <div class="item-photos" v-if="visit.photos.length > 0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                  <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
                </svg>
                <span>{{ visit.photos.length }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped lang="scss">
.temple-page {
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

// Visit Panel
.visit-panel {
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

  .temple-info {
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

.photo-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &.photo-placeholder {
    flex-direction: column;
    gap: 8px;
    color: #555;

    span {
      font-size: 14px;
    }
  }
}

.photo-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));

  .photo-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #28c8c8;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .photo-counter {
    font-size: 13px;
    font-weight: 600;
    color: white;
    min-width: 50px;
    text-align: center;
  }
}

.visit-detail {
  padding: 12px 16px;
  background: #252525;
  border-bottom: 1px solid #333;

  .detail-row {
    display: flex;
    gap: 12px;
    padding: 4px 0;

    .detail-label {
      font-size: 13px;
      font-weight: 600;
      color: #999;
      min-width: 36px;
    }

    .detail-value {
      font-size: 13px;
      color: #ddd;
    }
  }
}

.visit-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .list-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #252525;
    border-top: 1px solid #333;
    color: #999;
    font-size: 13px;
    font-weight: 600;
  }

  .list-items {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #1a1a1a;
    }

    &::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 3px;

      &:hover {
        background: #555;
      }
    }
  }
}

.visit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: #2a2a2a;
  }

  &.active {
    background: rgba(40, 200, 200, 0.15);

    .item-number {
      background: #28c8c8;
      color: white;
    }

    .item-title {
      color: #28c8c8;
    }
  }

  .item-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: #333;
    color: #999;
    font-size: 12px;
    font-weight: 700;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    font-size: 13px;
    color: #ddd;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-date {
    font-size: 11px;
    color: #888;
    margin-top: 2px;
  }

  .item-photos {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #888;
    font-size: 12px;
    flex-shrink: 0;
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
