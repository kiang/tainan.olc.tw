// 街道家具、各島樹種、台南沿海點綴（頂頭額沙洲、國聖港燈塔、七股鹽山、蚵棚、竹筏、黑面琵鷺）
import { TOP, WATER_Y, R } from "./world.js?v=20261029-3";
import { C } from "./models.js?v=20261029-3";
import { mulberry32, hashString, mixHex } from "./util.js?v=20261029-3";
import { coastX } from "./env.js?v=20261029-3";
import { SISTER_SPOT } from "./people.js?v=20261029-3";

export function tree(k, x, y, z, type, s, rnd) {
  const r = rnd();
  if (type === "phoenix") {
    // 鳳凰木：寬傘狀紅橙樹冠
    k.cyl(x, y, z, 0.035 * s, 0.34 * s, 0x8a6249);
    k.ico(x, y + 0.36 * s, z, 0.2 * s, 0x7fa35a, { sy: 0.07 * s });
    k.ico(x, y + 0.42 * s, z, 0.26 * s, mixHex(0xe5543a, 0xf28a3c, r), { sy: 0.1 * s });
    k.ico(x + 0.1 * s, y + 0.5 * s, z - 0.05 * s, 0.14 * s, mixHex(0xf07a3f, 0xf6a04c, r), { sy: 0.07 * s });
  } else if (type === "mango") {
    k.cyl(x, y, z, 0.035 * s, 0.22 * s, 0x7a5b43);
    k.ico(x, y + 0.34 * s, z, 0.2 * s, mixHex(0x4f7d45, 0x5f8f4f, r));
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + r;
      k.sphere(x + Math.cos(a) * 0.16 * s, y + 0.27 * s, z + Math.sin(a) * 0.16 * s, 0.028 * s, 0xf2a93b, { small: true });
    }
  } else if (type === "palm") {
    // 椰子樹：彎曲樹幹＋放射葉
    s *= 0.78;
    let px = x, py = y, pz = z;
    for (let i = 0; i < 5; i++) {
      const nx = px + 0.012 * s, ny = py + 0.11 * s;
      k.rod([px, py, pz], [nx, ny, pz], 0.025 * s, 0xa88763);
      px = nx; py = ny;
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r;
      k.box(px + Math.cos(a) * 0.1 * s, py - 0.02 * s, pz + Math.sin(a) * 0.1 * s, 0.22 * s, 0.012 * s, 0.06 * s, 0x6fa35a, { ry: -a, rz: -0.45 });
    }
    k.sphere(px, py - 0.03 * s, pz, 0.03 * s, 0x8a6a3a, { small: true });
  } else if (type === "banyan") {
    // 榕樹：寬樹冠與氣根
    k.cyl(x, y, z, 0.06 * s, 0.26 * s, 0x7a5b43);
    k.ico(x - 0.1 * s, y + 0.34 * s, z, 0.18 * s, mixHex(0x5f8a4e, 0x6f9a58, r));
    k.ico(x + 0.1 * s, y + 0.36 * s, z + 0.03 * s, 0.2 * s, mixHex(0x6a9654, 0x7aa462, r));
    k.ico(x, y + 0.44 * s, z - 0.05 * s, 0.17 * s, 0x76a05e);
    for (const dx of [-0.16, -0.08, 0.1, 0.18]) k.rod([x + dx * s, y + 0.28 * s, z], [x + dx * s, y, z], 0.006 * s, 0x8a6a4a, { small: true });
  } else if (type === "conifer") {
    k.cyl(x, y, z, 0.03 * s, 0.14 * s, 0x7a5b43);
    k.cone(x, y + 0.1 * s, z, 0.16 * s, 0.26 * s, mixHex(0x5f8a55, 0x6f9a60, r));
    k.cone(x, y + 0.26 * s, z, 0.12 * s, 0.22 * s, mixHex(0x6a9660, 0x7aa86a, r));
  } else {
    k.cyl(x, y, z, 0.035 * s, 0.24 * s, 0x7a5b43);
    k.ico(x, y + 0.36 * s, z, 0.2 * s, mixHex(0x8db86f, 0x9cc27a, r));
    k.ico(x + 0.08 * s, y + 0.46 * s, z + 0.04 * s, 0.12 * s, 0xa6cb83);
  }
}

