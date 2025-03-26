/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/test
//   TYPE :
// ==================================================================== *

// EXPORTED
// -----------------------------------------------------
const __test_loader = {

  run(opt){
    return uiRouter.getPart(_PN.preview).feed({
      kind     : KIND.spinner.jump,
      styleOpt : {
        height : 180,
        width  : 180
      }
    });
  }
};
        
module.exports = __test_loader;
