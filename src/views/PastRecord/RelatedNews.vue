<script setup>
import data from "@/assets/JSON/news.json";

const { data: newsList } = data;
</script>

<template>
  <div class="sticky-notes">
    <div class="related-news">
      <h2>相關新聞</h2>
      <div class="related-news-container">
        <a
          target="_blank"
          class="news-item"
          v-for="item in newsList"
          :key="item.link"
          :href="item.link"
          ><p>
            {{ item.title }}<span>-{{ item.date }}</span>
          </p>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import "@/assets/scss/layout/past-record-page";
@import "@/assets/scss/components/sticky-notes";

.related-news {
  padding: 14px 20px;
  @media (min-width: 768px) {
    padding: 24px 40px;
  }

  h2 {
    font-weight: 700;
    text-align: center;
    margin-bottom: 33px;
    font-size: 16px;

    @media (min-width: 768px) {
      margin-bottom: 54px;
      font-size: 36px;
    }
  }

  p {
    font-size: 14px;
    font-weight: 500;
  }

  &-container {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 8px;

    @media (min-width: 768px) {
      flex-direction: row;
      gap: 16px;
    }

    .news-item {
      align-self: flex-start;
      padding: 10px 15px;
      font-size: 14px;
      font-weight: 400;
      background-color: #28c8c8;
      color: #fff;
      border-radius: 4px;

      &:hover {
        background-color: $primary;
      }
      span {
        display: block;
      }
    }
  }
}
</style>
