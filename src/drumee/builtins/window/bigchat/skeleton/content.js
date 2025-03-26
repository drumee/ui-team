// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/addressbook/skeleton/view/max-view
//   TYPE : Skelton
// ==================================================================== *

const __skl_addressbook_view_content = function(_ui_) {
  let breadcrumb, tag_id;

  const maxContent = Skeletons.Box.X({   
    className : `${_ui_.fig.family}__max-content ${_ui_.fig.group}__max-content max-content`, 
    sys_pn    : "max-content",
    kids : [
        Skeletons.Note({
          content: ""})
      ]});
    
  const reffId = (tag_id = 'tag_selected'+_ui_.mget(_a.widgetId));

  const shareRoomChat = Skeletons.Box.X({
    className : `${_ui_.fig.family}__shareroom-wrapper`,         
    sys_pn    : "shareroom-wrapper",
    service   : "show-shareroom-list",
    radio     : reffId, 
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__sharechat_notify`,
        sys_pn    : 'shareChatNotify',
        state     :  0,
        kids      : [
          Skeletons.Button.Svg({
            ico       : "chat_notification", //"chat_note"
            className : `${_ui_.fig.family}__chat_note ${_ui_.fig.group}__chat_note chat_note`,
            service   : 'chat_note',
            uiHandler : _ui_
          })
        ]}),
      Skeletons.Note({
        content: "Share room chat"})
    ]});

  const tags = { 
    kind      : "widget_tag",
    className : "widget_tag",
    radioId   : reffId,
    chat      : true,
    type      : _a.chat,
    router    : _ui_.router.page
  };

    // footer    : shareRoomChat

  const separator = Skeletons.Box.X({
    className : `${_ui_.fig.family}__separator`});
  
  const view = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__max-view ${_ui_.fig.group}__max-view`,
    sys_pn    : "window-body",
    kids      : [
      (breadcrumb = require('./common/breadcrumbs')(_ui_)),
      require('./common/overlay-wrapper')(_ui_),
      Skeletons.Box.Y({
        className : "tags-list",
        sys_pn    : "tags-wrapper",
        kids      : [
          tags
          // separator
          // shareRoomChat
        ]}),

      Skeletons.Box.X({
        className : "contact-wrapper",
        sys_pn    : "contact-wrapper",
        kids : [
          Skeletons.Note({
            content: "contact-wrapper"})
        ]}),
      maxContent
    ]});

  return view;
};

module.exports = __skl_addressbook_view_content;
