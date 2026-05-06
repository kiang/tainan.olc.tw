<script setup>
import { RouterLink } from "vue-router";
</script>

<template>
  <main class="donate-page">
    <section class="page-header">
      <div class="header-content">
        <h1>支持江明宗</h1>
        <p class="subtitle">您的每一筆捐款，都是推動台南進步的力量</p>
      </div>
    </section>

    <section class="content-section">
      <div class="content-container">
        <div class="intro-box">
          <p class="intro-text">
            親愛的朋友們，謝謝您對江明宗的支持與鼓勵！💕 為了讓大家能更方便、更安心地為明宗助力，特別整理了最詳細的政治獻金劃撥程序說明。
          </p>
          <p class="intro-text mb-0">
            即使沒有轉帳帳號也沒關係，簡簡單單幾分鐘，就能為台南的未來出一份力！💪
          </p>
        </div>

        <h2 class="section-title">📝 政治獻金劃撥捐款 4 步驟完全攻略</h2>
        <p class="steps-intro">請至全台各地郵局臨櫃辦理，簡單 4 步驟輕鬆完成：</p>

        <div class="steps-container">
          <!-- Step 1 -->
          <div class="step-card">
            <div class="step-number">1️⃣</div>
            <div class="step-content">
              <h3>臨櫃填寫劃撥單</h3>
              <p>親自至郵局櫃檯拿取「劃撥儲金存款單」一份。</p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="step-card">
            <div class="step-number">2️⃣</div>
            <div class="step-content">
              <h3>正確填寫專戶帳號</h3>
              <p>在劃撥單「帳號」欄位內，填寫江明宗政治獻金專戶的劃撥帳號：<strong class="highlight">31658725</strong>。</p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="step-card">
            <div class="step-number">3️⃣</div>
            <div class="step-content">
              <h3>清晰填寫戶名與資料</h3>
              <p>在劃撥單「戶名」欄位內，請準確填寫專戶名稱：<br>
                <strong class="highlight-text">115年臺南市議員擬參選人江明宗政治獻金專戶</strong>
              </p>
              <div class="info-alert">
                同時，也請您在「寄款人」欄位詳細填寫您的<strong>姓名</strong>、<strong>身分證字號</strong>、<strong>聯絡電話</strong>及<strong>收據寄送地址</strong>，以便我們後續寄送收據喔！
              </div>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="step-card">
            <div class="step-number">4️⃣</div>
            <div class="step-content">
              <h3>完成存款並妥善保存收據</h3>
              <p>將填寫完成的劃撥單及現金交給郵局櫃檯人員完成辦理。辦理完成後，郵局人員會提供一份收據給您，請您妥善保存。我們收到劃撥資訊後，也會與您聯繫確認收據寄送事宜。</p>
            </div>
          </div>
        </div>

        <div class="action-container">
          <RouterLink to="/" class="btn-back">回到首頁</RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.donate-page {
  min-height: calc(100vh - 89.3px);
  background: #f8f9fa;
  
  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
}

.page-header {
  padding: 60px 20px;
  background: linear-gradient(135deg, #28c8c8 0%, #1a9a9a 100%);
  color: white;
  text-align: center;
  margin-bottom: 40px;
  
  .header-content {
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 36px;
    font-weight: 800;
    margin: 0 0 16px;
    letter-spacing: 2px;
    
    @media (min-width: 768px) {
      font-size: 48px;
    }
  }

  .subtitle {
    font-size: 18px;
    opacity: 0.9;
    margin: 0;
    
    @media (min-width: 768px) {
      font-size: 20px;
    }
  }
}

.content-section {
  padding: 0 20px 60px;
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

.intro-box {
  background: white;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  margin-bottom: 40px;
  
  .intro-text {
    font-size: 16px;
    line-height: 1.8;
    color: #444;
    margin-bottom: 16px;
    
    &.mb-0 {
      margin-bottom: 0;
    }
    
    @media (min-width: 768px) {
      font-size: 18px;
    }
  }
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0 0 16px;
  
  @media (min-width: 768px) {
    font-size: 28px;
  }
}

.steps-intro {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
  
  @media (min-width: 768px) {
    font-size: 18px;
  }
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.step-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  gap: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  }
  
  @media (max-width: 575px) {
    flex-direction: column;
    gap: 12px;
  }
}

.step-number {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.step-content {
  flex-grow: 1;
  
  h3 {
    font-size: 20px;
    font-weight: 700;
    color: #2c3e50;
    margin: 0 0 12px;
  }
  
  p {
    font-size: 16px;
    color: #555;
    line-height: 1.6;
    margin: 0;
  }
  
  .highlight {
    color: #e74c3c;
    font-size: 20px;
    background: #fdf2f1;
    padding: 2px 8px;
    border-radius: 4px;
    margin: 0 4px;
  }
  
  .highlight-text {
    display: inline-block;
    color: #1a9a9a;
    font-size: 18px;
    margin-top: 8px;
    padding: 8px 12px;
    background: #f0fafa;
    border-radius: 6px;
    border-left: 4px solid #28c8c8;
  }
}

.info-alert {
  margin-top: 16px;
  padding: 16px;
  background: #fff3cd;
  color: #856404;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.6;
  
  strong {
    color: #664d03;
    font-weight: 700;
  }
}

.action-container {
  text-align: center;
  margin-top: 40px;
}

.btn-back {
  display: inline-block;
  padding: 12px 32px;
  background: white;
  color: #666;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  border-radius: 50px;
  border: 1px solid #ddd;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
  }
}
</style>
