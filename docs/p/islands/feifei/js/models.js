// 每個細項的小型立體場景模型。單位空間：底面 ±0.5、高 0–1.5，正面朝 +z（鏡頭方向）。
// 模型種類由 data.js 的 model 欄位決定。
import { mulberry32, hashString, mixHex, hexNum } from "./util.js?v=20261029-3";

export const C = {
  coral: 0xdb6a41, ink: 0x2a2523, cream: 0xfff8f4, yellow: 0xfcea8b, stone: 0xc5b5a7, sage: 0x71806a,
  glass: 0x86a8a6, wood: 0xb48560, teal: 0x3e7c8c, wall: 0xf4ebdd, eave: 0xa34e34, win: 0xa8c4c2,
  brick: 0xc46e52, white: 0xf7f3ec, grey: 0xb9b4ad, dark: 0x45403b, red: 0xc8452d, gold: 0xe7b649,
  pink: 0xf08aa2, blue: 0x4f86c6, mint: 0x5fc29a, green: 0x2f8a4f, leaf: 0x8db86f, leaf2: 0x9cc27a,
  leaf3: 0x728f5f, sky: 0x8fd0e6, lilac: 0xb8a6e6, orange: 0xf29a3b, peach: 0xf6c7a4, navy: 0x2f4a7a,
  water: 0x7fc4d8, sand: 0xe9d6b0, salt: 0xf4f6f4, roofGrey: 0x6f7b78, skin: 0xf3cfae,
};
const CASUAL = [0x6f7fb5, 0x58a6a6, 0xe8c547, 0xf2a1a1, 0x8fb37a, 0xb58fd0, 0xf29a3b];
export const RAINBOW = [0xe5484d, 0xf28a2e, 0xf2c230, 0x3aa65c, 0x2f86c9, 0x3f5fb5, 0x8a5cc8];

// ---------- 共用小零件 ----------
function windows(k, x0, x1, y, z, n, opts = {}) {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    k.box(x0 + w * (i + 0.5), y, z, w * 0.55, opts.h ?? 0.07, 0.012, opts.color ?? C.win, { glow: true, ry: opts.ry || 0 });
  }
}
function windowsSide(k, z0, z1, y, x, n, opts = {}) {
  const w = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    k.box(x, y, z0 + w * (i + 0.5), 0.012, opts.h ?? 0.07, w * 0.55, opts.color ?? C.win, { glow: true });
  }
}
export function mini(k, x, z, color, opts = {}) {
  // 迷你人（模型裡的比例尺）
  const s = opts.s ?? 1;
  k.cyl(x, 0, z, 0.034 * s, 0.085 * s, color, { small: true });
  k.sphere(x, 0.115 * s, z, 0.036 * s, opts.skin ?? C.skin, { small: true });
  k.sphere(x, 0.128 * s, z - 0.006 * s, 0.033 * s, opts.hair ?? 0x3a2c26, { small: true, sy: 0.026 * s });
  if (opts.hat) k.cone(x, 0.14 * s, z, 0.06 * s, 0.035 * s, opts.hat, { small: true });
}
export function bush(k, x, z, r, color = C.leaf) {
  k.ico(x, r * 0.8, z, r, color, { small: true });
}
export function smallTree(k, x, z, s = 1, color = C.leaf) {
  k.cyl(x, 0, z, 0.025 * s, 0.18 * s, C.wood);
  k.ico(x, 0.24 * s, z, 0.12 * s, color);
}
function crate(k, x, y, z, s, fruit) {
  k.box(x, y, z, s, s * 0.6, s * 0.8, C.wood, { small: true });
  for (let i = 0; i < 3; i++) k.sphere(x - s * 0.3 + i * s * 0.3, y + s * 0.62, z, s * 0.16, fruit, { small: true });
}
function flowerBed(k, x, z, w, d, colors) {
  k.box(x, 0, z, w, 0.04, d, 0x9a7a5c);
  const n = Math.max(3, Math.round(w / 0.07));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) {
      k.sphere(x - w / 2 + (i + 0.5) * (w / n), 0.065, z - d / 4 + j * (d / 2), 0.026, colors[(i + j) % colors.length], { small: true });
    }
  }
}
function hipHouse(k, x, z, w, d, h, wall, roof, opts = {}) {
  k.box(x, 0, z, w, h, d, wall);
  k.box(x, h, z, w + 0.05, 0.025, d + 0.05, opts.eave ?? C.eave);
  k.hip(x, h + 0.02, z, w * 1.02, opts.roofH ?? 0.18, d * 1.02, roof);
  windows(k, x - w / 2 + 0.04, x + w / 2 - 0.04, h * 0.55, z + d / 2 + 0.006, Math.max(1, Math.round(w / 0.16)));
  if (opts.door !== false) k.box(x, 0, z + d / 2 + 0.004, 0.07, Math.min(0.13, h * 0.5), 0.012, C.dark);
}
function gableHouse(k, x, z, w, d, h, wall, roof, opts = {}) {
  k.box(x, 0, z, w, h, d, wall);
  k.gable(x, h, z, w * 1.12, opts.roofH ?? 0.16, d * 1.08, roof, { ry: opts.ridgeX ? Math.PI / 2 : 0 });
  windows(k, x - w / 2 + 0.03, x + w / 2 - 0.03, h * 0.55, z + d / 2 + 0.006, Math.max(1, Math.round(w / 0.17)));
}
function bike(k, x, z, ry, color) {
  k.begin([x, 0, z], ry, 1);
  k.torus(-0.07, 0.05, 0, 0.045, 0x2a2a2a, { rz: Math.PI / 2, small: true });
  k.torus(0.07, 0.05, 0, 0.045, 0x2a2a2a, { rz: Math.PI / 2, small: true });
  k.rod([-0.07, 0.05, 0], [0.0, 0.1, 0], 0.008, color, { small: true });
  k.rod([0.07, 0.05, 0], [0.0, 0.1, 0], 0.008, color, { small: true });
  k.rod([0.0, 0.1, 0], [0.06, 0.12, 0], 0.008, color, { small: true });
  k.end();
}
function car(k, x, y, z, ry, color) {
  k.begin([x, y, z], ry, 1);
  k.rbox(0, 0.01, 0, 0.09, 0.045, 0.16, color, { small: true });
  k.rbox(0, 0.05, -0.01, 0.075, 0.035, 0.085, mixHex(color, 0xffffff, 0.5), { small: true });
  k.end();
}
function train(k, x, y, z, ry, cars, color, stripe = C.white) {
  k.begin([x, y, z], ry, 1);
  for (let i = 0; i < cars; i++) {
    const zz = (i - (cars - 1) / 2) * 0.2;
    k.rbox(0, 0, zz, 0.12, 0.11, 0.19, color);
    k.box(0, 0.045, zz, 0.124, 0.02, 0.17, stripe);
    k.box(0.062, 0.07, zz, 0.006, 0.03, 0.14, C.win, { glow: true });
    k.box(-0.062, 0.07, zz, 0.006, 0.03, 0.14, C.win, { glow: true });
  }
  k.end();
}
function track(k, x0, z0, x1, z1, y, color = 0x8a7f74) {
  k.rod([x0, y, z0], [x1, y, z1], 0.012, color, { box: true });
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.06));
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    k.box(x0 + (x1 - x0) * t, y - 0.006, z0 + (z1 - z0) * t, 0.1, 0.01, 0.02, C.wood, { ry: yaw, small: true });
  }
}
function tiltedPanel(k, x, z, w, d, ry) {
  k.box(x, 0, z, 0.02, 0.07, 0.02, C.grey, { small: true });
  k.box(x, 0.07, z, w, 0.016, d, 0x2d4a73, { rx: -0.45, ry });
  k.box(x, 0.078, z + 0.004, w * 0.92, 0.003, d * 0.9, 0x5f87b8, { rx: -0.45, ry, glow: false });
}

// ---------- 模型目錄 ----------
const M = {};

