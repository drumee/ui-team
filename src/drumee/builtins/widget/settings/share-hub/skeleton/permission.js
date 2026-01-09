const { addPermissionRow } = require("../../hub/skeleton/toolkit")
export default function (ui) {
  const permissionFig = `${ui.fig.family}-permission`;
  return Skeletons.Box.Y({
    className: `${permissionFig}__section`,
    sys_pn: 'permissions-content',
    kids: [
      Skeletons.Note({
        className: `${permissionFig}__title`,
        content: LOCALE.PERMISSION || "Permission:",
      }),
      Skeletons.Box.X({
        className: `${permissionFig}__items`,
        kids: [
          Skeletons.Box.X({
            className: `${permissionFig}__item-wrapper`,
            kids: [
              addPermissionRow(ui, _K.permission.upload, 'change-permission', LOCALE.UPLOAD_FILE || "Upload File", _a.upload),
            ]
          }),
          Skeletons.Box.X({
            className: `${permissionFig}__item-wrapper download`,
            kids: [
              addPermissionRow(ui, _K.permission.download, 'change-permission', LOCALE.DOWNLOAD_FILE || "Download File", _a.download),
            ]
          }),
        ]
      }),
    ]
  });
}

