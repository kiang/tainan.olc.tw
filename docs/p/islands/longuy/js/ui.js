// DOM 介面：清單、卡片、HUD、導覽說明、影片、手機底部抽屜
import { TAGS, SOURCES } from "./data.js?v=20261029-3";
import { escapeHTML as h, store } from "./util.js?v=20261029-3";
import { RAINBOW } from "./models.js?v=20261029-3";
import { ROLE_LABEL, CARRY_LABEL } from "./people.js?v=20261029-3";
import { qrSVG } from "./qr.js?v=20261029-3";
import { stampURL } from "./stamps.js?v=20261029-3";
import { islandURL, opinionURL } from "./share.js?v=20261029-3";
import { track } from "./track.js?v=20261029-3";

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";
// 每個版本資料夾各記各的「看過導覽說明」，新版本的說明才會再出現一次
// （v2：/island 換成新版，看過舊版說明的人會再看到一次）
const INTRO_KEY = `feifei-${location.pathname.split("/")[1] || "island"}:intro:v2`;
export const circled = (i) => CIRCLED[i] || String(i + 1);
const srcText = (ids) => (Array.isArray(ids) ? ids : [ids]).map((s) => SOURCES[s] || s).join("、");
export const pinColor = (isl, i) => (isl.rainbow ? "#" + RAINBOW[i % RAINBOW.length].toString(16).padStart(6, "0") : isl.color);

