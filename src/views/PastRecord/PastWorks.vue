<script setup>
import { ref, computed } from "vue";
import data from "@/assets/JSON/works-categorized.json";

const { categories, stats, featured, data: worksList } = data;

const selectedCategory = ref("all");

// Compute aggregated stats
const totalNews = computed(() => {
  return worksList.reduce((sum, item) => sum + item.news.length, 0);
});

const projectsWithNews = computed(() => {
  return worksList.filter((item) => item.news.length > 0).length;
});

// Filter works by category
const filteredWorks = computed(() => {
  if (selectedCategory.value === "all") {
    return worksList;
  }
  return worksList.filter((item) => item.category === selectedCategory.value);
});

// Get featured projects
const featuredProjects = computed(() => {
  return worksList
    .filter((item) => featured.includes(item.id))
    .sort((a, b) => b.news.length - a.news.length);
});

// Get category info
const getCategoryInfo = (categoryId) => {
  return categories.find((c) => c.id === categoryId) || {};
};

// Count projects per category
const categoryCounts = computed(() => {
  const counts = { all: worksList.length };
  categories.forEach((cat) => {
    counts[cat.id] = worksList.filter((w) => w.category === cat.id).length;
  });
  return counts;
});
</script>

<template>
  <div class="past-works-page">
    <!-- Impact Stats Banner -->
    <div class="stats-banner">
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-number">{{ worksList.length }}+</div>
          <div class="stat-label">公民科技專案</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ totalNews }}+</div>
          <div class="stat-label">媒體報導</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ projectsWithNews }}</div>
          <div class="stat-label">受關注專案</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.yearsActive }}</div>
          <div class="stat-label">持續耕耘</div>
        </div>
      </div>
      <div class="international-media">
        <span class="media-label">國際媒體報導：</span>
        <span v-for="media in stats.internationalMedia" :key="media" class="media-tag">
          {{ media }}
        </span>
      </div>
    </div>

    <!-- Featured Projects -->
    <section class="featured-section">
      <h2 class="section-title">代表性專案</h2>
      <p class="section-subtitle">這些專案在重大事件中幫助了數百萬台灣人</p>
      <div class="featured-grid">
        <div
          v-for="item in featuredProjects"
          :key="item.id"
          class="featured-card"
        >
          <div class="featured-image">
            <img :src="item.portfolio.imgUrl" :alt="item.portfolio.title" />
            <div
              class="category-badge"
              :style="{ backgroundColor: getCategoryInfo(item.category).color }"
            >
              <i :class="'bi ' + getCategoryInfo(item.category).icon"></i>
              {{ getCategoryInfo(item.category).name }}
            </div>
          </div>
          <div class="featured-content">
            <a :href="item.portfolio.link" target="_blank" class="featured-title">
              <h3>{{ item.portfolio.title }}</h3>
            </a>
            <p class="featured-description">{{ item.portfolio.description }}</p>
            <div class="featured-stats">
              <span class="news-count">
                <i class="bi bi-newspaper"></i> {{ item.news.length }} 篇報導
              </span>
            </div>
            <div class="featured-news" v-if="item.news.length > 0">
              <a
                v-for="news in item.news.slice(0, 3)"
                :key="news.link"
                :href="news.link"
                target="_blank"
                class="news-chip"
              >
                {{ news.media }}
              </a>
              <span v-if="item.news.length > 3" class="more-news">
                +{{ item.news.length - 3 }} more
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Category Filter -->
    <section class="all-projects-section">
      <h2 class="section-title">所有專案</h2>
      <div class="category-filter">
        <button
          class="filter-btn"
          :class="{ active: selectedCategory === 'all' }"
          @click="selectedCategory = 'all'"
        >
          全部 ({{ categoryCounts.all }})
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="filter-btn"
          :class="{ active: selectedCategory === cat.id }"
          :style="selectedCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}"
          @click="selectedCategory = cat.id"
        >
          <i :class="'bi ' + cat.icon"></i>
          {{ cat.name }} ({{ categoryCounts[cat.id] }})
        </button>
      </div>

      <!-- Projects Grid -->
      <div class="projects-grid">
        <div
          v-for="item in filteredWorks"
          :key="item.id"
          class="project-card"
        >
          <div class="project-image">
            <img :src="item.portfolio.imgUrl" :alt="item.portfolio.title" loading="lazy" />
          </div>
          <div class="project-content">
            <div
              class="category-tag"
              :style="{ backgroundColor: getCategoryInfo(item.category).color }"
            >
              {{ getCategoryInfo(item.category).name }}
            </div>
            <a :href="item.portfolio.link" target="_blank" class="project-title">
              <h3>{{ item.portfolio.title }}</h3>
            </a>
            <p class="project-description" v-if="item.portfolio.description">
              {{ item.portfolio.description }}
            </p>
            <div class="project-news" v-if="item.news.length > 0">
              <div class="news-header">
                <i class="bi bi-newspaper"></i> {{ item.news.length }} 篇報導
              </div>
              <div class="news-tags">
                <a
                  v-for="news in item.news.slice(0, 4)"
                  :key="news.link"
                  :href="news.link"
                  target="_blank"
                  class="news-tag"
                >
                  {{ news.media }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.past-works-page {
  padding-bottom: 60px;
}

// Stats Banner
.stats-banner {
  background: linear-gradient(135deg, #28c8c8 0%, #1a9a9a 100%);
  color: white;
  padding: 30px 20px;
  text-align: center;

  @media (min-width: 992px) {
    padding: 50px 40px;
  }
}

.stats-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto 20px;

  @media (min-width: 768px) {
    gap: 40px;
  }
}

.stat-item {
  text-align: center;
  min-width: 100px;

  .stat-number {
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;

    @media (min-width: 768px) {
      font-size: 48px;
    }
  }

  .stat-label {
    font-size: 14px;
    opacity: 0.9;
    margin-top: 5px;

    @media (min-width: 768px) {
      font-size: 16px;
    }
  }
}

.international-media {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;

  .media-label {
    font-size: 14px;
    opacity: 0.9;
  }

  .media-tag {
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
  }
}

// Section Titles
.section-title {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin: 40px 0 10px;
  color: #333;

  @media (min-width: 992px) {
    font-size: 32px;
    margin: 60px 0 15px;
  }
}

.section-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 15px;

  @media (min-width: 992px) {
    font-size: 16px;
    margin-bottom: 40px;
  }
}

