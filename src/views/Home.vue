<script setup>
import { ref } from "vue";
</script>

<template>
  <main class="front-page">
    <div class="container p-0">
      <div class="front-page-container">
        <div class="candidate">
          <div class="candidate-image">
            <img src="@/assets/images/kiang-with-name-big.png" alt="" />
          </div>
          <div class="candidate-information">
            <div class="declaration">
              <div class="oneTape">
                <img src="@/assets/images/type.png" alt="type" />
              </div>
              <div class="twoTape">
                <img src="@/assets/images/type.png" alt="type" />
              </div>
              <div class="content-container">
                <div class="content">
                  <h2>
                    用科技找回台南 400 年榮景，江明宗參選北區中西區議員宣言
                  </h2>
                  <p>
                    從登革熱地圖、口罩地圖到最近的好食券地圖，過去 6
                    年多的時間我一直嘗試用科技工具參與解決你我生活所面臨的問題，這些創作已經幫助了數百萬人，我有扎實的技術基礎可以讓科技不再只是口號，我希望把這個能力帶進台南市議會，從北區、中西區開始帶動台南科技發展！
                    <br /><br />
                    台灣民眾黨 柯文哲
                    主席提出的「共融社會、國家治理」主軸，期待台灣政治能夠從共容開始，逐步走向共融與共榮，我相當認同這樣的理念，只要願意站在台灣這塊土地上為共同的未來打拼，我們可以包容彼此立場、努力尋求共識，讓社會可以持續前進，而不是因為仇恨原地打轉。
                    <br /><br />
                    台南即將迎接 400
                    年的歷史里程碑，只是隨著時代演進，過去的榮景已經有些黯淡，在文化與美食之外我更在意這個地方如何走向下個
                    400
                    年，我也希望兩個孩子有機會在台南找到自己的未來，不一定要離鄉背井。
                    <br /><br />
                    北區、中西區有著最知名的府城歷史街區，我希望從這裡開始把台南打造成步行城市，提供居民與遊客更舒適的步行空間，透過公車與自行車接駁滿足遊客交通連結，運用公車
                    Bus 、自行車 Bike 與步行 Walk 的 BBW
                    精神去解決觀光熱區交通難題，讓觀光客能夠倍增，同時避免交通問題侵蝕台南的文化古蹟。
                    <br /><br />
                    台南是眾神之都，宮廟文化的傳承與現代化生活經常出現衝突，我認為要借鏡日本京都與台南普濟殿的經驗，讓原本分散進行的廟會活動可以集中資源打造成信仰與文化的嘉年華會，讓信仰與文化的傳承可以融入現代化生活中，擴大規模來吸引世界各地的信徒與觀光客共同參與！

                    <br /><br />
                    科技是我的本業，過去幾年脫離舒適圈走進政治領域，有幸在中央待過經濟部政策辦、在台南市政府服務時協助創設智慧城市辦公室，擔任台灣民眾黨北區、中西區主任期間也參與了許多直接服務民眾的陳情案，我已經準備好為更多民眾服務，因此爭取台灣民眾黨提名參選台南北區、中西區議員；科技也只是工具，我會善用這個工具聆聽大家的需求與期待，以資料治理為基礎監督台南市政府，進而讓台南可以走出下個
                    400 年的路，懇請北區、中西區的朋友給我這個機會！
                  </p>
                  <iframe
                    class="home-video"
                    src="https://www.youtube.com/embed/ShZTQWEmvHc"
                    title="怪咖系列 【真相地圖】完整正片 (The Debunker Full Movie)"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
          <div
            class="candidate-about-me-button"
            data-bs-toggle="modal"
            data-bs-target="#candidate-about-me-modal"
          >
            <img src="@/assets/images/about-me.png" alt="about me btn" />
          </div>
          <div
            class="modal fade"
            id="candidate-about-me-modal"
            tabindex="-1"
            aria-labelledby="exampleModalLabel"
            aria-hidden="true"
          >
            <div class="modal-dialog modal-fullscreen-sm-down">
              <div class="modal-content">
                <div class="modal-header">
                  <button
                    class="cross--black"
                    type="button"
                    data-bs-dismiss="modal"
                  ></button>
                </div>
                <div class="modal-body">
                  <div class="content">
                    <h2>
                      用科技找回台南 400 年榮景，江明宗參選北區中西區議員宣言
                    </h2>
                    <p>
                      從登革熱地圖、口罩地圖到最近的好食券地圖，過去 6
                      年多的時間我一直嘗試用科技工具參與解決你我生活所面臨的問題，這些創作已經幫助了數百萬人，我有扎實的技術基礎可以讓科技不再只是口號，我希望把這個能力帶進台南市議會，從北區、中西區開始帶動台南科技發展！
                      <br /><br />
                      台灣民眾黨 柯文哲
                      主席提出的「共融社會、國家治理」主軸，期待台灣政治能夠從共容開始，逐步走向共融與共榮，我相當認同這樣的理念，只要願意站在台灣這塊土地上為共同的未來打拼，我們可以包容彼此立場、努力尋求共識，讓社會可以持續前進，而不是因為仇恨原地打轉。
                      <br /><br />
                      台南即將迎接 400
                      年的歷史里程碑，只是隨著時代演進，過去的榮景已經有些黯淡，在文化與美食之外我更在意這個地方如何走向下個
                      400
                      年，我也希望兩個孩子有機會在台南找到自己的未來，不一定要離鄉背井。
                      <br /><br />
                      北區、中西區有著最知名的府城歷史街區，我希望從這裡開始把台南打造成步行城市，提供居民與遊客更舒適的步行空間，透過公車與自行車接駁滿足遊客交通連結，運用公車
                      Bus 、自行車 Bike 與步行 Walk 的 BBW
                      精神去解決觀光熱區交通難題，讓觀光客能夠倍增，同時避免交通問題侵蝕台南的文化古蹟。
                      <br /><br />
                      台南是眾神之都，宮廟文化的傳承與現代化生活經常出現衝突，我認為要借鏡日本京都與台南普濟殿的經驗，讓原本分散進行的廟會活動可以集中資源打造成信仰與文化的嘉年華會，讓信仰與文化的傳承可以融入現代化生活中，擴大規模來吸引世界各地的信徒與觀光客共同參與！

                      <br /><br />
                      科技是我的本業，過去幾年脫離舒適圈走進政治領域，有幸在中央待過經濟部政策辦、在台南市政府服務時協助創設智慧城市辦公室，擔任台灣民眾黨北區、中西區主任期間也參與了許多直接服務民眾的陳情案，我已經準備好為更多民眾服務，因此爭取台灣民眾黨提名參選台南北區、中西區議員；科技也只是工具，我會善用這個工具聆聽大家的需求與期待，以資料治理為基礎監督台南市政府，進而讓台南可以走出下個
                      400 年的路，懇請北區、中西區的朋友給我這個機會！
                    </p>
                    <iframe
                    class="home-video"
                    src="https://www.youtube.com/embed/ShZTQWEmvHc"
                    title="怪咖系列 【真相地圖】完整正片 (The Debunker Full Movie)"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
