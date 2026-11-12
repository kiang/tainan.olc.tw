// 台南人的一天：點畫面上的時段條，看一天裡不同時段跟哪些政策有關；也可以自動播放一整天。
// 時段與對應的細項都在 data.js 的 dayCycle（示意情境，不是服務時間）。
import { escapeHTML as h } from "./util.js?v=20261029-3";
import { track } from "./track.js?v=20261029-3";

const toMin = (s) => { const [a, b] = s.split(":").map(Number); return a * 60 + b; };

export function createDay({ ui, D, app }) {
  const itemRef = new Map();
  D.islands.forEach((isl) => isl.items.forEach((it, i) => itemRef.set(it.id, { isl, it, i })));
  const segs = D.dayCycle.map((c) => ({ ...c, a: toMin(c.from) }));
  const short = (id) => { const r = itemRef.get(id); return r ? r.it.pin || r.it.name.split("｜").pop() : id; };
  const segAt = (m) => segs.findIndex((s) => { const b = toMin(s.to); return s.a <= b ? m >= s.a && m < b : m >= s.a || m < b; });

  function html(active) {
    return `
      <div class="eyebrow">A DAY IN TAINAN</div>
      <h2 class="c-title">台南人的一天</h2>
      <p class="c-sub">示意情境：一天裡的不同時段，跟哪些政策有關。點一個時段，時間和鏡頭都會跟著換。</p>
      <div class="m-acts"><button class="m-btn primary" type="button" data-day="play">▶ 播放一整天</button></div>
      <ol class="day-list">${segs.map((s, i) => `<li class="${i === active ? "on" : ""}">
        <button type="button" class="day-seg" data-seg="${i}"><b>${h(s.from)}</b><span>${h(s.label)}</span><small>${s.lights.length} 項</small></button>
        ${i === active ? `<div class="day-items">${s.lights.map((id) => { const r = itemRef.get(id); return r ? `<button type="button" class="chip" data-item="${id}" style="--c:${r.isl.color}"><i></i>${h(short(id))}</button>` : ""; }).join("")}</div>` : ""}
      </li>`).join("")}</ol>`;
  }
  function onClick(e) {
    const s = e.target.closest("[data-seg]");
    if (s) { pick(Number(s.dataset.seg)); return true; }
    const p = e.target.closest("[data-day]");
    if (p) { play(); return true; }
    return false; // 細項按鈕交給卡片原本的處理（data-item）
  }
  function open() {
    const i = segAt(app.clock());
    ui.showPanel(html(i), "--c:#176b38;--t:#eaf3ec", onClick, { onLeave: () => app.holdTime(false) });
    track("day_open");
  }
  function pick(i) {
    const s = segs[i];
    app.holdTime(true); // 停在這個時段，燈不會跑到下一段
    app.setTime(s.a + 5);
    app.focusItems(s.lights);
    ui.showPanel(html(i), "--c:#176b38;--t:#eaf3ec", onClick, { keep: true, onLeave: () => app.holdTime(false) });
    track("day_segment", { segment: s.label });
  }
  function play() {
    const cues = segs.map((s) => ({ target: s.lights, time: s.a + 5, caption: `${s.from} ${s.label}｜${s.lights.map(short).join("、")}` }));
    app.holdTime(false);
    app.closeCard();
    app.startTour(cues, { loop: false });
    track("day_play");
  }
  return { open, play };
}
