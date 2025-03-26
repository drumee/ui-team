// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/upload-progress
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_ul_prog
//
// @param [Object] view
// @param [Object] socket
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_ul_prog = function(view, socket, ext, style) {
  const target = {
    kind       : KIND.progress,
    className  : "fill-up",
    name       : socket.get(_a.filename),
    socket,
    handler    : {
      ui       : view
    }
  };
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    target.styleOpt = target.styleOpt || {};
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __skl_ul_prog;