// ===== 一個大台南 =====
M.cityhall = (k, P) => {
  k.box(0, 0, 0, 0.98, 0.06, 0.72, C.stone);
  k.box(0, 0.06, -0.05, 0.9, 0.34, 0.5, C.wall);
  k.box(0, 0.4, -0.05, 0.94, 0.03, 0.54, P.color);
  k.box(0, 0.43, -0.08, 0.62, 0.2, 0.36, C.cream);
  k.box(0, 0.63, -0.08, 0.66, 0.025, 0.4, P.color);
  windows(k, -0.42, 0.42, 0.18, 0.205, 7);
  windows(k, -0.42, 0.42, 0.3, 0.205, 7);
  windows(k, -0.28, 0.28, 0.52, 0.105, 4);
  // 中央塔與時鐘
  k.box(0, 0.63, -0.1, 0.2, 0.42, 0.2, C.cream);
  k.cyl(0, 0.86, 0.0, 0.055, 0.012, C.white, { rx: Math.PI / 2 });
  k.box(0, 1.05, -0.1, 0.24, 0.03, 0.24, P.color);
  k.hip(0, 1.08, -0.1, 0.24, 0.2, 0.24, C.green);
  k.sphere(0, 1.3, -0.1, 0.03, C.gold);
  // 柱廊與階梯
  for (let i = 0; i < 6; i++) k.cyl(-0.3 + i * 0.12, 0.06, 0.24, 0.022, 0.32, C.white);
  k.box(0, 0.38, 0.24, 0.72, 0.03, 0.06, C.white);
  for (let s = 0; s < 3; s++) k.box(0, s * 0.02, 0.31 + s * 0.03, 0.5 - s * 0.04, 0.02, 0.05, C.stone);
  // 旗桿
  for (const x of [-0.42, 0.42]) {
    k.cyl(x, 0.06, 0.3, 0.008, 0.55, C.grey, { small: true });
    k.box(x + 0.05, 0.5, 0.3, 0.09, 0.06, 0.006, x < 0 ? C.green : C.pink, { small: true });
  }
  bush(k, -0.4, 0.15, 0.05); bush(k, 0.4, 0.15, 0.05);
};

M.riverbridge = (k, P) => {
  k.box(0, 0, 0, 0.96, 0.03, 0.9, 0xb9cf8a);
  k.box(0, 0.03, 0, 0.98, 0.012, 0.28, C.water, { ry: 0.1 });
  // 拱橋
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const z = -0.3 + 0.6 * t;
    k.box(0, 0.05 + Math.sin(t * Math.PI) * 0.14, z, 0.2, 0.03, 0.075, C.coral);
  }
  for (const x of [-0.1, 0.1]) k.cyl(x, 0.03, 0, 0.01, 0.2, C.eave, { small: true });
  // 溪北（綠）與溪南（粉）兩座小亭
  for (const [z, col] of [[-0.34, C.green], [0.34, C.pink]]) {
    for (const x of [-0.32, -0.18]) k.cyl(x, 0.03, z, 0.012, 0.16, C.wood, { small: true });
    k.hip(-0.25, 0.19, z, 0.22, 0.1, 0.14, col);
    smallTree(k, 0.3, z, 0.9, P.tree === "phoenix" ? 0xe5643f : C.leaf);
  }
  mini(k, 0.02, -0.12, CASUAL[1]);
  mini(k, -0.02, 0.12, CASUAL[3]);
};

M.map37 = (k, P) => {
  k.rbox(0, 0, 0, 0.92, 0.1, 0.8, C.stone);
  k.rbox(0, 0.1, 0, 0.84, 0.03, 0.72, C.cream);
  // 37 個六角格，拼成上窄下寬的大台南
  const rnd = mulberry32(37);
  const cells = [];
  const rows = [3, 4, 5, 6, 6, 5, 4, 4];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) cells.push([(i - (n - 1) / 2) * 0.095 + (r % 2) * 0.02, -0.3 + r * 0.085]);
  });
  cells.slice(0, 37).forEach(([x, z], i) => {
    const h = 0.03 + rnd() * 0.06;
    const col = i === 18 ? C.pink : i < 15 ? mixHex(C.green, 0xffffff, 0.35 + rnd() * 0.3) : mixHex(P.color, 0xffffff, 0.45 + rnd() * 0.3);
    k.cyl(x, 0.13, z, 0.045, h, col, { hex: true });
  });
  // 曾文溪
  k.box(0, 0.135, -0.05, 0.7, 0.012, 0.02, C.water, { ry: 0.08 });
  mini(k, 0.38, 0.32, CASUAL[0]);
};

M.baton = (k, P) => {
  k.rbox(0, 0, 0, 0.62, 0.12, 0.62, C.stone);
  k.cyl(0, 0.12, 0, 0.24, 0.1, C.cream, { hex: true });
  // 傾斜的接力棒
  k.begin([0, 0.26, 0], 0, 1);
  k.cyl(0, 0, 0, 0.075, 0.95, C.pink, { rz: -0.55, rx: 0.15 });
  k.end();
  k.torus(0.07, 0.36, 0.0, 0.08, C.gold, { rz: -0.55, small: true });
  // 400 年：三顆金球
  for (let i = 0; i < 3; i++) k.sphere(-0.18 + i * 0.18, 0.24, 0.25, 0.04, C.gold);
  // 綠色小旗
  k.cyl(-0.24, 0.22, -0.18, 0.008, 0.42, C.grey, { small: true });
  k.box(-0.19, 0.55, -0.18, 0.1, 0.07, 0.006, C.green, { small: true });
  flowerBed(k, 0, 0.42, 0.6, 0.1, [C.pink, C.yellow, 0xffffff]);
};

// ===== 01 科技 =====
M.greenhouse = (k, P) => {
  for (let i = 0; i < 3; i++) {
    const x = -0.3 + i * 0.3;
    k.box(x, 0, -0.12, 0.26, 0.18, 0.5, 0xcfe7e2);
    k.gable(x, 0.18, -0.12, 0.27, 0.14, 0.5, 0xb9ddd6, { ry: Math.PI / 2 * 0 });
    for (let j = 0; j < 4; j++) k.box(x, 0.0, -0.32 + j * 0.13, 0.27, 0.32, 0.01, 0xe9f4f1, { small: true });
  }
  flowerBed(k, -0.2, 0.3, 0.42, 0.14, [C.pink, 0xf6d04d, 0xb77ad8, 0xff8b6b]);
  flowerBed(k, 0.25, 0.3, 0.32, 0.14, [0xf6d04d, C.pink, 0xffffff]);
  k.box(0.38, 0, 0.12, 0.14, 0.12, 0.14, C.white);
  k.box(0.38, 0.12, 0.12, 0.15, 0.015, 0.15, P.color);
  mini(k, 0.05, 0.12, C.white, { hat: 0xf6d04d });
};

M.fab = (k, P) => {
  k.box(0, 0, -0.08, 0.98, 0.34, 0.6, C.white);
  k.box(0, 0.16, 0.222, 0.98, 0.04, 0.006, 0x3e8fd0);
  k.box(0, 0.34, -0.08, 0.98, 0.02, 0.6, C.grey);
  windows(k, -0.45, 0.45, 0.25, 0.224, 9, { h: 0.035, color: 0x9fd2e9 });
  // 屋頂設備
  for (let i = 0; i < 4; i++) k.box(-0.34 + i * 0.22, 0.36, -0.12, 0.14, 0.08, 0.22, 0xd9dcdc);
  for (const x of [0.32, 0.42]) k.cyl(x, 0.36, -0.3, 0.035, 0.42, 0xe7e9ea);
  k.cyl(-0.42, 0.36, -0.3, 0.06, 0.12, 0x9aa3a8);
  // 前方晶片雕塑
  k.rbox(-0.12, 0, 0.36, 0.26, 0.06, 0.2, C.ink);
  k.box(-0.12, 0.06, 0.36, 0.14, 0.012, 0.1, 0x3a8f63, { glow: true });
  for (let i = 0; i < 5; i++) {
    k.box(-0.22 + i * 0.05, 0.02, 0.47, 0.018, 0.02, 0.03, C.gold, { small: true });
    k.box(-0.22 + i * 0.05, 0.02, 0.25, 0.018, 0.02, 0.03, C.gold, { small: true });
  }
  k.box(0.28, 0, 0.36, 0.3, 0.012, 0.16, 0x9a9a9a);
  mini(k, 0.22, 0.33, C.white, { hat: C.white });
  mini(k, 0.34, 0.38, C.white, { hat: C.white });
};

