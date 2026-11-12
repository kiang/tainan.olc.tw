// QR code：給總部觸控機「掃碼帶走」用，也畫進集章卡與測驗結果圖
import { encode } from "../vendor/uqr.js";
import { escapeHTML as h } from "./util.js?v=20261029-3";

const cache = new Map();
function matrix(text) {
  let m = cache.get(text);
  if (!m) {
    m = encode(text, { ecc: "M", border: 0 }).data;
    cache.set(text, m);
  }
  return m;
}

// quiet＝外圍留白的格數；白底一起畫進去，放在任何背景上都掃得到
export function qrSVG(text, { quiet = 2, label = "" } = {}) {
  const data = matrix(text);
  const n = data.length, size = n + quiet * 2;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; ) {
      if (!data[y][x]) { x++; continue; }
      let run = 1;
      while (x + run < n && data[y][x + run]) run++;
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${h(label || "QR code")}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#1f2421"/></svg>`;
}

// 畫進 canvas：每格對齊整數像素，掃描才穩
export function drawQR(g, text, x, y, size, { quiet = 2 } = {}) {
  const data = matrix(text);
  const n = data.length, cells = n + quiet * 2;
  const s = Math.max(1, Math.floor(size / cells));
  const real = s * cells;
  const ox = Math.round(x + (size - real) / 2), oy = Math.round(y + (size - real) / 2);
  g.fillStyle = "#fff";
  g.fillRect(x, y, size, size);
  g.fillStyle = "#1f2421";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (data[r][c]) g.fillRect(ox + (c + quiet) * s, oy + (r + quiet) * s, s, s);
  }
}
