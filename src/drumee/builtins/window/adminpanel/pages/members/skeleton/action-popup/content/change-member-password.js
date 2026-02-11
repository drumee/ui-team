export default function (ui) {
  let service = "commit-change-member-password";
  const contentFig = `${ui.fig.family}-action-popup-confirmation`;
  let pw = Skeletons.Box.X({
    className: `${contentFig}__password-main`,
    sys_pn: 'wrapper-pw',
    partHandler: [ui],
    kids: [
      Skeletons.EntryBox({
        uiHandler: [ui],
        type: _a.password,
        className: `${contentFig}__password`,
        service: _e.submit,
        name: _a.password,
        placeholder: LOCALE.PASSWORD,
        mode: _a.commit,
        sys_pn: 'ref-password',
        require: _a.password,
        shower: 1,
        autocomplete: _a.off,
        service,
      })
    ]
  })

  const content = Skeletons.Box.Y({
    className: `${contentFig}__content`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__note sub-header`,
        content: LOCALE.CHANGE_PASSWORD
      }),

      require('../profile-display').default(ui),
      pw
    ]
  })

  const buttons = Preset.ConfirmButtons(ui, {
    cancelLabel: LOCALE.CANCEL || '',
    cancelService: 'close-overlay',
    confirmLabel: LOCALE.CONFIRM,
    confirmService: service,
    confirmBtnAction: 'reset'
  });

  buttons.className = `${buttons.className} resend-link`;


  return Skeletons.Box.Y({
    debug: __filename,
    className: `${contentFig}__content reset-member-password`,
    kids: [
      content,
      buttons
    ]
  });

}

