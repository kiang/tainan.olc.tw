<script setup>
import { useRoute } from "vue-router";

const route = useRoute();

const topics = [
  { name: "TenQuestions", title: "十問邱莉莉", icon: "❓" },
  { name: "ChengxiLandfill", title: "城西掩埋場黑水", icon: "🏭" },
  { name: "WushantouSolar", title: "烏山頭水庫光電", icon: "☀️" },
  { name: "HuangPolicies", title: "黃偉哲100政見檢驗", icon: "📋" },
  { name: "XuejiaSlag", title: "學甲爐渣", icon: "⚠️" },
];
</script>

<template>
  <nav class="topics-nav" aria-label="主題導覽">
    <div class="nav-title">其他主題</div>
    <div class="nav-list">
      <RouterLink
        v-for="t in topics"
        :key="t.name"
        :to="{ name: t.name }"
        class="nav-item"
        :class="{ current: route.name === t.name }"
      >
        <span class="nav-icon">{{ t.icon }}</span>
        <span class="nav-label">{{ t.title }}</span>
      </RouterLink>
    </div>
    <RouterLink :to="{ name: 'Topics' }" class="back-link">← 所有主題</RouterLink>
  </nav>
</template>

<style scoped lang="scss">
.topics-nav {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px 0;
  border-top: 1px solid #e0e0e0;
}

.nav-title {
  font-size: 14px;
  font-weight: 700;
  color: #999;
  margin-bottom: 12px;
}

.nav-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  text-decoration: none;
  font-size: 13px;
  color: #555;
  transition: all 0.2s;

  &:hover {
    border-color: #28c8c8;
    background: #f0fafa;
  }

  &.current {
    border-color: #28c8c8;
    background: #e8fafa;
    color: #28c8c8;
    font-weight: 600;
    pointer-events: none;
  }

  .nav-icon {
    font-size: 15px;
  }
}

.back-link {
  display: inline-block;
  font-size: 14px;
  color: #28c8c8;
  text-decoration: none;
  font-weight: 600;
  padding-bottom: 8px;

  &:hover {
    text-decoration: underline;
  }
}
</style>
