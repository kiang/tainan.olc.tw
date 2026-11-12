// 台南政策島：主程式
import * as THREE from "../vendor/three.module.min.js";
import { OrbitControls } from "../vendor/addons/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "../vendor/addons/CSS2DRenderer.js";
import { DATA } from "./data.js?v=20261029-3";
import { layoutIslands, placeIslands, makePathNetwork, slotLayout, withinHex, TOP, R } from "./world.js?v=20261029-3";
import { makeScenery } from "./env.js?v=20261029-3";
import { makeKit, setOwnerColor } from "./kit.js?v=20261029-3";
import { buildModel, MODEL_TOP, seededRotation } from "./models.js?v=20261029-3";
import { decorateIslands, buildSeaDecor, createBirds, createFish } from "./decor.js?v=20261029-3";
import { initAudio } from "./audio.js?v=20261029-3";
import { makePeople } from "./people.js?v=20261029-3";
import { createUI, pinColor } from "./ui.js?v=20261029-3";
import { createStamps } from "./stamps.js?v=20261029-3";
import { createPlay } from "./play.js?v=20261029-3";
import { initAnalytics, track } from "./track.js?v=20261029-3";
import { initVisits } from "./visits.js?v=20261029-3";
import { createAvatar } from "./avatar.js?v=20261029-3";
import { createEggs } from "./eggs.js?v=20261029-3";
import { createGame } from "./game.js?v=20261029-3";
import { createAsk } from "./ask.js?v=20261029-3";
import { createDay } from "./day.js?v=20261029-3";
import { clamp, easeInOutCubic, hexNum } from "./util.js?v=20261029-3";

const params = new URLSearchParams(location.search);
// 競選總部觸控展示機：?kiosk=1（24 吋橫放觸控螢幕，HDMI 同步輸出到 LED 牆）
const KIOSK = params.get("kiosk") === "1";
const IDLE_MS = (Number(params.get("idle")) || 60) * 1000;
// 版本資料夾（island2）：離線快取的名稱用它開頭，不同版本不會互相清掉
const FOLDER = new URL("../", import.meta.url).pathname.replace(/\//g, "") || "island";
const reducedMQ = matchMedia("(prefers-reduced-motion: reduce)");
// 版面模式：橫放手機（高度很小）用右側浮動面板；直式手機用底部抽屜
const isLandscapePhone = () => innerHeight <= 500 && innerWidth > innerHeight;
const isMobile = () => !isLandscapePhone() && innerWidth <= 800;
const isCompact = () => isLandscapePhone() || innerWidth <= 800;
const onePanel = () => isCompact() || innerWidth < 1100;
const $ = (id) => document.getElementById(id);

function setLoad(msg) {
  const el = $("load-msg");
  if (el) el.textContent = msg;
}
function fatal(msg) {
  const ld = $("loading");
  ld.classList.remove("done");
  setLoad(msg);
  $("load-fallback").hidden = false;
}

function detectQuality() {
  const q = params.get("quality");
  if (q === "low" || q === "medium" || q === "high") return q;
  if (KIOSK) return "high"; // 展示機是桌上型電腦，觸控螢幕會被誤判成平板
  const coarse = matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width, screen.height) <= 820;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse && small) return mem <= 3 || cores <= 4 ? "low" : "medium";
  if (coarse) return "medium";
  return "high";
}

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

