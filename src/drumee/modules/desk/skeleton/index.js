const _desk_main = function (ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    debug: __filename,
    sys_pn: "main",
    dataset: {
      wallpaper: ui._wallpaper,
    },
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}__body`,
        kids: [
          require("./sidebar")(ui),
          Skeletons.Box.Y({
            sys_pn: "panel",
            className: `${ui.fig.family}__panel-container`,
            kids: [
              // Modal / popup overlay (above everything)
              Skeletons.Box.Y({
                sys_pn: "trash-panel",
                className: `${ui.fig.family}__panel-inner`,
              }),
              Skeletons.Box.Y({
                className: `${ui.fig.family}__panel-inner`,
                kids: [
                  { kind: "panel_activity", sys_pn: "activity-panel", state: 0 }
                ]
              }),
              Skeletons.Box.Y({
                sys_pn: "settings-panel",
                className: `${ui.fig.family}__panel-inner`,
              }),
            ]
          }),
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


    ],
  });
};

module.exports = _desk_main;
