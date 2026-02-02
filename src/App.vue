<script setup>
import { useRoute } from "vue-router";
import { computed, ref, onMounted, onUnmounted } from "vue";
import Breadcrumb from "@/components/Breadcrumb.vue";

const route = useRoute();
const showBreadcrumb = computed(() => route.name !== "Home");

// Mobile nav scroll indicators
const navbarMobile = ref(null);

const updateScrollIndicators = () => {
  const nav = navbarMobile.value;
  if (!nav) return;

  const navList = nav.querySelector('.navbar-nav');
  if (!navList) return;

  const canScrollLeft = navList.scrollLeft > 0;
  const canScrollRight = navList.scrollLeft < navList.scrollWidth - navList.clientWidth - 1;

  nav.classList.toggle('can-scroll-left', canScrollLeft);
  nav.classList.toggle('can-scroll-right', canScrollRight);
};

onMounted(() => {
  const nav = navbarMobile.value;
  if (nav) {
    const navList = nav.querySelector('.navbar-nav');
    if (navList) {
      navList.addEventListener('scroll', updateScrollIndicators, { passive: true });
      // Initial check
      setTimeout(updateScrollIndicators, 100);
    }
  }
  window.addEventListener('resize', updateScrollIndicators, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollIndicators);
});
</script>

<template>
  <!-- Skip to content link for keyboard users -->
  <a href="#main-content" class="skip-link">跳到主要內容</a>

  <header role="banner">
    <div class="container p-0">
      <nav ref="navbarDesktop" class="navbar-desktop navbar navbar-expand-lg" aria-label="主要導覽列">
        <div class="container-fluid p-0">
          <RouterLink class="navbar-brand candidate-logo" to="/" aria-label="江明宗 - 回到首頁"
            ><img
              src="@/assets/images/navbar-candidate-logo.png"
              alt="江明宗競選標誌"
          /></RouterLink>
          <div class="collapse navbar-collapse" id="navbarText">
            <ul class="navbar-nav mb-2 mb-lg-0 me-2 mt-2 mt-lg-0" role="menubar">
              <li class="nav-item">
                <RouterLink
                  class="nav-link"
                  :to="{
                    name: 'Home',
                  }"
                  >誰是江明宗</RouterLink
                >
              </li>
              <li class="nav-item">
                <RouterLink
                  class="nav-link"
                  :to="{
                    name: 'Politics',
                  }"
                  >政見</RouterLink
                >
              </li>
              <li class="nav-item">
                <RouterLink
                  class="nav-link"
                  :to="{
                    name: 'DistrictMap',
                  }"
                  :class="{
                    'router-link-exact-active':
                      $route.name === 'DistrictMap' ||
                      $route.name === 'StreetRecord' ||
                      $route.name === 'TainanThree',
                  }"
                  >選區</RouterLink
                >
              </li>
              <li class="nav-item">
                <RouterLink
                  class="nav-link"
                  :to="{
                    name: 'SpeechRecord',
                  }"
                  :class="{
                    'router-link-exact-active':
                      $route.name === 'SpeechRecord' ||
                      $route.name === 'PastWorks' ||
                      $route.name === 'RelatedNews',
                  }"
                  >過往紀錄</RouterLink
                >
              </li>
              <li class="nav-item" role="none">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  class="nav-link"
                  href="https://www.facebook.com/k.olc.tw/"
                  role="menuitem"
                  aria-label="透過臉書聯絡江明宗 (開啟新視窗)"
                  >透過臉書聯絡江明宗</a
                >
              </li>
            </ul>
            <a
              class="navbar-brand party-logo"
              href="https://www.tpp.org.tw/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="台灣民眾黨官方網站 (開啟新視窗)"
              ><img
                src="@/assets/images/navbar-party-logo.png"
                alt="台灣民眾黨標誌"
            /></a>
          </div>
        </div>
      </nav>
      <nav ref="navbarMobile" class="navbar-mobile navbar" aria-label="行動版導覽列">
        <div class="brand-container">
          <RouterLink class="navbar-brand candidate-logo" to="/" aria-label="江明宗 - 回到首頁"
            ><img
              src="@/assets/images/navbar-candidate-logo.png"
              alt="江明宗競選標誌"
          /></RouterLink>
          <a
            class="navbar-brand party-logo"
            href="https://www.tpp.org.tw/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="台灣民眾黨官方網站 (開啟新視窗)"
            ><img
              src="@/assets/images/navbar-party-logo.png"
              alt="台灣民眾黨標誌"
          /></a>
        </div>
        <ul class="navbar-nav" role="menubar">
          <li class="nav-item">
            <RouterLink
              class="nav-link"
              :to="{
                name: 'Home',
              }"
              >誰是江明宗</RouterLink
            >
          </li>
          <li class="nav-item">
            <RouterLink
              class="nav-link"
              :to="{
                name: 'Politics',
              }"
              >政見</RouterLink
            >
            
          </li>
          <li class="nav-item">
            <RouterLink
              class="nav-link"
              :to="{
                name: 'DistrictMap',
              }"
              :class="{
                'router-link-exact-active':
                  $route.name === 'DistrictMap' ||
                  $route.name === 'StreetRecord' ||
                  $route.name === 'TainanThree',
              }"
              >選區</RouterLink
            >
          </li>
          <li class="nav-item">
            <RouterLink
              class="nav-link"
              :to="{
                name: 'SpeechRecord',
              }"
              :class="{
                'router-link-exact-active':
                  $route.name === 'SpeechRecord' ||
                  $route.name === 'PastWorks' ||
                  $route.name === 'RelatedNews',
              }"
              >過往紀錄</RouterLink
            >
          </li>
          <li class="nav-item" role="none">
            <a
              target="_blank"
              rel="noopener noreferrer"
              class="nav-link"
              href="https://www.facebook.com/k.olc.tw/"
              role="menuitem"
              aria-label="透過臉書聯絡江明宗 (開啟新視窗)"
              >透過臉書聯絡江明宗</a
            >
          </li>
        </ul>
      </nav>
    </div>
  </header>
  <Breadcrumb v-if="showBreadcrumb" />
  <main id="main-content" role="main">
    <RouterView />
  </main>
