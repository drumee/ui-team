// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/action-popup/resend-invite.coffee
//   TYPE : Skeleton
// ===================================================================**/

const __skl_addressbook_resend_invite = function(_ui_) {
  const inviteFig = `${_ui_.fig.family}__popup`;
  const contact = _ui_.mget(_a.contact);

  const close = Skeletons.Box.X({
    className   : `${inviteFig}-close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${inviteFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]});

  let headerContent = LOCALE.POPUP_RESEND_INVITE_TO;
  if (contact.is_drumate) {
    headerContent = LOCALE.RESEND_CONNECTION_REQUEST;//POPUP_SEND_CONNECTION_REQUEST
  }
  const header = Skeletons.Note({
    className : `${inviteFig}_header-title resend-invite`,
    content   : headerContent
  });
  
  const profileDisplay = require('./profile-display')(_ui_);
  
  const message = Skeletons.Box.X({
    className   : `${inviteFig}__wrapper message`,
    kids        : [
      Skeletons.Entry({
        className     : `${inviteFig}__entry message`,
        type          : _a.textarea,
        name          : _a.message,
        formItem      : _a.message,
        innerClass    : _a.message,
        placeholder   : LOCALE.YOUR_MSG || ''
      })
    ]});

  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : LOCALE.CONFIRM,
    confirmService    : 'update-invite',
    confirmBtnAction  : _a.resend
  });

  const bodyContent = Skeletons.Box.Y({
    className   : `${inviteFig} ${inviteFig}-model-holder model-holder`,
    sys_pn      : 'popup-body-content',
    kids        : [
      header,
      profileDisplay,
      message,
      buttons
    ]});

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${inviteFig}-wrapper model-wrapper form-row`,
    kids        : [
      close,
      bodyContent
    ]});
  
  return a;
};

module.exports = __skl_addressbook_resend_invite;