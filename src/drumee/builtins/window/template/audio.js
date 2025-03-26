// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __audio=function(_ui_, url){
  const html = `\
<div id=\"${_ui_._id}-audio\" class=\"audio-container\"> \
<audio id=\"${_ui_._id}-audio-el\" autoplay=\"autoplay\"> \
<source src=\"${url}\" type=\"audio/mpeg\"> \
</audio> \
</div>\
`;
  return html;
};

module.exports = __audio;    
