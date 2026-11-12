// 存成圖片：集章卡與測驗結果，1080×1350（IG、LINE 都適合的直式比例）
import { drawQR } from "./qr.js?v=20261029-3";
import { stampCanvas, FONT } from "./stamps.js?v=20261029-3";

const W = 1080, H = 1350;
const GREEN = "#176b38", PINK = "#e04a67", INK = "#1f2421", MUTED = "#5d665f", CREAM = "#fff8f1";

const imgCache = new Map();
// 網路很慢時最多等 5 秒，少一張圖也照樣出圖；沒載到的下次再重抓
export function loadImage(src, ms = 5000) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((resolve) => {
      const img = new Image();
      let timer = 0;
      const done = (v) => {
        clearTimeout(timer);
        if (!v) imgCache.delete(src);
        resolve(v);
      };
      timer = setTimeout(() => done(null), ms);
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = src;
    }));
  }
  return imgCache.get(src);
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
// 中文逐字換行
function wrap(g, text, maxW) {
  const out = [];
  let cur = "";
  for (const ch of text) {
    if (cur && g.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function text(g, str, x, y, { size = 32, weight = 700, color = INK, align = "left" } = {}) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  g.fillText(str, x, y);
}
// 角色圖用色彩增值疊上去，白底會融進米色背景；fade＝底部淡出的比例
function figure(g, img, x, y, h, fade = 0) {
  if (!img) return;
  const w = Math.round((img.width / img.height) * h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cg = c.getContext("2d");
  cg.drawImage(img, 0, 0, w, h);
  if (fade) {
    cg.globalCompositeOperation = "destination-out";
    const gr = cg.createLinearGradient(0, h * (1 - fade), 0, h);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,1)");
    cg.fillStyle = gr;
    cg.fillRect(0, h * (1 - fade), w, h * fade);
  }
  g.save();
  g.globalCompositeOperation = "multiply";
  g.drawImage(c, x, y);
  g.restore();
}

async function base(sub) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = CREAM;
  g.fillRect(0, 0, W, H);
  // 護照內頁的外框
  g.strokeStyle = GREEN;
  g.lineWidth = 5;
  rr(g, 40, 40, W - 80, H - 80, 36);
  g.stroke();
  g.setLineDash([10, 10]);
  g.lineWidth = 2;
  g.strokeStyle = "rgba(23,107,56,.45)";
  rr(g, 58, 58, W - 116, H - 116, 26);
  g.stroke();
  g.setLineDash([]);
  const logo = await loadImage("./img/logo.png");
  if (logo) {
    g.save();
    g.globalCompositeOperation = "multiply";
    g.drawImage(logo, 92, 88, 112, 112);
    g.restore();
  }
  text(g, "台南政策島", 222, 146, { size: 58, weight: 900, color: GREEN });
  text(g, sub, 224, 192, { size: 29, weight: 800, color: PINK });
  return { c, g };
}

function footer(g, url, title, img) {
  const y = 1048;
  g.fillStyle = "#fff";
  rr(g, 90, y, 900, 212, 28);
  g.fill();
  g.strokeStyle = "#e8e1d5";
  g.lineWidth = 2;
  g.stroke();
  drawQR(g, url, 112, y + 18, 176);
  text(g, title, 316, y + 82, { size: 38, weight: 900 });
  text(g, url.replace(/^https?:\/\//, "").replace(/\/$/, ""), 316, y + 130, { size: 25, weight: 800, color: GREEN });
  text(g, "用手機相機掃描 QR code", 316, y + 172, { size: 23, weight: 600, color: MUTED });
  figure(g, img, 790, y - 70, 270, 0.12);
}

// 集章完成卡
export async function stampPoster({ islands, url, date }) {
  const { c, g } = await base("妃妃市長・6 大政策集章卡");
  const flag = await loadImage("./img/pose/flag.jpg");
  const rows = [islands.slice(0, 4), islands.slice(4)];
  rows.forEach((row, ri) => {
    const y = ri === 0 ? 400 : 618;
    const gap = 216, x0 = W / 2 - ((row.length - 1) * gap) / 2;
    row.forEach((isl, i) => g.drawImage(stampCanvas(isl, 420), x0 + i * gap - 102, y - 102, 204, 204));
  });
  text(g, "集章完成！", W / 2, 858, { size: 84, weight: 900, color: PINK, align: "center" });
  text(g, `我走遍了台南政策島的 ${islands.length} 座島`, W / 2, 926, { size: 38, weight: 800, align: "center" });
  text(g, date, W / 2, 978, { size: 28, weight: 700, color: MUTED, align: "center" });
  footer(g, url, "一起來逛台南政策島", flag);
  return c;
}

// 測驗結果
export async function quizPoster({ type, isl, items, url, pose }) {
  const { c, g } = await base("你是哪一種台南人？");
  const img = await loadImage(pose);
  figure(g, img, 640, 236, 400, 0.1);
  text(g, "我是", 92, 300, { size: 44, weight: 800 });
  g.font = `900 100px ${FONT}`;
  const nameSize = g.measureText(type.name).width > 540 ? 80 : 100;
  text(g, type.name, 88, 412, { size: nameSize, weight: 900, color: isl.color });
  // 對應的政策島
  g.font = `800 28px ${FONT}`;
  const chip = `${isl.num} ${isl.policy}`;
  const cw = g.measureText(chip).width + 44;
  g.fillStyle = isl.tint;
  rr(g, 92, 446, cw, 54, 27);
  g.fill();
  text(g, chip, 114, 483, { size: 28, weight: 800, color: isl.color });
  g.font = `600 32px ${FONT}`;
  wrap(g, type.desc, 530).slice(0, 3).forEach((ln, i) => text(g, ln, 92, 568 + i * 48, { size: 32, weight: 600, color: "#4d554f" }));

  text(g, "跟我最有關的 3 項政策", 92, 742, { size: 32, weight: 900, color: GREEN });
  items.forEach((it, i) => {
    const y = 770 + i * 90;
    g.fillStyle = "#fff";
    rr(g, 90, y, 900, 76, 20);
    g.fill();
    g.strokeStyle = "#e8e1d5";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = it.pin;
    g.beginPath();
    g.arc(132, y + 38, 22, 0, Math.PI * 2);
    g.fill();
    text(g, String(i + 1), 132, y + 48, { size: 26, weight: 900, color: "#fff", align: "center" });
    g.font = `800 30px ${FONT}`;
    let n = it.name.length;
    while (n > 4 && g.measureText(it.name.slice(0, n) + (n < it.name.length ? "…" : "")).width > 560) n--;
    text(g, n < it.name.length ? it.name.slice(0, n) + "…" : it.name, 170, y + 49, { size: 30, weight: 800 });
    text(g, it.policy, 968, y + 48, { size: 23, weight: 700, color: MUTED, align: "right" });
  });
  footer(g, url, "你也來測測看", null);
  return c;
}
