// 互動：集章卡、「你是哪一種台南人？」測驗、分享、掃碼帶走、網友意見
import { escapeHTML as h } from "./util.js?v=20261029-3";
import { TAGS } from "./data.js?v=20261029-3";
import { qrSVG } from "./qr.js?v=20261029-3";
import { stampURL } from "./stamps.js?v=20261029-3";
import { scoreQuiz, encodeResult, decodeResult } from "./quiz.js?v=20261029-3";
import { stampPoster, quizPoster, loadImage } from "./poster.js?v=20261029-3";
import { islandURL, shareURL, shareLink, prepareImage, saveImage, opinionURL } from "./share.js?v=20261029-3";
import { track } from "./track.js?v=20261029-3";

const ICON = {
  save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 7.5l4-4 4 4M7 11H5.5v9h13v-9H17"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H10l-4 3.5v-3.5H5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/></svg>',
};

export function createPlay({ app, ui, D, stamps, kiosk, pinColor }) {
  const byId = new Map(D.islands.map((i) => [i.id, i]));
  const itemRef = new Map();
  D.islands.forEach((isl) => isl.items.forEach((it, i) => itemRef.set(it.id, { isl, it, i })));
  const $ = (id) => document.getElementById(id);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };
  let timers = [];
  // 存圖要用的圖先下載，結果一出來就能立刻產生圖片
  const preload = (srcs) => srcs.forEach((src) => loadImage(src));
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  // 一張圖（canvas）放進對話框預覽，並先轉好檔案，按「存成圖片」時才能立刻存
  let posterBlob = null;
  function showPoster(slot, canvasP) {
    posterBlob = null;
    canvasP.then((c) => {
      if (!slot.isConnected) return;
      c.className = "m-poster";
      c.setAttribute("role", "img");
      c.setAttribute("aria-label", "可以存下來的圖片預覽");
      slot.replaceChildren(c);
      if (!kiosk) prepareImage(c).then((b) => { posterBlob = b; });
    }).catch(() => { slot.textContent = "圖片產生失敗"; });
  }

  // ---------- 集章卡 ----------
  function syncStamps() {
    const badge = $("stamp-count"), btn = $("btn-stamps");
    badge.textContent = stamps.done ? "✓" : String(stamps.count);
    badge.hidden = stamps.count === 0;
    btn.title = `集章卡（已集 ${stamps.count}／${stamps.total}）`;
    if (stamps.count >= stamps.total - 1) preload(["./img/logo.png", "./img/pose/flag.jpg"]);
    ui.setStamped((id) => stamps.has(id));
  }
  // 卡片打開一座島：自己點的才算（自動導覽不算）
  function islandShown(id, fromTour) {
    const fresh = !fromTour && stamps.collect(id);
    ui.markCard(stamps.markHTML(id, fresh));
    if (fresh) celebrate(id);
  }
  function itemShown(islandId) {
    if (stamps.collect(islandId)) celebrate(islandId);
  }
  function celebrate(id) {
    track("stamp_collect", { island: id, count: stamps.count });
    if (stamps.done) {
      track("stamps_complete");
      ui.toast(`集滿 ${stamps.total} 個章了！`);
      later(() => { if (!ui.modalOpen) openStamps(); }, 1600);
    } else {
      ui.toast(`蓋章！集到「${byId.get(id).short}」章（${stamps.count}／${stamps.total}）`);
    }
  }

  // 集章卡下方：島上藏的台南寶物（彩蛋）進度
  function eggLine() {
    const e = app.eggsProgress && app.eggsProgress();
    if (!e || !e.total) return "";
    return `<button class="egg-line" type="button" data-st="eggs"><span aria-hidden="true">🥭</span>島上還藏著 ${e.total} 樣台南寶物，已找到 ${e.count} 樣 →</button>`;
  }
  function openStamps() {
    const done = stamps.done;
    const slots = D.islands.map((isl) => stamps.has(isl.id)
      ? `<button class="stp-slot got" type="button" data-go="${isl.id}" style="--c:${isl.color}"><img src="${stampURL(isl)}" alt="" width="96" height="96"><span>${h(isl.short)}</span></button>`
      : `<button class="stp-slot" type="button" data-go="${isl.id}" style="--c:${isl.color}"><i>${h(isl.short)}</i><span>還沒集</span></button>`).join("");
    const next = stamps.next();
    let acts = "";
    if (done) {
      acts = kiosk
        ? takeHTML(islandURL("stamps=done"), "用手機掃碼，把集章卡帶回家", "手機打開後可以存成圖片")
        : `<div class="m-acts"><button class="m-btn primary" type="button" data-st="save">${ICON.save}存成圖片</button><button class="m-btn" type="button" data-st="share">${ICON.share}分享政策島</button></div>`;
    } else {
      acts = `<div class="m-acts"><button class="m-btn primary" type="button" data-go="${next.id}">下一站：${h(next.short)}島 →</button></div>`;
    }
    const box = ui.openModal(`
      <div class="m-head"><div class="eyebrow">STAMP RALLY</div>
        <h2 class="m-title" id="modal-title">${done ? "集章完成！" : "台南政策島集章卡"}</h2>
        <p class="m-lead">${done ? `你走遍了台南政策島的 ${stamps.total} 座島，把集章卡存下來吧！` : `自己點進一座島，就蓋一個章。集滿 ${stamps.total} 個章，就能領取你的集章卡！`}</p></div>
      <div class="stp-grid">${slots}</div>
      <div class="stp-progress"><div class="bar"><i style="width:${(stamps.count / stamps.total) * 100}%"></i></div><b>${stamps.count}／${stamps.total}</b></div>
      ${done ? '<div class="m-poster-slot" id="poster-slot"><span>集章卡製作中…</span></div>' : ""}
      ${acts}
      ${eggLine()}`, { cls: "m-stamps" + (done ? " done" : ""), label: "集章卡" });
    if (done) showPoster($("poster-slot"), stampPoster({ islands: D.islands, url: islandURL(), date: today() }));
    box.onclick = (e) => {
      const go = e.target.closest("[data-go]");
      if (go) { ui.closeModal(); app.selectIsland(go.dataset.go); return; }
      const st = e.target.closest("[data-st]");
      if (!st) return;
      if (st.dataset.st === "eggs") { app.openEggs(); return; }
      track(st.dataset.st === "save" ? "save_image" : "share", { kind: "stamps" });
      if (st.dataset.st === "save") saveImage(posterBlob, "台南政策島集章卡.png", { title: "台南政策島集章卡", text: "我集滿台南政策島 7 個章了！" }, ui.toast);
      if (st.dataset.st === "share") shareLink({ title: "台南政策島｜妃妃市長・接棒台南", text: `我集滿台南政策島 ${stamps.total} 個章了！你也來逛逛`, url: shareURL("tainan") }, ui.toast);
    };
  }

  // ---------- 測驗 ----------
  const Q = D.quiz.questions;
  let quiz = null; // { step, answers }

  function openQuiz() {
    track("quiz_open");
    preload(["./img/logo.png", ...Object.values(D.quiz.types).map((t) => t.pose)]);
    quiz = { step: -1, answers: [] };
    renderQuiz();
  }
  function renderQuiz() {
    if (quiz.step < 0) {
      return quizModal(`
        <img class="qz-fig" src="./img/pose/bike.jpg" alt="" width="150" height="206">
        <div class="eyebrow">QUIZ · 6 題</div>
        <h2 class="m-title" id="modal-title">${h(D.quiz.title)}</h2>
        <p class="m-lead">${h(D.quiz.lead)}</p>
        <div class="m-acts"><button class="m-btn primary" type="button" data-qz="start">開始測驗 →</button></div>`, "qz-start");
    }
    const q = Q[quiz.step];
    quizModal(`
      <div class="qz-top"><span>第 ${quiz.step + 1} 題／共 ${Q.length} 題</span><div class="bar"><i style="width:${(quiz.step / Q.length) * 100}%"></i></div></div>
      <h2 class="qz-q" id="modal-title">${h(q.q)}</h2>
      <div class="qz-opts">${q.options.map((o, k) => `<button class="qz-opt${quiz.answers[quiz.step] === k ? " on" : ""}" type="button" data-opt="${k}"><span class="e" aria-hidden="true">${o.emoji}</span><span>${h(o.label)}</span></button>`).join("")}</div>
      <button class="qz-back" type="button" data-qz="back">← ${quiz.step ? "上一題" : "回到說明"}</button>`, "qz-ask");
  }
  function quizModal(html, cls) {
    const box = ui.openModal(html, { cls: "m-quiz " + cls, label: D.quiz.title });
    box.onclick = onQuizClick;
  }
  function onQuizClick(e) {
    const opt = e.target.closest("[data-opt]");
    if (opt && quiz && quiz.step >= 0) {
      quiz.answers[quiz.step] = Number(opt.dataset.opt);
      opt.classList.add("on");
      const step = quiz.step;
      later(() => {
        if (!quiz || quiz.step !== step) return;
        quiz.step++;
        if (quiz.step >= Q.length) showResult(scoreQuiz(D, quiz.answers), { mine: true });
        else renderQuiz();
      }, 220);
      return;
    }
    const a = e.target.closest("[data-qz]");
    if (!a) return;
    const act = a.dataset.qz;
    if (act === "start") { quiz = { step: 0, answers: [] }; renderQuiz(); }
    else if (act === "back") { quiz.step = Math.max(-1, quiz.step - 1); renderQuiz(); }
  }

  function showResult(r, { mine }) {
    if (quiz) track("quiz_complete", { type: r.type });
    else track("quiz_result_view", { type: r.type, mine: mine ? "yes" : "no" });
    quiz = null;
    const type = D.quiz.types[r.type], isl = byId.get(r.type);
    const refs = r.items.map((id) => itemRef.get(id)).filter(Boolean);
    const code = encodeResult(r);
    const list = refs.map(({ isl: is, it, i }, k) => {
      const tag = it.tag && TAGS[it.tag] ? `<span class="tag ${TAGS[it.tag].tone}">${h(TAGS[it.tag].label)}</span>` : "";
      return `<li><button type="button" data-item="${it.id}" style="--pc:${pinColor(is, i)}"><span class="n">${k + 1}</span><span class="nm">${h(it.name)}<small>${h(is.num)} ${h(is.policy)}</small></span>${tag}</button></li>`;
    }).join("");
    const op = opinionURL(isl.policy);
    let acts;
    if (kiosk) {
      acts = `<div class="m-acts"><button class="m-btn primary" type="button" data-rs="tour">${ICON.play}帶我去看</button></div>
        ${takeHTML(islandURL("quiz=me." + code.slice(5)), "用手機掃碼，帶走你的結果", "手機打開後可以存成圖片、傳給朋友")}`;
    } else if (mine) {
      acts = `<div class="m-acts"><button class="m-btn primary" type="button" data-rs="tour">${ICON.play}帶我去看</button>
        <button class="m-btn" type="button" data-rs="save">${ICON.save}存成圖片</button>
        <button class="m-btn" type="button" data-rs="share">${ICON.share}分享結果</button>
        ${op ? `<button class="m-btn" type="button" data-rs="opinion">${ICON.chat}我有話想說</button>` : ""}</div>`;
    } else {
      acts = `<div class="m-acts"><button class="m-btn primary" type="button" data-rs="again">換你測測看 →</button>
        <button class="m-btn" type="button" data-rs="tour">${ICON.play}看這 3 項政策</button></div>`;
    }
    const box = ui.openModal(`
      <div class="qz-res" style="--c:${isl.color};--t:${isl.tint}">
        <img class="qz-pose" src="${h(type.pose)}" alt="" width="150" height="190">
        <div class="eyebrow">${mine ? "YOUR TAINAN TYPE" : "朋友的測驗結果"}</div>
        <p class="qz-you">${mine ? "你是" : "朋友測出來是"}</p>
        <h2 class="qz-type" id="modal-title">${h(type.name)}</h2>
        <span class="qz-chip">${h(isl.num)} ${h(isl.policy)}</span>
        <p class="m-lead">${h(type.desc)}</p>
      </div>
      <div class="c-sec">${mine ? "跟你最有關的 3 項政策" : "跟他最有關的 3 項政策"}</div>
      <ul class="c-items qz-items">${list}</ul>
      ${acts}
      ${mine && !kiosk ? '<div class="m-poster-slot small" id="poster-slot" hidden></div>' : ""}
      ${mine ? '<button class="qz-again" type="button" data-rs="again">再測一次</button>' : ""}`, { cls: "m-quiz qz-result", label: "測驗結果" });
    if (mine && !kiosk) {
      showPoster($("poster-slot"), quizPoster({
        type, isl, pose: type.pose, url: islandURL("quiz"),
        items: refs.map(({ isl: is, it, i }) => ({ name: it.name, policy: is.policy, pin: pinColor(is, i) })),
      }));
    }
    box.onclick = (e) => {
      const it = e.target.closest("[data-item]");
      if (it) { ui.closeModal(); app.selectItem(it.dataset.item); return; }
      const b = e.target.closest("[data-rs]");
      if (!b) return;
      const act = b.dataset.rs;
      track("quiz_" + act, { type: r.type });
      if (act === "tour") { ui.closeModal(); personalTour(r); }
      else if (act === "again") openQuiz();
      else if (act === "save") saveImage(posterBlob, `我是${type.name}.png`, { title: `我是「${type.name}」`, text: `${D.quiz.title} 我是「${type.name}」！` }, ui.toast);
      else if (act === "share") shareLink({ title: `我是「${type.name}」｜${D.quiz.title}`, text: `${D.quiz.title} 我測出來是「${type.name}」，你呢？`, url: shareURL("quiz", code) }, ui.toast);
      else if (act === "opinion") openOpinion(isl.policy);
    };
  }

  // 測驗結果的專屬導覽：鏡頭一站一站飛到 3 項政策
  function personalTour(r) {
    const type = D.quiz.types[r.type];
    const cues = r.items.map((id, k) => {
      const { it } = itemRef.get(id);
      return { target: id, caption: `第 ${k + 1} 站｜${it.name}：${it.facts[0]}` };
    });
    cues.push({ target: "all", caption: `你是「${type.name}」！點任何一座島，繼續探索。` });
    app.startTour(cues, { loop: false });
  }

  // ---------- 掃碼帶走、網友意見 ----------
  function takeHTML(url, title, sub) {
    return `<div class="m-take">${qrSVG(url, { label: title })}<div><b>${h(title)}</b><span>${h(sub)}</span></div></div>`;
  }
  function openTake(ctx) {
    ui.openModal(`
      <div class="m-head"><div class="eyebrow">TAKE IT HOME</div><h2 class="m-title" id="modal-title">帶走「${h(ctx.title)}」</h2>
        <p class="m-lead">用手機相機掃描 QR code，就能在手機上繼續看這一項。</p></div>
      <div class="m-qr big">${qrSVG(islandURL(ctx.id), { label: "掃描 QR code 開啟這一項" })}</div>`, { cls: "m-take-modal", label: "掃碼帶走" });
  }
  function openOpinion(topic) {
    const url = opinionURL(topic);
    if (!url) return;
    track("opinion_click", { topic: topic || "general" });
    if (!kiosk) {
      window.open(url, "_blank", "noopener");
      return;
    }
    ui.openModal(`
      <div class="m-head"><div class="eyebrow">TELL FEIFEI</div><h2 class="m-title" id="modal-title">把想法告訴妃妃</h2>
        <p class="m-lead">用手機掃描 QR code，會打開 LINE 和妃妃的官方帳號對話，訊息已經先幫你寫好「${topic ? `我對「${h(topic)}」的想法：` : "妃妃市長，我想說："}」。</p></div>
      <div class="m-qr big">${qrSVG(url, { label: "掃描 QR code 打開 LINE" })}</div>`, { cls: "m-take-modal", label: "我有話想說" });
  }
  // 卡片上的按鈕（ui.js 的 data-act）
  function act(name, ctx) {
    if (!ctx) return;
    track(name === "take" ? "take_qr" : name === "share" ? "share" : "card_" + name, { kind: "card", id: ctx.id });
    if (name === "share") {
      shareLink({ title: `${ctx.title}｜台南政策島`, text: `妃妃市長的台南政策島：${ctx.title}`, url: shareURL(ctx.page, ctx.id === ctx.page ? "" : ctx.id) }, ui.toast);
    } else if (name === "take") openTake(ctx);
    else if (name === "opinion") openOpinion(ctx.title);
  }

  // ---------- 網址：#quiz、#quiz=…、#stamps、#stamps=done ----------
  function route(hash) {
    if (hash === "quiz") { openQuiz(); return true; }
    if (hash.startsWith("quiz=")) {
      const raw = hash.slice(5);
      const mine = raw.startsWith("me.");
      const r = decodeResult(D, mine ? raw.slice(3) : raw);
      if (r) showResult(r, { mine });
      else openQuiz();
      return true;
    }
    if (hash === "stamps") { openStamps(); return true; }
    if (hash === "stamps=done") { stamps.collectAll(); openStamps(); return true; }
    return false;
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    quiz = null;
    posterBlob = null;
    ui.closeModal();
    stamps.reset();
  }

  $("btn-stamps").onclick = openStamps;
  $("btn-quiz").onclick = openQuiz;
  $("quiz-entry").onclick = openQuiz;
  syncStamps();

  return {
    syncStamps, islandShown, itemShown, openStamps, openQuiz, act, route, reset,
    canOpinion: () => !!opinionURL(""),
    opinion: (topic) => openOpinion(topic),
    get quizOpen() { return !!quiz; },
  };
}
