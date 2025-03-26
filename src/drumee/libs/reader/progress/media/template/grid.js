const { arcLength } = require("core/utils")

const __media_grid_progess   = function(_ui_){
  let html;
  const id   = _ui_._id;
  const val  = arcLength(_ui_.mget(_a.percent)); 
  return html = `\
<svg viewBox=\"0 0 200 200\" class=\"circular-chart\"> \
<circle id=\"${id}-bg\" class=\"${_ui_.fig.family}__chart--bg\" cx=\"100\" cy=\"95\" r=\"80\" \
stroke-dashoffset=\"0\" stroke-dasharray=\"502.4\"> \
</circle> \
<circle id=\"${id}-fg\" class=\"${_ui_.fig.family}__chart--fg\" cx=\"95\" cy=\"90\" r=\"80\" \
stroke-dashoffset=\"${val}\" stroke-dasharray=\"502.4\" transform=\"rotate(270, 100, 90)\"> \
</circle> \
<circle class=\"${_ui_.fig.family}__chart--inner\" cx=\"100\" cy=\"95\" r=\"76\" \
stroke-dashoffset=\"0\" fill=\"#FFFFFF\"> \
</circle> \
</svg>\
`;
};


module.exports = __media_grid_progess;    
