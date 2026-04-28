/**
 * Invite popup skeleton — matches Figma 316:77288 / 316:77652
 * Layout:
 *  - Header: title + close button
 *  - Sub: description
 *  - "Invite member via email" + chips entry + autocomplete suggestions
 *  - Workspace selector + role dropdown rows (1..N via "+ Add new")
 *  - "+ Add new workspace and role" link
 *  - Send Invitation button
 */
/**
 * Permission options shown as checkboxes (multi-select).
 * Privilege is computed by OR-ing the selected bits.
 *
 * Backend bits (lex/constants.js _K.privilege):
 *   admin = 0b0011111 (31), modify = 0b0001111, write = 0b0000111,
 *   read  = 0b0000011 (3)
 *
 * Chat is a separate resource permission granted via
 * mfs_home.chat_upload_id (server hub.invite_with_roles already
 * issues a chat upload grant when present). We surface it as a
 * dedicated UI checkbox; the bit is mirrored in the privilege
 * word so role-snapshot stays single-source.
 */
const ROLES = [
  { id: "admin", label: "Admin", bit: 0b0011111 }, // 31
  { id: "edit",  label: "Edit",  bit: 0b0000111 }, // 7  (write)
  { id: "chat",  label: "Chat",  bit: 0b0000011 }, // 3  (read)
  { id: "view",  label: "View",  bit: 0b0000011 }, // 3  (read)
];

/** Default selection ≈ "Edit + Chat" matches typical invitee role */
const DEFAULT_ROLE_IDS = ["edit", "chat"];

const computePrivilege = (selectedIds) => {
  let p = 0;
  for (const r of ROLES) {
    if (selectedIds.includes(r.id)) p |= r.bit;
  }
  return p || 0b0000011;
};

const summarizeRoles = (selectedIds) => {
  const labels = ROLES.filter((r) => selectedIds.includes(r.id)).map((r) => r.label);
  if (!labels.length) return "Select role";
  if (labels.length === 1) return labels[0];
  // Keep summary short to fit the 110px-wide role cell — show first label + count
  if (labels.length === 2) return labels.join(" & ");
  return `${labels[0]} +${labels.length - 1}`;
};

const buildWorkspaceRow = (ui, idx) => {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__workspace-row`,
    sys_pn: `workspace-row:${idx}`,
    partHandler: ui,
    dataset: { idx },
    active: 0,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__workspace-cell`,
        active: 0,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Entry({
            className: `${pfx}__workspace-input`,
            sys_pn: `workspace-input:${idx}`,
            partHandler: ui,
            uiHandler: [ui],
            dataset: { idx },
            placeholder: LOCALE.INVITE_WORKSPACE_PLACEHOLDER || "Search workspace to add",
            require: "any",
            mode: "commit",
            service: "search-workspace",
            bubble: 0,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__workspace-suggestions`,
            sys_pn: `workspace-suggestions:${idx}`,
            partHandler: ui,
            dataset: { idx, state: 0 },
            active: 0,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__role-cell`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__role-select`,
            sys_pn: `role-label:${idx}`,
            partHandler: ui,
            service: "toggle-role",
            uiHandler: [ui],
            dataset: { idx },
            content: summarizeRoles(DEFAULT_ROLE_IDS),
          }),
          Skeletons.Box.Y({
            className: `${pfx}__role-options`,
            sys_pn: `role-options:${idx}`,
            partHandler: ui,
            dataset: { idx, state: 0 },
            kids: ROLES.map((r) =>
              Skeletons.Note({
                className: `${pfx}__role-option`,
                dataset: {
                  id: r.id,
                  idx,
                  checked: DEFAULT_ROLE_IDS.includes(r.id) ? 1 : 0,
                },
                content: r.label,
              }),
            ),
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__row-remove`,
        service: "remove-workspace-row",
        uiHandler: [ui],
        dataset: { idx },
        content: "×",
      }),
    ],
  });
};

module.exports = function (ui) {
  const pfx = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.INVITE_TEAM_TITLE || "Invite your team members",
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: "close-invite-popup",
        uiHandler: [ui],
      }),
    ],
  });

  const description = Skeletons.Note({
    className: `${pfx}__description`,
    content:
      LOCALE.INVITE_TEAM_HINT ||
      "Invitees receive an email to join your workspace. Manage permissions anytime from settings.",
  });

  const emailLabel = Skeletons.Note({
    className: `${pfx}__field-label`,
    content: LOCALE.INVITE_EMAIL_LABEL || "Invite member via email",
  });

  const emailRow = Skeletons.Box.X({
    className: `${pfx}__email-row`,
    sys_pn: "email-row",
    partHandler: ui,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__chips`,
        sys_pn: "email-chips",
        partHandler: ui,
      }),
      Skeletons.Entry({
        className: `${pfx}__email-input`,
        sys_pn: "email-input",
        partHandler: ui,
        uiHandler: [ui],
        placeholder: "name@company.com",
        require: "any",
        mode: "commit",
        service: "submit-email",
        bubble: 0,
      }),
    ],
  });

  const suggestion = Skeletons.Box.Y({
    className: `${pfx}__suggestions`,
    sys_pn: "suggestions",
    partHandler: ui,
    state: 0,
    active: 0,
  });

  const workspaceList = Skeletons.Box.Y({
    className: `${pfx}__workspaces`,
    sys_pn: "workspaces",
    partHandler: ui,
    kids: [buildWorkspaceRow(ui, 0)],
  });

  const addRoleLink = Skeletons.Note({
    className: `${pfx}__add-role`,
    content: LOCALE.INVITE_ADD_ROLE || "+ Add new workspace and role",
    service: "add-workspace-role",
    uiHandler: [ui],
  });

  const sendBtn = Skeletons.Note({
    className: `${pfx}__send-btn`,
    sys_pn: "send-btn",
    partHandler: ui,
    content: LOCALE.SEND_INVITATION || "Send Invitation",
    service: "send-invitation",
    uiHandler: [ui],
    state: 0,
  });

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [
      header,
      description,
      emailLabel,
      emailRow,
      suggestion,
      workspaceList,
      addRoleLink,
      sendBtn,
    ],
  });
};

module.exports.buildWorkspaceRow = buildWorkspaceRow;
module.exports.ROLES = ROLES;
module.exports.DEFAULT_ROLE_IDS = DEFAULT_ROLE_IDS;
module.exports.computePrivilege = computePrivilege;
module.exports.summarizeRoles = summarizeRoles;
