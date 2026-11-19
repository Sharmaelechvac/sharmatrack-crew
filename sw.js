/*! Sharma design kit v1.2 service worker. Copy to the app as /sw.js and call SK.registerSW("/sw.js").
   What it does:
   - App shell ("/") : network first (so a locked or expired phone goes to the lock screen), saved copy if
     there is no signal or the network takes over 2.5 s. Only a real unlocked page is saved.
   - Kit files (css, js, logo): served from the phone at once, refreshed in the background.
   - Never touches: /login, /logout (it wipes saved data first), /api/* (the app's SK.data handles
     last-data-first in the page), POSTs, or anything else.
   Holds no data, passcodes or keys. */
var VERSION = "sk-shell-v1.2";
var DATA = "sk-data-v1";
var KIT = new URL((new URL(self.location.href).searchParams.get("kit") || "https://sharma-kit.sharma-crew.workers.dev").replace(/\/$/, ""), self.location.href).href.replace(/\/$/, "");
var KIT_FILES = [KIT + "/sharma-kit.css", KIT + "/sharma-kit.js", KIT + "/assets/logo-white-header.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    /* the app shell, only if this phone is unlocked right now (a lock screen or redirect is never saved) */
    var page = fetch("/", { credentials: "same-origin", redirect: "manual", cache: "no-store" }).then(function (r) {
      if (r.ok && r.type === "basic" && (r.headers.get("content-type") || "").indexOf("text/html") === 0) return c.put("/", r);
    }).catch(function () {});
    return Promise.all([page].concat(KIT_FILES.map(function (u) {
      return fetch(u, { mode: "cors", cache: "no-cache" }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {});
    })));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("sk-shell-") === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function wipe() { return Promise.all([caches.delete(DATA), caches.open(VERSION).then(function (c) { return c.delete("/"); })]); }

function shell(req) {
  var net = fetch(req).then(function (r) {
    if (r.type === "opaqueredirect" || r.redirected || r.status === 401 || r.status === 403) { wipe(); return r; }
    if (r.ok && (r.headers.get("content-type") || "").indexOf("text/html") === 0) {
      var copy = r.clone(); caches.open(VERSION).then(function (c) { return c.put("/", copy); });
    }
    return r;
  });
  var saved = caches.open(VERSION).then(function (c) { return c.match("/"); });
  return new Promise(function (resolve, reject) {
    var done = false;
    function give(r) { if (!done && r) { done = true; resolve(r); } }
    net.then(give, function () { saved.then(function (s) { if (s) give(s); else if (!done) { done = true; reject(new Error("offline")); } }); });
    setTimeout(function () { saved.then(give); }, 2500);
  });
}

function kitFile(e) {
  var req = e.request;
  return caches.open(VERSION).then(function (c) {
    return c.match(req.url).then(function (hit) {
      var fresh = fetch(req.url, { mode: "cors", cache: "no-cache" }).then(function (r) { if (r.ok) c.put(req.url, r.clone()); return r; });
      if (hit) { e.waitUntil(fresh.catch(function () {})); return hit; }
      return fresh.catch(function () { return fetch(req); });
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (req.url.indexOf(KIT + "/") === 0 && /\.(css|js|png|svg)$/.test(url.pathname)) { e.respondWith(kitFile(e)); return; }
  if (url.origin === self.location.origin) {
    if (url.pathname === "/logout") { e.respondWith(wipe().then(function () { return fetch(req); })); return; }
    if (url.pathname === "/" && req.mode === "navigate") { e.respondWith(shell(req)); return; }
    return; /* /login, /api/*, everything else: straight to the network, never saved here */
  }
});
