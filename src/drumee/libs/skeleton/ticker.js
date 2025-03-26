// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/ticker
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_ticker
//
// @param [Object] view
// @param [Object] name
// @param [Object] label
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_ticker = function(view, name, label, ext, style) {
  const target = {
    kind      : KIND.ticker,
    name,
    label     : label || name,
    signal    : _e.ui.event,
    service   : _a.styleOpt
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
module.exports = __skl_ticker;
