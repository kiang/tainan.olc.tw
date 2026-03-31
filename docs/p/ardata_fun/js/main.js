// ============================================================
// CONFIG
// ============================================================
const BASE = "https://kiang.github.io/ardata.cy.gov.tw/";
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSce9lbrfHrdQb1Z62PKW4OzEKwyMp4EDgpgM27m0Lqy-bi3dQ/viewform";
const ENTRY = {
  recipient: "entry.160199042",  // 收受候選人資訊
  donor:     "entry.104046133",  // 捐款者名稱與統編
  details:   "entry.1347559518"  // 捐款日期與金額
};
const REPORTS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTh5LBcUYFjtfKQ20tWA62gDVbUWAWxXK-1st4Oy5pzWRypE6tWoHPX9iANynGYOWbS-pu4XBU0rrcC/pub?output=csv";

// ============================================================
// STATE
// ============================================================
let businessData = [];      // [{amount, taxId}]
let individualData = [];    // [{amount, label}]
let filteredBusiness = [];
let filteredIndividual = [];
let displayedBusiness = 0;
let displayedIndividual = 0;
const PAGE_SIZE = 50;
const nameCache = new Map();  // taxId -> name
let currentTab = 'business';
let searchTimer = null;
let expandedRow = null;

// ============================================================
// STORAGE SCHEMA
// ============================================================
const STORAGE_KEY = 'ardata_detective';
function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { version: 1, stats: { viewed: 0, reported: 0, days: [], lastVisit: null }, badges: [] };
}
function saveStore(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {} }

// ============================================================
// RANKS
// ============================================================
const RANKS = [
  { min: 0,   label: '見習偵探',  next: '初級偵探', nextAt: 5 },
  { min: 5,   label: '初級偵探',  next: '資深偵探', nextAt: 20 },
  { min: 20,  label: '資深偵探',  next: '首席偵探', nextAt: 50 },
  { min: 50,  label: '首席偵探',  next: '傳奇偵探', nextAt: 100 },
  { min: 100, label: '傳奇偵探',  next: null, nextAt: null },
];
function getRank(viewed) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (viewed >= RANKS[i].min) return RANKS[i];
  }
  return RANKS[0];
}
function updateRankUI() {
  const s = getStore();
  const v = s.stats.viewed;
  const rank = getRank(v);
  document.getElementById('rankDisplay').textContent = rank.label;
  document.getElementById('rankText').textContent = rank.label;
  document.getElementById('viewedCount').textContent = v;
  if (rank.nextAt) {
    const pct = Math.min(100, Math.round(((v - rank.min) / (rank.nextAt - rank.min)) * 100));
    document.getElementById('rankProgressBar').style.width = pct + '%';
    document.getElementById('nextRankLabel').textContent = '下一階：' + rank.next;
  } else {
    document.getElementById('rankProgressBar').style.width = '100%';
    document.getElementById('nextRankLabel').textContent = '已達最高階';
  }
}

