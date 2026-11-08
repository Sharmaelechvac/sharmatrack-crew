// Sharma Crew — Cloudflare Pages ADVANCED-mode worker.
// Single entry point for the whole site: the three API routes are handled
// here (logic ported faithfully from the former Pages Functions under
// functions/api/, which did not intercept on this drag-upload project);
// every other path is delegated to env.ASSETS so static serving —
// including its SPA fallback for unknown paths — is unchanged.
//
// HTTP contract is identical to the Netlify Function + Blobs original
// (app.js is unchanged). Storage is a single Cloudflare KV namespace:
//
//   binding env.PHOTOS (KV namespace, name "sharma-crew-photos")
//     <photo key>            — the image/video bytes, with the photo's
//                              metadata record stored as the KV key's
//                              metadata
//                              key = job/caption-slug/ts-rand.ext
//     idx/<job>.json         — per-job photo index: a JSON array of the
//                              job's photo records, maintained on upload
//                              and delete. The list endpoint reads ONLY
//                              this key — KV list() is never called,
//                              because the account's shared free list()
//                              quota is exhausted by other apps.
//     jobmeta/<job>.json     — job-details records (permit/lot/
//                              inspection/crew/date)
//
// (KV, not R2: R2 requires a payment method on file to enable; KV's free
// tier does not. One namespace is the only binding.)
//
// Routes:
//   POST   /api/photos            upload one photo/video (JSON base64 or multipart)
//   GET    /api/photos?job=3131   list photo metadata records for a job
//   DELETE /api/photos?key=<key>  delete photo (bytes + metadata live on the key)
//   GET    /api/photos/file?key=<key>  the stored bytes, content type from
//                                      the key's extension, immutable cache
//   GET    /api/jobmeta?job=3131  the job's details record, or {} if unsaved
//   POST   /api/jobmeta           save the record (inspection_status must be
//                                 "", "requested", "passed" or "failed")

