# 第二章：資料規格總覽

---

## 章節結構

| 文件 | 說明 |
|------|------|
| [sources.md](sources.md) | 資料來源：監察院 API、ZIP 格式、GitHub Pages 輸出 URL |
| [schema.md](schema.md) | 三種真實 CSV 格式的完整欄位說明 |
| [pipeline.md](pipeline.md) | PHP ETL Pipeline：各腳本功能與執行順序 |

---

## 資料流概覽

```
ardata.cy.gov.tw API (監察院)
    ↓ [01_individual.php / 01_parties.php]
ZIPs → incomes.csv (15欄位)
    ↓ [02_report_*.php × 6]
按選舉彙整 CSV (report/2024_incomes_sort.csv 等)
    ↓ [03_report_all_income.php]
按捐贈者分檔 (report/incomes/business/{統一編號}.csv)
    ↓ [04_report_income_sort.php]
排行榜 CSV (report/incomes/business.csv)
    ↓ [GitHub Pages]
前端直接 fetch CSV
```

---

## 資料品質現況

| 欄位 | 完整度 | 備注 |
|------|--------|------|
| 捐贈者名稱（[6]） | ~100% | 極少數空白，需濾除 |
| 身分證/統一編號（[7]） | ~85% | 個人捐款者可能無統編 |
| 收入金額（[8]） | ~100% | 帶 .00 後綴，parseFloat 即可 |
| 交易日期（[4]） | ~98% | 兩種格式（1070921 或 104/09/16） |
| 選舉名稱（[2]） | 100% | 來自申報資料 |

---

## 資料量級估算

| 資料類型 | 量級 | 大小 |
|---------|------|------|
| report/incomes/business.csv（排行榜） | ~28,869 筆 | ~500KB |
| report/incomes/business/{id}.csv（個別公司） | 每檔數筆～數百筆 | 幾KB |
| 全部 ZIP 解壓後 | 數十萬筆 | 數百MB |

**前端載入策略**：頁面啟動時只載入 business.csv（~500KB，約 29K 行），使用者點擊特定公司時再 fetch 該公司的個別 CSV。這讓初始載入快且輕量。

---

[← 返回目錄](../index.md) | [資料來源 →](sources.md)
