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
          // Inserting on demand. BlockNote's block menu only opens on "/",
          // which leaves someone who has never used an editor like this with
          // nothing to click. This raises a rail of the same blocks in the
          // margin, and remembers the choice.
          //
          // The button SHOWS AND HIDES A PANEL, so it says so: a sidebar
          // glyph, and a label about the panel rather than about one thing
          // inside it. It has now been wrong twice — three dots ("more
          // options") next to "Insert block", then a plus, which promises an
          // insert and delivers a panel (Duy, 2026-09-18). The icon, the
          // label and the action have to agree.
          Skeletons.Button.Svg({
            ico: "ph-sidebar-simple",
            service: "toggle-rail",
            sys_pn: "ref-rail-toggle",
            className: `${pfx}__icon rail-toggle`,
            tooltips: LOCALE.NOTE_TOOLBAR,
            uiHandler: [ui],
          }),
          Skeletons.Button.Svg({
            ico: "floppy",
            service: _e.save,
            className: `${pfx}__icon save`,
            tooltips: LOCALE.SAVE,
            haptic: 1000,
            uiHandler: [ui],
          }),
        ],
      }),

      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });
};
