<script setup>
import { ref, onMounted } from "vue";

const topic = ref(null);

onMounted(async () => {
  try {
    const res = await fetch("/json/topics/chengxi-landfill.json");
    topic.value = await res.json();
  } catch (e) {
    console.error("Failed to load topic:", e);
  }
});

function formatContent(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

const limits = [
  [null, null, 60, 1],
  [null, null, 200, null],
  [null, null, null, 4],
];

function isOverLimit(rowIdx, colIdx, value) {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  const limit = limits[rowIdx]?.[colIdx - 1];
  return limit !== null && limit !== undefined && num > limit;
}
</script>

<template>
  <main class="chengxi-page" id="main-content">
    <div class="container py-4" v-if="topic">
      <div class="topic-content">
        <div class="topic-header">
          <h1>{{ topic.title }}</h1>
          <p class="topic-desc">{{ topic.description }}</p>
          <a :href="topic.source" target="_blank" rel="noopener noreferrer" class="source-link">
            完整資料 &rarr;
          </a>
        </div>

        <div class="map-section" v-if="topic.mapImage">
          <img :src="topic.mapImage" alt="城西掩埋場位置圖" loading="lazy" />
        </div>

        <div class="table-section" v-if="topic.waterQuality">
          <h2>{{ topic.waterQuality.caption }}</h2>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th v-for="h in topic.waterQuality.headers" :key="h">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in topic.waterQuality.rows" :key="i">
                  <td v-for="(cell, j) in row" :key="j" :class="{ highlight: j > 0 && cell !== 'x' && isOverLimit(i, j, cell) }">
                    {{ cell === 'x' ? '-' : cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="timeline">
          <h2>事件重點</h2>
          <div class="timeline-list">
            <div
              v-for="(point, i) in topic.keypoints"
              :key="i"
              class="timeline-item"
              :class="{ 'no-date': !point.date }"
            >
              <div class="timeline-marker">
                <div class="marker-dot"></div>
                <div class="marker-line" v-if="i < topic.keypoints.length - 1"></div>
              </div>
              <div class="timeline-content">
                <div class="timeline-date" v-if="point.date">{{ point.date }}</div>
                <h3>{{ point.title }}</h3>
                <div class="timeline-text" v-html="formatContent(point.content)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="loading">載入中...</div>
  </main>
</template>


<style scoped lang="scss">
.chengxi-page {
  min-height: calc(100vh - 89.3px);
  background: #f5f5f5;

  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
}

.topic-content {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.topic-header {
  text-align: center;
  padding: 24px 16px 16px;

  h1 {
    font-size: 28px;
    font-weight: 800;
    color: #222;
    margin-bottom: 8px;

    @media (min-width: 768px) {
      font-size: 36px;
    }
  }

  .topic-desc {
    color: #666;
    font-size: 15px;
    margin: 0 0 12px;
  }

  .source-link {
    display: inline-block;
    font-size: 14px;
    color: #28c8c8;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
}

.map-section {
  margin: 16px 0 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  img {
    width: 100%;
    height: auto;
    display: block;
  }
}

.table-section {
  margin-bottom: 32px;

  h2 {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 12px;
    padding: 0 16px;
  }
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    min-width: 480px;
  }

  th, td {
    padding: 12px 16px;
    text-align: center;
    font-size: 14px;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #28c8c8;
    color: white;
    font-weight: 600;
    white-space: nowrap;
  }

  td:first-child {
    text-align: left;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
  }

  td.highlight {
    color: #e53e3e;
    font-weight: 700;
    background: #fff5f5;
  }
}

.timeline {
  h2 {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 16px;
    padding: 0 16px;
  }
}

.timeline-list {
  padding: 0 16px;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;

  &.no-date .marker-dot {
    background: #e53e3e;
  }
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 20px;
  padding-top: 4px;

  .marker-dot {
    width: 12px;
    height: 12px;
    background: #28c8c8;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 0 2px #28c8c8;
    flex-shrink: 0;
  }

  .marker-line {
    width: 2px;
    flex: 1;
    background: #d4d4d4;
    margin-top: 4px;
  }
}

.timeline-content {
  flex: 1;
  padding-bottom: 24px;

  .timeline-date {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
    font-weight: 600;
  }

  h3 {
    font-size: 16px;
    font-weight: 700;
    color: #333;
    margin: 0 0 8px;

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }

  .timeline-text {
    font-size: 15px;
    line-height: 1.7;
    color: #555;

    :deep(p) {
      margin-bottom: 8px;
      &:last-child { margin-bottom: 0; }
    }
  }
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}
</style>
