/**
 * Workspace-members panel body.
 *
 * The Invite and Permissions-Matrix sections are the folder Settings panel's
 * (window/folder/skeleton/settings-action-panel.js
 * __settings-action-invite-section / -members-section) rebuilt under this
 * widget's own prefix, element for element, so the two panels are the same UI
 * and the ported styles map 1:1 — see the skin.
 *
 * The rows are built here from `ui._members` (the panel fetches
 * hub.get_members_by_type itself; see index.js _loadMembers) rather than from a
 * List.Smart of `settings_member` widgets. That widget renders a different row
 * — 40px avatar, name over email, its own role trigger — which no amount of
 * scoped CSS turns into the base's row.
 */
const {
  roleItems: roleOptions,
  roleFromPrivilege,
  roleByValue,
} = require("../../../skeleton/toolkit/permission");

/**
 * Map a hub.get_members_by_type row to the row shape rendered below.
 *
 * Straight from the base panel's mapFolderMember, including its trim: the
 * stored procedure personalizes the name fields from the caller's contact DB,
 * so an unnamed contact comes back as " " (single space), which plain
 * truthiness would accept and then skip the email fallback.
 */
function mapMember(row) {
  const pick = (...vals) =>
    vals.map((v) => (v == null ? "" : String(v).trim())).find(Boolean) || "—";
  const name = pick(
    row.fullname,
    [row.firstname, row.lastname].filter(Boolean).join(" "),
    row.surname,
    row.email,
  );
  const isSelf = row.id === Visitor.id || row.entity_id === Visitor.id;
  return {
    id: row.entity_id || row.drumate_id || row.id,
    name: isSelf ? `${name} (${LOCALE.YOU || "You"})` : name,
    firstname: (row.firstname || "").trim(),
    lastname: (row.lastname || "").trim(),
    fullname: (row.fullname || "").trim() || name,
    role: roleFromPrivilege(row.privilege),
    isSelf,
  };
}

/**
 * The role pill: a KIND.menu.topic dropdown whose options carry the target
 * role as dataset, so picking one fires `service` with everything the handler
 * needs. Same construction as the base panel's roleDropdown.
 */
