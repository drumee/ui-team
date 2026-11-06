// ===========================================================
//  Notion-style Note — "Change cover" popup (Figma 1406:64831).
// ===========================================================

/**
 * Upload an image, or paste one with Ctrl/Cmd + V while this is open (the
 * paste listener lives in ../page while the popup is up).
 *
 * @param {View} ui the editor window
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  const hasCover = !!ui.page().cover;
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__popup ${pfx}__cover-popup`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__popup-title`,
        content: hasCover ? LOCALE.NOTE_CHANGE_COVER : LOCALE.NOTE_ADD_COVER,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__cover-upload`,
        service: "pick-cover-file",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Button.Svg({ ico: "ph-cloud-arrow-up", className: `${pfx}__cover-upload-icon` }),
          Skeletons.Note({ className: `${pfx}__cover-upload-label`, content: LOCALE.UPLOAD_FILE }),
        ],
      }),
      // The file input itself is not here: it stays mounted in the cover row
      // (./index) so "Add cover" can open it without this popup.
      Skeletons.Box.Y({
        className: `${pfx}__cover-hints`,
        kids: [
          Skeletons.Note({ className: `${pfx}__cover-hint`, content: LOCALE.NOTE_COVER_PASTE_HINT }),
          Skeletons.Note({ className: `${pfx}__cover-hint strong`, content: LOCALE.NOTE_COVER_SIZE_HINT }),
        ],
      }),
    ],
  });
};
