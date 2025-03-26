// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __forbiden=function(_ui_, reason){
  const pfx = `${_ui_.fig.family}-forbiden`;
  const html = `\
<div id=\"${_ui_.cid}-forbiden\" class=\"${pfx}__container\"> \
<div class=\"${pfx}__text forbiden-block__text\">${reason}</div> \
<svg class=\"${pfx}__icon forbiden-block__icon\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-cross\"></use> \
</svg> \
</div>\
`;
  return html;
};

module.exports = __forbiden;    
