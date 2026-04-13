/* ================================================================
   台南市民信箱快速填報
   All personal data stored in localStorage only. No data sent to
   any third-party server. Final submission goes through the official
   cmsweb.tainan.gov.tw platform.
   ================================================================ */

'use strict';

// ── Taiwan city/district data ──────────────────────────────────
const TW_AREAS = {
  '臺北市':   ['松山區','信義區','大安區','中山區','中正區','大同區','萬華區','文山區','南港區','內湖區','士林區','北投區'],
  '基隆市':   ['仁愛區','信義區','中正區','中山區','安樂區','暖暖區','七堵區'],
  '新北市':   ['板橋區','三重區','中和區','永和區','新莊區','新店區','樹林區','鶯歌區','三峽區','淡水區','汐止區','瑞芳區','土城區','蘆洲區','五股區','泰山區','林口區','深坑區','石碇區','坪林區','三芝區','石門區','八里區','平溪區','雙溪區','貢寮區','金山區','萬里區','烏來區'],
  '桃園市':   ['桃園區','中壢區','大溪區','楊梅區','蘆竹區','大園區','龜山區','八德區','龍潭區','平鎮區','新屋區','觀音區','復興區'],
  '新竹市':   ['東區','北區','香山區'],
  '新竹縣':   ['竹北市','湖口鄉','新豐鄉','新埔鎮','關西鎮','芎林鄉','寶山鄉','竹東鎮','五峰鄉','橫山鄉','尖石鄉','北埔鄉','峨眉鄉'],
  '苗栗縣':   ['苗栗市','苑裡鎮','通霄鎮','竹南鎮','頭份市','後龍鎮','卓蘭鎮','大湖鄉','公館鄉','銅鑼鄉','南庄鄉','頭屋鄉','三義鄉','西湖鄉','造橋鄉','三灣鄉','獅潭鄉','泰安鄉'],
  '臺中市':   ['中區','東區','南區','西區','北區','北屯區','西屯區','南屯區','太平區','大里區','霧峰區','烏日區','豐原區','后里區','石岡區','東勢區','和平區','新社區','潭子區','大雅區','神岡區','大肚區','沙鹿區','龍井區','梧棲區','清水區','大甲區','外埔區','大安區'],
  '彰化縣':   ['彰化市','鹿港鎮','和美鎮','線西鄉','伸港鄉','福興鄉','秀水鄉','花壇鄉','芬園鄉','員林市','溪湖鎮','田中鎮','大村鄉','埔鹽鄉','埔心鄉','永靖鄉','社頭鄉','二水鄉','北斗鎮','二林鎮','田尾鄉','埤頭鄉','芳苑鄉','大城鄉','竹塘鄉','溪州鄉'],
  '南投縣':   ['南投市','中寮鄉','草屯鎮','國姓鄉','埔里鎮','仁愛鄉','名間鄉','集集鎮','水里鄉','魚池鄉','信義鄉','竹山鎮','鹿谷鄉'],
  '雲林縣':   ['斗南鎮','大埤鄉','虎尾鎮','土庫鎮','褒忠鄉','東勢鄉','臺西鄉','崙背鄉','麥寮鄉','斗六市','林內鄉','古坑鄉','莿桐鄉','西螺鎮','二崙鄉','北港鎮','水林鄉','口湖鄉','四湖鄉','元長鄉'],
  '嘉義市':   ['東區','西區'],
  '嘉義縣':   ['番路鄉','梅山鄉','竹崎鄉','阿里山鄉','中埔鄉','大埔鄉','水上鄉','鹿草鄉','太保市','朴子市','東石鄉','六腳鄉','新港鄉','民雄鄉','大林鎮','溪口鄉','義竹鄉','布袋鎮'],
  '臺南市':   ['中西區','東區','南區','北區','安平區','安南區','永康區','歸仁區','新化區','左鎮區','玉井區','楠西區','南化區','仁德區','關廟區','龍崎區','官田區','麻豆區','佳里區','西港區','七股區','將軍區','學甲區','北門區','新營區','後壁區','白河區','東山區','六甲區','下營區','柳營區','鹽水區','善化區','大內區','山上區','新市區','安定區'],
  '高雄市':   ['楠梓區','左營區','鼓山區','三民區','鹽埕區','前金區','苓雅區','前鎮區','旗津區','小港區','鳳山區','林園區','大寮區','大樹區','大社區','仁武區','鳥松區','岡山區','橋頭區','燕巢區','田寮區','阿蓮區','路竹區','湖內區','茄萣區','永安區','彌陀區','梓官區','旗山區','美濃區','六龜區','甲仙區','杉林區','內門區','茂林區','桃源區','那瑪夏區'],
  '屏東縣':   ['屏東市','三地門鄉','霧臺鄉','瑪家鄉','九如鄉','里港鄉','高樹鄉','鹽埔鄉','長治鄉','麟洛鄉','竹田鄉','內埔鄉','萬丹鄉','潮州鎮','泰武鄉','來義鄉','萬巒鄉','崁頂鄉','新埤鄉','南州鄉','林邊鄉','東港鎮','琉球鄉','佳冬鄉','新園鄉','枋寮鄉','枋山鄉','春日鄉','獅子鄉','車城鄉','牡丹鄉','恆春鎮','滿州鄉'],
  '宜蘭縣':   ['宜蘭市','頭城鎮','礁溪鄉','壯圍鄉','員山鄉','羅東鎮','三星鄉','大同鄉','五結鄉','冬山鄉','蘇澳鎮','南澳鄉'],
  '花蓮縣':   ['花蓮市','新城鄉','秀林鄉','吉安鄉','壽豐鄉','鳳林鎮','光復鄉','豐濱鄉','瑞穗鄉','萬榮鄉','玉里鎮','卓溪鄉','富里鄉'],
  '臺東縣':   ['臺東市','綠島鄉','蘭嶼鄉','延平鄉','卑南鄉','鹿野鄉','關山鎮','海端鄉','池上鄉','東河鄉','成功鎮','長濱鄉','太麻里鄉','金峰鄉','大武鄉','達仁鄉'],
  '澎湖縣':   ['馬公市','西嶼鄉','望安鄉','七美鄉','白沙鄉','湖西鄉'],
  '金門縣':   ['金城鎮','金湖鎮','金沙鎮','金寧鄉','烈嶼鄉','烏坵鄉'],
  '連江縣':   ['南竿鄉','北竿鄉','莒光鄉','東引鄉'],
};

