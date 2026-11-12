// 台南政策島離線快取：只有競選總部展示機（?kiosk=1）會註冊。
// 頁面先上網拿最新版、斷線時用快取；程式與圖片先用快取、背景更新。
// 改版時執行 node scripts/island-version.mjs <資料夾>，V 換掉後展示機會在下一次閒置時自動換成新版。
const V = "20261029-3";
// 快取名稱用版本資料夾開頭（island2-…），不同版本的政策島不會互相清掉快取
const SCOPE = new URL("./", self.location).pathname;
const PREFIX = SCOPE.replace(/\//g, "") + "-";
const VERSION = PREFIX + V;
const JS = ["main", "data", "decor", "env", "kit", "models", "people", "ui", "util", "world", "qr", "share", "stamps", "poster", "quiz", "play", "track", "avatar", "eggs", "game", "ask", "day", "visits", "audio"];
const CORE = [
  "./",
  `./island.css?v=${V}`,
  ...JS.map((n) => `./js/${n}.js?v=${V}`),
  "./vendor/three.module.min.js",
  "./vendor/addons/OrbitControls.js",
  "./vendor/addons/CSS2DRenderer.js",
  "./vendor/addons/RoundedBoxGeometry.js",
  "./vendor/uqr.js",
  "./img/logo.png",
  "./img/feifei-face.jpg",
  "./img/feifei-stand.jpg",
  "./img/feifei-bike.jpg",
  "./img/sister-main.jpg",
  ...["bike", "flag", "tablet", "lever", "point", "elder", "jump", "kids"].map((n) => `./img/pose/${n}.jpg`),
  "/posters/technology.jpg",
  "/posters/agriculture.jpg",
  "/posters/tourism.jpg",
  "/posters/welfare.jpg",
  "/posters/transport.jpg",
  "/posters/sister.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // YouTube 等外站資源不經手
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE) && !url.pathname.startsWith("/posters/")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      Promise.race([fetch(req), timeout(4000)])
        .then((res) => {
          if (res.ok && url.pathname === SCOPE) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put("./", copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./"))),
    );
    return;
  }

  const cachedP = caches.match(req);
  const networkP = fetch(req).then((res) => {
    if (!res.ok) return res;
    const copy = res.clone();
    return caches.open(VERSION).then((c) => c.put(req, copy)).then(() => res);
  });
  e.respondWith(cachedP.then((cached) => cached || networkP));
  // 背景更新要等它做完，service worker 才不會在下載途中被停掉
  e.waitUntil(networkP.catch(() => {}));
});
