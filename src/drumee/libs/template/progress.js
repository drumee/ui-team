const { arcLength } = require("core/utils")
const __progess   = function(_ui_){
  let html;
  const id   = _ui_._id; 
  const val  = arcLength(_ui_.mget(_a.percent)); 
  return html = `\
<svg id=\"${id}-main\" viewBox=\"0 0 200 200\" class=\"${_ui_.fig.family}__progress outer\"> \
<circle id=\"${id}-bg\" class=\"${_ui_.fig.family}__progress bg\" cx=\"100\" cy=\"95\" r=\"68\" \
stroke-dashoffset=\"0\" stroke-dasharray=\"502.4\"> \
</circle> \
<circle id=\"${id}-fg\" class=\"${_ui_.fig.family}__progress fg\" cx=\"95\" cy=\"90\" r=\"72\" \
stroke-dashoffset=\"${val}\" stroke-dasharray=\"502.4\" transform=\"rotate(270, 100, 90)\"> \
</circle> \
<circle class=\"${_ui_.fig.family}__progress inner\" cx=\"100\" cy=\"95\" r=\"66\" \
stroke-dashoffset=\"0\" fill=\"#FFFFFF\"> \
</circle> \
</svg>\
`;
};
module.exports = __progess;
