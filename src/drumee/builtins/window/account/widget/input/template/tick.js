// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Template
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __tick = function(_ui_){
  const a = `\
<div id=\"${_ui_._id}-cb\"  class=\"${_ui_.fig.group}__checkbox--ack\"> \
<svg class=\"full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-checkbox\"></use> \
</svg> \
</div>\
`;

  return a;
};

module.exports = __tick;
