// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-item-forward/skeleton/index.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_item_forward = function(_ui_) {
  const chatFrwdFig = _ui_.fig.family;

  const header = Skeletons.Box.X({
    className   : `${chatFrwdFig}__header`,
    kids        : [
      Skeletons.Note({
        className   : `${chatFrwdFig}__note title`,
        content     : LOCALE.FORWARD_TO
      }),
      
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${chatFrwdFig}__icon close account_cross`,
        service     : _e.close,
        uiHandler   : _ui_
      })
    ]});
  
  const radioSwitch = _.uniqueId("switch-");
  const switchTab = Skeletons.Box.X({
    className   : `${chatFrwdFig}__switch`,
    kids        : [
      Skeletons.Note({
        className : `${chatFrwdFig}__note contacts switch-title`,
        content   : LOCALE.CONTACTS,
        service   : 'trigger-list-item',
        type      : _a.privateRoom,
        state     : 1,
        radio     : radioSwitch,
        uiHandler : _ui_
      }),

      Skeletons.Note({
        className : `${chatFrwdFig}__note share-room switch-title`,
        content   : LOCALE.SHARE_ROOM_CHAT,//'Team room' #'Share room'
        service   : 'trigger-list-item',
        type      : _a.shareRoom,
        state     : 0,
        radio     : radioSwitch,
        uiHandler : _ui_
      })
    ]});

  const content = Skeletons.Box.X({
    className   : `${chatFrwdFig}__content forward-content`,
    sys_pn      : 'chat-forward-content',
    kids        : [
      require('./content')(_ui_, _a.privateRoom),
      require('./content')(_ui_, _a.shareRoom),

      Skeletons.Box.Y({
        className   : `${chatFrwdFig}__search-result-wrapper search-result-wrapper`,
        sys_pn      : 'search-result',
        dataset     : {
          mode       : _a.closed
        }
      })
    ]});

  const footer  = Skeletons.Box.Y({
    className   : `${chatFrwdFig}__footer`,
    kids        : [
      Skeletons.Box.X({
        className   : `${chatFrwdFig}__contact-count`,
        sys_pn      : 'selected-contact-count'
      }),

      Skeletons.Note({
        className : `${chatFrwdFig}__button-confirm button clickable`,
        content   : LOCALE.FORWARD, //'Forward'
        service   : 'forward-message',
        uiHandler : _ui_
      }) 
    ]});

  const a = Skeletons.Box.Y({
    className  : `${chatFrwdFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${chatFrwdFig}__container`,
        kids : [
          header,
          switchTab,
          content,
          footer
        ]})
    ]});

  return a;
};
module.exports = __skl_chat_item_forward;