/**
 * The type sections "Other files" is split into: the folder's own Group view
 * (window/skeleton/toolkit/file-group), minus Folders, in the same order and
 * under the same labels: Documentation, Spreadsheet, Presentation, PDF,
 * Media, Markdown, JSON, HTML, Other. Office formats are told apart by
 * extension, a Univer sheet saved as .json counts as a sheet.
 * Pure, so node --test can run it.
 */
const { GROUP, GROUP_ORDER, GROUP_LABEL, groupOf } = require("window/skeleton/toolkit/file-group");

const ORDER = GROUP_ORDER.filter((k) => k !== GROUP.folder);
const LABEL = GROUP_LABEL;

/** Which section a show_node_by row belongs to. */
function sectionOf(node = {}) {
  // A listing row carries its metadata as the stored JSON text; groupOf reads
  // the sheet marker out of the object.
  let metadata = node.metadata;
  if (typeof metadata === "string") {
    try { metadata = JSON.parse(metadata); } catch (e) { metadata = null; }
  }
  const key = groupOf({ ...node, metadata });
  return ORDER.includes(key) ? key : GROUP.other;
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
