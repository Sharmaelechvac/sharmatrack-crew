# Sharma Crew App — Cloudflare Pages bindings

Deploy-ready copy of the crew app for Cloudflare Pages in **advanced
mode**: a single self-contained `_worker.js` at the site root is the only
code. It routes the three API paths to the backend handlers (ported from
the Netlify Function + Blobs original) and delegates every other path to
`env.ASSETS.fetch(request)`, so static serving — including the SPA
fallback for unknown paths — is unchanged. (The earlier `functions/`
file-based routing did not intercept on this drag-upload project, so it
was replaced by the worker; there is no `functions/` folder and no
`_routes.json`.) `app.js` is unchanged — the HTTP contract is identical:

| Route | Methods | Handler in `_worker.js` |
|---|---|---|
| `/api/photos` | GET (list `?job=`), POST (upload), DELETE (`?key=`) | `handlePhotos` |
| `/api/photos/file` | GET (`?key=`) | `handlePhotoFile` |
| `/api/jobmeta` | GET (`?job=`), POST | `handleJobmeta` |

## Binding to create (ONE binding total)

Storage is a **Cloudflare KV namespace** — not R2. (R2 requires a payment
method on file to enable; the user runs card-free, and KV's free tier does
not ask for one.)

**Step 1 — create the namespace** (dashboard, once):
Workers & Pages → KV (under "Storage" / "KV" in the left sidebar) →
Create namespace → name it `sharma-crew-photos`.

**Step 2 — bind it to the Pages project** `sharmatrack-crew`:
Project → Settings → Functions → KV namespace bindings → Add binding

| Variable name (must match exactly) | KV namespace |
|---|---|
| `PHOTOS` | `sharma-crew-photos` |

The binding configured there applies to the `_worker.js` advanced-mode
worker exactly as it would to Pages Functions — the worker reads it as
`env.PHOTOS`. Redeploy the project after adding the binding so the worker
picks it up.

That is the only binding (no R2, no D1). All three record types live in
the one namespace:

- `<job>/<caption-slug>/<ts>-<rand>.<ext>` — photo/video bytes as the KV
  value, with the photo's metadata record (key, job, caption, uploader,
  taken_at, lat, lng, content_type, size) stored as that key's KV metadata
  — the list endpoint reads records straight from `list()` metadata.
- `jobmeta/<job>.json` — the job-details record (permit / lot / inspection / crew / date)

Notes on KV semantics: values up to 25 MiB per key (photo uploads are far
below that — the client compresses before upload); KV writes are visible
globally within ~60s (eventual consistency at the edge — a just-taken photo
can take a few seconds to appear on another phone, which is fine for this
app). List pagination is handled by cursor in the worker, mirroring the
old R2 list loop.

## Notes

- No Netlify files are in this folder: `netlify.toml`, `_redirects`,
  `netlify/` and `netlify-src/` were deliberately excluded (the `_redirects`
  rewrites point at Netlify Function paths and would be wrong here; the
  `_worker.js` router replaces them).
- No `wrangler.toml` is shipped: for dashboard / drag-and-drop deploys the
  binding above is set in the UI. (A wrangler deploy would instead declare
  the same `[[kv_namespaces]]` binding, `binding = "PHOTOS"`, in
  `wrangler.toml`.)
- Free-tier fit: KV free tier = 1 GB storage, 100k reads/day, 1k
  writes/day — far above this app's use; Pages bandwidth is unmetered
  on the free plan.
