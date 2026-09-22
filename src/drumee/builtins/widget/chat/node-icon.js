/**
 * Icon markup for one desk node — hub, folder or file — drawn at row size.
 * The @-mention dropdown and the "From workspace" picker both draw the same
 * icon the desk grid draws; the caller's stylesheet sizes it.
 */
const mediaGridPreview = require("builtins/media/grid/template/preview");
const folderArt = require("builtins/media/grid/template/folder");

const isImgCapable = (file) => {
  if (/^-/.test(file.capability || "")) return 0;
  if ((file.ext || "").toLowerCase() === "svg") return 1;
  if ((file.ext || "").toLowerCase() === _a.pdf) return 0;
  if (/text/.test(file.mimetype || "")) return 0;
  if (/shell|script|text/.test(file.filetype || "")) return 0;
  return /^r/.test(file.capability || "") ? 1 : 0;
};

const previewUrl = (file) =>
  file.url || file.vignette || file.thumbnail || file.src || file.preview || "";

/**
 * @param {Object} node   row from media.show_node_by / desk.home / search
 * @param {Object} opt
 * @param {string} opt.area    fallback area when the node carries none
 * @param {string} opt.prefix  uniqueId prefix for the SVG filter ids
 */
module.exports = function nodeIconHtml(node, { area, prefix = "node-icon-" } = {}) {
  const url = previewUrl(node);
  const model = {
    ...node,
    _id: node._id || node.id || node.nid,
    area: node.area || area,
    role: node.filetype === _a.folder ? "mention" : node.role || "desk",
    imgCapable: url ? isImgCapable(node) : 0,
    url,
    widgetId: _.uniqueId(prefix),
    isAttachment: 1,
  };
  switch (model.filetype) {
    case _a.hub:
    case _a.folder:
      return folderArt(model);
    case _a.audio:
      return require("builtins/media/grid/template/filetype/audio.txt").default;
    case _a.note:
    case "markdown":
      return require("builtins/media/grid/template/filetype/note.txt").default;
    default:
      return mediaGridPreview(model);
  }
};
