/**
 * Notification-dialog header (based on builtins/window/confirm): brand logo on
 * the left, an X close on the right. Shared by the butler confirm + message
 * dialogs so they match the window/confirm look.
 * @param {Object} ui
 * @param {String} [closeSignal]  signal fired by the X (defaults to _e.close)
 * @param {Object} [opt]
 * @param {Boolean} [opt.closable=true]  false drops the X, for a dialog whose
 *        button is meant to be the only way out — an X that merely repeats the
 *        button reads as "dismiss without doing the thing", which is wrong when
 *        closing IS the action.
 */
module.exports = function (ui, closeSignal, opt = {}) {
  const fig = ui.fig.family;
  const kids = [
    Skeletons.Box.X({
      className: `${fig}__logo`,
      kids: [
        Skeletons.Button.Svg({
          ico: "logo-upload",
          className: `${fig}__logo-ico`,
        }),
        Skeletons.Note({
          content: "drumee",
          className: `${fig}__logo-text`,
        }),
      ],
    }),
  ];

  if (opt.closable !== false) {
    kids.push(
      Skeletons.Box.X({
        className: `${fig}__close`,
        signal: closeSignal || _e.close,
        uiHandler: [ui],
        bubble: 0,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${fig}__close-ico`,
          }),
        ],
      })
    );
  }

  return Skeletons.Box.X({
    className: `${fig}__topbar`,
    debug: __filename,
    kids,
  });
};
