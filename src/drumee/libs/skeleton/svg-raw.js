/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/svg-raw
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skeleton_svg_raw
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skeleton_svg_raw = function (key, ext, style) {
  if (key == null) { key = "A"; }
  const { icons } = bootstrap();
  const a = {
    url: `${icons}${key}.svg`,
    templateName: _T.wrapper.svg_raw,
    kind: KIND.image.svg,
    signal: _e.ui.event,
    service: key,
    mapName: _a.reader,
    styleOpt: {
      width: _K.size.px40,
      height: _K.size.px40,
      padding: _K.size.px10
    }
  };
  if (_.isObject(ext)) {
    _.extend(a, ext);
    if (ext.picto != null) {
      ext.chartId = ext.picto;
    }
  }
  if (_.isObject(style)) {
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = __skeleton_svg_raw;
