// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/action-popup/profile-display.coffee
//   TYPE : Skeleton
// ===================================================================**/

const __skl_widget_chat_room_profile_display = function(_ui_) {
  let icon;
  const formFig = `${_ui_.fig.family}__popup`;
  const peer = _ui_.peer || {};
  const {
    status
  } = peer;

  const roomName = peer.display;

  if (_ui_.mget(_a.type) === _a.privateRoom) {
    const fname = peer.firstname  || '';
    const lname = peer.lastname  || '';
    const fullname = peer.fullname || (fname  + " " + lname);
    const displayName = peer.surname;

    icon = Skeletons.UserProfile({
      className : `${formFig}__profile avatar`,
      id        : peer.entity_id,
      firstname : fname || roomName,
      lastname  : lname,
      fullname
    });
  
  } else {
    icon = Skeletons.Button.Svg({
      ico       : 'raw-drumee_projectroom',
      className : `${formFig}__icon share-room raw-drumee_projectroom`
    });
  }


  const profileDisplay = Skeletons.Box.X({
    className   : `${formFig}__wrapper header`,
    debug       : __filename,
    kids        : [
      icon,
      
      Skeletons.Note({
        className : `${formFig}__note fullname label`,
        content   : roomName
      })
    ]});

  return profileDisplay;
};

module.exports = __skl_widget_chat_room_profile_display;