// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/skeleton/box-x
//   TYPE : Skeleton
// ==================================================================== *

const __core = require("../builder");

const __skl_profile = function(props, style) {
  props = props || {};
  props.flow = _a.y;
  const x = new __core(props, style);
  const a = x.render({
    kind : KIND.profile});
  return a;
};

module.exports = __skl_profile;