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
// Same 4-level list every role selector renders (View → Chat → Edit →
// Admin, weakest first, with hover descriptions) — adapted to this
// popup's historical {id, label, bit} shape. Fixes the old hardcoded
// table where "View & Edit" sent the CHAT-level bitmask (0b0000111).
const { roleItems } = require("builtins/skeleton/toolkit/permission");
const ROLES = roleItems.map((r) => ({
  id: r.value,
  label: r.label,
  bit: r.privilege,
  description: r.description,
}));

const DEFAULT_ROLE_IDS = ["edit"];

const computePrivilege = (selectedIds) => {
  const role = ROLES.find((r) => selectedIds.includes(r.id));
  return role?.bit || ROLES.find((r) => r.id === "edit").bit;
};

const summarizeRoles = (selectedIds) => {
  const role = ROLES.find((r) => selectedIds.includes(r.id));
  return role?.label || LOCALE.SELECT_ROLE || "Select role";
};

const buildWorkspaceRow = (ui, idx) => {
  const pfx = ui.fig.family;
  // Reflect any pre-seeded workspace (e.g. opened from a hub's kebab Invite) so
  // the input shows the workspace name instead of the empty placeholder. Empty
  // rows (initial picker, "+ Add new") fall back to "" / default role.
  const ws = (ui._workspaces && ui._workspaces[idx]) || {};
  const roleIds = ws.roleIds || DEFAULT_ROLE_IDS;
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
            value: ws.name || "",
            placeholder:
              LOCALE.INVITE_WORKSPACE_PLACEHOLDER || "Search workspace to add",
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
          Skeletons.Box.X({
            className: `${pfx}__role-select`,
            service: "toggle-role",
            uiHandler: [ui],
            dataset: { idx },
            kids: [
              Skeletons.Note({
                className: `${pfx}__role-select-label`,
                sys_pn: `role-label:${idx}`,
                partHandler: ui,
                content: summarizeRoles(roleIds),
              }),
              Skeletons.Button.Svg({
                ico: "apps-caret-down",
                className: `${pfx}__role-caret`,
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__role-options`,
            sys_pn: `role-options:${idx}`,
            partHandler: ui,
            dataset: { idx, state: 0 },
            kids: ROLES.map((r) =>
              Skeletons.Note({
                className: `${pfx}__role-option`,
                // Hover description ("Can only View", …) — positioned
                // beside the row by the skin (.role-option-tooltip).
                tooltips: r.description
                  ? { content: r.description, className: "role-option-tooltip" }
                  : undefined,
                dataset: {
                  id: r.id,
                  idx,
                  checked: roleIds.includes(r.id) ? 1 : 0,
                },
                content: r.label,
              }),
            ),
          }),
        ],
      }),
      Skeletons.Note({
        // Override the row's kidsOpt active:0 so the X Note actually
        // handles its own click. Without this it inherits active:0 and
        // the click bubbles to the parent Box.X (which has no service)
        // — so clicking × did nothing.
        active: 1,
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

  // The dropdown floats under the email row instead of sitting in the column:
  // in flow it pushed the workspace picker and the Send button down every time
  // a match appeared, so the dialog jumped around while typing. Anchoring
  // needs a positioned parent, hence this wrapper.
  const emailField = Skeletons.Box.Y({
    className: `${pfx}__email-field`,
    kids: [emailRow, suggestion],
  });

  const emailError = Skeletons.Note({
    className: `${pfx}__field-error`,
    sys_pn: "email-error",
    partHandler: ui,
    dataset: { state: 0 },
    content: "",
  });

  const workspaceList = Skeletons.Box.Y({
    className: `${pfx}__workspaces`,
    sys_pn: "workspaces",
    partHandler: ui,
    kids: [buildWorkspaceRow(ui, 0)],
  });

  const workspaceError = Skeletons.Note({
    className: `${pfx}__field-error`,
    sys_pn: "workspace-error",
    partHandler: ui,
    dataset: { state: 0 },
    content: "",
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
      emailField,
      emailError,
      workspaceList,
      workspaceError,
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
