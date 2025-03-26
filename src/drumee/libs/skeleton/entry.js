/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/entry/text
//   TYPE : 
// ==================================================================== *

// ==================================================================== *
  // ======================================================
  //
  // ======================================================

// ===========================================================
// _exported
//
// @param [Object] view
// @param [Object] name
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const _exported = function(view, name, ext, style) {
  let label;
  if (name != null) {
    label = _I[name.toUpperCase()];
  }
  const a = {
    kind    : KIND.entry,
    service : name,
    name,
    //value   : view?.get(_a.styleOpt)?[name]
    //picto   : Utils.getPicto(name)
    placeholder : label,
    signal  : _e.ui.event
  };
    //templateName: "#--wrapper-input"
  if (ext != null) {
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = _exported;