// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/support-tickets/skeleton/add-menu.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_ 
 */
function __skl_widget_support_tickets_add_menu (_ui_) {


  const menuFig = `${_ui_.fig.family}-add-menu`;
  
  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'desktop_plus',
    className : `${menuFig}__icon ${menuFig}__trigger trigger-icon ticket_add`,
    service   : 'add-menu',
    uiHandler : _ui_
  });
  
  const addTicket = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'create-support-ticket',
    uiHandler   : _ui_,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item create`,
        content   : LOCALE.ADD_TICKET//'Add Ticket'
      })
    ]
  });


  let menuKids = [];
  menuKids.push(addTicket)
  

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__item-wrapper`,
        kids      : menuKids
      })
    ]
  });

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'add-ticket-dropdown',
      service     : 'add-ticket-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems
    }]
  });

  return menu;
};


export default __skl_widget_support_tickets_add_menu;