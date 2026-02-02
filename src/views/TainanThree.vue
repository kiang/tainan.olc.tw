<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { useWindowSize } from "@vueuse/core";

onMounted(() => {
  enterWindowWidth();
});

const isCentered = ref(null);

const windowInnerWidth = ref(window.innerWidth);
const enterWindowWidth = () => {
  if (windowInnerWidth.value <= 576) {
    zoom.value = 14;
  } else {
    zoom.value = 15;
  }
};

const { width } = useWindowSize();
const zoom = ref("");
const zoomChange = computed(() => {
  return `https://tainan.olc.tw/street.html#/zoom/${zoom.value}`;
});

watch(width, (newWidth, oldWidth) => {
  if (newWidth >= 576) {
    isCentered.value = true;
  } else {
    isCentered.value = false;
  }

  if (newWidth <= 576) {
    zoom.value = 13;
  } else {
    zoom.value = 15;
  }
});
</script>

<template>
  <main class="tainan-three-page">
    <div class="container p-0">
      <div class="tainan-container">
        <div class="tainan-three">
          <div
            class="map-button"
            data-bs-toggle="modal"
            data-bs-target="#street-map-modal"
          ></div>
          <img
            class="tainan-three-img"
            src="@/assets/images/tainan-cadidate-without-name.png"
            alt="tainan-total"
          />
          <div
            class="people-name kiang-name"
            data-bs-toggle="modal"
            data-bs-target="#kiang-modal"
          >
            <img
              src="@/assets/images/kiang-name.png"
              alt="Kiang candidate photo"
            />
          </div>
          <div
            class="people-name kuo-name"
            data-bs-toggle="modal"
            data-bs-target="#kuo-modal"
          >
            <img src="@/assets/images/kuo-name.png" alt="Kuo candidate photo" />
          </div>
          <div
            class="people-name ping-name"
            data-bs-toggle="modal"
            data-bs-target="#ping-modal"
          >
            <img
              src="@/assets/images/ping-name.png"
              alt="Ping candidate photo"
            />
          </div>
        </div>
      </div>
      <div class="modal fade kiang-dialog" id="kiang-modal" tabindex="-1">
        <div
          class="modal-dialog modal-fullscreen-sm-down modal-lg"
          :class="{ 'modal-dialog-centered': isCentered }"
        >
          <div class="modal-content modal-desktop">
            <div class="modal-header">
              <button
                class="cross"
                type="button"
                data-bs-dismiss="modal"
              ></button>
              <div class="modal-header-title">
                <h2>民眾黨台南三江</h2>
              </div>
            </div>
            <div class="modal-body">
              <div class="content">
                <div class="people-img-container">
                  <img src="@/assets/images/kiang-popuping.png" />
                </div>
                <h3>用科技找回台南 400 年榮景，江明宗參選北區中西區議員宣言</h3>
                <p>
                  從登革熱地圖、口罩地圖到最近的好食券地圖，過去 6
                  年多的時間我一直嘗試用科技工具參與解決你我生活所面臨的問題，這些創作已經幫助了數百萬人，我有扎實的技術基礎可以讓科技不再只是口號，我希望把這個能力帶進台南市議會，從北區、中西區開始帶動台南科技發展！
                  <br /><br />
                  台灣民眾黨 柯文哲
                  主席提出的「共融社會、國家治理」主軸，期待台灣政治
                  能夠從共容開始，逐步走向共融與共榮，我相當認同這樣的理念，只要願意站在台灣這塊土地上為共同的未來打拼，我們可以包容彼此立場、努力尋求共識，讓社會可以持續前進，而不是因為仇恨原地打轉。
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
                <div class="facebook-container">
                  <a
                    class="facebook-button"
                    target="_blank"
                    href="https://www.facebook.com/k.olc.tw/"
                  >
                    <img src="@/assets/images/facebook.png" alt="facebook" />
                    <p class="facebook-text">透過臉書(FB)聯絡江明宗</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-content modal-mobile">
            <div class="modal-header">
              <button
                class="cross--black"
                type="button"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div class="modal-body">
              <div class="content">
                <div class="people-img-container">
                  <img src="@/assets/images/kiang-popuping.png" />
                </div>
                <h2>用科技找回台南 400 年榮景，江明宗參選北區中西區議員宣言</h2>
                <p>
                  從登革熱地圖、口罩地圖到最近的好食券地圖，過去 6
                  年多的時間我一直嘗試用科技工具參與解決你我生活所面臨的問題，這些創作已經幫助了數百萬人，我有扎實的技術基礎可以讓科技不再只是口號，我希望把這個能力帶進台南市議會，從北區、中西區開始帶動台南科技發展！
                  <br /><br />
                  台灣民眾黨 柯文哲
                  主席提出的「共融社會、國家治理」主軸，期待台灣政治
                  能夠從共容開始，逐步走向共融與共榮，我相當認同這樣的理念，只要願意站在台灣這塊土地上為共同的未來打拼，我們可以包容彼此立場、努力尋求共識，讓社會可以持續前進，而不是因為仇恨原地打轉。
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
                <div class="facebook-container">
                  <a
                    class="facebook-button"
                    target="_blank"
                    href="https://www.facebook.com/k.olc.tw/"
                  >
                    <img src="@/assets/images/facebook.png" alt="facebook" />
                    <p class="facebook-text">透過臉書(FB)聯絡江明宗</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal fade kuo-dialog" id="kuo-modal" tabindex="-1">
        <div
          class="modal-dialog modal-fullscreen-sm-down modal-lg"
          :class="{ 'modal-dialog-centered': isCentered }"
        >
          <div class="modal-content modal-desktop">
            <div class="modal-header">
              <button
                class="cross"
                type="button"
                data-bs-dismiss="modal"
              ></button>
              <div class="modal-header-title">
                <h2>民眾黨台南三江</h2>
              </div>
            </div>
            <div class="modal-body">
              <div class="content">
                <div class="people-img-container">
                  <img src="@/assets/images/kuo-popuping.png" />
                </div>
                <h3>請益各領域專家 融合自身所看所聽 研擬最適合在地的政見</h3>
                <p>
                  人，沒有十全十美的，或許可以專注在某些領域，成為某些領域的專家，但要涵蓋這世界全部的專業，這樣的人應該少之又少，尤其身在政治的氛圍中，會接觸到的人、事、物有百百款，要一個人怎麼面面俱到呢？所以「幕僚」的角色就非常的重要。因為每個領域，都會有每個領域的專家，請益這些專家的看法和建議，就顯得格外重要，像是醫療的問題，就要請教醫療專業的幕僚、法律的問題，就要請教法律專業的幕僚...等，還要依照當下的時
                  勢現況，做出合適的修正。總不能說自己不是專業的，又沒有深入的研究探討、又不請教專業人士的看法，就提出相關的政見，這影響的不只是自己，而是影響整個國家、影響地方的未來走向。

                  <br /><br />
                  今日民眾黨提出地方選舉的共同政見，分別就社會安全、經濟繁榮、環境永續、居住正義、財政紀律五個面向，作為2022地方選舉的總政見，這些都是請益各個領域的專業人士，共同研擬而提出。而國銘自身，也針對這些年推動社區營造與地方創生的經驗，和在社區中所見所看，也有請教相關的專業人士，進而擬定屬於在地的政見：
                  <br /><br />
                  ＃民眾黨共同政見
                  <br /><br />
                  一、社會安全
                  <br />
                  疫情影響加上全球通膨，人民生活受損。因此，我們要持續敦促中央與地方政府，精準紓困，有效振興，強化社會安全網功能。
                  <br /><br />
                  二、經濟繁榮
                  <br />
                  全球經濟在美中貿易戰、俄烏戰爭、氣候變遷和疫情影響下，勢必面臨產業轉型和新的投資局面。本黨將致力推動經濟資源合理利用，提升在地就業與發展。
                  <br /><br />
                  三、環境永續<br />
                  因應氣候變遷，產業需要轉型，轉型需要配套。我們將監督地方政府，逐步修正相應的法規制度，促進永續發展、節能減碳、降低污染。<br /><br />
                  四、居住正義<br />
                  居住正義始終是本黨的堅持，更是台灣年輕人對未來是否有所期待的關鍵。我們將推動社宅興建、稅制改革、租金補貼，讓人民安居和安心。<br /><br />
                  五、財政紀律<br />
                  各級地方政府普遍財政困難，中央必須調整財稅劃分機制，地方政府必須採取自救措施，從開源、節流、有效管理三管齊下。<br /><br />
                  ＃國銘政見<br /><br />
                  一、推動農業、生態村，打穩社區觀光產業基礎
                  <br />
                  農業為立國之本，但現今的農業已經不能只是農業了，還需要各個領域的專業投入，所以在推動農業力量上，需要更多資源、知識、更新的想法投入，才能夠面對現今的社會，所以在農業的推動上，還需要結合其他產業，從一級產業（種植產出）到二級產業（加工），到三級產業（服務觀光），甚至一加二加三共同推動的六級產業（產出＋加工＋服務觀光）。
                  <br /><br />
                  推動農業，從青農開始、推動觀光，從生態村開始<br />
                  推動生態農村、培育青年農民、結合科技農業、打穩在地農業基礎<br />
                  強化國際和兩岸農業交流、擴大農產品外銷市場、通路<br />
                  協助復育在地荒廢農地，擴大契作農業，建立在地特色農產<br />
                  二、連結在地資源，推動社區營造、地方創生，增加就業機會<br />
                  社區營造在現今的社會當中，還是屬於小眾的一部份，參與的人很少，因為社造的觀念需要教育、社造的凝聚力需要長時間的累積，但是在「開放政府全民參與」的理念之中，社區營造的推動，勢在必行，在地的需求、在地聲音，必須由下而上讓政府知道、了解，才能夠制定更符合在地的社區規劃，打穩新豐區基礎，增加就業機會，讓青年有回來工作的本錢。<br /><br />
                  連結「社區＋學校＋公部門＋企業＋議會」資源，推動社區營造<br />
                  設立社區營造中心，結集社造相關人士<br />
                  建立新豐區學、產、官、研平台，媒合創造合作機會、互惠共榮<br />
                  整合社區資源，規劃特色活動，創建地方產業教學平台，並引進觀光客源<br />
                  三、推動文化社區，打造創新求變的新豐區<br />
                  有文化，社區才有更深入的視野，這些藝文涵養，必須從生活接觸、從內心扎根，在我們的新豐區，擁有豐富的藝術文化與歷史，都是我們社區的寶藏，從學校教育推行、社區生活做起，保留在地的故事、增進在地藝文涵養，打造文化新豐區。<br /><br />
                  改變社區，從文化開始
                  集結在地文史工作者，建立在地文史藝術分享平台<br />
                  推動城市外交，爭取台南與其他國家或縣市的交流論壇，分享彼此的文史、行銷在地<br />
                  四、推動綠能經濟，維護和保育自然生態<br />
                  歸仁沙崙綠能科學城的建構，是歸仁現金的重要指標，其中包含科技、綠能、生態、農業…等架構，勢必可以帶動新豐區的產業脈絡，增加更多的就業機會與商機，就在地經濟而言，爭取與新豐區產業、農業、學界…等的資源結合，共同推動在地的發展，讓新豐區更加繁榮。<br /><br />
                  提倡循環經濟的概念，友善環境、減少廢棄物<br />
                  協助沙崙綠能科學城，與在地農業連結，共同推動生態、經濟發展<br />
                  爭取龍崎國家級地景公園，推動環境教育觀光<br />
                </p>
                <div class="facebook-container">
                  <a
                    target="_blank"
                    class="facebook-button"
                    href="https://www.facebook.com/kuomin0803"
                  >
                    <img src="@/assets/images/facebook.png" alt="facebook" />
                    <p class="facebook-text">透過臉書(FB)聯絡江國銘</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-content modal-mobile">
            <div class="modal-header">
              <button
                class="cross--black"
                type="button"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div class="modal-body">
              <div class="content">
                <div class="people-img-container">
                  <img class="people" src="@/assets/images/kuo-popuping.png" />
                </div>
                <h2>請益各領域專家 融合自身所看所聽 研擬最適合在地的政見</h2>
                <p>
                  人，沒有十全十美的，或許可以專注在某些領域，成為某些領域的專家，但要涵蓋這世界全部的專業，這樣的人應該少之又少，尤其身在政治的氛圍中，會接觸到的人、事、物有百百款，要一個人怎麼面面俱到呢？所以「幕僚」的角色就非常的重要。因為每個領域，都會有每個領域的專家，請益這些專家的看法和建議，就顯得格外重要，像是醫療的問題，就要請教醫療專業的幕僚、法律的問題，就要請教法律專業的幕僚...等，還要依照當下的時
                  勢現況，做出合適的修正。總不能說自己不是專業的，又沒有深入的研究探討、又不請教專業人士的看法，就提出相關的政見，這影響的不只是自己，而是影響整個國家、影響地方的未來走向。

                  <br /><br />
                  今日民眾黨提出地方選舉的共同政見，分別就社會安全、經濟繁榮、環境永續、居住正義、財政紀律五個面向，作為2022地方選舉的總政見，這些都是請益各個領域的專業人士，共同研擬而提出。而國銘自身，也針對這些年推動社區營造與地方創生的經驗，和在社區中所見所看，也有請教相關的專業人士，進而擬定屬於在地的政見：
                  <br /><br />
                  ＃民眾黨共同政見
                  <br /><br />
                  一、社會安全
                  <br />
                  疫情影響加上全球通膨，人民生活受損。因此，我們要持續敦促中央與地方政府，精準紓困，有效振興，強化社會安全網功能。
                  <br /><br />
                  二、經濟繁榮
                  <br />
                  全球經濟在美中貿易戰、俄烏戰爭、氣候變遷和疫情影響下，勢必面臨產業轉型和新的投資局面。本黨將致力推動經濟資源合理利用，提升在地就業與發展。
                  <br /><br />
                  三、環境永續<br />
                  因應氣候變遷，產業需要轉型，轉型需要配套。我們將監督地方政府，逐步修正相應的法規制度，促進永續發展、節能減碳、降低污染。<br /><br />
                  四、居住正義<br />
                  居住正義始終是本黨的堅持，更是台灣年輕人對未來是否有所期待的關鍵。我們將推動社宅興建、稅制改革、租金補貼，讓人民安居和安心。<br /><br />
                  五、財政紀律<br />
                  各級地方政府普遍財政困難，中央必須調整財稅劃分機制，地方政府必須採取自救措施，從開源、節流、有效管理三管齊下。<br /><br />
                  ＃國銘政見<br /><br />
                  一、推動農業、生態村，打穩社區觀光產業基礎
                  <br />
                  農業為立國之本，但現今的農業已經不能只是農業了，還需要各個領域的專業投入，所以在推動農業力量上，需要更多資源、知識、更新的想法投入，才能夠面對現今的社會，所以在農業的推動上，還需要結合其他產業，從一級產業（種植產出）到二級產業（加工），到三級產業（服務觀光），甚至一加二加三共同推動的六級產業（產出＋加工＋服務觀光）。
                  <br /><br />
                  推動農業，從青農開始、推動觀光，從生態村開始<br />
                  推動生態農村、培育青年農民、結合科技農業、打穩在地農業基礎<br />
                  強化國際和兩岸農業交流、擴大農產品外銷市場、通路<br />
                  協助復育在地荒廢農地，擴大契作農業，建立在地特色農產<br />
                  二、連結在地資源，推動社區營造、地方創生，增加就業機會<br />
                  社區營造在現今的社會當中，還是屬於小眾的一部份，參與的人很少，因為社造的觀念需要教育、社造的凝聚力需要長時間的累積，但是在「開放政府全民參與」的理念之中，社區營造的推動，勢在必行，在地的需求、在地聲音，必須由下而上讓政府知道、了解，才能夠制定更符合在地的社區規劃，打穩新豐區基礎，增加就業機會，讓青年有回來工作的本錢。<br /><br />
                  連結「社區＋學校＋公部門＋企業＋議會」資源，推動社區營造<br />
                  設立社區營造中心，結集社造相關人士<br />
                  建立新豐區學、產、官、研平台，媒合創造合作機會、互惠共榮<br />
                  整合社區資源，規劃特色活動，創建地方產業教學平台，並引進觀光客源<br />
                  三、推動文化社區，打造創新求變的新豐區<br />
                  有文化，社區才有更深入的視野，這些藝文涵養，必須從生活接觸、從內心扎根，在我們的新豐區，擁有豐富的藝術文化與歷史，都是我們社區的寶藏，從學校教育推行、社區生活做起，保留在地的故事、增進在地藝文涵養，打造文化新豐區。<br /><br />
                  改變社區，從文化開始
                  集結在地文史工作者，建立在地文史藝術分享平台<br />
                  推動城市外交，爭取台南與其他國家或縣市的交流論壇，分享彼此的文史、行銷在地<br />
                  四、推動綠能經濟，維護和保育自然生態<br />
                  歸仁沙崙綠能科學城的建構，是歸仁現金的重要指標，其中包含科技、綠能、生態、農業…等架構，勢必可以帶動新豐區的產業脈絡，增加更多的就業機會與商機，就在地經濟而言，爭取與新豐區產業、農業、學界…等的資源結合，共同推動在地的發展，讓新豐區更加繁榮。<br /><br />
                  提倡循環經濟的概念，友善環境、減少廢棄物<br />
                  協助沙崙綠能科學城，與在地農業連結，共同推動生態、經濟發展<br />
                  爭取龍崎國家級地景公園，推動環境教育觀光<br />
                </p>
                <div class="facebook-container">
                  <a
                    target="_blank"
                    class="facebook-button"
                    href="https://www.facebook.com/kuomin0803"
                  >
                    <img src="@/assets/images/facebook.png" alt="facebook" />
                    <p class="facebook-text">透過臉書(FB)聯絡江國銘</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal fade ping-dialog" id="ping-modal" tabindex="-1">
        <div
          class="modal-dialog modal-fullscreen-sm-down modal-lg"
          :class="{ 'modal-dialog-centered': isCentered }"
        >
          <div class="modal-content modal-desktop">
            <div class="modal-header">
              <button
                class="cross"
                type="button"
                data-bs-dismiss="modal"
              ></button>
              <div class="modal-header-title">
                <h2>民眾黨台南三江</h2>
              </div>
            </div>
            <div class="modal-body">
              <div class="content">
                <div class="people-img-container">
                  <img src="@/assets/images/ping-popuping.png" />
                </div>
                <h3>
                  超越藍綠新世代．永康向前衝
                  台灣民眾黨台南永康市議員選舉江品璁參選宣言
                </h3>
                <p>
                  大家好，我是江品璁，一個非典型的新聞人，主跑的新聞不是殺人放火、政治誹聞，而是一則則社會底層如何掙扎求生的深入報導。我在2012年進到《蘋果日報》慈善基金會，我們每天接觸的個案，非癌即癱，多數居住環境相當惡劣，很難想像在台灣，竟然還有如此多的貧弱家庭。<br /><br />
                  我透過採訪切身的感受到，人民的無助與無力，這份工作，讓我訪視了成百上千個家庭，往往是幫完這個家庭，下一個家庭又出了狀況，甚至同個家庭，隔了幾年又再發生不同的變故，貧窮一再的循環，似乎不見轉機。<br /><br />
                  在工作一段時間後，我申請上了英國格拉斯哥大學，因而有機會出國攻讀碩士，在留學期間，我看見世界變化的浪潮，東亞各國經濟的突飛猛進，更使得台灣相形失色，我開始思考，台灣，是不是哪裡出了問題？<br /><br />
                  學成歸國後，我再度回到蘋果基金會擔任暖流記者，一直到《蘋果》被迫停刊為止，這段期間台灣弱勢家庭變得更多了，而且還有年輕化的趨勢，貧窮世襲化已經成了不可忽視的沉重問題，但整個社會似乎還沉浸在意識形態與藍綠惡鬥的漩渦中，因此，我開始加入政黨，參與台灣民眾黨的各式活動，最終投入政治，盼望能夠改變這個政治生態。<br /><br />
                  我是台南永康在地人，沒有任何政治背景，不是政二代，也不是什麼富二代，我只是一個爸爸，有2個可愛的女兒，我希望所有的孩子們都能生活在一個有希望、蓬勃發展的地方，但現在的台南永康，雖是人口最多、發展最快的地方，卻同時也面臨著低薪高房價、公共設施分配不足的問題。<br /><br />
                  我認為永康應該能夠變得更好，他有著廣大的腹地，與勤奮的人們，我們應該要支持弱勢家庭的生活，居住必須要正義，我們希望能有更多的人，能夠超越藍綠兩黨，帶來專業、理性的監督力量，一個人走的快，但一群人走的遠，讓我們一起為更美好的台南，為下一代共同奮鬥！<br /><br />
                  謝謝！
                </p>
                <div class="facebook-container">
                  <a
                    target="_blank"
                    class="facebook-button"
                    href="https://www.facebook.com/pingtsung1011/"
                  >
                    <img src="@/assets/images/facebook.png" alt="facebook" />
                    <p class="facebook-text">透過臉書(FB)聯絡江品璁</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-content modal-mobile">
            <div class="modal-header">
              <button
                class="cross--black"
                type="button"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div class="modal-body">
              <div class="content">
                <div class="people-img-container">
                  <img src="@/assets/images/ping-popuping.png" />
                </div>
                <h2>
                  超越藍綠新世代．永康向前衝
                  台灣民眾黨台南永康市議員選舉江品璁參選宣言
                </h2>
                <p>
                  大家好，我是江品璁，一個非典型的新聞人，主跑的新聞不是殺人放火、政治誹聞，而是一則則社會底層如何掙扎求生的深入報導。我在2012年進到《蘋果日報》慈善基金會，我們每天接觸的個案，非癌即癱，多數居住環境相當惡劣，很難想像在台灣，竟然還有如此多的貧弱家庭。<br /><br />
                  我透過採訪切身的感受到，人民的無助與無力，這份工作，讓我訪視了成百上千個家庭，往往是幫完這個家庭，下一個家庭又出了狀況，甚至同個家庭，隔了幾年又再發生不同的變故，貧窮一再的循環，似乎不見轉機。<br /><br />
                  在工作一段時間後，我申請上了英國格拉斯哥大學，因而有機會出國攻讀碩士，在留學期間，我看見世界變化的浪潮，東亞各國經濟的突飛猛進，更使得台灣相形失色，我開始思考，台灣，是不是哪裡出了問題？<br /><br />
                  學成歸國後，我再度回到蘋果基金會擔任暖流記者，一直到《蘋果》被迫停刊為止，這段期間台灣弱勢家庭變得更多了，而且還有年輕化的趨勢，貧窮世襲化已經成了不可忽視的沉重問題，但整個社會似乎還沉浸在意識形態與藍綠惡鬥的漩渦中，因此，我開始加入政黨，參與台灣民眾黨的各式活動，最終投入政治，盼望能夠改變這個政治生態。<br /><br />
                  我是台南永康在地人，沒有任何政治背景，不是政二代，也不是什麼富二代，我只是一個爸爸，有2個可愛的女兒，我希望所有的孩子們都能生活在一個有希望、蓬勃發展的地方，但現在的台南永康，雖是人口最多、發展最快的地方，卻同時也面臨著低薪高房價、公共設施分配不足的問題。<br /><br />
                  我認為永康應該能夠變得更好，他有著廣大的腹地，與勤奮的人們，我們應該要支持弱勢家庭的生活，居住必須要正義，我們希望能有更多的人，能夠超越藍綠兩黨，帶來專業、理性的監督力量，一個人走的快，但一群人走的遠，讓我們一起為更美好的台南，為下一代共同奮鬥！<br /><br />
                  謝謝！
                </p>
                <div class="facebook-container">
                  <a
                    a
                    target="_blank"
                    class="facebook-button"
                    href="https://www.facebook.com/pingtsung1011/"
                  >
                    <img src="@/assets/images/facebook.png" alt="facebook" />
                    <p class="facebook-text">透過臉書(FB)聯絡江品璁</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="modal fade street-map-dialog"
        id="street-map-modal"
        tabindex="-1"
      >
        <div class="modal-dialog modal-fullscreen">
          <div class="modal-content">
            <div class="modal-header">
              <button
                class="cross--black"
                type="button"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div class="modal-body">
              <iframe
                width="100%"
                height="100%"
                :src="zoomChange"
                frameborder="0"
                seamless
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
@import "../assets/scss/components/_cross";
@import "../assets/scss/components/_buttons";

