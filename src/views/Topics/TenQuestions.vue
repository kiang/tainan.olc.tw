<script setup>
import { ref, onMounted } from "vue";

const topic = ref(null);
const expandedId = ref(null);

onMounted(async () => {
  try {
    const res = await fetch("/json/topics/ten-questions.json");
    topic.value = await res.json();
  } catch (e) {
    console.error("Failed to load topic:", e);
  }
});

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

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
  <main class="ten-questions-page" id="main-content">
    <div class="container py-4">
      <div v-if="topic" class="topic-content">
        <div class="topic-header">
          <h1>{{ topic.title }}</h1>
          <p class="topic-desc">{{ topic.description }}</p>
        </div>

        <div class="posts-list">
          <article
            v-for="post in topic.posts"
            :key="post.id"
            class="post-card"
            :class="{ expanded: expandedId === post.id }"
          >
            <button class="post-toggle" @click="toggle(post.id)">
              <div class="post-number">{{ post.id }}</div>
              <div class="post-header-info">
                <h2>{{ post.title }}</h2>
                <span class="post-date">{{ post.date }}</span>
              </div>
              <div class="post-arrow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  :style="{ transform: expandedId === post.id ? 'rotate(180deg)' : '' }"
                >
                  <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                </svg>
              </div>
            </button>

            <Transition name="expand">
              <div v-if="expandedId === post.id" class="post-body">
                <div class="post-image" v-if="post.image">
                  <img :src="post.image" :alt="post.title" loading="lazy" />
                </div>
                <div class="post-text" v-html="formatContent(post.content)"></div>
              </div>
            </Transition>
          </article>
        </div>
      </div>

      <div v-else class="loading">載入中...</div>
    </div>
  </main>
</template>


<style scoped lang="scss">
.ten-questions-page {
  min-height: calc(100vh - 89.3px);
  background: #f5f5f5;

  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
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
    margin: 0;
  }
}

.posts-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 0 40px;
}

.post-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: box-shadow 0.2s;

  &.expanded {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}

.post-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: #fafafa;
  }

  @media (min-width: 768px) {
    padding: 20px 24px;
    gap: 16px;
  }
}

.post-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #28c8c8;
  color: white;
  font-size: 16px;
  font-weight: 800;
  border-radius: 10px;
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}

.post-header-info {
  flex: 1;
  min-width: 0;

  h2 {
    font-size: 15px;
    font-weight: 700;
    color: #333;
    margin: 0;
    line-height: 1.4;

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }

  .post-date {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
    display: block;
  }
}

.post-arrow {
  color: #999;
  flex-shrink: 0;
  transition: transform 0.3s;

  svg {
    transition: transform 0.3s;
  }
}

.post-body {
  padding: 0 16px 20px;

  @media (min-width: 768px) {
    padding: 0 24px 24px;
  }
}

.post-image {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: auto;
    display: block;
  }
}

.post-text {
  font-size: 15px;
  line-height: 1.8;
  color: #444;

  :deep(p) {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.pin-icon) {
    margin-right: 4px;
  }

  @media (min-width: 768px) {
    font-size: 16px;
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
