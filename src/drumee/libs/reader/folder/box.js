/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/folder/box
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_folder
//
// @param [Object] view
// @param [Object] ext
//
// ===========================================================
const __skl_folder = function(view, ext) {
  let a;
  return a = {
    kind       : KIND.box,
    flow         : _a.horizontal,
    handler   : {
      ui      : view
    },
    sys_pn       : _a.folder,
    kids         : [{
      kind     : KIND.box,
      handler   : {
        ui      : view
      },
      className  : "fa fa-folder"
    }]
  };
};
module.exports = __skl_folder;
