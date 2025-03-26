// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/support-tickets/skeleton/filter-menu.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_ 
 */
function __skl_widget_support_tickets_filter_menu (_ui_) {

  const menuFig = `${_ui_.fig.family}-filter-menu`;
  
  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'desktop_filter',
    className : `${menuFig}__icon ${menuFig}__trigger trigger-icon ticket-filter`,
    service   : 'filter-menu',
    uiHandler : _ui_
  });
  
  const newTickets = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    kids        : [
      Skeletons.Button.Svg({
        className : `${menuFig}__icon checkbox new`,
        icons     :  ["editbox_shapes-roundsquare", "available"],
        sys_pn    : 'filter-item-checkbox-new',
        formItem  : 'filter',
        service   : 'trigger-tickets-filter',
        state     : 1,
        value     : _a.new,
        uiHandler : [_ui_]
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item new`,
        content   : LOCALE.NEW
      })
    ]
  });

  const inProgressTickets = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    kids        : [
      Skeletons.Button.Svg({
        className : `${menuFig}__icon checkbox doing`,
        icons     : ["editbox_shapes-roundsquare", "available"],
        formItem  : 'filter',
        sys_pn    : 'filter-item-checkbox-doing',
        service   : 'trigger-tickets-filter',
        state     : 1,
        value     : _a.doing,
        uiHandler : [_ui_]
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item doing`,
        content   : LOCALE.DOING//'Doing'
      })
    ]
  });

  const closedTickets = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    kids        : [
      Skeletons.Button.Svg({
        className : `${menuFig}__icon checkbox closed`,
        icons     : ["editbox_shapes-roundsquare", "available"],
        formItem  : 'filter',
        sys_pn    : 'filter-item-checkbox-closed',
        service   : 'trigger-tickets-filter',
        state     : 0,
        value     : _a.closed,
        uiHandler : [_ui_]
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item closed`,
        content   : LOCALE.SUPPORT_CLOSE
      })
    ]
  });
  
  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__item-wrapper`,
        formItem  : 'options',
        dataType  : _a.array,
        kids      : [
          Skeletons.Note({
            className : `${menuFig}__note title`,
            content   : LOCALE.FILTER
          }),
          
          newTickets,
          inProgressTickets,
          closedTickets
        ]
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
      sys_pn      : 'filter-tickets-dropdown',
      service     : 'filter-tickets-menu',
      persistence : _a.always,
      trigger     : menuTrigger,
      items       : menuItems
    }]
  });

  return menu;
};


export default __skl_widget_support_tickets_filter_menu;