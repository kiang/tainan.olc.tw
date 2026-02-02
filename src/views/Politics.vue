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
              <div class="content-container politics">
                <div class="content">
                  <img
                    src="@/assets/images/politics.jpg"
                    alt="politics"
                    class="politics-img"
                  />
                  <iframe
                    class="politics-video"
                    src="https://www.youtube.com/embed/QqGQ21UenCI"
                    title="YouTube video player"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
          <div
            class="candidate-about-politics-button"
            data-bs-toggle="modal"
            data-bs-target="#candidate-about-politics-modal"
          >
            <img
              src="@/assets/images/about-politics.png"
              alt="about politics btn"
            />
          </div>
          <div
            class="modal fade"
            id="candidate-about-politics-modal"
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
                    <img
                      src="@/assets/images/politics.jpg"
                      alt="politics"
                      class="politics-img"
                    />
                    <iframe
                      class="politics-video"
                      src="https://www.youtube.com/embed/QqGQ21UenCI"
                      title="YouTube video player"
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
  // @media (min-width: 1920px) {
  //   height: initial;
  // }
}

.politics-img {
  object-fit: contain;
  width: 100%;
}

.politics-video {
  width: 100%;
  @media (min-width: 992px) {
    height: 500px;
  }
  @media (min-width: 1920px) {
    height: 500px;
  }
}

.candidate-about-politics-button {
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
