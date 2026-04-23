const { button } = require("../../../../../builtins/skeleton/toolkit/buttons");

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
        content: LOCALE.SETTING || "Setting",
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

function members(ui) {
  const list = Skeletons.List.Smart({
    flow: _a.vertical,
    sys_pn: "roll-content",
    className: `${ui.fig.family}__list`,
    debug: __filename,
    itemsOpt: {
      kind: "settings_member",
      uiHandler: [ui],
    },
    spinner: true,
    placeholder: Skeletons.Note(
      "Please, add contact",
      "placeholder--no-contact",
    ),
    api: {
      service: SERVICE.hub.get_members_by_type,
      hub_id: ui.mget(_a.hub_id),
      nid: ui.mget(_a.actual_home_id),
      type: "all",
    },
    vendorOpt: Preset.List.Orange_d,
    inspect: 1,
  });

  const kids = ui.mget(_a.members) || [];
  if (!ui.mget(_a.api) && kids.length) {
    list.kids = kids;
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__content`,
    kids: [list],
  });
}

function content(ui) {
  const fig = `${ui.fig.family}`;
  let admin = "";
  if (ui.canAdmin()) {
    admin = Skeletons.Box.X({
      className: `${fig}__buttons`,
      kids: [
        // Skeletons.Button.Label({
        //   className: `${fig}__save-btn`,
        //   label: "Add members",
        //   icon: "drumee-add-contact",
        //   service: "add-members",
        //   uiHandler: [ui],
        // }),
        button(ui, {
          label: LOCALE.ADD_MEMBERS,
          className: `drumee-buttons--primary`,
          service: "add-members",
        }),
        // Skeletons.Button.Label({
        //   className: `${fig}__save-btn`,
        //   label: "Invite contacts",
        //   icon: "plus",
        //   service: "invite-contacts",
        //   uiHandler: [ui],
        // })
      ],
    });
  }
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__content`,
    kids: [
      require("./who-can-access").default(ui),
      Skeletons.Box.X({
        className: `${fig}__divider`,
      }),
      members(ui),
      // require('./invitation').default(ui),
      Skeletons.Box.X({
        className: `${fig}__divider`,
      }),
      admin,
    ],
  });
}

function footer(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__footer`,
    kids: [
      Skeletons.Button.Label({
        className: `${fig}__cancel-btn`,
        label: LOCALE.CANCEL || "Cancel",
        icon: null,
        service: _e.close,
        uiHandler: [ui],
      }),
      Skeletons.Button.Label({
        className: `${fig}__save-btn`,
        label: LOCALE.APPLY_ALL_SAVE || "Apply all & Save",
        icon: null,
        service: "apply-all-save",
        uiHandler: [ui],
      }),
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
      // footer(ui)
    ],
  });
}
