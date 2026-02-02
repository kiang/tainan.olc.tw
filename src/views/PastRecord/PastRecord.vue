<script setup>
import { RouterLink, RouterView } from "vue-router";
import { ref, onMounted, onUnmounted } from "vue";

const showScrollTop = ref(false);

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleScroll() {
  showScrollTop.value = window.scrollY > 300;
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <main class="past-record-page">
    <div class="past-record-container">
      <!-- Navigation Tabs -->
      <nav class="tab-nav" aria-label="過去成績分類">
        <RouterLink
          class="tab-button"
          :to="{ name: 'PastWorks' }"
          aria-label="科技創作"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z"/>
            <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z"/>
          </svg>
          <span>科技創作</span>
        </RouterLink>

        <RouterLink
          class="tab-button"
          :to="{ name: 'SpeechRecord' }"
          aria-label="演講紀錄"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
          <span>演講紀錄</span>
        </RouterLink>

        <RouterLink
          class="tab-button"
          :to="{ name: 'RelatedNews' }"
          aria-label="相關新聞"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 2.5A1.5 1.5 0 0 1 1.5 1h11A1.5 1.5 0 0 1 14 2.5v10.528c0 .3-.05.654-.238.972h.738a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 1 1 0v9a1.5 1.5 0 0 1-1.5 1.5H1.497A1.497 1.497 0 0 1 0 13.5v-11zM12 14c.37 0 .654-.211.853-.441.092-.106.147-.279.147-.531V2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v11c0 .278.223.5.497.5H12z"/>
            <path d="M2 3h10v2H2V3zm0 3h4v3H2V6zm0 4h4v1H2v-1zm0 2h4v1H2v-1zm5-6h2v1H7V6zm3 0h2v1h-2V6zM7 8h2v1H7V8zm3 0h2v1h-2V8zm-3 2h2v1H7v-1zm3 0h2v1h-2v-1zm-3 2h2v1H7v-1zm3 0h2v1h-2v-1z"/>
          </svg>
          <span>相關新聞</span>
        </RouterLink>
      </nav>

      <!-- Content Area -->
      <div class="content-area">
        <RouterView />
      </div>
    </div>

    <!-- Scroll to Top Button -->
    <button
      v-show="showScrollTop"
      @click="scrollTop"
      class="scroll-top-btn"
      aria-label="回到頂部"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/>
      </svg>
      <span>Top</span>
    </button>
  </main>
</template>

<style lang="scss" scoped>
.past-record-page {
  min-height: 100vh;
}

.past-record-container {
  display: flex;
  flex-direction: column;
  width: 100%;

  @media (min-width: 992px) {
    flex-direction: row;
    align-items: flex-start;
  }
}

// Navigation Tabs
.tab-nav {
  display: flex;
  gap: 0;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  @media (min-width: 992px) {
    flex-direction: column;
    width: 200px;
    min-width: 200px;
    border-bottom: none;
    border-right: 1px solid #e9ecef;
    background: white;
    position: sticky;
    top: 0;
    padding: 20px 0;
    gap: 4px;
  }
}

.tab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  flex: 1;

  @media (min-width: 992px) {
    justify-content: flex-start;
    padding: 14px 24px;
    font-size: 15px;
    border-bottom: none;
    border-left: 3px solid transparent;
    flex: none;
  }

  svg {
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  &:hover {
    color: #28c8c8;
    background: rgba(40, 200, 200, 0.05);

    svg {
      opacity: 1;
    }
  }

  &.router-link-exact-active {
    color: #28c8c8;
    background: rgba(40, 200, 200, 0.08);
    border-bottom-color: #28c8c8;

    @media (min-width: 992px) {
      border-bottom-color: transparent;
      border-left-color: #28c8c8;
    }

    svg {
      opacity: 1;
    }
  }
}

// Content Area
.content-area {
  flex: 1;
  min-width: 0;
}

// Scroll to Top Button
.scroll-top-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 56px;
  height: 56px;
  background: #28c8c8;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(40, 200, 200, 0.4);
  transition: all 0.2s;
  z-index: 100;

  span {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }

  &:hover {
    background: #1a9a9a;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(40, 200, 200, 0.5);
  }

  &:active {
    transform: translateY(0);
  }

  @media (min-width: 992px) {
    bottom: 32px;
    right: 32px;
  }
}
</style>
