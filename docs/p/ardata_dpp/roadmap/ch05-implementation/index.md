# 第五章：實作指南總覽

---

## 章節結構

| 文件 | 說明 |
|------|------|
| [data-conversion.md](data-conversion.md) | 完整 Python 轉換腳本：讀取 OLC CSV → 輸出分割 JSON |
| [core-js.md](core-js.md) | main.js 完整帶注解版：所有模組整合、初始化流程 |
| [checklist.md](checklist.md) | 上線前逐項確認清單 |

---

## 實作建議順序

```
Week 1（基礎建設）
  Day 1-2：執行 data-conversion.md 中的腳本，取得 JSON 資料
  Day 3-4：建立 index.html 與基本 CSS 結構
  Day 4-5：建立 Google 表單，測試預填 URL

Week 2（核心功能）
  Day 1-2：實作 DataLoader（fetch + 解析 + 快取）
  Day 2-3：實作 Filter 與 Renderer（搜尋 + 表格渲染）
  Day 3-4：整合 Report 模組（handleReport + Google Forms）
  Day 5：測試全流程，修正 bug

Week 3（功能完善）
  Day 1：實作 Sort 模組
  Day 2：實作 Pagination（分頁）
  Day 3：實作 URL 參數同步（分享篩選連結）
  Day 4：實作 Achievements（成就系統）
  Day 5：行動裝置測試與調整

Week 4（上線準備）
  核對 checklist.md 所有項目
  效能測試
  部署到 GitHub Pages
  初步推廣
```

---

## 最小可行產品（MVP）定義

**P0 必須完成才能上線：**
- [ ] 資料可以搜尋（關鍵字 + 金額篩選）
- [ ] 搜尋結果在表格中顯示
- [ ] 每列有「回報」按鈕，點擊後開啟有預填資料的 Google 表單
- [ ] 法律聲明已顯示

**P1 應該在第一個版本完成：**
- [ ] 多年度切換
- [ ] 排序功能
- [ ] 分頁功能
- [ ] 行動裝置友善

**P2 可以在後續版本加入：**
- [ ] 成就系統
- [ ] 分享連結
- [ ] URL 參數同步

---

[← 返回目錄](../index.md) | [資料轉換腳本 →](data-conversion.md)
