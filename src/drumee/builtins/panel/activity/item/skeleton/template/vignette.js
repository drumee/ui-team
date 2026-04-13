
module.exports = function (ui) {

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
      html = require('./filetype/note.txt').default;
      break;
    default:
      html = require('./preview')(m);
  }
  if(m.show_name) html = html + require('./filename')(m)
  return `<div class=\"full media-grid__content ${m.filetype}\">${html}</div>`;
};
