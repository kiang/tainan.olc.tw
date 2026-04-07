/* ================================================================
   幫你問 — Helpyou Petition Assistant
   All data stored in localStorage. No server calls made by this tool.
   ================================================================ */

'use strict';

// ── Taiwan city/district data ──────────────────────────────────
const TW_AREAS = {
  '臺北市':   { zip_prefix:'1', districts:['松山區','信義區','大安區','中山區','中正區','大同區','萬華區','文山區','南港區','內湖區','士林區','北投區'] },
  '基隆市':   { zip_prefix:'2', districts:['仁愛區','信義區','中正區','中山區','安樂區','暖暖區','七堵區'] },
  '新北市':   { zip_prefix:'2', districts:['板橋區','三重區','中和區','永和區','新莊區','新店區','樹林區','鶯歌區','三峽區','淡水區','汐止區','瑞芳區','土城區','蘆洲區','五股區','泰山區','林口區','深坑區','石碇區','坪林區','三芝區','石門區','八里區','平溪區','雙溪區','貢寮區','金山區','萬里區','烏來區'] },
  '桃園市':   { zip_prefix:'3', districts:['桃園區','中壢區','大溪區','楊梅區','蘆竹區','大園區','龜山區','八德區','龍潭區','平鎮區','新屋區','觀音區','復興區'] },
  '新竹市':   { zip_prefix:'3', districts:['東區','北區','香山區'] },
  '新竹縣':   { zip_prefix:'3', districts:['竹北市','湖口鄉','新豐鄉','新埔鎮','關西鎮','芎林鄉','寶山鄉','竹東鎮','五峰鄉','橫山鄉','尖石鄉','北埔鄉','峨眉鄉'] },
  '苗栗縣':   { zip_prefix:'3', districts:['苗栗市','苑裡鎮','通霄鎮','竹南鎮','頭份市','後龍鎮','卓蘭鎮','大湖鄉','公館鄉','銅鑼鄉','南庄鄉','頭屋鄉','三義鄉','西湖鄉','造橋鄉','三灣鄉','獅潭鄉','泰安鄉'] },
  '臺中市':   { zip_prefix:'4', districts:['中區','東區','南區','西區','北區','北屯區','西屯區','南屯區','太平區','大里區','霧峰區','烏日區','豐原區','后里區','石岡區','東勢區','和平區','新社區','潭子區','大雅區','神岡區','大肚區','沙鹿區','龍井區','梧棲區','清水區','大甲區','外埔區','大安區'] },
  '彰化縣':   { zip_prefix:'5', districts:['彰化市','鹿港鎮','和美鎮','線西鄉','伸港鄉','福興鄉','秀水鄉','花壇鄉','芬園鄉','員林市','溪湖鎮','田中鎮','大村鄉','埔鹽鄉','埔心鄉','永靖鄉','社頭鄉','二水鄉','北斗鎮','二林鎮','田尾鄉','埤頭鄉','芳苑鄉','大城鄉','竹塘鄉','溪州鄉'] },
  '南投縣':   { zip_prefix:'5', districts:['南投市','中寮鄉','草屯鎮','國姓鄉','埔里鎮','仁愛鄉','名間鄉','集集鎮','水里鄉','魚池鄉','信義鄉','竹山鎮','鹿谷鄉'] },
  '雲林縣':   { zip_prefix:'6', districts:['斗南鎮','大埤鄉','虎尾鎮','土庫鎮','褒忠鄉','東勢鄉','臺西鄉','崙背鄉','麥寮鄉','斗六市','林內鄉','古坑鄉','莿桐鄉','西螺鎮','二崙鄉','北港鎮','水林鄉','口湖鄉','四湖鄉','元長鄉'] },
  '嘉義市':   { zip_prefix:'6', districts:['東區','西區'] },
  '嘉義縣':   { zip_prefix:'6', districts:['番路鄉','梅山鄉','竹崎鄉','阿里山鄉','中埔鄉','大埔鄉','水上鄉','鹿草鄉','太保市','朴子市','東石鄉','六腳鄉','新港鄉','民雄鄉','大林鎮','溪口鄉','義竹鄉','布袋鎮'] },
  '臺南市':   { zip_prefix:'7', districts:['中西區','東區','南區','北區','安平區','安南區','永康區','歸仁區','新化區','左鎮區','玉井區','楠西區','南化區','仁德區','關廟區','龍崎區','官田區','麻豆區','佳里區','西港區','七股區','將軍區','學甲區','北門區','新營區','後壁區','白河區','東山區','六甲區','下營區','柳營區','鹽水區','善化區','大內區','山上區','新市區','安定區'] },
  '高雄市':   { zip_prefix:'8', districts:['楠梓區','左營區','鼓山區','三民區','鹽埕區','前金區','苓雅區','前鎮區','旗津區','小港區','鳳山區','林園區','大寮區','大樹區','大社區','仁武區','鳥松區','岡山區','橋頭區','燕巢區','田寮區','阿蓮區','路竹區','湖內區','茄萣區','永安區','彌陀區','梓官區','旗山區','美濃區','六龜區','甲仙區','杉林區','內門區','茂林區','桃源區','那瑪夏區'] },
  '屏東縣':   { zip_prefix:'9', districts:['屏東市','三地門鄉','霧臺鄉','瑪家鄉','九如鄉','里港鄉','高樹鄉','鹽埔鄉','長治鄉','麟洛鄉','竹田鄉','內埔鄉','萬丹鄉','潮州鎮','泰武鄉','來義鄉','萬巒鄉','崁頂鄉','新埤鄉','南州鄉','林邊鄉','東港鎮','琉球鄉','佳冬鄉','新園鄉','枋寮鄉','枋山鄉','春日鄉','獅子鄉','車城鄉','牡丹鄉','恆春鎮','滿州鄉'] },
  '宜蘭縣':   { zip_prefix:'2', districts:['宜蘭市','頭城鎮','礁溪鄉','壯圍鄉','員山鄉','羅東鎮','三星鄉','大同鄉','五結鄉','冬山鄉','蘇澳鎮','南澳鄉'] },
  '花蓮縣':   { zip_prefix:'9', districts:['花蓮市','新城鄉','秀林鄉','吉安鄉','壽豐鄉','鳳林鎮','光復鄉','豐濱鄉','瑞穗鄉','萬榮鄉','玉里鎮','卓溪鄉','富里鄉'] },
  '臺東縣':   { zip_prefix:'9', districts:['臺東市','綠島鄉','蘭嶼鄉','延平鄉','卑南鄉','鹿野鄉','關山鎮','海端鄉','池上鄉','東河鄉','成功鎮','長濱鄉','太麻里鄉','金峰鄉','大武鄉','達仁鄉'] },
  '澎湖縣':   { zip_prefix:'8', districts:['馬公市','西嶼鄉','望安鄉','七美鄉','白沙鄉','湖西鄉'] },
  '金門縣':   { zip_prefix:'8', districts:['金城鎮','金湖鎮','金沙鎮','金寧鄉','烈嶼鄉','烏坵鄉'] },
  '連江縣':   { zip_prefix:'2', districts:['南竿鄉','北竿鄉','莒光鄉','東引鄉'] },
};

