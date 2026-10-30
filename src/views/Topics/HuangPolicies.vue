<script setup>
import { ref, computed, onMounted } from "vue";

const topic = ref(null);
const expandedId = ref(null);
const filterStatus = ref("all");
const searchText = ref("");

onMounted(async () => {
  try {
    const res = await fetch("/json/topics/huang-policies.json");
    topic.value = await res.json();
  } catch (e) {
    console.error("Failed to load topic:", e);
  }
});

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

const filteredPolicies = computed(() => {
  if (!topic.value) return [];
  let list = topic.value.policies;
  if (filterStatus.value !== "all") {
    list = list.filter((p) => p.status2026 === filterStatus.value);
  }
  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.review2022 && p.review2022.toLowerCase().includes(q)) ||
        (p.review2026 && p.review2026.toLowerCase().includes(q))
    );
  }
  return list;
});

const statusCounts = computed(() => {
  if (!topic.value) return {};
  const counts = { all: 0, done: 0, partial: 0, failed: 0, unclear: 0 };
  topic.value.policies.forEach((p) => {
    counts.all++;
    if (p.status2026) counts[p.status2026]++;
  });
  return counts;
});

const statusLabels = {
  all: "全部",
  done: "已實現",
  partial: "部分實現",
  failed: "未實現",
  unclear: "難以判定",
};

const statusColors = {
  done: "#22863a",
  partial: "#b08800",
  failed: "#e53e3e",
  unclear: "#888",
};

function formatContent(text) {
  if (!text) return "";
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
  <main class="huang-page" id="main-content">
    <div class="container py-4" v-if="topic">
      <div class="topic-content">
        <div class="topic-header">
          <h1>{{ topic.title }}</h1>
          <p class="topic-desc">{{ topic.description }}</p>
        </div>

        <div class="stats-bar" v-if="statusCounts.all">
          <div class="stat-item" v-for="(label, key) in statusLabels" :key="key">
            <button
              class="stat-btn"
              :class="{ active: filterStatus === key }"
              @click="filterStatus = key"
            >
              <span
                class="stat-dot"
                v-if="key !== 'all'"
                :style="{ background: statusColors[key] }"
              ></span>
              <span class="stat-label">{{ label }}</span>
              <span class="stat-count">{{ statusCounts[key] || 0 }}</span>
            </button>
          </div>
        </div>

        <div class="search-bar">
          <input
            v-model="searchText"
            type="text"
            placeholder="搜尋政見..."
          />
        </div>

        <div class="policies-list">
          <div class="result-count" v-if="searchText || filterStatus !== 'all'">
            顯示 {{ filteredPolicies.length }} / {{ topic.policies.length }} 項
          </div>

          <div
            v-for="p in filteredPolicies"
            :key="p.id"
            class="policy-card"
            :class="{ expanded: expandedId === p.id }"
          >
            <button class="policy-toggle" @click="toggle(p.id)">
              <div class="policy-num">{{ p.id }}</div>
              <div class="policy-info">
                <h3>{{ p.title }}</h3>
                <span
                  v-if="p.status2026"
                  class="status-tag"
                  :style="{ background: statusColors[p.status2026] + '18', color: statusColors[p.status2026] }"
                >{{ statusLabels[p.status2026] }}</span>
              </div>
              <div class="policy-arrow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  :style="{ transform: expandedId === p.id ? 'rotate(180deg)' : '' }"
                >
                  <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                </svg>
              </div>
            </button>

            <Transition name="expand">
              <div v-if="expandedId === p.id" class="policy-body">
                <div class="review-block" v-if="p.review2022">
                  <div class="review-label">2022 中期檢驗</div>
                  <div class="review-text" v-html="formatContent(p.review2022)"></div>
                </div>
                <div class="review-block review-2026" v-if="p.review2026">
                  <div class="review-label">2026 最終檢驗</div>
                  <div class="review-text" v-html="formatContent(p.review2026)"></div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="loading">載入中...</div>
  </main>
</template>

<style scoped lang="scss">
.huang-page {
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
  padding: 24px 16px 12px;
  h1 { font-size: 24px; font-weight: 800; color: #222; margin-bottom: 8px;
    @media (min-width: 768px) { font-size: 32px; }
  }
  .topic-desc { color: #666; font-size: 14px; margin: 0; }
}

.stats-bar {
  display: flex;
  gap: 6px;
  padding: 12px 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  justify-content: center;
  flex-wrap: wrap;
}

.stat-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.2s;

  &.active { border-color: #28c8c8; background: #e8fafa; }
  &:hover { border-color: #28c8c8; }

  .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .stat-label { color: #555; }
  .stat-count { font-weight: 700; color: #333; }
}

.search-bar {
  padding: 0 0 12px;
  input {
    width: 100%;
    padding: 10px 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    &:focus { outline: none; border-color: #28c8c8; }
  }
}

.result-count {
  font-size: 13px;
  color: #999;
  padding: 0 0 8px;
}

.policies-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.policy-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
  transition: box-shadow 0.2s;
  &.expanded { box-shadow: 0 3px 12px rgba(0,0,0,0.1); }
}

.policy-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  &:hover { background: #fafafa; }
}

.policy-num {
  width: 30px; height: 30px; background: #28c8c8; color: white;
  font-size: 12px; font-weight: 800; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.policy-info {
  flex: 1; min-width: 0;
  h3 { font-size: 14px; font-weight: 600; color: #333; margin: 0; line-height: 1.4; }
}

.status-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 4px;
  margin-top: 3px;
}

.policy-arrow {
  color: #ccc; flex-shrink: 0;
  svg { transition: transform 0.3s; }
}

.policy-body {
  padding: 0 14px 14px;
}

.review-block {
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }
}

.review-label {
  font-size: 12px;
  font-weight: 700;
  color: #28c8c8;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee;
}

.review-2026 .review-label {
  color: #e53e3e;
}

.review-text {
  font-size: 14px; line-height: 1.7; color: #555;
  :deep(p) { margin-bottom: 8px; &:last-child { margin-bottom: 0; } }
}

.loading { text-align: center; padding: 60px 20px; color: #999; }

.expand-enter-active, .expand-leave-active { transition: all 0.3s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
</style>
