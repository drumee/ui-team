// =====================================================================
// Empty Trash confirmation.
//
// Deliberately NOT routed through window_confirm. That widget renders its own
// body from the `title` / `message` model fields, and in this panel's flow the
// card was arriving collapsed — narrow enough to show only its button row, with
// the body clipped away. Four attempts to correct it from the outside (the
// card's own skin, then the wrapper-modal host) each fixed a mechanism that
// turned out not to be the cause, because the failure lives somewhere in that
// widget's own layout that could not be reproduced from its markup.
//
// This skeleton renders the content directly, so there is no model→body path to
// lose it, and no window-manager instance to stamp inline left/top on it. It is
// fed straight into Wm.__wrapperModal, which is already a full-inset centring
// flex container: the dialog carries NO position of its own, so the host simply
// centres it. That is the whole reason this cannot land off-centre.
//
// Services match the panel's existing handlers (confirm-empty-bin /
// cancel-empty-bin), so the purge itself is unchanged.
// =====================================================================
module.exports = function (ui) {
  const pfx = ui.fig.family;

  // Q_DELETE_ALL_FILES is authored as two <p> blocks and stacks into two lines.
  // Strip the markup and collapse the whitespace so it reads as one sentence,
  // wrapping only when the card is genuinely too narrow. The string stays
  // localised — only its tags are removed.
  const message = `${LOCALE.Q_DELETE_ALL_FILES || ""}`
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return Skeletons.Box.Y({
    className: `${pfx}__purge`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__purge-head`,
        kids: [
          // Same logo the standard confirm puts in its header
          // (window/confirm/skeleton/header.js): the mark plus the wordmark,
          // not the mark alone — Button.Svg for the glyph and a Note carrying
          // the text, so this prompt reads as the same family of dialog.
          Skeletons.Box.X({
            className: `${pfx}__purge-logo`,
            kids: [
              Skeletons.Button.Svg({
                className: `${pfx}__purge-logo-ico`,
                ico: "logo-upload",
                active: 0,
              }),
              Skeletons.Note({
                className: `${pfx}__purge-logo-text`,
                text: "drumee",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__purge-close`,
            service: "cancel-empty-bin",
            uiHandler: [ui],
            // active:0 on the glyph so a tap on the icon bubbles to this box,
            // which is what carries the service.
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Image.Svg({
                ico: "cross",
                className: `${pfx}__purge-close-ico`,
              }),
            ],
          }),
        ],
      }),

      Skeletons.Note({
        className: `${pfx}__purge-message`,
        content: message,
      }),

      Skeletons.Box.X({
        className: `${pfx}__purge-actions`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__purge-btn ${pfx}__purge-btn--cancel`,
            content: LOCALE.CANCEL,
            service: "cancel-empty-bin",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__purge-btn ${pfx}__purge-btn--danger`,
            content: LOCALE.DELETE,
            service: "confirm-empty-bin",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
