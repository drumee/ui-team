// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __media_row_progess   = function(_ui_){
  const id   = _ui_._id;
  const html = `\
<div class=\"${_ui_.fig.family}__bar\"> \
<div id=\"${id}-bg\" class=\"${_ui_.fig.family}__bar--bg\"></div> \
<div id=\"${id}-fg\" class=\"${_ui_.fig.family}__bar--fg\"></div> \
</div>\
`;
  return html;
};


module.exports = __media_row_progess;    
