// 小人、串聯線上的搬運者、騎單車的妃妃市長、抱小熊的姐姐妃妃
import { TOP } from "./world.js?v=20261029-3";
import { mulberry32, clamp } from "./util.js?v=20261029-3";

export const SISTER_SPOT = [-0.12, 1.42];
const SKIN = [0xf5d0b0, 0xddb089, 0xc68e63, 0xecbf98];
const HAIR = [0x2b2420, 0x46321f, 0x24201d, 0x5f432f, 0xdad7d2];
const CASUAL = [0x6f7fb5, 0x58a6a6, 0xe8c547, 0xf2a1a1, 0x8fb37a, 0xb58fd0, 0xf29a3b];

// 角色：衣服顏色、帽子、手上物品
const ROLES = {
  tourist: { shirt: null, hat: 0xf4e3b5, hatKind: "cap" },
  engineer: { shirt: 0xf2f2f2, hat: 0xffffff, hatKind: "cap" },
  farmer: { shirt: 0x8fb37a, hat: 0xe8d39a, hatKind: "douli" },
  researcher: { shirt: 0xffffff },
  parent: { shirt: null },
  stroller: { shirt: null },
  volunteer: { shirt: 0x2f8a4f, hat: 0x2f8a4f, hatKind: "cap" },
  commuter: { shirt: null },
  ambient: { shirt: null },
};
export const ROLE_LABEL = {
  tourist: "旅客", engineer: "南科工程師", farmer: "農漁民", researcher: "研究員", parent: "家長",
  stroller: "推嬰兒車的家長", volunteer: "後援會志工", commuter: "通勤族", ambient: "市民",
};
export const CARRY_LABEL = {
  luggage: "行李箱", briefcase: "公事包", crate: "農產箱", fruit: "芒果與洋香瓜", seedling: "花卉幼苗",
  house: "新家的鑰匙", baby: "小寶寶", balloon: "氣球", letter: "37 區的心聲", map: "通勤路線圖",
};
const CARRY = {
  luggage: { size: [0.07, 0.1, 0.05], color: 0x5da7c9, off: [0.07, 0.04, 0.02], low: true },
  briefcase: { size: [0.07, 0.05, 0.02], color: 0x3d3a36, off: [0.07, 0.07, 0] },
  crate: { size: [0.09, 0.05, 0.07], color: 0xb48560, off: [0, 0.2, 0.06] },
  fruit: { size: [0.09, 0.05, 0.07], color: 0xf2a93b, off: [0, 0.2, 0.06] },
  seedling: { size: [0.05, 0.05, 0.05], color: 0x6fae5a, off: [0, 0.17, 0.07] },
  house: { size: [0.06, 0.06, 0.06], color: 0xf08aa2, off: [0, 0.18, 0.07] },
  baby: { size: [0.08, 0.07, 0.12], color: 0xd93f72, off: [0, 0.05, 0.12], low: true },
  balloon: { size: [0.06, 0.07, 0.06], color: 0xf2c230, off: [0.06, 0.42, 0] },
  letter: { size: [0.07, 0.05, 0.012], color: 0xfff8f4, off: [0, 0.17, 0.065] },
  map: { size: [0.08, 0.06, 0.01], color: 0xfcea8b, off: [0, 0.17, 0.065] },
};

function makeMesh(THREE, geo, mat, n, scene) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.castShadow = false;
  m.frustumCulled = false;
  scene.add(m);
  return m;
}

