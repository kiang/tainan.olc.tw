# 第四章：功能模組總覽

---

## 章節結構

| 文件 | 說明 |
|------|------|
| [search.md](search.md) | 搜尋與篩選模組：debounce、多欄位搜尋、URL 參數同步 |
| [datagrid.md](datagrid.md) | 資料表格：排序、分頁、大量資料渲染策略 |
| [report.md](report.md) | 回報流程：handleReport() 完整實作、表單驗證 |
| [gamification.md](gamification.md) | 成就系統：localStorage schema、徽章 HTML、分享連結 |

---

## 功能優先順序矩陣

| 功能 | 使用者價值 | 實作難度 | 優先順序 |
|------|----------|---------|---------|
| 關鍵字搜尋 | 極高 | 低 | P0（必做） |
| 金額篩選 | 高 | 低 | P0（必做） |
| 回報流程 | 極高 | 中 | P0（必做） |
| 排序功能 | 中 | 低 | P1 |
| 分頁功能 | 高 | 低 | P1 |
| URL 參數同步 | 中 | 低 | P1 |
| 成就系統 | 中 | 中 | P2 |
| 分享連結 | 中 | 低 | P2 |
| 統計儀表板 | 低 | 高 | P3 |
| 關聯圖視覺化 | 低 | 極高 | P3 |

---

## 功能互動關係圖

```
使用者輸入（搜尋/篩選）
        │
        ▼
  [Filter 模組]
  debounce → 多條件過濾 → filteredRecords[]
        │
        ├──────────────────────┐
        ▼                      ▼
  [Renderer 模組]         [URL Sync 模組]
  渲染表格列              更新 URL params
        │
        ▼
  使用者點擊「回報」
        │
        ▼
  [Report 模組]
  產生預填 URL → window.open()
        │
        ▼
  [Achievements 模組]
  記錄到 localStorage → 顯示成就提示
```

---

[← 返回目錄](../index.md) | [搜尋模組 →](search.md)