function roleDropdown(pfx, role, service, extra = {}) {
  const ui = extra.uiHandler;
  const memberId = extra.dataset?.member_id;
  const radioGroup = memberId
    ? `restricted-role-${service}-${memberId}`
    : `restricted-role-${service}`;

  const trigger = Skeletons.Box.X({
    className: `${pfx}__role-select`,
    kids: [
      Skeletons.Note({ className: `${pfx}__role-label`, content: role.label }),
      Skeletons.Button.Svg({
        className: `${pfx}__role-caret`,
        ico: "apps-caret-down",
      }),
    ],
  });

  const items = Skeletons.Box.Y({
    className: `${pfx}__role-menu`,
    kids: roleOptions.map((opt) =>
      Skeletons.Note({
        className: `${pfx}__role-option`,
        content: opt.label,
        service,
        radio: radioGroup,
        name: opt.label,
        tooltips: opt.description
          ? { content: opt.description, className: "role-option-tooltip" }
          : undefined,
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
    className: `${pfx}__role-dropdown`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.once,
    trigger,
    offsetY: 4,
    items,
  };
}

/** The member's real avatar, falling back to initials on the light disc the
 *  skin paints. auto_color off, so the fallback keeps that fixed styling
 *  instead of a per-name generated background. */
function memberAvatar(pfx, member) {
  return Skeletons.UserProfile({
    className: `${pfx}__avatar`,
    auto_color: 0,
    id: member.id,
    firstname: member.firstname,
    lastname: member.lastname,
    fullname: member.fullname,
  });
}

/** True when the signed-in user holds admin in this workspace, read from the
 *  same list the rows render from so the gate and the rows cannot disagree. */
function viewerIsAdmin(list) {
  const self = list.find((m) => m.isSelf);
  if (!self) return false;
  return self.role.label === LOCALE.ROLE_ADMIN;
}

function memberRows(list, ui, pfx, isAdmin) {
  if (!list.length) {
    return [
      Skeletons.Note({
        className: `${pfx}__members-empty`,
        content: ui._membersLoaded
          ? LOCALE.NO_FOLDER_MEMBERS || "No member has access yet."
          : LOCALE.LOADING || "Loading…",
      }),
    ];
  }
  return list.map((member, index) => {
    // Self row: read-only label — the server rejects self-mutation anyway.
    // Others, admin viewer: editable role + remove.
    // Others, non-admin viewer: read-only label, no remove.
    const actions =
      member.isSelf || !isAdmin
        ? [
          Skeletons.Note({
            className: `${pfx}__role-label ${pfx}__role-readonly`,
            content: member.role.label,
          }),
        ]
        : [
          roleDropdown(pfx, member.role, "select-member-role", {
            uiHandler: ui,
            dataset: { index, member_id: member.id },
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__member-remove`,
            ico: "trash-action",
            service: "remove-member",
            dataset: { index, member_id: member.id },
            uiHandler: [ui],
          }),
        ];
    return Skeletons.Box.X({
      className: `${pfx}__member-row`,
      dataset: { index, member_id: member.id },
      styleOpt: { zIndex: 1000 - index },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__member-info`,
          kids: [
            memberAvatar(pfx, member),
            Skeletons.Note({
              className: `${pfx}__member-name`,
              content: member.name,
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__member-actions`,
          kids: actions,
        }),
      ],
    });
  });
}

/**
 * Permission management panel skeleton
 * @param {*} ui
 * @returns
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  // Default pending-invite role: Edit, as on the base panel.
  const inviteRole = ui._inviteRole || roleByValue("edit");

  // Drop link/anonymous rows before mapping, then reuse the one list for both
  // the admin gate and the rows, so the two cannot diverge (as the base does).
  const members = (ui._members || [])
    .filter((row) => row.entity_id || row.drumate_id || row.id)
    .map(mapMember);
  const isAdmin = viewerIsAdmin(members);

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__header-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.WHO_HAS_ACCESS,
          }),
          Skeletons.Note({
            className: `${pfx}__subtitle`,
            content: LOCALE.MANAGE_FOLDER_PERMISSIONS,
          }),
        ],
      }),
      Skeletons.Button.Svg({
        ico: "cross",
        className: `${pfx}__close`,
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });

  // Only an admin can invite, matching the base panel — a non-admin viewer
  // gets the matrix alone rather than a form the server would reject.
  const inviteSection = isAdmin
    ? Skeletons.Box.Y({
      className: `${pfx}__invite-section`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__section-title`,
          content: LOCALE.INVITE_MEMBER,
        }),
        Skeletons.Box.X({
          className: `${pfx}__invite-input-row`,
          kids: [
            Skeletons.Entry({
              className: `${pfx}__invite-entry`,
              sys_pn: "invite-email",
              formItem: _a.email,
              placeholder: LOCALE.INVITE_EMAIL_LABEL,
              require: _a.email,
              bubble: 0,
            }),
            roleDropdown(pfx, inviteRole, "select-invite-role", {
              uiHandler: ui,
            }),
          ],
        }),
        // Address-book matches for the typed string — fed by
        // attachEmailLookup, hidden by the skin until it has rows.
        Skeletons.Box.Y({
          className: `${pfx}__invite-suggestions`,
          sys_pn: "invite-suggestions",
          partHandler: ui,
          dataset: { state: 0 },
          attrOpt: { "data-state": 0 },
          active: 0,
        }),
        // Inline validation message under the input. Hidden by data-state
        // until _setInviteError opens it, so it costs no vertical space (and
        // no section gap) while there is nothing to say.
        Skeletons.Box.Y({
          className: `${pfx}__invite-error`,
          sys_pn: "invite-error",
          dataset: { state: _a.closed },
          kids: [
            Skeletons.Note({
              className: `${pfx}__invite-error-message`,
              sys_pn: "invite-error-message",
              content: "",
            }),
          ],
        }),
        Skeletons.Note({
          className: `${pfx}__send-button`,
          sys_pn: "invite-send",
          content: LOCALE.SEND_INVITATION,
          service: "send-invitation",
          uiHandler: [ui],
        }),
      ],
    })
    : null;

  const membersSection = Skeletons.Box.Y({
    className: `${pfx}__members-section`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__section-title`,
        content: LOCALE.PERMISSIONS_MATRIX,
      }),
      ...memberRows(members, ui, pfx, isAdmin),
    ],
  });

  // Pinned header + scrolling body, after the base panel's -header / -scroll.
  const body = Skeletons.Box.Y({
    className: `${pfx}__body`,
    kids: [inviteSection, membersSection].filter(Boolean),
  });

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [header, body],
  });
};
