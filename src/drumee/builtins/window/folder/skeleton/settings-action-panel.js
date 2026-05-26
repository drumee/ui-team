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
// The stored procedure personalizes firstname/lastname/fullname/surname from
// the caller's contact DB — if the caller has the row's user as a contact
// without a name set, fullname comes back as " " (single space). JS truthiness
// would short-circuit on that and skip the email fallback, so trim each
// candidate before picking.
function mapFolderMember(row) {
  const pick = (...vals) =>
    vals.map((v) => (v == null ? "" : String(v).trim())).find(Boolean) || "—";
  const name = pick(
    row.fullname,
    [row.firstname, row.lastname].filter(Boolean).join(" "),
    row.surname,
    row.email,
  );
  const isSelf = row.id === Visitor.id || row.entity_id === Visitor.id;
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (name.slice(0, 2) || "?").toUpperCase();
  return {
    id: row.entity_id || row.drumate_id || row.id,
    name: isSelf ? `${name} (${LOCALE.YOU || "You"})` : name,
    rawName: name,
    initials,
    role: roleFromPrivilege(row.privilege),
    color: isSelf ? "user" : "primary",
    isSelf,
  };
}

// Render the role pill as a real KIND.menu.topic dropdown — click on the
// trigger opens a positioned menu listing every roleOption; picking one fires
// `service` with the target role embedded as dataset (member_id, privilege,
// role_label). Replaces the previous cycle-on-click UX that contradicted the
// caret-down affordance.
function roleDropdown(pfx, role, service, extra = {}) {
  const ui = extra.uiHandler;
  const memberId = extra.dataset?.member_id;
  const radioGroup = memberId
    ? `folder-role-${service}-${memberId}`
    : `folder-role-${service}`;

  const trigger = Skeletons.Box.X({
    className: `${pfx}-role-select`,
    kids: [
      Skeletons.Note({ className: `${pfx}-role-label`, content: role.label }),
      Skeletons.Button.Svg({
        className: `${pfx}-role-caret`,
        ico: "apps-caret-down",
      }),
    ],
  });

  // No radio dot — selected option uses background highlight (data-state="1")
  // instead. Keeps menu narrow enough to stay inside the panel.
  // Render each option as a single Note (the actual click target) — putting
  // service/dataset directly on the element that receives the click avoids
  // the ambiguity of a Box.X wrapper whose child Note's own click handler
  // would stopPropagation before the wrapper's service ever fires.
  const items = Skeletons.Box.Y({
    className: `${pfx}-role-menu`,
    kids: roleOptions.map((opt) =>
      Skeletons.Note({
        className: `${pfx}-role-option`,
        content: opt.label,
        service,
        radio: radioGroup,
        name: opt.label,
        uiHandler: ui ? [ui] : undefined,
        dataset: {
          ...(memberId ? { member_id: memberId } : {}),
          privilege: opt.privilege,
          role_label: opt.label,
        },
        state: opt.label === role.label ? 1 : 0,
      }),
    ),
  });

  return {
    kind: KIND.menu.topic,
    className: `${pfx}-role-dropdown`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.once,
    trigger,
    offsetY: 4,
    items,
  };
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

// Returns true when the logged-in user has the admin bit in this folder.
// Server-side hub.delete_contributor and hub.set_privilege reject non-admin
// callers anyway, but the UI gates role-change and remove controls so a
// non-admin viewer never sees destructive affordances they can't use.
function viewerIsFolderAdmin(list) {
  const self = list.find((m) => m.isSelf);
  if (!self) return false;
  return self.role.label === LOCALE.ROLE_ADMIN;
}

// Build the "Permissions Matrix" rows from the pre-mapped member list. The
// caller filters link/anonymous rows (no entity_id / drumate_id / id) and
// applies mapFolderMember — keep that single source of truth so the admin
// gate and the rendered rows always agree.
function memberRows(list, ui, pfx, isAdmin) {
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
  return list.map((member, index) => {
    // Self row: always read-only label.
    // Other members + viewer is admin: editable role + remove button.
    // Other members + viewer NOT admin: read-only role label only (no remove).
    const actions = member.isSelf || !isAdmin
      ? [
          Skeletons.Note({
            className: `${pfx}-role-label ${pfx}-role-readonly`,
            content: member.role.label,
          }),
        ]
      : [
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
        ];
    return Skeletons.Box.X({
      className: `${pfx}-member-row`,
      dataset: { index, member_id: member.id },
      styleOpt: { zIndex: 1000 - index },
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
          kids: actions,
        }),
      ],
    });
  });
}

module.exports = function settingsActionPanel(ui) {
  const pfx = `${ui.fig.family}__settings-action`;
  const inviteRole = ui._folderInviteRole || roleOptions[0];

  // Filter link/anonymous rows then map once; reuse for both the admin gate
  // and the rendered rows so they can't diverge.
  const mappedMembers = (ui._folderMembers || [])
    .filter((row) => row.entity_id || row.drumate_id || row.id)
    .map(mapFolderMember);
  const isAdmin = viewerIsFolderAdmin(mappedMembers);

  const inviteSection = isAdmin
    ? Skeletons.Box.Y({
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
      })
    : null;

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
      inviteSection,
      Skeletons.Box.Y({
        className: `${pfx}-members-section`,
        kids: [
          Skeletons.Note({ className: `${pfx}-section-title`, content: LOCALE.PERMISSIONS_MATRIX }),
          ...memberRows(mappedMembers, ui, pfx, isAdmin),
        ],
      }),
    ].filter(Boolean),
  });
};
