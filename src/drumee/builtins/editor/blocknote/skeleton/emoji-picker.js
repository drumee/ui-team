// ===========================================================
//  Notion-style Note — the page-icon picker (Figma 1406:27172).
// ===========================================================

/**
 * "Emoji · Remove", a row of category tabs (search first), a search field,
 * the section title and the grid. The grid is filled by ../page once the
 * emoji data has loaded — it is one element of text spans, not hundreds of
 * widgets, so switching tabs stays instant.
 *
 * @param {View} ui the editor window
 * @param {Array} categories [{id, ico}] in tab order
 */
module.exports = function (ui, categories) {
  const pfx = ui.fig.family;
  const tab = (id, ico) =>
    Skeletons.Box.X({
      className: `${pfx}__emoji-tab`,
      service: "emoji-tab",
      tab: id,
      uiHandler: [ui],
      dataset: { tab: id, active: id === "search" ? 1 : 0 },
      kidsOpt: { active: 0 },
      kids: [Skeletons.Button.Svg({ ico, className: `${pfx}__emoji-tab-icon` })],
    });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__popup ${pfx}__emoji-picker`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__emoji-head`,
        kids: [
          Skeletons.Note({ className: `${pfx}__emoji-head-title`, content: LOCALE.NOTE_EMOJI }),
          Skeletons.Note({
            className: `${pfx}__emoji-head-remove`,
            content: LOCALE.REMOVE,
            service: "remove-icon",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__emoji-body`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__emoji-tabs`,
            sys_pn: "emoji-tabs",
            kids: [tab("search", "ph-magnifying-glass"), ...categories.map((c) => tab(c.id, c.ico))],
          }),
          Skeletons.Entry({
            className: `${pfx}__emoji-search`,
            sys_pn: "emoji-search",
            placeholder: LOCALE.NOTE_SEARCH_EMOJI,
          }),
          Skeletons.Note({
            className: `${pfx}__emoji-section`,
            sys_pn: "emoji-section",
            content: LOCALE.NOTE_FREQUENTLY_USED,
          }),
          Skeletons.Element({
            className: `${pfx}__emoji-grid`,
            sys_pn: "emoji-grid",
            partHandler: ui,
          }),
        ],
      }),
    ],
  });
};
