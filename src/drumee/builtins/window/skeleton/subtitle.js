module.exports = function (ui) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__subtitle-wrapper`,
    sys_pn: "folder-summary",
    partHandler: [ui],
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__subtitle-wrapper items`,
        sys_pn: "items-count",
      }),
      Skeletons.Note({
        sys_pn: "last-update",
      }),
    ],
  });
};
