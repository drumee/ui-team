
const { filesize } = require("core/utils")
const __account_data_backup = function(_ui_, data) {
  const size = filesize(data.size);
  const pfx = `${_ui_.fig.family}-deletion`;
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

  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug     : __filename,
    kids      : [
      require("./header")(_ui_),
      require("./steps")(_ui_),
      Skeletons.Box.Y({
        className : `${pfx}__guidelines`,
        kids      : [
          Skeletons.Note({
            className : "items-list",
            sys_pn    : "tips",
            partHandler :[_ui_],
            content : LOCALE.BACKUP_TIPS
          }),
        progress
        ]}),
      footer
    ]});

  return a; 
};

module.exports = __account_data_backup;
