// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/slider/vegas/skeleton/standard
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __vega_skl_std
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __vega_skl_std = function(view) {
  const handler = {ui : this};
  const btn_close = {
    width: _K.size.px30,
    height: _K.size.px30,
    position: _a.absolute,
    right: _K.size.px10,
    top: _K.size.px10,
    'background-color': 'rgba(255,255,255, .3)',
    'border-radius': "50%",
    overflow: _a.hidden,
    'z-index': 2000,
    padding: _K.size.px5
  };
  const btn_left = {
    width: _K.size.px50,
    height: _K.size.px50,
    position: _a.absolute,
    left: _K.size.px10,
    top: "45%",
    'background-color': _a.transparent,
    'z-index': 2000,
    padding: _K.size.px5
  };
  const btn_right = {
    width: _K.size.px50,
    height: _K.size.px50,
    position: _a.absolute,
    right: _K.size.px10,
    top: "45%",
    'background-color': _a.transparent,
    'z-index': 2000,
    padding: _K.size.px5
  };
  const caption = {
    position: _a.absolute,
    margin:_a.auto,
    bottom:_K.size.px5,
    height:_a.auto,
    width: _K.size.full,
    'background-color': _a.transparent
  };
  const a = [
    SKL_SVG("cross-close", {handler, service:_a.close}, btn_close),
    SKL_SVG("caret-left", {handler, service:"previous"}, btn_left),
    SKL_SVG("caret-right", {handler, service:"next"}, btn_right),
    SKL_Box_V(view, {sys_pn: _a.image, className:_C.full}),
    SKL_Box_H(view, {sys_pn: _a.caption, justify : _a.center}, caption)
  ];
  return a;
};
module.exports = __vega_skl_std;