@import "../assets/scss/components/_cross";
@import "../assets/scss/components/_declaration";
.front-page-container {
  display: flex;
  height: calc(100vh - 89.3px);

  @media (min-width: 992px) {
    height: calc(100vh - 81.609px);
  }
}

.candidate {
  position: relative;
  display: flex;
  justify-content: space-around;
  flex-direction: row;

  @media (min-width: 992px) {
    margin: 0 40px;
  }
}

.candidate-image {
  position: relative;
  align-self: flex-end;

  img {
    object-fit: contain;
    width: 100%;
    // 讓圖片頂到最高
    // height: calc(100vh - 75px);
    // 小尺寸= 100vh - navbar高度 - 跟navbar距離的距離
    height: calc(100vh - 89.3px - 94.19px);

    @media (min-width: 992px) {
      height: calc(100vh - 81.609px);
    }
  }
}

.candidate-information {
  display: none;
  @media (min-width: 992px) {
    display: block;
    align-self: center;
    flex-basis: 880px;
  }
  @media (min-width: 1920px) {
    height: initial;
  }
}
.candidate-about-me-button {
  cursor: pointer;
  position: absolute;
  // button會因為畫面小距離不變的話會消失
  // left: 170px;
  // top: 50px;

  top: 10%;
  left: 55%;

  @media (min-width: 390px) {
    left: 55%;
    top: 5%;
  }

  img {
    width: 100%;
  }

  @media (min-width: 992px) {
    display: none;
  }
}

.home-video {
  width: 100%;
  @media (min-width: 992px) {
    height: 500px;
  }
  @media (min-width: 1920px) {
    height: 500px;
  }
}

// bootstrap
.candidate {
  .modal-content {
    background-color: $secondary-light;
    border-radius: 0;

    .modal-header {
      padding: 10px 20px;
      button {
        border: 1px solid transparent;
        background-color: transparent;

        &:focus-visible {
          outline: 1px solid transparent;
        }
      }
    }

    .modal-body {
      padding: 20px;
    }

    .content {
      .people-img-container {
        text-align: center;
        margin-bottom: 20px;
        img {
          width: 150px;
          height: 150px;
        }
      }
      h2 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 15px;
      }
      p {
        font-size: 16px;
        line-height: 23.17px;
      }

      .facebook-container {
        cursor: pointer;
        display: flex;
        justify-content: center;
        margin: 10px 0;
      }
    }
  }
}
</style>
