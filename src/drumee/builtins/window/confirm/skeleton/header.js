const __skl_window_confirm_topbar = function (ui) {
  const pfx = `${ui.fig.group}-confirm`;
  return Skeletons.Box.X({
    className: `${pfx}-topbar__container`,
    sys_pn: "topbar",
    debug: __filename,
    kids: [
      require("./logo")(ui),
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
