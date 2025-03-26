// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/tag-form-menu/skeleton/tag-menu.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_room_tag_dropdown_menu = function(_ui_) {
  let menuItems;
  const menuFig = `${_ui_.fig.family}-tag-menu`;
  
  const menuTrigger = Skeletons.Button.Svg({
    ico         : "tags",
    className   : `${menuFig}__icon trigger-icon no-multiple tags`,
    service     : 'tag-menu',
    uiHandler   : _ui_
  });
  
  if (_ui_.autoSave) {
    menuItems = {};
  } else {
    menuItems = require('./tag-menu-item')(_ui_);
  }

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : "tags-dropdown",
      service     : "tags-menu",
      persistence : _a.always,
      trigger     : menuTrigger,
      items       : menuItems,
      offsetY     : 10
    }]});
  
  return menu;
};

module.exports = __skl_chat_room_tag_dropdown_menu;