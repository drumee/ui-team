/**
 * The type sections "Other files" is split into: Documents, Spreadsheets,
 * Images, Videos, Audio, Other, in that order (QA, 2026-10-19: the flat list
 * mixed pictures, videos, docx, py, csv and mp3). The buckets follow the Files
 * tab's own grouping (window/skeleton/toolkit/file-group): office formats are
 * told apart by extension, a Univer sheet saved as .json counts as a sheet.
 * Pure, so node --test can run it.
 */
const { GROUP, groupOf } = require("window/skeleton/toolkit/file-group");

const ORDER = ["documents", "spreadsheets", "images", "videos", "audio", "other"];
const LABEL = {
  documents: "DOCUMENTS",
  spreadsheets: "SPREADSHEETS",
  images: "IMAGES",
  videos: "VIDEOS",
  audio: "AUDIO",
  other: "OTHER",
};

/** Which section a show_node_by row belongs to. */
function sectionOf(node = {}) {
  const filetype = String(node.filetype || "").toLowerCase();
  if (filetype === "image" || filetype === "vector") return "images";
  if (filetype === "video" || filetype === "stream") return "videos";
  if (filetype === "audio") return "audio";
  // A listing row carries its metadata as the stored JSON text; groupOf reads
  // the sheet marker out of the object.
  let metadata = node.metadata;
  if (typeof metadata === "string") {
    try { metadata = JSON.parse(metadata); } catch (e) { metadata = null; }
  }
  switch (groupOf({ ...node, metadata })) {
    case GROUP.doc:
    case GROUP.slide:
    case GROUP.pdf:
    case GROUP.markdown:
      return "documents";
    case GROUP.sheet:
      return "spreadsheets";
    default:
      return "other";
  }
}

/**
 * @param {Array<Object>} list files, already filtered and ordered
 * @returns {Array<{key, label, items}>} the non-empty sections, in ORDER
 */
function groupFiles(list = []) {
  const by = new Map(ORDER.map((k) => [k, []]));
  for (const node of list) by.get(sectionOf(node)).push(node);
  return ORDER.filter((k) => by.get(k).length).map((k) => ({ key: k, label: LABEL[k], items: by.get(k) }));
}

module.exports = { ORDER, LABEL, sectionOf, groupFiles };
