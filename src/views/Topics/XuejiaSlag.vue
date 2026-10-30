<script setup>
import { ref, onMounted } from "vue";

const topic = ref(null);

onMounted(async () => {
  try {
    const res = await fetch("/json/topics/xuejia-slag.json");
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
</script>

<template>
  <main class="xuejia-page" id="main-content">
    <div class="container py-4" v-if="topic">
      <div class="topic-content">
        <div class="topic-header">
          <h1>{{ topic.title }}</h1>
          <p class="topic-desc">{{ topic.description }}</p>
          <a :href="topic.source" target="_blank" rel="noopener noreferrer" class="source-link">
            完整資料 &rarr;
          </a>
        </div>

        <div class="hero-image" v-if="topic.image">
          <img :src="topic.image" alt="學甲爐渣" loading="lazy" />
        </div>

        <div class="overview-card" v-if="topic.overview">
          <h2>案件概要</h2>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="label">地點</span>
              <span class="value">{{ topic.overview.location }}</span>
            </div>
            <div class="overview-item">
              <span class="label">業者</span>
              <span class="value">{{ topic.overview.operator }}</span>
            </div>
            <div class="overview-item full">
              <span class="label">違法填埋量</span>
              <span class="value">{{ topic.overview.totalAmount }}</span>
            </div>
            <div class="overview-item">
              <span class="label">不法所得</span>
              <span class="value highlight">{{ topic.overview.illegalProfit }}</span>
            </div>
            <div class="overview-item">
              <span class="label">判決</span>
              <span class="value">{{ topic.overview.verdict }}</span>
            </div>
          </div>
          <p class="overview-issue">{{ topic.overview.issue }}</p>
        </div>

        <div class="keypoints-section">
          <h2>關鍵問題</h2>
          <div class="keypoints-list">
            <div v-for="(kp, i) in topic.keypoints" :key="i" class="keypoint-card">
              <div class="kp-number">{{ i + 1 }}</div>
              <div class="kp-content">
                <h3>{{ kp.title }}</h3>
                <div v-html="formatContent(kp.content)"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="sites-section" v-if="topic.sites">
          <h2>場址清理進度</h2>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>類型</th>
                  <th>地段</th>
                  <th>填埋量</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="site in topic.sites" :key="site.id" :class="{ pending: !site.status.includes('完成') }">
                  <td>{{ site.id }}</td>
                  <td>{{ site.type }}</td>
                  <td>{{ site.location }}</td>
                  <td>{{ site.amount }}</td>
                  <td>
                    <span class="status-badge" :class="site.status.includes('完成') ? 'done' : 'ongoing'">
                      {{ site.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="timeline-section">
          <h2>事件時間軸</h2>
          <div class="timeline-list">
            <div v-for="(item, i) in topic.timeline" :key="i" class="tl-item">
              <div class="tl-marker">
                <div class="tl-dot"></div>
                <div class="tl-line" v-if="i < topic.timeline.length - 1"></div>
              </div>
              <div class="tl-content">
                <div class="tl-date">{{ item.date }}</div>
                <div class="tl-event">{{ item.event }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="refs-section" v-if="topic.references">
          <h2>參考資料</h2>
          <ul>
            <li v-for="(r, i) in topic.references" :key="i">
              <a :href="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else class="loading">載入中...</div>
  </main>
</template>

<style scoped lang="scss">
.xuejia-page {
  min-height: calc(100vh - 89.3px);
  background: #f5f5f5;
  @media (min-width: 992px) { min-height: calc(100vh - 81.609px); }
}

.topic-content {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.topic-header {
  text-align: center;
  padding: 24px 16px 16px;
  h1 { font-size: 28px; font-weight: 800; color: #222; margin-bottom: 8px;
    @media (min-width: 768px) { font-size: 36px; }
  }
  .topic-desc { color: #666; font-size: 15px; margin: 0 0 12px; }
  .source-link { font-size: 14px; color: #28c8c8; text-decoration: none; font-weight: 600;
    &:hover { text-decoration: underline; }
  }
}

.hero-image {
  margin: 16px 0 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  img { width: 100%; height: auto; display: block; }
}

.overview-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  h2 { font-size: 18px; font-weight: 700; color: #333; margin: 0 0 16px; }
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.overview-item {
  &.full { grid-column: 1 / -1; }
  .label { display: block; font-size: 12px; color: #999; margin-bottom: 2px; }
  .value { display: block; font-size: 15px; font-weight: 700; color: #333;
    &.highlight { color: #e53e3e; }
  }
}

.overview-issue {
  font-size: 14px; color: #666; line-height: 1.7; margin: 0;
  padding-top: 12px; border-top: 1px solid #eee;
}

.keypoints-section {
  margin-bottom: 32px;
  h2 { font-size: 18px; font-weight: 700; color: #333; margin-bottom: 12px; padding: 0 16px; }
}

.keypoints-list { display: flex; flex-direction: column; gap: 12px; }

.keypoint-card {
  display: flex; gap: 14px;
  background: white; border-radius: 12px; padding: 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.kp-number {
  width: 32px; height: 32px; background: #28c8c8; color: white;
  font-size: 14px; font-weight: 800; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
}

.kp-content {
  flex: 1; min-width: 0;
  h3 { font-size: 16px; font-weight: 700; color: #333; margin: 0 0 8px; }
  :deep(p) { font-size: 14px; color: #555; line-height: 1.7; margin: 0; }
}

.sites-section {
  margin-bottom: 32px;
  h2 { font-size: 18px; font-weight: 700; color: #333; margin-bottom: 12px; padding: 0 16px; }
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
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    min-width: 600px;
    font-size: 13px;
  }

  th, td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #28c8c8;
    color: white;
    font-weight: 600;
    white-space: nowrap;
  }

  tr.pending { background: #fffbeb; }
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;

  &.done { background: #e6ffed; color: #22863a; }
  &.ongoing { background: #fff3cd; color: #856404; }
}

.timeline-section {
  margin-bottom: 32px;
  h2 { font-size: 18px; font-weight: 700; color: #333; margin-bottom: 12px; padding: 0 16px; }
}

.timeline-list { padding: 0 16px; }

.tl-item { display: flex; gap: 14px; }

.tl-marker {
  display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 16px; padding-top: 6px;
  .tl-dot { width: 10px; height: 10px; background: #28c8c8; border-radius: 50%; flex-shrink: 0; }
  .tl-line { width: 2px; flex: 1; background: #e0e0e0; margin-top: 4px; }
}

.tl-content {
  flex: 1; padding-bottom: 18px;
  .tl-date { font-size: 12px; color: #28c8c8; font-weight: 600; margin-bottom: 2px; }
  .tl-event { font-size: 14px; color: #444; line-height: 1.6; }
}

.refs-section {
  h2 { font-size: 18px; font-weight: 700; color: #333; margin-bottom: 12px; padding: 0 16px; }
  ul { list-style: none; padding: 0 16px; margin: 0; }
  li { margin-bottom: 8px; }
  a { font-size: 14px; color: #28c8c8; text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}

.loading { text-align: center; padding: 60px 20px; color: #999; font-size: 16px; }
</style>
