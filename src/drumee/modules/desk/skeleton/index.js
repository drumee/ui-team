const _desk_main = function (ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    debug: __filename,
    sys_pn: "main",
    dataset: {
      wallpaper: ui._wallpaper,
    },
    kids: [
      // Modal / popup overlay (above everything)
      Skeletons.Wrapper.Y({
        sys_pn: "wrapper-popup",
        className: `${ui.fig.family}__modal-container`,
        flow: _a.none,
        wrapper: 1,
        uiHandler: ui,
      }),

      Skeletons.Box.X({
        className: `${ui.fig.family}__body`,
        kids: [
          require("./sidebar")(ui),
          Skeletons.Box.Y({
            sys_pn: "desk-body",
            className: `${ui.fig.family}__right-side`,
            kids: [
              Skeletons.Box.Y({
                sys_pn: "top-bar",
                className: `${ui.fig.family}__topbar`,
                kids: [require("./topbar")(ui)],
              }),

              Skeletons.Box.X({
                sys_pn: "desk-wrapper",
                className: `${ui.fig.family}__wm-container`,
                kids: [
                  {
                    kind: "window_manager",
                    sys_pn: "desk-content",
                  },
                ],
              }),
            ],
          }),
        ],
      }),

      // Tooltip layer
      Skeletons.Box.Y({
        className: "desk__tooltip",
        sys_pn: "desk-tooltip",
        wrapper: 1,
      }),
    ],
  });
};

module.exports = _desk_main;