M.solar = (k, P) => {
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) tiltedPanel(k, -0.3 + c * 0.22, -0.28 + r * 0.2, 0.19, 0.13, 0);
  // 儲能貨櫃
  for (let i = 0; i < 2; i++) {
    k.rbox(0.3, 0, -0.26 + i * 0.2, 0.26, 0.13, 0.14, i ? C.teal : 0x58a6a6);
    k.box(0.3, 0.04, -0.188 + i * 0.2, 0.2, 0.02, 0.006, C.yellow, { glow: true, small: true });
  }
  // 風機
  k.cyl(-0.38, 0, 0.28, 0.018, 0.72, C.white);
  for (let b = 0; b < 3; b++) k.box(-0.38, 0.72, 0.3, 0.025, 0.28, 0.01, C.white, { rz: b * 2.094, small: true });
  k.sphere(-0.38, 0.72, 0.3, 0.025, C.white);
  // AI 運算中心
  k.box(0.06, 0, 0.28, 0.42, 0.22, 0.22, 0x2f3b45);
  for (let i = 0; i < 5; i++) k.box(-0.1 + i * 0.08, 0.06, 0.392, 0.03, 0.12, 0.006, 0x58e0a6, { glow: true });
  k.box(0.06, 0.22, 0.28, 0.44, 0.02, 0.24, P.color);
};

M.medtech = (k, P) => {
  k.box(-0.1, 0, -0.1, 0.62, 0.36, 0.42, C.white);
  k.box(-0.1, 0.36, -0.1, 0.64, 0.02, 0.44, 0x9fd2e9);
  windows(k, -0.38, 0.18, 0.12, 0.112, 4);
  windows(k, -0.38, 0.18, 0.25, 0.112, 4);
  // 十字標誌
  k.box(-0.1, 0.44, 0.11, 0.16, 0.05, 0.02, P.color);
  k.box(-0.1, 0.395, 0.11, 0.05, 0.14, 0.02, P.color);
  // DNA 雙螺旋雕塑
  for (let i = 0; i < 12; i++) {
    const a = i * 0.62, y = 0.06 + i * 0.07;
    k.sphere(0.33 + Math.cos(a) * 0.07, y, 0.22 + Math.sin(a) * 0.07, 0.022, C.mint, { small: true });
    k.sphere(0.33 - Math.cos(a) * 0.07, y, 0.22 - Math.sin(a) * 0.07, 0.022, C.sky, { small: true });
  }
  k.cyl(0.33, 0, 0.22, 0.1, 0.05, C.stone);
  mini(k, -0.2, 0.28, C.white);
  mini(k, 0.05, 0.3, CASUAL[1]);
};

M.corridor = (k, P) => {
  k.box(0, 0, 0, 0.96, 0.03, 0.86, 0xdfe7df);
  const nodes = [[-0.32, -0.25, C.leaf], [0.05, 0.02, 0x3e8fd0], [0.34, 0.3, C.yellow]];
  nodes.forEach(([x, z, col], i) => {
    k.cyl(x, 0.03, z, 0.09, 0.08, C.white, { hex: true });
    k.cyl(x, 0.11, z, 0.02, 0.3 + i * 0.05, C.grey);
    k.sphere(x, 0.45 + i * 0.05, z, 0.07, col, { glow: true });
  });
  for (let i = 0; i < 2; i++) {
    const a = nodes[i], b = nodes[i + 1];
    k.rod([a[0], 0.45 + i * 0.05, a[1]], [b[0], 0.5 + i * 0.05, b[1]], 0.014, 0x58e0a6, { glow: true });
  }
  // 周邊工業區：小工廠
  for (const [x, z] of [[0.3, -0.25], [-0.32, 0.25], [0.4, 0.0], [-0.05, -0.32]]) {
    k.box(x, 0.03, z, 0.14, 0.09, 0.1, C.white);
    k.gable(x, 0.12, z, 0.15, 0.05, 0.1, C.grey);
    k.cyl(x + 0.05, 0.03, z - 0.03, 0.012, 0.16, C.grey, { small: true });
  }
};

// ===== 02 農漁 =====
M.dashboard = (k, P) => {
  k.box(0, 0, -0.05, 0.08, 0.3, 0.08, C.grey);
  k.rbox(0, 0.28, -0.05, 0.7, 0.42, 0.06, C.ink);
  k.box(0, 0.31, -0.017, 0.64, 0.36, 0.006, 0x203a33, { glow: true });
  const bars = [0.12, 0.2, 0.16, 0.26, 0.22];
  bars.forEach((h, i) => k.box(-0.24 + i * 0.09, 0.35, -0.01, 0.05, h, 0.008, [C.leaf, C.yellow, C.orange, C.mint, C.sky][i], { glow: true }));
  k.sphere(0.25, 0.58, -0.01, 0.045, C.yellow, { glow: true });
  // 稻田
  k.box(0, 0, 0.3, 0.9, 0.025, 0.3, 0x8fb35f);
  for (let i = 0; i < 6; i++) k.box(-0.38 + i * 0.15, 0.025, 0.3, 0.05, 0.04, 0.26, 0xb6cf6a, { small: true });
  mini(k, -0.3, 0.08, CASUAL[4], { hat: 0xe8d39a });
};

M.alert = (k, P) => {
  // 巨型手機（i-PLANT）
  k.rbox(-0.12, 0, -0.05, 0.36, 0.62, 0.07, C.ink);
  k.box(-0.12, 0.06, -0.012, 0.3, 0.5, 0.006, 0x2c6e4f, { glow: true });
  k.ico(-0.12, 0.32, 0.0, 0.07, C.leaf2, { glow: true, sy: 0.09, sz: 0.02 });
  k.box(-0.12, 0.13, 0.0, 0.18, 0.04, 0.006, C.yellow, { glow: true, small: true });
  // 雨雲與警示燈
  for (const [x, y] of [[0.22, 0.7], [0.32, 0.74], [0.4, 0.69]]) k.sphere(x, y, -0.1, 0.07, 0xc9d2da);
  for (let i = 0; i < 5; i++) k.rod([0.18 + i * 0.06, 0.6, -0.1], [0.16 + i * 0.06, 0.48, -0.08], 0.006, C.sky, { small: true });
  k.cyl(0.32, 0, 0.25, 0.02, 0.34, C.grey);
  k.sphere(0.32, 0.36, 0.25, 0.05, 0xf2554f, { glow: true });
  mini(k, 0.1, 0.32, CASUAL[0], { hat: 0xe8d39a });
};

M.coldchain = (k, P) => {
  // 冷鏈加工中心（主建物）
  k.box(0, 0, -0.12, 0.9, 0.36, 0.5, 0xeaf3f6);
  k.box(0, 0.36, -0.12, 0.94, 0.03, 0.54, 0x5da7c9);
  k.gable(0, 0.39, -0.12, 0.92, 0.12, 0.52, 0xd3e6ee, { ry: Math.PI / 2 });
  for (let i = 0; i < 3; i++) k.box(-0.28 + i * 0.28, 0, 0.135, 0.18, 0.22, 0.012, 0x9fb7c2);
  // 雪花標誌
  for (let a = 0; a < 3; a++) k.box(0.3, 0.27, 0.14, 0.012, 0.12, 0.006, C.white, { rz: a * 1.047, small: true });
  // 冷藏車
  k.box(-0.2, 0.02, 0.36, 0.18, 0.15, 0.26, C.white);
  k.box(-0.2, 0.02, 0.52, 0.17, 0.12, 0.08, P.color);
  for (const z of [0.3, 0.48]) for (const x of [-0.29, -0.11]) k.cyl(x, 0.0, z, 0.03, 0.02, C.ink, { rz: Math.PI / 2, small: true });
  crate(k, 0.15, 0, 0.32, 0.12, C.orange);
  crate(k, 0.32, 0, 0.32, 0.12, 0x9ad06a);
  crate(k, 0.24, 0.08, 0.32, 0.12, C.orange);
  mini(k, 0.05, 0.42, CASUAL[2]);
};

