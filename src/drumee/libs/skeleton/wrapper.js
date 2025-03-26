/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/wrapper
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_wrapper
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skl_wrapper = function(key, text, ext, style) {
  if (key == null) { key = _a.base; }
  const target = {
    kind    : KIND.wrapper,
    content : text || _I[key.toUpperCase()] || key || _K.char.empty,
    service : key,
    signal  : _e.ui.event
  };
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    target.styleOpt = target.styleOpt || {};
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __skl_wrapper;
