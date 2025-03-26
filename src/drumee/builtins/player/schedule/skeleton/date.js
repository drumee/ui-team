const __skl_schedule_date = function(_ui_) {

  let dateView, rowClass;
  const pfx = _ui_.fig.family;
  const dateEditMode = _ui_._dateEditMode || false;
  if (!dateEditMode) {
    rowClass = 'view-mode';
    dateView = [
        Skeletons.Note({
          className     : `${pfx}__text date`,
          content   : _ui_.mget(_a.date)
        }),
        Skeletons.Button.Svg({
          ico       : "desktop_sharebox_edit",
          className : `${_ui_.fig.family}__edit-icon edit`,
          service   : 'edit-date'
        })
      ];
  } else {
    rowClass = 'edit-mode';
    dateView = [
      Skeletons.Entry({
        className    : `${pfx}__entry date`,
        name         : _a.date,
        formItem     : _a.date,
        innerClass   : _a.date,
        placeholder  : LOCALE.WHEN,
        value        : _ui_.mget(_a.date) || '',
        preselect    : 1,
        errorHandler : [_ui_]}),
      
      Skeletons.Note({
        className : `${pfx}__ok-btn `,
        content   : 'ok',
        service   : 'save-date'
      })
    ];
  }

  const date = Skeletons.Box.X({
    className   : `${pfx}__container date ${rowClass}`,
    kids        : [
      Skeletons.Button.Svg({
        ico       : "backoffice_history",
        className : `${_ui_.fig.family}__icon date`
      }),
      Skeletons.Box.X({
        className   : `${pfx}__container-body date`,
        kids        : dateView
      })
    ]});

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${pfx}__date_main`, 
    kids        : [
      date
    ]});
  
  return a;
};
  
module.exports = __skl_schedule_date;
