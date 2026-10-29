// ===========================================================
//  Notion-style Note — the cover banner.
// ===========================================================

/**
 * Full-width image across the top of the page (Figma 1406:28148), with
 * Change / Remove over its bottom-right corner on hover (1406:64255).
 *
 * @param {View} ui the editor window
 * @param {{nid: String, hub_id: String}} cover
 * @param {Boolean} editable
 */
module.exports = function (ui, cover, editable) {
  const pfx = ui.fig.family;
  const { coverUrl } = require("../page");
  const kids = [
    Skeletons.Element({
      tagName: "img",
      className: `${pfx}__cover-image`,
      attribute: { src: coverUrl(cover), alt: "", draggable: "false" },
    }),
  ];
  if (editable) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__cover-controls`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__cover-button change`,
            content: LOCALE.CHANGE,
            service: "change-cover",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__cover-button remove`,
            content: LOCALE.REMOVE,
            service: "remove-cover",
            uiHandler: [ui],
          }),
        ],
      })
    );
  }
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__cover`,
    kids,
  });
};
