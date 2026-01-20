
const __skl_trash_topbar = function (ui) {
  const figname = "topbar";

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
    className: `${ui.fig.family}-${figname}__container u-jc-sb`,
    sys_pn: "browser-top-bar",
    debug: __filename,
    service: _e.raise,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}-${figname}__title u-ai-center`,
        kids: [Skeletons.Note(LOCALE.ARCHIVES)],
      }),

      Skeletons.Box.X({
        className: `${ui.fig.family}__buttons-wrapper`,
        kids: [
          // toggleButton,
          Skeletons.Box.X({
            className: `${ui.fig.family}-${figname}__title purge`,
            kids: [
              Skeletons.Note({
                content: LOCALE.PURGE,
                className: "purge",
                service: "empty-bin",
                uiHandler: ui,
              }),
            ],
          })
        ],
      }),
      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });

  return a;
};
module.exports = __skl_trash_topbar;
