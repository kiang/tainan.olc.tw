<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { useWindowSize } from "@vueuse/core";

onMounted(() => {
  enterWindowWidth();
});

const { width } = useWindowSize();
const windowInnerWidth = ref(window.innerWidth);
const enterWindowWidth = () => {
  if (windowInnerWidth.value <= 576) {
    zoom.value = 13;
  } else {
    zoom.value = 15;
  }
};

const zoom = ref("");
const zoomChange = computed(() => {
  return `https://tainan.olc.tw/street.html#/zoom/${zoom.value}`;
});

watch(width, (newWidth) => {
  if (newWidth <= 576) {
    zoom.value = 13;
  } else {
    zoom.value = 15;
  }
});
</script>

<template>
  <main class="street-talk-page">
    <div class="map-container">
      <iframe
        class="map-iframe"
        :src="zoomChange"
        frameborder="0"
        allowfullscreen
        seamless="seamless"
      ></iframe>
    </div>
  </main>
</template>

<style scoped lang="scss">
.street-talk-page {
  height: calc(100vh - 89.3px);
}

.map-container {
  .map-iframe {
    width: 100%;
    height: calc(100vh - 89.3px);

    @media (min-width: 992px) {
      height: calc(100vh - 81.609px);
    }
  }
}
</style>
