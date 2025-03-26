// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/action-popup/resend-invite-confirmation.coffee
//   TYPE : Skeleton
// ===================================================================**/

const __skl_addressbook_resend_invite_confirmation = function(_ui_) {
  const contact = _ui_.mget(_a.contact);
  const inviteFig = `${_ui_.fig.family}__popup`;

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
  
  let title = 'invite';
  if (contact.is_drumate) {
    title = 'connection request';
  }
  
  const content = Skeletons.Note({
    className : `${inviteFig}-resend-content invite-again`,
    content   : LOCALE.RESEND_INVITE_CONFIRMATION
  });//"A invitaton has been sent less than 6 hours before. Do you want resend #{title} again ?"
  
  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : LOCALE.RESEND_INVITE,//'Resend Invite',
    confirmService    : 'resend-invite-confirmation',
    confirmBtnAction  : _a.resend
  });

  const bodyContent = Skeletons.Box.Y({
    className   : `${inviteFig} ${inviteFig}-model-holder model-holder`,
    sys_pn      : "popup-body-content",
    kids        : [
      content,
      buttons
    ]});
  
  const a = Skeletons.Box.X({
    debug       : __filename,
    className   : `${inviteFig}-wrapper model-wrapper form-row`,
    kids        : [
      close,
      bodyContent
    ]});
  
  return a;
};

module.exports = __skl_addressbook_resend_invite_confirmation;