// ── LocalStorage keys ──────────────────────────────────────────
const KEY_ISSUES  = 'helpyou_issues';
const KEY_DRAFT   = 'helpyou_draft';
const KEY_PROFILE = 'helpyou_profile';

// Personal info fields — saved as profile, restored on every page load
const PROFILE_FIELDS = ['name','idno','mobile','email','zip','county','district','address',
                        'phone','fax','lineId','org','jobTitle','edu','party','age','gender'];
// Petition content fields — only restored from draft
const CONTENT_FIELDS = ['category','content','demand'];

// ── State ─────────────────────────────────────────────────────
let issues = [];
let currentFilter = 'all';
let deleteTargetId = null;
let draftTimer = null;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadIssues();
  populateCounty();
  bindFormEvents();
  restoreProfile();
  restoreDraft();
  renderDashboard();

  // Default to dashboard so users see their cases first
  switchTab('dashboard');
});

// ── Tab switching ──────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.page-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('tab-' + name + '-btn').classList.add('active');

  // Header nav sync
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (name === 'form') document.getElementById('btn-goto-form').classList.add('active');
  if (name === 'dashboard') document.getElementById('btn-goto-dashboard').classList.add('active');

  if (name === 'dashboard') renderDashboard();
}

// ── County/District dropdowns ──────────────────────────────────
function populateCounty() {
  const sel = document.getElementById('f-county');
  Object.keys(TW_AREAS).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', onCountyChange);
}

