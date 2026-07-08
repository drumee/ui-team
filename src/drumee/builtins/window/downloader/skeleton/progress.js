const { filesize } = require("@drumee/ui-essentials")

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
  // `size` is the wet-run zip_size response, which comes back null here (the
  // byte total was already resolved in the downloader's onDomRefresh dry run →
  // _ui_._zipsize). Guard it: the old `size.printf(LOCALE.BACKUP_TIPS)` threw
  // "Cannot read properties of null (reading 'printf')" and — printf being a
  // String method — would also throw on the numeric byte count, so the "Single
  // file .zip" button crashed before the download started. BACKUP_TIPS is a
  // static tip (no placeholder), so show it directly and size the bar from the
  // known total.
  const bytes = Number(size) || _ui_._zipsize || 0;
  const progress = {
    kind : 'progress_bar',
    sys_pn : "progress",
    partHandler: _ui_,
    className: `${pfx}__progress`,
    label: LOCALE.BACKUP_TIPS,
    total:filesize(bytes),
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
