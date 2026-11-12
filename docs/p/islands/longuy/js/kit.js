// 實例化零件庫：建模函式只把 {kind, matrix, color, owner} 推進陣列，
// 最後每種「幾何 × 材質 × LOD」只建一個 InstancedMesh，靜態物件合計約 30–40 個 draw call。
import { RoundedBoxGeometry } from "../vendor/addons/RoundedBoxGeometry.js";
import { mixHex } from "./util.js?v=20261029-3";

function gableGeometry(THREE) {
  // 三角柱屋頂：底寬 1（x）、高 1（y）、深 1（z），屋脊沿 z
  const p = [
    [-0.5, 0, -0.5], [0.5, 0, -0.5], [0, 1, -0.5],
    [-0.5, 0, 0.5], [0.5, 0, 0.5], [0, 1, 0.5],
  ];
  const tris = [
    [0, 2, 1], [3, 4, 5], // 山牆
    [0, 3, 5], [0, 5, 2], // 左坡
    [1, 2, 5], [1, 5, 4], // 右坡
    [0, 1, 4], [0, 4, 3], // 底
  ];
  const pos = [];
  for (const t of tris) for (const i of t) pos.push(...p[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function baseAnchored(g) {
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0);
  return g;
}

// low 畫質用較少面數：小物件數量多，三角形數差距明顯
export function createGeometries(THREE, quality = "high") {
  const lo = quality === "low";
  const G = {
    box: baseAnchored(new THREE.BoxGeometry(1, 1, 1)),
    rbox: baseAnchored(new RoundedBoxGeometry(1, 1, 1, lo ? 1 : 2, 0.12)),
    cyl: baseAnchored(new THREE.CylinderGeometry(1, 1, 1, lo ? 9 : 14)),
    cyl6: baseAnchored(new THREE.CylinderGeometry(1, 1, 1, 6)),
    cone: baseAnchored(new THREE.ConeGeometry(1, 1, lo ? 8 : 12)),
    hip: baseAnchored(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4)),
    gable: gableGeometry(THREE),
    sphere: new THREE.SphereGeometry(1, lo ? 9 : 14, lo ? 6 : 10),
    ico: new THREE.IcosahedronGeometry(1, lo ? 0 : 1),
    dome: new THREE.SphereGeometry(1, lo ? 9 : 14, lo ? 4 : 7, 0, Math.PI * 2, 0, Math.PI / 2),
    torus: new THREE.TorusGeometry(1, 0.14, lo ? 5 : 8, lo ? 16 : 28).rotateX(Math.PI / 2),
  };
  return G;
}

export function makeKit(THREE, { jitterSeed = 7, quality = "high" } = {}) {
  const G = createGeometries(THREE, quality);
  const solid = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.6, metalness: 0, emissive: 0xffc777, emissiveIntensity: 0,
  });
  const buckets = new Map(); // key -> {kind, glow, small, mats[], cols[], owners[]}
  const stack = [new THREE.Matrix4()];
  let owner = null;
  let small = false;
  let seed = jitterSeed >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();

  function push(kind, pos, rot, scl, color, opts = {}) {
    const isGlow = !!opts.glow;
    const isSmall = opts.small ?? small;
    const key = `${kind}|${isGlow ? 1 : 0}|${isSmall ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) {
      b = { kind, glow: isGlow, small: isSmall, mats: [], cols: [], owners: [] };
      buckets.set(key, b);
    }
    const j = 1 + (rnd() - 0.5) * 0.0144; // ±0.72% 抖動，避免共面閃爍
    _e.set(rot[0], rot[1], rot[2], "YXZ");
    _q.setFromEuler(_e);
    _p.set(pos[0], pos[1], pos[2]);
    _s.set(scl[0] * j, scl[1] * j, scl[2] * j);
    _m.compose(_p, _q, _s);
    const world = new THREE.Matrix4().multiplyMatrices(stack[stack.length - 1], _m);
    b.mats.push(world);
    b.cols.push(color);
    b.owners.push(opts.owner ?? owner);
  }

  const R = (o) => [o.rx || 0, o.ry || 0, o.rz || 0];

  const k = {
    THREE,
    G,
    // 變換堆疊：模型在單位空間設計，再整組放到島上
    begin(position, rotY = 0, scale = 1, sy = scale) {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
        new THREE.Vector3(scale, sy, scale),
      );
      stack.push(new THREE.Matrix4().multiplyMatrices(stack[stack.length - 1], m));
    },
    end() {
      if (stack.length > 1) stack.pop();
    },
    setOwner(id) { owner = id; },
    getOwner() { return owner; },
    setSmall(v) { small = !!v; },

    box(x, y, z, sx, sy, sz, c, o = {}) { push(o.round ? "rbox" : "box", [x, y, z], R(o), [sx, sy, sz], c, o); },
    rbox(x, y, z, sx, sy, sz, c, o = {}) { push("rbox", [x, y, z], R(o), [sx, sy, sz], c, o); },
    cyl(x, y, z, r, h, c, o = {}) { push(o.hex ? "cyl6" : "cyl", [x, y, z], R(o), [r, h, o.rz2 ?? r], c, o); },
    cone(x, y, z, r, h, c, o = {}) { push("cone", [x, y, z], R(o), [r, h, r], c, o); },
    hip(x, y, z, sx, sy, sz, c, o = {}) { push("hip", [x, y, z], R(o), [sx, sy, sz], c, o); },
    gable(x, y, z, sx, sy, sz, c, o = {}) { push("gable", [x, y, z], R(o), [sx, sy, sz], c, o); },
    sphere(x, y, z, r, c, o = {}) { push("sphere", [x, y, z], R(o), [r, o.sy ?? r, o.sz ?? r], c, o); },
    ico(x, y, z, r, c, o = {}) { push("ico", [x, y, z], R(o), [r, o.sy ?? r, o.sz ?? r], c, o); },
    dome(x, y, z, r, c, o = {}) { push("dome", [x, y, z], R(o), [r, o.sy ?? r, r], c, o); },
    torus(x, y, z, r, c, o = {}) { push("torus", [x, y, z], R(o), [r, o.sy ?? r, r], c, o); },
    // 兩點之間的細桿（欄杆、纜線、支架）
    rod(a, b, r, c, o = {}) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-5) return;
      const dir = new THREE.Vector3(dx, dy, dz).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
      push(o.box ? "box" : "cyl", a, [e.x, e.y, e.z], [r, len, r], c, o);
    },
  };

  // 建立 InstancedMesh；回傳 {group, meshes, ownerIndex}
  k.build = function build(scene) {
    const group = new THREE.Group();
    group.name = "kit";
    const meshes = [];
    const ownerIndex = new Map();
    const color = new THREE.Color();
    for (const b of buckets.values()) {
      const mesh = new THREE.InstancedMesh(G[b.kind], b.glow ? glow : solid, b.mats.length);
      mesh.castShadow = !b.glow && !b.small;
      mesh.receiveShadow = true;
      for (let i = 0; i < b.mats.length; i++) {
        mesh.setMatrixAt(i, b.mats[i]);
        mesh.setColorAt(i, color.setHex(b.cols[i]));
        const ow = b.owners[i];
        if (ow) {
          let arr = ownerIndex.get(ow);
          if (!arr) ownerIndex.set(ow, (arr = []));
          arr.push({ mesh, i, base: b.cols[i] });
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.userData.owners = b.owners;
      mesh.userData.small = b.small;
      mesh.userData.pickable = true;
      group.add(mesh);
      meshes.push(mesh);
    }
    scene.add(group);
    buckets.clear();
    return { group, meshes, ownerIndex };
  };

  k.materials = { solid, glow };
  return k;
}

// 依 owner 改色（tint=null 還原）；走 Color 物件，讓 sRGB→線性轉換和建立時一致
export function setOwnerColor(THREE, ownerIndex, id, tint, amount) {
  const arr = ownerIndex.get(id);
  if (!arr) return;
  const color = new THREE.Color();
  const touched = new Set();
  for (const it of arr) {
    const hex = tint == null ? it.base : mixHex(it.base, tint, amount);
    it.mesh.setColorAt(it.i, color.setHex(hex));
    touched.add(it.mesh);
  }
  for (const m of touched) m.instanceColor.needsUpdate = true;
}
