// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/skeleton/box-x
//   TYPE : Skeleton
// ==================================================================== *

const __core = require("../builder");

const __skl_box_z = function(props, style) {
  props = props || {};
  props.flow = _a.none;
  const x = new __core(props, style);
  const a = x.render({
    kind : KIND.box});
    // flow : _a.z 
  return a;
};

module.exports = __skl_box_z;