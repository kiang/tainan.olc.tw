# 政治獻金與關聯案件群眾外包搜查系統：技術規格全書

> 本文件為完整技術規格書，適合開發者直接依此實作。

---

## 目錄

| 章節 | 標題 | 內容摘要 |
|------|------|---------|
| [第一章](ch01-vision/) | 願景與使用者 | 專案動機、目標使用者人物誌、核心價值主張 |
| [第二章](ch02-data/) | 資料規格 | 資料來源、CSV Schema、ETL Pipeline |
| [第三章](ch03-architecture/) | 系統架構 | 前端架構、部署策略、Google Forms 整合 |
| [第四章](ch04-features/) | 功能模組 | 搜尋、資料表格、回報流程、成就系統 |
| [第五章](ch05-implementation/) | 實作指南 | 新增選舉資料、上線前檢查清單 |
| [第六章](ch06-community/) | 社群與法律 | 社群策略、法律免責聲明、開發里程碑 |

---

## 快速導覽

### 我是開發者，從哪裡開始？

1. 先讀 [第二章 / sources.md](ch02-data/sources.md) — 確認真實資料 URL 與格式
2. 再看 [第二章 / pipeline.md](ch02-data/pipeline.md) — 了解 PHP ETL 流程
3. 參考 [第三章 / frontend.md](ch03-architecture/frontend.md) — 前端單檔架構說明
4. 整合 [第三章 / google-forms.md](ch03-architecture/google-forms.md) — 設定投書表單
5. 核對 [第五章 / checklist.md](ch05-implementation/checklist.md) — 上線前逐項確認

實作的起點是 `index.html`，所有 JavaScript 邏輯都在其中。資料來源請查閱 [ch02-data/sources.md](ch02-data/sources.md)。

### 我是專案管理者，想了解進度規劃？

- [第六章 / milestones.md](ch06-community/milestones.md) — Phase 1-4 詳細里程碑、驗收標準

### 我想了解功能細節？

- [第四章 / search.md](ch04-features/search.md) — 搜尋功能設計規格
- [第四章 / report.md](ch04-features/report.md) — 回報流程設計規格
- [第四章 / gamification.md](ch04-features/gamification.md) — 成就系統與趣味化設計

---

## 專案一句話說明

**把政府公開的政治獻金資料，轉化為任何人都能參與的公民調查工具，透過群眾外包找出捐款與政策決定之間的可疑關聯。**

---

## 技術棧摘要

```
資料層：  ardata.cy.gov.tw API → PHP ETL → per-donor CSV（GitHub Pages）
前端層：  HTML5 + TailwindCSS (CDN) + Vanilla JavaScript + PapaParse
回報層：  Google Forms 預填 URL 機制
部署層：  GitHub Pages（零成本、零維護）
互動層：  localStorage 成就系統 + URLSearchParams 分享連結
```

---

*最後更新：2026-03-31*
