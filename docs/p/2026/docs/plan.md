# 2026 TPP 候選人選區地圖 — 開發計畫

## 目標

改造現有 `index.html` 為 Leaflet 互動地圖，展示台灣民眾黨（TPP）2026 年 9 種選舉的候選人及其選區。admin.php 負責編輯候選人資料，並產生地圖所需的選區 GeoJSON 檔到 `zones/` 目錄。

## 9 種選舉類型

| 選舉類型 | 選區來源 | polygon 組成方式 |
|---------|---------|-----------------|
| 直轄市市長 | 以縣市為單位 | 從 cunli topo 合併該縣市所有村里 |
| 直轄市議員 | T1/T2/T3 zone | 從 cunli topo 合併 zone 內村里 |
| 直轄市山地原住民區區長 | 以區為單位 | 從 cunli topo 合併該區所有村里 |
| 直轄市山地原住民區區民代表 | R3 zone | 從 cunli topo 合併 zone 內村里 |
| 縣市首長 | 以縣市為單位 | 從 cunli topo 合併該縣市所有村里 |
| 縣市議員 | T1/T2/T3 zone | 從 cunli topo 合併 zone 內村里 |
| 鄉鎮市長 | 以鄉鎮為單位 | 從 cunli topo 合併該鄉鎮所有村里 |
| 鄉鎮市民代表 | R1/R2 zone | 從 cunli topo 合併 zone 內村里 |
| 村里長 | 以村里為單位 | 直接使用 cunli 單一村里 polygon |

所有選區的 polygon 都可從 cunli 地圖擷取：
- 市長/縣長 → 合併 COUNTYCODE 相同的所有 cunli
- 鄉鎮市長/區長 → 合併 TOWNCODE 相同的所有 cunli
- 議員/代表 zone → 從 `data/zones.json` 查 townCodes/villCodes，合併對應 cunli
- 村里長 → 單一 VILLCODE 的 cunli

## 現有資源

### 資料

| 資料 | 位置 | 說明 |
|------|------|------|
| 選區 GeoJSON（cunli 級） | `db.cec.gov.tw/data/elections/2026/` | 896 個 zone，每個由多個 cunli feature 組成 |
| 選區名稱對照 | `db.cec.gov.tw/data/elections/2026/list.csv` | type, code, name, type_name |
| cunli TopoJSON | `kiang.github.io/taiwan_basecode/cunli/topo/city/20240807/{縣市}.json` | admin.php 已在用 |
| 縣市 TopoJSON | `kiang.github.io/taiwan_basecode/county/topo/20200820.json` | admin.php 已在用 |
| TPP 選情分析 | `tpp/zones.json` | 160 個議員選區的歷史票數、門檻、基盤估算 |
| TPP 選區報告 | `tpp/{code}.json` | 個別選區詳細備戰報告 |
| 候選人資料 | `data/candidates.json` | 目前 2 筆 TPP 候選人 |
| 選區定義 | `data/zones.json` | 3 種選舉的選區→鄉鎮/村里對照 |
| 候選人照片 | `data/photos/` | 候選人頭像 |

### 前端

| 頁面 | 說明 | 處置 |
|------|------|------|
| `index.html` + `js/main.js` | 全選舉候選人地圖 | **改造為 TPP 專用地圖** |
| `admin.php` | 候選人 & 選區管理 | **擴充：產生 zone GeoJSON** |
| `tpp/zone.html` + `tpp/main.js` | TPP 備戰報告 | 保留不動 |

## 架構設計

### 目錄結構

```
docs/p/2026/
├── index.html              ← 改造：TPP 候選人選區地圖
├── js/main.js              ← 改造：地圖邏輯
├── admin.php               ← 擴充：generate zones 功能
├── data/
│   ├── candidates.json     ← 既有
│   ├── zones.json          ← 既有：選區定義（townCodes/villCodes）
│   └── photos/             ← 既有
├── zones/                  ← 新建：admin.php 產生的 GeoJSON
│   ├── overview/           ← 每個選舉類型一個檔案（概覽用）
│   │   ├── 直轄市市長.json     ← 6 個 feature（每個直轄市一個合併 polygon）
│   │   ├── 直轄市議員.json     ← ~80 個 feature（每選區一個合併 polygon）
│   │   ├── 縣市首長.json
│   │   ├── 縣市議員.json
│   │   ├── 鄉鎮市長.json
│   │   ├── 鄉鎮市民代表.json
│   │   ├── 村里長.json        ← 只含有候選人的村里
│   │   └── ...（共 9 個檔案，對應 9 種選舉）
│   └── detail/             ← 個別選區的 cunli 級 GeoJSON（點擊後載入）
│       ├── T1-63000-01.json
│       ├── R1-10002010-01.json
│       └── ...
└── tpp/                    ← 既有，不動
    ├── zone.html
    ├── zones.json
    └── ...
```

