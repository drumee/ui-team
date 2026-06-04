# Content thumbnails for documents (pdf / docx / xlsx / pptx)

**Date:** 2026-05-31
**Status:** Approved (design)
**Scope:** ui-team (client gate + rendering) + server-team (poster generation + backfill)

## Problem

In the file browser (grid and row views, e.g. `https://drumee.in/-/vudangnt/`,
the "operations" sharebox) documents show a generic **file-type icon**, not a
preview of their content. Images / videos / vectors already show a real content
thumbnail ("vignette"). Goal: show a **content thumbnail** (first-page poster)
for documents too — `pdf`, `docx/doc`, `xlsx/xls`, `pptx/ppt` — falling back to
the icon when no poster exists.

## Decision (chosen approach)

**Server-side poster generation, reusing the existing pipeline.** The server
already rasterizes document pages to JPG (for OCR/search); generate the node's
`vignette/preview/card` images from page 1 and let the client request them via
the existing vignette endpoint. The client only opens its thumbnail "gate" for
document/pdf nodes that have a poster.

Rejected alternatives:
- **Client-side pdfium render** — PDF-only (office needs server doc→pdf first),
  per-item CPU/RAM cost in a multi-file grid, no cross-user cache.
- **Lazy on-demand server generation** — viable, but the team chose eager
  generation (on index/upload) + an explicit backfill of existing files so the
  "operations" folder shows thumbnails immediately.

### Settled parameters
- **Formats:** all of `pdf`, `docx/doc`, `xlsx/xls`, `pptx/ppt` (all flow
  through one path: office → PDF → page-1 jpg → poster).
- **Backfill:** yes — a job generates posters for already-uploaded doc/pdf
  nodes AND new uploads generate eagerly.
- **Cell fit:** **cover**, cropped, **top-aligned** (looks like a document
  card; the page header/title stays visible).
- **No poster (pending / failed / generation off):** keep the current type icon
  — never break the cell.

## Current state (grounded)

### Client (ui-team) — how thumbnail vs icon is chosen
- `imgCapable()` — [media/core.js:1229-1240](../../../src/drumee/builtins/media/core.js) —
  returns 1 (thumbnail) when `capability` starts with `r` and the node is not
  pdf / text / shell / script; **PDF is explicitly blocked (~core.js:1234)**;
  svg forced 1. Documents → 0 (icon).
- `enablePreview()` — `media/grid/index.js:151-175` and `media/row/index.js:79-111` —
  image/video/vector → `iconType="vignette"` (thumbnail); **default (documents)
  → `iconType="vector"` (icon)**.
- Templates — `media/grid/template/preview.js`, `media/row/template/preview.js` —
  if `imgCapable` → `background-image:url(<vignette url>)`, else → SVG icon.
- Thumbnail URL — `actualNode("vignette").url` → `<endpoint>file/vignette/<nid>/<hub_id>`
  (also `SERVICE.media.vignette`).

### Server (server-team) — pipeline already largely present
- `generator.js` (server-core `lib/utils/generator.js`): `create_image_vignette`
  (100×100, L148), `create_image_preview` (200×200, L164), `create_image_slide`,
  `create_image_card` (460×260, L199), `create_image_webp` — all via **`gm convert`**.
- `create_document_index(node)` (generator.js:242): for `pdf` uses orig; for
  office uses the **soffice**-converted PDF; spawns `offline/media/seo.js`.
- `offline/media/seo.js` (server-team): renders **PDF pages → JPG** via Python
  `pdf2image` `convert_from_path(..., dpi=300, fmt='jpg')` into
  `<mfs_dir>/pdf_pages/` (page 1 = `pdf_pages/1.jpg`, L244-256) — currently for
  OCR/text extraction only.
- Serving: `media.vignette/thumbnail/card/slide/preview` (media.js 1426-1485) →
  `send_media(node, FORMAT)` (server-core `lib/mfs.js:405`) → `FileIo.output(node, format)`.