// ============================================================
// BADGES
// ============================================================
const BADGE_DEFS = [
  { id: 'FIRST_LOOK',    icon: '🔍', name: '初次目擊',    desc: '偵探生涯的第一步' },
  { id: 'FIRST_REPORT',  icon: '📋', name: '留下痕跡',    desc: '你讓金錢留下了痕跡' },
  { id: 'DEEP_DIVE',     icon: '🕳️', name: '越挖越深',    desc: '查閱了10家企業捐款' },
  { id: 'BIG_FISH',      icon: '🐟', name: '大額發現',    desc: '找到單筆捐款超過100萬' },
  { id: 'WHALE',         icon: '🐋', name: '史詩級發現',  desc: '找到總捐款超過1000萬的企業' },
  { id: 'TIME_TRAVELER', icon: '⏰', name: '時間追蹤者',  desc: '找到橫跨3次以上選舉的捐款者' },
  { id: 'SHARER',        icon: '📡', name: '散播訊息',    desc: '偵探從不孤軍奮戰' },
  { id: 'CENTURION',     icon: '🏆', name: '傳奇偵探',    desc: '查閱了100家企業捐款' },
];
function awardBadge(id) {
  const s = getStore();
  if (s.badges.includes(id)) return;
  s.badges.push(id);
  saveStore(s);
  const def = BADGE_DEFS.find(b => b.id === id);
  if (def) {
    showToast(`${def.icon} 成就解鎖：${def.name} — ${def.desc}`, 'gold');
    if (s.badges.length === 1) confettiBurst();
  }
  renderAchievements();
}
function renderAchievements() {
  const s = getStore();
  const grid = document.getElementById('achievementGrid');
  grid.innerHTML = '';
  BADGE_DEFS.forEach(b => {
    const earned = s.badges.includes(b.id);
    const el = document.createElement('div');
    el.className = `badge-card rounded-xl p-3 text-center border ${earned ? 'bg-slate-700 border-amber-500/50' : 'bg-slate-900 border-slate-700 opacity-50'}`;
    el.title = b.desc;
    el.innerHTML = `<div class="text-3xl mb-1">${earned ? b.icon : '🔒'}</div>
      <div class="text-xs font-semibold ${earned ? 'text-amber-400' : 'text-slate-500'}">${b.name}</div>
      <div class="text-xs text-slate-500 mt-1">${b.desc}</div>`;
    grid.appendChild(el);
  });
  document.getElementById('badgeCountBadge').textContent = `${s.badges.length}/8`;
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type='info') {
  const container = document.getElementById('toastContainer');
  const div = document.createElement('div');
  const colors = { gold: 'bg-amber-500 text-slate-900', info: 'bg-slate-700 text-white', error: 'bg-red-600 text-white' };
  div.className = `toast ${colors[type]||colors.info} px-4 py-3 rounded-xl shadow-xl text-sm max-w-xs font-semibold`;
  div.textContent = msg;
  container.appendChild(div);
  setTimeout(() => {
    div.classList.add('hide');
    setTimeout(() => div.remove(), 300);
  }, 3500);
}

// ============================================================
// CONFETTI
// ============================================================
function confettiBurst() {
  const colors = ['#f59e0b','#ef4444','#3b82f6','#10b981','#8b5cf6','#ec4899'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${Math.random()*100}vw; top:0; background:${colors[Math.floor(Math.random()*colors.length)]}; animation-delay:${Math.random()*1}s; animation-duration:${2+Math.random()*1.5}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

// ============================================================
// MODAL
// ============================================================
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  awardBadge('FIRST_LOOK');
  const s = getStore();
  const today = new Date().toISOString().slice(0,10);
  if (!s.stats.days.includes(today)) { s.stats.days.push(today); saveStore(s); }
}

// ============================================================
// DATE & AMOUNT PARSERS
// ============================================================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseRocDate(d) {
  if (!d) return d;
  d = String(d).trim();
  if (/^\d{7}$/.test(d)) {
    const y = d.slice(0,3), m = d.slice(3,5), day = d.slice(5,7);
    return `${y}年${m}月${day}日`;
  }
  if (/^\d{3}\/\d{2}\/\d{2}$/.test(d)) {
    const parts = d.split('/');
    return `${parts[0]}年${parts[1]}月${parts[2]}日`;
  }
  return d;
}
function fmtAmount(n) {
  return parseFloat(n).toLocaleString('zh-TW') + ' 元';
}

// ============================================================
// DATA LOADING
// ============================================================
async function fetchCSV(url, opts={}) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, { ...opts, complete: r => resolve(r), error: e => reject(e) });
  });
}

async function initData() {
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('tableWrap').classList.add('hidden');
  document.getElementById('errorState').classList.add('hidden');
  try {
    const result = await fetchCSV(BASE + 'incomes/business.csv', { header: false, skipEmptyLines: true });
    businessData = shuffle(result.data.map((row, i) => ({
      rank: i + 1,
      amount: parseFloat(row[0]) || 0,
      taxId: String(row[1]).trim(),
      name: String(row[2] || '').trim()
    })));
    // Pre-populate nameCache from ranking data
    businessData.forEach(d => { if (d.name) nameCache.set(d.taxId, d.name); });
    filteredBusiness = businessData;
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('tableWrap').classList.remove('hidden');
    displayedBusiness = 0;
    renderBusinessTable(true);
    checkUrlParams();
  } catch(e) {
    console.error(e);
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
  }
}

