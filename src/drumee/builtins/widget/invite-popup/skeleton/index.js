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
const { roleItems, ROLE_ICONS } = require("builtins/skeleton/toolkit/permission");
// Same area-tinted folder glyph the workspace dropdown rows draw, so the
// picked workspace looks like the row it was picked from.
const folderIcon = require("media/grid/template/folder");

/**
 * The glyph for one picked workspace, or "" when the row has no pick yet.
 *
 * `hub`/`role: "desk"` unconditionally: the picker only ever offers hubs —
 * _fetchWorkspaces drops `personal` via NON_INVITEABLE before anything is
 * listed — so there is no folder case to branch on here.
 *
 * A missing `area` still draws: the template falls back to its own base fill.
 * That is the pre-seeded row's case when a caller supplies a name but no area.
 */
const workspaceGlyph = (ws) =>
  ws && ws.hub_id
    ? folderIcon({
        // `|| ""`, not the bare value: with role "desk" the template skips its
        // own `inner-folder` default and interpolates whatever it was given
        // straight into `class="folder-shape ${area}"` — an undefined here
        // ships a literal `folder-shape undefined` class.
        area: ws.area || "",
        filetype: _a.hub,
        role: "desk",
        widgetId: _.uniqueId("invite-ws-picked-"),
        isAttachment: 1,
      })
    : "";
const ROLES = roleItems.map((r) => ({
  id: r.value,
  label: r.label,
  bit: r.privilege,
  description: r.description,
  // The glyph the permission panel's role pill shows for the same level.
  ico: ROLE_ICONS[r.value],
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
          // Overlays the input's left edge (the cell is position:relative
          // already, for the dropdown). pointer-events are off in the skin so
          // a click still lands in the field behind it, and the input takes
          // matching left padding while this is showing — see the skin.
          //
          // Gated on a `state` stamp, never on CSS :empty: this is fed with
          // markup by _renderWorkspaceIcon and an empty widget still renders
          // its own inner node.
          Skeletons.Element({
            // No area class on the wrapper: the tint rides on the glyph's own
            // `.folder-shape.<area>`, and a class here would go stale the
            // first time _renderWorkspaceIcon swaps the content.
            className: `${pfx}__workspace-icon`,
            sys_pn: `workspace-icon:${idx}`,
            partHandler: ui,
            dataset: { idx, state: ws.hub_id ? 1 : 0 },
            content: workspaceGlyph(ws),
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
            // Rows modelled on the permission panel's role pill
            // (permission/restricted roleDropdown → dropdownMenuButton): the
            // level's glyph, then its name, then its description on hover.
            //
            // The vocabulary only, not that widget. This menu is hand-wired
            // into _toggleRoleDropdown, _pickRole's capture-phase mousedown
            // and _maybeCloseDropdowns, and swapping it for a menu_topic would
            // rewire all three. The pick still resolves the same way:
            // closest(".invite-popup__role-option"), and the skin's
            // `&__role-option > *` rule keeps both kids pointer-transparent.
            kids: ROLES.map((r) =>
              Skeletons.Box.X({
                className: `${pfx}__role-option`,
                // Hover description ("Can only View", …). Declared the same
                // way the panel declares it — but ui-core hides it with an
                // inline display:none that only a CLICK toggles, and a click
                // here picks the role and closes the menu. The skin reveals it
                // on :hover instead; see `.role-option-tooltip` there.
                tooltips: r.description
                  ? { content: r.description, className: "role-option-tooltip" }
                  : undefined,
                dataset: {
                  id: r.id,
                  idx,
                  checked: roleIds.includes(r.id) ? 1 : 0,
                },
                kidsOpt: { active: 0 },
                kids: [
                  Skeletons.Button.Svg({
                    ico: r.ico,
                    className: `${pfx}__role-option-icon`,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__role-option-label`,
                    content: r.label,
                  }),
                ],
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
module.exports.workspaceGlyph = workspaceGlyph;
module.exports.ROLES = ROLES;
module.exports.DEFAULT_ROLE_IDS = DEFAULT_ROLE_IDS;
module.exports.computePrivilege = computePrivilege;
module.exports.summarizeRoles = summarizeRoles;
