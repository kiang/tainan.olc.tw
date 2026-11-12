// 流量統計（Google Analytics 4）：記錄民眾點了哪座島、測驗結果、集章、分享、LINE 等等。
// data.js 的 analytics.gaId 填上 G- 開頭的評估 ID 才會啟動；沒填就什麼都不送。
// 自動導覽經過的島不計入，只記錄民眾自己點開的島。
import { DATA } from "./data.js?v=20261029-3";

let on = false;
let base = {};

export function initAnalytics({ kiosk }) {
  const id = String(DATA.analytics?.gaId || "").trim();
  if (!/^G-[A-Z0-9]{4,}$/.test(id)) return;
  on = true;
  // 每個事件都帶上版本資料夾與是不是總部觸控機，報表可以分開看
  base = { island_version: location.pathname.split("/")[1] || "island", kiosk: kiosk ? "yes" : "no" };
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, base);
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
}

export function track(name, params = {}) {
  if (!on) return;
  try {
    window.gtag("event", name, { ...base, ...params });
  } catch { /* 統計失敗不影響政策島 */ }
}
