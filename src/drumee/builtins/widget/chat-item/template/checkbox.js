// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __chat_item_checkbox = function(m){
  const cb = `\
<div id=\"${m.widgetId}-checkbox\" data-service=\"select-message\" class=\"${m.fig}__icon checkbox ${m.author}\"> \
<svg class=\"${m.fig}__checkbox--icon full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-checkbox\"></use> \
</svg> \
</div>\
`;
  return cb;
};

module.exports = __chat_item_checkbox;    
