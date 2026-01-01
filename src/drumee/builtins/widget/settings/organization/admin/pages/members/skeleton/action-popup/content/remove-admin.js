// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/content/remove-admin.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_content_remove_admin (_ui_) {
  const contentFig = `${_ui_.fig.family}-action-popup-confirmation`;
  
  const header = Skeletons.Note({
    className : `${contentFig}__note header`,
    content   : LOCALE.PANELADMIN_REMOVE_ADMIN //'Remove Admin?'
  });

  const subHeader = Skeletons.Note({
    className : `${contentFig}__note sub-header`,
    content   : LOCALE.REMOVE_ADMIN_RIGHTS //'Do you want to remove the admin rights for:'
  });

  const profileDisplay = require('../profile-display').default(_ui_)
  
  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : LOCALE.REMOVE || '',
    confirmService    : 'confirm-remove-admin',
    confirmBtnAction  : 'remove'
  });

  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${contentFig}__content remove-admin`,
    kids        : [
      header,
      subHeader,
      profileDisplay,
      Skeletons.Box.X({
        className   : `${contentFig}__buttons-container`,
        kids:[buttons]
      })
    ]
  });

  return a;
};

export default __skl_members_action_popup_content_remove_admin;