@mixin size($width, $height) {
  width: $width;
  height: $height;
}

.tainan-container {
  position: relative;
  // height: calc(100vh - 75px - 75px);

  // @media (min-width: 1920px) {
  //   height: calc(100vh - 77px);
  // }
}

.tainan-three {
  // 小尺寸讓他變成flex
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  // 為了讓台南三江兩側背hidden住
  overflow: hidden;
  transform: translateY(5%);
  // transform: translateY(12%);

  @media (min-width: 992px) {
    margin-top: 0;
    transform: translateY(17%);
    // 大尺寸要有map-button不能被hidden
    overflow: initial;
  }

  .tainan-three-img {
    object-fit: contain;
    align-self: center;

    @include size(120%, 120%);

    @media (min-width: 992px) {
      @include size(100%, calc(100vh - 81.609px));
    }

    @media (min-width: 1920px) {
      @include size(100%, 100vh);
    }
  }

  // hover時的動畫
  &:hover .people-name {
    animation-name: bounceName;
    animation-duration: 1s;
    animation-iteration-count: infinite;
  }

  @keyframes bounceName {
    from {
      transform: translateY(0px);
      animation-timing-function: ease-out;
    }

    50% {
      transform: translateY(-3px);
      animation-timing-function: ease-in;
    }

    to {
      transform: translateY(0px);
      animation-timing-function: ease-in-out;
    }
  }
}

