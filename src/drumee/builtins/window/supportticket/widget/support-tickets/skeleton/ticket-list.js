// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/support-tickets/skeleton/ticket-list.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_ 
 */
function __skl_widget_support_tickets_list (_ui_) {

  let tagName = LOCALE.ALL_CONTACTS
  
  if(_ui_._currentTag && (_ui_._currentTag.name)) {
    tagName = _ui_._currentTag.name
  }
  const contentFig = `${_ui_.fig.family}-content`

  const content = Skeletons.Box.X({
    className     : contentFig,
    radio         : 'ticket_selected_'+_ui_.mget(_a.widgetId),
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${contentFig}__items`,
        kids      : [
          Skeletons.Box.X({
            className : `${contentFig}__item`,
            kids      : [
              Skeletons.Button.Svg({
                ico       : 'editbox_list-circle',
                className : `${contentFig}__icon ${contentFig}__editbox_list-circle editbox_list-circle`
              }),

              Skeletons.Note({
                className : `${contentFig}__name`,
                content   : LOCALE.NO_TICKETS_YET//'No Tickets Yet'
              })
            ]
          })
        ]
      })
    ]
  })

  const ticketList = Skeletons.List.Smart({
    className   : `${_ui_.fig.family}__item list`,
    placeholder : content,
    spinner     : true,
    timer       : 50,
    itemsOpt    : {
      kind      : 'support_ticket_item',
      service   : 'open-ticketroom-chat',
      radio     : 'ticket_selected_'+_ui_.mget(_a.widgetId),
      uiHandler : [_ui_],
    },
    sys_pn      : 'list-tickets',
    api         : _ui_.getCurrentApi
  })
 
  return ticketList;
};


export default __skl_widget_support_tickets_list;