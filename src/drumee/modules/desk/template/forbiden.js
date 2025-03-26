/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __forbiden=function(m, reason, icon){
  if (icon == null) { icon = 'account_cross'; }
  const pfx = `${m.fig.family}-forbiden`;
  const html = `\
<div id=\"${m._id}-forbiden\" class=\"${pfx}__container\"> \
<div class=\"${pfx}__text\">${reason}</div> \
<svg class=\"${pfx}__icon\"> \
${Template.Xmlns(icon)} \
</svg> \
</div>\
`;
  return html;
};

module.exports = __forbiden;    
