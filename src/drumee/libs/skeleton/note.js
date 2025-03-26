// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/note
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skeleton_note
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skeleton_note = function(key, text, ext, style) {
  // if not key?
  //   key=''
  const target  = {
    kind    : KIND.note,
    content : text,
    service : key,
    signal  : _e.ui.event,
    mapName : _a.reader
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
module.exports = __skeleton_note;
