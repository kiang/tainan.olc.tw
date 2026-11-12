// 我的角色：自己捏一個小人放進政策島，可以叫他走到某座島，或在島上自動逛逛。
// 網頁版記在這台裝置的瀏覽器；總部觸控機只記在記憶體，閒置重置時收掉換下一位。
import { TOP } from "./world.js?v=20261029-3";
import { store, clamp, mulberry32, escapeHTML as h } from "./util.js?v=20261029-3";
import { track } from "./track.js?v=20261029-3";

const KEY = "feifei-island:avatar:v1";
const hex = (n) => "#" + n.toString(16).padStart(6, "0");

export const AVATAR = {
  roles: [
    { id: "office", label: "上班族", hat: "none", hand: "briefcase", shirt: 0xffffff, pants: 0x2c3e66 },
    { id: "student", label: "學生", hat: "none", hand: "backpack", shirt: 0x28758a, pants: 0x2b2b2e },
    { id: "farmer", label: "農漁民", hat: "douli", hand: "crate", shirt: 0x8fb37a, pants: 0x6b5b4b },
    { id: "parent", label: "爸媽", hat: "none", hand: "balloon", shirt: 0xe04a67, pants: 0x2c3e66 },
    { id: "elder", label: "長輩", hat: "cap", hand: "none", shirt: 0xe9dcc1, pants: 0x8a8f99 },
    { id: "traveler", label: "旅人", hat: "cap", hand: "luggage", shirt: 0xf2c230, pants: 0x2b2b2e },
  ],
  shirts: [0x5fc29a, 0xe04a67, 0x28758a, 0xf2c230, 0x6b5bc1, 0xf29a3b, 0xffffff, 0x2b2b2e],
  pants: [0x2c3e66, 0x2b2b2e, 0x6b5b4b, 0x8a8f99, 0xe9dcc1],
  hairs: [0x2e2522, 0x6b4a33, 0x7a3424, 0xdedede],
  skins: [0xf6d2b8, 0xe6b48f, 0xcf9670, 0x9a6a4a],
  hats: [{ id: "none", label: "不戴" }, { id: "cap", label: "鴨舌帽" }, { id: "douli", label: "斗笠" }],
  hands: [
    { id: "none", label: "空手" }, { id: "briefcase", label: "公事包" }, { id: "backpack", label: "書包" },
    { id: "crate", label: "農產箱" }, { id: "balloon", label: "氣球" }, { id: "luggage", label: "行李箱" }, { id: "mango", label: "芒果" },
  ],
};
const DEFAULT = { role: "office", shirt: 0x5fc29a, pants: 0x2c3e66, hair: 0x2e2522, skin: 0xf6d2b8, hat: "none", hand: "briefcase" };

