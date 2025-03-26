// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/addressbook/widget/search/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_addressbook_widget_search = function(_ui_) {
  
  let searchItemsOpt;
  const searchFig = `${_ui_.fig.family}`;

  let _service = 'show-contact-detail';
  let noContactFoundLabel = LOCALE.NO_CONTACT_FOUND;

  if (_ui_.mget(_a.type) === _a.chat) {
    _service = 'open-search-privateroom-chat';
  }
  
  if (_ui_.mget(_a.type) === _a.supportTicket) {
    noContactFoundLabel = LOCALE.NO_TICKET_FOUND;
  }

  const searchHeader = Skeletons.Box.X({
    className   : `${searchFig}__header`,
    kids        : [
      Skeletons.Note({
        className   : `${searchFig}__title`,
        content     : LOCALE.SEARCH_RESULTS
      }),

      Skeletons.Button.Svg({
        ico         : "account_cross",
        className   : `${searchFig}__icon close-icon account_cross`,
        service     : _e.close,
        uiHandler   : _ui_
      })
    ]});

  const contactFig = 'contact-item';
  const noContact = Skeletons.Box.X({
    className     : `${searchFig}__item contact-item`,
    radio         : 'contact_selected_'+_ui_.mget(_a.widgetId),
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${contactFig}__main`,
        kids      : [
          Skeletons.Box.X({
            className : `${contactFig}__container`,
            kids      : [
              Skeletons.Button.Svg({
                ico       : "editbox_list-circle",
                className : `${contactFig}__icon ${contactFig}__editbox_list-circle editbox_list-circle`
              }),
              
              Skeletons.Note({
                className : `${contactFig}__name`,
                content   : noContactFoundLabel
              })
            ]})
        ]})
    ]});
  
  if (_ui_.mget(_a.type) === _a.supportTicket) {
    searchItemsOpt = {
      kind        : 'support_ticket_item',
      service     : 'trigger-entity-item',
      itemService : 'open-search-ticketroom-chat',
      uiHandler   : [_ui_]
    };
  } else {
    searchItemsOpt = {
      kind        : 'contact_item',
      service     : 'trigger-entity-item',
      itemService : _service,
      uiHandler   : [_ui_]
    };
  }

  const searchList = Skeletons.List.Smart({
    className   : `${searchFig}__item list`,
    placeholder : noContact,
    itemsOpt    : searchItemsOpt,
    sys_pn      : "list-contacts",
    api         : _ui_.getCurrentApi
  });

  const a = Skeletons.Box.X({
    className   : `${searchFig}__main search-result`,
    debug       : __filename,
    kids        : [
      Skeletons.Box.Y({
        className  : `${searchFig}__container`,
        kids       : [
          searchHeader,
          searchList
        ]})
    ]});

  return a;
};
module.exports = __skl_addressbook_widget_search;