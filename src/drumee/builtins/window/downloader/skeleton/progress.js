const { filesize } = require("@drumee/ui-essentials")

// .zip download in progress: the server archives the selection, then the
// archive is fetched. In the upload window's frame (skeleton/frame.js), drawn
// like the multiple-files step (files.js, the same parts — rows.js): the
// aggregate bar with its byte count and percentage, then one row, the
// archive's — a spinner while the server builds it, its percentage while it
// is fetched, a check or a warning at the end. index.js repaints them in
// place (_zipPaint, _zipItem).
//
// Preserved contracts: 'btn-status' (the title: the server's phase text, then
// the result), 'btn-cancel' (abort, suppressed when done) and 'btn-action'
// (Close, shown by the skin once done).
const __window_downloader_progress = function(_ui_, size) {
  const pfx = _ui_.fig.family;
  const { aggregate, row } = require('./rows');

  // `size` is the wet-run zip_size response, which comes back null here (the
  // byte total was already resolved in the downloader's onDomRefresh dry run →
  // _ui_._zipsize).
  const bytes = Number(size) || _ui_._zipsize || 0;
  const name = `${_ui_._zipLabel()}.zip`;

  const items = Skeletons.Box.Y({
    className : `${pfx}__items`,
    kids      : [
      row(pfx, {
        index : 0,
        icon  : Skeletons.Button.Svg({ className: `${pfx}__item-icon`, ico: 'app-zip', active: 0 }),
        name,
        status: 'waiting'
      })
    ]
  });

  return require('./frame')(_ui_, {
    cls   : `${pfx}__zip`,
    title : Skeletons.Note({
      className : `${pfx}__heading`,
      sys_pn    : "btn-status",
      content   : LOCALE.IN_PROGRESS
    }),
    body  : [ aggregate(pfx), items ],
    cancel: { service: 'abort-download', sys_pn: 'btn-cancel', content: LOCALE.CANCEL },
    done  : { sys_pn: 'btn-action' },
    text  : bytes ? filesize(bytes) : ''
  });
};

module.exports = __window_downloader_progress;