function onCountyChange() {
  const county = document.getElementById('f-county').value;
  const dSel = document.getElementById('f-district');
  dSel.innerHTML = '<option value="">— 請選擇 —</option>';
  if (!county) { dSel.disabled = true; return; }
  dSel.disabled = false;
  (TW_AREAS[county]?.districts || []).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    dSel.appendChild(opt);
  });
}

// ── Form events ────────────────────────────────────────────────
function bindFormEvents() {
  const form = document.getElementById('petition-form');

  // Demand char counter
  const demandInput = document.getElementById('f-demand');
  demandInput.addEventListener('input', () => {
    document.getElementById('demand-count').textContent = demandInput.value.length;
  });

  // Auto-save draft on any input
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', scheduleDraftSave);
    el.addEventListener('change', scheduleDraftSave);
  });

  // Form submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (validateForm()) handleSubmit();
  });
}

function scheduleDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 1500);
}

// ── Draft / profile save & restore ────────────────────────────
function saveDraft() {
  const data = collectFormData();
  // Always persist personal info as profile
  const profile = {};
  PROFILE_FIELDS.forEach(f => { if (data[f] !== undefined) profile[f] = data[f]; });
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  // Save full form as draft (includes content fields)
  localStorage.setItem(KEY_DRAFT, JSON.stringify(data));
  const el = document.getElementById('draft-saved');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function restoreProfile() {
  // Always pre-fill personal info on load
  const raw = localStorage.getItem(KEY_PROFILE);
  if (!raw) return;
  try { applyFormData(JSON.parse(raw)); } catch(e) { /* ignore */ }
}

function restoreDraft() {
  // Only restore petition content from draft (personal info already restored via profile)
  const raw = localStorage.getItem(KEY_DRAFT);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const contentOnly = {};
    CONTENT_FIELDS.forEach(f => { if (data[f] !== undefined) contentOnly[f] = data[f]; });
    applyFormData(contentOnly);
  } catch(e) { /* ignore */ }
}

function collectFormData() {
  const form = document.getElementById('petition-form');
  const fd = {};
  const fields = ['name','idno','mobile','email','zip','county','district','address',
                  'phone','fax','lineId','org','jobTitle','edu','party','age',
                  'category','content','demand'];
  fields.forEach(f => {
    const el = form.elements[f] || document.getElementById('f-' + f);
    if (el) fd[f] = el.value;
  });
  // radio
  const genderEl = form.querySelector('input[name="gender"]:checked');
  fd.gender = genderEl ? genderEl.value : '';
  return fd;
}

function applyFormData(data) {
  const form = document.getElementById('petition-form');
  Object.entries(data).forEach(([k, v]) => {
    if (k === 'gender') {
      const el = form.querySelector(`input[name="gender"][value="${v}"]`);
      if (el) el.checked = true;
      return;
    }
    const el = form.elements[k] || document.getElementById('f-' + k);
    if (!el) return;
    if (k === 'county') {
      el.value = v;
      onCountyChange();
    } else {
      el.value = v;
    }
  });
  // trigger demand counter
  const demandInput = document.getElementById('f-demand');
  document.getElementById('demand-count').textContent = demandInput.value.length;
}

// ── Validation ─────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  { id: 'f-name',     errId: 'err-name',     msg: '請填寫姓名' },
  { id: 'f-idno',     errId: 'err-idno',     msg: '請填寫身份證字號', validate: v => /^[A-Z][12]\d{8}$/.test(v) },
  { id: 'f-mobile',   errId: 'err-mobile',   msg: '請填寫正確的手機號碼', validate: v => /^09\d{8}$/.test(v) },
  { id: 'f-email',    errId: 'err-email',    msg: '請填寫正確的電子信箱', validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  { id: 'f-county',   errId: 'err-county',   msg: '請選擇縣市' },
  { id: 'f-district', errId: 'err-district', msg: '請選擇鄉鎮市區' },
  { id: 'f-address',  errId: 'err-address',  msg: '請填寫詳細地址' },
  { id: 'f-category', errId: 'err-category', msg: '請選擇案件類別' },
  { id: 'f-content',  errId: 'err-content',  msg: '請填寫陳情內容' },
];

