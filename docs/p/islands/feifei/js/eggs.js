// 小彩蛋：島上藏著 6 樣台南物產，鏡頭拉近才看得到，點到就收集；
// 點騎單車的妃妃會按鈴、點姐姐的小熊會跳。台詞只用新聞稿與競選口號裡有的話。
import { TOP, R } from "./world.js?v=20261029-3";
import { store, escapeHTML as h } from "./util.js?v=20261029-3";
import { track } from "./track.js?v=20261029-3";

const KEY = "feifei-island:eggs:v1";

function model(THREE, kind) {
  const g = new THREE.Group();
  const mats = [];
  const mat = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }); mats.push(m); return m; };
  const add = (geo, m, x, y, z) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
  if (kind === "mango") {
    add(new THREE.SphereGeometry(0.09, 16, 12), mat(0xf4a63a), 0, 0.09, 0).scale.set(1, 0.82, 0.72);
    add(new THREE.SphereGeometry(0.05, 12, 10), mat(0xe2573a), -0.04, 0.12, 0.03).scale.set(1, 0.7, 0.6);
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 6), mat(0x6b4a33), 0.02, 0.18, 0);
    add(new THREE.BoxGeometry(0.07, 0.005, 0.03), mat(0x4f8f3a), 0.05, 0.19, 0).rotation.z = 0.4;
  } else if (kind === "melon") {
    add(new THREE.SphereGeometry(0.095, 16, 12), mat(0xd6e3a0), 0, 0.095, 0);
    for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.096, 0.004, 4, 24), mat(0xeef3d6), 0, 0.095, 0).rotation.y = (i * Math.PI) / 4; // 網紋
    add(new THREE.CylinderGeometry(0.008, 0.01, 0.035, 6), mat(0x7a8a3a), 0, 0.2, 0);
  } else if (kind === "rice") {
    const stalk = mat(0xc9a64a), grain = mat(0xe8c15a);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = 0.02;
      const s = add(new THREE.CylinderGeometry(0.004, 0.005, 0.2, 4), stalk, Math.cos(a) * r, 0.1, Math.sin(a) * r);
      s.rotation.set(Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25);
      add(new THREE.SphereGeometry(0.018, 8, 6), grain, Math.cos(a) * (r + 0.05), 0.2, Math.sin(a) * (r + 0.05)).scale.set(1, 1.8, 1);
    }
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10), mat(0xb5462f), 0, 0.07, 0);
  } else if (kind === "fish") {
    const body = add(new THREE.SphereGeometry(0.09, 16, 10), mat(0xc5d1dc, { metalness: 0.35, roughness: 0.35 }), 0, 0.12, 0);
    body.scale.set(0.42, 0.5, 1.15);
    const tail = add(new THREE.ConeGeometry(0.05, 0.08, 4), mat(0x8fa3b5), 0, 0.12, -0.12);
    tail.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.012, 8, 6), mat(0x1f2421), 0.03, 0.14, 0.07);
    g.rotation.z = 0.35;
  } else if (kind === "orchid") {
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 5), mat(0x4f8f3a), 0, 0.09, 0);
    const petal = mat(0xb35fd0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.035, 10, 8), petal, Math.cos(a) * 0.035, 0.19, Math.sin(a) * 0.035).scale.set(1, 0.45, 1);
    }
    add(new THREE.SphereGeometry(0.018, 8, 6), mat(0xfff3b0), 0, 0.2, 0);
    add(new THREE.BoxGeometry(0.09, 0.006, 0.035), mat(0x3f7a33), 0.03, 0.03, 0).rotation.z = 0.3;
  } else if (kind === "spoonbill") {
    const white = mat(0xf7f7f2), black = mat(0x1f2421);
    add(new THREE.SphereGeometry(0.07, 14, 10), white, 0, 0.16, 0).scale.set(0.8, 0.75, 1.25);
    add(new THREE.CylinderGeometry(0.014, 0.018, 0.09, 6), white, 0, 0.23, 0.06).rotation.x = 0.4;
    add(new THREE.SphereGeometry(0.03, 10, 8), black, 0, 0.28, 0.08);
    add(new THREE.BoxGeometry(0.018, 0.008, 0.11), black, 0, 0.27, 0.15);
    add(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), black, 0, 0.27, 0.205);
    for (const x of [-0.02, 0.02]) add(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 4), black, x, 0.05, 0);
  }
  g.traverse((o) => { if (o.isMesh) o.userData.egg = true; });
  return g;
}

