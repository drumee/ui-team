
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
    const date = m.age || m.date || '';
    const dateHtml = date ? `<span class="media-grid__date">${date}</span>` : '';
    html =
      `<div class="media-grid__background">${preview}</div>` +
      `<div class="media-grid__meta-row">` +
        `<div class="media-grid__meta-row-top">${filenameHtml}</div>` +
        `${dateHtml}` +
      `</div>`;
  }

  if (!Visitor.inDmz) {
    html = html + require('../../template/command')(m);
    html = html + require('../../template/notify')(m);
    //do not change -> because it wil affect external sharebox DMZ
    if (!m.isAttachment && (m.filetype !== _a.schedule)) {
      html = html + require('../../template/checkbox')(m);
    }

  } else {
    if (m.privilege & _K.permission.download) {
      html = html + require('../../template/checkbox')(m);
    }
  }

  return `<div class=\"full media-grid__content ${m.filetype}\">${html}</div>`;
};

module.exports = __media_tpl_grid;     