</template>

<style lang="scss" scoped>
// Skip link for keyboard navigation (accessibility)
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #28c8c8;
  color: white;
  padding: 8px 16px;
  z-index: 9999;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 4px 0;
  transition: top 0.2s;

  &:focus {
    top: 0;
  }
}

.container {
  max-width: 1920px;
}

header {
  // 一起的設定
  background-color: $header;

  .container .navbar-nav .nav-link {
    font-weight: 700;
    font-size: 14px;
    color: black;
    padding: 10px 15px;

    &:hover,
    &-hover {
      background-color: #30363a;
      color: white;
    }

    &.router-link-exact-active {
      background-color: #30363a;
      color: white;
    }

    @media (min-width: 992px) {
      padding: 15px 20px;
      font-size: 18px;
    }
  }

  .navbar-brand {
    margin: 0;
    padding: 0;
    display: inline-block;

    img {
      object-fit: contain;
      height: 100%;
    }

    .candidate-logo {
      width: 130px;
    }

    .party-logo {
      @media (min-width: 992px) {
        display: inline-block;
      }
    }
  }

  .navbar-desktop {
    display: none;
    @media (min-width: 992px) {
      display: flex;
    }

    background-color: $header;
    padding: 12.31px 40.37px;

    .navbar-brand {
      height: 56px;
    }

    .navbar-collapse {
      justify-content: end;
    }
  }

  // 手機的設定
  .navbar-mobile {
    display: block;
    position: relative;

    @media (min-width: 992px) {
      display: none;
    }

    &.navbar {
      padding: 0;
    }

    .brand-container {
      display: flex;
      justify-content: space-between;
      padding: 9.15px 12.18px;

      .navbar-brand {
        height: 30px;
      }
    }

    .navbar-nav {
      flex-direction: row;
      justify-content: flex-start;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch; // Smooth scrolling on iOS
      scroll-behavior: smooth;
      scroll-snap-type: x proximity;
      padding: 0 8px;

      // Hide scrollbar but keep functionality
      scrollbar-width: none; // Firefox
      -ms-overflow-style: none; // IE/Edge

      &::-webkit-scrollbar {
        display: none; // Chrome/Safari
      }

      .nav-item {
        flex-shrink: 0;
        scroll-snap-align: start;
      }

      .nav-link {
        white-space: nowrap;
        padding: 12px 14px; // Larger touch targets
        min-height: 44px; // iOS accessibility minimum
        display: flex;
        align-items: center;
      }
    }

    // Scroll fade indicators
    &::before,
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      width: 24px;
      height: 44px;
      pointer-events: none;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &::before {
      left: 0;
      background: linear-gradient(to right, $header 30%, transparent);
    }

    &::after {
      right: 0;
      background: linear-gradient(to left, $header 30%, transparent);
    }

    // Show indicators when content is scrollable
    &.can-scroll-left::before,
    &.can-scroll-right::after {
      opacity: 1;
    }
  }
}
</style>