// 每座島：避開細項的位置種 4–6 棵樹，加花台、長椅
export function decorateIslands(k, L, placements) {
  for (const isl of L.islands) {
    const rnd = mulberry32(hashString(isl.id + ":decor"));
    const slots = placements.get(isl.id) || [];
    const taken = slots.map((s) => ({ x: s.x, z: s.z, r: s.hero ? 0.66 : s.size * 0.55 }));
    if (isl.id === "sister") taken.push({ x: SISTER_SPOT[0], z: SISTER_SPOT[1], r: 0.3 });
    const free = (x, z, r) => taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + r);
    k.setOwner(null);
    let trees = 0;
    const cand = [];
    for (let a = 0; a < 36; a++) {
      const ang = (a / 36) * Math.PI * 2;
      for (const rad of [1.36, 1.24]) cand.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
    }
    cand.sort(() => rnd() - 0.5);
    for (const [x, z] of cand) {
      if (trees >= 5) break;
      if (!free(x, z, 0.2)) continue;
      tree(k, isl.cx + x, TOP, isl.cz + z, isl.tree, 0.85 + rnd() * 0.3, rnd);
      taken.push({ x, z, r: 0.22 });
      trees++;
    }
    // 小物件：灌木、花、長椅（遠景隱藏）
    k.setSmall(true);
    let props = 0;
    for (const [x, z] of cand) {
      if (props >= 7) break;
      if (!free(x, z, 0.08)) continue;
      const t = rnd();
      if (t < 0.4) k.ico(isl.cx + x, TOP + 0.05, isl.cz + z, 0.07, mixHex(0x8db86f, 0x6f9a58, rnd()));
      else if (t < 0.75) {
        k.cyl(isl.cx + x, TOP, isl.cz + z, 0.05, 0.05, C.stone);
        for (let f = 0; f < 3; f++) k.sphere(isl.cx + x + (f - 1) * 0.03, TOP + 0.07, isl.cz + z, 0.022, [C.pink, C.yellow, 0xffffff][f]);
      } else {
        const yaw = Math.atan2(x, z);
        k.box(isl.cx + x, TOP + 0.04, isl.cz + z, 0.16, 0.015, 0.05, C.wood, { ry: yaw });
      }
      taken.push({ x, z, r: 0.1 });
      props++;
    }
    k.setSmall(false);

    // 農漁島：魚塭與水車
    if (isl.id === "agriculture") {
      const spots = [[-1.05, 0.55], [1.05, 0.5]];
      for (const [x, z] of spots) {
        if (!free(x, z, 0.18)) continue;
        k.box(isl.cx + x, TOP, isl.cz + z, 0.34, 0.012, 0.26, 0xcbbd93);
        k.box(isl.cx + x, TOP + 0.012, isl.cz + z, 0.29, 0.006, 0.21, C.water);
        k.cyl(isl.cx + x, TOP + 0.03, isl.cz + z, 0.04, 0.012, C.white, { rz: Math.PI / 2, small: true });
      }
    }
  }
}