M.market = (k, P) => {
  for (let i = 0; i < 3; i++) {
    const x = -0.3 + i * 0.3;
    k.box(x, 0, -0.05, 0.24, 0.1, 0.18, C.wood);
    for (const dx of [-0.11, 0.11]) k.cyl(x + dx, 0.1, -0.13, 0.008, 0.2, C.grey, { small: true });
    // 條紋遮陽棚
    for (let s = 0; s < 4; s++) k.box(x - 0.09 + s * 0.06, 0.3, -0.05, 0.06, 0.015, 0.24, s % 2 ? C.white : [C.coral, P.color, C.orange][i], { rx: 0.25 });
    crate(k, x - 0.05, 0.1, -0.02, 0.08, [C.orange, 0x9ad06a, 0xf2d27a][i]);
    crate(k, x + 0.06, 0.1, -0.02, 0.08, [0xf2d27a, C.orange, 0x9ad06a][i]);
  }
  // 品牌招牌
  k.rbox(0, 0, 0.3, 0.5, 0.05, 0.12, C.cream);
  k.box(0, 0.05, 0.3, 0.06, 0.24, 0.04, C.wood);
  k.rbox(0, 0.28, 0.3, 0.4, 0.13, 0.04, P.color);
  k.box(0, 0.31, 0.322, 0.3, 0.06, 0.006, C.yellow, { glow: true });
  mini(k, -0.32, 0.26, CASUAL[5]);
  mini(k, 0.34, 0.24, CASUAL[3]);
};

M.export = (k, P) => {
  k.box(0, 0, 0, 0.98, 0.02, 0.92, C.water);
  // 貨輪
  k.begin([0.02, 0.01, -0.05], 0.25, 1);
  k.rbox(0, 0, 0, 0.72, 0.12, 0.2, C.navy);
  k.box(0, 0.1, 0, 0.72, 0.02, 0.2, C.red);
  const cc = [C.orange, C.mint, C.coral, C.sky, C.yellow, P.color];
  for (let i = 0; i < 6; i++) k.box(-0.24 + (i % 3) * 0.13, 0.12 + Math.floor(i / 3) * 0.07, 0, 0.12, 0.065, 0.16, cc[i]);
  k.box(0.28, 0.12, 0, 0.1, 0.16, 0.14, C.white);
  windows(k, 0.24, 0.32, 0.22, 0.072, 2, { h: 0.03 });
  k.end();
  // 碼頭與芒果箱
  k.box(-0.15, 0, 0.36, 0.6, 0.08, 0.16, C.wood);
  crate(k, -0.32, 0.08, 0.36, 0.1, C.orange);
  crate(k, -0.18, 0.08, 0.36, 0.1, 0x9ad06a);
  crate(k, -0.04, 0.08, 0.36, 0.1, 0xf5e6b8);
};

M.farmhouse = (k, P) => {
  // 三合院
  k.box(0, 0, -0.25, 0.62, 0.2, 0.18, C.brick);
  k.gable(0, 0.2, -0.25, 0.7, 0.12, 0.22, 0x9a4b3a, { ry: Math.PI / 2 });
  for (const x of [-0.33, 0.33]) {
    k.box(x, 0, -0.02, 0.16, 0.16, 0.32, C.brick);
    k.gable(x, 0.16, -0.02, 0.2, 0.1, 0.36, 0x9a4b3a);
  }
  k.box(0, 0, -0.152, 0.1, 0.13, 0.012, C.dark);
  windows(k, -0.24, 0.24, 0.1, -0.157, 2);
  k.box(0, 0, 0.0, 0.42, 0.012, 0.28, 0xd9c7a8);
  // 前方田與小農機
  k.box(0, 0, 0.36, 0.9, 0.025, 0.2, 0x8fb35f);
  for (let i = 0; i < 6; i++) k.box(-0.38 + i * 0.15, 0.025, 0.36, 0.05, 0.05, 0.16, 0xa9cc63, { small: true });
  k.rbox(0.3, 0.01, 0.1, 0.12, 0.09, 0.08, 0xd9483b);
  k.cyl(0.26, 0.0, 0.1, 0.04, 0.02, C.ink, { rz: Math.PI / 2, small: true });
  mini(k, -0.05, 0.08, CASUAL[1], { hat: 0xe8d39a });
  mini(k, 0.1, 0.12, CASUAL[4]);
};

M.shield = (k, P) => {
  k.rbox(0, 0, 0, 0.6, 0.1, 0.5, C.stone);
  // 大盾牌
  k.rbox(-0.06, 0.1, -0.05, 0.36, 0.42, 0.08, P.color);
  k.cone(-0.06, 0.08, -0.05, 0.18, 0.12, P.color, { rx: Math.PI, sy: 0.1 });
  k.rbox(-0.06, 0.26, -0.005, 0.12, 0.12, 0.02, C.yellow);
  // 三個小盾（三保）＋金幣（一金）
  for (let i = 0; i < 3; i++) k.rbox(-0.26 + i * 0.2, 0.1, 0.18, 0.1, 0.12, 0.04, [C.mint, C.sky, C.peach][i]);
  for (let i = 0; i < 4; i++) k.cyl(0.22, 0.1 + i * 0.03, -0.12, 0.06, 0.026, C.gold);
  mini(k, 0.3, 0.2, CASUAL[0], { hat: 0xe8d39a });
};

// ===== 03 觀光 =====
M.signpost = (k, P) => {
  k.cyl(0, 0, 0, 0.16, 0.06, C.stone, { hex: true });
  k.cyl(0, 0.06, 0, 0.022, 0.9, C.wood);
  const cols = [C.leaf, 0x3e8fd0, C.sky, C.orange, P.color];
  cols.forEach((col, i) => {
    const ry = -1.1 + i * 0.55;
    k.begin([0, 0.3 + i * 0.12, 0], ry, 1);
    k.box(0.12, 0, 0, 0.22, 0.07, 0.02, col);
    k.cone(0.25, -0.0, 0, 0.045, 0.06, col, { rz: -Math.PI / 2 });
    k.end();
  });
  k.sphere(0, 0.98, 0, 0.04, C.gold);
  flowerBed(k, 0, 0.32, 0.5, 0.12, [C.pink, C.yellow, 0xffffff]);
};

M.tower = (k, P) => {
  // 府城：紅磚台基上的雙樓閣（赤崁樓意象）
  k.box(-0.08, 0, -0.12, 0.7, 0.14, 0.52, C.brick);
  for (let s = 0; s < 3; s++) k.box(-0.08, s * 0.045, 0.16 + s * 0.035, 0.24 - s * 0.03, 0.045, 0.05, 0xb85e45);
  for (const x of [-0.27, 0.11]) {
    k.box(x, 0.14, -0.16, 0.26, 0.2, 0.26, 0xc4503c);
    for (const dx of [-0.11, 0.11]) for (const dz of [-0.11, 0.11]) k.cyl(x + dx, 0.14, -0.16 + dz, 0.012, 0.2, 0x8a2e24, { small: true });
    k.box(x, 0.34, -0.16, 0.34, 0.02, 0.34, 0x4b5a55);
    k.hip(x, 0.35, -0.16, 0.34, 0.1, 0.34, 0x56645e);
    k.box(x, 0.45, -0.16, 0.18, 0.12, 0.18, 0xc4503c);
    k.hip(x, 0.57, -0.16, 0.24, 0.14, 0.24, 0x56645e);
    k.box(x, 0.71, -0.16, 0.012, 0.04, 0.2, 0x3e4945);
  }
  // 林百貨意象：五層圓角洋樓
  k.rbox(0.36, 0, 0.02, 0.24, 0.6, 0.3, 0xf1e3c8);
  for (let f = 0; f < 4; f++) windowsSide(k, -0.1, 0.14, 0.08 + f * 0.13, 0.481, 2, { h: 0.05 });
  for (let f = 0; f < 4; f++) windows(k, 0.27, 0.45, 0.08 + f * 0.13, 0.173, 2, { h: 0.05 });
  k.box(0.36, 0.6, 0.02, 0.18, 0.06, 0.2, 0xe7d4b3);
  k.cyl(0.36, 0.66, 0.02, 0.006, 0.2, C.grey, { small: true });
  k.box(0.4, 0.8, 0.02, 0.08, 0.05, 0.005, C.red, { small: true });
  mini(k, -0.32, 0.36, CASUAL[0]);
  mini(k, 0.05, 0.38, CASUAL[3]);
  smallTree(k, 0.42, 0.38, 0.9, 0xe5643f);
};

