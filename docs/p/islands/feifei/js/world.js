// 世界佈局：六角島、步道環、橋、曾文溪河道、行人路網、細項配置
import { canvasTexture, mulberry32, hashString, hexNum, mixHex } from "./util.js?v=20261029-3";

export const R = 2.02; // 六角形外接半徑（pointy-top，頂點朝 ±z）
export const SPACING = 2.36;
export const TOP = 0.65;
export const WATER_Y = -0.18;
export const RING_R = 1.74; // 步道環外接半徑
export const INNER = 1.36; // 建物區內切半徑
export const NORTH_SHIFT = 1.15; // 溪北島群往北推，讓出曾文溪河道
const RM = RING_R * Math.cos(Math.PI / 6); // 步道環邊中點半徑

// axial 方向 → 邊中點角度（0°=東，順時針看 +z 為南）
const AXIAL_DIRS = [
  [1, 0], // 0: 東 0°
  [0, 1], // 1: 東南 60°
  [-1, 1], // 2: 西南 120°
  [-1, 0], // 3: 西 180°
  [0, -1], // 4: 西北 240°
  [1, -1], // 5: 東北 300°
];

export function tileToWorld(q, r) {
  return { x: Math.sqrt(3) * SPACING * (q + r / 2), z: 1.5 * SPACING * r };
}

export function withinHex(x, z, inradius) {
  // pointy-top：三組邊法線 0°、60°、120°
  const a = Math.abs(x);
  const b = Math.abs(x * 0.5 + z * 0.8660254);
  const c = Math.abs(-x * 0.5 + z * 0.8660254);
  return Math.max(a, b, c) <= inradius;
}

export function layoutIslands(D) {
  const islands = D.islands.map((d, index) => {
    const w = tileToWorld(d.axial[0], d.axial[1]);
    const z = w.z - (d.north ? NORTH_SHIFT : 0);
    return { ...d, index, cx: w.x, cz: z };
  });
  const byId = new Map(islands.map((i) => [i.id, i]));
  const links = [];
  for (let a = 0; a < islands.length; a++) {
    for (let b = a + 1; b < islands.length; b++) {
      const A = islands[a], B = islands[b];
      const dq = B.axial[0] - A.axial[0], dr = B.axial[1] - A.axial[1];
      const dir = AXIAL_DIRS.findIndex(([q, r]) => q === dq && r === dr);
      if (dir < 0) continue;
      links.push({ a: A.id, b: B.id, dirA: dir, dirB: (dir + 3) % 6, river: !!A.north !== !!B.north });
    }
  }
  const cx = islands.reduce((s, i) => s + i.cx, 0) / islands.length;
  const cz = islands.reduce((s, i) => s + i.cz, 0) / islands.length;
  return { islands, byId, links, center: { x: cx, z: cz } };
}

// 步道環上的 12 個節點：偶數＝邊中點（角度 60°k），奇數＝頂點（60°k+30°）
export function ringNode(island, j) {
  const ang = (Math.PI / 6) * j;
  const rad = j % 2 === 0 ? RM : RING_R;
  return { x: island.cx + Math.cos(ang) * rad, z: island.cz + Math.sin(ang) * rad };
}

// ---------- 地面貼圖 ----------
const GROUND_STYLE = {
  brick: { base: 0xd9a184, line: 0xf1dccb, accent: 0xc9765a },
  tile: { base: 0xe9e6df, line: 0xd5d1c7, accent: 0x9fcfae },
  field: { base: 0xb9cf8a, line: 0x9fbb6c, accent: 0xd8d27a },
  sand: { base: 0xefdfc2, line: 0xe2cda6, accent: 0xf2b8c2 },
  dots: { base: 0xf1dfe4, line: 0xe6c9d2, accent: 0xf6eef0 },
  asphalt: { base: 0xd3cdc4, line: 0xfaf6ee, accent: 0xb9b2a7 },
  play: { base: 0xc8dfa0, line: 0xb4d08a, accent: 0xf3c9a6 },
};