// ── Case items (from cmsweb.tainan.gov.tw/webapi/api/items/) ──
const CASE_ITEMS = [
  { Item: '01', ItemName: '警政及路霸排除類', Subitems: [
    { Subitem: '01', SubitemName: '交通違規' },
    { Subitem: '02', SubitemName: '物品佔用道路、人行道、騎樓（含移動式、固定式、招牌、景觀燈）' },
    { Subitem: '03', SubitemName: '廢棄車輛、佔用道路、人行道、騎樓' },
    { Subitem: '04', SubitemName: '違規爭議及投訴（含拖吊）' },
    { Subitem: '05', SubitemName: '治安維護' },
    { Subitem: '06', SubitemName: '交通管制疏導' },
    { Subitem: '07', SubitemName: '監視器問題' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '02', ItemName: '環保類', Subitems: [
    { Subitem: '01', SubitemName: '水、空氣、環境污染' },
    { Subitem: '02', SubitemName: '垃圾清運（含垃圾車及回收車）' },
    { Subitem: '03', SubitemName: '廢棄物處理（含回收、掩埋、焚化）' },
    { Subitem: '04', SubitemName: '路面清理（含垃圾、油漬、排泄物及動物屍體）' },
    { Subitem: '05', SubitemName: '空地空屋髒亂' },
    { Subitem: '06', SubitemName: '場所、設備及連續噪音' },
    { Subitem: '07', SubitemName: '人、動物及非連續噪音' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '03', ItemName: '交通類', Subitems: [
    { Subitem: '01', SubitemName: '路邊停車格及停車場問題' },
    { Subitem: '02', SubitemName: '停車收費問題' },
    { Subitem: '03', SubitemName: '標線問題' },
    { Subitem: '04', SubitemName: '號誌、標誌問題' },
    { Subitem: '05', SubitemName: '交通號誌損壞' },
    { Subitem: '06', SubitemName: '公車問題' },
    { Subitem: '07', SubitemName: '捷運問題' },
    { Subitem: '08', SubitemName: '違規裁罰申訴' },
    { Subitem: '10', SubitemName: '無人機問題' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '04', ItemName: '道路、人行道、騎樓、排水溝及橋梁', Subitems: [
    { Subitem: '01', SubitemName: '道路、人行道凹陷破損回填不實' },
    { Subitem: '02', SubitemName: '道路、人行道工程問題' },
    { Subitem: '03', SubitemName: '道路、橋樑開闢徵收補償' },
    { Subitem: '04', SubitemName: '地下道問題（含車行及人行）' },
    { Subitem: '05', SubitemName: '排水溝溝蓋破損、鬆動、遺失' },
    { Subitem: '06', SubitemName: '排水溝淤積清疏' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '05', ItemName: '路燈路樹公園類', Subitems: [
    { Subitem: '01', SubitemName: '路燈故障' },
    { Subitem: '02', SubitemName: '路燈損毀、傾倒' },
    { Subitem: '03', SubitemName: '路樹修剪' },
    { Subitem: '04', SubitemName: '車輛違規進入公園' },
    { Subitem: '05', SubitemName: '公園設施損毀' },
    { Subitem: '06', SubitemName: '公園、綠地、安全島髒亂' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '06', ItemName: '建築管理及使用類', Subitems: [
    { Subitem: '01', SubitemName: '違建查報及拆除' },
    { Subitem: '02', SubitemName: '公寓大廈管理' },
    { Subitem: '03', SubitemName: '建物公共安全' },
    { Subitem: '04', SubitemName: '廣告招牌問題' },
    { Subitem: '05', SubitemName: '廣告招牌欲墜' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '07', ItemName: '水利類', Subitems: [
    { Subitem: '01', SubitemName: '雨、污水下水道工程' },
    { Subitem: '02', SubitemName: '道路積淹水' },
    { Subitem: '03', SubitemName: '地區積淹水' },
    { Subitem: '04', SubitemName: '房屋積水' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '08', ItemName: '教育類', Subitems: [
    { Subitem: '01', SubitemName: '幼兒園與學費補助' },
    { Subitem: '02', SubitemName: '補教問題' },
    { Subitem: '03', SubitemName: '十二年國教' },
    { Subitem: '04', SubitemName: '教師介聘及甄選' },
    { Subitem: '05', SubitemName: '親子溝通、班級經營' },
    { Subitem: '06', SubitemName: '招生入學' },
    { Subitem: '07', SubitemName: '英語教育與推廣' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '09', ItemName: '衛生醫療類', Subitems: [
    { Subitem: '01', SubitemName: '食安' },
    { Subitem: '02', SubitemName: '防疫' },
    { Subitem: '03', SubitemName: '醫事醫療' },
    { Subitem: '04', SubitemName: '心理健康' },
    { Subitem: '05', SubitemName: '登革熱防治' },
    { Subitem: '10', SubitemName: '照顧服務管理含長照照服員及據點' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '10', ItemName: '社會福利救助類', Subitems: [
    { Subitem: '01', SubitemName: '低與中低收入戶、急難救助' },
    { Subitem: '02', SubitemName: '社會福利（含兒少、婦女、老人、身障）' },
    { Subitem: '04', SubitemName: '復康巴士' },
    { Subitem: '05', SubitemName: '街友問題' },
    { Subitem: '06', SubitemName: '人民團體問題' },
    { Subitem: '07', SubitemName: '家暴、性騷擾及性侵害防治' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '11', ItemName: '勞工類', Subitems: [
    { Subitem: '01', SubitemName: '勞基法問題（含一例一休）' },
    { Subitem: '02', SubitemName: '勞資爭議協調' },
    { Subitem: '03', SubitemName: '求職與徵才' },
    { Subitem: '04', SubitemName: '職業災害及衛生安全' },
    { Subitem: '05', SubitemName: '移工問題' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '12', ItemName: '經濟發展類', Subitems: [
    { Subitem: '01', SubitemName: '違規稽查' },
    { Subitem: '02', SubitemName: '工商及公司登記' },
    { Subitem: '03', SubitemName: '市場、攤販、夜市問題' },
    { Subitem: '04', SubitemName: '能源及公用事業（非關天然災害）' },
    { Subitem: '05', SubitemName: '商圈及市集' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '13', ItemName: '文化觀光類', Subitems: [
    { Subitem: '01', SubitemName: '圖書館管理' },
    { Subitem: '02', SubitemName: '文化中心及藝文活動' },
    { Subitem: '03', SubitemName: '古蹟、文資及文化園區管理' },
    { Subitem: '04', SubitemName: '古蹟毀損' },
    { Subitem: '05', SubitemName: '旅館、民宿及溫泉區管理' },
    { Subitem: '06', SubitemName: '風景區管理' },
    { Subitem: '07', SubitemName: '觀光行銷、旅行業及旅展' },
    { Subitem: '08', SubitemName: '觀光活動美食小吃及伴手禮' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '14', ItemName: '農林漁畜及動保類', Subitems: [
    { Subitem: '01', SubitemName: '森林自然保育' },
    { Subitem: '02', SubitemName: '農地管理' },
    { Subitem: '03', SubitemName: '農務、漁業及畜產' },
    { Subitem: '04', SubitemName: '漁港及近海管理' },
    { Subitem: '05', SubitemName: '動物救援' },
    { Subitem: '06', SubitemName: '動物防疫（含禽流感、狂犬病）' },
    { Subitem: '07', SubitemName: '動物捕捉及收容' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '15', ItemName: '民政類', Subitems: [
    { Subitem: '01', SubitemName: '廟會活動優質化' },
    { Subitem: '02', SubitemName: '生命事業及殯葬問題' },
    { Subitem: '03', SubitemName: '戶政問題' },
    { Subitem: '04', SubitemName: '行政區劃、鄰里整編' },
    { Subitem: '05', SubitemName: '社區活動中心' },
    { Subitem: '06', SubitemName: '兵役問題' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '16', ItemName: '都市發展類', Subitems: [
    { Subitem: '01', SubitemName: '都市計畫' },
    { Subitem: '02', SubitemName: '土地使用' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '17', ItemName: '地政類', Subitems: [
    { Subitem: '01', SubitemName: '地籍問題' },
    { Subitem: '02', SubitemName: '地價問題' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '18', ItemName: '消防類', Subitems: [
    { Subitem: '01', SubitemName: '消防安全檢查' },
    { Subitem: '02', SubitemName: '火災及爆炸' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '20', ItemName: '財政稅務類', Subitems: [
    { Subitem: '01', SubitemName: '地方稅務問題' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '23', ItemName: '體育類', Subitems: [
    { Subitem: '01', SubitemName: '運動設施問題' },
    { Subitem: '02', SubitemName: '體育活動及賽事' },
    { Subitem: '99', SubitemName: '其他' },
  ]},
  { Item: '90', ItemName: '其他類', Subitems: [
    { Subitem: '99', SubitemName: '其他' },
  ]},
];

// ── LocalStorage keys ──────────────────────────────────────────
const KEY_DRAFT = 'cmsweb_draft';

// Fields saved in draft
const ALL_FIELDS = [
  'name', 'sex', 'telno', 'email', 'county', 'district', 'address',
  'mainItem', 'subItem',
  'locCounty', 'locDistrict', 'locAddress', 'lat', 'lng',
  'content'
];

// ── Leaflet map ────────────────────────────────────────────────
let map, marker;

function initMap() {
  map = L.map('location-map').setView([23.0, 120.2], 12);

  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '<a href="https://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
  }).addTo(map);

  map.on('click', function(e) {
    setMarker(e.latlng.lat, e.latlng.lng);
  });
}

function setMarker(lat, lng) {
  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', function(e) {
      const pos = e.target.getLatLng();
      setCoordFields(pos.lat, pos.lng);
    });
  }
  setCoordFields(lat, lng);
}

function setCoordFields(lat, lng) {
  document.getElementById('f-lat').value = lat.toFixed(6);
  document.getElementById('f-lng').value = lng.toFixed(6);
  scheduleDraftSave();
}

// Called when the user manually edits the lat or lng input fields
function onCoordInput() {
  const lat = parseFloat(document.getElementById('f-lat').value);
  const lng = parseFloat(document.getElementById('f-lng').value);
  if (!isNaN(lat) && !isNaN(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    map.setView([lat, lng], map.getZoom());
    setMarker(lat, lng);
  }
  scheduleDraftSave();
}

function locateMe() {
  if (!navigator.geolocation) {
    alert('您的瀏覽器不支援定位功能');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 16);
      setMarker(lat, lng);
    },
    function() {
      alert('無法取得您的位置，請確認已允許瀏覽器存取位置資訊');
    }
  );
}

// ── County/District dropdowns ──────────────────────────────────
function populateCounty(selectId, districtId) {
  const sel = document.getElementById(selectId);
  Object.keys(TW_AREAS).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => onCountyChange(selectId, districtId));
}

function onCountyChange(countyId, districtId) {
  const county = document.getElementById(countyId).value;
  const dSel = document.getElementById(districtId);
  dSel.innerHTML = '<option value="">— 請選擇 —</option>';
  if (!county) { dSel.disabled = true; return; }
  dSel.disabled = false;
  (TW_AREAS[county] || []).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    dSel.appendChild(opt);
  });
}

// ── Case item dropdowns ────────────────────────────────────────
function populateMainItems() {
  const sel = document.getElementById('f-main-item');
  CASE_ITEMS.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.Item;
    opt.textContent = item.ItemName;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', onMainItemChange);
}

function onMainItemChange() {
  const val = document.getElementById('f-main-item').value;
  const subSel = document.getElementById('f-sub-item');
  subSel.innerHTML = '<option value="">— 請選擇子項目 —</option>';
  if (!val) { subSel.disabled = true; return; }
  const found = CASE_ITEMS.find(i => i.Item === val);
  if (!found) { subSel.disabled = true; return; }
  subSel.disabled = false;
  found.Subitems.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.Subitem;
    opt.textContent = sub.SubitemName;
    subSel.appendChild(opt);
  });
}

// ── Draft save/restore ─────────────────────────────────────────
let draftTimer = null;

function scheduleDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 800);
}

function saveDraft() {
  const data = {};
  ALL_FIELDS.forEach(f => {
    const el = document.getElementById('f-' + f.replace(/([A-Z])/g, '-$1').toLowerCase());
    if (el) data[f] = el.value;
  });
  localStorage.setItem(KEY_DRAFT, JSON.stringify(data));
  const ind = document.getElementById('draft-saved');
  ind.classList.add('show');
  setTimeout(() => ind.classList.remove('show'), 2000);
}

function restoreDraft() {
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY_DRAFT) || '{}'); } catch { data = {}; }

  // Restore simple fields first
  const simpleFields = ['name', 'sex', 'telno', 'email', 'address', 'locAddress', 'content'];
  simpleFields.forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el && data[f]) el.value = data[f];
  });

  // Restore county+district (contact); default to 臺南市
  {
    const cSel = document.getElementById('f-county');
    cSel.value = data.county || '臺南市';
    onCountyChange('f-county', 'f-district');
    if (data.district) document.getElementById('f-district').value = data.district;
  }

  // Restore location county+district; default to 臺南市
  {
    const lc = document.getElementById('f-loc-county');
    lc.value = data.locCounty || '臺南市';
    onCountyChange('f-loc-county', 'f-loc-district');
    if (data.locDistrict) document.getElementById('f-loc-district').value = data.locDistrict;
  }

  // Restore main item + sub item
  if (data.mainItem) {
    document.getElementById('f-main-item').value = data.mainItem;
    onMainItemChange();
    if (data.subItem) document.getElementById('f-sub-item').value = data.subItem;
  }

  // Restore map marker
  if (data.lat && data.lng) {
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 16);
      setMarker(lat, lng);
    }
  }

  updateContentCount();
}

// ── Validation ─────────────────────────────────────────────────
function showError(id, show) {
  const el = document.getElementById('err-' + id);
  const inp = document.getElementById('f-' + id);
  if (!el || !inp) return;
  if (show) {
    el.classList.add('show');
    inp.classList.add('error');
  } else {
    el.classList.remove('show');
    inp.classList.remove('error');
  }
}

function validate() {
  let ok = true;

  const name = document.getElementById('f-name').value.trim();
  if (name.length < 2) { showError('name', true); ok = false; } else showError('name', false);

  const telno = document.getElementById('f-telno').value.trim();
  if (!telno) { showError('telno', true); ok = false; } else showError('telno', false);

  const email = document.getElementById('f-email').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email', true); ok = false; } else showError('email', false);

  const county = document.getElementById('f-county').value;
  if (!county) { showError('county', true); ok = false; } else showError('county', false);

  const district = document.getElementById('f-district').value;
  if (!district) { showError('district', true); ok = false; } else showError('district', false);

  const address = document.getElementById('f-address').value.trim();
  if (!address) { showError('address', true); ok = false; } else showError('address', false);

  const mainItem = document.getElementById('f-main-item').value;
  if (!mainItem) { showError('main-item', true); ok = false; } else showError('main-item', false);

  const subItem = document.getElementById('f-sub-item').value;
  if (!subItem) { showError('sub-item', true); ok = false; } else showError('sub-item', false);

  const content = document.getElementById('f-content').value.trim();
  if (!content) { showError('content', true); ok = false; } else showError('content', false);

  const confirm = document.getElementById('f-confirm').checked;
  const errConfirm = document.getElementById('err-confirm');
  if (!confirm) { errConfirm.classList.add('show'); ok = false; } else errConfirm.classList.remove('show');

  return ok;
}

// ── Build cmsweb URL with query params ─────────────────────────
function buildCmswebUrl() {
  const get = id => document.getElementById(id).value.trim();

  // Map sex value to Chinese for display
  const sexMap = { M: '先生', F: '小姐', O: '其他' };
  const sexVal = get('f-sex');

  const mainItemVal = get('f-main-item');
  const mainItemObj = CASE_ITEMS.find(i => i.Item === mainItemVal);
  const mainItemName = mainItemObj ? mainItemObj.ItemName : '';
  const subItemVal = get('f-sub-item');
  const subItemObj = mainItemObj ? mainItemObj.Subitems.find(s => s.Subitem === subItemVal) : null;
  const subItemName = subItemObj ? subItemObj.SubitemName : '';

  const params = new URLSearchParams({
    Sugg_Name: get('f-name'),
    Sugg_Sex: sexMap[sexVal] || '',
    Sugg_Telno: get('f-telno'),
    Sugg_Email: get('f-email'),
    Sugg_Addr1: get('f-county'),
    Sugg_Addr2: get('f-district'),
    Sugg_Addr3: '',
    Sugg_Addr4: get('f-address'),
    MainItem: mainItemVal,
    MainItemName: mainItemName,
    SubItem: subItemVal,
    SubItemName: subItemName,
    LocCounty: get('f-loc-county'),
    LocDistrict: get('f-loc-district'),
    LocAddress: get('f-loc-address'),
    Lat: get('f-lat'),
    Lng: get('f-lng'),
    Content: get('f-content'),
  });

  return 'https://cmsweb.tainan.gov.tw/RWD/#/report?' + params.toString();
}

// ── Form submit ────────────────────────────────────────────────
function handleSubmit(e) {
  e.preventDefault();
  if (!validate()) return;

  saveDraft();

  // Build the pre-filled URL and open in new tab
  const url = buildCmswebUrl();

  // Show info box
  const box = document.getElementById('result-box');
  const title = document.getElementById('result-title');
  const body = document.getElementById('result-body');
  box.classList.remove('error-box');
  box.classList.add('show');
  title.textContent = '✅ 即將前往官方頁面';
  body.innerHTML = `
    <p style="font-size:13px; margin-bottom:8px;">
      請在官方頁面確認資料無誤後，輸入驗證碼並按下送出。
    </p>
    <a href="${url}" target="_blank" rel="noopener"
       style="display:inline-block; background:#1a5c3a; color:white; padding:10px 20px;
              border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px;">
      🔗 開啟官方台南市民信箱
    </a>
    <p style="font-size:11px; color:#888; margin-top:8px;">若連結沒有自動帶入資料，請手動複製貼上各欄位內容</p>
  `;

  window.open(url, '_blank', 'noopener');
}

// ── Tab switching ──────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.page-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('tab-' + name + '-btn').classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (name === 'form') document.getElementById('btn-goto-form').classList.add('active');
  if (name === 'guide') document.getElementById('btn-goto-guide').classList.add('active');

  if (name === 'form') {
    // Invalidate leaflet map size after tab becomes visible
    setTimeout(() => map && map.invalidateSize(), 100);
  }
}

// ── Content char count ─────────────────────────────────────────
function updateContentCount() {
  const len = document.getElementById('f-content').value.length;
  document.getElementById('content-count').textContent = len;
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  populateCounty('f-county', 'f-district');
  populateCounty('f-loc-county', 'f-loc-district');
  populateMainItems();
  restoreDraft();

  // Auto-save on input
  ALL_FIELDS.forEach(f => {
    const id = 'f-' + f.replace(/([A-Z])/g, c => '-' + c.toLowerCase());
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleDraftSave);
    if (el) el.addEventListener('change', scheduleDraftSave);
  });

  // Bidirectional lat/lng ↔ map
  document.getElementById('f-lat').addEventListener('change', onCoordInput);
  document.getElementById('f-lng').addEventListener('change', onCoordInput);

  document.getElementById('f-content').addEventListener('input', updateContentCount);

  document.getElementById('cms-form').addEventListener('submit', handleSubmit);
});
