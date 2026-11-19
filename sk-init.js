/* Sharma kit init for tracker pages: register this app's own service worker
   (a verbatim copy of the kit's sharma-sw.js, served from this repo).
   Registered with the APP's own scope (/<repo>/) — the kit's SK.registerSW
   hard-codes scope "/", which throws a SecurityError on GitHub Pages
   project sites and silently killed offline + last-data (Steve's review,
   2026-11-19). The manifest's start_url/scope are "." to match. */
(function () {
  "use strict";
  function go() {
    if (!("serviceWorker" in navigator)) return;
    try {
      var src = (document.querySelector('script[src*="sk-init.js"]') || {}).src || "";
      var base = src.replace(/sk-init\.js.*$/, "");
      if (base) navigator.serviceWorker.register(base + "sw.js", { scope: base }).catch(function () {});
    } catch (e) { /* shell stays a plain page if SW is unavailable */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
  else go();
})();
