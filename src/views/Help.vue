<script setup>
import { RouterLink } from "vue-router";

const googleFormBaseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdjxtlIlumA2pIiVpSm_ItW6ebaRhVBcZvj6PpaPUPWOTQGzg/viewform";

function buildFormUrl(prefill) {
  const params = new URLSearchParams({
    "usp": "pp_url",
    "entry.1683067847": "其他事項",
    "entry.1608282544": prefill,
    "entry.8069441": "no",
    "entry.329095753": "no",
    "entry.878731854": "no",
    "entry.158869420": "no",
    "entry.1072963415": "no",
  });
  return `${googleFormBaseUrl}?${params.toString()}`;
}
</script>

<template>
  <main class="help-page">
    <section class="page-header">
      <div class="header-content">
        <h1>幫助明宗</h1>
        <p class="subtitle">選舉不是一個人的事<br>每一份支持都是改變台南的力量</p>
      </div>
    </section>

    <section class="content-section">
      <div class="content-container">

        <!-- Quick action cards -->
        <div class="quick-actions">
          <RouterLink :to="{ name: 'Donate' }" class="action-card action-donate">
            <span class="action-emoji">&#10084;&#65039;</span>
            <span class="action-label">捐款支持</span>
          </RouterLink>
          <a :href="buildFormUrl('我想提供免費廣告空間\n地址：\n可提供的位置描述（牆面/圍籬/空地）：\n聯絡電話：')" target="_blank" rel="noopener" class="action-card action-space">
            <span class="action-emoji">&#128204;</span>
            <span class="action-label">提供空間</span>
          </a>
          <a :href="buildFormUrl('我想舉辦客廳會\n希望的時間：\n地點（地址或描述）：\n預計人數：\n聯絡電話：')" target="_blank" rel="noopener" class="action-card action-meeting">
            <span class="action-emoji">&#127969;</span>
            <span class="action-label">客廳會</span>
          </a>
          <a :href="buildFormUrl('我想當志工\n有興趣的工作（可複選）：發放文宣 / 舉牌 / 拍照錄影 / 宣講 / 場地佈置 / 後勤\n可以參與的時段：\n聯絡電話：')" target="_blank" rel="noopener" class="action-card action-volunteer">
            <span class="action-emoji">&#9994;</span>
            <span class="action-label">當志工</span>
          </a>
        </div>

        <!-- Intro -->
        <div class="intro-box">
          <p>
            參選需要龐大的資源，但我選擇不接受財團的資助，因此更需要每一位市民朋友的支持。不論是金錢、空間、時間或行動，你的每一份參與都讓我們離改變更近一步。
          </p>
        </div>

        <!-- Donate -->
        <div class="help-item">
          <div class="help-item-header">
            <span class="item-number">01</span>
            <h2>捐款支持</h2>
          </div>
          <p>
            選舉需要印製文宣、租借場地、製作看板，這些都需要經費。小額捐款是最直接的支持方式，每一塊錢都代表你對理念的認同。依據《政治獻金法》規定，個人每年對同一擬參選人捐贈總額不得超過10萬元，我們會開立正式收據，捐款可列舉為綜合所得稅扣除額。
          </p>
          <RouterLink :to="{ name: 'Donate' }" class="help-btn">前往捐款頁面</RouterLink>
        </div>

        <!-- Ad Space -->
        <div class="help-item">
          <div class="help-item-header">
            <span class="item-number">02</span>
            <h2>免費廣告空間</h2>
          </div>
          <p>
            如果你的住家、店面、工廠或私有空地位於北區或中西區，而且面向人行道或馬路，歡迎提供牆面、圍籬或空地讓我們放置競選看板或布條。這是讓更多鄰居認識我們最有效的方式之一，不需要花費任何金錢，只需要你的一面牆或一塊空地。我們會負責安裝與後續拆除，不會造成任何損壞。
          </p>
          <a :href="buildFormUrl('我想提供免費廣告空間\n地址：\n可提供的位置描述（牆面/圍籬/空地）：\n聯絡電話：')" target="_blank" rel="noopener" class="help-btn">我要提供空間</a>
        </div>

        <!-- Living Room Meeting -->
        <div class="help-item">
          <div class="help-item-header">
            <span class="item-number">03</span>
            <h2>客廳會</h2>
          </div>
          <p>
            「客廳會」是最有溫度的民主參與方式。邀請你的鄰居、朋友、同事到家裡坐坐，我會親自到場和大家聊聊在地的需求與想法。不需要華麗的場地，你家的客廳、社區的活動中心、甚至巷口的大樹下都可以。5 個人、10 個人都好，重要的是面對面的交流。你只需要提供場地和邀請朋友，其餘的交給我們來安排。
          </p>
          <a :href="buildFormUrl('我想舉辦客廳會\n希望的時間：\n地點（地址或描述）：\n預計人數：\n聯絡電話：')" target="_blank" rel="noopener" class="help-btn">我要舉辦客廳會</a>
        </div>

        <!-- Volunteer -->
        <div class="help-item help-item-volunteer">
          <div class="help-item-header">
            <span class="item-number">04</span>
            <h2>志工參與</h2>
          </div>
          <p>
            選舉期間我們需要大量的志工協助各項活動。不需要任何經驗，我們會提供完整的說明和引導。你可以依照自己的時間彈性參與，即使只有一個下午或一個早上都非常歡迎。
          </p>

          <div class="volunteer-grid">
            <div class="volunteer-card">
              <div class="vol-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.523 12.424c.14-.082.293-.162.459-.238a7.878 7.878 0 0 1-.45.606c-.28.337-.498.516-.635.572a.266.266 0 0 1-.035.012.282.282 0 0 1-.026-.044c-.056-.11-.054-.216.04-.36.106-.165.319-.354.647-.548zm2.455-1.647c-.119.025-.237.05-.356.078a21.148 21.148 0 0 0 .5-1.05 12.045 12.045 0 0 0 .51.858c-.217.032-.436.07-.654.114zm2.525.939a3.881 3.881 0 0 1-.435-.41c.228.005.434.022.612.054.317.057.466.147.518.209a.095.095 0 0 1 .026.064.436.436 0 0 1-.06.2.307.307 0 0 1-.094.124.107.107 0 0 1-.069.015c-.09-.003-.258-.066-.498-.256zM8.278 6.97c-.04.244-.108.524-.2.829a4.86 4.86 0 0 1-.089-.346c-.076-.353-.087-.63-.046-.822.038-.177.11-.248.196-.283a.517.517 0 0 1 .145-.04c.013.03.028.092.032.198.005.122-.007.277-.038.465z"/>
                  <path fill-rule="evenodd" d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2l-3-3zM4.165 13.668c.09.18.23.343.438.419.207.075.412.04.58-.03.318-.13.635-.436.926-.786.333-.401.683-.927 1.021-1.51a11.651 11.651 0 0 1 1.997-.406c.3.383.61.713.91.95.28.22.603.403.934.417a.856.856 0 0 0 .51-.138c.155-.101.27-.247.354-.416.09-.181.145-.37.138-.563a.844.844 0 0 0-.2-.518c-.226-.27-.596-.4-.96-.465a5.76 5.76 0 0 0-1.335-.05 10.954 10.954 0 0 1-.98-1.686c.25-.66.437-1.284.52-1.794.036-.218.055-.426.048-.614a1.238 1.238 0 0 0-.127-.538.7.7 0 0 0-.477-.365c-.202-.043-.41 0-.601.077-.377.15-.576.47-.651.823-.073.34-.04.736.046 1.136.088.406.238.848.43 1.295a19.697 19.697 0 0 1-1.062 2.227 10.082 10.082 0 0 0-1.189.762c-.39.282-.669.572-.826.884z"/>
                </svg>
              </div>
              <h3>發放文宣</h3>
              <p>在早市、黃昏市場或路口將文宣遞給民眾，讓選民直接認識我們的理念。每次約 1-2 小時。</p>
            </div>

            <div class="volunteer-card">
              <div class="vol-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12.435 12.435 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A19.626 19.626 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a19.587 19.587 0 0 0 1.349-.476l.019-.007.004-.002h.001"/>
                </svg>
              </div>
              <h3>協助舉牌</h3>
              <p>在重要路口舉起競選旗幟和看板，上下班尖峰時段讓經過的用路人看到我們。牌面輕量化設計。</p>
            </div>

            <div class="volunteer-card">
              <div class="vol-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                  <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                </svg>
              </div>
              <h3>拍照錄影</h3>
              <p>用手機記錄掃街、街講等活動現場，成為社群媒體素材。不需要專業設備，手機就很好。</p>
            </div>

            <div class="volunteer-card">
              <div class="vol-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3 2.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0v.006c0 .07 0 .27-.038.494H15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 14.5V7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.038A2.968 2.968 0 0 1 3 2.506V2.5zm1.068.5H7v-.5a1.5 1.5 0 1 0-3 0c0 .085.002.274.045.43a.522.522 0 0 0 .023.07zM9 3h2.932l.023-.07c.043-.156.045-.345.045-.43a1.5 1.5 0 0 0-3 0V3zm6 4v7.5a.5.5 0 0 1-.5.5H9V7h6zM2 7v7.5a.5.5 0 0 0 .5.5H7V7H2zm0-1h6V4H1v2h1zm7 0h6V4H9v2z"/>
                </svg>
              </div>
              <h3>幫忙宣講</h3>
              <p>在街講現場分享對在地議題的看法，幫忙說明政見。我們會準備講稿和重點提示。</p>
            </div>

            <div class="volunteer-card">
              <div class="vol-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                </svg>
              </div>
              <h3>場地佈置</h3>
              <p>活動前後協助擺放桌椅、架設旗幟和音響設備，引導動線。幕後工作是活動順利的關鍵。</p>
            </div>

            <div class="volunteer-card">
              <div class="vol-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
              </div>
              <h3>物資後勤</h3>
              <p>協助準備文宣品、飲水，或幫忙開車載送物資到活動地點。後勤是前線運作的基礎。</p>
            </div>
          </div>

          <div class="volunteer-cta">
            <p>以上工作都不需要任何經驗，依照自己的時間和興趣選擇想參與的項目即可。</p>
            <a :href="buildFormUrl('我想當志工\n有興趣的工作（可複選）：發放文宣 / 舉牌 / 拍照錄影 / 宣講 / 場地佈置 / 後勤\n可以參與的時段：\n聯絡電話：')" target="_blank" rel="noopener" class="help-btn help-btn-lg">我要加入志工</a>
          </div>
        </div>

        <!-- Share -->
        <div class="help-item help-item-share">
          <div class="help-item-header">
            <span class="item-number">05</span>
            <h2>幫忙分享</h2>
          </div>
          <p>
            最簡單的支持方式，就是把我們的理念分享出去。在你的 LINE 群組、Facebook、Instagram 分享我們的活動資訊和政見內容，讓更多人知道北區、中西區有一位公民科技專家在為大家努力。每一次分享都可能影響一位還沒決定投誰的選民，而那一票可能就是改變的關鍵。
          </p>
        </div>

        <div class="action-container">
          <RouterLink to="/" class="btn-back">回到首頁</RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.help-page {
  min-height: calc(100vh - 89.3px);
  background: #f5f7f8;

  @media (min-width: 992px) {
    min-height: calc(100vh - 81.609px);
  }
}