function validateForm() {
  let ok = true;

  REQUIRED_FIELDS.forEach(({ id, errId, msg, validate }) => {
    const el = document.getElementById(id);
    const errEl = document.getElementById(errId);
    const val = el ? el.value.trim() : '';
    let fieldOk = val.length > 0;
    if (fieldOk && validate) fieldOk = validate(val);
    if (!fieldOk) {
      el?.classList.add('error');
      if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
      ok = false;
    } else {
      el?.classList.remove('error');
      errEl?.classList.remove('show');
    }
  });

  const confirm = document.getElementById('f-confirm');
  const errConfirm = document.getElementById('err-confirm');
  if (!confirm.checked) {
    errConfirm.classList.add('show');
    ok = false;
  } else {
    errConfirm.classList.remove('show');
  }

  if (!ok) {
    // Scroll to first error
    const firstError = document.querySelector('.error, .field-error.show');
    firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return ok;
}

// ── Education / politics mappings (our labels → official codes) ──
const EDU_MAP = {
  '國小以下':'E', '國中':'S', '高中職':'H', '專科':'U',
  '大學':'U', '碩士':'G', '博士':'P',
};
const POLITICS_MAP = {
  '台灣民眾黨':'T', '中國國民黨':'K', '民主進步黨':'D', '台灣基進':'S',
  '時代力量':'N', '台灣團結聯盟':'O', '無黨籍':'X', '其他':'O',
};

// ── Submit handler ─────────────────────────────────────────────
function handleSubmit() {
  const data = collectFormData();

  // Save as new issue
  const issue = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: data.category ? `【${data.category}】${data.content.slice(0, 30)}…` : data.content.slice(0, 40) + '…',
    category: data.category,
    content: data.content,
    demand: data.demand,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    ref: '',
    trackLink: '',
    notes: '',
    formData: data,
  };

  issues.unshift(issue);
  saveIssues();
  // Clear draft content but keep profile so personal info stays pre-filled
  localStorage.removeItem(KEY_DRAFT);
  clearContentFields();

  // POST directly to official site in a new tab — browser treats this as a
  // normal form navigation (not XHR), so CORS doesn't apply.
  // The server ignores the missing CSRF token and returns the form pre-filled;
  // the user only needs to complete reCAPTCHA and click submit.
  submitToOfficial(data);
}

function clearContentFields() {
  const form = document.getElementById('petition-form');
  CONTENT_FIELDS.forEach(f => {
    const el = form.elements[f] || document.getElementById('f-' + f);
    if (el) el.value = '';
  });
  document.getElementById('demand-count').textContent = '0';
  document.getElementById('f-confirm').checked = false;
}

