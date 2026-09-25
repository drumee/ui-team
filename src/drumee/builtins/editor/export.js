/** ================================================================== *
#   FILE : /src/drumee/builtins/editor/export
#   TYPE : helper — download Casual editor files as real Office documents
# ===================================================================**/

/**
 * Casual Docs / Casual Sheets files are stored as JSON (.udoc =
 * `{docx: base64}`, .usheet = Univer IWorkbookData), which nothing outside
 * Drumee can open. On "Download", hand the user a real .docx / .xlsx instead:
 *   - .udoc  → the embedded .docx bytes, as-is.
 *   - .usheet → Casual's standalone converter (`@casualoffice/sheets/xlsx`,
 *               the same one its File → Export uses), no editor mount needed.
 * Resolves true when a converted file was handed to the browser, false when
 * the media is not a Casual file (caller falls back to the raw download).
 */
const { base64ToAb } = require("builtins/editor/docs/collab");

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function saveBlob(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Raw-content URL of a media tile (same endpoint the editors load from). */
const { contentUrl } = require("builtins/editor/content-url");

function isCasualFile(media) {
  const ext = String(media.mget(_a.ext) || media.mget(_a.extension) || "").toLowerCase();
  return ext === "udoc" || ext === "usheet" ? ext : null;
}

async function downloadAsOffice(media) {
  const ext = isCasualFile(media);
  if (!ext) return false;
  const name = String(media.mget(_a.filename) || "document").replace(/<.+>/, "").trim();
  // Revalidate: /file/orig/… carries a year-long max-age, and a plain GET would
  // export whatever version the browser cached first.
  const res = await fetch(contentUrl(media), { credentials: "include", cache: "no-cache" });
  if (!res.ok) throw new Error(`content fetch failed: ${res.status}`);
  const json = await res.json();

  if (ext === "udoc") {
    const b64 = json && json.docx;
    if (!b64) throw new Error("udoc without docx payload");
    saveBlob(new Blob([base64ToAb(b64)], { type: MIME.docx }), `${name}.docx`);
    return true;
  }

  // usheet → xlsx through Casual's converter (lazy chunk, loaded on demand).
  const { workbookDataToXlsx } = await import("@casualoffice/sheets/xlsx");
  const out = await workbookDataToXlsx(json);
  const blob = out instanceof Blob ? out : new Blob([out], { type: MIME.xlsx });
  saveBlob(blob, `${name}.xlsx`);
  return true;
}

module.exports = { downloadAsOffice, isCasualFile };
