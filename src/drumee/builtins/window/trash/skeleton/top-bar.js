const __skl_trash_topbar = function (ui) {
  const figname = "topbar";
  const cnWidowTopbarActions = "window-topbar-actions";
  const cnWidowTopbarTitle = "window-topbar-title";

  const toggleButton = Skeletons.Box.X({
    className: `${ui.fig.family}__toggle-button checkbox`,
    kidsOpt: { active: 0 },
    uiHandler: ui,
    state: 0,
    kids: [
      Skeletons.Button.Svg({
        className: `${ui.fig.family}__toggle-button icon`,
        ico: "checkbox",
        state: 0,
        sys_pn: "checkbox",
      }),
      Skeletons.Note({
        className: `${ui.fig.family}__toggle-button note`,
        content: "Automatically empty after 30 days.",
      }),
    ],
  });

  const a = Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__title`,
    sys_pn: "browser-top-bar",
    debug: __filename,
    service: _e.raise,
    kids: [
      Skeletons.Box.X({
        className: `${cnWidowTopbarTitle}__wrapper`,
        kids: [
          Skeletons.Note({
            className: `name`,
            content: LOCALE.ARCHIVES,
          }),
        ],
      }),

      Skeletons.Box.X({
        className: `${cnWidowTopbarActions}__buttons-wrapper`,
        kids: [
          Skeletons.Button.Label({
            className: `${cnWidowTopbarActions}__label-button`,
            label: LOCALE.PURGE,
            ico: "drumee-trash",
            service: "empty-bin",
            uiHandler: ui,
          }),
          require("window/skeleton/topbar/control")(ui, "c"),
        ],
      }),
    ],
  });

  return a;
};
module.exports = __skl_trash_topbar;
