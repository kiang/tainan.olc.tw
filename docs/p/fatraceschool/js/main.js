const API_BASE = 'https://fatraceschool.k12ea.gov.tw/';

let dishes = [];
let currentIndex = 0;
let votes = {};

// ---- Searchable Dropdown ----
const ssdState = { county: {value:'',label:''}, area: {value:'',label:''}, school: {value:'',label:''} };

function ssdSetup(id, onSelect) {
  const display  = document.getElementById(id + 'Display');
  const dropdown = document.getElementById(id + 'Dropdown');
  const search   = document.getElementById(id + 'Search');

  function open() {
    document.querySelectorAll('.ssd-dropdown.open').forEach(d => {
      if (d !== dropdown) {
        d.classList.remove('open');
        d.previousElementSibling.classList.remove('open');
      }
    });
    display.classList.add('open');
    dropdown.classList.add('open');
    search.value = '';
    ssdFilter(id, '');
    search.focus();
  }

  function close() {
    display.classList.remove('open');
    dropdown.classList.remove('open');
  }

  display.addEventListener('click', () => {
    if (dropdown.classList.contains('open')) close(); else open();
  });
  display.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    if (e.key === 'Escape') close();
  });
  search.addEventListener('input', () => ssdFilter(id, search.value));
  search.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); display.focus(); }
  });

  document.addEventListener('click', e => {
    if (!display.contains(e.target) && !dropdown.contains(e.target)) close();
  });
}

function ssdFilter(id, query) {
  const list = document.getElementById(id + 'List');
  const q = query.trim().toLowerCase();
  list.querySelectorAll('.ssd-option').forEach(opt => {
    opt.style.display = (!q || opt.dataset.label.toLowerCase().includes(q)) ? '' : 'none';
  });
}

function ssdSetOptions(id, options, placeholder, onSelect) {
  const list = document.getElementById(id + 'List');
  list.innerHTML = '';

  const placeholderEl = document.createElement('div');
  placeholderEl.className = 'ssd-option placeholder-opt';
  placeholderEl.dataset.label = placeholder;
  placeholderEl.dataset.value = '';
  placeholderEl.textContent = placeholder;
  placeholderEl.addEventListener('click', () => ssdSelect(id, '', placeholder, onSelect));
  list.appendChild(placeholderEl);

  options.forEach(({value, label}) => {
    const el = document.createElement('div');
    el.className = 'ssd-option';
    el.dataset.label = label;
    el.dataset.value = value;
    el.textContent = label;
    if (ssdState[id].value === value) el.classList.add('selected');
    el.addEventListener('click', () => ssdSelect(id, value, label, onSelect));
    list.appendChild(el);
  });
}

function ssdSelect(id, value, label, onSelect) {
  ssdState[id] = {value, label};
  const display = document.getElementById(id + 'Display');
  const arrow = display.querySelector('.ssd-arrow');
  display.textContent = label;
  display.appendChild(arrow);
  display.classList.remove('open');
  document.getElementById(id + 'Dropdown').classList.remove('open');
  document.getElementById(id + 'List').querySelectorAll('.ssd-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.value === value);
  });
  if (onSelect) onSelect(value);
}

function ssdSetDisplay(id, text) {
  const display = document.getElementById(id + 'Display');
  const arrow = display.querySelector('.ssd-arrow');
  display.textContent = text;
  display.appendChild(arrow);
  ssdState[id] = {value: '', label: ''};
}

// ---- API ----
async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = API_BASE + path + (qs ? '?' + qs : '');
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  if (json.result !== 1) throw new Error(json.message || 'API error');
  return json.data || [];
}

// ---- Setup ----
async function loadCounties() {
  ssdSetDisplay('county', '載入中...');
  try {
    const data = await apiGet('county');
    ssdSetDisplay('county', '請選擇縣市');
    ssdSetOptions('county', data.map(c => ({value: String(c.CountyId), label: c.County})), '請選擇縣市', loadAreas);
  } catch(e) {
    ssdSetDisplay('county', '載入失敗');
  }
}

function resetKitchenPanel() {
  document.getElementById('kitchenPanel').style.display = 'none';
  document.getElementById('kitchenCards').innerHTML = '';
  allBatches = [];
}

async function loadAreas(countyId) {
  ssdSetDisplay('area', '載入中...');
  ssdSetDisplay('school', '請先選鄉鎮市區');
  ssdSetOptions('school', [], '請先選鄉鎮市區', null);
  resetKitchenPanel();
  if (!countyId) { ssdSetDisplay('area', '請先選縣市'); return; }
  try {
    const data = await apiGet('area', { CountyId: countyId });
    ssdSetDisplay('area', '請選擇鄉鎮市區');
    ssdSetOptions('area', data.map(a => ({value: String(a.AreaId), label: a.Area})), '請選擇鄉鎮市區', loadSchools);
  } catch(e) {
    ssdSetDisplay('area', '載入失敗');
  }
}