function buildModel(THREE, look) {
  const g = new THREE.Group();
  g.name = "avatar";
  const mats = [];
  const mat = (c) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }); mats.push(m); return m; };
  const M = { shirt: mat(look.shirt), pants: mat(look.pants), skin: mat(look.skin), hair: mat(look.hair), shoe: mat(0xf4f4f2), eye: mat(0x2a1a14) };
  const add = (geo, m, x, y, z, parent = g) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const legs = [];
  for (const x of [-0.026, 0.026]) {
    const piv = new THREE.Group();
    piv.position.set(x, 0.11, 0);
    g.add(piv);
    add(new THREE.CylinderGeometry(0.019, 0.019, 0.1, 8).translate(0, -0.05, 0), M.pants, 0, 0, 0, piv);
    add(new THREE.BoxGeometry(0.034, 0.02, 0.05), M.shoe, 0, -0.1, 0.01, piv);
    legs.push(piv);
  }
  add(new THREE.CylinderGeometry(0.05, 0.058, 0.12, 12), M.shirt, 0, 0.17, 0);
  add(new THREE.SphereGeometry(0.07, 18, 14), M.skin, 0, 0.3, 0.005);
  const hairM = add(new THREE.SphereGeometry(0.075, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), M.hair, 0, 0.31, -0.003);
  hairM.rotation.x = -0.12;
  for (const x of [-0.024, 0.024]) add(new THREE.SphereGeometry(0.011, 8, 6), M.eye, x, 0.3, 0.068);
  const arms = [];
  for (const x of [-0.066, 0.066]) {
    const piv = new THREE.Group();
    piv.position.set(x, 0.225, 0);
    g.add(piv);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.09, 6).translate(0, -0.045, 0), M.shirt, 0, 0, 0, piv);
    arms.push(piv);
  }
  if (look.hat === "cap") {
    const c = mat(look.shirt === 0xffffff ? 0x28758a : look.shirt);
    add(new THREE.CylinderGeometry(0.072, 0.074, 0.035, 14), c, 0, 0.36, -0.004);
    add(new THREE.BoxGeometry(0.08, 0.008, 0.06), c, 0, 0.345, 0.07);
  } else if (look.hat === "douli") {
    add(new THREE.ConeGeometry(0.13, 0.06, 16), mat(0xe8d39a), 0, 0.385, 0);
  }
  const hand = { obj: null, holding: false };
  if (look.hand === "briefcase") { hand.obj = add(new THREE.BoxGeometry(0.075, 0.055, 0.022), mat(0x3d3a36), 0.08, 0.11, 0.02); }
  else if (look.hand === "backpack") { add(new THREE.BoxGeometry(0.075, 0.09, 0.04), mat(0xe04a67), 0, 0.19, -0.07); }
  else if (look.hand === "crate") { hand.obj = add(new THREE.BoxGeometry(0.1, 0.055, 0.075), mat(0xb48560), 0, 0.2, 0.08); hand.holding = true; }
  else if (look.hand === "balloon") {
    add(new THREE.CylinderGeometry(0.002, 0.002, 0.26, 4), mat(0xffffff), 0.08, 0.3, 0.02);
    add(new THREE.SphereGeometry(0.055, 12, 10), mat(0xf2c230), 0.08, 0.46, 0.02);
  } else if (look.hand === "luggage") { add(new THREE.BoxGeometry(0.075, 0.11, 0.055), mat(0x5da7c9), 0.1, 0.055, -0.02); }
  else if (look.hand === "mango") {
    hand.obj = add(new THREE.SphereGeometry(0.038, 12, 10), mat(0xf2a93b), 0, 0.2, 0.08);
    hand.obj.scale.set(1, 0.8, 0.8);
    hand.holding = true;
  }
  g.traverse((o) => { if (o.isMesh) o.userData.avatar = true; });
  return { group: g, legs, arms, hand, mats };
}

