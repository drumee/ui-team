// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __shortcut=function(m){
  const html = `\
<div id=\"${m._id}-shortcut\" class=\"shortcut ${m.filetype} shortcut-container\" style=\"\"> \
<svg id=\"${m._id}-icon \" class=\"icon--shortcut ${m.filetype}\"> \
${Template.Xmlns('shortcut')} \
</svg> \
</div>\
`;
  return html;
};

module.exports = __shortcut;    
