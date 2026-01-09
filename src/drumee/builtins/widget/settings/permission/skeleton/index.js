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
  const { permission, label, name, lock = 0 } = opt;
  const fig = `${ui.fig.family}`;
  return Skeletons.Box.X({
    className: `${fig}__item-wrapper`,
    dataset: {
      lock
    },
    kids: [
      addPermissionRow(ui, permission, 'change-permission', label, name),
    ]
  })
}
export default function (ui, formData) {
  const fig = `${ui.fig.family}`;
  let kids = []
  for (let item of ui.mget(_a.items)) {
    kids.push(build_permission(ui, item))
  }
  let container = Skeletons.Box.Y
  if (ui.mget('itemsFlow') == _a.x) {
    container = Skeletons.Box.X
  }
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    sys_pn: 'permissions-content',
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__content`,
        kids: [
          container({
            className: `${fig}__items`,
            kids
          }),
          validity(ui, formData)
        ]
      }),
    ]
  });
}


