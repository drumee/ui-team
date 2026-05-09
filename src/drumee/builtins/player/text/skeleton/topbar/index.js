module.exports = function (ui, icon) {
  let filename;
  if (ui.media) {
    filename = ui.media.mget(_a.filename);
  } else {
    filename = LOCALE.NOTE;
  }
  const pfx = ui.fig.group;
  const figname = "topbar";
  let state = ui.mget("pin") || 0;
  let visibility = 0;
  if (ui.mget(_a.nid)) visibility = 1;
  const cnEditor = `editor`;

  return Skeletons.Box.X({
    className: `${ui.fig.family}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-${figname}__title ${ui.fig.family}-${figname}__title`,
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
          require("./menu")(ui),
          require("window/skeleton/topbar/control")(ui, "c"),
        ],
      }),
    ],
  });
};
