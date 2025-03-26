// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-item-forward/skeleton/content.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_item_forward_content = function(_ui_, type) {

  const chatFrwdFig = _ui_.fig.family;

  let _placeholder = LOCALE.NAME_CONTACT;
  let _formItem    = 'privateRooms';
  let _api         = _ui_.getContactList;
  let _mode        = _a.open;
  let noRoomContent = LOCALE.NO_CONTACT_FOUND;
  let _selectedList = _ui_._seletecdContacts;
  
  if (type === _a.shareRoom) {
    _placeholder = LOCALE.SHARED_FOLDER_NAME;
    _formItem    = 'shareRooms';
    _api         = _ui_.getShareRoomList;
    _mode        = _a.closed;
    noRoomContent = LOCALE.NO_TEAMROOM_FOUND; //'No ShareRoom Found'
    _selectedList = _ui_._selectedShareRooms;
  }
  
  const search = Skeletons.Entry({
    className   : `${chatFrwdFig}__search ${type}`,
    placeholder : _placeholder,
    sys_pn      : type + '-search-input',
    formItem    : _a.search,
    mode        : _a.interactive,
    interactive : 1,
    active      : 0,
    preselect   : 1,
    service     : _e.search,
    type,
    uiHandler   : _ui_
  });
  
  const searchWrapper = Skeletons.Box.X({
    className : `${chatFrwdFig}__search-wrapper`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'magnifying-glass',
        className : `${chatFrwdFig}__icon search-icon magnifying-glass`
      }),
      
      search
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
  
  const roomList = Skeletons.List.Smart({
    className   : `${chatFrwdFig}__list room-list`,
    placeholder : noRoom,
    spinner     : true,
    formItem    : _formItem,
    dataType    : _a.array,
    timer       : 50,
    itemsOpt    : { 
      kind         : 'widget_chat_forward_list_item',
      selectedList : _selectedList,
      uiHandler    : [_ui_],
      type
    },
    sys_pn      : 'forward-room-list',
    api         : _api
  });

  const a = Skeletons.Box.Y({
    className   : `${chatFrwdFig}__room-content ${type}-list`,
    debug       : __filename,
    sys_pn      : type + '-list',
    dataset     : {
      mode        : _mode
    },
    kids        : [
      searchWrapper,
      roomList
    ]});

  return a;
};

module.exports = __skl_chat_item_forward_content;