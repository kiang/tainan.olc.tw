<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import politicsData from "@/data/politics.json";

const activeSection = ref("intro");
const sidebarOpen = ref(false);

const { sections, hero, intro, walkingCity, techGovernance, culturalHeritage, declaration, videos } = politicsData;

function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    const offset = 80;
    const top = element.offsetTop - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
  sidebarOpen.value = false;
}

function handleScroll() {
  const scrollPosition = window.scrollY + 120;

  for (let i = sections.length - 1; i >= 0; i--) {
    const section = document.getElementById(sections[i].id);
    if (section && section.offsetTop <= scrollPosition) {
      activeSection.value = sections[i].id;
      break;
    }
  }
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll);
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <main class="politics-page">
    <!-- Mobile Nav Toggle -->
    <button class="nav-toggle" @click="sidebarOpen = !sidebarOpen" :class="{ active: sidebarOpen }">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <!-- Navigation Sidebar -->
    <nav class="politics-nav" :class="{ open: sidebarOpen }">
      <div class="nav-header">
        <span class="nav-label">章節導覽</span>
      </div>
      <ul class="nav-list">
        <li v-for="section in sections" :key="section.id">
          <a
            :href="'#' + section.id"
            :class="{ active: activeSection === section.id }"
            @click.prevent="scrollToSection(section.id)"
          >
            {{ section.label }}
          </a>
        </li>
      </ul>
    </nav>

    <!-- Main Content -->
    <div class="politics-content">
      <!-- Hero Section -->
      <section id="intro" class="hero-section">
        <div class="hero-content">
          <span class="hero-label">{{ hero.label }}</span>
          <h1 v-html="hero.title"></h1>
          <p class="hero-description">{{ hero.description }}</p>
        </div>
        <div class="hero-decoration">
          <div class="decoration-circle circle-1"></div>
          <div class="decoration-circle circle-2"></div>
          <div class="decoration-circle circle-3"></div>
        </div>
      </section>

      <!-- Introduction -->
      <section class="intro-section">
        <div class="container">
          <div class="intro-card">
            <h2>{{ intro.title }}</h2>
            <p v-for="(paragraph, index) in intro.paragraphs" :key="index" v-html="paragraph"></p>
          </div>
        </div>
      </section>

      <!-- Policy 1: Walking City -->
      <section id="walking-city" class="policy-section">
        <div class="container">
          <div class="section-header">
            <span class="section-number">{{ walkingCity.number }}</span>
            <div class="section-title-group">
              <h2>{{ walkingCity.title }}</h2>
              <p class="section-subtitle">{{ walkingCity.subtitle }}</p>
            </div>
          </div>

          <article class="policy-article">
            <div class="policy-icon-badge walking-city">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.5 4a.5.5 0 0 1 .5.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H6a2 2 0 1 1-4 0h-.5A1.5 1.5 0 0 1 0 10.5v-5A1.5 1.5 0 0 1 1.5 4h10zM2.5 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
              </svg>
            </div>

            <div class="chapter" v-for="(chapter, cIndex) in walkingCity.chapters" :key="cIndex">
              <h3>{{ chapter.title }}</h3>
              <p v-for="(paragraph, pIndex) in chapter.paragraphs" :key="pIndex" v-html="paragraph"></p>
            </div>

            <div class="chapter">
              <h3>具體策略</h3>

              <div class="strategy-block" v-for="(strategy, sIndex) in walkingCity.strategies" :key="sIndex">
                <div class="strategy-header">
                  <div class="strategy-icon" :class="strategy.icon">{{ strategy.letter }}</div>
                  <h4>{{ strategy.title }}</h4>
                </div>
                <div class="strategy-content">
                  <p>{{ strategy.intro }}</p>
                  <ul>
                    <li v-for="(item, iIndex) in strategy.items" :key="iIndex">
                      <strong>{{ item.title }}：</strong>{{ item.content }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Policy 2: Tech Governance -->
      <section id="tech-governance" class="policy-section">
        <div class="container">
          <div class="section-header">
            <span class="section-number">{{ techGovernance.number }}</span>
            <div class="section-title-group">
              <h2>{{ techGovernance.title }}</h2>
              <p class="section-subtitle">{{ techGovernance.subtitle }}</p>
            </div>
          </div>

          <article class="policy-article">
            <div class="policy-icon-badge tech-governance">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5 0a.5.5 0 0 1 .5.5V2h1V.5a.5.5 0 0 1 1 0V2h1V.5a.5.5 0 0 1 1 0V2h1V.5a.5.5 0 0 1 1 0V2A2.5 2.5 0 0 1 14 4.5h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14a2.5 2.5 0 0 1-2.5 2.5v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14A2.5 2.5 0 0 1 2 11.5H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2A2.5 2.5 0 0 1 4.5 2V.5A.5.5 0 0 1 5 0zm-.5 3A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 11.5 3h-7zM5 6.5A1.5 1.5 0 0 1 6.5 5h3A1.5 1.5 0 0 1 11 6.5v3A1.5 1.5 0 0 1 9.5 11h-3A1.5 1.5 0 0 1 5 9.5v-3zM6.5 6a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
              </svg>
            </div>

            <div class="chapter">
              <h3>{{ techGovernance.background.title }}</h3>
              <p v-html="techGovernance.background.intro"></p>
              <ul class="achievement-list">
                <li v-for="(achievement, aIndex) in techGovernance.background.achievements" :key="aIndex">
                  <strong>{{ achievement.title }}：</strong>{{ achievement.content }}
                </li>
              </ul>
              <p v-html="techGovernance.background.conclusion"></p>
            </div>

            <div class="chapter">
              <h3>{{ techGovernance.pillars.title }}</h3>

              <div class="governance-grid">
                <div class="governance-item" v-for="(pillar, pIndex) in techGovernance.pillars.items" :key="pIndex">
                  <div class="governance-icon">
                    <svg v-if="pIndex === 0" xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
                    </svg>
                    <svg v-else-if="pIndex === 1" xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                    </svg>
                    <svg v-else-if="pIndex === 2" xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                      <path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                      <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
                    </svg>
                  </div>
                  <h4>{{ pillar.title }}</h4>
                  <p class="governance-subtitle">{{ pillar.subtitle }}</p>
                  <p>{{ pillar.content }}</p>
                </div>
              </div>
            </div>

            <div class="chapter">
              <h3>{{ techGovernance.monitoring.title }}</h3>
              <p>{{ techGovernance.monitoring.intro }}</p>
              <ul>
                <li v-for="(item, mIndex) in techGovernance.monitoring.items" :key="mIndex">
                  <strong>{{ item.title }}：</strong>{{ item.content }}
                </li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <!-- Policy 3: Cultural Heritage -->
      <section id="cultural-heritage" class="policy-section">
        <div class="container">
          <div class="section-header">
            <span class="section-number">{{ culturalHeritage.number }}</span>
            <div class="section-title-group">
              <h2>{{ culturalHeritage.title }}</h2>
              <p class="section-subtitle">{{ culturalHeritage.subtitle }}</p>
            </div>
          </div>

          <article class="policy-article">
            <div class="policy-icon-badge cultural-heritage">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.5 10c-.276 0-.5-.448-.5-1s.224-1 .5-1 .5.448.5 1-.224 1-.5 1z"/>
                <path d="M10.828.122A.5.5 0 0 1 11 .5V1h.5A1.5 1.5 0 0 1 13 2.5V15h1.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1H3V1.5a.5.5 0 0 1 .43-.495l7-1a.5.5 0 0 1 .398.117zM11.5 2H11v13h1V2.5a.5.5 0 0 0-.5-.5zM4 1.934V15h6V1.077l-6 .857z"/>
              </svg>
            </div>

            <div class="chapter">
              <h3>{{ culturalHeritage.challenges.title }}</h3>
              <p v-html="culturalHeritage.challenges.intro"></p>
              <ul>
                <li v-for="(item, cIndex) in culturalHeritage.challenges.items" :key="cIndex">
                  <strong>{{ item.title }}：</strong>{{ item.content }}
                </li>
              </ul>
              <p>{{ culturalHeritage.challenges.conclusion }}</p>
            </div>

            <div class="chapter">
              <h3>{{ culturalHeritage.strategies.title }}</h3>

              <div class="heritage-items">
                <div class="heritage-item" v-for="(strategy, sIndex) in culturalHeritage.strategies.items" :key="sIndex">
                  <div class="heritage-number">{{ strategy.number }}</div>
                  <div class="heritage-content">
                    <h4>{{ strategy.title }}</h4>
                    <p v-for="(paragraph, pIndex) in strategy.paragraphs" :key="pIndex" v-html="paragraph"></p>
                    <ul>
                      <li v-for="(item, iIndex) in strategy.items" :key="iIndex">
                        <template v-if="typeof item === 'string'">{{ item }}</template>
                        <template v-else><strong>{{ item.title }}：</strong>{{ item.content }}</template>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Declaration Section -->
      <section id="declaration" class="declaration-section">
        <div class="container">
          <div class="section-header">
            <span class="section-number">{{ declaration.number }}</span>
            <div class="section-title-group">
              <h2>{{ declaration.title }}</h2>
              <p class="section-subtitle">{{ declaration.subtitle }}</p>
            </div>
          </div>

          <div class="declaration-card">
            <div class="declaration-content">
              <p v-for="(paragraph, pIndex) in declaration.paragraphs" :key="pIndex">{{ paragraph }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Video Section -->
      <section id="videos" class="video-section">
        <div class="container">
          <div class="section-header">
            <span class="section-number">{{ videos.number }}</span>
            <div class="section-title-group">
              <h2>{{ videos.title }}</h2>
              <p class="section-subtitle">{{ videos.subtitle }}</p>
            </div>
          </div>

          <div class="video-grid">
            <div class="video-card" v-for="(video, vIndex) in videos.items" :key="vIndex">
              <div class="video-wrapper">
                <iframe
                  :src="video.url"
                  :title="video.title"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>
              <h3>{{ video.title }}</h3>
            </div>
          </div>

          <div class="more-videos-link" v-if="videos.moreLink">
            <a :href="videos.moreLink.url" target="_blank" rel="noopener">
              {{ videos.moreLink.text }}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      <!-- Policy Image -->
      <section class="policy-image-section">
        <div class="container">
          <img
            src="@/assets/images/politics.jpg"
            alt="政見圖"
            class="policy-image"
          />
        </div>
      </section>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.politics-page {
  min-height: calc(100vh - 89.3px);
  background: #f8f9fa;
  display: flex;

  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
}

// Mobile Nav Toggle
.nav-toggle {
  position: fixed;
  top: 100px;
  left: 16px;
  z-index: 1001;
  width: 44px;
  height: 44px;
  background: white;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.3s ease;

  @media (min-width: 1024px) {
    display: none;
  }

  span {
    display: block;
    width: 20px;
    height: 2px;
    background: #333;
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  &.active {
    background: #28c8c8;

    span {
      background: white;

      &:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
      }

      &:nth-child(2) {
        opacity: 0;
      }

      &:nth-child(3) {
        transform: rotate(-45deg) translate(5px, -5px);
      }
    }
  }
}

// Navigation Sidebar
.politics-nav {
  position: fixed;
  top: 0;
  left: -280px;
  width: 260px;
  height: 100vh;
  background: white;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 100px 0 40px;
  transition: left 0.3s ease;
  overflow-y: auto;

  &.open {
    left: 0;
  }

  @media (min-width: 1024px) {
    position: sticky;
    top: 80px;
    left: 0;
    height: calc(100vh - 80px);
    flex-shrink: 0;
    box-shadow: none;
    border-right: 1px solid #e9ecef;
    padding-top: 40px;
  }
}

.nav-header {
  padding: 0 24px 20px;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 20px;
}

.nav-label {
  font-size: 12px;
  font-weight: 700;
  color: #28c8c8;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    margin: 0;
  }

  a {
    display: block;
    padding: 14px 24px;
    color: #666;
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;

    &:hover {
      color: #28c8c8;
      background: rgba(40, 200, 200, 0.05);
    }

    &.active {
      color: #28c8c8;
      background: rgba(40, 200, 200, 0.08);
      border-left-color: #28c8c8;
      font-weight: 600;
    }
  }
}

// Main Content
.politics-content {
  flex: 1;
  min-width: 0;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;

  @media (min-width: 1024px) {
    padding: 0 40px;
  }
}

.hide-mobile {
  display: none;
  @media (min-width: 768px) {
    display: inline;
  }
}

// Hero Section
.hero-section {
  position: relative;
  background: linear-gradient(135deg, #28c8c8 0%, #1a8a8a 100%);
  padding: 60px 20px;
  text-align: center;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 80px 40px;
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 700px;
  margin: 0 auto;
}

.hero-label {
  display: inline-block;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 30px;
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.hero-section h1 {
  color: white;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 20px;

  @media (min-width: 768px) {
    font-size: 48px;
  }
}

.hero-description {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  line-height: 1.8;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 18px;
  }
}

.hero-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);

  &.circle-1 {
    width: 300px;
    height: 300px;
    top: -100px;
    right: -100px;
  }

  &.circle-2 {
    width: 200px;
    height: 200px;
    bottom: -50px;
    left: -50px;
  }

  &.circle-3 {
    width: 150px;
    height: 150px;
    top: 50%;
    left: 10%;
    opacity: 0.5;
  }
}

