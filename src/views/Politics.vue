<script setup>
import { ref } from "vue";
</script>

<template>
  <main class="politics-page">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <h1>政見</h1>
        <p class="subtitle">用科技找回台南 400 年榮景</p>
      </div>

      <!-- Declaration Section -->
      <section class="declaration-section">
        <div class="declaration-card">
          <h2>江明宗參選北區中西區議員宣言</h2>

          <div class="declaration-content">
            <p>
              從登革熱地圖、口罩地圖到最近的好食券地圖，過去 6
              年多的時間我一直嘗試用科技工具參與解決你我生活所面臨的問題，這些創作已經幫助了數百萬人，我有扎實的技術基礎可以讓科技不再只是口號，我希望把這個能力帶進台南市議會，從北區、中西區開始帶動台南科技發展！
            </p>
            <p>
              台灣民眾黨 柯文哲
              主席提出的「共融社會、國家治理」主軸，期待台灣政治能夠從共容開始，逐步走向共融與共榮，我相當認同這樣的理念，只要願意站在台灣這塊土地上為共同的未來打拼，我們可以包容彼此立場、努力尋求共識，讓社會可以持續前進，而不是因為仇恨原地打轉。
            </p>
            <p>
              台南即將迎接 400
              年的歷史里程碑，只是隨著時代演進，過去的榮景已經有些黯淡，在文化與美食之外我更在意這個地方如何走向下個
              400
              年，我也希望兩個孩子有機會在台南找到自己的未來，不一定要離鄉背井。
            </p>
            <p>
              北區、中西區有著最知名的府城歷史街區，我希望從這裡開始把台南打造成步行城市，提供居民與遊客更舒適的步行空間，透過公車與自行車接駁滿足遊客交通連結，運用公車
              Bus 、自行車 Bike 與步行 Walk 的 BBW
              精神去解決觀光熱區交通難題，讓觀光客能夠倍增，同時避免交通問題侵蝕台南的文化古蹟。
            </p>
            <p>
              台南是眾神之都，宮廟文化的傳承與現代化生活經常出現衝突，我認為要借鏡日本京都與台南普濟殿的經驗，讓原本分散進行的廟會活動可以集中資源打造成信仰與文化的嘉年華會，讓信仰與文化的傳承可以融入現代化生活中，擴大規模來吸引世界各地的信徒與觀光客共同參與！
            </p>
            <p>
              科技是我的本業，過去幾年脫離舒適圈走進政治領域，有幸在中央待過經濟部政策辦、在台南市政府服務時協助創設智慧城市辦公室，擔任台灣民眾黨北區、中西區主任期間也參與了許多直接服務民眾的陳情案，我已經準備好為更多民眾服務，因此爭取台灣民眾黨提名參選台南北區、中西區議員；科技也只是工具，我會善用這個工具聆聽大家的需求與期待，以資料治理為基礎監督台南市政府，進而讓台南可以走出下個
              400 年的路，懇請北區、中西區的朋友給我這個機會！
            </p>
          </div>
        </div>
      </section>

      <!-- Policy Image -->
      <section class="policy-image-section">
        <img
          src="@/assets/images/politics.jpg"
          alt="政見"
          class="policy-image"
        />
      </section>

      <!-- Video Section -->
      <section class="video-section">
        <h2>競選影片</h2>
        <div class="video-grid">
          <div class="video-card">
            <div class="video-wrapper">
              <iframe
                src="https://www.youtube.com/embed/QqGQ21UenCI"
                title="競選廣告"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
            <h3>競選廣告</h3>
          </div>
          <div class="video-card">
            <div class="video-wrapper">
              <iframe
                src="https://www.youtube.com/embed/ShZTQWEmvHc"
                title="怪咖系列 【真相地圖】完整正片"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
            <h3>怪咖系列【真相地圖】完整正片</h3>
          </div>
        </div>
      </section>

      <!-- Key Policies -->
      <section class="policies-section">
        <h2>核心政見</h2>
        <div class="policies-grid">
          <div class="policy-card">
            <div class="policy-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
              </svg>
            </div>
            <h3>步行城市</h3>
            <p>打造台南成為步行城市，提供居民與遊客更舒適的步行空間，運用 BBW（Bus、Bike、Walk）精神解決觀光熱區交通難題。</p>
          </div>
          <div class="policy-card">
            <div class="policy-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484-.08.08-.162.158-.242.234-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/>
              </svg>
            </div>
            <h3>科技治理</h3>
            <p>以資料治理為基礎監督台南市政府，運用科技工具聆聽民眾需求，讓政策制定更加透明與有效。</p>
          </div>
          <div class="policy-card">
            <div class="policy-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7 8a3.5 3.5 0 0 1 3.5 3.555.5.5 0 0 0 .625.492A1.503 1.503 0 0 1 13 13.5a1.5 1.5 0 0 1-1.5 1.5H3a2 2 0 1 1 .1-3.998.5.5 0 0 0 .509-.375A3.502 3.502 0 0 1 7 8zm4.473 3a4.5 4.5 0 0 0-8.72-.99A3 3 0 0 0 3 16h8.5a2.5 2.5 0 0 0 0-5h-.027z"/>
                <path d="M11.286 1.778a.5.5 0 0 0-.565-.755 4.595 4.595 0 0 0-3.18 5.003 5.46 5.46 0 0 1 1.055.209A3.603 3.603 0 0 1 9.83 2.617a4.593 4.593 0 0 0 4.31 5.744 3.576 3.576 0 0 1-2.241.634c.162.317.295.652.394 1a4.59 4.59 0 0 0 3.45-2.104 4.6 4.6 0 0 0-4.458-5.113z"/>
              </svg>
            </div>
            <h3>文化傳承</h3>
            <p>借鏡日本京都與台南普濟殿經驗，將廟會活動集中資源打造成信仰與文化的嘉年華會，吸引世界各地信徒與觀光客共同參與。</p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.politics-page {
  min-height: calc(100vh - 89.3px);
  background: #f8f9fa;
  padding-bottom: 60px;

  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

// Page Header
.page-header {
  text-align: center;
  padding: 40px 0 30px;

  @media (min-width: 768px) {
    padding: 60px 0 40px;
  }

  h1 {
    font-size: 36px;
    font-weight: 800;
    color: #333;
    margin: 0 0 12px;

    @media (min-width: 768px) {
      font-size: 48px;
    }
  }

  .subtitle {
    font-size: 18px;
    color: #28c8c8;
    font-weight: 600;
    margin: 0;

    @media (min-width: 768px) {
      font-size: 20px;
    }
  }
}

// Declaration Section
.declaration-section {
  margin-bottom: 40px;
}

.declaration-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  @media (min-width: 768px) {
    padding: 40px;
  }

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #333;
    margin: 0 0 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #28c8c8;

    @media (min-width: 768px) {
      font-size: 24px;
    }
  }
}

.declaration-content {
  p {
    font-size: 16px;
    line-height: 1.9;
    color: #444;
    margin: 0 0 20px;

    &:last-child {
      margin-bottom: 0;
    }

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }
}

// Policy Image Section
.policy-image-section {
  margin-bottom: 40px;

  .policy-image {
    width: 100%;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }
}

// Video Section
.video-section {
  margin-bottom: 40px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin: 0 0 24px;
    text-align: center;

    @media (min-width: 768px) {
      font-size: 28px;
    }
  }
}

.video-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.video-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    padding: 16px;
    text-align: center;
  }
}

.video-wrapper {
  position: relative;
  padding-top: 56.25%; // 16:9 aspect ratio

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

// Policies Section
.policies-section {
  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin: 0 0 24px;
    text-align: center;

    @media (min-width: 768px) {
      font-size: 28px;
    }
  }
}

.policies-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.policy-card {
  background: white;
  border-radius: 16px;
  padding: 30px 24px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .policy-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(40, 200, 200, 0.1);
    color: #28c8c8;
    border-radius: 16px;
    margin: 0 auto 16px;
  }

  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin: 0 0 12px;
  }

  p {
    font-size: 14px;
    line-height: 1.7;
    color: #666;
    margin: 0;
  }
}
</style>
