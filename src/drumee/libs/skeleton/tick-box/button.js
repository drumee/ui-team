// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/tick-box/radio
//   TYPE : 
// ==================================================================== *

// ======================================================
// Radio box
// ======================================================

// ===========================================================
// __tbx_radio
//
// @param [Object] model
// @param [Object] label
//
// @return [Object] 
//
// ===========================================================
const __skl_tick_button = function(label, ext, style, styleIcon) {
  const a = {
    kind     : KIND.button.icon,
    justify  : _a.center,
    content  : label,
    chartId  : "editbox_list-squareno",
    icons    : ["editbox_list-squareno", "checked"],
    state    : 0,
    styleIcon : {
      fill : '#4184f3',
      height: "14px",
      width: "14px"
    },
    iconPosition : _a.left
  };

  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  if (_.isObject(styleIcon)) {
    a.styleIcon = a.styleIcon || {};
    _.extend(a.styleIcon, styleIcon);
  }
  return a;
};
module.exports = __skl_tick_button;