// Intro Section
.intro-section {
  padding: 60px 0;

  @media (min-width: 768px) {
    padding: 80px 0;
  }
}

.intro-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    padding: 40px;
  }

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin: 0 0 24px;

    @media (min-width: 768px) {
      font-size: 28px;
    }
  }

  p {
    font-size: 16px;
    line-height: 2;
    color: #444;
    margin: 0 0 20px;

    &:last-child {
      margin-bottom: 0;
    }

    :deep(strong) {
      color: #28c8c8;
    }

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }
}

// Section Header
.section-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;

  .section-number {
    font-size: 48px;
    font-weight: 800;
    color: rgba(40, 200, 200, 0.2);
    line-height: 1;
    flex-shrink: 0;

    @media (min-width: 768px) {
      font-size: 64px;
    }
  }

  .section-title-group {
    padding-top: 8px;

    @media (min-width: 768px) {
      padding-top: 16px;
    }
  }

  h2 {
    font-size: 28px;
    font-weight: 700;
    color: #333;
    margin: 0 0 8px;

    @media (min-width: 768px) {
      font-size: 32px;
    }
  }

  .section-subtitle {
    font-size: 15px;
    color: #666;
    margin: 0;
  }
}

// Policy Section
.policy-section {
  padding: 60px 0;
  border-top: 1px solid #e9ecef;

  @media (min-width: 768px) {
    padding: 80px 0;
  }
}

