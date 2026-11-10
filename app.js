/* Sharma Crew — job page logic: i18n render, rough-in (16) + trim (12) phase
   checklists, job details (permit/lot/inspection/crew/date), Netlify
   Functions + Blobs photos, watermark + geotag uploads. */
(function () {
  "use strict";

  /* Rough-in captions — merged list of 16 (Sanjay-approved merge of the old
     20: Grounding, Interior panel, Kick plates and Foam in holes folded into
     their surviving partners below). Seed photos key off these EN strings. */
  var ROUGH = [
    { en: "Meter / service", es: "Medidor / acometida", pt: "Medidor / entrada de serviço" },
    { en: "Grounding electrodes & bonding", es: "Electrodos de puesta a tierra y bonding", pt: "Eletrodos de aterramento e bonding" },
    { en: "Panel mounting & labeled home runs", es: "Montaje del panel y home runs etiquetados", pt: "Montagem do painel e home runs identificados" },
    { en: "UF cable in kitchen", es: "Cable UF en la cocina", pt: "Cabo UF na cozinha" },
    { en: "All 240V locations and landings", es: "Todas las ubicaciones de 240V y sus llegadas", pt: "Todos os pontos de 240V e suas chegadas" },
    { en: "Switch box neatness throughout home", es: "Orden / limpieza de las cajas de interruptores en toda la casa", pt: "Capricho / organização das caixas de interruptor em toda a casa",
      def: {
        en: "Boxes plumb, level and at a consistent height; wires neat and made up; no cracked or loose boxes.",
        es: "Cajas a plomo, niveladas y a una altura constante; cables ordenados y conectados; sin cajas rotas ni sueltas.",
        pt: "Caixas no prumo, niveladas e a uma altura consistente; fios organizados e ligados; sem caixas rachadas ou soltas."
      } },
    { en: "Smoke detector locations", es: "Ubicaciones de detectores de humo", pt: "Locais dos detectores de fumaça" },
    { en: "Dining room fan box", es: "Caja de ventilador del comedor", pt: "Caixa do ventilador da sala de jantar" },
    { en: "Kitchen outlets", es: "Tomas de la cocina", pt: "Tomadas da cozinha" },
    { en: "Nail plates & cable supports", es: "Placas protectoras (nail plates) y soportes de cable", pt: "Chapas de proteção (nail plates) e suportes de cabo" },
    { en: "Bathroom vanity boxes", es: "Cajas del tocador del baño", pt: "Caixas da bancada do banheiro" },
    { en: "Laundry & dryer", es: "Lavandería y secadora", pt: "Lavanderia e secadora" },
    { en: "Range & water heater", es: "Estufa y calentador de agua", pt: "Fogão e aquecedor de água" },
    { en: "HVAC power & disconnects", es: "Energía HVAC y disconnects", pt: "Energia HVAC e disconnects" },
    { en: "Exterior & garage boxes", es: "Cajas exteriores y del garage", pt: "Caixas externas e da garagem" },
    { en: "Sealed penetrations", es: "Penetraciones selladas", pt: "Penetrações vedadas" }
  ];

  /* Trim captions — their own 12-caption checklist; EN strings are distinct
     from the rough-in ones, so the same photo API stores them as-is. */
  var TRIM = [
    { en: "Meter & service — final", es: "Medidor y acometida — final", pt: "Medidor e entrada de serviço — final" },
    { en: "Panel breakers in & directory labeled", es: "Breakers del panel instalados y directorio rotulado", pt: "Disjuntores do quadro instalados e diretório identificado" },
    { en: "Switches & dimmers trimmed out", es: "Interruptores y dimmers terminados", pt: "Interruptores e dimmers acabados" },
    { en: "Receptacles trimmed out", es: "Receptáculos terminados", pt: "Tomadas acabadas" },
    { en: "Light fixtures installed", es: "Luminarias instaladas", pt: "Luminárias instaladas" },
    { en: "Ceiling fans installed", es: "Ventiladores de techo instalados", pt: "Ventiladores de teto instalados" },
    { en: "Exterior fixtures & floods", es: "Luminarias exteriores y reflectores", pt: "Luminárias externas e refletores" },
    { en: "Smoke & CO detectors installed", es: "Detectores de humo y CO instalados", pt: "Detectores de fumaça e CO instalados" },
    { en: "GFCI / AFCI devices — tested", es: "Dispositivos GFCI / AFCI — probados", pt: "Dispositivos GFCI / AFCI — testados" },
    { en: "HVAC final connections", es: "Conexiones finales de HVAC", pt: "Conexões finais do HVAC" },
    { en: "Range, dryer & water heater — final connections", es: "Estufa, secadora y calentador de agua — conexiones finales", pt: "Fogão, secadora e aquecedor de água — conexões finais" },
    { en: "Final walkthrough — plates on, covers clean", es: "Recorrido final — placas puestas, tapas limpias", pt: "Vistoria final — espelhos colocados, tampas limpas" }
  ];
  var SWITCH_DEF_IDX = 5; // "Switch box neatness throughout home" in ROUGH

  var UI = {
    en: {
      language: "Language", builder: "Builder", plan: "Plan", phase: "Phase",
      photoProgress: "Photo progress", captions16: "of 16 captions", captions12: "of 12 captions",
      openInMaps: "Open in Maps", howToUse: "How to use",
      steps: [
        "Type your name below first. Photos upload with your name on them.",
        "Find your caption. Take one clear photo per caption.",
        "Camera takes a photo. Gallery picks one from your phone.",
        "Videos: 15 seconds max. Never post prices here."
      ],
      prints: "PRINTS", printSet: "Electrical Set v13v", printMaster: "Master Plans", printInstr: "Printable instructions",
      roughIn: "Electrical Rough-in", trimIn: "Electrical Trim", done16: "of 16 done", done12: "of 12 done",
      tabRough: "Electrical Rough-in", tabTrim: "Electrical Trim",
      needsPhoto: "Needs photo", camera: "Camera", gallery: "Gallery",
      otherPhotos: "OTHER PHOTOS — ELECTRICAL", otherSub: "Anything that doesn't fit a caption above.", videoRule: "Videos: 15 seconds max",
      yourName: "Your name", otherCamera: "Other camera", otherGallery: "Other gallery",
      nameFirst: "Type your name in the bar below first.",
      uploading: "Uploading…", uploaded: "Uploaded.", uploadFail: "Upload failed — try again.",
      gpsOff: "GPS unavailable", photoBy: "by",
      panelSchedule: "Panel schedule", meterSchedule: "Meter schedule",
      jobDetails: "Electrical job details", photosWord: "photos", tugCapPh: "Write a caption for the photo(s)", permitNo: "Permit #", lotNo: "Lot #", inspection: "Inspection",
      inspNone: "Not requested", inspRequested: "Requested", inspPassed: "Passed", inspFailed: "Failed",
      failReason: "Reason", crewLbl: "Assigned to", workDate: "Work date",
      edit: "Edit", save: "Save", cancel: "Cancel",
      saved: "Saved.", saving: "Saving…", saveFail: "Save failed — try again."
    },
    es: {
      language: "Idioma", builder: "Constructor", plan: "Plano", phase: "Etapa",
      photoProgress: "Progreso de fotos", captions16: "de 16 títulos", captions12: "de 12 títulos",
      openInMaps: "Abrir en Maps", howToUse: "Cómo usar",
      steps: [
        "Escribe tu nombre abajo primero. Las fotos se suben con tu nombre.",
        "Encuentra tu título. Toma una foto clara por título.",
        "Cámara toma una foto. Galería elige una de tu teléfono.",
        "Videos: máximo 15 segundos. Nunca pongas precios aquí."
      ],
      prints: "PLANOS", printSet: "Juego eléctrico v13v", printMaster: "Planos maestros", printInstr: "Instrucciones imprimibles",
      roughIn: "Instalación eléctrica preliminar", trimIn: "Acabado eléctrico", done16: "de 16 listos", done12: "de 12 listos",
      tabRough: "Preliminar eléctrico", tabTrim: "Acabado eléctrico",
      needsPhoto: "Falta foto", camera: "Cámara", gallery: "Galería",
      otherPhotos: "OTRAS FOTOS — ELECTRICIDAD", otherSub: "Lo que no encaje en un título de arriba.", videoRule: "Videos: máximo 15 segundos",
      yourName: "Tu nombre", otherCamera: "Otra cámara", otherGallery: "Otra galería",
      nameFirst: "Escribe tu nombre en la barra de abajo primero.",
      uploading: "Subiendo…", uploaded: "Subido.", uploadFail: "La subida falló — inténtalo de nuevo.",
      gpsOff: "GPS no disponible", photoBy: "por",
      panelSchedule: "Esquema del panel", meterSchedule: "Esquema del medidor",
      jobDetails: "Datos del trabajo eléctrico", photosWord: "fotos", tugCapPh: "Escribe un t\u00edtulo para la(s) foto(s)", permitNo: "Permiso #", lotNo: "Lote #", inspection: "Inspección",
      inspNone: "No solicitada", inspRequested: "Solicitada", inspPassed: "Aprobada", inspFailed: "Reprobada",
      failReason: "Motivo", crewLbl: "Asignado a", workDate: "Fecha del trabajo",
      edit: "Editar", save: "Guardar", cancel: "Cancelar",
      saved: "Guardado.", saving: "Guardando…", saveFail: "No se pudo guardar — inténtalo de nuevo."
    },
    pt: {
      language: "Idioma", builder: "Construtora", plan: "Planta", phase: "Fase",
      photoProgress: "Progresso das fotos", captions16: "de 16 legendas", captions12: "de 12 legendas",
      openInMaps: "Abrir no Maps", howToUse: "Como usar",
      steps: [
        "Digite seu nome abaixo primeiro. As fotos são enviadas com seu nome.",
        "Encontre sua legenda. Tire uma foto clara por legenda.",
        "Câmera tira uma foto. Galeria escolhe uma do seu telefone.",
        "Vídeos: no máximo 15 segundos. Nunca poste preços aqui."
      ],
      prints: "PLANTAS", printSet: "Jogo elétrico v13v", printMaster: "Plantas mestras", printInstr: "Instruções imprimíveis",
      roughIn: "Instalação elétrica bruta", trimIn: "Acabamento elétrico", done16: "de 16 prontos", done12: "de 12 prontos",
      tabRough: "Bruto elétrico", tabTrim: "Acabamento elétrico",
      needsPhoto: "Falta foto", camera: "Câmera", gallery: "Galeria",
      otherPhotos: "OUTRAS FOTOS — ELÉTRICA", otherSub: "Qualquer coisa que não caiba numa legenda acima.", videoRule: "Vídeos: no máximo 15 segundos",
      yourName: "Seu nome", otherCamera: "Outra câmera", otherGallery: "Outra galeria",
      nameFirst: "Digite seu nome na barra abaixo primeiro.",
      uploading: "Enviando…", uploaded: "Enviado.", uploadFail: "O envio falhou — tente de novo.",
      gpsOff: "GPS indisponível", photoBy: "por",
      panelSchedule: "Esquema do quadro", meterSchedule: "Esquema do medidor",
      jobDetails: "Dados do trabalho elétrico", photosWord: "fotos", tugCapPh: "Escreva uma legenda para a(s) foto(s)", permitNo: "Alvará #", lotNo: "Lote #", inspection: "Inspeção",
      inspNone: "Não solicitada", inspRequested: "Solicitada", inspPassed: "Aprovada", inspFailed: "Reprovada",
      failReason: "Motivo", crewLbl: "Responsável", workDate: "Data do trabalho",
      edit: "Editar", save: "Salvar", cancel: "Cancelar",
      saved: "Salvo.", saving: "Salvando…", saveFail: "Falha ao salvar — tente de novo."
    }
  };

  var jobEl = document.querySelector("[data-job]");
  if (!jobEl) return; // only job pages run this script's render logic
  var JOB = window.JOB_PAGE || {};
  var lang = localStorage.getItem("crew-lang") || "en";
  if (!UI[lang]) lang = "en";
  var phase = localStorage.getItem("crew-phase-" + JOB.id) || "rough";
  if (phase !== "trim") phase = "rough";
  var photos = []; // metadata records from GET /api/photos?job=<id>
  var seeds = [];  // migrated photos shipped with the site (seed-photos.json); display-only, never uploaded or deleted
  var jobMeta = {}; // record from GET /api/jobmeta?job=<id>

  function t() { return UI[lang]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function listFor(p) { return p === "trim" ? TRIM : ROUGH; }
  function prefixFor(p) { return p === "trim" ? "tcap-" : "cap-"; }

  /* ---------- Photo backend: Netlify Function + Blobs, same origin ---------- */
  var API = "/api/photos";
  var META_API = "/api/jobmeta";
  function fetchPhotos() {
    return fetch(API + "?job=" + encodeURIComponent(JOB.id))
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { photos = Array.isArray(rows) ? rows : []; renderPhotos(); })
      .catch(function () { photos = []; renderPhotos(); });
  }
  function fileUrl(p) {
    return p.url || (API + "/file?key=" + encodeURIComponent(p.key || ""));
  }

  /* ---------- Migrated seed photos (static, shipped with the deploy) ---------- */
  function stemOf(s) {
    var base = String(s || "").split("/").pop().split("?")[0];
    var dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(0, dot) : base;
  }
  function allPhotos() {
    // API photos first; seeds fill in unless the API already has the same filename.
    var apiStems = {};
    photos.forEach(function (p) {
      [p.name, p.key].forEach(function (v) { var st = stemOf(v); if (st) apiStems[st] = 1; });
    });
    var out = photos.slice();
    seeds.forEach(function (s) { if (!apiStems[stemOf(s.name || s.url)]) out.push(s); });
    out.sort(function (a, b) { return new Date(a.taken_at || 0) - new Date(b.taken_at || 0); });
    return out;
  }
  /* Directory this script was loaded from = the app root. Seed files live
     there; resolving them against it keeps them working when the site is
     served from a subpath (e.g. GitHub Pages project sites). */
  var SCRIPT_BASE = "";
  try {
    var _cs = document.currentScript;
    if (_cs && _cs.src) SCRIPT_BASE = _cs.src.replace(/[^\/]*$/, "");
  } catch (e) {}
  function seedUrl(u) {
    u = String(u || "");
    return u.charAt(0) === "/" ? SCRIPT_BASE + u.slice(1) : u;
  }
  function fetchSeeds() {
    return fetch(SCRIPT_BASE + "seed-photos.json")
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        seeds = (Array.isArray(rows) ? rows : []).filter(function (s) { return s.job === JOB.id; })
          .map(function (s) {
            return {
              seed: true, caption: s.caption, url: seedUrl(s.url), name: s.name || "",
              uploader: "", taken_at: s.taken_at || null, lat: null, lng: null,
              content_type: s.media_type || ""
            };
          });
        renderPhotos();
      })
      .catch(function () { seeds = []; });
  }
  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1] || ""); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  /* ---------- Geolocation ---------- */
  function getPosition() {
    return new Promise(function (res) {
      if (!navigator.geolocation) return res(null);
      var done = false;
      var to = setTimeout(function () { if (!done) { done = true; res(null); } }, 6000);
      navigator.geolocation.getCurrentPosition(function (p) {
        if (!done) { done = true; clearTimeout(to); res({ lat: p.coords.latitude, lng: p.coords.longitude }); }
      }, function () { if (!done) { done = true; clearTimeout(to); res(null); } },
        { enableHighAccuracy: true, timeout: 5500, maximumAge: 60000 });
    });
  }

  /* ---------- Watermark ----------
     Bottom band composited onto the photo before upload: the real Sharma
     logo on a white chip + company/licenses, date/time, job address, and
     the GPS geotag. (The geotag is also saved in the API metadata record.)
     Videos are never watermarked; seed/migrated photos ship as-is. */
  var logoImgPromise = null;
  function loadLogo() {
    if (!logoImgPromise) {
      logoImgPromise = new Promise(function (res) {
        var im = new Image();
        im.onload = function () { res(im); };
        im.onerror = function () { res(null); };
        im.src = "/logo.png";
      });
    }
    return logoImgPromise;
  }
  function watermark(file, meta) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        loadLogo().then(function (logo) {
          try {
            var maxW = 1600;
            var scale = Math.min(1, maxW / img.naturalWidth);
            var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
            var lines = [
              "Sharma Electric & HVAC · Lic. EC13013924 · CAC1823596",
              meta.when + " · " + meta.address,
              (meta.pos ? meta.pos.lat.toFixed(6) + ", " + meta.pos.lng.toFixed(6) : t().gpsOff) + " · " + meta.uploader
            ];
            var fs = Math.max(20, Math.round(w * 0.026));
            var pad = Math.round(fs * 0.7);
            var strip = Math.round(fs * 1.28 * lines.length + pad * 1.7);
            var c = document.createElement("canvas");
            c.width = w; c.height = h;
            var x = c.getContext("2d");
            x.drawImage(img, 0, 0, w, h);
            // semi-opaque navy band across the bottom of the photo
            x.fillStyle = "rgba(8,22,44,0.88)";
            x.fillRect(0, h - strip, w, strip);
            var tx = pad;
            if (logo && logo.naturalWidth) {
              // real logo, small and crisp on a white chip at the left of the band
              var chipH = strip - Math.round(pad * 1.1);
              var chipW = Math.min(Math.round(chipH * logo.naturalWidth / logo.naturalHeight), Math.round(w * 0.36));
              var chipX = pad, chipY = h - strip + Math.round((strip - chipH) / 2);
              x.fillStyle = "#ffffff";
              if (x.roundRect) { x.beginPath(); x.roundRect(chipX, chipY, chipW, chipH, Math.round(fs * 0.35)); x.fill(); }
              else x.fillRect(chipX, chipY, chipW, chipH);
              var inset = Math.round(fs * 0.22);
              var lw = chipW - inset * 2, lh = Math.round(lw * logo.naturalHeight / logo.naturalWidth);
              if (lh > chipH - inset * 2) { lh = chipH - inset * 2; lw = Math.round(lh * logo.naturalWidth / logo.naturalHeight); }
              x.drawImage(logo, chipX + Math.round((chipW - lw) / 2), chipY + Math.round((chipH - lh) / 2), lw, lh);
              tx = chipX + chipW + pad;
            }
            x.fillStyle = "#ffffff"; x.font = "700 " + fs + "px Arial, sans-serif"; x.textBaseline = "top";
            // shrink the font if the longest line would not fit beside the chip
            var avail = w - tx - pad, maxLine = 0;
            lines.forEach(function (ln) { maxLine = Math.max(maxLine, x.measureText(ln).width); });
            if (maxLine > avail && maxLine > 0) {
              fs = Math.max(16, Math.floor(fs * avail / maxLine));
              x.font = "700 " + fs + "px Arial, sans-serif";
            }
            var lineH = fs * 1.28;
            var ty = h - strip + Math.round((strip - lineH * lines.length) / 2);
            lines.forEach(function (ln, i) { x.fillText(ln, tx, ty + i * lineH, w - tx - pad); });
            URL.revokeObjectURL(url);
            c.toBlob(function (b) { b ? res(b) : rej(new Error("canvas")); }, "image/jpeg", 0.85);
          } catch (e) { rej(e); }
        });
      };
      img.onerror = rej;
      img.src = url;
    });
  }

  /* ---------- Upload ---------- */
  function getName() {
    var inp = document.getElementById("uploader-name");
    if (!inp) return "";
    var name = (inp.value || "").trim();
    if (name) localStorage.setItem("crew-name", name);
    return name;
  }
  function requireName() { return getName(); }
  function setNote(txt) {
    var n = document.getElementById("upload-note");
    if (n) n.textContent = txt;
  }
  function handleFiles(fileList, phaseName, captionIdx, freeCaption) {
    var name = getName();
    if (!fileList || !fileList.length) return;
    var files = Array.prototype.slice.call(fileList);
    var caption = freeCaption != null ? "ROUGH \u00b7 " + (String(freeCaption).trim() || "Photo") : captionIdx == null ? "Other photos" : listFor(phaseName)[captionIdx].en;
    setNote(t().uploading);
    getPosition().then(function (pos) {
      var chain = Promise.resolve();
      files.forEach(function (file) {
        chain = chain.then(function () {
          var when = new Date();
          var isVideo = file.type.indexOf("video") === 0;
          var prep = isVideo ? Promise.resolve(file) : watermark(file, {
            when: when.toLocaleString(), address: JOB.address, pos: pos, uploader: name
          }).catch(function () { return file; });
          return prep.then(function (blob) {
            return blobToBase64(blob).then(function (b64) {
              return fetch(API, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  job: JOB.id, caption: caption, uploader: name,
                  taken_at: when.toISOString(),
                  lat: pos ? pos.lat : null, lng: pos ? pos.lng : null,
                  content_type: isVideo ? file.type : "image/jpeg",
                  name: file.name || "",
                  data: b64
                })
              }).then(function (r) { if (!r.ok) throw new Error("upload " + r.status); });
            });
          });
        });
      });
      return chain;
    }).then(function () { setNote(t().uploaded); return fetchPhotos(); })
      .catch(function () { setNote(t().uploadFail); });
  }

  /* ---------- Job details (permit / lot / inspection / crew / date) ---------- */
  function fetchJobMeta() {
    return fetch(META_API + "?job=" + encodeURIComponent(JOB.id))
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (m) { jobMeta = m && typeof m === "object" ? m : {}; renderJobMeta(); })
      .catch(function () { jobMeta = {}; renderJobMeta(); });
  }
  function metaText(v) { return v == null || v === "" ? "—" : String(v); }
  function inspLabel() {
    var s = jobMeta.inspection_status || "";
    if (s === "requested") return t().inspRequested;
    if (s === "passed") return t().inspPassed;
    if (s === "failed") return t().inspFailed;
    return t().inspNone;
  }
  function renderJobMeta() {
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    set("jm-permit", metaText(jobMeta.permit));
    set("jm-lot", metaText(jobMeta.lot));
    set("jm-crew", metaText(jobMeta.crew));
    set("jm-date", metaText(jobMeta.date));
    set("jm-insp", inspLabel());
    var row = document.getElementById("jm-reason-row");
    if (row) row.hidden = (jobMeta.inspection_status || "") !== "failed";
    set("jm-reason", metaText(jobMeta.inspection_reason));
  }
  function fillMetaForm() {
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.value = v || ""; };
    set("jm-f-permit", jobMeta.permit);
    set("jm-f-lot", jobMeta.lot);
    set("jm-f-status", jobMeta.inspection_status);
    set("jm-f-reason", jobMeta.inspection_reason);
    set("jm-f-crew", jobMeta.crew);
    set("jm-f-date", jobMeta.date);
    syncReasonRow();
    var note = document.getElementById("jm-note");
    if (note) note.textContent = "";
  }
  function syncReasonRow() {
    var sel = document.getElementById("jm-f-status");
    var row = document.getElementById("jm-f-reason-row");
    if (sel && row) row.hidden = sel.value !== "failed";
  }
  function saveJobMeta(ev) {
    ev.preventDefault();
    var editor = requireName();
    if (!editor) return;
    var get = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
    var note = document.getElementById("jm-note");
    if (note) note.textContent = t().saving;
    fetch(META_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        job: JOB.id,
        permit: get("jm-f-permit"),
        inspection_status: get("jm-f-status"),
        inspection_reason: get("jm-f-reason"),
        lot: get("jm-f-lot"),
        crew: get("jm-f-crew"),
        date: get("jm-f-date"),
        editor: editor
      })
    }).then(function (r) {
      if (!r.ok) throw new Error("jobmeta " + r.status);
      return r.json();
    }).then(function (rec) {
      jobMeta = rec && typeof rec === "object" ? rec : jobMeta;
      renderJobMeta();
      var form = document.getElementById("jm-form");
      if (form) form.hidden = true;
      var btn = document.getElementById("jm-edit");
      if (btn) btn.hidden = false;
      if (note) note.textContent = "";
      setNote(t().saved);
    }).catch(function () { if (note) note.textContent = t().saveFail; });
  }

  /* ---------- Render ---------- */
  function tilesFor(phaseName, captionIdx) {
    var want = captionIdx == null ? "Other photos" : listFor(phaseName)[captionIdx].en;
    var rows = allPhotos().filter(function (p) { return p.caption === want; });
    if (!rows.length) return "";
    var html = '<div class="tiles">';
    rows.forEach(function (p) {
      var u = esc(fileUrl(p));
      var isVideo = /\.(mp4|mov|webm|m4v)$/i.test(p.key || p.url || "") || (p.content_type || "").indexOf("video") === 0;
      var parts = [];
      if (p.uploader) parts.push(esc(p.uploader));
      if (p.taken_at) parts.push(esc(new Date(p.taken_at).toLocaleString()));
      if (p.lat != null) parts.push(Number(p.lat).toFixed(5) + ", " + Number(p.lng).toFixed(5));
      var cap = parts.join(" · ");
      html += "<figure>" + (isVideo
        ? '<video src="' + u + '" controls preload="metadata"></video>'
        : '<span class="phwrap"><img class="zoomable" src="' + u + '" alt="" loading="lazy">' + (p.seed ? "" : wmHtml(p)) + '</span>') +
        "<figcaption>" + cap + "</figcaption></figure>";
    });
    return html + "</div>";
  }
  function builderName() {
    var chip = document.querySelector(".builder-chip span");
    if (!chip) return "";
    var txt = chip.textContent || "";
    var i = txt.indexOf(":");
    return (i >= 0 ? txt.slice(i + 1) : txt).trim();
  }
  function photoDateLine(p) {
    if (!p.taken_at) return "";
    var d = new Date(p.taken_at);
    if (isNaN(d)) return "";
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return days[d.getDay()] + " " + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + d.getFullYear();
  }
  /* Watermark overlay for live (backend) photos — migrated seed files carry it burned in. */
  function wmHtml(p) {
    var lines = [JOB.address];
    var b = builderName(); if (b) lines.push("Builder: " + b);
    var dl = photoDateLine(p); if (dl) lines.push(dl);
    return '<span class="wm"><img class="wm-logo" src="../logo-wm.png" alt="">' +
      '<span class="wm-info">' + lines.map(esc).join("<br>") + '</span></span>';
  }
  function isFreePhoto(p) {
    if (!p || !p.caption) return false;
    if (p.caption.indexOf("ROUGH \u00b7 ") === 0) return true;
    return ROUGH.some(function (c) { return p.caption === c.en; });
  }
  function freeTilesHtml(rows) {
    if (!rows.length) return "";
    var html = '<div class="tiles">';
    rows.forEach(function (p) {
      var u = esc(fileUrl(p));
      var isVideo = /\.(mp4|mov|webm|m4v)$/i.test(p.key || p.url || "") || (p.content_type || "").indexOf("video") === 0;
      var capText = p.caption.indexOf("ROUGH \u00b7 ") === 0 ? p.caption.slice(8) : p.caption;
      var parts = [];
      if (p.uploader) parts.push(esc(p.uploader));
      if (p.taken_at) parts.push(esc(new Date(p.taken_at).toLocaleString()));
      html += "<figure>" + (isVideo
        ? '<video src="' + u + '" controls preload="metadata"></video>'
        : '<span class="phwrap"><img class="zoomable" src="' + u + '" alt="" loading="lazy">' + (p.seed ? "" : wmHtml(p)) + '</span>') +
        "<figcaption><b>" + esc(capText) + "</b>" + (parts.length ? "<span>" + parts.join(" \u00b7 ") + "</span>" : "") + "</figcaption></figure>";
    });
    return html + "</div>";
  }
  function renderList(phaseName, merged) {
    var list = listFor(phaseName), prefix = prefixFor(phaseName), done = 0;
    list.forEach(function (c, i) {
      var card = document.getElementById(prefix + i);
      if (!card) return;
      var rows = merged.filter(function (p) { return p.caption === c.en; });
      var st = card.querySelector(".status");
      if (rows.length) { done++; st.textContent = String(rows.length); st.classList.add("has"); }
      else { st.textContent = t().needsPhoto; st.classList.remove("has"); }
      var old = card.querySelector(".tiles"); if (old) old.remove();
      if (rows.length) card.insertAdjacentHTML("beforeend", tilesFor(phaseName, i));
    });
    return done;
  }
  function renderPhotos() {
    var merged = allPhotos();
    var roughRows = merged.filter(isFreePhoto);
    var roughTilesEl = document.getElementById("rough-tiles");
    if (roughTilesEl) roughTilesEl.innerHTML = freeTilesHtml(roughRows);
    var roughDone = roughRows.length;
    var trimDone = renderList("trim", merged);
    // Other photos — one shared section under both tabs
    var other = document.getElementById("other-tiles");
    if (other) other.innerHTML = tilesFor(null, null);
    // Section headings carry each phase's own count
    var rd = document.getElementById("rough-done"); if (rd) rd.textContent = roughDone + " " + t().photosWord;
    var td = document.getElementById("trim-done"); if (td) td.textContent = trimDone + " " + t().done12;
    // Ring + job bar reflect the ACTIVE phase
    var done = phase === "trim" ? trimDone : roughDone;
    var total = listFor(phase).length;
    if (phase === "rough") total = roughDone || 1;
    var pct = total ? done / total : 0;
    var ring = document.getElementById("ring-fg");
    if (ring) {
      var C = 2 * Math.PI * 40;
      ring.style.strokeDasharray = C;
      ring.style.strokeDashoffset = C * (1 - pct);
    }
    var label = done + "/" + total;
    if (phase === "rough") label = String(roughDone);
    var num = document.getElementById("ring-num"); if (num) num.textContent = label;
    var jbn = document.getElementById("jobbar-num"); if (jbn) jbn.textContent = label;
    var sub = document.getElementById("ring-sub");
    if (sub) sub.textContent = phase === "rough" ? done + " " + t().photosWord : done + " " + (phase === "trim" ? t().captions12 : t().captions16);
  }
  function applyPhase() {
    var r = document.getElementById("phase-rough");
    var tr = document.getElementById("phase-trim");
    if (r) r.hidden = phase !== "rough";
    if (tr) tr.hidden = phase !== "trim";
    document.querySelectorAll(".phasetabs button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-phase") === phase);
    });
    renderPhotos();
  }
  function renderText() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (UI[lang][k] != null && typeof UI[lang][k] === "string") el.textContent = UI[lang][k];
    });
    document.querySelectorAll("[data-step]").forEach(function (el) {
      el.textContent = t().steps[Number(el.getAttribute("data-step"))];
    });
    document.querySelectorAll(".langbar button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-lang") === lang);
    });
    document.querySelectorAll("#phase-rough .capcard .cap").forEach(function (el, i) {
      if (ROUGH[i]) el.textContent = ROUGH[i][lang];
    });
    document.querySelectorAll("#phase-trim .capcard .cap").forEach(function (el, i) {
      if (TRIM[i]) el.textContent = TRIM[i][lang];
    });
    var def = document.getElementById("switch-def");
    if (def && ROUGH[SWITCH_DEF_IDX].def) def.textContent = ROUGH[SWITCH_DEF_IDX].def[lang];
    var nameInp = document.getElementById("uploader-name");
    if (nameInp) nameInp.placeholder = t().yourName;
    document.title = "SHARMATRACK — " + JOB.address;
    renderJobMeta();
    renderPhotos();
  }

  /* ---------- Wire up ---------- */
  document.querySelectorAll(".langbar button").forEach(function (b) {
    b.addEventListener("click", function () {
      lang = b.getAttribute("data-lang");
      localStorage.setItem("crew-lang", lang);
      renderText();
    });
  });
  document.querySelectorAll(".phasetabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      phase = b.getAttribute("data-phase") === "trim" ? "trim" : "rough";
      localStorage.setItem("crew-phase-" + JOB.id, phase);
      applyPhase();
    });
  });
  document.querySelectorAll("input[type=file][data-caption]").forEach(function (inp) {
    inp.addEventListener("change", function () {
      var idx = inp.getAttribute("data-caption");
      if (idx === "roughfree") {
        var fc = document.getElementById("rough-caption");
        handleFiles(inp.files, "rough", null, fc ? fc.value : "");
        if (fc) fc.value = "";
      }
      else if (idx === "other") handleFiles(inp.files, null, null);
      else handleFiles(inp.files, inp.getAttribute("data-phase") || "rough", Number(idx));
      inp.value = "";
    });
  });
  var nameInp = document.getElementById("uploader-name");
  if (nameInp) {
    nameInp.value = localStorage.getItem("crew-name") || "";
    nameInp.addEventListener("change", function () { localStorage.setItem("crew-name", nameInp.value.trim()); });
  }
  var jmEdit = document.getElementById("jm-edit");
  var jmForm = document.getElementById("jm-form");
  if (jmEdit && jmForm) {
    jmEdit.addEventListener("click", function () {
      fillMetaForm();
      jmForm.hidden = false;
      jmEdit.hidden = true;
    });
    var jmCancel = document.getElementById("jm-cancel");
    if (jmCancel) jmCancel.addEventListener("click", function () {
      jmForm.hidden = true;
      jmEdit.hidden = false;
    });
    var jmStatus = document.getElementById("jm-f-status");
    if (jmStatus) jmStatus.addEventListener("change", syncReasonRow);
    jmForm.addEventListener("submit", saveJobMeta);
  }
  /* ---------- Lightbox: photos expand on this page ---------- */
  var lbEl = null, lbStage = null, lbCap = null;
  function ensureLightbox() {
    if (lbEl) return;
    lbEl = document.createElement("div");
    lbEl.className = "lightbox"; lbEl.hidden = true;
    lbEl.innerHTML = '<button type="button" class="lb-close" aria-label="Close">\u00d7</button><span class="phwrap lbwrap"><img alt=""></span><div class="lb-cap"></div>';
    document.body.appendChild(lbEl);
    lbStage = lbEl.querySelector(".lbwrap"); lbCap = lbEl.querySelector(".lb-cap");
    lbEl.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".lbwrap")) closeLightbox(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });
  }
  function openLightbox(img) {
    ensureLightbox();
    lbStage.querySelectorAll(".wm").forEach(function (n) { n.remove(); });
    lbStage.querySelector("img").src = img.getAttribute("src");
    var wrap = img.closest(".phwrap");
    var wm = wrap ? wrap.querySelector(".wm") : null;
    if (wm) lbStage.appendChild(wm.cloneNode(true));
    var fig = img.closest("figure");
    var capEl = fig ? fig.querySelector("figcaption") : null;
    lbCap.textContent = capEl ? capEl.textContent.trim() : "";
    lbEl.hidden = false; document.body.classList.add("lb-open");
  }
  function closeLightbox() {
    if (!lbEl) return;
    lbEl.hidden = true; document.body.classList.remove("lb-open");
  }
  document.addEventListener("click", function (e) {
    var img = e.target && e.target.closest ? e.target.closest("img.zoomable") : null;
    if (img) openLightbox(img);
  });
  applyPhase();
  renderText();
  fetchPhotos();
  fetchSeeds();
  fetchJobMeta();
})();
