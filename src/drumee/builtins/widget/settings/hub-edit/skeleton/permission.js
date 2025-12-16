/**
 * Permission section with checkboxes for Upload File and Download File
 */
function addPermissionRow(ui, _val, _service, _label, mode) {
  const permissionFig = `${ui.fig.family}-permission`;
  let permissionCheck = ui.permissionCheck.bind(ui);
  let icon = null;

  if (mode == _a.edit) {
    icon = Skeletons.Button.Svg({
      icons: ["editbox_shapes-roundsquare", "available"],
      className: `${permissionFig}__checkbox`,
      state: permissionCheck(_val) ? 1 : 0,
      _value: _val,
      service: _service,
      uiHandler: [ui],
    });
  } else {
    let svg = 'editbox_shapes-roundsquare';
    let className = 'unselected';
    if (permissionCheck(_val)) {
      svg = 'available';
      className = 'selected';
    }
    icon = Skeletons.Button.Svg({
      ico: svg,
      className: `${permissionFig}__checkbox ${className}`,
    });
  }

  let item = Skeletons.Box.X({
    className: `${permissionFig}__item`,
    kids: [
      icon,
      Skeletons.Note({
        className: `${permissionFig}__note item-label`,
        content: _label,
        service: _service,
        uiHandler: [ui],
        _value: _val,
      })
    ]
  });
  return item;
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
              addPermissionRow(ui, _K.permission.upload, 'change-permission', LOCALE.UPLOAD_FILE || "Upload File", mode),
            ]
          }),
          Skeletons.Box.X({
            className: `${permissionFig}__item-wrapper`,
            kids: [
              addPermissionRow(ui, _K.permission.download, 'change-permission', LOCALE.DOWNLOAD_FILE || "Download File", mode),
            ]
          }),
        ]
      }),
    ]
  });
}

