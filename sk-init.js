/* Sharma kit init for tracker pages: register this app's own service worker
   (a verbatim copy of the kit's sharma-sw.js, served from this repo) and let
   the kit wire its offline banner / press states. Look + shell only. */
(function () {
  "use strict";
  function go() {
    if (!window.SK) return;
    try {
      var src = (document.querySelector('script[src*="sk-init.js"]') || {}).src || "";
      var base = src.replace(/sk-init\.js.*$/, "");
      if (base && SK.registerSW) SK.registerSW(base + "sw.js");
    } catch (e) { /* shell stays a plain page if SW is unavailable */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
  else go();
})();
