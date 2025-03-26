// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __forbiden=function(m){
  const pfx = `${m.fig.family}-forbiden`;
  const html = `\
<div id=\"${m._id}-forbiden\" class=\"${pfx}__container\"> \
<div class=\"${pfx}__text\">${m.mget('reason')}</div> \
<svg class=\"${pfx}__icon\"> \
${Template.Xmlns('account_cross')} \
</svg> \
</div>\
`;
  return html;
};

module.exports = __forbiden;    
