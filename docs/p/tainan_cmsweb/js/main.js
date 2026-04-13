/* ================================================================
   台南市民信箱快速填報
   All personal data stored in localStorage only. No data sent to
   any third-party server. Final submission goes through the official
   cmsweb.tainan.gov.tw platform.
   ================================================================ */

'use strict';

// ── County codes (from cmsweb iM function) ────────────────────
const COUNTIES = [
  { code: '6700000000', name: '台南市' },
  { code: '6500000000', name: '新北市' },
  { code: '6600000000', name: '台中市' },
  { code: '6400000000', name: '高雄市' },
  { code: '6300000000', name: '台北市' },
  { code: '1001700000', name: '基隆市' },
  { code: '1000200000', name: '宜蘭縣' },
  { code: '1001800000', name: '新竹市' },
  { code: '1000400000', name: '新竹縣' },
  { code: '6800000000', name: '桃園市' },
  { code: '1000500000', name: '苗栗縣' },
  { code: '1000700000', name: '彰化縣' },
  { code: '1000800000', name: '南投縣' },
  { code: '1002000000', name: '嘉義市' },
  { code: '1001000000', name: '嘉義縣' },
  { code: '1000900000', name: '雲林縣' },
  { code: '1001600000', name: '澎湖縣' },
  { code: '1001300000', name: '屏東縣' },
  { code: '1001400000', name: '台東縣' },
  { code: '1001500000', name: '花蓮縣' },
  { code: '0902000000', name: '金門縣' },
  { code: '0900700000', name: '連江縣' },
];

// Tainan districts hardcoded (from cmsweb oM function)
const TAINAN_CODE = '6700000000';
const TAINAN_DISTRICTS = [
  { code: '6700100000', name: '新營區' }, { code: '6700200000', name: '鹽水區' },
  { code: '6700300000', name: '白河區' }, { code: '6700400000', name: '柳營區' },
  { code: '6700500000', name: '後壁區' }, { code: '6700600000', name: '東山區' },
  { code: '6700700000', name: '麻豆區' }, { code: '6700800000', name: '下營區' },
  { code: '6700900000', name: '六甲區' }, { code: '6701000000', name: '官田區' },
  { code: '6701100000', name: '大內區' }, { code: '6701200000', name: '佳里區' },
  { code: '6701300000', name: '學甲區' }, { code: '6701400000', name: '西港區' },
  { code: '6701500000', name: '七股區' }, { code: '6701600000', name: '將軍區' },
  { code: '6701700000', name: '北門區' }, { code: '6701800000', name: '新化區' },
  { code: '6701900000', name: '善化區' }, { code: '6702000000', name: '新市區' },
  { code: '6702100000', name: '安定區' }, { code: '6702200000', name: '山上區' },
  { code: '6702300000', name: '玉井區' }, { code: '6702400000', name: '楠西區' },
  { code: '6702500000', name: '南化區' }, { code: '6702600000', name: '左鎮區' },
  { code: '6702700000', name: '仁德區' }, { code: '6702800000', name: '歸仁區' },
  { code: '6702900000', name: '關廟區' }, { code: '6703000000', name: '龍崎區' },
  { code: '6703100000', name: '永康區' }, { code: '6703200000', name: '東區' },
  { code: '6703300000', name: '南區' },   { code: '6703400000', name: '北區' },
  { code: '6703500000', name: '安南區' }, { code: '6703600000', name: '安平區' },
  { code: '6703700000', name: '中西區' },
];

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
const KEY_PROFILE = 'cmsweb_profile';
const KEY_DRAFT   = 'cmsweb_draft';
const KEY_CASES   = 'cmsweb_cases';

// ── Cases state ────────────────────────────────────────────────
let cases = [];
let currentFilter = 'all';

function loadCases() {
  try { cases = JSON.parse(localStorage.getItem(KEY_CASES)) || []; }
  catch { cases = []; }
}

function saveCases() {
  localStorage.setItem(KEY_CASES, JSON.stringify(cases));
}

