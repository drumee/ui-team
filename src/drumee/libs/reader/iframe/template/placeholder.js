// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/note
//   TYPE :
// ==================================================================== *

const _placeholder = function(_ui_){
  const html = `\
<div id=\"${_ui_.id}-rotate\" class=\"rotate-btn svg-wrapper widget\"> \
<svg class=\"full inner drumee-picto svg-inner=\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-editbox_video\"></use> \
</svg> \
</div>\
`;
  return html;
};

  
module.exports = _placeholder;
