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
  [GROUP.media]: "MEDIA",
  [GROUP.markdown]: "GROUP_MARKDOWN",
  [GROUP.json]: "GROUP_JSON",
  [GROUP.html]: "GROUP_HTML",
  [GROUP.other]: "OTHER",
};

// The Media tab (type filter "image", which the server widens to pictures,
// videos and sound) splits its grid into these sections, in this order. Keys
// are prefixed so they can never be mistaken for a Group-view section.
const MEDIA_FILTER = "image";
const MEDIA_GROUP = {
  image: "media-image",
  video: "media-video",
  audio: "media-audio",
  other: "media-other",
};

const MEDIA_GROUP_ORDER = [
  MEDIA_GROUP.image,
  MEDIA_GROUP.video,
  MEDIA_GROUP.audio,
  MEDIA_GROUP.other,
];

const MEDIA_GROUP_LABEL = {
  [MEDIA_GROUP.image]: "IMAGES",
  [MEDIA_GROUP.video]: "VIDEOS",
  [MEDIA_GROUP.audio]: "AUDIO",
  [MEDIA_GROUP.other]: "OTHER",
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

/**
 * Return the Media-tab section for an MFS node. Anything the server ever puts
 * in that tab outside the three kinds lands in a trailing section of its own
 * rather than being filed under a heading that misnames it.
 */
function mediaGroupOf(node = {}) {
  const filetype = String(node.filetype || "").toLowerCase();
  if (filetype === "image" || filetype === "vector") return MEDIA_GROUP.image;
  if (filetype === "video" || filetype === "stream") return MEDIA_GROUP.video;
  if (filetype === "audio") return MEDIA_GROUP.audio;
  return MEDIA_GROUP.other;
}

// A set of titled sections the grid can be split into.
const TYPE_SECTIONS = {
  order: GROUP_ORDER,
  label: GROUP_LABEL,
  groupOf,
  fallback: GROUP.other,
};

const MEDIA_SECTIONS = {
  order: MEDIA_GROUP_ORDER,
  label: MEDIA_GROUP_LABEL,
  groupOf: mediaGroupOf,
  fallback: MEDIA_GROUP.other,
};

function bucketByGroup(items = [], resolveGroup = groupOf, sections = TYPE_SECTIONS) {
  const buckets = new Map(sections.order.map((key) => [key, []]));
  for (const item of items) {
    const key = resolveGroup(item);
    const bucket = buckets.get(key) || buckets.get(sections.fallback);
    bucket.push(item);
  }
  return buckets;
}

function isGrouped(ui) {
  return !!(ui && GroupMode.get(ui.cid));
}

function isMediaFiltered(ui) {
  return !!(ui && ui._filterType === MEDIA_FILTER);
}

// Which titled sections the icon views are split into right now, or null for
// the plain workspace → folder → file stack. The Media tab wins over Group
// view: grouping it by type would put every tile under one "Media" heading.
// Only the icon views partition at all, so List is never affected.
function sectionsFor(ui) {
  if (isMediaFiltered(ui)) return MEDIA_SECTIONS;
  if (isGrouped(ui)) return TYPE_SECTIONS;
  return null;
}

// True while the grid is a classified presentation (Group view, or the Media
// tab's Images / Videos / Audio split) rather than the hand-arranged order.
function isSectioned(ui) {
  return !!sectionsFor(ui);
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
  return isSectioned(target) && !(captured && captured.over) && !!rearranging;
}

module.exports = {
  GROUP,
  GROUP_ORDER,
  GROUP_LABEL,
  VIEW_STATES,
  groupOf,
  mediaGroupOf,
  bucketByGroup,
  isGrouped,
  sectionsFor,
  isSectioned,
  setGrouped,
  clearGrouped,
  groupViewState,
  nextGroupViewState,
  blocksGroupedArrange,
};
