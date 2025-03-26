// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /ui/src/drumee/builtins/window/transferbox/skeleton/common/action-menu.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_transferbox_action_menu = function(_ui_) {
  
  const menuFig = `${_ui_.fig.family}-menu`;

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'editbox_arrow--down',
    className : `${menuFig}__icon ${menuFig}__trigger trigger-icon editbox_arrow--down`
  });

  const makeTransfer = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'make-transfer',
    uiHandler : _ui_,
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note name`,
        content   : 'Make a transfer'
      })
    ]});

  const sendTransferBox = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'send-transfer-box',
    uiHandler : _ui_,
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note name`,
        content   : 'Send transfer box'
      })
    ]});

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        kids  : [
          makeTransfer,
          sendTransferBox
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
      sys_pn      : 'transfer-box-dropdown',
      service     : 'transfer-box-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems
    }]});
  
  return menu;
};

export default __skl_transferbox_action_menu;
