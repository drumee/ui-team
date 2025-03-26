/*
 * decaffeinate suggestions:
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
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
const __media_tpl_info=function(m){
  let needle, size;
  if ((needle = m.mget(_a.filetype), [_a.hub, _a.folder].includes(needle))) {
    size = '--';
  } else { 
    size = m.mget(_a.size);
  }
  const html = `\
<div id=\"${m._id}-size\" class=\"${m.fig.family}__column size\">${size}</div>\
`;
      //  <div id=\"#{m._id}-access-date\" class=\"#{m.fig.family}__column date\">#{m.mget(_a.date)}</div>
  return html;
};

module.exports = __media_tpl_info;    
