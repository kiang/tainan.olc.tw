<script setup>
import { ref } from "vue";
</script>

<template>
  <main class="politics-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <span class="hero-label">政見主張</span>
        <h1>用科技找回<br />台南 400 年榮景</h1>
        <p class="hero-description">
          以公民科技專業，結合資料治理與開放政府理念，<br class="hide-mobile" />
          為台南北區、中西區打造更美好的未來。
        </p>
      </div>
      <div class="hero-decoration">
        <div class="decoration-circle circle-1"></div>
        <div class="decoration-circle circle-2"></div>
        <div class="decoration-circle circle-3"></div>
      </div>
    </section>

    <!-- Core Policies -->
    <section class="policies-section">
      <div class="container">
        <div class="section-header">
          <span class="section-number">01</span>
          <h2>三大核心政見</h2>
        </div>

        <!-- Policy 1: Walking City -->
        <article class="policy-detail-card">
          <div class="policy-header">
            <div class="policy-icon walking-city">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.5 4a.5.5 0 0 1 .5.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H6a2 2 0 1 1-4 0h-.5A1.5 1.5 0 0 1 0 10.5v-5A1.5 1.5 0 0 1 1.5 4h10zM2.5 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                <path d="M4.416 3.223A1.5 1.5 0 0 1 5.5 4h6a1.5 1.5 0 0 1 1.5 1.5V6h-9v-.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 0 .5-.5v-.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 1-.5-.5v-.277a.5.5 0 0 1 .416-.5z"/>
              </svg>
            </div>
            <div class="policy-title-group">
              <span class="policy-number">政見 1</span>
              <h3>BBW 步行城市</h3>
              <p class="policy-tagline">Bus・Bike・Walk 三位一體的交通願景</p>
            </div>
          </div>
          <div class="policy-content">
            <p class="policy-intro">
              北區、中西區擁有最知名的府城歷史街區，我希望從這裡開始把台南打造成<strong>步行城市</strong>，
              提供居民與遊客更舒適的步行空間，讓觀光客能夠倍增，同時避免交通問題侵蝕台南的文化古蹟。
            </p>
            <div class="policy-points">
              <div class="point-item">
                <div class="point-icon bus">
                  <span>B</span>
                </div>
                <div class="point-content">
                  <h4>Bus 公車優化</h4>
                  <p>優化公車路網與班次，建立便捷的大眾運輸系統，讓居民與遊客都能輕鬆抵達各景點。</p>
                </div>
              </div>
              <div class="point-item">
                <div class="point-icon bike">
                  <span>B</span>
                </div>
                <div class="point-content">
                  <h4>Bike 自行車友善</h4>
                  <p>擴建自行車道網絡，增設 YouBike 站點，讓短程移動更加環保便利。</p>
                </div>
              </div>
              <div class="point-item">
                <div class="point-icon walk">
                  <span>W</span>
                </div>
                <div class="point-content">
                  <h4>Walk 步行空間</h4>
                  <p>拓寬人行道、改善騎樓連貫性，打造安全舒適的步行環境，讓府城古蹟巡禮成為享受。</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- Policy 2: Tech Governance -->
        <article class="policy-detail-card">
          <div class="policy-header">
            <div class="policy-icon tech-governance">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5 0a.5.5 0 0 1 .5.5V2h1V.5a.5.5 0 0 1 1 0V2h1V.5a.5.5 0 0 1 1 0V2h1V.5a.5.5 0 0 1 1 0V2A2.5 2.5 0 0 1 14 4.5h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14a2.5 2.5 0 0 1-2.5 2.5v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14A2.5 2.5 0 0 1 2 11.5H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2A2.5 2.5 0 0 1 4.5 2V.5A.5.5 0 0 1 5 0zm-.5 3A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 11.5 3h-7zM5 6.5A1.5 1.5 0 0 1 6.5 5h3A1.5 1.5 0 0 1 11 6.5v3A1.5 1.5 0 0 1 9.5 11h-3A1.5 1.5 0 0 1 5 9.5v-3zM6.5 6a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
              </svg>
            </div>
            <div class="policy-title-group">
              <span class="policy-number">政見 2</span>
              <h3>科技治理</h3>
              <p class="policy-tagline">以資料為基礎，讓政策制定更透明有效</p>
            </div>
          </div>
          <div class="policy-content">
            <p class="policy-intro">
              科技是我的本業，過去開發超過 <strong>100 個公民科技專案</strong>，包含口罩地圖、登革熱地圖等，
              幫助數百萬人解決生活問題。我要把這份專業帶進議會，用科技監督市政、服務市民。
            </p>
            <div class="policy-features">
              <div class="feature-item">
                <div class="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
                  </svg>
                </div>
                <h4>資料治理</h4>
                <p>建立開放資料平台，讓市政資訊公開透明，市民可以隨時監督</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                  </svg>
                </div>
                <h4>數位服務</h4>
                <p>推動市政服務數位化，讓民眾在家就能辦理各項申請</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                  </svg>
                </div>
                <h4>科技教育</h4>
                <p>推動數位素養教育，縮小城鄉與世代的數位落差</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                    <path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                    <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
                  </svg>
                </div>
                <h4>公民參與</h4>
                <p>建立線上陳情與建議平台，讓市民聲音能被聽見並追蹤處理進度</p>
              </div>
            </div>
          </div>
        </article>

        <!-- Policy 3: Cultural Heritage -->
        <article class="policy-detail-card">
          <div class="policy-header">
            <div class="policy-icon cultural-heritage">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.5 10c-.276 0-.5-.448-.5-1s.224-1 .5-1 .5.448.5 1-.224 1-.5 1z"/>
                <path d="M10.828.122A.5.5 0 0 1 11 .5V1h.5A1.5 1.5 0 0 1 13 2.5V15h1.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1H3V1.5a.5.5 0 0 1 .43-.495l7-1a.5.5 0 0 1 .398.117zM11.5 2H11v13h1V2.5a.5.5 0 0 0-.5-.5zM4 1.934V15h6V1.077l-6 .857z"/>
              </svg>
            </div>
            <div class="policy-title-group">
              <span class="policy-number">政見 3</span>
              <h3>文化傳承</h3>
              <p class="policy-tagline">讓信仰與文化融入現代生活</p>
            </div>
          </div>
          <div class="policy-content">
            <p class="policy-intro">
              台南是<strong>眾神之都</strong>，宮廟文化的傳承與現代化生活經常出現衝突。
              我認為要借鏡日本京都與台南普濟殿的經驗，讓傳統與現代共榮共存。
            </p>
            <div class="policy-highlights">
              <div class="highlight-item">
                <div class="highlight-number">01</div>
                <div class="highlight-content">
                  <h4>廟會嘉年華</h4>
                  <p>將分散的廟會活動集中資源，打造成信仰與文化的嘉年華會，擴大規模吸引世界各地的信徒與觀光客共同參與。</p>
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-number">02</div>
                <div class="highlight-content">
                  <h4>古蹟活化</h4>
                  <p>結合科技與文創，讓古蹟不只是靜態展示，而是能與現代生活互動的活歷史。</p>
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-number">03</div>
                <div class="highlight-content">
                  <h4>青年傳承</h4>
                  <p>鼓勵年輕世代參與傳統文化活動，透過創新形式讓文化傳承不再與生活脫節。</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Declaration Section -->
    <section class="declaration-section">
      <div class="container">
        <div class="section-header">
          <span class="section-number">02</span>
          <h2>參選宣言</h2>
        </div>
        <div class="declaration-card">
          <div class="declaration-content">
            <p>
              從登革熱地圖、口罩地圖到最近的好食券地圖，過去 6
              年多的時間我一直嘗試用科技工具參與解決你我生活所面臨的問題，這些創作已經幫助了數百萬人，我有扎實的技術基礎可以讓科技不再只是口號，我希望把這個能力帶進台南市議會，從北區、中西區開始帶動台南科技發展！
            </p>
            <p>
              台南即將迎接 400
              年的歷史里程碑，只是隨著時代演進，過去的榮景已經有些黯淡，在文化與美食之外我更在意這個地方如何走向下個
              400
              年，我也希望兩個孩子有機會在台南找到自己的未來，不一定要離鄉背井。
            </p>
            <p>
              科技是我的本業，過去幾年脫離舒適圈走進政治領域，有幸在中央待過經濟部政策辦、在台南市政府服務時協助創設智慧城市辦公室。我已經準備好為更多民眾服務，科技也只是工具，我會善用這個工具聆聽大家的需求與期待，以資料治理為基礎監督台南市政府，進而讓台南可以走出下個
              400 年的路，懇請北區、中西區的朋友給我這個機會！
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Video Section -->
    <section class="video-section">
      <div class="container">
        <div class="section-header">
          <span class="section-number">03</span>
          <h2>競選影片</h2>
        </div>
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
      </div>
    </section>

    <!-- Policy Image -->
    <section class="policy-image-section">
      <div class="container">
        <img
          src="@/assets/images/politics.jpg"
          alt="政見圖"
          class="policy-image"
        />
      </div>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.politics-page {
  min-height: calc(100vh - 89.3px);
  background: #f8f9fa;

  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.hide-mobile {
  display: none;
  @media (min-width: 768px) {
    display: inline;
  }
}

// Hero Section
.hero-section {
  position: relative;
  background: linear-gradient(135deg, #28c8c8 0%, #1a8a8a 100%);
  padding: 60px 20px;
  text-align: center;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 80px 40px;
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 700px;
  margin: 0 auto;
}

.hero-label {
  display: inline-block;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 30px;
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.hero-section h1 {
  color: white;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 20px;

  @media (min-width: 768px) {
    font-size: 48px;
  }
}

.hero-description {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  line-height: 1.8;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 18px;
  }
}

.hero-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);

  &.circle-1 {
    width: 300px;
    height: 300px;
    top: -100px;
    right: -100px;
  }

  &.circle-2 {
    width: 200px;
    height: 200px;
    bottom: -50px;
    left: -50px;
  }

  &.circle-3 {
    width: 150px;
    height: 150px;
    top: 50%;
    left: 10%;
    opacity: 0.5;
  }
}

