# PHP ETL Pipeline

---

## Pipeline 全貌

```
ardata.cy.gov.tw API
    ↓
01_individual.php → data/individual/account/{選舉}/{地區}/{姓名}_{serial}.zip
01_parties.php   → data/parties/account/{政黨}/{年度}.zip
    ↓
02_report_2024.php (113年選舉)
02_report_2022.php (111年選舉)
02_report_2020.php (109年選舉)
02_report_2024_lai.php (賴清德專項)
02_report_2024_area.php (地區分佈)
02_report_2020_idv.php (個人捐贈)
    → report/YYYY_incomes_sort.csv
    ↓
03_report_all_income.php (跨屆彙整)
    → report/incomes/business/{統一編號}.csv
    → report/incomes/individual/{前綴姓名}.csv
    ↓
04_report_income_sort.php (排行榜)
    → report/incomes/business.csv
    → report/incomes/individual.csv
    ↓
cron.php + GitHub Actions → GitHub Pages
```

---

## 各腳本說明

### 01_individual.php

呼叫 `https://ardata.cy.gov.tw/api/v1/search/individuals` API，分頁取得所有候選人資料。依每筆回傳的 `downloadZip` URL 下載 ZIP，存放至 `data/individual/account/{選舉}/{地區}/{姓名}_{serial}.zip`。

### 01_parties.php

呼叫 `https://ardata.cy.gov.tw/api/v1/search/parties` API，下載各政黨申報 ZIP，存放至 `data/parties/account/{政黨}/{年度}.zip`。

### 02_report_2024.php

讀取 113 年相關選舉的所有 ZIP，解壓取得 `incomes.csv`，彙整所有收入記錄，依候選人統計捐款總額與筆數，輸出 `report/2024_incomes_sort.csv`（含捐款金額、候選人姓名、統編、負責人、資本額、狀態、成立日期等欄位）。

### 02_report_2022.php / 02_report_2020.php

功能同 02_report_2024.php，分別處理 111 年（2022）和 109 年（2020）選舉資料，輸出對應年度的排行 CSV。

### 02_report_2024_lai.php

針對賴清德的申報資料進行專項分析，輸出專屬報告 CSV。

### 02_report_2024_area.php

將 113 年選舉捐款依地區（縣市）彙整，輸出地區分佈 CSV。

### 02_report_2020_idv.php

處理 109 年個人（非法人）捐贈資料，輸出個人捐贈分析 CSV。

### 03_report_all_income.php

跨所有年度彙整捐款資料的核心腳本。使用 glob 模式 `data/individual/account/*/*/*.zip` 掃描全部 ZIP。對每個統一編號（企業）建立獨立 CSV 檔：`report/incomes/business/{統一編號}.csv`，記錄該企業歷次捐款給哪些候選人、哪些選舉、多少金額。同樣方式處理個人捐款者，輸出至 `report/incomes/individual/{前綴姓名}.csv`。

### 04_report_income_sort.php

讀取 `03_report_all_income.php` 產生的所有 per-donor CSV，統計每個企業/個人的歷次捐款總額，排序後輸出：
- `report/incomes/business.csv`（無標頭，格式：`total_amount,tax_id`）
- `report/incomes/individual.csv`（無標頭，格式：`total_amount,id_prefix_name`）

### cron.php

自動化執行排程，依設定的時間間隔執行上述腳本，確保資料保持最新。

---

## 如何新增選舉年度資料

當有新的選舉（例如 115 年選舉）需要加入時：

1. **建立新的 02 腳本**：複製 `02_report_2024.php` 為 `02_report_2026.php`，修改其中的選舉年度篩選條件，使其對應新選舉的名稱格式（例如「115年」）。

2. **確認 03 腳本的涵蓋範圍**：`03_report_all_income.php` 使用 `data/individual/account/*/*/*.zip` 的 glob 模式掃描全部 ZIP，新年度資料由 `01_individual.php` 下載後會自動被涵蓋在此路徑下，無需修改。

3. **重新產生排行榜**：執行 `04_report_income_sort.php`，重新計算含新年度資料在內的全量捐款排行。

4. **部署**：
   ```bash
   git add -A && git commit -m "feat: add 115年選舉資料" && git push
   ```
   GitHub Actions 自動部署，GitHub Pages 更新後前端即可存取新資料。

---

[← CSV Schema](schema.md) | [返回第二章總覽](index.md)
