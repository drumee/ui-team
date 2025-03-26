// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_room = function(_ui_) {
  const {
    peer
  } = _ui_;
  const chatRoomFig = _ui_.fig.family;
  
  const header = Skeletons.Box.X({
    className  : `${chatRoomFig}__header`,
    sys_pn     : 'load_chat_header'
  });
  
  const separator = Skeletons.Box.X({
    className : `${chatRoomFig}__separator`});

  const content = Skeletons.Box.X({
    className : `${chatRoomFig}__content`,
    sys_pn    : "load_chat_content",
    kids      : [
      Skeletons.Note("LOADING")
    ]});
  const footer = Skeletons.Box.X({
    className : `${chatRoomFig}__footer`,
    sys_pn    : 'load_chat_footer'
  });

  const a = Skeletons.Box.Y({
    className  : `${chatRoomFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${chatRoomFig}__container`,
        kids : [
          header,
          separator,
          content,
          footer
        ]})
    ]});

  return a;
};

module.exports = __skl_chat_room;