.page-header {
  padding: 70px 20px 60px;
  background: linear-gradient(135deg, #1a9a9a 0%, #28c8c8 50%, #3dd6d6 100%);
  color: white;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .header-content {
    max-width: 800px;
    margin: 0 auto;
    position: relative;
  }

  h1 {
    font-size: 40px;
    font-weight: 800;
    margin: 0 0 16px;
    letter-spacing: 3px;

    @media (min-width: 768px) {
      font-size: 52px;
    }
  }

  .subtitle {
    font-size: 18px;
    opacity: 0.9;
    margin: 0;
    line-height: 1.6;

    @media (min-width: 768px) {
      font-size: 21px;
    }
  }
}

// Quick action cards
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: -40px auto 40px;
  max-width: 560px;
  position: relative;
  z-index: 1;
  padding: 0 4px;

  @media (min-width: 576px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    max-width: 800px;
  }
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px 16px;
  background: white;
  border-radius: 16px;
  text-decoration: none;
  color: #333;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.25s;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(40, 200, 200, 0.2);
    border-color: #28c8c8;
  }

  .action-emoji {
    font-size: 32px;
    margin-bottom: 8px;
    line-height: 1;
  }

  .action-label {
    font-size: 15px;
    font-weight: 700;
    color: #444;
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
  padding: 28px 32px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 32px;
  border-left: 4px solid #28c8c8;

  p {
    font-size: 16px;
    line-height: 1.8;
    color: #444;
    margin: 0;

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }
}

