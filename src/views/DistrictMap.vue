<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { useWindowSize } from "@vueuse/core";

const isPlay = ref(true);
const isShow = ref(true);

onMounted(() => {
  setTimeout(() => {
    isShow.value = false;
  }, 5000);
});

onMounted(() => {
  enterWindowWidth();
});

const { width, height } = useWindowSize();
const windowInnerWidth = ref(window.innerWidth);
const enterWindowWidth = () => {
  if (windowInnerWidth.value <= 576) {
    zoom.value = 13;
  } else {
    zoom.value = 14;
  }
};

const zoom = ref("");
const zoomChange = computed(() => {
  return `https://tainan.olc.tw/cunli.html#/zoom/${zoom.value}`;
});

watch(width, (newWidth, oldWidth) => {
  if (newWidth <= 576) {
    zoom.value = 13;
  } else {
    zoom.value = 14;
  }
});
</script>

<template>
  <main class="district-map-page">
    <div class="map-page">
      <div
        v-if="isShow"
        :class="{ 'play-animation': isPlay }"
        class="district-instruct-sign"
      >
        <div class="district-text-container">
          <p>點擊地圖查看各區里民資訊</p>
        </div>
        <div class="white-arrow-container">
          <img src="@/assets/images/white-arrow.png" alt="" />
        </div>
      </div>
      <div class="district-map-container">
        <iframe
          class="district-map-iframe"
          :src="zoomChange"
          frameborder="0"
          allowfullscreen
          seamless="seamless"
        ></iframe>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.district-map-page {
  height: calc(100vh - 89.3px);
}
.map-page {
  .district-map-container {
    .district-map-iframe {
      bottom: 0;
      width: 100%;
      height: calc(100vh - 89.3px);

      @media (min-width: 992px) {
        height: calc(100vh - 81.609px);
      }
    }
  }
}

.district-text-container {
  font-size: 16px;
  font-weight: 700;
  color: white;

  @media (min-width: 768px) {
    font-size: 20px;
  }
}

.district-instruct-sign {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;

  position: absolute;
  top: 25%;

  @media (min-width: 576px) {
    top: 15%;
  }

  @media (min-width: 1920px) {
    top: 20%;
  }
}

.play-animation {
  animation-name: bounce;
  animation-duration: 1s;
  animation-iteration-count: infinite;
}

@keyframes bounce {
  from {
    transform: translateY(0px);
    animation-timing-function: ease-out;
  }

  50% {
    transform: translateY(-3px);
    animation-timing-function: ease-in;
  }

  to {
    transform: translateY(0px);
    animation-timing-function: ease-in-out;
  }
}
</style>