export function makePeople(THREE, scene, { L, graph, flows, reduced, quality }) {
  const rnd = mulberry32(400);
  const walkers = [];
  const low = quality === "low";

  const randomNode = (islandId) => graph.key(islandId, Math.floor(rnd() * 12));
  const addWalker = (route, role, carry, flow, speed) => {
    if (!route || route.length < 2) return;
    walkers.push({
      route, role, carry, flow,
      seg: lengths(route),
      t: rnd(), dir: rnd() < 0.5 ? 1 : -1, pause: 0,
      speed: speed ?? 0.32 + rnd() * 0.08,
      phase: rnd(),
      shirt: ROLES[role]?.shirt ?? CASUAL[Math.floor(rnd() * CASUAL.length)],
      pants: [0x3d3f52, 0x4a5568, 0x6b5b4b, 0x2f3b45][Math.floor(rnd() * 4)],
      skin: SKIN[Math.floor(rnd() * SKIN.length)],
      hair: role === "ambient" && rnd() < 0.2 ? HAIR[4] : HAIR[Math.floor(rnd() * 4)],
    });
  };
  function lengths(route) {
    const out = [0];
    for (let i = 1; i < route.length; i++) out.push(out[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z));
    return out;
  }

  // 串聯線的路線：from 島 → to 島
  const flowPaths = [];
  for (const f of flows) {
    const tos = Array.isArray(f.to) ? f.to : [f.to];
    for (const to of tos) {
      const a = graph.key(f.from, 2 * Math.floor(rnd() * 6) + 1);
      const b = graph.key(to, 2 * Math.floor(rnd() * 6) + 1);
      const route = graph.path(a, b);
      if (!route) continue;
      flowPaths.push({ flow: f, to, route });
      const n = low ? 1 : tos.length > 1 ? 1 : f.both ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const r2 = graph.path(randomNode(f.from), randomNode(to)) || route;
        addWalker(r2, f.walker, f.carry, f, undefined);
      }
    }
  }
  // 在島上散步的市民
  const ambientCount = low ? 6 : 12;
  for (let i = 0; i < ambientCount; i++) {
    const isl = L.islands[i % L.islands.length];
    const a = Math.floor(rnd() * 12);
    const nodes = [];
    for (let j = 0; j < 5; j++) nodes.push(graph.key(isl.id, (a + j) % 12));
    const route = nodes.map((id) => ({ ...graph.pos.get(id), id, bridge: null }));
    addWalker(route, "ambient", null, null, 0.18 + rnd() * 0.08);
  }

  const N = walkers.length;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
  const body = makeMesh(THREE, new THREE.CylinderGeometry(0.05, 0.056, 0.11, 10).translate(0, 0.055, 0), mat, N, scene);
  const head = makeMesh(THREE, new THREE.SphereGeometry(0.06, 14, 10), mat, N, scene);
  const hair = makeMesh(THREE, new THREE.SphereGeometry(0.063, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat, N, scene);
  const leg = makeMesh(THREE, new THREE.BoxGeometry(0.028, 0.075, 0.028).translate(0, -0.0375, 0), mat, N * 2, scene);
  const arm = makeMesh(THREE, new THREE.BoxGeometry(0.022, 0.07, 0.022).translate(0, -0.035, 0), mat, N * 2, scene);
  const acc = makeMesh(THREE, new THREE.BoxGeometry(1, 1, 1), mat, N, scene);
  const hat = makeMesh(THREE, new THREE.ConeGeometry(1, 1, 12), mat, N, scene);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x3a2e24, transparent: true, opacity: 0.22, depthWrite: false });
  const shadow = makeMesh(THREE, new THREE.CircleGeometry(0.07, 14).rotateX(-Math.PI / 2), shadowMat, N, scene);
  shadow.renderOrder = 3;
  for (const m of [body, head, hair]) m.userData.walkerPick = true;

  const color = new THREE.Color();
  walkers.forEach((w, i) => {
    body.setColorAt(i, color.setHex(w.shirt));
    head.setColorAt(i, color.setHex(w.skin));
    hair.setColorAt(i, color.setHex(w.hair));
    leg.setColorAt(i * 2, color.setHex(w.pants));
    leg.setColorAt(i * 2 + 1, color.setHex(w.pants));
    arm.setColorAt(i * 2, color.setHex(w.shirt));
    arm.setColorAt(i * 2 + 1, color.setHex(w.shirt));
    const c = w.carry ? CARRY[w.carry] : null;
    acc.setColorAt(i, color.setHex(c ? c.color : 0xffffff));
    hat.setColorAt(i, color.setHex(ROLES[w.role]?.hat ?? 0xffffff));
  });
  for (const m of [body, head, hair, leg, arm, acc, hat]) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  // ---------- 騎單車的妃妃市長 ----------
  const feifei = buildFeifei(THREE);
  scene.add(feifei.group);
  const loopIds = ["tainan", "technology", "agriculture", "tourism", "welfare", "transport", "sister"].filter((id) => L.byId.has(id));
  let loop = [];
  const startNode = graph.key(loopIds[0], 1);
  let cur = startNode;
  for (let i = 1; i <= loopIds.length; i++) {
    // 每段從上一段的終點接續，最後回到起點，路線才會連續
    const next = i < loopIds.length ? graph.key(loopIds[i], [7, 9, 11, 1, 3, 5][i % 6]) : startNode;
    const seg = graph.path(cur, next);
    if (seg) loop = loop.concat(loop.length ? seg.slice(1) : seg);
    cur = next;
  }
  const loopLen = lengths(loop);
  let ffDist = 0;
  // 彩蛋：被點到時跳一下（秒數倒數）
  let ffHop = 0, sisHop = 0;
  const HOP = 0.7;

  // ---------- 抱小熊的姐姐妃妃（站在姐姐島） ----------
  const sister = buildSister(THREE);
  const sis = L.byId.get("sister");
  if (sis) {
    // 站在島的最前緣（南端頂點內側），樹與細項都避開這個位置
    sister.group.position.set(sis.cx + SISTER_SPOT[0], TOP, sis.cz + SISTER_SPOT[1]);
    sister.group.rotation.y = -0.45;
    scene.add(sister.group);
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const local = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let visible = true;
  let scaleK = 1;

  function sampleRoute(route, seg, d) {
    const total = seg[seg.length - 1];
    d = clamp(d, 0, total);
    let i = 1;
    while (i < seg.length - 1 && seg[i] < d) i++;
    const a = route[i - 1], b = route[i];
    const len = seg[i] - seg[i - 1] || 1;
    const t = (d - seg[i - 1]) / len;
    const br = b.bridge || null;
    let y = TOP;
    if (br && a.id && b.id && a.id.split(":")[0] !== b.id.split(":")[0]) y = TOP + 0.03 + Math.sin(t * Math.PI) * br.arch;
    return { x: a.x + (b.x - a.x) * t, y, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
  }

  function place(mesh, idx, x, y, z, yaw, sx, sy, sz, rx = 0) {
    e.set(rx, yaw, 0, "YXZ");
    q.setFromEuler(e);
    p.set(x, y, z);
    s.set(sx, sy, sz);
    m4.compose(p, q, s);
    mesh.setMatrixAt(idx, m4);
  }
  function placeLocal(mesh, idx, base, yaw, lx, ly, lz, sx, sy, sz, rx = 0) {
    local.set(lx, ly, lz).applyAxisAngle(up, yaw);
    place(mesh, idx, base.x + local.x, base.y + local.y, base.z + local.z, yaw, sx, sy, sz, rx);
  }

  function update(dt, time, frozen, camDist) {
    scaleK = 0.62 * clamp(camDist / 16, 1, 1.7);
    const k = scaleK;
    walkers.forEach((w, i) => {
      const total = w.seg[w.seg.length - 1];
      if (!frozen && !reduced) {
        if (w.pause > 0) {
          w.pause -= dt;
        } else {
          w.t += (w.dir * w.speed * dt) / Math.max(total, 0.001);
          if (w.t >= 1 || w.t <= 0) {
            w.t = clamp(w.t, 0, 1);
            w.dir *= -1;
            w.pause = 1.4;
          }
        }
      }
      const st = sampleRoute(w.route, w.seg, w.t * total);
      const yaw = st.yaw + (w.dir < 0 ? Math.PI : 0);
      const moving = w.pause <= 0 && !frozen && !reduced;
      const ph = time * 9 + w.phase * 20;
      const swing = moving ? Math.sin(ph) : 0;
      const bob = moving ? Math.abs(Math.sin(ph)) * 0.012 : 0;
      const base = { x: st.x, y: st.y + bob, z: st.z };
      const hip = 0.075 * k;
      placeLocal(leg, i * 2, base, yaw, -0.017 * k, hip, 0, k, k, k, swing * 0.55);
      placeLocal(leg, i * 2 + 1, base, yaw, 0.017 * k, hip, 0, k, k, k, -swing * 0.55);
      placeLocal(body, i, base, yaw, 0, hip - 0.004 * k, 0, k, k, k);
      const holding = w.carry && !CARRY[w.carry].low;
      placeLocal(arm, i * 2, base, yaw, -0.062 * k, hip + 0.1 * k, 0, k, k, k, holding ? -1.2 : -swing * 0.45);
      placeLocal(arm, i * 2 + 1, base, yaw, 0.062 * k, hip + 0.1 * k, 0, k, k, k, holding ? -1.2 : swing * 0.45);
      placeLocal(head, i, base, yaw, 0, hip + 0.17 * k, 0, k, k, k);
      placeLocal(hair, i, base, yaw, 0, hip + 0.178 * k, -0.004 * k, k, k, k);
      const role = ROLES[w.role] || {};
      if (role.hat) {
        const douli = role.hatKind === "douli";
        placeLocal(hat, i, base, yaw, 0, hip + (douli ? 0.225 : 0.22) * k, 0, (douli ? 0.11 : 0.05) * k, (douli ? 0.05 : 0.03) * k, (douli ? 0.11 : 0.05) * k);
      } else place(hat, i, 0, -50, 0, 0, 0.0001, 0.0001, 0.0001);
      if (w.carry) {
        const c = CARRY[w.carry];
        placeLocal(acc, i, base, yaw, c.off[0] * k, c.off[1] * k + (c.low ? 0 : hip * 0.2), c.off[2] * k, c.size[0] * k, c.size[1] * k, c.size[2] * k);
      } else place(acc, i, 0, -50, 0, 0, 0.0001, 0.0001, 0.0001);
      place(shadow, i, st.x, st.y + 0.006, st.z, 0, k, 1, k);
      w.pos = base;
    });
    for (const m of [body, head, hair, leg, arm, acc, hat, shadow]) m.instanceMatrix.needsUpdate = true;

    // 妃妃市長騎車繞島
    if (loop.length > 1) {
      if (!frozen && !reduced) ffDist = (ffDist + dt * 0.62) % loopLen[loopLen.length - 1];
      const st = sampleRoute(loop, loopLen, ffDist);
      ffHop = Math.max(0, ffHop - dt);
      const jump = ffHop > 0 ? Math.sin((1 - ffHop / HOP) * Math.PI) * 0.09 * k : 0;
      feifei.group.position.set(st.x, st.y + jump, st.z);
      feifei.group.rotation.y = st.yaw;
      feifei.group.scale.setScalar(k * 1.25);
      feifei.pedal(!frozen && !reduced ? time : 0);
    }
    if (sis) {
      sister.group.scale.setScalar(k * 1.3);
      sister.wave(!frozen && !reduced ? time : 0);
      sisHop = Math.max(0, sisHop - dt);
      sister.bearHop(sisHop > 0 ? 1 - sisHop / HOP : 0);
    }
  }

  function setVisible(v) {
    visible = v;
    for (const m of [body, head, hair, leg, arm, acc, hat, shadow]) m.visible = v;
    feifei.group.visible = v;
    sister.group.visible = v;
  }

  function walkerAt(mesh, id) {
    if (mesh === body || mesh === head || mesh === hair) return walkers[id] || null;
    return null;
  }

  function positionOfFeifei(out) {
    return out.copy(feifei.group.position);
  }

  return {
    update, setVisible, walkerAt, walkers, flowPaths,
    feifei, sister,
    hopFeifei() { ffHop = HOP; },
    hopSister() { sisHop = HOP; },
    meshes: [body, head, hair],
    get visible() { return visible; },
    positionOfFeifei,
    _pos: pos,
  };
}

// Q 版妃妃市長：薄荷綠上衣、黑袖套、黑長褲、白鞋、深棕短髮，騎白色單車
function buildFeifei(THREE) {
  const g = new THREE.Group();
  g.name = "feifei";
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const M = {
    shirt: mat(0x5fc29a), black: mat(0x2b2b2e), skin: mat(0xf6d2b8), hair: mat(0x3e2721),
    white: mat(0xf4f4f2), frame: mat(0xe9ecef, { metalness: 0.2, roughness: 0.4 }), tire: mat(0x26262a),
    green: mat(0x2f8a4f), eye: mat(0x2a1a14),
  };
  const add = (geo, m, x, y, z, parent = g) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData.feifei = true;
    parent.add(mesh);
    return mesh;
  };
  // 單車
  const wheelGeo = new THREE.TorusGeometry(0.075, 0.012, 8, 20);
  const wf = add(wheelGeo, M.tire, 0, 0.087, 0.12); wf.rotation.y = Math.PI / 2;
  const wb = add(wheelGeo, M.tire, 0, 0.087, -0.12); wb.rotation.y = Math.PI / 2;
  const rod = (a, b, r, m) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const mesh = add(new THREE.CylinderGeometry(r, r, d.length(), 6), m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return mesh;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  rod(V(0, 0.087, -0.12), V(0, 0.15, 0.0), 0.009, M.frame);
  rod(V(0, 0.15, 0.0), V(0, 0.2, 0.09), 0.009, M.frame);
  rod(V(0, 0.087, 0.12), V(0, 0.2, 0.09), 0.009, M.frame);
  rod(V(0, 0.087, -0.12), V(0, 0.19, -0.04), 0.008, M.green);
  rod(V(-0.05, 0.225, 0.095), V(0.05, 0.225, 0.095), 0.007, M.black);
  add(new THREE.BoxGeometry(0.035, 0.012, 0.06), M.black, 0, 0.2, -0.045);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), M.green, 0.018, 0.14, 0.02);
  // 人
  const torso = add(new THREE.CylinderGeometry(0.048, 0.055, 0.11, 12), M.shirt, 0, 0.27, -0.02);
  torso.rotation.x = 0.35;
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 8), M.shirt, 0, 0.33, 0.0);
  const head = add(new THREE.SphereGeometry(0.068, 18, 14), M.skin, 0, 0.395, 0.015);
  const hairM = add(new THREE.SphereGeometry(0.073, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), M.hair, 0, 0.405, 0.008);
  hairM.rotation.x = -0.15;
  for (const x of [-0.024, 0.024]) add(new THREE.SphereGeometry(0.011, 8, 6), M.eye, x, 0.395, 0.078);
  void head;
  const armGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.1, 6);
  for (const x of [-0.045, 0.045]) {
    const a = add(armGeo, M.black, x, 0.27, 0.05);
    a.rotation.x = 1.0;
  }
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.11, 6).translate(0, -0.055, 0);
  for (const x of [-0.026, 0.026]) {
    const piv = new THREE.Group();
    piv.position.set(x, 0.21, -0.04);
    g.add(piv);
    const l = add(legGeo, M.black, 0, 0, 0, piv);
    add(new THREE.BoxGeometry(0.03, 0.022, 0.05), M.white, 0, -0.112, 0.012, piv);
    void l;
    legs.push(piv);
  }
  g.traverse((o) => { if (o.isMesh) o.userData.feifei = true; });
  return {
    group: g,
    pedal(t) {
      legs[0].rotation.x = Math.sin(t * 7) * 0.6 - 0.3;
      legs[1].rotation.x = Math.sin(t * 7 + Math.PI) * 0.6 - 0.3;
      wf.rotation.x = wb.rotation.x = 0;
      wf.rotation.z = wb.rotation.z = t * 6;
    },
  };
}

