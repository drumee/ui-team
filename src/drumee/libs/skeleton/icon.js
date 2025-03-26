/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : libs/skeleton/icon
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skeleton_icon
//
//y
//
// @return [Object] 
//
// ===========================================================
const __skeleton_icon = function(manager, ext, style) {

  const a  = {
    kind         : KIND.button.icon,
    iconPosition : _a.left,
    styleIcon    : {
        width  : "1.5em",
        height : "1.5em"
      },
    handler    : { 
      ui       : manager
    },
    signal  : _e.ui.event
  };
  if ((ext != null ? ext.url : undefined) != null) {
    a.iconType = _a.vector;
  }
  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  _dbg("JJJJJJJJJJJJJJJ", a);
  return a;
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/icon'); }
  return a;
};
module.exports = __skeleton_icon;