// Section Header
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;

  .section-number {
    font-size: 48px;
    font-weight: 800;
    color: rgba(40, 200, 200, 0.2);
    line-height: 1;

    @media (min-width: 768px) {
      font-size: 64px;
    }
  }

  h2 {
    font-size: 28px;
    font-weight: 700;
    color: #333;
    margin: 0;

    @media (min-width: 768px) {
      font-size: 32px;
    }
  }
}

// Policies Section
.policies-section {
  padding: 60px 0;

  @media (min-width: 768px) {
    padding: 80px 0;
  }
}

// Policy Detail Card
.policy-detail-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  margin-bottom: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    padding: 40px;
  }
}

.policy-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 28px;

  @media (min-width: 768px) {
    align-items: center;
  }
}

.policy-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  flex-shrink: 0;

  &.walking-city {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  &.tech-governance {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    color: white;
  }

  &.cultural-heritage {
    background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
    color: white;
  }
}

.policy-title-group {
  flex: 1;

  .policy-number {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: #28c8c8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  h3 {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin: 0 0 8px;

    @media (min-width: 768px) {
      font-size: 28px;
    }
  }

  .policy-tagline {
    font-size: 15px;
    color: #666;
    margin: 0;
  }
}

.policy-content {
  .policy-intro {
    font-size: 16px;
    line-height: 1.9;
    color: #444;
    margin: 0 0 28px;

    strong {
      color: #28c8c8;
    }

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }
}

