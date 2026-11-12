// 集章卡：自己點進一座島（或島上的細項）就蓋一個章，7 座島集滿可以存成「我的台南集章卡」。
// 網頁版記在這台裝置的瀏覽器；總部觸控機只記在記憶體，閒置重置時歸零換下一位。
import { store, mulberry32, hashString, escapeHTML as h } from "./util.js?v=20261029-3";

const KEY = "feifei-island:stamps:v1";
export const FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Heiti TC", sans-serif';

// 章中央的圖案，畫在 24×24 的格子裡，只用線條
const ICONS = {
  technology(g) { // 晶片
    g.strokeRect(6.5, 6.5, 11, 11);
    g.strokeRect(9.5, 9.5, 5, 5);
    for (const v of [9, 12, 15]) {
      line(g, v, 2.5, v, 6.5); line(g, v, 17.5, v, 21.5);
      line(g, 2.5, v, 6.5, v); line(g, 17.5, v, 21.5, v);
    }
  },
  agriculture(g) { // 虱目魚
    g.stroke(new Path2D("M2.5 12.5C5.5 7.5 12 7 17 12.5C12 18 5.5 17.5 2.5 12.5Z"));
    g.stroke(new Path2D("M17 12.5L21.5 8.5V16.5Z"));
    dot(g, 6.6, 11.4, 1);
    g.stroke(new Path2D("M10 9.5C11 11.5 11 13.5 10 15.5"));
  },
  tourism(g) { // 燈節的燈籠
    g.beginPath();
    g.ellipse(12, 12.5, 7.2, 5.3, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeRect(9, 6, 6, 1.6);
    g.strokeRect(9, 17.4, 6, 1.6);
    line(g, 12, 2.5, 12, 6); line(g, 12, 19, 12, 22);
    line(g, 12, 7.6, 12, 17.4);
    g.stroke(new Path2D("M8.7 8.3C7.3 11 7.3 14 8.7 16.7M15.3 8.3C16.7 11 16.7 14 15.3 16.7"));
  },
  welfare(g) { // 愛心
    g.stroke(new Path2D("M12 20C12 20 4 15.2 4 9.6A4.2 4.2 0 0 1 12 7.3A4.2 4.2 0 0 1 20 9.6C20 15.2 12 20 12 20Z"));
    g.stroke(new Path2D("M8.5 11.5H10.5L11.5 9.5L13 13.5L14 11.5H15.5"));
  },
  transport(g) { // 捷運車頭
    g.stroke(new Path2D("M7.5 3.5H16.5A2.5 2.5 0 0 1 19 6V15A3 3 0 0 1 16 18H8A3 3 0 0 1 5 15V6A2.5 2.5 0 0 1 7.5 3.5Z"));
    line(g, 5, 11, 19, 11); line(g, 9.5, 6.5, 14.5, 6.5);
    dot(g, 8.6, 14.6, 1.1); dot(g, 15.4, 14.6, 1.1);
    line(g, 8.5, 21.5, 10, 18); line(g, 15.5, 21.5, 14, 18);
  },
  sister(g) { // 姐姐抱的小熊
    circle(g, 7, 7.2, 2.4); circle(g, 17, 7.2, 2.4);
    circle(g, 12, 13, 7);
    dot(g, 9.4, 11.8, 1); dot(g, 14.6, 11.8, 1);
    g.stroke(new Path2D("M9.8 15.6C10.8 17 13.2 17 14.2 15.6"));
    dot(g, 12, 14.3, 1.1);
  },
};
function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

// 沿著圓弧寫字：top＝上半圈（順時針讀），否則下半圈（由左到右讀，字是正的）
function arcText(g, text, radius, size, top) {
  const chars = [...text];
  const step = (size * 1.12) / radius;
  const span = step * (chars.length - 1);
  g.font = `900 ${size}px ${FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  chars.forEach((ch, i) => {
    const a = top ? -Math.PI / 2 - span / 2 + i * step : Math.PI / 2 + span / 2 - i * step;
    g.save();
    g.translate(Math.cos(a) * radius, Math.sin(a) * radius);
    g.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
  });
}
function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// 一枚章畫在自己的透明畫布上（印泥斑駁用挖洞做，不會挖到底圖）
const stampCache = new Map();
export function stampCanvas(isl, px = 256) {
  const key = isl.id + ":" + px;
  if (stampCache.has(key)) return stampCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const g = c.getContext("2d");
  const r = px / 2;
  const rnd = mulberry32(hashString(isl.id));
  g.translate(r, r);
  g.rotate((rnd() - 0.5) * 0.34);
  g.strokeStyle = g.fillStyle = isl.color;
  g.lineCap = g.lineJoin = "round";
  g.lineWidth = r * 0.075;
  circle(g, 0, 0, r * 0.9);
  g.lineWidth = r * 0.028;
  circle(g, 0, 0, r * 0.66);
  arcText(g, "台南政策島", r * 0.78, r * 0.17, true);
  arcText(g, isl.policy, r * 0.78, r * 0.145, false);
  star(g, -r * 0.78, 0, r * 0.06);
  star(g, r * 0.78, 0, r * 0.06);
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (ICONS[isl.id]) {
    g.save();
    const s = (r * 0.5) / 24;
    g.translate(-12 * s, -r * 0.43);
    g.scale(s, s);
    g.lineWidth = 1.9;
    ICONS[isl.id](g);
    g.restore();
    g.font = `900 ${r * 0.25}px ${FONT}`;
    g.fillText(isl.short, 0, r * 0.32);
  } else {
    g.font = `900 ${r * 0.46}px ${FONT}`;
    g.fillText(isl.badge || "妃", 0, -r * 0.1);
    g.font = `900 ${r * 0.2}px ${FONT}`;
    g.fillText(isl.short, 0, r * 0.38);
  }
  // 印泥不均
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.95;
    g.globalAlpha = 0.25 + rnd() * 0.55;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.008 + rnd() * 0.026), 0, Math.PI * 2);
    g.fill();
  }
  stampCache.set(key, c);
  return c;
}
const urlCache = new Map();
export function stampURL(isl, px = 256) {
  const key = isl.id + ":" + px;
  if (!urlCache.has(key)) urlCache.set(key, stampCanvas(isl, px).toDataURL("image/png"));
  return urlCache.get(key);
}

export function createStamps({ islands, kiosk, onChange }) {
  const byId = new Map(islands.map((i) => [i.id, i]));
  const saved = kiosk ? [] : store.get(KEY, []);
  const got = new Set((Array.isArray(saved) ? saved : []).filter((id) => byId.has(id)));
  const total = islands.length;
  const save = () => { if (!kiosk) store.set(KEY, [...got]); };
  const changed = () => { save(); onChange && onChange(); };

  return {
    total,
    has: (id) => got.has(id),
    get count() { return got.size; },
    get done() { return got.size >= total; },
    // 回傳是不是第一次集到這個章
    collect(id) {
      if (!byId.has(id) || got.has(id)) return false;
      got.add(id);
      changed();
      return true;
    },
    collectAll() {
      for (const id of byId.keys()) got.add(id);
      changed();
    },
    reset() {
      got.clear();
      changed();
    },
    next() { return islands.find((i) => !got.has(i.id)) || null; },
    // 卡片右上角的章（第一次集到時有蓋章動畫）
    markHTML(id, fresh) {
      const isl = byId.get(id);
      if (!isl || !got.has(id)) return "";
      return `<img class="c-stamp${fresh ? " fresh" : ""}" src="${stampURL(isl)}" alt="已集「${h(isl.short)}」章" width="84" height="84">`;
    },
  };
}
