// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __media_tooltips=function(media){
  const html = `\
<div class=\"forbiden-block\"> \
<div class=\"forbiden-block__text\"></div> \
<svg class=\"full forbiden-block__icon\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-cross\"></use> \
</svg> \
</div> \
<div class=\"copy-block\"> \
<div class=\"copy-block__text\">Create a copy.</div> \
<svg class=\"full copy-block__icon\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-cross\"></use> \
</svg> \
</div>\
`;
  return html;
};

module.exports = __media_tooltips;    