// Policy Article
.policy-article {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    padding: 40px;
  }
}

.policy-icon-badge {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  margin-bottom: 24px;

  &.walking-city {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  &.tech-governance {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    color: white;
  }

  &.cultural-heritage {
    background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
    color: white;
  }
}

// Chapter
.chapter {
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid #e9ecef;

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  h3 {
    font-size: 20px;
    font-weight: 700;
    color: #333;
    margin: 0 0 20px;
    padding-left: 16px;
    border-left: 4px solid #28c8c8;

    @media (min-width: 768px) {
      font-size: 22px;
    }
  }

  p {
    font-size: 16px;
    line-height: 2;
    color: #444;
    margin: 0 0 16px;

    &:last-child {
      margin-bottom: 0;
    }

    :deep(strong) {
      color: #28c8c8;
    }

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }

  ul {
    margin: 16px 0;
    padding-left: 24px;

    li {
      font-size: 16px;
      line-height: 1.9;
      color: #444;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      strong {
        color: #333;
      }

      @media (min-width: 768px) {
        font-size: 17px;
      }
    }
  }
}

.achievement-list {
  li {
    margin-bottom: 16px;
  }
}

// Strategy Block
.strategy-block {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  @media (min-width: 768px) {
    padding: 28px;
  }
}

.strategy-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.strategy-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;

  &.bus {
    background: #667eea;
  }

  &.bike {
    background: #764ba2;
  }

  &.walk {
    background: #9b59b6;
  }
}

