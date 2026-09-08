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
  
  // The workspace-member tab is searched here rather than by the server:
  // hub_get_members_by_type takes no search key. Until its cache arrives the
  // search must stay empty; falling through to that API would show every member
  // for any query. Cache arrival re-feeds this skeleton from the picker.
  const usesWorkspaceMembers = _ui_._usesWorkspaceMembers(type);
  const memberRows = usesWorkspaceMembers
    ? _ui_.memberSearchRows()
    : null;

  const rowOpt = {
    kind         : 'widget_chat_forward_list_item',
    selectedList : _selectedList,
    // Same rule as the non-search list: gated whenever the source is a
    // workspace, share-room-only from a P2P chat.
    ...(_ui_._needsEligibility(type) ? {
      shareEligibility: _ui_._shareEligibility,
      eligibilityOwner: _ui_
    } : {}),
    type,
    service      : 'trigger-search-room-select',
    uiHandler    : [_ui_]
  };

  const searchList = Skeletons.List.Smart({
    className   : `${chatSearchFig}__list contact-list`,
    placeholder : noRoom,
    spinner     : true,
    timer       : 50,
    sys_pn      : 'forward-search-list',
    ...(usesWorkspaceMembers
      ? {
        // List.initialize object-spreads kids when itemsOpt is also present.
        // These static rows are therefore prepared here and carry no itemsOpt.
        kids: Array.isArray(memberRows)
          ? memberRows.map((row) => ({ ...row, ...rowOpt }))
          : []
      }
      : { itemsOpt: rowOpt, api: _ui_.getRoomSearchApi })
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
