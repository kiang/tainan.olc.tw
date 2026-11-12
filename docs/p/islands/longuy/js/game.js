// 小遊戲「四季農漁接接樂」：30 秒內接住掉下來的台南農漁產，躲開颱風。
// 手指或滑鼠左右拖、鍵盤方向鍵都可以玩；總部觸控機的最高分只記在記憶體。
import { store, escapeHTML as h } from "./util.js?v=20261029-3";
import { track } from "./track.js?v=20261029-3";

const W = 360, H = 480, TIME = 30;
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const GOODS = [
  { e: "🥭", name: "芒果", pts: 1, w: 3 },
  { e: "🍈", name: "洋香瓜", pts: 1, w: 3 },
  { e: "🌾", name: "稻米", pts: 1, w: 3 },
  { e: "🐟", name: "虱目魚", pts: 2, w: 2 },
];
const STORM = { e: "🌀", name: "颱風", pts: -3, storm: true };
const KEY = "feifei-island:game:best";

export function createGame({ ui, kiosk, onPolicy }) {
  let best = kiosk ? 0 : Number(store.get(KEY, 0)) || 0;
  let raf = 0, st = null, cv = null, g = null;

  function open() {
    stop();
    const box = ui.openModal(`
      <div class="m-head"><div class="eyebrow">MINI GAME · 30 秒</div>
        <h2 class="m-title" id="modal-title">四季農漁接接樂</h2>
        <p class="m-lead">左右拖動籃子，接住台南的芒果、洋香瓜、稻米和虱目魚，小心別接到颱風！</p></div>
      <div class="gm-stage"><canvas id="gm-canvas" width="${W * 2}" height="${H * 2}" aria-label="小遊戲畫面"></canvas>
        <div class="gm-over" id="gm-over"><button class="m-btn primary" type="button" data-gm="start">▶ 開始</button>
          <p>${best ? `最高分 ${best} 分` : "看你能接住多少"}</p></div></div>`, { cls: "m-game", label: "四季農漁接接樂", onClose: stop });
    cv = document.getElementById("gm-canvas");
    g = cv.getContext("2d");
    g.setTransform(2, 0, 0, 2, 0, 0);
    st = null;
    drawIdle();
    box.onclick = (e) => {
      const b = e.target.closest("[data-gm]");
      if (!b) return;
      if (b.dataset.gm === "start") start();
      else if (b.dataset.gm === "policy") { stop(); ui.closeModal(); onPolicy(); }
    };
    const move = (e) => {
      if (!st) return;
      const r = cv.getBoundingClientRect();
      st.bx = Math.max(30, Math.min(W - 30, ((e.clientX - r.left) / r.width) * W));
    };
    cv.addEventListener("pointerdown", (e) => { move(e); cv.setPointerCapture?.(e.pointerId); });
    cv.addEventListener("pointermove", move);
    cv.addEventListener("keydown", (e) => {
      if (!st) return;
      if (e.key === "ArrowLeft") st.bx = Math.max(30, st.bx - 30);
      if (e.key === "ArrowRight") st.bx = Math.min(W - 30, st.bx + 30);
    });
    cv.tabIndex = 0;
  }

  function start() {
    document.getElementById("gm-over").hidden = true;
    st = { t: 0, score: 0, bx: W / 2, drops: [], fx: [], next: 0.3, shake: 0, caught: {}, last: performance.now() };
    cv.focus({ preventScroll: true });
    track("game_start");
    loop();
  }
  function loop() {
    if (!cv || !cv.isConnected || !st) return stop();
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - st.last) / 1000);
    st.last = now;
    st.t += dt;
    const left = TIME - st.t;
    if (left <= 0) return end();
    // 越後面掉得越快、越密
    const p = st.t / TIME;
    st.next -= dt;
    if (st.next <= 0) {
      st.next = 0.72 - p * 0.32;
      const storm = Math.random() < 0.12 + p * 0.08;
      let item = STORM;
      if (!storm) {
        let r = Math.random() * GOODS.reduce((s, x) => s + x.w, 0);
        item = GOODS.find((x) => (r -= x.w) < 0) || GOODS[0];
      }
      st.drops.push({ item, x: 26 + Math.random() * (W - 52), y: -24, v: 140 + p * 170 + Math.random() * 40 });
    }
    for (const d of st.drops) d.y += d.v * dt;
    const by = H - 46;
    st.drops = st.drops.filter((d) => {
      if (d.y > by - 18 && d.y < by + 16 && Math.abs(d.x - st.bx) < 40) {
        st.score = Math.max(0, st.score + d.item.pts);
        st.caught[d.item.name] = (st.caught[d.item.name] || 0) + 1;
        st.fx.push({ x: d.x, y: by - 30, text: d.item.storm ? "-3 颱風！" : `+${d.item.pts}`, bad: !!d.item.storm, t: 0 });
        if (d.item.storm) st.shake = 0.35;
        return false;
      }
      return d.y < H + 30;
    });
    st.fx = st.fx.filter((f) => (f.t += dt) < 0.8);
    st.shake = Math.max(0, st.shake - dt);
    draw(left);
  }

  function bg() {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#dff1f6");
    grad.addColorStop(0.72, "#fdf6e6");
    grad.addColorStop(1, "#cfe3a4");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#b9d77f";
    g.fillRect(0, H - 22, W, 22);
  }
  function drawIdle() {
    bg();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `44px ${EMOJI}`;
    GOODS.forEach((it, i) => g.fillText(it.e, 70 + i * 74, 150 + (i % 2) * 30));
    g.fillText(STORM.e, W / 2, 260);
    g.font = `48px ${EMOJI}`;
    g.fillText("🧺", W / 2, H - 46);
  }
  function draw(left) {
    g.save();
    if (st.shake) g.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6);
    bg();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `34px ${EMOJI}`;
    for (const d of st.drops) g.fillText(d.item.e, d.x, d.y);
    g.font = `50px ${EMOJI}`;
    g.fillText("🧺", st.bx, H - 46);
    for (const f of st.fx) {
      g.globalAlpha = 1 - f.t / 0.8;
      g.font = `900 20px ${FONT}`;
      g.fillStyle = f.bad ? "#d93f3f" : "#176b38";
      g.fillText(f.text, f.x, f.y - f.t * 40);
      g.globalAlpha = 1;
    }
    g.restore();
    g.fillStyle = "rgba(255,253,248,.9)";
    g.fillRect(0, 0, W, 38);
    g.font = `800 17px ${FONT}`;
    g.textBaseline = "middle";
    g.fillStyle = left < 6 ? "#d93f3f" : "#1f2421";
    g.textAlign = "left";
    g.fillText(`⏱ ${Math.ceil(left)} 秒`, 12, 19);
    g.fillStyle = "#176b38";
    g.textAlign = "right";
    g.fillText(`得分 ${st.score}`, W - 12, 19);
  }

  function end() {
    cancelAnimationFrame(raf);
    raf = 0;
    const score = st.score;
    const newBest = score > best;
    if (newBest) { best = score; if (!kiosk) store.set(KEY, best); }
    const title = score >= 25 ? "四季豐收王！" : score >= 15 ? "好身手的農漁達人" : score >= 8 ? "收成不錯！" : "再接再厲！";
    const got = Object.entries(st.caught).filter(([n]) => n !== "颱風").map(([n, c]) => `${n} ${c}`).join("、") || "還沒接到";
    const over = document.getElementById("gm-over");
    over.innerHTML = `<b class="gm-score">${score} 分</b><span class="gm-title">${h(title)}${newBest && score ? "・新紀錄" : ""}</span>
      <p>接到：${h(got)}${st.caught["颱風"] ? `；被颱風打到 ${st.caught["颱風"]} 次` : ""}</p>
      <div class="m-acts"><button class="m-btn primary" type="button" data-gm="start">再玩一次</button>
      <button class="m-btn" type="button" data-gm="policy">看四季農漁業政策 →</button></div>`;
    over.hidden = false;
    track("game_end", { score });
    st = null;
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    st = null;
  }

  return { open, stop, get playing() { return !!raf; } };
}
