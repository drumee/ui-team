/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/hub/sharebox/skeleton/permissions.js
 * TYPE : Skeleton
 * ===================================================================**/

function addPermissionRow(_ui_, _val, _service, _label) {
  const permissionFig = `${_ui_.fig.family}-permission`;
  let permissionCheck = _ui_.permissionCheck.bind(_ui_)

  let icon;

  if (_val == _K.privilege.guest) {
    icon = Skeletons.Button.Svg({
      ico        : 'editbox_checkmark',
      className  : `${permissionFig}__icon checkbox items-icon see-icon`,
      state      : 1,
      _value     : _val,
      service    : _service,
      uiHandler  : _ui_
    })
  
  } else {
    icon = Skeletons.Button.Svg({
      icons      : ["editbox_shapes-roundsquare", "available"],
      className  : `${permissionFig}__icon checkbox items-icon`,
      state      : permissionCheck(_val),
      _value     : _val,
      service    : _service,
      uiHandler  : _ui_
    })
  }

  let item = Skeletons.Box.X({
    className : `${permissionFig}__item`,
    kids      : [
      icon,
      Skeletons.Note({
        className : `${permissionFig}__note item-label`,
        content   : _label
      })
    ]
  })
  
  return item;
}

function __skl_option_list (_ui_) {
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__rights-wrapper`,
    kids: [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__option-title`,
        content: LOCALE.RIGHTS_OF_CONTACT
      }),
      Skeletons.Box.Y ({
        className  : `${_ui_.fig.family}__permission_row`,
        kids: [
          addPermissionRow(_ui_, _K.privilege.guest, 'change-permission', LOCALE.SEE),
          addPermissionRow(_ui_, _K.privilege.download, 'change-permission', LOCALE.DOWNLOAD),
          addPermissionRow(_ui_,  _K.privilege.upload, 'change-permission', LOCALE.UPLOAD),
        ]
      })
    ]
  }) 

  return a;
}
export default __skl_option_list;