M.lantern = (k, P) => {
  // 月津港：水面上的藝術燈
  k.box(0, 0, -0.18, 0.96, 0.012, 0.44, C.water);
  const cols = [0xffb347, 0xff7a8a, 0xffe066, 0x8fd3ff, 0xc39bff];
  for (let i = 0; i < 5; i++) {
    const x = -0.36 + i * 0.18, z = -0.2 + (i % 2) * 0.12;
    k.cyl(x, 0.01, z, 0.008, 0.24, C.dark, { small: true });
    k.sphere(x, 0.3, z, 0.06, cols[i], { glow: true, sy: 0.075 });
  }
  k.ico(0.0, 0.18, -0.26, 0.12, 0xffd27a, { glow: true });
  // 新化老街：巴洛克立面
  for (let i = 0; i < 3; i++) {
    const x = -0.3 + i * 0.3;
    k.box(x, 0, 0.26, 0.26, 0.28, 0.2, [0xf3e4cc, 0xeed7c0, 0xf6ead6][i]);
    k.box(x, 0.28, 0.355, 0.24, 0.08, 0.02, 0xe8d2b5);
    k.cyl(x, 0.34, 0.355, 0.05, 0.02, 0xe8d2b5, { rx: Math.PI / 2 });
    k.box(x, 0.0, 0.362, 0.08, 0.13, 0.008, C.dark);
    windows(k, x - 0.1, x + 0.1, 0.19, 0.362, 2);
  }
};

M.badland = (k, P) => {
  // 月世界泥岩
  const rnd = mulberry32(88);
  for (let i = 0; i < 6; i++) {
    const x = -0.36 + (i % 3) * 0.2 + rnd() * 0.05, z = -0.28 + Math.floor(i / 3) * 0.2;
    k.cone(x, 0, z, 0.12 + rnd() * 0.05, 0.26 + rnd() * 0.22, mixHex(0xb3ab9c, 0xd2cabb, rnd()));
  }
  // 一線天
  k.box(0.22, 0, -0.18, 0.12, 0.62, 0.3, 0x9c8f7c);
  k.box(0.38, 0, -0.18, 0.12, 0.58, 0.3, 0xa89a85);
  // 彩疊山：層層色帶
  const layers = [0xd88a6a, 0xe8c27a, 0xb9c98a, 0xd4a6c8, 0xe9d6b0];
  layers.forEach((c, i) => k.cyl(-0.18, i * 0.05, 0.28, 0.24 - i * 0.04, 0.05, c));
  k.cyl(0.25, 0, 0.3, 0.012, 0.18, C.wood, { small: true });
  k.box(0.25, 0.15, 0.3, 0.12, 0.06, 0.01, C.cream, { small: true });
  mini(k, 0.05, 0.36, CASUAL[2]);
};

M.saltfield = (k, P) => {
  k.box(0, 0, 0, 0.98, 0.012, 0.9, 0xa8d8dc);
  // 青鯤鯓扇形鹽田
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + i * 0.22;
    k.box(Math.sin(a) * 0.28 - 0.08, 0.012, Math.cos(a) * 0.28 - 0.32, 0.07, 0.012, 0.42, i % 2 ? C.salt : 0x9fd6e0, { ry: a });
  }
  k.cone(-0.32, 0.012, -0.26, 0.09, 0.12, C.salt);
  // 四草綠色隧道：小船穿過紅樹林拱廊
  for (let i = 0; i < 4; i++) {
    const z = 0.08 + i * 0.1;
    k.torus(0.28, 0.0, z, 0.13, 0x5f9a5c, { rx: Math.PI / 2, sy: 0.16 });
  }
  k.rbox(0.28, 0.012, 0.24, 0.08, 0.03, 0.18, C.wood);
  mini(k, 0.28, 0.24, CASUAL[3], { s: 0.8 });
  // 黑面琵鷺
  for (const [x, z] of [[-0.3, 0.3], [-0.18, 0.36], [-0.08, 0.28]]) {
    k.sphere(x, 0.05, z, 0.04, C.white, { small: true, sy: 0.03 });
    k.cyl(x, 0.0, z, 0.004, 0.04, C.ink, { small: true });
    k.sphere(x + 0.035, 0.08, z, 0.018, C.white, { small: true });
    k.box(x + 0.065, 0.075, z, 0.04, 0.008, 0.012, C.ink, { small: true });
  }
};

M.foodstall = (k, P) => {
  k.box(0, 0, -0.12, 0.62, 0.22, 0.3, C.wood);
  k.box(0, 0.22, -0.12, 0.64, 0.02, 0.32, C.cream);
  for (const x of [-0.3, 0.3]) k.cyl(x, 0.24, -0.25, 0.01, 0.24, C.grey, { small: true });
  k.box(0, 0.48, -0.12, 0.72, 0.03, 0.36, P.color, { rx: 0.15 });
  k.rbox(0, 0.42, 0.06, 0.4, 0.1, 0.03, C.ink);
  k.box(0, 0.44, 0.077, 0.32, 0.05, 0.006, C.yellow, { glow: true });
  // 湯鍋與蒸氣
  k.cyl(-0.15, 0.24, -0.12, 0.07, 0.08, 0x9aa3a8);
  for (let i = 0; i < 3; i++) k.sphere(-0.15 + i * 0.02, 0.36 + i * 0.05, -0.12, 0.03 + i * 0.008, 0xffffff, { small: true });
  // 大碗雕塑
  k.dome(0.24, 0.24, -0.08, 0.1, C.white, { rx: Math.PI, sy: 0.07 });
  k.cyl(0.24, 0.235, -0.08, 0.095, 0.01, 0xf2c46a);
  // 紅燈籠
  for (const x of [-0.24, 0.0, 0.24]) k.sphere(x, 0.36, 0.13, 0.04, C.red, { glow: true, sy: 0.05 });
  // 板凳與客人
  for (const x of [-0.25, 0.0, 0.25]) k.cyl(x, 0, 0.3, 0.035, 0.07, C.coral, { small: true });
  mini(k, -0.25, 0.36, CASUAL[0]);
  mini(k, 0.25, 0.36, CASUAL[5]);
};

M.inn = (k, P) => {
  k.box(-0.08, 0, -0.1, 0.56, 0.24, 0.44, C.wall);
  k.box(-0.08, 0.24, -0.1, 0.56, 0.2, 0.44, 0xf6efe2);
  k.box(-0.08, 0.24, 0.13, 0.58, 0.02, 0.06, C.wood);
  for (let i = 0; i < 6; i++) k.cyl(-0.34 + i * 0.105, 0.26, 0.155, 0.006, 0.07, C.wood, { small: true });
  k.hip(-0.08, 0.44, -0.1, 0.62, 0.2, 0.5, C.coral);
  windows(k, -0.32, 0.16, 0.12, 0.122, 3);
  windows(k, -0.32, 0.16, 0.33, 0.122, 3);
  // 月亮招牌（夜晚發光）
  k.cyl(0.32, 0, 0.12, 0.01, 0.46, C.dark, { small: true });
  k.torus(0.32, 0.52, 0.12, 0.07, C.yellow, { glow: true, rx: Math.PI / 2, small: true });
  k.sphere(0.36, 0.56, 0.12, 0.035, C.yellow, { glow: true, small: true });
  // 行李箱
  k.rbox(0.12, 0, 0.3, 0.08, 0.12, 0.05, C.sky, { small: true });
  mini(k, 0.24, 0.3, CASUAL[4]);
};

// ===== 04 福利 =====
M.pillars = (k, P) => {
  k.rbox(0, 0, 0, 0.92, 0.06, 0.5, C.stone);
  const cols = [0x9fb4c8, 0xa9c3b5, 0xc2b2d6, 0xd8c0a0, 0xa7c8d8];
  for (let i = 0; i < 6; i++) {
    const x = -0.38 + i * 0.152;
    if (i < 5) {
      k.cyl(x, 0.06, 0, 0.05, 0.62, cols[i]);
      k.sphere(x, 0.7, 0, 0.05, cols[i]);
    } else {
      // 台南：正在補齊的那一根
      k.cyl(x, 0.06, 0, 0.05, 0.48, P.color);
      for (let s = 0; s < 3; s++) k.box(x, 0.54 + s * 0.05, 0, 0.1 - s * 0.02, 0.04, 0.1 - s * 0.02, mixHex(P.color, 0xffffff, 0.2 + s * 0.2));
      k.rod([x - 0.08, 0.06, 0.08], [x - 0.08, 0.72, 0.08], 0.008, C.yellow, { small: true });
      k.rod([x + 0.08, 0.06, 0.08], [x + 0.08, 0.72, 0.08], 0.008, C.yellow, { small: true });
      k.rod([x - 0.08, 0.4, 0.08], [x + 0.08, 0.4, 0.08], 0.008, C.yellow, { small: true });
    }
  }
  k.box(0, 0.06, 0.2, 0.9, 0.012, 0.03, C.yellow);
  mini(k, 0.38, 0.3, CASUAL[1], { hat: 0xf2c230 });
};

