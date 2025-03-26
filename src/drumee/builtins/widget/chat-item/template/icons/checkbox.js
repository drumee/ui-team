// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_checkbox = function(m){
  const cb = `\
<div id=\"${m._id}-checkbox\" data-service=\"tick\" class=\"${m.fig.family}__checkbox checkbox\"> \
<svg class=\"${m.fig.family}__checkbox--icon full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-checkbox\"></use> \
</svg> \
</div>\
`;
  return cb;
};

module.exports = __media_checkbox;    