// BBW Points
.policy-points {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.point-item {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;

  .point-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 800;
    color: white;
    flex-shrink: 0;

    &.bus {
      background: #667eea;
    }

    &.bike {
      background: #764ba2;
    }

    &.walk {
      background: #9b59b6;
    }
  }

  .point-content {
    h4 {
      font-size: 16px;
      font-weight: 700;
      color: #333;
      margin: 0 0 6px;
    }

    p {
      font-size: 14px;
      line-height: 1.7;
      color: #666;
      margin: 0;
    }
  }
}

// Policy Features Grid
.policy-features {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.feature-item {
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  text-align: center;

  .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(40, 200, 200, 0.1);
    color: #28c8c8;
    border-radius: 12px;
    margin: 0 auto 12px;
  }

  h4 {
    font-size: 16px;
    font-weight: 700;
    color: #333;
    margin: 0 0 8px;
  }

  p {
    font-size: 13px;
    line-height: 1.6;
    color: #666;
    margin: 0;
  }
}

// Policy Highlights
.policy-highlights {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.highlight-item {
  display: flex;
  gap: 20px;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;

  .highlight-number {
    font-size: 32px;
    font-weight: 800;
    color: rgba(235, 51, 73, 0.2);
    line-height: 1;
    flex-shrink: 0;
  }

  .highlight-content {
    h4 {
      font-size: 17px;
      font-weight: 700;
      color: #333;
      margin: 0 0 8px;
    }

    p {
      font-size: 14px;
      line-height: 1.7;
      color: #666;
      margin: 0;
    }
  }
}

// Declaration Section
.declaration-section {
  padding: 0 0 60px;

  @media (min-width: 768px) {
    padding: 0 0 80px;
  }
}

.declaration-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #28c8c8;

  @media (min-width: 768px) {
    padding: 40px;
  }
}

.declaration-content {
  p {
    font-size: 16px;
    line-height: 2;
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

// Video Section
.video-section {
  padding: 0 0 60px;

  @media (min-width: 768px) {
    padding: 0 0 80px;
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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: #333;
    margin: 0;
    padding: 16px;
    text-align: center;
  }
}

.video-wrapper {
  position: relative;
  padding-top: 56.25%;

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

// Policy Image Section
.policy-image-section {
  padding: 0 0 60px;

  @media (min-width: 768px) {
    padding: 0 0 80px;
  }

  .policy-image {
    width: 100%;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }
}
</style>
