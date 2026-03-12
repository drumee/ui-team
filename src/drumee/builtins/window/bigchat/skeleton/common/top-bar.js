const __skl_bigchat_common_topBar = function (ui) {
  const mode = ui._view;
  const figFamily = `${ui.fig.family}-topbar`;
  const figGroup = `${ui.fig.group}-topbar`;
  const cnWidowMenuBtn = "window-menu";

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
        className: `${figFamily}__content ${figGroup}__content topbar-content`,
        kids: [
          Skeletons.Box.X({
            className: `${figFamily}__title-wrapper`,
            kids: [
              require("./logo").default(ui, "c1"),
              Skeletons.Box.Y({
                className: `${figFamily}__name-wrapper`,
                kids: [
                  Skeletons.Note({
                    sys_pn: "ref-window-name",
                    uiHandler: ui,
                    partHandler: ui,
                    className: "title",
                    content: LOCALE.CHAT,
                  }),
                  Skeletons.Box.X({
                    className: `${figFamily}__subtitle-wrapper`,
                    kids: [
                      Skeletons.Note({
                        sys_pn: "contact-count",
                        uiHandler: ui,
                        partHandler: ui,
                        className: `${figFamily}__subtitle-wrapper contacts`,
                        content: "",
                      }),
                      Skeletons.Note({
                        sys_pn: "last-updated",
                        uiHandler: ui,
                        partHandler: ui,
                        content: "",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      Skeletons.Box.X({
        kids: [
          !Visitor.isMimicActiveUser()
            ? Skeletons.Box.X({
                kids: [
                  Skeletons.Box.X({
                    className: `${cnWidowMenuBtn}__button-wrapper`,
                    kids: [
                      Skeletons.Button.Svg({
                        ico: "drumee-contact_add",
                        className: `${cnWidowMenuBtn}__icon`,
                        service: "open-contact",
                        type: _a.invite,
                        uiHandler: ui,
                      }),
                      Skeletons.Note({
                        service: "open-contact",
                        type: _a.invite,
                        uiHandler: ui,
                        content: "Add new contacts",
                      }),
                    ],
                  }),
                ],
              })
            : undefined,

          // require("./search")(ui),
        ],
      }),

      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });

  return a;
};

module.exports = __skl_bigchat_common_topBar;
