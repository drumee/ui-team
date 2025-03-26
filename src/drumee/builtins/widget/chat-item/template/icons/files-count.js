// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_files_count=function(m, n){
  if(n > 100) { 
    n = '9+';
  }
  const html = `\
<div class=\"${m.fig.family}__files-count\" style=\"z-index:100000;\">${n}</div>\
`;
  return html;
};

module.exports = __media_files_count;    
