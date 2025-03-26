/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : toolkit/skeleton/progress
//   TYPE : Skeleton
// ==================================================================== *

const __builder = require("../builder");

const __skl_progress = function(props, style) {
  props = props || {};
  props.loader = props.loader || props.client || props.listener;
  props.name   = props.name   || props.filename || props.loader.get(_a.filename);
  const x = new __builder(props, style);
  const a = x.render({ kind:KIND.progress });
  if ((a.content == null)) {
    a.content = '';
  }
  return a;
};

module.exports = __skl_progress;
