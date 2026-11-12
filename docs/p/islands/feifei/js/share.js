// 分享：手機叫出內建分享選單（LINE、臉書…），電腦複製連結；圖片存檔；LINE 官方帳號意見入口
import { DATA } from "./data.js?v=20261029-3";

// 政策島所在的資料夾（/island2/），從這支程式的位置推算：整個資料夾複製成新版本時不用改路徑
export const BASE = new URL("../", import.meta.url).href;

// 直接開政策島的網址（QR code 用，越短越好掃）
export const islandURL = (hash = "") => BASE + (hash ? "#" + hash : "");
// 傳到 LINE、臉書用的網址：每座島有自己的預覽圖（s/<頁>/，由 scripts/island-share-pages.mjs 產生）
export const shareURL = (page, hash = "") => `${BASE}s/${page}/${hash ? "#" + hash : ""}`;

// 手機、平板：分享選單裡就有「儲存影像」；電腦：直接下載
const coarse = () => matchMedia("(pointer: coarse)").matches;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* 改用舊方法 */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-200px;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// navigator.share 要在點擊當下呼叫（Safari 會擋掉 await 之後才叫的分享），所以這裡不先 await 任何東西
export function shareLink({ title, text, url }, toast) {
  const fallback = () => copyText(url).then((ok) => toast(ok ? "已複製連結，可以貼到 LINE 或臉書" : "無法自動複製，請從網址列複製"));
  if (navigator.share) {
    return navigator.share({ title, text, url }).catch((e) => {
      if (e && e.name === "AbortError") return; // 使用者自己取消
      return fallback();
    });
  }
  return fallback();
}

// 圖片要先準備好（prepareImage），按下按鈕時才能立刻叫出分享選單
export function prepareImage(canvas) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
}

export function saveImage(blob, filename, { title, text }, toast) {
  if (!blob) return toast("圖片還在準備，請再按一次");
  const file = new File([blob], filename, { type: "image/png" });
  if (coarse() && navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file], title, text }).catch((e) => {
      if (e && e.name === "AbortError") return;
      download(blob, filename, toast);
    });
  }
  download(blob, filename, toast);
}

function download(blob, filename, toast) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast("圖片已存好");
}

// 網友意見：開啟和競辦 LINE 官方帳號的對話，訊息先帶好正在看的政策。
// data.js 的 opinion.lineId 填上 @ 開頭的帳號 ID 才會出現入口
export function opinionURL(topic) {
  const id = String(DATA.opinion?.lineId || "").trim();
  if (!/^@[\w.-]{2,}$/.test(id)) return "";
  const msg = topic ? `我對「${topic}」的想法：` : "妃妃市長，我想說：";
  return `https://line.me/R/oaMessage/${id}/?${encodeURIComponent(msg)}`;
}
