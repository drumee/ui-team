// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/widget/member-roles-menu-items/skeleton/index.js
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_rolesMenu_items (_ui_) {
  const formItemFig = `${_ui_.fig.family}`;
  const roleName = _ui_.mget(_a.name);

  const checkBox = Skeletons.Button.Svg({
    className   : `${formItemFig}__icon checkbox`,
    icons       :  ["editbox_shapes-roundsquare", "available"],//["box-tags", "backoffice_checkboxfill"],
    formItem    : 'role',
    state       : _ui_.getStatus() || 0,
    service     : 'trigger-role-select',
    // label       : roleName,
    value       : _ui_.mget('role_id'),
    uiHandler   : _ui_
  });

  const name = Skeletons.Note({
    className : `${formItemFig}__note name`,
    content   : roleName
  });

  const a = Skeletons.Box.Y({
    className  : `${formItemFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${formItemFig}__container`,
        kids       : [
          name,
          checkBox
        ]})
    ]});

  return a;
};

export default __skl_widget_member_rolesMenu_items;