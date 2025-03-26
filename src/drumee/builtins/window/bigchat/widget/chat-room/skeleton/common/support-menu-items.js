// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/support-menu-items.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_support_menu_items = function(_ui_) {

  const menuFig = `${_ui_.fig.family}-menu`;
  
  const {
    peer
  } = _ui_;
  const type = _ui_.mget(_a.type);
  const {
    status
  } = peer;
  
  const statusNew = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'update-ticket-status',
    uiHandler   : _ui_,
    status        : _a.new,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item status-new`,
        content   : LOCALE.NEW
      })
    ]});
  
  const statusInProgress = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'update-ticket-status',
    uiHandler   : _ui_,
    status        : _a.doing,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item status-doing`,
        content   : 'Doing'
      })
    ]});
  
  const statusClosed = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'update-ticket-status',
    uiHandler   : _ui_,
    status        : _a.closed,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item status-closed`,
        content   : LOCALE.CLOSE
      })
    ]});

  const menuItems = Skeletons.Box.Y({
    className : `${menuFig}__items`,
    kids      : [
      status !== _a.new ?
        statusNew : undefined,
      
      status !== _a.doing ?
        statusInProgress : undefined,
      
      status !== _a.closed ?
        statusClosed : undefined
    ]});
  
  return menuItems;
};

module.exports = __skl_support_menu_items;