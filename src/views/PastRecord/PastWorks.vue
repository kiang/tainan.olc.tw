<script setup>
import data from "@/assets/JSON/works.json";

const { data: worksList } = data;
</script>

<template>
  <div class="sticky-notes">
    <h2 class="past-works-topic">過去作品</h2>
    <div
      class="past-works"
      v-masonry="containerId"
      transition-duration="0.3s"
      item-selector=".project"
    >
      <div
        class="project"
        v-masonry-tile
        v-for="item in worksList"
        :key="item.portfolio.link"
      >
        <img class="project-img" :src="item.portfolio.imgUrl" />

        <div class="project-content">
          <a :href="item.portfolio.link" class="theme" target="_blank">
            <h3>{{ item.portfolio.title }}</h3>
            <img src="@/assets/images/github-icon.png" />
          </a>
          <div class="bottom-line"></div>
          <div class="news-title">相關報導</div>
          <div class="news-box">
            <template v-for="news in item.news" :key="news.link">
              <a
                class="news-item"
                v-if="news.media"
                :href="news.link"
                target="_blank"
                >{{ news.media }}</a
              >
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "@/assets/scss/layout/past-record-page";
@import "@/assets/scss/components/sticky-notes";

@media (min-width: 768px) {
  .past-works:after {
    content: " ";
    display: block;
    clear: both;
  }
}

h2.past-works-topic {
  margin: 14px 0 33px;
  font-weight: 700;
  text-align: center;
  font-size: 16px;

  @media (min-width: 992px) {
    margin: 24px 0 54px;
    font-size: 36px;
  }
}

.past-works {
  margin: 0 40px;

  p {
    font-size: 14px;
    font-weight: 500;
  }

  .project {
    margin-bottom: 10px;
    width: 100%;
    background-color: #fff;
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
    margin-bottom: 21px;

    @media (min-width: 992px) {
      width: 40%;
      border-radius: 5px;
      margin: 0 5% 40px 5%;
      overflow: hidden;
    }

    @media (min-width: 1232px) {
      width: 31.3%;
      float: left;
      border-radius: 5px;

      overflow: hidden;
      margin: 0 1% 40px 1%;
    }

    .project-img {
      width: 100%;
    }
    .project-content {
      padding: 16px;

      .theme {
        display: flex;
        align-items: center;
        h3 {
          font-size: 16px;
          font-weight: 500;
          color: #0275d8;
        }

        img {
          width: 17px;
          height: 15px;
          margin-left: 3px;
        }
      }

      .bottom-line {
        width: 100%;
        height: 1px;
        margin-top: 8px;
        background-color: #d9d9d9;
      }

      .news-title {
        margin: 8px 0;
        font-size: 14px;
        font-weight: 400;
        color: #666;
      }

      .news-box {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .news-item {
          padding: 8px 15px;
          font-size: 14px;
          font-weight: 400;
          background-color: #28c8c8;
          color: #fff;
          border-radius: 4px;
        }
      }
    }
  }
}
</style>