.strategy-header h4 {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.strategy-content {
  p {
    font-size: 15px;
    line-height: 1.9;
    color: #555;
    margin: 0 0 16px;

    @media (min-width: 768px) {
      font-size: 16px;
    }
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      font-size: 15px;
      line-height: 1.8;
      color: #555;
      margin-bottom: 10px;

      &:last-child {
        margin-bottom: 0;
      }

      strong {
        color: #333;
      }

      @media (min-width: 768px) {
        font-size: 16px;
      }
    }
  }
}

// Governance Grid
.governance-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.governance-item {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 24px;

  @media (min-width: 768px) {
    padding: 28px;
  }
}

.governance-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(40, 200, 200, 0.1);
  color: #28c8c8;
  border-radius: 14px;
  margin-bottom: 16px;
}

.governance-item h4 {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin: 0 0 6px;
}

.governance-subtitle {
  font-size: 13px;
  color: #28c8c8;
  font-weight: 600;
  margin: 0 0 12px;
}

.governance-item > p:last-child {
  font-size: 14px;
  line-height: 1.8;
  color: #666;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 15px;
  }
}

// Heritage Items
.heritage-items {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.heritage-item {
  display: flex;
  gap: 20px;
  background: #f8f9fa;
  border-radius: 16px;
  padding: 24px;

  @media (min-width: 768px) {
    padding: 28px;
    gap: 24px;
  }
}

.heritage-number {
  font-size: 36px;
  font-weight: 800;
  color: rgba(235, 51, 73, 0.2);
  line-height: 1;
  flex-shrink: 0;

  @media (min-width: 768px) {
    font-size: 48px;
  }
}

.heritage-content {
  h4 {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin: 0 0 12px;

    @media (min-width: 768px) {
      font-size: 20px;
    }
  }

  p {
    font-size: 15px;
    line-height: 1.9;
    color: #555;
    margin: 0 0 16px;

    :deep(strong) {
      color: #28c8c8;
    }

    @media (min-width: 768px) {
      font-size: 16px;
    }
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      font-size: 14px;
      line-height: 1.8;
      color: #666;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      strong {
        color: #333;
      }

      @media (min-width: 768px) {
        font-size: 15px;
      }
    }
  }
}

