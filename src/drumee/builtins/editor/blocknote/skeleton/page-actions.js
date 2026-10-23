// ===========================================================
//  Notion-style Note — "Add icon · Add cover · Add comment".
// ===========================================================

/**
 * The row above the title (Figma 1406:25557). Each button is offered only
 * while there is something to add: once a note has its icon, cover and
 * comment bar, the row is empty and takes no space.
 *
 * @param {View} ui the editor window
 * @param {{icon: Boolean, cover: Boolean, comment: Boolean}} offer
 */
module.exports = function (ui, offer) {
  const pfx = ui.fig.family;
  const button = (service, ico, content) =>
    Skeletons.Box.X({
      className: `${pfx}__page-action`,
      service,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Button.Svg({ ico, className: `${pfx}__page-action-icon` }),
        Skeletons.Note({ className: `${pfx}__page-action-label`, content }),
      ],
    });

  const kids = [];
  if (offer.icon) kids.push(button("add-icon", "ph-smiley", LOCALE.NOTE_ADD_ICON));
  if (offer.cover) kids.push(button("add-cover", "ph-image", LOCALE.NOTE_ADD_COVER));
  if (offer.comment) kids.push(button("add-comment", "ph-chat-text", LOCALE.NOTE_ADD_COMMENT));

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__page-actions-row`,
    kids,
  });
};
