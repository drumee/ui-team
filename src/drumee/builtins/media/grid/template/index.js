
// Human-readable file size for the chat attachment card (Figma "1.2 MB").
const humanFileSize = (bytes) => {
  const n = Number(bytes);
  if (!n || n < 0) return '';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
};

/**
 *
 * @param {*} ui
 * @returns
 */
const __media_tpl_grid = function (ui) {

  let html;
  let preview;
  let isFolder = false;
  const m = ui.model.toJSON();
  m.imgCapable = ui.imgCapable();
  m._id = ui._id;
  m.fig = ui.fig;
  switch (m.filetype) {
    case _a.folder:
    case _a.hub:
      preview = require('./folder')(m);
      isFolder = true;
      break;
    case _a.audio:
      preview = require('./filetype/audio.txt').default;
      break;
    case _a.note:
    case 'markdown':
      preview = require('./filetype/note.txt').default;
      break;
    default:
      preview = require('./preview')(m);
  }

  const filenameHtml = require('./filename')(m);

  if (isFolder) {
    // Folder/hub items keep flat layout (SVG folder shape + absolute-positioned filename).
    html = preview + filenameHtml;
  } else {
    // File items match Figma: 119x119 rounded card + 32px meta row (filename + kebab + date).
    // Date formatted from ctime (unix epoch). Recent (< 7d) → "3 days ago",
    // older → "Oct 12, 2023" per Figma. Skip render if timestamp invalid (0/null).
    const ts = Number(m.ctime) || Number(m.mtime) || 0;
    let dateText = '';
    if (ts > 0) {
      const d = Dayjs.unix(ts);
      const ageDays = Dayjs().diff(d, 'day');
      dateText = ageDays < 7 ? d.fromNow() : d.format('MMM D, YYYY');
    }
    // Chat attachment card (Figma): second meta line is "<size> · Show in folder"
    // instead of the date. Regular file grids keep the date.
    let secondLine;
    let metaTop = filenameHtml;
    // Attachment cards get a remove ("X") button so a queued file can be
    // dropped before the message is sent. command.js returns the shared
    // remove markup (data-service="remove-upload") when m.isAttachment; the
    // whole downstream chain (getService → media/interact removeMedia →
    // chat removeUpload → SERVICE.chat.upload_remove) already exists.
    let removeBtn = '';
    if (m.isAttachment) {
      const size = humanFileSize(m.filesize);
      const sizeHtml = size ? `<span class="media-grid__filesize">${size}</span>` : '';
      const sep = size ? `<span class="media-grid__meta-sep"> · </span>` : '';
      secondLine =
        `<span class="media-grid__chatmeta">` +
          `${sizeHtml}${sep}` +
          `<a class="media-grid__reveal" data-service="show-in-folder">${LOCALE.SHOW_IN_FOLDER}</a>` +
        `</span>`;
      removeBtn = require('../../template/command')(m);

      // Filename uses the default single-line render (metaTop = filenameHtml);
      // it truncates with an ellipsis and the extension is allowed to be clipped
      // when too long — it is no longer split out and pinned.
    } else {
      secondLine = dateText ? `<span class="media-grid__date">${dateText}</span>` : '';
    }
    html =
      `<div class="media-grid__background">${preview}${removeBtn}</div>` +
      `<div class="media-grid__meta-row">` +
        `<div class="media-grid__meta-row-top">${metaTop}</div>` +
        `${secondLine}` +
      `</div>`;
  }

  if (!Visitor.inDmz) {
    html = html + require('../../template/notify')(m);
  }

  return `<div class=\"full media-grid__content ${m.filetype}\">${html}</div>`;
};

module.exports = __media_tpl_grid;     