// 外海：台南沿海意象
export function buildSeaDecor(k, center) {
  const rnd = mulberry32(2026);
  const cx = center.x, cz = center.z;
  k.setOwner(null);
  // 頂頭額沙洲：細長彎曲的沙洲
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = cx - 18 + Math.sin(t * 2.4) * 1.6, z = cz - 25 + t * 17;
    k.sphere(x, WATER_Y - 0.06, z, 1.1 + Math.sin(t * Math.PI) * 0.5, 0xe9d8b2, { sy: 0.22, sz: 1.5 });
  }
  for (let i = 0; i < 10; i++) {
    const t = rnd();
    k.ico(cx - 18 + Math.sin(t * 2.4) * 1.6 + 0.3, WATER_Y + 0.1, cz - 25 + t * 17, 0.18, 0x9cb87a, { small: true, sy: 0.12 });
  }
  // 國聖港燈塔（黑白相間）在沙洲北端
  const lx = cx - 17.8, lz = cz - 24.6;
  k.cyl(lx, WATER_Y, lz, 0.32, 0.12, C.stone, { hex: true });
  for (let s = 0; s < 6; s++) k.cyl(lx, WATER_Y + 0.12 + s * 0.28, lz, 0.17 - s * 0.012, 0.28, s % 2 ? C.white : 0x2a2523);
  k.cyl(lx, WATER_Y + 1.8, lz, 0.13, 0.16, 0xfff3c8, { glow: true });
  k.cone(lx, WATER_Y + 1.96, lz, 0.17, 0.16, 0x2a2523);

  // 七股鹽山：北邊海岸上的白色鹽山
  const sz = cz - 23, sx = coastX(sz) + 2.2;
  k.cone(sx, -0.1, sz, 1.5, 2.1, C.salt);
  k.cone(sx + 1.6, -0.1, sz + 0.6, 0.9, 1.2, 0xeef0ee);
  for (let s = 0; s < 8; s++) k.box(sx - 0.2 + s * 0.02, s * 0.25, sz + 1.3 - s * 0.16, 0.36, 0.05, 0.12, 0xd6c3a2, { small: true });
  // 扇形鹽田（青鯤鯓）
  for (let i = 0; i < 11; i++) {
    const a = -0.9 + i * 0.18;
    k.box(sx - 3 + Math.sin(a) * 1.4, -0.12, sz + 3.2 + Math.cos(a) * 1.4, 0.32, 0.03, 2.4, i % 2 ? C.salt : 0x9fd6e0, { ry: a });
  }

  // 蚵棚：潟湖中的竹架
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const x = cx - 13.5 + c * 0.55, z = cz - 15 + r * 0.9;
      k.box(x, WATER_Y - 0.2, z, 0.035, 0.32, 0.035, 0x9a7f5f, { small: true });
    }
    k.box(cx - 12.1, WATER_Y + 0.1, cz - 15 + r * 0.9, 3.0, 0.02, 0.03, 0x9a7f5f, { small: true });
  }
  // 竹筏與漁船
  const boats = [[-11, -8, 0.4], [-9.5, 6.5, -0.3], [-14, 2, 1.2], [-8.6, -12, 2.2], [-16, 9, 0.8]];
  for (const [bx, bz, yaw] of boats) {
    k.begin([cx + bx, WATER_Y, cz + bz], yaw, 1);
    if (rnd() < 0.5) {
      for (let i = 0; i < 5; i++) k.cyl(-0.12 + i * 0.06, 0.02, 0, 0.03, 0.62, 0xc9a66b, { rx: Math.PI / 2 });
      k.cyl(0, 0.05, -0.1, 0.012, 0.32, C.wood, { small: true });
    } else {
      k.rbox(0, -0.02, 0, 0.32, 0.14, 0.72, [C.white, 0x5da7c9, C.coral][Math.floor(rnd() * 3)]);
      k.box(0, 0.12, -0.08, 0.2, 0.14, 0.2, C.white);
      k.cyl(0, 0.12, 0.18, 0.01, 0.38, C.grey, { small: true });
    }
    k.end();
  }
  // 帆船（安平外海）
  for (const [bx, bz] of [[-10.5, 9.5], [-13, 12]]) {
    k.rbox(cx + bx, WATER_Y - 0.02, cz + bz, 0.22, 0.1, 0.56, C.white);
    k.cyl(cx + bx, WATER_Y + 0.08, cz + bz, 0.012, 0.8, C.grey);
    k.box(cx + bx + 0.12, WATER_Y + 0.15, cz + bz, 0.01, 0.6, 0.34, 0xfff8ee, { rz: 0.05 });
  }
  // 黑面琵鷺棲地：潟湖裡的泥灘與白色小鳥
  const mx = cx - 11.5, mz = cz - 20;
  k.sphere(mx, WATER_Y - 0.05, mz, 1.4, 0xbdae8d, { sy: 0.12, sz: 0.9 });
  for (let i = 0; i < 14; i++) {
    const x = mx - 1 + rnd() * 2, z = mz - 0.6 + rnd() * 1.2;
    k.sphere(x, WATER_Y + 0.11, z, 0.06, C.white, { small: true, sy: 0.045 });
    k.box(x + 0.07, WATER_Y + 0.12, z, 0.06, 0.012, 0.016, 0x2a2523, { small: true, ry: rnd() * 6 });
  }
  // 安平外海小燈塔
  k.cyl(cx - 9.8, WATER_Y, cz + 3.4, 0.4, 0.1, C.stone, { hex: true });
  k.cyl(cx - 9.8, WATER_Y + 0.1, cz + 3.4, 0.11, 0.9, C.white);
  k.cyl(cx - 9.8, WATER_Y + 0.6, cz + 3.4, 0.115, 0.18, C.red);
  k.cyl(cx - 9.8, WATER_Y + 1.0, cz + 3.4, 0.09, 0.12, 0xfff3c8, { glow: true });
  k.cone(cx - 9.8, WATER_Y + 1.12, cz + 3.4, 0.13, 0.12, C.red);
}