const JOBS = new Set(["3131", "3262", "3286", "3274"]);
const EXT_BY_TYPE = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "video/mp4": "mp4", "video/quicktime": "mov",
  "video/webm": "webm", "video/x-m4v": "m4v"
};
const TYPE_BY_EXT = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime",
  webm: "video/webm", m4v: "video/x-m4v"
};
const INSP_STATUSES = new Set(["", "requested", "passed", "failed"]);

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function slug(s) {
  return String(s || "other").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "other";
}
function fileUrl(key) { return "/api/photos/file?key=" + encodeURIComponent(key); }
function numOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function cleanKey(key) {
  if (!key || typeof key !== "string") return null;
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) return null;
  return key;
}
function base64ToBytes(b64) {
  const bin = atob(String(b64));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function cleanStr(v, max) {
  return String(v == null ? "" : v).slice(0, max || 200);
}

// ---- Per-job photo index (idx/<job>.json) ----
// The list endpoint must not call KV list() (shared free quota on this
// account is exhausted), so uploads/deletes maintain a per-job JSON index
// and list reads just that one key. Tradeoff: the index update is a
// read-modify-write, so two uploads to the SAME job in the same instant
// could race and drop one record from the index (its bytes/metadata stay
// in KV). Acceptable at crew scale; uploads are human-paced.

async function readIndex(env, job) {
  const text = await env.PHOTOS.get("idx/" + job + ".json", "text");
  if (!text) return [];
  try {
    const arr = JSON.parse(text);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

async function writeIndex(env, job, records) {
  await env.PHOTOS.put("idx/" + job + ".json", JSON.stringify(records));
}

// ---- /api/photos (was functions/api/photos.js) ----

async function handleUpload(req, env) {
  let bytes = null, contentType = "", fields = {};
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  if (ct.startsWith("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "multipart upload needs a 'file' field" }, 400);
    }
    bytes = new Uint8Array(await file.arrayBuffer());
    contentType = file.type || "";
    fields = {
      job: form.get("job"), caption: form.get("caption"), uploader: form.get("uploader"),
      taken_at: form.get("taken_at"), lat: form.get("lat"), lng: form.get("lng"),
      name: file.name || ""
    };
  } else {
    const body = await req.json().catch(() => null);
    if (!body || !body.data) return json({ error: "JSON upload needs a base64 'data' field" }, 400);
    bytes = base64ToBytes(body.data);
    contentType = body.content_type || body.contentType || "";
    fields = body;
  }
  if (!bytes.length) return json({ error: "empty file" }, 400);

  const job = String(fields.job || "");
  if (!JOBS.has(job)) return json({ error: "unknown job" }, 400);
  const caption = String(fields.caption || "Other photos").slice(0, 120);
  const uploader = String(fields.uploader || "").slice(0, 80);
  let takenAt = String(fields.taken_at || "");
  if (!takenAt || isNaN(Date.parse(takenAt))) takenAt = new Date().toISOString();

  let ext = "";
  const nameExt = String(fields.name || "").split(".").pop();
  if (nameExt && TYPE_BY_EXT[nameExt.toLowerCase()]) ext = nameExt.toLowerCase();
  if (!ext && EXT_BY_TYPE[contentType]) ext = EXT_BY_TYPE[contentType];
  if (!ext) ext = contentType.startsWith("video/") ? "mp4" : "jpg";
  if (!contentType) contentType = TYPE_BY_EXT[ext] || "application/octet-stream";

  const key = job + "/" + slug(caption) + "/" + Date.now() + "-" +
    Math.random().toString(36).slice(2, 8) + "." + ext;
  const record = {
    key: key, job: job, caption: caption, uploader: uploader,
    taken_at: takenAt, lat: numOrNull(fields.lat), lng: numOrNull(fields.lng),
    content_type: contentType, size: bytes.length
  };

  // Bytes as the KV value; the metadata record rides on the key's KV
  // metadata, and the record is appended to the job's index for listing.
  await env.PHOTOS.put(key, bytes, { metadata: record });
  const idx = await readIndex(env, job);
  idx.push(record);
  await writeIndex(env, job, idx);
  return json(Object.assign({}, record, { url: fileUrl(key) }), 201);
}

async function handleList(url, env) {
  const job = url.searchParams.get("job") || "";
  if (!JOBS.has(job)) return json({ error: "unknown job" }, 400);
  // One KV get of the job's index — never list() (see index note above).
  const idx = await readIndex(env, job);
  const records = [];
  for (const r of idx) {
    if (r && r.key) records.push(Object.assign({}, r, { url: fileUrl(r.key) }));
  }
  records.sort((a, b) => String(a.taken_at).localeCompare(String(b.taken_at)));
  return json(records);
}

async function handleDelete(url, env) {
  const key = cleanKey(url.searchParams.get("key"));
  if (!key) return json({ error: "bad key" }, 400);
  await env.PHOTOS.delete(key);
  // Drop the record from its job's index too (job = first path segment).
  const job = key.split("/")[0];
  if (JOBS.has(job)) {
    const idx = await readIndex(env, job);
    const kept = idx.filter((r) => !(r && r.key === key));
    if (kept.length !== idx.length) await writeIndex(env, job, kept);
  }
  return json({ ok: true, key: key });
}

async function handlePhotos(req, env) {
  const url = new URL(req.url);
  try {
    if (req.method === "POST") return await handleUpload(req, env);
    if (req.method === "GET") return await handleList(url, env);
    if (req.method === "DELETE") return await handleDelete(url, env);
    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

// ---- /api/photos/file (was functions/api/photos/file.js) ----

async function handlePhotoFile(req, env) {
  const url = new URL(req.url);
  try {
    if (req.method !== "GET") return json({ error: "method not allowed" }, 405);
    const key = cleanKey(url.searchParams.get("key"));
    if (!key) return json({ error: "bad key" }, 400);
    const bytes = await env.PHOTOS.get(key, "arrayBuffer");
    if (!bytes) return json({ error: "not found" }, 404);
    const ext = key.split(".").pop().toLowerCase();
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": TYPE_BY_EXT[ext] || "application/octet-stream",
        // Keys are unique per upload, so the bytes behind a key never change.
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

// ---- /api/jobmeta (was functions/api/jobmeta.js) ----

async function handleJobmetaGet(url, env) {
  const job = url.searchParams.get("job") || "";
  if (!JOBS.has(job)) return json({ error: "unknown job" }, 400);
  const text = await env.PHOTOS.get("jobmeta/" + job + ".json", "text");
  if (!text) return json({});
  try { return json(JSON.parse(text)); }
  catch (e) { return json({}); }
}

async function handleJobmetaPost(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "JSON body required" }, 400);
  const job = String(body.job || "");
  if (!JOBS.has(job)) return json({ error: "unknown job" }, 400);
  const status = String(body.inspection_status || "");
  if (!INSP_STATUSES.has(status)) return json({ error: "bad inspection_status" }, 400);
  const record = {
    job: job,
    permit: cleanStr(body.permit),
    inspection_status: status,
    inspection_reason: cleanStr(body.inspection_reason),
    lot: cleanStr(body.lot),
    crew: cleanStr(body.crew),
    date: cleanStr(body.date, 40),
    editor: cleanStr(body.editor, 80),
    updated_at: new Date().toISOString()
  };
  await env.PHOTOS.put("jobmeta/" + job + ".json", JSON.stringify(record));
  return json(record, 200);
}

async function handleJobmeta(req, env) {
  const url = new URL(req.url);
  try {
    if (req.method === "GET") return await handleJobmetaGet(url, env);
    if (req.method === "POST") return await handleJobmetaPost(req, env);
    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

// ---- Router ----

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/photos") return handlePhotos(request, env);
    if (pathname === "/api/photos/file") return handlePhotoFile(request, env);
    if (pathname === "/api/jobmeta") return handleJobmeta(request, env);
    return env.ASSETS.fetch(request);
  }
};
