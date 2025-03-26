// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_tpl_simple=function(media){


  const preview  = require('./preview')(media);
  const filename = require('./filename')(media);
  const command = require('../../template/command')(media);
  const details = require('./details')(media);

  let type = media.mget(_a.filetype);
  let area = media.mget(_a.area);

  area = media.mget(_a.area);
  let mode = '';
  if (media.mget(_a.mode) === _a.view) {
    mode = "view";
  }

  type = `<div id=\"${media._id}-type\" class=\"${media.fig.family}__column type\">${type}</div>`;
  const name = `<div class=\"box ${media.fig.family}__column name\" data-flow=\"x\">${preview + filename}</div>`;
  const html = name + details  + command;

  return `<div class=\"box ${media.fig.family}__main\" data-flow=\"x\" data-mode=\"${mode}\">${html}</div>`;
};

module.exports = __media_tpl_simple;    