// people name distance adjustment
.people-name {
  position: absolute;
  cursor: pointer;
}

.kiang-name {
  top: 75%;
  left: 78%;

  @media (min-width: 992px) {
    top: 70%;
    left: 73%;
  }
  img {
    @include size(80%, 80%);
    @media (min-width: 450px) {
      @include size(60%, 60%);
    }
    @media (min-width: 992px) {
      @include size(65%, 65%);
    }
    @media (min-width: 1920px) {
      @include size(90%, 90%);
    }
  }
}
.kuo-name {
  top: 70%;
  left: 43%;

  @media (min-width: 992px) {
    top: 66%;
    left: 44%;
  }
  img {
    @include size(40%, 40%);
    @media (min-width: 576px) {
      @include size(65%, 65%);
    }
    @media (min-width: 1920px) {
      @include size(90%, 90%);
    }
  }
}
.ping-name {
  top: 75%;
  left: 8%;

  @media (min-width: 992px) {
    top: 70%;
    left: 13%;
  }
  img {
    @include size(40%, 40%);
    @media (min-width: 576px) {
      @include size(65%, 65%);
    }
    @media (min-width: 1920px) {
      @include size(90%, 90%);
    }
  }
}

// bootstrap popuping effect
// 共用

.modal-content {
  border-radius: 0;
  .facebook-container {
    cursor: pointer;
    display: flex;
    justify-content: center;
    margin: 10px 0;
  }
}
.modal-header {
  border-radius: 0;
  button {
    border: 1px solid transparent;
    background-color: transparent;

    &:focus-visible {
      outline: 1px solid transparent;
    }
  }
}

.kiang-dialog,
.kuo-dialog,
.ping-dialog {
  .modal-desktop.modal-content {
    display: none;
    @media (min-width: 992px) {
      display: block;
      .modal-header {
        padding: 0 20px;
        display: grid;
        justify-content: space-between;
        grid-template-columns: 0.5fr 16fr;
        background-color: $secondary-dark;

        &-title {
          display: flex;
          justify-content: center;

          h2 {
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            line-height: 60px;
            color: white;
          }
        }
      }

      .modal-body {
        padding: 20px 40px;
        background-color: #fff;

        .people-img-container {
          img {
            float: left;
            margin-right: 16px;
          }
        }

        h3 {
          font-weight: 700;
          margin-bottom: 16px;
          font-size: 24px;
        }

        p {
          line-height: 21.27px;
          font-size: 14px;
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

  .modal-mobile.modal-content {
    background-color: $secondary-light;

    .modal-header {
      padding: 10px 20px;
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
    }

    @media (min-width: 992px) {
      display: none;
    }
  }
}

.street-map-dialog {
  .modal-body {
    padding: 0;
  }
  .modal-header {
    padding: 10px 20px;
    background-color: transparent;
  }
}
</style>
