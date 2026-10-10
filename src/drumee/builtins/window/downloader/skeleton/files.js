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

  const { aggregate, row, fileIcon } = require('./rows');

  // One row per item: its file-type icon — or, for a folder or a workspace,
  // the area-tinted folder art of the Files list and the breadcrumb
  // (media/grid/template/folder) — personal, private, shared, public — with
  // the area badge on a workspace. isAttachment: no kebab on a 24px glyph.
  // The count is the size while pending; a folder's is known once zipped.
  const folderArt = require("media/grid/template/folder");
  const isTree = (v) => [_a.hub, _a.folder].includes(v.mget(_a.filetype));
  const item = (v, index) => {
    const name = String(v.mget(_a.filename) || '').replace(/\<.+\>/, '');
    const ext = String(v.mget(_a.extension) || v.mget(_a.ext) || '').toLowerCase();
    const full = ext ? `${name}.${ext}` : name;
    const size = Number(v.mget(_a.filesize)) || 0;
    const icon = isTree(v)
      ? Skeletons.Element({
        className : `${pfx}__item-icon ${pfx}__item-folder`,
        content   : folderArt({
          area      : v.mget(_a.area),
          filetype  : v.mget(_a.filetype) === _a.hub ? _a.hub : _a.folder,
          role      : v.mget(_a.filetype) === _a.hub ? 'desk' : '',
          widgetId  : `dl-${_ui_._id}-${index}`,
          isAttachment: 1
        })
      })
      : fileIcon(pfx, full);
    return row(pfx, {
      index,
      icon,
      name : full,
      meta : size && !isTree(v) ? filesize(size) : ''
    });
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
    body  : [ aggregate(pfx), files ],
    cancel: { service: 'abort-files', sys_pn: 'files-cancel', content: LOCALE.CANCEL_ALL || LOCALE.CANCEL },
    done  : { sys_pn: 'files-action' },
    text  : LOCALE.X_FILES.format(list.length)
  });
  return frame;
};

module.exports = __window_downloader_files;
