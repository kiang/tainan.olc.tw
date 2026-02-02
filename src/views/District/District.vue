<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <main class="district-section">
    <div class="district-container">
      <!-- Navigation Tabs -->
      <nav class="tab-nav" aria-label="選區資訊分類">
        <RouterLink
          class="tab-button"
          :to="{ name: 'DistrictMap' }"
          aria-label="選區"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
          </svg>
          <span>選區</span>
        </RouterLink>

        <RouterLink
          class="tab-button"
          :to="{ name: 'StreetRecord' }"
          aria-label="掃街"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/>
          </svg>
          <span>掃街</span>
        </RouterLink>

        <RouterLink
          class="tab-button"
          :to="{ name: 'StreetTalk' }"
          aria-label="街講"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6 1a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H6zm0 1h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
            <path d="M8 4.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM8 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 1a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
          </svg>
          <span>街講</span>
        </RouterLink>
      </nav>

      <!-- Content Area -->
      <div class="content-area">
        <RouterView />
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.district-section {
  min-height: 100vh;
}

.district-container {
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

  @media (min-width: 992px) {
    flex-direction: column;
    width: 160px;
    min-width: 160px;
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
</style>
