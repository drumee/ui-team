// Edit-member popup. Renders one of three layouts based on the member's role:
//   variant === "owner"  -> single Role dropdown (Organization Owner)
//   variant === "admin"  -> per-workspace role selectors (Admin)
//   variant === "member" -> per-workspace permission selectors (View & Chat / View & Edit)

function deviceKind(row) {
  const platform = (row.platform || row.os || row.device_type || "").toLowerCase();
  if (/(iphone|android|mobile|phone|ios|sm-|pixel)/.test(platform)) return "mobile";
  if (/(mac|win|linux|laptop|desktop|chromebook)/.test(platform)) return "laptop";
  const name = (row.name || row.device_name || "").toLowerCase();
  if (/(iphone|android|mobile|phone|pixel)/.test(name)) return "mobile";
  return "laptop";
}

function mapDevice(row) {
  const id = row.id || row.sys_id || row.device_id;
  const name = row.name || row.device_name || row.platform || "Device";
  const ip = row.ip || row.ip_address || row.last_ip || "";
  const status =
    row.status === 1 || row.status === "verified" || row.connected
      ? "Verified"
      : row.status || "Verified";
  const info = ip ? `${status} • ${ip}` : status;
  return { id, kind: deviceKind(row), name, info };
}

// Privilege bitmask: Admin=31, Edit=7, View=2. Anything below 7 collapses to View.
const ROLES = [
  { id: "admin", label: LOCALE.ROLE_ADMIN || "Admin", bit: 31 },
  { id: "edit",  label: LOCALE.ROLE_VIEW_EDIT || LOCALE.EDIT || "Edit", bit: 7 },
  { id: "view",  label: LOCALE.VIEW || "View", bit: 2 },
];

function roleIdFor(priv) {
  const p = parseInt(priv, 10) || 0;
  if (p >= 31) return "admin";
  if (p >= 7)  return "edit";
  return "view";
}

function roleLabelFor(priv) {
  const role = ROLES.find((r) => r.id === roleIdFor(priv));
  return role ? role.label : (LOCALE.VIEW || "View");
}

function mapWorkspace(row) {
  const id = row.hub_id || row.id;
  const name = row.hub_name || row.name || row.full_name || row.label || "Workspace";
  const priv = parseInt(row.privilege || row.permission || 0, 10) || 0;
  const roleId = roleIdFor(priv);
  return { id, name, priv, roleId, role: roleLabelFor(priv) };
}

function variantFor(member) {
  const v = (member && member.role && member.role.variant) || "member";
  if (v === "owner") return "owner";
  if (v === "admin") return "admin";
  return "member";
}

