// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-item-forward/skeleton/search.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_item_forward_search = function(_ui_, type) {

  const chatSearchFig = `${_ui_.fig.family}`;
  type = _ui_.mget(_a.type);

  let noRoomContent = LOCALE.NO_CONTACT_FOUND;
  let _selectedList = _ui_._seletecdContacts;
  if (type === _a.shareRoom) {
    noRoomContent = LOCALE.NO_TEAMROOM_FOUND;//'No ShareRoom Found'
    _selectedList = _ui_._selectedShareRooms;
  }

  const searchHeader = Skeletons.Box.X({
//    className   : "#{chatSearchFig}__header"
    kids        : [
//      Skeletons.Note
//        className   : "#{chatSearchFig}__note search-title"
//        content     : LOCALE.SEARCH_RESULTS

      Skeletons.Button.Svg({
        ico         : "account_cross",
        className   : `${chatSearchFig}__icon search-close-icon account_cross`,
        service     : 'search-close-result',
        uiHandler   : _ui_
      })
    ]});

  const chatFrwdListFig = 'chat-forward-list-item';    // do not remove
  const noRoom = Skeletons.Box.X({
    className     : `${chatFrwdListFig}__main ${type}`,
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${chatFrwdListFig}__container ${type}`,
        kids      : [
          Skeletons.Box.X({
            className : `${chatFrwdListFig}__list ${type}`,
            kids      : [

              Skeletons.Button.Svg({
                ico       : "editbox_list-circle",
                className : `${chatFrwdListFig}__icon display-icon ${type} default-icon editbox_list-circle`
              }),
              
              Skeletons.Note({
                className : `${chatFrwdListFig}__name room-name`,
                content   : noRoomContent
              })
            ]})
        ]})
    ]});
  
  const searchList = Skeletons.List.Smart({
    className   : `${chatSearchFig}__list contact-list`,
    placeholder : noRoom,
    spinner     : true,
    timer       : 50,
    itemsOpt    : { 
      kind         : 'widget_chat_forward_list_item',
      selectedList : _selectedList,
      type,
      service      : 'trigger-search-room-select',
      uiHandler    : [_ui_]
    },
    sys_pn      : 'forward-search-list',
    api         : _ui_.getRoomSearchApi
  });

  const a = Skeletons.Box.Y({
    className   : `${chatSearchFig}__main search-list`,
    debug       : __filename,
    kids        : [
      searchHeader,
      searchList
    ]});

  return a;
};

module.exports = __skl_chat_item_forward_search;  