/**
 * Permission section with checkboxes for Upload File and Download File
 */
function addPermissionRow(_ui_, _val, _service, _label, mode) {
  const permissionFig = `${_ui_.fig.family}-permission`;
  let permissionCheck = _ui_.permissionCheck.bind(_ui_);
  let icon = null;

  if (mode == _a.edit) {
    icon = Skeletons.Button.Svg({
      icons: ["editbox_shapes-roundsquare", "available"],
      className: `${permissionFig}__icon checkbox items-icon`,
      state: permissionCheck(_val),
      _value: _val,
      service: _service,
      uiHandler: _ui_
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
      className: `${permissionFig}__icon checkbox ${className} items-icon`,
    });
  }

  let item = Skeletons.Box.X({
    className: `${permissionFig}__item`,
    kids: [
      icon,
      Skeletons.Note({
        className: `${permissionFig}__note item-label`,
        content: _label
      })
    ]
  });
  return item;
}

export default function (_ui_, mode = _a.edit) {
  const permissionFig = `${_ui_.fig.family}-permission`;

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
          addPermissionRow(_ui_, _K.privilege.upload, 'change-permission', LOCALE.UPLOAD_FILE || "Upload File", mode),
          addPermissionRow(_ui_, _K.privilege.download, 'change-permission', LOCALE.DOWNLOAD_FILE || "Download File", mode),
        ]
      }),
    ]
  });
}

