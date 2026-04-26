const { entry, button } = require("../../../../skeleton/toolkit");

function header(ui) {
  const pfx = `${ui.fig.family}__header`;
  return Skeletons.Box.X({
    className: `${pfx}-row`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-title`,
            content: LOCALE.ACCOUNT_SETTINGS || "Account settings",
          }),
          Skeletons.Note({
            className: `${pfx}-subtitle`,
            content:
              LOCALE.ACCOUNT_SETTINGS_SUBTITLE ||
              "Manage your account preferences, notifications, and connected apps.",
          }),
        ],
      }),
      button(ui, {
        label: LOCALE.SAVE_PROFILE || "Save Profile",
        className: `${pfx}-save`,
        priority: "primary",
        service: "save-profile",
      }),
    ],
  });
}

function cardHeading(ui, { title, subtitle }) {
  const pfx = `${ui.fig.family}__card`;
  return Skeletons.Box.Y({
    className: `${pfx}-heading`,
    kids: [
      Skeletons.Note({ className: `${pfx}-title`, content: title }),
      subtitle
        ? Skeletons.Note({ className: `${pfx}-subtitle`, content: subtitle })
        : null,
    ].filter(Boolean),
  });
}

function generalProfileCard(ui) {
  const pfx = `${ui.fig.family}__profile`;
  const profile = Visitor.profile() || {};
  const avatar = ui.mget(_a.avatar) || profile.avatar || "default";
  const fullname = Visitor.fullname() || "";

  const avatarBlock = Skeletons.Box.Y({
    className: `${pfx}-avatar-block`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-avatar-frame`,
        service: "edit-avatar",
        uiHandler: [ui],
        kids: [
          Skeletons.Avatar(avatar, `${pfx}-avatar`, fullname),
          Skeletons.Button.Svg({
            ico: "editbox_pencil",
            className: `${pfx}-avatar-edit`,
            service: "edit-avatar",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}-avatar-label`,
        content: LOCALE.EDIT_AVATAR || "EDIT AVATAR",
      }),
      { kind: "avatar", sys_pn: "avatar-widget", className: `${pfx}-avatar-input` },
    ],
  });

  const fields = Skeletons.Box.Y({
    className: `${pfx}-fields`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-fields-row`,
        kids: [
          entry(ui, {
            label: LOCALE.DISPLAY_NAME || "Display Name",
            name: "display_name",
            value: profile.firstname || "",
          }),
          entry(ui, {
            label: LOCALE.USERNAME || "Username",
            name: "username",
            value: profile.username || "",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-bio`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-bio-label`,
            content: LOCALE.BIO || "Bio",
          }),
          Skeletons.Textarea({
            className: `${pfx}-bio-input`,
            name: "bio",
            formItem: "bio",
            value: profile.bio || "",
            rows: 3,
            mode: _a.commit,
            ignoreEnter: true,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, {
        title: LOCALE.GENERAL_PROFILE || "General Profile",
        subtitle:
          LOCALE.GENERAL_PROFILE_SUBTITLE ||
          "Manage your public identity and profile visuals.",
      }),
      Skeletons.Box.X({
        className: `${pfx}-body`,
        kids: [avatarBlock, fields],
      }),
    ],
  });
}

function innerItem(ui, opt) {
  const pfx = `${ui.fig.family}__inner`;
  const { ico, title, description, trailing, className = "" } = opt;
  const left = Skeletons.Box.X({
    className: `${pfx}-left`,
    kids: [
      ico
        ? Skeletons.Button.Svg({ ico, className: `${pfx}-ico` })
        : null,
      Skeletons.Box.Y({
        className: `${pfx}-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}-title`, content: title }),
          description
            ? Skeletons.Note({ className: `${pfx}-description`, content: description })
            : null,
        ].filter(Boolean),
      }),
    ].filter(Boolean),
  });

  return Skeletons.Box.X({
    className: `${pfx} ${className}`,
    kids: [left, trailing].filter(Boolean),
  });
}

function toggle(ui, opt) {
  const pfx = `${ui.fig.family}__toggle`;
  const { service, sys_pn, state = 0 } = opt;
  return Skeletons.Box.X({
    className: pfx,
    sys_pn,
    state,
    radiotoggle: 1,
    service,
    uiHandler: [ui],
    kids: [Skeletons.Box.X({ className: `${pfx}-knob` })],
  });
}

