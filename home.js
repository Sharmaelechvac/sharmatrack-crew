/* Sharma Crew — home page: language, job search, live rough-in progress
   (seed photos + photo API) and a status chip per job card. */
(function () {
  "use strict";

  // Rough-in captions (EN) — must match ROUGH in app.js; home progress and
  // status chips count ROUGH-IN captions only.
  var ROUGH_EN = [
    "Meter / service", "Grounding electrodes & bonding",
    "Panel mounting & labeled home runs", "UF cable in kitchen",
    "All 240V locations and landings", "Switch box neatness throughout home",
    "Smoke detector locations", "Dining room fan box", "Kitchen outlets",
    "Nail plates & cable supports", "Bathroom vanity boxes", "Laundry & dryer",
    "Range & water heater", "HVAC power & disconnects",
    "Exterior & garage boxes", "Sealed penetrations"
  ];
  var JOBS = ["3131", "3262", "3274", "3286"];

  var UI = {
    en: {
      language: "Language", byLine: "by Sharma Electric & HVAC", builderEd: "Builder edition",
      crewJobs: "Jobs", employees: "Employees",
      coc: "📃 Code of Conduct →", searchPh: "Search address, city, builder…",
      st0: "Not started", st1: "In progress", st2: "Complete"
    },
    es: {
      language: "Idioma", byLine: "por Sharma Electric & HVAC", builderEd: "Edição do construtor", builderEd: "Edición del constructor",
      crewJobs: "Trabajos", employees: "Empleados",
      coc: "📃 Código de conducta →", searchPh: "Buscar dirección, ciudad, constructor…",
      st0: "Sin empezar", st1: "En progreso", st2: "Completo"
    },
    pt: {
      language: "Idioma", byLine: "por Sharma Electric & HVAC",
      crewJobs: "Trabalhos", employees: "Funcionários",
      coc: "📃 Código de conduta →", searchPh: "Buscar endereço, cidade, construtora…",
      st0: "Não iniciado", st1: "Em andamento", st2: "Concluído"
    }
  };

  var lang = localStorage.getItem("crew-lang") || "en";
  if (!UI[lang]) lang = "en";
  var counts = {}; // job id -> covered rough-in captions

  function t() { return UI[lang]; }

  function renderText() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (UI[lang][k] != null) el.textContent = UI[lang][k];
    });
    document.querySelectorAll(".langbar button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-lang") === lang);
    });
    var s = document.getElementById("job-search");
    if (s) s.placeholder = t().searchPh;
    renderCounts();
  }
  function renderCounts() {
    document.querySelectorAll("[data-jobcard]").forEach(function (card) {
      var id = card.getAttribute("data-jobcard");
      var n = counts[id];
      var prog = card.querySelector("[data-prog]");
      var chip = card.querySelector("[data-chip]");
      if (!prog || !chip) return;
      if (n == null) { prog.textContent = "—/" + ROUGH_EN.length; chip.hidden = true; return; }
      prog.textContent = n + "/" + ROUGH_EN.length;
      chip.hidden = false;
      chip.className = "chip " + (n === 0 ? "st0" : n >= ROUGH_EN.length ? "st2" : "st1");
      chip.textContent = n === 0 ? t().st0 : n >= ROUGH_EN.length ? t().st2 : t().st1;
    });
  }
  function coveredCount(jobId, seedRows, apiRows) {
    var have = {};
    seedRows.forEach(function (s) { if (s.job === jobId) have[s.caption] = 1; });
    (apiRows || []).forEach(function (p) { if (p && p.caption) have[p.caption] = 1; });
    return ROUGH_EN.filter(function (c) { return have[c]; }).length;
  }
  function loadCounts(seedRows) {
    JOBS.forEach(function (id) {
      fetch("/api/photos?job=" + encodeURIComponent(id))
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          counts[id] = coveredCount(id, seedRows, Array.isArray(rows) ? rows : []);
          renderCounts();
        })
        .catch(function () {
          // API unreachable — fall back to seed counts only.
          counts[id] = coveredCount(id, seedRows, []);
          renderCounts();
        });
    });
  }
  function loadSeedsThenCounts() {
    fetch("/seed-photos.json")
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { loadCounts(Array.isArray(rows) ? rows : []); })
      .catch(function () { loadCounts([]); });
  }

  /* ---------- Wire up ---------- */
  document.querySelectorAll(".langbar button").forEach(function (b) {
    b.addEventListener("click", function () {
      lang = b.getAttribute("data-lang");
      localStorage.setItem("crew-lang", lang);
      renderText();
    });
  });
  var search = document.getElementById("job-search");
  if (search) {
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-jobcard]").forEach(function (card) {
        var hay = (card.getAttribute("data-search") || "") + " " + card.textContent.toLowerCase();
        card.style.display = !q || hay.indexOf(q) !== -1 ? "" : "none";
      });
    });
  }
  renderText();
  loadSeedsThenCounts();
})();
