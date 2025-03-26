// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __protected=function(m){
  // pfx = "#{m.fig.family}__protected"
  // status = m.mget(_a.status)
  // type = m.mget(_a.filetype)
  let state = _a.closed;
  if (m.status === _a.locked) {
    state = _a.open;
  }
  let html = `\
<div id=\"${m._id}-protected\" class=\"protected ${m.filetype} protected-container\" style=\"\"> \
<svg id=\"${m._id}-icon \" class=\"icon--protected ${m.filetype} status-${m.status}\" data-state=\"${state}\"> \
${Template.Xmlns('protected-lock')} \
</svg> \
</div>\
`;
  if (m.isalink && (m.filetype !== _a.hub)) {
    html = html + require('./shortcut')(m);
  }

  return html;
};

module.exports = __protected;    