function drawGround(type, g, s, seed) {
  const st = GROUND_STYLE[type] || GROUND_STYLE.tile;
  const rnd = mulberry32(seed);
  const css = (n) => "#" + n.toString(16).padStart(6, "0");
  g.fillStyle = css(st.base);
  g.fillRect(0, 0, s, s);
  if (type === "brick") {
    // 府城紅磚：人字形交錯
    const bw = s / 8, bh = s / 16;
    for (let y = 0; y < s; y += bh) {
      const off = (Math.round(y / bh) % 2) * (bw / 2);
      for (let x = -bw; x < s + bw; x += bw) {
        const t = rnd();
        g.fillStyle = css(mixHex(st.accent, st.base, 0.25 + t * 0.6));
        g.fillRect(x + off + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
  } else if (type === "tile") {
    const n = 8, c = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = css(mixHex(st.base, 0xffffff, rnd() * 0.35));
      g.fillRect(i * c + 1, j * c + 1, c - 2, c - 2);
    }
    g.fillStyle = css(st.accent);
    for (let k = 0; k < 10; k++) g.fillRect(Math.floor(rnd() * n) * c + c * 0.42, Math.floor(rnd() * n) * c + c * 0.42, c * 0.16, c * 0.16);
  } else if (type === "field") {
    // 田畦：深淺交錯的條紋
    const rows = 16, h = s / rows;
    for (let i = 0; i < rows; i++) {
      g.fillStyle = css(i % 2 ? st.line : mixHex(st.base, st.accent, rnd() * 0.25));
      g.fillRect(0, i * h, s, h * 0.62);
    }
    for (let k = 0; k < 220; k++) {
      g.fillStyle = css(mixHex(0x8fae5e, 0xc8d98f, rnd()));
      g.fillRect(rnd() * s, rnd() * s, 2, 2);
    }
  } else if (type === "sand") {
    for (let k = 0; k < 900; k++) {
      g.fillStyle = css(mixHex(st.base, rnd() < 0.5 ? st.line : 0xfff8ec, rnd()));
      const r = 1 + rnd() * 2;
      g.beginPath(); g.arc(rnd() * s, rnd() * s, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = css(st.accent); g.lineWidth = 2; g.globalAlpha = 0.35;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(rnd() * s, rnd() * s, 10 + rnd() * 18, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  } else if (type === "dots") {
    const n = 8, c = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = css(mixHex(st.base, st.line, rnd() * 0.6));
      g.beginPath(); g.arc(i * c + c / 2 + ((j % 2) * c) / 2, j * c + c / 2, c * 0.38, 0, Math.PI * 2); g.fill();
    }
  } else if (type === "asphalt") {
    for (let k = 0; k < 1400; k++) {
      g.fillStyle = css(mixHex(st.base, st.accent, rnd()));
      g.fillRect(rnd() * s, rnd() * s, 2, 2);
    }
    g.fillStyle = css(st.line);
    for (let y = s / 4; y < s; y += s / 2) for (let x = 0; x < s; x += s / 8) g.fillRect(x, y - 2, s / 16, 4);
  } else if (type === "play") {
    const pal = [0xf3c9a6, 0xbfe0d3, 0xf7d58a, 0xd8c8f0, 0xf4b8b8];
    for (let k = 0; k < 14; k++) {
      g.fillStyle = css(pal[k % pal.length]);
      g.beginPath(); g.arc(rnd() * s, rnd() * s, 14 + rnd() * 30, 0, Math.PI * 2); g.fill();
    }
    for (let k = 0; k < 260; k++) {
      g.fillStyle = css(mixHex(0x9fc27a, 0xd2e4a8, rnd()));
      g.fillRect(rnd() * s, rnd() * s, 2, 2);
    }
  }
}

function bandTexture(THREE, colorHex, seed) {
  const base = hexNum(colorHex);
  return canvasTexture(THREE, 128, (g, s) => {
    const css = (n) => "#" + n.toString(16).padStart(6, "0");
    g.fillStyle = css(mixHex(base, 0xffffff, 0.15));
    g.fillRect(0, 0, s, s);
    const rnd = mulberry32(seed);
    const w = s / 4;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = css(mixHex(base, 0xffffff, 0.45 + (i % 2) * 0.25));
      if (rnd() < 0.5) g.fillRect(i * w + w * 0.2, s * 0.25, w * 0.6, s * 0.5);
      else { g.beginPath(); g.arc(i * w + w / 2, s / 2, w * 0.3, 0, Math.PI * 2); g.fill(); }
    }
    g.fillStyle = "rgba(255,255,255,.85)";
    g.fillRect(0, 0, s, s * 0.1);
  });
}

function hexRing(THREE, rOut, rIn, y) {
  const pos = [];
  for (let k = 0; k < 6; k++) {
    const a0 = Math.PI / 6 + (Math.PI / 3) * k, a1 = a0 + Math.PI / 3;
    const o0 = [Math.cos(a0) * rOut, Math.sin(a0) * rOut], o1 = [Math.cos(a1) * rOut, Math.sin(a1) * rOut];
    const i0 = [Math.cos(a0) * rIn, Math.sin(a0) * rIn], i1 = [Math.cos(a1) * rIn, Math.sin(a1) * rIn];
    pos.push(i0[0], y, i0[1], o1[0], y, o1[1], o0[0], y, o0[1]);
    pos.push(i0[0], y, i0[1], i1[0], y, i1[1], o1[0], y, o1[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// ---------- 建島 ----------
export function placeIslands(THREE, scene, L, kit, { waterMaterial } = {}) {
  const group = new THREE.Group();
  group.name = "islands";
  const tops = [];
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xf1e0cc, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xe4d6c3, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0xdcc9b0, roughness: 0.95 });
  const shallowMat = new THREE.MeshBasicMaterial({ color: 0xbfe6e4, transparent: true, opacity: 0.55, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
  void waterMaterial;

  for (const isl of L.islands) {
    const seed = hashString(isl.id);
    const tex = canvasTexture(THREE, 256, (g, s) => drawGround(isl.ground, g, s, seed));
    const topGeo = new THREE.CircleGeometry(R - 0.05, 6).rotateZ(Math.PI / 6).rotateX(-Math.PI / 2);
    // 以世界座標當 UV，花紋尺度在每座島一致
    const p = topGeo.attributes.position, uv = topGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + isl.cx) / 2.2, (p.getZ(i) + isl.cz) / 2.2);
    const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, color: 0xffffff });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(isl.cx, TOP, isl.cz);
    top.receiveShadow = true;
    top.userData = { island: isl.id, pickable: true };
    group.add(top);
    tops.push(top);

    // 島緣彩色圖案帶
    const bandTex = bandTexture(THREE, isl.color, seed);
    bandTex.repeat.set(12, 1);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.16, 6, 1, true),
      new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.85 }),
    );
    band.position.set(isl.cx, TOP - 0.08, isl.cz);
    band.castShadow = false;
    band.receiveShadow = true;
    band.userData = { island: isl.id, pickable: true };
    group.add(band);

    // 崖壁（沒入水中）
    const cliffH = TOP - 0.16 - (WATER_Y - 0.45);
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.035, cliffH, 6, 1, true), cliffMat);
    cliff.position.set(isl.cx, TOP - 0.16 - cliffH / 2, isl.cz);
    cliff.receiveShadow = true;
    cliff.userData = { island: isl.id, pickable: true };
    group.add(cliff);

    // 路緣與步道環
    const curb = new THREE.Mesh(hexRing(THREE, R - 0.02, R - 0.13, 0.006), curbMat);
    curb.position.set(isl.cx, TOP, isl.cz);
    curb.receiveShadow = true;
    group.add(curb);
    const ring = new THREE.Mesh(hexRing(THREE, RING_R + 0.14, RING_R - 0.14, 0.01), pathMat);
    ring.position.set(isl.cx, TOP, isl.cz);
    ring.receiveShadow = true;
    group.add(ring);

    // 淺水環與泡沫
    const shallow = new THREE.Mesh(hexRing(THREE, R + 0.72, R * 1.03, 0), shallowMat);
    shallow.position.set(isl.cx, WATER_Y + 0.012, isl.cz);
    shallow.renderOrder = 1;
    group.add(shallow);
    const foam = new THREE.Mesh(hexRing(THREE, R + 0.18, R * 1.035, 0), foamMat);
    foam.position.set(isl.cx, WATER_Y + 0.02, isl.cz);
    foam.renderOrder = 2;
    group.add(foam);

    // 步道環頂點的路燈與邊上的盆栽（小物件，遠景隱藏）
    kit.setOwner(null);
    kit.setSmall(true);
    for (let k = 0; k < 6; k++) {
      const ang = Math.PI / 6 + (Math.PI / 3) * k;
      const lx = isl.cx + Math.cos(ang) * (RING_R + 0.2), lz = isl.cz + Math.sin(ang) * (RING_R + 0.2);
      kit.cyl(lx, TOP, lz, 0.018, 0.42, 0x3d3a36);
      kit.sphere(lx, TOP + 0.45, lz, 0.045, 0xfff3d6, { glow: true });
    }
    kit.setSmall(false);
  }

  // 橋：連接相鄰兩島步道環的邊中點
  const bridges = [];
  for (const link of L.links) {
    const A = L.byId.get(link.a), B = L.byId.get(link.b);
    const pa = ringNode(A, link.dirA * 2), pb = ringNode(B, link.dirB * 2);
    const len = Math.hypot(pb.x - pa.x, pb.z - pa.z);
    const arch = link.river ? 0.22 : 0.07;
    const n = Math.max(9, Math.round(len / 0.16));
    const yaw = Math.atan2(pb.x - pa.x, pb.z - pa.z);
    const deck = link.river ? 0xd8b58e : 0xe7cfae;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = pa.x + (pb.x - pa.x) * t, z = pa.z + (pb.z - pa.z) * t;
      const y = TOP + 0.005 + Math.sin(t * Math.PI) * arch;
      kit.box(x, y, z, 0.36, 0.05, (len / n) * 0.86, deck, { ry: yaw });
    }
    // 欄杆
    const side = [Math.cos(yaw) * 0.19, -Math.sin(yaw) * 0.19];
    for (const sgn of [-1, 1]) {
      let prev = null;
      for (let i = 0; i <= 6; i++) {
        const t = 0.08 + (i / 6) * 0.84;
        const x = pa.x + (pb.x - pa.x) * t + side[0] * sgn, z = pa.z + (pb.z - pa.z) * t + side[1] * sgn;
        const y = TOP + 0.03 + Math.sin(t * Math.PI) * arch;
        kit.cyl(x, y, z, 0.012, 0.16, link.river ? 0xb98e66 : 0xd2b48f, { small: true });
        const cur = [x, y + 0.16, z];
        if (prev) kit.rod(prev, cur, 0.012, link.river ? 0xb98e66 : 0xd2b48f, { small: true });
        prev = cur;
      }
    }
    if (link.river) {
      // 跨溪大橋加兩座橋墩
      for (const t of [0.3, 0.7]) {
        const x = pa.x + (pb.x - pa.x) * t, z = pa.z + (pb.z - pa.z) * t;
        kit.box(x, WATER_Y - 0.1, z, 0.3, TOP + Math.sin(t * Math.PI) * arch - WATER_Y + 0.05, 0.12, 0xcdb79a, { ry: yaw });
      }
    }
    bridges.push({ ...link, pa, pb, len, arch });
  }

  scene.add(group);
  return { group, tops, bridges };
}

