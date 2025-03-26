// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/note
//   TYPE :
// ==================================================================== *

// ===========================================================
// _template
// 
// 
// ===========================================================
const _template = function(_ui_){
  const url = _ui_.mget(_a.url) || _ui_.mget(_a.source);
  const a = `\
<iframe \
class=\"fill-up ${_ui_.fig.family}\" \
id=\"${_ui_.id}\" src=\"${url}\" \
width=\"100%\" \
height=\"100%\" \
frameborder=\"${_ui_.mget(_a.border)}\" \
${_ui_.mget(_a.option)} \
name=\"embeded-${_ui_.id}\"> \
</iframe>\
`;
  return a; 
};
  
module.exports = _template;
