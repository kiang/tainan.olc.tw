<script setup>
import { ref, onMounted } from "vue";

const topic = ref(null);

onMounted(async () => {
  try {
    const res = await fetch("/json/topics/wushantou-solar.json");
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

function ytEmbed(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

const activeVideo = ref(null);
function openVideo(url) {
  activeVideo.value = ytEmbed(url);
}
function closeVideo() {
  activeVideo.value = null;
}
</script>

<template>
  <main class="wushantou-page" id="main-content">
    <div class="container py-4" v-if="topic">
      <div class="topic-content">
        <div class="topic-header">
          <h1>{{ topic.title }}</h1>
          <p class="topic-desc">{{ topic.description }}</p>
          <a :href="topic.source" target="_blank" rel="noopener noreferrer" class="source-link">
            完整資料 &rarr;
          </a>
        </div>

        <div class="shorts-embed" v-if="topic.video">
          <iframe
            :src="topic.video.replace('shorts/', 'embed/') + '?autoplay=0'"
            frameborder="0"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>

        <div class="hero-image" v-if="topic.images">
          <img :src="topic.images[0]" alt="烏山頭水庫光電" loading="lazy" />
        </div>

        <div class="overview-card" v-if="topic.overview">
          <h2>基本資訊</h2>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="label">開發商</span>
              <span class="value">{{ topic.overview.developer }}</span>
            </div>
            <div class="overview-item">
              <span class="label">裝置容量</span>
              <span class="value">{{ topic.overview.capacity }}</span>
            </div>
            <div class="overview-item">
              <span class="label">佔用面積</span>
              <span class="value">{{ topic.overview.area }}</span>
            </div>
            <div class="overview-item">
              <span class="label">併網日期</span>
              <span class="value">{{ topic.overview.gridDate }}</span>
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

        <div class="timeline-section">
          <h2>事件時間軸</h2>
          <div class="timeline-list">
            <div
              v-for="(item, i) in topic.timeline"
              :key="i"
              class="tl-item"
            >
              <div class="tl-marker">
                <div class="tl-dot" :class="{ highlight: item.video }"></div>
                <div class="tl-line" v-if="i < topic.timeline.length - 1"></div>
              </div>
              <div class="tl-content">
                <div class="tl-date">{{ item.date }}</div>
                <div class="tl-event">
                  {{ item.event }}
                  <button v-if="item.video" class="video-btn" @click="openVideo(item.video)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                    </svg>
                    影片
                  </button>
                </div>
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

    <Transition name="fade">
      <div v-if="activeVideo" class="video-overlay" @click.self="closeVideo">
        <div class="video-modal">
          <button class="close-btn" @click="closeVideo">&times;</button>
          <div class="video-wrapper">
            <iframe :src="activeVideo + '?autoplay=1'" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped lang="scss">
.wushantou-page {
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

.shorts-embed {
  max-width: 360px;
  margin: 16px auto 24px;
  iframe {
    width: 100%;
    aspect-ratio: 9 / 16;
    border-radius: 12px;
    display: block;
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
  @media (min-width: 600px) { grid-template-columns: repeat(4, 1fr); }
}

.overview-item {
  .label { display: block; font-size: 12px; color: #999; margin-bottom: 2px; }
  .value { display: block; font-size: 15px; font-weight: 700; color: #333; }
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

.timeline-section {
  margin-bottom: 32px;
  h2 { font-size: 18px; font-weight: 700; color: #333; margin-bottom: 12px; padding: 0 16px; }
}

.timeline-list { padding: 0 16px; }

.tl-item { display: flex; gap: 14px; }

.tl-marker {
  display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 16px; padding-top: 6px;
  .tl-dot {
    width: 10px; height: 10px; background: #ccc; border-radius: 50%; flex-shrink: 0;
    &.highlight { background: #e53e3e; box-shadow: 0 0 0 3px rgba(229,62,62,0.2); }
  }
  .tl-line { width: 2px; flex: 1; background: #e0e0e0; margin-top: 4px; }
}

.tl-content {
  flex: 1; padding-bottom: 18px;
  .tl-date { font-size: 12px; color: #28c8c8; font-weight: 600; margin-bottom: 2px; }
  .tl-event { font-size: 14px; color: #444; line-height: 1.6; }
}

.video-btn {
  display: inline-flex; align-items: center; gap: 4px;
  background: #ff0000; color: white; border: none; border-radius: 4px;
  padding: 2px 8px; font-size: 12px; font-weight: 600; cursor: pointer;
  margin-left: 6px; vertical-align: middle;
  &:hover { background: #cc0000; }
  svg { flex-shrink: 0; }
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

.video-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}

.video-modal {
  position: relative; width: 100%; max-width: 800px;
  .close-btn {
    position: absolute; top: -36px; right: 0;
    background: none; border: none; color: white; font-size: 28px; cursor: pointer;
  }
}

.video-wrapper {
  position: relative; padding-top: 56.25%; background: #000; border-radius: 8px; overflow: hidden;
  iframe { position: absolute; inset: 0; width: 100%; height: 100%; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
