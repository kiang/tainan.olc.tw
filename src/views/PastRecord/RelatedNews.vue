<script setup>
import { computed, ref } from "vue";
import linksData from "@/assets/JSON/links.json";

// Transform and sort news by date (newest first)
const newsList = computed(() => {
  return linksData
    .map((item) => ({
      url: item.url,
      title: typeof item.title === "object" ? item.title.zh : item.title,
      date: formatDate(item.date),
      rawDate: item.date,
      year: item.date ? item.date.substring(0, 4) : "",
      source: getSource(item.url),
    }))
    .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
});

// Get unique years for filtering
const years = computed(() => {
  const uniqueYears = [...new Set(newsList.value.map((n) => n.year))];
  return uniqueYears.sort((a, b) => b.localeCompare(a));
});

// Selected year filter
const selectedYear = ref("all");

// Filtered news
const filteredNews = computed(() => {
  if (selectedYear.value === "all") {
    return newsList.value;
  }
  return newsList.value.filter((n) => n.year === selectedYear.value);
});

// Stats
const totalNews = computed(() => newsList.value.length);
const uniqueSources = computed(() => {
  const sources = new Set(newsList.value.map((n) => n.source));
  return sources.size;
});

function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr || "";
  return `${dateStr.substring(0, 4)}/${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`;
}

function getSource(url) {
  if (!url) return "未知";
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    // Map common domains to readable names
    const sourceMap = {
      "youtube.com": "YouTube",
      "ltn.com.tw": "自由時報",
      "chinatimes.com": "中時新聞",
      "udn.com": "聯合新聞網",
      "wealth.com.tw": "財訊",
      "bnext.com.tw": "數位時代",
      "buzzorange.com": "報橘",
      "theinitium.com": "端傳媒",
      "thenewslens.com": "關鍵評論網",
      "cdns.com.tw": "中華日報",
      "taisounds.com": "太報",
      "g0v.news": "g0v News",
      "knowledge.wharton.upenn.edu": "Wharton",
      "businessweekly.com.tw": "商業周刊",
    };
    return sourceMap[hostname] || hostname;
  } catch {
    return "未知";
  }
}
</script>

<template>
  <div class="related-news-page">
    <!-- Stats Banner -->
    <div class="stats-banner">
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-number">{{ totalNews }}</div>
          <div class="stat-label">篇報導</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ uniqueSources }}</div>
          <div class="stat-label">家媒體</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ years.length }}</div>
          <div class="stat-label">年跨度</div>
        </div>
      </div>
    </div>

    <div class="sticky-notes">
      <div class="related-news">
        <h2>相關報導</h2>

        <!-- Year Filter -->
        <div class="year-filter">
          <button
            class="filter-btn"
            :class="{ active: selectedYear === 'all' }"
            @click="selectedYear = 'all'"
          >
            全部 ({{ totalNews }})
          </button>
          <button
            v-for="year in years"
            :key="year"
            class="filter-btn"
            :class="{ active: selectedYear === year }"
            @click="selectedYear = year"
          >
            {{ year }}
          </button>
        </div>

        <div class="related-news-container">
          <a
            v-for="(item, index) in filteredNews"
            :key="index"
            target="_blank"
            rel="noopener noreferrer"
            class="news-item"
            :href="item.url"
          >
            <span class="news-source">{{ item.source }}</span>
            <p class="news-title">{{ item.title }}</p>
            <span class="news-date">{{ item.date }}</span>
          </a>
        </div>

        <p v-if="filteredNews.length === 0" class="no-results">
          沒有符合條件的報導
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import "@/assets/scss/layout/past-record-page";
@import "@/assets/scss/components/sticky-notes";

.related-news-page {
  // Stats Banner
  .stats-banner {
    background: linear-gradient(135deg, #28c8c8 0%, #1a9a9a 100%);
    color: white;
    padding: 20px;
    text-align: center;

    @media (min-width: 992px) {
      padding: 30px 40px;
    }
  }

  .stats-container {
    display: flex;
    justify-content: center;
    gap: 30px;
    max-width: 500px;
    margin: 0 auto;

    @media (min-width: 768px) {
      gap: 50px;
    }
  }

  .stat-item {
    text-align: center;

    .stat-number {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;

      @media (min-width: 768px) {
        font-size: 38px;
      }
    }

    .stat-label {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 4px;

      @media (min-width: 768px) {
        font-size: 14px;
      }
    }
  }
}

.related-news {
  padding: 14px 20px;

  @media (min-width: 768px) {
    padding: 24px 40px;
  }

  h2 {
    font-weight: 700;
    text-align: center;
    margin-bottom: 20px;
    font-size: 16px;

    @media (min-width: 768px) {
      margin-bottom: 30px;
      font-size: 36px;
    }
  }

  // Year Filter
  .year-filter {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-bottom: 24px;

    @media (min-width: 768px) {
      gap: 10px;
      margin-bottom: 32px;
    }
  }

  .filter-btn {
    padding: 6px 14px;
    border: 2px solid #ddd;
    background: white;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #28c8c8;
      color: #28c8c8;
    }

    &.active {
      background: #28c8c8;
      border-color: #28c8c8;
      color: white;
    }

    @media (min-width: 768px) {
      padding: 8px 16px;
      font-size: 14px;
    }
  }

  &-container {
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: 768px) {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    @media (min-width: 1200px) {
      grid-template-columns: repeat(3, 1fr);
    }

    .news-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 16px;
      background-color: white;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      border: 1px solid #eee;
      transition: all 0.2s;

      &:hover {
        border-color: #28c8c8;
        box-shadow: 0 4px 12px rgba(40, 200, 200, 0.15);
        transform: translateY(-2px);

        .news-title {
          color: #28c8c8;
        }
      }

      .news-source {
        font-size: 12px;
        color: #28c8c8;
        font-weight: 600;
      }

      .news-title {
        font-size: 14px;
        font-weight: 500;
        color: #333;
        line-height: 1.5;
        transition: color 0.2s;

        @media (min-width: 768px) {
          font-size: 15px;
        }
      }

      .news-date {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .no-results {
    text-align: center;
    color: #666;
    padding: 40px 20px;
  }
}
</style>
