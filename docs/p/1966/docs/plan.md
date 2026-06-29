# 長照機構 ABC 地圖 - 開發計畫

## 資料概覽

### 原始資料 (raw/abc.csv)
- **筆數**: 31,395 筆機構資料
- **座標欄位**: 經度、緯度 (WGS84)
- **關鍵欄位**:
  - `機構名稱` - 機構全名
  - `機構代碼` - 唯一識別碼
  - `機構種類` - 類型代碼 (1=居家式, 2=社區式, 3=機構住宿式, 4=綜合式, A1~A3=老人福利機構, B1~BG=身障機構 等)
  - `O_ABC` - 服務類型分類：
    - **A**: 個案管理服務 (1,050 筆)
    - **B**: 直接照護服務 — 居家服務、日照、喘息、交通接送、營養餐飲、專業照護、小規模多機能等 (26,079 筆)
    - **C**: 巷弄長照站 (4,240 筆)
  - `縣市` / `區` - 行政區代碼 (如 67000=臺南市, 67000010=新營區)
  - `地址全址` - 完整地址
  - `特約服務項目` - 具體服務項目名稱
  - `特約縣市` - 特約服務涵蓋的縣市代碼
  - `特約區域` - 特約服務涵蓋的鄉鎮市區代碼，以分號分隔 (如 `64000010;64000020;64000030`)
  - `特約起日` / `特約迄日` - 特約期間
  - `開放床數` / `現有住民` - 住宿型機構的容量資訊
- **代碼對應**: `特約區域`的代碼與 TopoJSON 的 TOWNCODE 一致，可直接比對高亮

### 行政區界 (TopoJSON)
- **來源**: `https://kiang.github.io/taiwan_basecode/city/topo/20230317.json`
- **格式**: TopoJSON，objects key = `20230317`
- **幾何數量**: 368 個鄉鎮市區
- **屬性**: TOWNCODE, TOWNNAME, COUNTYNAME, COUNTYID, COUNTYCODE
- **代碼系統**: TOWNCODE 與 CSV 的`特約區域`代碼一致 (如 64000010=鹽埕區)

## 技術架構

### 頁面結構
```
docs/p/1966/
├── index.html          # 主頁面
├── js/
│   └── main.js         # 主要邏輯
├── css/
│   └── style.css       # 樣式
├── data/
│   └── points.json     # 預處理後的機構點位資料 (精簡欄位)
├── scripts/
│   └── csv2json.py     # CSV → JSON 預處理腳本
├── og_image.png        # 社群分享預覽圖
├── raw/
│   └── abc.csv         # 原始資料
└── docs/
    └── plan.md         # 本文件
```

### 前端技術
- **地圖**: Leaflet.js (CDN)
- **底圖**: NLSC 國土測繪中心通用版電子地圖 / 正射影像
  - `https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}`
- **行政區界**: TopoJSON → Leaflet GeoJSON layer
  - 使用 topojson-client 將 TopoJSON 轉為 GeoJSON
  - 建立 TOWNCODE → GeoJSON feature 的查找表，用於高亮特約區域
- **標記叢集**: Leaflet.markercluster (CDN) 處理 31K+ 點位效能
- **側邊欄**: 左側篩選面板 + 機構詳情

### 資料預處理 (scripts/)
將 CSV 轉為精簡 JSON，僅保留地圖所需欄位以減少載入量：

```json
[
  {
    "name": "機構名稱",
    "code": "機構代碼",
    "type": "1",
    "city": "67000",
    "town": "67000010",
    "addr": "地址全址",
    "lng": 120.21,
    "lat": 22.98,
    "abc": "B",
    "service": "居家服務",
    "zones": ["64000010", "64000020", "64000030"],
    "phone": "06-1234567",
    "owner": "負責人",
    "start": "20180101",
    "end": "20261231",
    "beds": 0,
    "residents": 0
  }
]
```

重點：`zones` 陣列儲存該機構的特約區域代碼清單，前端用來比對 TopoJSON 的 TOWNCODE 做區域高亮。

## 功能設計

### 1. 地圖呈現
- 預設視角: 台灣全島 (中心約 [23.7, 121.0], zoom=7)
- 底圖切換: NLSC 通用版電子地圖 / 正射影像
- 行政區界: TopoJSON 以淡色邊界繪製，預設低調不搶眼

### 2. 標記顏色
依 O_ABC 服務類型著色：
- **A (綠色)**: 個案管理服務
- **B (藍色)**: 直接照護服務 (居家、日照、喘息等)
- **C (橘色)**: 巷弄長照站

### 3. 特約區域高亮 (核心功能)
- **點擊標記時**: 讀取該機構的 `zones` 陣列，在 TopoJSON 圖層中找到對應的行政區，以高亮色塊標示其服務涵蓋範圍
- **高亮樣式**: 填色半透明 + 加粗邊框，與一般行政區界區分
- **點擊地圖空白處或關閉 popup**: 清除高亮，恢復預設樣式
- **tooltip**: 高亮區域 hover 時顯示區名

### 4. 篩選功能 (側邊欄)
- **依服務類型篩選**: A / B / C 勾選框 (附說明文字)
- **依機構種類篩選**:
  - 居家式 (1)
  - 社區式 (2)
  - 機構住宿式 (3)
  - 綜合式 (4)
  - 老人福利機構 (A1~A3)
  - 身障機構 (B1~BG)
- **依縣市篩選**: 下拉選單
- **關鍵字搜尋**: 搜尋機構名稱

### 5. 互動功能
- **點擊標記**: Popup 顯示機構詳情 (名稱、地址、服務類型、特約服務項目、電話、床位等) + 高亮特約區域
- **Hover 行政區**: tooltip 顯示區名
- **點擊行政區**: 縮放至該區並篩選該區機構
- **叢集**: 使用 markercluster 在低 zoom 層級叢集顯示

### 6. 統計資訊
- 側邊欄頂部顯示目前篩選結果的統計數字
- 各服務類型的數量

## 實作步驟

### Phase 1: 資料預處理
1. 撰寫 `scripts/csv2json.py`，將 CSV → JSON (精簡欄位)
2. 處理座標異常值 (部分資料座標欄位有錯位問題)
3. 將 `特約區域` 欄位拆分為 zones 陣列
4. 輸出 `data/points.json`

### Phase 2: 基礎地圖
1. 建立 index.html 骨架 (引入 Leaflet, markercluster CDN)
2. 載入 NLSC 底圖
3. 載入 TopoJSON 行政區界並繪製，建立 TOWNCODE 查找表
4. 載入點位資料，以 markercluster 顯示

### Phase 3: 互動功能
1. 實作點擊標記 → 高亮特約區域
2. 實作側邊欄篩選 UI
3. 實作 Popup 詳情顯示
4. 實作行政區 hover/click 互動
5. 實作關鍵字搜尋

### Phase 4: 美化與優化
1. 樣式調整 (RWD 支援)
2. 載入效能優化
3. 製作 og_image.png
4. 更新 projects.json 註冊新專案

## CDN 資源

```html
<!-- Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- MarkerCluster -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>

<!-- TopoJSON Client -->
<script src="https://unpkg.com/topojson-client@3/dist/topojson-client.min.js"></script>
```