async function loadIndividualData() {
  document.getElementById('indLoadingState').classList.remove('hidden');
  document.getElementById('indTableWrap').classList.add('hidden');
  try {
    const result = await fetchCSV(BASE + 'incomes/individual.csv', { header: false, skipEmptyLines: true });
    individualData = shuffle(result.data.map((row, i) => ({
      rank: i + 1,
      amount: parseFloat(row[0]) || 0,
      label: String(row[1]).trim()
    })));
    filteredIndividual = individualData;
    document.getElementById('indLoadingState').classList.add('hidden');
    document.getElementById('indTableWrap').classList.remove('hidden');
    displayedIndividual = 0;
    renderIndividualTable(true);
  } catch(e) {
    console.error(e);
    document.getElementById('indLoadingState').classList.remove('hidden');
    document.getElementById('indLoadingState').innerHTML = '<div class="flex flex-col items-center gap-3 text-red-400 py-20"><div class="text-4xl">⚠️</div><div>資料載入失敗</div></div>';
  }
}

// ============================================================
// BUSINESS TABLE RENDER
// ============================================================
function renderBusinessTable(reset=false) {
  const tbody = document.getElementById('tableBody');
  if (reset) { tbody.innerHTML = ''; displayedBusiness = 0; expandedRow = null; }
  const slice = filteredBusiness.slice(displayedBusiness, displayedBusiness + PAGE_SIZE);
  slice.forEach(item => {
    const big = item.amount >= 1000000;
    const huge = item.amount >= 10000000;
    const tr = document.createElement('tr');
    tr.id = 'row-' + item.taxId;
    tr.className = `row-hover border-b border-slate-700/50 transition-colors ${huge ? 'big-money' : ''}`;
    tr.dataset.taxId = item.taxId;
    tr.dataset.amount = item.amount;
    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-400 text-xs">${item.rank}</td>
      <td class="px-4 py-3 font-mono text-slate-300">${item.taxId}</td>
      <td class="px-4 py-3 text-slate-300" id="name-${item.taxId}">${item.name || item.taxId}</td>
      <td class="px-4 py-3 text-right font-bold ${big ? 'text-red-400' : 'text-slate-200'}">${fmtAmount(item.amount)}</td>
      <td class="px-4 py-3 text-center">
        <button onclick="expandDetail('${item.taxId}',${item.amount})" class="text-amber-400 hover:text-amber-300 text-lg" title="展開詳情">＋</button>
      </td>
    `;
    tr.onclick = (e) => { if (e.target.tagName !== 'BUTTON') expandDetail(item.taxId, item.amount); };
    tbody.appendChild(tr);
  });
  displayedBusiness += slice.length;
  const btn = document.getElementById('loadMoreBtn');
  btn.classList.toggle('hidden', displayedBusiness >= filteredBusiness.length);
  document.getElementById('emptyState').classList.toggle('hidden', filteredBusiness.length > 0);
  document.getElementById('tableWrap').classList.toggle('hidden', filteredBusiness.length === 0);
}

// ============================================================
// EXPAND DONOR DETAIL
// ============================================================
async function expandDetail(taxId, totalAmount) {
  const tbody = document.getElementById('tableBody');
  // Toggle off if same row
  if (expandedRow === taxId) {
    const existing = document.getElementById('detail-' + taxId);
    if (existing) existing.remove();
    expandedRow = null;
    return;
  }
  // Remove previous
  if (expandedRow) {
    const prev = document.getElementById('detail-' + expandedRow);
    if (prev) prev.remove();
  }
  expandedRow = taxId;

  // Track viewed
  const s = getStore();
  const seenKey = 'ardata_seen';
  let seen = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'));
  if (!seen.has(taxId)) {
    seen.add(taxId);
    localStorage.setItem(seenKey, JSON.stringify([...seen]));
    s.stats.viewed = seen.size;
    saveStore(s);
    updateRankUI();
    if (seen.size >= 10) awardBadge('DEEP_DIVE');
    if (seen.size >= 100) awardBadge('CENTURION');
    if (totalAmount >= 10000000) awardBadge('WHALE');
  }

  // Insert loading row
  const anchor = document.getElementById('row-' + taxId);
  const loadingTr = document.createElement('tr');
  loadingTr.id = 'detail-' + taxId;
  loadingTr.innerHTML = `<td colspan="5" class="px-6 py-6 text-center text-amber-400 text-sm detail-section fade-in"><div class="spinner mx-auto mb-2"></div>正在解密檔案...</td>`;
  anchor.insertAdjacentElement('afterend', loadingTr);

  try {
    const result = await fetchCSV(BASE + `incomes/business/${taxId}.csv`, { header: true, skipEmptyLines: true });
    const rows = result.data;
    // Cache name
    if (rows.length > 0) {
      const name = rows[0]['捐贈人'] || rows[0][2] || '';
      if (name && !nameCache.has(taxId)) {
        nameCache.set(taxId, name);
        const nameCell = document.getElementById('name-' + taxId);
        if (nameCell) nameCell.textContent = name;
      }
    }
    const elections = [...new Set(rows.map(r => r['選舉']))].filter(Boolean);
    if (elections.length >= 3) awardBadge('TIME_TRAVELER');
    const maxSingle = Math.max(...rows.map(r => parseFloat(r['捐贈金額']||0)));
    if (maxSingle >= 1000000) awardBadge('BIG_FISH');

    const timelineHtml = elections.length > 0 ? `
      <div class="mt-4 mb-2">
        <div class="text-xs text-slate-400 mb-2">捐贈選舉時間軸 (共 ${elections.length} 次)</div>
        <div class="flex flex-wrap gap-2">${elections.map(e => `<span class="bg-slate-700 text-amber-300 text-xs px-2 py-1 rounded">${e}</span>`).join('')}</div>
      </div>` : '';

    const rowsHtml = rows.map(r => {
      const amt = parseFloat(r['捐贈金額']||0);
      const big = amt >= 1000000;
      const donorName = r['捐贈人'] || '';
      const recipient = r['捐贈對象'] || '';
      const election = r['選舉'] || '';
      const dateStr = parseRocDate(r['捐贈日期'] || '');
      return `<tr class="border-b border-slate-700/30 hover:bg-slate-700/30">
        <td class="px-3 py-2 text-slate-400 text-xs">${election}</td>
        <td class="px-3 py-2 text-slate-300 text-xs">${recipient}</td>
        <td class="px-3 py-2 text-slate-400 text-xs">${dateStr}</td>
        <td class="px-3 py-2 text-right text-xs font-semibold ${big ? 'text-red-400' : 'text-slate-300'}">${fmtAmount(amt)}</td>
        <td class="px-3 py-2 text-center">
          <button onclick="openReportModal('${escHtml(donorName)}','${escHtml(recipient)}','${escHtml(election)}','${escHtml(dateStr)}',${amt})"
            class="text-xs bg-red-900/50 hover:bg-red-800 text-red-300 px-2 py-1 rounded border border-red-800/50 transition-colors whitespace-nowrap">
            🚨 回報
          </button>
        </td>
      </tr>`;
    }).join('');

    loadingTr.innerHTML = `<td colspan="5" class="detail-section fade-in">
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-amber-400 font-bold text-base">${nameCache.get(taxId) || taxId}</span>
          <span class="text-slate-500 text-sm font-mono">${taxId}</span>
          <span class="ml-auto text-xs text-slate-500">${rows.length} 筆捐款記錄</span>
        </div>
        ${timelineHtml}
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-700">
              <th class="px-3 py-2">選舉</th>
              <th class="px-3 py-2">收受候選人</th>
              <th class="px-3 py-2">日期</th>
              <th class="px-3 py-2 text-right">金額</th>
              <th class="px-3 py-2 text-center">疑似對價關係</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="mt-3 text-xs text-slate-600">⚠️ 回報功能為公民初步調查紀錄，不代表已判定犯罪或確有對價關係。</div>
      </div>
    </td>`;
  } catch(e) {
    loadingTr.innerHTML = `<td colspan="5" class="px-6 py-4 text-center text-red-400 text-sm detail-section">
      資料載入失敗。可能尚無詳細資料。
    </td>`;
  }
}

function buildReportUrl(donor, recipient, election, date, amount) {
  const params = new URLSearchParams();
  params.set(ENTRY.donor, donor);
  params.set(ENTRY.recipient, `${recipient} (${election})`);
  params.set(ENTRY.details, `日期: ${date} / 金額: ${fmtAmount(amount)}`);
  params.set('usp', 'pp_url');
  params.set('embedded', 'true');
  return `${FORM_URL}?${params.toString()}`;
}

function openReportModal(donor, recipient, election, date, amount) {
  const url = buildReportUrl(donor, recipient, election, date, amount);
  document.getElementById('reportIframe').src = url;
  document.getElementById('reportModal').classList.remove('hidden');
  // Award badge when modal is opened
  const s = getStore();
  s.stats.reported = (s.stats.reported || 0) + 1;
  saveStore(s);
  awardBadge('FIRST_REPORT');
}

function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
  document.getElementById('reportIframe').src = '';
  // Reload reports panel so new submission appears
  reportsLoaded = false;
  const panel = document.getElementById('reportsPanel');
  if (panel && panel.open) loadReports();
}

// ============================================================
// INDIVIDUAL TABLE RENDER
// ============================================================
function renderIndividualTable(reset=false) {
  const tbody = document.getElementById('indTableBody');
  if (reset) { tbody.innerHTML = ''; displayedIndividual = 0; }
  const slice = filteredIndividual.slice(displayedIndividual, displayedIndividual + PAGE_SIZE);
  slice.forEach(item => {
    const big = item.amount >= 1000000;
    const huge = item.amount >= 10000000;
    const tr = document.createElement('tr');
    const labelId = encodeURIComponent(item.label);
    tr.id = 'indrow-' + labelId;
    tr.className = `border-b border-slate-700/50 transition-colors cursor-pointer hover:bg-slate-700/30 ${huge ? 'big-money' : ''}`;
    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-400 text-xs">${item.rank}</td>
      <td class="px-4 py-3 text-slate-300">${escHtml(item.label)}</td>
      <td class="px-4 py-3 text-right font-bold ${big ? 'text-red-400' : 'text-slate-200'}">${fmtAmount(item.amount)}</td>
      <td class="px-4 py-3 text-center"><button class="text-amber-400 hover:text-amber-300 text-lg" title="展開詳情">＋</button></td>
    `;
    tr.onclick = () => expandIndividualDetail(item.label, item.amount);
    tbody.appendChild(tr);
  });
  displayedIndividual += slice.length;
  document.getElementById('indLoadMoreBtn').classList.toggle('hidden', displayedIndividual >= filteredIndividual.length);
}

