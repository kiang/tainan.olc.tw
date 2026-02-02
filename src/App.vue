<script setup></script>

<template>
  <header>
    <div class="container p-0">
      <nav ref="navbarDesktop" class="navbar-desktop navbar navbar-expand-lg">
        <div class="container-fluid p-0">
          <RouterLink class="navbar-brand candidate-logo" to="/"
            ><img
              src="@/assets/images/navbar-candidate-logo.png"
              alt="navbar-candidate-logo"
          /></RouterLink>
          <div class="collapse navbar-collapse" id="navbarText">
            <ul class="navbar-nav mb-2 mb-lg-0 me-2 mt-2 mt-lg-0">
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
                  >選區里民資料</RouterLink
                >
              </li>

              <li class="nav-item">
                <RouterLink
                  class="nav-link"
                  :to="{
                    name: 'RecordOfStreetMap',
                  }"
                  >掃街紀錄</RouterLink
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
              <li class="nav-item">
                <RouterLink
                  class="nav-link"
                  :to="{
                    name: 'TainanThree',
                  }"
                  >台南三江街講</RouterLink
                >
              </li>
              <li class="nav-item">
                <a
                  target="_blank"
                  class="nav-link"
                  href="https://www.facebook.com/k.olc.tw/"
                  >透過臉書聯絡江明宗</a
                >
              </li>
            </ul>
            <a
              class="navbar-brand party-logo"
              href="https://www.tpp.org.tw/"
              target="_blank"
              ><img
                src="@/assets/images/navbar-party-logo.png"
                alt="navbar-candidate-logo"
            /></a>
          </div>
        </div>
      </nav>
      <nav ref="navbarMobile" class="navbar-mobile navbar">
        <div class="brand-container">
          <RouterLink class="navbar-brand candidate-logo" to="/"
            ><img
              src="@/assets/images/navbar-candidate-logo.png"
              alt="navbar-candidate-logo"
          /></RouterLink>
          <a
            class="navbar-brand party-logo"
            href="https://www.tpp.org.tw/"
            target="_blank"
            ><img
              src="@/assets/images/navbar-party-logo.png"
              alt="navbar-candidate-logo"
          /></a>
        </div>
        <ul class="navbar-nav">
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
              >選區里民資料</RouterLink
            >
          </li>
          <li class="nav-item">
            <RouterLink
              class="nav-link"
              :to="{
                name: 'RecordOfStreetMap',
              }"
              >掃街紀錄</RouterLink
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
          <li class="nav-item">
            <RouterLink
              class="nav-link"
              :to="{
                name: 'TainanThree',
              }"
              >台南三江街講</RouterLink
            >
          </li>
          <li class="nav-item">
            <a
              target="_blank"
              class="nav-link"
              href="https://www.facebook.com/k.olc.tw/"
              >透過臉書聯絡江明宗</a
            >
          </li>
        </ul>
      </nav>
    </div>
  </header>
  <RouterView />
</template>

<style lang="scss" scoped>
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
      justify-content: space-between;
      overflow: auto;

      &::-webkit-scrollbar {
        display: none;
      }

      .nav-item {
        flex-shrink: 0;
      }
    }
  }
}
</style>