function submitToOfficial(data) {
  // Build a hidden form targeting _blank and submit it
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://helpyou.tpp.org.tw/HelpYou';
  form.target = '_blank';
  form.style.display = 'none';

  const fields = {
    'Form.Name':        data.name,
    'Form.PID':         data.idno,
    'Form.Mobile':      data.mobile,
    'Form.Email':       data.email,
    'Form.ZipCode':     data.zip,
    'Form.City':        data.county,
    'Form.Township':    data.district,
    'Form.Address':     data.address,
    'Form.Phone':       data.phone,
    'Form.Fax':         data.fax,
    'Form.LineID':      data.lineId,
    'Form.Dept':        data.org,
    'Form.Title':       data.jobTitle,
    'Form.PetitionDesc': data.content,
    // gender / edu / politics use coded values
    'Form.Gender':      data.gender,
    'Form.Age':         data.age,
    'Form.Education':   EDU_MAP[data.edu]  || '',
    'Form.Politics':    POLITICS_MAP[data.party] || '',
    // reCAPTCHA placeholder — server will show validation error asking user to complete it
    'Recaptcha':        '',
    'Form.AgreeToTerms': 'true',
  };

  for (const [name, value] of Object.entries(fields)) {
    if (!value) continue;
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  // Show a brief notice
  showToast('✅ 已開啟官方陳情網站，資料已預填。請完成驗證碼後送出，並記下受理編號回來追蹤。', 8000);
}

function showToast(msg, duration = 4000) {
  let toast = document.getElementById('helpyou-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'helpyou-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1a3a5c', 'color:white', 'padding:14px 22px', 'border-radius:8px',
      'font-size:14px', 'max-width:480px', 'text-align:center', 'z-index:9999',
      'box-shadow:0 4px 16px rgba(0,0,0,0.25)', 'line-height:1.5',
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// ── LocalStorage helpers ───────────────────────────────────────
function loadIssues() {
  try { issues = JSON.parse(localStorage.getItem(KEY_ISSUES)) || []; }
  catch(e) { issues = []; }
}

function saveIssues() {
  localStorage.setItem(KEY_ISSUES, JSON.stringify(issues));
}

// ── Dashboard render ───────────────────────────────────────────
const STATUS_LABEL = {
  draft: '草稿', pending: '待處理', processing: '處理中', done: '已完成', rejected: '未受理'
};

function filterIssues(f) {
  currentFilter = f;
  document.querySelectorAll('[id^="filter-"]').forEach(b => b.classList.remove('active'));
  document.getElementById('filter-' + f)?.classList.add('active');
  renderDashboard();
}

function renderDashboard() {
  const container = document.getElementById('issue-list-container');
  const filtered = currentFilter === 'all'
    ? issues
    : issues.filter(i => i.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>${currentFilter === 'all' ? '尚無陳情紀錄' : '此狀態下無案件'}</p>
        <p style="margin-top:8px;"><button class="btn-secondary" onclick="switchTab('form')">＋ 新增陳情</button></p>
      </div>`;
    return;
  }

  container.innerHTML = '<div class="issue-list">' +
    filtered.map(issue => renderIssueCard(issue)).join('') +
    '</div>';
}

function renderIssueCard(issue) {
  const date = issue.submittedAt
    ? new Date(issue.submittedAt).toLocaleDateString('zh-TW', {year:'numeric',month:'2-digit',day:'2-digit'})
    : '';
  const statusClass = issue.status || 'draft';
  const statusLabel = STATUS_LABEL[statusClass] || statusClass;

  return `
  <div class="issue-card status-${statusClass}" id="issue-${issue.id}">
    <div class="issue-header">
      <div class="issue-title">${esc(issue.title)}</div>
      <span class="status-badge status-${statusClass}">${statusLabel}</span>
    </div>
    <div class="issue-meta">
      ${date ? `<span>📅 ${date}</span>` : ''}
      ${issue.category ? `<span>🏷️ ${esc(issue.category)}</span>` : ''}
      ${issue.ref ? `<span>🔢 ${esc(issue.ref)}</span>` : ''}
    </div>
    ${issue.content ? `<div class="issue-content">${esc(issue.content)}</div>` : ''}
    ${issue.notes ? `<div style="font-size:12px;color:#555;margin-top:8px;padding:8px;background:#f8f9fa;border-radius:4px;">💬 ${esc(issue.notes)}</div>` : ''}
    <div class="issue-actions">
      <button class="btn-secondary btn-sm" onclick="editIssue('${issue.id}')">✏️ 編輯追蹤</button>
      ${issue.trackLink ? `<a href="${esc(issue.trackLink)}" target="_blank" rel="noopener" class="btn-secondary btn-sm" style="text-decoration:none;">🔗 官方追蹤連結</a>` : ''}
      ${issue.formData ? `<button class="btn-secondary btn-sm" onclick="showFormSnapshot('${issue.id}')">📋 查看填寫資料</button>` : ''}
      <button class="btn-danger btn-sm" onclick="promptDelete('${issue.id}')">🗑️</button>
    </div>
  </div>`;
}

// ── Add-track modal ─────────────────────────────────────────────
function showAddTrackModal() {
  clearTrackForm();
  document.getElementById('modal-track-title').textContent = '新增追蹤案件';
  document.getElementById('track-status').value = 'pending';
  openModal('modal-track');
}

function editIssue(id) {
  const issue = issues.find(i => i.id === id);
  if (!issue) return;
  document.getElementById('modal-track-title').textContent = '編輯案件追蹤資訊';
  document.getElementById('track-id').value = id;
  document.getElementById('track-title').value = issue.title || '';
  document.getElementById('track-category').value = issue.category || '';
  document.getElementById('track-ref').value = issue.ref || '';
  document.getElementById('track-link').value = issue.trackLink || '';
  document.getElementById('track-status').value = issue.status || 'pending';
  document.getElementById('track-content').value = issue.content || '';
  document.getElementById('track-notes').value = issue.notes || '';
  openModal('modal-track');
}

function clearTrackForm() {
  ['track-id','track-title','track-category','track-ref','track-link','track-content','track-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function saveTrack() {
  const title = document.getElementById('track-title').value.trim();
  if (!title) {
    document.getElementById('track-title').focus();
    document.getElementById('track-title').style.borderColor = '#e74c3c';
    return;
  }
  document.getElementById('track-title').style.borderColor = '';

  const id = document.getElementById('track-id').value;
  const payload = {
    title,
    category: document.getElementById('track-category').value,
    ref: document.getElementById('track-ref').value.trim(),
    trackLink: document.getElementById('track-link').value.trim(),
    status: document.getElementById('track-status').value,
    content: document.getElementById('track-content').value.trim(),
    notes: document.getElementById('track-notes').value.trim(),
  };

  if (id) {
    const idx = issues.findIndex(i => i.id === id);
    if (idx !== -1) Object.assign(issues[idx], payload);
  } else {
    issues.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      submittedAt: new Date().toISOString(),
      formData: null,
      ...payload,
    });
  }

  saveIssues();
  closeModal('modal-track');
  renderDashboard();
}

// ── Form snapshot modal ────────────────────────────────────────
function showFormSnapshot(id) {
  const issue = issues.find(i => i.id === id);
  if (!issue?.formData) return;
  const d = issue.formData;
  const masked = d.idno ? '*'.repeat(d.idno.length - 3) + d.idno.slice(-3) : '';

  document.getElementById('snapshot-body').innerHTML = `
    <div style="font-size:13px;line-height:2.2;">
      <div><strong>姓名：</strong>${esc(d.name)}</div>
      <div><strong>身份證：</strong>${masked}</div>
      <div><strong>手機：</strong>${esc(d.mobile)}</div>
      <div><strong>信箱：</strong>${esc(d.email)}</div>
      <div><strong>地址：</strong>${esc(d.county)}${esc(d.district)}${esc(d.address)}</div>
      ${d.org ? `<div><strong>單位：</strong>${esc(d.org)}</div>` : ''}
      <hr style="border-color:#eee;margin:8px 0;">
      <div><strong>類別：</strong>${esc(d.category)}</div>
      <div><strong>陳情內容：</strong><br>
        <div style="white-space:pre-wrap;background:#f8f9fa;padding:8px;border-radius:4px;max-height:200px;overflow-y:auto;">${esc(d.content)}</div>
      </div>
      ${d.demand ? `<div><strong>訴求：</strong>${esc(d.demand)}</div>` : ''}
    </div>
  `;
  document.getElementById('snapshot-restore-btn').onclick = () => restoreSnapshot(id);
  openModal('modal-snapshot');
}

function restoreSnapshot(id) {
  const issue = issues.find(i => i.id === id);
  if (!issue?.formData) return;
  closeModal('modal-snapshot');
  applyFormData(issue.formData);
  switchTab('form');
}

// ── Delete ─────────────────────────────────────────────────────
function promptDelete(id) {
  deleteTargetId = id;
  openModal('modal-delete');
}

function confirmDelete() {
  if (!deleteTargetId) return;
  issues = issues.filter(i => i.id !== deleteTargetId);
  deleteTargetId = null;
  saveIssues();
  closeModal('modal-delete');
  renderDashboard();
}

// ── Modal helpers ──────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ── Utilities ─────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