export function createEggs(THREE, scene, { L, D, ui, kiosk, CSS2DObject, people, app }) {
  const list = D.eggs || [];
  const saved = kiosk ? [] : store.get(KEY, []);
  const found = new Set((Array.isArray(saved) ? saved : []).filter((id) => list.some((e) => e.id === id)));
  const items = [];
  for (const e of list) {
    const isl = L.byId.get(e.island);
    if (!isl) continue;
    const g = model(THREE, e.kind);
    const ang = (e.at[0] * Math.PI) / 180, rad = e.at[1] * R;
    g.position.set(isl.cx + Math.cos(ang) * rad, (e.water ? -0.1 : TOP) + 0.002, isl.cz + Math.sin(ang) * rad);
    g.userData.eggId = e.id;
    g.traverse((o) => { o.userData.eggId = e.id; });
    g.scale.setScalar(1.15);
    scene.add(g);
    items.push({ e, g, base: g.position.y, phase: Math.random() * 6 });
  }

  // 妃妃與姐姐頭上的對話泡泡
  const bubble = (group, y) => {
    const el = document.createElement("div");
    el.className = "say-bubble";
    const o = new CSS2DObject(el);
    o.position.set(0, y, 0);
    o.visible = false;
    group.add(o);
    return { el, o, until: 0 };
  };
  const ffSay = bubble(people.feifei.group, 0.62);
  const sisSay = bubble(people.sister.group, 0.5);
  function speak(b, text, ms = 3200) {
    b.el.textContent = text;
    b.o.visible = true;
    b.until = performance.now() + ms;
  }

  const save = () => { if (!kiosk) store.set(KEY, [...found]); };
  function hit(id) {
    const it = items.find((x) => x.e.id === id);
    if (!it) return false;
    if (found.has(id)) {
      ui.toast(`這是${it.e.name}，已經找到囉（${found.size}／${items.length}）`);
      return true;
    }
    found.add(id);
    save();
    it.pop = performance.now();
    track("egg_found", { egg: id, count: found.size });
    if (found.size >= items.length) {
      ui.toast(`全部 ${items.length} 個彩蛋都找到了！`);
      track("eggs_complete");
      setTimeout(() => { if (!ui.modalOpen) openList(true); }, 1500);
    } else ui.toast(`找到彩蛋：${it.e.name}！（${found.size}／${items.length}）`);
    return true;
  }
  function openList(done = false) {
    const rows = items.map(({ e }) => found.has(e.id)
      ? `<li class="egg-row got"><span class="e" aria-hidden="true">${e.emoji}</span><span><b>${h(e.name)}</b><small>${h(e.note)}</small></span>${e.item ? `<button type="button" class="m-btn" data-item="${e.item}">看相關政策</button>` : ""}</li>`
      : `<li class="egg-row"><span class="e" aria-hidden="true">？</span><span><b>還沒找到</b><small>提示：${h(e.hint)}</small></span></li>`).join("");
    const box = ui.openModal(`
      <div class="m-head"><div class="eyebrow">EASTER EGGS</div>
        <h2 class="m-title" id="modal-title">${done ? "台南寶物全部找到了！" : "島上藏著的台南寶物"}</h2>
        <p class="m-lead">把鏡頭拉近每座島，找找看藏起來的 ${items.length} 樣台南物產，點一下就收集。已找到 ${found.size}／${items.length}。</p></div>
      <ul class="egg-list">${rows}</ul>`, { cls: "m-eggs", label: "台南寶物" });
    box.onclick = (ev) => {
      const b = ev.target.closest("[data-item]");
      if (b) { ui.closeModal(); app.selectItem(b.dataset.item); }
    };
  }

  function update(time, camDist, frozen) {
    const show = camDist < 17;
    const now = performance.now();
    for (const it of items) {
      it.g.visible = show;
      if (!show) continue;
      const got = found.has(it.e.id);
      let s = 1.15;
      if (it.pop && now - it.pop < 700) s *= 1 + Math.sin(((now - it.pop) / 700) * Math.PI) * 0.6;
      it.g.scale.setScalar(s);
      it.g.position.y = it.base + (frozen ? 0 : Math.abs(Math.sin(time * 2 + it.phase)) * (got ? 0.01 : 0.035));
      it.g.rotation.y = got ? 0 : time * 0.8 + it.phase;
    }
    for (const b of [ffSay, sisSay]) if (b.until && now > b.until) { b.until = 0; b.o.visible = false; }
  }

  return {
    update, hit, openList,
    feifeiTapped() { people.hopFeifei(); speak(ffSay, D.lines.feifei[Math.floor(Math.random() * D.lines.feifei.length)]); track("egg_feifei"); },
    sisterTapped() { people.hopSister(); speak(sisSay, D.lines.sister[Math.floor(Math.random() * D.lines.sister.length)]); track("egg_sister"); },
    get count() { return found.size; },
    get total() { return items.length; },
    reset() { found.clear(); save(); },
    meshes() { return items.map((x) => x.g); },
  };
}