let expandedIndRow = null;
async function expandIndividualDetail(label, totalAmount) {
  const labelId = encodeURIComponent(label);
  if (expandedIndRow === label) {
    const existing = document.getElementById('inddetail-' + labelId);
    if (existing) existing.remove();
    expandedIndRow = null;
    return;
  }
  if (expandedIndRow) {
    const prev = document.getElementById('inddetail-' + encodeURIComponent(expandedIndRow));
    if (prev) prev.remove();
  }
  expandedIndRow = label;

  const anchor = document.getElementById('indrow-' + labelId);
  const loadingTr = document.createElement('tr');
  loadingTr.id = 'inddetail-' + labelId;
  loadingTr.innerHTML = `<td colspan="4" class="px-6 py-6 text-center text-amber-400 text-sm detail-section fade-in"><div class="spinner mx-auto mb-2"></div>正在解密檔案...</td>`;
  anchor.insertAdjacentElement('afterend', loadingTr);

  try {
    const result = await fetchCSV(BASE + `incomes/individual/${encodeURIComponent(label)}.csv`, { header: true, skipEmptyLines: true });
    const rows = result.data;
    const elections = [...new Set(rows.map(r => r['選舉']))].filter(Boolean);
    if (elections.length >= 3) awardBadge('TIME_TRAVELER');
    const maxSingle = Math.max(...rows.map(r => parseFloat(r['捐贈金額']||0)));
    if (maxSingle >= 1000000) awardBadge('BIG_FISH');
    if (totalAmount >= 10000000) awardBadge('WHALE');

    const timelineHtml = elections.length > 0 ? `
      <div class="mt-4 mb-2">
        <div class="text-xs text-slate-400 mb-2">捐贈選舉時間軸 (共 ${elections.length} 次)</div>
        <div class="flex flex-wrap gap-2">${elections.map(e => `<span class="bg-slate-700 text-amber-300 text-xs px-2 py-1 rounded">${e}</span>`).join('')}</div>
      </div>` : '';

    const rowsHtml = rows.map(r => {
      const amt = parseFloat(r['捐贈金額']||0);
      const big = amt >= 1000000;
      const donorName = r['捐贈人'] || '';
      const recipient = r['捐贈對象'] || '';
      const election = r['選舉'] || '';
      const dateStr = parseRocDate(r['捐贈日期'] || '');
      const reportUrl = buildReportUrl(donorName, recipient, election, dateStr, amt);
      return `<tr class="border-b border-slate-700/30 hover:bg-slate-700/30">
        <td class="px-3 py-2 text-slate-400 text-xs">${election}</td>
        <td class="px-3 py-2 text-slate-300 text-xs">${recipient}</td>
        <td class="px-3 py-2 text-slate-400 text-xs">${dateStr}</td>
        <td class="px-3 py-2 text-right text-xs font-semibold ${big ? 'text-red-400' : 'text-slate-300'}">${fmtAmount(amt)}</td>
        <td class="px-3 py-2 text-center">
          <a href="${reportUrl}" target="_blank" onclick="onReport('${escHtml(label)}')"
            class="text-xs bg-red-900/50 hover:bg-red-800 text-red-300 px-2 py-1 rounded border border-red-800/50 transition-colors whitespace-nowrap">
            🚨 回報
          </a>
        </td>
      </tr>`;
    }).join('');

    loadingTr.innerHTML = `<td colspan="4" class="detail-section fade-in">
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-amber-400 font-bold text-base">${escHtml(label)}</span>
          <span class="ml-auto text-xs text-slate-500">${rows.length} 筆捐款記錄</span>
        </div>
        ${timelineHtml}
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-700">
              <th class="px-3 py-2">選舉</th>
              <th class="px-3 py-2">收受候選人</th>
              <th class="px-3 py-2">日期</th>
              <th class="px-3 py-2 text-right">金額</th>
              <th class="px-3 py-2 text-center">疑似對價關係</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    </td>`;
  } catch(e) {
    loadingTr.innerHTML = `<td colspan="4" class="px-6 py-4 text-center text-red-400 text-sm">資料載入失敗</td>`;
  }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// SEARCH
// ============================================================
function onSearchInput() {
  clearTimeout(searchTimer);
  const q = document.getElementById('searchInput').value.trim();
  document.getElementById('searchStatus').classList.toggle('hidden', q.length === 0);
  document.getElementById('searchSpinner').classList.toggle('hidden', q.length === 0);
  searchTimer = setTimeout(() => {
    document.getElementById('searchStatus').classList.add('hidden');
    document.getElementById('searchSpinner').classList.add('hidden');
    applyFilters();
    updateUrlParam('q', q);
  }, 300);
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const minAmt = parseInt(document.getElementById('amountFilter').value) || 0;
  if (currentTab === 'business') {
    filteredBusiness = businessData.filter(item => {
      if (minAmt && item.amount < minAmt) return false;
      if (!q) return true;
      if (item.taxId.includes(q)) return true;
      const name = (nameCache.get(item.taxId) || '').toLowerCase();
      return name.includes(q);
    });
    applySort();
    renderBusinessTable(true);
  } else {
    filteredIndividual = individualData.filter(item => {
      if (minAmt && item.amount < minAmt) return false;
      if (!q) return true;
      return item.label.toLowerCase().includes(q);
    });
    applyIndSort();
    renderIndividualTable(true);
  }
}

// ============================================================
// TABS
// ============================================================
let indLoaded = false;
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tabBusiness').className = tab === 'business' ? 'tab-active px-5 py-2 rounded-lg text-sm transition-all' : 'tab-inactive px-5 py-2 rounded-lg text-sm transition-all';
  document.getElementById('tabIndividual').className = tab === 'individual' ? 'tab-active px-5 py-2 rounded-lg text-sm transition-all' : 'tab-inactive px-5 py-2 rounded-lg text-sm transition-all';
  document.getElementById('tableArea').classList.toggle('hidden', tab !== 'business');
  document.getElementById('individualArea').classList.toggle('hidden', tab !== 'individual');
  if (tab === 'individual' && !indLoaded) { indLoaded = true; loadIndividualData(); }
  updateUrlParam('tab', tab === 'individual' ? 'individual' : null);
}

