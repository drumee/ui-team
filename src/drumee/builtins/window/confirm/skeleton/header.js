const __skl_window_confirm_topbar = function (ui) {
  const pfx = `${ui.fig.group}-confirm`;
  return Skeletons.Box.X({
    className: `${pfx}-topbar__container`,
    sys_pn: "topbar",
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-topbar__logo`,
        kids: [
          Skeletons.Button.Svg({
            className: `${pfx}-topbar__logo-ico`,
            ico: "logo-upload",
          }),
          Skeletons.Note({
            className: `${pfx}-topbar__logo-text`,
            text: "drumee",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__close`,
        signal: _e.cancel,
        uiHandler: [ui],
        bubble: 0,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${pfx}__close-ico`,
          }),
        ],
      }),
    ],
  });
};

module.exports = __skl_window_confirm_topbar;
