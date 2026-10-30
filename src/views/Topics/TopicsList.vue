<script setup>
const topics = [
  {
    name: "TenQuestions",
    title: "十問邱莉莉",
    desc: "公開提問台南市議長邱莉莉，要求說清楚、講明白",
    icon: "❓",
  },
  {
    name: "ChengxiLandfill",
    title: "城西掩埋場黑水",
    desc: "台南城西掩埋場污水外洩事件追蹤",
    icon: "🏭",
  },
  {
    name: "WushantouSolar",
    title: "烏山頭水庫光電",
    desc: "烏山頭水庫浮動式光電場爭議追蹤",
    icon: "☀️",
  },
  {
    name: "XuejiaSlag",
    title: "學甲爐渣",
    desc: "學甲區 60 多萬噸爐渣違法掩埋事件",
    icon: "⚠️",
  },
];
</script>

<template>
  <main class="topics-list-page" id="main-content">
    <div class="container py-4">
      <div class="topics-content">
        <div class="topics-header">
          <h1>主題</h1>
          <p>江明宗關注的台南市政議題</p>
        </div>
        <div class="topics-grid">
          <RouterLink
            v-for="t in topics"
            :key="t.name"
            :to="{ name: t.name }"
            class="topic-card"
          >
            <div class="topic-icon">{{ t.icon }}</div>
            <div class="topic-info">
              <h2>{{ t.title }}</h2>
              <p>{{ t.desc }}</p>
            </div>
            <div class="topic-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.topics-list-page {
  min-height: calc(100vh - 89.3px);
  background: #f5f5f5;

  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
}

.topics-content {
  max-width: 700px;
  margin: 0 auto;
}

.topics-header {
  text-align: center;
  padding: 24px 16px 20px;

  h1 {
    font-size: 28px;
    font-weight: 800;
    color: #222;
    margin-bottom: 8px;

    @media (min-width: 768px) {
      font-size: 36px;
    }
  }

  p {
    color: #666;
    font-size: 15px;
    margin: 0;
  }
}

.topics-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 0 40px;
}

.topic-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
  }

  @media (min-width: 768px) {
    padding: 24px;
  }
}

.topic-icon {
  font-size: 32px;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0fafa;
  border-radius: 12px;
}

.topic-info {
  flex: 1;
  min-width: 0;

  h2 {
    font-size: 17px;
    font-weight: 700;
    color: #333;
    margin: 0 0 4px;
  }

  p {
    font-size: 14px;
    color: #888;
    margin: 0;
  }
}

.topic-arrow {
  color: #ccc;
  flex-shrink: 0;
}
</style>
