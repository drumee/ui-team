const __skl_window_note_topbar = function (ui, icon) {
  let filename = ui.mget(_a.filename);
  const pfx = ui.fig.group;
  const figname = "topbar";
  let state = ui.mget("pin") || 0;
  let visibility = 0;
  if (ui.mget(_a.nid)) visibility = 1;
  let save = "";
  const cnEditor = `editor`;


  return Skeletons.Box.X({
    className: `${pfx}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-${figname}__title`,
        service: _e.raise,
        kids: [
          Skeletons.Note({
            sys_pn: "ref-window-name",
            uiHandler: ui,
            partHandler: ui,
            className: _a.name,
            content: filename,
            active: 0,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}-topbar__buttons`,
        kids: [
          Skeletons.Box.X({
            debug: __filename,
            className: `${ui.fig.family}__acknowledgement-container`,
            kidsOpt: {
              radio: _a.on,
              uiHandler: ui,
            },
            sys_pn: "acknowledgement-container",
            kids: [
              Skeletons.Note({
                className: `${ui.fig.family}__acknowledgement`,
                sys_pn: "acknowledgement",
              }),
            ],
          }),
          ui.canUpload()
            ? Skeletons.Button.Svg({
                ico: "floppy",
                service: "save",
                uiHandler: ui,
                className: `${cnEditor}-topbar__icon save`,
                tooltips: LOCALE.SAVE_CHANGES,
                haptic: 1000,
              })
            : null,
          require("./menu")(ui),
          Skeletons.Button.Svg({
            ico: "drumee-tools_pin",
            service: "pin-on",
            state,
            sys_pn: "pin",
            className: `${cnEditor}-topbar__icon pin`,
            tooltips: LOCALE.PIN_ON_DESK,
            haptic: 1000,
            dataset: {
              visibility,
            },
          }),
          require("window/skeleton/topbar/control")(ui, "c"),
        ],
      }),
    ],
  });
};
module.exports = __skl_window_note_topbar;
