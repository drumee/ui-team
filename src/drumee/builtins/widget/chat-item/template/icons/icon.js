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

//-------------------------------------
// 
//-------------------------------------
const __media_icon=function(m, chartId, service){
  if (service == null) { service = ""; }
  const html = `\
<svg id=\"${m._id}-icon\" data-service=\"${service}\" \
class=\"full icon ${m.filetype} ${m.area}\"> \
${Template.Xmlns(chartId)} \
</svg>\
`;

  return html;
};

module.exports = __media_icon;    

