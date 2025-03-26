// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/skeleton/entry
//   TYPE : Skeleton
// ==================================================================== *

const __builder = require("../../builder");

const __skl_note = function(props, style) {
  props = _.merge({autocomplete: _a.off}, props);

  const x = new __builder(props, style);
  const a = x.render({ kind:KIND.entry_reminder });
  return a;
};

module.exports = __skl_note;