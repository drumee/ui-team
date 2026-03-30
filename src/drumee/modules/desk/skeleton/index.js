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

      // Topbar: logo | breadcrumb | search | invite | bell | avatar
      Skeletons.Box.Y({
        sys_pn: "top-bar",
        className: `${ui.fig.family}__topbar`,
        kids: [require("./topbar")(ui)],
      }),

      // Body: sidebar + window manager side by side
      Skeletons.Box.X({
        sys_pn: "desk-body",
        className: `${ui.fig.family}__body`,
        kids: [
          // Left sidebar: current space | navigation | settings
          Skeletons.Box.Y({
            sys_pn: "sidebar-container",
            className: `${ui.fig.family}__sidebar-container`,
            kids: [require("./sidebar")(ui)],
          }),

          // Main content: window manager (floating windows + file grid)
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
