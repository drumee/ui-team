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

// Map a hub.get_members_by_type privilege bitmask to one of roleOptions.
function roleFromPrivilege(priv) {
  const p = ~~priv;
  if (p & _K.permission.admin) return roleOptions[0];
  if (p & _K.permission.write) return roleOptions[1];
  if (p & _K.permission.read) return roleOptions[2];
  return roleOptions[3];
}

// Map a hub.get_members_by_type row to the member-row view shape.
function mapFolderMember(row) {
  const name = (
    row.fullname ||
    [row.firstname, row.lastname].filter(Boolean).join(" ") ||
    row.surname ||
    row.email ||
    "—"
  ).trim();
  const isSelf = row.id === Visitor.id || row.entity_id === Visitor.id;
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (name.slice(0, 2) || "?").toUpperCase();
  return {
    id: row.entity_id || row.drumate_id || row.id,
    name: isSelf ? `${name} (${LOCALE.YOU || "You"})` : name,
    initials,
    role: roleFromPrivilege(row.privilege),
    color: isSelf ? "user" : "primary",
  };
}

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

// Build the "Permissions Matrix" rows from the real member list the folder
// window loaded via hub.get_members_by_type (ui._folderMembers). Falls back
// to a loading / empty note while the fetch is pending or returns nothing.
function memberRows(ui, pfx) {
  const list = (ui._folderMembers || []).map(mapFolderMember);
  if (!list.length) {
    return [
      Skeletons.Note({
        className: `${pfx}-members-empty`,
        content: ui._folderMembersLoaded
          ? LOCALE.NO_FOLDER_MEMBERS || "No member has access yet."
          : LOCALE.LOADING || "Loading…",
      }),
    ];
  }
  return list.map((member, index) =>
    Skeletons.Box.X({
      className: `${pfx}-member-row`,
      dataset: { index, member_id: member.id },
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
            roleDropdown(pfx, member.role, "folder-member-role", {
              uiHandler: ui,
              dataset: { index, member_id: member.id },
            }),
            Skeletons.Button.Svg({
              className: `${pfx}-member-remove`,
              ico: "trash-action",
              service: "folder-remove-member",
              dataset: { index, member_id: member.id },
              uiHandler: [ui],
            }),
          ],
        }),
      ],
    }),
  );
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
                bubble: 0,
              }),
              roleDropdown(pfx, inviteRole, "folder-invite-role", { uiHandler: ui }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}-send-button`,
            sys_pn: "invite-send",
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
          ...memberRows(ui, pfx),
        ],
      }),
    ],
  });
};