// Fields saved in draft
// Personal info — persisted across sessions as profile
const PROFILE_FIELDS = ['name', 'sex', 'telno', 'email', 'county', 'district', 'address'];

// Case-specific fields — only in draft, cleared after submission
const CONTENT_FIELDS = [
  'mainItem', 'subItem',
  'locCounty', 'locDistrict', 'locAddress', 'lat', 'lng',
  'content'
];

const ALL_FIELDS = [...PROFILE_FIELDS, ...CONTENT_FIELDS];

// ── Tom Select instances ───────────────────────────────────────
const ts = {};   // keyed by field name, e.g. ts.county, ts.district, ts.mainItem …

function initTomSelects() {
  const common = { allowEmptyOption: true, maxOptions: 300 };

  ts.sex        = new TomSelect('#f-sex',        { ...common });
  ts.county     = new TomSelect('#f-county',     { ...common });
  ts.district   = new TomSelect('#f-district',   { ...common });
  ts.mainItem   = new TomSelect('#f-main-item',  { ...common });
  ts.subItem    = new TomSelect('#f-sub-item',   { ...common });
  ts.locCounty  = new TomSelect('#f-loc-county', { ...common });
  ts.locDistrict= new TomSelect('#f-loc-district',{ ...common });

  // Wire county → district changes through Tom Select's onChange
  ts.county.on('change', () => onCountyChange('f-county', 'f-district', ts.district));
  ts.locCounty.on('change', () => onCountyChange('f-loc-county', 'f-loc-district', ts.locDistrict));
  ts.mainItem.on('change', onMainItemChange);
}

// Helper: rebuild a TomSelect's options from an array of {value, text}
function tsSetOptions(inst, opts, placeholder) {
  inst.clearOptions();
  inst.addOption({ value: '', text: placeholder });
  opts.forEach(o => inst.addOption({ value: o.value, text: o.text }));
  inst.setValue('', true);   // true = silent (no change event)
  inst.enable();
}

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
function populateCounty(selectId) {
  const sel = document.getElementById(selectId);
  COUNTIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code; opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

async function onCountyChange(countyId, districtId, tsInst) {
  const countyCode = document.getElementById(countyId).value;
  // If Tom Select instance provided, show loading state
  if (tsInst) { tsInst.disable(); tsInst.clear(true); tsInst.clearOptions(); }

  if (!countyCode) {
    if (tsInst) tsInst.addOption({ value: '', text: '— 請先選縣市 —' });
    return;
  }

  let districts;
  if (countyCode === TAINAN_CODE) {
    districts = TAINAN_DISTRICTS;
  } else {
    try {
      const res = await fetch(`${API}/AddrCode/2?p1=${countyCode}`);
      const data = await res.json();
      districts = data.map(d => ({ code: d.DistrictCode, name: d.DistrictName }));
    } catch {
      if (tsInst) tsInst.addOption({ value: '', text: '— 載入失敗，請重試 —' });
      return;
    }
  }

  if (tsInst) {
    tsSetOptions(tsInst, districts.map(d => ({ value: d.code, text: d.name })), '— 請選擇 —');
  } else {
    // Fallback plain DOM (used during init before TomSelect ready)
    const dSel = document.getElementById(districtId);
    dSel.innerHTML = '<option value="">— 請選擇 —</option>';
    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.code; opt.textContent = d.name;
      dSel.appendChild(opt);
    });
    dSel.disabled = false;
  }
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
  if (!ts.subItem) return;
  if (!val) { ts.subItem.disable(); ts.subItem.clear(true); ts.subItem.clearOptions(); return; }
  const found = CASE_ITEMS.find(i => i.Item === val);
  if (!found) { ts.subItem.disable(); return; }
  tsSetOptions(ts.subItem, found.Subitems.map(s => ({ value: s.Subitem, text: s.SubitemName })), '— 請選擇子項目 —');
}

// ── Profile & draft save/restore ──────────────────────────────
let draftTimer = null;

