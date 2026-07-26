module.exports = function (ui, icon) {
  let filename = ui.mget(_a.filename);
  if (ui.media) {
    filename = ui.media.mget(_a.filename);
  } else if (!filename) {
    // Was "DD-MMM-YYYY à HH:MM" — a hardcoded French 'à' shown in every
    // language, and MM is the MONTH token (minutes is mm).
    const now = Dayjs().format("DD-MMM-YYYY HH:mm");
    filename = LOCALE.NOTE_ON_DATE_X.format(now);
  }

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${ui.fig.family}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title ${ui.fig.family}-${figname}__title`,
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

      require("./left")(ui),

      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });
  return a;
};
