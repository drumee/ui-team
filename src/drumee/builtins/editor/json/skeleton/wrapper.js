// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/builtins/editor/json/skeleton/wrapper
//   TYPE : 
// ==================================================================== *

// ======================================================
// JSON editor
// ======================================================

// ===========================================================
// __jed_wrapper
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __jed_wrapper = function (view) {
  const width = window.innerWidth / 2;
  const height = window.innerHeight - 200;
  const mainStyle = {
    width,
    height,
    'background-color': _a.white,
    'margin-left': 45,
    'margin-top': 60
  };
  const content = [require('skeleton/spinner/circles')()];
  const main = [{
    kind: KIND.box,
    flow: _a.vertical,
    className: _C.full,
    kids: [
      Skeletons.Box.Y({
        sys_pn: "jed-main",
        justify: _a.top,
        className: "flexgrid-1 jed-main",
        kids: content
      })
    ]
  }];
  const anim = require('utils/anim/fade-in')(.5, Power2.easeIn);
  const a = SKL_Box_H(view, {
    className: "jed-outer",
    debug: __filename,
    kids: main,
    anim
  }, mainStyle);
  return a;
};
module.exports = __jed_wrapper;
