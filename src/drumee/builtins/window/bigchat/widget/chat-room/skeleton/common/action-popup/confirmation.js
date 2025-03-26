// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/action-popup/confirmation.coffee
//   TYPE : Skeleton
// ===================================================================**/

const __skl_widget_chat_room_confirmation = function(_ui_, opt) {
  const formFig = `${_ui_.fig.family}__popup`;

  const close = Skeletons.Box.X({
    className   : `${formFig}-close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${formFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]});
  
  const header = Skeletons.Note({
    className : `${formFig}_header-title`,
    content   : opt.headerContent || 'Confirm Action?'
  });
  
  const subTitle = Skeletons.Note({
    className : `${formFig}_header-sub-title`,
    content   : opt.subtitleContent || 'Do you want confirm the action:'
  });

  const profileDisplay = require('./profile-display')(_ui_);
  
  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : opt.confirmLabel || LOCALE.CONFIRM,
    confirmService    : opt.confirmService || '',
    confirmBtnAction  : opt.type || ''
  });

  const bodyContent = Skeletons.Box.Y({
    className   : `${formFig} ${formFig}-model-holder model-holder`,
    sys_pn      : "popup-body-content",
    kids        : [
      header,
      subTitle,
      profileDisplay,
      buttons
    ]});
  
  const a = Skeletons.Box.X({
    debug       : __filename,
    className   : `${formFig}-wrapper model-wrapper form-row`,
    kids        : [
      close,
      bodyContent
    ]});
  
  return a;
};

module.exports = __skl_widget_chat_room_confirmation;
