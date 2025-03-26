/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/hub/sharebox/skeleton/options_list.js
 * TYPE : Skelton
 * ===================================================================**/
function addPermissionRow(_ui_, _val, _service, _label, mode) {
  const permissionFig = `${_ui_.fig.family}-permission`;
  let permissionCheck = _ui_.permissionCheck.bind(_ui_)
  let icon = null;

  if (mode == _a.edit ){
    icon = Skeletons.Button.Svg({
      icons         : ["editbox_shapes-roundsquare", "available"], //box-tags, backoffice_checkboxfill
      className     : `${permissionFig}__icon checkbox items-icon`,
      state         : permissionCheck(_val),
      _value        : _val,
      service       : _service,
      uiHandler     : _ui_
    })
  }else {
    let svg = 'editbox_shapes-roundsquare';
    let className = 'unselected';
    if(permissionCheck(_val)){
      svg = 'available'
      className = 'selected';
    }
    icon = Skeletons.Button.Svg({
      ico         : svg,
      className   : `${permissionFig}__icon checkbox ${className} items-icon`,
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

function __skl_permission (_ui_,mode = _a.view) {
  let a;
  let sufix = null;
  if(mode == _a.view){
    sufix = Skeletons.Button.Svg({
      ico         : "desktop_sharebox_edit",//'editbox_pencil ',
      service     : 'edit-permission',
      className   : `${_ui_.fig.family}__inline-edit-icon button btn-middle `,
    })
  }else{
    sufix = Skeletons.Note({
      className   : `${_ui_.fig.family}__inline-action-btn middle`,
      service      : 'save-permission',
      content     : "Ok"
    })
  }
  a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__rights-wrapper`,
    debug      : __filename,
    kids: [
      Skeletons.Box.X ({
        className  : `${_ui_.fig.family}__permission_row`,
        kids: [
        //  addPermissionRow(_ui_, _K.privilege.guest, 'change-permission', LOCALE.SEE,mode), //'View members list'),See
          addPermissionRow(_ui_, _K.privilege.download, 'change-permission', LOCALE.DOWNLOAD,mode), //'View members list'),Download
          addPermissionRow(_ui_,  _K.privilege.upload, 'change-permission', LOCALE.UPLOAD,mode), //'Manage members list'),'Upload'
        ]
      }),
      sufix
    ]
  }) 

  return a;
}
export default __skl_permission;