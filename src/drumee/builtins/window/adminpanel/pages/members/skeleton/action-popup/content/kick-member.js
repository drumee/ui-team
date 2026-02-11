export default function (ui) {
  const contentFig = `${ui.fig.family}-action-popup-confirmation`;

  const header = Skeletons.Note({
    className: `${contentFig}__note header`,
    content: "Really kick this member out"
  });

  const subHeader = Skeletons.Note({
    className: `${contentFig}__note sub-header`,
    content: `Content belonging to your organization will be removed from the member.
    However personal content remain available to the member.`
  });

  const profileDisplay = require('../profile-display').default(ui, 'no-sub-content')

  const buttons = Preset.ConfirmButtons(ui, {
    cancelLabel: LOCALE.CANCEL || '',
    cancelService: 'close-overlay',
    confirmLabel: LOCALE.KICK_OUT_MEMBER || '',
    confirmService: 'commit-kick-out',
    confirmBtnAction: 'destroy'
  });


  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${contentFig}__content prompt-delete-member`,
    kids: [
      header,
      subHeader,
      profileDisplay,
      buttons
    ]
  });

  return a;
};