function getFieldValue(f) {
  const id = 'f-' + f.replace(/([A-Z])/g, c => '-' + c.toLowerCase());
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setFieldValue(f, v) {
  const id = 'f-' + f.replace(/([A-Z])/g, c => '-' + c.toLowerCase());
  const el = document.getElementById(id);
  if (el && v !== undefined && v !== null) el.value = v;
}

function scheduleDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 800);
}

function saveDraft() {
  // Save profile fields separately (persist across sessions)
  const profile = {};
  PROFILE_FIELDS.forEach(f => { profile[f] = getFieldValue(f); });
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));

  // Save full form as draft (includes content fields)
  const draft = {};
  ALL_FIELDS.forEach(f => { draft[f] = getFieldValue(f); });
  localStorage.setItem(KEY_DRAFT, JSON.stringify(draft));

  const ind = document.getElementById('draft-saved');
  ind.classList.add('show');
  setTimeout(() => ind.classList.remove('show'), 2000);
}

async function restoreProfile() {
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY_PROFILE) || '{}'); } catch { data = {}; }

  // Simple profile fields
  ['name', 'telno', 'email', 'address'].forEach(f => {
    if (data[f]) setFieldValue(f, data[f]);
  });
  if (data.sex) ts.sex?.setValue(data.sex, true);

  // Contact county+district; default to 台南市
  const countyCode = data.county || TAINAN_CODE;
  ts.county?.setValue(countyCode, true);
  document.getElementById('f-county').value = countyCode;
  await onCountyChange('f-county', 'f-district', ts.district);
  if (data.district) ts.district?.setValue(data.district, true);
}

async function restoreDraft() {
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY_DRAFT) || '{}'); } catch { data = {}; }

  // Content-only text fields
  ['locAddress', 'content'].forEach(f => {
    if (data[f]) setFieldValue(f, data[f]);
  });

  // Location county+district; default to 台南市
  const locCountyCode = data.locCounty || TAINAN_CODE;
  ts.locCounty?.setValue(locCountyCode, true);
  document.getElementById('f-loc-county').value = locCountyCode;
  await onCountyChange('f-loc-county', 'f-loc-district', ts.locDistrict);
  if (data.locDistrict) ts.locDistrict?.setValue(data.locDistrict, true);

  // Main item + sub item
  if (data.mainItem) {
    ts.mainItem?.setValue(data.mainItem, true);
    document.getElementById('f-main-item').value = data.mainItem;
    onMainItemChange();
    if (data.subItem) ts.subItem?.setValue(data.subItem, true);
  }

  // Map marker
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

function clearContentFields() {
  // Reset text fields
  ['locAddress', 'content', 'lat', 'lng'].forEach(f => setFieldValue(f, ''));

  // Reset Tom Select dropdowns
  ts.mainItem?.setValue('', true);
  ts.subItem?.clear(true); ts.subItem?.clearOptions(); ts.subItem?.disable();
  ts.locCounty?.setValue(TAINAN_CODE, true);
  document.getElementById('f-loc-county').value = TAINAN_CODE;
  ts.locDistrict?.clear(true); ts.locDistrict?.clearOptions(); ts.locDistrict?.disable();
  onCountyChange('f-loc-county', 'f-loc-district', ts.locDistrict);

  if (marker) { map.removeLayer(marker); marker = null; }
  updateContentCount();
  localStorage.removeItem(KEY_DRAFT);
}

