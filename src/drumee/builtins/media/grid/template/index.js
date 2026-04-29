
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
    default:
      // audio, note, markdown and all file types route through preview.js.
      // preview.js uses phosphorNameFor() to resolve Phosphor sprite glyphs.
      // Legacy filetype/*.txt static blobs are intentionally bypassed.
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
    const dateHtml = dateText ? `<span class="media-grid__date">${dateText}</span>` : '';
    html =
      `<div class="media-grid__background">${preview}</div>` +
      `<div class="media-grid__meta-row">` +
        `<div class="media-grid__meta-row-top">${filenameHtml}</div>` +
        `${dateHtml}` +
      `</div>`;
  }

  if (!Visitor.inDmz) {
    html = html + require('../../template/notify')(m);
  }

  return `<div class=\"full media-grid__content ${m.filetype}\">${html}</div>`;
};

module.exports = __media_tpl_grid;     
