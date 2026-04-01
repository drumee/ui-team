const __window_topbar = function (ui, icon) {
  const name = ui.model.get(_a.filename) || "";

  const settings = Skeletons.Button.Svg({
    ico: "editbox_cog",
    uiHandler: ui,
    part: ui,
    sys_pn: "ref-window-icon",
    className: "icon",
    service: "show-settings"
  });

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      // require('./breadcrumbs')(ui),
      require("./action")(ui),
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title`,
        kids: [
          Skeletons.Note({
            sys_pn: "ref-window-name",
            uiHandler: ui,
            partHandler: ui,
            className: "name",
            content: name
          }),
          settings
        ]
      }),
      Skeletons.Wrapper.Y({
        className: `${ui.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: ui,
        partHandler: ui
      }),

      require('./control')(ui)
    ]
  });
  return a;
};
module.exports = __window_topbar;
