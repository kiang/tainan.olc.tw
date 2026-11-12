// 問妃妃：像聊天一樣點問題、妃妃回答。不開放打字，答案由 data.js 的島與細項組成（都出自新聞稿），
// 不另外寫承諾；福利類細項照樣標出「對標六都補齊」等狀態。
import { TAGS } from "./data.js?v=20261029-3";
import { escapeHTML as h } from "./util.js?v=20261029-3";
import { track } from "./track.js?v=20261029-3";

const ACT_LABEL = { quiz: "🙋 你是哪一種台南人？", stamps: "🔖 集章卡", eggs: "🥭 找台南寶物", game: "🎮 四季農漁接接樂", avatar: "🧑 捏我的角色", opinion: "💬 用 LINE 告訴妃妃" };

export function createAsk({ ui, D, app, actions, canOpinion }) {
  const itemRef = new Map();
  D.islands.forEach((isl) => isl.items.forEach((it, i) => itemRef.set(it.id, { isl, it, i })));
  const byId = new Map(D.islands.map((i) => [i.id, i]));
  const Q = D.ask.questions.filter((q) => !(q.acts || []).includes("opinion") || canOpinion());
  let log = [];
  let busy = 0;

  const tag = (it) => (it.tag && TAGS[it.tag] ? ` <span class="tag ${TAGS[it.tag].tone}">${h(TAGS[it.tag].label)}</span>` : "");
  function answer(q) {
    let html = `<p>${h(q.lead)}</p>`;
    const go = [];
    if (q.items) {
      html += `<ul>${q.items.map((id) => itemRef.get(id)).filter(Boolean).map(({ it }) => `<li><b>${h(it.name)}</b>：${h(it.facts[0])}${tag(it)}</li>`).join("")}</ul>`;
      q.items.forEach((id) => { const r = itemRef.get(id); if (r) go.push(`<button type="button" class="ask-go" data-item="${id}" style="--c:${r.isl.color}">${h(r.it.pin || r.it.name.split("｜").pop())} →</button>`); });
    }
    if (q.islands) {
      html += `<ul>${q.islands.map((id) => byId.get(id)).filter(Boolean).map((isl) => `<li><b>${h(isl.num)} ${h(isl.policy)}</b>：${h(isl.lead)}</li>`).join("")}</ul>`;
      q.islands.forEach((id) => { const isl = byId.get(id); if (isl) go.push(`<button type="button" class="ask-go" data-pick="${id}" style="--c:${isl.color}">${h(isl.short)}島 →</button>`); });
    }
    if (q.acts) q.acts.forEach((a) => go.push(`<button type="button" class="ask-go act" data-askact="${a}">${h(ACT_LABEL[a] || a)}</button>`));
    return html + (go.length ? `<div class="ask-gos">${go.join("")}</div>` : "");
  }
  const bubble = (m) => m.who === "me"
    ? `<div class="bub me">${h(m.text)}</div>`
    : `<div class="bub ff"><img src="./img/feifei-face.jpg" alt="" width="34" height="34"><div class="txt">${m.html}</div></div>`;

  function render() {
    const box = ui.openModal(`
      <div class="ask-head"><img src="./img/feifei-face.jpg" alt="" width="52" height="52">
        <div><h2 class="m-title" id="modal-title">問妃妃</h2><small>點下面的問題，回答整理自競選總部新聞稿</small></div></div>
      <div class="ask-log" id="ask-log">${log.map(bubble).join("")}</div>
      <div class="ask-qs" id="ask-qs">${Q.map((q) => `<button type="button" class="ask-q" data-q="${q.id}">${h(q.q)}</button>`).join("")}</div>`, { cls: "m-ask", label: "問妃妃" });
    box.onclick = onClick;
    scrollDown();
  }
  function scrollDown() {
    const lg = document.getElementById("ask-log");
    if (lg) lg.scrollTop = lg.scrollHeight;
  }
  function onClick(e) {
    const qb = e.target.closest("[data-q]");
    if (qb && !busy) {
      const q = Q.find((x) => x.id === qb.dataset.q);
      if (!q) return;
      log.push({ who: "me", text: q.q });
      const lg = document.getElementById("ask-log");
      lg.insertAdjacentHTML("beforeend", bubble(log[log.length - 1]) + '<div class="bub ff typing" id="ask-typing"><img src="./img/feifei-face.jpg" alt="" width="34" height="34"><div class="txt"><i></i><i></i><i></i></div></div>');
      scrollDown();
      track("ask_question", { question: q.id });
      busy = setTimeout(() => {
        busy = 0;
        const t = document.getElementById("ask-typing");
        log.push({ who: "ff", html: answer(q) });
        if (t) t.outerHTML = bubble(log[log.length - 1]);
        scrollDown();
      }, 520);
      return;
    }
    const it = e.target.closest("[data-item]");
    if (it) { ui.closeModal(); app.selectItem(it.dataset.item); return; }
    const pk = e.target.closest("[data-pick]");
    if (pk) { ui.closeModal(); app.selectIsland(pk.dataset.pick); return; }
    const a = e.target.closest("[data-askact]");
    if (a && actions[a.dataset.askact]) actions[a.dataset.askact]();
  }

  function open() {
    if (!log.length) log.push({ who: "ff", html: `<p>${h(D.ask.greet)}</p>` });
    render();
    track("ask_open");
  }

  return {
    open,
    reset() { clearTimeout(busy); busy = 0; log = []; },
  };
}
