// 環境：天空、日夜、光線、海、台南地形（西邊台灣海峽、東邊平原與丘陵、曾文溪、魚塭、月世界）
import { WATER_Y } from "./world.js?v=20261029-3";
import { clamp, smoothstep, makeNoise2D, fbm, mulberry32, mixHex } from "./util.js?v=20261029-3";

// 分鐘, skyTop, horizon, sunColor, sunI, hemiSky, hemiGround, hemiI, night, water
const KEYS = [
  [0, 0x172544, 0x36476f, 0xaec0f2, 1.15, 0x8f9ed2, 0x5f5668, 1.85, 1, 0x4e7ba6],
  [300, 0x1f3160, 0x495684, 0xb6c4f6, 1.0, 0x93a2d6, 0x615a6a, 1.85, 1, 0x5080ac],
  [360, 0x8382b4, 0xf8c0a0, 0xffb07e, 1.3, 0xf2c3b0, 0x6a5a56, 1.1, 0.55, 0x8fb4c2],
  [450, 0xa6cfe8, 0xfce7d0, 0xffe6c2, 2.4, 0xe9f1f5, 0x887965, 1.25, 0, 0x9ecfd8],
  [720, 0x93ccec, 0xf7f0e2, 0xfff3d9, 3.0, 0xedf6f9, 0x8d8068, 1.35, 0, 0xa4d6da],
  [960, 0xa3cfe6, 0xfae8cf, 0xffe4ba, 2.5, 0xf0efe6, 0x8a7b64, 1.25, 0, 0x9cccd1],
  [1065, 0x8a84b6, 0xf8ad7c, 0xff9456, 1.9, 0xf6cdb1, 0x7b645c, 1.2, 0.3, 0x8fa2b6],
  [1140, 0x53508e, 0xdb94a4, 0xff916f, 1.35, 0xbcaade, 0x62545f, 1.35, 0.75, 0x62749b],
  [1260, 0x1d2d57, 0x41527f, 0xbac6f8, 1.2, 0x95a4d8, 0x635a6a, 1.9, 1, 0x4e7ba6],
  [1440, 0x172544, 0x36476f, 0xaec0f2, 1.15, 0x8f9ed2, 0x5f5668, 1.85, 1, 0x4e7ba6],
];

function sampleKeys(min) {
  const m = ((min % 1440) + 1440) % 1440;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= m) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = (m - a[0]) / (b[0] - a[0]);
  const out = [];
  for (let k = 1; k < a.length; k++) {
    out.push(k === 4 || k === 7 || k === 8 ? a[k] + (b[k] - a[k]) * t : mixHex(a[k], b[k], t));
  }
  return { skyTop: out[0], horizon: out[1], sun: out[2], sunI: out[3], hemiSky: out[4], hemiGround: out[5], hemiI: out[6], night: out[7], water: out[8] };
}

// 海岸線：x 大於此值為陸地（台南在東）
export function coastX(z) {
  return 11.5 + 3.5 * Math.sin(z * 0.045 + 0.6) + 1.6 * Math.sin(z * 0.13 + 2.1);
}
// 曾文溪河道中心線（從島群間的河道往東進入丘陵）
export function riverZ(x) {
  return -2.35 - Math.max(0, x - 9) * 0.11 + 1.3 * Math.sin(Math.max(0, x - 9) * 0.09);
}

