
/**
 * 
 * @param {*} ui 
 * @returns 
 */
const __media_tpl_grid = function (ui) {

  let html;
  const m = ui.model.toJSON();
  m.imgCapable = ui.imgCapable();
  m._id = ui._id;
  m.fig = ui.fig;
  switch (m.filetype) {
    case _a.folder:
    case _a.hub:
      html = require('./folder')(m);
      break;
    case _a.audio:
      html = require('./filetype/audio.txt').default;
      break;
    case _a.note:
    case 'markdown':
      html = require('./filetype/note.txt').default;
      break;
    default:
      html = require('./preview')(m);
  }
  html = html + require('./filename')(m)
  if (!Visitor.inDmz) {
    html = html + require('../../template/notify')(m);
  }

  return `<div class=\"full media-grid__content ${m.filetype}\">${html}</div>`;
};

module.exports = __media_tpl_grid;     
