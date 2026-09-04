/**
 * How a file is LABELLED — its glyph, its size and the "what changed when" line
 * under its name.
 *
 * Three small pure functions, shared rather than local, because two unrelated
 * surfaces now render the same card: the media grid's chat-attachment tile
 * (builtins/media/grid/template) and the share tour's subject row
 * (modules/desk/tutorial/share/skeleton/panel.js, Figma 148:41930). `size` in
 * particular had exactly one correct implementation and it was private to a
 * template, so the second caller would have had to copy it — and a copy of a
 * formatter drifts.
 */

// Extension buckets. `txt` is deliberately NOT folded in with the documents:
// it has a glyph of its own, and skeleton/toolkit/file-group.js — which does
// group them together — is the wrong source to reuse for that reason.
const SHEET = new Set(["xlsx", "xls", "ods", "csv"]);
const SLIDE = new Set(["pptx", "ppt", "odp"]);
const DOC = new Set(["docx", "doc", "odt", "rtf"]);

/**
 * Human-readable file size — "1.2 MB".
 *
 * BINARY units with one decimal below 10, which is the form the design uses
 * (148:41936 "1.2MB", and the chat attachment card this came from). NOT
 * `filesize()` from @drumee/ui-essentials: that is SI and two-decimal, so the
 * same bytes come out "1.26 MB" and, worse, "1.54 kB" with a lowercase k.
 *
 * The design omits the space before the unit; it is kept here, because the
 * product's own attachment card has always had it and one card disagreeing
 * with the other is more visible than either choice on its own.
 *
 * @param {Number|String} bytes
 * @returns {String} formatted size, or "" when there is nothing to show
 */
function humanFileSize(bytes) {
  const n = Number(bytes);
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/**
 * The sprite that stands for a file's type.
 *
 * ORDER MATTERS: `txt` is tested before the document set, or a .txt would take
 * the document glyph and `app-txt-file` would never render.
 *
 * There is no image glyph in this family, so pictures fall to `app-file` along
 * with markdown, json, scripts and anything unrecognised. `app-html-file`
 * exists in the sprite set but is deliberately unused — html is not one of the
 * types this map distinguishes.
 *
 * Distinct from `fileIconName` in modules/desk/workspace-item/skeleton: that
 * one draws a DIFFERENT icon family (image / video / desktop_musicfile /
 * file-pdf / desktop_docfile) for the workspace list, and the two are not
 * interchangeable.
 *
 * @param {Object} node        `{filetype, ext}` — either may be absent
 * @returns {String} sprite name
 */
function fileGlyph(node = {}) {
  const filetype = String(node.filetype || "").toLowerCase();
  const ext = String(node.ext || "").toLowerCase();

  if (filetype === "audio") return "app-audio-file";
  if (filetype === "video" || filetype === "stream") return "app-video-file";

  if (ext === "pdf") return "app-pdf-file";
  if (SHEET.has(ext)) return "app-xls-file";
  if (SLIDE.has(ext)) return "app-ppt-file";
  if (ext === "txt") return "app-txt-file";
  if (DOC.has(ext)) return "app-doc-file";

  // No extension to go on — fall back to what the node says it is.
  if (filetype === "document" || filetype === "note") return "app-doc-file";

  return "app-file";
}

/**
 * The line under a name: when it last changed, and how big it is.
 *
 * "Update 2 hour ago • 1.2 MB". The leading word is the design's
 * (148:41936 reads "Update", not "Updated") and comes from a locale key rather
 * than being written here, so the grammar is the translator's to fix.
 *
 * @param {Object} node    `{filesize, ctime, mtime}`
 * @param {Object} [opt]
 * @param {Boolean} [opt.size=true] append the size. Folders and workspaces pass
 *   false: they have no meaningful byte count, and the frames' "1.2MB" on those
 *   two is placeholder copy carried over from the file variant.
 * @returns {String} the line, or "" when there is nothing true to say
 */
function fileMeta(node = {}, opt = {}) {
  const { size = true } = opt;
  const parts = [];

  // ctime first, then mtime — the same precedence the real grid tile uses.
  const ts = Number(node.ctime) || Number(node.mtime) || 0;
  if (ts > 0 && typeof Dayjs !== "undefined") {
    const when = Dayjs.unix(ts).fromNow();
    if (when) parts.push(`${LOCALE.UPDATE_AT} ${when}`);
  }

  if (size) {
    const bytes = humanFileSize(node.filesize);
    if (bytes) parts.push(bytes);
  }

  return parts.join(" • ");
}

module.exports = { humanFileSize, fileGlyph, fileMeta };
