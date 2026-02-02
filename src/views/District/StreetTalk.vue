<script setup>
import { ref, computed, onMounted } from "vue";
import { useWindowSize } from "@vueuse/core";
import LeafletMap from "@/components/LeafletMap.vue";

const { width } = useWindowSize();

const zoom = computed(() => {
  return width.value <= 576 ? 13 : 15;
});

const center = [23.004582, 120.198];
const geoJsonUrl = "https://tainan.olc.tw/json/youtube.json";
const boundaryUrl = "https://tainan.olc.tw/json/67000-08.json";

// Video player state
const videoList = ref({});
const showPlayer = ref(false);
const currentLocation = ref("");
const currentVideos = ref([]);
const currentVideoIndex = ref(0);

const currentVideo = computed(() => {
  if (currentVideos.value.length > 0 && currentVideoIndex.value < currentVideos.value.length) {
    return currentVideos.value[currentVideoIndex.value];
  }
  return null;
});

// Load video list data
onMounted(async () => {
  try {
    const response = await fetch("https://tainan.olc.tw/json/youtube_list.json");
    videoList.value = await response.json();
  } catch (error) {
    console.error("Failed to load video list:", error);
  }
});

function handleFeatureClick(feature) {
  const locationKey = feature.properties.key;
  if (videoList.value[locationKey]) {
    currentLocation.value = locationKey;
    currentVideos.value = videoList.value[locationKey];
    currentVideoIndex.value = 0;
    showPlayer.value = true;
  }
}

function closePlayer() {
  showPlayer.value = false;
  currentLocation.value = "";
  currentVideos.value = [];
  currentVideoIndex.value = 0;
}

function selectVideo(index) {
  currentVideoIndex.value = index;
}

function prevVideo() {
  if (currentVideoIndex.value > 0) {
    currentVideoIndex.value--;
  }
}

function nextVideo() {
  if (currentVideoIndex.value < currentVideos.value.length - 1) {
    currentVideoIndex.value++;
  }
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
        <p>點擊地點觀看街講影片</p>
      </div>
    </div>

    <!-- Video Player Panel -->
    <Transition name="slide">
      <div v-if="showPlayer" class="video-panel">
        <div class="panel-header">
          <div class="location-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
            </svg>
            <span>{{ currentLocation }}</span>
          </div>
          <button class="close-btn" @click="closePlayer" aria-label="關閉">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <div class="video-container" v-if="currentVideo">
          <iframe
            :src="`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1`"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>

        <div class="video-nav">
          <button
            class="nav-btn"
            @click="prevVideo"
            :disabled="currentVideoIndex === 0"
            aria-label="上一部"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
          <div class="video-counter">
            {{ currentVideoIndex + 1 }} / {{ currentVideos.length }}
          </div>
          <button
            class="nav-btn"
            @click="nextVideo"
            :disabled="currentVideoIndex === currentVideos.length - 1"
            aria-label="下一部"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <div class="video-list">
          <div class="list-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1zm4 0v6h8V1H4zm8 8H4v6h8V9zM1 1v2h2V1H1zm2 3H1v2h2V4zM1 7v2h2V7H1zm2 3H1v2h2v-2zm-2 3v2h2v-2H1zM15 1h-2v2h2V1zm-2 3v2h2V4h-2zm2 3h-2v2h2V7zm-2 3v2h2v-2h-2zm2 3h-2v2h2v-2z"/>
            </svg>
            <span>影片清單</span>
          </div>
          <div class="list-items">
            <button
              v-for="(video, index) in currentVideos"
              :key="video.id"
              class="video-item"
              :class="{ active: index === currentVideoIndex }"
              @click="selectVideo(index)"
            >
              <div class="item-number">{{ index + 1 }}</div>
              <div class="item-info">
                <div class="item-title">{{ video.title }}</div>
              </div>
              <div class="item-play" v-if="index === currentVideoIndex">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped lang="scss">
.street-talk-page {
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

.video-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px;
  background: #252525;

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: #333;
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

  .video-counter {
    font-size: 14px;
    font-weight: 600;
    color: #999;
    min-width: 60px;
    text-align: center;
  }
}

.video-list {
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

.video-item {
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

  .item-play {
    color: #28c8c8;
    display: flex;
    align-items: center;
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