export function createUI(app, D, { isMobile, onePanel, kiosk = false }) {
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const card = $("card"), cardContent = $("card-content");
  const sidebar = $("sidebar"), tree = $("tree"), search = $("search");
  const islands = D.islands;
  const byId = new Map(islands.map((i) => [i.id, i]));
  const itemIndex = new Map();
  islands.forEach((isl) => isl.items.forEach((it, i) => itemIndex.set(it.id, { isl, it, i })));
  const flowsOf = (id) => D.flows.filter((f) => f.from === id || (Array.isArray(f.to) ? f.to.includes(id) : f.to === id));
  const nameOf = (id) => byId.get(id)?.short || id;
  let tab = "policies";
  let selected = { island: null, item: null, flow: null };
  let current = null; // 卡片上「分享／帶走／我有話想說」要用的：{ id, title, page }
  let stamped = () => false;

  const totalItems = islands.reduce((s, i) => s + i.items.length, 0);
  $("side-sub").innerHTML = `6 大政策 ／ ${totalItems} 個細項 ／ ${D.flows.length} 條串聯<br>選一座島，走進它的城市風景。`;

  // ---------- 清單 ----------
  function hl(text, q) {
    const t = h(text);
    if (!q) return t;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return t;
    return h(text.slice(0, i)) + "<mark>" + h(text.slice(i, i + q.length)) + "</mark>" + h(text.slice(i + q.length));
  }
  const matches = (q, ...fields) => !q || fields.some((f) => (Array.isArray(f) ? f.join(" ") : String(f || "")).toLowerCase().includes(q.toLowerCase()));

  function renderTree() {
    const q = search.value.trim();
    if (tab === "flows") {
      const list = D.flows.filter((f) => matches(q, f.text, f.quote, nameOf(f.from), Array.isArray(f.to) ? f.to.map(nameOf) : nameOf(f.to)));
      tree.innerHTML = list.length
        ? list.map((f) => {
            const tos = Array.isArray(f.to) ? f.to : [f.to];
            const fromI = byId.get(f.from);
            return `<button class="t-flow" type="button" data-flow="${f.id}" style="--c:${fromI.color}">
              <div class="route"><span class="chip" style="--c:${fromI.color}"><i></i>${h(fromI.short)}</span>${f.both ? "⇄" : "→"}${tos.map((t) => `<span class="chip" style="--c:${byId.get(t).color}"><i></i>${h(byId.get(t).short)}</span>`).join("")}</div>
              <p>${hl(f.text, q)}</p></button>`;
          }).join("")
        : `<div class="t-empty">找不到相關的串聯關係</div>`;
      return;
    }
    const html = [];
    for (const isl of islands) {
      const items = isl.items.map((it, i) => ({ it, i })).filter(({ it }) => matches(q, it.name, it.facts, it.body, it.list || []));
      const islHit = matches(q, isl.title, isl.policy, isl.short, isl.lead);
      if (q && !items.length && !islHit) continue;
      const open = q ? true : selected.island === isl.id;
      html.push(`<details class="t-isl${selected.island === isl.id ? " sel" : ""}" data-island="${isl.id}" style="--c:${isl.color};--t:${isl.tint}" ${open ? "open" : ""}>
        <summary data-pick="${isl.id}"><span class="t-num">${isl.num || isl.badge}</span><span class="t-name"><b>${hl(isl.policy, q)}</b><small>${hl(isl.title, q)}</small></span><span class="t-count">${stamped(isl.id) ? `<img class="t-stamp" src="${stampURL(isl)}" alt="已集章" width="30" height="30">` : ""}${isl.items.length} 項 ↗</span></summary>
        <ul class="t-items">${(q ? items : isl.items.map((it, i) => ({ it, i }))).map(({ it, i }) => `<li><button type="button" data-item="${it.id}" class="${selected.item === it.id ? "sel" : ""}" style="--c:${pinColor(isl, i)}"><i>${i + 1}</i><span>${hl(it.name, q)}</span></button></li>`).join("")}</ul>
      </details>`);
    }
    tree.innerHTML = html.join("") || `<div class="t-empty">找不到「${h(q)}」，換個關鍵字試試</div>`;
  }
  tree.addEventListener("click", (e) => {
    const flow = e.target.closest("[data-flow]");
    if (flow) return app.selectFlow(flow.dataset.flow);
    const item = e.target.closest("[data-item]");
    if (item) return app.selectItem(item.dataset.item);
    const pick = e.target.closest("summary[data-pick]");
    if (pick) {
      e.preventDefault();
      app.selectIsland(pick.dataset.pick);
    }
  });
  search.addEventListener("input", renderTree);
  $("tab-policies").onclick = () => setTab("policies");
  $("tab-flows").onclick = () => setTab("flows");
  function setTab(t) {
    tab = t;
    $("tab-policies").classList.toggle("active", t === "policies");
    $("tab-flows").classList.toggle("active", t === "flows");
    $("tab-policies").setAttribute("aria-selected", t === "policies");
    $("tab-flows").setAttribute("aria-selected", t === "flows");
    renderTree();
  }

  // ---------- 卡片 ----------
  // panel：不是政策內容的自訂面板（我的角色、台南人的一天），有自己的點擊處理與離開時的收尾
  let panel = null;
  function leavePanel() {
    if (!panel) return;
    const p = panel;
    panel = null;
    if (p.onLeave) p.onLeave();
  }
  function open(html, style, keepScroll = false) {
    if (!keepScroll) leavePanel(); // 換成別的卡片：先收掉自訂面板
    const top = cardContent.scrollTop;
    cardContent.innerHTML = html;
    card.setAttribute("style", style || "");
    card.hidden = false;
    if (!keepScroll) card.classList.remove("full");
    body.classList.add("has-card");
    cardContent.scrollTop = keepScroll ? top : 0;
    if (onePanel()) closeList(true);
    if (isMobile()) setTime(false);
    app.layoutChanged();
  }
  function showPanel(html, style, onClick, { keep = false, onLeave = null } = {}) {
    selected = { island: null, item: null, flow: null };
    current = null;
    takeDefault();
    open(html, style, keep);
    panel = { onClick, onLeave };
    renderTree();
  }
  function hideCard() {
    leavePanel();
    if (card.hidden) return;
    card.hidden = true;
    body.classList.remove("has-card");
    current = null;
    takeDefault();
    app.layoutChanged();
  }
  $("card-close").onclick = () => app.closeCard();

  const tagHTML = (key) => {
    const t = TAGS[key];
    return t ? `<span class="tag ${t.tone}">${h(t.label)}</span>` : "";
  };
  const videoHTML = (isl) => {
    if (isl.video) {
      return `<button class="video-card" type="button" data-video="${isl.id}" aria-label="播放 ${h(isl.title)} 政策影片">
        <img src="${h(isl.video.poster)}" alt="" loading="lazy"><span class="play"><span>▶ 看政策影片</span></span></button>`;
    }
    return isl.id === "tainan" ? "" : `<div class="video-soon">🎬 ${h(isl.title)}的政策影片即將上線</div>`;
  };
  // 卡片標題下的按鈕：網頁「分享」，總部觸控機「帶走這一項」（掃 QR code）；有設定 LINE 才有「我有話想說」
  const ACT_ICON = {
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 7.5l4-4 4 4M7 11H5.5v9h13v-9H17"/></svg>',
    take: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/></svg>',
    opinion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H10l-4 3.5v-3.5H5z"/></svg>',
  };
  function actsHTML(ctx, extra = "") {
    current = ctx;
    const b = kiosk ? [`<button class="act" type="button" data-act="take">${ACT_ICON.take}帶走這一項</button>`] : [`<button class="act" type="button" data-act="share">${ACT_ICON.share}分享</button>`];
    if (opinionURL(ctx.title)) b.push(`<button class="act" type="button" data-act="opinion">${ACT_ICON.opinion}我有話想說</button>`);
    return `<div class="c-acts">${b.join("")}${extra}</div>`;
  }

  const flowChips = (isl) => {
    const fl = flowsOf(isl.id);
    if (!fl.length) return "";
    return `<div class="c-sec">和誰一起串聯</div><div class="chips">${fl.map((f) => {
      const other = f.from === isl.id ? (Array.isArray(f.to) ? "6 大政策" : nameOf(f.to)) : nameOf(f.from);
      const arrow = f.both ? "⇄" : f.from === isl.id ? "→" : "←";
      return `<button class="chip" type="button" data-flow="${f.id}" style="--c:${isl.color}"><i></i>${arrow} ${h(other)}｜${h(f.text)}</button>`;
    }).join("")}</div>`;
  };

  function showIsland(isl) {
    selected = { island: isl.id, item: null, flow: null };
    const n = isl.items.length;
    const fl = flowsOf(isl.id).length;
    const facets = isl.facets ? `<div class="chips">${isl.facets.map((f) => `<span class="chip" style="--c:${isl.color}"><i></i>${h(f)}</span>`).join("")}</div>` : "";
    open(`
      <div class="c-head"><div class="c-badge" style="--c:${isl.color};--t:${isl.tint}">${isl.num || isl.badge}</div>
        <div><div class="eyebrow">${isl.num ? "POLICY " + isl.num : "ONE TAINAN"} · ${h(isl.policy)}</div><h2 class="c-title">${h(isl.title)}</h2></div></div>
      ${actsHTML({ id: isl.id, title: isl.policy, page: isl.id }, isl.game ? '<button class="act game" type="button" data-act="game">🎮 四季農漁接接樂</button>' : "")}
      <p class="c-lead">${h(isl.lead)}</p>
      ${isl.sub ? `<p class="c-sub">${h(isl.sub)}</p>` : ""}
      ${facets}
      <blockquote class="c-quote">「${h(isl.quote)}」<cite>— ${h(SOURCES[isl.source] || "")}</cite></blockquote>
      <div class="chips"><span class="chip">${n} 個細項</span><span class="chip">${fl} 條串聯</span></div>
      ${isl.note ? `<p class="c-note">${h(isl.note)}</p>` : ""}
      ${videoHTML(isl)}
      <div class="c-sec">政策細項</div>
      <ul class="c-items">${isl.items.map((it, i) => `<li><button type="button" data-item="${it.id}" style="--pc:${pinColor(isl, i)}"><span class="n">${i + 1}</span><span class="nm">${h(it.name)}</span>${it.tag ? tagHTML(it.tag) : ""}</button></li>`).join("")}</ul>
      ${flowChips(isl)}
      <p class="c-src">依據：${h(srcText([...new Set(isl.items.flatMap((it) => it.src))]))}</p>
    `, `--c:${isl.color};--t:${isl.tint}`);
    setTake(isl.id, `帶走「${isl.policy}」`);
    renderTree();
  }

  function showItem(id) {
    const ref = itemIndex.get(id);
    if (!ref) return;
    const { isl, it, i } = ref;
    selected = { island: isl.id, item: it.id, flow: null };
    const pc = pinColor(isl, i);
    const prev = isl.items[i - 1], next = isl.items[i + 1];
    open(`
      <div class="c-head"><div class="c-badge round" style="--c:${pc}">${i + 1}</div>
        <div><div class="eyebrow">${isl.num ? isl.num + " " : ""}${h(isl.short)} · 細項 ${circled(i)}</div><h2 class="c-title">${h(it.name)}</h2></div></div>
      ${actsHTML({ id: it.id, title: it.name, page: isl.id })}
      ${it.tag ? `<div class="chips">${tagHTML(it.tag)}</div>` : ""}
      <div class="facts">${it.facts.map((f, k) => `<div class="fact" style="--c:${pc};--t:${isl.tint}"><b>${k + 1}</b><span>${h(f)}</span></div>`).join("")}</div>
      <p class="c-body">${h(it.body)}</p>
      ${it.list ? `<div class="c-list"><h4>${h(it.listTitle || "清單")}</h4><ol>${it.list.map((x) => `<li>${h(x)}</li>`).join("")}</ol></div>` : ""}
      <p class="c-src">依據：${h(srcText(it.src))}</p>
      <div class="c-nav">
        <button type="button" data-item="${prev ? prev.id : ""}" ${prev ? "" : "disabled"}>← 上一項</button>
        <button type="button" data-pick="${isl.id}">${h(isl.short)}島</button>
        <button type="button" data-item="${next ? next.id : ""}" ${next ? "" : "disabled"}>下一項 →</button>
      </div>
    `, `--c:${isl.color};--t:${isl.tint}`);
    setTake(it.id, `帶走「${it.pin || it.name.split("｜").pop()}」`);
    renderTree();
  }

  function showFlow(f) {
    selected = { island: null, item: null, flow: f.id };
    const fromI = byId.get(f.from);
    const tos = Array.isArray(f.to) ? f.to : [f.to];
    open(`
      <div class="c-head"><div class="c-badge" style="--c:${fromI.color};--t:${fromI.tint}">${f.id}</div>
        <div><div class="eyebrow">串聯線 · ${f.basis === "explicit" ? "新聞稿原文" : "政策主題串聯"}</div><h2 class="c-title">${h(f.text)}</h2></div></div>
      ${actsHTML({ id: f.id, title: f.text, page: f.from })}
      <div class="route-row"><button class="chip" type="button" data-pick="${fromI.id}" style="--c:${fromI.color}"><i></i>${h(fromI.short)}</button>${f.both ? "⇄" : "→"}${tos.map((t) => `<button class="chip" type="button" data-pick="${t}" style="--c:${byId.get(t).color}"><i></i>${h(byId.get(t).short)}</button>`).join("")}</div>
      <blockquote class="c-quote">${h(f.quote)}<cite>— ${h(SOURCES[f.src] || "")}</cite></blockquote>
      <div class="chips"><span class="chip">走在線上：${h(ROLE_LABEL[f.walker] || "市民")}</span><span class="chip">搬運：${h(CARRY_LABEL[f.carry] || "—")}</span></div>
      <p class="c-src">實線＝新聞稿原文直接寫到的串聯；虛線＝依政策主題整理的串聯。</p>
    `, `--c:${fromI.color};--t:${fromI.tint}`);
    setTake(f.id, "帶走這條串聯線");
    renderTree();
  }

  function showCharacter(kind) {
    selected = { island: null, item: null, flow: null };
    current = null;
    takeDefault();
    if (kind === "sister") {
      const isl = byId.get("sister");
      open(`
        <img class="c-fig" src="./img/sister-main.jpg" alt="抱著小熊的 Q 版姐姐妃妃" width="96">
        <div class="eyebrow">CHARACTER · 06 姐姐</div><h2 class="c-title">姐姐妃妃市長</h2>
        <p class="c-lead" style="--c:${isl.color}">${h(isl.lead)}</p>
        <p class="c-sub">${h(isl.sub)}</p>
        <div class="c-nav"><button type="button" data-pick="sister">走進姐姐島 →</button></div>
      `, `--c:${isl.color};--t:${isl.tint}`);
    } else {
      open(`
        <img class="c-fig" src="./img/feifei-bike.jpg" alt="騎單車的 Q 版妃妃市長" width="96">
        <div class="eyebrow">CHARACTER · 妃妃市長</div><h2 class="c-title">騎單車巡島的妃妃市長</h2>
        <p class="c-lead" style="--c:#176b38">綠色・陽光・行動力・台南的未來・一起騎出來！</p>
        <p class="c-sub">她正沿著步道與跨溪大橋，一座一座騎過 7 座政策島，就像持續走遍台南 37 區。</p>
        <div class="c-acts"><button class="act" type="button" data-act="ask">💬 問妃妃</button><button class="act game" type="button" data-act="game">🎮 四季農漁接接樂</button></div>
        <div class="c-nav"><button type="button" data-pick="tainan">從大台南出發 →</button></div>
        <p class="c-src"><a href="/">回到 6 大政策影片 →</a></p>
      `, "--c:#176b38;--t:#eaf3ec");
    }
  }

  function showWalker(w) {
    if (!w.flow) return;
    const f = w.flow;
    current = null;
    takeDefault();
    open(`
      <div class="eyebrow">CITIZEN · ${h(ROLE_LABEL[w.role] || "市民")}</div>
      <h2 class="c-title">正在搬運：${h(CARRY_LABEL[w.carry] || "—")}</h2>
      <p class="c-lead" style="--c:${byId.get(f.from).color}">${h(f.text)}</p>
      <div class="c-nav"><button type="button" data-flow="${f.id}">看這條串聯線 →</button></div>
    `, `--c:${byId.get(f.from).color};--t:${byId.get(f.from).tint}`);
  }

  cardContent.addEventListener("click", (e) => {
    if (panel && panel.onClick && panel.onClick(e)) return;
    const a = e.target.closest("[data-act]");
    if (a) return app.act(a.dataset.act, current);
    const v = e.target.closest("[data-video]");
    if (v) return openVideo(byId.get(v.dataset.video));
    const it = e.target.closest("[data-item]");
    if (it && it.dataset.item) return app.selectItem(it.dataset.item);
    const fl = e.target.closest("[data-flow]");
    if (fl) return app.selectFlow(fl.dataset.flow);
    const pk = e.target.closest("[data-pick]");
    if (pk) return app.selectIsland(pk.dataset.pick);
  });

  // ---------- 影片 ----------
  const video = $("video"), frame = $("video-frame");
  const iframeHTML = (id, title) =>
    `<iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1" title="${h(title)} 政策影片" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  // 展示機用 YouTube IFrame API（和官網首頁同一招）：先正常載入播放器再呼叫播放，
  // 自動播放被擋時仍看得到播放鍵，不會停在全黑；影片播完自動關閉、回到政策島
  let ytReady = null;
  let player = null;
  function loadYouTube() {
    if (ytReady) return ytReady;
    ytReady = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const timer = setTimeout(() => resolve(null), 6000);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        clearTimeout(timer);
        resolve(window.YT || null);
      };
      const sc = document.createElement("script");
      sc.src = "https://www.youtube.com/iframe_api";
      sc.async = true;
      sc.onerror = () => { clearTimeout(timer); resolve(null); };
      document.head.appendChild(sc);
    });
    return ytReady;
  }
  function openVideo(isl) {
    if (!isl?.video) return;
    track("video_play", { island: isl.id });
    $("video-title").textContent = `${isl.title}｜${isl.policy}`;
    const id = encodeURIComponent(isl.video.youtubeId);
    $("video-link").href = `https://www.youtube.com/watch?v=${id}`;
    video.hidden = false;
    app.pauseForModal(true);
    if (!kiosk) {
      frame.innerHTML = iframeHTML(id, isl.title);
      return;
    }
    frame.innerHTML = '<div id="yt-slot"></div>';
    loadYouTube().then((YT) => {
      if (video.hidden) return; // 載入途中已經關掉
      if (!YT) { frame.innerHTML = iframeHTML(id, isl.title); return; }
      player = new YT.Player("yt-slot", {
        videoId: isl.video.youtubeId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: (e) => { try { e.target.playVideo(); } catch { /* 被擋就留給使用者按 */ } },
          onStateChange: (e) => { if (e.data === 0) closeVideo(); }, // 0＝播放結束
        },
      });
    });
  }
  function closeVideo() {
    if (video.hidden) return;
    if (player) {
      try { player.destroy(); } catch { /* 忽略 */ }
      player = null;
    }
    frame.innerHTML = "";
    video.hidden = true;
    app.pauseForModal(false);
  }
  $("video-close").onclick = closeVideo;
  video.addEventListener("click", (e) => { if (e.target === video) closeVideo(); });

  // ---------- 對話框：集章卡、測驗、掃碼帶走 ----------
  const modal = $("modal"), modalContent = $("modal-content");
  let modalClosed = null;
  function openModal(html, { cls = "", label = "", onClose = null } = {}) {
    if (modalClosed) { const f = modalClosed; modalClosed = null; f(); } // 換內容也算關掉上一個
    modalClosed = onClose;
    modalContent.innerHTML = html;
    modalContent.onclick = null;
    modal.className = "modal " + cls;
    $("modal-box").setAttribute("aria-label", label);
    if (modal.hidden) {
      modal.hidden = false;
      app.pauseForModal(true);
    }
    modalContent.scrollTop = 0;
    $("modal-close").focus({ preventScroll: true });
    return modalContent;
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    modalContent.innerHTML = "";
    modalContent.onclick = null;
    app.pauseForModal(false);
    if (modalClosed) { const f = modalClosed; modalClosed = null; f(); }
  }
  $("modal-close").onclick = closeModal;
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // ---------- 總部觸控機：側欄下方的 QR code（掃碼帶走這一項、或在手機上自己逛） ----------
  let takeKey = "";
  function setTake(hash, title, sub = "用手機相機掃描，在手機上繼續看") {
    if (!kiosk) return;
    const key = hash + "|" + title;
    if (key === takeKey) return;
    takeKey = key;
    $("take-qr").innerHTML = qrSVG(islandURL(hash), { label: title });
    $("take-title").textContent = title;
    $("take-sub").textContent = sub;
  }
  const takeDefault = () => setTake("", "手機也能玩", "用手機相機掃描，在自己手機上逛政策島");
  if (kiosk) {
    $("take").hidden = false;
    takeDefault();
  }

  // ---------- 側欄開合 ----------
  function openList() {
    body.classList.remove("side-closed");
    $("btn-list").setAttribute("aria-pressed", "true");
    if (onePanel()) hideCard();
    if (isMobile()) setTime(false);
    app.layoutChanged();
  }
  function closeList(silent) {
    body.classList.add("side-closed");
    sidebar.classList.remove("full");
    $("btn-list").setAttribute("aria-pressed", "false");
    if (!silent) app.layoutChanged();
  }
  $("btn-list").onclick = () => (body.classList.contains("side-closed") ? openList() : closeList());
  $("side-close").onclick = () => closeList();

  // ---------- 手機：時間面板 ----------
  function setTime(on) {
    body.classList.toggle("m-time", on);
    $("btn-time").setAttribute("aria-pressed", on ? "true" : "false");
    if (on && isMobile()) { hideCard(); closeList(true); }
    app.layoutChanged();
  }
  $("btn-time").onclick = () => setTime(!body.classList.contains("m-time"));

  // ---------- 底部抽屜拖曳 ----------
  function dragSheet(handle, sheet, onDown) {
    let y0 = 0, moved = 0, dragging = false;
    handle.addEventListener("pointerdown", (e) => {
      dragging = true; y0 = e.clientY; moved = 0;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      moved = e.clientY - y0;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(moved) < 8) sheet.classList.toggle("full");
      else if (moved < -30) sheet.classList.add("full");
      else if (moved > 30) {
        if (sheet.classList.contains("full")) sheet.classList.remove("full");
        else onDown();
      }
      app.layoutChanged();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }
  dragSheet($("card-handle"), card, () => app.closeCard());
  dragSheet($("sheet-handle"), sidebar, () => closeList());

  // ---------- HUD ----------
  const hud = $("hud");
  hud.addEventListener("click", (e) => {
    const t = e.target.closest("[data-time]");
    if (t) return app.setTime(Number(t.dataset.time));
    const g = e.target.closest("[data-toggle]");
    if (g) app.toggle(g.dataset.toggle);
  });
  function setToggle(name, on) {
    const b = hud.querySelector(`[data-toggle="${name}"]`);
    if (b) b.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function setTimeButtons(min) {
    const segs = [[300, 600, 360], [600, 1020, 720], [1020, 1170, 1080]];
    let on = 1260;
    for (const [a, b, v] of segs) if (min >= a && min < b) on = v;
    hud.querySelectorAll("[data-time]").forEach((b) => b.classList.toggle("on", Number(b.dataset.time) === on));
  }
  function setDay(clock, label) {
    $("clock").textContent = clock;
    $("day-label").textContent = label;
  }

  // ---------- 導覽說明（第一次進入） ----------
  const STEPS = [
    { title: "每座島是一項政策", text: "中央是「一個大台南」，周圍 6 座島是科技、農漁、觀光、福利、交通與姐姐市長。曾文溪把島群分成溪北與溪南。", fig: "./img/feifei-stand.jpg" },
    { title: "點一座島，看細項", text: "點島或用右側清單，就能看到每項政策的細項、依據與政策影片；①②③ 是島上的細項。", fig: "./img/feifei-bike.jpg" },
    { title: "看見政策怎麼串聯", text: "打開「串聯線」，小人會沿著線搬運，告訴你交通怎麼帶動觀光、科技怎麼帶動農業。", fig: "./img/sister-main.jpg" },
    { title: "集章、測驗，一起玩", text: "每走進一座島就蓋一個章，集滿 7 個章領集章卡；「測驗」找出跟你最有關的 3 項政策；按「角色」捏一個自己的小人。", fig: "./img/pose/flag.jpg" },
    { title: "問妃妃、找寶物", text: "點左下角的妃妃問問題；把鏡頭拉近，島上還藏著 6 樣台南物產等你找；點下方「台南人的一天」看每個時段的政策。", fig: "./img/pose/point.jpg" },
  ];
  let step = 0;
  const intro = $("intro");
  function renderStep() {
    const s = STEPS[step];
    $("intro-count").textContent = `HELLO, TAINAN / 0${step + 1}`;
    $("intro-title").textContent = s.title;
    $("intro-text").textContent = s.text;
    $("intro-fig").src = s.fig;
    $("intro-next").textContent = step < STEPS.length - 1 ? "下一步 →" : "開始探索";
  }
  function showIntro() {
    step = 0;
    renderStep();
    intro.hidden = false;
    $("intro-next").focus({ preventScroll: true });
  }
  function closeIntro() {
    intro.hidden = true;
    store.set(INTRO_KEY, true);
  }
  $("intro-next").onclick = () => {
    if (step < STEPS.length - 1) { step++; renderStep(); } else closeIntro();
  };
  $("intro-skip").onclick = closeIntro;
  $("btn-help").onclick = showIntro;

  // ---------- 導覽 ----------
  function setTour(on, text, count) {
    $("tour-caption").hidden = !on;
    body.classList.toggle("touring", on);
    $("tour-hint").hidden = !(on && kiosk);
    $("btn-tour").setAttribute("aria-pressed", on ? "true" : "false");
    if (on) {
      $("tour-text").textContent = text || "";
      $("tour-count").textContent = count || "";
      takeDefault(); // 導覽時 LED 牆前的人看到的是「手機也能玩」
    }
  }
  $("btn-tour").onclick = () => app.toggleTour();
  $("tour-stop").onclick = () => app.toggleTour(false);
  $("btn-home").onclick = () => app.home();
  $("btn-zoom-in").onclick = () => app.zoom(0.78);
  $("btn-zoom-out").onclick = () => app.zoom(1.28);
  $("mascot").onclick = () => app.openAsk();
  $("daybar").onclick = () => app.openDay();
  $("btn-avatar").onclick = () => app.openAvatar();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!video.hidden) return closeVideo();
      if (!modal.hidden) return closeModal();
      if (!intro.hidden) return closeIntro();
      app.closeCard();
    }
    const typing = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
    if ((e.key === "f" || e.key === "F") && !typing && !e.ctrlKey && !e.metaKey) toggleFs();
  });

  // ---------- 提示訊息 ----------
  const toastEl = $("toast");
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  // ---------- 全螢幕（仿 ai2.html 的全螢幕鈕；F 鍵切換） ----------
  const fsBtn = $("btn-fs");
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const rootEl = document.documentElement;
  const fsSupported = !!(rootEl.requestFullscreen || rootEl.webkitRequestFullscreen);
  let wantFs = false; // 展示機：全螢幕被意外退出後，下一次觸控自動回到全螢幕
  function enterFs() {
    const fn = rootEl.requestFullscreen || rootEl.webkitRequestFullscreen;
    if (!fn) return;
    try {
      const r = fn.call(rootEl);
      if (r && r.catch) r.catch(() => {});
    } catch { /* 忽略 */ }
  }
  function leaveFs() {
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (!fn) return;
    try {
      const r = fn.call(document);
      if (r && r.catch) r.catch(() => {});
    } catch { /* 忽略 */ }
  }
  function toggleFs() {
    if (isFs()) { wantFs = false; leaveFs(); } else { wantFs = true; enterFs(); }
  }
  function syncFs() {
    const on = isFs();
    fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
    fsBtn.title = on ? (kiosk ? "長按離開全螢幕" : "離開全螢幕（F）") : "全螢幕（F）";
    // 視窗本身已經佔滿螢幕（Chrome --kiosk 或 F11）就不需要按鈕
    const covers = !on && innerWidth >= screen.width - 2 && innerHeight >= screen.height - 2;
    fsBtn.hidden = !fsSupported || covers || (isMobile() && !kiosk);
    body.classList.toggle("has-fs", !fsBtn.hidden);
  }
  // 展示機在全螢幕時要長按才離開，民眾隨手一點不會跳出去
  let holdTimer = 0, held = false;
  fsBtn.addEventListener("pointerdown", () => {
    held = false;
    if (kiosk && isFs()) holdTimer = setTimeout(() => { held = true; wantFs = false; leaveFs(); }, 1200);
  });
  const cancelHold = () => clearTimeout(holdTimer);
  fsBtn.addEventListener("pointerup", cancelHold);
  fsBtn.addEventListener("pointerleave", cancelHold);
  fsBtn.addEventListener("pointercancel", cancelHold);
  fsBtn.addEventListener("click", () => {
    if (held) return;
    if (kiosk && isFs()) return toast("要離開全螢幕，請長按這顆按鈕");
    toggleFs();
  });
  document.addEventListener("fullscreenchange", syncFs);
  document.addEventListener("webkitfullscreenchange", syncFs);
  window.addEventListener("resize", syncFs);

  if (kiosk) {
    // 全螢幕被意外退出（例如有人按了 Esc）：下一次觸控就回到全螢幕
    document.addEventListener("click", () => { if (wantFs && !isFs()) enterFs(); }, true);
    // 所有連結都不離開政策島；回首頁的連結改成回到全景
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      e.preventDefault();
      if (a.getAttribute("href") === "/") app.home();
    }, true);
  }
  syncFs();

  // 展示機閒置時回到初始狀態
  function resetForKiosk() {
    closeVideo();
    closeModal();
    intro.hidden = true;
    search.value = "";
    setTab("policies");
    tree.scrollTop = 0;
    setTime(false);
    sidebar.classList.remove("full");
    card.classList.remove("full");
    if (onePanel()) closeList(true);
    else if (body.classList.contains("side-closed")) openList();
  }

  if (onePanel()) body.classList.add("side-closed");
  renderTree();

  return {
    showIsland, showItem, showFlow, showCharacter, showWalker, hideCard,
    openList, closeList, setToggle, setTimeButtons, setDay, setTour, showIntro,
    toast, resetForKiosk, openModal, closeModal, showPanel,
    // 島的卡片右上角蓋章
    markCard(html) {
      const head = cardContent.querySelector(".c-head");
      if (head && html && !head.querySelector(".c-stamp")) head.insertAdjacentHTML("beforeend", html);
    },
    setStamped(fn) { stamped = fn; renderTree(); },
    get videoOpen() { return !video.hidden; },
    get introSeen() { return store.get(INTRO_KEY, false); },
    get modalOpen() { return !video.hidden || !intro.hidden || !modal.hidden; },
    clearSelection() { selected = { island: null, item: null, flow: null }; renderTree(); },
    panelRects() {
      const rects = [];
      for (const el of [card, sidebar, $("hud"), $("tour-caption"), document.querySelector(".toolbar"), document.querySelector(".zoom"), document.querySelector(".brand"), $("mascot"), $("legend"), $("btn-fs")]) {
        if (!el || el.hidden) continue;
        if (el === sidebar && body.classList.contains("side-closed")) continue;
        if (el.id === "hud" && isMobile() && !body.classList.contains("m-time")) continue;
        if (getComputedStyle(el).opacity === "0" || getComputedStyle(el).display === "none") continue;
        const r = el.getBoundingClientRect();
        if (r.width && r.height) rects.push(r);
      }
      return rects;
    },
  };
}
