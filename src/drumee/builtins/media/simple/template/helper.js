// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_helper_simple=function(m){
  const preview  = require('./preview')(m);
  // tooltips = require('../tooltips')(m)
  const filename = require('./filename')(m);
  const type = m.mget(_a.filetype);
  const area = m.mget(_a.area);
  const html = `\
<div class=\"${m.fig.family} ${m.fig.family}__ui ${type} moving ${area}\"> \
${preview} \
${filename} \
</div>\
`;
  this.debug("ZZOOOO", $(html));
  return $(html);
};

module.exports = __media_helper_simple;    
