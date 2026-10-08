const { filesize } = require("@drumee/ui-essentials");

// Multiple-files download in progress (index.js downloadFiles). Replaces the
// small progress bar each row used to mount inside its own
// media-row__container while it streamed: the downloader fetches the files
// itself, one after the other, and reports here.
//
// In the upload window's frame (skeleton/frame.js): the aggregate bar for the
// whole selection, then one row per file, as upload's progress rows.
//
// Rows are built once, here, from ui._files.list; index.js then repaints each
// row in place (_paintItem: data-status and its count) rather than
// re-rendering the list on every chunk. Texts are plain Elements, not Notes:
// a Note keeps its text one div deeper (.note-content).
const __window_downloader_files = function(_ui_) {
  const pfx = _ui_.fig.family;
  const list = (_ui_._files && _ui_._files.list) || [];

  const aggregate = Skeletons.Box.Y({
    className : `${pfx}__aggregate`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__bar`,
        kids      : [
          Skeletons.Element({ className: `${pfx}__bar-fill`, content: '' })
        ]}),
      Skeletons.Box.X({
        className : `${pfx}__meta`,
        kids      : [
          Skeletons.Element({ className: `${pfx}__meta-bytes`, content: '' }),
          Skeletons.Element({ className: `${pfx}__meta-percent`, content: '' })
        ]})
    ]});

  // One row per file — the upload window's __progress-row (upload-progress
  // index.js _buildProgressRow): a single-line tile, its file-type icon (the
  // same getFileIcon) and the name on the left; on the right a small count —
  // the size while pending, the percentage while downloading — and the status:
  // a spinner, a check, or a warning. The skin shows the right ones off
  // data-status, which _paintItem keeps. The name is escaped: Element content
  // is HTML.
  const { getFileIcon } = require("../../upload-progress/skeleton/helpers");
  const item = (v, index) => {
    const name = String(v.mget(_a.filename) || '').replace(/\<.+\>/, '');
    const ext = String(v.mget(_a.extension) || v.mget(_a.ext) || '').toLowerCase();
    const full = ext ? `${name}.${ext}` : name;
    const size = Number(v.mget(_a.filesize)) || 0;
    return Skeletons.Box.X({
      className : `${pfx}__item`,
      dataset   : { index: String(index), status: 'pending' },
      kids      : [
        Skeletons.Box.X({
          className : `${pfx}__item-left`,
          kids      : [
            Skeletons.Button.Svg({
              className : `${pfx}__item-icon`,
              ico       : getFileIcon({ name: full }),
              active    : 0
            }),
            Skeletons.Element({
              className : `${pfx}__item-name`,
              content   : _.escape(full)
            })
          ]}),
        Skeletons.Box.X({
          className : `${pfx}__item-right`,
          kids      : [
            Skeletons.Element({
              className : `${pfx}__item-meta`,
              content   : size ? filesize(size) : ''
            }),
            Skeletons.Box.X({ className: `${pfx}__item-spinner` }),
            Skeletons.Button.Svg({
              className : `${pfx}__item-check`,
              ico       : 'checked-circle',
              active    : 0
            }),
            Skeletons.Button.Svg({
              className : `${pfx}__item-error`,
              ico       : 'apps-warning',
              active    : 0,
              tooltips  : LOCALE.ERROR
            })
          ]})
      ]});
  };

  const files = Skeletons.Box.Y({
    className : `${pfx}__items`,
    kids      : list.map(item)
  });

  const frame = require('./frame')(_ui_, {
    cls   : `${pfx}__files`,
    title : Skeletons.Element({
      className : `${pfx}__heading ${pfx}__files-title`,
      content   : LOCALE.DOWNLOADING
    }),
    body  : [ aggregate, files ],
    cancel: { service: 'abort-files', sys_pn: 'files-cancel', content: LOCALE.CANCEL_ALL || LOCALE.CANCEL },
    done  : { sys_pn: 'files-action' },
    text  : LOCALE.X_FILES.format(list.length)
  });
  return frame;
};

module.exports = __window_downloader_files;
