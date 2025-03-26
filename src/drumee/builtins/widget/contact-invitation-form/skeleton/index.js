// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/widget/contact-invitation-form/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_contact_invitationForm = function(_ui_) {
  this.debug("__skl_contact_invitationForm", _ui_);

  const inviteFormFig = _ui_.fig.family;
  const {
    mode
  } = _ui_;

  let header = '';
  if (mode === 'addressBook') {
    header = Skeletons.Box.X({
      className   : `${inviteFormFig}__wrapper header`,
      kids        : [
        Skeletons.Note({
          className   : `${inviteFormFig}__note header`,
          content     : LOCALE.INVITE_SOMEONE
        }) //'Invite Someone'
      ]});
  }

  const emailorIdent = Skeletons.Box.X({
    className   : `${inviteFormFig}__wrapper email`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_mail',
        className   : `${inviteFormFig}__icon account_mail`
      }),
      
      Skeletons.Entry({
        className     : `${inviteFormFig}__entry email`,
        name          : _a.email,
        formItem      : _a.email,
        innerClass    : _a.email,
        placeholder   : LOCALE.EMAIL,
        preselect     : 1,
        errorHandler  : [_ui_],
        validators    : [
          { reason  : 'require', comply : Validator.require },
          { reason  : "invalid_email", comply  : Validator.emailOrIdent }
        ]}),

      Skeletons.Button.Svg({
        ico         : 'drumee_user_hourglass', //user-help
        className   : `${inviteFormFig}__icon user-help`,
        sys_pn      : 'drumee_user_hourglass',
        service     : 'open-sent-contact',
        type        : 'pending-list'
      }) 
    ]});
  
//  name  = Skeletons.Box.X
//    className   : "#{inviteFormFig}__wrapper name"
//    kids        : [
//      Skeletons.Button.Svg
//        ico         : 'profile-signup' #'account_name'
//        className   : "#{inviteFormFig}__icon"
      
//      Skeletons.Entry
//        className     : "#{inviteFormFig}__entry name"
//        name          : _a.surname
//        formItem      : _a.surname
//        innerClass    : _a.surname
//        placeholder   : LOCALE.SURNAME
//    ]

  const message = Skeletons.Box.X({
    className   : `${inviteFormFig}__wrapper message`,
    kids        : [
      Skeletons.Entry({
        className     : `${inviteFormFig}__entry message`,
        type          : _a.textarea,
        name          : _a.message,
        formItem      : _a.message,
        innerClass    : _a.message,
        placeholder   : LOCALE.YOUR_MSG || ''
      }) //'your message'
    ]});

  const errorWrapper =  Skeletons.Wrapper.Y({
    className : `${inviteFormFig}__wrapper error-message`,
    name      : "errorBox"
  });

  const buttons = Skeletons.Box.X({
    className   : `${inviteFormFig}__wrapper buttons`,
    kids        : [
      Preset.ConfirmButtons(_ui_, {
        confirmLabel  : LOCALE.INVITE,
      },{
        sys_pn    : 'submit-button',
        state     : 1,
        dataset   : {
          wait  : 0
        }
      })
    ]});

  const form = Skeletons.Box.Y({
    className  : `${inviteFormFig}__container`,
    kids       : [
      emailorIdent,
      name,
      message,
      errorWrapper
    ]});
  
  const a = Skeletons.Box.Y({
    className   : `${inviteFormFig}__main`,
    debug       : __filename,
    kids        : [
      header,
      form,
      buttons
    ]});
  
  return a;
};

module.exports = __skl_contact_invitationForm;