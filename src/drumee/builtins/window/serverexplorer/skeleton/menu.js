// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : src/drumee/builtins/window/serverexplorer/skeleton/menu.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_server_export_common_menu = function(_ui_) {
  
  const menuFig = `${_ui_.fig.family}-menu`;

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'desktop_bigger',
    className : `${menuFig}__icon ${menuFig}__trigger dropdown-toggle-icon contact_add`
  });

  const newFolderMenu = Skeletons.Box.X({
    className : `${menuFig}__item`,
    uiHandler : _ui_,
    service    : _e.mkdir,
    kidsOpt   : {
      active  : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__name`,
        content   : LOCALE.NEW_FOLDER
      })
    ]});

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__items`,
        kids  : [
          newFolderMenu
        ]}) 
    ]});

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'server-export-dropdown',
      service     : 'server-export-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems
    }]});
  
  return menu;
};

module.exports = __skl_server_export_common_menu;
