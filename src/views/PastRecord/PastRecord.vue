<script setup>
import { RouterLink, RouterView } from "vue-router";

function scrollTop() {
  window.scrollTo(0, 0);
}
</script>

<template>
  <main class="past-works-page">
    <div class="past-record-container">
      <div class="toggle-box">
        <RouterLink
          class="toggle-button"
          :to="{
            name: 'SpeechRecord',
          }"
          >演講紀錄</RouterLink
        >

        <RouterLink
          class="toggle-button"
          :to="{
            name: 'PastWorks',
          }"
          >過去作品</RouterLink
        >

        <RouterLink
          class="toggle-button"
          :to="{
            name: 'RelatedNews',
          }"
          >相關新聞</RouterLink
        >
      </div>
      <RouterView />
    </div>
  </main>

  <span @click="scrollTop" class="top"
    >Top<svg
      xmlns="http://www.w3.org/2000/svg"
      width="25"
      height="25"
      fill="currentColor"
      class="bi bi-arrow-up-short"
      viewBox="0 0 16 16"
    >
      <path
        fill-rule="evenodd"
        d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"
      /></svg
  ></span>
</template>

<style lang="scss" scoped>
@import "@/assets/scss/layout/past-record-page";
@import "@/assets/scss/components/sticky-notes";
@import "@/assets/scss/components/tags";
@import "@/assets/scss/components/buttons";

.past-record-container .toggle-box .toggle-button {
  &.router-link-exact-active {
    color: #fff;
    background-color: #a7ced4;
    border: 5px solid #e3eaea;
  }
}
</style>