function userCard(ui, member) {
  const pfx = ui.fig.family;
  const color = (member && member.avatar_color) || "cyan";
  const avatar = Skeletons.Box.X({
    className: `${pfx}__edit-avatar ${pfx}__edit-avatar--${color}`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__edit-avatar-initials`,
        content: (member && member.initials) || "?",
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}__edit-user`,
    kids: [
      avatar,
      Skeletons.Box.Y({
        className: `${pfx}__edit-user-info`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__edit-user-name`,
            content: member.name,
          }),
          Skeletons.Note({
            className: `${pfx}__edit-user-email`,
            content: member.email,
          }),
        ],
      }),
    ],
  });
}

function selectField(ui, { value, service }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__edit-select`,
    service,
    uiHandler: [ui],
    kids: [
      Skeletons.Note({
        className: `${pfx}__edit-select-value`,
        content: value,
      }),
      Skeletons.Image.Svg({
        ico: "apps-caret-down",
        className: `${pfx}__edit-select-caret`,
      }),
    ],
  });
}

function ownerRoleSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__edit-role-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__edit-section-heading`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-user-circle",
            className: `${pfx}__edit-section-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__edit-section-label`,
            content: LOCALE.ROLE || "Role",
          }),
        ],
      }),
      selectField(ui, {
        value: LOCALE.ORGANIZATION_OWNER || "Organization Owner",
        service: "apps-edit-role-select",
      }),
    ],
  });
}

function workspaceRow(ui, ws, idx) {
  const pfx = ui.fig.family;
  const selectedId = ws.roleId || "view";
  return Skeletons.Box.X({
    className: `${pfx}__edit-ws-row`,
    sys_pn: `edit-ws-row:${idx}`,
    partHandler: ui,
    dataset: { idx, hub_id: ws.id },
    active: 0,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__edit-ws-name`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-network",
            className: `${pfx}__edit-ws-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__edit-ws-label`,
            content: ws.name,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__edit-ws-role-cell`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__edit-ws-role-select`,
            service: "apps-edit-toggle-ws-role",
            uiHandler: [ui],
            idx,
            kids: [
              Skeletons.Note({
                className: `${pfx}__edit-ws-role-label`,
                sys_pn: `edit-ws-role-label:${idx}`,
                partHandler: ui,
                content: ws.role,
              }),
              Skeletons.Image.Svg({
                ico: "apps-caret-down",
                className: `${pfx}__edit-ws-role-caret`,
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__edit-ws-role-options`,
            sys_pn: `edit-ws-role-options:${idx}`,
            partHandler: ui,
            dataset: { idx, state: 0 },
            kids: ROLES.map((r) =>
              Skeletons.Note({
                className: `${pfx}__edit-ws-role-option`,
                dataset: {
                  id: r.id,
                  idx,
                  checked: r.id === selectedId ? 1 : 0,
                },
                content: r.label,
              }),
            ),
          }),
        ],
      }),
      Skeletons.Note({
        active: 1,
        className: `${pfx}__edit-ws-remove`,
        service: "apps-edit-remove-ws",
        uiHandler: [ui],
        idx,
        hub_id: ws.id,
        content: "×",
      }),
    ],
  });
}

function workspaceList(ui, list) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__edit-ws-list`,
    kids: [
      ...list.map((ws, idx) => workspaceRow(ui, ws, idx)),
      Skeletons.Box.X({
        className: `${pfx}__edit-ws-search`,
        kids: [
          Skeletons.Entry({
            className: `${pfx}__edit-ws-search-input`,
            sys_pn: "edit-ws-search-input",
            partHandler: ui,
            uiHandler: [ui],
            placeholder:
              LOCALE.SEARCH_WORKSPACE_TO_ADD || "Search workspace to add",
            require: "any",
            mode: "commit",
            service: "apps-edit-ws-search",
            bubble: 0,
          }),
          Skeletons.Box.X({
            className: `${pfx}__edit-ws-search-add`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__edit-ws-search-plus`,
                content: "+",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function deviceItem(ui, device) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__edit-device`,
    kids: [
      Skeletons.Image.Svg({
        ico: device.kind === "laptop" ? "apps-laptop" : "apps-mobile",
        className: `${pfx}__edit-device-ico`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__edit-device-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__edit-device-name`,
            content: device.name,
          }),
          Skeletons.Note({
            className: `${pfx}__edit-device-info`,
            content: device.info,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__edit-device-remove`,
        service: "apps-edit-remove-device",
        uiHandler: [ui],
        device_id: device.id,
        kids: [
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${pfx}__edit-device-remove-ico`,
          }),
        ],
      }),
    ],
  });
}

function deviceSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__edit-devices`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__edit-devices-header`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__edit-section-heading`,
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-devices",
                className: `${pfx}__edit-section-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__edit-section-label`,
                content: LOCALE.DEVICE || "Device",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__edit-remove-all`,
            service: "apps-edit-remove-all-devices",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({
                ico: "trash",
                className: `${pfx}__edit-remove-all-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__edit-remove-all-label`,
                content: LOCALE.REMOVE_ALL || "Remove all",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__edit-device-list`,
        kids: (ui._editDevices || []).map((row) =>
          deviceItem(ui, mapDevice(row))
        ),
      }),
    ],
  });
}

export default function edit_member_overlay(ui) {
  const pfx = ui.fig.family;
  const member = ui._editingMember;
  if (!member) return null;
  const variant = variantFor(member);

  const middleSections = [];
  const wsRows = (ui._editWorkspaces || []).map(mapWorkspace);
  if (variant === "owner") {
    middleSections.push(ownerRoleSection(ui));
    if (wsRows.length) middleSections.push(workspaceList(ui, wsRows));
  } else {
    middleSections.push(workspaceList(ui, wsRows));
  }
  middleSections.push(deviceSection(ui));

  return Skeletons.Box.Y({
    className: `${pfx}__edit-overlay`,
    dataset: { state: "open" },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__edit-card ${pfx}__edit-card--${variant}`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__edit-header`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__edit-title`,
                content: LOCALE.MEMBER_ROLE || "Member Role",
              }),
              Skeletons.Box.X({
                className: `${pfx}__edit-close`,
                service: "apps-edit-close",
                uiHandler: [ui],
                kids: [
                  Skeletons.Image.Svg({
                    ico: "cross",
                    className: `${pfx}__edit-close-ico`,
                  }),
                ],
              }),
            ],
          }),
          userCard(ui, member),
          Skeletons.Box.Y({
            className: `${pfx}__edit-body`,
            kids: middleSections,
          }),
          Skeletons.Box.X({
            className: `${pfx}__edit-save-btn`,
            service: "apps-edit-save",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-floppy",
                className: `${pfx}__edit-save-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__edit-save-label`,
                content: LOCALE.SAVE_CHANGES || "Save Changes",
              }),
            ],
          }),
          // Workspace-search suggestions: rendered as a direct child of
          // edit-card (not inside edit-body) so it can be position:absolute
          // without being clipped by edit-body's overflow:auto. Coordinates
          // are computed against the search input in _positionEditWsSuggestions.
          Skeletons.Box.Y({
            className: `${pfx}__edit-ws-suggestions`,
            sys_pn: "edit-ws-suggestions",
            partHandler: ui,
            dataset: { state: 0 },
            active: 0,
          }),
        ],
      }),
    ],
  });
}
