const {permissionMenu} = require("../../../skeleton/toolkit");
function members(ui) {
  const list = Skeletons.List.Smart({
    flow: _a.vertical,
    sys_pn: "members-list",
    className: `${ui.fig.family}__list`,
    debug: __filename,
    itemsOpt: {
      kind: "settings_member",
      service: 'prompt-permission',
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
      uiHandler: [ui],
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

/**
 * Permission management panel skeleton
 * @param {*} ui
 * @returns
 */
module.exports = function (ui) {
  const fig = ui.fig.family;
  const inviteRole = ui._inviteRole || 'admin';

  const header = Skeletons.Box.X({
    className: `${fig}__header`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__header-text`,
        kids: [
          Skeletons.Note({
            className: `${fig}__title`,
            content: LOCALE.WHO_HAS_ACCESS
          }),
          Skeletons.Note({
            className: `${fig}__subtitle`,
            content: LOCALE.MANAGE_FOLDER_PERMISSIONS
          })
        ]
      }),
      Skeletons.Button.Svg({
        ico: 'cross',
        className: `${fig}__close`,
        service: _e.close,
        uiHandler: [ui]
      })
    ]
  });

  const inviteSection = Skeletons.Box.Y({
    className: `${fig}__invite-section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__section-label`,
        content: LOCALE.INVITE_MEMBERS
      }),
      Skeletons.Box.X({
        className: `${fig}__invite-row`,
        kids: [
          Skeletons.Entry({
            className: `${fig}__email-input`,
            placeholder: LOCALE.ENTER_EMAIL,
            require: 'email',
            sys_pn: 'ref-invite-email',
            mode: 'commit',
            service: 'send-invitation',
            uiHandler: [ui]
          }),
          permissionMenu(ui, ui, 'select-invite-role', fig, inviteRole),
        ]
      }),
      Skeletons.Note({
        className: `${fig}__send-btn`,
        content: LOCALE.SEND_INVITATION,
        service: 'send-invitation',
        uiHandler: [ui]
      })
    ]
  });

  const permissionSection = Skeletons.Box.Y({
    className: `${fig}__matrix-section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__section-label`,
        content: LOCALE.PERMISSIONS_MATRIX
      }),
      members(ui)
    ]
  });

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      header,
      Skeletons.Element({ tagName: 'hr', className: `${fig}__divider` }),
      inviteSection,
      permissionSection,
      Skeletons.Wrapper.Y({
        className: `${fig}__role-overlay`,
        sys_pn: 'role-dropdown',
        uiHandler: [ui],
      }),
    ]
  });
};