// 姐姐妃妃：米色外套、深藍牛仔褲、紅棕短髮，抱著小熊
function buildSister(THREE) {
  const g = new THREE.Group();
  g.name = "sister";
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const M = {
    jacket: mat(0xe9dcc1), jeans: mat(0x2c3e66), skin: mat(0xf6d2b8), hair: mat(0x7a3424),
    shoe: mat(0xf1d9d2), bear: mat(0xd9ad6c), bearShirt: mat(0x2e4f9e), eye: mat(0x2a1a14),
  };
  const add = (geo, m, x, y, z, parent = g) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData.sister = true;
    parent.add(mesh);
    return mesh;
  };
  for (const x of [-0.025, 0.025]) {
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), M.jeans, x, 0.05, 0);
    add(new THREE.BoxGeometry(0.035, 0.022, 0.055), M.shoe, x, 0.01, 0.01);
  }
  add(new THREE.CylinderGeometry(0.052, 0.06, 0.12, 12), M.jacket, 0, 0.16, 0);
  add(new THREE.SphereGeometry(0.072, 18, 14), M.skin, 0, 0.29, 0.005);
  const h = add(new THREE.SphereGeometry(0.077, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), M.hair, 0, 0.3, -0.002);
  h.rotation.x = -0.12;
  for (const x of [-0.025, 0.025]) add(new THREE.SphereGeometry(0.011, 8, 6), M.eye, x, 0.29, 0.07);
  // 小熊
  const bear = new THREE.Group();
  bear.position.set(0.03, 0.15, 0.06);
  g.add(bear);
  add(new THREE.SphereGeometry(0.04, 12, 10), M.bearShirt, 0, 0, 0, bear);
  add(new THREE.SphereGeometry(0.032, 12, 10), M.bear, 0, 0.052, 0.004, bear);
  for (const x of [-0.022, 0.022]) add(new THREE.SphereGeometry(0.011, 8, 6), M.bear, x, 0.078, 0, bear);
  const wave = new THREE.Group();
  wave.position.set(-0.055, 0.2, 0);
  g.add(wave);
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 6).translate(0, 0.045, 0), M.jacket, 0, 0, 0, wave);
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 6), M.jacket, 0.05, 0.19, 0.04).rotation.z = 1.2;
  g.traverse((o) => { if (o.isMesh) o.userData.sister = true; });
  return {
    group: g,
    wave(t) {
      wave.rotation.z = 0.5 + Math.sin(t * 4) * 0.35;
      bear.rotation.y = Math.sin(t * 1.5) * 0.15;
    },
    // p：0～1 跳一下並轉一圈，0＝抱在手上
    bearHop(p) {
      bear.position.y = 0.15 + (p > 0 ? Math.sin(p * Math.PI) * 0.12 : 0);
      if (p > 0) bear.rotation.y = p * Math.PI * 2;
    },
  };
}
