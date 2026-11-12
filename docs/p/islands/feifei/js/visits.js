// 來站計數器：早期網頁常見的「您是第 N 位訪客」。
// 數字存在免費的 Abacus 計數服務（不用註冊），每個網域各算各的：feifei-tainan-policy.com 和 yes100.ai 分開。
// 同一個瀏覽器 30 分鐘內重新整理只算一次；總部觸控機不計數也不顯示；服務連不上時整塊不出現。
// data.js 的 visits.show 是 false 時照常計數，只是不顯示。
import { DATA } from "./data.js?v=20261029-3";

const GAP = 30 * 60 * 1000;
const LAST = "feifei-island:visits:last";

function lastVisit() {
  try { return Number(localStorage.getItem(LAST)) || 0; } catch { return 0; }
}
function saveVisit(t) {
  try { localStorage.setItem(LAST, String(t)); } catch { /* 無痕模式：每次都算 */ }
}

// 不設逾時：手機建 3D 場景時會卡住好幾秒，逾時計時器會把已經回來的結果誤判成失敗
async function call(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return { status: r.status };
    const j = await r.json();
    return Number.isFinite(j.value) ? { value: j.value } : {};
  } catch {
    return {};
  }
}

function render(n, since) {
  const digits = String(n).padStart(6, "0");
  const html = `<span class="sr">您是第 ${n} 位訪客</span>
    <span aria-hidden="true">您是第</span>
    <b class="odo" aria-hidden="true">${[...digits].map((d, i) => `<i style="--i:${i}"><span>${d}</span></i>`).join("")}</b>
    <span aria-hidden="true">位訪客</span>
    ${since ? `<small aria-hidden="true">SINCE ${since}</small>` : ""}`;
  document.querySelectorAll(".visits").forEach((el) => {
    el.innerHTML = html;
    el.hidden = false;
  });
}

export async function initVisits({ kiosk }) {
  const cfg = DATA.visits;
  const host = location.hostname.replace(/^www\./, "");
  // 本機測試（localhost、IP 位址）不計數
  if (!cfg?.api || kiosk || !host.includes(".") || /^[\d.]+$/.test(host) || host.length > 64) return;
  const url = (op) => `${cfg.api}/${op}/${host}/${cfg.key}`;
  const now = Date.now();
  const fresh = now - lastVisit() > GAP;
  if (!cfg.show && !fresh) return; // 不顯示時只要計數：30 分鐘內來過就不用再問數字
  let res = await call(url(fresh ? "hit" : "get"));
  let counted = fresh;
  if (!fresh && res.status === 404) {
    res = await call(url("hit")); // 計數器還沒建立或過期了：這次就算一次
    counted = true;
  }
  if (res.value == null) return;
  if (counted) saveVisit(now);
  if (cfg.show) render(res.value, cfg.since);
}
