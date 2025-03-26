// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/ticker/skeleton/default
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
  const val   = view.get(_a.start) || 0;
  name  = name || view.get(_a.value) || _K.char.empty;
  label = name || view.get(_a.label) || _K.char.empty;
  const pace  = view.get(_a.pace) || 1;
  const kids = [
    //SKL_Note(null, label, {className: "ticker-label"})
    SKL_Note("tick", "-", {className:'ticker-button ticker-decrease', value: -pace}),
    SKL_Note(null, val.toString(), {className:'ticker-value', value:val, sys_pn: _a.value, justify:_a.center}),
    SKL_Note("tick", "+", {className:'ticker-button ticker-increase', value: +pace})
  ];
  const target = {
    kind      : KIND.box,
    flow      : _a.horizontal,
    className : "ticker-inner",
    kidsOpt   : {
      innerClass : "ticker-inner",
      signal  : _e.ui.event,
      service : 'tick',
      handler : {
        ui    : view
      }
    },
    kids
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
