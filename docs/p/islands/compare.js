const FEIFEI = {
  id: "feifei",
  name: "陳亭妃",
  groups: [
    {
      id: "tech", cat: "tech", icon: "🔬", title: "科技三軸",
      source: "https://www.facebook.com/fififans/posts/pfbid0AmvxcUhEgq3ymPUSjmPKmZMgYW3J2YEW5RsXX4hFVppPdJUny2RjHTUD55be3nC8l",
      items: [
        { title: "農業科技｜後壁花卉產業園區", facts: ["升格為農業部四級單位", "獨立預算＋公建預算", "結合智慧溫室、生技育種、科技管理與精準生產"], body: "園區成功推動升格為農業部四級單位，可正式編列獨立預算，結合智慧溫室、生技育種、科技管理與精準生產，推動傳統農業科技升級。" },
        { title: "半導體與 AI｜南科、沙崙、柳科", facts: ["南科一期到三期、四期落腳沙崙", "串聯沙崙 AI、綠能產業", "柳科無人機產業"], body: "串聯南科半導體聚落、沙崙AI、綠能產業及未來的柳科無人機產業，打造南台灣智慧科技創新基地。" },
        { title: "醫療科技｜智慧健康城市", facts: ["智慧病房、數位病歷", "遠距醫療及 AI 輔助診療", "減輕醫護人員負擔"], body: "推動醫療數位轉型，導入智慧病房、數位病歷、遠距醫療及AI輔助診療等應用，提升醫療效率與照護品質。" },
        { title: "點・線・面｜科技走廊", facts: ["三個園區互相拉動、擴大外溢", "護國神山帶動周邊工業區升級", "同步檢討都市計畫"], body: "關鍵不在於三個獨立的園區，而是「互相拉動」與「外溢效果」，利用護國神山帶動周邊工業區同步升級，並同步檢討都市計畫，讓「點」連成「線」，再擴大成推動大台南城市發展的「面」。" },
      ],
    },
    {
      id: "agriculture", cat: "agriculture", icon: "🌾", title: "四季農漁產",
      source: "https://www.facebook.com/fififans/posts/pfbid0H6jVDWtpHBMuz5HitzFHFcHNRqrBkMtm1FiPKAmWutguWdi6ePWPqV4JNkWF8UdNl",
      items: [
        { title: "智慧農漁｜建立完整資訊平台", facts: ["整合氣候、產量、價格、市場與通路資訊", "降低產銷失衡風險", "讓農漁生產更穩定"], body: "整合氣候、產量、價格、市場與通路資訊，降低產銷失衡風險，讓農漁生產更穩定。" },
        { title: "產銷升級｜拓展市場與品牌價值", facts: ["完善冷鏈、加工與品牌行銷", "串聯觀光、傳統市場、量販及線上", "讓台南農漁產品賣得更好"], body: "完善冷鏈、加工與品牌行銷，串聯觀光、傳統市場、量販及線上，讓台南農漁產品賣得出去、賣得更好。" },
        { title: "保障農漁民｜三保一金更完善", facts: ["農民健康保險、職災保險", "農業保險及農民退休儲金", "串聯中央與地方"], body: "串聯中央與地方，完善農民健康保險、職災保險、農業保險及農民退休儲金，讓農漁民打拚有保障。" },
        { title: "青年返鄉", facts: ["提供青年返鄉支持與多元發展機會", "結合科技與市場", "讓更多年輕人投入農漁業"], body: "提供青年返鄉支持與多元發展機會，結合科技與市場，讓更多年輕人投入農漁業。" },
      ],
    },
    {
      id: "tourism", cat: "tourism", icon: "🏯", title: "五大觀光軸",
      source: "https://www.facebook.com/fififans/posts/pfbid0weR67XBWgxiMXtKn2c4Z9Wqey18t2uqiSBYbWJj3UrTaEeWjk8S79DjFj4UwD5ekl",
      items: [
        { title: "大新營｜人文古都・農村魅力", facts: ["月津港藝術燈節", "糖業文化、農村風光與在地美食", "展現溪北魅力"], body: "串聯新營、鹽水、柳營、後壁、白河等區域，結合月津港藝術燈節、糖業文化、農村風光與在地美食，展現溪北魅力。" },
        { title: "曾文南科｜科技產業・文化觀光", facts: ["善化、新市、麻豆、大內、官田", "南科科技產業、農業與歷史文化", "科技觀光與產業旅遊路線"], body: "連結善化、新市、麻豆、大內、官田等區域，串聯南科科技產業、農業與歷史文化，打造科技觀光與產業旅遊路線。" },
        { title: "濱海藍帶｜海洋生態・漁村風情", facts: ["黃金海岸、四草綠色隧道", "台江國家公園、鹽田與漁村", "海洋生態旅遊"], body: "連結沿海各地區，整合黃金海岸、四草綠色隧道、台江國家公園、鹽田與漁村，發展海洋生態旅遊。" },
        { title: "大目降｜山城風景・農業體驗", facts: ["新化老街、各種農產", "草山月世界與多樣化自然地景", "深度旅遊線"], body: "串聯山城地區，從新化老街、芒果等各種農產到草山月世界與各種多樣化自然地景，打造深度旅遊線。" },
        { title: "府城新豐｜歷史文化・美食夜經濟", facts: ["孔廟、赤崁、五條港、國華友愛、海安路", "安平、永華、成大及站前商圈", "從白天到夜晚的城市觀光路線"], body: "台南最重要的城市觀光核心，從孔廟、赤崁、五條港、國華友愛、海安路等歷史街區，到安平、永華、成大及站前商圈，打造從白天到夜晚的城市觀光路線。" },
      ],
    },
    {
      id: "welfare", cat: "welfare", icon: "🤝", title: "福利六都齊",
      source: "https://www.facebook.com/fififans/posts/pfbid0H6jVDWtpHBMuz5HitzFHFcHNRqrBkMtm1FiPKAmWutguWdi6ePWPqV4JNkWF8UdNl",
      items: [
        { title: "兒少照顧｜從出生到就學更安心", facts: ["銜接中央 0-18 歲每月 5,000 元成長津貼", "補強托育、學費與兒少照顧資源"], body: "銜接中央0-18歲每月5,000元成長津貼，補強托育、學費與兒少照顧資源，讓孩子快樂成長。" },
        { title: "青年發展｜成立青年局", facts: ["設立具實權的青年局", "整合就業、青創、租屋、職涯", "讓青年留在台南"], body: "設立具實權的青年局，整合就業、青創、租屋、職涯及國際交流資源，讓青年留在台南、實現夢想。" },
        { title: "家庭支持｜生育、婦女與照顧", facts: ["全面盤點生育補助、育兒支持", "提供婦女凍卵補助", "逐項對標六都，補齊各階段需求"], body: "全面盤點生育補助、育兒支持與婦女政策，提供婦女凍卵補助。逐項對標六都，補齊家庭的各階段需求。" },
        { title: "長者關懷｜敬老與健康照護", facts: ["提升重陽禮金", "擴大敬老卡使用彈性", "補助長者帶狀疱疹疫苗"], body: "提升重陽禮金、擴大敬老卡使用彈性，並補助長者帶狀疱疹疫苗，打造更完善的高齡照顧體系。" },
        { title: "遊戲宜居城市", facts: ["特色公園升級", "10 分鐘遊戲圈", "涼感公園，夏天也能安心玩"], body: "持續推動親子悠遊館、特色遊戲場與友善公園，讓孩子有更多安全、好玩、能探索的戶外空間。全面盤點各行政區的公園，讓孩子走出家門10分鐘內就能找到可以遊戲、運動的地方。" },
      ],
    },
    {
      id: "transport", cat: "transport", icon: "🚇", title: "交通七彩行",
      source: "https://www.facebook.com/fififans/posts/pfbid0H6jVDWtpHBMuz5HitzFHFcHNRqrBkMtm1FiPKAmWutguWdi6ePWPqV4JNkWF8UdNl",
      items: [
        { title: "四橫三縱快速路網", facts: ["串聯國道 1 號、國道 3 號及台 61", "強化溪南溪北、山區與沿海的交通連結"], body: "串聯國道1號、國道3號及台61西濱快速道路，強化溪南溪北、山區與沿海的交通連結。" },
        { title: "捷運半環狀路網", facts: ["加速推動捷運藍線及延伸線", "深綠線、紅線", "結合鐵路地下化、立體化與公車系統"], body: "加速推動捷運藍線及延伸線、深綠線、紅線，結合鐵路地下化、立體化與公車系統。" },
        { title: "觀光輕軌、糖鐵五分車", facts: ["串聯台南重要景點", "保留糖鐵文化", "結合觀光與地方創生"], body: "串聯台南重要景點，打造觀光輕軌路網，保留糖鐵文化，結合觀光與地方創生。" },
        { title: "自行車道系統", facts: ["完善全市自行車道", "串聯山海、河濱與城鄉", "打造友善綠色交通環境"], body: "完善全市自行車道，串聯山海、河濱與城鄉，打造友善綠色交通環境。" },
      ],
    },
    {
      id: "education", cat: "education", icon: "📚", title: "教育",
      source: "https://www.facebook.com/fififans/posts/pfbid0qU3MhrKS65vptmSULRxRRX9JnaGHDVjSpGrNBvXhJbZPUNPJmHvwrP5ZPxp6yR6Wl",
      items: [
        { title: "國中小營養午餐全面免費", facts: ["台南不能落後其他五都", "福利六都齊的核心精神"], body: "凡是台南目前比不上其他五都的社會福利，包括孩子、青年、婦女、長者，不分族群、亭妃會一次補足，讓市民真正有感。" },
        { title: "12 年國教點亮台南府城", facts: ["突顯台南文化差異及卓越", "培養世界觀及核心素養"], body: "喚醒台南父母的驕傲，台南囡仔因教育而偉大，培養世界觀及核心素養。" },
        { title: "翻轉教育培育創新學子", facts: ["加強英語、國際教育有效教學", "減輕負擔、教學正常化也卓越化"], body: "加強英語、國際教育有效教學，減輕負擔、教學正常化也卓越化。" },
        { title: "老師你好台南老師最有型", facts: ["精進教師專業、降低班級人數", "教師福利迎上六都", "解決行政人力不足"], body: "精進教師專業、降低班級人數、教師福利迎上六都、建立府城教育新典範、解決行政人力不足。" },
      ],
    },
    {
      id: "elderly-f", cat: "elderly", icon: "👵", title: "長者福利",
      items: [
        { title: "65 歲以上長者健保費全面免繳", facts: ["取消排富", "讓每一位長輩安心養老"], body: "65歲以上長者健保費全面免繳，取消排富。" },
        { title: "盤整長照體系", facts: ["加強長照 3.0 的能量", "幸福生活"], body: "讓每一位長輩都能安心養老、幸福生活，盤整長照體系，加強長照3.0的能量。" },
      ],
    },
    {
      id: "fertility-f", cat: "fertility", icon: "👶", title: "生育支持",
      items: [
        { title: "婦女凍卵補助", facts: ["全面盤點生育補助", "對標六都補齊"], body: "提供婦女凍卵補助，逐項對標六都，補齊家庭的各階段需求。" },
      ],
    },
    {
      id: "youth-f", cat: "youth", icon: "🧑‍💼", title: "青年政策",
      source: "https://www.facebook.com/reel/2597149377320116/",
      items: [
        { title: "成立青年局", facts: ["台南 38 萬青年", "單一窗口：就業、創業、租屋、進修", "台北、新北、桃園、高雄已做到"], body: "台南必須成立「青年局」，一個真正屬於青年的單一窗口，讓就業、創業、租屋、進修、公共參與都能一次到位，讓青年需求有屬於自己的預算，並且將青年政策直接進入市政核心。" },
      ],
    },
  ],
};

