/**
 * What is being shared — the icon and name at the top of "Recipients mode".
 *
 * The same row the share tour draws over this panel
 * (modules/desk/tutorial/share/skeleton/panel.js `subject`), so the tour and
 * the real panel name the item the same way. Icon and name only: the tour's
 * meta line is not repeated here.
 *
 * The icon differs in KIND rather than in glyph: a file gets a tinted box with
 * a type mark inside it, a folder or a workspace gets the folder SHAPE itself,
 * area-tinted. Only a workspace carries the area badge — the folder template
 * draws the emblem for a hub alone, and the emblem is what says "workspace"
 * rather than "folder inside one".
 *
 * The opener passes `subject` ("file" | "folder" | "workspace") and
 * `subject_data` (raw fields: name, filetype, ext, area). Every opener does —
 * media/interact.js, window/folder/secure-share-column.js and
 * player/widget/share — but a missing `subject` is still derived from the
 * filetype, and a missing name draws nothing rather than an empty row.
 */

// The area-tinted folder shape and the file glyph map, from the sources the
// desk and the tour already render through, so the three cannot drift.
const folderArt = require("media/grid/template/folder");
const { fileGlyph } = require("libs/file-meta");

// Images get the picture mark, which the shared glyph map has no entry for
// (it falls back to the generic file). Decided here rather than in
// libs/file-meta so the share tour's row, which reads the same map, is left as
// it is. The node's filetype first; the extension for a node that only
// carries one.
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "tif", "tiff", "heic"]);

function subjectGlyph(node) {
  const filetype = String(node.filetype || "").toLowerCase();
  const ext = String(node.ext || "").toLowerCase();
  if (filetype === "image" || IMAGE_EXT.has(ext)) return "bg-image";
  return fileGlyph(node);
}

function subjectKind(ui, node) {
  const kind = ui.mget("subject");
  if (["file", "folder", "workspace"].includes(kind)) return kind;
  const filetype = node.filetype || ui.mget(_a.filetype);
  if (filetype === _a.hub) return "workspace";
  if (filetype === _a.folder) return "folder";
  return "file";
}

const __skl_secure_share_subject = function (_ui_) {
  const pfx = _ui_.fig.family;
  const node = _ui_.mget("subject_data") || {};
  const name = node.name || _ui_.mget(_a.filename);
  if (!name) return null;

  const kind = subjectKind(_ui_, node);
  const icon =
    kind === "file"
      ? Skeletons.Box.Y({
          active: 0,
          className: `${pfx}__subject-ico`,
          kids: [
            Skeletons.Image.Svg({
              active: 0,
              ico: subjectGlyph(node),
              className: `${pfx}__subject-glyph`,
            }),
          ],
        })
      : Skeletons.Element({
          active: 0,
          className: `${pfx}__subject-art`,
          content: folderArt({
            area: node.area || _ui_.mget(_a.area) || _a.share,
            filetype: kind === "workspace" ? _a.hub : _a.folder,
            role: "desk",
            widgetId: _.uniqueId("secure-share-subject-"),
            // No kebab: this row has no menu behind it.
            isAttachment: 1,
          }),
        });

  return Skeletons.Box.X({
    active: 0,
    className: `${pfx}__subject`,
    dataset: { subject: kind },
    kids: [
      icon,
      Skeletons.Note({
        active: 0,
        className: `${pfx}__subject-name`,
        content: name,
      }),
    ],
  });
};

module.exports = __skl_secure_share_subject;
