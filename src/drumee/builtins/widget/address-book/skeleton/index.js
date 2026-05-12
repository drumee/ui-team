module.exports = function (ui) {
  const fig = ui.fig.family;

  const sidebar = Skeletons.Box.Y({
    className: `${fig}__sidebar`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__sidebar-header`,
        kids: [
          Skeletons.Note({
            className: `${fig}__sidebar-title`,
            content: LOCALE.CONTACTS,
          }),
          Skeletons.Box.X({
            className: `${fig}__header-actions`,
            kids: [
              Skeletons.Box.X({
                className: `${fig}__icon-btn`,
                bubble: 0,
                service: "open-import",
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({
                    className: `${fig}__icon-btn-label`,
                    content: LOCALE.IMPORT || "Import",
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${fig}__add-btn`,
                bubble: 0,
                service: "open-invite",
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({
                    className: `${fig}__add-label`,
                    content: `+ ${LOCALE.ADD_CONTACTS}`,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__search`,
        kids: [
          Skeletons.Entry({
            className: `${fig}__search-input`,
            placeholder: LOCALE.SEARCH,
            value: ui.getSearch(),
            require: "any",
            mode: "commit",
            interactive: 1,
            bubble: 0,
            service: "search-input",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__sidebar-body`,
        sys_pn: "ab-list",
      }),
    ],
  });

  const detail = Skeletons.Box.Y({
    className: `${fig}__detail-area`,
    sys_pn: "ab-detail",
    kids: [require("./empty-detail")(ui)],
  });

  return Skeletons.Box.X({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      sidebar,
      detail,
      Skeletons.Button.Svg({
        ico: "account_cross",
        className: `${fig}__close-btn`,
        service: "close-panel",
        uiHandler: [ui],
      }),
      Skeletons.Wrapper.Y({
        className: `${fig}__modal-wrapper`,
        name: "invite-modal",
        partHandler: ui,
      }),
      Skeletons.FileSelector({
        sys_pn: "ab-fileselector",
        accept: ".csv,.vcf,.vcard",
        partHandler: ui,
        uiHandler: [ui],
        bubble: 0,
      }),
      Skeletons.Box.Y({
        className: `${fig}__toast-slot`,
        sys_pn: "ab-toast",
      }),
    ],
  });
};
