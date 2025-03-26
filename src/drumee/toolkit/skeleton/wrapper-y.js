// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/skeleton/box-x
//   TYPE : Skeleton
// ==================================================================== *

const __core = require("../builder");

const __skl_box_y = function(props, style) {
  props = props || {};
  props.flow = _a.y;
  const cn = props.className || '';
  props.className = `${cn} dialog__wrapper`;
  const x = new __core(props, style);
  const a = x.render({
    kind    : KIND.box,
    wrapper : 1
  });
  a.name = a.name || "dialog";
  if (!a.sys_pn) {
    a.sys_pn = `wrapper-${a.name}`;
  }
  return a;
};

module.exports = __skl_box_y;