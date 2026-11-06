/**
 * Over-limit read-only notice, shown INSIDE the folder window (window-folder__main)
 * instead of Butler's full-viewport modal. libs/over-limit.notifyBlocked routes
 * here through window.showReadOnlyNotice; Butler stays the fallback when no
 * folder window is on screen.
 *
 * Two pieces:
 *   slot(ui)          the empty host, built with the window (both shapes) so
 *                     showing the notice never mutates the window's collection.
 *   card(ui, message) what gets fed into it: Drumee logo + close X, then the
 *                     message — the same header Butler's notice wears.
 *
 * Visibility is a positive stamp (`data-open="1"` on the host, written by the
 * window), never :empty — a Skeletons.Box is never CSS-empty.
 */
function slot(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__readonly-notice`,
    sys_pn: "readonly-notice",
    partHandler: [ui],
  });
}

function card(ui, message) {
  const fig = `${ui.fig.family}__readonly-notice`;
  return Skeletons.Box.Y({
    className: `${fig}-card`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${fig}-topbar`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}-logo`,
            kids: [
              Skeletons.Button.Svg({
                ico: "logo-upload",
                className: `${fig}-logo-ico`,
              }),
              Skeletons.Note({
                content: "drumee",
                className: `${fig}-logo-text`,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${fig}-close`,
            service: "readonly-notice-close",
            uiHandler: [ui],
            bubble: 0,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Image.Svg({
                ico: "cross",
                className: `${fig}-close-ico`,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${fig}-message`,
        content: message,
      }),
    ],
  });
}

module.exports = { slot, card };
