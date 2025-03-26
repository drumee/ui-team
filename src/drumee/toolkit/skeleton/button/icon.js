// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/skeleton/button
//   TYPE : Skeleton
// ==================================================================== *

const __icon = require("../../builder/button/icon");

const __skl_icon = function(props, style) {

  const x = new __icon(props, style);
  const a = x.render({
    kind : KIND.image.svg});

  return a;
};

module.exports = __skl_icon;