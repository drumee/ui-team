/**
 * Notification-dialog header (based on builtins/window/confirm): brand logo on
 * the left, an X close on the right. Shared by the butler confirm + message
 * dialogs so they match the window/confirm look.
 * @param {Object} ui
 * @param {String} [closeSignal]  service the X sends to Butler.onUiEvent (defaults to _e.close)
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
        // `service`, not `signal`: a signal is delivered as
        // ui.triggerMethod(name) — i.e. an `onClose`/`onCancel` METHOD that
        // Butler does not have — so the X did nothing on a notice, and on a
        // confirm fired the `cancel` event without ever closing the dialog.
        // As a service it lands in Butler.onUiEvent exactly like the
        // Close/Cancel button beside it (close, one-shot callback, sleep).
        service: closeSignal || _e.close,
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
