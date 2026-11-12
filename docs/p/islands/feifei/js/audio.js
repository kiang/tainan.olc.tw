// 背景音樂：即時合成（Web Audio），沒有音檔、零版權風險。
// 輕快的五聲音階（怎麼組合都不會難聽）＋柔和合成音，像風鈴／木琴的島嶼感。
// 預設「關」；瀏覽器規定要使用者先互動才能發聲，所以一律由右側的音樂鈕開啟。總部觸控機不放。

let ctx, master, timer;
let playing = false;
let nextTime = 0;
let step = 0;
let mi = 4; // 旋律在音階上的目前位置

// 大調五聲音階（半音），鋪成兩個八度，從 D 附近起
const PENT = [0, 2, 4, 7, 9];
const ROOT = 62; // D4
const SCALE = [];
for (let oct = 0; oct < 2; oct++) for (const p of PENT) SCALE.push(ROOT + oct * 12 + p);
const WALK = [-2, -1, -1, 0, 1, 1, 2]; // 旋律每步的移動（偏小跳，較流暢）

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function voice(freq, t, dur, gain, type) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function schedule() {
  const beat = 0.44; // 悠閒、留白多一點
  while (nextTime < ctx.currentTime + 0.4) {
    if (Math.random() > 0.32) { // 多留白，更悠閒
      mi = Math.max(0, Math.min(SCALE.length - 1, mi + WALK[(Math.random() * WALK.length) | 0]));
      voice(midiToFreq(SCALE[mi]), nextTime, 0.72, 0.11, "triangle");
      if (step % 3 === 0) voice(midiToFreq(SCALE[mi] + 12), nextTime + beat * 0.5, 0.3, 0.04, "sine"); // 高八度點綴，較疏
    }
    if (step % 4 === 0) { // 每 4 拍一個柔和低音
      const bass = ROOT - 12 + PENT[((step / 4) | 0) % PENT.length];
      voice(midiToFreq(bass), nextTime, beat * 3.6, 0.05, "sine");
    }
    nextTime += beat;
    step++;
  }
}

function start() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      const lp = ctx.createBiquadFilter(); // 柔化高頻
      lp.type = "lowpass";
      lp.frequency.value = 2600;
      master.connect(lp).connect(ctx.destination);
    }
    ctx.resume();
    playing = true;
    nextTime = ctx.currentTime + 0.1;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.52, ctx.currentTime + 0.8); // 柔和淡入、音量略降
    schedule();
    timer = setInterval(schedule, 120);
    return true;
  } catch {
    return false;
  }
}

function stop() {
  playing = false;
  if (timer) { clearInterval(timer); timer = null; }
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4); // 淡出
  }
}

export function initAudio({ kiosk } = {}) {
  if (kiosk) return null; // 展示機不放背景音樂
  const btn = document.createElement("button");
  btn.className = "icon-only audio-btn";
  btn.id = "btn-audio";
  btn.type = "button";
  btn.setAttribute("aria-pressed", "false");
  btn.title = "背景音樂（開／關）";
  btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17V5l10-2v10"/><circle cx="6.5" cy="17" r="2.5"/><circle cx="16.5" cy="14" r="2.5"/></svg><span class="sr">背景音樂開關</span>`;
  (document.querySelector(".toolbar") || document.getElementById("app") || document.body).appendChild(btn);

  btn.addEventListener("click", () => {
    if (playing) {
      stop();
      btn.setAttribute("aria-pressed", "false");
      btn.classList.remove("on");
    } else if (start()) {
      btn.setAttribute("aria-pressed", "true");
      btn.classList.add("on");
    } else {
      btn.disabled = true; // 這個瀏覽器不支援
      btn.title = "這個瀏覽器不支援背景音樂";
    }
  });

  // 分頁切走就停排程省資源，切回來若還開著再接續
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (timer) { clearInterval(timer); timer = null; }
    } else if (playing && ctx && !timer) {
      nextTime = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 120);
    }
  });

  return { get playing() { return playing; }, stop };
}