function preferencesCard(ui) {
  const pfx = `${ui.fig.family}__preferences`;
  const settings = Visitor.settings() || {};
  const emailOn = settings.email_notifications ? 1 : 0;
  const mfaOn = parseInt(Visitor.profile().mfa) ? 1 : 0;

  const emailRow = innerItem(ui, {
    title: LOCALE.EMAIL_NOTIFICATIONS || "Email notifications",
    description:
      LOCALE.EMAIL_NOTIFICATIONS_DESC ||
      "Get notified about activity in your workspaces",
    trailing: toggle(ui, {
      sys_pn: "toggle-email",
      service: "toggle-email-notifications",
      state: emailOn,
    }),
  });

  const mfaRow = innerItem(ui, {
    title: LOCALE.TWO_FACTOR_AUTH || "Two-factor authentication",
    description:
      LOCALE.TWO_FACTOR_AUTH_DESC ||
      "Add an extra layer of security to your account",
    trailing: toggle(ui, {
      sys_pn: "toggle-mfa",
      service: "toggle-two-factor",
      state: mfaOn,
    }),
  });

  const appsRow = innerItem(ui, {
    title: LOCALE.CONNECTED_APPS || "Connected apps",
    description: LOCALE.CONNECTED_APPS_DESC || "Manage third-party app access",
    trailing: button(ui, {
      label: LOCALE.MANAGE || "Manage",
      className: `${pfx}-manage`,
      priority: "ghost",
      service: "manage-connected-apps",
    }),
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, { title: LOCALE.PREFERENCES || "Preferences" }),
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        kids: [emailRow, mfaRow, appsRow],
      }),
    ],
  });
}

function accountCredentialsCard(ui) {
  const pfx = `${ui.fig.family}__credentials`;
  const profile = Visitor.profile() || {};

  const emailRow = innerItem(ui, {
    ico: "mail",
    title: LOCALE.EMAIL_ADDRESS || "Email Address",
    description: profile.email || "",
    className: `${pfx}-row`,
    trailing: button(ui, {
      label: LOCALE.CHANGE || "Change",
      className: `${pfx}-action`,
      priority: "ghost",
      service: "change-email",
    }),
  });

  const passwordRow = innerItem(ui, {
    ico: "account_padlock",
    title: LOCALE.PASSWORD || "Password",
    description: "•••••••••••••••",
    className: `${pfx}-row`,
    trailing: button(ui, {
      label: LOCALE.EDIT || "Edit",
      className: `${pfx}-action`,
      priority: "ghost",
      service: "edit-password",
    }),
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      cardHeading(ui, {
        title: LOCALE.ACCOUNT_CREDENTIALS || "Account Credentials",
        subtitle:
          LOCALE.ACCOUNT_CREDENTIALS_SUBTITLE ||
          "Sensitive settings to secure your curator environment.",
      }),
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        kids: [emailRow, passwordRow],
      }),
    ],
  });
}

function dangerZoneCard(ui) {
  const pfx = `${ui.fig.family}__danger`;

  const exportRow = innerItem(ui, {
    title: LOCALE.EXPORT_ALL_MY_DATA || "Export all my data",
    description:
      LOCALE.EXPORT_DATA_DESC ||
      "Download all your files, chat history, and workspace data as a .zip archive.",
    className: `${pfx}-row`,
    trailing: button(ui, {
      label: LOCALE.EXPORT_DATA || "Export data",
      ico: "download",
      icoPosition: "left",
      className: `${pfx}-export-btn`,
      priority: "ghost",
      service: "export-data",
    }),
  });

  const deleteRow = innerItem(ui, {
    title: LOCALE.DELETE_MY_ACCOUNT || "Delete my account",
    description:
      LOCALE.DELETE_ACCOUNT_DESC ||
      "Permanently delete your account and all associated data. This cannot be undone.",
    className: `${pfx}-row ${pfx}-row-delete`,
    trailing: button(ui, {
      label: LOCALE.DELETE_ACCOUNT || "Delete account",
      className: `${pfx}-delete-btn`,
      priority: "danger",
      service: "delete-account",
    }),
  });

  const headerRow = Skeletons.Box.X({
    className: `${pfx}-header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-warning`,
        kids: [
          Skeletons.Button.Svg({
            ico: "editbox_triangle",
            className: `${pfx}-warning-ico`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${ui.fig.family}__card-title`,
        content: LOCALE.DANGER_ZONE || "Danger zone",
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__card ${pfx}-card`,
    kids: [
      headerRow,
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        kids: [exportRow, deleteRow],
      }),
    ],
  });
}

function settings_body(ui) {
  const pfx = ui.fig.family;
  return [
    header(ui),
    Skeletons.Box.X({
      className: `${pfx}__row ${pfx}__row-1`,
      kids: [generalProfileCard(ui), preferencesCard(ui)],
    }),
    Skeletons.Box.X({
      className: `${pfx}__row ${pfx}__row-2`,
      kids: [accountCredentialsCard(ui), dangerZoneCard(ui)],
    }),
    Skeletons.Wrapper.Y({
      className: `${pfx}__overlay`,
      sys_pn: "overlay",
    }),
  ];
}

export default settings_body;