export function createAvatar(THREE, scene, { L, graph, kiosk, CSS2DObject, ui, app, D }) {
  const islands = D.islands;
  const byId = new Map(islands.map((i) => [i.id, i]));
  const saved = kiosk ? null : store.get(KEY, null);
  let look = saved && saved.look ? { ...DEFAULT, ...saved.look } : null;
  let name = saved && saved.name ? String(saved.name).slice(0, 8) : "";
  let model = null;
  let route = null, seg = null, dist = 0, mode = "wander", home = saved?.home && byId.has(saved.home) ? saved.home : "tainan";
  let target = null, posing = false, sayUntil = 0;
  const rnd = mulberry32(2026);
  const holder = new THREE.Group();
  scene.add(holder);
  const tagEl = document.createElement("div");
  tagEl.className = "av-tag";
  const tag = new CSS2DObject(tagEl);
  tag.position.set(0, 0.5, 0);
  tag.visible = false;
  holder.add(tag);
  let k = 1;

  const save = () => { if (!kiosk) store.set(KEY, { look, name, home }); };
  const lengths = (r) => { const out = [0]; for (let i = 1; i < r.length; i++) out.push(out[i - 1] + Math.hypot(r[i].x - r[i - 1].x, r[i].z - r[i - 1].z)); return out; };
  function sample(d) {
    const total = seg[seg.length - 1];
    d = clamp(d, 0, total);
    let i = 1;
    while (i < seg.length - 1 && seg[i] < d) i++;
    const a = route[i - 1], b = route[i];
    const t = (d - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
    let y = TOP;
    if (b.bridge && a.id && b.id && a.id.split(":")[0] !== b.id.split(":")[0]) y = TOP + 0.03 + Math.sin(t * Math.PI) * b.bridge.arch;
    return { x: a.x + (b.x - a.x) * t, y, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z), node: t < 0.5 ? a.id : b.id };
  }
  function ringRoute(islandId, from = 0) {
    const nodes = [];
    for (let j = 0; j <= 12; j++) nodes.push(graph.key(islandId, (from + j) % 12));
    return nodes.map((id) => ({ ...graph.pos.get(id), id, bridge: null }));
  }
  let lastNode = graph.key(home, 6);
  function wander(islandId = home) {
    mode = "wander";
    const j = Number(String(lastNode).split(":")[1]) || 0;
    route = lastNode.startsWith(islandId + ":") ? ringRoute(islandId, j) : ringRoute(islandId, 6);
    seg = lengths(route);
    dist = 0;
  }
  function goto(islandId) {
    if (!byId.has(islandId)) return;
    const r = graph.path(lastNode, graph.key(islandId, 6 + Math.floor(rnd() * 3) * 2));
    if (!r || r.length < 2) { wander(islandId); home = islandId; save(); return; }
    mode = "goto";
    target = islandId;
    route = r;
    seg = lengths(r);
    dist = 0;
    say(`出發！去${byId.get(islandId).short}島`, 2500);
    track("avatar_go", { island: islandId });
  }
  function say(text, ms = 2600) {
    sayUntil = performance.now() + ms;
    tagEl.innerHTML = `<b>${h(name || "我")}</b><span>${h(text)}</span>`;
    tagEl.classList.add("say");
  }
  function plainTag() {
    tagEl.innerHTML = `<b>${h(name || "我")}</b>`;
    tagEl.classList.remove("say");
  }
  function rebuild() {
    if (model) {
      holder.remove(model.group);
      model.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      model.mats.forEach((m) => m.dispose());
    }
    model = buildModel(THREE, look);
    holder.add(model.group);
    tag.visible = true;
    plainTag();
  }
  // 立刻放到路線上的位置（剛建立或換目的地時，鏡頭才知道要飛去哪）
  function place() {
    if (!route) return;
    const st = sample(dist);
    holder.position.set(st.x, st.y, st.z);
    holder.rotation.y = st.yaw;
  }
  function ensure() {
    if (!look) {
      const role = AVATAR.roles[Math.floor(rnd() * AVATAR.roles.length)];
      look = { ...DEFAULT, role: role.id, hat: role.hat, hand: role.hand, shirt: role.shirt, pants: role.pants };
      name = kiosk ? "" : name;
      home = "tainan";
      lastNode = graph.key(home, 6);
      save();
    }
    if (!model) { rebuild(); wander(home); place(); }
  }
  if (look) ensure();

  function update(dt, time, frozen, camDist, camera) {
    if (!model) return;
    k = 0.62 * clamp(camDist / 16, 1, 1.7) * 1.25;
    holder.scale.setScalar(k);
    const moving = !frozen && !posing && route;
    if (moving) {
      const total = seg[seg.length - 1];
      dist += dt * 0.5;
      if (dist >= total) {
        if (mode === "goto") {
          lastNode = route[route.length - 1].id;
          home = target;
          save();
          say(`到了！這裡是${byId.get(target).short}島`, 3200);
          track("avatar_arrive", { island: target });
          wander(home);
        } else dist = dist % total;
      }
    }
    if (route) {
      const st = sample(dist);
      lastNode = st.node || lastNode;
      holder.position.set(st.x, st.y, st.z);
      if (posing && camera) holder.rotation.y = Math.atan2(camera.position.x - st.x, camera.position.z - st.z);
      else holder.rotation.y = st.yaw;
    }
    const sw = moving ? Math.sin(time * 9) : 0;
    model.legs[0].rotation.x = sw * 0.55;
    model.legs[1].rotation.x = -sw * 0.55;
    model.arms[0].rotation.x = model.hand.holding ? -1.1 : -sw * 0.45;
    model.arms[1].rotation.x = model.hand.holding ? -1.1 : sw * 0.45;
    if (posing && !frozen) model.arms[1].rotation.z = 0.6 + Math.sin(time * 6) * 0.4; // 試衣時揮手
    else model.arms[1].rotation.z = 0;
    if (sayUntil && performance.now() > sayUntil) { sayUntil = 0; plainTag(); }
  }

  // ---------- 捏角色的面板（放在卡片的位置，3D 角色就在旁邊即時換裝） ----------
  const swatch = (key, list) => `<div class="av-swatches" role="group">${list.map((c) => `<button type="button" class="sw${look[key] === c ? " on" : ""}" data-av="${key}" data-v="${c}" style="--sw:${hex(c)}" aria-label="顏色"></button>`).join("")}</div>`;
  const chipsRow = (key, list) => `<div class="av-chips">${list.map((o) => `<button type="button" class="av-chip${look[key] === o.id ? " on" : ""}" data-av="${key}" data-v="${o.id}">${h(o.label)}</button>`).join("")}</div>`;
  function editorHTML() {
    return `
      <div class="eyebrow">MY CHARACTER</div>
      <h2 class="c-title">我的角色</h2>
      <p class="c-sub">捏一個自己的小人，讓他在台南政策島上走走。</p>
      ${kiosk ? "" : `<label class="av-row"><span>名字</span><input class="av-name" id="av-name" maxlength="8" placeholder="替角色取個名字" value="${h(name)}"></label>`}
      <div class="av-row"><span>身分</span>${chipsRow("role", AVATAR.roles)}</div>
      <div class="av-row"><span>上衣</span>${swatch("shirt", AVATAR.shirts)}</div>
      <div class="av-row"><span>褲子</span>${swatch("pants", AVATAR.pants)}</div>
      <div class="av-row"><span>頭髮</span>${swatch("hair", AVATAR.hairs)}</div>
      <div class="av-row"><span>膚色</span>${swatch("skin", AVATAR.skins)}</div>
      <div class="av-row"><span>帽子</span>${chipsRow("hat", AVATAR.hats)}</div>
      <div class="av-row"><span>手上</span>${chipsRow("hand", AVATAR.hands)}</div>
      <div class="c-sec">帶他去哪裡？</div>
      <div class="av-chips go">${islands.map((i) => `<button type="button" class="av-chip" data-go="${i.id}" style="--c:${i.color}"><i></i>${h(i.short)}</button>`).join("")}</div>
      <div class="c-nav">
        <button type="button" data-avact="random">🎲 隨機</button>
        <button type="button" data-avact="done" class="primary">完成 →</button>
      </div>
      ${kiosk ? "" : '<p class="c-src"><button type="button" class="av-remove" data-avact="remove">把角色收起來</button></p>'}`;
  }
  function focus() {
    const p = holder.position;
    app.flyNear(p, 1.15);
  }
  function openEditor() {
    ensure();
    posing = true;
    ui.showPanel(editorHTML(), "--c:#176b38;--t:#eaf3ec", onEditorClick);
    const inp = document.getElementById("av-name");
    if (inp) inp.addEventListener("input", () => { name = inp.value.trim().slice(0, 8); save(); plainTag(); });
    focus();
    track("avatar_open");
  }
  function closeEditor() {
    posing = false;
  }
  function onEditorClick(e) {
    const a = e.target.closest("[data-av]");
    if (a) {
      const key = a.dataset.av;
      const v = key === "role" || key === "hat" || key === "hand" ? a.dataset.v : Number(a.dataset.v);
      if (key === "role") {
        const r = AVATAR.roles.find((x) => x.id === v);
        look = { ...look, role: v, hat: r.hat, hand: r.hand, shirt: r.shirt, pants: r.pants };
      } else look = { ...look, [key]: v };
      save();
      rebuild();
      ui.showPanel(editorHTML(), "--c:#176b38;--t:#eaf3ec", onEditorClick, true);
      const inp = document.getElementById("av-name");
      if (inp) inp.addEventListener("input", () => { name = inp.value.trim().slice(0, 8); save(); plainTag(); });
      return true;
    }
    const go = e.target.closest("[data-go]");
    if (go) {
      posing = false;
      goto(go.dataset.go);
      app.closeCard();
      app.followAvatar();
      return true;
    }
    const act = e.target.closest("[data-avact]");
    if (!act) return false;
    if (act.dataset.avact === "random") {
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const role = pick(AVATAR.roles);
      look = { role: role.id, shirt: pick(AVATAR.shirts), pants: pick(AVATAR.pants), hair: pick(AVATAR.hairs), skin: pick(AVATAR.skins), hat: pick(AVATAR.hats).id, hand: pick(AVATAR.hands).id };
      save();
      rebuild();
      ui.showPanel(editorHTML(), "--c:#176b38;--t:#eaf3ec", onEditorClick, true);
    } else if (act.dataset.avact === "done") {
      posing = false;
      say(name ? `我是${name}，出發逛政策島！` : "出發逛政策島！", 2800);
      app.closeCard();
    } else if (act.dataset.avact === "remove") {
      remove();
      app.closeCard();
    }
    return true;
  }
  function remove() {
    if (model) {
      holder.remove(model.group);
      model.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      model.mats.forEach((m) => m.dispose());
    }
    model = null;
    look = null;
    route = null;
    tag.visible = false;
    posing = false;
    if (!kiosk) store.set(KEY, null);
  }

  return {
    update, openEditor, closeEditor, goto, remove,
    reset() { remove(); name = ""; home = "tainan"; lastNode = graph.key(home, 6); },
    get exists() { return !!model; },
    get group() { return holder; },
    meshes() { return model ? [model.group] : []; },
  };
}
