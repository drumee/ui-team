// ===========================================================
//  Notion-style Note — the INSERT rail.
// ===========================================================

/**
 * A vertical rail of things you can put into the page, living in the empty
 * margin beside the 816px column.
 *
 * WHY INSERT AND NOT FORMATTING. Typing "/" opens an INSERT menu, so "you can
 * only get at this by typing /" is a discoverability problem about inserting,
 * and this rail is the visible answer to it. Formatting is a different job: it
 * acts on a SELECTION, and a control 500px away from the selection means the
 * mouse travels the width of the page for every bold. That one stays on
 * BlockNote's own pop-up, which appears at the selection and needs no teaching
 * — selecting text is already a gesture people make.
 *
 * WHY THESE KEYS. Each row names a key from BlockNote's own default slash-menu
 * items, and the click runs that item's `onItemClick`. Nothing here builds a
 * block by hand: a table made from a literal would have to repeat BlockNote's
 * default shape (2 rows of 3 cells) and would drift from it on the next
 * upgrade. See blocknote_state.applyBlock.
 *
 * @param {*} ui the editor window
 */
module.exports = function (ui) {
  const pfx = `${ui.fig.family}-rail`;

  /** [slash-menu key, icon, label] — grouped, with dividers between groups */
  const groups = [
    [
      ["paragraph", "ph-text-t", LOCALE.NOTE_BLOCK_TEXT],
      ["heading", "ph-text-h-one", LOCALE.NOTE_BLOCK_H1],
      ["heading_2", "ph-text-h-two", LOCALE.NOTE_BLOCK_H2],
      ["heading_3", "ph-text-h-three", LOCALE.NOTE_BLOCK_H3],
    ],
    [
      ["bullet_list", "ph-list-bullets", LOCALE.NOTE_BLOCK_BULLET],
      ["numbered_list", "ph-list-numbers", LOCALE.NOTE_BLOCK_NUMBERED],
      ["check_list", "ph-check-square", LOCALE.NOTE_BLOCK_CHECK],
    ],
    [
      ["quote", "ph-quotes", LOCALE.NOTE_BLOCK_QUOTE],
      ["code_block", "ph-code", LOCALE.NOTE_BLOCK_CODE],
      ["table", "ph-table", LOCALE.NOTE_BLOCK_TABLE],
      ["divider", "ph-minus", LOCALE.NOTE_BLOCK_DIVIDER],
    ],
  ];

  const kids = [];
  groups.forEach((group, i) => {
    if (i) {
      kids.push(
        Skeletons.Box.X({ className: `${pfx}__separator`, active: 0 })
      );
    }
    group.forEach(([key, ico, label]) => {
      kids.push(
        Skeletons.Button.Svg({
          ico,
          service: "insert-block",
          block: key,
          className: `${pfx}__icon`,
          tooltips: label,
          uiHandler: [ui],
        })
      );
    });
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__container`,
    sys_pn: "insert-rail",
    kids,
  });
};