### 兩層 GeoJSON 策略（解決效能問題）

1. **Overview 層**（`zones/overview/`）
   - **每個選舉類型一個檔案**，包含該類型所有選區的合併 polygon
   - 每個選區是一個 feature，geometry 為 geoPHP union 後的 Polygon/MultiPolygon
   - 用於地圖切換選舉類型時一次載入全部選區概覽
   - 檔名範例：
     - `直轄市議員.json` — 全台所有直轄市議員選區（~80 個 feature）
     - `縣市議員.json` — 全台所有縣市議員選區（~80 個 feature）
     - `鄉鎮市民代表.json` — 全台所有鄉鎮市民代表選區（~638 個 feature）
     - `直轄市市長.json` — 6 個直轄市的 feature
     - `村里長.json` — 只包含有候選人的村里

2. **Detail 層**（`zones/detail/`）
   - 個別選區的完整 cunli 級 GeoJSON
   - 點擊選區後才載入，顯示村里邊界
   - 檔名範例：`T1-63000-01.json`（臺北市第01議員選區的所有村里）

### admin.php 擴充：Generate Zones

新增 `generate_zones` action，流程：

1. 讀取 `data/zones.json`（選區定義：townCodes / villCodes）
2. 讀取 `data/candidates.json`（取得哪些選區有候選人）
3. 對每個有候選人的選區：
   a. 根據選舉類型決定 polygon 來源：
      - 市長/縣長 → COUNTYCODE 匹配
      - 鄉鎮市長/區長 → TOWNCODE 匹配
      - 議員/代表 → zones.json 的 townCodes/villCodes
      - 村里長 → VILLCODE 匹配
   b. 從 `db.cec.gov.tw/data/elections/2026/` 複製對應的 cunli 級 GeoJSON 到 `zones/detail/`
   c. 合併 cunli polygon 為單一 MultiPolygon，寫入 `zones/overview/`
4. 產生 `zones/index.json`：所有選區的清單（code, name, type, 候選人數, centroid）

### 合併 Polygon 方法（geoPHP union）

geoPHP 已安裝在 `/home/kiang/public_html/tainan.olc.tw/scripts/vendor/`，admin.php 直接 require：

```php
require __DIR__ . '/../scripts/vendor/autoload.php';
// 路徑：docs/p/2026/admin.php → scripts/vendor/autoload.php
```

合併流程：
1. 讀取 zone 內所有 cunli feature 的 GeoJSON geometry
2. 用 `geoPHP::load($geojson, 'json')` 解析每個 cunli geometry
3. 逐一 `$union = $union->union($next)` 做真正的幾何聯集
4. 輸出為單一 Polygon 或 MultiPolygon（消除內部邊界，保留外輪廓與真正的洞）
5. `$union->out('json')` 輸出 GeoJSON geometry

這樣 overview 層的每個選區只有一個精簡的 Polygon/MultiPolygon，檔案更小、渲染更快。

### index.html 地圖改造

替換現有全黨派地圖為 TPP 專用：

**互動流程：**
1. 載入 → 顯示台灣全島（county topo），著色顯示各縣市 TPP 提名狀況
2. 選擇選舉類型（dropdown 或 tab）
3. 點擊縣市 → zoom in，載入該縣市的 overview GeoJSON
4. 看到選區 polygon（橘色=有提名，灰色=無提名）
5. 點擊選區 → 載入 detail GeoJSON 顯示村里邊界 + 彈出候選人資訊面板
6. 候選人面板：照片、姓名、政黨、政見、連結到 tpp/zone.html 備戰報告

## 開發步驟

### Phase 1：admin.php — Generate Zones 功能

