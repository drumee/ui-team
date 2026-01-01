// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/widget/member-roles-menu/skeleton/index.js
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_rolesMenu (_ui_) {

  let menuItems;
  const menuFig = `${_ui_.fig.family}`;
    
  const menuTrigger = Skeletons.Button.Svg({
    ico         : 'tags',
    className   : `${menuFig}__icon trigger-icon no-multiple tags`,
    service     : 'role-menu',
    uiHandler   : _ui_
  });
  
  if (_ui_.autoSave) {
    menuItems = {};
  } else {
    menuItems = require('./item').default(_ui_);
  }

  const roleMenu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'roles-dropdown',
      service     : 'roles-menu',
      persistence : _a.always,
      trigger     : menuTrigger,
      items       : menuItems,
      offsetY     : 20
    }]});


  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          roleMenu
        ]})
    ]});

  return a;
};

export default __skl_widget_member_rolesMenu;