export function makeScenery(THREE, scene, { quality = "high", reduced = false, center = { x: 0, z: 0 } } = {}) {
  const low = quality === "low";
  const noise = makeNoise2D(20261124);
  const noise2 = makeNoise2D(400);

  // ---------- 天空 ----------
  const skyU = {
    uTop: { value: new THREE.Color(0x93ccec) },
    uHorizon: { value: new THREE.Color(0xf7f0e2) },
    uSunDir: { value: new THREE.Vector3(0.3, 0.6, 0.7) },
    uSun: { value: new THREE.Color(0xfff3d9) },
    uNight: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSun; uniform float uNight;
        varying vec3 vDir;
        float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec3 d = normalize(vDir);
          vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.55, d.y));
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSun * pow(s, 18.0) * 0.35 * (1.0 - uNight * 0.7);
          if (uNight > 0.01 && d.y > 0.05) {
            float h = hash(floor(d * 180.0));
            col += vec3(step(0.9965, h)) * uNight * smoothstep(0.05, 0.3, d.y) * 0.9;
          }
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  scene.fog = new THREE.Fog(0xf7f0e2, 42, 150);

  // ---------- 光線 ----------
  const hemi = new THREE.HemisphereLight(0xedf6f9, 0x8d8068, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d9, 2.9);
  sun.castShadow = true;
  const sm = quality === "high" ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera;
  sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(center.x, 0, center.z);
  const fill = new THREE.DirectionalLight(0xbcd4fb, 0.35);
  fill.position.set(-20, 18, -14);
  scene.add(fill);

  // ---------- 海 ----------
  const waterU = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(0x9fd3d7) },
      uDeep: { value: new THREE.Color(0x6aa5b5) },
      uCenter: { value: new THREE.Vector2(center.x, center.z) },
      uNight: { value: 0 },
    },
  ]);
  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterU,
    fog: true,
    vertexShader: `
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uShallow; uniform vec3 uDeep; uniform vec2 uCenter; uniform float uNight;
      varying vec3 vW;
      #include <fog_pars_fragment>
      void main(){
        float d = length(vW.xz - uCenter);
        vec3 col = mix(uShallow, uDeep, smoothstep(7.0, 60.0, d));
        float w1 = sin(vW.x*0.55 + uTime*0.6) * sin(vW.z*0.48 - uTime*0.45);
        float w2 = sin((vW.x+vW.z)*0.9 - uTime*0.9) * 0.5;
        col += (w1*0.025 + w2*0.018);
        float sp = pow(max(0.0, sin(vW.x*2.7+uTime*1.3)*sin(vW.z*2.3-uTime*1.1)), 24.0);
        col += sp * 0.22 * (1.0 - uNight);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(160, 72).rotateX(-Math.PI / 2), waterMat);
  water.position.y = WATER_Y;
  water.receiveShadow = false;
  water.userData.water = true;
  scene.add(water);

  // ---------- 地形 ----------
  const SIZE = 170;
  const SEG = low ? 110 : 160;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  const colors = new Float32Array(tp.count * 3);
  const tmp = new THREE.Color();
  const ponds = (x, z) => {
    // 沿海魚塭：方格水面與田埂
    const inN = z > -34 && z < -9 && x > coastX(z) + 0.8 && x < coastX(z) + 13;
    const inS = z > 9 && z < 30 && x > coastX(z) + 0.8 && x < coastX(z) + 9;
    if (!inN && !inS) return 0;
    const cx = ((x % 3.2) + 3.2) % 3.2, cz = ((z % 2.3) + 2.3) % 2.3;
    const dike = cx < 0.32 || cz < 0.3;
    return dike ? 1 : 2;
  };
  const heightAt = (x, z) => {
    const c = coastX(z);
    const d = x - c;
    if (d < 0) return -1.6 + d * 0.02;
    let h = 0.05 + Math.min(d, 30) * 0.01 + fbm(noise, x * 0.06, z * 0.06, 3) * 0.12;
    // 東側丘陵與山（梯田量化）
    const hill = smoothstep(19, 46, x) * (1.4 + 4.6 * clamp(fbm(noise, x * 0.035 + 3, z * 0.035, 4) + 0.55, 0, 1.3));
    // 月世界泥岩：東南方較尖銳的灰色稜線
    const bad = smoothstep(24, 30, x) * (1 - smoothstep(40, 48, x)) * smoothstep(6, 12, z) * (1 - smoothstep(26, 32, z));
    const ridges = bad * Math.abs(noise2(x * 0.35, z * 0.35)) * 2.6;
    h += hill * (1 - bad * 0.6) + ridges;
    if (h > 1.2) h = Math.round(h / 0.38) * 0.38 + (h % 0.38) * 0.25;
    // 曾文溪河谷
    const rz = riverZ(x);
    const w = 0.9 + Math.max(0, x - 9) * 0.03;
    const rd = Math.abs(z - rz);
    if (x > c - 2) h = Math.min(h, -0.75 + smoothstep(w, w + 2.2, rd) * (h + 0.75));
    // 魚塭
    const p = ponds(x, z);
    if (p === 2) h = -0.42;
    else if (p === 1) h = Math.max(h, 0.06);
    return h;
  };
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i) + center.x, z = tp.getZ(i) + center.z;
    const h = heightAt(x, z);
    tp.setY(i, h);
    const d = x - coastX(z);
    let c;
    if (h < WATER_Y) c = 0x8fb3ad;
    else if (d < 1.4) c = 0xe2d3ad; // 沙灘
    else if (ponds(x, z) === 1) c = 0xcfc29a; // 魚塭田埂
    else if (h < 0.9) {
      // 平原田區：稻田、甘蔗田、果園交錯
      const cell = Math.floor(x / 3.1) * 73856093 ^ Math.floor(z / 2.6) * 19349663;
      const r = mulberry32(cell >>> 0)();
      c = r < 0.35 ? 0xb8cc86 : r < 0.6 ? 0xa3bf78 : r < 0.8 ? 0xcbd08f : 0x95b072;
    } else {
      const bad = smoothstep(24, 30, x) * (1 - smoothstep(40, 48, x)) * smoothstep(6, 12, z) * (1 - smoothstep(26, 32, z));
      c = h < 2 ? 0xa7bd88 : h < 3.8 ? 0x8eaa72 : h < 5.6 ? 0x779468 : 0x9aa08a;
      if (bad > 0.3) c = mixHex(c, 0xbdb5a6, Math.min(1, bad * 1.2));
    }
    tmp.setHex(c);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  tg.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, flatShading: true }));
  terrain.position.set(center.x, 0, center.z);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------- 背景樹 ----------
  const treeGeoCone = new THREE.ConeGeometry(0.5, 1.4, 6).translate(0, 1.0, 0);
  const treeGeoBall = new THREE.IcosahedronGeometry(0.62, 0).translate(0, 0.95, 0);
  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 5).translate(0, 0.25, 0);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const want = low ? 520 : 1300;
  const rnd = mulberry32(37);
  const spots = [];
  for (let tries = 0; tries < want * 8 && spots.length < want; tries++) {
    const x = center.x + 12 + rnd() * 62;
    const z = center.z - 62 + rnd() * 124;
    const h = heightAt(x, z);
    if (h < 0.25 || ponds(x, z)) continue;
    const bad = smoothstep(24, 30, x) * (1 - smoothstep(40, 48, x)) * smoothstep(6, 12, z) * (1 - smoothstep(26, 32, z));
    if (bad > 0.4) continue;
    const onHill = h > 1.1;
    if (!onHill && rnd() > 0.18) continue; // 平原只留防風林
    spots.push([x, h, z, onHill, rnd()]);
  }
  const cones = spots.filter((s) => s[3] && s[4] < 0.45);
  const balls = spots.filter((s) => !(s[3] && s[4] < 0.45));
  const mk = (geo, list, colorFn) => {
    const m = new THREE.InstancedMesh(geo, treeMat, list.length);
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    list.forEach((s, i) => {
      const k = 0.7 + s[4] * 0.8;
      p.set(s[0], s[1] - 0.05, s[2]);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s[4] * 6.28);
      sc.set(k, k * (0.9 + s[4] * 0.3), k);
      mat.compose(p, q, sc);
      m.setMatrixAt(i, mat);
      m.setColorAt(i, tmp.setHex(colorFn(s)));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = false;
    m.receiveShadow = false;
    scene.add(m);
    return m;
  };
  mk(treeGeoCone, cones, (s) => mixHex(0x5f7d55, 0x7a9763, s[4]));
  mk(treeGeoBall, balls, (s) => mixHex(0x6e9160, 0x9db878, s[4]));
  mk(trunkGeo, spots, () => 0x7a5b43);

  // ---------- 遠山剪影 ----------
  const ridges = [];
  for (let b = 0; b < 3; b++) {
    const g = new THREE.BufferGeometry();
    const pts = [];
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const a = -0.95 + (i / n) * 1.9; // 東側半圈
      const rad = 118 - b * 12;
      const x = center.x + Math.cos(a) * rad, z = center.z + Math.sin(a) * rad;
      const hgt = 10 + b * -2 + 9 * Math.abs(Math.sin(i * 0.55 + b * 1.7)) + 5 * Math.sin(i * 0.21 + b);
      pts.push(x, -1, z, x, hgt, z);
    }
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x9fb2b8, side: THREE.DoubleSide, fog: false }));
    m.userData.band = b;
    scene.add(m);
    ridges.push(m);
  }

  // ---------- 雲 ----------
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.12, flatShading: true });
  const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
  const clouds = [];
  const crnd = mulberry32(11);
  for (let c = 0; c < (low ? 7 : 12); c++) {
    const g = new THREE.Group();
    const puffs = 3 + Math.floor(crnd() * 4);
    for (let p = 0; p < puffs; p++) {
      const m = new THREE.Mesh(cloudGeo, cloudMat);
      const s = 1.2 + crnd() * 1.6;
      m.scale.set(s * 1.3, s * 0.8, s);
      m.position.set(p * 1.6 - puffs * 0.8, crnd() * 0.6, crnd() * 1.2);
      g.add(m);
    }
    g.position.set(center.x - 70 + crnd() * 140, 13 + crnd() * 9, center.z - 60 + crnd() * 90);
    g.userData.speed = 0.3 + crnd() * 0.5;
    scene.add(g);
    clouds.push(g);
  }

  // ---------- 日夜更新 ----------
  const sunDir = new THREE.Vector3();
  let nightValue = 0;
  function setTime(minutes) {
    const k = sampleKeys(minutes);
    skyU.uTop.value.setHex(k.skyTop);
    skyU.uHorizon.value.setHex(k.horizon);
    skyU.uSun.value.setHex(k.sun);
    skyU.uNight.value = k.night;
    scene.fog.color.setHex(k.horizon);
    hemi.color.setHex(k.hemiSky);
    hemi.groundColor.setHex(k.hemiGround);
    hemi.intensity = k.hemiI;
    sun.color.setHex(k.sun);
    sun.intensity = k.sunI;
    const mq = Math.round(minutes / 10) * 10;
    const t = clamp((((mq % 1440) + 1440) % 1440 - 360) / 720, 0, 1);
    const az = Math.PI * (0.15 + 0.7 * t);
    const el = 0.35 + Math.sin(t * Math.PI) * 0.75;
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), 0.55 * Math.cos(el) + 0.35).normalize();
    sun.position.set(center.x + sunDir.x * 40, sunDir.y * 40, center.z + sunDir.z * 40);
    skyU.uSunDir.value.copy(sunDir);
    waterU.uShallow.value.setHex(k.water);
    waterU.uDeep.value.setHex(mixHex(k.water, 0x3d6f86, 0.42));
    waterU.uNight.value = k.night;
    const hz = new THREE.Color(k.horizon);
    for (const r of ridges) r.material.color.copy(hz).lerp(new THREE.Color(0x7d8f97), 0.18 + r.userData.band * 0.12);
    fill.intensity = 0.35 + k.night * 0.25;
    nightValue = k.night;
    return k;
  }

  function update(dt, time) {
    waterU.uTime.value = reduced ? 0 : time % 3600; // 32 位元浮點精度：取餘數
    if (!reduced) {
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > center.x + 80) c.position.x = center.x - 80;
      }
    }
  }

  return {
    setTime,
    update,
    get night() { return nightValue; },
    heightAt,
    sun,
    water,
    waterMat,
    terrain,
    ponds,
  };
}
