// ===========================================================
//  Notion-style Note topbar — title, autosave status, save,
//  then the shared window controls.
// ===========================================================
module.exports = function (ui) {
  const figname = "topbar";
  const pfx = `${ui.fig.family}-${figname}`;

  let filename = ui.mget(_a.filename);
  if (!filename && ui.media) filename = ui.media.mget(_a.filename);

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__container ${ui.mget(_a.area) || ""}`.trim(),
    sys_pn: _a.topBar,
    service: _e.raise,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title ${pfx}__title`,
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
          Skeletons.Note({
            sys_pn: "save-status",
            className: `${pfx}__save-status`,
            content: LOCALE.ALL_CHANGES_SAVED,
          }),
        ],
      }),

      Skeletons.Box.X({
        sys_pn: "container-action",
        className: `${pfx}__action`,
        service: _e.raise,
        kids: [
          Skeletons.Button.Svg({
            ico: "floppy",
            service: _e.save,
            className: `${pfx}__icon save`,
            tooltips: LOCALE.SAVE,
            haptic: 1000,
          }),
        ],
      }),

      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });
};
