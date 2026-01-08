const { addPermissionRow, validity } = require("../../settings/hub/skeleton/toolkit")
function build_permission(ui, opt) {
  const { member = ui, permission, label, name } = opt;
  const permissionFig = `${ui.fig.family}-permission`;
  return Skeletons.Box.X({
    className: `${permissionFig}__item-wrapper`,
    kids: [
      addPermissionRow(member, permission, 'change-permission', label, name),
    ]
  })
}
export default function (ui, member) {
  const permissionFig = `${ui.fig.family}-permission`;
  const { guest, read, write, modify } = _K.permission
  return Skeletons.Box.Y({
    className: `${permissionFig}__main`,
    sys_pn: 'permissions-content',
    kids: [
      Skeletons.Box.Y({
        className: `${permissionFig}__content`,
        kids: [
          Skeletons.Box.Y({
            className: `${permissionFig}__items`,
            kids: [
              build_permission(ui, { permission: read, label: LOCALE.PERMISSION_READ, name: _a.read }),
              build_permission(ui, { permission: write, label: LOCALE.PERMISSION_UPLOAD_DOWNLOAD, name: _a.write }),
              build_permission(ui, { permission: modify, label: LOCALE.PERMISSION_DELETE_ORGANIZE, name: _a.modify }),
            ]
          }),
          validity(ui, ui.validityMode || _a.view)
        ]
      }),
      Skeletons.Box.X({
        className: `${permissionFig}__buttons`,
        sys_pn: "buttons",
        kids: [
          Skeletons.Note({
            sys_pn: "update-permission",
            service: "save-pending-permission",
            className: `${permissionFig}-button`,
            content: LOCALE.SAVE
          }),
        ]
      })
    ]
  });
}
