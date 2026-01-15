const __skl_bigchat_common_topBar = function (_ui_) {
  const mode = _ui_._view;
  const figFamily = `${_ui_.fig.family}-topbar`;
  const figGroup = `${_ui_.fig.group}-topbar`;

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
              require("./logo").default(_ui_, "c1"),
              Skeletons.Box.Y({
                className: `${figFamily}__name-wrapper`,
                kids: [
                  Skeletons.Note({
                    sys_pn: "ref-window-name",
                    uiHandler: _ui_,
                    partHandler: _ui_,
                    className: "title",
                    content: LOCALE.CHAT,
                  }),
                  Skeletons.Box.X({
                    className: `${figFamily}__subtitle-wrapper`,
                    kids: [
                      Skeletons.Note({
                        sys_pn: "ref-window-name",
                        uiHandler: _ui_,
                        partHandler: _ui_,
                        className: `${figFamily}__subtitle-wrapper contacts`,
                        content: "16 contacts",
                      }),
                      Skeletons.Note({
                        sys_pn: "ref-window-name",
                        uiHandler: _ui_,
                        partHandler: _ui_,
                        content: "Last updated: 4:59 pm. Jun 30, 2025",
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
        className: `${figFamily}__buttons-wrapper`,
        kids: [
          !Visitor.isMimicActiveUser()
            ? Skeletons.Box.X({
                className: `${figFamily}__menu ${figGroup}__menu topbar-menu`,
                kids: [
                  Skeletons.Box.X({
                    className: `${figFamily}__trigger-wrapper`,
                    kids: [
                      Skeletons.Button.Svg({
                        ico: "drumee-contact_add",
                        className: `${figFamily}__icon ${figFamily}__trigger dropdown-toggle-icon contact_add`,
                        service: "open-contact",
                        type: _a.invite,
                        uiHandler: _ui_,
                      }),
                      Skeletons.Note({
                        service: "open-contact",
                        type: _a.invite,
                        uiHandler: _ui_,
                        content: "Add new contacts",
                      }),
                    ],
                  }),
                ],
              })
            : undefined,

          // require("./search")(_ui_),
        ],
      }),

      require("window/skeleton/topbar/control")(_ui_, "c"),
    ],
  });

  return a;
};

module.exports = __skl_bigchat_common_topBar;