async function loadSchools(areaId) {
  const countyId = ssdState.county.value;
  ssdSetDisplay('school', '載入中...');
  resetKitchenPanel();
  if (!areaId) { ssdSetDisplay('school', '請先選鄉鎮市區'); return; }
  try {
    const data = await apiGet('school', { CountyId: countyId, AreaId: areaId });
    ssdSetDisplay('school', '請選擇學校');
    ssdSetOptions('school', data.map(s => ({value: String(s.SchoolId), label: s.SchoolName})), '請選擇學校', null);
  } catch(e) {
    ssdSetDisplay('school', '載入失敗');
  }
}

let allBatches = [];
let selectedSchoolName = '';
let selectedDate = '';
let selectedVendor = '';

async function startRating() {
  const schoolId = ssdState.school.value;
  const date = document.getElementById('dateInput').value;
  const errEl = document.getElementById('setupError');
  errEl.style.display = 'none';

  if (!schoolId) { showSetupError('請先選擇學校喔！'); return; }
  if (!date)     { showSetupError('請先選擇日期喔！'); return; }

  selectedSchoolName = ssdState.school.label;
  selectedDate = date;
  selectedVendor = '';

  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  btn.textContent = '載入中...';

  try {
    allBatches = await apiGet('offered/meal', { SchoolId: schoolId, period: date, KitchenId: 'all', MenuType: 1 });

    if (!allBatches || allBatches.length === 0) {
      showSetupError('該日期查無菜單資料，請換其他日期或學校試試。');
      btn.disabled = false;
      btn.textContent = '出發評分！🍽️';
      return;
    }

    btn.disabled = false;
    btn.textContent = '出發評分！🍽️';

    // Show kitchen picker panel, hide setup panel
    document.getElementById('setupPanel').style.display = 'none';
    const panel = document.getElementById('kitchenPanel');
    const loading = document.getElementById('kitchenLoading');
    const cards = document.getElementById('kitchenCards');
    panel.style.display = 'block';
    loading.style.display = 'block';
    cards.innerHTML = '';

    // If only one kitchen, skip picker and go straight in
    if (allBatches.length === 1) {
      loading.style.display = 'none';
      await pickKitchen(allBatches[0]);
      return;
    }

    // Fetch dishes for all batches in parallel to show preview photos
    const batchDishes = await Promise.all(
      allBatches.map(b => apiGet('dish', { BatchDataId: b.BatchDataId })
        .then(list => ({ batch: b, dishList: list }))
        .catch(() => ({ batch: b, dishList: [] }))
      )
    );

    loading.style.display = 'none';

    batchDishes.forEach(({ batch, dishList }) => {
      const card = document.createElement('div');
      card.className = 'kitchen-card';
      card.onclick = () => pickKitchen(batch, dishList);

      // Show up to 4 dish photos
      const preview = dishList.slice(0, 4);
      const photosHtml = preview.map(d => {
        const url = `${API_BASE}dish/pic/${encodeURIComponent(d.DishId || '')}`;
        return `<div class="kp-item">
          <img src="${esc(url)}" alt="${esc(d.DishName || '')}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="kp-placeholder" style="display:none">🍱</div>
        </div>`;
      }).join('');
      // Fill remaining slots with placeholders
      const empty = Array(Math.max(0, 4 - preview.length))
        .fill('<div class="kp-item"><div class="kp-placeholder">🍱</div></div>').join('');

      card.innerHTML = `
        <div class="kitchen-card-photos">${photosHtml}${empty}</div>
        <div class="kitchen-card-label">
          <span class="kitchen-tap-hint">👆 這是我的餐點！</span>
          <span class="dish-count">${dishList.length} 道菜</span>
        </div>
      `;
      cards.appendChild(card);
    });

  } catch(e) {
    showSetupError('載入失敗：' + e.message);
    btn.disabled = false;
    btn.textContent = '出發評分！🍽️';
    document.getElementById('setupPanel').style.display = 'block';
    document.getElementById('kitchenPanel').style.display = 'none';
  }
}