// Help items
.help-item {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 575px) {
    padding: 24px 20px;
  }

  > p {
    font-size: 16px;
    line-height: 1.8;
    color: #555;
    margin: 0 0 20px;

    @media (min-width: 768px) {
      font-size: 17px;
    }
  }

  > p:last-child {
    margin-bottom: 0;
  }
}

.help-item-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;

  h2 {
    font-size: 22px;
    font-weight: 700;
    color: #333;
    margin: 0;

    @media (min-width: 768px) {
      font-size: 24px;
    }
  }
}

.item-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: linear-gradient(135deg, #28c8c8, #1a9a9a);
  color: white;
  font-size: 14px;
  font-weight: 800;
  border-radius: 10px;
}

// Volunteer grid
.volunteer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 20px 0;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
}

.volunteer-card {
  padding: 20px;
  background: linear-gradient(135deg, #f0fafa, #f8fdfd);
  border-radius: 14px;
  border: 1px solid #ddf0f0;
  transition: all 0.2s;

  &:hover {
    border-color: #28c8c8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(40, 200, 200, 0.12);
  }

  .vol-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 12px;
    color: #28c8c8;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(40, 200, 200, 0.12);
  }

  h3 {
    font-size: 16px;
    font-weight: 700;
    color: #333;
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    line-height: 1.65;
    color: #666;
    margin: 0;
  }
}

.volunteer-cta {
  text-align: center;
  margin-top: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #f0fafa, #e8f8f8);
  border-radius: 14px;

  p {
    font-size: 15px;
    color: #555;
    margin: 0 0 16px;
    line-height: 1.6;
  }
}

// Share section
.help-item-share {
  background: linear-gradient(135deg, #fff9e6, #fffdf5);
  border: 1px solid #f0e6c0;
}

// Buttons
.help-btn {
  display: inline-flex;
  align-items: center;
  padding: 11px 28px;
  background: #28c8c8;
  color: white;
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  border-radius: 50px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(40, 200, 200, 0.25);

  &:hover {
    background: #1a9a9a;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(40, 200, 200, 0.35);
    color: white;
  }

  &.help-btn-lg {
    padding: 14px 36px;
    font-size: 17px;
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
