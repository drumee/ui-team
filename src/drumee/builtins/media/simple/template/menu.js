// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_tpl_menu=function(media){
  const html = `\
<div id=\"${media._id}-menu\" class=\"hub-menu-wrapper\"> \
<div class=\"item hub-menu-edit\" data-service=\"open-creator\"> \
<svg class=\"full link\" data-service=\"open-creator\" style=\"pointer-events: none;\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_edit\"></use> \
</svg> \
</div> \
<div class=\"item hub-menu-settings\" data-service=\"open-settings\"> \
<svg class=\"full link\" data-service=\"open-settings\" style=\"pointer-events: none;\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_settings\"></use> \
</svg> \
</div> \
<div id=\"${media._id}-hub-menu\" class=\"item hub-menu-media\"> \
<svg class=\"full link\" style=\"pointer-events: none;\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_folder\"></use> \
</svg> \
</div> \
</div>\
`;
  return html;
};

 

module.exports = __media_tpl_menu;