const LONGJI = {
  id: "longji",
  name: "謝龍介",
  groups: [
    {
      id: "elderly", cat: "elderly", icon: "👵", title: "老人福利三箭｜老有所養",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid0PUJ2Y3xk8NVALfZZCCgZWoHxtLPS6e3ic8sJr917CwLyDeqEX1mMWJMzyxsvfnSSl",
      items: [
        { title: "健保全額補助", facts: ["取消排富門檻", "65 歲以上健保費全額補助", "重陽敬老金加倍至 3,000 元"], body: "取消排富限制，讓照顧長輩一視同仁。同時敬老金從1500元加倍至3000元，讓長輩買菜、支應日常開銷，手頭更寬裕。" },
        { title: "擴大敬老交通", facts: ["敬老卡每月 1,000 元點數", "可搭計程車", "逐步納入超商、超市、藥局"], body: "推動「敬老卡點數化」，比照台中，每月補助1000元。敬老卡除了搭公車，也能搭計程車，逐步將超商、超市、藥局納入使用範圍，連看醫生的掛號費也能用敬老卡點數支付。" },
        { title: "社區共餐巡迴", facts: ["移動式社區共餐與巡迴醫療", "行動醫療車走進偏鄉", "整合小黃公車與長照接送"], body: "推動「移動式社區共餐與巡迴醫療」，結合行動醫療車定期走進偏鄉社區，提供共餐、送餐及醫療服務。整合小黃公車與1966長照接送專車，朝「出門零負擔」目標前進。" },
      ],
    },
    {
      id: "water", cat: "water", icon: "💧", title: "治水三箭｜終結水患",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid0aCZvY2mMuTyVsQznWDFWN5crZb1adbpHx42VBzkByYgbxokGR3VYh5zWR9jsLcuyl",
      items: [
        { title: "整合治水辦公室", facts: ["市長親自坐鎮", "統籌水利、工務、交通、地政", "所有工程須先通過排水檢核"], body: "整合水利、工務、交通、地政等局處成立專責「治水辦公室」，統籌全市治水工程與公共建設。未來道路開挖、都市更新、土地重劃及重大公共工程，都須先通過「排水檢核」。" },
        { title: "延長下水道建設", facts: ["規劃 938 公里、已建 742.5 公里", "朝雙料全國第一目標前進", "讓排水系統更完整"], body: "台南市雨水下水道規劃長度達938公里，實際建設742.5公里。加快建設進度，朝「規劃長度、建設長度雙料全國第一」的目標前進。" },
        { title: "AI 智慧水網", facts: ["AI 系統＋物聯網感測", "即時雨量、排水、抽水站整合", "從事後搶修轉型為主動防禦"], body: "運用AI系統、物聯網感測網路，建構大台南「治水AI智慧水網」，整合即時雨量、排水、抽水站資訊，將防災策略從「事後搶修」轉型為「主動防禦」。" },
      ],
    },
    {
      id: "integrity", cat: "integrity", icon: "⚖️", title: "廉能三箭｜民意直達",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid02YUXbokh33hx18rspLXvqhTyXX3nqw5ikAJjhVUSEWvMStsNRK2NrZq3TGqWBG1QVl",
      items: [
        { title: "只做四年不連任", facts: ["拋開人情、選票與派系包袱", "大刀闊斧推動改革", "用四年拚出八年成績"], body: "沒有連任壓力，才能拋開人情、選票與派系包袱。四年任期一天都不能浪費，全心全力拚市政、拚建設，用四年時間拚出八年成績。" },
        { title: "透明政府採購", facts: ["施政成果公開上網", "重大採購與工程進度公開", "壓縮黑箱與關說空間"], body: "推動「透明政府行動方案」，各局處的施政成果、重大採購資訊及重要工程進度公開上網。採購花多少錢、由誰得標、工程做到哪裡，都要一項項交代清楚。" },
        { title: "全面行動治理｜天天直播", facts: ["週一到週五天天直播", "市民可 Call-in 陳情", "政務官輪番上陣回答問題"], body: "直播從每週兩次升級為「週一到週五天天開講」，每天向鄉親報告施政進度、受理陳情，並安排政務官輪番上陣，親自回答問題、面對民意。" },
      ],
    },
    {
      id: "agriculture", cat: "agriculture", icon: "🌾", title: "農漁三箭｜產業翻新",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid0Yo6RUxcgd819ef71gtw7URceWLFzfZ7KBgWHPwowP4VrAwCRSXmbYyqn6BZzXeNRl",
      items: [
        { title: "清查光電亂象", facts: ["跨局處光電弊案清查專案小組", "一案一案追查到底", "光電資訊公開平台"], body: "成立跨局處「光電弊案清查專案小組」，由市長直接督導，清查歷年有爭議的光電開發案。同時建置光電資訊公開平台，讓每一塊光電板由誰申請、誰審查、是否合法規，市民上網都查得到。" },
        { title: "建立現代冷鏈", facts: ["玉井農產加工、將軍水產加工兩座中心", "產地到市場完整冷鏈", "智慧產銷平台"], body: "以玉井農產加工、將軍水產加工兩座冷鏈中心為核心，整合農漁會、冷藏車與物流業者，打通產地到市場的完整冷鏈。同時建立智慧產銷平台，減少損耗、調節供需。" },
        { title: "輔導外銷出口", facts: ["農漁產品外銷輔導平台", "整合檢疫、國際認證、冷鏈運輸", "拓展日韓、東南亞、歐美市場"], body: "成立農漁產品外銷輔導平台，整合檢疫、國際認證、加工升級、冷鏈運輸、包裝、報關及買主媒合，帶著農漁民拓展日韓、東南亞、歐美市場。" },
      ],
    },
    {
      id: "education", cat: "education", icon: "📚", title: "教育三箭｜育才扎根",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid03WDYnfvUfrdeRtTBFheBQhwS1ebZLExBsVmtBtdd2CJCrKKFsQKXXe2CL1vkupUml",
      items: [
        { title: "免費營養午餐", facts: ["統一採購食材、持續提升菜色", "嚴格把關餐食品質、食安標準", "替家長減輕負擔"], body: "透過統一採購食材、持續提升菜色，嚴格把關餐食品質、食安標準，不只替家長減輕負擔，更要讓孩子吃得安心、健康成長。" },
        { title: "週週鮮奶強身", facts: ["每月 8 果 6 乳再向前一步", "提供更多元水果及營養品項", "在超商、超市也可領取"], body: "在國中小推動週週喝鮮奶、吃水果，更提供多元的水果及營養品項，並規劃超商、超市領取管道，補充營養更便利、選擇更豐富。" },
        { title: "雙語教學深化", facts: ["台語＋英語雙語教育", "用台語認識故鄉，親近長輩", "培養英語溝通能力，與世界接軌"], body: "全面深化台語、英語「雙語教育」，讓孩子一方面用台語認識故鄉、親近長輩、了解台南歷史文化，另一方面培養英語溝通能力，勇敢與世界接軌。" },
      ],
    },
    {
      id: "urban", cat: "urban", icon: "🏗️", title: "都更三箭｜翻轉舊城",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid0o8ccwFVVA4d9vQf7djjVQusg2pGFeoBTfKtv3ALuhPg94zWQuFmZWg1DPn8mywHyl",
      items: [
        { title: "全面強化都更", facts: ["邀請李鴻源部長擔任顧問", "防災型都更示範建築", "2031 年完成 12,045 戶社宅", "三寶家庭免抽籤優先入住"], body: "推動「防災型都更」，四年任期內至少完成一棟防災型都更示範建築。加速社宅及婚育宅規劃，朝2031年完成12,045戶社宅目標推進。三胎家庭免抽籤、免排隊，優先入住婚育宅。" },
        { title: "補助老屋健檢", facts: ["屋齡 30 年以上補助健檢", "受損房屋免費健檢並追蹤", "結構補強、修繕及外牆拉皮補助"], body: "提供屋齡30年以上房屋健檢補助。針對地震後紅、黃單受損房屋，提供免費健檢並持續追蹤，再依評估結果提供結構補強、修繕及外牆拉皮補助。" },
        { title: "AI 地震防災網", facts: ["整合地震監測、預警及應變系統", "全市地震風險圖資", "AI 研判受災區域，搶快救援"], body: "建構大台南「AI智慧地震防災網」，整合地震監測、預警及災害應變系統，建立全市地震風險圖資。震後由AI快速研判受災區域，讓救援搶快一步。" },
      ],
    },
    {
      id: "transport", cat: "transport", icon: "🚇", title: "交通三箭｜打通路網",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid02tXcEqw7157Xt7soUYtJvVuqscweozGcUS4Q2hBhNFpAznDGCatsq8MzTwh3Gg9Uxl",
      items: [
        { title: "捷運十字路網", facts: ["首條捷運藍線盡速開工", "加速綠線後續規劃", "串聯東西、南北重要生活圈"], body: "全力推動藍線盡速開工、如期完工，加速綠線後續規劃，讓台南捷運十字路網早日成形，串聯東西、南北重要生活圈。" },
        { title: "交通建設加速", facts: ["北外環快速道路 2031 年全線完工", "增加公車幹線班次", "廣設綠色人行道"], body: "全力協調中央加速北外環工程進度，全面檢視台南公車路網，增加市區主要幹線班次。針對缺乏人行道的路段，規劃綠色人行道，清楚區隔人車動線。" },
        { title: "整頓交通亂象", facts: ["酒駕毒駕鐵腕取締", "檢討不合理罰單", "全面盤點高風險路口"], body: "鐵腕取締酒駕毒駕，同時檢視交通執法與罰單合理性，主動改善標線不清、號誌設計不合理的路段。全面盤點台南高風險路口及事故熱點，從道路設計源頭降低事故風險。" },
        { title: "改善大眾運輸", facts: ["優化公車路網與轉乘環境", "捷運先導公車", "加碼票價補貼與轉乘優惠", "提高司機待遇、AI 智慧評鑑"], body: "盤點公車路網，增加主幹道班次；規劃捷運先導公車培養乘車習慣；加碼市民專屬公車票價補貼；大幅提高司機待遇，引入AI智慧評鑑系統。" },
      ],
    },
    {
      id: "fertility", cat: "fertility", icon: "🤰", title: "備孕三箭｜生育自主",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid0s3Dw5cNLKgPnmQuPMkZfJ1K8QQodx5Uqk4XDjw425nhvoDnDNqkrRvSKiCEv6tvfl",
      items: [
        { title: "女性補助凍卵", facts: ["25 至 40 歲女性", "終身一次，最高補助 3 萬元", "把生育選擇權交還給女性"], body: "全面補助台南25至40歲女性凍卵，終身一次，最高補助3萬元。減輕負擔，把生育選擇權交還給女性。" },
        { title: "男性凍精補助", facts: ["醫療性凍精補助", "終身一次，每人最高 3,000 元", "備孕不能只照顧女性"], body: "針對因疾病、治療等醫療需求，必須提前保存生育力的男性，提供醫療性凍精補助，終身一次，每人最高補助3000元。" },
        { title: "AMH 抽血檢驗補助", facts: ["補助 AMH 抽血檢驗", "每人上限 1,000 元", "提早掌握卵巢功能"], body: "補助女性AMH（抗穆勒氏管荷爾蒙）抽血檢驗，每人上限1000元，協助女性了解卵巢功能與卵子庫存量，提早掌握自身狀況。" },
      ],
    },
    {
      id: "childcare", cat: "childcare", icon: "🍼", title: "育兒三箭｜育兒無憂",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid02S3ZuhQksZ9QRsGuzGCVHiwC2qG2n6KVfFby3M5FLabAPrQtLU3XRTSUfT5ENNVSAl",
      items: [
        { title: "0 到 3 歲尿布免費", facts: ["市府大量採購降低成本", "直接讓嬰幼兒免費使用", "替新手爸媽省下育兒開銷"], body: "由市府大量採購、降低成本，直接讓嬰幼兒免費使用，實實在在替新手爸媽省下一筆育兒開銷。" },
        { title: "0 到 6 歲幼兒健保全額免費", facts: ["健保費由市府補助", "從出生到上小學前免負擔"], body: "0到6歲幼兒健保全額免費，健保費由市政府補助，讓台南孩子從出生到上小學前，不用再由家長負擔健保費。" },
        { title: "公托機構翻倍", facts: ["目前僅 19 處公共托育機構", "數量直接翻倍", "活化閒置校舍轉型公托空間"], body: "讓公托數量直接翻倍，擴大托育量能。同時活化閒置校舍，轉型公托空間，就近提供托育服務。" },
      ],
    },
    {
      id: "birth", cat: "fertility", icon: "👶", title: "生子三箭｜最強催生",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid05b7LwcaPLf5XS7YrRxnvQFH4yeCubf39yAgBS5ngCvRYuBkixMG7XfqaZ6tr7ZbKl",
      items: [
        { title: "全國最強婚育宅", facts: ["每坪 15 萬元純營建成本價", "免自備款（免頭期款）", "生一胎兩房 375 萬、二胎三房 525 萬、三胎四房 675 萬"], body: "透過都更容積回饋、公辦重劃土地及住宅基金運用，以每坪15萬元的純營建成本價、免自備款提供婚育宅。孩子愈多，房子就跟著變大間。" },
        { title: "最強育兒補助", facts: ["0-15 歲每月領 5,000 元", "中央存未來，台南顧現在", "6-18 歲市府每月再加碼 2,500 元"], body: "中央方案照樣領，6至18歲台南市府每月再加碼2500元，讓孩子每月5000元領好領滿。" },
        { title: "最強生育津貼", facts: ["第一胎補助 3 萬元", "第二胎以上每胎 5 萬元"], body: "生育津貼直接加碼！第一胎補助3萬元，第二胎以上每胎補助5萬元，從第一胎開始就替新手爸媽分擔生養壓力。" },
      ],
    },
    {
      id: "pedestrian", cat: "transport", icon: "🚶", title: "行人友善環境",
      source: "https://www.facebook.com/TEL062268268/posts/pfbid0HSotW8m9xNhz8e13SFT13sY5M111LudbgBXgCaRxj5z23nLKWj8TyAKvrhQMJNvzl",
      items: [
        { title: "廣設綠色人行道", facts: ["尊重行人路權", "減少人車事故", "銀髮族及行動不便人士友善"], body: "提升台南市民及遊客步行安全，減少人車事故，為銀髮族及行動不便人士開創友善用路空間。" },
        { title: "改善路型、維護學生安全", facts: ["加設行人庇護道、穿越道", "行人專用時相", "改善學區周邊通學路"], body: "加速評估全市重點道路路型，加設行人庇護道、穿越道等；透過行人專用時相，改善學區周邊通學路狀況。" },
      ],
    },
    {
      id: "promises", cat: "integrity", icon: "📋", title: "上任承諾",
      items: [
        { title: "局處長一起 Call-in 解決問題", facts: ["馬上辦中心", "市民問題馬上辦"], body: "局處長一起Callin解決人民問題，設立馬上辦中心，市民問題馬上辦。", source: "https://www.youtube.com/shorts/ncdstHUj-JY" },
        { title: "徹查爐渣案與光電弊案", facts: ["追究責任到底", "拒絕官商勾結、杜絕黑金"], body: "徹查台南學甲爐渣案，追究責任到底。有魄力揭開台南光電弊案，拒絕官商勾結，杜絕黑金利益輸送。" },
        { title: "強化城市治安", facts: ["讓台南人安心生活"], body: "強化城市治安，讓台南人安心生活。" },
        { title: "全面改善道路坑洞", facts: ["還給市民安全平整的道路"], body: "全面改善道路坑洞，還給市民安全平整的道路。" },
        { title: "清理城西垃圾山", facts: ["改善台南垃圾堆置問題"], body: "清理城西垃圾山，改善台南垃圾堆置問題。" },
      ],
    },
  ],
};

