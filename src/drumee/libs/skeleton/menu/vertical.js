/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/menu/vertical
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_menu_v
//
// @param [Object] view
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_menu_v = function(view, ext, style) {
  const a = {
    kind     : 'menu-topic-prev', //KIND.menu.topic
    flow     : _a.vertical
  };
  if (_.isObject(ext)) {
    if ((ext.sys_pn != null) && (ext.className == null)) {
      ext.className = ext.sys_pn;
    }
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = __skl_menu_v;
