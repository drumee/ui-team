/**
 * Permission section with checkboxes for Upload File and Download File
 */
function addPermissionRow(ui, permission, service, content, name) {
  const permissionFig = `${ui.fig.family}-permission`;

  // if (mode == _a.edit) {
  let icon = Skeletons.Button.Svg({
    permission,
    service,
    itemForm: 1,
    name,
    icons: ["editbox_shapes-roundsquare", "available"],
    className: `${permissionFig}__checkbox`,
    state: ui.permissionCheck(permission) ? 1 : 0,
    uiHandler: [ui],
  });
  // } else {
  //   let svg = 'editbox_shapes-roundsquare';
  //   let className = 'unselected';
  //   if (permissionCheck(permission)) {
  //     svg = 'available';
  //     className = 'selected';
  //   }
  //   icon = Skeletons.Button.Svg({
  //     ico: svg,
  //     className: `${permissionFig}__checkbox ${className}`,
  //   });
  // }
  return Skeletons.Box.X({
    className: `${permissionFig}__item`,
    kids: [
      icon,
      Skeletons.Note({
        className: `${permissionFig}__note item-label`,
        content,
      })
    ]
  });
}

export default function (ui, mode = _a.edit) {
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