// ============================================================
// LOAD MORE
// ============================================================
function loadMore() { renderBusinessTable(false); }
function indLoadMore() { renderIndividualTable(false); }

// ============================================================
// URL STATE
// ============================================================
function updateUrlParam(key, value) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState({}, '', url);
}
function checkUrlParams() {
  const url = new URL(window.location.href);
  const q = url.searchParams.get('q');
  const tab = url.searchParams.get('tab');
  if (tab === 'individual') switchTab('individual');
  if (q) {
    document.getElementById('searchInput').value = q;
    applyFilters();
  }
}

// ============================================================
// SHARE
// ============================================================
function shareUrl() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('📡 已複製調查連結到剪貼簿', 'gold');
    awardBadge('SHARER');
  }).catch(() => {
    showToast('請手動複製網址列', 'info');
  });
}

// ============================================================
// COMMUNITY REPORTS
// ============================================================
let reportsLoaded = false;
async function loadReports() {
  if (reportsLoaded) return;
  reportsLoaded = true;
  const container = document.getElementById('reportsContainer');
  try {
    const result = await fetchCSV(REPORTS_CSV, { header: true, skipEmptyLines: true });
    const rows = result.data.filter(r => r['Timestamp']);
    document.getElementById('reportCountBadge').textContent = rows.length + ' 筆';
    if (rows.length === 0) {
      container.innerHTML = '<div class="text-center text-slate-500 py-8">尚無回報紀錄，成為第一位！</div>';
      return;
    }
    // Newest first
    rows.reverse();
    container.innerHTML = rows.map(r => {
      const ts = r['Timestamp'] || '';
      const caseName = escHtml(r['關聯標案/都計/政策名稱'] || '');
      const reason = escHtml(r['說明對價關係的理由（請具體說明您的懷疑基礎）'] || '');
      const link = r['公開資訊連結（例如：採購網、新聞、政府公報等）（選填）'] || '';
      const caseDate = escHtml(r['案件發生或決標日期（選填）'] || '');
      const recipient = escHtml(r['（系統自動帶入）收受候選人資訊'] || '');
      const donor = escHtml(r['（系統自動帶入）捐款者名稱與統編'] || '');
      const details = escHtml(r['（系統自動帶入）捐款日期與金額'] || '');
      const linkHtml = link ? `<a href="${escHtml(link)}" target="_blank" rel="noopener" class="text-amber-400 hover:underline break-all">${escHtml(link)}</a>` : '<span class="text-slate-600">（無）</span>';
      return `<div class="border border-slate-700 rounded-lg p-4 mb-3 bg-slate-900/50 fade-in">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <span class="text-xs text-slate-500">${escHtml(ts)}</span>
          <span class="ml-auto text-xs bg-red-900/60 text-red-300 border border-red-800/50 px-2 py-0.5 rounded">🚨 疑似對價關係</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
          <div><span class="text-slate-500 text-xs">收受候選人</span><div class="text-slate-200">${recipient || '—'}</div></div>
          <div><span class="text-slate-500 text-xs">捐款者</span><div class="text-slate-200">${donor || '—'}</div></div>
          <div><span class="text-slate-500 text-xs">捐款日期與金額</span><div class="text-slate-200">${details || '—'}</div></div>
          <div><span class="text-slate-500 text-xs">案件日期</span><div class="text-slate-200">${caseDate || '—'}</div></div>
        </div>
        <div class="mb-2"><span class="text-slate-500 text-xs">關聯標案/政策</span><div class="text-amber-300 font-semibold">${caseName || '—'}</div></div>
        <div class="mb-2"><span class="text-slate-500 text-xs">懷疑理由</span><div class="text-slate-300 text-sm leading-relaxed">${reason || '—'}</div></div>
        <div><span class="text-slate-500 text-xs">公開資訊連結</span><div class="mt-1">${linkHtml}</div></div>
      </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('reportCountBadge').textContent = '失敗';
    container.innerHTML = '<div class="text-center text-red-400 py-8">回報資料載入失敗</div>';
  }
}

// ============================================================
// SORT
// ============================================================
let sortKey = 'rank', sortDir = 1;      // 1=asc, -1=desc
let indSortKey = 'rank', indSortDir = 1;

function sortBy(key) {
  if (sortKey === key) sortDir *= -1;
  else { sortKey = key; sortDir = key === 'name' ? 1 : -1; }
  updateSortIndicators(['rank','name','amount'], sortKey, sortDir, '');
  applySort();
  renderBusinessTable(true);
}

function indSortBy(key) {
  if (indSortKey === key) indSortDir *= -1;
  else { indSortKey = key; indSortDir = key === 'label' ? 1 : -1; }
  updateSortIndicators(['rank','label','amount'], indSortKey, indSortDir, 'ind-');
  applyIndSort();
  renderIndividualTable(true);
}

function updateSortIndicators(keys, activeKey, dir, prefix) {
  keys.forEach(k => {
    const el = document.getElementById(`${prefix}sort-${k}`);
    if (el) el.textContent = k === activeKey ? (dir === 1 ? '▲' : '▼') : '';
  });
}

function applySort() {
  filteredBusiness.sort((a, b) => {
    const av = sortKey === 'name' ? (nameCache.get(a.taxId) || '') : a[sortKey];
    const bv = sortKey === 'name' ? (nameCache.get(b.taxId) || '') : b[sortKey];
    if (typeof av === 'string') return av.localeCompare(bv, 'zh-TW') * sortDir;
    return (av - bv) * sortDir;
  });
}

function applyIndSort() {
  filteredIndividual.sort((a, b) => {
    const av = a[indSortKey];
    const bv = b[indSortKey];
    if (typeof av === 'string') return av.localeCompare(bv, 'zh-TW') * indSortDir;
    return (av - bv) * indSortDir;
  });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderAchievements();
  updateRankUI();

  const s = getStore();
  const today = new Date().toISOString().slice(0,10);
  const isFirstVisit = s.stats.days.length === 0;
  if (isFirstVisit) {
    document.getElementById('modal').classList.remove('hidden');
  } else {
    if (!s.badges.includes('FIRST_LOOK')) awardBadge('FIRST_LOOK');
    if (!s.stats.days.includes(today)) {
      s.stats.days.push(today);
      saveStore(s);
    }
  }

  document.getElementById('searchInput').addEventListener('input', onSearchInput);
  document.getElementById('amountFilter').addEventListener('change', () => applyFilters());

  initData();
});
