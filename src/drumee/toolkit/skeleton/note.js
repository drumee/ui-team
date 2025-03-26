/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/skeleton/note
//   TYPE : Skeleton
// ==================================================================== *

const __builder = require("../builder");

const __skl_note = function(props, style) {
  if (_.isString(props)) {
    props = { 
      content   : props,
      className : ""
    };
  }
  if (_.isString(style) && _.isEmpty(props.className)) {
    props.className = style;
    style = {};
  }
    
  props = props || {};
  const x = new __builder(props, style);
  const a = x.render({ kind:KIND.note });
  if ((a.content == null)) {
    a.content = '';
  }
  return a;
};

module.exports = __skl_note;