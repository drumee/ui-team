// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/header.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_room_header = function(_ui_) {
  let connector_icon, fullname, headerService, icon, profile_icon, respawn, roomName, shareroomIcon, tag;
  const chatRoomFig = _ui_.fig.family;
  const headerFig = `${chatRoomFig}-header`;

  const type = _ui_.mget(_a.type);

  const {
    peer
  } = _ui_;
  if (type !== _a.supportTicket) {

    const fname = peer.firstname  || '';
    const lname = peer.lastname  || '';
    fullname = peer.fullname || (fname  + " " + lname);
    const displayName = peer.surname || fullname;

    
    roomName = peer.display;
    if (type === _a.ticketRoom) {
      roomName = displayName + ' - #' + peer.ticket_id;
    }
    
    profile_icon = Skeletons.UserProfile({
      className : `${chatRoomFig}__profile`,
      id        : peer.entity_id || peer.uid || peer.author_id,
      firstname : fname || roomName,
      lastname  : lname,
      fullname,
      online    : peer.online,
      sys_pn    : _a.profile
    }); 

    shareroomIcon = Skeletons.Button.Svg({
      ico       : 'raw-drumee_projectroom',
      className : `${chatRoomFig}__icon share-room raw-drumee_projectroom`
    });
  }

  let actionMenu = require('./action-menu')(_ui_);
  
  switch (type) {
    case _a.privateRoom:
      icon = profile_icon;
      headerService = _a.none;
      connector_icon = 'chat_connect';
      respawn = 'window_connect';
      break;

    case _a.shareRoom:
      icon = shareroomIcon;
      headerService = 'load-shareroom-detail';
      connector_icon = 'chat_connect';
      respawn = 'window_meeting';
      break;

    case _a.supportTicket:
      roomName = LOCALE.NEW_TICKET;
      icon = '';
      headerService = _a.none;
      actionMenu = '';
      break;

    case _a.ticketRoom:
      headerService = _a.none;
      if (Visitor.get('is_support')) {
        icon = profile_icon;
      } else {
        roomName = "#" + peer.ticket_id;
        actionMenu = '';
        icon = Skeletons.UserProfile({
          className : `${chatRoomFig}__profile customer`,
          id        : peer.ticket_id,
          firstname : 'Support',
          lastname  : 'Ticket',
          fullname  : 'Support Ticket'
        });
      }
      break;
  }
    
  const title = Skeletons.Box.X({
    className   : `${headerFig}__title`,
    service     : headerService,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      icon,
      Skeletons.Note({
        className   : `${headerFig}__note title ${type}`,
        content     : roomName
      })
    ]});

  const connector = Skeletons.Box.X({
    className   : `${headerFig}__connector`,
    kids        : [
      Visitor.canShow('video-call') ?
        Skeletons.Button.Svg({
          ico       : connector_icon || 'chat_connect',
          className : `${headerFig}__icon connector chat_connect`,
          service   : 'connect',
          respawn
        }) : undefined
    ]});

  const header = Skeletons.Box.X({
    className   : headerFig,
    debug      : __filename,
    kids        : [
      Skeletons.Box.X({
        className : `${headerFig}__left_icon_wrapper`,
        kids      : [
          (peer.status === _a.active) && !peer.is_blocked ?
            (tag = {
              kind: 'widget_tag_form_menu',
              entity_id: _ui_.entityId
            }) : undefined
        ]}),
      
      title,

      ((!Visitor.isMimicUser() && (peer.status === _a.active) &&  !peer.is_blocked) || peer.is_blocked_me) ?
        connector : undefined,
      
      actionMenu
    ]});
  
  return header;
};

module.exports = __skl_chat_room_header;