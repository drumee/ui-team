
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
  let filename = require('./filename')(m);
  switch (m.filetype) {
    case _a.folder:
    case _a.hub:
      html = require('./folder')(m) + filename;
      break;
    case _a.audio:
      html = require('./filetype/audio.txt').default + filename;
      break;
    case _a.note:
      html = require('./filetype/note.txt').default + filename;
      break;
    default:
      html = require('./preview')(m) + filename;
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

  // if (m.isalink && (m.filetype !== _a.hub)) {
  //   html = html + require('../../template/shortcut')(m);
  // }

  // if ((m.filetype === _a.hub) && (m.dmz_expiry === _a.expired)) {
  //   html = html + require('../../template/expiry-status')(m);
  // }

  return `<div class=\"full media-grid__content ${m.filetype}\">${html}</div>`;
};

module.exports = __media_tpl_grid;     
