/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/slider/drumee/skeleton/main
//   TYPE : 
// ==================================================================== *

// ==================================================================== *
  // **********************************************************************
  //
  // DESK MAIN PAGE
  //
  // **********************************************************************

// ===========================================================
// _exported
//
// @param [Object] view
//
// ===========================================================
const _exported = function(view) {
  let a;
  return a =[{
      kind   : KIND.box,
      flow     : _a.horizontal,
      sys_pn   : _a.panel,
      styleOpt: {
        height : _K.size.full,
        width  : _K.size.full
      }
    },{
      kind   : KIND.box,
      flow     : _a.horizontal,
      sys_pn   : _a.content,
      kind   : KIND.box,
      styleOpt: {
        height : _a.auto,
        width  : _a.auto
      }
    }];
};
module.exports = _exported;