async function pickKitchen(batch, dishList) {
  selectedVendor = batch.KitchenName || '';
  try {
    const rawDishes = dishList || await apiGet('dish', { BatchDataId: batch.BatchDataId });

    const seen = new Set();
    dishes = rawDishes.filter(d => {
      const key = d.DishBatchDataId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(d => ({
      id: String(d.DishBatchDataId),
      dishId: String(d.DishId || ''),
      name: d.DishName || '未知料理',
      type: d.DishType || '',
      restaurant: batch.KitchenName || '',
    }));

    currentIndex = 0;
    votes = {};
    document.getElementById('kitchenPanel').style.display = 'none';
    showSwipePanel();

  } catch(e) {
    document.getElementById('kitchenPanel').style.display = 'none';
    document.getElementById('setupPanel').style.display = 'block';
    showSetupError('載入失敗：' + e.message);
  }
}

function showSetupError(msg) {
  const el = document.getElementById('setupError');
  el.textContent = msg;
  el.style.display = 'block';
}

// ---- Swipe ----
let isDragging = false, startX = 0, currentX = 0;

function showSwipePanel() {
  document.getElementById('setupPanel').style.display = 'none';
  document.getElementById('swipePanel').style.display = 'flex';
  renderCard();
  updateProgress();
}

function updateProgress() {
  const total = dishes.length;
  const done = currentIndex;
  document.getElementById('progressLabel').textContent = `第 ${done + 1} / ${total} 道菜`;
  if (done >= total) document.getElementById('progressLabel').textContent = `全部評完囉！`;
  document.getElementById('progressBar').style.width = (done / total * 100) + '%';
}

function renderCard() {
  const stack = document.getElementById('cardStack');
  stack.innerHTML = '';

  if (currentIndex >= dishes.length) {
    stack.innerHTML = `<div class="done-msg"><div class="emoji">🎉</div><h3>評完了！超厲害！</h3><p>共評了 ${dishes.length} 道菜</p></div>`;
    setTimeout(showResults, 1400);
    return;
  }

  if (currentIndex + 1 < dishes.length) {
    const bg = document.createElement('div');
    bg.className = 'next-bg';
    stack.appendChild(bg);
  }

  const dish = dishes[currentIndex];
  const card = document.createElement('div');
  card.className = 'dish-card';
  const photoUrl = `${API_BASE}dish/pic/${encodeURIComponent(dish.dishId)}`;
  card.innerHTML = `
    <div class="vote-overlay like">好吃 😋</div>
    <div class="vote-overlay nope">難吃 😖</div>
    <img class="dish-photo" src="${esc(photoUrl)}" alt="${esc(dish.name)}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="dish-photo-placeholder" style="display:none">🍱</div>
    <div class="dish-name">${esc(dish.name)}</div>
    ${dish.type ? `<span class="dish-type">${esc(dish.type)}</span>` : ''}
    <div class="dish-meta">${dish.restaurant ? esc(dish.restaurant) : ''}</div>
  `;

  setupDrag(card);
  stack.appendChild(card);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function setupDrag(card) {
  card.addEventListener('mousedown', dragStart);
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);
  card.addEventListener('touchstart', e => dragStart(e.touches[0]), { passive: true });
  window.addEventListener('touchmove', e => dragMove(e.touches[0]), { passive: false });
  window.addEventListener('touchend', e => dragEnd(e.changedTouches[0]));
}

function dragStart(e) {
  isDragging = true;
  startX = e.clientX;
  currentX = 0;
}

function dragMove(e) {
  if (!isDragging) return;
  currentX = e.clientX - startX;
  const card = document.querySelector('.dish-card');
  if (!card) return;

  card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.07}deg)`;
  card.style.transition = 'none';

  const likeEl = card.querySelector('.vote-overlay.like');
  const nopeEl = card.querySelector('.vote-overlay.nope');
  if (currentX > 30) {
    likeEl.style.opacity = Math.min((currentX - 30) / 60, 1);
    nopeEl.style.opacity = 0;
  } else if (currentX < -30) {
    nopeEl.style.opacity = Math.min((-currentX - 30) / 60, 1);
    likeEl.style.opacity = 0;
  } else {
    likeEl.style.opacity = 0;
    nopeEl.style.opacity = 0;
  }
}

function dragEnd(e) {
  if (!isDragging) return;
  isDragging = false;

  if (currentX > 90) {
    vote('like');
  } else if (currentX < -90) {
    vote('nope');
  } else {
    const card = document.querySelector('.dish-card');
    if (card) {
      card.style.transition = '';
      card.style.transform = '';
      card.querySelector('.vote-overlay.like').style.opacity = 0;
      card.querySelector('.vote-overlay.nope').style.opacity = 0;
    }
  }
  currentX = 0;
}

function vote(type) {
  if (currentIndex >= dishes.length) return;

  const dish = dishes[currentIndex];
  if (type !== 'skip') votes[dish.id] = type;

  const card = document.querySelector('.dish-card');
  if (card) {
    window.removeEventListener('mousemove', dragMove);
    window.removeEventListener('mouseup', dragEnd);
    window.removeEventListener('touchmove', dragMove);
    window.removeEventListener('touchend', dragEnd);

    card.style.transition = '';
    if (type === 'like') {
      card.querySelector('.vote-overlay.like').style.opacity = 1;
      card.classList.add('swipe-right');
    } else if (type === 'nope') {
      card.querySelector('.vote-overlay.nope').style.opacity = 1;
      card.classList.add('swipe-left');
    } else {
      card.classList.add('swipe-skip');
    }

    setTimeout(() => {
      currentIndex++;
      updateProgress();
      renderCard();
    }, type === 'skip' ? 200 : 360);
  } else {
    currentIndex++;
    updateProgress();
    renderCard();
  }
}

// Keyboard
document.addEventListener('keydown', e => {
  if (document.getElementById('swipePanel').style.display !== 'flex') return;
  if (e.key === 'ArrowRight') vote('like');
  else if (e.key === 'ArrowLeft') vote('nope');
  else if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); vote('skip'); }
});

// ---- Results ----
function dishGalleryItem(d) {
  const photoUrl = `${API_BASE}dish/pic/${encodeURIComponent(d.dishId)}`;
  return `
    <div class="gallery-item">
      <img src="${esc(photoUrl)}" alt="${esc(d.name)}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="gallery-placeholder" style="display:none">🍱</div>
      <div class="gallery-label">${esc(d.name)}</div>
    </div>
  `;
}

function showResults() {
  document.getElementById('swipePanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display = 'block';

  const liked   = dishes.filter(d => votes[d.id] === 'like');
  const noped   = dishes.filter(d => votes[d.id] === 'nope');
  const skipped = dishes.filter(d => !votes[d.id]);

  document.getElementById('summaryRow').innerHTML = `
    <div class="summary-item result-summary">
      <div class="big-num" style="color:#27ae60">${liked.length}</div>
      <div class="label">好吃 😋</div>
    </div>
    <div class="summary-item result-summary">
      <div class="big-num" style="color:#e74c3c">${noped.length}</div>
      <div class="label">難吃 😖</div>
    </div>
    <div class="summary-item result-summary">
      <div class="big-num" style="color:#b89a80">${skipped.length}</div>
      <div class="label">跳過 ⏭</div>
    </div>
  `;

  const likedGallery = document.getElementById('likedGallery');
  const likedEmpty   = document.getElementById('likedEmpty');
  if (liked.length) {
    likedGallery.innerHTML = liked.map(dishGalleryItem).join('');
    likedEmpty.style.display = 'none';
  } else {
    likedGallery.innerHTML = '';
    likedEmpty.style.display = 'block';
  }

  const nopedGallery = document.getElementById('nopedGallery');
  const nopedEmpty   = document.getElementById('nopedEmpty');
  if (noped.length) {
    nopedGallery.innerHTML = noped.map(dishGalleryItem).join('');
    nopedEmpty.style.display = 'none';
  } else {
    nopedGallery.innerHTML = '';
    nopedEmpty.style.display = 'block';
  }
}

function backToSetup() {
  document.getElementById('resultsPanel').style.display = 'none';
  document.getElementById('kitchenPanel').style.display = 'none';
  document.getElementById('kitchenCards').innerHTML = '';
  document.getElementById('setupPanel').style.display = 'block';
  document.getElementById('setupError').style.display = 'none';
  allBatches = [];
  const btn = document.getElementById('startBtn');
  btn.disabled = false;
  btn.textContent = '出發評分！🍽️';
}

function shareResults() {
  const liked = dishes.filter(d => votes[d.id] === 'like').map(d => d.name);
  const noped = dishes.filter(d => votes[d.id] === 'nope').map(d => d.name);
  let text = '校園菜色評分結果 🍱\n';
  if (selectedSchoolName) text += `\n🏫 學校：${selectedSchoolName}`;
  if (selectedDate)       text += `\n📅 日期：${selectedDate}`;
  if (selectedVendor)     text += `\n🍳 供應商：${selectedVendor}`;
  if (liked.length) text += `\n\n😋 好吃：${liked.join('、')}`;
  if (noped.length) text += `\n😖 難吃：${noped.join('、')}`;
  text += '\n\n來自 校園食材登錄平臺評分工具';

  if (navigator.share) {
    navigator.share({ title: '校園菜色評分', text });
  } else {
    navigator.clipboard?.writeText(text).then(() => {
      const btn = document.getElementById('shareBtn');
      btn.textContent = '已複製！✅';
      setTimeout(() => { btn.textContent = '分享結果 📤'; }, 2000);
    });
  }
}

// ---- Init ----
(function() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('dateInput').value = `${y}-${m}-${d}`;
  ssdSetup('county', loadAreas);
  ssdSetup('area', loadSchools);
  ssdSetup('school', null);
  loadCounties();
})();
