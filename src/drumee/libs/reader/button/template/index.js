// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/note
//   TYPE :
// ==================================================================== *
const { isHTML } = require("core/utils")

const _show          = 'style="display:inline"';
const _hide          = 'style="display:none"';

// ===========================================================
// _template
// 
// 
// ===========================================================
const _template = function(m){
  let content;
  m = _ui_.model.toJSON();
  if (!(isHTML(m.content))) { 
    content = `<p class=\"root-node\">${m.content}</p>`;
  }
  const label = m.label || m.content;

  let text_style = _show;
  let icon_style = _show;
  if (m.iconPosition === _a.no_text) { //no_text
    text_style = _hide;
    icon_style = _show;
  } else if (m.iconPosition === _a.no_icon) {
    text_style = _show;
    icon_style = _hide;
  }

  let {
    chartId
  } = m;
  if (_.isArray(m.icons)) {
    chartId = m.icons[m.state];
  }

  const a = `\
<svg ${icon_style} id=\"${m.widgetId}-icon\" \
data-hide=\"yes\" \
class=\"inner drumee-picto ${m.innerClass}\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" \
xlink:href=\"#--icon-${chartId}\"></use> \
</svg> \
<div ${text_style} id=\"${m.widgetId}-label\" \
class=\"${m.innerClass} inner note-content\">${label}</div>\
`;
  return _.template(a);
};
  
module.exports = _template;
