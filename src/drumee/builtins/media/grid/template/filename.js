// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/grid/template/filename.coffee
//   TYPE : Skeleton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_filename = function(m) {
  let html;
  const filename = m.filename || LOCALE.PROCESSING;
  let service = _e.rename
  if(![null, undefined, "", "open-node"].includes(m.service)){
    service = m.service;
  }
  let v = '';
  if (m.imgCapable) {
    v = 'image-capable';
  }

  //this.debug("AAA:17", m)
  if ((m.isAttachment) || (Visitor.inDmz) || (m.isalink && (m.filetype !== _a.hub)) || (m.status === _a.deleted)) { 
    html = `
    <div id="${m._id}-filename" class="filename ${m.area} ${m.filetype} ${v}"> 
      ${filename}
    </div>`;
  } else { 
    html = `
    <div id="${m._id}-filename" data-service="${service}" 
    class="filename ${m.area} ${m.filetype} ${v}"> 
      ${filename} 
    </div>`;
  }

  if (filename && (filename.length > 20)) {
    const tooltips = `<div id="${m._id}-tooltips" class="filename-tooltips  ${m.area} ${m.filetype}">${filename}</div>`;  
    return html + tooltips;
  }
  
  return html;
};

module.exports = __media_filename;    