1. **新增 UI：Generate Zones 按鈕**
   - 在 admin.php 頁面新增 tab 或按鈕
   - 點擊後呼叫 `?action=generate_zones`
   - 顯示產生進度與結果

2. **實作 `generate_zones` API**
   - 掃描 `data/candidates.json`，收集所有涉及的選區
   - 根據選舉類型 + 選區定義，決定需要哪些 cunli
   - 從 `db.cec.gov.tw/data/elections/2026/` 讀取 cunli 級 GeoJSON
   - 對首長（市長/縣長/鄉鎮市長）和村里長類型，直接從 cunli topo 擷取
   - 寫入 `zones/detail/{code}.json`（cunli 級）
   - 合併寫入 `zones/overview/{group}.json`（合併 polygon）
   - 產生 `zones/index.json`

3. **overview polygon 合併邏輯（geoPHP union）**
   - 每個 zone 的所有 cunli geometry → `geoPHP::load()` 解析 → 逐一 `->union()` 合併
   - 產出單一 Polygon/MultiPolygon，消除 cunli 間的內部邊界
   - 附帶 properties：zone code, zone name, 候選人數, centroid
   - **同一選舉類型的所有選區合併到同一個 FeatureCollection 檔案**
     - 例：`zones/overview/直轄市議員.json` 包含全台所有直轄市議員選區（~80 feature）
     - 共產生 9 個 overview 檔案，對應 9 種選舉類型
   - 若 GEOS 未安裝導致 union 結果為 GeometryCollection，fallback 為 MultiPolygon（收集外環）

### Phase 2：index.html 地圖改造

4. **改造 index.html**
   - 移除現有全黨派邏輯
   - 新增選舉類型切換 UI
   - 載入 `zones/index.json` 取得可用選區清單

5. **實作分層載入**
   - 切換選舉類型 → 載入 `zones/overview/{選舉類型}.json`（該類型全部選區，一次載入）
   - 點擊選區 → 載入 `zones/detail/{code}.json`（cunli 級，顯示村里邊界）

6. **著色與互動**
   - 有 TPP 候選人 → 橘色（深淺依候選人數或預估得票）
   - 無候選人 → 淺灰
   - Hover → tooltip（選區名、候選人名）
   - Click → 資訊面板

7. **候選人資訊面板**
   - Modal 或側邊欄
   - 候選人卡片：照片、姓名、政黨、簡介
   - 連結：備戰報告（tpp/zone.html?zone=xxx）
   - 歷史選情摘要（從 tpp/zones.json 讀取）

### Phase 3：完善功能

8. **GPS 定位** — 找到使用者所在選區
9. **搜尋** — 依候選人姓名或選區名搜尋
10. **手機適配** — bottom sheet、觸控優化
11. **自動更新** — admin.php 存檔候選人時自動觸發 generate_zones

## 技術細節

### zones/index.json 格式

```json
{
  "generated": "2026-05-19T12:00:00",
  "types": ["直轄市市長", "直轄市議員", "直轄市山地原住民區區長", "直轄市山地原住民區區民代表",
            "縣市首長", "縣市議員", "鄉鎮市長", "鄉鎮市民代表", "村里長"],
  "counts": {
    "直轄市市長": 2,
    "直轄市議員": 15,
    ...
  }
}
```

每個 overview 檔案（如 `zones/overview/直轄市議員.json`）是一個 FeatureCollection，
每個 feature 的 properties 已包含完整資訊（code, name, candidateCount, centroid），
不需要額外的 zones 清單。地圖切換選舉類型時直接載入對應的 overview 檔即可。

### geoPHP union 注意事項

- geoPHP 的 `union()` 底層依賴 GEOS PHP extension（若有安裝）或 fallback
- 若 GEOS 未安裝，`union()` 可能回退為簡單的 GeometryCollection — 仍可用，只是不會消除內部邊界
- 可用 `geoPHP::geosInstalled()` 檢查
- 若 union 結果不理想，fallback 策略：收集所有 cunli 外環組成 MultiPolygon（不消除邊界但堪用）
- 每個 overview feature 附帶 properties：`{ code, name, type, candidateCount, centroid }`

### 底圖

沿用現有 admin.php 的 NLSC 圖磚：
```
https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}
```
