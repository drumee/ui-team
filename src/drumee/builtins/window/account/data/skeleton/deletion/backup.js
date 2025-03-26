
const { filesize } = require("core/utils")
const __account_data_deletion_backup = function(_ui_, data) {
  const size = filesize(data.size);
  const pfx = `${_ui_.fig.family}-deletion`;
  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Note({
        content   : LOCALE.CLOSE,
        className : `${pfx}__btn action`,
        service   : 'close-dialog',
        sys_pn    : "action-button",
        partHandler : _ui_, 
        uiHandler   : [_ui_]})
    ]});
    
  const check_data = Skeletons.Box.X({
    className: `${pfx}__check-data`,
    sys_pn : "check-data",
    partHandler: [_ui_],
    state  : 0,
    kids: [
      Skeletons.Button.Label({
        label     : LOCALE.ACCOUNT_CONFIRM_BACKUP,
        ico       : 'backoffice_checkboxfill',
        className : `${pfx}__check-data cancel`,
        service   : 'tickbox',
        sys_pn    : "tickbox",
        state     : 0,
        uiHandler : [_ui_],
        icons     : ["box-tags", "backoffice_checkboxfill"]})
    ]});

  const progress = {  
    kind : 'progress_bar',
    sys_pn : "progress",
    partHandler: _ui_,
    className: `${pfx}__progress`,
    label: (size.printf(LOCALE.BACKUP_TIPS)),
    total:size,
    autoDestroy : _a.no,
    uiHandler:[_ui_]
  };

  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug     : __filename,
    kids      : [
      require("./header")(_ui_),
      require("./steps")(_ui_),
      Skeletons.Box.Y({
        className: `${pfx}__content`,
        sys_pn : _a.content,
        partHandler : [_ui_],
        kids: [progress, check_data]}),
      footer
    ]});

  return a; 
};

module.exports = __account_data_deletion_backup;
