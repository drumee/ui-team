/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : libs/skeleton/button/icon
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skeleton_button_icon
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skeleton_button_icon = function(key, text, ext, style) {
  if (key == null) { key = _a.base; }
  const a  = {
    kind    : KIND.button.icon,
    content : text || _I[key.toUpperCase()] || key || _K.char.empty,
    chartId : key || 'editbox_icon',
    iconPosition : _a.left,
    styleIcon : {
        width  : "1.5em",
        height : "1.5em"
      },
    signal  : _e.ui.event
  };
  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  return a;
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/button-icon'); }
  return a;
};
module.exports = __skeleton_button_icon;
