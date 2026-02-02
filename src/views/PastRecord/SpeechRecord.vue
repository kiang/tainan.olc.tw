<script setup>
import { computed } from "vue";
import talksData from "@/assets/JSON/talks.json";

const SLIDES_BASE_URL = "https://kiang.github.io/";

// Transform and sort talks by date (newest first)
const talks = computed(() => {
  return talksData.talks
    .filter((talk) => talk.title) // Filter out empty entries
    .map((talk) => ({
      title: typeof talk.title === "object" ? talk.title.zh : talk.title,
      event: typeof talk.event === "object" ? talk.event.zh : talk.event,
      date: formatDate(talk.date),
      rawDate: talk.date,
      slidesUrl: getSlidesUrl(talk.slides),
      links: talk.links || [],
    }))
    .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
});

// Stats
const totalTalks = computed(() => talks.value.length);
const yearsActive = computed(() => {
  const years = new Set(talks.value.map((t) => t.rawDate.substring(0, 4)));
  return years.size;
});

function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.substring(0, 4)}/${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`;
}

function getSlidesUrl(slides) {
  if (!slides) return null;
  if (slides.startsWith("http")) return slides;
  return SLIDES_BASE_URL + slides;
}

function getLinkLabel(link) {
  if (link.title) {
    return typeof link.title === "object" ? link.title.zh : link.title;
  }
  // Determine label based on URL
  if (link.url.includes("youtube.com") || link.url.includes("youtu.be")) {
    return "影片";
  }
  if (link.url.includes("facebook.com")) {
    return "直播";
  }
  if (link.url.includes("hackmd")) {
    return "筆記";
  }
  return "連結";
}
</script>

<template>
  <div class="speech-record-page">
    <!-- Stats Banner -->
    <div class="stats-banner">
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-number">{{ totalTalks }}</div>
          <div class="stat-label">場演講</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ yearsActive }}</div>
          <div class="stat-label">年經驗</div>
        </div>
      </div>
    </div>

    <div class="sticky-notes">
      <div class="speech-record">
        <h2>演講紀錄</h2>

        <!-- Desktop Header -->
        <div class="speech-record-topic">
          <h3>活動主題</h3>
          <h3>活動名稱</h3>
          <h3>日期</h3>
          <h3>相關資源</h3>
        </div>

        <div class="speech-record-container">
          <!-- Desktop View -->
          <div
            class="speech-record-desktop"
            v-for="(record, index) in talks"
            :key="index"
          >
            <div class="speech-record-content">
              <p class="title">{{ record.title || '-' }}</p>
              <p>{{ record.event }}</p>
              <p>{{ record.date }}</p>
              <div class="resources-content">
                <a
                  v-if="record.slidesUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :href="record.slidesUrl"
                  class="tags tags--normal"
                >投影片</a>
                <a
                  v-for="(link, linkIndex) in record.links"
                  :key="linkIndex"
                  target="_blank"
                  rel="noopener noreferrer"
                  :href="link.url"
                  class="tags tags--normal"
                >{{ getLinkLabel(link) }}</a>
              </div>
            </div>
          </div>

          <!-- Mobile View -->
          <div
            class="speech-record-mobile"
            v-for="(record, index) in talks"
            :key="'mobile-' + index"
          >
            <div class="speech-record-topicNcontent">
              <h3>活動主題</h3>
              <p>{{ record.title || '-' }}</p>
            </div>
            <div class="speech-record-topicNcontent">
              <h3>活動名稱</h3>
              <p>{{ record.event }}</p>
            </div>
            <div class="speech-record-topicNcontent">
              <h3>日期</h3>
              <p>{{ record.date }}</p>
            </div>
            <div class="speech-record-resources-topicNcontent">
              <h3>相關資源</h3>
              <div class="resources-content">
                <a
                  v-if="record.slidesUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :href="record.slidesUrl"
                  class="tags tags--normal"
                >投影片</a>
                <a
                  v-for="(link, linkIndex) in record.links"
                  :key="linkIndex"
                  target="_blank"
                  rel="noopener noreferrer"
                  :href="link.url"
                  class="tags tags--normal"
                >{{ getLinkLabel(link) }}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "@/assets/scss/layout/past-record-page";
@import "@/assets/scss/components/sticky-notes";
@import "@/assets/scss/components/tags";

.speech-record-page {
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
    gap: 40px;
    max-width: 400px;
    margin: 0 auto;

    @media (min-width: 768px) {
      gap: 60px;
    }
  }

  .stat-item {
    text-align: center;

    .stat-number {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;

      @media (min-width: 768px) {
        font-size: 42px;
      }
    }

    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 4px;
    }
  }
}

.speech-record {
  padding: 14px 20px;

  @media (min-width: 992px) {
    padding: 24px 40px;
  }

  h2 {
    font-weight: 700;
    text-align: center;
    margin-bottom: 13px;
    font-size: 16px;

    @media (min-width: 992px) {
      font-size: 36px;
      margin-bottom: 33px;
    }
  }

  p {
    font-size: 14px;
    font-weight: 400;
    word-break: break-word;

    @media (min-width: 992px) {
      font-weight: 500;
    }

    &.title {
      font-weight: 600;
    }
  }

  &-topic {
    display: none;

    @media (min-width: 992px) {
      margin-top: 53px;
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 2fr;
      gap: 20px;

      h3 {
        font-size: 16px;
        font-weight: 700;
      }
    }
  }

  &-desktop {
    display: none;

    @media (min-width: 992px) {
      display: block;

      .speech-record-content {
        display: grid;
        grid-template-columns: 2fr 2fr 1fr 2fr;
        align-items: center;
        border-bottom: white 1px solid;
        padding: 16px 0;
        gap: 20px;

        .resources-content {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      }
    }
  }

  &-mobile {
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-bottom: #0000001a 1px solid;
    padding: 20px 0;

    @media (min-width: 992px) {
      display: none;
    }

    h3 {
      font-size: 14px;
      font-weight: 700;
      line-height: 20.27px;
      flex-shrink: 0;
      width: 70px;
    }

    .speech-record-topicNcontent {
      display: flex;
      gap: 12px;

      p {
        flex: 1;
      }
    }

    .speech-record-resources-topicNcontent {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .resources-content {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  }
}
</style>
