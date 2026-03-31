# 上線前確認清單

---

## 如何使用本清單

每個項目前的 `[ ]` 代表尚未確認，`[x]` 代表已完成。
標記 **(必要)** 的項目上線前必須完成，**(建議)** 可後續補齊。

---

## A. 資料準備

### A1. CSV 可存取確認
- [ ] **(必要)** 確認 GitHub Pages CSV 可正常存取：
  ```bash
  curl https://kiang.github.io/ardata.cy.gov.tw/report/incomes/business.csv | head -5
  ```
- [ ] **(必要)** 確認個別企業 CSV 可存取（以某一筆已知統編測試）：
  ```bash
  curl https://kiang.github.io/ardata.cy.gov.tw/report/incomes/business/05637971.csv | head -5
  ```
- [ ] **(必要)** 確認 business.csv 筆數合理（應 > 28,000 筆）

### A2. PapaParse 解析測試
- [ ] **(必要)** 在瀏覽器 Console 確認 PapaParse 可正確解析 business.csv
- [ ] **(必要)** 確認解析後的 `total_amount` 為數字（`parseFloat` 結果正確）
- [ ] **(必要)** 確認解析後的 `tax_id` 為 8 碼字串
- [ ] **(建議)** 手動抽查 5-10 筆企業 CSV，確認日期欄位格式可解析

---

## B. Google Forms 設定

### B1. 表單建立
- [ ] **(必要)** Google 表單已建立，包含所有 8 個欄位（見 google-forms.md）
- [ ] **(必要)** 表單已設定「不收集電子郵件地址」
- [ ] **(必要)** 表單說明文字包含免責聲明

### B2. Entry ID 取得
- [ ] **(必要)** 已取得 3 個預填欄位的 entry ID
- [ ] **(必要)** `FORM_BASE_URL` 和 `ENTRY` 已填入 `index.html`（使用 `/d/e/` 格式）

### B3. 預填測試
- [ ] **(必要)** 在真實捐款資料上點擊「回報關聯案件」，確認 Google 表單三個預填欄位有帶入正確資料
- [ ] **(必要)** 確認帶入的中文字沒有亂碼
- [ ] **(必要)** 送出一筆測試回報，確認 Google Sheets 有收到

---

## C. 前端程式碼（index.html）

### C1. 設定確認
- [ ] **(必要)** `FORM_BASE_URL` 不含 `YOUR_FORM_ID` 佔位符
- [ ] **(必要)** `ENTRY` 物件的三個 entry ID 已更新為實際值

### C2. HTML 內容審查
- [ ] **(必要)** `<title>` 已設定為正確名稱
- [ ] **(必要)** Open Graph meta tags 已填寫（og:title, og:description, og:image）
- [ ] **(必要)** 頁面頂部有法律免責聲明橫幅

### C3. 功能測試（手動）
- [ ] **(必要)** 頁面載入後顯示企業排行榜（business.csv 解析正確）
- [ ] **(必要)** 搜尋公司名稱可篩選結果
- [ ] **(必要)** 搜尋統一編號（8位數）可找到對應企業
- [ ] **(必要)** 點擊企業可展開歷次捐款明細（business/{taxID}.csv 正確載入）
- [ ] **(必要)** 點擊「回報關聯案件」開啟 Google 表單，預填欄位正確
- [ ] **(必要)** 分享連結可複製，另開分頁後篩選條件還原
- [ ] **(建議)** 成就系統正常：第一次點擊回報後顯示成就 Toast
- [ ] **(建議)** Tab 切換到「個人捐款」可載入 individual.csv

### C4. 跨瀏覽器測試
- [ ] **(必要)** Chrome（最新版）：功能正常
- [ ] **(必要)** Safari（iPhone）：功能正常
- [ ] **(建議)** Firefox（最新版）：功能正常

### C5. 行動裝置測試
- [ ] **(必要)** 在 375px 寬（iPhone SE）可完成搜尋與回報操作
- [ ] **(必要)** 表格可水平捲動（不破版）
- [ ] **(必要)** 「回報」按鈕大小足夠點擊（建議至少 44x44px）

---

## D. 效能測試

- [ ] **(必要)** business.csv（~500KB）在一般 4G 網路下載入時間 < 5 秒
- [ ] **(必要)** 搜尋輸入到結果更新的延遲 < 500ms（含 300ms debounce）
- [ ] **(建議)** Chrome Lighthouse Performance 分數 > 70

---

## E. 法律與倫理

- [ ] **(必要)** 頁面有明顯法律聲明（資料來源 + 回報屬初步懷疑非法律認定）
- [ ] **(必要)** 資料來源連結指向 `https://ardata.cy.gov.tw`
- [ ] **(必要)** Google 表單中有免責聲明說明文字

---

## F. GitHub 倉庫設定

- [ ] **(必要)** GitHub Pages 已啟用（Settings → Pages → /docs）
- [ ] **(必要)** `index.html` 推送後可在 Pages URL 正常開啟

---

## 快速驗證指令

```bash
# 確認 CSV 可存取
curl -s "https://kiang.github.io/ardata.cy.gov.tw/report/incomes/business.csv" | head -5

# 確認 FORM_BASE_URL 已設定（不含佔位符）
grep "YOUR_FORM_ID" docs/p/ardata_dpp/index.html \
  && echo "[警告] 表單 ID 尚未設定！" \
  || echo "[OK] 表單 ID 已設定"

# 確認法律聲明存在
grep -l "disclaimer\|免責聲明" docs/p/ardata_dpp/index.html \
  && echo "[OK]" || echo "[警告] 找不到免責聲明"
```

---

[← 核心 JS](core-js.md) | [返回第五章總覽](index.md)
