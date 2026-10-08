const { filesize } = require("@drumee/ui-essentials")

// .zip download in progress: the server archives the selection, then the
// archive is fetched. In the upload window's frame (skeleton/frame.js), like
// the multiple-files step — the ui-core progress_bar in the body, its tip
// beneath it.
//
// Preserved contracts: 'btn-status' (handleDownload writes the server's phase
// text, downloadZip the done message), 'progress' (the ui-core progress_bar the
// controller drives), 'btn-cancel' (abort, suppressed when done) and
// 'btn-action' (Close, shown by the skin once done).
const __window_downloader_progress = function(_ui_, size) {
  const pfx = _ui_.fig.family;

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

  return require('./frame')(_ui_, {
    cls   : `${pfx}__zip`,
    title : Skeletons.Note({
      className : `${pfx}__heading`,
      sys_pn    : "btn-status",
      content   : LOCALE.IN_PROGRESS
    }),
    body  : [ progress ],
    cancel: { service: 'abort-download', sys_pn: 'btn-cancel', content: LOCALE.CANCEL },
    done  : { sys_pn: 'btn-action' },
    text  : bytes ? filesize(bytes) : ''
  });
};

module.exports = __window_downloader_progress;
