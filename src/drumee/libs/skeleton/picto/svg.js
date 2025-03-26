// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/picto/svg
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __btn_box
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __btn_box = function(view) {
  const innerClass = view.get(_a.innerClass) || _a.innerClass;
  const pictoClass = view.get(_a.pictoClass) || "svg-icon";
  const picto = view.get(_a.picto) || _a.rss;
  const a = [
    SKL_SVG(picto, {chartId:picto, className:pictoClass}),
    SKL_Note(_a.base, view.get(_a.label), {className:innerClass})
  ];
  return a;
};
module.exports = __btn_box;