// 飛翔的黑面琵鷺（動態，用一組小 InstancedMesh）
export function createBirds(THREE, scene, center, count = 7) {
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const body = new THREE.InstancedMesh(geo, mat, count * 3);
  body.frustumCulled = false;
  scene.add(body);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  for (let i = 0; i < count * 3; i++) body.setColorAt(i, color.setHex(i % 3 === 2 ? 0x2a2523 : 0xffffff));
  function update(time) {
    for (let i = 0; i < count; i++) {
      const t = time * 0.06 + i * 0.05;
      const off = (i - (count - 1) / 2);
      const ang = t;
      const rad = 15 + Math.abs(off) * 0.5;
      const bx = center.x - 6 + Math.cos(ang) * rad - Math.abs(off) * 0.4 * Math.sin(ang);
      const bz = center.z - 8 + Math.sin(ang) * rad * 0.6 + off * 0.5;
      const by = 7 + Math.sin(time * 0.5 + i) * 0.3;
      const yaw = Math.PI - ang; // 嘴（local −z）朝飛行切線方向
      const flap = Math.sin(time * 6 + i) * 0.5;
      // 身體
      e.set(0, yaw, 0);
      q.setFromEuler(e);
      p.set(bx, by, bz); s.set(0.12, 0.08, 0.22);
      m.compose(p, q, s); body.setMatrixAt(i * 3, m);
      // 翅膀
      e.set(0, yaw, flap);
      q.setFromEuler(e);
      s.set(0.42, 0.02, 0.12);
      m.compose(p, q, s); body.setMatrixAt(i * 3 + 1, m);
      // 黑色琵嘴
      p.set(bx + Math.sin(yaw) * -0.26, by, bz + Math.cos(yaw) * -0.26);
      s.set(0.03, 0.02, 0.1);
      m.compose(p, q.setFromEuler(e.set(0, yaw, 0)), s); body.setMatrixAt(i * 3 + 2, m);
    }
    body.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { update, mesh: body };
}

export { R };

// 虱目魚群（動態）：台南代表魚。平常半沉在水面巡游，會不定時冒出又潛下，偶爾整尾躍出水面、落下點出漣漪。
// 和鳥一樣用 InstancedMesh；位置是時間的函數（不靠逐幀累加，換幀率也穩）。水面不透明，魚身中心約在水面、露出上半身。
export function createFish(THREE, scene, center, count = 9) {
  const cx = center.x, cz = center.z;
  const bodyGeo = new THREE.SphereGeometry(1, 7, 5);
  const tailGeo = new THREE.ConeGeometry(1, 1, 5).rotateX(-Math.PI / 2); // 圓錐底朝後，當往後張開的尾鰭
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcdd9de, roughness: 0.45, metalness: 0.1, flatShading: true });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xb4c3cb, roughness: 0.6, flatShading: true });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const tails = new THREE.InstancedMesh(tailGeo, tailMat, count);
  bodies.frustumCulled = false; tails.frustumCulled = false;
  scene.add(bodies); scene.add(tails);

  const fish = [];
  for (let i = 0; i < count; i++) {
    fish.push({
      rad: 9 + Math.random() * 15,          // 離中心半徑：落在環島海面、避開中央島群
      ang0: Math.random() * Math.PI * 2,
      spin: (0.05 + Math.random() * 0.05) * (Math.random() < 0.5 ? 1 : -1),
      bob: Math.random() * Math.PI * 2,
      period: 14 + Math.random() * 12,      // 出沒週期（秒）
      pOff: Math.random(),
      size: 0.55 + Math.random() * 0.4,
      jumpH: 0.5 + Math.random() * 0.5,
      prevC: 0,
    });
  }

  // 漣漪池（躍出落水時的水圈）
  const rGeo = new THREE.RingGeometry(0.5, 0.64, 18).rotateX(-Math.PI / 2);
  const rings = [];
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xeef6f4, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const mesh = new THREE.Mesh(rGeo, mat);
    mesh.position.y = WATER_Y + 0.02; mesh.visible = false; mesh.frustumCulled = false;
    scene.add(mesh);
    rings.push({ mesh, mat, active: false, t0: 0 });
  }
  function splash(x, z, time) {
    const r = rings.find((p) => !p.active);
    if (!r) return;
    r.active = true; r.t0 = time; r.mesh.position.set(x, WATER_Y + 0.02, z);
  }

  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ"; // 先轉向（Y）再仰角（X）
  function update(time) {
    for (let i = 0; i < count; i++) {
      const f = fish[i];
      const ang = f.ang0 + time * f.spin;
      const rad = f.rad + Math.sin(time * 0.2 + f.bob) * 1.2;
      const x = cx + Math.cos(ang) * rad;
      const z = cz + Math.sin(ang) * rad;
      const yaw = Math.atan2(-Math.sin(ang) * Math.sign(f.spin), Math.cos(ang) * Math.sign(f.spin));

      const c = (time / f.period + f.pOff) % 1; // 出沒進度 0~1
      let emerge;
      if (c < 0.1) emerge = c / 0.1;              // 冒出
      else if (c < 0.72) emerge = 1;              // 在水面巡游
      else if (c < 0.82) emerge = (0.82 - c) / 0.1; // 潛下
      else emerge = 0;                            // 消失在水面下

      let jump = 0, pitch = 0;
      if (c > 0.34 && c < 0.54) {                 // 露面期間躍出一次
        const jp = (c - 0.34) / 0.2;
        jump = Math.sin(jp * Math.PI) * f.jumpH;
        pitch = Math.cos(jp * Math.PI) * 0.5;
      }
      const y = WATER_Y + jump + Math.sin(time * 2 + f.bob) * 0.015;
      if (f.prevC < 0.52 && c >= 0.52) splash(x, z, time); // 落水點漣漪
      f.prevC = c;

      const sc = emerge * f.size;
      const wag = Math.sin(time * 7 + f.bob) * 0.3;
      const back = sc * 0.5;
      dummy.position.set(x, y, z);
      dummy.rotation.set(pitch, yaw, 0);
      dummy.scale.set(sc * 0.22, sc * 0.15, sc * 0.52);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x - Math.sin(yaw) * back, y, z - Math.cos(yaw) * back);
      dummy.rotation.set(pitch, yaw + wag, 0);
      dummy.scale.set(sc * 0.24, sc * 0.03, sc * 0.26);
      dummy.updateMatrix();
      tails.setMatrixAt(i, dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate = true;
    tails.instanceMatrix.needsUpdate = true;

    const DUR = 1.3;
    for (const r of rings) {
      if (!r.active) continue;
      const k = (time - r.t0) / DUR;
      if (k >= 1) { r.active = false; r.mesh.visible = false; r.mat.opacity = 0; continue; }
      r.mesh.visible = true;
      const s = 0.3 + k * 2.2;
      r.mesh.scale.set(s, s, s);
      r.mat.opacity = (1 - k) * 0.4;
    }
  }
  update(0);
  return { update, mesh: bodies };
}
