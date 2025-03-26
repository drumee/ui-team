/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/note-toggle
//   TYPE : 
// ==================================================================== *

// Hybrid version  : use template and API from note, behavior from button/toggle

// ===========================================================
// __slk_note_toggle
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __slk_note_toggle = function(key, label, ext, style) {
  if (key == null) { key = _a.base; }
  const target = {
    signal      : _e.ui.event,
    templateName: _T.wrapper.id,
    content     : label || _I[key.toUpperCase()] || key || _K.char.empty,
    service     : key,
    label       : _K.char.empty,
    state       : 0,
    pictos: {
      0: _p.toggle_off,
      1: _p.toggle_on
    }
  };
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    target.styleOpt = target.styleOpt || {};
    _.extend(target.styleOpt, style);
  }
  target.kind = KIND.button.toggle;
  return target;
};
module.exports = __slk_note_toggle;
