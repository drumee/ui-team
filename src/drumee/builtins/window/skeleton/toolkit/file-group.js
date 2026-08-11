const GROUP = {
  folder: "folder",
  doc: "doc",
  sheet: "sheet",
  slide: "slide",
  pdf: "pdf",
  media: "media",
  markdown: "markdown",
  json: "json",
  html: "html",
  other: "other",
};

const GROUP_ORDER = [
  GROUP.folder,
  GROUP.doc,
  GROUP.sheet,
  GROUP.slide,
  GROUP.pdf,
  GROUP.media,
  GROUP.markdown,
  GROUP.json,
  GROUP.html,
  GROUP.other,
];

const GROUP_LABEL = {
  [GROUP.folder]: "FOLDERS",
  [GROUP.doc]: "GROUP_DOCUMENTATION",
  [GROUP.sheet]: "SPREADSHEET",
  [GROUP.slide]: "PRESENTATION",
  [GROUP.pdf]: "GROUP_PDF",
  [GROUP.media]: "GROUP_MEDIA",
  [GROUP.markdown]: "GROUP_MARKDOWN",
  [GROUP.json]: "GROUP_JSON",
  [GROUP.html]: "GROUP_HTML",
  [GROUP.other]: "OTHER",
};

const MEDIA_TYPES = new Set(["image", "video", "audio", "stream", "vector"]);
const DOC_EXTENSIONS = new Set(["docx", "doc", "odt", "rtf", "txt"]);
const SHEET_EXTENSIONS = new Set(["xlsx", "xls", "ods", "csv"]);
const SLIDE_EXTENSIONS = new Set(["pptx", "ppt", "odp"]);
const GroupMode = new Map();

/**
 * Return the display group for an MFS node.
 *
 * Drumee's file-capability table maps office formats to the same `document`
 * category, so extensions are required to distinguish documents, sheets,
 * presentations, and PDFs.
 */
function groupOf(node = {}) {
  const filetype = String(node.filetype || "").toLowerCase();
  const ext = String(node.ext || "").toLowerCase();

  if (filetype === "folder" || filetype === "hub") return GROUP.folder;
  if (MEDIA_TYPES.has(filetype)) return GROUP.media;

  if (ext === "pdf") return GROUP.pdf;
  if (SHEET_EXTENSIONS.has(ext)) return GROUP.sheet;
  if (SLIDE_EXTENSIONS.has(ext)) return GROUP.slide;
  if (DOC_EXTENSIONS.has(ext)) return GROUP.doc;
  if (ext === "md") return GROUP.markdown;
  if (ext === "json") return GROUP.json;
  if (ext === "html" || ext === "htm") return GROUP.html;

  if (filetype === "markdown") return GROUP.markdown;
  if (filetype === "web") return GROUP.html;
  if (filetype === "note") return GROUP.doc;
  return GROUP.other;
}

function bucketByGroup(items = [], resolveGroup = groupOf) {
  const buckets = new Map(GROUP_ORDER.map((key) => [key, []]));
  for (const item of items) {
    const key = resolveGroup(item);
    const bucket = buckets.get(key) || buckets.get(GROUP.other);
    bucket.push(item);
  }
  return buckets;
}

function isGrouped(ui) {
  return !!(ui && GroupMode.get(ui.cid));
}

function setGrouped(ui, enabled) {
  if (!ui) return;
  GroupMode.set(ui.cid, enabled ? 1 : 0);
}

function clearGrouped(ui) {
  if (!ui) return;
  GroupMode.delete(ui.cid);
}

// The three toggle positions. Each maps to an (isGrouped, viewMode) pair:
//   group -> (1, icon)    list -> (0, row)    grid -> (0, icon)
const VIEW_STATES = ["group", "list", "grid"];

// Which position the window is showing right now.
function groupViewState(ui, viewMode) {
  if (isGrouped(ui)) return "group";
  return viewMode === "row" ? "list" : "grid";
}

// Fallback order for a press that names no mode (the gaps in the toggle box).
function nextGroupViewState(ui, viewMode) {
  if (isGrouped(ui)) return "list";
  return viewMode === "row" ? "grid" : "group";
}

function blocksGroupedArrange(target, captured, rearranging) {
  return isGrouped(target) && !(captured && captured.over) && !!rearranging;
}

module.exports = {
  GROUP,
  GROUP_ORDER,
  GROUP_LABEL,
  VIEW_STATES,
  groupOf,
  bucketByGroup,
  isGrouped,
  setGrouped,
  clearGrouped,
  groupViewState,
  nextGroupViewState,
  blocksGroupedArrange,
};
