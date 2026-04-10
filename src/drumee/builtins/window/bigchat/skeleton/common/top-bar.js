const __skl_bigchat_common_topBar = function (ui) {
  const mode = ui._view;
  const figFamily = `${ui.fig.family}-topbar`;
  const figGroup = `${ui.fig.group}-topbar`;
  const cnWidowMenuBtn = "window-menu";
  const cnWidowTopbarActions = "window-topbar-actions";
  const cnWidowTopbarTitle = "window-topbar-title";

  const a = Skeletons.Box.X({
    className: `${figFamily}__container ${figGroup}__container`,
    sys_pn: _a.topBar,
    service: _e.raise,
    dataset: {
      view: mode,
    },
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${figGroup}__title`,
        kids: [
          Skeletons.Box.X({
            className: `${cnWidowTopbarTitle}__wrapper`,
            kids: [
              require("./logo").default(ui, "c1"),
              Skeletons.Note({
                sys_pn: "ref-window-name",
                uiHandler: ui,
                partHandler: ui,
                className: "name",
                content: LOCALE.CHAT,
              }),
              // Skeletons.Box.Y({
              //   className: `${figFamily}__name-wrapper`,
              //   kids: [
              //     Skeletons.Note({
              //       sys_pn: "ref-window-name",
              //       uiHandler: ui,
              //       partHandler: ui,
              //       className: "title",
              //       content: LOCALE.CHAT,
              //     }),
              //     Skeletons.Box.X({
              //       className: `${figFamily}__subtitle-wrapper`,
              //       kids: [
              //         Skeletons.Note({
              //           sys_pn: "contact-count",
              //           uiHandler: ui,
              //           partHandler: ui,
              //           className: `${figFamily}__subtitle-wrapper contacts`,
              //           content: "",
              //         }),
              //         Skeletons.Note({
              //           sys_pn: "last-updated",
              //           uiHandler: ui,
              //           partHandler: ui,
              //           content: "",
              //         }),
              //       ],
              //     }),
              //   ],
              // }),
            ],
          }),
          Skeletons.Box.X({
            className: `${cnWidowTopbarActions}__buttons-wrapper`,
            kids: [
              !Visitor.isMimicActiveUser()
                ? Skeletons.Button.Label({
                    className: `${cnWidowTopbarActions}__label-button`,
                    label: "Add new contacts",
                    ico: "drumee-contact_add",
                    service: "open-contact",
                    uiHandler: ui,
                  })
                : undefined,

              // require("./search")(ui),
              require("window/skeleton/topbar/control")(ui, "c"),
            ],
          }),
        ],
      }),
    ],
  });

  return a;
};

module.exports = __skl_bigchat_common_topBar;
