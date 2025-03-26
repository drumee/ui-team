// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/skeleton/note
//   TYPE : Skeleton
// ==================================================================== *

const __core = require("../builder");

const __skl_messenger = function(props, style) {
  props = props || {};
  props.flow = _a.x;
  const x = new __core(props, style);
  const a = x.render({
    kind : KIND.messenger});
  return a;
};

module.exports = __skl_messenger;