M.youth = (k, P) => {
  // 青年局（主建物）：玻璃帷幕
  k.box(0, 0, -0.1, 0.8, 0.62, 0.44, 0xbad3d6);
  for (let f = 0; f < 5; f++) k.box(0, 0.1 + f * 0.12, 0.122, 0.8, 0.012, 0.006, C.white);
  windows(k, -0.38, 0.38, 0.16, 0.124, 6, { h: 0.08 });
  windows(k, -0.38, 0.38, 0.4, 0.124, 6, { h: 0.08 });
  k.box(0, 0.62, -0.1, 0.84, 0.03, 0.48, P.color);
  // 屋頂花園
  for (let i = 0; i < 4; i++) bush(k, -0.3 + i * 0.2, -0.2, 0.05, C.leaf);
  k.begin([0, 0.65, -0.1], 0, 1);
  for (let i = 0; i < 4; i++) k.ico(-0.3 + i * 0.2, 0.04, -0.1, 0.05, C.leaf, { small: true });
  k.end();
  // Y 字招牌
  k.rod([0.0, 0.66, 0.05], [0.0, 0.8, 0.05], 0.016, C.yellow);
  k.rod([0.0, 0.8, 0.05], [-0.07, 0.92, 0.05], 0.016, C.yellow);
  k.rod([0.0, 0.8, 0.05], [0.07, 0.92, 0.05], 0.016, C.yellow);
  // 前庭：青年與單車
  k.box(0, 0, 0.3, 0.9, 0.01, 0.2, 0xd6dccf);
  bike(k, -0.3, 0.33, 0.2, C.mint);
  mini(k, -0.1, 0.3, CASUAL[2]);
  mini(k, 0.05, 0.34, CASUAL[5]);
  mini(k, 0.22, 0.3, CASUAL[0]);
};

M.elder = (k, P) => {
  // 公園長椅與長輩
  k.box(-0.12, 0.06, 0.1, 0.36, 0.02, 0.1, C.wood);
  k.box(-0.12, 0.1, 0.05, 0.36, 0.08, 0.015, C.wood);
  for (const x of [-0.27, 0.03]) k.box(x, 0, 0.1, 0.02, 0.06, 0.08, C.dark, { small: true });
  mini(k, -0.2, 0.1, 0x9fb4c8, { hair: 0xe8e8e8 });
  mini(k, -0.04, 0.1, 0xd8a0a8, { hair: 0xd9d9d9 });
  // 敬老卡
  k.rbox(0.22, 0, -0.14, 0.34, 0.42, 0.04, C.white, { rx: -0.08 });
  k.box(0.22, 0.28, -0.11, 0.3, 0.08, 0.006, C.green);
  k.box(0.22, 0.12, -0.11, 0.3, 0.05, 0.006, P.color);
  k.sphere(0.12, 0.2, -0.105, 0.03, C.gold, { small: true });
  // 重陽紅包
  k.rbox(-0.3, 0, -0.2, 0.16, 0.24, 0.04, C.red);
  k.box(-0.3, 0.17, -0.178, 0.08, 0.04, 0.006, C.gold);
  smallTree(k, 0.38, 0.28, 1.0, 0xe5643f);
};

M.housing = (k, P) => {
  k.box(-0.1, 0, -0.1, 0.6, 0.66, 0.42, 0xf1e6d8);
  for (let f = 0; f < 4; f++) {
    k.box(-0.1, 0.12 + f * 0.15, 0.13, 0.6, 0.015, 0.06, C.white);
    windows(k, -0.36, 0.16, 0.18 + f * 0.15, 0.112, 3, { h: 0.06 });
  }
  k.box(-0.1, 0.66, -0.1, 0.62, 0.03, 0.44, P.color);
  // 大鑰匙
  k.torus(0.32, 0.42, 0.1, 0.08, C.gold, { rx: Math.PI / 2 });
  k.rod([0.32, 0.34, 0.1], [0.32, 0.06, 0.1], 0.02, C.gold);
  k.box(0.36, 0.08, 0.1, 0.06, 0.03, 0.02, C.gold);
  k.box(0.36, 0.14, 0.1, 0.05, 0.03, 0.02, C.gold);
  k.cyl(0.32, 0, 0.1, 0.07, 0.04, C.stone);
  mini(k, 0.1, 0.32, CASUAL[3]);
};

M.nursery = (k, P) => {
  k.box(-0.05, 0, -0.12, 0.66, 0.28, 0.4, 0xfbe9d7);
  k.dome(-0.05, 0.28, -0.12, 0.3, 0xf7b8c8, { sy: 0.18 });
  windows(k, -0.32, 0.22, 0.14, 0.082, 4, { color: 0xffe29a });
  k.box(-0.05, 0, 0.082, 0.1, 0.16, 0.012, C.dark);
  // 積木
  const bc = [C.coral, C.yellow, C.sky, C.mint];
  for (let i = 0; i < 4; i++) k.box(0.3 + (i % 2) * 0.07, Math.floor(i / 2) * 0.07, 0.2, 0.065, 0.065, 0.065, bc[i], { small: true });
  // 嬰兒車
  k.begin([-0.28, 0, 0.25], 0.4, 1);
  k.dome(0, 0.09, 0, 0.07, P.color, { rx: -0.5 });
  k.box(0, 0.05, 0, 0.12, 0.05, 0.08, mixHex(P.color, 0xffffff, 0.4));
  for (const x of [-0.05, 0.05]) for (const z of [-0.03, 0.03]) k.cyl(x, 0.0, z, 0.02, 0.012, C.ink, { rz: Math.PI / 2, small: true });
  k.end();
  mini(k, -0.12, 0.3, CASUAL[2]);
  // 奶瓶
  k.cyl(0.12, 0, 0.3, 0.035, 0.1, C.white, { small: true });
  k.cone(0.12, 0.1, 0.3, 0.025, 0.04, 0xf2c46a, { small: true });
};

M.clinic = (k, P) => {
  hipHouse(k, -0.08, -0.12, 0.56, 0.38, 0.3, C.white, 0xf3b6c6);
  // 愛心標誌
  k.sphere(-0.12, 0.62, 0.11, 0.05, P.color);
  k.sphere(-0.04, 0.62, 0.11, 0.05, P.color);
  k.cone(-0.08, 0.6, 0.11, 0.075, 0.09, P.color, { rx: Math.PI });
  k.cyl(-0.08, 0.46, 0.08, 0.01, 0.12, C.grey, { small: true });
  flowerBed(k, -0.08, 0.26, 0.5, 0.1, [C.pink, 0xffffff, C.lilac]);
  k.box(0.33, 0.06, 0.15, 0.2, 0.02, 0.07, C.wood);
  mini(k, 0.3, 0.16, CASUAL[5]);
  mini(k, 0.38, 0.16, CASUAL[1]);
};

// ===== 05 交通 =====
M.interchange = (k, P) => {
  // 四橫三縱：四條東西向、三條南北向的高架路
  const pierC = 0xd9d2c7;
  const roadC = 0x6b6f73;
  for (let i = 0; i < 4; i++) {
    const z = -0.33 + i * 0.22, y = 0.12 + (i % 2) * 0.06;
    k.box(0, y, z, 0.98, 0.035, 0.08, roadC);
    k.box(0, y + 0.036, z, 0.98, 0.004, 0.008, RAINBOW[i], { small: true });
    for (const x of [-0.35, 0, 0.35]) k.box(x, 0, z, 0.04, y, 0.04, pierC);
  }
  for (let i = 0; i < 3; i++) {
    const x = -0.3 + i * 0.3, y = 0.3;
    k.box(x, y, 0, 0.08, 0.035, 0.98, roadC);
    k.box(x, y + 0.036, 0, 0.008, 0.004, 0.98, RAINBOW[4 + i], { small: true });
    for (const z of [-0.44, 0.44]) k.box(x, 0, z, 0.04, y, 0.04, pierC);
  }
  car(k, -0.3, 0.335, -0.1, 0, C.red);
  car(k, 0.0, 0.335, 0.2, Math.PI, C.yellow);
  car(k, 0.3, 0.155, -0.33, Math.PI / 2, C.white);
  car(k, -0.1, 0.215, -0.11, -Math.PI / 2, C.sky);
};

