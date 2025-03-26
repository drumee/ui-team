// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


//-------------------------------------
// 
//-------------------------------------
const __media_filename=function(media){
  let html;
  _dbg( "media", media); 
  let ext = ''; 
  let service ='';

  const skipType = ["special",_a.public,_a.private];
  if (!(skipType.indexOf(media.mget(_a.ext)) > 0)) {  
    ext = `.${media.mget(_a.ext)}`; 
  }

  if (media.mget(_a.mode) !== _a.view) {
    service = 'data-service="rename"';
  }

  let filename = media.mget(_a.filename);

  if (media.specialFolder) {
    const m = media.metadata;
    filename = m.fullname; 
    const bg = `style=\"background-image: url(${Visitor.avatar(m.uid)})\"`;
    html = `\
<div id=\"${media._id}-filename\" class=\"avatar\" ${bg}> \
</div> \
<div id=\"${media._id}-filename\" class=\"filename\"> \
${filename} \
</div>\
`;
    return html;
  }

  html = `\
<div id=\"${media._id}-filename\" ${service} class=\"filename\"> \
${filename}${ext} \
</div>\
`;
  return html;
};

module.exports = __media_filename;    
