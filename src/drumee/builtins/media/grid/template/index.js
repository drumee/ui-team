// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */
const __media_tpl_grid =function(_ui_){

  let html;
  const m = _ui_.model.toJSON();
  m.imgCapable = _ui_.imgCapable();
  m._id = _ui_._id;
  m.fig = _ui_.fig;

  if (m.filetype === _a.folder) {
    html = require('./filename')(m);
  } else {
    html = require('./preview')(m) + require('./filename')(m);
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
  if (m.isalink && (m.filetype !== _a.hub)) {
    html = html + require('../../template/shortcut')(m);
  }
  
  if ((m.filetype === _a.hub) && (m.dmz_expiry === _a.expired)) {
    html = html + require('../../template/expiry-status')(m);
  }
  
  return `<div class=\"full media-grid__content ${m.filetype}\">${html}</div>`;
};

module.exports = __media_tpl_grid;     