M.railway = (k, P) => {
  // 鐵路地下化：列車鑽進隧道口；立體化：高架段
  k.box(0, 0, -0.1, 0.98, 0.02, 0.18, 0xb9b0a3);
  k.box(-0.32, 0, -0.1, 0.26, 0.24, 0.3, 0xd8cfc2);
  k.box(-0.32, 0.02, 0.052, 0.16, 0.16, 0.006, C.ink);
  k.box(-0.32, 0.24, -0.1, 0.3, 0.03, 0.34, 0x9fbb6c);
  track(k, -0.2, -0.1, 0.48, -0.1, 0.03);
  train(k, 0.12, 0.03, -0.1, Math.PI / 2, 2, 0xf2f2f2, C.orange);
  // 高架段
  for (const x of [-0.3, 0.0, 0.3]) k.box(x, 0, 0.25, 0.05, 0.3, 0.05, 0xd9d2c7);
  k.box(0, 0.3, 0.25, 0.9, 0.04, 0.12, 0xcfc6b8);
  train(k, -0.1, 0.34, 0.25, Math.PI / 2, 2, 0xf2f2f2, 0x3e8fd0);
};

M.metro = (k, P) => {
  // 捷運藍線（主建物）：高架軌道＋車站
  for (const x of [-0.38, -0.05, 0.28]) k.cyl(x, 0, -0.05, 0.04, 0.34, 0xd9d2c7);
  k.box(-0.05, 0.34, -0.05, 0.98, 0.05, 0.16, 0xcfc6b8);
  train(k, -0.12, 0.39, -0.05, Math.PI / 2, 3, 0x2f6fc6, C.white);
  // 車站
  k.box(0.32, 0, 0.18, 0.3, 0.3, 0.26, 0xf1f1ee);
  k.box(0.32, 0.3, 0.18, 0.36, 0.03, 0.32, 0x2f6fc6);
  k.box(0.32, 0.33, 0.18, 0.34, 0.08, 0.3, 0xbad3d6, { rx: 0.1 });
  windows(k, 0.2, 0.44, 0.16, 0.312, 3, { h: 0.1 });
  k.rbox(0.18, 0.36, 0.33, 0.14, 0.08, 0.02, 0x2f6fc6);
  k.box(0.18, 0.38, 0.342, 0.1, 0.035, 0.005, C.white, { glow: true, small: true });
  mini(k, 0.05, 0.36, CASUAL[0]);
  mini(k, -0.15, 0.32, CASUAL[3]);
  mini(k, -0.3, 0.36, CASUAL[4]);
};

M.metroring = (k, P) => {
  // 半環狀：弧形軌道上三色列車（藍線延伸、深綠線、紅線）
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = -2.6 + (i / (n - 1)) * 2.5;
    const x = Math.cos(a) * 0.34, z = Math.sin(a) * 0.34 + 0.12;
    k.box(x, 0.18, z, 0.12, 0.03, 0.08, 0xcfc6b8, { ry: -a });
    if (i % 3 === 0) k.box(x, 0, z, 0.035, 0.18, 0.035, 0xd9d2c7);
  }
  const trains = [[-2.35, 0x5fa8e8], [-1.35, 0x2c6b46], [-0.4, 0xd9483b]];
  for (const [a, col] of trains) train(k, Math.cos(a) * 0.34, 0.21, Math.sin(a) * 0.34 + 0.12, -a, 1, col);
  // 高鐵、南科、湖內三個方向的站牌
  const signs = [[-0.4, 0.38, 0x5fa8e8], [0.0, 0.42, 0x2c6b46], [0.4, 0.38, 0xd9483b]];
  for (const [x, z, col] of signs) {
    k.cyl(x, 0, z, 0.008, 0.2, C.grey, { small: true });
    k.rbox(x, 0.18, z, 0.1, 0.06, 0.012, col, { small: true });
  }
};

M.sugartrain = (k, P) => {
  k.box(0, 0, -0.05, 0.98, 0.015, 0.2, 0xc9b89a);
  track(k, -0.48, -0.05, 0.48, -0.05, 0.02, 0x7a6a5a);
  // 五分車頭與甘蔗台車
  k.begin([0.2, 0.02, -0.05], Math.PI / 2, 1);
  k.rbox(0, 0, 0, 0.11, 0.1, 0.16, 0xe0742f);
  k.box(0, 0.1, 0.03, 0.1, 0.06, 0.08, 0xf2f0e8);
  k.cyl(0, 0.1, -0.05, 0.02, 0.06, C.ink, { small: true });
  k.end();
  for (let w = 0; w < 2; w++) {
    const x = -0.02 - w * 0.2;
    k.box(x, 0.02, -0.05, 0.17, 0.03, 0.1, C.wood);
    for (let s = 0; s < 6; s++) k.cyl(x - 0.07 + s * 0.028, 0.05, -0.05, 0.012, 0.09, s % 2 ? 0x9fbf5a : 0x7fa34a, { rx: Math.PI / 2, small: true });
  }
  // 甘蔗田與小站
  for (let i = 0; i < 9; i++) k.cyl(-0.4 + i * 0.1, 0, 0.3, 0.012, 0.22, 0x8fb35f, { small: true });
  k.box(0.32, 0, 0.18, 0.18, 0.14, 0.12, C.wood);
  k.gable(0.32, 0.14, 0.18, 0.22, 0.08, 0.16, C.coral, { ry: Math.PI / 2 });
  mini(k, 0.12, 0.2, CASUAL[1], { hat: 0xe8d39a });
};

M.tram = (k, P) => {
  track(k, -0.48, 0.0, 0.48, 0.0, 0.02, 0x8a8f94);
  k.begin([0.0, 0.02, 0.0], Math.PI / 2, 1);
  k.rbox(0, 0, 0, 0.13, 0.13, 0.5, C.white);
  k.box(0, 0.02, 0, 0.134, 0.04, 0.48, P.color);
  k.box(0.067, 0.08, 0, 0.006, 0.04, 0.42, C.win, { glow: true });
  k.box(-0.067, 0.08, 0, 0.006, 0.04, 0.42, C.win, { glow: true });
  k.end();
  // 架空線桿
  for (const x of [-0.4, 0.0, 0.4]) {
    k.cyl(x, 0, -0.16, 0.01, 0.34, C.grey, { small: true });
    k.box(x, 0.32, -0.08, 0.012, 0.012, 0.16, C.grey, { small: true });
  }
  k.rod([-0.45, 0.31, 0.0], [0.45, 0.31, 0.0], 0.004, C.dark, { small: true });
  for (const x of [-0.3, 0.3]) bush(k, x, 0.3, 0.07, C.leaf2);
  mini(k, 0.05, 0.3, CASUAL[5]);
};

M.bikeway = (k, P) => {
  k.box(0, 0, 0, 0.98, 0.012, 0.22, 0x6db57e, { ry: 0.2 });
  for (let i = 0; i < 5; i++) k.box(-0.36 + i * 0.18, 0.013, -0.08 + i * 0.036, 0.08, 0.004, 0.012, C.white, { ry: 0.2, small: true });
  bike(k, -0.18, -0.02, 0.2 + Math.PI / 2, C.mint);
  bike(k, 0.18, 0.06, 0.2 + Math.PI / 2, C.coral);
  mini(k, -0.18, 0.0, CASUAL[2], { s: 0.9 });
  // 單車架與行道樹
  for (let i = 0; i < 4; i++) k.torus(-0.3 + i * 0.1, 0.0, 0.32, 0.04, C.grey, { rx: 0, rz: 0, small: true });
  smallTree(k, 0.36, -0.3, 1.1, 0xe5643f);
  smallTree(k, -0.38, -0.3, 1.0, C.leaf);
  smallTree(k, 0.38, 0.32, 0.9, C.leaf2);
};

