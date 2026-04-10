
/**
 * 
 * @param {*} ui 
 * @returns 
 */
const __media_tpl_grid = function (ui) {

  let html;
  const m = ui.model.toJSON();
  m._id = ui._id;
  m.fig = ui.fig;
  switch (m.filetype) {
    case _a.folder:
    case _a.hub:
      html = require('./folder')(m);
      break;
    default:
      html = require('./preview')(m);
  }

  return `<div class="full ${ui.fig.family}__preview ${m.filetype}">${html}</div>`;
};

module.exports = __media_tpl_grid;     
