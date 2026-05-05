const roleItems = [
  { value: 'admin', permission: _K.permission.admin, label: LOCALE.ROLE_ADMIN || 'Admin' },
  { value: 'edit', permission: _K.permission.write, label: LOCALE.ROLE_VIEW_EDIT || LOCALE.EDIT },
  { value: 'view', permission: _K.permission.read, label: LOCALE.VIEW },
];


// Resolve current role from permission bitmask
export function resolveRole(ui) {
  try {
    if (ui.isMediaOwner() || ui.mget(_a.privilege) & _K.permission.admin) return roleItems[0];
    if (ui.mget(_a.privilege) & _K.permission.write) return roleItems[1];
  } catch (e) {
    return roleItems[2];
  }
  return roleItems[2];
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function permissionItems(ui, member, service, fig = ui.fig.family) {
  const currentRole = resolveRole(member || ui).value;
  return Skeletons.Box.Y({
    className: `${fig}__role-menu`,
    kids: roleItems.map((role) =>
      Skeletons.Box.X({
        className: `${fig}__role-option`,
        service,
        radio: `permission-radio-${ui._id}`,
        name: role.value,
        itemForm: role.value,
        permission: role.permission,
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
 * Permission dropdown for the invite row.
 */
export function permissionMenu(ui, member, service, fig = ui.fig.family) {
  const currentRole = resolveRole(member || ui).value;
  const currentItem = roleItems.find(r => r.value === currentRole) || roleItems[0];
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
    items: permissionItems(ui, member, service, fig),
    offsetY: 4,
  };
}