// ===== 06 姐姐 =====
M.playtower = (k, P) => {
  // 雙塔攀爬網（主建物）
  k.cyl(0, 0, -0.05, 0.48, 0.02, 0xf3c9a6, { hex: true });
  for (const x of [-0.26, 0.26]) {
    for (let a = 0; a < 6; a++) {
      const ax = x + Math.cos(a * 1.047) * 0.13, az = -0.1 + Math.sin(a * 1.047) * 0.13;
      k.cyl(ax, 0.02, az, 0.014, 0.6, C.wood);
    }
    k.cyl(x, 0.3, -0.1, 0.14, 0.03, C.wood, { hex: true });
    k.cone(x, 0.62, -0.1, 0.18, 0.24, x < 0 ? C.pink : C.sky);
    k.sphere(x, 0.88, -0.1, 0.03, C.yellow);
    // 攀爬網
    for (let i = 0; i < 4; i++) k.rod([x - 0.12, 0.08 + i * 0.12, 0.02], [x + 0.12, 0.08 + i * 0.12, 0.02], 0.006, 0xffffff, { small: true });
    for (let i = 0; i < 4; i++) k.rod([x - 0.09 + i * 0.06, 0.04, 0.03], [x - 0.09 + i * 0.06, 0.5, 0.03], 0.006, 0xffffff, { small: true });
  }
  // 吊橋
  for (let i = 0; i < 6; i++) k.box(-0.12 + i * 0.048, 0.33 - Math.sin(((i + 0.5) / 6) * Math.PI) * 0.04, -0.1, 0.04, 0.015, 0.1, C.wood, { small: true });
  // 溜滑梯
  k.box(0.38, 0.0, 0.16, 0.1, 0.02, 0.42, C.yellow, { rx: 0.62 });
  mini(k, -0.05, 0.25, CASUAL[3], { s: 0.85 });
  mini(k, 0.1, 0.3, CASUAL[0], { s: 0.85 });
};

M.slide = (k, P) => {
  // 共融遊具：寬滑梯、攀爬圓頂、鞦韆與遮陽
  k.box(-0.25, 0, -0.18, 0.2, 0.26, 0.2, P.color);
  k.box(-0.25, 0.0, 0.08, 0.18, 0.02, 0.4, C.yellow, { rx: 0.55 });
  for (let i = 0; i < 4; i++) k.torus(0.25, 0.0, -0.18, 0.15 - i * 0.002, 0xf29a3b, { rx: 0, rz: i * 0.78, sy: 0.15, small: true });
  // 鞦韆
  k.rod([0.05, 0, 0.25], [0.15, 0.32, 0.25], 0.01, C.sky, { small: true });
  k.rod([0.45, 0, 0.25], [0.35, 0.32, 0.25], 0.01, C.sky, { small: true });
  k.rod([0.15, 0.32, 0.25], [0.35, 0.32, 0.25], 0.01, C.sky, { small: true });
  for (const x of [0.2, 0.3]) {
    k.rod([x, 0.32, 0.25], [x, 0.1, 0.25], 0.004, C.grey, { small: true });
    k.box(x, 0.09, 0.25, 0.06, 0.012, 0.04, C.coral, { small: true });
  }
  // 遮陽傘
  k.cyl(-0.25, 0.26, -0.18, 0.012, 0.22, C.grey, { small: true });
  k.cone(-0.25, 0.44, -0.18, 0.2, 0.1, C.white);
  mini(k, 0.0, 0.0, CASUAL[1], { s: 0.85 });
  mini(k, 0.3, 0.38, CASUAL[4], { s: 0.85 });
};

M.orchid = (k, P) => {
  // 蘭花獸：會笑的大蘭花
  k.cyl(0, 0, 0, 0.3, 0.03, 0x9fc27a, { hex: true });
  k.rod([0, 0.03, 0], [0, 0.4, 0.02], 0.03, 0x6f9a54);
  for (let i = 0; i < 2; i++) k.sphere(-0.16 + i * 0.32, 0.08, 0.05, 0.14, 0x7fae5e, { sy: 0.04, sz: 0.07, ry: i ? 0.4 : -0.4 });
  const petal = [0xd06fb8, 0xe78ac9, 0xc35fae];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    k.sphere(Math.cos(a) * 0.14, 0.5 + Math.sin(a) * 0.12, 0.03, 0.1, petal[i % 3], { sz: 0.04 });
  }
  k.sphere(0, 0.5, 0.06, 0.08, 0xfbe3f0, { sz: 0.05 });
  // 臉
  for (const x of [-0.03, 0.03]) k.sphere(x, 0.52, 0.105, 0.014, C.ink, { small: true });
  k.torus(0, 0.48, 0.1, 0.02, C.coral, { rx: 0, small: true, sy: 0.01 });
  // 葉片溜滑梯上的孩子
  k.box(0.28, 0.02, 0.22, 0.12, 0.02, 0.3, 0x7fae5e, { rx: 0.4, ry: -0.5 });
  mini(k, 0.2, 0.3, CASUAL[2], { s: 0.8 });
  mini(k, -0.3, 0.28, CASUAL[5], { s: 0.8 });
};

M.school = (k, P) => {
  k.box(0, 0, -0.14, 0.86, 0.3, 0.34, C.wall);
  k.box(0, 0.3, -0.14, 0.9, 0.025, 0.38, C.eave);
  k.gable(0, 0.32, -0.14, 0.92, 0.12, 0.38, C.green, { ry: Math.PI / 2 });
  windows(k, -0.4, 0.4, 0.17, 0.032, 6);
  k.box(0, 0, 0.032, 0.12, 0.16, 0.012, C.dark);
  // 時鐘
  k.cyl(0, 0.35, 0.03, 0.05, 0.012, C.white, { rx: Math.PI / 2 });
  // 黑板與小課桌
  k.box(-0.24, 0.02, 0.2, 0.26, 0.16, 0.02, 0x2f5a45);
  for (let i = 0; i < 3; i++) {
    k.box(-0.32 + i * 0.1, 0, 0.32, 0.07, 0.05, 0.05, C.wood, { small: true });
    mini(k, -0.32 + i * 0.1, 0.38, CASUAL[i], { s: 0.75, hat: 0xf2c230 });
  }
  // 升旗台
  k.cyl(0.32, 0, 0.26, 0.07, 0.03, C.stone);
  k.cyl(0.32, 0.03, 0.26, 0.008, 0.6, C.grey, { small: true });
  k.box(0.37, 0.55, 0.26, 0.09, 0.06, 0.006, P.color, { small: true });
};

M.kids = (k, P) => {
  // 手牽手的孩子圍著一棵鳳凰木
  smallTree(k, 0, -0.05, 2.2, 0xe5643f);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    mini(k, Math.cos(a) * 0.24, -0.05 + Math.sin(a) * 0.24, CASUAL[i % CASUAL.length], { s: 0.85 });
  }
  // 大書本與終身學習卡
  k.box(0.34, 0, 0.3, 0.2, 0.05, 0.16, C.white, { ry: 0.3 });
  k.box(0.34, 0.05, 0.3, 0.21, 0.02, 0.17, P.color, { ry: 0.3 });
  k.rbox(-0.34, 0, 0.3, 0.18, 0.12, 0.03, C.mint, { ry: -0.3 });
  k.box(-0.34, 0.07, 0.32, 0.12, 0.025, 0.004, C.white, { ry: -0.3, small: true });
};

// 沒定義的 model 一律用小屋
M.house = (k, P) => hipHouse(k, 0, 0, 0.6, 0.5, 0.32, C.wall, C.coral);

export function buildModel(k, kind, P) {
  (M[kind] || M.house)(k, P);
}

// 細項縮圖、標籤用的高度估計（模型頂端）
export const MODEL_TOP = {
  cityhall: 1.3, riverbridge: 0.4, map37: 0.4, baton: 0.95, greenhouse: 0.5, fab: 0.75, solar: 0.85,
  medtech: 0.9, corridor: 0.65, dashboard: 0.75, alert: 0.85, coldchain: 0.6, market: 0.5, export: 0.45,
  farmhouse: 0.4, shield: 0.65, signpost: 1.05, tower: 0.85, lantern: 0.45, badland: 0.65, saltfield: 0.25,
  foodstall: 0.6, inn: 0.7, pillars: 0.8, youth: 0.95, elder: 0.5, housing: 0.75, nursery: 0.5,
  clinic: 0.7, interchange: 0.4, railway: 0.45, metro: 0.55, metroring: 0.35, sugartrain: 0.3,
  tram: 0.35, bikeway: 0.45, playtower: 0.9, slide: 0.55, orchid: 0.7, school: 0.65, kids: 0.55, house: 0.55,
};

export function seededRotation(id) {
  const r = mulberry32(hashString(id))();
  return (r - 0.5) * 0.5;
}

export { hexNum };
