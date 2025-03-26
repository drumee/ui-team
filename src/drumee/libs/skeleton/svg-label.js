/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/svg-label
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_svg_label
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skl_svg_label = function(key, ext, style) {
  if (key == null) { key = "A"; }
  ext = ext || {};
  const a = {
    templateName: _T.wrapper.svg_label,
    chartId  : key,
    label    : ext.label || _K.char.empty,
    kind     : KIND.image.svg,
    signal   : _e.ui.event,
    service  : key,
    mapName  : _a.reader,
    styleOpt  : {
      width   : _K.size.px40,
      height  :_K.size.px40,
      padding : _K.size.px5
    }
  };
  _.extend(a, ext);
  if (_.isObject(style)) {
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = __skl_svg_label;