// Featured Section
.featured-section {
  padding: 0 20px;

  @media (min-width: 992px) {
    padding: 0 40px;
  }
}

.featured-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.featured-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
}

.featured-image {
  position: relative;
  height: 180px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .category-badge {
    position: absolute;
    bottom: 10px;
    left: 10px;
    color: white;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 5px;
  }
}

.featured-content {
  padding: 20px;
}

.featured-title {
  text-decoration: none;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0 0 10px;
    line-height: 1.4;

    &:hover {
      color: #28c8c8;
    }
  }
}

.featured-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 15px;
  line-height: 1.5;
}

.featured-stats {
  margin-bottom: 12px;

  .news-count {
    font-size: 13px;
    color: #888;
    display: flex;
    align-items: center;
    gap: 5px;
  }
}

.featured-news {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.news-chip {
  background: #28c8c8;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  text-decoration: none;
  transition: background 0.2s;

  &:hover {
    background: #1a9a9a;
  }
}

.more-news {
  font-size: 12px;
  color: #888;
}

// Category Filter
.all-projects-section {
  padding: 0 20px;

  @media (min-width: 992px) {
    padding: 0 40px;
  }
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 30px;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 992px) {
    gap: 10px;
    margin-bottom: 40px;
  }
}

.filter-btn {
  padding: 8px 16px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 25px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    border-color: #28c8c8;
    color: #28c8c8;
  }

  &.active {
    background: #28c8c8;
    border-color: #28c8c8;
    color: white;
  }

  @media (min-width: 992px) {
    padding: 10px 20px;
    font-size: 14px;
  }
}

// Projects Grid
.projects-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 992px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1400px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.project-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
  }
}

.project-image {
  height: 140px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.project-content {
  padding: 15px;
}

.category-tag {
  display: inline-block;
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
}

.project-title {
  text-decoration: none;

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px;
    line-height: 1.4;

    &:hover {
      color: #28c8c8;
    }
  }
}

.project-description {
  font-size: 13px;
  color: #666;
  margin: 0 0 10px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-news {
  border-top: 1px solid #eee;
  padding-top: 10px;
  margin-top: 10px;
}

.news-header {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.news-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.news-tag {
  background: #f0f0f0;
  color: #555;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 11px;
  text-decoration: none;
  transition: background 0.2s;

  &:hover {
    background: #28c8c8;
    color: white;
  }
}
</style>