async function start() {
  if (!webglOK()) {
    fatal("這台裝置的瀏覽器無法顯示 3D 畫面（WebGL 未啟用）。可以改用最新版 Chrome、Safari 或 Edge，或直接觀看政策影片。");
    return;
  }
  initAnalytics({ kiosk: KIOSK });
  initVisits({ kiosk: KIOSK });
  const quality = detectQuality();
  const low = quality === "low";
  let reduced = reducedMQ.matches;
  const stage = $("stage");
  const body = document.body;
  if (KIOSK) body.classList.add("kiosk"); // 要在版面計算前加上，尺寸才會用展示機版

  // ---------- Renderer ----------
  setLoad("正在準備畫布…");
  const renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: false, powerPreference: "high-performance" });
  const maxDpr = Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.75 : quality === "medium" ? 1.5 : 1.25);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xf4eee3, 1);
  stage.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(stage.clientWidth, stage.clientHeight);
  labelRenderer.domElement.className = "css2d";
  stage.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, stage.clientWidth / stage.clientHeight, 0.3, 320);

  // ---------- 世界 ----------
  setLoad("正在拼出 7 座政策島…");
  await new Promise((r) => requestAnimationFrame(r));
  const L = layoutIslands(DATA);
  const center = L.center;
  const env = makeScenery(THREE, scene, { quality, reduced, center });
  // 手機（medium／low）一律用減面零件，三角形數約少一半
  const kit = makeKit(THREE, { quality: quality === "high" ? "high" : "low" });
  const { tops, bridges } = placeIslands(THREE, scene, L, kit);
  const graph = makePathNetwork(L, bridges);

  // 細項模型
  const itemInfo = new Map();
  const placements = new Map();
  for (const isl of L.islands) {
    let hero = isl.items.findIndex((it) => it.hero);
    if (hero < 0) hero = 0;
    const slots = slotLayout(isl.items.length, hero);
    placements.set(isl.id, slots);
    isl.items.forEach((it, i) => {
      const s = slots[i];
      const x = isl.cx + s.x, z = isl.cz + s.z;
      const ry = -0.35 + seededRotation(it.id) * (s.hero ? 0.2 : 1);
      kit.setOwner(it.id);
      kit.begin([x, TOP, z], ry, s.size);
      buildModel(kit, it.model, { color: hexNum(isl.color), tint: hexNum(isl.tint), tree: isl.tree, island: isl.id });
      kit.end();
      kit.setOwner(null);
      itemInfo.set(it.id, {
        id: it.id, island: isl.id, index: i, x, z,
        top: TOP + (MODEL_TOP[it.model] ?? 0.6) * s.size,
        size: s.size, pin: pinColor(isl, i), name: it.name, short: it.pin || it.name.split("｜")[0],
      });
    });
  }
  setLoad("種上鳳凰木、放出黑面琵鷺…");
  await new Promise((r) => requestAnimationFrame(r));
  decorateIslands(kit, L, placements);
  buildSeaDecor(kit, center);
  const built = kit.build(scene);
  const birds = createBirds(THREE, scene, center, low ? 5 : 7);
  const fish = createFish(THREE, scene, center, low ? 9 : 14);
  const people = makePeople(THREE, scene, { L, graph, flows: DATA.flows, reduced, quality });

  // ---------- 串聯線 ----------
  const flowMats = [];
  const flowMeshes = new Map();
  const flowGroup = new THREE.Group();
  scene.add(flowGroup);
  for (const fp of people.flowPaths) {
    const pts = [];
    for (let i = 0; i < fp.route.length; i++) {
      const p = fp.route[i];
      const prev = fp.route[i - 1];
      if (prev && p.bridge && prev.id.split(":")[0] !== p.id.split(":")[0]) {
        for (let s = 1; s <= 6; s++) {
          const t = s / 6;
          pts.push(new THREE.Vector3(prev.x + (p.x - prev.x) * t, TOP + 0.14 + Math.sin(t * Math.PI) * p.bridge.arch, prev.z + (p.z - prev.z) * t));
        }
      } else pts.push(new THREE.Vector3(p.x, TOP + 0.14, p.z));
    }
    if (pts.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const len = curve.getLength();
    const isl = L.byId.get(fp.flow.from);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(isl.color) },
        uLen: { value: len },
        uMode: { value: fp.flow.basis === "explicit" ? 0 : 1 },
      },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uColor; uniform float uLen; uniform float uMode;
        varying vec2 vUv;
        void main(){
          float u = vUv.x * uLen * 5.0 - uTime * 1.4;
          if (uMode > 0.5 && fract(u) > 0.55) discard;
          // 沿線往前流動的亮段，讓人看得出串聯的方向
          float run = smoothstep(0.55, 1.0, fract(u * 0.22));
          vec3 col = mix(uColor * 1.15, vec3(1.0), 0.12 + run * 0.55);
          gl_FragColor = vec4(col, 0.95);
          #include <colorspace_fragment>
        }`,
    });
    flowMats.push(mat);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 5), 0.06, 6, false), mat);
    mesh.visible = false;
    mesh.renderOrder = 4;
    flowGroup.add(mesh);
    if (!flowMeshes.has(fp.flow.id)) flowMeshes.set(fp.flow.id, []);
    flowMeshes.get(fp.flow.id).push(mesh);
  }

  // ---------- 標籤 ----------
  const islandLabels = new Map();
  for (const isl of L.islands) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "isl-label";
    el.style.setProperty("--c", isl.color);
    el.innerHTML = `<b>${isl.num || isl.badge}</b><span>${isl.short}</span>`;
    el.setAttribute("aria-label", `${isl.num ? isl.num + " " : ""}${isl.title}：${isl.policy}`);
    el.addEventListener("click", (e) => { e.stopPropagation(); app.selectIsland(isl.id); });
    const obj = new CSS2DObject(el);
    obj.position.set(isl.cx, TOP + 0.2, isl.cz + R * 0.92);
    scene.add(obj);
    islandLabels.set(isl.id, { el, obj, isl });
  }
  const regionLabel = (text, x, y, z, cls) => {
    const el = document.createElement("div");
    el.className = "region-label " + (cls || "");
    el.textContent = text;
    const obj = new CSS2DObject(el);
    obj.position.set(x, y, z);
    scene.add(obj);
    return obj;
  };
  const north = L.islands.filter((i) => i.north);
  const south = L.islands.filter((i) => !i.north);
  if (north.length) regionLabel("溪北", north.reduce((s, i) => s + i.cx, 0) / north.length, 0.1, Math.min(...north.map((i) => i.cz)) - R - 0.9);
  regionLabel("溪南", south.reduce((s, i) => s + i.cx, 0) / south.length, 0.1, Math.max(...south.map((i) => i.cz)) + R + 1.4);
  regionLabel("曾文溪", center.x - 5.4, 0.0, center.z - 2.5, "river");
  regionLabel("台灣海峽", center.x - 24, 0, center.z + 2, "sea");

  // 細項 pin：選到島時才出現
  const pinGroup = new THREE.Group();
  scene.add(pinGroup);
  let pins = [];
  function clearPins() {
    for (const p of pins) {
      pinGroup.remove(p.obj);
      p.obj.element.remove();
      pinGroup.remove(p.line);
      p.line.geometry.dispose();
    }
    pins = [];
  }
  const lineMat = new Map();
  // ids：只顯示這幾個細項（可以跨島，台南人的一天用）
  function showPins(islandId, ids = null) {
    clearPins();
    const list = ids
      ? ids.map((id) => itemInfo.get(id)).filter(Boolean).map((info) => ({ it: L.byId.get(info.island).items[info.index], i: info.index }))
      : (L.byId.get(islandId)?.items || []).map((it, i) => ({ it, i }));
    list.forEach(({ it, i }) => {
      const info = itemInfo.get(it.id);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin" + (state.item === it.id ? " sel" : "") + (lit.has(it.id) ? " lit-pin" : "");
      el.style.setProperty("--c", info.pin);
      const short = info.short.length > 9 ? info.short.slice(0, 9) + "…" : info.short;
      el.innerHTML = `<i>${i + 1}</i><span>${short}</span>`;
      el.title = it.name;
      el.addEventListener("click", (e) => { e.stopPropagation(); app.selectItem(it.id); });
      const obj = new CSS2DObject(el);
      const y = info.top + 0.26;
      obj.position.set(info.x, y, info.z);
      pinGroup.add(obj);
      if (!lineMat.has(info.pin)) lineMat.set(info.pin, new THREE.LineBasicMaterial({ color: info.pin, depthTest: false, transparent: true, opacity: 0.9 }));
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(info.x, info.top - 0.02, info.z), new THREE.Vector3(info.x, y - 0.04, info.z)]);
      const line = new THREE.Line(g, lineMat.get(info.pin));
      line.renderOrder = 6;
      pinGroup.add(line);
      pins.push({ obj, line, id: it.id, el });
    });
  }

  // ---------- 相機與控制 ----------
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minPolarAngle = THREE.MathUtils.degToRad(25);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(70);
  controls.minDistance = 3;
  controls.maxDistance = 70;
  controls.rotateSpeed = isMobile() ? 0.7 : 0.6;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  // 從西南方望向東北：前景是海，背景是台南平原、曾文溪河谷與丘陵
  const OV_DIR = new THREE.Vector3(-0.4, 0.43, 0.81).normalize();
  const OV_DIR_PORTRAIT = new THREE.Vector3(-0.3, 0.74, 0.6).normalize();
  const cityRadius = Math.max(...L.islands.map((i) => Math.hypot(i.cx - center.x, i.cz - center.z))) + R + 0.5;
  function panelInsets() {
    const W = stage.clientWidth;
    let left = 0, right = 0, bottom = 0;
    const card = $("card"), side = $("sidebar");
    if (isLandscapePhone()) {
      if (!card.hidden) right = card.getBoundingClientRect().width + 8;
      else if (!body.classList.contains("side-closed")) right = side.getBoundingClientRect().width + 8;
      if (body.classList.contains("m-time")) bottom = $("hud").getBoundingClientRect().height;
    } else if (!isMobile()) {
      if (!body.classList.contains("side-closed")) right = side.getBoundingClientRect().width;
      if (!card.hidden) left = card.getBoundingClientRect().right;
    } else {
      right = 66; // 右側直排工具列
      if (!card.hidden) bottom = card.getBoundingClientRect().height;
      else if (!body.classList.contains("side-closed")) bottom = side.getBoundingClientRect().height;
      else if (body.classList.contains("m-time")) bottom = $("hud").getBoundingClientRect().height;
    }
    return { left: Math.min(left, W * 0.5), right: Math.min(right, W * 0.5), bottom };
  }
  function overviewPose(bird = state.toggles.bird) {
    const W = stage.clientWidth, H = stage.clientHeight;
    const ins = panelInsets();
    const effW = Math.max(200, W - ins.left - ins.right), effH = Math.max(200, H - ins.bottom - 70);
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * (effW / effH));
    const target = new THREE.Vector3(center.x, 0.2, center.z + 0.3);
    if (bird) {
      const d = cityRadius / Math.tan(Math.min(vHalf, hHalf)) * 1.08;
      return { pos: target.clone().add(new THREE.Vector3(0.01, d, d * 0.14)), target };
    }
    const dir = effW / effH < 0.8 ? OV_DIR_PORTRAIT : OV_DIR;
    const elev = Math.asin(dir.y);
    const dH = cityRadius / Math.tan(hHalf);
    const dV = (cityRadius * Math.sin(elev) + 1.3) / Math.tan(vHalf);
    const d = clamp(Math.max(dH, dV) * (isMobile() ? 1.1 : 1.42), 14, 68);
    return { pos: target.clone().addScaledVector(dir, d), target };
  }

  // 面板遮住的區域：用 view offset 讓島群落在可見範圍正中
  const vo = { x: 0, y: 0, tx: 0, ty: 0 };
  function updateViewOffsetTarget() {
    const ins = panelInsets();
    vo.tx = (ins.right - ins.left) / 2;
    vo.ty = ins.bottom / 2;
  }
  function applyViewOffset(dt) {
    const k = reduced ? 1 : Math.min(1, dt * 7);
    const nx = vo.x + (vo.tx - vo.x) * k, ny = vo.y + (vo.ty - vo.y) * k;
    const changed = Math.abs(nx - vo.x) > 0.05 || Math.abs(ny - vo.y) > 0.05;
    vo.x = Math.abs(vo.tx - nx) < 0.5 ? vo.tx : nx;
    vo.y = Math.abs(vo.ty - ny) < 0.5 ? vo.ty : ny;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (Math.abs(vo.x) < 0.5 && Math.abs(vo.y) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(W, H, vo.x, vo.y, W, H);
    camera.updateProjectionMatrix();
    return changed;
  }

  let fly = null;
  function flyTo(pos, target, ms = 800) {
    if (reduced) {
      camera.position.copy(pos);
      controls.target.copy(target);
      controls.update();
      dirty = true;
      return;
    }
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), start: performance.now(), ms };
  }
  function islandPose(isl) {
    const k = isMobile() ? (innerHeight > innerWidth ? 1.55 : 1.15) : 1;
    const off = new THREE.Vector3(-2.75, 5.3, 6.2).multiplyScalar(k);
    const target = new THREE.Vector3(isl.cx, TOP, isl.cz);
    return { pos: target.clone().add(off), target };
  }
  function itemPose(info) {
    const k = isMobile() ? 1.3 : 1;
    const off = new THREE.Vector3(-1.6, 2.5, 3.2).multiplyScalar(k * clamp(info.size / 0.6, 0.85, 1.5));
    const target = new THREE.Vector3(info.x, TOP + (info.top - TOP) * 0.45, info.z);
    return { pos: target.clone().add(off), target };
  }

  // ---------- 狀態 ----------
  const state = { island: null, item: null, flow: null, walker: null, toggles: { flows: false, people: true, freeze: false, bird: false } };
  let dirty = true;
  let clockMin = 600;
  let lit = new Set();
  let daySeg = null;
  let tour = null;
  let modalPause = false;
  let follow = false; // 鏡頭跟著我的角色走
  let timeHold = false; // 台南人的一天：停在選到的時段
  let lastInput = performance.now();

  const tintKey = new Map();
  function updateTints() {
    for (const [id, info] of itemInfo) {
      let tint = null, amt = 0;
      if (state.item === id) { tint = hexNum(info.pin); amt = 0.32; }
      else if (lit.has(id)) { tint = 0xfcea8b; amt = 0.24; }
      const key = tint == null ? "" : tint + ":" + amt;
      if ((tintKey.get(id) || "") !== key) {
        setOwnerColor(THREE, built.ownerIndex, id, tint, amt);
        tintKey.set(id, key);
      }
    }
    dirty = true;
  }

  function updateLabels() {
    for (const [id, l] of islandLabels) {
      l.el.classList.toggle("sel", state.island === id);
      l.el.classList.toggle("dim", !!state.island && state.island !== id);
    }
    for (const p of pins) {
      p.el.classList.toggle("sel", state.item === p.id);
      p.el.classList.toggle("lit-pin", lit.has(p.id));
    }
    declutterAt = 0;
  }

  function updateFlows() {
    let show = new Set();
    if (state.toggles.flows) show = new Set(flowMeshes.keys());
    else if (state.flow) show.add(state.flow);
    else if (state.island) {
      for (const f of DATA.flows) {
        const tos = Array.isArray(f.to) ? f.to : [f.to];
        if (f.from === state.island || tos.includes(state.island)) show.add(f.id);
      }
    }
    for (const [id, arr] of flowMeshes) for (const m of arr) m.visible = show.has(id);
    $("legend").hidden = show.size === 0;
    dirty = true;
  }

  function setHash(id) {
    try {
      history.replaceState(null, "", id ? "#" + encodeURIComponent(id) : location.pathname + location.search);
    } catch { /* 忽略 */ }
  }

  // ---------- app：給 UI 呼叫的動作 ----------
  const app = {
    selectIsland(id, opts = {}) {
      const isl = L.byId.get(id);
      if (!isl) return;
      if (!opts.fromTour) stopTour();
      state.island = id; state.item = null; state.flow = null;
      ui.showIsland(DATA.islands.find((d) => d.id === id));
      play.islandShown(id, !!opts.fromTour);
      if (!opts.fromTour) track("select_island", { island: id });
      follow = false;
      if (opts.fromTour && isMobile()) ui.hideCard();
      showPins(id);
      updateTints(); updateLabels(); updateFlows();
      updateViewOffsetTarget();
      if (opts.fly !== false) { const p = islandPose(isl); flyTo(p.pos, p.target); }
      setHash(id);
    },
    selectItem(id, opts = {}) {
      const info = itemInfo.get(id);
      if (!info) return;
      if (!opts.fromTour) stopTour();
      const changedIsland = state.island !== info.island;
      state.island = info.island; state.item = id; state.flow = null;
      ui.showItem(id);
      if (!opts.fromTour) { play.itemShown(info.island); track("select_item", { item: id, island: info.island }); }
      else if (isMobile()) ui.hideCard();
      follow = false;
      if (changedIsland || !pins.length) showPins(info.island);
      updateTints(); updateLabels(); updateFlows();
      updateViewOffsetTarget();
      const p = itemPose(info);
      flyTo(p.pos, p.target);
      setHash(id);
    },
    selectFlow(id) {
      const f = DATA.flows.find((x) => x.id === id);
      if (!f) return;
      stopTour();
      state.flow = id; state.island = null; state.item = null;
      clearPins();
      ui.showFlow(f);
      track("select_flow", { flow: id });
      follow = false;
      updateTints(); updateLabels(); updateFlows();
      updateViewOffsetTarget();
      const ids = [f.from, ...(Array.isArray(f.to) ? f.to : [f.to])];
      const isls = ids.map((x) => L.byId.get(x));
      const tx = isls.reduce((s, i) => s + i.cx, 0) / isls.length, tz = isls.reduce((s, i) => s + i.cz, 0) / isls.length;
      const spread = Math.max(...isls.map((i) => Math.hypot(i.cx - tx, i.cz - tz))) + R;
      const target = new THREE.Vector3(tx, TOP, tz);
      const d = clamp(spread * 3.4, 9, 40) * (isMobile() ? 1.4 : 1);
      flyTo(target.clone().addScaledVector(OV_DIR, d), target);
      setHash(id);
    },
    selectCharacter(kind) {
      stopTour();
      state.island = null; state.item = null; state.flow = null;
      clearPins();
      ui.showCharacter(kind);
      updateTints(); updateLabels(); updateFlows();
      updateViewOffsetTarget();
      const g = kind === "sister" ? people.sister.group : people.feifei.group;
      const target = g.position.clone().setY(TOP + 0.2);
      const off = new THREE.Vector3(-1.4, 1.9, 2.6).multiplyScalar(isMobile() ? 1.35 : 1);
      flyTo(target.clone().add(off), target);
      setHash("");
    },
    closeCard() {
      ui.hideCard();
      state.island = null; state.item = null; state.flow = null;
      clearPins();
      ui.clearSelection();
      updateTints(); updateLabels(); updateFlows();
      updateViewOffsetTarget();
      setHash("");
    },
    home() {
      stopTour();
      app.closeCard();
      const p = overviewPose();
      flyTo(p.pos, p.target, 900);
    },
    setTime(min) {
      clockMin = min;
      applyTime(true);
      ui.setTimeButtons(min);
    },
    toggle(name) {
      state.toggles[name] = !state.toggles[name];
      ui.setToggle(name, state.toggles[name]);
      if (name === "flows") updateFlows();
      if (name === "people") people.setVisible(state.toggles.people);
      if (name === "bird") {
        controls.minPolarAngle = state.toggles.bird ? 0.02 : THREE.MathUtils.degToRad(25);
        const p = overviewPose(state.toggles.bird);
        flyTo(p.pos, p.target, 900);
      }
      dirty = true;
    },
    toggleTour(on) {
      if (on === false || tour) stopTour();
      else startTour();
    },
    startTour(cues, opts) { startTour(cues, opts); },
    act(name, ctx) {
      if (name === "game") game.open();
      else if (name === "ask") ask.open();
      else play.act(name, ctx);
    },
    // 幾個細項一起看（台南人的一天）：鏡頭框住它們
    focusItems(ids, opts = {}) {
      const infos = ids.map((id) => itemInfo.get(id)).filter(Boolean);
      if (!infos.length) return;
      if (!opts.fromTour) stopTour();
      state.island = null; state.item = null; state.flow = null;
      showPins(null, ids);
      updateTints(); updateLabels(); updateFlows();
      if (opts.fromTour && isMobile()) ui.hideCard();
      updateViewOffsetTarget();
      const tx = infos.reduce((a, i) => a + i.x, 0) / infos.length, tz = infos.reduce((a, i) => a + i.z, 0) / infos.length;
      const spread = Math.max(...infos.map((i) => Math.hypot(i.x - tx, i.z - tz))) + 1.4;
      const target = new THREE.Vector3(tx, TOP, tz);
      const d = clamp(spread * 3.6, 7.5, 36) * (isMobile() ? 1.4 : 1);
      flyTo(target.clone().addScaledVector(OV_DIR, d), target);
      follow = false;
    },
    flyNear(p, k = 1) {
      stopTour();
      const target = new THREE.Vector3(p.x, p.y + 0.2, p.z);
      const off = new THREE.Vector3(-1.4, 1.9, 2.6).multiplyScalar(k * (isMobile() ? 1.35 : 1));
      flyTo(target.clone().add(off), target);
    },
    followAvatar() { follow = true; },
    holdTime(on) { timeHold = on; },
    clock() { return ((clockMin % 1440) + 1440) % 1440; },
    openAsk() { ask.open(); },
    openDay() { day.open(); },
    openAvatar() { avatar.openEditor(); },
    openGame() { game.open(); },
    openEggs() { eggs.openList(); },
    eggsProgress() { return { count: eggs.count, total: eggs.total }; },
    zoom(f) {
      stopTour();
      const off = camera.position.clone().sub(controls.target);
      const len = clamp(off.length() * f, controls.minDistance, controls.maxDistance);
      off.setLength(len);
      flyTo(controls.target.clone().add(off), controls.target.clone(), 350);
    },
    layoutChanged() {
      updateViewOffsetTarget();
      declutterAt = 0;
      dirty = true;
    },
    pauseForModal(on) { modalPause = on; },
  };

  const ui = createUI(app, DATA, { isMobile: isCompact, onePanel, kiosk: KIOSK });
  initAudio({ kiosk: KIOSK });

  // ---------- 集章卡、測驗、分享 ----------
  let play = null;
  const stamps = createStamps({ islands: DATA.islands, kiosk: KIOSK, onChange: () => play && play.syncStamps() });
  play = createPlay({ app, ui, D: DATA, stamps, kiosk: KIOSK, pinColor });

  // ---------- 我的角色、彩蛋、小遊戲、問妃妃、台南人的一天 ----------
  const avatar = createAvatar(THREE, scene, { L, graph, kiosk: KIOSK, CSS2DObject, ui, app, D: DATA });
  const eggs = createEggs(THREE, scene, { L, D: DATA, ui, kiosk: KIOSK, CSS2DObject, people, app });
  const game = createGame({ ui, kiosk: KIOSK, onPolicy: () => app.selectIsland("agriculture") });
  const ask = createAsk({
    ui, D: DATA, app,
    canOpinion: () => play.canOpinion(),
    actions: {
      quiz: () => play.openQuiz(), stamps: () => play.openStamps(), eggs: () => eggs.openList(),
      game: () => game.open(), avatar: () => { ui.closeModal(); avatar.openEditor(); }, opinion: () => play.opinion(""),
    },
  });
  const day = createDay({ ui, D: DATA, app });

  // ---------- 台南人的一天 ----------
  const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const segs = DATA.dayCycle.map((c) => ({ ...c, a: toMin(c.from), b: toMin(c.to) }));
  const segAt = (m) => segs.find((s) => (s.a <= s.b ? m >= s.a && m < s.b : m >= s.a || m < s.b)) || null;
  let lastClockText = "";
  let lastEnvMin = -999;
  function applyTime(force) {
    const m = ((clockMin % 1440) + 1440) % 1440;
    if (force || Math.abs(m - lastEnvMin) >= 1) {
      env.setTime(m);
      lastEnvMin = m;
      kit.materials.glow.emissiveIntensity = env.night * 3.2;
      dirty = true;
    }
    const seg = segAt(Math.floor(m));
    if (seg !== daySeg || force) {
      daySeg = seg;
      lit = new Set(seg ? seg.lights : []);
      updateTints();
      updateLabels();
      ui.setTimeButtons(m);
    }
    const hh = String(Math.floor(m / 60)).padStart(2, "0"), mm = String(Math.floor(m % 60 / 10) * 10).padStart(2, "0");
    const text = `${hh}:${mm}`;
    if (text !== lastClockText) {
      lastClockText = text;
      ui.setDay(text, seg ? seg.label : "");
    }
  }

  // ---------- 導覽 ----------
  // cues：預設是 data.js 的導覽；測驗結果會帶自己的 3 站（目標可以是島或細項）
  function startTour(cues = DATA.tour, { loop = KIOSK } = {}) {
    if (cues === DATA.tour && !KIOSK) track("tour_start");
    follow = false;
    tour = { cues, loop, i: -1, next: 0 };
    stepTour();
  }
  function stepTour() {
    if (!tour) return;
    tour.i++;
    if (tour.i >= tour.cues.length) {
      if (tour.loop) tour.i = 0;
      else { stopTour(); return; }
    }
    const cue = tour.cues[tour.i];
    if (cue.time != null) app.setTime(cue.time);
    if (Array.isArray(cue.target)) {
      app.focusItems(cue.target, { fromTour: true });
    } else if (itemInfo.has(cue.target)) {
      app.selectItem(cue.target, { fromTour: true });
    } else if (cue.target === "all") {
      ui.hideCard();
      state.island = null; state.item = null; state.flow = null;
      clearPins(); updateTints(); updateLabels(); updateFlows(); updateViewOffsetTarget();
      const p = overviewPose();
      flyTo(p.pos, p.target, 1100);
    } else {
      app.selectIsland(cue.target, { fromTour: true });
    }
    ui.setTour(true, cue.caption, `${tour.i + 1} / ${tour.cues.length}`);
    tour.next = performance.now() + (reduced ? 9000 : itemInfo.has(cue.target) ? 8600 : 7600);
  }
  function stopTour() {
    if (!tour) return;
    tour = null;
    ui.setTour(false);
  }

  // ---------- 點選 ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" };
    fly = null;
    follow = false;
    lastInput = performance.now();
    if (tour) stopTour();
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const limit = down.touch ? 12 : 6; // 大螢幕上手指點擊常會滑動幾個像素
    down = null;
    if (moved <= limit) pick(e.clientX, e.clientY);
  });
  stage.addEventListener("gesturestart", (e) => e.preventDefault());
  controls.addEventListener("change", () => { dirty = true; declutterAt = Math.min(declutterAt, performance.now() + 60); });

  function islandAt(p) {
    return L.islands.find((i) => withinHex(p.x - i.cx, p.z - i.cz, R * 0.87)) || null;
  }
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets = [...eggs.meshes().filter((g) => g.visible), ...avatar.meshes(), ...built.meshes.filter((m) => m.visible), ...tops, people.feifei.group, people.sister.group];
    if (state.toggles.people) targets.push(...people.meshes);
    const hits = ray.intersectObjects(targets, true);
    for (const hit of hits) {
      const o = hit.object;
      if (o.userData.eggId) return eggs.hit(o.userData.eggId);
      if (o.userData.avatar) return avatar.openEditor();
      if (o.userData.feifei) { eggs.feifeiTapped(); return app.selectCharacter("feifei"); }
      if (o.userData.sister) { eggs.sisterTapped(); return app.selectCharacter("sister"); }
      if (people.meshes.includes(o)) {
        const w = people.walkerAt(o, hit.instanceId);
        if (w && w.flow) {
          stopTour();
          ui.showWalker(w);
          state.flow = w.flow.id; state.island = null; state.item = null;
          clearPins(); updateTints(); updateLabels(); updateFlows(); updateViewOffsetTarget();
          return;
        }
        continue;
      }
      if (o.isInstancedMesh && o.userData.owners) {
        const owner = o.userData.owners[hit.instanceId];
        if (owner && itemInfo.has(owner)) return app.selectItem(owner);
        const isl = islandAt(hit.point);
        if (isl && hit.point.y > TOP - 0.3) return app.selectIsland(isl.id);
        continue;
      }
      if (o.userData.island) return app.selectIsland(o.userData.island);
    }
  }

  // ---------- 鍵盤 ----------
  const sph = new THREE.Spherical();
  function orbit(dTheta, dPhi) {
    const off = camera.position.clone().sub(controls.target);
    sph.setFromVector3(off);
    sph.theta += dTheta;
    sph.phi = clamp(sph.phi + dPhi, controls.minPolarAngle, controls.maxPolarAngle);
    off.setFromSpherical(sph);
    camera.position.copy(controls.target).add(off);
    controls.update();
    dirty = true;
  }
  document.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    lastInput = performance.now();
    if (e.key === "ArrowLeft") { orbit(0.12, 0); e.preventDefault(); }
    else if (e.key === "ArrowRight") { orbit(-0.12, 0); e.preventDefault(); }
    else if (e.key === "ArrowUp") { orbit(0, -0.08); e.preventDefault(); }
    else if (e.key === "ArrowDown") { orbit(0, 0.08); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") app.zoom(0.8);
    else if (e.key === "-" || e.key === "_") app.zoom(1.25);
  });
  // pointermove：總部觸控機上手指拖著玩小遊戲、捏角色時也算有人在用
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]) window.addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true });

  // ---------- 展示機 ----------
  let updateReady = false;
  function kioskReset() {
    // 有新版本時趁沒人操作重新整理（Chrome --kiosk 視窗重新整理後仍是全螢幕）
    if (updateReady && !document.fullscreenElement) { location.reload(); return; }
    play.reset();
    game.stop();
    ask.reset();
    avatar.reset();
    eggs.reset();
    follow = false;
    timeHold = false;
    ui.resetForKiosk();
    const defaults = { flows: false, people: true, freeze: false, bird: false };
    for (const [name, on] of Object.entries(defaults)) if (state.toggles[name] !== on) app.toggle(name);
    app.home();
    startTour();
  }
  if (KIOSK) {
    // 長按不跳選單、不能拖圖、不能把整頁放大縮小
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("dragstart", (e) => e.preventDefault());
    window.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
    });
    // 螢幕保持常亮
    const keepAwake = () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").catch(() => {});
    };
    keepAwake();
    document.addEventListener("visibilitychange", keepAwake);
    // 離線快取：總部網路不穩時也能顯示（?nosw=1 可移除）
    if ("serviceWorker" in navigator) {
      if (params.get("nosw") === "1") {
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
        if (window.caches) caches.keys().then((ks) => ks.filter((k) => k.startsWith(FOLDER + "-")).forEach((k) => caches.delete(k))).catch(() => {});
      } else {
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) updateReady = true; });
        navigator.serviceWorker.register("./sw.js", { scope: "./" })
          .then((reg) => setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000))
          .catch(() => {});
      }
    }
  }

  // ---------- 尺寸、可見度、WebGL 遺失 ----------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateViewOffsetTarget();
    dirty = true;
    declutterAt = 0;
  }
  new ResizeObserver(resize).observe(stage);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fatal("3D 畫面暫時中斷（裝置記憶體不足或切換了 App）。請重新整理頁面。");
  });
  reducedMQ.addEventListener?.("change", () => {
    reduced = reducedMQ.matches;
    controls.enableDamping = !reduced;
    dirty = true;
  });

  // ---------- 標籤避讓 ----------
  let declutterAt = 0;
  const hyst = new WeakMap(); // 標籤元素被移除後可以被回收，展示機整天輪播也不會累積
  function declutter() {
    const panels = ui.panelRects();
    const camPos = camera.position;
    const items = [];
    for (const [id, l] of islandLabels) {
      const d = camPos.distanceTo(l.obj.position);
      items.push({ el: l.el, pr: state.island === id ? -1 : d, kind: "isl" });
    }
    for (const p of pins) items.push({ el: p.el, pr: state.item === p.id ? -2 : 1000 + camPos.distanceTo(p.obj.position), kind: "pin" });
    items.sort((a, b) => a.pr - b.pr);
    const placed = [];
    const overlaps = (r, list, pad) => list.some((q) => r.left < q.right + pad && r.right > q.left - pad && r.top < q.bottom + pad && r.bottom > q.top - pad);
    for (const it of items) {
      it.el.classList.remove("gone", "compact");
      let r = it.el.getBoundingClientRect();
      const pad = hyst.get(it.el) ? 8 : 0;
      if (overlaps(r, panels, 2)) { it.el.classList.add("gone"); hyst.set(it.el, true); continue; }
      if (overlaps(r, placed, 2 - pad)) {
        it.el.classList.add("compact");
        r = it.el.getBoundingClientRect();
        if (overlaps(r, placed, 2 - pad)) { it.el.classList.add("gone"); hyst.set(it.el, true); continue; }
      }
      hyst.set(it.el, false);
      placed.push(r);
    }
  }

  // ---------- 主迴圈 ----------
  const clockT = new THREE.Clock();
  let time = 0;
  let frames = 0, acc = 0, lastAdjust = performance.now();
  let rendering = true;
  document.addEventListener("visibilitychange", () => { rendering = !document.hidden; clockT.getDelta(); });

  function frame() {
    requestAnimationFrame(frame);
    if (!rendering) return;
    const dt = Math.min(clockT.getDelta(), 0.08);
    const now = performance.now();
    const frozen = state.toggles.freeze || reduced || modalPause;
    if (!frozen) time += dt;

    if (fly) {
      const t = clamp((now - fly.start) / fly.ms, 0, 1);
      const e = easeInOutCubic(t);
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (t >= 1) fly = null;
      dirty = true;
    }
    controls.update();
    const voChanged = applyViewOffset(dt);
    if (voChanged) dirty = true;

    if (!frozen && !timeHold) {
      clockMin = (clockMin + dt * 10) % 1440;
      applyTime(false);
    }
    // 鏡頭跟著我的角色走（使用者一碰畫面就停）
    if (follow && avatar.exists && !fly) {
      const p = avatar.group.position;
      const nt = controls.target.clone().lerp(new THREE.Vector3(p.x, p.y + 0.2, p.z), Math.min(1, dt * 2.5));
      camera.position.add(nt.clone().sub(controls.target));
      controls.target.copy(nt);
      dirty = true;
    }
    if (tour && now > tour.next) stepTour();
    // 展示機閒置就重置；影片播放中放寬到 4 分鐘，免得民眾看到一半被切掉
    if (KIOSK && !tour && now - lastInput > (ui.videoOpen ? 240000 : IDLE_MS)) kioskReset();

    const camDist = camera.position.distanceTo(controls.target);
    const showSmall = camDist < 26;
    for (const m of built.meshes) if (m.userData.small) m.visible = showSmall;

    const animate = !frozen;
    if (animate) {
      env.update(dt, time);
      birds.update(time);
      fish.update(time);
      people.update(dt, time, false, camDist);
      avatar.update(dt, time, false, camDist, camera);
      eggs.update(time, camDist, false);
      for (const m of flowMats) m.uniforms.uTime.value = time % 600; // GPU 是 32 位元浮點，時間取餘數避免長時間運作後失真
    } else if (dirty) {
      people.update(0, time, true, camDist);
      avatar.update(0, time, true, camDist, camera);
      eggs.update(time, camDist, true);
    }

    if (animate || dirty) {
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      dirty = false;
      // 自動調整解析度
      frames++; acc += dt;
      if (frames >= 50) {
        const avg = acc / frames;
        if (avg > 1 / 36 && dpr > 1 && now - lastAdjust > 2500) {
          dpr = Math.max(1, +(dpr - 0.15).toFixed(2));
          renderer.setPixelRatio(dpr);
          lastAdjust = now;
        } else if (avg < 1 / 58 && dpr < maxDpr && now - lastAdjust > 5000) {
          dpr = Math.min(maxDpr, +(dpr + 0.1).toFixed(2));
          renderer.setPixelRatio(dpr);
          lastAdjust = now;
        }
        frames = 0; acc = 0;
      }
    }
    if (now > declutterAt) {
      declutter();
      declutterAt = now + 160;
    }
  }

  // ---------- 開場 ----------
  applyTime(true);
  resize();
  const ov = overviewPose();
  camera.position.copy(ov.pos);
  controls.target.copy(ov.target);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);

  // 深層連結：#technology、#tech-sci、#F1；#quiz、#quiz=…（測驗結果）、#stamps、#stamps=done
  function openHash(h) {
    if (!h) return false;
    if (L.byId.has(h)) app.selectIsland(h);
    else if (itemInfo.has(h)) app.selectItem(h);
    else if (DATA.flows.some((f) => f.id === h)) app.selectFlow(h);
    else if (!KIOSK && play.route(h)) setHash("");
    else return false;
    return true;
  }
  const readHash = () => { try { return decodeURIComponent(location.hash.replace(/^#/, "")); } catch { return ""; } };
  const hash = readHash();
  setTimeout(() => {
    $("loading").classList.add("done");
    openHash(hash);
    if (KIOSK) setTimeout(() => startTour(), 2500);
    else if (!ui.introSeen && !hash) ui.showIntro();
  }, 350);
  // 頁面開著時點到別的連結（只換 # 後面）也要跟著開
  window.addEventListener("hashchange", () => openHash(readHash()));

  // 給自動化測試與除錯用
  window.__island = { app, state, L, camera, controls, renderer, itemInfo, stamps, play, ui, avatar, eggs, game, ask, day, get dpr() { return dpr; }, get clock() { return clockMin; }, quality };
}

start().catch((err) => {
  console.error(err);
  fatal("3D 畫面載入失敗，可以重新整理再試一次，或直接觀看政策影片。");
});
