const { filesize } = require("core/utils")

const __window_downloader_progress = function(_ui_, size) {
  const pfx = _ui_.fig.family;
  const header = Skeletons.Box.Y({
    className : `${pfx}__header`,
    kids    : [
      Preset.Button.Close(_ui_),
      Skeletons.Box.X({
        className : `${pfx}__labels`, 
        kids    : [
          Skeletons.Note({ 
            className : "line one", 
            sys_pn    : "btn-status",
            content   : LOCALE.IN_PROGRESS
          })
        ]})
    ]});
  const progress = {  
    kind : 'progress_bar',
    sys_pn : "progress",
    partHandler: _ui_,
    className: `${pfx}__progress`,
    label: (size.printf(LOCALE.BACKUP_TIPS)),
    total:filesize(size),
    autoDestroy : _a.no,
    uiHandler:[_ui_],
  };

  const buttons = Skeletons.Box.X({
    className: `${pfx}__buttons`,
    kids: [
      Skeletons.Note({
        service   : 'abort-download',
        content   : LOCALE.CANCEL,
        className : "button cancel",
        sys_pn    : "btn-cancel"
      }),
      Skeletons.Note({
        service   : _a.hide,
        content   : LOCALE.CLOSE,
        className : "button cancel",
        sys_pn    : "btn-action"
      })
    ]});
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${pfx}__main`,
    kids      : [ header, progress, buttons ]});


  return a; 
};

module.exports = __window_downloader_progress;
