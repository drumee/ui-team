const __skl_addressbook_common_topBar = function (ui) {
  const mode = ui._view;
  const figFamily = `${ui.fig.family}-topbar`;
  const figGroup = `${ui.fig.group}-topbar`;
  const cnWidowButton = "window-button";
  const cnWidowTopbarTitle = "window-topbar-title";

  const notifier = {
    kind: "addressbook_widget_notification",
    service: "invite-notifications",
    uiHanlder: ui,
  };

  // Left section: icon, name, last update
  const leftSection = Skeletons.Box.X({
    className: `${figFamily}__left ${figGroup}__left`,
    kids: [
      Skeletons.Button.Svg({
        ico: "account_contacts",
        className: `${figFamily}__icon ${figGroup}__icon`,
      }),

      Skeletons.Box.Y({
        className: `${figFamily}__info ${figGroup}__info`,
        kids: [
          Skeletons.Note({
            sys_pn: "ref-window-name",
            uiHandler: ui,
            partHandler: ui,
            className: `${figFamily}__title ${figGroup}__title`,
            content: LOCALE.MY_CONTACTS || "My contacts",
          }),
          Skeletons.Note({
            sys_pn: "ref-last-update",
            uiHandler: ui,
            partHandler: ui,
            className: `${figFamily}__last-update ${figGroup}__last-update`,
            content: ui.mget("lastUpdate") || "",
          }),
        ],
      }),
    ],
  });

  // Right section: add, import, delete buttons
  const addButton = Skeletons.Button.Label({
    className: `${figFamily}__add-btn ${figGroup}__add-btn`,
    label: LOCALE.ADD_NEW_CONTACTS || "Add new contacts",
    ico: "add",
    service: "add-contact",
    uiHandler: ui,
  });

  const rightSection = Skeletons.Box.X({
    className: `${figFamily}__right ${figGroup}__right`,
    kids: [addButton],
  });

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
                content: LOCALE.CONTACT_MANAGER,
              }),
              // Skeletons.Box.Y({
              //   className: `${figFamily}__name-wrapper`,
              //   kids: [
              //     Skeletons.Note({
              //       sys_pn: "ref-window-name",
              //       uiHandler: ui,
              //       partHandler: ui,
              //       className: "title",
              //       content: LOCALE.CONTACT_MANAGER,
              //     }),
              //     Skeletons.Box.X({
              //       className: `${figFamily}__subtitle-wrapper`,
              //       kids: [
              //         Skeletons.Note({
              //           sys_pn: "contact-count",
              //           uiHandler: ui,
              //           partHandler: ui,
              //           className: `${figFamily}__subtitle-wrapper contacts`,
              //           content: "0 contacts",
              //         }),
              //         Skeletons.Note({
              //           sys_pn: "ref-window-name",
              //           uiHandler: ui,
              //           partHandler: ui,
              //           content: "Last updated: 4:59 pm. Jun 30, 2025",
              //         }),
              //       ],
              //     }),
              //   ],
              // }),
            ],
          }),
          Skeletons.Box.X({
            className: `${cnWidowButton}__buttons-wrapper`,
            kids: [
              !Visitor.isMimicActiveUser()
                ? Skeletons.Box.X({
                    className: `${figFamily}__menu ${figGroup}__menu topbar-menu`,
                    kids: [require("./menu")(ui)],
                  })
                : undefined,

              // require("./search")(ui),

              Skeletons.FileSelector({
                partHandler: ui,
              }),

              Skeletons.Box.X({
                className: "notifier",
                kids: [notifier],
              }),

              require("window/skeleton/topbar/control")(ui, "c"),
            ],
          }),
        ],
      }),
    ],
  });

  return a;
};

module.exports = __skl_addressbook_common_topBar;
