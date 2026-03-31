# 新增選舉年度：如何擴充 PHP Pipeline

---

當有新的選舉年度資料需要加入時，依以下步驟操作。

---

## Step 1：確認 API 有新資料

執行 `01_individual.php` 確認新年度的候選人 ZIP 已可從 API 下載。若 API 已有新年度資料，腳本會自動下載至 `data/individual/account/` 對應路徑。

## Step 2：建立新的 02 腳本

複製現有腳本（例如 `02_report_2024.php`）為新的 `02_report_YYYY.php`：

```bash
cp scripts/02_report_2024.php scripts/02_report_2026.php
```

修改腳本中的選舉年度篩選條件，對應新選舉的名稱格式（例如將「113年」改為「115年」，或對應實際的選舉名稱字串）。輸出路徑改為 `report/YYYY_incomes_sort.csv`。

## Step 3：執行新腳本

```bash
php scripts/02_report_2026.php
```

確認 `report/2026_incomes_sort.csv` 正確產生。

## Step 4：更新跨屆彙整

`03_report_all_income.php` 使用 glob 模式 `data/individual/account/*/*/*.zip` 掃描全部 ZIP，新年度資料會自動被涵蓋，**無需修改腳本**。

直接執行：

```bash
php scripts/03_report_all_income.php
```

這會更新所有 `report/incomes/business/{統一編號}.csv`，加入新年度的捐款紀錄。

## Step 5：重新產生排行榜

```bash
php scripts/04_report_income_sort.php
```

重新計算含新年度在內的全量 `report/incomes/business.csv`。

## Step 6：部署

```bash
git add -A
git commit -m "feat: add 115年選舉資料"
git push
```

GitHub Actions 自動部署至 GitHub Pages，前端即可存取新資料。

---

## 驗證

```bash
# 確認新年度 CSV 產生
ls report/2026_incomes_sort.csv

# 確認排行榜更新
head -5 report/incomes/business.csv

# 確認特定企業的詳細 CSV 含新年度
head report/incomes/business/05637971.csv
```

---

[← 實作總覽](index.md) | [核心 JS →](core-js.md)
