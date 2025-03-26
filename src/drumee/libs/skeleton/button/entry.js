/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/entry
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// __skl_button
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skl_button = function(key, ext, style) {
  if (key == null) { key = _a.toggle; }
  const target = {
    kind       : KIND.button._,
    signal     : _e.ui.event
  };
  if ((target.service == null)) {
    target.service = key;
  }
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    target.styleOpt = target.styleOpt || {};
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __skl_button;