// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/icon-v2
//   TYPE : 
// ==================================================================== *

const _defaultChart = 'ban';

// ===========================================================
// __btn_icon_v2
//
// @param [Object] label
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __btn_icon_v2 = function(label, ext, style) {
  let content;
  if (_I[label.toUpperCase()]) {
    content = _L(_I[label.toUpperCase()]);
  }
  const a = {
    flow      : _a.x,
    chartId   : _defaultChart
  };
    //templateName: _T.wrapper.button_icon
  a.kind    = KIND.button.icon;
  a.content = content || label || _K.char.empty;
  a.signal  = _e.ui.event;
  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/icon-v2'); }
  return a;
};
module.exports = __btn_icon_v2;
