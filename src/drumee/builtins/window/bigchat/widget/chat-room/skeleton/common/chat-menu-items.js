// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/chat-menu-items.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_menu_items = function(_ui_) {

  const menuFig = `${_ui_.fig.family}-menu`;
  
  const {
    peer
  } = _ui_;

  const type = _ui_.mget(_a.type);
  const {
    status
  } = peer;
  
  let openContact = '';

  if (type === _a.privateRoom) {
    if ((status === _a.active) || (status === _a.memory)) {
      openContact = Skeletons.Box.X({
        className   : `${menuFig}__item`,
        service     : 'open-contact',
        route       : {
          page        : 'open-contact',
          peer
        },

        uiHandler   : _ui_,
        kidsOpt     : {
          active      : 0
        },
        kids        : [
          Skeletons.Note({
            className : `${menuFig}__note menu-item`,
            content   : LOCALE.OPEN_CONTACT_MANAGER
          })
        ]});
    }
  }
  
  let _archivceService = _a.archived;
  let _archiveContent = LOCALE.ARCHIVE_CHAT;

  if (peer.is_archived === 1) {
    _archivceService = 'unarchive';
    _archiveContent = LOCALE.UNARCHIVE_CHAT;
  }

  const archiveContact = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : _archivceService,
    uiHandler   : _ui_,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : _archiveContent
      })
    ]});
  
  const deleteContact = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : 'delete-chat',
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item coming-soon`,
        content   : LOCALE.DELETE_CHAT
      })
    ]});

  const menuItems = Skeletons.Box.Y({
    className : `${menuFig}__items`,
    kids      : [
      openContact,
      archiveContact,
      deleteContact
    ]});
  
  return menuItems;
};

module.exports = __skl_chat_menu_items;