function renderCandidate(containerId, candidate, side) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  for (const group of candidate.groups) {
    const div = document.createElement("div");
    div.className = "policy-group open";
    div.dataset.cat = group.cat;
    div.style.animationDelay = `${candidate.groups.indexOf(group) * 0.04}s`;

    const itemsHtml = group.items.map((item) => {
      const factsHtml = item.facts.map((f) => `<li>${esc(f)}</li>`).join("");
      const srcLink = item.source || group.source;
      const srcHtml = srcLink ? `<a class="item-source" href="${esc(srcLink)}" target="_blank" rel="noopener">查看來源 ↗</a>` : "";
      return `<div class="policy-item">
        <div class="item-title">${esc(item.title)}</div>
        <ul class="item-facts">${factsHtml}</ul>
        <div class="item-body">${esc(item.body)}${srcHtml}</div>
      </div>`;
    }).join("");

    div.innerHTML = `
      <div class="policy-group-header">
        <div class="group-icon">${group.icon}</div>
        <div class="group-title">${esc(group.title)}</div>
        <span class="group-count">${group.items.length} 項</span>
        <span class="group-arrow">▸</span>
      </div>
      <div class="policy-items">${itemsHtml}</div>
    `;
    container.appendChild(div);
  }
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function init() {
  renderCandidate("feifei-body", FEIFEI, "feifei");
  renderCandidate("longji-body", LONGJI, "longji");

  // Group toggle
  document.addEventListener("click", (e) => {
    const header = e.target.closest(".policy-group-header");
    if (header) {
      header.parentElement.classList.toggle("open");
      return;
    }
    const item = e.target.closest(".policy-item");
    if (item && !e.target.closest("a")) {
      item.classList.toggle("expanded");
    }
  });

  // View toggle
  const viewBtns = document.querySelectorAll(".view-toggle button");
  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewBtns.forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      document.body.className = `view-${btn.dataset.view}`;
    });
  });

  // Category filter
  const catBtns = document.querySelectorAll(".cat-btn");
  catBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      catBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.cat;
      document.querySelectorAll(".policy-group").forEach((g) => {
        if (cat === "all" || g.dataset.cat === cat) {
          g.style.display = "";
        } else {
          g.style.display = "none";
        }
      });

      // Show empty state if no groups visible
      ["feifei-body", "longji-body"].forEach((id) => {
        const body = document.getElementById(id);
        const visible = body.querySelectorAll(".policy-group:not([style*='display: none'])");
        const existing = body.querySelector(".empty-cat");
        if (visible.length === 0 && !existing) {
          const empty = document.createElement("div");
          empty.className = "empty-cat";
          empty.textContent = "此分類暫無政策";
          body.appendChild(empty);
        } else if (visible.length > 0 && existing) {
          existing.remove();
        }
      });
    });
  });

  // Compute sticky offset for category nav
  function updateStickyOffsets() {
    const topBar = document.querySelector(".top-bar");
    const catNav = document.getElementById("category-nav");
    if (topBar && catNav) {
      catNav.style.top = topBar.offsetHeight + "px";
    }
  }
  updateStickyOffsets();
  window.addEventListener("resize", updateStickyOffsets);
}

init();
