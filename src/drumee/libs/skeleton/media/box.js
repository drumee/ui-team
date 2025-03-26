/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/media/box
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_folder
//
// @param [Object] view
// @param [Object] classes
//
// ===========================================================
const __skl_folder = function(view, classes) {
  let a;
  return a = {
    kind       : KIND.box,
    flow         : _a.horizontal,
    sys_pn       : _a.folder,
    handler    : {
      ui       : view
    },
    kids         : [{
      kind     : KIND.box,
      className  : classes,
      handler    : {
        ui       : view
      }
    }]
  };
};
module.exports = __skl_folder;
