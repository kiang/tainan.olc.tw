<script setup>
import data from "@/assets/JSON/data.json";
const dataJson = data;

function checkLength(array, index) {
  if (array.length === 0 || (array.length === 1 && index === 1)) return false;
  else return array[index].link;
}
</script>

<template>
  <div class="sticky-notes">
    <div class="speech-record">
      <h2>演講紀錄</h2>
      <div class="speech-record-topic">
        <h3>活動主題</h3>
        <h3>活動名稱</h3>
        <h3>日期</h3>
        <h3>相關資源</h3>
      </div>
      <div class="speech-record-container">
        <div
          class="speech-record-desktop"
          v-for="record in dataJson.data"
          :key="record.slides.link"
        >
          <div class="speech-record-content">
            <p>{{ record.slides.title }}</p>
            <p>{{ record.active }}</p>
            <p>{{ record.date }}</p>
            <div class="resources-content">
              <a
                target="_blank"
                :href="record.slides.link"
                class="tags tags--normal"
                >投影片下載</a
              >
              <a
                v-if="checkLength(record.ytVideos, 0)"
                target="_blank"
                :href="record.ytVideos[0].link"
                class="tags tags--normal"
                >影片連結</a
              >
              <a
                v-if="checkLength(record.ytVideos, 1)"
                target="_blank"
                :href="record.ytVideos[1].link"
                class="tags tags--normal"
                >影片連結</a
              >
            </div>
          </div>
        </div>
        <div
          class="speech-record-mobile"
          v-for="record in dataJson.data"
          :key="record.slides.link"
        >
          <div class="speech-record-topicNcontent">
            <h3>活動主題</h3>
            <p>{{ record.slides.title }}</p>
          </div>
          <div class="speech-record-topicNcontent">
            <h3>活動名稱</h3>
            <p>{{ record.active }}</p>
          </div>
          <div class="speech-record-topicNcontent">
            <h3>日期</h3>
            <p>{{ record.date }}</p>
          </div>
          <div class="speech-record-resources-topicNcontent">
            <h3>相關資源</h3>
            <div class="resources-content">
              <a
                target="_blank"
                :href="record.slides.link"
                class="tags tags--normal"
                >投影片下載</a
              >
              <a
                v-if="checkLength(record.ytVideos, 0)"
                target="_blank"
                :href="record.ytVideos[0].link"
                class="tags tags--normal"
                >影片連結</a
              >
              <a
                v-if="checkLength(record.ytVideos, 1)"
                target="_blank"
                :href="record.ytVideos[1].link"
                class="tags tags--normal"
                >影片連結</a
              >
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

    @media (min-width: 992px) {
      font-weight: 500;
    }
  }

  // 針對past-speech-record

  &-topic {
    display: none;

    @media (min-width: 992px) {
      margin-top: 53px;
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 3fr;
      gap: 30px;

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
        grid-template-columns: 2fr 2fr 1fr 3fr;
        align-items: center;
        border-bottom: white 1px solid;
        padding: 20px 0;
        gap: 30px;

        .resources-content {
          display: flex;
          flex-direction: row;
          // justify-content: space-between;
          gap: 10px;
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
    }

    .speech-record-topicNcontent {
      display: grid;
      grid-template-columns: 1fr 3fr;
    }

    .speech-record-resources-topicNcontent {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .resources-content {
        display: flex;
        flex-direction: row;
        gap: 9px;

        @media (min-width: 576px) {
          gap: 20px;
        }
        // justify-content: space-between;
      }
    }
  }
}
</style>
