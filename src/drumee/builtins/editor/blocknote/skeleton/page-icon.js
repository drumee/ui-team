// ===========================================================
//  Notion-style Note — the page icon (one emoji above the title).
// ===========================================================

/**
 * @param {View} ui the editor window
 * @param {String} icon the emoji
 * @param {Boolean} editable whether a click opens the picker
 */
module.exports = function (ui, icon, editable) {
  const pfx = ui.fig.family;
  return Skeletons.Note({
    debug: __filename,
    className: `${pfx}__page-icon`,
    content: _.escape(icon),
    service: editable ? "toggle-icon-picker" : null,
    uiHandler: [ui],
    dataset: { editable: editable ? 1 : 0 },
  });
};
