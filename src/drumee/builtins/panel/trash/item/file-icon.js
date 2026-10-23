// Icon for a trash row's tile, by file type. Phosphor regular throughout, as
// the design draws them. The tone picks the colour (item/skin): the five the
// Figma file grid shows carry its colours (text, pdf, note, sheet, slides);
// types it doesn't draw use the folder's brand purple.

const BY_EXT = {
  pdf: "pdf",
  doc: "text", docx: "text", odt: "text", rtf: "text", txt: "text", pages: "text",
  xls: "sheet", xlsx: "sheet", ods: "sheet", csv: "sheet", numbers: "sheet",
  ppt: "slides", pptx: "slides", odp: "slides", key: "slides",
  md: "markdown", markdown: "markdown",
  zip: "zip", rar: "zip", "7z": "zip", tar: "zip", gz: "zip", tgz: "zip", bz2: "zip",
  js: "code", ts: "code", jsx: "code", css: "code", scss: "code", html: "code",
  htm: "code", json: "code", xml: "code", py: "code", sh: "code", sql: "code",
};

const ICONS = {
  folder: { ico: "ph-folder", tone: "folder" },
  text: { ico: "ph-file-text", tone: "text" },
  pdf: { ico: "ph-file-pdf", tone: "pdf" },
  sheet: { ico: "ph-table", tone: "sheet" },
  slides: { ico: "ph-presentation", tone: "slides" },
  note: { ico: "ph-note-pencil", tone: "note" },
  markdown: { ico: "ph-file-md", tone: "text" },
  image: { ico: "ph-image", tone: "media" },
  video: { ico: "ph-file-video", tone: "media" },
  audio: { ico: "ph-file-audio", tone: "media" },
  zip: { ico: "ph-file-zip", tone: "other" },
  code: { ico: "ph-file-code", tone: "other" },
  file: { ico: "ph-file", tone: "other" },
};

// m: { filetype, ext, mimetype, dataType } — the row's own fields.
function fileIcon(m = {}) {
  const type = `${m.filetype || ""}`.toLowerCase();
  const ext = `${m.ext || ""}`.toLowerCase();
  const mime = `${m.mimetype || ""}`.toLowerCase();
  let key;
  switch (type) {
    case "folder":
    case "hub":
      key = "folder"; break;
    case "note":
    case "drumee.note":
      key = "note"; break;
    case "image":
      key = "image"; break;
    case "video":
      key = /^audio/.test(mime) ? "audio" : "video"; break;
    case "audio":
    case "music":
      key = "audio"; break;
    case "markdown":
      key = "markdown"; break;
    case "zip":
      key = "zip"; break;
    case "script":
    case "stylesheet":
      key = "code"; break;
    case "web":
      if (m.dataType === "drumee.note") { key = "note"; break; }
    // falls through: a plain web file goes by its extension
    default:
      key = BY_EXT[ext] || "file";
  }
  return ICONS[key];
}

module.exports = { fileIcon };
