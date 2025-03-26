
const __skl_schedule_description = function(_ui_) {
  let descriptionView, rowClass;
  const pfx = _ui_.fig.family;
  const descEditMode = _ui_._descEditMode || false;

  if (!descEditMode) {
    rowClass = 'view-mode';
    descriptionView = [
      Skeletons.Note({
        className : `${pfx}__text description`,
        content   : _ui_.mget(_a.message)
      }),
      Skeletons.Button.Svg({
        ico       : "desktop_sharebox_edit",
        className : `${_ui_.fig.family}__edit-icon edit`,
        service   : 'edit-message'
      })
    ];
  } else {
    rowClass = 'edit-mode';
    descriptionView = [
      Skeletons.Entry({
        className   : `${pfx}__entry message`,
        type        : _a.textarea,
        name        : _a.message,
        formItem    : _a.message,
        innerClass  : _a.message,
        placeholder : LOCALE.WHY,
        value       : _ui_.mget(_a.message) || ''
      }),
      Skeletons.Note({
        className : `${pfx}__ok-btn `,
        content   : 'ok',
        service   : 'save-message'
      })
    ];
  }

  const descriptionRow = Skeletons.Box.X({
    className   : `${pfx}__container description ${rowClass}`,
    kids        : [
      Skeletons.Button.Svg({
        ico       : "drumee-agenda",
        className : `${pfx}__icon description`
      }),
      Skeletons.Box.X({
        className   : `${pfx}__container-body description`,
        kids        : descriptionView
      })
    ]});

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${pfx}__description-main`, 
    kids        : [
      descriptionRow
    ]});
  
  return a;
};
  
module.exports = __skl_schedule_description;
