const { confirm_buttons } = require("builtins/skeleton/toolkit");

export default function (ui) {
  const contentFig = `${ui.fig.family}-action-popup-confirmation`;

  const header = Skeletons.Note({
    className: `${contentFig}__note header`,
    content: LOCALE.DELETE_INVITATION
  });

  const subHeader = Skeletons.Note({
    className: `${contentFig}__note sub-header`,
    content: LOCALE.CONFIRM_DELETE_INVITATION
  });

  const profileDisplay = require('../profile-display').default(ui, 'no-sub-content')



  return Skeletons.Box.Y({
    debug: __filename,
    className: `${contentFig}__content prompt-delete-member`,
    kids: [
      header,
      subHeader,
      profileDisplay,
      confirm_buttons(ui, { dataset: { height: _a.small } },
        { service: 'close-overlay' },
        { label: LOCALE.DELETE, service: 'commit-delete-inactive-member' }
      )
    ]
  });
};
