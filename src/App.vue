<script setup>
import { useRoute } from "vue-router";
import { computed, ref, onMounted, onUnmounted } from "vue";
import Breadcrumb from "@/components/Breadcrumb.vue";
import PetitionModal from "@/components/PetitionModal.vue";

const route = useRoute();
const showBreadcrumb = computed(() => route.name !== "Home");

// Petition modal
const showPetitionModal = ref(false);

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
                  >首頁</RouterLink
                >
              </li>
              <li class="nav-item">
                <button
                  class="nav-link nav-link-petition"
                  @click="showPetitionModal = true"
                >陳情</button>
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
                      $route.name === 'StreetTalk',
                  }"
                  >選區</RouterLink
                >
              </li>
              <li class="nav-item">
                <RouterLink
                  class="nav-link"
                  :to="{
                    name: 'PastWorks',
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
            <button
              class="nav-link nav-link-petition"
              @click="showPetitionModal = true"
            >陳情</button>
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
                  $route.name === 'StreetTalk',
              }"
              >選區</RouterLink
            >
          </li>
          <li class="nav-item">
            <RouterLink
              class="nav-link"
              :to="{
                name: 'PastWorks',
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

  <!-- Petition Modal -->
  <PetitionModal v-model="showPetitionModal" />

  <footer class="site-footer" role="contentinfo">
    <div class="footer-content">
      <div class="footer-social">
        <a href="https://line.me/ti/g2/zjfXeZ3ubQrzsNatxkigsGBiGM6EDfSNVjgihg" target="_blank" rel="noopener" aria-label="LINE 線上服務處" class="social-link line">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0c4.411 0 8 2.912 8 6.492 0 1.433-.555 2.723-1.715 3.994-1.678 1.932-5.431 4.285-6.285 4.645-.83.35-.734-.197-.696-.413l.003-.018.114-.685c.027-.204.055-.521-.026-.723-.09-.223-.444-.339-.704-.395C2.846 12.39 0 9.701 0 6.492 0 2.912 3.59 0 8 0ZM5.022 7.686H3.497V4.918a.156.156 0 0 0-.155-.156H2.78a.156.156 0 0 0-.156.156v3.486c0 .041.017.08.044.107v.001l.002.002.002.002a.154.154 0 0 0 .108.043h2.242c.086 0 .155-.07.155-.156v-.56a.156.156 0 0 0-.155-.157Zm.791-2.924a.156.156 0 0 0-.156.156v3.486c0 .086.07.155.156.155h.562c.086 0 .155-.07.155-.155V4.918a.156.156 0 0 0-.155-.156h-.562Zm3.863 0a.156.156 0 0 0-.156.156v2.07L7.923 4.832a.17.17 0 0 0-.013-.015v-.001a.139.139 0 0 0-.01-.01l-.003-.003a.092.092 0 0 0-.011-.009h-.001L7.88 4.79l-.003-.002a.029.029 0 0 0-.005-.003l-.008-.005h-.002l-.003-.002-.01-.004-.004-.002a.093.093 0 0 0-.01-.003h-.002l-.003-.001-.009-.002h-.006l-.003-.001h-.004l-.002-.001h-.574a.156.156 0 0 0-.156.155v3.486c0 .086.07.155.156.155h.56c.087 0 .157-.07.157-.155v-2.07l1.6 2.16a.154.154 0 0 0 .039.038l.001.001.01.006.004.002a.066.066 0 0 0 .008.004l.007.003.005.002a.168.168 0 0 0 .01.003h.003a.155.155 0 0 0 .04.006h.56c.087 0 .157-.07.157-.155V4.918a.156.156 0 0 0-.156-.156h-.561Zm3.815.717v-.56a.156.156 0 0 0-.155-.157h-2.242a.155.155 0 0 0-.108.044h-.001l-.001.002-.002.003a.155.155 0 0 0-.044.107v3.486c0 .041.017.08.044.107l.002.003.002.002a.155.155 0 0 0 .108.043h2.242c.086 0 .155-.07.155-.156v-.56a.156.156 0 0 0-.155-.157H11.81v-.589h1.525c.086 0 .155-.07.155-.156v-.56a.156.156 0 0 0-.155-.157H11.81v-.589h1.525c.086 0 .155-.07.155-.156Z"/>
          </svg>
        </a>
        <a href="https://facebook.com/k.olc.tw" target="_blank" rel="noopener" aria-label="Facebook">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
          </svg>
        </a>
        <a href="https://www.youtube.com/@FinjonKiang" target="_blank" rel="noopener" aria-label="YouTube">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z"/>
          </svg>
        </a>
        <a href="https://www.instagram.com/finjon_kiang/" target="_blank" rel="noopener" aria-label="Instagram">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
          </svg>
        </a>
        <a href="https://www.threads.net/@finjon_kiang" target="_blank" rel="noopener" aria-label="Threads">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6.321 6.016c-.27-.18-1.166-.802-1.166-.802.756-1.081 1.753-1.502 3.132-1.502.975 0 1.803.327 2.394.948.591.621.928 1.509 1.005 2.644.328.138.63.299.905.484 1.109.745 1.719 1.86 1.719 3.137 0 2.716-2.226 5.075-6.256 5.075C4.594 16 1 13.987 1 7.994 1 2.034 4.482 0 8.044 0 9.69 0 13.55.243 15 5.036l-1.36.353C12.516 1.974 10.163 1.43 8.006 1.43c-3.565 0-5.582 2.171-5.582 6.79 0 4.143 2.254 6.343 5.63 6.343 2.777 0 4.847-1.443 4.847-3.556 0-1.438-1.208-2.127-1.27-2.127-.236 1.234-.868 3.31-3.644 3.31-1.618 0-3.013-1.118-3.013-2.582 0-2.09 1.984-2.847 3.55-2.847.586 0 1.294.04 1.663.114 0-.637-.54-1.728-1.9-1.728-1.25 0-1.566.405-1.967.868ZM8.716 8.19c-2.04 0-2.304.87-2.304 1.416 0 .878 1.043 1.168 1.6 1.168 1.02 0 2.067-.282 2.232-2.423a6.217 6.217 0 0 0-1.528-.161Z"/>
          </svg>
        </a>
        <a href="https://www.tiktok.com/@finjon.kiang" target="_blank" rel="noopener" aria-label="TikTok">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/>
          </svg>
        </a>
        <a href="mailto:service@olc.tw" aria-label="Email">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
          </svg>
        </a>
      </div>
      <p class="footer-copyright">© 2024 江明宗. All rights reserved.</p>
    </div>
  </footer>
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
    background: transparent;
    border: none;
    cursor: pointer;

    &:hover,
    &-hover {
      background-color: #30363a;
      color: white;
    }

    &.router-link-exact-active {
      background-color: #30363a;
      color: white;
    }

    &.nav-link-petition {
      color: #ff6b6b;

      &:hover {
        background-color: #ff6b6b;
        color: white;
      }
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

// Footer
.site-footer {
  background: #1a1a1a;
  padding: 24px 20px;
  text-align: center;

  @media (min-width: 768px) {
    padding: 32px 40px;
  }
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-social {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: #999;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transition: all 0.3s ease;

    &:hover {
      color: white;
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    &.line:hover {
      background: #06c755;
      color: white;
    }
  }
}

.footer-copyright {
  margin: 0;
  font-size: 13px;
  color: #666;
}
</style>
