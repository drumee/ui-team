// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/shareroom-detail-footer.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_shareroom_chat_details_footer = function(_ui_) {
  const crFooterFig = `${_ui_.fig.family}-footer`;

  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel     : LOCALE.RETURN,//CANCEL #'Share room',
    cancelService   : 'back-to-sharerooom-chat',
    confirmLabel    : LOCALE.OPEN_SHARE, //'Return Discussion'
    confirmService  : 'open-shareroom'
  });

  const a = Skeletons.Box.Y({
    className  : `${crFooterFig}__shareroom`,
    debug      : __filename,
    kids       : [
      buttons
    ]});

  return a;
};

module.exports = __skl_shareroom_chat_details_footer;