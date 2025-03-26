// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/action-popup/content/block-unblock-member.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_action_popup_content_block_unblock_member (_ui_) {
  const contentFig = `${_ui_.fig.family}-action-popup-confirmation`;
  const data = _ui_.mget(_a.member)
  
  let type = 'block'
  let confirmLabel = LOCALE.BLOCK // 'block'
  let subContentText = LOCALE.NOT_ACCESS_DESKTOP_UNTIL_YOU_UNBLOCK //'He/She will not be able to access their desktop until you unblock.'
  if (data.status == _a.locked) {
    type = 'unblock'
    confirmLabel = LOCALE.UNBLOCK//'unblock' 
    subContentText = LOCALE.ACCESS_DESKTOP_NOW //'He/She will be able to access their desktop now.'
  }
  const label = LOCALE[type.toUpperCase()] || '';
  const content = Skeletons.Box.Y({
    className  : `${contentFig}__content`,
    kids: [
      Skeletons.Note({
        className : `${contentFig}__note sub-header ${type}`,
        content   : (label.toLowerCase().printf(LOCALE.BLOCK_DESKTOP_ACCESS_CONFIRMATION)) // `Confirm you want to ${type} desktop access for:`
      }),

      require('../profile-display').default(_ui_),

      Skeletons.Note({
        className : `${contentFig}__note sub-content ${type}`,
        content   : subContentText
      }),

    ]
  })
  
  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : confirmLabel,
    confirmService    : 'confirm-block-unblock',
    confirmBtnAction  : type
  });

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${contentFig}__content ${type}-member`,
    kids        : [
      content,
      buttons
    ]
  });

  return a;
};

export default __skl_members_action_popup_content_block_unblock_member;