// Declaration Section
.declaration-section {
  padding: 60px 0;
  border-top: 1px solid #e9ecef;

  @media (min-width: 768px) {
    padding: 80px 0;
  }
}

.declaration-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #28c8c8;

  @media (min-width: 768px) {
    padding: 40px;
  }
}

.declaration-content {
  p {
    font-size: 16px;
    line-height: 2;
    color: #444;
    margin: 0 0 20px;

    &:last-child {
      margin-bottom: 0;
    }

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }
}

// Video Section
.video-section {
  padding: 60px 0;
  border-top: 1px solid #e9ecef;

  @media (min-width: 768px) {
    padding: 80px 0;
  }
}

.video-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.video-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: #333;
    margin: 0;
    padding: 16px;
    text-align: center;
  }
}

.video-wrapper {
  position: relative;
  padding-top: 56.25%;

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

.more-videos-link {
  margin-top: 32px;
  text-align: center;

  a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    background: white;
    color: #28c8c8;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    border-radius: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;

    &:hover {
      background: #28c8c8;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(40, 200, 200, 0.3);
    }

    svg {
      flex-shrink: 0;
    }
  }
}

// Policy Image Section
.policy-image-section {
  padding: 0 0 60px;

  @media (min-width: 768px) {
    padding: 0 0 80px;
  }

  .policy-image {
    width: 100%;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }
}
</style>
