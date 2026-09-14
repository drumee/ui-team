
// Human-readable file size for the chat attachment card (Figma "1.2 MB").
//
// Moved to libs/file-meta so the share tour's subject row can render the same
// string (Figma 148:41930) instead of copying it. Same function, same output —
// a formatter with two definitions drifts, and this one is the only correct
// answer for these cards: @drumee/ui-essentials `filesize()` is SI and
// two-decimal, which turns "1.2 MB" into "1.26 MB" and "1.5 KB" into "1.54 kB".
const { humanFileSize, chipGlyph } = require('libs/file-meta');

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
  // Composer chip (chat's attachment-wrapper, flagged by media-wrapper's
  // _markIconOnly): a file-TYPE glyph, never a thumbnail, so the queued files
  // read as a list of names rather than a row of pictures.
  //
  // CSS cannot do this: for an image, preview.js emits only a div with an
  // inline background-image, and the sprite is a <symbol> sheet with no
  // url()-addressable form, so there is no glyph on the page to reveal.
  //
  // imgCapable goes off so nothing downstream still treats the card as
  // previewable; the icon itself comes from `chipGlyph` rather than from
  // preview.js's own icon branch, because those two disagree on exactly the
  // types a chip shows most (png -> desktop_picture vs bg-image, txt -> the
  // literal text "txt" vs app-txt-file) and this card has to match the tasks
  // panel's comment chips, which is the same card in another place.
  if (m.iconOnly) m.imgCapable = false;
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

  // Applied AFTER the switch so every non-folder type is covered — a queued
  // .mp3 or .md takes the audio / note branch above and would otherwise keep
  // its own artwork while its neighbours turned into glyphs.
  if (m.iconOnly && !isFolder) {
    // data-ext, not a class naming the glyph: the skin needs to single out the
    // office icons (their page body has no fill and would take the SVG default
    // of black behind the coloured detail), and `preview.js` puts only
    // filetype / area in the class — never the sprite name — so there would be
    // nothing there to match on. The tasks panel's comment chip carries the
    // same attribute for the same rule.
    const chipExt = String(m.extension || m.ext || '').toLowerCase();
    preview =
      `<div class="preview-container ${m.filetype}">` +
        `<svg id="${m._id}-preview" class="preview-icon ${m.filetype}" data-ext="${chipExt}">` +
          Template.Xmlns(chipGlyph(m)) +
        `</svg>` +
      `</div>`;
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
