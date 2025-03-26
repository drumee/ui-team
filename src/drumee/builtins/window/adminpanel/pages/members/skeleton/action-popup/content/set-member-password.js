// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/content/reset-member-password.js
//   TYPE : Skeleton
// ===================================================================**/
function __set_member_password(_ui_) {
  let service = "confirm-change-member-password";
  const contentFig = `${_ui_.fig.family}-action-popup-confirmation`;
  let pw = Skeletons.EntryBox({
    uiHandler: _ui_,
    className: `${contentFig}__password`,
    service,
    placeholder: LOCALE.PASSWORD,
    mode: _a.commit,
    sys_pn: 'ref-password',
    shower: 1
  })
  _ui_.mset({
    serviceType: service
  })


  const content = Skeletons.Box.Y({
    className: `${contentFig}__content`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__note sub-header`,
        content: LOCALE.CHANGE_PASSWORD
      }),

      require('../profile-display').default(_ui_),
      pw
    ]
  })

  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel: LOCALE.CANCEL || '',
    cancelService: 'close-overlay',
    confirmLabel: LOCALE.CONFIRM,
    confirmService: service,
    confirmBtnAction: 'reset'
  });

  buttons.className = `${buttons.className} resend-link`;


  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${contentFig}__content reset-member-password`,
    kids: [
      content,
      buttons
    ]
  });

  return a;


}

export default __set_member_password;
