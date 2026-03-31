# 前端架構規格

---

## 單檔架構：一切都在 index.html

本系統採用單一 HTML 檔案架構：所有 HTML 結構、CSS 設定、JavaScript 邏輯都直接內嵌於 `index.html`。沒有獨立的 `main.js`，沒有模組打包工具，沒有建置步驟。

**為什麼這樣設計：**
- 直接在 GitHub Pages 上運作，無需任何 CI/CD 設定
- 新貢獻者 fork 後即可修改，降低認知負擔
- 避免 ES module 的跨域問題

---

## 資料來源

前端從不同的 GitHub Pages repo 取得資料：

```
https://kiang.github.io/ardata.cy.gov.tw/report/incomes/business.csv
https://kiang.github.io/ardata.cy.gov.tw/report/incomes/business/{taxID}.csv
https://kiang.github.io/ardata.cy.gov.tw/report/incomes/individual.csv
```

這是跨域請求，但 GitHub Pages 允許跨域 GET 請求，不需要特別處理 CORS。

---

## 載入策略

### Step 1：頁面初始化時

```
fetch("report/incomes/business.csv")
```

這個檔案約 500KB，包含約 28,869 家企業的統計資料（每行：`total_amount,tax_id`）。使用 PapaParse 解析後存入記憶體，填充排行榜表格。

### Step 2：使用者點擊特定企業

```
fetch("report/incomes/business/{taxID}.csv")
```

載入該企業的歷次捐款明細（標頭：`選舉,捐贈對象,捐贈人,捐贈日期,捐贈金額`），展開顯示捐款歷史。

### Step 3：切換到個人捐款 Tab

```
fetch("report/incomes/individual.csv")
```

延遲載入，只在使用者切換到個人 tab 時觸發。

---

## 關鍵資料處理

### 日期解析（ROC 格式）

```javascript
function parseRocDate(dateStr) {
  // 格式 1: "1070921" (無分隔符)
  if (/^\d{7}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 3)) + 1911;
    const month = parseInt(dateStr.substring(3, 5)) - 1;
    const day = parseInt(dateStr.substring(5, 7));
    return new Date(year, month, day);
  }
  // 格式 2: "104/09/16" (斜線分隔)
  if (/^\d{2,3}\/\d{2}\/\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return new Date(parseInt(parts[0]) + 1911, parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return null;
}
```

### 金額解析

```javascript
const amount = parseFloat(row.捐贈金額);  // 處理 "50000.00" 和 "500000"
```

---

## URL 狀態管理

使用 `URLSearchParams` 讓搜尋結果可以分享：

```
?q=統一編號或公司名稱
?q=05637971&tab=business
?tab=individual
```

頁面載入時讀取 URL 參數並自動套用篩選條件。

---

## 依賴套件（CDN 載入）

| 套件 | 用途 | CDN |
|------|------|-----|
| TailwindCSS | UI 樣式 | cdn.tailwindcss.com |
| PapaParse | CSV 解析 | cdn.jsdelivr.net/npm/papaparse |

沒有其他依賴。不使用 React、Vue、jQuery 或任何框架。

---

## 目錄結構

```
docs/p/ardata_dpp/
└── index.html    ← 唯一的檔案，包含全部邏輯
```

---

[← 架構總覽](index.md) | [部署規格 →](deployment.md)