- Tooling installed: `soffice` (LibreOffice), `pdfinfo`/poppler, `pdf2image`
  (python), `gm` (GraphicsMagick).

**Gap:** page-1 raster already exists for docs/pdf, but (a) it is never turned
into the node's `vignette/preview/card` files, and (b) the client gate blocks
document/pdf.

## Design

### A. Server — poster generation (server-team)
1. **Generate the poster from page 1.** In the document pipeline (after
   `seo.js` produces `pdf_pages/1.jpg`), add a step that runs `gm convert` on
   page 1 into the same `vignette/preview/card` outputs (and locations) that
   image nodes use, with **cover + top crop**:
   `gm convert -auto-orient -gravity North -thumbnail 'WxH^' -extent WxH +profile '*' <pdf_pages/1.jpg> <out>`.
   Sizes mirror the existing image presets (vignette 100, preview 200, card 460×260).
2. **Mark the node** as poster-capable so the client shows a thumbnail — set the
   node's `capability` to a renderable value (or an explicit `preview`/`has_poster`
   flag carried in node attributes). This is the single signal the client gate reads.
3. **Backfill job** — an offline worker/script that scans existing doc/pdf nodes
   without a poster, ensures doc→PDF (soffice) + `pdf_pages/1.jpg` + the poster
   outputs, then marks the node. Runs via a queue with throttling so a large
   library doesn't overload the box.

### B. Client — open the thumbnail gate (ui-team)
1. `imgCapable()` (core.js:1229) — return 1 for **document and pdf** nodes that
   carry the poster flag; remove the unconditional pdf block (gate it on the flag).
2. `enablePreview()` (grid + row) — add a document/pdf case → `iconType="vignette"`
   when the node has a poster; otherwise fall through to `vector` (icon) as today.
3. Template `preview.js` (grid + row) — for the doc poster cell use
   `background-size: cover; background-position: top` (the chosen cover+top fit).
4. **Fallback** — when the poster flag is absent, render the current type icon.
   Optionally, on `<img>`/background load error, revert to the icon to avoid a
   broken cell.

### C. Coverage & behavior
- pdf + docx/doc + xlsx/xls + pptx/ppt, all via the office→PDF→page-1 path.
- New uploads: poster generated eagerly during indexing.
- Existing files (e.g. "operations"): covered by the backfill job.
- Any node without a poster: icon, exactly as today.

## Risks / open implementation points
- **`FileIo.output` path resolution** lives in server-core (`lib/file-io.js`,
  node_modules). Must confirm the on-disk location/name where it looks up a
  node's `vignette/preview/card` so the generated doc poster is placed there
  (mirroring image nodes). If it cannot be matched without a server-core change,
  document the smallest server-team-side adapter. (Resolve in the plan.)
- **The poster flag** — confirm whether to reuse `capability` (the existing
  signal `imgCapable` reads) or add a dedicated `preview`/`has_poster` attribute,
  and where node attributes are emitted to the client. (Resolve in the plan.)
- **Excel fidelity** — a spreadsheet's first PDF page can look sparse/cut. Accept
  for now (scope = all formats); if poor, exclude `xlsx/xls` later behind the flag.
- **Backfill load** — gate behind a throttled queue; log how many nodes were
  (re)generated vs skipped; never block interactive uploads.
- **Cache busting** — vignette URLs are cache-busted by mtime today; ensure the
  poster generation bumps whatever the URL keys on so a freshly generated poster
  is not masked by a cached 404/icon.

## Testing / verification
No automated runner. Manual, after deploying server-team + ui-team:
1. Upload a new `.pdf`, `.docx`, `.xlsx`, `.pptx` → grid/row shows a first-page
   poster (cover, top-aligned), not an icon.
2. Run backfill → existing docs in "operations" show posters.
3. A node mid-generation / generation-failed → shows the type icon (no broken cell).
4. Image/video/vector thumbnails unchanged; icons for non-doc types unchanged.
5. Switching list ↔ grid keeps the poster in both.
