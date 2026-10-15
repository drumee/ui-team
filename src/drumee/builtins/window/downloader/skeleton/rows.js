// The progress parts shared by the multiple-files step (files.js) and the .zip
// step (progress.js): the aggregate bar with its byte count and percentage,
// and one row per item, as upload's progress rows.
//
// index.js repaints them in place — the bar (__bar-fill, __meta-bytes,
// __meta-percent) and each row's data-status and count — rather than
// re-rendering. Texts are plain Elements, not Notes: a Note keeps its text one
// div deeper (.note-content).

/**
 * The bar across the top, its byte count on the left, the percentage on the
 * right.
 */
const aggregate = function (pfx) {
  return Skeletons.Box.Y({
    className : `${pfx}__aggregate`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__bar`,
        kids      : [
          Skeletons.Element({ className: `${pfx}__bar-fill`, content: '' })
        ]}),
      Skeletons.Box.X({
        className : `${pfx}__meta`,
        kids      : [
          Skeletons.Element({ className: `${pfx}__meta-bytes`, content: '' }),
          Skeletons.Element({ className: `${pfx}__meta-percent`, content: '' })
        ]})
    ]});
};

/**
 * One row — upload-progress index.js _buildProgressRow: a single-line tile,
 * its icon and the name on the left; on the right a small count and the
 * status: a spinner, a check, or a warning. The skin shows the right ones off
 * data-status. The name is escaped: Element content is HTML.
 * @param {String} pfx
 * @param {{index, icon, name, meta, status}} o `icon` is a ready skeleton
 */
const row = function (pfx, o) {
  return Skeletons.Box.X({
    className : `${pfx}__item`,
    dataset   : { index: String(o.index), status: o.status || 'pending' },
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__item-left`,
        kids      : [
          o.icon,
          Skeletons.Element({
            className : `${pfx}__item-name`,
            content   : _.escape(o.name)
          })
        ]}),
      Skeletons.Box.X({
        className : `${pfx}__item-right`,
        kids      : [
          Skeletons.Element({
            className : `${pfx}__item-meta`,
            content   : o.meta || ''
          }),
          Skeletons.Box.X({ className: `${pfx}__item-spinner` }),
          Skeletons.Button.Svg({
            className : `${pfx}__item-check`,
            ico       : 'checked-circle',
            active    : 0
          }),
          Skeletons.Button.Svg({
            className : `${pfx}__item-error`,
            ico       : 'apps-warning',
            active    : 0,
            tooltips  : LOCALE.ERROR
          })
        ]})
    ]});
};

/**
 * A file-type icon for a name (upload's getFileIcon).
 */
const fileIcon = function (pfx, name) {
  const { getFileIcon } = require("../../upload-progress/skeleton/helpers");
  return Skeletons.Button.Svg({
    className : `${pfx}__item-icon`,
    ico       : getFileIcon({ name }),
    active    : 0
  });
};

module.exports = { aggregate, row, fileIcon };
