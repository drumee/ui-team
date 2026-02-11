const { button } = require("builtins/skeleton/toolkit");

function __skl_members_action_popup_content_reset_member_password(ui) {
  const fig = `${ui.fig.family}-action-popup-confirmation`;

  const content = Skeletons.Box.Y({
    className: `${fig}__content`,
    kids: [
      Skeletons.Note({
        className: `${fig}__note sub-header`,
        content: LOCALE.SEND_AGAIN_A_VALIDATION_EMAIL//CONFIRM_SEND_RESET_PASSWORD_LINK//Confirm you want to send reset password link for:`
      }),

      require('../profile-display').default(ui),
    ]
  })

  let buttonsFig= `${ui.fig.family}-action-popup`
  let buttons = Skeletons.Box.X({
    className: `${buttonsFig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${buttonsFig}__button`,
        service: 'close-overlay',
        priority: "secondary",
      }), button(ui, {
        label: LOCALE.RESEND_INVITE,
        type: _a.toggle,
        ico: "arrow-right",
        service: _e.submit,
        className: `${buttonsFig}__button`,
        priority: "primary",
        service: 'commit-reset-member-password',
      })
    ],
  })

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__content reset-member-password`,
    kids: [
      content,
      buttons
    ]
  });
};

export default __skl_members_action_popup_content_reset_member_password;
