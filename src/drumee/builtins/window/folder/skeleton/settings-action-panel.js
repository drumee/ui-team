const actions = [
  { service: _e.download, label: LOCALE.DOWNLOAD, ico: "file-download" },
  { service: "folder-rename", label: LOCALE.RENAME, ico: "apps-pencil-simple" },
  { service: "folder-organize", label: LOCALE.ORGANIZE, ico: "file-organize" },
  { service: "folder-duplicate", label: LOCALE.DUPLICATE, ico: "file-copy" },
  { service: "folder-delete", label: LOCALE.DELETE, ico: "trash-action", destructive: 1 },
];

const roleOptions = [
  { label: LOCALE.ROLE_ADMIN, privilege: _K.privilege.admin },
  { label: LOCALE.ROLE_VIEW_EDIT, privilege: _K.privilege.write },
  { label: LOCALE.ROLE_VIEW_CHAT, privilege: _K.privilege.read },
  { label: LOCALE.VIEW, privilege: _K.privilege.guest || _K.privilege.read },
];

const members = [
  { name: "Alex Vance (You)", initials: "AV", role: roleOptions[0], color: "user" },
  { name: "Jordan Doe", initials: "JD", role: roleOptions[1], color: "primary" },
  { name: "Alex Wang", initials: "AW", role: roleOptions[2], color: "secondary" },
  { name: "Sam Smith", initials: "SS", role: roleOptions[3], color: "dark" },
];

function roleDropdown(pfx, role, service, extra = {}) {
  return Skeletons.Box.X({
    className: `${pfx}-role-select`,
    service,
    uiHandler: extra.uiHandler ? [extra.uiHandler] : undefined,
    dataset: {
      role: role.label,
      privilege: role.privilege,
      ...(extra.dataset || {}),
    },
    kids: [
      Skeletons.Note({ className: `${pfx}-role-label`, content: role.label }),
      Skeletons.Button.Svg({ className: `${pfx}-role-caret`, ico: "apps-caret-down" }),
    ],
  });
}

function memberAvatar(pfx, member) {
  if (member.color === "user") {
    return Skeletons.UserProfile({
      className: `${pfx}-avatar user`,
      id: Visitor.id,
      firstname: Visitor.get(_a.firstname),
      lastname: Visitor.get(_a.lastname),
    });
  }
  return Skeletons.Note({
    className: `${pfx}-avatar ${member.color}`,
    content: member.initials,
  });
}

module.exports = function settingsActionPanel(ui) {
  const pfx = `${ui.fig.family}__settings-action`;
  const inviteRole = ui._folderInviteRole || roleOptions[0];

  return Skeletons.Box.Y({
    className: `${pfx}-panel`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          Skeletons.Note({ className: `${pfx}-title`, content: LOCALE.FOLDER_SETTING }),
          Skeletons.Button.Svg({
            className: `${pfx}-close`,
            ico: _a.cross,
            service: "close-folder-dialog",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-actions`,
        kids: actions.map(({ service, label, ico, destructive }) =>
          Skeletons.Box.X({
            className: `${pfx}-item${destructive ? " destructive" : ""}`,
            service,
            uiHandler: [ui],
            kids: [
              Skeletons.Note({ className: `${pfx}-label`, content: label }),
              Skeletons.Button.Svg({ className: `${pfx}-icon`, ico }),
            ],
          }),
        ),
      }),
      Skeletons.Box.Y({
        className: `${pfx}-invite-section`,
        kids: [
          Skeletons.Note({ className: `${pfx}-section-title`, content: LOCALE.INVITE_MEMBER }),
          Skeletons.Box.X({
            className: `${pfx}-invite-input-row`,
            kids: [
              Skeletons.Entry({
                className: `${pfx}-invite-entry`,
                sys_pn: "invite-email",
                formItem: _a.email,
                placeholder: LOCALE.INVITE_EMAIL_LABEL,
                require: _a.email,
                mode: _e.commit,
                service: "folder-send-invitation",
                uiHandler: [ui],
              }),
              roleDropdown(pfx, inviteRole, "folder-invite-role", { uiHandler: ui }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}-send-button`,
            content: LOCALE.SEND_INVITATION,
            service: "folder-send-invitation",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-members-section`,
        kids: [
          Skeletons.Note({ className: `${pfx}-section-title`, content: LOCALE.PERMISSIONS_MATRIX }),
          ...members.map((member, index) =>
            Skeletons.Box.X({
              className: `${pfx}-member-row`,
              dataset: { index },
              kids: [
                Skeletons.Box.X({
                  className: `${pfx}-member-info`,
                  kids: [
                    memberAvatar(pfx, member),
                    Skeletons.Note({ className: `${pfx}-member-name`, content: member.name }),
                  ],
                }),
                Skeletons.Box.X({
                  className: `${pfx}-member-actions`,
                  kids: [
                    roleDropdown(pfx, member.role, "folder-member-role", { uiHandler: ui, dataset: { index } }),
                    Skeletons.Button.Svg({
                      className: `${pfx}-member-remove`,
                      ico: "trash-action",
                      service: "folder-remove-member",
                      dataset: { index },
                      uiHandler: [ui],
                    }),
                  ],
                }),
              ],
            }),
          ),
        ],
      }),
    ],
  });
};
