const { validity } = require("../../hub/skeleton/toolkit")
/**
 * Check if a specific permission bit is set
 * @param {number} permissionBit - The permission bit to check (e.g., _K.permission.upload)
 * @returns {number} 1 if permission is set, 0 otherwise
 */
function permissionCheck(ui, permissionBit) {
  const privilege = ui.mget(_a.privilege) || 0;
  // Use bitwise AND to check if the specific permission bit is set
  return (privilege & permissionBit) ? 1 : 0;
}


/**
 * Permission section with checkboxes for Upload File and Download File
 */
export function addPermissionRow(ui, permission, service, content, name) {
  const fig = `${ui.fig.family}`;

  let icon = Skeletons.Button.Svg({
    permission,
    service,
    itemForm: 1,
    name,
    icons: ["editbox_shapes-roundsquare", "available"],
    className: `${fig}__checkbox`,
    state: permissionCheck(ui, permission) ? 1 : 0,
    uiHandler: [ui],
  });
  return Skeletons.Box.X({
    className: `${fig}__item`,
    kids: [
      icon,
      Skeletons.Note({
        className: `${fig}__note item-label`,
        content,
      })
    ]
  });
}
/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
function build_permission(ui, opt) {
  const { permission, label, name } = opt;
  const fig = `${ui.fig.family}`;
  return Skeletons.Box.X({
    className: `${fig}__item-wrapper`,
    kids: [
      addPermissionRow(ui, permission, 'change-permission', label, name),
    ]
  })
}
export default function (ui, formData) {
  const fig = `${ui.fig.family}`;
  const { read, write, modify } = _K.permission;
  
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    sys_pn: 'permissions-content',
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__content`,
        kids: [
          Skeletons.Box.Y({
            className: `${fig}__items`,
            kids: [
              build_permission(ui, { permission: read, label: LOCALE.PERMISSION_READ, name: _a.read }),
              build_permission(ui, { permission: write, label: LOCALE.PERMISSION_UPLOAD_DOWNLOAD, name: _a.write }),
              build_permission(ui, { permission: modify, label: LOCALE.PERMISSION_DELETE_ORGANIZE, name: _a.modify }),
            ]
          }),
          validity(ui, formData)
        ]
      }),
    ]
  });
}