// ── Validation ─────────────────────────────────────────────────
function showError(id, show) {
  const el  = document.getElementById('err-' + id);
  const inp = document.getElementById('f-' + id);
  if (!el || !inp) return;
  // Also mark the Tom Select wrapper if present
  const tsWrapper = inp.closest('.ts-wrapper') || inp.parentElement?.querySelector('.ts-wrapper');
  if (show) {
    el.classList.add('show');
    inp.classList.add('error');
    tsWrapper?.classList.add('error');
  } else {
    el.classList.remove('show');
    inp.classList.remove('error');
    tsWrapper?.classList.remove('error');
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

// ── CAPTCHA & submission ───────────────────────────────────────
const API = 'https://cmsweb.tainan.gov.tw/webapi/api';
let captchaData = null;   // { HashCode, TimeStamp, ValidationCode (img), AudioMP3 }
let caseToken = null;

function randomToken(len) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function loadCaptcha() {
  try {
    const res = await fetch(API + '/ValidationCode/');
    captchaData = await res.json();
    document.getElementById('captcha-img').src = 'data:image/gif;base64,' + captchaData.ValidationCode;
    document.getElementById('f-captcha').value = '';
    document.getElementById('captcha-audio').src = 'data:audio/mp3;base64,' + captchaData.AudioMP3;
  } catch (err) {
    alert('無法載入驗證碼，請檢查網路連線後重試');
  }
}

// ── Form submit ────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  if (!validate()) return;

  saveDraft();

  const get = id => document.getElementById(id).value.trim();

  const mainItemVal = get('f-main-item');
  const subItemVal  = get('f-sub-item');
  const lat  = get('f-lat');
  const lng  = get('f-lng');

  const captchaInput = get('f-captcha');
  if (!captchaInput) {
    alert('請輸入驗證碼');
    document.getElementById('f-captcha').focus();
    return;
  }

  if (!captchaData || !caseToken) {
    alert('驗證碼尚未載入，請稍候再試');
    return;
  }

  // Build POST body exactly as the official Angular app does
  let body = 'Case_Token=' + caseToken;
  body += '&Atth_FileNames=';
  body += '&Subj_Content=' + encodeURIComponent(get('f-content').replace(/&/g, '＆'));
  body += '&Subj_District=' + encodeURIComponent(get('f-loc-district'));
  body += '&Subj_FileCount=0';
  body += '&Subj_Item=' + encodeURIComponent(mainItemVal);
  body += '&Subj_Security=2';
  body += '&Subj_Subitem=' + encodeURIComponent(subItemVal);
  body += '&Sugg_Addr1=' + encodeURIComponent(get('f-county'));
  body += '&Sugg_Addr2=' + encodeURIComponent(get('f-district'));
  body += '&Sugg_Addr3=';
  body += '&Sugg_Addr4=' + encodeURIComponent(get('f-address'));
  body += '&Sugg_Email=' + encodeURIComponent(get('f-email'));
  body += '&Sugg_Name=' + encodeURIComponent(get('f-name'));
  body += '&Sugg_Sex=' + encodeURIComponent(get('f-sex'));
  body += '&Sugg_Telno=' + encodeURIComponent(get('f-telno'));
  body += '&Input_ValidationCode=' + encodeURIComponent(captchaInput);
  body += '&Hash_Code=' + encodeURIComponent(captchaData.HashCode);
  body += '&Time_Stamp=' + encodeURIComponent(captchaData.TimeStamp);
  body += '&Subj_Latitude=' + encodeURIComponent(lat);
  body += '&Subj_Longitude=' + encodeURIComponent(lng);
  body += '&Subj_Location=' + encodeURIComponent(get('f-loc-address'));

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = '送出中…';

  try {
    const res = await fetch(API + '/Case/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const resultBox   = document.getElementById('result-box');
    const resultTitle = document.getElementById('result-title');
    const resultBody  = document.getElementById('result-body');
    resultBox.classList.add('show');

    const text = await res.text();
    if (res.ok && text.includes('登錄個案上傳成功')) {
      resultBox.classList.remove('error-box');
      resultTitle.textContent = '✅ 案件送出成功！';

      // Save case record
      const mainItemObj = CASE_ITEMS.find(i => i.Item === mainItemVal);
      const subItemObj  = mainItemObj?.Subitems.find(s => s.Subitem === subItemVal);
      const newCase = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        caseCode: '',
        title: (subItemObj ? subItemObj.SubitemName : mainItemObj?.ItemName || '案件') +
               ' — ' + get('f-content').slice(0, 30) + (get('f-content').length > 30 ? '…' : ''),
        mainItem: mainItemVal,
        mainItemName: mainItemObj?.ItemName || '',
        subItem: subItemVal,
        subItemName: subItemObj?.SubitemName || '',
        content: get('f-content'),
        county: get('f-county'),
        district: get('f-district'),
        address: get('f-address'),
        locAddress: get('f-loc-address'),
        lat: get('f-lat'),
        lng: get('f-lng'),
        status: 'pending',
        submittedAt: new Date().toISOString(),
        notes: '',
      };
      cases.unshift(newCase);
      saveCases();
      clearContentFields();

      resultBody.innerHTML = `
        <p style="font-size:13px; margin-bottom:10px;">
          系統已收到您的反映事項。請至您的電子郵件信箱點選確認信函中的確認網址，案件即正式進入處理程序。
        </p>
        <p style="font-size:13px; margin-bottom:8px;">
          收到確認信後，信中會有一組受理編號（如 <strong>B-358817</strong>），請填入下方以便追蹤：
        </p>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="quick-case-code" placeholder="B-XXXXXX"
                 style="padding:8px 12px; border:1px solid #d0d7de; border-radius:6px; font-size:14px; width:160px;">
          <button type="button" class="btn-secondary btn-sm"
                  onclick="saveQuickCaseCode('${newCase.id}')">儲存編號</button>
          <button type="button" class="btn-secondary btn-sm"
                  onclick="switchTab('dashboard')">前往案件列表</button>
        </div>
      `;
    } else {
      resultBox.classList.add('error-box');
      resultTitle.textContent = '❌ 送出失敗';
      resultBody.innerHTML = `<p style="font-size:13px;">${text || '請檢查資料後重試，或至官方網站送出。'}</p>`;
      // Refresh captcha for retry
      loadCaptcha();
    }
  } catch (err) {
    const resultBox   = document.getElementById('result-box');
    const resultTitle = document.getElementById('result-title');
    const resultBody  = document.getElementById('result-body');
    resultBox.classList.add('show', 'error-box');
    resultTitle.textContent = '❌ 網路錯誤';
    resultBody.innerHTML = `<p style="font-size:13px;">無法連線至官方伺服器，請稍後再試。</p>`;
    loadCaptcha();
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 送出';
  }
}

// ── Quick case code save (right after submission) ──────────────
function saveQuickCaseCode(id) {
  const code = document.getElementById('quick-case-code').value.trim();
  if (!code) return;
  const c = cases.find(c => c.id === id);
  if (c) { c.caseCode = code; saveCases(); }
  switchTab('dashboard');
}

// ── Dashboard ──────────────────────────────────────────────────
const STATUS_LABEL = {
  pending: '待確認', processing: '處理中', done: '已完成', rejected: '未受理'
};
const STATUS_CLASS = {
  pending: 'status-pending', processing: 'status-processing',
  done: 'status-done', rejected: 'status-rejected'
};

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function filterCases(f) {
  currentFilter = f;
  document.querySelectorAll('[id^="filter-"]').forEach(b => b.classList.remove('active'));
  document.getElementById('filter-' + f)?.classList.add('active');
  renderDashboard();
}

function renderDashboard() {
  const container = document.getElementById('case-list-container');
  const filtered = currentFilter === 'all'
    ? cases
    : cases.filter(c => c.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:#aaa;">
        <div style="font-size:48px; margin-bottom:12px;">📭</div>
        <p style="font-size:14px;">${currentFilter === 'all' ? '尚無案件紀錄' : '此狀態下無案件'}</p>
        <p style="margin-top:8px;">
          <button class="btn-secondary" onclick="switchTab('form')">＋ 新增填報</button>
        </p>
      </div>`;
    return;
  }

  container.innerHTML = '<div style="display:flex; flex-direction:column; gap:12px;">' +
    filtered.map(c => {
      const date = c.submittedAt
        ? new Date(c.submittedAt).toLocaleDateString('zh-TW', {year:'numeric',month:'2-digit',day:'2-digit'})
        : '';
      const sc = STATUS_CLASS[c.status] || 'status-pending';
      const sl = STATUS_LABEL[c.status] || c.status;
      return `
      <div class="card" style="border-left:4px solid; padding:16px 20px;"
           class="${sc}" id="case-${c.id}"
           style="border-left-color: ${c.status==='done'?'#27ae60':c.status==='processing'?'#3498db':c.status==='rejected'?'#e74c3c':'#f39c12'}">
        <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:8px;">
          <div style="flex:1; font-size:15px; font-weight:bold; color:#1a5c3a;">${esc(c.title)}</div>
          <span class="status-badge ${sc}">${sl}</span>
        </div>
        <div style="font-size:12px; color:#888; display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
          ${date ? `<span>📅 ${date}</span>` : ''}
          ${c.mainItemName ? `<span>🏷️ ${esc(c.mainItemName)}</span>` : ''}
          ${c.caseCode ? `<span>🔢 <strong>${esc(c.caseCode)}</strong></span>` : '<span style="color:#e74c3c;">⚠️ 尚無受理編號</span>'}
        </div>
        ${c.content ? `<div style="font-size:13px;color:#555;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(c.content)}</div>` : ''}
        ${c.notes ? `<div style="font-size:12px;color:#555;margin-top:8px;padding:8px;background:#f8f9fa;border-radius:4px;">💬 ${esc(c.notes)}</div>` : ''}
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn-secondary btn-sm" onclick="editCase('${c.id}')">✏️ 編輯</button>
          <button class="btn-danger btn-sm" onclick="deleteCase('${c.id}')">🗑️</button>
        </div>
      </div>`;
    }).join('') + '</div>';
}

// ── Case edit modal ────────────────────────────────────────────
function editCase(id) {
  const c = cases.find(c => c.id === id);
  if (!c) return;
  document.getElementById('modal-case-id').value    = id;
  document.getElementById('modal-case-code').value  = c.caseCode || '';
  document.getElementById('modal-case-status').value = c.status || 'pending';
  document.getElementById('modal-case-notes').value  = c.notes || '';
  document.getElementById('modal-title-text').textContent = c.title;
  document.getElementById('modal-case').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-case').style.display = 'none';
}

function saveModal() {
  const id     = document.getElementById('modal-case-id').value;
  const c      = cases.find(c => c.id === id);
  if (!c) return;
  c.caseCode = document.getElementById('modal-case-code').value.trim();
  c.status   = document.getElementById('modal-case-status').value;
  c.notes    = document.getElementById('modal-case-notes').value.trim();
  saveCases();
  closeModal();
  renderDashboard();
}

function deleteCase(id) {
  if (!confirm('確定刪除此案件紀錄？')) return;
  cases = cases.filter(c => c.id !== id);
  saveCases();
  renderDashboard();
}

// ── Tab switching ──────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.page-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('tab-' + name + '-btn').classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (name === 'form')      document.getElementById('btn-goto-form').classList.add('active');
  if (name === 'dashboard') document.getElementById('btn-goto-dashboard').classList.add('active');
  if (name === 'guide')     document.getElementById('btn-goto-guide').classList.add('active');

  if (name === 'form') setTimeout(() => map && map.invalidateSize(), 100);
  if (name === 'dashboard') renderDashboard();
}

// ── Content char count ─────────────────────────────────────────
function updateContentCount() {
  const len = document.getElementById('f-content').value.length;
  document.getElementById('content-count').textContent = len;
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  caseToken = randomToken(12);
  loadCases();
  initMap();
  // Populate <select> options before Tom Select wraps them
  populateCounty('f-county');
  populateCounty('f-loc-county');
  populateMainItems();
  // Initialise Tom Select (must come after options are in the DOM)
  initTomSelects();
  await restoreProfile();
  await restoreDraft();
  loadCaptcha();

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
