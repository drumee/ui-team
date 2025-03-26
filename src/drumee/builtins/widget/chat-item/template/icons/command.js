// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_tpl_row_cmd = function(m){
  const cb = `\
<div id=\"${m._id}-checkbox\" data-service=\"tick\" class=\"${m.fig.family}__checkbox checkbox\"> \
<svg class=\"${m.fig.family}__checkbox--icon full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-checkbox\"></use> \
</svg> \
</div>\
`;

  const outbound =  `\
<div id=\"${m._id}-share\" data-service=\"outbound\" class=\"${m.fig.family}__share outbound\"> \
<svg class=\"${m.fig.family}__share--icon full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_sharing\"></use> \
</svg> \
</div>\
`;

  const inbound = `\
<div id=\"${m._id}-share\" data-service=\"inbound\" class=\"${m.fig.family}__share inbound\"> \
<svg class=\"${m.fig.family}__share--icon full\"> \
${Template.Xmlns('desktop_mysharing')} \
</svg> \
</div>\
`;

  const ad = `\
<div id=\"${m._id}-remove\" data-service=\"remove-upload\" class=\"${m.fig.family}__remove remove\"> \
<svg class=\"${m.fig.family}__remove--icon full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-account_cross\"></use> \
</svg> \
</div>\
`;

  if (m.isAttachment) {
    return ad;
  }

  if (m.filetype === _a.schedule) {
    return '';
  }

  if (m.shared === _a.inbound) {
    if (m.ctime === '0') {
      return cb;
    }
    return cb + inbound;
  }
    
  if (m.shared === _a.outbound) {  
    return cb + outbound;
  }

  if (m.filetype === _a.hub) {
    return cb;
  }
  
  if (m.mode === _a.view) {
    return '';
  }

  
  // if m.area is _a.private
  //   # if parseInt(m.privilege)) & _K.permission.admin
  //   #   return cb + access

  //   return cb + information
  return cb;
};

module.exports = __media_tpl_row_cmd;    
