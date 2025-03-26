// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/content/delete-member.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_content_delete_member (_ui_) {
  const contentFig = `${_ui_.fig.family}-action-popup-confirmation`;
  
  const header = Skeletons.Note({
    className :  `${contentFig}__note header`,
    content   : LOCALE.DELETE_INVITATION
  });

  const subHeader = Skeletons.Note({
    className : `${contentFig}__note sub-header`,
    content   : LOCALE.CONFIRM_DELETE_INVITATION//CONFIRM_DELETE_CONTACT
  });

  const profileDisplay = require('../profile-display').default(_ui_, 'no-sub-content')
  
  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : LOCALE.DELETE || '',
    confirmService    : 'confirm-invite-delete',
    confirmBtnAction  : 'destroy'
  });

  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${contentFig}__content delete-member`,
    kids        : [
      header,
      subHeader,
      profileDisplay,
      buttons
    ]
  });

  return a;
};

export default __skl_members_action_popup_content_delete_member;
