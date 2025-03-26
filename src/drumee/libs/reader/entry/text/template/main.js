// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __tpl_entry_text = function(_ui_) {
  const v = _ui_.mget(_a.value); 
  return `\
<div id='${_ui_._id}' class='${_ui_.fig.family}-container-content note-content ${_ui_.mget(_a.innerClass)}' \
placeholder='${_ui_.mget(_a.placeholder)}' contenteditable='true'> \
<p>${v}</p></div>\
`;
};

module.exports = __tpl_entry_text;    
