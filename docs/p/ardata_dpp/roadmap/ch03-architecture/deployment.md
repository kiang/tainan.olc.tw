# GitHub Pages 部署規格

---

## 雙 Repo 架構

本專案由兩個獨立 repository 組成，各司其職：

### Repo 1：資料 Pipeline（kiang/ardata.cy.gov.tw）

- **用途**：PHP 腳本 + 原始資料 + 處理後 CSV
- **部署**：GitHub Actions 自動執行，推送後 GitHub Pages 自動更新
- **前端存取 URL**：`https://kiang.github.io/ardata.cy.gov.tw/`
- **無需手動操作**：新資料由 PHP 腳本定期從 API 拉取

### Repo 2：前端（kiang/tainan.olc.tw）

- **用途**：前端 `index.html` 的家
- **路徑**：`docs/p/ardata_dpp/index.html`
- **部署**：推送到 master，GitHub Pages 從 `docs/` 目錄自動部署
- **無建置步驟**：直接編輯 `index.html` 並 push 即完成部署

---

## 前端部署流程

```bash
# 修改 index.html 後，只需：
git add docs/p/ardata_dpp/index.html
git commit -m "fix: 更新搜尋功能"
git push
# GitHub Pages 在 1-2 分鐘內更新
```

不需要 npm install、不需要 build、不需要任何工具。

---

## 啟用 GitHub Pages（第一次設定）

```
1. 進入倉庫 Settings → Pages
2. Source：Deploy from a branch
3. Branch：master，Folder：/docs
4. 點擊 Save
5. 等待約 1-2 分鐘後網址即可使用
```

---

## 檔案大小與限制

| 限制項目 | 上限 |
|---------|------|
| 單檔大小 | 100MB（硬限制） |
| 建議單檔 | 25MB |
| 整個 Pages | 1GB |
| 月流量 | 100GB |

`business.csv`（~500KB）遠低於任何限制，不需要擔心。

---

## 部署後驗證

```bash
# 確認 CSV 可正常存取
curl -s "https://kiang.github.io/ardata.cy.gov.tw/report/incomes/business.csv" | head -5

# 確認前端可開啟
curl -s -o /dev/null -w "%{http_code}" https://kiang.github.io/tainan.olc.tw/p/ardata_dpp/
```

---

[← 前端架構](frontend.md) | [Google Forms 整合 →](google-forms.md)
