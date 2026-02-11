
export default function (_ui_) {
  const contentFig = `${_ui_.fig.family}-action-popup-confirmation`;
  const data = _ui_.mget(_a.member)

  let type = 'archive'
  let confirmLabel = LOCALE.ARCHIVE 
  let subContentText = (`«${LOCALE.ARCHIVES}».`.printf(LOCALE.YOU_WILL_BE_ABLE_TO_ACCESS_PROFILE_IN)) //"&#60;&#60;Archive&#62;&#62;." //You will be able to access his/her profile in
  if (data.status == _a.archived) {
    type = 'unarchive'
    confirmLabel = LOCALE.UNARCHIVE
    subContentText = (`«${LOCALE.MEMBERS_LIST}».`.printf(LOCALE.YOU_WILL_BE_ABLE_TO_ACCESS_PROFILE_IN)) //"&#60;&#60;Member list&#62;&#62;."//You will be able to access his/her profile in
  }
  const label = LOCALE[type.toUpperCase()] || '';
  const content = Skeletons.Box.Y({
    className  : `${contentFig}__content`,
    kids: [
      Skeletons.Note({
        className : `${contentFig}__note sub-header ${type}`,
        content   : (label.toLowerCase().printf(LOCALE.CONFIRM_YOU_WANT_TO_ARCHIVE_DESKTOP_OF))//`Confirm you want to ${type} desktop of:`
      }),

      require('../profile-display').default(_ui_),

      Skeletons.Note({
        className : `${contentFig}__note sub-content ${type}`,
        content   : subContentText
      })
    ]
  })
  
  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel,
    confirmService    : 'cpmmit-toggle-archive-member',
    confirmBtnAction  : type
  });

  
  return Skeletons.Box.Y({
    debug       : __filename,
    className   : `${contentFig}__content archive-member`,
    kids        : [
      content,
      buttons
    ]
  });

};

