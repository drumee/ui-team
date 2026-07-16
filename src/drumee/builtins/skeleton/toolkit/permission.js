/**
 * Single source of truth for the hub/workspace permission LEVELS shown in
 * every role selector (invite popup, workspace settings, manage-access…).
 *
 * Order is deliberate — weakest to strongest, top to bottom — and every
 * option carries a hover description so new users learn what each level
 * unlocks instead of guessing from the name:
 *   View  (Can only View)
 *   Chat  (Can View & Chat)
 *   Edit  (Can View, Chat & Edit files, folder)
 *   Admin (Can View, Chat, Edit & Manage member permission)
 *
 * `privilege` is the composed _K.privilege level mask STORED on the member
 * (what hub.invite / hub.set_privilege expect); selection is resolved back
 * from a stored mask via its strongest _K.permission bit (see resolveRole).
 */
const roleItems = [
  {
    value: 'view',
    privilege: _K.privilege.read, // 0b0000011
    label: LOCALE.ROLE_VIEW || LOCALE.VIEW,
    description: LOCALE.ROLE_VIEW_DESC,
  },
  {
    value: 'chat',
    privilege: _K.privilege.chat, // 0b0000111
    label: LOCALE.ROLE_CHAT || LOCALE.CHAT,
    description: LOCALE.ROLE_CHAT_DESC,
  },
  {
    value: 'edit',
    privilege: _K.privilege.write, // 0b0001111
    label: LOCALE.ROLE_EDIT || LOCALE.EDIT,
    description: LOCALE.ROLE_EDIT_DESC,
  },
  {
    value: 'admin',
    privilege: _K.privilege.admin, // 0b0011111
    label: LOCALE.ROLE_ADMIN,
    description: LOCALE.ROLE_ADMIN_DESC,
  },
];

// Strongest-first lookup order for mask → role resolution.
const byStrength = [...roleItems].reverse();

/**
 * Map a stored privilege bitmask to its role item (strongest bit wins).
 */
export function roleFromPrivilege(priv) {
  const p = ~~priv;
  if (p & _K.permission.admin) return roleItems[3];
  if (p & _K.permission.write) return roleItems[2];
  if (p & _K.permission.download) return roleItems[1];
  return roleItems[0];
}

// Resolve current role from a widget's privilege (owner counts as admin).
export function resolveRole(ui) {
  try {
    if (ui.isMediaOwner && ui.isMediaOwner()) return roleItems[3];
    return roleFromPrivilege(ui.mget(_a.privilege));
  } catch (e) {
    return roleItems[0];
  }
}

export function roleByValue(value) {
  return roleItems.find((r) => r.value === value);
}

export { roleItems };

/**
 * Hover description shown beside the hovered option. Content/positioning is
 * consumed by the framework `tooltips` prop (letc.js __addTooltips) — the
 * skin positions `.role-option-tooltip` to the side of the option row.
 */
function roleTooltip(role) {
  if (!role.description) return undefined;
  return {
    content: role.description,
    className: 'role-option-tooltip',
  };
}

/**
 * Single-select role menu (radio-highlight rows, no checkboxes).
 * @param {*} ui
 * @param {*} member  resolve the current role from this widget's privilege
 * @param {string} service
 * @param {string} fig
 * @param {string} [currentRoleValue]  explicit selected role ('view'|'chat'|
 *   'edit'|'admin'). When set, it wins over resolveRole — used by invite
 *   rows, where the role is a pending choice, not a stored bitmask.
 */
export function permissionItems(ui, member, service, fig = ui.fig.family, currentRoleValue) {
  const currentRole = currentRoleValue || resolveRole(member || ui).value;
  return Skeletons.Box.Y({
    className: `${fig}__role-menu`,
    kids: roleItems.map((role) =>
      Skeletons.Box.X({
        className: `${fig}__role-option`,
        service,
        radio: `permission-radio-${ui._id}`,
        name: role.value,
        itemForm: role.value,
        permission: role.privilege,
        privilege: role.privilege,
        tooltips: roleTooltip(role),
        uiHandler: [ui],
        state: role.value === currentRole ? 1 : 0,
        kids: [
          Skeletons.Note({
            content: role.label,
            className: `${fig}__role-option-label`,
          }),
          Skeletons.Note({
            className: `${fig}__role-option-radio option-radio`,
          }),
        ],
      }),
    ),
  });
}

/**
 * Permission dropdown (trigger + single-select menu).
 * @param {string} [currentRoleValue]  explicit selected role — see permissionItems.
 */
export function permissionMenu(ui, member, service, fig = ui.fig.family, currentRoleValue) {
  const currentRole = currentRoleValue || resolveRole(member || ui).value;
  const currentItem = roleByValue(currentRole) || roleItems[0];
  const trigger = Skeletons.Box.X({
    className: `${fig}__role-trigger`,
    kids: [
      Skeletons.Note({
        content: currentItem.label,
        className: `${fig}__role-label`,
      }),
      Skeletons.Button.Svg({
        ico: "carret-down",
        className: `${fig}__role-chevron`,
      }),
    ],
  });

  return {
    kind: KIND.menu.topic,
    className: `${fig}__role-dropdown`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.once,
    trigger,
    items: permissionItems(ui, member, service, fig, currentRoleValue),
    offsetY: 4,
  };
}