// ---------- 行人路網（Dijkstra） ----------
export function makePathNetwork(L, bridges) {
  const nodes = []; // {id, x, z, island}
  const adj = new Map();
  const key = (isl, j) => `${isl}:${j}`;
  const addEdge = (a, b, w, meta = null) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push({ to: b, w, meta });
    adj.get(b).push({ to: a, w, meta });
  };
  const pos = new Map();
  for (const isl of L.islands) {
    for (let j = 0; j < 12; j++) {
      const p = ringNode(isl, j);
      const id = key(isl.id, j);
      nodes.push({ id, ...p, island: isl.id });
      pos.set(id, p);
    }
    for (let j = 0; j < 12; j++) {
      const a = key(isl.id, j), b = key(isl.id, (j + 1) % 12);
      const pa = pos.get(a), pb = pos.get(b);
      addEdge(a, b, Math.hypot(pa.x - pb.x, pa.z - pb.z));
    }
  }
  for (const br of bridges) {
    addEdge(key(br.a, br.dirA * 2), key(br.b, br.dirB * 2), br.len, { bridge: br });
  }

  function path(from, to) {
    const dist = new Map([[from, 0]]);
    const prev = new Map();
    const done = new Set();
    const queue = [[0, from]];
    while (queue.length) {
      queue.sort((a, b) => a[0] - b[0]);
      const [d, u] = queue.shift();
      if (done.has(u)) continue;
      done.add(u);
      if (u === to) break;
      for (const e of adj.get(u) || []) {
        const nd = d + e.w;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
          prev.set(e.to, { u, e });
          queue.push([nd, e.to]);
        }
      }
    }
    if (!dist.has(to)) return null;
    const out = [];
    let cur = to;
    while (cur !== from) {
      const pr = prev.get(cur);
      out.unshift({ id: cur, edge: pr.e });
      cur = pr.u;
    }
    out.unshift({ id: from, edge: null });
    return out.map((s) => ({ ...pos.get(s.id), id: s.id, bridge: s.edge?.meta?.bridge || null }));
  }

  return { nodes, adj, pos, path, key };
}

