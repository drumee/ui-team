
const __skl_window_note_topbar = function (ui, icon) {
  const figname = "topbar";
  const downloadIcon = Skeletons.Button.Svg({
    ico: "download",
    sys_pn: "download-button",
    className: `${ui.fig.family}-${figname}__icon`,
    service: _e.download,
    uiHandler: ui,
  });

  const a = Skeletons.Box.X({
    className: `${ui.fig.family}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: "topbar",
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title ${ui.fig.group}__title ${ui.fig.family}-${figname}__title`,
        service: _e.raise,
        kids: [
          Skeletons.Note({
            sys_pn: "ref-window-name",
            uiHandler: ui,
            partHandler: ui,
            className: _a.name,
            content: ui.mget(_a.filename),
            active: 0
          }),
          downloadIcon
        ]
      }),
      Skeletons.Wrapper.Y({
        className: `${ui.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: ui,
        partHandler: ui
      }),

      require('window/skeleton/topbar/control')(ui, 'sc')
    ]
  });
  return a;
};
module.exports = __skl_window_note_topbar;
