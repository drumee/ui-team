// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/action-menu.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_room_action_menu = function(_ui_) {

  const menuFig = `${_ui_.fig.family}-menu`;

  const type = _ui_.mget(_a.type);

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'menu_expand',//desktop__cog'#drumee-user-setting'
    className : `${menuFig}__icon ${menuFig}__trigger trigger-icon drumee-user-setting`,
    service   : 'action-menu',
    uiHandler : _ui_
  });

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__items`,
        kids      : [
          type === _a.ticketRoom ?
            require('./support-menu-items')(_ui_)
          :
            require('./chat-menu-items')(_ui_)

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
      sys_pn      : 'contact-card-dropdown',
      service     : 'contact-card-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems
    }]});
  
  return menu;
};

module.exports = __skl_chat_room_action_menu;