<script setup>
import { ref, watch, onMounted } from "vue";

const sources = [
  {
    label: "台南市政府",
    base: "https://kiang.github.io/www.tainan.gov.tw",
  },
  {
    label: "台南市議會",
    base: "https://kiang.github.io/www.tncc.gov.tw",
  },
];

const theDate = ref(new Date().toISOString().slice(0, 10));
const articles = ref([]);
const loading = ref(false);
const error = ref("");

function changeDate(offset) {
  const d = new Date(theDate.value);
  d.setDate(d.getDate() + offset);
  theDate.value = d.toISOString().slice(0, 10);
}

async function fetchFromSource(source, date) {
  const year = date.slice(0, 4);
  const month = date.slice(5, 7);
  const metaUrl = `${source.base}/data/${year}/${date}.json`;

  try {
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) return [];
    const meta = await metaRes.json();
    const keys = Object.keys(meta);

    const results = await Promise.all(
      keys.map(async (k) => {
        const dataUrl = `${source.base}/data/${year}/${month}/${date}_${k}.json`;
        try {
          const res = await fetch(dataUrl);
          if (res.ok) {
            const d = await res.json();
            d.source = source.label;
            return d;
          }
        } catch {
          // skip
        }
        return null;
      })
    );

    return results.filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchNews() {
  loading.value = true;
  error.value = "";
  articles.value = [];

  const date = theDate.value;
  const allResults = await Promise.all(
    sources.map((s) => fetchFromSource(s, date))
  );

  articles.value = allResults.flat();
  if (articles.value.length === 0) {
    error.value = "此日期沒有資料";
  }
  loading.value = false;
}

watch(theDate, fetchNews);
onMounted(fetchNews);
</script>

<template>
  <div class="tainan-news">
    <div class="background-figure">
      <img src="@/assets/images/kiang-with-name-big.png" alt="" aria-hidden="true" />
    </div>

    <div class="news-body">
      <div class="news-header">
        <h1>台南焦點</h1>
        <div class="date-picker">
          <button class="date-nav" @click="changeDate(-1)" aria-label="前一天">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
          <input type="date" v-model="theDate" class="date-input" />
          <button class="date-nav" @click="changeDate(1)" aria-label="後一天">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="loading" class="news-status">載入中...</div>
      <div v-else-if="error" class="news-status">{{ error }}</div>
      <div v-else class="news-list">
        <div v-for="(article, idx) in articles" :key="idx" class="news-card">
          <span class="news-source">{{ article.source }}</span>
          <h2 class="news-title">{{ article.title }}</h2>
          <pre class="news-content">{{ article.content }}</pre>
          <a
            v-if="article.url"
            :href="article.url"
            target="_blank"
            rel="noopener noreferrer"
            class="news-link"
          >查看原文
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
              <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tainan-news {
  position: relative;
  min-height: calc(100vh - 80px);
  overflow: hidden;
}

.background-figure {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.12;

  img {
    width: 350px;
    height: auto;

    @media (min-width: 768px) {
      width: 450px;
    }

    @media (min-width: 1200px) {
      width: 550px;
    }
  }
}

.news-body {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

.news-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: #333;
  }
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 4px;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 50%;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #28c8c8;
    color: #28c8c8;
  }
}

.date-input {
  padding: 6px 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: white;

  &:focus {
    outline: none;
    border-color: #28c8c8;
  }
}

.news-status {
  text-align: center;
  padding: 60px 0;
  color: #999;
  font-size: 16px;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.news-card {
  padding: 20px;
  background: rgba(248, 249, 250, 0.92);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.news-source {
  display: inline-block;
  padding: 2px 10px;
  background: #28c8c8;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.news-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  color: #333;
  line-height: 1.4;
}

.news-content {
  margin: 0 0 12px;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  max-height: 150px;
  overflow: hidden;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30px;
    background: linear-gradient(transparent, rgba(248, 249, 250, 0.92));
  }
}

.news-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #28c8c8;
  color: white;
  text-decoration: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s;

  &:hover {
    background: #20b0b0;
    color: white;
  }
}
</style>
