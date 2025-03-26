// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/trigger-mini
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// _exported
//
// @param [Object] key
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const _exported = function(key, ext, style) {
  const a = {
    service : key,
    picto   : Utils.getPicto(key),
    kind  : KIND.button.trigger,
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
};
module.exports = _exported;