/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/svg
//   TYPE :
// ==================================================================== *


// ===========================================================
// __skeleton_svg
//
// @param [Object] key
//
// @return [Object]
//
// ===========================================================
const __skeleton_svg = function(key, ext, style) {
  if (key == null) { key = "rss"; }
  const def_style = {
    width: _K.size.px40,
    height:_K.size.px40,
    padding : _K.size.px10
  };
  const target =
    {chartId : key};
  target.chartId  = target.chartId || key;
  target.kind     = KIND.image.svg;
  target.signal   = _e.ui.event;
  target.service  = key;
  target.styleOpt = target.styleOpt || def_style;
  //target.mapName  = _a.reader
  if (_.isObject(ext)) {
    _.extend(target, ext);
    if (ext.picto != null) {
      ext.chartId = ext.picto;
    }
  }
  if (_.isObject(style)) {
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __skeleton_svg;
