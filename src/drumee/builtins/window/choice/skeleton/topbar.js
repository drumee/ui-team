module.exports = function (ui) {
  const fig = ui.fig.family; // window-choice
  // Based on window/info: brand logo on the left, an X close on the right.
  // Replaces the old header.js, which prefixed its classes with
  // `${ui.fig.group}-confirm` and so borrowed window/confirm's skin while
  // choice's own &-topbar / &__title rules sat dead.
  //
  // The X carries `_e.close`, which resolves to the same "close" string as
  // `_a.close` — the signal ask() already listens for to resolve {choice: 0}.
  return Skeletons.Box.X({
    className: `${fig}__topbar`,
    sys_pn: "topbar",
    debug: __filename,
    service: _e.raise,
    kids: [
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
      Skeletons.Box.X({
        className: `${fig}__close`,
        service: _e.close,
        uiHandler: ui,
        bubble: 0,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${fig}__close-ico`,
          }),
        ],
      }),
    ],
  });
};
