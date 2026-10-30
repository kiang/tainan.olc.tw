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

const expandedReport = ref(null);

function toggleReport(id) {
  expandedReport.value = expandedReport.value === id ? null : id;
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

        <div class="reports-section" v-if="topic.reports">
          <h2>檢測報告彙整</h2>
          <div class="reports-list">
            <div
              v-for="report in topic.reports"
              :key="report.id"
              class="report-card"
              :class="{ expanded: expandedReport === report.id }"
            >
              <button class="report-toggle" @click="toggleReport(report.id)">
                <div class="report-badge">{{ report.id }}</div>
                <div class="report-header-info">
                  <h3>{{ report.title }}</h3>
                  <div class="report-meta">
                    <span class="report-date">{{ report.date }}</span>
                    <span class="report-lab" v-if="report.lab">{{ report.lab }}</span>
                  </div>
                  <p class="report-summary">{{ report.summary }}</p>
                </div>
                <div class="report-arrow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"
                    :style="{ transform: expandedReport === report.id ? 'rotate(180deg)' : '' }">
                    <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </div>
              </button>

              <Transition name="expand">
                <div v-if="expandedReport === report.id" class="report-body">
                  <div class="report-image" v-if="report.image">
                    <img :src="report.image" :alt="report.title" loading="lazy" />
                  </div>
                  <div class="table-wrapper" v-if="report.data">
                    <table>
                      <thead>
                        <tr>
                          <th v-for="h in report.data.headers" :key="h">{{ h }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, i) in report.data.rows" :key="i">
                          <td v-for="(cell, j) in row" :key="j" :class="{ 'row-header': j === 0 }">{{ cell }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Transition>
            </div>
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

.reports-section {
  margin-bottom: 32px;

  h2 {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 12px;
    padding: 0 16px;
  }
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.report-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: box-shadow 0.2s;

  &.expanded {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}

.report-toggle {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;

  &:hover { background: #fafafa; }
}

.report-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #28c8c8;
  color: white;
  font-size: 14px;
  font-weight: 800;
  border-radius: 8px;
  flex-shrink: 0;
  margin-top: 2px;
}

.report-header-info {
  flex: 1;
  min-width: 0;

  h3 {
    font-size: 15px;
    font-weight: 700;
    color: #333;
    margin: 0 0 4px;
  }

  .report-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .report-date {
    font-size: 12px;
    color: #28c8c8;
    font-weight: 600;
  }

  .report-lab {
    font-size: 11px;
    color: #999;
    background: #f0f0f0;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .report-summary {
    font-size: 13px;
    color: #777;
    margin: 0;
    line-height: 1.5;
  }
}

.report-arrow {
  color: #ccc;
  flex-shrink: 0;
  margin-top: 4px;

  svg { transition: transform 0.3s; }
}

.report-body {
  padding: 0 16px 16px;
}

.report-image {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: auto;
    display: block;
  }
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  table {
    width: 100%;
    border-collapse: collapse;
    background: #fafafa;
    border-radius: 8px;
    overflow: hidden;
    min-width: 400px;
    font-size: 13px;
  }

  th, td {
    padding: 8px 12px;
    text-align: center;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #28c8c8;
    color: white;
    font-weight: 600;
    font-size: 12px;
    white-space: nowrap;
  }

  td.row-header {
    text-align: left;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
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

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