// ---------- 細項配置 ----------
export function slotLayout(count, heroIndex) {
  const others = count - 1;
  const cell = others <= 3 ? 0.62 : others <= 4 ? 0.58 : others <= 5 ? 0.54 : 0.5;
  const pts = [];
  const rows = Math.ceil((INNER * 2) / (cell * 0.866)) + 2;
  for (let r = -rows; r <= rows; r++) {
    for (let c = -rows; c <= rows; c++) {
      const x = c * cell + (Math.abs(r) % 2) * (cell / 2);
      const z = r * cell * 0.866 + 0.18;
      if (!withinHex(x, z, INNER - cell * 0.42)) continue;
      // 主建物佔 (0,-0.58) 一帶
      if (Math.abs(x) < 0.72 && z < -0.02) continue;
      pts.push({ x, z, d: Math.hypot(x * 0.9, z - 0.45) });
    }
  }
  pts.sort((a, b) => a.d - b.d);
  const chosen = [];
  for (const p of pts) {
    if (chosen.length >= others) break;
    if (chosen.every((q) => Math.hypot(q.x - p.x, q.z - p.z) > cell * 0.98)) chosen.push(p);
  }
  // 由左到右、由後到前排序，讓 ①②③ 的閱讀順序自然
  chosen.sort((a, b) => (Math.abs(a.z - b.z) < cell * 0.4 ? a.x - b.x : a.z - b.z));
  const slots = [];
  let oi = 0;
  for (let i = 0; i < count; i++) {
    if (i === heroIndex) slots.push({ x: 0, z: -0.58, size: 1.12, hero: true });
    else {
      const p = chosen[oi++] || { x: 0, z: 0.9 };
      slots.push({ x: p.x, z: p.z, size: cell * 1.06, hero: false });
    }
  }
  return slots;
}
