// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/content/reset-member-password.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_content_reset_member_password (_ui_) {
  const contentFig = `${_ui_.fig.family}-action-popup-confirmation`;
  const data = _ui_.mget(_a.member)

  const content = Skeletons.Box.Y({
    className  : `${contentFig}__content`,
    kids: [
      Skeletons.Note({
        className : `${contentFig}__note sub-header`,
        content   : LOCALE.SEND_AGAIN_A_VALIDATION_EMAIL//CONFIRM_SEND_RESET_PASSWORD_LINK//Confirm you want to send reset password link for:`
      }),

      require('../profile-display').default(_ui_),
    ]
  })
  
  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : LOCALE.CONFIRM,
    confirmService    : 'confirm-reset-member-password',
    confirmBtnAction  : 'reset'
  });

  buttons.className = `${buttons.className} resend-link`;
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${contentFig}__content reset-member-password`,
    kids        : [
      content,
      buttons
    ]
  });

  return a;
};

export default __skl_members_action_popup_content_reset_member_password;
