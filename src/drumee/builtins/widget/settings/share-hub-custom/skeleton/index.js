const topbar = (ui) => {
  const figFamily = `${ui.fig.family}-topbar`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${figFamily}__container`,
    sys_pn: _a.topBar,
    kids: [
      Skeletons.Button.Svg({
        ico: "arrow-left",
        className: `${figFamily}__back`,
        service: _a.back,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${figFamily}__title`,
        sys_pn: "window-name",
        content: LOCALE.SHARE || "Share",
        uiHandler: [ui],
      }),
      Skeletons.Button.Svg({
        ico: _a.cross,
        className: `${figFamily}__close`,
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });
};

function emailInput(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__email-input-section`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__email-input-wrapper`,
        kids: [
          {
            kind: 'invitation_search',
            placeholder: LOCALE.ENTER_EMAIL_TO_INVITE || "Enter email to invite Ex: name@gmail.com",
            persistence: _a.always,
            service: 'invitation-item',
            sys_pn: "invitation-search",
            preselect: 0,
            addGuest: 1,
            rows: 3,
            api: {
              service: SERVICE.drumate.my_contacts,
              hub_id: Visitor.id,
            },
            apiAll: {
              service: SERVICE.drumate.my_contacts,
              value: "%",
              hub_id: Visitor.id
            },
            uiHandler: [ui],
          }
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__email-actions`,
        kids: [
          Skeletons.Button.Label({
            className: `${fig}__my-contact-btn`,
            label: LOCALE.MY_CONTACT || "My Contact",
            ico: "raw_plus",
            service: "open-my-contact",
            uiHandler: [ui],
          }),
          Skeletons.Button.Label({
            className: `${fig}__invite-btn`,
            label: LOCALE.INVITE || "Invite",
            ico: null,
            service: "invite-people",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

function peopleList(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__people-section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__people-title`,
        content: LOCALE.PEOPLE_WITH_ACCESS || "People with access",
      }),
      Skeletons.Box.Y({
        className: `${fig}__people-list`,
        sys_pn: "people-list",
        kids: [
          // Owner item
          Skeletons.Box.X({
            className: `${fig}__people-item`,
            kids: [
              Skeletons.Button.Svg({
                ico: "user",
                className: `${fig}__people-avatar`,
              }),
              Skeletons.Note({
                className: `${fig}__people-name`,
                content: "Henry Jr",
              }),
              Skeletons.Note({
                className: `${fig}__people-role`,
                content: LOCALE.OWNER || "Owner",
              }),
            ],
          }),
          // View all invited members
          Skeletons.Box.X({
            className: `${fig}__people-item ${fig}__people-item--view-all`,
            service: "view-all-members",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "user",
                className: `${fig}__people-avatar ${fig}__people-avatar--gray`,
              }),
              Skeletons.Note({
                className: `${fig}__people-name`,
                content: LOCALE.VIEW_ALL_INVITED_MEMBERS || "View all invited members (12)",
              }),
              Skeletons.Button.Svg({
                ico: "arrow-right",
                className: `${fig}__people-arrow`,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function footer(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__footer`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__footer-action`,
        service: "copy-link",
        uiHandler: [ui],
        kids: [
          Skeletons.Button.Svg({
            ico: "copy_link",
            className: `${fig}__footer-icon`,
          }),
          Skeletons.Note({
            className: `${fig}__footer-label`,
            content: LOCALE.COPY_LINK || "Copy Link",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__footer-action`,
        service: "show-qr-code",
        uiHandler: [ui],
        kids: [
          Skeletons.Button.Svg({
            ico: "qrcode",
            className: `${fig}__footer-icon`,
          }),
          Skeletons.Note({
            className: `${fig}__footer-label`,
            content: LOCALE.SHOW_QR_CODE || "Show QR code",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__footer-action`,
        service: "settings",
        uiHandler: [ui],
        kids: [
          Skeletons.Button.Svg({
            ico: "settings",
            className: `${fig}__footer-icon`,
          }),
          Skeletons.Note({
            className: `${fig}__footer-label`,
            content: LOCALE.SETTING || "Setting",
          }),
        ],
      }),
    ],
  });
}

function content(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__content`,
    kids: [
      emailInput(ui),
      peopleList(ui),
    ],
  });
}

export default function (ui) {
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__wrapper`,
    kids: [
      topbar(ui),
      content(ui),
      footer(ui),
    ],
  });
}
